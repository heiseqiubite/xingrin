"use client"

import { useMemo, useRef } from "react"
import { AnsiLogViewer } from "@/components/settings/system-logs"
import type { ScanLog } from "@/services/scan.service"

interface ScanLogListProps {
  logs: ScanLog[]
  loading?: boolean
}

/**
 * 格式化时间为 HH:mm:ss
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  } catch {
    return isoString
  }
}

/**
 * 扫描日志列表组件
 * 复用 AnsiLogViewer 组件
 */
export function ScanLogList({ logs, loading }: ScanLogListProps) {
  // 稳定的 content 引用，只有内容真正变化时才更新
  const contentRef = useRef('')
  const lastLogCountRef = useRef(0)
  const lastLogIdRef = useRef<number | null>(null)
  
  // 将日志转换为纯文本格式
  const content = useMemo(() => {
    if (logs.length === 0) return ''
    
    // 检查是否真正需要更新
    const lastLog = logs[logs.length - 1]
    if (
      logs.length === lastLogCountRef.current &&
      lastLog?.id === lastLogIdRef.current
    ) {
      // 日志没有变化，返回缓存的 content
      return contentRef.current
    }
    
    // 更新缓存
    lastLogCountRef.current = logs.length
    lastLogIdRef.current = lastLog?.id ?? null
    
    const newContent = logs.map(log => {
      const time = formatTime(log.createdAt)
      const levelTag = log.level.toUpperCase()
      return `[${time}] [${levelTag}] ${log.content}`
    }).join('\n')
    
    contentRef.current = newContent
    return newContent
  }, [logs])
  
  if (loading && logs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-[#808080]">
        加载中...
      </div>
    )
  }
  
  if (logs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-[#808080]">
        暂无日志
      </div>
    )
  }
  
  return (
    <div className="h-full">
      <AnsiLogViewer content={content} />
    </div>
  )
}
