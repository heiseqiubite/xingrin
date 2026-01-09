"""
ListTargetProvider 属性测试

Property 1: ListTargetProvider Round-Trip
*For any* 主机列表和 URL 列表，创建 ListTargetProvider 后迭代 iter_hosts() 和 iter_urls() 
应该返回与输入相同的元素（顺序相同）。

**Validates: Requirements 3.1, 3.2**
"""

import pytest
from hypothesis import given, strategies as st, settings, assume

from apps.scan.providers.list_provider import ListTargetProvider
from apps.scan.providers.base import ProviderContext


# 生成有效域名的策略
def valid_domain_strategy():
    """生成有效的域名"""
    # 生成简单的域名格式: subdomain.domain.tld
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


class TestListTargetProviderProperties:
    """ListTargetProvider 属性测试类"""
    
    @given(hosts=st.lists(host_strategy, max_size=50))
    @settings(max_examples=100)
    def test_property_1_hosts_round_trip(self, hosts):
        """
        Property 1: ListTargetProvider Round-Trip (hosts)
        
        Feature: scan-target-provider, Property 1: ListTargetProvider Round-Trip
        **Validates: Requirements 3.1, 3.2**
        
        For any host list, creating a ListTargetProvider and iterating iter_hosts()
        should return the same elements in the same order.
        """
        # ListTargetProvider 使用 targets 参数，自动分类为 hosts/urls
        provider = ListTargetProvider(targets=hosts)
        result = list(provider.iter_hosts())
        assert result == hosts
    
    @given(urls=st.lists(url_strategy, max_size=50))
    @settings(max_examples=100)
    def test_property_1_urls_round_trip(self, urls):
        """
        Property 1: ListTargetProvider Round-Trip (urls)
        
        Feature: scan-target-provider, Property 1: ListTargetProvider Round-Trip
        **Validates: Requirements 3.1, 3.2**
        
        For any URL list, creating a ListTargetProvider and iterating iter_urls()
        should return the same elements in the same order.
        """
        # ListTargetProvider 使用 targets 参数，自动分类为 hosts/urls
        provider = ListTargetProvider(targets=urls)
        result = list(provider.iter_urls())
        assert result == urls
    
    @given(
        hosts=st.lists(host_strategy, max_size=30),
        urls=st.lists(url_strategy, max_size=30)
    )
    @settings(max_examples=100)
    def test_property_1_combined_round_trip(self, hosts, urls):
        """
        Property 1: ListTargetProvider Round-Trip (combined)
        
        Feature: scan-target-provider, Property 1: ListTargetProvider Round-Trip
        **Validates: Requirements 3.1, 3.2**
        
        For any combination of hosts and URLs, both should round-trip correctly.
        """
        # 合并 hosts 和 urls，ListTargetProvider 会自动分类
        combined = hosts + urls
        provider = ListTargetProvider(targets=combined)
        
        hosts_result = list(provider.iter_hosts())
        urls_result = list(provider.iter_urls())
        
        assert hosts_result == hosts
        assert urls_result == urls


class TestListTargetProviderUnit:
    """ListTargetProvider 单元测试类"""
    
    def test_empty_lists(self):
        """测试空列表返回空迭代器 - Requirements 3.5"""
        provider = ListTargetProvider()
        assert list(provider.iter_hosts()) == []
        assert list(provider.iter_urls()) == []
    
    def test_blacklist_filter_returns_none(self):
        """测试黑名单过滤器返回 None - Requirements 3.4"""
        provider = ListTargetProvider(targets=["example.com"])
        assert provider.get_blacklist_filter() is None
    
    def test_target_id_association(self):
        """测试 target_id 关联 - Requirements 3.3"""
        ctx = ProviderContext(target_id=123)
        provider = ListTargetProvider(targets=["example.com"], context=ctx)
        assert provider.target_id == 123
    
    def test_context_propagation(self):
        """测试上下文传递"""
        ctx = ProviderContext(target_id=456, scan_id=789)
        provider = ListTargetProvider(targets=["example.com"], context=ctx)
        
        assert provider.target_id == 456
        assert provider.scan_id == 789
