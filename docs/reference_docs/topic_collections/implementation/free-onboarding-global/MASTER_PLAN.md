# Free Onboarding Global Master Plan

**Date:** 2026-02-17  
**Scope:** Align Telegram, webchat, and native AI chat into one global free-token onboarding funnel that converts anonymous users into paid org customers.

---

## Mission

Deliver one consistent lead-magnet experience where users can:

1. try platform agents for free before account creation,
2. keep continuity when they create/login to an account,
3. convert in-flow to paid plan upgrades, credit purchases, and sub-account setup.

---

## Current state in this codebase

1. Telegram onboarding is strong: unknown chat IDs are routed to Quinn (system bot), and existing users can link by email code or dashboard deep link.
2. Webchat has public endpoints and anonymous sessions, but config lookup currently checks `type === "agent"` while the active ontology uses `type === "org_agent"`.
3. Native AI chat is authenticated-only today (`useAIChat` throws when user/org missing), and desktop entrypoints are auth-gated.
4. `complete_onboarding` can create an org/agent for Telegram-first users without creating a platform user, so a later claim/link step is required.
5. Onboarding conversion tooling now supports account-creation handoff, sub-account flow entry, plan upgrade checkout, and credit-pack checkout with channel-safe CTA payloads.

---

## Option set

| Option | Description | Pros | Cons |
|---|---|---|---|
| `A` (recommended) | Unified pre-auth identity contract across channels with claim/link after signup | One funnel, one analytics model, reusable onboarding tools, least channel drift | Requires schema + linking work and careful abuse controls |
| `B` | Keep separate onboarding logic per channel (Telegram path, webchat path, native path) | Fast incremental channel changes | Duplicated logic, inconsistent conversion UX, high maintenance |
| `C` | Keep native auth-gated; only Telegram/webchat as lead magnet | Minimal native changes | Breaks “native should work the same,” weak desktop conversion path |

### Recommendation

Adopt **Option A**. It best matches the product goal of globally consistent free onboarding and makes future channel additions cheaper.

---

## Strategy pillars

1. **Channel parity:** all inbound chat channels route through the same runtime semantics and onboarding router.
2. **Identity continuity:** anonymous/Telegram-first sessions can be claimed by signed-in users without losing conversation context.
3. **In-chat conversion:** onboarding agents can trigger account creation, sub-account setup, plan upgrade, and credit purchase CTAs safely.
4. **Controlled abuse:** free-token access stays useful for real users without becoming a spam or cost sink.
5. **Attribution and learning:** funnel events are measurable end-to-end by channel and campaign.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Runtime/channel contract parity | `A` | `FOG-001`..`FOG-003` |
| Phase 2 | Anonymous + Telegram claim/linking | `B` | `FOG-004`..`FOG-005` |
| Phase 3 | Onboarding conversion tools and prompts | `C` | `FOG-006`..`FOG-007` |
| Phase 4 | Native/webchat UX handoff and conversion surfaces | `D` | `FOG-008`..`FOG-009` |
| Phase 5 | Abuse controls + analytics instrumentation | `E` | `FOG-010`..`FOG-011` |
| Phase 6 | Hardening and release closeout | `F` | `FOG-012` |

---

## Delivery waves

1. **Wave 0:** finish lane `A` contract fixes so all channels can safely share onboarding runtime semantics.
2. **Wave 1:** build identity claim/linking (`B`) and conversion tooling (`C`) in parallel.
3. **Wave 2:** ship native/webchat UX handoff updates (`D`) with anti-abuse guardrails (`E`).
4. **Wave 3:** run full verification and rollout hardening (`F`).

---

## Acceptance criteria

1. Telegram, webchat, and native guest chat can all start free onboarding without auth.
2. Guest/Telegram-first conversation context can be claimed after signup/login.
3. Onboarding agent can guide users through account creation, sub-account setup, upgrade, and credit purchase flows.
4. Native signed-in AI Assistant behavior remains stable and does not regress.
5. Abuse protections are enforced with measurable false-positive/false-negative monitoring.
6. Funnel analytics capture key stages: first message, qualified lead, signup, claim, upgrade, credit purchase.
7. Queue verification commands pass for completed rows, including `npm run docs:guard`.

---

## Non-goals

1. No redesign of Stripe pricing architecture.
2. No broad refactor of unrelated desktop windows.
3. No replacement of current Telegram linking paths (Path A email verification, Path B deep link); only extension and unification.

---

## Program risks and mitigations

1. **Identity collisions or incorrect session claims**
Mitigation: signed one-time claim tokens, explicit ownership checks, auditable linking logs.

2. **Abuse/spam cost spikes on public channels**
Mitigation: layered rate limits (IP/device/channel), challenge escalation, dynamic throttling, anomaly alerting.

3. **Conversion UX fragmentation between channels**
Mitigation: shared conversion tool payload contract plus channel-specific render adapters only.

4. **Auth-gate regressions in existing signed-in workflows**
Mitigation: keep gated actions unchanged; add guest flow as additive path with feature flags.

---

## Success metrics

1. Lead-to-signup conversion rate by channel.
2. Signup-to-paid conversion rate within 7 days.
3. Credit purchase attach rate for free-tier orgs.
4. Mean time from first message to first “value moment” (agent useful answer).
5. Abuse block precision (false positives below target threshold).

---

## Status snapshot

- Discovery baseline is complete (`FOG-001` `DONE`).
- Lane `A` contract/runtime parity is complete (`FOG-002`..`FOG-003` `DONE`).
- Lane `B` identity continuity is complete (`FOG-004`..`FOG-005` `DONE`).
- Lane `C` conversion tooling and global funnel prompt/template updates are complete (`FOG-006`..`FOG-007` `DONE`).
- Lane `D` native + web conversion UX is complete (`FOG-008`..`FOG-009` `DONE`).
- Lane `E` abuse controls + funnel instrumentation is complete (`FOG-010`..`FOG-011` `DONE`).
- Lane `F` hardening and release closeout is complete (`FOG-012` `DONE`): queue verify suite passed (`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`), rollout checklist published in `ROLLOUT_CHECKLIST.md`, and onboarding rollout guardrail unit coverage added.
