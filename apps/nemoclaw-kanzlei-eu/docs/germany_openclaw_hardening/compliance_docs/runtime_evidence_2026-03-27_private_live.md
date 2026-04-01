# Runtime Evidence Log: Private Live Bring-Up

Snapshot date: 2026-03-27
Environment: Hetzner Germany server, NemoClaw sandbox `sevenlayers-legal-eu`

## Deployment summary

- NemoClaw onboard completed with provider route `Other OpenAI-compatible endpoint`.
- Model configured: `anthropic/claude-sonnet-4.6` (via OpenRouter path).
- Sandbox created: `sevenlayers-legal-eu`.
- Access model: SSH tunnel to `127.0.0.1:18789`.

## Evidence capture checklist

1. Sandbox status output captured (`nemoclaw sevenlayers-legal-eu status`).
2. Log snippet captured (`nemoclaw sevenlayers-legal-eu logs --follow`).
3. Firewall posture captured (no public UI port).
4. Tunnel access verified from local browser.
5. Provider endpoint and model selection captured from onboarding output.

## Known constraints at this snapshot

1. OpenRouter EU regional endpoint is not yet enabled on account (403 observed earlier).
2. Current path is technical MVP readiness, not legal production readiness.
3. External client-data go-live remains blocked until provider legal evidence closure.

## Next evidence to add

1. OpenRouter enterprise response trail and routing enablement confirmation.
2. DPA/AVV and subprocessor package for OpenRouter path.

## NCLAW-010 live staging drill evidence

Drill execution window (UTC):
1. `2026-03-27T19:58:13Z` baseline + incident + boundary checks.
2. `2026-03-27T19:58:51Z` explicit port/firewall capture.
3. `2026-03-27T19:58:32Z` deterministic restore by immutable redeploy (`deploy-staging.sh --skip-build`).

### Commands executed

1. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh --ref HEAD --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env`
2. Remote drill bundle on staging:
   - `nemoclaw sevenlayers-legal-eu status`
   - `nemoclaw sevenlayers-legal-eu logs | tail -n 120`
   - `ss -ltnp | grep 18789 || true`
   - `nemoclaw status`
   - `nemoclaw stop`
3. Port/firewall boundary capture:
   - `ss -ltnp | grep 18789 || true`
   - `ufw status || true`
   - `iptables -S | sed -n '1,80p' || true`
4. Restore drill:
   - `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh --ref d3848164a1cd7c37c7c726020c09870aef81a41c --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env --skip-build`

### Evidence summary

1. Sandbox runtime health (`PASS`):
   - Sandbox `sevenlayers-legal-eu` phase `Ready`.
   - Commit on staging: `d3848164a1cd7c37c7c726020c09870aef81a41c`.
2. Incident drill (`PASS`):
   - Controlled incident action: `nemoclaw stop`.
   - Result: auxiliary services confirmed stopped; sandbox remained registered.
3. Permission-boundary checks (`PASS`):
   - Port `18789` listener was bound to `127.0.0.1` only (SSH tunnel endpoint), not public interface.
   - Firewall baseline captured (`ufw inactive`; iptables forward policy `DROP` with Docker chains).
   - Runtime logs captured explicit denied egress event (`CONNECT action=deny` for disallowed route), proving policy enforcement.
4. Restore drill (`PASS`):
   - Deterministic restore executed by immutable redeploy of known-good commit via app-local script.
   - Post-restore status remained `Ready` on `sevenlayers-legal-eu`.

### Release gate simulation result

1. Simulation outcome: `NO_GO` for external/public client-data release.
2. Reason: legal provider evidence chain remains incomplete (`OpenRouter`/voice/provider pack blockers still open in evidence register).
3. Technical staging readiness for private synthetic/internal operation remains `GO`.
