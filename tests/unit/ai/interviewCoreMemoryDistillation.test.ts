import { describe, expect, it } from "vitest";
import {
  distillOnboardingCoreMemories,
} from "../../../convex/ai/interviewRunner";
import { ONBOARDING_INTERVIEW_TEMPLATE } from "../../../convex/onboarding/seedPlatformAgents";

describe("distillOnboardingCoreMemories", () => {
  it("maps onboarding anchor fields into typed immutable core memories", () => {
    const distillation = distillOnboardingCoreMemories(
      ONBOARDING_INTERVIEW_TEMPLATE,
      {
        coreMemoryIdentityAnchor: "Always sound like a trusted boutique advisor.",
        coreMemoryBoundaryAnchor: "Never process refunds over $200 without a manager.",
        coreMemoryEmpathyAnchor: "Customers should feel heard before any policy explanation.",
      },
      1739854321000
    );

    expect(distillation.memories).toHaveLength(3);
    expect(distillation.memories.map((memory) => memory.type)).toEqual([
      "identity",
      "boundary",
      "empathy",
    ]);
    expect(distillation.memories.every((memory) => memory.immutable)).toBe(true);
    expect(
      distillation.memories.every(
        (memory) => memory.immutableReason === "onboarding_anchor"
      )
    ).toBe(true);
  });

  it("omits empty anchors", () => {
    const distillation = distillOnboardingCoreMemories(
      ONBOARDING_INTERVIEW_TEMPLATE,
      {
        coreMemoryIdentityAnchor: "   ",
        coreMemoryBoundaryAnchor: "",
      },
      1739854321000
    );

    expect(distillation.memories).toEqual([]);
  });
});
