import { describe, expect, it } from "vitest"

import {
  inferConversationReasonCode,
  resolveConversationSessionState,
  shouldKeepConversationStageVisible,
} from "../../../src/lib/ai/conversation-session-contract"
import {
  buildConversationCapabilitySnapshot,
  mapConversationCapabilityReasonCode,
} from "../../../src/lib/av/session/mediaSessionContract"

describe("conversation session contract mapping", () => {
  it("maps runtime failures into deterministic reason codes", () => {
    expect(inferConversationReasonCode("NotAllowedError: microphone denied")).toBe("permission_denied_mic")
    expect(inferConversationReasonCode("camera permission denied")).toBe("permission_denied_camera")
    expect(inferConversationReasonCode("dat_sdk_unavailable")).toBe("dat_sdk_unavailable")
    expect(inferConversationReasonCode("websocket dropped")).toBe("transport_failed")
    expect(inferConversationReasonCode("auth token missing")).toBe("session_auth_failed")
    expect(inferConversationReasonCode("provider unavailable")).toBe("provider_unavailable")
    expect(inferConversationReasonCode("device unavailable")).toBe("device_unavailable")
    expect(inferConversationReasonCode("")).toBe("session_open_failed")
  })

  it("maps capability negotiation reasons with fail-closed DAT semantics", () => {
    expect(mapConversationCapabilityReasonCode("meta_bridge_dat_sdk_unavailable")).toBe("dat_sdk_unavailable")
    expect(mapConversationCapabilityReasonCode("camera_getusermedia_unavailable")).toBe("permission_denied_camera")
    expect(mapConversationCapabilityReasonCode("device unavailable")).toBe("device_unavailable")
  })

  it("builds deterministic eyes capability snapshots", () => {
    const snapshot = buildConversationCapabilitySnapshot({
      sessionIntent: "voice_with_eyes",
      requestedEyesSource: "meta_glasses",
      micAvailable: true,
      webcamAvailable: true,
      metaGlassesAvailable: false,
      metaGlassesReasonCode: "dat_sdk_unavailable",
    })

    expect(snapshot.contractVersion).toBe("conversation_interaction_v1")
    expect(snapshot.requestedEyesSource).toBe("meta_glasses")
    expect(snapshot.capabilities.webcam).toEqual({ available: true, reasonCode: null })
    expect(snapshot.capabilities.metaGlasses).toEqual({
      available: false,
      reasonCode: "dat_sdk_unavailable",
    })
  })

  it("keeps conversation live across thinking gaps while session continuity signals remain", () => {
    const state = resolveConversationSessionState({
      currentState: "live",
      isConversationEnding: false,
      isStartingConversation: false,
      isVoiceListening: false,
      isVoiceTranscribing: false,
      hasPendingVoiceRuntime: false,
      hasConversationSessionActive: true,
      isSendingAssistantTurn: true,
      blockingVisionError: null,
      voiceCaptureError: null,
    })
    expect(state).toBe("live")
  })

  it("returns idle only after all continuity signals are cleared", () => {
    const state = resolveConversationSessionState({
      currentState: "live",
      isConversationEnding: false,
      isStartingConversation: false,
      isVoiceListening: false,
      isVoiceTranscribing: false,
      hasPendingVoiceRuntime: false,
      hasConversationSessionActive: false,
      isSendingAssistantTurn: false,
      blockingVisionError: null,
      voiceCaptureError: null,
    })
    expect(state).toBe("idle")
  })

  it("keeps conversation stage visible while session continuity remains active", () => {
    const visible = shouldKeepConversationStageVisible({
      isConversationStageOpen: false,
      isConversationActive: false,
      isConversationSessionActive: true,
      conversationState: "live",
      isStartingConversation: false,
      isConversationEnding: false,
    })
    expect(visible).toBe(true)
  })

  it("allows stage to close when no continuity signal remains", () => {
    const visible = shouldKeepConversationStageVisible({
      isConversationStageOpen: false,
      isConversationActive: false,
      isConversationSessionActive: false,
      conversationState: "idle",
      isStartingConversation: false,
      isConversationEnding: false,
    })
    expect(visible).toBe(false)
  })
})
