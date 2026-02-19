"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Save,
  Loader2,
  Brain,
  AlertTriangle,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Check,
  Mic,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PrivacyBadge } from "@/components/ai-billing/privacy-badge";
import { useWindowManager } from "@/hooks/use-window-manager";
import { StoreWindow } from "../store-window";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";

// Dynamic require avoids deep generated API type instantiation in large settings forms.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

export function AISettingsTab() {
  const { user, sessionId } = useAuth();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.manage.ai");
  const { openWindow } = useWindowManager();
  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;

  type PlatformModel = {
    id: string;
    name: string;
    provider?: string;
    contextLength: number;
    capabilities: {
      toolCalling: boolean;
      multimodal: boolean;
      vision: boolean;
    };
    isSystemDefault?: boolean;
  };

  type TierLicenseSnapshot = {
    planTier?: "free" | "starter" | "professional" | "agency" | "enterprise";
    features?: Record<string, unknown>;
  };

  type ByokCommercialPolicyRow = {
    tier: "free" | "pro" | "agency" | "enterprise";
    byokEligible: boolean;
  };

  type AIConnectionCatalogSnapshot = {
    byokEnabled: boolean;
    requiredTierForByok: string;
    providers: Array<{
      providerId: string;
      providerLabel: string;
      hasApiKey: boolean;
      isConnected: boolean;
      enabled: boolean;
      maskedKey: string | null;
    }>;
  };

  type AgentRecord = {
    _id: Id<"objects">;
    subtype?: string;
    name?: string;
    status?: string;
    customProperties?: {
      displayName?: string;
      modelProvider?: string;
      modelId?: string;
    };
  };

  const normalizePlanTier = (tier?: string | null): "free" | "pro" | "agency" | "enterprise" => {
    if (tier === "agency") {
      return "agency";
    }
    if (tier === "enterprise") {
      return "enterprise";
    }
    if (tier === "starter" || tier === "professional") {
      return "pro";
    }
    return "free";
  };

  // Get existing AI settings
  const settings = useQuery(
    apiAny.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  );

  // Get subscription status
  const subscriptionStatus = useQuery(
    apiAny.ai.billing.getSubscriptionStatus,
    organizationId ? { organizationId } : "skip"
  );
  const license = useQuery(
    apiAny.licensing.helpers.getLicense,
    organizationId ? { organizationId } : "skip"
  ) as TierLicenseSnapshot | undefined;
  const byokPolicyTable = useQuery(
    apiAny.stripe.platformCheckout.getByokCommercialPolicyTable,
    {}
  ) as ByokCommercialPolicyRow[] | undefined;

  // Get platform-enabled models
  const platformModels = useQuery(
    apiAny.ai.platformModels.getEnabledModels,
  ) as PlatformModel[] | undefined;
  const aiConnectionsCatalog = useQuery(
    apiAny.integrations.aiConnections.getAIConnectionCatalog,
    sessionId && organizationId ? { sessionId, organizationId } : "skip"
  ) as AIConnectionCatalogSnapshot | undefined;
  const agents = useQuery(
    apiAny.agentOntology.getAgents,
    sessionId && organizationId
      ? {
          sessionId,
          organizationId,
          subtype: undefined,
          status: undefined,
        }
      : "skip"
  ) as AgentRecord[] | undefined;
  const elevenLabsSettings = useQuery(
    apiAny.integrations.elevenlabs.getElevenLabsSettings,
    sessionId && organizationId ? { sessionId, organizationId } : "skip",
  );

  const upsertSettings = useMutation(apiAny.ai.settings.upsertAISettings);
  const saveElevenLabsSettings = useMutation(
    apiAny.integrations.elevenlabs.saveElevenLabsSettings,
  );
  const saveAIConnection = useMutation(
    apiAny.integrations.aiConnections.saveAIConnection,
  );
  const probeElevenLabsHealth = useAction(
    apiAny.integrations.elevenlabs.probeElevenLabsHealth,
  );
  const updateAgent = useMutation(apiAny.agentOntology.updateAgent);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState<"standard" | "privacy-enhanced" | "private-llm">("standard");

  // Multi-select model configuration
  const [enabledModels, setEnabledModels] = useState<Array<{
    modelId: string;
    isDefault: boolean;
    enabledAt: number;
  }>>([]);
  const [defaultModelId, setDefaultModelId] = useState<string>("");

  // BYOK option (tier-gated)
  const [useBYOK, setUseBYOK] = useState(false);
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [openrouterHasSavedApiKey, setOpenrouterHasSavedApiKey] = useState(false);
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(false);
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [elevenLabsBaseUrl, setElevenLabsBaseUrl] = useState("https://api.elevenlabs.io/v1");
  const [elevenLabsDefaultVoiceId, setElevenLabsDefaultVoiceId] = useState("");
  const [elevenLabsHasSavedApiKey, setElevenLabsHasSavedApiKey] = useState(false);
  const [isProbingElevenLabs, setIsProbingElevenLabs] = useState(false);
  const [elevenLabsProbeResult, setElevenLabsProbeResult] = useState<{
    status: "healthy" | "degraded" | "offline";
    reason?: string;
    checkedAt: number;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Enterprise contact modal state
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [enterpriseTier, setEnterpriseTier] = useState<"starter" | "professional" | "enterprise">("starter");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterCapability, setFilterCapability] = useState<"all" | "tool_calling" | "multimodal" | "vision">("all");
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [fallbackProviderOrder, setFallbackProviderOrder] = useState<string[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState<string>("openrouter");
  const [agentModelDefaults, setAgentModelDefaults] = useState<Record<string, {
    modelProvider: string;
    modelId: string;
  }>>({});

  const aiFeatureEnabled = useMemo(
    () => license?.features?.aiEnabled === true,
    [license]
  );
  const byokFeatureEnabled = useMemo(() => {
    if (typeof license?.features?.aiByokEnabled === "boolean") {
      return license.features.aiByokEnabled === true;
    }
    return aiFeatureEnabled;
  }, [aiFeatureEnabled, license]);
  const normalizedPlanTier = normalizePlanTier(license?.planTier);
  const byokPolicyForTier = useMemo(
    () => byokPolicyTable?.find((row) => row.tier === normalizedPlanTier),
    [byokPolicyTable, normalizedPlanTier]
  );
  const canUseByok = useMemo(
    () =>
      aiFeatureEnabled &&
      byokFeatureEnabled &&
      Boolean(byokPolicyForTier?.byokEligible),
    [aiFeatureEnabled, byokFeatureEnabled, byokPolicyForTier]
  );
  const byokRequiredTier =
    aiConnectionsCatalog?.requiredTierForByok || "Starter (€199/month)";
  const connectedProviderOptions = useMemo(() => {
    return (aiConnectionsCatalog?.providers ?? [])
      .filter((provider) => provider.isConnected && provider.providerId !== "elevenlabs")
      .map((provider) => ({
        id: provider.providerId,
        label: provider.providerLabel,
      }));
  }, [aiConnectionsCatalog]);

  // Model type definition (moved before useEffects)
  type ModelOption = {
    id: string;
    name: string;
    provider?: string;
    location: string;
    zdr: boolean;
    noTraining: boolean;
    toolCalling?: boolean;
    multimodal?: boolean;
    vision?: boolean;
    description: string;
    recommended?: boolean;
  };

  // Get all available models from platform-enabled models (moved before useEffects)
  const getAllModelsForTier = useCallback((tierValue: typeof tier): ModelOption[] => {
    if (!platformModels) return [];

    const models: ModelOption[] = platformModels.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      location: model.provider === "mistral" ? "🇪🇺" :
                model.provider === "anthropic" || model.provider === "openai" || model.provider === "google" ? "🇺🇸" :
                model.provider === "cohere" ? "🇨🇦" : "",
      zdr: model.provider === "mistral" || model.provider === "meta-llama",
      noTraining: model.provider === "mistral" || model.provider === "anthropic" || model.provider === "meta-llama",
      toolCalling: model.capabilities.toolCalling,
      multimodal: model.capabilities.multimodal,
      vision: model.capabilities.vision,
      description: `${(model.contextLength / 1000).toFixed(0)}K context. ${model.capabilities.toolCalling ? "Tool calling. " : ""}${model.capabilities.vision ? "Vision. " : ""}`,
      recommended: model.isSystemDefault ?? false,
    }));

    if (tierValue === "privacy-enhanced") {
      return models.filter(m => m.zdr && m.noTraining);
    }

    return models;
  }, [platformModels]);

  // Helper function for model management (moved before useEffects)
  const isModelEnabled = useCallback((modelId: string) => enabledModels.some(m => m.modelId === modelId), [enabledModels]);

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      if (settings.tier) {
        setTier(settings.tier);
      }

      // Load enabled models
      if (settings.llm.enabledModels && settings.llm.enabledModels.length > 0) {
        setEnabledModels(settings.llm.enabledModels);
        setDefaultModelId(
          settings.llm.defaultModelId ||
            settings.llm.enabledModels.find(
              (m: { isDefault?: boolean; modelId: string }) => m.isDefault,
            )?.modelId ||
            "",
        );
      } else {
        // If no models saved, auto-select system defaults only
        const models = getAllModelsForTier(settings.tier || "standard");
        const systemDefaultModels = models.filter(m => m.recommended);
        const enabledModels = systemDefaultModels.map((m, index) => ({
          modelId: m.id,
          isDefault: index === 0, // First system default is the default
          enabledAt: Date.now()
        }));
        setEnabledModels(enabledModels);
        if (enabledModels.length > 0) {
          setDefaultModelId(enabledModels[0].modelId);
        }
      }

      setUseBYOK(settings.billingMode === "byok" && canUseByok);
      setDefaultProviderId(
        settings.llm.providerId || settings.llm.provider || "openrouter"
      );

      const providerProfiles = (settings.llm.providerAuthProfiles || [])
        .filter((profile: { enabled?: boolean; providerId?: string }) =>
          profile.enabled && profile.providerId && profile.providerId !== "elevenlabs"
        )
        .sort(
          (
            left: { priority?: number },
            right: { priority?: number }
          ) => (left.priority ?? 10_000) - (right.priority ?? 10_000)
        )
        .map((profile: { providerId: string }) => profile.providerId);

      if (providerProfiles.length > 0) {
        setFallbackProviderOrder(Array.from(new Set(providerProfiles)));
      } else if (connectedProviderOptions.length > 0) {
        setFallbackProviderOrder(connectedProviderOptions.map((provider) => provider.id));
      }
    } else if (platformModels && enabledModels.length === 0) {
      // NEW: No settings exist yet, auto-select system defaults
      // This happens when a new organization first opens AI Settings
      const systemDefaults = platformModels.filter((m) => m.isSystemDefault);
      if (systemDefaults.length > 0) {
        const newModels = systemDefaults.map((m, index: number) => ({
          modelId: m.id,
          isDefault: index === 0, // First system default is the default
          enabledAt: Date.now()
        }));
        setEnabledModels(newModels);
        setDefaultModelId(newModels[0].modelId);
        setEnabled(true); // Auto-enable AI features
      }
    }
    if (!canUseByok) {
      setUseBYOK(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on initial load, not when user modifies local state
  }, [settings, platformModels, canUseByok, connectedProviderOptions]);

  useEffect(() => {
    const openRouterConnection = aiConnectionsCatalog?.providers?.find(
      (provider) => provider.providerId === "openrouter"
    );
    setOpenrouterHasSavedApiKey(Boolean(openRouterConnection?.hasApiKey));
  }, [aiConnectionsCatalog]);

  useEffect(() => {
    if (fallbackProviderOrder.length > 0 || connectedProviderOptions.length === 0) {
      return;
    }
    setFallbackProviderOrder(connectedProviderOptions.map((provider) => provider.id));
  }, [fallbackProviderOrder.length, connectedProviderOptions]);

  useEffect(() => {
    if (!agents) {
      return;
    }

    setAgentModelDefaults((current) => {
      const nextDefaults: Record<string, { modelProvider: string; modelId: string }> = {
        ...current,
      };

      for (const agent of agents) {
        if (nextDefaults[agent._id]) {
          continue;
        }

        const currentProvider =
          agent.customProperties?.modelProvider || defaultProviderId || "openrouter";
        const currentModel =
          agent.customProperties?.modelId ||
          defaultModelId ||
          enabledModels[0]?.modelId ||
          "";

        nextDefaults[agent._id] = {
          modelProvider: currentProvider,
          modelId: currentModel,
        };
      }

      return nextDefaults;
    });
  }, [agents, defaultProviderId, defaultModelId, enabledModels]);

  useEffect(() => {
    if (!elevenLabsSettings) {
      return;
    }

    setElevenLabsEnabled(Boolean(elevenLabsSettings.enabled));
    setElevenLabsBaseUrl(
      elevenLabsSettings.baseUrl || "https://api.elevenlabs.io/v1",
    );
    setElevenLabsDefaultVoiceId(elevenLabsSettings.defaultVoiceId ?? "");
    setElevenLabsHasSavedApiKey(Boolean(elevenLabsSettings.hasApiKey));
    setElevenLabsProbeResult({
      status: elevenLabsSettings.healthStatus ?? "degraded",
      reason:
        elevenLabsSettings.healthReason ??
        elevenLabsSettings.lastFailureReason ??
        undefined,
      checkedAt: Date.now(),
    });
    if (!elevenLabsSettings.hasApiKey) {
      setElevenLabsApiKey("");
    }
  }, [elevenLabsSettings]);

  // Auto-select system default models when tier changes
  // This effect handles filtering out incompatible models when switching privacy tiers
  useEffect(() => {
    if (!platformModels) return; // Wait for models to load

    const allModels = getAllModelsForTier(tier);
    const allModelIds = allModels.map(m => m.id);

    // Use functional update to check current state without adding enabledModels to deps
    setEnabledModels(currentModels => {
      // Only act if we have existing models that are now incompatible with the new tier
      const hasIncompatibleModels = currentModels.length > 0 &&
        currentModels.some(m => !allModelIds.includes(m.modelId));

      if (hasIncompatibleModels) {
        // Get system defaults (models marked as recommended by super admin)
        const systemDefaultModels = allModels.filter(m => m.recommended);

        // Auto-select system defaults
        const newModels = systemDefaultModels.map((m, index) => ({
          modelId: m.id,
          isDefault: index === 0, // First system default is the default
          enabledAt: Date.now()
        }));

        // Set first model as the default
        if (newModels.length > 0) {
          newModels[0].isDefault = true;
          setDefaultModelId(newModels[0].modelId);
        }

        return newModels;
      }

      // No change needed
      return currentModels;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when tier changes, not on platformModels updates
  }, [tier]);

  // Get all available models based on tier
  const allAvailableModels = getAllModelsForTier(tier);

  // Get unique providers for filter
  const providers = useMemo(() => {
    const uniqueProviders = new Set(allAvailableModels.map((m) => m.provider || "unknown"));
    return Array.from(uniqueProviders).sort();
  }, [allAvailableModels]);

  // Filtered models
  const availableModels = useMemo(() => {
    return allAvailableModels.filter((model) => {
      // Provider filter
      if (filterProvider !== "all" && model.provider !== filterProvider) {
        return false;
      }

      // Capability filter
      if (filterCapability === "tool_calling" && !model.toolCalling) return false;
      if (filterCapability === "multimodal" && !model.multimodal) return false;
      if (filterCapability === "vision" && !model.vision) return false;

      // Recommended filter
      if (showOnlyRecommended && !model.recommended) return false;

      // Enabled filter
      if (showOnlyEnabled && !isModelEnabled(model.id)) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          model.name.toLowerCase().includes(query) ||
          model.id.toLowerCase().includes(query) ||
          (model.provider && model.provider.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [allAvailableModels, filterProvider, filterCapability, showOnlyRecommended, showOnlyEnabled, searchQuery, isModelEnabled]);

  // Count enabled models and privacy features
  const enabledModelCount = enabledModels.length;
  const privacyStats = useMemo(() => {
    const locations = new Set<string>();
    let zdrCount = 0;
    let noTrainingCount = 0;

    for (const model of enabledModels) {
      const modelId = model.modelId;
      // Determine provider from model ID
      const provider = modelId.split("/")[0];

      // Map to locations
      if (provider === "mistral") locations.add("eu");
      else if (["anthropic", "openai", "google"].includes(provider)) locations.add("us");
      else if (provider === "cohere") locations.add("ca");
      else if (provider === "meta-llama") locations.add("global");
      else locations.add("global");

      // Count privacy features
      if (["mistral", "anthropic", "meta-llama"].includes(provider)) {
        zdrCount++;
        noTrainingCount++;
      }
    }

    return {
      hasEU: locations.has("eu"),
      hasUS: locations.has("us"),
      hasCA: locations.has("ca"),
      hasGlobal: locations.has("global"),
      zdrCount,
      noTrainingCount,
    };
  }, [enabledModels]);

  // Helper functions for model management
  const toggleModel = (modelId: string) => {
    if (isModelEnabled(modelId)) {
      // Remove model
      const updatedModels = enabledModels.filter(m => m.modelId !== modelId);
      setEnabledModels(updatedModels);

      // If we removed the default, pick a new one
      if (defaultModelId === modelId && updatedModels.length > 0) {
        const newDefault = updatedModels[0].modelId;
        setDefaultModelId(newDefault);
        updatedModels[0].isDefault = true;
      } else if (updatedModels.length === 0) {
        setDefaultModelId("");
      }
    } else {
      // Add model
      const newModel = {
        modelId,
        isDefault: enabledModels.length === 0, // First model becomes default
        enabledAt: Date.now()
      };
      const updatedModels = [...enabledModels, newModel];
      setEnabledModels(updatedModels);

      if (enabledModels.length === 0) {
        setDefaultModelId(modelId);
      }
    }
  };

  const setAsDefaultModel = (modelId: string) => {
    if (!isModelEnabled(modelId)) return;

    const updatedModels = enabledModels.map(m => ({
      ...m,
      isDefault: m.modelId === modelId
    }));
    setEnabledModels(updatedModels);
    setDefaultModelId(modelId);
  };

  const moveFallbackProvider = (providerId: string, direction: "up" | "down") => {
    setFallbackProviderOrder((current) => {
      const index = current.indexOf(providerId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const updateAgentDefault = (
    agentId: string,
    updates: Partial<{ modelProvider: string; modelId: string }>
  ) => {
    setAgentModelDefaults((current) => ({
      ...current,
      [agentId]: {
        ...(current[agentId] ?? {
          modelProvider: defaultProviderId || "openrouter",
          modelId: defaultModelId || enabledModels[0]?.modelId || "",
        }),
        ...updates,
      },
    }));
  };

  const handleProbeElevenLabs = async () => {
    if (!sessionId || !organizationId) {
      return;
    }

    setIsProbingElevenLabs(true);
    try {
      const probeResult = (await probeElevenLabsHealth({
        sessionId,
        organizationId,
        apiKey: elevenLabsApiKey.trim() || undefined,
        baseUrl: elevenLabsBaseUrl.trim() || undefined,
      })) as {
        status: "healthy" | "degraded" | "offline";
        reason?: string;
        checkedAt: number;
      };
      setElevenLabsProbeResult({
        status: probeResult.status,
        reason: probeResult.reason,
        checkedAt: probeResult.checkedAt,
      });
    } catch (error) {
      setElevenLabsProbeResult({
        status: "offline",
        reason:
          error instanceof Error
            ? error.message
            : "Health probe failed.",
        checkedAt: Date.now(),
      });
    } finally {
      setIsProbingElevenLabs(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;

    // Validate that at least one model is enabled
    if (enabledModels.length === 0) {
      alert("Please enable at least one model before saving.");
      return;
    }

    // Validate that a default model is selected
    if (!defaultModelId) {
      alert("Please select a default model.");
      return;
    }

    if (useBYOK && !canUseByok) {
      alert(`BYOK connections require ${byokRequiredTier} or higher.`);
      return;
    }

    if (useBYOK && !openrouterHasSavedApiKey && !openrouterApiKey.trim()) {
      alert("Enter an OpenRouter key (or connect one in Integrations) before enabling BYOK.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const existingProviderProfiles = settings?.llm?.providerAuthProfiles || [];
      const providerPriorityMap = new Map(
        fallbackProviderOrder.map((providerId, index) => [providerId, index])
      );
      const providerAuthProfiles = existingProviderProfiles.map(
        (profile: {
          providerId?: string;
          priority?: number;
          [key: string]: unknown;
        }, index: number) => {
          const providerId =
            typeof profile.providerId === "string" ? profile.providerId : "";
          const chainPriority = providerPriorityMap.get(providerId);
          return {
            ...profile,
            priority:
              chainPriority ??
              profile.priority ??
              fallbackProviderOrder.length + index,
          };
        }
      );

      await upsertSettings({
        organizationId,
        enabled,
        billingMode: useBYOK && canUseByok ? "byok" : "platform",
        tier,
        llm: {
          ...(settings?.llm || {}),
          enabledModels,
          defaultModelId,
          providerId: defaultProviderId || settings?.llm?.providerId || "openrouter",
          temperature: settings?.llm?.temperature ?? 0.7,
          maxTokens: settings?.llm?.maxTokens ?? 4000,
          providerAuthProfiles:
            providerAuthProfiles.length > 0 ? providerAuthProfiles : undefined,
        },
        embedding: settings?.embedding || {
          provider: "none",
          model: "",
          dimensions: 0,
        },
        monthlyBudgetUsd: settings?.monthlyBudgetUsd,
      });

      if (sessionId) {
        if (useBYOK && canUseByok) {
          await saveAIConnection({
            sessionId,
            organizationId,
            providerId: "openrouter",
            enabled: true,
            apiKey: openrouterApiKey.trim() || undefined,
            billingSource: "byok",
          });
          setOpenrouterHasSavedApiKey(
            Boolean(openrouterApiKey.trim()) || openrouterHasSavedApiKey
          );
          setOpenrouterApiKey("");
        }

        await saveElevenLabsSettings({
          sessionId,
          organizationId,
          enabled: elevenLabsEnabled,
          apiKey: elevenLabsApiKey.trim() || undefined,
          baseUrl: elevenLabsBaseUrl.trim() || undefined,
          defaultVoiceId: elevenLabsDefaultVoiceId.trim() || undefined,
        });
        setElevenLabsHasSavedApiKey(
          Boolean(elevenLabsApiKey.trim()) || elevenLabsHasSavedApiKey,
        );

        if (agents && agents.length > 0) {
          for (const agent of agents) {
            const desired = agentModelDefaults[agent._id];
            if (!desired) {
              continue;
            }
            const currentProvider =
              agent.customProperties?.modelProvider || "openrouter";
            const currentModel = agent.customProperties?.modelId || "";
            const nextModelId =
              desired.modelId || defaultModelId || currentModel;
            if (
              desired.modelProvider === currentProvider &&
              nextModelId === currentModel
            ) {
              continue;
            }

            await updateAgent({
              sessionId,
              agentId: agent._id,
              updates: {
                modelProvider: desired.modelProvider,
                modelId: nextModelId,
              },
            });
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      alert(`Failed to save AI settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (translationsLoading) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--error)' }}>
        {t("ui.manage.ai.not_authenticated")}
      </div>
    );
  }

  // Open Store window for subscriptions
  const handleOpenStore = () => {
    openWindow(
      "store",
      "Platform Store",
      <StoreWindow />,
      { x: 200, y: 100 },
      { width: 900, height: 700 },
      'ui.store.title'
    );
  };

  // Format price for display (from cents)
  const formatPrice = (cents: number) => {
    const euros = cents / 100;
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(euros);
  };

  // Format large price (whole euros, for Private LLM tiers)
  const formatLargePrice = (euros: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(euros);
  };

  // Format tokens for display
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const elevenLabsHealthStatus =
    elevenLabsProbeResult?.status ??
    elevenLabsSettings?.healthStatus ??
    "degraded";
  const elevenLabsHealthReason =
    elevenLabsProbeResult?.reason ??
    elevenLabsSettings?.healthReason ??
    elevenLabsSettings?.lastFailureReason ??
    undefined;
  const elevenLabsHealthLabel =
    elevenLabsHealthStatus === "healthy"
      ? "Healthy"
      : elevenLabsHealthStatus === "offline"
        ? "Offline"
        : "Degraded";
  const elevenLabsHealthColor =
    elevenLabsHealthStatus === "healthy"
      ? "var(--success)"
      : elevenLabsHealthStatus === "offline"
        ? "var(--error)"
        : "var(--warning)";

  return (
    <div className="space-y-6">
      {/* Subscription Status Banner */}
      {subscriptionStatus && (
        <>
          {subscriptionStatus.hasSubscription && subscriptionStatus.status === "active" ? (
            <div
              className="p-4 border-2 flex items-start gap-3"
              style={{
                backgroundColor: 'var(--success)',
                borderColor: 'var(--window-document-border)',
                color: 'white'
              }}
            >
              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm mb-1">
                  {subscriptionStatus.tier === "standard" && t("ui.manage.ai.plan_active.standard")}
                  {subscriptionStatus.tier === "privacy-enhanced" && t("ui.manage.ai.plan_active.privacy_enhanced")}
                  {subscriptionStatus.tier === "private-llm" && t("ui.manage.ai.plan_active.private_llm")}
                </h3>
                <p className="text-xs">
                  {formatPrice(subscriptionStatus.priceInCents)}/{t("ui.manage.ai.price.per_month")} •{" "}
                  {formatTokens(subscriptionStatus.includedTokensUsed)}/{formatTokens(subscriptionStatus.includedTokensTotal)} {t("ui.manage.ai.tokens_used")}
                </p>
                <button
                  onClick={handleOpenStore}
                  className="mt-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-white/20 text-white hover:bg-white/30 flex items-center gap-1"
                >
                  <ShoppingCart size={12} />
                  {t("ui.manage.ai.browse_store")}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 border-2 flex items-start gap-3"
              style={{
                backgroundColor: 'var(--warning)',
                borderColor: 'var(--window-document-border)',
                color: 'var(--window-document-text)'
              }}
            >
              <XCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm mb-1">{t("ui.manage.ai.subscribe_to_activate")}</h3>
                <p className="text-xs mb-2">
                  {t("ui.manage.ai.choose_plan_description")}
                </p>
                <button
                  onClick={handleOpenStore}
                  className="px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                >
                  <ShoppingCart size={14} />
                  {t("ui.manage.ai.open_store")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Header */}
      <div
        className="p-4 border-2 flex items-start gap-3"
        style={{
          backgroundColor: 'var(--info)',
          borderColor: 'var(--window-document-border)',
          color: 'var(--window-document-text)'
        }}
      >
        <Brain size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">{t("ui.manage.ai.configuration_title")}</h3>
          <p className="text-xs">
            {t("ui.manage.ai.configuration_description")}
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div
        className="p-4 border-2"
        style={{
          backgroundColor: 'var(--window-document-bg-elevated)',
          borderColor: 'var(--window-document-border)',
        }}
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <div>
            <span className="font-bold text-sm" style={{ color: 'var(--window-document-text)' }}>
              {t("ui.manage.ai.enable_features")}
            </span>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.manage.ai.enable_features_description")}
            </p>
          </div>
        </label>
      </div>

      {enabled && (
        <>
          {/* Privacy Tier Selection */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--window-document-bg-elevated)',
              borderColor: 'var(--window-document-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--window-document-text)' }}>
              {t("ui.manage.ai.data_privacy_level")}
            </h3>

            <div className="space-y-4">
              {/* Platform Tiers Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Standard Tier */}
                <label
                  className="flex items-start gap-3 cursor-pointer p-3 border-2"
                  style={{
                    borderColor: tier === "standard" ? 'var(--primary)' : 'var(--window-document-border)',
                    backgroundColor: tier === "standard" ? 'var(--window-document-bg-elevated)' : 'transparent'
                  }}
                >
                <input
                  type="radio"
                  name="tier"
                  value="standard"
                  checked={tier === "standard"}
                  onChange={() => setTier("standard")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm" style={{ color: 'var(--window-document-text)' }}>
                      {t("ui.manage.ai.tier.standard.name")}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      {formatPrice(4900)}/{t("ui.manage.ai.price.per_month")} {t("ui.manage.ai.price.incl_vat")}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.tier.standard.description")}
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li> {t("ui.manage.ai.tier.feature.all_models")}</li>
                    <li> {t("ui.manage.ai.tier.feature.tokens_included")}</li>
                    <li> {t("ui.manage.ai.tier.feature.global_routing")}</li>
                  </ul>
                </div>
              </label>

                {/* Privacy-Enhanced Tier */}
                <label
                  className="flex items-start gap-3 cursor-pointer p-3 border-2"
                  style={{
                    borderColor: tier === "privacy-enhanced" ? 'var(--primary)' : 'var(--window-document-border)',
                    backgroundColor: tier === "privacy-enhanced" ? 'var(--window-document-bg-elevated)' : 'transparent'
                  }}
                >
                <input
                  type="radio"
                  name="tier"
                  value="privacy-enhanced"
                  checked={tier === "privacy-enhanced"}
                  onChange={() => setTier("privacy-enhanced")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={14} />
                    <span className="font-bold text-sm" style={{ color: 'var(--window-document-text)' }}>
                      {t("ui.manage.ai.tier.privacy_enhanced.name")}
                    </span>
                    <span
                      className="px-2 py-0.5 text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--success)',
                        color: 'white',
                      }}
                    >
                      {t("ui.manage.ai.tier.recommended")}
                    </span>
                  </div>
                  <span className="text-xs block mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {formatPrice(4900)}/{t("ui.manage.ai.price.per_month")} {t("ui.manage.ai.price.incl_vat")}
                  </span>
                  <div className="flex gap-1.5 mb-2">
                    <PrivacyBadge type="eu" size="sm" />
                    <PrivacyBadge type="zdr" size="sm" />
                    <PrivacyBadge type="no-training" size="sm" />
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.tier.privacy_enhanced.description")}
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li> {t("ui.manage.ai.tier.feature.gdpr_optimized")}</li>
                    <li> {t("ui.manage.ai.tier.feature.no_training")}</li>
                    <li> {t("ui.manage.ai.tier.feature.tokens_included")}</li>
                  </ul>
                </div>
              </label>
              </div>

              {/* Private LLM Tiers Section Header */}
              <div>
                <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                  {t("ui.manage.ai.private_llm.hosting_title")}
                </h4>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.ai.private_llm.hosting_description")}
                </p>

                {/* Private LLM Tiers Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Private LLM - Starter */}
                  <div
                    className="p-3 border-2"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      backgroundColor: 'var(--window-document-bg-elevated)',
                    }}
                  >
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {t("ui.manage.ai.private_llm.name")}
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.private_llm.tier.starter")}
                  </p>
                  <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                    {formatLargePrice(2999)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.price.per_month")}
                  </p>
                </div>

                <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--window-document-text)' }}>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.self_hosted")}</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.requests_50k")}</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.scale_to_zero")}</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.data_sovereignty")}</span>
                  </li>
                </ul>

                    <button
                      onClick={() => {
                        setEnterpriseTier("starter");
                        setShowEnterpriseModal(true);
                      }}
                      className="desktop-interior-button w-full py-2 text-xs font-pixel"
                    >
                      {t("ui.manage.ai.contact_sales")}
                    </button>
                  </div>

                  {/* Private LLM - Professional */}
                  <div
                    className="p-3 border-2"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      backgroundColor: 'var(--window-document-bg-elevated)',
                    }}
                  >
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {t("ui.manage.ai.private_llm.name")}
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.private_llm.tier.professional")}
                  </p>
                  <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                    {formatLargePrice(7199)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.price.per_month")}
                  </p>
                </div>

                <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--window-document-text)' }}>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Dedicated GPU infrastructure</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>~200K requests/month</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>99.5% SLA</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.priority_support")}</span>
                  </li>
                </ul>

                    <button
                      onClick={() => {
                        setEnterpriseTier("professional");
                        setShowEnterpriseModal(true);
                      }}
                      className="desktop-interior-button w-full py-2 text-xs font-pixel"
                    >
                      {t("ui.manage.ai.contact_sales")}
                    </button>
                  </div>

                  {/* Private LLM - Enterprise */}
                  <div
                    className="p-3 border-2"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      backgroundColor: 'var(--window-document-bg-elevated)',
                    }}
                  >
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    {t("ui.manage.ai.private_llm.name")}
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.private_llm.tier.enterprise")}
                  </p>
                  <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                    {formatLargePrice(14999)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.ai.price.per_month")}
                  </p>
                </div>

                <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--window-document-text)' }}>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Custom infrastructure</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.unlimited_requests")}</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Dedicated support team</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>{t("ui.manage.ai.private_llm.feature.custom_sla")}</span>
                  </li>
                </ul>

                    <button
                      onClick={() => {
                        setEnterpriseTier("enterprise");
                        setShowEnterpriseModal(true);
                      }}
                      className="desktop-interior-button w-full py-2 text-xs font-pixel"
                    >
                      {t("ui.manage.ai.contact_sales")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy tier explanation */}
            {tier === "privacy-enhanced" && (
              <div
                className="p-3 mt-3 border-2 text-xs"
                style={{
                  backgroundColor: 'var(--info)',
                  borderColor: 'var(--window-document-border)',
                  color: 'var(--window-document-text)'
                }}
              >
                <div className="flex gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">{t("ui.manage.ai.privacy_mode_active")}</p>
                    <p>
                      {t("ui.manage.ai.privacy_mode_description")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--window-document-bg-elevated)',
              borderColor: 'var(--window-document-border)',
            }}
          >
            <div className="mb-4">
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.manage.ai.enabled_models")}
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.manage.ai.enabled_models_description")}
              </p>
            </div>

            {/* Filters */}
            <div className="mb-4 p-3 border-2" style={{ borderColor: 'var(--window-document-border)', backgroundColor: 'var(--window-document-bg)' }}>
              <div className="mb-2 text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
                Showing {availableModels.length} of {allAvailableModels.length} models
              </div>
              <div className="grid grid-cols-5 gap-3">
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Model name..."
                    className="w-full px-2 py-1 text-xs"
                    style={{
                      backgroundColor: 'var(--window-document-bg)',
                      color: 'var(--window-document-text)',
                      border: '2px inset',
                      borderColor: 'var(--window-document-border)',
                    }}
                  />
                </div>

                {/* Provider Filter */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Provider
                  </label>
                  <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="w-full px-2 py-1 text-xs"
                    style={{
                      backgroundColor: 'var(--window-document-bg)',
                      color: 'var(--window-document-text)',
                      border: '2px inset',
                      borderColor: 'var(--window-document-border)',
                    }}
                  >
                    <option value="all">All Providers</option>
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capability Filter */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Capability
                  </label>
                  <select
                    value={filterCapability}
                    onChange={(e) => setFilterCapability(e.target.value as "all" | "tool_calling" | "multimodal" | "vision")}
                    className="w-full px-2 py-1 text-xs"
                    style={{
                      backgroundColor: 'var(--window-document-bg)',
                      color: 'var(--window-document-text)',
                      border: '2px inset',
                      borderColor: 'var(--window-document-border)',
                    }}
                  >
                    <option value="all">All Capabilities</option>
                    <option value="tool_calling">Tool Calling</option>
                    <option value="multimodal">Multimodal</option>
                    <option value="vision">Vision</option>
                  </select>
                </div>

                {/* Recommended Filter */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Recommended
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyRecommended}
                      onChange={(e) => setShowOnlyRecommended(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>Only show</span>
                  </label>
                </div>

                {/* Enabled Filter */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Enabled
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyEnabled}
                      onChange={(e) => setShowOnlyEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>Only show</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {availableModels.map((model) => {
                const enabled = isModelEnabled(model.id);
                const isDefault = defaultModelId === model.id;

                return (
                  <div
                    key={model.id}
                    className="p-3 border-2"
                    style={{
                      borderColor: isDefault ? 'var(--primary)' : 'var(--window-document-border)',
                      backgroundColor: enabled ? 'var(--window-document-bg-elevated)' : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Enable/Disable Checkbox */}
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleModel(model.id)}
                        className="mt-1"
                      />

                      {/* Model Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs" style={{ color: 'var(--window-document-text)' }}>
                            {model.name}
                          </span>

                          {/* Inline Privacy Indicators */}
                          <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                            {model.location}
                            {model.zdr && " "}
                            {model.noTraining && " "}
                          </span>

                          {model.recommended && (
                            <span
                              className="px-2 py-0.5 text-xs font-bold"
                              style={{
                                backgroundColor: 'var(--success)',
                                color: 'white',
                              }}
                            >
                              RECOMMENDED
                            </span>
                          )}
                          {isDefault && (
                            <span
                              className="px-2 py-0.5 text-xs font-bold"
                              style={{
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                              }}
                            >
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                          {model.description}
                        </p>

                        {/* Set as Default button */}
                        {enabled && !isDefault && (
                          <button
                            onClick={() => setAsDefaultModel(model.id)}
                            className="desktop-interior-button py-1.5 px-3 text-xs font-pixel"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 border-2 text-xs" style={{
              backgroundColor: 'var(--window-document-bg)',
              borderColor: 'var(--window-document-border)',
              color: 'var(--neutral-gray)'
            }}>
              <p style={{ color: 'var(--window-document-text)' }}>
                <span className="font-bold">{enabledModels.length} models enabled</span>
                {defaultModelId && (
                  <span> • Default: {availableModels.find(m => m.id === defaultModelId)?.name}</span>
                )}
              </p>
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 border-2 text-xs" style={{
              backgroundColor: 'var(--window-document-bg)',
              borderColor: 'var(--window-document-border)',
              color: 'var(--neutral-gray)'
            }}>
              <p className="font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.manage.ai.privacy_indicators")}
              </p>
              <ul className="space-y-1">
                <li>
                  <strong>{t("ui.manage.ai.location")}:</strong> {
                    [
                      privacyStats.hasEU && "🇪🇺 EU",
                      privacyStats.hasUS && "🇺🇸 US",
                      privacyStats.hasCA && "🇨🇦 Canada",
                      privacyStats.hasGlobal && " Global"
                    ].filter(Boolean).join(" • ") || t("ui.manage.ai.location_none")
                  }
                </li>
                {privacyStats.zdrCount > 0 && (
                  <li>
                    <strong> {t("ui.manage.ai.zero_data_retention")}:</strong> {t("ui.manage.ai.zero_data_retention_desc", { count: privacyStats.zdrCount })}
                  </li>
                )}
                {privacyStats.noTrainingCount > 0 && (
                  <li>
                    <strong> {t("ui.manage.ai.no_training")}:</strong> {t("ui.manage.ai.no_training_desc", { count: privacyStats.noTrainingCount })}
                  </li>
                )}
              </ul>
              <p className="mt-2 text-xs" style={{ color: 'var(--window-document-text)' }}>
                <strong>{t("ui.manage.ai.smart_defaults")}:</strong> {t("ui.manage.ai.smart_defaults_desc", { count: enabledModelCount })}
              </p>
            </div>
          </div>

          {/* Provider Defaults + Fallback Editor */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
          >
            <div className="mb-3">
              <h3 className="font-bold text-sm mb-1 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                <Brain size={16} />
                Provider Defaults & Fallback
              </h3>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Set the default runtime provider and fallback order used when a provider is unavailable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Default provider
                </label>
                <select
                  value={defaultProviderId}
                  onChange={(event) => setDefaultProviderId(event.target.value)}
                  className="w-full p-2 text-xs border-2"
                  style={{
                    borderColor: "var(--window-document-border)",
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {connectedProviderOptions.length === 0 && (
                    <option value="openrouter">openrouter</option>
                  )}
                  {connectedProviderOptions.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                Fallback chain order
              </p>
              {fallbackProviderOrder.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  No connected providers yet. Configure AI Connections in Integrations first.
                </p>
              ) : (
                <div className="space-y-2">
                  {fallbackProviderOrder.map((providerId, index) => {
                    const providerLabel =
                      connectedProviderOptions.find((provider) => provider.id === providerId)?.label ||
                      providerId;

                    return (
                      <div
                        key={providerId}
                        className="flex items-center justify-between p-2 border-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          backgroundColor: "var(--window-document-bg)",
                        }}
                      >
                        <div>
                          <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                            {index + 1}. {providerLabel}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                            Provider ID: {providerId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moveFallbackProvider(providerId, "up")}
                            className="desktop-interior-button py-1 px-2 text-[11px]"
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            onClick={() => moveFallbackProvider(providerId, "down")}
                            className="desktop-interior-button py-1 px-2 text-[11px]"
                            disabled={index === fallbackProviderOrder.length - 1}
                          >
                            Down
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Per-Agent Provider/Model Defaults */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
          >
            <div className="mb-3">
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--window-document-text)" }}>
                Per-Agent Provider & Model Defaults
              </h3>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Each agent can override the global defaults. Changes are saved with AI settings.
              </p>
            </div>

            {!agents || agents.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                No agents found for this organization.
              </p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => {
                  const agentDefaults = agentModelDefaults[agent._id];
                  const fallbackModel = defaultModelId || enabledModels[0]?.modelId || "";
                  return (
                    <div
                      key={agent._id}
                      className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 border-2"
                      style={{
                        borderColor: "var(--window-document-border)",
                        backgroundColor: "var(--window-document-bg)",
                      }}
                    >
                      <div className="md:col-span-2">
                        <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                          {agent.customProperties?.displayName || agent.name || "Agent"}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                          {agent.subtype || "general"} • {agent.status || "draft"}
                        </p>
                      </div>

                      <select
                        value={agentDefaults?.modelProvider || defaultProviderId}
                        onChange={(event) =>
                          updateAgentDefault(agent._id, { modelProvider: event.target.value })
                        }
                        className="w-full p-2 text-xs border-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          backgroundColor: "var(--window-document-bg-elevated)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {connectedProviderOptions.length === 0 && (
                          <option value={defaultProviderId || "openrouter"}>
                            {defaultProviderId || "openrouter"}
                          </option>
                        )}
                        {connectedProviderOptions.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={agentDefaults?.modelId || fallbackModel}
                        onChange={(event) =>
                          updateAgentDefault(agent._id, { modelId: event.target.value })
                        }
                        className="w-full p-2 text-xs border-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          backgroundColor: "var(--window-document-bg-elevated)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {enabledModels.map((model) => (
                          <option key={model.modelId} value={model.modelId}>
                            {model.modelId}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Voice Runtime Provider Settings */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
          >
            <div className="mb-3">
              <h3
                className="font-bold text-sm mb-1 flex items-center gap-2"
                style={{ color: "var(--window-document-text)" }}
              >
                <Mic size={16} />
                Voice Runtime (ElevenLabs)
              </h3>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Configure your org-level voice runtime provider. If provider health is degraded or offline, runtime falls back to browser voice handling.
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={elevenLabsEnabled}
                onChange={(event) => setElevenLabsEnabled(event.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <span
                  className="font-bold text-sm"
                  style={{ color: "var(--window-document-text)" }}
                >
                  Enable ElevenLabs voice provider
                </span>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Keep disabled to force deterministic browser fallback for all sessions.
                </p>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  ElevenLabs API Key
                </label>
                <input
                  type="password"
                  value={elevenLabsApiKey}
                  onChange={(event) => setElevenLabsApiKey(event.target.value)}
                  placeholder={
                    elevenLabsHasSavedApiKey
                      ? "Stored key present. Enter a new key to rotate."
                      : "xi-api-key..."
                  }
                  className="w-full p-2 text-xs border-2 font-mono"
                  style={{
                    borderColor: "var(--window-document-border)",
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Existing keys are never returned to the client. Enter a value only when setting or rotating the key.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  Base URL
                </label>
                <input
                  type="text"
                  value={elevenLabsBaseUrl}
                  onChange={(event) => setElevenLabsBaseUrl(event.target.value)}
                  placeholder="https://api.elevenlabs.io/v1"
                  className="w-full p-2 text-xs border-2 font-mono"
                  style={{
                    borderColor: "var(--window-document-border)",
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </div>
            </div>

            <div className="mt-3">
              <label
                className="block text-xs font-bold mb-1"
                style={{ color: "var(--window-document-text)" }}
              >
                Default Voice ID (optional)
              </label>
              <input
                type="text"
                value={elevenLabsDefaultVoiceId}
                onChange={(event) => setElevenLabsDefaultVoiceId(event.target.value)}
                placeholder="voice_xxxxx"
                className="w-full p-2 text-xs border-2 font-mono"
                style={{
                  borderColor: "var(--window-document-border)",
                  backgroundColor: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="px-2 py-1 text-xs font-bold"
                style={{
                  backgroundColor: elevenLabsHealthColor,
                  color: "white",
                }}
              >
                Provider health: {elevenLabsHealthLabel}
              </span>
              {elevenLabsHealthReason ? (
                <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Reason: {elevenLabsHealthReason}
                </span>
              ) : null}
            </div>

            <div
              className="mt-3 p-3 border-2 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <p className="font-bold mb-1">Fallback behavior</p>
              <p>
                When ElevenLabs is missing credentials, degraded, or offline, the voice runtime falls back to the browser adapter for local speech behavior. This preserves trust boundaries and prevents provider-side audio calls during degraded health.
              </p>
            </div>

            <div className="mt-3">
              <button
                onClick={handleProbeElevenLabs}
                disabled={isProbingElevenLabs || !organizationId || !sessionId}
                className="desktop-interior-button py-2 px-4 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProbingElevenLabs ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isProbingElevenLabs ? "Testing provider..." : "Test provider health"}
              </button>
            </div>
          </div>

          {/* Tier-gated BYOK Option */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: canUseByok ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
              borderColor: canUseByok ? "var(--window-document-border)" : "var(--warning)",
            }}
          >
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              {canUseByok ? <KeyRound size={16} /> : <Lock size={16} />}
              Bring Your Own Key (OpenRouter)
            </h3>

            {canUseByok ? (
              <>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={useBYOK}
                    onChange={(event) => setUseBYOK(event.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                      Route LLM usage through my OpenRouter key
                    </span>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Billing mode switches to BYOK and uses your provider credential for token spend.
                    </p>
                  </div>
                </label>

                {useBYOK && (
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                      OpenRouter API Key
                    </label>
                    <input
                      type="password"
                      value={openrouterApiKey}
                      onChange={(event) => setOpenrouterApiKey(event.target.value)}
                      placeholder={
                        openrouterHasSavedApiKey
                          ? "Stored key present. Enter a new key to rotate."
                          : "sk-or-v1-..."
                      }
                      className="w-full p-2 text-xs border-2 font-mono"
                      style={{
                        borderColor: "var(--window-document-border)",
                        backgroundColor: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Keys stay redacted in UI/logs. Provide a value only when setting or rotating.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  BYOK routing is locked on the current tier. Platform-managed billing remains active as fallback.
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Required tier: {byokRequiredTier}
                </p>
                <button
                  onClick={handleOpenStore}
                  className="desktop-interior-button py-2 px-3 text-xs font-pixel flex items-center gap-2"
                >
                  <ShoppingCart size={14} />
                  View plans
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4 justify-end">
        {saveSuccess && (
          <div
            className="px-3 py-2 text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'var(--success)',
              color: 'white'
            }}
          >
             Settings saved successfully
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || !organizationId}
          className="desktop-interior-button py-2 px-4 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? t("ui.manage.ai.saving") : t("ui.manage.ai.save_settings")}
        </button>
      </div>

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        title={`Private LLM - ${enterpriseTier.charAt(0).toUpperCase() + enterpriseTier.slice(1)}`}
      />
    </div>
  );
}
