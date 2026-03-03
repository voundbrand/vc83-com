import { describe, expect, it } from "vitest";
import { createVoiceRuntimeChaosHarness } from "../../../apps/operator-mobile/src/lib/voice/chaosHarness";

describe("mobile voice chaos harness", () => {
  it("passes through payloads unchanged when disabled", () => {
    const harness = createVoiceRuntimeChaosHarness<string>({
      enabled: false,
      dropEveryN: 2,
      reorderWindowSize: 3,
      jitterMs: 50,
      forceProviderTimeout: true,
    });

    expect(harness.planOutbound({ sequence: 0, payload: "a" })).toEqual([
      { payload: "a", delayMs: 0 },
    ]);
    expect(harness.shouldForceProviderTimeout()).toBe(false);
  });

  it("drops deterministic packets, reorders by window, and annotates jitter delay", () => {
    const harness = createVoiceRuntimeChaosHarness<string>({
      enabled: true,
      dropEveryN: 4,
      reorderWindowSize: 2,
      jitterMs: 80,
      forceProviderTimeout: false,
    });

    expect(harness.planOutbound({ sequence: 0, payload: "s0" })).toEqual([]);
    expect(harness.planOutbound({ sequence: 1, payload: "s1" })).toEqual([
      { payload: "s1", delayMs: 80 },
      { payload: "s0", delayMs: 80 },
    ]);
    expect(harness.planOutbound({ sequence: 2, payload: "s2" })).toEqual([]);
    expect(harness.planOutbound({ sequence: 3, payload: "s3" })).toEqual([]);
    expect(harness.flushOutbound()).toEqual([{ payload: "s2", delayMs: 80 }]);
  });

  it("surfaces forced provider timeout mode for chaos tests", () => {
    const harness = createVoiceRuntimeChaosHarness<string>({
      enabled: true,
      dropEveryN: 0,
      reorderWindowSize: 1,
      jitterMs: 0,
      forceProviderTimeout: true,
    });

    expect(harness.shouldForceProviderTimeout()).toBe(true);
  });
});
