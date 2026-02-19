# Store Pricing Transparency Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/INDEX.md`

---

## Session A (Lane A: pricing contract and source hierarchy)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md

Scope:
- SPT-003

Rules:
1) Before each task, list top 3 pricing-regression risks.
2) Run Verify commands exactly as listed in queue rows.
3) Freeze canonical source-of-truth hierarchy before UI or checkout behavior changes.
4) Keep external naming Scale while preserving internal agency compatibility.
5) Update TASK_QUEUE.md status and notes after each completed task.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: store shell and navigation parity)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md

Scope:
- SPT-004..SPT-006

Rules:
1) Confirm SPT-003 is DONE before starting.
2) Before each task, list top 3 navigation/regression risks.
3) Run queue Verify commands exactly.
4) Keep right rail default-expanded on desktop/full-screen, toggleable without persistence.
5) Mobile must use sticky Jump-to button with section sheet.
6) Preserve desktop shell deep-link compatibility while fixing store prop wiring.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: transparency content and calculator)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md

Scope:
- SPT-007..SPT-009

Rules:
1) Confirm SPT-003 and SPT-004 are DONE before SPT-007.
2) Before each task, list top 3 pricing-trust regression risks.
3) Run Verify commands exactly from queue rows.
4) Show only active tiers (Free, Pro, Scale, Enterprise); do not re-introduce legacy tier visibility.
5) Calculator v1 must include: plan, billing cycle, credits, Scale sub-org count, seat/user count, tax mode.
6) Keep outputs source-attributed and VAT-inclusive.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: licensing, trial, tax consistency)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md

Scope:
- SPT-010..SPT-013

Rules:
1) Confirm SPT-003 is DONE before starting lane D.
2) Before each task, list top 3 billing/licensing regression risks.
3) Run Verify commands exactly from queue rows.
4) Remove legacy tier copy/typing drift in helpers.ts, organizations.ts, and superAdmin.ts.
5) Align Scale trial as a real backend-enforced checkout path.
6) Standardize VAT-included copy across store UI and translation seeds.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: parity hardening and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md

Scope:
- SPT-014..SPT-015

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before SPT-014.
2) Before each task, list top 3 release-risk regressions.
3) Run Verify commands exactly from queue rows.
4) Validate parity for public `/store` in desktop window, full-screen, and mobile flows.
5) Ensure login-return and deep-link behavior still resolves to intended store section.
6) Update TASK_QUEUE.md, MASTER_PLAN.md, and INDEX.md, then run docs guard before closeout.

Stop when lane E closeout is complete.
```
