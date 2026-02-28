import { describe, expect, it, vi } from "vitest";
import type { DesktopCaptureAdapter } from "../../../src/lib/av/capture/desktopCapture";
import {
  createDesktopCaptureOrchestration,
} from "../../../src/lib/av/capture/desktopCaptureOrchestration";
import {
  AV_RUNTIME_AUTHORITY_PRECEDENCE,
  evaluateAvFallbackPolicy,
} from "../../../src/lib/av/runtime/avFallbackPolicy";

function createFrame(args: {
  liveSessionId: string;
  sourceId: string;
  sequence?: number;
}) {
  return {
    schemaVersion: "media_session_capture_frame_v1" as const,
    liveSessionId: args.liveSessionId,
    sourceClass: "desktop_screenshot" as const,
    captureMode: "screenshot" as const,
    sourceId: args.sourceId,
    sequence: args.sequence ?? 1,
    frameTimestampMs: 1_700_900_000_010,
    captureTimestampMs: 1_700_900_000_010,
    mimeType: "image/png",
  };
}

function createRecording(args: { liveSessionId: string; sourceId: string }) {
  return {
    requestedDurationMs: 1000,
    boundedDurationMs: 1000,
    frameRate: 12,
    sourceId: args.sourceId,
    withMicAudio: false,
    withSystemAudio: false,
    frames: [
      {
        schemaVersion: "media_session_capture_frame_v1" as const,
        liveSessionId: args.liveSessionId,
        sourceClass: "desktop_record" as const,
        captureMode: "record" as const,
        sourceId: args.sourceId,
        sequence: 1,
        frameTimestampMs: 1_700_900_000_020,
        captureTimestampMs: 1_700_900_000_020,
        mimeType: "video/webm",
      },
    ],
    diagnostics: {
      requestedDurationMs: 1000,
      boundedDurationMs: 1000,
      frameCount: 1,
    },
  };
}

describe("desktop capture orchestration", () => {
  it("supports start/pause/stop lifecycle and deterministic capture success", async () => {
    const adapter: DesktopCaptureAdapter = {
      captureScreenshot: vi.fn(async (request) =>
        createFrame({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
      captureRecording: vi.fn(async (request) =>
        createRecording({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
    };
    let nowMs = 1_700_900_000_000;
    const orchestration = createDesktopCaptureOrchestration({
      adapter,
      now: () => nowMs,
    });

    const started = orchestration.start({
      liveSessionId: "live_session_1",
      sourceId: "desktop:display-1",
      deviceId: "display-1",
      runtimePolicy: {
        runtimeAuthorityPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      },
    });
    expect(started.status).toBe("running");
    expect(started.runtimePolicy.runtimeAuthorityPrecedence).toBe(
      "vc83_runtime_policy"
    );
    expect(started.runtimePolicy.approvalInvariant).toBe("non_bypassable");

    nowMs += 20;
    const capture = await orchestration.capture({
      mode: "screenshot",
    });
    expect(capture.status).toBe("success");
    expect(capture.attemptCount).toBe(1);
    expect(capture.fallbackReason).toBe("none");
    expect(capture.frame?.liveSessionId).toBe("live_session_1");
    expect(adapter.captureScreenshot).toHaveBeenCalledTimes(1);

    const paused = orchestration.pause();
    expect(paused.status).toBe("paused");

    const blockedWhilePaused = await orchestration.capture({
      mode: "screenshot",
    });
    expect(blockedWhilePaused.status).toBe("fallback");
    expect(blockedWhilePaused.fallbackReason).toBe("session_paused");
    expect(blockedWhilePaused.attemptCount).toBe(0);
    expect(adapter.captureScreenshot).toHaveBeenCalledTimes(1);

    const stopped = orchestration.stop();
    expect(stopped.status).toBe("stopped");
  });

  it("retries deterministic provider errors and succeeds within bounded attempts", async () => {
    let callCount = 0;
    const adapter: DesktopCaptureAdapter = {
      captureScreenshot: vi.fn(async (request) => {
        callCount += 1;
        if (callCount < 3) {
          throw new Error("capture provider unavailable");
        }
        return createFrame({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
          sequence: callCount,
        });
      }),
      captureRecording: vi.fn(async (request) =>
        createRecording({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
    };
    const waitDelays: number[] = [];
    const orchestration = createDesktopCaptureOrchestration({
      adapter,
      now: () => 1_700_910_000_000,
      wait: async (delayMs) => {
        waitDelays.push(delayMs);
      },
      retryPolicy: {
        maxAttempts: 3,
        baseDelayMs: 10,
        backoffMultiplier: 2,
        maxDelayMs: 40,
      },
    });

    orchestration.start({ liveSessionId: "live_session_2" });

    const result = await orchestration.capture({
      mode: "screenshot",
    });

    expect(result.status).toBe("success");
    expect(result.attemptCount).toBe(3);
    expect(waitDelays).toEqual([10, 20]);
    expect(result.snapshot.fallbackCount).toBe(2);
    expect(result.snapshot.fallbackHistory.map((event) => event.reason)).toEqual([
      "capture_provider_error",
      "capture_provider_error",
    ]);
    expect(result.snapshot.fallbackHistory.every((event) => event.retryAllowed)).toBe(
      true
    );
  });

  it("returns retry_exhausted after bounded retry attempts", async () => {
    const adapter: DesktopCaptureAdapter = {
      captureScreenshot: vi.fn(async () => {
        throw new Error("temporary capture failure");
      }),
      captureRecording: vi.fn(async () => {
        throw new Error("temporary capture failure");
      }),
    };
    const waitDelays: number[] = [];
    const orchestration = createDesktopCaptureOrchestration({
      adapter,
      now: () => 1_700_920_000_000,
      wait: async (delayMs) => {
        waitDelays.push(delayMs);
      },
      retryPolicy: {
        maxAttempts: 2,
        baseDelayMs: 15,
        backoffMultiplier: 2,
        maxDelayMs: 60,
      },
    });

    orchestration.start({ liveSessionId: "live_session_3" });

    const result = await orchestration.capture({
      mode: "screenshot",
    });

    expect(result.status).toBe("fallback");
    expect(result.fallbackReason).toBe("retry_exhausted");
    expect(result.retryExhausted).toBe(true);
    expect(result.attemptCount).toBe(2);
    expect(waitDelays).toEqual([15]);
    expect(result.snapshot.fallbackHistory.map((event) => event.reason)).toEqual([
      "capture_provider_error",
      "retry_exhausted",
    ]);
  });

  it("fails closed when runtime authority precedence is not vc83_runtime_policy", async () => {
    const adapter: DesktopCaptureAdapter = {
      captureScreenshot: vi.fn(async (request) =>
        createFrame({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
      captureRecording: vi.fn(async (request) =>
        createRecording({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
    };
    const orchestration = createDesktopCaptureOrchestration({
      adapter,
      now: () => 1_700_930_000_000,
    });

    orchestration.start({
      liveSessionId: "live_session_4",
      runtimePolicy: {
        runtimeAuthorityPrecedence: "legacy_runtime_policy",
      },
    });

    const result = await orchestration.capture({
      mode: "screenshot",
    });
    expect(result.status).toBe("fallback");
    expect(result.fallbackReason).toBe("policy_restricted");
    expect(adapter.captureScreenshot).not.toHaveBeenCalled();
  });

  it("fails closed when approval is required but not granted", async () => {
    const adapter: DesktopCaptureAdapter = {
      captureScreenshot: vi.fn(async (request) =>
        createFrame({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
      captureRecording: vi.fn(async (request) =>
        createRecording({
          liveSessionId: request.liveSessionId,
          sourceId: request.sourceId ?? "desktop:primary",
        })
      ),
    };
    const orchestration = createDesktopCaptureOrchestration({
      adapter,
      now: () => 1_700_940_000_000,
    });

    orchestration.start({
      liveSessionId: "live_session_5",
      runtimePolicy: {
        runtimeAuthorityPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
        approvalRequired: true,
        approvalGranted: false,
      },
    });

    const result = await orchestration.capture({
      mode: "record",
      durationMs: 1000,
    });
    expect(result.status).toBe("fallback");
    expect(result.fallbackReason).toBe("approval_required");
    expect(adapter.captureRecording).not.toHaveBeenCalled();
  });
});

describe("av fallback policy precedence", () => {
  it("keeps policy restriction precedence over other fallback signals", () => {
    const result = evaluateAvFallbackPolicy({
      sessionStatus: "paused",
      runtimeAuthorityPrecedence: "legacy_runtime_policy",
      approvalRequired: true,
      approvalGranted: false,
      attempt: 3,
      maxAttempts: 3,
      error: new Error("device_unavailable"),
    });

    expect(result.fallbackReason).toBe("policy_restricted");
    expect(result.nativePolicyPrecedence).toBe("vc83_runtime_policy");
    expect(result.approvalInvariant).toBe("non_bypassable");
    expect(result.retryAllowed).toBe(false);
  });
});
