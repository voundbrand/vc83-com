"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChevronDown, Check } from "lucide-react";
import { ProviderLogo, ProviderBadge } from "@/components/ai/provider-logo";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "../../../../convex/_generated/dataModel";

interface ModelSelectorProps {
  selectedModel?: string;
  onModelChange?: (model: string | undefined) => void;
  disabled?: boolean;
}

// Provider info is now handled by ProviderLogo component

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Get organization's AI settings to see which models are enabled for THIS org
  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;
  const aiSettings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  );

  // Get all platform-enabled models (as fallback)
  const allPlatformModels = useQuery(api.ai.platformModels.getEnabledModelsByProvider);

  // Filter to show only the organization's enabled models
  const platformModels = useMemo(() => {
    if (!aiSettings?.llm.enabledModels || aiSettings.llm.enabledModels.length === 0) {
      // No org-specific models configured, use all platform-enabled models
      return allPlatformModels;
    }

    if (!allPlatformModels) return null;

    // Get the list of model IDs enabled for this organization
    const enabledModelIds = new Set(aiSettings.llm.enabledModels.map(m => m.modelId));

    // Filter platform models to only include org-enabled ones
    const filtered: Record<string, typeof allPlatformModels[string]> = {};

    for (const [provider, models] of Object.entries(allPlatformModels)) {
      const orgModels = models.filter(m => enabledModelIds.has(m.modelId));
      if (orgModels.length > 0) {
        filtered[provider] = orgModels;
      }
    }

    return filtered;
  }, [aiSettings, allPlatformModels]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse provider from model string
  const getProvider = (model: string) => {
    return model.split("/")[0];
  };

  // Get model display name
  const getModelDisplayName = (model: string) => {
    const parts = model.split("/");
    return parts[1] || model;
  };

  // Get organization's default model, or first available model as fallback
  const orgDefaultModel = aiSettings?.llm.defaultModelId;
  const firstAvailableModel = platformModels
    ? Object.values(platformModels).flat()[0]?.modelId
    : null;

  // Current model: Use explicitly selected model, or org default, or first available
  const currentModel = selectedModel || orgDefaultModel || firstAvailableModel || "no-models-available";
  const currentProvider = getProvider(currentModel);
  const currentDisplayName = getModelDisplayName(currentModel);

  // Build model list from platform-enabled models
  const modelsByProvider: Record<string, Array<{ id: string; name: string }>> = {};

  if (platformModels) {
    for (const [provider, models] of Object.entries(platformModels)) {
      modelsByProvider[provider] = models.map((m) => ({
        id: m.modelId,
        name: m.name,
      }));
    }
  }

  const handleModelSelect = (model: string) => {
    onModelChange?.(model);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded border-2
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        style={{
          backgroundColor: 'var(--shell-surface-elevated)',
          borderColor: 'var(--shell-border)',
          color: 'var(--shell-text)',
        }}
      >
        {/* Provider Logo */}
        <ProviderLogo provider={currentProvider} size={16} />

        {/* Model Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--shell-text)' }}>
            {!selectedModel && "Auto"}
          </span>
          <span className="text-xs truncate" style={{ color: 'var(--shell-text-muted)' }}>
            ({currentDisplayName})
          </span>
        </div>

        {/* Provider Badge */}
        <ProviderBadge provider={currentProvider} showName={false} />

        {/* Dropdown Arrow */}
        <ChevronDown className="w-4 h-4 transition-transform" style={{ color: 'var(--shell-text-muted)' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-80 border-2 rounded shadow-lg z-50 max-h-96 overflow-y-auto"
          style={{
            backgroundColor: 'var(--shell-input-surface)',
            borderColor: 'var(--shell-input-border-strong)',
          }}
        >
          {/* Auto Option */}
          <button
            onClick={() => {
              onModelChange?.(undefined); // Clear selection to use org default
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left border-b-2 flex items-center gap-2 transition-colors hover-menu-item"
            style={{
              borderColor: 'var(--shell-input-border-strong)',
              color: 'var(--shell-input-text)',
            }}
          >
            <ProviderLogo provider="default" size={16} className="text-primary" />
            <div>
              <div className="font-bold text-sm" style={{ color: 'inherit' }}>Auto (Default)</div>
              <div className="text-xs opacity-70" style={{ color: 'inherit' }}>
                {orgDefaultModel
                  ? `Use organization default: ${getModelDisplayName(orgDefaultModel)}`
                  : `Use first available: ${currentDisplayName}`
                }
              </div>
            </div>
          </button>

          {/* Models by Provider */}
          {Object.entries(modelsByProvider).map(([provider, models]) => {
            return (
              <div
                key={provider}
                className="border-b-2 last:border-b-0"
                style={{ borderColor: 'var(--shell-input-border-strong)' }}
              >
                {/* Provider Header */}
                <div
                  className="px-3 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--shell-border)',
                    color: 'var(--shell-input-text)'
                  }}
                >
                  <ProviderBadge provider={provider} showName={true} />
                </div>

                {/* Provider Models */}
                {models.map((model) => {
                  const isSelected = model.id === selectedModel;

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between transition-colors hover-menu-item"
                      style={{
                        backgroundColor: isSelected ? 'var(--shell-hover-bg)' : 'transparent',
                        color: isSelected ? 'var(--shell-hover-text)' : 'var(--shell-input-text)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-bold text-sm truncate"
                          style={{ color: 'inherit' }}
                        >
                          {model.name}
                        </div>
                        <div
                          className="text-xs font-mono truncate opacity-70"
                          style={{ color: 'inherit' }}
                        >
                          {model.id}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: 'var(--shell-hover-text)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* No Models Message */}
          {Object.keys(modelsByProvider).length === 0 && (
            <div
              className="px-3 py-4 text-center text-sm"
              style={{ color: 'var(--shell-text-muted)' }}
            >
              No models available. Super admin must enable models.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
