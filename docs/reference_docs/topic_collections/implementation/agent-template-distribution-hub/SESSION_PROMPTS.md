# Agent Template Distribution Hub Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-detail-panel.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-tools-config.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`

---

## Concurrency and lane gating

1. Execute lanes in dependency order from queue rows.
2. Maximum one `IN_PROGRESS` task globally in this workstream.
3. Do not start lanes `B`..`E` before dependency gates are satisfied.
4. Keep super-admin actions auditable and fail-closed for unauthorized scopes.

---

## Lane milestone log

1. 2026-03-07: workstream initialized, queue-first artifacts created, lane `A` unblocked.
2. 2026-03-07: `ATH-001` completed; precedence + role boundary contract frozen.
3. 2026-03-07: `ATH-015` completed early as migration lock; seeded bridge contract + immutable-origin rebinding lock shipped.
4. 2026-03-08: `ATH-003` completed; backend template-clone linkage contract persisted with optional legacy fallback semantics.
5. 2026-03-08: `ATH-004` completed; super-admin template lifecycle mutations shipped with immutable snapshot + deterministic audit envelope contracts.
6. 2026-03-08: `ATH-005` completed; deterministic distribution planner/apply mutation shipped with dry-run + idempotent upsert behavior.
7. 2026-03-08: `ATH-006` completed; deterministic clone-vs-template drift query shipped with policy-state classification and legacy linkage fallback.
8. 2026-03-08: `ATH-007` completed; super-admin template hub entry point shipped in existing control-center UI with catalog/version/rollout section toggles.
9. 2026-03-09: `ATH-008` completed; cross-org clone inventory shipped with org/template/state/risk filters and deterministic drift indicators in control-center UI.
10. 2026-03-09: `ATH-009` completed; staged rollout safety controls shipped with preview diff, explicit confirmation gating, rollback target version selection, and deterministic rollout audit summaries.
11. 2026-03-09: `ATH-016` completed; published-agent storefront now includes package/license descriptor metadata in backend contracts and UI, while activation entitlement enforcement remains deferred to lane `D` (`ATH-017`).
12. 2026-03-09: `ATH-010` completed; org agent detail/tools views now expose template lineage and override-mode badges while preserving existing editing behavior for current operator workflows.
13. 2026-03-09: `ATH-011` completed; org edit + rollout/distribution paths now enforce deterministic override gates (`locked` fail-closed, `warn` confirmation+reason required, `free` pass-through), and UI editing controls block warn writes until explicit confirmation + reason is provided.
14. 2026-03-09: `ATH-012` completed; super-admin rollout section now exposes deterministic distribution telemetry (job status/errors/affected-org totals + rollback classification) backed by a queryable backend job stream and trust-event taxonomy extensions for template-distribution admin audit events.
15. 2026-03-09: `ATH-017` completed; storefront activation now enforces fail-closed entitlement gates in preflight + `spawn_use_case_agent` with deterministic reason codes/guidance, legacy descriptor fallback behavior, and deterministic activation entitlement audit records (`agent_store_activation_entitlement_evaluated`) surfaced in store card/detail/activation UX.
16. 2026-03-09: `ATH-013` completed; lane `E` verification profile passed (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`) with no remaining blockers after ingress routing regression fix.
17. 2026-03-09: `ATH-014` completed; queue-first artifacts synchronized for closeout and handoff, with next promotable task set to `ATH-002` (migration strategy and backfill/rollback runbook).
18. 2026-03-09: `ATH-002` completed; migration strategy finalized in `MASTER_PLAN.md` with deterministic partitioning of legacy rows, mandatory dry-run/apply gating by `migrationJobId`, idempotent rollback path, and explicit stop conditions.
19. 2026-03-09: `ATH-018` completed; operational drill log published for mock migration dry-run/apply/rollback validation with targeted verification evidence (`V-UNIT-AGENT`, `V-DOCS`).
20. 2026-03-09: `ATH-019` completed; pre-rollout readiness drill log published with full compile/unit/docs verification evidence (`V-TYPE`, `V-UNIT`, `V-DOCS`) and no blocking regressions.
21. 2026-03-09: `ATH-020` started; canary rollout runbook published with step-by-step staged execution gates and rollback criteria for first legacy-linkage wave.
22. 2026-03-11: `ATH-020` verification profile rerun passed (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`), but live canary execution moved to `BLOCKED` due missing required rollout inputs (`SESSION_ID`, `TEMPLATE_ID`, canary org ids, optional `TEMPLATE_VERSION_ID`).
23. 2026-03-11: `ATH-020` moved to `DONE` per operator confirmation that live canary execution succeeded and rollout flow gates held.

---

## Session A (Lane A: contract and architecture)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md

Scope:
- ATH-001..ATH-002

Rules:
1) Before each task, list top 3 contract regression risks.
2) Freeze precedence: platform -> template -> clone override -> runtime/session.
3) Define role boundaries and fail-closed behavior for super-admin-only actions.
4) Keep migration backward-compatible for unmanaged legacy agents.
5) Run Verify commands exactly from queue rows.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: backend model and distribution APIs)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md

Scope:
- ATH-003..ATH-006, ATH-015

Rules:
1) Confirm ATH-001 is DONE before starting.
2) Before each task, list top 3 backend consistency risks.
3) Enforce idempotent rollout mutations and deterministic target ordering.
4) Audit-log template lifecycle and distribution jobs with actor + diff metadata.
5) Preserve existing agent behavior when no template linkage exists.
6) Preserve seeded-agent invariants from agent catalog seed registry mappings.
7) Run Verify commands exactly from queue rows.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: super-admin hub UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md

Scope:
- ATH-007..ATH-009, ATH-016

Rules:
1) Confirm lane B P0 tasks are DONE before starting.
2) Before each task, list top 3 rollout UX and authorization risks.
3) Keep UI within the existing super-admin control center/window architecture.
4) Require explicit confirmation for bulk rollout and rollback actions.
5) Surface deterministic drift and rollout state labels.
6) Keep storefront publish state and entitlement metadata clearly separated in copy and behavior.
7) Run Verify commands exactly from queue rows.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: org clone controls and policy gates)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md

Scope:
- ATH-010..ATH-012, ATH-017

Rules:
1) Confirm lane C P0 tasks are DONE before starting.
2) Before each task, list top 3 override-precedence regression risks.
3) Display template lineage in org agent UI without blocking current workflows.
4) Enforce override policy (`locked`, `warn`, `free`) consistently in backend + UI.
5) Keep telemetry and audit evidence queryable for incident response.
6) Enforce catalog activation entitlement checks fail-closed with deterministic reason codes.
7) Run Verify commands exactly from queue rows.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: verification and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/TASK_QUEUE.md

Scope:
- ATH-013..ATH-014, ATH-018..ATH-020

Rules:
1) Confirm all prior P0 rows are DONE or BLOCKED.
2) Before each task, list top 3 release-gate risks.
3) Run verification commands exactly as declared in queue rows.
4) Publish final gate status, residual risks, and rollback triggers.
5) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md.
6) Run docs guard and resolve failures before closeout.

Stop when lane E closeout is complete.
```
