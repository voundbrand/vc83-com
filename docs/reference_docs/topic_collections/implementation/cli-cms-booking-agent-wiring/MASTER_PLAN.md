# SevenLayers CLI Rebuild Master Plan

**Date:** 2026-03-24  
**Scope:** Rebuild the CLI from scratch (reference-only reuse from static CLI snapshot), adopt `sevenlayers` branding, and ship safe production workflows for app wiring, CMS, booking, and agent setup.

---

## Mission

Ship a production CLI that is safer and clearer than the prior generation.

Required outcomes:

1. Fresh implementation in `packages/cli` (no runtime dependency on docs snapshot code).
2. Primary command: `sevenlayers`, with legacy aliases preserved during migration.
3. Non-destructive `.env*` handling by default.
4. Explicit target guardrails for every mutating operation.
5. Domain commands for app wiring, CMS, booking, and agent setup.
6. Release workflow with provenance, versioning discipline, and rollback playbook.

---

## Design principles (non-negotiable)

1. Fail closed: ambiguous target context must stop execution.
2. No silent destructive file writes: default mode is additive/upsert only.
3. Human review first: mutation commands support `--dry-run` and diff previews.
4. Deterministic command output: support JSON mode for CI/automation.
5. Backward compatibility with controlled migration: keep legacy aliases while steering to new namespace.

---

## Current state in this codebase

### Verified existing assets

1. Static CLI reference exists in `docs/reference_projects/l4yercak3-cli`.
2. Platform already supports app-scoped CMS copy registry and migration contracts in Convex.
3. Booking APIs and flows already exist in app + Convex runtime.
4. Agent bootstrap actions already exist and are script-consumable.
5. Existing package namespace has publishable packages under `packages/sdk` and `packages/cms`.

### Verified gaps

1. This workstream's implementation scope is complete (`SLCLI-001` through `SLCLI-016`).
2. Remaining effort is operational follow-through (canary/stable execution telemetry and incremental UX refinements as needed).

### Verified risk from previous behavior

1. Prior CLI behavior could fully rewrite `.env.local`, which is unacceptable for production operations.
2. Snapshot includes hardcoded production URL defaults and therefore weak targeting safety.

### Progress checkpoint (2026-03-25)

1. `SLCLI-001` completed: architecture and safety contracts are locked in queue/plan docs.
2. `SLCLI-002` completed: `packages/cli` scaffolded from scratch with `sevenlayers` primary bin + compatibility aliases.
3. `SLCLI-003` completed: safe env mutation subsystem implemented with dry-run, backup, and atomic write behavior.
4. `SLCLI-004` completed: app init/connect and legacy spread/connect paths now use safe env writer (no destructive default rewrite).
5. `SLCLI-005` completed: profile model shipped with `env list/use/set` command surface and explicit profile metadata.
6. `SLCLI-006` completed: target guardrails enforced for mutating app commands, including profile mismatch fail-close and confirm-gated target protection.
7. `SLCLI-007` completed: app wiring suite shipped (`app register`, `app link`, `app sync`, `app pages sync`) with deterministic JSON output and unit coverage.
8. `SLCLI-008` completed: legacy bridges (`spread`, `connect`, `sync`, `pages`) now route through rebuilt command internals with migration-safe messaging.
9. `SLCLI-009` completed: CMS registry pull/push + bind commands shipped with app-scoped registry metadata wiring and page binding updates.
10. `SLCLI-010` completed: CMS migrate/seed/doctor suite shipped with locale + field parity diagnostics and dry-run/apply workflow gates.
11. `SLCLI-011` completed: booking setup/check commands shipped with endpoint reachability checks and required event/product validation before mutation.
12. `SLCLI-012` completed: booking smoke command shipped with dry-run default and explicit `--allow-prod-smoke` production gate.
13. `SLCLI-013` completed: agent init/template/permissions commands shipped with scoped non-interactive wrappers around existing Convex bootstrap and patch flows.
14. `SLCLI-014` completed: agent drift/catalog governance commands shipped with deterministic `--json` outputs for CI, covering drift reports plus rollout/lifecycle/telemetry catalog modes.
15. `SLCLI-015` completed: release foundation landed with root npm workspaces, Changesets configuration, and a `packages-publish` GitHub workflow using npm provenance for canary publish plus manual `latest` dist-tag promotion.
16. `SLCLI-016` completed: Web Publishing CLI setup guide and docs now cover full guarded setup workflows plus explicit alpha/stable cutover and dist-tag rollback runbook commands.

---

## Naming and migration strategy

1. Primary binary name: `sevenlayers`.
2. Compatibility binaries: `l4yercak3`, `icing` (same executable target during migration window).
3. Package naming decision:
   - Approved direction: publish CLI as `@sevenlayers/cli`.
   - Keep binary compatibility aliases (`l4yercak3`, `icing`) during migration.
4. Branding update:
   - Replace old logo text with `sevenlayers`.
   - Keep style family but use orange palette.

---

## Target architecture

### Package layout

1. `packages/cli`
   - Commander entrypoint, command registration, terminal UX, logo.
2. `packages/cli-core` (or internal `src/core/*` if kept single-package initially)
   - API client, profile/target resolution, safety guards, env writer.
3. Optional `packages/cli-contracts`
   - shared zod/json-schema for deterministic machine output.

### Command groups

1. `auth`: login/logout/status.
2. `env`: profile management (`local`, `staging`, `prod`).
3. `app`: register/link/sync/pages.
4. `cms`: registry/bind/migrate/seed/doctor.
5. `booking`: setup/check/smoke.
6. `agent`: init/template/permissions/drift.
7. `doctor`: global and target diagnostics.
8. `legacy`: `spread`, `connect`, `sync`, `pages` wrappers.

---

## Safe env write subsystem

### Required behaviors

1. Parse and preserve existing `.env*` structure (comments and unknown keys retained where feasible).
2. Default write mode: `upsert-managed-keys` only.
3. Existing keys changed only when explicitly allowed (`--replace-key` or confirmation step).
4. Full rewrite only with explicit destructive flag (`--allow-full-rewrite`) and warning confirmation.
5. Always support:
   - `--dry-run` (show diff only),
   - backup generation (`.bak` or custom path),
   - atomic write (temp file + rename).

### Anti-regression contract

1. Unknown keys must never be removed in default mode.
2. A unit test suite must cover non-destructive behavior before release.

---

## Environment/org/app targeting model

1. Profile records include endpoint + default org/app metadata.
2. Mutating commands require resolved tuple `(env, orgId, appId)`.
3. `prod` requires explicit confirmation token/phrase.
4. Conflicts between CLI flags, saved profile, and discovered app metadata fail closed.
5. Every mutating command supports structured preflight output in `--json` mode.

---

## Domain strategy

### App wiring

1. Rebuild register/connect/sync/pages on clean command internals.
2. Keep compatibility wrappers for previous command names.

### CMS

1. Implement commands aligned with existing backend contracts for scoped registry binding and legacy migration.
2. Add doctor + seed commands for locale/field parity.

### Booking

1. Add setup/check commands validating required entities and env contracts.
2. Add smoke command with non-prod default and explicit prod override gate.

### Agent

1. Wrap existing bootstrap/template permission flows in stable commands.
2. Add drift checks for governance and CI safety.

---

## Release and publishing design

1. Add workspace-aware release management (changesets).
2. Publish via GitHub Actions with npm provenance.
3. Use dist-tags for staged rollout (`canary`, `latest`).
4. Publish rollback runbook with exact dist-tag and patch/hotfix actions.

---

## Phased plan and acceptance criteria

### Phase 0 (Safety + Foundation)

Scope: `SLCLI-001` to `SLCLI-006`.

Acceptance:

1. CLI skeleton builds and runs as `sevenlayers`.
2. Non-destructive env writer is implemented and tested.
3. Target guardrails are mandatory for mutating commands.

### Phase 1 (Operational command suites)

Scope: `SLCLI-007` to `SLCLI-014`.

Acceptance:

1. App wiring commands operational with JSON output.
2. CMS commands support bind/migrate/seed/doctor safely.
3. Booking commands support setup/check/smoke with prod guards.
4. Agent commands support bootstrap/template/permissions/drift.

### Phase 2 (Release + rollout)

Scope: `SLCLI-015` to `SLCLI-016`.

Acceptance:

1. Automated publish flow with provenance is active.
2. Web publishing UI/docs are updated to new command surface.
3. Alpha rollout completes with rollback criteria documented.

---

## Risks and mitigations

1. Risk: brand/package rename creates install confusion.
   - Mitigation: keep alias bins and phased package migration strategy.
2. Risk: env safety regressions recur.
   - Mitigation: non-destructive contract tests are release blockers.
3. Risk: production targeting mistakes.
   - Mitigation: required target tuple + prod confirmation + dry-run defaults.
4. Risk: scope creep across domains.
   - Mitigation: queue lane boundaries and strict `P0`/`P1` ordering.

---

## Immediate execution recommendation

Phase complete: continue with release operations and monitor canary/stable adoption telemetry.
