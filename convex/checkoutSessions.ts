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
import { action, query, internalQuery, mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getProviderByCode, getConnectedAccountId } from "./paymentProviders";

// =========================================
// MUTATIONS
// =========================================

/**
 * INTERNAL: Store payment intent in checkout session
 */
export const storePaymentIntent = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
    paymentIntentId: v.string(),
    clientSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.checkoutSessionId);
    if (!existing) throw new Error("Checkout session not found");

    await ctx.db.patch(args.checkoutSessionId, {
      customProperties: {
        ...(existing.customProperties || {}),
        paymentIntentId: args.paymentIntentId,
        clientSecret: args.clientSecret,
      },
    });
  },
});

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
 * CREATE PAYMENT INTENT FOR CHECKOUT SESSION
 *
 * Creates a Stripe PaymentIntent for an existing checkout_session.
 * Returns client_secret for use with Stripe Elements.
 * Provider-agnostic architecture - uses backend provider abstraction.
 */
export const createPaymentIntentForSession = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // 1. Get checkout session
    const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });

    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // 2. Get organization and connected Stripe account (need this early for reuse case too)
    const organizationId = session.organizationId;
    const org = await ctx.runQuery(internal.checkoutSessions.getOrganizationInternal, {
      organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const connectedAccountId = getConnectedAccountId(org, "stripe-connect");
    if (!connectedAccountId) {
      throw new Error("Organization has not connected Stripe");
    }

    // Check if payment intent already exists for this session
    const existingPaymentIntentId = session.customProperties?.paymentIntentId as string | undefined;
    if (existingPaymentIntentId) {
      console.log("✓ Reusing existing payment intent:", existingPaymentIntentId);
      // Return existing payment intent (client secret is stored)
      const existingClientSecret = session.customProperties?.clientSecret as string | undefined;
      if (existingClientSecret) {
        return {
          clientSecret: existingClientSecret,
          paymentIntentId: existingPaymentIntentId,
          connectedAccountId, // Include connected account ID for reuse case too
        };
      }
    }

    // 3. Extract payment details from session
    const customerEmail = (session.customProperties?.customerEmail as string) || "";
    const customerName = (session.customProperties?.customerName as string) || "";
    const totalAmount = (session.customProperties?.totalAmount as number) || 0;
    const currency = (session.customProperties?.currency as string) || "usd";

    // DEBUG: Log the amount we're trying to charge
    console.log("=== STRIPE PAYMENT INTENT DEBUG ===");
    console.log("Total Amount from session:", totalAmount);
    console.log("Currency:", currency);
    console.log("Customer:", customerEmail, customerName);

    // Validate minimum charge amount (Stripe requirements)
    // USD/EUR/etc: 50 cents minimum, JPY: 50 yen minimum
    const minimumAmounts: Record<string, number> = {
      usd: 50, eur: 50, gbp: 30, cad: 50, aud: 50, nzd: 50, chf: 50, hkd: 400,
      sgd: 50, sek: 300, dkk: 250, nok: 300, jpy: 50, mxn: 1000, pln: 200,
    };
    const minAmount = minimumAmounts[currency.toLowerCase()] || 50;

    if (totalAmount < minAmount) {
      throw new Error(
        `Amount (${totalAmount} ${currency.toUpperCase()}) is below Stripe's minimum charge amount of ${minAmount} ${currency.toUpperCase()}. ` +
        `Please ensure products have valid prices. See: https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts`
      );
    }

    const selectedProducts = (session.customProperties?.selectedProducts || []) as Array<{
      productId: Id<"objects">;
      quantity: number;
    }>;

    // Build description from products
    const productDescriptions: string[] = [];
    for (const sp of selectedProducts) {
      try {
        const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
          productId: sp.productId,
        });
        if (product?.name) {
          productDescriptions.push(`${product.name} x${sp.quantity}`);
        }
      } catch (e) {
        console.error("Failed to fetch product:", e);
      }
    }
    const description = productDescriptions.length > 0 ? productDescriptions.join(", ") : "Purchase";

    // 4. Create payment intent using provider
    const provider = getProviderByCode("stripe-connect");
    const result = await provider.createCheckoutSession({
      organizationId,
      productId: selectedProducts[0]?.productId || ("" as Id<"objects">),
      productName: description,
      priceInCents: totalAmount,
      currency,
      quantity: 1,
      customerEmail,
      customerName,
      connectedAccountId,
      successUrl: "",
      cancelUrl: "",
    });

    // Store payment intent details in checkout session for reuse (so we can reuse it if user goes back)
    if (result.clientSecret && result.providerSessionId) {
      await ctx.runMutation(internal.checkoutSessions.storePaymentIntent, {
        checkoutSessionId: args.checkoutSessionId,
        paymentIntentId: result.providerSessionId,
        clientSecret: result.clientSecret,
      });
      console.log("✓ Created and stored payment intent:", result.providerSessionId);
    }

    return {
      clientSecret: result.clientSecret,
      paymentIntentId: result.providerSessionId,
      connectedAccountId, // Return this so frontend can scope API calls to correct account
    };
  },
});

/**
 * COMPLETE CHECKOUT (NEW - PURCHASE ITEMS ARCHITECTURE)
 *
 * Product-agnostic checkout completion using purchase_items.
 * After successful payment, this action:
 * 1. Reads ALL data from checkout_session (single source of truth)
 * 2. Creates formResponse objects for audit trail
 * 3. Creates purchase_item objects (generic purchase records)
 * 4. Fulfills products based on type:
 *    - ticket → Creates event ticket for access control
 *    - subscription → Creates subscription with billing
 *    - download → Generates secure download link
 *    - shipment → Creates shipping order
 * 5. Creates CRM contact (auto-integration)
 * 6. Marks session as completed
 * 7. Returns purchase item IDs (generic!) and CRM contact ID
 */
export const completeCheckoutWithTickets = action({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    purchasedItemIds: string[]; // Changed from ticketIds to purchasedItemIds (generic!)
    crmContactId?: Id<"objects">;
    paymentId: string;
    amount: number;
    currency: string;
  }> => {
    // 1. Get checkout session (single source of truth!)
    const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });

    if (!session) {
      throw new Error("Checkout session not found");
    }

    if (session.type !== "checkout_session") {
      throw new Error("Invalid session type");
    }

    // Extract data from session with proper types
    const organizationId = session.organizationId;
    const customerEmail = (session.customProperties?.customerEmail as string) || "";
    const customerName = (session.customProperties?.customerName as string) || "";
    const customerPhone = session.customProperties?.customerPhone as string | undefined;

    const selectedProducts = (session.customProperties?.selectedProducts || []) as Array<{
      productId: Id<"objects">;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    }>;

    const formResponses = session.customProperties?.formResponses as Array<{
      productId: Id<"objects">;
      ticketNumber: number;
      formId: string;
      responses: Record<string, unknown>;
      addedCosts: number;
      submittedAt: number;
    }> | undefined;

    const totalAmount = (session.customProperties?.totalAmount as number) || 0;

    // 2. Get organization and connected account (needed for payment verification)
    const org = await ctx.runQuery(internal.checkoutSessions.getOrganizationInternal, {
      organizationId,
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const connectedAccountId = getConnectedAccountId(org, "stripe-connect");
    if (!connectedAccountId) {
      throw new Error("Organization has not connected Stripe");
    }

    // 3. Verify payment was successful (pass connected account ID for Stripe Connect)
    const provider = getProviderByCode("stripe-connect");
    const paymentResult = await provider.verifyCheckoutPayment(args.paymentIntentId, connectedAccountId);

    if (!paymentResult.success) {
      // Mark session as failed
      await ctx.runMutation(api.checkoutSessionOntology.failCheckoutSession, {
        sessionId: args.sessionId,
        checkoutSessionId: args.checkoutSessionId,
        errorMessage: "Payment verification failed",
      });
      throw new Error("Payment verification failed");
    }

    const createdPurchaseItems: string[] = [];

    // 4. Create form responses for audit trail (if forms were used)
    if (formResponses && formResponses.length > 0) {
      for (const formResp of formResponses) {
        await ctx.runMutation(api.formsOntology.createFormResponse, {
          sessionId: args.sessionId,
          organizationId,
          formId: formResp.formId as Id<"objects">,
          responses: formResp.responses,
          calculatedPricing: {
            addedCosts: formResp.addedCosts,
          },
          metadata: {
            checkoutSessionId: args.checkoutSessionId,
            ticketNumber: formResp.ticketNumber,
            submittedAt: formResp.submittedAt,
          },
        });
      }
    }

    // 4. Create purchase_items for each purchased product (PRODUCT-AGNOSTIC!)
    for (const selectedProduct of selectedProducts) {
      const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
        productId: selectedProduct.productId,
      });

      if (!product) {
        console.error(`Product ${selectedProduct.productId} not found, skipping purchase item creation`);
        continue;
      }

      // Determine fulfillment type from product
      const fulfillmentType = product.subtype || "ticket"; // Default to ticket for backward compatibility

      // Create purchase_items (one per quantity)
      // Use internal mutation since we're in a backend action (no user session)
      const purchaseItemsResult = await ctx.runMutation(internal.purchaseOntology.createPurchaseItemInternal, {
        organizationId,
        checkoutSessionId: args.checkoutSessionId,
        productId: selectedProduct.productId,
        quantity: selectedProduct.quantity,
        pricePerUnit: selectedProduct.pricePerUnit,
        totalPrice: selectedProduct.totalPrice,
        buyerEmail: customerEmail,
        buyerName: customerName,
        buyerPhone: customerPhone,
        fulfillmentType,
        registrationData: undefined, // Will be set below if forms exist
        userId: undefined, // Guest checkout - no user account required
      });

      createdPurchaseItems.push(...purchaseItemsResult.purchaseItemIds);

      // 5. PRODUCT-SPECIFIC FULFILLMENT
      // For each purchase_item, create fulfillment object based on product type
      for (let i = 0; i < purchaseItemsResult.purchaseItemIds.length; i++) {
        const purchaseItemId = purchaseItemsResult.purchaseItemIds[i];
        const itemNumber = i + 1;

        // Find corresponding form response for this item
        const formResponse = formResponses?.find(
          (fr) =>
            fr.productId === selectedProduct.productId &&
            fr.ticketNumber === itemNumber
        );

        // Extract registration data
        let registrationData: Record<string, unknown> | undefined;
        let holderEmail: string;
        let holderName: string;

        if (formResponse) {
          registrationData = formResponse.responses as Record<string, unknown>;
          holderEmail = (formResponse.responses.email as string) || customerEmail;
          holderName =
            (formResponse.responses.name as string) ||
            (formResponse.responses.fullName as string) ||
            customerName;
        } else {
          registrationData = undefined;
          holderEmail = customerEmail;
          holderName = customerName;
        }

        // FULFILLMENT DISPATCH - Based on product type
        if (fulfillmentType === "ticket") {
          // Create event ticket for access control
          const eventId = product.customProperties?.eventId as Id<"objects"> | undefined;

          // Use internal mutation since we're in a backend action (no user session)
          const ticketId = await ctx.runMutation(internal.ticketOntology.createTicketInternal, {
            organizationId,
            productId: selectedProduct.productId,
            eventId,
            holderName,
            holderEmail,
            userId: undefined, // Guest checkout - no user account required
            customProperties: {
              purchaseDate: Date.now(),
              paymentIntentId: args.paymentIntentId,
              pricePaid: selectedProduct.pricePerUnit,
              ticketNumber: itemNumber,
              totalTicketsInOrder: selectedProduct.quantity,
              checkoutSessionId: args.checkoutSessionId,
              purchaseItemId, // Link back to purchase_item
              registrationData,
            },
          });

          // Update purchase_item with fulfillment info
          // Use internal mutation since we're in a backend action
          await ctx.runMutation(internal.purchaseOntology.updateFulfillmentStatusInternal, {
            purchaseItemId: purchaseItemId as Id<"objects">,
            fulfillmentStatus: "fulfilled",
            fulfillmentData: {
              ticketId,
              eventId,
            },
            userId: undefined, // Guest checkout - no user account required
          });
        }
        // TODO: Add more fulfillment types here:
        // else if (fulfillmentType === "subscription") { ... }
        // else if (fulfillmentType === "download") { ... }
        // else if (fulfillmentType === "shipment") { ... }
      }
    }

    // 6. AUTO-CREATE CRM CONTACT (NEW!)
    let crmContactId: Id<"objects"> | undefined;
    try {
      const contactResult = await ctx.runMutation(internal.crmIntegrations.autoCreateContactFromCheckoutInternal, {
        checkoutSessionId: args.checkoutSessionId,
      });
      crmContactId = contactResult.contactId;
    } catch (error) {
      console.error("Failed to create CRM contact:", error);
      // Don't fail the whole checkout if CRM creation fails
    }

    // 7. Mark session as completed
    // Use internal mutation since we're in a backend action
    await ctx.runMutation(internal.checkoutSessionOntology.completeCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
      paymentIntentId: args.paymentIntentId,
      purchasedItemIds: createdPurchaseItems, // Store purchase_item IDs (generic!)
      crmContactId,
      userId: undefined, // Guest checkout - no user account required
    });

    // 8. SEND ORDER CONFIRMATION EMAIL (non-blocking)
    // Sends ONE email with all ticket PDFs and invoice PDF attached
    try {
      await ctx.runAction(internal.ticketGeneration.sendOrderConfirmationEmail, {
        checkoutSessionId: args.checkoutSessionId,
        recipientEmail: customerEmail,
        recipientName: customerName,
      });
    } catch (emailError) {
      // Don't fail checkout if emails fail - log and continue
      console.error("Email sending failed (non-critical):", emailError);
    }

    return {
      success: true,
      purchasedItemIds: createdPurchaseItems, // Generic! Works for any product type
      crmContactId,
      paymentId: paymentResult.paymentId,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
    };
  },
});
