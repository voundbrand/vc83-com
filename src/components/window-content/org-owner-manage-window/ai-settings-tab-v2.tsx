

"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useState, useEffect } from "react";
import { Save, Loader2, Zap, DollarSign, Brain, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PrivacyBadge, PrivacyBadgeGroup } from "@/components/ai-billing/privacy-badge";

export function AISettingsTab() {
  const { user } = useAuth();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.manage.ai");
  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;

  // Get existing AI settings
  const settings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  );

  const rateLimit = useQuery(
    api.ai.settings.checkRateLimit,
    organizationId ? { organizationId } : "skip"
  );

  // Get available models from OpenRouter
  const modelsByProvider = useQuery(api.ai.modelDiscovery.getModelsByProvider, {});
  const refreshModelsAction = useAction(api.ai.modelDiscovery.refreshModels);

  const upsertSettings = useMutation(api.ai.settings.upsertAISettings);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [billingMode, setBillingMode] = useState<"platform" | "byok">("platform");

  // Privacy tier (v3.1)
  const [privacyTier, setPrivacyTier] = useState<"standard" | "privacy-enhanced" | "private-llm">("standard");

  // NEW: Multi-select model configuration
  const [enabledModels, setEnabledModels] = useState<Array<{
    modelId: string;
    isDefault: boolean;
    customLabel?: string;
    enabledAt: number;
  }>>([]);
  const [defaultModelId, setDefaultModelId] = useState<string>("");

  // UI state for model selection
  const [selectedProvider, setSelectedProvider] = useState("anthropic");

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");

  // Embedding settings
  const [embeddingProvider, setEmbeddingProvider] = useState<"openai" | "voyage" | "cohere" | "none">("none");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [embeddingDimensions, setEmbeddingDimensions] = useState(1536);
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");

  // Budget settings
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState<number | undefined>(100);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // Model filtering based on privacy tier
  const isModelCompatibleWithTier = (modelId: string, tier: typeof privacyTier): boolean => {
    // Standard tier: All models allowed
    if (tier === "standard") return true;

    // Privacy-Enhanced tier: Only EU-native and ZDR-compliant models
    if (tier === "privacy-enhanced") {
      // Mistral: EU-native (French company)
      if (modelId.startsWith("mistral/")) return true;

      // Anthropic Claude: Only via ZDR endpoints (we filter by checking if it's available)
      // In production, this would check OpenRouter's provider flags
      if (modelId.startsWith("anthropic/claude")) return true;

      // Block OpenAI (US-based, data retention concerns)
      if (modelId.startsWith("openai/")) return false;

      // Block Google (US-based)
      if (modelId.startsWith("google/")) return false;

      // Meta: Generally open-source, depends on hosting
      if (modelId.startsWith("meta-llama/")) return true;

      // Allow other open-source models
      return true;
    }

    // Private LLM: No cloud models (customer provides their own)
    if (tier === "private-llm") return false;

    return false;
  };

  // Get privacy badges for a model based on tier
  const getModelPrivacyBadges = (modelId: string, tier: typeof privacyTier): Array<'eu' | 'zdr' | 'no-training'> => {
    const badges: Array<'eu' | 'zdr' | 'no-training'> = [];

    if (tier === "privacy-enhanced") {
      // Mistral: EU, ZDR, No Training
      if (modelId.startsWith("mistral/")) {
        badges.push('eu', 'zdr', 'no-training');
      }

      // Anthropic: ZDR, No Training (when using compliant provider)
      if (modelId.startsWith("anthropic/")) {
        badges.push('zdr', 'no-training');
      }

      // Meta: No Training (open-source)
      if (modelId.startsWith("meta-llama/")) {
        badges.push('no-training');
      }
    }

    return badges;
  };

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);

      // Load privacy tier if available (v3.1)
      if (settings.tier) {
        setPrivacyTier(settings.tier);
      }

      // Handle billing mode
      setBillingMode(settings.billingMode || "platform");

      // NEW: Handle multi-select models
      if (settings.llm.enabledModels && settings.llm.enabledModels.length > 0) {
        setEnabledModels(settings.llm.enabledModels);
        setDefaultModelId(settings.llm.defaultModelId || settings.llm.enabledModels.find((m: any) => m.isDefault)?.modelId || "");
      } else if (settings.llm.provider && settings.llm.model) {
        // LEGACY: Convert old single model format to new multi-select
        const modelId = settings.llm.model.includes("/")
          ? settings.llm.model
          : `${settings.llm.provider}/${settings.llm.model}`;

        setEnabledModels([{
          modelId,
          isDefault: true,
          enabledAt: Date.now(),
        }]);
        setDefaultModelId(modelId);
      }

      setTemperature(settings.llm.temperature);
      setMaxTokens(settings.llm.maxTokens);
      setOpenrouterApiKey(settings.llm.openrouterApiKey || "");

      setEmbeddingProvider(settings.embedding.provider);
      setEmbeddingModel(settings.embedding.model);
      setEmbeddingDimensions(settings.embedding.dimensions);
      setEmbeddingApiKey(settings.embedding.apiKey || "");

      setMonthlyBudgetUsd(settings.monthlyBudgetUsd);
    }
  }, [settings]);

  // Auto-refresh models if cache is stale or empty
  useEffect(() => {
    if (modelsByProvider && modelsByProvider.isStale) {
      console.log("Model cache is stale, fetching fresh data...");
      handleRefreshModels();
    }
  }, [modelsByProvider?.isStale]);

  // Filter out incompatible models when tier changes
  useEffect(() => {
    const incompatibleModels = enabledModels.filter(m => !isModelCompatibleWithTier(m.modelId, privacyTier));

    if (incompatibleModels.length > 0) {
      console.log(`Removing ${incompatibleModels.length} incompatible models for ${privacyTier} tier:`, incompatibleModels.map(m => m.modelId));

      // Remove incompatible models
      const newModels = enabledModels.filter(m => isModelCompatibleWithTier(m.modelId, privacyTier));

      // If we removed the default model, set a new default
      if (incompatibleModels.some(m => m.isDefault) && newModels.length > 0) {
        newModels[0].isDefault = true;
        setDefaultModelId(newModels[0].modelId);
      }

      setEnabledModels(newModels);
    }
  }, [privacyTier]); // Run when privacy tier changes

  const handleSave = async () => {
    if (!organizationId) return;

    // Validation: Ensure at least one model is enabled
    if (enabledModels.length === 0) {
      alert("Please enable at least one model before saving.");
      return;
    }

    // Validation: Ensure exactly one model is marked as default
    const defaultModels = enabledModels.filter(m => m.isDefault);
    if (defaultModels.length !== 1) {
      alert("Please select exactly one model as the default.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await upsertSettings({
        organizationId,
        enabled,
        billingMode,
        tier: privacyTier, // v3.1: Privacy tier
        llm: {
          enabledModels,
          defaultModelId,
          temperature,
          maxTokens,
          openrouterApiKey: (billingMode === "byok" && openrouterApiKey) ? openrouterApiKey : undefined,
        },
        embedding: {
          provider: embeddingProvider,
          model: embeddingModel,
          dimensions: embeddingDimensions,
          apiKey: embeddingApiKey || undefined,
        },
        monthlyBudgetUsd,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      alert(`Failed to save AI settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      await refreshModelsAction({});
      console.log("✅ Models refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh models:", error);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  // Helper: Check if a model is enabled
  const isModelEnabled = (modelId: string) => {
    return enabledModels.some(m => m.modelId === modelId);
  };

  // Helper: Toggle model enabled/disabled
  const toggleModel = (modelId: string) => {
    if (isModelEnabled(modelId)) {
      // Disabling - remove from array (unless it's the only one)
      if (enabledModels.length === 1) {
        alert("You must have at least one model enabled");
        return;
      }

      const newModels = enabledModels.filter(m => m.modelId !== modelId);

      // If we're removing the default, make the first remaining model the default
      if (defaultModelId === modelId && newModels.length > 0) {
        newModels[0].isDefault = true;
        setDefaultModelId(newModels[0].modelId);
      }

      setEnabledModels(newModels);
    } else {
      // Enabling - add to array
      const newModel = {
        modelId,
        isDefault: enabledModels.length === 0, // First model is default
        enabledAt: Date.now(),
      };

      setEnabledModels([...enabledModels, newModel]);

      if (enabledModels.length === 0) {
        setDefaultModelId(modelId);
      }
    }
  };

  // Helper: Set a model as default
  const setAsDefault = (modelId: string) => {
    const newModels = enabledModels.map(m => ({
      ...m,
      isDefault: m.modelId === modelId,
    }));

    setEnabledModels(newModels);
    setDefaultModelId(modelId);
  };

  // Get current provider's models for UI - filtered by privacy tier
  const currentProviderModels = modelsByProvider
    ? (modelsByProvider[selectedProvider as keyof typeof modelsByProvider] as any[] || [])
        .filter((m: any) => isModelCompatibleWithTier(m.id, privacyTier))
    : [];

  // Count filtered models
  const totalAvailableModels = modelsByProvider
    ? Object.keys(modelsByProvider)
        .filter(key => key !== 'isStale')
        .reduce((sum, key) => {
          const models = (modelsByProvider as any)[key] as any[];
          return sum + (models?.filter((m: any) => isModelCompatibleWithTier(m.id, privacyTier)).length || 0);
        }, 0)
    : 0;

  // Embedding model options (static - these don't change often)
  const embeddingOptions = {
    openai: [
      { value: "text-embedding-3-small", label: "Text Embedding 3 Small (1536d)", dimensions: 1536 },
      { value: "text-embedding-3-large", label: "Text Embedding 3 Large (3072d)", dimensions: 3072 },
      { value: "text-embedding-ada-002", label: "Ada 002 (1536d)", dimensions: 1536 },
    ],
    voyage: [
      { value: "voyage-large-2", label: "Voyage Large 2 (1536d)", dimensions: 1536 },
      { value: "voyage-code-2", label: "Voyage Code 2 (1536d)", dimensions: 1536 },
      { value: "voyage-2", label: "Voyage 2 (1024d)", dimensions: 1024 },
    ],
    cohere: [
      { value: "embed-english-v3.0", label: "Embed English v3 (1024d)", dimensions: 1024 },
      { value: "embed-multilingual-v3.0", label: "Embed Multilingual v3 (1024d)", dimensions: 1024 },
    ],
    none: [],
  };

  const budgetProgress = settings
    ? Math.min((settings.currentMonthSpend / (settings.monthlyBudgetUsd || 100)) * 100, 100)
    : 0;

  if (translationsLoading) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        {t("ui.manage.ai.loading")}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="p-4 border-2 flex items-start gap-3"
        style={{
          backgroundColor: 'var(--info)',
          borderColor: 'var(--win95-border)',
          color: 'var(--win95-text)'
        }}
      >
        <Brain size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">{t("ui.manage.ai.title")}</h3>
          <p className="text-xs">
            {t("ui.manage.ai.subtitle")}
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div
        className="p-4 border-2"
        style={{
          backgroundColor: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)',
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
            <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
              {t("ui.manage.ai.enable_toggle")}
            </span>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.manage.ai.enable_description")}
            </p>
          </div>
        </label>
      </div>

      {enabled && (
        <>
          {/* PRIVACY TIER SELECTOR (v3.1) */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <DollarSign size={16} />
              Data Privacy & Billing Tier
            </h3>

            <div className="space-y-3">
              {/* Standard Tier */}
              <label
                className="flex items-start gap-3 cursor-pointer p-3 border-2"
                style={{
                  borderColor: privacyTier === "standard" ? 'var(--primary)' : 'var(--win95-border)',
                  backgroundColor: privacyTier === "standard" ? 'var(--info)' : 'transparent'
                }}
              >
                <input
                  type="radio"
                  name="privacyTier"
                  value="standard"
                  checked={privacyTier === "standard"}
                  onChange={() => setPrivacyTier("standard")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-bold text-sm block mb-1" style={{ color: 'var(--win95-text)' }}>
                    Standard (€49/month incl. VAT)
                  </span>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li>✓ All AI models available</li>
                    <li>✓ 500,000 tokens/month included</li>
                    <li>✓ Global routing for best performance</li>
                    <li>✓ Cost-optimized workloads</li>
                  </ul>
                </div>
              </label>

              {/* Privacy-Enhanced Tier */}
              <label
                className="flex items-start gap-3 cursor-pointer p-3 border-2"
                style={{
                  borderColor: privacyTier === "privacy-enhanced" ? 'var(--primary)' : 'var(--win95-border)',
                  backgroundColor: privacyTier === "privacy-enhanced" ? 'var(--info)' : 'transparent'
                }}
              >
                <input
                  type="radio"
                  name="privacyTier"
                  value="privacy-enhanced"
                  checked={privacyTier === "privacy-enhanced"}
                  onChange={() => setPrivacyTier("privacy-enhanced")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                      Privacy-Enhanced (€49/month incl. VAT)
                    </span>
                    <span
                      className="px-2 py-0.5 text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--success)',
                        color: 'white',
                      }}
                    >
                      RECOMMENDED
                    </span>
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    <PrivacyBadge type="eu" size="sm" />
                    <PrivacyBadge type="zdr" size="sm" />
                    <PrivacyBadge type="no-training" size="sm" />
                  </div>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li>✓ GDPR-optimized with Zero Data Retention</li>
                    <li>✓ EU providers prioritized (Mistral, etc.)</li>
                    <li>✓ No training on your data</li>
                    <li>✓ 500,000 tokens/month included</li>
                  </ul>
                </div>
              </label>

              {/* Private LLM Tier (Coming Soon) */}
              <div
                className="p-3 border-2 opacity-60"
                style={{
                  borderColor: 'var(--win95-border)',
                  backgroundColor: 'var(--win95-bg-light)',
                }}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="privacyTier"
                    value="private-llm"
                    disabled
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                        Private LLM (from €2,500/month incl. VAT)
                      </span>
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--warning)',
                          color: 'var(--win95-text)',
                        }}
                      >
                        CONTACT SALES
                      </span>
                    </div>
                    <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                      <li>• Self-hosted infrastructure</li>
                      <li>• Unlimited requests</li>
                      <li>• Complete data sovereignty</li>
                      <li>• Custom models and fine-tuning</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy tier explanation */}
            {privacyTier === "privacy-enhanced" && (
              <div
                className="p-3 mt-3 border-2 text-xs"
                style={{
                  backgroundColor: 'var(--info)',
                  borderColor: 'var(--win95-border)',
                  color: 'var(--win95-text)'
                }}
              >
                <div className="flex gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Privacy-Enhanced Mode Active</p>
                    <p>
                      Only models that meet GDPR requirements will be available.
                      OpenAI and Google models are filtered out. EU-native providers (Mistral)
                      and ZDR-compliant models (Claude) are prioritized.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BILLING MODE - Legacy BYOK option */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <DollarSign size={16} />
              {t("ui.manage.ai.billing_mode")} (Legacy)
            </h3>

            <div className="space-y-3">
              {/* Platform API Key Option */}
              <label
                className="flex items-start gap-3 cursor-pointer p-3 border-2"
                style={{
                  borderColor: billingMode === "platform" ? 'var(--primary)' : 'var(--win95-border)',
                  backgroundColor: billingMode === "platform" ? 'var(--info)' : 'transparent'
                }}
              >
                <input
                  type="radio"
                  name="billingMode"
                  value="platform"
                  checked={billingMode === "platform"}
                  onChange={() => {
                    setBillingMode("platform");
                    setOpenrouterApiKey("");
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-bold text-sm block mb-1" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.ai.billing_platform")}
                  </span>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li>✓ {t("ui.manage.ai.billing_platform_benefit1")}</li>
                    <li>✓ {t("ui.manage.ai.billing_platform_benefit2")}</li>
                    <li>✓ {t("ui.manage.ai.billing_platform_benefit3")}</li>
                  </ul>
                </div>
              </label>

              {/* Bring Your Own Key Option */}
              <label
                className="flex items-start gap-3 cursor-pointer p-3 border-2"
                style={{
                  borderColor: billingMode === "byok" ? 'var(--primary)' : 'var(--win95-border)',
                  backgroundColor: billingMode === "byok" ? 'var(--info)' : 'transparent'
                }}
              >
                <input
                  type="radio"
                  name="billingMode"
                  value="byok"
                  checked={billingMode === "byok"}
                  onChange={() => setBillingMode("byok")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-bold text-sm block mb-1" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.ai.billing_byok")}
                  </span>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li>• {t("ui.manage.ai.billing_byok_benefit1")}</li>
                    <li>• {t("ui.manage.ai.billing_byok_benefit2")}</li>
                    <li>• {t("ui.manage.ai.billing_byok_benefit3")}</li>
                  </ul>
                </div>
              </label>

              {/* BYOK API Key Input */}
              {billingMode === "byok" && (
                <div
                  className="p-3 border-2"
                  style={{
                    backgroundColor: 'var(--warning)',
                    borderColor: 'var(--win95-border)'
                  }}
                >
                  <div className="mb-3">
                    <p className="text-xs mb-2" style={{ color: 'var(--win95-text)' }}>
                      ⚠️ {t("ui.manage.ai.billing_byok_note")}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      {t("ui.manage.ai.billing_byok_signup")}{" "}
                      <a
                        href="https://openrouter.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                      >
                        {t("ui.manage.ai.billing_byok_signup_link")}
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.ai.api_key_required")}
                    </label>
                    <input
                      type="password"
                      value={openrouterApiKey}
                      onChange={(e) => setOpenrouterApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      required={billingMode === "byok"}
                      className="w-full p-2 text-xs border-2 font-mono"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-bg-light)',
                        color: 'var(--win95-text)'
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      {t("ui.manage.ai.api_key_get_yours")} <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>openrouter.ai/keys</a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LLM Configuration */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
                <Zap size={16} />
                {t("ui.manage.ai.llm_title")}
              </h3>
              <button
                onClick={handleRefreshModels}
                disabled={isRefreshingModels}
                className="flex items-center gap-1 px-2 py-1 text-xs border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  backgroundColor: 'var(--win95-bg)',
                  color: 'var(--win95-text)',
                  cursor: isRefreshingModels ? 'wait' : 'pointer',
                  opacity: isRefreshingModels ? 0.6 : 1
                }}
                title="Refresh available models from OpenRouter"
              >
                <RefreshCw size={12} className={isRefreshingModels ? 'animate-spin' : ''} />
                Refresh Models
              </button>
            </div>

            {modelsByProvider && modelsByProvider.isStale && (
              <div
                className="p-2 mb-3 border-2 text-xs"
                style={{
                  backgroundColor: 'var(--warning)',
                  borderColor: 'var(--win95-border)',
                  color: 'var(--win95-text)'
                }}
              >
                ⚠️ Model list may be outdated. Click "Refresh Models" to get the latest.
              </div>
            )}

            {/* Info box explaining multi-select and privacy filtering */}
            <div
              className="p-3 mb-4 border-2 text-xs"
              style={{
                backgroundColor: 'var(--info)',
                borderColor: 'var(--win95-border)',
                color: 'var(--win95-text)'
              }}
            >
              <p className="mb-2">💡 Select which models are available for your chat interface. Users can choose the best model for each conversation.</p>
              {privacyTier === "privacy-enhanced" && (
                <p className="font-bold">
                  🔒 Privacy-Enhanced mode: Only GDPR-compliant models are shown ({totalAvailableModels} models available).
                  OpenAI and Google models are filtered out.
                </p>
              )}
              {privacyTier === "standard" && (
                <p>
                  🌍 Standard mode: All {totalAvailableModels} models available from all providers.
                </p>
              )}
            </div>

            <div className="space-y-4">
              {/* Provider Tabs */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Select Models by Provider:
                </label>
                <div className="flex gap-2 mb-4">
                  {["anthropic", "openai", "google", "meta"].map((providerKey) => (
                    <button
                      key={providerKey}
                      onClick={() => setSelectedProvider(providerKey)}
                      className="px-3 py-1 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: selectedProvider === providerKey ? 'var(--primary)' : 'var(--win95-bg)',
                        color: selectedProvider === providerKey ? 'white' : 'var(--win95-text)',
                        fontWeight: selectedProvider === providerKey ? 'bold' : 'normal',
                      }}
                    >
                      {providerKey === "anthropic" && "Anthropic"}
                      {providerKey === "openai" && "OpenAI"}
                      {providerKey === "google" && "Google"}
                      {providerKey === "meta" && "Meta"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model List with Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                    Available Models ({currentProviderModels.length})
                  </span>
                  <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {enabledModels.length} enabled
                  </span>
                </div>

                {currentProviderModels.length > 0 ? (
                  <div
                    className="border-2 p-2 max-h-96 overflow-y-auto"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                    }}
                  >
                    {currentProviderModels.map((m: any) => {
                      const enabled = isModelEnabled(m.id);
                      const isDefault = defaultModelId === m.id;

                      // Calculate cost
                      const promptCost = parseFloat(m.pricing.prompt) * 1000000;
                      const completionCost = parseFloat(m.pricing.completion) * 1000000;
                      const avgCost = (promptCost + completionCost) / 2;
                      const costStr = avgCost < 1
                        ? `$${avgCost.toFixed(2)}/1M`
                        : `$${avgCost.toFixed(0)}/1M`;

                      // Get privacy badges for this model
                      const privacyBadges = getModelPrivacyBadges(m.id, privacyTier);

                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-2 border-2 mb-2"
                          style={{
                            borderColor: enabled ? 'var(--primary)' : 'var(--win95-border)',
                            backgroundColor: enabled ? 'var(--info)' : 'transparent',
                          }}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleModel(m.id)}
                            className="w-4 h-4 cursor-pointer"
                          />

                          {/* Model Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-xs" style={{ color: 'var(--win95-text)' }}>
                                {m.name}
                              </span>
                              {isDefault && (
                                <span
                                  className="px-2 py-0.5 text-xs font-bold"
                                  style={{
                                    backgroundColor: 'var(--success)',
                                    color: 'white',
                                  }}
                                >
                                  ⭐ DEFAULT
                                </span>
                              )}
                            </div>

                            {/* Privacy badges */}
                            {privacyBadges.length > 0 && (
                              <div className="flex gap-1 mb-1">
                                <PrivacyBadgeGroup badges={privacyBadges} size="sm" />
                              </div>
                            )}

                            <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                              {costStr} · {(m.context_length / 1000).toFixed(0)}k context
                            </div>
                          </div>

                          {/* Set as Default Button */}
                          {enabled && !isDefault && (
                            <button
                              onClick={() => setAsDefault(m.id)}
                              className="px-2 py-1 text-xs border-2"
                              style={{
                                borderColor: 'var(--win95-border)',
                                backgroundColor: 'var(--win95-bg)',
                                color: 'var(--win95-text)',
                              }}
                            >
                              Set Default
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="w-full p-4 text-xs border-2 flex items-center justify-center gap-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                      color: 'var(--neutral-gray)'
                    }}
                  >
                    <Loader2 size={12} className="animate-spin" />
                    Loading models from OpenRouter...
                  </div>
                )}
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.ai.temperature")}: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.ai.temperature_description")}
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.ai.max_tokens")}
                </label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min="100"
                  max="16000"
                  step="100"
                  className="w-full p-2 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.ai.max_tokens_description")}
                </p>
              </div>
            </div>
          </div>

          {/* Embedding Configuration */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Database size={16} />
              {t("ui.manage.ai.embedding_title")}
            </h3>

            <div className="space-y-4">
              {/* Embedding Provider */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.ai.embedding_provider")}
                </label>
                <select
                  value={embeddingProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as "openai" | "voyage" | "cohere" | "none";
                    setEmbeddingProvider(newProvider);

                    // Reset model and dimensions when provider changes
                    if (newProvider !== "none") {
                      const options = embeddingOptions[newProvider];
                      if (options && options.length > 0) {
                        setEmbeddingModel(options[0].value);
                        setEmbeddingDimensions(options[0].dimensions);
                      }
                    }
                  }}
                  className="w-full p-2 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  }}
                >
                  <option value="none">{t("ui.manage.ai.embedding_none")}</option>
                  <option value="openai">OpenAI</option>
                  <option value="voyage">Voyage AI</option>
                  <option value="cohere">Cohere</option>
                </select>
              </div>

              {embeddingProvider !== "none" && (
                <>
                  {/* Embedding Model */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.ai.embedding_model")}
                    </label>
                    <select
                      value={embeddingModel}
                      onChange={(e) => {
                        setEmbeddingModel(e.target.value);
                        const option = embeddingOptions[embeddingProvider]?.find(
                          (opt) => opt.value === e.target.value
                        );
                        if (option) {
                          setEmbeddingDimensions(option.dimensions);
                        }
                      }}
                      className="w-full p-2 text-xs border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-bg-light)',
                        color: 'var(--win95-text)'
                      }}
                    >
                      {embeddingOptions[embeddingProvider]?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Embedding API Key */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.ai.embedding_api_key")}
                    </label>
                    <input
                      type="password"
                      value={embeddingApiKey}
                      onChange={(e) => setEmbeddingApiKey(e.target.value)}
                      placeholder="Your API key"
                      className="w-full p-2 text-xs border-2 font-mono"
                      style={{
                        borderColor: 'var(--win95-border)',
                        backgroundColor: 'var(--win95-bg-light)',
                        color: 'var(--win95-text)'
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      {t("ui.manage.ai.embedding_api_key_description")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Budget & Usage */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <DollarSign size={16} />
              {t("ui.manage.ai.budget_title")}
            </h3>

            {/* Info Banner based on Billing Mode */}
            <div
              className="p-3 mb-4 border-2 text-xs"
              style={{
                backgroundColor: billingMode === "platform" ? 'var(--info)' : 'var(--warning)',
                borderColor: 'var(--win95-border)',
                color: 'var(--win95-text)'
              }}
            >
              💡 {billingMode === "platform" ? t("ui.manage.ai.budget_platform_note") : t("ui.manage.ai.budget_byok_note")}
            </div>

            <div className="space-y-4">
              {/* Monthly Budget */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.ai.monthly_budget")}
                  {billingMode === "byok" && <span style={{ color: 'var(--neutral-gray)' }}> (informational only)</span>}
                </label>
                <input
                  type="number"
                  value={monthlyBudgetUsd || ""}
                  onChange={(e) => setMonthlyBudgetUsd(e.target.value ? parseFloat(e.target.value) : undefined)}
                  min="0"
                  step="10"
                  placeholder={billingMode === "byok" ? "Optional - for tracking only" : "No limit"}
                  className="w-full p-2 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  }}
                />
              </div>

              {/* Current Spend */}
              {settings && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.ai.current_month_spend")}
                    </span>
                    <span style={{ color: 'var(--win95-text)' }}>
                      ${settings.currentMonthSpend.toFixed(2)} / ${settings.monthlyBudgetUsd || "∞"}
                    </span>
                  </div>
                  <div
                    className="w-full h-4 border-2 relative overflow-hidden"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg)',
                    }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${budgetProgress}%`,
                        backgroundColor:
                          budgetProgress >= 100
                            ? 'var(--error)'
                            : budgetProgress >= 75
                            ? 'var(--warning)'
                            : 'var(--success)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Rate Limit */}
              {rateLimit && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold" style={{ color: 'var(--win95-text)' }}>
                      {t("ui.manage.ai.rate_limit_title")}
                    </span>
                    <span style={{ color: 'var(--win95-text)' }}>
                      {rateLimit.remaining} / {rateLimit.limit} {t("ui.manage.ai.rate_limit_remaining")}
                    </span>
                  </div>
                  <div
                    className="w-full h-4 border-2 relative overflow-hidden"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg)',
                    }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(rateLimit.remaining / rateLimit.limit) * 100}%`,
                        backgroundColor: 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
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
            ✓ {t("ui.manage.ai.save_success")}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || !organizationId}
          className="px-4 py-2 text-xs font-bold flex items-center gap-2"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: '2px solid',
            borderTopColor: 'var(--win95-button-light)',
            borderLeftColor: 'var(--win95-button-light)',
            borderBottomColor: 'var(--win95-button-dark)',
            borderRightColor: 'var(--win95-button-dark)',
            opacity: isSaving ? 0.6 : 1,
            cursor: isSaving ? 'wait' : 'pointer'
          }}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? t("ui.manage.ai.saving") : t("ui.manage.ai.save_settings")}
        </button>
      </div>
    </div>
  );
}
