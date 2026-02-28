import { describe, expect, it, vi } from "vitest";
import { INTERVIEW_TOOLS } from "../../../convex/ai/tools/interviewTools";
import { TOOL_REGISTRY } from "../../../convex/ai/tools/registry";
import { ONBOARDING_INTERVIEW_TEMPLATE } from "../../../convex/onboarding/seedPlatformAgents";

const REQUIRED_ONBOARDING_CONVERSION_TOOLS = [
  "verify_telegram_link",
  "start_account_creation_handoff",
  "start_slack_workspace_connect",
  "start_sub_account_flow",
  "start_plan_upgrade_checkout",
  "start_credit_pack_checkout",
] as const;

describe("free onboarding rollout guardrails", () => {
  it("keeps conversion tools available in both interview and global tool registries", () => {
    for (const toolName of REQUIRED_ONBOARDING_CONVERSION_TOOLS) {
      expect(INTERVIEW_TOOLS[toolName]).toBeDefined();
      expect(TOOL_REGISTRY[toolName]).toBeDefined();
      expect(TOOL_REGISTRY[toolName]?.status).toBe("ready");
    }
  });

  it("retains funnel-state gating before full onboarding phases", () => {
    const phaseIds = ONBOARDING_INTERVIEW_TEMPLATE.phases.map((phase) => phase.phaseId);
    const funnelStateIndex = phaseIds.indexOf("funnel_state");
    const workspaceContextIndex = phaseIds.indexOf("workspace_context");

    expect(funnelStateIndex).toBeGreaterThanOrEqual(0);
    expect(workspaceContextIndex).toBeGreaterThan(funnelStateIndex);

    const requiredPhaseIds =
      ONBOARDING_INTERVIEW_TEMPLATE.completionCriteria.requiredPhaseIds ?? [];
    expect(requiredPhaseIds).toContain("funnel_state");

    const outputFieldIds = ONBOARDING_INTERVIEW_TEMPLATE.outputSchema.fields.map(
      (field) => field.fieldId
    );
    expect(outputFieldIds).toContain("accountStatus");
    expect(outputFieldIds).toContain("needsFullOnboarding");
  });

  it("keeps business-context-first birthing flow and deferred private-context framing", () => {
    const phaseIds = ONBOARDING_INTERVIEW_TEMPLATE.phases.map((phase) => phase.phaseId);
    const workspaceContextIndex = phaseIds.indexOf("workspace_context");
    const coreMemoryIndex = phaseIds.indexOf("core_memory_anchors");
    const confirmationIndex = phaseIds.indexOf("confirmation");

    expect(workspaceContextIndex).toBeGreaterThanOrEqual(0);
    expect(coreMemoryIndex).toBeGreaterThan(workspaceContextIndex);
    expect(confirmationIndex).toBeGreaterThan(coreMemoryIndex);

    const workspacePhase = ONBOARDING_INTERVIEW_TEMPLATE.phases[workspaceContextIndex];
    const trustTeaserPhase = ONBOARDING_INTERVIEW_TEMPLATE.phases[coreMemoryIndex];
    const confirmationPhase = ONBOARDING_INTERVIEW_TEMPLATE.phases[confirmationIndex];

    expect(workspacePhase.introPrompt || "").toContain("workspace context");
    expect(trustTeaserPhase.phaseName).toContain("Teaser");
    expect(confirmationPhase.introPrompt || "").toContain("workspace context first");
  });

  it("preserves explicit cross-channel onboarding metadata", () => {
    expect(ONBOARDING_INTERVIEW_TEMPLATE.description).toContain("Telegram");
    expect(ONBOARDING_INTERVIEW_TEMPLATE.description).toContain("webchat");
    expect(ONBOARDING_INTERVIEW_TEMPLATE.description).toContain("native guest");
  });

  it("blocks onboarding completion for unclaimed guest webchat sessions", async () => {
    const runQuery = vi.fn(async (_reference: unknown, payload?: { sessionToken?: string }) => {
      if (payload?.sessionToken) {
        return {
          sessionToken: payload.sessionToken,
          organizationId: "org_platform",
        };
      }
      return null;
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
      {} as never,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("account_required");
    expect(result.cta?.kind).toBe("external_url");
    expect(runMutation).toHaveBeenCalled();
    expect(runAction).not.toHaveBeenCalled();
  });

  it("allows onboarding completion for claimed guest webchat sessions", async () => {
    const runQuery = vi.fn(async (_reference: unknown, payload?: { sessionToken?: string }) => {
      if (payload?.sessionToken) {
        return {
          sessionToken: payload.sessionToken,
          organizationId: "org_platform",
          claimedByUserId: "user_123",
        };
      }
      return null;
    });
    const runMutation = vi.fn();
    const runAction = vi.fn(async () => ({ success: true, organizationId: "org_new" }));

    const result = await INTERVIEW_TOOLS.complete_onboarding.execute(
      {
        organizationId: "org_platform",
        agentId: "agent_quinn",
        agentSessionId: "session_onboarding",
        channel: "webchat",
        contactId: "wc_session_claimed",
        runQuery,
        runMutation,
        runAction,
      } as never,
      {} as never,
    );

    expect(result.success).toBe(true);
    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runMutation).not.toHaveBeenCalled();
  });
});
