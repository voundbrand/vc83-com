/**
 * CHATWOOT INTEGRATION
 *
 * Self-hosted Chatwoot unified inbox integration.
 * One Chatwoot instance serves the entire platform (multi-tenant via accounts).
 * Each org gets a Chatwoot account with per-channel inboxes.
 *
 * Configuration stored in objects table as type="chatwoot_settings".
 * Channel bindings stored as type="channel_provider_binding".
 *
 * Chatwoot API Reference: https://www.chatwoot.com/developers/api/
 */

import {
  action,
  mutation,
  query,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// Channels that Chatwoot can handle
const CHATWOOT_CHANNELS = [
  "whatsapp",
  "email",
  "webchat",
  "instagram",
  "facebook_messenger",
  "sms",
  "telegram",
] as const;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get Chatwoot settings for the current org (public query for UI).
 */
export const getChatwootSettings = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) return null;

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", user.defaultOrgId as Id<"organizations">)
          .eq("type", "chatwoot_settings")
      )
      .first();

    if (!settings) {
      return { configured: false, enabled: false };
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      configured: true,
      enabled: props.enabled as boolean,
      chatwootUrl: props.chatwootUrl as string,
      accountId: props.chatwootAccountId as number,
      accountName: props.accountName as string | undefined,
      configuredChannels: (props.configuredChannels as string[]) || [],
      webhookUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/webhooks/chatwoot`
          : "/webhooks/chatwoot",
    };
  },
});

/**
 * Internal query for settings with credentials (used by router/webhooks).
 */
export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "chatwoot_settings")
      )
      .first();

    if (!settings) return null;
    return settings.customProperties as Record<string, unknown>;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Save Chatwoot connection settings and create channel bindings.
 */
export const saveChatwootSettings = mutation({
  args: {
    sessionId: v.string(),
    chatwootUrl: v.string(),
    chatwootApiToken: v.string(),
    chatwootAccountId: v.number(),
    webhookSecret: v.optional(v.string()),
    enabled: v.boolean(),
    configuredChannels: v.array(v.string()),
    accountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Verify permission
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const settingsData = {
      chatwootUrl: args.chatwootUrl.replace(/\/+$/, ""), // Strip trailing slash
      chatwootApiToken: args.chatwootApiToken,
      chatwootAccountId: args.chatwootAccountId,
      webhookSecret: args.webhookSecret || "",
      enabled: args.enabled,
      configuredChannels: args.configuredChannels,
      accountName: args.accountName || "",
    };

    // Upsert chatwoot_settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "chatwoot_settings")
      )
      .first();

    let settingsId: Id<"objects">;

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: settingsData,
        updatedAt: Date.now(),
      });
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("objects", {
        type: "chatwoot_settings",
        name: "Chatwoot Settings",
        organizationId: orgId,
        status: "active",
        customProperties: settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Sync channel_provider_binding objects
    // Remove existing Chatwoot bindings
    const existingBindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    const chatwootBindings = existingBindings.filter(
      (b) =>
        (b.customProperties as Record<string, unknown>)?.providerId ===
        "chatwoot"
    );

    for (const binding of chatwootBindings) {
      await ctx.db.delete(binding._id);
    }

    // Create new bindings for enabled channels
    if (args.enabled) {
      for (const channel of args.configuredChannels) {
        // Check if another provider already handles this channel
        const otherBinding = existingBindings.find((b) => {
          const props = b.customProperties as Record<string, unknown>;
          return (
            props?.channel === channel &&
            props?.providerId !== "chatwoot" &&
            props?.enabled === true
          );
        });

        await ctx.db.insert("objects", {
          type: "channel_provider_binding",
          name: `${channel} via Chatwoot`,
          organizationId: orgId,
          status: "active",
          customProperties: {
            channel,
            providerId: "chatwoot",
            priority: otherBinding ? 2 : 1, // Lower priority if another provider exists
            enabled: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: existing ? "update" : "create",
      resource: "chatwoot_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        channels: args.configuredChannels,
      },
    });

    return { success: true, settingsId };
  },
});

/**
 * Disconnect Chatwoot — removes settings and all channel bindings.
 */
export const disconnectChatwoot = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    const orgId = user.defaultOrgId as Id<"organizations">;

    // Verify permission
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Delete chatwoot_settings
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "chatwoot_settings")
      )
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete all Chatwoot channel bindings
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      if (
        (binding.customProperties as Record<string, unknown>)?.providerId ===
        "chatwoot"
      ) {
        await ctx.db.delete(binding._id);
      }
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: "delete",
      resource: "chatwoot_settings",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Test Chatwoot connection by calling the account API.
 */
export const testChatwootConnection = action({
  args: {
    chatwootUrl: v.string(),
    chatwootApiToken: v.string(),
    chatwootAccountId: v.number(),
  },
  handler: async (_ctx, args) => {
    const baseUrl = args.chatwootUrl.replace(/\/+$/, "");

    try {
      const response = await fetch(
        `${baseUrl}/api/v1/accounts/${args.chatwootAccountId}`,
        {
          headers: { api_access_token: args.chatwootApiToken },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${text.substring(0, 200)}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        accountName: data.name || "Unknown",
        accountId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Fetch available inboxes from Chatwoot (for channel mapping UI).
 */
export const getChatwootInboxes = action({
  args: {
    chatwootUrl: v.string(),
    chatwootApiToken: v.string(),
    chatwootAccountId: v.number(),
  },
  handler: async (_ctx, args) => {
    const baseUrl = args.chatwootUrl.replace(/\/+$/, "");

    try {
      const response = await fetch(
        `${baseUrl}/api/v1/accounts/${args.chatwootAccountId}/inboxes`,
        {
          headers: { api_access_token: args.chatwootApiToken },
        }
      );

      if (!response.ok) {
        return { success: false, inboxes: [], error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const inboxes = (data.payload || []).map(
        (inbox: Record<string, unknown>) => ({
          id: inbox.id,
          name: inbox.name,
          channelType: inbox.channel_type,
          enabled: inbox.enable_auto_assignment,
        })
      );

      return { success: true, inboxes };
    } catch (error) {
      return {
        success: false,
        inboxes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
