"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChevronDown, Sparkles, Zap, Brain, Rocket } from "lucide-react";

interface ModelSelectorProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  disabled?: boolean;
}

// Provider icons and colors
const PROVIDER_INFO: Record<string, { icon: React.ReactNode; color: string; badge?: string }> = {
  anthropic: { icon: <Brain className="w-4 h-4" />, color: "text-purple-600", badge: "Claude" },
  openai: { icon: <Sparkles className="w-4 h-4" />, color: "text-green-600", badge: "GPT" },
  google: { icon: <Rocket className="w-4 h-4" />, color: "text-blue-600", badge: "Gemini" },
  meta: { icon: <Zap className="w-4 h-4" />, color: "text-orange-600", badge: "Llama" },
  mistral: { icon: <Sparkles className="w-4 h-4" />, color: "text-red-600", badge: "Mistral" },
};

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available models from AI settings (Note: requires organizationId)
  // For now, we'll use defaults until we pass organizationId prop
  const aiSettings = null; // TODO: Pass organizationId and use api.ai.settings.getAISettings

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

  // Current model (use from settings or prop)
  const currentModel = selectedModel || (aiSettings ? (aiSettings as any).llm.model : "anthropic/claude-3-5-sonnet");
  const currentProvider = getProvider(currentModel);
  const currentDisplayName = getModelDisplayName(currentModel);
  const providerInfo = PROVIDER_INFO[currentProvider] || PROVIDER_INFO.anthropic;

  // Available models (from settings or defaults)
  const availableModels = (aiSettings ? (aiSettings as any).llm.enabledModels : null) || [
    "anthropic/claude-3-5-sonnet",
    "anthropic/claude-3-opus",
    "openai/gpt-4o",
    "openai/gpt-4-turbo",
    "google/gemini-pro-1.5",
  ];

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc: Record<string, string[]>, model: string) => {
    const provider = getProvider(model);
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, string[]>);

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
          flex items-center gap-2 px-3 py-2 rounded
          border-2 border-gray-300 bg-white
          hover:bg-gray-50 hover:border-purple-600
          transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {/* Provider Icon */}
        <div className={providerInfo.color}>
          {providerInfo.icon}
        </div>

        {/* Model Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold truncate">
            {!selectedModel && "Auto"}
          </span>
          <span className="text-xs text-gray-600 truncate">
            ({currentDisplayName})
          </span>
        </div>

        {/* Provider Badge */}
        {providerInfo.badge && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${providerInfo.color} bg-opacity-10`}>
            {providerInfo.badge}
          </span>
        )}

        {/* Dropdown Arrow */}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border-2 border-gray-300 rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Auto Option */}
          <button
            onClick={() => handleModelSelect(currentModel)}
            className="w-full px-3 py-2 text-left hover:bg-purple-50 border-b-2 border-gray-200 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <div>
              <div className="font-bold text-sm">Auto (Default)</div>
              <div className="text-xs text-gray-600">
                Use organization default: {currentDisplayName}
              </div>
            </div>
          </button>

          {/* Models by Provider */}
          {Object.entries(modelsByProvider).map(([provider, models]) => {
            const info = PROVIDER_INFO[provider] || PROVIDER_INFO.anthropic;

            return (
              <div key={provider} className="border-b-2 border-gray-200 last:border-b-0">
                {/* Provider Header */}
                <div className="px-3 py-2 bg-gray-100 flex items-center gap-2">
                  <div className={info.color}>
                    {info.icon}
                  </div>
                  <span className="text-xs font-bold uppercase">{provider}</span>
                  {info.badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${info.color} bg-opacity-10`}>
                      {info.badge}
                    </span>
                  )}
                </div>

                {/* Provider Models */}
                {(models as string[]).map((model: string) => {
                  const displayName = getModelDisplayName(model);
                  const isSelected = model === selectedModel;

                  return (
                    <button
                      key={model}
                      onClick={() => handleModelSelect(model)}
                      className={`
                        w-full px-3 py-2 text-left hover:bg-purple-50
                        flex items-center justify-between
                        ${isSelected ? "bg-purple-100" : ""}
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-600 font-mono truncate">{model}</div>
                      </div>
                      {isSelected && (
                        <div className="text-purple-600">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* No Models Message */}
          {availableModels.length === 0 && (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              No models available. Configure AI settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
