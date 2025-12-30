"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Zap, Settings, ChevronRight, ChevronLeft, Loader2, AlertCircle } from "lucide-react"
import { getEngines } from "@/services/engine.service"
import { quickScan } from "@/services/scan.service"
import { CAPABILITY_CONFIG, getEngineIcon, parseEngineCapabilities } from "@/lib/engine-config"
import { TargetValidator } from "@/lib/target-validator"
import type { ScanEngine } from "@/types/engine.types"

const STEP_TITLES_KEYS = ["steps.enterTargets", "steps.selectEngine", "steps.confirmScan"]

interface QuickScanDialogProps {
  trigger?: React.ReactNode
}

export function QuickScanDialog({ trigger }: QuickScanDialogProps) {
  const t = useTranslations("quickScan")
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const [targetInput, setTargetInput] = React.useState("")
  const [selectedEngineId, setSelectedEngineId] = React.useState<string>("")
  const [engines, setEngines] = React.useState<ScanEngine[]>([])
  
  const lineNumbersRef = React.useRef<HTMLDivElement | null>(null)
  
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }
  
  const validationResults = React.useMemo(() => {
    const lines = targetInput.split('\n')
    return TargetValidator.validateInputBatch(lines)
  }, [targetInput])
  
  const validInputs = validationResults.filter(r => r.isValid && !r.isEmptyLine)
  const invalidInputs = validationResults.filter(r => !r.isValid)
  const hasErrors = invalidInputs.length > 0
  
  React.useEffect(() => {
    if (open && step === 2 && engines.length === 0) {
      setIsLoading(true)
      getEngines()
        .then(setEngines)
        .catch(() => toast.error(t("toast.getEnginesFailed")))
        .finally(() => setIsLoading(false))
    }
  }, [open, step, engines.length, t])
  
  const resetForm = () => {
    setStep(1)
    setTargetInput("")
    setSelectedEngineId("")
  }
  
  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) resetForm()
  }
  
  const handleNext = () => {
    if (step === 1) {
      if (validInputs.length === 0) {
        toast.error(t("toast.noValidTarget"))
        return
      }
      if (hasErrors) {
        toast.error(t("toast.hasInvalidInputs", { count: invalidInputs.length }))
        return
      }
    }
    if (step === 2 && !selectedEngineId) {
      toast.error(t("toast.selectEngine"))
      return
    }
    setStep(step + 1)
  }
  
  const handlePrev = () => setStep(step - 1)
  
  const handleSubmit = async () => {
    const targets = validInputs.map(r => r.originalInput)
    if (targets.length === 0) return
    
    setIsSubmitting(true)
    try {
      const response = await quickScan({
        targets: targets.map(name => ({ name })),
        engineId: Number(selectedEngineId),
      })
      
      // 后端返回 201 说明成功创建扫描任务
      const { targetStats, scans, count } = response
      const scanCount = scans?.length || count || 0
      
      toast.success(t("toast.createSuccess", { count: scanCount }), {
        description: targetStats.failed > 0 
          ? t("toast.createSuccessDesc", { created: targetStats.created, failed: targetStats.failed })
          : undefined
      })
      handleClose(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.error || t("toast.createFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const selectedEngine = engines.find(e => String(e.id) === selectedEngineId)
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="relative group">
            {/* Border glow effect */}
            <div className="absolute -inset-[1px] rounded-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-border-flow" />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 relative bg-background border-primary/20"
            >
              <Zap className="h-4 w-4 text-primary" />
              {t("title")}
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-[900px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t("title")}
            <span className="text-muted-foreground font-normal text-sm ml-2">
              {t("step", { current: step, total: 3, title: t(STEP_TITLES_KEYS[step - 1]) })}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="h-[380px]">
          {/* Step 1: Enter targets */}
          {step === 1 && (
            <div className="flex flex-col h-full">
              <div className="flex-1 flex overflow-hidden border-t">
                <div className="flex-shrink-0 w-12 border-r bg-muted/30">
                  <div 
                    ref={lineNumbersRef}
                    className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.5] h-full overflow-y-auto scrollbar-hide"
                  >
                    {Array.from({ length: Math.max(targetInput.split('\n').length, 20) }, (_, i) => (
                      <div key={i + 1} className="h-[21px]">{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Textarea
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={t("targetPlaceholder")}
                    className="font-mono h-full overflow-y-auto resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 px-4"
                    style={{ lineHeight: '21px' }}
                    autoFocus
                  />
                </div>
              </div>
              {hasErrors && (
                <div className="px-4 py-2 border-t bg-destructive/5 max-h-[60px] overflow-y-auto">
                  {invalidInputs.slice(0, 3).map((r) => (
                    <div key={r.lineNumber} className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{t("lineError", { lineNumber: r.lineNumber, error: r.error || "" })}</span>
                    </div>
                  ))}
                  {invalidInputs.length > 3 && (
                    <div className="text-xs text-muted-foreground">{t("moreErrors", { count: invalidInputs.length - 3 })}</div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Select engine */}
          {step === 2 && (
            <div className="flex h-full">
              <div className="w-[260px] border-r flex flex-col shrink-0">
                <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                  <h3 className="text-sm font-medium">{t("selectEngine")}</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : engines.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">{t("noEngines")}</div>
                  ) : (
                    <RadioGroup
                      value={selectedEngineId}
                      onValueChange={setSelectedEngineId}
                      disabled={isSubmitting}
                      className="p-2 space-y-1"
                    >
                      {engines.map((engine) => {
                        const capabilities = parseEngineCapabilities(engine.configuration || '')
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
                            <RadioGroupItem value={engine.id.toString()} id={`engine-${engine.id}`} className="sr-only" />
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-md shrink-0", iconConfig?.color || "bg-muted text-muted-foreground")}>
                              <EngineIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{engine.name}</div>
                              <div className="text-xs text-muted-foreground">{capabilities.length > 0 ? t("capabilities", { count: capabilities.length }) : t("noConfig")}</div>
                            </div>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </label>
                        )
                      })}
                    </RadioGroup>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedEngine ? (
                  <>
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium truncate">{selectedEngine.name}</h3>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                      {(() => {
                        const caps = parseEngineCapabilities(selectedEngine.configuration || '')
                        return caps.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {caps.map((capKey) => {
                              const config = CAPABILITY_CONFIG[capKey]
                              return (
                                <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                                  {config?.label || capKey}
                                </Badge>
                              )
                            })}
                          </div>
                        )
                      })()}
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
                      <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{t("selectEngineHint")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="flex h-full">
              <div className="w-[260px] border-r flex flex-col shrink-0">
                <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                  <h3 className="text-sm font-medium">{t("scanTargets")}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {validInputs.map((r, idx) => (
                      <div key={idx} className="font-mono text-xs truncate">{r.originalInput}</div>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
                  {t("totalTargets", { count: validInputs.length })}
                </div>
              </div>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium truncate">{selectedEngine?.name}</h3>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                  {(() => {
                    const caps = parseEngineCapabilities(selectedEngine?.configuration || '')
                    return caps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {caps.map((capKey) => {
                          const config = CAPABILITY_CONFIG[capKey]
                          return (
                            <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                              {config?.label || capKey}
                            </Badge>
                          )
                        })}
                      </div>
                    )
                  })()}
                  <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden min-h-0">
                    <pre className="h-full p-3 text-xs font-mono overflow-auto whitespace-pre-wrap break-all">
                      {selectedEngine?.configuration || `# ${t("noConfig")}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {step === 1 && (
              <>
                {t("supportedFormats")}
                {validInputs.length > 0 && (
                  <span className="text-primary font-medium ml-2">{t("validTargets", { count: validInputs.length })}</span>
                )}
                {hasErrors && (
                  <span className="text-destructive ml-2">{t("invalidTargets", { count: invalidInputs.length })}</span>
                )}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={step === 1} className={cn(step === 1 && "invisible")}>
              <ChevronLeft className="h-4 w-4" />
              {t("previous")}
            </Button>
            {step < 3 ? (
              <Button size="sm" onClick={handleNext}>
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    {t("startScan")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
