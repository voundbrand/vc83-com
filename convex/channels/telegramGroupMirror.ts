/**
 * TELEGRAM GROUP MIRROR
 *
 * After an agent responds to a customer (on any channel),
 * mirror the exchange to the org's Telegram team group.
 *
 * Format:
 *   [WhatsApp] *Customer Name:*
 *   "Do you have group lessons?"
 *
 *   *Quinn* (PM):
 *   "Let me bring in Haff for this..."
 */

import { internalAction } from "../_generated/server";
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
    const channelLabels: Record<string, string> = {
      telegram: "Telegram",
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      webchat: "Web",
      instagram: "Instagram",
      facebook_messenger: "Messenger",
    };
    const channelLabel = channelLabels[args.channel] || args.channel;
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
