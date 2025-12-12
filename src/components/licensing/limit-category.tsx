"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { UsageBar } from "./usage-bar";

interface LimitItem {
  key: string;
  label: string;
  value: number;
  current?: number;
}

interface LimitCategoryProps {
  title: string;
  limits: LimitItem[];
  defaultExpanded?: boolean;
}

export function LimitCategory({
  title,
  limits,
  defaultExpanded = false,
}: LimitCategoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

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
            {limits.length} {limits.length === 1 ? "limit" : "limits"}
          </span>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {limits.map((limit) => (
            <UsageBar
              key={limit.key}
              label={limit.label}
              current={limit.current ?? 0}
              limit={limit.value}
            />
          ))}
        </div>
      )}
    </div>
  );
}
