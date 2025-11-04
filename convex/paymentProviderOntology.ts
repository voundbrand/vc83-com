/**
 * PAYMENT PROVIDER ONTOLOGY
 *
 * Manages payment provider configurations as objects in the "objects" table.
 * This is the NEW way to store provider configs (replacing org.paymentProviders array).
 *
 * Object Type: payment_provider_config
 *
 * Example:
 * {
 *   type: "payment_provider_config",
 *   organizationId: "org_id",
 *   name: "Stripe Connect",
 *   description: "Credit card payments via Stripe",
 *   status: "active",
 *   customProperties: {
 *     providerCode: "stripe-connect",
 *     accountId: "acct_...",
 *     isDefault: true,
 *     isTestMode: false,
 *     supportsB2B: true,
 *     supportsB2C: true,
 *     connectedAt: 1234567890,
 *   }
 * }
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// =========================================
// REGISTER PAYMENT PROVIDERS
// =========================================

/**
 * REGISTER STRIPE CONNECT PROVIDER
 *
 * Creates a payment_provider_config object for Stripe Connect.
 * Called after successful Stripe Connect onboarding.
 */
export const registerStripeProvider = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    accountId: v.string(),
    isTestMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if provider already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "payment_provider_config")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.providerCode"), "stripe-connect")
      )
      .first();

    // Check if this is the first provider (should be default)
    const allProviders = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "payment_provider_config")
      )
      .collect();

    const isFirstProvider = allProviders.length === 0;

    if (existing) {
      // Update existing provider
      await ctx.db.patch(existing._id, {
        status: "active",
        customProperties: {
          ...(existing.customProperties || {}),
          providerCode: "stripe-connect",
          accountId: args.accountId,
          isTestMode: args.isTestMode ?? false,
          supportsB2B: true,
          supportsB2C: true,
          connectedAt: Date.now(),
        },
        updatedAt: Date.now(),
      });

      return { success: true, providerId: existing._id };
    }

    // Create new provider config
    const providerId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "payment_provider_config",
      name: "Stripe Connect",
      description: "Accept credit card payments via Stripe",
      status: "active",
      customProperties: {
        providerCode: "stripe-connect",
        accountId: args.accountId,
        isDefault: isFirstProvider, // First provider is default
        isTestMode: args.isTestMode ?? false,
        supportsB2B: true,
        supportsB2C: true,
        connectedAt: Date.now(),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: providerId,
      actionType: "payment_provider_registered",
      actionData: {
        providerCode: "stripe-connect",
        accountId: args.accountId,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, providerId };
  },
});

/**
 * REGISTER INVOICE PROVIDER
 *
 * Creates a payment_provider_config object for invoice payments.
 * Called when Invoicing app is enabled for an organization.
 */
export const registerInvoiceProvider = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify Invoicing app is available
    const app = await ctx.db
      .query("apps")
      .filter((q) => q.eq(q.field("code"), "app_invoicing"))
      .first();

    if (!app) {
      throw new Error("Invoicing app not found in system");
    }

    const appAvailability = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", (q) =>
        q.eq("organizationId", args.organizationId).eq("appId", app._id)
      )
      .first();

    if (!appAvailability?.isAvailable) {
      throw new Error("Invoicing app not enabled for this organization");
    }

    // Check if provider already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "payment_provider_config")
      )
      .filter((q) => q.eq(q.field("customProperties.providerCode"), "invoice"))
      .first();

    // Check if this is the first provider (should be default)
    const allProviders = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "payment_provider_config")
      )
      .collect();

    const isFirstProvider = allProviders.length === 0;

    if (existing) {
      return {
        success: true,
        message: "Invoice provider already registered",
        providerId: existing._id,
      };
    }

    // Create new provider config
    const providerId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "payment_provider_config",
      name: "Invoice (Pay Later)",
      description: "B2B invoice payment with Net 30 terms",
      status: "active",
      customProperties: {
        providerCode: "invoice",
        accountId: "invoice-system", // No real account needed
        isDefault: isFirstProvider, // First provider is default
        isTestMode: false,
        supportsB2B: true, // Invoice is B2B only
        supportsB2C: false,
        connectedAt: Date.now(),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: providerId,
      actionType: "payment_provider_registered",
      actionData: {
        providerCode: "invoice",
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, message: "Invoice provider registered", providerId };
  },
});

// =========================================
// MANAGE PROVIDERS
// =========================================

/**
 * SET DEFAULT PROVIDER
 *
 * Sets a provider as the default payment method.
 * Unsets any other defaults.
 */
export const setDefaultProvider = mutation({
  args: {
    sessionId: v.string(),
    providerId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.type !== "payment_provider_config") {
      throw new Error("Provider not found");
    }

    // Get all providers for this org
    const allProviders = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", provider.organizationId)
          .eq("type", "payment_provider_config")
      )
      .collect();

    // Unset all defaults
    for (const p of allProviders) {
      if (p._id === args.providerId) continue;
      await ctx.db.patch(p._id, {
        customProperties: {
          ...(p.customProperties || {}),
          isDefault: false,
        },
        updatedAt: Date.now(),
      });
    }

    // Set this as default
    await ctx.db.patch(args.providerId, {
      customProperties: {
        ...(provider.customProperties || {}),
        isDefault: true,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: provider.organizationId,
      objectId: args.providerId,
      actionType: "payment_provider_default_changed",
      actionData: {
        providerCode: provider.customProperties?.providerCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DISABLE PROVIDER
 *
 * Disables a payment provider (sets status to "inactive").
 */
export const disableProvider = mutation({
  args: {
    sessionId: v.string(),
    providerId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.type !== "payment_provider_config") {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: provider.organizationId,
      objectId: args.providerId,
      actionType: "payment_provider_disabled",
      actionData: {
        providerCode: provider.customProperties?.providerCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * ENABLE PROVIDER
 *
 * Re-enables a disabled payment provider.
 */
export const enableProvider = mutation({
  args: {
    sessionId: v.string(),
    providerId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.type !== "payment_provider_config") {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: provider.organizationId,
      objectId: args.providerId,
      actionType: "payment_provider_enabled",
      actionData: {
        providerCode: provider.customProperties?.providerCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

// =========================================
// QUERIES
// =========================================

/**
 * GET ALL PROVIDERS FOR ORGANIZATION
 *
 * Returns all provider configs (active and inactive).
 */
export const getProvidersForOrg = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const providers = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "payment_provider_config")
      )
      .collect();

    return providers.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      status: p.status,
      providerCode: p.customProperties?.providerCode as string,
      isDefault: p.customProperties?.isDefault as boolean,
      isTestMode: p.customProperties?.isTestMode as boolean,
      supportsB2B: p.customProperties?.supportsB2B as boolean,
      supportsB2C: p.customProperties?.supportsB2C as boolean,
      connectedAt: p.customProperties?.connectedAt as number,
    }));
  },
});
