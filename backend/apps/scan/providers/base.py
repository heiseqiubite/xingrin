"""
扫描目标提供者基础模块

定义 ProviderContext 数据类和 TargetProvider 抽象基类。
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterator, Optional, TYPE_CHECKING
import ipaddress
import logging

if TYPE_CHECKING:
    from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


@dataclass
class ProviderContext:
    """
    Provider 上下文，携带元数据
    
    Attributes:
        target_id: 关联的 Target ID（用于结果保存），None 表示临时扫描（不保存）
        scan_id: 扫描任务 ID
    """
    target_id: Optional[int] = None
    scan_id: Optional[int] = None


class TargetProvider(ABC):
    """
    扫描目标提供者抽象基类
    
    职责：
    - 提供扫描目标（域名、IP、URL 等）的迭代器
    - 提供黑名单过滤器
    - 携带上下文信息（target_id, scan_id 等）
    - 自动展开 CIDR（子类无需关心）
    
    使用方式：
        provider = create_target_provider(target_id=123)
        for host in provider.iter_hosts():
            print(host)
    """
    
    def __init__(self, context: Optional[ProviderContext] = None):
        """
        初始化 Provider
        
        Args:
            context: Provider 上下文，None 时创建默认上下文
        """
        self._context = context or ProviderContext()
    
    @property
    def context(self) -> ProviderContext:
        """返回 Provider 上下文"""
        return self._context
    
    @staticmethod
    def _expand_host(host: str) -> Iterator[str]:
        """
        展开主机（如果是 CIDR 则展开为多个 IP，否则直接返回）
        
        这是一个内部方法，由 iter_hosts() 自动调用。
        
        Args:
            host: 主机字符串（IP/域名/CIDR）
            
        Yields:
            str: 单个主机（IP 或域名）
            
        示例：
            "192.168.1.0/30" → "192.168.1.1", "192.168.1.2"
            "192.168.1.1" → "192.168.1.1"
            "example.com" → "example.com"
            "invalid" → (跳过，不返回)
        """
        from apps.common.validators import detect_target_type
        from apps.targets.models import Target
        
        host = host.strip()
        if not host:
            return
        
        # 统一使用 detect_target_type 检测类型
        try:
            target_type = detect_target_type(host)
            
            if target_type == Target.TargetType.CIDR:
                # 展开 CIDR
                network = ipaddress.ip_network(host, strict=False)
                if network.num_addresses == 1:
                    yield str(network.network_address)
                else:
                    for ip in network.hosts():
                        yield str(ip)
            elif target_type == Target.TargetType.IP:
                # 单个 IP
                yield host
            elif target_type == Target.TargetType.DOMAIN:
                # 域名
                yield host
        except ValueError as e:
            # 无效格式，跳过并记录警告
            logger.warning("跳过无效的主机格式 '%s': %s", host, str(e))
    
    def iter_hosts(self) -> Iterator[str]:
        """
        迭代主机列表（域名/IP）
        
        自动展开 CIDR，子类无需关心。
        
        Yields:
            str: 主机名或 IP 地址（单个，不包含 CIDR）
        """
        for host in self._iter_raw_hosts():
            yield from self._expand_host(host)
    
    @abstractmethod
    def _iter_raw_hosts(self) -> Iterator[str]:
        """
        迭代原始主机列表（可能包含 CIDR）
        
        子类实现此方法，返回原始数据即可，不需要处理 CIDR 展开。
        
        Yields:
            str: 主机名、IP 地址或 CIDR
        """
        pass
    
    @abstractmethod
    def iter_urls(self) -> Iterator[str]:
        """
        迭代 URL 列表
        
        Yields:
            str: URL 字符串
        """
        pass
    
    @abstractmethod
    def get_blacklist_filter(self) -> Optional['BlacklistFilter']:
        """
        获取黑名单过滤器
        
        Returns:
            BlacklistFilter: 黑名单过滤器实例，或 None（不过滤）
        """
        pass
    
    @property
    def target_id(self) -> Optional[int]:
        """返回关联的 target_id，临时扫描返回 None"""
        return self._context.target_id
    
    @property
    def scan_id(self) -> Optional[int]:
        """返回关联的 scan_id"""
        return self._context.scan_id
