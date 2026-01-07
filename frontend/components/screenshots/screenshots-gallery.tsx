"use client"

import React, { useState, useCallback, useMemo } from "react"
import { AlertTriangle, Image as ImageIcon, ExternalLink, Trash2, X, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useTargetScreenshots, useScanScreenshots } from "@/hooks/use-screenshots"
import { ScreenshotService } from "@/services/screenshot.service"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [12, 24, 48]

interface Screenshot {
  id: number
  url: string
  statusCode: number | null
  createdAt: string
}

interface ScreenshotsGalleryProps {
  targetId?: number
  scanId?: number
}

export function ScreenshotsGallery({ targetId, scanId }: ScreenshotsGalleryProps) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 12 })
  const [searchInput, setSearchInput] = useState("")  // 输入框的值
  const [filterQuery, setFilterQuery] = useState("")  // 实际用于查询的值
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const t = useTranslations("pages.screenshots")
  const tCommon = useTranslations("common")
  const tToast = useTranslations("toast")

  // Fetch screenshots
  const targetQuery = useTargetScreenshots(
    targetId || 0,
    { page: pagination.pageIndex + 1, pageSize: pagination.pageSize, filter: filterQuery || undefined },
    { enabled: !!targetId }
  )

  const scanQuery = useScanScreenshots(
    scanId || 0,
    { page: pagination.pageIndex + 1, pageSize: pagination.pageSize, filter: filterQuery || undefined },
    { enabled: !!scanId }
  )

  const activeQuery = targetId ? targetQuery : scanQuery
  const { data, isLoading, error, refetch } = activeQuery

  const screenshots: Screenshot[] = useMemo(() => data?.results || [], [data])
  const totalPages = data?.totalPages || 0

  // Selection handlers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === screenshots.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(screenshots.map(s => s.id)))
    }
  }, [screenshots, selectedIds.size])

  // Delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      const result = await ScreenshotService.bulkDelete(Array.from(selectedIds))
      toast.success(tToast("deleteSuccess", { count: result.deletedCount }))
      setSelectedIds(new Set())
      setDeleteDialogOpen(false)
      refetch()
    } catch (error) {
      console.error("Failed to delete screenshots", error)
      toast.error(tToast("deleteFailed"))
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter handler - 手动触发搜索
  const handleSearch = () => {
    setFilterQuery(searchInput)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  // 回车触发搜索
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value, 10)
    setPagination({ pageIndex: 0, pageSize: newPageSize })
  }

  // Lightbox handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const nextImage = () => {
    setLightboxIndex(prev => (prev + 1) % screenshots.length)
  }

  const prevImage = () => {
    setLightboxIndex(prev => (prev - 1 + screenshots.length) % screenshots.length)
  }

  // Get image URL
  const getImageUrl = (screenshot: Screenshot) => {
    if (scanId) {
      return ScreenshotService.getSnapshotImageUrl(scanId, screenshot.id)
    }
    return ScreenshotService.getImageUrl(screenshot.id)
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tCommon("status.error")}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {t("loadError")}
        </p>
        <Button onClick={() => refetch()}>{tCommon("actions.retry")}</Button>
      </div>
    )
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (screenshots.length === 0 && !filterQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-3 mb-4">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
        <p className="text-muted-foreground text-center">
          {t("empty.description")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("filterPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {targetId && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {tCommon("actions.delete")} ({selectedIds.size})
            </Button>
          )}
          {screenshots.length > 0 && targetId && (
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.size === screenshots.length ? tCommon("actions.deselectAll") : tCommon("actions.selectAll")}
            </Button>
          )}
        </div>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {screenshots.map((screenshot, index) => (
          <div
            key={screenshot.id}
            className={cn(
              "group relative aspect-video rounded-lg overflow-hidden border bg-muted cursor-pointer transition-all",
              selectedIds.has(screenshot.id) && "ring-2 ring-primary"
            )}
          >
            {/* Checkbox */}
            {targetId && (
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleSelect(screenshot.id)
                }}
              >
                <Checkbox
                  checked={selectedIds.has(screenshot.id)}
                  className="bg-background/80 backdrop-blur-sm"
                />
              </div>
            )}

            {/* Image */}
            <img
              src={getImageUrl(screenshot)}
              alt={screenshot.url}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onClick={() => openLightbox(index)}
              loading="lazy"
            />

            {/* Overlay with URL and status code */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <div className="flex items-center gap-2">
                {screenshot.statusCode && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-medium shrink-0",
                    screenshot.statusCode >= 200 && screenshot.statusCode < 300 && "bg-green-500/80 text-white",
                    screenshot.statusCode >= 300 && screenshot.statusCode < 400 && "bg-blue-500/80 text-white",
                    screenshot.statusCode >= 400 && screenshot.statusCode < 500 && "bg-yellow-500/80 text-black",
                    screenshot.statusCode >= 500 && "bg-red-500/80 text-white"
                  )}>
                    {screenshot.statusCode}
                  </span>
                )}
                <p className="text-white text-xs truncate" title={screenshot.url}>
                  {screenshot.url}
                </p>
              </div>
            </div>

            {/* Hover actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={screenshot.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Empty search results */}
      {screenshots.length === 0 && filterQuery && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t("noResults")}</p>
        </div>
      )}

      {/* Pagination */}
      {(totalPages > 1 || (data?.total ?? 0) > 12) && (
        <div className="flex justify-center items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {pagination.pageIndex + 1} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1) }))}
              disabled={pagination.pageIndex >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={String(pagination.pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>{t("lightboxTitle")}</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Navigation */}
            {screenshots.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-8 w-8 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="h-8 w-8 text-white" />
                </button>
              </>
            )}

            {/* Image */}
            {screenshots[lightboxIndex] && (
              <div className="flex flex-col items-center gap-4 p-8">
                <img
                  src={getImageUrl(screenshots[lightboxIndex])}
                  alt={screenshots[lightboxIndex].url}
                  className="max-w-full max-h-[70vh] object-contain"
                />
                <div className="text-white text-center">
                  <p className="text-sm opacity-80">{lightboxIndex + 1} / {screenshots.length}</p>
                  <div className="flex items-center gap-2 justify-center mt-1">
                    {screenshots[lightboxIndex].statusCode && (
                      <span className={cn(
                        "text-sm px-2 py-0.5 rounded font-medium",
                        screenshots[lightboxIndex].statusCode >= 200 && screenshots[lightboxIndex].statusCode < 300 && "bg-green-500 text-white",
                        screenshots[lightboxIndex].statusCode >= 300 && screenshots[lightboxIndex].statusCode < 400 && "bg-blue-500 text-white",
                        screenshots[lightboxIndex].statusCode >= 400 && screenshots[lightboxIndex].statusCode < 500 && "bg-yellow-500 text-black",
                        screenshots[lightboxIndex].statusCode >= 500 && "bg-red-500 text-white"
                      )}>
                        {screenshots[lightboxIndex].statusCode}
                      </span>
                    )}
                    <a
                      href={screenshots[lightboxIndex].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {screenshots[lightboxIndex].url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={tCommon("actions.confirmDelete")}
        description={tCommon("actions.deleteConfirmMessage", { count: selectedIds.size })}
        onConfirm={handleBulkDelete}
        loading={isDeleting}
        variant="destructive"
      />
    </div>
  )
}
