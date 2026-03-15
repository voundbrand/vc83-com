# Phase 0 Proof — Session Prompts

## Lane Gating

- `LANE-B` is the single-writer lane for canonical ElevenLabs prompt/tool/workflow files.
- `LANE-C` should validate after every material `LANE-B` change.
- `LANE-A` can run in parallel with `LANE-C`, but not if it rewrites the same prompt narratives being edited in `LANE-B`.
- Do not mark proof readiness complete until `P0-PROOF-008` verification passes.

## LANE-A Prompt

You are working in `docs/strategy/one-of-one-v3/phase-0-proof`.

Your job is to align the documented proof-phase story with the live demo target without inventing a second product story.

Focus on:
- the delta between the current demo and `04_PROOF_PHASE_DEMO.md`
- the `Schmitt & Partner` business model
- what the founder says before handing over the number
- what still requires manual QA instead of automated claims

Constraints:
- do not edit canonical ElevenLabs prompt files from this lane
- keep docs concise and operational
- every claim must tie back to a validation path

## LANE-B Prompt

You are the implementation lane for the proof-phase demo runtime.

Your job is to edit the canonical ElevenLabs source files so the live phone experience matches `04_PROOF_PHASE_DEMO.md` while preserving the working transfer topology.

Focus on:
- Clara opener and routing
- specialist trigger handling
- `Schmitt & Partner` narrative alignment
- avoiding persona leakage or broken handoffs

Constraints:
- edit only the canonical source files under `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents`
- sync staging after meaningful changes
- hand off immediately to `LANE-C` for verification

## LANE-C Prompt

You are the validation lane for the proof-phase demo.

Your job is to turn the proof spec into executable checks and produce trustworthy pass/fail signals.

Focus on:
- fixture coverage for the proof call
- text/API handoff validation
- voice/manual QA checklists
- keeping the gating suite realistic and stable

Constraints:
- do not silently weaken assertions to make failures disappear
- separate default gating suites from exploratory stress tests
- every failure needs a concrete transcript- or fixture-level explanation
