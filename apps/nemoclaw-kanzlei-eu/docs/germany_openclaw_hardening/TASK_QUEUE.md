# Germany-First OpenClaw Kanzlei Pilot Task Queue

**Last updated:** 2026-04-01  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening`  
**Source request:** Convert the ElevenLabs Enterprise strategy decision into deterministic next-week execution rows for `apps/nemoclaw-kanzlei-eu` and `apps/compliance-engine`, while preserving upstream-first and fail-closed contracts.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally.
3. Promote `PENDING` to `READY` only when every dependency is `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must execute the commands in `Verify` before status can move to `DONE`.
6. Fail-closed policy is mandatory: unresolved legal evidence, unknown subprocessors, or incomplete hardening keeps release at `NO_GO`.
7. Pilot runtime must stay isolated from main-platform credentials and mutable production infrastructure.
8. Upstream-first rule: use existing OpenClaw extensions/plugins/skills before introducing custom code.
9. `apps/nemoclaw-kanzlei-eu` remains the isolated delivery root (Docker + Hetzner + env + deploy scripts) for this track.
10. Keep `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` synchronized at each milestone close.
11. Every new implementation row must satisfy the acceptance checklist defined in this queue and in `MASTER_PLAN.md`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Planning contract and Germany legal control baseline | Workstream docs only | No runtime code edits |
| `B` | Hosting and isolation architecture decisions | Infra docs and runbooks | Avoid app feature scope |
| `C` | OpenClaw runtime hardening blueprint | Runtime/security docs | No legal policy edits |
| `D` | Data locality, retention, and incident readiness model | Data governance docs | Avoid runtime internals |
| `E` | Provider/legal evidence closure package | Compliance docs and checklists | No runtime config changes |
| `G` | Upstream capability mapping and anti-duplication architecture lock | OpenClaw capability inventory + integration contract docs | Required before custom runtime forks |
| `F` | Validation, release gate, and pilot launch sequence | Validation and rollout docs | Starts only after lane `G` `P0` closure |

---

## Dependency graph

```text
NCLAW-001 -> NCLAW-002 -> NCLAW-003 -> NCLAW-004 -> NCLAW-005 -> NCLAW-006 -> NCLAW-007 -> NCLAW-008 -> NCLAW-009 -> NCLAW-013 -> NCLAW-014 -> NCLAW-015 -> NCLAW-016 -> NCLAW-017 -> NCLAW-010 -> NCLAW-011 -> NCLAW-018 -> NCLAW-019 -> NCLAW-020
```

## Critical path

1. `NCLAW-001`
2. `NCLAW-002`
3. `NCLAW-003`
4. `NCLAW-004`
5. `NCLAW-005`
6. `NCLAW-006`
7. `NCLAW-007`
8. `NCLAW-008`
9. `NCLAW-009`
10. `NCLAW-013`
11. `NCLAW-014`
12. `NCLAW-015`
13. `NCLAW-016`
14. `NCLAW-017`
15. `NCLAW-010`
16. `NCLAW-011`
17. `NCLAW-018`
18. `NCLAW-019`
19. `NCLAW-020`

---

## Dependency-based status flow

1. Lane `A` must be `DONE` before lane `B` starts.
2. Lane `C` and lane `D` can start after `NCLAW-004` is `DONE`.
3. Lane `E` starts after `NCLAW-006` and `NCLAW-007` are `DONE`.
4. Lane `G` starts only after lane `E` `P0` rows are `DONE`.
5. Lane `F` starts only after lane `G` `P0` rows are `DONE`.
6. Any unresolved lane `E` legal evidence row forces lane `F` release rows to remain `BLOCKED`.

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

## Implementation row acceptance checklist (`NCLAW-014` contract)

Any new implementation row must include or reference:

1. Reuse-order decision trace (core -> extension -> skill -> NemoClaw seam -> local overlay -> fork only if justified).
2. At least one concrete upstream surface path from `UPSTREAM_CAPABILITY_INVENTORY.md`.
3. Allowed seam declaration (`config overlay`, `policy overlay`, `workflow/prompt/worker contract`, `compliance/runbook`, or `thin glue`).
4. Explicit `no parallel systems` check result (`PASS` required for `DONE`).
5. Fork disposition: `FORK_NOT_REQUIRED` or full fork justification template.
6. Protected-track boundary confirmation for `apps/nemoclaw-kanzlei-eu`.
7. Verify commands and completion evidence.
8. Deterministic status trace in notes (`READY -> IN_PROGRESS -> DONE` or `BLOCKED` with mitigation).

Rows missing checklist evidence remain `BLOCKED`.

---

## NCLAW-016 coding-ready backlog packets

Execution packets published by `NCLAW-016` (upstream-first, no specialist telephony handoffs):

| Packet | Depends On | Scope | Upstream seams | Primary files | Verify |
|---|---|---|---|---|---|
| `CLARA-B01` | `NCLAW-017` | Configure Clara intake call path on upstream `voice-call` + `elevenlabs` surfaces with callback capture only. | `openclaw/extensions/voice-call`; `openclaw/extensions/elevenlabs`; `openclaw/skills/voice-call` | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/voice-call/`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/skills/voice-call/` | `npm run docs:guard` |
| `CLARA-B02` | `CLARA-B01` | Implement async intake packet writer and schema validation adapter. | OpenClaw plugin/skill tool interface + NemoClaw policy model | `/Users/foundbrand_001/Development/vc83-com/docs/agentic-system/KANZLEI_ASSISTANT_MVP_TOPOLOGY.md` | `npm run docs:guard`; `npm run typecheck` |
| `CLARA-B03` | `CLARA-B02` | Implement async triage/brief worker flow with contract-bound output packet. | OpenClaw AgentSkills orchestration surfaces | `/Users/foundbrand_001/Development/vc83-com/docs/agentic-system/KANZLEI_ASSISTANT_MVP_TOPOLOGY.md` | `npm run docs:guard`; `npm run typecheck` |
| `CLARA-B04` | `CLARA-B03` | Implement callback scheduling action from async decision output (`ready_for_lawyer`/`needs_followup`). | Existing callback/task execution surfaces in OpenClaw/NemoClaw | `/Users/foundbrand_001/Development/vc83-com/docs/agentic-system/KANZLEI_ASSISTANT_MVP_TOPOLOGY.md` | `npm run docs:guard`; `npm run typecheck` |
| `CLARA-B05` | `CLARA-B04` | Run synthetic end-to-end intake->async->callback validation and capture evidence for lane `F` handoff. | Existing staging runbook + runtime evidence artifacts | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/STAGING_AGENT_ENABLEMENT_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/runtime_evidence_2026-03-27_private_live.md` | `npm run docs:guard`; `npm run typecheck` |

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `NCLAW-001` | `A` | 1 | `P0` | `DONE` | - | Initialize Germany-only workstream docs and index for isolated NemoClaw/OpenClaw planning. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-002` | `A` | 1 | `P0` | `DONE` | `NCLAW-001` | Finalize hosting decision matrix and select pilot target architecture. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md` | `npm run docs:guard` | Done 2026-03-27. Hetzner `H1` selected. |
| `NCLAW-003` | `A` | 1 | `P0` | `DONE` | `NCLAW-002` | Map mandatory legal requirements into explicit evidence artifacts for release gating. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-004` | `B` | 2 | `P0` | `DONE` | `NCLAW-003` | Define hard isolation boundary from main platform runtime and credentials. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/SESSION_PROMPTS.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-005` | `B` | 2 | `P0` | `DONE` | `NCLAW-004` | Publish host hardening baseline (OS, patching, SSH, logging, backup). | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-006` | `C` | 3 | `P0` | `DONE` | `NCLAW-005` | Define OpenClaw runtime hardening profile with deny-by-default tools and egress allowlists. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/SESSION_PROMPTS.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-007` | `D` | 4 | `P0` | `DONE` | `NCLAW-005` | Define Germany-only data plane policy (DB, backups, logs, key residency, deletion). | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-008` | `E` | 5 | `P0` | `DONE` | `NCLAW-006`, `NCLAW-007` | Build provider evidence pack: AVV/DPA chain, TOM mapping, transfer basis, subprocessors. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/subprocessor_inventory.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-009` | `E` | 5 | `P0` | `DONE` | `NCLAW-008` | Produce legal-operational checklist for Kanzlei confidentiality, incident response, and governance controls. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/legal_operational_checklist.md` | `npm run docs:guard` | Done 2026-03-27. |
| `NCLAW-013` | `G` | 6 | `P0` | `DONE` | `NCLAW-009` | Build upstream capability inventory from local OpenClaw/NemoClaw repos (`extensions`, `skills`, plugin contracts), explicitly including ElevenLabs and voice-call surfaces. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/extensions/`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw/skills/`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/UPSTREAM_CAPABILITY_INVENTORY.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md` | `npm run docs:guard` | Done 2026-03-27. Inventory published in `UPSTREAM_CAPABILITY_INVENTORY.md`. |
| `NCLAW-014` | `G` | 6 | `P0` | `DONE` | `NCLAW-013` | Publish anti-duplication architecture contract: upstream-first reuse order, allowed customization seams, and explicit “no parallel systems” rules. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/UPSTREAM_CAPABILITY_INVENTORY.md` | `npm run docs:guard` | Done 2026-03-27. Status trace: `READY -> IN_PROGRESS -> DONE`. Contract lock published in `MASTER_PLAN.md` with fork criteria/template and row acceptance checklist. |
| `NCLAW-015` | `G` | 6 | `P0` | `DONE` | `NCLAW-014` | Lock monorepo separation contract for `apps/nemoclaw-kanzlei-eu`: Docker, Hetzner, env, CI, and secrets boundaries. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/LOCAL_TO_PROD_PROMOTION_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/STAGING_AGENT_ENABLEMENT_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md` | `npm run docs:guard` | Done 2026-03-27. Status trace: `READY -> IN_PROGRESS -> DONE`. Docker/Hetzner/env/CI/secrets boundaries locked for protected track. |
| `NCLAW-016` | `G` | 6 | `P0` | `DONE` | `NCLAW-015` | Create implementation backlog for Clara MVP using existing OpenClaw surfaces and existing ElevenLabs assets, with async worker I/O contracts and no specialist telephony handoffs. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/docs/agentic-system/KANZLEI_ASSISTANT_MVP_TOPOLOGY.md` | `npm run docs:guard` | Done 2026-03-27. Status trace: `PENDING -> READY -> IN_PROGRESS -> DONE`. Coding-ready packets `CLARA-B01` to `CLARA-B05` published with async I/O contract and no specialist handoff rule. |
| `NCLAW-017` | `G` | 6 | `P0` | `DONE` | `NCLAW-016` | Finalize “reality baseline” go/no-go checkpoint confirming no duplicate runtime path before resuming implementation changes. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md` | `npm run docs:guard` | Done 2026-03-27. Status trace: `PENDING -> READY -> IN_PROGRESS -> DONE`. Baseline checkpoint result: `GO` for implementation inside protected track, external launch still `NO_GO`. |
| `NCLAW-010` | `F` | 7 | `P0` | `DONE` | `NCLAW-017` | Execute pilot validation runbook: incident drill, restore drill, permission-boundary tests, and release gate simulation. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MVP_GO_LIVE_CHECKLIST.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/STAGING_AGENT_ENABLEMENT_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/LOCAL_TO_PROD_PROMOTION_RUNBOOK.md` | `npm run docs:guard`; `npm run typecheck` | Done 2026-03-27. Status trace: `PENDING -> READY -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> DONE`. Live staging drill evidence captured: incident action (`nemoclaw stop`), permission-boundary outputs (127.0.0.1 port bind + firewall snapshot + policy deny log), deterministic restore by immutable redeploy (`deploy-staging.sh --skip-build`). Release gate simulation result: external mode remains `NO_GO` pending legal provider evidence closure. |
| `NCLAW-011` | `F` | 7 | `P0` | `DONE` | `NCLAW-010` | Publish pilot release decision package (`GO` or `NO_GO`) with blocker ledger and signoff matrix. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md` | `npm run docs:guard` | Done 2026-04-01. Status trace: `READY -> IN_PROGRESS -> DONE`. Decision package published in `INDEX.md`: internal technical pilot `GO`, external customer-data launch `NO_GO`; blocker ledger + signoff matrix documented with owner and next-row mitigations. |
| `NCLAW-018` | `E` | 8 | `P0` | `DONE` | `NCLAW-011` | Overlay ElevenLabs Enterprise controls into provider evidence artifacts: isolated-EU endpoint, Zero Retention policy state, no-training clause evidence, webhook authenticity controls, and subprocessor notice path. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/legal_operational_checklist.md`; `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/phase-0-kanzlei/06_PHASE_0_ELEVENLABS_ENTERPRISE_REDLINE.md` | `npm run docs:guard` | Done 2026-04-01. Status trace: `READY -> IN_PROGRESS -> DONE`. Reuse-order decision: preserve upstream `voice-call` + `elevenlabs` surfaces, apply `compliance/runbook` seam only. No parallel systems check: `PASS`. Fork disposition: `FORK_NOT_REQUIRED`. |
| `NCLAW-019` | `G` | 8 | `P0` | `DONE` | `NCLAW-018` | Publish governance-sidecar integration contract for `apps/compliance-engine` as control-plane/evidence layer only (explicitly not telephony/runtime replacement), including fail-closed release-gate wiring. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md` | `npm run docs:guard` | Done 2026-04-01. Status trace: `READY -> IN_PROGRESS -> DONE`. Integration contract published with control-plane-only boundary, required readiness payload fields, and fail-closed synthesis wiring. No parallel systems check: `PASS`. Fork disposition: `FORK_NOT_REQUIRED`. |
| `NCLAW-020` | `F` | 8 | `P0` | `DONE` | `NCLAW-019` | Execute weekly release synthesis package: combine NemoClaw legal/runtime evidence with compliance-engine readiness output and publish deterministic `GO/NO_GO` decision + blocker ledger. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md` | `npm run docs:guard` | Done 2026-04-01. Status trace: `READY -> IN_PROGRESS -> DONE`. Synthesis result: external release `NO_GO`, internal staging continuity `GO`, tier-language check `PASS` (`EU-compliant MVP` vs `strict Germany-only promise`). Blocker ledger with owner/mitigation published in `INDEX.md`, including compliance-engine readiness gap from `apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md`. |
| `NCLAW-012` | `F` | 7 | `P1` | `BLOCKED` | `NCLAW-010` | Benchmark pilot throughput/latency versus current platform path and document migration recommendation. | `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/BASELINE_METRICS_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/baseline_metrics/STAGING_CAPTURE_PROBE_2026-03-27.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/baseline_metrics/STAGING_BASELINE_CYCLE_ATTEMPT_2026-03-28.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/baseline_metrics/STAGING_VOICECALL_ENABLEMENT_ATTEMPT_2026-03-28.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/baseline_metrics/comparisons/20260327T202726Z/COMPARISON.md`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/run-voicecall-baseline-cycle.sh`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/collect-voicecall-baseline.sh`; `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/compare-voicecall-baselines.sh` | `npm run docs:guard` | Status trace: `READY -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> BLOCKED -> IN_PROGRESS -> BLOCKED` (2026-03-28 enablement/redeploy session with consented number `+4939734409994`, synthetic-only prompts). Immutable voicecall enablement attempts did not produce a stable staging sandbox: multiple `nemoclaw onboard` rebuild/recreate runs failed with OpenShell transport errors (`tls handshake eof`, `Connection reset by peer`) during sandbox create after image upload; `openclaw --help` voicecall verification could not be executed. Current-path `calls.jsonl` source is still unavailable in this workspace. Owner: `Remington Splettstoesser`. Mitigation: (1) stabilize gateway/sandbox create path until `openshell sandbox list` and `nemoclaw sevenlayers-legal-eu status` are healthy; (2) complete immutable `@openclaw/voice-call` enablement and verify `openclaw --help` exposes `voicecall`; (3) provide absolute current-path `calls.jsonl` source; (4) rerun `run-voicecall-baseline-cycle.sh --confirm-live` with matched non-zero pilot/current datasets and publish comparator artifacts. |

---

## Current kickoff

- Active task: `NCLAW-012` (`BLOCKED`).
- Last completed row: `NCLAW-020` (weekly release synthesis package published; external release remains `NO_GO`).
- Immediate objective: preserve fail-closed posture and unblock `NCLAW-012` by stabilizing staging gateway/sandbox create path and voicecall verification preconditions.
