"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useState, useEffect } from "react";
import { Save, Loader2, Zap, DollarSign, Brain, Database } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

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

  const upsertSettings = useMutation(api.ai.settings.upsertAISettings);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [billingMode, setBillingMode] = useState<"platform" | "byok">("platform");
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("anthropic/claude-3-5-sonnet");
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

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setProvider(settings.llm.provider || "anthropic");
      setModel(settings.llm.model || "claude-3-5-sonnet");
      setTemperature(settings.llm.temperature);
      setMaxTokens(settings.llm.maxTokens);

      const hasCustomKey = !!(settings.llm.openrouterApiKey);
      setBillingMode(hasCustomKey ? "byok" : "platform");
      setOpenrouterApiKey(settings.llm.openrouterApiKey || "");

      setEmbeddingProvider(settings.embedding.provider);
      setEmbeddingModel(settings.embedding.model);
      setEmbeddingDimensions(settings.embedding.dimensions);
      setEmbeddingApiKey(settings.embedding.apiKey || "");

      setMonthlyBudgetUsd(settings.monthlyBudgetUsd);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!organizationId) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await upsertSettings({
        organizationId,
        enabled,
        billingMode,
        llm: {
          provider,
          model,
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
      alert("Failed to save AI settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Model options
  const modelOptions = {
    anthropic: [
      { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet (Best)", cost: "$3/$15 per M tokens" },
      { value: "anthropic/claude-3-sonnet", label: "Claude 3 Sonnet", cost: "$3/$15 per M tokens" },
      { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku (Fast)", cost: "$0.25/$1.25 per M tokens" },
    ],
    openai: [
      { value: "openai/gpt-4o", label: "GPT-4o (Latest)", cost: "$2.50/$10 per M tokens" },
      { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo", cost: "$10/$30 per M tokens" },
      { value: "openai/gpt-3.5-turbo", label: "GPT-3.5 Turbo (Fast)", cost: "$0.50/$1.50 per M tokens" },
    ],
    google: [
      { value: "google/gemini-pro", label: "Gemini Pro", cost: "$0.125/$0.50 per M tokens" },
      { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5", cost: "$1.25/$5 per M tokens" },
    ],
  };

  const embeddingOptions = {
    openai: [
      { value: "text-embedding-3-small", label: "text-embedding-3-small (1536d)", dimensions: 1536 },
      { value: "text-embedding-3-large", label: "text-embedding-3-large (3072d)", dimensions: 3072 },
    ],
    voyage: [
      { value: "voyage-2", label: "Voyage 2 (1024d)", dimensions: 1024 },
      { value: "voyage-large-2", label: "Voyage Large 2 (1536d)", dimensions: 1536 },
    ],
    cohere: [
      { value: "embed-english-v3.0", label: "Embed English v3 (1024d)", dimensions: 1024 },
      { value: "embed-multilingual-v3.0", label: "Embed Multilingual v3 (1024d)", dimensions: 1024 },
    ],
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
          {/* LLM Configuration */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Zap size={16} />
              {t("ui.manage.ai.llm_title")}
            </h3>

            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.ai.provider")}
                </label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    // Reset model when provider changes
                    const newProviderModels = modelOptions[e.target.value as keyof typeof modelOptions];
                    if (newProviderModels && newProviderModels.length > 0) {
                      setModel(newProviderModels[0].value);
                    }
                  }}
                  className="w-full p-2 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  }}
                >
                  <option value="anthropic">{t("ui.manage.ai.provider.anthropic")}</option>
                  <option value="openai">{t("ui.manage.ai.provider.openai")}</option>
                  <option value="google">{t("ui.manage.ai.provider.google")}</option>
                </select>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.ai.model")}
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2 text-xs border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundColor: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  }}
                >
                  {modelOptions[provider as keyof typeof modelOptions]?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.cost}
                    </option>
                  ))}
                </select>
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

          {/* Billing Mode Selection */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)',
            }}
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <DollarSign size={16} />
              {t("ui.manage.ai.billing_mode")}
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
                  {billingMode === "byok" && <span style={{ color: 'var(--neutral-gray)' }}> ({t("ui.manage.ai.budget_byok_note").split('.')[0]})</span>}
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
                        backgroundColor: budgetProgress > 90 ? 'var(--error)' : 'var(--success)'
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
                        backgroundColor: rateLimit.remaining < 10 ? 'var(--warning)' : 'var(--primary)'
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
      <div className="flex justify-end gap-2">
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
          className="beveled-button px-4 py-2 text-xs font-bold flex items-center gap-2"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
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
