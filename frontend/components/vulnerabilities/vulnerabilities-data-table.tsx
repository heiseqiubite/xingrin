"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { UnifiedDataTable } from "@/components/ui/data-table"
import { PREDEFINED_FIELDS, type FilterField } from "@/components/common/smart-filter-input"
import type { Vulnerability } from "@/types/vulnerability.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// Vulnerability page filter fields
const VULNERABILITY_FILTER_FIELDS: FilterField[] = [
  { key: "type", label: "Type", description: "Vulnerability type" },
  PREDEFINED_FIELDS.severity,
  { key: "source", label: "Source", description: "Scanner source" },
  PREDEFINED_FIELDS.url,
]

// Vulnerability page examples
const VULNERABILITY_FILTER_EXAMPLES = [
  'type="xss" || type="sqli"',
  'severity="critical" || severity="high"',
  'source="nuclei" && severity="high"',
  'type="xss" && url="/api/*"',
]

interface VulnerabilitiesDataTableProps {
  data: Vulnerability[]
  columns: ColumnDef<Vulnerability>[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Vulnerability[]) => void
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  hideToolbar?: boolean
}

export function VulnerabilitiesDataTable({
  data = [],
  columns,
  filterValue,
  onFilterChange,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
  hideToolbar = false,
}: VulnerabilitiesDataTableProps) {
  const t = useTranslations("common.status")
  const tDownload = useTranslations("common.download")
  
  // Handle smart filter search
  const handleFilterSearch = (rawQuery: string) => {
    onFilterChange?.(rawQuery)
  }

  // Download options
  const downloadOptions: DownloadOption[] = []
  if (onDownloadAll) {
    downloadOptions.push({
      key: "all",
      label: tDownload("all"),
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: tDownload("selected"),
      onClick: onDownloadSelected,
      disabled: (count) => count === 0,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // Pagination
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // Smart filter
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleFilterSearch}
      filterFields={VULNERABILITY_FILTER_FIELDS}
      filterExamples={VULNERABILITY_FILTER_EXAMPLES}
      // Selection
      onSelectionChange={onSelectionChange}
      // Bulk operations
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      showAddButton={false}
      // Download
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // Toolbar
      hideToolbar={hideToolbar}
      // Empty state
      emptyMessage={t("noData")}
    />
  )
}
