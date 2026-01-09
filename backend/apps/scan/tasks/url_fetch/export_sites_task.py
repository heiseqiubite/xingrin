"""
导出站点 URL 列表任务

支持两种模式：
1. 传统模式（向后兼容）：使用 target_id 从数据库导出
2. Provider 模式：使用 TargetProvider 从任意数据源导出

数据源: WebSite.url → Default（用于 katana 等爬虫工具）
"""

import logging
from typing import Optional
from pathlib import Path
from prefect import task

from apps.scan.services.target_export_service import (
    export_urls_with_fallback,
    DataSource,
)
from apps.scan.providers import TargetProvider, DatabaseTargetProvider

logger = logging.getLogger(__name__)


@task(
    name='export_sites_for_url_fetch',
    retries=1,
    log_prints=True
)
def export_sites_task(
    output_file: str,
    target_id: Optional[int] = None,
    scan_id: Optional[int] = None,
    provider: Optional[TargetProvider] = None,
    batch_size: int = 1000
) -> dict:
    """
    导出站点 URL 列表到文件（用于 katana 等爬虫工具）
    
    支持两种模式：
    1. 传统模式（向后兼容）：传入 target_id，从数据库导出
    2. Provider 模式：传入 provider，从任意数据源导出
    
    数据源优先级（回退链，仅传统模式）：
    1. WebSite 表 - 站点级别 URL
    2. 默认生成 - 根据 Target 类型生成 http(s)://target_name
    
    Args:
        output_file: 输出文件路径
        target_id: 目标 ID（传统模式，向后兼容）
        scan_id: 扫描 ID（保留参数，兼容旧调用）
        provider: TargetProvider 实例（新模式）
        batch_size: 批次大小（内存优化）
        
    Returns:
        dict: {
            'output_file': str,  # 输出文件路径
            'asset_count': int,  # 资产数量
        }
        
    Raises:
        ValueError: 参数错误
        RuntimeError: 执行失败
    """
    # 参数验证：至少提供一个
    if target_id is None and provider is None:
        raise ValueError("必须提供 target_id 或 provider 参数之一")
    
    # Provider 模式：使用 TargetProvider 导出
    if provider is not None:
        logger.info("使用 Provider 模式 - Provider: %s", type(provider).__name__)
        return _export_with_provider(output_file, provider)
    
    # 传统模式：使用 export_urls_with_fallback
    logger.info("使用传统模式 - Target ID: %d", target_id)
    result = export_urls_with_fallback(
        target_id=target_id,
        output_file=output_file,
        sources=[DataSource.WEBSITE, DataSource.DEFAULT],
        batch_size=batch_size,
    )
    
    logger.info(
        "站点 URL 导出完成 - source=%s, count=%d",
        result['source'], result['total_count']
    )
    
    # 保持返回值格式不变（向后兼容）
    return {
        'output_file': result['output_file'],
        'asset_count': result['total_count'],
    }


def _export_with_provider(output_file: str, provider: TargetProvider) -> dict:
    """使用 Provider 导出 URL"""
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    total_count = 0
    blacklist_filter = provider.get_blacklist_filter()
    
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for url in provider.iter_urls():
            # 应用黑名单过滤（如果有）
            if blacklist_filter and not blacklist_filter.is_allowed(url):
                continue
            
            f.write(f"{url}\n")
            total_count += 1
            
            if total_count % 1000 == 0:
                logger.info("已导出 %d 个 URL...", total_count)
    
    logger.info("✓ URL 导出完成 - 总数: %d, 文件: %s", total_count, str(output_path))
    
    return {
        'output_file': str(output_path),
        'asset_count': total_count,
    }
