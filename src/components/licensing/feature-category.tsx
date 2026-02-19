"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";

interface FeatureItem {
  key: string;
  label: string;
  value: boolean | string;
}

interface FeatureCategoryProps {
  title: string;
  features: FeatureItem[];
  defaultExpanded?: boolean;
  editable?: boolean;
  onToggle?: (featureKey: string, currentValue: boolean) => void;
}

export function FeatureCategory({
  title,
  features,
  defaultExpanded = false,
  editable = false,
  onToggle,
}: FeatureCategoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const renderFeatureValue = (feature: FeatureItem) => {
    const value = feature.value;

    if (typeof value === "boolean") {
      // If editable, make it a clickable button
      if (editable && onToggle) {
        return (
          <button
            onClick={() => onToggle(feature.key, value)}
            className="px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              background: value ? "var(--success)" : "var(--error)",
              color: "white",
            }}
          >
            {value ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {value ? "ENABLED" : "DISABLED"}
          </button>
        );
      }

      // Read-only display
      return value ? (
        <span
          className="px-2 py-1 text-xs font-bold flex items-center gap-1"
          style={{
            background: "var(--success)",
            color: "white",
          }}
        >
          <CheckCircle size={12} />
          ENABLED
        </span>
      ) : (
        <span
          className="px-2 py-1 text-xs font-bold flex items-center gap-1"
          style={{
            background: "var(--error)",
            color: "white",
          }}
        >
          <XCircle size={12} />
          DISABLED
        </span>
      );
    }

    // Enum value
    return (
      <span
        className="px-2 py-1 text-xs font-mono"
        style={{
          background: "var(--shell-surface-elevated)",
          color: "var(--shell-text)",
          border: "1px solid var(--shell-border)",
        }}
      >
        {value}
      </span>
    );
  };

  return (
    <div
      className="border-2"
      style={{
        borderColor: "var(--shell-border)",
        background: "var(--shell-surface)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-b-2 hover:bg-opacity-80 transition-colors"
        style={{
          borderColor: expanded ? "var(--shell-border)" : "transparent",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} style={{ color: "var(--shell-text)" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "var(--shell-text)" }} />
          )}
          <span className="text-xs font-bold" style={{ color: "var(--shell-text)" }}>
            {title}
          </span>
          <span
            className="px-2 py-0.5 text-xs font-mono"
            style={{
              background: "var(--shell-surface)",
              color: "var(--neutral-gray)",
              border: "1px solid var(--shell-border)",
            }}
          >
            {features.length} {features.length === 1 ? "feature" : "features"}
          </span>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-3">
          {features.map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between py-2 border-b"
              style={{ borderColor: "var(--shell-border)" }}
            >
              <span className="text-xs" style={{ color: "var(--shell-text)" }}>
                {feature.label}
              </span>
              {renderFeatureValue(feature)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
