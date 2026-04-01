# Compliance Engine Phase 0 Governance Execution Task Queue

**Last updated:** 2026-04-01  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution`  
**Source request:** Convert ElevenLabs Enterprise strategy into deterministic weekly execution for `apps/compliance-engine` as governance/evidence control plane (not runtime replacement).

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally.
3. Promote `PENDING` to `READY` only when every dependency is `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must execute all commands in `Verify` before moving to `DONE`.
6. Fail-closed policy is mandatory: unresolved provider evidence or undefined data-processing posture keeps release at `NO_GO`.
7. Scope lock: this workstream may not introduce a duplicate telephony, agent-orchestration, or inference runtime.
8. Keep `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` synchronized at every milestone close.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-CENG-TYPE` | `npm --prefix apps/compliance-engine run typecheck` |
| `V-CENG-TEST` | `npm --prefix apps/compliance-engine run test` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Phase-0 scope contract and control-plane boundary | Workstream docs + contract language | No runtime replacement proposals |
| `B` | Deployment and integration runbooks | Sidecar deployment/integration docs | No policy-engine logic changes |
| `C` | Plugin + API control-plane implementation | `plugin/` + `server/routes/governance*` | Avoid docs-only churn unless tied to implementation |
| `D` | Evidence outputs and release-gate exports | Governance templates + provider dossiers | No telephony/runtime feature scope |
| `E` | Deferred autonomy/scanner expansion | `SCANNER_PLAN.md` follow-ups | Locked until phase-0 gate closes |

---

## Dependency graph

```text
CENG-001 -> CENG-002 -> CENG-003 -> CENG-004 -> CENG-005 -> CENG-006
```

## Critical path

1. `CENG-001`
2. `CENG-002`
3. `CENG-003`
4. `CENG-004`
5. `CENG-005`
6. `CENG-006`

---

## Dependency-based status flow

1. Lane `A` must be `DONE` before lane `B` starts.
2. Lane `C` may start only after lane `B` `P0` row completion.
3. Lane `D` starts only after lane `C` implementation rows are `DONE`.
4. Lane `E` remains `BLOCKED` until lane `D` `P0` closure.

---

## Deterministic execution algorithm

1. Select by priority order: all eligible `P0` rows before any `P1` row.
2. Eligibility requires every dependency in `Depends On` to be `DONE`.
3. For ties, choose the lowest numeric task ID.
4. Set only that row to `IN_PROGRESS`.
5. Apply implementation changes for that row.
6. Execute each command listed in `Verify`.
7. If all verification commands pass, move row to `DONE`.
8. If work cannot proceed, move row to `BLOCKED` and record owner plus mitigation in `Notes`.
9. Recompute dependency promotions (`PENDING` to `READY`) after each row transition.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `CENG-001` | `A` | 1 | `P0` | `DONE` | - | Lock phase-0 boundary contract: compliance-engine is governance/evidence control-plane only, not voice/agent runtime replacement. | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/INDEX.md` | `npm run docs:guard` | Completed 2026-04-01 after boundary lock and docs guard pass. |
| `CENG-002` | `B` | 2 | `P0` | `DONE` | `CENG-001` | Publish deterministic integration runbook for sidecar deployment and fail-closed health checks in NemoClaw/OpenClaw staging. | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/INTEGRATION_GUIDE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/MASTER_PLAN.md` | `npm run docs:guard` | Completed 2026-04-01 with deterministic env contract and operator checklist. |
| `CENG-003` | `C` | 3 | `P0` | `DONE` | `CENG-002` | Add `compliance_knowledge_lookup` as first-class plugin tool and manifest capability so agents can fetch provider dossier facts deterministically. | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/plugin/src/tools.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/plugin/openclaw.plugin.json`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/plugin/src/sidecar-client.ts` | `npm --prefix apps/compliance-engine run typecheck`; `npm --prefix apps/compliance-engine run test`; `npm run docs:guard` | Completed 2026-04-01 with additive tool registration and passing verification suite. |
| `CENG-004` | `C` | 3 | `P0` | `DONE` | `CENG-003` | Add governance API contract tests for readiness export payload used by release gates (`decision`, blockers, evidence counts, timestamp). | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/tests/integration/governance-flow.test.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/server/routes/governance.ts` | `npm --prefix apps/compliance-engine run typecheck`; `npm --prefix apps/compliance-engine run test`; `npm run docs:guard` | Completed 2026-04-01 with release-gate contract tests and fail-closed transfer assertion. |
| `CENG-005` | `D` | 4 | `P0` | `DONE` | `CENG-004` | Publish provider decision dossiers for ElevenLabs/OpenRouter/Hetzner from current knowledge entries and map each to required legal evidence fields. | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/knowledge/providers/elevenlabs.yaml`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/knowledge/providers/openrouter.yaml`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/knowledge/providers/hetzner.yaml` | `npm run docs:guard`; `npm --prefix apps/compliance-engine run typecheck` | Completed 2026-04-01 with evidence-mapped dossiers and fail-closed blocking statuses. |
| `CENG-006` | `D` | 4 | `P0` | `DONE` | `CENG-005` | Publish weekly `GO/NO_GO` export contract and operator handoff linking compliance-engine readiness output to NemoClaw release package (`NCLAW-020`). | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/API_REFERENCE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md` | `npm run docs:guard`; `npm --prefix apps/compliance-engine run test` | Completed 2026-04-01 with blocker-owner/timestamp contract and weekly handoff definition. |
| `CENG-007` | `E` | 5 | `P1` | `BLOCKED` | `CENG-006` | Start generic scanner/autonomy expansion from `SCANNER_PLAN.md` only after phase-0 release gate closes and control-plane lane is stable. | `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/SCANNER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/MASTER_PLAN.md` | `npm run docs:guard` | Status trace 2026-04-01: `BLOCKED -> IN_PROGRESS -> BLOCKED` after hard-gate repair and two self-unblock attempts. Attempt 1: `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md` returned no match. Attempt 2: broader docs scan still reports `External customer-data release: NO_GO`. Hard-gate repair: `npm --prefix apps/compliance-engine rebuild better-sqlite3` on Node `v22.19.0` (`NODE_MODULE_VERSION 127`) with `better-sqlite3@11.10.0`. Verification checkpoint: `typecheck=PASS`; `test=PASS` (93 tests); `docs:guard=PASS`. Owner: `Remington Splettstoesser`. Mitigation: keep lane `E` deferred until explicit post-gate unlock is published. Next command: `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`. |

---

## Current kickoff

- Active task: none (`CENG-007` returned to `BLOCKED` after latest unblock checkpoint).
- Last completed row: `CENG-006`.
- Last evaluated row: `CENG-007` (`BLOCKED -> IN_PROGRESS -> BLOCKED` on 2026-04-01 after hard-gate repair and unlock probes).
- Immediate objective: hold scanner/autonomy expansion until explicit post-gate unlock evidence is published; keep phase-0 control-plane verification green.

---

## Environment hard gate checkpoint (`better-sqlite3`)

Checkpoint date: `2026-04-01`.

1. Runtime diagnosis:
   - `node -v` => `v22.19.0`
   - `node -p "process.versions.modules"` => `127`
   - `npm --prefix apps/compliance-engine ls better-sqlite3` => `better-sqlite3@11.10.0`
2. Applied fix:
   - `npm --prefix apps/compliance-engine rebuild better-sqlite3` => `rebuilt dependencies successfully`
3. Verification results:
   - `npm --prefix apps/compliance-engine run typecheck` => `PASS`
   - `npm --prefix apps/compliance-engine run test` => `PASS` (`13` files, `93` tests)
   - `npm run docs:guard` => `PASS`

---

## External release synthesis snapshot (`NCLAW-020`)

Snapshot date: `2026-04-01`.

Consumer linkage:
1. NemoClaw workstream row `NCLAW-020` consumes this queue as readiness evidence input.
2. This snapshot is documentation linkage only and does not change deterministic execution order in this queue.

Current readiness posture for external consumer:
1. Deterministic `P0` chain (`CENG-001` through `CENG-006`) is `DONE`.
2. `CENG-007` remains `BLOCKED` (verified 2026-04-01 after hard-gate repair; no explicit unlock evidence).
3. Weekly readiness export contract (`CENG-006`) is published for `NCLAW-020` consumption.

Fail-closed implication:
1. External release synthesis can consume the published export, but release remains `NO_GO` whenever exported blockers are unresolved or unowned.
2. Lane `E` stays `BLOCKED` until external synthesis evidence records phase-0 gate closure and explicit unlock.
