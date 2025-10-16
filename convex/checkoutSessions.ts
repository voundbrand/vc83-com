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
import type { Id } from "./_generated/dataModel";
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
    // TODO: Update to use checkout instances
    // const products = await ctx.runQuery(api.checkoutOntology.getCheckoutProducts, {
    //   organizationId: args.organizationId,
    // });

    // For now, get product directly (using internal query for actions)
    const targetProduct = await ctx.runQuery(internal.productOntology.getProductInternal, {
      productId: args.productId
    });

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
    // TODO: Update to use checkout instances
    // const products = await ctx.runQuery(api.checkoutOntology.getCheckoutProducts, {
    //   organizationId: args.organizationId,
    // });

    // For now, get product directly (using internal query for actions)
    const targetProduct = await ctx.runQuery(internal.productOntology.getProductInternal, {
      productId: args.productId
    });

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

/**
 * COMPLETE CHECKOUT WITH TICKETS AND FORM RESPONSES
 *
 * After successful payment, this mutation:
 * 1. Creates formResponse objects for audit trail
 * 2. Creates ticket objects with embedded registration data
 * 3. Links tickets to products and events (if applicable)
 * 4. Returns ticket IDs for confirmation display
 */
export const completeCheckoutWithTickets = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    paymentIntentId: v.string(),
    totalAmount: v.number(), // in cents
    selectedProducts: v.array(
      v.object({
        productId: v.id("objects"),
        quantity: v.number(),
        price: v.number(),
      })
    ),
    // Either customerInfo OR formResponses (if form was used)
    customerInfo: v.optional(
      v.object({
        email: v.string(),
        name: v.string(),
        phone: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    // Form responses for products with registration forms
    formResponses: v.optional(
      v.array(
        v.object({
          productId: v.id("objects"),
          ticketNumber: v.number(),
          formId: v.string(),
          responses: v.any(),
          addedCosts: v.number(),
          submittedAt: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // 1. Verify payment was successful
    const provider = getProviderByCode("stripe-connect");
    const paymentResult = await provider.verifyCheckoutPayment(args.paymentIntentId);

    if (!paymentResult.success) {
      throw new Error("Payment verification failed");
    }

    const createdTickets: string[] = [];

    // 2. Create form responses for audit trail (if forms were used)
    if (args.formResponses && args.formResponses.length > 0) {
      for (const formResp of args.formResponses) {
        await ctx.runMutation(api.formsOntology.createFormResponse, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          formId: formResp.formId as Id<"objects">,
          responses: formResp.responses,
          calculatedPricing: {
            addedCosts: formResp.addedCosts,
          },
          metadata: {
            checkoutSessionId: args.paymentIntentId,
            ticketNumber: formResp.ticketNumber,
            submittedAt: formResp.submittedAt,
          },
        });
      }
    }

    // 3. Create tickets for each purchased product
    for (const selectedProduct of args.selectedProducts) {
      const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
        productId: selectedProduct.productId,
      });

      if (!product) {
        console.error(`Product ${selectedProduct.productId} not found, skipping ticket creation`);
        continue;
      }

      // Get event ID if product is linked to an event
      const eventId = product.customProperties?.eventId as Id<"objects"> | undefined;

      // Create one ticket per quantity
      for (let i = 0; i < selectedProduct.quantity; i++) {
        const ticketIndex = i + 1;

        // Find corresponding form response for this ticket
        const formResponse = args.formResponses?.find(
          (fr) =>
            fr.productId === selectedProduct.productId &&
            fr.ticketNumber === ticketIndex
        );

        // Extract holder info from form response OR customerInfo
        let holderEmail: string;
        let holderName: string;
        let registrationData: Record<string, unknown> | undefined;

        if (formResponse) {
          // Use form response data
          holderEmail = (formResponse.responses.email as string) || "";
          holderName =
            (formResponse.responses.name as string) ||
            (formResponse.responses.fullName as string) ||
            "";
          registrationData = formResponse.responses as Record<string, unknown>;
        } else if (args.customerInfo) {
          // Use simple customer info
          holderEmail = args.customerInfo.email;
          holderName = args.customerInfo.name;
          registrationData = undefined;
        } else {
          // Fallback
          holderEmail = "unknown@example.com";
          holderName = "Unknown";
          registrationData = undefined;
        }

        // Create ticket with embedded registration data
        const ticketId = await ctx.runMutation(api.ticketOntology.createTicket, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          productId: selectedProduct.productId,
          eventId,
          holderName,
          holderEmail,
          customProperties: {
            purchaseDate: Date.now(),
            paymentIntentId: args.paymentIntentId,
            pricePaid: selectedProduct.price,
            ticketNumber: ticketIndex,
            totalTicketsInOrder: selectedProduct.quantity,
            // EMBED registration data for fast operational queries
            registrationData,
          },
        });

        createdTickets.push(ticketId);
      }
    }

    return {
      success: true,
      ticketIds: createdTickets,
      paymentId: paymentResult.paymentId,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
    };
  },
});
