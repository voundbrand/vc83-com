# P2: Tool Broker

> Priority: MEDIUM | Estimated complexity: Low-Medium | Files touched: 2-3
> Prerequisites: P1 (layered tool scoping)

---

## Problem Statement

Even with layered scoping and profiles, agents may still have 20-30 tools available. Sending all of them to the LLM on every call wastes tokens (~8K-15K tokens for tool definitions) and reduces tool selection accuracy.

---

## Deliverables

1. **Intent detection** — keyword-based message classification (no LLM needed)
2. **Tool broker filter** — narrows tools to 10-15 based on intent + context
3. **Recent tool persistence** — include tools used in recent conversation turns
4. **Feature flag** — opt-in per org initially, measure impact before global rollout
5. **Metrics** — track tool selection accuracy and token savings

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/ai/agentExecution.ts` | Insert broker between step 7 (tool scoping) and step 8 (LLM call) |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/toolBroker.ts` | Intent detection, broker filter, metrics |

---

## Key Implementation

### Intent Detection (deterministic, no LLM)

```typescript
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  billing: [/invoice/i, /payment/i, /charge/i, /refund/i, /price/i, /cost/i, /bill/i],
  scheduling: [/book/i, /schedule/i, /appointment/i, /event/i, /calendar/i, /meeting/i, /available/i],
  support: [/ticket/i, /issue/i, /problem/i, /broken/i, /not working/i, /error/i, /bug/i],
  products: [/product/i, /item/i, /catalog/i, /stock/i, /inventory/i],
  contact: [/contact/i, /customer/i, /client/i, /lead/i, /subscriber/i],
  email: [/email/i, /newsletter/i, /campaign/i, /template/i],
  content: [/page/i, /blog/i, /post/i, /image/i, /photo/i, /media/i],
};
```

### Broker Filter

```typescript
export function brokerTools(
  message: string,
  activeTools: ToolDefinition[],
  recentToolCalls: string[],
): ToolDefinition[] {
  const intents = detectIntent(message);

  // If no specific intent detected, return full set
  if (intents.includes("general") || intents.length === 0) {
    return activeTools;
  }

  // Collect intent-specific tools + recent tools + universal tools
  const selected = new Set<string>(["query_org_data", "request_feature"]);
  intents.forEach(i => INTENT_TOOL_MAPPING[i]?.forEach(t => selected.add(t)));
  recentToolCalls.slice(-5).forEach(t => selected.add(t));

  const brokered = activeTools.filter(t => selected.has(t.name));

  // Don't over-filter — minimum 5 tools
  return brokered.length >= 5 ? brokered : activeTools;
}
```

### Feature Flag

```typescript
// Check org setting
const useBroker = orgSettings.features?.toolBroker ?? false;

if (useBroker) {
  const recentTools = session.recentToolCalls ?? [];
  tools = brokerTools(userMessage, tools, recentTools);
}
```

---

## Metrics

Track per-message:
- `toolsOffered` — count of tools sent to LLM
- `toolSelected` — which tool LLM chose
- `toolInBrokeredSet` — was the selected tool in the brokered set?
- `tokensSaved` — estimated token reduction from broker

Success threshold: `toolInBrokeredSet > 95%` before global rollout.

---

## Success Criteria

- [ ] Intent detection correctly classifies common message types
- [ ] Broker reduces tool count from 20-30 to 10-15 on average
- [ ] Recently used tools always included (conversation continuity)
- [ ] Minimum 5 tools always available (no over-filtering)
- [ ] Feature-flagged per org, off by default
- [ ] Token savings measurable (target: 30-50% reduction in tool definition tokens)
