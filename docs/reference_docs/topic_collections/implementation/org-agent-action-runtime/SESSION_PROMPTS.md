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
11. Lane `I` architecture-preflight row `OAR-033` may start after `OAR-027`; do not start lane `I` enforcement rows (`OAR-028`, `OAR-029`, `OAR-030`, `OAR-031`, `OAR-032`, `OAR-034`, `OAR-035`) before `OAR-013` and `OAR-022` are `DONE`.
12. Do not close lane `I` until existing-agent topology inventory, declaration enforcement, and migration evidence rows (`OAR-033`, `OAR-034`, `OAR-035`) are `DONE`.

Status snapshot (2026-03-25):

1. `OAR-001` and `OAR-002` are `DONE`.
2. `OAR-003` and `OAR-004` are `DONE`.
3. `OAR-005` is `DONE` (hardening pass complete).
4. `OAR-006` is `DONE`.
5. `OAR-007` is `DONE`.
6. `OAR-008` is `DONE`.
7. `OAR-009` is `DONE`.
8. `OAR-011` is `DONE`.
9. `OAR-012` is `DONE`.
10. `OAR-013` is `DONE`.
11. `OAR-014` is `DONE`.
12. `OAR-015` is `DONE`.
13. `OAR-016` is `DONE`.
14. `OAR-017` is `DONE`.
15. `OAR-019` is `DONE`.
16. `OAR-020` is `DONE`.
17. `OAR-022` is `DONE`.
18. `OAR-024` is `DONE`.
19. `OAR-025` is `DONE`.
20. `OAR-027` is `DONE`.
21. `OAR-028` is `DONE`.
22. `OAR-029` is `DONE`.
23. `OAR-033` is `DONE`.
24. `OAR-030` and `OAR-034` are `DONE`.
25. `OAR-010` is `DONE`.
26. `OAR-018` is `DONE`.
27. `OAR-021` is `DONE`.
28. `OAR-023` is `DONE`.
29. `OAR-026` is `DONE`.
30. `OAR-031` is `DONE`.
31. `OAR-032` is `DONE`.
32. `OAR-035` is `DONE`.
33. Active row count is `0` (`IN_PROGRESS` rows: none).
34. Deterministic next row is none (queue complete).

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
4. Do not start `OAR-005` until `OAR-033` is `DONE`.
5. Run each row's `Verify` commands exactly.

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

1. Complete `OAR-017`: immutable activity timeline UI.
2. Complete `OAR-018`: CRM and control-center embeds.

Requirements:

1. Action Center is the operational workflow surface for org owners.
2. Kanban columns must map one-to-one to canonical backend action-item states.
3. Agent filters must use active catalog metadata (default `all` plus per-agent identities), not static UI-only labels.
4. Timeline UI must distinguish immutable activity from mutable action-item state.
5. UI must consume canonical backend state only; no UI-local approval or action logic.
6. Run each row's `Verify` commands exactly.

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

---

## Prompt I (Lane I: platform-finished hardening)

You are executing lane `I` for reusable harness finish criteria.
Tasks:

1. `OAR-033` is complete and is now the baseline mapping for lane `I`.
2. Complete `OAR-028`: topology-profile contract enforcement.
3. Complete `OAR-029`: kernel contract versioning and adapter compatibility.
4. Complete `OAR-030`: bounded execution and terminalization guarantees across delivery/provisioning/sync.
5. Complete `OAR-031`: reusable agent-package contract for config-first onboarding.
6. Complete `OAR-032`: eval + SLO rollout gates.
7. Complete `OAR-034`: fail-closed topology declaration and compatibility enforcement for existing agents.
8. Complete `OAR-035`: existing-agent migration evidence and blocked-agent remediation queue.

Requirements:

1. Keep `single_agent_loop` as explicit default while adding profile adapters.
2. Treat `OAR-033` output as mandatory architecture baseline before remaining runtime implementation rows.
3. No unbounded external await paths remain after lane `I`.
4. Rollout must be blocked unless eval thresholds and SLO thresholds are met.
5. Existing agents must not remain on implicit topology declarations after lane `I`.
6. Run each row's `Verify` commands exactly.
