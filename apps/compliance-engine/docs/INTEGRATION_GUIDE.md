# Integration Guide

This runbook is for phase-0 governance integration only. `compliance-engine`
acts as control plane for governance, evidence, and release gates. It does not
replace telephony, agent runtime orchestration, or inference routing.

## Scope and control-plane contract

1. Runtime lane stays in ElevenLabs/OpenClaw/NemoClaw.
2. compliance-engine exposes readiness and evidence APIs consumed by runtime lanes.
3. Any missing readiness signal must be treated as `NO_GO` (fail closed).

## Environment contract (deterministic)

All values below must be explicit in staging.

| Component | Variable | Required | Example | Purpose |
|---|---|---|---|---|
| Sidecar | `HOST` | yes | `127.0.0.1` | Binding interface |
| Sidecar | `PORT` | yes | `3335` | API port |
| Sidecar | `COMPLIANCE_DB_PATH` | yes | `./data/compliance.db` | Governance state store |
| Sidecar | `COMPLIANCE_VAULT_PATH` | yes | `./data/vault` | Evidence artifact vault |
| Sidecar | `COMPLIANCE_ENCRYPTION_KEY` | yes (staging/prod) | `hex-64` | Evidence encryption key |
| Sidecar | `COMPLIANCE_FRAMEWORKS` | yes | `gdpr,stgb_203` | Active legal framework set |
| Sidecar | `LOG_LEVEL` | yes | `info` | Audit/debug verbosity |
| OpenClaw plugin | `sidecar_url` | yes | `http://127.0.0.1:3335` | Sidecar endpoint |
| OpenClaw plugin | `fail_closed` | yes | `true` | Block operations if sidecar unavailable |
| OpenClaw plugin | `auto_audit` | yes | `true` | Force audit trail capture |

## Deterministic staging deployment runbook

### Step 1: Preflight

```bash
cd apps/compliance-engine
npm install
```

Prepare env:

```bash
export HOST=127.0.0.1
export PORT=3335
export COMPLIANCE_DB_PATH=./data/compliance.db
export COMPLIANCE_VAULT_PATH=./data/vault
export COMPLIANCE_ENCRYPTION_KEY="<set-32-byte-hex-or-equivalent>"
export COMPLIANCE_FRAMEWORKS=gdpr,stgb_203
export LOG_LEVEL=info
```

### Step 2: Start sidecar

```bash
npm run dev
```

### Step 3: Hard health checks (must pass)

```bash
curl -fsS http://127.0.0.1:3335/healthz
curl -fsS http://127.0.0.1:3335/readyz
curl -fsS http://127.0.0.1:3335/api/v1/governance/readiness
```

Expected readiness fields for release-gate consumers:
1. `decision`
2. `blockers`
3. `evidence_count`
4. `generated_at`

### Step 4: Plugin wiring for OpenClaw/NemoClaw staging

Copy plugin package into runtime plugin path:

```bash
cp -r apps/compliance-engine/plugin/ /path/to/openclaw/plugins/compliance-engine/
```

Set plugin config:

```json
{
  "sidecar_url": "http://127.0.0.1:3335",
  "fail_closed": true,
  "auto_audit": true
}
```

### Step 5: Fail-closed probes (must deny progression)

1. Stop the sidecar and invoke plugin-backed governance tool call.
2. Confirm call fails or returns explicit unavailable state.
3. Confirm release recommendation remains `NO_GO`.
4. Restart sidecar, re-run `/readyz`, and re-run readiness export.

## Operator checklist (required before weekly release package)

1. Sidecar health and readiness probes return success.
2. Readiness payload includes `decision`, blockers array, evidence count, and timestamp.
3. `fail_closed=true` is active in plugin config.
4. Governance owner is assigned for any blocker in readiness output.
5. If any blocker lacks owner or mitigation, release state remains `NO_GO`.
6. Evidence artifacts required by active providers are present or tracked as blockers.
7. Runtime lane references are unchanged (no telephony/agent/inference replacement work).

## NemoClaw network policy contract (interface-only)

```yaml
network:
  allowed_endpoints:
    - host: "127.0.0.1"
      port: 3335
      protocol: tcp
      reason: "governance-control-plane sidecar"
```

If this endpoint is unavailable, runtime release gate must fail closed.
