/**
 * TELEGRAM INTEGRATION — Public Backend API
 *
 * Bridges existing internal Telegram functions to the frontend.
 * Called by the Telegram settings panel in the integrations window.
 *
 * Endpoints:
 * - getTelegramIntegrationStatus (query) — Status of platform bot, custom bot, team group
 * - deployCustomBot (action) — Deploy a per-org branded bot via @BotFather token
 * - disconnectCustomBot (mutation) — Remove custom bot settings and bindings
 * - toggleTeamGroupMirror (mutation) — Enable/disable team group message mirroring
 * - generateTelegramLinkToken (mutation) — Generate a one-time deep link for connecting Telegram (Path B)
 */

import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Lazy API import to avoid circular dependency / deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../_generated/api").internal;
  }
  return _internalCache;
}

/**
 * Build plain Telegram-safe CTA copy without markdown links.
 * Telegram/webhook delivery paths can safely render this as plain text.
 */
export function buildTelegramPlainLinkText(label: string, url: string): string {
  const safeLabel = label.trim().replace(/\s+/g, " ");
  const safeUrl = url.trim();
  return `${safeLabel}\n${safeUrl}`;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get full Telegram integration status for the current org.
 * Returns platform bot, custom bot, team group, and active chat count.
 */
export const getTelegramIntegrationStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Session validation (same pattern as chatwoot.ts)
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return null;

    const orgId = user.defaultOrgId as Id<"organizations">;

    // 1. Platform bot info from telegramMappings
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .first();

    const platformBot = {
      connected: !!mapping,
      chatId: mapping?.telegramChatId ?? null,
      senderName: mapping?.senderName ?? null,
      connectedAt: mapping?.createdAt ?? null,
      status: mapping?.status ?? null,
    };

    // 2. Custom bot info from objects table
    const customBotSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "telegram_settings")
      )
      .first();

    const customProps = customBotSettings?.customProperties as Record<string, unknown> | undefined;
    const siteUrl = process.env.NEXT_PUBLIC_API_ENDPOINT_URL || "https://aromatic-akita-723.convex.site";

    const customBot = {
      deployed: !!customBotSettings,
      botUsername: (customProps?.telegramBotUsername as string) ?? null,
      webhookUrl: customBotSettings ? `${siteUrl}/telegram-webhook` : null,
    };

    // 3. Team group info
    const teamGroup = {
      linked: !!(mapping?.teamGroupChatId),
      groupChatId: mapping?.teamGroupChatId ?? null,
      mirrorEnabled: mapping?.teamGroupEnabled ?? false,
    };

    // 4. Active chat count — count active agent sessions on telegram channel
    const activeSessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", orgId).eq("status", "active")
      )
      .collect();

    const activeChatCount = activeSessions.filter(
      (s) => s.channel === "telegram"
    ).length;

    return {
      platformBot,
      customBot,
      teamGroup,
      activeChatCount,
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Deploy a custom branded Telegram bot for the org.
 * Wraps the internal deployBot action with session validation.
 */
export const deployCustomBot = action({
  args: {
    sessionId: v.string(),
    botToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session (same pattern as accountManagement.ts)
    const session = await ctx.runQuery(
      getInternal().auth.getSessionById,
      { sessionId: args.sessionId }
    );

    if (!session || !session.userId) {
      return { success: false, error: "Invalid session" };
    }

    // Get user to find org
    const user = await ctx.runQuery(
      getInternal().ai.tools.internalToolMutations.getUserById,
      { userId: session.userId }
    );

    if (!user?.defaultOrgId) {
      return { success: false, error: "No organization found" };
    }

    // Call internal deployBot
    const result = await ctx.runAction(
      getInternal().channels.telegramBotSetup.deployBot,
      {
        organizationId: user.defaultOrgId,
        botToken: args.botToken,
      }
    );

    return result;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Disconnect the custom bot — removes telegram_settings and channel_provider_binding.
 */
export const disconnectCustomBot = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return { success: false };

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return { success: false };

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Delete telegram_settings object
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "telegram_settings")
      )
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete telegram channel_provider_binding objects
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      const props = binding.customProperties as Record<string, unknown>;
      if (props?.channel === "telegram") {
        await ctx.db.delete(binding._id);
      }
    }

    return { success: true };
  },
});

/**
 * Generate a one-time deep link token for connecting Telegram from the dashboard.
 * Session-based wrapper around the telegramLinking.generateLinkToken logic.
 * Returns a t.me link the user clicks to connect their Telegram to this org.
 */
export const generateTelegramLinkToken = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return { success: false as const, error: "Invalid session" };
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return { success: false as const, error: "No organization found" };
    }

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Verify user is a member of this org
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", orgId)
      )
      .first();
    if (!membership || !membership.isActive) {
      return { success: false as const, error: "Not a member of this organization" };
    }

    // Generate a secure random token
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store in objects table (type: telegram_link_token)
    await ctx.db.insert("objects", {
      organizationId: orgId,
      type: "telegram_link_token",
      name: `Link token for ${user.email}`,
      status: "active",
      customProperties: {
        token,
        organizationId: orgId,
        userId: user._id,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "l4yercak3_bot";

    return {
      success: true as const,
      token,
      telegramLink: `https://t.me/${botUsername}?start=link_${token}`,
      expiresInMinutes: 15,
    };
  },
});

/**
 * Toggle team group mirror on/off.
 */
export const toggleTeamGroupMirror = mutation({
  args: {
    sessionId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return { success: false };

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return { success: false };

    const orgId = user.defaultOrgId as Id<"organizations">;

    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .first();

    if (mapping) {
      await ctx.db.patch(mapping._id, {
        teamGroupEnabled: args.enabled,
      });
    }

    return { success: true };
  },
});
