"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Shuffle,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type TimelineEventStream =
  | "immutable_activity"
  | "workflow_state_checkpoint"
  | "execution_receipt"
  | "policy_decision"
  | "sync_event";

interface OrgActivityTimelineEvent {
  eventId: string;
  stream: TimelineEventStream;
  title: string;
  summary: string;
  immutable: boolean;
  occurredAt: number;
  correlationId: string | null;
  sessionId: string | null;
  turnId: string | null;
  actionItemId: string | null;
  activityKind: string | null;
  actionType: string | null;
  transition: string | null;
  previousStatus: string | null;
  nextStatus: string | null;
  executionStatus: string | null;
  attemptNumber: number | null;
  decision: string | null;
  riskLevel: string | null;
  syncStatus: string | null;
  connectorKey: string | null;
  externalRecordType: string | null;
}

interface OrgActivityTimelineView {
  organizationId: Id<"organizations"> | null;
  sourceSessionId: string | null;
  streams: TimelineEventStream[];
  mutableState: {
    actionItemId: string;
    title: string;
    status: string;
    pipelineState: string;
    updatedAt: number;
    sessionId: string | null;
  } | null;
  events: OrgActivityTimelineEvent[];
  total: number;
}

interface OrgActivityTimelineProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  actionItemId?: Id<"objects">;
  sourceSessionId?: string | null;
  title?: string;
  embedded?: boolean;
  limit?: number;
}

const STREAM_LABELS: Record<TimelineEventStream, string> = {
  immutable_activity: "Immutable activity",
  workflow_state_checkpoint: "Workflow state",
  execution_receipt: "Execution receipts",
  policy_decision: "Policy decisions",
  sync_event: "Sync events",
};

export function OrgActivityTimeline({
  sessionId,
  organizationId,
  actionItemId,
  sourceSessionId,
  title = "Correlated Activity Timeline",
  embedded = false,
  limit = 120,
}: OrgActivityTimelineProps) {
  const [streamFilter, setStreamFilter] = useState<"all" | TimelineEventStream>("all");
  const hasScope = Boolean(actionItemId || sourceSessionId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timelineView = (useQuery as any)(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.ai.orgActionCenter as any).getActivityTimeline,
    hasScope
      ? {
          sessionId,
          organizationId,
          actionItemId,
          sourceSessionId: sourceSessionId || undefined,
          limit,
        }
      : "skip",
  ) as OrgActivityTimelineView | undefined;

  const events = Array.isArray(timelineView?.events)
    ? timelineView.events
    : [];

  const filteredEvents = useMemo(
    () =>
      streamFilter === "all"
        ? events
        : events.filter((event) => event.stream === streamFilter),
    [events, streamFilter],
  );

  const wrapperClassName = embedded ? "space-y-2" : "space-y-3";

  if (!hasScope) {
    return (
      <div className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
        Select an action item or session to load correlated activity.
      </div>
    );
  }

  if (!timelineView) {
    return (
      <div className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
        Loading correlated activity timeline...
      </div>
    );
  }

  return (
    <div className={wrapperClassName} data-testid="org-activity-timeline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {title}
          </div>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {timelineView.total} event{timelineView.total === 1 ? "" : "s"} · source session {timelineView.sourceSessionId || "n/a"}
          </div>
        </div>

        <select
          aria-label="Timeline stream"
          value={streamFilter}
          onChange={(event) => setStreamFilter(event.target.value as "all" | TimelineEventStream)}
          className="px-2 py-1 text-[11px] border rounded bg-transparent"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <option value="all">all streams</option>
          {(timelineView.streams || []).map((stream) => (
            <option key={stream} value={stream}>
              {STREAM_LABELS[stream]}
            </option>
          ))}
        </select>
      </div>

      {timelineView.mutableState && (
        <div
          className="border rounded p-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-panel-bg)",
          }}
        >
          <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Mutable work-item state
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {timelineView.mutableState.title}
            </span>
            <StateBadge status={timelineView.mutableState.pipelineState} />
            <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Updated {formatRelativeTime(timelineView.mutableState.updatedAt)}
            </span>
          </div>
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <div className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          No timeline events match the selected stream filter.
        </div>
      ) : (
        <div className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
          {filteredEvents.map((event) => (
            <TimelineEventRow key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineEventRow({ event }: { event: OrgActivityTimelineEvent }) {
  const tone = resolveStreamTone(event.stream);
  return (
    <article
      className="border rounded p-2"
      style={{
        borderColor: "var(--window-document-border)",
        borderLeft: `3px solid ${tone.accent}`,
        background: "var(--window-document-card-bg)",
      }}
      data-testid={`org-activity-row-${event.stream}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span style={{ color: tone.accent }}>
            <StreamIcon stream={event.stream} />
          </span>
          <div className="text-xs font-semibold truncate" style={{ color: "var(--window-document-text)" }}>
            {event.title}
          </div>
        </div>
        <div className="text-[10px] whitespace-nowrap" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {formatRelativeTime(event.occurredAt)}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <ImmutabilityPill immutable={event.immutable} />
        <span>·</span>
        <span>{STREAM_LABELS[event.stream]}</span>
        {event.transition && (
          <>
            <span>·</span>
            <span>transition {event.transition}</span>
          </>
        )}
        {event.executionStatus && (
          <>
            <span>·</span>
            <span>status {event.executionStatus}</span>
          </>
        )}
        {typeof event.attemptNumber === "number" && (
          <>
            <span>·</span>
            <span>attempt {event.attemptNumber}</span>
          </>
        )}
      </div>

      <div className="mt-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
        {event.summary}
      </div>

      <div className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
        Session {compactId(event.sessionId || "n/a")}
        {event.turnId ? ` · Turn ${compactId(event.turnId)}` : ""}
        {event.actionItemId ? ` · Action ${compactId(event.actionItemId)}` : ""}
      </div>

      {(event.correlationId || event.connectorKey || event.decision || event.syncStatus) && (
        <div className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {event.correlationId ? `Correlation ${compactId(event.correlationId)}` : ""}
          {event.connectorKey ? ` · Connector ${event.connectorKey}` : ""}
          {event.syncStatus ? ` · Sync ${event.syncStatus}` : ""}
          {event.decision ? ` · Decision ${event.decision}` : ""}
          {event.riskLevel ? ` · Risk ${event.riskLevel}` : ""}
        </div>
      )}
    </article>
  );
}

function ImmutabilityPill({ immutable }: { immutable: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 border"
      style={{
        borderColor: immutable ? "#86efac" : "#fcd34d",
        background: immutable ? "#ecfdf3" : "#fffbeb",
        color: immutable ? "#166534" : "#92400e",
      }}
    >
      {immutable ? "Immutable evidence" : "Mutable state checkpoint"}
    </span>
  );
}

function StreamIcon({ stream }: { stream: TimelineEventStream }) {
  if (stream === "workflow_state_checkpoint") {
    return <GitBranch size={12} />;
  }
  if (stream === "execution_receipt") {
    return <CheckCircle2 size={12} />;
  }
  if (stream === "policy_decision") {
    return <ShieldCheck size={12} />;
  }
  if (stream === "sync_event") {
    return <Shuffle size={12} />;
  }
  return <Activity size={12} />;
}

function StateBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let tone = {
    bg: "#f3f4f6",
    border: "#d1d5db",
    color: "#374151",
  };

  if (normalized === "completed") {
    tone = { bg: "#ecfdf3", border: "#86efac", color: "#166534" };
  } else if (normalized === "failed") {
    tone = { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b" };
  } else if (normalized === "executing") {
    tone = { bg: "#dbeafe", border: "#93c5fd", color: "#1d4ed8" };
  } else if (normalized === "approved") {
    tone = { bg: "#fef3c7", border: "#fcd34d", color: "#92400e" };
  } else if (normalized === "assigned") {
    tone = { bg: "#ede9fe", border: "#c4b5fd", color: "#5b21b6" };
  }

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide border"
      style={{ background: tone.bg, borderColor: tone.border, color: tone.color }}
    >
      {normalized}
    </span>
  );
}

function resolveStreamTone(stream: TimelineEventStream): { accent: string } {
  if (stream === "workflow_state_checkpoint") {
    return { accent: "#d97706" };
  }
  if (stream === "execution_receipt") {
    return { accent: "#2563eb" };
  }
  if (stream === "policy_decision") {
    return { accent: "#0f766e" };
  }
  if (stream === "sync_event") {
    return { accent: "#7c3aed" };
  }
  return { accent: "#334155" };
}

function compactId(value: string): string {
  if (value.length <= 20) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "just now";
  }
  const minutes = Math.floor(diffMs / 60000);
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
