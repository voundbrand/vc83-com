import { describe, expect, it, vi } from "vitest";
import { INTERVIEW_TOOLS } from "../../../convex/ai/tools/interviewTools";

describe("complete_onboarding channel matrix", () => {
  it("allows telegram completion without guest-claim gate", async () => {
    const runQuery = vi.fn(async () => null);
    const runMutation = vi.fn(async () => ({ claimToken: "unused" }));
    const runAction = vi.fn(async () => ({ success: true, organizationId: "org_tg" }));

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "telegram",
        contactId: "123456",
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never
    );

    expect(result.success).toBe(true);
    expect(runQuery).not.toHaveBeenCalled();
    expect(runMutation).not.toHaveBeenCalled();
    expect(runAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        channelContactIdentifier: "123456",
        channel: "telegram",
      })
    );
  });

  it("blocks unclaimed native_guest completion", async () => {
    const runQuery = vi.fn(async (_ref: unknown, payload?: {
      sessionToken?: string;
      channel?: string;
    }) => {
      if (!payload?.sessionToken) return null;
      if (payload.channel === "native_guest") {
        return null;
      }
      return {
        sessionToken: payload.sessionToken,
        organizationId: "org_platform",
      };
    });
    const runMutation = vi.fn(async () => ({ claimToken: "signed_claim_token" }));
    const runAction = vi.fn(async () => ({ success: true }));

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "native_guest",
        contactId: "ng_session_unclaimed",
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("account_required");
    expect(runMutation).toHaveBeenCalled();
    expect(runAction).not.toHaveBeenCalled();
  });

  it("allows unclaimed native_guest completion when an active onboarding binding exists", async () => {
    const runQuery = vi.fn(async (_ref: unknown, payload?: {
      sessionToken?: string;
      channel?: string;
    }) => {
      if (!payload?.sessionToken) return null;
      if (payload.channel === "native_guest") {
        return {
          _id: "binding_phase3",
          onboardingOrganizationId: "org_bound_guest",
          bindingStatus: "active",
        };
      }
      return {
        sessionToken: payload.sessionToken,
        organizationId: "org_platform",
      };
    });
    const runMutation = vi.fn(async () => ({ claimToken: "unused" }));
    const runAction = vi.fn(async () => ({ success: true, organizationId: "org_bound_guest" }));

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "native_guest",
        contactId: "ng_session_bound",
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never
    );

    expect(result.success).toBe(true);
    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("blocks unclaimed webchat completion", async () => {
    const runQuery = vi.fn(async (_ref: unknown, payload?: {
      sessionToken?: string;
      channel?: string;
    }) => {
      if (!payload?.sessionToken) return null;
      if (payload.channel === "webchat") {
        return null;
      }
      return {
        sessionToken: payload.sessionToken,
        organizationId: "org_platform",
      };
    });
    const runMutation = vi.fn(async () => ({ claimToken: "signed_claim_token" }));
    const runAction = vi.fn(async () => ({ success: true }));

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "webchat",
        contactId: "wc_session_unclaimed",
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("account_required");
    expect(runMutation).toHaveBeenCalled();
    expect(runAction).not.toHaveBeenCalled();
  });

  it("allows claimed native_guest completion", async () => {
    const runQuery = vi.fn(async (_ref: unknown, payload?: {
      sessionToken?: string;
      channel?: string;
    }) => {
      if (!payload?.sessionToken) return null;
      if (payload.channel === "native_guest") {
        return null;
      }
      return {
        sessionToken: payload.sessionToken,
        organizationId: "org_platform",
        claimedByUserId: "user_123",
      };
    });
    const runMutation = vi.fn(async () => ({ claimToken: "unused" }));
    const runAction = vi.fn(async () => ({ success: true, organizationId: "org_guest" }));

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "native_guest",
        contactId: "ng_session_claimed",
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never
    );

    expect(result.success).toBe(true);
    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("returns missing-context error when contact/session is absent", async () => {
    const runQuery = vi.fn();
    const runMutation = vi.fn();
    const runAction = vi.fn();

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "webchat",
        contactId: undefined,
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Missing session context for onboarding completion");
    expect(runAction).not.toHaveBeenCalled();
  });
});
