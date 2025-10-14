/**
 * CHECKOUT SESSIONS (REFACTORED)
 *
 * This is the refactored version using the payment provider abstraction.
 * Once tested, this will replace checkoutSessions.ts
 *
 * Key Changes:
 * - Uses StripeConnectProvider instead of direct Stripe API calls
 * - Provider-agnostic checkout session creation
 * - Cleaner error handling
 */

import { v } from "convex/values";
import { action, query, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getProviderByCode, getConnectedAccountId } from "./paymentProviders";

// =========================================
// QUERIES
// =========================================

/**
 * GET ORGANIZATION BY SLUG (Public Query)
 *
 * Used by public checkout pages to find the organization
 */
export const getOrganizationBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!org) {
      return null;
    }

    // Return only public info
    return {
      _id: org._id,
      name: org.name,
      slug: org.slug,
      businessName: org.businessName,
      hasPaymentProvider: !!getConnectedAccountId(org, "stripe-connect"),
    };
  },
});

/**
 * GET ORGANIZATION FOR CHECKOUT (Query)
 *
 * Query to fetch org data for checkout session creation
 */
export const getOrganizationForCheckout = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);

    if (!org) {
      return null;
    }

    return {
      _id: org._id,
      name: org.name,
      hasPaymentProvider: !!getConnectedAccountId(org, "stripe-connect"),
    };
  },
});

/**
 * GET CHECKOUT PRODUCT BY SLUG (Public Query)
 *
 * Used by public checkout pages to display product info
 */
export const getPublicCheckoutProduct = query({
  args: {
    organizationId: v.id("organizations"),
    productSlug: v.string(),
  },
  handler: async (ctx, { organizationId, productSlug }) => {
    const products = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "checkout_product")
      )
      .collect();

    const product = products.find(
      (p) =>
        p.customProperties?.publicSlug === productSlug &&
        p.status === "published"
    );

    if (!product) {
      return null;
    }

    return {
      _id: product._id,
      name: product.name,
      description: product.description,
      priceInCents: product.customProperties?.priceInCents || 0,
      currency: product.customProperties?.currency || "usd",
      previewImageUrl: product.customProperties?.previewImageUrl,
      metaTitle: product.customProperties?.metaTitle,
      metaDescription: product.customProperties?.metaDescription,
    };
  },
});

/**
 * GET ORGANIZATION INTERNAL (Helper for actions)
 */
export const getOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db.get(organizationId);
  },
});

// =========================================
// ACTIONS (Using Provider)
// =========================================

/**
 * CREATE STRIPE CHECKOUT SESSION (REFACTORED)
 *
 * Creates a checkout session using the payment provider.
 * Returns the client secret for Stripe Elements.
 */
export const createStripeCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("objects"),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get organization
    const org = await ctx.runQuery(
      internal.checkoutSessions.getOrganizationInternal,
      {
        organizationId: args.organizationId,
      }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get connected account ID (supports both legacy and new format)
    const connectedAccountId = getConnectedAccountId(org, "stripe-connect");

    if (!connectedAccountId) {
      throw new Error(
        "Organization has not connected a payment provider. Please connect Stripe first."
      );
    }

    // Get product details
    const products = await ctx.runQuery(api.checkoutOntology.getCheckoutProducts, {
      organizationId: args.organizationId,
    });

    const targetProduct = products.find((p) => p._id === args.productId);

    if (!targetProduct) {
      throw new Error("Product not found");
    }

    const priceInCents = targetProduct.customProperties?.priceInCents || 0;
    const currency = targetProduct.customProperties?.currency || "usd";

    // Get payment provider
    const provider = getProviderByCode("stripe-connect");

    // Create checkout session using provider
    const session = await provider.createCheckoutSession({
      organizationId: args.organizationId,
      productId: args.productId,
      productName: targetProduct.name,
      priceInCents,
      currency,
      quantity: 1,
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      connectedAccountId,
      successUrl: "", // These would come from frontend
      cancelUrl: "",
    });

    console.log(
      `Created checkout session ${session.sessionId} for product ${args.productId}`
    );

    // TODO: Store session in database for tracking
    // await ctx.runMutation(internal.checkoutSessions.storeCheckoutSession, {
    //   sessionId: session.sessionId,
    //   organizationId: args.organizationId,
    //   productId: args.productId,
    //   ...
    // });

    return {
      clientSecret: session.clientSecret,
      paymentIntentId: session.providerSessionId,
      sessionId: session.sessionId,
    };
  },
});

/**
 * VERIFY CHECKOUT PAYMENT
 *
 * Verifies that a payment was completed successfully.
 * Used after customer completes payment on frontend.
 */
export const verifyCheckoutPayment = action({
  args: {
    paymentIntentId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get payment provider
    const provider = getProviderByCode("stripe-connect");

    // Verify payment using provider
    const result = await provider.verifyCheckoutPayment(args.paymentIntentId);

    console.log(
      `Payment verification: ${args.paymentIntentId} - ${result.success ? "SUCCESS" : "FAILED"}`
    );

    if (result.success) {
      // TODO: Store successful payment in database
      // await ctx.runMutation(internal.checkoutSessions.recordSuccessfulPayment, {
      //   paymentId: result.paymentId,
      //   organizationId: args.organizationId,
      //   amount: result.amount,
      //   currency: result.currency,
      //   ...
      // });
    }

    return result;
  },
});

/**
 * CREATE CHECKOUT SESSION (Generic, Provider-Agnostic)
 *
 * This is a more generic version that could work with any provider.
 * Future enhancement: Allow specifying provider code.
 */
export const createCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("objects"),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    providerCode: v.optional(v.string()), // Future: allow provider selection
  },
  handler: async (ctx, args) => {
    // Default to Stripe for now
    const providerCode = args.providerCode || "stripe-connect";

    // Get organization
    const org = await ctx.runQuery(
      internal.checkoutSessions.getOrganizationInternal,
      {
        organizationId: args.organizationId,
      }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get connected account ID for the provider
    const connectedAccountId = getConnectedAccountId(org, providerCode);

    if (!connectedAccountId) {
      throw new Error(
        `Organization has not connected ${providerCode}. Please connect a payment provider first.`
      );
    }

    // Get product details
    const products = await ctx.runQuery(api.checkoutOntology.getCheckoutProducts, {
      organizationId: args.organizationId,
    });

    const targetProduct = products.find((p) => p._id === args.productId);

    if (!targetProduct) {
      throw new Error("Product not found");
    }

    const priceInCents = targetProduct.customProperties?.priceInCents || 0;
    const currency = targetProduct.customProperties?.currency || "usd";

    // Get payment provider
    const provider = getProviderByCode(providerCode);

    // Create checkout session using provider
    const session = await provider.createCheckoutSession({
      organizationId: args.organizationId,
      productId: args.productId,
      productName: targetProduct.name,
      priceInCents,
      currency,
      quantity: 1,
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      connectedAccountId,
      successUrl: "",
      cancelUrl: "",
    });

    return {
      providerCode: provider.providerCode,
      providerName: provider.providerName,
      sessionId: session.sessionId,
      clientSecret: session.clientSecret,
      checkoutUrl: session.checkoutUrl, // For redirect-based flows (PayPal, etc.)
      paymentIntentId: session.providerSessionId,
    };
  },
});
