# Compliance Engine Phase 0 Governance Execution Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution`  
**Last updated:** 2026-04-01

---

## Objective

Deliver a phase-0 launch-ready compliance control plane for legal-sector deployments while preserving upstream-first runtime decisions:

1. Keep ElevenLabs/OpenClaw/NemoClaw as the voice/agent runtime lane.
2. Keep compliance-engine as governance, evidence, and release-gate infrastructure.
3. Prevent scope creep into runtime replacement work.
4. Produce deterministic `GO/NO_GO` exports for weekly release decisions.

---

## Execution mode decisions (locked)

1. Runtime lane: externalized/white-labeled (`ElevenLabs` + upstream `OpenClaw/NemoClaw`).
2. Compliance-engine lane: internal control-plane (`provider evidence`, `readiness`, `audit`, `documents`).
3. Fail-closed rule: missing legal evidence or uncertain residency/retention posture forces `NO_GO`.
4. Phase-0 scope excludes generic autonomous scanner rollout.

---

## Non-negotiable principles

1. No duplicate telephony, no duplicate agent orchestrator, no duplicate inference router.
2. Provider claims must map to evidence fields (DPA, subprocessors, retention, residency, incident path).
3. Every release recommendation must be timestamped and include blocker ownership.
4. Queue-first deterministic execution governs all work in this folder.

---

## CENG-001 boundary contract lock

Allowed phase-0 scope:
1. Governance decisioning (`GO/NO_GO`) and fail-closed release-gate outputs.
2. Provider evidence ingestion, evidence-gap visibility, and dossier generation.
3. Integration docs for NemoClaw/OpenClaw consumption of sidecar readiness only.

Explicitly out of scope for this workstream:
1. Building or replacing telephony runtime components.
2. Building or replacing agent orchestration/runtime execution paths.
3. Building or replacing inference routing/model runtime services.

Interface contract with runtime lanes:
1. ElevenLabs/OpenClaw/NemoClaw remain the runtime lanes of record.
2. compliance-engine exports governance/evidence/readiness outputs only.
3. Runtime path changes are prohibited except documentation of control-plane interfaces consumed by runtime lanes.

---

## Weekly delivery target (week of 2026-04-01)

1. Lock scope boundary (`CENG-001`).
2. Publish runbook-level integration contract (`CENG-002`).
3. Complete plugin/API control-plane finishing work (`CENG-003`, `CENG-004`).
4. Produce evidence-dossier and release-export contract (`CENG-005`, `CENG-006`).

---

## Milestones

1. Milestone 1 (`CENG-001`): scope and boundary contract lock.
2. Milestone 2 (`CENG-002`): deterministic integration runbook lock.
3. Milestone 3 (`CENG-003` to `CENG-004`): plugin/API control-plane readiness.
4. Milestone 4 (`CENG-005` to `CENG-006`): provider evidence outputs + release-gate export.
5. Milestone 5 (`CENG-007`): deferred autonomy/scanner expansion (post phase-0 gate).

Milestone status sync:
1. Milestone 1 (`CENG-001`) is `DONE` on 2026-04-01.
2. Milestone 2 (`CENG-002`) is `DONE` on 2026-04-01.
3. Milestone 3 row `CENG-003` is `DONE` on 2026-04-01.
4. Milestone 3 row `CENG-004` is `DONE` on 2026-04-01.
5. Milestone 4 row `CENG-005` is `DONE` on 2026-04-01.
6. Milestone 4 row `CENG-006` is `DONE` on 2026-04-01.
7. Milestone 5 (`CENG-007`) remains `BLOCKED` pending explicit post-gate unlock, with latest checkpoint trace `BLOCKED -> IN_PROGRESS -> BLOCKED` on 2026-04-01 after hard-gate repair.

---

## Lane E hold checkpoint (2026-04-01)

1. Hard-gate diagnosis: `node -v` => `v22.19.0`; `node -p "process.versions.modules"` => `127`; `npm --prefix apps/compliance-engine ls better-sqlite3` => `better-sqlite3@11.10.0`.
2. Hard-gate repair: `npm --prefix apps/compliance-engine rebuild better-sqlite3` completed successfully.
3. Self-unblock attempt 1: `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md` returned no explicit unlock.
4. Self-unblock attempt 2: broader docs scan still reports external customer-data release as `NO_GO`.
5. Verification checkpoint: `npm --prefix apps/compliance-engine run typecheck` `PASS`; `npm --prefix apps/compliance-engine run test` `PASS` (`13` files, `93` tests); `npm run docs:guard` `PASS`.
6. Block owner: `Remington Splettstoesser` (release synthesis owner in NemoClaw governance docs).
7. Exact next command before promoting `CENG-007`: `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`.

---

## Gate policy

`GO` is allowed only when all are true:

1. Provider evidence fields for active critical providers are complete or explicitly accepted with owner/date.
2. Readiness output contains no unresolved blocker without mitigation owner.
3. Tier language in customer-facing artifacts is aligned (`EU-compliant` vs `Germany-only`).
4. Weekly readiness export includes blocker ownership and generation timestamp for release package traceability.

Otherwise: `NO_GO`.
