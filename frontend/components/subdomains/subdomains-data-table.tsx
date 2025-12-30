"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { Subdomain } from "@/types/subdomain.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// Subdomain page filter field configuration
const SUBDOMAIN_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", description: "Subdomain name" },
]

// Subdomain page filter examples
const SUBDOMAIN_FILTER_EXAMPLES = [
  'name="api.example.com"',
  'name="*.test.com"',
]

// Component props type definition
interface SubdomainsDataTableProps {
  data: Subdomain[]
  columns: ColumnDef<Subdomain>[]
  onAddNew?: () => void
  onBulkAdd?: () => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Subdomain[]) => void
  // Smart filter
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  addButtonText?: string
  // Download callback functions
  onDownloadAll?: () => void
  onDownloadInteresting?: () => void
  onDownloadImportant?: () => void
  onDownloadSelected?: () => void
  // Server-side pagination support
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
}

/**
 * Subdomain data table component
 * Uses UnifiedDataTable unified component
 */
export function SubdomainsDataTable({
  data = [],
  columns,
  onAddNew,
  onBulkAdd,
  onBulkDelete,
  onSelectionChange,
  filterValue,
  onFilterChange,
  isSearching = false,
  addButtonText = "Add",
  onDownloadAll,
  onDownloadImportant,
  onDownloadSelected,
  pagination: externalPagination,
  setPagination: setExternalPagination,
  paginationInfo,
  onPaginationChange,
}: SubdomainsDataTableProps) {
  const t = useTranslations("common.status")
  const tActions = useTranslations("common.actions")
  const tDownload = useTranslations("common.download")
  
  // Handle smart filter search
  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
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
  if (onDownloadImportant) {
    downloadOptions.push({
      key: "important",
      label: tDownload("important"),
      onClick: onDownloadImportant,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // Pagination
      pagination={externalPagination}
      setPagination={setExternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // Smart filter
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      isSearching={isSearching}
      filterFields={SUBDOMAIN_FILTER_FIELDS}
      filterExamples={SUBDOMAIN_FILTER_EXAMPLES}
      // Selection
      onSelectionChange={onSelectionChange}
      // Bulk operations
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      // Add button
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
