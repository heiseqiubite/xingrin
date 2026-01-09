"""
快照目标提供者模块

提供基于快照表的目标提供者实现。
用于快速扫描的阶段间数据传递。
"""

import logging
from typing import Iterator, Optional, Literal

from .base import TargetProvider, ProviderContext

logger = logging.getLogger(__name__)

# 快照类型定义
SnapshotType = Literal["subdomain", "website", "endpoint", "host_port"]


class SnapshotTargetProvider(TargetProvider):
    """
    快照目标提供者 - 从快照表读取本次扫描的数据
    
    用于快速扫描的阶段间数据传递，解决精确扫描控制问题。
    
    核心价值：
    - 只返回本次扫描（scan_id）发现的资产
    - 避免扫描历史数据（DatabaseTargetProvider 会扫描所有历史资产）
    
    特点：
    - 通过 scan_id 过滤快照表
    - 不应用黑名单过滤（数据已在上一阶段过滤）
    - 支持多种快照类型（subdomain/website/endpoint/host_port）
    
    使用场景：
        # 快速扫描流程
        用户输入: a.test.com
        创建 Target: test.com (id=1)
        创建 Scan: scan_id=100
        
        # 阶段1: 子域名发现
        provider = ListTargetProvider(
            targets=["a.test.com"],
            context=ProviderContext(target_id=1, scan_id=100)
        )
        # 发现: b.a.test.com, c.a.test.com
        # 保存: SubdomainSnapshot(scan_id=100) + Subdomain(target_id=1)
        
        # 阶段2: 端口扫描
        provider = SnapshotTargetProvider(
            scan_id=100,
            snapshot_type="subdomain",
            context=ProviderContext(target_id=1, scan_id=100)
        )
        # 只返回: b.a.test.com, c.a.test.com（本次扫描发现的）
        # 不返回: www.test.com, api.test.com（历史数据）
        
        # 阶段3: 网站扫描
        provider = SnapshotTargetProvider(
            scan_id=100,
            snapshot_type="host_port",
            context=ProviderContext(target_id=1, scan_id=100)
        )
        # 只返回本次扫描发现的 IP:Port
    """
    
    def __init__(
        self,
        scan_id: int,
        snapshot_type: SnapshotType,
        context: Optional[ProviderContext] = None
    ):
        """
        初始化快照目标提供者
        
        Args:
            scan_id: 扫描任务 ID（必需）
            snapshot_type: 快照类型
                - "subdomain": 子域名快照（SubdomainSnapshot）
                - "website": 网站快照（WebsiteSnapshot）
                - "endpoint": 端点快照（EndpointSnapshot）
                - "host_port": 主机端口映射快照（HostPortMappingSnapshot）
            context: Provider 上下文
        """
        ctx = context or ProviderContext()
        ctx.scan_id = scan_id
        super().__init__(ctx)
        self._scan_id = scan_id
        self._snapshot_type = snapshot_type
    
    def _iter_raw_hosts(self) -> Iterator[str]:
        """
        从快照表迭代主机列表
        
        根据 snapshot_type 选择不同的快照表：
        - subdomain: SubdomainSnapshot.name
        - host_port: HostPortMappingSnapshot.host (返回 host:port 格式，不经过验证)
        """
        if self._snapshot_type == "subdomain":
            from apps.asset.services.snapshot import SubdomainSnapshotsService
            service = SubdomainSnapshotsService()
            yield from service.iter_subdomain_names_by_scan(
                scan_id=self._scan_id,
                chunk_size=1000
            )
        
        elif self._snapshot_type == "host_port":
            # host_port 类型不使用 _iter_raw_hosts，直接在 iter_hosts 中处理
            # 这里返回空，避免被基类的 iter_hosts 调用
            return
        
        else:
            # 其他类型暂不支持 iter_hosts
            logger.warning(
                "快照类型 '%s' 不支持 iter_hosts，返回空迭代器",
                self._snapshot_type
            )
            return
    
    def iter_hosts(self) -> Iterator[str]:
        """
        迭代主机列表
        
        对于 host_port 类型，返回 host:port 格式，不经过 CIDR 展开验证
        """
        if self._snapshot_type == "host_port":
            # host_port 类型直接返回 host:port，不经过 _expand_host 验证
            from apps.asset.services.snapshot import HostPortMappingSnapshotsService
            service = HostPortMappingSnapshotsService()
            queryset = service.get_by_scan(scan_id=self._scan_id)
            for mapping in queryset.iterator(chunk_size=1000):
                yield f"{mapping.host}:{mapping.port}"
        else:
            # 其他类型使用基类的 iter_hosts（会调用 _iter_raw_hosts 并展开 CIDR）
            yield from super().iter_hosts()
    
    def iter_urls(self) -> Iterator[str]:
        """
        从快照表迭代 URL 列表
        
        根据 snapshot_type 选择不同的快照表：
        - website: WebsiteSnapshot.url
        - endpoint: EndpointSnapshot.url
        """
        if self._snapshot_type == "website":
            from apps.asset.services.snapshot import WebsiteSnapshotsService
            service = WebsiteSnapshotsService()
            yield from service.iter_website_urls_by_scan(
                scan_id=self._scan_id,
                chunk_size=1000
            )
        
        elif self._snapshot_type == "endpoint":
            from apps.asset.services.snapshot import EndpointSnapshotsService
            service = EndpointSnapshotsService()
            # 从快照表获取端点 URL
            queryset = service.get_by_scan(scan_id=self._scan_id)
            for endpoint in queryset.iterator(chunk_size=1000):
                yield endpoint.url
        
        else:
            # 其他类型暂不支持 iter_urls
            logger.warning(
                "快照类型 '%s' 不支持 iter_urls，返回空迭代器",
                self._snapshot_type
            )
            return
    
    def get_blacklist_filter(self) -> None:
        """快照数据已在上一阶段过滤过了"""
        return None
    
    @property
    def snapshot_type(self) -> SnapshotType:
        """返回快照类型"""
        return self._snapshot_type
