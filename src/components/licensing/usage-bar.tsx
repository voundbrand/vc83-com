"use client";

import { useState } from "react";
import { AlertCircle, Edit2, Save, X } from "lucide-react";

interface UsageBarProps {
  current: number;
  limit: number;
  label: string;
  limitKey?: string;
  editable?: boolean;
  onLimitChange?: (limitKey: string, newValue: number) => void;
}

export function UsageBar({ 
  current, 
  limit, 
  label, 
  limitKey,
  editable = false,
  onLimitChange 
}: UsageBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(limit === -1 ? "" : limit.toString());

  const handleSave = () => {
    if (!limitKey || !onLimitChange) return;
    const numValue = editValue === "" ? -1 : parseInt(editValue, 10);
    if (isNaN(numValue) || numValue < -1) {
      alert("Please enter a valid number (-1 for unlimited)");
      return;
    }
    onLimitChange(limitKey, numValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(limit === -1 ? "" : limit.toString());
    setIsEditing(false);
  };

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
        {editable && !isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
              {current.toLocaleString()} / {limit === -1 ? "∞" : limit.toLocaleString()}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-opacity-80 transition-colors"
              style={{ color: "var(--win95-highlight)" }}
              title="Edit limit"
            >
              <Edit2 size={12} />
            </button>
          </div>
        ) : editable && isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="-1 for unlimited"
              className="w-24 px-2 py-1 text-xs border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              min="-1"
            />
            <button
              onClick={handleSave}
              className="p-1 hover:bg-opacity-80 transition-colors"
              style={{ color: "var(--success)" }}
              title="Save"
            >
              <Save size={12} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-opacity-80 transition-colors"
              style={{ color: "var(--error)" }}
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
            {current.toLocaleString()} / {limit.toLocaleString()}
          </span>
        )}
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
