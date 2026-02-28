/**
 * TEAM HARNESS — Agent-to-Agent Handoff Execution & Validation
 *
 * Manages team sessions: handoff execution, validation (limits, cooldowns, permissions),
 * context transfer, and handoff history tracking.
 *
 * Called by: tag_in_specialist tool (teamTools.ts) and agentExecution.ts pipeline.
 *
 * See: docs/platform/TEAM_COORDINATION.md
 * See: docs/platform/implementation_plans/P2_TEAM_HARNESS.md
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { teamHandoffPayloadValidator } from "../schemas/agentSessionSchemas";
import {
  isDreamTeamSpecialistContractInWorkspaceScope,
  normalizeDreamTeamSpecialistContracts,
  normalizeTeamAccessModeToken,
  resolveDreamTeamSpecialistContract,
  type DreamTeamWorkspaceType,
  type DreamTeamSpecialistRuntimeContract,
  type TeamAccessMode,
} from "./harness";
import { composeSpecialistMemoryContext } from "./memoryComposer";

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_MAX_HANDOFFS_PER_SESSION = 5;
const DEFAULT_HANDOFF_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const DM_SUMMARY_SYNC_BRIDGE_SOURCE = "dm_summary_sync_bridge";
const DM_SUMMARY_SYNC_WORKFLOW_KEY = "commit";

interface TeamHandoffPayload {
  reason: string;
  summary: string;
  goal: string;
}

interface TeamHandoffProvenance {
  selectionStrategy: "contract" | "fallback_subtype";
  requestedSpecialistType: string;
  requestedSpecialistId?: string;
  matchedBy:
    | "specialist_id"
    | "contract_subtype"
    | "contract_name"
    | "fallback_subtype";
  contractSoulBlendId?: string;
  contractSpecialistId?: string;
  contractSpecialistSubtype?: string;
  contractSpecialistName?: string;
  candidateCount: number;
  catalogSize: number;
}

const handoffProvenanceValidator = v.object({
  selectionStrategy: v.union(v.literal("contract"), v.literal("fallback_subtype")),
  requestedSpecialistType: v.string(),
  requestedSpecialistId: v.optional(v.string()),
  matchedBy: v.union(
    v.literal("specialist_id"),
    v.literal("contract_subtype"),
    v.literal("contract_name"),
    v.literal("fallback_subtype")
  ),
  contractSoulBlendId: v.optional(v.string()),
  contractSpecialistId: v.optional(v.string()),
  contractSpecialistSubtype: v.optional(v.string()),
  contractSpecialistName: v.optional(v.string()),
  candidateCount: v.number(),
  catalogSize: v.number(),
});

interface LegacyHandoffHistoryEntry {
  fromAgentId: Id<"objects">;
  toAgentId: Id<"objects">;
  reason?: string;
  summary?: string;
  goal?: string;
  contextSummary?: string;
  timestamp?: number;
}

interface SessionChannelRouteIdentityRecord {
  bindingId?: Id<"objects">;
  providerId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: "platform" | "organization";
  routeKey?: string;
}

interface SessionRoutingMetadataRecord {
  contractVersion: "occ_operator_routing_v1";
  tenantId: string;
  lineageId: string;
  threadId: string;
  workflowKey: string;
  updatedAt: number;
  updatedBy?: string;
}

export interface TeamHandoffRoutingDecision<IdLike extends string = string> {
  allowed: boolean;
  teamAccessMode: TeamAccessMode;
  authorityAgentId: IdLike;
  activeAgentId: IdLike;
  error?: string;
}

export function resolveTeamHandoffRoutingDecision<IdLike extends string>(
  args: {
    teamAccessMode: TeamAccessMode;
    fromAgentId: IdLike;
    toAgentId: IdLike;
    primaryAgentId?: IdLike;
    specialistContract?: DreamTeamSpecialistRuntimeContract;
  }
): TeamHandoffRoutingDecision<IdLike> {
  const primaryAgentId = args.primaryAgentId ?? args.fromAgentId;
  if (args.teamAccessMode === "direct") {
    if (args.specialistContract && args.specialistContract.directAccessEnabled === false) {
      return {
        allowed: false,
        teamAccessMode: args.teamAccessMode,
        authorityAgentId: primaryAgentId,
        activeAgentId: primaryAgentId,
        error: "Direct specialist access is disabled for this Dream Team contract.",
      };
    }
    return {
      allowed: true,
      teamAccessMode: args.teamAccessMode,
      authorityAgentId: primaryAgentId,
      activeAgentId: args.toAgentId,
    };
  }

  if (args.teamAccessMode === "meeting") {
    if (args.specialistContract && args.specialistContract.meetingParticipant === false) {
      return {
        allowed: false,
        teamAccessMode: args.teamAccessMode,
        authorityAgentId: primaryAgentId,
        activeAgentId: primaryAgentId,
        error: "Meeting participation is disabled for this Dream Team contract.",
      };
    }
    return {
      allowed: true,
      teamAccessMode: args.teamAccessMode,
      authorityAgentId: primaryAgentId,
      activeAgentId: primaryAgentId,
    };
  }

  return {
    allowed: true,
    teamAccessMode: "invisible",
    authorityAgentId: primaryAgentId,
    activeAgentId: primaryAgentId,
  };
}

// Lazy-load internal to avoid circular dependency with _generated/api.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalRef: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalRef) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalRef = require("../_generated/api").internal;
  }
  return _internalRef;
}

function normalizeHandoffString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHandoffNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function resolveWorkspaceTypeFromOrganization(
  organization: { isPersonalWorkspace?: boolean } | null,
): DreamTeamWorkspaceType {
  return organization?.isPersonalWorkspace === true ? "personal" : "business";
}

function normalizeHandoffProvenance(
  value: unknown
): TeamHandoffProvenance | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const selectionStrategy = normalizeHandoffString(record.selectionStrategy);
  const matchedBy = normalizeHandoffString(record.matchedBy);
  const requestedSpecialistType = normalizeHandoffString(record.requestedSpecialistType);
  const candidateCount = normalizeHandoffNumber(record.candidateCount);
  const catalogSize = normalizeHandoffNumber(record.catalogSize);
  if (
    (selectionStrategy !== "contract" && selectionStrategy !== "fallback_subtype")
    || (matchedBy !== "specialist_id"
      && matchedBy !== "contract_subtype"
      && matchedBy !== "contract_name"
      && matchedBy !== "fallback_subtype")
    || !requestedSpecialistType
    || candidateCount === undefined
    || catalogSize === undefined
  ) {
    return undefined;
  }
  return {
    selectionStrategy,
    requestedSpecialistType,
    requestedSpecialistId: normalizeHandoffString(record.requestedSpecialistId) || undefined,
    matchedBy,
    contractSoulBlendId: normalizeHandoffString(record.contractSoulBlendId) || undefined,
    contractSpecialistId: normalizeHandoffString(record.contractSpecialistId) || undefined,
    contractSpecialistSubtype: normalizeHandoffString(record.contractSpecialistSubtype) || undefined,
    contractSpecialistName: normalizeHandoffString(record.contractSpecialistName) || undefined,
    candidateCount,
    catalogSize,
  };
}

function deriveHandoffProvenance(args: {
  provided?: TeamHandoffProvenance;
  specialistContract?: DreamTeamSpecialistRuntimeContract;
  targetAgentId: Id<"objects">;
  targetAgentSubtype?: string;
  catalogSize: number;
}): TeamHandoffProvenance {
  if (args.provided) {
    return args.provided;
  }
  const specialistContract = args.specialistContract;
  const contractMatchedBy =
    specialistContract?.specialistId
    && specialistContract.specialistId === String(args.targetAgentId)
      ? "specialist_id"
      : specialistContract?.specialistName
        ? "contract_name"
        : specialistContract
          ? "contract_subtype"
          : "fallback_subtype";
  const requestedSpecialistType =
    normalizeHandoffString(args.targetAgentSubtype) || "unknown";
  return {
    selectionStrategy: specialistContract ? "contract" : "fallback_subtype",
    requestedSpecialistType,
    matchedBy: contractMatchedBy,
    contractSoulBlendId: specialistContract?.soulBlendId,
    contractSpecialistId: specialistContract?.specialistId,
    contractSpecialistSubtype: specialistContract?.specialistSubtype,
    contractSpecialistName: specialistContract?.specialistName,
    candidateCount: 1,
    catalogSize: args.catalogSize,
  };
}

function normalizeSyncString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRouteProfileType(
  value: unknown
): "platform" | "organization" | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function normalizeSessionChannelRouteIdentity(
  value: unknown
): SessionChannelRouteIdentityRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const normalized: SessionChannelRouteIdentityRecord = {
    bindingId: normalizeSyncString(record.bindingId) as Id<"objects"> | undefined,
    providerId: normalizeSyncString(record.providerId) || undefined,
    providerConnectionId: normalizeSyncString(record.providerConnectionId) || undefined,
    providerAccountId: normalizeSyncString(record.providerAccountId) || undefined,
    providerInstallationId: normalizeSyncString(record.providerInstallationId) || undefined,
    providerProfileId: normalizeSyncString(record.providerProfileId) || undefined,
    providerProfileType: normalizeRouteProfileType(record.providerProfileType),
    routeKey: normalizeSyncString(record.routeKey) || undefined,
  };
  return Object.values(normalized).some((entry) => Boolean(entry))
    ? normalized
    : undefined;
}

function normalizeSessionRoutingMetadata(
  value: unknown
): SessionRoutingMetadataRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.contractVersion !== "occ_operator_routing_v1") {
    return undefined;
  }
  const tenantId = normalizeSyncString(record.tenantId);
  const lineageId = normalizeSyncString(record.lineageId);
  const threadId = normalizeSyncString(record.threadId);
  const workflowKey = normalizeSyncString(record.workflowKey).toLowerCase();
  const updatedBy = normalizeSyncString(record.updatedBy) || undefined;
  if (
    !tenantId
    || !lineageId
    || !threadId
    || !workflowKey
    || typeof record.updatedAt !== "number"
    || !Number.isFinite(record.updatedAt)
  ) {
    return undefined;
  }
  return {
    contractVersion: "occ_operator_routing_v1",
    tenantId,
    lineageId,
    threadId,
    workflowKey,
    updatedAt: record.updatedAt,
    updatedBy,
  };
}

function buildDeterministicSyncAttemptId(args: {
  sessionId: Id<"agentSessions">;
  dmThreadId: string;
  syncCheckpointToken: string;
  syncAttemptId?: string;
}): string {
  const explicitAttemptId = normalizeSyncString(args.syncAttemptId);
  if (explicitAttemptId) {
    return explicitAttemptId;
  }
  const tokenSegment =
    normalizeSyncString(args.syncCheckpointToken).slice(0, 48) || "missing_token";
  return `dm_sync:${args.sessionId}:${args.dmThreadId}:${tokenSegment}`;
}

function buildDmSummarySyncMessage(summary: string): string {
  return `[DM Summary Sync]\n${summary}`;
}

function normalizeExistingHandoffHistory(
  existingHistory: LegacyHandoffHistoryEntry[],
  fallbackGoal: string
): Array<{
  fromAgentId: Id<"objects">;
  toAgentId: Id<"objects">;
  reason: string;
  summary: string;
  goal: string;
  contextSummary: string;
  timestamp: number;
}> {
  return existingHistory.map((entry) => {
    const reason = normalizeHandoffString(entry.reason) || "Specialist handoff";
    const summary =
      normalizeHandoffString(entry.summary)
      || normalizeHandoffString(entry.contextSummary)
      || reason;
    const goal = normalizeHandoffString(entry.goal) || fallbackGoal;
    return {
      fromAgentId: entry.fromAgentId,
      toAgentId: entry.toAgentId,
      reason,
      summary,
      goal,
      contextSummary: summary,
      timestamp:
        typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)
          ? entry.timestamp
          : Date.now(),
    };
  });
}

async function nextTurnEdgeOrdinal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  turnId: Id<"agentTurns">
): Promise<number> {
  const latest = await ctx.db
    .query("executionEdges")
    .withIndex("by_turn_ordinal", (q: any) => q.eq("turnId", turnId))
    .order("desc")
    .first();
  return ((latest?.edgeOrdinal as number | undefined) ?? 0) + 1;
}

async function appendTurnEdge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    turnId: Id<"agentTurns">;
    transition: "handoff_initiated" | "handoff_completed";
    metadata?: unknown;
  }
): Promise<void> {
  const turn = await ctx.db.get(args.turnId);
  if (!turn) {
    return;
  }

  const now = Date.now();
  const edgeOrdinal = await nextTurnEdgeOrdinal(ctx, args.turnId);
  await ctx.db.insert("executionEdges", {
    organizationId: turn.organizationId,
    sessionId: turn.sessionId,
    agentId: turn.agentId,
    turnId: turn._id,
    transition: args.transition,
    fromState: turn.state,
    toState: turn.state,
    edgeOrdinal,
    metadata: args.metadata,
    occurredAt: now,
    createdAt: now,
  });
}

async function findLatestRunningTurn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: Id<"agentSessions">,
  agentId: Id<"objects">
): Promise<{ _id: Id<"agentTurns"> } | null> {
  const runningTurns = await ctx.db
    .query("agentTurns")
    .withIndex("by_session_agent_state", (q: any) =>
      q
        .eq("sessionId", sessionId)
        .eq("agentId", agentId)
        .eq("state", "running")
    )
    .collect();

  if (runningTurns.length === 0) {
    return null;
  }

  const latest = runningTurns.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
  return latest ? { _id: latest._id } : null;
}

// ============================================================================
// HANDOFF EXECUTION
// ============================================================================

/**
 * Execute a team handoff: validate, update teamSession, log audit trail.
 * Called from tag_in_specialist tool.
 */
export const executeTeamHandoff = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    fromAgentId: v.id("objects"),
    toAgentId: v.id("objects"),
    organizationId: v.id("organizations"),
    handoff: teamHandoffPayloadValidator,
    handoffProvenance: v.optional(handoffProvenanceValidator),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { error: "Session not found" };

    const handoff: TeamHandoffPayload = {
      reason: normalizeHandoffString(args.handoff.reason),
      summary: normalizeHandoffString(args.handoff.summary),
      goal: normalizeHandoffString(args.handoff.goal),
    };

    if (!handoff.reason || !handoff.summary || !handoff.goal) {
      return {
        error: "Handoff payload requires non-empty reason, summary, and goal fields.",
      };
    }

    // --- Validation ---

    // 1. Target agent exists and is active
    const targetAgent = await ctx.db.get(args.toAgentId);
    if (!targetAgent || targetAgent.type !== "org_agent" || targetAgent.status !== "active") {
      return { error: "Target agent not found or inactive" };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetName = (targetAgent.customProperties as any)?.displayName || targetAgent.name || "Agent";

    // 2. Same org
    if (targetAgent.organizationId !== args.organizationId) {
      return { error: "Cannot hand off to agent in different organization" };
    }

    // 3. Not handing off to self
    if (args.fromAgentId === args.toAgentId) {
      return { error: "Cannot hand off to yourself" };
    }
    const organization = await ctx.db.get(args.organizationId);
    const workspaceType = resolveWorkspaceTypeFromOrganization(organization);

    const primaryAgent = await ctx.db.get(session.agentId);
    if (!primaryAgent || primaryAgent.type !== "org_agent") {
      return { error: "Primary one-agent runtime contract missing for session." };
    }
    if (String(args.fromAgentId) !== String(session.agentId)) {
      return {
        error: "Only the session primary agent authority may initiate a team handoff.",
      };
    }
    const primaryProps =
      primaryAgent.customProperties as Record<string, unknown> | undefined;
    const teamAccessMode =
      normalizeTeamAccessModeToken(primaryProps?.teamAccessMode, "invisible")
      ?? "invisible";
    const dreamTeamSpecialists = normalizeDreamTeamSpecialistContracts(
      primaryProps?.dreamTeamSpecialists
    );
    const scopedDreamTeamSpecialists = dreamTeamSpecialists.filter((contract) =>
      isDreamTeamSpecialistContractInWorkspaceScope({ contract, workspaceType })
    );
    const specialistContract = resolveDreamTeamSpecialistContract({
      dreamTeamSpecialists,
      specialistId: String(args.toAgentId),
      specialistSubtype: targetAgent.subtype ?? undefined,
      specialistName: targetName,
      workspaceType,
    });
    if (dreamTeamSpecialists.length > 0 && !specialistContract) {
      const unscopedContract = resolveDreamTeamSpecialistContract({
        dreamTeamSpecialists,
        specialistId: String(args.toAgentId),
        specialistSubtype: targetAgent.subtype ?? undefined,
        specialistName: targetName,
      });
      if (
        unscopedContract
        && !isDreamTeamSpecialistContractInWorkspaceScope({
          contract: unscopedContract,
          workspaceType,
        })
      ) {
        return {
          error:
            `Requested specialist is outside Dream Team scope for ${workspaceType} workspace.`,
        };
      }
      return {
        error:
          "Requested specialist is not in the primary agent Dream Team contract.",
      };
    }
    const normalizedHandoffProvenance = normalizeHandoffProvenance(
      args.handoffProvenance
    );
    if (
      normalizedHandoffProvenance?.selectionStrategy === "fallback_subtype"
      && scopedDreamTeamSpecialists.length > 0
    ) {
      return {
        error:
          "Fallback subtype specialist selection is blocked when Dream Team contracts are configured.",
      };
    }
    if (
      specialistContract
      && normalizedHandoffProvenance?.contractSoulBlendId
      && normalizedHandoffProvenance.contractSoulBlendId !== specialistContract.soulBlendId
    ) {
      return {
        error:
          "Handoff provenance contract mismatch (soulBlendId). Re-resolve specialist selection.",
      };
    }
    if (
      specialistContract
      && normalizedHandoffProvenance?.contractSpecialistId
      && specialistContract.specialistId
      && normalizedHandoffProvenance.contractSpecialistId !== specialistContract.specialistId
    ) {
      return {
        error:
          "Handoff provenance contract mismatch (specialistId). Re-resolve specialist selection.",
      };
    }
    const handoffProvenance = deriveHandoffProvenance({
      provided: normalizedHandoffProvenance,
      specialistContract,
      targetAgentId: args.toAgentId,
      targetAgentSubtype: targetAgent.subtype ?? undefined,
      catalogSize: scopedDreamTeamSpecialists.length,
    });
    const routingDecision = resolveTeamHandoffRoutingDecision({
      teamAccessMode,
      fromAgentId: args.fromAgentId,
      toAgentId: args.toAgentId,
      primaryAgentId: session.agentId,
      specialistContract,
    });
    if (!routingDecision.allowed) {
      return {
        error:
          routingDecision.error
          || `Specialist handoff blocked for teamAccessMode=${teamAccessMode}.`,
      };
    }

    // 4. Handoff count within limit
    const existingHistory = (session.teamSession?.handoffHistory ??
      []) as LegacyHandoffHistoryEntry[];
    const normalizedExistingHistory = normalizeExistingHandoffHistory(
      existingHistory,
      handoff.goal
    );
    if (normalizedExistingHistory.length >= DEFAULT_MAX_HANDOFFS_PER_SESSION) {
      return {
        error: `Maximum handoffs (${DEFAULT_MAX_HANDOFFS_PER_SESSION}) reached for this session. Escalate to a human instead.`,
      };
    }

    // 5. Cooldown check
    const lastHandoff = normalizedExistingHistory.at(-1);
    if (lastHandoff) {
      const elapsed = Date.now() - lastHandoff.timestamp;
      if (elapsed < DEFAULT_HANDOFF_COOLDOWN_MS) {
        const remainingSec = Math.ceil((DEFAULT_HANDOFF_COOLDOWN_MS - elapsed) / 1000);
        return {
          error: `Handoff cooldown active — wait ${remainingSec}s before handing off again`,
        };
      }
    }

    // --- Execute ---

    const now = Date.now();

    // Build updated participating agent IDs (deduplicated)
    const existingParticipants = session.teamSession?.participatingAgentIds ?? [args.fromAgentId];
    const participatingSet = new Set(existingParticipants.map(String));
    participatingSet.add(String(args.toAgentId));
    const participatingAgentIds = Array.from(participatingSet) as unknown as Id<"objects">[];

    // Append handoff to history
    const handoffEntry = {
      fromAgentId: args.fromAgentId,
      toAgentId: args.toAgentId,
      reason: handoff.reason,
      summary: handoff.summary,
      goal: handoff.goal,
      contextSummary: handoff.summary,
      timestamp: now,
    };

    const updatedTeamSession = {
      isTeamSession: true as const,
      participatingAgentIds,
      activeAgentId: routingDecision.activeAgentId,
      handoffHistory: [...normalizedExistingHistory, handoffEntry],
      sharedContext: composeSpecialistMemoryContext({
        teamAccessMode: routingDecision.teamAccessMode,
        specialistName: targetName,
        reason: handoff.reason,
        summary: handoff.summary,
        goal: handoff.goal,
        priorSharedContext:
          typeof session.teamSession?.sharedContext === "string"
            ? session.teamSession.sharedContext
            : undefined,
      }),
      conversationGoal: handoff.goal,
      handoffNotes: handoff,
    };

    await ctx.db.patch(args.sessionId, {
      teamSession: updatedTeamSession,
    });

    const activeTurn = await findLatestRunningTurn(
      ctx,
      args.sessionId,
      routingDecision.authorityAgentId as Id<"objects">
    );
    if (activeTurn) {
      await appendTurnEdge(ctx, {
        turnId: activeTurn._id,
        transition: "handoff_initiated",
        metadata: {
          fromAgentId: routingDecision.authorityAgentId,
          toAgentId: args.toAgentId,
          reason: handoff.reason,
          summary: handoff.summary,
          goal: handoff.goal,
          teamAccessMode: routingDecision.teamAccessMode,
          handoffProvenance,
        },
      });
      await appendTurnEdge(ctx, {
        turnId: activeTurn._id,
        transition: "handoff_completed",
        metadata: {
          fromAgentId: routingDecision.authorityAgentId,
          toAgentId: args.toAgentId,
          authorityAgentId: routingDecision.authorityAgentId,
          activeAgentId: routingDecision.activeAgentId,
          teamAccessMode: routingDecision.teamAccessMode,
          handoffNumber: normalizedExistingHistory.length + 1,
          handoffProvenance,
        },
      });
    }

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: routingDecision.authorityAgentId as Id<"objects">,
      actionType: "team_handoff",
      actionData: {
        sessionId: args.sessionId,
        fromAgentId: routingDecision.authorityAgentId,
        toAgentId: args.toAgentId,
        reason: handoff.reason,
        summary: handoff.summary,
        goal: handoff.goal,
        teamAccessMode: routingDecision.teamAccessMode,
        authorityAgentId: routingDecision.authorityAgentId,
        activeAgentId: routingDecision.activeAgentId,
        specialistCatalogMatched: Boolean(specialistContract),
        handoffNumber: normalizedExistingHistory.length + 1,
        handoffProvenance,
      },
      performedAt: now,
    });

    return {
      success: true,
      targetAgentName: targetName,
      teamAccessMode: routingDecision.teamAccessMode,
      authorityAgentId: routingDecision.authorityAgentId,
      activeAgentId: routingDecision.activeAgentId,
      handoffNumber: normalizedExistingHistory.length + 1,
      handoffProvenance,
    };
  },
});

/**
 * Resolve fail-closed routing context for DM-to-group summary sync bridge execution.
 */
export const getDmSummarySyncBridgeContext = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    requestedByAgentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false as const, error: "session_not_found" as const };
    }

    if (session.organizationId !== args.organizationId) {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "tenant_mismatch",
      };
    }

    if (session.status !== "active") {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "session_not_active",
      };
    }

    if (String(session.agentId) !== String(args.requestedByAgentId)) {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "orchestrator_authority_required",
      };
    }

    const sessionRecord = session as Record<string, unknown>;
    const routingMetadata = normalizeSessionRoutingMetadata(
      sessionRecord.routingMetadata
    );
    if (!routingMetadata) {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "routing_metadata_missing",
      };
    }

    if (routingMetadata.tenantId !== String(args.organizationId)) {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "routing_metadata_tenant_mismatch",
      };
    }

    const collaborationRecord =
      sessionRecord.collaboration && typeof sessionRecord.collaboration === "object"
        ? sessionRecord.collaboration as Record<string, unknown>
        : undefined;
    const kernelRecord =
      collaborationRecord?.kernel && typeof collaborationRecord.kernel === "object"
        ? collaborationRecord.kernel as Record<string, unknown>
        : undefined;
    const kernelLineageId = normalizeSyncString(kernelRecord?.lineageId);
    const kernelGroupThreadId = normalizeSyncString(
      kernelRecord?.groupThreadId ?? kernelRecord?.threadId
    );

    const lineageId = kernelLineageId || routingMetadata.lineageId;
    const groupThreadId = kernelGroupThreadId || routingMetadata.threadId;
    if (!lineageId || !groupThreadId) {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "collaboration_identity_missing",
      };
    }

    if (
      lineageId !== routingMetadata.lineageId
      || groupThreadId !== routingMetadata.threadId
    ) {
      return {
        success: false as const,
        error: "blocked_policy" as const,
        reason: "collaboration_routing_identity_mismatch",
      };
    }

    return {
      success: true as const,
      channel: session.channel,
      externalContactIdentifier: session.externalContactIdentifier,
      routeIdentity: normalizeSessionChannelRouteIdentity(
        sessionRecord.channelRouteIdentity
      ),
      tenantId: routingMetadata.tenantId,
      lineageId,
      groupThreadId,
      workflowKey: routingMetadata.workflowKey,
    };
  },
});

/**
 * Bridge endpoint for explicit DM-to-group summary sync.
 * Ensures commit-path routing consumes sync checkpoint tokens before execution.
 */
export const syncDmSummaryToGroupBridge = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    requestedByAgentId: v.id("objects"),
    summary: v.string(),
    dmThreadId: v.string(),
    syncCheckpointToken: v.string(),
    syncAttemptId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const summary = normalizeSyncString(args.summary);
    const dmThreadId = normalizeSyncString(args.dmThreadId);
    const syncCheckpointToken = normalizeSyncString(args.syncCheckpointToken);

    if (!summary || !dmThreadId) {
      return {
        status: "blocked_sync_checkpoint" as const,
        message: "DM summary sync requires non-empty summary and dmThreadId.",
      };
    }

    const bridgeContext = await ctx.runQuery(
      getInternal().ai.teamHarness.getDmSummarySyncBridgeContext,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        requestedByAgentId: args.requestedByAgentId,
      }
    ) as
      | {
          success: true;
          channel: string;
          externalContactIdentifier: string;
          routeIdentity?: SessionChannelRouteIdentityRecord;
          tenantId: string;
          lineageId: string;
          groupThreadId: string;
          workflowKey: string;
        }
      | {
          success: false;
          error: string;
          reason?: string;
        };

    if (!bridgeContext.success) {
      return {
        status: "blocked_sync_checkpoint" as const,
        message:
          bridgeContext.reason
          || bridgeContext.error
          || "DM summary sync bridge prerequisites failed.",
      };
    }

    const syncAttemptId = buildDeterministicSyncAttemptId({
      sessionId: args.sessionId,
      dmThreadId,
      syncCheckpointToken,
      syncAttemptId: args.syncAttemptId,
    });
    const idempotencyKey = [
      "dm_summary_sync",
      bridgeContext.tenantId,
      bridgeContext.lineageId,
      bridgeContext.groupThreadId,
      dmThreadId,
      syncAttemptId,
    ].join(":");

    const inboundMetadata: Record<string, unknown> = {
      skipOutbound: true,
      source: DM_SUMMARY_SYNC_BRIDGE_SOURCE,
      routingMode: "orchestrator_first",
      operatorRouteEnforced: true,
      requireSyncCheckpoint: true,
      collaborationSyncRequired: true,
      collaborationSyncToken: syncCheckpointToken,
      syncCheckpointToken: syncCheckpointToken,
      lineageId: bridgeContext.lineageId,
      threadId: bridgeContext.groupThreadId,
      groupThreadId: bridgeContext.groupThreadId,
      dmThreadId,
      workflowKey: DM_SUMMARY_SYNC_WORKFLOW_KEY,
      intentType: "commit",
      workflowIntent: "commit",
      authorityIntentType: "commit",
      collaborationEventId: syncAttemptId,
      idempotencyKey,
    };

    if (bridgeContext.routeIdentity) {
      if (bridgeContext.routeIdentity.providerId) {
        inboundMetadata.providerId = bridgeContext.routeIdentity.providerId;
      }
      if (bridgeContext.routeIdentity.providerConnectionId) {
        inboundMetadata.providerConnectionId =
          bridgeContext.routeIdentity.providerConnectionId;
      }
      if (bridgeContext.routeIdentity.providerAccountId) {
        inboundMetadata.providerAccountId =
          bridgeContext.routeIdentity.providerAccountId;
      }
      if (bridgeContext.routeIdentity.providerInstallationId) {
        inboundMetadata.providerInstallationId =
          bridgeContext.routeIdentity.providerInstallationId;
      }
      if (bridgeContext.routeIdentity.providerProfileId) {
        inboundMetadata.providerProfileId =
          bridgeContext.routeIdentity.providerProfileId;
      }
      if (bridgeContext.routeIdentity.providerProfileType) {
        inboundMetadata.providerProfileType =
          bridgeContext.routeIdentity.providerProfileType;
      }
      if (bridgeContext.routeIdentity.routeKey) {
        inboundMetadata.routeKey = bridgeContext.routeIdentity.routeKey;
      }
    }

    const bridgeResult = await ctx.runAction(
      getInternal().ai.agentExecution.processInboundMessage,
      {
        organizationId: args.organizationId,
        channel: bridgeContext.channel,
        externalContactIdentifier: bridgeContext.externalContactIdentifier,
        message: buildDmSummarySyncMessage(summary),
        metadata: inboundMetadata,
      }
    ) as {
      status: string;
      message?: string;
      response?: string;
      sessionId?: string;
      turnId?: string;
    };

    return {
      ...bridgeResult,
      syncAttemptId,
    };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get team session state for a session (used by agentExecution pipeline).
 */
export const getTeamSessionState = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return session.teamSession ?? null;
  },
});

/**
 * Get the effective speaker (active) agent ID for a session.
 * If team session exists with a different activeAgentId, use that.
 */
export const getEffectiveAgentId = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    defaultAgentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session?.teamSession?.activeAgentId) return args.defaultAgentId;
    return session.teamSession.activeAgentId;
  },
});
