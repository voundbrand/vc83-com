# Phase 0 Proof — Master Plan

## Objective

Turn the current landing-demo phone runtime into the exact proof-phase demo described in `04_PROOF_PHASE_DEMO.md`, without losing the staging sync harness or the passing handoff topology.

## What Is Already True

- The repo is the source of truth for managed ElevenLabs prompts, tools, and Clara workflow.
- Staging sync is scripted and verifiable.
- The `all-handoffs` suite passes and covers the practical specialist routing graph.

## What Is Not Yet True

- The proof doc expects a single seven-agent showcase call as the product moment, and that flow is not yet a proof-gated artifact.
- The quality gate in the proof doc includes native German quality, 10+ persona coverage, 50+ test calls, and 24/7 reliability that are not yet fully validated by the current harness.

## Milestones

### Milestone 1 — Proof Delta Frozen

Output:
- one explicit delta list between current runtime and proof spec
- task ordering agreed in queue

Done when:
- `P0-PROOF-001` is complete and `RUNTIME_GAP_AUDIT.md` is the frozen baseline

### Milestone 2 — Narrative and Runtime Alignment

Output:
- `Schmitt & Partner` reflected in the live demo narrative
- Clara and specialist prompts tuned to the proof triggers

Done when:
- `P0-PROOF-002`, `P0-PROOF-003`, and `P0-PROOF-004` are complete

### Milestone 3 — Proof Validation Layer

Output:
- proof-specific fixture suite
- clear distinction between gating and stress tests
- manual voice QA path
- explicit German-language and persona matrix
- explicit 50+ call and off-hours soak gate

Done when:
- `P0-PROOF-005`, `P0-PROOF-006`, `P0-PROOF-007`, and `P0-PROOF-008` are complete

### Milestone 4 — Publish Readiness

Output:
- one yes/no readiness answer for the Phase 0 proof demo

Done when:
- `P0-PROOF-010` is complete

## Risks

- Prompt rewrites can accidentally regress working handoffs.
- A single long seven-agent call may be less stable than the practical handoff battery.
- Text/API passing does not guarantee voice quality, dialect handling, or off-hours reliability.
- Demo-business narrative drift can create a mismatch between sales docs and live experience.

## Decision Rule

Do not declare the proof-phase demo complete until both are true:

1. the runtime matches the proof-story the founder tells, and
2. the validation layer covers both routing correctness and live-call quality expectations.
