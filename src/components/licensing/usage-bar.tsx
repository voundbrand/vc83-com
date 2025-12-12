"use client";

import { AlertCircle } from "lucide-react";

interface UsageBarProps {
  current: number;
  limit: number;
  label: string;
}

export function UsageBar({ current, limit, label }: UsageBarProps) {
  // Handle unlimited case
  if (limit === -1) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--win95-text)" }}>
            {label}
          </span>
          <span
            className="px-2 py-0.5 text-xs font-bold"
            style={{
              background: "var(--success)",
              color: "white",
            }}
          >
            UNLIMITED
          </span>
        </div>
        <div className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
          Current: {current.toLocaleString()}
        </div>
      </div>
    );
  }

  // Handle not available case
  if (limit === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--win95-text)" }}>
            {label}
          </span>
          <span
            className="px-2 py-0.5 text-xs font-bold"
            style={{
              background: "var(--neutral-gray)",
              color: "white",
            }}
          >
            NOT AVAILABLE
          </span>
        </div>
      </div>
    );
  }

  const percentUsed = Math.round((current / limit) * 100);

  // Determine color based on usage
  const getColor = () => {
    if (percentUsed >= 100) return "var(--error)";
    if (percentUsed >= 76) return "#F97316"; // Orange
    if (percentUsed >= 51) return "var(--warning)";
    return "var(--success)";
  };

  const color = getColor();
  const showWarning = percentUsed >= 75;
  const atLimit = percentUsed >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: "var(--win95-text)" }}>
          {label}
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="w-full h-4 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
        }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min(percentUsed, 100)}%`,
            background: color,
          }}
        />
      </div>

      {/* Status Row */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
          {percentUsed}% used
        </span>
        {atLimit && (
          <span
            className="px-2 py-0.5 text-xs font-bold flex items-center gap-1"
            style={{
              background: "var(--error)",
              color: "white",
            }}
          >
            <AlertCircle size={10} />
            AT LIMIT
          </span>
        )}
        {showWarning && !atLimit && (
          <span
            className="px-2 py-0.5 text-xs font-bold flex items-center gap-1"
            style={{
              background: "#F97316",
              color: "white",
            }}
          >
            <AlertCircle size={10} />
            WARNING
          </span>
        )}
      </div>
    </div>
  );
}
