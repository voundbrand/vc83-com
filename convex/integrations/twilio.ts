/**
 * TWILIO SMS INTEGRATION
 *
 * Per-org Twilio integration for SMS verification and messaging.
 * Each org can bring their own Twilio API credentials and Verify service.
 *
 * Configuration stored in objects table as type="twilio_settings".
 * Channel bindings stored as type="channel_provider_binding".
 *
 * Twilio API Reference: https://www.twilio.com/docs/usage/api
 */

import {
  action,
  internalAction,
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
 * Get Twilio settings for the current org (public query for UI).
 * NEVER returns the auth token or account SID.
 */
export const getTwilioSettings = query({
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
          .eq("type", "twilio_settings")
      )
      .first();

    if (!settings) {
      return { configured: false, enabled: false };
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      configured: true,
      enabled: props.enabled as boolean,
      accountSidLast4: typeof props.accountSid === "string"
        ? `...${props.accountSid.slice(-4)}`
        : undefined,
      verifyServiceSid: props.verifyServiceSid as string | undefined,
      smsPhoneNumber: props.smsPhoneNumber as string | undefined,
    };
  },
});

/**
 * Internal query for settings with credentials (used by SMS sending).
 */
export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "twilio_settings")
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
 * Save Twilio connection settings and create SMS channel binding.
 */
export const saveTwilioSettings = mutation({
  args: {
    sessionId: v.string(),
    accountSid: v.string(),
    authToken: v.string(),
    verifyServiceSid: v.optional(v.string()),
    smsPhoneNumber: v.optional(v.string()),
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

    const normalizedSid = args.accountSid.trim();
    const normalizedToken = args.authToken.trim();
    if (!normalizedSid || !normalizedToken) {
      throw new Error("Account SID and Auth Token are required");
    }

    const encryptedSid = await (ctx as any).runAction(
      generatedApi.internal.oauth.encryption.encryptToken,
      { plaintext: normalizedSid }
    ) as string;

    const encryptedToken = await (ctx as any).runAction(
      generatedApi.internal.oauth.encryption.encryptToken,
      { plaintext: normalizedToken }
    ) as string;

    const settingsData = {
      accountSid: encryptedSid,
      authToken: encryptedToken,
      credentialSource: "object_settings",
      encryptedFields: ["accountSid", "authToken"],
      verifyServiceSid: args.verifyServiceSid?.trim() || "",
      smsPhoneNumber: args.smsPhoneNumber?.trim() || "",
      enabled: args.enabled,
    };

    // Upsert twilio_settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "twilio_settings")
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
        type: "twilio_settings",
        name: "Twilio Settings",
        organizationId: orgId,
        status: "active",
        customProperties: settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Sync channel_provider_binding for SMS
    // Remove existing Twilio bindings first
    const existingBindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    const twilioBindings = existingBindings.filter(
      (b) =>
        (b.customProperties as Record<string, unknown>)?.providerId === "twilio"
    );

    for (const binding of twilioBindings) {
      await ctx.db.delete(binding._id);
    }

    // Create new SMS binding if enabled
    if (args.enabled) {
      await ctx.db.insert("objects", {
        type: "channel_provider_binding",
        name: "sms via Twilio",
        organizationId: orgId,
        status: "active",
        customProperties: {
          channel: "sms",
          providerId: "twilio",
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
      resource: "twilio_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        hasVerifyService: Boolean(args.verifyServiceSid?.trim()),
        hasSmsPhoneNumber: Boolean(args.smsPhoneNumber?.trim()),
      },
    });

    return { success: true, settingsId };
  },
});

/**
 * Disconnect Twilio — removes settings and SMS channel bindings.
 */
export const disconnectTwilio = mutation({
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

    // Delete twilio_settings
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "twilio_settings")
      )
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete all Twilio channel bindings
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      if (
        (binding.customProperties as Record<string, unknown>)?.providerId ===
        "twilio"
      ) {
        await ctx.db.delete(binding._id);
      }
    }

    // Audit log
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: "delete",
      resource: "twilio_settings",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Test Twilio connection by fetching account info.
 */
export const testTwilioConnection = action({
  args: {
    accountSid: v.string(),
    authToken: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const credentials = btoa(`${args.accountSid}:${args.authToken}`);
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${args.accountSid}.json`,
        {
          headers: { Authorization: `Basic ${credentials}` },
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
        accountName: data.friendly_name as string,
        accountStatus: data.status as string,
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
 * Resolve Twilio credentials for an org, decrypting if needed.
 * Falls back to platform env vars when no org settings exist.
 */
export const resolveCredentials = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(
      generatedApi.internal.integrations.twilio.getSettingsInternal,
      { organizationId: args.organizationId }
    ) as Record<string, unknown> | null;

    if (
      settings?.accountSid &&
      settings?.authToken &&
      settings?.enabled !== false
    ) {
      const encryptedFields = (settings.encryptedFields as string[]) || [];
      const needsDecrypt = encryptedFields.includes("accountSid");

      const accountSid = needsDecrypt
        ? (await ctx.runAction(
            generatedApi.internal.oauth.encryption.decryptToken,
            { encrypted: settings.accountSid as string }
          ) as string)
        : (settings.accountSid as string);

      const authToken = needsDecrypt
        ? (await ctx.runAction(
            generatedApi.internal.oauth.encryption.decryptToken,
            { encrypted: settings.authToken as string }
          ) as string)
        : (settings.authToken as string);

      return {
        accountSid,
        authToken,
        verifyServiceSid: (settings.verifyServiceSid as string) || null,
        smsPhoneNumber: (settings.smsPhoneNumber as string) || null,
        source: "org" as const,
      };
    }

    // Fall back to platform env vars
    const envSid = process.env.TWILIO_ACCOUNT_SID;
    const envToken = process.env.TWILIO_AUTH_TOKEN;
    if (!envSid || !envToken) return null;

    return {
      accountSid: envSid,
      authToken: envToken,
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || null,
      smsPhoneNumber: null,
      source: "platform" as const,
    };
  },
});
