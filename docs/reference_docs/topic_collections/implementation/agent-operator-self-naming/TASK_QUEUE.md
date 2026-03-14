# Agent Operator Self-Naming Task Queue

**Last updated:** 2026-03-05 (UTC)  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming`  
**Source request:** Move agent naming authority to soul-level co-creation (user + agent), remove hardcoded names from runtime and surfaces, and preserve deterministic behavior across iPhone, webchat, and desktop AI chat.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Row schema is fixed and must remain exact: `ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes`.
3. Deterministic pick order is `P0` before `P1`, then lexical `ID`.
4. Dependency token semantics:
   - `ID` means dependency must be `DONE` before this row can move to `IN_PROGRESS`.
   - `ID@DONE_GATE` means row may start, but cannot move to `DONE` until dependency is `DONE`.
5. Keep dependency graph acyclic; only add forward references.
6. Every row must run listed `Verify` commands before moving to `DONE`.
7. Identity authority policy: user-visible agent naming must resolve from soul-level co-creation contracts, never from hardcoded literals.
8. Name-based runtime behavior branching is forbidden; use runtime module keys/template roles/capability contracts instead.
9. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `MASTER_PLAN.md`, and `INDEX.md` at each lane milestone.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-CONVEX-TS` | `npx tsc -p convex/tsconfig.json --noEmit` |
| `V-UNIT-IDENTITY` | `npm run test:unit -- tests/unit/ai/agentIdentityResolver.test.ts tests/unit/onboarding/completeOnboarding.agentIdentity.test.ts` |
| `V-UNIT-RUNTIME` | `npm run test:unit -- tests/unit/ai/agentSpecRegistry.identityFallback.test.ts tests/unit/ai/agentExecutionCommercialKickoffIdentity.test.ts` |
| `V-UNIT-CHAT` | `npm run test:unit -- tests/unit/ai-chat/slickChatIdentitySurface.test.ts tests/unit/ai-chat/kickoffMessageVisibility.test.ts` |
| `V-UNIT-MOBILE` | `npm run test:unit -- apps/operator-mobile/src/contexts/AppPreferencesContext.identity.test.ts apps/operator-mobile/app/(tabs)/index.identity.test.tsx` |
| `V-INTEGRATION-PUBLIC` | `npx vitest run tests/integration/api/publicInboundIdentity.contract.test.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Concurrency gate |
|---|---|---|---|
| `A` | Identity contract + canonical resolver | `convex/ai/agentIdentityResolver.ts` (new), `convex/schema.ts`, `convex/schemas/soulEvolutionSchemas.ts` | Starts immediately |
| `B` | Runtime de-hardcoding + deterministic routing | `convex/ai/agentSpecRegistry.ts`, `convex/ai/agentExecution.ts`, `convex/migrations/backfillSamanthaRuntimeModuleKey.ts` | `B-002` waits for `A-001` and `B-001` |
| `C` | Onboarding identity lifecycle + co-creation persistence | `convex/onboarding/completeOnboarding.ts`, `convex/ai/tools/interviewTools.ts`, `convex/ai/soulEvolution.ts` | `C-002` waits for `C-001` and `A-001` |
| `D` | iPhone/mobile identity-source cutover | `apps/operator-mobile/src/contexts/AppPreferencesContext.tsx`, `apps/operator-mobile/app/(tabs)/index.tsx`, `apps/operator-mobile/app/(tabs)/settings.tsx` | `D-001` waits for `A-002` and `C-001` |
| `E` | Desktop/main app AI chat identity-source cutover | `src/components/window-content/ai-chat-window/*`, `src/hooks/use-ai-chat.ts` | `E-001` waits for `A-002`; `E-002` waits for `B-002` |
| `F` | Migration, telemetry, validation, and closeout | `convex/migrations/*`, `convex/ai/trustTelemetry.ts`, workstream docs | `F` starts after `D-001`, `E-001`, and `C-002` |

---

## Dependency-based status flow

1. Start with `AOSN-001` and `AOSN-003` in parallel.
2. Complete `AOSN-002` after `AOSN-001`.
3. Complete `AOSN-004` after `AOSN-001` and `AOSN-003`.
4. Move onboarding lifecycle (`AOSN-005` -> `AOSN-006` -> `AOSN-007`) after `AOSN-001`.
5. Start mobile and desktop surface cutovers after identity read contracts are exposed (`AOSN-002`) and onboarding writes are contract-safe (`AOSN-005`).
6. Execute migration and telemetry rows after runtime + surface cutovers are stable.
7. Close workstream only after matrix validation (`AOSN-015`) and synchronized docs closeout (`AOSN-016`).

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `AOSN-001` | `A` | 1 | `P0` | `READY` | `-` | Define `agent_identity_v1` contract and canonical resolver with deterministic precedence (`soul.coCreatedName` -> `soul.name` -> `displayName` -> safe fallback) plus `identityState` (`pending_co_creation`, `confirmed`). | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentIdentityResolver.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/soulEvolutionSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/agentIdentityResolver.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-IDENTITY`; `V-DOCS` | Core ramification: naming becomes contract data, not prompt text or UI literals. |
| `AOSN-002` | `A` | 1 | `P0` | `PENDING` | `AOSN-001` | Expose resolved identity on public and internal read paths (webchat bootstrap, native guest config, conversation/session payload metadata) and remove direct `displayName` assumptions in response contracts. | `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/webchatApi.ts`; `/Users/foundbrand_001/Development/vc83-com/src/app/api/native-guest/config/route.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversations.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/integration/api/publicInboundIdentity.contract.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-INTEGRATION-PUBLIC`; `V-DOCS` | This unblocks mobile/web clients from local hardcoded name authority. |
| `AOSN-003` | `B` | 2 | `P0` | `READY` | `AOSN-001@DONE_GATE` | Remove display-name-based runtime detection for Samantha fallback and rely on template role/runtime module key contracts only; keep compatibility flags explicit and deterministic. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSpecRegistry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/migrations/backfillSamanthaRuntimeModuleKey.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/agentSpecRegistry.identityFallback.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-RUNTIME`; `V-DOCS` | Ramification: historical name strings stop being behavior drivers. |
| `AOSN-004` | `B` | 2 | `P0` | `PENDING` | `AOSN-001`, `AOSN-003` | Replace user-facing hardcoded specialist-name literals in runtime fallback copy and kickoff context with resolver-derived identity labels and template-role routing keys. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/kickoff-message-visibility.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-RUNTIME`; `V-UNIT-CHAT`; `V-DOCS` | Prevents defaulting to `Samantha` in fallback messages when co-created names exist. |
| `AOSN-005` | `C` | 3 | `P0` | `PENDING` | `AOSN-001` | Remove static self-selected onboarding name candidate list and shift to neutral pending-identity intro until co-creation completes. | `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/completeOnboarding.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/onboarding/completeOnboarding.agentIdentity.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-IDENTITY`; `V-DOCS` | Ramification: onboarding can no longer silently assign names like `Samantha`/`Nova`. |
| `AOSN-006` | `C` | 3 | `P0` | `PENDING` | `AOSN-005`, `AOSN-001` | Add explicit user-agent name co-creation handshake and persistence flow (`proposedName`, confirmation, final commit to soul identity fields with audit metadata). | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/interviewTools.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/soulEvolution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/completeOnboarding.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-IDENTITY`; `V-DOCS` | Establishes the new source of truth at soul layer. |
| `AOSN-007` | `C` | 3 | `P1` | `PENDING` | `AOSN-006` | Add anti-thrash constraints for rename loops (cooldown windows, moderation checks, duplicate detection) and deterministic conflict resolution when concurrent channels rename. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/soulEvolution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/soulIdentityRenamePolicy.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `npm run test:unit -- tests/unit/ai/soulIdentityRenamePolicy.test.ts`; `V-DOCS` | Protects runtime stability once naming is user-editable/co-created. |
| `AOSN-008` | `D` | 4 | `P0` | `PENDING` | `AOSN-002`, `AOSN-005` | Remove mobile local default name authority (`DEFAULT_AGENT_NAME='SevenLayers'`) and hydrate active agent label from backend resolved identity with safe temporary fallback `Operator` until resolved. | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/contexts/AppPreferencesContext.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/stores/chat.ts` | `V-TYPE`; `V-UNIT-MOBILE`; `V-DOCS` | Directly addresses the iPhone ramification: locally persisted brand-name defaults must stop defining agent identity. |
| `AOSN-009` | `D` | 4 | `P1` | `PENDING` | `AOSN-006`, `AOSN-008` | Convert mobile settings `agentName` free-text field into co-creation intent action + identity status display (`pending_co_creation` vs `confirmed`) instead of direct local override. | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/settings.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/i18n/translations.ts` | `V-TYPE`; `V-UNIT-MOBILE`; `V-DOCS` | Prevents client-only rename drift from backend soul state. |
| `AOSN-010` | `E` | 5 | `P0` | `PENDING` | `AOSN-002` | Replace hardcoded `SevenLayers` sender labels/placeholders in desktop AI chat with resolved identity and neutral platform wording for non-agent chrome labels. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-messages.tsx`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai-chat/slickChatIdentitySurface.test.ts` | `V-TYPE`; `V-UNIT-CHAT`; `V-DOCS` | Main-app ramification: chat sender identity must be dynamic, not brand literal. |
| `AOSN-011` | `E` | 5 | `P0` | `PENDING` | `AOSN-004`, `AOSN-010` | Remove hardcoded Samantha kickoff display-name defaults and warm-route alias assumptions in commercial motion kickoff contracts. Carry template role + runtime identity key instead. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/agentExecutionCommercialKickoffIdentity.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `V-UNIT-RUNTIME`; `V-DOCS` | Keeps specialist routing deterministic without locking user-facing names. |
| `AOSN-012` | `E` | 5 | `P1` | `PENDING` | `AOSN-011` | Update kickoff-visibility filtering so internal kickoff detection does not depend on legacy Samantha-prefixed strings. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/kickoff-message-visibility.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai-chat/kickoffMessageVisibility.test.ts` | `V-TYPE`; `V-UNIT-CHAT`; `V-DOCS` | Avoids brittle parser regressions when names become co-created. |
| `AOSN-013` | `F` | 6 | `P0` | `PENDING` | `AOSN-001`, `AOSN-003`, `AOSN-005` | Add migration/backfill for existing agents to seed `identityState` and preserve prior confirmed names while marking unresolved/generic names as `pending_co_creation`. | `/Users/foundbrand_001/Development/vc83-com/convex/migrations/backfillAgentIdentityState.ts` (new); `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/completeOnboarding.ts` | `V-TYPE`; `V-CONVEX-TS`; `npm run test:unit -- tests/unit/migrations/backfillAgentIdentityState.test.ts`; `V-DOCS` | Required for safe rollout in mixed historical data.
| `AOSN-014` | `F` | 6 | `P1` | `PENDING` | `AOSN-013` | Add telemetry and trust counters for identity-source coverage (`co_created`, `legacy_confirmed`, `fallback_operator`) plus alert thresholds for fallback spikes. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/runtimeIncidentAlerts.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/trustTelemetryIdentitySource.test.ts` | `V-TYPE`; `V-CONVEX-TS`; `npm run test:unit -- tests/unit/ai/trustTelemetryIdentitySource.test.ts`; `V-DOCS` | Gives rollout observability for naming authority migration.
| `AOSN-015` | `F` | 7 | `P0` | `PENDING` | `AOSN-008`, `AOSN-010`, `AOSN-013` | Execute cross-surface validation matrix: iPhone voice-first chat, native guest bootstrap, webchat widget, and desktop AI chat all render resolver identity and never regress to hardcoded brand/legacy names. | `/Users/foundbrand_001/Development/vc83-com/tests/integration/ai/identitySurfaceParity.integration.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/e2e/mobile/identity-surface.spec.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/e2e/desktop/identity-surface.spec.ts` | `V-TYPE`; `V-UNIT-CHAT`; `V-UNIT-MOBILE`; `V-INTEGRATION-PUBLIC`; `V-DOCS` | Acceptance gate for the original iPhone + main-app pain point.
| `AOSN-016` | `F` | 8 | `P1` | `PENDING` | `AOSN-015` | Final closeout: synchronize workstream docs, record rollout recommendation and rollback criteria, and document unresolved exceptions if any channel remains on legacy identity path. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/SESSION_PROMPTS.md` | `V-DOCS`; `V-TYPE` | Workstream done only when queue + prompts + plan + index are synchronized.

---

## Current kickoff

- Active task: none.
- READY-first set: `AOSN-001`, `AOSN-003`.
- Immediate objective: establish identity contract authority and remove name-based runtime heuristics before any UI-level naming cutover.
