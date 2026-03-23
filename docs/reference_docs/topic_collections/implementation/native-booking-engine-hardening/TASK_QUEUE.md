# Native Booking Engine Hardening Task Queue

**Last updated:** 2026-03-17  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening`  
**Source request:** Keep Cal.com working on API v2 now, define the native booking architecture, harden Google Calendar sync/conflict handling, make agent flows book against the native booking engine, and plan the first native visual date/time picker and embeddable booking surface.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless a lane note explicitly permits parallel execution.
3. Promote from `PENDING` to `READY` only when all dependency tokens are satisfied.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must run its listed `Verify` commands before moving to `DONE`.
6. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` after lane milestones.
7. Native booking engine is the product backbone for this queue. Do not design Cal.com as the system of record.
8. Google Calendar is the primary external conflict/push backend for this queue. Microsoft parity may be referenced but is not the focus of the current ship list.
9. Cal.com scope in this queue is constrained to API v2 adapter support only. Do not add Cal.com OAuth, Cal.com Platform, or enterprise-specific architecture in this workstream.
10. The first public UX milestone is a native visual date/time picker backed by the platform's own availability engine, not a hosted Cal.com page.
11. Preserve preview-first and explicit-confirmation semantics for agentic booking mutations unless a row explicitly upgrades that contract.
12. Cross-workstream boundaries:
    - Personal/business operator runtime delivery remains owned by `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`.
    - Concierge/mobile cutover remains owned by `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/`.
    - Channel/provider commercialization patterns remain owned by `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/`.
13. Dependency token rules:
    - `ID`: dependency must be `DONE` before this row can move `PENDING` -> `READY`.
    - `ID@READY`: dependency must be `READY` or `DONE` before this row can move `PENDING` -> `READY`.
    - `ID@DONE_GATE`: row may become `READY` or `IN_PROGRESS`, but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-NATIVE-ANCHORS` | `rg -n "getAvailableSlots|getExternalBusyTimes|getGoogleCalendarConflictSnapshotInternal|manage_bookings|createBooking" convex/availabilityOntology.ts convex/calendarSyncOntology.ts convex/ai/tools/bookingTool.ts convex/bookingOntology.ts` |
| `V-CALCOM-V2` | `rg -n "CALCOM_DEFAULT_API_BASE_URL|CALCOM_DEFAULT_API_VERSION|CALCOM_SLOTS_API_VERSION|/event-types|/slots|/bookings" convex/integrations/calcom.ts convex/integrations/calcomShared.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Reality lock + architecture freeze | Workstream docs + code-anchored inventory | No implementation lane starts before lane `A` `P0` rows are `DONE` |
| `B` | Google Calendar conflict/push hardening | `convex/calendarSyncOntology.ts`; booking settings UI; tests | Backend contracts first, then UI/test evidence |
| `C` | Agent runtime booking-engine convergence | `convex/ai/tools/bookingTool.ts`; `convex/bookingOntology.ts`; approval/audit contracts | Agents must call native booking primitives, not provider-specific paths |
| `D` | Native public slot-picker + embed surface | booking public APIs + widget UI + landing consumption contract | Provider-agnostic slot contract first, embeddable UI second |
| `E` | Cal.com v2 adapter containment | `convex/integrations/calcom.ts`; integrations UI; owned fallback links | Keep adapter additive and narrow; no OAuth lane work |
| `F` | Roadmap, ship gates, and closeout | Workstream docs + release checklist | Starts after core `P0` lanes have a coherent sequence |

---

## Dependency-based status flow

1. Start with lane `A` (`NBH-001`, `NBH-002`).
2. Lane `B` and lane `C` may start only after lane `A` `P0` rows are `DONE`.
3. Lane `D` may start after `NBH-002` is `DONE`; do not wait for Cal.com adapter work to begin native widget planning.
4. Lane `E` may start after `NBH-001` is `DONE`, but it cannot redirect owned hardcoded links until the native widget contract exists.
5. Lane `F` starts after `NBH-004`, `NBH-006`, `NBH-007`, and `NBH-009` are `DONE` or explicitly `BLOCKED` with documented fallback.
6. No row may claim “booking GA” before Google conflict handling, agent runtime convergence, and public slot-picker API contracts are complete.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `NBH-001` | `A` | 1 | `P0` | `DONE` | - | Freeze the current code-backed baseline for native booking, Google Calendar conflict handling, agent runtime booking entrypoints, and Cal.com adapter scope; record the decision lock that Cal.com remains API v2 only while native booking stays primary. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/availabilityOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcom.ts` | `V-DOCS`; `V-NATIVE-ANCHORS`; `V-CALCOM-V2` | Done 2026-03-17: locked the baseline with code-anchored evidence that native availability already merges external busy times, `manage_bookings` already delegates to native availability/booking internals, native booking already calls Google conflict snapshot logic, and Cal.com already targets API v2 with explicit version headers. |
| `NBH-002` | `A` | 1 | `P0` | `DONE` | `NBH-001` | Publish the canonical native booking architecture contract: booking domain model, availability model, external calendar conflict model, provider adapter boundary, and public-slot-picker target contract. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/INDEX.md` | `V-DOCS` | Done 2026-03-17: published the canonical target architecture, explicit decision lock, phased ship list, and a provider-neutral public slot/booking contract that keeps provider adapters secondary. |
| `NBH-003` | `B` | 2 | `P0` | `DONE` | `NBH-002` | Harden Google Calendar conflict handling and push reconciliation: blocking-calendar selection, missing-scope fail-closed behavior, sync-disabled behavior, external-busy merge semantics, and outbound event-write reconciliation rules. | `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncSubcalendars.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window/calendar-settings.tsx` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-17: normalized Google blocking/push calendar selection against cached sub-calendars, made sync/scope readiness fail closed in sync + availability merge paths, linked synced external events into resource blocking, and reconciled outbound booking writes by provider/connection/calendar target instead of blind `POST` to Google `primary`. |
| `NBH-004` | `B` | 2 | `P0` | `DONE` | `NBH-003` | Add deterministic test coverage for conflict snapshots, external busy-time merges, missing-scope and inactive-connection failure paths, and booking-to-calendar push reconciliation. | `/Users/foundbrand_001/Development/vc83-com/tests/unit`; `/Users/foundbrand_001/Development/vc83-com/tests/integration`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/availabilityOntology.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-17: added deterministic handler coverage for Google conflict snapshots, availability fail-closed and external-busy merge semantics, and Google booking push reconciliation. Verification run: `npm run typecheck` and `npm run docs:guard` passed; `npm run test:unit` still reports pre-existing failures in `/Users/foundbrand_001/Development/vc83-com/tests/diagnostic.test.ts` and `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts`. |
| `NBH-005` | `C` | 3 | `P0` | `DONE` | `NBH-002` | Converge agent flows onto the native booking engine: `manage_bookings` and related runtime paths must resolve availability, create/update/cancel bookings, and produce audit artifacts against native booking primitives instead of provider-specific booking calls. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-17: converged `manage_bookings` create/status/phone-call concierge paths onto native booking primitives, added native phone-call artifact mirroring, and added deterministic unit coverage for native create/push, phone-call booking convergence, and lifecycle side effects. Verification run: `npm run typecheck` passed; `npm run test:unit` still reports the same pre-existing failures in `/Users/foundbrand_001/Development/vc83-com/tests/diagnostic.test.ts` and `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts`; `npm run docs:guard` passed. |
| `NBH-006` | `C` | 3 | `P0` | `READY` | `NBH-005` | Publish and implement the native booking mutation lifecycle contract for agents: propose, hold, confirm, update, cancel, and external-calendar reconciliation evidence. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Must make audit evidence reconstructable without provider inference. |
| `NBH-007` | `D` | 4 | `P0` | `READY` | `NBH-002` | Ship the first native visual date/time picker contract and public availability surface for landing and external pages: provider-neutral slot API, interactive calendar UI, and booking submission path against the native engine. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window`; `/Users/foundbrand_001/Development/vc83-com/src/app`; `/Users/foundbrand_001/Development/vc83-com/convex/availabilityOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | This is the native counterpart to the “Cal.com-style visual manual date chooser” requirement. |
| `NBH-008` | `D` | 4 | `P1` | `PENDING` | `NBH-007` | Define the embeddable/plugin booking widget contract: host configuration, theming, event callbacks, anti-double-booking guarantees, and landing-page consumption path. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing`; `/Users/foundbrand_001/Development/vc83-com/src/components` | `V-DOCS`; `V-TYPE` | Widget must remain backed by native availability, not an iframe to a third-party scheduler. |
| `NBH-009` | `E` | 5 | `P1` | `READY` | `NBH-001` | Keep the Cal.com integration narrow and current: verify API v2 endpoint/version usage, tighten documentation and UI copy around API v2 adapter scope, and explicitly defer OAuth/user-host identity design. | `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcom.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcomShared.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/calcom-settings.tsx`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md` | `V-CALCOM-V2`; `V-TYPE`; `V-DOCS` | No OAuth, no enterprise, no platform-user architecture in this row. |
| `NBH-010` | `E` | 5 | `P1` | `PENDING` | `NBH-007`, `NBH-009` | Replace owned hardcoded Cal.com booking links in product surfaces with the native widget or a platform-configured fallback contract, keeping any residual temporary exceptions explicitly documented. | `/Users/foundbrand_001/Development/vc83-com/src`; `/Users/foundbrand_001/Development/vc83-com/apps`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md` | `V-TYPE`; `V-DOCS` | Track hardcoded sales/demo URLs separately from the provider adapter itself. |
| `NBH-011` | `F` | 6 | `P0` | `PENDING` | `NBH-004`, `NBH-006`, `NBH-007`, `NBH-009` | Publish the phased ship list and exact go/no-go gates for native booking hardening, widget beta, and the limited Cal.com adapter path. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/INDEX.md` | `V-DOCS` | Must state what ships before any serious Cal.com expansion. |
| `NBH-012` | `F` | 6 | `P1` | `PENDING` | `NBH-011` | Final closeout: sync all queue artifacts, ensure current kickoff is accurate, and rerun docs CI clean. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/SESSION_PROMPTS.md` | `V-DOCS` | Keep the immediate objective section aligned to the next promotable row. |

---

## Current kickoff

- Active task: none.
- Next promotable tasks: `NBH-006`, `NBH-007`, `NBH-009`
- Immediate objective: start `NBH-006` first under deterministic pick order, then continue into `NBH-007` while keeping `NBH-009` narrowly scoped to the Cal.com API v2 adapter.
