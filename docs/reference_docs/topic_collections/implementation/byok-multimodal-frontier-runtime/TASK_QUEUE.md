# BYOK Multimodal Frontier Runtime Task Queue

**Last updated:** 2026-02-18  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime`  
**Source request:** Deep codebase-wide BYOK expansion plan for multi-provider API keys in Integrations UI, private model connections, multimodal/voice support, and credit/economics alignment.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker details in row `Notes` and continue with the next `READY` task.
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
| `V-MODEL` | `npm run test:model` |
| `V-INTEGRATION` | `npm run test:integration` |
| `V-DOCS` | `npm run docs:guard` |
| `V-AI-LINT` | `npx eslint convex/ai convex/schemas/aiSchemas.ts convex/credits/index.ts convex/channels` |
| `V-INTEGRATION-LINT` | `npx eslint convex/integrations convex/oauth convex/channels/router.ts convex/channels/registry.ts` |
| `V-UI-LINT` | `npx eslint src/components/window-content/integrations-window src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx src/hooks/use-ai-config.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Target contract and schema baseline | `docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/*`; `convex/schemas/aiSchemas.ts`; `convex/ai/settings.ts` | No runtime/UI implementation before lane `A` contract rows are `DONE` |
| `B` | Provider credential vault and registry | `convex/oauth/encryption.ts`; `convex/channels/registry.ts`; `convex/channels/router.ts`; `convex/integrations/*` | Avoid routing/fallback logic changes in lane `B` |
| `C` | Runtime adapters, auth profiles, and model routing | `convex/ai/*`; `convex/ai/openrouter.ts`; new provider adapter modules | No billing policy edits in lane `C` |
| `D` | Credits, BYOK monetization policy, and billing unification | `convex/credits/index.ts`; `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/billing.ts`; `convex/stripe/*` | No integrations UI edits in lane `D` |
| `E` | Integrations and AI settings product surfaces | `src/components/window-content/integrations-window/*`; `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`; `src/hooks/use-ai-config.ts` | No deep backend pricing refactors in lane `E` |
| `F` | Model quality conformance and multimodal/voice paths | `convex/ai/modelAdapters.ts`; `convex/ai/modelEnablementGates.ts`; voice runtime and eval tests | Starts only after core runtime adapters are stable |
| `G` | Migration, rollout hardening, and closeout | migrations + docs + rollout test assets | Starts only after all `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` through `BMF-003`.
2. After `BMF-003`, lanes `B` and `C` may run in parallel (max one `IN_PROGRESS` per lane).
3. Lane `D` starts after `BMF-005` and `BMF-008` are `DONE`.
4. Lane `E` starts after `BMF-005` is `DONE`; lane `E` model controls (`BMF-014`) require `BMF-009`.
5. Lane `F` starts after `BMF-008`; voice and bridge tasks should reuse lane `E` connection contracts.
6. Lane `G` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `BMF-001` | `A` | 1 | `P0` | `DONE` | - | Deep baseline audit across AI runtime, integrations credential handling, credits/billing paths, and OpenClaw reference architecture | `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/settings.ts`; `convex/credits/index.ts`; `convex/schemas/aiSchemas.ts`; `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`; `convex/integrations/*`; `convex/oauth/encryption.ts`; `docs/reference_projects/openclaw/src/*`; `docs/reference_projects/openclaw/extensions/voice-call/src/*`; `docs/reference_docs/topic_collections/byok_infra/*` | `V-DOCS` | Done 2026-02-18: confirmed runtime is OpenRouter-first, BYOK UI is effectively disabled, credits are still deducted in BYOK paths, integration secrets are inconsistently encrypted, and OpenClaw already demonstrates provider/baseUrl/auth-profile patterns needed for private models and multimodal routing. |
| `BMF-002` | `A` | 1 | `P0` | `READY` | `BMF-001` | Define canonical provider contract: provider IDs, credential source taxonomy, capability matrix (`text`, `vision`, `audio_in`, `audio_out`, `tools`, `json`), and billing source taxonomy (`platform`, `byok`, `private`) | `docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/MASTER_PLAN.md`; `convex/channels/types.ts`; `convex/ai/modelPolicy.ts`; `convex/ai/platformModels.ts` | `V-DOCS` | Must be the single source for all later schema/UI/runtime work. |
| `BMF-003` | `A` | 1 | `P0` | `PENDING` | `BMF-002` | Land schema + migration contract for provider-agnostic AI settings and auth profiles | `convex/schemas/aiSchemas.ts`; `convex/schema.ts`; `convex/ai/settings.ts`; `convex/schemas/coreSchemas.ts` | `V-TYPE`; `V-LINT`; `V-AI-LINT` | Includes migration scaffolding from `openrouterApiKey`/OpenRouter-only profiles to generalized provider profiles. |
| `BMF-004` | `B` | 2 | `P0` | `PENDING` | `BMF-003` | Implement encrypted AI credential storage with explicit encrypted field metadata and decrypt-on-use boundaries | `convex/oauth/encryption.ts`; `convex/channels/router.ts`; `convex/channels/types.ts`; `convex/integrations/manychat.ts`; `convex/integrations/chatwoot.ts`; `convex/integrations/resend.ts`; `convex/integrations/v0.ts` | `V-TYPE`; `V-LINT`; `V-INTEGRATION-LINT`; `V-UNIT` | Normalize away plaintext `customProperties` API key storage where feasible. |
| `BMF-005` | `B` | 2 | `P0` | `PENDING` | `BMF-004` | Build AI provider registry + resolver (patterned after channel registry/router) with org binding, priority, and fallback metadata | `convex/channels/registry.ts`; `convex/channels/router.ts`; `convex/ai/modelDiscovery.ts`; `convex/ai/modelPricing.ts` | `V-TYPE`; `V-LINT`; `V-AI-LINT`; `V-UNIT` | Registry must support provider-specific `baseUrl` to allow private/self-hosted endpoints. |
| `BMF-006` | `B` | 2 | `P1` | `PENDING` | `BMF-004` | Add provider connection verification actions (`test_auth`, `list_models`, `test_text`, `test_voice`) and health metadata | `convex/integrations/*`; `convex/ai/modelDiscovery.ts`; `src/components/window-content/integrations-window/*` | `V-TYPE`; `V-LINT`; `V-INTEGRATION-LINT` | Use safe probes and avoid storing test payload content. |
| `BMF-007` | `C` | 3 | `P0` | `PENDING` | `BMF-003` | Generalize auth profile policy/order/cooldown from OpenRouter-only to provider-agnostic profile sets | `convex/ai/authProfilePolicy.ts`; `convex/ai/modelFailoverPolicy.ts`; `convex/ai/settings.ts` | `V-TYPE`; `V-LINT`; `V-AI-LINT`; `V-UNIT` | Preserve existing OpenRouter behavior while adding provider dimension. |
| `BMF-008` | `C` | 3 | `P0` | `PENDING` | `BMF-007` | Implement provider adapter layer with normalized request/response for OpenRouter, OpenAI, Anthropic, Gemini, and OpenAI-compatible custom/private endpoints | `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/openrouter.ts`; `convex/ai/modelAdapters.ts`; `convex/ai/toolBroker.ts` | `V-TYPE`; `V-LINT`; `V-AI-LINT`; `V-UNIT` | Adapter output must normalize usage, tool calls, structured output, and safety/error classes. |
| `BMF-009` | `C` | 3 | `P1` | `PENDING` | `BMF-008` | Implement model routing matrix and per-agent fallback chain policy keyed by task intent and modality | `convex/ai/modelPolicy.ts`; `convex/ai/modelEnablementGates.ts`; `convex/ai/platformModels.ts`; `convex/ai/agentExecution.ts` | `V-TYPE`; `V-LINT`; `V-MODEL`; `V-UNIT` | Include deterministic fallback reasons and profile cooldown integration. |
| `BMF-010` | `D` | 4 | `P0` | `PENDING` | `BMF-005`, `BMF-008` | Add billing-source policy engine so credit preflight/deduction depends on request source (`platform` vs `byok` vs `private`) | `convex/credits/index.ts`; `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`; `convex/ai/agentApprovals.ts` | `V-TYPE`; `V-LINT`; `V-AI-LINT`; `V-UNIT` | Keep non-LLM platform actions billable even when LLM token spend is BYOK. |
| `BMF-011` | `D` | 4 | `P1` | `PENDING` | `BMF-010` | Finalize BYOK commercial model and stripe/invoice hooks (flat platform fee, optional surcharge, or tier-bundled) | `convex/stripe/aiCheckout.ts`; `convex/stripe/aiWebhooks.ts`; `convex/stripe/platformCheckout.ts`; `src/components/window-content/store-window.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT` | Produce explicit per-tier rule table and migration-safe defaults. |
| `BMF-012` | `D` | 4 | `P1` | `PENDING` | `BMF-010` | Unify legacy token billing path with credits ledger or deprecate legacy path with hard guardrails | `convex/ai/billing.ts`; `convex/schemas/aiBillingSchemas.ts`; `convex/credits/index.ts` | `V-TYPE`; `V-LINT`; `V-UNIT` | Remove ambiguous dual-billing behavior. |
| `BMF-013` | `E` | 5 | `P0` | `PENDING` | `BMF-005` | Build Integrations UI `AI Connections` for OpenAI, Anthropic, Gemini, Grok, Mistral, Kimi, OpenRouter, ElevenLabs, and custom OpenAI-compatible/private connectors | `src/components/window-content/integrations-window/index.tsx`; `src/components/window-content/integrations-window/*`; `src/hooks/use-ai-config.ts`; `convex/integrations/*` | `V-TYPE`; `V-LINT`; `V-UI-LINT`; `V-UNIT` | Include connect/test/rotate/revoke flows and secret-redaction UX. |
| `BMF-014` | `E` | 5 | `P1` | `PENDING` | `BMF-013`, `BMF-009` | Update AI settings surfaces for per-agent provider/model defaults, fallback editor, and tier-based BYOK gating | `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`; `src/hooks/use-ai-config.ts`; `convex/licensing/helpers.ts`; `convex/licensing/tierConfigs.ts` | `V-TYPE`; `V-LINT`; `V-UI-LINT` | Remove hardcoded super-admin BYOK stub and wire to license features. |
| `BMF-015` | `F` | 6 | `P0` | `PENDING` | `BMF-008`, `BMF-009` | Build provider/model conformance harness for tool-call parsing, schema fidelity, refusal handling, and latency/cost reliability | `tests/unit/ai/*`; `tests/integration/ai/*`; `scripts/test-model-validation.ts`; `convex/ai/modelAdapters.ts` | `V-TYPE`; `V-LINT`; `V-MODEL`; `V-UNIT`; `V-INTEGRATION` | Gate model enablement on measurable conformance thresholds. |
| `BMF-016` | `F` | 6 | `P1` | `PENDING` | `BMF-008`, `BMF-013` | Add multimodal voice path: ElevenLabs connector + internal voice provider routing for agent runtime and future voice agents | `convex/ai/agentExecution.ts`; `convex/integrations/*`; voice runtime modules; `docs/reference_projects/openclaw/extensions/voice-call/src/config.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-INTEGRATION` | Reuse connection contract from lane `E` and keep transport/provider concerns separated. |
| `BMF-017` | `F` | 6 | `P1` | `PENDING` | `BMF-007`, `BMF-008` | Implement OpenClaw bridge proof-of-concept for importing external auth profiles/private model definitions into vc83 runtime | adapter/bridge modules + import tooling docs | `V-TYPE`; `V-LINT`; `V-UNIT` | Start with one-way import and strict provider allowlist. |
| `BMF-018` | `G` | 7 | `P0` | `PENDING` | `BMF-011`, `BMF-014`, `BMF-016` | Run migration/backfill + feature-flag rollout plan (org settings migration, key rotation safety, fallback rollback) | migration scripts; `convex/migrations/*`; `docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Include canary org strategy and rollback commands. |
| `BMF-019` | `G` | 7 | `P1` | `PENDING` | `BMF-018`, `BMF-015`, `BMF-017` | Final hardening, CI closeout, and release checklist for multi-provider BYOK GA | `docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/*`; tests and guardrail docs | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-MODEL`; `V-DOCS` | Require docs guard and full verification suite before marking `DONE`. |

---

## Current kickoff

- Active task: none.
- Next task to execute: `BMF-002` (`READY`) by deterministic priority/order.
- Immediate objective: freeze the provider/billing/routing contract before schema and runtime edits.
