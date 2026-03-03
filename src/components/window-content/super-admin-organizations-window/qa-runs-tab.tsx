"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Download, ExternalLink, FlaskConical, Loader2, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const apiAny = require("../../../../convex/_generated/api").api as {
  ai: {
    qaRuns: {
      listQaRuns: unknown;
      completeQaRun: unknown;
      exportQaRunIncidentBundle: unknown;
    };
    agentCatalogAdmin: {
      listPlatformAgents: unknown;
    };
  };
};

type QaRunStatus = "active" | "completed" | "failed";

type QaRunListItem = {
  _id: string;
  runId: string;
  modeVersion: string;
  organizationId: string;
  organizationName: string;
  ownerUserId: string;
  ownerEmail?: string;
  label?: string;
  targetAgentId?: string;
  targetTemplateRole?: string;
  status: QaRunStatus;
  startedAt: number;
  endedAt?: number;
  lastActivityAt: number;
  lastSessionId?: string;
  lastTurnId?: string;
  turnCount: number;
  successCount: number;
  blockedCount: number;
  errorCount: number;
  blockedReasonCounts: {
    tool_unavailable: number;
    missing_required_fields: number;
    missing_audit_session_context: number;
    audit_session_not_found: number;
    tool_not_observed: number;
    ambiguous_name: number;
    ambiguous_founder_contact: number;
    unknown: number;
  };
  dispatchDecisionCounts: {
    auto_dispatch_executed_pdf: number;
    auto_dispatch_executed_docx: number;
    blocked_missing_required_fields: number;
    blocked_missing_audit_session_context: number;
    blocked_audit_session_not_found: number;
    blocked_ambiguous_name: number;
    blocked_ambiguous_founder_contact: number;
    blocked_tool_unavailable: number;
    blocked_tool_not_observed: number;
    unknown: number;
  };
  deepLink?: string;
};

type QaRunListResponse = {
  runs: QaRunListItem[];
  total: number;
};

type QaCatalogAgentRow = {
  _id: string;
  name: string;
  status: string;
  protectedTemplate: boolean;
  templateRole?: string | null;
  templateLayer?: string | null;
  templatePlaybook?: string | null;
  primary?: boolean;
  operatorId?: string | null;
};

type QaCatalogAgentListResponse = {
  systemOrganizationId: string | null;
  total: number;
  agents: QaCatalogAgentRow[];
};

type QaIncidentBundle = {
  contractVersion?: string;
  exportedAt?: number;
  run?: Record<string, unknown>;
  incidents?: Array<Record<string, unknown>>;
};

const SAMANTHA_QA_TEMPLATE_ROLES = new Set([
  "one_of_one_lead_capture_consultant_template",
  "one_of_one_warm_lead_capture_consultant_template",
]);
const SAMANTHA_QA_SOURCE_SESSION_TOKEN_STORAGE_KEY =
  "super_admin_samantha_qa_source_session_token";
const SAMANTHA_QA_SOURCE_AUDIT_CHANNEL_STORAGE_KEY =
  "super_admin_samantha_qa_source_audit_channel";

function isSamanthaQaTemplateRole(value?: string): boolean {
  return Boolean(value && SAMANTHA_QA_TEMPLATE_ROLES.has(value));
}

function buildDefaultQaRunId(): string {
  return `qa_${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function formatDateTime(value?: number): string {
  if (!value || !Number.isFinite(value)) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function statusChip(status: QaRunStatus): { label: string; bg: string; text: string } {
  if (status === "completed") {
    return {
      label: "Completed",
      bg: "color-mix(in srgb, var(--success) 18%, transparent)",
      text: "var(--success)",
    };
  }
  if (status === "failed") {
    return {
      label: "Failed",
      bg: "color-mix(in srgb, var(--error) 18%, transparent)",
      text: "var(--error)",
    };
  }
  return {
    label: "Active",
    bg: "color-mix(in srgb, var(--warning) 18%, transparent)",
    text: "var(--warning)",
  };
}

export function QaRunsTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();
  const convex = useConvex() as {
    query: (queryRef: unknown, args: unknown) => Promise<unknown>;
  };
  const unsafeUseQuery = useQuery as unknown as (queryRef: unknown, args: unknown) => unknown;
  const unsafeUseMutation = useMutation as unknown as (mutationRef: unknown) => (args: unknown) => Promise<unknown>;
  const [runIdFilter, setRunIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QaRunStatus>("all");
  const [isExportingRunId, setIsExportingRunId] = useState<string | null>(null);
  const [isCompletingRunId, setIsCompletingRunId] = useState<string | null>(null);
  const [isLoadingBundleRunId, setIsLoadingBundleRunId] = useState<string | null>(null);
  const [catalogAgentRows, setCatalogAgentRows] = useState<QaCatalogAgentRow[]>([]);
  const [catalogAgentTotal, setCatalogAgentTotal] = useState(0);
  const [catalogSystemOrgId, setCatalogSystemOrgId] = useState<string | null>(null);
  const [catalogAgentError, setCatalogAgentError] = useState<string | null>(null);
  const [expandedBundleRunIds, setExpandedBundleRunIds] = useState<Record<string, boolean>>({});
  const [bundleByRunId, setBundleByRunId] = useState<Record<string, QaIncidentBundle>>({});
  const [bundleErrorByRunId, setBundleErrorByRunId] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextRunId = (
      searchParams?.get("qaRunId")
      || searchParams?.get("runId")
      || ""
    ).trim();
    if (nextRunId.length > 0) {
      setRunIdFilter(nextRunId);
    }
  }, [searchParams]);

  const listResponse = unsafeUseQuery(
    apiAny.ai.qaRuns.listQaRuns,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          runId: runIdFilter.trim() || undefined,
          status: statusFilter,
          limit: 75,
        }
      : "skip",
  ) as QaRunListResponse | undefined;
  const completeQaRun = unsafeUseMutation(apiAny.ai.qaRuns.completeQaRun) as (args: {
    sessionId: string;
    runId: string;
    organizationId: string;
    status: "completed" | "failed";
  }) => Promise<unknown>;
  const runs = listResponse?.runs || [];
  const catalogAgents = catalogAgentRows;

  const summary = useMemo(() => {
    const active = runs.filter((run) => run.status === "active").length;
    const failed = runs.filter((run) => run.status === "failed").length;
    const completed = runs.filter((run) => run.status === "completed").length;
    return { active, failed, completed, total: runs.length };
  }, [runs]);

  useEffect(() => {
    let cancelled = false;

    if (!sessionId || !isSuperAdmin) {
      setCatalogAgentRows([]);
      setCatalogAgentTotal(0);
      setCatalogSystemOrgId(null);
      setCatalogAgentError(null);
      return;
    }

    void convex
      .query(apiAny.ai.agentCatalogAdmin.listPlatformAgents, {
        sessionId,
        limit: 2000,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }
        const parsed = (response || {}) as QaCatalogAgentListResponse;
        setCatalogAgentRows(Array.isArray(parsed.agents) ? parsed.agents : []);
        setCatalogAgentTotal(typeof parsed.total === "number" ? parsed.total : 0);
        setCatalogSystemOrgId(typeof parsed.systemOrganizationId === "string" ? parsed.systemOrganizationId : null);
        setCatalogAgentError(null);
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }
        setCatalogAgentRows([]);
        setCatalogAgentTotal(0);
        setCatalogSystemOrgId(null);
        setCatalogAgentError(caught instanceof Error ? caught.message : "Failed to load agents.");
      });

    return () => {
      cancelled = true;
    };
  }, [convex, isSuperAdmin, sessionId]);

  const openQaChat = (args?: { templateRole?: string; label?: string }) => {
    const params = new URLSearchParams();
    params.set("qa", "1");
    const runId = runIdFilter.trim() || buildDefaultQaRunId();
    params.set("qaRunId", runId);
    if (args?.templateRole) {
      params.set("qaTemplateRole", args.templateRole);
    }
    if (args?.label) {
      params.set("qaLabel", args.label);
    }
    if (isSamanthaQaTemplateRole(args?.templateRole)) {
      const sourceSessionToken =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(SAMANTHA_QA_SOURCE_SESSION_TOKEN_STORAGE_KEY) || "").trim()
          : "";
      const sourceAuditChannel =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(SAMANTHA_QA_SOURCE_AUDIT_CHANNEL_STORAGE_KEY) || "").trim().toLowerCase()
          : "";
      params.set("qaIngressChannel", "desktop");
      params.set("qaOriginSurface", "super_admin_qa_chat");
      params.set(
        "qaSourceAuditChannel",
        sourceAuditChannel === "native_guest" ? "native_guest" : "webchat",
      );
      if (sourceSessionToken.length > 0) {
        params.set("qaSourceSessionToken", sourceSessionToken);
      }
    }
    const url = `/chat?${params.toString()}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

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

  const handleCompleteRun = async (run: QaRunListItem, status: "completed" | "failed") => {
    if (!sessionId) return;
    setNotice(null);
    setError(null);
    setIsCompletingRunId(run.runId);
    try {
      await completeQaRun({
        sessionId,
        runId: run.runId,
        organizationId: run.organizationId,
        status,
      });
      setNotice(`Run ${run.runId} marked ${status}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update run status.");
    } finally {
      setIsCompletingRunId(null);
    }
  };

  const handleExportBundle = async (run: QaRunListItem) => {
    if (!sessionId) return;
    setNotice(null);
    setError(null);
    setIsExportingRunId(run.runId);
    try {
      const bundle = bundleByRunId[run.runId]
        || await convex.query(apiAny.ai.qaRuns.exportQaRunIncidentBundle, {
          sessionId,
          runId: run.runId,
          organizationId: run.organizationId,
        });
      setBundleByRunId((current) => ({ ...current, [run.runId]: bundle as QaIncidentBundle }));
      const payload = JSON.stringify(bundle, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${run.runId}-incident-bundle.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setNotice(`Exported incident bundle for ${run.runId}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to export incident bundle.");
    } finally {
      setIsExportingRunId(null);
    }
  };

  const toggleIncidentBundle = async (run: QaRunListItem) => {
    const nextExpanded = !expandedBundleRunIds[run.runId];
    setExpandedBundleRunIds((current) => ({ ...current, [run.runId]: nextExpanded }));
    if (!nextExpanded || bundleByRunId[run.runId] || !sessionId) {
      return;
    }
    setIsLoadingBundleRunId(run.runId);
    try {
      const bundle = await convex.query(apiAny.ai.qaRuns.exportQaRunIncidentBundle, {
        sessionId,
        runId: run.runId,
        organizationId: run.organizationId,
      });
      setBundleByRunId((current) => ({ ...current, [run.runId]: bundle as QaIncidentBundle }));
      setBundleErrorByRunId((current) => {
        if (!current[run.runId]) {
          return current;
        }
        const next = { ...current };
        delete next[run.runId];
        return next;
      });
    } catch (caught) {
      setBundleErrorByRunId((current) => ({
        ...current,
        [run.runId]: caught instanceof Error ? caught.message : "Failed to load incident bundle.",
      }));
    } finally {
      setIsLoadingBundleRunId((current) => (current === run.runId ? null : current));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <FlaskConical size={16} />
          Super Admin Agent QA Runs
        </h3>
        <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          Filter by run ID, inspect failure taxonomy counts, jump into agent control threads, and export incident bundles.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Total</div>
          <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>{summary.total}</div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Active</div>
          <div className="text-sm font-semibold" style={{ color: "var(--warning)" }}>{summary.active}</div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Failed</div>
          <div className="text-sm font-semibold" style={{ color: "var(--error)" }}>{summary.failed}</div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Completed</div>
          <div className="text-sm font-semibold" style={{ color: "var(--success)" }}>{summary.completed}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          Run ID
          <input
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={runIdFilter}
            onChange={(event) => setRunIdFilter(event.target.value)}
            placeholder="qa_..."
          />
        </label>
        <label className="text-xs flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          Status
          <select
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | QaRunStatus)}
          >
            <option value="all">all</option>
            <option value="active">active</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => openQaChat()}
          className="px-2 py-1 border rounded text-xs font-semibold"
          style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
        >
          Open QA Chat
        </button>
        <button
          type="button"
          onClick={() => openQaChat({ templateRole: "one_of_one_warm_lead_capture_consultant_template", label: "samantha_warm_qa" })}
          className="px-2 py-1 border rounded text-xs font-semibold"
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          Open Samantha QA
        </button>
      </div>

      <div className="rounded border p-3 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            Launch QA by Agent
          </p>
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {catalogAgents.length}/{catalogAgentTotal} shown
          </p>
        </div>
        <div className="max-h-56 overflow-auto border rounded" style={{ borderColor: "var(--window-document-border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--window-document-bg-elevated)", color: "var(--window-document-text)" }}>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Agent</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Template role</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Status</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {catalogAgents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    No agents available.
                  </td>
                </tr>
              ) : (
                catalogAgents.map((agent) => (
                  <tr key={agent._id} style={{ color: "var(--window-document-text)" }}>
                    <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                      <div>{agent.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {agent.templateLayer || "n/a"} · {agent.templatePlaybook || "n/a"}
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                      {agent.templateRole || "n/a"}
                    </td>
                    <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                      {agent.status}
                    </td>
                    <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                      <button
                        type="button"
                        onClick={() =>
                          openQaChat({
                            templateRole: agent.templateRole || undefined,
                            label: `platform_${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`,
                          })
                        }
                        className="px-2 py-1 border rounded text-[11px] font-semibold"
                        style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
                      >
                        Open QA
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {catalogSystemOrgId ? (
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Source: system organization {catalogSystemOrgId}
          </p>
        ) : null}
        {catalogAgentError ? (
          <p className="text-[11px]" style={{ color: "var(--error)" }}>
            {catalogAgentError}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--error)", color: "var(--error)" }}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--success)", color: "var(--success)" }}>
          {notice}
        </div>
      ) : null}

      {!listResponse ? (
        <div className="rounded border p-4 flex items-center gap-2" style={{ borderColor: "var(--window-document-border)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
          <span className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            Loading QA runs...
          </span>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded border p-4 text-xs" style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text-muted)" }}>
          No QA runs matched your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const chip = statusChip(run.status);
            const isExporting = isExportingRunId === run.runId;
            const isCompleting = isCompletingRunId === run.runId;
            const isLoadingBundle = isLoadingBundleRunId === run.runId;
            const isBundleExpanded = expandedBundleRunIds[run.runId] === true;
            const bundle = bundleByRunId[run.runId];
            const bundleError = bundleErrorByRunId[run.runId];
            return (
              <div key={run._id} className="rounded border p-3 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {run.runId}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      Org: {run.organizationName} · Owner: {run.ownerEmail || run.ownerUserId}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      Target agent: {run.targetAgentId || "default"} · template: {run.targetTemplateRole || "default"}
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-[11px] font-semibold"
                    style={{ background: chip.bg, color: chip.text }}
                  >
                    {chip.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                  <div>Turns: <span className="font-semibold">{run.turnCount}</span></div>
                  <div>Success: <span className="font-semibold">{run.successCount}</span></div>
                  <div>Blocked: <span className="font-semibold">{run.blockedCount}</span></div>
                  <div>Error: <span className="font-semibold">{run.errorCount}</span></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  <div>tool_unavailable: {run.blockedReasonCounts.tool_unavailable}</div>
                  <div>missing_required_fields: {run.blockedReasonCounts.missing_required_fields}</div>
                  <div>missing_audit_session_context: {run.blockedReasonCounts.missing_audit_session_context}</div>
                  <div>audit_session_not_found: {run.blockedReasonCounts.audit_session_not_found}</div>
                  <div>tool_not_observed: {run.blockedReasonCounts.tool_not_observed}</div>
                  <div>ambiguous_name: {run.blockedReasonCounts.ambiguous_name}</div>
                  <div>ambiguous_founder_contact: {run.blockedReasonCounts.ambiguous_founder_contact}</div>
                  <div>unknown: {run.blockedReasonCounts.unknown}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  <div>auto_dispatch_executed_pdf: {run.dispatchDecisionCounts.auto_dispatch_executed_pdf}</div>
                  <div>auto_dispatch_executed_docx: {run.dispatchDecisionCounts.auto_dispatch_executed_docx}</div>
                  <div>blocked_missing_required_fields: {run.dispatchDecisionCounts.blocked_missing_required_fields}</div>
                  <div>blocked_missing_audit_session_context: {run.dispatchDecisionCounts.blocked_missing_audit_session_context}</div>
                  <div>blocked_audit_session_not_found: {run.dispatchDecisionCounts.blocked_audit_session_not_found}</div>
                  <div>blocked_ambiguous_name: {run.dispatchDecisionCounts.blocked_ambiguous_name}</div>
                  <div>blocked_ambiguous_founder_contact: {run.dispatchDecisionCounts.blocked_ambiguous_founder_contact}</div>
                  <div>blocked_tool_unavailable: {run.dispatchDecisionCounts.blocked_tool_unavailable}</div>
                  <div>blocked_tool_not_observed: {run.dispatchDecisionCounts.blocked_tool_not_observed}</div>
                  <div>dispatch_unknown: {run.dispatchDecisionCounts.unknown}</div>
                </div>

                <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Started: {formatDateTime(run.startedAt)} · Last: {formatDateTime(run.lastActivityAt)} · Ended: {formatDateTime(run.endedAt)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {run.deepLink ? (
                    <a
                      href={run.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs"
                      style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
                    >
                      <ExternalLink size={12} />
                      Jump to session/turn
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleExportBundle(run)}
                    className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs"
                    style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
                    disabled={isExporting}
                  >
                    {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Export incident bundle
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleIncidentBundle(run)}
                    className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs"
                    style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
                    disabled={isLoadingBundle}
                  >
                    {isLoadingBundle ? <Loader2 size={12} className="animate-spin" /> : null}
                    {isBundleExpanded ? "Hide incident bundle" : "View incident bundle"}
                  </button>
                  {run.status === "active" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleCompleteRun(run, "completed")}
                        className="px-2 py-1 border rounded text-xs"
                        style={{ borderColor: "var(--success)", color: "var(--success)" }}
                        disabled={isCompleting}
                      >
                        Mark completed
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCompleteRun(run, "failed")}
                        className="px-2 py-1 border rounded text-xs"
                        style={{ borderColor: "var(--error)", color: "var(--error)" }}
                        disabled={isCompleting}
                      >
                        Mark failed
                      </button>
                    </>
                  ) : null}
                </div>

                {isBundleExpanded ? (
                  <div className="rounded border p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                    {bundleError ? (
                      <p className="text-xs" style={{ color: "var(--error)" }}>
                        {bundleError}
                      </p>
                    ) : null}
                    {!bundle && !bundleError ? (
                      <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Loading incident bundle...
                      </p>
                    ) : null}
                    {bundle ? (
                      <pre
                        className="text-[11px] leading-4 whitespace-pre-wrap break-words max-h-80 overflow-auto p-2 rounded"
                        style={{
                          color: "var(--window-document-text)",
                          background: "var(--window-document-bg-elevated)",
                        }}
                      >
                        {JSON.stringify(bundle, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
