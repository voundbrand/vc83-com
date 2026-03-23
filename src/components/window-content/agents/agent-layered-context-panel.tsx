"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Layers, Link2, Trash2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

interface AgentLayeredContextPanelProps {
  sessionId: string;
  agentId: Id<"objects">;
}

interface AttachedWorkflowRecord {
  linkId: Id<"objectLinks">;
  workflowId: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
  workflowMode?: string;
}

interface AvailableWorkflowRecord {
  _id: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString();
}

export function AgentLayeredContextPanel({
  sessionId,
  agentId,
}: AgentLayeredContextPanelProps) {
  const attachedWorkflows = useQuery(
    apiAny.agentOntology.getAgentLayeredContextWorkflows,
    { sessionId, agentId },
  ) as AttachedWorkflowRecord[] | undefined;
  const availableWorkflows = useQuery(
    apiAny.layers.layerWorkflowOntology.listWorkflows,
    { sessionId },
  ) as AvailableWorkflowRecord[] | undefined;
  const attachWorkflow = useMutation(apiAny.agentOntology.attachLayeredContextWorkflow);
  const detachWorkflow = useMutation(apiAny.agentOntology.detachLayeredContextWorkflow);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const unlinkedWorkflows = useMemo(() => {
    const attachedIds = new Set((attachedWorkflows || []).map((workflow) => String(workflow.workflowId)));
    return (availableWorkflows || []).filter((workflow) => !attachedIds.has(String(workflow._id)));
  }, [attachedWorkflows, availableWorkflows]);

  const handleAttach = async () => {
    if (!selectedWorkflowId) {
      return;
    }
    setIsSaving(true);
    try {
      await attachWorkflow({
        sessionId,
        agentId,
        workflowId: selectedWorkflowId as Id<"objects">,
      });
      setSelectedWorkflowId("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetach = async (workflowId: Id<"objects">) => {
    setIsSaving(true);
    try {
      await detachWorkflow({
        sessionId,
        agentId,
        workflowId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div
        className="border rounded-sm p-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Layers size={15} style={{ color: "var(--window-document-text)" }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                Agent Layered Context
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                Attach multiple workflows to this agent. Runtime uses attached workflows automatically, and any conversation-selected
                layered context stays highest priority.
              </p>
            </div>
          </div>
          <Link
            href="/layers"
            className="inline-flex items-center gap-1 px-2 py-1 border text-[11px] rounded-sm"
            style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
          >
            <ExternalLink size={11} />
            Open Layers
          </Link>
        </div>
      </div>

      <div
        className="border rounded-sm p-3 space-y-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
      >
        <div className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          Attach Existing Workflow
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <select
            value={selectedWorkflowId}
            onChange={(event) => setSelectedWorkflowId(event.target.value)}
            className="flex-1 border px-2 py-1 text-xs"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--win95-bg-light, var(--window-document-bg))",
              color: "var(--window-document-text)",
            }}
          >
            <option value="">Select a workflow</option>
            {unlinkedWorkflows.map((workflow) => (
              <option key={workflow._id} value={workflow._id}>
                {workflow.name} ({workflow.nodeCount} nodes)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleAttach()}
            disabled={!selectedWorkflowId || isSaving}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border text-xs rounded-sm disabled:opacity-50"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--desktop-shell-accent)",
              color: "var(--window-document-text)",
            }}
          >
            <Link2 size={12} />
            Attach
          </button>
        </div>
        <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
          New workflows created through chat can also attach directly by passing an agent ID to the workflow tool.
        </p>
      </div>

      <div
        className="border rounded-sm p-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
      >
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--window-document-text)" }}>
          Attached Workflows
        </div>

        {!attachedWorkflows ? (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading layered context workflows...
          </div>
        ) : attachedWorkflows.length === 0 ? (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No layered context workflows attached yet.
          </div>
        ) : (
          <div className="space-y-2">
            {attachedWorkflows.map((workflow) => (
              <div
                key={workflow.linkId}
                className="border rounded-sm p-3"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {workflow.name}
                    </div>
                    {workflow.description ? (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                        {workflow.description}
                      </p>
                    ) : null}
                    <div className="mt-2 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                      {workflow.nodeCount} nodes • {workflow.edgeCount} edges • {workflow.status}
                      {workflow.workflowMode ? ` • ${workflow.workflowMode}` : ""}
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                      Updated {formatDate(workflow.updatedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDetach(workflow.workflowId)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 px-2 py-1 border text-[11px] rounded-sm disabled:opacity-50"
                    style={{
                      borderColor: "var(--window-document-border)",
                      color: "var(--window-document-text)",
                    }}
                  >
                    <Trash2 size={11} />
                    Detach
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
