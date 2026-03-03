import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import {
  buildRuntimeTurnTelemetryDimensions,
  type RuntimeTurnTelemetryDimensions,
} from "./trustTelemetry";

const generatedApi: any = require("../_generated/api");

export const RUNTIME_INCIDENT_ALERT_LOG_TYPE = "agent_runtime_incident_alert_log" as const;
export const RUNTIME_INCIDENT_ALERT_CONTRACT_VERSION =
  "agent_runtime_incident_alert_v1" as const;

const MIN_ALERT_THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ALERT_THROTTLE_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_ALERT_THROTTLE_WINDOW_MS = 30 * 60 * 1000;

export const RUNTIME_INCIDENT_ALERT_TYPE_VALUES = [
  "claim_tool_unavailable",
  "runtime_capability_gap_blocked",
  "delivery_blocked_escalated",
  "response_loop",
  "duplicate_ingress_replay",
] as const;

export type RuntimeIncidentAlertType =
  (typeof RUNTIME_INCIDENT_ALERT_TYPE_VALUES)[number];

const runtimeIncidentAlertTypeValidator = v.union(
  v.literal("claim_tool_unavailable"),
  v.literal("runtime_capability_gap_blocked"),
  v.literal("delivery_blocked_escalated"),
  v.literal("response_loop"),
  v.literal("duplicate_ingress_replay"),
);

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeAlertThrottleWindowMs(value: unknown): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? Math.floor(value)
      : DEFAULT_ALERT_THROTTLE_WINDOW_MS;
  return Math.min(
    MAX_ALERT_THROTTLE_WINDOW_MS,
    Math.max(MIN_ALERT_THROTTLE_WINDOW_MS, numeric),
  );
}

export function normalizeRuntimeIncidentProposalKey(
  value: unknown,
): string | undefined {
  return normalizeNonEmptyString(value);
}

export function buildRuntimeIncidentAlertDedupeKey(args: {
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  proposalKey?: string;
  reasonCode: string;
}): string {
  const proposalPartition =
    normalizeRuntimeIncidentProposalKey(args.proposalKey)
    ?? `session:${String(args.sessionId)}`;
  const reasonCode = normalizeNonEmptyString(args.reasonCode)?.toLowerCase()
    ?? "unknown_reason";
  return `${String(args.organizationId)}|${proposalPartition}|${reasonCode}`;
}

export function buildRuntimeIncidentThreadDeepLink(args: {
  sessionId: Id<"agentSessions">;
  proposalKey?: string;
}): string {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.APP_URL
    || "https://app.l4yercak3.com"
  ).replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("app", "organizations");
  params.set("panel", "agent-control-center");
  params.set("entity", String(args.sessionId));
  params.set("context", "runtime-incident");
  const proposalKey = normalizeRuntimeIncidentProposalKey(args.proposalKey);
  if (proposalKey) {
    params.set("proposalKey", proposalKey);
  }
  return `${baseUrl}/?${params.toString()}`;
}

function buildRuntimeIncidentAlertContext(args: {
  incidentType: RuntimeIncidentAlertType;
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  turnId?: Id<"agentTurns">;
  proposalKey?: string;
  tool?: string;
  reasonCode: string;
  reason?: string;
  linearIssueId?: string;
  linearIssueUrl?: string;
  threadDeepLink: string;
  dedupeKey: string;
  telemetryDimensions: RuntimeTurnTelemetryDimensions;
}): string {
  return [
    `incidentType=${args.incidentType}`,
    `organizationId=${String(args.organizationId)}`,
    `sessionId=${String(args.sessionId)}`,
    `turnId=${args.turnId ? String(args.turnId) : "n/a"}`,
    `proposalKey=${args.proposalKey ?? "n/a"}`,
    `tool=${args.tool ?? "n/a"}`,
    `reasonCode=${args.reasonCode}`,
    `reason=${args.reason ?? "n/a"}`,
    `linearIssueId=${args.linearIssueId ?? "n/a"}`,
    `linearIssueUrl=${args.linearIssueUrl ?? "n/a"}`,
    `threadDeepLink=${args.threadDeepLink}`,
    `dedupeKey=${args.dedupeKey}`,
    `manifestHash=${args.telemetryDimensions.manifestHash}`,
    `idempotencyKey=${args.telemetryDimensions.idempotencyKey}`,
    `idempotencyScopeKey=${args.telemetryDimensions.idempotencyScopeKey}`,
    `payloadHash=${args.telemetryDimensions.payloadHash}`,
    `admissionReasonCode=${args.telemetryDimensions.admissionReasonCode}`,
  ].join("\n");
}

export const getLatestRuntimeIncidentAlertLog = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    dedupeKey: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", RUNTIME_INCIDENT_ALERT_LOG_TYPE),
      )
      .order("desc")
      .take(200);

    for (const row of rows) {
      const customProperties = (row.customProperties || {}) as Record<string, unknown>;
      if (customProperties.contractVersion !== RUNTIME_INCIDENT_ALERT_CONTRACT_VERSION) {
        continue;
      }
      if (customProperties.dedupeKey !== args.dedupeKey) {
        continue;
      }
      if (customProperties.deliveryStatus !== "sent") {
        continue;
      }
      const notifiedAt =
        typeof customProperties.notifiedAt === "number"
          ? customProperties.notifiedAt
          : undefined;
      if (!notifiedAt || notifiedAt < args.since) {
        continue;
      }

      return {
        _id: row._id,
        notifiedAt,
        emailId:
          typeof customProperties.emailId === "string"
            ? customProperties.emailId
            : undefined,
      };
    }

    return null;
  },
});

export const recordRuntimeIncidentAlertLog = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    turnId: v.optional(v.id("agentTurns")),
    incidentType: runtimeIncidentAlertTypeValidator,
    proposalKey: v.optional(v.string()),
    tool: v.optional(v.string()),
    reasonCode: v.string(),
    reason: v.optional(v.string()),
    manifestHash: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    idempotencyScopeKey: v.optional(v.string()),
    payloadHash: v.optional(v.string()),
    admissionReasonCode: v.optional(v.string()),
    linearIssueId: v.optional(v.string()),
    linearIssueUrl: v.optional(v.string()),
    threadDeepLink: v.string(),
    dedupeKey: v.string(),
    throttleWindowMs: v.number(),
    deliveryStatus: v.union(v.literal("sent"), v.literal("failed")),
    notifiedAt: v.optional(v.number()),
    emailId: v.optional(v.string()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const logId = await ctx.db.insert("objects", {
      type: RUNTIME_INCIDENT_ALERT_LOG_TYPE,
      name: "Agent Runtime Incident Alert",
      organizationId: args.organizationId,
      status: args.deliveryStatus === "sent" ? "active" : "error",
      customProperties: {
        contractVersion: RUNTIME_INCIDENT_ALERT_CONTRACT_VERSION,
        sessionId: String(args.sessionId),
        turnId: args.turnId ? String(args.turnId) : undefined,
        incidentType: args.incidentType,
        proposalKey: args.proposalKey,
        tool: args.tool,
        reasonCode: args.reasonCode,
        reason: args.reason,
        manifestHash: args.manifestHash,
        idempotencyKey: args.idempotencyKey,
        idempotencyScopeKey: args.idempotencyScopeKey,
        payloadHash: args.payloadHash,
        admissionReasonCode: args.admissionReasonCode,
        linearIssueId: args.linearIssueId,
        linearIssueUrl: args.linearIssueUrl,
        threadDeepLink: args.threadDeepLink,
        dedupeKey: args.dedupeKey,
        throttleWindowMs: args.throttleWindowMs,
        deliveryStatus: args.deliveryStatus,
        notifiedAt: args.notifiedAt,
        emailId: args.emailId,
        error: args.error,
        metadata: args.metadata,
        createdAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { logId };
  },
});

export const notifyRuntimeIncident = internalAction({
  args: {
    incidentType: runtimeIncidentAlertTypeValidator,
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    turnId: v.optional(v.id("agentTurns")),
    proposalKey: v.optional(v.string()),
    tool: v.optional(v.string()),
    reasonCode: v.string(),
    reason: v.optional(v.string()),
    manifestHash: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    idempotencyScopeKey: v.optional(v.string()),
    payloadHash: v.optional(v.string()),
    admissionReasonCode: v.optional(v.string()),
    linearIssueId: v.optional(v.string()),
    linearIssueUrl: v.optional(v.string()),
    threadDeepLink: v.optional(v.string()),
    throttleWindowMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reasonCode = normalizeNonEmptyString(args.reasonCode) ?? "unknown_reason";
    const proposalKey = normalizeRuntimeIncidentProposalKey(args.proposalKey);
    const tool = normalizeNonEmptyString(args.tool);
    const reason = normalizeNonEmptyString(args.reason);
    const linearIssueId = normalizeNonEmptyString(args.linearIssueId);
    const linearIssueUrl = normalizeNonEmptyString(args.linearIssueUrl);
    const throttleWindowMs = normalizeAlertThrottleWindowMs(args.throttleWindowMs);

    const dedupeKey = buildRuntimeIncidentAlertDedupeKey({
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      proposalKey,
      reasonCode,
    });
    const telemetryDimensions = buildRuntimeTurnTelemetryDimensions({
      manifestHash: args.manifestHash,
      idempotencyKey: args.idempotencyKey,
      idempotencyScopeKey: args.idempotencyScopeKey ?? proposalKey,
      payloadHash: args.payloadHash,
      admissionReasonCode: args.admissionReasonCode ?? reasonCode,
    });

    const existingAlert = await (ctx as any).runQuery(
      generatedApi.internal.ai.runtimeIncidentAlerts.getLatestRuntimeIncidentAlertLog,
      {
        organizationId: args.organizationId,
        dedupeKey,
        since: now - throttleWindowMs,
      },
    );

    if (existingAlert) {
      return {
        success: true,
        emitted: false,
        deduped: true,
        dedupeKey,
        throttleWindowMs,
        lastNotifiedAt: existingAlert.notifiedAt,
      };
    }

    const threadDeepLink =
      normalizeNonEmptyString(args.threadDeepLink)
      || buildRuntimeIncidentThreadDeepLink({
        sessionId: args.sessionId,
        proposalKey,
      });
    const context = buildRuntimeIncidentAlertContext({
      incidentType: args.incidentType,
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      turnId: args.turnId,
      proposalKey,
      tool,
      reasonCode,
      reason,
      linearIssueId,
      linearIssueUrl,
      threadDeepLink,
      dedupeKey,
      telemetryDimensions,
    });

    const alertResult = await (ctx as any).runAction(
      generatedApi.api.ai.platformAlerts.sendPlatformAlert,
      {
        alertType: "service_outage",
        errorMessage: `Agent runtime incident (${args.incidentType}) - ${reasonCode}`,
        organizationId: args.organizationId,
        context,
      },
    ) as {
      success?: boolean;
      emailId?: string;
      error?: string;
    } | null;

    const sent = alertResult?.success === true;
    await (ctx as any).runMutation(
      generatedApi.internal.ai.runtimeIncidentAlerts.recordRuntimeIncidentAlertLog,
      {
        organizationId: args.organizationId,
        sessionId: args.sessionId,
        turnId: args.turnId,
        incidentType: args.incidentType,
        proposalKey,
        tool,
        reasonCode,
        reason,
        manifestHash: telemetryDimensions.manifestHash,
        idempotencyKey: telemetryDimensions.idempotencyKey,
        idempotencyScopeKey: telemetryDimensions.idempotencyScopeKey,
        payloadHash: telemetryDimensions.payloadHash,
        admissionReasonCode: telemetryDimensions.admissionReasonCode,
        linearIssueId,
        linearIssueUrl,
        threadDeepLink,
        dedupeKey,
        throttleWindowMs,
        deliveryStatus: sent ? "sent" : "failed",
        notifiedAt: sent ? now : undefined,
        emailId: normalizeNonEmptyString(alertResult?.emailId),
        error: sent
          ? undefined
          : normalizeNonEmptyString(alertResult?.error) ?? "platform_alert_send_failed",
        metadata: args.metadata,
      },
    );

    if (!sent) {
      console.error("[RuntimeIncidentAlerts] Failed to emit platform alert", {
        organizationId: args.organizationId,
        sessionId: args.sessionId,
        turnId: args.turnId,
        incidentType: args.incidentType,
        reasonCode,
        dedupeKey,
        error: alertResult?.error,
      });
      return {
        success: false,
        emitted: false,
        deduped: false,
        dedupeKey,
        threadDeepLink,
        throttleWindowMs,
        error: alertResult?.error ?? "platform_alert_send_failed",
      };
    }

    return {
      success: true,
      emitted: true,
      deduped: false,
      dedupeKey,
      threadDeepLink,
      throttleWindowMs,
      emailId: normalizeNonEmptyString(alertResult?.emailId),
    };
  },
});
