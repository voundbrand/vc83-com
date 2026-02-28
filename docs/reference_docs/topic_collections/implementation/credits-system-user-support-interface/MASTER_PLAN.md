# Credits System & User Support Interface Master Plan

**Date:** 2026-02-20  
**Scope:** Deliver a unified credits + support experience from the top-right shell navigation, including code redemption, platform-level referrals, structured feedback, and an AI support agent with deterministic escalation.

---

## Mission

Ship a production-safe credit and support system where:

1. users always see accurate credit totals and bucket breakdowns (`gifted`, `monthly`, `purchased`),
2. growth loops (referrals + redemption) are reusable platform capabilities, not one-off hardcoded flows,
3. support intake starts with AI but reliably escalates to human support with full context,
4. all new UX and copy ship with six-locale parity and security controls.

---

## Execution status (2026-02-22)

1. Lane `A` (`CSI-001`..`CSI-003`) is complete:
   - canonical gifted/monthly/purchased contract + compatibility bridge shipped,
   - gifted/monthly/purchased ledger writes now support idempotency + immutable reasons + explicit expiry metadata,
   - deterministic API contracts are live via `GET /api/credits/balance` and `GET /api/credits/history`.
2. Lane `B` (`CSI-004`..`CSI-006`) is complete:
   - redemption code lifecycle + targeting + usage-cap schema/services are active,
   - redeem flow is live via `POST /api/credits/redeem` with rate limits and fail-closed identity/eligibility handling,
   - super-admin code creation/revocation + redemption analytics surfaces are integrated in the organizations window.
3. Lane `C` (`CSI-007`..`CSI-009`) is complete:
   - top-right credits counter/dropdown now sits adjacent to avatar with deterministic loading/empty states and preserved keyboard navigation,
   - dropdown actions now route to redeem, buy-credits, and refer flows with reopen-safe window targeting,
   - store credits activity history now shows backend-aligned reason/source labels and purchase-result messaging is strengthened.
4. Lane `D` (`CSI-010`..`CSI-012`) is complete:
   - platform referral program settings now drive target organization routing (fail-closed when missing/inactive),
   - signup attribution and reward lifecycle now grant both users (`$5` signup, `$20` subscription) with self-referral blocking and `$200/month` cap enforcement,
   - subscription rewards are gated to payment-confirmed webhook states,
   - referral UI now ships with copyable `/ref/{code}` link, progress meter, rules, and capped projection calculator.
5. Lane `E` (`CSI-013`..`CSI-015`) is complete:
   - feedback modal now captures tri-state sentiment (`negative`, `neutral`, `positive`) and freeform message content,
   - feedback payloads include runtime/user/org context with support-mailbox-only routing safeguards (sales mailbox bypass prevention),
   - support intake UI now includes system-status, product/account selectors, and explicit support vs community vs enterprise sales paths.
6. Lane `F` (`CSI-016`..`CSI-018`) is complete:
   - support agent runtime now injects deterministic support policy with prompt-injection signal handling and trigger-based support knowledge docs (troubleshooting, pricing/billing, escalation contract),
   - support chat/escalation endpoints now enforce deterministic escalation criteria and create auditable support tickets (`SUP-*`) on every escalation path,
   - support quality telemetry now reports AI-resolved vs human-escalated outcomes, escalation status breakdown, conversation length, and sentiment trend buckets in a super-admin quality dashboard.
7. Lane `G` (`CSI-019`..`CSI-021`) is complete:
   - six-locale parity wiring is now in place across credits/redeem/referral/feedback/support shell surfaces with new translation seed coverage,
   - fraud/safety hardening now adds multi-key redeem/referral throttling, referral abuse checks (self-referral, duplicate-org attribution, velocity gating), support chat abuse filters, and role-gated forced escalation,
   - migration/backfill + rollback playbooks, launch checklist, and feature-flag ownership matrix are published below for cutover operations.

---

## Confirmed product decisions

1. **Top-right entry point:** credits counter appears next to avatar and opens a dropdown with breakdown + actions.
2. **Credit bucket model:** gifted credits are distinct from monthly and purchased pools.
3. **Referral architecture:** referral program is implemented as platform-level reusable benefits configuration.
4. **Scope rule:** referral and redemption gifts apply to personal scope unless explicitly configured otherwise.
5. **Escalation contract:** AI support is first-line; unresolved cases become support tickets with auditable references.
6. **Role boundary:** super-admin-only controls for platform-managed code issuance and restricted exports.
7. **Canonical consumption order:** `gifted -> monthly -> purchased` at contract level, with legacy daily credits treated as gifted-compatible for backward compatibility.
8. **Compatibility bridge:** existing org-level balances and transactions remain valid while gifted/personal metadata rolls out via additive fields.

---

## Current-state anchor (existing code surfaces)

1. Credit ledger currently exists with org-level tables and transactions in `/Users/foundbrand_001/Development/vc83-com/convex/schemas/creditSchemas.ts` and `/Users/foundbrand_001/Development/vc83-com/convex/credits/index.ts`.
2. Store purchase flow is already integrated with Stripe in `/Users/foundbrand_001/Development/vc83-com/convex/stripe/creditCheckout.ts` and `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx`.
3. Top navigation and avatar menu are driven from `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx` and `/Users/foundbrand_001/Development/vc83-com/src/components/taskbar/top-nav-menu.tsx`.
4. Feedback action path exists in `/Users/foundbrand_001/Development/vc83-com/convex/feedback.ts` and `/Users/foundbrand_001/Development/vc83-com/convex/actions/feedbackEmail.ts` and needs UX/context expansion.
5. Ticket primitives and AI tooling for support-like workflows already exist (`/Users/foundbrand_001/Development/vc83-com/convex/ticketOntology.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/internalToolMutations.ts`).

---

## Target architecture

## 1) Credits domain

1. Extend the current credit ledger contract to include explicit gifted-credit tracking and deterministic source reasons.
2. Keep immutable transaction records with idempotency keys for all grants/deductions.
3. Preserve existing org-level consumption behavior while introducing personal-scope credit records for referral/redeem grants.
4. Consumption order remains deterministic and documented as `gifted -> monthly -> purchased`.

## 2) Redemption domain

1. Add redemption code entities with:
   - `creditAmount`
   - `expiresAt`
   - `maxUses/currentUses`
   - targeting restrictions (`tiers`, `userIds`, `orgIds`)
   - lifecycle status (`active`, `revoked`, `expired`, `exhausted`)
2. Enforce rate limiting + anti-brute-force checks in redeem endpoint.
3. Record every redemption event into ledger/history for audit and analytics.

## 3) Referral domain (platform-reusable)

1. Route referral program through platform benefits configuration; no hardcoded org IDs.
2. Track attribution from referral URL and conversion lifecycle:
   - signup reward: `$5` each
   - subscription reward: `$20` each
3. Enforce monthly cap (`$200`) per referrer with deterministic refusal behavior once cap is reached.
4. Delay subscription rewards until payment success confirmation (webhook-backed).
5. Add anti-fraud checks (self-referral/device-pattern checks) and abuse telemetry.

## 4) Feedback and support intake

1. Replace star-style feedback UX with sentiment tri-state (`negative`, `neutral`, `positive`) + text area.
2. Include footer CTA to support case flow.
3. Send feedback email to support recipient with context payload:
   - user, org, page, timestamp, sentiment, message.
4. Keep sales contact as a separate enterprise path.

## 5) AI support agent

1. Build support-specific AI agent profile seeded with:
   - product documentation
   - pricing/billing references
   - integration setup and troubleshooting guides
2. Support deterministic intake context:
   - selected product
   - selected account/org
   - active page and user tier hints
3. Add escalation path that creates a support ticket with transcript summary and metadata.
4. Track quality metrics (AI resolution rate, escalation rate, common failure themes).

---

## API contract plan

## Credits

1. `GET /api/credits/balance`
2. `GET /api/credits/history`
3. `POST /api/credits/redeem`

## Admin codes

1. `POST /api/admin/codes/create`
2. `GET /api/admin/codes`
3. `PATCH /api/admin/codes/:id`
4. `GET /api/admin/codes/:id/usage`

## Referrals

1. `GET /api/referrals/link`
2. `GET /api/referrals/stats`
3. `POST /api/referrals/track`
4. `GET /api/referrals/calculator`

## Feedback + support

1. `POST /api/feedback/submit`
2. `POST /api/support/chat`
3. `GET /api/support/chat/:sessionId`
4. `POST /api/support/escalate`

---

## UX composition plan

1. **CreditsCounter (top-right taskbar):** live total + dropdown trigger.
2. **CreditsDropdown:** bucket breakdown and action buttons (`Redeem Code`, `Buy Credits`, `Refer`).
3. **RedeemCodeModal:** input, validation, result messaging.
4. **ReferralModal:** unique share link, monthly progress bar, rules, calculator.
5. **FeedbackModal:** sentiment buttons + multiline feedback + support CTA.
6. **SupportModal:** system status, community/sales shortcuts, product/account selectors, AI chat, escalation.

---

## Localization plan

1. This codebase already exposes six supported locales in `/Users/foundbrand_001/Development/vc83-com/src/contexts/translation-context.tsx`: `en`, `de`, `pl`, `es`, `fr`, `ja`.
2. All new UI strings for credits/referrals/feedback/support must ship in those six locales.
3. Backend response templates and support-facing copy must avoid locale drift.
4. Validation includes `npm run i18n:audit`.

---

## Security and abuse controls

1. Rate limit redeem and support chat endpoints.
2. Enforce fail-closed eligibility checks for code redemption and referral rewards.
3. Detect self-referrals and suspicious reward velocity.
4. Require verified payment completion before subscription reward.
5. Apply content safety + prompt-injection defenses in support agent runtime.
6. Emit trust/audit events for privileged admin operations.
7. Keep super-admin-only gates for platform-level issuance/export controls.

---

## Implementation phases

1. **Phase 1:** ledger contract + API baseline (`CSI-001`..`CSI-003`)
2. **Phase 2:** redemption backend/admin (`CSI-004`..`CSI-006`)
3. **Phase 3:** top-right credits UX and action routing (`CSI-007`..`CSI-009`)
4. **Phase 4:** reusable referral system + calculator UI (`CSI-010`..`CSI-012`)
5. **Phase 5:** feedback + support intake surfaces (`CSI-013`..`CSI-015`)
6. **Phase 6:** AI support agent + escalation runtime (`CSI-016`..`CSI-018`)
7. **Phase 7:** i18n/security hardening + migration/rollback closeout (`CSI-019`..`CSI-021`)

---

## Validation profile

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run test:model`
6. `npm run test:e2e:desktop`
7. `npm run test:e2e:mobile`
8. `npm run i18n:audit`
9. `npm run docs:guard`

---

## Exit criteria

1. Credits counter/dropdown is active in top-right nav and reflects deterministic bucket totals.
2. Redemption and referral rewards write auditable ledger transactions with policy enforcement.
3. Referral program is platform-configured and reusable across organizations.
4. Feedback flow routes to support mailbox with full context payload.
5. AI support agent can resolve common cases and escalate unresolved cases to human tickets.
6. Security checks and role gates are enforced for abuse-prone paths.
7. All four workstream docs stay synchronized and docs guard passes.

---

## Feature-flag strategy (Lane G closeout)

1. `credits.shell_counter_v1`: gates top-right credits counter + dropdown actions.
2. `credits.redeem_modal_v1`: gates redeem-code window flow from shell and mobile launcher.
3. `credits.referral_program_v1`: gates referral dashboard/profile generation and `/ref/{code}` routing.
4. `support.intake_v1`: gates support intake panel and AI handoff metadata wiring.
5. `support.escalation_v1`: gates deterministic escalation endpoint + support-ticket creation path.
6. `support.hardening_v1`: gates chat abuse filters, support throttles, and force-escalation role gates.

**Promotion order:** 1) enable flags internally for super-admin org, 2) enable for staff sandbox orgs, 3) enable for a canary customer cohort, 4) complete full rollout after 24h no-critical incidents.

---

## Migration and backfill playbook

1. Confirm preflight:
   - `npm run typecheck`
   - `npm run test:unit`
   - `npm run test:integration`
   - `npm run docs:guard`
2. Seed locale coverage:
   - run `npx convex run translations/seedCreditsSupportI18nCoverage:seedCreditsSupportI18nCoverage`.
3. Backfill referral profiles for users missing referral codes:
   - run `npx convex run credits/index:ensureReferralProfile` per active user session context or batch through internal ops runner.
4. Verify referral program configuration:
   - ensure `platform_referral_program` setting has active `targetOrganizationId`, reward amounts, and share-path prefix.
5. Validate redemption lifecycle readiness:
   - ensure active codes have canonical status, expiry, and cap metadata.
6. Validate support escalation readiness:
   - confirm support mailbox routing and ticket creation path are healthy before enabling `support.escalation_v1`.

**Post-backfill validation:** query credits balance/history and referral stats for deterministic bucket totals and capped reward behavior.

---

## Rollback playbook

1. Immediate containment (T+0):
   - disable `support.hardening_v1` and `support.escalation_v1` if false-positive filters or escalation churn spikes.
   - disable `credits.referral_program_v1` if referral abuse or reward misattribution is detected.
   - disable `credits.redeem_modal_v1` if redeem endpoint error rates exceed threshold.
2. Data safety checks (T+5m):
   - inspect last hour of `referralAttributions`, `referralRewardEvents`, and `creditCodeRedemptions`.
   - verify idempotency keys prevent duplicate reward/redemption writes.
3. Service rollback (T+15m):
   - restore previous stable deployment for Convex API handlers if endpoint-level regression persists.
4. Reconciliation (T+30m):
   - generate ledger diff for affected orgs/users and apply compensating gifted adjustments where required.
5. Recovery exit criteria:
   - incident owner signs off when error rates, escalation quality, and abuse metrics are back inside SLO guardrails.

**Deterministic rollback triggers:** `5xx > 2%` for `/api/credits/redeem` or `/api/support/chat`, referral reward duplication signal > 0, support false-positive abuse blocks > 5% of chat attempts, or forced escalations attempted by non-super-admin users.

---

## Launch checklist and ownership matrix

1. Engineering owner: verify flag state, endpoint health, and migrations complete.
2. Support owner: verify escalation ticket flow and support mailbox delivery.
3. Risk owner: verify referral/redeem abuse telemetry and throttle behavior.
4. Localization owner: verify six-locale parity for `en`, `de`, `pl`, `es`, `fr`, `ja`.
5. QA owner: execute desktop/mobile smoke checks for credits, redeem, refer, feedback, and support intake.
6. Release owner: approve rollout wave progression and rollback readiness.
