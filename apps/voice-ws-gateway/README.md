# Voice WS Gateway (Fly.io)

Realtime WebSocket gateway for `apps/operator-mobile`.

## What it does

- Exposes `GET /ws` WebSocket endpoint for mobile clients.
- Exposes `POST /v1/ws-ticket` to mint short-lived signed connect tickets.
- Accepts `voice_session_open` and verifies session against Convex HTTP API.
- Accepts `audio_chunk` and relays to `/api/v1/ai/voice/transcribe`.
- Emits `partial_transcript` payloads compatible with current mobile runtime.
- Exposes `GET /healthz`, `GET /readyz`, and `GET /metrics`.
- Applies in-memory rate limits on connects, ticket minting, and audio chunk ingress.

## Security model (recommended)

1. Mobile app calls `POST /v1/ws-ticket` with its normal bearer auth.
2. Gateway mints an HMAC-signed ticket (default 90s TTL) bound to caller auth hash.
3. Mobile connects to `wss://.../ws?ticket=...`.
4. Gateway validates signature, expiry, replay, and auth binding before accepting WS.

This keeps setup complexity under the hood for end users (no manual token entry in app UI).

## Local run

```bash
cd apps/voice-ws-gateway
npm install
cp .env.example .env.local
# edit .env.local
set -a; source .env.local; set +a
npm run start
```

## Fly.io setup

```bash
cd apps/voice-ws-gateway
flyctl auth login
flyctl apps create voice-ws-gateway --org personal
flyctl secrets set CONVEX_HTTP_URL="https://your-convex-deployment.convex.site"
flyctl secrets set WS_TICKET_SECRET="$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '=')"
# Optional server-to-server auth to Convex:
flyctl secrets set CONVEX_SERVICE_AUTH_TOKEN="<token>"
flyctl deploy --config fly.toml --ha=false
flyctl status
flyctl logs
```

## Mobile config

Set in `apps/operator-mobile/.env.local` (and EAS env for builds):

```env
EXPO_PUBLIC_VOICE_TRANSPORT_MODE=websocket
EXPO_PUBLIC_VOICE_WEBSOCKET_URL=wss://voice-ws-gateway.fly.dev/ws
```

For ticket mode, client should request ticket first then connect with:

`wss://voice-ws-gateway.fly.dev/ws?ticket=<ws_ticket>`

## Observability

- Health: `/healthz`
- Readiness: `/readyz`
- Metrics snapshot (JSON): `/metrics`

## Notes

- In-memory rate limits and replay cache are per-instance. For multi-instance/HA, move these to Redis.
- Keep gateway in EU region (`fra`) and ensure data sinks/logging are also EU-scoped for DSGVO posture.
