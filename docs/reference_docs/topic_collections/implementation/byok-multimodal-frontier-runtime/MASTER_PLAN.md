# BYOK Multimodal Frontier Runtime Master Plan

**Date:** 2026-02-18  
**Scope:** Expand current BYOK from OpenRouter-only to a provider-agnostic, multimodal framework with private model connectivity and deterministic credit/billing policy.

---

## Mission

Deliver one AI connection and runtime framework where organizations can:

1. connect their own provider keys in product UI,
2. route agents across frontier providers and private endpoints,
3. add voice/multimodal capabilities with the same connection model,
4. understand exactly when credits are charged and when BYOK is pass-through.

---

## Current state in this codebase

1. AI runtime is OpenRouter-first in `convex/ai/chat.ts` and `convex/ai/agentExecution.ts`.
2. BYOK schema exists in `convex/schemas/aiSchemas.ts`, but key fields are OpenRouter-specific (`llm.openrouterApiKey`, OpenRouter-only auth profiles).
3. AI settings UI has a hard BYOK gate stub in `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx` (`isSuperAdmin` is hardcoded `false`), so BYOK is effectively hidden.
4. Credits preflight and deduction run in active runtime paths even when BYOK mode exists in settings.
5. A legacy token/subscription billing path still exists in parallel to credits (`convex/ai/billing.ts`, `convex/schemas/aiBillingSchemas.ts`).
6. Integrations use extensible object settings, but several integrations still store API keys in plaintext `customProperties` rather than encrypted storage.
7. Encryption primitives already exist and are production-used for OAuth in `convex/oauth/encryption.ts`.
8. Channel provider registry/routing (`convex/channels/registry.ts`, `convex/channels/router.ts`, `convex/channels/types.ts`) already models provider metadata, credential source, and decrypt-on-use boundaries and can be mirrored for AI providers.
9. Model policy foundations already exist (`convex/ai/modelPolicy.ts`, `convex/ai/modelEnablementGates.ts`, `convex/ai/modelAdapters.ts`) and should be extended, not replaced.
10. Existing BYOK docs under `docs/reference_docs/topic_collections/byok_infra/*` are useful but scoped mostly to OpenRouter BYOK and do not cover full multi-provider/private-model architecture.

---

## OpenClaw leverage points

The local OpenClaw reference project already demonstrates patterns we can transfer:

1. Provider config supports `provider`, `baseUrl`, auth mode, and protocol variance (`docs/reference_projects/openclaw/src/config/types.models.ts`, `docs/reference_projects/openclaw/src/config/zod-schema.core.ts`).
2. Auth profile store and cooldown-aware ordering are provider-agnostic (`docs/reference_projects/openclaw/src/agents/auth-profiles/*`).
3. Model fallback and alias handling are explicit and deterministic (`docs/reference_projects/openclaw/src/agents/model-selection.ts`, `docs/reference_projects/openclaw/src/agents/model-fallback.ts`).
4. Voice extension config already includes ElevenLabs and OpenAI provider concepts (`docs/reference_projects/openclaw/extensions/voice-call/src/config.ts`), giving a tested contract shape for future voice agents.

---

## Product decisions to lock

1. **Connection surface:** AI providers should be managed in Integrations UI with connect/test/rotate/revoke workflows.
2. **Provider contract:** every connection needs provider ID, auth type, endpoint/baseUrl, capabilities, health state, and billing source metadata.
3. **Routing contract:** agent runtime chooses provider/model by capability and policy, not by hardcoded OpenRouter assumptions.
4. **Billing contract:** credit checks and deductions must depend on billing source and action class.
5. **Quality contract:** model enablement must pass conformance tests per provider/model before production rollout.

---

## BYOK + credits commercial policy (proposed v1)

1. Platform-sourced LLM requests keep current credit deduction path.
2. BYOK/private-sourced LLM token spend is not deducted as platform token credits.
3. Non-LLM platform resources remain billable, even for BYOK orgs.
4. BYOK pricing policy is tier-gated and explicit:
   - `Agency/Enterprise`: BYOK eligible.
   - Add-on choice per tier: included BYOK, flat BYOK fee, or BYOK + small orchestration surcharge.
5. Agency-client boundary must remain deterministic: client-facing runtime can stay platform-billed unless the client tenant has its own explicit BYOK connection.

This policy is formalized in lane `D` (`BMF-010`..`BMF-012`) with implementation and migration tasks.

---

## Option set

| Option | Description | Pros | Cons |
|---|---|---|---|
| `A` | Patch current OpenRouter BYOK only | Fastest short-term fix | Does not solve multi-provider/private model goal |
| `B` (recommended) | Build provider-agnostic AI connection registry with adapter runtime and billing-source policy | Aligns with long-term multimodal strategy; reuses channel-registry architecture | Larger first implementation wave |
| `C` | Keep OpenRouter as single aggregator and model all providers behind it | Simpler runtime surface | Limits private endpoint control and provider-native capabilities |

### Recommendation

Adopt **Option B**. It is the only option that satisfies user-facing provider flexibility, private model connectivity, and future voice/multimodal extensibility without repeated rewrites.

---

## Strategy pillars

1. **Provider abstraction first:** one canonical provider/connection schema reused by backend and UI.
2. **Security by default:** encrypted secrets, decrypt-on-use, explicit credential provenance.
3. **Runtime determinism:** provider adapters normalize usage/tool calls/errors and route through policy.
4. **Billing clarity:** every request carries billing source and charge class.
5. **Quality gating:** enable models/providers only after conformance thresholds pass.
6. **Migration safety:** preserve OpenRouter parity while progressively introducing provider-native paths.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Contract freeze and schema baseline | `A` | `BMF-001`..`BMF-003` |
| Phase 2 | Credential vault and provider registry | `B` | `BMF-004`..`BMF-006` |
| Phase 3 | Adapter runtime and routing policy | `C` | `BMF-007`..`BMF-009` |
| Phase 4 | Credits and BYOK commercialization | `D` | `BMF-010`..`BMF-012` |
| Phase 5 | Integrations + AI settings UX | `E` | `BMF-013`..`BMF-014` |
| Phase 6 | Conformance, voice, OpenClaw bridge | `F` | `BMF-015`..`BMF-017` |
| Phase 7 | Migration and production closeout | `G` | `BMF-018`..`BMF-019` |

---

## Delivery waves

1. **Wave 0:** complete lane `A` and freeze taxonomy/contracts.
2. **Wave 1:** execute lanes `B` and `C` in parallel to unlock backend provider support.
3. **Wave 2:** execute lane `D` (billing policy) and lane `E` (product surfaces).
4. **Wave 3:** execute lane `F` quality/multimodal validation.
5. **Wave 4:** execute lane `G` migration rollout and CI closeout.

---

## Acceptance criteria

1. Organizations can connect multiple AI providers and private endpoints from Integrations UI.
2. Runtime can execute agent requests across at least OpenRouter, OpenAI, Anthropic, Gemini, and custom OpenAI-compatible endpoints.
3. Auth profile failover and cooldown logic works across providers, not only OpenRouter.
4. Billing/credits behavior is deterministic and documented per billing source.
5. BYOK visibility and eligibility are gated by tier features, not hardcoded role stubs.
6. Voice provider connections (including ElevenLabs) use the same secure connection contract.
7. Model enablement requires passing conformance checks for tool calls, structured output, and error normalization.
8. Migration preserves existing OpenRouter behavior for orgs that do not opt into new provider connections.
9. Verification suite passes for completed rows, including `npm run docs:guard`.

---

## Non-goals

1. No broad redesign of unrelated integrations or desktop windows outside AI connection scope.
2. No forced migration of all orgs to multi-provider at launch.
3. No immediate replacement of every legacy billing/reporting artifact outside the defined lane scope.

---

## Risks and mitigations

1. **Secret handling regressions across integration paths**  
Mitigation: central encrypted credential contract, explicit encrypted field lists, and decrypt-at-send boundaries.

2. **Behavior drift between providers**  
Mitigation: adapter normalization + conformance harness + model enablement gates.

3. **Billing ambiguity and customer confusion**  
Mitigation: billing-source policy engine with explicit per-action class rules and surfaced UI copy.

4. **Migration breakage for existing OpenRouter orgs**  
Mitigation: compatibility mode, staged feature flags, and rollback-safe migration scripts.

5. **Voice integration complexity**  
Mitigation: isolate transport, STT/TTS provider selection, and runtime policy into separate modules.

---

## Success metrics

1. Time-to-connect for a new AI provider (target: under 2 minutes median).
2. Percentage of successful provider test connections per provider.
3. Runtime fallback success rate after primary provider/model failure.
4. Conformance pass rate per enabled provider/model.
5. Billing dispute rate for AI usage after BYOK rollout.
6. Share of agent traffic that can run multimodal/voice workloads without provider-specific failures.

---

## Status snapshot

- `BMF-001` is `DONE` with full baseline audit and OpenClaw reference mapping.
- `BMF-002` is `READY` and is the deterministic next task.
- All remaining implementation tasks are queued behind lane `A` contract completion.
