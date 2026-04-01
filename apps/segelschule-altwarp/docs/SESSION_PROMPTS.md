# Segelschule Checkout + Universal Booking Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/docs`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally unless explicit non-overlapping parallelism is approved.
2. Start lane `C` with `SBQ-005` before any lane `D` ticket retrieval work.
3. Do not start `SBQ-007` before both `SBQ-005` and `SBQ-006` are `DONE`.
4. Lane `E` can run in parallel with lane `C` only when file ownership stays disjoint (`src/components/...` vs `apps/segelschule-altwarp/...`).
5. Do not start lane `F` verification hardening rows before functional rows (`SBQ-006`, `SBQ-007`) are `DONE`.
6. After each row reaching `DONE`, sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md`.

Status snapshot (2026-04-01):

1. Baseline rows `SBQ-001` through `SBQ-004` are `DONE`.
2. Functional cutover rows `SBQ-005`, `SBQ-006`, and `SBQ-007` are `DONE`.
3. Lane `E` rows `SBQ-008` and `SBQ-009` are `DONE` with universal setup defaults and deterministic operator interview→execute orchestration; 2026-04-01 hardening rerun revalidated generic `my-app` fallback defaults and execute-gate kickoff metadata.
4. Lane `F` rows `SBQ-010`, `SBQ-011`, and `SBQ-012` are `DONE` with calendar diagnostics, hardening tests, and rollout evidence captured.
5. No remaining deterministic execution rows; queue is closed.

---

## Prompt C (Lane C: segelschule API checkout cutover)

You are executing lane `C` for segelschule booking API cutover.

Tasks:

1. Complete `SBQ-005`: move booking checkout handoff to fulfillment-backed checkout session flow.
2. Complete `SBQ-006`: remove online payment contract and align to on-site confirmation + terms.

Requirements:

1. Keep existing response keys additive and backward-compatible where possible.
2. Preserve seat inventory and platform booking context links.
3. Do not regress backend surface binding resolution and warnings propagation.
4. Run row `Verify` commands exactly.

---

## Prompt D (Lane D: segelschule confirmation + ticket retrieval UX)

You are executing lane `D` for ticket retrieval and confirmation UX.

Tasks:

1. Complete `SBQ-007`: implement `/ticket` page + `/api/ticket` and email/confirmation link wiring.

Requirements:

1. Public lookup must require ticket code + email.
2. Add lightweight anti-abuse controls and deterministic not-found responses.
3. Keep multilingual copy contract aligned with `lib/translations.ts`.
4. Run row `Verify` commands exactly.

---

## Prompt E (Lane E: mother repo universal booking setup)

You are executing lane `E` for reusable booking setup in the mother repo.

Tasks:

1. Complete `SBQ-008`: harden setup wizard schema and UX as universal (`inventory groups`, `profiles`, `surface binding`).
2. Complete `SBQ-009`: strengthen operator-agent chat orchestration for org-owner setup intent.

Requirements:

1. Do not hardcode boats or sailing semantics into universal contracts.
2. Keep sailing school as a preset template only.
3. Ensure agent flow can interview, bootstrap, and list bindings deterministically.
4. Run row `Verify` commands exactly.

---

## Prompt F (Lane F: verification, calendar hardening, rollout closeout)

You are executing lane `F` for validation and release readiness.

Tasks:

1. Complete `SBQ-010`: calendar readiness/diagnostic hardening.
2. Complete `SBQ-011`: tests for checkout cutover, ticket retrieval, and compatibility.
3. Complete `SBQ-012`: env/docs finalization and command evidence.

Requirements:

1. Do not close the stream without exact pass/fail outputs for all listed verification profiles.
2. Keep docs synchronized with actual code and command outcomes.
3. Include explicit course/resource/checkout mapping examples in final docs.
4. Run row `Verify` commands exactly.
