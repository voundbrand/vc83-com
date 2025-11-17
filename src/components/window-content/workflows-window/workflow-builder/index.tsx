/**
 * WORKFLOW BUILDER
 *
 * Visual workflow builder with drag-and-drop canvas.
 * Allows users to create and edit workflows by connecting objects and behaviors.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useNotification } from "../../../../hooks/use-notification";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  ArrowLeft,
  Save,
  Loader2,
  HelpCircle,
  Play,
} from "lucide-react";
import { WorkflowCanvas } from "./workflow-canvas";
import { BehaviorConfigPanel } from "./behavior-config-panel";
import { WorkflowHelpModal } from "./workflow-help-modal";
import { TestModePanel } from "./test-mode-panel";

// Types
interface WorkflowObject {
  objectId: Id<"objects">;
  objectType: string;
  role: string;
  config?: Record<string, unknown>;
}

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
  triggers?: {
    inputTypes?: string[];
    objectTypes?: string[];
    workflows?: string[];
  };
}

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
  const { t } = useNamespaceTranslations("ui.workflows");
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowSubtype, setWorkflowSubtype] = useState("checkout-flow");
  const [triggerOn, setTriggerOn] = useState<string>("manual"); // Default to manual
  const [selectedBehaviors, setSelectedBehaviors] = useState<WorkflowBehavior[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<{
    success: boolean;
    message?: string;
    results: Array<{
      behaviorId: string;
      behaviorType: string;
      status: "success" | "error" | "running";
      duration: number;
      input?: unknown;
      output?: unknown;
      error?: string;
    }>;
    finalOutput?: unknown;
  } | null>(null);

  const notification = useNotification();

  const testWorkflow = useAction(api.workflows.workflowTestExecution.testWorkflow);

  // Load existing workflow if editing
  const existingWorkflow = useQuery(
    api.workflows.workflowOntology.getWorkflow,
    workflowId
      ? { sessionId, workflowId: workflowId as Id<"objects"> }
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
      const customProps = existingWorkflow.customProperties as {
        behaviors?: WorkflowBehavior[];
        execution?: { triggerOn?: string };
      };
      setSelectedBehaviors(customProps?.behaviors || []);
      setTriggerOn(customProps?.execution?.triggerOn || "manual");
    }
  }, [existingWorkflow]);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      notification.error(
        t("ui.workflows.builder.validation.nameRequired.title"),
        t("ui.workflows.builder.validation.nameRequired.message")
      );
      return;
    }

    if (selectedBehaviors.length === 0) {
      notification.error(
        t("ui.workflows.builder.validation.emptyWorkflow.title"),
        t("ui.workflows.builder.validation.emptyWorkflow.message")
      );
      return;
    }

    setIsSaving(true);
    try {
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        status: "draft",
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
          workflowId: workflowId as Id<"objects">,
          updates: workflowData,
        });
        notification.success(
          t("ui.workflows.builder.success.updated.title"),
          t("ui.workflows.builder.success.updated.message", { name: workflowName })
        );
      } else {
        // Create new
        await createWorkflow({
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          workflow: {
            ...workflowData,
            subtype: workflowSubtype,
          },
        });
        notification.success(
          t("ui.workflows.builder.success.created.title"),
          t("ui.workflows.builder.success.created.message", { name: workflowName })
        );
      }

      onBack();
    } catch (error) {
      notification.error(
        t("ui.workflows.builder.error.title"),
        t("ui.workflows.builder.error.message", { error: error instanceof Error ? error.message : 'Unknown error' })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBehavior = useCallback((behavior: WorkflowBehavior) => {
    setSelectedBehaviors((prev) => [...prev, behavior]);
  }, []);

  const handleRemoveBehavior = useCallback((behaviorId: string) => {
    setSelectedBehaviors((prev) => prev.filter((b) => b.id !== behaviorId));
  }, []);

  const handleUpdateBehavior = useCallback((behaviorId: string, updates: Partial<WorkflowBehavior>) => {
    setSelectedBehaviors((prev) =>
      prev.map((b) => (b.id === behaviorId ? { ...b, ...updates } : b))
    );
  }, []);

  const handleTestExecute = useCallback(async (testData: Record<string, unknown>) => {
    if (!workflowId) {
      notification.error(
        "Save Required",
        "Please save the workflow before testing"
      );
      return;
    }

    setIsExecuting(true);
    setExecutionResults(null);

    try {
      const result = await testWorkflow({
        sessionId,
        workflowId: workflowId as Id<"objects">,
        testData,
      });

      setExecutionResults(result);

      if (result.success) {
        notification.success(
          "Test Complete",
          result.message || "Workflow executed successfully"
        );
      } else {
        notification.error(
          "Test Failed",
          result.message || "Workflow execution failed"
        );
      }
    } catch (error) {
      notification.error(
        "Test Error",
        error instanceof Error ? error.message : "Test execution failed"
      );
      setExecutionResults({
        success: false,
        message: error instanceof Error ? error.message : "Test execution failed",
        results: [],
      });
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, sessionId, testWorkflow, notification]);

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
              {t("ui.workflows.builder.header.back")}
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--win95-border)' }} />
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="retro-input text-xs font-bold px-2 py-1"
                placeholder={t("ui.workflows.builder.header.namePlaceholder")}
              />
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="retro-input mt-1 block text-xs px-2 py-1"
                placeholder={t("ui.workflows.builder.header.descriptionPlaceholder")}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestMode(!showTestMode)}
              className="retro-button flex items-center gap-1 px-2 py-1 text-xs"
              style={{ background: showTestMode ? "var(--win95-highlight)" : undefined, color: showTestMode ? "white" : undefined }}
              title="Test Workflow with Sample Data"
            >
              <Play className="h-3 w-3" />
              Test
            </button>

            <button
              onClick={() => setShowHelp(true)}
              className="retro-button flex items-center gap-1 px-2 py-1 text-xs"
              title={t("ui.workflows.builder.header.helpTooltip")}
            >
              <HelpCircle className="h-3 w-3" />
              {t("ui.workflows.builder.header.help")}
            </button>

            <input
              type="text"
              value={workflowSubtype}
              onChange={(e) => setWorkflowSubtype(e.target.value)}
              placeholder={t("ui.workflows.builder.header.subtypePlaceholder")}
              className="retro-input px-2 py-1 text-xs w-64"
              title={t("ui.workflows.builder.header.subtypeTooltip")}
            />

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                {t("ui.workflows.builder.header.triggerLabel")}:
              </label>
              <select
                value={triggerOn}
                onChange={(e) => setTriggerOn(e.target.value)}
                className="retro-input px-2 py-1 text-xs"
                title={t("ui.workflows.builder.header.triggerTooltip")}
              >
                <option value="manual">{t("ui.workflows.builder.header.triggers.manual")}</option>
                <option value="scheduled">{t("ui.workflows.builder.header.triggers.scheduled")}</option>
                <option value="event_completion">{t("ui.workflows.builder.header.triggers.eventCompletion")}</option>
                <option value="api_call">{t("ui.workflows.builder.header.triggers.apiCall")}</option>
                <option value="checkout_start">{t("ui.workflows.builder.header.triggers.checkoutStart")}</option>
                <option value="form_submit">{t("ui.workflows.builder.header.triggers.formSubmit")}</option>
                <option value="payment_complete">{t("ui.workflows.builder.header.triggers.paymentComplete")}</option>
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
                  {t("ui.workflows.builder.header.saving")}
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  {t("ui.workflows.builder.header.save")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Builder Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Canvas (Behavior Pipeline) */}
        <div className="flex-1" style={{ background: 'var(--win95-bg)' }}>
          <WorkflowCanvas
            behaviors={selectedBehaviors}
            triggerOn={triggerOn}
            onRemoveBehavior={handleRemoveBehavior}
            onAddBehavior={handleAddBehavior}
            onUpdateBehavior={handleUpdateBehavior}
          />
        </div>

        {/* Right Panel: Behavior Config */}
        <div className="w-96 border-l-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
          <BehaviorConfigPanel
            selectedBehaviors={selectedBehaviors}
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

      {/* Test Mode Panel */}
      {showTestMode && (
        <TestModePanel
          sessionId={sessionId}
          organizationId={organizationId}
          onExecute={handleTestExecute}
          isExecuting={isExecuting}
          executionResults={executionResults}
          onClose={() => setShowTestMode(false)}
        />
      )}
    </div>
  );
}
