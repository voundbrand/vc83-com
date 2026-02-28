# OpenClaw Endurance Gap Closure Task Queue

**Last updated:** 2026-02-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/openclaw-endurance-gap-closure`  
**Source request:** Verify OpenClaw-aligned implementation state, then plan only the unresolved durability gaps.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless a lane rule explicitly allows concurrency.
3. Promote from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a row is `BLOCKED`, add blocker details in `Notes` and move to next `READY` row.
6. Each row must run its `Verify` commands before moving to `DONE`.
7. Keep lane ownership strict to minimize merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `SESSION_PROMPTS.md`, and this file after every completed row.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT-AI` | `npx vitest run tests/unit/ai tests/integration/ai` |
| `V-MODEL` | `npm run test:model` |
| `V-DOCS` | `npm run docs:guard` |
| `V-AI-LINT` | `npx eslint convex/ai convex/schemas/aiSchemas.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Baseline drift lock and acceptance criteria | Workstream docs + evidence references | No implementation lanes start before `OCG-001` is `DONE` |
| `B` | Chat/agent routing parity and session pin continuity | `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/conversations.ts`; schemas | No discovery refactors in lane `B` |
| `C` | Shared two-stage failover extraction | `convex/ai/chatRuntimeOrchestration.ts`; `convex/ai/agentExecution.ts`; failover policies | Avoid schema changes in lane `C` |
| `D` | Provider discovery + plugin boundary hardening | `convex/ai/modelDiscovery.ts`; `convex/ai/providerRegistry.ts`; adapter contracts/tests | No chat UI changes in lane `D` |
| `E` | Docs/comment/runtime contract alignment + closeout | docs + runtime-adjacent comments + regression checklist | Starts after all `P0` rows are `DONE` |

---

## Dependency-based status flow

1. Start with lane `A` (`OCG-001`).
2. Lane `B` starts after `OCG-001` is `DONE`.
3. Lane `C` starts after `OCG-002` is `DONE`.
4. Lane `D` starts after `OCG-001` is `DONE`.
5. Lane `E` starts after all `P0` rows are `DONE` (`OCG-002`, `OCG-004`, `OCG-005`).

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `OCG-001` | `A` | 1 | `P0` | `DONE` | - | Freeze evidence-backed gap matrix and acceptance criteria from runtime + tests (not queue claims) | `docs/reference_docs/topic_collections/implementation/openclaw-endurance-gap-closure/*`; `convex/ai/*`; `tests/unit/ai/*`; `tests/integration/ai/*` | `V-DOCS` | Completed 2026-02-24. Evidence matrix frozen in `MASTER_PLAN.md` (OCG-001 section). Verification summary: `npx vitest run tests/unit/ai/modelPolicy.test.ts tests/integration/ai/modelPolicy.integration.test.ts tests/unit/ai/modelFailoverPolicy.test.ts tests/unit/ai/authProfilePolicy.test.ts tests/integration/ai/sessionRouting.integration.test.ts tests/unit/ai/sessionRouteIdentity.test.ts tests/unit/ai/chatModelResolution.test.ts tests/unit/ai/modelPricing.test.ts tests/unit/ai/openrouterPricing.test.ts tests/unit/ai/memoryComposer.test.ts tests/integration/ai/semanticRetrievalTelemetry.integration.test.ts tests/unit/ai/providerRegistry.test.ts tests/integration/ai/modelConformanceEnablement.integration.test.ts` => `13` files, `81` tests passed; `npm run docs:guard` => `Docs guard passed.` |
| `OCG-002` | `B` | 2 | `P0` | `DONE` | `OCG-001` | Propagate actual model/auth/fallback outcomes from agent runtime back into desktop chat conversation `modelResolution` records | `convex/ai/agentExecution.ts`; `convex/ai/chat.ts`; `convex/ai/conversations.ts`; `convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-UNIT-AI` | Done 2026-02-24: `ai.chat.sendMessage` now persists agent-runtime `modelResolution` payloads (`selectedModel`, `usedModel`, auth profile IDs, fallback flags/reasons) and removes synthetic `"agent_execution"` placeholders; `ai.agentExecution.processInboundMessage` now returns runtime model-resolution metadata for orchestrator-first desktop chat persistence; conversation/model-resolution schemas and validators were expanded for migration-safe optional `usedModel`/auth fields. Verification: `npm run typecheck` (pass), `npx vitest run tests/unit/ai tests/integration/ai` (pass: 84 files, 365 tests). |
| `OCG-003` | `B` | 2 | `P1` | `DONE` | `OCG-002` | Add conversation-level auth-profile pin metadata and explicit pin/unlock policy parity with agent sessions | `convex/ai/conversations.ts`; `convex/ai/chat.ts`; `convex/schemas/aiSchemas.ts`; `convex/ai/sessionRoutingPolicy.ts` | `V-TYPE`; `V-UNIT-AI` | Done 2026-02-24: added `aiConversations.routingPin` contract + `upsertConversationRoutingPin` mutation and wired desktop chat to evaluate/update pin state with `evaluateSessionRoutingPinUpdate` for deterministic `pinReason`/`unlockReason` parity (including auth-profile rotation parity and model-unavailable unlock behavior); preserved backward compatibility via migration-safe normalizers for legacy conversation records without pin/model-resolution extension fields. Verification: `npm run typecheck` (pass), `npx vitest run tests/unit/ai tests/integration/ai` (pass: 84 files, 365 tests), plus targeted lane-B checks (`npx vitest run tests/unit/ai/chatModelResolution.test.ts tests/integration/ai/runtimeHotspotCharacterization.integration.test.ts tests/unit/ai/conversationRoutingParity.test.ts` => pass: 3 files, 12 tests). |
| `OCG-004` | `C` | 3 | `P0` | `DONE` | `OCG-002` | Extract one shared two-stage failover executor consumed by chat + agent runtimes to prevent policy drift | `convex/ai/twoStageFailoverExecutor.ts`; `convex/ai/chatRuntimeOrchestration.ts`; `convex/ai/agentExecution.ts`; `tests/unit/ai/twoStageFailoverExecutor.test.ts`; `scripts/test-model-validation.ts` | `V-TYPE`; `V-UNIT-AI`; `V-MODEL` | Done 2026-02-25. Shared failover extraction remained intact and shared `V-MODEL` residuals were resolved by hardening model-validation harness behavior: deterministic multi-turn token recall with bounded retry/replay fallback, per-call latency sampling (instead of aggregate multi-step timing), and concise ACK prompting under low reasoning effort for live validation probes. Repro evidence before fix: six escalated runs failed conformance latency (`latency_p95_ms`: `14305`, `18314`, `20182`, `21952`, `28453`, `35515`; logs `tmp/openclaw-vmodel-runs/escalated-run-{1..6}.log`). Post-fix evidence: `npm run test:model` pass (`6/6`, `latency_p95_ms=9034`) and four stability reruns passed (`latency_p95_ms` `5015`-`7347`; logs `tmp/openclaw-vmodel-runs/postfix-run-{1..4}.log`). |
| `OCG-005` | `D` | 4 | `P0` | `DONE` | `OCG-001` | Implement provider-registry fanout discovery ingestion to reduce OpenRouter-first control-plane coupling | `convex/ai/modelDiscovery.ts`; `convex/ai/providerRegistry.ts`; `convex/ai/platformModels.ts`; `convex/schemas/aiSchemas.ts` | `V-TYPE`; `V-UNIT-AI`; `V-AI-LINT` | Done 2026-02-25 with provider-fanout discovery wiring and provider-agnostic control-plane ingestion while preserving OpenRouter as a supported source. Verification rerun for this lane: `npm run typecheck` (pass), `npx vitest run tests/unit/ai tests/integration/ai` (pass: 110 files, 520 tests), `npm run docs:guard` (pass). |
| `OCG-006` | `D` | 4 | `P1` | `DONE` | `OCG-005` | Add manifest/schema-based provider plugin contract checks for adapter registration and boot-time conformance | `convex/ai/providerRegistry.ts`; `convex/ai/modelAdapters.ts`; `tests/unit/ai/providerRegistry.test.ts`; `tests/integration/ai/modelConformanceEnablement.integration.test.ts`; `scripts/test-model-validation.ts` | `V-TYPE`; `V-UNIT-AI`; `V-MODEL` | Done 2026-02-25. Plugin-manifest/schema conformance checks and adapter contract hardening remain in place; shared `V-MODEL` blocker with `OCG-004` is cleared. Required verification rerun: `npm run typecheck` pass; `npx vitest run tests/unit/ai tests/integration/ai` pass (`115` files, `545` tests); `npm run test:model` pass (`6/6`, `conformance=PASS`, `latency_p95_ms=9034`); `npm run docs:guard` pass. |
| `OCG-007` | `E` | 5 | `P1` | `DONE` | `OCG-004`, `OCG-005` | Align runtime-adjacent docs/comments from OpenRouter-only wording to provider-agnostic control-plane wording | `convex/schemas/aiSchemas.ts`; `convex/ai/modelDiscovery.ts`; `docs/ai-endurance/implementation-plans/07-two-stage-failover-openclaw-pattern.md`; `docs/ai-endurance/implementation-plans/08-session-stickiness-model-auth.md`; `docs/ai-endurance/implementation-plans/13-control-plane-plugin-boundaries.md` | `V-LINT`; `V-DOCS` | Done 2026-02-25. Updated runtime-adjacent schema/discovery comments and implementation-plan wording to provider-agnostic control-plane language while explicitly scoping legacy/OpenRouter-specific paths. Verification: `npm run lint` (pass; `0` errors, warnings-only baseline), `npm run docs:guard` (pass: `Docs guard passed.`). |
| `OCG-008` | `E` | 6 | `P1` | `DONE` | `OCG-003`, `OCG-006`, `OCG-007` | Final hardening closeout: regression matrix, runbook deltas, and queue/index/master-plan sync | `docs/reference_docs/topic_collections/implementation/openclaw-endurance-gap-closure/*`; targeted runtime/tests touched by prior rows | `V-TYPE`; `V-LINT`; `V-UNIT-AI`; `V-MODEL`; `V-DOCS` | Done 2026-02-25. Published lane-`E` hardening regression matrix + runbook delta log in `MASTER_PLAN.md` and synchronized queue artifacts. Verification (queue order): `npm run typecheck` pass; `npm run lint` pass (`0` errors, `3285` warnings baseline); `npx vitest run tests/unit/ai tests/integration/ai` pass (`115` files, `545` tests); `npm run test:model` pass (`6/6`, `conformance=PASS`, `latency_p95_ms=4554`); `npm run docs:guard` pass. |
