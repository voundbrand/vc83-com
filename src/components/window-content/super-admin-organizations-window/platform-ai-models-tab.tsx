"use client";

import { useState, useMemo } from "react";
import { Cpu, Filter, CheckCircle, XCircle, AlertCircle, RefreshCw, Star, Lock, Users } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { ProviderLogo, getProviderColor } from "@/components/ai/provider-logo";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../../../convex/_generated/api");

/**
 * Platform AI Models Tab - Super Admin Model Management
 *
 * Permission: create_system_organization (super admin only)
 *
 * This tab allows super admins to:
 * - View all AI models discovered by the daily cron job
 * - Enable/disable models for platform-wide availability
 * - Filter models by provider, capabilities, and status
 * - See pricing and capability information
 */

type FilterProvider = "all" | string;
type FilterStatus = "all" | "enabled" | "disabled";
type FilterCapability = "all" | "tool_calling" | "multimodal" | "vision";
type FilterDefaults = "all" | "defaults_only" | "non_defaults";
type FilterValidation = "all" | "validated" | "not_tested" | "failed";

type PlatformModelRecord = {
  modelId: string;
  name: string;
  provider: string;
  pricing: {
    promptPerMToken: number;
    completionPerMToken: number;
  };
  contextLength: number;
  capabilities: {
    toolCalling: boolean;
    multimodal: boolean;
    vision: boolean;
  };
  isNew: boolean;
  isPlatformEnabled: boolean;
  isSystemDefault: boolean;
  isFreeTierLocked?: boolean;
  validationStatus?: "not_tested" | "validated" | "failed";
  testedAt?: number;
  notes?: string;
  validationRunStatus?: "idle" | "running" | "passed" | "failed";
  validationRunStartedAt?: number;
  validationRunFinishedAt?: number;
  validationRunMessage?: string;
};

type PlatformModelsResponse = {
  models: PlatformModelRecord[];
};

export function PlatformAiModelsTab() {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.super_admin.platform_ai_models");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const platformModelManagementApi = generatedApi.api.ai.platformModelManagement;

  // Data fetching
  const platformModels = useQuery(
    platformModelManagementApi.getPlatformModels,
    sessionId ? { sessionId } : "skip"
  ) as PlatformModelsResponse | undefined;

  // Mutations
  const enableModel = useMutation(platformModelManagementApi.enablePlatformModel);
  const disableModel = useMutation(platformModelManagementApi.disablePlatformModel);
  const batchEnable = useMutation(platformModelManagementApi.batchEnableModels);
  const batchDisable = useMutation(platformModelManagementApi.batchDisableModels);
  const setPlatformDefaultModel = useMutation(platformModelManagementApi.setPlatformDefaultModel);
  const toggleFreeTierLockedModel = useMutation(
    platformModelManagementApi.toggleFreeTierLockedModel
  );

  const syncOrgModelDefaults = useMutation(platformModelManagementApi.manualSyncOrgModelDefaults);

  // Actions
  const refreshModels = useAction(platformModelManagementApi.manualRefreshModels);
  const runModelValidation = useAction(platformModelManagementApi.runPlatformModelValidation);

  // UI state
  const [filterProvider, setFilterProvider] = useState<FilterProvider>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCapability, setFilterCapability] = useState<FilterCapability>("all");
  const [filterDefaults, setFilterDefaults] = useState<FilterDefaults>("all");
  const [filterValidation, setFilterValidation] = useState<FilterValidation>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningValidationModels, setRunningValidationModels] = useState<Set<string>>(new Set());
  const [isSyncingOrgs, setIsSyncingOrgs] = useState(false);

  // Show status message temporarily
  const showMessage = (message: string, type: "success" | "error") => {
    setStatusMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setStatusMessage("");
      setMessageType("");
    }, 5000);
  };

  const requestOperationalReviewAcknowledgement = (scopeLabel: string): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.confirm(
      tx(
        "operational_review.acknowledgement_prompt",
        "Operational review acknowledgement required for {{scopeLabel}}. Confirm you reviewed recent fallback and tool-failure telemetry and approve this enablement.",
        { scopeLabel }
      )
    );
  };

  // Get unique providers for filter
  const providers = useMemo(() => {
    if (!platformModels?.models) return [];
    const uniqueProviders = new Set(platformModels.models.map((m) => m.provider));
    return Array.from(uniqueProviders).sort();
  }, [platformModels]);

  // Filtered models
  const filteredModels = useMemo(() => {
    if (!platformModels?.models) return [];

    return platformModels.models.filter((model) => {
      // Provider filter
      if (filterProvider !== "all" && model.provider !== filterProvider) {
        return false;
      }

      // Status filter
      if (filterStatus === "enabled" && !model.isPlatformEnabled) return false;
      if (filterStatus === "disabled" && model.isPlatformEnabled) return false;

      // Capability filter
      if (filterCapability === "tool_calling" && !model.capabilities.toolCalling) return false;
      if (filterCapability === "multimodal" && !model.capabilities.multimodal) return false;
      if (filterCapability === "vision" && !model.capabilities.vision) return false;

      // Defaults filter
      if (filterDefaults === "defaults_only" && !model.isSystemDefault) return false;
      if (filterDefaults === "non_defaults" && model.isSystemDefault) return false;

      // Validation filter
      if (filterValidation === "validated" && model.validationStatus !== "validated") return false;
      if (filterValidation === "not_tested" && model.validationStatus !== "not_tested" && model.validationStatus !== undefined) return false;
      if (filterValidation === "failed" && model.validationStatus !== "failed") return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          model.name.toLowerCase().includes(query) ||
          model.modelId.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [platformModels, filterProvider, filterStatus, filterCapability, filterDefaults, filterValidation, searchQuery]);

  // Handle enable/disable toggle
  const handleToggleModel = async (modelId: string, currentlyEnabled: boolean) => {
    if (!sessionId) return;

    try {
      if (currentlyEnabled) {
        const result = await disableModel({ sessionId, modelId });
        showMessage(result.message, "success");
      } else {
        const acknowledged = requestOperationalReviewAcknowledgement(modelId);
        if (!acknowledged) {
          showMessage("Enablement cancelled. Operational review acknowledgement is required.", "error");
          return;
        }

        const result = await enableModel({
          sessionId,
          modelId,
          operationalReviewAcknowledged: true,
        });
        showMessage(result.message, "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update model";
      showMessage(message, "error");
      console.error("Toggle model error:", error);
    }
  };

  // Handle batch enable
  const handleBatchEnable = async () => {
    if (!sessionId || selectedModels.size === 0) return;

    try {
      const acknowledged = requestOperationalReviewAcknowledgement(
        `${selectedModels.size} selected model${selectedModels.size === 1 ? "" : "s"}`
      );
      if (!acknowledged) {
        showMessage("Batch enable cancelled. Operational review acknowledgement is required.", "error");
        return;
      }

      const result = await batchEnable({
        sessionId,
        modelIds: Array.from(selectedModels),
        operationalReviewAcknowledged: true,
      });
      showMessage(result.message, "success");
      setSelectedModels(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enable models";
      showMessage(message, "error");
      console.error("Batch enable error:", error);
    }
  };

  // Handle batch disable
  const handleBatchDisable = async () => {
    if (!sessionId || selectedModels.size === 0) return;

    try {
      const result = await batchDisable({
        sessionId,
        modelIds: Array.from(selectedModels),
      });
      showMessage(result.message, "success");
      setSelectedModels(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disable models";
      showMessage(message, "error");
      console.error("Batch disable error:", error);
    }
  };

  // Toggle model selection
  const toggleModelSelection = (modelId: string) => {
    const newSelection = new Set(selectedModels);
    if (newSelection.has(modelId)) {
      newSelection.delete(modelId);
    } else {
      newSelection.add(modelId);
    }
    setSelectedModels(newSelection);
  };

  // Select all filtered models
  const handleSelectAll = () => {
    const allFilteredModelIds = new Set(filteredModels.map(m => m.modelId));
    setSelectedModels(allFilteredModelIds);
  };

  // Deselect all models
  const handleDeselectAll = () => {
    setSelectedModels(new Set());
  };

  // Handle manual refresh
  const handleManualRefresh = async () => {
    if (!sessionId || isRefreshing) return;

    setIsRefreshing(true);

    try {
      const result = await refreshModels({ sessionId });
      showMessage(result.message, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh models";
      showMessage(message, "error");
      console.error("Manual refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle manual sync of org model defaults
  const handleSyncOrgDefaults = async () => {
    if (!sessionId || isSyncingOrgs) return;

    setIsSyncingOrgs(true);

    try {
      const result = await syncOrgModelDefaults({ sessionId });
      showMessage(result.message, "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to sync org model defaults";
      showMessage(message, "error");
      console.error("Sync org model defaults error:", error);
    } finally {
      setIsSyncingOrgs(false);
    }
  };

  // Set platform default model (singular)
  const handleSetPlatformDefault = async (modelId: string) => {
    if (!sessionId) return;

    try {
      const result = await setPlatformDefaultModel({ sessionId, modelId });
      showMessage(result.message, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to set platform default";
      showMessage(message, "error");
      console.error("Set platform default error:", error);
    }
  };

  const handleRunValidation = async (modelId: string) => {
    if (!sessionId) return;

    setRunningValidationModels((prev) => {
      const next = new Set(prev);
      next.add(modelId);
      return next;
    });

    try {
      const result = await runModelValidation({
        sessionId,
        modelId,
      });
      showMessage(
        result?.summary
          ? `Validation finished for ${modelId}: ${result.summary}`
          : `Validation finished for ${modelId}`,
        "success"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run validation";
      showMessage(message, "error");
      console.error("Run validation error:", error);
    } finally {
      setRunningValidationModels((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  const handleToggleFreeTierLockedModel = async (
    modelId: string,
    isCurrentlyLocked: boolean
  ) => {
    if (!sessionId) return;

    try {
      const result = await toggleFreeTierLockedModel({
        sessionId,
        modelId,
        isLocked: !isCurrentlyLocked,
      });
      showMessage(result.message, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to toggle free-tier lock";
      showMessage(message, "error");
      console.error("Toggle free-tier lock error:", error);
    }
  };

  // Stats
  const totalModels = platformModels?.models.length || 0;
  const enabledModels = platformModels?.models.filter((m) => m.isPlatformEnabled).length || 0;
  const disabledModels = totalModels - enabledModels;
  const systemDefaultsCount = platformModels?.models.filter((m) => m.isSystemDefault).length || 0;
  const freeTierLockedCount = platformModels?.models.filter((m) => m.isFreeTierLocked).length || 0;

  // Get privacy stats  dynamically based on enabled models
  const privacyStats = useMemo(() => {
    if (!platformModels?.models) return { locations: [], zdr: 0, noTraining: 0 };

    const enabled = platformModels.models.filter(m => m.isPlatformEnabled);
    const locations = new Set<string>();

    for (const model of enabled) {
      // Map providers to locations
      if (model.provider === "mistral") locations.add("🇪🇺 EU");
      else if (["anthropic", "openai", "google"].includes(model.provider)) locations.add("🇺🇸 US");
      else if (model.provider === "cohere") locations.add("🇨🇦 Canada");
      else if (model.provider === "meta-llama") locations.add(" Global");
      else if (model.provider.includes("amazon")) locations.add("🇺🇸 US");
      else locations.add(" Global");
    }

    const zdr = enabled.filter(m => ["mistral", "anthropic", "meta-llama"].includes(m.provider)).length;
    const noTraining = enabled.filter(m => ["mistral", "anthropic", "meta-llama"].includes(m.provider)).length;

    return {
      locations: Array.from(locations),
      zdr,
      noTraining,
    };
  }, [platformModels]);

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Cpu size={24} style={{ color: "var(--primary)" }} />
            {tx("header.title", "Platform AI Models")}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--window-document-text-muted)" }}>
            {enabledModels}{" "}
            {enabledModels === 1 ? tx("header.model_singular", "model") : tx("header.model_plural", "models")}{" "}
            {tx("header.enabled", "enabled")}
            {systemDefaultsCount > 0
              && ` • ${systemDefaultsCount} ${
                systemDefaultsCount === 1
                  ? tx("header.system_default_singular", "system default")
                  : tx("header.system_default_plural", "system defaults")
              }`}
            {freeTierLockedCount > 0
              && ` • ${freeTierLockedCount} ${
                freeTierLockedCount === 1
                  ? tx("header.free_tier_lock_singular", "free-tier lock")
                  : tx("header.free_tier_lock_plural", "free-tier locks")
              }`}
          </p>

          {/* Privacy Indicators */}
          {enabledModels > 0 && (
            <div className="mt-2 text-xs space-y-1" style={{ color: "var(--window-document-text-muted)" }}>
              <div>
                <strong>{tx("privacy.location", "Location:")}</strong>{" "}
                {privacyStats.locations.join(" • ") || tx("privacy.none", "None")}
              </div>
              {privacyStats.zdr > 0 && (
                <div>
                  <strong>{tx("privacy.zero_data_retention", "Zero Data Retention:")}</strong>{" "}
                  {privacyStats.zdr}{" "}
                  {privacyStats.zdr === 1 ? tx("privacy.model_singular", "model") : tx("privacy.model_plural", "models")}
                </div>
              )}
              {privacyStats.noTraining > 0 && (
                <div>
                  <strong>{tx("privacy.no_training", "No Training:")}</strong>{" "}
                  {privacyStats.noTraining}{" "}
                  {privacyStats.noTraining === 1 ? tx("privacy.model_singular", "model") : tx("privacy.model_plural", "models")}
                </div>
              )}
              {systemDefaultsCount > 0 && (
                <div className="mt-2">
                  <strong>{tx("privacy.smart_defaults", "Smart Defaults:")}</strong>{" "}
                  {systemDefaultsCount}{" "}
                  {systemDefaultsCount === 1
                    ? tx("privacy.popular_model_singular", "popular model")
                    : tx("privacy.popular_model_plural", "popular models")}{" "}
                  {tx("privacy.smart_defaults_suffix", "pre-selected as recommended starters.")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
              color: "var(--button-primary-text, #0f0f0f)",
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing
              ? tx("actions.refreshing", "Refreshing...")
              : tx("actions.refresh_from_openrouter", "Refresh from OpenRouter")}
          </button>

          {/* Sync Org Model Defaults Button */}
          <button
            onClick={handleSyncOrgDefaults}
            disabled={isSyncingOrgs}
            className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--success)",
              color: "white",
            }}
          >
            <Users size={16} className={isSyncingOrgs ? "animate-pulse" : ""} />
            {isSyncingOrgs
              ? tx("actions.syncing_orgs", "Syncing Organizations...")
              : tx("actions.sync_org_defaults", "Sync All Org Defaults")}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className="mb-6 p-4 rounded flex items-start gap-3"
          style={{
            backgroundColor: messageType === "success" ? "var(--success)" : "var(--error)",
            color: "white",
            border: "2px solid",
            borderColor: messageType === "success" ? "var(--success)" : "var(--error)",
          }}
        >
          {messageType === "success" ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{statusMessage}</p>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{totalModels}</div>
          <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("stats.total_models", "Total Models")}
          </div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--success)" }}>{enabledModels}</div>
          <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("stats.enabled", "Enabled")}
          </div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <Star size={20} fill="var(--warning)" style={{ color: "var(--warning)" }} />
            <div className="text-2xl font-bold" style={{ color: "var(--warning)" }}>{systemDefaultsCount}</div>
          </div>
          <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("stats.system_defaults", "System Defaults")}
          </div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--neutral-gray)" }}>{disabledModels}</div>
          <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("stats.disabled", "Disabled")}
          </div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <Lock size={18} style={{ color: "var(--primary)" }} />
            <div className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{freeTierLockedCount}</div>
          </div>
          <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("stats.free_tier_locked", "Free Tier Locked")}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 rounded border-2" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: "var(--primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.title", "Filters")}
            </span>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={filteredModels.length === 0}
              className="beveled-button px-3 py-1 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
                color: "var(--button-primary-text, #0f0f0f)",
                cursor: filteredModels.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {tx("filters.select_all", "Select All")} ({filteredModels.length})
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={selectedModels.size === 0}
              className="beveled-button px-3 py-1 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--neutral-gray)",
                color: "white",
                cursor: selectedModels.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              {tx("filters.deselect_all", "Deselect All")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.search", "Search")}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx("filters.search_placeholder", "Model name or ID...")}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.provider", "Provider")}
            </label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value as FilterProvider)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            >
              <option value="all">{tx("filters.all_providers", "All Providers")}</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.status", "Status")}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            >
              <option value="all">{tx("filters.all_status", "All Status")}</option>
              <option value="enabled">{tx("filters.enabled", "Enabled")}</option>
              <option value="disabled">{tx("filters.disabled", "Disabled")}</option>
            </select>
          </div>

          {/* Capability Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.capability", "Capability")}
            </label>
            <select
              value={filterCapability}
              onChange={(e) => setFilterCapability(e.target.value as FilterCapability)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            >
              <option value="all">{tx("filters.all_capabilities", "All Capabilities")}</option>
              <option value="tool_calling">{tx("filters.tool_calling", "Tool Calling")}</option>
              <option value="multimodal">{tx("filters.multimodal", "Multimodal")}</option>
              <option value="vision">{tx("filters.vision", "Vision")}</option>
            </select>
          </div>

          {/* Defaults Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.defaults", "Defaults")}
            </label>
            <select
              value={filterDefaults}
              onChange={(e) => setFilterDefaults(e.target.value as FilterDefaults)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            >
              <option value="all">{tx("filters.all_models", "All Models")}</option>
              <option value="defaults_only">{tx("filters.defaults_only", "⭐ System Defaults Only")}</option>
              <option value="non_defaults">{tx("filters.non_defaults_only", "Non-Defaults Only")}</option>
            </select>
          </div>

          {/* Validation Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("filters.validation", "Validation")}
            </label>
            <select
              value={filterValidation}
              onChange={(e) => setFilterValidation(e.target.value as FilterValidation)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            >
              <option value="all">{tx("filters.validation_all_status", "All Status")}</option>
              <option value="validated">{tx("filters.validated", "Validated")}</option>
              <option value="not_tested">{tx("filters.not_tested", "Not Tested")}</option>
              <option value="failed">{tx("filters.failed", "Failed")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedModels.size > 0 && (
        <div className="mb-4 p-3 rounded border-2 flex items-center justify-between" style={{ borderColor: "var(--primary)", backgroundColor: "var(--window-document-bg-elevated)" }}>
          <span className="text-sm" style={{ color: "var(--window-document-text)" }}>
            {selectedModels.size} {tx("batch.models_selected", "models selected")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchEnable}
              className="beveled-button px-4 py-1 text-xs font-semibold flex items-center gap-2"
              style={{
                backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
                color: "var(--button-primary-text, #0f0f0f)",
              }}
            >
              <CheckCircle size={14} />
              {tx("batch.enable_selected", "Enable Selected")}
            </button>
            <button
              onClick={handleBatchDisable}
              className="beveled-button px-4 py-1 text-xs font-semibold flex items-center gap-2"
              style={{
                backgroundColor: "var(--error)",
                color: "white",
              }}
            >
              <XCircle size={14} />
              {tx("batch.disable_selected", "Disable Selected")}
            </button>
          </div>
        </div>
      )}

      {/* Models Grid */}
      <div className="space-y-3">
        {filteredModels.map((model) => {
          const providerColor = getProviderColor(model.provider);
          const isSelected = selectedModels.has(model.modelId);
          const isValidationRunning =
            runningValidationModels.has(model.modelId) ||
            model.validationRunStatus === "running";

          return (
            <div
              key={model.modelId}
              className="p-4 rounded border-2 transition-colors"
              style={{
                borderColor: isSelected ? "var(--primary)" : "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Model Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModelSelection(model.modelId)}
                      className="cursor-pointer"
                      style={{ width: "16px", height: "16px" }}
                    />

                    {/* Provider Logo */}
                    <div className={providerColor}>
                      <ProviderLogo provider={model.provider} size={20} />
                    </div>

                    {/* Model Name */}
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        {model.name}
                      </h3>
                      <p className="text-xs font-mono" style={{ color: "var(--window-document-text-muted)" }}>
                        {model.modelId}
                      </p>
                    </div>

                    {/* New Badge */}
                    {model.isNew && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ backgroundColor: "var(--success)", color: "white" }}
                      >
                        {tx("model_card.badge_new", "NEW")}
                      </span>
                    )}
                  </div>

                  {/* Capabilities */}
                  <div className="flex items-center gap-2 mb-2">
                    {model.capabilities.toolCalling && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--primary)", color: "white" }}>
                        {tx("model_card.tool_calling", "Tool Calling")}
                      </span>
                    )}
                    {model.capabilities.multimodal && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                        {tx("model_card.multimodal", "Multimodal")}
                      </span>
                    )}
                    {model.capabilities.vision && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--info)", color: "white" }}>
                        {tx("model_card.vision", "Vision")}
                      </span>
                    )}
                    {model.isFreeTierLocked && (
                      <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "var(--primary)", color: "white" }}>
                        <Lock size={10} />
                        {tx("model_card.free_tier_locked", "Free Tier Locked")}
                      </span>
                    )}
                    {/* Validation Badge */}
                    {model.validationStatus === "validated" && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--success)", color: "white" }}>
                         {tx("model_card.tested", "Tested")}
                      </span>
                    )}
                    {model.validationStatus === "failed" && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--error)", color: "white" }}>
                         {tx("model_card.failed", "Failed")}
                      </span>
                    )}
                    {(!model.validationStatus || model.validationStatus === "not_tested") && model.capabilities.toolCalling && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--warning)", color: "white" }}>
                         {tx("model_card.not_tested", "Not Tested")}
                      </span>
                    )}
                    {model.validationRunStatus === "running" && (
                      <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "var(--info)", color: "white" }}>
                        <RefreshCw size={10} className="animate-spin" />
                        {tx("model_card.validation_running", "Validation Running")}
                      </span>
                    )}
                  </div>

                  {/* Pricing & Context */}
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    <span>
                      {tx("model_card.input_price", "Input: $")} {model.pricing.promptPerMToken.toFixed(3)}{tx("model_card.per_million", "/M")}
                    </span>
                    <span>
                      {tx("model_card.output_price", "Output: $")} {model.pricing.completionPerMToken.toFixed(3)}{tx("model_card.per_million", "/M")}
                    </span>
                    <span>
                      {tx("model_card.context", "Context:")} {(model.contextLength / 1000).toFixed(0)}{tx("model_card.thousands_suffix", "K")}
                    </span>
                  </div>
                  {(model.validationRunMessage || model.validationRunFinishedAt) && (
                    <div className="mt-2 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                      {model.validationRunMessage && (
                        <span>{model.validationRunMessage}</span>
                      )}
                      {model.validationRunFinishedAt && (
                        <span>
                          {" "}
                          • {tx("model_card.last_validation", "Last validation")}:{" "}
                          {new Date(model.validationRunFinishedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleRunValidation(model.modelId)}
                    disabled={isValidationRunning}
                    className="beveled-button px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "var(--info)",
                      color: "white",
                      cursor: isValidationRunning ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw size={14} className={isValidationRunning ? "animate-spin" : ""} />
                    {isValidationRunning
                      ? tx("model_card.validation_running_button", "Running...")
                      : tx("model_card.run_validation", "Run Validation")}
                  </button>

                  {/* Enable/Disable Button */}
                  <button
                    onClick={() => handleToggleModel(model.modelId, model.isPlatformEnabled)}
                    className="beveled-button px-4 py-2 text-xs font-semibold flex items-center gap-2"
                    style={{
                      backgroundColor: model.isPlatformEnabled ? "var(--success)" : "var(--neutral-gray)",
                      color: "white",
                    }}
                  >
                    {model.isPlatformEnabled ? (
                      <>
                        <CheckCircle size={14} />
                        {tx("model_card.enabled", "Enabled")}
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        {tx("model_card.disabled", "Disabled")}
                      </>
                    )}
                  </button>

                  {/* Platform Default Setter (only for enabled models) */}
                  {model.isPlatformEnabled && (
                    <button
                      onClick={() => handleSetPlatformDefault(model.modelId)}
                      disabled={model.isSystemDefault}
                      className="beveled-button px-4 py-2 text-xs font-semibold flex items-center gap-2"
                      title={
                        model.isSystemDefault
                          ? tx(
                            "model_card.current_platform_default_title",
                            "Current platform default"
                          )
                          : tx(
                            "model_card.set_platform_default_title",
                            "Set as platform default (auto-selects for new organizations)"
                          )
                      }
                      style={{
                        backgroundColor: model.isSystemDefault ? "var(--warning)" : "var(--window-document-bg)",
                        color: model.isSystemDefault ? "white" : "var(--window-document-text)",
                        cursor: model.isSystemDefault ? "not-allowed" : "pointer",
                      }}
                    >
                      <Star size={14} fill={model.isSystemDefault ? "white" : "none"} />
                      {model.isSystemDefault
                        ? ` ${tx("model_card.platform_default", "Platform Default")}`
                        : ` ${tx("model_card.set_as_platform_default", "Set as Platform Default")}`}
                    </button>
                  )}

                  {/* Free-Tier Lock Toggle (only for enabled models) */}
                  {model.isPlatformEnabled && (
                    <button
                      onClick={() =>
                        handleToggleFreeTierLockedModel(
                          model.modelId,
                          model.isFreeTierLocked === true
                        )
                      }
                      className="beveled-button px-4 py-2 text-xs font-semibold flex items-center gap-2"
                      title={
                        model.isFreeTierLocked
                          ? tx(
                            "model_card.remove_free_tier_lock_title",
                            "Remove free-tier lock from this model"
                          )
                          : tx(
                            "model_card.set_free_tier_lock_title",
                            "Pin this model for all free-tier, platform-billed traffic"
                          )
                      }
                      style={{
                        backgroundColor: model.isFreeTierLocked ? "var(--primary)" : "var(--window-document-bg)",
                        color: model.isFreeTierLocked ? "white" : "var(--window-document-text)",
                        cursor: "pointer",
                      }}
                    >
                      <Lock size={14} />
                      {model.isFreeTierLocked
                        ? tx("model_card.free_tier_locked_button", "Free Tier Locked")
                        : tx("model_card.set_free_tier_lock_button", "Set Free Tier Lock")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredModels.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw size={48} className="mx-auto mb-4" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
              {platformModels?.models.length === 0
                ? tx("empty.no_models_discovered", "No models discovered yet. The daily cron job will fetch models from OpenRouter.")
                : tx("empty.no_models_match_filters", "No models match your filters.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
