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
}

export function FeatureCategory({
  title,
  features,
  defaultExpanded = false,
}: FeatureCategoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
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
          background: "var(--win95-bg-light)",
          color: "var(--win95-text)",
          border: "1px solid var(--win95-border)",
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
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-b-2 hover:bg-opacity-80 transition-colors"
        style={{
          borderColor: expanded ? "var(--win95-border)" : "transparent",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} style={{ color: "var(--win95-text)" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "var(--win95-text)" }} />
          )}
          <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            {title}
          </span>
          <span
            className="px-2 py-0.5 text-xs font-mono"
            style={{
              background: "var(--win95-bg)",
              color: "var(--neutral-gray)",
              border: "1px solid var(--win95-border)",
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
              style={{ borderColor: "var(--win95-border)" }}
            >
              <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                {feature.label}
              </span>
              {renderFeatureValue(feature.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
