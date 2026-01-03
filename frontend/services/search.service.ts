import { api } from "@/lib/api-client"
import type { SearchParams, SearchResponse, AssetType } from "@/types/search.types"

/**
 * 资产搜索 API 服务
 * 
 * 搜索语法：
 * - field="value"     模糊匹配（ILIKE %value%）
 * - field=="value"    精确匹配
 * - field!="value"    不等于
 * - &&                AND 连接
 * - ||                OR 连接
 * 
 * 支持的资产类型：
 * - website: 站点（默认）
 * - endpoint: 端点
 * 
 * 示例：
 * - host="api" && tech="nginx"
 * - tech="vue" || tech="react"
 * - status=="200" && host!="test"
 */
export class SearchService {
  /**
   * 搜索资产
   * GET /api/assets/search/
   */
  static async search(params: SearchParams): Promise<SearchResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.q) queryParams.append('q', params.q)
    if (params.asset_type) queryParams.append('asset_type', params.asset_type)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    
    const response = await api.get<SearchResponse>(
      `/assets/search/?${queryParams.toString()}`
    )
    return response.data
  }

  /**
   * 导出搜索结果为 CSV
   * GET /api/assets/search/export/
   */
  static async exportCSV(query: string, assetType: AssetType): Promise<void> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    queryParams.append('asset_type', assetType)
    
    const response = await api.get(
      `/assets/search/export/?${queryParams.toString()}`,
      { responseType: 'blob' }
    )
    
    // 从响应头获取文件名
    const contentDisposition = response.headers?.['content-disposition']
    let filename = `search_${assetType}_${new Date().toISOString().slice(0, 10)}.csv`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) filename = match[1]
    }
    
    // 创建下载链接
    const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
