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
