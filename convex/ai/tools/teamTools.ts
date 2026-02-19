/**
 * TEAM TOOLS — Multi-Agent Coordination
 *
 * Enables the PM/lead agent to tag in specialist agents from its team.
 * Specialists respond under their own name in the same conversation.
 *
 * Tools:
 * - tag_in_specialist: Delegate to a specialist agent (validated via teamHarness)
 * - list_team_agents: List all active agents on the team
 *
 * See: docs/platform/TEAM_COORDINATION.md
 */

import type { AITool, ToolExecutionContext } from "./registry";

interface TeamHandoffPayload {
  reason: string;
  summary: string;
  goal: string;
}

// Lazy-load to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../../_generated/api");
  }
  return _apiCache.internal;
}

function getTrimmedArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTeamHandoffPayload(
  args: Record<string, unknown>
): { payload?: TeamHandoffPayload; error?: string } {
  const reason = getTrimmedArg(args, "reason");
  const summary =
    getTrimmedArg(args, "summary")
    || getTrimmedArg(args, "contextNote")
    || reason;
  const goal = getTrimmedArg(args, "goal");

  if (!reason) {
    return { error: "tag_in_specialist requires handoff.reason." };
  }

  if (!summary) {
    return { error: "tag_in_specialist requires handoff.summary." };
  }

  if (!goal) {
    return { error: "tag_in_specialist requires handoff.goal." };
  }

  return {
    payload: {
      reason,
      summary,
      goal,
    },
  };
}

/**
 * Tag in a specialist agent from the PM's team.
 * Validates handoff via teamHarness (limits, cooldown, same-org).
 * The specialist will respond under its own name in the same conversation.
 */
export const tagInSpecialistTool: AITool = {
  name: "tag_in_specialist",
  description:
    "Tag in a specialist agent from your team to respond to this conversation. " +
    "The specialist will respond under their own name. " +
    "Use when the user's request matches another agent's expertise. " +
    "Handoff limits and cooldowns are enforced automatically.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      specialistType: {
        type: "string",
        description:
          "The subtype of the specialist to tag in (e.g. 'sales_assistant', 'customer_support', 'booking_agent'). Use list_team_agents first to see who's available.",
      },
      reason: {
        type: "string",
        description: "Why the PM is handing off this turn",
      },
      summary: {
        type: "string",
        description: "Concise continuity summary the specialist should read first",
      },
      goal: {
        type: "string",
        description: "Specific objective the specialist should complete next",
      },
      contextNote: {
        type: "string",
        description: "Legacy alias for summary (kept for backward compatibility)",
      },
    },
    required: ["specialistType", "reason", "summary", "goal"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.agentSessionId || !ctx.agentId) {
      return { error: "No agent session context — tag_in_specialist requires an agent session" };
    }

    const handoffPayload = normalizeTeamHandoffPayload(args);
    if (!handoffPayload.payload) {
      return { error: handoffPayload.error || "Invalid handoff payload" };
    }

    // 1. Find specialist by subtype — search all active agents
    const allAgents = await ctx.runQuery(
      getInternal().agentOntology.getAllActiveAgentsForOrg,
      { organizationId: ctx.organizationId }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetAgent = (allAgents as any[])?.find(
      (a) => a.subtype === (args.specialistType as string) && a._id !== ctx.agentId
    );

    if (!targetAgent) {
      return { error: `No active ${args.specialistType} agent found for this organization` };
    }

    // 2. Execute validated handoff via teamHarness
    const handoffResult = await ctx.runMutation(
      getInternal().ai.teamHarness.executeTeamHandoff,
      {
        sessionId: ctx.agentSessionId,
        fromAgentId: ctx.agentId,
        toAgentId: targetAgent._id,
        organizationId: ctx.organizationId,
        handoff: handoffPayload.payload,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = handoffResult as any;
    if (result?.error) {
      return { error: result.error };
    }

    const specialistName = result?.targetAgentName || (args.specialistType as string);

    // 3. Mirror the handoff to the team group (fire-and-forget)
    ctx.scheduler.runAfter(0,
      getInternal().channels.telegramGroupMirror.mirrorTagIn,
      {
        organizationId: ctx.organizationId,
        pmName: "PM",
        specialistName,
        reason: handoffPayload.payload.reason,
      }
    );

    return {
      success: true,
      tagged: specialistName,
      subtype: args.specialistType,
      handoffNumber: result?.handoffNumber,
      message: `${specialistName} has been tagged in and will respond next. They have the conversation context.`,
    };
  },
};

/**
 * List all active specialist agents on the PM's team.
 */
export const listTeamAgentsTool: AITool = {
  name: "list_team_agents",
  description: "List all active specialist agents on your team. Use to see who is available before tagging someone in.",
  status: "ready",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    const agents = await ctx.runQuery(
      getInternal().agentOntology.getAllActiveAgentsForOrg,
      { organizationId: ctx.organizationId }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (agents as any[]).map((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = a.customProperties as Record<string, any> | undefined;
      return {
        id: a._id,
        name: props?.displayName || a.name,
        subtype: a.subtype,
        tagline: props?.soul?.tagline,
        traits: props?.soul?.traits?.slice(0, 3),
      };
    });
  },
};
