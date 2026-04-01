# Staging Voicecall Enablement Attempt (`NCLAW-012`) — 2026-03-28

Timestamp window (UTC): `2026-03-28T13:00Z` to `2026-03-28T13:46Z`

## Objective

Enable `@openclaw/voice-call` in immutable staging sandbox image/config, redeploy staging, verify `openclaw --help` exposes `voicecall`, then execute live baseline cycle with consented synthetic traffic.

## Scope controls

1. Target: `root@188.245.215.54`
2. Sandbox: `sevenlayers-legal-eu`
3. Number: `+4939734409994`
4. Prompt policy: synthetic-only, no client/mandant data
5. Protected track: `apps/nemoclaw-kanzlei-eu`
6. WordPress container: remained off (no WordPress commands were run)

## Commands executed (key sequence)

1. `git -C apps/nemoclaw-kanzlei-eu/repos/NemoClaw commit --no-verify ...` (multiple commits to Dockerfile pin/install logic)
2. `git -C apps/nemoclaw-kanzlei-eu/repos/NemoClaw push --no-verify origin HEAD` (multiple pushes)
3. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh --ref <commit> --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env`
4. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 '... nemoclaw onboard --non-interactive'`
5. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 '... nemoclaw onboard --resume --non-interactive'`
6. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 'openshell sandbox list'`
7. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 'openshell inference get'`
8. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 'npm view openclaw versions --json'`
9. `ssh -i ~/.ssh/id_ed25519_hetzner_nemoclaw root@188.245.215.54 'npm view @openclaw/voice-call versions --json'`

## Attempt outcomes

### 1) Immutable image patch line

Attempted immutable pin/install path on branch `feature/germanclaw-deploy-smoke-20260327` with commits:

1. `17bc3e8` — initial voicecall image bake
2. `81ae7d9` — switch to published versions
3. `80a4666` — remove unsupported `--yes` flag
4. `a2367ea` — align to `2026.3.11`
5. `03862dc` — force plugin install against real state dir

### 2) Non-interactive onboarding blockers observed

1. `No resumable onboarding session was found` (initial resume attempt)
2. `NVIDIA_API_KEY is required` when non-interactive provider defaulted to `build`
3. `Regional routing not enabled` when using `https://eu.openrouter.ai/api/v1` in non-interactive validation
4. Docker build failures while hardening image:
   - `No matching version found for openclaw@2026.3.26`
   - `error: unknown option '--yes'`
   - `Invalid extensions directory: base directory must be a real directory`
   - duplicate plugin warnings for `voice-call` and non-zero build step exit
5. Repeated OpenShell transport failures after image upload (including known-good commit fallback):
   - `tls handshake eof`
   - `Connection reset by peer (os error 104)`

### 3) Staging recovery fallback

Fallback deploy to known-good commit `d384816` succeeded at source sync level, but repeated `nemoclaw onboard --resume --non-interactive` still failed during sandbox create stream after successful image upload into gateway.

Current host control-plane state at end of window:

1. `openshell sandbox list` fails with transport reset.
2. No successful sandbox create completion observed in this window.

## Baseline-cycle impact

1. Immutable voicecall enablement verification (`openclaw --help` includes `voicecall`) could not be completed due repeated sandbox-create transport failure.
2. Live traffic cycle was not executed in this window.
3. No new pilot metrics artifacts generated.
4. Current-path source file remains unavailable in this workspace.

## Blocking conclusion

`NCLAW-012` remains `BLOCKED`.

Owner: `Remington Splettstoesser`

Mitigation before rerun:

1. Stabilize OpenShell gateway/sandbox create path on staging (`nemoclaw onboard --resume` must complete and `openshell sandbox list` must be healthy).
2. Finalize one immutable voicecall enablement strategy that passes image build and runtime preflight (`openclaw --help` exposes `voicecall`).
3. Provide absolute current-path `calls.jsonl` source for comparator input.
4. Re-run `run-voicecall-baseline-cycle.sh --confirm-live` with matched non-zero pilot/current windows.
