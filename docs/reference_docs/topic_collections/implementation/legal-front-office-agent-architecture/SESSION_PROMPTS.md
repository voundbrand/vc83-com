# Legal Front Office Agent Architecture Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture`

Read before execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/INDEX.md`

---

## Lane gating and concurrency

1. At most one row may be `IN_PROGRESS`.
2. Complete lane `A` before lane `B` or lane `C` starts.
3. Lane `D` starts only after `LFA-004` and `LFA-006` are `DONE`.
4. Lane `E` starts only after lane `B/C` P0 rows are `DONE`.
5. Run row `Verify` commands exactly before marking `DONE`.
6. Keep fail-closed compliance, authority, and org-isolation semantics intact.

---

## Deterministic execution contract

1. Pick `P0` before `P1`.
2. Pick lowest lexical ID among dependency-satisfied rows.
3. Move selected row to `IN_PROGRESS`.
4. Implement scoped changes.
5. Run listed verify commands exactly.
6. Mark `DONE` on pass, or `BLOCKED` with evidence, mitigation, and dependency impact.
7. Synchronize `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, and `SESSION_PROMPTS.md` on every state transition.

---

## Current execution snapshot

1. Active row: none.
2. Deterministic next row: `LFA-001`.
3. Queue status: ready for deterministic execution.

---

## Prompt A (Architecture contracts and docs)

You are executing lane `A`.

1. Lock canonical architecture docs to explicit role separation (`Clara`, `Helena`, `Compliance Evaluator`, `Quinn onboarding`).
2. Keep edits focused on architecture source-of-truth docs.
3. Ensure no ambiguous topology wording remains.
4. Run `npm run docs:guard`.

---

## Prompt B (Runtime modules and topology declarations)

You are executing lane `B`.

1. Add explicit topology declaration contracts for seeded templates.
2. Extract Quinn onboarding runtime module with no behavior change.
3. Add Helena runtime module scaffold with deterministic manifest boundaries.
4. Register modules and keep runtime selection deterministic.
5. Run row verify commands exactly (`typecheck`, targeted unit tests, `docs:guard`).

---

## Prompt C (Legal runtime flow)

You are executing lane `C`.

1. Implement strict structured handoff packet from Clara to Helena.
2. Enforce compliance evaluator gate before outward commitments.
3. Preserve fail-closed behavior when compliance posture blocks.
4. Keep auditability and org isolation explicit.
5. Run row verify commands exactly.

---

## Prompt D (ElevenLabs roster governance)

You are executing lane `D`.

1. Add lifecycle governance (`active`/`inactive`) for roster control.
2. Preserve inactive specialist assets, do not delete them.
3. Keep Veronica boundary explicit and non-ambiguous.
4. Run row verify commands exactly.

---

## Prompt E (Synthetic data and validation)

You are executing lane `E`.

1. Build synthetic legal-org fixture package for repeatable tests.
2. Add legal-path regression matrix for Clara -> Helena -> Compliance critical flow.
3. Keep verification evidence in workstream docs.
4. Run row verify commands exactly.

---

## Prompt F (Autonomous full-queue mode)

Use this workstream when running full deterministic execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/TASK_QUEUE.md`
