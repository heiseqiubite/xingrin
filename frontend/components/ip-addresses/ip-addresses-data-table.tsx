"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { UnifiedDataTable } from "@/components/ui/data-table"
import { PREDEFINED_FIELDS, type FilterField } from "@/components/common/smart-filter-input"
import type { IPAddress } from "@/types/ip-address.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// IP address page filter field configuration
const IP_ADDRESS_FILTER_FIELDS: FilterField[] = [
  PREDEFINED_FIELDS.ip,
  PREDEFINED_FIELDS.port,
  PREDEFINED_FIELDS.host,
]

// IP address page filter examples
const IP_ADDRESS_FILTER_EXAMPLES = [
  'ip="192.168.1.*" && port="80"',
  'port="443" || port="8443"',
  'host="api.example.com" && port!="22"',
]

interface IPAddressesDataTableProps {
  data: IPAddress[]
  columns: ColumnDef<IPAddress>[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: IPAddress[]) => void
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
}

export function IPAddressesDataTable({
  data = [],
  columns,
  filterValue = "",
  onFilterChange,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
}: IPAddressesDataTableProps) {
  const t = useTranslations("common.status")
  const tDownload = useTranslations("common.download")
  
  // Smart search handler
  const handleSmartSearch = (rawQuery: string) => {
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
      getRowId={(row) => row.ip}
      // Pagination
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // Smart filter
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      filterFields={IP_ADDRESS_FILTER_FIELDS}
      filterExamples={IP_ADDRESS_FILTER_EXAMPLES}
      // Selection
      onSelectionChange={onSelectionChange}
      // Bulk operations
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      showAddButton={false}
      // Download
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // Empty state
      emptyMessage={t("noData")}
    />
  )
}
