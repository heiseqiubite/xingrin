"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
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
import { calculateColumnWidths } from "@/lib/table-utils"
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
 * Unified data table component
 * 
 * Features:
 * - Generic support, type safety
 * - Row selection, sorting, column visibility, column resizing
 * - Client/server-side pagination
 * - Simple search/smart filtering
 * - Bulk operations, download functionality
 * - Confirmation dialogs
 */
export function UnifiedDataTable<TData>({
  // Core data
  data,
  columns,
  getRowId = (row) => String((row as { id?: string | number }).id ?? ''),
  
  // Pagination
  pagination: externalPagination,
  setPagination: setExternalPagination,
  paginationInfo,
  onPaginationChange,
  hidePagination = false,
  pageSizeOptions,
  
  // Toolbar
  hideToolbar = false,
  toolbarLeft,
  toolbarRight,
  
  // Search/Filter
  searchMode = 'simple',
  searchPlaceholder,
  searchValue,
  onSearch,
  isSearching,
  filterFields,
  filterExamples,
  
  // Selection
  enableRowSelection = true,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  onSelectionChange,
  
  // Bulk operations
  onBulkDelete,
  bulkDeleteLabel = "Delete",
  showBulkDelete = true,
  
  // Add operation
  onAddNew,
  onAddHover,
  addButtonLabel = "Add",
  showAddButton = true,
  
  // Bulk add operation
  onBulkAdd,
  bulkAddLabel = "Bulk Add",
  showBulkAdd = true,
  
  // Download operation
  downloadOptions,
  
  // Column control
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  
  // Sorting
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  defaultSorting = [],
  
  // Empty state
  emptyMessage = "No results",
  emptyComponent,
  
  // Confirmation dialog
  deleteConfirmation,
  
  // Styles
  className,
  tableClassName,
  
  // Auto column sizing
  enableAutoColumnSizing = false,
}: UnifiedDataTableProps<TData>) {
  const tActions = useTranslations("common.actions")
  const locale = useLocale()
  
  // Internal state
  const [internalRowSelection, setInternalRowSelection] = React.useState<Record<string, boolean>>({})
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({})
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(defaultSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [autoSizingCalculated, setAutoSizingCalculated] = React.useState(false)
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  // Use external state or internal state
  const rowSelection = externalRowSelection ?? internalRowSelection
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility
  const sorting = externalSorting ?? internalSorting
  
  // Determine whether to use external pagination control
  const isExternalPagination = !!(externalPagination && (onPaginationChange || setExternalPagination))
  const pagination = externalPagination ?? internalPagination
  
  // Use ref to store the latest pagination value to avoid closure issues
  const paginationRef = React.useRef(pagination)
  paginationRef.current = pagination
  
  // Pagination update handler
  const handlePaginationChange = React.useCallback((updater: Updater<PaginationState>) => {
    const currentPagination = paginationRef.current
    const newPagination = typeof updater === 'function' ? updater(currentPagination) : updater
    
    // No change in value, don't update
    if (newPagination.pageIndex === currentPagination.pageIndex && 
        newPagination.pageSize === currentPagination.pageSize) {
      return
    }
    
    if (isExternalPagination) {
      // External pagination control
      if (onPaginationChange) {
        onPaginationChange(newPagination)
      } else if (setExternalPagination) {
        setExternalPagination(newPagination)
      }
    } else {
      // Internal pagination control
      setInternalPagination(newPagination)
    }
  }, [isExternalPagination, onPaginationChange, setExternalPagination])

  // Handle state updates (supports Updater pattern)
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

  // Filter valid data
  const validData = React.useMemo(() => {
    return (data || []).filter(item => item && typeof getRowId(item) !== 'undefined')
  }, [data, getRowId])

  // Auto column sizing: calculate optimal widths based on content
  React.useEffect(() => {
    if (!enableAutoColumnSizing || autoSizingCalculated || validData.length === 0) {
      return
    }
    
    // Build header labels from column meta
    const headerLabels: Record<string, string> = {}
    for (const col of columns) {
      const colDef = col as { accessorKey?: string; id?: string; meta?: { title?: string } }
      const colId = colDef.accessorKey || colDef.id
      if (colId && colDef.meta?.title) {
        headerLabels[colId] = colDef.meta.title
      }
    }
    
    const calculatedWidths = calculateColumnWidths({
      data: validData as Record<string, unknown>[],
      columns: columns as Array<{
        accessorKey?: string
        id?: string
        size?: number
        minSize?: number
        maxSize?: number
      }>,
      headerLabels,
      locale,
    })
    
    if (Object.keys(calculatedWidths).length > 0) {
      setColumnSizing(calculatedWidths)
      setAutoSizingCalculated(true)
    }
  }, [enableAutoColumnSizing, autoSizingCalculated, validData, columns])

  // Create table instance
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
    // Column resizing configuration - following TanStack Table official recommendations
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    // Default column configuration
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
   * Following TanStack Table's official high-performance approach:
   * Calculate all column widths once at the table root element, store as CSS variables
   * Avoid calling column.getSize() on every cell
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

  // Listen for selected row changes
  const prevRowSelectionRef = React.useRef<Record<string, boolean>>({})
  React.useEffect(() => {
    if (onSelectionChange) {
      // Only call when rowSelection actually changes
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

  // Get selected row count
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  // Handle delete confirmation
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

  // Get column label - only use meta.title, force developers to explicitly define
  const getColumnLabel = (column: { id: string; columnDef: { meta?: { title?: string } } }) => {
    // Only use meta.title, return column.id if not defined (to help discover omissions)
    return column.columnDef.meta?.title ?? column.id
  }

  // Render download button
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
            {tActions("download")}
            <IconChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
      {/* Toolbar */}
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
          {/* Column visibility control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="h-4 w-4" />
                Columns
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

          {/* Download button */}
          {renderDownloadButton()}

          {/* Bulk delete button */}
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

          {/* Add button */}
          {showAddButton && onAddNew && (
            <Button onClick={onAddNew} onMouseEnter={onAddHover} size="sm">
              <IconPlus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          )}

          {/* Bulk add button */}
          {showBulkAdd && onBulkAdd && (
            <Button onClick={onBulkAdd} size="sm" variant="outline">
              <IconPlus className="h-4 w-4" />
              {bulkAddLabel}
            </Button>
          )}
        </DataTableToolbar>
      )}

      {/* Table - Following TanStack Table official recommendations using CSS variables */}
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

      {/* Pagination */}
      {!hidePagination && (
        <DataTablePagination
          table={table}
          paginationInfo={paginationInfo}
          pageSizeOptions={pageSizeOptions}
        />
      )}

      {/* Delete confirmation dialog */}
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
