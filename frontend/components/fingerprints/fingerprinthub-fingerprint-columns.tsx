"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell, ExpandableMonoCell } from "@/components/ui/data-table/expandable-cell"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useTranslations } from "next-intl"
import type { FingerPrintHubFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

/**
 * Severity badge with color coding (matching Vulnerabilities style)
 */
function SeverityBadge({ severity }: { severity: string }) {
  const severityConfig: Record<string, { className: string }> = {
    critical: { className: "bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20 dark:text-[#f85149]" },
    high: { className: "bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20" },
    medium: { className: "bg-[#d4a72c]/10 text-[#d4a72c] border border-[#d4a72c]/20" },
    low: { className: "bg-[#238636]/10 text-[#238636] border border-[#238636]/20 dark:text-[#3fb950]" },
    info: { className: "bg-[#848d97]/10 text-[#848d97] border border-[#848d97]/20" },
  }
  
  const config = severityConfig[severity?.toLowerCase()] || severityConfig.info
  
  return (
    <Badge className={config.className}>
      {severity || "info"}
    </Badge>
  )
}

/**
 * Tags list cell - displays tags with expand/collapse
 */
function TagListCell({ tags }: { tags: string }) {
  const t = useTranslations("tooltips")
  const [expanded, setExpanded] = React.useState(false)
  
  if (!tags) return <span className="text-muted-foreground">-</span>
  
  const tagArray = tags.split(",").map(t => t.trim())
  const displayTags = expanded ? tagArray : tagArray.slice(0, 3)
  const hasMore = tagArray.length > 3
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {displayTags.map((tag, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {tag}
          </Badge>
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
              {t("collapse")}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              {t("expand")}
            </>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Metadata cell - displays vendor, product, verified and queries
 */
function MetadataCell({ metadata }: { metadata: any }) {
  const t = useTranslations("tooltips")
  const [expanded, setExpanded] = React.useState(false)
  
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-muted-foreground">-</span>
  }
  
  const items: { key: string; value: any }[] = []
  Object.entries(metadata).forEach(([key, value]) => {
    items.push({ key, value })
  })
  
  const displayItems = expanded ? items : items.slice(0, 2)
  const hasMore = items.length > 2
  
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="font-mono text-xs space-y-0.5 w-full">
        {displayItems.map((item, idx) => (
          <div key={idx} className={expanded ? "break-all w-full" : "truncate w-full"}>
            "{item.key}": {JSON.stringify(item.value)}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start inline-flex items-center gap-0.5"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>{t("collapse")}</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>{t("expand")}</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * HTTP matchers cell - displays detailed HTTP rules in JSON format
 */
function HttpMatchersCell({ http }: { http: any[] }) {
  const t = useTranslations("tooltips")
  const [expanded, setExpanded] = React.useState(false)
  
  if (!http || http.length === 0) return <span className="text-muted-foreground">-</span>
  
  // Extract key fields from http matchers
  const httpItems: { key: string; value: any }[] = []
  const hasMultiple = http.length > 1
  http.forEach((item, idx) => {
    const prefix = hasMultiple ? `[${idx}].` : ""
    if (item.path) httpItems.push({ key: `${prefix}path`, value: item.path })
    if (item.method) httpItems.push({ key: `${prefix}method`, value: item.method })
    if (item.matchers) httpItems.push({ key: `${prefix}matchers`, value: item.matchers })
  })
  
  const displayItems = expanded ? httpItems : httpItems.slice(0, 2)
  const hasMore = httpItems.length > 2
  
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="font-mono text-xs space-y-0.5 w-full">
        {displayItems.map((item, idx) => (
          <div key={idx} className={expanded ? "break-all w-full" : "truncate w-full"}>
            "{item.key}": {JSON.stringify(item.value)}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start inline-flex items-center gap-0.5"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>{t("collapse")}</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>{t("expand")}</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Create FingerPrintHub fingerprint table column definitions
 */
export function createFingerPrintHubFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<FingerPrintHubFingerprint>[] {
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
    {
      accessorKey: "fpId",
      meta: { title: "FP ID" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="FP ID" />
      ),
      cell: ({ row }) => (
        <ExpandableMonoCell value={row.getValue("fpId")} maxLines={1} />
      ),
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: "name",
      meta: { title: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("name")} maxLines={2} />
      ),
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: "author",
      meta: { title: "Author" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Author" />
      ),
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("author")} maxLines={1} />
      ),
      enableResizing: true,
      size: 120,
    },
    {
      accessorKey: "severity",
      meta: { title: "Severity" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Severity" />
      ),
      cell: ({ row }) => <SeverityBadge severity={row.getValue("severity")} />,
      enableResizing: false,
      size: 100,
    },
    {
      accessorKey: "tags",
      meta: { title: "Tags" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tags" />
      ),
      cell: ({ row }) => <TagListCell tags={row.getValue("tags") || ""} />,
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: "metadata",
      meta: { title: "Metadata" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Metadata" />
      ),
      cell: ({ row }) => <MetadataCell metadata={row.getValue("metadata") || {}} />,
      enableResizing: true,
      size: 300,
    },
    {
      accessorKey: "http",
      meta: { title: "HTTP" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="HTTP" />
      ),
      cell: ({ row }) => <HttpMatchersCell http={row.getValue("http") || []} />,
      enableResizing: true,
      size: 350,
    },
    {
      accessorKey: "sourceFile",
      meta: { title: "Source File" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source File" />
      ),
      cell: ({ row }) => (
        <ExpandableMonoCell value={row.getValue("sourceFile")} maxLines={1} />
      ),
      enableResizing: true,
      size: 200,
    },
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
