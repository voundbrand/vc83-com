import { describe, expect, it } from "vitest"

import {
  createDeterministicFrameQueue,
  resolveAmbientSingleSegmentRecoveryDecision,
  resolveDuplexTransportFallbackDecision,
  resolveDuplexTransportModeFromRoute,
  resolveFallbackDuplexTransportRoute,
  resolveInitialDuplexTransportRoute,
  evaluateFinalFrameFinalizeGuard,
  evaluatePendingFinalFrameRelease,
  finalizeMergedTranscript,
  mergeTranscriptFrame,
  resolvePendingFinalFrameQueueDecision,
  queuePendingFinalFrameFinalize,
  resolveSegmentedFrameStreamingPolicy,
} from "../../../src/lib/av/runtime/voiceSegmentedDuplex"

describe("voice segmented duplex runtime core", () => {
  it("resolves websocket policy to realtime plus final http transcription", () => {
    expect(
      resolveSegmentedFrameStreamingPolicy({
        transportMode: "websocket",
        isRealtimeConnected: true,
        isFinalFrame: false,
      })
    ).toEqual({
      shouldSendRealtimeEnvelope: true,
      shouldUseHttpTranscription: false,
    })

    expect(
      resolveSegmentedFrameStreamingPolicy({
        transportMode: "websocket",
        isRealtimeConnected: true,
        isFinalFrame: true,
      })
    ).toEqual({
      shouldSendRealtimeEnvelope: true,
      shouldUseHttpTranscription: true,
    })
  })

  it("merges transcript frames deterministically and finalizes by sequence", () => {
    const frames = new Map<number, string>()
    mergeTranscriptFrame(frames, 1, "world")
    const merged = mergeTranscriptFrame(frames, 0, "hello")
    expect(merged).toBe("hello world")

    expect(
      finalizeMergedTranscript({
        transcriptFramesBySequence: frames,
        sequence: 0,
      })
    ).toBe("hello")
  })

  it("keeps deterministic queue execution order", async () => {
    const observed: number[] = []
    const queue = createDeterministicFrameQueue(async (value: number) => {
      observed.push(value)
      await new Promise<void>((resolve) => setTimeout(resolve, 1))
      return value
    })

    await Promise.all([queue(0), queue(1), queue(2)])
    expect(observed).toEqual([0, 1, 2])
  })

  it("guards and releases final-frame finalization by assistant state and timeout", () => {
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 4,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 3,
      })
    ).toEqual({
      allowFinalize: true,
      reason: "ready",
    })

    const queued = queuePendingFinalFrameFinalize({
      sequence: 7,
      nowMs: 1_000,
      timeoutMs: 500,
    })
    expect(
      evaluatePendingFinalFrameRelease({
        pendingFinalFrame: queued,
        nowMs: 1_200,
        isAssistantSpeaking: true,
        turnState: "agent_speaking",
      })
    ).toEqual({
      allowFinalize: false,
      reason: "assistant_still_speaking",
    })
    expect(
      evaluatePendingFinalFrameRelease({
        pendingFinalFrame: queued,
        nowMs: 1_501,
        isAssistantSpeaking: true,
        turnState: "agent_speaking",
      })
    ).toEqual({
      allowFinalize: true,
      reason: "timeout",
    })
  })

  it("resolves transport route precedence and fallback once", () => {
    const precedence = ["websocket_primary", "webrtc_fallback"] as const
    expect(resolveInitialDuplexTransportRoute(precedence)).toBe("websocket_primary")
    expect(resolveFallbackDuplexTransportRoute(precedence)).toBe("webrtc_fallback")
    expect(resolveDuplexTransportModeFromRoute("webrtc_fallback")).toBe("webrtc")

    expect(
      resolveDuplexTransportFallbackDecision({
        routePrecedence: precedence,
        currentRoute: "websocket_primary",
        fallbackApplied: false,
      })
    ).toEqual({
      nextRoute: "webrtc_fallback",
      fallbackApplied: true,
      fallbackReason: "websocket_primary_failed",
      changedRoute: true,
    })

    expect(
      resolveDuplexTransportFallbackDecision({
        routePrecedence: precedence,
        currentRoute: "webrtc_fallback",
        fallbackApplied: true,
      })
    ).toEqual({
      nextRoute: "webrtc_fallback",
      fallbackApplied: true,
      fallbackReason: "websocket_primary_failed",
      changedRoute: false,
    })
  })

  it("retries blob transcription for ambient single-segment turns when speech hints exist", () => {
    expect(
      resolveAmbientSingleSegmentRecoveryDecision({
        queuedFrameCount: 1,
        finalSegmentHttpTranscribeAttempted: true,
        finalSegmentHttpTranscribeNoSpeech: true,
        realtimeIngestFailedReason: "voice_non_speech_transcript_filtered",
        hasDetectedSpeechSinceCaptureStart: false,
        captureSpeechFrameCount: 1,
        captureMaxFrameRms: 0.004,
        vadEnergyThresholdRms: 0.02,
      })
    ).toEqual({
      shouldRetryBlobTranscription: true,
      shouldSkipBlobTranscription: false,
      speechHintObserved: true,
      reason: "retry_blob_transcription",
    })
  })

  it("skips redundant blob transcription for pure ambient single-segment turns", () => {
    expect(
      resolveAmbientSingleSegmentRecoveryDecision({
        queuedFrameCount: 1,
        finalSegmentHttpTranscribeAttempted: true,
        finalSegmentHttpTranscribeNoSpeech: true,
        realtimeIngestFailedReason: "voice_non_speech_transcript_filtered",
        hasDetectedSpeechSinceCaptureStart: false,
        captureSpeechFrameCount: 0,
        captureMaxFrameRms: 0.001,
        vadEnergyThresholdRms: 0.02,
      })
    ).toEqual({
      shouldRetryBlobTranscription: false,
      shouldSkipBlobTranscription: true,
      speechHintObserved: false,
      reason: "skip_redundant_blob_transcription",
    })
  })

  it("queues, replaces, and ignores pending final-frame by sequence", () => {
    expect(
      resolvePendingFinalFrameQueueDecision({
        pendingFinalFrame: null,
        incomingSequence: 2,
      })
    ).toEqual({
      shouldQueue: true,
      shouldReplacePending: false,
      reason: "queue_new",
      existingSequence: null,
    })

    const pending = queuePendingFinalFrameFinalize({
      sequence: 4,
      nowMs: 5_000,
      timeoutMs: 500,
    })

    expect(
      resolvePendingFinalFrameQueueDecision({
        pendingFinalFrame: pending,
        incomingSequence: 4,
      })
    ).toEqual({
      shouldQueue: false,
      shouldReplacePending: false,
      reason: "ignore_stale_or_duplicate",
      existingSequence: 4,
    })

    expect(
      resolvePendingFinalFrameQueueDecision({
        pendingFinalFrame: pending,
        incomingSequence: 5,
      })
    ).toEqual({
      shouldQueue: true,
      shouldReplacePending: true,
      reason: "replace_pending",
      existingSequence: 4,
    })
  })
})
