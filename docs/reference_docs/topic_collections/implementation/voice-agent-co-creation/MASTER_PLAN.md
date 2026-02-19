# Voice Agent Co-Creation Master Plan

**Date:** 2026-02-19  
**Scope:** Plan and execute a voice-first, adaptive agent co-creation UX that stays aligned with existing trust/memory safeguards.

---

## Mission

Deliver a personal co-creation flow where users can talk naturally with the system to shape agents over time, instead of committing to a single rigid 25-minute interview.

Primary outcomes:

- adaptive interview pacing (short, progressive sessions),
- explicit cancel/discard/resume controls with trust-safe memory behavior,
- provider-agnostic voice runtime (including ElevenLabs option),
- dedicated Brain voice surface in Product + All Apps menus,
- reusable voice assistant contract across application windows.

---

## Non-goals

- No forced migration of all chat/text workflows to voice-only.
- No vendor lock-in to one voice provider.
- No bypass of existing trust consent requirements from `agent-trust-experience`.
- No unrelated desktop shell/theme contract rewrites.

---

## Upstream dependencies

1. Trust workflow baseline from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md` and `TASK_QUEUE.md`.
2. Window interior/UI consistency contract from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_DESIGN_CONTRACT.md`.
3. BYOK/provider extensibility guidance from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/MASTER_PLAN.md`.

---

## Architecture slices

| Slice | Requirement | Primary surfaces/files | Initial status |
|---|---|---|---|
| Voice runtime abstraction | One adapter contract for STT/TTS/session transport/provider selection | `convex/ai/*`; `convex/integrations/*`; voice runtime modules | `planned` |
| Adaptive interview UX | Replace fixed-duration framing with progressive, intent-driven prompts | `src/components/interview/*`; `convex/ai/interviewRunner.ts` | `planned` |
| Session trust boundaries | Explicit save/discard/resume semantics and consent checkpoints | `src/components/interview/*`; `convex/ai/interviewRunner.ts`; trust event modules | `planned` |
| Brain voice window IA | Brain voice entry appears in Product menu + All Apps with modern shell styling | `src/app/page.tsx`; `src/components/window-content/all-apps-window.tsx`; `src/hooks/window-registry.tsx`; Brain window components | `planned` |
| Reusable voice assistant | Shared window/service contract consumable by multiple apps | `src/components/window-content/ai-chat-window/*`; shell window registry/hooks | `planned` |
| Telemetry and rollout safety | Deterministic KPIs, thresholds, and alert actions | analytics/trust modules + this plan + queue notes | `planned` |

---

## VAC-001 baseline audit (2026-02-19)

### ATX trust baseline verification

1. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/TASK_QUEUE.md` confirms `ATX-014` remains `DONE` (lane closeout intact).
2. `convex/ai/interviewRunner.ts` still emits `trust-artifacts.v1` with `soulCard`, `guardrailsCard`, `teamCharter`, and `memoryLedger`.
3. `src/components/interview/interview-results.tsx` still renders the same `trust-artifacts.v1` shape.
4. `convex/ai/trustEvents.ts` keeps deterministic name + payload validation contracts (baseline on `2026-02-19` started from `2026-02-18.v2`; later extended to `2026-02-19.v3` in `VAC-003`).

### Current implementation baseline and fit gaps

| Surface | Current implementation baseline | Voice co-creation trust fit gap |
|---|---|---|
| Brain entry + shell IA | `src/app/brain/page.tsx` redirects to `/agents`; `src/components/window-content/brain-window/index.tsx` is behind `NEXT_PUBLIC_INTERNAL_BRAIN_WINDOW`; no Brain app entry in Product OS catalog/menu wiring (`src/lib/product-os/catalog.ts`, `src/app/page.tsx`, `src/hooks/window-registry.tsx`). | Brain voice path is not discoverable from Product menu or All Apps, so trust-safe voice co-creation cannot be initiated from canonical shell IA. |
| Interview interaction model | `src/components/interview/interview-runner.tsx` exposes a mic icon labeled `Voice input (Phase 2)` without capture/transcription behavior; `src/components/interview/interview-selector.tsx` remains fixed-duration template-driven. | No live voice capture/session controls and no adaptive micro-session pacing contract yet. |
| Save/discard/resume controls | `convex/ai/interviewRunner.ts` enforces consent-gated persistence (`trust.memory.*` events + block on non-accepted consent), supports resume (`resumeInterview`), and hard delete cancel (`cancelInterviewSession`); UI exposes `Save & Exit` and `Cancel & Delete`. | Core safeguards exist, but state transitions are not yet formalized as a voice lifecycle contract (open/checkpoint/discard/resume/complete). |
| Assistant runtime reuse | `src/components/window-content/ai-chat-window/*` remains text-first input; no shared voice runtime adapter/service contract across windows. | Voice session orchestration is fragmented/non-existent at shell level, preventing reusable cross-app co-creation runtime. |
| Trust telemetry taxonomy | `convex/ai/trustEvents.ts` covers trust lifecycle/setup/agents/admin events, but no voice-session lifecycle/adaptive-flow namespace yet. | Voice decisions/checkpoints are not yet first-class telemetry events, limiting deterministic KPI derivation for voice rollout. |

### VAC-001 conclusions

1. Trust-safe memory gating from ATX is reusable as the voice baseline (no pre-consent durable writes).
2. Voice co-creation requires a dedicated contract before implementation lanes (`VAC-002` gate is valid).
3. Telemetry taxonomy must be extended with deterministic voice lifecycle/adaptive-flow events before runtime rollout (`VAC-003`).

---

## VAC-002 voice co-creation contract (2026-02-19)

### Gate confirmation before contract lock

1. ATX closeout assumptions remain valid (`ATX-014` still `DONE` in the upstream queue).
2. `trust-artifacts.v1` shape remains the active compatibility target in runtime and UI.
3. Existing trust event taxonomy remains deterministic and versioned (no free-form event names).

### Session state contract

| State token | Purpose | Durable write policy | Allowed next states |
|---|---|---|---|
| `created` | Voice co-creation session object exists but capture has not started | No durable memory/profile writes | `capturing`, `discarded` |
| `capturing` | User is actively speaking/typing through adaptive prompts | No durable memory/profile writes | `checkpoint_review`, `resumable_unsaved`, `discarded` |
| `checkpoint_review` | User reviews adaptive summary + source-attributed candidates | No durable memory/profile writes | `capturing`, `consent_pending`, `resumable_unsaved`, `discarded` |
| `consent_pending` | Explicit save decision is required | No durable memory/profile writes | `saved`, `resumable_unsaved`, `discarded` |
| `resumable_unsaved` | Session paused with only transient interview state retained | No durable memory/profile writes | `capturing`, `checkpoint_review`, `consent_pending`, `discarded` |
| `saved` | Consent accepted and Content DNA + trust artifacts persisted | Durable writes allowed | `closed` |
| `discarded` | User explicitly rejects persistence and requests cleanup | Must delete durable profile writes from this session if present | `closed` |
| `closed` | Terminal session state for auditability | No additional writes except audit/telemetry | - |

### Save, discard, and resume boundaries

1. No transition may enter `saved` unless consent decision is explicit and affirmative.
2. `Save & Exit` maps to `resumable_unsaved` unless consent has already produced `saved`.
3. `Cancel & Delete` maps to `discarded` and must remove session turns/messages/edges and any session-derived Content DNA artifacts.
4. Resume paths may only restore from `resumable_unsaved`; resumed sessions remain non-durable until consent is re-confirmed.
5. Any non-consent terminal path must emit blocked/no-write trust evidence before `closed`.

### Consent checkpoints

| Checkpoint | Required user-facing content | Blocking rule |
|---|---|---|
| `cp0_capture_notice` | Explicit notice that ongoing capture is transient until save consent | Must be shown before first adaptive capture starts |
| `cp1_summary_review` | Phase/micro-session summary with source attribution for candidate memory entries | Must be shown before presenting save decision |
| `cp2_save_decision` | Binary accept/decline with clear durable-write consequence | Required before any Content DNA persistence |
| `cp3_post_save_revoke` | Reversible revoke affordance after save (with impact preview) | Must allow moving from persisted state to revoked/discarded semantics |

### `trust-artifacts.v1` compatibility contract

| Artifact | Compatibility requirement | Voice-session mapping rule |
|---|---|---|
| `soulCard` | Keep existing card ID and facet fields unchanged | Populate from adaptive identity captures; never rename/remove fields |
| `guardrailsCard` | Keep guardrail/handoff/drift facet keys unchanged | Adaptive prompts can shorten capture, but required safety facets must remain populated |
| `teamCharter` | Keep existing structure and source attribution behavior | Handoff ownership cues from voice checkpoints map to current charter fields |
| `memoryLedger` | Keep consent fields (`consentScope`, `consentDecision`, `consentPromptVersion`) unchanged | Voice consent checkpoints feed ledger entries without schema mutation |

Contract note: voice-specific metadata should be emitted through trust telemetry events, not by mutating `trust-artifacts.v1` card schema in lane `A`.

### Window IA contract (implementation target)

1. Product menu must expose a deterministic Brain voice entry in `AI & Intelligence`.
2. All Apps must expose the same Brain voice entry point (not a hidden route-only path).
3. Entry must launch one shared co-creation runtime path, not per-window forks.
4. Shell/window registration IDs must remain stable and deep-link compatible.

### Telemetry contract hooks for VAC-003

1. Session lifecycle transitions must be represented by deterministic `trust.voice.*.v1` events.
2. Adaptive-flow decisions (prompt branch, checkpoint routing, fallback) must emit deterministic `trust.voice.*.v1` events with explicit decision metadata.
3. Event IDs must remain deterministic and include session-scoped uniqueness.

---

## VAC-003 taxonomy extension (2026-02-19)

### Implemented voice trust events

| Event | Allowed modes | Required voice fields |
|---|---|---|
| `trust.voice.session_transition.v1` | `lifecycle` | `voice_session_id`, `voice_state_from`, `voice_state_to`, `voice_transition_reason`, `voice_runtime_provider` |
| `trust.voice.adaptive_flow_decision.v1` | `lifecycle`, `runtime` | `voice_session_id`, `adaptive_phase_id`, `adaptive_decision`, `adaptive_confidence`, `consent_checkpoint_id` |
| `trust.voice.runtime_failover_triggered.v1` | `lifecycle`, `runtime` | `voice_session_id`, `voice_runtime_provider`, `voice_failover_provider`, `voice_failover_reason`, `voice_provider_health_status` |

### Implementation notes

1. Added taxonomy registration and payload field contracts in `convex/ai/trustEvents.ts`.
2. Bumped taxonomy version to `2026-02-19.v3` to lock the new deterministic voice event contract.
3. Added voice source-event export in `convex/ai/trustTelemetry.ts` to support downstream KPI mapping in lane `F`.
4. Added unit coverage in `tests/unit/ai/trustEventTaxonomy.test.ts` for voice mode gating and required payload validation.

---

## VAC-004 runtime adapter foundation (2026-02-19)

### Implemented adapter contract and runtime surfaces

1. Added typed provider-agnostic adapter contract in `convex/ai/voiceRuntimeAdapter.ts`:
   - session open/close contract,
   - STT/TTS transport methods,
   - provider health probe contract.
2. Added runtime orchestration actions in `convex/ai/voiceRuntime.ts` for:
   - `openVoiceSession`,
   - `closeVoiceSession`,
   - `transcribeVoiceAudio`,
   - `synthesizeVoicePreview`,
   - `probeVoiceProviderHealth`.
3. Added frontend runtime hook `src/hooks/use-voice-runtime.ts` so interview/settings UI can call one runtime path.
4. Added adapter unit coverage in `tests/unit/ai/voiceRuntimeAdapter.test.ts` for:
   - deterministic adapter resolution,
   - health degradation fallback routing,
   - ElevenLabs synthesis contract behavior.

### Trust and fallback guardrails locked in VAC-004

1. Provider-specific behavior is isolated in one typed adapter interface.
2. Runtime fallback starts with deterministic browser runtime fallback when provider health is degraded.
3. Runtime emits deterministic voice trust telemetry for:
   - session transition checkpoints,
   - adaptive STT routing decisions,
   - provider failover triggers with health state metadata.

---

## VAC-005 ElevenLabs integration path + probes (2026-02-19)

### Implemented provider integration surfaces

1. Added org-scoped ElevenLabs integration module (`convex/integrations/elevenlabs.ts`) with:
   - `getElevenLabsSettings` query,
   - `saveElevenLabsSettings` mutation,
   - `probeElevenLabsHealth` action,
   - `getAuthorizedElevenLabsBinding` internal query.
2. Persisted provider data through `organizationAiSettings.llm.providerAuthProfiles` to keep provider credentials behind one provider-auth profile contract.
3. Added provider health summary semantics (`healthy`/`degraded`/`offline`) and deterministic probe reasons for runtime/UI fallback handling.

### Settings UX and fallback documentation updates

1. Wired org owner AI settings UI (`src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`) to:
   - read org ElevenLabs settings,
   - save enable/key/base URL/default voice configuration,
   - run explicit provider health probes from the UI.
2. Added explicit fallback documentation in settings UI:
   - degraded/offline/missing-key provider states deterministically route to browser voice runtime fallback.
3. Maintained provider separation so provider-specific behavior remains behind the typed voice runtime adapter contract (`VAC-004`).

---

## VAC-006 user voice preference + preview controls (2026-02-19)

### Implemented deterministic user preference persistence

1. Extended `userPreferences` schema and mutation/query contract with:
   - `voiceRuntimeProviderId`,
   - `voiceRuntimeVoiceId`,
   - `voiceRuntimePreviewText`.
2. Added deterministic resolver helpers in `convex/userPreferences.ts` for:
   - provider normalization (`browser` default),
   - voice ID normalization,
   - preview text defaulting.
3. Added regression coverage in `tests/unit/ai/userPreferences.appearance.test.ts` for voice preference fallback semantics.

### Implemented interview voice controls and preview behavior

1. Added reusable user preference hook `src/hooks/use-voice-preferences.ts` to load/save voice runtime preferences.
2. Wired `src/components/interview/interview-runner.tsx` with:
   - provider selection controls,
   - optional voice ID input,
   - preview text editing,
   - runtime synthesis preview via `useVoiceRuntime`,
   - explicit save of user preference policy.
3. Documented and enforced deterministic resolution order in UI and behavior:
   - user preference -> org default voice -> browser fallback when provider health degrades.

---

## VAC-007 adaptive micro-session framing + progressive prompts (2026-02-19)

### Implemented adaptive flow runtime changes

1. Added adaptive interview helper primitives in `convex/ai/interviewRunner.ts`:
   - phase coverage computation with required-field awareness,
   - progressive prompt generation per phase,
   - consent checkpoint timeline summaries (`cp0`..`cp3`) surfaced in query context.
2. Replaced rigid phase-duration progress estimation with adaptive question-based estimates for micro-session pacing.
3. Added trust-safe early phase advance behavior:
   - only advances early when required fields in the current phase are already captured,
   - blocks early advance when follow-up is required or extraction confidence is too low.

### Implemented UI and template framing updates

1. Updated `src/components/interview/interview-runner.tsx` to render:
   - `microSessionLabel`,
   - progressive prompt guidance,
   - active consent checkpoint notice with source-attribution reminder.
2. Updated `src/components/interview/interview-selector.tsx` mode copy from rigid duration framing to adaptive micro-session framing.
3. Updated trust interview seed template descriptions/silence handling in `convex/seeds/interviewTemplates.ts` to reflect progressive checkpoint-based interviewing.
4. Added unit coverage in `tests/unit/interview/adaptiveInterviewFlow.test.ts` for:
   - required-field coverage detection,
   - adaptive early-advance gating,
   - progressive prompt inclusion in LLM prompt context.

---

## VAC-008 explicit pause/discard/resume UX + no-write guarantees (2026-02-19)

### Implemented lifecycle semantics and persistence boundaries

1. Added explicit interview lifecycle persistence to guided session state:
   - new `sessionLifecycle` contract in `convex/schemas/interviewSchemas.ts` and `convex/schemas/agentSessionSchemas.ts`,
   - deterministic lifecycle states for `capturing`, `resumable_unsaved`, `checkpoint_review`, `saved`, and `discarded`.
2. Added backend mutations in `convex/ai/interviewRunner.ts`:
   - `pauseInterviewSession` for explicit resumable-unsaved pause,
   - `discardInterviewSession` for explicit unsaved closeout with trust-event emission.
3. Added shared cleanup helper for any session-derived Content DNA artifact removal when discard/decline paths are taken.
4. Extended consent/advance/resume paths to update lifecycle checkpoints deterministically so resume and discard states remain explicit.

### Implemented UX controls and confirmation affordances

1. Updated `src/components/interview/interview-runner.tsx` to expose explicit controls:
   - `Pause & Resume` action in runner + consent screens,
   - `Discard` action guarded by explicit confirmation.
2. Added no-write policy copy in runner and consent surfaces:
   - durable memory writes remain blocked until explicit save consent.
3. Preserved existing consent-gated persistence path and blocked-write trust event behavior.

---

## VAC-009 voice-aware consent summaries + source attribution checkpoints (2026-02-19)

### Implemented consent context + checkpoint visibility updates

1. Added a deterministic `voiceConsentSummary` context payload in `convex/ai/interviewRunner.ts` with:
   - active checkpoint ID,
   - voice capture mode and fallback policy,
   - source attribution policy text,
   - source-attribution preview rows for current memory candidates.
2. Updated consent checkpoint summary generation (`cp0`..`cp3`) so source attribution policy/summary remains visible at every checkpoint stage, including pre-save capture notice.
3. Extended interview prompt context to include active checkpoint + source attribution policy so adaptive prompting remains trust-aligned during capture.

### Implemented UI and trust artifact rendering updates

1. Updated `src/components/interview/interview-runner.tsx` to render:
   - voice-aware consent summary panel during adaptive capture and consent review,
   - checkpoint cards with explicit attribution policy text and source-preview rows at each checkpoint.
2. Updated `src/components/interview/interview-results.tsx` to render persisted voice consent summary metadata alongside trust artifacts after save.
3. Added regression assertions in `tests/unit/interview/adaptiveInterviewFlow.test.ts` for prompt-level checkpoint + source attribution policy visibility.

---

## VAC-010 Brain voice menu + All Apps discoverability (2026-02-19)

### Implemented shell/catalog integration updates

1. Added `brain-voice` to Product OS catalog metadata in `src/lib/product-os/catalog.ts` (AI & Intelligence category, beta release stage) so it is discoverable in Product menu and All Apps.
2. Added shell icon routing for `brain-voice` in `src/components/icons/shell-icons.tsx` so launcher/menu rows use canonical icon components (no emoji chrome fallback on this path).
3. Added `openBrainVoiceWindow` wiring in `src/app/page.tsx` and mapped `brain-voice` into `productAppActions`.
4. Added `brain-voice` launch mapping in `src/components/window-content/all-apps-window.tsx` and registry entry in `src/hooks/window-registry.tsx`.

### Trust/UI contract outcome

1. Brain voice now opens from both Product menu and All Apps using deterministic window identity (`brain-voice`) and Brain learn-mode surface.
2. Lane D shell changes stayed within shared token/icon/menu contract and did not add new legacy Win95-only interior patterns.

---

## VAC-011 reusable voice assistant window/service contract (2026-02-19)

### Implemented shared contract modules

1. Added `src/lib/voice-assistant/window-contract.ts` as the canonical voice assistant window/service contract source:
   - shared service ID (`voice-runtime-shared.v1`),
   - shared fallback policy (`user_preference->org_default->browser`),
   - deterministic window metadata for `ai-assistant` and `brain-voice`.
2. Added `src/components/window-content/ai-chat-window/voice-assistant-contract.ts` as the ai-chat-window co-located contract export for multi-app reuse.

### Refactored launch/restore consumers to use one contract path

1. `src/app/page.tsx` now routes voice assistant opens through `openVoiceAssistantWindow(...)` using the shared contract.
2. `src/components/window-content/all-apps-window.tsx` now resolves AI Assistant and Brain Voice launch metadata via `getVoiceAssistantWindowContract(...)`.
3. `src/hooks/window-registry.tsx` now consumes the same contract for default window metadata, keeping open + restore behavior aligned.

### Validation note

1. Queue verify commands were executed exactly for this row; typecheck failure remained a pre-existing non-lane issue in `convex/ai/agentExecution.ts` typing contracts.

---

## VAC-012 ongoing agent co-creation handoff loop (2026-02-19)

### Implemented cross-app `agent for this` handoff orchestration

1. Added shared handoff helper module `src/lib/voice-assistant/agent-co-creation-handoff.ts` for deterministic payload construction and single-use staging/consumption:
   - builds editable handoff drafts from `contentDNAId`, consent metadata, and trust-artifact highlights,
   - keeps handoff payload versioned (`voice-agent-handoff.v1`) and schema-stable,
   - enforces single-use queue semantics via session storage consume/remove behavior.
2. Updated `src/components/interview/interview-runner.tsx` completion state with explicit `Agent for this` CTA:
   - stages handoff draft payloads without auto-execution,
   - opens `ai-assistant` through `getVoiceAssistantWindowContract(...)` and shared window metadata path,
   - records open context metadata for shell-level attribution.
3. Updated AI assistant input surfaces to consume staged drafts as editable text only:
   - `src/components/window-content/ai-chat-window/single-pane/chat-input.tsx`,
   - `src/components/window-content/ai-chat-window/four-pane/chat-input-redesign.tsx`.
4. Added regression coverage in `tests/unit/interview/voiceAgentCoCreationHandoff.test.ts` for:
   - trust-safe draft composition,
   - deterministic source-field ordering,
   - payload metadata defaults.

### Trust guardrail outcome

1. Human-in-the-loop review remains explicit:
   - staged drafts are never auto-sent,
   - handoff draft load forces review mode (`humanInLoopEnabled`) before operator send.
2. Escalation controls remain explicit through handoff draft instructions and existing runtime approval/escalation flows.
3. `trust-artifacts.v1` compatibility is preserved by consuming existing artifact shapes and avoiding schema mutations.

---

## VAC-013 voice KPI baselines, thresholds, and rollout guardrails (2026-02-19)

### Baseline precondition confirmation

1. All prerequisite `P0` tasks were confirmed `DONE` before lane `F` execution (`VAC-001`, `VAC-002`, `VAC-004`, `VAC-007`, `VAC-008`, `VAC-010`).

### Top trust-regression risks reviewed before execution

1. Thresholds drift from actual voice telemetry semantics and create false rollout outcomes.
2. Runtime-failure and context-loss signals are under-weighted and allow unsafe rollout continuation.
3. Docs/code/tests diverge on KPI contract values and make guardrail decisions non-deterministic.

### Implemented KPI + guardrail outputs

1. Updated `convex/ai/trustTelemetry.ts` to make voice co-creation KPIs the canonical rollout contract:
   - `voice_session_start_rate`,
   - `voice_session_completion_rate`,
   - `voice_cancel_without_save_rate`,
   - `voice_memory_consent_accept_rate`,
   - `voice_runtime_failure_rate`,
   - `agent_creation_handoff_success_rate`.
2. Added deterministic pre-rollout baseline constants in code (`VOICE_TRUST_PRE_ROLLOUT_BASELINES`) and aligned KPI threshold definitions to the rollout contract.
3. Re-mapped telemetry dashboards for lane `F`:
   - `voice_session_funnel_dashboard`,
   - `voice_runtime_guardrails_dashboard`,
   - `voice_agent_handoff_dashboard`.
4. Locked rollout gating logic to deterministic outcomes:
   - any critical KPI breach => `rollback`,
   - warning or missing KPI => `hold`,
   - all KPI values healthy => `proceed`.
5. Extended unit coverage in `tests/unit/ai/trustTelemetryDashboards.test.ts` for baseline pinning, dashboard rollup severity, warning/critical guardrail behavior, and KPI payload validation.

### Validation note

1. `npm run typecheck` failed on pre-existing non-lane errors in `convex/ai/workerPool.ts` (`TS2698` at lines `285` and `346`).
2. `npm run lint` passed with existing warnings (`0` errors, `2991` warnings).
3. `npm run test:unit` passed (`92` files, `469` tests).
4. `npm run docs:guard` passed.

---

## VAC-014 hardening and lane closeout (2026-02-19)

### Dependency gate confirmation

1. Confirmed `VAC-013` was `DONE` in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/TASK_QUEUE.md` before starting lane `G`.

### Top trust-regression risks reviewed before execution

1. Closeout changes regress consent boundaries and imply durable writes before explicit save acceptance.
2. Verification evidence drifts between docs and queue notes, masking unresolved trust regressions.
3. Release handoff misses explicit failover/rollback checks and weakens rollout guardrail enforcement.

### Hardening regression matrix

| Regression area | Trust contract expectation | Verification evidence | Status |
|---|---|---|---|
| Consent-gated persistence boundaries | No durable write before explicit consent/save decision | `npm run test:unit` includes `tests/unit/interview/adaptiveInterviewFlow.test.ts` and `tests/unit/interview/voiceAgentCoCreationHandoff.test.ts` | `covered` |
| Trust telemetry contract and KPI guardrails | Voice lifecycle/failover events remain deterministic and threshold-aligned | `npm run test:unit` includes `tests/unit/ai/trustEventTaxonomy.test.ts` and `tests/unit/ai/trustTelemetryDashboards.test.ts` | `covered` |
| Shared runtime fallback semantics | Runtime/provider fallback remains deterministic (`user_preference->org_default->browser`) | `npm run test:unit` includes `tests/unit/ai/voiceRuntimeAdapter.test.ts` | `covered` |
| Shell/window identity consistency | Brain voice + AI assistant continue using shared contract/stable IDs | `npm run typecheck` (pass) and queue-documented contract paths from `VAC-010`/`VAC-011` remain unchanged | `covered` |
| Docs and queue synchronization | Queue, index, and plan reflect one final closeout state | `npm run docs:guard` (pass) and synchronized updates to `TASK_QUEUE.md`, `INDEX.md`, and `MASTER_PLAN.md` | `covered` |

### Release checklist (lane `G`)

1. Queue dependency gate validated (`VAC-013` done).
2. Trust-regression risk list captured before task execution.
3. `V-TYPE` verification complete: `npm run typecheck` (pass).
4. `V-LINT` verification complete: `npm run lint` (pass with existing warnings: `0` errors, `2991` warnings).
5. `V-UNIT` verification complete: `npm run test:unit` (pass: `92` files, `469` tests).
6. `V-DOCS` verification complete: `npm run docs:guard` (pass).
7. Workstream docs synchronized across queue, plan, and index.

### Lane closeout outcome

1. `VAC-014` is complete and lane `G` is closed.
2. Voice-agent co-creation workstream has no remaining promotable tasks.

---

## Phase-to-lane mapping

| Phase | Objective | Lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Baseline + contract | `A` | `VAC-001`..`VAC-003` |
| Phase 2 | Voice runtime/provider layer | `B` | `VAC-004`..`VAC-006` |
| Phase 3 | Adaptive interview flow + trust boundaries | `C` | `VAC-007`..`VAC-009` |
| Phase 4 | Brain/app shell integration | `D` | `VAC-010`..`VAC-011` |
| Phase 5 | Agent co-creation orchestration | `E` | `VAC-012` |
| Phase 6 | Telemetry + KPI thresholds + alerts | `F` | `VAC-013` |
| Phase 7 | Hardening + closeout | `G` | `VAC-014` |

---

## Acceptance criteria

1. Users can start short voice-driven co-creation sessions without rigid duration framing.
2. Users can cancel/discard without durable writes unless explicit save/consent occurs.
3. Users can resume sessions with transparent state and source attribution.
4. Brain voice interface is discoverable via Product menu and All Apps.
5. Voice provider selection is explicit and testable, with at least one configurable external provider path.
6. Shared voice runtime can be reused by non-Brain surfaces without forking logic.
7. KPI definitions and alert thresholds are documented and connected to rollout actions.
8. Queue verification commands and docs guard pass before closeout.

---

## Trust KPI catalog and alert thresholds

| KPI | Baseline (initial) | Target | Warning | Critical | Window | Action |
|---|---:|---:|---:|---:|---|---|
| `voice_session_start_rate` | `0.33` | `>=0.35` | `<0.25` | `<0.15` | `24h` | `hold` on warning, `rollback` on critical |
| `voice_session_completion_rate` | `0.68` | `>=0.70` | `<0.55` | `<0.45` | `24h` | `hold` on warning, `rollback` on critical |
| `voice_cancel_without_save_rate` | `0.27` | `<=0.30` | `>0.40` | `>0.55` | `24h` | investigate trust friction; `hold` if sustained |
| `voice_memory_consent_accept_rate` | `0.62` | `>=0.65` | `<0.50` | `<0.40` | `24h` | tighten consent UX copy, `hold` rollout |
| `voice_runtime_failure_rate` | `0.04` | `<=0.03` | `>0.06` | `>0.10` | `1h` | auto `hold` and failover path |
| `agent_creation_handoff_success_rate` | `0.78` | `>=0.80` | `<0.65` | `<0.50` | `24h` | `hold` and debug handoff mapping |

Notes:

- Baselines above are the observed pre-rollout values locked during `VAC-013`.
- Alert actions map to deterministic guardrail decisions: `proceed`, `hold`, `rollback`.

---

## Global risks

1. Voice UX introduces perceived opacity around what is saved.
2. Provider/runtime instability harms trust in co-creation flow.
3. Brain UI parity regresses if voice surface bypasses shared interior contract.
4. Interview adaptation loses deterministic artifact quality from trust templates.
5. Telemetry blind spots hide failures until after rollout.

Mitigation strategy:

- enforce explicit consent and discard semantics,
- keep provider abstraction behind typed contract + health probes,
- reuse shared UI primitives/contracts,
- preserve trust artifact schema compatibility,
- gate rollout on KPI thresholds in Lane `F`.

---

## Status snapshot

- Lane `A` (`VAC-001`..`VAC-003`) completed on 2026-02-19.
- Lane `B` (`VAC-004`..`VAC-006`) completed on 2026-02-19.
- Lane `C` (`VAC-007`..`VAC-009`) completed on 2026-02-19.
- Lane `D` (`VAC-010`..`VAC-011`) completed on 2026-02-19.
- Lane `E` (`VAC-012`) completed on 2026-02-19.
- Lane `F` (`VAC-013`) completed on 2026-02-19.
- Lane `G` (`VAC-014`) completed on 2026-02-19.
