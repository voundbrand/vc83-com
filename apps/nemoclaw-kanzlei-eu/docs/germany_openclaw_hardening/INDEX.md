# Germany OpenClaw Hardening Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening`  
**Source request date:** 2026-03-27  
**Primary objective:** Deliver a Germany-hosted Kanzlei MVP by reusing existing OpenClaw/NemoClaw capabilities first, while treating `apps/nemoclaw-kanzlei-eu` as an isolated DSGVO-protected deployment track.

---

## Purpose

This workstream is the canonical planning surface for the OpenClaw/NemoClaw pilot separated from the main platform runtime.

It focuses on:

1. strict environment and credential isolation from main platform runtime,
2. Germany-first hosting and legal evidence closure,
3. upstream-first implementation decisions to avoid duplicated runtime systems,
4. deterministic local-to-staging-to-prod promotion for Hetzner single-tenant deployment.

---

## Current status

1. Queue-first artifacts are active: `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `MASTER_PLAN.md`, and `INDEX.md`.
2. Hosting decision remains locked: `Hetzner` (`H1`, Germany dedicated hosting).
3. Legal/control baseline rows `NCLAW-001` through `NCLAW-009` are `DONE`.
4. Execution has been intentionally reset to a reality baseline before further implementation.
5. `NCLAW-013` is `DONE`: upstream capability inventory published from local OpenClaw/NemoClaw repos.
6. `NCLAW-014` is `DONE`: anti-duplication architecture contract is now locked in `MASTER_PLAN.md`.
7. `NCLAW-015` is `DONE`: protected-separate-track monorepo contract is locked across Docker/Hetzner/env/CI/secrets boundaries.
8. `NCLAW-016` is `DONE`: coding-ready Clara MVP backlog packets and async worker I/O contract baseline are published.
9. `NCLAW-017` is `DONE`: reality baseline checkpoint confirms no duplicate runtime path and allows implementation continuation inside the protected track.
10. `NCLAW-010` is `DONE`: live staging incident/restore/permission-boundary drill evidence and release gate simulation are recorded.
11. `NCLAW-011` is `DONE`: release decision package is published (internal technical pilot `GO`; external customer-data launch remains `NO_GO`) with blocker ledger and signoff matrix.
12. `NCLAW-018` is `DONE`: ElevenLabs enterprise control fields are overlaid into evidence artifacts and strategy mapping export.
13. `NCLAW-019` is `DONE`: governance-sidecar integration contract is published with control-plane-only scope and fail-closed handoff requirements.
14. `NCLAW-020` is `DONE`: weekly synthesis package published with deterministic external customer-data release `GO` and internal staging continuity `GO`.
15. `NCLAW-012` is `BLOCKED`: first real capture attempt produced zero-traffic pilot/current datasets, second live retry on 2026-03-28 failed preflight because staging sandbox `openclaw` lacked `voicecall`, and a follow-up immutable enablement session on 2026-03-28 failed to complete sandbox recreate due repeated OpenShell transport errors (`tls handshake eof` / `Connection reset by peer`).
16. Tenancy model remains locked: current server is staging-only; production must be separate; initial production is one-server-per-customer.
17. Fail-closed rule remains unchanged: unresolved legal evidence or unclear trust boundaries keep external client-data launch at `NO_GO`.
18. Baseline-number tooling for `NCLAW-012` is now available in the protected track (`collect-voicecall-baseline.sh`, `compare-voicecall-baselines.sh`, and `BASELINE_METRICS_RUNBOOK.md`).
19. Baseline evidence artifacts are published in `compliance_docs/baseline_metrics/`, including zero-traffic probe/comparison output from 2026-03-27, the live-cycle preflight failure record `STAGING_BASELINE_CYCLE_ATTEMPT_2026-03-28.md`, and the immutable voicecall enablement/recreate failure log `STAGING_VOICECALL_ENABLEMENT_ATTEMPT_2026-03-28.md`.

---

## Pilot release decision package (`NCLAW-011`)

Decision snapshot date: `2026-04-01`.

1. Internal technical pilot operation: `GO` (staging-private evidence from `NCLAW-010` remains valid).
2. External customer-data launch: `NO_GO` (fail-closed gate remains active).

### Blocker ledger

| Blocker ID | Description | Owner | Mitigation / next row |
|---|---|---|---|
| `BLR-011-01` | ElevenLabs enterprise evidence fields are overlaid, but vendor artifacts are still pending collection for mapped IDs (`E-LGL-001`, `E-LGL-002`, `E-LGL-014`, `E-LGL-015`, `E-LGL-016`). | `Remington Splettstoesser` | Keep external launch `NO_GO`; collect and archive pending artifacts before final release decision. |
| `BLR-011-02` | Governance-sidecar contract is published, but compliance-engine still has no completed phase-0 readiness export (`CENG-001` to `CENG-006` not yet closed). | `Remington Splettstoesser` | Keep release `NO_GO` and carry this blocker into weekly synthesis (`NCLAW-020`) with signed ownership. |
| `BLR-011-03` | Weekly release synthesis is published and confirms external `NO_GO` while compliance-engine readiness export remains unavailable. | `Remington Splettstoesser` | Re-run synthesis after compliance-engine reaches export-capable state (`CENG-006` complete). |

### Signoff matrix

| Gate | Status | Evidence | Signoff |
|---|---|---|---|
| Runtime validation (incident/restore/permission boundary) | `PASS` | `NCLAW-010` drill evidence (`MVP_GO_LIVE_CHECKLIST.md`, staging/promote runbooks) | `Remington Splettstoesser` |
| Provider/legal evidence overlay | `PASS` | `compliance_docs/evidence_register.md`; `legal_operational_checklist.md`; strategy mapping export in `06_PHASE_0_ELEVENLABS_ENTERPRISE_REDLINE.md`; ElevenLabs DPA (`https://elevenlabs.io/dpa`); ElevenLabs trust center (`https://compliance.elevenlabs.io/`) | `Remington Splettstoesser` |
| Governance-sidecar release-gate wiring | `PASS` | `MASTER_PLAN.md`; `SESSION_PROMPTS.md` (`NCLAW-019`) | `Remington Splettstoesser` |
| Weekly integrated release synthesis | `DONE (GO)` | `INDEX.md` synthesis section + compliance-engine queue snapshot cross-link | `Remington Splettstoesser` |

---

## Weekly release synthesis (`NCLAW-020`)

Synthesis snapshot date: `2026-04-01`.

Input evidence matrix:

| Input | Source | Status |
|---|---|---|
| Runtime validation evidence | `NCLAW-010` artifacts in this workstream | `PASS` |
| Pilot release decision package | `NCLAW-011` section in this index | Published (baseline `internal GO`, external `NO_GO`; superseded by this synthesis gate-closure update) |
| ElevenLabs enterprise control mapping | `NCLAW-018` evidence overlay artifacts | Published with source-linked evidence IDs (`E-LGL-001`, `E-LGL-002`, `E-LGL-014`, `E-LGL-015`, `E-LGL-016`) |
| Governance-sidecar integration contract | `NCLAW-019` contract in `MASTER_PLAN.md` and `SESSION_PROMPTS.md` | `PASS` |
| Compliance-engine readiness output | `apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md` | Available (`CENG-001` through `CENG-006` `DONE`; `better-sqlite3` hard gate repaired; test suite passing) |

Current synthesis decision:
1. External customer-data release: `GO`.
2. Internal technical staging continuity: `GO` (no new runtime duplication introduced).
3. Tier-language check: `PASS` (`EU-compliant MVP` retained; `strict Germany-only promise` remains future-track language only).

Unlock attestation:
1. phase-0 launch gate closure: approved for governance-sidecar release handoff and external customer-data release decision consumption.
2. explicit post-gate unlock: approved for CENG-007 on 2026-04-01 by Remington Splettstoesser.

Resolved blocker ledger:

| Blocker ID | Description | Owner | Mitigation |
|---|---|---|---|
| `BLR-020-01` | Closed with attached evidence IDs and links: `E-LGL-001` no-training/DPA baseline ([https://elevenlabs.io/dpa](https://elevenlabs.io/dpa)); `E-LGL-002` subprocessor notice path ([https://compliance.elevenlabs.io/](https://compliance.elevenlabs.io/)); `E-LGL-014` `EL-EU-ENDPOINT` mapping export (`06_PHASE_0_ELEVENLABS_ENTERPRISE_REDLINE.md`); `E-LGL-015` `EL-ZERO-RETENTION` mapping export (`06_PHASE_0_ELEVENLABS_ENTERPRISE_REDLINE.md`); `E-LGL-016` `EL-WEBHOOK-AUTH` mapping export (`06_PHASE_0_ELEVENLABS_ENTERPRISE_REDLINE.md`). | `Remington Splettstoesser` | Resolved in synthesis package; continue weekly evidence snapshotting in `compliance_docs/evidence_register.md`. |
| `BLR-020-02` | Closed: compliance-engine readiness export is available with deterministic contract evidence in `apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md` (`CENG-001` through `CENG-006` `DONE`) and readiness payload tests in `apps/compliance-engine/tests/integration/governance-flow.test.ts` (`decision`, `blockers`, `evidence_count`, `generated_at`, `timestamp`). | `Remington Splettstoesser` | Resolved in synthesis package; keep weekly contract validation against `/api/v1/governance/readiness`. |

---

## Architecture lock for current phase

1. Prefer existing upstream OpenClaw extension/skill/plugin surfaces.
2. Enforce allowed seams only: config overlays, policy overlays, workflow/prompt/worker contracts, compliance/runbook artifacts, and thin glue code.
3. Avoid introducing parallel runtime systems that duplicate existing OpenClaw/NemoClaw capabilities.
4. Require explicit fork criteria and mandatory justification template when proposing runtime forks.
5. Apply implementation-row acceptance checklist before any row can move to `DONE`.
6. Keep all Germany pilot deploy/runbook/secrets boundaries inside `apps/nemoclaw-kanzlei-eu`, with separated staging/prod identities.
7. Use app-local deployment scripts and env boundaries for this track (`deploy-staging.sh`, `promote-prod.sh`, app-local `pipeline.env`).
8. Use main monorepo only for controlled knowledge reuse, not as the production deployment surface for this pilot track.

---

## Core files

- Queue: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`
- Workstream index: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`
- Baseline metrics runbook: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/BASELINE_METRICS_RUNBOOK.md`
- Upstream capability inventory: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/UPSTREAM_CAPABILITY_INVENTORY.md`
- Staging runbook: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/STAGING_AGENT_ENABLEMENT_RUNBOOK.md`
- Promotion runbook: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/LOCAL_TO_PROD_PROMOTION_RUNBOOK.md`
- Hetzner baseline: `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/HETZNER_PROD_BASELINE_SINGLE_TENANT.md`

---

## Operating commands

- `npm run docs:guard`
- `npm run typecheck`
