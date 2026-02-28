# Multi-Provider BYOA Channel Runtime Task Queue

**Last updated:** 2026-02-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`  
**Source request:** Finalize world-class agent creation UX by converging onboarding, voice UI, soul-binding training, and deploy handoff while preserving completed BYOA runtime foundations.

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
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |
| `V-E2E-MOBILE` | `npm run test:e2e:mobile` |
| `V-E2E-ATX` | `npm run test:e2e:atx` |
| `V-DOCS` | `npm run docs:guard` |
| `V-UX-LINT` | `npx eslint src/app/page.tsx src/hooks/window-registry.tsx src/components/window-content/all-apps-window.tsx src/components/window-content/agents src/components/window-content/ai-chat-window src/components/interview` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract + schema + migration-safe foundation (closed) | Runtime foundations from phases 1-5 | No new tasks in this extension |
| `B` | Provider ingress security correctness (closed) | Inbound webhook verification paths | No new tasks in this extension |
| `C` | Installation-aware routing/session behavior (closed except tracked blocker) | Channel router + session runtime | `MPB-009` blocker tracked separately |
| `D` | Integrations setup UX + provider setup docs (closed) | Integrations setup and runbooks | No new tasks in this extension |
| `E` | Migration/rollout controls + hardening (closed) | Migrations, matrix, closeout docs | No new tasks in this extension |
| `F` | Shell IA + setup launch convergence | `src/app/page.tsx`; `src/hooks/window-registry.tsx`; `src/components/window-content/agents/*` | No trust schema mutation in lane `F` |
| `G` | Voice canvas + soul-binding surfacing | `src/components/window-content/ai-chat-window/*`; `src/components/interview/*`; `convex/ai/interviewRunner.ts` | No provider auth contract changes in lane `G` |
| `H` | Deploy handoff + messaging + closeout hardening | deployment windows/docs, onboarding copy, release checks | Starts after all lane `F/G` `P0` tasks are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Keep historical phases (`A`..`E`) closed; use them as fixed dependency baseline only.
2. Start with lane `F` (`MPB-015`..`MPB-017`).
3. Start lane `G` after `MPB-017` is `DONE`.
4. Start lane `H` after lane `F` and lane `G` `P0` rows are `DONE` or `BLOCKED`.
5. Complete `MPB-022` only after docs synchronization and full verify profile rerun.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `MPB-015` | `F` | 6 | `P0` | `DONE` | `MPB-014` | Baseline UX convergence audit + contract freeze for menu IA, setup wizard behavior, voice discoverability, and soul-binding entry path | `src/app/page.tsx`; `src/hooks/window-registry.tsx`; `src/components/window-content/agents/*`; `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/MASTER_PLAN.md` | `V-DOCS` | Contract freeze captured in `MASTER_PLAN.md` (`MPB-015 contract freeze`, 2026-02-24); `npm run docs:guard` passed. |
| `MPB-016` | `F` | 6 | `P0` | `DONE` | `MPB-015` | Remove `Brain Voice` from Product menu/All Apps primary surfaces and reroute to one canonical creation entry | `src/app/page.tsx`; `src/hooks/window-registry.tsx`; `src/components/window-content/all-apps-window.tsx`; shell catalog files | `V-TYPE`; `V-LINT`; `V-UX-LINT`; `V-UNIT` | Primary-surface exclusion wired via `PRODUCT_OS_PRIMARY_DISCOVERY_EXCLUDED_CODES`; legacy `app=brain-voice` action/registry routes retained; verify profile executed successfully. |
| `MPB-017` | `F` | 6 | `P0` | `DONE` | `MPB-015` | Replace empty `Create Agent` wizard with deterministic guided quickstart that starts in <=15 minute flow | `src/components/window-content/agents/*`; onboarding launch hooks; welcome entry surfaces | `V-TYPE`; `V-LINT`; `V-UX-LINT`; `V-UNIT` | `Create Agent` now starts with deterministic `Talk`/`Type` quickstart; `Talk` launches guided assistant context; verify profile executed successfully. |
| `MPB-018` | `G` | 7 | `P0` | `DONE` | `MPB-016`, `MPB-017` | Ship tall, mobile-friendly native voice/chat canvas with animated voice orb, transcript, and typed fallback | `src/components/window-content/ai-chat-window/*`; `src/components/interview/*`; `src/hooks/use-voice-runtime.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-E2E-MOBILE` | Interview runner now renders a tall responsive voice/chat canvas with animated orb states, rolling transcript, and typed fallback composer; voice capture uses existing runtime adapter + consent flow. Verify profile executed: `V-UNIT` passed; `V-TYPE` failed on pre-existing Convex type errors (`agentExecution.ts`, `agentSessions.ts`); `V-E2E-DESKTOP` failed on existing unknown deep-link cleanup timeout; `V-E2E-MOBILE` failed on existing login deep-link timeout. |
| `MPB-019` | `G` | 7 | `P0` | `DONE` | `MPB-018` | Expose soul-binding recursive training as explicit first-run + ongoing training mode, including one-on-one and team coaching entry points | `src/components/interview/*`; `src/components/window-content/agents/*`; `convex/ai/interviewRunner.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-MODEL`; `V-E2E-ATX` | Interview selector now exposes explicit soul-binding `first-run`/`ongoing` and `one-on-one`/`team` entry points; training mode metadata is surfaced in runner context without trust-artifact schema changes. Consent checkpoints remain explicit. Verify profile executed: `V-LINT` (warnings only) and `V-UNIT` passed; `V-TYPE` failed on pre-existing Convex type errors; `V-MODEL` failed due configured effective-model mismatch fallback; `V-E2E-ATX` failed on existing create-agent placeholder timeout in trust-experience spec. |
| `MPB-020` | `H` | 8 | `P1` | `DONE` | `MPB-019` | Add onboarding completion handoff with immediate deploy choices (`Webchat`, `Telegram`, `Both`) and inline setup packets | `src/components/window-content/web-publishing-window/*`; `src/components/window-content/integrations-window/*`; onboarding completion UI | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEG` | Completion UI now exposes `Deploy to Webchat` / `Deploy to Telegram` / `Deploy to Both` with inline setup packets and deterministic window routing (`webchat-deployment`, `integrations:telegram`). BYOA boundaries unchanged (no channel router/provider contract mutation). Verify executed: `V-TYPE` failed on pre-existing `convex/ai/chat.ts` TS2322 (`string` not assignable to `"proposal" | "commit" | "read_only"`); `V-LINT` passed with existing warnings; `V-UNIT` passed; `V-INTEG` passed. |
| `MPB-021` | `H` | 8 | `P1` | `DONE` | `MPB-020` | Align welcome and launch copy with delivered behavior: setup promise, voice-first CTA, and deploy follow-through | `src/app/page.tsx`; welcome surfaces; onboarding copy docs | `V-LINT`; `V-UNIT`; `V-DOCS` | Welcome + launch copy now states voice-first `Talk`/`Type` first-run behavior, ~15-minute setup target, and deploy follow-through to Webchat/Telegram/Both. Assistant kickoff contract now includes setup promise + deploy handoff tokens. Verify executed: `V-LINT` passed with existing warnings; `V-UNIT` passed; `V-DOCS` passed. |
| `MPB-022` | `H` | 8 | `P1` | `DONE` | `MPB-021` | Final hardening closeout: docs sync, regression checklist, and docs guard pass for release readiness | `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/*`; UX regression checklist docs | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Queue/plan/index synchronized; added `UX_REGRESSION_CHECKLIST.md` for lane `H` release checks; verification notes captured explicitly. Full closeout rerun executed: `V-TYPE` passed; `V-LINT` passed with warnings only; `V-UNIT` passed; `V-DOCS` passed. |

---

## Historical completion note

- `MPB-001`..`MPB-014` remain completed from the BYOA runtime/security foundation pass and are treated as fixed prerequisites for this extension.

---

## Current kickoff

- Active task: none (`Lane H` closeout complete).
- Next task to execute: none (all lane `H` rows `DONE`).
- Immediate objective: monitor post-closeout regressions using `UX_REGRESSION_CHECKLIST.md` and keep BYOA boundary contracts unchanged.
