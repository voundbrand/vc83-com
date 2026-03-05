# Agent Operator Self-Naming Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming`  
**Planning mode:** Queue-first, deterministic, contract-first  
**Last updated:** 2026-03-05

---

## Objective

Move agent naming authority to soul-level co-creation between user and agent, remove hardcoded name literals from runtime and chat surfaces, and preserve deterministic behavior across iPhone, webchat/native guest, and desktop AI chat.

---

## Current-state ramifications

The current system has multiple independent name authorities and hardcoded identity strings. The most important ramifications are:

1. Mobile currently has local name authority: `apps/operator-mobile/src/contexts/AppPreferencesContext.tsx` seeds `DEFAULT_AGENT_NAME = 'SevenLayers'`, and `apps/operator-mobile/app/(tabs)/index.tsx` speaks that name in starter text.
2. Onboarding still auto-assigns names from a static list in `convex/onboarding/completeOnboarding.ts` (`Samantha`, `Mira`, `Nova`, etc.), which bypasses explicit co-creation.
3. Desktop AI chat surfaces use hardcoded sender/placeholder labels (`SevenLayers`) in `slick-chat-input.tsx` and `slick-chat-messages.tsx`.
4. Commercial kickoff paths embed hardcoded specialist display names (`Samantha`/`Samantha Warm`) in `src/components/window-content/ai-chat-window/index.tsx` and `convex/ai/agentExecution.ts`.
5. Legacy runtime compatibility still includes display-name Samantha detection (`resolveLegacySamanthaRuntimeModule` in `convex/ai/agentSpecRegistry.ts` and related migration heuristics).
6. As a result, renaming at soul level can drift from visible runtime identity unless all read/write paths converge on one resolver contract.

---

## Scope boundaries

Included:

- Soul-level naming contract (`agent_identity_v1`) and resolver.
- Runtime/module routing de-hardcoding from display-name literals.
- Onboarding identity lifecycle changes to co-created naming.
- Mobile and desktop chat identity-source cutover.
- Migration/backfill + telemetry + cross-surface validation.

Excluded:

- Global product/domain rebrand outside agent identity flows.
- Non-agent UI branding changes not tied to agent naming authority.
- Commercial pricing/offer contract changes.

---

## Lane plan and ownership

| Lane | Queue IDs | Ownership | Current state |
|---|---|---|---|
| `A` Identity contract + resolver | `AOSN-001`, `AOSN-002` | `convex/ai/agentIdentityResolver.ts` (new), `convex/schema.ts`, public config/query responses | `AOSN-001 READY`, `AOSN-002 PENDING` |
| `B` Runtime de-hardcoding | `AOSN-003`, `AOSN-004` | `convex/ai/agentSpecRegistry.ts`, `convex/ai/agentExecution.ts`, migration heuristics | `AOSN-003 READY`, `AOSN-004 PENDING` |
| `C` Onboarding co-creation lifecycle | `AOSN-005`, `AOSN-006`, `AOSN-007` | `convex/onboarding/completeOnboarding.ts`, `convex/ai/tools/interviewTools.ts`, `convex/ai/soulEvolution.ts` | all `PENDING` |
| `D` iPhone/mobile cutover | `AOSN-008`, `AOSN-009` | `apps/operator-mobile` preferences + chat/settings surfaces | all `PENDING` |
| `E` Desktop/main app AI chat cutover | `AOSN-010`, `AOSN-011`, `AOSN-012` | `src/components/window-content/ai-chat-window/*` and kickoff visibility contracts | all `PENDING` |
| `F` Migration + telemetry + closeout | `AOSN-013`, `AOSN-014`, `AOSN-015`, `AOSN-016` | `convex/migrations/*`, telemetry, validation suites, workstream docs | all `PENDING` |

---

## Dependency graph (acyclic)

1. `AOSN-001` -> `AOSN-002`
2. `AOSN-001` + `AOSN-003` -> `AOSN-004`
3. `AOSN-001` -> `AOSN-005`
4. `AOSN-005` + `AOSN-001` -> `AOSN-006`
5. `AOSN-006` -> `AOSN-007`
6. `AOSN-002` + `AOSN-005` -> `AOSN-008`
7. `AOSN-006` + `AOSN-008` -> `AOSN-009`
8. `AOSN-002` -> `AOSN-010`
9. `AOSN-004` + `AOSN-010` -> `AOSN-011`
10. `AOSN-011` -> `AOSN-012`
11. `AOSN-001` + `AOSN-003` + `AOSN-005` -> `AOSN-013`
12. `AOSN-013` -> `AOSN-014`
13. `AOSN-008` + `AOSN-010` + `AOSN-013` -> `AOSN-015`
14. `AOSN-015` -> `AOSN-016`

---

## Execution waves

1. Wave 1: `AOSN-001` and `AOSN-003` in parallel.
2. Wave 2: `AOSN-002`, `AOSN-004`, `AOSN-005`.
3. Wave 3: `AOSN-006`, `AOSN-008`, `AOSN-010`.
4. Wave 4: `AOSN-007`, `AOSN-009`, `AOSN-011`, `AOSN-012`.
5. Wave 5: `AOSN-013`, `AOSN-014`.
6. Wave 6: `AOSN-015` -> `AOSN-016`.

---

## Verification contract

Required command families:

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`
4. Row-targeted unit/integration suites listed in `TASK_QUEUE.md`

Definition of done:

1. No hardcoded user-visible agent-name literals remain in identity-bearing runtime/chat paths covered by this queue.
2. iPhone + native guest/webchat + desktop AI chat resolve names from the same backend identity contract.
3. Onboarding no longer auto-assigns from static candidate lists and records explicit co-creation state transitions.
4. Migration and telemetry are in place, and fallback identity usage is observable.

---

## READY-first tasks

1. `AOSN-001` (`P0`, Lane `A`)
2. `AOSN-003` (`P0`, Lane `B`)

Immediate recommendation:

- Land contract authority (`AOSN-001`) and behavior de-hardcoding (`AOSN-003`) before touching UI labels, so downstream changes are source-of-truth aligned.
