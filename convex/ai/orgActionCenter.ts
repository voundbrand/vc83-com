import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  ORG_AGENT_ACTION_ITEM_OBJECT_TYPE,
  ORG_AGENT_ACTION_ITEM_STATUS_VALUES,
  type OrgAgentActionItemStatus,
} from "../schemas/orgAgentActionRuntimeSchemas";
import {
  checkPermission,
  getUserContext,
  requireAuthenticatedUser,
} from "../rbacHelpers";
import { resolveOrgActionApprovalTransition } from "./orgAgentActionItems";
import {
  buildOrgActionApprovalCorrelationId,
  buildOrgActionApprovalIdempotencyKey,
  buildOrgActionExecutionReceiptIdempotencyKey,
  buildOrgActionReceiptCorrelationId,
} from "./orgActionExecution";

function getInternal(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("../_generated/api").internal;
}

const DEFAULT_DATASET_VERSION = "agp_v1";

const PIPELINE_STATE_VALUES = [
  "pending",
  "assigned",
  "approved",
  "executing",
  "failed",
  "completed",
] as const;

const ORG_AGENT_ACTIVITY_SOURCE_SESSION_LINK_TYPE =
  "org_agent_activity_source_session";
const ORG_AGENT_ACTIVITY_ACTION_ITEM_LINK_TYPE = "org_agent_activity_action_item";
const ORG_AGENT_ACTION_ITEM_SOURCE_ACTIVITY_LINK_TYPE =
  "org_agent_action_item_source_activity";
const ORG_AGENT_ACTION_ITEM_SYNC_BINDING_LINK_TYPE =
  "org_agent_action_item_sync_binding";
const ORG_AGENT_SESSION_ANCHOR_OBJECT_TYPE = "org_agent_session_ref";
const ORG_AGENT_ACTIVITY_OBJECT_TYPE = "org_agent_activity";
const ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE =
  "org_action_sync_binding_ref";
const ORG_ACTION_ITEM_STATE_CHANGED_ACTION_TYPE = "org_action_item_state_changed";
const ORG_ACTION_EXECUTION_RECEIPT_RECORDED_ACTION_TYPE =
  "org_action_execution_receipt_recorded";
const ORG_ACTION_SYNC_BINDING_RECORDED_ACTION_TYPE =
  "org_action_sync_binding_recorded";
const ORG_ACTION_POLICY_SNAPSHOT_RECORDED_ACTION_TYPE =
  "org_action_policy_snapshot_recorded";

const TIMELINE_EVENT_STREAM_VALUES = [
  "immutable_activity",
  "workflow_state_checkpoint",
  "execution_receipt",
  "policy_decision",
  "sync_event",
] as const;

type PipelineState = (typeof PIPELINE_STATE_VALUES)[number];
type TimelineEventStream = (typeof TIMELINE_EVENT_STREAM_VALUES)[number];

type CatalogEntryRow = {
  datasetVersion: string;
  catalogAgentNumber: number;
  name: string;
  runtimeStatus: string;
  catalogStatus?: string;
  published?: boolean;
};

type SeedRegistryRow = {
  datasetVersion: string;
  catalogAgentNumber: number;
  systemTemplateAgentId?: Id<"objects">;
};

type OntologyObjectRow = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  name: string;
  description?: string;
  subtype?: string;
  status: string;
  customProperties?: unknown;
  createdAt: number;
  updatedAt: number;
};

type ObjectLinkRow = {
  fromObjectId: Id<"objects">;
  toObjectId: Id<"objects">;
  linkType: string;
};

type ActionPolicySnapshotRow = {
  _id: Id<"orgActionPolicySnapshots">;
  actionItemObjectId: Id<"objects">;
  decision: string;
  riskLevel: string;
  actionFamily: string;
  resolvedAt: number;
  snapshot?: unknown;
};

type ActionExecutionReceiptRow = {
  _id: Id<"orgActionExecutionReceipts">;
  actionItemObjectId: Id<"objects">;
  sessionId?: Id<"agentSessions">;
  executionStatus: string;
  attemptNumber: number;
  correlationId: string;
  idempotencyKey: string;
  providerKey?: string;
  receiptPayload?: unknown;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
};

type ObjectActionRow = {
  _id: Id<"objectActions">;
  objectId: Id<"objects">;
  actionType: string;
  actionData?: unknown;
  performedAt: number;
};

type ActionSyncBindingRow = {
  _id: Id<"orgActionSyncBindings">;
  canonicalObjectId: Id<"objects">;
  connectorKey: string;
  externalRecordId: string;
  externalRecordType: string;
  bindingStatus: string;
  lastSyncedAt?: number;
  updatedAt: number;
  metadata?: unknown;
};

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

function normalizeToken(value: unknown): string {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : "";
}

function normalizeDatasetVersion(value: unknown): string {
  return normalizeOptionalString(value) || DEFAULT_DATASET_VERSION;
}

function normalizeStatus(value: string): string {
  const normalized = normalizeToken(value);
  if (
    (ORG_AGENT_ACTION_ITEM_STATUS_VALUES as readonly string[]).includes(normalized)
  ) {
    return normalized;
  }
  return "pending_review";
}

function normalizeCatalogAgentNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    return normalized >= 0 ? normalized : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed >= 0 ? parsed : null;
    }
  }
  return null;
}

function resolvePipelineState(status: string): PipelineState {
  if (status === "pending_review") {
    return "pending";
  }
  if (status === "assigned") {
    return "assigned";
  }
  if (status === "approved") {
    return "approved";
  }
  if (status === "executing") {
    return "executing";
  }
  if (status === "completed") {
    return "completed";
  }
  return "failed";
}

function inferLegacyPublishedState(entry: CatalogEntryRow): boolean {
  const runtimeStatus = normalizeToken(entry.runtimeStatus);
  const catalogStatus = normalizeToken(entry.catalogStatus || "done");
  return runtimeStatus === "live" && catalogStatus === "done";
}

function isPublishedCatalogEntry(entry: CatalogEntryRow): boolean {
  if (typeof entry.published === "boolean") {
    return entry.published;
  }
  return inferLegacyPublishedState(entry);
}

function resolveObjectIdString(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized : null;
}

function readActionItemCatalogAgentNumber(
  customProperties: Record<string, unknown>,
): number | null {
  const candidates: unknown[] = [
    customProperties.catalogAgentNumber,
    customProperties.catalog_agent_number,
    customProperties.templateCatalogAgentNumber,
    customProperties.template_catalog_agent_number,
    customProperties.agentCatalogNumber,
    customProperties.agent_catalog_number,
  ];

  for (const candidate of candidates) {
    const value = normalizeCatalogAgentNumber(candidate);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function readActionItemTemplateAgentId(
  customProperties: Record<string, unknown>,
): string | null {
  const candidates: unknown[] = [
    customProperties.templateAgentId,
    customProperties.template_agent_id,
    customProperties.sourceTemplateId,
    customProperties.source_template_id,
  ];
  for (const candidate of candidates) {
    const value = resolveObjectIdString(candidate);
    if (value) {
      return value;
    }
  }
  return null;
}

function readActionItemAgentId(
  customProperties: Record<string, unknown>,
): string | null {
  const candidates: unknown[] = [
    customProperties.agentId,
    customProperties.agent_id,
    customProperties.assignedAgentId,
    customProperties.assigned_agent_id,
    customProperties.instanceAgentId,
    customProperties.instance_agent_id,
  ];
  for (const candidate of candidates) {
    const value = resolveObjectIdString(candidate);
    if (value) {
      return value;
    }
  }
  return null;
}

function readActionItemSummary(
  row: OntologyObjectRow,
  customProperties: Record<string, unknown>,
): string | null {
  const candidates: unknown[] = [
    customProperties.summary,
    customProperties.intentSummary,
    customProperties.outcomeSummary,
    customProperties.reason,
    customProperties.errorMessage,
    row.description,
  ];
  for (const candidate of candidates) {
    const value = normalizeOptionalString(candidate);
    if (value) {
      return value;
    }
  }
  return null;
}

function readActionFamily(
  row: OntologyObjectRow,
  customProperties: Record<string, unknown>,
): string {
  const candidates: unknown[] = [
    customProperties.actionFamily,
    customProperties.actionType,
    customProperties.intentType,
    row.subtype,
  ];
  for (const candidate of candidates) {
    const value = normalizeOptionalString(candidate);
    if (value) {
      return value;
    }
  }
  return "general";
}

function readTakeoverContext(customProperties: Record<string, unknown>): {
  required: boolean;
  reason: string | null;
  escalatedAt: number | null;
} {
  const required =
    customProperties.requiresTakeover === true ||
    customProperties.requiresHumanTakeover === true ||
    customProperties.humanTakeoverRequired === true;
  const reason =
    normalizeOptionalString(customProperties.takeoverReason) ||
    normalizeOptionalString(customProperties.escalationReason) ||
    normalizeOptionalString(customProperties.takeoverContext) ||
    null;
  const escalatedAt =
    typeof customProperties.escalatedAt === "number"
      ? customProperties.escalatedAt
      : typeof customProperties.takeoverRequestedAt === "number"
        ? customProperties.takeoverRequestedAt
        : null;
  return {
    required,
    reason,
    escalatedAt,
  };
}

function normalizeFiniteTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function normalizeTimelineLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 120;
  }
  const normalized = Math.floor(value);
  if (normalized < 20) {
    return 20;
  }
  if (normalized > 400) {
    return 400;
  }
  return normalized;
}

function humanizeToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function resolveActionItemObjectIdFromActivity(
  activityRow: OntologyObjectRow,
): string | null {
  const customProperties = asRecord(activityRow.customProperties);
  const artifactRefs = asRecord(customProperties.artifactRefs);
  return (
    resolveObjectIdString(artifactRefs.actionItemObjectId)
    || resolveObjectIdString(customProperties.actionItemObjectId)
    || resolveObjectIdString(customProperties.sourceActionItemId)
    || null
  );
}

function resolveActivitySummary(activityRow: OntologyObjectRow): string {
  const customProperties = asRecord(activityRow.customProperties);
  const outcomeEnvelope = asRecord(customProperties.outcomeEnvelope);
  const summary =
    normalizeOptionalString(activityRow.description)
    || normalizeOptionalString(customProperties.summary)
    || normalizeOptionalString(outcomeEnvelope.summary);
  if (summary) {
    return summary;
  }
  const activityKind =
    normalizeOptionalString(customProperties.activityKind)
    || normalizeOptionalString(activityRow.subtype)
    || "session_outcome_captured";
  return `Activity recorded: ${humanizeToken(activityKind)}.`;
}

function resolveActivityCapturedAt(activityRow: OntologyObjectRow): number {
  const customProperties = asRecord(activityRow.customProperties);
  return (
    normalizeFiniteTimestamp(customProperties.capturedAt)
    || normalizeFiniteTimestamp(activityRow.updatedAt)
    || activityRow.createdAt
  );
}

function readActionItemSessionId(
  actionItemRow: OntologyObjectRow | null,
): string | null {
  if (!actionItemRow) {
    return null;
  }
  const customProperties = asRecord(actionItemRow.customProperties);
  return (
    normalizeOptionalString(customProperties.sessionId)
    || normalizeOptionalString(customProperties.sourceSessionId)
    || null
  );
}

function resolveTimelineSortKey(args: {
  occurredAt: number;
  eventId: string;
}): string {
  return `${String(args.occurredAt).padStart(20, "0")}:${args.eventId}`;
}

type OrgActivityTimelineEvent = {
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
};

type ActionCenterTransition =
  | "approve"
  | "assign"
  | "complete"
  | "retry"
  | "takeover";

function resolveActionItemTransition(args: {
  currentStatus: OrgAgentActionItemStatus;
  transition: ActionCenterTransition;
}): {
  allowed: boolean;
  nextStatus: OrgAgentActionItemStatus;
  reasonCode: string;
} {
  if (
    args.transition === "approve" ||
    args.transition === "assign" ||
    args.transition === "takeover"
  ) {
    const approvalTransition = resolveOrgActionApprovalTransition({
      currentStatus: args.currentStatus,
      event:
        args.transition === "takeover"
          ? "take_over"
          : args.transition,
    });
    return {
      allowed: approvalTransition.allowed,
      nextStatus: approvalTransition.nextStatus,
      reasonCode: approvalTransition.reasonCode,
    };
  }

  if (args.transition === "complete") {
    if (
      args.currentStatus === "approved" ||
      args.currentStatus === "assigned" ||
      args.currentStatus === "executing"
    ) {
      return {
        allowed: true,
        nextStatus: "completed",
        reasonCode: "completed",
      };
    }
    return {
      allowed: false,
      nextStatus: args.currentStatus,
      reasonCode: "complete_requires_active_execution_state",
    };
  }

  if (args.currentStatus === "failed" || args.currentStatus === "cancelled") {
    return {
      allowed: true,
      nextStatus: "approved",
      reasonCode: "retried",
    };
  }
  return {
    allowed: false,
    nextStatus: args.currentStatus,
    reasonCode: "retry_requires_failed_or_cancelled",
  };
}

async function requireActionCenterAccess(
  ctx: QueryCtx | MutationCtx,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  },
): Promise<{
  organizationId: Id<"organizations">;
}> {
  const auth = await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId ?? auth.organizationId;
  const userContext = await getUserContext(ctx, auth.userId, organizationId);
  const isSuperAdmin =
    userContext.isGlobal && userContext.roleName === "super_admin";

  if (!isSuperAdmin) {
    const canManageOrganization = await checkPermission(
      ctx,
      auth.userId,
      "manage_organization",
      organizationId,
    );
    if (!canManageOrganization) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message:
          "Org Action Center requires manage_organization permission.",
      });
    }
  }

  return { organizationId };
}

export const getActionCenterView = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.optional(v.number()),
    scopedAgentId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const access = await requireActionCenterAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const dbAny = ctx.db as any;

    const [rawActionItems, rawAssigneeLinks, rawAgents, rawCatalogEntries, rawSeedRows] =
      await Promise.all([
        dbAny
          .query("objects")
          .withIndex("by_org_type", (q: any) =>
            q
              .eq("organizationId", access.organizationId)
              .eq("type", ORG_AGENT_ACTION_ITEM_OBJECT_TYPE),
          )
          .collect() as Promise<OntologyObjectRow[]>,
        dbAny
          .query("objectLinks")
          .withIndex("by_org_link_type", (q: any) =>
            q
              .eq("organizationId", access.organizationId)
              .eq("linkType", "org_agent_action_item_assignee"),
          )
          .collect() as Promise<ObjectLinkRow[]>,
        dbAny
          .query("objects")
          .withIndex("by_org_type", (q: any) =>
            q.eq("organizationId", access.organizationId).eq("type", "org_agent"),
          )
          .collect() as Promise<OntologyObjectRow[]>,
        dbAny
          .query("agentCatalogEntries")
          .withIndex("by_dataset_agent", (q: any) =>
            q.eq("datasetVersion", datasetVersion),
          )
          .collect() as Promise<CatalogEntryRow[]>,
        dbAny
          .query("agentCatalogSeedRegistry")
          .withIndex("by_dataset_agent", (q: any) =>
            q.eq("datasetVersion", datasetVersion),
          )
          .collect() as Promise<SeedRegistryRow[]>,
      ]);

    const publishedCatalogEntries = rawCatalogEntries
      .filter((entry) => isPublishedCatalogEntry(entry))
      .sort((a, b) => a.catalogAgentNumber - b.catalogAgentNumber);

    const catalogLabelByNumber = new Map<number, string>();
    for (const entry of publishedCatalogEntries) {
      catalogLabelByNumber.set(
        entry.catalogAgentNumber,
        `#${entry.catalogAgentNumber} ${entry.name}`,
      );
    }

    const templateIdToCatalogNumber = new Map<string, number>();
    for (const seed of rawSeedRows) {
      if (!catalogLabelByNumber.has(seed.catalogAgentNumber)) {
        continue;
      }
      if (seed.systemTemplateAgentId) {
        templateIdToCatalogNumber.set(
          String(seed.systemTemplateAgentId),
          seed.catalogAgentNumber,
        );
      }
    }

    const assigneeByActionItem = new Map<string, string>();
    for (const link of rawAssigneeLinks) {
      assigneeByActionItem.set(
        String(link.fromObjectId),
        String(link.toObjectId),
      );
    }

    const agentTemplateById = new Map<string, string | null>();
    const agentCatalogById = new Map<string, number | null>();
    for (const agent of rawAgents) {
      const customProperties = asRecord(agent.customProperties);
      const templateAgentId =
        resolveObjectIdString(customProperties.templateAgentId) ||
        resolveObjectIdString(customProperties.sourceTemplateId) ||
        null;
      const catalogAgentNumber =
        normalizeCatalogAgentNumber(customProperties.catalogAgentNumber) ??
        normalizeCatalogAgentNumber(customProperties.templateCatalogAgentNumber) ??
        (templateAgentId
          ? templateIdToCatalogNumber.get(templateAgentId) ?? null
          : null);

      agentTemplateById.set(String(agent._id), templateAgentId);
      agentCatalogById.set(String(agent._id), catalogAgentNumber);
    }

    const scopedAgentId = args.scopedAgentId ? String(args.scopedAgentId) : null;
    const scopedTemplateAgentId = scopedAgentId
      ? agentTemplateById.get(scopedAgentId) ?? null
      : null;
    const scopedCatalogAgentNumber = scopedAgentId
      ? agentCatalogById.get(scopedAgentId) ?? null
      : null;

    const filteredItems = rawActionItems
      .map((row) => {
        const customProperties = asRecord(row.customProperties);
        const status = normalizeStatus(row.status);
        const pipelineState = resolvePipelineState(status);
        const linkedAssignee = assigneeByActionItem.get(String(row._id)) || null;
        const directAgentId = readActionItemAgentId(customProperties);
        const agentObjectId = linkedAssignee || directAgentId;
        const directCatalogAgentNumber =
          readActionItemCatalogAgentNumber(customProperties);
        const directTemplateAgentId =
          readActionItemTemplateAgentId(customProperties);
        const resolvedTemplateAgentId =
          directTemplateAgentId ||
          (agentObjectId ? agentTemplateById.get(agentObjectId) ?? null : null);
        let resolvedCatalogAgentNumber = directCatalogAgentNumber;
        if (resolvedCatalogAgentNumber === null && agentObjectId) {
          resolvedCatalogAgentNumber = agentCatalogById.get(agentObjectId) ?? null;
        }
        if (resolvedCatalogAgentNumber === null && resolvedTemplateAgentId) {
          resolvedCatalogAgentNumber =
            templateIdToCatalogNumber.get(resolvedTemplateAgentId) ?? null;
        }

        return {
          _id: row._id,
          title: row.name,
          summary: readActionItemSummary(row, customProperties),
          status,
          pipelineState,
          actionFamily: readActionFamily(row, customProperties),
          catalogAgentNumber: resolvedCatalogAgentNumber,
          catalogLabel:
            resolvedCatalogAgentNumber !== null
              ? catalogLabelByNumber.get(resolvedCatalogAgentNumber) || null
              : null,
          agentObjectId,
          templateAgentId: resolvedTemplateAgentId,
          sourceSessionId:
            normalizeOptionalString(customProperties.sessionId) ||
            normalizeOptionalString(customProperties.sourceSessionId),
          sourceTurnId:
            normalizeOptionalString(customProperties.turnId) ||
            normalizeOptionalString(customProperties.sourceTurnId),
          channel: normalizeOptionalString(customProperties.channel),
          takeover: readTakeoverContext(customProperties),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      })
      .filter((item) => {
        if (
          typeof args.catalogAgentNumber === "number" &&
          item.catalogAgentNumber !== Math.floor(args.catalogAgentNumber)
        ) {
          return false;
        }

        if (!scopedAgentId) {
          return true;
        }

        if (item.agentObjectId === scopedAgentId) {
          return true;
        }

        if (
          scopedTemplateAgentId &&
          item.templateAgentId &&
          item.templateAgentId === scopedTemplateAgentId
        ) {
          return true;
        }

        if (
          scopedCatalogAgentNumber !== null &&
          item.catalogAgentNumber !== null &&
          item.catalogAgentNumber === scopedCatalogAgentNumber
        ) {
          return true;
        }

        return false;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const itemsWithContext = await Promise.all(
      filteredItems.map(async (item) => {
        const [rawPolicySnapshots, rawReceipts] = await Promise.all([
          dbAny
            .query("orgActionPolicySnapshots")
            .withIndex("by_org_action_item", (q: any) =>
              q
                .eq("organizationId", access.organizationId)
                .eq("actionItemObjectId", item._id),
            )
            .collect() as Promise<ActionPolicySnapshotRow[]>,
          dbAny
            .query("orgActionExecutionReceipts")
            .withIndex("by_org_action_item", (q: any) =>
              q
                .eq("organizationId", access.organizationId)
                .eq("actionItemObjectId", item._id),
            )
            .collect() as Promise<ActionExecutionReceiptRow[]>,
        ]);

        const latestPolicySnapshot =
          [...rawPolicySnapshots].sort(
            (left, right) => right.resolvedAt - left.resolvedAt,
          )[0] || null;
        const latestReceipt =
          [...rawReceipts].sort(
            (left, right) => right.attemptNumber - left.attemptNumber,
          )[0] || null;

        const transitionCandidates: ActionCenterTransition[] = [
          "approve",
          "assign",
          "complete",
          "retry",
          "takeover",
        ];
        const availableTransitions: ActionCenterTransition[] =
          transitionCandidates.filter((transition): transition is ActionCenterTransition =>
          resolveActionItemTransition({
            currentStatus: item.status as OrgAgentActionItemStatus,
            transition,
          }).allowed,
          );

        return {
          ...item,
          policySnapshot: latestPolicySnapshot
            ? {
                policySnapshotId: latestPolicySnapshot._id,
                decision: latestPolicySnapshot.decision,
                riskLevel: latestPolicySnapshot.riskLevel,
                actionFamily: latestPolicySnapshot.actionFamily,
                resolvedAt: latestPolicySnapshot.resolvedAt,
              }
            : null,
          latestReceipt: latestReceipt
            ? {
                receiptId: latestReceipt._id,
                executionStatus: latestReceipt.executionStatus,
                attemptNumber: latestReceipt.attemptNumber,
                correlationId: latestReceipt.correlationId,
                idempotencyKey: latestReceipt.idempotencyKey,
                errorMessage: latestReceipt.errorMessage || null,
                startedAt: latestReceipt.startedAt || null,
                completedAt: latestReceipt.completedAt || null,
                updatedAt: latestReceipt.updatedAt,
              }
            : null,
          availableTransitions,
        };
      }),
    );

    const totalsByPipelineState: Record<PipelineState, number> = {
      pending: 0,
      assigned: 0,
      approved: 0,
      executing: 0,
      failed: 0,
      completed: 0,
    };
    for (const item of itemsWithContext) {
      totalsByPipelineState[item.pipelineState] += 1;
    }

    const agentFilters = publishedCatalogEntries.map((entry) => ({
      catalogAgentNumber: entry.catalogAgentNumber,
      label:
        catalogLabelByNumber.get(entry.catalogAgentNumber) ||
        `#${entry.catalogAgentNumber}`,
    }));

    return {
      datasetVersion,
      organizationId: access.organizationId,
      pipelineStates: [...PIPELINE_STATE_VALUES],
      totalsByPipelineState,
      agentFilters,
      items: itemsWithContext,
      total: itemsWithContext.length,
    };
  },
});

export const getActivityTimeline = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    actionItemId: v.optional(v.id("objects")),
    sourceSessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requestedSessionId = normalizeOptionalString(args.sourceSessionId);
    if (!args.actionItemId && !requestedSessionId) {
      return {
        organizationId: null,
        sourceSessionId: null,
        streams: [...TIMELINE_EVENT_STREAM_VALUES],
        mutableState: null,
        events: [],
        total: 0,
      };
    }

    const access = await requireActionCenterAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    const timelineLimit = normalizeTimelineLimit(args.limit);
    const dbAny = ctx.db as any;

    let actionItemRow: OntologyObjectRow | null = null;
    if (args.actionItemId) {
      const loadedActionItem = (await ctx.db.get(args.actionItemId)) as
        | OntologyObjectRow
        | null;
      if (!loadedActionItem) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Action item not found for timeline query.",
        });
      }
      if (
        loadedActionItem.organizationId !== access.organizationId
        || loadedActionItem.type !== ORG_AGENT_ACTION_ITEM_OBJECT_TYPE
      ) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Action item is outside org scope or invalid type.",
        });
      }
      actionItemRow = loadedActionItem;
    }

    const effectiveSourceSessionId =
      requestedSessionId || readActionItemSessionId(actionItemRow);
    const activityObjectIds = new Set<Id<"objects">>();
    const actionItemIds = new Set<Id<"objects">>();
    if (actionItemRow) {
      actionItemIds.add(actionItemRow._id);
    }

    if (args.actionItemId) {
      const [directActivityLinks, reverseActivityLinks] = await Promise.all([
        dbAny
          .query("objectLinks")
          .withIndex("by_to_link_type", (q: any) =>
            q
              .eq("toObjectId", args.actionItemId)
              .eq("linkType", ORG_AGENT_ACTIVITY_ACTION_ITEM_LINK_TYPE),
          )
          .collect() as Promise<ObjectLinkRow[]>,
        dbAny
          .query("objectLinks")
          .withIndex("by_from_link_type", (q: any) =>
            q
              .eq("fromObjectId", args.actionItemId)
              .eq("linkType", ORG_AGENT_ACTION_ITEM_SOURCE_ACTIVITY_LINK_TYPE),
          )
          .collect() as Promise<ObjectLinkRow[]>,
      ]);
      for (const link of directActivityLinks) {
        activityObjectIds.add(link.fromObjectId);
      }
      for (const link of reverseActivityLinks) {
        activityObjectIds.add(link.toObjectId);
      }
    }

    if (effectiveSourceSessionId) {
      const sessionAnchor = (await dbAny
        .query("objects")
        .withIndex("by_org_type_name", (q: any) =>
          q
            .eq("organizationId", access.organizationId)
            .eq("type", ORG_AGENT_SESSION_ANCHOR_OBJECT_TYPE)
            .eq("name", `session:${effectiveSourceSessionId}`),
        )
        .first()) as OntologyObjectRow | null;
      if (sessionAnchor) {
        const sessionLinks = await dbAny
          .query("objectLinks")
          .withIndex("by_to_link_type", (q: any) =>
            q
              .eq("toObjectId", sessionAnchor._id)
              .eq("linkType", ORG_AGENT_ACTIVITY_SOURCE_SESSION_LINK_TYPE),
          )
          .collect() as ObjectLinkRow[];
        for (const link of sessionLinks) {
          activityObjectIds.add(link.fromObjectId);
        }
      }
    }

    const rawActivityRows = await Promise.all(
      Array.from(activityObjectIds).map((activityObjectId) =>
        ctx.db.get(activityObjectId),
      ),
    );
    const activityRows = rawActivityRows.filter((row) =>
      Boolean(
        row
        && row.organizationId === access.organizationId
        && row.type === ORG_AGENT_ACTIVITY_OBJECT_TYPE,
      ),
    ) as OntologyObjectRow[];

    for (const activityRow of activityRows) {
      const linkedActionItemId = resolveActionItemObjectIdFromActivity(activityRow);
      if (linkedActionItemId) {
        actionItemIds.add(linkedActionItemId as Id<"objects">);
      }
    }

    const rawActionItemRows = await Promise.all(
      Array.from(actionItemIds).map((actionItemId) => ctx.db.get(actionItemId)),
    );
    const actionItemRows = rawActionItemRows.filter((row) =>
      Boolean(
        row
        && row.organizationId === access.organizationId
        && row.type === ORG_AGENT_ACTION_ITEM_OBJECT_TYPE,
      ),
    ) as OntologyObjectRow[];
    const actionItemRowById = new Map<string, OntologyObjectRow>();
    for (const row of actionItemRows) {
      actionItemRowById.set(String(row._id), row);
    }

    const timelineEvents: OrgActivityTimelineEvent[] = [];

    for (const activityRow of activityRows) {
      const customProperties = asRecord(activityRow.customProperties);
      const activityKind =
        normalizeOptionalString(customProperties.activityKind)
        || normalizeOptionalString(activityRow.subtype)
        || "session_outcome_captured";
      const activitySessionId =
        normalizeOptionalString(customProperties.sessionId)
        || effectiveSourceSessionId
        || null;
      const activityActionItemId = resolveActionItemObjectIdFromActivity(activityRow);
      const activityOccurredAt = resolveActivityCapturedAt(activityRow);
      const activityCorrelationId =
        normalizeOptionalString(customProperties.correlationId);
      const activityTurnId = normalizeOptionalString(customProperties.turnId);

      timelineEvents.push({
        eventId: `activity:${String(activityRow._id)}`,
        stream: "immutable_activity",
        title: humanizeToken(activityKind),
        summary: resolveActivitySummary(activityRow),
        immutable: true,
        occurredAt: activityOccurredAt,
        correlationId: activityCorrelationId,
        sessionId: activitySessionId,
        turnId: activityTurnId,
        actionItemId: activityActionItemId,
        activityKind,
        actionType: null,
        transition: null,
        previousStatus: null,
        nextStatus: null,
        executionStatus: null,
        attemptNumber: null,
        decision: null,
        riskLevel: null,
        syncStatus: null,
        connectorKey: null,
        externalRecordType: null,
      });
    }

    const activityActionTypes = new Set([
      ORG_ACTION_ITEM_STATE_CHANGED_ACTION_TYPE,
      ORG_ACTION_EXECUTION_RECEIPT_RECORDED_ACTION_TYPE,
      ORG_ACTION_SYNC_BINDING_RECORDED_ACTION_TYPE,
      ORG_ACTION_POLICY_SNAPSHOT_RECORDED_ACTION_TYPE,
    ]);

    for (const actionItemId of actionItemIds) {
      const actionItem = actionItemRowById.get(String(actionItemId)) || null;
      const actionItemSessionId = readActionItemSessionId(actionItem)
        || effectiveSourceSessionId
        || null;

      const [rawObjectActions, rawReceipts, rawPolicySnapshots, rawSyncLinks] =
        await Promise.all([
          dbAny
            .query("objectActions")
            .withIndex("by_object", (q: any) =>
              q.eq("objectId", actionItemId),
            )
            .collect() as Promise<ObjectActionRow[]>,
          dbAny
            .query("orgActionExecutionReceipts")
            .withIndex("by_org_action_item", (q: any) =>
              q
                .eq("organizationId", access.organizationId)
                .eq("actionItemObjectId", actionItemId),
            )
            .collect() as Promise<ActionExecutionReceiptRow[]>,
          dbAny
            .query("orgActionPolicySnapshots")
            .withIndex("by_org_action_item", (q: any) =>
              q
                .eq("organizationId", access.organizationId)
                .eq("actionItemObjectId", actionItemId),
            )
            .collect() as Promise<ActionPolicySnapshotRow[]>,
          dbAny
            .query("objectLinks")
            .withIndex("by_from_link_type", (q: any) =>
              q
                .eq("fromObjectId", actionItemId)
                .eq("linkType", ORG_AGENT_ACTION_ITEM_SYNC_BINDING_LINK_TYPE),
            )
            .collect() as Promise<ObjectLinkRow[]>,
        ]);

      for (const action of rawObjectActions) {
        if (!activityActionTypes.has(action.actionType)) {
          continue;
        }
        const actionData = asRecord(action.actionData);
        const transition = normalizeOptionalString(actionData.transition);
        const previousStatus = normalizeOptionalString(actionData.previousStatus);
        const nextStatus = normalizeOptionalString(actionData.nextStatus);
        const reasonCode = normalizeOptionalString(actionData.reasonCode);
        const correlationId = normalizeOptionalString(actionData.correlationId);
        const turnId = normalizeOptionalString(actionData.turnId);

        let stream: TimelineEventStream = "workflow_state_checkpoint";
        let immutable = false;
        let title = "Work Item State Checkpoint";
        let summary = "Action item lifecycle state changed.";

        if (action.actionType === ORG_ACTION_ITEM_STATE_CHANGED_ACTION_TYPE) {
          if (transition === "approve") {
            title = "Approval Resolved";
            summary = "Owner approved this action item for execution.";
          } else if (transition === "takeover") {
            title = "Takeover Requested";
            summary = "Human takeover was requested for this action item.";
          } else if (transition === "assign") {
            title = "Assignment Updated";
            summary = "Action item assignee changed.";
          } else if (transition === "complete") {
            title = "Action Item Completed";
            summary = "Action item moved to completed state.";
          } else if (transition === "retry") {
            title = "Action Item Retried";
            summary = "Action item was queued for retry.";
          }
          if (previousStatus && nextStatus) {
            summary = `${summary} (${humanizeToken(previousStatus)} -> ${humanizeToken(nextStatus)})`;
          }
          if (reasonCode) {
            summary = `${summary} [${reasonCode}]`;
          }
        } else if (
          action.actionType === ORG_ACTION_EXECUTION_RECEIPT_RECORDED_ACTION_TYPE
        ) {
          stream = "execution_receipt";
          immutable = true;
          title = "Execution Receipt Linked";
          summary = "Execution receipt evidence was attached to this action item.";
        } else if (
          action.actionType === ORG_ACTION_SYNC_BINDING_RECORDED_ACTION_TYPE
        ) {
          stream = "sync_event";
          immutable = true;
          title = "Sync Marker Recorded";
          summary = "Downstream sync marker was linked for this action item.";
        } else if (
          action.actionType === ORG_ACTION_POLICY_SNAPSHOT_RECORDED_ACTION_TYPE
        ) {
          stream = "policy_decision";
          immutable = true;
          title = "Policy Snapshot Recorded";
          summary = "Policy decision evidence was recorded.";
        }

        timelineEvents.push({
          eventId: `object_action:${String(action._id)}`,
          stream,
          title,
          summary,
          immutable,
          occurredAt: action.performedAt,
          correlationId,
          sessionId: actionItemSessionId,
          turnId,
          actionItemId: String(actionItemId),
          activityKind: null,
          actionType: action.actionType,
          transition,
          previousStatus,
          nextStatus,
          executionStatus: null,
          attemptNumber: null,
          decision: null,
          riskLevel: null,
          syncStatus: null,
          connectorKey: null,
          externalRecordType: null,
        });
      }

      for (const receipt of rawReceipts) {
        const receiptPayload = asRecord(receipt.receiptPayload);
        const receiptTurnId = normalizeOptionalString(receiptPayload.turnId);
        const providerKey = normalizeOptionalString(receipt.providerKey);
        const completedAt = normalizeFiniteTimestamp(receipt.completedAt);
        const startedAt = normalizeFiniteTimestamp(receipt.startedAt);
        const occurredAt = completedAt || startedAt || receipt.updatedAt;
        const summaryParts = [
          `Attempt ${receipt.attemptNumber}`,
          `status ${humanizeToken(receipt.executionStatus)}`,
        ];
        if (providerKey) {
          summaryParts.push(`provider ${providerKey}`);
        }
        if (receipt.errorMessage) {
          summaryParts.push(`error ${receipt.errorMessage}`);
        }

        timelineEvents.push({
          eventId: `execution_receipt:${String(receipt._id)}`,
          stream: "execution_receipt",
          title: `Execution ${humanizeToken(receipt.executionStatus)}`,
          summary: summaryParts.join(" · "),
          immutable: true,
          occurredAt,
          correlationId: receipt.correlationId,
          sessionId: receipt.sessionId
            ? String(receipt.sessionId)
            : actionItemSessionId,
          turnId: receiptTurnId,
          actionItemId: String(actionItemId),
          activityKind: null,
          actionType: ORG_ACTION_EXECUTION_RECEIPT_RECORDED_ACTION_TYPE,
          transition: null,
          previousStatus: null,
          nextStatus: null,
          executionStatus: receipt.executionStatus,
          attemptNumber: receipt.attemptNumber,
          decision: null,
          riskLevel: null,
          syncStatus: null,
          connectorKey: null,
          externalRecordType: null,
        });
      }

      for (const policySnapshot of rawPolicySnapshots) {
        timelineEvents.push({
          eventId: `policy_snapshot:${String(policySnapshot._id)}`,
          stream: "policy_decision",
          title: `Policy ${humanizeToken(policySnapshot.decision)}`,
          summary: `Risk ${humanizeToken(policySnapshot.riskLevel)} · ${policySnapshot.actionFamily}`,
          immutable: true,
          occurredAt: policySnapshot.resolvedAt,
          correlationId: null,
          sessionId: actionItemSessionId,
          turnId: null,
          actionItemId: String(actionItemId),
          activityKind: null,
          actionType: ORG_ACTION_POLICY_SNAPSHOT_RECORDED_ACTION_TYPE,
          transition: null,
          previousStatus: null,
          nextStatus: null,
          executionStatus: null,
          attemptNumber: null,
          decision: policySnapshot.decision,
          riskLevel: policySnapshot.riskLevel,
          syncStatus: null,
          connectorKey: null,
          externalRecordType: null,
        });
      }

      const syncBindingCandidates = await Promise.all(
        rawSyncLinks.map(async (syncLink) => {
          const syncAnchor = (await ctx.db.get(syncLink.toObjectId)) as
            | OntologyObjectRow
            | null;
          if (
            !syncAnchor
            || syncAnchor.organizationId !== access.organizationId
            || syncAnchor.type !== ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE
          ) {
            return null;
          }
          const anchorProperties = asRecord(syncAnchor.customProperties);
          const syncBindingIdString = resolveObjectIdString(
            anchorProperties.syncBindingId,
          );
          if (!syncBindingIdString) {
            return null;
          }
          const syncBinding = (await ctx.db.get(
            syncBindingIdString as Id<"orgActionSyncBindings">,
          )) as ActionSyncBindingRow | null;
          if (!syncBinding || syncBinding.canonicalObjectId !== actionItemId) {
            return null;
          }
          return syncBinding;
        }),
      );

      for (const syncBinding of syncBindingCandidates) {
        if (!syncBinding) {
          continue;
        }
        const metadata = asRecord(syncBinding.metadata);
        timelineEvents.push({
          eventId: `sync_binding:${String(syncBinding._id)}`,
          stream: "sync_event",
          title: `Sync ${humanizeToken(syncBinding.bindingStatus)}`,
          summary:
            `${syncBinding.connectorKey} · ${syncBinding.externalRecordType}`
            + ` · ${syncBinding.externalRecordId}`,
          immutable: true,
          occurredAt:
            normalizeFiniteTimestamp(syncBinding.lastSyncedAt)
            || normalizeFiniteTimestamp(syncBinding.updatedAt)
            || Date.now(),
          correlationId:
            normalizeOptionalString(metadata.correlationId) || null,
          sessionId: actionItemSessionId,
          turnId: null,
          actionItemId: String(actionItemId),
          activityKind: null,
          actionType: ORG_ACTION_SYNC_BINDING_RECORDED_ACTION_TYPE,
          transition: null,
          previousStatus: null,
          nextStatus: null,
          executionStatus: null,
          attemptNumber: null,
          decision: null,
          riskLevel: null,
          syncStatus: syncBinding.bindingStatus,
          connectorKey: syncBinding.connectorKey,
          externalRecordType: syncBinding.externalRecordType,
        });
      }
    }

    const dedupedBySortKey = new Map<string, OrgActivityTimelineEvent>();
    for (const event of timelineEvents) {
      const sortKey = resolveTimelineSortKey({
        occurredAt: event.occurredAt,
        eventId: event.eventId,
      });
      dedupedBySortKey.set(sortKey, event);
    }
    const sortedEvents = Array.from(dedupedBySortKey.values()).sort((left, right) => {
      if (right.occurredAt !== left.occurredAt) {
        return right.occurredAt - left.occurredAt;
      }
      return left.eventId.localeCompare(right.eventId);
    });

    const mutableState = actionItemRow
      ? {
          actionItemId: String(actionItemRow._id),
          title: actionItemRow.name,
          status: normalizeStatus(actionItemRow.status),
          pipelineState: resolvePipelineState(normalizeStatus(actionItemRow.status)),
          updatedAt: actionItemRow.updatedAt,
          sessionId: readActionItemSessionId(actionItemRow),
        }
      : null;

    return {
      organizationId: access.organizationId,
      sourceSessionId: effectiveSourceSessionId || null,
      streams: [...TIMELINE_EVENT_STREAM_VALUES],
      mutableState,
      events: sortedEvents.slice(0, timelineLimit),
      total: sortedEvents.length,
    };
  },
});

export const transitionActionItem = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    actionItemId: v.id("objects"),
    transition: v.union(
      v.literal("approve"),
      v.literal("assign"),
      v.literal("complete"),
      v.literal("retry"),
      v.literal("takeover"),
    ),
    assigneeAgentId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const access = await requireActionCenterAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

    const actionItem = (await ctx.db.get(args.actionItemId)) as
      | OntologyObjectRow
      | null;
    if (!actionItem) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Action item not found.",
      });
    }
    if (actionItem.organizationId !== access.organizationId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Action item does not belong to the active organization.",
      });
    }
    if (actionItem.type !== ORG_AGENT_ACTION_ITEM_OBJECT_TYPE) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Object is not an org action item.",
      });
    }

    const currentStatus = normalizeStatus(
      actionItem.status,
    ) as OrgAgentActionItemStatus;
    const transitionResult = resolveActionItemTransition({
      currentStatus,
      transition: args.transition,
    });
    if (!transitionResult.allowed) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Transition denied: ${transitionResult.reasonCode}`,
      });
    }

    if (args.assigneeAgentId) {
      const assignee = (await ctx.db.get(args.assigneeAgentId)) as
        | OntologyObjectRow
        | null;
      if (
        !assignee ||
        assignee.organizationId !== access.organizationId ||
        assignee.type !== "org_agent"
      ) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Assignee must be an org agent in the active organization.",
        });
      }
    }

    const previousProperties = asRecord(actionItem.customProperties);
    const actionFamily = readActionFamily(
      actionItem,
      previousProperties,
    );
    const sourceSessionId =
      normalizeOptionalString(previousProperties.sessionId)
      || normalizeOptionalString(previousProperties.sourceSessionId)
      || args.sessionId;
    const existingTransitionActions = await ctx.db
      .query("objectActions")
      .withIndex("by_object_action_type", (q) =>
        q
          .eq("objectId", args.actionItemId)
          .eq("actionType", ORG_ACTION_ITEM_STATE_CHANGED_ACTION_TYPE),
      )
      .collect();
    const transitionNumber = existingTransitionActions.length + 1;
    const transitionCorrelationId = buildOrgActionApprovalCorrelationId({
      sessionId: sourceSessionId,
      actionItemObjectId: String(args.actionItemId),
      transition: args.transition,
      transitionNumber,
    });
    const transitionIdempotencyKey = buildOrgActionApprovalIdempotencyKey({
      organizationId: String(access.organizationId),
      actionItemObjectId: String(args.actionItemId),
      transition: args.transition,
      transitionNumber,
    });
    const now = Date.now();
    const nextProperties: Record<string, unknown> = {
      ...previousProperties,
      lastTransition: args.transition,
      lastTransitionReason: transitionResult.reasonCode,
      lastTransitionAt: now,
      lastTransitionBy: "org_action_center_owner",
      lastTransitionNumber: transitionNumber,
      lastTransitionCorrelationId: transitionCorrelationId,
      lastTransitionIdempotencyKey: transitionIdempotencyKey,
      takeoverRequested:
        args.transition === "takeover"
          ? true
          : previousProperties.takeoverRequested === true,
    };

    if (args.assigneeAgentId) {
      nextProperties.assignedAgentId = String(args.assigneeAgentId);
    }
    if (args.transition === "retry") {
      const previousRetryCount =
        typeof previousProperties.retryCount === "number"
          ? previousProperties.retryCount
          : 0;
      nextProperties.retryCount = previousRetryCount + 1;
    }
    if (args.transition === "complete") {
      nextProperties.completedAt = now;
    }

    await ctx.db.patch(args.actionItemId, {
      status: transitionResult.nextStatus,
      customProperties: nextProperties,
      updatedAt: now,
    });

    if (
      args.assigneeAgentId &&
      (args.transition === "assign" || args.transition === "takeover")
    ) {
      const existingLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q) =>
          q
            .eq("fromObjectId", args.actionItemId)
            .eq("linkType", "org_agent_action_item_assignee"),
        )
        .collect();
      for (const link of existingLinks) {
        await ctx.db.delete(link._id);
      }
      await ctx.db.insert("objectLinks", {
        organizationId: access.organizationId,
        fromObjectId: args.actionItemId,
        toObjectId: args.assigneeAgentId,
        linkType: "org_agent_action_item_assignee",
        properties: {
          transition: args.transition,
          assignedAt: now,
        },
        createdAt: now,
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: args.actionItemId,
      actionType: ORG_ACTION_ITEM_STATE_CHANGED_ACTION_TYPE,
      actionData: {
        transition: args.transition,
        previousStatus: currentStatus,
        nextStatus: transitionResult.nextStatus,
        reasonCode: transitionResult.reasonCode,
        transitionNumber,
        correlationId: transitionCorrelationId,
        idempotencyKey: transitionIdempotencyKey,
        actionFamily,
        sessionId: sourceSessionId,
        assigneeAgentId: args.assigneeAgentId
          ? String(args.assigneeAgentId)
          : undefined,
      },
      performedAt: now,
    });
    try {
      await ctx.runMutation(getInternal().activityProtocol.logEvent, {
        organizationId: access.organizationId,
        applicationId: args.actionItemId,
        eventType: "org_action_item_transition",
        severity: "info",
        category: "object",
        summary: `Action item transitioned to ${transitionResult.nextStatus}.`,
        details: {
          objectType: ORG_AGENT_ACTION_ITEM_OBJECT_TYPE,
          objectId: args.actionItemId,
          correlationId: transitionCorrelationId,
          idempotencyKey: transitionIdempotencyKey,
          sessionId: sourceSessionId,
          workflowStage:
            args.transition === "complete" || args.transition === "retry"
              ? "execution"
              : "approval",
          retryAttempt: transitionNumber,
          retryCount: Math.max(0, transitionNumber - 1),
        },
      });
    } catch (error) {
      console.warn("[OrgActionCenter] Failed to log transition activity protocol event", {
        actionItemId: args.actionItemId,
        transition: args.transition,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let executionReceiptId: Id<"orgActionExecutionReceipts"> | null = null;
    if (args.transition === "complete" || args.transition === "retry") {
      const existingReceipts = await ctx.db
        .query("orgActionExecutionReceipts")
        .withIndex("by_org_action_item", (q) =>
          q
            .eq("organizationId", access.organizationId)
            .eq("actionItemObjectId", args.actionItemId),
        )
        .collect();
      const nextAttemptNumber =
        existingReceipts.reduce(
          (max, row) => Math.max(max, row.attemptNumber),
          0,
        ) + 1;
      const executionIdempotencyKey = buildOrgActionExecutionReceiptIdempotencyKey({
        organizationId: String(access.organizationId),
        actionItemObjectId: String(args.actionItemId),
        actionFamily,
        attemptNumber: nextAttemptNumber,
      });
      const executionCorrelationId = buildOrgActionReceiptCorrelationId({
        sessionId: sourceSessionId,
        actionItemObjectId: String(args.actionItemId),
        attemptNumber: nextAttemptNumber,
      });

      executionReceiptId = await ctx.db.insert("orgActionExecutionReceipts", {
        organizationId: access.organizationId,
        actionItemObjectId: args.actionItemId,
        executionStatus: args.transition === "complete" ? "succeeded" : "queued",
        idempotencyKey: executionIdempotencyKey,
        correlationId: executionCorrelationId,
        attemptNumber: nextAttemptNumber,
        actionFamily,
        targetSystemClass: "platform_internal",
        policyDecision: "approval_required",
        providerKey: "org_action_center_manual",
        receiptPayload: {
          transition: args.transition,
          transitionNumber,
          transitionCorrelationId,
          transitionIdempotencyKey,
        },
        startedAt: now,
        completedAt: args.transition === "complete" ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("objectActions", {
        organizationId: access.organizationId,
        objectId: args.actionItemId,
        actionType: "org_action_execution_receipt_recorded",
        actionData: {
          transition: args.transition,
          receiptId: String(executionReceiptId),
          attemptNumber: nextAttemptNumber,
          correlationId: executionCorrelationId,
          idempotencyKey: executionIdempotencyKey,
          transitionCorrelationId,
          transitionIdempotencyKey,
        },
        performedAt: now,
      });
      try {
        await ctx.runMutation(getInternal().activityProtocol.logEvent, {
          organizationId: access.organizationId,
          applicationId: args.actionItemId,
          eventType: "org_action_execution_receipt_recorded",
          severity: "info",
          category: "object",
          summary: `Execution receipt recorded for attempt ${nextAttemptNumber}.`,
          details: {
            objectType: ORG_AGENT_ACTION_ITEM_OBJECT_TYPE,
            objectId: args.actionItemId,
            receiptId: String(executionReceiptId),
            correlationId: executionCorrelationId,
            idempotencyKey: executionIdempotencyKey,
            sessionId: sourceSessionId,
            workflowStage: "execution",
            retryAttempt: nextAttemptNumber,
            retryCount: Math.max(0, nextAttemptNumber - 1),
          },
        });
      } catch (error) {
        console.warn("[OrgActionCenter] Failed to log execution receipt activity protocol event", {
          actionItemId: args.actionItemId,
          transition: args.transition,
          receiptId: executionReceiptId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      actionItemId: args.actionItemId,
      transition: args.transition,
      previousStatus: currentStatus,
      nextStatus: transitionResult.nextStatus,
      reasonCode: transitionResult.reasonCode,
      executionReceiptId,
    };
  },
});
