"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconSearch, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { OrganizationDataTableProps } from "@/types/organization.types"

export function OrganizationDataTable({
  data,
  columns,
  onAddNew,
  onBulkDelete,
  onSelectionChange,
  searchPlaceholder,
  searchColumn = "name",
  searchValue,
  onSearch,
  isSearching,
  pagination: externalPagination,
  paginationInfo,
  onPaginationChange,
}: OrganizationDataTableProps) {
  const t = useTranslations("organization")
  const tActions = useTranslations("common.actions")
  // 本地搜索输入状态（只在回车或点击按钮时触发搜索）
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

  // 默认排序
  const defaultSorting = [{ id: "createdAt", desc: true }]

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={externalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel={tActions("delete")}
      onAddNew={onAddNew}
      addButtonLabel={t("addOrganization")}
      // 排序
      defaultSorting={defaultSorting}
      // 空状态
      emptyMessage={t("noResults")}
      // 自定义搜索框
      toolbarLeft={
        <div className="flex items-center space-x-2">
          <Input
            placeholder={searchPlaceholder ?? t("searchPlaceholder")}
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
