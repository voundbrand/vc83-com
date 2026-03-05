# Agent Orchestration Hardening Index (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening`  
**RFC source:** `SCALABLE_AGENT_RUNTIME_ARCHITECTURE_RFC.md`  
**Current mode:** Deterministic queue-first DEV execution across RFC lanes (`A-G`) plus runtime-reality extension lanes (`H-M`).

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/MASTER_PLAN.md`
- RFC: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/SCALABLE_AGENT_RUNTIME_ARCHITECTURE_RFC.md`
- QA runbook: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening/SUPER_ADMIN_AGENT_QA_RUNBOOK.md`

## Scope guardrails

Included:

- Lane A: Agent Spec + schema contracts
- Lane B: Policy Compiler + manifest hash determinism
- Lane C: Admission control + structured denial contract
- Lane D: Action completion evidence + failure taxonomy
- Lane E: Idempotency tuple + replay matrix behavior
- Lane F: Observability + SLO/incident thresholds
- Lane G: CI/warmup pipeline wiring (dev gates only)
- Lane H: Runtime kernel seam extraction from monolith
- Lane I: Samantha module isolation + parity
- Lane J: Agent module registry + per-agent tool binding
- Lane K: Der Terminmacher scaffold + stage contract
- Lane L: Tool-chain truth audit + latency contract
- Lane M: Hardware gate + cross-workstream truth-sync closure

Excluded:

- Migration/shadow phases
- Canary/promotion
- Cutover/rollback
- Legacy removal sequencing

## Current queue snapshot

| Lane | Queue IDs | Status snapshot |
|---|---|---|
| `A` | `ARH-A-001`, `ARH-A-002` | `DONE`, `DONE` |
| `B` | `ARH-B-001`, `ARH-B-002` | `DONE`, `DONE` |
| `C` | `ARH-C-001`, `ARH-C-002` | `DONE`, `BLOCKED` |
| `D` | `ARH-D-001`, `ARH-D-002` | `BLOCKED`, `PENDING` |
| `E` | `ARH-E-001`, `ARH-E-002` | `DONE`, `PENDING` |
| `F` | `ARH-F-001`, `ARH-F-002` | `DONE`, `PENDING` |
| `G` | `ARH-G-001`, `ARH-G-002` | `DONE`, `PENDING` |
| `H` | `ARH-H-001`, `ARH-H-002` | `DONE`, `DONE` |
| `I` | `ARH-I-001`, `ARH-I-002` | `DONE`, `DONE` |
| `J` | `ARH-J-001`, `ARH-J-002` | `DONE`, `DONE` |
| `K` | `ARH-K-001`, `ARH-K-002` | `DONE`, `DONE` |
| `L` | `ARH-L-001`, `ARH-L-002` | `DONE`, `DONE` |
| `M` | `ARH-M-001`, `ARH-M-002` | `DONE`, `DONE` |

## Ready-first execution list

1. None. No dependency-unblocked `READY` rows remain.

## Latest evidence update

- `ARH-L-002` closed on 2026-03-05 with successful verify chain: `npm run typecheck`, `npx tsc -p convex/tsconfig.json --noEmit`, `npx vitest run tests/integration/ai/avDeviceMatrixLatency.integration.test.ts`, `npm run demo:fnd-007`, `npm run demo:founder`.
- Demo latency contract artifacts now include `meeting_concierge_latency_contract_v1` sections in `tmp/reports/fnd-007/latest.json` and `tmp/reports/founder-rehearsal/latest.json`, reconciling telemetry `<60s` with outcome `<20s` targets and explicit breach-reason fields.
- `ARH-M-001` closed on 2026-03-05 with cross-workstream blocker-ledger sync: `ORV-023` DAT-native gate remains `BLOCKED`/`NO_GO` until physical iOS+Android artifact bundles exist, and stale DAT-native `GO` claims are explicitly invalidated in ORV + LOC + AOH artifacts.
- `ARH-M-002` closed on 2026-03-05 with row-owned AOH closeout mapping synchronization (`TASK_QUEUE.md`, `MASTER_PLAN.md`, `INDEX.md`, `SESSION_PROMPTS.md`) and verify commands `npm run docs:guard` + `npm run typecheck` both passing.

## ARH-M-002 acceptance-criteria mapping

| Acceptance criterion | Status | Evidence anchor | Ownership/risk note |
|---|---|---|---|
| `runtime modular` | `PASS` | `ARH-H-001`, `ARH-H-002` queue notes | Kernel/hook contracts stay deterministic and fail-closed. |
| `Samantha parity` | `PASS` | `ARH-I-001`, `ARH-I-002` queue notes | Samantha adapter parity remains evidenced; no fail-open changes. |
| `new-agent scaffold` | `PASS` | `ARH-K-001` queue notes | `der_terminmacher` scaffold remains additive-compatible. |
| `per-agent tools` | `PASS` | `ARH-J-002`, `ARH-K-002` queue notes | Tool binding is per-agent deterministic with additive legacy compatibility. |
| `Terminmacher tool-chain` | `PASS` | `ARH-L-001`, `ARH-L-002`, `ORV-044` closeout evidence | Includes preserved ORV-044 regression stack baseline and explicit fallback taxonomy. |
| `hardware gate` | `PASS` (enforcement), `NO_GO` (DAT-native readiness) | `ARH-M-001` ledger + `ORV-023` (`BLOCKED`) | Keep DAT-native promotion fail-closed until physical iOS+Android artifacts exist. |

ORV-044 closure notes preserved in this mapping:

1. `test:e2e:desktop` onboarding-audit-handoff flakiness was resolved (input/send instability, CTA label drift, intermittent no-send path).
2. Helper hardening added deterministic submit-button targeting, request-count-based send retries, and create-account label matching updates.
3. ORV-041/ORV-042/ORV-043 gates, `/api/v1/ai/voice/*` compatibility, and explicit batch fallback semantics were preserved.
4. `convex/ai/agentExecution.ts` was not modified during ORV-044 closure.

## Unresolved risks (owned)

| Risk | Owner | Next review | Status |
|---|---|---|---|
| `ORV-023` DAT-native physical-device evidence missing | Lane `H` mobile runtime + device QA owners (`ORV-023`) | `2026-03-12` | `OPEN` |
| `ARH-C-002` / `ARH-D-001` progression blocked by unrelated baseline `mobileMetaBridgeContracts` failures | Lane `C` + lane `D` owners | `2026-03-12` | `OPEN` |

## Cross-workstream blocker ledger (`ARH-M-001`)

| Claim scope | Status | Gate | Required artifacts | Owner | Next review date |
|---|---|---|---|---|---|
| DAT-native production readiness (iOS + Android Meta DAT callback path) | `NO_GO` | `ORV-023` = `BLOCKED` | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/physical-device/ios/`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-023/physical-device/android/`; canary log update in `ORV_014_CANARY_EXECUTION_LOG.md` | Lane `H` mobile runtime + device QA owners (`ORV-023`) | `2026-03-12` |
| Non-DAT founder demo and web/desktop PCM readiness | `GO` | `LOC-049` = `DONE`; `ORV-044` = `DONE` | `tmp/reports/fnd-007/latest.json`; `tmp/reports/founder-rehearsal/latest.json`; `ORV_014_CANARY_EXECUTION_LOG.md` (`ORV-044`) | Lane `K` + lane `L` owners | `2026-03-12` |

Stale-claim invalidation rule: any statement that implies DAT-native `GO` without both physical-device bundles is invalid and must be treated as `NO_GO`.

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`

Targeted unit/integration slices are row-specific in `TASK_QUEUE.md`.
