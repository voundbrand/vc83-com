# Session Lifecycle

> Session TTL, auto-close, idle detection, reset policies, session summary, and reopen behavior.

---

## Current State (Problems)

- **No TTL.** Sessions persist forever once created. A user who messaged 6 months ago gets the same session with stale context.
- **No auto-close.** Only manual closure via `closeSession()` or `handed_off` status.
- **No idle detection.** `lastMessageAt` is tracked but never checked.
- **Stats accumulate unbounded.** `messageCount` and `costUsd` grow forever per session.
- **Stale context is actively harmful.** The 20-message history window may contain irrelevant months-old messages.

---

## Session States (Enhanced)

```
                    ┌─────────┐
                    │  create  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
              ┌────▶│  active   │◀────────────────────┐
              │     └──┬──┬──┬─┘                      │
              │        │  │  │                         │
              │   idle │  │  │ handoff          resume │
              │   TTL  │  │  │                         │
              │        │  │  │                         │
              │   ┌────▼┐ │ ┌▼──────────┐    ┌────────┴──┐
              │   │closed│ │ │ handed_off │───▶│  resumed   │
              │   └──┬───┘ │ └───────────┘    └────────────┘
              │      │     │
              │      │     │ max duration
              │      │     │
              │      │  ┌──▼──────┐
              │      │  │ expired  │
              │      │  └─────────┘
              │      │
              │ new message from same contact
              │ (creates new session)
              └──────┘
```

### State Definitions

| State | Meaning | Trigger |
|-------|---------|---------|
| `active` | Session is live, messages flow normally | Session created or resumed |
| `closed` | Session ended due to idle TTL | Scheduled cleanup job |
| `expired` | Session ended due to max duration | Scheduled cleanup job |
| `handed_off` | Human has taken over the conversation | Agent or team harness escalation |
| `resumed` | Previously closed session reactivated | New message after closure + `onReopen: "resume"` |

---

## Session Policy Configuration

Per-agent session policy with per-channel overrides.

```typescript
// On agent config (objects.customProperties where type="org_agent")
sessionPolicy: {
  // Default TTL — session closes after this idle period
  defaultTTL: "24h",

  // Maximum session duration regardless of activity
  maxDuration: "7d",

  // Per-channel overrides
  perChannel: {
    telegram:  { ttl: "24h", maxDuration: "7d" },
    whatsapp:  { ttl: "4h",  maxDuration: "3d" },
    sms:       { ttl: "1h",  maxDuration: "1d" },
    email:     { ttl: "72h", maxDuration: "14d" },
    webchat:   { ttl: "30m", maxDuration: "2h" },
    instagram: { ttl: "24h", maxDuration: "7d" },
    facebook_messenger: { ttl: "24h", maxDuration: "7d" },
  },

  // What happens when a session closes
  onClose: "summarize_and_archive",   // "archive" | "summarize_and_archive"

  // What happens when user returns after session closure
  onReopen: "new_session",            // "new_session" | "resume"

  // Per-session credit budget
  maxCreditsPerSession: 50,
}
```

### Default Session Policy

```typescript
const DEFAULT_SESSION_POLICY = {
  defaultTTL: "24h",
  maxDuration: "7d",
  perChannel: {},                     // use defaults for all channels
  onClose: "archive",
  onReopen: "new_session",
  maxCreditsPerSession: 50,
};
```

### Duration Parsing

```typescript
function parseDuration(duration: string): number {
  const units: Record<string, number> = {
    "m": 60 * 1000,
    "h": 60 * 60 * 1000,
    "d": 24 * 60 * 60 * 1000,
  };
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return parseInt(match[1]) * units[match[2]];
}
```

---

## Session Resolution (Enhanced)

```typescript
async function resolveSession(ctx, agentId, orgId, channel, identifier) {
  const existing = await ctx.db.query("agentSessions")
    .withIndex("by_org_channel_contact", q =>
      q.eq("organizationId", orgId)
       .eq("channel", channel)
       .eq("externalContactIdentifier", identifier)
    )
    .filter(q => q.eq(q.field("status"), "active"))
    .first();

  if (existing) {
    // Check if session has expired
    const policy = await getSessionPolicy(ctx, agentId, channel);
    const ttlMs = parseDuration(policy.ttl ?? policy.defaultTTL);
    const maxDurationMs = parseDuration(policy.maxDuration);
    const now = Date.now();

    const isIdle = (now - existing.lastMessageAt) > ttlMs;
    const isExpired = (now - existing.startedAt) > maxDurationMs;

    if (isIdle || isExpired) {
      // Close the stale session
      await closeSession(ctx, existing._id, isExpired ? "expired" : "idle_timeout");

      // Handle reopen policy
      if (policy.onReopen === "resume") {
        return await createResumedSession(ctx, existing, agentId, orgId, channel, identifier);
      }

      // Create fresh session
      return await createNewSession(ctx, agentId, orgId, channel, identifier);
    }

    // Session is still valid — reuse
    return existing;
  }

  // No existing session — create new
  return await createNewSession(ctx, agentId, orgId, channel, identifier);
}
```

---

## Session Close & Summary

When a session closes (idle TTL or max duration), optionally generate a summary for future context.

### Close Flow

```typescript
async function closeSession(ctx, sessionId, reason) {
  const session = await ctx.db.get(sessionId);
  const policy = await getSessionPolicy(ctx, session.agentId, session.channel);

  // 1. Generate summary if configured
  let summary = null;
  if (policy.onClose === "summarize_and_archive" && session.messageCount > 2) {
    summary = await generateSessionSummary(ctx, session);
  }

  // 2. Update session status
  await ctx.db.patch(sessionId, {
    status: reason === "expired" ? "expired" : "closed",
    closedAt: Date.now(),
    closeReason: reason,
    summary,
  });
}
```

### Session Summary Generation

```typescript
async function generateSessionSummary(ctx, session) {
  // Load last 20 messages from session
  const messages = await getSessionMessages(ctx, session._id, 20);

  // Use a cheap, fast model for summarization
  const summary = await callLLM({
    model: "anthropic/claude-haiku",
    messages: [{
      role: "system",
      content: "Summarize this conversation in 2-3 sentences. Focus on: what the customer wanted, what was done, any unresolved issues."
    }, {
      role: "user",
      content: messages.map(m => `${m.role}: ${m.content}`).join("\n")
    }],
    maxTokens: 200,
  });

  return {
    text: summary,
    generatedAt: Date.now(),
    messageCount: session.messageCount,
    topics: extractTopics(messages),  // simple keyword extraction
  };
}
```

### Resumed Session

When `onReopen: "resume"` and user returns after session closure:

```typescript
async function createResumedSession(ctx, previousSession, agentId, orgId, channel, identifier) {
  const newSession = await ctx.db.insert("agentSessions", {
    agentId,
    organizationId: orgId,
    channel,
    externalContactIdentifier: identifier,
    status: "active",
    sessionMode: "freeform",
    messageCount: 0,
    tokensUsed: 0,
    costUsd: 0,
    startedAt: Date.now(),
    lastMessageAt: Date.now(),
    previousSessionId: previousSession._id,
    previousSessionSummary: previousSession.summary?.text,
  });

  return newSession;
}
```

The `previousSessionSummary` is injected into the system prompt so the agent can reference past context naturally:

```
You're continuing a conversation with this customer.
Previous session summary: "{previousSessionSummary}"
Greet them naturally and reference the previous context if relevant.
```

---

## Scheduled Cleanup Job

A cron job that runs every 15 minutes to close stale sessions.

```typescript
// convex/crons.ts
crons.interval("expire-stale-sessions", { minutes: 15 }, internal.ai.agentSessions.expireStaleSessions);

// convex/ai/agentSessions.ts
export const expireStaleSessions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all active sessions
    const activeSessions = await ctx.db.query("agentSessions")
      .filter(q => q.eq(q.field("status"), "active"))
      .take(200);  // batch size

    let closedCount = 0;

    for (const session of activeSessions) {
      const policy = await getSessionPolicy(ctx, session.agentId, session.channel);
      const ttlMs = parseDuration(policy.ttl ?? policy.defaultTTL);
      const maxDurationMs = parseDuration(policy.maxDuration);

      const isIdle = (now - session.lastMessageAt) > ttlMs;
      const isExpired = (now - session.startedAt) > maxDurationMs;

      if (isIdle || isExpired) {
        await closeSession(ctx, session._id, isExpired ? "expired" : "idle_timeout");
        closedCount++;
      }
    }

    if (closedCount > 0) {
      console.log(`[SessionCleanup] Closed ${closedCount} stale sessions`);
    }
  },
});
```

---

## Session Metrics & Monitoring

### Per-Session Stats (Existing + New)

```typescript
// Existing
messageCount: number,
tokensUsed: number,
costUsd: number,
startedAt: number,
lastMessageAt: number,

// New
closedAt?: number,
closeReason?: "idle_timeout" | "expired" | "manual" | "handed_off",
summary?: {
  text: string,
  generatedAt: number,
  messageCount: number,
  topics: string[],
},
previousSessionId?: Id<"agentSessions">,
previousSessionSummary?: string,
sessionBudgetUsed?: number,        // credits consumed in this session
```

### Aggregate Metrics (for dashboard)

```
Active Sessions:     12
Avg Session Duration: 8.5 minutes
Avg Messages/Session: 6.2
Sessions Closed (today):
  ├── Idle timeout:  45
  ├── Max duration:  3
  ├── Manual:        2
  └── Handoff:       5
Session Reopen Rate: 15% (users returning after closure)
```

---

## Design Decisions

### Why not OpenClaw's daily reset at fixed hour?

OpenClaw resets sessions at 4 AM because it's a personal assistant — you wake up, fresh session. l4yercak3 agents serve customers across time zones. A fixed-hour reset would be confusing ("Why did my agent forget our conversation mid-day?"). Idle TTL + max duration is more intuitive for B2B.

### Why summarize on close?

20-message history windows lose context fast. A 2-3 sentence summary captures the essence of a conversation cheaply (Haiku call, ~$0.001) and gives the agent natural continuity when the customer returns.

### Why per-channel TTL?

Different channels have different conversation rhythms:
- **Webchat:** ephemeral, 30 min max
- **Email:** slow, 72h between messages is normal
- **Telegram:** conversational, 24h idle is reasonable
- **SMS:** terse, 1h conversations typical
