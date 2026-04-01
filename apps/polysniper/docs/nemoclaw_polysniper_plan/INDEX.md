# Polysniper NemoClaw Plan Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan`  
**Source request date:** 2026-03-28  
**Primary objective:** Build a separate NemoClaw deployment plan for `polysniper` with practical solo-operator safety controls and prepaid-card bounded trading risk.

---

## Purpose

This workstream is the canonical queue-first planning surface for the `polysniper` NemoClaw deployment track.

It focuses on:

1. strict isolation from `apps/nemoclaw-kanzlei-eu`,
2. practical security and secrets boundaries for a single operator,
3. safety-gated automated Polymarket trading,
4. staged rollout from dry-run to limited live exposure.

---

## Current status

1. Queue-first artifacts are active: `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `MASTER_PLAN.md`, and `INDEX.md`.
2. Rows `PSNP-001` through `PSNP-028` are `DONE` (`PSNP-016+` adds host portability evidence and Docker-first rollout path lock).
3. Isolation boundary matrix and secrets namespace/rotation contract are locked.
4. Safety baseline is locked: sim-first, spend caps, open-risk cap, hard kill switch, model/provider fail-safe, and audit/event logging schema.
5. Wallet/payment controls are locked to prepaid-card bounded risk with reconciliation and insufficient-funds halt policy.
6. Staged rollout gates are locked: local dry-run -> staging synthetic trades -> limited live exposure.
7. Initial release decision package is published as `NO_GO` with blocker ledger `BLK-PSNP-01` to `BLK-PSNP-03` pending execution evidence.
8. Weekly single-operator operating cadence is published.
9. Local latency baseline artifact is captured at `evidence/latency/LOCAL_BASELINE_2026-03-28.json` using the benchmark tool.
10. Hostinger discovery artifact is captured at `evidence/latency/HOSTINGER_DISCOVERY.json` (10 data centers, 116 templates, 8 VPS catalog items).
11. Docker-to-VPS runbook is published at `DOCKER_TO_VPS_BOOTSTRAP_RUNBOOK.md`.
12. Local Docker runtime spec lock (`PSNP-021`) is complete (image/ports/mounts/env/kill-switch contract).
13. Local Docker validation evidence contract (`PSNP-022`) is complete (scenario/evidence schema lock).
14. Hostinger VPS bootstrap profile (`PSNP-023`) is complete (region rule, hardening, staging secret boundary).
15. VPS staging synthetic-soak evidence contract (`PSNP-024`) is complete (fault injection, anomaly model, rollback triggers).
16. Limited-live canary contract (`PSNP-025`) is complete with reduced-cap and automatic rollback policy.
17. Local Docker runtime asset implementation (`PSNP-027`) is complete (`Dockerfile`, compose, env template).
18. First local Docker evidence run (`PSNP-028`) is complete at `evidence/local_docker/LDV-20260328T110845Z-v1` (`31/31` pass).
19. Hostinger provisioning manifest/API validation prep (`PSNP-029`) is complete with evidence in `evidence/hostinger/`.
20. Hostinger staging deployment row (`PSNP-030`) is complete with runtime evidence at `evidence/staging_bootstrap/STGBOOT-20260328T141334Z-v1/` (`staging_synth`, healthy container).
21. VPS synthetic soak row (`PSNP-031`) is complete at `evidence/staging_soak/STGSOAK-20260328T153247Z-v1/` with `100` nominal cycles and required fault-injection minimums (`5/5/5`).
22. Release decision row (`PSNP-026`) is complete with updated decision package and blocker deltas.
23. Updated tranche `PSNP-032` to `PSNP-056` is complete (`DONE`), with credential-rotation rows intentionally deferred and legal/eligibility + OpenClaw control-plane gates enforced before canary rerun.
24. Network hardening and firewall evidence is captured at `evidence/network/NETEVID-20260401T065838Z-postharden-v1/` (key-only SSH validated, deny-by-default firewall active).
25. Execution integration row `PSNP-037` is `DONE` with unified Gamma/CLOB mode-gated path in runtime.
26. Pre-trade safety middleware row `PSNP-038` is `DONE` with explicit fail-closed cap and kill-switch enforcement in `/v1/trades/execute`.
27. Provider/model fail-safe row `PSNP-039` is `DONE` with deterministic classification and bounded retry-ceiling behavior.
28. Correlated audit-chain row `PSNP-040` is `DONE` with replayable trace IDs and linked event payloads.
29. Authenticated CLOB SDK patch row `PSNP-046` is `DONE` with official `@polymarket/clob-client` order flow (`createOrder` + `postOrder`) and signer/chain/signature/funder/creds initialization.
30. Geo closed-only gate enforcement is fail-closed in live mode (`PSNP_POLY_REQUIRE_OPEN_ONLY=1` baseline), preserving `NO_GO` posture on blocked/unknown region state.
31. Local dry-run rerun row `PSNP-041` is complete with evidence package `evidence/local_docker/LDR-20260401T143838Z-v1/` (`30/30` pass).
32. Staging synthetic-soak rerun row `PSNP-042` is complete with evidence package `evidence/staging_soak/STGSOAK-20260401T144302Z-v2/` (`100` nominal + `15` fault injections).
33. Limited-live canary preflight row `PSNP-043` is complete with bundle `evidence/live_canary/LCANARY-PREFLIGHT-20260401T1448Z-v1/`.
34. `PSNP-044` (live canary Day-1) is currently `BLOCKED` pending operator-controlled prerequisites.
35. Failure-injection evidence row `PSNP-055` is complete at `evidence/local_docker/FIM-20260401T142859Z-v1/` and confirms deny outcomes for blocked, close-only, unknown, missing-approval, and kill-switch-active cases.

---

## Release posture

1. Current release posture: `NO_GO` for live trading.
2. Mandatory gate evidence (`PSNP-028`, `PSNP-030`, `PSNP-031`) remains complete; blocker status is now:
   - `BLK-PSNP-04`: open (`PSNP-033` and `PSNP-034` credential rotation deferred).
   - `BLK-PSNP-05`: closed with hardening evidence (`PSNP-035` and `PSNP-036` done).
   - `BLK-PSNP-06`: open by design after `PSNP-056`; no operator-evidenced `ACTIVE + eligible` execution profile exists yet, so branch remains `simulation-only`.
3. Next deterministic execution path is fixed:
   - `PSNP-044` (`BLOCKED`): limited-live Day-1 execution evidence.
   - `PSNP-045`: release decision refresh after Day-1 evidence.
4. Fallback posture remains `paper_sim` mode with kill switch available.
5. Fresh-install strategy is host-agnostic; Hostinger is an active target in phase 2.

---

## Core files

- Queue: `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/MASTER_PLAN.md`
- Workstream index: `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/INDEX.md`
- Hosting latency runbook: `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/HOSTING_LATENCY_RUNBOOK.md`
- Docker-to-VPS rollout runbook: `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/DOCKER_TO_VPS_BOOTSTRAP_RUNBOOK.md`

---

## Operating commands

- `npm run docs:guard` (`docs:ci` gate for this workstream)
- `npm run typecheck`
