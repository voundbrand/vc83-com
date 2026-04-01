# MVP Go-Live Checklist (NemoClaw Kanzlei EU)

Snapshot date: 2026-03-27
Scope: Hetzner-hosted NemoClaw/OpenClaw pilot under `apps/nemoclaw-kanzlei-eu`.

## Current go-live decision

| Release mode | Decision | Reason |
|---|---|---|
| Private technical live (SSH tunnel, no public UI port) | GO | Runtime is deployed and reachable privately on Hetzner. |
| External/public pilot with real client personal data | NO-GO | Legal provider evidence chain for OpenRouter/voice path is not fully closed. |
| Public internet exposure of OpenClaw UI | NO-GO | Must stay private tunnel-only until reverse proxy + hardened auth + gate signoff. |
| Environment tenancy model | LOCKED | Current server is staging only; production must be separate; initial customer production defaults to one-server-per-customer. |

## Gate A: Runtime and access controls (required now)

| Check | Status target | Command / Evidence |
|---|---|---|
| Sandbox status healthy | Required | `nemoclaw sevenlayers-legal-eu status` |
| Logs show no startup crash loop | Required | `nemoclaw sevenlayers-legal-eu logs --follow` |
| UI reachable only via SSH tunnel | Required | `ssh -N -L 18789:127.0.0.1:18789 root@<server-ip>` |
| Port 18789 not publicly exposed | Required | Hetzner firewall rules export + `ss -ltnp | rg 18789` |
| OpenRouter endpoint confirmed | Required | Onboard output + runtime config evidence for `https://openrouter.ai/api/v1` or EU endpoint when enabled |

## Gate B: Compliance evidence closure (required for real client data)

| Evidence item | Status |
|---|---|
| OpenRouter enterprise legal pack (DPA/AVV + subprocessors + routing confirmation) | Pending |
| Upstream model provider legal basis in BYOK chain | Pending |
| Voice provider legal pack (if voice enabled in MVP) | Pending |
| Transactional email provider decision + legal basis | Pending |
| Incident drill + restore drill evidence | Complete (technical staging drill recorded in `compliance_docs/runtime_evidence_2026-03-27_private_live.md`) |

Policy: until Gate B is complete, run synthetic or internal test data only.

## Gate C: Public exposure hardening (required before public access)

1. Reverse proxy with TLS (`443` only), no direct public `18789`.
2. Strong auth boundary and token rotation policy.
3. Explicit firewall inbound policy (`22` admin path, `443` app path).
4. Immutable audit log retention and backup restore test evidence.

## Gate D: Production tenancy boundary (required before first customer)

1. Keep the current `sevenlayers-legal-eu` environment as staging.
2. Provision a separate production environment/server for customer traffic.
3. Run initial customer MVP as `single-tenant` by default (one customer per production environment).
4. Do not onboard multi-customer shared production until separate multi-tenant controls and legal evidence are completed.
5. Apply the exact Hetzner baseline in `HETZNER_PROD_BASELINE_SINGLE_TENANT.md`.

## Day-0 execution checklist (today)

1. Confirm server health and sandbox status.
2. Confirm private UI access via SSH tunnel.
3. Record runtime evidence in `compliance_docs/runtime_evidence_2026-03-27_private_live.md`.
4. Lock pilot mode to internal/synthetic data.
5. Start provider evidence closure with OpenRouter enterprise contact trail.
6. Execute staging rollout waves from `STAGING_AGENT_ENABLEMENT_RUNBOOK.md`.

## Human actions needed from you

1. Keep tunnel-based access only (do not expose UI port publicly).
2. Continue OpenRouter enterprise EU routing request and store replies in compliance docs.
3. Decide transactional email path (self-hosted Hetzner SMTP vs external EU provider).
4. Confirm whether voice path is in MVP launch scope now or deferred.

## Exit criteria for external pilot GO

1. `NCLAW-010` validation row complete with dated evidence.
2. `NCLAW-011` release package signed (`GO`) with no unresolved `E-LGL-*` blockers.
3. Public hardening gate complete and documented.
