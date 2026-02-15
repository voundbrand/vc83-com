/**
 * TEAM TOOLS — Multi-Agent Coordination
 *
 * Enables the PM/lead agent to tag in specialist agents from its team.
 * Specialists respond under their own name in the same conversation.
 *
 * Tools:
 * - tag_in_specialist: Delegate to a specialist agent by subtype
 * - list_team_agents: List all active agents on the team
 */

import type { AITool, ToolExecutionContext } from "./registry";

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

/**
 * Tag in a specialist agent from the PM's team.
 * The specialist will respond under its own name in the same conversation.
 */
export const tagInSpecialistTool: AITool = {
  name: "tag_in_specialist",
  description:
    "Tag in a specialist agent from your team to respond to this conversation. " +
    "The specialist will respond under their own name. " +
    "Use when the user's request matches another agent's expertise.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      specialistType: {
        type: "string",
        description:
          "The subtype of the specialist to tag in (e.g. 'sales_assistant', 'customer_support', 'booking_agent')",
      },
      reason: {
        type: "string",
        description: "Brief context for why you're tagging them in",
      },
      contextNote: {
        type: "string",
        description: "Key context the specialist needs to know",
      },
    },
    required: ["specialistType", "reason"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.agentSessionId) {
      return { error: "No agent session context — tag_in_specialist requires an agent session" };
    }

    // 1. Find specialist by subtype
    const specialist = await ctx.runQuery(
      getInternal().agentOntology.getActiveAgentForOrg,
      {
        organizationId: ctx.organizationId,
        subtype: args.specialistType as string,
      }
    );

    if (!specialist) {
      return { error: `No active ${args.specialistType} agent found for this organization` };
    }

    // 2. Schedule specialist response (async — runs after PM's message is sent)
    await ctx.scheduler.runAfter(
      0,
      getInternal().ai.agentExecution.generateAgentResponse,
      {
        agentId: specialist._id,
        organizationId: ctx.organizationId,
        sessionId: ctx.agentSessionId,
        channel: ctx.channel || "api_test",
        externalContactIdentifier: ctx.contactId || "",
        context: (args.contextNote as string) || (args.reason as string),
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const specialistName = (specialist.customProperties as any)?.displayName || specialist.name;

    // Mirror the handoff to the team group (Step 8)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pmConfig = (ctx as any).agentId
      ? undefined // PM name resolved below
      : undefined;
    void pmConfig; // unused, resolve from context
    await ctx.scheduler.runAfter(0,
      getInternal().channels.telegramGroupMirror.mirrorTagIn,
      {
        organizationId: ctx.organizationId,
        pmName: "PM",
        specialistName,
        reason: (args.reason as string) || "",
      }
    );

    return {
      success: true,
      tagged: specialistName,
      subtype: args.specialistType,
      message: `${specialistName} will respond shortly.`,
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
        name: props?.displayName || a.name,
        subtype: a.subtype,
        tagline: props?.soul?.tagline,
        traits: props?.soul?.traits?.slice(0, 3),
      };
    });
  },
};
