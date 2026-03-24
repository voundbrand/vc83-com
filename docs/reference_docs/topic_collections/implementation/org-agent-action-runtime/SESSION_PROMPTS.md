# Org Agent Action Runtime Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally unless explicit temporary parallelism is approved and recorded in `TASK_QUEUE.md`.
2. Do not start lane `B` before `OAR-001` and `OAR-002` are `DONE`.
3. Do not start lane `C` before `OAR-003` is `DONE`.
4. Do not start lane `D` before `OAR-005` and `OAR-009` are `DONE`.
5. Do not start lane `E` before `OAR-005` and `OAR-012` are `DONE`.
6. Do not start lane `F` before `OAR-006` and `OAR-013` are `DONE`.
7. Do not start lane `G` before `OAR-013` and `OAR-019` are `DONE`.
8. Do not start lane `H` before all prior `P0` rows are `DONE` or explicitly `BLOCKED` with named owner and mitigation.
9. Internal-only V1 is the release target until `OAR-025` is `DONE`; connector-side execution beyond narrow sync remains fail closed.
10. After each `DONE` row, sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md`.

Status snapshot (2026-03-23):

1. `OAR-001` and `OAR-002` are `DONE`.
2. `OAR-003` is `READY`.
3. All remaining rows are `PENDING`.
4. Active row count is `0` (`IN_PROGRESS` rows: none).
5. Deterministic next row is `OAR-003`.

---

## Prompt A (Lane A: docs freeze)

You are executing lane `A` for the org agent action runtime.
Tasks:

1. Complete `OAR-001`: publish the code-reality baseline and hard architectural decisions.
2. Complete `OAR-002`: freeze lanes, verification profiles, and internal-only V1 sequencing.

Requirements:

1. Canonical platform CRM/object state remains first.
2. Veronica-style telephony is explicitly routed through the One-of-One Operator runtime.
3. Immutable activity and mutable action items must be separate in every artifact.
4. Run `V-DOCS` exactly.

---

## Prompt B (Lane B: contracts and canonical state)

You are executing lane `B` for schema, extraction, activity, and CRM projection.
Tasks:

1. Complete `OAR-003`: schema and object/link taxonomy.
2. Complete `OAR-004`: structured session outcome extraction.
3. Complete `OAR-005`: immutable activity persistence and timeline contract.
4. Complete `OAR-006`: canonical platform CRM projection before outbound sync.

Requirements:

1. Reuse `objects`, `objectLinks`, and `objectActions` wherever possible.
2. Do not write external CRM state in this lane.
3. Activities are append-only; work-item state belongs elsewhere.
4. Run each row's `Verify` commands exactly.

---

## Prompt C (Lane C: ingress and follow-up runtime)

You are executing lane `C` for telephony, webchat, conversations, and follow-up runtime.
Tasks:

1. Complete `OAR-007`: telephony route identity and operator-runtime session normalization.
2. Complete `OAR-008`: telephony outcome capture and takeover markers.
3. Complete `OAR-009`: webchat and conversations parity for action-runtime context.
4. Complete `OAR-010`: follow-up execution runtime.

Requirements:

1. Telephony must not stay on a standalone prompt-only rail.
2. Webchat, telephony, and follow-up execution must emit the same outcome contract version.
3. Reuse existing human takeover/resume semantics instead of inventing a parallel lifecycle.
4. Run each row's `Verify` commands exactly.

---

## Prompt D (Lane D: policy, approvals, and execution)

You are executing lane `D` for org policy and action execution.
Tasks:

1. Complete `OAR-011`: policy resolver for `owner_only`, `approval_required`, and `agent_auto_allowed`.
2. Complete `OAR-012`: approval packet and assignment-state reuse.
3. Complete `OAR-013`: preview-to-receipt execution contract.
4. Complete `OAR-014`: low-risk auto-execute allowlist with fail-closed external gate.

Requirements:

1. Every action decision must persist a policy snapshot.
2. Missing approval, missing receipt, or missing risk classification must fail closed.
3. Internal-only V1 allows only narrow low-risk auto-run behavior.
4. Run each row's `Verify` commands exactly.

---

## Prompt E (Lane E: owner UI and timeline)

You are executing lane `E` for owner-facing surfaces.
Tasks:

1. Complete `OAR-015`: Action Center list/query surface.
2. Complete `OAR-016`: Action Center detail view and owner workflows.
3. Complete `OAR-017`: immutable activity timeline UI.
4. Complete `OAR-018`: CRM and control-center embeds.

Requirements:

1. Action Center is the operational workflow surface for org owners.
2. Timeline UI must distinguish immutable activity from mutable action-item state.
3. UI must consume canonical backend state only; no UI-local approval or action logic.
4. Run each row's `Verify` commands exactly.

---

## Prompt F (Lane F: external CRM sync)

You are executing lane `F` for downstream CRM connectors.
Tasks:

1. Complete `OAR-019`: canonical outbox and external identity bindings.
2. Complete `OAR-020`: narrow contact/org/note sync V1.
3. Complete `OAR-021`: gated external action execution contracts.

Requirements:

1. Platform-owned state remains canonical at all times.
2. Outbox jobs must be idempotent and retry-safe.
3. External task/action execution stays disabled unless the explicit gate for that row is satisfied.
4. Run each row's `Verify` commands exactly.

---

## Prompt G (Lane G: observability and reliability)

You are executing lane `G` for receipts, retries, telemetry, and diagnostics.
Tasks:

1. Complete `OAR-022`: correlation IDs, receipts, retry state, and idempotency keys.
2. Complete `OAR-023`: telemetry dashboards, debug surfaces, and retry tooling.

Requirements:

1. Every capture, approval, execution, and sync step must be correlation-addressable.
2. Reliability tooling must explain why an item is blocked and whether retry is safe.
3. Keep telemetry naming aligned with existing trust and activity protocol conventions.
4. Run each row's `Verify` commands exactly.

---

## Prompt H (Lane H: migration, rollout, and test closeout)

You are executing lane `H` for migration and release readiness.
Tasks:

1. Complete `OAR-024`: migration/backfill and feature-flag rollout plan.
2. Complete `OAR-025`: full test matrix with evidence capture.
3. Complete `OAR-026`: canary rollout, rollback runbook, and breadth-expansion gate.

Requirements:

1. Internal-only V1 must be stable before any broader connector-side execution is considered.
2. Feature flags must isolate capture, owner workflow, narrow sync, and external execution separately.
3. Closeout requires named owner, rollback triggers, and explicit evidence of fail-closed behavior.
4. Run each row's `Verify` commands exactly.
