# Voice Baseline Metrics Runbook (`NCLAW-012`)

Snapshot date: 2026-03-28  
Scope: `apps/nemoclaw-kanzlei-eu` protected DSGVO-separated deployment track.

## Purpose

Collect comparable throughput/latency baseline numbers for:

1. Pilot path (Hetzner/NemoClaw/OpenClaw staging or prod target).
2. Current platform path.
3. Automated comparison artifact for migration recommendation.

All outputs are written under:

`apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/baseline_metrics/`

First capture attempt snapshot (2026-03-27):

1. Probe artifact: `compliance_docs/baseline_metrics/STAGING_CAPTURE_PROBE_2026-03-27.md`
2. Comparison artifact: `compliance_docs/baseline_metrics/comparisons/20260327T202726Z/COMPARISON.md`
3. Outcome: insufficient metrics (zero-traffic datasets), so `NCLAW-012` remains `BLOCKED`.

Second live cycle attempt snapshot (2026-03-28):

1. Attempt artifact: `compliance_docs/baseline_metrics/STAGING_BASELINE_CYCLE_ATTEMPT_2026-03-28.md`
2. Live run used consented number `+4939734409994` with synthetic-only prompts via `run-voicecall-baseline-cycle.sh --confirm-live`.
3. Outcome: blocked in remote preflight because staging sandbox `openclaw --help` does not expose `voicecall`; no pilot calls placed and no new pilot metrics emitted.

Immutable enablement/redeploy attempt snapshot (2026-03-28):

1. Attempt artifact: `compliance_docs/baseline_metrics/STAGING_VOICECALL_ENABLEMENT_ATTEMPT_2026-03-28.md`
2. Scope: patch/deploy/onboard loops to bake `@openclaw/voice-call` in immutable image and recreate staging sandbox.
3. Outcome: blocked by repeated OpenShell transport failures during sandbox create stream (`tls handshake eof` / `Connection reset by peer`) after image upload, so voicecall verification and live cycle execution did not complete.

## Preconditions before live cycle

1. Staging sandbox must expose `voicecall` in `openclaw --help` (immutable plugin state validated in preflight).
2. Use only consented E.164 test numbers and synthetic-only prompts/messages.
3. Current-path `calls.jsonl` source must be available to produce comparator output.

## Tooling

1. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/collect-voicecall-baseline.sh`
2. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/compare-voicecall-baselines.sh`
3. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/voicecall-baseline-tool.mjs`

## Step 1: Collect pilot baseline

Use staging defaults from `pipeline.env`:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/collect-voicecall-baseline.sh \
  --label pilot-staging \
  --target staging \
  --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env \
  --last 400
```

Or explicit remote target:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/collect-voicecall-baseline.sh \
  --label pilot-staging \
  --mode remote \
  --ssh-target root@<pilot-host> \
  --ssh-key ~/.ssh/<pilot-key> \
  --sandbox sevenlayers-legal-eu \
  --calls-file ~/.openclaw/voice-calls/calls.jsonl \
  --last 400
```

## Step 2: Collect current-path baseline

If current path logs are local:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/collect-voicecall-baseline.sh \
  --label current-path \
  --mode local \
  --calls-file ~/.openclaw/voice-calls/calls.jsonl \
  --last 400
```

If current path logs are remote, run in remote mode with current target credentials.

## Step 3: Compare pilot vs current

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/compare-voicecall-baselines.sh \
  --pilot <pilot-run>/metrics.json \
  --current <current-run>/metrics.json
```

Comparison output includes:

1. `comparison.json` (machine-readable deltas).
2. `COMPARISON.md` (human-readable recommendation).

## Required evidence for `NCLAW-012` closure

1. Pilot `SUMMARY.md` and `metrics.json`.
2. Current-path `SUMMARY.md` and `metrics.json`.
3. `COMPARISON.md` with explicit migration recommendation.
4. Queue notes updated with commands used, sample sizes, and artifact paths.

## Guardrails

1. Use matched sample windows (`--last`) between pilot and current runs.
2. Keep synthetic/internal datasets unless legal gate for client data is closed.
3. External/public client-data release remains `NO_GO` while legal evidence is unresolved.
