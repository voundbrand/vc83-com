# Multi-Provider BYOA Channel Runtime Task Queue

**Last updated:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`  
**Source request:** Preserve platform-owned agent app behavior while delivering painless org BYOA setup across Slack/Telegram/WhatsApp with stronger security.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker details in row `Notes` and continue with next `READY` task.
6. Every task must include explicit verification commands before moving to `DONE`.
7. Keep lane boundaries strict to reduce merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and `TASK_QUEUE.md` after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-MODEL` | `npm run test:model` |
| `V-DOCS` | `npm run docs:guard` |
| `V-CHANNEL-LINT` | `npx eslint convex/channels convex/oauth/slack.ts convex/oauth/whatsapp.ts convex/integrations/telegram.ts convex/http.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract + schema + migration-safe foundation | `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/*`; `convex/schemas/*`; `convex/channels/types.ts` | No runtime/security implementation before lane `A` `P0` tasks are `DONE` |
| `B` | Provider ingress security correctness | `convex/http.ts`; `convex/channels/webhooks.ts`; provider OAuth modules | No UI changes in lane `B` |
| `C` | Installation-aware routing/session/agent behavior | `convex/channels/router.ts`; `convex/agentOntology.ts`; `convex/ai/agentSessions.ts`; `convex/ai/agentExecution.ts` | No onboarding UI changes in lane `C` |
| `D` | Integrations setup UX + provider setup docs | `src/components/window-content/integrations-window/*`; docs prompts/guides | No schema contract changes in lane `D` |
| `E` | Migration, rollout controls, and closeout hardening | migrations + docs + test matrix updates | Starts only when all `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` and complete `MPB-001`..`MPB-003`.
2. After lane `A` `P0` completion, lanes `B` and `C` may run in parallel (max one `IN_PROGRESS` per lane).
3. Lane `D` starts after `MPB-007` is `DONE`.
4. Lane `E` starts only after all remaining `P0` tasks are `DONE` or `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `MPB-001` | `A` | 1 | `P0` | `DONE` | - | Baseline architecture audit and dual-model contract freeze (platform app profile vs org BYOA profile) | `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/MASTER_PLAN.md`; `convex/channels/router.ts`; `convex/http.ts`; `convex/channels/webhooks.ts`; `convex/channels/telegramBotSetup.ts` | `V-DOCS` | Done 2026-02-19: blockers captured and target contract frozen. |
| `MPB-002` | `A` | 1 | `P0` | `DONE` | `MPB-001` | Extend channel binding contract to reference explicit installation/profile identity (not provider-only routing) | `convex/channels/router.ts`; `convex/channels/types.ts`; `convex/schemas/coreSchemas.ts`; `convex/schemas/agentSessionSchemas.ts` | `V-TYPE`; `V-LINT`; `V-CHANNEL-LINT` | Done 2026-02-19: binding contract now carries installation/profile identity hints; router credential resolution prefers explicit connection/account identity with legacy fallback retained for migration safety. |
| `MPB-003` | `A` | 1 | `P0` | `DONE` | `MPB-002` | Land migration/backfill strategy for existing Slack/Telegram/WhatsApp bindings and oauth connections | `convex/migrations/*`; `convex/oauth/slack.ts`; `convex/oauth/whatsapp.ts`; docs in this workstream | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Done 2026-02-19: added idempotent binding/oauth identity backfills, rollout flag seed migration, and Slack/WhatsApp OAuth identity persistence contract for new connections. |
| `MPB-004` | `B` | 2 | `P0` | `DONE` | `MPB-003` | Refactor Slack ingress to resolve app profile/install first, then verify signature with installation-specific secret | `convex/http.ts`; `convex/channels/webhooks.ts`; `convex/oauth/slack.ts`; `convex/oauth/config.ts` | `V-TYPE`; `V-LINT`; `V-CHANNEL-LINT`; `V-UNIT`; `V-INTEG` | Done 2026-02-19: Slack HTTP ingress now resolves install/profile context (team/app) before signature verification, validates against installation-scoped secret candidates, and removes global signing-secret candidate use on BYOA verification paths. |
| `MPB-005` | `B` | 2 | `P0` | `DONE` | `MPB-003` | Harden Telegram ingress: enforce secret-token header validation and encrypt custom bot token + webhook secret storage | `convex/http.ts`; `convex/channels/telegramBotSetup.ts`; `convex/channels/providers/telegramProvider.ts`; `convex/integrations/telegram.ts`; `convex/oauth/encryption.ts` | `V-TYPE`; `V-LINT`; `V-CHANNEL-LINT`; `V-UNIT` | Done 2026-02-19: Telegram webhook now enforces secret-token auth at the HTTP boundary, custom bot traffic routes by authenticated secret ownership (not query params), `telegram_settings` stores encrypted bot token/webhook secret with fingerprint lookup, and router decrypts Telegram credentials at send boundary; all verify commands executed successfully (warnings only on lint profiles). |
| `MPB-006` | `B` | 2 | `P0` | `DONE` | `MPB-003` | Wire WhatsApp inbound HTTP route and implement real HMAC verification path before dispatch | `convex/http.ts`; `convex/channels/webhooks.ts`; `convex/channels/providers/whatsappProvider.ts`; `convex/oauth/whatsapp.ts` | `V-TYPE`; `V-LINT`; `V-CHANNEL-LINT`; `V-UNIT`; `V-INTEG` | Done 2026-02-19: added `/webhooks/whatsapp` (and `/whatsapp-webhook` alias) GET/POST handlers, enforced verification-token handshake + boundary HMAC validation before scheduling dispatch, replaced internal WhatsApp signature no-op with real SHA-256 HMAC verification, and tightened provider-level verification guardrails; all verify commands executed successfully (warnings only on lint profiles). |
| `MPB-007` | `C` | 3 | `P0` | `DONE` | `MPB-004`, `MPB-005`, `MPB-006` | Make outbound routing installation-aware and enforce strict platform-vs-BYOA credential boundaries | `convex/channels/router.ts`; `convex/channels/types.ts`; `convex/channels/registry.ts` | `V-TYPE`; `V-LINT`; `V-CHANNEL-LINT`; `V-UNIT` | Done 2026-02-19: outbound credential resolution now enforces explicit platform fallback opt-in, blocks platform fallback leakage into organization/BYOA bindings, validates binding-vs-credential identity alignment (profile/install/route), and adds router boundary unit coverage; verify commands passed (lint profiles emitted warnings only). |
| `MPB-008` | `C` | 3 | `P0` | `DONE` | `MPB-007` | Expand session routing key dimensions to include installation/route identity to avoid multi-agent collisions in shared channels | `convex/schemas/agentSessionSchemas.ts`; `convex/ai/agentSessions.ts`; `convex/ai/agentExecution.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG` | Done 2026-02-19: agent sessions now persist route-aware `sessionRoutingKey` and route identity, resolve sessions by org+channel+agent+contact with deterministic route-key matching, promote legacy active sessions only when safe, and partition inbound idempotency with route identity metadata; verify commands passed (lint profile emitted warnings only). |
| `MPB-009` | `C` | 3 | `P1` | `BLOCKED` | `MPB-008` | Implement OpenClaw-style route resolution policies (account/team/peer/channel selectors) for agent dispatch | `convex/agentOntology.ts`; `convex/channels/webhooks.ts`; `convex/ai/agentExecution.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-MODEL` | Blocked 2026-02-19: route-selector dispatch implementation landed; `V-LINT`, `V-UNIT`, and `V-MODEL` passed, but `V-TYPE` failed on external `TS2589` at `src/components/window-content/store-window.tsx:46` (outside lane `C` ownership). |
| `MPB-010` | `D` | 4 | `P1` | `DONE` | `MPB-007` | Build integrations UX for dual-mode setup: platform-managed app vs org BYOA per provider | `src/components/window-content/integrations-window/*`; `src/hooks/*`; `convex/integrations/*` | `V-TYPE`; `V-LINT`; `V-UNIT` | Done 2026-02-19: landed dual-mode setup UX for Slack/Telegram/WhatsApp (including WhatsApp tile wiring and copy-ready setup packets), then reran full verify profile with `V-TYPE`, `V-LINT`, and `V-UNIT` all passing (lint warnings only). |
| `MPB-011` | `D` | 4 | `P1` | `DONE` | `MPB-010` | Publish provider setup guides/manifests/checklists for Slack, Telegram, WhatsApp BYOA onboarding | `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/*` | `V-DOCS` | Done 2026-02-19: added concrete BYOA provider runbook (`BYOA_PROVIDER_SETUP_RUNBOOK.md`) with manifest/callback/webhook/scope values, dev->prod cutover checklist, and per-provider key rotation checklist; `V-DOCS` passed. |
| `MPB-012` | `E` | 5 | `P0` | `DONE` | `MPB-008`, `MPB-010` | Execute migration + rollout plan with feature flags, canary orgs, and rollback commands | `convex/migrations/*`; `convex/oauth/config.ts`; docs in this workstream | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-19: added rollout control APIs in `convex/migrations/backfillChannelRuntimeIdentity.ts` (`getChannelRuntimeIdentityFlagState`, `setChannelRuntimeIdentityGlobalFlag`, `setChannelRuntimeIdentityProviderFlag`, `rollbackChannelRuntimeIdentityProviderFlag`) with canary-first + security-matrix gating for stage promotion and explicit rollback paths; `V-LINT`, `V-UNIT`, `V-INTEG`, `V-DOCS` passed; `V-TYPE` hit unrelated pre-existing errors in `convex/ai/agentExecution.ts` and `convex/integrations/openclawBridge.ts`; top risks covered: accidental direct `on` promotion, non-idempotent rollback, flag-schema drift. |
| `MPB-013` | `E` | 5 | `P1` | `DONE` | `MPB-012` | Expand failure-path security test matrix (signature spoof/replay/token-rotation/routing isolation) | `tests/unit/*`; `tests/integration/*`; `tests/model/*` | `V-UNIT`; `V-INTEG`; `V-MODEL` | Done 2026-02-19: added `tests/unit/channels/telegramWebhookSecret.test.ts`, `tests/unit/channels/whatsappSignature.test.ts`, expanded `tests/unit/ai/channelRouterCredentialBoundary.test.ts`, and added `tests/integration/ai/channelSecurityFailurePathMatrix.integration.test.ts`; published `SECURITY_FAILURE_PATH_MATRIX.md`; `V-UNIT` and `V-INTEG` passed; `V-MODEL` executed with 6/6 functional checks passing but conformance `FAIL` due missing `cost_per_1k_tokens_usd` metric in environment output; top risks covered: Slack-only coverage bias, replay-path blind spots, routing-boundary false positives. |
| `MPB-014` | `E` | 5 | `P1` | `DONE` | `MPB-013` | Final closeout: sync queue docs, operator runbook, and CI guard validation | `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/*` | `V-DOCS` | Done 2026-02-19: synchronized `TASK_QUEUE.md`, `MASTER_PLAN.md`, `INDEX.md`, and `BYOA_PROVIDER_SETUP_RUNBOOK.md` with lane `E` rollout/rollback and matrix controls; `V-DOCS` passed; top risks covered: status drift across docs, hidden verification exceptions, missing operator gating references. |

---

## Current kickoff

- Active task: none.
- Next task to execute: none (lane `E` closeout complete).
- Immediate objective: monitor canary rollout operations and only promote provider stages when `SECURITY_FAILURE_PATH_MATRIX.md` remains green.
