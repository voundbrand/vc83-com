"use client";

import { useState, useMemo } from "react";
import { Cpu, Filter, CheckCircle, XCircle, AlertCircle, RefreshCw, Star } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ProviderLogo, getProviderColor } from "@/components/ai/provider-logo";

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

export function PlatformAiModelsTab() {
  const { sessionId } = useAuth();

  // Data fetching
  const platformModels = useQuery(
    api.ai.platformModelManagement.getPlatformModels,
    sessionId ? { sessionId } : "skip"
  );

  // Mutations
  const enableModel = useMutation(api.ai.platformModelManagement.enablePlatformModel);
  const disableModel = useMutation(api.ai.platformModelManagement.disablePlatformModel);
  const batchEnable = useMutation(api.ai.platformModelManagement.batchEnableModels);
  const toggleSystemDefault = useMutation(api.ai.platformModelManagement.toggleSystemDefault);

  // Actions
  const refreshModels = useAction(api.ai.platformModelManagement.manualRefreshModels);

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

  // Show status message temporarily
  const showMessage = (message: string, type: "success" | "error") => {
    setStatusMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setStatusMessage("");
      setMessageType("");
    }, 5000);
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
        const result = await enableModel({ sessionId, modelId });
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
      const result = await batchEnable({
        sessionId,
        modelIds: Array.from(selectedModels),
      });
      showMessage(result.message, "success");
      setSelectedModels(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enable models";
      showMessage(message, "error");
      console.error("Batch enable error:", error);
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

  // Handle toggle system default
  const handleToggleSystemDefault = async (modelId: string, isCurrentlyDefault: boolean) => {
    if (!sessionId) return;

    try {
      const result = await toggleSystemDefault({
        sessionId,
        modelId,
        isDefault: !isCurrentlyDefault,
      });
      showMessage(result.message, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to toggle system default";
      showMessage(message, "error");
      console.error("Toggle system default error:", error);
    }
  };

  // Stats
  const totalModels = platformModels?.models.length || 0;
  const enabledModels = platformModels?.models.filter((m) => m.isPlatformEnabled).length || 0;
  const disabledModels = totalModels - enabledModels;
  const systemDefaultsCount = platformModels?.models.filter((m) => m.isSystemDefault).length || 0;

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
      else if (model.provider === "meta-llama") locations.add("🌍 Global");
      else if (model.provider.includes("amazon")) locations.add("🇺🇸 US");
      else locations.add("🌍 Global");
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
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Cpu size={24} style={{ color: "var(--primary)" }} />
            Platform AI Models
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--win95-text-secondary)" }}>
            {enabledModels} model{enabledModels !== 1 ? "s" : ""} enabled
            {systemDefaultsCount > 0 && ` • ${systemDefaultsCount} system default${systemDefaultsCount !== 1 ? "s" : ""}`}
          </p>

          {/* Privacy Indicators */}
          {enabledModels > 0 && (
            <div className="mt-2 text-xs space-y-1" style={{ color: "var(--win95-text-secondary)" }}>
              <div>
                <strong>Location:</strong> {privacyStats.locations.join(" • ") || "None"}
              </div>
              {privacyStats.zdr > 0 && (
                <div>🛡️ <strong>Zero Data Retention:</strong> {privacyStats.zdr} model{privacyStats.zdr !== 1 ? "s" : ""}</div>
              )}
              {privacyStats.noTraining > 0 && (
                <div>🚫 <strong>No Training:</strong> {privacyStats.noTraining} model{privacyStats.noTraining !== 1 ? "s" : ""}</div>
              )}
              {systemDefaultsCount > 0 && (
                <div className="mt-2">
                  <strong>Smart Defaults:</strong> {systemDefaultsCount} popular model{systemDefaultsCount !== 1 ? "s" : ""} pre-selected as recommended starters.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--primary)",
            color: "white",
          }}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing..." : "Refresh from OpenRouter"}
        </button>
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{totalModels}</div>
          <div className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>Total Models</div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--success)" }}>{enabledModels}</div>
          <div className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>Enabled</div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
          <div className="flex items-center gap-2">
            <Star size={20} fill="var(--warning)" style={{ color: "var(--warning)" }} />
            <div className="text-2xl font-bold" style={{ color: "var(--warning)" }}>{systemDefaultsCount}</div>
          </div>
          <div className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>System Defaults</div>
        </div>
        <div className="p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--neutral-gray)" }}>{disabledModels}</div>
          <div className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>Disabled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 rounded border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--win95-bg-light)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: "var(--primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>Filters</span>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={filteredModels.length === 0}
              className="beveled-button px-3 py-1 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--primary)",
                color: "white",
                cursor: filteredModels.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Select All ({filteredModels.length})
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
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Model name or ID..."
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
              }}
            />
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Provider
            </label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value as FilterProvider)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
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

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
              }}
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Capability Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Capability
            </label>
            <select
              value={filterCapability}
              onChange={(e) => setFilterCapability(e.target.value as FilterCapability)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
              }}
            >
              <option value="all">All Capabilities</option>
              <option value="tool_calling">Tool Calling</option>
              <option value="multimodal">Multimodal</option>
              <option value="vision">Vision</option>
            </select>
          </div>

          {/* Defaults Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Defaults
            </label>
            <select
              value={filterDefaults}
              onChange={(e) => setFilterDefaults(e.target.value as FilterDefaults)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
              }}
            >
              <option value="all">All Models</option>
              <option value="defaults_only">⭐ System Defaults Only</option>
              <option value="non_defaults">Non-Defaults Only</option>
            </select>
          </div>

          {/* Validation Filter */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Validation
            </label>
            <select
              value={filterValidation}
              onChange={(e) => setFilterValidation(e.target.value as FilterValidation)}
              className="w-full px-2 py-1 text-xs"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
              }}
            >
              <option value="all">All Status</option>
              <option value="validated">✓ Validated</option>
              <option value="not_tested">⚠ Not Tested</option>
              <option value="failed">✗ Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedModels.size > 0 && (
        <div className="mb-4 p-3 rounded border-2 flex items-center justify-between" style={{ borderColor: "var(--primary)", backgroundColor: "var(--win95-bg-light)" }}>
          <span className="text-sm" style={{ color: "var(--win95-text)" }}>
            {selectedModels.size} models selected
          </span>
          <button
            onClick={handleBatchEnable}
            className="beveled-button px-4 py-1 text-xs font-semibold flex items-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
            }}
          >
            <CheckCircle size={14} />
            Enable Selected
          </button>
        </div>
      )}

      {/* Models Grid */}
      <div className="space-y-3">
        {filteredModels.map((model) => {
          const providerColor = getProviderColor(model.provider);
          const isSelected = selectedModels.has(model.modelId);

          return (
            <div
              key={model.modelId}
              className="p-4 rounded border-2 transition-colors"
              style={{
                borderColor: isSelected ? "var(--primary)" : "var(--win95-border)",
                backgroundColor: "var(--win95-bg-light)",
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
                      <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                        {model.name}
                      </h3>
                      <p className="text-xs font-mono" style={{ color: "var(--win95-text-secondary)" }}>
                        {model.modelId}
                      </p>
                    </div>

                    {/* New Badge */}
                    {model.isNew && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ backgroundColor: "var(--success)", color: "white" }}
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Capabilities */}
                  <div className="flex items-center gap-2 mb-2">
                    {model.capabilities.toolCalling && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--primary)", color: "white" }}>
                        Tool Calling
                      </span>
                    )}
                    {model.capabilities.multimodal && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                        Multimodal
                      </span>
                    )}
                    {model.capabilities.vision && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--info)", color: "white" }}>
                        Vision
                      </span>
                    )}
                    {/* Validation Badge */}
                    {model.validationStatus === "validated" && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--success)", color: "white" }}>
                        ✓ Tested
                      </span>
                    )}
                    {model.validationStatus === "failed" && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--error)", color: "white" }}>
                        ✗ Failed
                      </span>
                    )}
                    {(!model.validationStatus || model.validationStatus === "not_tested") && model.capabilities.toolCalling && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--warning)", color: "white" }}>
                        ⚠ Not Tested
                      </span>
                    )}
                  </div>

                  {/* Pricing & Context */}
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--win95-text-secondary)" }}>
                    <span>
                      Input: ${model.pricing.promptPerMToken.toFixed(3)}/M
                    </span>
                    <span>
                      Output: ${model.pricing.completionPerMToken.toFixed(3)}/M
                    </span>
                    <span>
                      Context: {(model.contextLength / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col items-end gap-2">
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
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Disabled
                      </>
                    )}
                  </button>

                  {/* System Default Toggle (only for enabled models) */}
                  {model.isPlatformEnabled && (
                    <button
                      onClick={() => handleToggleSystemDefault(model.modelId, model.isSystemDefault)}
                      className="beveled-button px-4 py-2 text-xs font-semibold flex items-center gap-2"
                      title={
                        model.isSystemDefault
                          ? "Remove from system defaults (won't auto-select for new orgs)"
                          : "Set as system default (auto-selects for new organizations)"
                      }
                      style={{
                        backgroundColor: model.isSystemDefault ? "var(--warning)" : "var(--win95-bg)",
                        color: model.isSystemDefault ? "white" : "var(--win95-text)",
                        cursor: "pointer",
                      }}
                    >
                      <Star size={14} fill={model.isSystemDefault ? "white" : "none"} />
                      {model.isSystemDefault ? "★ System Default" : "☆ Set as Default"}
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
            <p className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>
              {platformModels?.models.length === 0
                ? "No models discovered yet. The daily cron job will fetch models from OpenRouter."
                : "No models match your filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
