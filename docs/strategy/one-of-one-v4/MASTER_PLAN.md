# One-of-One V4 - Master Plan

## Objective

Turn the current ElevenLabs demo, the Anne Becker telephony-template precedent, and the native booking primitives into a real law-firm pilot that can accept an inbound call, capture intake, create a booking, push it to a lawyer calendar, and notify the firm.

## What Is Already True

- Eleven telephony webhook normalization, route resolution, and signature verification already exist in [convex/http.ts](/Users/foundbrand_001/Development/vc83-com/convex/http.ts).
- The platform already has a reusable booking concierge, including phone-safe preview and execute stages, in [convex/ai/tools/bookingTool.ts](/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts).
- The platform already has booking persistence in [convex/bookingOntology.ts](/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts) and calendar reconciliation in [convex/calendarSyncOntology.ts](/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts).
- The platform already has a protected template seed/bootstrap path for customer telephony in [convex/onboarding/seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts).
- The platform already has an org deployment path that resolves the Anne Becker telephony template and spawns a managed org clone in [convex/integrations/telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts).
- The current branch already includes tests for concierge ingress, native phone booking convergence, booking runtime convergence, and calendar push reconciliation.

## What Is Not Yet True

- A real inbound ElevenLabs customer call does not yet become a first-class inbound runtime event that can reliably trigger the booking flow.
- The current law-firm path still hard-requires customer email, which is too strict for a phone-first Kanzlei deployment.
- There is no implemented practice-area to lawyer routing model.
- There is no structured internal intake summary email for the firm.
- There is no end-to-end validation path from Eleven telephony webhook to booking plus calendar plus firm notification.

## Strategy Correction

Do not treat the original Layer 1 Sprint 1 as the real 2-week scope.

The corrected 2-week target is:
- one firm
- one explicit `Erstberatung` resource or one lawyer calendar
- one inbound ElevenLabs webhook path
- one platform-native Clara, Jonas, and Maren template path built the same way as Anne Becker, not a one-off Kanzlei-only agent setup
- one structured intake payload contract
- one booking path
- one internal notification path
- one end-to-end validation path

Practice-area routing, reusable Kanzlei templates beyond the 3-agent wedge, dashboard work, audit mode, the other four specialist agents, and RA-MICRO integration stay outside that initial pilot gate.

## Implementation Principle

Build the Kanzlei wedge on the platform path that already exists.

- Clara, Jonas, and Maren should become protected platform telephony templates with managed org clones, following the same seed/bootstrap/deploy lifecycle already used for Anne Becker.
- The pilot should stop at the 3-agent wedge. Do not front-load Tobias, Lina, Kai, and Nora into the initial law-firm rollout.
- Do not build a Kanzlei-only agent provisioning path if the Anne Becker template lifecycle can be reused.

## Milestones

### Milestone 1 - Reality Freeze

Output:
- one written audit of the current Layer 1 Sprint 1 assumptions
- one queue that reflects the actual codebase

Done when:
- `V4-REALITY-001` is `DONE`

### Milestone 2 - Inbound Call Bridge

Output:
- inbound ElevenLabs webhook creates or resolves a durable telephony call record
- inbound call data can trigger the runtime booking path instead of only updating webhook outcome state

Done when:
- `V4-L1-001` and `V4-L1-002` are `DONE`

### Milestone 3 - Core Wedge Template Base

Output:
- Clara, Jonas, and Maren exist as protected platform telephony templates
- Kanzlei deployments can reuse the Anne Becker-style org clone flow instead of bespoke agent creation
- the template rollout remains limited to the 3-agent law-firm wedge

Done when:
- `V4-L1-003` is `DONE`

### Milestone 4 - Single-Firm Kanzlei MVP

Output:
- one configured firm resource or lawyer calendar
- booking write succeeds from inbound phone-call payload
- calendar push succeeds
- internal intake summary email is sent

Done when:
- `V4-L1-004`, `V4-L1-005`, `V4-L1-006`, and `V4-L1-007` are `DONE`

### Milestone 5 - Pilot Validation

Output:
- automated ingress and booking coverage
- automated calendar reconciliation coverage
- live smoke checklist for the law-firm demo path

Done when:
- `V4-L1-008` and `V4-L1-009` are `DONE`

### Milestone 6 - Post-Pilot Enhancements

Output:
- practice-area to lawyer routing
- multi-lawyer calendar targeting
- reusable Kanzlei intake metadata model

Done when:
- `V4-L2-001` and `V4-L2-002` are `DONE`

## Risks

- The inbound telephony bridge is the real critical path; if it slips, the rest of the MVP remains a demo.
- If Clara, Jonas, and Maren are built as one-off org agents instead of platform templates, the pilot will bypass the rollout lifecycle already proven by Anne Becker.
- The current email requirement can block otherwise-valid law-firm bookings.
- Expanding to all seven agents before the 3-agent wedge works live would add template, telephony, and QA surface area without improving the first legal outcome.
- Practice-area routing can easily balloon the scope if it is kept in the initial 2-week MVP.
- Calendar linkage can look "done" in code while still failing at tenant setup time if resource-to-calendar bindings are not explicit.

## Decision Rule

Do not call the law-firm deployment path "working" until one real inbound ElevenLabs call can do all of the following in the same run:

1. persist call context
2. produce a booking or an intentional phone-safe fallback
3. push the confirmed booking to the configured lawyer calendar
4. send the internal intake summary to the firm
