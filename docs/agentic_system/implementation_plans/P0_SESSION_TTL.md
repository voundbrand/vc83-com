# P0: Session TTL Implementation Plan

> Priority: CRITICAL | Estimated complexity: Medium | Files touched: 3-4

---

## Problem Statement

Sessions never expire. A user who messaged 6 months ago returns to the same session with stale 20-message history. `lastMessageAt` is tracked but never checked. Stats accumulate unbounded. No scheduled cleanup.

---

## Deliverables

1. **Session policy config** on agent config (TTL, max duration, per-channel overrides)
2. **Enhanced session resolution** — check expiry before reusing
3. **Scheduled cleanup cron** — close stale sessions every 15 minutes
4. **Session summary on close** — optional LLM-generated summary for future context
5. **Reopen behavior** — new session with previous context injection
6. **New session fields** — `closedAt`, `closeReason`, `summary`, `previousSessionId`

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/ai/agentSessions.ts` | Enhanced `resolveSession`, new `closeSession`, `expireStaleSessions` |
| `convex/ai/agentExecution.ts` | Pass session policy to resolution, inject `previousSessionSummary` into prompt |
| `convex/schemas/agentSessionSchemas.ts` | Add new fields: `closedAt`, `closeReason`, `summary`, `previousSessionId`, `sessionPolicy` |
| `convex/crons.ts` | Add `expire-stale-sessions` cron (every 15 minutes) |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/sessionPolicy.ts` | Session policy types, defaults, duration parsing, TTL resolution |

---

## Implementation Steps

### Step 1: Define session policy types (`convex/ai/sessionPolicy.ts`)

```typescript
export interface SessionPolicy {
  defaultTTL: string;                // "24h", "4h", "30m"
  maxDuration: string;               // "7d", "3d", "2h"
  perChannel?: Record<string, {
    ttl?: string;
    maxDuration?: string;
  }>;
  onClose: "archive" | "summarize_and_archive";
  onReopen: "new_session" | "resume";
  maxCreditsPerSession?: number;
}

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  defaultTTL: "24h",
  maxDuration: "7d",
  perChannel: {
    webchat: { ttl: "30m", maxDuration: "2h" },
    sms: { ttl: "1h", maxDuration: "1d" },
    email: { ttl: "72h", maxDuration: "14d" },
  },
  onClose: "archive",
  onReopen: "new_session",
  maxCreditsPerSession: 50,
};

export function parseDuration(duration: string): number {
  const units: Record<string, number> = {
    "m": 60 * 1000,
    "h": 60 * 60 * 1000,
    "d": 24 * 60 * 60 * 1000,
  };
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return parseInt(match[1]) * units[match[2]];
}

export function resolveSessionTTL(policy: SessionPolicy, channel: string): { ttl: number; maxDuration: number } {
  const channelOverride = policy.perChannel?.[channel];
  return {
    ttl: parseDuration(channelOverride?.ttl ?? policy.defaultTTL),
    maxDuration: parseDuration(channelOverride?.maxDuration ?? policy.maxDuration),
  };
}
```

### Step 2: Update session schema (`convex/schemas/agentSessionSchemas.ts`)

Add new fields:

```typescript
// New fields on agentSessions
closedAt: v.optional(v.number()),
closeReason: v.optional(v.union(
  v.literal("idle_timeout"),
  v.literal("expired"),
  v.literal("manual"),
  v.literal("handed_off"),
)),
summary: v.optional(v.object({
  text: v.string(),
  generatedAt: v.number(),
  messageCount: v.number(),
  topics: v.optional(v.array(v.string())),
})),
previousSessionId: v.optional(v.id("agentSessions")),
previousSessionSummary: v.optional(v.string()),
sessionBudgetUsed: v.optional(v.number()),
```

### Step 3: Enhanced `resolveSession` (`convex/ai/agentSessions.ts`)

```typescript
export async function resolveSession(ctx, agentId, orgId, channel, identifier) {
  const existing = await ctx.db.query("agentSessions")
    .withIndex("by_org_channel_contact", q =>
      q.eq("organizationId", orgId)
       .eq("channel", channel)
       .eq("externalContactIdentifier", identifier)
    )
    .filter(q => q.eq(q.field("status"), "active"))
    .first();

  if (existing) {
    const agentConfig = await getAgentConfig(ctx, agentId);
    const policy = agentConfig.sessionPolicy ?? DEFAULT_SESSION_POLICY;
    const { ttl, maxDuration } = resolveSessionTTL(policy, channel);
    const now = Date.now();

    const isIdle = (now - existing.lastMessageAt) > ttl;
    const isMaxDuration = (now - existing.startedAt) > maxDuration;

    if (isIdle || isMaxDuration) {
      // Close stale session
      await closeSession(ctx, existing._id, isMaxDuration ? "expired" : "idle_timeout", policy);

      // Create new session (with or without previous context)
      if (policy.onReopen === "resume" && existing.summary) {
        return await createSession(ctx, agentId, orgId, channel, identifier, {
          previousSessionId: existing._id,
          previousSessionSummary: existing.summary.text,
        });
      }
      return await createSession(ctx, agentId, orgId, channel, identifier);
    }

    return existing;
  }

  return await createSession(ctx, agentId, orgId, channel, identifier);
}
```

### Step 4: `closeSession` mutation

```typescript
async function closeSession(ctx, sessionId, reason, policy) {
  const session = await ctx.db.get(sessionId);

  let summary = undefined;
  if (policy.onClose === "summarize_and_archive" && session.messageCount > 2) {
    // Schedule async summary generation (don't block the pipeline)
    await ctx.scheduler.runAfter(0, internal.ai.agentSessions.generateSessionSummary, {
      sessionId,
    });
  }

  await ctx.db.patch(sessionId, {
    status: "closed",
    closedAt: Date.now(),
    closeReason: reason,
  });
}
```

### Step 5: Session summary generation (async action)

```typescript
export const generateSessionSummary = internalAction({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, { sessionId }) => {
    const messages = await ctx.runQuery(internal.ai.agentSessions.getSessionMessages, {
      sessionId, limit: 20,
    });

    if (messages.length < 3) return;  // not enough to summarize

    const transcript = messages.map(m => `${m.role}: ${m.content}`).join("\n");

    // Use cheap model for summarization
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku",
        messages: [
          { role: "system", content: "Summarize this conversation in 2-3 sentences. Focus on: what the customer wanted, what was done, any unresolved issues. Be concise." },
          { role: "user", content: transcript },
        ],
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const summaryText = data.choices?.[0]?.message?.content;

    if (summaryText) {
      await ctx.runMutation(internal.ai.agentSessions.updateSessionSummary, {
        sessionId,
        summary: {
          text: summaryText,
          generatedAt: Date.now(),
          messageCount: messages.length,
        },
      });
    }
  },
});
```

### Step 6: Scheduled cleanup cron

```typescript
// convex/crons.ts
crons.interval("expire-stale-sessions", { minutes: 15 }, internal.ai.agentSessions.expireStaleSessions);

// convex/ai/agentSessions.ts
export const expireStaleSessions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const activeSessions = await ctx.db.query("agentSessions")
      .filter(q => q.eq(q.field("status"), "active"))
      .take(200);

    let closedCount = 0;

    for (const session of activeSessions) {
      const agent = await ctx.db.get(session.agentId);
      if (!agent) continue;

      const policy = agent.customProperties?.sessionPolicy ?? DEFAULT_SESSION_POLICY;
      const { ttl, maxDuration } = resolveSessionTTL(policy, session.channel);

      const isIdle = (now - session.lastMessageAt) > ttl;
      const isMaxDuration = (now - session.startedAt) > maxDuration;

      if (isIdle || isMaxDuration) {
        await closeSession(ctx, session._id, isMaxDuration ? "expired" : "idle_timeout", policy);
        closedCount++;
      }
    }

    if (closedCount > 0) {
      console.log(`[SessionCleanup] Closed ${closedCount} stale sessions`);
    }
  },
});
```

### Step 7: Inject previous context in system prompt

In `agentExecution.ts`, when building the system prompt (step 5):

```typescript
if (session.previousSessionSummary) {
  systemPrompt += `\n\n--- PREVIOUS CONVERSATION ---\nYou previously spoke with this customer. Summary: "${session.previousSessionSummary}"\nGreet them naturally and reference the previous context if relevant.\n--- END PREVIOUS CONVERSATION ---`;
}
```

---

## Migration

### Existing Active Sessions

Existing sessions without `startedAt` or `lastMessageAt` should be treated as stale:

```typescript
// Migration: set startedAt for sessions that don't have it
// Run once via admin script
const sessions = await ctx.db.query("agentSessions").collect();
for (const s of sessions) {
  if (!s.startedAt) {
    await ctx.db.patch(s._id, { startedAt: s.lastMessageAt || Date.now() });
  }
}
```

### Default Policy

All existing agents get `DEFAULT_SESSION_POLICY` (24h TTL, 7d max). No behavior change for active conversations — only affects sessions that have been idle >24h.

---

## Testing Strategy

1. **Unit test**: `parseDuration` handles all formats correctly
2. **Unit test**: `resolveSessionTTL` applies channel overrides
3. **Integration test**: session expires after TTL, new session created
4. **Integration test**: session expires, summary generated, injected into new session
5. **Integration test**: cron closes batch of stale sessions
6. **Edge case**: session with `onReopen: "resume"` preserves context

---

## Success Criteria

- [ ] Sessions auto-close after configured idle TTL
- [ ] Sessions auto-close after max duration
- [ ] Per-channel TTL overrides work correctly
- [ ] Closed sessions optionally get LLM-generated summary
- [ ] New sessions include previous session summary when `onReopen: "resume"`
- [ ] Cron runs every 15 minutes, closes stale sessions in batches
- [ ] Existing sessions are migrated gracefully
