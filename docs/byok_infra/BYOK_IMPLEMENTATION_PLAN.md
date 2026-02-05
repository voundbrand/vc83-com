# BYOK Implementation Plan

> Last updated: 2026-02-04
> Depends on: [BYOK Infrastructure Audit](./BYOK_INFRASTRUCTURE_AUDIT.md)
> Tier gate: Agency (EUR 299/mo) + Enterprise only

This document specifies the exact code changes needed to close the BYOK gaps and wire it into the licensing system.

---

## Phase 1: Add `aiByokEnabled` to the Tier System

### 1.1 Update TierFeatures interface

**File:** `convex/licensing/tierConfigs.ts`
**Location:** Line 218 (inside `TierFeatures` interface)

Add after `aiEnabled: boolean`:

```typescript
aiByokEnabled: boolean;  // Can configure own OpenRouter API key
```

### 1.2 Set per-tier values

**File:** `convex/licensing/tierConfigs.ts`

| Tier config location | Value |
|---------------------|-------|
| Free tier features (~line 477) | `aiByokEnabled: false` |
| Pro tier features (~line 719) | `aiByokEnabled: false` |
| Agency tier features (~line 961) | `aiByokEnabled: true` |
| Enterprise tier features (~line 1203) | `aiByokEnabled: true` |

### 1.3 Add to feature-tier mapping

**File:** `convex/licensing/helpers.ts`
**Location:** Inside `getFeatureRequiredTier()` (~line 834)

Add to the `featureTierMap`:

```typescript
aiByokEnabled: "Agency (€299/month)",
```

---

## Phase 2: Add Tier Gate to Settings Mutation

**File:** `convex/ai/settings.ts`
**Location:** Inside `upsertAISettings` handler (line 129)

Before storing settings, validate BYOK access:

```typescript
// At the start of the handler, after getting args:
if (args.billingMode === "byok") {
  // Check that the org's tier allows BYOK
  await checkFeatureAccess(ctx, args.organizationId, "aiByokEnabled");

  // Validate that a key was provided
  if (!args.llm.openrouterApiKey) {
    throw new Error("OpenRouter API key is required for BYOK mode");
  }
}
```

Import `checkFeatureAccess` from `../licensing/helpers`.

This ensures that even if the frontend gate is bypassed (e.g., via direct API call), the backend rejects BYOK for Free/Pro orgs.

---

## Phase 3: Fix Billing Skip for BYOK

### 3.1 Main chat — skip spend tracking for BYOK

**File:** `convex/ai/chat.ts`
**Location:** Lines 937-945

Change from unconditional spend update to conditional:

```typescript
// Only track spend for platform-billed orgs
if (settings.billingMode !== "byok") {
  const cost = client.calculateCost(
    response.usage || { prompt_tokens: 0, completion_tokens: 0 },
    model
  );
  await ctx.runMutation(api.ai.settings.updateMonthlySpend, {
    organizationId: args.organizationId,
    costUsd: cost,
  });
}
```

Also update the budget check (line 206-208) to skip for BYOK:

```typescript
// Check budget (only for platform-billed orgs)
if (settings.billingMode !== "byok" &&
    settings.monthlyBudgetUsd &&
    settings.currentMonthSpend >= settings.monthlyBudgetUsd) {
  throw new Error("Monthly AI budget exceeded...");
}
```

### 3.2 Agent execution — skip credit checks for BYOK

**File:** `convex/ai/agentExecution.ts`

Three changes needed:

**A. Load org AI settings** (add before line 157):

```typescript
// Load org AI settings to check BYOK mode
const aiSettings = await ctx.runQuery(
  internal.ai.settings.getAISettingsInternal,
  { organizationId: args.organizationId }
);
const isByok = aiSettings?.billingMode === "byok";
```

Note: May need to create `getAISettingsInternal` as an internal query if one doesn't exist.

**B. Skip credit pre-flight** (wrap lines 157-180):

```typescript
if (!isByok) {
  // Pre-flight credit check (existing code)
  const creditCheck = await ctx.runQuery(
    internal.credits.index.checkCreditsInternalQuery,
    { organizationId: args.organizationId, requiredAmount: estimatedCost }
  );
  if (!creditCheck.hasCredits) {
    // ... existing exhaustion handling
  }
}
```

**C. Skip credit deduction** (wrap lines 264-303):

```typescript
if (!isByok) {
  // Deduct credits for LLM call (existing code)
  // ... lines 264-280

  // Deduct credits for tool executions (existing code)
  // ... lines 282-303
}
```

---

## Phase 4: Wire Agent Execution to Use Org Key

**File:** `convex/ai/agentExecution.ts`
**Location:** Lines 183-188

Change from hardcoded platform key to org-aware key selection:

```typescript
// Use org's BYOK key if available, otherwise platform key
const apiKey = (isByok && aiSettings?.llm?.openrouterApiKey)
  ? aiSettings.llm.openrouterApiKey
  : process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  return { status: "error", message: "OpenRouter API key not configured" };
}

const client = new OpenRouterClient(apiKey);
```

This mirrors the pattern already working in `chat.ts:211`.

---

## Phase 5: Ungate the UI

**File:** `src/components/window-content/org-owner-manage-window/ai-settings-tab-v3.tsx`

### 5.1 Replace hardcoded gate with tier check

Remove lines 21-23:
```typescript
// DELETE: const isSuperAdmin = false;
```

Replace with a tier-based check using the existing license system:

```typescript
// Check if org's tier allows BYOK
const license = useQuery(
  api.licensing.helpers.checkFeatureAccessQuery,
  organizationId ? { organizationId, featureName: "aiByokEnabled" } : "skip"
);
const canUseBYOK = license !== undefined && !license?.error;
```

Or use the license hook if available:

```typescript
const { features } = useLicense(organizationId);
const canUseBYOK = features?.aiByokEnabled ?? false;
```

### 5.2 Update the BYOK section gate

Change line 914 from:

```typescript
{isSuperAdmin && (
```

To:

```typescript
{canUseBYOK && (
```

### 5.3 Update save handler

Change line 347 from:

```typescript
billingMode: useBYOK && isSuperAdmin ? "byok" : "platform",
```

To:

```typescript
billingMode: useBYOK && canUseBYOK ? "byok" : "platform",
```

And line 354:

```typescript
openrouterApiKey: (useBYOK && canUseBYOK && openrouterApiKey) ? openrouterApiKey : undefined,
```

### 5.4 Update section styling and copy

Change the section header from "Super Admin Only: Bring Your Own Key" to:

```
Bring Your Own AI Key (Agency Plan Feature)
```

Update the description from "Skip invoicing to ourselves when using our own system" to:

```
Connect your own OpenRouter account. AI actions won't consume platform credits — you pay your provider directly.
```

### 5.5 Add key validation on save

Before saving, make a test call:

```typescript
if (useBYOK && openrouterApiKey) {
  setIsValidatingKey(true);
  try {
    const isValid = await validateOpenRouterKey({ key: openrouterApiKey });
    if (!isValid) {
      alert("Invalid OpenRouter API key. Please check your key at openrouter.ai/keys");
      return;
    }
  } finally {
    setIsValidatingKey(false);
  }
}
```

This requires a new backend action that makes a lightweight OpenRouter API call (e.g., list models) with the provided key.

---

## Phase 6: Analytics-Only Usage Tracking for BYOK

Even when BYOK orgs aren't billed, we want usage data for:
- Platform analytics (total AI volume across all orgs)
- Agency reporting (see their own AI consumption)
- Model usage statistics (which models are popular)
- Cost estimation (what they would have paid on platform credits)

### 6.1 Create analytics-only logging

**File:** `convex/ai/settings.ts` (or new file `convex/ai/usageAnalytics.ts`)

```typescript
export const recordByokUsage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    estimatedCostUsd: v.number(),
    source: v.union(v.literal("chat"), v.literal("agent")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiUsage", {
      organizationId: args.organizationId,
      requestType: args.source,
      provider: args.model.split("/")[0],
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.inputTokens + args.outputTokens,
      costInCents: Math.round(args.estimatedCostUsd * 100),
      tier: "byok",   // New tier value to distinguish in analytics
      success: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### 6.2 Wire into chat.ts

After the existing BYOK billing skip (Phase 3.1), add:

```typescript
if (settings.billingMode === "byok") {
  // Track usage for analytics only (no billing)
  const cost = client.calculateCost(
    response.usage || { prompt_tokens: 0, completion_tokens: 0 },
    model
  );
  await ctx.runMutation(internal.ai.usageAnalytics.recordByokUsage, {
    organizationId: args.organizationId,
    model,
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    estimatedCostUsd: cost,
    source: "chat",
  });
}
```

### 6.3 Wire into agentExecution.ts

After the BYOK credit skip (Phase 3.2), add equivalent analytics logging with `source: "agent"`.

---

## Phase Summary

| Phase | Scope | Files | Complexity |
|-------|-------|-------|------------|
| 1 | Tier feature flag | tierConfigs.ts, helpers.ts | Low |
| 2 | Backend gate | settings.ts | Low |
| 3 | Billing skip | chat.ts, agentExecution.ts | Medium |
| 4 | Agent key routing | agentExecution.ts | Low |
| 5 | UI ungating | ai-settings-tab-v3.tsx | Medium |
| 6 | Analytics tracking | New file + chat.ts + agentExecution.ts | Medium |

Phases 1-4 are backend-only and can be deployed together. Phase 5 is frontend and depends on phases 1-2. Phase 6 is optional for initial launch but recommended.

---

## Testing Checklist

- [ ] Free tier org cannot set `billingMode: "byok"` via mutation (expect FEATURE_LOCKED error)
- [ ] Pro tier org cannot set `billingMode: "byok"` via mutation (expect FEATURE_LOCKED error)
- [ ] Agency tier org CAN set `billingMode: "byok"` with a valid key
- [ ] Enterprise tier org CAN set `billingMode: "byok"` with a valid key
- [ ] BYOK org's main chat uses custom key (verify in OpenRouter dashboard)
- [ ] BYOK org's main chat does NOT increment `currentMonthSpend`
- [ ] BYOK org's agent execution uses custom key
- [ ] BYOK org's agent execution does NOT deduct credits
- [ ] BYOK org with zero credits can still use AI (not blocked by pre-flight check)
- [ ] Platform org with zero credits IS blocked (existing behavior preserved)
- [ ] BYOK usage appears in analytics/usage tables with `tier: "byok"`
- [ ] Invalid API key shows clear error message on save
- [ ] Switching from BYOK back to platform mode restores normal credit deduction
- [ ] UI shows BYOK section for Agency+ tiers, hides for Free/Pro
