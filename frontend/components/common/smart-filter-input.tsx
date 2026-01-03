"use client"

import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// Available filter field definitions
export interface FilterField {
  key: string
  label: string
  description: string
}

// Predefined field configurations, pages can choose to use
export const PREDEFINED_FIELDS: Record<string, FilterField> = {
  ip: { key: "ip", label: "IP", description: "IP address" },
  port: { key: "port", label: "Port", description: "Port number" },
  host: { key: "host", label: "Host", description: "Hostname" },
  domain: { key: "domain", label: "Domain", description: "Domain name" },
  url: { key: "url", label: "URL", description: "Full URL" },
  status: { key: "status", label: "Status", description: "HTTP status code" },
  title: { key: "title", label: "Title", description: "Page title" },
  source: { key: "source", label: "Source", description: "Data source" },
  path: { key: "path", label: "Path", description: "URL path" },
  severity: { key: "severity", label: "Severity", description: "Vulnerability severity" },
  name: { key: "name", label: "Name", description: "Name" },
  type: { key: "type", label: "Type", description: "Type" },
}

// Get translated predefined fields
export function getTranslatedFields(t: (key: string) => string): Record<string, FilterField> {
  return {
    ip: { key: "ip", label: "IP", description: t("fields.ip") },
    port: { key: "port", label: "Port", description: t("fields.port") },
    host: { key: "host", label: "Host", description: t("fields.host") },
    domain: { key: "domain", label: "Domain", description: t("fields.domain") },
    url: { key: "url", label: "URL", description: t("fields.url") },
    status: { key: "status", label: "Status", description: t("fields.status") },
    title: { key: "title", label: "Title", description: t("fields.title") },
    source: { key: "source", label: "Source", description: t("fields.source") },
    path: { key: "path", label: "Path", description: t("fields.path") },
    severity: { key: "severity", label: "Severity", description: t("fields.severity") },
    name: { key: "name", label: "Name", description: t("fields.name") },
    type: { key: "type", label: "Type", description: t("fields.type") },
  }
}

// Default fields (IP Addresses page)
const DEFAULT_FIELDS: FilterField[] = [
  PREDEFINED_FIELDS.ip,
  PREDEFINED_FIELDS.port,
  PREDEFINED_FIELDS.host,
]

// History storage key
const FILTER_HISTORY_KEY = 'smart_filter_history'
const MAX_HISTORY_PER_FIELD = 10

// Get history values for a field
function getFieldHistory(field: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const history = JSON.parse(localStorage.getItem(FILTER_HISTORY_KEY) || '{}')
    return history[field] || []
  } catch {
    return []
  }
}

// Save a value to field history
function saveFieldHistory(field: string, value: string) {
  if (typeof window === 'undefined' || !value.trim()) return
  try {
    const history = JSON.parse(localStorage.getItem(FILTER_HISTORY_KEY) || '{}')
    const fieldHistory = (history[field] || []).filter((v: string) => v !== value)
    fieldHistory.unshift(value)
    history[field] = fieldHistory.slice(0, MAX_HISTORY_PER_FIELD)
    localStorage.setItem(FILTER_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // ignore
  }
}

// Extract field-value pairs from query and save to history
function saveQueryHistory(query: string) {
  const regex = /(\w+)(==|!=|=)"([^"]+)"/g
  let match
  while ((match = regex.exec(query)) !== null) {
    const [, field, , value] = match
    saveFieldHistory(field, value)
  }
}

// Parse filter expression (FOFA style)
interface ParsedFilter {
  field: string
  operator: string
  value: string
  raw: string
}

function parseFilterExpression(input: string): ParsedFilter[] {
  const filters: ParsedFilter[] = []
  // Match FOFA style: field="value", field=="value", field!="value"
  // == exact match, = fuzzy match, != not equals
  // Support comma-separated multiple values: port="80,443,8080"
  const regex = /(\w+)(==|!=|=)"([^"]+)"/g
  let match

  while ((match = regex.exec(input)) !== null) {
    const [raw, field, operator, value] = match
    filters.push({ field, operator, value, raw })
  }

  return filters
}

interface SmartFilterInputProps {
  /** Available filter fields, uses default fields if not provided */
  fields?: FilterField[]
  /** Combination examples (complete examples using logical operators) */
  examples?: string[]
  placeholder?: string
  /** Controlled mode: current filter value */
  value?: string
  onSearch?: (filters: ParsedFilter[], rawQuery: string) => void
  className?: string
}

export function SmartFilterInput({
  fields = DEFAULT_FIELDS,
  examples,
  placeholder,
  value,
  onSearch,
  className,
}: SmartFilterInputProps) {
  const t = useTranslations("filter")
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value ?? "")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ghostRef = React.useRef<HTMLSpanElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const savedScrollTop = React.useRef<number | null>(null)
  const hasInitialized = React.useRef(false)

  // Calculate ghost text suggestion
  const ghostText = React.useMemo(() => {
    if (!inputValue) return ""
    
    // Get the last word/token being typed
    const lastSpaceIndex = inputValue.lastIndexOf(' ')
    const currentToken = lastSpaceIndex === -1 ? inputValue : inputValue.slice(lastSpaceIndex + 1)
    const lowerToken = currentToken.toLowerCase()
    
    // If empty token after space, check if previous expression is complete
    if (!currentToken && inputValue.trim()) {
      // Check if last expression is complete (ends with ")
      if (inputValue.trimEnd().endsWith('"')) {
        return '&& '
      }
      return ""
    }
    
    if (!currentToken) return ""
    
    // Priority 1: Field name completion (no = in token)
    if (!currentToken.includes('=') && !currentToken.includes('!')) {
      // Find matching field first
      const matchingField = fields.find(f => 
        f.key.toLowerCase().startsWith(lowerToken) && 
        f.key.toLowerCase() !== lowerToken
      )
      if (matchingField) {
        return matchingField.key.slice(currentToken.length) + '="'
      }
      
      // If exact match of field name, suggest =" 
      const exactField = fields.find(f => f.key.toLowerCase() === lowerToken)
      if (exactField) {
        return '="'
      }
      
      // Priority 2: Logical operators (only if no field matches)
      if ('&&'.startsWith(currentToken) && currentToken.startsWith('&')) {
        return '&&'.slice(currentToken.length) + ' '
      }
      if ('||'.startsWith(currentToken) && currentToken.startsWith('|')) {
        return '||'.slice(currentToken.length) + ' '
      }
      // 'and' / 'or' only if no field name starts with these
      if (!matchingField) {
        if ('and'.startsWith(lowerToken) && lowerToken.length > 0 && !fields.some(f => f.key.toLowerCase().startsWith(lowerToken))) {
          return 'and'.slice(lowerToken.length) + ' '
        }
        if ('or'.startsWith(lowerToken) && lowerToken.length > 0 && !fields.some(f => f.key.toLowerCase().startsWith(lowerToken))) {
          return 'or'.slice(lowerToken.length) + ' '
        }
      }
      
      return ""
    }
    
    // Check if typing ! for != operator
    if (currentToken.match(/^(\w+)!$/)) {
      return '="'
    }
    
    // Check if typing = and might want == 
    const singleEqMatch = currentToken.match(/^(\w+)=$/)
    if (singleEqMatch) {
      // Suggest " for fuzzy match (most common)
      return '"'
    }
    
    // Check if typed == or != (no opening quote yet)
    const doubleOpMatch = currentToken.match(/^(\w+)(==|!=)$/)
    if (doubleOpMatch) {
      return '"'
    }
    
    // Check if typing a value (has = and opening quote)
    const eqMatch = currentToken.match(/^(\w+)(==|!=|=)"([^"]*)$/)
    if (eqMatch) {
      const [, field, , partialValue] = eqMatch
      // Get history for this field
      const history = getFieldHistory(field)
      // Find matching history value
      const matchingValue = history.find(v => 
        v.toLowerCase().startsWith(partialValue.toLowerCase()) &&
        v.toLowerCase() !== partialValue.toLowerCase()
      )
      if (matchingValue) {
        return matchingValue.slice(partialValue.length) + '"'
      }
      // If value has content but no closing quote, suggest closing quote
      if (partialValue.length > 0) {
        return '"'
      }
    }
    
    // Check if a complete expression just finished (ends with ")
    if (currentToken.match(/^\w+(==|!=|=)"[^"]+"$/)) {
      return ' && '
    }
    
    return ""
  }, [inputValue, fields])

  // Synchronize external value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value)
    }
  }, [value])

  // When Popover opens, restore scroll position (scroll to top on first open)
  React.useEffect(() => {
    if (open) {
      const restoreScroll = () => {
        if (listRef.current) {
          if (!hasInitialized.current) {
            // First open, scroll to top
            listRef.current.scrollTop = 0
            hasInitialized.current = true
          } else if (savedScrollTop.current !== null) {
            // Later restore saved scroll position
            listRef.current.scrollTop = savedScrollTop.current
          }
        }
      }
      // Execute immediately
      restoreScroll()
      // Delayed execution to ensure Popover animation completes
      const timer = setTimeout(restoreScroll, 50)
      return () => clearTimeout(timer)
    } else {
      // Save scroll position when Popover closes
      if (listRef.current) {
        savedScrollTop.current = listRef.current.scrollTop
      }
    }
  }, [open])

  // Generate default placeholder (use first example or field combination)
  const defaultPlaceholder = React.useMemo(() => {
    if (examples && examples.length > 0) {
      return examples[0]
    }
    // Use fields to generate simple example
    return fields.slice(0, 2).map(f => `${f.key}="..."`).join(" && ")
  }, [fields, examples])

  // Parse current input
  const parsedFilters = parseFilterExpression(inputValue)

  // Get current word being typed
  const getCurrentWord = () => {
    const words = inputValue.split(/\s+/)
    return words[words.length - 1] || ""
  }

  const currentWord = getCurrentWord()

  // Determine whether to show field suggestions (FOFA style uses = instead of :)
  const showFieldSuggestions = !currentWord.includes("=")

  // Handle selecting suggestion (FOFA style: field=""), then close popover
  const handleSelectSuggestion = (suggestion: string) => {
    const words = inputValue.split(/\s+/)
    words[words.length - 1] = suggestion
    const newValue = words.join(" ")
    setInputValue(newValue)
    setOpen(false)
    inputRef.current?.blur()
  }

  // Handle search
  const handleSearch = () => {
    // Save query values to history
    saveQueryHistory(inputValue)
    onSearch?.(parsedFilters, inputValue)
    setOpen(false)
  }

  // Accept ghost text suggestion
  const acceptGhostText = () => {
    if (ghostText) {
      setInputValue(inputValue + ghostText)
      return true
    }
    return false
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && ghostText) {
      e.preventDefault()
      acceptGhostText()
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
    // Right arrow at end of input accepts ghost text
    if (e.key === "ArrowRight" && ghostText) {
      const input = inputRef.current
      if (input && input.selectionStart === input.value.length) {
        e.preventDefault()
        acceptGhostText()
      }
    }
  }

  // Append example to input box (not overwrite), then close popover
  const handleAppendExample = (example: string) => {
    const trimmed = inputValue.trim()
    const newValue = trimmed ? `${trimmed} ${example}` : example
    setInputValue(newValue)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverAnchor asChild>
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  if (!open) setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onBlur={(e) => {
                  // If focus moves to inside Popover or input itself, don't close
                  const relatedTarget = e.relatedTarget as HTMLElement | null
                  if (relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
                    return
                  }
                  // Delay close to let CommandItem's onSelect execute first
                  setTimeout(() => setOpen(false), 150)
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || defaultPlaceholder}
                className="h-8 w-full font-mono text-sm"
              />
              {/* Ghost text overlay */}
              {ghostText && (
                <div 
                  className="absolute inset-0 flex items-center pointer-events-none overflow-hidden px-3"
                  aria-hidden="true"
                >
                  <span className="font-mono text-sm">
                    <span className="invisible">{inputValue}</span>
                    <span ref={ghostRef} className="text-muted-foreground/40">{ghostText}</span>
                  </span>
                </div>
              )}
            </div>
          </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // If clicking on input box, don't close popover
            if (inputRef.current?.contains(e.target as Node)) {
              e.preventDefault()
            }
          }}
        >
          <Command>
            <CommandList ref={listRef}>
              {/* Preview of parsed filter conditions */}
              {parsedFilters.length > 0 && (
                <CommandGroup heading={t("groups.activeFilters")}>
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {parsedFilters.map((filter, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                        {filter.raw}
                      </Badge>
                    ))}
                  </div>
                </CommandGroup>
              )}

              {/* Available fields */}
              {showFieldSuggestions && (
                <CommandGroup heading={t("groups.availableFields")}>
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {fields.filter(
                      (f) => !currentWord || f.key.startsWith(currentWord.toLowerCase())
                    ).map((field) => (
                      <Badge 
                        key={field.key} 
                        variant="outline" 
                        className="text-xs font-mono cursor-pointer hover:bg-accent"
                        onClick={() => handleSelectSuggestion(`${field.key}="`)}
                      >
                        {field.key}
                      </Badge>
                    ))}
                  </div>
                </CommandGroup>
              )}

              {/* Syntax help */}
              <CommandGroup heading={t("groups.syntax")}>
                <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-2">
                  {/* Match operators */}
                  <div className="space-y-1">
                    <div className="font-medium text-foreground/80">{t("syntax.operators")}</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <code className="bg-muted px-1 rounded">=</code>
                      <span>{t("syntax.containsFuzzy")}</span>
                      <code className="bg-muted px-1 rounded">==</code>
                      <span>{t("syntax.exactMatch")}</span>
                      <code className="bg-muted px-1 rounded">!=</code>
                      <span>{t("syntax.notEquals")}</span>
                    </div>
                  </div>
                  {/* Logical operators */}
                  <div className="space-y-1 pt-1 border-t border-muted">
                    <div className="font-medium text-foreground/80">{t("syntax.logic")}</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <span><code className="bg-muted px-1 rounded">||</code> <code className="bg-muted px-1 rounded">or</code></span>
                      <span>{t("syntax.matchAny")}</span>
                      <span><code className="bg-muted px-1 rounded">&&</code> <code className="bg-muted px-1 rounded">and</code> <code className="bg-muted px-1 rounded">space</code></span>
                      <span>{t("syntax.matchAll")}</span>
                    </div>
                  </div>
                </div>
              </CommandGroup>

              {/* Examples */}
              {examples && examples.length > 0 && (
                <CommandGroup heading={t("groups.examples")}>
                  {examples.map((example, i) => (
                    <CommandItem
                      key={i}
                      value={example}
                      onSelect={() => handleAppendExample(example)}
                    >
                      <code className="text-xs">{example}</code>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandEmpty>{t("empty")}</CommandEmpty>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <IconSearch className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export { parseFilterExpression, DEFAULT_FIELDS, type ParsedFilter }
