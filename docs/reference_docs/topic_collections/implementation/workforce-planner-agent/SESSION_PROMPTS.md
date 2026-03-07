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
4. Keep implementation deterministic and contract-first (objects schema + tool contracts + scoping).

---

## Session A (Lane A: Workforce ontology contracts + object IO primitives)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane A from TASK_QUEUE.md.

Primary scope:
- WFP-A-001
- WFP-A-002

Rules:
1) Define strict workforce object contracts before adding tool behavior.
2) Use objects/objectActions with explicit organization isolation and deterministic keys.
3) Keep date and enum normalization explicit (no implicit parsing drift).
4) Preserve compatibility with existing org_member objects while extending customProperties.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session B (Lane B: School holiday API + cache merge)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane B from TASK_QUEUE.md.

Primary scope:
- WFP-B-001
- WFP-B-002

Rules:
1) Call an external school holiday API directly (Bundesland + year aware).
2) Normalize provider payloads to a deterministic internal contract.
3) Cache holidays in objects as type school_holiday_cache with explicit freshness semantics.
4) Merge cache with workforce_config overrides/blackout dates deterministically.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session C (Lane C: Workforce tools + registry wiring)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane C from TASK_QUEUE.md.

Primary scope:
- WFP-C-001
- WFP-C-002
- WFP-C-003

Rules:
1) Implement all workforce tools from a stable tool contract surface.
2) Mark read-only tools correctly and keep mutation tools auditable.
3) Return machine-readable conflict, coverage, fairness, and alternative payloads.
4) Register tools in TOOL_REGISTRY without renaming drift.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session D (Lane D: Tool scoping + autonomy policy)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane D from TASK_QUEUE.md.

Primary scope:
- WFP-D-001
- WFP-D-002

Rules:
1) Add subtype -> profile mapping for workforce_planner in toolScoping.
2) Enforce collaborative vs autonomous behavior via autonomyLevel gates.
3) Keep mutating operations fail-closed when approval/autonomy conditions are missing.
4) Do not weaken existing profile/subtype behavior for current agents.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session E (Lane E: Fairness + planning engine)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane E from TASK_QUEUE.md.

Primary scope:
- WFP-E-001
- WFP-E-002

Rules:
1) Compute fairness with explicit weighted components and deterministic tie-breakers.
2) Keep planning constraints explicit: min staffing, max concurrent vacation, blackout dates, duty rotation.
3) Generate explainable alternatives when conflicts or fairness constraints block requests.
4) Support both annual generation and rebalance flows from the same contract family.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session F (Lane F: Template seeding + runtime subtype rollout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane F from TASK_QUEUE.md.

Primary scope:
- WFP-F-001
- WFP-F-002

Rules:
1) Seed workforce planner as a protected template agent with idempotent upsert behavior.
2) Keep subtype, tool profile, and autonomy defaults aligned with queue contracts.
3) Ensure runtime scoping/selection paths recognize workforce_planner deterministically.
4) Preserve additive compatibility for existing subtype behavior.
5) Run Verify commands exactly as listed in each queue row.
```

---

## Session G (Lane G: Validation + documentation closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute Lane G from TASK_QUEUE.md.

Primary scope:
- WFP-G-001
- WFP-G-002

Rules:
1) Validate collaborative and autonomous scenarios with deterministic test fixtures.
2) Capture row-level evidence in queue notes before marking DONE.
3) Keep INDEX/MASTER_PLAN/TASK_QUEUE/SESSION_PROMPTS synchronized.
4) Run docs guard before finalizing any status transition to DONE.
5) Run Verify commands exactly as listed in each queue row.
```
