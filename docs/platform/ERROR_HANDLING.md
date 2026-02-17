# Error Handling & Degradation

> Error classification, retry policies, degradation modes, user-facing messages, and dead letter queues.

---

## Current State (Problems)

The current pipeline wraps every external call in try/catch and logs errors to console. **Errors are swallowed silently.** The user never knows something went wrong. Specific issues:

- **Credit deduction fails** → logged, ignored. User gets response but org isn't charged (revenue leak).
- **Channel send fails** → logged. Message saved to session but never delivered. User sees nothing.
- **Tool execution fails** → error in `toolResults` array. Agent may or may not mention it.
- **LLM returns no response** → `status: "error"` returned internally. No message to user.
- **No retry logic anywhere** — every failure is one-shot.

---

## Error Classification

Every error falls into one of four categories. Each has a different handling strategy.

### TRANSIENT — Retry

Temporary failures that will likely succeed on retry.

| Error | Source | Detection | Action |
|-------|--------|-----------|--------|
| LLM rate limit | Step 8 | HTTP 429, `retry-after` header | Wait `retry_after` or exponential backoff, retry 3x |
| LLM server error | Step 8 | HTTP 500/502/503 | Exponential backoff (1s, 4s, 16s), retry 3x |
| LLM timeout | Step 8 | Request exceeds 60s | Retry once with shorter `maxTokens` |
| Channel rate limit | Step 13 | HTTP 429, provider-specific | Wait `retry_after` (Telegram min: 400ms), retry 3x |
| Channel timeout | Step 13 | Send exceeds 10s | Retry 3x with backoff |
| Credit deduction race | Step 11 | Optimistic lock failure | Retry once immediately |

### DEGRADED — Adapt

The system can continue but with reduced capability.

| Error | Source | Detection | Action |
|-------|--------|-----------|--------|
| Tool execution error | Step 9 | Tool throws exception | Pass error to LLM as tool result, let agent explain |
| Tool repeated failures | Step 9 | 3+ failures same tool in session | Disable tool for session, agent works without it |
| Channel send failed | Step 13 | All retries exhausted | Queue in dead letter, schedule retry in 5 min |
| Model unavailable | Step 8 | All retries for primary model failed | Try `fallbackModels[]` chain |
| Knowledge base empty | Step 4.5 | No docs returned | Continue without knowledge context |
| Markdown parse error | Step 13 | Provider rejects formatting | Strip to plain text, retry once |

### FATAL — Escalate

The pipeline cannot continue. Must notify humans.

| Error | Source | Detection | Action |
|-------|--------|-----------|--------|
| No API key | Step 8 | Missing OPENROUTER_API_KEY | Notify owner + tell user "I'm having trouble" |
| Credits exhausted | Step 7.5 | Zero balance, no parent fallback | Tell user clearly + notify owner |
| Agent not found | Step 1 | No active agent for org | Route to Quinn (system bot) |
| All models failed | Step 8 | Primary + all fallbacks failed | Send "having trouble" message + notify owner |
| Agent archived/paused | Step 1 | Agent status != "active" | Tell user "I'm currently offline" |
| Channel binding missing | Step 13 | No provider for channel | Log + notify owner |

### LOOP — Break

The system is stuck in a repeating failure pattern.

| Error | Source | Detection | Action |
|-------|--------|-----------|--------|
| Same error 3x consecutive | Any | Error dedup counter per session | Stop retrying, escalate to owner |
| Agent repeating itself | Step 8 | >2 similar LLM responses in row | Inject "try a different approach" prompt |
| Tool failing repeatedly | Step 9 | Same tool, same error, 3x | Disable tool category for session |
| Approval never resolved | Step 9 | Pending >24h | Expire, notify user + owner |
| Credit deduction loop | Step 11 | 3+ failures | Skip deduction, flag for manual review |

---

## Retry Policy

### LLM Calls (Step 8)

```typescript
const LLM_RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 4,     // 1s → 4s → 16s
  jitter: 0.1,              // ±10%
  retryableStatuses: [429, 500, 502, 503, 504],
  timeoutMs: 60000,
  timeoutRetryMaxTokens: 2048,  // shorter on timeout retry
};

async function callLLMWithRetry(params, policy = LLM_RETRY_POLICY) {
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await callOpenRouter(params);
    } catch (error) {
      if (!isRetryable(error, policy) || attempt === policy.maxAttempts) {
        throw error;
      }
      const delay = calculateDelay(attempt, error, policy);
      await sleep(delay);

      // On timeout, reduce maxTokens for retry
      if (isTimeout(error)) {
        params.maxTokens = Math.min(params.maxTokens, policy.timeoutRetryMaxTokens);
      }
    }
  }
}
```

### Model Failover (after all retries exhausted)

```typescript
async function callLLMWithFailover(params, agentConfig) {
  const models = [agentConfig.modelId, ...agentConfig.fallbackModels];

  for (const modelId of models) {
    try {
      return await callLLMWithRetry({ ...params, model: modelId });
    } catch (error) {
      console.warn(`Model ${modelId} failed, trying next fallback`);
      continue;
    }
  }

  // All models failed
  throw new AgentError("ALL_MODELS_FAILED", "Unable to reach any language model");
}
```

### Channel Sends (Step 13)

```typescript
const CHANNEL_RETRY_POLICIES = {
  telegram: {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 30000,
    jitter: 0.1,
    retryableErrors: [429, "ETIMEDOUT", "ECONNRESET", "temporarily_unavailable"],
    parseErrorFallback: "plain_text",  // strip markdown on parse error
  },
  whatsapp: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    jitter: 0.1,
  },
  sms: {
    maxAttempts: 2,          // SMS is expensive, fewer retries
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    jitter: 0.1,
  },
  email: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    jitter: 0.1,
  },
};
```

---

## User-Facing Error Messages

**Critical rule:** The user must ALWAYS receive a response. Never fail silently.

```typescript
const USER_ERROR_MESSAGES = {
  // Transient (retrying)
  RETRYING: "Just a moment while I think about that...",

  // Degraded
  TOOL_FAILED: "I ran into an issue with that action. Let me try another approach.",
  MODEL_FALLBACK: "Give me one more moment...",  // invisible to user
  CHANNEL_QUEUED: null,  // no user message (message will be delivered later)

  // Fatal
  CREDITS_EXHAUSTED: "I've used up my thinking budget for today. I'll be back with more capacity soon! If this is urgent, please contact {ownerContact}.",
  ALL_MODELS_FAILED: "I'm having some technical difficulties right now. Please try again in a few minutes, or contact {ownerContact} directly.",
  AGENT_OFFLINE: "I'm currently offline. Please try again later or contact {ownerContact}.",
  NO_API_KEY: "I'm not fully set up yet. My team has been notified and will get me running soon.",

  // Loop
  STUCK: "I seem to be having trouble with this. Let me connect you with someone who can help.",
  APPROVAL_EXPIRED: "I was waiting for authorization that didn't come through. Let me try to help you another way.",
};
```

### Message Delivery

```typescript
async function sendErrorMessageToUser(session, errorType, context) {
  const template = USER_ERROR_MESSAGES[errorType];
  if (!template) return;  // some errors don't need user messages

  const message = template.replace("{ownerContact}", context.ownerContactInfo || "our team");

  // Try to send via channel
  try {
    await sendViaChannel(session.channel, session.externalContactIdentifier, message);
  } catch {
    // If even the error message can't be sent, add to dead letter queue
    await addToDeadLetterQueue({
      sessionId: session._id,
      message,
      errorType,
      originalError: context.error,
    });
  }

  // Always save to session history
  await saveMessage(session._id, "assistant", message, { isErrorMessage: true });
}
```

---

## Dead Letter Queue

Messages that cannot be delivered after all retries go into a dead letter queue for manual review or scheduled retry.

### Schema

```typescript
// objects table, type="dead_letter"
{
  type: "dead_letter",
  organizationId,
  customProperties: {
    sessionId: Id<"agentSessions">,
    channel: string,
    recipient: string,
    content: string,
    originalError: string,
    attempts: number,
    firstAttemptAt: number,
    lastAttemptAt: number,
    nextRetryAt: number | null,      // null = no more retries
    status: "pending" | "delivered" | "abandoned",
    maxRetries: 5,
    retryIntervalMs: 300000,         // 5 minutes between retries
  }
}
```

### Scheduled Retry

```typescript
// Cron job: every 5 minutes
async function retryDeadLetters(ctx) {
  const pendingLetters = await ctx.db.query("objects")
    .withIndex("by_type", q => q.eq("type", "dead_letter"))
    .filter(q =>
      q.and(
        q.eq(q.field("customProperties.status"), "pending"),
        q.lt(q.field("customProperties.nextRetryAt"), Date.now())
      )
    )
    .take(50);  // batch size

  for (const letter of pendingLetters) {
    try {
      await sendViaChannel(letter.customProperties.channel, ...);
      await updateLetterStatus(letter._id, "delivered");
    } catch {
      const attempts = letter.customProperties.attempts + 1;
      if (attempts >= letter.customProperties.maxRetries) {
        await updateLetterStatus(letter._id, "abandoned");
        await notifyOwner(letter.organizationId, "undeliverable_message", letter);
      } else {
        await updateLetterRetry(letter._id, attempts);
      }
    }
  }
}
```

---

## Owner Notifications

When errors require human attention, notify the org owner through platform alerts.

### Notification Triggers

| Trigger | Urgency | Channel |
|---------|---------|---------|
| All LLM models failed | HIGH | Telegram + email |
| Credits exhausted | HIGH | Telegram + email |
| Channel binding unhealthy | HIGH | Telegram |
| Tool category disabled for session | MEDIUM | Telegram |
| Dead letter abandoned | MEDIUM | Telegram |
| Agent stuck in loop | MEDIUM | Telegram |
| 10+ dead letters pending | LOW | Email digest |
| Soul evolution proposal rejected 3x | LOW | Email digest |

### Notification Dedup

```typescript
// Don't spam the owner with the same error
const NOTIFICATION_COOLDOWNS = {
  ALL_MODELS_FAILED: 30 * 60 * 1000,       // 30 min
  CREDITS_EXHAUSTED: 60 * 60 * 1000,       // 1 hour
  CHANNEL_UNHEALTHY: 60 * 60 * 1000,       // 1 hour
  TOOL_DISABLED: 24 * 60 * 60 * 1000,      // 24 hours
  DEAD_LETTER_ABANDONED: 60 * 60 * 1000,   // 1 hour
};

async function notifyOwnerIfNotRecent(orgId, errorType, details) {
  const recentAlert = await getRecentAlert(orgId, errorType);
  const cooldown = NOTIFICATION_COOLDOWNS[errorType];

  if (recentAlert && Date.now() - recentAlert.timestamp < cooldown) {
    return;  // skip, already notified recently
  }

  await createPlatformAlert(orgId, errorType, details);
}
```

---

## Pipeline Integration Points

### Modified Steps in agentExecution.ts

```
Step 8 (LLM Call):
  BEFORE: Single try/catch, error logged
  AFTER:  callLLMWithFailover() — 3 retries × N fallback models
          On total failure: sendErrorMessageToUser("ALL_MODELS_FAILED")
          + notifyOwner("ALL_MODELS_FAILED")

Step 9 (Tool Execution):
  BEFORE: Single try/catch, error in toolResults
  AFTER:  Track failedToolsThisSession
          On 3+ failures: disable tool, notify owner
          Error still passed to LLM for graceful response

Step 11 (Credit Deduction):
  BEFORE: try/catch, logged, ignored
  AFTER:  Retry once on race condition
          On persistent failure: flag for manual review
          + platform alert for billing team

Step 13 (Channel Send):
  BEFORE: Single try/catch, logged
  AFTER:  Retry with channel-specific policy
          On markdown parse error: strip to plain text, retry once
          On all retries failed: dead letter queue + scheduled retry
          On persistent failure: notify owner
```
