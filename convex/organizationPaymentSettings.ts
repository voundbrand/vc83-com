/**
 * ORGANIZATION PAYMENT SETTINGS
 *
 * Manages payment provider configuration for organizations.
 * This is the SINGLE SOURCE OF TRUTH for which payment providers
 * an organization wants to offer in their checkouts.
 *
 * Object Type: organization_payment_settings
 *
 * Simple Model:
 * - Enable providers → they appear in checkouts
 * - Disable providers → they don't appear
 * - No "default" selection needed - customers choose their preferred method
 *
 * Hierarchy:
 * 1. Checkout Instance Override (if set) → specific checkout customization
 * 2. Organization's enabledPaymentProviders → default for all checkouts
 * 3. Fallback to "stripe" if nothing configured
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * GET PAYMENT SETTINGS
 * Retrieves payment provider configuration for an organization
 */
export const getPaymentSettings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Payment settings are stored in organization_payment_settings object
    const paymentSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_payment_settings")
      )
      .first();

    if (!paymentSettings) {
      // Return defaults if no settings exist
      return {
        _id: null,
        organizationId: args.organizationId,
        enabledPaymentProviders: [], // No providers enabled by default
      };
    }

    return {
      _id: paymentSettings._id,
      organizationId: paymentSettings.organizationId,
      enabledPaymentProviders: paymentSettings.customProperties?.enabledPaymentProviders ?? [],
    };
  },
});

/**
 * GET PUBLIC PAYMENT SETTINGS
 * Public version for checkout pages (no auth required)
 * This is used by the behavior-driven checkout to know which providers to show
 */
export const getPublicPaymentSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const paymentSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_payment_settings")
      )
      .first();

    if (!paymentSettings) {
      // Return defaults - empty means "use whatever checkout instance has"
      return {
        enabledPaymentProviders: [],
      };
    }

    return {
      enabledPaymentProviders: paymentSettings.customProperties?.enabledPaymentProviders ?? [],
    };
  },
});

/**
 * UPDATE PAYMENT SETTINGS
 * Updates the enabled payment providers for an organization
 */
export const updatePaymentSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    enabledPaymentProviders: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Find existing settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_payment_settings")
      )
      .first();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...(existing.customProperties || {}),
          enabledPaymentProviders: args.enabledPaymentProviders,
        },
        updatedAt: Date.now(),
      });

      return { success: true, settingsId: existing._id };
    }

    // Create new settings object
    const settingsId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_payment_settings",
      name: "Payment Settings",
      description: "Organization payment provider configuration",
      status: "active",
      customProperties: {
        enabledPaymentProviders: args.enabledPaymentProviders,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    });

    return { success: true, settingsId };
  },
});

/**
 * TOGGLE PAYMENT PROVIDER
 * Enables or disables a specific payment provider
 */
export const togglePaymentProvider = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerCode: v.string(), // e.g., "stripe", "invoice"
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Find existing settings
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_payment_settings")
      )
      .first();

    let currentProviders: string[] = [];

    if (existing) {
      currentProviders = existing.customProperties?.enabledPaymentProviders ?? [];
    }

    // Update the providers list
    if (args.enabled) {
      // Add provider if not already present
      if (!currentProviders.includes(args.providerCode)) {
        currentProviders = [...currentProviders, args.providerCode];
      }
    } else {
      // Remove provider
      currentProviders = currentProviders.filter(p => p !== args.providerCode);
    }

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...(existing.customProperties || {}),
          enabledPaymentProviders: currentProviders,
        },
        updatedAt: Date.now(),
      });

      return { success: true, enabledProviders: currentProviders };
    }

    // Create new settings object
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_payment_settings",
      name: "Payment Settings",
      description: "Organization payment provider configuration",
      status: "active",
      customProperties: {
        enabledPaymentProviders: currentProviders,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    });

    return { success: true, enabledProviders: currentProviders };
  },
});
