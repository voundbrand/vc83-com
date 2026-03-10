import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { run as completeOnboardingRun } from "../../../convex/onboarding/completeOnboarding";

const PLATFORM_ORG_ID = "org_platform_phase5" as Id<"organizations">;
const CLAIMED_ORG_ID = "org_claimed_phase5" as Id<"organizations">;
const NEW_ORG_ID = "org_new_phase5" as Id<"organizations">;
const AGENT_ID = "agent_phase5" as Id<"objects">;
const DEFAULT_TEMPLATE_AGENT_ID = "agent_default_template_phase5" as Id<"objects">;
const SESSION_ID = "session_phase5" as Id<"agentSessions">;

function createCompleteOnboardingContext(args: {
  channel: "telegram" | "webchat" | "native_guest";
  existingOrgId?: Id<"organizations">;
  extractedData?: Record<string, unknown>;
  provisionedAgentId?: Id<"objects">;
}) {
  const createdOrganizations: Array<Record<string, unknown>> = [];
  const rebindCalls: Array<Record<string, unknown>> = [];
  const activateMappingCalls: Array<Record<string, unknown>> = [];

  const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (Object.prototype.hasOwnProperty.call(payload, "sessionToken")) {
      if (args.channel === "telegram") {
        return null;
      }
      return {
        sessionToken: payload.sessionToken,
        organizationId: PLATFORM_ORG_ID,
        claimedByUserId: "user_phase5",
        claimedOrganizationId: args.existingOrgId || CLAIMED_ORG_ID,
      };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sessionId")) {
      return {
        _id: SESSION_ID,
        interviewState: {
          extractedData: args.extractedData || {
            workspaceName: "Phase 5 Workspace",
            workspaceContext: "Services",
          },
        },
      };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "agentId")) {
      return {
        customProperties: {
          soul: {
            name: "Phase 5 Agent",
            greetingStyle: "Welcome to your new workspace.",
          },
        },
      };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "telegramChatId")) {
      return args.channel === "telegram" && args.existingOrgId
        ? {
            organizationId: args.existingOrgId,
            status: "active",
          }
        : null;
    }

    return null;
  });

  const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (Object.prototype.hasOwnProperty.call(payload, "workspaceName") && Object.prototype.hasOwnProperty.call(payload, "source")) {
      createdOrganizations.push(payload);
      return NEW_ORG_ID;
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && !Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && !Object.prototype.hasOwnProperty.call(payload, "telegramChatId")
    ) {
      return args.provisionedAgentId
        ? {
            agentId: args.provisionedAgentId,
            provisioningAction: "template_clone_created",
            fallbackUsed: false,
          }
        : { success: true };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "agentId")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
    ) {
      if (Object.prototype.hasOwnProperty.call(payload, "agentSessionId")) {
        return { success: true };
      }
      rebindCalls.push(payload);
      return { success: true };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "telegramChatId")
      && Object.prototype.hasOwnProperty.call(payload, "organizationId")
    ) {
      activateMappingCalls.push(payload);
      return { success: true };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "agentId")) {
      return {
        _id: "session_target_phase5" as Id<"agentSessions">,
      };
    }

    return { success: true };
  });

  const runAction = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (Object.prototype.hasOwnProperty.call(payload, "subtype")) {
      return { agentId: AGENT_ID };
    }
    return { success: true };
  });

  return {
    ctx: { runQuery, runMutation, runAction },
    createdOrganizations,
    rebindCalls,
    activateMappingCalls,
  };
}

describe("complete onboarding phase 5 orchestration", () => {
  it("preserves existing claimed workspace by default for webchat completion", async () => {
    const { ctx, createdOrganizations, rebindCalls } = createCompleteOnboardingContext({
      channel: "webchat",
      existingOrgId: CLAIMED_ORG_ID,
      extractedData: {
        workspaceName: "Preserved Workspace",
      },
    });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "wc_session_phase5",
      channel: "webchat",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(CLAIMED_ORG_ID);
    expect(createdOrganizations).toHaveLength(0);
    expect(rebindCalls).toHaveLength(1);
    expect(rebindCalls[0]?.organizationId).toBe(CLAIMED_ORG_ID);
  });

  it("reuses default template-managed operator and skips bootstrap when provisioning returns an agent", async () => {
    const { ctx, createdOrganizations, rebindCalls } = createCompleteOnboardingContext({
      channel: "webchat",
      existingOrgId: CLAIMED_ORG_ID,
      extractedData: {
        workspaceName: "Template Managed Workspace",
      },
      provisionedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
    });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "wc_session_phase5_template_managed",
      channel: "webchat",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(CLAIMED_ORG_ID);
    expect(result.agentId).toBe(DEFAULT_TEMPLATE_AGENT_ID);
    expect(createdOrganizations).toHaveLength(0);
    expect(rebindCalls).toHaveLength(1);
    expect(ctx.runAction).not.toHaveBeenCalled();
  });

  it("recreates workspace only when explicitly confirmed and rebinds session to new org", async () => {
    const { ctx, createdOrganizations, rebindCalls } = createCompleteOnboardingContext({
      channel: "native_guest",
      existingOrgId: CLAIMED_ORG_ID,
      extractedData: {
        workspaceName: "Recreated Workspace",
        workspaceContext: "Consulting",
        workspaceMutationAction: "recreate",
        confirmRecreateWorkspace: true,
      },
    });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "ng_session_phase5",
      channel: "native_guest",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(NEW_ORG_ID);
    expect(createdOrganizations).toHaveLength(1);
    expect(createdOrganizations[0]?.workspaceName).toBe("Recreated Workspace");
    expect(createdOrganizations[0]?.workspaceContext).toBe("Consulting");
    expect(rebindCalls).toHaveLength(1);
    expect(rebindCalls[0]?.organizationId).toBe(NEW_ORG_ID);
  });

  it("keeps telegram active mapping in preserve mode without recreating org", async () => {
    const { ctx, createdOrganizations, activateMappingCalls } = createCompleteOnboardingContext({
      channel: "telegram",
      existingOrgId: CLAIMED_ORG_ID,
      extractedData: {
        workspaceName: "Telegram Workspace",
      },
    });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "tg_phase5",
      channel: "telegram",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.linkedExisting).toBe(true);
    expect(result.organizationId).toBe(CLAIMED_ORG_ID);
    expect(createdOrganizations).toHaveLength(0);
    expect(activateMappingCalls).toHaveLength(0);
  });
});
