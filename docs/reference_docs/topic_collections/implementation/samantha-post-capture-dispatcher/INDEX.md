# Samantha Post-Capture Dispatcher Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher`  
**Source request:** Queue-first implementation planning for a deterministic post-capture dispatcher that replaces Samantha prompt/tool multichannel orchestration with centralized Convex-side execution, policy controls, observability, and retry-safe idempotency. Latest extension (2026-03-06): focused de-risk + rollout/rollback planning for fail-closed Slack hot-lead routing enablement.

---

## Purpose

This workstream is the implementation and operations control plane for Samantha post-capture dispatch:

1. centralize side effects in dispatcher runtime,
2. preserve org-scoped trust boundaries and fail-closed routing,
3. keep Samantha tool behavior to qualification + deliverable + dispatcher handoff,
4. operate rollout with explicit stage gates and rollback triggers.

---

## Core files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/MASTER_PLAN.md`
- Focused rollout runbook: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_016_DISPATCHER_HARDENING_ROLLOUT_RUNBOOK.md`
- Rollout execution log: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_017_ROLLOUT_EXECUTION_LOG.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/INDEX.md`

---

## Status snapshot

1. Dispatcher hardening rows `SPD-012..SPD-015` are `DONE`:
   - explicit Slack OAuth routing with fail-closed identity checks,
   - leased retry queue model with exponential backoff,
   - dead-letter triage and replay workflow,
   - Samantha deliverable handoff cutover.
2. Verification stack passed on 2026-03-06:
   - `npm run typecheck`
   - `npx tsc -p convex/tsconfig.json --noEmit`
   - `npx vitest run tests/unit/ai/postCaptureDispatcher.contract.test.ts tests/unit/ai/postCaptureDispatcher.routing.test.ts tests/unit/ai/postCaptureDispatcher.idempotency.test.ts`
   - `npx vitest run tests/integration/onboarding/post-capture-dispatcher.integration.test.ts`
3. Focused rollout operations package `SPD-016` is now `DONE` with:
   - pre-prod/prod go-no-go checklist,
   - canary/ramp/full stage gates with success/failure thresholds,
   - reason-code-specific dead-letter triage and replay actions,
   - rollback triggers and blast-radius containment,
   - routing-hint config contract guidance,
   - dashboard and alert recommendations,
   - stage verification matrix.
4. `SPD-017` is `DONE` with concrete stage decisions logged in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_017_ROLLOUT_EXECUTION_LOG.md`:
   - Canary decision: `GO` (`2026-03-06T16:22:00Z`) after full dwell gates stayed green.
   - Ramp-25 pre-entry decisions: `NO_GO` (`2026-03-06T16:40:00Z`) followed by re-evaluation `GO` (`2026-03-06T20:16:18Z`) after 24h responder assignment acknowledgement.
   - Operator closure override: remaining Ramp-50/Ramp-75/Full stages skipped with explicit `NO_GO` closure decision (`2026-03-06T20:24:51Z`) and runbook-exception note.
   - Rollback checkpoints: not invoked (no trigger breached at logged decision points).
5. `SPD-018` is `DONE`:
   - lane `G` was reopened in docs-first mode and synchronized across queue artifacts,
   - dispatcher runtime behavior remained unchanged (fail-closed Slack routing and org-scoped trust boundaries preserved),
   - deferred stage progression now has an explicit re-entry requirement for timestamped `GO/NO_GO` evidence before traffic expansion.

Immediate objective:

1. No active rollout row in this workstream after `SPD-018` closeout.
2. Re-open lane `G` only when deferred staged progression (`Ramp-50/Ramp-75/Full`) is explicitly resumed.

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/TASK_QUEUE.md`
- Read rollout runbook: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/samantha-post-capture-dispatcher/SPD_016_DISPATCHER_HARDENING_ROLLOUT_RUNBOOK.md`
- Type safety baseline: `npm run typecheck`
- Convex TS baseline: `npx tsc -p convex/tsconfig.json --noEmit`
