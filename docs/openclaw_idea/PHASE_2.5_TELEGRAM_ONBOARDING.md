# Phase 2.5: Telegram System Bot — Org Owner Onboarding & Agent Management

> Business owner messages a Telegram bot. Gets an AI agent. Manages it right there. Zero web UI.

## The Play

Right now onboarding requires: sign up on web → create org → configure agent → connect channels → start messaging. That's 5 steps before any value.

**New approach:** The platform runs a **Telegram bot** as the System Bot. Business owners message it to:
1. **Onboard** — create their org, get interviewed, get a custom agent
2. **Manage** — talk to their agent, adjust its personality, upload knowledge, check stats
3. **Test** — roleplay as a customer to see how the agent responds

Customer-facing channels (WhatsApp, email, webchat for end customers) are a separate concern and **not part of this MVP**. This is purely org owner ↔ platform.

### Why Telegram (not WhatsApp)

| | Telegram | WhatsApp |
|---|---|---|
| **Setup** | 30 seconds via @BotFather | Meta Business verification (days/weeks) |
| **API** | Official, free, stable | Baileys (unofficial, ToS risk) or Cloud API (complex) |
| **Cost** | Free forever | Cloud API: per-conversation pricing |
| **Rich UI** | Inline keyboards, buttons, menus | Plain text only |
| **Bot identity** | Dedicated @username | Shares a phone number |
| **Production-ready** | Day one | Needs Meta approval |

### Architecture

```
@YourPlatformBot on Telegram
         │
         ▼
┌─────────────────────────────────────────────────┐
│              Telegram Webhook                     │
│  POST /api/webhooks/telegram                     │
│                                                   │
│  1. Extract chat_id + message                    │
│  2. Resolve chat_id → org (or System Bot)        │
│  3. processInboundMessage(orgId, message)        │
│  4. Send response via Telegram sendMessage API   │
└─────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
 Known     Unknown
 chat_id   chat_id
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────────────────┐
│ Route  │ │ System Bot (platform org)     │
│ to     │ │                                │
│ org's  │ │ Onboarding interview:          │
│ agent  │ │ → Create org + seed credits   │
│        │ │ → Ask about business           │
│        │ │ → Generate soul                │
│        │ │ → Bootstrap agent              │
│        │ │ → Hand off to new agent        │
└────────┘ └──────────────────────────────┘
```

After onboarding, the same Telegram chat routes to the org owner's custom agent. The owner can talk to their agent, test it, refine it — all in Telegram.

---

## What Already Exists

| Component | Status | Location |
|---|---|---|
| Agent execution pipeline | Working | `convex/ai/agentExecution.ts` |
| Soul generator (from business context) | Working | `convex/ai/soulGenerator.ts` |
| Bootstrap agent action | Working | `soulGenerator.ts:bootstrapAgent` |
| Interview runner (guided mode) | Working | `convex/ai/interviewRunner.ts` |
| Interview templates (ontology) | Working | `convex/interviewTemplateOntology.ts` |
| Agent harness (self-awareness) | Working | `convex/ai/harness.ts` |
| Credit system | Working | `convex/credits/` |
| Channel router | Working | `convex/channels/router.ts` |
| Webhook handler pattern | Working | `convex/channels/webhooks.ts` |
| CLI `--fresh` flag | Working | `scripts/agent-cli.ts` |

---

## What to Build

### 1. Telegram Bot Setup

Create a bot via @BotFather (takes 30 seconds):
```
/newbot → "L4YERCAK3 Agent Platform" → @l4yercak3_bot
```

Store the token in `.env.local`:
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

### 2. Telegram Bridge Script

A local bridge (like the WhatsApp one) for dev, or a Convex HTTP webhook for production. Both use the same Telegram Bot API.

```typescript
// scripts/telegram-bridge.ts
// Dev mode: long-polling (no webhook needed)
//
// Usage:
//   npx tsx scripts/telegram-bridge.ts
//   npx tsx scripts/telegram-bridge.ts --fresh

import { ConvexHttpClient } from "convex/browser";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Long-polling loop
async function poll(offset: number = 0) {
  const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`);
  const data = await res.json();

  for (const update of data.result || []) {
    const msg = update.message;
    if (!msg?.text) continue;

    const chatId = String(msg.chat.id);
    const senderName = [msg.from?.first_name, msg.from?.last_name]
      .filter(Boolean).join(" ");

    // Resolve chat_id → org
    const resolution = await convex.action(
      api.onboarding.telegramResolver.resolveChatToOrg,
      { telegramChatId: chatId, senderName }
    );

    // Route through pipeline
    const result = await convex.action(
      api.ai.agentExecution.processInboundMessage,
      {
        organizationId: resolution.organizationId,
        channel: "telegram",
        externalContactIdentifier: chatId,
        message: msg.text,
        metadata: {
          providerId: "telegram_bot",
          source: "telegram-bridge",
          senderName,
          isSystemBotRoute: resolution.routeToSystemBot,
          skipOutbound: true, // We send reply ourselves
        },
      }
    );

    // Send reply
    if (result.status === "success" && result.response) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: result.response,
          parse_mode: "Markdown",
        }),
      });
    }

    offset = update.update_id + 1;
  }

  // Continue polling
  poll(offset);
}

poll();
```

#### Production: Convex HTTP Webhook

```typescript
// convex/channels/telegramWebhook.ts
// Register webhook: POST https://api.telegram.org/bot<token>/setWebhook?url=<convex-url>/api/webhooks/telegram

import { httpAction } from "../_generated/server";

export const telegramWebhook = httpAction(async (ctx, request) => {
  const payload = await request.json();
  const msg = payload.message;
  if (!msg?.text) return new Response("OK");

  const chatId = String(msg.chat.id);
  const senderName = [msg.from?.first_name, msg.from?.last_name]
    .filter(Boolean).join(" ");

  // Resolve + route + respond (same as bridge)
  const resolution = await ctx.runAction(
    internal.onboarding.telegramResolver.resolveChatToOrg,
    { telegramChatId: chatId, senderName }
  );

  const result = await ctx.runAction(
    internal.ai.agentExecution.processInboundMessage,
    {
      organizationId: resolution.organizationId,
      channel: "telegram",
      externalContactIdentifier: chatId,
      message: msg.text,
      metadata: {
        providerId: "telegram_webhook",
        source: "telegram-webhook",
        senderName,
        isSystemBotRoute: resolution.routeToSystemBot,
        skipOutbound: true,
      },
    }
  );

  // Send reply via Telegram API
  if (result.status === "success" && result.response) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: result.response,
        parse_mode: "Markdown",
      }),
    });
  }

  return new Response("OK");
});
```

### 3. Chat-to-Org Resolver

Same concept as the phone resolver, but keyed on Telegram `chat_id` instead of phone number.

```typescript
// convex/onboarding/telegramResolver.ts

interface TelegramMapping {
  telegramChatId: string;             // Telegram chat ID (stable per user)
  organizationId: Id<"organizations">;
  status: "onboarding" | "active" | "churned";
  senderName?: string;
  createdAt: number;
}

/**
 * Resolve a Telegram chat_id to an org.
 *
 * Known chat_id + active → route to their org's agent
 * Known chat_id + onboarding → route to System Bot (resume interview)
 * Unknown chat_id → route to System Bot for onboarding
 */
export const resolveChatToOrg = action({
  args: {
    telegramChatId: v.string(),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(
      getInternal().onboarding.telegramResolver.getMappingByChatId,
      { telegramChatId: args.telegramChatId }
    );

    if (existing?.status === "active") {
      return {
        organizationId: existing.organizationId,
        isNew: false,
        routeToSystemBot: false,
      };
    }

    if (existing?.status === "onboarding") {
      return {
        organizationId: PLATFORM_ORG_ID,
        isNew: false,
        routeToSystemBot: true,
      };
    }

    // New user — create mapping in "onboarding" state, route to System Bot
    await ctx.runMutation(
      getInternal().onboarding.telegramResolver.createMapping,
      {
        telegramChatId: args.telegramChatId,
        senderName: args.senderName,
      }
    );

    return {
      organizationId: PLATFORM_ORG_ID,
      isNew: true,
      routeToSystemBot: true,
    };
  },
});

// Internal queries/mutations
export const getMappingByChatId = internalQuery({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();
  },
});

export const createMapping = internalMutation({
  args: {
    telegramChatId: v.string(),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("telegramMappings", {
      telegramChatId: args.telegramChatId,
      organizationId: PLATFORM_ORG_ID, // Temporary — updated on onboarding completion
      status: "onboarding",
      senderName: args.senderName,
      createdAt: Date.now(),
    });
  },
});
```

**Schema addition:**
```typescript
// In convex/schema.ts
telegramMappings: defineTable({
  telegramChatId: v.string(),
  organizationId: v.id("organizations"),
  status: v.union(
    v.literal("onboarding"),
    v.literal("active"),
    v.literal("churned"),
  ),
  senderName: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_chat_id", ["telegramChatId"])
  .index("by_org", ["organizationId"]),
```

---

### 4. System Bot Agent (Platform Org)

The System Bot is a regular agent owned by the platform org. Its soul is an onboarding concierge.

```typescript
const SYSTEM_BOT_SOUL = {
  name: "Setup Assistant",
  tagline: "I help you create your AI agent in under 3 minutes",
  traits: ["friendly", "efficient", "curious", "encouraging"],
  communicationStyle: "Warm and conversational. Asks one question at a time. Celebrates progress.",
  toneGuidelines: "Keep it light and fast. This should feel like chatting with a helpful friend, not filling out a form.",
  neverDo: [
    "Never ask more than one question at a time",
    "Never use jargon or technical terms",
    "Never skip ahead or assume answers",
    "Never make the user feel like they're being interrogated",
    "Never discuss pricing or plans during onboarding",
  ],
  alwaysDo: [
    "Always acknowledge the user's answer before the next question",
    "Always explain briefly why you're asking",
    "Always give examples to make questions clearer",
    "Always tell the user how many questions are left",
    "Always end the interview with enthusiasm about the agent being created",
  ],
  greetingStyle: "Hey! I'm going to help you set up your own AI agent. It takes about 2 minutes — just answer a few questions about your business and I'll build you something great.",
  emojiUsage: "minimal",
};
```

Bootstrap it once:
```bash
npx tsx scripts/agent-cli.ts --org <PLATFORM_ORG_ID> --fresh
# → Creates System Bot agent with onboarding soul
```

---

### 5. Onboarding Interview Template

Reuses the existing interview runner. 5 questions, ~2 minutes.

```typescript
const ONBOARDING_TEMPLATE = {
  type: "interview_template",
  name: "Telegram Business Onboarding",
  subtype: "onboarding",
  phases: [
    {
      id: "identity",
      name: "Business Identity",
      questions: [
        {
          id: "business_name",
          text: "What's the name of your business?",
          field: "businessName",
          type: "text",
          required: true,
        },
        {
          id: "industry",
          text: "What industry are you in?",
          field: "industry",
          type: "text",
          required: true,
          examples: "real estate, fitness, SaaS, hospitality, education",
        },
      ],
    },
    {
      id: "audience",
      name: "Audience & Tone",
      questions: [
        {
          id: "target_audience",
          text: "Who are your typical customers?",
          field: "targetAudience",
          type: "text",
          required: true,
        },
        {
          id: "tone",
          text: "How should your agent sound?",
          field: "tonePreference",
          type: "text",
          required: true,
          examples: "warm and casual, professional and formal, witty and playful",
        },
      ],
    },
    {
      id: "purpose",
      name: "Purpose",
      questions: [
        {
          id: "primary_use",
          text: "What's the main thing you want your agent to help with?",
          field: "primaryUseCase",
          type: "text",
          required: true,
          examples: "answer customer questions, book appointments, qualify leads, explain pricing",
        },
      ],
    },
  ],
  completionAction: "generate_soul_and_activate",
};
```

---

### 6. Post-Onboarding Flow

When the interview completes:

```
Interview complete (all fields extracted)
  │
  ├─► 1. Create org (from businessName)
  ├─► 2. Seed 50 starter credits
  ├─► 3. Generate soul (industry, audience, tone → soulGenerator)
  ├─► 4. Bootstrap agent with soul on the new org
  ├─► 5. Update telegramMapping: status → "active", org → new org
  ├─► 6. Next message from this chat_id routes to the new agent
  ├─► 7. Agent sends intro: "I'm Maya — your sailing school's AI.
  │      Try asking me something a customer would ask!"
  └─► 8. Owner can now talk to, test, and refine their agent
```

```typescript
// convex/onboarding/completeOnboarding.ts

export const completeOnboarding = internalAction({
  args: {
    telegramChatId: v.string(),
    extractedData: v.object({
      businessName: v.string(),
      industry: v.string(),
      targetAudience: v.string(),
      tonePreference: v.string(),
      primaryUseCase: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // 1. Create org
    const orgId = await ctx.runMutation(
      getInternal().onboarding.orgBootstrap.createOrg,
      { name: args.extractedData.businessName }
    );

    // 2. Seed credits
    await ctx.runMutation(
      getInternal().onboarding.orgBootstrap.seedCredits,
      { organizationId: orgId, amount: 50 }
    );

    // 3. Bootstrap agent with soul generation
    const result = await ctx.runAction(
      getInternal().ai.soulGenerator.bootstrapAgent,
      {
        organizationId: orgId,
        name: "Agent", // Soul generator will give it a real name
        subtype: "general",
        industry: args.extractedData.industry,
        targetAudience: args.extractedData.targetAudience,
        tonePreference: args.extractedData.tonePreference,
        additionalContext: args.extractedData.primaryUseCase,
      }
    );

    // 4. Update telegram mapping → route future messages to new org
    await ctx.runMutation(
      getInternal().onboarding.telegramResolver.activateMapping,
      {
        telegramChatId: args.telegramChatId,
        organizationId: orgId,
      }
    );

    return {
      status: "success",
      organizationId: orgId,
      agentId: result.agentId,
      soul: result.soul,
    };
  },
});
```

---

### 7. Owner Agent Interaction (Post-Onboarding)

Once onboarded, the Telegram chat becomes the owner's direct line to their agent. They can:

- **Talk to their agent** — test it as if they were a customer
- **Give instructions** — "Be more formal" / "Never mention competitor X" / "Add this FAQ"
- **Upload knowledge** — send documents, price lists (future: Telegram file attachments)
- **Check stats** — "How many conversations today?" (via agent tools)

This all works automatically because the chat routes to the org's agent, which has access to the full tool registry. No special code needed — the existing pipeline handles it.

#### Slash Commands (Telegram-native, future enhancement)

```
/status   — agent stats, credit balance
/soul     — view/edit agent personality
/fresh    — regenerate agent from scratch
/help     — what can I do here
```

These would be thin wrappers around existing functionality. Not needed for MVP — the agent can respond to natural language equivalents.

---

## Implementation Order

### Step 1: Telegram Bot + Bridge Script (~1 session)
- Create bot via @BotFather, get token
- Add `TELEGRAM_BOT_TOKEN` to `.env.local`
- Create `scripts/telegram-bridge.ts` — long-polling bridge
- Test: send message → agent responds (hardcoded org for now)
- This is the "hello world" — prove the Telegram ↔ pipeline connection works

### Step 2: Platform Org + System Bot (~0.5 session)
- Create (or designate) platform org in Convex
- Bootstrap System Bot agent with onboarding soul
- Add `PLATFORM_ORG_ID` to env config
- Test: `npx tsx scripts/telegram-bridge.ts` → System Bot responds

### Step 3: Schema + Chat Resolver (~1 session)
- Add `telegramMappings` table to schema
- Create `convex/onboarding/telegramResolver.ts`
- Wire resolver into telegram bridge (before `processInboundMessage`)
- Test: unknown chat_id → System Bot responds; known chat_id → org agent responds

### Step 4: Onboarding Interview + Completion (~1.5 sessions)
- Seed onboarding interview template
- Wire System Bot to use guided interview mode for new users
- Create `convex/onboarding/orgBootstrap.ts` — create org + seed credits
- Create `convex/onboarding/completeOnboarding.ts` — soul gen + mapping switch
- Test full flow: message bot → interview → org created → agent ready → routing switches

### Step 5: Production Webhook (optional, ~0.5 session)
- Add `convex/channels/telegramWebhook.ts` HTTP action
- Register webhook with Telegram API
- Same logic as bridge, just runs on Convex instead of locally

---

## Files to Create

| File | Purpose |
|---|---|
| `scripts/telegram-bridge.ts` | Local dev bridge (long-polling) |
| `convex/onboarding/telegramResolver.ts` | chat_id → org mapping + resolution |
| `convex/onboarding/orgBootstrap.ts` | Create org + user + seed credits |
| `convex/onboarding/completeOnboarding.ts` | Post-interview: create org, gen soul, switch routing |
| `convex/channels/telegramWebhook.ts` | Production webhook handler (Step 5) |

## Files to Modify

| File | Change |
|---|---|
| `convex/schema.ts` | Add `telegramMappings` table |
| `.env.local` | Add `TELEGRAM_BOT_TOKEN`, `PLATFORM_ORG_ID` |

## No Changes Needed

| File | Why |
|---|---|
| `convex/ai/agentExecution.ts` | Pipeline unchanged — receives orgId as before |
| `convex/ai/soulGenerator.ts` | `bootstrapAgent` already does everything needed |
| `convex/ai/harness.ts` | Works with any agent on any channel |
| `convex/ai/interviewRunner.ts` | Interview templates are data, not code |
| `convex/credits/` | Existing mutations work |
| `convex/agentOntology.ts` | Existing create/activate mutations work |

---

## The "Aha" Moment

```
[You open Telegram and message @l4yercak3_bot]

You: Hey

Setup Assistant: Hey! I'm going to help you set up your own AI
  agent. It takes about 2 minutes — just answer a few questions
  about your business and I'll build you something great.

  What's the name of your business?

You: Segelschule am Stettiner Haff

Setup Assistant: Nice! A sailing school — love it.
  What industry would you say that falls under?
  (e.g., education, tourism, sports, recreation)

You: Maritime education and recreation

Setup Assistant: Got it. Who are your typical customers?

You: Beginners and families looking for boat licenses

Setup Assistant: And how should your agent sound when talking
  to them? (e.g., warm and casual, professional, witty)

You: Warm and approachable — we're a family business

Setup Assistant: Last one — what's the main thing you want
  your agent to help with?

You: Answer questions about courses, pricing, and help
     people book sailing lessons

Setup Assistant: Perfect! Creating your agent now...

  [~10s]

Setup Assistant: Done! Say hello to your new agent:

---

Haff: Moin! I'm Haff — your friendly guide for
  Segelschule am Stettiner Haff. I'm here to help your
  customers find the right course and get them on the water.

  Try me out — ask me something a customer would ask!

You: What sailing courses do you offer?

Haff: Great question! At Segelschule am Stettiner Haff,
  we offer courses for all levels...

You: Be a bit more casual in your responses

Haff: Gotcha! I'll keep things relaxed and friendly.
  Want me to try that last answer again in a more
  laid-back style?
```

Total time: **~3 minutes**. No website. No login. No forms. Just Telegram.

---

## Estimated Effort

| Step | Effort | Dependencies |
|---|---|---|
| Telegram bot + bridge script | 1 session | None |
| Platform org + System Bot | 0.5 session | Step 1 |
| Schema + chat resolver | 1 session | Step 2 |
| Onboarding interview + completion | 1.5 sessions | Steps 1-3 |
| **Total MVP** | **~4 sessions** | |
| Production webhook (optional) | 0.5 session | Steps 1-4 |

---

## Risk & Mitigations

| Risk | Mitigation |
|---|---|
| Abuse: spam org creation | Rate limit: max 3 new orgs per chat_id. Telegram accounts require phone verification. |
| Credit drain during onboarding | Onboarding uses ~5 credits; seed 50 |
| User abandons mid-onboarding | Resume from last question on next message (session persists) |
| Soul generation fails | Fallback: activate with generic soul, owner can refine via chat |
| Telegram API rate limits | 30 msgs/sec global, 1 msg/sec per chat — well within bounds |
| Bot discoverability | Share bot link directly; add to website; QR code |

---

## Relationship to Other Phases

- **Phase 1 (Agent-Per-Org):** Complete. Provides agent config, pipeline, sessions.
- **Phase 2 (Channel Connectors):** Telegram becomes the first real channel connector beyond the CLI.
- **Phase 2.5 (This):** Org owner onboarding + management via Telegram. Fully scoped to owner ↔ platform.
- **Phase 3 (Content Generation):** Once onboarded, agent can start generating content for the business.
- **Future:** Customer-facing channels (WhatsApp, email, webchat) added separately. The owner's Telegram stays as their management channel.

This is the **growth lever** — every business owner who messages the Telegram bot becomes a customer in 3 minutes.
