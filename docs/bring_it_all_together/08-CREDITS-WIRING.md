# 08 — Credits Wiring

> Connect the credit system to the agent execution pipeline. No billing = no revenue.

---

## Current State

The credit system is complete:
- `convex/credits/index.ts`: balance, deduct, grant, check, purchase
- `convex/schemas/creditSchemas.ts`: 3 tables (balances, transactions, purchases)
- Stripe checkout handles subscriptions and credit pack purchases
- Webhooks grant monthly credits on `invoice.payment_succeeded`

The agent execution pipeline is complete:
- `convex/ai/agentExecution.ts`: 13-step pipeline with `processInboundMessage`
- Credit cost functions exist: `getAgentMessageCost(model)`, `getToolCreditCost(toolName)`
- Pre-flight check point exists (step 7.5)
- Post-deduction point exists (step 10.5)

**The gap:** The pipeline CALLS the credit functions, but needs verification that:
1. The credit check actually blocks execution when balance is zero
2. The deduction records the right amounts per model and tool
3. The credit wall UI shows up when credits are exhausted
4. The flow from "credits exhausted" → "buy more" → "agent resumes" works end-to-end

---

## What Needs to Happen

### 1. Verify Pre-Flight Credit Check

In `agentExecution.ts` at the pre-flight check point:

```typescript
// Before calling LLM
const estimatedCost = getAgentMessageCost(config.modelId);
const creditCheck = await ctx.runQuery(
  internal.credits.index.checkCreditsInternalQuery,
  { organizationId: config.organizationId }
);

if (creditCheck.balance < estimatedCost) {
  // Don't call LLM — return a "credits exhausted" response
  // Save a system message to the session
  // Return a human-readable message to the customer:
  //   "Unser Team ist gerade nicht verfügbar. Bitte versuchen Sie es später."
  // Notify the agency owner (email/push)
  return;
}
```

**Key decision:** What does the customer see when credits run out?
- Option A: Generic "unavailable" message (don't leak billing info to end customer)
- Option B: Route to human handoff
- **Recommendation:** Option A with automatic handoff notification to agency owner

### 2. Verify Post-Deduction

After LLM response + tool executions:

```typescript
// Deduct LLM cost
const llmCost = getAgentMessageCost(config.modelId);
await ctx.runMutation(internal.credits.index.deductCreditsInternalMutation, {
  organizationId: config.organizationId,
  amount: llmCost,
  action: "agent_message",
  relatedEntityType: "agent_session",
  relatedEntityId: sessionId,
});

// Deduct per-tool cost for each executed tool
for (const toolCall of executedToolCalls) {
  const toolCost = getToolCreditCost(toolCall.name);
  if (toolCost > 0) {
    await ctx.runMutation(internal.credits.index.deductCreditsInternalMutation, {
      organizationId: config.organizationId,
      amount: toolCost,
      action: `tool_${toolCall.name}`,
      relatedEntityType: "agent_session",
      relatedEntityId: sessionId,
    });
  }
}
```

### 3. Credit Wall in Agent Config UI

When the agency owner opens the agent config and credits are low:

```
┌──────────────────────────────────────────────────┐
│ ⚠️ Nur noch 12 Credits übrig                     │
│                                                  │
│ Ihr Agent hat diesen Monat 188 Credits           │
│ verbraucht. Bei aktuellem Verbrauch reichen      │
│ Ihre Credits noch ~2 Tage.                       │
│                                                  │
│ [Credits kaufen]  [Tarif upgraden]               │
└──────────────────────────────────────────────────┘
```

The `credit-wall.tsx` component already exists. Wire it into:
- Agent config window header
- Agency dashboard (if any sub-org agent is running)
- Notification system (email when <10% credits remaining)

### 4. Low-Credit Notifications

Trigger notifications at:
- 20% remaining → In-app banner
- 10% remaining → Email to agency owner
- 0% remaining → Agent stops, email + in-app alert

### 5. Credit Usage Dashboard

Per-agent credit consumption breakdown:

```
Schmidt Sanitär Agent
├── LLM messages: 142 (426 credits)
├── Tool: create_contact: 8 (8 credits)
├── Tool: create_booking: 12 (12 credits)
├── Tool: send_email: 6 (6 credits)
└── Total: 452 credits this period
```

This data already exists in `creditTransactions` (via `relatedEntityId`). Need a UI to display it.

---

## End-to-End Flow

```
Customer sends WhatsApp message
    ↓
processInboundMessage starts
    ↓
Pre-flight credit check
  ├── Sufficient → continue pipeline
  └── Insufficient → return "unavailable" message + notify agency
    ↓
LLM generates response (e.g., 3 credits for Claude Sonnet)
    ↓
Tool executed (e.g., create_booking = 1 credit)
    ↓
Post-deduction: 3 + 1 = 4 credits deducted
    ↓
Transaction recorded with session ID
    ↓
Balance updated (daily → monthly → purchased fallback)
    ↓
If balance < 20% threshold → trigger notification
```

---

## Build Effort

| Task | Effort | Notes |
|------|--------|-------|
| Verify pre-flight check | Small | May already work — needs testing |
| Verify post-deduction | Small | May already work — needs testing |
| "Unavailable" response on zero credits | Small | ~30 lines in agentExecution.ts |
| Low-credit notifications | Medium | Email trigger + in-app banner |
| Per-agent credit usage UI | Medium | Query creditTransactions by relatedEntityId |
| Credit wall integration in agent UI | Small | Wire existing component |
| **Total** | **Small-Medium** | Mostly verification + UI wiring |

This is the **highest priority** item because without it, there's no revenue.
