# Compliance Engine Phase 0 Governance Execution Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution`  
**Source request date:** 2026-04-01  
**Primary objective:** Convert strategy decisions into deterministic weekly execution rows for `apps/compliance-engine` as a governance/evidence control plane.

---

## Purpose

This workstream is the canonical queue-first planning surface for phase-0 compliance-engine delivery.

It focuses on:

1. strict scope control to avoid runtime duplication,
2. deterministic integration and verification procedures,
3. provider evidence outputs usable by release gates,
4. weekly `GO/NO_GO` export consistency.

---

## Current status

1. Queue-first artifacts are active: `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `MASTER_PLAN.md`, and `INDEX.md`.
2. `CENG-001` is `DONE` and boundary contract language is locked.
3. `CENG-001` through `CENG-006` are `DONE` in deterministic order.
4. `CENG-007` is `BLOCKED` by policy (scanner/autonomy expansion deferred until phase-0 gate closure).
5. Workstream remains explicitly aligned to the runtime split:
   - ElevenLabs/OpenClaw/NemoClaw = runtime lane.
   - compliance-engine = governance/evidence lane.
6. Active queue state is hold: `CENG-007` blocked until explicit unlock.
7. Latest lane `E` checkpoint (2026-04-01) repaired the `better-sqlite3` hard gate, ran two self-unblock attempts, and returned `CENG-007` to `BLOCKED`.

---

## Locked boundary summary (phase-0)

1. compliance-engine scope is strictly governance, evidence, and release-gate control plane.
2. Runtime replacement work is forbidden in this workstream: no telephony runtime, no agent runtime, no inference router replacement.
3. NemoClaw/OpenClaw integration is interface-level only: readiness/evidence outputs consumed by runtime lanes.
4. Uncertain legal/compliance posture must resolve to `NO_GO` with explicit blocker ownership.

---

## Provider Decision Dossiers (CENG-005)

Required legal evidence fields mapped per provider:
1. `dpa_avv`
2. `transfer_mechanism` (when provider is outside EU/EEA)
3. `subprocessor_register`
4. `retention_controls`
5. `data_residency_controls`
6. `incident_notification_path`

Current dossier decisions from `knowledge/providers/*.yaml`:

| Provider | Decision | Evidence-ready fields | Blocking/conditional fields |
|---|---|---|---|
| ElevenLabs | `CONDITIONAL_GO` | DPA endpoint (`https://elevenlabs.io/dpa`), subprocessor/TOM trust center (`https://compliance.elevenlabs.io/`) | Incident notification path `unknown_blocking`; retention/residency require runtime configuration evidence |
| OpenRouter | `CONDITIONAL_NO_GO` | Legal endpoint (`https://openrouter.ai/legal`), EU endpoint routing contract (`https://eu.openrouter.ai/api/v1`) | Subprocessor register `missing_blocking`; incident path `unknown_blocking`; SCC and EU routing controls require evidence |
| Hetzner | `CONDITIONAL_GO` | AVV endpoint (`https://accounts.hetzner.com/avv`), TOM PDF (`https://www.hetzner.com/AV-Vertrag/TOM.pdf`), subprocessor register | Retention controls `unknown_blocking`; incident notification path `unknown_blocking` |

Fail-closed rule for release gate:
1. Any `missing_blocking` or `unknown_blocking` field keeps readiness at `NO_GO` until owner and mitigation evidence are attached.

---

## Weekly Export Contract (CENG-006)

Published readiness export contract for NemoClaw release package `NCLAW-020`:
1. Source endpoint: `GET /api/v1/governance/readiness`.
2. Required fields: `decision`, `blockers[*].owner`, `evidence_count`, `generated_at`, `timestamp`.
3. Handoff rule: attach readiness payload and evidence artifacts to weekly package.
4. Fail-closed rule: unresolved blockers or `owner=unassigned` keeps release at `NO_GO`.

---

## Lane E Hold Checkpoint (CENG-007)

Checkpoint date: `2026-04-01`.

1. Status trace: `BLOCKED -> IN_PROGRESS -> BLOCKED`.
2. Hard-gate diagnosis: `node -v` => `v22.19.0`; `node -p "process.versions.modules"` => `127`; `npm --prefix apps/compliance-engine ls better-sqlite3` => `better-sqlite3@11.10.0`.
3. Hard-gate repair command: `npm --prefix apps/compliance-engine rebuild better-sqlite3` (`rebuilt dependencies successfully`).
4. Attempt 1 result: `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md` returned no explicit unlock match.
5. Attempt 2 result: broader docs scan still shows external customer-data release as `NO_GO`.
6. Verification checkpoint: `npm --prefix apps/compliance-engine run typecheck` `PASS`; `npm --prefix apps/compliance-engine run test` `PASS` (`13` files, `93` tests); `npm run docs:guard` `PASS`.
7. Block owner: `Remington Splettstoesser`.
8. Mitigation: keep scanner/autonomy expansion deferred until explicit post-gate unlock appears.
9. Exact next command: `rg -n "External customer-data release: GO|phase-0 launch gate closure|explicit post-gate unlock" apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`.

---

## Core files

- Queue: `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/MASTER_PLAN.md`
- Workstream index: `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/INDEX.md`

---

## Operating commands

- `npm run docs:guard`
- `npm --prefix apps/compliance-engine run typecheck`
- `npm --prefix apps/compliance-engine run test`
