/**
 * WORKFLOW CARD
 *
 * Displays a single workflow in card format with status, objects, behaviors.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useNotification } from "../../../hooks/use-notification";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  Zap,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Play,
  Package,
  CheckCircle2,
  Clock,
  ArchiveX,
  PlayCircle,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react";
import { WorkflowExecutionPanel } from "./workflow-execution-panel";

interface WorkflowObject {
  _id: Id<"objects">;
  type: string;
  name: string;
  status: string;
  subtype?: string;
  description?: string;
  customProperties?: {
    objects?: unknown[];
    behaviors?: unknown[];
    execution?: {
      triggerOn?: string;
    };
  };
}

interface WorkflowCardProps {
  workflow: WorkflowObject;
  sessionId: string;
  onEdit: () => void;
}

export function WorkflowCard({ workflow, sessionId, onEdit }: WorkflowCardProps) {
  const { t } = useNamespaceTranslations("ui.workflows");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<Id<"workflowExecutionLogs"> | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<string | null>(null);

  const notification = useNotification();

  // Subscribe to real-time execution logs
  const executionLogs = useQuery(
    api.workflowExecutionLogs.getExecutionLogs,
    currentExecutionId ? { executionId: currentExecutionId } : "skip"
  );
  const deleteWorkflow = useMutation(api.workflows.workflowOntology.deleteWorkflow);
  const duplicateWorkflow = useMutation(api.workflows.workflowOntology.duplicateWorkflow);
  const updateWorkflow = useMutation(api.workflows.workflowOntology.updateWorkflow);
  const executeWorkflow = useAction(api.workflows.workflowOntology.executeWorkflow);

  const customProps = workflow.customProperties;
  const objectCount = (customProps?.objects as unknown[] | undefined)?.length || 0;
  const behaviorCount = (customProps?.behaviors as unknown[] | undefined)?.length || 0;
  const triggerOn = customProps?.execution?.triggerOn || "unknown";

  // Determine if workflow can be manually triggered
  // Manual trigger is allowed for:
  // - "manual" (admin-triggered)
  // - "scheduled" (can test schedule)
  // - "event_completion" (can test event completion logic)
  // - "api_call" (can test API logic)
  //
  // Manual trigger is NOT allowed for:
  // - "checkout_start" (needs checkout session data)
  // - "form_submission" (needs form data)
  // - "payment_complete" (needs payment data)
  const canManuallyTrigger =
    triggerOn === "manual" ||
    triggerOn === "scheduled" ||
    triggerOn === "event_completion" ||
    triggerOn === "api_call" ||
    !triggerOn; // Default to allowing if undefined

  const handleDelete = async () => {
    if (confirm(t("ui.workflows.card.menu.confirmDelete"))) {
      await deleteWorkflow({
        sessionId,
        workflowId: workflow._id,
      });
    }
    setMenuOpen(false);
  };

  const handleDuplicate = async () => {
    await duplicateWorkflow({
      sessionId,
      workflowId: workflow._id,
      newName: `${workflow.name} ${t("ui.workflows.card.menu.copySuffix")}`,
    });
    setMenuOpen(false);
  };

  const handleToggleStatus = async () => {
    const newStatus = workflow.status === "active" ? "draft" : "active";
    await updateWorkflow({
      sessionId,
      workflowId: workflow._id,
      updates: { status: newStatus },
    });
    setMenuOpen(false);
  };

  const handleExportLogs = () => {
    if (!executionLogs) return;

    const logData = {
      workflow: workflow.name,
      executedAt: new Date(executionLogs.startedAt).toISOString(),
      completedAt: executionLogs.completedAt ? new Date(executionLogs.completedAt).toISOString() : null,
      status: executionLogs.status,
      logs: executionLogs.logs,
      result: executionLogs.result,
      invoiceId: createdInvoiceId,
      invoiceNumber: createdInvoiceNumber,
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-execution-${workflow.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notification.success(
      t("ui.workflows.card.export.title"),
      t("ui.workflows.card.export.success")
    );
  };

  // Stop running indicator when execution completes
  useEffect(() => {
    if (executionLogs?.status === "success" || executionLogs?.status === "failed") {
      setIsRunning(false);
    }
  }, [executionLogs?.status]);

  // Extract invoice info from execution results
  useEffect(() => {
    if (executionLogs?.result) {
      const behaviorResults = executionLogs.result.results || [];
      let invoiceId: string | null = null;
      let invoiceNumber: string | null = null;

      behaviorResults.forEach((behaviorResult: { invoiceId?: string; invoiceNumber?: string }) => {
        if (behaviorResult.invoiceId) {
          invoiceId = behaviorResult.invoiceId;
        }
        if (behaviorResult.invoiceNumber) {
          invoiceNumber = behaviorResult.invoiceNumber;
        }
      });

      if (invoiceId) setCreatedInvoiceId(invoiceId);
      if (invoiceNumber) setCreatedInvoiceNumber(invoiceNumber);
    }
  }, [executionLogs?.result]);

  const handleRunNow = async () => {
    setIsRunning(true);
    setShowProgressModal(true);
    setCurrentExecutionId(null);
    setCreatedInvoiceId(null);
    setCreatedInvoiceNumber(null);

    try {
      const result = await executeWorkflow({
        sessionId,
        workflowId: workflow._id,
        manualTrigger: true,
      });

      // Set execution ID to start subscribing to logs
      if (result.behaviorResults && result.behaviorResults[0]?.executionId) {
        setCurrentExecutionId(result.behaviorResults[0].executionId);
      }

      if (result.success) {
        notification.success(
          t("ui.workflows.card.execution.success.title"),
          result.message || t("ui.workflows.card.execution.success.message")
        );
      } else {
        notification.error(
          t("ui.workflows.card.execution.failed.title"),
          result.error || t("ui.workflows.card.execution.failed.message")
        );
        setIsRunning(false);
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      notification.error(
        t("ui.workflows.card.execution.error.title"),
        error instanceof Error ? error.message : t("ui.workflows.card.execution.error.message")
      );
      setIsRunning(false);
    }
  };

  const statusConfig = {
    active: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: t("ui.workflows.card.status.active"),
      bg: 'var(--success)',
      text: 'var(--win95-bg-light)',
    },
    draft: {
      icon: <Clock className="h-3 w-3" />,
      label: t("ui.workflows.card.status.draft"),
      bg: 'var(--warning)',
      text: 'var(--win95-text)',
    },
    archived: {
      icon: <ArchiveX className="h-3 w-3" />,
      label: t("ui.workflows.card.status.archived"),
      bg: 'var(--neutral-gray)',
      text: 'var(--win95-bg-light)',
    },
  };

  const status = statusConfig[workflow.status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <div className="group relative border-2 p-3 transition-shadow" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className="border-2 p-1" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
            <Zap className="h-4 w-4" style={{ color: 'var(--win95-highlight)' }} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{workflow.name}</h4>
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>{workflow.subtype}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="retro-button p-1 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-40 border-2 py-1 shadow-lg" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
                <button
                  onClick={onEdit}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                  style={{ color: 'var(--win95-text)' }}
                >
                  <Edit2 className="h-3 w-3" />
                  {t("ui.workflows.card.menu.edit")}
                </button>
                <button
                  onClick={handleToggleStatus}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                  style={{ color: 'var(--win95-text)' }}
                >
                  <Play className="h-3 w-3" />
                  {workflow.status === "active" ? t("ui.workflows.card.menu.setDraft") : t("ui.workflows.card.menu.activate")}
                </button>
                <button
                  onClick={handleDuplicate}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                  style={{ color: 'var(--win95-text)' }}
                >
                  <Copy className="h-3 w-3" />
                  {t("ui.workflows.card.menu.duplicate")}
                </button>
                <div className="my-1 border-t" style={{ borderColor: 'var(--win95-border)' }} />
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-opacity-50 transition-colors"
                  style={{ color: 'var(--error)' }}
                >
                  <Trash2 className="h-3 w-3" />
                  {t("ui.workflows.card.menu.archive")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <p className="mb-3 text-xs line-clamp-2" style={{ color: 'var(--neutral-gray)' }}>
          {workflow.description}
        </p>
      )}

      {/* Stats */}
      <div className="mb-3 flex items-center gap-3 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          <span>{objectCount} {t("ui.workflows.card.stats.objects")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>{behaviorCount} {t("ui.workflows.card.stats.behaviors")}</span>
        </div>
      </div>

      {/* Trigger */}
      <div className="mb-3">
        <div className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
          {t("ui.workflows.card.trigger.label")}: {triggerOn.replace(/_/g, " ")}
        </div>
      </div>

      {/* Status Badge and Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: 'var(--win95-border)', background: status.bg, color: status.text }}>
          {status.icon}
          {status.label}
        </div>

        <div className="flex items-center gap-2">
          {canManuallyTrigger ? (
            <button
              onClick={handleRunNow}
              disabled={isRunning}
              className="retro-button inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              title={t("ui.workflows.card.actions.runNow.tooltip")}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("ui.workflows.card.actions.running")}
                </>
              ) : (
                <>
                  <PlayCircle className="h-3 w-3" />
                  {t("ui.workflows.card.actions.runNow.label")}
                </>
              )}
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] opacity-50"
              title={t("ui.workflows.card.actions.autoTrigger.tooltip")}
              style={{ color: 'var(--neutral-gray)' }}
            >
              <PlayCircle className="h-3 w-3" />
              {t("ui.workflows.card.actions.autoTrigger.label")}
            </div>
          )}

          <button
            onClick={onEdit}
            className="text-xs font-bold hover:underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            {t("ui.workflows.card.actions.edit")} →
          </button>
        </div>
      </div>

      {/* Enhanced Progress Modal with N8N-Style Debug Panel */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="h-full flex gap-4" style={{ maxWidth: 'calc(100% - 32px)' }}>
            {/* Left: Summary Panel */}
            <div className="w-96 border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] flex flex-col" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              {/* Title Bar */}
              <div className="flex items-center justify-between border-b-4 px-4 py-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-highlight)' }}>
                <h3 className="text-sm font-bold text-white">{t("ui.workflows.card.modal.title")}</h3>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="border-2 px-2 py-0.5 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
                  style={{ borderColor: 'white' }}
                >
                  ✕
                </button>
              </div>

              {/* Summary Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {!executionLogs || executionLogs.logs.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--neutral-gray)' }}>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("ui.workflows.card.modal.executing")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status indicator */}
                    {executionLogs.status !== "running" && (
                      <div
                        className="border-2 p-3"
                        style={{
                          borderColor: 'var(--win95-border)',
                          background: executionLogs.status === 'success' ? 'var(--success-light)' : 'var(--error-light)'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {executionLogs.status === 'success' ? (
                            <>
                              <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success)' }} />
                              <span className="font-bold text-sm" style={{ color: 'var(--success)' }}>
                                {t("ui.workflows.card.modal.completed")}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-sm font-bold" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>✕</div>
                              <span className="font-bold text-sm" style={{ color: 'var(--error)' }}>
                                {t("ui.workflows.card.modal.failed")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Workflow Info */}
                    <div className="border-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
                      <div className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                        Workflow: {workflow.name}
                      </div>
                      <div className="text-[10px] space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                        <div>Started: {new Date(executionLogs.startedAt).toLocaleString()}</div>
                        {executionLogs.completedAt && (
                          <>
                            <div>Completed: {new Date(executionLogs.completedAt).toLocaleString()}</div>
                            <div>
                              Duration: {((executionLogs.completedAt - executionLogs.startedAt) / 1000).toFixed(2)}s
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {createdInvoiceId && (
                      <div className="border-2 p-3" style={{ borderColor: 'var(--success)', background: 'var(--success-light)' }}>
                        <div className="text-xs font-bold mb-1" style={{ color: 'var(--success)' }}>
                          Invoice Created
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--success)' }}>
                          {createdInvoiceNumber}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t-4 px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'var(--win95-border)' }}>
                {createdInvoiceId && (
                  <button
                    onClick={() => {
                      notification.info(
                        t("ui.workflows.card.modal.viewInvoice.title"),
                        t("ui.workflows.card.modal.viewInvoice.message", { invoiceNumber: createdInvoiceNumber || '' })
                      );
                    }}
                    className="retro-button inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-bold w-full"
                    style={{ background: 'var(--success)', color: 'white' }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("ui.workflows.card.modal.viewInvoice.button")} {createdInvoiceNumber}
                  </button>
                )}
                {executionLogs && executionLogs.logs.length > 0 && (
                  <button
                    onClick={handleExportLogs}
                    className="retro-button inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-bold w-full"
                  >
                    <Download className="h-3 w-3" />
                    {t("ui.workflows.card.modal.exportLogs")}
                  </button>
                )}
              </div>
            </div>

            {/* Right: N8N-Style Debug Panel */}
            <WorkflowExecutionPanel
              executionId={currentExecutionId}
              onClose={() => setShowProgressModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
