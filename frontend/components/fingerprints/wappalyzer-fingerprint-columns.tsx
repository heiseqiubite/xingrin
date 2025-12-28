"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"
import type { WappalyzerFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

interface RuleItem {
  key: string
  value: any
}

/**
 * 提取指纹的所有规则（保持原始格式）
 */
function extractRules(fp: WappalyzerFingerprint): RuleItem[] {
  const rules: RuleItem[] = []
  const ruleKeys = ['cookies', 'headers', 'scriptSrc', 'js', 'meta', 'html'] as const
  
  for (const key of ruleKeys) {
    const value = fp[key]
    if (value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
      rules.push({ key, value })
    }
  }
  
  return rules
}

/**
 * 规则列表单元格 - 显示原始 JSON 格式
 */
function RulesCell({ fp }: { fp: WappalyzerFingerprint }) {
  const [expanded, setExpanded] = React.useState(false)
  const rules = extractRules(fp)
  
  if (rules.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }
  
  const displayRules = expanded ? rules : rules.slice(0, 2)
  const hasMore = rules.length > 2
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayRules.map((rule, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            "{rule.key}": {JSON.stringify(rule.value)}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  )
}

/**
 * 创建 Wappalyzer 指纹表格列定义
 */
export function createWappalyzerFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<WappalyzerFingerprint>[] {
  return [
    // 选择列
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
    },
    // 应用名称
    {
      accessorKey: "name",
      meta: { title: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
      enableResizing: true,
      size: 180,
    },
    // 分类
    {
      accessorKey: "cats",
      meta: { title: "Cats" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cats" />
      ),
      cell: ({ row }) => {
        const cats = row.getValue("cats") as number[]
        if (!cats || cats.length === 0) return "-"
        return <span className="font-mono text-xs">{JSON.stringify(cats)}</span>
      },
      enableResizing: true,
      size: 100,
    },
    // 规则（合并 cookies, headers, scriptSrc, js, meta, html）
    {
      id: "rules",
      meta: { title: "Rules" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rules" />
      ),
      cell: ({ row }) => <RulesCell fp={row.original} />,
      enableResizing: true,
      size: 350,
    },
    // 依赖
    {
      accessorKey: "implies",
      meta: { title: "Implies" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Implies" />
      ),
      cell: ({ row }) => {
        const implies = row.getValue("implies") as string[]
        if (!implies || implies.length === 0) return "-"
        return <span className="font-mono text-xs">{implies.join(", ")}</span>
      },
      enableResizing: true,
      size: 150,
    },
    // 描述
    {
      accessorKey: "description",
      meta: { title: "Description" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => <ExpandableCell value={row.getValue("description")} maxLines={2} />,
      enableResizing: true,
      size: 250,
    },
    // 官网
    {
      accessorKey: "website",
      meta: { title: "Website" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Website" />
      ),
      cell: ({ row }) => <ExpandableCell value={row.getValue("website")} variant="url" maxLines={1} />,
      enableResizing: true,
      size: 180,
    },
    // CPE
    {
      accessorKey: "cpe",
      meta: { title: "CPE" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CPE" />
      ),
      cell: ({ row }) => {
        const cpe = row.getValue("cpe") as string
        return cpe ? <span className="font-mono text-xs">{cpe}</span> : "-"
      },
      enableResizing: true,
      size: 150,
    },
    // 创建时间
    {
      accessorKey: "createdAt",
      meta: { title: "Created" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="text-sm text-muted-foreground">
            {formatDate(date)}
          </div>
        )
      },
      enableResizing: false,
      size: 160,
    },
  ]
}
