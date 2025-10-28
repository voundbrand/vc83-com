/**
 * INVOICE PAYMENT AVAILABILITY CHECK
 *
 * Determines if invoice payment method is available for organization.
 * Used by checkout to show/hide "Invoice (Pay Later)" option.
 *
 * Also handles automatic registration of invoice payment provider.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { updateOrgProviderConfig } from "./helpers";

/**
 * CHECK INVOICE PAYMENT AVAILABILITY
 *
 * Returns whether invoice payment is available for an organization.
 *
 * Key Philosophy:
 * - CRM organizations don't need to exist beforehand
 * - They're created automatically during checkout when customer provides employer info
 * - Empty CRM should NOT block invoice availability
 *
 * Only Criteria:
 * 1. Invoicing App is enabled for organization (via appAvailabilities)
 */
export const checkInvoicePaymentAvailability = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // 1. Check if Invoicing App (app_invoicing) is available
    // This is the ONLY requirement - CRM orgs are created on-demand
    const apps = await ctx.db
      .query("apps")
      .filter((q) => q.eq(q.field("code"), "app_invoicing"))
      .first();

    if (!apps) {
      return {
        available: false,
        reason: "Invoicing app not registered in system",
      };
    }

    // Check if app is available for this organization
    const appAvailability = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", (q) =>
        q.eq("organizationId", args.organizationId).eq("appId", apps._id)
      )
      .first();

    if (!appAvailability?.isAvailable) {
      return {
        available: false,
        reason: "Invoicing app not enabled for this organization",
      };
    }

    // Optional: Count existing CRM orgs for informational purposes only
    const crmOrgsCount = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      )
      .collect()
      .then((orgs) => orgs.length);

    // Invoice payment is available! CRM orgs will be created during checkout as needed
    return {
      available: true,
      crmOrganizationsCount: crmOrgsCount, // Informational only
    };
  },
});

/**
 * REGISTER INVOICE PAYMENT PROVIDER
 *
 * Automatically adds invoice as a payment provider when Invoicing app is enabled.
 * Called when enabling the Invoicing app for an organization.
 */
export const registerInvoiceProvider = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if invoice provider already registered
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const existingProviders = org.paymentProviders || [];
    const invoiceProviderExists = existingProviders.some(
      (p) => p.providerCode === "invoice"
    );

    if (invoiceProviderExists) {
      return {
        success: true,
        message: "Invoice provider already registered",
      };
    }

    // Add invoice as a payment provider
    await updateOrgProviderConfig(ctx, args.organizationId, {
      providerCode: "invoice",
      accountId: "invoice-system", // No real account ID needed
      status: "active",
      isDefault: existingProviders.length === 0, // Default if no other providers
      isTestMode: false,
      connectedAt: Date.now(),
    });

    return {
      success: true,
      message: "Invoice provider registered successfully",
    };
  },
});
