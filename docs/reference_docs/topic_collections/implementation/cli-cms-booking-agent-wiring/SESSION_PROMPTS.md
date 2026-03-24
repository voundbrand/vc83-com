# CLI + CMS/Booking/Agent Wiring Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring`

Read first in every lane:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md`

Lane gating rules:

1. One lane `IN_PROGRESS` at a time unless queue says otherwise.
2. Do not start lanes `D/E/F` until `CLI-007` is `DONE`.
3. Always run listed verify commands and write evidence in queue notes.
4. After each completed row, sync queue/index/master/session docs.

---

## Session A (Lane A: package extraction + command compatibility)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-001..CLI-003

Rules:
1) Port from docs/reference_projects/l4yercak3-cli into packages/cli, not by runtime reference.
2) Preserve l4yercak3 + icing bins and init/spread compatibility.
3) Keep user-facing errors deterministic and machine-readable where possible.
4) Run all verify commands from each row exactly.

Stop when Lane A has no promotable rows.
```

---

## Session B (Lane B: release, publish, rollback)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-004..CLI-006

Rules:
1) Implement changesets-based versioning and release PR flow.
2) Publish workflow must use npm provenance and least-privilege permissions.
3) Capture exact rollback commands in docs.
4) Do not change domain command behavior in this lane.

Stop when Lane B has no promotable rows.
```

---

## Session C (Lane C: env/org/app safety rails)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-007

Rules:
1) Enforce explicit target tuple (env, orgId, appId) for mutation commands.
2) Fail closed on ambiguity and require prod confirmation.
3) Add dry-run where command semantics allow it.
4) Add tests for mismatch and fail-closed scenarios.

Stop when Lane C has no promotable rows.
```

---

## Session D (Lane D: CMS command suite)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-008..CLI-009

Rules:
1) Use existing scoped CMS naming and registry metadata conventions.
2) Add dry-run and JSON output for all mutating CMS commands.
3) Keep migration commands idempotent and summary-rich.
4) Do not bypass target guards from Lane C.

Stop when Lane D has no promotable rows.
```

---

## Session E (Lane E: booking setup/check/smoke)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-010..CLI-011

Rules:
1) Booking commands must validate required entities and env contracts before mutation.
2) Smoke flows default to dry-run and block prod unless explicit override is provided.
3) Emit machine-readable diagnostics for CI usage.
4) Keep changes scoped to CLI + minimal required backend touchpoints.

Stop when Lane E has no promotable rows.
```

---

## Session F (Lane F: agent bootstrap + template safety)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-012..CLI-013

Rules:
1) Wrap existing bootstrap actions in stable CLI contracts.
2) Require org/app scoping and permission checks before template apply.
3) Support non-interactive mode and JSON output for automation.
4) Preserve fail-closed semantics from Lane C.

Stop when Lane F has no promotable rows.
```

---

## Session G (Lane G: docs/UI rollout + release cutover)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- CLI-014..CLI-016

Rules:
1) Update web-publishing CLI guidance to match shipped commands exactly.
2) Run alpha release before stable and gather dogfood evidence.
3) Publish deprecation timeline and rollback thresholds.
4) Keep queue/index/master/session docs synchronized before marking DONE.

Stop when all promotable rows are complete.
```
