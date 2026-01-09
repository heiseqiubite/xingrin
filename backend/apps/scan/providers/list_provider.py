"""
列表目标提供者模块

提供基于内存列表的目标提供者实现。
"""

from typing import Iterator, Optional, List

from .base import TargetProvider, ProviderContext


class ListTargetProvider(TargetProvider):
    """
    列表目标提供者 - 直接使用内存中的列表
    
    用于快速扫描、临时扫描等场景，只扫描用户指定的目标。
    
    特点：
    - 不查询数据库
    - 不应用黑名单过滤（用户明确指定的目标）
    - 不关联 target_id（由调用方负责创建 Target）
    - 自动检测输入类型（URL/域名/IP/CIDR）
    - 自动展开 CIDR
    
    使用方式：
        # 快速扫描：用户提供目标，自动识别类型
        provider = ListTargetProvider(targets=[
            "example.com",              # 域名
            "192.168.1.0/24",           # CIDR（自动展开）
            "https://api.example.com"   # URL
        ])
        for host in provider.iter_hosts():
            scan(host)
    """
    
    def __init__(
        self,
        targets: Optional[List[str]] = None,
        context: Optional[ProviderContext] = None
    ):
        """
        初始化列表目标提供者
        
        Args:
            targets: 目标列表（自动识别类型：URL/域名/IP/CIDR）
            context: Provider 上下文
        """
        from apps.common.validators import detect_input_type
        
        ctx = context or ProviderContext()
        super().__init__(ctx)
        
        # 自动分类目标
        self._hosts = []
        self._urls = []
        
        if targets:
            for target in targets:
                target = target.strip()
                if not target:
                    continue
                
                try:
                    input_type = detect_input_type(target)
                    if input_type == 'url':
                        self._urls.append(target)
                    else:
                        # domain/ip/cidr 都作为 host
                        self._hosts.append(target)
                except ValueError:
                    # 无法识别类型，默认作为 host
                    self._hosts.append(target)
    
    def _iter_raw_hosts(self) -> Iterator[str]:
        """迭代原始主机列表（可能包含 CIDR）"""
        yield from self._hosts
    
    def iter_urls(self) -> Iterator[str]:
        """迭代 URL 列表"""
        yield from self._urls
    
    def get_blacklist_filter(self) -> None:
        """列表模式不使用黑名单过滤"""
        return None
