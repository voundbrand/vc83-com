# Phase 2.5 Step 3: Tag-In Specialist Tool + Team Response Pipeline

## Goal
The PM agent can tag in specialist agents who respond under their own name in the same conversation. This is the core of the team chat model.

## Depends On
- Step 2 (Message Attribution) — messages must track which agent wrote them

## Architecture

```
User sends message
    ↓
PM agent receives it (via processInboundMessage)
    ↓
PM decides to tag in specialist
    ↓
PM responds: "Let me bring in Maya for this..."
    ↓
PM's tool call triggers generateAgentResponse
    ↓
Specialist (Maya) runs her own LLM call with shared session context
    ↓
Maya's response saved with her agentId/agentName
    ↓
Maya's response sent to user: "*Maya:* Here's what I can help with..."
    ↓
Next inbound message goes back to PM
```

## Changes

### 1. NEW: convex/ai/tools/teamTools.ts

Two tools for agent coordination:

**`tag_in_specialist`** — PM delegates to a specialist:
```typescript
const tagInSpecialistTool: AITool = {
  name: "tag_in_specialist",
  description: "Tag in a specialist agent from your team to respond to this conversation. The specialist will respond under their own name. Use when the user's request matches another agent's expertise.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      specialistType: {
        type: "string",
        enum: ["sales_assistant", "customer_support", "booking_agent"],
        description: "The type of specialist to tag in",
      },
      reason: {
        type: "string",
        description: "Brief context for why you're tagging them in",
      },
      contextNote: {
        type: "string",
        description: "Key context the specialist needs to know",
      },
    },
    required: ["specialistType", "reason"],
  },
  execute: async (ctx, args) => {
    // 1. Find specialist by subtype
    const specialist = await ctx.runQuery(
      getInternal().agentOntology.getActiveAgentForOrg, {
        organizationId: ctx.organizationId,
        subtype: args.specialistType,
      }
    );

    if (!specialist) {
      return { error: `No active ${args.specialistType} agent found` };
    }

    // 2. Schedule specialist response (async — runs after PM's message is sent)
    await ctx.scheduler.runAfter(0,
      getInternal().ai.agentExecution.generateAgentResponse, {
        agentId: specialist._id,
        organizationId: ctx.organizationId,
        sessionId: ctx.sessionId,
        channel: ctx.channel,
        externalContactIdentifier: ctx.contactId,
        context: args.contextNote || args.reason,
      }
    );

    const specialistName = (specialist.customProperties as any)?.displayName || specialist.name;
    return {
      success: true,
      tagged: specialistName,
      subtype: args.specialistType,
      message: `${specialistName} will respond shortly.`,
    };
  },
};
```

**`list_team_agents`** — PM discovers available specialists:
```typescript
const listTeamAgentsTool: AITool = {
  name: "list_team_agents",
  description: "List all active specialist agents on your team.",
  status: "ready",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async (ctx) => {
    const agents = await ctx.runQuery(
      getInternal().agentOntology.getAllActiveAgentsForOrg, {
        organizationId: ctx.organizationId,
      }
    );
    return agents.map(a => ({
      name: (a.customProperties as any)?.displayName || a.name,
      subtype: a.subtype,
      tagline: (a.customProperties as any)?.soul?.tagline,
      traits: (a.customProperties as any)?.soul?.traits,
    }));
  },
};
```

### 2. NEW: convex/ai/agentExecution.ts — `generateAgentResponse` internalAction

A slimmed-down version of `processInboundMessage` that generates a specialist response without a new inbound message:

```typescript
export const generateAgentResponse = internalAction({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Load specialist agent config + soul
    const agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
      agentId: args.agentId,
    });
    const config = agent.customProperties;

    // 2. Get shared session history
    const messages = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionMessages, {
        sessionId: args.sessionId,
      }
    );

    // 3. Build specialist's system prompt (its own soul + harness + knowledge)
    const systemPrompt = buildAgentSystemPrompt(config, ...);

    // 4. Add context note if provided
    // Inject as a system message: "[PM] Tagged you in because: {context}"

    // 5. Call LLM with specialist's prompt + shared conversation history
    const response = await openrouter.chatCompletion({...});

    // 6. Save response with agent attribution
    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content: response.content,
      agentId: args.agentId,
      agentName: config.displayName || agent.name,
    });

    // 7. Send via channel provider
    const displayContent = `*${config.displayName || agent.name}:* ${response.content}`;
    await ctx.runAction(getInternal().channels.router.sendMessage, {
      organizationId: args.organizationId,
      channel: args.channel,
      recipientIdentifier: args.externalContactIdentifier,
      content: displayContent,
    });

    // 8. Deduct credits + audit log
  },
});
```

### 3. convex/agentOntology.ts
Add `getAllActiveAgentsForOrg` internalQuery:
```typescript
export const getAllActiveAgentsForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();
    return agents.filter(a => a.status === "active");
  },
});
```

Also add `subtype` param to `getActiveAgentForOrg`:
```typescript
// After existing channel binding check, before fallback:
if (args.subtype) {
  const subtypeAgent = activeAgents.find(a => a.subtype === args.subtype);
  if (subtypeAgent) return subtypeAgent;
}
```

### 4. convex/ai/tools/registry.ts
Register both new tools:
```typescript
import { tagInSpecialistTool, listTeamAgentsTool } from "./teamTools";

// In TOOL_REGISTRY:
tag_in_specialist: tagInSpecialistTool,
list_team_agents: listTeamAgentsTool,
```

### 5. ToolExecutionContext enhancement
The current `ToolExecutionContext` has `organizationId` and `userId` but not `sessionId`, `channel`, or `contactId`. These are needed for `tag_in_specialist`.

In `agentExecution.ts`, extend the tool context:
```typescript
const toolCtx: ToolExecutionContext = {
  ...ctx,
  organizationId: args.organizationId,
  userId: agent.createdBy as Id<"users">,
  sessionId: session._id,                        // NEW
  channel: args.channel,                          // NEW
  contactId: args.externalContactIdentifier,      // NEW
};
```

Update `ToolExecutionContext` in registry.ts to include these optional fields.

## Verification
1. `npx convex typecheck` — passes
2. Create org with 2 agents (general + sales_assistant)
3. Send "I want to buy something" via CLI → PM should tag in sales agent
4. Verify 2 responses: PM's acknowledgment + sales agent's detailed response
5. Check DB: both messages have different `agentId` values

## Complexity: Medium
2 new files, 3 modified files. The `generateAgentResponse` action is the heaviest lift — it reuses most of the existing pipeline logic.
