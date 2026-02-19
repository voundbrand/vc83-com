# Free Onboarding Global Rollout Checklist

**Date:** 2026-02-17  
**Queue row:** `FOG-012`  
**Scope:** Final hardening and release closeout for Telegram, webchat, and `native_guest` onboarding channels.

---

## Preconditions

1. All `P0` queue tasks are `DONE` or `BLOCKED`.
2. Identity continuity stack is active (`anonymousIdentityLedger`, `anonymousClaimTokens`, authenticated claim endpoint).
3. Abuse controls are active on all public channels (`webchat`, `native_guest`, `telegram`).
4. Quinn onboarding template remains the active cross-channel onboarding router.

---

## Staged Exposure Plan

1. **Stage 0 (internal canary):** platform org only, validate end-to-end claim flow and conversion CTA rendering.
2. **Stage 1 (webchat first):** enable webchat placements for limited campaign traffic and monitor abuse/challenge rates.
3. **Stage 2 (native desktop guest):** expand native guest launcher availability after stage 1 stability.
4. **Stage 3 (telegram expansion):** increase Telegram onboarding traffic only after stage 1/2 quality gates hold.
5. **Stage 4 (full exposure):** all three channels active with shared funnel attribution monitoring.

---

## Channel Kill Switches and Rollback Paths

| Channel | Immediate kill switch | Rollback path |
|---|---|---|
| `webchat` | Disable `webchat` in active agent `channelBindings` and stop new widget exposure. Emergency fallback: edge block `POST /api/v1/webchat/message`. | Re-enable channel binding on a known-good active agent, verify `GET /api/v1/webchat/config/:agentId`, then re-open widget placements in small slices. |
| `native_guest` | Disable `native_guest` in active agent `channelBindings` (causes `/api/native-guest/config` to fail closed with 503). Emergency fallback: edge block `POST /api/v1/native-guest/message`. | Restore `native_guest` channel binding and confirm desktop config bootstrap plus message round-trip before relaunch. |
| `telegram` | Pause inbound at bot level (remove/disable Telegram webhook or disconnect custom bot binding) to halt new Telegram messages. | Restore webhook/binding, send controlled `/start` validation messages, then reopen traffic gradually by campaign/source. |

---

## Global Rollback Guardrails

1. Do not delete identity continuity data during rollback (`webchatSessions`, `anonymousIdentityLedger`, `anonymousClaimTokens`).
2. Keep claim consume endpoint active during rollback window so already-issued claim tokens can complete account linking.
3. Keep abuse signal logging enabled to preserve forensic visibility while channels are throttled or paused.
4. If channel binding drift is detected, re-seed the canonical onboarding agent/template before re-exposure.

---

## Monitoring and Go/No-Go Signals

1. Funnel events remain monotonic and attributable:
   - `onboarding.funnel.first_touch`
   - `onboarding.funnel.activation`
   - `onboarding.funnel.signup`
   - `onboarding.funnel.claim`
   - `onboarding.funnel.upgrade`
   - `onboarding.funnel.credit_purchase`
2. Abuse indicators remain within expected bands (challenge rate, blocked rate, repeated-message spikes).
3. Claim success rate for guest-to-auth continuity stays stable after each exposure stage.
4. Signed-in assistant flows remain unaffected (no auth-gate regressions for existing users).
