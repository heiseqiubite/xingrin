"""
数据库目标提供者模块

提供基于数据库查询的目标提供者实现。
"""

import logging
from typing import Iterator, Optional, TYPE_CHECKING

from .base import TargetProvider, ProviderContext

if TYPE_CHECKING:
    from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


class DatabaseTargetProvider(TargetProvider):
    """
    数据库目标提供者 - 从 Target 表及关联资产表查询
    
    这是现有行为的封装，保持向后兼容。
    
    数据来源：
    - iter_hosts(): 根据 Target 类型返回域名/IP
      - DOMAIN: 根域名 + Subdomain 表
      - IP: 直接返回 IP
      - CIDR: 使用 _expand_host() 展开为所有主机 IP
    - iter_urls(): WebSite/Endpoint 表，带回退链
    
    使用方式：
        provider = DatabaseTargetProvider(target_id=123)
        for host in provider.iter_hosts():
            scan(host)
    """
    
    def __init__(self, target_id: int, context: Optional[ProviderContext] = None):
        """
        初始化数据库目标提供者
        
        Args:
            target_id: 目标 ID（必需）
            context: Provider 上下文
        """
        ctx = context or ProviderContext()
        ctx.target_id = target_id
        super().__init__(ctx)
        self._blacklist_filter: Optional['BlacklistFilter'] = None  # 延迟加载
    
    def iter_hosts(self) -> Iterator[str]:
        """
        从数据库查询主机列表，自动展开 CIDR 并应用黑名单过滤
        
        重写基类方法以支持黑名单过滤（需要在 CIDR 展开后过滤）
        """
        blacklist = self.get_blacklist_filter()
        
        for host in self._iter_raw_hosts():
            # 展开 CIDR
            for expanded_host in self._expand_host(host):
                # 应用黑名单过滤
                if not blacklist or blacklist.is_allowed(expanded_host):
                    yield expanded_host
    
    def _iter_raw_hosts(self) -> Iterator[str]:
        """
        从数据库查询原始主机列表（可能包含 CIDR）
        
        根据 Target 类型决定数据来源：
        - DOMAIN: 根域名 + Subdomain 表
        - IP: 直接返回 target.name
        - CIDR: 返回 CIDR 字符串（由 iter_hosts() 展开）
        
        注意：此方法不应用黑名单过滤，过滤在 iter_hosts() 中进行
        """
        from apps.targets.services import TargetService
        from apps.targets.models import Target
        from apps.asset.services.asset.subdomain_service import SubdomainService
        
        target = TargetService().get_target(self.target_id)
        if not target:
            logger.warning("Target ID %d 不存在", self.target_id)
            return
        
        if target.type == Target.TargetType.DOMAIN:
            # 返回根域名
            yield target.name
            
            # 返回子域名
            subdomain_service = SubdomainService()
            for domain in subdomain_service.iter_subdomain_names_by_target(
                target_id=self.target_id,
                chunk_size=1000
            ):
                if domain != target.name:  # 避免重复
                    yield domain
        
        elif target.type == Target.TargetType.IP:
            yield target.name
        
        elif target.type == Target.TargetType.CIDR:
            # 直接返回 CIDR，由 iter_hosts() 展开并过滤
            yield target.name
    
    def iter_urls(self) -> Iterator[str]:
        """
        从数据库查询 URL 列表
        
        使用现有的回退链逻辑：Endpoint → WebSite → Default
        """
        from apps.scan.services.target_export_service import (
            _iter_urls_with_fallback, DataSource
        )
        
        blacklist = self.get_blacklist_filter()
        
        for url, source in _iter_urls_with_fallback(
            target_id=self.target_id,
            sources=[DataSource.ENDPOINT, DataSource.WEBSITE, DataSource.DEFAULT],
            blacklist_filter=blacklist
        ):
            yield url
    
    def get_blacklist_filter(self) -> Optional['BlacklistFilter']:
        """获取黑名单过滤器（延迟加载）"""
        if self._blacklist_filter is None:
            from apps.common.services import BlacklistService
            from apps.common.utils import BlacklistFilter
            rules = BlacklistService().get_rules(self.target_id)
            self._blacklist_filter = BlacklistFilter(rules)
        return self._blacklist_filter
