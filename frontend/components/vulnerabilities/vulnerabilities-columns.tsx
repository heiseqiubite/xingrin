"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ExpandableUrlCell } from "@/components/ui/data-table/expandable-cell"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"

import type { Vulnerability, VulnerabilitySeverity } from "@/types/vulnerability.types"

// Translation type definitions
export interface VulnerabilityTranslations {
  columns: {
    severity: string
    source: string
    vulnType: string
    url: string
    createdAt: string
  }
  actions: {
    details: string
    selectAll: string
    selectRow: string
  }
  tooltips: {
    vulnDetails: string
  }
  severity: {
    critical: string
    high: string
    medium: string
    low: string
    info: string
  }
}

interface ColumnActions {
  formatDate: (date: string) => string
  handleViewDetail: (vulnerability: Vulnerability) => void
  t: VulnerabilityTranslations
}

export function createVulnerabilityColumns({
  formatDate,
  handleViewDetail,
  t,
}: ColumnActions): ColumnDef<Vulnerability>[] {
  // Unified vulnerability severity color configuration
  const severityConfig: Record<VulnerabilitySeverity, { className: string }> = {
    critical: { className: "bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20 dark:text-[#f85149]" },
    high: { className: "bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20" },
    medium: { className: "bg-[#d4a72c]/10 text-[#d4a72c] border border-[#d4a72c]/20" },
    low: { className: "bg-[#238636]/10 text-[#238636] border border-[#238636]/20 dark:text-[#3fb950]" },
    info: { className: "bg-[#848d97]/10 text-[#848d97] border border-[#848d97]/20" },
  }

  return [
    {
      id: "select",
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableResizing: false,
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
    },
    {
      accessorKey: "severity",
      meta: { title: t.columns.severity },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.severity} />
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: false,
      cell: ({ row }) => {
        const severity = row.getValue("severity") as VulnerabilitySeverity
        const config = severityConfig[severity]
        return (
          <Badge className={config.className}>
            {severity}
          </Badge>
        )
      },
    },
    {
      accessorKey: "source",
      meta: { title: t.columns.source },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.source} />
      ),
      size: 100,
      minSize: 80,
      maxSize: 150,
      enableResizing: false,
      cell: ({ row }) => {
        const source = row.getValue("source") as string
        return (
          <Badge variant="outline">
            {source}
          </Badge>
        )
      },
    },
    {
      accessorKey: "vulnType",
      meta: { title: t.columns.vulnType },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.vulnType} />
      ),
      size: 150,
      minSize: 100,
      maxSize: 250,
      cell: ({ row }) => {
        const vulnType = row.getValue("vulnType") as string
        const vulnerability = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className="font-medium cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-colors"
                onClick={() => handleViewDetail(vulnerability)}
              >
                {vulnType}
              </span>
            </TooltipTrigger>
            <TooltipContent>{t.tooltips.vulnDetails}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      accessorKey: "url",
      meta: { title: t.columns.url },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.url} />
      ),
      size: 500,
      minSize: 300,
      maxSize: 700,
      cell: ({ row }) => (
        <ExpandableUrlCell value={row.original.url} />
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { title: t.columns.createdAt },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.createdAt} />
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
      enableResizing: false,
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(createdAt)}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      size: 80,
      minSize: 80,
      maxSize: 80,
      enableResizing: false,
      cell: ({ row }) => {
        const vulnerability = row.original

        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => handleViewDetail(vulnerability)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {t.actions.details}
            </Button>
          </div>
        )
      },
    },
  ]
}
