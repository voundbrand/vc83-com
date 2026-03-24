# Template Certification And Org Preflight Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight`

Always read first:

1. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TASK_QUEUE.md`
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/MASTER_PLAN.md`
3. `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentCatalogAdmin.ts`
4. `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
5. `/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts`
6. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`

---

## Concurrency rules

1. Only one lane may be `IN_PROGRESS` at a time.
2. Do not start UI work before backend contract rows are `DONE`.
3. Do not close the workstream without `npm run docs:guard`.

Current queue focus:

1. `TCP-012` is complete.
2. Next move: define `TCP-013` ownership + alerting rollout around CI certification evidence ingestion.

---

## Session A

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only backend certification rows from TASK_QUEUE.md.

Rules:
1. Keep certification exact-version scoped.
2. Keep invalidation digest-based and deterministic.
3. Fail closed for missing/invalid certification.
4. Preserve WAE bridge compatibility where available.
5. Run queue verify commands before marking rows DONE.
```

## Session B

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only org-preflight and telephony rows from TASK_QUEUE.md.

Rules:
1. Keep org readiness separate from template quality.
2. Surface concrete blockers, never generic readiness failures.
3. Do not regress protected telephony deployment flows.
4. Run queue verify commands before marking rows DONE.
```

## Session C

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only admin/UI rows from TASK_QUEUE.md.

Rules:
1. Use certification, preflight, rollout, and drift as the primary mental model.
2. Minimize operator clutter and preserve fail-closed action states.
3. Keep legacy wrapper naming only where compatibility still requires it.
4. Run queue verify commands before marking rows DONE.
```
