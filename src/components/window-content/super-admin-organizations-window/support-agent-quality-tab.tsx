"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Bot,
  Clock3,
  Loader2,
  ShieldAlert,
  Siren,
  UserRoundCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type OrganizationOption = {
  _id: string;
  name?: string | null;
  slug?: string | null;
};

type SupportQualityMetricsResponse = {
  success: boolean;
  organizationId: string;
  source: string;
  windowHours: number;
  since: number;
  totalSessions: number;
  aiResolvedSessions: number;
  humanEscalatedSessions: number;
  unresolvedSessions: number;
  resolutionRate: number;
  escalationRate: number;
  averageConversationMessages: number;
  averageConversationDurationMinutes: number;
  sentimentOutcomes: {
    positive: number;
    neutral: number;
    negative: number;
  };
  escalationOutcomes: {
    pending: number;
    taken_over: number;
    resolved: number;
    dismissed: number;
    timed_out: number;
  };
  sentimentTrend: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  }>;
  recentEscalations: Array<{
    sessionId: string;
    status: string;
    urgency: string;
    triggerType: string;
    ticketNumber: string | null;
    ticketId: string | null;
    escalatedAt: number | null;
    respondedAt: number | null;
    lastMessageAt: number;
    messageCount: number;
  }>;
};

const WINDOW_OPTIONS = [
  { label: "24h", value: 24 },
  { label: "72h", value: 72 },
  { label: "7d", value: 24 * 7 },
  { label: "30d", value: 24 * 30 },
];

function formatPercent(rate: number): string {
  return `${(Math.max(0, rate) * 100).toFixed(1)}%`;
}

function formatDateTime(value: number | null): string {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function formatEscalationStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function SupportAgentQualityTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState<number>(24 * 7);

  const organizations = useQuery(
    api.organizations.listAll,
    sessionId && isSuperAdmin ? { sessionId } : "skip"
  ) as OrganizationOption[] | undefined;

  useEffect(() => {
    if (!organizations || organizations.length === 0) {
      setSelectedOrganizationId(null);
      return;
    }
    setSelectedOrganizationId((current) => {
      if (current && organizations.some((org) => org._id === current)) {
        return current;
      }
      return organizations[0]._id;
    });
  }, [organizations]);

  const metrics = useQuery(
    api.ai.workItems.getSupportAgentQualityMetrics,
    sessionId && isSuperAdmin && selectedOrganizationId
      ? {
          sessionId,
          organizationId: selectedOrganizationId,
          hours: windowHours,
          limit: 200,
        }
      : "skip"
  ) as SupportQualityMetricsResponse | undefined;

  const selectedOrganizationName = useMemo(() => {
    if (!selectedOrganizationId || !organizations) {
      return "n/a";
    }
    const org = organizations.find((candidate) => candidate._id === selectedOrganizationId);
    if (!org) {
      return "n/a";
    }
    return org.name || org.slug || org._id;
  }, [organizations, selectedOrganizationId]);

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-3" size={36} style={{ color: "var(--error)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            Super admin access required
          </p>
        </div>
      </div>
    );
  }

  if (!organizations) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <BarChart3 size={16} />
            Support Agent Quality
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Tracks AI-resolved vs human-escalated support outcomes with sentiment and escalation trend signals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            Org
            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={selectedOrganizationId ?? ""}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
            >
              {organizations.map((organization) => (
                <option key={organization._id} value={organization._id}>
                  {organization.name || organization.slug || organization._id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            Window
            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={windowHours}
              onChange={(event) => setWindowHours(Number.parseInt(event.target.value, 10))}
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!metrics ? (
        <div className="rounded border p-4 flex items-center gap-2" style={{ borderColor: "var(--window-document-border)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
          <span className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            Loading support quality metrics...
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Total Sessions</div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {metrics.totalSessions}
              </div>
            </div>
            <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                <Bot size={12} />
                AI Resolved
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {metrics.aiResolvedSessions} ({formatPercent(metrics.resolutionRate)})
              </div>
            </div>
            <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                <UserRoundCheck size={12} />
                Human Escalated
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {metrics.humanEscalatedSessions} ({formatPercent(metrics.escalationRate)})
              </div>
            </div>
            <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                <Clock3 size={12} />
                Avg Conversation
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {metrics.averageConversationMessages} msgs
              </div>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {metrics.averageConversationDurationMinutes} min
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
                Escalation Outcomes
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  pending: <span style={{ color: "var(--window-document-text)" }}>{metrics.escalationOutcomes.pending}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  taken_over: <span style={{ color: "var(--window-document-text)" }}>{metrics.escalationOutcomes.taken_over}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  resolved: <span style={{ color: "var(--window-document-text)" }}>{metrics.escalationOutcomes.resolved}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  dismissed: <span style={{ color: "var(--window-document-text)" }}>{metrics.escalationOutcomes.dismissed}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  timed_out: <span style={{ color: "var(--window-document-text)" }}>{metrics.escalationOutcomes.timed_out}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  unresolved: <span style={{ color: "var(--window-document-text)" }}>{metrics.unresolvedSessions}</span>
                </p>
              </div>
            </div>

            <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
                Sentiment Outcomes
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  positive: <span style={{ color: "var(--window-document-text)" }}>{metrics.sentimentOutcomes.positive}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  neutral: <span style={{ color: "var(--window-document-text)" }}>{metrics.sentimentOutcomes.neutral}</span>
                </p>
                <p style={{ color: "var(--window-document-text-muted)" }}>
                  negative: <span style={{ color: "var(--window-document-text)" }}>{metrics.sentimentOutcomes.negative}</span>
                </p>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Scope: {selectedOrganizationName}
              </p>
            </div>
          </div>

          <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
              Sentiment Trend (UTC day buckets)
            </p>
            {metrics.sentimentTrend.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                No support sessions in selected window.
              </p>
            ) : (
              <div className="space-y-1">
                {metrics.sentimentTrend.map((point) => (
                  <div
                    key={point.date}
                    className="grid grid-cols-[100px_1fr] text-xs gap-3"
                    style={{ color: "var(--window-document-text-muted)" }}
                  >
                    <span>{point.date}</span>
                    <span>
                      total {point.total} | +{point.positive} / ~{point.neutral} / -{point.negative}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Siren size={14} />
              Recent Escalations
            </p>
            {metrics.recentEscalations.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                No escalations in selected window.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.recentEscalations.map((entry) => (
                  <div
                    key={`${entry.sessionId}-${entry.escalatedAt ?? entry.lastMessageAt}`}
                    className="rounded border px-2 py-2 text-xs"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span style={{ color: "var(--window-document-text)" }}>
                        {entry.ticketNumber ? entry.ticketNumber : "no-ticket-ref"}
                      </span>
                      <span style={{ color: "var(--window-document-text-muted)" }}>
                        status: {formatEscalationStatus(entry.status)}
                      </span>
                      <span style={{ color: "var(--window-document-text-muted)" }}>
                        urgency: {entry.urgency}
                      </span>
                      <span style={{ color: "var(--window-document-text-muted)" }}>
                        trigger: {entry.triggerType}
                      </span>
                    </div>
                    <div className="mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      escalated: {formatDateTime(entry.escalatedAt)} | updated: {formatDateTime(entry.lastMessageAt)} | messages: {entry.messageCount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
