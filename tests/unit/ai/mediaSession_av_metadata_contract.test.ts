import { describe, expect, it } from "vitest";
import {
  MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION,
  MEDIA_SESSION_RUNTIME_METADATA_KEYS,
  assertMediaSessionRuntimeMetadata,
  normalizeMediaSessionRuntimeMetadata,
  toMediaSessionRuntimeEnvelopeMetadata,
} from "../../../src/lib/av/session/mediaSessionContract";

describe("media session runtime metadata contract", () => {
  it("normalizes canonical live/camera/voice runtime metadata", () => {
    const metadata = normalizeMediaSessionRuntimeMetadata({
      liveSessionId: " live_session_9 ",
      interviewSessionId: " interview_session_9 ",
      cameraRuntime: {
        provider: "avfoundation",
        sessionState: "capturing",
        startedAt: 1_700_444_000_123,
        lastFrameCapturedAt: 1_700_444_001_999,
        frameCaptureCount: 42,
      },
      voiceRuntime: {
        voiceSessionId: "voice_session_9",
        sessionState: "capturing",
      },
      transportRuntime: {
        mode: "realtime",
        fallbackReason: "none",
        diagnostics: {
          jitterMsP95: 12.5,
          fallbackTransitionCount: 1,
        },
        observability: {
          sessionStartedAtMs: 1_700_444_000_100,
          lifecycleState: "running",
          mouthToEarEstimateMs: 45,
          fallbackTransitionCount: 1,
          sourceHealth: {
            status: "healthy",
            deviceAvailable: true,
            providerFailoverActive: false,
            policyRestricted: false,
          },
        },
      },
      sourceAttestation: {
        contractVersion: "mobile_source_attestation_v1",
        verificationStatus: "verified",
        verified: true,
        reasonCodes: ["attestation_ok"],
      },
    });

    expect(metadata).toEqual({
      contractVersion: MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION,
      liveSessionId: "live_session_9",
      interviewSessionId: "interview_session_9",
      cameraRuntime: {
        provider: "avfoundation",
        sessionState: "capturing",
        startedAt: 1_700_444_000_123,
        lastFrameCapturedAt: 1_700_444_001_999,
        frameCaptureCount: 42,
      },
      voiceRuntime: {
        voiceSessionId: "voice_session_9",
        sessionState: "capturing",
        providerId: undefined,
        language: undefined,
        sampleRateHz: undefined,
        runtimeError: undefined,
        fallbackReason: undefined,
      },
      transportRuntime: {
        mode: "realtime",
        fallbackReason: "none",
        transportId: undefined,
        protocol: undefined,
        diagnostics: {
          latencyMsP50: undefined,
          latencyMsP95: undefined,
          jitterMsP50: undefined,
          jitterMsP95: 12.5,
          packetLossPct: undefined,
          bitrateKbps: undefined,
          reconnectCount: undefined,
          fallbackTransitionCount: 1,
        },
        observability: {
          sessionStartedAtMs: 1_700_444_000_100,
          sessionStoppedAtMs: undefined,
          lifecycleState: "running",
          lastErrorCode: undefined,
          lastErrorMessage: undefined,
          frameCadenceMs: undefined,
          frameCadenceFps: undefined,
          jitterMsP95: undefined,
          mouthToEarEstimateMs: 45,
          fallbackTransitionCount: 1,
          reconnectCount: undefined,
          replayDuplicateCount: undefined,
          sourceHealth: {
            status: "healthy",
            deviceAvailable: true,
            providerFailoverActive: false,
            policyRestricted: false,
          },
        },
      },
      sourceAttestation: {
        contractVersion: "mobile_source_attestation_v1",
        verificationStatus: "verified",
        verified: true,
        keyId: undefined,
        challengeId: undefined,
        nonce: undefined,
        reasonCodes: ["attestation_ok"],
      },
    });

    expect(toMediaSessionRuntimeEnvelopeMetadata(metadata)).toEqual({
      [MEDIA_SESSION_RUNTIME_METADATA_KEYS.liveSessionId]: "live_session_9",
      [MEDIA_SESSION_RUNTIME_METADATA_KEYS.interviewSessionId]:
        "interview_session_9",
      [MEDIA_SESSION_RUNTIME_METADATA_KEYS.cameraRuntime]: {
        provider: "avfoundation",
        sessionState: "capturing",
        startedAt: 1_700_444_000_123,
        lastFrameCapturedAt: 1_700_444_001_999,
        frameCaptureCount: 42,
      },
      [MEDIA_SESSION_RUNTIME_METADATA_KEYS.voiceRuntime]: {
        voiceSessionId: "voice_session_9",
        sessionState: "capturing",
        providerId: undefined,
        language: undefined,
        sampleRateHz: undefined,
        runtimeError: undefined,
        fallbackReason: undefined,
      },
      [MEDIA_SESSION_RUNTIME_METADATA_KEYS.transportRuntime]: {
        mode: "realtime",
        fallbackReason: "none",
        transportId: undefined,
        protocol: undefined,
        diagnostics: {
          latencyMsP50: undefined,
          latencyMsP95: undefined,
          jitterMsP50: undefined,
          jitterMsP95: 12.5,
          packetLossPct: undefined,
          bitrateKbps: undefined,
          reconnectCount: undefined,
          fallbackTransitionCount: 1,
        },
        observability: {
          sessionStartedAtMs: 1_700_444_000_100,
          sessionStoppedAtMs: undefined,
          lifecycleState: "running",
          lastErrorCode: undefined,
          lastErrorMessage: undefined,
          frameCadenceMs: undefined,
          frameCadenceFps: undefined,
          jitterMsP95: undefined,
          mouthToEarEstimateMs: 45,
          fallbackTransitionCount: 1,
          reconnectCount: undefined,
          replayDuplicateCount: undefined,
          sourceHealth: {
            status: "healthy",
            deviceAvailable: true,
            providerFailoverActive: false,
            policyRestricted: false,
          },
        },
      },
      [MEDIA_SESSION_RUNTIME_METADATA_KEYS.sourceAttestation]: {
        contractVersion: "mobile_source_attestation_v1",
        verificationStatus: "verified",
        verified: true,
        keyId: undefined,
        challengeId: undefined,
        nonce: undefined,
        reasonCodes: ["attestation_ok"],
      },
    });
  });

  it("fails closed when liveSessionId is missing", () => {
    expect(() =>
      normalizeMediaSessionRuntimeMetadata({
        liveSessionId: " \n ",
      })
    ).toThrow(/liveSessionId/);
  });

  it("asserts normalized metadata requires non-empty liveSessionId", () => {
    expect(() =>
      assertMediaSessionRuntimeMetadata({
        contractVersion: MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION,
        liveSessionId: "",
      })
    ).toThrow(/liveSessionId/);
  });

  it("fails closed when voiceRuntime is present without voiceSessionId", () => {
    expect(() =>
      assertMediaSessionRuntimeMetadata({
        contractVersion: MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION,
        liveSessionId: "live_1",
        voiceRuntime: {
          sessionState: "capturing",
        },
      })
    ).toThrow(/voiceRuntime.voiceSessionId/);
  });

  it("fails closed when source attestation marked verified without verified status", () => {
    expect(() =>
      assertMediaSessionRuntimeMetadata({
        contractVersion: MEDIA_SESSION_RUNTIME_METADATA_CONTRACT_VERSION,
        liveSessionId: "live_1",
        sourceAttestation: {
          verified: true,
          verificationStatus: "pending",
        },
      })
    ).toThrow(/verificationStatus=verified/);
  });
});
