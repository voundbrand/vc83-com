# Agentic DSGVO Compliance Factory Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_compliance_agent_factory`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally.
2. Lane `A` must be complete before lane `B` starts.
3. Lane `C` and lane `D` are parallel-eligible only after `DCAF-006` and `DCAF-010` are `DONE`, and only if a documented queue exception explicitly allows more than one `IN_PROGRESS` row.
4. Lane `E` requires `DCAF-006`, `DCAF-010`, and `DCAF-017` to be `DONE`.
5. Lane `F` requires `DCAF-017` and `DCAF-024` to be `DONE`.
6. Lane `G` starts only after lane `E` and lane `F` `P0` rows are `DONE`.
7. Lane `H` starts only after all prior `P0` rows are `DONE` or explicitly `BLOCKED` with owner and mitigation.
8. Every row must run its `Verify` commands before status moves to `DONE`.
9. Fail-closed policy is mandatory across all lanes; do not add bypasses.
10. Keep sensitive evidence out of git; only metadata references and audit links are allowed.

---

## Deterministic execution order contract

Use this algorithm for every row transition:

1. Filter rows to allowed priorities in order: `P0` then `P1`.
2. Within the current priority, select rows with all dependencies `DONE`.
3. If multiple rows are eligible, pick the lowest numeric task ID.
4. Move exactly one row to `IN_PROGRESS`.
5. Apply required changes for that row and run every `Verify` command exactly as written.
6. If verification passes, move row to `DONE`.
7. If blocked, move row to `BLOCKED` and include owner + mitigation in `Notes`.
8. After each completion/block, re-evaluate dependency promotions (`PENDING` -> `READY`) and repeat from step 1.

Deterministic `P0` order for no-blocker path:

1. `DCAF-001`
2. `DCAF-002`
3. `DCAF-003`
4. `DCAF-004`
5. `DCAF-005`
6. `DCAF-006`
7. `DCAF-007`
8. `DCAF-008`
9. `DCAF-009`
10. `DCAF-010`
11. `DCAF-011`
12. `DCAF-012`
13. `DCAF-014`
14. `DCAF-015`
15. `DCAF-016`
16. `DCAF-017`
17. `DCAF-018`
18. `DCAF-019`
19. `DCAF-021`
20. `DCAF-022`
21. `DCAF-023`
22. `DCAF-024`
23. `DCAF-026`
24. `DCAF-027`
25. `DCAF-028`
26. `DCAF-030`
27. `DCAF-031`
28. `DCAF-032`
29. `DCAF-033`
30. `DCAF-034`
31. `DCAF-035`
32. `DCAF-036`
33. `DCAF-038`

Status snapshot (2026-03-25):

1. `DCAF-001` is `DONE`.
2. `DCAF-002` is `DONE`.
3. `DCAF-003` is `DONE`.
4. `DCAF-004` is `DONE`.
5. `DCAF-005` is `DONE`.
6. `DCAF-006` is `DONE`.
7. `DCAF-007` is `DONE`.
8. `DCAF-008` is `DONE`.
9. `DCAF-009` is `DONE`.
10. `DCAF-010` is `DONE`.
11. `DCAF-011` is `DONE`.
12. `DCAF-012` is `DONE`.
13. `DCAF-001` through `DCAF-038` are `DONE`.
14. Active row count is `0`.
15. Deterministic active row is `none` (queue complete).

---

## Prompt A (Lane A: planning contract and data policy)

You are executing lane `A` for agentic DSGVO compliance planning.

Tasks:

1. Complete `DCAF-001` through `DCAF-004`.
2. Freeze UX flow map, taxonomy, and secure evidence handling policy.

Requirements:

1. Keep changes inside workstream docs.
2. Define explicit fail-closed behavior for missing evidence and unresolved risks.
3. Confirm org-owner autonomy and super-admin optics split.
4. Run `npm run docs:guard`.

---

## Prompt B (Lane B: backend primitives)

You are executing lane `B` for compliance backend foundations.

Tasks:

1. Complete `DCAF-005` through `DCAF-010`.
2. Build evidence vault model, secure APIs, audit events, inheritance resolver, and inbox planner query.

Requirements:

1. Reuse existing compliance gate and object action patterns.
2. Enforce strict RBAC and immutable audit entries.
3. Any unresolved or malformed state must default to blocker behavior.
4. Run `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard`.

---

## Prompt C (Lane C: Compliance Inbox UX)

You are executing lane `C` for guided inbox and wizard UX.

Tasks:

1. Complete `DCAF-011` through `DCAF-015`.
2. Ship operator-friendly next-action cards and wizard steps for AVV, transfer, and security actions.
3. Apply post-launch inbox hardening updates for role-authority and contextual agent assist (`DCAF-038`).

Requirements:

1. Show explicit blocker reasons and required evidence per step.
2. Preserve accessibility and keyboard navigation.
3. Keep org-owner decision controls local to the org.
4. Run `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard`.

---

## Prompt D (Lane D: Evidence Vault UX)

You are executing lane `D` for evidence vault UI and metadata workflows.

Tasks:

1. Complete `DCAF-016` through `DCAF-020`.
2. Deliver upload, metadata capture, linkage timeline, and inherited evidence read-only view.

Requirements:

1. Require mandatory metadata and reject incomplete uploads.
2. Expose audit links for every mutation.
3. Do not persist raw contract text in docs files.
4. Run `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard`.

---

## Prompt E (Lane E: AVV outreach agent)

You are executing lane `E` for provider approval outreach automation.

Tasks:

1. Complete `DCAF-021` through `DCAF-025`.
2. Implement outbound outreach, inbound evidence capture, and operator inbox integration.

Requirements:

1. Outbound emails require explicit operator intent; no silent sends.
2. Track SLA windows and retries with visible state transitions.
3. Unknown response states remain fail-closed.
4. Run `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard`.

---

## Prompt F (Lane F: transfer and security workflows)

You are executing lane `F` for risk completeness workflows.

Tasks:

1. Complete `DCAF-026` through `DCAF-029`.
2. Deliver transfer impact and security evidence completeness engines that feed gate blockers.

Requirements:

1. Missing mandatory artifacts must preserve blocker state.
2. Use deterministic completeness scoring and expiry checks.
3. Route stale evidence to Compliance Inbox next actions.
4. Run `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard`.

---

## Prompt G (Lane G: gate engine and inheritance enforcement)

You are executing lane `G` for release gate integration and policy enforcement.

Tasks:

1. Complete `DCAF-030` through `DCAF-033`.
2. Integrate gate engine outputs into org-owner and super-admin surfaces with correct authority boundaries.

Requirements:

1. `GO` is impossible when any blocker remains.
2. Super-admin shared evidence cannot force org-level `GO`.
3. Emit audit events for blocked attempts and policy misuse.
4. Run `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard`.

---

## Prompt H (Lane H: validation and rollout)

You are executing lane `H` for release readiness.

Tasks:

1. Complete `DCAF-034` through `DCAF-037`.
2. Run E2E validation, telemetry hardening, and final gate decision package.

Requirements:

1. Keep residual risk list explicit in release decision docs.
2. Preserve fail-closed default unless evidence-based closure exists.
3. Update all four workstream docs at each milestone close.
4. Run `npm run test:e2e:desktop`, `npm run test:integration`, and `npm run docs:guard`.
