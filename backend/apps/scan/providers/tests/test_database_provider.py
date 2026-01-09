"""
DatabaseTargetProvider 属性测试

Property 7: DatabaseTargetProvider Blacklist Application
*For any* 带有黑名单规则的 target_id，DatabaseTargetProvider 的 iter_hosts() 和 iter_urls() 
应该过滤掉匹配黑名单规则的目标。

**Validates: Requirements 2.3, 10.1, 10.2, 10.3**
"""

import pytest
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings

from apps.scan.providers.database_provider import DatabaseTargetProvider
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


class MockBlacklistFilter:
    """模拟黑名单过滤器"""
    
    def __init__(self, blocked_patterns: list):
        self.blocked_patterns = blocked_patterns
    
    def is_allowed(self, target: str) -> bool:
        """检查目标是否被允许（不在黑名单中）"""
        for pattern in self.blocked_patterns:
            if pattern in target:
                return False
        return True


class TestDatabaseTargetProviderProperties:
    """DatabaseTargetProvider 属性测试类"""
    
    @given(
        hosts=st.lists(valid_domain_strategy(), min_size=1, max_size=20),
        blocked_keyword=st.text(
            alphabet=st.characters(whitelist_categories=('L',), min_codepoint=97, max_codepoint=122),
            min_size=2,
            max_size=5
        )
    )
    @settings(max_examples=100)
    def test_property_7_blacklist_filters_hosts(self, hosts, blocked_keyword):
        """
        Property 7: DatabaseTargetProvider Blacklist Application (hosts)
        
        Feature: scan-target-provider, Property 7: DatabaseTargetProvider Blacklist Application
        **Validates: Requirements 2.3, 10.1, 10.2, 10.3**
        
        For any set of hosts and a blacklist keyword, the provider should filter out
        all hosts containing the blocked keyword.
        """
        # 创建模拟的黑名单过滤器
        mock_filter = MockBlacklistFilter([blocked_keyword])
        
        # 创建 provider 并注入模拟的黑名单过滤器
        provider = DatabaseTargetProvider(target_id=1)
        provider._blacklist_filter = mock_filter
        
        # 模拟 Target 和 SubdomainService
        mock_target = MagicMock()
        mock_target.type = 'domain'
        mock_target.name = hosts[0] if hosts else 'example.com'
        
        with patch('apps.targets.services.TargetService') as mock_target_service, \
             patch('apps.asset.services.asset.subdomain_service.SubdomainService') as mock_subdomain_service:
            
            mock_target_service.return_value.get_target.return_value = mock_target
            mock_subdomain_service.return_value.iter_subdomain_names_by_target.return_value = iter(hosts[1:] if len(hosts) > 1 else [])
            
            # 获取结果
            result = list(provider.iter_hosts())
            
            # 验证：所有结果都不包含被阻止的关键词
            for host in result:
                assert blocked_keyword not in host, f"Host '{host}' should be filtered by blacklist keyword '{blocked_keyword}'"
            
            # 验证：所有不包含关键词的主机都应该在结果中
            if hosts:
                all_hosts = [hosts[0]] + [h for h in hosts[1:] if h != hosts[0]]
                expected_allowed = [h for h in all_hosts if blocked_keyword not in h]
            else:
                expected_allowed = []
            
            assert set(result) == set(expected_allowed)


class TestDatabaseTargetProviderUnit:
    """DatabaseTargetProvider 单元测试类"""
    
    def test_target_id_in_context(self):
        """测试 target_id 正确设置到上下文中"""
        provider = DatabaseTargetProvider(target_id=123)
        assert provider.target_id == 123
        assert provider.context.target_id == 123
    
    def test_context_propagation(self):
        """测试上下文传递"""
        ctx = ProviderContext(scan_id=789)
        provider = DatabaseTargetProvider(target_id=123, context=ctx)
        
        assert provider.target_id == 123  # target_id 被覆盖
        assert provider.scan_id == 789
    
    def test_blacklist_filter_lazy_loading(self):
        """测试黑名单过滤器延迟加载"""
        provider = DatabaseTargetProvider(target_id=123)
        
        # 初始时 _blacklist_filter 为 None
        assert provider._blacklist_filter is None
        
        # 模拟 BlacklistService
        with patch('apps.common.services.BlacklistService') as mock_service, \
             patch('apps.common.utils.BlacklistFilter') as mock_filter_class:
            
            mock_service.return_value.get_rules.return_value = []
            mock_filter_instance = MagicMock()
            mock_filter_class.return_value = mock_filter_instance
            
            # 第一次调用
            result1 = provider.get_blacklist_filter()
            assert result1 == mock_filter_instance
            
            # 第二次调用应该返回缓存的实例
            result2 = provider.get_blacklist_filter()
            assert result2 == mock_filter_instance
            
            # BlacklistService 只应该被调用一次
            mock_service.return_value.get_rules.assert_called_once_with(123)
    
    def test_nonexistent_target_returns_empty(self):
        """测试不存在的 target 返回空迭代器"""
        provider = DatabaseTargetProvider(target_id=99999)
        
        with patch('apps.targets.services.TargetService') as mock_service, \
             patch('apps.common.services.BlacklistService') as mock_blacklist_service:
            
            mock_service.return_value.get_target.return_value = None
            mock_blacklist_service.return_value.get_rules.return_value = []
            
            result = list(provider.iter_hosts())
            assert result == []
