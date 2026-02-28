import { describe, expect, it, vi } from "vitest";
import {
  buildDeviceIngressSourceId,
  createDeviceIngestAdapter,
  type DeviceIngestProvider,
} from "../../../src/lib/av/ingress/deviceIngestAdapter";

describe("device ingest adapter", () => {
  it("normalizes webcam source identity deterministically", async () => {
    const provider: DeviceIngestProvider = {
      captureFrame: vi.fn(async () => ({
        frameTimestampMs: 1_700_200_000_005,
        captureTimestampMs: 1_700_200_000_010,
        mimeType: "video/mp4",
        payloadRef: "storage://webcam-frame-1",
        width: 1280,
        height: 720,
        metadata: {
          codec: "h264",
        },
      })),
    };

    const adapter = createDeviceIngestAdapter({
      provider,
      now: () => 1_700_200_000_000,
    });

    const frame = await adapter.captureFrame({
      liveSessionId: "live_session_webcam_1",
      sourceClass: "webcam",
      providerId: " UVC Runtime ",
      deviceId: " FaceTime HD Camera (Built-in) ",
      streamId: " Main Feed ",
      withMicAudio: true,
    });

    expect(frame.sourceId).toBe(
      "webcam:uvc_runtime:facetime_hd_camera_built-in:main_feed"
    );
    expect(frame.captureMode).toBe("stream");
    expect(frame.sequence).toBe(1);
    expect(frame.sourceClass).toBe("webcam");
    expect(frame.audioRuntime).toEqual({
      withMicAudio: true,
      withSystemAudio: false,
    });
    expect(frame.metadata).toEqual({
      providerId: "uvc_runtime",
      deviceId: "facetime_hd_camera_built-in",
      streamId: "main_feed",
      codec: "h264",
    });
    expect(provider.captureFrame).toHaveBeenCalledWith({
      sourceClass: "webcam",
      sourceId: "webcam:uvc_runtime:facetime_hd_camera_built-in:main_feed",
      sequence: 1,
      frameRate: 30,
      withMicAudio: true,
      withSystemAudio: false,
    });
  });

  it("builds monotonic timestamps and deterministic sequence when provider omits timing", async () => {
    const provider: DeviceIngestProvider = {
      captureFrame: vi.fn(async () => ({
        metadata: {
          transport: "uvc",
        },
      })),
    };

    const nowSamples = [1_700_300_000_000, 1_700_300_000_000];
    const adapter = createDeviceIngestAdapter({
      provider,
      now: () => nowSamples.shift() ?? 1_700_300_000_000,
    });

    const first = await adapter.captureFrame({
      liveSessionId: "live_session_usb_1",
      sourceClass: "usb_capture",
      deviceId: "capture-card-a",
    });
    const second = await adapter.captureFrame({
      liveSessionId: "live_session_usb_1",
      sourceClass: "usb_capture",
      deviceId: "capture-card-a",
    });

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(first.frameTimestampMs).toBe(1_700_300_000_000);
    expect(second.frameTimestampMs).toBe(1_700_300_000_001);
    expect(first.captureTimestampMs).toBe(1_700_300_000_000);
    expect(second.captureTimestampMs).toBe(1_700_300_000_001);
    expect(first.sourceId).toBe("usb_capture:native_capture_runtime:capture-card-a");
    expect(second.sourceId).toBe(first.sourceId);
  });

  it.each(["hdmi_capture", "ndi_capture"] as const)(
    "supports digital video ingress source class %s with diagnostics",
    async (sourceClass) => {
      const provider: DeviceIngestProvider = {
        captureFrame: vi.fn(async () => ({
          frameTimestampMs: 1_700_400_000_020,
          captureToIngressLatencyMs: 42,
          droppedFrameCount: 3,
          lateFrameCount: 1,
        })),
      };

      const adapter = createDeviceIngestAdapter({
        provider,
        now: () => 1_700_400_000_000,
      });

      const frame = await adapter.captureFrame({
        liveSessionId: "live_session_dvi_1",
        sourceClass,
        providerId: "Capture Engine",
        deviceId: "port-1",
        sequence: 7,
        frameRate: 60,
        withSystemAudio: true,
      });

      expect(frame.sourceClass).toBe(sourceClass);
      expect(frame.sequence).toBe(7);
      expect(frame.frameRate).toBe(60);
      expect(frame.sourceId).toBe(`${sourceClass}:capture_engine:port-1`);
      expect(frame.diagnostics).toEqual({
        captureToIngressLatencyMs: 42,
        droppedFrameCount: 3,
        lateFrameCount: 1,
      });
      expect(frame.audioRuntime).toEqual({
        withMicAudio: false,
        withSystemAudio: true,
      });
    }
  );

  it("exports deterministic source-id builder", () => {
    const sourceId = buildDeviceIngressSourceId({
      sourceClass: "ndi_capture",
      providerId: "NDI Runtime",
      deviceId: "Studio Feed",
      streamId: "Program",
    });

    expect(sourceId).toBe("ndi_capture:ndi_runtime:studio_feed:program");
  });
});
