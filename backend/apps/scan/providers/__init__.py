"""
扫描目标提供者模块

提供统一的目标获取接口，支持多种数据源：
- DatabaseTargetProvider: 从数据库查询（完整扫描）
- ListTargetProvider: 使用内存列表（快速扫描阶段1）
- SnapshotTargetProvider: 从快照表读取（快速扫描阶段2+）
- PipelineTargetProvider: 使用管道输出（Phase 2）

使用方式：
    from apps.scan.providers import (
        DatabaseTargetProvider,
        ListTargetProvider,
        SnapshotTargetProvider,
        ProviderContext
    )
    
    # 数据库模式（完整扫描）
    provider = DatabaseTargetProvider(target_id=123)
    
    # 列表模式（快速扫描阶段1）
    context = ProviderContext(target_id=1, scan_id=100)
    provider = ListTargetProvider(
        targets=["a.test.com"],
        context=context
    )
    
    # 快照模式（快速扫描阶段2+）
    context = ProviderContext(target_id=1, scan_id=100)
    provider = SnapshotTargetProvider(
        scan_id=100,
        snapshot_type="subdomain",
        context=context
    )
    
    # 使用 Provider
    for host in provider.iter_hosts():
        scan(host)
"""

from .base import TargetProvider, ProviderContext
from .list_provider import ListTargetProvider
from .database_provider import DatabaseTargetProvider
from .snapshot_provider import SnapshotTargetProvider, SnapshotType
from .pipeline_provider import PipelineTargetProvider, StageOutput

__all__ = [
    'TargetProvider',
    'ProviderContext',
    'ListTargetProvider',
    'DatabaseTargetProvider',
    'SnapshotTargetProvider',
    'SnapshotType',
    'PipelineTargetProvider',
    'StageOutput',
]
