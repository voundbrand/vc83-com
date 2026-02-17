# Project Testing Setup Plan (CI-Compliant)

## Purpose

This document defines the plan to establish a reliable, maintainable testing system for this repository without implementing changes ad hoc.

It is intentionally placed under `docs/reference_docs/topic_collections/implementation/` to comply with docs guard rules that block adding new markdown files at `docs/` root.

## Date

- Baseline captured: 2026-02-17

## Scope

In scope:
- root project test strategy (`package.json`, `vitest.config.ts`, `tests/**`, `src/**`)
- separation of fast local tests vs network-dependent integration tests
- CI test workflow design and rollout
- coverage measurement and ratcheting

Out of scope:
- immediate full test implementation across all domains
- broad refactors unrelated to testability
- affiliate monorepo test standardization (tracked separately)

## Current State Baseline

### Tooling and execution

- Root test runner: Vitest (`package.json` scripts).
- `test:coverage` currently fails because `@vitest/coverage-v8` is missing.
- Root Vitest include is limited to `tests/**/*.test.ts`, so `src/**/__tests__` files are excluded.
- Coverage config targets `convex/**/*.ts` with `all: true` and 80% thresholds.

### Suite behavior

- Root included test files: 12.
- First-party test files across repo: 33.
- Root tests include many network-dependent cases using `ConvexTestingHelper`.
- In local/offline environments, multiple tests time out due to Convex websocket connectivity.
- Fast deterministic tests exist (AI policy/outbound logic) and run quickly.

### CI status

- Current GitHub workflow coverage: docs guard only.
- No active CI workflow gating merges on tests.

## Problem Statement

Current tests mix concerns:
- "unit" tests that require live backend connectivity
- incomplete test discovery (some real tests never run)
- broken coverage command
- no CI enforcement for test quality

This makes confidence low, feedback slow, and regressions easy to merge.

## Target State

### Testing lanes

1. `unit` lane (default, fast, deterministic)
- no network/backend dependency
- runs on every PR
- required status check

2. `integration` lane (backend-connected)
- explicit opt-in locally
- separate CI job (manual/conditional until stabilized)
- isolated from unit gate

3. `component` lane (frontend logic/UI behavior)
- jsdom + Testing Library
- introduced after unit lane is stable

4. `e2e` lane
- Playwright for critical journeys only
- minimal smoke set first

### Coverage policy

- Measure coverage from unit lane only at first.
- Set realistic baseline threshold, then ratchet upward by agreed increments.
- Expand measured include list beyond `convex/**` as unit tests expand.

## CI and Docs Guard Compliance

### Documentation placement rules

- Keep this plan in `docs/reference_docs/` (not `docs/` root).
- Avoid adding non-markdown assets in docs-only zones.
- If future docs must be top-level under `docs/`, they must be added to `docs/.root-md-allowlist.txt`.

### CI rollout rules

- Add test workflow as non-blocking first (observe flake and runtime).
- Promote unit lane to required check only after two consecutive stable weeks.
- Keep integration lane non-blocking until flake rate and runtime are acceptable.

## Implementation Plan (Phased)

### Phase 0 - Plan and ownership (this document)

Deliverables:
- this plan merged in CI-compliant docs location
- explicit owner for each phase
- success metrics agreed

Exit criteria:
- team agrees to lane model and rollout order

### Phase 1 - Stabilize root fast test lane

Goals:
- make default `npm test` reliable and fast
- ensure all intended fast tests are discoverable

Planned changes:
- split root Vitest config into fast/unit profile and integration profile
- update include patterns so fast tests in `src/**/__tests__` can run
- move or mark Convex-dependent tests to integration lane
- keep deterministic setup for unit lane (no live Convex helper initialization)

Proposed commands:
- `npm run test` -> unit lane only
- `npm run test:unit` -> explicit unit lane
- `npm run test:integration` -> Convex-dependent lane only

Success criteria:
- unit lane passes locally without running `npx convex dev`
- unit lane runtime target: <= 60s on CI

### Phase 2 - Restore coverage reporting with honest scope

Goals:
- fix coverage command
- report meaningful numbers from actually reliable tests

Planned changes:
- install coverage provider package for Vitest
- wire coverage to unit lane config
- define initial thresholds based on measured baseline (not aspirational 80% gate immediately)
- publish coverage artifact in CI

Success criteria:
- `npm run test:coverage` succeeds
- coverage report generated in CI on PRs

### Phase 3 - Make integration lane intentional

Goals:
- run backend-connected tests predictably
- remove accidental integration behavior from unit lane

Planned changes:
- tag/naming convention for integration tests (path and/or `*.integration.test.ts`)
- separate integration setup file with Convex URL checks and clear failure messages
- require explicit preconditions in docs:
  - local: `npx convex dev` or defined cloud env
  - CI: dedicated env secrets and connectivity

Success criteria:
- integration failures are attributable to app behavior, not hidden environment setup
- flake rate tracked and trending down

### Phase 4 - Add component tests for critical frontend logic

Goals:
- close current frontend test gap

Priority targets:
- checkout tax breakdown logic + rendering
- permission/state-driven UI guards
- complex input flows that previously regressed

Planned changes:
- establish jsdom test utilities and render helpers
- add initial component suite for 3-5 critical paths

Success criteria:
- component suite runs in unit lane
- at least one regression-prone UI flow covered per critical feature area

### Phase 5 - CI enforcement and ratchet

Goals:
- make tests part of merge quality gates

Planned changes:
- add GitHub Actions workflow for tests
- required check: lint + typecheck + unit tests
- optional/check-run: integration and e2e until stable
- schedule threshold ratchet checkpoints (e.g., every 2 weeks)

Success criteria:
- PRs blocked on failing unit lane
- integration lane produces actionable signal without blocking delivery

## Work Breakdown Checklist

### Workstream A: Configuration and scripts

- [ ] define lane configs (`vitest.unit.config.ts`, `vitest.integration.config.ts` or equivalent)
- [ ] align `package.json` scripts with lane model
- [ ] ensure root include patterns match intended test locations

### Workstream B: Test classification

- [ ] inventory root tests into unit vs integration categories
- [ ] move/rename ambiguous tests to lane-appropriate paths
- [ ] document naming conventions for new tests

### Workstream C: Coverage

- [ ] install and configure coverage provider
- [ ] capture initial baseline report
- [ ] set ratchet policy and ownership

### Workstream D: CI pipeline

- [ ] create `test.yml` workflow
- [ ] wire caching and parallel jobs
- [ ] mark only stable jobs as required

### Workstream E: Documentation and onboarding

- [ ] update `tests/README.md` to reflect lane model
- [ ] add quickstart commands by scenario (local dev, PR validation, integration debugging)
- [ ] add troubleshooting section for Convex connectivity

## Metrics and Targets

Initial targets:
- unit lane pass rate: >= 99% on main
- integration lane flaky failure rate: < 5% before making blocking
- median unit lane runtime: <= 60s CI
- coverage: establish baseline first, then +5 percentage points per ratchet cycle

## Risks and Mitigations

1. Risk: false confidence from excluding too much in unit lane.
Mitigation: maintain explicit integration suite and track coverage of critical flows.

2. Risk: integration lane remains flaky due to external dependencies.
Mitigation: isolate environment setup, add retries only where justified, instrument failure causes.

3. Risk: coverage thresholds block delivery too early.
Mitigation: baseline-first ratchet policy with agreed increments.

4. Risk: docs drift from implementation.
Mitigation: update this plan and `tests/README.md` in same PRs that change testing architecture.

## Decision Log

1. Separate lanes before increasing test volume.
2. Gate merges on stable unit lane first.
3. Treat integration/e2e as signal lanes until stability is proven.
4. Keep planning docs in `docs/reference_docs/` to satisfy docs guard constraints.

## Next Action (First Execution PR)

When execution starts, first PR should only do:
- lane config split
- script alignment
- coverage provider install
- test docs update

No large test rewrites in that first PR.

This keeps blast radius low and gives immediate visibility into baseline quality.
