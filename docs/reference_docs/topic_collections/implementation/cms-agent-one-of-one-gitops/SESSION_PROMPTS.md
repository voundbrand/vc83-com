# CMS Agent Prototype-to-App GitOps Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/GAP_ANALYSIS.md`
- `convex/integrations/github.ts`
- `convex/integrations/vercel.ts`
- `convex/integrations/v0.ts`
- `convex/ai/tools/builderToolActions.ts`
- `apps/one-of-one-landing/app/page.tsx`

---

## Session A (Lane A: contract and policy foundations)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md

Scope:
- CMS-001..CMS-003, CMS-020, CMS-021

Current promotable start:
- CMS-021 (after CMS-020 completion)

Rules:
1) Capture source-of-truth architecture findings before adding new contracts.
2) Define fail-closed policy boundaries for files/operations.
3) Keep policy contract deterministic and machine-readable.
4) Maintain lifecycle authority hardening delivered by CMS-020 (approval-state contract, stricter terminal-transition permissions, shared write path).
5) Replace scan-based idempotency lookup with indexed strategy and add mutation-level tests for fail-closed behavior.
6) Run Verify commands exactly as listed.
7) Update TASK_QUEUE.md Notes with findings and evidence.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: content model and deterministic compiler)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md

Scope:
- CMS-004..CMS-006

Rules:
1) Use one-of-one as the reference app, but keep conventions reusable for all future `apps/<site-app>` promotions.
2) Preserve visual parity while migrating copy sources.
3) Implement edit compiler for content operations before code edits.
4) Keep tests focused on deterministic patch behavior.
5) Run Verify commands exactly.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: PR and preview orchestration)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md

Scope:
- CMS-007..CMS-010

Rules:
1) Keep PR-first workflow mandatory for CMS-agent updates.
2) Ensure branch naming/idempotency derives from request IDs.
3) Persist preview URLs and verification outcomes to request records.
4) Do not bypass approval gate logic.
5) Run Verify commands exactly.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: approvals, audit, rollback)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md

Scope:
- CMS-011..CMS-013

Rules:
1) Enforce signed webhook verification before trusting deployment events.
2) Implement risk-tier approval matrix with fail-closed defaults.
3) Ensure rollback path is request-linked and auditable.
4) Capture evidence for each trust control in Notes.
5) Run Verify commands exactly.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E/F: scale and world-class)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E/F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md

Scope:
- CMS-014..CMS-019

Rules:
1) Add queue locks, retries, and conflict policies before parallelism expansion.
2) Add SLOs/observability before enabling autonomous publish windows.
3) Add visual/content quality intelligence with deterministic thresholds.
4) Preserve tenant isolation and approval controls at all times.
5) Run Verify commands exactly and keep docs synchronized.

Stop when all promotable rows are complete.
```
