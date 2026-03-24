# Org Agent Action Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime`  
**Source request:** Define a queue-first implementation plan for a full org-owned agent activity/action runtime that captures structured conversation outcomes, writes canonical CRM data into the platform first, creates durable activity and actionable work items, supports approvals and low-risk auto-execution, and routes Veronica-style telephony through the existing One-of-One Operator runtime.

---

## Purpose

This workstream defines the implementation contract for an org-level runtime that:

1. turns telephony, webchat, and follow-up execution into one canonical session-to-activity pipeline,
2. captures structured outcomes from org-owned agents into platform-owned state first,
3. writes canonical CRM records before any external CRM sync,
4. persists immutable activity separately from mutable action items,
5. lets org owners approve, assign, complete, retry, or take over work,
6. lets agents auto-execute only low-risk actions permitted by org policy,
7. preserves auditability, receipts, retries, takeover, and telemetry at every stage.

---

## Runtime Summary

1. **Canonical source of truth:** platform-owned CRM objects, links, activity objects, action items, approvals, and `objectActions`.
2. **Channel model:** telephony, webchat, and follow-up execution all resolve through `agentSessions` and conversations rather than separate runtime silos.
3. **Telephony decision:** Veronica-style telephony agents are operator-runtime participants, not standalone receptionist prompts.
4. **Owner workflow:** Action Center becomes the primary operational queue for org owners.
5. **External CRM stance:** outbound sync is downstream only and starts narrow in internal-only V1.

---

## Current Status

1. Lane `A` docs freeze is complete.
2. `OAR-001` is complete: code-reality baseline, hard boundaries, and phase sequencing are now documented.
3. `OAR-002` is complete: queue rules, verification profiles, lanes, and gating are frozen.
4. `OAR-003` is `READY`: schema and object/link taxonomy is the deterministic next implementation row.
5. All remaining implementation rows are `PENDING`.

Immediate objective:

1. land the canonical schema and taxonomy for immutable activities, mutable action items, policy snapshots, and sync receipts,
2. keep telephony/webchat/follow-up aligned on one outcome contract,
3. preserve internal-only V1 scope until the narrow connector sync path is stable.

---

## Core Files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/MASTER_PLAN.md`
- Index:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/INDEX.md`

Upstream reality anchors:

- `/Users/foundbrand_001/Development/vc83-com/convex/crmOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/crmIntegrations.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/conversations.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversations.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentApprovals.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/lib/telephony/agent-telephony.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/activityProtocol.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-approval-queue.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/AGENT_CONTROL_CENTER_DATA_CONTRACT.md`

---

## Lane Progress Board

- [x] Lane A architecture freeze and queue contract (`OAR-001`, `OAR-002`)
- [ ] Lane B canonical data model and platform-first CRM projection (`OAR-003`..`OAR-006`)
- [ ] Lane C telephony/webchat/follow-up runtime convergence (`OAR-007`..`OAR-010`)
- [ ] Lane D policy, approvals, and action execution (`OAR-011`..`OAR-014`)
- [ ] Lane E owner Action Center and activity timeline UI (`OAR-015`..`OAR-018`)
- [ ] Lane F downstream CRM sync architecture and gated connector execution (`OAR-019`..`OAR-021`)
- [ ] Lane G receipts, retries, idempotency, and telemetry (`OAR-022`, `OAR-023`)
- [ ] Lane H migration, rollout, and full test closeout (`OAR-024`..`OAR-026`)

---

## Operating Commands

- Docs guard:
  `npm run docs:guard`
- Type safety:
  `npm run typecheck`
- Integration subset:
  `npx vitest run tests/integration/ai/sessionRouting.integration.test.ts tests/integration/ai/approvalPolicy.integration.test.ts tests/integration/ai/orgActionRuntime.integration.test.ts`
- Trust/owner surface e2e:
  `npx playwright test tests/e2e/agent-trust-experience.spec.ts`
