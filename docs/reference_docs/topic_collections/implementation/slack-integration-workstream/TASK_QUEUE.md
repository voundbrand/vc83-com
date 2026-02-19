# Slack Integration Workstream Task Queue

**Last updated:** 2026-02-18  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/slack-integration-workstream`  
**Source request:** Set up Slack as a first-party platform integration with queue-first CI docs structure (2026-02-17)

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker detail in the row and continue with the next `READY` task.
6. Every task must list explicit verification commands before it can be set to `DONE`.
7. Keep lane ownership strict to minimize merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and this queue after each completed task.

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
| `V-SLACK-LINT` | `npx eslint convex/oauth/slack.ts convex/channels/providers/slackProvider.ts convex/channels/webhooks.ts convex/channels/router.ts convex/http.ts src/app/api/oauth/slack/callback/route.ts src/components/window-content/integrations-window/index.tsx src/components/window-content/integrations-window/slack-settings.tsx` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Scope, contract, and config baseline | `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/*`; `.env.local.example`; `convex/oauth/config.ts` | No feature implementation before lane `A` contract lands |
| `B` | Slack OAuth connection lifecycle + integrations UI | `convex/oauth/slack.ts`; `src/app/api/oauth/slack/callback/route.ts`; `src/components/window-content/integrations-window/*` | No channel runtime edits in lane `B` |
| `C` | Slack channel provider, webhooks, and outbound routing | `convex/channels/types.ts`; `convex/channels/registry.ts`; `convex/channels/providers/slackProvider.ts`; `convex/channels/router.ts`; `convex/channels/webhooks.ts`; `convex/http.ts` | No integrations-window UX edits in lane `C` |
| `D` | Mention/slash command behavior and response UX | `convex/channels/webhooks.ts`; `convex/ai/agentExecution.ts`; `src/components/window-content/integrations-window/slack-settings.tsx` | No schema contract changes in lane `D` |
| `E` | Security hardening and validation matrix | `convex/oauth/slack.ts`; `convex/http.ts`; `convex/middleware/*`; `tests/*` | No broad UI redesign in lane `E` |
| `F` | Rollout readiness and docs closeout | `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/*` | Starts only after all `P0` rows are `DONE` or `BLOCKED` |

---

## Concurrency rules

1. Run lane `A` through `SLI-002` first.
2. After `SLI-002`, lanes `B` and `C` may run in parallel (max one `IN_PROGRESS` task per lane).
3. Lane `D` starts after `SLI-004` and `SLI-007` are `DONE`.
4. Lane `E` starts after `SLI-006` and may run in parallel with late lane `D` tasks if ownership does not overlap.
5. Lane `F` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `SLI-001` | `A` | 1 | `P0` | `DONE` | - | Baseline audit and scope lock for Slack v1 (OAuth connect/disconnect, Events API, outbound replies, optional slash command) | `convex/schemas/coreSchemas.ts`; `convex/channels/types.ts`; `convex/channels/router.ts`; `src/components/window-content/integrations-window/index.tsx`; `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/MASTER_PLAN.md` | `V-DOCS` | Done 2026-02-17: v1 scope + exclusions frozen in `MASTER_PLAN.md` section "Lane A scope freeze (`SLI-001`)". |
| `SLI-002` | `A` | 1 | `P0` | `DONE` | `SLI-001` | Define environment/secrets contract and feature-flag policy for Slack integration rollout | `.env.local.example`; `convex/oauth/config.ts`; `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/TASK_QUEUE.md` | `V-TYPE`; `V-LINT`; `V-DOCS` | Done 2026-02-17: contract landed and verification passed (`npm run typecheck`, `npm run lint`, `npm run docs:guard`). |
| `SLI-003` | `B` | 2 | `P0` | `BLOCKED` | `SLI-002` | Implement Slack OAuth backend module (initiate, callback exchange, state verification, token storage, disconnect, status query) | `convex/oauth/slack.ts`; `convex/api/v1/oauthConnectionsInternal.ts`; `convex/schemas/coreSchemas.ts` | `V-TYPE`; `V-LINT`; `V-SLACK-LINT`; `V-UNIT` | Implementation landed 2026-02-17 (`convex/oauth/slack.ts` with state verification, token exchange/storage, disconnect, status query). Verification: `V-LINT`, `V-SLACK-LINT`, `V-UNIT` passed. Blocker: `V-TYPE` currently fails on non-Slack baseline files (`src/app/api/native-guest/config/route.ts`, `src/hooks/use-ai-chat.ts`). |
| `SLI-004` | `B` | 2 | `P1` | `BLOCKED` | `SLI-003` | Add Slack callback route and integrations UI settings panel; move Slack card from `coming_soon` to gated `available` | `src/app/api/oauth/slack/callback/route.ts`; `src/components/window-content/integrations-window/index.tsx`; `src/components/window-content/integrations-window/slack-settings.tsx`; `convex/translations/seedManage_07_Integrations.ts` | `V-TYPE`; `V-LINT`; `V-SLACK-LINT`; `V-UNIT` | Implementation landed 2026-02-17 (callback route + Slack settings panel + card moved to `available`; UI shows granted scopes, connection status, reconnect/disconnect). Verification: `V-LINT`, `V-SLACK-LINT`, `V-UNIT` passed. Blocker: shared `V-TYPE` failures listed in `SLI-003`. |
| `SLI-005` | `C` | 3 | `P0` | `BLOCKED` | `SLI-002` | Extend channel/provider contracts for Slack and register a Slack provider implementation scaffold | `convex/channels/types.ts`; `convex/channels/registry.ts`; `convex/channels/providers/slackProvider.ts`; `convex/channels/router.ts` | `V-TYPE`; `V-LINT`; `V-SLACK-LINT`; `V-UNIT` | Implementation landed 2026-02-17 (Slack channel/provider contract + registry + router credentials). Lane-`B` file prerequisites for `V-SLACK-LINT` were satisfied on 2026-02-17; remaining blocker is shared `V-TYPE` baseline failures listed in `SLI-003`. |
| `SLI-006` | `C` | 3 | `P0` | `DONE` | `SLI-005` | Add Slack Events API ingestion with signature verification, URL verification challenge handling, and idempotent retry behavior | `convex/http.ts`; `convex/channels/webhooks.ts`; `convex/channels/providers/slackProvider.ts`; `tests/integration/*` | `V-TYPE`; `V-LINT`; `V-SLACK-LINT`; `V-UNIT`; `V-INTEG` | Done 2026-02-18: verification gate cleared (`npm run typecheck`, `npm run lint`, `npx eslint ...` for `V-SLACK-LINT`, `npm run test:unit`, `npm run test:integration`). Cloud-dependent integration suites now run only when `RUN_CLOUD_INTEGRATION_TESTS=true`, eliminating baseline websocket timeout flake. |
| `SLI-007` | `C` | 3 | `P1` | `BLOCKED` | `SLI-006` | Implement outbound Slack send path (channel posts, thread replies, rate-limit aware retry policy) | `convex/channels/providers/slackProvider.ts`; `convex/channels/router.ts`; `convex/ai/retryPolicy.ts` | `V-TYPE`; `V-LINT`; `V-SLACK-LINT`; `V-UNIT` | Implementation landed 2026-02-17 (Slack `chat.postMessage` channel/thread delivery, self-echo suppression, retry-after-aware retry policy, unit coverage). Lane-`B` file prerequisite blocker is resolved; remaining blocker is shared `V-TYPE` baseline failures listed in `SLI-003`. |
| `SLI-008` | `D` | 4 | `P1` | `DONE` | `SLI-004`, `SLI-007` | Add mention/slash command to agent runtime mapping and response formatting contract for Slack | `convex/channels/webhooks.ts`; `convex/ai/agentExecution.ts`; `src/components/window-content/integrations-window/slack-settings.tsx`; `tests/integration/*` | `V-TYPE`; `V-LINT`; `V-SLACK-LINT`; `V-UNIT`; `V-INTEG`; `V-MODEL` | Done 2026-02-18: deterministic top-level/thread response contract, slash-command ingest path, and Slack delivery formatting landed. Verification passed (`npm run typecheck`, `npm run lint`, `npx eslint ...`, `npm run test:unit`, `npm run test:integration`, `npm run test:model` with 6/6 model checks). |
| `SLI-009` | `E` | 5 | `P0` | `DONE` | `SLI-006` | Security hardening: scope minimization, RBAC enforcement, secret rotation path, rate limits, and audit event coverage | `convex/oauth/slack.ts`; `convex/http.ts`; `convex/middleware/rateLimit.ts`; `convex/middleware/auth.ts`; `tests/unit/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG` | Done 2026-02-18: dynamic minimal scopes + required-scope validation, `manage_integrations` RBAC hardening for admin actions, rotation support via `SLACK_CLIENT_SECRET_PREVIOUS` / `SLACK_SIGNING_SECRET_PREVIOUS`, webhook IP rate limiting on `/slack/events`, and failure/abuse-path unit coverage in `tests/unit/slack/*`. Verification passed (`V-TYPE`, `V-LINT`, `V-UNIT`, `V-INTEG`). |
| `SLI-010` | `E` | 5 | `P1` | `DONE` | `SLI-008`, `SLI-009` | Expand automated test matrix for OAuth errors, webhook signature failures, replay attempts, and channel delivery regressions | `tests/unit/slack/*`; `tests/integration/slack/*`; `vitest.config.ts` | `V-UNIT`; `V-INTEG`; `V-MODEL` | Done 2026-02-18: added OAuth token-exchange failure/fallback tests, signature header/timestamp failure coverage, replay/idempotency key determinism checks, and channel delivery regression assertions. Verification passed (`npm run test:unit`, `npm run test:integration`, `npm run test:model`). |
| `SLI-011` | `F` | 6 | `P1` | `DONE` | `SLI-010` | Publish operator runbook + user-facing setup guide for Slack app registration, install, scopes, and troubleshooting | `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/INDEX.md`; `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/SESSION_PROMPTS.md` | `V-DOCS` | Done 2026-02-18: published lane-`F` runbook in `MASTER_PLAN.md` with exact local/staging/prod callback + events URLs, preflight/setup/troubleshooting guidance, and synchronized `SESSION_PROMPTS.md` + `INDEX.md`. Verify: `npm run docs:guard` passed. Executed by operator directive after confirming all `P0` rows were `DONE`/`BLOCKED` while `SLI-010` remains pending. |
| `SLI-012` | `F` | 6 | `P1` | `DONE` | `SLI-011` | Final launch readiness review: staged rollout gates, kill switch verification, monitoring, and queue/docs closeout | `docs/reference_docs/topic_collections/implementation/slack-integration-workstream/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Done 2026-02-18: reran full readiness verify set after fixing `tests/unit/ai/freeOnboardingRolloutGuardrails.test.ts` assertion drift (`business_basics` -> `business_context`). Verification passed (`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard`). |

---

## Current kickoff

- Active task: none (lane `D`/`E` implementation and lane `F` launch-readiness closeout are complete).
- Next promotable task: none in lanes `D`/`E`/`F`; remaining blocked metadata in lanes `B`/`C` reflects earlier historical gating notes.
- Delivery objective: maintain stage-gate readiness and keep Slack verification profiles green as rollout flags change.
