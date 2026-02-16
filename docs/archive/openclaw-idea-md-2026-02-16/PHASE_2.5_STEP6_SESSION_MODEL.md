# Phase 2.5 Step 6: Team Session Model

## Goal
Sessions become shared across agents within an org — the PM and specialists all participate in the same session. This completes the team chat model.

## Depends On
- Step 2 (Message Attribution) — messages track which agent wrote them
- Step 3 (Team Tools) — specialists can be tagged in

## Current State
Sessions are locked to a single `agentId`. When the PM tags in a specialist, the specialist needs to write to the same session. Currently this works because `generateAgentResponse` (from Step 3) takes a `sessionId` directly. But the session model should formally support multiple participants.

## Changes

### 1. convex/schemas/agentSessionSchemas.ts

Add team participation tracking:
```typescript
// Rename conceptually: agentId is now the "primary" agent (PM)
// Add:
participatingAgentIds: v.optional(v.array(v.id("objects"))),
```

The existing `agentId` field stays — it represents the PM/primary agent. `participatingAgentIds` tracks all agents that have contributed messages.

### 2. convex/ai/agentSessions.ts

**Update `addSessionMessage`** — when a specialist agent writes a message, add them to `participatingAgentIds`:
```typescript
// After inserting the message:
if (args.agentId && args.role === "assistant") {
  const session = await ctx.db.get(args.sessionId);
  if (session) {
    const participants = session.participatingAgentIds || [];
    if (!participants.includes(args.agentId)) {
      await ctx.db.patch(args.sessionId, {
        participatingAgentIds: [...participants, args.agentId],
      });
    }
  }
}
```

**Update `resolveSession`** — when finding existing sessions, match by org+channel+contact (already the case). No changes needed here since the PM agent is always the primary.

### 3. convex/ai/agentExecution.ts — getSessionMessages context

When loading conversation history for the specialist, include agent attribution in the context so the LLM knows who said what:
```typescript
// When building message array for LLM:
const formattedMessages = sessionMessages.map(msg => {
  if (msg.role === "assistant" && msg.agentName) {
    return {
      role: "assistant",
      content: `[${msg.agentName}]: ${msg.content}`,
    };
  }
  return { role: msg.role, content: msg.content };
});
```

This way, when a specialist reads the conversation history, they see:
```
user: I want to book a sailing lesson
[Quinn]: Let me bring in our booking specialist...
[Haff]: I'd love to help you book a lesson! What dates work for you?
```

## Verification
1. `npx convex typecheck` — passes
2. PM tags in specialist → verify `participatingAgentIds` updated on session
3. Specialist sees full conversation history with agent attribution in context
4. Multiple specialists can participate in same session

## Complexity: Low
2-3 files modified. Mostly additive — existing sessions continue to work without `participatingAgentIds`.

## Note
This phase is optional for MVP. Steps 2-5 already create a working team chat. This step formalizes the session model for future features like:
- "Show me all agents that participated in this conversation"
- Agent-specific analytics per session
- Session replay with agent attribution
