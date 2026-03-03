import { describe, expect, it } from "vitest";
import {
  resolveVoiceSessionOpenRateLimitDecision,
  resolveVoiceSessionOpenRateLimitProfileFromTier,
  resolveVoiceSessionOpenSecurityDecision,
} from "../../../convex/ai/voiceRuntime";

describe("voice runtime open security", () => {
  it("fails closed for protected mobile path when source attestation is missing", () => {
    const decision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: 1_710_000_000_000,
      liveSessionId: "live_mobile_missing_attestation",
      sourceMode: "mobile_stream_ios",
      voiceRuntime: {
        sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
        sourceClass: "iphone_microphone",
        providerId: "ios_avfoundation",
      },
      transportRuntime: {
        transport: "websocket",
      },
    });

    expect(decision.protectedPath).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain(
      "source_attestation_verification_failed",
    );
  });

  it("allows protected mobile path with stable transport metadata and source attestation parity", () => {
    const decision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: 1_710_000_100_000,
      liveSessionId: "live_mobile_attested_ok",
      sourceMode: "mobile_stream_ios",
      clientSurface: "mobile_api_v1",
      voiceRuntime: {
        liveSessionId: "live_mobile_attested_ok",
        sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
        sourceClass: "iphone_microphone",
        providerId: "ios_avfoundation",
        sourceAttestation: {
          contractVersion: "tcg_mobile_source_attestation_v1",
          challenge: "attn:live_mobile_attested_ok:iphone_microphone:nonce",
          nonce: "nonce",
          issuedAtMs: 1_710_000_099_000,
          sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
          sourceClass: "iphone_microphone",
          providerId: "ios_avfoundation",
          signature: "sigv1_tampered_signature",
        },
      },
      transportRuntime: {
        liveSessionId: "live_mobile_attested_ok",
        transport: "websocket",
      },
    });

    expect(decision.protectedPath).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain(
      "source_attestation_verification_failed",
    );
  });

  it("fails closed for meta source when transport is not webrtc", () => {
    const decision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: 1_710_000_200_000,
      liveSessionId: "live_meta_1",
      sourceMode: "meta_glasses",
      voiceRuntime: {
        sourceId: "glasses_stream_meta:meta_dat_bridge:rayban_meta:primary",
        sourceClass: "glasses_stream_meta",
        providerId: "meta_dat_bridge",
      },
      transportRuntime: {
        transport: "rtmp",
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain(
      "transport_session_attestation:meta_transport_must_be_webrtc",
    );
  });

  it("allows non-protected desktop/browser path without mobile attestation requirements", () => {
    const decision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: 1_710_000_210_000,
      clientSurface: "desktop_web",
      sourceMode: "webcam",
      voiceRuntime: {
        sourceId: "webcam:default",
        sourceClass: "webcam",
        providerId: "browser",
      },
    });
    expect(decision.protectedPath).toBe(false);
    expect(decision.allowed).toBe(true);
  });

  it("enforces per-session open rate limits with retry hints", () => {
    const nowMs = 1_710_000_300_000;
    const state = {
      windowStartMs: nowMs,
      openCount: 6,
    };
    const blocked = resolveVoiceSessionOpenRateLimitDecision({
      nowMs: nowMs + 500,
      state,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);

    const reset = resolveVoiceSessionOpenRateLimitDecision({
      nowMs: nowMs + 70_000,
      state,
    });
    expect(reset.allowed).toBe(true);
    expect(reset.nextState.openCount).toBe(1);
  });

  it("fails closed for mobile API surface when live session or source identity is missing", () => {
    const decision = resolveVoiceSessionOpenSecurityDecision({
      nowMs: 1_710_000_310_000,
      clientSurface: "mobile_api_v1",
      sourceMode: "mobile_stream_ios",
      voiceRuntime: {},
    });
    expect(decision.protectedPath).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain("missing_live_session_id");
    expect(decision.reasonCodes).toContain("missing_source_runtime_identity");
  });

  it("derives adaptive rate-limit profiles by org plan tier", () => {
    expect(resolveVoiceSessionOpenRateLimitProfileFromTier("free")).toEqual({
      windowMs: 60_000,
      maxRequests: 4,
    });
    expect(resolveVoiceSessionOpenRateLimitProfileFromTier("professional")).toEqual({
      windowMs: 60_000,
      maxRequests: 8,
    });
    expect(resolveVoiceSessionOpenRateLimitProfileFromTier("agency")).toEqual({
      windowMs: 60_000,
      maxRequests: 12,
    });
    expect(resolveVoiceSessionOpenRateLimitProfileFromTier("enterprise")).toEqual({
      windowMs: 60_000,
      maxRequests: 20,
    });
  });
});
