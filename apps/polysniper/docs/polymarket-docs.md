# Polymarket Integration Notes (Polysniper)

## Primary docs

1. [Polymarket developer docs](https://docs.polymarket.com/)
2. [Polymarket US docs](https://docs.polymarket.us/getting-started/welcome)
3. Local skill bundle profile: `apps/polysniper/docs/polymarket-skills/POLYSNIPER_RUNTIME_PROFILE.md`

## Scope for this repository

1. Single operator, single tenant (`polysniper` only).
2. Isolated deployment track from `apps/nemoclaw-kanzlei-eu`.
3. Safety-first execution: `paper_sim` first, then staged synthetic, then limited live.
4. Trading model target: `Claude Opus 2.4`.

## Polymarket surfaces to integrate

1. Read path (market/event data): `https://gamma-api.polymarket.com`
2. Trade path (order book / execution): `https://clob.polymarket.com`
3. Optional stream/latency probe surface: `wss://ws-subscriptions-clob.polymarket.com`

## Current local server contract

`apps/polysniper/server/server.mjs` exposes the risk and execution control plane:

1. `GET /healthz`
2. `GET /v1/status`
3. `POST /v1/mode`
4. `POST /v1/kill-switch/activate`
5. `POST /v1/kill-switch/clear`
6. `POST /v1/signal/evaluate`
7. `POST /v1/trades/paper/execute`
8. `POST /v1/trades/close`

The server is simulation-first and currently executes paper fills only.

## Signal payload contract (current)

Minimum fields used by risk evaluation:

1. `requestedNotionalUsd`
2. `edgePct`
3. `confidencePct`
4. `modelConfidence`
5. `providerHealthy`
6. `marketId` (recommended)
7. `side` (`YES` or `NO`, recommended)
8. `strategy` (recommended)

Example payload:

```json
{
  "marketId": "12345",
  "side": "YES",
  "strategy": "oracle-gap-v1",
  "requestedNotionalUsd": 10,
  "edgePct": 6.2,
  "confidencePct": 81,
  "modelConfidence": 0.84,
  "providerHealthy": true
}
```

## Risk gate behavior (fail-closed)

Risk checks are enforced before any order action:

1. Kill switch
2. Provider health
3. Model confidence threshold
4. Minimum edge
5. Minimum confidence
6. Max per-trade notional
7. Max daily notional
8. Max open risk
9. Max open positions
10. Reserve floor
11. Prepaid balance

If any check fails, action is `HOLD` and the decision is logged.

## Kill-switch channels

1. Manual API: `POST /v1/kill-switch/activate`
2. Env guard: `PSNP_TRADING_KILL_SWITCH=1`
3. Flag file: `apps/polysniper/.runtime/kill-switch.flag`

## Environment variables currently wired

1. `PSNP_SERVER_HOST` (default `127.0.0.1`)
2. `PSNP_SERVER_PORT` (default `8787`)
3. `PSNP_DATA_DIR` (default `apps/polysniper/server/data`)
4. `PSNP_RUNTIME_MODE` (`paper_sim`, `staging_synth`, `live_limited`)
5. `PSNP_TRADING_KILL_SWITCH` (`0` or `1`)
6. `MAX_TRADE_NOTIONAL_USDC`
7. `MAX_DAILY_NOTIONAL_USDC`
8. `MAX_OPEN_RISK_USDC`
9. `MAX_OPEN_POSITIONS`
10. `MIN_EDGE_PCT`
11. `MIN_CONFIDENCE`
12. `PSNP_PREPAID_BALANCE_USD`
13. `PSNP_RESERVE_FLOOR_USD`
14. `PSNP_MODEL_TARGET` (default `claude-opus-2.4`)
15. `PSNP_MODEL_PROVIDER` (default `anthropic`)
16. `PSNP_MODEL_CONFIDENCE_THRESHOLD` (default `0.62`)

## Quick local test flow

Start server:

```bash
node apps/polysniper/server/server.mjs
```

Status:

```bash
curl -sS http://127.0.0.1:8787/v1/status | jq
```

Evaluate signal:

```bash
curl -sS -X POST http://127.0.0.1:8787/v1/signal/evaluate \
  -H 'content-type: application/json' \
  -d '{
    "marketId":"12345",
    "side":"YES",
    "requestedNotionalUsd":10,
    "edgePct":6,
    "confidencePct":80,
    "modelConfidence":0.9,
    "providerHealthy":true
  }' | jq
```

Activate kill switch:

```bash
curl -sS -X POST http://127.0.0.1:8787/v1/kill-switch/activate | jq
```

Smoke test:

```bash
node apps/polysniper/server/smoke-test.mjs
```

## Evidence + latency tooling

1. Latency benchmark: `npm run polysniper:latency:bench -- --iterations 12 --timeout-ms 6000`
2. Hostinger discovery: `npm run polysniper:hostinger:discover -- --include-catalog`
3. Local baseline evidence path: `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/latency/LOCAL_BASELINE_2026-03-28.json`
4. Hostinger discovery evidence path: `apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/latency/HOSTINGER_DISCOVERY.json`

## Rollout gates for live trading

1. Gate 1: local dry-run pass (`paper_sim`, deterministic scenarios).
2. Gate 2: staging synthetic pass (no real fund movement).
3. Gate 3: limited live pass (tight notional caps + observation window).
4. `NO_GO` remains in effect until queue blockers are closed with evidence.
