"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { Directory } from "@/types/directory.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// Directory page filter field configuration
const DIRECTORY_FILTER_FIELDS: FilterField[] = [
  { key: "url", label: "URL", description: "Directory URL" },
  { key: "status", label: "Status", description: "HTTP status code" },
]

// Directory page filter examples
const DIRECTORY_FILTER_EXAMPLES = [
  'url="/admin" && status="200"',
  'url="/api/*" || url="/config/*"',
  'status="200" && url!="/index.html"',
]

interface DirectoriesDataTableProps {
  data: Directory[]
  columns: ColumnDef<Directory>[]
  // Smart filter
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Directory[]) => void
  // Download callback functions
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  onBulkAdd?: () => void
}

export function DirectoriesDataTable({
  data = [],
  columns,
  filterValue,
  onFilterChange,
  isSearching = false,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
  onBulkAdd,
}: DirectoriesDataTableProps) {
  const t = useTranslations("common.status")
  const tActions = useTranslations("common.actions")
  const tDownload = useTranslations("common.download")
  const [selectedRows, setSelectedRows] = React.useState<Directory[]>([])

  // Handle smart filter search
  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  // Handle selection change
  const handleSelectionChange = (rows: Directory[]) => {
    setSelectedRows(rows)
    onSelectionChange?.(rows)
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
      onSearch={handleSmartSearch}
      isSearching={isSearching}
      filterFields={DIRECTORY_FILTER_FIELDS}
      filterExamples={DIRECTORY_FILTER_EXAMPLES}
      // Selection
      onSelectionChange={handleSelectionChange}
      // Bulk operations
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      showAddButton={false}
      // Bulk add button
      onBulkAdd={onBulkAdd}
      bulkAddLabel={tActions("add")}
      // Download
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // Empty state
      emptyMessage={t("noData")}
    />
  )
}
