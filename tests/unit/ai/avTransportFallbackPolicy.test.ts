import { describe, expect, it } from "vitest";
import { evaluateTransportDowngradePolicy } from "../../../src/lib/av/runtime/transportFallbackPolicy";

describe("av transport fallback policy", () => {
  it("keeps full_av with stable reason code when no fallback is active", () => {
    const resolution = evaluateTransportDowngradePolicy({
      fallbackReason: "none",
      diagnostics: {},
      previousProfile: "full_av",
    });

    expect(resolution.profile).toBe("full_av");
    expect(resolution.operatorReasonCode).toBe("stable_full_av");
    expect(resolution.changed).toBe(false);
    expect(resolution.nativePolicyPrecedence).toBe("vc83_runtime_policy");
    expect(resolution.approvalInvariant).toBe("non_bypassable");
  });

  it("downgrades to video_low_fps for moderate network degradation", () => {
    const resolution = evaluateTransportDowngradePolicy({
      fallbackReason: "network_degraded",
      diagnostics: {
        latencyMsP95: 420,
        jitterMsP95: 110,
        packetLossPct: 6,
      },
      previousProfile: "full_av",
    });

    expect(resolution.profile).toBe("video_low_fps");
    expect(resolution.operatorReasonCode).toBe(
      "network_degraded_video_low_fps"
    );
    expect(resolution.changed).toBe(true);
  });

  it("downgrades to audio_only for severe network degradation", () => {
    const resolution = evaluateTransportDowngradePolicy({
      fallbackReason: "network_degraded",
      diagnostics: {
        latencyMsP95: 1200,
        jitterMsP95: 260,
        packetLossPct: 18,
      },
      previousProfile: "video_low_fps",
    });

    expect(resolution.profile).toBe("audio_only");
    expect(resolution.operatorReasonCode).toBe("network_degraded_audio_only");
    expect(resolution.changed).toBe(true);
  });

  it("downgrades capture_backpressure to audio_only when pressure is severe", () => {
    const resolution = evaluateTransportDowngradePolicy({
      fallbackReason: "capture_backpressure",
      diagnostics: {},
      captureDroppedFrameCount: 9,
      captureLateFrameCount: 13,
      previousProfile: "video_low_fps",
    });

    expect(resolution.profile).toBe("audio_only");
    expect(resolution.operatorReasonCode).toBe(
      "capture_backpressure_audio_only"
    );
  });

  it("fails closed to policy_restricted_audio_only when policy invariants drift", () => {
    const resolution = evaluateTransportDowngradePolicy({
      fallbackReason: "none",
      diagnostics: {},
      runtimeAuthorityPrecedence: "legacy_runtime_policy",
      previousProfile: "video_low_fps",
    });

    expect(resolution.profile).toBe("audio_only");
    expect(resolution.operatorReasonCode).toBe("policy_restricted_audio_only");
    expect(resolution.nativePolicyPrecedence).toBe("vc83_runtime_policy");
    expect(resolution.approvalInvariant).toBe("non_bypassable");
  });

  it("emits recovered_full_av when the session climbs back from a downgrade", () => {
    const resolution = evaluateTransportDowngradePolicy({
      fallbackReason: "none",
      diagnostics: {},
      previousProfile: "audio_only",
    });

    expect(resolution.profile).toBe("full_av");
    expect(resolution.operatorReasonCode).toBe("recovered_full_av");
    expect(resolution.changed).toBe(true);
  });
});
