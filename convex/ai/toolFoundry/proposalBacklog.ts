import { ConvexError, v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation, query } from "../../_generated/server";
import { getUserContext, requireAuthenticatedUser } from "../../rbacHelpers";
import type {
  ToolCapabilityGapBlockedPayload,
  ToolFoundryCapabilityGapMissingKind,
  ToolSpecProposalDraftArtifact,
} from "../kernel/agentToolOrchestration";
import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  buildTrustTimelineCorrelationId,
  type TrustEventActorType,
  type TrustEventMode,
  type TrustEventName,
  type TrustEventPayload,
  validateTrustEventPayload,
} from "../trustEvents";

export const TOOL_FOUNDRY_PROPOSAL_BACKLOG_CONTRACT_VERSION =
  "tool_foundry_proposal_backlog_v1" as const;

export const TOOL_FOUNDRY_PROPOSAL_BACKLOG_STATUS_VALUES = [
  "pending_review",
  "in_review",
  "promoted",
  "rejected",
  "rolled_back",
] as const;
export type ToolFoundryProposalBacklogStatus =
  (typeof TOOL_FOUNDRY_PROPOSAL_BACKLOG_STATUS_VALUES)[number];

export const TOOL_FOUNDRY_PROPOSAL_ROLLBACK_POLICY =
  "disable_runtime_binding_and_reopen_gap" as const;

export const TOOL_FOUNDRY_PROPOSAL_ROLLBACK_STATUS_VALUES = [
  "rollback_ready",
  "rollback_applied",
] as const;
export type ToolFoundryProposalRollbackStatus =
  (typeof TOOL_FOUNDRY_PROPOSAL_ROLLBACK_STATUS_VALUES)[number];

const TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES = {
  proposalCreated: "trust.tool_foundry.proposal_created.v1",
  promotionRequested: "trust.tool_foundry.promotion_requested.v1",
  promotionGranted: "trust.tool_foundry.promotion_granted.v1",
  promotionDenied: "trust.tool_foundry.promotion_denied.v1",
} as const satisfies Record<string, TrustEventName>;

type ToolFoundryLifecycleEventName =
  (typeof TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES)[keyof typeof TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES];

export interface ToolFoundryProposalSourceTrace {
  agentId: Id<"objects">;
  sessionId: Id<"agentSessions">;
  turnId?: Id<"agentTurns">;
  receiptId?: string;
  channel?: string;
  externalContactIdentifier?: string;
  idempotencyScopeKey?: string;
  payloadHash?: string;
  queueConcurrencyKey?: string;
  workflowKey?: string;
  lineageId?: string;
  threadId?: string;
  correlationId?: string;
  frontlineIntakeTrigger?: string;
  boundaryReason?: string;
}

export interface ToolFoundryProposalBacklogTrace {
  reasonCode: string;
  reason: string;
  missingKinds: ToolFoundryCapabilityGapMissingKind[];
  missingSummary: string;
  unblockingSteps: string[];
}

export interface ToolFoundryProposalBacklogProvenance {
  organizationId: string;
  agentId: string;
  sessionId: string;
  requestedToolName: string;
  sourceRequestTraceKey: string;
  turnId?: string;
  receiptId?: string;
  channel?: string;
  externalContactIdentifier?: string;
  idempotencyScopeKey?: string;
  payloadHash?: string;
  queueConcurrencyKey?: string;
  workflowKey?: string;
  lineageId?: string;
  threadId?: string;
  correlationId?: string;
  frontlineIntakeTrigger?: string;
  boundaryReason?: string;
}

export interface ToolFoundryProposalBacklogRollback {
  rollbackKey: string;
  policy: typeof TOOL_FOUNDRY_PROPOSAL_ROLLBACK_POLICY;
  status: ToolFoundryProposalRollbackStatus;
  reasonCode: string;
  appliedAt?: number;
  appliedBy?: string;
}

export interface ToolFoundryProposalBacklogLinearIssue {
  issueId: string;
  issueNumber: string;
  issueUrl: string;
  linkedAt: number;
  lastSyncedAt: number;
}

export interface ToolFoundryProposalBacklogRecord {
  contractVersion: typeof TOOL_FOUNDRY_PROPOSAL_BACKLOG_CONTRACT_VERSION;
  artifactType: "tool_spec_proposal";
  artifactContractVersion: ToolSpecProposalDraftArtifact["contractVersion"];
  organizationId: Id<"organizations">;
  proposalKey: string;
  stage: "draft";
  status: ToolFoundryProposalBacklogStatus;
  source: "runtime_capability_gap";
  requestedToolName: string;
  draft: ToolSpecProposalDraftArtifact["draft"];
  trace: ToolFoundryProposalBacklogTrace;
  provenance: ToolFoundryProposalBacklogProvenance;
  rollback: ToolFoundryProposalBacklogRollback;
  linearIssue?: ToolFoundryProposalBacklogLinearIssue;
  firstObservedAt: number;
  lastObservedAt: number;
  observationCount: number;
  createdAt: number;
  updatedAt: number;
}

const MISSING_KIND_ORDER: ToolFoundryCapabilityGapMissingKind[] = [
  "internal_concept",
  "tool_contract",
  "backend_contract",
];

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeObservedAt(...values: Array<unknown>): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value);
    }
  }
  return Date.now();
}

function normalizeOrderedStringList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const item = normalizeNonEmptyString(value);
    if (!item || seen.has(item)) {
      continue;
    }
    seen.add(item);
    normalized.push(item);
  }
  return normalized;
}

function normalizeSortedStringList(values: readonly string[]): string[] {
  return normalizeOrderedStringList(values).sort((left, right) =>
    left.localeCompare(right)
  );
}

function normalizeToolSpecDraft(
  draft: ToolSpecProposalDraftArtifact["draft"]
): ToolSpecProposalDraftArtifact["draft"] {
  const inputFields = draft.inputFields
    .map((field) => ({
      name: normalizeNonEmptyString(field.name) ?? "unknown_field",
      inferredType: field.inferredType,
      required: field.required !== false,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    suggestedToolName:
      normalizeNonEmptyString(draft.suggestedToolName) ?? "unknown_tool",
    intentSummary:
      normalizeNonEmptyString(draft.intentSummary)
      ?? "Requested unavailable capability; proposal draft required.",
    inputFields,
    outputContract: "tbd_by_foundry_review",
    requiredCapabilities: normalizeSortedStringList(draft.requiredCapabilities),
    riskLabels: normalizeSortedStringList(draft.riskLabels),
    verificationIntent: normalizeSortedStringList(draft.verificationIntent),
  };
}

function normalizeMissingKinds(
  missingKinds: readonly ToolFoundryCapabilityGapMissingKind[]
): ToolFoundryCapabilityGapMissingKind[] {
  const kindSet = new Set(missingKinds);
  return MISSING_KIND_ORDER.filter((kind) => kindSet.has(kind));
}

function toTraceToken(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96)
    || fallback;
}

function isBacklogStatus(value: unknown): value is ToolFoundryProposalBacklogStatus {
  return typeof value === "string"
    && (TOOL_FOUNDRY_PROPOSAL_BACKLOG_STATUS_VALUES as readonly string[]).includes(value);
}

function isRollbackStatus(value: unknown): value is ToolFoundryProposalRollbackStatus {
  return typeof value === "string"
    && (TOOL_FOUNDRY_PROPOSAL_ROLLBACK_STATUS_VALUES as readonly string[]).includes(value);
}

function resolveToolFoundryRiskLevel(record: ToolFoundryProposalBacklogRecord): string {
  const normalized = record.draft.riskLabels
    .map((value) => normalizeNonEmptyString(value)?.toLowerCase())
    .find((value) => value === "critical" || value === "high" || value === "medium" || value === "low");
  return normalized || "unknown";
}

function resolveToolFoundryLineageId(record: ToolFoundryProposalBacklogRecord): string {
  return normalizeNonEmptyString(record.provenance.lineageId)
    || `lineage:tool_foundry:${record.provenance.organizationId}`;
}

function resolveToolFoundryThreadId(record: ToolFoundryProposalBacklogRecord): string {
  return normalizeNonEmptyString(record.provenance.threadId)
    || `thread:tool_foundry:${record.proposalKey}`;
}

function resolveToolFoundryCorrelationId(record: ToolFoundryProposalBacklogRecord): string {
  const explicitCorrelationId = normalizeNonEmptyString(
    record.provenance.correlationId,
  );
  if (explicitCorrelationId) {
    return explicitCorrelationId;
  }
  return buildTrustTimelineCorrelationId({
    lineageId: resolveToolFoundryLineageId(record),
    threadId: resolveToolFoundryThreadId(record),
    correlationId: record.provenance.sourceRequestTraceKey,
    surface: "proposal",
    sourceId: record.proposalKey,
  });
}

function resolveToolFoundryWorkflowKey(record: ToolFoundryProposalBacklogRecord): string {
  return normalizeNonEmptyString(record.provenance.workflowKey)
    || "tool_foundry_review";
}

function resolveToolFoundryFrontlineIntakeTrigger(
  record: ToolFoundryProposalBacklogRecord
): string {
  return normalizeNonEmptyString(record.provenance.frontlineIntakeTrigger)
    || "runtime_capability_gap";
}

function resolveToolFoundryBoundaryReason(args: {
  record: ToolFoundryProposalBacklogRecord;
  decisionReason: string;
}): string {
  return normalizeNonEmptyString(args.record.provenance.boundaryReason)
    || normalizeNonEmptyString(args.record.trace.reason)
    || normalizeNonEmptyString(args.record.trace.reasonCode)
    || normalizeNonEmptyString(args.decisionReason)
    || "runtime_boundary_unspecified";
}

function buildToolFoundryLifecycleTrustPayload(args: {
  eventName: ToolFoundryLifecycleEventName;
  record: ToolFoundryProposalBacklogRecord;
  occurredAt: number;
  mode: TrustEventMode;
  actorType: TrustEventActorType;
  actorId: string;
  channel?: string;
  reviewDecision: string;
  decisionReason: string;
}): TrustEventPayload {
  return {
    event_id: `trust:${args.eventName}:${args.record.proposalKey}:${args.occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: args.occurredAt,
    org_id: args.record.organizationId,
    mode: args.mode,
    channel: normalizeNonEmptyString(args.channel)
      || normalizeNonEmptyString(args.record.provenance.channel)
      || "tool_foundry",
    session_id: args.record.provenance.sessionId,
    actor_type: args.actorType,
    actor_id: args.actorId,
    proposal_id: args.record.proposalKey,
    proposal_version: args.record.artifactContractVersion,
    tool_name: args.record.requestedToolName,
    risk_level: resolveToolFoundryRiskLevel(args.record),
    review_decision: args.reviewDecision,
    rollback_target: args.record.rollback.rollbackKey,
    decision_reason: args.decisionReason,
    correlation_id: resolveToolFoundryCorrelationId(args.record),
    lineage_id: resolveToolFoundryLineageId(args.record),
    thread_id: resolveToolFoundryThreadId(args.record),
    workflow_key: resolveToolFoundryWorkflowKey(args.record),
    frontline_intake_trigger: resolveToolFoundryFrontlineIntakeTrigger(args.record),
    boundary_reason: resolveToolFoundryBoundaryReason({
      record: args.record,
      decisionReason: args.decisionReason,
    }),
    event_namespace: `${TRUST_EVENT_NAMESPACE}.tool_foundry`,
  };
}

async function persistToolFoundryLifecycleTrustEvent(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  eventName: ToolFoundryLifecycleEventName;
  payload: TrustEventPayload;
  occurredAt: number;
}): Promise<void> {
  const validation = validateTrustEventPayload(args.eventName, args.payload);
  await args.ctx.db.insert("aiTrustEvents", {
    event_name: args.eventName,
    payload: args.payload,
    schema_validation_status: validation.ok ? "passed" : "failed",
    schema_errors: validation.ok ? undefined : validation.errors,
    created_at: args.occurredAt,
  });
}

export function buildToolSpecProposalTraceKey(args: {
  proposalKey: string;
  sessionId: string;
  reasonCode: string;
  payloadHash?: string;
}): string {
  const proposalToken = toTraceToken(args.proposalKey, "unknown_proposal");
  const sessionToken = toTraceToken(args.sessionId, "unknown_session");
  const reasonToken = toTraceToken(args.reasonCode, "unknown_reason");
  const payloadToken = toTraceToken(args.payloadHash, "no_payload_hash");
  return `trace:${proposalToken}:${sessionToken}:${reasonToken}:${payloadToken}`;
}

export function buildToolSpecProposalBacklogRecord(args: {
  organizationId: Id<"organizations">;
  blockedCapabilityGap: ToolCapabilityGapBlockedPayload;
  sourceTrace: ToolFoundryProposalSourceTrace;
  observedAt?: number;
  now?: number;
}): ToolFoundryProposalBacklogRecord {
  const observedAt = normalizeObservedAt(
    args.observedAt,
    args.blockedCapabilityGap.proposalArtifact.createdAt,
  );
  const now = normalizeObservedAt(args.now, observedAt);
  const proposalArtifact = args.blockedCapabilityGap.proposalArtifact;
  const draft = normalizeToolSpecDraft(proposalArtifact.draft);
  const proposalKey =
    normalizeNonEmptyString(proposalArtifact.proposalKey)
    ?? `toolspec:${draft.suggestedToolName}:${String(args.organizationId)}:${String(args.sourceTrace.sessionId)}`;
  const requestedToolName =
    normalizeNonEmptyString(args.blockedCapabilityGap.missing.requestedToolName)
    ?? normalizeNonEmptyString(proposalArtifact.provenance.requestedToolName)
    ?? draft.suggestedToolName;
  const sourceRequestTraceKey = buildToolSpecProposalTraceKey({
    proposalKey,
    sessionId: String(args.sourceTrace.sessionId),
    reasonCode: args.blockedCapabilityGap.code,
    payloadHash: args.sourceTrace.payloadHash,
  });

  return {
    contractVersion: TOOL_FOUNDRY_PROPOSAL_BACKLOG_CONTRACT_VERSION,
    artifactType: proposalArtifact.artifactType,
    artifactContractVersion: proposalArtifact.contractVersion,
    organizationId: args.organizationId,
    proposalKey,
    stage: "draft",
    status: "pending_review",
    source: "runtime_capability_gap",
    requestedToolName,
    draft,
    trace: {
      reasonCode: args.blockedCapabilityGap.code,
      reason:
        normalizeNonEmptyString(args.blockedCapabilityGap.reason)
        ?? "Requested capability is blocked due to missing trusted runtime contract.",
      missingKinds: normalizeMissingKinds(args.blockedCapabilityGap.missing.missingKinds),
      missingSummary:
        normalizeNonEmptyString(args.blockedCapabilityGap.missing.summary)
        ?? "Missing internal concept/tool/backend contract.",
      unblockingSteps: normalizeOrderedStringList(args.blockedCapabilityGap.unblockingSteps),
    },
    provenance: {
      organizationId:
        normalizeNonEmptyString(proposalArtifact.provenance.organizationId)
        ?? String(args.organizationId),
      agentId:
        normalizeNonEmptyString(proposalArtifact.provenance.agentId)
        ?? String(args.sourceTrace.agentId),
      sessionId:
        normalizeNonEmptyString(proposalArtifact.provenance.sessionId)
        ?? String(args.sourceTrace.sessionId),
      requestedToolName,
      sourceRequestTraceKey,
      turnId: normalizeNonEmptyString(args.sourceTrace.turnId),
      receiptId: normalizeNonEmptyString(args.sourceTrace.receiptId),
      channel: normalizeNonEmptyString(args.sourceTrace.channel),
      externalContactIdentifier: normalizeNonEmptyString(
        args.sourceTrace.externalContactIdentifier,
      ),
      idempotencyScopeKey: normalizeNonEmptyString(args.sourceTrace.idempotencyScopeKey),
      payloadHash: normalizeNonEmptyString(args.sourceTrace.payloadHash),
      queueConcurrencyKey: normalizeNonEmptyString(args.sourceTrace.queueConcurrencyKey),
      workflowKey: normalizeNonEmptyString(args.sourceTrace.workflowKey),
      lineageId: normalizeNonEmptyString(args.sourceTrace.lineageId),
      threadId: normalizeNonEmptyString(args.sourceTrace.threadId),
      correlationId: normalizeNonEmptyString(args.sourceTrace.correlationId),
      frontlineIntakeTrigger: normalizeNonEmptyString(
        args.sourceTrace.frontlineIntakeTrigger,
      ),
      boundaryReason: normalizeNonEmptyString(args.sourceTrace.boundaryReason),
    },
    rollback: {
      rollbackKey: `rollback:${proposalKey}:${toTraceToken(args.blockedCapabilityGap.code, "unknown_reason")}`,
      policy: TOOL_FOUNDRY_PROPOSAL_ROLLBACK_POLICY,
      status: "rollback_ready",
      reasonCode: args.blockedCapabilityGap.code,
    },
    firstObservedAt: observedAt,
    lastObservedAt: observedAt,
    observationCount: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildToolSpecProposalBacklogUpdatePatch(args: {
  existing: ToolFoundryProposalBacklogRecord;
  next: ToolFoundryProposalBacklogRecord;
  now?: number;
}): ToolFoundryProposalBacklogRecord {
  const now = normalizeObservedAt(args.now, args.next.updatedAt);
  const existingObservationCount =
    typeof args.existing.observationCount === "number"
    && Number.isFinite(args.existing.observationCount)
      ? Math.max(1, Math.floor(args.existing.observationCount))
      : 1;
  const existingStatus = isBacklogStatus(args.existing.status)
    ? args.existing.status
    : args.next.status;
  const retainAppliedRollback = isRollbackStatus(args.existing.rollback?.status)
    && args.existing.rollback.status === "rollback_applied";
  const rollback = retainAppliedRollback
    ? {
        ...args.existing.rollback,
        status: "rollback_applied" as const,
      }
    : args.next.rollback;

  return {
    ...args.next,
    stage: args.existing.stage === "draft" ? "draft" : args.next.stage,
    status: existingStatus,
    rollback,
    firstObservedAt: Math.min(args.existing.firstObservedAt, args.next.firstObservedAt),
    lastObservedAt: Math.max(args.existing.lastObservedAt, args.next.lastObservedAt),
    observationCount: existingObservationCount + 1,
    createdAt: args.existing.createdAt,
    updatedAt: now,
  };
}

const toolSpecDraftInputTypeValidator = v.union(
  v.literal("string"),
  v.literal("number"),
  v.literal("boolean"),
  v.literal("object"),
  v.literal("array"),
  v.literal("null"),
  v.literal("unknown"),
);

const capabilityGapMissingKindValidator = v.union(
  v.literal("internal_concept"),
  v.literal("tool_contract"),
  v.literal("backend_contract"),
);

const toolSpecProposalDraftArtifactValidator = v.object({
  artifactType: v.literal("tool_spec_proposal"),
  contractVersion: v.literal("tool_spec_proposal_draft_v1"),
  proposalKey: v.string(),
  createdAt: v.number(),
  stage: v.literal("draft"),
  source: v.literal("runtime_capability_gap"),
  provenance: v.object({
    organizationId: v.string(),
    agentId: v.string(),
    sessionId: v.string(),
    requestedToolName: v.string(),
  }),
  draft: v.object({
    suggestedToolName: v.string(),
    intentSummary: v.string(),
    inputFields: v.array(v.object({
      name: v.string(),
      inferredType: toolSpecDraftInputTypeValidator,
      required: v.boolean(),
    })),
    outputContract: v.literal("tbd_by_foundry_review"),
    requiredCapabilities: v.array(v.string()),
    riskLabels: v.array(v.string()),
    verificationIntent: v.array(v.string()),
  }),
});

const blockedCapabilityGapPayloadValidator = v.object({
  contractVersion: v.literal("tool_foundry_runtime_capability_gap_v1"),
  status: v.literal("blocked"),
  code: v.literal("missing_internal_concept_tool_backend_contract"),
  reason: v.string(),
  missing: v.object({
    requestedToolName: v.string(),
    missingKinds: v.array(capabilityGapMissingKindValidator),
    summary: v.string(),
  }),
  unblockingSteps: v.array(v.string()),
  proposalArtifact: toolSpecProposalDraftArtifactValidator,
});

const proposalSourceTraceValidator = v.object({
  agentId: v.id("objects"),
  sessionId: v.id("agentSessions"),
  turnId: v.optional(v.id("agentTurns")),
  receiptId: v.optional(v.string()),
  channel: v.optional(v.string()),
  externalContactIdentifier: v.optional(v.string()),
  idempotencyScopeKey: v.optional(v.string()),
  payloadHash: v.optional(v.string()),
  queueConcurrencyKey: v.optional(v.string()),
  workflowKey: v.optional(v.string()),
  lineageId: v.optional(v.string()),
  threadId: v.optional(v.string()),
  correlationId: v.optional(v.string()),
  frontlineIntakeTrigger: v.optional(v.string()),
  boundaryReason: v.optional(v.string()),
});

export const persistRuntimeCapabilityGapProposal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    blockedCapabilityGap: blockedCapabilityGapPayloadValidator,
    sourceTrace: proposalSourceTraceValidator,
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const observedAt = normalizeObservedAt(
      args.observedAt,
      args.blockedCapabilityGap.proposalArtifact.createdAt,
    );
    const nextRecord = buildToolSpecProposalBacklogRecord({
      organizationId: args.organizationId,
      blockedCapabilityGap: args.blockedCapabilityGap,
      sourceTrace: args.sourceTrace,
      observedAt,
      now: observedAt,
    });

    const db = ctx.db as any;
    const existing = await db
      .query("toolFoundryProposalBacklog")
      .withIndex("by_org_proposal_key", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("proposalKey", nextRecord.proposalKey))
      .first() as (ToolFoundryProposalBacklogRecord & { _id: unknown }) | null;

    if (existing) {
      const patch = buildToolSpecProposalBacklogUpdatePatch({
        existing,
        next: nextRecord,
        now: observedAt,
      });
      await db.patch(existing._id, patch);
      return {
        status: "updated" as const,
        proposalKey: patch.proposalKey,
        observationCount: patch.observationCount,
        rollbackKey: patch.rollback.rollbackKey,
      };
    }

    const backlogId = await db.insert("toolFoundryProposalBacklog", nextRecord);
    await persistToolFoundryLifecycleTrustEvent({
      ctx,
      eventName: TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES.proposalCreated,
      payload: buildToolFoundryLifecycleTrustPayload({
        eventName: TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES.proposalCreated,
        record: nextRecord,
        occurredAt: observedAt,
        mode: "runtime",
        actorType: "system",
        actorId: "tool_foundry_runtime",
        reviewDecision: "pending",
        decisionReason: "runtime_capability_gap_detected",
      }),
      occurredAt: observedAt,
    });
    await persistToolFoundryLifecycleTrustEvent({
      ctx,
      eventName: TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES.promotionRequested,
      payload: buildToolFoundryLifecycleTrustPayload({
        eventName: TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES.promotionRequested,
        record: nextRecord,
        occurredAt: observedAt,
        mode: "runtime",
        actorType: "system",
        actorId: "tool_foundry_runtime",
        reviewDecision: "requested",
        decisionReason: "queued_for_foundry_review",
      }),
      occurredAt: observedAt,
    });
    return {
      status: "inserted" as const,
      backlogId,
      proposalKey: nextRecord.proposalKey,
      observationCount: nextRecord.observationCount,
      rollbackKey: nextRecord.rollback.rollbackKey,
    };
  },
});

export const attachLinearIssueToProposal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    proposalKey: v.string(),
    issueId: v.string(),
    issueNumber: v.string(),
    issueUrl: v.string(),
    linkedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const existing = await db
      .query("toolFoundryProposalBacklog")
      .withIndex("by_org_proposal_key", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("proposalKey", args.proposalKey))
      .first() as (ToolFoundryProposalBacklogRecord & { _id: unknown }) | null;

    if (!existing) {
      return {
        status: "missing" as const,
        proposalKey: args.proposalKey,
      };
    }

    const now = normalizeObservedAt(args.linkedAt, Date.now());
    const currentLinearIssue = existing.linearIssue;
    const nextLinearIssue: ToolFoundryProposalBacklogLinearIssue = {
      issueId: normalizeNonEmptyString(args.issueId) ?? args.issueId,
      issueNumber: normalizeNonEmptyString(args.issueNumber) ?? args.issueNumber,
      issueUrl: normalizeNonEmptyString(args.issueUrl) ?? args.issueUrl,
      linkedAt: currentLinearIssue?.linkedAt ?? now,
      lastSyncedAt: now,
    };

    await db.patch(existing._id, {
      linearIssue: nextLinearIssue,
      updatedAt: now,
    });

    return {
      status: "updated" as const,
      proposalKey: args.proposalKey,
      linearIssue: nextLinearIssue,
    };
  },
});

export const listPendingProposalsForReview = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const actorContext = await getUserContext(ctx, userId);
    if (!(actorContext.isGlobal && actorContext.roleName === "super_admin")) {
      throw new ConvexError({
        code: "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED",
        message:
          "Tool Foundry proposal review denied: super_admin role required.",
        details: {
          actorUserId: String(userId),
          roleName: actorContext.roleName ?? null,
          isGlobal: actorContext.isGlobal === true,
        },
      });
    }

    const requestedLimit = typeof args.limit === "number" ? Math.floor(args.limit) : 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const rows = await ctx.db
      .query("toolFoundryProposalBacklog")
      .withIndex("by_org_last_observed", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(limit * 2);

    return rows
      .filter((row) => row.status === "pending_review" || row.status === "in_review")
      .slice(0, limit)
      .map((row) => ({
        _id: row._id,
        organizationId: row.organizationId,
        proposalKey: row.proposalKey,
        requestedToolName: row.requestedToolName,
        status: row.status,
        lastObservedAt: row.lastObservedAt,
        sourceRequestTraceKey: row.provenance.sourceRequestTraceKey,
        reasonCode: row.trace.reasonCode,
      }));
  },
});

async function applyPromotionDecision(args: {
  ctx: any;
  organizationId: Id<"organizations">;
  proposalKey: string;
  decision: "granted" | "denied";
  actorType?: "user" | "agent" | "admin" | "system" | "workflow";
  actorId?: string;
  channel?: string;
  reason?: string;
  occurredAt?: number;
}) {
  const db = args.ctx.db as any;
  const existing = await db
    .query("toolFoundryProposalBacklog")
    .withIndex("by_org_proposal_key", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("proposalKey", args.proposalKey))
    .first() as (ToolFoundryProposalBacklogRecord & { _id: unknown }) | null;

  if (!existing) {
    return {
      status: "missing" as const,
      proposalKey: args.proposalKey,
    };
  }

  const occurredAt = normalizeObservedAt(args.occurredAt, Date.now());
  const nextStatus: ToolFoundryProposalBacklogStatus =
    args.decision === "granted" ? "promoted" : "rejected";
  const reviewDecision = args.decision === "granted" ? "approved" : "rejected";
  const eventName =
    args.decision === "granted"
      ? TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES.promotionGranted
      : TOOL_FOUNDRY_LIFECYCLE_EVENT_NAMES.promotionDenied;

  await db.patch(existing._id, {
    status: nextStatus,
    updatedAt: occurredAt,
  });

  const nextRecord: ToolFoundryProposalBacklogRecord = {
    ...existing,
    status: nextStatus,
    updatedAt: occurredAt,
  };
  await persistToolFoundryLifecycleTrustEvent({
    ctx: args.ctx,
    eventName,
    payload: buildToolFoundryLifecycleTrustPayload({
      eventName,
      record: nextRecord,
      occurredAt,
      mode: "agents",
      actorType: args.actorType || "admin",
      actorId: normalizeNonEmptyString(args.actorId) || "tool_foundry_reviewer",
      channel: args.channel,
      reviewDecision,
      decisionReason:
        normalizeNonEmptyString(args.reason)
        || normalizeNonEmptyString(existing.trace.reasonCode)
        || "promotion_decision_recorded",
    }),
    occurredAt,
  });

  return {
    status: "updated" as const,
    proposalKey: args.proposalKey,
    backlogStatus: nextStatus,
    trustEventName: eventName,
  };
}

export const resolveProposalPromotionDecision = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    proposalKey: v.string(),
    decision: v.union(v.literal("granted"), v.literal("denied")),
    actorUserId: v.id("users"),
    actorType: v.optional(v.union(
      v.literal("user"),
      v.literal("agent"),
      v.literal("admin"),
      v.literal("system"),
      v.literal("workflow"),
    )),
    actorId: v.optional(v.string()),
    channel: v.optional(v.string()),
    reason: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actorContext = await getUserContext(ctx, args.actorUserId);
    if (!(actorContext.isGlobal && actorContext.roleName === "super_admin")) {
      throw new ConvexError({
        code: "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED",
        message:
          "Tool Foundry promotion decision denied: super_admin role required.",
        details: {
          actorUserId: String(args.actorUserId),
          roleName: actorContext.roleName ?? null,
          isGlobal: actorContext.isGlobal === true,
        },
      });
    }

    return await applyPromotionDecision({
      ctx,
      organizationId: args.organizationId,
      proposalKey: args.proposalKey,
      decision: args.decision,
      actorType: args.actorType,
      actorId: args.actorId,
      channel: args.channel,
      reason: args.reason,
      occurredAt: args.occurredAt,
    });
  },
});

export const submitProposalPromotionDecision = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    proposalKey: v.string(),
    decision: v.union(v.literal("granted"), v.literal("denied")),
    channel: v.optional(v.string()),
    reason: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const actorContext = await getUserContext(ctx, userId);
    if (!(actorContext.isGlobal && actorContext.roleName === "super_admin")) {
      throw new ConvexError({
        code: "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED",
        message:
          "Tool Foundry promotion decision denied: super_admin role required.",
        details: {
          actorUserId: String(userId),
          roleName: actorContext.roleName ?? null,
          isGlobal: actorContext.isGlobal === true,
        },
      });
    }

    return await applyPromotionDecision({
      ctx,
      organizationId: args.organizationId,
      proposalKey: args.proposalKey,
      decision: args.decision,
      actorType: "admin",
      actorId: String(userId),
      channel: args.channel,
      reason: args.reason,
      occurredAt: args.occurredAt,
    });
  },
});
