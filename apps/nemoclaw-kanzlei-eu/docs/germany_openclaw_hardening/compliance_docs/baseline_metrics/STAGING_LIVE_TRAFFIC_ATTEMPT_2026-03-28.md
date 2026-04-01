# Staging Live Traffic Attempt (`NCLAW-012`) — 2026-03-28

## Objective

Execute a real controlled baseline cycle on staging with consented synthetic traffic, then collect pilot/current metrics for comparator input.

## Inputs used

1. Consented destination number: `+4939734409994`
2. Calls: `3`
3. Turns per call: `1`
4. Message content: synthetic German test prompts only
5. Current-path source: unavailable in workspace (`~/.openclaw/voice-calls/calls.jsonl` missing locally)

## Commands executed

1. `bash apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/run-voicecall-baseline-cycle.sh --to +4939734409994 --target staging --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env --calls 3 --turns 1 --label-prefix nclaw012-live-20260328 --confirm-live`
2. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 'set +e; printf "openclaw voicecall call --to +4939734409994 --message \"Hallo, dies ist ein automatisierter Testanruf fuer die Baseline-Messung.\" --mode conversation\nexit\n" | openshell sandbox connect sevenlayers-legal-eu 2>&1 | sed -n "1,220p"; echo RC:$?'`
3. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 'set +e; printf "openclaw --help\nexit\n" | openshell sandbox connect sevenlayers-legal-eu 2>&1 | sed -n "1,260p"'`

## Observed results

1. Baseline cycle failed during call generation at call `1/3`.
2. In-sandbox OpenClaw returned: `error: unknown command 'voicecall'`.
3. `openclaw --help` output on staging sandbox (`OpenClaw 2026.3.11`) does not expose a `voicecall` top-level command.
4. No valid current-path dataset path was available for matched baseline comparison.

## Blocking conclusion

`NCLAW-012` remains `BLOCKED`.

### Owner

`Remington Splettstoesser`

### Mitigation required before re-run

1. Enable/install the voice-call command surface on staging so `openclaw voicecall call|continue|end` is available in sandbox `sevenlayers-legal-eu`.
2. Provide a real current-path `calls.jsonl` source with non-zero matched sample window (`--last` parity with pilot).
3. Re-run `run-voicecall-baseline-cycle.sh` with the same controlled synthetic constraints and archive pilot/current/comparison artifacts.
