# OpenClaw Hetzner EU-MVP Deployment Bundle

This folder contains app-local deployment templates for the separate NemoClaw/OpenClaw pilot.

Files:

1. `server.env.example` - server-side environment template (`.env` for OpenClaw repo).
2. `openclaw.eu-mvp.json5` - runtime config template with EU OpenRouter endpoint pin.
3. `pipeline.env.example` - local-to-staging/prod promotion variables.
4. `local-openclaw.env.example` - local Docker OpenClaw env template.
5. `scripts/local-openclaw-dev.sh` - local Docker controls (`up|down|ps|logs`).
6. `scripts/deploy-staging.sh` - deploy exact commit to staging host.
7. `scripts/promote-prod.sh` - promote release tag to production host (tag-only).

Primary runbook:

1. `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/DEPLOY_HETZNER_OPENCLAW_EU_MVP.md`
2. `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/LOCAL_TO_PROD_PROMOTION_RUNBOOK.md`
