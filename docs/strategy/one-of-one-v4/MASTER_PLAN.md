# One-of-One V4 - Master Plan

## Objective

Turn the current telephony bridge, booking primitives, and protected-template lifecycle into a real single-agent Kanzlei pilot that can accept an inbound call, capture intake, create a booking or callback-safe fallback, push the booking to a lawyer calendar, and notify the firm.

## What Is Already True

- Eleven telephony webhook normalization, route resolution, and signature verification already exist in [convex/http.ts](/Users/foundbrand_001/Development/vc83-com/convex/http.ts).
- Accepted Eleven inbound calls can now create or resolve a durable `telephony_call_record` and dispatch `api.ai.agentExecution.processInboundMessage` through the direct webhook path in [convex/http.ts](/Users/foundbrand_001/Development/vc83-com/convex/http.ts) and [convex/channels/router.ts](/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts).
- The platform already has a reusable booking concierge, including phone-safe preview and execute stages, in [convex/ai/tools/bookingTool.ts](/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts).
- The platform already has booking persistence in [convex/bookingOntology.ts](/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts) and calendar reconciliation in [convex/calendarSyncOntology.ts](/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts).
- The phone-first Kanzlei path no longer hard-requires customer email when caller phone identity is present.
- Structured legal intake fields and best-effort internal firm notification email already exist on the booking path.
- The platform already has a protected template seed/bootstrap path for customer telephony in [convex/onboarding/seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts).
- The platform now has a dedicated single-agent Kanzlei telephony template in [template.ts](/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/templates/kanzlei_mvp/template.ts), seeded through [seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts) and deployable through [telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts).
- The current branch includes unit coverage for the new Kanzlei template seed plus the existing telephony provisioning path.

## What Is Not Yet True

- The new single-agent Kanzlei template has not yet been seeded onto the live platform org in this turn.
- There is no confirmed live deployment of the new template to a target Kanzlei org.
- There is no captured target-org audit proving `booking_concierge`, lawyer calendar linkage, and firm email recipients are all configured on the same org that will receive the live call.
- There is no recorded inbound-call preflight proving the live number resolves the intended tenant and produces the expected call record and runtime artifacts.
- There is no live manual proof from a real inbound Eleven call to booking plus calendar plus firm notification.
- There is no implemented practice-area to lawyer routing model.

## Strategy Correction

Do not keep the live Kanzlei MVP on the Clara/Jonas/Maren wedge.

The corrected MVP target is:

- one firm
- one customer-facing Kanzlei agent
- one inbound ElevenLabs webhook path
- one platform-native Kanzlei telephony template built the same way as Anne Becker
- one structured intake payload contract
- one booking path
- one internal notification path
- one live setup path with explicit deploy, org config audit, preflight, and end-to-end validation

The old 3-agent wedge remains useful as a demo surface, not as the live small-firm MVP.

## Implementation Principle

Build the live Kanzlei MVP on the platform path that already exists.

- The live product should be one customer-facing agent for small law firms.
- That agent should still use the protected-template lifecycle already proven by Anne Becker.
- Do not build a Kanzlei-only provisioning bypass.
- Do not force the live small-firm MVP through Clara/Jonas/Maren transfer logic if one agent can handle the real call cleanly.

## Milestones

### Milestone 1 - Reality Freeze

Output:

- one written audit of the current Layer 1 assumptions
- one queue that reflects the actual codebase

Done when:

- `V4-REALITY-001` is `DONE`

### Milestone 2 - Inbound Call Bridge

Output:

- inbound ElevenLabs webhook creates or resolves a durable telephony call record
- inbound call data can trigger the runtime booking path instead of only updating webhook outcome state

Done when:

- `V4-L1-001` and `V4-L1-002` are `DONE`

### Milestone 3 - Single-Agent Template Base

Output:

- one protected platform Kanzlei telephony template exists
- Kanzlei deployments can reuse the Anne Becker-style org clone flow instead of bespoke agent creation
- the live path stops at one customer-facing Kanzlei agent

Done when:

- `V4-L1-003` and `V4-L1-010` are `DONE`

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

- the single-agent Kanzlei template is deployed to the target org
- the remote Eleven agent is provisioned or synced
- org setup audit for booking, calendar, and firm email is recorded
- accepted inbound-call preflight evidence exists

Done when:

- `V4-L1-008`, `V4-L1-011`, `V4-L1-012`, and `V4-L1-013` are `DONE`

### Milestone 6 - Live Smoke

Output:

- one real inbound Eleven call reaches the target Kanzlei org
- booking or explicit phone-safe fallback is recorded
- calendar and firm email outcomes are evidenced in the same run

Done when:

- `V4-L1-009` is `DONE`

### Milestone 7 - Post-Pilot Enhancements

Output:

- practice-area to lawyer routing
- multi-lawyer calendar targeting
- reusable Kanzlei intake metadata model

Done when:

- `V4-L2-001` and `V4-L2-002` are `DONE`

## Risks

- The live org may still be wired to old demo-era telephony assumptions even after the new template exists in code.
- Config drift between phone binding, target org id, route key, `booking_concierge`, calendar, and email recipients can make the bridge look broken when the issue is tenant setup.
- The bridge is transcript-driven after the accepted inbound call, so poor or partial caller transcript detail can degrade booking success even when routing is correct.
- The single-agent prompt can still fail if it drifts into legal advice or fake-confirmation language.
- Practice-area routing can easily balloon the scope if it is pulled back into the initial MVP.

## Decision Rule

Do not call the law-firm deployment path "working" until one real inbound ElevenLabs call can do all of the following in the same run:

1. persist call context
2. produce a booking or an intentional phone-safe fallback
3. push the confirmed booking to the configured lawyer calendar
4. send the internal intake summary to the firm
