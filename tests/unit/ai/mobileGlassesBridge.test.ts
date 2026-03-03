import { describe, expect, it } from "vitest";
import {
  buildMobileGlassesSourceId,
  createMobileGlassesIngressBridge,
} from "../../../src/lib/av/ingress/mobileGlassesBridge";

describe("mobile glasses ingress bridge", () => {
  it("starts mobile session and emits stream frames with source provenance metadata", () => {
    const nowValues = [1_700_950_000_000, 1_700_950_000_050];
    const bridge = createMobileGlassesIngressBridge({
      now: () => nowValues.shift() ?? 1_700_950_000_050,
    });

    const session = bridge.startSession({
      liveSessionId: "live_session_mobile_1",
      sourceClass: "mobile_stream_ios",
      providerId: "iOS Bridge",
      deviceProfile: "iPhone 15 Pro",
      streamId: "Front Camera",
      transport: "webrtc",
      targetLatencyMs: 120,
      maxLatencyMs: 240,
      withMicAudio: true,
    });

    const frame = bridge.ingestFrame({
      sourceId: session.sourceId,
      frameTimestampMs: 1_700_950_000_000,
      mimeType: "video/mp4",
      payloadRef: "storage://ios-frame-1",
      width: 1280,
      height: 720,
    });

    expect(session.sourceId).toBe(
      "mobile_stream_ios:ios_bridge:iphone_15_pro:front_camera"
    );
    expect(frame.sourceClass).toBe("mobile_stream_ios");
    expect(frame.captureMode).toBe("stream");
    expect(frame.sequence).toBe(1);
    expect(frame.audioRuntime).toEqual({
      withMicAudio: true,
      withSystemAudio: false,
    });
    expect(frame.metadata).toEqual({
      providerId: "ios_bridge",
      deviceProfile: "iphone_15_pro",
      streamId: "front_camera",
      transport: "webrtc",
      targetLatencyMs: 120,
      maxLatencyMs: 240,
      latencyBudgetBreached: false,
    });
    expect(frame.diagnostics).toEqual({
      captureToIngressLatencyMs: 50,
      droppedFrameCount: undefined,
      lateFrameCount: undefined,
    });
  });

  it("keeps sequence and timestamp monotonic when frame timing is missing", () => {
    const bridge = createMobileGlassesIngressBridge({
      now: () => 1_700_960_000_000,
    });
    const session = bridge.startSession({
      liveSessionId: "live_session_mobile_2",
      sourceClass: "mobile_stream_android",
      deviceProfile: "Pixel 9",
    });

    const first = bridge.ingestFrame({
      sourceId: session.sourceId,
    });
    const second = bridge.ingestFrame({
      sourceId: session.sourceId,
    });

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(first.frameTimestampMs).toBe(1_700_960_000_000);
    expect(second.frameTimestampMs).toBe(1_700_960_000_001);
    expect(first.captureTimestampMs).toBe(1_700_960_000_000);
    expect(second.captureTimestampMs).toBe(1_700_960_000_001);
  });

  it("enforces session control for pause, resume, and stop", () => {
    let nowMs = 1_700_970_000_000;
    const bridge = createMobileGlassesIngressBridge({
      now: () => nowMs,
    });
    const session = bridge.startSession({
      liveSessionId: "live_session_glasses_1",
      sourceClass: "glasses_stream_meta",
      deviceProfile: "RayBan Meta",
    });

    nowMs += 10;
    const paused = bridge.pauseSession(session.sourceId);
    expect(paused.status).toBe("paused");
    expect(() =>
      bridge.ingestFrame({
        sourceId: session.sourceId,
      })
    ).toThrow(/paused/);

    nowMs += 10;
    const resumed = bridge.resumeSession(session.sourceId);
    expect(resumed.status).toBe("running");
    const resumedFrame = bridge.ingestFrame({
      sourceId: session.sourceId,
      frameTimestampMs: nowMs - 2,
    });
    expect(resumedFrame.sequence).toBe(1);

    nowMs += 10;
    const stopped = bridge.stopSession(session.sourceId);
    expect(stopped.status).toBe("stopped");
    expect(() =>
      bridge.ingestFrame({
        sourceId: session.sourceId,
      })
    ).toThrow(/stopped/);
  });

  it("enforces webrtc relay transport for meta glasses sessions", () => {
    const bridge = createMobileGlassesIngressBridge({
      now: () => 1_700_975_000_000,
    });

    expect(() =>
      bridge.startSession({
        liveSessionId: "live_session_glasses_transport_guard",
        sourceClass: "glasses_stream_meta",
        transport: "rtmp",
      })
    ).toThrow(/requires webrtc transport relay/i);
  });

  it("enforces meta DAT provider contract for meta glasses sessions", () => {
    const bridge = createMobileGlassesIngressBridge({
      now: () => 1_700_976_000_000,
    });

    expect(() =>
      bridge.startSession({
        liveSessionId: "live_session_glasses_provider_guard",
        sourceClass: "glasses_stream_meta",
        providerId: "ios_avfoundation",
        transport: "webrtc",
      })
    ).toThrow(/requires a meta DAT provider contract/i);
  });

  it("marks latency budget breaches and tracks dropped/late frame counters", () => {
    const nowValues = [1_700_980_000_000, 1_700_980_000_300];
    const bridge = createMobileGlassesIngressBridge({
      now: () => nowValues.shift() ?? 1_700_980_000_300,
    });
    const session = bridge.startSession({
      liveSessionId: "live_session_mobile_3",
      sourceClass: "mobile_stream_android",
      targetLatencyMs: 100,
      maxLatencyMs: 150,
    });

    const frame = bridge.ingestFrame({
      sourceId: session.sourceId,
      frameTimestampMs: 1_700_980_000_000,
      droppedFrameCount: 2,
      lateFrameCount: 1,
    });

    expect(frame.metadata?.latencyBudgetBreached).toBe(true);
    expect(frame.diagnostics).toEqual({
      captureToIngressLatencyMs: 300,
      droppedFrameCount: 2,
      lateFrameCount: 2,
    });

    const snapshot = bridge.getSessionSnapshot(session.sourceId);
    expect(snapshot?.frameCount).toBe(1);
    expect(snapshot?.droppedFrameCount).toBe(2);
    expect(snapshot?.lateFrameCount).toBe(2);
    expect(snapshot?.lastCaptureToIngressLatencyMs).toBe(300);
  });

  it("exports deterministic mobile/glasses source-id builder", () => {
    const sourceId = buildMobileGlassesSourceId({
      sourceClass: "glasses_stream_meta",
      providerId: "Meta Bridge",
      deviceProfile: "RayBan Meta 2",
      streamId: "Main Feed",
    });

    expect(sourceId).toBe("glasses_stream_meta:meta_bridge:rayban_meta_2:main_feed");
  });
});
