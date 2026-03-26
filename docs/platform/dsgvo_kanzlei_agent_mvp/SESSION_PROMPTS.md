# DSGVO Kanzlei Agent MVP Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/platform/dsgvo_kanzlei_agent_mvp`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally.
2. Do not start lane `B` before `KAMVP-001` and `KAMVP-002` are `DONE`.
3. Do not start lane `C` before `KAMVP-003` is `DONE`.
4. Do not start lane `D` before `KAMVP-006` and `KAMVP-008` are `DONE`.
5. Do not start lane `E` before `KAMVP-010` and `KAMVP-013` are `DONE`.
6. Do not start lane `F` before all prior `P0` rows are `DONE` or explicitly `BLOCKED` with named owner and mitigation.
7. After each completed row, sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md`.
8. All legal references must consistently use `§203 StGB` and `StBerG §57/§62/§62a`.
9. `existing-docs/` is read-only source input, not canonical final output.
10. Execute each row's verify commands exactly before setting status to `DONE`.

Status snapshot (2026-03-25):

1. `KAMVP-001` and `KAMVP-002` are `DONE`.
2. `KAMVP-003` and `KAMVP-004` are `DONE`.
3. `KAMVP-005`, `KAMVP-006`, `KAMVP-007`, `KAMVP-008`, `KAMVP-009`, `KAMVP-010`, `KAMVP-011`, `KAMVP-012`, `KAMVP-013`, `KAMVP-014`, `KAMVP-015`, `KAMVP-016`, `KAMVP-017`, and `KAMVP-018` are `DONE`.
4. `KAMVP-014` closure evidence: `npm run test:model` PASS (`6/6`, conformance PASS) with `TEST_MODEL_ID=anthropic/claude-opus-4.5` and strict direct-runtime validation.
5. Active row count is `0`.
6. Deterministic next `P0` row is `none` (all `P0` rows closed or blocked).

---

## Prompt A (Lane A: planning contract)

You are executing lane `A` for DSGVO Kanzlei-Agent MVP planning.
Tasks:

1. Complete `KAMVP-001`: queue-first artifacts and canonical workstream folder contract.
2. Complete `KAMVP-002`: inventory existing legal source files.

Requirements:

1. Keep all planning artifacts inside the workstream root.
2. Enforce deterministic queue schema and status model.
3. Run `V-DOCS` exactly.

---

## Prompt B (Lane B: legal corpus normalization)

You are executing lane `B` for legal and policy document baseline.
Tasks:

1. Complete `KAMVP-003`: canonical legal source inventory.
2. Complete `KAMVP-004`: privacy policy MVP draft in German.
3. Complete `KAMVP-005`: terms MVP draft in German.
4. Complete `KAMVP-006`: DPA/AVV MVP draft with `§203 StGB` + `§62a StBerG` clauses.
5. Complete `KAMVP-007`: subprocessor and transfer matrix.

Requirements:

1. Use only verifiable claims from codebase and provider docs.
2. Keep explicit TODO markers for unresolved legal placeholders.
3. No runtime code changes in this lane.
4. Run `V-DOCS` exactly.

---

## Prompt C (Lane C: vendor and transfer controls)

You are executing lane `C` for AVV and transfer readiness.
Tasks:

1. Complete `KAMVP-008`: provider-by-provider AVV/§62a checklist decisions.
2. Complete `KAMVP-009`: transfer impact register.
3. Complete `KAMVP-010`: TOM control matrix.

Requirements:

1. Every provider entry needs a concrete evidence path.
2. Unknown transfer basis must fail closed.
3. Keep decision ownership explicit.
4. Run `V-DOCS` exactly.

---

## Prompt D (Lane D: runtime guardrails)

You are executing lane `D` for technical compliance controls.
Tasks:

1. Complete `KAMVP-011`: approval gating for sensitive actions.
2. Complete `KAMVP-012`: tool/skill allowlist in Kanzlei mode.
3. Complete `KAMVP-013`: auditable compliance events.
4. Complete `KAMVP-014`: prompt-input minimization hook.

Requirements:

1. Missing risk classification or missing approval must fail closed.
2. Blocked actions must emit explicit reasons into logs.
3. Human approval is mandatory for external disclosure actions in MVP.
4. Run each row's verify commands exactly.

---

## Prompt E (Lane E: ops readiness)

You are executing lane `E` for operational compliance readiness.
Tasks:

1. Complete `KAMVP-015`: wire objective evidence into go-live checklist.
2. Complete `KAMVP-016`: DSR and incident runbooks.

Requirements:

1. No checklist item may be marked `erfuellt` without evidence.
2. Owners, deadlines, and escalation contacts must be explicit.
3. Run `V-DOCS` exactly.

---

## Prompt F (Lane F: validation and release gate)

You are executing lane `F` for final MVP gate.
Tasks:

1. Complete `KAMVP-017`: execute and capture validation profiles.
2. Complete `KAMVP-018`: release gate decision document.

Requirements:

1. Keep failed validations visible; do not hide or downscope without decision log.
2. Release gate requires named approvals and unresolved risk list.
3. Run each row's verify commands exactly.
