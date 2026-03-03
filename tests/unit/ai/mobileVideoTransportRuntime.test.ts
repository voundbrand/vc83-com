import { describe, expect, it } from "vitest";

import {
  buildVideoFrameIngressEnvelope,
  resolveVideoTransportRuntimeSelection,
  shouldThrottleVideoCapture,
} from "../../../apps/operator-mobile/src/lib/av/videoTransport";

describe("mobile video transport runtime", () => {
  it("preserves fallback parity with websocket voice runtime", () => {
    const selection = resolveVideoTransportRuntimeSelection({
      voiceSelection: {
        requestedMode: "websocket",
        effectiveMode: "websocket",
      },
      isVoiceRealtimeConnected: true,
      policyRestricted: false,
      deviceAvailable: true,
    });

    expect(selection.mode).toBe("realtime");
    expect(selection.fallbackReason).toBe("none");
    expect(selection.protocol).toBe("https");
  });

  it("falls back to buffered mode when voice realtime transport is degraded", () => {
    const selection = resolveVideoTransportRuntimeSelection({
      voiceSelection: {
        requestedMode: "websocket",
        effectiveMode: "websocket",
      },
      isVoiceRealtimeConnected: false,
      policyRestricted: false,
      deviceAvailable: true,
    });

    expect(selection.mode).toBe("buffered");
    expect(selection.fallbackReason).toBe("network_degraded");
  });

  it("applies deterministic capture cadence throttling", () => {
    const throttled = shouldThrottleVideoCapture({
      nowMs: 10_450,
      lastCaptureAtMs: 10_000,
      cadenceMs: 750,
    });
    expect(throttled.throttled).toBe(true);
    expect(throttled.retryAfterMs).toBe(300);

    const allowed = shouldThrottleVideoCapture({
      nowMs: 10_900,
      lastCaptureAtMs: 10_000,
      cadenceMs: 750,
    });
    expect(allowed.throttled).toBe(false);
    expect(allowed.retryAfterMs).toBe(0);
  });

  it("builds avr_media_session_ingress_v1 envelope with required video session sequencing fields", () => {
    const envelope = buildVideoFrameIngressEnvelope({
      liveSessionId: "mobile_live_video_1",
      sourceMode: "iphone",
      sourceId: "iphone_camera:ios_avfoundation:rear",
      sourceProviderId: "ios_avfoundation",
      videoSessionId: "mobile_video_mobile_live_video_1",
      packetSequence: 4,
      frameTimestampMs: 1_700_000_000_000,
      captureTimestampMs: 1_700_000_000_000,
      frameRate: 15,
      transportRuntime: {
        mode: "realtime",
        fallbackReason: "none",
        protocol: "https",
      },
      framePayloadBase64: "aGVsbG8=",
      fallbackTransitionCount: 1,
      reconnectCount: 0,
      mimeType: "image/jpeg",
    });

    expect(envelope.contractVersion).toBe("avr_media_session_ingress_v1");
    expect(envelope.videoRuntime.videoSessionId).toBe("mobile_video_mobile_live_video_1");
    expect(envelope.videoRuntime.packetSequence).toBe(4);
    expect(envelope.videoRuntime.framePayloadBase64).toBe("aGVsbG8=");
    expect(envelope.captureRuntime.captureMode).toBe("stream");
    expect(envelope.transportRuntime.fallbackReason).toBe("none");
    expect(envelope.authority.directDeviceMutation).toBe("fail_closed");
  });
});
