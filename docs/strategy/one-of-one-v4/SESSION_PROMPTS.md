# One-of-One V4 - Session Prompts

## Lane Gating

- `LANE-A` is the single-writer lane for inbound telephony ingress and call-record plumbing. It is dormant unless the live cutover exposes a bridge bug.
- `LANE-B` is the single-writer lane for booking concierge, booking model, and live Kanzlei org settings.
- `LANE-C` owns preflight evidence capture, tests, and live-smoke docs after every material `LANE-B` or `LANE-D` step.
- `LANE-D` is the single-writer lane for the single-agent Kanzlei template source, template seeding, and deployment scaffolding.
- Do not start practice-area routing before the single-resource Kanzlei MVP is passing live.

## LANE-A Prompt

You are working in `docs/strategy/one-of-one-v4`.

Your job is to turn inbound Eleven telephony webhooks into first-class runtime events that the platform can actually use for the Kanzlei booking flow.

Focus on:

- direct provider ingress
- durable telephony call records
- runtime dispatch compatibility
- preserving provider identity, route key, transcript, and call identifiers

Constraints:

- keep tenant resolution fail-closed
- do not weaken identity checks just to make the smoke pass
- do not hardcode the law-firm bridge into a one-off org agent path

## LANE-B Prompt

You are working in `docs/strategy/one-of-one-v4`.

Your job is to make the existing booking concierge usable for one real single-agent Kanzlei deployment.

Focus on:

- one explicit `booking_concierge` target on the live org
- one writable lawyer calendar connection
- one deterministic event label and timezone configuration
- one deliverable firm-notification recipient set

Constraints:

- do not reopen solved code work unless live setup proves a real config gap
- do not build generic multi-practice-area routing first
- assume the live entrypoint is one customer-facing Kanzlei agent
- prefer explicit resource configuration over clever auto-routing

## LANE-C Prompt

You are working in `docs/strategy/one-of-one-v4`.

Your job is to produce trustworthy proof that the inbound call path now works beyond the demo.

Focus on:

- one accepted inbound-call preflight with provider ids, route key, org id, and runtime evidence
- one live smoke checklist and notes set for the target Kanzlei org
- manual proof for booking or deliberate phone-safe fallback
- calendar and firm-email evidence on the same release window

Constraints:

- do not weaken assertions to make failures disappear
- keep automated coverage separate from manual preflight and live smoke steps
- every failure must point to a concrete missing deploy step, binding, metadata field, or org setup dependency
- do not mark `V4-L1-009` done without timestamps, ids, and exact observed artifacts

## LANE-D Prompt

You are working in `docs/strategy/one-of-one-v4`.

Your job is to make the live Kanzlei MVP reuse the same protected-template telephony lifecycle that already exists for Anne Becker, but with one customer-facing agent instead of the old wedge.

Focus on:

- the live template source in [template.ts](/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/templates/kanzlei_mvp/template.ts)
- protected platform template seeding for the new single-agent Kanzlei path
- target-org deployment plus remote Eleven agent sync
- telephony metadata that stays compatible with the inbound bridge

Constraints:

- do not reopen the Clara/Jonas/Maren demo path unless the user explicitly asks
- do not create a separate Kanzlei-only provisioning bypass if the Anne Becker pattern can be reused
- keep clone/deploy semantics explicit so later org rollout is operationally safe
