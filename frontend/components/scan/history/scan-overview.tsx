"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import {
  Globe,
  Network,
  Server,
  Link2,
  FolderOpen,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight,
  Target,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  HardDrive,
} from "lucide-react"
import {
  IconCircleCheck,
  IconCircleX,
  IconClock,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useScan } from "@/hooks/use-scans"
import { useScanLogs } from "@/hooks/use-scan-logs"
import { ScanLogList } from "@/components/scan/scan-log-list"
import { YamlEditor } from "@/components/ui/yaml-editor"
import { getDateLocale } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import type { StageStatus } from "@/types/scan.types"

interface ScanOverviewProps {
  scanId: number
}

/**
 * Scan overview component
 * Displays statistics cards for the scan results
 */
// Pulsing dot animation
function PulsingDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-3 w-3", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
    </span>
  )
}

// Stage status icon
function StageStatusIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "completed":
      return <IconCircleCheck className="h-5 w-5 text-[#238636] dark:text-[#3fb950]" />
    case "running":
      return <PulsingDot className="text-[#d29922]" />
    case "failed":
      return <IconCircleX className="h-5 w-5 text-[#da3633] dark:text-[#f85149]" />
    case "cancelled":
      return <IconCircleX className="h-5 w-5 text-[#848d97]" />
    default:
      return <IconClock className="h-5 w-5 text-muted-foreground" />
  }
}

// Format duration (seconds -> readable string)
function formatStageDuration(seconds?: number): string | undefined {
  if (seconds === undefined || seconds === null) return undefined
  if (seconds < 1) return "<1s"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
}

// Status priority for sorting (lower = higher priority)
const STAGE_STATUS_PRIORITY: Record<StageStatus, number> = {
  running: 0,
  pending: 1,
  completed: 2,
  failed: 3,
  cancelled: 4,
}

export function ScanOverview({ scanId }: ScanOverviewProps) {
  const t = useTranslations("scan.history.overview")
  const tStatus = useTranslations("scan.history.status")
  const tProgress = useTranslations("scan.progress")
  const locale = useLocale()

  const { data: scan, isLoading, error } = useScan(scanId)
  
  // Check if scan is running (for log polling)
  const isRunning = scan?.status === 'running' || scan?.status === 'initiated'
  
  // Auto-refresh state (default: on when running)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Tab state for logs/config
  const [activeTab, setActiveTab] = useState<'logs' | 'config'>('logs')
  
  // Logs hook
  const { logs, loading: logsLoading } = useScanLogs({
    scanId,
    enabled: !!scan,
    pollingInterval: isRunning && autoRefresh ? 3000 : 0,
  })

  // Format date helper
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString(getDateLocale(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calculate duration
  const formatDuration = (startedAt: string | undefined, completedAt: string | undefined): string => {
    if (!startedAt) return "-"
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const remainingMins = diffMins % 60

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`
    }
    return `${diffMins}m`
  }

  // Status style configuration (consistent with scan-history-columns)
  const SCAN_STATUS_STYLES: Record<string, string> = {
    running: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20",
    cancelled: "bg-[#848d97]/10 text-[#848d97] border-[#848d97]/20",
    completed: "bg-[#238636]/10 text-[#238636] border-[#238636]/20 dark:text-[#3fb950]",
    failed: "bg-[#da3633]/10 text-[#da3633] border-[#da3633]/20 dark:text-[#f85149]",
    initiated: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20",
    pending: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20",
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle2, animate: false }
      case "running":
        return { icon: Loader2, animate: true }
      case "failed":
        return { icon: XCircle, animate: false }
      case "cancelled":
        return { icon: XCircle, animate: false }
      case "pending":
      case "initiated":
        return { icon: Loader2, animate: true }
      default:
        return { icon: Clock, animate: false }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-muted-foreground">{t("loadError")}</p>
      </div>
    )
  }

  // Use type assertion for extended properties
  const scanAny = scan as any
  const summary = scanAny.summary || {}
  const vulnSummary = summary.vulnerabilities || { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
  const statusIconConfig = getStatusIcon(scan.status)
  const StatusIcon = statusIconConfig.icon
  const statusStyle = SCAN_STATUS_STYLES[scan.status] || "bg-muted text-muted-foreground"
  const targetId = scanAny.target  // Target ID
  const targetName = scan.targetName  // Target name
  const startedAt = scanAny.startedAt || scan.createdAt
  const completedAt = scanAny.completedAt

  const assetCards = [
    {
      title: t("cards.websites"),
      value: summary.websites || 0,
      icon: Globe,
      href: `/scan/history/${scanId}/websites/`,
    },
    {
      title: t("cards.subdomains"),
      value: summary.subdomains || 0,
      icon: Network,
      href: `/scan/history/${scanId}/subdomain/`,
    },
    {
      title: t("cards.ips"),
      value: summary.ips || 0,
      icon: Server,
      href: `/scan/history/${scanId}/ip-addresses/`,
    },
    {
      title: t("cards.urls"),
      value: summary.endpoints || 0,
      icon: Link2,
      href: `/scan/history/${scanId}/endpoints/`,
    },
    {
      title: t("cards.directories"),
      value: summary.directories || 0,
      icon: FolderOpen,
      href: `/scan/history/${scanId}/directories/`,
    },
  ]

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      {/* Scan info + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {/* Target */}
          {targetId && targetName && (
            <Link
              href={`/target/${targetId}/overview/`}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Target className="h-4 w-4" />
              <span>{targetName}</span>
            </Link>
          )}
          {/* Started at */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{t("startedAt")}: {formatDate(startedAt)}</span>
          </div>
          {/* Duration */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{t("duration")}: {formatDuration(startedAt, completedAt)}</span>
          </div>
          {/* Engine */}
          {scan.engineNames && scan.engineNames.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Cpu className="h-4 w-4" />
              <span>{scan.engineNames.join(", ")}</span>
            </div>
          )}
          {/* Worker */}
          {scan.workerName && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-4 w-4" />
              <span>{scan.workerName}</span>
            </div>
          )}
        </div>
        {/* Status badge */}
        <Badge variant="outline" className={statusStyle}>
          <StatusIcon className={`h-3.5 w-3.5 mr-1.5 ${statusIconConfig.animate ? 'animate-spin' : ''}`} />
          {tStatus(scan.status)}
        </Badge>
      </div>

      {/* Asset statistics cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("assetsTitle")}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {assetCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Stage Progress + Logs - Left-Right Split Layout */}
      <div className="grid gap-4 md:grid-cols-[280px_1fr] flex-1 min-h-0">
        {/* Left Column: Stage Progress + Vulnerability Stats */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Stage Progress */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">{t("stagesTitle")}</CardTitle>
              {scan.stageProgress && (
                <span className="text-xs text-muted-foreground">
                  {Object.values(scan.stageProgress).filter((p: any) => p.status === "completed").length}/
                  {Object.keys(scan.stageProgress).length} {t("stagesCompleted")}
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
              {scan.stageProgress && Object.keys(scan.stageProgress).length > 0 ? (
                <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
                  {Object.entries(scan.stageProgress)
                    .sort(([, a], [, b]) => {
                      const progressA = a as any
                      const progressB = b as any
                      const priorityA = STAGE_STATUS_PRIORITY[progressA.status as StageStatus] ?? 99
                      const priorityB = STAGE_STATUS_PRIORITY[progressB.status as StageStatus] ?? 99
                      if (priorityA !== priorityB) {
                        return priorityA - priorityB
                      }
                      return (progressA.order ?? 0) - (progressB.order ?? 0)
                    })
                    .map(([stageName, progress]) => {
                      const stageProgress = progress as any
                      const isRunning = stageProgress.status === "running"
                      return (
                        <div
                          key={stageName}
                          className={cn(
                            "flex items-center justify-between py-2 px-2 rounded-md transition-colors text-sm",
                            isRunning && "bg-[#d29922]/10 border border-[#d29922]/30",
                            stageProgress.status === "completed" && "text-muted-foreground",
                            stageProgress.status === "failed" && "bg-[#da3633]/10 text-[#da3633]",
                            stageProgress.status === "cancelled" && "text-muted-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StageStatusIcon status={stageProgress.status} />
                            <span className={cn("truncate", isRunning && "font-medium text-foreground")}>
                              {tProgress(`stages.${stageName}`)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                            {stageProgress.status === "completed" && stageProgress.duration
                              ? formatStageDuration(stageProgress.duration)
                              : stageProgress.status === "running"
                                ? tProgress("stage_running")
                                : stageProgress.status === "pending"
                                  ? "--"
                                  : ""}
                          </span>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {t("noStages")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vulnerability Stats - Compact */}
          <Link href={`/scan/history/${scanId}/vulnerabilities/`} className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("vulnerabilitiesTitle")}</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">{vulnSummary.critical}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-sm font-medium">{vulnSummary.high}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium">{vulnSummary.medium}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{vulnSummary.low}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {t("totalVulns", { count: vulnSummary.total })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Right Column: Logs / Config */}
        <div className="flex flex-col min-h-0 rounded-lg overflow-hidden border">
          {/* Tab Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'logs' | 'config')}>
              <TabsList variant="underline" className="h-8 gap-3">
                <TabsTrigger variant="underline" value="logs" className="text-xs">{t("logsTitle")}</TabsTrigger>
                <TabsTrigger variant="underline" value="config" className="text-xs">{t("configTitle")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Auto-refresh toggle (only for logs tab when running) */}
            {activeTab === 'logs' && isRunning && (
              <div className="flex items-center gap-2">
                <Switch
                  id="log-auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  className="scale-75"
                />
                <Label htmlFor="log-auto-refresh" className="text-xs cursor-pointer">
                  {t("autoRefresh")}
                </Label>
              </div>
            )}
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 min-h-0">
            {activeTab === 'logs' ? (
              <ScanLogList logs={logs} loading={logsLoading} />
            ) : (
              <div className="h-full">
                {scan.yamlConfiguration ? (
                  <YamlEditor
                    value={scan.yamlConfiguration}
                    onChange={() => {}}
                    disabled={true}
                    height="100%"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {t("noConfig")}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Bottom status bar (only for logs tab) */}
          {activeTab === 'logs' && (
            <div className="flex items-center px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground shrink-0">
              <span>{logs.length} 条记录</span>
              {isRunning && autoRefresh && (
                <>
                  <Separator orientation="vertical" className="h-3 mx-3" />
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    每 3 秒刷新
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
