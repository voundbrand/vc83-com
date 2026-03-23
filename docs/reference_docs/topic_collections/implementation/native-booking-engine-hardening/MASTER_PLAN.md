# Native Booking Engine Hardening Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening`  
**Last updated:** 2026-03-17

---

## Mission

Ship a durable native booking foundation for agents and public booking surfaces while keeping the current Cal.com integration functional on API v2 only.

This workstream owns four concrete outcomes:

1. Harden native booking and availability contracts so the platform itself is the booking system of record.
2. Harden Google Calendar conflict detection and booking push behavior so native booking can be trusted operationally.
3. Make agent flows book against native booking primitives with explicit approval and audit semantics.
4. Ship the first native visual slot-picker and embeddable booking surface for landing and future public pages.

Cal.com remains in scope only as a narrow adapter:

5. Keep Cal.com working on API v2 now.
6. Do not make Cal.com OAuth, Cal.com Platform, or enterprise-provider architecture part of this workstream.

---

## Decision Lock

These decisions are fixed for this workstream unless a later queue row explicitly overturns them:

1. Native booking engine is the primary architecture.
2. Google Calendar is the first-class external conflict and calendar-push backend.
3. Cal.com remains a working API v2 adapter only.
4. No Cal.com OAuth work is planned in this stream.
5. The next major UX milestone is a native visual date/time picker and embeddable booking widget, not a hosted third-party page.

---

## Current Reality Anchors

| Surface | Evidence anchor | Current state | Planning implication |
|---|---|---|---|
| Native booking core | `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts:1` | Universal booking ontology already exists with subtype/status model and create/list/update flows. | Reuse as system of record instead of introducing a provider-owned booking model. |
| Slot generation + buffers + capacity + external busy | `/Users/foundbrand_001/Development/vc83-com/convex/availabilityOntology.ts:134` | Native availability engine already merges schedules, exceptions, blocks, existing bookings, and external busy-time conflicts. | Native slot API is viable and should back the public picker. |
| Google conflict readiness | `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:411` | Google conflict snapshot already checks connection presence, org match, provider, active status, sync enablement, and calendar scopes fail-closed. | Google hardening should extend this path, not replace it. |
| Agent booking runtime | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts:1` | `manage_bookings` already exists as the main agentic booking tool with preview-first semantics. | Agent flows should converge further onto native primitives instead of provider-specific calls. |
| Booking admin UI | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window.tsx:1` | Desktop/admin booking UI already exposes bookings, locations, availability, and settings. | Public widget can reuse slot/booking contracts without rethinking the admin domain. |
| Booking form path | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window/booking-form-modal.tsx:41` | Manual booking creation already writes directly into `bookingOntology.createBooking`. | Native booking submission flow already exists and should be generalized for public/widget use. |
| Agent tool -> native booking internals | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts:670`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts:745`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts:1014`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts:2952` | Agent booking runtime already routes core availability and create-booking paths through native ontology internals. | Convergence work should reduce remaining drift, not invent a second booking execution path. |
| Native booking -> Google conflict gate | `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts:1975` | Native booking creation already consults the Google conflict snapshot path before finalizing certain flows. | Google hardening improves the existing booking path rather than bolting on a new validator. |
| Cal.com adapter scope | `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcom.ts:1` | Current integration is API-based, not hardcoded URL-based, and already uses Cal.com API v2 endpoints. | Keep this narrow and working, but do not let it own architecture. |
| Cal.com API v2 contract | `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcomShared.ts:1`; `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcom.ts:649` | Base URL is `https://api.cal.com/v2` with API-version headers and actions for event types, slots, and bookings. | Current work is already on v2; the task is to preserve and contain it, not replatform it. |

---

## Lane A Closeout

Lane `A` is complete as of 2026-03-17.

What was locked:

1. Native booking already has enough real surface area to be the architecture owner:
   - booking objects and mutations live in `bookingOntology`,
   - slot generation lives in `availabilityOntology`,
   - admin/manual booking UI already writes through the native booking path.
2. Google Calendar is already in the critical conflict path:
   - conflict snapshot logic exists,
   - native availability already merges external busy times,
   - native booking already references Google conflict checks internally.
3. Agent runtime is already partially converged:
   - `manage_bookings` already delegates core booking and slot lookup to native internals,
   - remaining work is to remove drift and make evidence/lifecycle contracts explicit.
4. Cal.com is already on API v2:
   - base URL is `/v2`,
   - explicit API-version headers are present,
   - current scope is event types, slots, and bookings.

Resulting planning lock:

1. No Cal.com OAuth work is needed to proceed with the booking roadmap.
2. Native slot-picker/widget work should begin from the current ontology, not from a provider-hosted surface.
3. Google Calendar hardening is the first implementation priority after the docs freeze.

---

## Target Architecture

### 1. Booking Domain Core

The platform owns the canonical booking record.

Contract:

1. `bookingOntology` remains the source of truth for bookings, states, participants, resource bindings, and mutation history.
2. Resources, locations, and bookable configuration remain native platform concepts.
3. Provider integrations may contribute availability inputs or external projection, but they do not own the booking object model.

### 2. Availability and Conflict Engine

The native availability engine produces the slot contract.

Contract:

1. Slots are generated from schedules, exceptions, blocks, buffers, duration rules, capacity, and existing bookings.
2. External busy-time signals from Google Calendar are treated as conflict inputs.
3. Slot contracts must remain provider-neutral so they can back:
   - agent booking flows,
   - admin booking UI,
   - public booking widget,
   - optional provider adapters later.

### 3. External Calendar Projection Layer

External calendars are projection and conflict services, not the booking backbone.

Contract:

1. Google Calendar provides:
   - conflict reads,
   - optional calendar push,
   - reconciliation/audit evidence.
2. Missing scope, inactive connections, and disabled sync must fail closed for writes and be explicit in conflict/readiness responses.
3. External push state must be linked back to native booking outcomes.

### 4. Agent Runtime Layer

Agents act on the native booking engine.

Contract:

1. `manage_bookings` and any future booking-capable tools resolve against native availability and booking primitives.
2. Agent flows remain preview-first and approval-aware by default.
3. Booking lifecycle evidence must include:
   - proposed slot,
   - approval/confirmation state,
   - mutation result,
   - external calendar projection state.

### 5. Public Booking Surface

The platform ships its own visible booking UX.

Contract:

1. Public/native slot-picker uses the same slot contract as the internal booking engine.
2. The UI supports manual visual date and time selection.
3. Landing and future public pages consume this as a widget/embed contract rather than redirecting to a hosted third-party page by default.

### 5a. Provider-Neutral Public Slot Contract

This is the contract that the first native visual picker and widget should target.

Availability request shape:

1. `resourceId` or `resourceIds`
2. `startDate`
3. `endDate`
4. `timezone`
5. `duration`
6. optional participant and presentation context

Availability response minimum fields:

1. `resourceId`
2. `startDateTime`
3. `endDateTime`
4. `date`
5. `startTime`
6. `endTime`
7. `timezone`
8. `remainingCapacity`
9. `isAvailable`

Booking submission minimum fields:

1. `resourceIds`
2. `startDateTime`
3. `endDateTime`
4. `customerName`
5. `customerEmail`
6. optional `customerPhone`
7. optional `locationId`
8. `participants`
9. optional notes and confirmation metadata

Provider mapping rule:

1. Provider adapters may source or mirror availability, but any public/widget flow must normalize back into this contract before booking mutation.

### 6. Provider Adapter Layer

Provider integrations remain optional adapters.

Contract:

1. Cal.com adapter remains API v2 only in this phase.
2. It may expose event types, availability, and booking operations for orgs that use Cal.com today.
3. It does not redefine the core platform booking model.
4. OAuth, hosted-identity, and enterprise provider architecture are explicitly deferred.

---

## Exact Ship List

### Phase 1: Architecture Freeze

Ship:

1. Code-backed reality lock for native booking, Google conflict handling, agent runtime, and current Cal.com v2 adapter.
2. Canonical architecture contract published in this workstream.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/native-booking-engine-hardening/TASK_QUEUE.md`

### Phase 2: Google Calendar Hardening

Ship:

1. Deterministic conflict handling and external-busy reconciliation.
2. Fail-closed scope/connection readiness behavior.
3. Explicit booking-to-calendar push reconciliation rules and test coverage.

Status:

1. `NBH-003` is complete as of 2026-03-17: Google blocking/push calendar selection is normalized against the cached sub-calendar list, sync and missing-scope states now fail closed in sync + availability paths, and booking pushes reconcile by provider/connection/calendar target instead of always creating a new Google `primary` event.
2. `NBH-004` is complete as of 2026-03-17: deterministic handler coverage now exercises Google conflict snapshots, availability fail-closed and external busy merge semantics, and Google booking push reconciliation.
3. Verification reality for `NBH-004`: `npm run typecheck` and `npm run docs:guard` passed; `npm run test:unit` still fails only in the pre-existing `/Users/foundbrand_001/Development/vc83-com/tests/diagnostic.test.ts` and `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts` suites.

Output:

- `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncSubcalendars.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/booking-window/calendar-settings.tsx`
- relevant unit/integration tests

### Phase 3: Agent Booking Convergence

Ship:

1. Native booking is the authoritative agent runtime path.
2. Proposal, hold, confirm, update, cancel, and reconciliation evidence contract.
3. Clear preview-first and approval semantics for mutating flows.

Output:

- `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`

### Phase 4: Native Visual Slot Picker and Embed

Ship:

1. Provider-neutral public availability API.
2. Native visual date/time picker.
3. First embeddable booking widget contract for landing and public pages.

Output:

- public/native availability and booking APIs
- widget UI components
- landing integration surface

### Phase 5: Cal.com v2 Adapter Containment

Ship:

1. Keep current Cal.com adapter healthy on API v2.
2. Tighten product/docs language so Cal.com is understood as adapter scope.
3. Track and replace owned hardcoded Cal.com links where native widget coverage exists.

Output:

- `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcom.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/integrations/calcomShared.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/calcom-settings.tsx`

### Phase 6: Ship Gates

Native booking hardening can claim “go” only when:

1. Google conflict handling is deterministic and test-backed.
2. Agent runtime booking mutations target native booking primitives.
3. Public/native slot-picker contract exists.
4. Cal.com remains functional on API v2 without pulling architecture ownership away from native booking.

Serious Cal.com expansion remains `NO_GO` until after the above is complete.

Deterministic next build order after lane `A`:

1. `NBH-006` booking mutation lifecycle contract
2. `NBH-007` native visual slot-picker/public surface
3. `NBH-009` Cal.com v2 adapter containment
4. `NBH-008` embeddable native widget contract

---

## Out of Scope Now

1. Cal.com OAuth.
2. Cal.com Platform or enterprise multi-tenant provider architecture.
3. Replacing native booking with provider-owned booking records.
4. Treating hosted Cal.com links as the long-term public booking UX.

---

## Risks

1. Over-investing in Cal.com can delay the native widget and keep public booking UX dependent on third-party pages.
2. Under-testing Google conflict handling can make the native engine appear unreliable even when the ontology is sound.
3. Letting agent flows bypass native primitives will fragment booking evidence and make future widget/provider convergence harder.
4. Hardcoded Cal.com URLs in product/sales surfaces can preserve architectural ambiguity even if the adapter itself is correctly contained.

---

## Cross-Workstream Boundaries

1. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`
   Owns personal/business operator runtime expectations and booking-mission behavior.
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/`
   Owns concierge/mobile cutover and related readiness sequencing.
3. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/`
   Owns general commercialization patterns for provider-backed integrations.

This workstream owns the native booking architecture, Google hardening plan, widget-first public booking direction, and the limited Cal.com v2 containment strategy.
