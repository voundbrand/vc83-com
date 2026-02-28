# Template System Rationalization Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization`

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/INDEX.md`

Current queue status (2026-02-25):

- `TSR-001` through `TSR-018` are `DONE`.
- Lane-F closeout is complete (`TSR-012`, `TSR-013`, `TSR-014` all `DONE`); there are no remaining `READY` rows in this workstream.

---

## Behavioral-System Contract Alignment

1. Template work contributes primarily to `tools`, `policy`, and `trust` layers; keep that mapping explicit in any follow-up edits.
2. Treat persona copy updates as non-execution unless they are backed by non-prompt contract changes.
3. Keep eval/regression gates tied to runtime behavior, not only presentation-layer text.

---

## Session A (Lane A: inventory + telemetry baseline)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md

Scope:
- TSR-001, TSR-002

Rules:
1) Do not refactor runtime behavior in this lane; inventory and instrumentation only.
2) Capture every template entrypoint with source, resolver chain, and fallback semantics.
3) Tag telemetry with resolver source and template capability.
4) Run Verify commands exactly as listed in each queue row.
```

---

## Session B (Lane B: production contract hardening)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md

Scope:
- TSR-003

Rules:
1) Protect production-critical behaviors first: invoice PDF, ticket PDF attachments, invoice/ticket email delivery, and event checkout rendering.
2) Add regression coverage before any deprecation removals proceed.
3) Keep tests deterministic and focused on contract outcomes, not implementation details.
4) Treat `npm run test:e2e:checkout:transactional` as a required contract gate for this lane (via row Verify commands).
5) Run Verify commands exactly as listed in queue rows.
```

---

## Session C (Lane C: resolver convergence)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md

Scope:
- TSR-004, TSR-005

Rules:
1) Introduce one canonical template capability taxonomy and resolver contract.
2) Keep existing template-set precedence behavior unchanged while converging naming.
3) Remove hardcoded renderer drift where resolved template metadata is ignored.
4) Preserve checkout/runtime parity by running the transactional checkout Playwright gate when listed in Verify.
5) Run Verify commands exactly as listed in queue rows.
```

---

## Session D (Lane D: legacy deprecation migration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md

Scope:
- TSR-006, TSR-007, TSR-008

Rules:
1) Deprecate in two steps: compatibility shim first, removal second.
2) Keep backwards compatibility for active transactional sends until telemetry confirms safe cutover.
3) Do not remove runtime paths used by production-critical contracts before lane B is stable.
4) Run Verify commands exactly as listed in queue rows.
```

---

## Session E (Lane E: product strategy execution)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md

Scope:
- TSR-009, TSR-010, TSR-015, TSR-016, TSR-017, TSR-018, TSR-011

Rules:
1) Guarantee prebuilt starter template sets so users can transact without setup friction.
2) Restrict v0 custom template phase 1 to web/event surfaces; keep invoice/ticket docs on stable path.
3) Default custom-template generation to platform-managed provider credits; do not require customer provider signup/API key setup for base plans.
4) Implement premium-credit metering/charging and gate BYOK configuration to `agency/scale` entitlements.
5) Remove mandatory GitHub/Vercel/v0-key setup from first-run builder/publish UX; keep external deploy as explicit advanced mode.
6) Ensure backend and harness instructions are deployment-mode-aware so managed mode avoids blocked integration checks.
7) Before and during `TSR-018`, treat `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/` as the source of truth for team-productization contracts.
8) Deliver a deterministic software-engineering team flow for on-the-fly forms/websites with idempotent create/connect/publish behavior by consuming productization deliverables, not redefining them.
9) Replace eval-based preview engine with a safer unified preview pipeline before deletion.
10) Run Verify commands exactly as listed in queue rows.
```

---

## Session F (Lane F: rollout + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md

Scope:
- TSR-012, TSR-013, TSR-014

Rules:
1) Start only when all P0 tasks are DONE or explicitly BLOCKED.
2) Execute canary and rollback gates before removing compatibility shims.
3) Include transactional checkout Playwright regression in rollout validation when required by queue Verify commands.
4) Sync TASK_QUEUE/MASTER_PLAN/INDEX after each closure step.
5) Run Verify commands exactly as listed in queue rows.
```
