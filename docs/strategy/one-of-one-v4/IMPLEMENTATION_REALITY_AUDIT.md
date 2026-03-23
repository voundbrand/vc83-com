# V4 Implementation Reality Audit

## Purpose

This audit checks whether Layer 1 Sprint 1 in [TECHNICAL_PRODUCT_PLAN.md](/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/TECHNICAL_PRODUCT_PLAN.md) matches the code that actually exists today.

Short answer: no.

The repo already contains strong native booking, calendar reconciliation, CRM lookup/create, and phone-safe booking primitives. The plan overstates how "wired" the ElevenLabs inbound call path already is, understates the metadata constraints in the booking path, and points at a few wrong files for the work that remains.

## What Is Already Real

- Eleven telephony ingress already exists in [convex/http.ts](/Users/foundbrand_001/Development/vc83-com/convex/http.ts). The `/webhooks/telephony/direct` handler normalizes Eleven payloads, resolves route identity, verifies signatures, and records webhook outcomes.
- The provider registry already aliases `eleven_telephony` to the direct telephony provider in [convex/channels/registry.ts](/Users/foundbrand_001/Development/vc83-com/convex/channels/registry.ts).
- The booking tool already has a reusable booking-concierge flow, including phone-safe preview/execute stages, CRM reuse/create, calendar push, and phone-call mirror artifacts in [convex/ai/tools/bookingTool.ts](/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts).
- Calendar push reconciliation already exists in [convex/calendarSyncOntology.ts](/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts).
- The platform already has a protected template seed/bootstrap precedent for customer-facing telephony in [convex/onboarding/seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts).
- The platform already has an org deployment action that resolves the Anne Becker immomakler template and spawns a managed org clone in [convex/integrations/telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts).
- Recent tests in `tests/unit/ai/meetingConciergeIngress.test.ts`, `tests/unit/ai/bookingTool.nativePhoneCallConvergence.test.ts`, `tests/unit/bookingOntology.agentRuntimeConvergence.test.ts`, and `tests/integration/googleCalendarPushReconciliation.integration.test.ts` confirm that the current branch is already hardening these primitives.

## Sprint 1 Reality Check

| Task | Claimed mapping | Reality | Verdict | Real files on critical path |
| --- | --- | --- | --- | --- |
| `1.1` Configure ElevenLabs webhook to trigger Convex booking tool on call completion | `convex/http.ts`, `convex/channels/registry.ts` | `http.ts` already accepts Eleven webhooks. `registry.ts` is not the main work. The missing piece is that inbound call completion does not create a usable inbound call record and does not invoke `api.ai.agentExecution.processInboundMessage` or the booking concierge. | `Does not map` | `convex/http.ts`, `convex/channels/router.ts`, `convex/ai/agentExecution.ts` |
| `1.2` Map Jonas qualification output to booking tool identify and CRM stages | `convex/ai/tools/bookingTool.ts` | The booking tool already has `identify`, `crm_lookup_create`, `contact_capture`, `booking`, and `invite`. The missing work is upstream: Eleven post-call payloads are not converted into the runtime metadata or tool args this flow expects. | `Partially maps` | `convex/http.ts`, `convex/ai/agentExecution.ts`, `convex/ai/tools/bookingTool.ts` |
| `1.3` Implement practice area to lawyer routing in Maren slot selection | `convex/availabilityOntology.ts`, `convex/bookingOntology.ts` | Current routing picks an explicit `resourceId` or the first active bookable product. There is no practice-area model and no lawyer roster resolver. The first implementation belongs in org settings and booking-tool resource resolution, not primarily in availability conflict logic. | `Does not map` | `convex/organizationOntology.ts`, `convex/ai/tools/bookingTool.ts`, then `convex/availabilityOntology.ts` if schedule shape changes are needed |
| `1.4` Create Kanzlei booking type with law-firm fields via customProperties | `convex/bookingOntology.ts` | Subtypes are flexible, but `createBookingInternal` does not accept arbitrary `customProperties`. The current booking write path hardcodes fields like `customerEmail`, `notes`, and `resourceIds`. | `Partially maps` | `convex/bookingOntology.ts`, `convex/ai/tools/bookingTool.ts`, any downstream readers of booking props |
| `1.5` Wire Maren booking confirmation to calendar sync | `convex/calendarSyncOntology.ts` | This is mostly already done. The booking concierge already calls `pushBookingToCalendar`, and calendar reconciliation already updates linked Google/Microsoft calendars. The missing piece is correct resource selection and calendar linkage per lawyer. | `Mostly already true` | `convex/ai/tools/bookingTool.ts`, `convex/calendarSyncOntology.ts`, resource/calendar setup |
| `1.6` Build intake summary email template | `convex/channels/` email provider | There is no law-firm intake-summary notification path today. The phone-safe flow creates booking mirror artifacts but does not email the lawyer or firm inbox with structured intake facts. | `Does not map` | `convex/ai/tools/bookingTool.ts`, `convex/channels/router.ts`, email provider/template path |
| `1.7` Test end-to-end call to calendar plus email | All above | Current ElevenLabs simulation focuses on handoff behavior. Current booking tests validate concierge and calendar primitives. There is no end-to-end test that starts with an Eleven telephony webhook and ends with a law-firm calendar entry plus internal summary email. | `Does not map` | `tests/unit/ai/meetingConciergeIngress.test.ts`, `tests/unit/ai/bookingTool.nativePhoneCallConvergence.test.ts`, `tests/integration/googleCalendarPushReconciliation.integration.test.ts`, new inbound telephony smoke coverage |

## Additional Gaps The Current Plan Misses

### A. Inbound call records are not created for real customer calls

`recordTelephonyWebhookOutcome` updates an existing `telephony_call_record` if it can find one. Those records are currently created when the platform sends a phone call through `channels.router.sendMessage`. That is an outbound path, not the inbound ElevenLabs customer-call path.

Implication:
- a real inbound law-firm call can hit the Eleven webhook and still fail to produce a durable call record, transcript artifact, or booking-linked artifact chain

### B. The current booking path hard-requires customer email

The meeting-concierge intent builder and the booking flow both require `personEmail` to be present before the booking flow is considered safe.

Implication:
- the current system is still closer to a "meeting concierge" than a German law-firm phone intake
- a phone-first law-firm MVP either needs mandatory email capture in the voice flow or a new phone-only booking/callback path

### C. Practice-area routing is not the first 2-week critical path

The fastest credible MVP is:
- one firm
- one explicit `Erstberatung` resource or one lawyer calendar
- one configured Google or Microsoft calendar target
- one structured intake-summary email to the firm inbox

Automatic practice-area to lawyer routing should follow after the single-resource path works live.

### D. The plan should reuse the Anne Becker template lifecycle

The repo already contains a platform-native way to seed a protected telephony template and deploy it into an org as a managed clone. That is the right starting point for Clara, Jonas, and Maren.

Implication:
- the Kanzlei wedge should be built on platform templates from day one
- the MVP should still stop at Clara, Jonas, and Maren instead of prebuilding all seven agents for rollout

## Two-Week Verdict

### What is realistic in 2 weeks

- An end-to-end single-firm MVP is realistic if scope is narrowed to:
- one inbound ElevenLabs webhook path
- one protected platform template path for Clara, Jonas, and Maren, reusing the Anne Becker deployment model
- one configured firm resource or lawyer calendar
- mandatory capture of name and phone, plus either email capture or phone-only fallback support
- booking creation
- calendar push
- structured internal summary email
- automated unit and integration coverage plus one live smoke checklist

### What is not realistic in the same 2 weeks

- full seven-agent platform rollout
- generic multi-practice-area routing
- reusable Kanzlei templates
- multi-lawyer dynamic assignment
- dashboard work
- audit mode and audit report generation
- RA-MICRO-facing data export

## Corrected Critical Path

1. Make inbound ElevenLabs calls first-class platform events instead of passive webhook outcome updates.
2. Convert ElevenLabs qualification output into a deterministic concierge payload that the runtime can trust.
3. Reuse the Anne Becker protected-template lifecycle for Clara, Jonas, and Maren instead of inventing a one-off Kanzlei provisioning path.
4. Relax or redesign the email requirement for law-firm phone bookings.
5. Ship a single-resource Kanzlei MVP before adding practice-area routing.
6. Add the internal lawyer/firmside intake summary email.
7. Add the end-to-end test and live smoke gate that the current Sprint 1 lacks.

## Conclusion

Layer 1 Sprint 1 does not map exactly to the codebase, and the current file list is too optimistic for the inbound telephony gap.

The good news is that the repo already contains enough booking, calendar, and template-deployment infrastructure to make a 2-week pilot plausible, but only after the plan is re-scoped from "generic law-firm routing MVP" to "single-firm inbound call to booking MVP built on Clara, Jonas, and Maren as protected platform telephony templates."
