# Polysniper NemoClaw Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally.
2. Lane `A` must complete before lane `B` starts.
3. Lane `C` and lane `D` start only after `PSNP-006` is `DONE`.
4. Lane `E` starts only after lane `C` and lane `D` `P0` rows are `DONE`.
5. Lane `F` starts only after lane `E` `P0` rows are `DONE`.
6. Fail-closed policy is mandatory; unknown safety state means no live orders.
7. `apps/polysniper` artifacts must remain isolated from `apps/nemoclaw-kanzlei-eu` runtime and secrets.
8. Lane `G` execution order is fixed: local Docker rows (`PSNP-020` to `PSNP-022`) close before VPS rows (`PSNP-023+`).
9. Lane `H` starts after `PSNP-026`; credential-rotation rows may remain deferred (`PENDING`) on explicit operator request.
10. Lane `I` may proceed after `PSNP-026` when credential-rotation rows are intentionally deferred.
11. Lane `J` starts only after lane `I` `P0` rows are `DONE`.
12. Lane `L` starts only after lane `J` `P0` rows are `DONE`.
13. Lane `M` starts only after lane `L` `P0` rows are `DONE`.
14. Lane `K` starts only after lane `M` `P0` rows are `DONE`.
15. `docs:ci` gate for this workstream is `npm run docs:guard`.

---

## Deterministic execution order contract

Use this algorithm for each row transition:

1. Filter rows by priority: `P0` first, then `P1`.
2. Within selected priority, include only rows with all dependencies `DONE`.
3. If multiple rows are eligible, pick the lowest numeric task ID.
4. Move exactly one row to `IN_PROGRESS`.
5. Execute row changes and all listed `Verify` commands.
6. Move row to `DONE` only after verification passes.
7. If blocked, move row to `BLOCKED` and record owner plus mitigation in `Notes`.
8. Recompute dependency promotions after each transition.

Current deterministic state:

1. Baseline planning and Docker/VPS execution rows `PSNP-001` through `PSNP-031` are complete (`DONE`).
2. Updated release decision row `PSNP-026` is complete with posture `NO_GO`.
3. Credential-rotation rows `PSNP-033` and `PSNP-034` are deferred and remain `PENDING`.
4. Integration row `PSNP-037` is complete (`DONE`) with unified mode-gated execution adapters.
5. Safety middleware row `PSNP-038` is complete (`DONE`) with explicit fail-closed pre-trade enforcement in unified execution.
6. Provider/model fail-safe row `PSNP-039` is complete (`DONE`) with deterministic classification and retry-ceiling enforcement.
7. Correlated audit-chain row `PSNP-040` is complete (`DONE`) with replayable trace IDs across evaluate/execute/kill-switch flows.
8. SDK execution patch row `PSNP-046` is complete (`DONE`) with authenticated `@polymarket/clob-client` submit flow (`createOrder` + `postOrder`) and geo closed-only fail-closed gate enforcement.
9. Legal/eligibility and OpenClaw control-plane tranche `PSNP-047` to `PSNP-056` is complete (`DONE`).
10. `PSNP-041` is complete with local dry-run evidence package `LDR-20260401T143838Z-v1` (`30/30` pass).
11. `PSNP-042` is complete with staging soak evidence package `STGSOAK-20260401T144302Z-v2` (`100` nominal + `15` fault injections).
12. `PSNP-043` is complete with canary preflight bundle `LCANARY-PREFLIGHT-20260401T1448Z-v1`.
13. `PSNP-044` is `BLOCKED` pending human operator actions: credential rotation closure (`BLK-PSNP-04`), eligible active profile evidence (`BLK-PSNP-06`), and funded live canary wallet.
14. `GO` is not eligible until `PSNP-045` closes and blockers `BLK-PSNP-04` plus `BLK-PSNP-06` are both closed with evidence.

---

## Prompt A (Lane A: boundaries and secrets)

You are executing lane `A` for `polysniper` workstream bootstrap.

Tasks:

1. Keep workstream artifacts synchronized.
2. Lock isolation from `apps/nemoclaw-kanzlei-eu`.
3. Define practical single-operator secrets handling.

Requirements:

1. Keep controls concrete and lightweight.
2. Run `npm run docs:guard`.

---

## Prompt B (Lane B: trading safety guardrails)

You are executing lane `B` for baseline trading safety policy.

Tasks:

1. Keep paper/sim-first policy explicit.
2. Define per-trade/per-day/open-risk limits.
3. Define hard kill-switch behavior.

Requirements:

1. Unknown control state must fail to no-trade.
2. Run `npm run docs:guard`.

---

## Prompt C (Lane C: prepaid-card bounded risk)

You are executing lane `C` for wallet/payment risk controls.

Tasks:

1. Define prepaid-card funding envelope and cap policy.
2. Define reconciliation and insufficient-funds handling.

Requirements:

1. No automatic fallback to unbounded capital sources.
2. Run `npm run docs:guard`.

---

## Prompt D (Lane D: model/provider and audit)

You are executing lane `D` for inference reliability and traceability.

Tasks:

1. Lock model target at Claude Opus 2.4.
2. Define provider/model fail-safe behavior as `HOLD`.
3. Define minimum audit/event logging fields.

Requirements:

1. Provider or confidence failure cannot place live orders.
2. Run `npm run docs:guard`.

---

## Prompt E (Lane E: rollout gates)

You are executing lane `E` for staged rollout controls.

Tasks:

1. Define local dry-run gate criteria.
2. Define staging synthetic-trade gate criteria.
3. Define limited live exposure gate criteria.

Requirements:

1. Preserve deterministic evidence requirements for each gate.
2. Run `npm run docs:guard`.

---

## Prompt F (Lane F: release decision)

You are executing lane `F` for launch decision and early operations cadence.

Tasks:

1. Publish `GO`/`NO_GO` decision package after gate closure.
2. Define initial weekly review cadence.

Requirements:

1. `GO` is impossible while any mandatory safety gate is open.
2. Run `npm run docs:guard` and `npm run typecheck` where required.

---

## Prompt G (Lane G: Docker-to-VPS rollout)

You are executing lane `G` for Docker-first rollout and host portability.

Tasks:

1. Keep the rollout order deterministic: local Docker first, then Hostinger VPS.
2. Keep mode defaults fail-closed (`paper_sim` local, `staging_synth` on first VPS deploy).
3. Define evidence requirements for each promotion gate before limited live.

Requirements:

1. Do not allow direct live execution path before `PSNP-025` closure.
2. Keep all artifacts app-local under `apps/polysniper`.
3. Run `npm run docs:guard`.

---

## Prompt H (Lane H: secrets hygiene and rotation evidence)

You are executing lane `H` for secrets blocker closure.

Tasks:

1. Remove plaintext credential artifacts from tracked docs/config.
2. Publish sanitized credential inventory and rotation ledger evidence.
3. Close `BLK-PSNP-04` only after rotation and fail-closed validation evidence is attached.

Requirements:

1. Never store raw secret values in repo evidence.
2. Use hashes/fingerprints and timestamps for auditability.
3. Run `npm run docs:guard`.

---

## Prompt I (Lane I: network hardening and firewall evidence)

You are executing lane `I` for infrastructure hardening evidence.

Tasks:

1. Apply SSH and host hardening baseline on staging VPS.
2. Enforce inbound allowlist with deny-by-default firewall policy.
3. Capture deterministic before/after evidence and close `BLK-PSNP-05`.

Requirements:

1. Preserve operator access while hardening.
2. Fail closed on ambiguous exposure state.
3. Run `npm run docs:guard`.

---

## Prompt J (Lane J: real Polymarket execution integration)

You are executing lane `J` for real execution path implementation.

Tasks:

1. Implement Gamma read + CLOB execution adapters behind runtime mode gates.
2. Enforce per-trade/per-day/open-risk and kill-switch checks before any order call.
3. Enforce provider/model fail-safe behavior as `HOLD`.
4. Use official authenticated CLOB SDK flow for live submit (signer, chainId, creds, signature type, funder, `createOrder`, `postOrder`).
5. Enforce geo closed-only checks and fail closed when status is blocked/unknown.
6. Emit full correlated audit/event logs for every decision path.

Requirements:

1. Default mode remains `paper_sim`.
2. Unknown control state must produce no-trade behavior.
3. Run `npm run typecheck` and `npm run docs:guard`.

---

## Prompt L (Lane L: venue/legal eligibility control plane)

You are executing lane `L` for deterministic venue/legal eligibility gating.

Tasks:

1. Define one-active-principal execution-profile model for multi-residency/multi-banking customers.
2. Implement fail-closed eligibility classification (`eligible`, `close_only`, `blocked`, `unknown`) from geoblock plus CLOB state.
3. Enforce eligibility checks before `/v1/trades/execute` can submit any order.

Requirements:

1. Default posture is deny-by-default (`SIM_ONLY`) unless profile status is explicitly active and eligible.
2. Any probe failure or unknown state must remain `HOLD`.
3. Run `npm run typecheck` and `npm run docs:guard`.

---

## Prompt M (Lane M: OpenClaw orchestration controls)

You are executing lane `M` for agent-intent orchestration with deterministic execution authority.

Tasks:

1. Define `TradeIntent v1` contract so agents emit intent only, never direct order calls.
2. Implement deterministic intent validation + policy decision pipeline with explicit reject reasons.
3. Add operator approval controls and extend audit chain with profile/eligibility/intent/policy metadata.
4. Execute failure-injection matrix for blocked/unknown/close-only and missing-approval paths.

Requirements:

1. Kill switch, caps, and eligibility gates must dominate agent intent in every path.
2. Preserve replayable trace IDs and append fields without breaking existing schemas.
3. Run `npm run typecheck` and `npm run docs:guard`.

---

## Prompt K (Lane K: staged rollout to limited live)

You are executing lane `K` for staged promotion after integration.

Tasks:

1. Re-run local dry-run evidence with integrated adapters.
2. Re-run staging synthetic soak with required fault injections.
3. Prepare and execute tightly capped limited-live canary Day-1.
4. Publish release decision refresh row with explicit `GO`/`NO_GO`.

Requirements:

1. Any unresolved anomaly forces rollback to `paper_sim`.
2. Keep deterministic evidence under `evidence/local_docker`, `evidence/staging_soak`, and `evidence/live_canary`.
3. Run `npm run docs:guard` and required `npm run typecheck` rows.
