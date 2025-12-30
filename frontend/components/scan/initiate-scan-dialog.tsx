"use client"

import React, { useState, useMemo } from "react"
import { Play, Settings2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { LoadingSpinner } from "@/components/loading-spinner"
import { cn } from "@/lib/utils"
import { CAPABILITY_CONFIG, getEngineIcon, parseEngineCapabilities } from "@/lib/engine-config"

import type { Organization } from "@/types/organization.types"

import { initiateScan } from "@/services/scan.service"
import { toast } from "sonner"
import { useEngines } from "@/hooks/use-engines"

interface InitiateScanDialogProps {
  organization?: Organization | null
  organizationId?: number
  targetId?: number
  targetName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InitiateScanDialog({
  organization,
  organizationId,
  targetId,
  targetName,
  open,
  onOpenChange,
  onSuccess,
}: InitiateScanDialogProps) {
  const t = useTranslations("scan.initiate")
  const tToast = useTranslations("toast")
  const tCommon = useTranslations("common.actions")
  const [selectedEngineId, setSelectedEngineId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: engines, isLoading, error } = useEngines()

  const selectedEngine = useMemo(() => {
    if (!selectedEngineId || !engines) return null
    return engines.find((e) => e.id.toString() === selectedEngineId) || null
  }, [selectedEngineId, engines])

  const selectedCapabilities = useMemo(() => {
    if (!selectedEngine) return []
    return parseEngineCapabilities(selectedEngine.configuration || "")
  }, [selectedEngine])

  const handleInitiate = async () => {
    if (!selectedEngineId) return
    if (!organizationId && !targetId) {
      toast.error(tToast("paramError"), { description: tToast("paramErrorDesc") })
      return
    }
    setIsSubmitting(true)
    try {
      const response = await initiateScan({
        organizationId,
        targetId,
        engineId: Number(selectedEngineId),
      })
      
      // 后端返回 201 说明成功创建扫描任务
      const scanCount = response.scans?.length || response.count || 0
      toast.success(tToast("scanInitiated"), {
        description: response.message || tToast("scanInitiatedDesc", { count: scanCount }),
      })
      onSuccess?.()
      onOpenChange(false)
      setSelectedEngineId("")
    } catch (err) {
      console.error("Failed to initiate scan:", err)
      toast.error(tToast("initiateScanFailed"), {
        description: err instanceof Error ? err.message : tToast("unknownError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen)
      if (!newOpen) setSelectedEngineId("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[900px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {targetName ? (
              <>
                {t("targetDesc")} <span className="font-semibold text-foreground">{targetName}</span> {t("selectEngine")}
              </>
            ) : (
              <>
                {t("orgDesc")} <span className="font-semibold text-foreground">{organization?.name}</span> {t("selectEngine")}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-t h-[480px]">
          {/* Left side engine list */}
          <div className="w-[260px] border-r flex flex-col shrink-0">
            <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
              <h3 className="text-sm font-medium">{t("selectEngineTitle")}</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                    <span className="ml-2 text-sm text-muted-foreground">{t("loading")}</span>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center text-sm text-destructive">{t("loadFailed")}</div>
                ) : !engines?.length ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">{t("noEngines")}</div>
                ) : (
                  <RadioGroup
                    value={selectedEngineId}
                    onValueChange={setSelectedEngineId}
                    disabled={isSubmitting}
                    className="space-y-1"
                  >
                    {engines.map((engine) => {
                      const capabilities = parseEngineCapabilities(engine.configuration || "")
                      const EngineIcon = getEngineIcon(capabilities)
                      const primaryCap = capabilities[0]
                      const iconConfig = primaryCap ? CAPABILITY_CONFIG[primaryCap] : null
                      const isSelected = selectedEngineId === engine.id.toString()

                      return (
                        <label
                          key={engine.id}
                          htmlFor={`engine-${engine.id}`}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                            isSelected
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                        >
                          <RadioGroupItem
                            value={engine.id.toString()}
                            id={`engine-${engine.id}`}
                            className="sr-only"
                          />
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md shrink-0",
                              iconConfig?.color || "bg-muted text-muted-foreground"
                            )}
                          >
                            <EngineIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{engine.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {capabilities.length > 0 ? t("capabilities", { count: capabilities.length }) : t("noConfig")}
                            </div>
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        </label>
                      )
                    })}
                  </RadioGroup>
                )}
              </div>
            </div>
          </div>

          {/* Right side engine details */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {selectedEngine ? (
              <>
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium truncate">{selectedEngine.name}</h3>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                  {selectedCapabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {selectedCapabilities.map((capKey) => {
                        const config = CAPABILITY_CONFIG[capKey]
                        return (
                          <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                            {config?.label || capKey}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden min-h-0">
                    <pre className="h-full p-3 text-xs font-mono overflow-auto whitespace-pre-wrap break-all">
                      {selectedEngine.configuration || `# ${t("noConfig")}`}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t("selectEngineHint")}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleInitiate} disabled={!selectedEngineId || isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                {t("initiating")}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t("startScan")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
