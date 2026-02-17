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

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_MAX_HANDOFFS_PER_SESSION = 5;
const DEFAULT_HANDOFF_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

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
    reason: v.string(),
    contextSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { error: "Session not found" };

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
    const existingHistory = session.teamSession?.handoffHistory ?? [];
    if (existingHistory.length >= DEFAULT_MAX_HANDOFFS_PER_SESSION) {
      return {
        error: `Maximum handoffs (${DEFAULT_MAX_HANDOFFS_PER_SESSION}) reached for this session. Escalate to a human instead.`,
      };
    }

    // 5. Cooldown check
    const lastHandoff = existingHistory.at(-1);
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
      reason: args.reason,
      contextSummary: args.contextSummary,
      timestamp: now,
    };

    const updatedTeamSession = {
      isTeamSession: true as const,
      participatingAgentIds,
      activeAgentId: args.toAgentId,
      handoffHistory: [...existingHistory, handoffEntry],
      sharedContext: args.contextSummary,
      ...(session.teamSession?.conversationGoal
        ? { conversationGoal: session.teamSession.conversationGoal }
        : {}),
    };

    await ctx.db.patch(args.sessionId, {
      teamSession: updatedTeamSession,
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.fromAgentId,
      actionType: "team_handoff",
      actionData: {
        sessionId: args.sessionId,
        fromAgentId: args.fromAgentId,
        toAgentId: args.toAgentId,
        reason: args.reason,
        handoffNumber: existingHistory.length + 1,
      },
      performedAt: now,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetName = (targetAgent.customProperties as any)?.displayName || targetAgent.name || "Agent";

    return {
      success: true,
      targetAgentName: targetName,
      handoffNumber: existingHistory.length + 1,
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
