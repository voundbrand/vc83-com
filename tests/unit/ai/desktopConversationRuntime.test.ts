import { describe, expect, it } from "vitest"

import {
  buildDesktopGeminiLiveMetadata,
  composeDesktopRuntimeMetadata,
  evaluateDesktopVisionDegradeGuard,
  isTransientDesktopCameraBackpressureReason,
  normalizeDesktopCameraFallbackReason,
  resolveDuplexVoiceTurnVisionUnavailableReason,
  resolveDesktopConversationModeTransition,
  shouldResolveDuplexVoiceTurnVisionFrame,
  shouldRecoverBlankDesktopVisionPreview,
} from "../../../src/lib/ai/desktop-conversation-runtime"

describe("desktop conversation runtime", () => {
  it("resolves deterministic mode transitions between voice and voice_with_eyes", () => {
    const toEyes = resolveDesktopConversationModeTransition({
      currentMode: "voice",
      nextMode: "voice_with_eyes",
      currentEyesSource: "webcam",
    })
    expect(toEyes).toEqual({
      mode: "voice_with_eyes",
      eyesSource: "webcam",
    })

    const backToVoice = resolveDesktopConversationModeTransition({
      currentMode: "voice_with_eyes",
      nextMode: "voice",
      currentEyesSource: "meta_glasses",
    })
    expect(backToVoice).toEqual({
      mode: "voice",
      eyesSource: "meta_glasses",
    })
  })

  it("guards against false degrade triggers during intentional or startup transitions", () => {
    const intentionalStop = evaluateDesktopVisionDegradeGuard({
      conversationModeSelection: "voice_with_eyes",
      conversationState: "live",
      activeEyesSource: "webcam",
      cameraLiveSession: {
        sessionState: "stopped",
        stopReason: "conversation_eyes_toggle_off",
      },
      cameraVisionError: null,
      hasCameraPreviewSignal: false,
      nowMs: 30_000,
    })
    expect(intentionalStop.shouldDegrade).toBe(false)
    expect(intentionalStop.guardCode).toBe("intentional_stop")

    const startupGrace = evaluateDesktopVisionDegradeGuard({
      conversationModeSelection: "voice_with_eyes",
      conversationState: "live",
      activeEyesSource: "webcam",
      cameraLiveSession: {
        sessionState: "stopped",
        startedAt: 10_000,
      },
      cameraVisionError: null,
      hasCameraPreviewSignal: false,
      nowMs: 11_000,
      startupGraceMs: 2_500,
    })
    expect(startupGrace.shouldDegrade).toBe(false)
    expect(startupGrace.guardCode).toBe("startup_grace")
  })

  it("degrades to voice only on real camera failures", () => {
    const failureDecision = evaluateDesktopVisionDegradeGuard({
      conversationModeSelection: "voice_with_eyes",
      conversationState: "live",
      activeEyesSource: "webcam",
      cameraLiveSession: {
        sessionState: "error",
        fallbackReason: "camera_permission_denied",
      },
      cameraVisionError: "camera_permission_denied",
      hasCameraPreviewSignal: false,
      nowMs: 50_000,
    })

    expect(failureDecision.shouldDegrade).toBe(true)
    expect(failureDecision.source).toBe("webcam")
    expect(failureDecision.reason).toContain("camera_permission_denied")
  })

  it("detects blank preview only after the grace window elapses", () => {
    const withinGrace = shouldRecoverBlankDesktopVisionPreview({
      sessionState: "capturing",
      hasPreviewSignal: false,
      startedAt: 10_000,
      nowMs: 11_500,
      blankPreviewGraceMs: 2_000,
    })
    expect(withinGrace).toBe(false)

    const pastGrace = shouldRecoverBlankDesktopVisionPreview({
      sessionState: "capturing",
      hasPreviewSignal: false,
      startedAt: 10_000,
      nowMs: 12_500,
      blankPreviewGraceMs: 2_000,
    })
    expect(pastGrace).toBe(true)
  })

  it("treats capture backpressure as transient and keeps vision fallback clean", () => {
    expect(isTransientDesktopCameraBackpressureReason("capture_backpressure")).toBe(true)
    expect(
      isTransientDesktopCameraBackpressureReason("capture_backpressure_audio_only")
    ).toBe(true)
    expect(normalizeDesktopCameraFallbackReason("capture_backpressure")).toBeUndefined()
    expect(
      normalizeDesktopCameraFallbackReason("capture_backpressure_audio_only")
    ).toBeUndefined()
    expect(normalizeDesktopCameraFallbackReason("camera_preview_timeout")).toBe(
      "camera_preview_timeout"
    )
  })

  it("keeps duplex turn-level vision attachment active in persistent eyes mode", () => {
    expect(
      shouldResolveDuplexVoiceTurnVisionFrame({
        conversationModeSelection: "voice_with_eyes",
        cameraSessionState: "capturing",
        cameraVisionError: null,
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBe(true)
    expect(
      resolveDuplexVoiceTurnVisionUnavailableReason({
        conversationModeSelection: "voice_with_eyes",
        cameraSessionState: "capturing",
        cameraVisionError: null,
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBeNull()
    expect(
      shouldResolveDuplexVoiceTurnVisionFrame({
        conversationModeSelection: "voice_with_eyes",
        cameraSessionState: "stopped",
        cameraVisionError: null,
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBe(false)
    expect(
      resolveDuplexVoiceTurnVisionUnavailableReason({
        conversationModeSelection: "voice_with_eyes",
        cameraSessionState: "stopped",
        cameraVisionError: null,
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBe("camera_not_capturing")
    expect(
      shouldResolveDuplexVoiceTurnVisionFrame({
        conversationModeSelection: "voice_with_eyes",
        cameraSessionState: "capturing",
        cameraVisionError: "capture_backpressure",
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBe(true)
    expect(
      resolveDuplexVoiceTurnVisionUnavailableReason({
        conversationModeSelection: "voice_with_eyes",
        cameraSessionState: "capturing",
        cameraVisionError: "camera_permission_denied",
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBe("camera_error")
    expect(
      resolveDuplexVoiceTurnVisionUnavailableReason({
        conversationModeSelection: "voice",
        cameraSessionState: "capturing",
        cameraVisionError: null,
        sessionTransportPath: "persistent_realtime_multimodal",
      })
    ).toBe("vision_not_requested")
  })

  it("builds runtime metadata payloads that include the desktop parity envelope", () => {
    const geminiLive = buildDesktopGeminiLiveMetadata({
      conversationModeSelection: "voice_with_eyes",
      eyesSourceSelection: "webcam",
      cameraLiveSession: {
        liveSessionId: "camera_live_1",
        sessionState: "capturing",
      },
    })
    expect(geminiLive).toMatchObject({
      provider: "gemini",
      enabled: true,
      sourceMode: "webcam",
      cameraLiveSessionId: "camera_live_1",
      cameraSessionState: "capturing",
      providerSetupContract: {
        activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
        turnCoverage: "TURN_INCLUDES_ALL_INPUT",
      },
    })

    const payload = composeDesktopRuntimeMetadata({
      liveSessionId: "live_1",
      cameraRuntime: { sourceId: "webcam", sessionState: "capturing" },
      voiceRuntime: { voiceSessionId: "voice_1", sessionState: "transcribed" },
      conversationRuntime: { state: "live", mode: "voice_with_eyes" },
      geminiLive,
    })

    expect(payload).toEqual({
      liveSessionId: "live_1",
      cameraRuntime: { sourceId: "webcam", sessionState: "capturing" },
      voiceRuntime: { voiceSessionId: "voice_1", sessionState: "transcribed" },
      conversationRuntime: { state: "live", mode: "voice_with_eyes" },
      geminiLive,
    })
  })
})
