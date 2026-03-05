export type VoiceDuplexTransportMode = "webrtc" | "websocket" | "chunked_fallback"
export type VoiceDuplexTransportRoute =
  | "websocket_primary"
  | "webrtc_fallback"

export type VoiceAudioFrameEnvelope = {
  contractVersion: "voice_transport_v1"
  transportMode: "webrtc" | "websocket"
  eventType: "audio_chunk"
  liveSessionId: string
  voiceSessionId: string
  interviewSessionId: string
  sequence: number
  previousSequence?: number
  timestampMs: number
  pcm: {
    encoding: "pcm_s16le"
    sampleRateHz: number
    channels: number
    frameDurationMs: number
  }
  transcriptionMimeType?: string
  audioChunkBase64: string
  transcriptText?: string
}

export type SegmentFrameStreamingPolicy = {
  shouldSendRealtimeEnvelope: boolean
  shouldUseHttpTranscription: boolean
}

export type FinalFrameFinalizeGuardReason =
  | "ready"
  | "not_final_frame"
  | "assistant_speaking"
  | "finalize_mutex_locked"
  | "duplicate_sequence"

export type FinalFrameFinalizeGuardDecision = {
  allowFinalize: boolean
  reason: FinalFrameFinalizeGuardReason
}

export type PendingFinalFrameFinalizePayload = {
  sequence: number
  queuedAtMs: number
  timeoutAtMs: number
}

export type PendingFinalFrameReleaseReason =
  | "pending_frame_missing"
  | "assistant_still_speaking"
  | "assistant_cleared"
  | "timeout"

export type PendingFinalFrameReleaseDecision = {
  allowFinalize: boolean
  reason: PendingFinalFrameReleaseReason
}

export type PendingFinalFrameQueueDecisionReason =
  | "queue_new"
  | "replace_pending"
  | "ignore_stale_or_duplicate"

export type PendingFinalFrameQueueDecision = {
  shouldQueue: boolean
  shouldReplacePending: boolean
  reason: PendingFinalFrameQueueDecisionReason
  existingSequence: number | null
}

export type VoiceDuplexTransportFallbackDecision = {
  nextRoute: VoiceDuplexTransportRoute
  fallbackApplied: boolean
  fallbackReason: "none" | "websocket_primary_failed"
  changedRoute: boolean
}

export const DEFAULT_PENDING_FINAL_FRAME_TIMEOUT_MS = 500

export function resolveInitialDuplexTransportRoute(
  routePrecedence: readonly VoiceDuplexTransportRoute[]
): VoiceDuplexTransportRoute {
  return routePrecedence[0] || "websocket_primary"
}

export function resolveFallbackDuplexTransportRoute(
  routePrecedence: readonly VoiceDuplexTransportRoute[]
): VoiceDuplexTransportRoute {
  return routePrecedence[1] || "webrtc_fallback"
}

export function resolveDuplexTransportModeFromRoute(
  route: VoiceDuplexTransportRoute
): "websocket" | "webrtc" {
  return route === "webrtc_fallback" ? "webrtc" : "websocket"
}

export function buildVoiceAudioFrameEnvelope(args: {
  liveSessionId: string
  voiceSessionId: string
  interviewSessionId: string
  sequence: number
  audioChunkBase64: string
  frameDurationMs: number
  sampleRateHz: number
  transcriptionMimeType?: string
  transcriptText?: string
  transportMode?: "webrtc" | "websocket"
}): VoiceAudioFrameEnvelope {
  return {
    contractVersion: "voice_transport_v1",
    transportMode: args.transportMode === "webrtc" ? "webrtc" : "websocket",
    eventType: "audio_chunk",
    liveSessionId: args.liveSessionId,
    voiceSessionId: args.voiceSessionId,
    interviewSessionId: args.interviewSessionId,
    sequence: args.sequence,
    previousSequence: args.sequence > 0 ? args.sequence - 1 : undefined,
    timestampMs: Date.now(),
    pcm: {
      encoding: "pcm_s16le",
      sampleRateHz: Math.max(8000, Math.floor(args.sampleRateHz || 24000)),
      channels: 1,
      frameDurationMs: Math.max(20, Math.floor(args.frameDurationMs || 20)),
    },
    transcriptionMimeType: args.transcriptionMimeType?.trim() || undefined,
    audioChunkBase64: args.audioChunkBase64,
    transcriptText: args.transcriptText?.trim() || undefined,
  }
}

export function createDeterministicFrameQueue<TArgs, TResult = void>(
  handler: (args: TArgs) => Promise<TResult>
) {
  let chain: Promise<unknown> = Promise.resolve()
  return (args: TArgs) => {
    const task = chain.then(() => handler(args)) as Promise<TResult>
    chain = task.catch(() => undefined)
    return task
  }
}

export function mergeTranscriptFrame(
  transcriptFramesBySequence: Map<number, string>,
  sequence: number,
  partialText: string
): string {
  const normalized = partialText.trim()
  if (!normalized) {
    return Array.from(transcriptFramesBySequence.entries())
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text)
      .join(" ")
      .trim()
  }

  transcriptFramesBySequence.set(sequence, normalized)
  return Array.from(transcriptFramesBySequence.entries())
    .sort(([left], [right]) => left - right)
    .map(([, text]) => text)
    .join(" ")
    .trim()
}

export function finalizeMergedTranscript(args: {
  transcriptFramesBySequence: Map<number, string>
  sequence: number
  fallbackText?: string | null
}): string | null {
  const merged = Array.from(args.transcriptFramesBySequence.entries())
    .filter(([sequence]) => sequence <= args.sequence)
    .sort(([left], [right]) => left - right)
    .map(([, text]) => text)
    .join(" ")
    .trim()
  if (merged) {
    return merged
  }
  const fallback = args.fallbackText?.trim() || ""
  return fallback || null
}

export function resolveSegmentedFrameStreamingPolicy(args: {
  transportMode: VoiceDuplexTransportMode
  isRealtimeConnected: boolean
  isFinalFrame: boolean
}): SegmentFrameStreamingPolicy {
  if (args.transportMode === "websocket" && args.isRealtimeConnected) {
    return {
      shouldSendRealtimeEnvelope: true,
      shouldUseHttpTranscription: args.isFinalFrame,
    }
  }
  if (args.transportMode === "webrtc") {
    return {
      shouldSendRealtimeEnvelope: false,
      shouldUseHttpTranscription: true,
    }
  }
  return {
    shouldSendRealtimeEnvelope: false,
    shouldUseHttpTranscription: true,
  }
}

export function resolveDuplexTransportFallbackDecision(args: {
  routePrecedence: readonly VoiceDuplexTransportRoute[]
  currentRoute: VoiceDuplexTransportRoute
  fallbackApplied: boolean
}): VoiceDuplexTransportFallbackDecision {
  if (args.fallbackApplied || args.currentRoute !== "websocket_primary") {
    return {
      nextRoute: args.currentRoute,
      fallbackApplied: args.fallbackApplied,
      fallbackReason: args.fallbackApplied ? "websocket_primary_failed" : "none",
      changedRoute: false,
    }
  }

  const fallbackRoute = resolveFallbackDuplexTransportRoute(args.routePrecedence)
  return {
    nextRoute: fallbackRoute,
    fallbackApplied: fallbackRoute !== args.currentRoute || args.fallbackApplied,
    fallbackReason: "websocket_primary_failed",
    changedRoute: fallbackRoute !== args.currentRoute,
  }
}

export function evaluateFinalFrameFinalizeGuard(args: {
  isFinalFrame: boolean
  frameSequence: number
  isAssistantSpeaking: boolean
  finalizeInFlight: boolean
  lastFinalizedSequence: number | null
}): FinalFrameFinalizeGuardDecision {
  if (!args.isFinalFrame) {
    return {
      allowFinalize: false,
      reason: "not_final_frame",
    }
  }
  if (args.isAssistantSpeaking) {
    return {
      allowFinalize: false,
      reason: "assistant_speaking",
    }
  }
  if (args.finalizeInFlight) {
    return {
      allowFinalize: false,
      reason: "finalize_mutex_locked",
    }
  }
  if (
    Number.isFinite(args.lastFinalizedSequence)
    && args.frameSequence <= Number(args.lastFinalizedSequence)
  ) {
    return {
      allowFinalize: false,
      reason: "duplicate_sequence",
    }
  }
  return {
    allowFinalize: true,
    reason: "ready",
  }
}

export function queuePendingFinalFrameFinalize(args: {
  sequence: number
  nowMs: number
  timeoutMs?: number
}): PendingFinalFrameFinalizePayload {
  const nowMs = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now()
  const timeoutMs = Number.isFinite(args.timeoutMs)
    ? Math.max(1, Math.floor(Number(args.timeoutMs)))
    : DEFAULT_PENDING_FINAL_FRAME_TIMEOUT_MS
  return {
    sequence: Math.max(0, Math.floor(Number(args.sequence))),
    queuedAtMs: nowMs,
    timeoutAtMs: nowMs + timeoutMs,
  }
}

export function resolvePendingFinalFrameQueueDecision(args: {
  pendingFinalFrame: PendingFinalFrameFinalizePayload | null
  incomingSequence: number
}): PendingFinalFrameQueueDecision {
  const existingSequence = args.pendingFinalFrame
    ? Math.max(0, Math.floor(args.pendingFinalFrame.sequence))
    : null
  const incomingSequence = Math.max(0, Math.floor(args.incomingSequence))

  if (!Number.isFinite(existingSequence)) {
    return {
      shouldQueue: true,
      shouldReplacePending: false,
      reason: "queue_new",
      existingSequence,
    }
  }
  if (incomingSequence <= Number(existingSequence)) {
    return {
      shouldQueue: false,
      shouldReplacePending: false,
      reason: "ignore_stale_or_duplicate",
      existingSequence,
    }
  }
  return {
    shouldQueue: true,
    shouldReplacePending: true,
    reason: "replace_pending",
    existingSequence,
  }
}

export function evaluatePendingFinalFrameRelease(args: {
  pendingFinalFrame: PendingFinalFrameFinalizePayload | null
  nowMs: number
  isAssistantSpeaking: boolean
  turnState: "idle" | "agent_speaking"
}): PendingFinalFrameReleaseDecision {
  if (!args.pendingFinalFrame) {
    return {
      allowFinalize: false,
      reason: "pending_frame_missing",
    }
  }
  const nowMs = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now()
  if (nowMs >= args.pendingFinalFrame.timeoutAtMs) {
    return {
      allowFinalize: true,
      reason: "timeout",
    }
  }
  if (args.isAssistantSpeaking || args.turnState === "agent_speaking") {
    return {
      allowFinalize: false,
      reason: "assistant_still_speaking",
    }
  }
  return {
    allowFinalize: true,
    reason: "assistant_cleared",
  }
}
