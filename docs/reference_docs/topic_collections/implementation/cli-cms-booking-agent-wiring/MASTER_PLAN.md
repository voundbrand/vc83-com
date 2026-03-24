# CLI + CMS/Booking/Agent Wiring Master Plan

**Date:** 2026-03-24  
**Scope:** Define and implement a production CLI in this repo with safe environment targeting and first-class workflows for app linking, CMS binding, booking setup, and agent bootstrap.

---

## Mission

Ship a production-grade CLI package owned in `packages/` that is safe by default and operationally complete for web publishing, CMS, booking, and agents.

Definition of done:

1. CLI source is repo-owned and publishable (`packages/cli`).
2. Release flow is automated, reproducible, and rollback-capable.
3. Every mutation command is fail-closed on org/app/env targeting.
4. CMS, booking, and agent setup can be executed through deterministic CLI commands with machine-readable output.

---

## Current state in this codebase

### What exists

1. Snapshot CLI implementation with useful command primitives lives in local-only reference docs (`docs/reference_projects/l4yercak3-cli`).
2. Snapshot already includes auth, app connect, manifest sync, and page detection/sync commands.
3. Backend/UI already support app-scoped CMS copy registries and legacy-to-scoped migration paths.
4. Booking runtime and endpoints exist in Convex/app code and are suitable for CLI health checks + bootstrap contracts.
5. Agent bootstrap logic exists via script + Convex action and can be wrapped by a production CLI command surface.

### What is missing

1. No production CLI package under `packages/`.
2. No workspace-level package release orchestration for `cli` + `sdk` + `cms`.
3. No npm publish workflow with provenance.
4. No explicit local/staging/prod targeting model with hard safety rails.
5. No unified command namespace for CMS binding, booking setup, and agent bootstrap.

### What is risky today

1. Hardcoded production backend/app URLs in snapshot CLI can cause accidental prod writes.
2. Inconsistent command UX (`spread`, `connect`, `sync`) obscures safe operational intent.
3. Manual script paths for agent/bootstrap and booking ops are hard to standardize and audit.
4. No versioned release mechanism means weak rollback and uncertain provenance.

---

## Assumptions (explicit)

1. Inferred: package scope remains `@l4yercak3/*` for near-term compatibility.
2. Inferred: GitHub Actions is the release automation platform.
3. Inferred: npm public publishing is desired for CLI distribution.
4. Inferred: existing Convex endpoints used by snapshot/scripts remain valid integration points for first release.

If any assumption is wrong, adjust before starting `CLI-001` and update this file.

---

## Target architecture

### Package layout

1. `packages/cli`
   - End-user binary package (`l4yercak3`, `icing`).
   - Commander command registration, UX output, top-level command shims.
2. `packages/cli-core`
   - Pure services: API client, config/profile store, guardrails, validators, serializers.
   - Reusable by CLI + tests.
3. `packages/cli-contracts` (optional if needed)
   - Shared zod/JSON-schema contracts for command outputs and request payloads.

### Internal module structure (`packages/cli/src`)

1. `bin/l4yercak3.ts` command entry.
2. `commands/auth/*`
3. `commands/app/*`
4. `commands/cms/*`
5. `commands/booking/*`
6. `commands/agent/*`
7. `commands/env/*`
8. `commands/doctor/*`
9. `legacy/*` shim wrappers for old commands.

### Backward compatibility

1. Keep `spread` aliasing to new `app init` flow for at least one major cycle.
2. Keep `connect`, `sync`, and `pages` as wrappers with migration hints.
3. Preserve config migration path from existing `~/.l4yercak3/config.json`.

---

## Release and publish design

### Naming and versions

1. Package name: `@l4yercak3/cli`.
2. Dist-tags:
   - `canary` for prereleases,
   - `latest` for stable.
3. Semver policy:
   - Patch: bugfix/no behavior change,
   - Minor: additive command/options,
   - Major: breaking command/contract changes.

### CI/CD

1. `release-pr` workflow (changesets) creates version PR.
2. `publish` workflow on merge/tag:
   - install,
   - build/test,
   - `npm publish --provenance`.
3. Required permissions: `id-token: write`, `contents: write` (release notes), `packages: write` if needed.
4. Auth:
   - npm automation token in repo secrets,
   - OIDC provenance enabled.

### Rollback and incident playbook

1. Fast rollback: repoint `latest` to last good version with `npm dist-tag add @l4yercak3/cli@<prev> latest`.
2. Hotfix: ship patch release from rollback branch.
3. Credential response: revoke compromised npm token and rotate secret.
4. Do not unpublish stable versions unless legal/security emergency.

---

## Environment targeting model

### Profiles

1. `local`: local Convex/dev endpoints only.
2. `staging`: pre-prod verification environment.
3. `prod`: production endpoints.

### Profile record

Each profile persists:

1. `name`,
2. `backendUrl`,
3. `appUrl`,
4. `defaultOrgId` (optional),
5. `defaultAppId` (optional),
6. `requiresConfirmation` (true for prod),
7. `lastUsedAt`.

### Safety rails

1. All mutation commands require resolved target tuple: `(env, orgId, appId)`.
2. `prod` mutations require explicit confirmation phrase unless `--yes --confirm-prod <token>` provided.
3. Cross-target mismatch (CLI args vs saved profile vs backend lookup) hard-fails.
4. `--dry-run` supported everywhere possible and default for smoke/check commands.

---

## Domain command strategy

### CMS

1. `cms registry sync` pulls/pushes field registry manifests.
2. `cms bind` links app -> registry metadata (`cmsCopyRegistryId`).
3. `cms migrate legacy` runs legacy-to-scoped key migration with summary.
4. `cms seed` seeds registry fields/locales from app source.
5. `cms doctor` validates locale parity, missing keys, and scoped-name consistency.

### Booking

1. `booking setup` validates required resources and wiring.
2. `booking check` asserts runtime prerequisites/env vars/integration endpoints.
3. `booking smoke` runs non-prod lifecycle smoke and emits structured result JSON.

### Agent

1. `agent init` bootstraps agent for org/app scope.
2. `agent template apply` applies known template with permission checks.
3. `agent permissions check` reports missing grants.
4. `agent drift` compares desired template config with runtime state.

---

## Phased execution (queue-aligned)

### Phase 0: Foundation and safety

- Queue rows: `CLI-001`..`CLI-007`.
- Exit criteria:
  1. Production package exists and builds/tests,
  2. release scaffolding exists,
  3. env/org/app safety rails block ambiguous operations.

### Phase 1: Domain commands

- Queue rows: `CLI-008`..`CLI-013`.
- Exit criteria:
  1. CMS bind/migrate/seed/doctor commands available,
  2. booking setup/check/smoke available,
  3. agent init/template/permissions available.

### Phase 2: Rollout and cutover

- Queue rows: `CLI-014`..`CLI-016`.
- Exit criteria:
  1. web publishing UI guidance updated,
  2. alpha release dogfooded in staging,
  3. stable release with rollback playbook and deprecation timeline.

---

## Risks and mitigations

1. Risk: accidental prod mutations.
   - Mitigation: mandatory target tuple + prod confirmation + dry-run defaults.
2. Risk: command drift between docs and shipped CLI.
   - Mitigation: `CLI-014` updates UI/docs only after command surface lands.
3. Risk: release process regressions.
   - Mitigation: changesets + provenance + dist-tag rollback.
4. Risk: domain-specific setup differs by app.
   - Mitigation: app-scoped templates and doctor checks with explicit unsupported markers.

---

## Acceptance criteria summary

1. `@l4yercak3/cli` can be built, tested, packed, and published from this repo.
2. CLI can safely target `local/staging/prod` without ambiguity.
3. CLI provides deterministic workflows for CMS, booking, and agent setup.
4. Release path includes provenance and documented rollback steps.
5. Existing users retain functional legacy command paths during transition.
