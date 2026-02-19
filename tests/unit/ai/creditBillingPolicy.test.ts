import { describe, expect, it } from "vitest";
import { resolveAiCreditBillingPolicy } from "../../../convex/credits/index";

describe("credit billing policy", () => {
  it("meters platform-backed llm usage through credits", () => {
    const policy = resolveAiCreditBillingPolicy({
      billingSource: "platform",
      requestSource: "llm",
    });

    expect(policy.enforceCredits).toBe(true);
    expect(policy.effectiveBillingSource).toBe("platform");
    expect(policy.reason).toBe("llm_platform_metered");
  });

  it("skips credit metering for llm byok usage", () => {
    const policy = resolveAiCreditBillingPolicy({
      billingSource: "byok",
      requestSource: "llm",
    });

    expect(policy.enforceCredits).toBe(false);
    expect(policy.effectiveBillingSource).toBe("byok");
    expect(policy.reason).toBe("llm_byok_unmetered");
  });

  it("skips credit metering for llm private usage", () => {
    const policy = resolveAiCreditBillingPolicy({
      billingSource: "private",
      requestSource: "llm",
    });

    expect(policy.enforceCredits).toBe(false);
    expect(policy.effectiveBillingSource).toBe("private");
    expect(policy.reason).toBe("llm_private_unmetered");
  });

  it("forces platform metering for non-llm platform actions", () => {
    const policy = resolveAiCreditBillingPolicy({
      billingSource: "byok",
      requestSource: "platform_action",
    });

    expect(policy.enforceCredits).toBe(true);
    expect(policy.effectiveBillingSource).toBe("platform");
    expect(policy.reason).toBe("platform_action_forced_platform");
  });

  it("defaults unknown policy inputs to safe platform metering", () => {
    const policy = resolveAiCreditBillingPolicy({
      billingSource: "unknown",
      requestSource: "not_real",
    });

    expect(policy.enforceCredits).toBe(true);
    expect(policy.effectiveBillingSource).toBe("platform");
    expect(policy.requestSource).toBe("platform_action");
  });
});
