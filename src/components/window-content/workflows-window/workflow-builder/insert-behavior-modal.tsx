/**
 * INSERT BEHAVIOR MODAL
 *
 * Modal for inserting a behavior between two existing behaviors.
 * Appears when clicking the "+" button on an edge.
 */

"use client";

import React, { useState } from "react";
import { X, Zap } from "lucide-react";

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
  outputs?: string[];
  branches?: {
    [outputName: string]: {
      condition: string;
      nextBehaviorId?: string;
    };
  };
}

interface InsertBehaviorModalProps {
  afterBehaviorId: string;
  beforeBehaviorId: string;
  onInsert: (behavior: WorkflowBehavior) => void;
  onCancel: () => void;
}

// Available behavior types (simplified - you can expand this)
const BEHAVIOR_TYPES = [
  { type: "validate-input", name: "Validate Input", description: "Validate form data or API input" },
  { type: "transform-data", name: "Transform Data", description: "Transform or map data fields" },
  { type: "conditional", name: "Conditional Logic", description: "Branch based on conditions" },
  { type: "email-notification", name: "Send Email", description: "Send email notifications" },
  { type: "crm-sync", name: "CRM Sync", description: "Sync to CRM system" },
  { type: "payment-process", name: "Process Payment", description: "Handle payment processing" },
  { type: "webhook", name: "Webhook Call", description: "Make HTTP webhook call" },
  { type: "delay", name: "Delay", description: "Wait for specified time" },
];

export function InsertBehaviorModal({
  onInsert,
  onCancel,
}: InsertBehaviorModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleInsert = () => {
    if (!selectedType) return;

    const behaviorType = BEHAVIOR_TYPES.find((b) => b.type === selectedType);
    if (!behaviorType) return;

    const isConditional = selectedType === "conditional";
    const newBehavior: WorkflowBehavior = {
      id: `bhv_${Date.now()}`,
      type: selectedType,
      enabled: true,
      priority: 50, // Will be recalculated based on position
      config: isConditional
        ? {
            conditions: [
              { name: "success", expression: "input.valid === true", color: "#16a34a" },
              { name: "error", expression: "input.valid !== true", color: "#dc2626" },
            ],
          }
        : {},
      ...(isConditional && {
        outputs: ["success", "error"],
      }),
    };

    onInsert(newBehavior);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.7)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between border-b-4 px-4 py-2"
          style={{ borderColor: "var(--window-document-border)", background: "var(--tone-accent)" }}
        >
          <h3 className="text-sm font-bold text-white">Insert Behavior</h3>
          <button
            onClick={onCancel}
            className="border-2 px-2 py-0.5 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
            style={{ borderColor: "white" }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
            Select a behavior to insert between the two existing steps:
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {BEHAVIOR_TYPES.map((behaviorType) => (
              <button
                key={behaviorType.type}
                onClick={() => setSelectedType(behaviorType.type)}
                className={`desktop-interior-button w-full text-left p-3 ${
                  selectedType === behaviorType.type ? "shadow-inner" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="border p-1"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: selectedType === behaviorType.type
                        ? "var(--tone-accent)"
                        : "var(--window-document-bg)",
                    }}
                  >
                    <Zap
                      className="h-4 w-4"
                      style={{
                        color: selectedType === behaviorType.type
                          ? "white"
                          : "var(--tone-accent)",
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      {behaviorType.name}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {behaviorType.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button onClick={onCancel} className="desktop-interior-button px-4 py-2 text-xs font-bold">
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!selectedType}
              className="desktop-interior-button desktop-interior-button-primary px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              Insert Behavior
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
