/**
 * SEQUENCE EDITOR
 *
 * Visual timeline editor for creating and editing automation sequences.
 * Shows steps as tiles in a vertical timeline with drag-to-reorder.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { StepTile } from "./step-tile";
import { StepSettings } from "./step-settings";
import {
  ArrowLeft,
  Plus,
  Save,
  Play,
  Pause,
  Loader2,
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
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

interface SequenceEditorProps {
  organizationId: string;
  sessionId: string;
  sequenceId: string | null;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export function SequenceEditor({
  organizationId,
  sessionId,
  sequenceId,
  onBack,
  onSaveSuccess,
}: SequenceEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subtype, setSubtype] = useState("custom");
  const [triggerEvent, setTriggerEvent] = useState<string>("manual_enrollment");
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sequence = useQuery(
    api.sequences.sequenceOntology.getSequence,
    sequenceId ? { sessionId, sequenceId: sequenceId as Id<"objects"> } : "skip"
  );

  const createSequence = useMutation(api.sequences.sequenceOntology.createSequence);
  const updateSequence = useMutation(api.sequences.sequenceOntology.updateSequence);
  const activateSequence = useMutation(api.sequences.sequenceOntology.activateSequence);
  const pauseSequence = useMutation(api.sequences.sequenceOntology.pauseSequence);

  // Load sequence data when editing
  useEffect(() => {
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description || "");
      setSubtype(sequence.subtype || "custom");
      const props = sequence.customProperties as Record<string, unknown>;
      setTriggerEvent((props?.triggerEvent as string) || "manual_enrollment");
      setSteps((props?.steps as SequenceStep[]) || []);
    }
  }, [sequence]);

  const handleAddStep = () => {
    const newStep: SequenceStep = {
      id: `step-${Date.now()}`,
      order: steps.length,
      offsetType: "after",
      offsetValue: 1,
      offsetUnit: "days",
      referencePoint: steps.length === 0 ? "trigger_event" : "previous_step",
      channel: "email",
      templateId: "",
      conditions: {},
      enabled: true,
    };
    setSteps([...steps, newStep]);
    setSelectedStepId(newStep.id);
    setHasChanges(true);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<SequenceStep>) => {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)));
    setHasChanges(true);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
    }
    setHasChanges(true);
  };

  const handleMoveStep = (stepId: string, direction: "up" | "down") => {
    const index = steps.findIndex((s) => s.id === stepId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a sequence name");
      return;
    }

    setIsSaving(true);
    try {
      if (sequenceId) {
        await updateSequence({
          sessionId,
          sequenceId: sequenceId as Id<"objects">,
          updates: {
            name,
            description,
            subtype,
            triggerEvent: triggerEvent as
              | "booking_confirmed"
              | "booking_checked_in"
              | "booking_completed"
              | "booking_cancelled"
              | "pipeline_stage_changed"
              | "contact_tagged"
              | "form_submitted"
              | "manual_enrollment",
            steps: steps.map((s) => ({
              ...s,
              templateId: s.templateId as Id<"objects">,
            })),
          },
        });
      } else {
        await createSequence({
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          name,
          description,
          subtype,
          triggerEvent: triggerEvent as
            | "booking_confirmed"
            | "booking_checked_in"
            | "booking_completed"
            | "booking_cancelled"
            | "pipeline_stage_changed"
            | "contact_tagged"
            | "form_submitted"
            | "manual_enrollment",
          steps: steps.map((s) => ({
            ...s,
            templateId: s.templateId as Id<"objects">,
          })),
        });
      }
      setHasChanges(false);
      onSaveSuccess();
    } catch (error) {
      console.error("Failed to save sequence:", error);
      alert("Failed to save sequence. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!sequenceId) return;
    try {
      await activateSequence({ sessionId, sequenceId: sequenceId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to activate:", error);
      alert(error instanceof Error ? error.message : "Failed to activate sequence");
    }
  };

  const handlePause = async () => {
    if (!sequenceId) return;
    try {
      await pauseSequence({ sessionId, sequenceId: sequenceId as Id<"objects"> });
    } catch (error) {
      console.error("Failed to pause:", error);
    }
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);

  if (sequenceId && sequence === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="border-b-2 p-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="retro-button p-1"
              title="Back to list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Sequence name..."
                className="retro-input text-sm font-bold px-2 py-1 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sequenceId && sequence?.status === "draft" && (
              <button
                onClick={handleActivate}
                className="retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold"
                style={{ background: "var(--success)", color: "white" }}
              >
                <Play className="h-3 w-3" />
                Activate
              </button>
            )}
            {sequenceId && sequence?.status === "active" && (
              <button
                onClick={handlePause}
                className="retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold"
              >
                <Pause className="h-3 w-3" />
                Pause
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        </div>

        {/* Sequence Settings */}
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Type:
            </label>
            <select
              value={subtype}
              onChange={(e) => {
                setSubtype(e.target.value);
                setHasChanges(true);
              }}
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="vorher">Pre-Event (Vorher)</option>
              <option value="waehrend">During Event (Während)</option>
              <option value="nachher">Post-Event (Nachher)</option>
              <option value="lifecycle">Lifecycle</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Trigger:
            </label>
            <select
              value={triggerEvent}
              onChange={(e) => {
                setTriggerEvent(e.target.value);
                setHasChanges(true);
              }}
              className="retro-input py-1 pl-2 pr-6 text-xs"
            >
              <option value="booking_confirmed">Booking Confirmed</option>
              <option value="booking_checked_in">Booking Check-In</option>
              <option value="booking_completed">Booking Completed</option>
              <option value="booking_cancelled">Booking Cancelled</option>
              <option value="pipeline_stage_changed">Pipeline Stage Changed</option>
              <option value="contact_tagged">Contact Tagged</option>
              <option value="form_submitted">Form Submitted</option>
              <option value="manual_enrollment">Manual Enrollment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline Panel */}
        <div
          className="w-1/2 border-r-2 overflow-auto p-4"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              Sequence Steps ({steps.length})
            </h3>
            <button
              onClick={handleAddStep}
              className="retro-button flex items-center gap-1 px-2 py-1 text-xs font-bold"
            >
              <Plus className="h-3 w-3" />
              Add Step
            </button>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            {steps.length > 0 && (
              <div
                className="absolute left-4 top-0 bottom-0 w-0.5"
                style={{ background: "var(--win95-border)" }}
              />
            )}

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepTile
                  key={step.id}
                  step={step}
                  index={index}
                  isSelected={selectedStepId === step.id}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  onSelect={() => setSelectedStepId(step.id)}
                  onToggleEnabled={() =>
                    handleUpdateStep(step.id, { enabled: !step.enabled })
                  }
                  onMoveUp={() => handleMoveStep(step.id, "up")}
                  onMoveDown={() => handleMoveStep(step.id, "down")}
                  onDelete={() => handleDeleteStep(step.id)}
                />
              ))}
            </div>

            {/* Empty state */}
            {steps.length === 0 && (
              <div
                className="border-2 border-dashed p-8 text-center"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <Mail
                  className="mx-auto h-12 w-12 mb-3"
                  style={{ color: "var(--neutral-gray)", opacity: 0.3 }}
                />
                <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                  No steps yet. Add your first step to start building the sequence.
                </p>
                <button
                  onClick={handleAddStep}
                  className="retro-button flex items-center gap-1 px-3 py-2 text-xs font-bold mx-auto"
                >
                  <Plus className="h-3 w-3" />
                  Add First Step
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="w-1/2 overflow-auto p-4" style={{ background: "var(--win95-bg)" }}>
          {selectedStep ? (
            <StepSettings
              step={selectedStep}
              sessionId={sessionId}
              organizationId={organizationId}
              onUpdate={(updates) => handleUpdateStep(selectedStep.id, updates)}
              onClose={() => setSelectedStepId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Settings
                  className="mx-auto h-12 w-12 mb-3"
                  style={{ color: "var(--neutral-gray)", opacity: 0.3 }}
                />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Select a step to configure its settings
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
