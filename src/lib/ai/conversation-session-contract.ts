export const CONVERSATION_CONTRACT_VERSION = "conversation_interaction_v1" as const

export const CONVERSATION_REASON_CODES = [
  "permission_denied_mic",
  "permission_denied_camera",
  "device_unavailable",
  "dat_sdk_unavailable",
  "transport_failed",
  "session_auth_failed",
  "session_open_failed",
  "provider_unavailable",
] as const

export type ConversationReasonCode = (typeof CONVERSATION_REASON_CODES)[number]

export const CONVERSATION_SESSION_STATES = [
  "idle",
  "connecting",
  "live",
  "reconnecting",
  "ending",
  "ended",
  "error",
] as const

export type ConversationSessionState = (typeof CONVERSATION_SESSION_STATES)[number]

export const CONVERSATION_EVENT_TYPES = [
  "conversation_start_requested",
  "conversation_connecting",
  "conversation_live",
  "conversation_reconnecting",
  "conversation_ending",
  "conversation_ended",
  "conversation_error",
  "conversation_degraded_to_voice",
  "conversation_eyes_source_changed",
  "conversation_permission_denied",
] as const

export type ConversationEventType = (typeof CONVERSATION_EVENT_TYPES)[number]

export interface ConversationEventEnvelope {
  contractVersion: typeof CONVERSATION_CONTRACT_VERSION
  eventType: ConversationEventType
  timestampMs: number
  liveSessionId?: string
  conversationId?: string
  state: ConversationSessionState
  reasonCode?: ConversationReasonCode
  payload?: Record<string, unknown>
}

export interface ConversationSessionStateResolutionInput {
  currentState: ConversationSessionState
  isConversationEnding: boolean
  isStartingConversation: boolean
  isVoiceListening: boolean
  isVoiceTranscribing: boolean
  hasPendingVoiceRuntime: boolean
  hasConversationSessionActive: boolean
  isSendingAssistantTurn: boolean
  blockingVisionError?: string | null
  voiceCaptureError?: string | null
}

export interface ConversationStageVisibilityInput {
  isConversationStageOpen: boolean
  isConversationActive: boolean
  isConversationSessionActive: boolean
  conversationState: ConversationSessionState
  isStartingConversation: boolean
  isConversationEnding: boolean
}

export function shouldKeepConversationStageVisible(
  args: ConversationStageVisibilityInput
): boolean {
  return (
    args.isConversationStageOpen
    || args.isConversationActive
    || args.isConversationSessionActive
    || args.conversationState === "ending"
    || args.conversationState === "error"
    || args.isStartingConversation
    || args.isConversationEnding
  )
}

export function resolveConversationSessionState(
  args: ConversationSessionStateResolutionInput
): ConversationSessionState {
  if (args.isConversationEnding) {
    return "ending"
  }
  if (args.currentState === "ended") {
    return "ended"
  }
  if (args.blockingVisionError || args.voiceCaptureError) {
    return "error"
  }

  const hasConversationIntent =
    args.isStartingConversation
    || args.isVoiceListening
    || args.isVoiceTranscribing
    || args.hasPendingVoiceRuntime
    || args.hasConversationSessionActive
    || args.isSendingAssistantTurn
  if (!hasConversationIntent) {
    return "idle"
  }

  if (args.isStartingConversation || args.isVoiceTranscribing) {
    return "connecting"
  }
  if (
    args.isVoiceListening
    || args.hasConversationSessionActive
    || args.isSendingAssistantTurn
  ) {
    return "live"
  }
  return "reconnecting"
}

export function inferConversationReasonCode(reason: string | null | undefined): ConversationReasonCode {
  const normalized = (reason || "").trim().toLowerCase()
  if (!normalized) {
    return "session_open_failed"
  }
  if (normalized.includes("camera")) {
    return "permission_denied_camera"
  }
  if (normalized.includes("notallowederror") || normalized.includes("permission") || normalized.includes("mic")) {
    return "permission_denied_mic"
  }
  if (normalized.includes("dat_sdk_unavailable")) {
    return "dat_sdk_unavailable"
  }
  if (normalized.includes("auth")) {
    return "session_auth_failed"
  }
  if (normalized.includes("transport") || normalized.includes("websocket")) {
    return "transport_failed"
  }
  if (normalized.includes("provider")) {
    return "provider_unavailable"
  }
  if (normalized.includes("unavailable")) {
    return "device_unavailable"
  }
  return "session_open_failed"
}
