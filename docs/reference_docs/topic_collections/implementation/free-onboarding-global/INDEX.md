# Free Onboarding Global V2 Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global`  
**Source request:** 2026-02-25 implementation kickoff for Document 07 (Free Onboarding PRD, dated 2026-02-24).

---

## Purpose

Queue-first execution layer for the onboarding-v2 rewrite:

1. AI chat opens first for logged-out users.
2. Beta codes provide auto-approve acceleration path while manual approval remains available.
3. Onboarding becomes chat-native and consistent across web/native/messaging channels.
4. Business context is the primary onboarding mode, with private mode as later expansion.
5. Lane `G` converges onboarding birthing to clone-first catalog activation with `isPrimary=true` first-successful-clone behavior, capability-limit snapshots, and purchase-only custom-agent concierge fallback while preserving rollout/kill-switch contracts.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/MASTER_PLAN.md`
- Launch checklist: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/ROLLOUT_CHECKLIST.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/INDEX.md`

---

## Status

Current closeout snapshot:

1. `FOG2-013` is `DONE`: rollout stage controls and emergency kill switch gate onboarding approval behavior via `convex/betaAccess.ts`.
2. `FOG2-014` is `DONE`: typecheck blocker in `convex/ai/agentExecution.ts` was fixed and final verification reran cleanly (`typecheck`, `lint`, `test:unit`, `docs:guard`).
3. Kill-switch and rollback contract from `FOG2-013` remains valid and unchanged; rollback remains policy-only and does not modify Telegram/WhatsApp/Slack/SMS handlers or first-message latency tracking. Runbook location: `MASTER_PLAN.md` -> `FOG2-013 Rollout + Rollback Runbook`.
4. Lane `G` convergence is complete: `FOG2-015` and `FOG2-016` are `DONE`. Onboarding now has clone-first handoff/runtime convergence plus explicit regression coverage for first-successful-clone primary assignment (`isPrimary=true` when missing in `orgId + userId`), capability-limit transparency (`available now` vs `blocked`), one-visible-operator copy contracts, tone/communication personalization capture, and purchase-only concierge fallback terms (`€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`).
5. `FOG2-016` verification passed in queue order: `npm run typecheck`, `npm run lint` (warnings-only baseline), `npm run test:unit`, `npm run docs:guard`.
6. `FOG2-003` is `DONE`: Super Admin beta-code operations are now available inside the existing Beta Access tab (filters, edit/deactivate, batch create, CSV export), and backend list/export filtering contracts were extended in `convex/betaCodes.ts` without changing `FOG2-013` rollout/kill-switch/rollback semantics.

Next promotable tasks:

1. None. Queue rows `FOG2-001`..`FOG2-016` are all `DONE`.

---

## Lane progress board

- [x] Lane A (`FOG2-001`..`FOG2-003`)
- [x] Lane B (`FOG2-004`..`FOG2-005`)
- [x] Lane C (`FOG2-006`..`FOG2-008`)
- [x] Lane D (`FOG2-009`..`FOG2-010`)
- [x] Lane E (`FOG2-011`..`FOG2-012`)
- [x] Lane F (`FOG2-013`..`FOG2-014`)
- [x] Lane G (`FOG2-015`..`FOG2-016`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md`
- Core checks: `npm run typecheck && npm run lint`
