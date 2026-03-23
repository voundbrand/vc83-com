# Workforce Planner Agent Session Prompts (DEV-Only)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent`

Read before execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/workforce-planner-agent/INDEX.md`

Execution policy:

1. DEV scope only; do not add migration/canary/cutover/rollback work.
2. Respect queue dependency gates exactly.
3. Update row status and notes immediately after verification commands pass.
4. Keep implementation deterministic and contract-first.
5. Preserve the boundary: workforce planner is separate from personal operator and from `pack_vacation_delegate_guard`.

Progress snapshot (2026-03-17):

- Completed: `WFP-A-001` (`DONE`).
- Completed: `WFP-A-002` (`DONE`).
- Next READY-first row: `WFP-B-001`.
- Current contract publication: `workforce_planner` is the canonical workforce agent; personal operator remains separate; the pharmacist Slack + Google Calendar vacation flow is legacy adapter/template input only.
- Evidence captured for `WFP-A-001`: `npm run docs:guard` (`Docs guard passed.`).
- Evidence captured for `WFP-A-002`: `rg -n "pack_vacation_delegate_guard|PHARMACIST|pharmacist|vacation_policy|pharmacist_pto_v1|savePharmacistVacationPolicyConfig|One-of-One Operator" convex src docs/reference_docs/topic_collections/implementation` plus `npm run docs:guard` (both passed).
- Dependency-unblocked after `WFP-A-002`: `WFP-B-001`, `WFP-E-001`, and `WFP-E-002`; deterministic pick order makes `WFP-B-001` next.

---

## Session A (Lane A: Architecture reset + drift inventory)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane A from TASK_QUEUE.md.

Primary scope:
- WFP-A-001
- WFP-A-002

Rules:
1) Make the architecture boundary explicit before touching runtime design.
2) Classify legacy surfaces as core domain, adapter layer, template layer, or historical-only reference.
3) Call out `pack_vacation_delegate_guard` and `One-of-One Operator` drift directly; do not preserve ambiguous wording.
4) Keep personal-operator ownership, setup, runtime, and success criteria separate from workforce-planner ownership.
5) Treat the pharmacist Slack + Google Calendar vacation flow as a legacy adapter/template input, not the core domain.
6) Run Verify commands exactly as listed in each queue row.
```

---

## Session B (Lane B: Generic domain contracts + compatibility store)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane B from TASK_QUEUE.md.

Primary scope:
- WFP-B-001
- WFP-B-002

Rules:
1) Define generic workforce contracts first; no pharmacist-specific naming in core domain files.
2) Build a compatibility-aware store so the current Slack vacation flow can map into the generic domain.
3) Do not create a parallel Slack ingress stack.
4) Keep organization isolation and deterministic payload normalization explicit.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session C (Lane C: Policy, holiday, fairness, and planning foundation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane C from TASK_QUEUE.md.

Primary scope:
- WFP-C-001
- WFP-C-002
- WFP-C-003

Rules:
1) Treat leave planning and employee scheduling as one coherent agent domain.
2) Keep holiday APIs optional policy inputs, not hardcoded business assumptions.
3) Make fairness, staffing floors, blackout dates, and alternative generation explainable.
4) Support both direct request evaluation and broader annual/rebalance scheduling.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session D (Lane D: Workforce tools + registry/scoping contracts)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane D from TASK_QUEUE.md.

Primary scope:
- WFP-D-001
- WFP-D-002
- WFP-D-003

Rules:
1) Keep tool names stable and generic.
2) Separate read-only diagnostics from mutating planner operations.
3) Preserve approval/audit semantics for leave decisions, overrides, and schedule mutations.
4) Keep subtype/profile scoping deterministic and additive.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session E (Lane E: Product surface cleanup + seeded-entry correction)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane E from TASK_QUEUE.md.

Primary scope:
- WFP-E-001
- WFP-E-002
- WFP-E-003

Rules:
1) Remove workforce-planning ownership from `Vacation Delegate Guard`.
2) Remove workforce-planning ownership from the seeded `One-of-One Operator`.
3) Keep personal operator deployable, but as a different agent with different setup and success criteria.
4) Update documentation and product language so the separation is obvious.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session F (Lane F: Workforce template seeding + runtime rollout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane F from TASK_QUEUE.md.

Primary scope:
- WFP-F-001
- WFP-F-002
- WFP-F-003

Rules:
1) Seed `workforce_planner` as the canonical protected template for staffing/leave workflows.
2) Route current Slack vacation handling through the generic workforce-planner bridge rather than a pharmacist-specific branch.
3) Keep pharmacy as an optional vertical template layer, not the canonical architecture.
4) Preserve additive compatibility while runtime migration is in progress.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session G (Lane G: End-to-end validation + docs closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane G from TASK_QUEUE.md.

Primary scope:
- WFP-G-001
- WFP-G-002
- WFP-G-003

Rules:
1) Add one true end-to-end Slack-vacation bridge integration test.
2) Add generic workforce-planner integration coverage for collaborative and autonomous flows.
3) Keep row-level evidence in queue notes before moving a row to DONE.
4) Do not close docs until workforce planner, personal operator, and historical pharmacist runtime ownership are clearly separated.
5) Run Verify commands exactly as listed in each queue row.
```
