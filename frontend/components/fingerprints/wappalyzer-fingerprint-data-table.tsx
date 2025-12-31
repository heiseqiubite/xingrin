"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import {
  IconChevronDown,
  IconTrash,
  IconDownload,
  IconUpload,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { WappalyzerFingerprint } from "@/types/fingerprint.types"
import type { PaginationInfo } from "@/types/common.types"

const WAPPALYZER_FILTER_EXAMPLES = [
  'name="WordPress"',
  'name=="React"',
  'website="wordpress.org"',
  'cpe="wordpress"',
]

interface WappalyzerFingerprintDataTableProps {
  data: WappalyzerFingerprint[]
  columns: ColumnDef<WappalyzerFingerprint>[]
  onSelectionChange?: (selectedRows: WappalyzerFingerprint[]) => void
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  onAddSingle?: () => void
  onAddImport?: () => void
  onExport?: () => void
  onBulkDelete?: () => void
  onDeleteAll?: () => void
  totalCount?: number
  pagination?: { pageIndex: number; pageSize: number }
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
}

export function WappalyzerFingerprintDataTable({
  data = [],
  columns,
  onSelectionChange,
  filterValue,
  onFilterChange,
  isSearching = false,
  onAddSingle,
  onAddImport,
  onExport,
  onBulkDelete,
  onDeleteAll,
  totalCount = 0,
  pagination: externalPagination,
  paginationInfo,
  onPaginationChange,
}: WappalyzerFingerprintDataTableProps) {
  const t = useTranslations("tools.fingerprints")
  const tCommon = useTranslations("common.actions")
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = React.useState(false)

  // Wappalyzer filter field configuration (using translations)
  const wappalyzerFilterFields: FilterField[] = React.useMemo(() => [
    { key: "name", label: "Name", description: t("filter.wappalyzer.name") },
    { key: "website", label: "Website", description: t("filter.wappalyzer.website") },
    { key: "cpe", label: "CPE", description: t("filter.wappalyzer.cpe") },
  ], [t])

  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  const handleSelectionChange = (rows: WappalyzerFingerprint[]) => {
    setSelectedCount(rows.length)
    onSelectionChange?.(rows)
  }

  // Custom toolbar right-side buttons
  const toolbarRightContent = (
    <>
      {/* Operations menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <IconSettings className="h-4 w-4" />
            {t("actions.operations")}
            <IconChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onExport && (
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <IconDownload className="h-4 w-4" />
              {t("actions.exportAll")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onBulkDelete && (
            <DropdownMenuItem 
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={selectedCount === 0}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash className="h-4 w-4" />
              {t("actions.deleteSelected")} ({selectedCount})
            </DropdownMenuItem>
          )}
          {onDeleteAll && (
            <DropdownMenuItem 
              onClick={() => setDeleteAllDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash className="h-4 w-4" />
              {t("actions.deleteAll")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add fingerprint */}
      {(onAddSingle || onAddImport) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <IconPlus className="h-4 w-4" />
              {t("actions.addFingerprint")}
              <IconChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onAddSingle && (
              <DropdownMenuItem onClick={onAddSingle}>
                <IconPlus className="h-4 w-4" />
                {t("actions.addSingle")}
              </DropdownMenuItem>
            )}
            {onAddImport && (
              <DropdownMenuItem onClick={onAddImport}>
                <IconUpload className="h-4 w-4" />
                {t("actions.importFile")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )

  return (
    <>
      <UnifiedDataTable
        data={data}
        columns={columns}
        getRowId={(row) => String(row.id)}
        // Pagination
        pagination={externalPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={onPaginationChange}
        // Smart filter
        searchMode="smart"
        searchValue={filterValue}
        onSearch={handleSmartSearch}
        isSearching={isSearching}
        filterFields={wappalyzerFilterFields}
        filterExamples={WAPPALYZER_FILTER_EXAMPLES}
        // Selection
        onSelectionChange={handleSelectionChange}
        // Bulk operations - use custom buttons
        showBulkDelete={false}
        showAddButton={false}
        // Empty state
        emptyMessage="No results"
        // Custom toolbar buttons
        toolbarRight={toolbarRightContent}
      />

      {/* Export confirmation dialog */}
      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.exportTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.exportDesc", { count: totalCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onExport?.(); setExportDialogOpen(false); }}>
              {t("dialogs.confirmExport")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete selected confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.deleteSelectedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.deleteSelectedDesc", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { onBulkDelete?.(); setBulkDeleteDialogOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dialogs.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all confirmation dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.deleteAllDesc", { count: totalCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { onDeleteAll?.(); setDeleteAllDialogOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dialogs.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
