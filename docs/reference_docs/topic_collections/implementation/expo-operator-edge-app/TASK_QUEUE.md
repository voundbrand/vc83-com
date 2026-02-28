# Expo Operator Edge App Task Queue

**Last updated:** 2026-02-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app`  
**Source request:** Create a handoff-ready implementation plan for Expo operator mobile runtime (phone camera/mic + optional glasses adapters) with understandable trust-gate UX and native-first tool execution.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane policy explicitly allows one active row per lane.
3. Promote from `PENDING` to `READY` only when dependency tokens are satisfied.
4. Deterministic pick order is `P0` before `P1` before `P2`, then lowest task ID.
5. If blocked, capture explicit unblock details in `Notes`.
6. Every row must run listed `Verify` commands before moving to `DONE`.
7. One-agent authority invariants are non-negotiable: mobile client is ingress/control only, not direct mutation authority.
8. Native `vc83` tool-calling is canonical; external bridge compatibility is optional and default `OFF`.
9. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` at lane milestones.
10. Dependency token rules:
    - `ID`: dependency must be `DONE` before this row can move `PENDING` -> `READY`.
    - `ID@READY`: dependency must be `READY` or `DONE` before this row can move `PENDING` -> `READY`.
    - `ID@DONE_GATE`: row may become `READY`/`IN_PROGRESS`, but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-E2E-MOBILE` | `npm run test:e2e:mobile` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Trust-gate + authority contract freeze | workstream docs and mobile-edge contract artifacts | No implementation lanes before lane `A` `P0` rows are `DONE` |
| `B` | Expo shell and session baseline | mobile app scaffold, auth/org context, chat continuity surfaces | Keep backend authority logic out of mobile layer |
| `C` | Capture adapters + realtime transport | phone camera/mic ingestion, streaming client, ingress payload shaping | Phone path ships first; glasses adapters can follow as optional |
| `D` | Trust UX and override controls | gate explanation cards, decision scopes, hard-stop UX | Keep non-overridable gates explicit and immutable in UI |
| `E` | Action execution and policy-safe routing | approval-token flows and action queue to backend tools | Native tool path first; external compatibility optional |
| `F` | Reliability + observability | offline queue, reconnect behavior, telemetry and incident hooks | Fail safely and preserve audit linkage |
| `G` | QA, rollout, and handoff | release criteria, runbooks, developer handoff package | Close only with full mobile verification and docs sync |

---

## Dependency-based status flow

1. Start with lane `A` (`EXPO-001`, `EXPO-002`).
2. Lane `B` starts after lane `A` `P0` rows are `DONE`.
3. Lane `C` starts after `EXPO-003` and `YAI-015@READY`.
4. Lane `D` starts after lane `C` `P0` rows are `DONE`.
5. Lane `E` starts after lane `D` `P0` rows are `DONE`.
6. Lane `F` starts after lane `E` `P0` rows are `DONE`.
7. Lane `G` starts after lane `F` `P0` rows are `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `EXPO-001` | `A` | 1 | `P0` | `DONE` | - | Publish operator trust-gate model (hard vs soft gates, override scopes, required plain-language copy contracts) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/MASTER_PLAN.md` | `V-DOCS` | DONE 2026-02-24: hard/soft gate semantics + override scopes frozen in `MASTER_PLAN.md`; `V-DOCS` passed. |
| `EXPO-002` | `A` | 1 | `P0` | `DONE` | `EXPO-001` | Freeze integration contract map for Expo edge events -> canonical backend ingress envelope -> trust/approval flow | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md` | `V-DOCS` | DONE 2026-02-24: backend ingress + approval contract assumptions frozen with explicit `YAI-014`/`YAI-015` dependencies; `V-DOCS` passed. |
| `EXPO-003` | `B` | 2 | `P0` | `BLOCKED` | `EXPO-002`, `YAI-014@READY` | Scaffold Expo app shell (auth, org selection, session handshake, chat continuity baseline) | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/*`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/MASTER_PLAN.md` | `V-TYPE`; `V-LINT`; `V-DOCS` | BLOCKED 2026-02-24: `YAI-014` remains `PENDING` in `your-ai-one-agent-core`; cannot promote to `READY` until dependency token is `READY`. |
| `EXPO-004` | `B` | 2 | `P1` | `PENDING` | `EXPO-003` | Build operator command workspace in app (chat, pending actions, tool-result feed, session state badges) | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/chat/*`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/session/*` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Keep parity with existing channel continuity semantics. |
| `EXPO-005` | `C` | 3 | `P0` | `PENDING` | `EXPO-003`, `YAI-015@READY` | Implement phone camera + mic adapters for Android/iPhone with frame/audio cadence controls and permission guards | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/capture/*`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app.json` | `V-TYPE`; `V-UNIT`; `V-E2E-MOBILE`; `V-DOCS` | Ship phone adapter first; glasses adapter remains additive. |
| `EXPO-006` | `C` | 3 | `P1` | `PENDING` | `EXPO-005` | Build realtime session transport (connect/reconnect, heartbeat, backpressure, transcript sync) | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/realtime/*` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Must fail safe on dropped connections. |
| `EXPO-007` | `C` | 3 | `P0` | `PENDING` | `EXPO-002`, `EXPO-006` | Enforce canonical ingress envelope mapping for chat/voice/camera events before backend processing | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/ingressEnvelope.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/*` | `V-TYPE`; `V-INTEG`; `V-DOCS` | App must never submit direct mutable tool invocations. |
| `EXPO-008` | `D` | 4 | `P0` | `PENDING` | `EXPO-007` | Implement trust-gate cards with plain-language explanations (request, reason, risk, next step, evidence) | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/trust/*` | `V-TYPE`; `V-UNIT`; `V-E2E-MOBILE`; `V-DOCS` | Must be understandable to non-technical operators. |
| `EXPO-009` | `D` | 4 | `P0` | `PENDING` | `EXPO-008` | Implement soft-gate override UX (`approve_once`, `session_allow`, `allow_1h_domain`) with explicit confirmation and reason capture | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/trust/overrideFlow/*`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/*` | `V-TYPE`; `V-UNIT`; `V-E2E-MOBILE`; `V-DOCS` | All decisions must emit auditable metadata. |
| `EXPO-010` | `D` | 4 | `P1` | `PENDING` | `EXPO-009` | Implement hard-gate UX (blocked action, escalation options, operator guidance) with no local bypass path | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/trust/hardGates/*` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Hard gates are non-overridable in app. |
| `EXPO-011` | `E` | 5 | `P0` | `PENDING` | `EXPO-009`, `YAI-014@DONE_GATE` | Ship approval-token action flow: app requests action -> backend policy check -> tokenized approval -> native tool execution -> result receipt | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/actions/*`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/*` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | No write-path execution without valid backend-issued approval token. |
| `EXPO-012` | `E` | 5 | `P1` | `PENDING` | `EXPO-011` | Add operator autonomy controls UI (domain-scoped defaults, expiry, and digest visibility) tied to backend trust policies | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/autonomy/*`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/*` | `V-TYPE`; `V-UNIT`; `V-DOCS` | UI controls are policy requests; backend remains policy authority. |
| `EXPO-013` | `E` | 5 | `P2` | `PENDING` | `EXPO-011`, `YAI-016@READY` | Add optional OpenClaw compatibility mode toggle with explicit warning copy, feature-flag gate, and fallback-to-native behavior | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/compatibility/*`; docs references | `V-TYPE`; `V-UNIT`; `V-DOCS` | Optional only; default `OFF`; never required for core app flow. |
| `EXPO-014` | `F` | 6 | `P0` | `PENDING` | `EXPO-011` | Implement mobile observability contract (ingress, gate decisions, approvals, execution outcomes, delivery failures) with correlation IDs | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/telemetry/*`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/*` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Must align with existing Agent Ops observability taxonomy. |
| `EXPO-015` | `F` | 6 | `P1` | `PENDING` | `EXPO-014` | Add offline queue + retry semantics for non-mutating interactions and safe retry policy for action requests | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/features/offline/*` | `V-TYPE`; `V-UNIT`; `V-E2E-MOBILE`; `V-DOCS` | Prevent duplicate action submissions via idempotency keys. |
| `EXPO-016` | `G` | 7 | `P0` | `PENDING` | `EXPO-014`, `EXPO-015` | Execute release QA matrix (permissions, network degradation, trust flows, cross-org context, camera/mic fidelity, fallback) and publish rollout criteria | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/MASTER_PLAN.md`; test evidence paths | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-E2E-MOBILE`; `V-DOCS` | Gate release on trust-flow clarity and policy compliance, not just transport success. |
| `EXPO-017` | `G` | 7 | `P0` | `PENDING` | `EXPO-016` | Closeout docs sync and handoff package for Expo team (architecture, API contracts, risk matrix, rollout/rollback runbook) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/*` | `V-DOCS` | Final handoff must include unresolved risks and escalation ownership map. |

---

## Current kickoff

- Active task: none.
- Lane `A` status: complete (`EXPO-001`, `EXPO-002` are `DONE`).
- Next promotable task: `EXPO-003` once dependency token `YAI-014@READY` is satisfied.
- Immediate objective: unblock lane `B` by advancing `YAI-014` to `READY`; then promote `EXPO-003` to `READY`.
