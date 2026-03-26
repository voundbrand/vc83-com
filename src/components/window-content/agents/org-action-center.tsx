"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Filter, KanbanSquare, List } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { resolveActionItemTakeoverContext } from "./session-handoff";
import { OrgActivityTimeline } from "./org-activity-timeline";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

const PIPELINE_COLUMNS = [
  { id: "pending", label: "Pending" },
  { id: "assigned", label: "Assigned" },
  { id: "approved", label: "Approved" },
  { id: "executing", label: "Executing" },
  { id: "failed", label: "Failed" },
  { id: "completed", label: "Completed" },
] as const;

type PipelineState = (typeof PIPELINE_COLUMNS)[number]["id"];
type ActionCenterTransition =
  | "approve"
  | "assign"
  | "complete"
  | "retry"
  | "takeover";

interface ActionCenterFilterOption {
  catalogAgentNumber: number;
  label: string;
}

interface ActionCenterItem {
  _id: Id<"objects">;
  title: string;
  summary: string | null;
  status: string;
  pipelineState: PipelineState;
  actionFamily: string;
  catalogAgentNumber: number | null;
  catalogLabel: string | null;
  agentObjectId?: string | null;
  templateAgentId?: string | null;
  channel: string | null;
  sourceSessionId: string | null;
  sourceTurnId: string | null;
  takeover?: {
    required: boolean;
    reason: string | null;
    escalatedAt: number | null;
  } | null;
  policySnapshot?: {
    policySnapshotId: string;
    decision: string;
    riskLevel: string;
    actionFamily: string;
    resolvedAt: number;
  } | null;
  latestReceipt?: {
    receiptId: string;
    executionStatus: string;
    attemptNumber: number;
    correlationId: string;
    idempotencyKey: string;
    errorMessage: string | null;
    startedAt: number | null;
    completedAt: number | null;
    updatedAt: number;
  } | null;
  availableTransitions?: ActionCenterTransition[];
  createdAt: number;
  updatedAt: number;
}

interface ActionCenterView {
  pipelineStates: PipelineState[];
  totalsByPipelineState: Record<PipelineState, number>;
  agentFilters: ActionCenterFilterOption[];
  items: ActionCenterItem[];
  total: number;
}

interface OrgActionCenterProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  scopedAgentId?: Id<"objects">;
  embedded?: boolean;
}

export function OrgActionCenter({
  sessionId,
  organizationId,
  scopedAgentId,
  embedded = false,
}: OrgActionCenterProps) {
  const [selectedCatalogFilter, setSelectedCatalogFilter] = useState<string>("all");
  const [selectedActionItemId, setSelectedActionItemId] = useState<string | null>(null);
  const [pendingTransitionKey, setPendingTransitionKey] = useState<string | null>(null);
  const selectedCatalogAgentNumber = useMemo(() => {
    if (selectedCatalogFilter === "all") {
      return undefined;
    }
    const parsed = Number.parseInt(selectedCatalogFilter, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [selectedCatalogFilter]);

  const transitionActionItem = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.ai.orgActionCenter as any).transitionActionItem,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionCenterView = (useQuery as any)(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.ai.orgActionCenter as any).getActionCenterView,
    {
      sessionId,
      organizationId,
      catalogAgentNumber: selectedCatalogAgentNumber,
      scopedAgentId,
    },
  ) as ActionCenterView | undefined;

  useEffect(() => {
    if (!actionCenterView || actionCenterView.items.length === 0) {
      setSelectedActionItemId(null);
      return;
    }
    if (!selectedActionItemId) {
      setSelectedActionItemId(String(actionCenterView.items[0]._id));
      return;
    }
    const stillExists = actionCenterView.items.some(
      (item) => String(item._id) === selectedActionItemId,
    );
    if (!stillExists) {
      setSelectedActionItemId(String(actionCenterView.items[0]._id));
    }
  }, [actionCenterView, selectedActionItemId]);

  const selectedItem = useMemo(() => {
    if (!actionCenterView || !selectedActionItemId) {
      return null;
    }
    return (
      actionCenterView.items.find(
        (item) => String(item._id) === selectedActionItemId,
      ) || null
    );
  }, [actionCenterView, selectedActionItemId]);

  if (!actionCenterView) {
    return (
      <div className="p-3 border rounded text-xs" style={{ borderColor: "var(--window-document-border)", color: "var(--desktop-menu-text-muted)" }}>
        Loading Action Center...
      </div>
    );
  }

  const containerClassName = embedded
    ? "space-y-3"
    : "h-full min-h-0 flex flex-col gap-3";

  const runTransition = async (
    item: ActionCenterItem,
    transition: ActionCenterTransition,
  ) => {
    const transitionKey = `${item._id}:${transition}`;
    setPendingTransitionKey(transitionKey);
    try {
      await transitionActionItem({
        sessionId,
        organizationId,
        actionItemId: item._id,
        transition,
        assigneeAgentId:
          transition === "assign" || transition === "takeover"
            ? (item.agentObjectId as Id<"objects"> | undefined)
            : undefined,
      });
    } catch (error) {
      console.error("[OrgActionCenter] transition failed", {
        actionItemId: item._id,
        transition,
        error,
      });
    } finally {
      setPendingTransitionKey(null);
    }
  };

  return (
    <div className={containerClassName}>
      <div
        className="border rounded p-3 flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex items-center gap-2">
          <KanbanSquare size={15} />
          <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            Org Action Center
          </p>
          <span className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {actionCenterView.total} item{actionCenterView.total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="org-action-center-agent-filter"
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--window-document-text)" }}
          >
            <Filter size={12} />
            Agent
          </label>
          <select
            id="org-action-center-agent-filter"
            value={selectedCatalogFilter}
            onChange={(event) => setSelectedCatalogFilter(event.target.value)}
            className="px-2 py-1 text-xs border rounded bg-transparent min-w-48"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <option value="all">all</option>
            {actionCenterView.agentFilters.map((filter) => (
              <option
                key={filter.catalogAgentNumber}
                value={String(filter.catalogAgentNumber)}
              >
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {PIPELINE_COLUMNS.map((column) => {
          const count = actionCenterView.totalsByPipelineState[column.id] || 0;
          return (
            <div
              key={column.id}
              className="border rounded px-2 py-1.5 text-center"
              style={{ borderColor: "var(--window-document-border)" }}
            >
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {column.label}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2 min-h-0">
        <section
          className="border rounded p-3 min-h-0"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <header className="mb-2 flex items-center gap-2">
            <List size={14} />
            <h4 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              Action list
            </h4>
          </header>
          {actionCenterView.items.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              No action items for the selected filters.
            </p>
          ) : (
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: "var(--desktop-menu-text-muted)" }}>
                    <th className="text-left font-medium py-1">Action</th>
                    <th className="text-left font-medium py-1">State</th>
                    <th className="text-left font-medium py-1">Agent</th>
                    <th className="text-left font-medium py-1">Updated</th>
                    <th className="text-left font-medium py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actionCenterView.items.map((item) => (
                    <tr
                      key={item._id}
                      className="align-top border-t"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background:
                          String(item._id) === selectedActionItemId
                            ? "rgba(14, 116, 144, 0.06)"
                            : "transparent",
                      }}
                    >
                      <td className="py-1.5 pr-2">
                        <button
                          onClick={() => setSelectedActionItemId(String(item._id))}
                          className="text-left"
                          style={{ color: "var(--window-document-text)" }}
                        >
                          <div className="font-medium">{item.title}</div>
                          {item.summary && (
                            <div className="mt-0.5" style={{ color: "var(--desktop-menu-text-muted)" }}>
                              {item.summary}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="py-1.5 pr-2">
                        <StatusChip status={item.pipelineState} />
                      </td>
                      <td className="py-1.5 pr-2" style={{ color: "var(--window-document-text)" }}>
                        {item.catalogLabel || "uncataloged"}
                      </td>
                      <td className="py-1.5" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {formatRelativeTime(item.updatedAt)}
                      </td>
                      <td className="py-1.5">
                        <ActionButtons
                          item={item}
                          onSelect={() => setSelectedActionItemId(String(item._id))}
                          onTransition={runTransition}
                          pendingTransitionKey={pendingTransitionKey}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="border rounded p-3 min-h-0"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <header className="mb-2 flex items-center gap-2">
            <KanbanSquare size={14} />
            <h4 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              Kanban pipeline
            </h4>
          </header>

          {actionCenterView.items.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              No pipeline cards for the selected filters.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 max-h-[26rem] overflow-auto pr-1">
              {PIPELINE_COLUMNS.map((column) => {
                const columnItems = actionCenterView.items.filter(
                  (item) => item.pipelineState === column.id,
                );

                return (
                  <div
                    key={column.id}
                    className="border rounded p-2"
                    style={{ borderColor: "var(--window-document-border)" }}
                    data-testid={`org-action-center-column-${column.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {column.label}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {columnItems.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {columnItems.map((item) => (
                        <article
                          key={item._id}
                          className="border rounded p-2"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background:
                              String(item._id) === selectedActionItemId
                                ? "rgba(14, 116, 144, 0.06)"
                                : "transparent",
                          }}
                        >
                          <button
                            onClick={() => setSelectedActionItemId(String(item._id))}
                            className="w-full text-left"
                          >
                            <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                              {item.title}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--desktop-menu-text-muted)" }}>
                              {item.actionFamily}
                            </div>
                            {item.catalogLabel && (
                              <div className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                                {item.catalogLabel}
                              </div>
                            )}
                          </button>
                          <div className="mt-2">
                            <ActionButtons
                              item={item}
                              onSelect={() => setSelectedActionItemId(String(item._id))}
                              onTransition={runTransition}
                              pendingTransitionKey={pendingTransitionKey}
                            />
                          </div>
                        </article>
                      ))}
                      {columnItems.length === 0 && (
                        <div className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                          No items
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section
        className="border rounded p-3"
        style={{ borderColor: "var(--window-document-border)" }}
        data-testid="org-action-center-detail"
      >
        <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
          Action detail
        </h4>
        {!selectedItem && (
          <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Select an action item to inspect receipts, policy, and takeover context.
          </p>
        )}
        {selectedItem && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {selectedItem.title}
                </div>
                {selectedItem.summary && (
                  <p className="mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {selectedItem.summary}
                  </p>
                )}
              </div>
              <StatusChip status={selectedItem.pipelineState} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MetricLine label="Action family" value={selectedItem.actionFamily} />
              <MetricLine label="Agent" value={selectedItem.catalogLabel || "uncataloged"} />
              <MetricLine label="Session" value={selectedItem.sourceSessionId || "n/a"} />
              <MetricLine label="Turn" value={selectedItem.sourceTurnId || "n/a"} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
                <div className="font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Policy snapshot
                </div>
                {selectedItem.policySnapshot ? (
                  <div className="space-y-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    <div>Decision: {selectedItem.policySnapshot.decision}</div>
                    <div>Risk: {selectedItem.policySnapshot.riskLevel}</div>
                    <div>Resolved: {formatRelativeTime(selectedItem.policySnapshot.resolvedAt)}</div>
                  </div>
                ) : (
                  <div style={{ color: "var(--desktop-menu-text-muted)" }}>
                    No policy snapshot recorded.
                  </div>
                )}
              </div>

              <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
                <div className="font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Latest receipt
                </div>
                {selectedItem.latestReceipt ? (
                  <div className="space-y-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    <div>Status: {selectedItem.latestReceipt.executionStatus}</div>
                    <div>Attempt: {selectedItem.latestReceipt.attemptNumber}</div>
                    <div>Correlation: {selectedItem.latestReceipt.correlationId}</div>
                    {selectedItem.latestReceipt.errorMessage && (
                      <div>Error: {selectedItem.latestReceipt.errorMessage}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: "var(--desktop-menu-text-muted)" }}>
                    No execution receipt recorded.
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
                Takeover context
              </div>
              {renderTakeoverContext(selectedItem)}
            </div>

            <div>
              <div className="mb-1 font-semibold" style={{ color: "var(--window-document-text)" }}>
                Workflow actions
              </div>
              <ActionButtons
                item={selectedItem}
                onSelect={() => setSelectedActionItemId(String(selectedItem._id))}
                onTransition={runTransition}
                pendingTransitionKey={pendingTransitionKey}
              />
            </div>

            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <OrgActivityTimeline
                sessionId={sessionId}
                organizationId={organizationId}
                actionItemId={selectedItem._id}
                sourceSessionId={selectedItem.sourceSessionId}
                embedded
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ActionButtons(args: {
  item: ActionCenterItem;
  onSelect: () => void;
  onTransition: (item: ActionCenterItem, transition: ActionCenterTransition) => Promise<void>;
  pendingTransitionKey: string | null;
}) {
  const transitions = args.item.availableTransitions || [];
  return (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={args.onSelect}
        className="px-2 py-1 border rounded text-[10px]"
        style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
      >
        Details
      </button>
      {transitions.map((transition) => {
        const key = `${args.item._id}:${transition}`;
        const pending = args.pendingTransitionKey === key;
        return (
          <button
            key={transition}
            onClick={() => void args.onTransition(args.item, transition)}
            disabled={pending}
            className="px-2 py-1 border rounded text-[10px] disabled:opacity-60"
            style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
          >
            {pending ? "..." : transitionLabel(transition)}
          </button>
        );
      })}
    </div>
  );
}

function transitionLabel(transition: ActionCenterTransition): string {
  if (transition === "approve") return "Approve";
  if (transition === "assign") return "Assign";
  if (transition === "complete") return "Complete";
  if (transition === "retry") return "Retry";
  return "Take Over";
}

function renderTakeoverContext(item: ActionCenterItem) {
  const takeoverContext = resolveActionItemTakeoverContext({
    takeoverRequired: item.takeover?.required,
    takeoverReason: item.takeover?.reason,
    escalatedAt: item.takeover?.escalatedAt,
    sourceSessionId: item.sourceSessionId,
  });
  if (!takeoverContext.takeoverRequired) {
    return (
      <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
        No takeover required for this action item.
      </div>
    );
  }
  return (
    <div className="space-y-1 text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
      <div>Takeover required: yes</div>
      <div>Session: {takeoverContext.sessionId || "n/a"}</div>
      <div>
        Escalated:
        {" "}
        {takeoverContext.escalatedAt
          ? formatRelativeTime(takeoverContext.escalatedAt)
          : "n/a"}
      </div>
      {takeoverContext.takeoverReason && <div>Reason: {takeoverContext.takeoverReason}</div>}
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded px-2 py-1.5" style={{ borderColor: "var(--window-document-border)" }}>
      <div style={{ color: "var(--desktop-menu-text-muted)" }}>{label}</div>
      <div style={{ color: "var(--window-document-text)" }}>{value}</div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "just now";
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function StatusChip({ status }: { status: PipelineState }) {
  const tone = resolveStatusTone(status);
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.text,
      }}
    >
      {status}
    </span>
  );
}

function resolveStatusTone(status: PipelineState): {
  bg: string;
  border: string;
  text: string;
} {
  if (status === "completed") {
    return { bg: "#ecfdf3", border: "#86efac", text: "#166534" };
  }
  if (status === "failed") {
    return { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" };
  }
  if (status === "executing") {
    return { bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" };
  }
  if (status === "approved") {
    return { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" };
  }
  if (status === "assigned") {
    return { bg: "#ede9fe", border: "#c4b5fd", text: "#5b21b6" };
  }
  return { bg: "#f3f4f6", border: "#d1d5db", text: "#374151" };
}
