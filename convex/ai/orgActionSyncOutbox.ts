import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { normalizeCrmConnectorKey } from "../crmIntegrations";

export const ORG_ACTION_SYNC_OUTBOX_CONTRACT_VERSION =
  "org_action_sync_outbox_v1" as const;

const CRM_SYNC_CANDIDATE_OBJECT_TYPE = "org_crm_sync_candidate" as const;
const CRM_SYNC_CANDIDATE_SUBTYPE = "canonical_projection" as const;
const ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE =
  "org_action_sync_binding_ref" as const;
const ORG_AGENT_ACTIVITY_ACTION_ITEM_LINK_TYPE =
  "org_agent_activity_action_item" as const;
const ORG_AGENT_ACTION_ITEM_SYNC_BINDING_LINK_TYPE =
  "org_agent_action_item_sync_binding" as const;

type OrgActionSyncBindingStatus = "active" | "stale" | "conflict" | "deleted";

type OutboxCandidateRow = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  subtype?: string;
  name: string;
  status: string;
  customProperties?: unknown;
  createdBy?: Id<"users"> | Id<"objects">;
  createdAt: number;
  updatedAt: number;
};

type SyncBindingRow = {
  _id: Id<"orgActionSyncBindings">;
  organizationId: Id<"organizations">;
  canonicalObjectId: Id<"objects">;
  canonicalObjectType: string;
  connectorKey: string;
  externalRecordId: string;
  externalRecordType: string;
  bindingStatus: OrgActionSyncBindingStatus;
  lastSyncedAt?: number;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export type OrgActionSyncDispatchMode =
  | "enqueue_only"
  | "dispatch";

export type OrgActionSyncDispatchStatus =
  | "queued"
  | "succeeded"
  | "failed"
  | "skipped";

export type OrgActionSyncOutboxStatus =
  | "pending"
  | "processing"
  | "synced"
  | "failed";

export type OrgActionSyncBindingWriteMode =
  | "not_written"
  | "insert_new"
  | "update_existing_canonical"
  | "conflict_existing_external";

export interface OrgCrmSyncCandidateEnvelope {
  projectionObjectId: string;
  sourceActivityObjectId?: string;
  targetContactObjectId?: string;
  targetOrganizationObjectId?: string;
  sessionId?: string;
  turnId?: string;
  correlationId?: string;
  targetSystemClasses: string[];
  actionCandidateCount: number;
  checkpointCount: number;
}

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

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeTargetSystemClass(
  value: unknown,
): "platform_internal" | "external_connector" | null {
  if (value === "platform_internal" || value === "external_connector") {
    return value;
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry): entry is string => entry.length > 0);
}

function normalizeFiniteTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 50;
  }
  const normalized = Math.floor(value);
  if (normalized < 1) {
    return 1;
  }
  if (normalized > 200) {
    return 200;
  }
  return normalized;
}

function normalizeAttemptNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
}

function toObjectId(value: unknown): Id<"objects"> | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? (normalized as Id<"objects">) : null;
}

function toOrgActionSyncBindingId(
  value: unknown,
): Id<"orgActionSyncBindings"> | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? (normalized as Id<"orgActionSyncBindings">) : null;
}

function resolveDefaultCanonicalObjectId(
  envelope: OrgCrmSyncCandidateEnvelope,
): Id<"objects"> {
  return (
    toObjectId(envelope.targetContactObjectId)
    || toObjectId(envelope.targetOrganizationObjectId)
    || toObjectId(envelope.projectionObjectId)
    || (envelope.projectionObjectId as Id<"objects">)
  );
}

function resolveActivityProtocolSeverity(
  dispatchStatus: OrgActionSyncDispatchStatus,
): "info" | "warning" {
  return dispatchStatus === "failed" ? "warning" : "info";
}

function resolveOutboxSummary(
  dispatchStatus: OrgActionSyncDispatchStatus,
): string {
  if (dispatchStatus === "succeeded") {
    return "CRM sync dispatch receipt recorded successfully.";
  }
  if (dispatchStatus === "failed") {
    return "CRM sync dispatch receipt recorded with failure.";
  }
  if (dispatchStatus === "queued") {
    return "CRM sync dispatch receipt recorded as queued.";
  }
  return "CRM sync dispatch receipt recorded as skipped.";
}

async function ensureReferenceObject(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  objectType: string;
  name: string;
  createdBy?: Id<"users"> | Id<"objects">;
  description?: string;
  customProperties?: Record<string, unknown>;
}): Promise<Id<"objects">> {
  const existing = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type_name", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("type", args.objectType)
        .eq("name", args.name),
    )
    .first();
  if (existing) {
    return existing._id;
  }

  return await args.ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: args.objectType,
    name: args.name,
    description: args.description,
    status: "linked",
    customProperties: args.customProperties,
    createdBy: args.createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

async function ensureObjectLink(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  fromObjectId: Id<"objects">;
  toObjectId: Id<"objects">;
  linkType: string;
  createdBy?: Id<"users"> | Id<"objects">;
  properties?: Record<string, unknown>;
}) {
  const existing = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q) =>
      q.eq("fromObjectId", args.fromObjectId).eq("linkType", args.linkType),
    )
    .filter((q) => q.eq(q.field("toObjectId"), args.toObjectId))
    .first();
  if (existing) {
    return;
  }

  await args.ctx.db.insert("objectLinks", {
    organizationId: args.organizationId,
    fromObjectId: args.fromObjectId,
    toObjectId: args.toObjectId,
    linkType: args.linkType,
    properties: args.properties,
    createdBy: args.createdBy,
    createdAt: Date.now(),
  });
}

async function resolveActionItemFromSourceActivity(args: {
  ctx: MutationCtx;
  sourceActivityObjectId: Id<"objects">;
}): Promise<Id<"objects"> | null> {
  const link = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q) =>
      q
        .eq("fromObjectId", args.sourceActivityObjectId)
        .eq("linkType", ORG_AGENT_ACTIVITY_ACTION_ITEM_LINK_TYPE),
    )
    .first();
  return link?.toObjectId || null;
}

export function normalizeOrgCrmSyncCandidateEnvelope(
  value: unknown,
): OrgCrmSyncCandidateEnvelope | null {
  const record = asRecord(value);
  const projectionObjectId = normalizeOptionalString(record.projectionObjectId);
  if (!projectionObjectId) {
    return null;
  }

  const actionCandidates = Array.isArray(record.actionCandidates)
    ? record.actionCandidates
    : [];
  const checkpoints = Array.isArray(record.checkpoints)
    ? record.checkpoints
    : [];

  const targetSystemClasses = normalizeStringArray(record.targetSystemClasses);

  return {
    projectionObjectId,
    sourceActivityObjectId:
      normalizeOptionalString(record.sourceActivityObjectId) || undefined,
    targetContactObjectId:
      normalizeOptionalString(record.targetContactObjectId) || undefined,
    targetOrganizationObjectId:
      normalizeOptionalString(record.targetOrganizationObjectId) || undefined,
    sessionId: normalizeOptionalString(record.sessionId) || undefined,
    turnId: normalizeOptionalString(record.turnId) || undefined,
    correlationId: normalizeOptionalString(record.correlationId) || undefined,
    targetSystemClasses,
    actionCandidateCount: actionCandidates.length,
    checkpointCount: checkpoints.length,
  };
}

export function resolveOrgActionSyncDispatchMode(args: {
  externalWritesEnabled: boolean;
  targetSystemClass?: unknown;
}): OrgActionSyncDispatchMode {
  const externalWritesEnabled = normalizeBoolean(args.externalWritesEnabled);
  const targetSystemClass = normalizeTargetSystemClass(args.targetSystemClass);

  if (!externalWritesEnabled || targetSystemClass !== "external_connector") {
    return "enqueue_only";
  }
  return "dispatch";
}

export function resolveOrgActionSyncOutboxStatus(args: {
  dispatchStatus: OrgActionSyncDispatchStatus;
}): OrgActionSyncOutboxStatus {
  if (args.dispatchStatus === "succeeded") {
    return "synced";
  }
  if (args.dispatchStatus === "failed") {
    return "failed";
  }
  if (args.dispatchStatus === "queued") {
    return "processing";
  }
  return "pending";
}

export function resolveOrgActionSyncBindingStatus(args: {
  dispatchStatus: OrgActionSyncDispatchStatus;
  conflictDetected: boolean;
}): OrgActionSyncBindingStatus {
  if (args.conflictDetected) {
    return "conflict";
  }
  if (args.dispatchStatus === "succeeded") {
    return "active";
  }
  if (args.dispatchStatus === "failed" || args.dispatchStatus === "skipped") {
    return "stale";
  }
  return "stale";
}

export function buildOrgActionSyncReceiptIdempotencyKey(args: {
  organizationId: string;
  syncCandidateObjectId: string;
  connectorKey: string;
  attemptNumber: number;
}): string {
  const attemptNumber = normalizeAttemptNumber(args.attemptNumber);
  return [
    "org_action_sync_receipt",
    args.organizationId,
    args.syncCandidateObjectId,
    args.connectorKey,
    String(attemptNumber),
  ].join(":");
}

export function buildOrgActionSyncReceiptCorrelationId(args: {
  organizationId: string;
  syncCandidateObjectId: string;
  attemptNumber: number;
}): string {
  const attemptNumber = normalizeAttemptNumber(args.attemptNumber);
  return [
    "org_action_sync_correlation",
    args.organizationId,
    args.syncCandidateObjectId,
    String(attemptNumber),
  ].join(":");
}

export function resolveOrgActionSyncBindingWriteMode(args: {
  hasExistingCanonicalBinding: boolean;
  hasConflictingExternalBinding: boolean;
}): OrgActionSyncBindingWriteMode {
  if (args.hasConflictingExternalBinding) {
    return "conflict_existing_external";
  }
  if (args.hasExistingCanonicalBinding) {
    return "update_existing_canonical";
  }
  return "insert_new";
}

export const listPendingSyncCandidates = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const rows = await ctx.db
      .query("objects")
      .withIndex("by_org_type_subtype_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", CRM_SYNC_CANDIDATE_OBJECT_TYPE)
          .eq("subtype", CRM_SYNC_CANDIDATE_SUBTYPE)
          .eq("status", "pending"),
      )
      .take(limit);

    return rows
      .map((row) => {
        const envelope = normalizeOrgCrmSyncCandidateEnvelope(row.customProperties);
        if (!envelope) {
          return null;
        }
        const candidateProperties = asRecord(row.customProperties);
        const syncDispatch = asRecord(candidateProperties.syncDispatch);
        const rawPreviousAttemptNumber = syncDispatch.attemptNumber;
        const previousAttemptNumber =
          typeof rawPreviousAttemptNumber === "number"
          && Number.isFinite(rawPreviousAttemptNumber)
          && rawPreviousAttemptNumber > 0
            ? Math.floor(rawPreviousAttemptNumber)
            : 0;
        return {
          syncCandidateObjectId: row._id,
          name: row.name,
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          attemptNumber: previousAttemptNumber + 1,
          envelope,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  },
});

export const recordSyncDispatchReceipt = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    syncCandidateObjectId: v.id("objects"),
    dispatchStatus: v.union(
      v.literal("queued"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    connectorKey: v.string(),
    canonicalObjectId: v.optional(v.id("objects")),
    canonicalObjectType: v.optional(v.string()),
    externalRecordId: v.optional(v.string()),
    externalRecordType: v.optional(v.string()),
    providerAttemptId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    syncedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    attemptNumber: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const syncCandidate = (await ctx.db.get(args.syncCandidateObjectId)) as
      | OutboxCandidateRow
      | null;
    if (!syncCandidate) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sync candidate object not found.",
      });
    }
    if (syncCandidate.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Sync candidate is outside organization scope.",
      });
    }
    if (syncCandidate.type !== CRM_SYNC_CANDIDATE_OBJECT_TYPE) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Object is not a CRM sync candidate.",
      });
    }

    const envelope = normalizeOrgCrmSyncCandidateEnvelope(
      syncCandidate.customProperties,
    );
    if (!envelope) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Sync candidate customProperties do not match contract.",
      });
    }

    const connectorKey = normalizeCrmConnectorKey(args.connectorKey)
      || "unknown_connector";
    const attemptNumber = normalizeAttemptNumber(args.attemptNumber);
    const correlationId =
      normalizeOptionalString(args.correlationId)
      || envelope.correlationId
      || buildOrgActionSyncReceiptCorrelationId({
        organizationId: String(args.organizationId),
        syncCandidateObjectId: String(args.syncCandidateObjectId),
        attemptNumber,
      });
    const idempotencyKey = buildOrgActionSyncReceiptIdempotencyKey({
      organizationId: String(args.organizationId),
      syncCandidateObjectId: String(args.syncCandidateObjectId),
      connectorKey,
      attemptNumber,
    });

    const canonicalObjectId =
      args.canonicalObjectId || resolveDefaultCanonicalObjectId(envelope);
    const canonicalObject = canonicalObjectId
      ? await ctx.db.get(canonicalObjectId)
      : null;
    if (canonicalObject && canonicalObject.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Canonical object is outside organization scope.",
      });
    }

    const canonicalObjectType =
      normalizeOptionalString(args.canonicalObjectType)
      || canonicalObject?.type
      || null;

    const externalRecordId = normalizeOptionalString(args.externalRecordId);
    const externalRecordType = normalizeOptionalString(args.externalRecordType);

    const syncCandidateCustomProperties = asRecord(syncCandidate.customProperties);
    const dispatchMetadata = {
      ...(args.metadata || {}),
      correlationId,
      idempotencyKey,
      connectorKey,
      providerAttemptId: normalizeOptionalString(args.providerAttemptId) || undefined,
      dispatchStatus: args.dispatchStatus,
      lastDispatchAt: now,
      syncCandidateObjectId: String(args.syncCandidateObjectId),
      canonicalObjectId: canonicalObjectId ? String(canonicalObjectId) : undefined,
      canonicalObjectType: canonicalObjectType || undefined,
      externalRecordId: externalRecordId || undefined,
      externalRecordType: externalRecordType || undefined,
      errorMessage: normalizeOptionalString(args.errorMessage) || undefined,
      attemptNumber,
    };

    let bindingId: Id<"orgActionSyncBindings"> | null = null;
    let bindingStatus: OrgActionSyncBindingStatus | null = null;
    let bindingWriteMode: OrgActionSyncBindingWriteMode = "not_written";

    if (
      canonicalObjectId
      && canonicalObjectType
      && externalRecordId
      && externalRecordType
    ) {
      const existingExternalBinding = (await ctx.db
        .query("orgActionSyncBindings")
        .withIndex("by_org_connector_external", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("connectorKey", connectorKey)
            .eq("externalRecordId", externalRecordId),
        )
        .first()) as SyncBindingRow | null;

      const existingCanonicalBindings = (await ctx.db
        .query("orgActionSyncBindings")
        .withIndex("by_org_canonical_object", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("canonicalObjectId", canonicalObjectId),
        )
        .collect()) as SyncBindingRow[];
      const existingCanonicalBinding =
        existingCanonicalBindings.find((row) => row.connectorKey === connectorKey)
        || null;

      const conflictDetected = Boolean(
        existingExternalBinding
        && existingExternalBinding.canonicalObjectId !== canonicalObjectId,
      );

      bindingStatus = resolveOrgActionSyncBindingStatus({
        dispatchStatus: args.dispatchStatus,
        conflictDetected,
      });
      bindingWriteMode = resolveOrgActionSyncBindingWriteMode({
        hasExistingCanonicalBinding: Boolean(existingCanonicalBinding),
        hasConflictingExternalBinding: conflictDetected,
      });

      if (bindingWriteMode === "conflict_existing_external" && existingExternalBinding) {
        const existingMetadata = asRecord(existingExternalBinding.metadata);
        await ctx.db.patch(existingExternalBinding._id, {
          bindingStatus,
          metadata: {
            ...existingMetadata,
            ...dispatchMetadata,
            conflictCanonicalObjectId: String(canonicalObjectId),
          },
          updatedAt: now,
        });
        bindingId = existingExternalBinding._id;
      } else if (
        bindingWriteMode === "update_existing_canonical"
        && existingCanonicalBinding
      ) {
        const existingMetadata = asRecord(existingCanonicalBinding.metadata);
        await ctx.db.patch(existingCanonicalBinding._id, {
          externalRecordId,
          externalRecordType,
          bindingStatus,
          lastSyncedAt:
            normalizeFiniteTimestamp(args.syncedAt)
            || (args.dispatchStatus === "succeeded" ? now : undefined),
          metadata: {
            ...existingMetadata,
            ...dispatchMetadata,
          },
          updatedAt: now,
        });
        bindingId = existingCanonicalBinding._id;
      } else {
        bindingId = await ctx.db.insert("orgActionSyncBindings", {
          organizationId: args.organizationId,
          canonicalObjectId,
          canonicalObjectType,
          connectorKey,
          externalRecordId,
          externalRecordType,
          bindingStatus,
          lastSyncedAt:
            normalizeFiniteTimestamp(args.syncedAt)
            || (args.dispatchStatus === "succeeded" ? now : undefined),
          metadata: dispatchMetadata,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (bindingId) {
      const syncBindingAnchorObjectId = await ensureReferenceObject({
        ctx,
        organizationId: args.organizationId,
        objectType: ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE,
        name: `sync_binding:${String(bindingId)}`,
        createdBy: syncCandidate.createdBy,
        description: "Sync binding reference anchor for org action timeline.",
        customProperties: {
          contractVersion: ORG_ACTION_SYNC_OUTBOX_CONTRACT_VERSION,
          syncBindingId: String(bindingId),
          syncCandidateObjectId: String(args.syncCandidateObjectId),
          connectorKey,
        },
      });

      const sourceActivityObjectId = toObjectId(envelope.sourceActivityObjectId);
      if (sourceActivityObjectId) {
        const actionItemObjectId = await resolveActionItemFromSourceActivity({
          ctx,
          sourceActivityObjectId,
        });
        if (actionItemObjectId) {
          await ensureObjectLink({
            ctx,
            organizationId: args.organizationId,
            fromObjectId: actionItemObjectId,
            toObjectId: syncBindingAnchorObjectId,
            linkType: ORG_AGENT_ACTION_ITEM_SYNC_BINDING_LINK_TYPE,
            createdBy: syncCandidate.createdBy,
            properties: {
              dispatchStatus: args.dispatchStatus,
              syncCandidateObjectId: String(args.syncCandidateObjectId),
              recordedAt: now,
            },
          });

          await ctx.db.insert("objectActions", {
            organizationId: args.organizationId,
            objectId: actionItemObjectId,
            actionType: "org_action_sync_binding_recorded",
            actionData: {
              syncBindingId: String(bindingId),
              syncCandidateObjectId: String(args.syncCandidateObjectId),
              dispatchStatus: args.dispatchStatus,
              connectorKey,
              externalRecordId: externalRecordId || undefined,
              externalRecordType: externalRecordType || undefined,
              correlationId,
              idempotencyKey,
            },
            performedBy: syncCandidate.createdBy,
            performedAt: now,
          });
        }
      }
    }

    const nextCandidateStatus = resolveOrgActionSyncOutboxStatus({
      dispatchStatus: args.dispatchStatus,
    });

    await ctx.db.patch(args.syncCandidateObjectId, {
      status: nextCandidateStatus,
      customProperties: {
        ...syncCandidateCustomProperties,
        syncDispatch: {
          contractVersion: ORG_ACTION_SYNC_OUTBOX_CONTRACT_VERSION,
          dispatchStatus: args.dispatchStatus,
          outboxStatus: nextCandidateStatus,
          connectorKey,
          canonicalObjectId: canonicalObjectId ? String(canonicalObjectId) : undefined,
          canonicalObjectType: canonicalObjectType || undefined,
          externalRecordId: externalRecordId || undefined,
          externalRecordType: externalRecordType || undefined,
          bindingId: bindingId ? String(bindingId) : undefined,
          bindingStatus: bindingStatus || undefined,
          bindingWriteMode,
          correlationId,
          idempotencyKey,
          providerAttemptId: normalizeOptionalString(args.providerAttemptId) || undefined,
          sessionId:
            normalizeOptionalString(args.sessionId)
            || envelope.sessionId
            || undefined,
          turnId: envelope.turnId || undefined,
          syncedAt: normalizeFiniteTimestamp(args.syncedAt) || undefined,
          errorMessage: normalizeOptionalString(args.errorMessage) || undefined,
          attemptNumber,
          updatedAt: now,
        },
      },
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.syncCandidateObjectId,
      actionType: "org_crm_sync_dispatch_receipt_recorded",
      actionData: {
        dispatchStatus: args.dispatchStatus,
        outboxStatus: nextCandidateStatus,
        connectorKey,
        bindingId: bindingId ? String(bindingId) : undefined,
        bindingWriteMode,
        correlationId,
        idempotencyKey,
        providerAttemptId: normalizeOptionalString(args.providerAttemptId) || undefined,
        canonicalObjectId: canonicalObjectId ? String(canonicalObjectId) : undefined,
        externalRecordId: externalRecordId || undefined,
        errorMessage: normalizeOptionalString(args.errorMessage) || undefined,
        attemptNumber,
      },
      performedBy: syncCandidate.createdBy,
      performedAt: now,
    });

    try {
      await ctx.runMutation(getInternal().activityProtocol.logEvent, {
        organizationId: args.organizationId,
        applicationId: canonicalObjectId || args.syncCandidateObjectId,
        eventType: "org_crm_sync_dispatch_receipt",
        severity: resolveActivityProtocolSeverity(args.dispatchStatus),
        category: "sync",
        summary: resolveOutboxSummary(args.dispatchStatus),
        details: {
          objectType: CRM_SYNC_CANDIDATE_OBJECT_TYPE,
          objectId: args.syncCandidateObjectId,
          inputSummary: `candidate:${String(args.syncCandidateObjectId)}`,
          outputSummary: bindingId
            ? `binding:${String(bindingId)}:${bindingWriteMode}`
            : `dispatch:${args.dispatchStatus}`,
          syncDirection: "push",
          errorMessage: normalizeOptionalString(args.errorMessage) || undefined,
          correlationId,
          idempotencyKey,
          idempotencyScopeKey: `org_action_sync:${String(args.syncCandidateObjectId)}:${connectorKey}`,
          sessionId:
            normalizeOptionalString(args.sessionId)
            || envelope.sessionId
            || undefined,
          turnId: envelope.turnId || undefined,
          receiptId: String(args.syncCandidateObjectId),
          retryAttempt: attemptNumber,
          retryCount: Math.max(0, attemptNumber - 1),
          workflowStage: "downstream_sync",
          activityKind:
            args.dispatchStatus === "succeeded"
              ? "external_sync_succeeded"
              : "external_sync_failed",
          syncBindingId: bindingId ? String(bindingId) : undefined,
          syncCandidateObjectId: String(args.syncCandidateObjectId),
          dispatchStatus: args.dispatchStatus,
        },
      });
    } catch (error) {
      console.warn("[OrgActionSyncOutbox] Failed to log sync dispatch receipt telemetry", {
        organizationId: args.organizationId,
        syncCandidateObjectId: args.syncCandidateObjectId,
        dispatchStatus: args.dispatchStatus,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      syncCandidateObjectId: args.syncCandidateObjectId,
      outboxStatus: nextCandidateStatus,
      bindingId,
      bindingStatus,
      bindingWriteMode,
      correlationId,
      idempotencyKey,
      attemptNumber,
    };
  },
});

export const getSyncBinding = internalQuery({
  args: {
    syncBindingId: v.id("orgActionSyncBindings"),
  },
  handler: async (ctx, args) => {
    const syncBinding = await ctx.db.get(args.syncBindingId);
    return syncBinding || null;
  },
});

export const getSyncBindingByAnchor = internalQuery({
  args: {
    anchorObjectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const anchorObject = (await ctx.db.get(args.anchorObjectId)) as
      | OutboxCandidateRow
      | null;
    if (!anchorObject || anchorObject.type !== ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE) {
      return null;
    }
    const anchorProperties = asRecord(anchorObject.customProperties);
    const syncBindingId = toOrgActionSyncBindingId(anchorProperties.syncBindingId);
    if (!syncBindingId) {
      return null;
    }
    return await ctx.db.get(syncBindingId);
  },
});
