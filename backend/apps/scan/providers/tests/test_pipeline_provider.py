"""
PipelineTargetProvider 属性测试

Property 3: PipelineTargetProvider Round-Trip
*For any* StageOutput 对象，PipelineTargetProvider 的 iter_hosts() 和 iter_urls() 
应该返回与 StageOutput 中 hosts 和 urls 列表相同的元素。

**Validates: Requirements 5.1, 5.2**
"""

import pytest
from hypothesis import given, strategies as st, settings

from apps.scan.providers.pipeline_provider import PipelineTargetProvider, StageOutput
from apps.scan.providers.base import ProviderContext


# 生成有效域名的策略
def valid_domain_strategy():
    """生成有效的域名"""
    label = st.text(
        alphabet=st.characters(whitelist_categories=('L',), min_codepoint=97, max_codepoint=122),
        min_size=2,
        max_size=10
    )
    return st.builds(
        lambda a, b, c: f"{a}.{b}.{c}",
        label, label, st.sampled_from(['com', 'net', 'org', 'io'])
    )

# 生成有效 IP 地址的策略
def valid_ip_strategy():
    """生成有效的 IPv4 地址"""
    octet = st.integers(min_value=1, max_value=254)
    return st.builds(
        lambda a, b, c, d: f"{a}.{b}.{c}.{d}",
        octet, octet, octet, octet
    )

# 组合策略：域名或 IP
host_strategy = st.one_of(valid_domain_strategy(), valid_ip_strategy())

# 生成有效 URL 的策略
def valid_url_strategy():
    """生成有效的 URL"""
    domain = valid_domain_strategy()
    return st.builds(
        lambda d, path: f"https://{d}/{path}" if path else f"https://{d}",
        domain,
        st.one_of(
            st.just(""),
            st.text(
                alphabet=st.characters(whitelist_categories=('L',), min_codepoint=97, max_codepoint=122),
                min_size=1,
                max_size=10
            )
        )
    )

url_strategy = valid_url_strategy()


class TestPipelineTargetProviderProperties:
    """PipelineTargetProvider 属性测试类"""
    
    @given(hosts=st.lists(host_strategy, max_size=50))
    @settings(max_examples=100)
    def test_property_3_hosts_round_trip(self, hosts):
        """
        Property 3: PipelineTargetProvider Round-Trip (hosts)
        
        Feature: scan-target-provider, Property 3: PipelineTargetProvider Round-Trip
        **Validates: Requirements 5.1, 5.2**
        
        For any StageOutput with hosts, PipelineTargetProvider should return
        the same hosts in the same order.
        """
        stage_output = StageOutput(hosts=hosts)
        provider = PipelineTargetProvider(previous_output=stage_output)
        result = list(provider.iter_hosts())
        assert result == hosts
    
    @given(urls=st.lists(url_strategy, max_size=50))
    @settings(max_examples=100)
    def test_property_3_urls_round_trip(self, urls):
        """
        Property 3: PipelineTargetProvider Round-Trip (urls)
        
        Feature: scan-target-provider, Property 3: PipelineTargetProvider Round-Trip
        **Validates: Requirements 5.1, 5.2**
        
        For any StageOutput with urls, PipelineTargetProvider should return
        the same urls in the same order.
        """
        stage_output = StageOutput(urls=urls)
        provider = PipelineTargetProvider(previous_output=stage_output)
        result = list(provider.iter_urls())
        assert result == urls
    
    @given(
        hosts=st.lists(host_strategy, max_size=30),
        urls=st.lists(url_strategy, max_size=30)
    )
    @settings(max_examples=100)
    def test_property_3_combined_round_trip(self, hosts, urls):
        """
        Property 3: PipelineTargetProvider Round-Trip (combined)
        
        Feature: scan-target-provider, Property 3: PipelineTargetProvider Round-Trip
        **Validates: Requirements 5.1, 5.2**
        
        For any StageOutput with both hosts and urls, both should round-trip correctly.
        """
        stage_output = StageOutput(hosts=hosts, urls=urls)
        provider = PipelineTargetProvider(previous_output=stage_output)
        
        hosts_result = list(provider.iter_hosts())
        urls_result = list(provider.iter_urls())
        
        assert hosts_result == hosts
        assert urls_result == urls


class TestPipelineTargetProviderUnit:
    """PipelineTargetProvider 单元测试类"""
    
    def test_empty_stage_output(self):
        """测试空 StageOutput 返回空迭代器 - Requirements 5.5"""
        stage_output = StageOutput()
        provider = PipelineTargetProvider(previous_output=stage_output)
        
        assert list(provider.iter_hosts()) == []
        assert list(provider.iter_urls()) == []
    
    def test_blacklist_filter_returns_none(self):
        """测试黑名单过滤器返回 None - Requirements 5.3"""
        stage_output = StageOutput(hosts=["example.com"])
        provider = PipelineTargetProvider(previous_output=stage_output)
        assert provider.get_blacklist_filter() is None
    
    def test_target_id_association(self):
        """测试 target_id 关联 - Requirements 5.4"""
        stage_output = StageOutput(hosts=["example.com"])
        provider = PipelineTargetProvider(previous_output=stage_output, target_id=123)
        assert provider.target_id == 123
    
    def test_context_propagation(self):
        """测试上下文传递"""
        ctx = ProviderContext(target_id=456, scan_id=789)
        stage_output = StageOutput(hosts=["example.com"])
        provider = PipelineTargetProvider(previous_output=stage_output, context=ctx)
        
        assert provider.target_id == 456
        assert provider.scan_id == 789
    
    def test_previous_output_property(self):
        """测试 previous_output 属性"""
        stage_output = StageOutput(hosts=["example.com"], urls=["https://example.com"])
        provider = PipelineTargetProvider(previous_output=stage_output)
        
        assert provider.previous_output is stage_output
        assert provider.previous_output.hosts == ["example.com"]
        assert provider.previous_output.urls == ["https://example.com"]
    
    def test_stage_output_with_metadata(self):
        """测试带元数据的 StageOutput"""
        stage_output = StageOutput(
            hosts=["example.com"],
            urls=["https://example.com"],
            new_targets=["new.example.com"],
            stats={"count": 1},
            success=True,
            error=None
        )
        provider = PipelineTargetProvider(previous_output=stage_output)
        
        assert list(provider.iter_hosts()) == ["example.com"]
        assert list(provider.iter_urls()) == ["https://example.com"]
        assert provider.previous_output.new_targets == ["new.example.com"]
        assert provider.previous_output.stats == {"count": 1}
