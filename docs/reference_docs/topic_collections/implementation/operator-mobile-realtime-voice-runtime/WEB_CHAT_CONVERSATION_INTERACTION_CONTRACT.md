# Web Chat Conversation Interaction Contract (V1)

**Date:** 2026-03-03  
**Contract ID:** `conversation_interaction_v1`  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime`

---

## 1) Purpose

Define a single, device-agnostic interaction contract for live conversation in chat UI that can scale from web webcam to Meta glasses and future end devices without UI or protocol drift.

This contract governs:

1. user-facing controls and session UX in chat composer,
2. live conversation mode selection (`voice` vs `voice_with_eyes`),
3. capability negotiation for capture sources (`webcam`, `meta_glasses`, future sources),
4. normalized session state machine, events, and failure handling.

---

## 2) Scope

In scope:

1. web app chat UI interaction model,
2. required frontend state transitions and copy,
3. client-runtime event contract surface for device integration,
4. compatibility requirements with existing `/api/v1/ai/voice/*` runtime flows.

Out of scope:

1. visual style/theme token decisions,
2. provider internals (STT/TTS model selection),
3. hardware SDK implementation details per device.

---

## 3) UX Surface Contract

## 3.1 Composer controls

The composer row MUST expose:

1. `Dictate` button (existing one-shot input, non-live),
2. `Conversation` button (new live-session entrypoint) to the right of `Dictate`.

The composer row MUST NOT expose a separate always-visible `Eyes` button in V1.

## 3.2 Conversation mode picker

Pressing `Conversation` MUST open a mode picker with exactly two options:

1. `Voice only`
2. `Voice + Eyes`

`Voice + Eyes` MUST expose source options:

1. `Webcam`
2. `Meta Glasses` (disabled if capability unavailable)

## 3.3 Mode memory

Client SHOULD remember last successful mode/source and preselect it on next open.
Client MUST still require explicit confirmation (`Start`) each session.

---

## 4) Session State Machine Contract

Canonical states:

1. `idle`
2. `connecting`
3. `live`
4. `reconnecting`
5. `ending`
6. `ended`
7. `error`

Optional sub-states while `live`:

1. `mic_muted` (`true|false`)
2. `eyes_enabled` (`true|false`)
3. `eyes_source` (`none|webcam|meta_glasses|external`)
4. `assistant_speaking` (`true|false`)
5. `user_speaking` (`true|false`)

State invariants:

1. `eyes_enabled=true` is valid only when mode is `voice_with_eyes`.
2. `eyes_source=meta_glasses` requires capability probe success.
3. If eyes capture fails during live session, client MUST degrade to `voice` and emit degradation event.

---

## 5) UI Behavior Contract

## 5.1 Session HUD while live

While `state in {connecting, live, reconnecting}` chat UI MUST show persistent live HUD including:

1. session status text,
2. mic state indicator,
3. eyes/camera state indicator,
4. end-session control,
5. degraded/reconnecting warning area.

## 5.2 Required controls in live HUD

1. `Mute/Unmute mic`
2. `Eyes on/off` (only if mode `voice_with_eyes`)
3. `Switch eyes source` (when more than one source available)
4. `End conversation`

## 5.3 Conversation transcript behavior

1. Partial transcript updates MUST stream into current thread as ephemeral partials.
2. Finalized user/assistant turns MUST persist as canonical messages.
3. Live mode end MUST preserve continuity in same conversation thread.

---

## 6) Capability Negotiation Contract

Before `Start`, client MUST resolve capability snapshot:

```json
{
  "contractVersion": "conversation_interaction_v1",
  "sessionIntent": "voice" ,
  "requestedEyesSource": "none",
  "capabilities": {
    "mic": { "available": true, "reasonCode": null },
    "webcam": { "available": true, "reasonCode": null },
    "metaGlasses": { "available": false, "reasonCode": "dat_sdk_unavailable" }
  }
}
```

For `voice_with_eyes`, `requestedEyesSource` MUST be one of:

1. `webcam`
2. `meta_glasses`
3. `external` (reserved)

If requested source is unavailable:

1. `Start` MUST be blocked before connection, or
2. client MAY offer fallback to `voice` with explicit confirmation.

---

## 7) Runtime Event Contract (Client-Side Canonical Envelope)

All UI-runtime coordination events SHOULD use:

```json
{
  "contractVersion": "conversation_interaction_v1",
  "eventType": "conversation.state_changed",
  "timestampMs": 0,
  "liveSessionId": "string",
  "conversationId": "string",
  "payload": {}
}
```

Required event types:

1. `conversation.start_requested`
2. `conversation.connecting`
3. `conversation.live`
4. `conversation.reconnecting`
5. `conversation.ended`
6. `conversation.error`
7. `conversation.degraded_to_voice`
8. `conversation.eyes_source_changed`
9. `conversation.permission_denied`

Error/degradation payload MUST include deterministic reason code set:

1. `permission_denied_mic`
2. `permission_denied_camera`
3. `device_unavailable`
4. `dat_sdk_unavailable`
5. `transport_failed`
6. `session_auth_failed`
7. `session_open_failed`
8. `provider_unavailable`

---

## 8) Backward Compatibility Contract

V1 MUST remain additive to existing runtime APIs:

1. no breaking changes to `/api/v1/ai/voice/*`,
2. conversation mode maps onto existing voice session lifecycle,
3. `voice_with_eyes` metadata reuses existing shared media runtime fields (`voiceRuntime`, `videoRuntime`, `transportRuntime`) where present.

---

## 9) Accessibility Contract

Minimum requirements:

1. full keyboard activation for all conversation controls,
2. `aria-pressed` semantics for toggle controls,
3. state announcements for `connecting`, `live`, `reconnecting`, `ended`, `error`,
4. no icon-only critical actions without text label or tooltip.

---

## 10) Copy Contract (V1 defaults)

Mode picker labels:

1. `Voice only`
2. `Voice + Eyes`

Source labels:

1. `Webcam`
2. `Meta Glasses`

State labels:

1. `Connecting...`
2. `Live`
3. `Reconnecting...`
4. `Conversation ended`
5. `Conversation unavailable`

Degradation notice:

1. `Eyes feed unavailable. Continuing with voice only.`

---

## 11) Acceptance Criteria

V1 is acceptable when:

1. web chat exposes `Conversation` control and mode picker as defined,
2. live session state machine behavior matches section 4 invariants,
3. `Voice + Eyes` properly negotiates webcam and Meta glasses capabilities,
4. failure/degradation reason codes conform to section 7,
5. chat thread continuity is preserved for all live sessions,
6. interaction contract is reusable by mobile/desktop device clients without changing contract ID.

---

## 12) Versioning Policy

1. Breaking behavior/field changes require new contract ID (`conversation_interaction_v2`).
2. Additive event fields are permitted within V1 if existing required fields remain stable.
3. Any client implementing V1 MUST ignore unknown additive fields.

---

## 13) Frozen Implementation Mapping Artifacts

For queue rows `ORV-024` (web/desktop) and `ORV-031` (iPhone), the frozen contract-to-handler behavior matrices are maintained in:

`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/CONVERSATION_INTERACTION_IMPLEMENTATION_CHECKLIST.md`

Sections:

1. `7) ORV-024 Frozen Mapping Artifact (Web + Desktop)`
2. `8) ORV-031 Frozen Mapping Artifact (iPhone)`
