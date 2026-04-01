# Agentic Knowledge + Compliance Architecture Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture`

---

## Lane gating and concurrency

1. At most one row may be `IN_PROGRESS`.
2. Finish lane `A` before starting lane `B` or lane `C`.
3. Lane `D` requires both `KCA-004` and `KCA-006` as `DONE`.
4. Lane `E` requires all lane `B/C` `P0` rows as `DONE`.
5. Execute every row's `Verify` commands before marking `DONE`.
6. Keep fail-closed defaults and explicit authority boundaries in every change.

---

## Deterministic execution contract

1. Pick `P0` before `P1`.
2. Pick lowest ID among dependency-satisfied rows.
3. Move one row to `IN_PROGRESS`.
4. Implement changes.
5. Run listed `Verify` commands.
6. Mark `DONE` on pass, otherwise `BLOCKED` with mitigation notes.

---

## Current execution snapshot

1. Active row: none.
2. Deterministic next row: none (queue extension complete).
3. Precondition completed for this run: runtime architecture audit enforced registry-only runtime-module discovery path before lane `D` edits.
4. Most recently completed row: `KCA-016` (AVV wizard persistence + outreach/planner metric synchronization).
5. Current extension focus: dual-scope compliance operations (`org mode` + `platform mode`) with fail-closed super-admin authority at tenant org level.
6. Current blocker: none.

---

## Prompt A (Architecture contract)

You are executing lane `A`.

1. Keep edits limited to workstream docs.
2. Finalize current-state map, boundaries, and orchestration recommendation.
3. Keep platform/org/project scope semantics explicit and testable.
4. Run `npm run docs:guard`.

---

## Prompt B (Knowledge system)

You are executing lane `B`.

1. Implement canonical context contracts with provenance and confidence.
2. Separate advisory references from compliance-grade evidence citations.
3. Preserve org isolation in retrieval and indexing paths.
4. Run `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.

---

## Prompt C (Compliance execution model)

You are executing lane `C`.

1. Enforce plan->gate->execute->verify->audit lifecycle.
2. Keep owner/super-admin authority split intact.
3. When implementing platform mode, allow super-admin compliance writes only when target org equals configured platform org; fail-closed otherwise.
4. Ensure high-risk actions remain `owner_only` or `approval_required`.
5. For shadow-mode evaluator work, keep non-compliance paths non-blocking and emit would-block telemetry.
6. Run `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.

---

## Prompt D (UX integration)

You are executing lane `D`.

1. Surface scope, authority, and citation quality in kickoff UX.
2. For Compliance Center scope switch work, keep account-deletion and unrelated tabs unchanged.
3. Prevent implicit cross-scope context escalation.
4. Keep UI deterministic and fail-closed when references are missing/unreadable.
5. Run `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.

---

## Prompt E (Migration and rollout)

You are executing lane `E`.

1. Add regression tests for fail-closed and isolation guarantees.
2. Add telemetry + runbooks for controlled rollout.
3. Do not mark rollout complete without passing validation gates.
4. Run `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`.

---

## Prompt F (Autonomous full-workstream execution)

Use this prompt file when you want one agent to run the full queue autonomously:

- `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/AUTONOMOUS_WORKTREE_PROMPT.md`
