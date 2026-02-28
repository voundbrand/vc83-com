# Implementation Roadmap

**Status:** Draft complete; `AGP-010` roadmap deliverable complete  
**Last updated:** 2026-02-25

Goal: move from completed book content to deployable 104-agent template coverage without rebuilding already shipped platform infrastructure.

Core dependency note:
This roadmap is downstream of one-agent runtime contracts owned in
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/`.

Operational tracker:

1. Use `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_OVERVIEW.md` as the live "what is done vs pending" board.
2. Treat this roadmap as sequencing/gates, not row-level completion truth.

Current dependency snapshot (2026-02-25):

1. `AGP-004`, `AGP-006`, `AGP-012`, `AGP-007`, and `AGP-008` are `DONE`.
2. `AGP-010` dependency token `YAI-010@READY` is now satisfied.
3. `YAI-010` is `DONE` in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`.

---

## Phase 1 (Weeks 1-4): Core Specialists Live

Outcome:

1. six core specialist templates ship as protected cloneable templates,
2. onboarding flow supports template clone + business-context customization path,
3. one-agent-first specialist access defaults (`invisible`) are documented.

Primary tasks:

1. Complete D1 core catalog contract verification.
2. Complete D2 core tool assignments and any P1 gap tools.
3. Complete PRD v1.3 alignment lane for D1/D2 (`AGP-012`).
4. Complete D3 full seeds for #1-#6.
5. Wire seed ingestion path for core template rollouts.

Gate:

1. docs and seed contract checks pass,
2. no trust or approval boundary regressions (`ATX` trust controls stay unchanged),
3. `YAI-003` and `YAI-005` are at least `READY`.

Status:

1. Complete (`AGP-003`, `AGP-005`, `AGP-012`, `AGP-007`, `AGP-009` done).

---

## Phase 2 (Weeks 5-10): First Verticals (Legal + Trades + E-Commerce)

Outcome:

1. first 42 industry agents available as templates,
2. vertical profile contracts validated in high-complexity and high-volume domains.

Primary tasks:

1. Complete D1 rows for #7-#20, #77-#90, #91-#104.
2. Finalize legal/trades/ecommerce tool profiles and top-priority tool gaps.
3. Publish skeleton-to-production soul build path for missing personality files.

Gate:

1. conformance and trust gates from existing contracts stay green (`BMF` model conformance + `ATX` trust governance),
2. high-risk tool mutations remain approval-gated,
3. specialist access-mode contracts remain one-agent-default safe.

Status:

1. Complete for docs contract scope (`AGP-004`, `AGP-006`, `AGP-008` done).

---

## Phase 3 (Weeks 11-18): Remaining Verticals (Finance + Health + Coaching + Agencies)

Outcome:

1. full 104 template coverage,
2. completed vertical profile matrix and per-agent tool mapping.

Primary tasks:

1. Complete D1 rows for #21-#34, #35-#48, #49-#62, #63-#76.
2. Complete D2 gap matrix and remaining profile/tool rollouts.
3. Complete D3 skeleton coverage and seed-wiring notes for full rollout.

Gate:

1. release reductions (`proceed`/`hold`/`rollback`) remain deterministic (`ACE` release contracts),
2. no unresolved trust-event or approval-policy drift,
3. personal-operator template ownership gate remains satisfied (`PLO-010` done before AGP seed-wiring closeout).

Status:

1. Complete for docs contract scope.

---

## Phase 4 (Weeks 19-26): Evolution, Quality, Marketplace Readiness

Outcome:

1. soul evolution quality scoring and benchmark cadence are live,
2. marketplace/library operations are documented with rollout/rollback runbooks.

Primary tasks:

1. Publish final D4 operational runbook and governance cadence.
2. Run comparative quality benchmarks across core and industry templates.
3. Lock team orchestration conventions for multi-agent deployments.
4. Keep cross-workstream blocked-by register current for unresolved runtime gates.

Gate:

1. all deliverable docs synchronized and docs CI green (`npm run docs:guard`),
2. unresolved external runtime risks explicitly tracked and mitigated,
3. `YAI-010` privacy/quality baseline at least `READY` before AGP lane `E` queue closure and any broad GA positioning.

Status:

1. Draft published and synchronized with queue-gate contracts.
2. `AGP-010` done-gate is satisfied; remaining lane-`E` closure is `AGP-011`.

---

## External rollout risk dependencies

These are blockers for broad production confidence and must remain visible in queue/docs notes:

1. `OCG-004` currently `BLOCKED`.
2. `OCC-008` through `OCC-013` are still open.
3. `OBS` release gate remains `FAILED` due desktop e2e deep-link regressions.
4. `YAI` downstream lanes remain in progress, but required AGP dependency gate is satisfied (`YAI-010` is `DONE`).

Policy:

1. Do not claim broad GA readiness for 104-agent rollout until these gates clear or are explicitly waived with owner sign-off.
2. Keep blocked-by references synchronized between this file and AGP/TSR queue notes.
