# Phase 2.5 Step 2: Agent Message Attribution

## Goal
Every message in a conversation tracks which agent wrote it, so the team chat model works — users see different agent names in the same conversation.

## Why This Comes First
All subsequent phases depend on messages being attributable to specific agents. Without this, agents are anonymous and the team chat UX doesn't work.

## Changes

### 1. convex/schemas/agentSessionSchemas.ts
Add agent identity fields to `agentSessionMessages`:
```typescript
agentId: v.optional(v.id("objects")),      // Which agent wrote this
agentName: v.optional(v.string()),          // Display name (denormalized)
```

### 2. convex/ai/agentSessions.ts
Update `addSessionMessage` to accept and store `agentId` + `agentName`:
```typescript
export const addSessionMessage = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    agentId: v.optional(v.id("objects")),     // NEW
    agentName: v.optional(v.string()),         // NEW
    toolCalls: v.optional(v.any()),
  },
  // ...
});
```

### 3. convex/ai/agentExecution.ts (~line 317)
Pass agent identity when saving assistant messages:
```typescript
await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
  sessionId: session._id,
  role: "assistant",
  content: assistantContent,
  agentId: agent._id,                                    // NEW
  agentName: config.displayName || agent.name,            // NEW
  toolCalls: toolResults.length > 0 ? toolResults : undefined,
});
```

Also update the return value to include `agentName`:
```typescript
return {
  status: "success",
  response: assistantContent,
  agentName: config.displayName || agent.name,  // NEW
  toolResults,
  sessionId: session._id,
};
```

### 4. scripts/telegram-bridge.ts
Prefix responses with agent name for Telegram display:
```typescript
const displayText = result.agentName
  ? `*${result.agentName}:* ${result.response}`
  : result.response;
await sendMessage(chatId, displayText);
```

## Verification
1. `npx convex typecheck` — passes
2. Send message via CLI → verify result includes `agentName`
3. Check Convex dashboard: `agentSessionMessages` rows have `agentId` + `agentName`
4. Run Telegram bridge → verify messages display as `**Quinn:** response text`

## Complexity: Low
4 files modified, no new files. Additive changes only — existing messages without agentId still work (fields are optional).
