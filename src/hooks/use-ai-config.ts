"use client"

/**
 * CENTRALIZED AI CONFIGURATION HOOK
 *
 * Single source of truth for all AI settings, billing, and model management.
 * This hook consolidates:
 * - Organization AI settings (enabled models, default model, temperature, etc.)
 * - Subscription and billing status
 * - Available models from OpenRouter
 * - Token usage and limits
 *
 * Usage:
 * const { settings, billing, models, updateSettings, refreshModels } = useAIConfig()
 */

import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { Id } from "../../convex/_generated/dataModel"

export interface AISettings {
  _id: Id<"organizationAiSettings">
  organizationId: Id<"organizations">
  enabled: boolean
  billingMode: "platform" | "byok"
  tier?: "standard" | "privacy-enhanced" | "private-llm"
  llm: {
    // Multi-select model configuration
    enabledModels?: Array<{
      modelId: string
      isDefault: boolean
      customLabel?: string
      enabledAt: number
    }>
    defaultModelId?: string
    // Legacy fields (backward compatibility)
    provider?: string
    model?: string
    // Shared settings
    temperature: number
    maxTokens: number
    openrouterApiKey?: string
  }
  embedding: {
    provider: "openai" | "voyage" | "cohere" | "none"
    model: string
    dimensions: number
    apiKey?: string
  }
  monthlyBudgetUsd?: number
  currentMonthSpend: number
  createdAt: number
  updatedAt: number
}

export interface AIBillingStatus {
  hasSubscription: boolean
  status: string | null
  tier: string | null
  privateLLMTier?: string | null
  currentPeriodStart: number | null
  currentPeriodEnd: number | null
  includedTokensTotal: number
  includedTokensUsed: number
  includedTokensRemaining: number
  priceInCents?: number
  currency?: string
  cancelAtPeriodEnd?: boolean
}

export interface OpenRouterModel {
  id: string
  name: string
  created: number
  description?: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
  top_provider: {
    context_length: number
    max_completion_tokens?: number
    is_moderated: boolean
  }
  architecture?: {
    modality: string
    tokenizer: string
    instruct_type?: string
  }
}

export interface ModelsByProvider {
  anthropic: OpenRouterModel[]
  openai: OpenRouterModel[]
  google: OpenRouterModel[]
  meta: OpenRouterModel[]
  other: OpenRouterModel[]
  isStale: boolean
}

/**
 * Main AI Configuration Hook
 */
export function useAIConfig() {
  const { user } = useAuth()
  const organization = user?.currentOrganization

  // Queries
  const settings = useQuery(
    api.ai.settings.getAISettings,
    organization ? { organizationId: organization.id as Id<"organizations"> } : "skip"
  ) as AISettings | undefined

  const billing = useQuery(
    api.ai.billing.getSubscriptionStatus,
    organization ? { organizationId: organization.id as Id<"organizations"> } : "skip"
  ) as AIBillingStatus | undefined

  const models = useQuery(api.ai.modelDiscovery.getModelsByProvider) as ModelsByProvider | undefined

  // Mutations
  const upsertSettingsMutation = useMutation(api.ai.settings.upsertAISettings)
  const refreshModelsAction = useAction(api.ai.modelDiscovery.refreshModels)

  /**
   * Update AI settings for the organization
   */
  const updateSettings = async (updates: Partial<Omit<AISettings, "_id" | "organizationId" | "createdAt" | "updatedAt" | "currentMonthSpend">>) => {
    if (!organization) throw new Error("No organization")
    if (!settings) throw new Error("Settings not loaded")

    return await upsertSettingsMutation({
      organizationId: organization.id as Id<"organizations">,
      enabled: updates.enabled ?? settings.enabled,
      billingMode: updates.billingMode ?? settings.billingMode,
      tier: updates.tier ?? settings.tier,
      llm: updates.llm ?? settings.llm,
      embedding: updates.embedding ?? settings.embedding,
      monthlyBudgetUsd: updates.monthlyBudgetUsd ?? settings.monthlyBudgetUsd,
    })
  }

  /**
   * Enable/disable a specific model
   */
  const toggleModel = async (modelId: string, enabled: boolean) => {
    if (!settings) throw new Error("Settings not loaded")

    const currentModels = settings.llm.enabledModels || []

    if (enabled) {
      // Add model to enabled list
      const isDefault = currentModels.length === 0 // First model is default
      const newModels = [
        ...currentModels,
        {
          modelId,
          isDefault,
          enabledAt: Date.now(),
        },
      ]

      await updateSettings({
        llm: {
          ...settings.llm,
          enabledModels: newModels,
          defaultModelId: isDefault ? modelId : settings.llm.defaultModelId,
        },
      })
    } else {
      // Remove model from enabled list
      const newModels = currentModels.filter((m) => m.modelId !== modelId)

      // If removing the default model, set a new default
      const wasDefault = currentModels.find((m) => m.modelId === modelId)?.isDefault
      if (wasDefault && newModels.length > 0) {
        newModels[0].isDefault = true
      }

      await updateSettings({
        llm: {
          ...settings.llm,
          enabledModels: newModels,
          defaultModelId: wasDefault && newModels.length > 0 ? newModels[0].modelId : undefined,
        },
      })
    }
  }

  /**
   * Set the default model
   */
  const setDefaultModel = async (modelId: string) => {
    if (!settings) throw new Error("Settings not loaded")

    const currentModels = settings.llm.enabledModels || []
    const newModels = currentModels.map((m) => ({
      ...m,
      isDefault: m.modelId === modelId,
    }))

    await updateSettings({
      llm: {
        ...settings.llm,
        enabledModels: newModels,
        defaultModelId: modelId,
      },
    })
  }

  /**
   * Update LLM parameters (temperature, maxTokens)
   */
  const updateLLMParams = async (params: { temperature?: number; maxTokens?: number }) => {
    if (!settings) throw new Error("Settings not loaded")

    await updateSettings({
      llm: {
        ...settings.llm,
        temperature: params.temperature ?? settings.llm.temperature,
        maxTokens: params.maxTokens ?? settings.llm.maxTokens,
      },
    })
  }

  /**
   * Refresh available models from OpenRouter
   */
  const refreshModels = async () => {
    return await refreshModelsAction()
  }

  /**
   * Helper: Get currently enabled model IDs
   */
  const enabledModelIds = settings?.llm.enabledModels?.map((m) => m.modelId) || []

  /**
   * Helper: Get default model ID
   */
  const defaultModelId = settings?.llm.defaultModelId || settings?.llm.enabledModels?.find((m) => m.isDefault)?.modelId

  /**
   * Helper: Check if AI is fully configured and ready to use
   */
  const isAIReady = Boolean(
    settings?.enabled &&
    billing?.hasSubscription &&
    (billing?.status === "active" || billing?.status === "trialing") &&
    settings?.llm.enabledModels &&
    settings.llm.enabledModels.length > 0
  )

  /**
   * Helper: Get current usage percentage
   */
  const usagePercentage = billing
    ? Math.round((billing.includedTokensUsed / billing.includedTokensTotal) * 100)
    : 0

  return {
    // Data
    settings,
    billing,
    models,
    enabledModelIds,
    defaultModelId,
    isAIReady,
    usagePercentage,

    // Actions
    updateSettings,
    toggleModel,
    setDefaultModel,
    updateLLMParams,
    refreshModels,

    // Status flags
    isLoading: !settings || !billing || !models,
    hasSubscription: billing?.hasSubscription ?? false,
    isActive: billing?.status === "active" || billing?.status === "trialing",
  }
}
