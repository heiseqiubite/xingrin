"""导出 Endpoint URL 到文件的 Task

支持两种模式：
1. 传统模式（向后兼容）：使用 target_id 从数据库导出
2. Provider 模式：使用 TargetProvider 从任意数据源导出

数据源优先级（回退链，仅传统模式）：
1. Endpoint.url - 最精细的 URL（含路径、参数等）
2. WebSite.url - 站点级别 URL
3. 默认生成 - 根据 Target 类型生成 http(s)://target_name
"""

import logging
from typing import Dict, Optional
from pathlib import Path

from prefect import task

from apps.scan.services.target_export_service import (
    export_urls_with_fallback,
    DataSource,
)
from apps.scan.providers import TargetProvider, DatabaseTargetProvider

logger = logging.getLogger(__name__)


@task(name="export_endpoints")
def export_endpoints_task(
    target_id: Optional[int] = None,
    output_file: str = "",
    provider: Optional[TargetProvider] = None,
    batch_size: int = 1000,
) -> Dict[str, object]:
    """导出目标下的所有 Endpoint URL 到文本文件。

    支持两种模式：
    1. 传统模式（向后兼容）：传入 target_id，从数据库导出
    2. Provider 模式：传入 provider，从任意数据源导出

    数据源优先级（回退链，仅传统模式）：
    1. Endpoint 表 - 最精细的 URL（含路径、参数等）
    2. WebSite 表 - 站点级别 URL
    3. 默认生成 - 根据 Target 类型生成 http(s)://target_name

    Args:
        target_id: 目标 ID（传统模式，向后兼容）
        output_file: 输出文件路径（绝对路径）
        provider: TargetProvider 实例（新模式）
        batch_size: 每次从数据库迭代的批大小

    Returns:
        dict: {
            "success": bool,
            "output_file": str,
            "total_count": int,
            "source": str,  # 数据来源: "endpoint" | "website" | "default" | "none" | "provider"
        }
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
        sources=[DataSource.ENDPOINT, DataSource.WEBSITE, DataSource.DEFAULT],
        batch_size=batch_size,
    )
    
    logger.info(
        "URL 导出完成 - source=%s, count=%d, tried=%s",
        result['source'], result['total_count'], result['tried_sources']
    )
    
    return {
        "success": result['success'],
        "output_file": result['output_file'],
        "total_count": result['total_count'],
        "source": result['source'],
    }


def _export_with_provider(output_file: str, provider: TargetProvider) -> Dict[str, object]:
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
        "success": True,
        "output_file": str(output_path),
        "total_count": total_count,
        "source": "provider",
    }
