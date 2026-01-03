"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, AlertCircle, History, X, Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { SmartFilterInput, type FilterField } from "@/components/common/smart-filter-input"
import { SearchPagination } from "./search-pagination"
import { useAssetSearch } from "@/hooks/use-search"
import { VulnerabilityDetailDialog } from "@/components/vulnerabilities/vulnerability-detail-dialog"
import { VulnerabilityService } from "@/services/vulnerability.service"
import { SearchService } from "@/services/search.service"
import type { SearchParams, SearchState, Vulnerability as SearchVuln, AssetType } from "@/types/search.types"
import type { Vulnerability } from "@/types/vulnerability.types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchResultsTable } from "./search-results-table"
import { SearchResultCard } from "./search-result-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Website 搜索示例
const WEBSITE_SEARCH_EXAMPLES = [
  'host="api"',
  'title="Dashboard"',
  'tech="nginx"',
  'status=="200"',
  'host="api" && status=="200"',
  'tech="vue" || tech="react"',
  'host="admin" && tech="php" && status=="200"',
  'status!="404"',
]

// Endpoint 搜索示例
const ENDPOINT_SEARCH_EXAMPLES = [
  'host="api"',
  'url="/api/v1"',
  'title="Dashboard"',
  'tech="nginx"',
  'status=="200"',
  'host="api" && status=="200"',
  'url="/admin" && status=="200"',
  'tech="vue" || tech="react"',
]

// 快捷搜索标签
const QUICK_SEARCH_TAGS = [
  { label: 'status=="200"', query: 'status=="200"' },
  { label: 'tech="nginx"', query: 'tech="nginx"' },
  { label: 'tech="php"', query: 'tech="php"' },
  { label: 'tech="vue"', query: 'tech="vue"' },
  { label: 'tech="react"', query: 'tech="react"' },
  { label: 'status=="403"', query: 'status=="403"' },
]

// 最近搜索本地存储 key
const RECENT_SEARCHES_KEY = 'xingrin_recent_searches'
const MAX_RECENT_SEARCHES = 5

// 获取最近搜索记录
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

// 保存搜索记录
function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return
  try {
    const searches = getRecentSearches().filter(s => s !== query)
    searches.unshift(query)
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES))
    )
  } catch {
    // ignore
  }
}

// 删除搜索记录
function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    const searches = getRecentSearches().filter(s => s !== query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
  } catch {
    // ignore
  }
}

export function SearchPage() {
  const t = useTranslations('search')
  const urlSearchParams = useSearchParams()
  const [searchState, setSearchState] = useState<SearchState>("initial")
  const [query, setQuery] = useState("")
  const [assetType, setAssetType] = useState<AssetType>("website")
  const [searchParams, setSearchParams] = useState<SearchParams>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null)
  const [vulnDialogOpen, setVulnDialogOpen] = useState(false)
  const [, setLoadingVuln] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [initialQueryProcessed, setInitialQueryProcessed] = useState(false)

  // 加载最近搜索记录
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // 处理 URL 参数中的搜索查询
  useEffect(() => {
    if (initialQueryProcessed) return
    
    const q = urlSearchParams.get('q')
    if (q) {
      setQuery(q)
      setSearchParams({ q, asset_type: assetType })
      setSearchState("searching")
      saveRecentSearch(q)
      setRecentSearches(getRecentSearches())
    }
    setInitialQueryProcessed(true)
  }, [urlSearchParams, assetType, initialQueryProcessed])

  // 根据资产类型选择搜索示例
  const searchExamples = useMemo(() => {
    return assetType === 'endpoint' ? ENDPOINT_SEARCH_EXAMPLES : WEBSITE_SEARCH_EXAMPLES
  }, [assetType])

  // 搜索过滤字段配置
  const SEARCH_FILTER_FIELDS: FilterField[] = [
    { key: "host", label: "Host", description: t('fields.host') },
    { key: "url", label: "URL", description: t('fields.url') },
    { key: "title", label: "Title", description: t('fields.title') },
    { key: "tech", label: "Tech", description: t('fields.tech') },
    { key: "status", label: "Status", description: t('fields.status') },
    { key: "body", label: "Body", description: t('fields.body') },
    { key: "header", label: "Header", description: t('fields.header') },
  ]

  // 使用搜索 Hook
  const { data, isLoading, error, isFetching } = useAssetSearch(
    { ...searchParams, page, pageSize },
    { enabled: searchState === "results" || searchState === "searching" }
  )

  const handleSearch = useCallback((_filters: unknown, rawQuery: string) => {
    if (!rawQuery.trim()) return

    setQuery(rawQuery)
    setSearchParams({ q: rawQuery, asset_type: assetType })
    setPage(1)
    setSearchState("searching")
    
    // 保存到最近搜索
    saveRecentSearch(rawQuery)
    setRecentSearches(getRecentSearches())
  }, [assetType])

  // 处理快捷标签点击
  const handleQuickTagClick = useCallback((tagQuery: string) => {
    setQuery(tagQuery)
  }, [])

  // 处理最近搜索点击
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery)
    setSearchParams({ q: recentQuery, asset_type: assetType })
    setPage(1)
    setSearchState("searching")
    saveRecentSearch(recentQuery)
    setRecentSearches(getRecentSearches())
  }, [assetType])

  // 删除最近搜索
  const handleRemoveRecentSearch = useCallback((e: React.MouseEvent, searchQuery: string) => {
    e.stopPropagation()
    removeRecentSearch(searchQuery)
    setRecentSearches(getRecentSearches())
  }, [])

  // 导出状态
  const [isExporting, setIsExporting] = useState(false)

  // 导出 CSV（调用后端 API 导出全部结果）
  const handleExportCSV = useCallback(async () => {
    if (!searchParams.q) return
    
    setIsExporting(true)
    try {
      await SearchService.exportCSV(searchParams.q, assetType)
      toast.success(t('exportSuccess'))
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(t('exportFailed'))
    } finally {
      setIsExporting(false)
    }
  }, [searchParams.q, assetType, t])

  // 当数据加载完成时更新状态
  if (searchState === "searching" && data && !isLoading) {
    setSearchState("results")
  }

  const handleAssetTypeChange = useCallback((value: AssetType) => {
    setAssetType(value)
    // 清空搜索结果
    if (searchState === "results") {
      setSearchState("initial")
      setSearchParams({})
      setQuery("")
    }
  }, [searchState])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1)
  }, [])

  const handleViewVulnerability = useCallback(async (vuln: SearchVuln) => {
    if (!vuln.id) return
    
    setLoadingVuln(true)
    try {
      const fullVuln = await VulnerabilityService.getVulnerabilityById(vuln.id)
      setSelectedVuln(fullVuln)
      setVulnDialogOpen(true)
    } catch {
      toast.error(t('vulnLoadError'))
    } finally {
      setLoadingVuln(false)
    }
  }, [t])

  // 资产类型选择器组件
  const AssetTypeSelector = (
    <Select value={assetType} onValueChange={handleAssetTypeChange}>
      <SelectTrigger size="sm" className="w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="website">{t('assetTypes.website')}</SelectItem>
        <SelectItem value="endpoint">{t('assetTypes.endpoint')}</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex-1 w-full flex flex-col">
      <AnimatePresence mode="wait">
        {searchState === "initial" && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden"
          >
            {/* 背景装饰 */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute left-1/2 top-1/4 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute right-1/4 top-1/2 h-[200px] w-[300px] rounded-full bg-primary/3 blur-2xl" />
            </div>

            <div className="flex flex-col items-center gap-6 w-full max-w-3xl -mt-16">
              {/* 标题 */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-semibold text-foreground">
                  {t('title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('hint')}
                </p>
              </div>

              {/* 搜索框 */}
              <div className="flex items-center gap-3 w-full">
                {AssetTypeSelector}
                <SmartFilterInput
                  fields={SEARCH_FILTER_FIELDS}
                  examples={searchExamples}
                  placeholder='host="api" && tech="nginx" && status=="200"'
                  value={query}
                  onSearch={handleSearch}
                  className="flex-1"
                />
              </div>

              {/* 快捷搜索标签 */}
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_SEARCH_TAGS.map((tag) => (
                  <Badge
                    key={tag.query}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors px-3 py-1"
                    onClick={() => handleQuickTagClick(tag.query)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>

              {/* 最近搜索 */}
              {recentSearches.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-full max-w-xl mt-2"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <History className="h-3.5 w-3.5" />
                    <span>{t('recentSearches')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search) => (
                      <Badge
                        key={search}
                        variant="secondary"
                        className={cn(
                          "cursor-pointer hover:bg-secondary/80 transition-colors",
                          "pl-3 pr-1.5 py-1 gap-1 group"
                        )}
                        onClick={() => handleRecentSearchClick(search)}
                      >
                        <span className="font-mono text-xs truncate max-w-[200px]">{search}</span>
                        <button
                          onClick={(e) => handleRemoveRecentSearch(e, search)}
                          className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {searchState === "searching" && isLoading && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="text-muted-foreground">{t('searching')}</span>
            </div>
          </motion.div>
        )}

        {(searchState === "results" || (searchState === "searching" && !isLoading)) && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            {/* 顶部搜索栏 */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {AssetTypeSelector}
                <SmartFilterInput
                  fields={SEARCH_FILTER_FIELDS}
                  examples={searchExamples}
                  placeholder='host="api" && tech="nginx" && status=="200"'
                  value={query}
                  onSearch={handleSearch}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {isFetching ? t('loading') : t('resultsCount', { count: data?.total ?? 0 })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={!data?.results || data.results.length === 0 || isExporting}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isExporting ? t('exporting') : t('export')}
                </Button>
              </div>
            </motion.div>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 w-full">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('error')}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* 空结果提示 */}
            {!error && data?.results.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('noResults')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('noResultsHint')}
                  </p>
                </div>
              </div>
            )}

            {/* 搜索结果 */}
            {!error && data && data.results.length > 0 && (
              <>
                <div className="flex-1 overflow-auto p-4">
                  {assetType === 'website' ? (
                    // Website 使用卡片样式
                    <div className="space-y-4 max-w-4xl mx-auto">
                      {data.results.map((result) => (
                        <SearchResultCard
                          key={result.id}
                          result={result}
                          onViewVulnerability={handleViewVulnerability}
                        />
                      ))}
                    </div>
                  ) : (
                    // Endpoint 使用表格样式
                    <SearchResultsTable
                      results={data.results}
                      assetType={assetType}
                      onViewVulnerability={handleViewVulnerability}
                    />
                  )}
                </div>

                {/* 分页控制 */}
                <div className="border-t px-4 py-3">
                  <SearchPagination
                    page={page}
                    pageSize={pageSize}
                    total={data.total}
                    totalPages={data.totalPages}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 漏洞详情弹窗 - 复用现有组件 */}
      <VulnerabilityDetailDialog
        vulnerability={selectedVuln}
        open={vulnDialogOpen}
        onOpenChange={setVulnDialogOpen}
      />
    </div>
  )
}
