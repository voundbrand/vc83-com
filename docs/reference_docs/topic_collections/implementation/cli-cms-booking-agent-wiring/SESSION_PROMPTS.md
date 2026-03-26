# SevenLayers CLI Rebuild Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring`

Read first in every session:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md`

Global rules:

1. Only one row may be `IN_PROGRESS` unless queue explicitly allows parallelism.
2. Mutating command work must not begin until target guardrails are in place (`SLCLI-006`).
3. Preserve backward compatibility aliases during migration.
4. Keep docs artifacts synchronized before marking any row `DONE`.

---

## Session A (Lane A: architecture + safety contracts)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-001

Rules:
1) Lock non-destructive env safety contracts before code implementation.
2) Record migration policy for command names and package naming assumptions.
3) Run listed verify commands and sync docs.

Stop when lane A has no promotable rows.
```

---

## Session B (Lane B: fresh CLI foundation + branding)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-002

Rules:
1) Build from scratch in packages/cli; reference snapshot only for behavior parity.
2) Set primary command to sevenlayers and keep legacy aliases.
3) Implement orange sevenlayers logo style surface.
4) Run verify commands exactly.

Stop when lane B has no promotable rows.
```

---

## Session C (Lane C: safe env/file engine)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-003..SLCLI-004

Rules:
1) Default behavior must never remove unknown env keys.
2) Add dry-run, diff preview, and backup support.
3) Require explicit destructive flag for full rewrite mode.
4) Add tests reproducing and preventing the prior overwrite failure mode.

Stop when lane C has no promotable rows.
```

---

## Session D (Lane D: target guardrails)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-005..SLCLI-006

Rules:
1) Implement explicit local/staging/prod profiles.
2) Enforce env+org+app tuple for mutating commands.
3) Require explicit prod confirmation.
4) Add doctor target diagnostics.

Stop when lane D has no promotable rows.
```

---

## Session E (Lane E: app wiring + legacy bridge)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-007..SLCLI-008

Rules:
1) Use existing backend app/page APIs and keep output deterministic.
2) Ensure legacy commands route through new guardrails.
3) Keep migration hints clear without breaking existing scripts.

Stop when lane E has no promotable rows.
```

---

## Session F (Lane F: CMS + booking)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-009..SLCLI-012

Rules:
1) Align CMS commands with existing scoped-key backend contracts.
2) Booking commands must validate prerequisites before mutation.
3) Provide JSON mode and dry-run for operational safety.
4) Keep prod operations explicitly gated.

Stop when lane F has no promotable rows.
```

---

## Session G (Lane G: agents)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane G rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-013..SLCLI-014

Rules:
1) Wrap existing bootstrap flows with stable command contracts.
2) Enforce org/app scoping and permission checks.
3) Add deterministic drift output for CI consumption.

Stop when lane G has no promotable rows.
```

---

## Session H (Lane H: release + rollout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only lane H rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md

Scope:
- SLCLI-015..SLCLI-016

Rules:
1) Land changesets + publish workflows with provenance.
2) Update Web Publishing CLI guide to match shipped commands.
3) Document alpha -> stable cutover and rollback procedures.

Stop when lane H has no promotable rows.
```
