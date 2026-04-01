# Compliance Engine Phase 0 Governance Execution Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally.
2. Lane `A` must complete before lane `B` starts.
3. Lane `C` starts only after lane `B` `P0` completion.
4. Lane `D` starts only after lane `C` `P0` completion.
5. Lane `E` remains `BLOCKED` until phase-0 launch gate closure.
6. Fail-closed policy is mandatory; uncertain provider posture remains blocking.

---

## Deterministic execution order contract

Use this algorithm for every row transition:

1. Filter rows by priority: `P0` first, then `P1`.
2. Within selected priority, choose rows with all dependencies `DONE`.
3. If multiple rows are eligible, pick lowest numeric task ID.
4. Move exactly one row to `IN_PROGRESS`.
5. Apply row changes and run all `Verify` commands.
6. If verification passes, move row to `DONE`.
7. If blocked, move row to `BLOCKED` and record owner + mitigation.
8. Recompute dependency promotions after each transition.

Current deterministic path:

1. `CENG-001` (`DONE`)
2. `CENG-002` (`DONE`)
3. `CENG-003` (`DONE`)
4. `CENG-004` (`DONE`)
5. `CENG-005` (`DONE`)
6. `CENG-006` (`DONE`)
7. `CENG-007` (`BLOCKED`)

Current row focus: `CENG-007` remains `BLOCKED` after latest checkpoint trace `BLOCKED -> IN_PROGRESS -> BLOCKED` (2026-04-01); hard gate is repaired (`better-sqlite3` rebuilt, `typecheck/test/docs:guard` all pass), but unlock still requires explicit post-gate evidence.

Hard-gate verification snapshot:
1. Node runtime: `v22.19.0` (`NODE_MODULE_VERSION 127`).
2. Native module: `better-sqlite3@11.10.0`.
3. Applied command: `npm --prefix apps/compliance-engine rebuild better-sqlite3`.

---

## Prompt A (Lane A: boundary contract)

You are executing lane `A` for compliance-engine phase-0 scope control.

Tasks:
1. Keep scope explicitly limited to governance/evidence/release-gate duties.
2. Keep anti-duplication language explicit relative to ElevenLabs/OpenClaw runtime lanes.

Requirements:
1. No runtime replacement proposals.
2. Run `npm run docs:guard`.

---

## Prompt B (Lane B: deployment integration)

You are executing lane `B` for deterministic integration runbooks.

Tasks:
1. Define sidecar deployment contract and health-check procedures.
2. Define fail-closed behavior when sidecar/readiness endpoints are unavailable.

Requirements:
1. Keep operator steps deterministic and testable.
2. Run `npm run docs:guard`.

---

## Prompt C (Lane C: plugin and API implementation)

You are executing lane `C` for control-plane implementation completion.

Tasks:
1. Add missing governance-facing plugin capabilities needed for operator workflows.
2. Add API contract tests for readiness export consumers.

Requirements:
1. Preserve additive compatibility.
2. Run `npm --prefix apps/compliance-engine run typecheck` and `npm --prefix apps/compliance-engine run test`.
3. Run `npm run docs:guard`.

---

## Prompt D (Lane D: evidence outputs)

You are executing lane `D` for provider evidence and release-export outputs.

Tasks:
1. Keep provider decision dossiers current and source-grounded.
2. Publish weekly `GO/NO_GO` export contract for release-gate consumers.
3. Link weekly readiness export handoff to NemoClaw release package `NCLAW-020`.

Requirements:
1. Unknown or unsupported claims must fail closed to blocker status.
2. Readiness export schema must include blocker ownership and generation timestamp.
3. `NO_GO` payloads must include actionable blocker owner and mitigation handoff.
4. Run `npm run docs:guard` and row-specific verification commands.

---

## Prompt E (Lane E: deferred scanner expansion)

You are executing lane `E` only after phase-0 gate closure.

Tasks:
1. Decompose scanner/autonomy expansion from `SCANNER_PLAN.md` into small chunks.
2. Preserve current launch-critical stability while expanding autonomy features.

Requirements:
1. Keep `CENG-007` blocked until explicit gate unlock.
2. Run `npm run docs:guard`.
3. Before any promotion to `READY`, run `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`; if no matching unlock evidence is found, keep row `BLOCKED`.
