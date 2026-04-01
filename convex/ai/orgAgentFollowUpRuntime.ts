import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  ORG_AGENT_ACTION_ITEM_OBJECT_TYPE,
  type OrgActionPolicyDecision,
  type OrgActionPolicyRiskLevel,
  type OrgActionTargetSystemClass,
  type OrgAgentActionItemStatus,
} from "../schemas/orgAgentActionRuntimeSchemas";
import { resolveOrgActionPolicyDecision } from "./orgActionPolicy";
import {
  buildOrgActionExecutionReceiptIdempotencyKey,
  buildOrgActionReceiptCorrelationId,
} from "./orgActionExecution";
import {
  ORG_ACTION_FOLLOW_UP_REENTRY_CONTRACT_VERSION,
  buildOrgActionFollowUpReentryContract,
  type OrgActionFollowUpTrigger,
} from "./kernel/agentTurnOrchestration";

export const ORG_ACTION_FOLLOW_UP_RUNTIME_CONTRACT_VERSION =
  "org_action_follow_up_runtime_v1" as const;
export const ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE =
  "org_action_follow_up_runtime" as const;

type ActionItemRow = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  status: string;
  subtype?: string;
  customProperties?: unknown;
};

type ActionSessionRow = {
  _id: Id<"agentSessions">;
  organizationId: Id<"organizations">;
  channel: string;
  externalContactIdentifier: string;
  agentId: Id<"objects">;
};

type PolicySnapshotRow = {
  _id: Id<"orgActionPolicySnapshots">;
  decision: string;
  riskLevel: string;
  channel: string;
  targetSystemClass: string;
  resolvedAt: number;
};

type ExecutionReceiptRow = {
  _id: Id<"orgActionExecutionReceipts">;
  attemptNumber: number;
  executionStatus: string;
  idempotencyKey: string;
  correlationId: string;
  updatedAt: number;
};

function getInternal(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("../_generated/api").internal;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePositiveOrdinal(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
}

function normalizeActionItemStatus(value: unknown): OrgAgentActionItemStatus {
  if (
    value === "pending_review"
    || value === "assigned"
    || value === "approved"
    || value === "executing"
    || value === "completed"
    || value === "failed"
    || value === "cancelled"
  ) {
    return value;
  }
  return "pending_review";
}

function normalizePolicyDecision(value: unknown): OrgActionPolicyDecision | null {
  if (
    value === "owner_only"
    || value === "approval_required"
    || value === "agent_auto_allowed"
  ) {
    return value;
  }
  return null;
}

function normalizeRiskLevel(value: unknown): OrgActionPolicyRiskLevel {
  if (
    value === "low"
    || value === "medium"
    || value === "high"
    || value === "critical"
  ) {
    return value;
  }
  return "high";
}

function normalizeTargetSystemClass(value: unknown): OrgActionTargetSystemClass {
  return value === "external_connector"
    ? "external_connector"
    : "platform_internal";
}

function resolveSourceSessionId(properties: Record<string, unknown>): string | null {
  return (
    normalizeOptionalString(properties.sourceSessionId)
    || normalizeOptionalString(properties.sessionId)
    || null
  );
}

function resolveSourceChannel(properties: Record<string, unknown>): string | null {
  return (
    normalizeOptionalString(properties.sourceChannel)
    || normalizeOptionalString(properties.channel)
    || null
  );
}

function resolveSourceExternalContactIdentifier(
  properties: Record<string, unknown>,
): string | null {
  return (
    normalizeOptionalString(properties.sourceExternalContactIdentifier)
    || normalizeOptionalString(properties.externalContactIdentifier)
    || normalizeOptionalString(properties.contactIdentifier)
    || null
  );
}

function resolveActionFamily(
  actionItem: ActionItemRow,
  properties: Record<string, unknown>,
): string {
  return (
    normalizeOptionalString(properties.actionFamily)
    || normalizeOptionalString(properties.actionType)
    || normalizeOptionalString(properties.intentType)
    || normalizeOptionalString(actionItem.subtype)
    || "unknown_action"
  );
}

function resolvePreferredAgentId(
  session: ActionSessionRow | null,
  properties: Record<string, unknown>,
): string | null {
  return (
    normalizeOptionalString(properties.assignedAgentId)
    || normalizeOptionalString(properties.agentId)
    || normalizeOptionalString(session?.agentId)
    || null
  );
}

function resolveLatestPolicyDecision(args: {
  latestSnapshot: PolicySnapshotRow | null;
  actionItemProperties: Record<string, unknown>;
  actionFamily: string;
  sourceChannel: string | null;
}): OrgActionPolicyDecision {
  const snapshotDecision = normalizePolicyDecision(args.latestSnapshot?.decision);
  if (snapshotDecision) {
    return snapshotDecision;
  }

  const propertyDecision = normalizePolicyDecision(
    args.actionItemProperties.policyDecision,
  );
  if (propertyDecision) {
    return propertyDecision;
  }

  return resolveOrgActionPolicyDecision({
    actionFamily: args.actionFamily,
    riskLevel: normalizeRiskLevel(
      args.latestSnapshot?.riskLevel
        ?? args.actionItemProperties.riskLevel,
    ),
    channel:
      args.sourceChannel
      || normalizeOptionalString(args.latestSnapshot?.channel)
      || "unknown",
    targetSystemClass: normalizeTargetSystemClass(
      args.latestSnapshot?.targetSystemClass
        ?? args.actionItemProperties.targetSystemClass,
    ),
  }).decision;
}

function resolveLatestPolicySnapshot(
  rows: PolicySnapshotRow[],
): PolicySnapshotRow | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((latest, row) => (
    row.resolvedAt > latest.resolvedAt ? row : latest
  ));
}

function resolveLatestExecutionReceipt(
  rows: ExecutionReceiptRow[],
): ExecutionReceiptRow | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((latest, row) => {
    if (row.attemptNumber !== latest.attemptNumber) {
      return row.attemptNumber > latest.attemptNumber ? row : latest;
    }
    return row.updatedAt >= latest.updatedAt ? row : latest;
  });
}

export type OrgActionFollowUpRuntimeGateReasonCode =
  | "eligible_approved_or_queued"
  | "blocked_missing_source_session"
  | "blocked_missing_source_channel"
  | "blocked_missing_external_contact_identifier"
  | "blocked_missing_policy_decision"
  | "blocked_owner_only_policy"
  | "blocked_requires_approved_or_queued";

export function resolveOrgActionFollowUpRuntimeGate(args: {
  actionItemStatus: OrgAgentActionItemStatus;
  policyDecision: OrgActionPolicyDecision | null;
  latestReceiptExecutionStatus: string | null;
  sourceSessionId: string | null;
  sourceChannel: string | null;
  sourceExternalContactIdentifier: string | null;
}): {
  allowed: boolean;
  reasonCode: OrgActionFollowUpRuntimeGateReasonCode;
} {
  if (!args.sourceSessionId) {
    return { allowed: false, reasonCode: "blocked_missing_source_session" };
  }
  if (!args.sourceChannel) {
    return { allowed: false, reasonCode: "blocked_missing_source_channel" };
  }
  if (!args.sourceExternalContactIdentifier) {
    return {
      allowed: false,
      reasonCode: "blocked_missing_external_contact_identifier",
    };
  }
  if (!args.policyDecision) {
    return { allowed: false, reasonCode: "blocked_missing_policy_decision" };
  }
  if (args.policyDecision === "owner_only") {
    return { allowed: false, reasonCode: "blocked_owner_only_policy" };
  }
  const statusEligible =
    args.actionItemStatus === "approved"
    || args.actionItemStatus === "assigned"
    || args.actionItemStatus === "executing";
  const queuedReceipt = args.latestReceiptExecutionStatus === "queued";
  if (!statusEligible && !queuedReceipt) {
    return { allowed: false, reasonCode: "blocked_requires_approved_or_queued" };
  }
  return { allowed: true, reasonCode: "eligible_approved_or_queued" };
}

export function resolveOrgActionFollowUpDispatchIdentity(args: {
  organizationId: string;
  actionItemObjectId: string;
  actionFamily: string;
  sourceSessionId: string;
  latestReceipt:
    | {
        attemptNumber?: unknown;
        executionStatus?: unknown;
        idempotencyKey?: unknown;
        correlationId?: unknown;
      }
    | null;
}): {
  attemptNumber: number;
  correlationId: string;
  idempotencyKey: string;
  reusedQueuedReceipt: boolean;
} {
  const latestAttempt = normalizePositiveOrdinal(args.latestReceipt?.attemptNumber);
  const queuedReceipt = normalizeOptionalString(args.latestReceipt?.executionStatus) === "queued";
  const queuedCorrelationId = normalizeOptionalString(args.latestReceipt?.correlationId);
  const queuedIdempotencyKey = normalizeOptionalString(args.latestReceipt?.idempotencyKey);
  if (queuedReceipt && queuedCorrelationId && queuedIdempotencyKey) {
    return {
      attemptNumber: latestAttempt,
      correlationId: queuedCorrelationId,
      idempotencyKey: queuedIdempotencyKey,
      reusedQueuedReceipt: true,
    };
  }
  const nextAttemptNumber = latestAttempt + (args.latestReceipt ? 1 : 0);
  return {
    attemptNumber: nextAttemptNumber,
    correlationId: buildOrgActionReceiptCorrelationId({
      sessionId: args.sourceSessionId,
      actionItemObjectId: args.actionItemObjectId,
      attemptNumber: nextAttemptNumber,
    }),
    idempotencyKey: buildOrgActionExecutionReceiptIdempotencyKey({
      organizationId: args.organizationId,
      actionItemObjectId: args.actionItemObjectId,
      actionFamily: args.actionFamily,
      attemptNumber: nextAttemptNumber,
    }),
    reusedQueuedReceipt: false,
  };
}

export function buildOrgActionFollowUpRuntimeMessage(args: {
  actionItemObjectId: string;
  actionFamily: string;
  trigger: OrgActionFollowUpTrigger;
  attemptNumber: number;
}): string {
  return [
    "[org_action_follow_up_runtime]",
    `action_item=${args.actionItemObjectId}`,
    `action_family=${args.actionFamily}`,
    `trigger=${args.trigger}`,
    `attempt=${normalizePositiveOrdinal(args.attemptNumber)}`,
  ].join(" ");
}

export function buildOrgActionFollowUpRuntimeMetadata(args: {
  actionItemObjectId: string;
  sourceSessionId: string;
  trigger: OrgActionFollowUpTrigger;
  attemptNumber: number;
  correlationId: string;
  idempotencyKey: string;
  actionFamily: string;
  policyDecision: OrgActionPolicyDecision;
}): Record<string, unknown> {
  return {
    source: ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE,
    entrySource: ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE,
    workflowKey: "follow_up_execution",
    workflowIntent: "orchestration",
    intentType: "orchestration",
    requestCorrelationId: args.correlationId,
    correlationId: args.correlationId,
    idempotencyKey: args.idempotencyKey,
    sourceSessionId: args.sourceSessionId,
    sourceActionItemId: args.actionItemObjectId,
    actionFamily: args.actionFamily,
    policyDecision: args.policyDecision,
    skipOutbound: true,
    orgActionFollowUpReentry: buildOrgActionFollowUpReentryContract({
      actionItemObjectId: args.actionItemObjectId,
      sourceSessionId: args.sourceSessionId,
      trigger: args.trigger,
      attemptNumber: args.attemptNumber,
      correlationId: args.correlationId,
      idempotencyKey: args.idempotencyKey,
    }),
    orgActionFollowUpReentryContractVersion:
      ORG_ACTION_FOLLOW_UP_REENTRY_CONTRACT_VERSION,
  };
}

interface FollowUpDispatchContext {
  actionItem: ActionItemRow | null;
  sourceSession: ActionSessionRow | null;
  latestPolicySnapshot: PolicySnapshotRow | null;
  latestExecutionReceipt: ExecutionReceiptRow | null;
}

export const loadFollowUpDispatchContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    actionItemId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<FollowUpDispatchContext> => {
    const db = (ctx as any).db;
    const actionItem = (await db.get(args.actionItemId)) as
      | ActionItemRow
      | null;
    if (
      !actionItem
      || actionItem.organizationId !== args.organizationId
      || actionItem.type !== ORG_AGENT_ACTION_ITEM_OBJECT_TYPE
    ) {
      return {
        actionItem: null,
        sourceSession: null,
        latestPolicySnapshot: null,
        latestExecutionReceipt: null,
      };
    }

    const actionItemProperties = asRecord(actionItem.customProperties);
    const sourceSessionId = resolveSourceSessionId(actionItemProperties);
    const sourceSession = sourceSessionId
      ? ((await db.get(sourceSessionId as Id<"agentSessions">)) as
          | ActionSessionRow
          | null)
      : null;
    const scopedSourceSession =
      sourceSession && sourceSession.organizationId === args.organizationId
        ? sourceSession
        : null;

    const policySnapshots = (await db
      .query("orgActionPolicySnapshots")
      .withIndex("by_org_action_item", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("actionItemObjectId", args.actionItemId),
      )
      .collect()) as PolicySnapshotRow[];
    const executionReceipts = (await db
      .query("orgActionExecutionReceipts")
      .withIndex("by_org_action_item", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("actionItemObjectId", args.actionItemId),
      )
      .collect()) as ExecutionReceiptRow[];

    return {
      actionItem,
      sourceSession: scopedSourceSession,
      latestPolicySnapshot: resolveLatestPolicySnapshot(policySnapshots),
      latestExecutionReceipt: resolveLatestExecutionReceipt(executionReceipts),
    };
  },
});

export const dispatchActionItemFollowUpExecution = internalAction({
  args: {
    organizationId: v.id("organizations"),
    actionItemId: v.id("objects"),
    trigger: v.optional(
      v.union(
        v.literal("approved_dispatch"),
        v.literal("queued_retry"),
        v.literal("manual_dispatch"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      getInternal().ai.orgAgentFollowUpRuntime.loadFollowUpDispatchContext,
      {
        organizationId: args.organizationId,
        actionItemId: args.actionItemId,
      },
    ) as FollowUpDispatchContext;
    if (!context.actionItem) {
      return {
        contractVersion: ORG_ACTION_FOLLOW_UP_RUNTIME_CONTRACT_VERSION,
        status: "blocked" as const,
        reasonCode: "blocked_missing_source_session" as const,
      };
    }

    const actionItem = context.actionItem;
    const actionItemProperties = asRecord(actionItem.customProperties);
    const sourceSessionId = resolveSourceSessionId(actionItemProperties);
    const scopedSourceSession = context.sourceSession;
    const sourceChannel =
      normalizeOptionalString(scopedSourceSession?.channel)
      || resolveSourceChannel(actionItemProperties);
    const sourceExternalContactIdentifier =
      normalizeOptionalString(scopedSourceSession?.externalContactIdentifier)
      || resolveSourceExternalContactIdentifier(actionItemProperties);
    const actionFamily = resolveActionFamily(actionItem, actionItemProperties);

    const policyDecision = resolveLatestPolicyDecision({
      latestSnapshot: context.latestPolicySnapshot,
      actionItemProperties,
      actionFamily,
      sourceChannel,
    });
    const gate = resolveOrgActionFollowUpRuntimeGate({
      actionItemStatus: normalizeActionItemStatus(actionItem.status),
      policyDecision,
      latestReceiptExecutionStatus: normalizeOptionalString(
        context.latestExecutionReceipt?.executionStatus,
      ),
      sourceSessionId,
      sourceChannel,
      sourceExternalContactIdentifier,
    });
    if (!gate.allowed) {
      return {
        contractVersion: ORG_ACTION_FOLLOW_UP_RUNTIME_CONTRACT_VERSION,
        status: "blocked" as const,
        reasonCode: gate.reasonCode,
      };
    }

    const trigger: OrgActionFollowUpTrigger =
      args.trigger
      || (
        normalizeOptionalString(context.latestExecutionReceipt?.executionStatus) === "queued"
          ? "queued_retry"
          : "approved_dispatch"
      );
    const dispatchIdentity = resolveOrgActionFollowUpDispatchIdentity({
      organizationId: String(args.organizationId),
      actionItemObjectId: String(args.actionItemId),
      actionFamily,
      sourceSessionId: sourceSessionId!,
      latestReceipt: context.latestExecutionReceipt,
    });
    const runtimeMetadata = buildOrgActionFollowUpRuntimeMetadata({
      actionItemObjectId: String(args.actionItemId),
      sourceSessionId: sourceSessionId!,
      trigger,
      attemptNumber: dispatchIdentity.attemptNumber,
      correlationId: dispatchIdentity.correlationId,
      idempotencyKey: dispatchIdentity.idempotencyKey,
      actionFamily,
      policyDecision,
    });
    const preferredAgentId = resolvePreferredAgentId(
      scopedSourceSession,
      actionItemProperties,
    );
    if (preferredAgentId) {
      runtimeMetadata.agentId = preferredAgentId;
      runtimeMetadata.resolvedAgentId = preferredAgentId;
      runtimeMetadata.publicAgentId = preferredAgentId;
    }

    const runtimeResult = await ctx.runAction(
      getInternal().ai.agentExecution.processInboundMessage,
      {
        organizationId: args.organizationId,
        channel: sourceChannel!,
        externalContactIdentifier: sourceExternalContactIdentifier!,
        message: buildOrgActionFollowUpRuntimeMessage({
          actionItemObjectId: String(args.actionItemId),
          actionFamily,
          trigger,
          attemptNumber: dispatchIdentity.attemptNumber,
        }),
        metadata: runtimeMetadata,
      },
    ) as {
      status?: string;
      sessionId?: Id<"agentSessions">;
      turnId?: Id<"agentTurns">;
      message?: string;
    } | null;

    return {
      contractVersion: ORG_ACTION_FOLLOW_UP_RUNTIME_CONTRACT_VERSION,
      status: "dispatched" as const,
      reasonCode: gate.reasonCode,
      actionItemId: args.actionItemId,
      sourceSessionId: sourceSessionId!,
      sourceChannel: sourceChannel!,
      sourceExternalContactIdentifier: sourceExternalContactIdentifier!,
      trigger,
      attemptNumber: dispatchIdentity.attemptNumber,
      correlationId: dispatchIdentity.correlationId,
      idempotencyKey: dispatchIdentity.idempotencyKey,
      reusedQueuedReceipt: dispatchIdentity.reusedQueuedReceipt,
      runtimeStatus: runtimeResult?.status || "unknown",
      runtimeSessionId: runtimeResult?.sessionId || null,
      runtimeTurnId: runtimeResult?.turnId || null,
      runtimeMessage: runtimeResult?.message || null,
    };
  },
});
