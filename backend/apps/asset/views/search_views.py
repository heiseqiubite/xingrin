"""
资产搜索 API 视图

提供资产搜索的 REST API 接口：
- GET /api/assets/search/ - 搜索资产

搜索语法：
- field="value"     模糊匹配（ILIKE %value%）
- field=="value"    精确匹配
- field!="value"    不等于
- &&                AND 连接
- ||                OR 连接

支持的字段：
- host: 主机名
- url: URL
- title: 标题
- tech: 技术栈
- status: 状态码
- body: 响应体
- header: 响应头
"""

import logging
import json
from urllib.parse import urlparse, urlunparse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from django.db import connection

from apps.common.response_helpers import success_response, error_response
from apps.common.error_codes import ErrorCodes
from apps.asset.services.search_service import AssetSearchService

logger = logging.getLogger(__name__)


class AssetSearchView(APIView):
    """
    资产搜索 API
    
    GET /api/assets/search/
    
    Query Parameters:
        q: 搜索查询表达式
        page: 页码（从 1 开始，默认 1）
        pageSize: 每页数量（默认 10，最大 100）
    
    示例查询：
        ?q=host="api" && tech="nginx"
        ?q=tech="vue" || tech="react"
        ?q=status=="200" && host!="test"
    
    Response:
        {
            "results": [...],
            "total": 100,
            "page": 1,
            "pageSize": 10,
            "totalPages": 10
        }
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = AssetSearchService()
    
    def _parse_headers(self, headers_data) -> dict:
        """解析响应头为字典"""
        if not headers_data:
            return {}
        try:
            return json.loads(headers_data)
        except (json.JSONDecodeError, TypeError):
            result = {}
            for line in str(headers_data).split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    result[key.strip()] = value.strip()
            return result
    
    def _format_result(self, result: dict, vulnerabilities_by_url: dict) -> dict:
        """格式化单个搜索结果"""
        website_url = result.get('url', '')
        vulns = vulnerabilities_by_url.get(website_url, [])
        
        return {
            'url': website_url,
            'host': result.get('host', ''),
            'title': result.get('title', ''),
            'technologies': result.get('tech', []) or [],
            'statusCode': result.get('status_code'),
            'responseHeaders': self._parse_headers(result.get('response_headers')),
            'responseBody': result.get('response_body', ''),
            'vulnerabilities': [
                {
                    'id': v.get('id'),
                    'name': v.get('vuln_type', ''),
                    'vulnType': v.get('vuln_type', ''),
                    'severity': v.get('severity', 'info'),
                }
                for v in vulns
            ],
        }
    
    def _get_vulnerabilities_by_url_prefix(self, website_urls: list) -> dict:
        """
        根据 URL 前缀批量查询漏洞数据
        
        漏洞 URL 是 website URL 的子路径，使用前缀匹配：
        - website.url: https://example.com/path?query=1
        - vulnerability.url: https://example.com/path/api/users
        
        Args:
            website_urls: website URL 列表，格式为 [(url, target_id), ...]
        
        Returns:
            dict: {website_url: [vulnerability_list]}
        """
        if not website_urls:
            return {}
        
        try:
            with connection.cursor() as cursor:
                # 构建 OR 条件：每个 website URL（去掉查询参数）作为前缀匹配
                conditions = []
                params = []
                url_mapping = {}  # base_url -> original_url
                
                for url, target_id in website_urls:
                    if not url or target_id is None:
                        continue
                    # 使用 urlparse 去掉查询参数和片段，只保留 scheme://netloc/path
                    parsed = urlparse(url)
                    base_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
                    url_mapping[base_url] = url
                    conditions.append("(v.url LIKE %s AND v.target_id = %s)")
                    params.extend([base_url + '%', target_id])
                
                if not conditions:
                    return {}
                
                where_clause = " OR ".join(conditions)
                
                sql = f"""
                    SELECT v.id, v.vuln_type, v.severity, v.url, v.target_id
                    FROM vulnerability v
                    WHERE {where_clause}
                    ORDER BY 
                        CASE v.severity 
                            WHEN 'critical' THEN 1 
                            WHEN 'high' THEN 2 
                            WHEN 'medium' THEN 3 
                            WHEN 'low' THEN 4 
                            ELSE 5 
                        END
                """
                cursor.execute(sql, params)
                
                # 获取所有漏洞
                all_vulns = []
                for row in cursor.fetchall():
                    all_vulns.append({
                        'id': row[0],
                        'vuln_type': row[1],
                        'name': row[1],
                        'severity': row[2],
                        'url': row[3],
                        'target_id': row[4],
                    })
                
                # 按原始 website URL 分组（用于返回结果）
                result = {url: [] for url, _ in website_urls}
                for vuln in all_vulns:
                    vuln_url = vuln['url']
                    # 找到匹配的 website URL（最长前缀匹配）
                    for website_url, target_id in website_urls:
                        parsed = urlparse(website_url)
                        base_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
                        if vuln_url.startswith(base_url) and vuln['target_id'] == target_id:
                            result[website_url].append(vuln)
                            break
                
                return result
        except Exception as e:
            logger.error(f"批量查询漏洞失败: {e}")
            return {}
    
    def get(self, request: Request):
        """搜索资产"""
        # 获取搜索查询
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='Search query (q) is required',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取分页参数
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('pageSize', 10))
        except (ValueError, TypeError):
            page = 1
            page_size = 10
        
        # 限制分页参数
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        
        # 获取总数和搜索结果
        total = self.service.count(query)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        offset = (page - 1) * page_size
        
        all_results = self.service.search(query)
        results = all_results[offset:offset + page_size]
        
        # 批量查询漏洞数据（按 URL 前缀匹配）
        website_urls = [(r.get('url'), r.get('target_id')) for r in results if r.get('url') and r.get('target_id')]
        vulnerabilities_by_url = self._get_vulnerabilities_by_url_prefix(website_urls) if website_urls else {}
        
        # 格式化结果
        formatted_results = [self._format_result(r, vulnerabilities_by_url) for r in results]
        
        return success_response(data={
            'results': formatted_results,
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': total_pages,
        })
