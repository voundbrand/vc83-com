import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { convertUsdToCredits } from "../../../convex/ai/modelPricing";
import {
  meterNonChatAiUsage,
  type NonChatAiUsageMeteringRunners,
} from "../../../convex/ai/nonChatUsageMetering";

const organizationId = "org_metering" as Id<"organizations">;
const userId = "user_metering" as Id<"users">;

function createRunners(
  overrides: Partial<NonChatAiUsageMeteringRunners> = {}
): NonChatAiUsageMeteringRunners {
  return {
    deductCredits: vi.fn(async () => ({
      success: true,
      skipped: false,
    })),
    recordUsage: vi.fn(async () => ({
      usageId: "usage_123",
    })),
    ...overrides,
  };
}

describe("non-chat usage metering contract", () => {
  it("charges platform credits and records canonical native usage telemetry", async () => {
    const runners = createRunners();
    const expectedCredits = convertUsdToCredits(0.42);

    const result = await meterNonChatAiUsage({
      runners,
      organizationId,
      userId,
      requestType: "voice_tts",
      provider: "elevenlabs",
      model: "elevenlabs_voice_runtime",
      action: "voice_synthesis",
      billingSource: "platform",
      creditLedgerAction: "voice_synthesis",
      relatedEntityType: "agent_session",
      relatedEntityId: "session_123",
      success: true,
      usage: {
        nativeUsageUnit: "seconds",
        nativeUsageQuantity: 12,
        nativeInputUnits: 0,
        nativeOutputUnits: 12,
        nativeTotalUnits: 12,
        nativeCostInCents: 42,
        nativeCostCurrency: "USD",
        nativeCostSource: "provider_reported",
        providerRequestId: "req_abc",
        metadata: {
          durationMs: 12_000,
        },
      },
      usageMetadata: {
        channel: "voice_runtime",
      },
    });

    expect(result.creditsToCharge).toBe(expectedCredits);
    expect(result.creditsCharged).toBe(expectedCredits);
    expect(result.creditChargeStatus).toBe("charged");

    expect(runners.deductCredits).toHaveBeenCalledTimes(1);
    expect(runners.deductCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        userId,
        amount: expectedCredits,
        action: "voice_synthesis",
        relatedEntityType: "agent_session",
        relatedEntityId: "session_123",
        billingSource: "platform",
        requestSource: "llm",
      })
    );

    expect(runners.recordUsage).toHaveBeenCalledTimes(1);
    expect(runners.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        userId,
        requestType: "voice_tts",
        provider: "elevenlabs",
        model: "elevenlabs_voice_runtime",
        action: "voice_synthesis",
        costInCents: 42,
        nativeUsageUnit: "seconds",
        nativeUsageQuantity: 12,
        nativeOutputUnits: 12,
        nativeTotalUnits: 12,
        nativeCostInCents: 42,
        nativeCostCurrency: "USD",
        nativeCostSource: "provider_reported",
        providerRequestId: "req_abc",
        creditsCharged: expectedCredits,
        creditChargeStatus: "charged",
        billingSource: "platform",
        requestSource: "llm",
        ledgerMode: "credits_ledger",
        creditLedgerAction: "voice_synthesis",
      })
    );

    const recordUsageCalls = vi.mocked(runners.recordUsage).mock.calls;
    const usageMetadata = recordUsageCalls[0]?.[0]?.usageMetadata as
      | Record<string, unknown>
      | undefined;
    expect(usageMetadata).toMatchObject({
      channel: "voice_runtime",
      providerUsage: {
        durationMs: 12_000,
      },
    });
  });

  it("skips credit charging for BYOK usage while still writing telemetry", async () => {
    const runners = createRunners();

    const result = await meterNonChatAiUsage({
      runners,
      organizationId,
      requestType: "completion",
      provider: "openrouter",
      model: "anthropic/claude-3.7-sonnet",
      action: "soul_evolution",
      billingSource: "byok",
      success: true,
      usage: {
        nativeUsageUnit: "tokens",
        nativeInputUnits: 150,
        nativeOutputUnits: 80,
        nativeTotalUnits: 230,
        nativeCostInCents: 19,
      },
    });

    expect(result.creditChargeStatus).toBe("skipped_not_required");
    expect(result.creditsCharged).toBe(0);
    expect(runners.deductCredits).not.toHaveBeenCalled();
    expect(runners.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        billingSource: "byok",
        creditChargeStatus: "skipped_not_required",
        creditsCharged: 0,
      })
    );
  });

  it("forces platform billing for platform_action request source", async () => {
    const runners = createRunners();
    const expectedCredits = convertUsdToCredits(0.5);

    const result = await meterNonChatAiUsage({
      runners,
      organizationId,
      requestType: "tool_call",
      provider: "system",
      model: "platform_tool_runtime",
      action: "tool_run_platform_productivity_loop",
      billingSource: "byok",
      requestSource: "platform_action",
      creditLedgerAction: "tool_run_platform_productivity_loop",
      success: true,
      costInCents: 50,
    });

    expect(result.billingPolicy.effectiveBillingSource).toBe("platform");
    expect(result.billingPolicy.requestSource).toBe("platform_action");
    expect(result.creditsCharged).toBe(expectedCredits);
    expect(result.creditChargeStatus).toBe("charged");

    expect(runners.deductCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        billingSource: "platform",
        requestSource: "platform_action",
      })
    );
    expect(runners.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        billingSource: "platform",
        requestSource: "platform_action",
      })
    );
  });

  it("supports private billing source without credit deduction", async () => {
    const runners = createRunners();

    const result = await meterNonChatAiUsage({
      runners,
      organizationId,
      requestType: "voice_stt",
      provider: "browser",
      model: "browser_voice_runtime",
      action: "voice_transcription",
      billingSource: "private",
      success: true,
      usage: {
        nativeUsageUnit: "seconds",
        nativeUsageQuantity: 7.5,
      },
    });

    expect(result.creditChargeStatus).toBe("skipped_not_required");
    expect(result.creditsCharged).toBe(0);
    expect(runners.deductCredits).not.toHaveBeenCalled();
    expect(runners.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        billingSource: "private",
        creditChargeStatus: "skipped_not_required",
        creditsCharged: 0,
      })
    );
  });

  it("requires credit ledger action for credit-metered requests", async () => {
    const runners = createRunners();

    await expect(
      meterNonChatAiUsage({
        runners,
        organizationId,
        requestType: "completion",
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        action: "interview_generation",
        billingSource: "platform",
        success: true,
        costInCents: 12,
      })
    ).rejects.toThrow(/creditLedgerAction/i);

    expect(runners.deductCredits).not.toHaveBeenCalled();
    expect(runners.recordUsage).not.toHaveBeenCalled();
  });
});
