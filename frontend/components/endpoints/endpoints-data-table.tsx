"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { DownloadOption, PaginationState } from "@/types/data-table.types"
import type { PaginationInfo } from "@/types/common.types"

// Endpoint page filter field configuration
const ENDPOINT_FILTER_FIELDS: FilterField[] = [
  { key: "url", label: "URL", description: "Endpoint URL" },
  { key: "host", label: "Host", description: "Hostname" },
  { key: "title", label: "Title", description: "Page title" },
  { key: "status", label: "Status", description: "HTTP status code" },
]

// Endpoint page filter examples
const ENDPOINT_FILTER_EXAMPLES = [
  'url="/api/*" && status="200"',
  'host="api.example.com" || host="admin.example.com"',
  'title="Dashboard" && status!="404"',
]

interface EndpointsDataTableProps<TData extends { id: number | string }, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  // Smart filter
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  onAddNew?: () => void
  addButtonText?: string
  onSelectionChange?: (selectedRows: TData[]) => void
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  totalCount?: number
  totalPages?: number
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  onBulkAdd?: () => void
}

export function EndpointsDataTable<TData extends { id: number | string }, TValue>({
  columns,
  data,
  filterValue,
  onFilterChange,
  isSearching = false,
  onAddNew,
  addButtonText = "Add",
  onSelectionChange,
  pagination: externalPagination,
  onPaginationChange,
  totalCount,
  totalPages,
  onDownloadAll,
  onDownloadSelected,
  onBulkAdd,
}: EndpointsDataTableProps<TData, TValue>) {
  const t = useTranslations("common.status")
  const tActions = useTranslations("common.actions")
  const tDownload = useTranslations("common.download")
  
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const pagination = externalPagination || internalPagination

  // Handle smart filter search
  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  // Handle pagination change
  const handlePaginationChange = (newPagination: PaginationState) => {
    if (onPaginationChange) {
      onPaginationChange(newPagination)
    } else {
      setInternalPagination(newPagination)
    }
  }

  // Build paginationInfo
  const paginationInfo: PaginationInfo | undefined = externalPagination && totalCount ? {
    total: totalCount,
    totalPages: totalPages || Math.ceil(totalCount / pagination.pageSize),
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  } : undefined

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
      columns={columns as ColumnDef<TData>[]}
      getRowId={(row) => String(row.id)}
      // Pagination
      pagination={pagination}
      setPagination={onPaginationChange ? undefined : setInternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={handlePaginationChange}
      // Smart filter
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      isSearching={isSearching}
      filterFields={ENDPOINT_FILTER_FIELDS}
      filterExamples={ENDPOINT_FILTER_EXAMPLES}
      // Selection
      onSelectionChange={onSelectionChange}
      // Bulk operations
      showBulkDelete={false}
      onAddNew={onAddNew}
      addButtonLabel={addButtonText}
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
