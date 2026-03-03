import { describe, expect, it } from "vitest";
import { resolveVoiceSessionOpenSecurityDecision } from "../../../convex/ai/voiceRuntime";

describe("voice runtime open security integration", () => {
  it("flags transport/session attestation mismatch when live session tokens drift", () => {
    const decision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: 1_710_100_000_000,
      liveSessionId: "live_a",
      sourceMode: "mobile_stream_ios",
      voiceRuntime: {
        liveSessionId: "live_b",
        sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
        sourceClass: "iphone_microphone",
        providerId: "ios_avfoundation",
      },
      transportRuntime: {
        liveSessionId: "live_c",
        transport: "websocket",
      },
    });

    expect(decision.protectedPath).toBe(true);
    expect(decision.transportSessionAttestation.required).toBe(true);
    expect(decision.transportSessionAttestation.verified).toBe(false);
    expect(decision.reasonCodes).toContain(
      "transport_session_attestation:live_session_id_mismatch",
    );
  });
});
