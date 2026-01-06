"use client"

import * as React from "react"
import { IconSearch, IconLoader2, IconPlus } from "@tabler/icons-react"
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
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
}

/**
 * 目标数据表格组件 (organization 版本)
 * 使用 UnifiedDataTable 统一组件
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
  setPagination: setExternalPagination,
  paginationInfo,
  onPaginationChange,
}: TargetsDataTableProps) {
  const t = useTranslations("common.status")
  const tTarget = useTranslations("target")
  
  // 本地搜索输入状态
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue || "")

  React.useEffect(() => {
    setLocalSearchValue(searchValue || "")
  }, [searchValue])

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(localSearchValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit()
    }
  }

  // 自定义添加按钮（支持 onAddHover）
  const addButton = onAddNew ? (
    <Button onClick={onAddNew} onMouseEnter={onAddHover} size="sm">
      <IconPlus className="h-4 w-4" />
      {addButtonText || tTarget("createTarget")}
    </Button>
  ) : undefined

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={externalPagination}
      setPagination={setExternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      showBulkDelete={false}
      showAddButton={false}
      // 空状态
      emptyMessage={t("noData")}
      // 自定义工具栏
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
      toolbarRight={addButton}
    />
  )
}
