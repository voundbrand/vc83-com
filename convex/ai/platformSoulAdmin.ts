/**
 * platform_soul_admin capability boundary.
 *
 * Enforces strict L2 platform soul scope controls for privileged operations.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation, mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventName,
  type TrustEventPayload,
} from "./trustEvents";
import {
  PLATFORM_SOUL_SCOPE_CAPABILITY,
  type PlatformSoulAction,
  getPlatformSoulActionMatrix,
  resolvePlatformSoulScope,
} from "./platformSoulScope";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

const PLATFORM_SOUL_ADMIN_AUDIT_ACTION = "platform_soul_admin_action";
const PLATFORM_SOUL_ELEVATION_OBJECT_TYPE = "platform_soul_elevation";
const PLATFORM_SOUL_ELEVATION_OBJECT_SUBTYPE = "platform_soul_admin";
const PLATFORM_SOUL_ELEVATION_STATUS_ACTIVE = "active";
const PLATFORM_SOUL_STEP_UP_MAX_AGE_MS = 15 * 60 * 1000;
const PLATFORM_SOUL_ELEVATION_TTL_MS = 15 * 60 * 1000;
const PLATFORM_SOUL_DUAL_APPROVAL_MIN_APPROVERS = 2;

type PlatformSoulAuditAction = PlatformSoulAction | "elevation";

type PlatformSoulAdminTrustEvent =
  | "trust.admin.platform_soul_step_up_verified.v1"
  | "trust.admin.platform_soul_elevation_granted.v1"
  | "trust.admin.platform_soul_apply_dual_approval_recorded.v1"
  | "trust.admin.platform_soul_action_audited.v1";

interface CapabilityMatrixAction {
  action: PlatformSoulAction;
  allowed: boolean;
  reason: string;
}

interface CapabilityMatrix {
  capability: typeof PLATFORM_SOUL_SCOPE_CAPABILITY;
  actor: {
    userId: Id<"users">;
    roleName: string | null;
    isSuperAdmin: boolean;
  };
  target: {
    agentId: Id<"objects">;
    organizationId: Id<"organizations">;
    layer: string | null;
    domain: string | null;
    classification: string | null;
    scopePresent: boolean;
    scopeDeniedReason: string | null;
  };
  allowed: boolean;
  denialReason: string | null;
  actions: CapabilityMatrixAction[];
}

interface CapabilityResolution {
  matrix: CapabilityMatrix;
  agent: {
    _id: Id<"objects">;
    organizationId: Id<"organizations">;
    customProperties?: Record<string, unknown>;
  } | null;
}

interface PrivilegedEvidence {
  elevationId: Id<"objects">;
  reasonCode: string;
  ticketId: string;
}

interface ElevationValidationResult {
  ok: boolean;
  reason: string | null;
  stepUpVerifiedAt: number | null;
  elevationExpiresAt: number | null;
}

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "unknown_error";
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function isProductionRuntime(): boolean {
  const rawEnv =
    (typeof process !== "undefined" && process.env.CONVEX_ENV)
    || (typeof process !== "undefined" && process.env.NODE_ENV)
    || "";
  const normalized = rawEnv.trim().toLowerCase();
  return normalized === "production" || normalized === "prod";
}

function getPlatformOrgRestrictionReason(
  targetOrgId: Id<"organizations">,
): string | null {
  const configuredPlatformOrgId =
    (typeof process !== "undefined" && process.env.PLATFORM_ORG_ID)
    || (typeof process !== "undefined" && process.env.TEST_ORG_ID)
    || "";

  if (!configuredPlatformOrgId) {
    return null;
  }

  if (String(targetOrgId) === configuredPlatformOrgId) {
    return null;
  }

  return `Target agent org does not match configured platform org (${configuredPlatformOrgId}).`;
}

function buildActionRows(args: {
  allowed: boolean;
  denialReason: string | null;
}): CapabilityMatrixAction[] {
  const reason = args.allowed
    ? "Allowed by platform_soul_admin policy."
    : args.denialReason || "Denied by platform_soul_admin policy.";
  return getPlatformSoulActionMatrix(args.allowed).map((row) => ({
    action: row.action,
    allowed: row.allowed,
    reason,
  }));
}

async function resolveActorRole(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  userId: Id<"users">;
  organizationId: Id<"organizations">;
}): Promise<{
  isSuperAdmin: boolean;
  roleName: string | null;
  denialReason: string | null;
}> {
  try {
    const userContext = await getUserContext(args.ctx, args.userId, args.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    return {
      isSuperAdmin,
      roleName: userContext.roleName ?? null,
      denialReason: isSuperAdmin
        ? null
        : "platform_soul_admin requires super_admin role.",
    };
  } catch (error) {
    return {
      isSuperAdmin: false,
      roleName: null,
      denialReason: `Unable to resolve actor role: ${toSafeErrorMessage(error)}`,
    };
  }
}

async function resolveCapability(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  actorUserId: Id<"users">;
  organizationId: Id<"organizations">;
  targetAgentId: Id<"objects">;
}): Promise<CapabilityResolution> {
  const agent = await args.ctx.db.get(args.targetAgentId);

  const actorRole = await resolveActorRole({
    ctx: args.ctx,
    userId: args.actorUserId,
    organizationId: args.organizationId,
  });

  if (!agent) {
    const denialReason = "Target agent not found.";
    return {
      agent: null,
      matrix: {
        capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
        actor: {
          userId: args.actorUserId,
          roleName: actorRole.roleName,
          isSuperAdmin: actorRole.isSuperAdmin,
        },
        target: {
          agentId: args.targetAgentId,
          organizationId: args.organizationId,
          layer: null,
          domain: null,
          classification: null,
          scopePresent: false,
          scopeDeniedReason: denialReason,
        },
        allowed: false,
        denialReason,
        actions: buildActionRows({ allowed: false, denialReason }),
      },
    };
  }

  const customProperties =
    (agent.customProperties as Record<string, unknown> | undefined) ?? undefined;
  const scope = resolvePlatformSoulScope(customProperties);

  const orgMismatchReason =
    agent.organizationId !== args.organizationId
      ? "Target agent does not belong to the active organization context."
      : null;

  const platformOrgRestrictionReason = getPlatformOrgRestrictionReason(agent.organizationId);

  const denialReason =
    actorRole.denialReason
    || orgMismatchReason
    || platformOrgRestrictionReason
    || scope.denialReason;

  const allowed =
    actorRole.isSuperAdmin
    && !orgMismatchReason
    && !platformOrgRestrictionReason
    && scope.isPlatformL2;

  return {
    agent: {
      _id: agent._id,
      organizationId: agent.organizationId,
      customProperties,
    },
    matrix: {
      capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
      actor: {
        userId: args.actorUserId,
        roleName: actorRole.roleName,
        isSuperAdmin: actorRole.isSuperAdmin,
      },
      target: {
        agentId: agent._id,
        organizationId: agent.organizationId,
        layer: scope.layer,
        domain: scope.domain,
        classification: scope.classification,
        scopePresent: scope.scopePresent,
        scopeDeniedReason: scope.denialReason,
      },
      allowed,
      denialReason: denialReason ?? null,
      actions: buildActionRows({
        allowed,
        denialReason: denialReason ?? scope.denialReason,
      }),
    },
  };
}

async function emitPlatformSoulAdminTrustEvent(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  eventName: PlatformSoulAdminTrustEvent;
  organizationId: Id<"organizations">;
  actorUserId: Id<"users">;
  targetAgentId: Id<"objects">;
  action: PlatformSoulAuditAction;
  reasonCode: string;
  ticketId: string;
  elevationId: Id<"objects">;
  stepUpVerifiedAt: number;
  elevationExpiresAt: number;
  decision: "proceed" | "hold" | "rollback";
  dualApproverIds?: string[];
}) {
  const occurredAt = Date.now();
  const payload: TrustEventPayload = {
    event_id: `${args.eventName}:${String(args.targetAgentId)}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: "admin",
    channel: "platform_soul_admin",
    session_id: `platform_soul_admin:${String(args.targetAgentId)}`,
    actor_type: "admin",
    actor_id: String(args.actorUserId),
    platform_agent_id: String(args.targetAgentId),
    privileged_action: args.action,
    privileged_reason_code: args.reasonCode,
    privileged_ticket_id: args.ticketId,
    privileged_elevation_id: String(args.elevationId),
    privileged_step_up_verified_at: args.stepUpVerifiedAt,
    privileged_elevation_expires_at: args.elevationExpiresAt,
    privileged_dual_approver_ids: args.dualApproverIds,
    privileged_decision: args.decision,
    event_namespace: `${TRUST_EVENT_NAMESPACE}.admin`,
  };

  const validation = validateTrustEventPayload(args.eventName, payload);
  await args.ctx.db.insert("aiTrustEvents", {
    event_name: args.eventName as TrustEventName,
    payload,
    schema_validation_status: validation.ok ? "passed" : "failed",
    schema_errors: validation.ok ? undefined : validation.errors,
    created_at: occurredAt,
  });
}

async function resolveStepUpSession(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  sessionId: string;
  actorUserId: Id<"users">;
  organizationId: Id<"organizations">;
}): Promise<{
  stepUpVerifiedAt: number;
  stepUpMethod: string;
}> {
  const session = await args.ctx.db.get(args.sessionId as Id<"sessions">);
  if (!session) {
    throw new Error("Session not found for step-up verification.");
  }
  if (session.userId !== args.actorUserId) {
    throw new Error("Step-up verification failed: session user mismatch.");
  }
  if (session.organizationId !== args.organizationId) {
    throw new Error("Step-up verification failed: session org mismatch.");
  }

  const now = Date.now();
  if (now - session.createdAt > PLATFORM_SOUL_STEP_UP_MAX_AGE_MS) {
    throw new Error(
      "Step-up verification expired. Re-authenticate and retry privileged action."
    );
  }

  const activePasskey = await args.ctx.db
    .query("passkeys")
    .withIndex("by_user_active", (q: any) =>
      q.eq("userId", args.actorUserId).eq("isActive", true)
    )
    .first();

  if (!activePasskey) {
    throw new Error(
      "Step-up verification requires at least one active passkey enrollment."
    );
  }

  return {
    stepUpVerifiedAt: now,
    stepUpMethod: "session_reauth_plus_passkey_presence",
  };
}

async function createPrivilegeElevation(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  actorUserId: Id<"users">;
  organizationId: Id<"organizations">;
  targetAgentId: Id<"objects">;
  reasonCode: string;
  ticketId: string;
  stepUpVerifiedAt: number;
  stepUpMethod: string;
}): Promise<{
  elevationId: Id<"objects">;
  elevationExpiresAt: number;
}> {
  const now = Date.now();
  const elevationExpiresAt = now + PLATFORM_SOUL_ELEVATION_TTL_MS;

  const elevationId = await args.ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: PLATFORM_SOUL_ELEVATION_OBJECT_TYPE,
    subtype: PLATFORM_SOUL_ELEVATION_OBJECT_SUBTYPE,
    name: `platform_soul_admin elevation ${String(args.targetAgentId)}`,
    description: "Time-bound elevation for privileged platform soul administration.",
    status: PLATFORM_SOUL_ELEVATION_STATUS_ACTIVE,
    customProperties: {
      actorUserId: String(args.actorUserId),
      targetAgentId: String(args.targetAgentId),
      reasonCode: args.reasonCode,
      ticketId: args.ticketId,
      stepUpVerifiedAt: args.stepUpVerifiedAt,
      stepUpMethod: args.stepUpMethod,
      elevationExpiresAt,
    },
    createdBy: args.actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    elevationId,
    elevationExpiresAt,
  };
}

async function validatePrivilegeElevation(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  actorUserId: Id<"users">;
  organizationId: Id<"organizations">;
  targetAgentId: Id<"objects">;
  evidence: PrivilegedEvidence;
}): Promise<ElevationValidationResult> {
  const elevation = await args.ctx.db.get(args.evidence.elevationId);
  if (!elevation) {
    return {
      ok: false,
      reason: "Privilege elevation record not found.",
      stepUpVerifiedAt: null,
      elevationExpiresAt: null,
    };
  }

  if (
    elevation.type !== PLATFORM_SOUL_ELEVATION_OBJECT_TYPE
    || elevation.subtype !== PLATFORM_SOUL_ELEVATION_OBJECT_SUBTYPE
  ) {
    return {
      ok: false,
      reason: "Provided elevationId is not a platform_soul_admin elevation.",
      stepUpVerifiedAt: null,
      elevationExpiresAt: null,
    };
  }

  if (elevation.status !== PLATFORM_SOUL_ELEVATION_STATUS_ACTIVE) {
    return {
      ok: false,
      reason: "Privilege elevation is not active.",
      stepUpVerifiedAt: null,
      elevationExpiresAt: null,
    };
  }

  if (elevation.organizationId !== args.organizationId) {
    return {
      ok: false,
      reason: "Privilege elevation organization mismatch.",
      stepUpVerifiedAt: null,
      elevationExpiresAt: null,
    };
  }

  const props = (elevation.customProperties || {}) as Record<string, unknown>;
  const actorUserId = normalizeNonEmptyString(props.actorUserId);
  const targetAgentId = normalizeNonEmptyString(props.targetAgentId);
  const reasonCode = normalizeNonEmptyString(props.reasonCode);
  const ticketId = normalizeNonEmptyString(props.ticketId);
  const stepUpVerifiedAt = normalizeFiniteNumber(props.stepUpVerifiedAt);
  const elevationExpiresAt = normalizeFiniteNumber(props.elevationExpiresAt);

  if (!actorUserId || actorUserId !== String(args.actorUserId)) {
    return {
      ok: false,
      reason: "Privilege elevation actor mismatch.",
      stepUpVerifiedAt,
      elevationExpiresAt,
    };
  }

  if (!targetAgentId || targetAgentId !== String(args.targetAgentId)) {
    return {
      ok: false,
      reason: "Privilege elevation target mismatch.",
      stepUpVerifiedAt,
      elevationExpiresAt,
    };
  }

  if (!reasonCode || reasonCode !== args.evidence.reasonCode) {
    return {
      ok: false,
      reason: "Privilege elevation reason code mismatch.",
      stepUpVerifiedAt,
      elevationExpiresAt,
    };
  }

  if (!ticketId || ticketId !== args.evidence.ticketId) {
    return {
      ok: false,
      reason: "Privilege elevation ticket reference mismatch.",
      stepUpVerifiedAt,
      elevationExpiresAt,
    };
  }

  if (!stepUpVerifiedAt || !elevationExpiresAt) {
    return {
      ok: false,
      reason: "Privilege elevation is missing step-up evidence.",
      stepUpVerifiedAt,
      elevationExpiresAt,
    };
  }

  if (Date.now() > elevationExpiresAt) {
    return {
      ok: false,
      reason: "Privilege elevation has expired.",
      stepUpVerifiedAt,
      elevationExpiresAt,
    };
  }

  return {
    ok: true,
    reason: null,
    stepUpVerifiedAt,
    elevationExpiresAt,
  };
}

async function collectDualApprovalApprovers(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  targetAgentId: Id<"objects">;
  proposalId: Id<"soulProposals">;
}): Promise<string[]> {
  const actions = await args.ctx.db
    .query("objectActions")
    .withIndex("by_object", (q: any) => q.eq("objectId", args.targetAgentId))
    .collect();

  const approvers = new Set<string>();
  for (const action of actions) {
    if (action.organizationId !== args.organizationId) continue;
    if (action.actionType !== PLATFORM_SOUL_ADMIN_AUDIT_ACTION) continue;

    const actionData = (action.actionData || {}) as Record<string, unknown>;
    if (actionData.action !== "approve_apply") continue;
    if (actionData.phase !== "dual_approval_vote") continue;
    if (actionData.proposalId !== String(args.proposalId)) continue;

    if (action.performedBy) {
      approvers.add(String(action.performedBy));
    }
  }

  return Array.from(approvers);
}

async function writeAuditAction(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  targetAgentId: Id<"objects">;
  actorUserId: Id<"users">;
  action: PlatformSoulAuditAction;
  status: "allowed" | "denied" | "error";
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.targetAgentId,
    actionType: PLATFORM_SOUL_ADMIN_AUDIT_ACTION,
    actionData: {
      capability: PLATFORM_SOUL_SCOPE_CAPABILITY,
      action: args.action,
      status: args.status,
      reason: args.reason,
      ...(args.metadata ?? {}),
    },
    performedBy: args.actorUserId,
    performedAt: Date.now(),
  });
}

function requireReasonAndTicket(args: {
  reasonCode: string;
  ticketId: string;
}): {
  reasonCode: string;
  ticketId: string;
} {
  const reasonCode = normalizeNonEmptyString(args.reasonCode);
  const ticketId = normalizeNonEmptyString(args.ticketId);
  if (!reasonCode) {
    throw new Error("Privileged action requires a non-empty reasonCode.");
  }
  if (!ticketId) {
    throw new Error("Privileged action requires a non-empty ticketId.");
  }
  return {
    reasonCode,
    ticketId,
  };
}

function requirePrivilegedEvidence(args: {
  elevationId: Id<"objects">;
  reasonCode: string;
  ticketId: string;
}): PrivilegedEvidence {
  const evidence = requireReasonAndTicket({
    reasonCode: args.reasonCode,
    ticketId: args.ticketId,
  });
  return {
    elevationId: args.elevationId,
    reasonCode: evidence.reasonCode,
    ticketId: evidence.ticketId,
  };
}

function ensureAllowedOrThrow(args: {
  action: PlatformSoulAction;
  matrix: CapabilityMatrix;
}): void {
  if (!args.matrix.allowed) {
    throw new Error(
      args.matrix.denialReason
        || `platform_soul_admin denied action '${args.action}'.`
    );
  }
}

export const resolveCapabilityMatrix = internalQuery({
  args: {
    actorUserId: v.id("users"),
    organizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const resolution = await resolveCapability({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
    });

    return resolution.matrix;
  },
});

export const startScopedElevation = internalMutation({
  args: {
    actorUserId: v.id("users"),
    organizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
    sessionId: v.string(),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const evidence = requireReasonAndTicket({
      reasonCode: args.reasonCode,
      ticketId: args.ticketId,
    });

    const resolution = await resolveCapability({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
    });

    if (!resolution.matrix.allowed) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "elevation",
        status: "denied",
        reason:
          resolution.matrix.denialReason
          || "platform_soul_admin denied elevation request.",
        metadata: {
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      ensureAllowedOrThrow({ action: "propose", matrix: resolution.matrix });
    }

    const stepUp = await resolveStepUpSession({
      ctx,
      sessionId: args.sessionId,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
    });

    const elevation = await createPrivilegeElevation({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
      stepUpVerifiedAt: stepUp.stepUpVerifiedAt,
      stepUpMethod: stepUp.stepUpMethod,
    });

    await writeAuditAction({
      ctx,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      actorUserId: args.actorUserId,
      action: "elevation",
      status: "allowed",
      reason: "Time-bound privilege elevation granted.",
      metadata: {
        elevationId: String(elevation.elevationId),
        stepUpVerifiedAt: stepUp.stepUpVerifiedAt,
        elevationExpiresAt: elevation.elevationExpiresAt,
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
      },
    });

    await emitPlatformSoulAdminTrustEvent({
      ctx,
      eventName: "trust.admin.platform_soul_step_up_verified.v1",
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      targetAgentId: args.targetAgentId,
      action: "elevation",
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
      elevationId: elevation.elevationId,
      stepUpVerifiedAt: stepUp.stepUpVerifiedAt,
      elevationExpiresAt: elevation.elevationExpiresAt,
      decision: "proceed",
    });

    await emitPlatformSoulAdminTrustEvent({
      ctx,
      eventName: "trust.admin.platform_soul_elevation_granted.v1",
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      targetAgentId: args.targetAgentId,
      action: "elevation",
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
      elevationId: elevation.elevationId,
      stepUpVerifiedAt: stepUp.stepUpVerifiedAt,
      elevationExpiresAt: elevation.elevationExpiresAt,
      decision: "proceed",
    });

    return {
      success: true,
      resultLabel: "PASS",
      matrix: resolution.matrix,
      elevationId: elevation.elevationId,
      stepUpVerifiedAt: stepUp.stepUpVerifiedAt,
      elevationExpiresAt: elevation.elevationExpiresAt,
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
    };
  },
});

export const viewScopedSoul = internalQuery({
  args: {
    actorUserId: v.id("users"),
    organizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
    historyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resolution = await resolveCapability({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
    });

    if (!resolution.matrix.allowed || !resolution.agent) {
      return {
        allowed: false,
        matrix: resolution.matrix,
        resultLabel: "FAIL",
      };
    }

    const agent = await ctx.db.get(resolution.agent._id);
    if (!agent) {
      return {
        allowed: false,
        matrix: resolution.matrix,
        resultLabel: "FAIL",
        error: "Target agent not found.",
      };
    }

    const customProperties =
      (agent.customProperties as Record<string, unknown> | undefined) ?? undefined;
    const soul =
      customProperties && typeof customProperties.soul === "object"
        ? customProperties.soul
        : null;

    const pendingProposals = await ctx.db
      .query("soulProposals")
      .withIndex("by_agent_status", (q) =>
        q.eq("agentId", args.targetAgentId).eq("status", "pending")
      )
      .collect();

    const history = await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) => q.eq("agentId", args.targetAgentId))
      .order("desc")
      .take(args.historyLimit ?? 5);

    return {
      allowed: true,
      matrix: resolution.matrix,
      resultLabel: "PASS",
      target: {
        agentId: agent._id,
        agentName: agent.name,
        organizationId: agent.organizationId,
      },
      soul,
      pendingProposalCount: pendingProposals.length,
      pendingProposals: pendingProposals.map((proposal) => ({
        proposalId: proposal._id,
        status: proposal.status,
        proposalType: proposal.proposalType,
        targetField: proposal.targetField,
        reason: proposal.reason,
        createdAt: proposal.createdAt,
      })),
      recentHistory: history.map((entry) => ({
        version: entry.version,
        changeType: entry.changeType,
        changedBy: entry.changedBy,
        changedAt: entry.changedAt,
      })),
    };
  },
});

export const proposeScopedSoulProposal = internalMutation({
  args: {
    actorUserId: v.id("users"),
    organizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
    proposalType: v.union(
      v.literal("add"),
      v.literal("modify"),
      v.literal("remove"),
      v.literal("add_faq"),
    ),
    targetField: v.string(),
    proposedValue: v.string(),
    reason: v.string(),
    currentValue: v.optional(v.string()),
    sessionId: v.optional(v.id("agentSessions")),
    elevationId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const evidence = requirePrivilegedEvidence({
      elevationId: args.elevationId,
      reasonCode: args.reasonCode,
      ticketId: args.ticketId,
    });

    const resolution = await resolveCapability({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
    });

    if (!resolution.matrix.allowed) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "propose",
        status: "denied",
        reason:
          resolution.matrix.denialReason ||
          "platform_soul_admin denied propose action.",
        metadata: {
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      ensureAllowedOrThrow({ action: "propose", matrix: resolution.matrix });
    }

    const elevationValidation = await validatePrivilegeElevation({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      evidence,
    });

    if (!elevationValidation.ok) {
      const denialReason =
        elevationValidation.reason
        || "Privileged elevation validation failed for propose action.";
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "propose",
        status: "denied",
        reason: denialReason,
        metadata: {
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      throw new Error(denialReason);
    }

    const proposalId = await ctx.runMutation(
      generatedApi.internal.ai.soulEvolution.createProposal,
      {
        organizationId: args.organizationId,
        agentId: args.targetAgentId,
        sessionId: args.sessionId,
        proposalType: args.proposalType,
        targetField: args.targetField,
        currentValue: args.currentValue,
        proposedValue: args.proposedValue,
        reason: args.reason,
        triggerType: "owner_directed",
        evidenceMessages: [
          `platform_soul_admin proposal by ${String(args.actorUserId)}`,
        ],
      },
    );

    if (!proposalId) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "propose",
        status: "error",
        reason: "Proposal blocked by downstream soul guardrails.",
        metadata: {
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });

      await emitPlatformSoulAdminTrustEvent({
        ctx,
        eventName: "trust.admin.platform_soul_action_audited.v1",
        organizationId: args.organizationId,
        actorUserId: args.actorUserId,
        targetAgentId: args.targetAgentId,
        action: "propose",
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
        elevationId: evidence.elevationId,
        stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
        elevationExpiresAt: elevationValidation.elevationExpiresAt!,
        decision: "hold",
      });

      return {
        success: false,
        resultLabel: "FAIL",
        matrix: resolution.matrix,
        error: "Proposal blocked by soul guardrails.",
      };
    }

    await writeAuditAction({
      ctx,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      actorUserId: args.actorUserId,
      action: "propose",
      status: "allowed",
      reason: "Proposal created.",
      metadata: {
        proposalId: String(proposalId),
        elevationId: String(evidence.elevationId),
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
      },
    });

    await emitPlatformSoulAdminTrustEvent({
      ctx,
      eventName: "trust.admin.platform_soul_action_audited.v1",
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      targetAgentId: args.targetAgentId,
      action: "propose",
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
      elevationId: evidence.elevationId,
      stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
      elevationExpiresAt: elevationValidation.elevationExpiresAt!,
      decision: "proceed",
    });

    return {
      success: true,
      resultLabel: "PASS",
      matrix: resolution.matrix,
      proposalId,
    };
  },
});

export const approveApplyScopedSoulProposal = internalMutation({
  args: {
    actorUserId: v.id("users"),
    organizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
    proposalId: v.id("soulProposals"),
    elevationId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const evidence = requirePrivilegedEvidence({
      elevationId: args.elevationId,
      reasonCode: args.reasonCode,
      ticketId: args.ticketId,
    });

    const resolution = await resolveCapability({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
    });

    if (!resolution.matrix.allowed) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "approve_apply",
        status: "denied",
        reason:
          resolution.matrix.denialReason
          || "platform_soul_admin denied approve_apply action.",
        metadata: {
          proposalId: String(args.proposalId),
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      ensureAllowedOrThrow({ action: "approve_apply", matrix: resolution.matrix });
    }

    const elevationValidation = await validatePrivilegeElevation({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      evidence,
    });

    if (!elevationValidation.ok) {
      const denialReason =
        elevationValidation.reason
        || "Privileged elevation validation failed for approve_apply action.";
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "approve_apply",
        status: "denied",
        reason: denialReason,
        metadata: {
          proposalId: String(args.proposalId),
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      throw new Error(denialReason);
    }

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "approve_apply",
        status: "error",
        reason: "Proposal not found.",
        metadata: {
          proposalId: String(args.proposalId),
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      await emitPlatformSoulAdminTrustEvent({
        ctx,
        eventName: "trust.admin.platform_soul_action_audited.v1",
        organizationId: args.organizationId,
        actorUserId: args.actorUserId,
        targetAgentId: args.targetAgentId,
        action: "approve_apply",
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
        elevationId: evidence.elevationId,
        stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
        elevationExpiresAt: elevationValidation.elevationExpiresAt!,
        decision: "rollback",
      });
      throw new Error("Proposal not found.");
    }

    if (proposal.agentId !== args.targetAgentId) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "approve_apply",
        status: "error",
        reason: "Proposal does not belong to target agent.",
        metadata: {
          proposalId: String(args.proposalId),
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      await emitPlatformSoulAdminTrustEvent({
        ctx,
        eventName: "trust.admin.platform_soul_action_audited.v1",
        organizationId: args.organizationId,
        actorUserId: args.actorUserId,
        targetAgentId: args.targetAgentId,
        action: "approve_apply",
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
        elevationId: evidence.elevationId,
        stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
        elevationExpiresAt: elevationValidation.elevationExpiresAt!,
        decision: "rollback",
      });
      throw new Error("Proposal does not belong to target agent.");
    }

    const dualApproverSet = new Set<string>();
    if (isProductionRuntime()) {
      const existingApprovers = await collectDualApprovalApprovers({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        proposalId: args.proposalId,
      });
      for (const approver of existingApprovers) {
        dualApproverSet.add(approver);
      }
      const actorId = String(args.actorUserId);
      if (!dualApproverSet.has(actorId)) {
        dualApproverSet.add(actorId);
        await writeAuditAction({
          ctx,
          organizationId: args.organizationId,
          targetAgentId: args.targetAgentId,
          actorUserId: args.actorUserId,
          action: "approve_apply",
          status: "allowed",
          reason: "Dual-approval vote recorded.",
          metadata: {
            phase: "dual_approval_vote",
            proposalId: String(args.proposalId),
            approverCount: dualApproverSet.size,
            elevationId: String(evidence.elevationId),
            reasonCode: evidence.reasonCode,
            ticketId: evidence.ticketId,
          },
        });
      }

      const dualApprovers = Array.from(dualApproverSet);
      await emitPlatformSoulAdminTrustEvent({
        ctx,
        eventName: "trust.admin.platform_soul_apply_dual_approval_recorded.v1",
        organizationId: args.organizationId,
        actorUserId: args.actorUserId,
        targetAgentId: args.targetAgentId,
        action: "approve_apply",
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
        elevationId: evidence.elevationId,
        stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
        elevationExpiresAt: elevationValidation.elevationExpiresAt!,
        decision:
          dualApproverSet.size >= PLATFORM_SOUL_DUAL_APPROVAL_MIN_APPROVERS
            ? "proceed"
            : "hold",
        dualApproverIds: dualApprovers,
      });

      if (dualApproverSet.size < PLATFORM_SOUL_DUAL_APPROVAL_MIN_APPROVERS) {
        return {
          success: false,
          resultLabel: "HOLD",
          decision: "hold",
          matrix: resolution.matrix,
          dualApproval: {
            requiredApprovers: PLATFORM_SOUL_DUAL_APPROVAL_MIN_APPROVERS,
            approvers: dualApprovers,
            proposalId: args.proposalId,
          },
          message:
            "Production apply requires dual approval from two distinct super-admin operators.",
        };
      }
    }

    await ctx.runMutation(generatedApi.internal.ai.soulEvolution.approveProposal, {
      proposalId: args.proposalId,
      approvedBy: `platform_soul_admin:${String(args.actorUserId)}`,
    });

    const applyResult = await ctx.runMutation(
      generatedApi.internal.ai.soulEvolution.applyProposal,
      {
        proposalId: args.proposalId,
      },
    );

    await writeAuditAction({
      ctx,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      actorUserId: args.actorUserId,
      action: "approve_apply",
      status: "allowed",
      reason: "Proposal approved and applied.",
      metadata: {
        proposalId: String(args.proposalId),
        phase: "apply_executed",
        dualApproverIds: Array.from(dualApproverSet),
        elevationId: String(evidence.elevationId),
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
      },
    });

    await emitPlatformSoulAdminTrustEvent({
      ctx,
      eventName: "trust.admin.platform_soul_action_audited.v1",
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      targetAgentId: args.targetAgentId,
      action: "approve_apply",
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
      elevationId: evidence.elevationId,
      stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
      elevationExpiresAt: elevationValidation.elevationExpiresAt!,
      decision: "proceed",
      dualApproverIds: Array.from(dualApproverSet),
    });

    return {
      success: true,
      resultLabel: "PASS",
      matrix: resolution.matrix,
      applyResult,
    };
  },
});

export const rollbackScopedSoul = internalMutation({
  args: {
    actorUserId: v.id("users"),
    organizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
    targetVersion: v.number(),
    elevationId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const evidence = requirePrivilegedEvidence({
      elevationId: args.elevationId,
      reasonCode: args.reasonCode,
      ticketId: args.ticketId,
    });

    const resolution = await resolveCapability({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
    });

    if (!resolution.matrix.allowed) {
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "rollback",
        status: "denied",
        reason:
          resolution.matrix.denialReason
          || "platform_soul_admin denied rollback action.",
        metadata: {
          targetVersion: args.targetVersion,
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      ensureAllowedOrThrow({ action: "rollback", matrix: resolution.matrix });
    }

    const elevationValidation = await validatePrivilegeElevation({
      ctx,
      actorUserId: args.actorUserId,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      evidence,
    });

    if (!elevationValidation.ok) {
      const denialReason =
        elevationValidation.reason
        || "Privileged elevation validation failed for rollback action.";
      await writeAuditAction({
        ctx,
        organizationId: args.organizationId,
        targetAgentId: args.targetAgentId,
        actorUserId: args.actorUserId,
        action: "rollback",
        status: "denied",
        reason: denialReason,
        metadata: {
          targetVersion: args.targetVersion,
          elevationId: String(evidence.elevationId),
          reasonCode: evidence.reasonCode,
          ticketId: evidence.ticketId,
        },
      });
      throw new Error(denialReason);
    }

    const rollbackResult = await ctx.runMutation(
      generatedApi.internal.ai.soulEvolution.rollbackSoul,
      {
        agentId: args.targetAgentId,
        targetVersion: args.targetVersion,
        requestedBy: `platform_soul_admin:${String(args.actorUserId)}`,
      },
    );

    await writeAuditAction({
      ctx,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
      actorUserId: args.actorUserId,
      action: "rollback",
      status: "allowed",
      reason: "Rollback executed.",
      metadata: {
        targetVersion: args.targetVersion,
        elevationId: String(evidence.elevationId),
        reasonCode: evidence.reasonCode,
        ticketId: evidence.ticketId,
      },
    });

    await emitPlatformSoulAdminTrustEvent({
      ctx,
      eventName: "trust.admin.platform_soul_action_audited.v1",
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      targetAgentId: args.targetAgentId,
      action: "rollback",
      reasonCode: evidence.reasonCode,
      ticketId: evidence.ticketId,
      elevationId: evidence.elevationId,
      stepUpVerifiedAt: elevationValidation.stepUpVerifiedAt!,
      elevationExpiresAt: elevationValidation.elevationExpiresAt!,
      decision: "proceed",
    });

    return {
      success: true,
      resultLabel: "PASS",
      matrix: resolution.matrix,
      rollbackResult,
    };
  },
});

export const getPlatformManagedChannelBindingOverrideAuth = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(
      ctx,
      args.sessionId
    );
    const userContext = await getUserContext(ctx, userId, organizationId);
    const allowed =
      userContext.isGlobal && userContext.roleName === "super_admin";

    return {
      allowed,
      roleName: userContext.roleName ?? null,
      reason: allowed
        ? null
        : "Platform-managed channel binding overrides require super_admin role.",
    };
  },
});

export const getPlatformSoulAdminCapability = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.runQuery(
      generatedApi.internal.ai.platformSoulAdmin.resolveCapabilityMatrix,
      {
        actorUserId: userId,
        organizationId,
        targetAgentId: args.agentId,
      },
    );
  },
});

export const viewPlatformSoulAdminSoulAuth = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    historyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.runQuery(
      generatedApi.internal.ai.platformSoulAdmin.viewScopedSoul,
      {
        actorUserId: userId,
        organizationId,
        targetAgentId: args.agentId,
        historyLimit: args.historyLimit,
      },
    );
  },
});

export const startPlatformSoulAdminElevationAuth = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.runMutation(
      generatedApi.internal.ai.platformSoulAdmin.startScopedElevation,
      {
        actorUserId: userId,
        organizationId,
        targetAgentId: args.agentId,
        sessionId: args.sessionId,
        reasonCode: args.reasonCode,
        ticketId: args.ticketId,
      },
    );
  },
});

export const proposePlatformSoulUpdateAuth = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    proposalType: v.union(
      v.literal("add"),
      v.literal("modify"),
      v.literal("remove"),
      v.literal("add_faq"),
    ),
    targetField: v.string(),
    proposedValue: v.string(),
    reason: v.string(),
    currentValue: v.optional(v.string()),
    elevationId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.runMutation(
      generatedApi.internal.ai.platformSoulAdmin.proposeScopedSoulProposal,
      {
        actorUserId: userId,
        organizationId,
        targetAgentId: args.agentId,
        proposalType: args.proposalType,
        targetField: args.targetField,
        proposedValue: args.proposedValue,
        reason: args.reason,
        currentValue: args.currentValue,
        elevationId: args.elevationId,
        reasonCode: args.reasonCode,
        ticketId: args.ticketId,
      },
    );
  },
});

export const approveApplyPlatformSoulProposalAuth = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    proposalId: v.id("soulProposals"),
    elevationId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.runMutation(
      generatedApi.internal.ai.platformSoulAdmin.approveApplyScopedSoulProposal,
      {
        actorUserId: userId,
        organizationId,
        targetAgentId: args.agentId,
        proposalId: args.proposalId,
        elevationId: args.elevationId,
        reasonCode: args.reasonCode,
        ticketId: args.ticketId,
      },
    );
  },
});

export const rollbackPlatformSoulAuth = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    targetVersion: v.number(),
    elevationId: v.id("objects"),
    reasonCode: v.string(),
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.runMutation(generatedApi.internal.ai.platformSoulAdmin.rollbackScopedSoul, {
      actorUserId: userId,
      organizationId,
      targetAgentId: args.agentId,
      targetVersion: args.targetVersion,
      elevationId: args.elevationId,
      reasonCode: args.reasonCode,
      ticketId: args.ticketId,
    });
  },
});
