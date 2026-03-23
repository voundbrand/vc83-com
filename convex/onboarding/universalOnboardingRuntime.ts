import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { UNIVERSAL_ONBOARDING_CHANNELS } from "./universalOnboardingPolicy";
import { hasPlatformMotherTemplateRole } from "../platformMother";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { internal: internalApi, api: publicApi } = require("../_generated/api") as { internal: any; api: any };

const UNIVERSAL_CHANNEL_SET = new Set<string>(UNIVERSAL_ONBOARDING_CHANNELS);

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function isUniversalOnboardingAgent(agent: {
  subtype?: string | null;
  customProperties?: Record<string, unknown> | null;
}): boolean {
  const props =
    agent.customProperties && typeof agent.customProperties === "object"
      ? agent.customProperties
      : {};

  const workerPoolRole = normalizeOptionalString(props.workerPoolRole);
  const enabledTools = Array.isArray(props.enabledTools)
    ? props.enabledTools.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (hasPlatformMotherTemplateRole(props)) {
    return true;
  }
  if (workerPoolRole === "onboarding_worker") {
    return true;
  }
  if (agent.subtype === "system") {
    return (
      enabledTools.includes("complete_onboarding")
      && enabledTools.includes("start_account_creation_handoff")
    );
  }
  return false;
}

export const ensureOnboardingSessionMode = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = args.channel.trim().toLowerCase();
    if (!UNIVERSAL_CHANNEL_SET.has(channel)) {
      return {
        applied: false,
        reason: "unsupported_channel",
      } as const;
    }

    const session = await ctx.runQuery(internalApi.ai.agentSessions.getSessionByIdInternal, {
      sessionId: args.sessionId,
    });
    if (!session) {
      return {
        applied: false,
        reason: "session_not_found",
      } as const;
    }

    if (
      session.sessionMode === "guided"
      && session.interviewTemplateId
      && session.interviewState
    ) {
      return {
        applied: false,
        reason: "already_guided",
        sessionMode: "guided",
        interviewTemplateId: session.interviewTemplateId,
      } as const;
    }

    if (session.organizationId !== args.organizationId || session.agentId !== args.agentId) {
      return {
        applied: false,
        reason: "session_scope_mismatch",
      } as const;
    }

    const agent = await ctx.runQuery(internalApi.agentOntology.getAgentInternal, {
      agentId: args.agentId,
    });
    if (!agent) {
      return {
        applied: false,
        reason: "agent_not_found",
      } as const;
    }

    if (!isUniversalOnboardingAgent({
      subtype: agent.subtype,
      customProperties:
        agent.customProperties && typeof agent.customProperties === "object"
          ? (agent.customProperties as Record<string, unknown>)
          : null,
    })) {
      return {
        applied: false,
        reason: "agent_not_onboarding_entry",
      } as const;
    }

    const templateId = await ctx.runQuery(internalApi.onboarding.seedPlatformAgents.getOnboardingTemplateId, {
      organizationId: args.organizationId,
    });
    if (!templateId) {
      return {
        applied: false,
        reason: "template_missing",
      } as const;
    }

    await ctx.runMutation(publicApi.ai.interviewRunner.startInterview, {
      sessionId: `auto_onboarding:${String(args.sessionId)}`,
      agentSessionId: args.sessionId,
      templateId: templateId as Id<"objects">,
      organizationId: args.organizationId,
      channel,
      externalContactIdentifier: args.externalContactIdentifier,
    });

    return {
      applied: true,
      reason: "guided_mode_initialized",
      sessionMode: "guided",
      interviewTemplateId: templateId,
    } as const;
  },
});
