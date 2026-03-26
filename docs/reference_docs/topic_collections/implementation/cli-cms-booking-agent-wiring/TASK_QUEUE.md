# SevenLayers CLI Rebuild Task Queue

**Last updated:** 2026-03-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring`  
**Source request:** Rebuild CLI from scratch (using static CLI snapshot as reference), switch brand surface to `sevenlayers` (orange logo), and ship safer integration workflows for app wiring, CMS, booking, and agents.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless explicit lane policy allows concurrency.
3. Promote `PENDING` -> `READY` only when dependencies are satisfied.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If `BLOCKED`, record blocker, owner, and fallback in `Notes`.
6. Every `DONE` row must include evidence from listed verify commands.
7. Keep docs synchronized: `TASK_QUEUE.md`, `MASTER_PLAN.md`, `INDEX.md`, `SESSION_PROMPTS.md`.
8. Non-destructive config contract is mandatory: CLI may only upsert managed keys by default and must never delete unknown `.env*` keys unless explicit destructive flags are provided.
9. Backward compatibility contract: keep `l4yercak3` and `icing` as aliases during migration even if `sevenlayers` is the primary command.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-LINT` | `npm run lint` |
| `V-CLI-BUILD` | `npm --prefix packages/cli run build` |
| `V-CLI-UNIT` | `npm --prefix packages/cli run test` |
| `V-CLI-SMOKE` | `node packages/cli/dist/bin/sevenlayers.js --help` |
| `V-CLI-PACK` | `npm --prefix packages/cli pack --dry-run` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Architecture + non-negotiable safety contracts | workstream docs + RFC notes | No code edits before `SLCLI-001` |
| `B` | Fresh CLI foundation + branding | `packages/cli/*` | Start after lane `A` `P0` is `DONE` |
| `C` | Safe env/file mutation subsystem | CLI config/file writer modules | Start after `SLCLI-002` |
| `D` | Env/org/app targeting guardrails | CLI profile + target guard commands | Start after `SLCLI-002` |
| `E` | App registration/link + legacy command bridge | CLI app + legacy commands | Start after `SLCLI-004` + `SLCLI-006` |
| `F` | CMS + booking command suite | CLI domain commands + minimal backend integration touchpoints | Start after lane `D` `P0` rows are `DONE` |
| `G` | Agent bootstrap/template suite | CLI agent commands + existing bootstrap actions | Start after lane `D` `P0` rows are `DONE` |
| `H` | Release automation + docs/UI rollout | `.github/workflows/*`, `.changeset/*`, web publishing docs UI | Start after `SLCLI-002` and domain `P0` rows |

---

## Dependency-based status flow

1. Lock contracts first (`SLCLI-001`) to prevent repeating destructive design mistakes.
2. Build greenfield CLI shell (`SLCLI-002`) before domain workflows.
3. Land safe env writer (`SLCLI-003`, `SLCLI-004`) before app setup commands.
4. Land targeting guardrails (`SLCLI-005`, `SLCLI-006`) before all mutation-heavy domain commands.
5. Ship domain suites (`F`, `G`) after safety foundations are complete.
6. Release and docs rollout (`H`) after command surface is stable.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `SLCLI-001` | `A` | 1 | `P0` | `DONE` | - | Publish rebuild architecture + safety contract (including non-destructive `.env.local` guarantees and migration policy) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md` | `V-DOCS` | Completed 2026-03-25: contract now explicitly defines safe write modes (`upsert`, `replace-key`, guarded `full-rewrite`) and migration policy. |
| `SLCLI-002` | `B` | 1 | `P0` | `DONE` | `SLCLI-001` | Scaffold new CLI from scratch in `packages/cli` with primary bin `sevenlayers`, orange logo theme, and compatibility bins (`l4yercak3`, `icing`) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/package.json`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/bin/sevenlayers.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/ui/logo.ts` | `V-CLI-BUILD`; `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: fresh `packages/cli` scaffold landed with primary `sevenlayers` bin and orange-branded `sevenlayers` logo; reference snapshot remained read-only. |
| `SLCLI-003` | `C` | 1 | `P0` | `DONE` | `SLCLI-002` | Implement safe env mutation engine with diff preview, backup, and atomic writes | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/config/env-writer.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/config/env-parser.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/config/env-diff.ts` | `V-CLI-UNIT`; `V-CLI-BUILD` | Completed 2026-03-25: non-destructive writer implemented with explicit modes, dry-run support, auto-backup, atomic temp-write+rename, and regression tests preventing unknown-key loss. |
| `SLCLI-004` | `C` | 1 | `P0` | `DONE` | `SLCLI-003` | Integrate safe env engine into `app init/connect` flows and deprecate destructive file writes | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/app/init.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/app/connect.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/legacy/spread.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: `app init`/`app connect` now route through safe writer and legacy `spread` bridge; `--dry-run`, `--backup-path`, `--replace-existing`, and guarded `--full-rewrite` are wired. |
| `SLCLI-005` | `D` | 1 | `P0` | `DONE` | `SLCLI-002` | Add profile model (`local`, `staging`, `prod`) with explicit endpoint/org/app metadata | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/config/profile-store.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/env/*`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/api/client.ts` | `V-CLI-UNIT`; `V-CLI-BUILD` | Completed 2026-03-25: profile store + `env list/use/set` commands landed with default `local/staging/prod` profiles, explicit backend metadata, and no production fallback defaults. |
| `SLCLI-006` | `D` | 1 | `P0` | `DONE` | `SLCLI-005` | Enforce target guardrails for all mutating commands (`env+org+app` tuple, prod confirmations, mismatch fail-close) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/safety/target-guard.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/doctor/target.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: mutating app commands now require resolved target tuple and enforce profile mismatch fail-close + explicit confirmation token for confirm-gated targets. |
| `SLCLI-007` | `E` | 2 | `P0` | `DONE` | `SLCLI-004`, `SLCLI-006` | Build app wiring commands (`app register`, `app link`, `app sync`, `app pages sync`) with JSON output | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/app/register.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/app/link.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/app/pages.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: new app wiring command set landed with deterministic `--json` output, typed backend API usage, and regression tests covering register/link/sync/pages flows. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-008` | `E` | 2 | `P1` | `DONE` | `SLCLI-007` | Add legacy command bridge (`spread`, `connect`, `sync`, `pages`) to new internals with migration messaging | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/legacy/*`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/bin/sevenlayers.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: legacy `sync` and `pages` now route to rebuilt app internals with explicit migration messaging; `spread`/`connect` compatibility preserved. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-009` | `F` | 2 | `P0` | `DONE` | `SLCLI-006` | Implement CMS registry/binding commands (`cms registry pull/push`, `cms bind`) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/registry.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/bind.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: CMS registry pull/push + bind flows landed with deterministic JSON output, app-scoped registry feature metadata wiring, and page binding PATCH integration. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-010` | `F` | 2 | `P1` | `DONE` | `SLCLI-009` | Implement CMS migration/seed/doctor commands (`cms migrate legacy`, `cms seed`, `cms doctor`) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/migrate.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/seed.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/doctor.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: CMS migrate/seed/doctor workflows now support deterministic JSON output, locale + lookup-key parity analysis, and dry-run summaries with explicit apply gates. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-011` | `F` | 2 | `P0` | `DONE` | `SLCLI-006` | Implement booking bootstrap/check commands (`booking setup`, `booking check`) with required entity/env validation | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/booking/setup.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/booking/check.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: booking setup/check now enforce target tuple safety, validate events/products endpoint reachability, and verify required event/product IDs before env mutation. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-012` | `F` | 2 | `P1` | `DONE` | `SLCLI-011` | Implement booking smoke command with default dry-run and explicit prod guard | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/booking/smoke.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/testing/booking-smoke.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: booking smoke command now defaults to dry-run, requires `--execute` for live calls, and blocks prod execution unless `--allow-prod-smoke` is explicitly provided alongside prod confirmation flags. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-013` | `G` | 2 | `P0` | `DONE` | `SLCLI-006` | Implement agent bootstrap commands (`agent init`, `agent template apply`, `agent permissions check`) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/init.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/template.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/permissions.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: agent init/template/permissions command suite now wraps existing Convex bootstrap and patch flows with dry-run defaults, deterministic JSON output, and scoped session/target validation. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-014` | `G` | 2 | `P1` | `DONE` | `SLCLI-013` | Implement agent drift/catalog commands for template governance and CI integration | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/drift.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/catalog.ts` | `V-CLI-UNIT`; `V-CLI-SMOKE` | Completed 2026-03-25: added `agent drift` and `agent catalog` governance command surface with deterministic `--json` payloads, mode-based catalog routing (`rollout`, `lifecycle`, `telemetry`), and runner-injection unit coverage. Verified with `npm --prefix packages/cli run build`, `npm --prefix packages/cli run test`, and `node packages/cli/dist/bin/sevenlayers.js --help`. |
| `SLCLI-015` | `H` | 3 | `P0` | `DONE` | `SLCLI-002` | Add release/publish stack: workspaces + changesets + npm provenance workflows + dist-tag policy | `/Users/foundbrand_001/Development/vc83-com/package.json`; `/Users/foundbrand_001/Development/vc83-com/.changeset/config.json`; `/Users/foundbrand_001/Development/vc83-com/.github/workflows/packages-publish.yml` | `V-DOCS`; `V-TYPE` | Completed 2026-03-25: added workspace-aware release scripts, initialized Changesets config, and created `packages-publish` workflow with canary publish via Changesets + npm provenance and manual `latest` dist-tag promotion flow. Verified with `npm run typecheck` and `npm run docs:guard`. Package naming direction now approved as `@sevenlayers/cli`. |
| `SLCLI-016` | `H` | 3 | `P1` | `DONE` | `SLCLI-015`, `SLCLI-009`, `SLCLI-011`, `SLCLI-013` | Update web publishing CLI guide + rollout docs + alpha/stable cutover plan with rollback runbook | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/web-publishing-window/cli-setup-guide.tsx`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md` | `V-DOCS`; `V-TYPE` | Completed 2026-03-25: replaced legacy install/login/init-only guide with full guarded setup flow (`env set/use`, `doctor target`, app/CMS/booking/agent checks), added alpha->stable cutover steps, preserved compatibility alias guidance (`sevenlayers`, `l4yercak3`, `icing`), and documented dist-tag rollback commands. Verified with `npm run typecheck` and `npm run docs:guard`. |

---

## Current kickoff

- Active task: none.
- Next task to execute: none (workstream complete).
- Immediate objective: monitor canary/stable release operations and collect rollout telemetry for follow-up refinements.
