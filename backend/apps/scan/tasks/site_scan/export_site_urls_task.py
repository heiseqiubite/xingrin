"""
导出站点URL到文件的Task

支持两种模式：
1. 传统模式（向后兼容）：使用 target_id 从数据库导出
2. Provider 模式：使用 TargetProvider 从任意数据源导出

特殊逻辑：
- 80 端口：只生成 HTTP URL（省略端口号）
- 443 端口：只生成 HTTPS URL（省略端口号）
- 其他端口：生成 HTTP 和 HTTPS 两个URL（带端口号）
"""
import logging
from typing import Optional
from pathlib import Path
from prefect import task

from apps.asset.services import HostPortMappingService
from apps.scan.services.target_export_service import create_export_service
from apps.common.services import BlacklistService
from apps.common.utils import BlacklistFilter
from apps.scan.providers import TargetProvider, DatabaseTargetProvider, ProviderContext

logger = logging.getLogger(__name__)


def _generate_urls_from_port(host: str, port: int) -> list[str]:
    """
    根据端口生成 URL 列表
    
    - 80 端口：只生成 HTTP URL（省略端口号）
    - 443 端口：只生成 HTTPS URL（省略端口号）
    - 其他端口：生成 HTTP 和 HTTPS 两个URL（带端口号）
    """
    if port == 80:
        return [f"http://{host}"]
    elif port == 443:
        return [f"https://{host}"]
    else:
        return [f"http://{host}:{port}", f"https://{host}:{port}"]


@task(name="export_site_urls")
def export_site_urls_task(
    output_file: str,
    target_id: Optional[int] = None,
    provider: Optional[TargetProvider] = None,
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的所有站点URL到文件
    
    支持两种模式：
    1. 传统模式（向后兼容）：传入 target_id，从 HostPortMapping 表导出
    2. Provider 模式：传入 provider，从任意数据源导出
    
    传统模式特殊逻辑：
    - 80 端口：只生成 HTTP URL（省略端口号）
    - 443 端口：只生成 HTTPS URL（省略端口号）
    - 其他端口：生成 HTTP 和 HTTPS 两个URL（带端口号）
    
    回退逻辑（仅传统模式）：
    - 如果 HostPortMapping 为空，使用 generate_default_urls() 生成默认 URL
    
    Args:
        output_file: 输出文件路径（绝对路径）
        target_id: 目标ID（传统模式，向后兼容）
        provider: TargetProvider 实例（新模式）
        batch_size: 每次处理的批次大小
        
    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_urls': int,
            'association_count': int,  # 主机端口关联数量（仅传统模式）
            'source': str,  # 数据来源: "host_port" | "default" | "provider"
        }
        
    Raises:
        ValueError: 参数错误
        IOError: 文件写入失败
    """
    # 参数验证：至少提供一个
    if target_id is None and provider is None:
        raise ValueError("必须提供 target_id 或 provider 参数之一")
    
    # 向后兼容：如果没有提供 provider，使用传统模式
    if provider is None:
        logger.info("使用传统模式 - Target ID: %d, 输出文件: %s", target_id, output_file)
        return _export_site_urls_legacy(target_id, output_file, batch_size)
    
    # Provider 模式
    logger.info("使用 Provider 模式 - Provider: %s, 输出文件: %s", type(provider).__name__, output_file)
    
    # 确保输出目录存在
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 使用 Provider 导出 URL 列表
    total_urls = 0
    blacklist_filter = provider.get_blacklist_filter()
    
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for url in provider.iter_urls():
            # 应用黑名单过滤（如果有）
            if blacklist_filter and not blacklist_filter.is_allowed(url):
                continue
            
            f.write(f"{url}\n")
            total_urls += 1
            
            if total_urls % 1000 == 0:
                logger.info("已导出 %d 个URL...", total_urls)
    
    logger.info("✓ URL导出完成 - 总数: %d, 文件: %s", total_urls, str(output_path))
    
    return {
        'success': True,
        'output_file': str(output_path),
        'total_urls': total_urls,
        'source': 'provider',
    }


def _export_site_urls_legacy(target_id: int, output_file: str, batch_size: int) -> dict:
    """
    传统模式：从 HostPortMapping 表导出 URL
    
    保持原有逻辑不变，确保向后兼容
    """
    logger.info("开始统计站点URL - Target ID: %d, 输出文件: %s", target_id, output_file)
    
    # 确保输出目录存在
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 获取规则并创建过滤器
    blacklist_filter = BlacklistFilter(BlacklistService().get_rules(target_id))
    
    # 直接查询 HostPortMapping 表，按 host 排序
    service = HostPortMappingService()
    associations = service.iter_host_port_by_target(
        target_id=target_id,
        batch_size=batch_size,
    )
    
    total_urls = 0
    association_count = 0
    filtered_count = 0
    
    # 流式写入文件（特殊端口逻辑）
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for assoc in associations:
            association_count += 1
            host = assoc['host']
            port = assoc['port']
            
            # 先校验 host，通过了再生成 URL
            if not blacklist_filter.is_allowed(host):
                filtered_count += 1
                continue
            
            # 根据端口号生成URL
            for url in _generate_urls_from_port(host, port):
                f.write(f"{url}\n")
                total_urls += 1
            
            if association_count % 1000 == 0:
                logger.info("已处理 %d 条关联，生成 %d 个URL...", association_count, total_urls)
    
    if filtered_count > 0:
        logger.info("黑名单过滤: 过滤 %d 条关联", filtered_count)
    
    logger.info(
        "✓ 站点URL导出完成 - 关联数: %d, 总URL数: %d, 文件: %s",
        association_count, total_urls, str(output_path)
    )
    
    # 判断数据来源
    source = "host_port"
    
    # 数据存在但全被过滤，不回退
    if association_count > 0 and total_urls == 0:
        logger.info("HostPortMapping 有 %d 条数据，但全被黑名单过滤，不回退", association_count)
        return {
            'success': True,
            'output_file': str(output_path),
            'total_urls': 0,
            'association_count': association_count,
            'source': source,
        }
    
    # 数据源为空，回退到默认 URL 生成
    if total_urls == 0:
        logger.info("HostPortMapping 为空，使用默认 URL 生成")
        export_service = create_export_service(target_id)
        result = export_service.generate_default_urls(target_id, str(output_path))
        total_urls = result['total_count']
        source = "default"
    
    return {
        'success': True,
        'output_file': str(output_path),
        'total_urls': total_urls,
        'association_count': association_count,
        'source': source,
    }
