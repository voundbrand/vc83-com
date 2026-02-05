/**
 * RESEND EMAIL INTEGRATION
 *
 * Per-org Resend email integration for transactional and marketing emails.
 * Each org can bring their own Resend API key and verified domain.
 *
 * Configuration stored in objects table as type="resend_settings".
 * Channel bindings stored as type="channel_provider_binding".
 *
 * Resend API Reference: https://resend.com/docs/api-reference
 */

import {
  action,
  mutation,
  query,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get Resend settings for the current org (public query for UI).
 * NEVER returns the API key.
 */
export const getResendSettings = query({
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
          .eq("type", "resend_settings")
      )
      .first();

    if (!settings) {
      return { configured: false, enabled: false };
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      configured: true,
      enabled: props.enabled as boolean,
      senderEmail: props.senderEmail as string | undefined,
      replyToEmail: props.replyToEmail as string | undefined,
      verifiedDomains: (props.verifiedDomains as string[]) || [],
    };
  },
});

/**
 * Internal query for settings with credentials (used by email sending).
 */
export const getSettingsInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "resend_settings")
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
 * Save Resend connection settings and create email channel binding.
 */
export const saveResendSettings = mutation({
  args: {
    sessionId: v.string(),
    resendApiKey: v.string(),
    senderEmail: v.string(),
    replyToEmail: v.optional(v.string()),
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
    const canManage = await ctx.runQuery(api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    const settingsData = {
      resendApiKey: args.resendApiKey,
      senderEmail: args.senderEmail,
      replyToEmail: args.replyToEmail || "",
      enabled: args.enabled,
    };

    // Upsert resend_settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "resend_settings")
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
        type: "resend_settings",
        name: "Resend Settings",
        organizationId: orgId,
        status: "active",
        customProperties: settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Sync channel_provider_binding for email
    // Remove existing Resend bindings first
    const existingBindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    const resendBindings = existingBindings.filter(
      (b) =>
        (b.customProperties as Record<string, unknown>)?.providerId === "resend"
    );

    for (const binding of resendBindings) {
      await ctx.db.delete(binding._id);
    }

    // Create new email binding if enabled
    if (args.enabled) {
      await ctx.db.insert("objects", {
        type: "channel_provider_binding",
        name: "email via Resend",
        organizationId: orgId,
        status: "active",
        customProperties: {
          channel: "email",
          providerId: "resend",
          priority: 1,
          enabled: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Audit log
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: existing ? "update" : "create",
      resource: "resend_settings",
      success: true,
      metadata: {
        enabled: args.enabled,
        senderEmail: args.senderEmail,
      },
    });

    return { success: true, settingsId };
  },
});

/**
 * Disconnect Resend — removes settings and email channel bindings.
 */
export const disconnectResend = mutation({
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
    const canManage = await ctx.runQuery(api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: orgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Delete resend_settings
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "resend_settings")
      )
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete all Resend channel bindings
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      if (
        (binding.customProperties as Record<string, unknown>)?.providerId ===
        "resend"
      ) {
        await ctx.db.delete(binding._id);
      }
    }

    // Audit log
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: user._id,
      organizationId: orgId,
      action: "delete",
      resource: "resend_settings",
      success: true,
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Test Resend connection by fetching verified domains.
 */
export const testResendConnection = action({
  args: {
    resendApiKey: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${args.resendApiKey}` },
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${text.substring(0, 200)}`,
        };
      }

      const data = await response.json();
      const domains = (data.data || []).map(
        (domain: Record<string, unknown>) => ({
          name: domain.name as string,
          status: domain.status as string,
        })
      );

      return { success: true, domains };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
