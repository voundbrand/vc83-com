# Multi-Provider BYOA Channel Runtime Master Plan

**Date:** 2026-02-19  
**Scope:** Final experience convergence pass to expose voice-first agent creation and soul-binding onboarding on top of completed multi-provider channel runtime foundations.

---

## Mission

Deliver the promised first-run experience: users can create and train an agent in under 15 minutes, then deploy it to webchat and/or Telegram without leaving a coherent native flow.

---

## Founder notes snapshot (2026-02-19)

Current gaps called out directly:

1. `Brain Voice` is exposed in shell menus, but this is not the desired product surface.
2. Agents `Create Agent` flow opens an empty setup wizard.
3. Voice-first UI is not discoverable as the primary creation surface.
4. Soul-binding (recursive interview + training) exists but is not clearly exposed to users.
5. Welcome promise says setup is fast, but launch flow does not yet deliver that path immediately.
6. Deploy handoff to webapp/Telegram should be part of onboarding completion, not a disconnected follow-up.

---

## Baseline already completed (kept, not re-scoped)

1. Multi-provider BYOA channel security/routing hardening (`MPB-001`..`MPB-014`) is complete except external typecheck blocker on `MPB-009`.
2. Voice runtime + adaptive interview primitives are complete in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation`.
3. Trust/soul artifact and consent contracts are complete in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience`.
4. Free onboarding channel parity is complete in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global`.
5. Webchat deployment UI contract exists in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui`.

This extension only addresses presentation, discoverability, and end-to-end onboarding orchestration.

---

## Experience contract (must ship)

### First 15-minute flow

1. User lands in welcome shell and sees one primary CTA: `Create my agent`.
2. CTA opens a guided setup (not empty wizard) with two entry modes: `Talk` and `Type`.
3. Flow launches a tall mobile-friendly voice/chat canvas with a live animated voice orb and transcript panel.
4. Soul-binding checkpoints (`capture`, `summary`, `consent`, `save`) are visible and resumable.
5. User can train one-on-one or switch to team training mode in the same canvas.
6. Completion screen offers immediate deployment choices: `Deploy to Webchat`, `Deploy to Telegram`, or `Both`.
7. On selection, channel setup packets and next actions are surfaced inline, then route to deployment surfaces.

### IA contract

1. Remove `Brain Voice` from Product menu and All Apps primary menus.
2. Keep trust/voice capabilities behind one canonical creation surface.
3. Keep deep-link compatibility for existing routes while redirecting menu pathways.

### MPB-015 contract freeze (2026-02-24)

1. **Route contract (frozen)**
   - Keep `app=brain-voice` deep links valid for existing shell URLs and restored windows.
   - Keep window IDs stable in registry (`ai-assistant`, `brain-voice`, `agents-browser`).
   - Route all primary creation discovery to `app=agents-browser` instead of `brain-voice`.
2. **Product menu contract (frozen)**
   - `Brain Voice` is removed from primary Product menu discovery pathways (desktop + mobile launcher variants).
   - `AI Agents` remains the canonical creation discovery entry.
3. **All Apps contract (frozen)**
   - `Brain Voice` is removed from browse/search/popular/new primary All Apps pathways.
   - Hidden-primary-surface apps remain route-compatible if opened by existing deep links.
4. **Create Agent wizard contract (frozen)**
   - `Create Agent` first step is deterministic guided quickstart, not an empty wizard.
   - Quickstart must present two explicit launch modes on first step: `Talk` and `Type`.
   - `Talk` launches guided assistant creation context; `Type` opens deterministic form-first setup path.

---

## Architecture slices for this final pass

| Slice | Requirement | Primary surfaces/files | Queue owner |
|---|---|---|---|
| Shell IA convergence | Remove unwanted Brain app/menu exposure and establish one primary creation entry | `src/app/page.tsx`; `src/hooks/window-registry.tsx`; `src/components/window-content/all-apps-window.tsx` | Lane `F` |
| Setup wizard replacement | Replace empty agent wizard with deterministic guided setup starter | `src/components/window-content/agents/*`; onboarding launch hooks | Lane `F` |
| Voice canvas launch | Ship tall responsive chat+voice window with animated orb and transcript controls | `src/components/window-content/ai-chat-window/*`; `src/components/interview/*`; voice hooks | Lane `G` |
| Soul-binding exposure | Make recursive interview/training explicit in first-run and ongoing training entry points | `src/components/interview/*`; `convex/ai/interviewRunner.ts`; trust surfaces | Lane `G` |
| Deploy handoff | Bind onboarding completion to webchat/Telegram deployment setup cards | `src/components/window-content/web-publishing-window/*`; channel integrations surfaces | Lane `H` |
| Messaging and promise alignment | Ensure welcome messaging and CTA copy align with real launch path | `src/app/page.tsx`; welcome/assistant components | Lane `H` |

---

## Phase-to-lane mapping (extension)

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 6 | Shell IA + setup entry convergence | `F` | `MPB-015`..`MPB-017` |
| Phase 7 | Voice canvas + soul-binding exposure | `G` | `MPB-018`..`MPB-019` |
| Phase 8 | Deploy handoff + hardening closeout | `H` | `MPB-020`..`MPB-022` |

---

## Rollout strategy for final UX pass

1. Stage 0: Keep new creation surface behind feature flag while validating desktop + mobile parity.
2. Stage 1: Enable for internal orgs only; monitor trust checkpoint completion and drop-off points.
3. Stage 2: Enable for canary external orgs; validate deployment completion rates (webchat/Telegram).
4. Stage 3: Promote to default onboarding path and remove legacy empty wizard launch entry.
5. Rollback path: revert primary CTA routing to prior stable assistant window while preserving underlying trust artifacts.

---

## Acceptance criteria

1. No primary Product menu or All Apps entry labeled `Brain Voice`.
2. `Create Agent` no longer opens an empty wizard.
3. Voice-first creation UI is immediately discoverable and works on desktop + mobile layouts.
4. Soul-binding/trust interview is clearly exposed in the user path with explicit consent checkpoints.
5. Users can complete onboarding and launch deployment to webchat and/or Telegram in one flow.
6. Welcome promise of rapid setup is reflected in live UI copy and routed behavior.
7. Verification profile and `npm run docs:guard` pass before closeout.

---

## Non-goals

1. Re-implementing completed provider security/runtime contracts from phases 1-5.
2. Changing trust artifact schema (`trust-artifacts.v1`) in this pass.
3. Building new provider channels beyond existing webchat + Telegram onboarding/deploy paths.

---

## Status snapshot

1. `MPB-001`..`MPB-014`: complete baseline and runtime hardening (with known external blocker captured on `MPB-009`).
2. `MPB-015`: `DONE` (contract freeze locked on 2026-02-24 with docs guard pass).
3. `MPB-016`: `DONE` (Brain Voice removed from primary Product menu + All Apps discovery while deep-link compatibility retained).
4. `MPB-017`: `DONE` (Create Agent now starts with deterministic `Talk`/`Type` quickstart).
5. `MPB-018`: `DONE` (Interview runner now ships tall responsive voice/chat canvas with animated orb states, transcript stream, and typed fallback using existing voice runtime adapter).
6. `MPB-019`: `DONE` (Selector and runner now expose explicit soul-binding recursion modes: `first-run`/`ongoing` and `one-on-one`/`team`, while keeping consent checkpoints explicit and trust-artifact schema untouched).
7. `MPB-020`..`MPB-022`: `DONE` (lane `H` deploy handoff + messaging alignment + closeout hardening completed; docs synchronized and regression checklist published in `UX_REGRESSION_CHECKLIST.md`).
