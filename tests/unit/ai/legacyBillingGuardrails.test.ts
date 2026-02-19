import { describe, expect, it } from "vitest";
import {
  resolveAiLegacyTokenLedgerPolicy,
} from "../../../convex/credits/index";
import { resolveAiUsageBillingGuardrail } from "../../../convex/ai/billing";

describe("legacy billing guardrails", () => {
  it("defaults to credits ledger as authoritative", () => {
    const decision = resolveAiLegacyTokenLedgerPolicy({});

    expect(decision.requestedLedgerMode).toBe("credits_ledger");
    expect(decision.effectiveLedgerMode).toBe("credits_ledger");
    expect(decision.allowLegacyTokenLedgerMutation).toBe(false);
    expect(decision.reason).toBe("credits_ledger_authoritative");
  });

  it("blocks explicit legacy token ledger requests", () => {
    const decision = resolveAiLegacyTokenLedgerPolicy({
      ledgerMode: "legacy_tokens",
    });

    expect(decision.requestedLedgerMode).toBe("legacy_tokens");
    expect(decision.effectiveLedgerMode).toBe("credits_ledger");
    expect(decision.allowLegacyTokenLedgerMutation).toBe(false);
    expect(decision.reason).toBe("legacy_token_ledger_disabled");
  });

  it("requires credit ledger action for platform-metered usage", () => {
    const decision = resolveAiUsageBillingGuardrail({
      billingSource: "platform",
      requestSource: "llm",
    });

    expect(decision.billingPolicy.enforceCredits).toBe(true);
    expect(decision.requiresCreditLedgerAction).toBe(true);
    expect(decision.billingPolicy.reason).toBe("llm_platform_metered");
  });

  it("does not require credit ledger action for byok llm usage", () => {
    const decision = resolveAiUsageBillingGuardrail({
      billingSource: "byok",
      requestSource: "llm",
    });

    expect(decision.billingPolicy.enforceCredits).toBe(false);
    expect(decision.requiresCreditLedgerAction).toBe(false);
    expect(decision.billingPolicy.reason).toBe("llm_byok_unmetered");
  });

  it("forces platform credits for non-llm platform actions", () => {
    const decision = resolveAiUsageBillingGuardrail({
      billingSource: "byok",
      requestSource: "platform_action",
    });

    expect(decision.billingPolicy.effectiveBillingSource).toBe("platform");
    expect(decision.billingPolicy.enforceCredits).toBe(true);
    expect(decision.requiresCreditLedgerAction).toBe(true);
    expect(decision.billingPolicy.reason).toBe("platform_action_forced_platform");
  });
});
