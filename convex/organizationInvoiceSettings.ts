/**
 * ORGANIZATION INVOICE SETTINGS
 *
 * Manages Stripe Invoicing configuration for organizations.
 * Similar to tax settings, invoice settings are stored in organization_legal object.
 *
 * Key Features:
 * - Enable/disable Stripe Invoicing
 * - Configure collection method (automatic vs. send_invoice)
 * - Set payment terms (net 30, net 60, etc.)
 * - Auto-advance settings
 * - Default payment methods
 *
 * Integration with Stripe:
 * - Syncs with Stripe Dashboard invoice settings
 * - Webhook handlers for invoice events
 * - Real-time status updates
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * GET INVOICE SETTINGS
 * Retrieves invoice configuration from organization_legal object
 */
export const getInvoiceSettings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Invoice settings are stored in organization_legal object
    const legalSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    if (!legalSettings) {
      return null;
    }

    // Extract invoice-specific settings from customProperties
    const invoiceSettings = {
      _id: legalSettings._id,
      organizationId: legalSettings.organizationId,
      invoicingEnabled: legalSettings.customProperties?.invoicingEnabled ?? false,
      collectionMethod: legalSettings.customProperties?.invoiceSettings?.collectionMethod ?? "send_invoice",
      paymentTerms: legalSettings.customProperties?.invoiceSettings?.paymentTerms ?? "net_30",
      autoAdvance: legalSettings.customProperties?.invoiceSettings?.autoAdvance ?? true,
      defaultPaymentMethods: legalSettings.customProperties?.invoiceSettings?.defaultPaymentMethods ?? ["card"],
      customFooter: legalSettings.customProperties?.invoiceSettings?.customFooter ?? "",
      daysUntilDue: legalSettings.customProperties?.invoiceSettings?.daysUntilDue ?? 30,
      automaticTax: legalSettings.customProperties?.invoiceSettings?.automaticTax ?? false,
    };

    return invoiceSettings;
  },
});

/**
 * GET PUBLIC INVOICE SETTINGS
 * Public version for checkout pages (no auth required)
 */
export const getPublicInvoiceSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const legalSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    if (!legalSettings) {
      return null;
    }

    // Return only public-safe invoice settings
    return {
      invoicingEnabled: legalSettings.customProperties?.invoicingEnabled ?? false,
      collectionMethod: legalSettings.customProperties?.invoiceSettings?.collectionMethod ?? "send_invoice",
      paymentTerms: legalSettings.customProperties?.invoiceSettings?.paymentTerms ?? "net_30",
      daysUntilDue: legalSettings.customProperties?.invoiceSettings?.daysUntilDue ?? 30,
    };
  },
});

/**
 * UPDATE INVOICE SETTINGS
 * Update invoice configuration
 */
export const updateInvoiceSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    invoicingEnabled: v.optional(v.boolean()),
    collectionMethod: v.optional(v.union(v.literal("charge_automatically"), v.literal("send_invoice"))),
    paymentTerms: v.optional(v.union(
      v.literal("net_30"),
      v.literal("net_60"),
      v.literal("net_90"),
      v.literal("due_on_receipt")
    )),
    autoAdvance: v.optional(v.boolean()),
    defaultPaymentMethods: v.optional(v.array(v.string())),
    customFooter: v.optional(v.string()),
    daysUntilDue: v.optional(v.number()),
    automaticTax: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get existing legal settings
    const legalSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    if (!legalSettings) {
      throw new Error("Organization legal settings not found. Please create them first.");
    }

    // Build updated invoice settings
    const existingInvoiceSettings = legalSettings.customProperties?.invoiceSettings || {};
    const updatedInvoiceSettings = {
      ...existingInvoiceSettings,
      ...(args.collectionMethod !== undefined && { collectionMethod: args.collectionMethod }),
      ...(args.paymentTerms !== undefined && { paymentTerms: args.paymentTerms }),
      ...(args.autoAdvance !== undefined && { autoAdvance: args.autoAdvance }),
      ...(args.defaultPaymentMethods !== undefined && { defaultPaymentMethods: args.defaultPaymentMethods }),
      ...(args.customFooter !== undefined && { customFooter: args.customFooter }),
      ...(args.daysUntilDue !== undefined && { daysUntilDue: args.daysUntilDue }),
      ...(args.automaticTax !== undefined && { automaticTax: args.automaticTax }),
    };

    // Update organization_legal with new invoice settings
    await ctx.db.patch(legalSettings._id, {
      customProperties: {
        ...legalSettings.customProperties,
        invoicingEnabled: args.invoicingEnabled ?? legalSettings.customProperties?.invoicingEnabled ?? false,
        invoiceSettings: updatedInvoiceSettings,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * SYNC FROM STRIPE INTERNAL
 * Internal mutation to sync invoice settings from Stripe Dashboard
 * Called when refreshing Stripe account status
 */
export const syncInvoiceSettingsFromStripe = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeInvoiceSettings: v.object({
      defaultCollectionMethod: v.optional(v.string()),
      defaultPaymentTerms: v.optional(v.string()),
      defaultAutoAdvance: v.optional(v.boolean()),
      defaultDaysUntilDue: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Get organization_legal object
    const legalSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    if (!legalSettings) {
      console.log("⚠️ Cannot sync invoice settings: organization_legal object not found");
      return { success: false, settingsFound: false };
    }

    // Map Stripe settings to our format
    const existingInvoiceSettings = legalSettings.customProperties?.invoiceSettings || {};
    const syncedSettings = {
      ...existingInvoiceSettings,
      collectionMethod: args.stripeInvoiceSettings.defaultCollectionMethod || existingInvoiceSettings.collectionMethod || "send_invoice",
      paymentTerms: args.stripeInvoiceSettings.defaultPaymentTerms || existingInvoiceSettings.paymentTerms || "net_30",
      autoAdvance: args.stripeInvoiceSettings.defaultAutoAdvance ?? existingInvoiceSettings.autoAdvance ?? true,
      daysUntilDue: args.stripeInvoiceSettings.defaultDaysUntilDue || existingInvoiceSettings.daysUntilDue || 30,
    };

    // Update settings
    await ctx.db.patch(legalSettings._id, {
      customProperties: {
        ...legalSettings.customProperties,
        invoicingEnabled: true, // If Stripe has invoice settings, enable invoicing
        invoiceSettings: syncedSettings,
      },
      updatedAt: Date.now(),
    });

    console.log(`✅ Synced invoice settings from Stripe for org ${args.organizationId}`);

    const result: { success: boolean; settingsFound: boolean; invoicingEnabled: boolean } = {
      success: true,
      settingsFound: true,
      invoicingEnabled: true,
    };

    return result;
  },
});

/**
 * HANDLE INVOICE WEBHOOK
 * Process invoice-related webhook events from Stripe
 * Called internally by webhook router
 */
export const handleInvoiceWebhook = internalMutation({
  args: {
    eventType: v.string(),
    invoiceData: v.object({
      id: v.string(),
      customer: v.optional(v.string()),
      status: v.optional(v.string()),
      amount_due: v.optional(v.number()),
      amount_paid: v.optional(v.number()),
      collection_method: v.optional(v.string()),
      account: v.optional(v.string()), // Stripe Connect account ID
    }),
  },
  handler: async (ctx, args) => {
    console.log(`Processing invoice webhook: ${args.eventType} for invoice ${args.invoiceData.id}`);

    // Future: Store invoice data in database for tracking
    // For now, just log it

    switch (args.eventType) {
      case "invoice.created":
        console.log(`✅ Invoice created: ${args.invoiceData.id}`);
        break;

      case "invoice.finalized":
        console.log(`✅ Invoice finalized: ${args.invoiceData.id}`);
        break;

      case "invoice.paid":
        console.log(`✅ Invoice paid: ${args.invoiceData.id} - Amount: ${args.invoiceData.amount_paid}`);
        break;

      case "invoice.payment_failed":
        console.log(`❌ Invoice payment failed: ${args.invoiceData.id}`);
        break;

      case "invoice.payment_action_required":
        console.log(`⚠️ Invoice requires action: ${args.invoiceData.id}`);
        break;

      default:
        console.log(`ℹ️ Unhandled invoice event: ${args.eventType}`);
    }

    return { success: true, processed: args.eventType };
  },
});
