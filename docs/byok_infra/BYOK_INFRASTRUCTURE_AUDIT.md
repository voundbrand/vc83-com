# BYOK Infrastructure Audit

> Last updated: 2026-02-04
> Status: ~80% built, key gaps identified

L4YERCAK3 already has most of the BYOK (Bring Your Own Key) infrastructure in place. The schema, settings mutation, API key routing, OpenRouter client, and UI components all exist. This document maps every piece that's built and every gap that remains.

---

## 1. What's Already Built

### 1.1 Schema — `convex/schemas/aiSchemas.ts`

The `organizationAiSettings` table has two BYOK-specific fields:

```typescript
// Line 163-166
billingMode: v.optional(v.union(
  v.literal("platform"),    // Use platform's OpenRouter API key
  v.literal("byok"),        // Use organization's own API key
)),

// Line 186 (inside llm object)
openrouterApiKey: v.optional(v.string()),
```

**Status: COMPLETE.** Both fields are defined, indexed, and validated. The `billingMode` field discriminates between platform-managed and BYOK organizations. The `openrouterApiKey` stores the org's custom key.

---

### 1.2 Settings Mutation — `convex/ai/settings.ts`

The `upsertAISettings` mutation (line 85) accepts both BYOK fields:

```typescript
// Lines 89-92
billingMode: v.union(
  v.literal("platform"),
  v.literal("byok"),
),

// Lines 113-114 (inside llm arg)
openrouterApiKey: v.optional(v.string()),
```

The handler (line 129+) stores both values directly into the `organizationAiSettings` document. It also auto-populates system default models if none are provided.

**Status: COMPLETE.** The mutation correctly accepts and persists BYOK configuration. No tier validation exists yet (see Gap 4).

---

### 1.3 Chat Routing — `convex/ai/chat.ts`

The main chat action already branches on the org's custom key:

```typescript
// Line 211
const apiKey = settings.llm.openrouterApiKey || process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OpenRouter API key not configured");
}

// Line 216
const client: OpenRouterClient = new OpenRouterClient(apiKey);
```

This is the core BYOK routing logic. If the org has saved an `openrouterApiKey`, it takes priority. Otherwise, the platform's environment variable key is used.

**Status: COMPLETE.** Key routing works. The gap is downstream — billing and spend tracking still run regardless of which key was used (see Gap 1).

---

### 1.4 OpenRouter Client — `convex/ai/openrouter.ts`

The client is key-agnostic:

```typescript
// Lines 39-45
export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
}
```

It uses whatever key is passed to the constructor. No internal assumptions about key source.

**Status: COMPLETE.** No changes needed here.

---

### 1.5 UI — `ai-settings-tab-v3.tsx` (Current)

The BYOK UI is fully built (lines 913-967):

- Checkbox toggle: "Use My Own OpenRouter API Key"
- Password input for the API key with `sk-or-v1-...` placeholder
- Link to `openrouter.ai/keys` for key generation
- Warning styling (yellow background, AlertTriangle icon)
- Label: "Skip invoicing to ourselves when using our own system"

The save handler (lines 344-354) correctly wires BYOK values:

```typescript
billingMode: useBYOK && isSuperAdmin ? "byok" : "platform",
openrouterApiKey: (useBYOK && isSuperAdmin && openrouterApiKey) ? openrouterApiKey : undefined,
```

**Status: BUILT BUT HIDDEN.** The entire BYOK section is gated behind:

```typescript
// Line 22-23
const isSuperAdmin = false; // For now, disabled until we add proper super admin detection
```

This hardcoded `false` means the UI never renders for anyone (see Gap 3).

---

### 1.6 UI — `ai-settings-tab-v2.tsx` (Legacy)

The older v2 settings tab (lines 580-701) has a complete BYOK UI with radio button toggle between "Platform API Key" and "Bring Your Own Key". This version does NOT have the super admin gate — it was unrestricted.

**Status: COMPLETE but LEGACY.** The v3 tab is the active version.

---

### 1.7 External API — `convex/api/v1/aiChat.ts`

The HTTP API response includes a BYOK indicator:

```typescript
// Lines 409-411
llm: {
  hasApiKey: !!settings.llm.openrouterApiKey,
}
```

Exposes a boolean flag indicating whether a custom key is configured, without leaking the actual key value.

**Status: COMPLETE.**

---

## 2. What's Missing (The Gaps)

### Gap 1: Billing Doesn't Check billingMode

**Main chat path** (`convex/ai/chat.ts:937-945`):

```typescript
const cost = client.calculateCost(
  response.usage || { prompt_tokens: 0, completion_tokens: 0 },
  model
);
await ctx.runMutation(api.ai.settings.updateMonthlySpend, {
  organizationId: args.organizationId,
  costUsd: cost,
});
```

This runs unconditionally. A BYOK organization using their own key still has `currentMonthSpend` incremented, which will eventually trigger the budget limit (`settings.monthlyBudgetUsd`). This is incorrect — BYOK orgs are paying their provider directly, not through us.

**Legacy billing** (`convex/ai/billing.ts:408-493`):

```typescript
export const recordUsage = mutation({
  // No billingMode in args
  // Always deducts from aiSubscriptions.includedTokensUsed
  // Always deducts from aiTokenBalance.purchasedTokens on overage
});
```

The `recordUsage` mutation has no awareness of BYOK. It always deducts tokens. This function is part of the old token-based billing system (pre-credits) and isn't currently called from the main chat flow, but it should still be BYOK-aware for any legacy code paths.

**Impact:** BYOK orgs would hit artificial budget limits and see incorrect usage/spend data.

---

### Gap 2: Agent Execution Hardcodes Platform Key

`convex/ai/agentExecution.ts:183-188`:

```typescript
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  return { status: "error", message: "OpenRouter API key not configured" };
}
const client = new OpenRouterClient(apiKey);
```

Unlike `chat.ts`, agent execution does NOT check `settings.llm.openrouterApiKey`. It always uses the platform key. This means:

1. **BYOK orgs' agents use the platform key** — their custom key is ignored for agent execution
2. **Credit pre-flight check** (lines 157-180) always runs — would block BYOK orgs when platform credits run out, even though they're paying their own provider
3. **Credit deduction** (lines 264-280) always runs — charges BYOK orgs platform credits for agent actions they're paying for directly

**Impact:** Agents are completely disconnected from BYOK. An Agency tier org with BYOK would still consume platform credits for every agent interaction.

---

### Gap 3: Super Admin Detection Is Stubbed

`ai-settings-tab-v3.tsx:22-23`:

```typescript
// Check if user is super admin (only super admin can use BYOK)
// TODO: Add role field to User type or check via a query
const isSuperAdmin = false;
```

The original intent was super-admin-only BYOK (for internal use: "Skip invoicing to ourselves when using our own system"). The new requirement is tier-based access (Agency+), which changes the gating logic from role-based to tier-based.

**Impact:** No user can access the BYOK UI.

---

### Gap 4: No Tier-Level Feature Gate

The `TierFeatures` interface in `convex/licensing/tierConfigs.ts` (line 218) includes `aiEnabled: boolean` but has no `aiByokEnabled` field. The `checkFeatureAccess()` helper in `convex/licensing/helpers.ts` (line 379) cannot gate BYOK because there's no feature flag for it.

There is no enforcement anywhere in the backend that prevents a Free or Pro org from setting `billingMode: "byok"`. If the UI gate were removed, any org could configure BYOK.

**Impact:** No tier enforcement for BYOK access. Must be added to both backend (mutation validation) and frontend (UI visibility).

---

### Gap 5: No Key Validation

When an org saves an OpenRouter API key:
- No test call is made to verify the key works
- No check for key format (`sk-or-v1-...`)
- No status indicator showing key health (valid, expired, rate-limited)
- No fallback behavior when a custom key fails mid-request

If an org enters an invalid key, their AI will silently break on the next request.

**Impact:** Poor UX. Users won't know why AI stopped working if their key is invalid or exhausted.

---

### Gap 6: No Encryption at Rest

The `openrouterApiKey` is stored as a plain string in the Convex database. While Convex encrypts data at rest at the infrastructure level, the key is readable by anyone with database access (including all backend functions).

**Impact:** Security concern for enterprise customers. API keys should be encrypted with a platform-level secret before storage.

---

## 3. Dual Billing Architecture (Current State)

The platform currently has two active billing paths for AI usage. BYOK must account for both.

### Path A: Main Chat — Monthly Spend Counter

Used by: `convex/ai/chat.ts` (the interactive chat UI)

```
User sends message
  → chat.ts:211 — Select API key (BYOK or platform)
  → OpenRouter API call
  → chat.ts:937 — calculateCost() using hardcoded price table
  → chat.ts:941 — updateMonthlySpend() increments organizationAiSettings.currentMonthSpend
  → chat.ts:206 — Next request checks currentMonthSpend < monthlyBudgetUsd
```

This is a simple USD counter. No credit deduction. No subscription check. Just a running total of estimated AI spend for the month, compared against an optional budget cap.

**BYOK fix needed:** Skip `updateMonthlySpend()` when `billingMode === "byok"`. Or better: still track spend for analytics but don't enforce the budget cap (since they're paying their provider, not us).

### Path B: Agent Execution — Credit System

Used by: `convex/ai/agentExecution.ts` (WhatsApp, SMS, email agents)

```
Inbound message arrives
  → agentExecution.ts:157 — Pre-flight credit check (checkCreditsInternalQuery)
  → agentExecution.ts:183 — Always uses platform OPENROUTER_API_KEY
  → OpenRouter API call
  → agentExecution.ts:264 — Deduct credits (deductCreditsInternalMutation)
  → agentExecution.ts:282 — Deduct tool credits for each successful tool call
```

This uses the full credit system (`convex/credits/index.ts`). Credits are deducted from daily → monthly → purchased pools in order. When credits are exhausted, the agent returns a "team unavailable" message.

**BYOK fix needed:** (1) Use org's custom key instead of platform key, (2) skip pre-flight credit check for BYOK orgs, (3) skip credit deduction for BYOK orgs, (4) still log usage for analytics.

### Path C: Legacy Token Billing (Deprecated)

Used by: Nothing in the current main flow (was `convex/ai/billing.ts:recordUsage`)

This is the old Stripe-subscription-based token system with `aiSubscriptions`, `aiTokenBalance`, and `aiUsage` tables. It tracked included tokens per subscription tier and deducted from purchased token packs on overage.

**BYOK fix needed:** Add a `billingMode` check if this path is ever reactivated. Currently safe to ignore.

---

## 4. Request Flow — Where BYOK Touches

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND                                                     │
│                                                              │
│ ai-settings-tab-v3.tsx                                       │
│   └── BYOK toggle + API key input                           │
│       └── handleSave() → upsertAISettings()                 │
│           ├── billingMode: "byok"                            │
│           └── openrouterApiKey: "sk-or-v1-..."               │
│                                                              │
│ chat-input-redesign.tsx                                       │
│   └── sendMessage() → convex action                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ BACKEND: convex/ai/chat.ts                                   │
│                                                              │
│ 1. Load settings (getAISettings)                             │
│ 2. Rate limit check                                          │
│ 3. Budget check ◄── GAP: runs even for BYOK                 │
│ 4. API key selection ◄── WORKS: uses custom key if present   │
│    apiKey = settings.llm.openrouterApiKey || env.KEY          │
│ 5. OpenRouter call                                           │
│ 6. Tool execution loop                                       │
│ 7. updateMonthlySpend ◄── GAP: always increments             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ BACKEND: convex/ai/agentExecution.ts                         │
│                                                              │
│ 1. Load agent config                                         │
│ 2. Rate limit check                                          │
│ 3. Credit pre-flight ◄── GAP: blocks BYOK when credits=0    │
│ 4. API key = env.KEY ◄── GAP: always platform key            │
│ 5. OpenRouter call                                           │
│ 6. Deduct credits ◄── GAP: always deducts                    │
│ 7. Deduct tool credits ◄── GAP: always deducts               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ OPENROUTER                                                   │
│                                                              │
│ Receives request with either:                                │
│   - Platform key (L4YERCAK3 pays)                            │
│   - Org's custom key (org pays their provider directly)      │
│                                                              │
│ Native BYOK support:                                         │
│   - 5% fee on custom key requests (waived first 1M/month)   │
│   - Falls back to shared credits on rate limit                │
│   - Usage telemetry available for both key types              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Tier Integration Design

### Confirmed tier mapping (Agency + Enterprise only):

| Tier | Price | BYOK | Credits | Rationale |
|------|-------|------|---------|-----------|
| **Free** | EUR 0 | No | 5/day on login | No key management, demo only |
| **Pro** | EUR 29/mo | No | 200/mo + 5/day | Credits included, simple onboarding |
| **Agency** | EUR 299/mo | **Yes** | 2,000/mo + 5/day | Agencies have provider contracts |
| **Enterprise** | Custom | **Yes** | Unlimited | Full BYOK + private LLM |

### What BYOK means at each enabled tier:

**Agency (EUR 299/mo):**
- Can connect their own OpenRouter API key
- When BYOK is enabled: AI requests use org's key, no credit deduction for AI actions
- Credits still consumed for non-AI actions (workflow triggers, sequence steps, email sends)
- Usage still tracked for analytics and reporting
- Can switch between BYOK and platform mode at any time

**Enterprise (Custom):**
- Same as Agency, plus:
- Private LLM deployment option (future)
- Custom model routing rules (future)
- Dedicated support for key management

### What happens to credits when BYOK is active?

Credits that cover AI actions (`agent_message_simple`, `agent_message_complex`, `agent_message_default`) are NOT deducted. Credits that cover non-AI actions (`workflow_trigger`, `sequence_step_email`, `sms_outbound`) ARE still deducted — these are platform compute, not LLM calls.

The `CREDIT_COSTS` table in `convex/credits/index.ts:484` defines which actions are AI vs non-AI. The BYOK exemption applies only to actions that involve an LLM call through OpenRouter.

---

## 6. Competitive Context

| Platform | BYOK Availability | BYOK Pricing | Revenue Model |
|----------|-------------------|--------------|---------------|
| **Voiceflow** | Enterprise only | Custom pricing | Credit-based, BYOK gated highest tier |
| **Botpress** | All paid plans | Zero markup, platform fee only | Platform fee revenue |
| **Relevance AI** | Paid plans | 0 credits when BYOK, 20% markup otherwise | Hybrid: markup OR platform fee |
| **OpenRouter** | Native feature | 5% routing fee (waived first 1M/mo) | Routing fee on all requests |
| **L4YERCAK3** | Agency + Enterprise | Credits exempted for AI actions | Platform fee + credits for non-AI |

L4YERCAK3's approach is closest to Voiceflow (tier-gated) but more accessible (Agency at EUR 299 vs Enterprise-only). The credit exemption model is similar to Relevance AI's "0 credits when BYOK" approach.

---

## 7. File Reference Index

### Already built (working):
| File | Lines | Component |
|------|-------|-----------|
| `convex/schemas/aiSchemas.ts` | 163-186 | Schema: billingMode + openrouterApiKey fields |
| `convex/ai/settings.ts` | 85-128 | Mutation: accepts BYOK config |
| `convex/ai/chat.ts` | 211-216 | Routing: custom key priority |
| `convex/ai/openrouter.ts` | 39-45 | Client: key-agnostic constructor |
| `ai-settings-tab-v3.tsx` | 913-967 | UI: BYOK toggle + key input |
| `ai-settings-tab-v3.tsx` | 344-354 | UI: save handler with BYOK values |
| `convex/api/v1/aiChat.ts` | 409-411 | API: hasApiKey boolean flag |

### Gaps (needs work):
| File | Lines | Gap |
|------|-------|-----|
| `convex/ai/chat.ts` | 206-208 | Budget check runs for BYOK |
| `convex/ai/chat.ts` | 937-945 | updateMonthlySpend runs for BYOK |
| `convex/ai/agentExecution.ts` | 157-180 | Credit pre-flight blocks BYOK |
| `convex/ai/agentExecution.ts` | 183-188 | Hardcoded platform key |
| `convex/ai/agentExecution.ts` | 264-280 | Credit deduction runs for BYOK |
| `convex/ai/billing.ts` | 408-493 | recordUsage has no BYOK awareness |
| `ai-settings-tab-v3.tsx` | 22-23 | isSuperAdmin hardcoded false |
| `convex/licensing/tierConfigs.ts` | 218 | No aiByokEnabled feature flag |
| `convex/licensing/helpers.ts` | 379-406 | Can't gate BYOK per tier |

### Tier system (needs additions):
| File | Lines | Component |
|------|-------|-----------|
| `convex/licensing/tierConfigs.ts` | 218+ | TierFeatures interface |
| `convex/licensing/tierConfigs.ts` | 477, 719, 961, 1203 | Per-tier feature flags |
| `convex/licensing/helpers.ts` | 379-406 | checkFeatureAccess() |
| `convex/licensing/helpers.ts` | 834-862 | getFeatureRequiredTier() |
| `convex/credits/index.ts` | 484-557 | CREDIT_COSTS definitions |
