/**
 * STRIPE INVOICES INTEGRATION (OPTIONAL)
 *
 * This module provides optional Stripe Invoice integration for organizations.
 * Organizations can choose to use Stripe for invoice delivery and payment collection,
 * or continue using the native PDF-based invoicing system.
 *
 * Key Features:
 * - Optional: Organizations can enable/disable Stripe invoicing
 * - Two-way sync: Push invoices to Stripe, pull payment status
 * - Fallback: Always maintain invoice data in our database
 * - CRM Integration: Links to existing CRM contacts/organizations
 *
 * Settings Location:
 * - organization_legal.customProperties.useStripeInvoices (boolean)
 * - organization_legal.customProperties.invoicingEnabled (boolean)
 *
 * Architecture:
 * - Source of Truth: Our database (objects table with type="invoice")
 * - Stripe: Optional payment/delivery channel
 * - Webhooks: Keep status in sync
 */

import { internalAction, internalMutation, internalQuery, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import Stripe from "stripe";
import { OrganizationProviderConfig } from "./paymentProviders/types";
import { BillingAddress } from "./paymentProviders/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Stripe Invoice Sync Status
 */
export type StripeSyncStatus =
  | "not_synced"      // Not pushed to Stripe yet
  | "syncing"         // Currently syncing
  | "synced"          // Successfully synced
  | "sync_failed";    // Sync failed (will retry)

/**
 * Stripe-specific invoice properties
 * Stored in invoice object's customProperties
 */
export interface StripeInvoiceProperties {
  // Stripe Integration
  useStripeInvoices: boolean;          // Is this invoice using Stripe?
  stripeSyncStatus?: StripeSyncStatus;
  stripeInvoiceId?: string;            // Stripe invoice ID (inv_...)
  stripeCustomerId?: string;           // Stripe customer ID (cus_...)
  stripeInvoiceNumber?: string;        // Stripe's invoice number
  stripeInvoiceStatus?: string;        // draft, open, paid, void, uncollectible
  stripeHostedUrl?: string;            // Public Stripe invoice URL
  stripePdfUrl?: string;               // Stripe-generated PDF URL
  lastStripeSyncAt?: number;           // Last sync timestamp
  stripeSyncError?: string;            // Last error message (if any)
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * CHECK STRIPE INVOICING AVAILABLE
 * Checks if organization has Stripe invoicing enabled
 */
export const checkStripeInvoicingAvailable = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    available: boolean;
    hasStripeConnect: boolean;
    invoicingEnabled: boolean;
    useStripeInvoices: boolean;
    reason?: string;
  }> => {
    // 1. Check if organization has Stripe Connect
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return {
        available: false,
        hasStripeConnect: false,
        invoicingEnabled: false,
        useStripeInvoices: false,
        reason: "Organization not found",
      };
    }

    const stripeProvider = org.paymentProviders?.find(
      (p) => p.providerCode === "stripe-connect" && p.status === "active"
    );

    if (!stripeProvider) {
      return {
        available: false,
        hasStripeConnect: false,
        invoicingEnabled: false,
        useStripeInvoices: false,
        reason: "Stripe Connect not configured",
      };
    }

    // 2. Check invoice settings
    const legalSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    if (!legalSettings) {
      return {
        available: false,
        hasStripeConnect: true,
        invoicingEnabled: false,
        useStripeInvoices: false,
        reason: "Invoice settings not configured",
      };
    }

    const invoicingEnabled = legalSettings.customProperties?.invoicingEnabled ?? false;
    const useStripeInvoices = legalSettings.customProperties?.useStripeInvoices ?? false;

    return {
      available: invoicingEnabled && useStripeInvoices,
      hasStripeConnect: true,
      invoicingEnabled,
      useStripeInvoices,
      reason: !invoicingEnabled
        ? "Invoicing not enabled"
        : !useStripeInvoices
        ? "Stripe invoices not enabled (using PDF-only mode)"
        : undefined,
    };
  },
});

// ============================================================================
// ACTIONS - STRIPE INVOICE OPERATIONS
// ============================================================================

/**
 * SYNC INVOICE TO STRIPE
 * Pushes an existing invoice from our database to Stripe
 *
 * This is called when:
 * - User manually triggers sync from UI
 * - Invoice is marked as "ready to send" via API
 * - Automatic sync is triggered by workflow
 */
export const syncInvoiceToStripe = internalAction({
  args: {
    invoiceId: v.id("objects"),
    sendImmediately: v.optional(v.boolean()), // If true, finalizes and sends
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    stripeInvoiceId?: string;
    stripeHostedUrl?: string;
    message: string;
  }> => {
    // 1. Get invoice from database
    const invoice = await ctx.runQuery(internal.stripeInvoices.getInvoiceInternal, {
      invoiceId: args.invoiceId,
    });

    if (!invoice || invoice.type !== "invoice") {
      return {
        success: false,
        message: "Invoice not found",
      };
    }

    // 2. Check if Stripe invoicing is enabled for this organization
    const stripeCheck = await ctx.runQuery(
      internal.stripeInvoices.checkStripeInvoicingAvailable,
      { organizationId: invoice.organizationId }
    );

    if (!stripeCheck.available) {
      return {
        success: false,
        message: stripeCheck.reason || "Stripe invoicing not available",
      };
    }

    // 3. Get organization's Stripe account
    const org = await ctx.runQuery(internal.organizations.getOrganization, {
      organizationId: invoice.organizationId,
    });

    const stripeProvider = org.paymentProviders?.find(
      (p: OrganizationProviderConfig) => p.providerCode === "stripe-connect"
    );

    if (!stripeProvider?.accountId) {
      return {
        success: false,
        message: "Stripe account not found",
      };
    }

    try {
      // 4. Initialize Stripe with Connected Account
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new Error("Stripe secret key not configured");
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-10-29.clover",
      });

      // 5. Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(
        ctx,
        stripe,
        stripeProvider.accountId,
        invoice
      );

      // 6. Check if invoice already exists in Stripe
      const existingStripeInvoiceId = invoice.customProperties?.stripeInvoiceId as string | undefined;

      let stripeInvoice: Stripe.Invoice;

      if (existingStripeInvoiceId) {
        // Update existing invoice
        stripeInvoice = await stripe.invoices.retrieve(
          existingStripeInvoiceId,
          { stripeAccount: stripeProvider.accountId }
        );

        // Can only update if status is "draft"
        if (stripeInvoice.status !== "draft") {
          return {
            success: false,
            message: `Invoice already ${stripeInvoice.status} in Stripe, cannot update`,
          };
        }
      } else {
        // Create new invoice in Stripe
        stripeInvoice = await stripe.invoices.create(
          {
            customer: customerId,
            auto_advance: false, // Keep as draft initially
            collection_method: "send_invoice",
            days_until_due: invoice.customProperties?.paymentTerms === "net30" ? 30 :
                           invoice.customProperties?.paymentTerms === "net60" ? 60 :
                           invoice.customProperties?.paymentTerms === "net90" ? 90 : 30,
            description: invoice.description,
            metadata: {
              invoiceId: invoice._id,
              organizationId: invoice.organizationId,
              invoiceNumber: invoice.customProperties?.invoiceNumber as string,
            },
          },
          { stripeAccount: stripeProvider.accountId }
        );
      }

      // 7. Add/update line items
      await syncLineItemsToStripe(
        stripe,
        stripeProvider.accountId,
        stripeInvoice.id,
        invoice
      );

      // 8. Finalize and send if requested
      if (args.sendImmediately && stripeInvoice.status === "draft") {
        stripeInvoice = await stripe.invoices.finalizeInvoice(
          stripeInvoice.id,
          { stripeAccount: stripeProvider.accountId }
        );

        await stripe.invoices.sendInvoice(
          stripeInvoice.id,
          { stripeAccount: stripeProvider.accountId }
        );
      }

      // 9. Update our database with Stripe details
      await ctx.runMutation(internal.stripeInvoices.updateInvoiceStripeDataInternal, {
        invoiceId: args.invoiceId,
        stripeInvoiceId: stripeInvoice.id,
        stripeCustomerId: customerId,
        stripeInvoiceNumber: stripeInvoice.number || undefined,
        stripeInvoiceStatus: stripeInvoice.status || undefined,
        stripeHostedUrl: stripeInvoice.hosted_invoice_url || undefined,
        stripePdfUrl: stripeInvoice.invoice_pdf || undefined,
        stripeSyncStatus: "synced",
      });

      return {
        success: true,
        stripeInvoiceId: stripeInvoice.id,
        stripeHostedUrl: stripeInvoice.hosted_invoice_url || undefined,
        message: args.sendImmediately
          ? "Invoice synced to Stripe and sent to customer"
          : "Invoice synced to Stripe as draft",
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log error to invoice
      await ctx.runMutation(internal.stripeInvoices.updateInvoiceStripeDataInternal, {
        invoiceId: args.invoiceId,
        stripeSyncStatus: "sync_failed",
        stripeSyncError: errorMessage,
      });

      return {
        success: false,
        message: `Failed to sync to Stripe: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get or create Stripe customer for invoice recipient
 */
async function getOrCreateStripeCustomer(
  ctx: ActionCtx,
  stripe: Stripe,
  stripeAccountId: string,
  invoice: Doc<"objects">
): Promise<string> {
  const customProperties = invoice.customProperties as Record<string, unknown> | undefined || {};

  // Check if we already have a customer ID
  const existingCustomerId = customProperties.stripeCustomerId as string | undefined;
  if (existingCustomerId) {
    return existingCustomerId;
  }

  // Get billing details from invoice
  const billToEmail = customProperties.billToEmail as string;
  const billToName = customProperties.billToName as string;
  const billToAddress = customProperties.billToAddress as BillingAddress | undefined;

  // Create new customer
  const customer = await stripe.customers.create(
    {
      email: billToEmail,
      name: billToName,
      address: billToAddress ? {
        line1: billToAddress.line1,
        line2: billToAddress.line2,
        city: billToAddress.city,
        state: billToAddress.state,
        postal_code: billToAddress.postalCode,
        country: billToAddress.country || "US",
      } : undefined,
      metadata: {
        invoiceId: invoice._id,
        organizationId: invoice.organizationId,
      },
    },
    { stripeAccount: stripeAccountId }
  );

  return customer.id;
}

/**
 * Sync line items to Stripe invoice
 */
interface InvoiceLineItem {
  description: string;
  totalPriceInCents: number;
  quantity?: number;
  unitPriceInCents?: number;
}

async function syncLineItemsToStripe(
  stripe: Stripe,
  stripeAccountId: string,
  stripeInvoiceId: string,
  invoice: Doc<"objects">
): Promise<void> {
  const customProps = invoice.customProperties as Record<string, unknown> | undefined;
  const lineItems = (customProps?.lineItems as InvoiceLineItem[] | undefined) || [];

  for (const item of lineItems) {
    await stripe.invoiceItems.create(
      {
        customer: (customProps?.stripeCustomerId as string | undefined) || "",
        invoice: stripeInvoiceId,
        description: item.description,
        amount: item.totalPriceInCents, // Total price (Stripe expects total, not unit price)
        currency: (customProps?.currency as string | undefined) || "usd",
      },
      { stripeAccount: stripeAccountId }
    );
  }
}

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * GET INVOICE INTERNAL
 * Internal query to fetch invoice
 */
export const getInvoiceInternal = internalQuery({
  args: {
    invoiceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.invoiceId);
  },
});

/**
 * UPDATE INVOICE STRIPE DATA INTERNAL
 * Updates invoice with Stripe sync information
 */
export const updateInvoiceStripeDataInternal = internalMutation({
  args: {
    invoiceId: v.id("objects"),
    stripeInvoiceId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeInvoiceNumber: v.optional(v.string()),
    stripeInvoiceStatus: v.optional(v.string()),
    stripeHostedUrl: v.optional(v.string()),
    stripePdfUrl: v.optional(v.string()),
    stripeSyncStatus: v.optional(v.union(
      v.literal("not_synced"),
      v.literal("syncing"),
      v.literal("synced"),
      v.literal("sync_failed")
    )),
    stripeSyncError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const customProps = invoice.customProperties as Record<string, unknown> | undefined;
    const updates: Record<string, unknown> = {
      ...customProps,
    };

    // Update Stripe fields if provided
    if (args.stripeInvoiceId !== undefined) {
      updates.stripeInvoiceId = args.stripeInvoiceId;
    }
    if (args.stripeCustomerId !== undefined) {
      updates.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.stripeInvoiceNumber !== undefined) {
      updates.stripeInvoiceNumber = args.stripeInvoiceNumber;
    }
    if (args.stripeInvoiceStatus !== undefined) {
      updates.stripeInvoiceStatus = args.stripeInvoiceStatus;
    }
    if (args.stripeHostedUrl !== undefined) {
      updates.stripeHostedUrl = args.stripeHostedUrl;
    }
    if (args.stripePdfUrl !== undefined) {
      updates.stripePdfUrl = args.stripePdfUrl;
    }
    if (args.stripeSyncStatus !== undefined) {
      updates.stripeSyncStatus = args.stripeSyncStatus;
    }
    if (args.stripeSyncError !== undefined) {
      updates.stripeSyncError = args.stripeSyncError;
    }

    // Always update sync timestamp
    updates.lastStripeSyncAt = Date.now();

    await ctx.db.patch(args.invoiceId, {
      customProperties: updates,
      updatedAt: Date.now(),
    });
  },
});
