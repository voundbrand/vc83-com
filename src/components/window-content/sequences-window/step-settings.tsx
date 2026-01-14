/**
 * STEP SETTINGS
 *
 * Right panel for configuring step timing, channel, template, and conditions.
 */

"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { X, Mail, MessageSquare, Smartphone, Clock, FileText, Filter } from "lucide-react";

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

interface StepSettingsProps {
  step: SequenceStep;
  sessionId: string;
  organizationId: string;
  onUpdate: (updates: Partial<SequenceStep>) => void;
  onClose: () => void;
}

export function StepSettings({
  step,
  sessionId,
  organizationId,
  onUpdate,
  onClose,
}: StepSettingsProps) {
  // Fetch templates for the selected channel
  const templates = useQuery(api.sequences.templateOntology.listTemplates, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
    channel: step.channel === "preferred" ? undefined : step.channel,
    status: "active",
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-3 mb-3 border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          Step {step.order + 1} Settings
        </h3>
        <button onClick={onClose} className="retro-button p-1" title="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Settings Form */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Channel Selection */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            <Mail className="h-3 w-3" />
            Channel
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["email", "sms", "whatsapp", "preferred"] as const).map((channel) => (
              <button
                key={channel}
                onClick={() => onUpdate({ channel, templateId: "" })}
                className={`retro-button p-2 flex flex-col items-center gap-1 text-[10px] ${
                  step.channel === channel ? "ring-2" : ""
                }`}
                style={{
                  // @ts-expect-error CSS custom property
                  "--tw-ring-color": "var(--win95-highlight)",
                }}
              >
                {getChannelIcon(channel)}
                <span className="capitalize">{channel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timing */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            <Clock className="h-3 w-3" />
            Timing
          </label>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={step.offsetValue}
                onChange={(e) => onUpdate({ offsetValue: parseInt(e.target.value) || 0 })}
                className="retro-input w-20 py-1 px-2 text-xs"
              />
              <select
                value={step.offsetUnit}
                onChange={(e) =>
                  onUpdate({ offsetUnit: e.target.value as "minutes" | "hours" | "days" })
                }
                className="retro-input py-1 pl-2 pr-6 text-xs"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={step.offsetType}
                onChange={(e) => onUpdate({ offsetType: e.target.value as "before" | "after" })}
                className="retro-input py-1 pl-2 pr-6 text-xs flex-1"
              >
                <option value="after">After</option>
                <option value="before">Before</option>
              </select>
              <select
                value={step.referencePoint}
                onChange={(e) =>
                  onUpdate({
                    referencePoint: e.target.value as
                      | "trigger_event"
                      | "booking_start"
                      | "booking_end"
                      | "previous_step",
                  })
                }
                className="retro-input py-1 pl-2 pr-6 text-xs flex-1"
              >
                <option value="trigger_event">Trigger Event</option>
                <option value="booking_start">Booking Start</option>
                <option value="booking_end">Booking End</option>
                <option value="previous_step">Previous Step</option>
              </select>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            <FileText className="h-3 w-3" />
            Message Template
          </label>

          {templates === undefined ? (
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div
              className="border-2 border-dashed p-3 text-center text-xs"
              style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}
            >
              No {step.channel} templates available.
              <br />
              Create one in the Templates tab.
            </div>
          ) : (
            <select
              value={step.templateId}
              onChange={(e) => onUpdate({ templateId: e.target.value })}
              className="retro-input w-full py-1 pl-2 pr-6 text-xs"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Conditions */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            <Filter className="h-3 w-3" />
            Conditions (Optional)
          </label>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs flex-1" style={{ color: "var(--neutral-gray)" }}>
                Min days before booking:
              </label>
              <input
                type="number"
                min="0"
                value={step.conditions?.minDaysOut || ""}
                onChange={(e) =>
                  onUpdate({
                    conditions: {
                      ...step.conditions,
                      minDaysOut: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="Any"
                className="retro-input w-20 py-1 px-2 text-xs"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={step.conditions?.onlyIfNotPaid || false}
                onChange={(e) =>
                  onUpdate({
                    conditions: {
                      ...step.conditions,
                      onlyIfNotPaid: e.target.checked,
                    },
                  })
                }
                className="retro-checkbox"
              />
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Only send if not paid
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={step.conditions?.onlyIfNoReply || false}
                onChange={(e) =>
                  onUpdate({
                    conditions: {
                      ...step.conditions,
                      onlyIfNoReply: e.target.checked,
                    },
                  })
                }
                className="retro-checkbox"
              />
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Only send if no reply
              </span>
            </label>
          </div>
        </div>

        {/* Enable/Disable */}
        <div
          className="pt-3 border-t-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={step.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="retro-checkbox"
            />
            <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              Step enabled
            </span>
          </label>
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            Disabled steps are skipped during execution
          </p>
        </div>
      </div>
    </div>
  );
}
