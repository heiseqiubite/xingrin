"use client"

import { useMemo, useRef, useEffect } from "react"
import AnsiToHtml from "ansi-to-html"
import type { LogLevel } from "./log-toolbar"

interface AnsiLogViewerProps {
  content: string
  className?: string
  searchQuery?: string
  logLevel?: LogLevel
}

// 日志级别颜色配置
const LOG_LEVEL_COLORS: Record<string, string> = {
  DEBUG: "#4ec9b0",    // cyan
  INFO: "#6a9955",     // green
  WARNING: "#dcdcaa",  // yellow
  WARN: "#dcdcaa",     // yellow
  ERROR: "#f44747",    // red
  CRITICAL: "#f44747", // red (bold handled separately)
}

// 创建 ANSI 转换器实例
const ansiConverter = new AnsiToHtml({
  fg: "#d4d4d4",
  bg: "#1e1e1e",
  newline: false,  // 我们自己处理换行
  escapeXML: true,
  colors: {
    0: "#1e1e1e",   // black
    1: "#f44747",   // red
    2: "#6a9955",   // green
    3: "#dcdcaa",   // yellow
    4: "#569cd6",   // blue
    5: "#c586c0",   // magenta
    6: "#4ec9b0",   // cyan
    7: "#d4d4d4",   // white
    8: "#808080",   // bright black
    9: "#f44747",   // bright red
    10: "#6a9955",  // bright green
    11: "#dcdcaa",  // bright yellow
    12: "#569cd6",  // bright blue
    13: "#c586c0",  // bright magenta
    14: "#4ec9b0",  // bright cyan
    15: "#ffffff",  // bright white
  },
})

// 检测内容是否包含 ANSI 颜色码
function hasAnsiCodes(text: string): boolean {
  // ANSI 转义序列通常以 ESC[ 开头（\x1b[ 或 \u001b[）
  return /\x1b\[|\u001b\[/.test(text)
}

// 解析纯文本日志内容，为日志级别添加颜色
function colorizeLogContent(content: string): string {
  // 匹配日志格式: [时间] [级别] [模块:行号] 消息
  // 例如: [2025-01-05 10:30:00] [INFO] [apps.scan:123] 消息内容
  const logLineRegex = /^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]) (\[(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)\]) (.*)$/
  
  return content
    .split("\n")
    .map((line) => {
      const match = line.match(logLineRegex)
      
      if (match) {
        const [, timestamp, levelBracket, level, rest] = match
        const color = LOG_LEVEL_COLORS[level] || "#d4d4d4"
        // ansiConverter.toHtml 已经处理了 HTML 转义
        const escapedTimestamp = ansiConverter.toHtml(timestamp)
        const escapedLevelBracket = ansiConverter.toHtml(levelBracket)
        const escapedRest = ansiConverter.toHtml(rest)
        
        // 时间戳灰色，日志级别带颜色，其余默认色
        return `<span style="color:#808080">${escapedTimestamp}</span> <span style="color:${color};font-weight:${level === "CRITICAL" ? "bold" : "normal"}">${escapedLevelBracket}</span> ${escapedRest}`
      }
      
      // 非标准格式的行，也进行 HTML 转义
      return ansiConverter.toHtml(line)
    })
    .join("\n")
}

// 高亮搜索关键词
function highlightSearch(html: string, query: string): string {
  if (!query.trim()) return html

  // `ansi-to-html` 在 `escapeXML: true` 时，会把非 ASCII 字符（如中文）转成实体：
  // 例如 "中文" => "&#x4E2D;&#x6587;"。
  // 因此这里需要用同样的转义规则来生成可匹配的搜索串。
  const escapedQueryForHtml = ansiConverter.toHtml(query)

  // 转义正则特殊字符
  const escapedQuery = escapedQueryForHtml.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escapedQuery})`, "giu")

  // 在标签外的文本中高亮关键词
  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag
    if (text) {
      return text.replace(
        regex,
        '<mark style="background:#fbbf24;color:#1e1e1e;border-radius:2px;padding:0 2px">$1</mark>'
      )
    }
    return match
  })
}

// 多种日志格式的级别提取正则
const LOG_LEVEL_PATTERNS = [
  // 标准格式: [2026-01-07 12:00:00] [INFO]
  /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] \[(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)\]/i,
  // Prefect 格式: 12:01:50.419 | WARNING | prefect
  /^[\d:.]+\s+\|\s+(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)\s+\|/i,
  // 简单格式: [INFO] message 或 INFO: message
  /^(?:\[)?(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)(?:\])?[:\s]/i,
  // Python logging 格式: INFO - message
  /^(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)\s+-\s+/i,
]

// 新日志条目起始模式（无级别但表示新条目开始）
const NEW_ENTRY_PATTERNS = [
  /^\[\d+\/\d+\]/, // [1/4], [2/4] 等步骤标记
  /^\[CONFIG\]/i, // [CONFIG] 配置信息
  /^\[诊断\]/, // [诊断] 诊断信息
  /^={10,}$/, // ============ 分隔线
  /^\[\d{4}-\d{2}-\d{2}/, // 时间戳开头 [2026-01-07...
  /^\d{2}:\d{2}:\d{2}/, // 时间开头 12:01:50...
  /^\/[\w/]+\.py:\d+:/, // Python 文件路径 /path/file.py:123:
]

// 从行中提取日志级别
function extractLogLevel(line: string): string | null {
  for (const pattern of LOG_LEVEL_PATTERNS) {
    const match = line.match(pattern)
    if (match) {
      return match[1].toUpperCase()
    }
  }
  return null
}

// 检测是否是新日志条目的起始（无级别）
function isNewEntryStart(line: string): boolean {
  return NEW_ENTRY_PATTERNS.some((pattern) => pattern.test(line))
}

// 级别标准化
function normalizeLevel(l: string): string {
  const upper = l.toUpperCase()
  if (upper === "WARNING") return "WARN"
  if (upper === "CRITICAL") return "ERROR"
  return upper
}

// 根据级别筛选日志行
// 支持多行日志：非标准格式的行会跟随前一个标准日志行的级别
function filterByLevel(content: string, level: LogLevel): string {
  if (level === "all") return content
  
  const targetLevel = normalizeLevel(level)
  const lines = content.split("\n")
  const result: string[] = []
  // 默认隐藏，直到遇到第一个匹配目标级别的日志行
  let currentBlockVisible = false
  
  for (const line of lines) {
    const extractedLevel = extractLogLevel(line)
    if (extractedLevel) {
      // 这是一个新的日志条目，精确匹配级别
      const lineLevel = normalizeLevel(extractedLevel)
      currentBlockVisible = lineLevel === targetLevel
    } else if (isNewEntryStart(line)) {
      // 无级别但是新条目开始，隐藏
      currentBlockVisible = false
    }
    // 非标准行跟随前一个日志条目的可见性
    if (currentBlockVisible) {
      result.push(line)
    }
  }
  
  return result.join("\n")
}

export function AnsiLogViewer({ content, className, searchQuery = "", logLevel = "all" }: AnsiLogViewerProps) {
  const containerRef = useRef<HTMLPreElement>(null)
  const isAtBottomRef = useRef(true)  // 跟踪用户是否在底部

  // 解析日志并添加颜色
  // 支持两种模式：ANSI 颜色码和纯文本日志级别解析
  const htmlContent = useMemo(() => {
    if (!content) return ""
    
    // 先按级别筛选
    const filteredContent = filterByLevel(content, logLevel)
    
    let result: string
    // 如果包含 ANSI 颜色码，直接转换
    if (hasAnsiCodes(filteredContent)) {
      result = ansiConverter.toHtml(filteredContent)
    } else {
      // 否则解析日志级别添加颜色
      result = colorizeLogContent(filteredContent)
    }
    
    // 应用搜索高亮
    return highlightSearch(result, searchQuery)
  }, [content, searchQuery, logLevel])

  // 监听滚动事件，检测用户是否在底部
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // 允许 30px 的容差，认为在底部附近
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 30
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // 只有用户在底部时才自动滚动
  useEffect(() => {
    if (containerRef.current && isAtBottomRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [htmlContent])

  return (
    <pre
      ref={containerRef}
      className={className}
      style={{
        height: "100%",
        width: "100%",
        margin: 0,
        padding: "12px",
        overflow: "auto",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        fontSize: "12px",
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
