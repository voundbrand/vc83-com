# Convex AI Codebase Organization Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization`  
**Last updated:** 2026-03-27  
**Planning scope:** `convex/ai` first, with repo-wide reorganization opportunities captured as sequenced backlog.

---

## Objective

Create a deterministic, low-risk migration to make `convex/ai` the canonical home for AI/agent source-of-truth/runtime domain logic (with executable CLI surfaces in `scripts/ai`) while preserving runtime behavior and deployment safety:

1. Centralize AI/agent execution, model, voice, and source-of-truth assets under `convex/ai`, with direct script entrypoints in `scripts/ai/elevenlabs`.
2. Keep app-level code focused on app runtime and UI concerns only.
3. Preserve fail-closed compliance and org-isolation semantics during file moves.
4. Surface additional non-`convex/ai` reorganization opportunities with clear sequencing and ownership.

---

## Current codebase reality summary

1. `convex/ai` already has significant coverage (`334` files) with core runtime + agent modules.
2. ElevenLabs operational tooling has been migrated from `apps/one-of-one-landing/scripts/elevenlabs` to `scripts/ai/elevenlabs`, decoupling ops from app-local paths while keeping source assets under `convex/ai/agents/elevenlabs`.
3. Root/script-level AI operations are spread across multiple folders (`scripts/ai`, root `scripts/*`, app-local scripts).
4. Convex domain logic relevant to AI/compliance/telephony exists both inside and outside `convex/ai`, requiring explicit ownership boundaries.
5. Additional repo surfaces suitable for later reorganizations include large UI modules in `src/components/window-content/*` and shared service utilities duplicated across apps.

---

## Target `convex/ai` topology

```text
convex/ai/
  kernel/           # execution orchestration core
  agents/           # agent modules + elevenlabs source-of-truth catalogs/assets
  model/            # model routing/adapters/failover/pricing
  voice/            # voice runtime + adapters + defaults
  actions/          # org action runtime/policy/sync flow
  compliance/       # ai compliance gates/helpers
  memory/           # memory composers and contracts
  knowledge/        # retrieval + context composition
  observability/    # trust events, telemetry, incidents
  integrations/     # external connectors/bridges
  contracts/        # cross-domain contracts
  shared/           # small pure shared utils
```

Boundary rules:

1. `kernel` must orchestrate only; no embedded domain-specific policy code.
2. `agents/<name>` owns agent-specific prompt/runtime/module logic.
3. Domain planes (`model`, `voice`, `actions`, `compliance`) should not import upward into `kernel`.
4. ElevenLabs operational scripts and support libraries must live under `scripts/ai/elevenlabs/*`; app-local script folders must not be retained as wrappers.
5. Runtime and script entrypoints may call `convex/ai` paths directly from root/app package scripts; no thin-wrapper compatibility layer is allowed after migration.
6. Compatibility exports are temporary and must be removed in final cutover rows.

### Canonical placement contract

1. `kernel/*`
   - Owns orchestration flow (`agentExecution`, turn orchestration, tool orchestration).
   - May depend on `contracts/*` and small `shared/*` utilities only.
   - Must not host provider adapters, model routing policy, or telephony provider specifics.
2. `agents/*`
   - Owns agent-specific assets and runtimes (prompts, tool manifests, provider ops utilities).
   - ElevenLabs sync/simulation/test-sync scripts are owned by `scripts/ai/elevenlabs/*`.
3. `model/*`
   - Owns model routing, failover, enablement gates, pricing, adapters.
   - Exposes stable interfaces for `kernel/*`; avoid reverse import from `model/*` to `kernel/*`.
4. `voice/*`
   - Owns voice runtime contracts/adapters and provider-facing voice behavior normalization.
   - Must not import app-local script surfaces.
5. `actions/*`
   - Owns org action runtime, policy execution, and action-level sync flow.
   - Keeps action policy data contracts explicit via `contracts/*`.
6. `compliance/*`
   - Owns fail-closed compliance guards and evidence semantics.
   - Must remain authoritative for compliance gating before external side effects.
7. `observability/*`
   - Owns telemetry/trust-event/incident emission logic and schemas.
   - Must consume domain events rather than embedding execution policy.
8. `contracts/*`
   - Owns cross-domain type and data contracts used by multiple planes.
   - Must remain dependency-light and implementation-free.
9. `shared/*`
   - Owns small pure helpers that do not imply domain ownership.
   - Must not become a dumping ground for policy-bearing logic.

---

## Implementation phases

### Phase 1: Governance and move map (`AIORG-001`..`AIORG-003`)

1. Complete inventory and hotspot evidence.
2. Freeze target folder contract and ownership rules.
3. Produce deterministic file move and import rewrite matrix.

### Deterministic move map and rewrite matrix (`AIORG-003`)

#### ElevenLabs ops hard-cutover map

| Old path | New path | Rewrite requirement |
|---|---|---|
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/sync-elevenlabs-agent.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-agent.ts` | Update root/app package scripts to call new path directly; no wrapper script retained. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/simulate-elevenlabs-flow.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts` | Keep CLI flags and default fixture semantics unchanged. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/sync-elevenlabs-tests.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-tests.ts` | Preserve dry-run/write behavior and supported agent roster. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/catalog.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/catalog.ts` | Re-anchor repo/app/fixture roots for new file location. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/elevenlabs-api.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/elevenlabs-api.ts` | Rewrite all runtime/test imports to the new canonical module. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/env.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/env.ts` | Keep env load order and fail-closed missing-var checks unchanged. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/source-of-truth.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/source-of-truth.ts` | Preserve source-of-truth reads from `convex/ai/agents/elevenlabs/*`. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/lib/utils.ts` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/utils.ts` | Preserve stable serialization + repo-relative path output. |
| `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/README.md` | `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/README.md` | Rewrite runbook commands to new entrypoints; remove references to app-local script folder. |

#### Import rewrite matrix (required before deleting old folder)

1. Runtime imports
   - `/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts`:
     `../../apps/one-of-one-landing/scripts/elevenlabs/lib/elevenlabs-api` -> `../../scripts/ai/elevenlabs/lib/elevenlabs-api`
   - `/Users/foundbrand_001/Development/vc83-com/src/lib/telephony/elevenlabs-agent-sync.ts`:
     `../../../apps/one-of-one-landing/scripts/elevenlabs/lib/elevenlabs-api` -> `../../../scripts/ai/elevenlabs/lib/elevenlabs-api`
2. Test imports/mocks
   - `/Users/foundbrand_001/Development/vc83-com/tests/unit/telephony/telephonyIntegration.test.ts`: update mock target path to new module.
   - `/Users/foundbrand_001/Development/vc83-com/tests/unit/apps/one-of-one-landing-anne-becker-config.test.ts`: update imports for catalog/source-of-truth.
3. Script entrypoints
   - `/Users/foundbrand_001/Development/vc83-com/package.json`: `landing:elevenlabs:*` scripts must point to `scripts/ai/elevenlabs/*`.
   - `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/package.json`: `elevenlabs:*` scripts must point to `../../scripts/ai/elevenlabs/*`.
4. Fixture/data path dependency
   - Keep fixture corpus in `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/fixtures/elevenlabs`.
   - Update `scripts/ai/elevenlabs/lib/catalog.ts` roots so fixture resolution remains deterministic from the new script location.

#### Staged checkpoints and rollback checkpoints

1. Checkpoint A (`AIORG-004` pre-delete):
   - Move files and rewrite imports/scripts/docs.
   - Verify exact row gates (`typecheck`, targeted unit tests, `docs:guard`).
2. Checkpoint B (`AIORG-004` cutover):
   - Delete `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs`.
   - Run ripgrep proof: no remaining imports/command references to deleted path.
3. Rollback checkpoint (only if verification fails before delete):
   - Revert to pre-row snapshot and keep old folder until all verify gates are green.
   - Do not ship partial dual-path runtime imports.

### Phase 2: Core relocations (`AIORG-004`..`AIORG-006`)

1. Relocate ElevenLabs ops engine to `scripts/ai/elevenlabs`.
2. Extract runtime orchestration core into `convex/ai/kernel`.
3. Extract model stack into `convex/ai/model`.

### Phase 3: Surface cleanup (`AIORG-007`..`AIORG-008`)

1. Consolidate scripts and wrapper command paths.
2. Publish non-`convex/ai` reorg backlog for next workstreams.

### Phase 4: Hardening and cutover (`AIORG-009`..`AIORG-010`)

1. Remove compatibility exports.
2. Enforce final import boundaries and drift checks.
3. Run full regression and close documentation loop.

### Phase 5: Clara V3 intake hardening (`AIORG-011`)

1. Convert Clara V3 to strict intake-first behavior with no live transfer actions.
2. Keep promises explicitly backend-follow-up based (capture now, action in second step).
3. Enforce managed built-in tool pruning in sync so stale transfer tools cannot linger remotely.
4. Validate using the dedicated Clara V3 simulation suite.

---

## Verification contract

All row-level verify commands must run exactly as listed in `TASK_QUEUE.md`. Global baseline:

1. `npm run docs:guard`
2. `npm run typecheck`
3. Targeted unit suites for core/model/telephony-safe regressions
4. Full `npm run test:unit` during cutover rows

---

## Repo-wide additional reorganization opportunities

These are planning targets discovered during inventory and intentionally sequenced behind `convex/ai` stabilization.

### Prioritized non-`convex/ai` backlog

| Backlog ID | Priority | Scope | Primary paths | Sequencing and gating | Verify profile |
|---|---|---|---|---|---|
| `REORG-NCAI-001` | `P0` | Convex root boundary cleanup: isolate telephony/compliance/integration ownership outside `convex/ai` with explicit import rules. | `/Users/foundbrand_001/Development/vc83-com/convex/integrations`; `/Users/foundbrand_001/Development/vc83-com/convex/channels`; `/Users/foundbrand_001/Development/vc83-com/convex/compliance*`; `/Users/foundbrand_001/Development/vc83-com/convex/http.ts` | Start first; establishes dependency contracts for every other non-`convex/ai` refactor row. Must preserve fail-closed compliance checks and org isolation gates before any route/export rewrites. | `npm run typecheck`; targeted telephony/compliance unit suites; `npm run docs:guard` |
| `REORG-NCAI-002` | `P0` | Window-content modularization: split large shell tabs into domain modules with bounded ownership. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/*` | Execute after `REORG-NCAI-001` so frontend modules consume stabilized Convex boundaries. Slice by tab domain to avoid cross-file merge churn. | `npm run typecheck`; focused DOM/unit suites for touched tabs; `npm run docs:guard` |
| `REORG-NCAI-003` | `P1` | Multi-app shared util extraction for stable contracts (auth/session/client helpers) into shared packages. | `/Users/foundbrand_001/Development/vc83-com/apps/*`; `/Users/foundbrand_001/Development/vc83-com/src/lib`; `/Users/foundbrand_001/Development/vc83-com/packages/*` | Start only after boundary + UI slices settle. Promote helpers only when call signatures are already stable in at least two apps. | `npm run typecheck`; app-local typecheck gates for affected apps; `npm run docs:guard` |
| `REORG-NCAI-004` | `P1` | Broader script namespace hygiene outside ElevenLabs (CI/test/dev script discoverability and alias map cleanup). | `/Users/foundbrand_001/Development/vc83-com/scripts`; `/Users/foundbrand_001/Development/vc83-com/package.json`; `/Users/foundbrand_001/Development/vc83-com/apps/*/package.json` | Execute after functional refactors to avoid churn in command references during active feature work. Keep ergonomics stable via explicit alias map. | `npm run typecheck`; `npm run docs:guard` |
| `REORG-NCAI-005` | `P1` | Docs ownership normalization for strategy/implementation collections to reduce duplicated queue surfaces. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections`; `/Users/foundbrand_001/Development/vc83-com/docs/strategy` | Planning-first row; run after technical rows to capture final architecture without drift. | `npm run docs:guard` |

### Sequencing policy for follow-up workstreams

1. Deliver `REORG-NCAI-001` before launching any non-`convex/ai` runtime move row.
2. Parallelism is allowed only across disjoint write scopes (`src/components/window-content/*` vs docs-only rows).
3. Every follow-up row must keep fail-closed compliance, authority checks, evidence semantics, and org isolation intact.

---

## Risks and mitigations

1. Risk: import breakage during large moves.  
Mitigation: staged compatibility exports + deterministic move map + targeted regression suites.

2. Risk: behavioral drift in runtime execution.  
Mitigation: no-logic-change policy during path moves, strict typecheck/unit gates each row.

3. Risk: app runtime disruption from ops-tool relocation.  
Mitigation: direct script entrypoint rewrites in root/app package scripts plus targeted telephony/voice unit gates.

4. Risk: over-broad reorg scope stalls delivery.  
Mitigation: P0 focuses on `convex/ai` first; additional opportunities are backlog rows with explicit priority.

---

## Exit criteria

1. `convex/ai` is the canonical location for AI/agent core and operations logic.
2. ElevenLabs operational engine is no longer app-coupled.
3. Compatibility shims removed and import boundaries enforced.
4. Full regression gates pass after cutover.
5. Repo-wide follow-up reorg opportunities are documented as executable backlog.

---

## Current execution snapshot

1. Active row: none.
2. Deterministic next row after active completion: none (queue complete).
3. Queue status: all rows through `AIORG-013` are complete.
4. Completed rows: `AIORG-001`, `AIORG-002`, `AIORG-003`, `AIORG-004`, `AIORG-005`, `AIORG-006`, `AIORG-007`, `AIORG-008`, `AIORG-009`, `AIORG-010`, `AIORG-011`, `AIORG-012`, `AIORG-013`.

## Execution progress log

1. 2026-03-26: `AIORG-001` completed.
2. Files changed: queue artifacts in this workstream.
3. Verify results: `npm run docs:guard` passed.
4. Dependency promotions: `AIORG-002` promoted to `READY`, then moved to `IN_PROGRESS`.
5. Next deterministic row: `AIORG-002`.
6. 2026-03-26: `AIORG-002` completed.
7. Files changed: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/SESSION_PROMPTS.md`, and synchronized queue docs in this workstream.
8. Verify results: `npm run docs:guard` passed.
9. Dependency promotions: `AIORG-003` promoted to `READY`, then moved to `IN_PROGRESS`.
10. Next deterministic row: `AIORG-003`.
11. 2026-03-26: `AIORG-003` completed.
12. Files changed: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/TASK_QUEUE.md`, and synchronized queue docs in this workstream.
13. Verify results: `npm run docs:guard` passed.
14. Dependency promotions: `AIORG-004` promoted to `READY`, then moved to `IN_PROGRESS`.
15. Next deterministic row: `AIORG-004`.
16. 2026-03-26: `AIORG-004` completed.
17. Files changed: `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/*`, `/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts`, `/Users/foundbrand_001/Development/vc83-com/src/lib/telephony/elevenlabs-agent-sync.ts`, `/Users/foundbrand_001/Development/vc83-com/package.json`, `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/package.json`, targeted tests/docs/runbooks, and synchronized queue docs in this workstream.
18. Verify results: `npm run typecheck` passed; `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` passed; `npm run docs:guard` passed.
19. Deletion safety evidence: `RG_CODE_CODEPATH=1` (no code-path references to deleted folder), `OLD_DIR_EXISTS=1` (folder absent), `RG_CODE_NEWPATH=0` (new path references present in entrypoints/imports/docs).
20. Dependency promotions: `AIORG-005`, `AIORG-006`, `AIORG-007` promoted to `READY`.
21. Next deterministic row: `AIORG-005`.
22. 2026-03-27: `AIORG-005` moved `READY -> IN_PROGRESS`; synchronized queue docs updated.
23. Dependency promotions: none.
24. Next deterministic row after active completion: `AIORG-006`.
25. 2026-03-27: `AIORG-013` moved `READY -> IN_PROGRESS`.
26. Files changed: synchronized workstream docs in this workstream.
27. Verify results: `npm run docs:guard` passed.
28. Dependency promotions: none.
29. Next deterministic row after active completion: none.
25. 2026-03-27: `AIORG-005` completed.
26. Files changed: `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentExecution.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentTurnOrchestration.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentToolOrchestration.ts`, compatibility exports in `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentTurnOrchestration.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts`, and synchronized workstream docs.
27. Verify results: `npm run typecheck` passed; `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts` passed; `npm run docs:guard` passed.
28. Dependency promotions: none.
29. Next deterministic row: `AIORG-006`.
30. 2026-03-27: `AIORG-006` moved `READY -> IN_PROGRESS`; synchronized queue docs updated.
31. Dependency promotions: `AIORG-008` promoted `PENDING -> READY`.
32. Next deterministic row after active completion: `AIORG-009` (`P0`).
33. 2026-03-27: `AIORG-006` completed.
34. Files changed: `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelPolicy.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelAdapters.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelFailoverPolicy.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelPricing.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelEnablementGates.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelDefaults.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelDiscovery.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelConformance.ts`, compatibility exports at original `convex/ai/model*.ts` paths, and synchronized workstream docs.
35. Verify results: `npm run typecheck` passed; `npm run test:unit -- tests/unit/ai/modelPolicy.test.ts tests/unit/ai/modelFailoverPolicy.test.ts` passed; `npm run docs:guard` passed.
36. Dependency promotions: `AIORG-009` promoted `PENDING -> READY`.
37. Next deterministic row: `AIORG-009`.
38. 2026-03-27: `AIORG-009` moved `READY -> IN_PROGRESS`; synchronized queue docs updated.
39. Dependency promotions: none.
40. Next deterministic row after active completion: `AIORG-010`.
41. 2026-03-27: `AIORG-009` completed.
42. Files changed: `convex/ai/kernel/*`, `convex/ai/model/*`, runtime/test/script import and API path rewrites to `kernel/*` and `model/*`, compatibility export module removals at former `convex/ai/*` compatibility paths, and drift guard additions in `scripts/ci`.
43. Verify results: `npm run typecheck` passed; `npm run test:unit` passed; `npm run docs:guard` passed.
44. Dependency promotions: `AIORG-010` promoted `PENDING -> READY`.
45. Next deterministic row: `AIORG-010`.
46. 2026-03-27: `AIORG-010` moved `READY -> IN_PROGRESS`; synchronized queue docs updated.
47. Dependency promotions: none.
48. Next deterministic row after active completion: `AIORG-007`.
49. 2026-03-27: `AIORG-010` completed.
50. Files changed: synchronized workstream docs with final cutover validation evidence and updated queue ordering for remaining `P1` rows.
51. Verify results: `npm run typecheck` passed; `npm run test:unit` passed; `npm run docs:guard` passed.
52. Dependency promotions: none.
53. Next deterministic row: `AIORG-007`.
54. 2026-03-27: `AIORG-007` moved `READY -> IN_PROGRESS`; synchronized queue docs updated.
55. Dependency promotions: none.
56. Next deterministic row after active completion: `AIORG-008`.
57. 2026-03-27: `AIORG-007` completed.
58. Files changed: `/Users/foundbrand_001/Development/vc83-com/package.json`, `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/package.json`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/README.md`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/README.md`, `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`, and synchronized workstream docs.
59. Verify results: `npm run typecheck` passed; `npm run docs:guard` passed.
60. Dependency promotions: none.
61. Next deterministic row: `AIORG-008`.
62. 2026-03-27: `AIORG-008` moved `READY -> IN_PROGRESS`; synchronized queue docs updated.
63. Dependency promotions: none (queue terminal after completion).
64. Next deterministic row after active completion: none.
65. 2026-03-27: `AIORG-008` completed.
66. Files changed: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md`, and synchronized workstream docs.
67. Verify results: `npm run docs:guard` passed.
68. Dependency promotions: none.
69. Next deterministic row: none (queue complete).
70. 2026-03-27: `AIORG-011` moved `READY -> IN_PROGRESS`; synchronized queue docs updated for Clara V3 intake-only hardening.
71. Dependency promotions: none.
72. Next deterministic row after active completion: none.
73. 2026-03-27: `AIORG-011` completed.
74. Files changed: Clara V3 source files (`system-prompt.md`, `knowledge-base.md`, `guardrails.json`, `README.md`), ElevenLabs ops runtime files (`scripts/ai/elevenlabs/lib/catalog.ts`, `scripts/ai/elevenlabs/lib/source-of-truth.ts`, `scripts/ai/elevenlabs/sync-elevenlabs-agent.ts`, `scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts`), Clara V3 fixtures, and synchronized workstream docs.
75. Verify results: `npm run typecheck` passed; `npm run ai:elevenlabs:sync -- --agent clara_v3 --write` passed; `npm run ai:elevenlabs:simulate -- --suite clara-v3-demo-proof --idle-ms 1800 --turn-timeout-ms 25000` passed; `npm run docs:guard` passed.
76. Dependency promotions: none.
77. Next deterministic row: none (queue complete).
78. 2026-03-27: `AIORG-012` moved `READY -> IN_PROGRESS`; synchronized queue docs updated for Schmitt & Partner synthetic demo-office bootstrap.
79. Dependency promotions: none.
80. Next deterministic row after active completion: none.
81. 2026-03-27: `AIORG-012` completed.
82. Files changed: `/Users/foundbrand_001/Development/vc83-com/scripts/seed-schmitt-partner-demo-office.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`, and synchronized workstream docs.
83. Verify results: `npm run typecheck` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` passed; `npm run docs:guard` passed.
84. Dependency promotions: none. Next deterministic row: none (queue complete).
85. 2026-03-27: `AIORG-013` completed.
86. Files changed: `/Users/foundbrand_001/Development/vc83-com/scripts/seed-schmitt-partner-demo-office.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`, and synchronized workstream docs.
87. Verify results: `npm run typecheck` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup --suffix aiorg013-live --deploy-kanzlei-mvp` passed (live summary emitted and non-fatal `coreWedge.status = "blocked"` warning captured); `npm run docs:guard` passed.
88. Dependency promotions: none. Next deterministic row: none (queue complete).
