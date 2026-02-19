# Free Onboarding Global Task Queue

**Last updated:** 2026-02-17  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global`  
**Source request:** Global free-token onboarding alignment across Telegram, webchat, and native AI chat (2026-02-17)

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, note blocker details in the row and continue with the next `READY` task.
6. Every task must include explicit verification commands before it can be set to `DONE`.
7. Keep lane ownership strict to minimize merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and this queue after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-ONBOARDING-LINT` | `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` |
| `V-CLIENT-LINT` | `npx eslint src/components/chat-widget/ChatWidget.tsx src/hooks/use-ai-chat.ts src/contexts/ai-chat-context.tsx src/app/page.tsx src/app/builder/page.tsx` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Channel contract and pre-auth runtime parity | `convex/api/v1/webchatApi.ts`, `convex/http.ts`, `convex/ai/agentExecution.ts`, `convex/onboarding/*` | No auth UI edits before lane `A` core contract lands |
| `B` | Identity claim/linking for anonymous and Telegram-first users | `convex/onboarding/*`, `convex/api/v1/*Auth*`, `convex/schemas/*` | No widget/desktop UI edits in lane `B` |
| `C` | Onboarding agent conversion tools (account, sub-account, upgrade, credits) | `convex/ai/tools/interviewTools.ts`, `convex/onboarding/seedPlatformAgents.ts`, `convex/ai/tools/registry.ts` | No session schema changes in lane `C` |
| `D` | Native + web UX for guest chat and auth handoff | `src/components/chat-widget/ChatWidget.tsx`, `src/hooks/use-ai-chat.ts`, `src/contexts/ai-chat-context.tsx`, `src/app/page.tsx`, `src/app/builder/page.tsx` | No Convex schema changes in lane `D` |
| `E` | Abuse controls and funnel instrumentation | `convex/api/v1/webchatApi.ts`, `convex/http.ts`, `convex/onboarding/*`, analytics/event emitters | No broad visual redesign in lane `E` |
| `F` | Rollout hardening, verification, and docs closeout | cross-cutting tests + docs | Starts only after all `P0` tasks are `DONE` or `BLOCKED` |

---

## Concurrency rules

1. Run lane `A` first through `FOG-003`.
2. After `FOG-003`, lanes `B` and `C` may run in parallel (max one `IN_PROGRESS` per lane).
3. Lane `D` starts after `FOG-004` and `FOG-003` are `DONE`.
4. Lane `E` starts after `FOG-003` and runs in parallel with late lane `D` tasks if file ownership does not overlap.
5. Lane `F` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `FOG-001` | `A` | 1 | `P0` | `DONE` | - | Baseline audit of Telegram, webchat, native chat, auth gates, and conversion paths | `convex/onboarding/telegramResolver.ts`; `convex/onboarding/seedPlatformAgents.ts`; `convex/onboarding/completeOnboarding.ts`; `convex/api/v1/webchatApi.ts`; `src/hooks/use-ai-chat.ts`; `src/app/page.tsx`; `convex/licensing/tierConfigs.ts` | `V-DOCS` | Done 2026-02-17: confirmed onboarding foundation is strong on Telegram; identified key gaps for global lead-magnet flow: webchat agent-type mismatch (`agent` vs `org_agent`), missing claim flow for Telegram-created orgs without users, limited onboarding tools (no upgrade/credit/sub-account CTAs), and native AI chat hard auth gate. |
| `FOG-002` | `A` | 1 | `P0` | `DONE` | `FOG-001` | Implement unified pre-auth channel contract (org agent type parity + onboarding router compatibility for webchat/native guest channels) | `convex/api/v1/webchatApi.ts`; `convex/agentOntology.ts`; `convex/ai/agentExecution.ts`; `convex/http.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: fixed `org_agent` parity in webchat config lookup, normalized channel binding compatibility (array + legacy object map), added channel alias support (`native_guest` -> `webchat`) in active-agent resolution, and aligned runtime/webchat response contract (`response` + `message`) without changing Telegram resolver/webhook behavior. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-003` | `A` | 1 | `P0` | `DONE` | `FOG-002` | Add `native_guest` channel transport and public-safe message endpoint using same runtime as Telegram/webchat | `convex/http.ts`; `convex/api/v1/webchatApi.ts`; `convex/ai/agentExecution.ts`; `convex/schemas/agentSessionSchemas.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: added public `native_guest` HTTP transport (`OPTIONS` + `POST /api/v1/native-guest/message`), reused existing session/rate-limit/runtime flow via `handleWebchatMessage`, enforced channel-specific session token prefixes, and set `metadata.skipOutbound` for native guest so delivery remains API-response-only while runtime metering/daily limits stay centralized. Added schema/runtime docs for native channel support. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-004` | `B` | 2 | `P0` | `DONE` | `FOG-002` | Build anonymous identity ledger + signed claim tokens to link guest sessions to authenticated user/org after signup/login | `convex/schemas/webchatSchemas.ts`; `convex/onboarding/*`; `convex/api/v1/accountLinking.ts`; `convex/api/v1/oauthSignup.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: added `anonymousIdentityLedger` + `anonymousClaimTokens` schema tables and claim fields on `webchatSessions`; implemented signed HMAC claim token issuance/inspection/consume flow in `convex/onboarding/identityClaims.ts` with idempotent consume semantics and audit logging; wired claim token issuance into webchat/native guest responses and added authenticated claim endpoint (`POST /api/v1/auth/link-account/claim`); integrated optional claim-token consume in OAuth signup + account-link confirm paths. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-005` | `B` | 2 | `P1` | `DONE` | `FOG-004` | Add Telegram-first org claim flow for orgs created without users during `complete_onboarding` | `convex/onboarding/completeOnboarding.ts`; `convex/onboarding/orgBootstrap.ts`; `convex/onboarding/telegramLinking.ts`; `convex/onboarding/telegramResolver.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: `completeOnboarding` now issues Telegram org claim tokens and sends an OAuth claim link, `oauthSignup` now supports claimed-org bootstrap to prevent duplicate org creation, `orgBootstrap` now writes auditable creation logs, and Telegram resolver/linking flows now sync ledger state and revoke stale pending Telegram claim tokens after explicit email-link completion. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-006` | `C` | 3 | `P0` | `DONE` | `FOG-002` | Add onboarding conversion tools: account creation handoff, sub-account creation flow, plan upgrade checkout, credit pack checkout | `convex/ai/tools/interviewTools.ts`; `convex/ai/tools/registry.ts`; `convex/integrations/telegram.ts`; `convex/stripe/platformCheckout.ts`; `convex/stripe/creditCheckout.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: added `start_account_creation_handoff`, `start_sub_account_flow`, `start_plan_upgrade_checkout`, and `start_credit_pack_checkout` onboarding tools with channel-safe CTA payloads (default + per-channel variants and Telegram plain-text fallback), plus shared CTA typing in tool registry and shared Stripe redirect URL builders for plan/credit checkouts. Added platform-org guardrails to redirect guest users to account handoff before billing flows. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-007` | `C` | 3 | `P1` | `DONE` | `FOG-006` | Update Quinn/system onboarding prompt and interview template for global funnel states (existing account, no account, upgrade/credits, sub-account) | `convex/onboarding/seedPlatformAgents.ts`; `convex/ai/interviewRunner.ts`; `convex/ai/tools/interviewTools.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: updated Quinn system prompt for global funnel routing (existing account, no account, upgrade, credits, sub-account), added funnel-state interview phase (`accountStatus`, `primaryGoal`, `needsFullOnboarding`) with skip-gated full-onboarding phases, expanded Quinn tool set + `native_guest` channel binding, and added interview prompt quality rules to preserve one-question pacing when CTAs are used. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-008` | `D` | 4 | `P0` | `DONE` | `FOG-003`, `FOG-004` | Introduce native desktop guest chat mode with auth handoff and session continuity into authenticated AI Assistant | `src/hooks/use-ai-chat.ts`; `src/contexts/ai-chat-context.tsx`; `src/components/window-content/ai-chat-window/index.tsx`; `src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-CLIENT-LINT`; `V-UNIT` | Done 2026-02-17: added native desktop guest UI path in `AIChatWindow` while keeping signed-in layouts/model controls unchanged, added server bootstrap endpoint `GET /api/native-guest/config`, wired guest transport via existing `POST /api/v1/native-guest/message`, persisted claim/session tokens in local storage, and added automatic claim-token consume on authenticated AI chat load for guest-to-auth continuity. Desktop launcher now allows guest AI Assistant entry and guest deep-link open for `openWindow=ai-assistant`. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint src/components/chat-widget/ChatWidget.tsx src/hooks/use-ai-chat.ts src/contexts/ai-chat-context.tsx src/app/page.tsx src/app/builder/page.tsx`; `npm run test:unit` (warnings only on lint/eslint). |
| `FOG-009` | `D` | 4 | `P1` | `DONE` | `FOG-004` | Add explicit conversion UX in webchat/native guest chat (create account, resume chat, upgrade, buy credits) with low-friction CTA handling | `src/components/chat-widget/ChatWidget.tsx`; `src/components/window-content/store-window.tsx`; `src/components/credit-wall.tsx`; `src/app/builder/page.tsx` | `V-TYPE`; `V-LINT`; `V-CLIENT-LINT` | Done 2026-02-17: added explicit conversion CTA surfaces in webchat + native guest chat (create account, resume chat, upgrade, buy credits), parsed assistant URLs into low-friction CTA buttons, and added builder landing conversion shortcuts with claim-token persistence. Store conversion now reuses existing billing flows by routing through `StoreWindow` with section focus (`plans`/`credits`), and `CreditWall` defaults now open the same store sections instead of adding any parallel checkout logic. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint src/components/chat-widget/ChatWidget.tsx src/hooks/use-ai-chat.ts src/contexts/ai-chat-context.tsx src/app/page.tsx src/app/builder/page.tsx` (warnings only on lint/eslint). |
| `FOG-010` | `E` | 5 | `P0` | `DONE` | `FOG-003` | Harden anti-abuse controls for free-token channels (IP/device velocity limits, challenge hooks, per-channel quotas, suspicious-pattern logging) | `convex/api/v1/webchatApi.ts`; `convex/http.ts`; `convex/onboarding/telegramResolver.ts`; `convex/schemas/webchatSchemas.ts` | `V-TYPE`; `V-LINT`; `V-ONBOARDING-LINT` | Done 2026-02-17: added layered abuse controls for `webchat`/`native_guest`/`telegram` with IP + device + session velocity checks, per-channel quotas, repeated-message risk scoring, adaptive challenge escalation before hard blocks, and suspicious-pattern audit signals. Expanded `webchatRateLimits` schema/indexes for channel attribution + forensic queries without changing legitimate onboarding happy-path responses. Verify run: `npm run typecheck`; `npm run lint`; `npx eslint convex/onboarding convex/ai/tools/interviewTools.ts convex/api/v1/webchatApi.ts convex/ai/agentExecution.ts convex/http.ts` (warnings only). |
| `FOG-011` | `E` | 5 | `P1` | `DONE` | `FOG-008`, `FOG-009`, `FOG-010` | Instrument full funnel analytics and attribution across channels (first touch, activation, signup, claim, upgrade, credit purchase) | `convex/onboarding/*`; `convex/api/v1/webchatApi.ts`; `src/components/chat-widget/ChatWidget.tsx`; `src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT` | Done 2026-02-17: implemented deterministic funnel event pipeline (`onboarding.funnel.first_touch`, `activation`, `signup`, `claim`, `upgrade`, `credit_purchase`) with idempotent event keys and channel + campaign attribution. Wired emits across webchat/native guest messaging, Telegram onboarding resolver, OAuth signup state, identity-claim consume flow, and Stripe checkout webhook completion paths for upgrade/credit purchases. Verify run: `npm run typecheck`; `npm run lint`; `npm run test:unit` (45 files passed, 243 tests passed; lint warnings only). |
| `FOG-012` | `F` | 6 | `P1` | `DONE` | `FOG-005`, `FOG-007`, `FOG-011` | Final hardening, integration tests, and docs closeout for global onboarding rollout | `tests/*`; `docs/reference_docs/topic_collections/implementation/free-onboarding-global/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Done 2026-02-17: added lane-F rollout checklist (`ROLLOUT_CHECKLIST.md`) with channel kill switches, staged exposure, and rollback guardrails; added onboarding rollout guardrail tests (`tests/unit/ai/freeOnboardingRolloutGuardrails.test.ts`); resolved blocking typecheck drift in `src/contexts/builder-context.tsx` for lane closeout. Verify run: `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run docs:guard` (`test:unit`: 48 files passed, 252 tests passed; lint warnings only; docs guard passed). |

---

## Current kickoff

- Active task: none (lane `F` closeout complete through `FOG-012`).
- Next promotable task outside this lane scope: none (all lane tasks complete).
- Delivery objective: unify pre-auth chat behavior across Telegram, webchat, and native guest chat while preserving existing auth-protected product surfaces.
