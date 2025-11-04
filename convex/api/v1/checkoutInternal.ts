/**
 * API V1: CHECKOUT INTERNAL HANDLERS
 *
 * Internal mutations/queries/actions for checkout API endpoints.
 * These handle the actual business logic for external payment processing.
 */

import { v } from "convex/values";
import { internalQuery, internalAction, internalMutation } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getProviderByCode, getConnectedAccountId } from "../../paymentProviders";

/**
 * GET PAYMENT CONFIG (Internal Query)
 *
 * Retrieves organization's payment provider configuration.
 * Returns ONLY public information safe to expose via API.
 */
export const getPaymentConfig = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    // Get organization
    const org = await ctx.db.get(organizationId);
    if (!org) {
      return null;
    }

    // Get connected Stripe account (primary provider)
    const stripeAccountId = getConnectedAccountId(org, "stripe-connect");

    if (stripeAccountId) {
      // Return Stripe configuration
      // Note: We return the PUBLISHABLE key here, which is safe to expose
      // The secret key is NEVER exposed via API
      return {
        provider: "stripe" as const,
        providerName: "Stripe",
        accountId: stripeAccountId,
        // In production, you'd store the publishable key in organization config
        // For now, we'll use the platform's publishable key
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
        supportedCurrencies: ["usd", "eur", "gbp", "cad", "aud"],
      };
    }

    // Check for invoice provider (always available)
    return {
      provider: "invoice" as const,
      providerName: "Invoice (Pay Later)",
      accountId: "invoice-system",
      supportedCurrencies: ["usd", "eur", "gbp"],
    };
  },
});

/**
 * CREATE CHECKOUT SESSION (Internal Action)
 *
 * Creates a payment session using the organization's payment provider.
 * Returns clientSecret for client-side payment initialization.
 */
export const createCheckoutSessionInternal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("objects"),
    quantity: v.number(),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{
    sessionId: Id<"objects">;
    clientSecret: string | undefined;
    paymentIntentId: string;
    amount: number;
    currency: string;
    expiresAt: number;
  }> => {
    // 1. Get organization
    const org = await ctx.runQuery(
      internal.checkoutSessions.getOrganizationInternal,
      { organizationId: args.organizationId }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // 2. Get product
    const product = await ctx.runQuery(
      internal.productOntology.getProductInternal,
      { productId: args.productId }
    ) as { name: string; customProperties?: Record<string, unknown> } | null;

    if (!product) {
      throw new Error("Product not found");
    }

    // Get Platform Org's currency from locale settings
    const localeSettings = await ctx.runQuery(internal.checkoutSessions.getOrgLocaleSettings, {
      organizationId: args.organizationId
    });

    // Normalize currency to lowercase for Stripe (accepts both but prefers lowercase)
    const orgCurrency = localeSettings?.customProperties?.currency
      ? String(localeSettings.customProperties.currency).toLowerCase()
      : undefined;

    const priceInCents: number =
      (product.customProperties?.priceInCents as number) || 0;
    const currency: string = orgCurrency
      || (product.customProperties?.currency as string)?.toLowerCase()
      || "eur";

    // 3. Get connected account ID
    const connectedAccountId = getConnectedAccountId(org, "stripe-connect");

    if (!connectedAccountId) {
      throw new Error(
        "Organization has not connected a payment provider. Please connect Stripe first."
      );
    }

    // 4. Calculate total amount
    const totalAmount: number = priceInCents * args.quantity;

    // 5. Create checkout session using payment provider
    const provider = getProviderByCode("stripe-connect");

    const session = await provider.createCheckoutSession({
      organizationId: args.organizationId,
      productId: args.productId,
      productName: product.name,
      priceInCents,
      currency,
      quantity: args.quantity,
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      connectedAccountId,
      successUrl: "", // Not needed for API flow
      cancelUrl: "", // Not needed for API flow
      metadata: args.metadata,
    });

    console.log(
      `[API] Created checkout session ${session.sessionId} for product ${args.productId}`
    );

    // 6. Store session in database for later verification
    // This creates a checkout_session object to track the payment
    const checkoutSessionId: Id<"objects"> = await ctx.runMutation(
      internal.api.v1.checkoutInternal.storeCheckoutSessionInternal,
      {
        organizationId: args.organizationId,
        productId: args.productId,
        quantity: args.quantity,
        priceInCents,
        currency,
        totalAmount,
        customerEmail: args.customerEmail,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        providerSessionId: session.providerSessionId,
        clientSecret: session.clientSecret || "",
        expiresAt: session.expiresAt,
        metadata: args.metadata,
      }
    );

    // 7. Return session details for client
    return {
      sessionId: checkoutSessionId,
      clientSecret: session.clientSecret,
      paymentIntentId: session.providerSessionId,
      amount: totalAmount,
      currency,
      expiresAt: session.expiresAt,
    };
  },
});

/**
 * STORE CHECKOUT SESSION (Internal Mutation)
 *
 * Stores checkout session in database for tracking and verification.
 */
export const storeCheckoutSessionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("objects"),
    quantity: v.number(),
    priceInCents: v.number(),
    currency: v.string(),
    totalAmount: v.number(),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    providerSessionId: v.string(),
    clientSecret: v.string(),
    expiresAt: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // Create checkout_session object
    const sessionId: Id<"objects"> = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_session",
      name: `Checkout Session - ${args.customerEmail || "Guest"}`,
      description: `Payment for ${args.quantity}x ${args.productId}`,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "system" as Id<"users">, // API-created session (no user)
      customProperties: {
        // Product info
        selectedProducts: [
          {
            productId: args.productId,
            quantity: args.quantity,
            pricePerUnit: args.priceInCents,
            totalPrice: args.totalAmount,
          },
        ],

        // Customer info
        customerEmail: args.customerEmail,
        customerName: args.customerName,
        customerPhone: args.customerPhone,

        // Payment info
        totalAmount: args.totalAmount,
        currency: args.currency,
        paymentIntentId: args.providerSessionId,
        clientSecret: args.clientSecret,
        expiresAt: args.expiresAt,

        // Metadata
        source: "api",
        metadata: args.metadata,
      },
    });

    return sessionId;
  },
});

/**
 * CONFIRM PAYMENT (Internal Action)
 *
 * Verifies payment completion and fulfills the order.
 * Creates tickets, sends emails, generates invoices, etc.
 */
export const confirmPaymentInternal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.string(),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    transactionId: string;
    purchaseItemIds: string[]; // Generic - works for any product type
    crmContactId?: Id<"objects">;
    amount: number;
    currency: string;
    downloadUrls: Record<string, string>; // Dynamic based on product types
  }> => {
    // 1. Get checkout session
    const checkoutSessionId = args.sessionId as Id<"objects">;
    const session = await ctx.runQuery(
      internal.checkoutSessionOntology.getCheckoutSessionInternal,
      { checkoutSessionId }
    );

    if (!session) {
      throw new Error("Checkout session not found");
    }

    if (session.type !== "checkout_session") {
      throw new Error("Invalid session type");
    }

    // 2. Verify payment using existing checkout completion logic
    // This reuses the same logic as the UI checkout flow
    const result = await ctx.runAction(
      api.checkoutSessions.completeCheckoutAndFulfill,
      {
        sessionId: args.sessionId,
        checkoutSessionId,
        paymentIntentId: args.paymentIntentId,
      }
    ) as {
      success: boolean;
      paymentId: string;
      purchasedItemIds: string[];
      crmContactId?: Id<"objects">;
      amount: number;
      currency: string;
    };

    // 3. Build response with download URLs
    const baseUrl = process.env.CONVEX_SITE_URL || "https://l4yercak3.com";

    // Get all purchase items to determine download URLs
    const purchaseItems = await ctx.runQuery(
      api.purchaseOntology.getPurchaseItemsByCheckout,
      {
        sessionId: args.sessionId,
        checkoutSessionId,
      }
    ) as Array<{ customProperties?: Record<string, unknown> }> | null;

    // Build download URLs based on product types
    const downloads: Record<string, string> = {};

    // Check if any items are tickets (for backwards compatibility with old API clients)
    const hasTickets = purchaseItems?.some((item) =>
      item.customProperties?.fulfillmentType === "ticket"
    );

    if (hasTickets) {
      // Legacy API route for ticket downloads
      downloads.tickets = `${baseUrl}/api/v1/tickets/${checkoutSessionId}/download`;
    }

    // Add invoice download if B2B transaction
    if (result.crmContactId) {
      downloads.invoice = `${baseUrl}/api/v1/invoices/${checkoutSessionId}/download`;
    }

    // Generic purchase items download (works for all product types - recommended)
    downloads.purchaseItems = `${baseUrl}/api/v1/purchase-items/${checkoutSessionId}/download`;

    return {
      success: result.success,
      transactionId: result.paymentId,
      purchaseItemIds: result.purchasedItemIds, // Generic! Works for ANY product type (tickets, subscriptions, downloads, etc.)
      crmContactId: result.crmContactId,
      amount: result.amount,
      currency: result.currency,
      downloadUrls: downloads,
    };
  },
});
