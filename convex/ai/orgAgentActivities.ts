import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
  ORG_AGENT_ACTIVITY_KIND_VALUES,
  ORG_AGENT_ACTIVITY_OBJECT_TYPE,
  type OrgAgentActivityKind,
} from "../schemas/orgAgentActionRuntimeSchemas";
import {
  buildOrgAgentOutcomeEnvelope,
  normalizeOrgAgentOutcomeEnvelope,
  type OrgAgentOutcomeEnvelopeV1,
} from "./orgAgentOutcomeExtraction";

const ORG_AGENT_ACTIVITY_STATUS = "recorded" as const;
const ORG_AGENT_SESSION_ANCHOR_OBJECT_TYPE = "org_agent_session_ref" as const;
const ORG_AGENT_POLICY_SNAPSHOT_ANCHOR_OBJECT_TYPE =
  "org_action_policy_snapshot_ref" as const;
const ORG_AGENT_EXECUTION_RECEIPT_ANCHOR_OBJECT_TYPE =
  "org_action_execution_receipt_ref" as const;
const ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE =
  "org_action_sync_binding_ref" as const;

function normalizeArtifactRef(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

export interface OrgAgentActivityArtifactRefs {
  sessionId: string;
  crmContactId?: string;
  crmOrganizationId?: string;
  actionItemObjectId?: string;
  policySnapshotId?: string;
  executionReceiptId?: string;
  syncBindingId?: string;
}

export function buildOrgAgentActivityArtifactRefs(args: {
  sessionId: Id<"agentSessions"> | string;
  crmContactId?: Id<"objects"> | string | null;
  crmOrganizationId?: Id<"objects"> | string | null;
  actionItemObjectId?: Id<"objects"> | string | null;
  policySnapshotId?: Id<"orgActionPolicySnapshots"> | string | null;
  executionReceiptId?: Id<"orgActionExecutionReceipts"> | string | null;
  syncBindingId?: Id<"orgActionSyncBindings"> | string | null;
}): OrgAgentActivityArtifactRefs {
  return {
    sessionId: String(args.sessionId),
    crmContactId: normalizeArtifactRef(args.crmContactId),
    crmOrganizationId: normalizeArtifactRef(args.crmOrganizationId),
    actionItemObjectId: normalizeArtifactRef(args.actionItemObjectId),
    policySnapshotId: normalizeArtifactRef(args.policySnapshotId),
    executionReceiptId: normalizeArtifactRef(args.executionReceiptId),
    syncBindingId: normalizeArtifactRef(args.syncBindingId),
  };
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveOrgAgentActivityKind(
  value: unknown,
): OrgAgentActivityKind {
  const normalized = normalizeNonEmptyString(value);
  if (
    normalized
    && (ORG_AGENT_ACTIVITY_KIND_VALUES as readonly string[]).includes(normalized)
  ) {
    return normalized as OrgAgentActivityKind;
  }
  return "session_outcome_captured";
}

export function normalizeOrgAgentActivityKind(
  value: unknown,
): OrgAgentActivityKind {
  return resolveOrgAgentActivityKind(value);
}

export function buildOrgAgentActivityName(args: {
  activityKind: OrgAgentActivityKind;
  capturedAt: number;
}): string {
  return `Org agent activity - ${args.activityKind} - ${new Date(
    args.capturedAt,
  ).toISOString()}`;
}

async function ensureReferenceObject(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  objectType: string;
  name: string;
  createdBy?: Id<"objects">;
  description?: string;
  customProperties?: Record<string, unknown>;
}): Promise<Id<"objects">> {
  const existing = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type_name", (q: any) =>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  fromObjectId: Id<"objects">;
  toObjectId: Id<"objects">;
  linkType: string;
  createdBy?: Id<"objects">;
  properties?: Record<string, unknown>;
}) {
  const existing = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", args.fromObjectId).eq("linkType", args.linkType),
    )
    .filter((q: any) => q.eq(q.field("toObjectId"), args.toObjectId))
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

async function resolveOrganizationFromContact(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  contactId: Id<"objects">;
}): Promise<Id<"objects"> | undefined> {
  const contactToOrganizationLink = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", args.contactId).eq("linkType", "works_at"),
    )
    .first();
  return contactToOrganizationLink?.toObjectId;
}

function resolveOutcomeEnvelope(args: {
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  sessionId: Id<"agentSessions">;
  channel: string;
  summary?: string;
  userMessage?: string;
  assistantMessage?: string;
  crmContactId?: Id<"objects">;
  crmOrganizationId?: Id<"objects">;
  turnId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  outcomeEnvelope?: unknown;
}): OrgAgentOutcomeEnvelopeV1 {
  const normalizedProvidedEnvelope = normalizeOrgAgentOutcomeEnvelope(
    args.outcomeEnvelope,
  );
  if (normalizedProvidedEnvelope) {
    return normalizedProvidedEnvelope;
  }

  return buildOrgAgentOutcomeEnvelope({
    source: "agent_session",
    organizationId: String(args.organizationId),
    agentId: String(args.agentId),
    sessionId: String(args.sessionId),
    channel: args.channel,
    summary: args.summary,
    messageText: args.assistantMessage ?? args.userMessage,
    contactCandidate: args.crmContactId
      ? { objectId: String(args.crmContactId) }
      : undefined,
    organizationCandidate: args.crmOrganizationId
      ? { objectId: String(args.crmOrganizationId) }
      : undefined,
    metadata: {
      ...(args.metadata || {}),
      turnId: args.turnId,
      correlationId: args.correlationId,
    },
  });
}

export const recordSessionOutcomeActivity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    channel: v.string(),
    activityKind: v.optional(v.string()),
    turnId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    summary: v.optional(v.string()),
    userMessage: v.optional(v.string()),
    assistantMessage: v.optional(v.string()),
    crmContactId: v.optional(v.id("objects")),
    crmOrganizationId: v.optional(v.id("objects")),
    actionItemObjectId: v.optional(v.id("objects")),
    policySnapshotId: v.optional(v.id("orgActionPolicySnapshots")),
    executionReceiptId: v.optional(v.id("orgActionExecutionReceipts")),
    syncBindingId: v.optional(v.id("orgActionSyncBindings")),
    outcomeEnvelope: v.optional(v.any()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const activityKind = resolveOrgAgentActivityKind(args.activityKind);
    const resolvedCrmOrganizationId =
      args.crmOrganizationId
      || (args.crmContactId
        ? await resolveOrganizationFromContact({
            ctx,
            contactId: args.crmContactId,
          })
        : undefined);
    const artifactRefs = buildOrgAgentActivityArtifactRefs({
      sessionId: args.sessionId,
      crmContactId: args.crmContactId,
      crmOrganizationId: resolvedCrmOrganizationId,
      actionItemObjectId: args.actionItemObjectId,
      policySnapshotId: args.policySnapshotId,
      executionReceiptId: args.executionReceiptId,
      syncBindingId: args.syncBindingId,
    });

    const outcomeEnvelope = resolveOutcomeEnvelope({
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      channel: args.channel,
      summary: args.summary,
      userMessage: args.userMessage,
      assistantMessage: args.assistantMessage,
      crmContactId: args.crmContactId,
      crmOrganizationId: resolvedCrmOrganizationId,
      turnId: args.turnId,
      correlationId: args.correlationId,
      metadata: args.metadata,
      outcomeEnvelope: args.outcomeEnvelope,
    });

    const sessionAnchorObjectId = await ensureReferenceObject({
      ctx,
      organizationId: args.organizationId,
      objectType: ORG_AGENT_SESSION_ANCHOR_OBJECT_TYPE,
      name: `session:${String(args.sessionId)}`,
      description: "Session reference anchor for org agent activity timeline.",
      createdBy: args.agentId,
      customProperties: {
        contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
        sessionId: String(args.sessionId),
        channel: args.channel,
        agentId: String(args.agentId),
      },
    });

    const activityObjectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: ORG_AGENT_ACTIVITY_OBJECT_TYPE,
      subtype: activityKind,
      name: buildOrgAgentActivityName({
        activityKind,
        capturedAt: outcomeEnvelope.capturedAt,
      }),
      description: outcomeEnvelope.summary,
      status: ORG_AGENT_ACTIVITY_STATUS,
      customProperties: {
        contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
        activityKind,
        capturedAt: outcomeEnvelope.capturedAt,
        channel: args.channel,
        sessionId: String(args.sessionId),
        turnId: args.turnId,
        correlationId: args.correlationId,
        actionCandidateCount: outcomeEnvelope.actionCandidates.length,
        checkpointCount: outcomeEnvelope.checkpoints.length,
        outcomeEnvelope,
        artifactRefs,
      },
      createdBy: args.agentId,
      createdAt: now,
      updatedAt: now,
    });

    await ensureObjectLink({
      ctx,
      organizationId: args.organizationId,
      fromObjectId: activityObjectId,
      toObjectId: sessionAnchorObjectId,
      linkType: "org_agent_activity_source_session",
      createdBy: args.agentId,
      properties: {
        sessionId: String(args.sessionId),
      },
    });

    if (args.crmContactId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: activityObjectId,
        toObjectId: args.crmContactId,
        linkType: "org_agent_activity_subject_contact",
        createdBy: args.agentId,
      });
    }

    if (resolvedCrmOrganizationId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: activityObjectId,
        toObjectId: resolvedCrmOrganizationId,
        linkType: "org_agent_activity_subject_organization",
        createdBy: args.agentId,
      });
    }

    if (args.actionItemObjectId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: activityObjectId,
        toObjectId: args.actionItemObjectId,
        linkType: "org_agent_activity_action_item",
        createdBy: args.agentId,
      });
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: args.actionItemObjectId,
        toObjectId: activityObjectId,
        linkType: "org_agent_action_item_source_activity",
        createdBy: args.agentId,
      });
    }

    let policySnapshotAnchorObjectId: Id<"objects"> | undefined;
    if (args.policySnapshotId) {
      policySnapshotAnchorObjectId = await ensureReferenceObject({
        ctx,
        organizationId: args.organizationId,
        objectType: ORG_AGENT_POLICY_SNAPSHOT_ANCHOR_OBJECT_TYPE,
        name: `policy_snapshot:${String(args.policySnapshotId)}`,
        createdBy: args.agentId,
        description: "Policy snapshot reference anchor for org agent activity.",
        customProperties: {
          contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
          policySnapshotId: String(args.policySnapshotId),
          sessionId: String(args.sessionId),
        },
      });

      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: activityObjectId,
        toObjectId: policySnapshotAnchorObjectId,
        linkType: "org_agent_activity_policy_snapshot",
        createdBy: args.agentId,
      });

      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: activityObjectId,
        actionType: "org_action_policy_snapshot_recorded",
        actionData: {
          policySnapshotId: String(args.policySnapshotId),
          sessionId: String(args.sessionId),
          turnId: args.turnId,
          correlationId: args.correlationId,
        },
        performedBy: args.agentId,
        performedAt: now,
      });
    }

    let executionReceiptAnchorObjectId: Id<"objects"> | undefined;
    if (args.executionReceiptId && args.actionItemObjectId) {
      executionReceiptAnchorObjectId = await ensureReferenceObject({
        ctx,
        organizationId: args.organizationId,
        objectType: ORG_AGENT_EXECUTION_RECEIPT_ANCHOR_OBJECT_TYPE,
        name: `execution_receipt:${String(args.executionReceiptId)}`,
        createdBy: args.agentId,
        description: "Execution receipt reference anchor for org action items.",
        customProperties: {
          contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
          executionReceiptId: String(args.executionReceiptId),
          actionItemObjectId: String(args.actionItemObjectId),
        },
      });

      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: args.actionItemObjectId,
        toObjectId: executionReceiptAnchorObjectId,
        linkType: "org_agent_action_item_execution_receipt",
        createdBy: args.agentId,
      });

      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: args.actionItemObjectId,
        actionType: "org_action_execution_receipt_recorded",
        actionData: {
          executionReceiptId: String(args.executionReceiptId),
          sourceActivityObjectId: String(activityObjectId),
          turnId: args.turnId,
          correlationId: args.correlationId,
        },
        performedBy: args.agentId,
        performedAt: now,
      });
    }

    let syncBindingAnchorObjectId: Id<"objects"> | undefined;
    if (args.syncBindingId && args.actionItemObjectId) {
      syncBindingAnchorObjectId = await ensureReferenceObject({
        ctx,
        organizationId: args.organizationId,
        objectType: ORG_AGENT_SYNC_BINDING_ANCHOR_OBJECT_TYPE,
        name: `sync_binding:${String(args.syncBindingId)}`,
        createdBy: args.agentId,
        description: "Sync binding reference anchor for org action items.",
        customProperties: {
          contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
          syncBindingId: String(args.syncBindingId),
          actionItemObjectId: String(args.actionItemObjectId),
        },
      });

      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: args.actionItemObjectId,
        toObjectId: syncBindingAnchorObjectId,
        linkType: "org_agent_action_item_sync_binding",
        createdBy: args.agentId,
      });

      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: args.actionItemObjectId,
        actionType: "org_action_sync_binding_recorded",
        actionData: {
          syncBindingId: String(args.syncBindingId),
          sourceActivityObjectId: String(activityObjectId),
          turnId: args.turnId,
          correlationId: args.correlationId,
        },
        performedBy: args.agentId,
        performedAt: now,
      });
    }

    return {
      activityObjectId,
      activityKind,
      sessionAnchorObjectId,
      policySnapshotAnchorObjectId,
      executionReceiptAnchorObjectId,
      syncBindingAnchorObjectId,
      artifactRefs,
      contactLinked: Boolean(args.crmContactId),
      organizationLinked: Boolean(resolvedCrmOrganizationId),
      actionItemLinked: Boolean(args.actionItemObjectId),
    };
  },
});
