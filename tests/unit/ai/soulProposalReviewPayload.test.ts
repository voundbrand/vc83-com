import { describe, expect, it } from "vitest";
import {
  DEFAULT_CORE_MEMORY_POLICY,
  buildOperatorReviewPayload,
  evaluateCoreMemoryProposalGuard,
} from "../../../convex/ai/soulEvolution";

describe("soul proposal operator review payload", () => {
  it("blocks non-additive core-memory mutations", () => {
    const decision = evaluateCoreMemoryProposalGuard({
      targetField: "coreMemories",
      proposalType: "modify",
      proposedValue: "{\"narrative\":\"updated\"}",
      policy: DEFAULT_CORE_MEMORY_POLICY,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("immutable-by-default");
  });

  it("blocks explicit mutable core-memory proposals when immutable-by-default is on", () => {
    const decision = evaluateCoreMemoryProposalGuard({
      targetField: "coreMemories",
      proposalType: "add",
      proposedValue: "{\"type\":\"identity\",\"narrative\":\"anchor\",\"immutable\":false}",
      policy: DEFAULT_CORE_MEMORY_POLICY,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("immutable=false");
  });

  it("builds high-signal operator payload for core-memory review", () => {
    const payload = buildOperatorReviewPayload({
      targetField: "coreMemories",
      proposalType: "add",
      triggerType: "owner_directed",
      reason: "Add onboarding identity anchor",
      proposedValue: "{\"type\":\"identity\",\"narrative\":\"protect trust\"}",
      policy: DEFAULT_CORE_MEMORY_POLICY,
      driftSummary: "identity=0.74, boundary=0.20, overall=0.47",
    });

    expect(payload.coreMemoryTarget).toBe(true);
    expect(payload.immutableByDefault).toBe(true);
    expect(payload.overlayLayer).toBe("identity_anchor");
    expect(payload.riskLevel).toBe("high");
    expect(payload.reviewChecklist.some((item) => item.includes("immutability"))).toBe(
      true
    );
  });
});
