"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useState, useEffect } from "react";
import { Save, Loader2, Brain, AlertTriangle, Lock, CreditCard, CheckCircle2, XCircle, ShoppingCart, Check } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PrivacyBadge } from "@/components/ai-billing/privacy-badge";
import { useWindowManager } from "@/hooks/use-window-manager";
import { StoreWindow } from "../store-window";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";

export function AISettingsTabV3() {
  const { user } = useAuth();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.manage.ai");
  const { openWindow } = useWindowManager();
  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;

  // Check if user is super admin (only super admin can use BYOK)
  // TODO: Add role field to User type or check via a query
  const isSuperAdmin = false; // For now, disabled until we add proper super admin detection

  // Get existing AI settings
  const settings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  );

  // Get subscription status
  const subscriptionStatus = useQuery(
    api.ai.billing.getSubscriptionStatus,
    organizationId ? { organizationId } : "skip"
  );

  const upsertSettings = useMutation(api.ai.settings.upsertAISettings);

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

  // Super admin only: BYOK option
  const [useBYOK, setUseBYOK] = useState(false);
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Enterprise contact modal state
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [enterpriseTier, setEnterpriseTier] = useState<"starter" | "professional" | "enterprise">("starter");

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
        setDefaultModelId(settings.llm.defaultModelId || settings.llm.enabledModels.find(m => m.isDefault)?.modelId || "");
      } else {
        // If no models saved, auto-select all models for current tier
        const models = getAllModelsForTier(settings.tier || "standard");
        const enabledModels = models.map((m, index) => ({
          modelId: m.id,
          isDefault: index === 0, // First model is default
          enabledAt: Date.now()
        }));
        setEnabledModels(enabledModels);
        if (enabledModels.length > 0) {
          setDefaultModelId(enabledModels[0].modelId);
        }
      }

      if (settings.billingMode === "byok" && settings.llm.openrouterApiKey) {
        setUseBYOK(true);
        setOpenrouterApiKey(settings.llm.openrouterApiKey);
      }
    }
  }, [settings]);

  // Auto-select POPULAR models when tier changes (smart defaults)
  useEffect(() => {
    const allModels = getAllModelsForTier(tier);
    const allModelIds = allModels.map(m => m.id);

    // If no models are enabled, or tier changed and incompatible models exist
    const hasIncompatibleModels = enabledModels.some(m => !allModelIds.includes(m.modelId));

    if (enabledModels.length === 0 || hasIncompatibleModels) {
      // Define popular models to pre-select (6-7 models per tier)
      let popularModelIds: string[];

      if (tier === "standard") {
        // Standard tier: Most popular models across providers
        popularModelIds = [
          "anthropic/claude-sonnet-4",      // RECOMMENDED - Best overall
          "openai/gpt-4o",                  // OpenAI flagship
          "mistral/mistral-large",          // EU option
          "anthropic/claude-3.5-sonnet",    // Fast Claude
          "openai/gpt-3.5-turbo",           // Budget-friendly
          "google/gemini-pro",              // Google's best
          "meta-llama/llama-3.1-70b"        // Open source
        ];
      } else if (tier === "privacy-enhanced") {
        // Privacy-Enhanced tier: GDPR-compliant popular models
        popularModelIds = [
          "mistral/mistral-large",          // RECOMMENDED - EU, ZDR
          "anthropic/claude-sonnet-4",      // ZDR compliant
          "anthropic/claude-3.5-sonnet",    // Fast ZDR option
          "mistral/mistral-medium",         // Balanced EU option
          "meta-llama/llama-3.1-70b"        // Open source
        ];
      } else {
        popularModelIds = [];
      }

      // Only select models that exist in the tier
      const newModels = allModels
        .filter(m => popularModelIds.includes(m.id))
        .map((m, index) => ({
          modelId: m.id,
          isDefault: index === 0, // First popular model is default
          enabledAt: Date.now()
        }));

      // Set first model as the default
      if (newModels.length > 0) {
        newModels[0].isDefault = true;
        setDefaultModelId(newModels[0].modelId);
      }

      setEnabledModels(newModels);
    }
  }, [tier]);

  // Model type definition
  type ModelOption = {
    id: string;
    name: string;
    location: string; // Flag emoji for location
    zdr: boolean; // Zero Data Retention
    noTraining: boolean; // No training on data
    description: string;
    recommended?: boolean;
  };

  // Get all available models for a tier
  const getAllModelsForTier = (tierValue: typeof tier): ModelOption[] => {
    if (tierValue === "standard") {
      // Standard tier: Comprehensive list of all major models
      return [
        // Mistral (EU - France)
        { id: "mistral/mistral-large", name: "Mistral Large", location: "🇪🇺", zdr: true, noTraining: true, description: "Most capable Mistral model. 128k context." },
        { id: "mistral/mistral-medium", name: "Mistral Medium", location: "🇪🇺", zdr: true, noTraining: true, description: "Balanced performance. 32k context." },
        { id: "mistral/mistral-small", name: "Mistral Small", location: "🇪🇺", zdr: true, noTraining: true, description: "Fast and efficient. 32k context." },

        // Anthropic Claude (US - with ZDR option)
        { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", location: "🇺🇸", zdr: true, noTraining: true, description: "Latest Claude. 200k context.", recommended: true },
        { id: "anthropic/claude-opus", name: "Claude Opus", location: "🇺🇸", zdr: true, noTraining: true, description: "Most powerful Claude. 200k context." },
        { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", location: "🇺🇸", zdr: true, noTraining: true, description: "Fast and capable. 200k context." },

        // OpenAI (US)
        { id: "openai/gpt-4o", name: "GPT-4o", location: "🇺🇸", zdr: false, noTraining: false, description: "Multimodal flagship. 128k context." },
        { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", location: "🇺🇸", zdr: false, noTraining: false, description: "Fast GPT-4. 128k context." },
        { id: "openai/gpt-4", name: "GPT-4", location: "🇺🇸", zdr: false, noTraining: false, description: "Original GPT-4. 8k context." },
        { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", location: "🇺🇸", zdr: false, noTraining: false, description: "Fast and affordable. 16k context." },

        // Google (US)
        { id: "google/gemini-pro", name: "Gemini Pro", location: "🇺🇸", zdr: false, noTraining: false, description: "Google's best model. 32k context." },
        { id: "google/gemini-pro-vision", name: "Gemini Pro Vision", location: "🇺🇸", zdr: false, noTraining: false, description: "Multimodal Gemini. 32k context." },

        // Meta (Open Source - varies by hosting)
        { id: "meta-llama/llama-3.1-70b", name: "Llama 3.1 70B", location: "🌍", zdr: true, noTraining: true, description: "Open source. 128k context." },
        { id: "meta-llama/llama-3.1-8b", name: "Llama 3.1 8B", location: "🌍", zdr: true, noTraining: true, description: "Fast open source. 128k context." },

        // Cohere (Canada)
        { id: "cohere/command-r-plus", name: "Command R+", location: "🇨🇦", zdr: false, noTraining: false, description: "Enterprise RAG model. 128k context." },
        { id: "cohere/command-r", name: "Command R", location: "🇨🇦", zdr: false, noTraining: false, description: "Efficient RAG model. 128k context." },
      ];
    } else if (tierValue === "privacy-enhanced") {
      // Privacy-Enhanced tier: Only GDPR-compliant models
      return [
        {
          id: "mistral/mistral-large",
          name: "Mistral Large",
          location: "🇪🇺",
          zdr: true,
          noTraining: true,
          description: "Most capable Mistral model. 128k context.",
          recommended: true
        },
        {
          id: "mistral/mistral-medium",
          name: "Mistral Medium",
          location: "🇪🇺",
          zdr: true,
          noTraining: true,
          description: "Balanced performance. 32k context."
        },
        {
          id: "mistral/mistral-small",
          name: "Mistral Small",
          location: "🇪🇺",
          zdr: true,
          noTraining: true,
          description: "Fast and efficient. 32k context."
        },
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          location: "🇺🇸",
          zdr: true,
          noTraining: true,
          description: "Latest Claude with ZDR. 200k context."
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          location: "🇺🇸",
          zdr: true,
          noTraining: true,
          description: "Fast Claude with ZDR. 200k context."
        },
        {
          id: "meta-llama/llama-3.1-70b",
          name: "Llama 3.1 70B",
          location: "🌍",
          zdr: true,
          noTraining: true,
          description: "Open source. 128k context."
        },
      ];
    }
    return [];
  };

  const availableModels = getAllModelsForTier(tier);

  // Helper functions for model management
  const isModelEnabled = (modelId: string) => enabledModels.some(m => m.modelId === modelId);

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

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await upsertSettings({
        organizationId,
        enabled,
        billingMode: useBYOK && isSuperAdmin ? "byok" : "platform",
        tier,
        llm: {
          enabledModels,
          defaultModelId,
          temperature: 0.7,
          maxTokens: 4000,
          openrouterApiKey: (useBYOK && isSuperAdmin && openrouterApiKey) ? openrouterApiKey : undefined,
        },
        embedding: {
          provider: "none",
          model: "",
          dimensions: 0,
        },
        monthlyBudgetUsd: undefined,
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
        Not authenticated
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

  // Format price for display
  const formatPrice = (cents: number) => {
    const euros = cents / 100;
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
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
                borderColor: 'var(--win95-border)',
                color: 'white'
              }}
            >
              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm mb-1">
                  {subscriptionStatus.tier === "standard" && "Standard Plan Active"}
                  {subscriptionStatus.tier === "privacy-enhanced" && "Privacy-Enhanced Plan Active"}
                  {subscriptionStatus.tier === "private-llm" && "Private LLM Plan Active"}
                </h3>
                <p className="text-xs">
                  {formatPrice(subscriptionStatus.priceInCents)}/month •{" "}
                  {formatTokens(subscriptionStatus.includedTokensUsed)}/{formatTokens(subscriptionStatus.includedTokensTotal)} tokens used
                </p>
                <button
                  onClick={handleOpenStore}
                  className="mt-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-white/20 text-white hover:bg-white/30 flex items-center gap-1"
                >
                  <ShoppingCart size={12} />
                  Browse Store
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 border-2 flex items-start gap-3"
              style={{
                backgroundColor: 'var(--warning)',
                borderColor: 'var(--win95-border)',
                color: 'var(--win95-text)'
              }}
            >
              <XCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm mb-1">Subscribe to Activate AI Features</h3>
                <p className="text-xs mb-2">
                  Choose a plan to enable AI-powered features for your organization.
                </p>
                <button
                  onClick={handleOpenStore}
                  className="px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                >
                  <ShoppingCart size={14} />
                  Open Store
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
          borderColor: 'var(--win95-border)',
          color: 'var(--win95-text)'
        }}
      >
        <Brain size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">AI Configuration</h3>
          <p className="text-xs">
            Configure AI features for your organization. Choose your privacy tier and preferred models.
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
              Enable AI Features
            </span>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Turn on AI-powered features for your organization
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
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--win95-text)' }}>
              Data Privacy Level
            </h3>

            <div className="space-y-4">
              {/* Platform Tiers Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Standard Tier */}
                <label
                  className="flex items-start gap-3 cursor-pointer p-3 border-2"
                  style={{
                    borderColor: tier === "standard" ? 'var(--primary)' : 'var(--win95-border)',
                    backgroundColor: tier === "standard" ? 'var(--win95-bg-light)' : 'transparent'
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
                    <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                      Standard
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      €49/month incl. VAT
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    All models available. Data may be processed globally.
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li>✓ All AI models</li>
                    <li>✓ 500,000 tokens/month included</li>
                    <li>✓ Global routing</li>
                  </ul>
                </div>
              </label>

                {/* Privacy-Enhanced Tier */}
                <label
                  className="flex items-start gap-3 cursor-pointer p-3 border-2"
                  style={{
                    borderColor: tier === "privacy-enhanced" ? 'var(--primary)' : 'var(--win95-border)',
                    backgroundColor: tier === "privacy-enhanced" ? 'var(--win95-bg-light)' : 'transparent'
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
                    <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                      Privacy-Enhanced
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
                  <span className="text-xs block mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    €49/month incl. VAT
                  </span>
                  <div className="flex gap-1.5 mb-2">
                    <PrivacyBadge type="eu" size="sm" />
                    <PrivacyBadge type="zdr" size="sm" />
                    <PrivacyBadge type="no-training" size="sm" />
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    Zero Data Retention. EU providers prioritized.
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                    <li>✓ GDPR-optimized</li>
                    <li>✓ No training on your data</li>
                    <li>✓ 500,000 tokens/month included</li>
                  </ul>
                </div>
              </label>
              </div>

              {/* Private LLM Tiers Section Header */}
              <div>
                <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Private LLM Hosting
                </h4>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  Self-hosted AI infrastructure. Data never leaves your servers.
                </p>

                {/* Private LLM Tiers Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Private LLM - Starter */}
                  <div
                    className="p-3 border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                    }}
                  >
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Private LLM
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--neutral-gray)' }}>
                    Starter
                  </p>
                  <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                    €2,999
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--win95-text)' }}>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Self-hosted AI</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>~50K requests/month</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Scale-to-zero compute</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Full data sovereignty</span>
                  </li>
                </ul>

                    <button
                      onClick={() => {
                        setEnterpriseTier("starter");
                        setShowEnterpriseModal(true);
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Contact Sales
                    </button>
                  </div>

                  {/* Private LLM - Professional */}
                  <div
                    className="p-3 border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                    }}
                  >
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Private LLM
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--neutral-gray)' }}>
                    Professional
                  </p>
                  <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                    €7,199
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--win95-text)' }}>
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
                    <span>Priority support</span>
                  </li>
                </ul>

                    <button
                      onClick={() => {
                        setEnterpriseTier("professional");
                        setShowEnterpriseModal(true);
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Contact Sales
                    </button>
                  </div>

                  {/* Private LLM - Enterprise */}
                  <div
                    className="p-3 border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                    }}
                  >
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Private LLM
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--neutral-gray)' }}>
                    Enterprise
                  </p>
                  <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                    €14,999
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--win95-text)' }}>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Custom infrastructure</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Unlimited requests</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Dedicated support team</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                    <span>Custom SLA</span>
                  </li>
                </ul>

                    <button
                      onClick={() => {
                        setEnterpriseTier("enterprise");
                        setShowEnterpriseModal(true);
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Contact Sales
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
                  borderColor: 'var(--win95-border)',
                  color: 'var(--win95-text)'
                }}
              >
                <div className="flex gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Privacy-Enhanced Mode Active</p>
                    <p>
                      Only GDPR-compliant models are available. OpenAI and Google models are filtered out.
                      EU-native providers (Mistral) and ZDR-compliant models (Claude) are prioritized.
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
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <div className="mb-4">
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--win95-text)' }}>
                Enabled Models
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Select which models your organization can use. These will appear in AI chat for all users.
              </p>
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
                      borderColor: enabled ? 'var(--primary)' : 'var(--win95-border)',
                      backgroundColor: enabled ? 'var(--win95-bg-light)' : 'transparent'
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
                          <span className="font-bold text-xs" style={{ color: 'var(--win95-text)' }}>
                            {model.name}
                          </span>

                          {/* Inline Privacy Indicators */}
                          <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                            {model.location}
                            {model.zdr && " 🛡️"}
                            {model.noTraining && " 🚫"}
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
                            className="text-xs px-3 py-1.5 font-semibold rounded-md transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
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
              backgroundColor: 'var(--win95-bg)',
              borderColor: 'var(--win95-border)',
              color: 'var(--neutral-gray)'
            }}>
              <p style={{ color: 'var(--win95-text)' }}>
                <span className="font-bold">{enabledModels.length} models enabled</span>
                {defaultModelId && (
                  <span> • Default: {availableModels.find(m => m.id === defaultModelId)?.name}</span>
                )}
              </p>
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 border-2 text-xs" style={{
              backgroundColor: 'var(--win95-bg)',
              borderColor: 'var(--win95-border)',
              color: 'var(--neutral-gray)'
            }}>
              <p className="font-bold mb-2" style={{ color: 'var(--win95-text)' }}>Privacy Indicators:</p>
              <ul className="space-y-1">
                <li><strong>Location:</strong> 🇪🇺 EU • 🇺🇸 US • 🇨🇦 Canada • 🌍 Global (varies by hosting)</li>
                <li><strong>🛡️ Zero Data Retention:</strong> Data deleted immediately after processing</li>
                <li><strong>🚫 No Training:</strong> Provider does not train AI on your data</li>
              </ul>
              <p className="mt-2 text-xs" style={{ color: 'var(--win95-text)' }}>
                <strong>Smart Defaults:</strong> We automatically pre-select {tier === "standard" ? "7 popular models" : "5 GDPR-compliant models"} to get you started.
                You can enable additional models or disable any you don't want to offer to your team.
              </p>
            </div>
          </div>

          {/* Super Admin Only: BYOK Option */}
          {isSuperAdmin && (
            <div
              className="p-4 border-2"
              style={{
                backgroundColor: 'var(--warning)',
                borderColor: 'var(--win95-border)',
              }}
            >
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
                <AlertTriangle size={16} />
                Super Admin Only: Bring Your Own Key
              </h3>

              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={useBYOK}
                  onChange={(e) => setUseBYOK(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                    Use My Own OpenRouter API Key
                  </span>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    Skip invoicing to ourselves when using our own system
                  </p>
                </div>
              </label>

              {useBYOK && (
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full p-2 text-xs border-2 font-mono"
                    style={{
                      borderColor: 'var(--win95-border)',
                      backgroundColor: 'var(--win95-bg-light)',
                      color: 'var(--win95-text)'
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                    Get yours at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>openrouter.ai/keys</a>
                  </p>
                </div>
              )}
            </div>
          )}
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
            ✓ Settings saved successfully
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || !organizationId}
          className="px-4 py-2 text-xs font-semibold rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? "Saving..." : "Save Settings"}
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
