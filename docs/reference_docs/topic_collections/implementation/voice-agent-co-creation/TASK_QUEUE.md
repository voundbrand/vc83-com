# Voice Agent Co-Creation Task Queue

**Last updated:** 2026-02-18  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation`  
**Source request:** Build a personal, reusable voice-driven agent co-creation flow (Brain + interview + cross-app assistant) with trust-safe controls.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker details in row `Notes` and continue with next `READY` row.
6. Every task must include explicit verification commands before moving to `DONE`.
7. Keep lane ownership strict to reduce merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and this file after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-VOICE-LINT` | `npx eslint src/components/interview src/components/window-content/brain-window src/components/window-content/ai-chat-window src/components/window-content/all-apps-window.tsx src/components/taskbar convex/ai convex/integrations` |
| `V-VOICE-TEST` | `npx vitest run tests/unit/interview tests/unit/ai` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Baseline + trust-aligned voice co-creation contract | workstream docs + trust taxonomy references | No implementation lanes before `VAC-002` is `DONE` |
| `B` | Voice runtime/provider abstraction and settings | `convex/ai/*`; `convex/integrations/*`; voice runtime modules; settings hooks | Avoid interview copy/flow rewrites in lane `B` |
| `C` | Adaptive interview and save/discard consent UX | `src/components/interview/*`; `convex/ai/interviewRunner.ts` | Avoid shell/menu registration edits in lane `C` |
| `D` | Brain + shell IA integration | `src/app/page.tsx`; `src/hooks/window-registry.tsx`; `src/components/window-content/*` | No provider schema mutations in lane `D` |
| `E` | Reusable cross-app agent co-creation orchestration | shared assistant window/service + handoff flows | Keep trust schema backward compatible |
| `F` | KPI telemetry, thresholds, and rollout guardrails | analytics/trust modules + docs | Starts only after all `P0` rows are `DONE` or `BLOCKED` |
| `G` | Hardening and closeout docs/test pass | cross-cutting tests + docs | Run final docs guard before completion |

---

## Dependency-based status flow

1. Start with lane `A` (`VAC-001`..`VAC-003`).
2. Lane `B` starts after `VAC-002` is `DONE`.
3. Lane `C` starts after `VAC-002` and `VAC-004` are `DONE`.
4. Lane `D` starts after `VAC-007` is `DONE`.
5. Lane `E` starts after `VAC-009` and `VAC-011` are `DONE`.
6. Lane `F` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.
7. Lane `G` starts after `VAC-013` is `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `VAC-001` | `A` | 1 | `P0` | `READY` | - | Baseline audit: current Brain/interview/assistant voice capabilities, save/discard behavior, and trust contract fit gaps | `src/components/interview/*`; `src/components/window-content/brain-window/*`; `src/components/window-content/ai-chat-window/*`; `convex/ai/interviewRunner.ts`; trust docs | `V-DOCS` | Confirm upstream trust baseline from `ATX-014` before modifications. |
| `VAC-002` | `A` | 1 | `P0` | `PENDING` | `VAC-001` | Define voice co-creation contract (session states, save boundaries, consent checkpoints, artifact mapping, window IA) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/MASTER_PLAN.md`; relevant trust docs | `V-DOCS` | Contract must stay compatible with `trust-artifacts.v1` semantics. |
| `VAC-003` | `A` | 1 | `P1` | `PENDING` | `VAC-002` | Extend trust telemetry taxonomy for voice session lifecycle and adaptive-flow decisions | `convex/ai/trustEvents.ts`; telemetry modules; unit tests | `V-TYPE`; `V-LINT`; `V-UNIT` | Preserve deterministic event naming and payload validation. |
| `VAC-004` | `B` | 2 | `P0` | `PENDING` | `VAC-002` | Implement provider-agnostic voice runtime adapter (session open/close, STT/TTS transport, health status) | `convex/ai/*`; runtime adapters; `src/hooks/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT` | Keep provider concerns isolated behind one typed interface. |
| `VAC-005` | `B` | 2 | `P1` | `PENDING` | `VAC-004` | Add ElevenLabs provider integration path and provider health/test probes | `convex/integrations/*`; provider config modules; settings surfaces | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT` | Include explicit fallback behavior when provider fails. |
| `VAC-006` | `B` | 2 | `P1` | `PENDING` | `VAC-004` | Add user voice selection and preview controls (with deterministic persistence policy) | `src/components/interview/*`; settings windows; user preference hooks | `V-TYPE`; `V-LINT`; `V-VOICE-LINT`; `V-UNIT` | Keep default voice deterministic per org/user context. |
| `VAC-007` | `C` | 3 | `P0` | `PENDING` | `VAC-002`, `VAC-004` | Replace rigid interview framing with adaptive micro-session flow and progressive prompts | `src/components/interview/*`; `convex/ai/interviewRunner.ts`; seed templates | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT`; `V-VOICE-TEST` | Must preserve trust artifact completeness despite shorter sessions. |
| `VAC-008` | `C` | 3 | `P0` | `PENDING` | `VAC-007` | Implement explicit cancel/discard/resume UX, including discard confirmation and no-write guarantees | `src/components/interview/*`; `convex/ai/interviewRunner.ts`; persistence helpers | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT`; `V-VOICE-TEST` | No durable memory writes before explicit consent/save state. |
| `VAC-009` | `C` | 3 | `P1` | `PENDING` | `VAC-008` | Add voice-aware memory consent summaries and source attribution in adaptive session checkpoints | `src/components/interview/*`; `convex/ai/interviewRunner.ts`; trust artifact rendering | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT`; `V-VOICE-TEST` | Align consent semantics with ATX memory-gating behavior. |
| `VAC-010` | `D` | 4 | `P0` | `PENDING` | `VAC-007` | Ensure Brain voice entry exists in Product menu and All Apps with updated interior shell design contract | `src/app/page.tsx`; `src/components/window-content/all-apps-window.tsx`; `src/hooks/window-registry.tsx`; Brain UI files | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT` | Reuse shared interior primitives; no legacy Win95-only interior styling. |
| `VAC-011` | `D` | 4 | `P1` | `PENDING` | `VAC-010` | Create reusable voice assistant window/service contract for multi-app reuse | `src/components/window-content/ai-chat-window/*`; shell hooks/registry; shared runtime modules | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT` | Keep one voice session orchestration path; avoid per-window forks. |
| `VAC-012` | `E` | 5 | `P1` | `PENDING` | `VAC-009`, `VAC-011` | Implement ongoing agent co-creation loop from live voice sessions (`agent for this` orchestration + handoff) | interview + agents windows; handoff orchestrators; trust artifacts plumbing | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-VOICE-LINT`; `V-VOICE-TEST` | Must keep human-in-the-loop approvals and guardrails explicit. |
| `VAC-013` | `F` | 6 | `P0` | `PENDING` | `VAC-012` | Finalize voice trust KPI dashboard mappings, baselines, alert thresholds, and rollout gating logic | telemetry modules; unit tests; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/MASTER_PLAN.md` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Update KPI baseline values from observed pre-rollout data before launch. |
| `VAC-014` | `G` | 7 | `P1` | `PENDING` | `VAC-013` | Hardening and closeout: regression matrix, docs sync, final verification, and release checklist | workstream docs + affected UI/runtime modules | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Must re-run docs guard at closeout and resolve violations before marking `DONE`. |

---

## Current kickoff

- Active task: none.
- Next task to execute: `VAC-001`.
- Immediate objective: establish contract-safe baseline before implementation lanes start.
