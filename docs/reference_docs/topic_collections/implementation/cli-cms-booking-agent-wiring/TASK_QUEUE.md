# CLI + CMS/Booking/Agent Wiring Task Queue

**Last updated:** 2026-03-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring`  
**Source request:** Start a strategic + implementation track for production CLI ownership and end-to-end CMS/app wiring, booking setup, and agent bootstrap.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane gating explicitly allows parallelism.
3. Promote `PENDING` -> `READY` only when all dependencies are `DONE` (or explicitly marked `@READY`).
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If `BLOCKED`, document blocker, owner, and fallback in `Notes`.
6. Every task must run every listed verify command before moving to `DONE`.
7. Keep lane boundaries strict to minimize merge collisions across CLI/runtime/CI/docs edits.
8. Keep `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` synchronized at lane milestones.
9. Backward compatibility rule: preserve existing `l4yercak3`/`icing` command behavior where practical; any break requires migration notes.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-CLI-BUILD` | `npm --prefix packages/cli run build` |
| `V-CLI-UNIT` | `npm --prefix packages/cli run test` |
| `V-CLI-SMOKE` | `node packages/cli/dist/bin/l4yercak3.js --help` |
| `V-CLI-PACK` | `npm --prefix packages/cli pack --dry-run` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Production CLI package extraction + runtime core | `packages/cli/*`; `packages/cli-core/*` | No CI/release edits until lane `A` `P0` is `DONE` |
| `B` | npm publishing, versioning, release automation, rollback | `.github/workflows/*`; `.changeset/*`; root `package.json` | Start after `CLI-002` |
| `C` | Environment/org/app safety rails and fail-closed targeting | CLI config/profile modules + auth/preflight flows | Start after `CLI-002` |
| `D` | CMS binding commands and registry lifecycle | CLI `cms/*` commands; Convex bindings touched only where needed | Start after `CLI-007` |
| `E` | Booking bootstrap, doctor checks, smoke tests | CLI `booking/*` commands + booking helper contracts | Start after `CLI-007` |
| `F` | Agent bootstrap/templates/permissions commands | CLI `agent/*` commands + agent bootstrap wrappers | Start after `CLI-007` |
| `G` | Rollout/docs/UI guidance + release cutover | Web publishing CLI docs and release notes | Start after `B` + `D/E/F` `P0` rows |

---

## Dependency-based status flow

1. Lane `A` establishes package ownership and compatibility baseline (`CLI-001`..`CLI-003`).
2. Lane `B` starts after `CLI-002` to avoid automating release of unstable runtime boundaries.
3. Lane `C` starts after `CLI-002` and gates all domain commands (`cms`, `booking`, `agent`).
4. Lanes `D`, `E`, and `F` start only after safety rails (`CLI-007`) are complete.
5. Lane `G` closes with alpha rollout first, then stable cutover after migration docs and smoke evidence.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `CLI-001` | `A` | 1 | `P0` | `READY` | - | Create production CLI package skeleton in `packages/` and port command/runtime modules from snapshot (`docs/reference_projects/l4yercak3-cli`) into repo-owned source tree | `/Users/foundbrand_001/Development/vc83-com/packages/cli/package.json`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/bin/l4yercak3.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/*` | `npm --prefix packages/cli run build`; `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js --help` | Preserve `l4yercak3` + `icing` bin names; keep `init` alias to avoid breaking existing setup docs. |
| `CLI-002` | `A` | 1 | `P0` | `PENDING` | `CLI-001` | Replace hardcoded backend/app URLs with explicit profile model (`local`, `staging`, `prod`) and persistent active-target metadata | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/config/profile-store.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/api/client.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/env/*.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js env list` | Fail closed when no active profile is selected; require explicit opt-in for `prod` writes. |
| `CLI-003` | `A` | 1 | `P0` | `PENDING` | `CLI-001` | Add command router with stable top-level groups (`auth`, `app`, `cms`, `booking`, `agent`, `env`, `doctor`) and legacy command shims (`spread`, `connect`, `sync`, `pages`) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/bin/l4yercak3.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/legacy/*`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/index.ts` | `npm --prefix packages/cli run build`; `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js spread --help` | Legacy shims print migration hints but keep behavior intact during transition window. |
| `CLI-004` | `B` | 1 | `P0` | `PENDING` | `CLI-002` | Introduce workspace-aware release metadata for publishable packages (`cli`, `sdk`, `cms`) using changesets | `/Users/foundbrand_001/Development/vc83-com/package.json`; `/Users/foundbrand_001/Development/vc83-com/.changeset/config.json`; `/Users/foundbrand_001/Development/vc83-com/.changeset/README.md` | `npm run typecheck`; `npm run docs:guard` | Inferred assumption: repo will adopt npm workspaces for package release orchestration. |
| `CLI-005` | `B` | 1 | `P0` | `PENDING` | `CLI-004` | Add CI publish workflow using npm provenance + dist-tags (`canary`, `latest`) and manual promotion gates | `/Users/foundbrand_001/Development/vc83-com/.github/workflows/packages-publish.yml`; `/Users/foundbrand_001/Development/vc83-com/.github/workflows/packages-release-pr.yml` | `npm run docs:guard` | Use GitHub OIDC (`id-token: write`) with `npm publish --provenance`; avoid local manual publish path. |
| `CLI-006` | `B` | 2 | `P1` | `PENDING` | `CLI-005` | Document rollback and incident procedure (`dist-tag` rollback, patch hotfix, revoke token, invalidate compromised release) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md` | `npm run docs:guard` | Include exact operator commands for rollback under time pressure. |
| `CLI-007` | `C` | 1 | `P0` | `PENDING` | `CLI-002`, `CLI-003` | Implement org/app/env safety rails (interactive confirm for prod mutations, `--org`/`--app` mismatch detection, `--dry-run` default for destructive operations) | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/safety/target-guard.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/env/use.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/app/use.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js doctor target` | No mutation command may run when profile/org/app context is ambiguous. |
| `CLI-008` | `D` | 2 | `P0` | `PENDING` | `CLI-007` | Add CMS registry commands: pull/push registry definitions, bind registry to app metadata, and run scoped key migrations | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/registry-sync.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/bind.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/migrate.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js cms registry sync --dry-run` | Reuse existing scoped naming contract from `convex/publishingOntology.ts` (`app_<id>__...`). |
| `CLI-009` | `D` | 2 | `P1` | `PENDING` | `CLI-008` | Add CMS seed and validation helpers (`cms seed`, `cms doctor`) with locale/field parity checks for app registries | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/seed.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/cms/doctor.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/segelschule-altwarp/lib/cms-seed.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js cms doctor --env staging` | Ensure CLI can check and optionally run existing seed logic safely by environment. |
| `CLI-010` | `E` | 2 | `P0` | `PENDING` | `CLI-007` | Add booking bootstrap command to validate required entities/env and provision minimum booking setup contract for an app | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/booking/setup.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/booking/check.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/bookingOntology.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js booking check --env staging --json` | Required checks include booking configuration, contact linkage path, email/send dependencies, and endpoint reachability. |
| `CLI-011` | `E` | 2 | `P1` | `PENDING` | `CLI-010` | Add booking smoke runner to execute deterministic happy-path create/check/cancel lifecycle in staging | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/booking/smoke.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/testing/booking-smoke.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js booking smoke --env staging --dry-run` | Must never run against `prod` without explicit `--allow-prod-smoke` confirmation token. |
| `CLI-012` | `F` | 2 | `P0` | `PENDING` | `CLI-007` | Add agent bootstrap command family (`agent init`, `agent template apply`, `agent permissions check`) with org/app scoping | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/init.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/template.ts`; `/Users/foundbrand_001/Development/vc83-com/scripts/agent-cli.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js agent init --env staging --dry-run` | Wrap existing `soulGenerator.bootstrapAgent` behavior with non-interactive flags and JSON output mode. |
| `CLI-013` | `F` | 3 | `P1` | `PENDING` | `CLI-012` | Add agent template catalog export/import and drift checks between desired template and org runtime | `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/catalog.ts`; `/Users/foundbrand_001/Development/vc83-com/packages/cli/src/commands/agent/drift.ts` | `npm --prefix packages/cli run test`; `node packages/cli/dist/bin/l4yercak3.js agent drift --env staging --json` | Drift output should be machine-readable for CI or release gates. |
| `CLI-014` | `G` | 3 | `P0` | `PENDING` | `CLI-008`, `CLI-010`, `CLI-012` | Update Web Publishing CLI guidance to show current command flow for app connect, CMS bind, booking check, and agent bootstrap | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/web-publishing-window/cli-setup-guide.tsx`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md` | `npm run typecheck`; `npm run docs:guard` | Replace old 3-step copy with environment-safe command sequences and links to docs. |
| `CLI-015` | `G` | 3 | `P1` | `PENDING` | `CLI-005`, `CLI-014` | Cut first production alpha release and run internal dogfood in staging orgs before stable cutover | `/Users/foundbrand_001/Development/vc83-com/packages/cli/package.json`; `/Users/foundbrand_001/Development/vc83-com/.changeset/*`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md` | `npm --prefix packages/cli pack --dry-run`; `npm run docs:guard` | Release target: `@l4yercak3/cli@2.0.0-alpha.0`; collect structured feedback and failure telemetry. |
| `CLI-016` | `G` | 3 | `P1` | `PENDING` | `CLI-015`, `CLI-006` | Stable release cutover + deprecation notice for legacy command surface and manual scripts | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md` | `npm run docs:guard` | Include date-bound deprecation policy and rollback trigger thresholds. |

---

## Current kickoff

- Active task: none.
- Next task to execute: `CLI-001`.
- Immediate objective: bring CLI ownership into `packages/cli` with compatibility shims and testable build output.
