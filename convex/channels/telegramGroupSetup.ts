/**
 * TELEGRAM GROUP SETUP
 *
 * When the bot is added to a Telegram group:
 * 1. Detect the "bot added to group" event
 * 2. Check if the group creator matches a known owner (by chat_id)
 * 3. Link the group to their org
 * 4. Send a welcome message explaining the group's purpose
 */

import { action, mutation, query, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api").internal;
  }
  return _apiCache;
}

/**
 * Handle "bot added to group" event from Telegram
 * Called from the bridge when update contains my_chat_member
 */
export const handleBotAddedToGroup = action({
  args: {
    groupChatId: v.string(),
    groupTitle: v.string(),
    addedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Look up which org this Telegram user belongs to
    const mapping = await ctx.runQuery(
      getInternal().channels.telegramGroupSetup.getMappingByUserTelegramId,
      { telegramUserId: args.addedByUserId }
    );

    if (!mapping) {
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
      }
    );

    // 3. Send welcome message
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const agents = await ctx.runQuery(
        getInternal().agentOntology.getAllActiveAgentsForOrg,
        { organizationId: mapping.organizationId }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentNames = (agents as any[])
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
 * Find a telegramMapping by the user's Telegram ID.
 * The telegramChatId in DMs is the user's Telegram ID.
 */
export const getMappingByUserTelegramId = internalQuery({
  args: {
    telegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramUserId))
      .first();
  },
});

/**
 * Link a Telegram group to an org's team view
 */
export const linkGroupToOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    telegramChatId: v.string(),
    teamGroupChatId: v.string(),
  },
  handler: async (ctx, args) => {
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

/**
 * Get org for a group chat ID (reverse lookup from group messages)
 */
export const getOrgForGroup = query({
  args: {
    groupChatId: v.string(),
  },
  handler: async (ctx, args) => {
    // Scan telegramMappings for matching group chat ID
    const mappings = await ctx.db.query("telegramMappings").collect();
    const match = mappings.find(m => m.teamGroupChatId === args.groupChatId && m.teamGroupEnabled);
    if (match) {
      return { organizationId: match.organizationId };
    }
    return null;
  },
});

/**
 * Toggle mirroring for a group (/mute and /unmute commands)
 */
export const toggleMirror = mutation({
  args: {
    groupChatId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const mappings = await ctx.db.query("telegramMappings").collect();
    const match = mappings.find(m => m.teamGroupChatId === args.groupChatId);
    if (match) {
      await ctx.db.patch(match._id, {
        teamGroupEnabled: args.enabled,
      });
    }
    return { success: true };
  },
});
