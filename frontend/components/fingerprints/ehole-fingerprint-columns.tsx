"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { EholeFingerprint } from "@/types/fingerprint.types"

// Translation type definitions
export interface EholeFingerprintTranslations {
  columns: {
    cms: string
    method: string
    location: string
    keyword: string
    type: string
    important: string
    created: string
  }
  actions: {
    selectAll: string
    selectRow: string
    expand: string
    collapse: string
  }
}

interface ColumnOptions {
  formatDate: (date: string) => string
  t: EholeFingerprintTranslations
}

/**
 * Keyword list cell - displays 3 by default, expandable for more
 */
function KeywordListCell({ keywords, t }: { keywords: string[]; t: EholeFingerprintTranslations }) {
  const [expanded, setExpanded] = React.useState(false)
  
  if (!keywords || keywords.length === 0) return <span className="text-muted-foreground">-</span>
  
  const displayKeywords = expanded ? keywords : keywords.slice(0, 3)
  const hasMore = keywords.length > 3
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayKeywords.map((kw, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            {kw}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start flex items-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              {t.actions.collapse}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              {t.actions.expand}
            </>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Create EHole fingerprint table column definitions
 */
export function createEholeFingerprintColumns({
  formatDate,
  t,
}: ColumnOptions): ColumnDef<EholeFingerprint>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t.actions.selectAll}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t.actions.selectRow}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
    },
    {
      accessorKey: "cms",
      meta: { title: t.columns.cms },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.cms} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("cms")}</div>
      ),
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: "method",
      meta: { title: t.columns.method },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.method} />
      ),
      cell: ({ row }) => {
        const method = row.getValue("method") as string
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {method}
          </Badge>
        )
      },
      enableResizing: false,
      size: 120,
    },
    {
      accessorKey: "location",
      meta: { title: t.columns.location },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.location} />
      ),
      cell: ({ row }) => {
        const location = row.getValue("location") as string
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {location}
          </Badge>
        )
      },
      enableResizing: false,
      size: 100,
    },
    {
      accessorKey: "keyword",
      meta: { title: t.columns.keyword },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.keyword} />
      ),
      cell: ({ row }) => <KeywordListCell keywords={row.getValue("keyword") || []} t={t} />,
      enableResizing: true,
      size: 300,
    },
    {
      accessorKey: "type",
      meta: { title: t.columns.type },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.type} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        if (!type || type === "-") return "-"
        return <Badge variant="outline">{type}</Badge>
      },
      enableResizing: false,
      size: 100,
    },
    {
      accessorKey: "isImportant",
      meta: { title: t.columns.important },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.important} />
      ),
      cell: ({ row }) => {
        const isImportant = row.getValue("isImportant")
        return <span>{String(isImportant)}</span>
      },
      enableResizing: false,
      size: 100,
    },
    {
      accessorKey: "createdAt",
      meta: { title: t.columns.created },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.created} />
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
