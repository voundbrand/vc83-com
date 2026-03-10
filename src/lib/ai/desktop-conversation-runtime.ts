import type { ConversationSessionState } from "./conversation-session-contract"

export type DesktopConversationModeSelection = "voice" | "voice_with_eyes"
export type DesktopConversationEyesSourceSelection = "webcam" | "meta_glasses"
export type DesktopCameraSessionState = "capturing" | "stopped" | "error"

export interface DesktopCameraLiveSessionSnapshot {
  liveSessionId?: string
  sessionState: DesktopCameraSessionState
  startedAt?: number
  stoppedAt?: number
  stopReason?: string
  fallbackReason?: string
}

export interface DesktopVisionDegradeGuardInput {
  conversationModeSelection: DesktopConversationModeSelection
  conversationState: ConversationSessionState
  activeEyesSource: DesktopConversationEyesSourceSelection | null
  cameraLiveSession: DesktopCameraLiveSessionSnapshot | null
  cameraVisionError?: string | null
  hasCameraPreviewSignal: boolean
  previewSignalObservedAtMs?: number | null
  nowMs?: number
  startupGraceMs?: number
  blankPreviewGraceMs?: number
}

export interface DesktopVisionDegradeDecision {
  shouldDegrade: boolean
  reason?: string
  source?: DesktopConversationEyesSourceSelection
  guardCode:
    | "voice_only"
    | "conversation_inactive"
    | "no_active_source"
    | "healthy_capture"
    | "intentional_stop"
    | "startup_grace"
    | "error_state"
    | "no_stream_error"
    | "blank_preview"
    | "stopped_unexpected"
}

export interface DesktopRuntimeMetadataPayload<
  TCameraRuntime = Record<string, unknown>,
  TVoiceRuntime = Record<string, unknown>,
  TConversationRuntime = Record<string, unknown>,
  TGeminiLive = Record<string, unknown>,
> {
  liveSessionId?: string
  cameraRuntime?: TCameraRuntime
  voiceRuntime?: TVoiceRuntime
  conversationRuntime?: TConversationRuntime
  geminiLive?: TGeminiLive
}

export const INTENTIONAL_DESKTOP_VISION_STOP_REASONS = new Set([
  "conversation_eyes_toggle_off",
  "conversation_end_control",
  "conversation_voice_only_selected",
  "operator_toggle_off",
  "operator_stop",
  "message_sent",
  "capture_backpressure",
  "conversation_source_drop",
  "preview_recovery",
])

export function isTransientDesktopCameraBackpressureReason(
  reason: string | null | undefined
): boolean {
  if (typeof reason !== "string") {
    return false
  }
  const normalized = reason.trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return normalized === "capture_backpressure" || normalized.startsWith("capture_backpressure_")
}

export function normalizeDesktopCameraFallbackReason(
  reason: string | null | undefined
): string | undefined {
  if (typeof reason !== "string") {
    return undefined
  }
  const normalized = reason.trim()
  if (!normalized) {
    return undefined
  }
  if (isTransientDesktopCameraBackpressureReason(normalized)) {
    return undefined
  }
  return normalized
}

export function shouldResolveDuplexVoiceTurnVisionFrame(args: {
  conversationModeSelection: DesktopConversationModeSelection
  cameraSessionState: DesktopCameraSessionState | null | undefined
  cameraVisionError?: string | null
  sessionTransportPath: "persistent_realtime_multimodal" | "turn_stitch"
}): boolean {
  if (args.sessionTransportPath !== "persistent_realtime_multimodal") {
    return true
  }
  if (args.conversationModeSelection !== "voice_with_eyes") {
    return false
  }
  if (args.cameraSessionState !== "capturing") {
    return false
  }
  return !normalizeDesktopCameraFallbackReason(args.cameraVisionError)
}

const ACTIVE_CONVERSATION_STATES = new Set<ConversationSessionState>([
  "live",
  "reconnecting",
])

export function isIntentionalDesktopVisionStopReason(
  stopReason: string | null | undefined
): boolean {
  if (typeof stopReason !== "string") {
    return false
  }
  const normalized = stopReason.trim()
  if (!normalized) {
    return false
  }
  return INTENTIONAL_DESKTOP_VISION_STOP_REASONS.has(normalized)
}

export function shouldRecoverBlankDesktopVisionPreview(args: {
  sessionState: DesktopCameraSessionState | null
  hasPreviewSignal: boolean
  startedAt?: number
  previewSignalObservedAtMs?: number | null
  nowMs?: number
  blankPreviewGraceMs?: number
}): boolean {
  if (args.sessionState !== "capturing") {
    return false
  }
  if (args.hasPreviewSignal) {
    return false
  }
  const nowMs = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now()
  const graceMs = Math.max(400, Math.floor(args.blankPreviewGraceMs || 3200))
  const signalBaselineMs =
    (typeof args.previewSignalObservedAtMs === "number" ? args.previewSignalObservedAtMs : undefined)
    || args.startedAt
    || nowMs
  return nowMs - signalBaselineMs >= graceMs
}

export function evaluateDesktopVisionDegradeGuard(
  args: DesktopVisionDegradeGuardInput
): DesktopVisionDegradeDecision {
  if (args.conversationModeSelection !== "voice_with_eyes") {
    return {
      shouldDegrade: false,
      guardCode: "voice_only",
    }
  }
  if (!ACTIVE_CONVERSATION_STATES.has(args.conversationState)) {
    return {
      shouldDegrade: false,
      guardCode: "conversation_inactive",
    }
  }
  if (!args.activeEyesSource) {
    return {
      shouldDegrade: false,
      guardCode: "no_active_source",
    }
  }

  const nowMs = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now()
  const startupGraceMs = Math.max(0, Math.floor(args.startupGraceMs || 2200))
  const fallbackReason =
    (typeof args.cameraVisionError === "string" && args.cameraVisionError.trim().length > 0
      ? args.cameraVisionError.trim()
      : undefined)
    || args.cameraLiveSession?.fallbackReason
    || args.cameraLiveSession?.stopReason
    || "device_unavailable"

  const sessionState = args.cameraLiveSession?.sessionState || null
  if (sessionState === "capturing") {
    const blankPreview = shouldRecoverBlankDesktopVisionPreview({
      sessionState,
      hasPreviewSignal: args.hasCameraPreviewSignal,
      startedAt: args.cameraLiveSession?.startedAt,
      previewSignalObservedAtMs: args.previewSignalObservedAtMs,
      nowMs,
      blankPreviewGraceMs: args.blankPreviewGraceMs,
    })
    if (blankPreview) {
      return {
        shouldDegrade: true,
        reason: fallbackReason,
        source: args.activeEyesSource,
        guardCode: "blank_preview",
      }
    }
    if (args.cameraVisionError) {
      return {
        shouldDegrade: true,
        reason: fallbackReason,
        source: args.activeEyesSource,
        guardCode: "error_state",
      }
    }
    return {
      shouldDegrade: false,
      guardCode: "healthy_capture",
    }
  }

  if (sessionState === "stopped") {
    if (isIntentionalDesktopVisionStopReason(args.cameraLiveSession?.stopReason)) {
      return {
        shouldDegrade: false,
        guardCode: "intentional_stop",
      }
    }
    if (
      typeof args.cameraLiveSession?.startedAt === "number"
      && nowMs - args.cameraLiveSession.startedAt < startupGraceMs
      && !args.cameraVisionError
      && !args.cameraLiveSession.fallbackReason
    ) {
      return {
        shouldDegrade: false,
        guardCode: "startup_grace",
      }
    }
    return {
      shouldDegrade: true,
      reason: fallbackReason,
      source: args.activeEyesSource,
      guardCode: "stopped_unexpected",
    }
  }

  if (sessionState === "error") {
    return {
      shouldDegrade: true,
      reason: fallbackReason,
      source: args.activeEyesSource,
      guardCode: "error_state",
    }
  }

  if (args.cameraVisionError) {
    return {
      shouldDegrade: true,
      reason: fallbackReason,
      source: args.activeEyesSource,
      guardCode: "no_stream_error",
    }
  }

  return {
    shouldDegrade: false,
    guardCode: "healthy_capture",
  }
}

export function resolveDesktopConversationModeTransition(args: {
  currentMode: DesktopConversationModeSelection
  nextMode: DesktopConversationModeSelection
  currentEyesSource: DesktopConversationEyesSourceSelection
  nextEyesSource?: DesktopConversationEyesSourceSelection
}): {
  mode: DesktopConversationModeSelection
  eyesSource: DesktopConversationEyesSourceSelection
} {
  if (args.nextMode === "voice") {
    return {
      mode: "voice",
      eyesSource: args.currentEyesSource,
    }
  }

  return {
    mode: "voice_with_eyes",
    eyesSource: args.nextEyesSource || args.currentEyesSource,
  }
}

export function buildDesktopGeminiLiveMetadata(args: {
  conversationModeSelection: DesktopConversationModeSelection
  eyesSourceSelection: DesktopConversationEyesSourceSelection
  cameraLiveSession: DesktopCameraLiveSessionSnapshot | null
}): Record<string, unknown> {
  const sourceMode =
    args.conversationModeSelection === "voice_with_eyes"
      ? args.eyesSourceSelection
      : "voice"
  const isVisionEnabled =
    args.conversationModeSelection === "voice_with_eyes"
    && args.cameraLiveSession?.sessionState === "capturing"

  return {
    provider: "gemini",
    mode: "live_reference",
    enabled: isVisionEnabled,
    sourceMode,
    cameraSessionState: args.cameraLiveSession?.sessionState || "idle",
    cameraLiveSessionId: args.cameraLiveSession?.liveSessionId,
  }
}

export function composeDesktopRuntimeMetadata<
  TCameraRuntime = Record<string, unknown>,
  TVoiceRuntime = Record<string, unknown>,
  TConversationRuntime = Record<string, unknown>,
  TGeminiLive = Record<string, unknown>,
>(
  payload: DesktopRuntimeMetadataPayload<TCameraRuntime, TVoiceRuntime, TConversationRuntime, TGeminiLive>
): DesktopRuntimeMetadataPayload<TCameraRuntime, TVoiceRuntime, TConversationRuntime, TGeminiLive> {
  return {
    liveSessionId: payload.liveSessionId,
    cameraRuntime: payload.cameraRuntime,
    voiceRuntime: payload.voiceRuntime,
    conversationRuntime: payload.conversationRuntime,
    geminiLive: payload.geminiLive,
  }
}
