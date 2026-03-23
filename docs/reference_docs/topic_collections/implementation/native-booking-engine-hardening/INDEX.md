# Native Booking Engine Hardening Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening`  
**Source request:** Keep current Cal.com work on API v2, define the native booking architecture, prioritize native booking plus Google Calendar hardening, make agent flows book against the platform's own booking engine, and plan the first native visual date/time picker and embeddable booking surface.

---

## Purpose

This folder is the queue-first execution layer for turning the current booking foundations into a product-grade native booking system.

Primary outcomes:

1. lock the architecture decision that native booking is primary,
2. harden Google Calendar sync/conflict handling,
3. route agent booking flows through native booking primitives,
4. ship the first native visual slot-picker and embed contract,
5. keep Cal.com working only as a constrained API v2 adapter.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/INDEX.md`

Primary code anchors:

- `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/availabilityOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window.tsx`
- `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcom.ts`

---

## Status

1. New workstream created on 2026-03-17.
2. Current Cal.com adapter is already on API v2 and remains in-scope only as an adapter.
3. Current native booking and Google conflict primitives already exist and are the primary architecture target.
4. Lane `A` is complete: `NBH-001` and `NBH-002` are `DONE`.
5. `NBH-003` is `DONE`: Google conflict/push hardening now normalizes blocking/push calendar selection, fails closed on missing scope or disabled sync, merges external busy windows through the native availability engine, and reconciles outbound event writes per target calendar.
6. `NBH-004` is `DONE`: deterministic handler coverage now exists for Google conflict snapshots, availability fail-closed and external-busy merge semantics, and Google booking push reconciliation.
7. Verification reality for `NBH-004`: `npm run typecheck` and `npm run docs:guard` passed; `npm run test:unit` still fails only in the pre-existing `/Users/foundbrand_001/Development/vc83-com/tests/diagnostic.test.ts` and `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts` paths.
8. `NBH-005` is `DONE`: agent runtime booking mutations now stay on native booking primitives for `create_booking`, status transitions, and phone-call concierge booking flows, and native phone-call mirror artifacts are recorded without routing booking writes through provider-specific APIs.
9. Verification reality for `NBH-005`: `npm run typecheck` and `npm run docs:guard` passed; `npm run test:unit` still fails only in the same pre-existing `/Users/foundbrand_001/Development/vc83-com/tests/diagnostic.test.ts` and `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts` paths.
10. Deterministic next active row is `NBH-006`.

Decision lock:

1. Native booking engine is primary.
2. Google Calendar hardening is the next mandatory investment.
3. Cal.com stays API v2 only in this phase.
4. No Cal.com OAuth or enterprise provider architecture is planned in this workstream.
5. The next public UX step is a native visual slot-picker and embed surface.

---

## Lane progress board

- [x] Lane A reality lock + architecture freeze
- [x] Lane B Google Calendar conflict/push hardening
- [ ] Lane C agent runtime booking-engine convergence
- [ ] Lane D native public slot-picker + embed surface
- [ ] Lane E Cal.com v2 adapter containment
- [ ] Lane F roadmap, ship gates, closeout

---

## Immediate objective

1. Execute `NBH-006` next to publish the native booking mutation lifecycle contract on top of the now-native agent runtime paths.
2. Promote lane `D` after that with `NBH-007` so the first native visual slot-picker/public availability surface lands on the hardened backend.
3. Keep `NBH-009` narrow so Cal.com remains a healthy API v2 adapter without stealing architecture ownership.
