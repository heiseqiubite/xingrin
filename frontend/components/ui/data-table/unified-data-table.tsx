"use client"

import * as React from "react"
import {
  ColumnFiltersState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  Updater,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconLayoutColumns,
  IconPlus,
  IconTrash,
  IconDownload,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

import { DataTableToolbar } from "./toolbar"
import { DataTablePagination } from "./pagination"
import { ColumnResizer } from "./column-resizer"
import type {
  UnifiedDataTableProps,
  PaginationState,
} from "@/types/data-table.types"

/**
 * 统一数据表格组件
 * 
 * 特性：
 * - 泛型支持，类型安全
 * - 行选择、排序、列可见性、列宽调整
 * - 客户端/服务端分页
 * - 简单搜索/智能过滤
 * - 批量操作、下载功能
 * - 确认对话框
 */
export function UnifiedDataTable<TData>({
  // 核心数据
  data,
  columns,
  getRowId = (row) => String((row as { id?: string | number }).id ?? ''),
  
  // 分页
  pagination: externalPagination,
  setPagination: setExternalPagination,
  paginationInfo,
  onPaginationChange,
  hidePagination = false,
  pageSizeOptions,
  
  // 工具栏
  hideToolbar = false,
  toolbarLeft,
  toolbarRight,
  
  // 搜索/过滤
  searchMode = 'simple',
  searchPlaceholder,
  searchValue,
  onSearch,
  isSearching,
  filterFields,
  filterExamples,
  
  // 选择
  enableRowSelection = true,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  onSelectionChange,
  
  // 批量操作
  onBulkDelete,
  bulkDeleteLabel = "Delete",
  showBulkDelete = true,
  
  // 添加操作
  onAddNew,
  onAddHover,
  addButtonLabel = "Add",
  showAddButton = true,
  
  // 批量添加操作
  onBulkAdd,
  bulkAddLabel = "批量添加",
  showBulkAdd = true,
  
  // 下载操作
  downloadOptions,
  
  // 列控制
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  
  // 排序
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  defaultSorting = [],
  
  // 空状态
  emptyMessage = "No results",
  emptyComponent,
  
  // 确认对话框
  deleteConfirmation,
  
  // 样式
  className,
  tableClassName,
}: UnifiedDataTableProps<TData>) {
  // 内部状态
  const [internalRowSelection, setInternalRowSelection] = React.useState<Record<string, boolean>>({})
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({})
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(defaultSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  
  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  // 使用外部状态或内部状态
  const rowSelection = externalRowSelection ?? internalRowSelection
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility
  const sorting = externalSorting ?? internalSorting
  
  // 判断是否使用外部分页控制
  const isExternalPagination = !!(externalPagination && (onPaginationChange || setExternalPagination))
  const pagination = externalPagination ?? internalPagination
  
  // 使用 ref 存储最新的 pagination 值，避免闭包问题
  const paginationRef = React.useRef(pagination)
  paginationRef.current = pagination
  
  // 分页更新处理器
  const handlePaginationChange = React.useCallback((updater: Updater<PaginationState>) => {
    const currentPagination = paginationRef.current
    const newPagination = typeof updater === 'function' ? updater(currentPagination) : updater
    
    // 值没有变化，不更新
    if (newPagination.pageIndex === currentPagination.pageIndex && 
        newPagination.pageSize === currentPagination.pageSize) {
      return
    }
    
    if (isExternalPagination) {
      // 外部控制分页
      if (onPaginationChange) {
        onPaginationChange(newPagination)
      } else if (setExternalPagination) {
        setExternalPagination(newPagination)
      }
    } else {
      // 内部控制分页
      setInternalPagination(newPagination)
    }
  }, [isExternalPagination, onPaginationChange, setExternalPagination])

  // 处理状态更新（支持 Updater 模式）
  const handleRowSelectionChange = (updater: Updater<Record<string, boolean>>) => {
    const newValue = typeof updater === 'function' ? updater(rowSelection) : updater
    if (externalOnRowSelectionChange) {
      externalOnRowSelectionChange(newValue)
    } else {
      setInternalRowSelection(newValue)
    }
  }

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newValue = typeof updater === 'function' ? updater(sorting) : updater
    if (externalOnSortingChange) {
      externalOnSortingChange(newValue)
    } else {
      setInternalSorting(newValue)
    }
  }

  const handleColumnVisibilityChange = (updater: Updater<VisibilityState>) => {
    const newValue = typeof updater === 'function' ? updater(columnVisibility) : updater
    if (externalOnColumnVisibilityChange) {
      externalOnColumnVisibilityChange(newValue)
    } else {
      setInternalColumnVisibility(newValue)
    }
  }

  // 过滤有效数据
  const validData = React.useMemo(() => {
    return (data || []).filter(item => item && typeof getRowId(item) !== 'undefined')
  }, [data, getRowId])

  // 创建表格实例
  const table = useReactTable({
    data: validData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      columnSizing,
    },
    // 列宽调整配置 - 按照 TanStack Table 官方推荐
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    // 默认列配置
    defaultColumn: {
      minSize: 50,
      maxSize: 1000,
    },
    pageCount: paginationInfo?.totalPages ?? -1,
    manualPagination: !!paginationInfo,
    getRowId,
    enableRowSelection,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  /**
   * 按照 TanStack Table 官方推荐的高性能方案：
   * 在表格根元素一次性计算所有列宽，存为 CSS 变量
   * 避免在每个单元格上调用 column.getSize()
   */
  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: Record<string, number> = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  // 监听选中行变化
  const prevRowSelectionRef = React.useRef<Record<string, boolean>>({})
  React.useEffect(() => {
    if (onSelectionChange) {
      // 只在 rowSelection 实际变化时才调用
      const prevSelection = prevRowSelectionRef.current
      const selectionChanged = Object.keys(rowSelection).length !== Object.keys(prevSelection).length ||
        Object.keys(rowSelection).some(key => rowSelection[key] !== prevSelection[key])
      
      if (selectionChanged) {
        prevRowSelectionRef.current = rowSelection
        const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
        onSelectionChange(selectedRows)
      }
    }
  }, [rowSelection, onSelectionChange, table])

  // 获取选中行数量
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  // 处理删除确认
  const handleDeleteClick = () => {
    if (deleteConfirmation) {
      setDeleteDialogOpen(true)
    } else {
      onBulkDelete?.()
    }
  }

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false)
    onBulkDelete?.()
  }

  // 获取列标签 - 仅使用 meta.title，强制开发者显式定义
  const getColumnLabel = (column: { id: string; columnDef: { meta?: { title?: string } } }) => {
    // 只使用 meta.title，如果没有定义则返回 column.id（便于发现遗漏）
    return column.columnDef.meta?.title ?? column.id
  }

  // 渲染下载按钮
  const renderDownloadButton = () => {
    if (!downloadOptions || downloadOptions.length === 0) return null

    if (downloadOptions.length === 1) {
      const option = downloadOptions[0]
      const isDisabled = typeof option.disabled === 'function' 
        ? option.disabled(selectedCount) 
        : option.disabled
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={option.onClick}
          disabled={isDisabled}
        >
          {option.icon || <IconDownload className="h-4 w-4" />}
          {option.label}
        </Button>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <IconDownload className="h-4 w-4" />
            Download
            <IconChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Download Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {downloadOptions.map((option) => {
            const isDisabled = typeof option.disabled === 'function'
              ? option.disabled(selectedCount)
              : option.disabled
            return (
              <DropdownMenuItem
                key={option.key}
                onClick={option.onClick}
                disabled={isDisabled}
              >
                {option.icon || <IconDownload className="h-4 w-4" />}
                {option.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 工具栏 */}
      {!hideToolbar && (
        <DataTableToolbar
          searchMode={searchMode}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearch={onSearch}
          isSearching={isSearching}
          filterFields={filterFields}
          filterExamples={filterExamples}
          leftContent={toolbarLeft}
        >
          {/* 列显示控制 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="h-4 w-4" />
                列控制
                <IconChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {getColumnLabel(column)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {toolbarRight}

          {/* 下载按钮 */}
          {renderDownloadButton()}

          {/* 批量删除按钮 */}
          {showBulkDelete && onBulkDelete && (
            <Button
              onClick={handleDeleteClick}
              size="sm"
              variant="outline"
              disabled={selectedCount === 0}
              className={
                selectedCount === 0
                  ? "text-muted-foreground"
                  : "text-destructive hover:text-destructive hover:bg-destructive/10"
              }
            >
              <IconTrash className="h-4 w-4" />
              {bulkDeleteLabel}
            </Button>
          )}

          {/* 添加按钮 */}
          {showAddButton && onAddNew && (
            <Button onClick={onAddNew} onMouseEnter={onAddHover} size="sm">
              <IconPlus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          )}

          {/* 批量添加按钮 */}
          {showBulkAdd && onBulkAdd && (
            <Button onClick={onBulkAdd} size="sm" variant="outline">
              <IconPlus className="h-4 w-4" />
              {bulkAddLabel}
            </Button>
          )}
        </DataTableToolbar>
      )}

      {/* 表格 - 按照 TanStack Table 官方推荐使用 CSS 变量 */}
      <div className={cn("rounded-md border overflow-x-auto", tableClassName)}>
        <table 
          className="w-full caption-bottom text-sm"
          style={{ 
            ...columnSizeVars,
            minWidth: table.getTotalSize(),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ 
                      width: `calc(var(--header-${header.id}-size) * 1px)`,
                      minWidth: `calc(var(--header-${header.id}-size) * 1px)`,
                    }}
                    className="relative group"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    <ColumnResizer header={header} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      style={{ 
                        width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                        minWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyComponent || emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      {/* 分页 */}
      {!hidePagination && (
        <DataTablePagination
          table={table}
          paginationInfo={paginationInfo}
          pageSizeOptions={pageSizeOptions}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteConfirmation && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteConfirmation.title || "Confirm Delete"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {typeof deleteConfirmation.description === 'function'
                  ? deleteConfirmation.description(selectedCount)
                  : deleteConfirmation.description || `Are you sure you want to delete ${selectedCount} selected item(s)? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {deleteConfirmation.cancelLabel || "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteConfirmation.confirmLabel || "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
