"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, Eye } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SearchResult, Vulnerability } from "@/types/search.types"

interface SearchResultCardProps {
  result: SearchResult
  onViewVulnerability?: (vuln: Vulnerability) => void
}

// 漏洞严重程度颜色配置
const severityColors: Record<string, string> = {
  critical: "bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20 dark:text-[#f85149]",
  high: "bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20",
  medium: "bg-[#d4a72c]/10 text-[#d4a72c] border border-[#d4a72c]/20",
  low: "bg-[#238636]/10 text-[#238636] border border-[#238636]/20 dark:text-[#3fb950]",
  info: "bg-[#848d97]/10 text-[#848d97] border border-[#848d97]/20",
}

export function SearchResultCard({ result, onViewVulnerability }: SearchResultCardProps) {
  const t = useTranslations('search.card')
  const [vulnOpen, setVulnOpen] = useState(false)
  const [techExpanded, setTechExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const formatHeaders = (headers: Record<string, string>) => {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")
  }

  // 检测内容是否溢出
  const maxHeight = 26 * 4 // 4行高度 (badge ~22px + gap 4px)
  
  useEffect(() => {
    const el = containerRef.current
    if (!el || techExpanded) return

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > maxHeight)
    }

    checkOverflow()

    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(el)

    return () => resizeObserver.disconnect()
  }, [result.technologies, techExpanded, maxHeight])

  const handleViewVulnerability = (vuln: Vulnerability) => {
    if (onViewVulnerability) {
      onViewVulnerability(vuln)
    }
  }

  return (
    <Card className="overflow-hidden py-0 gap-0">
      <CardContent className="p-0">
        {/* 顶部 URL 栏 */}
        <h3 className="font-semibold text-sm px-4 py-2 bg-muted/30 border-b break-all">
          {result.url || result.host}
        </h3>

        {/* 中间左右分栏 */}
        <div className="flex flex-col md:flex-row">
          {/* 左侧信息区 */}
          <div className="w-full md:w-2/5 px-4 pt-2 pb-3 border-b md:border-b-0 md:border-r flex flex-col">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center h-[28px]">
                <span className="text-muted-foreground w-12 shrink-0">{t('title')}</span>
                <span className="font-medium truncate" title={result.title}>{result.title || '-'}</span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-12 shrink-0">Host</span>
                <span className="font-mono text-sm truncate" title={result.host}>{result.host || '-'}</span>
              </div>
            </div>

            {/* Technologies 直接显示 */}
            {result.technologies && result.technologies.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                <div
                  ref={containerRef}
                  className="flex flex-wrap items-start gap-1 overflow-hidden transition-all duration-200"
                  style={{ maxHeight: techExpanded ? "none" : `${maxHeight}px` }}
                >
                  {result.technologies.map((tech, index) => (
                    <Badge
                      key={`${tech}-${index}`}
                      variant="secondary"
                      className="text-xs"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
                {(isOverflowing || techExpanded) && (
                  <button
                    onClick={() => setTechExpanded(!techExpanded)}
                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
                  >
                    {techExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        <span>{t('collapse')}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        <span>{t('expand')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 右侧 Tab 区 */}
          <div className="w-full md:w-3/5 flex flex-col">
            <Tabs defaultValue="header" className="w-full h-full flex flex-col gap-0">
              <TabsList className="h-[28px] gap-4 rounded-none border-b bg-transparent px-4 pt-1">
                <TabsTrigger 
                  value="header" 
                  className="h-full rounded-none border-b-2 border-transparent border-x-0 border-t-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Header
                </TabsTrigger>
                <TabsTrigger 
                  value="body" 
                  className="h-full rounded-none border-b-2 border-transparent border-x-0 border-t-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Body
                </TabsTrigger>
              </TabsList>
              <TabsContent value="header" className="flex-1 overflow-auto bg-muted/30 px-4 py-2 max-h-[200px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {result.responseHeaders ? formatHeaders(result.responseHeaders) : '-'}
                </pre>
              </TabsContent>
              <TabsContent value="body" className="flex-1 overflow-auto bg-muted/30 px-4 py-2 max-h-[200px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {result.responseBody || '-'}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 底部漏洞区 */}
        {result.vulnerabilities && result.vulnerabilities.length > 0 && (
          <div className="border-t">
            <Collapsible open={vulnOpen} onOpenChange={setVulnOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                {vulnOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4 rotate-90" />
                )}
                <span>{t('vulnerabilities', { count: result.vulnerabilities.length })}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[50%]">{t('vulnName')}</TableHead>
                        <TableHead className="text-xs w-[20%]">{t('vulnType')}</TableHead>
                        <TableHead className="text-xs w-[20%]">{t('severity')}</TableHead>
                        <TableHead className="text-xs w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.vulnerabilities.map((vuln, index) => (
                        <TableRow key={`${vuln.name}-${index}`}>
                          <TableCell className="text-xs font-medium">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block max-w-full cursor-default">
                                  {vuln.name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[400px]">
                                {vuln.name}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block max-w-full cursor-default">
                                  {vuln.vulnType}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {vuln.vulnType}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${severityColors[vuln.severity] || severityColors.info}`}
                            >
                              {vuln.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleViewVulnerability(vuln)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
