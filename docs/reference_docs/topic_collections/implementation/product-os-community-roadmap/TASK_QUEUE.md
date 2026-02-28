# Product OS Community + Roadmap Task Queue

**Last updated:** 2026-02-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap`  
**Source request:** Make the in-product roadmap real, add user upvoting, ship a PostHog-style community surface, and converge docs entrypoints.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote `PENDING` to `READY` only when every dependency is `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. Before each task execution, list the top 3 runtime or UX regression risks.
6. Run row-level Verify commands exactly as listed before marking `DONE`.
7. Keep lane ownership strict to reduce merge conflicts.
8. If blocked for >15 minutes or after 3 failed attempts, mark `BLOCKED` and continue with the next `READY` row.
9. Sync `INDEX.md`, `MASTER_PLAN.md`, and `TASK_QUEUE.md` after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-I18N` | `npm run i18n:audit` |
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |
| `V-E2E-MOBILE` | `npm run test:e2e:mobile` |
| `V-COMM-LINT` | `npx eslint src/app/page.tsx src/hooks/window-registry.tsx src/components/window-content/all-apps-window.tsx src/components/window-content/feedback-window.tsx src/components/window-content/tutorials-docs-window.tsx convex/feedback.ts convex/layers/layerWorkflowOntology.ts --ext .ts,.tsx` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Baseline audit and UX/data contract freeze | workstream docs + shell/product IA references | No implementation lanes before `ACR-003` is `DONE` |
| `B` | Roadmap/community backend contracts + APIs | `convex/*`; schema + query/mutation layer | Avoid shell/menu/UI edits in lane `B` |
| `C` | Interactive roadmap UX (replace mock) | `src/components/window-content/all-apps-window.tsx`; feedback linkage | Avoid forum/docs shell menu edits in lane `C` |
| `D` | Community hub surfaces (news/forums/events/jobs/places) | top nav + window registry + new community windows | No schema contract changes in lane `D` |
| `E` | Docs IA convergence and community bridge | docs menus + tutorials/docs surfaces | Preserve lane `D` route/window IDs |
| `F` | Moderation, abuse controls, and admin operations | backend permissions + trust/admin UI | Starts after core posting/voting surfaces are stable |
| `G` | Telemetry, flags, and rollout gates | analytics events + rollout docs | Starts only when all `P0` rows are `DONE` or `BLOCKED` |
| `H` | Hardening and closeout | cross-cutting tests + docs sync | Final lane; runs after rollout gates are defined |

---

## Dependency-based status flow

1. Start with lane `A` (`ACR-001`..`ACR-004`).
2. Lane `B` starts after `ACR-003` is `DONE`.
3. Lane `C` starts after `ACR-006` is `DONE`.
4. Lane `D` starts after `ACR-002` and `ACR-007` are `DONE`.
5. Lane `E` starts after `ACR-002` is `DONE`.
6. Lane `F` starts after `ACR-004` and `ACR-007` are `DONE`.
7. Lane `G` starts only when all `P0` rows are `DONE` or `BLOCKED`.
8. Lane `H` starts after `ACR-025` is `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `ACR-001` | `A` | 1 | `P0` | `BLOCKED` | - | Baseline audit of current Product OS roadmap mock, feedback flow, docs entrypoints, and nav/menu IA | `src/components/window-content/all-apps-window.tsx`; `src/components/window-content/feedback-window.tsx`; `src/components/window-content/tutorials-docs-window.tsx`; `src/app/page.tsx`; `src/hooks/window-registry.tsx`; `MASTER_PLAN.md` | `V-DOCS` | Capture concrete before-state evidence and map to target architecture slices. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-002` | `A` | 1 | `P0` | `BLOCKED` | `ACR-001` | Freeze UX contract for top navigation IA (`Product OS`, `Docs`, `Community`, `Company`, `More`) across desktop + mobile shell behavior | `MASTER_PLAN.md`; `src/app/page.tsx`; `src/components/taskbar/top-nav-menu.tsx` | `V-DOCS` | Include window-vs-route launch rules and deterministic menu IDs. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-003` | `A` | 1 | `P0` | `BLOCKED` | `ACR-002` | Freeze canonical data contracts for roadmap ideas, votes, comments, forum threads, replies, and digest cards | `MASTER_PLAN.md`; `convex/schemas/*`; `convex/feedback.ts` | `V-DOCS` | Define immutable identifiers, status enums, and ownership fields before backend implementation. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-004` | `A` | 1 | `P1` | `BLOCKED` | `ACR-003` | Define moderation and trust action matrix (member/mod/admin) with explicit allowed operations | `MASTER_PLAN.md`; moderation docs references | `V-DOCS` | Must include audit logging and escalation semantics. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-005` | `B` | 2 | `P0` | `BLOCKED` | `ACR-003` | Implement schema support for roadmap/community entities and required indexes | `convex/schemas/*`; `convex/_generated/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Prefer additive schema evolution and backward-compatible object typing. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-006` | `B` | 2 | `P0` | `BLOCKED` | `ACR-005` | Ship roadmap APIs: list/create/edit/status, deterministic upvote mutation, and top-voted queries | `convex/feedback.ts`; `convex/layers/layerWorkflowOntology.ts`; new roadmap modules | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-DOCS` | Enforce one vote per user per item and idempotent vote toggles. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-007` | `B` | 2 | `P0` | `BLOCKED` | `ACR-005` | Ship forums APIs: list threads, create question, reply, sort by recency and activity | `convex/*community*`; `convex/http.ts`; new forum modules | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Keep payload contracts deterministic for desktop/mobile clients. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-008` | `B` | 2 | `P1` | `BLOCKED` | `ACR-006`, `ACR-007` | Add ranking jobs for roadmap/community digest (trending + latest) | `convex/*`; scheduler jobs | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Ranking should be deterministic and bounded by org scope. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-009` | `C` | 3 | `P0` | `BLOCKED` | `ACR-006` | Replace static roadmap mock table with live data, status filters, and sort controls | `src/components/window-content/all-apps-window.tsx`; roadmap UI components | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-DOCS` | Remove placeholder copy that says roadmap voting is planned. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-010` | `C` | 3 | `P0` | `BLOCKED` | `ACR-009` | Implement interactive upvote UX (optimistic state, auth guard, duplicate prevention messaging) | `src/components/window-content/all-apps-window.tsx`; vote hooks | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-DOCS` | Include deterministic pass/fail toast states for vote mutation outcomes. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-011` | `C` | 3 | `P1` | `BLOCKED` | `ACR-010` | Convert feature feedback submission path into roadmap idea creation flow with metadata | `src/components/window-content/feedback-window.tsx`; `convex/feedback.ts`; roadmap forms | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-DOCS` | Preserve existing bug/billing feedback categories while upgrading feature flow. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-012` | `C` | 3 | `P1` | `BLOCKED` | `ACR-011` | Add roadmap item detail panel with links to forum discussion and docs references | roadmap detail components; shared link helpers | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Ensure stable deep-link IDs for future sharing. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-013` | `D` | 4 | `P0` | `BLOCKED` | `ACR-002`, `ACR-007` | Add Community menu with deterministic sections: newspaper, forums, events, jobs, places | `src/app/page.tsx`; `src/components/taskbar/top-nav-menu.tsx`; menu translations | `V-TYPE`; `V-LINT`; `V-I18N`; `V-COMM-LINT`; `V-DOCS` | Follow contract from lane `A`; no hidden menu IDs. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-014` | `D` | 4 | `P0` | `BLOCKED` | `ACR-013`, `ACR-008` | Build Community Home window (news digest, latest questions, spotlight cards) | new community window components; registry; shell icons | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-DOCS` | Layout should support desktop split view and mobile full-screen chat-like flow. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-015` | `D` | 4 | `P0` | `BLOCKED` | `ACR-014` | Build Forums window list + ask-question composer with category filters and thread navigation | new forums window components; registry; forum hooks | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-E2E-DESKTOP`; `V-DOCS` | Include deterministic pagination and empty/error states. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-016` | `D` | 4 | `P1` | `BLOCKED` | `ACR-014` | Add Events/Jobs/Places community surfaces and launch placeholders linked to data contracts | community modules + menu actions | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Maintain consistent shell chrome and interaction model. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-017` | `E` | 5 | `P0` | `BLOCKED` | `ACR-002` | Add Docs menu IA and align docs entry points to one canonical docs hub window | `src/app/page.tsx`; `src/hooks/window-registry.tsx`; docs window modules | `V-TYPE`; `V-LINT`; `V-I18N`; `V-COMM-LINT`; `V-DOCS` | Ensure docs entry labels map to existing translation keys or add audited keys. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-018` | `E` | 5 | `P1` | `BLOCKED` | `ACR-017` | Modernize tutorials/docs window surface and add “Ask community question” CTA bridge | `src/components/window-content/tutorials-docs-window.tsx`; related docs components | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-COMM-LINT`; `V-DOCS` | Preserve existing tutorial progress query behavior. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-019` | `E` | 5 | `P1` | `BLOCKED` | `ACR-018`, `ACR-015` | Wire docs-to-forum and docs-to-roadmap actions with prefilled context payloads | docs actions + forum/roadmap connectors | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Ensure deep links are reversible and context-safe. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-020` | `F` | 6 | `P0` | `BLOCKED` | `ACR-004`, `ACR-007` | Enforce moderation permissions + action matrix in backend and operator UI | moderation modules; admin surfaces | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Include explicit allow/deny outcomes for each role/action pair. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-021` | `F` | 6 | `P1` | `BLOCKED` | `ACR-020`, `ACR-010` | Add abuse controls: vote throttling, post rate limits, duplicate thread detection | backend guards + policy helpers | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Keep limits deterministic and environment-configurable. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-022` | `F` | 6 | `P1` | `BLOCKED` | `ACR-020` | Build community operations board for flagged content triage and audit timeline | admin/community ops components | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Must surface moderation decision history by item ID. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-023` | `G` | 7 | `P0` | `BLOCKED` | `ACR-012`, `ACR-015`, `ACR-019` | Implement telemetry taxonomy for roadmap/community/docs conversion funnels | analytics event modules; telemetry docs | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Event names and payloads must be versioned and deterministic. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-024` | `G` | 7 | `P1` | `BLOCKED` | `ACR-023` | Add rollout flags and staged deployment plan (dogfood -> beta -> GA, desktop + mobile) | rollout settings; docs | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Include rollback triggers and owner matrix. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-025` | `G` | 7 | `P1` | `BLOCKED` | `ACR-024` | Publish KPI dashboards + threshold gates for adoption, quality, and moderation latency | telemetry dashboards; `MASTER_PLAN.md` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Define go/no-go thresholds with deterministic pass/fail labels. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-026` | `H` | 8 | `P0` | `BLOCKED` | `ACR-025` | Hardening run: desktop/mobile e2e, i18n, and regression sweeps with fix loop | `tests/e2e/*`; `tests/unit/*`; community/docs windows | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-I18N`; `V-E2E-DESKTOP`; `V-E2E-MOBILE`; `V-DOCS` | Record failures by scenario and attach remediation notes. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `ACR-027` | `H` | 8 | `P1` | `BLOCKED` | `ACR-026` | Final docs sync, launch checklist, and release handoff | `INDEX.md`; `MASTER_PLAN.md`; `TASK_QUEUE.md`; rollout checklist docs | `V-DOCS` | Close only when queue/plan/index reflect final verification evidence. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |

---

## Current kickoff

- Active task: none (rows `ACR-001`..`ACR-027` are `BLOCKED` by `LOC-003`).
- Next promotable task: none while one-of-one pivot lock is active.
- Immediate objective: hold this stream until a cutover queue override is published after `LOC-009` reaches `DONE`.
