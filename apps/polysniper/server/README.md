# PolySniper Server (Custom)

This is a standalone server built from the risk and execution ideas in `apps/polysniper/initial_implementation_idea`.

It keeps the same core concepts while running as an HTTP service:

1. simulation-first mode (`paper_sim` by default)
2. risk-gated trade decisions (`HOLD` vs `PLACE_ORDER`)
3. hard kill switch enforcement
4. paper trade execution and ledger persistence
5. append-only JSONL audit events

## Run

```bash
node apps/polysniper/server/server.mjs
```

Config via env:

1. `PSNP_SERVER_HOST` (default `127.0.0.1`)
2. `PSNP_SERVER_PORT` (default `8787`)
3. `PSNP_DATA_DIR` (default `apps/polysniper/server/data`)
4. `PSNP_RUNTIME_MODE` (`paper_sim`, `staging_synth`, `live_limited`)
5. `PSNP_TRADING_KILL_SWITCH` (`0` or `1`)
6. `PSNP_ENABLE_LIVE_EXECUTION` (`0` by default, must be `1` for live CLOB submit path)
7. `PSNP_EXECUTION_PROFILE_ID` (default `default_profile`)
8. `PSNP_EXECUTION_PROFILE_STATUS` (`SIM_ONLY` default, `ACTIVE` for live-eligible profile)
9. `PSNP_EXECUTION_PROFILE_VENUE` (default `polymarket`)
10. `PSNP_EXECUTION_PROFILE_ENTITY` (legal entity label for audit)
11. `PSNP_EXECUTION_PROFILE_KYC_JURISDICTION` (required for live-eligible profile)
12. `PSNP_EXECUTION_PROFILE_OPERATOR_LOCATION` (required for live-eligible profile)
13. `PSNP_EXECUTION_PROFILE_BANKING_JURISDICTIONS` (comma-separated list)
14. `PSNP_EXECUTION_PROFILE_AGENT_INTENTS_ENABLED` (`0` default)
15. `PSNP_AGENT_INTENTS_GLOBAL_ENABLED` (`1` default)
16. `PSNP_AGENT_INTENTS_REQUIRE_APPROVAL` (`1` default)
17. `PSNP_POLY_GAMMA_BASE_URL` (default `https://gamma-api.polymarket.com`)
18. `PSNP_POLY_CLOB_BASE_URL` (default `https://clob.polymarket.com`)
19. `PSNP_POLY_CLOB_ORDER_PATH` (default `/order`)
20. `PSNP_POLY_PUBLIC_GEO_PATH` (default `/closed-only`)
21. `PSNP_POLY_REQUEST_TIMEOUT_MS` (default `6000`)
22. `PSNP_PROVIDER_RETRY_CEILING` (default `2`; retry ceiling for Gamma/CLOB read path only)
23. `PSNP_POLY_CHAIN_ID` (`137` Polygon mainnet, `80002` Amoy)
24. `PSNP_POLY_SIGNATURE_TYPE` (`0` EOA, `1` proxy wallet, `2` Gnosis safe)
25. `PSNP_POLY_WALLET_PRIVATE_KEY` (required for live authenticated CLOB signing)
26. `PSNP_POLY_FUNDER_ADDRESS` (required for live authenticated CLOB signing)
27. `PSNP_POLY_CLOB_API_KEY` / `PSNP_POLY_CLOB_API_SECRET` / `PSNP_POLY_CLOB_PASSPHRASE` (preferred static creds for live mode)
28. `PSNP_POLY_DERIVE_API_CREDS` (`1` default; derives creds with signer when static creds are absent)
29. `PSNP_POLY_GEO_BLOCK_TOKEN` (optional token forwarded to CLOB SDK requests)
30. `PSNP_POLY_REQUIRE_OPEN_ONLY` (`1` default; fail-closed when closed-only/geo status cannot be verified as open)
31. `PSNP_POLY_USE_SERVER_TIME` (`1` default for L1/L2 signing time source)
32. `PSNP_POLY_LIVE_ORDER_TYPE` (default `FOK`; supports `FOK`, `FAK`, `GTC`, `GTD`)
33. `PSNP_POLY_LIVE_POST_ONLY` (`0` default)
34. `PSNP_POLY_LIVE_DEFER_EXECUTION` (`0` default)
35. `PSNP_POLY_BEARER_TOKEN` (optional bearer token for public geo probe path)

Primary risk envs:

1. `MAX_TRADE_NOTIONAL_USDC` (default `15`)
2. `MAX_DAILY_NOTIONAL_USDC` (default `60`)
3. `MAX_OPEN_RISK_USDC` (default `45`)
4. `MAX_OPEN_POSITIONS` (default `4`)
5. `MIN_EDGE_PCT` (default `3`)
6. `MIN_CONFIDENCE` (default `62`)
7. `PSNP_PREPAID_BALANCE_USD` (default `300`)
8. `PSNP_RESERVE_FLOOR_USD` (default `40`)

## Endpoints

1. `GET /healthz`
2. `GET /v1/status`
3. `POST /v1/mode`
4. `POST /v1/kill-switch/activate`
5. `POST /v1/kill-switch/clear`
6. `POST /v1/signal/evaluate`
7. `POST /v1/trades/paper/execute`
8. `POST /v1/trade-intents/compile`
9. `POST /v1/agent-intents/approval/grant`
10. `POST /v1/agent-intents/approval/revoke`
11. `POST /v1/trades/execute`
12. `POST /v1/trades/close`

`POST /v1/trades/execute` behavior by mode:

1. `paper_sim`: no external Polymarket call; synthetic ledger fill only.
2. `staging_synth`: Gamma/CLOB read adapters enabled, no live order submit.
3. `live_limited`: authenticated SDK order submit path enabled only when `PSNP_ENABLE_LIVE_EXECUTION=1`.

`live_limited` authenticated submit flow:

1. Uses `@polymarket/clob-client` with signer + chain + signature type + funder + API creds.
2. Combines public geo probe (`PSNP_POLY_PUBLIC_GEO_PATH`) and authenticated closed-only state (`getClosedOnlyMode`) into deterministic eligibility classification: `eligible`, `close_only`, `blocked`, `unknown`.
3. Fails closed when classification is not `eligible` (`PSNP_POLY_REQUIRE_OPEN_ONLY=1`).
4. Uses one active execution profile (`PSNP_EXECUTION_PROFILE_*`) and denies live order path unless profile status is `ACTIVE`.
5. Creates signed orders via `createOrder` and posts via `postOrder` (no raw `/order` HTTP payload path).

`POST /v1/trades/execute` safety middleware:

1. Always runs risk decisioning before adapters.
2. Enforces kill-switch and cap checks (`maxTradeNotional`, `maxDailyNotional`, `maxOpenRisk`, `maxOpenPositions`, reserve floor, prepaid balance) fail-closed.
3. Enforces execution-profile + venue-eligibility gate before live order path (`execution_profile_not_active`, `venue_eligibility_*` deny reasons).
4. Enforces TradeIntent policy for agent-originated intents (`TradeIntent v1`) with deterministic reject reasons and policy decision IDs.
5. Returns a `safetyGate` object (`allowOrder`, `reason`, `failedReasons`) alongside execution output.
6. Returns a `failSafe` object with deterministic classification and retry metadata when provider/model or adapter faults force `HOLD`.
7. Emits replay-ready trace IDs (`chainId`, `signalId`, `decisionId`, `executionId`) plus `executionProfileId`, `eligibilitySnapshot`, `intentId`, and `policyDecisionId` in audit chain.

## Smoke Test

```bash
node apps/polysniper/server/smoke-test.mjs
```

This verifies:

1. server health
2. successful risk-approved paper trade
3. cap and kill-switch fail-closed behavior
4. deterministic trace IDs and audit-path response shape
5. status exposure with open position tracking
