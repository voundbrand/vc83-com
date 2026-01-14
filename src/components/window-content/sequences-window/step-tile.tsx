/**
 * STEP TILE
 *
 * Individual step tile in the sequence timeline.
 * Shows timing, channel, and status with actions.
 */

"use client";

import React from "react";
import {
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  ChevronUp,
  ChevronDown,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface SequenceStep {
  id: string;
  order: number;
  offsetType: "before" | "after";
  offsetValue: number;
  offsetUnit: "minutes" | "hours" | "days";
  referencePoint: "trigger_event" | "booking_start" | "booking_end" | "previous_step";
  channel: "email" | "sms" | "whatsapp" | "preferred";
  templateId: string;
  conditions?: {
    minDaysOut?: number;
    onlyIfNotPaid?: boolean;
    onlyIfNoReply?: boolean;
    customCondition?: string;
  };
  enabled: boolean;
}

interface StepTileProps {
  step: SequenceStep;
  index: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function StepTile({
  step,
  index,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
  onDelete,
}: StepTileProps) {
  const getChannelIcon = () => {
    switch (step.channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "whatsapp":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getChannelLabel = () => {
    switch (step.channel) {
      case "email":
        return "Email";
      case "sms":
        return "SMS";
      case "whatsapp":
        return "WhatsApp";
      case "preferred":
        return "Preferred";
      default:
        return "Email";
    }
  };

  const formatTiming = () => {
    const value = step.offsetValue;
    const unit = step.offsetUnit;
    const type = step.offsetType;
    const ref = step.referencePoint;

    const unitLabel = value === 1 ? unit.slice(0, -1) : unit;
    const refLabel = {
      trigger_event: "trigger",
      booking_start: "booking start",
      booking_end: "booking end",
      previous_step: "previous step",
    }[ref];

    return `${value} ${unitLabel} ${type} ${refLabel}`;
  };

  const getChannelColor = () => {
    switch (step.channel) {
      case "email":
        return "var(--win95-highlight)";
      case "sms":
        return "var(--success)";
      case "whatsapp":
        return "#25D366";
      default:
        return "var(--win95-highlight)";
    }
  };

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className="absolute left-2 top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center"
        style={{
          borderColor: step.enabled ? getChannelColor() : "var(--neutral-gray)",
          background: step.enabled ? getChannelColor() : "var(--win95-bg)",
        }}
      >
        <span
          className="text-[8px] font-bold"
          style={{ color: step.enabled ? "white" : "var(--neutral-gray)" }}
        >
          {index + 1}
        </span>
      </div>

      {/* Tile */}
      <div
        className={`border-2 p-3 cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-offset-1" : ""
        }`}
        style={{
          borderColor: isSelected ? getChannelColor() : "var(--win95-border)",
          background: step.enabled ? "var(--win95-bg-light)" : "var(--win95-bg)",
          opacity: step.enabled ? 1 : 0.6,
          // @ts-expect-error CSS custom property
          "--tw-ring-color": getChannelColor(),
        }}
        onClick={onSelect}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="p-1 border"
              style={{
                borderColor: "var(--win95-border)",
                color: getChannelColor(),
              }}
            >
              {getChannelIcon()}
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              Step {index + 1}: {getChannelLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled();
              }}
              className="p-1 hover:bg-opacity-50"
              title={step.enabled ? "Disable step" : "Enable step"}
            >
              {step.enabled ? (
                <ToggleRight className="h-4 w-4" style={{ color: "var(--success)" }} />
              ) : (
                <ToggleLeft className="h-4 w-4" style={{ color: "var(--neutral-gray)" }} />
              )}
            </button>
          </div>
        </div>

        {/* Timing */}
        <div
          className="flex items-center gap-1 text-xs mb-2"
          style={{ color: "var(--neutral-gray)" }}
        >
          <Clock className="h-3 w-3" />
          <span>{formatTiming()}</span>
        </div>

        {/* Template status */}
        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          {step.templateId ? (
            <span style={{ color: "var(--success)" }}>Template assigned</span>
          ) : (
            <span style={{ color: "var(--warning)" }}>No template selected</span>
          )}
        </div>

        {/* Conditions indicator */}
        {step.conditions &&
          (step.conditions.minDaysOut ||
            step.conditions.onlyIfNotPaid ||
            step.conditions.onlyIfNoReply) && (
            <div
              className="mt-2 text-[10px] border-t pt-2"
              style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}
            >
              Has conditions
            </div>
          )}

        {/* Actions (visible on hover/select) */}
        {isSelected && (
          <div
            className="mt-3 pt-2 border-t flex items-center justify-between"
            style={{ borderColor: "var(--win95-border)" }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={isFirst}
                className="retro-button p-1 disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={isLast}
                className="retro-button p-1 disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this step?")) {
                  onDelete();
                }
              }}
              className="retro-button p-1"
              style={{ color: "var(--error)" }}
              title="Delete step"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
