# Hetzner Deployment Runbook (OpenClaw EU-MVP)

Snapshot date: 2026-03-27  
Scope: deploy the **separate** NemoClaw/OpenClaw app under `apps/nemoclaw-kanzlei-eu`, not the main platform runtime.

## Decision

1. Yes, deploy this pilot on your Hetzner server.
2. Keep this deployment isolated from the mother repo runtime and secrets.
3. Treat this as `EU-compliant MVP` (not strict Germany-only promise yet).

## What this runbook gives you

1. First live deployment path with OpenClaw on Hetzner.
2. OpenRouter EU endpoint pin (`https://eu.openrouter.ai/api/v1`).
3. Safe initial posture: private live deployment first (SSH tunnel), then optional public exposure.
4. Production tenancy and infra baseline is defined separately in `HETZNER_PROD_BASELINE_SINGLE_TENANT.md`.
5. Staging rollout sequence for full agent enablement is defined in `STAGING_AGENT_ENABLEMENT_RUNBOOK.md`.

## Prerequisites (you)

1. A provisioned Hetzner server with SSH access.
2. OpenRouter enterprise EU setup + API key.
3. Optional for voice pilot: ElevenLabs enterprise EU key.
4. Domain + TLS plan (only for public stage).

## Stage 1: Private live deployment (recommended first)

### 1) Server bootstrap

Run on the Hetzner host:

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 2) Copy repo / openclaw runtime to server

Example:

```bash
git clone <your-repo-url> /opt/vc83-com
cd /opt/vc83-com/apps/nemoclaw-kanzlei-eu/repos/openclaw
```

### 3) Create environment file

```bash
cp .env.example .env
```

Set at minimum:

```bash
OPENCLAW_GATEWAY_TOKEN=<long-random-token>
OPENROUTER_API_KEY=<your-openrouter-key>
OPENCLAW_GATEWAY_BIND=loopback
OPENCLAW_TZ=Europe/Berlin
```

Notes:

1. `loopback` keeps the gateway private on first deployment.
2. This is live on server, but not yet internet-exposed.

### 4) Run Docker setup

```bash
OPENCLAW_GATEWAY_BIND=loopback OPENCLAW_TZ=Europe/Berlin ./docker-setup.sh
```

When onboarding prompts appear, pick OpenRouter auth and a default model.

### 5) Force OpenRouter EU endpoint in runtime config

```bash
docker compose run --rm openclaw-cli config set models.providers.openrouter.baseUrl "https://eu.openrouter.ai/api/v1"
docker compose run --rm openclaw-cli config set agents.defaults.model.primary "openrouter/openai/gpt-oss-20b"
docker compose run --rm openclaw-cli config set agents.defaults.model.fallbacks "[\"openrouter/meta-llama/llama-3.3-70b-instruct\"]" --strict-json
docker compose up -d openclaw-gateway
```

### 6) Health checks

```bash
docker compose logs --tail=120 openclaw-gateway
docker compose run --rm openclaw-cli health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 7) Access from your laptop (private tunnel)

On your local machine:

```bash
ssh -N -L 18789:127.0.0.1:18789 <user>@<server-ip>
```

Then use local endpoint `http://127.0.0.1:18789`.

## Stage 2: Public pilot exposure (after Stage 1 is stable)

1. Put reverse proxy (Caddy/Nginx) in front with TLS.
2. Keep gateway token auth enabled.
3. Keep IP allowlist where possible.
4. Expose only required ports (`443` and `22`), keep `18789` non-public where possible.

## Isolation rules (must keep)

1. No shared secrets with mother repo production stack.
2. Separate `.env` and separate OpenClaw state dir.
3. Separate backups and log retention for this pilot.

## Evidence artifacts to save after first deployment

1. `docker compose ps` output screenshot/export.
2. Gateway health output.
3. Effective model/provider config export.
4. Proof that OpenRouter base URL is EU endpoint.

## Related files

1. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/server.env.example`
2. `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/openclaw.eu-mvp.json5`
