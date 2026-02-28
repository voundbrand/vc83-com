"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "convex/react"
import { ChevronDown, Check } from "lucide-react"
import { ProviderLogo, ProviderBadge } from "@/components/ai/provider-logo"
import { useAIConfig } from "@/hooks/use-ai-config"
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any }

interface ModelSelectorProps {
  selectedModel?: string
  onModelChange?: (model: string | undefined) => void
  disabled?: boolean
}

interface PlatformModelRecord {
  modelId: string
  name: string
  provider: string
}

interface EligibleModel {
  id: string
  name: string
  providerId: string
}

interface AISettingsSnapshot {
  llm?: {
    defaultModelId?: string
    enabledModels?: Array<{
      modelId: string
      isDefault?: boolean
      customLabel?: string
    }>
  }
}

const PROVIDER_ALIASES: Record<string, string> = {
  google: "gemini",
  "google-ai-studio": "gemini",
  xai: "grok",
  "openai-compatible": "openai_compatible",
}

function normalizeProviderId(provider: string | undefined): string {
  if (!provider) {
    return "other"
  }

  const normalized = provider.trim().toLowerCase()
  return PROVIDER_ALIASES[normalized] || normalized
}

function normalizeModelId(modelId: string | undefined): string | null {
  if (!modelId) {
    return null
  }

  const normalized = modelId.trim()
  return normalized.length > 0 ? normalized : null
}

function inferProviderFromModelId(modelId: string): string {
  const [provider] = modelId.split("/")
  return normalizeProviderId(provider)
}

function formatModelDisplayName(modelId: string): string {
  const parts = modelId.split("/")
  const raw = parts[1] || modelId
  return raw.replace(/[-_]/g, " ")
}

function resolveDefaultModelId(settings: AISettingsSnapshot | undefined): string | undefined {
  const normalizedDefault = normalizeModelId(settings?.llm?.defaultModelId || undefined)
  if (normalizedDefault) {
    return normalizedDefault
  }

  const defaultEnabled = settings?.llm?.enabledModels?.find((model) => model.isDefault)?.modelId
  const normalizedEnabled = normalizeModelId(defaultEnabled)
  if (normalizedEnabled) {
    return normalizedEnabled
  }

  const firstEnabled = settings?.llm?.enabledModels?.[0]?.modelId
  return normalizeModelId(firstEnabled || undefined) || undefined
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { settings, connectionCatalog, canUseByok } = useAIConfig()
  const useQueryUntyped = useQuery as (query: unknown, args?: unknown) => unknown

  const platformModels = useQueryUntyped(api.ai.platformModels.getEnabledModelsByProvider) as
    | Record<string, PlatformModelRecord[]>
    | undefined

  const platformModelIndex = useMemo(() => {
    const index = new Map<string, PlatformModelRecord>()
    if (!platformModels) {
      return index
    }

    for (const models of Object.values(platformModels)) {
      for (const model of models) {
        const normalizedId = normalizeModelId(model.modelId)
        if (!normalizedId) {
          continue
        }
        index.set(normalizedId, model)
      }
    }

    return index
  }, [platformModels])

  const connectedProviderIds = useMemo(() => {
    const connected = new Set<string>()
    for (const provider of connectionCatalog?.providers || []) {
      if (provider.isConnected && provider.enabled) {
        connected.add(normalizeProviderId(provider.providerId))
      }
    }
    return connected
  }, [connectionCatalog?.providers])

  const configuredModelRows = useMemo(() => {
    const rows: Array<{ modelId: string; customLabel?: string }> = []
    const seen = new Set<string>()
    for (const model of settings?.llm.enabledModels || []) {
      const normalizedModelId = normalizeModelId(model.modelId)
      if (!normalizedModelId || seen.has(normalizedModelId)) {
        continue
      }
      seen.add(normalizedModelId)
      rows.push({ modelId: normalizedModelId, customLabel: model.customLabel })
    }
    return rows
  }, [settings?.llm.enabledModels])

  const eligibleModels = useMemo(() => {
    const models: EligibleModel[] = []

    for (const configured of configuredModelRows) {
      const platformMatch = platformModelIndex.get(configured.modelId)
      if (platformMatch) {
        models.push({
          id: configured.modelId,
          name: configured.customLabel || platformMatch.name || formatModelDisplayName(configured.modelId),
          providerId: normalizeProviderId(platformMatch.provider),
        })
        continue
      }

      const providerId = inferProviderFromModelId(configured.modelId)
      const hasEligibleByokProvider = canUseByok && connectedProviderIds.has(providerId)
      if (!hasEligibleByokProvider) {
        continue
      }

      models.push({
        id: configured.modelId,
        name: configured.customLabel || formatModelDisplayName(configured.modelId),
        providerId,
      })
    }

    return models.sort((left, right) => left.name.localeCompare(right.name))
  }, [canUseByok, configuredModelRows, connectedProviderIds, platformModelIndex])

  const modelIds = useMemo(() => new Set(eligibleModels.map((model) => model.id)), [eligibleModels])
  const orgDefaultModelId = resolveDefaultModelId(settings ?? undefined)
  const autoModelId = (orgDefaultModelId && modelIds.has(orgDefaultModelId)
    ? orgDefaultModelId
    : eligibleModels[0]?.id) || undefined
  const effectiveModelId = selectedModel && modelIds.has(selectedModel) ? selectedModel : autoModelId
  const currentModel =
    eligibleModels.find((model) => model.id === effectiveModelId) ||
    (effectiveModelId
      ? {
          id: effectiveModelId,
          name: formatModelDisplayName(effectiveModelId),
          providerId: inferProviderFromModelId(effectiveModelId),
        }
      : null)

  const modelsByProvider = useMemo(() => {
    const groups: Record<string, EligibleModel[]> = {}
    for (const model of eligibleModels) {
      if (!groups[model.providerId]) {
        groups[model.providerId] = []
      }
      groups[model.providerId].push(model)
    }
    return groups
  }, [eligibleModels])

  useEffect(() => {
    if (!selectedModel || modelIds.size === 0) {
      return
    }

    if (!modelIds.has(selectedModel)) {
      onModelChange?.(undefined)
    }
  }, [modelIds, onModelChange, selectedModel])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentModelLabel = selectedModel ? currentModel?.name || "Selected model" : "Auto"
  const currentDetailLabel = selectedModel
    ? currentModel?.id || "Unknown model"
    : autoModelId
      ? `Default: ${formatModelDisplayName(autoModelId)}`
      : "No eligible models"

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen((current) => !current)
    }
  }

  const handleModelSelect = (modelId: string | undefined) => {
    onModelChange?.(modelId)
    setIsOpen(false)
  }

  return (
    <div className="relative min-w-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
          color: "var(--shell-text)",
        }}
      >
        <ProviderLogo provider={currentModel?.providerId || "default"} size={16} />
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
            {currentModelLabel}
          </div>
          <div className="truncate text-xs" style={{ color: "var(--shell-text-dim)" }}>
            {currentDetailLabel}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--shell-text-dim)" }}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-xl border"
          style={{
            borderColor: "var(--shell-input-border-strong)",
            background: "var(--shell-input-surface)",
          }}
        >
          <button
            type="button"
            onClick={() => handleModelSelect(undefined)}
            className="flex w-full items-start gap-2 border-b px-3 py-2 text-left"
            style={{
              borderColor: "var(--shell-input-border-strong)",
              color: "var(--shell-input-text)",
            }}
          >
            <ProviderLogo provider="default" size={16} />
            <div>
              <div className="text-xs font-semibold">Auto</div>
              <div className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                {autoModelId ? `Uses default: ${formatModelDisplayName(autoModelId)}` : "No eligible models available"}
              </div>
            </div>
          </button>

          {Object.entries(modelsByProvider)
            .sort(([leftProvider], [rightProvider]) => leftProvider.localeCompare(rightProvider))
            .map(([provider, models]) => (
              <div key={provider} className="border-b last:border-b-0" style={{ borderColor: "var(--shell-input-border-strong)" }}>
                <div className="px-3 py-2">
                  <ProviderBadge provider={provider} showName={true} />
                </div>
                {models.map((model) => {
                  const isSelected = model.id === selectedModel
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleModelSelect(model.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      style={{
                        background: isSelected ? "var(--shell-hover-bg)" : "transparent",
                        color: isSelected ? "var(--shell-hover-text)" : "var(--shell-input-text)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{model.name}</div>
                        <div className="truncate text-xs" style={{ color: "var(--shell-text-dim)" }}>
                          {model.id}
                        </div>
                      </div>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
            ))}

          {eligibleModels.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs" style={{ color: "var(--shell-text-dim)" }}>
              No eligible models are available for this organization.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
