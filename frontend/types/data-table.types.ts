import type { ColumnDef, SortingState, VisibilityState, Table, Header, Column, RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"

/**
 * Extend TanStack Table's ColumnMeta type
 * Used to store column metadata such as title
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Column title, used for column header and column visibility control */
    title?: string
  }
}

/**
 * Pagination state
 */
export interface PaginationState {
  pageIndex: number
  pageSize: number
}

/**
 * Server-side pagination info
 */
export interface PaginationInfo {
  total: number
  totalPages: number
  page: number
  pageSize: number
}

/**
 * Filter field definition
 * Note: description is required, consistent with SmartFilterInput component
 */
export interface FilterField {
  key: string
  label: string
  description: string
}

/**
 * Download option
 */
export interface DownloadOption {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean | ((selectedCount: number) => boolean)
}

/**
 * Delete confirmation dialog configuration
 */
export interface DeleteConfirmationConfig {
  title?: string
  description?: string | ((count: number) => string)
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Unified data table component props
 */
export interface UnifiedDataTableProps<TData> {
  // Core data
  data: TData[]
  columns: ColumnDef<TData, any>[]
  getRowId?: (row: TData) => string
  
  // Pagination
  pagination?: PaginationState
  setPagination?: React.Dispatch<React.SetStateAction<PaginationState>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: PaginationState) => void
  hidePagination?: boolean
  pageSizeOptions?: number[]
  
  // Toolbar
  hideToolbar?: boolean
  toolbarLeft?: ReactNode
  toolbarRight?: ReactNode
  
  // Search/Filter
  searchMode?: 'simple' | 'smart'
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  filterFields?: FilterField[]
  filterExamples?: string[]
  
  // Selection
  enableRowSelection?: boolean
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (selection: Record<string, boolean>) => void
  onSelectionChange?: (selectedRows: TData[]) => void
  
  // Bulk operations
  onBulkDelete?: () => void
  bulkDeleteLabel?: string
  showBulkDelete?: boolean
  
  // Add operation
  onAddNew?: () => void
  onAddHover?: () => void
  addButtonLabel?: string
  showAddButton?: boolean
  
  // Bulk add operation
  onBulkAdd?: () => void
  bulkAddLabel?: string
  showBulkAdd?: boolean
  
  // Download operations
  downloadOptions?: DownloadOption[]
  
  // Column control
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  
  // Sorting
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  defaultSorting?: SortingState
  
  // Empty state
  emptyMessage?: string
  emptyComponent?: ReactNode
  
  // Confirmation dialog
  deleteConfirmation?: DeleteConfirmationConfig
  
  // Styling
  className?: string
  tableClassName?: string
  
  // Auto column sizing
  /** Enable automatic column width calculation based on content */
  enableAutoColumnSizing?: boolean
}

/**
 * Toolbar component props
 */
export interface DataTableToolbarProps {
  // Search
  searchMode?: 'simple' | 'smart'
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  filterFields?: FilterField[]
  filterExamples?: string[]
  
  // Left side custom content
  leftContent?: ReactNode
  
  // Right side actions
  children?: ReactNode
  
  // Styling
  className?: string
}

/**
 * Pagination component props
 */
export interface DataTablePaginationProps<TData> {
  table: Table<TData>
  paginationInfo?: PaginationInfo
  pageSizeOptions?: number[]
  onPaginationChange?: (pagination: PaginationState) => void
  className?: string
}

/**
 * Column header component props
 */
export interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

/**
 * Column resizer component props
 */
export interface ColumnResizerProps<TData> {
  header: Header<TData, unknown>
  className?: string
}
