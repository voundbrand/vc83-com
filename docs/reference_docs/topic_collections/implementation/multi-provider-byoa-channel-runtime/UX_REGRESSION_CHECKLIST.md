# Lane H UX Regression Checklist

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`  
**Last updated:** 2026-02-24  
**Closeout task:** `MPB-022`

---

## Purpose

Keep lane `H` (deploy handoff + messaging + closeout) release-safe after `MPB-020`..`MPB-022`.

Guardrails:

1. Keep BYOA security boundaries unchanged.
2. Keep first-run promise aligned with delivered behavior.
3. Keep onboarding completion deploy handoff deterministic (`Webchat` / `Telegram` / `Both`).

---

## Regression checks

| Area | Check | Expected result |
|---|---|---|
| Onboarding completion | Completion surface renders `Deploy to Webchat`, `Deploy to Telegram`, and `Deploy to Both` choices | All 3 actions visible and clickable |
| Deploy routing (webchat) | `Deploy to Webchat` opens `webchat-deployment` window/tab | Web Publishing opens on `webchat-deployment` panel |
| Deploy routing (telegram) | `Deploy to Telegram` opens Integrations with Telegram selected | Integrations window opens Telegram settings panel |
| Deploy routing (both) | `Deploy to Both` opens both handoff surfaces without blocking | Webchat deployment + Telegram settings both available |
| Inline setup packets | Selected deploy option shows inline setup packet steps | Packet instructions visible for chosen channel(s) |
| Welcome promise | Welcome/launch copy states voice-first `Talk`/`Type` path and deploy follow-through | No mismatch between promise and first-run flow |
| Timing promise | Copy presents "~15 minute" setup as a target, not guaranteed instant deployment | Copy remains realistic and consistent |
| BYOA boundary integrity | No lane `H` changes to provider credential/routing verification contracts | No edits to `convex/channels/*` security logic |

---

## Verification profile (closeout baseline)

Run exactly:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run docs:guard`

Recorded closeout outcome (2026-02-24):

1. `typecheck`: passed.
2. `lint`: passed with existing warnings.
3. `test:unit`: passed.
4. `docs:guard`: passed.
