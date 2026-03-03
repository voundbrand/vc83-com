# Conversation Interaction Implementation Checklist (Web + Mobile + Desktop)

**Date:** 2026-03-03  
**Contract reference:** `conversation_interaction_v1`  
**Primary contract doc:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/WEB_CHAT_CONVERSATION_INTERACTION_CONTRACT.md`

---

## 1) Objective

Deliver one consistent live conversation UX and runtime behavior across:

1. web chat,
2. desktop shell,
3. operator mobile,
4. Meta glasses ingress.

---

## 2) Global invariants (all surfaces)

1. `Dictate` remains one-shot and non-live.
2. `Conversation` is the live-session entrypoint.
3. Modes are exactly `voice` and `voice_with_eyes`.
4. No standalone always-visible `Eyes` button in composer.
5. Runtime state machine matches `conversation_interaction_v1`.
6. Degradation reason codes are deterministic and shared.

## 2.1 Concurrent rollout policy

1. Implement web/desktop and iPhone in parallel against the same contract revision.
2. Allow one active implementation row per lane (`I` for web/desktop, `J` for iPhone) when dependencies are satisfied.
3. Require parity checkpoint completion before final smoke/go-no-go signoff.
4. Do not allow iPhone-only UX divergence for mode names, session states, or degradation reason codes.

---

## 3) Surface checklist

## 3.1 Web chat UI

1. Add `Conversation` button to composer row at right of `Dictate`.
2. Add mode picker (`Voice only`, `Voice + Eyes`) with source selector (`Webcam`, `Meta Glasses`).
3. Add persistent live HUD for `connecting|live|reconnecting`.
4. Stream partial transcripts and commit final messages in same thread.
5. Handle permission and degradation paths with contract copy and reason codes.

Primary files:

1. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`
2. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-pane-layout.tsx`
3. `/Users/foundbrand_001/Development/vc83-com/src/contexts/ai-chat-context.tsx`
4. `/Users/foundbrand_001/Development/vc83-com/src/hooks/use-ai-chat.ts`

## 3.2 Desktop shell

1. Ensure desktop shell uses the same composer contract and labels as web chat.
2. Keep desktop capability probe parity (`mic`, `webcam`, optional `meta_glasses` bridge channel).
3. Reuse identical session state semantics and event names.
4. Provide desktop-specific fallback messaging only when capability differs (not behavior schema).

Primary files:

1. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`
2. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/four-pane-layout.tsx`
3. `/Users/foundbrand_001/Development/vc83-com/src/lib/av/ingress/mobileGlassesBridge.ts`
4. `/Users/foundbrand_001/Development/vc83-com/tests/e2e/desktop-shell.spec.ts`

## 3.3 Operator mobile

1. Ensure settings/runtime language aligns to conversation modes (`voice`, `voice_with_eyes`).
2. Keep live session HUD controls equivalent (`mute`, `eyes`, `end`).
3. Keep `/api/v1/ai/voice/*` session lifecycle and transcript continuity parity.
4. Preserve provider-backed voice selection behavior and preview flow.

Primary files:

1. `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`
2. `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/voice/lifecycle.ts`
3. `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/voice/transport.ts`
4. `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/av/videoTransport.ts`

## 3.4 Meta glasses ingress

1. Treat Meta glasses as an `eyes_source` capability, not a separate conversation mode.
2. Capability probe MUST return deterministic availability/reason code.
3. If glasses feed drops, degrade to `voice` and emit `conversation.degraded_to_voice`.
4. Keep callback metrics tied to existing `liveSessionId`/`voiceSessionId`.

Primary files:

1. `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/av/metaBridge.ts`
2. `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/av/metaBridge-contracts.ts`
3. `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`
4. `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`

---

## 4) Event + telemetry checklist

1. Emit all required `conversation_*` events from each surface runtime.
2. Include `contractVersion`, `liveSessionId`, `conversationId`, `eventType`, `timestampMs`.
3. Normalize reason codes:
   - `permission_denied_mic`
   - `permission_denied_camera`
   - `device_unavailable`
   - `dat_sdk_unavailable`
   - `transport_failed`
   - `session_auth_failed`
   - `session_open_failed`
   - `provider_unavailable`
4. Correlate events with trust telemetry using `liveSessionId` and `voiceSessionId`.

---

## 5) Validation checklist

Run at minimum:

1. `npm run mobile:typecheck`
2. `npm run typecheck`
3. `npm run test:unit -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts`
4. `npm run test:e2e:desktop`
5. `npm run docs:guard`

Manual smoke:

1. Web: start/end `voice` conversation.
2. Web: start `voice_with_eyes` via webcam.
3. Desktop: parity with web mode picker and HUD states.
4. Mobile: live voice + fallback behavior.
5. Meta glasses path: capability unavailable and available scenarios.

---

## 6) Release gate

Do not promote as complete until:

1. web and desktop both satisfy `conversation_interaction_v1`,
2. mobile retains existing voice quality and selection behavior,
3. glasses degradation path is deterministic and user-visible,
4. no `/api/v1/ai/voice/*` compatibility regressions are observed.

---

## 7) ORV-024 Frozen Mapping Artifact (Web + Desktop)

**Status:** `DONE` on 2026-03-03  
**Scope:** contract-to-handler mapping freeze only (no implementation changes in this row)

| Contract item (`conversation_interaction_v1`) | Web/desktop handler anchor(s) | Freeze decision for parity |
|---|---|---|
| Composer includes `Dictate` and `Conversation` (no always-visible Eyes button) | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (`VoiceRecorder` composer action, `startVoiceCapture`, `startVisionStream`) | Existing `Dictate`/voice primitives stay as-is; `Conversation` entrypoint will be introduced in `ORV-025` in same composer region and desktop wrappers consume identical surface. |
| Mode picker has exactly `Voice only` + `Voice + Eyes`; explicit Start required | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (existing capture/session open primitives), `src/components/window-content/ai-chat-window/index.tsx`, `src/components/window-content/ai-chat-window/four-pane/four-pane-layout.tsx` | Freeze mode enum to `voice` / `voice_with_eyes`; source enum to `webcam` / `meta_glasses`; require explicit start action before session open. |
| Canonical states: `idle`, `connecting`, `live`, `reconnecting`, `ending`, `ended`, `error` | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (`voiceCaptureState`, `pendingVoiceRuntime.sessionState`, `cameraLiveSession.sessionState`) | Preserve current runtime data sources and map them into canonical `conversation_*` state machine in `ORV-026` without API shape drift. |
| Persistent live HUD while connecting/live/reconnecting | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (composer + vision/voice state region), shell container files above | HUD ownership frozen to chat window composer/session region; desktop shell must render same labels/state transitions as web. |
| Source negotiation (`webcam`, `meta_glasses`) and deterministic degrade path | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (`startVisionStream`, `captureVisionFrame`, `cameraVisionError`), `src/lib/av/ingress/mobileGlassesBridge.ts` (desktop capability path) | Freeze `voice_with_eyes` source semantics: fail-closed availability reasons; on source drop emit degrade-to-voice behavior with shared reason codes. |
| Partial/final transcript continuity in same thread | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` (`voiceRuntime.transcribeAudioBlob`, `setMessage`, `chat.sendMessage`, `setCurrentConversationId`) | Preserve existing thread continuity semantics; canonical conversation mode must remain additive to current send pipeline. |
| Reason-code/event parity (`conversation_*`) | `src/contexts/ai-chat-context.tsx` + `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` runtime plumbing | Freeze deterministic reason code set from contract section 7 and event envelope fields for upcoming implementation rows. |
| Backward compatibility for `/api/v1/ai/voice/*` | `src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx` voice/camera metadata send path | No endpoint or payload-breaking changes allowed; conversation interaction remains a contract-layer UI/runtime mapping over existing voice APIs. |

---

## 8) ORV-031 Frozen Mapping Artifact (iPhone)

**Status:** `DONE` on 2026-03-03  
**Scope:** contract-to-handler mapping freeze only (no implementation changes in this row)

| Contract item (`conversation_interaction_v1`) | iPhone handler anchor(s) | Freeze decision for parity |
|---|---|---|
| Conversation entrypoint parity at composer level | `apps/operator-mobile/app/(tabs)/index.tsx` (`handleOpenVoiceMode`, `setIsVoiceModeOpen`, composer `VoiceRecorder`) | Freeze iPhone entrypoint behavior to same two-mode contract intent; keep existing one-shot dictate path intact. |
| Mode picker (`Voice only`, `Voice + Eyes`) and explicit Start | `apps/operator-mobile/src/components/chat/VoiceModeModal.tsx`, `apps/operator-mobile/app/(tabs)/index.tsx` (`openVoiceSession`, `suspendVoiceSession`) | Freeze mode vocabulary and start semantics to match web/desktop contract before any UI wiring changes in `ORV-032`. |
| Canonical session states + live HUD parity | `apps/operator-mobile/app/(tabs)/index.tsx` (`isVoiceModeOpen`, `isTranscribing`, `isAssistantSpeaking`, `voiceRuntime.sessionState`), `apps/operator-mobile/src/components/chat/VoiceModeModal.tsx` (`statusText`) | Freeze mapping to canonical states (`idle`..`error`) as a projection over current mobile runtime/session signals in `ORV-033`. |
| Source semantics (`iphone/webcam` and `meta_glasses`) | `apps/operator-mobile/app/(tabs)/index.tsx` (`visionSourceMode`, `setVisionSourceMode`, `ensureVisionSourceReady`, `metaBridgeStatus`) | Freeze eyes-source semantics to match contract: `meta_glasses` as capability source only, deterministic degrade-to-voice on availability loss. |
| Runtime session lifecycle + compatibility | `apps/operator-mobile/src/hooks/useMobileVoiceRuntime.ts` (`openSession`, `closeSession`, `suspendSession`, `ingestStreamingFrame`, `transcribeRecording`) | Preserve existing `/api/v1/ai/voice/*` lifecycle integration; conversation interaction layer must remain additive. |
| Deterministic reason-code parity | `apps/operator-mobile/app/(tabs)/index.tsx` (`policyError`, bridge readiness diagnostics), `apps/operator-mobile/src/lib/av/*` | Freeze reason taxonomy parity with contract section 7 (`permission_denied_*`, `device_unavailable`, `dat_sdk_unavailable`, `transport_failed`, `session_*`, `provider_unavailable`). |
| Transcript continuity + turn ordering | `apps/operator-mobile/app/(tabs)/index.tsx` (`setCurrentConversation`, `sendMessageToBackend`, runtime metadata correlation) | Freeze same-thread continuity and existing ordering invariants; no divergence from web/desktop semantics. |

---

## 9) ORV-035 Cross-Surface Parity Gate Evidence

**Status:** `DONE` on 2026-03-03

Implemented parity gate:

1. Added shared runtime taxonomy exports in both web/desktop and iPhone conversation contracts:
   - `CONVERSATION_SESSION_STATES`
   - `CONVERSATION_EVENT_TYPES`
2. Added shared e2e parity gate fixture:
   - `/Users/foundbrand_001/Development/vc83-com/tests/e2e/utils/conversation-parity.ts`
3. Updated both suites to assert the same gate artifact:
   - `/Users/foundbrand_001/Development/vc83-com/tests/e2e/desktop-shell.spec.ts`
   - `/Users/foundbrand_001/Development/vc83-com/tests/e2e/mobile-voice-chaos.spec.ts`
4. Preserved deterministic `conversation_interaction_v1` event/reason taxonomy parity and fail-closed `dat_sdk_unavailable` semantics.

Verify evidence:

1. `npm run typecheck` -> `PASS` (`EXIT_CODE=0`)
2. `npm run test:e2e:desktop` -> sandbox `EPERM` on `127.0.0.1:3000`, escalated rerun `PASS` (`3 passed`, `EXIT_CODE=0`)
3. `npm run test:e2e:mobile` -> sandbox `EPERM` on `127.0.0.1:3000`, escalated rerun `PASS` (`16 passed`, `EXIT_CODE=0`)
4. `npm run docs:guard` -> `PASS` (`Docs guard passed.`, `EXIT_CODE=0`)

---

## 10) ORV-030 Live Smoke Matrix Evidence (Web + Desktop + iPhone)

**Status:** `DONE` on 2026-03-03

### Surface parity matrix (`voice`, `voice_with_eyes`)

| Surface | Mode | Result | Evidence |
|---|---|---|---|
| Web | `voice` | `PASS` | `tests/e2e/desktop-shell.spec.ts` parity gate timeline and event/reason matrix (`conversation_permission_denied`, `conversation_reconnecting`) |
| Web | `voice_with_eyes` | `PASS` | `tests/e2e/desktop-shell.spec.ts` parity gate timeline includes `conversation_eyes_source_changed` and `conversation_degraded_to_voice` |
| Desktop | `voice` | `PASS` | `npm run test:e2e:desktop` (`Desktop Shell` suite pass, `3 passed`) |
| Desktop | `voice_with_eyes` | `PASS` | `npm run test:e2e:desktop` parity test pass with deterministic `conversation_*` matrix |
| iPhone (Playwright mobile profile) | `voice` | `PASS` | `tests/e2e/mobile-voice-chaos.spec.ts` cross-surface matrix + chaos probe (`phone-390x844` + `tablet-834x1112`) |
| iPhone (Playwright mobile profile) | `voice_with_eyes` | `PASS` | `tests/e2e/mobile-voice-chaos.spec.ts` cross-surface matrix includes source-drop degrade and DAT-unavailable fallback |

### Degraded-path behavior evidence

| Scenario | Result | Evidence |
|---|---|---|
| Source drop (`voice_with_eyes` -> `voice`) | `PASS` | `conversation_degraded_to_voice` asserted with `device_unavailable` in desktop/mobile parity gate tests |
| DAT unavailable fail-closed | `PASS` | `dat-unavailable-fallback` asserted as `conversation_error` with `dat_sdk_unavailable` reason code |
| Reconnect degrade/recover | `PASS` | `conversation_reconnecting` -> `conversation_live` timeline asserted with `transport_failed` reason parity |

### Session continuity evidence

| Surface | Result | Evidence |
|---|---|---|
| Web + Desktop | `PASS` | parity timeline includes deterministic reconnect and completion (`live` -> `reconnecting` -> `live` -> `ending` -> `ended`) |
| iPhone | `PASS` | mobile chaos probe retains stable correlation keys (`liveSessionId::voiceSessionId`) and rollback-budget continuity checks (`PROMOTE`) |

### ORV-030 verify rerun evidence

1. `npm run test:e2e:desktop` -> `PASS` (`3 passed`, `EXIT_CODE=0`, escalated run for sandbox bind limits)
2. `npm run test:e2e:mobile` -> `PASS` (`16 passed`, `EXIT_CODE=0`, escalated run for sandbox bind limits)
3. `npm run docs:guard` -> `PASS` (`Docs guard passed.`, `EXIT_CODE=0`)
