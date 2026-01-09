"""
管道目标提供者模块

提供基于管道阶段输出的目标提供者实现。
用于 Phase 2 管道模式的阶段间数据传递。
"""

from dataclasses import dataclass, field
from typing import Iterator, Optional, List, Dict, Any

from .base import TargetProvider, ProviderContext


@dataclass
class StageOutput:
    """
    阶段输出数据
    
    用于在管道阶段之间传递数据。
    
    Attributes:
        hosts: 主机列表（域名/IP）
        urls: URL 列表
        new_targets: 新发现的目标列表
        stats: 统计信息
        success: 是否成功
        error: 错误信息
    """
    hosts: List[str] = field(default_factory=list)
    urls: List[str] = field(default_factory=list)
    new_targets: List[str] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    error: Optional[str] = None


class PipelineTargetProvider(TargetProvider):
    """
    管道目标提供者 - 使用上一阶段的输出
    
    用于 Phase 2 管道模式的阶段间数据传递。
    
    特点：
    - 不查询数据库
    - 不应用黑名单过滤（数据已在上一阶段过滤）
    - 直接使用 StageOutput 中的数据
    
    使用方式（Phase 2）：
        stage1_output = stage1.run(input)
        provider = PipelineTargetProvider(
            previous_output=stage1_output,
            target_id=123
        )
        for host in provider.iter_hosts():
            stage2.scan(host)
    """
    
    def __init__(
        self,
        previous_output: StageOutput,
        target_id: Optional[int] = None,
        context: Optional[ProviderContext] = None
    ):
        """
        初始化管道目标提供者
        
        Args:
            previous_output: 上一阶段的输出
            target_id: 可选，关联到某个 Target（用于保存结果）
            context: Provider 上下文
        """
        ctx = context or ProviderContext(target_id=target_id)
        super().__init__(ctx)
        self._previous_output = previous_output
    
    def _iter_raw_hosts(self) -> Iterator[str]:
        """迭代上一阶段输出的原始主机（可能包含 CIDR）"""
        yield from self._previous_output.hosts
    
    def iter_urls(self) -> Iterator[str]:
        """迭代上一阶段输出的 URL"""
        yield from self._previous_output.urls
    
    def get_blacklist_filter(self) -> None:
        """管道传递的数据已经过滤过了"""
        return None
    
    @property
    def previous_output(self) -> StageOutput:
        """返回上一阶段的输出"""
        return self._previous_output
