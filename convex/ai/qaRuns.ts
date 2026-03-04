import { internalMutation, mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import { SUPER_ADMIN_AGENT_QA_MODE_VERSION } from "./qaModeContracts";

const QA_RUN_STATUS_VALUES = ["active", "completed", "failed"] as const;
type QaRunStatus = (typeof QA_RUN_STATUS_VALUES)[number];

const qaRunStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("failed"),
);

const qaOutcomeValidator = v.union(
  v.literal("success"),
  v.literal("blocked"),
  v.literal("error"),
  v.literal("rate_limited"),
  v.literal("credits_exhausted"),
);

const qaDiagnosticsValidator = v.object({
  reasonCode: v.optional(v.string()),
  preflightReasonCode: v.optional(v.string()),
  requiredTools: v.array(v.string()),
  availableTools: v.array(v.string()),
  observedTools: v.array(v.string()),
  missingRequiredFields: v.array(v.string()),
  enforcementMode: v.optional(v.string()),
  rewriteApplied: v.optional(v.boolean()),
  templateRole: v.optional(v.string()),
  dispatchDecision: v.optional(v.string()),
  blockedReason: v.optional(v.string()),
  blockedDetail: v.optional(v.string()),
});

const MAX_RECENT_INCIDENTS = 50;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
const DEFAULT_RETENTION_BATCH_LIMIT = 200;
const MAX_RETENTION_BATCH_LIMIT = 500;
const TERMINAL_QA_RUN_RETENTION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const ACTIVE_QA_RUN_IDLE_RETENTION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const QA_RUN_MAX_ROWS = 5000;
const QA_RUN_TRIM_TARGET = 4500;

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      result[key] = Math.floor(raw);
    }
  }
  return result;
}

function incrementCountMap(
  value: Record<string, number> | undefined,
  key: string | undefined,
): Record<string, number> {
  if (!key) {
    return value || {};
  }
  const normalizedKey = normalizeNonEmptyString(key)?.slice(0, 120);
  if (!normalizedKey) {
    return value || {};
  }
  const next = {
    ...(value || {}),
  };
  next[normalizedKey] = (next[normalizedKey] || 0) + 1;
  return next;
}

type BlockedReasonKey =
  | "tool_unavailable"
  | "missing_required_fields"
  | "missing_audit_session_context"
  | "audit_session_not_found"
  | "tool_not_observed"
  | "ambiguous_name"
  | "ambiguous_founder_contact"
  | "unknown";

function resolveBlockedReasonKey(value: unknown): BlockedReasonKey {
  if (value === "tool_unavailable") {
    return "tool_unavailable";
  }
  if (value === "missing_required_fields") {
    return "missing_required_fields";
  }
  if (value === "missing_audit_session_context") {
    return "missing_audit_session_context";
  }
  if (value === "audit_session_not_found") {
    return "audit_session_not_found";
  }
  if (value === "tool_not_observed") {
    return "tool_not_observed";
  }
  if (value === "ambiguous_name") {
    return "ambiguous_name";
  }
  if (value === "ambiguous_founder_contact") {
    return "ambiguous_founder_contact";
  }
  return "unknown";
}

type DispatchDecisionKey =
  | "auto_dispatch_executed_pdf"
  | "auto_dispatch_executed_docx"
  | "recovery_attempted_missing_required_fields"
  | "blocked_missing_required_fields"
  | "blocked_missing_audit_session_context"
  | "blocked_audit_session_not_found"
  | "blocked_ambiguous_name"
  | "blocked_ambiguous_founder_contact"
  | "blocked_tool_unavailable"
  | "blocked_tool_not_observed"
  | "unknown";

function resolveDispatchDecisionKey(value: unknown): DispatchDecisionKey {
  if (value === "auto_dispatch_executed_pdf") {
    return "auto_dispatch_executed_pdf";
  }
  if (value === "auto_dispatch_executed_docx") {
    return "auto_dispatch_executed_docx";
  }
  if (value === "recovery_attempted_missing_required_fields") {
    return "recovery_attempted_missing_required_fields";
  }
  if (value === "blocked_missing_required_fields") {
    return "blocked_missing_required_fields";
  }
  if (value === "blocked_missing_audit_session_context") {
    return "blocked_missing_audit_session_context";
  }
  if (value === "blocked_audit_session_not_found") {
    return "blocked_audit_session_not_found";
  }
  if (value === "blocked_ambiguous_name") {
    return "blocked_ambiguous_name";
  }
  if (value === "blocked_ambiguous_founder_contact") {
    return "blocked_ambiguous_founder_contact";
  }
  if (value === "blocked_tool_unavailable") {
    return "blocked_tool_unavailable";
  }
  if (value === "blocked_tool_not_observed") {
    return "blocked_tool_not_observed";
  }
  return "unknown";
}

function computeDeepLink(args: {
  sessionId?: string;
  turnId?: string;
  runId: string;
}): string | undefined {
  const sessionId = normalizeNonEmptyString(args.sessionId);
  if (!sessionId) {
    return undefined;
  }
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.APP_URL
    || "https://app.l4yercak3.com"
  ).replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("app", "organizations");
  params.set("panel", "agent-control-center");
  params.set("entity", sessionId);
  params.set("context", "super-admin-agent-qa");
  params.set("qaRunId", args.runId);
  const turnId = normalizeNonEmptyString(args.turnId);
  if (turnId) {
    params.set("turnId", turnId);
  }
  return `${baseUrl}/?${params.toString()}`;
}

async function requireSuperAdminSession(ctx: Parameters<typeof requireAuthenticatedUser>[0], sessionId: string) {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const context = await getUserContext(ctx, userId);
  if (!context.isGlobal || context.roleName !== "super_admin") {
    throw new Error("Not authorized: super admin access required.");
  }
  return {
    userId,
  };
}

function clampListLimit(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : DEFAULT_LIST_LIMIT;
  return Math.max(10, Math.min(MAX_LIST_LIMIT, numeric));
}

function clampRetentionBatchLimit(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : DEFAULT_RETENTION_BATCH_LIMIT;
  return Math.max(50, Math.min(MAX_RETENTION_BATCH_LIMIT, numeric));
}

export function resolveQaRunRetentionPolicyDecision(args: {
  now: number;
  status: QaRunStatus;
  startedAt: number;
  lastActivityAt: number;
  endedAt?: number;
}): "delete_terminal_expired" | "delete_active_idle" | "retain" {
  const now = Number.isFinite(args.now) ? args.now : Date.now();
  const terminalReferenceTs = args.endedAt || args.lastActivityAt || args.startedAt;
  const terminalAgeMs = now - terminalReferenceTs;
  const activeIdleAgeMs = now - args.lastActivityAt;

  if (args.status === "completed" || args.status === "failed") {
    return terminalAgeMs > TERMINAL_QA_RUN_RETENTION_MS
      ? "delete_terminal_expired"
      : "retain";
  }

  return activeIdleAgeMs > ACTIVE_QA_RUN_IDLE_RETENTION_MS
    ? "delete_active_idle"
    : "retain";
}

function buildIncidentRecord(args: {
  occurredAt: number;
  sessionId?: string;
  turnId?: string;
  agentId?: string;
  status: string;
  diagnostics?: {
    reasonCode?: string;
    preflightReasonCode?: string;
    dispatchDecision?: string;
    blockedReason?: string;
    blockedDetail?: string;
    requiredTools?: string[];
    availableTools?: string[];
    missingRequiredFields?: string[];
    enforcementMode?: string;
  };
  runtimeError?: string;
}) {
  return {
    occurredAt: args.occurredAt,
    sessionId: normalizeNonEmptyString(args.sessionId),
    turnId: normalizeNonEmptyString(args.turnId),
    agentId: normalizeNonEmptyString(args.agentId),
    status: args.status,
    reasonCode: normalizeNonEmptyString(args.diagnostics?.reasonCode),
    preflightReasonCode: normalizeNonEmptyString(args.diagnostics?.preflightReasonCode),
    dispatchDecision: normalizeNonEmptyString(args.diagnostics?.dispatchDecision),
    blockedReason: normalizeNonEmptyString(args.diagnostics?.blockedReason),
    blockedDetail:
      normalizeNonEmptyString(args.diagnostics?.blockedDetail)
      || normalizeNonEmptyString(args.runtimeError),
    requiredTools: normalizeStringArray(args.diagnostics?.requiredTools),
    availableTools: normalizeStringArray(args.diagnostics?.availableTools),
    missingRequiredFields: normalizeStringArray(args.diagnostics?.missingRequiredFields),
    actionDecision: normalizeNonEmptyString(args.diagnostics?.enforcementMode),
  };
}

export const upsertQaRunTurnInternal = internalMutation({
  args: {
    eventType: v.union(v.literal("start"), v.literal("turn")),
    runId: v.string(),
    organizationId: v.id("organizations"),
    ownerUserId: v.id("users"),
    ownerEmail: v.optional(v.string()),
    modeVersion: v.optional(v.string()),
    label: v.optional(v.string()),
    targetAgentId: v.optional(v.string()),
    targetTemplateRole: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    turnId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    occurredAt: v.number(),
    outcome: v.optional(qaOutcomeValidator),
    qaDiagnostics: v.optional(qaDiagnosticsValidator),
    runtimeError: v.optional(v.string()),
    finalizeStatus: v.optional(qaRunStatusValidator),
  },
  handler: async (ctx, args) => {
    const runId = normalizeNonEmptyString(args.runId);
    if (!runId) {
      return { ok: false, reason: "run_id_missing" as const };
    }

    const existing = await ctx.db
      .query("qaRuns")
      .withIndex("by_org_run_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("runId", runId),
      )
      .first();

    const now = args.occurredAt;
    const sessionId = normalizeNonEmptyString(args.sessionId);
    const turnId = normalizeNonEmptyString(args.turnId);
    const agentId = normalizeNonEmptyString(args.agentId);
    const modeVersion =
      normalizeNonEmptyString(args.modeVersion)
      || SUPER_ADMIN_AGENT_QA_MODE_VERSION;

    if (!existing) {
      const initialIncident = args.eventType === "turn"
        ? [
            buildIncidentRecord({
              occurredAt: now,
              sessionId,
              turnId,
              agentId,
              status: args.outcome || "error",
              diagnostics: args.qaDiagnostics,
              runtimeError: args.runtimeError,
            }),
          ]
        : [];
      const blockedReasonKey = resolveBlockedReasonKey(args.qaDiagnostics?.blockedReason);
      const blockedReasonCounts = {
        tool_unavailable: 0,
        missing_required_fields: 0,
        missing_audit_session_context: 0,
        audit_session_not_found: 0,
        tool_not_observed: 0,
        ambiguous_name: 0,
        ambiguous_founder_contact: 0,
        unknown: 0,
      };
      const dispatchDecisionCounts: Record<DispatchDecisionKey, number> = {
        auto_dispatch_executed_pdf: 0,
        auto_dispatch_executed_docx: 0,
        recovery_attempted_missing_required_fields: 0,
        blocked_missing_required_fields: 0,
        blocked_missing_audit_session_context: 0,
        blocked_audit_session_not_found: 0,
        blocked_ambiguous_name: 0,
        blocked_ambiguous_founder_contact: 0,
        blocked_tool_unavailable: 0,
        blocked_tool_not_observed: 0,
        unknown: 0,
      };
      if (args.eventType === "turn" && (args.outcome || "error") === "blocked") {
        blockedReasonCounts[blockedReasonKey] += 1;
      }
      if (args.eventType === "turn") {
        const dispatchDecisionKey = resolveDispatchDecisionKey(args.qaDiagnostics?.dispatchDecision);
        dispatchDecisionCounts[dispatchDecisionKey] += 1;
      }

      const initialOutcome = args.eventType === "turn" ? (args.outcome || "error") : undefined;
      const initialStatus: QaRunStatus =
        args.finalizeStatus
        || (initialOutcome === "error" || initialOutcome === "rate_limited" || initialOutcome === "credits_exhausted"
          ? "failed"
          : "active");

      const reasonCodeCounts = incrementCountMap(
        {},
        normalizeNonEmptyString(args.qaDiagnostics?.reasonCode),
      );
      const preflightReasonCodeCounts = incrementCountMap(
        {},
        normalizeNonEmptyString(args.qaDiagnostics?.preflightReasonCode),
      );

      const docId = await ctx.db.insert("qaRuns", {
        runId,
        modeVersion,
        organizationId: args.organizationId,
        ownerUserId: args.ownerUserId,
        ownerEmail: normalizeNonEmptyString(args.ownerEmail),
        label: normalizeNonEmptyString(args.label),
        targetAgentId: normalizeNonEmptyString(args.targetAgentId),
        targetTemplateRole: normalizeNonEmptyString(args.targetTemplateRole),
        status: initialStatus,
        startedAt: now,
        endedAt: initialStatus === "completed" || initialStatus === "failed" ? now : undefined,
        lastActivityAt: now,
        lastSessionId: sessionId,
        lastTurnId: turnId,
        turnCount: args.eventType === "turn" ? 1 : 0,
        successCount: initialOutcome === "success" ? 1 : 0,
        blockedCount: initialOutcome === "blocked" ? 1 : 0,
        errorCount:
          initialOutcome === "error"
          || initialOutcome === "rate_limited"
          || initialOutcome === "credits_exhausted"
            ? 1
            : 0,
        blockedReasonCounts,
        dispatchDecisionCounts,
        reasonCodeCounts,
        preflightReasonCodeCounts,
        recentIncidents: initialIncident,
        createdAt: now,
        updatedAt: now,
      });

      return {
        ok: true,
        created: true,
        id: docId,
      };
    }

    const nextReasonCodeCounts = incrementCountMap(
      normalizeCountMap(existing.reasonCodeCounts),
      normalizeNonEmptyString(args.qaDiagnostics?.reasonCode),
    );
    const nextPreflightReasonCodeCounts = incrementCountMap(
      normalizeCountMap(existing.preflightReasonCodeCounts),
      normalizeNonEmptyString(args.qaDiagnostics?.preflightReasonCode),
    );

    const nextBlockedReasonCounts = {
      tool_unavailable: existing.blockedReasonCounts?.tool_unavailable ?? 0,
      missing_required_fields: existing.blockedReasonCounts?.missing_required_fields ?? 0,
      missing_audit_session_context:
        existing.blockedReasonCounts?.missing_audit_session_context ?? 0,
      audit_session_not_found: existing.blockedReasonCounts?.audit_session_not_found ?? 0,
      tool_not_observed: existing.blockedReasonCounts?.tool_not_observed ?? 0,
      ambiguous_name: existing.blockedReasonCounts?.ambiguous_name ?? 0,
      ambiguous_founder_contact: existing.blockedReasonCounts?.ambiguous_founder_contact ?? 0,
      unknown: existing.blockedReasonCounts?.unknown ?? 0,
    };
    const nextDispatchDecisionCounts: Record<DispatchDecisionKey, number> = {
      auto_dispatch_executed_pdf: existing.dispatchDecisionCounts?.auto_dispatch_executed_pdf ?? 0,
      auto_dispatch_executed_docx: existing.dispatchDecisionCounts?.auto_dispatch_executed_docx ?? 0,
      recovery_attempted_missing_required_fields:
        existing.dispatchDecisionCounts?.recovery_attempted_missing_required_fields ?? 0,
      blocked_missing_required_fields: existing.dispatchDecisionCounts?.blocked_missing_required_fields ?? 0,
      blocked_missing_audit_session_context:
        existing.dispatchDecisionCounts?.blocked_missing_audit_session_context ?? 0,
      blocked_audit_session_not_found:
        existing.dispatchDecisionCounts?.blocked_audit_session_not_found ?? 0,
      blocked_ambiguous_name: existing.dispatchDecisionCounts?.blocked_ambiguous_name ?? 0,
      blocked_ambiguous_founder_contact: existing.dispatchDecisionCounts?.blocked_ambiguous_founder_contact ?? 0,
      blocked_tool_unavailable: existing.dispatchDecisionCounts?.blocked_tool_unavailable ?? 0,
      blocked_tool_not_observed: existing.dispatchDecisionCounts?.blocked_tool_not_observed ?? 0,
      unknown: existing.dispatchDecisionCounts?.unknown ?? 0,
    };

    const normalizedOutcome = args.outcome || "error";
    if (args.eventType === "turn" && normalizedOutcome === "blocked") {
      const key = resolveBlockedReasonKey(args.qaDiagnostics?.blockedReason);
      nextBlockedReasonCounts[key] += 1;
    }
    if (args.eventType === "turn") {
      const dispatchDecisionKey = resolveDispatchDecisionKey(args.qaDiagnostics?.dispatchDecision);
      nextDispatchDecisionCounts[dispatchDecisionKey] += 1;
    }

    const shouldCountTurn = args.eventType === "turn";
    const updatedIncidents = shouldCountTurn
      ? [
          buildIncidentRecord({
            occurredAt: now,
            sessionId,
            turnId,
            agentId,
            status: normalizedOutcome,
            diagnostics: args.qaDiagnostics,
            runtimeError: args.runtimeError,
          }),
          ...existing.recentIncidents,
        ].slice(0, MAX_RECENT_INCIDENTS)
      : existing.recentIncidents;

    const autoFailed = normalizedOutcome === "error"
      || normalizedOutcome === "rate_limited"
      || normalizedOutcome === "credits_exhausted";
    const nextStatus: QaRunStatus =
      args.finalizeStatus
      || (autoFailed ? "failed" : existing.status);

    await ctx.db.patch(existing._id, {
      modeVersion,
      ownerEmail: normalizeNonEmptyString(args.ownerEmail) || existing.ownerEmail,
      label: normalizeNonEmptyString(args.label) || existing.label,
      targetAgentId: normalizeNonEmptyString(args.targetAgentId) || existing.targetAgentId,
      targetTemplateRole:
        normalizeNonEmptyString(args.targetTemplateRole)
        || existing.targetTemplateRole,
      status: nextStatus,
      endedAt:
        nextStatus === "completed" || nextStatus === "failed"
          ? now
          : undefined,
      lastActivityAt: now,
      lastSessionId: sessionId || existing.lastSessionId,
      lastTurnId: turnId || existing.lastTurnId,
      turnCount: existing.turnCount + (shouldCountTurn ? 1 : 0),
      successCount: existing.successCount + (normalizedOutcome === "success" && shouldCountTurn ? 1 : 0),
      blockedCount: existing.blockedCount + (normalizedOutcome === "blocked" && shouldCountTurn ? 1 : 0),
      errorCount:
        existing.errorCount
        + (
          shouldCountTurn
          && (
            normalizedOutcome === "error"
            || normalizedOutcome === "rate_limited"
            || normalizedOutcome === "credits_exhausted"
          )
            ? 1
            : 0
        ),
      blockedReasonCounts: nextBlockedReasonCounts,
      dispatchDecisionCounts: nextDispatchDecisionCounts,
      reasonCodeCounts: nextReasonCodeCounts,
      preflightReasonCodeCounts: nextPreflightReasonCodeCounts,
      recentIncidents: updatedIncidents,
      updatedAt: now,
    });

    return {
      ok: true,
      created: false,
      id: existing._id,
    };
  },
});

export const cleanupQaRunsInternal = internalMutation({
  args: {
    now: v.optional(v.number()),
    batchLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const batchLimit = clampRetentionBatchLimit(args.batchLimit);
    const candidates = await ctx.db
      .query("qaRuns")
      .withIndex("by_last_activity")
      .order("asc")
      .take(Math.max(batchLimit, QA_RUN_MAX_ROWS + 100));

    let deletedTerminalExpired = 0;
    let deletedActiveIdle = 0;
    let deletedByRowCap = 0;
    let scanned = 0;

    const protectedActiveIds = new Set<string>();
    const actions: Array<{ id: Id<"qaRuns">; reason: "delete_terminal_expired" | "delete_active_idle" | "delete_row_cap" }> = [];

    for (const row of candidates) {
      scanned += 1;
      const decision = resolveQaRunRetentionPolicyDecision({
        now,
        status: row.status,
        startedAt: row.startedAt,
        lastActivityAt: row.lastActivityAt,
        endedAt: row.endedAt,
      });

      if (decision === "retain") {
        if (row.status === "active") {
          protectedActiveIds.add(String(row._id));
        }
        continue;
      }

      actions.push({
        id: row._id,
        reason: decision,
      });
      if (actions.length >= batchLimit) {
        break;
      }
    }

    if (actions.length < batchLimit && candidates.length > QA_RUN_MAX_ROWS) {
      for (const row of candidates) {
        if (actions.length >= batchLimit) {
          break;
        }
        if (candidates.length - deletedByRowCap <= QA_RUN_TRIM_TARGET) {
          break;
        }
        if (protectedActiveIds.has(String(row._id))) {
          continue;
        }
        if (actions.some((action) => String(action.id) === String(row._id))) {
          continue;
        }
        actions.push({
          id: row._id,
          reason: "delete_row_cap",
        });
        deletedByRowCap += 1;
      }
    }

    for (const action of actions) {
      await ctx.db.delete(action.id);
      if (action.reason === "delete_terminal_expired") {
        deletedTerminalExpired += 1;
      } else if (action.reason === "delete_active_idle") {
        deletedActiveIdle += 1;
      }
    }

    return {
      ok: true,
      now,
      scanned,
      deletedTotal: actions.length,
      deletedTerminalExpired,
      deletedActiveIdle,
      deletedByRowCap,
      limits: {
        batchLimit,
        terminalRetentionMs: TERMINAL_QA_RUN_RETENTION_MS,
        activeIdleRetentionMs: ACTIVE_QA_RUN_IDLE_RETENTION_MS,
        maxRows: QA_RUN_MAX_ROWS,
        trimTarget: QA_RUN_TRIM_TARGET,
      },
    };
  },
});

export const listQaRuns = query({
  args: {
    sessionId: v.string(),
    runId: v.optional(v.string()),
    status: v.optional(v.union(v.literal("all"), qaRunStatusValidator)),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const limit = clampListLimit(args.limit);
    const statusFilter = args.status || "all";
    const runIdFilter = normalizeNonEmptyString(args.runId)?.toLowerCase();

    let rows = await ctx.db
      .query("qaRuns")
      .withIndex("by_last_activity")
      .order("desc")
      .take(limit * 4);

    if (statusFilter !== "all") {
      rows = rows.filter((row) => row.status === statusFilter);
    }
    if (runIdFilter) {
      rows = rows.filter((row) => row.runId.toLowerCase().includes(runIdFilter));
    }

    const page = rows.slice(0, limit);

    const orgNameById = new Map<string, string>();
    await Promise.all(
      page.map(async (row) => {
        const key = String(row.organizationId);
        if (orgNameById.has(key)) {
          return;
        }
        const org = await ctx.db.get(row.organizationId);
        orgNameById.set(key, org?.name || org?.slug || key);
      }),
    );

    const runs = page.map((row) => {
      const lastIncident = row.recentIncidents[0];
      return {
        _id: row._id,
        runId: row.runId,
        modeVersion: row.modeVersion,
        organizationId: row.organizationId,
        organizationName: orgNameById.get(String(row.organizationId)) || String(row.organizationId),
        ownerUserId: row.ownerUserId,
        ownerEmail: row.ownerEmail,
        label: row.label,
        targetAgentId: row.targetAgentId,
        targetTemplateRole: row.targetTemplateRole,
        status: row.status,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        lastActivityAt: row.lastActivityAt,
        lastSessionId: row.lastSessionId,
        lastTurnId: row.lastTurnId,
        turnCount: row.turnCount,
        successCount: row.successCount,
        blockedCount: row.blockedCount,
        errorCount: row.errorCount,
        blockedReasonCounts: {
          tool_unavailable: row.blockedReasonCounts?.tool_unavailable ?? 0,
          missing_required_fields: row.blockedReasonCounts?.missing_required_fields ?? 0,
          missing_audit_session_context:
            row.blockedReasonCounts?.missing_audit_session_context ?? 0,
          audit_session_not_found: row.blockedReasonCounts?.audit_session_not_found ?? 0,
          tool_not_observed: row.blockedReasonCounts?.tool_not_observed ?? 0,
          ambiguous_name: row.blockedReasonCounts?.ambiguous_name ?? 0,
          ambiguous_founder_contact: row.blockedReasonCounts?.ambiguous_founder_contact ?? 0,
          unknown: row.blockedReasonCounts?.unknown ?? 0,
        },
        dispatchDecisionCounts: {
          auto_dispatch_executed_pdf: row.dispatchDecisionCounts?.auto_dispatch_executed_pdf ?? 0,
          auto_dispatch_executed_docx: row.dispatchDecisionCounts?.auto_dispatch_executed_docx ?? 0,
          recovery_attempted_missing_required_fields:
            row.dispatchDecisionCounts?.recovery_attempted_missing_required_fields ?? 0,
          blocked_missing_required_fields: row.dispatchDecisionCounts?.blocked_missing_required_fields ?? 0,
          blocked_missing_audit_session_context:
            row.dispatchDecisionCounts?.blocked_missing_audit_session_context ?? 0,
          blocked_audit_session_not_found:
            row.dispatchDecisionCounts?.blocked_audit_session_not_found ?? 0,
          blocked_ambiguous_name: row.dispatchDecisionCounts?.blocked_ambiguous_name ?? 0,
          blocked_ambiguous_founder_contact:
            row.dispatchDecisionCounts?.blocked_ambiguous_founder_contact ?? 0,
          blocked_tool_unavailable: row.dispatchDecisionCounts?.blocked_tool_unavailable ?? 0,
          blocked_tool_not_observed: row.dispatchDecisionCounts?.blocked_tool_not_observed ?? 0,
          unknown: row.dispatchDecisionCounts?.unknown ?? 0,
        },
        reasonCodeCounts: row.reasonCodeCounts || {},
        preflightReasonCodeCounts: row.preflightReasonCodeCounts || {},
        incidentCount: row.recentIncidents.length,
        lastIncident,
        deepLink: computeDeepLink({
          sessionId: row.lastSessionId,
          turnId: row.lastTurnId,
          runId: row.runId,
        }),
      };
    });

    return {
      runs,
      total: runs.length,
      appliedFilters: {
        runId: runIdFilter || null,
        status: statusFilter,
        limit,
      },
    };
  },
});

export const completeQaRun = mutation({
  args: {
    sessionId: v.string(),
    runId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    status: v.optional(v.union(v.literal("completed"), v.literal("failed"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const runId = normalizeNonEmptyString(args.runId);
    if (!runId) {
      throw new Error("runId is required.");
    }

    const now = Date.now();
    const run = args.organizationId
      ? await ctx.db
          .query("qaRuns")
          .withIndex("by_org_run_id", (q) =>
            q.eq("organizationId", args.organizationId!).eq("runId", runId),
          )
          .first()
      : await ctx.db
          .query("qaRuns")
          .withIndex("by_run_id", (q) => q.eq("runId", runId))
          .first();

    if (!run) {
      throw new Error("QA run not found.");
    }

    const nextStatus: QaRunStatus = args.status || "completed";

    await ctx.db.patch(run._id, {
      status: nextStatus,
      endedAt: now,
      lastActivityAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: run.organizationId,
      action: "ai.super_admin_agent_qa_mode_run_complete",
      resource: "qa_run",
      resourceId: run.runId,
      success: true,
      metadata: {
        modeVersion: run.modeVersion,
        status: nextStatus,
      },
      createdAt: now,
    });

    return {
      success: true,
      runId: run.runId,
      status: nextStatus,
      endedAt: now,
    };
  },
});

export const exportQaRunIncidentBundle = query({
  args: {
    sessionId: v.string(),
    runId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const runId = normalizeNonEmptyString(args.runId);
    if (!runId) {
      throw new Error("runId is required.");
    }

    const run = args.organizationId
      ? await ctx.db
          .query("qaRuns")
          .withIndex("by_org_run_id", (q) =>
            q.eq("organizationId", args.organizationId!).eq("runId", runId),
          )
          .first()
      : await ctx.db
          .query("qaRuns")
          .withIndex("by_run_id", (q) => q.eq("runId", runId))
          .first();

    if (!run) {
      throw new Error("QA run not found.");
    }

    const organization = await ctx.db.get(run.organizationId);

    const incidents = run.recentIncidents.map((incident) => ({
      ...incident,
      deepLink: computeDeepLink({
        sessionId: incident.sessionId,
        turnId: incident.turnId,
        runId: run.runId,
      }),
    }));

    return {
      contractVersion: "super_admin_agent_qa_incident_bundle_v1",
      exportedAt: Date.now(),
      run: {
        runId: run.runId,
        modeVersion: run.modeVersion,
        status: run.status,
        label: run.label,
        organizationId: run.organizationId,
        organizationName: organization?.name || organization?.slug || String(run.organizationId),
        ownerUserId: run.ownerUserId,
        ownerEmail: run.ownerEmail,
        targetAgentId: run.targetAgentId,
        targetTemplateRole: run.targetTemplateRole,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        lastActivityAt: run.lastActivityAt,
        turnCount: run.turnCount,
        successCount: run.successCount,
        blockedCount: run.blockedCount,
        errorCount: run.errorCount,
        blockedReasonCounts: {
          tool_unavailable: run.blockedReasonCounts?.tool_unavailable ?? 0,
          missing_required_fields: run.blockedReasonCounts?.missing_required_fields ?? 0,
          missing_audit_session_context:
            run.blockedReasonCounts?.missing_audit_session_context ?? 0,
          audit_session_not_found: run.blockedReasonCounts?.audit_session_not_found ?? 0,
          tool_not_observed: run.blockedReasonCounts?.tool_not_observed ?? 0,
          ambiguous_name: run.blockedReasonCounts?.ambiguous_name ?? 0,
          ambiguous_founder_contact: run.blockedReasonCounts?.ambiguous_founder_contact ?? 0,
          unknown: run.blockedReasonCounts?.unknown ?? 0,
        },
        dispatchDecisionCounts: {
          auto_dispatch_executed_pdf: run.dispatchDecisionCounts?.auto_dispatch_executed_pdf ?? 0,
          auto_dispatch_executed_docx: run.dispatchDecisionCounts?.auto_dispatch_executed_docx ?? 0,
          recovery_attempted_missing_required_fields:
            run.dispatchDecisionCounts?.recovery_attempted_missing_required_fields ?? 0,
          blocked_missing_required_fields: run.dispatchDecisionCounts?.blocked_missing_required_fields ?? 0,
          blocked_missing_audit_session_context:
            run.dispatchDecisionCounts?.blocked_missing_audit_session_context ?? 0,
          blocked_audit_session_not_found:
            run.dispatchDecisionCounts?.blocked_audit_session_not_found ?? 0,
          blocked_ambiguous_name: run.dispatchDecisionCounts?.blocked_ambiguous_name ?? 0,
          blocked_ambiguous_founder_contact:
            run.dispatchDecisionCounts?.blocked_ambiguous_founder_contact ?? 0,
          blocked_tool_unavailable: run.dispatchDecisionCounts?.blocked_tool_unavailable ?? 0,
          blocked_tool_not_observed: run.dispatchDecisionCounts?.blocked_tool_not_observed ?? 0,
          unknown: run.dispatchDecisionCounts?.unknown ?? 0,
        },
        reasonCodeCounts: run.reasonCodeCounts || {},
        preflightReasonCodeCounts: run.preflightReasonCodeCounts || {},
      },
      incidents,
    };
  },
});
