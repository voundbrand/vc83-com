# Polysniper NemoClaw Deployment Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan`  
**Last updated:** 2026-04-01

---

## Objective

Deliver a separate NemoClaw deployment plan for `polysniper` that is:

1. Isolated from `apps/nemoclaw-kanzlei-eu` and other app tracks.
2. Practical for a single-operator, single-tenant hobby workflow.
3. Safety-first for automated Polymarket trading under prepaid-card bounded risk.
4. Staged from simulation to limited live exposure.
5. Fresh NemoClaw deployment bootstrap that stays host-portable (not locked to Hetzner), with Hostinger as a valid target.

---

## Execution mode decisions (locked)

1. Operator model: `single operator`.
2. Tenant model: `single tenant`.
3. Trading domain: `automated Polymarket strategy execution`.
4. Trading model target: `Claude Opus 2.4`.
5. Capital policy: prepaid-card bounded exposure only.
6. Isolation policy: this workstream and deployment track remain separate from `apps/nemoclaw-kanzlei-eu`.
7. Hosting policy: host-agnostic by design, Hostinger supported as primary candidate.
8. Venue compliance policy: no circumvention of geographic or legal restrictions; trade only from an execution profile that is explicitly eligible.

---

## Non-negotiable operating principles

1. Fail-closed trading safety: unknown state or unmet gate means no live orders.
2. Simulation-first by default: paper/sim mode required before any live capital.
3. Hard limits before strategy iteration: per-trade, per-day, and aggregate open-risk caps.
4. Hard kill switch is mandatory and must be documented/testable.
5. Provider/model faults must degrade to `HOLD` (no-order behavior).
6. Audit/event logging is mandatory for every critical decision path.
7. Keep controls lightweight but explicit; avoid enterprise-heavy legal workflows not needed for this scope.
8. No circumvention path: blocked or unknown venue eligibility must remain non-trading (`HOLD`/`simulation-only`).
9. Fresh-install rule: bootstrap from a clean NemoClaw install path for `polysniper` and avoid inheriting mutable Kanzlei deployment state.

---

## Isolation boundary matrix (`PSNP-002`)

| Boundary | Contract |
|---|---|
| Runtime processes | `polysniper` runtime units must be app-local and must not share process supervisor units with `apps/nemoclaw-kanzlei-eu`. |
| Deployment scripts | `polysniper` deploy/update scripts remain under `apps/polysniper` only; no cross-app script invocation for mutable operations. |
| Secrets and env | `polysniper` secrets must use dedicated namespaces and files; importing `apps/nemoclaw-kanzlei-eu` env files is forbidden. |
| Persistence/log sinks | Trading logs and state stores must be dedicated to this track; no shared mutable write target with legal deployment tracks. |
| Kill-switch authority | Emergency stop controls are local to this track only and may not depend on controls in other app tracks. |

No-cross-track rules:

1. No reuse of mutable runtime state from `apps/nemoclaw-kanzlei-eu`.
2. No secrets copy/paste between tracks.
3. No deployment action in `polysniper` triggered from non-`polysniper` delivery roots.

---

## Secrets namespaces and rotation (`PSNP-003`)

### Namespaces

1. `PSNP_LOCAL_*` for local dry-run only.
2. `PSNP_STAGING_*` for staging synthetic trades only.
3. `PSNP_LIVE_*` for limited live exposure only.

Required families:

1. Market access credentials.
2. Model/provider credentials.
3. Logging sink credentials.
4. Kill-switch control token/secret.

### Single-operator rotation checklist

1. Rotate `PSNP_STAGING_*` monthly.
2. Rotate `PSNP_LIVE_*` every 30 days or immediately after any suspicion.
3. Revoke previous key before promoting new key to active.
4. Validate startup in non-live mode after each rotation.
5. Record rotation date and actor in local operator log.

Startup guard:

1. Missing required env values force startup to fail closed.
2. Invalid secret format forces mode back to `paper/sim` with no order placement.

---

## Simulation-first contract (`PSNP-004`)

Runtime mode contract:

1. `paper_sim`: default mode on new deploys and local startups.
2. `staging_synth`: synthetic execution path with no real funding movement.
3. `live_limited`: live mode allowed only after gate closure.

Live unlock criteria:

1. Gate 1 (`PSNP-011`) complete.
2. Gate 2 (`PSNP-012`) complete.
3. Gate 3 (`PSNP-013`) complete.
4. Release package (`PSNP-014`) published with explicit decision.

---

## Spend/open-risk caps (`PSNP-005`)

Initial cap profile (`v1`):

1. `MAX_TRADE_NOTIONAL_USDC=15`.
2. `MAX_DAILY_NOTIONAL_USDC=60`.
3. `MAX_OPEN_RISK_USDC=45`.
4. `MAX_OPEN_POSITIONS=4`.

Limit enforcement contract:

1. Pre-trade checks must pass all caps before order intent can execute.
2. Any cap-evaluation failure emits an audit event and enforces `HOLD`.
3. Live caps may only increase after explicit weekly review entry and manual config update.

---

## Hard kill switch (`PSNP-006`)

Kill-switch channels (all must halt trading immediately):

1. Manual operator command: `npm run trading:kill` (or equivalent app-local command wrapper).
2. Environment flag: `PSNP_TRADING_KILL_SWITCH=1`.
3. Sentinel file presence: `apps/polysniper/.runtime/kill-switch.flag`.

Kill-switch behavior:

1. New order placement denied while kill switch is active.
2. Startup refuses `live_limited` mode while kill switch is active.
3. Runtime emits explicit audit event: `kill_switch_activated` or `kill_switch_cleared`.

---

## Prepaid-card funding policy (`PSNP-007`)

1. Maximum prepaid balance: `300 USD` equivalent.
2. Reserve floor alert threshold: `40 USD` equivalent.
3. Planned top-up cadence: weekly manual top-up only.
4. No automatic top-up from linked bank accounts.
5. No alternative high-limit funding fallback while in `live_limited` mode.

Bounded-risk interpretation:

1. Total deployable capital cannot exceed prepaid balance.
2. If balance is below reserve floor, system must block new entries and allow only risk-reducing exits.

---

## Reconciliation and insufficient-funds policy (`PSNP-008`)

Reconciliation cycle:

1. End-of-day compare: intended notional vs accepted orders vs settled movements.
2. Record deltas greater than `2 USD` equivalent as reconciliation anomaly.
3. Keep daily reconciliation entry in operator log.

Fail-closed funds handling:

1. Any decline/insufficient-funds response pauses new order entries.
2. Resume requires manual reconciliation acknowledgement.
3. Repeated unresolved anomalies (>1 day) force mode to `paper_sim`.

---

## Model/provider fail-safe (`PSNP-009`)

1. Primary model target: Claude Opus 2.4.
2. If provider request times out, errors, or returns invalid payload, enforce `HOLD`.
3. If model confidence is below configured threshold (`0.62` initial), enforce `HOLD`.
4. Retries are limited to 2 attempts within the same decision window.
5. Repeated provider faults move runtime into protected no-trade state pending operator review.

---

## Audit/event logging contract (`PSNP-010`)

Minimum event schema:

1. `event_id`, `timestamp_utc`, `mode`, `strategy_version`.
2. `market_id`, `signal_id`, `decision_id`.
3. `model_provider`, `model_name`, `confidence_score`, `latency_ms`.
4. `risk_checks` object (trade cap/day cap/open-risk/kill-switch/funds status).
5. `action` (`HOLD`, `PLACE_ORDER`, `CANCEL_ORDER`, `KILL_SWITCH`).
6. `result` and `result_reason`.

Operational logging rules:

1. Logs are append-only for trading events.
2. Keep local retention minimum of 90 days for operator review.
3. Emit explicit events for every denied decision, not just successful actions.

---

## Staged rollout gates (`PSNP-011` to `PSNP-013`)

### Gate 1: Local dry-run (`PSNP-011`)

Pass criteria:

1. Run at least 30 deterministic synthetic scenarios in `paper_sim` mode.
2. Observe zero cap-bypass events.
3. Verify kill-switch activation blocks order creation in all scenarios.
4. Verify provider failure path emits `HOLD` with complete audit records.

### Gate 2: Staging synthetic trades (`PSNP-012`)

Pass criteria:

1. Run at least 100 synthetic staging decision cycles.
2. Confirm no real funding movement.
3. Confirm reconciliation output is generated for each batch.
4. Confirm deterministic rerun gives consistent pass/fail outcomes for the same scenario set.

Evidence package minimum:

1. Run date/time.
2. Scenario set ID.
3. Pass/fail totals.
4. Any anomaly ledger.

### Gate 3: Limited live exposure (`PSNP-013`)

Initial live profile:

1. Live observation window: 7 calendar days.
2. Reduced daily cap during observation: `30 USD` equivalent.
3. Reduced per-trade cap during observation: `10 USD` equivalent.
4. Immediate rollback trigger: any unresolved reconciliation anomaly or provider instability pattern.

---

## Initial release decision package (`PSNP-014`)

Decision format:

1. Decision: `GO` or `NO_GO`.
2. Blocker ledger with owner and mitigation.
3. Rollback procedure to `paper_sim` mode.

Current initial decision baseline (historical):

1. Decision: `NO_GO`.
2. Rationale: planning controls are documented, but execution evidence for gates is not yet collected.

Initial blocker ledger:

1. `BLK-PSNP-01`: Gate evidence not yet executed in runtime.
2. `BLK-PSNP-02`: Limited-live observation evidence not yet available.
3. `BLK-PSNP-03`: Production-grade operator runbook execution logs not yet attached.

Updated decision package (`PSNP-026`, 2026-03-28):

1. Decision: `NO_GO` for live trading.
2. Closed blockers: `BLK-PSNP-01`, `BLK-PSNP-02`, `BLK-PSNP-03` (Docker + VPS execution evidence is now attached).
3. Open blockers:
   - `BLK-PSNP-04`: credential rotation evidence pending (`PSNP-033`, `PSNP-034`) after manual defer.
   - `BLK-PSNP-05`: closed 2026-04-01 with hardening evidence package (`PSNP-035`, `PSNP-036`).
   - `BLK-PSNP-06`: open after legal-eligibility branch publication (`PSNP-056`) until an operator-evidenced `ACTIVE + eligible` execution profile exists.

Rollback contract:

1. Set runtime mode to `paper_sim`.
2. Activate kill switch.
3. Verify no open order intents remain.

---

## Weekly operating cadence (`PSNP-015`)

Weekly checklist (single operator):

1. Review cap hit rates and adjust only with logged rationale.
2. Review all `HOLD` reasons and recurring provider failures.
3. Review reconciliation anomalies and close or escalate each item.
4. Review prepaid card top-ups and reserve floor breaches.
5. Reconfirm kill-switch operation once per week.

---

## Milestones and queue mapping

1. Milestone 1 (`PSNP-001` to `PSNP-003`): bootstrap, isolation, and secrets boundary lock.
2. Milestone 2 (`PSNP-004` to `PSNP-006`): trading safety guardrail lock.
3. Milestone 3 (`PSNP-007` to `PSNP-008`): prepaid-card bounded-risk controls.
4. Milestone 4 (`PSNP-009` to `PSNP-010`): model/provider fail-safe and audit contract.
5. Milestone 5 (`PSNP-011` to `PSNP-013`): staged rollout gate definitions.
6. Milestone 6 (`PSNP-014` to `PSNP-015`): release decision and operating cadence.
7. Milestone 7 (`PSNP-016` to `PSNP-020`): host portability evidence and Docker-first rollout path lock.
8. Milestone 8 (`PSNP-021` to `PSNP-022`): local Docker runtime spec and deterministic validation pack.
9. Milestone 9 (`PSNP-023` to `PSNP-025`): Hostinger VPS staging bootstrap, soak, and limited-live canary contract.
10. Milestone 10 (`PSNP-027` to `PSNP-028`): local Docker runtime implementation and first evidence run.
11. Milestone 11 (`PSNP-029` to `PSNP-031`): Hostinger provisioning, staging deployment, and soak execution evidence.
12. Milestone 12 (`PSNP-026`): updated release decision package with Docker+VPS execution evidence.
13. Milestone 13 (`PSNP-032` to `PSNP-034`): secrets hygiene remediation and staged/live credential rotation evidence.
14. Milestone 14 (`PSNP-035` to `PSNP-036`): network hardening and firewall verification evidence closure.
15. Milestone 15 (`PSNP-037` to `PSNP-040`, `PSNP-046`): real Polymarket execution path integration with fail-closed safety gates and authenticated CLOB SDK submit flow.
16. Milestone 16 (`PSNP-047` to `PSNP-050`): venue/legal eligibility control plane and deterministic execution-profile gates.
17. Milestone 17 (`PSNP-051` to `PSNP-055`): OpenClaw intent-policy gateway, operator approval controls, and failure-injection evidence.
18. Milestone 18 (`PSNP-056`): legal-eligibility decision branch and blocker ledger update.
19. Milestone 19 (`PSNP-041` to `PSNP-045`): staged rollout rerun with integrated path and release decision refresh.

---

## Current release policy

1. Live trading remains `NO_GO` while `BLK-PSNP-04` or `BLK-PSNP-06` is open.
2. Real CLOB/Gamma execution path remains `NO_GO` for live capital until `BLK-PSNP-04` is closed with rotation evidence, `BLK-PSNP-06` is closed with operator-evidenced eligible profile activation, and release row `PSNP-045` passes.
3. Any unresolved safety row keeps release decision rows `PENDING` or `BLOCKED`.
4. Deterministic queue pick order governs execution to avoid ad-hoc promotion.
5. Current Day-1 canary row (`PSNP-044`) is blocked pending operator-run prerequisites:
   - credential rotation evidence closure (`PSNP-033`, `PSNP-034`)
   - eligible active execution profile evidence (`BLK-PSNP-06` closure)
   - funded canary wallet and explicit manual approval to execute live Day-1.

---

## Execution Profile + Intent Control Plane (`PSNP-047` to `PSNP-055`)

1. Runtime now loads explicit execution-profile metadata (`id`, `venue`, `entity`, `kycJurisdiction`, `operatorLocation`, `bankingJurisdictions`, `status`, `allowAgentIntents`) with deny-by-default `SIM_ONLY` fallback.
2. Venue eligibility is deterministic and fail-closed:
   - combine public geo probe (`PSNP_POLY_PUBLIC_GEO_PATH`) and authenticated CLOB closed-only status (`getClosedOnlyMode`)
   - classify `eligible`, `close_only`, `blocked`, `unknown`
   - deny live submit unless classification is exactly `eligible`.
3. `TradeIntent v1` boundary is enforced:
   - agents submit intent only
   - deterministic policy compiler decides `ALLOW_ORDER` or `DENY`
   - explicit reject reasons are emitted for replay/audit.
4. Operator controls are active for agent-originated intents:
   - approval endpoints: `/v1/agent-intents/approval/grant` and `/v1/agent-intents/approval/revoke`
   - kill switch remains dominant over every intent path.
5. Audit chain now appends profile/eligibility/intent/policy metadata:
   - `executionProfileId`
   - `eligibilitySnapshot`
   - `intentId`
   - `policyDecisionId`
   - operator approval required/granted flags.
6. Failure-injection evidence run (`PSNP-055`) is archived at `evidence/local_docker/FIM-20260401T142859Z-v1/` and confirms fail-closed denials for blocked, close-only, unknown, missing-approval, and kill-switch-active cases.

---

## Fresh Install and Host Portability (Phase 2+, `PSNP-016+`)

### Fresh-install baseline

1. Start with a clean NemoClaw install for `polysniper`.
2. Do not reuse mutable deployment state from the Kanzlei track.
3. Keep deployment scripts and env files app-local under `apps/polysniper`.

### Host portability policy

1. Hosting must be provider-agnostic; Hetzner is optional, not required.
2. Hostinger is valid and prioritized for this phase.
3. Region selection is evidence-driven using endpoint latency/jitter, not assumptions.

### Hostinger integration surfaces

1. API spec source: `apps/polysniper/docs/hostinger-api.json`.
2. Discovery tool: `apps/polysniper/server/tools/hostinger-vps-discovery.mjs`.
3. Latency tool: `apps/polysniper/server/tools/polymarket-latency-benchmark.mjs`.
4. Procedure: `apps/polysniper/docs/nemoclaw_polysniper_plan/HOSTING_LATENCY_RUNBOOK.md`.
5. Docker-to-VPS path runbook: `apps/polysniper/docs/nemoclaw_polysniper_plan/DOCKER_TO_VPS_BOOTSTRAP_RUNBOOK.md`.

### Current Phase 2+ state

1. Hostinger candidate discovery is complete (`PSNP-019`) via API artifact `evidence/latency/HOSTINGER_DISCOVERY.json`.
2. Docker-first rollout path lock is complete (`PSNP-020`).
3. Planning contracts through canary policy are complete (`PSNP-021` to `PSNP-025`).
4. Local Docker runtime assets and first evidence run are complete (`PSNP-027` and `PSNP-028`).
5. Hostinger provisioning manifest/API validation prep is complete (`PSNP-029`) with artifacts under `evidence/hostinger/`.
6. Hostinger staging VPS deployment evidence is complete (`PSNP-030`) at `evidence/staging_bootstrap/STGBOOT-20260328T141334Z-v1/`.
7. VPS synthetic soak evidence is complete (`PSNP-031`) at `evidence/staging_soak/STGSOAK-20260328T153247Z-v1/`.
8. Queue execution is complete through `PSNP-043`; next deterministic row (`PSNP-044`) is currently `BLOCKED` pending human prerequisites for Day-1 live canary.

### Tranche status (`PSNP-032` to `PSNP-056`)

1. `BLK-PSNP-04` remains open: credential rotation rows (`PSNP-033`, `PSNP-034`) are intentionally deferred.
2. `BLK-PSNP-05` is closed with host hardening and firewall validation evidence.
3. `PSNP-037` is complete: real execution path adapters are integrated with explicit mode gates and live-submit lock.
4. `PSNP-038` is complete: unified execution now has explicit pre-trade safety middleware that fail-closes on cap/kill-switch violations.
5. `PSNP-039` is complete: provider/model fail-safe now emits deterministic `HOLD` classification with bounded read-path retries.
6. `PSNP-040` is complete: replayable event-chain trace IDs now correlate signal, decision, execution, and kill-switch events.
7. `PSNP-046` is complete: live submit now uses official `@polymarket/clob-client` authenticated flow (`createOrder` + `postOrder`) with signer/chain/signature-type/funder/creds initialization and geo closed-only fail-closed preflight.
8. Lane `L` rows (`PSNP-047` to `PSNP-050`) now gate any rollout rerun and must establish deterministic profile eligibility before order submission.
9. Lane `M` rows (`PSNP-051` to `PSNP-055`) must keep OpenClaw as intent-only; execution authority remains in deterministic policy gateway.
10. `PSNP-056` is complete and keeps `BLK-PSNP-06` open until operator evidence proves an eligible active profile.
11. Keep hard protections enforced before any order call:
   - `paper_sim` default
   - per-trade/per-day/open-risk caps
   - hard kill switch
   - provider/model `HOLD` fail-safe
   - complete correlated audit/event logging
12. Lane `K` rerun progress:
   - local dry-run evidence complete at `evidence/local_docker/LDR-20260401T143838Z-v1/` (`30/30` pass)
   - staging synthetic soak evidence complete at `evidence/staging_soak/STGSOAK-20260401T144302Z-v2/` (`100` nominal + `15` fault injections)
   - canary preflight bundle complete at `evidence/live_canary/LCANARY-PREFLIGHT-20260401T1448Z-v1/`
   - Day-1 live canary row `PSNP-044` is blocked pending operator prerequisites
13. Refresh release decision in `PSNP-045` using updated blocker ledger and canary outcomes.
14. Failure-injection matrix evidence for lane `M` is archived at `evidence/local_docker/FIM-20260401T142859Z-v1/`.

### Current candidate matrix (from Hostinger API)

1. Data centers discovered: `10` (`bos`, `fra`, `int`, `bnk`, `fast`, `asc`, `cam`, `mum2`, `dci`, `kul`).
2. VPS catalog items discovered: `8` (`KVM 1/2/4/8` + game-panel variants).
3. Recommended first two benchmark/provision candidates for Polymarket flow:
   - `bos` (Boston, `data_center_id=17`) for likely lower US-market path latency.
   - `fra` (Frankfurt, `data_center_id=19`) as EU control candidate.

### Docker-first execution path (`PSNP-020` to `PSNP-031` + `PSNP-026`)

1. `PSNP-020` (`DONE`): lock execution path and sequencing (`local Docker -> Hostinger VPS`).
2. `PSNP-021` (`DONE`): local Docker runtime spec lock.
3. `PSNP-022` (`DONE`): deterministic local Docker validation/evidence contract lock.
4. `PSNP-023` (`DONE`): Hostinger VPS bootstrap profile lock.
5. `PSNP-024` (`DONE`): staging soak evidence/rollback contract lock.
6. `PSNP-025` (`DONE`): limited-live canary contract lock.
7. `PSNP-027` (`DONE`): implement local Docker runtime assets.
8. `PSNP-028` (`DONE`): execute first local Docker evidence run (`31/31` pass).
9. `PSNP-029` (`DONE`): prepare Hostinger provisioning manifest + API validation.
10. `PSNP-030` (`DONE`): provision and deploy staging VPS runtime.
11. `PSNP-031` (`DONE`): run VPS soak and collect execution evidence.
12. `PSNP-026` (`DONE`): publish updated release decision package after execution evidence.

### Local Docker runtime spec lock (`PSNP-021`)

1. Local image contract is fixed to `polysniper-server:local` for baseline work.
2. Local runtime mode contract is fixed to `paper_sim`.
3. Data and runtime mounts are fixed for baseline continuity:
   - `apps/polysniper/server/data` -> `/app/apps/polysniper/server/data`
   - `apps/polysniper/.runtime` -> `/app/apps/polysniper/.runtime`
4. Kill-switch channels must remain active in container runtime:
   - `PSNP_TRADING_KILL_SWITCH`
   - sentinel file `apps/polysniper/.runtime/kill-switch.flag`
   - manual API activation endpoint
5. Local baseline env contract uses dry-run namespace (`PSNP_LOCAL_*`) and excludes live keys.

### Local Docker validation evidence lock (`PSNP-022`)

1. Deterministic validation set requires at least `30` scenarios with stable scenario set ID.
2. Required scenario classes include both allow and fail-closed paths (caps, kill-switch, provider/model failure, prepaid floor).
3. Evidence root path is fixed to:
   - `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/local_docker/<run-id>/`
4. Required artifacts per run:
   - `RUN_METADATA.json`
   - `SIGNAL_REPLAY_RESULTS.json`
   - `KILL_SWITCH_ASSERTIONS.json`
   - `AUDIT_EVENT_COVERAGE.json`
   - `SUMMARY.md`
5. Promotion to VPS planning rows requires complete evidence package and deterministic rerun consistency.

### Hostinger VPS bootstrap profile lock (`PSNP-023`)

1. Region selection uses measured p95 latency shortlist (`bos` primary, `fra` fallback).
2. Staging host must run dedicated non-root operator account with SSH key-only access.
3. Network exposure in staging is operator-restricted; public open exposure is disallowed by default.
4. Runtime root and persistent data layout are fixed under `/opt/polysniper`.
5. Staging secret boundary is strict:
   - allowed: `PSNP_STAGING_*`
   - forbidden on staging host: `PSNP_LIVE_*`
6. Container runtime mode is locked to `staging_synth` for first hosted rollout.

### VPS staging synthetic-soak evidence lock (`PSNP-024`)

1. Minimum synthetic cycle count is fixed at `100`.
2. Soak must include explicit fault injections (provider/model failures and kill-switch toggles).
3. Evidence root path is fixed to:
   - `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/staging_soak/<run-id>/`
4. Mandatory evidence includes cycle results, fault-injection results, anomaly ledger, and reconciliation summary.
5. Any `SEV-1` safety anomaly enforces immediate rollback and blocks promotion.

### Limited-live canary contract lock (`PSNP-025`)

1. Canary window is fixed at 7 days with reduced exposure caps.
2. Canary execution scope is constrained to one strategy version and limited concurrent markets.
3. Canary evidence root path is fixed to:
   - `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/live_canary/<run-id>/`
4. Automatic rollback triggers include safety violations, reconciliation drift, provider instability, and missing evidence.
5. Release decision update row cannot close until canary evidence is attached and reviewed.

### Local Docker asset implementation (`PSNP-027`)

1. Docker runtime artifacts exist under `apps/polysniper/server`:
   - `Dockerfile`
   - `docker-compose.local.yml`
   - `.env.local.example`
2. Compose contract resolves from app-local context (`apps/polysniper`) and preserves mounted data/runtime paths.
3. Compose env file is optional by default to allow bootstrap with baseline defaults.

Deterministic path to "up and running" target:

1. Run locally in Docker with `paper_sim`.
2. Prove controls and evidence in local container runtime.
3. Promote same containerized contract to Hostinger VPS in `staging_synth`.
4. Complete synthetic soak on VPS.
5. Evaluate limited-live canary only after soak evidence and blocker closure.
