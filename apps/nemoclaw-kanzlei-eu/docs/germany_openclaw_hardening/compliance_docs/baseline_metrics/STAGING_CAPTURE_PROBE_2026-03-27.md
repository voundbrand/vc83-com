# Staging Baseline Probe (2026-03-27)

## Purpose

Validate whether staging currently contains real voice-call baseline data (`calls.jsonl`) for `NCLAW-012`.

## Commands executed

1. `find / -name calls.jsonl 2>/dev/null | head -n 40`
2. `node /opt/NemoClaw/bin/nemoclaw.js sevenlayers-legal-eu status`
3. `node /opt/NemoClaw/bin/nemoclaw.js sevenlayers-legal-eu logs | grep -En "voice-call|continueCall latency|lastTurnLatencyMs" || true`

## Results

1. `calls.jsonl` discovery result: no files found on staging.
2. Sandbox status result: `sevenlayers-legal-eu` is `Ready`.
3. Voice-call latency markers in runtime logs: no matching entries in captured log window.

## Capture decision

Because no real call ledger exists yet, a zero-traffic placeholder capture was executed for deterministic evidence generation:

1. Pilot capture artifact: `compliance_docs/baseline_metrics/20260327T202716Z_pilot-staging-real-no-traffic/`
2. Current-path placeholder capture artifact: `compliance_docs/baseline_metrics/20260327T202721Z_current-path-real-no-traffic/`
3. Comparison artifact: `compliance_docs/baseline_metrics/comparisons/20260327T202726Z/COMPARISON.md`

Result: comparison is `insufficient metrics`; row remains blocked pending matched non-zero traffic samples.
