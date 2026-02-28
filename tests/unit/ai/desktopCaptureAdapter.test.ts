import { describe, expect, it, vi } from "vitest";
import {
  createDesktopCaptureAdapter,
  type DesktopCaptureProvider,
} from "../../../src/lib/av/capture/desktopCapture";

describe("desktop capture adapter", () => {
  it("normalizes screenshot captures into MediaSessionCaptureFrame", async () => {
    const provider: DesktopCaptureProvider = {
      captureScreenshot: vi.fn(async () => ({
        frameTimestampMs: 1_700_000_100_000,
        captureTimestampMs: 1_700_000_100_005,
        mimeType: "image/jpeg",
        payloadRef: "storage://frame-1",
        sizeBytes: 2048,
        width: 1920,
        height: 1080,
      })),
      captureRecording: vi.fn(async () => ({
        frames: [],
      })),
    };

    const adapter = createDesktopCaptureAdapter({
      provider,
      now: () => 1_700_000_000_000,
    });

    const frame = await adapter.captureScreenshot({
      liveSessionId: "live_session_1",
      sourceId: "desktop:display-1",
      deviceId: "display-1",
    });

    expect(frame.schemaVersion).toBe("media_session_capture_frame_v1");
    expect(frame.sourceClass).toBe("desktop_screenshot");
    expect(frame.captureMode).toBe("screenshot");
    expect(frame.liveSessionId).toBe("live_session_1");
    expect(frame.sourceId).toBe("desktop:display-1");
    expect(frame.sequence).toBe(1);
    expect(frame.mimeType).toBe("image/jpeg");
    expect(frame.payloadRef).toBe("storage://frame-1");
    expect(frame.resolution).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(frame.metadata).toEqual({
      deviceId: "display-1",
    });
    expect(provider.captureScreenshot).toHaveBeenCalledWith({
      sourceId: "desktop:display-1",
      deviceId: "display-1",
    });
  });

  it("enforces bounded recording duration and preserves mic/loopback intent", async () => {
    const provider: DesktopCaptureProvider = {
      captureScreenshot: vi.fn(async () => ({
        mimeType: "image/png",
      })),
      captureRecording: vi.fn(async () => ({
        startedAtMs: 1_700_100_000_000,
        captureToIngressLatencyMs: 87,
        droppedFrameCount: 2,
        lateFrameCount: 1,
        audioTrack: {
          sampleRateHz: 48_000,
          channels: 2,
          mimeType: "audio/webm",
        },
        frames: [
          {
            frameTimestampMs: 1_700_100_000_005,
            mimeType: "video/webm",
            payloadRef: "storage://recording-frame-1",
          },
          {
            frameTimestampMs: 1_700_100_000_038,
            mimeType: "video/webm",
            payloadRef: "storage://recording-frame-2",
          },
        ],
      })),
    };

    const adapter = createDesktopCaptureAdapter({
      provider,
      maxRecordingDurationMs: 15_000,
      now: () => 1_700_000_000_000,
    });

    const result = await adapter.captureRecording({
      liveSessionId: "live_session_2",
      durationMs: 120_000,
      frameRate: 30,
      withMicAudio: true,
      withSystemAudio: true,
    });

    expect(provider.captureRecording).toHaveBeenCalledWith({
      sourceId: "desktop:primary",
      durationMs: 15_000,
      frameRate: 30,
      withMicAudio: true,
      withSystemAudio: true,
    });
    expect(result.requestedDurationMs).toBe(120_000);
    expect(result.boundedDurationMs).toBe(15_000);
    expect(result.frameRate).toBe(30);
    expect(result.frames).toHaveLength(2);
    expect(result.frames[0]?.captureMode).toBe("record");
    expect(result.frames[0]?.sourceClass).toBe("desktop_record");
    expect(result.frames[0]?.sequence).toBe(1);
    expect(result.frames[1]?.sequence).toBe(2);
    expect(result.frames[0]?.audioRuntime).toEqual({
      withMicAudio: true,
      withSystemAudio: true,
      sampleRateHz: 48_000,
      channels: 2,
      mimeType: "audio/webm",
    });
    expect(result.diagnostics).toEqual({
      requestedDurationMs: 120_000,
      boundedDurationMs: 15_000,
      frameCount: 2,
      droppedFrameCount: 2,
      lateFrameCount: 1,
      captureToIngressLatencyMs: 87,
    });
  });

  it("builds deterministic timestamps when provider omits frame timing", async () => {
    const provider: DesktopCaptureProvider = {
      captureScreenshot: vi.fn(async () => ({
        mimeType: "image/png",
      })),
      captureRecording: vi.fn(async () => ({
        frames: [{}, {}],
      })),
    };

    const adapter = createDesktopCaptureAdapter({
      provider,
      now: () => 1_700_000_500_000,
      minRecordingDurationMs: 1000,
      maxRecordingDurationMs: 10_000,
    });

    const result = await adapter.captureRecording({
      liveSessionId: "live_session_3",
      durationMs: 250,
    });

    expect(result.boundedDurationMs).toBe(1000);
    expect(result.frames[0]?.frameTimestampMs).toBe(1_700_000_500_000);
    expect(result.frames[1]?.frameTimestampMs).toBe(1_700_000_500_001);
    expect(result.frames[0]?.captureTimestampMs).toBe(1_700_000_500_000);
    expect(result.frames[1]?.captureTimestampMs).toBe(1_700_000_500_001);
  });
});
