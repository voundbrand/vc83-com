# Phase 2.5 Step 8: Telegram Group Chat — Team Visibility

## Goal
The org owner has a **Telegram group** where they can watch their agent team work. The PM and specialists all post in the same group, attributed by name. The owner can jump in, give instructions, or just observe. This turns the invisible backend into a **visible, interactive control room**.

## Depends On
- Step 2 (Message Attribution) — messages display agent names
- Step 3 (Team Tools) — PM can tag in specialists
- Step 4 (PM Awareness) — harness includes team roster
- Step 6 (Team Session) — shared session with multiple agent participants
- Step 7 (Soul Evolution) — inline buttons pattern (reused for group actions)

## Why Groups (Not Just DMs)

DMs (Phase 2.5 base plan) give the owner a 1-on-1 with their PM agent. But they can't see:
- When the PM tags in a specialist
- What the specialist says
- How agents coordinate on a customer query
- The full conversation flow

A Telegram group makes the **multi-agent team model visible**. It's the difference between a black box and a glass box.

### The Mental Model

```
┌─────────────────────────────────────────┐
│  "Haff's Team"  (Telegram Group)        │
│                                         │
│  Owner (you)     — watching, directing  │
│  @l4yercak3_bot  — sends as all agents  │
│                                         │
│  Quinn (PM):     "Customer asked about  │
│                   group bookings..."     │
│                                         │
│  Haff (Sales):   "I can help! We offer  │
│                   group rates for 4+..." │
│                                         │
│  Owner:          "Actually we stopped   │
│                   the group discount"    │
│                                         │
│  Haff:           "Thanks! I'll update   │
│                   my pricing info."      │
│                   [propose_soul_update]  │
└─────────────────────────────────────────┘
```

The bot account sends all messages, but **prefixes each with the agent name** so it looks like multiple people in the chat. The owner is the only actual human participant.

## Architecture

```
Two Telegram Contexts per Org:
═══════════════════════════════════════════

1. OWNER DM (@l4yercak3_bot DM)
   - 1-on-1 with the PM agent
   - Onboarding (Step 5), management, soul review
   - Owner-to-agent private channel
   - Already working from Phase 2.5 base plan

2. TEAM GROUP (new Telegram group)
   - Owner + bot in a group
   - Customer conversations forwarded here
   - All agents post (attributed by name)
   - Owner can observe + intervene
   - Group-specific routing in the bridge

═══════════════════════════════════════════

Inbound Customer Message (via any channel)
    │
    ▼
processInboundMessage → PM agent responds
    │
    ├──► PM decides to tag specialist (Step 3)
    │
    ▼
generateAgentResponse → Specialist responds
    │
    ▼
Both responses sent to:
  1. Customer (via original channel)
  2. Team Group (mirrored, with agent attribution)
```

## Changes

### 1. convex/schema.ts — Extend telegramMappings

Add group chat tracking:

```typescript
// Add to telegramMappings table:
teamGroupChatId: v.optional(v.string()),  // Telegram group where agents collaborate
teamGroupEnabled: v.optional(v.boolean()),
```

### 2. NEW: convex/channels/telegramGroupSetup.ts

Handles the group setup flow — owner creates a Telegram group, adds the bot, and the system detects it.

```typescript
/**
 * TELEGRAM GROUP SETUP
 *
 * When the bot is added to a Telegram group:
 * 1. Detect the "bot added to group" event
 * 2. Check if the group creator matches a known owner (by chat_id)
 * 3. Link the group to their org
 * 4. Send a welcome message explaining the group's purpose
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../_generated/api").internal;
  return _apiCache;
}

/**
 * Handle "bot added to group" event from Telegram
 * Called from the bridge/webhook when update contains my_chat_member
 */
export const handleBotAddedToGroup = internalAction({
  args: {
    groupChatId: v.string(),
    groupTitle: v.string(),
    addedByUserId: v.string(),  // Telegram user ID of whoever added the bot
  },
  handler: async (ctx, args) => {
    // 1. Look up which org this Telegram user belongs to
    //    (they should already have a DM mapping from onboarding)
    const mapping = await ctx.runQuery(
      getInternal().onboarding.telegramResolver.getMappingByUserTelegramId,
      { telegramUserId: args.addedByUserId }
    );

    if (!mapping || mapping.status !== "active") {
      // Unknown user or not yet onboarded — send a message explaining
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.groupChatId,
            text: "Hi! I don't recognize your account yet. Please onboard first by DMing me directly, then add me to a group for your team view.",
          }),
        });
      }
      return { success: false, reason: "unknown_user" };
    }

    // 2. Link this group to their org
    await ctx.runMutation(
      getInternal().channels.telegramGroupSetup.linkGroupToOrg,
      {
        organizationId: mapping.organizationId,
        telegramChatId: mapping.telegramChatId,
        teamGroupChatId: args.groupChatId,
        groupTitle: args.groupTitle,
      }
    );

    // 3. Send welcome message
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      // Load agent team for the intro
      const agents = await ctx.runQuery(
        getInternal().agentOntology.getAllActiveAgentsForOrg,
        { organizationId: mapping.organizationId }
      );

      const agentNames = agents
        .map((a: any) => (a.customProperties as any)?.soul?.name || (a.customProperties as any)?.displayName || a.name)
        .join(", ");

      const welcomeText = [
        `*Team Group Connected*\n`,
        `This group is now linked to your organization. Your agent team will post here so you can see their conversations.\n`,
        `*Your team:* ${agentNames || "No agents yet"}\n`,
        `*What you'll see:*`,
        `- Customer conversations (forwarded)`,
        `- Agent-to-agent coordination`,
        `- Soul update proposals\n`,
        `*What you can do:*`,
        `- Jump in to correct agents in real-time`,
        `- Give instructions ("be more formal with this customer")`,
        `- React to messages (agents see your reactions)`,
        `\nType /mute to pause mirroring, /unmute to resume.`,
      ].join("\n");

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.groupChatId,
          text: welcomeText,
          parse_mode: "Markdown",
        }),
      });
    }

    return { success: true, organizationId: mapping.organizationId };
  },
});

/**
 * Link a Telegram group to an org's team view
 */
export const linkGroupToOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    telegramChatId: v.string(),      // Owner's DM chat ID
    teamGroupChatId: v.string(),      // Group chat ID
    groupTitle: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the owner's mapping and add group info
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();

    if (mapping) {
      await ctx.db.patch(mapping._id, {
        teamGroupChatId: args.teamGroupChatId,
        teamGroupEnabled: true,
      });
    }

    return { success: true };
  },
});

/**
 * Get group chat ID for an org (used by the mirror system)
 */
export const getTeamGroupForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (mapping?.teamGroupEnabled && mapping.teamGroupChatId) {
      return { groupChatId: mapping.teamGroupChatId };
    }
    return null;
  },
});
```

### 3. NEW: convex/channels/telegramGroupMirror.ts

Mirrors agent responses to the team group with attribution.

```typescript
/**
 * TELEGRAM GROUP MIRROR
 *
 * After an agent responds to a customer (on any channel),
 * mirror the exchange to the org's Telegram team group.
 *
 * Format:
 *   📩 [WhatsApp] Customer (John Doe):
 *   "Do you have group lessons?"
 *
 *   🤖 Quinn (PM):
 *   "Let me bring in Haff for this..."
 *
 *   🤖 Haff (Sales):
 *   "Absolutely! We offer group rates..."
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../_generated/api").internal;
  return _apiCache;
}

/**
 * Mirror a message exchange to the team group.
 * Called after agent responds in agentExecution.ts
 */
export const mirrorToTeamGroup = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    contactName: v.optional(v.string()),
    customerMessage: v.string(),
    agentName: v.string(),
    agentResponse: v.string(),
    agentSubtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Check if org has a team group
    const teamGroup = await ctx.runQuery(
      getInternal().channels.telegramGroupSetup.getTeamGroupForOrg,
      { organizationId: args.organizationId }
    );

    if (!teamGroup?.groupChatId) return { skipped: true, reason: "no_team_group" };

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { skipped: true, reason: "no_bot_token" };

    // 2. Format the mirror message
    const channelEmoji: Record<string, string> = {
      telegram: "Telegram",
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      webchat: "Web",
      instagram: "Instagram",
      facebook_messenger: "Messenger",
    };
    const channelLabel = channelEmoji[args.channel] || args.channel;
    const contactLabel = args.contactName || "Customer";
    const roleLabel = args.agentSubtype === "general" ? "PM" : (args.agentSubtype || "");

    const lines = [
      `[${channelLabel}] *${contactLabel}:*`,
      `"${args.customerMessage.slice(0, 500)}"`,
      ``,
      `*${args.agentName}*${roleLabel ? ` (${roleLabel})` : ``}:`,
      args.agentResponse.slice(0, 2000),
    ];

    // 3. Send to group
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: teamGroup.groupChatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
      }),
    });

    return { success: true };
  },
});

/**
 * Mirror a specialist tag-in to the group.
 * Shows the PM-to-specialist handoff.
 */
export const mirrorTagIn = internalAction({
  args: {
    organizationId: v.id("organizations"),
    pmName: v.string(),
    specialistName: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const teamGroup = await ctx.runQuery(
      getInternal().channels.telegramGroupSetup.getTeamGroupForOrg,
      { organizationId: args.organizationId }
    );

    if (!teamGroup?.groupChatId) return { skipped: true };

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { skipped: true };

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: teamGroup.groupChatId,
        text: `*${args.pmName}* tagged in *${args.specialistName}*: _${args.reason}_`,
        parse_mode: "Markdown",
      }),
    });

    return { success: true };
  },
});
```

### 4. convex/ai/agentExecution.ts — Hook mirror after agent response

After the agent responds and sends to the customer channel, schedule a mirror:

```typescript
// After saving assistant message and sending via channel router:

// Mirror to team group (non-blocking)
await ctx.scheduler.runAfter(0,
  getInternal().channels.telegramGroupMirror.mirrorToTeamGroup,
  {
    organizationId: args.organizationId,
    channel: args.channel,
    contactName: args.metadata?.senderName,
    customerMessage: args.message,
    agentName: config.displayName || agent.name,
    agentResponse: assistantContent,
    agentSubtype: agent.subtype,
  }
);
```

### 5. convex/ai/tools/teamTools.ts — Mirror tag-in events

In `tag_in_specialist`, after scheduling the specialist response:

```typescript
// Mirror the handoff to the team group
await ctx.scheduler.runAfter(0,
  getInternal().channels.telegramGroupMirror.mirrorTagIn,
  {
    organizationId: ctx.organizationId,
    pmName: config.displayName || "PM",
    specialistName: specialistName,
    reason: args.reason,
  }
);
```

### 6. scripts/telegram-bridge.ts — Handle group events

Add handling for group-related updates:

```typescript
// In the poll loop:

for (const update of data.result || []) {
  // Handle bot added/removed from groups
  if (update.my_chat_member) {
    const member = update.my_chat_member;
    const chatType = member.chat?.type;
    const newStatus = member.new_chat_member?.status;

    if ((chatType === "group" || chatType === "supergroup")
        && (newStatus === "member" || newStatus === "administrator")) {
      // Bot was added to a group
      await convex.action(
        api.channels.telegramGroupSetup.handleBotAddedToGroup,
        {
          groupChatId: String(member.chat.id),
          groupTitle: member.chat.title || "Unknown Group",
          addedByUserId: String(member.from?.id || ""),
        }
      );
    }
    offset = update.update_id + 1;
    continue;
  }

  // Handle messages from groups (owner instructions)
  if (update.message?.chat?.type === "group" || update.message?.chat?.type === "supergroup") {
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = msg.text || "";

    // Slash commands in group
    if (text === "/mute") {
      // Disable mirroring for this group
      await convex.mutation(api.channels.telegramGroupSetup.toggleMirror, {
        groupChatId: chatId,
        enabled: false,
      });
      await sendMessage(chatId, "Mirroring paused. Use /unmute to resume.");
      offset = update.update_id + 1;
      continue;
    }
    if (text === "/unmute") {
      await convex.mutation(api.channels.telegramGroupSetup.toggleMirror, {
        groupChatId: chatId,
        enabled: true,
      });
      await sendMessage(chatId, "Mirroring resumed.");
      offset = update.update_id + 1;
      continue;
    }

    // Owner messages in group → treated as instructions to the PM
    if (text && !text.startsWith("/")) {
      // Resolve group → org
      const orgMapping = await convex.query(
        api.channels.telegramGroupSetup.getOrgForGroup,
        { groupChatId: chatId }
      );

      if (orgMapping?.organizationId) {
        const result = await convex.action(
          api.ai.agentExecution.processInboundMessage,
          {
            organizationId: orgMapping.organizationId,
            channel: "telegram",
            externalContactIdentifier: chatId,
            message: text,
            metadata: {
              providerId: "telegram",
              source: "telegram-group",
              senderName: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" "),
              isOwnerInstruction: true,
              skipOutbound: true,
            },
          }
        );

        if (result.status === "success" && result.response) {
          const agentName = result.agentName || "Agent";
          await sendMessage(chatId, `*${agentName}:* ${result.response}`);
        }
      }
    }

    offset = update.update_id + 1;
    continue;
  }

  // ... existing DM handling
}
```

## Setup Guide for the Org Owner

The owner does this once (can be done during onboarding or later):

### Step 1: Create the Group
1. Open Telegram
2. Tap "New Group"
3. Name it (e.g., "My Business — Agent Team")
4. Add `@l4yercak3_bot` to the group

### Step 2: Automatic Detection
The bot detects it was added and:
- Matches the owner's Telegram ID to their org
- Links the group as the team view
- Posts a welcome message with agent roster

### Step 3: That's It
Customer conversations now mirror to the group. The owner can:
- Watch agents work
- Jump in with corrections
- React to messages
- Give instructions directly in the group

### Future: Guided Setup via DM
The PM agent can prompt this:
```
Quinn: Want to set up a team group so you can watch me work?
  1. Create a new Telegram group
  2. Add me (@l4yercak3_bot) to it
  3. I'll detect it automatically and link it to your account!
```

## Verification
1. `npx convex typecheck` — passes
2. Create a Telegram group, add the bot
3. Bot sends welcome message with team roster
4. Send a customer message via CLI → verify it mirrors to group
5. PM tags in specialist → handoff mirrored to group
6. Type a message in the group → PM agent responds (treats as owner instruction)
7. `/mute` → mirroring stops; `/unmute` → resumes

## Complexity: Medium
- 2 new files (`telegramGroupSetup.ts`, `telegramGroupMirror.ts`)
- 3 modified files (`agentExecution.ts`, `teamTools.ts`, `telegram-bridge.ts`)
- 1 schema modification (add group fields to `telegramMappings`)

## Privacy Considerations
- Only the org owner's group receives mirrors — not the customer's messages to other businesses
- Customer names are shown (already visible in CRM) but no phone numbers or contact details
- The owner can /mute at any time
- Group messages from the owner are treated as agent instructions, not forwarded to customers
- Agents never post customer PII beyond name in the group

## The "Aha" Moment

```
[Telegram Group: "Haff's Team"]

  📩 [WhatsApp] Anna Mueller:
  "Hi, I'm interested in booking a sailing course
   for my family — 2 adults, 2 kids (ages 8 and 11).
   Do you have availability next weekend?"

  🤖 Quinn (PM):
  "Family booking request — this is Haff's territory."
  *tagged in Haff (Sales)*

  🤖 Haff (Sales):
  "Great question! We have family packages starting
   Saturday at 10am. For a family of 4, the rate is
   €180 for a half-day session. Want me to hold a
   spot?"

  [Owner types in group]:
  "Actually we raised family rates to €220 last week"

  🤖 Haff:
  "Thanks for the update! I'll correct my pricing.
   [propose_soul_update: MODIFY faqEntries →
    update family package price to €220]"

  ┌──────────────────────────────────────────┐
  │ *Haff* wants to update its personality:  │
  │                                          │
  │ *MODIFY* FAQ: Family package pricing     │
  │ From: €180 → To: €220                   │
  │                                          │
  │ [Approve] [Reject]                       │
  └──────────────────────────────────────────┘
```

The owner sees everything, corrects in real-time, and the agent learns — all in one Telegram group.
