# Phase 2.5 Step 5: Onboarding Completion Flow

## Goal
When Quinn finishes the onboarding interview, the system automatically creates the customer's org, bootstraps their first agent, switches Telegram routing, and the new agent introduces itself — all seamless in the same chat.

## Depends On
- Step 2 (Message Attribution) — new agent's intro message needs attribution
- Step 3 (Team Tools) — `generateAgentResponse` for the intro message
- Working interview system (already complete)
- Working credit system (already complete)
- Working telegramResolver with `activateMapping` (already complete)

## The Flow

```
Quinn asks question 5/5
    ↓
User answers
    ↓
Quinn responds: "Perfect! Creating your agent now..."
    ↓
advanceInterview returns advanceType: "interview_complete"
    ↓
completeOnboarding scheduled (runs async after Quinn's response sends)
    ↓
1. Read extractedData: { businessName, industry, audience, tone, useCase }
2. Create org (name = businessName)
3. Seed daily credits
4. bootstrapAgent(orgId, hints from extractedData)
5. activateMapping(chatId, newOrgId) — Telegram routing switches
6. New agent sends intro: "*Maya:* Hey! I'm Maya — your sailing school's AI..."
7. Store intro in session with agent attribution
    ↓
User's next message → goes to new org's agent (Maya)
```

## Changes

### 1. NEW: convex/onboarding/completeOnboarding.ts

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

// Dynamic import to avoid deep type instantiation
const { internal: internalApi } = require("../_generated/api");

export const run = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    telegramChatId: v.string(),
    channel: v.string(),
    organizationId: v.id("organizations"),  // Platform org (System Bot's org)
  },
  handler: async (ctx, args) => {
    // 1. Get extractedData from the completed interview session
    const session = await ctx.runQuery(
      internalApi.ai.agentSessions.getSessionInternal,
      { sessionId: args.sessionId }
    );
    const extractedData = session?.interviewState?.extractedData || {};

    // 2. Create new organization
    //    Need to create a minimal org for Telegram-only users
    //    (no web account yet — they can link later)
    const orgId = await ctx.runMutation(
      internalApi.onboarding.orgBootstrap.createMinimalOrg,
      {
        name: extractedData.businessName || "My Business",
        industry: extractedData.industry,
        source: "telegram_onboarding",
        telegramChatId: args.telegramChatId,
      }
    );

    // 3. Seed credits
    await ctx.runMutation(
      internalApi.credits.index.grantDailyCreditsInternalMutation,
      { organizationId: orgId }
    );

    // 4. Bootstrap agent with soul from interview data
    const agentResult = await ctx.runAction(
      internalApi.ai.soulGenerator.bootstrapAgent,  // Note: public action
      {
        organizationId: orgId,
        name: "Agent",  // Soul generator will give it a real name
        subtype: "general",
        industry: extractedData.industry,
        targetAudience: extractedData.targetAudience,
        tonePreference: extractedData.tonePreference,
        additionalContext: extractedData.primaryUseCase,
      }
    );

    // 5. Switch Telegram routing
    await ctx.runMutation(
      internalApi.onboarding.telegramResolver.activateMapping,
      {
        telegramChatId: args.telegramChatId,
        organizationId: orgId,
      }
    );

    // 6. New agent introduces itself
    const newAgent = await ctx.runQuery(
      internalApi.agentOntology.getAgentInternal,
      { agentId: agentResult.agentId }
    );
    const soul = (newAgent?.customProperties as any)?.soul;
    const agentName = soul?.name || "Your Agent";

    const introMessage = soul?.greetingStyle
      ? `${soul.greetingStyle}`
      : `Hi! I'm ${agentName}. I'm here to help with ${extractedData.businessName || "your business"}. Try asking me something a customer would ask!`;

    // Send intro via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && args.channel === "telegram") {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.telegramChatId,
          text: `*${agentName}:* ${introMessage}`,
          parse_mode: "Markdown",
        }),
      });
    }

    // 7. Create session for new agent + store intro message
    const newSession = await ctx.runMutation(
      internalApi.ai.agentSessions.resolveSession,
      {
        agentId: agentResult.agentId,
        organizationId: orgId,
        channel: args.channel,
        externalContactIdentifier: args.telegramChatId,
      }
    );

    await ctx.runMutation(
      internalApi.ai.agentSessions.addSessionMessage,
      {
        sessionId: newSession._id,
        role: "assistant",
        content: introMessage,
        agentId: agentResult.agentId,
        agentName: agentName,
      }
    );

    return {
      success: true,
      organizationId: orgId,
      agentId: agentResult.agentId,
      agentName,
    };
  },
});
```

### 2. NEW: convex/onboarding/orgBootstrap.ts

Minimal org creation for Telegram-only users:

```typescript
export const createMinimalOrg = internalMutation({
  args: {
    name: v.string(),
    industry: v.optional(v.string()),
    source: v.string(),
    telegramChatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create org without a user account
    // Telegram users can link their web account later
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      planTier: "free",
      isActive: true,
      createdAt: Date.now(),
      metadata: {
        source: args.source,
        industry: args.industry,
        telegramChatId: args.telegramChatId,
      },
    });
    return orgId;
  },
});
```

**Note:** Check the actual `organizations` schema for required fields and adapt accordingly.

### 3. convex/ai/agentExecution.ts (~line 325)

After interview extraction, detect completion and trigger onboarding:

```typescript
// After existing extraction processing:
if (interviewContext && assistantContent) {
  const extractionResults = parseExtractionResults(assistantContent);
  if (extractionResults.length > 0) {
    const advResult = await ctx.runMutation(
      getInternal().ai.interviewRunner.advanceInterview, {
        sessionId: session._id,
        extractionResults,
      }
    );

    // NEW: If interview complete, trigger onboarding
    if (advResult?.advanceType === "interview_complete") {
      // Complete the interview (creates Content DNA)
      await ctx.runMutation(
        getInternal().ai.interviewRunner.completeInterview, {
          sessionId: session._id,
        }
      );

      // Schedule async onboarding (runs after Quinn's response is sent)
      await ctx.scheduler.runAfter(0,
        getInternal().onboarding.completeOnboarding.run, {
          sessionId: session._id,
          telegramChatId: args.externalContactIdentifier,
          channel: args.channel,
          organizationId: args.organizationId,
        }
      );
    }
  }
}
```

### 4. convex/ai/interviewRunner.ts

Ensure `advanceInterview` returns `advanceType` and `extractedData` when complete. Check current return value and add if missing.

### 5. Quinn's Soul Update

Quinn needs to know that after the 5th answer, the system will create the agent. Her soul should include:
```json
{
  "alwaysDo": [
    "After the user answers the 5th question, tell them their agent is being created and they'll hear from it in a moment",
    "Never ask more than one question at a time",
    "Always acknowledge the user's answer before the next question"
  ]
}
```

This can be done via `updateAgentSoulInternal` or by re-bootstrapping Quinn.

## Verification
1. `npx convex typecheck` — passes
2. Message System Bot via Telegram → complete 5-question interview
3. Verify in Convex dashboard:
   - New organization created
   - New agent bootstrapped with soul
   - `telegramMappings` row switched to new org
   - Credit balance exists for new org
4. Verify in Telegram: new agent introduces itself with `*AgentName:* intro`
5. Send another message → goes to new agent, not Quinn

## Complexity: High
2 new files, 2-3 modified files. The `completeOnboarding` action is the centerpiece — orchestrates 7 steps.

## Edge Cases
- **Interview abandoned mid-way**: No action taken. User can resume later (session persists).
- **Soul generation fails**: `bootstrapAgent` handles this — continues without soul.
- **Telegram API failure**: Intro message not sent, but org + agent are created. User's next message still routes correctly.
- **Credit seeding fails**: Logged but doesn't block onboarding.
