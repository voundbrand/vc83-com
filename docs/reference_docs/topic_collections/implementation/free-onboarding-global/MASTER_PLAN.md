# Free Onboarding Global V2 Master Plan

**Date:** 2026-02-25  
**Scope:** Implement Document 07 (dated 2026-02-24): onboarding-v2 rewrite where first touch is AI chat, beta codes auto-approve when valid, and onboarding is consistent across web/native/messaging channels.

---

## Mission

Deliver a deterministic onboarding-v2 runtime where operators:

1. experience AI immediately on entry (logged-out defaults to chat),
2. can activate instantly using valid beta codes,
3. remain supported via no-code manual approval when needed,
4. complete onboarding conversationally in business context first,
5. receive early lifecycle hooks (nurture/soul signals) without channel fragmentation.

### Marketing-to-Onboarding Entry Contract

To keep external messaging aligned with runtime behavior:

1. Public web CTA for current demos is `https://app.l4yercak3.com/` (root URL).
2. External landing-page copy should not send users to `/beta` pages.
3. Root entry must open AI chat first and capture beta code/signup conversationally.
4. Future `app.sevenlayers.io` cutover must preserve the same root-entry flow.

---

## Current code reality (2026-02-25)

1. Logged-out shell now opens AI chat by default (`FOG2-006` complete).
2. Guest AI chat runtime exists, but account creation remains primarily login-window form/OAuth flow.
3. Beta-code CRUD/redeem model is live and supports idempotent redemption records.
4. Email signup processes optional beta codes and auto-approves valid-code users.
5. OAuth signup state now carries beta code semantics and redeems valid codes for newly created OAuth users.
6. Soul/business mode defaults are already `work` (business), matching PRD intent.
7. Rollout control plane now supports migration between legacy manual approval and v2 beta-code auto-approve with an emergency kill switch.
8. Onboarding birthing still permits non-catalog creation surfaces; lane `G` (`FOG2-015`/`FOG2-016`) is the locked convergence scope to enforce clone-first catalog birthing, `isPrimary=true` first-clone behavior, capability-limit snapshots, and purchase-only custom-agent concierge escalation.

---

## Strategy pillars

1. **Activation parity:** one beta-code contract for web/native/messaging entry points.
2. **Approval clarity:** keep both paths explicit:
   - path 1: no code -> pending/manual approval,
   - path 2: valid code -> immediate approval.
3. **Conversation-first onboarding:** reduce form-first friction and keep onboarding inside chat.
4. **Business-context-first:** birth sequence defaults to business mode while private mode remains optional/teased.
5. **Safe rollout:** feature flags + rollback path to current beta gate behavior.
6. **Clone-first birthing:** onboarding should create agents by catalog clone activation with explicit capability limits, set `isPrimary=true` for the first successful clone when no primary exists in `orgId + userId`, and route no-fit outcomes to purchase-only custom-agent concierge (`€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`) instead of free-form builds.
7. **One-voice personalization north star:** onboarding should feel like one evolving operator relationship (Samantha-style first-meet cadence), where voice/tone/subtext preferences are customizable and internal routing mechanics stay hidden.

### Samantha onboarding reference cues

Reference transcript: `/Users/foundbrand_001/Development/vc83-com/docs/her_onboarding/Movie - HER, First meet OS1 (Operation System One, OS One, OS1).txt`

Apply these cues in operator-facing onboarding:

1. Start with short calibration questions that feel personal, not form-like.
2. Reflect inferred emotional signal carefully (for example: hesitance) and confirm with the operator.
3. Let the operator shape voice/style in their own words, not only preset options.
4. Keep one continuous assistant identity visible; treat specialist/template orchestration as fully under-the-hood.
5. Move from calibration directly into immediate practical help to establish momentum.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Beta-code backend contract and email signup integration | `A` | `FOG2-001`..`FOG2-003` |
| Phase 2 | OAuth parity and identity continuity for beta codes | `B` | `FOG2-004`..`FOG2-005` |
| Phase 3 | Chat-native web/native onboarding flow | `C` | `FOG2-006`..`FOG2-008` |
| Phase 4 | Messaging channel onboarding parity | `D` | `FOG2-009`..`FOG2-010` |
| Phase 5 | Nurture arc and soul/report hooks | `E` | `FOG2-011`..`FOG2-012` |
| Phase 6 | Rollout controls, hardening, closeout | `F` | `FOG2-013`..`FOG2-014` |
| Phase 7 | Catalog-clone birthing convergence | `G` | `FOG2-015`..`FOG2-016` |

---

## Delivery waves

1. **Wave 0 (active):** land beta code schema + APIs + email signup auto-approve (`FOG2-001`, `FOG2-002`).
2. **Wave 1:** OAuth parity + admin tooling (`FOG2-003`, `FOG2-004`, `FOG2-005`).
3. **Wave 2:** chat-first onboarding runtime parity across surfaces (`FOG2-007`, `FOG2-009`).
4. **Wave 3:** nurture/soul systems and production rollout control (`FOG2-011`..`FOG2-014`).

---

## Acceptance criteria

1. Valid beta code can be created/listed/updated/deactivated and validated publicly.
2. Email signup accepts optional beta code and auto-approves when valid.
3. No-code signup still routes to pending when global beta gate is enabled.
4. OAuth signup parity supports beta code (new accounts only).
5. Logged-out users land in AI chat first across refresh/entry.
6. Business mode remains default for initial onboarding context.
7. Rollout can be reversed quickly without data loss.
8. Onboarding-v2 birthing defaults to catalog clone activation with no operator-default free-form create path.
9. First successful clone sets `isPrimary=true` when no primary exists in `orgId + userId`.
10. Onboarding handoff shows capability-limit snapshot (`available now` vs `blocked`).
11. No-fit onboarding requests route to purchase-only custom-agent concierge with exact terms: `€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`.
12. Lane `G` convergence preserves `FOG2-013` rollout/kill-switch/rollback contracts unchanged.
13. Onboarding responses never expose internal runtime terms (`clone`, `template`, `specialist routing`, `orchestration layer`) in operator-facing copy.

---

## Non-goals (this workstream)

1. Full visual redesign of all onboarding surfaces in one step.
2. Replacing existing Stripe/billing architecture.
3. Rebuilding channel integrations outside onboarding-related entry logic.

---

## Risks and mitigations

1. **Approval-state regressions**
Mitigation: explicit tests for pending vs approved across gate/code combinations.

2. **Code redemption race conditions**
Mitigation: normalization, deterministic validation checks, idempotent redemption records.

3. **OAuth behavior drift**
Mitigation: isolate new beta-code fields in signup state; keep existing login path untouched.

4. **Channel inconsistency**
Mitigation: shared validation/redeem APIs and channel-specific adapters only.

5. **Rollout risk**
Mitigation: preserve manual-approval path and add feature-flagged cutover toggles.

6. **Birthing quality drift from free-form setup paths**
Mitigation: enforce clone-first catalog birthing contracts in onboarding, set `isPrimary=true` for first successful clone when no primary exists in `orgId + userId`, show capability-limit snapshots before activation, and route no-fit outcomes to purchase-only custom-agent concierge.

---

## Success metrics (execution)

1. Beta code validation success/error telemetry available by source channel.
2. Time-to-first-chat remains immediate for logged-out users.
3. Share of signups auto-approved via valid beta codes is measurable.
4. Manual approval queue remains functional for no-code signups.

---

## FOG2-013 Rollout + Rollback Runbook (Published 2026-02-25)

### Top rollout risks (preflight)

1. Accidental auto-approval for users who should remain in manual review.
2. Regression risk to Telegram/WhatsApp/Slack/SMS onboarding bootstrap and first-message latency telemetry.
3. Partial/ambiguous rollback states if gate/rollout/kill-switch toggles drift.

### Migration path from legacy manual beta gate to v2 auto-approve

1. Keep `betaAccessEnabled=true` if private beta gating should remain active for no-code signups.
2. Set rollout stage to `v2_beta_code_auto_approve` with kill switch off:
   - Admin UI: Super Admin -> Beta Access -> Onboarding Rollout Controls.
   - API mutation: `betaAccess.setBetaOnboardingRolloutControls({ rolloutStage: "v2_beta_code_auto_approve", killSwitchForceLegacyManualApproval: false })`.
3. Confirm policy state via `betaAccess.getBetaGatingStatus` and verify `rollout.effectiveRolloutStage === "v2_beta_code_auto_approve"`.
4. Monitor onboarding funnel telemetry (`onboarding.funnel.signup`, `onboarding.funnel.channel_first_message_latency`) and approval queue behavior during staged rollout.

### Emergency kill switch + rollback steps

1. Trigger kill switch immediately:
   - Admin UI: toggle `Kill Switch ON`.
   - API mutation: `betaAccess.setBetaOnboardingKillSwitch({ enabled: true })`.
2. Verify rollback took effect:
   - Query `betaAccess.getBetaGatingStatus` and confirm `rollout.effectiveRolloutStage === "legacy_manual_approval"`.
3. If full rollback is required, set configured stage back to legacy:
   - `betaAccess.setBetaOnboardingRolloutControls({ rolloutStage: "legacy_manual_approval", killSwitchForceLegacyManualApproval: true })`.
4. Keep channel handlers and first-message telemetry untouched; this rollback only changes signup approval policy.
5. Recovery after incident:
   - Toggle kill switch off first, then re-promote rollout stage to `v2_beta_code_auto_approve` only after validation checks pass.

---

## FOG2-014 Final Verification + Closeout (Published 2026-02-25, Re-validated 2026-02-25)

### Top closeout regression risks

1. Rollout-stage/kill-switch drift causing unintended auto-approval.
2. Regressions to Telegram/WhatsApp/Slack/SMS onboarding bootstrap or first-message latency telemetry.
3. Documentation drift that weakens launch execution and rollback response.

### Verification run record (executed exactly, in order)

1. `npm run typecheck` -> pass (exit `0`) after fixing optional `ctx.db` narrowing in `convex/ai/agentExecution.ts` (`resolveCrossOrgSoulReadOnlyEnrichment`).
2. `npm run lint` -> pass with `3261 problems (0 errors, 3261 warnings)`.
3. `npm run test:unit` -> pass with `Test Files 136 passed | 4 skipped (140)` and `Tests 665 passed | 80 skipped (745)`.
4. `npm run docs:guard` -> pass with `Docs guard passed.`

### Launch publication and contract validation

1. Published production acceptance checklist in `ROLLOUT_CHECKLIST.md` for `FOG2-014`.
2. Confirmed the kill-switch + rollback contract from `FOG2-013` is unchanged and remains the controlling runbook: `FOG2-013 Rollout + Rollback Runbook` (this file, section above).
3. Confirmed rollback remains approval-policy-only; Telegram/WhatsApp/Slack/SMS handlers and first-message latency telemetry contracts remain untouched.
4. Closeout state is `DONE`; lane `F` is fully complete with no promotable rows.

---

## FOG2-016 Regression + Runbook Closure (Published 2026-02-27)

### Scope closed

1. Added deterministic lane-G regression coverage for clone-first onboarding birthing:
   - first-successful-clone primary assignment guardrail (`isPrimary=true` only when no viable primary exists in `orgId + userId`),
   - one-visible-operator activation copy contract (hide internal routing terms),
   - capability-limit transparency contract (`ready now` vs `needs setup next`),
   - tone/communication-style personalization capture contract,
   - fallback messaging contracts for capability blocks and no-fit concierge escalation.
2. Synced lane-G runbook/docs artifacts (`TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, `SESSION_PROMPTS.md`, `ROLLOUT_CHECKLIST.md`) with final `DONE` state.
3. Preserved `FOG2-013` rollout/kill-switch/rollback contract unchanged (policy-only rollback; no Telegram/WhatsApp/Slack/SMS handler rewrites).

### Verification run record (executed exactly, in order)

1. `npm run typecheck` -> pass.
2. `npm run lint` -> pass with `3377 problems (0 errors, 3377 warnings)`.
3. `npm run test:unit` -> pass with `Test Files 164 passed | 4 skipped (168)` and `Tests 863 passed | 80 skipped (943)`.
4. `npm run docs:guard` -> pass with `Docs guard passed.`

---

## FOG2-003 Super Admin Beta Code Operations Surface (Published 2026-02-27)

### Scope closed

1. Added a dedicated Super Admin beta-code operations panel under the existing `Beta Access` tab while preserving current beta-gating and request moderation behavior.
2. Shipped required operations: filters (status/channel/source/code), inline edit/deactivate controls, batch code creation, and CSV export download.
3. Extended `convex/betaCodes.ts` list/export contracts with server-side `sourceDetail` + `codeSearch` filtering so UI filtering and CSV output stay aligned.
4. Preserved `FOG2-013` rollout/kill-switch/rollback behavior unchanged (policy-only rollback; no Telegram/WhatsApp/Slack/SMS handler rewrites).

### Verification run record (executed exactly, in order)

1. `npm run typecheck` -> pass (exit `0`).
2. `npm run lint` -> pass with `3377 problems (0 errors, 3377 warnings)`.

---

## Status snapshot

- `FOG2-006` complete: logged-out default AI chat entry is live.
- `FOG2-001` complete: beta-code schema, CRUD service, internal validate/redeem contract, and public validate endpoint are live.
- `FOG2-002` complete: email signup now accepts optional beta code and applies auto-approve while preserving manual pending path when no code is present.
- `FOG2-003` complete: Super Admin `Beta Access` now includes beta-code operations (filters, inline edit/deactivate, batch create, CSV export), backed by server-side list/export filter parity in `convex/betaCodes.ts`, with existing gating/request behavior kept intact.
- `FOG2-004` complete: OAuth signup now carries beta code state and auto-approves/redeems for newly created OAuth users only.
- `FOG2-005` complete: redemption analytics (channel/source/device), idempotent funnel activation emit, and admin aggregate reporting query landed.
- `FOG2-007` complete: guest AI chat now supports in-chat beta code prompt plus direct OAuth/email signup initiation with continuity-token carry-through for email signup.
- `FOG2-008` complete: onboarding now enforces business-context-first birthing prompts, compilation-reveal contract guidance at confirmation, and guest copy that preserves chat-first continuity while keeping deeper private context as a later teaser.
- `FOG2-009` complete: first-message beta code bootstrap/validation is live across Telegram, WhatsApp, Slack, and SMS routing.
- `FOG2-010` complete: connected-channel first-message latency metrics + post-birth channel connect prompts are live.
- `FOG2-011` complete: Day 0-3 nurture scheduler and first-win (<24h) SLA tracking are live with per-user journey state.
- `FOG2-012` complete: Day 3 Soul Report generation and Day 5 specialist preview timer contracts are live with data-backed/channel-safe gates.
- `FOG2-013` complete: rollout stage controls and emergency kill switch are live, signup paths now resolve approval through a centralized rollout policy, and migration/rollback runbook is published.
- `FOG2-014` complete: typecheck blocker was fixed in `convex/ai/agentExecution.ts`, final verification passed in required order, launch checklist remains published, and lane `F` closeout docs are synchronized.
- `FOG2-015` complete: onboarding-v2 clone-first birthing convergence is live in handoff/runtime contracts (catalog-clone-only kickoff framing, capability-limit snapshot payload plumbing, owner-context first-clone primary assignment in worker-pool lifecycle, and purchase-only concierge copy with exact terms).
- `FOG2-016` complete: regression coverage + operator runbook closure are complete for clone-first onboarding birthing (`isPrimary=true` first-successful-clone behavior in `orgId + userId`, capability-limit transparency, one-visible-operator copy contracts, tone/communication-style personalization capture, and no-fit fallback messaging with purchase-only concierge terms), while rollback policy boundaries remain unchanged.
