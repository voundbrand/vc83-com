/**
 * WORKFLOW BUILDER
 *
 * Visual workflow builder with drag-and-drop canvas.
 * Allows users to create and edit workflows by connecting objects and behaviors.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useNotification } from "../../../../hooks/use-notification";
import {
  ArrowLeft,
  Save,
  Play,
  Settings as SettingsIcon,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { WorkflowCanvas } from "./workflow-canvas";
import { ObjectSelectorPanel } from "./object-selector-panel";
import { BehaviorConfigPanel } from "./behavior-config-panel";
import { WorkflowHelpModal } from "./workflow-help-modal";

interface WorkflowBuilderProps {
  organizationId: string;
  sessionId: string;
  workflowId: string | null; // null = creating new
  onBack: () => void;
}

export function WorkflowBuilder({
  organizationId,
  sessionId,
  workflowId,
  onBack,
}: WorkflowBuilderProps) {
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowSubtype, setWorkflowSubtype] = useState("checkout-flow");
  const [triggerOn, setTriggerOn] = useState<string>("manual"); // Default to manual
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const notification = useNotification();

  // Load existing workflow if editing
  const existingWorkflow = useQuery(
    api.workflows.workflowOntology.getWorkflow,
    workflowId
      ? { sessionId, workflowId: workflowId as any }
      : "skip"
  );

  const createWorkflow = useMutation(api.workflows.workflowOntology.createWorkflow);
  const updateWorkflow = useMutation(api.workflows.workflowOntology.updateWorkflow);

  // Initialize from existing workflow
  React.useEffect(() => {
    if (existingWorkflow) {
      setWorkflowName(existingWorkflow.name);
      setWorkflowDescription(existingWorkflow.description || "");
      setWorkflowSubtype(existingWorkflow.subtype || "checkout-flow");
      const customProps = existingWorkflow.customProperties as any;
      setSelectedObjects(customProps?.objects || []);
      setSelectedBehaviors(customProps?.behaviors || []);
      setTriggerOn(customProps?.execution?.triggerOn || "manual");
    }
  }, [existingWorkflow]);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      notification.error(
        "Invalid Input",
        "Please enter a workflow name"
      );
      return;
    }

    // Filter out any invalid objects (null or empty objectIds)
    const validObjects = selectedObjects.filter(obj => obj.objectId && obj.objectId.trim() !== "");

    if (validObjects.length === 0 && selectedBehaviors.length === 0) {
      notification.error(
        "Invalid Workflow",
        "Please add at least one object or behavior to the workflow"
      );
      return;
    }

    setIsSaving(true);
    try {
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        status: "draft",
        objects: validObjects,
        behaviors: selectedBehaviors.map((b) => ({
          type: b.type,
          enabled: b.enabled ?? true,
          priority: b.priority ?? 100,
          config: b.config || {},
          triggers: b.triggers,
        })),
        execution: {
          triggerOn: triggerOn, // Use the selected trigger
          requiredInputs: ["product_selection"],
          outputActions: [],
          errorHandling: "continue",
        },
      };

      if (workflowId) {
        // Update existing
        await updateWorkflow({
          sessionId,
          workflowId: workflowId as any,
          updates: workflowData as any,
        });
        notification.success(
          "Workflow Updated",
          `Successfully updated workflow "${workflowName}"`
        );
      } else {
        // Create new
        await createWorkflow({
          sessionId,
          organizationId: organizationId as any,
          workflow: workflowData as any,
        });
        notification.success(
          "Workflow Created",
          `Successfully created workflow "${workflowName}"`
        );
      }

      onBack();
    } catch (error) {
      notification.error(
        "Save Failed",
        `Error saving workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddObject = useCallback((object: any) => {
    setSelectedObjects((prev) => {
      // Prevent duplicates
      if (prev.some((o) => o.objectId === object.objectId)) {
        return prev;
      }
      return [...prev, object];
    });
  }, []);

  const handleRemoveObject = useCallback((objectId: string) => {
    setSelectedObjects((prev) => prev.filter((o) => o.objectId !== objectId));
  }, []);

  const handleAddBehavior = useCallback((behavior: any) => {
    setSelectedBehaviors((prev) => [...prev, behavior]);
  }, []);

  const handleRemoveBehavior = useCallback((behaviorId: string) => {
    setSelectedBehaviors((prev) => prev.filter((b) => b.id !== behaviorId));
  }, []);

  const handleUpdateBehavior = useCallback((behaviorId: string, updates: any) => {
    setSelectedBehaviors((prev) =>
      prev.map((b) => (b.id === behaviorId ? { ...b, ...updates } : b))
    );
  }, []);

  if (workflowId && existingWorkflow === undefined) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b-2 px-4 py-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="retro-button flex items-center gap-1 px-2 py-1 text-xs"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--win95-border)' }} />
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="retro-input text-xs font-bold px-2 py-1"
                placeholder="Workflow Name"
              />
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="retro-input mt-1 block text-xs px-2 py-1"
                placeholder="Add description..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="retro-button flex items-center gap-1 px-2 py-1 text-xs"
              title="Show help guide"
            >
              <HelpCircle className="h-3 w-3" />
              Help
            </button>

            <input
              type="text"
              value={workflowSubtype}
              onChange={(e) => setWorkflowSubtype(e.target.value)}
              placeholder="checkout-flow, form-processing, event-registration..."
              className="retro-input px-2 py-1 text-xs w-64"
              title="Workflow subtype - enter any custom value"
            />

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                Trigger:
              </label>
              <select
                value={triggerOn}
                onChange={(e) => setTriggerOn(e.target.value)}
                className="retro-input px-2 py-1 text-xs"
                title="When should this workflow run?"
              >
                <option value="manual">Manual (Run Now button)</option>
                <option value="scheduled">Scheduled (Time-based)</option>
                <option value="event_completion">Event Completion</option>
                <option value="api_call">API Call</option>
                <option value="checkout_start">Checkout Start</option>
                <option value="form_submit">Form Submit</option>
                <option value="payment_complete">Payment Complete</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="retro-button flex items-center gap-1 px-3 py-1 text-xs font-bold disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Builder Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Object Selector */}
        <div className="w-80 border-r-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
          <ObjectSelectorPanel
            organizationId={organizationId}
            sessionId={sessionId}
            selectedObjects={selectedObjects}
            onAddObject={handleAddObject}
            onRemoveObject={handleRemoveObject}
          />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1" style={{ background: 'var(--win95-bg)' }}>
          <WorkflowCanvas
            objects={selectedObjects}
            behaviors={selectedBehaviors}
            onRemoveObject={handleRemoveObject}
            onRemoveBehavior={handleRemoveBehavior}
          />
        </div>

        {/* Right Panel: Behavior Config */}
        <div className="w-80 border-l-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
          <BehaviorConfigPanel
            selectedBehaviors={selectedBehaviors}
            selectedObjects={selectedObjects}
            onAddBehavior={handleAddBehavior}
            onRemoveBehavior={handleRemoveBehavior}
            onUpdateBehavior={handleUpdateBehavior}
            sessionId={sessionId}
            organizationId={organizationId}
          />
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && <WorkflowHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
