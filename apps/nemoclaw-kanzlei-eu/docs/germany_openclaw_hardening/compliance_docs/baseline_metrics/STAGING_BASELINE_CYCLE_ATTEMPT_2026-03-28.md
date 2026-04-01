# Staging Baseline Cycle Attempt (2026-03-28)

Timestamp (UTC): `2026-03-28T12:30:00Z`  
Queue row: `NCLAW-012`  
Track: `apps/nemoclaw-kanzlei-eu` protected DSGVO-separated deployment track

## Inputs used

1. Consented test number: `+4939734409994`
2. Traffic mode: real live run (`--confirm-live`)
3. Call settings: `--calls 3 --turns 1 --mode conversation`
4. Prompt policy: synthetic-only messages, no client/mandant data
5. Target: staging (`root@188.245.215.54`, sandbox `sevenlayers-legal-eu`)

## Command executed

```bash
bash /Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/run-voicecall-baseline-cycle.sh \
  --to +4939734409994 \
  --target staging \
  --env-file /Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env \
  --calls 3 \
  --turns 1 \
  --mode conversation \
  --initial-message 'Hallo, dies ist ein rein synthetischer Baseline-Testanruf ohne Mandantendaten.' \
  --followup-message 'Dies ist weiterhin ein synthetischer Test fuer Baseline-Metriken.' \
  --pilot-last 400 \
  --label-prefix nclaw012-20260328-live \
  --confirm-live
```

## Result

Execution stopped at remote preflight before call placement:

1. Preflight reached remote sandbox and executed `openclaw --help`.
2. `openclaw --help` in sandbox did not expose `voicecall`/`voice-call`.
3. Script terminated with:
   - `voicecall command unavailable in sandbox 'sevenlayers-legal-eu'.`
   - `Enable @openclaw/voice-call in immutable sandbox config before baseline run.`
   - `ERROR: Remote sandbox preflight failed`

No new pilot `calls.jsonl`, `metrics.json`, or comparison artifact was generated in this attempt.

## Blocking state

`NCLAW-012` remains `BLOCKED` with two open blockers:

1. Staging sandbox immutable plugin state does not currently provide `openclaw voicecall`.
2. Current-path `calls.jsonl` source is still unavailable for matched comparator collection.

Fail-closed policy remains active: external/public client-data release is still `NO_GO`.
