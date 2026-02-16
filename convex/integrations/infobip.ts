/**
 * INFOBIP SMS INTEGRATION
 *
 * Infobip SMS provider integration for outbound SMS messaging.
 * Each org connects their own Infobip account via API key + base URL.
 *
 * Configuration stored in objects table as type="infobip_settings".
 * Channel bindings stored as type="channel_provider_binding".
 *
 * Infobip API Reference: https://www.infobip.com/docs/api
 */

import {
  action,
  mutation,
  query,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
const generatedApi: any = require("../_generated/api");

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get Infobip settings for the current org (public query for UI).
 * NEVER returns the API key — only connection status and non-sensitive config.
 */
export const getInfobipSettings = query({
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
          .eq("type", "infobip_settings")
      )
      .first();

    if (!settings) {
      return { configured: false, enabled: false };
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      configured: true,
      enabled: props.enabled as boolean,
      baseUrl: props.infobipBaseUrl as string | undefined,
      senderId: props.infobipSmsSenderId as string | undefined,
    };
  },
});

/**
 * Internal query for settings with credentials (used by router/channel system).
 */
export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "infobip_settings")
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
 * Save Infobip connection settings and create channel bindings.
 */
export const saveInfobipSettings = mutation({
  args: {
    sessionId: v.string(),
    infobipApiKey: v.string(),
    infobipBaseUrl: v.string(),
    infobipSmsSenderId: v.string(),
    enabled: v.boolean(),
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
      infobipApiKey: args.infobipApiKey,
      infobipBaseUrl: args.infobipBaseUrl.replace(/\/+$/, ""), // Strip trailing slash
      infobipSmsSenderId: args.infobipSmsSenderId,
      enabled: args.enabled,
    };

    // Upsert infobip_settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "infobip_settings")
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
        type: "infobip_settings",
        name: "Infobip SMS Settings",
        organizationId: orgId,
        status: "active",
        customProperties: settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Sync channel_provider_binding objects
    // Remove existing Infobip bindings
    const existingBindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    const infobipBindings = existingBindings.filter(
      (b) =>
        (b.customProperties as Record<string, unknown>)?.providerId ===
        "infobip"
    );

    for (const binding of infobipBindings) {
      await ctx.db.delete(binding._id);
    }

    // Create new binding for SMS channel if enabled
    if (args.enabled) {
      await ctx.db.insert("objects", {
        type: "channel_provider_binding",
        name: "sms via Infobip",
        organizationId: orgId,
        status: "active",
        customProperties: {
          channel: "sms",
          providerId: "infobip",
          priority: 1,
          enabled: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: existing ? "update" : "create",
      resource: "infobip_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        channels: ["sms"],
      },
    });

    return { success: true, settingsId };
  },
});

/**
 * Disconnect Infobip — removes settings and all channel bindings.
 */
export const disconnectInfobip = mutation({
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

    // Delete infobip_settings
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "infobip_settings")
      )
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete all Infobip channel bindings
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      if (
        (binding.customProperties as Record<string, unknown>)?.providerId ===
        "infobip"
      ) {
        await ctx.db.delete(binding._id);
      }
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: "delete",
      resource: "infobip_settings",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Test Infobip connection by calling the account balance API.
 */
export const testInfobipConnection = action({
  args: {
    infobipApiKey: v.string(),
    infobipBaseUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const baseUrl = args.infobipBaseUrl.replace(/\/+$/, "");

    try {
      const response = await fetch(`${baseUrl}/account/1/balance`, {
        headers: { Authorization: `App ${args.infobipApiKey}` },
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${text.substring(0, 200)}`,
        };
      }

      const data = (await response.json()) as {
        balance?: number;
        currency?: string;
      };
      return {
        success: true,
        balance: `${data.balance} ${data.currency}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
