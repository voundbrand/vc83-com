# Platform Usage Accounting Guardrails Master Plan

**Date:** 2026-02-25  
**Scope:** Universal AI usage metering + economics integrity + CI enforcement for all provider runtime paths.

---

## Mission

Guarantee that every AI provider request in production is metered through the same accounting contract, with billing-source-aware economics:

1. `platform` usage contributes to platform cost/revenue/margin,
2. `byok` and `private` usage remain analytics-visible but are excluded from platform margin,
3. no provider path can be introduced without metering due to CI guardrails.

---

## Non-negotiable constraints

1. Reuse existing credits and `ai.billing.recordUsage` contracts; no parallel billing system.
2. Preserve key security boundaries and org-scoped access constraints.
3. Keep super-admin economics rollups authoritative and consistent with ledger writes.
4. Keep provider-native telemetry explicit: provider/model/action + native units + native cost + cost source.

---

## Canonical accounting contract

Every metered provider call must produce:

1. Credit mutation outcome (`charged`, `skipped_not_required`, `skipped_insufficient_credits`, `failed`, or `skipped_unmetered`),
2. `aiUsage` record with:
   - `organizationId`, `billingSource`, `requestType`, `provider`, `model`, `action`,
   - native units (`nativeUsageUnit`, `nativeInputUnits`, `nativeOutputUnits`, `nativeTotalUnits`),
   - native economics (`nativeCostInCents`, `nativeCostCurrency`, `nativeCostSource`),
   - attribution and diagnostics (`providerRequestId`, `usageMetadata`, `success/error`).

---

## Baseline guard findings (from PUAG-001)

Guard scan executed on 2026-02-24 identified uncovered non-chat provider execution paths:

1. `convex/integrations/selfHealDeploy.ts`
2. `convex/ai/interviewRunner.ts`
3. `convex/ai/soulEvolution.ts`
4. `convex/ai/soulGenerator.ts`
5. `convex/integrations/v0.ts` (`v0Request` and direct `fetch` callsites)

Expected allowlist-only guard entries (not direct runtime gaps):

1. `convex/ai/chatRuntimeOrchestration.ts` (orchestration wrapper path used by covered chat runtime)
2. `convex/ai/openrouter.ts` (provider client adapter implementation)

Existing covered paths:

1. `convex/ai/chat.ts`
2. `convex/ai/agentExecution.ts`
3. `convex/ai/voiceRuntime.ts`
4. `convex/ai/voiceRuntimeAdapter.ts` (usage telemetry source)

---

## Guard-fix plan (derived from baseline scan)

### Phase 1: Contract hardening

1. DONE (2026-02-24): Implemented shared metering helper with deterministic credits + telemetry writes (`convex/ai/nonChatUsageMetering.ts`, covered by `tests/unit/ai/nonChatUsageMetering.test.ts`).
2. Normalize billing-source resolution for runtime and integrations codepaths.

### Phase 2: Runtime closure

1. Wire uncovered OpenRouter/direct callsites (`interviewRunner`, `soulGenerator`, `soulEvolution`, `selfHealDeploy`).
2. Wire v0 request paths to usage telemetry and credit accounting.

### Phase 3: CI enforcement and regression net

1. Add `ai:usage:guard` script to fail on unmetered raw provider calls.
2. Add workflow gate so pull requests fail on guard violations.
3. Add explicit allowlist semantics for wrapper/client files (`chatRuntimeOrchestration`, `openrouter`) with rationale comments.
4. Add coverage tests proving accounting correctness by billing source.

### Phase 4: Post-guard fix iteration

1. DONE (2026-02-25): Ran guard against full repo with `npm run ai:usage:guard`; output reported zero newly introduced unmetered provider call surfaces.
2. DONE (2026-02-25): Converted guard output into deterministic queue artifacts; violations discovered: `0`, therefore deterministic guard-fix backlog rows added: `0`.
3. DONE (2026-02-25): Reran full closeout verification profile with all commands passing: `npx convex codegen`, `npm run typecheck`, `npm run test:unit`, `npm run ai:usage:guard`, `npm run docs:guard`.

---

## Acceptance criteria

1. Guard reports zero unmetered runtime provider callsites.
2. Every provider path persists usage telemetry with billing-source attribution.
3. Platform economics rollups reflect only `platform` cost/revenue/margin.
4. BYOK/private usage remains visible in analytics breakdowns.
5. Verification profile passes: codegen, typecheck, unit tests, docs guard, CI guard.

Lane E validation status (2026-02-25): acceptance criteria 1 and 5 are satisfied by direct verification output and queue sync.

---

## Execution mapping

Queue execution is defined in:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md`

Lane mapping:

1. Lane `A`: contract hardening
2. Lane `B`: uncovered OpenRouter/direct closure
3. Lane `C`: v0 accounting closure
4. Lane `D`: CI guard + tests
5. Lane `E`: guard run + fix-plan iteration + closeout
