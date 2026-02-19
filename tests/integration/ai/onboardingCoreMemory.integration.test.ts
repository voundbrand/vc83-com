import { describe, expect, it } from "vitest";
import { distillOnboardingCoreMemories } from "../../../convex/ai/interviewRunner";
import { ONBOARDING_INTERVIEW_TEMPLATE } from "../../../convex/onboarding/seedPlatformAgents";

describe("onboarding core memory integration", () => {
  it("includes the core-memory elicitation phase in onboarding template flow", () => {
    const phase = ONBOARDING_INTERVIEW_TEMPLATE.phases.find(
      (candidate) => candidate.phaseId === "core_memory_anchors"
    );

    expect(phase).toBeDefined();
    expect(phase?.questions.map((question) => question.extractionField)).toEqual([
      "coreMemoryIdentityAnchor",
      "coreMemoryBoundaryAnchor",
      "coreMemoryEmpathyAnchor",
    ]);
  });

  it("distills elicited onboarding anchors into typed memories", () => {
    const distillation = distillOnboardingCoreMemories(
      ONBOARDING_INTERVIEW_TEMPLATE,
      {
        coreMemoryIdentityAnchor: "Our assistant should always protect brand trust first.",
        coreMemoryBoundaryAnchor:
          "Escalate any legal or compliance request to a human immediately.",
        coreMemoryEmpathyAnchor:
          "Users should feel understood before we offer solutions.",
      },
      Date.now()
    );

    expect(distillation.sourceTemplateName).toBe("Platform Onboarding");
    expect(distillation.memories.map((memory) => memory.type)).toEqual([
      "identity",
      "boundary",
      "empathy",
    ]);
  });
});
