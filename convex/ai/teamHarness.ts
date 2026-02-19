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

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { teamHandoffPayloadValidator } from "../schemas/agentSessionSchemas";

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_MAX_HANDOFFS_PER_SESSION = 5;
const DEFAULT_HANDOFF_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

interface TeamHandoffPayload {
  reason: string;
  summary: string;
  goal: string;
}

interface LegacyHandoffHistoryEntry {
  fromAgentId: Id<"objects">;
  toAgentId: Id<"objects">;
  reason?: string;
  summary?: string;
  goal?: string;
  contextSummary?: string;
  timestamp?: number;
}

function normalizeHandoffString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

    // 2. Same org
    if (targetAgent.organizationId !== args.organizationId) {
      return { error: "Cannot hand off to agent in different organization" };
    }

    // 3. Not handing off to self
    if (args.fromAgentId === args.toAgentId) {
      return { error: "Cannot hand off to yourself" };
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
      activeAgentId: args.toAgentId,
      handoffHistory: [...normalizedExistingHistory, handoffEntry],
      sharedContext: handoff.summary,
      conversationGoal: handoff.goal,
      handoffNotes: handoff,
    };

    await ctx.db.patch(args.sessionId, {
      teamSession: updatedTeamSession,
    });

    const activeTurn = await findLatestRunningTurn(ctx, args.sessionId, args.fromAgentId);
    if (activeTurn) {
      await appendTurnEdge(ctx, {
        turnId: activeTurn._id,
        transition: "handoff_initiated",
        metadata: {
          fromAgentId: args.fromAgentId,
          toAgentId: args.toAgentId,
          reason: handoff.reason,
          summary: handoff.summary,
          goal: handoff.goal,
        },
      });
      await appendTurnEdge(ctx, {
        turnId: activeTurn._id,
        transition: "handoff_completed",
        metadata: {
          fromAgentId: args.fromAgentId,
          toAgentId: args.toAgentId,
          handoffNumber: normalizedExistingHistory.length + 1,
        },
      });
    }

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.fromAgentId,
      actionType: "team_handoff",
      actionData: {
        sessionId: args.sessionId,
        fromAgentId: args.fromAgentId,
        toAgentId: args.toAgentId,
        reason: handoff.reason,
        summary: handoff.summary,
        goal: handoff.goal,
        handoffNumber: normalizedExistingHistory.length + 1,
      },
      performedAt: now,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetName = (targetAgent.customProperties as any)?.displayName || targetAgent.name || "Agent";

    return {
      success: true,
      targetAgentName: targetName,
      handoffNumber: normalizedExistingHistory.length + 1,
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
 * Get the effective (active) agent ID for a session.
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
