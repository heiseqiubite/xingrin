"""
截图 Flow

负责编排截图的完整流程：
1. 从数据库获取 URL 列表（websites 和/或 endpoints）
2. 批量截图并保存快照
3. 同步到资产表

支持两种模式：
1. 传统模式（向后兼容）：使用 target_id 从数据库获取 URL
2. Provider 模式：使用 TargetProvider 从任意数据源获取 URL
"""

# Django 环境初始化
from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
from pathlib import Path
from typing import Optional
from prefect import flow

from apps.scan.tasks.screenshot import capture_screenshots_task
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
)
from apps.scan.utils import user_log
from apps.scan.services.target_export_service import (
    get_urls_with_fallback,
    DataSource,
)
from apps.scan.providers import TargetProvider

logger = logging.getLogger(__name__)


def _parse_screenshot_config(enabled_tools: dict) -> dict:
    """
    解析截图配置
    
    Args:
        enabled_tools: 启用的工具配置
    
    Returns:
        截图配置字典
    """
    # 从 enabled_tools 中获取 playwright 配置
    playwright_config = enabled_tools.get('playwright', {})
    
    return {
        'concurrency': playwright_config.get('concurrency', 5),
        'url_sources': playwright_config.get('url_sources', ['websites'])
    }


def _map_url_sources_to_data_sources(url_sources: list[str]) -> list[str]:
    """
    将配置中的 url_sources 映射为 DataSource 常量
    
    Args:
        url_sources: 配置中的来源列表，如 ['websites', 'endpoints']
    
    Returns:
        DataSource 常量列表
    """
    source_mapping = {
        'websites': DataSource.WEBSITE,
        'endpoints': DataSource.ENDPOINT,
    }
    
    sources = []
    for source in url_sources:
        if source in source_mapping:
            sources.append(source_mapping[source])
        else:
            logger.warning("未知的 URL 来源: %s，跳过", source)
    
    # 添加默认回退（从 subdomain 构造）
    sources.append(DataSource.DEFAULT)
    
    return sources


@flow(
    name="screenshot",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def screenshot_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
    provider: Optional[TargetProvider] = None
) -> dict:
    """
    截图 Flow
    
    支持两种模式：
    1. 传统模式（向后兼容）：使用 target_id 从数据库获取 URL
    2. Provider 模式：使用 TargetProvider 从任意数据源获取 URL
    
    工作流程：
        Step 1: 解析配置
        Step 2: 收集 URL 列表
        Step 3: 批量截图并保存快照
        Step 4: 同步到资产表
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        enabled_tools: 启用的工具配置
        provider: TargetProvider 实例（新模式，可选）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'total_urls': int,
            'successful': int,
            'failed': int,
            'synced': int
        }
    """
    try:
        logger.info(
            "="*60 + "\n" +
            "开始截图扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            f"  Mode: {'Provider' if provider else 'Legacy'}\n" +
            "="*60
        )
        
        user_log(scan_id, "screenshot", "Starting screenshot capture")
        
        # Step 1: 解析配置
        config = _parse_screenshot_config(enabled_tools)
        concurrency = config['concurrency']
        url_sources = config['url_sources']
        
        logger.info("截图配置 - 并发: %d, URL来源: %s", concurrency, url_sources)
        
        # Step 2: 收集 URL 列表
        if provider is not None:
            # Provider 模式：使用 TargetProvider 获取 URL
            logger.info("使用 Provider 模式获取 URL - Provider: %s", type(provider).__name__)
            urls = list(provider.iter_urls())
            
            # 应用黑名单过滤（如果有）
            blacklist_filter = provider.get_blacklist_filter()
            if blacklist_filter:
                urls = [url for url in urls if blacklist_filter.is_allowed(url)]
            
            source_info = 'provider'
            tried_sources = ['provider']
        else:
            # 传统模式：使用统一服务收集 URL（带黑名单过滤和回退）
            data_sources = _map_url_sources_to_data_sources(url_sources)
            result = get_urls_with_fallback(target_id, sources=data_sources)
            
            urls = result['urls']
            source_info = result['source']
            tried_sources = result['tried_sources']
        
        logger.info(
            "URL 收集完成 - 来源: %s, 数量: %d, 尝试过: %s",
            source_info, len(urls), tried_sources
        )
        
        if not urls:
            logger.warning("没有可截图的 URL，跳过截图任务")
            user_log(scan_id, "screenshot", "Skipped: no URLs to capture", "warning")
            return {
                'success': True,
                'scan_id': scan_id,
                'target': target_name,
                'total_urls': 0,
                'successful': 0,
                'failed': 0,
                'synced': 0
            }
        
        user_log(scan_id, "screenshot", f"Found {len(urls)} URLs to capture (source: {source_info})")
        
        # Step 3: 批量截图
        logger.info("Step 3: 批量截图 - %d 个 URL", len(urls))
        
        capture_result = capture_screenshots_task(
            urls=urls,
            scan_id=scan_id,
            target_id=target_id,
            config={'concurrency': concurrency}
        )
        
        # Step 4: 同步到资产表
        logger.info("Step 4: 同步截图到资产表")
        from apps.asset.services.screenshot_service import ScreenshotService
        screenshot_service = ScreenshotService()
        synced = screenshot_service.sync_screenshots_to_asset(scan_id, target_id)
        
        logger.info(
            "✓ 截图完成 - 总数: %d, 成功: %d, 失败: %d, 同步: %d",
            capture_result['total'], capture_result['successful'], capture_result['failed'], synced
        )
        user_log(
            scan_id, "screenshot",
            f"Screenshot completed: {capture_result['successful']}/{capture_result['total']} captured, {synced} synced"
        )
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'total_urls': capture_result['total'],
            'successful': capture_result['successful'],
            'failed': capture_result['failed'],
            'synced': synced
        }
        
    except Exception as e:
        logger.exception("截图 Flow 失败: %s", e)
        user_log(scan_id, "screenshot", f"Screenshot failed: {e}", "error")
        raise
