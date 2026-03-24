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
  telegramOnboardingOrgId?: Id<"organizations">;
  guestBindingOrgId?: Id<"organizations">;
  extractedData?: Record<string, unknown>;
  provisionedAgentId?: Id<"objects">;
  sessionClaimedByUserId?: string | null;
}) {
  const createdOrganizations: Array<Record<string, unknown>> = [];
  const promotionCalls: Array<Record<string, unknown>> = [];
  const rebindCalls: Array<Record<string, unknown>> = [];
  const activateMappingCalls: Array<Record<string, unknown>> = [];
  const claimTokenCalls: Array<Record<string, unknown>> = [];
  const bindingHandoffCalls: Array<Record<string, unknown>> = [];

  const runQuery = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (
      Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && !Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && !Object.prototype.hasOwnProperty.call(payload, "agentId")
    ) {
      if (!args.guestBindingOrgId) {
        return null;
      }
      return {
        _id: "guest_binding_phase5" as Id<"guestOnboardingBindings">,
        onboardingOrganizationId: args.guestBindingOrgId,
        organizationLifecycleState: "provisional_onboarding" as const,
        bindingStatus: "active" as const,
      };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sessionToken")) {
      if (args.channel === "telegram") {
        return null;
      }
      const resolvedClaimedByUserId = Object.prototype.hasOwnProperty.call(args, "sessionClaimedByUserId")
        ? args.sessionClaimedByUserId || undefined
        : args.guestBindingOrgId
          ? undefined
          : "user_phase5";
      return {
        sessionToken: payload.sessionToken,
        organizationId: PLATFORM_ORG_ID,
        claimedByUserId: resolvedClaimedByUserId,
        claimedOrganizationId: resolvedClaimedByUserId
          ? args.existingOrgId || CLAIMED_ORG_ID
          : undefined,
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
      if (args.channel !== "telegram") {
        return null;
      }
      if (args.telegramOnboardingOrgId) {
        return {
          organizationId: PLATFORM_ORG_ID,
          onboardingOrganizationId: args.telegramOnboardingOrgId,
          status: "onboarding",
        };
      }
      return args.existingOrgId
        ? {
            organizationId: args.existingOrgId,
            status: "active",
          }
        : null;
    }

    return null;
  });

  const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    if (
      Object.prototype.hasOwnProperty.call(payload, "businessName")
      && Object.prototype.hasOwnProperty.call(payload, "name")
      && Object.prototype.hasOwnProperty.call(payload, "slug")
      && Object.prototype.hasOwnProperty.call(payload, "createdBy")
    ) {
      createdOrganizations.push({
        workspaceName: payload.name,
        workspaceContext: payload.description,
        source: "claimed_completion",
      });
      return NEW_ORG_ID;
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "workspaceName")
      && Object.prototype.hasOwnProperty.call(payload, "source")
      && !Object.prototype.hasOwnProperty.call(payload, "organizationId")
    ) {
      createdOrganizations.push(payload);
      return NEW_ORG_ID;
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "workspaceName")
      && Object.prototype.hasOwnProperty.call(payload, "source")
      && Object.prototype.hasOwnProperty.call(payload, "appSurface")
    ) {
      promotionCalls.push(payload);
      return {
        organizationId: payload.organizationId,
        lifecycleState: "live_unclaimed_workspace",
        operatorAgentId: args.provisionedAgentId,
        operatorProvisioningAction: "template_clone_created",
      };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "userId")
      && Object.prototype.hasOwnProperty.call(payload, "appSurface")
    ) {
      return {
        organizationId: payload.organizationId,
        lifecycleState: "claimed_workspace",
        operatorAgentId: args.provisionedAgentId,
        operatorProvisioningAction: "template_clone_created",
      };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "appSurface")
      && !Object.prototype.hasOwnProperty.call(payload, "userId")
      && !Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && !Object.prototype.hasOwnProperty.call(payload, "telegramChatId")
    ) {
      return args.provisionedAgentId
        ? {
            operatorAgentId: args.provisionedAgentId,
            operatorProvisioningAction: "template_clone_created",
            authorityChannel: "desktop",
          }
        : { success: true };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "bindingId")
      && Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && Object.prototype.hasOwnProperty.call(payload, "issuedBy")
    ) {
      claimTokenCalls.push(payload);
      return {
        claimToken: "bound_claim_phase5",
        tokenId: "token_bound_phase5",
      };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "organizationId")
      && Object.prototype.hasOwnProperty.call(payload, "agentId")
    ) {
      if (!Object.prototype.hasOwnProperty.call(payload, "channel")) {
        rebindCalls.push(payload);
        return { success: true };
      }
      if (Object.prototype.hasOwnProperty.call(payload, "agentSessionId")) {
        return { success: true };
      }
      return {
        claimToken: "guest_session_phase5",
        tokenId: "token_guest_phase5",
      };
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "sessionToken")
      && Object.prototype.hasOwnProperty.call(payload, "channel")
      && Object.prototype.hasOwnProperty.call(payload, "resolvedAgentId")
    ) {
      bindingHandoffCalls.push(payload);
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
    promotionCalls,
    rebindCalls,
    activateMappingCalls,
    claimTokenCalls,
    bindingHandoffCalls,
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
      provisionedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
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
      provisionedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
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
    expect(createdOrganizations[0]?.source).toBe("claimed_completion");
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
      provisionedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
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

  it("reuses the first-touch Telegram provisional workspace through completion instead of creating a second org", async () => {
    const { ctx, createdOrganizations, promotionCalls, activateMappingCalls } =
      createCompleteOnboardingContext({
        channel: "telegram",
        telegramOnboardingOrgId: NEW_ORG_ID,
        extractedData: {
          workspaceName: "Telegram Workspace",
          workspaceContext: "Neighborhood pharmacy",
        },
        provisionedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
      });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "tg_phase5_bound",
      channel: "telegram",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(NEW_ORG_ID);
    expect(result.agentId).toBe(DEFAULT_TEMPLATE_AGENT_ID);
    expect(createdOrganizations).toHaveLength(0);
    expect(promotionCalls).toHaveLength(1);
    expect(promotionCalls[0]).toMatchObject({
      organizationId: NEW_ORG_ID,
      workspaceName: "Telegram Workspace",
      workspaceContext: "Neighborhood pharmacy",
      source: "telegram_onboarding",
      appSurface: "platform_web",
    });
    expect(activateMappingCalls).toContainEqual({
      telegramChatId: "tg_phase5_bound",
      organizationId: NEW_ORG_ID,
    });
  });

  it("reuses a bound native guest provisional workspace through completion without a prior account claim", async () => {
    const {
      ctx,
      createdOrganizations,
      promotionCalls,
      rebindCalls,
      claimTokenCalls,
      bindingHandoffCalls,
    } = createCompleteOnboardingContext({
      channel: "native_guest",
      guestBindingOrgId: NEW_ORG_ID,
      extractedData: {
        workspaceName: "Bound Native Workspace",
        workspaceContext: "Audit advisory",
      },
      provisionedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
    });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "ng_session_phase5_bound",
      channel: "native_guest",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(NEW_ORG_ID);
    expect(result.agentId).toBe(DEFAULT_TEMPLATE_AGENT_ID);
    expect(result.identityClaimToken).toBe("bound_claim_phase5");
    expect(createdOrganizations).toHaveLength(0);
    expect(promotionCalls).toHaveLength(1);
    expect(promotionCalls[0]).toMatchObject({
      organizationId: NEW_ORG_ID,
      workspaceName: "Bound Native Workspace",
      workspaceContext: "Audit advisory",
      source: "native_guest_onboarding",
      appSurface: "platform_web",
    });
    expect(rebindCalls).toHaveLength(1);
    expect(rebindCalls[0]).toMatchObject({
      sessionToken: "ng_session_phase5_bound",
      organizationId: NEW_ORG_ID,
      agentId: DEFAULT_TEMPLATE_AGENT_ID,
    });
    expect(claimTokenCalls).toEqual([
      expect.objectContaining({
        bindingId: "guest_binding_phase5",
        sessionToken: "ng_session_phase5_bound",
        organizationId: NEW_ORG_ID,
        channel: "native_guest",
        issuedBy: "complete_onboarding",
      }),
    ]);
    expect(bindingHandoffCalls).toHaveLength(2);
    expect(bindingHandoffCalls[0]).toMatchObject({
      sessionToken: "ng_session_phase5_bound",
      channel: "native_guest",
      resolvedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
    });
    expect(bindingHandoffCalls[1]).toMatchObject({
      sessionToken: "ng_session_phase5_bound",
      channel: "native_guest",
      resolvedAgentId: DEFAULT_TEMPLATE_AGENT_ID,
      lastClaimTokenId: "token_bound_phase5",
    });
    expect(
      ctx.runMutation.mock.calls.some(
        (call) =>
          call[1]
          && typeof call[1] === "object"
          && "userId" in call[1]
          && "appSurface" in call[1]
      )
    ).toBe(false);
  });

  it("fails closed when default operator provisioning does not return an agent", async () => {
    const { ctx } = createCompleteOnboardingContext({
      channel: "webchat",
      existingOrgId: CLAIMED_ORG_ID,
      extractedData: {
        workspaceName: "Broken Provisioning Workspace",
      },
    });

    const result = await (completeOnboardingRun as any)._handler(ctx, {
      sessionId: SESSION_ID,
      channelContactIdentifier: "wc_session_phase5_missing_agent",
      channel: "webchat",
      organizationId: PLATFORM_ORG_ID,
    });

    expect(result).toEqual({
      success: false,
      error: "No agent created",
    });
    expect(ctx.runAction).not.toHaveBeenCalled();
  });
});
