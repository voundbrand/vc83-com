import { describe, expect, it } from "vitest";
import { INTERVIEW_TOOLS } from "../../../convex/ai/tools/interviewTools";
import { TOOL_REGISTRY } from "../../../convex/ai/tools/registry";
import { ONBOARDING_INTERVIEW_TEMPLATE } from "../../../convex/onboarding/seedPlatformAgents";

const REQUIRED_ONBOARDING_CONVERSION_TOOLS = [
  "verify_telegram_link",
  "start_account_creation_handoff",
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
    const businessContextIndex = phaseIds.indexOf("business_context");

    expect(funnelStateIndex).toBeGreaterThanOrEqual(0);
    expect(businessContextIndex).toBeGreaterThan(funnelStateIndex);

    const requiredPhaseIds =
      ONBOARDING_INTERVIEW_TEMPLATE.completionCriteria.requiredPhaseIds ?? [];
    expect(requiredPhaseIds).toContain("funnel_state");

    const outputFieldIds = ONBOARDING_INTERVIEW_TEMPLATE.outputSchema.fields.map(
      (field) => field.fieldId
    );
    expect(outputFieldIds).toContain("accountStatus");
    expect(outputFieldIds).toContain("needsFullOnboarding");
  });

  it("preserves explicit cross-channel onboarding metadata", () => {
    expect(ONBOARDING_INTERVIEW_TEMPLATE.description).toContain("Telegram");
    expect(ONBOARDING_INTERVIEW_TEMPLATE.description).toContain("webchat");
    expect(ONBOARDING_INTERVIEW_TEMPLATE.description).toContain("native guest");
  });
});
