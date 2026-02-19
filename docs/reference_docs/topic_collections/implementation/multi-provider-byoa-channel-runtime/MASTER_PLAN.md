# Multi-Provider BYOA Channel Runtime Master Plan

**Date:** 2026-02-19  
**Scope:** Separate platform-owned channel apps from org BYOA apps across Slack, Telegram, WhatsApp, and future providers, with stronger security and predictable routing.

---

## Mission

Deliver a dual-model channel architecture where:

1. `l4yercak3` platform agents can run on dedicated platform-owned provider apps.
2. customer orgs can connect their own provider apps (BYOA) without platform config collisions.
3. inbound and outbound routing are installation-aware, auditable, and secure by default.

---

## Architecture decision contract

### Model 1: Platform App Profile

Platform-owned app credentials used only for platform workflows and explicitly configured fallback cases.

### Model 2: Org BYOA App Profile

Org-owned app credentials and installs used for tenant-specific messaging and agent workflows.

### Separation rules (hard requirements)

1. Routing cannot select provider credentials by `provider` alone; it must resolve a concrete installation/profile binding.
2. Inbound webhook verification must resolve the correct app profile before dispatch to runtime.
3. BYOA credentials must never rely on global env token fallback.
4. Platform and BYOA installations must be independently rotatable and revocable.
5. Session identity must include installation/route context to prevent cross-agent/persona collisions.

---

## Current blockers snapshot

1. `channel_provider_binding` currently lacks direct installation/profile identity.
2. Some provider credential paths still resolve first active connection per org+provider.
3. Slack signature verification currently depends on environment signing secret candidates.
4. Telegram webhook endpoint does not enforce per-org secret-token header verification at HTTP boundary.
5. Telegram custom bot token is stored in object settings and should move to encrypted-at-rest handling.
6. WhatsApp webhook processing exists but inbound HTTP route wiring + real signature verification path is incomplete.
7. Agent/session routing remains single-active-agent per org/channel with limited installation/persona partitioning.

---

## Target architecture

### Identity and credential layers

1. **App profile layer:** provider app identity + signing secret + OAuth client metadata.
2. **Installation layer:** tenant installation/workspace/account credentials tied to one app profile.
3. **Channel binding layer:** channel + route selector + installation reference + priority.

### Routing and runtime layers

1. **Inbound:** verify signature with app profile -> resolve installation -> resolve org -> normalize -> runtime.
2. **Outbound:** resolve binding -> load installation credentials -> decrypt at send boundary -> provider send.
3. **Sessioning:** include route key dimensions (`channel`, `installation`, `peer`, `agent`) so personas do not collide.

### Security baseline

1. Secrets encrypted at rest, decrypted only at send/verify boundary.
2. Deterministic idempotency and replay windows for inbound provider events.
3. No plaintext token persistence for BYOA credentials.
4. Audit events for connect, rotate, revoke, webhook reject, and signature failures.
5. Rollout gates and kill switches for each provider integration path.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Contract and schema freeze | `A` | `MPB-001`..`MPB-003` |
| Phase 2 | Inbound security and verification correctness | `B` | `MPB-004`..`MPB-006` |
| Phase 3 | Routing/runtime installation awareness | `C` | `MPB-007`..`MPB-009` |
| Phase 4 | Provider setup UX and onboarding docs | `D` | `MPB-010`..`MPB-011` |
| Phase 5 | Migration, rollout, and closeout hardening | `E` | `MPB-012`..`MPB-014` |

---

## Execution status (2026-02-19)

1. `MPB-002` completed: channel binding contract and router credential resolution now support explicit installation/profile identity hints, with backward-compatible provider-only fallback.
2. `MPB-003` completed: idempotent backfill migrations + rollout flag seeds are in place, and Slack/WhatsApp OAuth metadata now persists installation/profile identity fields by default.
3. `MPB-004` completed: Slack HTTP ingress now resolves installation/profile verification context before dispatch and validates signatures with installation-scoped secrets (platform fallback kept explicit).
4. `MPB-005` completed: Telegram webhook auth now verifies secret ownership at ingress, routes custom bot traffic by authenticated ownership, and encrypts stored bot token/webhook secret material.
5. `MPB-006` completed: WhatsApp inbound HTTP route is wired with explicit verification-token handshake and real SHA-256 HMAC validation before dispatch.
6. `MPB-007` completed: outbound router now requires explicit platform fallback opt-in, validates binding/credential ownership alignment, and blocks organization BYOA bindings from platform fallback credential sources.
7. `MPB-008` completed: session lifecycle now persists route-aware keys and installation identity hints, resolves active sessions by agent + route partition with deterministic matching, and preserves legacy sessions via safe promotion when no conflicting route-scoped session exists.
8. `MPB-009` blocked: deterministic route-selector dispatch (account/team/peer/channel/provider dimensions) is implemented and threaded from inbound metadata to agent selection, with `V-LINT`/`V-UNIT`/`V-MODEL` passing; `V-TYPE` is blocked by external `TS2589` at `src/components/window-content/store-window.tsx:46` outside lane `C` ownership.
9. `MPB-010` completed: integrations setup UX now exposes dual-mode platform vs org-BYOA flows for Slack/Telegram/WhatsApp (including WhatsApp surface wiring and concrete setup packet values), with `V-TYPE`/`V-LINT`/`V-UNIT` passing.
10. `MPB-011` completed: published provider onboarding runbook with concrete setup contract values (manifest fields, callback/webhook URLs, scope lists), dev->prod cutover checklist, and per-provider key rotation steps; `V-DOCS` passed.
11. `MPB-012` completed: rollout controls are now operational via migration APIs for state inspection, global flag updates, provider stage updates, and explicit provider rollback commands; provider promotion is guarded by canary-first sequencing and security matrix checks in mutation contracts.
12. `MPB-013` completed: failure-path matrix now has explicit spoof/replay/rotation/routing-isolation coverage with new unit/integration tests and published operator matrix contract (`SECURITY_FAILURE_PATH_MATRIX.md`).
13. `MPB-014` completed: queue/plan/index/runbook docs are synchronized for lane `E` closeout and docs guard is green; remaining verification exceptions are tracked as external/environmental (`V-TYPE` external compile errors outside lane `E`; `V-MODEL` conformance missing cost metric).

---

## Rollout strategy

1. Stage 0: Keep provider BYOA path behind feature flags while contracts land.
2. Stage 1: Move each provider to `canary` with explicit `canaryOrganizationIds`.
3. Stage 2: Promote provider `canary -> on` only after `SECURITY_FAILURE_PATH_MATRIX.md` is green.
4. Stage 3: Expand to additional providers using the same app-profile + installation contract.
5. At any stage regression, execute provider rollback mutation first, then optionally force global legacy-provider mode.

---

## Migration + rollout controls runbook

1. Seed rollout/rollback flags (idempotent):
   - `npx convex run migrations/backfillChannelRuntimeIdentity:initializeChannelRuntimeIdentityFlags`
2. Inspect current rollout state:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:getChannelRuntimeIdentityFlagState`
3. Dry-run oauth identity backfill:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:backfillOAuthConnectionIdentity '{"dryRun":true}'`
4. Dry-run binding identity backfill:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:backfillChannelProviderBindingIdentity '{"dryRun":true}'`
5. Execute oauth backfill in batches until `hasNextPage=false`:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:backfillOAuthConnectionIdentity`
6. Execute binding backfill in batches until `hasNextPage=false`:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:backfillChannelProviderBindingIdentity`
7. Set global rollout defaults for canary:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityGlobalFlag '{"enabled":true,"allowLegacyProviderFallback":true,"progressiveRollout":true,"rollbackMode":"legacy_provider_only","updatedBy":"ops@company.com"}'`
8. Move provider to canary with explicit org allowlist:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"slack","stage":"canary","canaryOrganizationIds":["org_canary_a"],"updatedBy":"ops@company.com"}'`
9. Promote provider to `on` only when matrix is green:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"slack","stage":"on","securityMatrixGreen":true,"securityMatrixReference":"SECURITY_FAILURE_PATH_MATRIX.md","updatedBy":"ops@company.com"}'`

Flag keys seeded by migration:

1. `byoa_channel_runtime.identity.global`
2. `byoa_channel_runtime.identity.slack`
3. `byoa_channel_runtime.identity.telegram`
4. `byoa_channel_runtime.identity.whatsapp`

Rollback strategy:

1. Keep `byoa_channel_runtime.identity.global.allowLegacyProviderFallback=true` during canary rollout.
2. To rollback provider-specific routing, run:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:rollbackChannelRuntimeIdentityProviderFlag '{"provider":"slack","reason":"lane_e_regression","updatedBy":"ops@company.com"}'`
3. To force global rollback behavior, run:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityGlobalFlag '{"enabled":false,"allowLegacyProviderFallback":true,"rollbackMode":"legacy_provider_only","updatedBy":"ops@company.com"}'`

---

## Acceptance criteria

1. Platform app profiles and org BYOA profiles can coexist without routing overlap.
2. Inbound webhook verification uses installation-specific app secrets.
3. Outbound routing is installation-aware and never relies on implicit provider-only lookup.
4. Session routing supports multi-agent/persona behavior without cross-thread collisions.
5. Provider onboarding flow is documented and repeatable for agencies/org owners.
6. Verification suite and docs guard pass before rollout stage promotion.

---

## Non-goals

1. Slack Marketplace listing automation.
2. Full Enterprise Grid administration UX.
3. Historical message backfill from external channels.
4. Complete provider feature parity for advanced modal/workflow APIs in v1.
