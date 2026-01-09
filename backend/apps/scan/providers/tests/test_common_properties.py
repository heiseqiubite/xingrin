"""
通用属性测试

包含跨多个 Provider 的通用属性测试：
- Property 4: Context Propagation
- Property 5: Non-Database Provider Blacklist Filter
- Property 7: CIDR Expansion Consistency
"""

import pytest
from hypothesis import given, strategies as st, settings
from ipaddress import IPv4Network

from apps.scan.providers import (
    ProviderContext,
    ListTargetProvider,
    DatabaseTargetProvider,
    PipelineTargetProvider,
    SnapshotTargetProvider
)
from apps.scan.providers.pipeline_provider import StageOutput


class TestContextPropagation:
    """
    Property 4: Context Propagation
    
    *For any* ProviderContext，传入 Provider 构造函数后，
    Provider 的 target_id 和 scan_id 属性应该与 context 中的值一致。
    
    **Validates: Requirements 1.3, 1.5, 7.4, 7.5**
    """
    
    @given(
        target_id=st.integers(min_value=1, max_value=10000),
        scan_id=st.integers(min_value=1, max_value=10000)
    )
    @settings(max_examples=100)
    def test_property_4_list_provider_context_propagation(self, target_id, scan_id):
        """
        Property 4: Context Propagation (ListTargetProvider)
        
        Feature: scan-target-provider, Property 4: Context Propagation
        **Validates: Requirements 1.3, 1.5, 7.4, 7.5**
        """
        ctx = ProviderContext(target_id=target_id, scan_id=scan_id)
        provider = ListTargetProvider(targets=["example.com"], context=ctx)
        
        assert provider.target_id == target_id
        assert provider.scan_id == scan_id
        assert provider.context.target_id == target_id
        assert provider.context.scan_id == scan_id
    
    @given(
        target_id=st.integers(min_value=1, max_value=10000),
        scan_id=st.integers(min_value=1, max_value=10000)
    )
    @settings(max_examples=100)
    def test_property_4_database_provider_context_propagation(self, target_id, scan_id):
        """
        Property 4: Context Propagation (DatabaseTargetProvider)
        
        Feature: scan-target-provider, Property 4: Context Propagation
        **Validates: Requirements 1.3, 1.5, 7.4, 7.5**
        """
        ctx = ProviderContext(target_id=999, scan_id=scan_id)
        # DatabaseTargetProvider 会覆盖 context 中的 target_id
        provider = DatabaseTargetProvider(target_id=target_id, context=ctx)
        
        assert provider.target_id == target_id  # 使用构造函数参数
        assert provider.scan_id == scan_id  # 使用 context 中的值
        assert provider.context.target_id == target_id
        assert provider.context.scan_id == scan_id
    
    @given(
        target_id=st.integers(min_value=1, max_value=10000),
        scan_id=st.integers(min_value=1, max_value=10000)
    )
    @settings(max_examples=100)
    def test_property_4_pipeline_provider_context_propagation(self, target_id, scan_id):
        """
        Property 4: Context Propagation (PipelineTargetProvider)
        
        Feature: scan-target-provider, Property 4: Context Propagation
        **Validates: Requirements 1.3, 1.5, 7.4, 7.5**
        """
        ctx = ProviderContext(target_id=target_id, scan_id=scan_id)
        stage_output = StageOutput(hosts=["example.com"])
        provider = PipelineTargetProvider(previous_output=stage_output, context=ctx)
        
        assert provider.target_id == target_id
        assert provider.scan_id == scan_id
        assert provider.context.target_id == target_id
        assert provider.context.scan_id == scan_id
    
    @given(
        target_id=st.integers(min_value=1, max_value=10000),
        scan_id=st.integers(min_value=1, max_value=10000)
    )
    @settings(max_examples=100)
    def test_property_4_snapshot_provider_context_propagation(self, target_id, scan_id):
        """
        Property 4: Context Propagation (SnapshotTargetProvider)
        
        Feature: scan-target-provider, Property 4: Context Propagation
        **Validates: Requirements 1.3, 1.5, 7.4, 7.5**
        """
        ctx = ProviderContext(target_id=target_id, scan_id=999)
        # SnapshotTargetProvider 会覆盖 context 中的 scan_id
        provider = SnapshotTargetProvider(
            scan_id=scan_id,
            snapshot_type="subdomain",
            context=ctx
        )
        
        assert provider.target_id == target_id  # 使用 context 中的值
        assert provider.scan_id == scan_id  # 使用构造函数参数
        assert provider.context.target_id == target_id
        assert provider.context.scan_id == scan_id


class TestNonDatabaseProviderBlacklistFilter:
    """
    Property 5: Non-Database Provider Blacklist Filter
    
    *For any* ListTargetProvider 或 PipelineTargetProvider 实例，
    get_blacklist_filter() 方法应该返回 None。
    
    **Validates: Requirements 3.4, 9.4, 9.5**
    """
    
    @given(targets=st.lists(st.text(min_size=1, max_size=20), max_size=10))
    @settings(max_examples=100)
    def test_property_5_list_provider_no_blacklist(self, targets):
        """
        Property 5: Non-Database Provider Blacklist Filter (ListTargetProvider)
        
        Feature: scan-target-provider, Property 5: Non-Database Provider Blacklist Filter
        **Validates: Requirements 3.4, 9.4, 9.5**
        """
        provider = ListTargetProvider(targets=targets)
        assert provider.get_blacklist_filter() is None
    
    @given(hosts=st.lists(st.text(min_size=1, max_size=20), max_size=10))
    @settings(max_examples=100)
    def test_property_5_pipeline_provider_no_blacklist(self, hosts):
        """
        Property 5: Non-Database Provider Blacklist Filter (PipelineTargetProvider)
        
        Feature: scan-target-provider, Property 5: Non-Database Provider Blacklist Filter
        **Validates: Requirements 3.4, 9.4, 9.5**
        """
        stage_output = StageOutput(hosts=hosts)
        provider = PipelineTargetProvider(previous_output=stage_output)
        assert provider.get_blacklist_filter() is None
    
    def test_property_5_snapshot_provider_no_blacklist(self):
        """
        Property 5: Non-Database Provider Blacklist Filter (SnapshotTargetProvider)
        
        Feature: scan-target-provider, Property 5: Non-Database Provider Blacklist Filter
        **Validates: Requirements 3.4, 9.4, 9.5**
        """
        provider = SnapshotTargetProvider(scan_id=1, snapshot_type="subdomain")
        assert provider.get_blacklist_filter() is None


class TestCIDRExpansionConsistency:
    """
    Property 7: CIDR Expansion Consistency
    
    *For any* CIDR 字符串（如 "192.168.1.0/24"），所有 Provider 的 iter_hosts() 
    方法应该将其展开为相同的单个 IP 地址列表。
    
    **Validates: Requirements 1.1, 3.6**
    """
    
    @given(
        # 生成小的 CIDR 范围以避免测试超时
        network_prefix=st.integers(min_value=1, max_value=254),
        cidr_suffix=st.integers(min_value=28, max_value=30)  # /28 = 16 IPs, /30 = 4 IPs
    )
    @settings(max_examples=50, deadline=None)
    def test_property_7_cidr_expansion_consistency(self, network_prefix, cidr_suffix):
        """
        Property 7: CIDR Expansion Consistency
        
        Feature: scan-target-provider, Property 7: CIDR Expansion Consistency
        **Validates: Requirements 1.1, 3.6**
        
        For any CIDR string, all Providers should expand it to the same IP list.
        """
        cidr = f"192.168.{network_prefix}.0/{cidr_suffix}"
        
        # 计算预期的 IP 列表
        network = IPv4Network(cidr, strict=False)
        # 排除网络地址和广播地址
        expected_ips = [str(ip) for ip in network.hosts()]
        
        # 如果 CIDR 太小（/31 或 /32），使用所有地址
        if not expected_ips:
            expected_ips = [str(ip) for ip in network]
        
        # ListTargetProvider
        list_provider = ListTargetProvider(targets=[cidr])
        list_result = list(list_provider.iter_hosts())
        
        # PipelineTargetProvider
        stage_output = StageOutput(hosts=[cidr])
        pipeline_provider = PipelineTargetProvider(previous_output=stage_output)
        pipeline_result = list(pipeline_provider.iter_hosts())
        
        # 验证：所有 Provider 展开的结果应该一致
        assert list_result == expected_ips, f"ListProvider CIDR expansion mismatch for {cidr}"
        assert pipeline_result == expected_ips, f"PipelineProvider CIDR expansion mismatch for {cidr}"
        assert list_result == pipeline_result, f"Providers produce different results for {cidr}"
    
    def test_cidr_expansion_with_multiple_cidrs(self):
        """测试多个 CIDR 的展开一致性"""
        cidrs = ["192.168.1.0/30", "10.0.0.0/30"]
        
        # 计算预期结果
        expected_ips = []
        for cidr in cidrs:
            network = IPv4Network(cidr, strict=False)
            expected_ips.extend([str(ip) for ip in network.hosts()])
        
        # ListTargetProvider
        list_provider = ListTargetProvider(targets=cidrs)
        list_result = list(list_provider.iter_hosts())
        
        # PipelineTargetProvider
        stage_output = StageOutput(hosts=cidrs)
        pipeline_provider = PipelineTargetProvider(previous_output=stage_output)
        pipeline_result = list(pipeline_provider.iter_hosts())
        
        # 验证
        assert list_result == expected_ips
        assert pipeline_result == expected_ips
        assert list_result == pipeline_result
    
    def test_mixed_hosts_and_cidrs(self):
        """测试混合主机和 CIDR 的处理"""
        targets = ["example.com", "192.168.1.0/30", "test.com"]
        
        # 计算预期结果
        network = IPv4Network("192.168.1.0/30", strict=False)
        cidr_ips = [str(ip) for ip in network.hosts()]
        expected = ["example.com"] + cidr_ips + ["test.com"]
        
        # ListTargetProvider
        list_provider = ListTargetProvider(targets=targets)
        list_result = list(list_provider.iter_hosts())
        
        # 验证
        assert list_result == expected
