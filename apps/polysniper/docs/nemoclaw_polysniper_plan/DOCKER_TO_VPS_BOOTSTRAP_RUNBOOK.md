# Docker-to-VPS Bootstrap Runbook (Polysniper)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan`  
**Scope:** `apps/polysniper` only (isolated from `apps/nemoclaw-kanzlei-eu`)  
**Execution model:** local Docker first, then Hostinger VPS staging, then limited live gate review.

---

## Stage 1: Local Docker baseline (`paper_sim`)

Objective: get a reproducible containerized runtime on local machine with fail-closed controls.

Runtime spec (`PSNP-021`):

1. Image tag: `polysniper-server:local`.
2. Container working dir: `/app`.
3. Runtime command: `node apps/polysniper/server/server.mjs`.
4. Bind host `127.0.0.1:8787` to container `8787`.
5. Mode default must be `PSNP_RUNTIME_MODE=paper_sim`.

Host-to-container storage mapping:

1. Host data path: `apps/polysniper/server/data`.
2. Host runtime path: `apps/polysniper/.runtime`.
3. Container data mount: `/app/apps/polysniper/server/data`.
4. Container runtime mount: `/app/apps/polysniper/.runtime`.

Local env contract:

1. Source base vars from `apps/polysniper/env.local`.
2. Enforce local namespace for dry-run keys: `PSNP_LOCAL_*`.
3. Keep `PSNP_STAGING_*` and `PSNP_LIVE_*` out of local Docker baseline.

Kill-switch wiring contract:

1. Environment channel: `PSNP_TRADING_KILL_SWITCH`.
2. Sentinel channel path: `apps/polysniper/.runtime/kill-switch.flag`.
3. Manual API channel remains enabled (`/v1/kill-switch/activate`).

Reference compose shape (contract, not yet mandatory file path):

```yaml
services:
  polysniper-server:
    image: polysniper-server:local
    command: ["node", "apps/polysniper/server/server.mjs"]
    ports:
      - "127.0.0.1:8787:8787"
    environment:
      PSNP_SERVER_HOST: 0.0.0.0
      PSNP_SERVER_PORT: 8787
      PSNP_RUNTIME_MODE: paper_sim
      PSNP_TRADING_KILL_SWITCH: "0"
    volumes:
      - ./apps/polysniper/server/data:/app/apps/polysniper/server/data
      - ./apps/polysniper/.runtime:/app/apps/polysniper/.runtime
```

Checklist:

1. Build app-local container image for `apps/polysniper/server`.
2. Run with `PSNP_RUNTIME_MODE=paper_sim`.
3. Mount durable data volume for:
   - `ledger.json`
   - `audit.jsonl`
4. Keep kill-switch controls wired:
   - `PSNP_TRADING_KILL_SWITCH`
   - flag file path
5. Confirm no live credentials are required in this stage.

Implementation assets (`PSNP-027`):

1. `apps/polysniper/server/Dockerfile`
2. `apps/polysniper/server/docker-compose.local.yml`
3. `apps/polysniper/server/.env.local.example`

Local bootstrap commands:

```bash
cp apps/polysniper/server/.env.local.example apps/polysniper/server/.env.local
docker compose -f apps/polysniper/server/docker-compose.local.yml up -d --build
docker compose -f apps/polysniper/server/docker-compose.local.yml ps
```

Exit criteria:

1. `GET /healthz` returns `200`.
2. `GET /v1/status` shows mode `paper_sim`.
3. kill-switch activation forces `HOLD` decisions.
4. audit log receives startup + evaluation events.
5. local container restart keeps ledger/audit continuity through mounted volume.

---

## Stage 2: Local deterministic validation pack

Objective: prove safety controls in container runtime before any VPS promotion.

Validation profile (`PSNP-022`):

1. Scenario set ID format: `LDV-YYYYMMDD-vN`.
2. Minimum scenario count: `30`.
3. Scenario classes (minimum coverage):
   - nominal allow path
   - kill-switch active path
   - per-trade cap breach
   - per-day cap breach
   - open-risk cap breach
   - max open positions breach
   - provider unhealthy
   - model confidence below threshold
   - prepaid reserve-floor breach

Evidence archive contract:

1. Root path: `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/local_docker/<run-id>/`
2. Required files per run:
   - `RUN_METADATA.json`
   - `SIGNAL_REPLAY_RESULTS.json`
   - `KILL_SWITCH_ASSERTIONS.json`
   - `AUDIT_EVENT_COVERAGE.json`
   - `SUMMARY.md`

Minimum metadata fields:

1. `runId`, `scenarioSetId`, `startedAtUtc`, `finishedAtUtc`
2. image tag and runtime mode
3. git commit SHA or working tree marker
4. pass/fail totals and anomaly count

Checklist:

1. Run `node apps/polysniper/server/smoke-test.mjs`.
2. Execute deterministic signal replay set (minimum 30 scenarios).
3. Verify cap checks:
   - per-trade
   - per-day
   - open-risk
   - max open positions
4. Verify provider/model fail-safe yields `HOLD`.
5. Archive evidence under:
   - `evidence/local_docker/`

Exit criteria:

1. zero cap bypass events,
2. kill-switch always blocks order placement,
3. all required audit events present.
4. evidence archive is complete and reproducible on rerun with same scenario set.

---

## Stage 3: Hostinger VPS bootstrap (`staging_synth`)

Objective: deploy same containerized runtime to selected Hostinger region with minimal mutation.

Bootstrap profile (`PSNP-023`):

1. Region selection rule:
   - primary candidate: lowest p95 latency from measured shortlist (`bos` vs `fra`),
   - fallback candidate: second-lowest p95 if primary has provisioning/uptime issues.
2. First VPS profile: smallest stable plan that supports Docker + logs + synthetic soak workload.
3. Base OS: current Ubuntu LTS image.
4. Host identity:
   - hostname pattern: `psnp-stg-<region>-01`
   - dedicated non-root user: `psnpops`
5. SSH hardening:
   - key-only authentication,
   - disable password login,
   - disable root SSH login.
6. Network policy:
   - allow SSH from operator source IP,
   - expose service port only to operator IP during staging,
   - deny all other inbound by default.
7. Runtime root:
   - `/opt/polysniper/`
   - `/opt/polysniper/data/` for ledger/audit persistence.
8. Secrets boundary:
   - staging env file only (`PSNP_STAGING_*`),
   - no `PSNP_LIVE_*` material on host.
9. Container mode lock:
   - `PSNP_RUNTIME_MODE=staging_synth`,
   - `PSNP_TRADING_KILL_SWITCH=0` at start, toggle tested during bootstrap.
10. Deployment mutation rule:
    - no behavioral drift from local Docker contract except host/network coordinates.

Checklist:

1. Select region from latency evidence (`bos` preferred, `fra` control fallback).
2. Provision VPS with smallest adequate profile first.
3. Harden host:
   - dedicated non-root operator user
   - key-only SSH
   - firewall allowlist (`22`, `80/443` if needed)
4. Install runtime dependencies:
   - Docker Engine
   - Docker Compose plugin
5. Deploy same image/config shape used locally, with `PSNP_RUNTIME_MODE=staging_synth`.

Exit criteria:

1. VPS service health endpoint reachable from operator machine.
2. staging secrets namespace only (`PSNP_STAGING_*`), no `PSNP_LIVE_*`.
3. kill-switch channels work remotely.

---

## Stage 4: Staging synthetic soak on VPS

Objective: validate stability and safety controls in real hosted environment with zero capital movement.

Soak profile (`PSNP-024`):

1. Minimum cycles: `100`.
2. Runtime mode locked to `staging_synth` for entire soak window.
3. Minimum soak duration: one continuous operator session or multiple sessions totaling >= 2 hours.
4. Fault injection minimums:
   - at least 5 provider-unhealthy injections,
   - at least 5 model-confidence-below-threshold injections,
   - at least 5 kill-switch activation/clear cycles.

Soak evidence contract:

1. Root path: `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/staging_soak/<run-id>/`
2. Required files:
   - `SOAK_METADATA.json`
   - `CYCLE_RESULTS.json`
   - `FAULT_INJECTION_RESULTS.json`
   - `ANOMALY_LEDGER.md`
   - `RECONCILIATION_SUMMARY.json`
   - `SUMMARY.md`

Anomaly severity model:

1. `SEV-1`: cap bypass or trade placement under failed checks (automatic rollback trigger).
2. `SEV-2`: repeated provider/runtime failures without clean fail-closed behavior.
3. `SEV-3`: non-critical telemetry gaps or transient retry noise.

Rollback trigger matrix:

1. Any `SEV-1` anomaly -> immediate kill-switch activation and rollback to `paper_sim`.
2. More than 3 unresolved `SEV-2` anomalies -> halt soak and block promotion.
3. Any missing mandatory evidence file -> soak run invalid.

Checklist:

1. Run at least 100 synthetic decision cycles.
2. Confirm `staging_synth` never places live orders.
3. Collect latency and error-rate telemetry.
4. Confirm daily reconciliation artifacts are produced.
5. Record all anomalies and mitigation notes.

Exit criteria:

1. synthetic soak passes without unresolved safety anomalies,
2. provider failure handling remains fail-closed,
3. blocker ledger is updated with evidence.

---

## Stage 5: Limited live candidate gate

Objective: decide whether to move from `NO_GO` to limited live test window.

Canary profile (`PSNP-025`):

1. Observation window: `7` calendar days.
2. Reduced caps for canary:
   - `MAX_TRADE_NOTIONAL_USDC=10`
   - `MAX_DAILY_NOTIONAL_USDC=30`
   - `MAX_OPEN_RISK_USDC=20`
   - `MAX_OPEN_POSITIONS=2`
3. Allowed strategy scope: one approved strategy version at a time.
4. Allowed market scope: max 2 simultaneous market IDs during canary.
5. Mandatory operator check-ins:
   - session start
   - session end
   - any kill-switch event

Canary evidence contract:

1. Root path: `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/live_canary/<run-id>/`
2. Required files:
   - `CANARY_CONFIG_SNAPSHOT.json`
   - `DAILY_METRICS.json`
   - `HOLD_REASON_DISTRIBUTION.json`
   - `INCIDENT_LOG.md`
   - `FINAL_REVIEW.md`

Automatic rollback conditions:

1. Any `SEV-1` event.
2. Two consecutive unresolved reconciliation anomalies.
3. Provider outage pattern causing >20% cycle failure in a day.
4. Daily realized loss exceeds canary limit.
5. Missing mandatory daily evidence output.

Checklist:

1. Re-run launch checklist against current deployment.
2. Confirm prepaid-card limits and reserve floor controls are active.
3. Confirm emergency rollback procedure runtime-tested:
   - force `paper_sim`
   - activate kill switch
   - verify no new entries
4. Produce updated decision package (`GO` or `NO_GO`).

Exit criteria:

1. explicit decision recorded,
2. evidence attached,
3. if `GO`, run `live_limited` with reduced observation caps only.

---

## Rollback contract (all stages)

If any critical safety regression appears:

1. set `PSNP_TRADING_KILL_SWITCH=1`,
2. switch mode to `paper_sim`,
3. stop new order evaluation/execution paths,
4. capture incident notes and audit excerpts,
5. keep status `NO_GO` until verified fix is complete.
