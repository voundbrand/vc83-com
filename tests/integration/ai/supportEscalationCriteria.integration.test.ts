import { describe, expect, it } from "vitest";
import { evaluateSupportEscalationCriteria } from "../../../convex/ai/conversations";

describe("support escalation criteria contract", () => {
  it("forces high urgency escalation for billing disputes", () => {
    const decision = evaluateSupportEscalationCriteria({
      requestedHuman: false,
      billingDispute: true,
      accountSecurityRisk: false,
      legalRisk: false,
      unresolvedCheckFailures: 0,
      frustrationSignals: 0,
      unsupportedRequest: false,
    });

    expect(decision.shouldEscalate).toBe(true);
    expect(decision.urgency).toBe("high");
    expect(decision.matchedCriteria).toContain("billing_dispute_or_refund");
  });

  it("escalates at normal urgency after repeated unresolved verification cycles", () => {
    const decision = evaluateSupportEscalationCriteria({
      requestedHuman: false,
      billingDispute: false,
      accountSecurityRisk: false,
      legalRisk: false,
      unresolvedCheckFailures: 2,
      frustrationSignals: 1,
      unsupportedRequest: false,
    });

    expect(decision.shouldEscalate).toBe(true);
    expect(decision.urgency).toBe("normal");
    expect(decision.matchedCriteria).toContain("repeated_unresolved_verification");
  });
});
