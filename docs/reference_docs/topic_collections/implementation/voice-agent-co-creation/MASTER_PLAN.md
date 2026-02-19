# Voice Agent Co-Creation Master Plan

**Date:** 2026-02-18  
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
| `voice_session_start_rate` | `0.00` | `>=0.35` | `<0.25` | `<0.15` | `24h` | `hold` on warning, `rollback` on critical |
| `voice_session_completion_rate` | `0.00` | `>=0.70` | `<0.55` | `<0.45` | `24h` | `hold` on warning, `rollback` on critical |
| `voice_cancel_without_save_rate` | `0.00` | `<=0.30` | `>0.40` | `>0.55` | `24h` | investigate trust friction; `hold` if sustained |
| `voice_memory_consent_accept_rate` | `0.00` | `>=0.65` | `<0.50` | `<0.40` | `24h` | tighten consent UX copy, `hold` rollout |
| `voice_runtime_failure_rate` | `0.00` | `<=0.03` | `>0.06` | `>0.10` | `1h` | auto `hold` and failover path |
| `agent_creation_handoff_success_rate` | `0.00` | `>=0.80` | `<0.65` | `<0.50` | `24h` | `hold` and debug handoff mapping |

Notes:

- Baselines are initialized to `0.00` and must be replaced with observed pre-rollout values during `VAC-013`.
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

- Workstream created; queue initialized.
- Implementation not started.
- Execution starts in Lane `A` with `VAC-001` baseline audit.
