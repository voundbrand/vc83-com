import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION } from "../schemas/orgAgentActionRuntimeSchemas";
import {
  buildOrgAgentOutcomeEnvelope,
  normalizeOrgAgentOutcomeEnvelope,
  type OrgAgentOutcomeEnvelopeV1,
} from "./orgAgentOutcomeExtraction";

const CRM_ACTIVITY_OBJECT_TYPE = "crm_activity" as const;
const CRM_ACTIVITY_OUTCOME_SUBTYPE = "agent_outcome" as const;
const CRM_SYNC_CANDIDATE_OBJECT_TYPE = "org_crm_sync_candidate" as const;
const CRM_SYNC_CANDIDATE_SUBTYPE = "canonical_projection" as const;

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeOrgCrmProjectionSummary(value: unknown): string {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return "CRM projection captured";
  }
  return normalized.length > 1200 ? normalized.slice(0, 1200) : normalized;
}

export function buildOrgCrmProjectionObjectName(args: {
  sessionId: Id<"agentSessions">;
  turnId?: string;
  capturedAt: number;
}): string {
  return `crm_projection:${String(args.sessionId)}:${args.turnId || args.capturedAt}`;
}

export function buildOrgCrmSyncCandidateName(args: {
  sessionId: Id<"agentSessions">;
  turnId?: string;
  capturedAt: number;
}): string {
  return `crm_sync_candidate:${String(args.sessionId)}:${args.turnId || args.capturedAt}`;
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
  const organizationLink = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", args.contactId).eq("linkType", "works_at"),
    )
    .first();
  return organizationLink?.toObjectId;
}

function resolveOutcomeEnvelope(args: {
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  agentId: Id<"objects">;
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
    sessionId: String(args.sessionId),
    agentId: String(args.agentId),
    channel: args.channel,
    summary: normalizeOrgCrmProjectionSummary(
      args.summary ?? args.assistantMessage ?? args.userMessage,
    ),
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

export const projectSessionOutcomeToCanonicalCrm = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    channel: v.string(),
    activityObjectId: v.optional(v.id("objects")),
    turnId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    summary: v.optional(v.string()),
    userMessage: v.optional(v.string()),
    assistantMessage: v.optional(v.string()),
    crmContactId: v.optional(v.id("objects")),
    crmOrganizationId: v.optional(v.id("objects")),
    outcomeEnvelope: v.optional(v.any()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const session = await ctx.db.get(args.sessionId);
    const resolvedCrmContactId =
      args.crmContactId
      || ((session as { crmContactId?: Id<"objects"> } | null)?.crmContactId);
    const resolvedCrmOrganizationId =
      args.crmOrganizationId
      || (resolvedCrmContactId
        ? await resolveOrganizationFromContact({
            ctx,
            contactId: resolvedCrmContactId,
          })
        : undefined);
    const outcomeEnvelope = resolveOutcomeEnvelope({
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      channel: args.channel,
      summary: args.summary,
      userMessage: args.userMessage,
      assistantMessage: args.assistantMessage,
      crmContactId: resolvedCrmContactId,
      crmOrganizationId: resolvedCrmOrganizationId,
      turnId: args.turnId,
      correlationId: args.correlationId,
      metadata: args.metadata,
      outcomeEnvelope: args.outcomeEnvelope,
    });

    const projectionObjectName = buildOrgCrmProjectionObjectName({
      sessionId: args.sessionId,
      turnId: args.turnId,
      capturedAt: outcomeEnvelope.capturedAt,
    });
    const existingProjection = await ctx.db
      .query("objects")
      .withIndex("by_org_type_name", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", CRM_ACTIVITY_OBJECT_TYPE)
          .eq("name", projectionObjectName),
      )
      .first();

    const projectionObjectId = existingProjection?._id
      || (await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: CRM_ACTIVITY_OBJECT_TYPE,
          subtype: CRM_ACTIVITY_OUTCOME_SUBTYPE,
          name: projectionObjectName,
          description: normalizeOrgCrmProjectionSummary(outcomeEnvelope.summary),
          status: "logged",
          customProperties: {
            contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
            source: "org_agent_runtime",
            projectionKind: "session_outcome_projection",
            sessionId: String(args.sessionId),
            turnId: args.turnId,
            correlationId: args.correlationId,
            channel: args.channel,
            capturedAt: outcomeEnvelope.capturedAt,
            actionCandidates: outcomeEnvelope.actionCandidates,
            checkpoints: outcomeEnvelope.checkpoints,
            metadata: outcomeEnvelope.metadata,
            sourceActivityObjectId: args.activityObjectId
              ? String(args.activityObjectId)
              : undefined,
            targetContactObjectId: resolvedCrmContactId
              ? String(resolvedCrmContactId)
              : undefined,
            targetOrganizationObjectId: resolvedCrmOrganizationId
              ? String(resolvedCrmOrganizationId)
              : undefined,
          },
          createdBy: args.agentId,
          createdAt: now,
          updatedAt: now,
        }));

    if (resolvedCrmContactId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: projectionObjectId,
        toObjectId: resolvedCrmContactId,
        linkType: "crm_activity_contact",
        createdBy: args.agentId,
      });
    }

    if (resolvedCrmOrganizationId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: projectionObjectId,
        toObjectId: resolvedCrmOrganizationId,
        linkType: "crm_activity_organization",
        createdBy: args.agentId,
      });
    }

    if (args.activityObjectId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: args.activityObjectId,
        toObjectId: projectionObjectId,
        linkType: "org_agent_activity_crm_projection",
        createdBy: args.agentId,
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: projectionObjectId,
      actionType: "org_crm_projection_applied",
      actionData: {
        sessionId: String(args.sessionId),
        turnId: args.turnId,
        correlationId: args.correlationId,
        activityObjectId: args.activityObjectId ? String(args.activityObjectId) : undefined,
        actionCandidateCount: outcomeEnvelope.actionCandidates.length,
      },
      performedBy: args.agentId,
      performedAt: now,
    });

    if (resolvedCrmContactId) {
      const contact = await ctx.db.get(resolvedCrmContactId);
      if (contact?.type === "crm_contact") {
        await ctx.db.patch(resolvedCrmContactId, {
          customProperties: {
            ...(contact.customProperties || {}),
            lastAgentOutcomeSummary: normalizeOrgCrmProjectionSummary(
              outcomeEnvelope.summary,
            ),
            lastAgentOutcomeAt: outcomeEnvelope.capturedAt,
            lastAgentOutcomeChannel: args.channel,
            lastAgentOutcomeSessionId: String(args.sessionId),
            lastAgentOutcomeCorrelationId: args.correlationId,
            lastAgentOutcomeProjectionObjectId: String(projectionObjectId),
          },
          updatedAt: now,
        });

        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: resolvedCrmContactId,
          actionType: "org_crm_projection_applied",
          actionData: {
            projectionObjectId: String(projectionObjectId),
            sessionId: String(args.sessionId),
            turnId: args.turnId,
            correlationId: args.correlationId,
          },
          performedBy: args.agentId,
          performedAt: now,
        });
      }
    }

    if (resolvedCrmOrganizationId) {
      const organization = await ctx.db.get(resolvedCrmOrganizationId);
      if (organization?.type === "crm_organization") {
        await ctx.db.patch(resolvedCrmOrganizationId, {
          customProperties: {
            ...(organization.customProperties || {}),
            lastAgentOutcomeSummary: normalizeOrgCrmProjectionSummary(
              outcomeEnvelope.summary,
            ),
            lastAgentOutcomeAt: outcomeEnvelope.capturedAt,
            lastAgentOutcomeChannel: args.channel,
            lastAgentOutcomeSessionId: String(args.sessionId),
            lastAgentOutcomeCorrelationId: args.correlationId,
            lastAgentOutcomeProjectionObjectId: String(projectionObjectId),
          },
          updatedAt: now,
        });

        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: resolvedCrmOrganizationId,
          actionType: "org_crm_projection_applied",
          actionData: {
            projectionObjectId: String(projectionObjectId),
            sessionId: String(args.sessionId),
            turnId: args.turnId,
            correlationId: args.correlationId,
          },
          performedBy: args.agentId,
          performedAt: now,
        });
      }
    }

    const syncCandidateName = buildOrgCrmSyncCandidateName({
      sessionId: args.sessionId,
      turnId: args.turnId,
      capturedAt: outcomeEnvelope.capturedAt,
    });
    const existingSyncCandidate = await ctx.db
      .query("objects")
      .withIndex("by_org_type_name", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", CRM_SYNC_CANDIDATE_OBJECT_TYPE)
          .eq("name", syncCandidateName),
      )
      .first();

    const syncCandidateObjectId = existingSyncCandidate?._id
      || (await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: CRM_SYNC_CANDIDATE_OBJECT_TYPE,
          subtype: CRM_SYNC_CANDIDATE_SUBTYPE,
          name: syncCandidateName,
          description: "Pending downstream CRM projection candidate.",
          status: "pending",
          customProperties: {
            contractVersion: ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION,
            source: "org_agent_runtime",
            projectionObjectId: String(projectionObjectId),
            sourceActivityObjectId: args.activityObjectId
              ? String(args.activityObjectId)
              : undefined,
            targetContactObjectId: resolvedCrmContactId
              ? String(resolvedCrmContactId)
              : undefined,
            targetOrganizationObjectId: resolvedCrmOrganizationId
              ? String(resolvedCrmOrganizationId)
              : undefined,
            sessionId: String(args.sessionId),
            turnId: args.turnId,
            correlationId: args.correlationId,
            targetSystemClasses: Array.from(
              new Set(
                outcomeEnvelope.actionCandidates.map(
                  (candidate) => candidate.targetSystemClass,
                ),
              ),
            ),
            actionCandidates: outcomeEnvelope.actionCandidates,
            checkpoints: outcomeEnvelope.checkpoints,
          },
          createdBy: args.agentId,
          createdAt: now,
          updatedAt: now,
        }));

    await ensureObjectLink({
      ctx,
      organizationId: args.organizationId,
      fromObjectId: syncCandidateObjectId,
      toObjectId: projectionObjectId,
      linkType: "org_crm_sync_candidate_source_projection",
      createdBy: args.agentId,
    });
    if (resolvedCrmContactId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: syncCandidateObjectId,
        toObjectId: resolvedCrmContactId,
        linkType: "org_crm_sync_candidate_target_contact",
        createdBy: args.agentId,
      });
    }
    if (resolvedCrmOrganizationId) {
      await ensureObjectLink({
        ctx,
        organizationId: args.organizationId,
        fromObjectId: syncCandidateObjectId,
        toObjectId: resolvedCrmOrganizationId,
        linkType: "org_crm_sync_candidate_target_organization",
        createdBy: args.agentId,
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: syncCandidateObjectId,
      actionType: "org_crm_sync_candidate_enqueued",
      actionData: {
        projectionObjectId: String(projectionObjectId),
        sourceActivityObjectId: args.activityObjectId
          ? String(args.activityObjectId)
          : undefined,
        sessionId: String(args.sessionId),
        turnId: args.turnId,
        correlationId: args.correlationId,
      },
      performedBy: args.agentId,
      performedAt: now,
    });

    return {
      projectionObjectId,
      syncCandidateObjectId,
      crmContactId: resolvedCrmContactId,
      crmOrganizationId: resolvedCrmOrganizationId,
      actionCandidateCount: outcomeEnvelope.actionCandidates.length,
      checkpointCount: outcomeEnvelope.checkpoints.length,
    };
  },
});
