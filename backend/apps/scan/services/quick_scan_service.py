"""
快速扫描服务

负责解析用户输入（URL、域名、IP、CIDR）并创建对应的资产数据
"""

import logging
from dataclasses import dataclass
from typing import Optional, Literal, List, Dict, Any
from urllib.parse import urlparse

from django.db import transaction

from apps.common.validators import validate_url, detect_input_type, validate_domain, validate_ip, validate_cidr, is_valid_ip
from apps.targets.services.target_service import TargetService
from apps.targets.models import Target
from apps.asset.dtos import WebSiteDTO
from apps.asset.dtos.asset import EndpointDTO
from apps.asset.repositories.asset.website_repository import DjangoWebSiteRepository
from apps.asset.repositories.asset.endpoint_repository import DjangoEndpointRepository

logger = logging.getLogger(__name__)


@dataclass
class ParsedInputDTO:
    """
    解析输入 DTO
    
    只在快速扫描流程中使用
    """
    original_input: str
    input_type: Literal['url', 'domain', 'ip', 'cidr']
    target_name: str                              # host/domain/ip/cidr
    target_type: Literal['domain', 'ip', 'cidr']
    website_url: Optional[str] = None             # 根 URL（scheme://host[:port]）
    endpoint_url: Optional[str] = None            # 完整 URL（含路径）
    is_valid: bool = True
    error: Optional[str] = None
    line_number: Optional[int] = None


class QuickScanService:
    """快速扫描服务 - 解析输入并创建资产"""
    
    def __init__(self):
        self.target_service = TargetService()
        self.website_repo = DjangoWebSiteRepository()
        self.endpoint_repo = DjangoEndpointRepository()
    
    def parse_inputs(self, inputs: List[str]) -> List[ParsedInputDTO]:
        """
        解析多行输入
        
        Args:
            inputs: 输入字符串列表（每行一个）
            
        Returns:
            解析结果列表（跳过空行）
        """
        results = []
        for line_number, input_str in enumerate(inputs, start=1):
            input_str = input_str.strip()
            
            # 空行跳过
            if not input_str:
                continue
            
            try:
                # 检测输入类型
                input_type = detect_input_type(input_str)
                
                if input_type == 'url':
                    dto = self._parse_url_input(input_str, line_number)
                else:
                    dto = self._parse_target_input(input_str, input_type, line_number)
                
                results.append(dto)
            except ValueError as e:
                # 解析失败，记录错误
                results.append(ParsedInputDTO(
                    original_input=input_str,
                    input_type='domain',  # 默认类型
                    target_name=input_str,
                    target_type='domain',
                    is_valid=False,
                    error=str(e),
                    line_number=line_number
                ))
        
        return results
    
    def _parse_url_input(self, url_str: str, line_number: int) -> ParsedInputDTO:
        """
        解析 URL 输入
        
        Args:
            url_str: URL 字符串
            line_number: 行号
            
        Returns:
            ParsedInputDTO
        """
        # 验证 URL 格式
        validate_url(url_str)
        
        # 使用标准库解析
        parsed = urlparse(url_str)
        
        host = parsed.hostname  # 不含端口
        has_path = parsed.path and parsed.path != '/'
        
        # 构建 root_url: scheme://host[:port]
        root_url = f"{parsed.scheme}://{parsed.netloc}"
        
        # 检测 host 类型（domain 或 ip）
        target_type = 'ip' if is_valid_ip(host) else 'domain'
        
        return ParsedInputDTO(
            original_input=url_str,
            input_type='url',
            target_name=host,
            target_type=target_type,
            website_url=root_url,
            endpoint_url=url_str if has_path else None,
            line_number=line_number
        )
    
    def _parse_target_input(
        self, 
        input_str: str, 
        input_type: str, 
        line_number: int
    ) -> ParsedInputDTO:
        """
        解析非 URL 输入（domain/ip/cidr）
        
        Args:
            input_str: 输入字符串
            input_type: 输入类型
            line_number: 行号
            
        Returns:
            ParsedInputDTO
        """
        # 验证格式
        if input_type == 'domain':
            validate_domain(input_str)
            target_type = 'domain'
        elif input_type == 'ip':
            validate_ip(input_str)
            target_type = 'ip'
        elif input_type == 'cidr':
            validate_cidr(input_str)
            target_type = 'cidr'
        else:
            raise ValueError(f"未知的输入类型: {input_type}")
        
        return ParsedInputDTO(
            original_input=input_str,
            input_type=input_type,
            target_name=input_str,
            target_type=target_type,
            website_url=None,
            endpoint_url=None,
            line_number=line_number
        )
    
    @transaction.atomic
    def process_quick_scan(
        self, 
        inputs: List[str],
        engine_id: int
    ) -> Dict[str, Any]:
        """
        处理快速扫描请求
        
        Args:
            inputs: 输入字符串列表
            engine_id: 扫描引擎 ID
            
        Returns:
            处理结果字典
        """
        # 1. 解析输入
        parsed_inputs = self.parse_inputs(inputs)
        
        # 分离有效和无效输入
        valid_inputs = [p for p in parsed_inputs if p.is_valid]
        invalid_inputs = [p for p in parsed_inputs if not p.is_valid]
        
        if not valid_inputs:
            return {
                'targets': [],
                'target_stats': {'created': 0, 'reused': 0, 'failed': len(invalid_inputs)},
                'asset_stats': {'websites_created': 0, 'endpoints_created': 0},
                'errors': [
                    {'line_number': p.line_number, 'input': p.original_input, 'error': p.error}
                    for p in invalid_inputs
                ]
            }
        
        # 2. 创建资产
        asset_result = self.create_assets_from_parsed_inputs(valid_inputs)
        
        # 3. 返回结果
        return {
            'targets': asset_result['targets'],
            'target_stats': asset_result['target_stats'],
            'asset_stats': asset_result['asset_stats'],
            'errors': [
                {'line_number': p.line_number, 'input': p.original_input, 'error': p.error}
                for p in invalid_inputs
            ]
        }
    
    def create_assets_from_parsed_inputs(
        self, 
        parsed_inputs: List[ParsedInputDTO]
    ) -> Dict[str, Any]:
        """
        从解析结果创建资产
        
        Args:
            parsed_inputs: 解析结果列表（只包含有效输入）
            
        Returns:
            创建结果字典
        """
        # 1. 收集所有 target 数据（内存操作，去重）
        targets_data = {}
        for dto in parsed_inputs:
            if dto.target_name not in targets_data:
                targets_data[dto.target_name] = {'name': dto.target_name, 'type': dto.target_type}
        
        targets_list = list(targets_data.values())
        
        # 2. 批量创建 Target（复用现有方法）
        target_result = self.target_service.batch_create_targets(targets_list)
        
        # 3. 查询刚创建的 Target，建立 name → id 映射
        target_names = [d['name'] for d in targets_list]
        targets = Target.objects.filter(name__in=target_names)
        target_id_map = {t.name: t.id for t in targets}
        
        # 4. 收集 Website DTO（内存操作，去重）
        website_dtos = []
        seen_websites = set()
        for dto in parsed_inputs:
            if dto.website_url and dto.website_url not in seen_websites:
                seen_websites.add(dto.website_url)
                target_id = target_id_map.get(dto.target_name)
                if target_id:
                    website_dtos.append(WebSiteDTO(
                        target_id=target_id,
                        url=dto.website_url,
                        host=dto.target_name
                    ))
        
        # 5. 批量创建 Website（存在即跳过）
        websites_created = 0
        if website_dtos:
            websites_created = self.website_repo.bulk_create_ignore_conflicts(website_dtos)
        
        # 6. 收集 Endpoint DTO（内存操作，去重）
        endpoint_dtos = []
        seen_endpoints = set()
        for dto in parsed_inputs:
            if dto.endpoint_url and dto.endpoint_url not in seen_endpoints:
                seen_endpoints.add(dto.endpoint_url)
                target_id = target_id_map.get(dto.target_name)
                if target_id:
                    endpoint_dtos.append(EndpointDTO(
                        target_id=target_id,
                        url=dto.endpoint_url,
                        host=dto.target_name
                    ))
        
        # 7. 批量创建 Endpoint（存在即跳过）
        endpoints_created = 0
        if endpoint_dtos:
            endpoints_created = self.endpoint_repo.bulk_create_ignore_conflicts(endpoint_dtos)
        
        return {
            'targets': list(targets),
            'target_stats': {
                'created': target_result['created_count'],
                'reused': 0,  # bulk_create 无法区分新建和复用
                'failed': target_result['failed_count']
            },
            'asset_stats': {
                'websites_created': websites_created,
                'endpoints_created': endpoints_created
            }
        }
