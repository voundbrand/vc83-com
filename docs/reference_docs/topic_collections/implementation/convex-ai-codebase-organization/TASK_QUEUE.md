# Convex AI Codebase Organization Task Queue

**Last updated:** 2026-03-27  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization`  
**Source request context:** consolidate AI/agent code under `/Users/foundbrand_001/Development/vc83-com/convex/ai` and identify additional repo-wide reorganization opportunities.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Row schema is fixed and must remain exact: `ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes`.
3. At most one row may be `IN_PROGRESS` globally.
4. Deterministic pick order is `P0` before `P1`, then lexical `ID`.
5. Promote `PENDING` to `READY` only when all dependencies are `DONE`.
6. Every row must run listed `Verify` commands exactly before moving to `DONE`.
7. Reorganization work must preserve runtime behavior, fail-closed compliance boundaries, and org isolation guarantees.
8. Keep `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, and `SESSION_PROMPTS.md` synchronized on every state transition.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT-CORE` | `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts` |
| `V-UNIT-MODEL` | `npm run test:unit -- tests/unit/ai/modelPolicy.test.ts tests/unit/ai/modelFailoverPolicy.test.ts` |
| `V-UNIT-ELEVEN` | `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` |
| `V-ELEVEN-SYNC-CLARAV3` | `npm run ai:elevenlabs:sync -- --agent clara_v3 --write` |
| `V-ELEVEN-SIM-CLARAV3` | `npm run ai:elevenlabs:simulate -- --suite clara-v3-demo-proof --idle-ms 1800 --turn-timeout-ms 25000` |
| `V-DEMO-SEED-HELP` | `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` |
| `V-DEMO-SEED-LIVE` | `npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup --suffix aiorg013-live --deploy-kanzlei-mvp` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Reorg governance and target architecture contracts | workstream docs | no runtime behavior edits |
| `B` | Deterministic move map and ElevenLabs hard cutover | `scripts/ai/elevenlabs/*`, `convex/ai/agents/elevenlabs/*` | preserve CLI behavior with direct entrypoint rewrites (no wrappers) |
| `C` | Core `convex/ai` domain extraction (`kernel`, `model`) | `convex/ai/*` runtime files | additive compatibility exports first |
| `D` | Script surface consolidation and path hygiene | `scripts/*`, app/package scripts | no command behavior drift |
| `E` | Repo-wide reorg backlog outside `convex/ai` | docs + ownership map | planning and sequencing only |
| `F` | Final hardening and cutover | tests + docs + path guards | full regression before cleanup |

---

## Dependency-based status flow

1. Lane `A` must be `DONE` before lane `B` or lane `C` implementation rows.
2. Lane `C` extraction rows start only after lane `B` move map row is `DONE`.
3. Lane `F` cutover starts only after all required lane `B/C` `P0` rows are `DONE`.
4. Any blocked `P0` row halts promotion of dependent rows.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `AIORG-001` | `A` | 1 | `P0` | `DONE` | - | Baseline inventory: scan entire repository and capture concrete reorganization hotspots for `convex/ai` consolidation and adjacent code. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md` | `npm run docs:guard` | Completed 2026-03-26: captured baseline counts (`convex/ai`: 334 files; `convex` excl generated: 1013; `apps` excl generated: 13653) and cross-repo hotspots. |
| `AIORG-002` | `A` | 1 | `P0` | `DONE` | `AIORG-001` | Finalize canonical target folder contract for `convex/ai` (domain ownership, import boundaries, compatibility strategy). | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/SESSION_PROMPTS.md` | `npm run docs:guard` | Completed 2026-03-26: canonical placement contract is explicit for `kernel`, `agents`, `model`, `voice`, `actions`, `compliance`, `observability`, `contracts`, `shared`, and now mandates direct ElevenLabs cutover under `scripts/ai/elevenlabs` with no app-local wrappers. |
| `AIORG-003` | `B` | 2 | `P0` | `DONE` | `AIORG-002` | Build deterministic move map (old path -> new path) and staged import rewrite matrix with compatibility exports and rollback checkpoints. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/TASK_QUEUE.md` | `npm run docs:guard` | Completed 2026-03-26: frozen move matrix and rewrite checkpoints now cover ElevenLabs hard cutover plus planned `kernel`/`model` extraction path map with rollback/deletion gates. |
| `AIORG-004` | `B` | 2 | `P0` | `DONE` | `AIORG-003` | Relocate ElevenLabs operations engine from `apps/one-of-one-landing/scripts/elevenlabs/*` into `scripts/ai/elevenlabs/*`, update all entrypoints/imports, then remove the app-local script folder without compatibility wrappers. | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs`; `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs` | `npm run typecheck`; `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts`; `npm run docs:guard` | Completed 2026-03-26: hard cutover now runs from `scripts/ai/elevenlabs/*`, runtime/test imports and package entrypoints were rewritten, app-local folder removed, and deletion safety evidence is green (`RG_CODE_CODEPATH=1`, `OLD_DIR_EXISTS=1`, `RG_CODE_NEWPATH=0`). |
| `AIORG-005` | `C` | 3 | `P0` | `DONE` | `AIORG-003` | Extract runtime orchestration core into `convex/ai/kernel/*` (`agentExecution`, `agentTurnOrchestration`, `agentToolOrchestration`) with compatibility exports. | `/Users/foundbrand_001/Development/vc83-com/convex/ai` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts`; `npm run docs:guard` | Completed 2026-03-27: runtime orchestration core moved into `convex/ai/kernel/*` and compatibility exports retained at original module paths. Verify gates passed. |
| `AIORG-006` | `C` | 3 | `P0` | `DONE` | `AIORG-003` | Extract model plane into `convex/ai/model/*` (`modelPolicy`, adapters, failover, pricing, enablement gates) with compatibility exports. | `/Users/foundbrand_001/Development/vc83-com/convex/ai` | `npm run typecheck`; `npm run test:unit -- tests/unit/ai/modelPolicy.test.ts tests/unit/ai/modelFailoverPolicy.test.ts`; `npm run docs:guard` | Completed 2026-03-27: model plane moved into `convex/ai/model/*` with compatibility exports retained at original module paths. Verify gates passed. |
| `AIORG-007` | `D` | 4 | `P1` | `DONE` | `AIORG-004` | Consolidate AI/agent script surface (`scripts/ai`, script wrappers, package aliases) and eliminate duplicate entrypoints. | `/Users/foundbrand_001/Development/vc83-com/scripts`; `/Users/foundbrand_001/Development/vc83-com/package.json`; `/Users/foundbrand_001/Development/vc83-com/apps/*/package.json` | `npm run typecheck`; `npm run docs:guard` | Completed 2026-03-27: canonical `ai:elevenlabs:*` root entrypoints are now the single direct script targets, with stable `landing:*` and app-level aliases preserved for operator UX. Verify gates passed. |
| `AIORG-008` | `E` | 4 | `P1` | `DONE` | `AIORG-001` | Produce prioritized non-`convex/ai` reorg backlog (e.g., `convex` root domain splits, `src/window-content` modularization, app-level shared util extraction). | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md` | `npm run docs:guard` | Completed 2026-03-27: prioritized non-`convex/ai` backlog (`REORG-NCAI-001`..`REORG-NCAI-005`) and sequencing policy documented in planning artifacts. Verify gate passed. |
| `AIORG-009` | `F` | 5 | `P0` | `DONE` | `AIORG-005`, `AIORG-006` | Remove temporary compatibility exports, enforce final import boundaries, and add drift guard checks. | `/Users/foundbrand_001/Development/vc83-com/convex/ai`; `/Users/foundbrand_001/Development/vc83-com/scripts/ci` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-27: compatibility exports removed, runtime/test imports rewired to `kernel/*` + `model/*`, and drift guard added at `scripts/ci/check-convex-ai-module-boundaries.sh`. Verify gates passed. |
| `AIORG-010` | `F` | 6 | `P0` | `DONE` | `AIORG-004`, `AIORG-009` | Final cutover validation and documentation sync for the new `convex/ai`-first architecture. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/SESSION_PROMPTS.md` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-27: final cutover validation passed and workstream docs synchronized with kernel/model boundary evidence. |
| `AIORG-011` | `B` | 7 | `P0` | `DONE` | `AIORG-010` | Harden `clara_v3` into strict intake-only mode (no live transfer actions), enforce managed built-in tool pruning during sync, and validate with the dedicated Clara V3 simulation suite. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/landing-demo-agents/clara_v3`; `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/catalog.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-agent.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/fixtures/elevenlabs/clara-v3-*.json` | `npm run typecheck`; `npm run ai:elevenlabs:sync -- --agent clara_v3 --write`; `npm run ai:elevenlabs:simulate -- --suite clara-v3-demo-proof --idle-ms 1800 --turn-timeout-ms 25000`; `npm run docs:guard` | Completed 2026-03-27: Clara V3 now runs intake-only with backend-follow-up language, sync now prunes unmanaged built-in tools for this candidate, and suite evidence shows zero transfer tool usage. |
| `AIORG-012` | `D` | 8 | `P0` | `DONE` | `AIORG-011` | Provision an end-to-end synthetic law-office demo bootstrap for `Schmitt & Partner`: create/reuse org, deploy Clara-connected telephony roster, seed synthetic CRM dataset, and emit a deterministic summary payload for demo handoff. | `/Users/foundbrand_001/Development/vc83-com/scripts/seed-schmitt-partner-demo-office.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/*` | `npm run typecheck`; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help`; `npm run docs:guard` | Completed 2026-03-27: added reproducible Schmitt & Partner demo-office bootstrap with org provisioning modes, Clara/Jonas/Maren deployment, optional Kanzlei MVP deployment, primary-Clara assignment attempt, and idempotent synthetic CRM dataset seeding. |
| `AIORG-013` | `D` | 9 | `P0` | `DONE` | `AIORG-012` | Harden Schmitt demo bootstrap with automatic org telephony binding preflight (provider, from number, webhook secret) before template deployment, then prove full live bootstrap execution for a synthetic law-office handoff. | `/Users/foundbrand_001/Development/vc83-com/scripts/seed-schmitt-partner-demo-office.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/*` | `npm run typecheck`; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help`; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup --suffix aiorg013-live --deploy-kanzlei-mvp`; `npm run docs:guard` | Completed 2026-03-27: signup bootstrap now auto-seeds org telephony binding and is rerun-safe for existing signup emails/slugs; live command succeeds with deterministic JSON handoff including `coreWedge.status = "blocked"` warning when transfer-role prerequisites are unavailable, while Kanzlei MVP + synthetic CRM seeding still complete. |

---

## AIORG-003 deterministic move matrix (frozen)

### ElevenLabs tooling map

| Old path | New path |
|---|---|
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/sync-elevenlabs-agent.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-agent.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/simulate-elevenlabs-flow.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/sync-elevenlabs-tests.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-tests.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/catalog.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/catalog.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/elevenlabs-api.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/elevenlabs-api.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/env.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/env.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/source-of-truth.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/source-of-truth.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/utils.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/utils.ts` |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/README.md` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/README.md` |

### Planned rewrite matrix (row-scoped)

1. `agentExecution` move plan (executed in `AIORG-005`):  
`/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` -> `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentExecution.ts`
2. `agentTurnOrchestration` move plan (executed in `AIORG-005`):  
`/Users/foundbrand_001/Development/vc83-com/convex/ai/agentTurnOrchestration.ts` -> `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentTurnOrchestration.ts`
3. `agentToolOrchestration` move plan (executed in `AIORG-005`):  
`/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts` -> `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentToolOrchestration.ts`
4. Model stack move plan (executed in `AIORG-006`):  
`modelPolicy.ts`, `modelAdapters.ts`, `modelFailoverPolicy.ts`, `modelPricing.ts`, `modelEnablementGates.ts`, `modelDefaults.ts`, `modelDiscovery.ts`, `modelConformance.ts` -> `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/*`
5. Rollback checkpoint policy:
   - If any `AIORG-004` verify command fails before deletion, revert to pre-row snapshot and keep old folder present.
   - Deletion is allowed only after green verify commands and ripgrep proof of zero remaining references.

---

## Current kickoff

1. Active row: none.
2. Deterministic next row after active completion: none (queue complete).
3. Active row count: `0`.
