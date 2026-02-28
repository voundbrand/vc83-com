# Platform Usage Accounting Guardrails Task Queue

**Last updated:** 2026-02-27  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails`  
**Source request:** Scan every corner of runtime/provider integrations, track platform and non-platform usage, add CI guardrails, then run guard-driven fix planning.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane concurrency rules explicitly allow one per lane.
3. Promote `PENDING` to `READY` only when all `Depends On` rows are `DONE`.
4. Selection is deterministic: priority (`P0` -> `P1` -> `P2`) then lexical task ID.
5. Keep provider-callsite changes and CI-guard changes in separate lanes to avoid merge conflicts.
6. Every code task must include explicit verification commands before transitioning to `DONE`.
7. Any newly discovered unmetered callsite must be added as a queue row before code changes.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and `TASK_QUEUE.md` after each completed task.
9. Run `npm run docs:guard` before reporting plan updates.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-CODEGEN` | `npx convex codegen` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-GUARD-BASELINE` | `rg -n "chatCompletion\\(" convex && rg -n "v0Request<|v0Request\\(" convex/integrations/v0.ts && rg -n "fetch\\(" convex/integrations/v0.ts` |
| `V-GUARD-CI` | `npm run ai:usage:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Usage contract and metering wrapper normalization | `convex/ai/billing.ts`; shared metering helpers | No provider-specific business logic in this lane |
| `B` | Non-chat OpenRouter/direct LLM callsite closure | `convex/ai/interviewRunner.ts`; `convex/ai/soulGenerator.ts`; `convex/ai/soulEvolution.ts`; `convex/integrations/selfHealDeploy.ts` | No CI workflow edits in this lane |
| `C` | v0 integration accounting and billing-source attribution | `convex/integrations/v0.ts`; credits/billing adapters | No cross-lane refactors outside v0 path |
| `D` | Guardrails and regression tests | `scripts/ci/*`; `.github/workflows/*`; `tests/unit/ai/*` | No runtime behavior changes beyond guard/test hooks |
| `E` | Guard execution closeout and fix-plan iteration | Workstream docs + targeted patch list | Starts after lanes `B`..`D` P0 rows are `DONE` |

---

## Dependency-based status flow

1. Start with lane `A` contract finalization (`PUAG-002`).
2. Execute lane `B` and lane `C` in parallel once `PUAG-002` is `DONE`.
3. Start lane `D` after `PUAG-003` and `PUAG-004` are `DONE`.
4. Run lane `E` guard sweep and produce fix plan only after lane `D` guard wiring is `DONE`.
5. Close out only after full verify profile rerun and docs synchronization.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `PUAG-001` | `A` | 1 | `P0` | `DONE` | `-` | Run baseline static guard scan across all provider execution surfaces and classify uncovered metering paths | `convex/ai/*`; `convex/integrations/v0.ts`; `convex/integrations/selfHealDeploy.ts` | `V-GUARD-BASELINE` | Latest scan (2026-02-24) flagged actionable runtime gaps: `convex/integrations/selfHealDeploy.ts`, `convex/ai/interviewRunner.ts`, `convex/ai/soulEvolution.ts`, `convex/ai/soulGenerator.ts`, and v0 transport paths in `convex/integrations/v0.ts` (`v0Request` + direct `fetch`). Expected guard allowlist candidates also surfaced: `convex/ai/chatRuntimeOrchestration.ts` (orchestration wrapper) and `convex/ai/openrouter.ts` (client adapter). |
| `PUAG-002` | `A` | 1 | `P0` | `DONE` | `PUAG-001` | Define and implement canonical metering helper contract for non-chat AI calls (credits + `recordUsage` + native usage metadata + billing source) | `convex/ai/billing.ts`; `convex/ai/*` shared helper files | `V-CODEGEN`; `V-TYPE`; `V-UNIT` | Completed 2026-02-24 with canonical helper `convex/ai/nonChatUsageMetering.ts` and unit coverage (`tests/unit/ai/nonChatUsageMetering.test.ts`). Verification passed: `npx convex codegen`, `npm run typecheck`, `npm run test:unit`. |
| `PUAG-003` | `B` | 2 | `P0` | `DONE` | `PUAG-002` | Wire uncovered non-chat OpenRouter/direct LLM paths to canonical metering contract | `convex/ai/interviewRunner.ts`; `convex/ai/soulGenerator.ts`; `convex/ai/soulEvolution.ts`; `convex/integrations/selfHealDeploy.ts` | `V-CODEGEN`; `V-TYPE`; `V-UNIT` | Completed 2026-02-25. Lane E closeout reruns passed with no uncovered non-chat callsites remaining. |
| `PUAG-004` | `C` | 2 | `P0` | `DONE` | `PUAG-002` | Add full v0 usage accounting and billing-source attribution (platform key vs org key) into existing credits + ledger system | `convex/integrations/v0.ts`; `convex/ai/billing.ts`; provider key-resolution surfaces | `V-CODEGEN`; `V-TYPE`; `V-UNIT` | Completed 2026-02-25. v0 billing-source attribution is enforced and included in guard-passing closeout profile. |
| `PUAG-005` | `D` | 3 | `P0` | `DONE` | `PUAG-003`, `PUAG-004` | Implement CI guard that blocks unmetered provider calls (`chatCompletion`, `v0Request`, direct provider `fetch`) outside approved wrappers | `scripts/ci/check-ai-usage-metering.sh`; `package.json`; `.github/workflows/*` | `V-GUARD-CI`; `V-DOCS` | Completed 2026-02-25. Guard is active and passing (`AI usage metering guard passed`). |
| `PUAG-006` | `D` | 3 | `P1` | `DONE` | `PUAG-003`, `PUAG-004`, `PUAG-005` | Add regression tests for accounting correctness (platform vs BYOK/private exclusion from margin, analytics visibility retained) | `tests/unit/ai/*`; `tests/integration/ai/*` | `V-UNIT`; `V-GUARD-CI` | Completed 2026-02-25. Regression suite and guard reruns passed in deterministic closeout profile. |
| `PUAG-007` | `E` | 4 | `P1` | `DONE` | `PUAG-005`, `PUAG-006` | Run guard after implementation, capture findings, and produce guard-driven fix backlog | Workstream docs + guard reports | `V-GUARD-CI`; `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-02-25. Guard output: `AI usage metering guard passed (no newly introduced unmetered provider call surfaces).` Deterministic violation rows added: `0`. Verification passed: `npm run ai:usage:guard`, `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `PUAG-008` | `E` | 4 | `P1` | `DONE` | `PUAG-007` | Execute guard-fix backlog and close out with refreshed economics validation | Runtime files from `PUAG-007` findings | `V-CODEGEN`; `V-TYPE`; `V-UNIT`; `V-GUARD-CI`; `V-DOCS` | Completed 2026-02-25. `PUAG-007` produced no violations, so backlog size was deterministic no-op (`0` rows). Closeout verification passed: `npx convex codegen`, `npm run typecheck`, `npm run test:unit`, `npm run ai:usage:guard`, `npm run docs:guard`. |

---

## Lane E guard findings (2026-02-25)

1. Guard command executed: `npm run ai:usage:guard`.
2. Real output: `AI usage metering guard passed (no newly introduced unmetered provider call surfaces).`
3. Deterministic violation rows created from guard output: `0`.
4. Deterministic guard-fix backlog for `PUAG-008`: `no-op` (no unmetered callsites to patch).

---

## Current kickoff

- Active task: none.
- Next task: none (`Lane E` closeout complete for this session).
- Immediate objective: preserve zero guard violations while subsequent queue lanes are synced/executed.
