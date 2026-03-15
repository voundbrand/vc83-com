# Phase 0 Proof — Runtime Gap Audit

## Purpose

Freeze the delta between the current landing-demo runtime and the proof-phase demo specification in [`04_PROOF_PHASE_DEMO.md`](./04_PROOF_PHASE_DEMO.md).

This audit is the acceptance baseline for the remaining `P0-PROOF-*` implementation work.

## Baseline

As of `2026-03-15`, the current repo and staging workflow already provide:

- repo-managed ElevenLabs prompt / tool / workflow sync for the landing-demo agents
- a passing `all-handoffs` staging suite for the working Clara-centered specialist topology
- Clara as the public phone entrypoint
- Samantha kept separate from the Clara phone runtime

Source references used for this audit:

- proof target: [`04_PROOF_PHASE_DEMO.md`](./04_PROOF_PHASE_DEMO.md)
- current runtime overview: [`landing-demo-agents/README.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/README.md)
- current shared demo business: [`demo-business-core.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/demo-business-core.md)
- current agent coverage: [`v2/test-coverage.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/v2/test-coverage.md)
- current harness scope: [`apps/one-of-one-landing/scripts/elevenlabs/README.md`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/README.md)

## What Is Already Aligned

- One public phone number flows through Clara, which matches the proof demo's receptionist-first framing.
- The seven phone-demo specialists already map to the proof roles: receptionist, scheduling, qualification, follow-up, operations, documentation, and analytics.
- The repo is already the source of truth for managed ElevenLabs configuration.
- Samantha is already separated from the phone demo, which matches the current proof-story requirement that the call itself showcases the phone roster.

## Delta List

### 1. Demo-business world is wrong

Proof target:
- `Schmitt & Partner`
- multi-service Mittelstand operator
- `8` employees
- `2` locations
- `30-50` calls per day

Current runtime:
- shared business core is still `Nordstern Gebäudetechnik GmbH`
- building-services specific
- `38` employees
- `4` regions / hubs
- much denser service-operating detail than the proof spec needs

Evidence:
- [`demo-business-core.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/demo-business-core.md)

Impact:
- the live demo story does not match the founder narrative in the proof doc
- the fictional company is too specific to one service vertical for a Phase 0 universal demo
- location, team-size, and operating-shape examples will drift from the WhatsApp / PDF sales framing if left unchanged

Follow-on tasks:
- `P0-PROOF-002`
- `P0-PROOF-003`
- `P0-PROOF-004`

### 2. Agent identity still sounds like a product demo, not Schmitt & Partner staff

Proof target:
- Clara sounds like the receptionist for `Schmitt & Partner`
- each specialist sounds like part of the same operating company during one cohesive demo call

Current runtime:
- prompts still identify agents primarily as specialists "for sevenlayers"
- Clara is framed as the public demo concierge for sevenlayers
- specialist prompts are lane-correct but not yet rewritten into the `Schmitt & Partner` proof story

Evidence:
- [`clara/system-prompt.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/clara/system-prompt.md)
- [`maren/system-prompt.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/maren/system-prompt.md)
- parallel specialist prompt files in `landing-demo-agents/*/system-prompt.md`

Impact:
- the call can feel like a guided demo of features instead of one believable front office
- the founder pitch in the proof doc will overpromise cohesion relative to what the caller hears

Follow-on tasks:
- `P0-PROOF-002`
- `P0-PROOF-003`
- `P0-PROOF-004`

### 3. The proof-call shape is not yet a gated artifact

Proof target:
- one single phone call that naturally showcases all seven phone agents
- the proof flow should be reproducible enough to use as a demo gate

Current runtime:
- `all-handoffs` is the working gate and covers the routing graph across many fixtures
- `clara-specialist-grand-tour.json` exists only as an exploratory stress path
- there is no proof-named seven-agent fixture wired in as the proof-spec gate yet

Evidence:
- [`v2/test-coverage.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/v2/test-coverage.md)
- [`apps/one-of-one-landing/scripts/elevenlabs/README.md`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/README.md)
- [`apps/one-of-one-landing/fixtures/elevenlabs`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/fixtures/elevenlabs)

Impact:
- we can prove the routing topology works
- we cannot yet prove that the exact founder-led proof story works end-to-end as one reusable scripted asset

Follow-on task:
- `P0-PROOF-005`

### 4. Proof-grade live-call QA is not yet implemented

Proof target:
- smooth handoffs
- native German quality
- graceful handling of weird questions
- clear audio quality
- `10+` persona coverage

Current runtime:
- the harness is intentionally text/API-first
- the harness docs explicitly say a voice smoke layer is not included yet
- there is no proof QA matrix or recorded persona checklist in this workstream

Evidence:
- [`apps/one-of-one-landing/scripts/elevenlabs/README.md`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/scripts/elevenlabs/README.md)
- [`04_PROOF_PHASE_DEMO.md`](./04_PROOF_PHASE_DEMO.md)

Impact:
- staging may pass routing while the phone experience still fails the actual founder demo bar
- there is no auditable proof yet for dialect handling, weird-question recovery, or perceived call quality

Follow-on tasks:
- `P0-PROOF-006`
- `P0-PROOF-007`

### 5. Reliability and call-volume proof is not yet recorded

Proof target:
- `50+` test calls without breaking
- explicit `24/7` availability confidence during the test period

Current runtime:
- the business model claims `24/7` answer coverage
- there is no soak-run artifact in this workstream showing `50+` proof calls or an off-hours observation window

Evidence:
- [`demo-business-core.md`](../../reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents/demo-business-core.md)
- [`04_PROOF_PHASE_DEMO.md`](./04_PROOF_PHASE_DEMO.md)

Impact:
- the strongest proof claim in the sales story is not yet backed by a tracked validation record

Follow-on task:
- `P0-PROOF-008`

### 6. Demo delivery assets are specified but not yet linked to runtime execution

Proof target:
- WhatsApp delivery of the number
- one-page PDF with the exact proof framing
- founder follow-up flow

Current runtime:
- the proof doc specifies the delivery model
- the execution workstream does not yet contain the aligned WhatsApp / PDF delivery artifact set or its linkage back to the live runtime story

Evidence:
- [`04_PROOF_PHASE_DEMO.md`](./04_PROOF_PHASE_DEMO.md)
- [`INDEX.md`](./INDEX.md)

Impact:
- the product demo and the founder delivery layer can drift

Follow-on task:
- `P0-PROOF-009`

## Explicit Non-Goals

These are not part of proof alignment for this workstream:

- rebuilding telephony, audio transport, or realtime voice outside ElevenLabs
- moving Samantha onto Clara's phone number or merging Samantha into the seven-agent phone roster
- adding real CRM, calendar, HR, reporting, or scheduling write access for the proof demo
- introducing direct specialist-to-specialist transfer topology outside the existing Clara-centered flow unless the current topology proves insufficient
- building vertical-specific demo variants before the universal proof demo works
- creating physical demo kits, booth assets, or event hardware for Phase 0

## Exit Condition For Proof Readiness

Do not call the Phase 0 proof demo ready until all of the following are true:

1. the runtime story heard on the phone matches `Schmitt & Partner`
2. one proof-specific seven-agent flow passes as a deliberate demo artifact
3. voice, language-quality, persona, and off-hours checks are documented
4. the delivery assets match the exact live story being demonstrated
