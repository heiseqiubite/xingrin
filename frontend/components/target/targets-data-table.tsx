"use client"

import * as React from "react"
import { IconSearch, IconLoader2 } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { Target } from "@/types/target.types"
import type { PaginationInfo } from "@/types/common.types"

interface TargetsDataTableProps {
  data: Target[]
  columns: ColumnDef<Target>[]
  onAddNew?: () => void
  onAddHover?: () => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Target[]) => void
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  addButtonText?: string
  // Pagination related props
  pagination?: { pageIndex: number, pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number, pageSize: number }) => void
  totalCount?: number
  manualPagination?: boolean
}

/**
 * Targets data table component (target version)
 * Uses UnifiedDataTable unified component
 */
export function TargetsDataTable({
  data = [],
  columns,
  onAddNew,
  onAddHover,
  onBulkDelete,
  onSelectionChange,
  searchPlaceholder,
  searchValue,
  onSearch,
  isSearching = false,
  addButtonText,
  pagination: externalPagination,
  onPaginationChange,
  totalCount,
  manualPagination = false,
}: TargetsDataTableProps) {
  const t = useTranslations("common.status")
  const tActions = useTranslations("common.actions")
  const tTarget = useTranslations("target")
  
  // Internal pagination state
  const [internalPagination, setInternalPagination] = React.useState<{ pageIndex: number, pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Local search input state
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue ?? "")
  
  React.useEffect(() => {
    setLocalSearchValue(searchValue ?? "")
  }, [searchValue])

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(localSearchValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const pagination = externalPagination || internalPagination

  // Handle pagination state change
  const handlePaginationChange = (newPagination: { pageIndex: number, pageSize: number }) => {
    if (onPaginationChange) {
      onPaginationChange(newPagination)
    } else {
      setInternalPagination(newPagination)
    }
  }

  // Build paginationInfo
  const paginationInfo: PaginationInfo | undefined = manualPagination && totalCount ? {
    total: totalCount,
    totalPages: Math.ceil(totalCount / pagination.pageSize),
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  } : undefined

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // Pagination
      pagination={pagination}
      setPagination={onPaginationChange ? undefined : setInternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={handlePaginationChange}
      // Selection
      onSelectionChange={onSelectionChange}
      // Bulk operations
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel={tActions("delete")}
      // Add button
      onAddNew={onAddNew}
      onAddHover={onAddHover}
      addButtonLabel={addButtonText || tTarget("addTarget")}
      showAddButton={!!onAddNew}
      // Empty state
      emptyMessage={t("noData")}
      // Custom toolbar
      toolbarLeft={
        <div className="flex items-center space-x-2">
          <Input
            placeholder={searchPlaceholder || tTarget("title")}
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 max-w-sm"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit} disabled={isSearching}>
            {isSearching ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconSearch className="h-4 w-4" />
            )}
          </Button>
        </div>
      }
    />
  )
}
