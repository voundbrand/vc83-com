# One-of-One V4 - Session Prompts

## Lane Gating

- `LANE-A` is the single-writer lane for inbound telephony ingress and call-record plumbing.
- `LANE-B` is the single-writer lane for booking concierge, booking model, and Kanzlei routing logic.
- `LANE-C` validates after every material `LANE-A` or `LANE-B` change and owns tests plus live-smoke docs.
- `LANE-D` is the single-writer lane for platform telephony template seeding and Kanzlei deployment scaffolding.
- Do not start practice-area routing before the single-resource Kanzlei MVP is passing.

## LANE-A Prompt

You are working in `docs/strategy/one-of-one-v4`.

Your job is to turn inbound Eleven telephony webhooks into first-class runtime events that the platform can actually use for a law-firm booking flow.

Focus on:
- `/webhooks/telephony/direct`
- inbound call-record creation or reconciliation
- routing trusted payloads into the runtime instead of only storing webhook outcomes
- preserving provider identity, route key, transcript, and call identifiers

Constraints:
- do not widen scope into dashboard or template work
- do not hardcode the law-firm bridge into a one-off org agent path
- keep the bridge deterministic and easy to validate
- fail closed on ambiguous tenant routing

## LANE-B Prompt

You are the implementation lane for the booking side of the Kanzlei MVP.

Your job is to make the existing booking concierge usable for one real law-firm deployment.

Focus on:
- single-resource Kanzlei booking
- relaxing or redesigning the email requirement for phone-first intake
- structured legal intake metadata
- internal summary email to the firm

Constraints:
- do not build generic multi-practice-area routing first
- assume the agent entrypoint is the Clara/Jonas/Maren 3-agent wedge, not the full seven-agent roster
- prefer explicit resource configuration over clever auto-routing
- keep the first deployment path narrow enough to ship in 2 weeks

## LANE-C Prompt

You are the validation lane for the Kanzlei MVP.

Your job is to produce trustworthy proof that the inbound call path now works beyond the demo.

Focus on:
- webhook-to-runtime coverage
- phone-safe booking coverage
- calendar reconciliation coverage
- one live smoke checklist for the Schroeder demo firm

Constraints:
- do not weaken assertions to make failures disappear
- keep unit and integration coverage separate from live smoke steps
- every failure must point to a concrete missing bridge, metadata field, or setup dependency

## LANE-D Prompt

You are working in `docs/strategy/one-of-one-v4`.

Your job is to make the law-firm wedge reuse the same protected-template telephony lifecycle that already exists for Anne Becker.

Focus on:
- protected platform templates for Clara, Jonas, and Maren
- template lifecycle bootstrap and published-version readiness
- org deployment flows that spawn managed Kanzlei clones
- telephony metadata that stays compatible with the inbound bridge

Constraints:
- do not expand scope to Tobias, Lina, Kai, or Nora
- do not create a separate Kanzlei-only provisioning path if the Anne Becker pattern can be reused
- keep clone/deploy semantics explicit so later org rollout is operationally safe
