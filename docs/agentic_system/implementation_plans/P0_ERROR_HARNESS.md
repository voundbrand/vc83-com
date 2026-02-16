# P0: Error Harness Implementation Plan

> Priority: CRITICAL | Estimated complexity: Medium | Files touched: 4-6

---

## Problem Statement

The current pipeline wraps all external calls in try/catch and logs errors to console. Errors are swallowed silently — the user never receives feedback, the owner is never notified, and there's no retry logic. This means:

- Failed channel sends = user sees nothing (message lost)
- Failed LLM calls = pipeline returns `status: "error"` with no user message
- Failed credit deductions = revenue leak
- Failed tools = agent may or may not explain

---

## Deliverables

1. **Retry wrapper** for LLM calls with exponential backoff + model failover
2. **Retry wrapper** for channel sends with provider-specific policies
3. **Error classification** (transient/degraded/fatal/loop) in pipeline
4. **User-facing error messages** — never fail silently
5. **Dead letter queue** for undeliverable messages
6. **Owner notification** for critical errors with dedup/cooldown
7. **Session error state** tracking (failed tools, degraded mode)

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/ai/agentExecution.ts` | Steps 8, 9, 11, 13 — add retry + error classification + user messages |
| `convex/channels/router.ts` | Add retry wrapper for `sendMessage` |
| `convex/ai/platformAlerts.ts` | Add new alert types + dedup cooldowns |
| `convex/ai/agentSessions.ts` | Add `errorState` tracking fields |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/retryPolicy.ts` | Retry wrapper with exponential backoff, jitter, provider policies |
| `convex/ai/errorMessages.ts` | User-facing error message templates |
| `convex/ai/deadLetterQueue.ts` | Dead letter queue CRUD + scheduled retry cron |

---

## Implementation Steps

### Step 1: Create retry utility (`convex/ai/retryPolicy.ts`)

```typescript
// Generic retry wrapper
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy,
  context?: string,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryable(error, policy) || attempt === policy.maxAttempts) {
        throw error;
      }

      const delay = calculateDelay(attempt, error, policy);
      await sleep(delay);
    }
  }

  throw lastError!;
}

// Exponential backoff with jitter
function calculateDelay(attempt: number, error: any, policy: RetryPolicy): number {
  // Use provider's retry_after if available
  const retryAfter = error?.headers?.["retry-after"];
  if (retryAfter) {
    return parseInt(retryAfter) * 1000;
  }

  const base = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  const capped = Math.min(base, policy.maxDelayMs);
  const jittered = capped * (1 + (Math.random() * 2 - 1) * policy.jitter);
  return Math.max(0, jittered);
}

// Predefined policies
export const LLM_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 4,
  jitter: 0.1,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export const CHANNEL_RETRY_POLICIES: Record<string, RetryPolicy> = {
  telegram: { maxAttempts: 3, baseDelayMs: 400, maxDelayMs: 30000, backoffMultiplier: 3, jitter: 0.1 },
  whatsapp: { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 30000, backoffMultiplier: 3, jitter: 0.1 },
  sms:      { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2, jitter: 0.1 },
  email:    { maxAttempts: 3, baseDelayMs: 2000, maxDelayMs: 60000, backoffMultiplier: 3, jitter: 0.1 },
};
```

### Step 2: Create error message templates (`convex/ai/errorMessages.ts`)

```typescript
export const USER_ERROR_MESSAGES = {
  CREDITS_EXHAUSTED: "I've used up my thinking budget for today. I'll be back with more capacity soon! If this is urgent, please contact {ownerContact}.",
  ALL_MODELS_FAILED: "I'm having some technical difficulties right now. Please try again in a few minutes.",
  AGENT_OFFLINE: "I'm currently offline. Please try again later.",
  TOOL_FAILED: "I ran into an issue with that action. Let me try another approach.",
  STUCK: "I seem to be having trouble with this. Let me connect you with someone who can help.",
  APPROVAL_EXPIRED: "I was waiting for authorization that didn't come through. Let me try to help you another way.",
};

export function formatErrorMessage(template: string, context: Record<string, string>): string {
  return Object.entries(context).reduce(
    (msg, [key, value]) => msg.replace(`{${key}}`, value),
    template
  );
}
```

### Step 3: Modify `agentExecution.ts` — Step 8 (LLM call)

```typescript
// BEFORE (current):
try {
  const response = await callOpenRouter(params);
} catch (e) {
  console.error("LLM call failed:", e);
  return { status: "error" };
}

// AFTER:
try {
  const response = await callLLMWithFailover(params, agentConfig);
} catch (e) {
  // All retries + fallbacks exhausted
  await sendErrorMessageToUser(session, "ALL_MODELS_FAILED", { ownerContact });
  await notifyOwnerIfNotRecent(orgId, "ALL_MODELS_FAILED", { error: String(e) });
  return { status: "error", userNotified: true };
}

// Model failover chain
async function callLLMWithFailover(params, config) {
  const models = [config.modelId, ...(config.fallbackModels || [])];
  for (const modelId of models) {
    try {
      return await withRetry(() => callOpenRouter({ ...params, model: modelId }), LLM_RETRY_POLICY);
    } catch { continue; }
  }
  throw new Error("ALL_MODELS_FAILED");
}
```

### Step 4: Modify `agentExecution.ts` — Step 9 (tool execution)

```typescript
// Add session-level error tracking
const failedToolsThisSession: Map<string, number> = new Map();

// Per tool call:
try {
  const result = await TOOL_REGISTRY[toolName]?.execute(toolCtx, parsedArgs);
  toolResults.push({ tool: toolName, status: "success", result });
} catch (e) {
  const failCount = (failedToolsThisSession.get(toolName) || 0) + 1;
  failedToolsThisSession.set(toolName, failCount);

  if (failCount >= 3) {
    // Disable tool for rest of session
    session.disabledForSession.push(toolName);
    await notifyOwnerIfNotRecent(orgId, "TOOL_DISABLED", { tool: toolName, error: String(e) });
  }

  // Still pass error to LLM so it can respond gracefully
  toolResults.push({ tool: toolName, status: "error", error: String(e) });
}
```

### Step 5: Modify `channels/router.ts` — Step 13 (channel send)

```typescript
// BEFORE:
try {
  await provider.sendMessage(credentials, message);
} catch (e) {
  console.error("Send failed:", e);
}

// AFTER:
const retryPolicy = CHANNEL_RETRY_POLICIES[channel] || CHANNEL_RETRY_POLICIES.telegram;

try {
  await withRetry(() => provider.sendMessage(credentials, message), retryPolicy);
} catch (e) {
  // Check if markdown parse error → retry with plain text
  if (isMarkdownParseError(e)) {
    try {
      await provider.sendMessage(credentials, stripMarkdown(message));
      return; // success with plain text
    } catch { /* fall through to dead letter */ }
  }

  // All retries failed → dead letter queue
  await addToDeadLetterQueue({
    organizationId: orgId,
    sessionId,
    channel,
    recipient,
    content: message,
    error: String(e),
  });
}
```

### Step 6: Create dead letter queue (`convex/ai/deadLetterQueue.ts`)

```typescript
export const addToDeadLetterQueue = internalMutation({ ... });
export const retryDeadLetters = internalMutation({ ... });  // cron every 5 min
export const abandonDeadLetter = internalMutation({ ... });
```

### Step 7: Add new alert types to `platformAlerts.ts`

```typescript
// New alert types
"all_models_failed" | "tool_disabled" | "channel_unhealthy" | "dead_letter_abandoned"

// Dedup cooldowns
const ALERT_COOLDOWNS = {
  all_models_failed: 30 * 60 * 1000,
  tool_disabled: 24 * 60 * 60 * 1000,
  channel_unhealthy: 60 * 60 * 1000,
  dead_letter_abandoned: 60 * 60 * 1000,
};
```

### Step 8: Add cron for dead letter retry

```typescript
// convex/crons.ts
crons.interval("retry-dead-letters", { minutes: 5 }, internal.ai.deadLetterQueue.retryDeadLetters);
```

---

## Testing Strategy

1. **Unit tests** for retry wrapper (mock failures, verify backoff timing)
2. **Unit tests** for error classification (each error type maps correctly)
3. **Integration test**: simulate LLM failure → verify user message sent + owner notified
4. **Integration test**: simulate channel send failure → verify dead letter created + retry works
5. **Integration test**: simulate tool failure 3x → verify tool disabled + owner notified

---

## Rollback Plan

All changes are additive — no existing behavior removed. If retry causes issues:
- Set `maxAttempts: 1` in retry policies = equivalent to current behavior
- Disable dead letter cron
- Remove model failover chain (use single model)

---

## Success Criteria

- [ ] No pipeline execution results in silent failure (user always gets a response)
- [ ] LLM failures retry up to 3x before falling back to alternate models
- [ ] Channel send failures retry with provider-appropriate backoff
- [ ] Undeliverable messages are queued and retried on schedule
- [ ] Org owners receive notifications for critical errors (with dedup)
- [ ] Tools that fail 3x in a session are disabled for that session
