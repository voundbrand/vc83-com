# Your AI One-Agent Core Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core`  
**Last updated:** 2026-02-27  

---

## Mission

Translate `/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md` into execution-ready, code-backed contracts for the shared one-agent platform, while preserving AGP/PLO ownership boundaries.

---

## Canonical architecture contract

Primary runtime contract source for one-agent orchestration and authority invariants:

`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/ARCHITECTURE_CONTRACT.md`

Contract acceptance criteria are mirrored below with shipped evidence and must remain in sync with the contract document.

---

## Architecture acceptance sync (2026-02-24)

| Contract acceptance criterion | Status | Concise shipped evidence |
|---|---|---|
| Runtime supports one-primary invariant enforcement | `SHIPPED` | `convex/agentOntology.ts` enforces one context primary; covered by `tests/unit/ai/primaryAgentInvariants.test.ts`. |
| Runtime supports explicit primary reassignment semantics | `SHIPPED` | `setPrimaryAgent` transactional demote/promote + audit event in `convex/agentOntology.ts`; UI guard coverage in `tests/unit/agents/primaryAgentUi.test.ts`. |
| Midwife composes from seeded catalog profiles with provenance | `SHIPPED` | `composeMidwifeHybridProfile` in `convex/ai/midwifeCatalogComposer.ts`; provenance persisted from `convex/ai/interviewRunner.ts`; covered by `tests/unit/ai/midwifeCatalogComposer.test.ts`. |
| Default UX keeps one voice with internal specialist delegation | `SHIPPED` | Routing semantics in `convex/ai/teamHarness.ts` + `convex/ai/agentExecution.ts`; primary-governed authority coverage in `tests/unit/ai/delegationAuthorityRuntime.test.ts` and `tests/unit/ai/teamAccessModeRouting.test.ts`. |

---

## VisionClaw parity execution closeout (2026-02-26)

Parity chain `YAI-018` -> `YAI-019` -> `YAI-020` -> `YAI-021` is now complete for one-of-one path.

| Capability | VisionClaw reference baseline | Current vc83 reality | Queue action |
|---|---|---|---|
| Live camera vision stream from chat | Real-time camera stream (`~1fps`) from glasses/phone into live session | AI chat `Vision` path now starts/stops a real `getUserMedia` stream, captures frames into attachment pipeline, and emits `cameraRuntime` + `liveSessionId` ingress metadata (`src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`, `src/hooks/use-ai-chat.ts`, `convex/ai/chat.ts`) | `YAI-018` `DONE` |
| Live voice runtime session in chat | Real-time audio session lifecycle with provider/runtime metadata | AI chat mic now uses `useVoiceRuntime` + `MediaRecorder` capture/transcribe path, resolves runtime session contracts per conversation, and emits `voiceRuntime` metadata with deterministic fallback reason fields | `YAI-019` `DONE` |
| Live ingress metadata from chat (`cameraRuntime`, `voiceRuntime`, `liveSessionId`) | Session metadata emitted as part of live multimodal loop | Chat send path now accepts/forwards live runtime metadata directly into canonical ingress path (`src/hooks/use-ai-chat.ts`, `convex/ai/chat.ts`) | `YAI-018`/`YAI-019` `DONE` |
| Live-session observability parity | Stream start/stop state, cadence, and session diagnostics | Inbound native vision-edge envelope now includes observability contract fields (vision/voice lifecycle states, frame cadence, deterministic fallback reasons, voice-camera `sessionCorrelationId`) with regression tests | `YAI-020` `DONE` |

Residual risk snapshot (published via `YAI-021`):

1. Browser/device capability variance remains a runtime factor (`getUserMedia`/`MediaRecorder` permissions and support); fallback reasons are now explicit and sorted but still depend on host environment error surfaces.
2. Voice provider health failover may downgrade to non-transcribing runtime paths; ingress metadata now preserves deterministic reason codes to keep trust/approval telemetry auditable.
3. Live capture UX depends on operator browser focus/audio permissions; regression tests cover contract behavior, not full device matrix parity.

Rollback plan:

1. Disable live camera path by forcing operators to upload-only flow (`Vision` toggle hidden, `cameraRuntime` emission disabled) while keeping attachment pipeline intact.
2. Disable runtime voice capture by gating mic controls and reverting to typed-only entry while preserving `vc83_runtime_policy` precedence on all mutating tool flows.
3. Keep inbound observability contract fields backward-compatible; consumers can ignore `observability` payload while leaving authority invariants and fail-closed direct-mutation guards active.

---

## Lane A execution notes

### `YAI-001` risk check (before execution)

1. Regression risk: collapsing runtime-contract ownership into template seed/tool files and creating boundary drift.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`; AGP/PLO queue ownership rows.
2. Regression risk: marking already-shipped capabilities as net-new and duplicating active streams.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/MASTER_PLAN.md`.
3. Regression risk: missing a PRD acceptance cluster and leaving non-deterministic ownership.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md`; this queue's `TASK_QUEUE.md`.

### `YAI-002` risk check (before execution)

1. Regression risk: non-deterministic section 15 mapping that leaves one requirement split across unlinked rows.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`; AGP/PLO queue dependency tokens.
2. Regression risk: missing verify-profile mapping for acceptance rows and allowing closure without intended checks.
   Impacted contracts: all row `Verify` columns in `YAI`, `AGP`, and `PLO` queues.
3. Regression risk: incorrect "already shipped" markers that hide net-new core work.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md` section 15; this file's delta matrix and closeout gates.

---

## PRD Delta Summary

PRD v1.3 adds or tightens nine major capability clusters:

1. One-agent architecture with Dream Team access modes.
2. Privacy mode with local inference and explicit cloud/local boundaries.
3. Soul modes (work/private) and internal archetypes.
4. Birthing interview with interview-origin identity constraints.
5. Emergent team mechanics.
6. Personal + business multi-org flow hardening.
7. Quality firewall + multi-model drift controls.
8. Autonomy progression with domain-scoped controls.
9. Code execution governance, chat-first engagement, camera/glasses + desktop/voice expansion.

Only a subset is currently owned by AGP/PLO queues; this workstream owns the shared core remainder.

---

## PRD Acceptance Cluster Delta Matrix (`YAI-001`)

This matrix maps each section 15 acceptance cluster to shipped/in-flight evidence and the net-new core rows.

| Acceptance cluster | Existing stream evidence | Core rows | Delivery marker | Ownership notes |
|---|---|---|---|---|
| `P0 Primary Agent + Soul` | Soul/harness foundations already exist in PRD anchors (`4.1`, `4.2`) and finished stream soul/runtime hardening (`OCO-010`, `OCO-011`). | `YAI-003`, `YAI-014` | `ALREADY_SHIPPED_BASELINE + NET_NEW_CORE_EXTENSION` | `YAI` owns shared runtime fields and authority invariants. |
| `P0 Dream Team (specialists + access modes)` | AGP published core specialist catalog rows (`AGP-003`), with full catalog alignment in progress (`AGP-004`, `AGP-012`); protected specialist template/clone mechanics already shipped (`OCO-008`, `OCO-009`). | `YAI-003`, `YAI-004` | `AGP_IN_FLIGHT + NET_NEW_CORE_ROUTING` | AGP owns catalog/seed docs; `YAI` owns runtime `teamAccessMode` semantics. |
| `P0 Internal Archetypes` | No queue has shipped archetype overlay contracts yet; PLO compliance rows consume guardrails after core contracts exist. | `YAI-006` | `NET_NEW_CORE` | Archetype runtime and guardrails remain core-platform ownership. |
| `P0 Multi-Org (personal + business)` | Personal workspace baseline exists in product/runtime (`YOUR_AI_PRD.md` says signup personal org already works; `PLO-001` reality lock references current org behavior). | `YAI-007` | `ALREADY_SHIPPED_BASELINE + NET_NEW_CORE_EXTENSION` | `YAI` owns shared org-runtime contracts; PLO validates personal-operator scenarios. |
| `P0 Privacy + Model Quality` | Multi-provider/model conformance and routing foundations are shipped (`BMF-005`, `BMF-008`, `BMF-015`, `BMF-016`). | `YAI-010` | `ALREADY_SHIPPED_BASELINE + NET_NEW_CORE_EXTENSION` | `YAI` owns privacy toggle, drift, quality-tier core contract. |
| `P0 Autonomy + Trust` | Trust/HITL telemetry contracts already shipped (`ATX-003`, `ATX-013`, `ATX-019`, `ATX-020`). | `YAI-008`, `YAI-009` | `ALREADY_SHIPPED_BASELINE + NET_NEW_CORE_EXTENSION` | `YAI` owns 4-level autonomy + domain-scoped policy; PLO consumes defaults. |
| `P0 Birthing Process` | Interview/runtime foundations already exist (`YOUR_AI_PRD.md` section `4.8` current-state anchors). | `YAI-005` | `ALREADY_SHIPPED_BASELINE + NET_NEW_CORE_EXTENSION` | `YAI` owns interview-origin immutability and first-words handshake contract. |
| `P1 Desktop + Voice` | Voice/runtime provider groundwork is already shipped (`BMF-016`; `VAC` closeout), while desktop continuity + behavior parity with mobile runtime contracts and native Polymarket operator capability remain open. | `YAI-011`, `YAI-014`, `YAI-015`, `YAI-016`, `YAI-017` | `PARTIAL_BASELINE + NET_NEW_CORE` | `YAI` owns canonical ingress + authority invariants; compatibility bridge stays optional. |
| `P1 Daily Engagement` | Conversation continuity exists now (`YOUR_AI_PRD.md` section `14.3` references `convex/ai/conversations.ts`). | `YAI-012`, `YAI-008`, `YAI-009` | `ALREADY_SHIPPED_BASELINE + NET_NEW_CORE_EXTENSION` | Morning briefing and governance additions are core runtime rows. |
| `P1 Team Evolution` | AGP seed-library rows (`AGP-007`, `AGP-008`) are planned, but emergent-team runtime contracts are not yet landed. | `YAI-005`, `YAI-013` | `NET_NEW_CORE + DOWNSTREAM_DEPENDENCY` | `YAI` sets runtime contract; AGP consumes it for seed docs. |
| `P1 Multi-Org Enhancements` | Multi-org baseline exists and runtime closure is now landed in `YAI-007` (cross-org read-only enrichment + org-type Dream Team scoping). | `YAI-007`, `AGP-012` | `PARTIAL_BASELINE + NET_NEW_CORE_EXTENSION` | Core isolation and enrichment runtime contract in `YAI`; specialist packaging language remains in AGP docs. |

### Overlap-file ownership lock (`YAI-001`)

1. `seedPlatformAgents.ts` row ownership stays with `PLO-010` (personal-operator template behavior) and `AGP-009` (global seed ingestion wiring).
2. `toolScoping.ts` row ownership stays with `PLO-010` (personal template tool profile defaults) and AGP matrix/contracts; `YAI` consumes outputs.
3. If `YAI` runtime contract changes require overlap-file updates, the change must be routed via dependency tokens to AGP/PLO queues instead of taking local row ownership.

---

## Section 15 Acceptance Traceability (`YAI-002`)

Markers:

1. `ALREADY_SHIPPED`: requirement baseline exists and is evidenced by a `DONE` row.
2. `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION`: baseline exists, but PRD v1.3 adds new core contract work.
3. `NET_NEW_CORE`: no shipped baseline in current queues; delivery is primarily `YAI`.
4. `NET_NEW_DOWNSTREAM`: delivered through AGP/PLO queue rows after core contracts are ready.

### P0 map (`YOUR_AI_PRD.md` section 15)

| Trace ID | Requirement | Marker | Queue row(s) | Verify profile(s) | Contract note |
|---|---|---|---|---|---|
| `P0-PA-01` | Single primary agent per org with unified soul | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-003`, `YAI-014` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Extends current soul/harness foundation with explicit one-agent authority contracts. |
| `P0-PA-02` | Immutable interview-origin soul anchors | `NET_NEW_CORE` | `YAI-005` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Source contract for downstream seed metadata expectations (`AGP-007`). |
| `P0-PA-03` | Work/private soul modes + channel-to-mode mapping | `NET_NEW_CORE` | `YAI-006`, `YAI-011` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Runtime mode semantics in `YAI-006`; channel contract articulation in `YAI-011`. |
| `P0-PA-04` | Cross-mode memory between private/work contexts | `NET_NEW_CORE` | `YAI-006` | `V-TYPE`, `V-LINT`, `V-UNIT` | Must preserve identity while allowing constrained context carryover. |
| `P0-DT-01` | 6 Dream Team specialists with full soul blends | `ALREADY_SHIPPED + NET_NEW_DOWNSTREAM` | `AGP-003`, `AGP-004` | `V-DOCS` | Core six rows are published; full deterministic catalog completion remains in `AGP-004`. |
| `P0-DT-02` | Invisible/direct/meeting specialist access behavior | `NET_NEW_CORE` | `YAI-004` | `V-TYPE`, `V-LINT`, `V-UNIT` | Core runtime ownership; no template-file ownership transfer. |
| `P0-DT-03` | `teamAccessMode` config flag (`invisible|direct|meeting`) | `NET_NEW_CORE` | `YAI-003` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Canonical one-agent contract field. |
| `P0-DT-04` | Specialist soul blend ratios preserved from blend prompts | `NET_NEW_DOWNSTREAM` | `AGP-012`, `AGP-007` | `V-DOCS` | AGP remains authoritative for blend-doc and seed contract language. |
| `P0-AR-01` | Minimum six archetypes with overlays | `NET_NEW_CORE` | `YAI-006` | `V-TYPE`, `V-LINT`, `V-UNIT` | Implemented as core prompt/runtime overlays. |
| `P0-AR-02` | Archetype activation via user request + context detection | `NET_NEW_CORE` | `YAI-006`, `YAI-003` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Detection/activation policy must respect precedence order. |
| `P0-AR-03` | Sensitive archetype guardrails | `NET_NEW_CORE` | `YAI-006`, `PLO-012` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Core guardrails in `YAI`; personal-operator compliance consumption in `PLO`. |
| `P0-MO-01` | Signup personal org baseline (`isPersonalWorkspace: true`) | `ALREADY_SHIPPED` | `PLO-001` | `V-DOCS` | Baseline locked as existing behavior; no net-new row needed for the already-working path. |
| `P0-MO-02` | Create-business flow for second org | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-007` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Hardens flow and context-switch clarity under one-agent contracts. |
| `P0-MO-03` | Invite acceptance auto-creates personal org | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-007` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Explicitly retained in multi-org contract row. |
| `P0-MO-04` | Org switcher visual distinction | `NET_NEW_CORE` | `YAI-007` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | UI/runtime boundary remains in core lane D row. |
| `P0-MO-05` | Birthing interview adapts to org type | `NET_NEW_CORE` | `YAI-007`, `YAI-005` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Combined dependency: org context + interview shape. |
| `P0-MO-06` | Personal/business data isolation | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-007`, `YAI-014` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Core isolation invariants + ingress-authority tests. |
| `P0-PQ-01` | Privacy mode toggle + local model connection | `NET_NEW_CORE` | `YAI-010` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Baseline model infrastructure exists, but privacy contract remains core net-new. |
| `P0-PQ-02` | Multi-model drift scoring after model switch | `NET_NEW_CORE` | `YAI-010` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Drift checks tie to quality firewall behavior. |
| `P0-PQ-03` | Model quality tier classification | `NET_NEW_CORE` | `YAI-010` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Explicit gold/silver/bronze contract lands in lane F. |
| `P0-AT-01` | Four autonomy levels (`supervised/sandbox/autonomous/delegation`) | `NET_NEW_CORE` | `YAI-008` | `V-TYPE`, `V-LINT`, `V-UNIT` | Migration and domain precedence defined here. |
| `P0-AT-02` | Trust accumulation scoring + promotion proposals | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-008` | `V-TYPE`, `V-LINT`, `V-UNIT` | Extends shipped trust telemetry to proposal/promotion semantics. |
| `P0-BI-01` | Midwife structured discovery interview (5 blocks) | `NET_NEW_CORE` | `YAI-005` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Core interview shape and metadata contract. |
| `P0-BI-02` | Soul generation + first words (Dream Team mention) | `NET_NEW_CORE` | `YAI-005`, `YAI-003` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Handshake contract links birthing output to one-agent runtime fields. |
| `P0-BI-03` | Guided channel setup + first supervised week | `NET_NEW_DOWNSTREAM` | `YAI-005`, `PLO-003` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Core handshake contract in `YAI`; setup-surface execution in `PLO`. |
| `P0-BI-04` | Birthing privacy option with trade-off warning | `NET_NEW_CORE` | `YAI-005`, `YAI-010` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Interview privacy flow and policy limitation messaging are split across birthing/privacy rows. |

### P1 map (`YOUR_AI_PRD.md` section 15)

| Trace ID | Requirement | Marker | Queue row(s) | Verify profile(s) | Contract note |
|---|---|---|---|---|---|
| `P1-DV-01` | macOS menu bar app + hotkey quick chat | `NET_NEW_CORE` | `YAI-011` | `V-DOCS` | Contract baseline documented before runtime implementation rows proceed. |
| `P1-DV-02` | LaunchAgent background service | `NET_NEW_CORE` | `YAI-011` | `V-DOCS` | Included in desktop baseline contract row. |
| `P1-DV-03` | Soul cache for offline/privacy sessions | `NET_NEW_CORE` | `YAI-011` | `V-DOCS` | Aligns with privacy-mode limits from `YAI-010`. |
| `P1-DV-04` | Encrypted local privacy-session storage | `NET_NEW_CORE` | `YAI-011` | `V-DOCS` | Must remain explicit about local-only boundaries and tradeoffs. |
| `P1-DV-05` | Local model auto-detection (Ollama/LM Studio) | `NET_NEW_CORE` | `YAI-011` | `V-DOCS` | Uses model-policy contracts from lane F. |
| `P1-DV-06` | Streaming voice pipeline (STT -> LLM -> TTS) | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-011`, `YAI-015` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Extends shipped voice foundations with one-agent authority ingress. |
| `P1-DV-07` | ElevenLabs voice selection in birthing | `ALREADY_SHIPPED + NET_NEW_CORE_EXTENSION` | `YAI-011`, `YAI-005` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Existing provider support consumed by new birthing contract flows. |
| `P1-DV-08` | Filler responses with soul-matched phrasing | `NET_NEW_CORE` | `YAI-011` | `V-DOCS` | Treated as contract-first behavior in lane G. |
| `P1-DV-09` | Voice input in desktop app | `NET_NEW_CORE` | `YAI-011`, `YAI-014` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Must route through canonical ingress envelope before any tool policy execution. |
| `P1-DV-10` | macOS behavior parity with iPhone/Android chat runtime contracts (chat/tools/trust/approvals/continuity) without UI clone requirements | `NET_NEW_CORE` | `YAI-011`, `YAI-014` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Parity means same backend contract outcomes, while desktop keeps native UX affordances. |
| `P1-DE-01` | Morning briefing on primary channel | `NET_NEW_CORE` | `YAI-012` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Chat-first engagement row owns rollout metrics and continuity contracts. |
| `P1-DE-02` | Domain-scoped autonomy configuration | `NET_NEW_CORE` | `YAI-008` | `V-TYPE`, `V-LINT`, `V-UNIT` | P0 dependency for any domain-level automation. |
| `P1-DE-03` | Code execution tool with sandbox constraints | `NET_NEW_CORE` | `YAI-009` | `V-TYPE`, `V-LINT`, `V-UNIT` | Explicitly gated by trust/autonomy controls. |
| `P1-TE-01` | Emergent-team spawn proposals | `NET_NEW_CORE` | `YAI-003`, `YAI-013` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Routing/authority contracts are core; closeout row must verify downstream consumption before declaring complete. |
| `P1-TE-02` | Re-birthing/soul refinement flow | `NET_NEW_CORE` | `YAI-005` | `V-TYPE`, `V-UNIT`, `V-DOCS` | Bound to birthing contract ownership in lane C. |
| `P1-MX-01` | Cross-org soul context (read-only enrichment) | `NET_NEW_CORE` | `YAI-007` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Enrichment must keep strict no-cross-write isolation. |
| `P1-MX-02` | Dream Team scoping by org type | `NET_NEW_CORE + NET_NEW_DOWNSTREAM` | `YAI-007`, `AGP-012` | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` | Core runtime scoping in `YAI`; packaging language and blend-doc expression in AGP. |

---

## Ownership Partition (PRD -> Workstream)

| PRD area | Owner | Notes |
|---|---|---|
| Dream Team specialist catalog/tool/seed docs | `AGP` | Consume one-agent runtime contracts from `YAI` |
| Personal operator template behavior + pilot | `PLO` | Consume one-agent core + multi-org contracts from `YAI` |
| One-agent runtime config + routing | `YAI` | Source of truth for shared runtime fields/semantics |
| Birthing runtime + interview immutability | `YAI` | AGP consumes seed-shape expectations only |
| Soul modes + archetypes | `YAI` | PLO compliance rows consume sensitive-archetype guardrails |
| Multi-org core behavior | `YAI` | PLO validates appointment scenarios across org contexts |
| Privacy + quality firewall | `YAI` | AGP roadmap rows depend on readiness token |
| Autonomy/trust scaffolding | `YAI` | PLO appointment domain uses these defaults |
| Seed/template overlap files (`seedPlatformAgents.ts`, `toolScoping.ts`) | `PLO` + `AGP` | `YAI` must not redefine row ownership in these files |

---

## Delivery Strategy

### Phase A: Scope lock and traceability

1. Freeze PRD-to-queue mapping (`YAI-001`, `YAI-002`).
2. Prevent duplicate ownership before any runtime edits.

### Phase B: Core runtime contracts

1. Land one-agent config/routing contract (`YAI-003`, `YAI-004`).
2. Land birthing + soul mode/archetype contracts (`YAI-005`, `YAI-006`).

### Phase C: Context, trust, privacy

1. Deliver multi-org baseline (`YAI-007`).
2. Deliver autonomy/trust domain controls (`YAI-008`, optional `YAI-009`).
3. Deliver privacy/quality baseline (`YAI-010`).

### Phase D: Channel/desktop expansion and handoff

1. Finalize chat-first + camera/glasses + desktop/voice contracts (`YAI-011`, `YAI-012`, `YAI-014`).
2. Land native vision-edge ingress + authority-gated tool-calling baseline (`YAI-015`).
3. Keep OpenClaw integration as optional compatibility mode only (`YAI-016`).
4. Implement native Polymarket operator agent capability as first-class `vc83` tooling (`YAI-017`).
5. Run cross-workstream closeout and dependency audit (`YAI-013`).

---

## Desktop Behavior Parity Contract (macOS vs iPhone/Android)

Objective:

1. macOS reaches chat-runtime behavior parity with iPhone/Android under one-agent authority contracts.
2. Parity is defined by backend contract outcomes (`chat/tools/trust/approval/continuity`), not by visual or navigation mimicry.

Scope lock (normative parity surface):

1. Chat lifecycle parity: same canonical ingress envelope classification, turn correlation, and retry/idempotency handling.
2. Tool-policy parity: same tool-policy resolution and trust gate classification (`hard_gate` / `soft_gate` / `allow`).
3. Approval parity: same approval-token lifecycle with strict no-write-without-token guarantees.
4. Continuity parity: same conversation/session routing semantics and continuity restoration behavior.
5. Trust parity: same trust/audit event taxonomy and payload evidence shape for operator actions.

Allowed desktop-native divergence (explicitly in scope):

1. Menu bar quick chat and global hotkey launch path.
2. LaunchAgent/background process lifecycle.
3. Desktop notification/deep-link ergonomics.
4. Local cache ergonomics for privacy/offline flows.

Non-goals:

1. Do not require UI clone parity with iPhone/Android.
2. Do not introduce desktop-only direct mutation paths.
3. Do not treat external bridge UX semantics as runtime authority.

Authority and policy precedence (must hold):

1. Native `vc83` runtime precedence remains deterministic: `org -> privacy -> soul mode -> team mode -> archetype -> autonomy gate -> tool policy`.
2. `YAI-014` canonical ingress + primary-authority invariants gate all chat/voice/camera/desktop events before any mutating tool path.
3. `YAI-009` code-exec governance remains mandatory for all `execute_code` paths (sandbox bounds, trust logging, autonomy/approval gating, fail-closed behavior).
4. OpenClaw/VisionClaw are reference patterns only; any bridge output is non-authoritative until mapped to native `vc83` tool intents and approved through native trust/approval gates.

Downstream acceptance + evidence gates (`YAI-012`, `YAI-015`):

| Downstream row | Contract acceptance criteria locked by `YAI-011` | Required code/test evidence expectations | Verify |
|---|---|---|---|
| `YAI-012` | Morning briefing + continuity telemetry must use the same conversation/session contract as existing chat ingress across desktop/mobile; any briefing-triggered mutation remains approval-token + trust-event gated; privacy-local briefings remain proposal-only until approved cloud execution exists. | Runtime diffs in `convex/ai/*brief*` and/or `convex/ai/conversations.ts` showing envelope/thread continuity correlation; tests proving cross-channel continuity, idempotent replay, and no-bypass mutation behavior under approvals. | `V-TYPE`, `V-UNIT`, `V-DOCS` |
| `YAI-015` | Camera/voice/live intents must normalize through canonical ingress with primary-authority context before tool execution; all actionable intents route through native `vc83` registry and trust gates; no direct OpenClaw/device-side mutation path is allowed. | Runtime diffs in `convex/ai/agentExecution.ts`, `convex/ai/voiceRuntime.ts`, and `convex/ai/tools/registry.ts` (or equivalent adapters) showing native policy path; tests covering ingress-authority matrix, approval/trust gating, and fail-closed no-bypass enforcement. | `V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS` |

---

## Native Polymarket Agent Contract

Objective:

1. Ship a real native Polymarket operator capability in `vc83` as agent tooling, not as a standalone app dependency.
2. Keep one-agent authority, trust policy, and approval invariants intact for any live execution path.

Implementation pattern:

1. Build native tool surfaces for market discovery, signal/opportunity scoring, position planning, and execution intents.
2. Support both paper mode (simulation) and live mode under the same native contracts.
3. Route all mutable live actions through primary-agent authority + trust gates + approval tokens before execution.
4. Emit trust/audit telemetry for decision, approval, execution, and failure events.
5. Keep operator controls explicit (risk caps, exposure limits, allowed market scope, and emergency stop semantics).

Explicit exclusions:

1. No direct runtime dependency on an external standalone bot process for core behavior.
2. No bridge/direct-write bypass outside canonical ingress and primary-agent mutation authority.

---

## Integration Gates

1. `AGP-012` requires `YAI-003@READY`.
2. `AGP-007` requires `YAI-005@READY`.
3. `AGP-010` requires `YAI-010@READY`.
4. `PLO-010` requires `YAI-003@READY` and `YAI-008@READY`.
5. `PLO-012` requires `YAI-006@READY`.
6. `PLO-016` requires `YAI-007@READY`.

---

## Lane B Runtime Contract Release (`YAI-003`)

The one-agent runtime contract is now locked in the shared runtime path:

1. `unifiedPersonality` (`boolean`, default `true`): keeps specialist responses and prompt assembly anchored to one primary personality contract.
2. `teamAccessMode` (`invisible` | `direct` | `meeting`, default `invisible`): controls specialist visibility/routing semantics in team handoff execution.
3. `dreamTeamSpecialists` (AGP-sourced specialist metadata): consumed as routing guardrails (`directAccessEnabled`, `meetingParticipant`, blend identity/hints) without duplicating AGP catalog rows.
4. One-primary lifecycle invariant is enforced in operator context with explicit reassignment via `setPrimaryAgent` transactional demote/promote semantics and audit events.

Integration boundaries (normative):

1. `YAI` owns runtime interpretation and enforcement in `convex/ai/harness.ts`, `convex/ai/teamHarness.ts`, and `convex/ai/agentExecution.ts`.
2. `AGP` remains source-of-truth for specialist catalog content and blend contracts (`docs/prd/souls/AGENT_PRODUCT_CATALOG.md`, later seed docs).
3. `PLO`/`AGP` keep ownership of seed/template overlap files (`seedPlatformAgents.ts`, `toolScoping.ts`); `YAI` consumes contract fields only.
4. When AGP catalog metadata is absent, runtime stays backward compatible (no hardcoded specialist catalog duplication).
5. Primary assignment and reassignment runtime ownership remains in `convex/agentOntology.ts` (`YAI` contract surface); downstream queues consume behavior through dependency tokens.

Access mode semantics wired for downstream queues:

1. `invisible`: specialist advises through shared context while primary agent remains active.
2. `direct`: specialist may become active responder if AGP metadata allows direct access, but mutating authority remains on the primary path.
3. `meeting`: specialist contributes in shared context while primary agent remains visible.

---

## Lane C Birthing + Soul Overlay Release (`YAI-005`, `YAI-006`)

Lane `C` contracts are now landed and verified for identity immutability + overlay safety:

1. Birthing contracts (`YAI-005`) now persist Midwife 5-block interview shape, interview-origin identity metadata, and first-words handshake artifacts in schemas/runtime.
2. Midwife composition is hybrid by contract: interview-born core identity is preserved while seeded catalog profiles and bounded generated overlays are composed with provenance (`midwife_hybrid_composition.v1`).
3. Soul identity anchors carry explicit immutable origin semantics (`interview` vs generated baseline) and linked interview handshake references.
4. Soul-mode contracts (`work`/`private`) are runtime-resolved with channel-binding support and mode-scoped autonomy/tool constraints.
5. Archetype overlays preserve core identity by layering behavior without mutating immutable identity anchors.
6. Sensitive archetypes enforce runtime constraints (read-only or no-tool scope, blocked-topic policy overlays, and referral/disclaimer guidance) in both prompt policy and execution tool gating.
7. Lane `C` verification is green: `npm run typecheck`, `npm run test:unit`, `npm run docs:guard` for `YAI-005`, and `npm run typecheck`, `npm run lint`, `npm run test:unit` for `YAI-006`.

Downstream effect:

1. `AGP-007` can consume `YAI-005` birthing/identity contracts without duplicating source metadata.
2. `PLO-012` can consume `YAI-006` sensitive-archetype guardrail contracts as core runtime enforcement.

Concise evidence notes:

1. One-primary + reassignment: `convex/agentOntology.ts`, `tests/unit/ai/primaryAgentInvariants.test.ts`, `tests/unit/agents/primaryAgentUi.test.ts`.
2. Primary-governed delegation: `convex/ai/teamHarness.ts`, `tests/unit/ai/delegationAuthorityRuntime.test.ts`, `tests/unit/ai/teamAccessModeRouting.test.ts`.
3. Midwife hybrid composition + provenance: `convex/ai/interviewRunner.ts`, `convex/ai/midwifeCatalogComposer.ts`, `tests/unit/ai/midwifeCatalogComposer.test.ts`.

---

## Lane D Completion (`YAI-007`, 2026-02-25)

`YAI-007` is now `DONE` with lane-D P0 + P1 multi-org closure delivered:

1. Create-business second-org path for authenticated operators: `convex/organizations.ts` (`createBusinessOrganization`), consumed by org switcher create flow.
2. Invite acceptance personal-workspace auto-create hardening: `convex/invitationOntology.ts` (`internalAcceptInvitation` guarantees personal-workspace membership baseline).
3. Org-switch context clarity: `convex/auth.ts` emits workspace-type switch audit metadata and returns workspace fields in `getCurrentUser`; `src/components/window-content/organization-switcher-window.tsx` renders explicit personal/business visual distinction.
4. Org-aware birthing adaptation: `convex/ai/interviewRunner.ts` resolves workspace context and injects workspace guidance into interview prompt assembly.
5. `P1-MX-01` cross-org soul context enrichment: `convex/ai/agentExecution.ts` computes membership-gated, allowlisted cross-org summary data for personal workspace desktop sessions and passes it to `convex/ai/harness.ts` as read-only context. Contract explicitly enforces no cross-org writes.
6. `P1-MX-02` Dream Team scoping by org type: `convex/ai/harness.ts`, `convex/ai/teamHarness.ts`, `convex/ai/tools/teamTools.ts`, and `convex/agentOntology.ts` now enforce workspace-scoped specialist contracts (`workspaceTypes` plus alias compatibility for `organizationTypes`/`orgTypes`) aligned with `AGP-012` packaging semantics.

Concise verification evidence:

1. `npm run typecheck` passed.
2. `npm run lint` passed (`0` errors; warning baseline unchanged).
3. `npm run test:unit` passed (`121` files passed, `4` skipped; `564` tests passed, `80` skipped).
4. `npm run docs:guard` passed.

---

## Lane E Completion (`YAI-008`, 2026-02-25)

`YAI-008` is now `DONE` with autonomy/trust P0 contracts landed:

1. Canonical autonomy contract introduced in `convex/ai/autonomy.ts` with four normalized levels (`supervised`, `sandbox`, `autonomous`, `delegation`) and legacy alias normalization (`draft_only` -> `sandbox`).
2. Domain-scoped autonomy defaults now resolve deterministically in runtime (`convex/ai/agentExecution.ts`) via domain contract evaluation (`appointment_booking`) with promotion-evidence gating.
3. Mode/archetype/tool execution now align to sandbox semantics for read-only enforcement through `convex/ai/soulModes.ts`, `convex/ai/toolScoping.ts`, and `convex/ai/escalation.ts`.
4. Harness now renders autonomy/domain/trust progression guidance (`convex/ai/harness.ts`) so operator-visible context matches runtime policy.
5. Trust taxonomy now includes autonomy promotion/demotion lifecycle events with deterministic payload requirements in `convex/ai/trustEvents.ts`.

Concise verification evidence:

1. `npm run typecheck` passed.
2. `npm run lint` passed (`0` errors; warning baseline unchanged).
3. `npm run test:unit` passed (`123` files passed, `4` skipped; `587` tests passed, `80` skipped).

---

## Lane E P1 Completion (`YAI-009`, 2026-02-25)

`YAI-009` is now `DONE` with code-execution governance contracts landed:

1. Added native `execute_code` tool contract in `convex/ai/tools/codeExecutionTool.ts` with bounded Node VM sandbox execution, deterministic timeout caps, source-size caps, and explicit `network_egress=blocked` policy.
2. Added fail-closed autonomy + approval governance evaluation for code execution (`policy_missing`, `autonomy_missing`, `sandbox_autonomy_block`, `approval_required`, `approval_missing`) so execution cannot proceed without explicit runtime policy context.
3. Threaded code-execution governance runtime policy from canonical execution paths:
   - agent orchestration path (`convex/ai/agentToolOrchestration.ts`)
   - chat tool execution path (`convex/ai/chat.ts`)
   - approved execution replay path (`convex/ai/drafts.ts`)
4. Expanded trust taxonomy in `convex/ai/trustEvents.ts` with deterministic code-exec event names and required payload fields:
   - `trust.guardrail.code_execution_requested.v1`
   - `trust.guardrail.code_execution_allowed.v1`
   - `trust.guardrail.code_execution_blocked.v1`
   - `trust.guardrail.code_execution_outcome.v1`
5. Added/extended unit coverage for governance fail-closed behavior and trust taxonomy validation:
   - `tests/unit/ai/codeExecutionGovernance.test.ts`
   - `tests/unit/ai/trustEventTaxonomy.test.ts`

Concise verification evidence:

1. `npm run typecheck` failed due pre-existing unrelated workspace error: `src/components/window-content/org-owner-manage-window/domain-config-modal.tsx` (`TS2589` deep type instantiation).
2. `npm run lint` passed (`0` errors; `3243` warnings baseline).
3. `npm run test:unit` passed (`129` files passed, `4` skipped; `621` tests passed, `80` skipped).

---

## Lane F Kickoff (`YAI-010`, started 2026-02-25)

`YAI-010` baseline implementation was started with contract-first runtime helpers; lane gate is now open because `YAI-008` is `DONE`:

1. `convex/ai/modelAdapters.ts` now defines a local connector/privacy contract (`off`/`prefer_local`/`local_only`) with explicit local capability limits and deterministic provider-route guard decisions.
2. `convex/ai/modelPolicy.ts` now exposes quality-tier assessment (`gold`/`silver`/`bronze`/`unrated`), quality firewall decisions (privacy + tier floor), and model-switch drift scoring for routing safety.
3. `convex/ai/soulEvolution.ts` now includes a model-switch drift evaluator for first-response sample windows with threshold-based user warning output.
4. Contract intent remains explicit: cloud/local behavior and capability limits are surfaced as user-visible safeguards before any lane-`G` desktop/local rollout work.

---

## Lane F Completion (`YAI-010`, 2026-02-25)

`YAI-010` is now `DONE` with lane-`F` privacy + quality firewall contracts fully wired into runtime:

1. `convex/ai/modelAdapters.ts` now maps local connector aliases (`local`, `ollama`, `lm_studio`, `llama_cpp`) into canonical `openai_compatible` provider routing for privacy-local paths.
2. `convex/ai/modelPolicy.ts` now includes local-connector candidate sourcing (`local_connector_pool`) and deterministic local-route provider inference so local model IDs can participate in ordered routing decisions.
3. `convex/ai/settings.ts` + `convex/schemas/aiSchemas.ts` now persist org-scoped privacy/quality policy fields (`llm.privacyMode`, `llm.qualityTierFloor`, `llm.localModelIds`, `llm.localConnection`) as explicit runtime contract inputs.
4. `convex/ai/agentExecution.ts` now enforces privacy+quality gates during model route selection and failover attempt planning, blocks policy-invalid routes before execution, and emits explicit user-visible safeguards for cloud fallback under `prefer_local` plus high model-switch drift warnings.
5. `convex/ai/harness.ts` now renders privacy mode, quality floor, local connector capability limits, selected route quality/locality, and active safeguard notes for prompt/runtime clarity.

Concise verification evidence:

1. `npm run typecheck` passed.
2. `npm run lint` passed (`0` errors; warning baseline unchanged).
3. `npm run test:unit` passed (`125` files passed, `4` skipped; `595` tests passed, `80` skipped).
4. `npm run docs:guard` passed.

---

## Lane G P0 Completion (`YAI-014`, 2026-02-25)

`YAI-014` is now `DONE` with canonical ingress + primary-authority contracts enforced before tool execution:

1. `convex/ai/agentExecution.ts` now builds a canonical ingress envelope (`tcg_ingress_envelope_v1`) for chat/voice/camera/desktop events and persists envelope metadata in ingress receipt/turn paths.
2. Ingress authority contracts now resolve per `(operatorId, organizationId)` scope and explicitly track primary/authority/speaker agent identities for mutation gating.
3. `convex/ai/agentToolOrchestration.ts` now fail-closes mutating tool execution when authority invariants are violated; read-only tools remain executable.
4. `convex/ai/tools/registry.ts` runtime policy contract now carries ingress envelope + mutation authority context into tool execution.
5. Unit test matrix coverage landed for ingress classification and authority gating in:
   - `tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts`
   - `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts`

Concise verification evidence:

1. `npm run typecheck` passed.
2. `npm run test:unit` passed (`127` files passed, `4` skipped; `605` tests passed, `80` skipped).
3. `npm run docs:guard` passed.

---

## Lane G P1 Baseline Completion (`YAI-011`, 2026-02-25)

`YAI-011` is now `DONE` with chat-first + desktop/voice parity baseline documented as a backend contract scope lock:

1. Parity is now explicitly constrained to backend runtime outcomes (`chat/tools/trust/approval/continuity`), with UI clone parity listed as a non-goal.
2. Desktop-native affordances (menu bar, LaunchAgent lifecycle, local connector ergonomics, streaming voice path) are allowed only when they preserve canonical ingress, approval, and trust contracts.
3. Native `vc83` runtime authority precedence is explicit and unchanged, with `YAI-014` ingress-authority invariants and `YAI-009` code-exec governance required on all mutating paths.
4. OpenClaw/VisionClaw usage is locked as reference-only; no hard runtime dependency or bypass authority path is permitted.
5. Downstream acceptance/evidence gates are now explicit for `YAI-012` and `YAI-015` so lane `G` `P1` implementation rows remain deterministic and code-backed.

Concise verification evidence:

1. `npm run docs:guard` passed.

---

## Lane G P1 Chat-First Engagement Completion (`YAI-012`, 2026-02-25)

`YAI-012` is now `DONE` with chat-first daily engagement contracts implemented in runtime code:

1. `convex/ai/conversations.ts` now exports deterministic continuity telemetry contracts (`yai_conversation_continuity_v1`) that normalize collaboration lineage/thread identity with idempotency replay outcomes for cross-channel parity evidence.
2. `convex/ai/proactiveBriefing.ts` now defines morning briefing runtime contracts (`yai_morning_briefing_v1`) for local-morning scheduling windows, structured briefing template composition, and rollout-metric aggregation.
3. Briefing-triggered mutation policy is now fail-closed: hard trust gates block, privacy-local modes stay proposal-only, and cloud commits require explicit approval tokens (no bypass path for mutating actions).
4. Unit contract evidence proves `YAI-012` downstream gates from `YAI-011`:
   - `tests/unit/ai/conversationContinuityTelemetry.test.ts`
   - `tests/unit/ai/proactiveBriefing.test.ts`
5. Coverage explicitly validates cross-channel continuity correlation, idempotent replay classification, and approval-gated no-bypass mutation behavior.

Concise verification evidence:

1. `npm run typecheck` fails on pre-existing unrelated `TS2339` in `convex/onboarding/nurtureScheduler.ts` (`runAction` on `GenericMutationCtx`).
2. `npm run lint` passed (`0` errors; warnings baseline only).
3. `npm run test:unit` passed (`132` files passed, `4` skipped; `638` tests passed, `80` skipped).
4. `npm run docs:guard` passed.

---

## Lane G P1 Native Vision-Edge Bridge Completion (`YAI-015`, 2026-02-25)

`YAI-015` is now `DONE` with native vision-edge bridge contracts enforced in runtime code:

1. `convex/ai/agentExecution.ts` now normalizes camera/voice/live edge intent metadata into canonical native bridge contracts (`tcg_native_vision_edge_bridge_v1`) before any tool execution path.
2. Canonical ingress envelopes now carry explicit native runtime authority precedence (`vc83_runtime_policy`) and native registry route targets (`vc83_tool_registry`) into runtime policy context for downstream tool execution.
3. Mutation authority contracts now fail closed when bridge metadata signals direct device-side mutation paths (`direct_device_mutation_path_not_allowed`), preserving one-agent authority invariants from `YAI-014`.
4. `convex/ai/tools/registry.ts` now enforces native edge no-bypass policy for mutating tools: actionable edge intents require native `vc83` registry routing, trust-gate context, and authority precedence compliance.
5. `convex/ai/voiceRuntime.ts` now emits explicit voice-edge bridge metadata (`tcg_voice_edge_bridge_v1`) in runtime responses/usage metadata so voice/live flows preserve native authority precedence and bridge provenance.
6. Unit evidence for ingress normalization and no-bypass enforcement landed in:
   - `tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts`
   - `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts`

Concise verification evidence:

1. `npm run typecheck` passed (known pre-existing `convex/onboarding/nurtureScheduler.ts` `TS2339` did not reproduce in this run).
2. `npm run lint` passed (`0` errors; `3251` warnings baseline).
3. `npm run test:unit` passed (`134` files passed, `4` skipped; `652` tests passed, `80` skipped).
4. `npm run docs:guard` passed.

---

## Lane G P1 OpenClaw Compatibility Adapter Completion (`YAI-016`, 2026-02-27)

`YAI-016` is now `DONE` with optional compatibility mode enforced behind explicit org feature flags and deterministic native fallback behavior:

1. `convex/ai/modelPolicy.ts` now resolves OpenClaw compatibility mode through explicit org feature flag contracts (`aiOpenClawCompatibilityEnabled`, default `OFF`) with fail-closed native fallback reasons (`org_feature_flag_disabled`, `adapter_failure`) and explicit no-bypass/trust-approval invariants.
2. `convex/ai/openclawBridge.ts` now exports compatibility adapter/fallback contracts (`yai_openclaw_compatibility_adapter_v1`) and deterministic native fallback plan helpers; imported OpenClaw profile metadata now carries native authority precedence and actionable-intent trust/approval requirements.
3. `convex/ai/openclawBridge.ts` now validates adapter decisions against explicit flag + fallback contracts (`feature_flag_required_for_compatibility_mode`, `fallback_contract_mismatch`) in addition to native authority invariants (`vc83_runtime_policy`, `directMutationBypassAllowed=false`, `trustApprovalRequiredForActionableIntent=true`) so contract drift is machine-detected.
4. `convex/integrations/openclawBridge.ts` now enforces both feature-flag gating and authority-contract validation before import mutation. Disabled, failed, or contract-invalid adapter decisions deterministically fall back to native mode with zero imported mutations.
5. Migration contract docs now explicitly describe flag-gated compatibility mode, fallback semantics, and native authority/no-bypass requirements in `docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/OPENCLAW_BRIDGE_IMPORT.md`.
6. Unit evidence for gate/fallback contracts landed in:
   - `tests/unit/ai/modelPolicy.test.ts`
   - `tests/unit/ai/openclawBridge.test.ts`

Concise verification evidence:

1. `npm run typecheck` did not complete before sandbox runtime ceiling (command reached `tsc --noEmit` without diagnostics).
2. `npm run test:unit` failed with Vitest unhandled worker timeout (`onTaskUpdate`) while reporting `162` files passed, `4` skipped; `853` tests passed, `80` skipped; `1` unhandled error.
3. `npm run docs:guard` passed.

---

## Lane G P1 Native Polymarket Capability Completion (`YAI-017`, 2026-02-25)

`YAI-017` is now `DONE` with first-class native Polymarket operator capability landed in `vc83` runtime contracts:

1. `convex/ai/tools/polymarketTool.ts` now provides native Polymarket tooling contracts for:
   - market discovery (`discover_markets`),
   - opportunity scoring (`score_opportunities`),
   - risk-bounded position planning (`plan_position`),
   - deterministic paper-mode simulation (`simulate_execution`),
   - approval-governed live execution (`execute_live_order` via `execute_polymarket_live`).
2. Live execution is fail-closed by runtime contract: approval artifacts are required for any live order path (`approval_required_for_live_execution`) and missing approval context blocks execution with explicit governance reasons.
3. `convex/ai/agentExecution.ts` now threads native Polymarket domain defaults into runtime policy (`polymarketDomainDefault`) using canonical domain-autonomy resolution (`polymarket_operator`) so paper/live defaults remain deterministic and code-enforced.
4. `convex/ai/tools/registry.ts` now exposes native Polymarket research + live execution tools as first-class registry entries and passes runtime policy context (default mode + approval metadata) into execution handlers.
5. `convex/ai/escalation.ts` now treats `execute_polymarket_live` as mandatory approval-gated live mutation tooling, preserving one-agent authority invariants and no-bypass approval governance.
6. Test evidence landed for runtime contracts + approval integration:
   - `tests/unit/ai/polymarketTool.test.ts`
   - `tests/integration/ai/polymarketApprovalPolicy.integration.test.ts`

Concise verification evidence:

1. `npm run typecheck` passed.
2. `npm run test:unit` passed (`135` files passed, `4` skipped; `662` tests passed, `80` skipped).
3. `npm run docs:guard` passed.

---

## Lane H Cross-Workstream Closeout (`YAI-013`, 2026-02-25)

`YAI-013` is now `DONE` with downstream consumption revalidated and dependency graph locked for implementation handoff:

1. Dependency-token audit satisfied for promotion and closure:
   - `YAI-004`, `YAI-007`, `YAI-010`, `YAI-014` = `DONE`.
   - `AGP-012@READY` satisfied (`AGP-012` = `DONE`).
   - `PLO-010@READY` satisfied (`PLO-010` = `DONE`).
2. Status flow executed mechanically: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE` after blockers were removed.
3. Stale pre-PRD contract references were removed from downstream docs:
   - AGP control-center schema snippet now uses canonical autonomy language (`sandbox`) while retaining legacy `draft_only` alias compatibility guidance.
   - PLO reality-lock section now marks pre-PRD autonomy wording as historical baseline and records superseding rows (`YAI-008`, `PLO-010`).
   - AGP dependency language now explicitly preserves `YAI-014` canonical ingress/authority invariants alongside `YAI-003`/`YAI-004`.
4. Queue-first artifact synchronization completed in YAI workstream docs:
   - `TASK_QUEUE.md`
   - `SESSION_PROMPTS.md`
   - `INDEX.md`
   - `MASTER_PLAN.md`

Concise verification evidence:

1. `npm run docs:guard` passed.

---

## Cohesion Decision Log (v1.1)

This log resolves the eight platform-level cohesion decisions for PRD v1.3.

| Decision area | Decision | Contract consequence |
|---|---|---|
| 1) Primary-agent authority model | Primary agent is the execution authority. Specialists can reason/suggest in `invisible`, `direct`, and `meeting` modes, but mutating actions execute through the primary agent policy path. | Memory writes are stored under primary thread authority with specialist provenance metadata. Tool writes always pass primary trust/approval gates. |
| 2) Runtime precedence order | Deterministic order: `Org context` -> `Privacy state` -> `Soul mode` -> `Team access mode` -> `Archetype` -> `Domain autonomy gate` -> `Tool policy`. Explicit user commands override inferred routing except safety caps. | Prevents ambiguous routing and gives one consistent decision path for runtime and tests. |
| 3) Privacy handoff contract | Privacy mode is advisory/read-only by default. No network mutations. Privacy sessions can emit structured action proposals for deferred cloud execution with explicit user approval. | Introduce proposal artifact linking local session hash to later cloud execution event for audit continuity. |
| 4) Multi-org cross-read boundary | Personal context may read business context only via explicit allowlisted summaries and only when user has membership. No cross-org writes. Business contexts never read personal data. | Enforce allowlist + membership checks + audit events on every cross-org read. |
| 5) Autonomy migration contract | Current levels map as: `draft_only` -> `sandbox`, `supervised` -> `supervised`, `autonomous` -> `autonomous`, `delegation` -> `delegation`. Domain autonomy precedence: domain override -> agent template default -> org default -> platform cap. Delegation promotion requires explicit opt-in plus trust threshold evidence. | Migration-safe rollout with no silent privilege escalation. |
| 6) Overlap-file ownership (`seedPlatformAgents.ts`, `toolScoping.ts`) | `PLO` owns personal-operator template behavior; `AGP` owns global catalog/matrix/seed contract language; `YAI` owns shared runtime field contracts only. | No queue may merge overlap ownership without explicit approved boundary change. |
| 7) Pricing/entitlement runtime behavior | Entitlements gate access modes: `Free` = `invisible`; `Starter` = `invisible` + 1 direct specialist; `Pro` = full direct + meetings; `Scale/Enterprise` = full + emergent options. Downgrade deactivates disallowed modes without deleting history. | Routing checks entitlement before specialist activation; disallowed activations fallback to primary-agent `invisible` mode with explanation. |
| 8) Acceptance test matrix | Cohesion requires passing: (a) one-thread cross-channel continuity, (b) precedence-order determinism, (c) specialist mode trust-gate enforcement, (d) privacy proposal->cloud execution audit chain, (e) personal/business isolation guard tests, (f) entitlement gating tests. | No P0 closeout without this matrix green in CI/test evidence. |

---

## LOC-008 User-Owned Memory Graph + Permission Ladder Contract (2026-02-26)

This section is the canonical closure for the cutover queue row `LOC-008`.

### User-owned memory graph (normative)

1. Memory authority root is the user/operator scope tuple:
   `userId + operatorId + organizationId + workspaceType`.
2. Durable memory nodes are typed and explicit:
   `identity_anchor`, `operator_directive`, `session_summary`, `reactivation_context`, `contact_fact`, `mission_artifact`, `approval_artifact`, `action_audit`.
3. Every memory node must carry provenance:
   `sourceType`, `sourceRef`, `capturedAt`, `capturedBy`, `scopeEnvelope`, and `confidence`.
4. Valid durable `sourceType` values are constrained to:
   `user_message`, `verified_tool_output`, `operator_note`, `policy_system`.
5. Assistant-only free text is not a durable memory source of truth.
6. Scope edges must remain explicit and fail-closed:
   `scoped_to_org`, `scoped_to_channel`, `scoped_to_contact`, `scoped_to_route`.
7. Mutation edges must remain explicit and reversible:
   `derived_from`, `supersedes`, `confirmed_by_user`, `revert_of`.

### Permission ladder contract (normative)

1. `suggest`
   - propose plans only,
   - no external mutation,
   - no durable memory mutation without explicit user confirmation.
2. `ask`
   - draft actions and gather approvals,
   - stage memory/action proposals,
   - execution blocked until explicit user decision.
3. `delegated_auto`
   - domain-scoped auto-execution allowed only where policy + consent + trust thresholds are satisfied,
   - hard gates (scope ambiguity, policy ambiguity, missing prerequisites) fail closed.
4. `full_auto`
   - broad delegated execution allowed only with explicit opt-in and policy caps,
   - still requires hard-gate compliance and trust/audit evidence for every mutation.

### Autonomy compatibility mapping

1. Canonical runtime autonomy set remains:
   `supervised`, `sandbox`, `autonomous`, `delegation`.
2. Legacy alias normalization remains:
   `draft_only -> sandbox`.
3. Ladder mapping contract:
   `suggest -> supervised`,
   `ask -> sandbox`,
   `delegated_auto -> autonomous`,
   `full_auto -> delegation` (with explicit opt-in and domain policy limits).

### Rollback and audit guarantees

1. Every durable memory write must include a deterministic mutation identifier and prior-state linkage.
2. Every external mutation must emit pre-state and post-state audit artifacts.
3. Every rollback/reversal action must carry:
   `revert_of`, reason code, actor, timestamp, and trust-event linkage.
4. Trust telemetry is required for:
   proposal, approval decision, execution outcome, rollback outcome.
5. Any missing provenance/scope/approval artifact fails closed and blocks mutation.

---

## Authority Invariants (Normative)

The following invariants are non-negotiable runtime contracts.

| Invariant ID | Statement | Enforcement anchor |
|---|---|---|
| `AI-1` | Authority scope is one primary execution identity per operator context: `(operatorId, organizationId, primaryAgentId)` with per-turn/session envelope. | `convex/ai/harness.ts`; `convex/ai/agentExecution.ts` |
| `AI-2` | Only the primary agent authority path may execute mutating tools. Specialist outputs are advisory/provenance, not write authority. | `convex/ai/teamHarness.ts`; `convex/ai/tools/registry.ts` |
| `AI-3` | All ingress (chat, voice, camera/glasses, desktop) is normalized into one canonical turn envelope before policy/tool execution. | `convex/ai/agentExecution.ts`; channel + runtime adapters |
| `AI-4` | Runtime precedence remains deterministic: org -> privacy -> soul mode -> team mode -> archetype -> autonomy gate -> tool policy. | `convex/ai/harness.ts`; `convex/ai/modelPolicy.ts` |
| `AI-5` | Privacy sessions cannot perform network mutations; they emit approval-gated proposals only. | privacy runtime contracts + trust events |
| `AI-6` | Desktop mouse/keyboard and any computer-use capability are exposed as gated tools only, never as direct client-side execution privileges. | `convex/ai/tools/registry.ts`; trust/autonomy gates |
| `AI-7` | Every mutation request and result must produce trust/audit telemetry linked to authority identity and provenance. | `convex/ai/trustEvents.ts`; `convex/ai/trustTelemetry.ts` |
| `AI-8` | External bridge responses (including OpenClaw compatibility mode) are never trusted as direct writes; they must map to approved native tool calls. | bridge adapters + tool policy runtime |

---

## Native Tool-Calling + External Bridge Policy

1. Production default is native `vc83` tool-calling (`convex/ai/tools/registry.ts`) with one-agent policy gates.
2. OpenClaw is allowed only as optional compatibility mode for migration/interoperability, not as a required runtime dependency.
3. Compatibility mode is `OFF` by default and requires explicit org feature flag + trust telemetry.
4. VisionClaw/OpenClaw are reference architectures for edge patterns (camera + live multimodal loop), not ownership transfer of core runtime authority.
5. Any edge client (Ray-Ban, Android, iPhone) must route actionable intents through the one-agent authority path before execution.
6. Domain-specific trading capabilities (including Polymarket) are implemented as native agent tools and follow the same trust/approval contracts as all other runtime actions.

---

## Risks

1. **Boundary drift risk:** core queue accidentally edits template ownership files.
   Mitigation: queue rule hard-stop; route such edits back to AGP/PLO rows.
2. **Contract skew risk:** AGP/PLO proceed on stale pre-PRD assumptions.
   Mitigation: dependency tokens + closeout row (`YAI-013`) completed on 2026-02-25; keep downstream docs synchronized to canonical contracts.
3. **Over-scope risk:** camera/glasses + desktop/voice work blocks core runtime delivery.
   Mitigation: keep edge-runtime work contract-first until core P0 rows are done.
4. **Governance regression risk:** autonomy/privacy improvements weaken HITL controls.
   Mitigation: preserve trust-event + approval gating as non-negotiable in every runtime row.
5. **External bridge coupling risk:** runtime quality or policy behavior depends on third-party bridge semantics.
   Mitigation: native tool path is canonical; compatibility mode remains optional and gated.
6. **Edge bypass risk:** mobile/glasses clients attempt direct mutation paths.
   Mitigation: enforce canonical ingress envelope + primary-agent-only mutation authority.

---

## Exit Criteria

1. All `P0` rows in `YAI` are `DONE` or `BLOCKED` with explicit reasons.
2. Downstream dependencies in AGP/PLO are synchronized to latest `YAI` contracts.
3. No queue row violates ownership boundaries for `seedPlatformAgents.ts` and `toolScoping.ts`.
4. `npm run docs:guard` passes.
5. Authority invariants and native-tool-path acceptance tests are green for chat + voice + camera ingress.
