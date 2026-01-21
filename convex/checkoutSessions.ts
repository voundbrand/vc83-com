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
import { action, query, internalQuery, internalMutation } from "./_generated/server";
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
      currency: product.customProperties?.currency || "eur",
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

/**
 * INTERNAL: Get organization's locale settings for currency
 */
export const getOrgLocaleSettings = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "locale"))
      .first();
  },
});

/**
 * PUBLIC: Get organization locale settings (currency, locale, etc.)
 * Used by checkout to format prices correctly
 */
export const getOrgLocaleSettingsPublic = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "locale"))
      .first();

    if (!settings) {
      return null;
    }

    // Return only the currency and locale (don't expose other settings)
    return {
      currency: settings.customProperties?.currency
        ? String(settings.customProperties.currency).toLowerCase()
        : "eur",
      locale: settings.customProperties?.locale
        ? String(settings.customProperties.locale)
        : "de-DE",
    };
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

    // Validate product availability
    const availability = await ctx.runQuery(
      internal.productOntology.checkProductAvailability,
      { productId: args.productId }
    );

    if (!availability.available) {
      throw new Error(
        `Product is not available for purchase: ${availability.reason || "Product is not available"}`
      );
    }

    // Get Platform Org's currency from locale settings
    const localeSettings = await ctx.runQuery(internal.checkoutSessions.getOrgLocaleSettings, {
      organizationId: args.organizationId
    });

    // Normalize currency to lowercase for Stripe (accepts both but prefers lowercase)
    const orgCurrency = localeSettings?.customProperties?.currency
      ? String(localeSettings.customProperties.currency).toLowerCase()
      : undefined;

    const priceInCents = targetProduct.customProperties?.priceInCents || 0;
    const currency = orgCurrency
      || (targetProduct.customProperties?.currency as string)?.toLowerCase()
      || "eur";

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

    // Validate product availability
    const availability = await ctx.runQuery(
      internal.productOntology.checkProductAvailability,
      { productId: args.productId }
    );

    if (!availability.available) {
      throw new Error(
        `Product is not available for purchase: ${availability.reason || "Product is not available"}`
      );
    }

    // Get Platform Org's currency from locale settings
    const localeSettings = await ctx.runQuery(internal.checkoutSessions.getOrgLocaleSettings, {
      organizationId: args.organizationId
    });

    // Normalize currency to lowercase for Stripe (accepts both but prefers lowercase)
    const orgCurrency = localeSettings?.customProperties?.currency
      ? String(localeSettings.customProperties.currency).toLowerCase()
      : undefined;

    const priceInCents = targetProduct.customProperties?.priceInCents || 0;
    const currency = orgCurrency
      || (targetProduct.customProperties?.currency as string)?.toLowerCase()
      || "eur";

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
    const currency = (session.customProperties?.currency as string) || "eur";

    // B2B fields
    const transactionType = (session.customProperties?.transactionType as "B2C" | "B2B" | undefined) || "B2C";
    const companyName = session.customProperties?.companyName as string | undefined;
    const vatNumber = session.customProperties?.vatNumber as string | undefined;

    // Billing address fields (for B2B transactions)
    const billingLine1 = session.customProperties?.billingLine1 as string | undefined;
    const billingLine2 = session.customProperties?.billingLine2 as string | undefined;
    const billingCity = session.customProperties?.billingCity as string | undefined;
    const billingState = session.customProperties?.billingState as string | undefined;
    const billingPostalCode = session.customProperties?.billingPostalCode as string | undefined;
    const billingCountry = session.customProperties?.billingCountry as string | undefined;

    // Construct BillingAddress object (only if we have required fields)
    const billingAddress = billingLine1 && billingCity && billingPostalCode && billingCountry
      ? {
          line1: billingLine1,
          line2: billingLine2,
          city: billingCity,
          state: billingState,
          postalCode: billingPostalCode,
          country: billingCountry,
        }
      : undefined;

    // DEBUG: Log the amount we're trying to charge
    console.log("=== STRIPE PAYMENT INTENT DEBUG ===");
    console.log("Total Amount from session:", totalAmount);
    console.log("Currency:", currency);
    console.log("Customer:", customerEmail, customerName);
    console.log("Billing Address:", billingAddress ? "✓ Present" : "✗ Not provided");

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
      billingAddress, // ✅ Pass billing address to Stripe
      connectedAccountId,
      successUrl: "",
      cancelUrl: "",
      metadata: {
        // B2B metadata for Stripe PaymentIntent
        transactionType,
        companyName: companyName || "",
        vatNumber: vatNumber || "",
        checkoutSessionId: args.checkoutSessionId,
      },
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
 * COMPLETE CHECKOUT AND FULFILL (PRODUCT-AGNOSTIC)
 *
 * Product-agnostic checkout completion using purchase_items architecture.
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
 *
 * Works for ANY product type - not just tickets!
 */
export const completeCheckoutAndFulfill = action({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    paymentIntentId: v.string(),
    paymentMethod: v.optional(v.union(v.literal("stripe"), v.literal("invoice"), v.literal("free"))),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    purchasedItemIds: string[]; // Changed from ticketIds to purchasedItemIds (generic!)
    crmContactId?: Id<"objects">;
    paymentId: string;
    amount: number;
    currency: string;
    isGuestRegistration: boolean;
    frontendUserId?: Id<"objects">;
    invoiceType: 'employer' | 'manual_b2b' | 'manual_b2c' | 'receipt' | 'none';
  }> => {
    console.log("🛍️ [completeCheckoutAndFulfill] Starting checkout fulfillment...");
    console.log("🛍️ [completeCheckoutAndFulfill] Args:", {
      sessionId: args.sessionId,
      checkoutSessionId: args.checkoutSessionId,
      paymentIntentId: args.paymentIntentId,
      paymentMethod: args.paymentMethod,
    });

    // STEP 0: Fetch checkout session
    console.log("📋 [STEP 0] Fetching checkout session...");

    // 1. Get checkout session (single source of truth!)
    const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });

    if (!session) {
      console.error("❌ [STEP 0] Checkout session not found!");
      throw new Error("Checkout session not found");
    }

    if (session.type !== "checkout_session") {
      console.error("❌ [STEP 0] Invalid session type:", session.type);
      throw new Error("Invalid session type");
    }

    console.log("✅ [STEP 0] Checkout session found:", {
      sessionId: session._id,
      type: session.type,
      hasCustomProperties: !!session.customProperties,
      customPropertyKeys: session.customProperties ? Object.keys(session.customProperties) : [],
    });

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

    console.log("🔍 [completeCheckoutAndFulfill] Extracted data:", {
      organizationId,
      customerEmail,
      customerName,
      selectedProductsCount: selectedProducts.length,
      selectedProducts: selectedProducts.map(sp => ({
        productId: sp.productId,
        quantity: sp.quantity,
        pricePerUnit: sp.pricePerUnit,
      })),
    });

    const formResponses = session.customProperties?.formResponses as Array<{
      productId: Id<"objects">;
      ticketNumber: number;
      formId?: string; // Optional - only set when ticket has a custom form
      responses: Record<string, unknown>;
      addedCosts: number;
      submittedAt: number;
    }> | undefined;

    // ✅ CRITICAL: Extract behavior context from session
    const behaviorContext = session.customProperties?.behaviorContext as {
      invoiceMapping?: {
        shouldInvoice: boolean;
        employerOrgId?: string;
        organizationName?: string;
        paymentTerms?: string;
        billingAddress?: {
          line1: string;
          line2?: string;
          city: string;
          state?: string;
          postalCode: string;
          country: string;
        };
      };
      employerDetection?: {
        employerBilling?: {
          organizationName: string;
          defaultPaymentTerms?: "net30" | "net60" | "net90";
        };
      };
      taxCalculation?: {
        taxAmount: number;
        taxRate: number;
        taxDescription: string;
      };
      metadata?: {
        isEmployerBilling?: boolean;
        crmOrganizationId?: string;
      };
      allResults?: Array<{ type: string; success: boolean; data: unknown }>;
    } | undefined;

    console.log("🧠 [completeCheckoutAndFulfill] Behavior context from session:", {
      hasBehaviorContext: !!behaviorContext,
      invoiceMapping: behaviorContext?.invoiceMapping,
      employerDetection: behaviorContext?.employerDetection,
      behaviorTypes: behaviorContext?.allResults?.map(r => r.type),
      // 🔍 DEBUG: Log full behavior context to find crmOrganizationId
      fullBehaviorContext: JSON.stringify(behaviorContext, null, 2),
    });

    // STEP 1: Get organization
    console.log("📋 [STEP 1] Fetching organization...");
    const org = await ctx.runQuery(internal.checkoutSessions.getOrganizationInternal, {
      organizationId,
    });

    if (!org) {
      console.error("❌ [STEP 1] Organization not found:", organizationId);
      throw new Error("Organization not found");
    }
    console.log("✅ [STEP 1] Organization found:", org.name);

    let paymentResult: { success: boolean; paymentId: string; amount: number; currency: string };

    // STEP 2: Determine payment method
    console.log("📋 [STEP 2] Determining payment method...");
    const paymentMethod = args.paymentMethod || (
      args.paymentIntentId === 'free' || args.paymentIntentId.startsWith('free_') ? 'free' :
      args.paymentIntentId.startsWith('inv_') || args.paymentIntentId === 'invoice' ? 'invoice' :
      'stripe'
    );

    console.log("✅ [STEP 2] Payment method determined:", paymentMethod, "PaymentIntentId:", args.paymentIntentId);

    // 4. Verify payment based on payment method
    if (paymentMethod === 'free') {
      // FREE PAYMENT: No payment required (free events)
      console.log("✅ [completeCheckoutAndFulfill] Free registration - no payment verification needed");
      paymentResult = {
        success: true,
        paymentId: args.paymentIntentId,
        amount: 0,
        currency: session.customProperties?.currency as string || 'EUR',
      };

    } else if (paymentMethod === 'invoice') {
      // INVOICE PAYMENT: Pay later (B2B or B2C) - no Stripe connection required
      console.log("✅ [completeCheckoutAndFulfill] Invoice payment - no immediate payment verification");
      paymentResult = {
        success: true,
        paymentId: args.paymentIntentId,
        amount: session.customProperties?.totalAmount as number || 0,
        currency: session.customProperties?.currency as string || 'EUR',
      };

    } else {
      // STRIPE PAYMENT: Verify payment with Stripe - requires Stripe connection
      const connectedAccountId = getConnectedAccountId(org, "stripe-connect");
      if (!connectedAccountId) {
        throw new Error("Organization has not connected Stripe");
      }

      console.log("💳 [completeCheckoutAndFulfill] Stripe payment - verifying with provider");
      const provider = getProviderByCode("stripe-connect");
      paymentResult = await provider.verifyCheckoutPayment(args.paymentIntentId, connectedAccountId);

      if (!paymentResult.success) {
        // Mark session as failed
        await ctx.runMutation(api.checkoutSessionOntology.failCheckoutSession, {
          sessionId: args.sessionId,
          checkoutSessionId: args.checkoutSessionId,
          errorMessage: "Payment verification failed",
        });
        throw new Error("Payment verification failed");
      }
    }

    console.log("✅ [STEP 3] Payment verification complete:", {
      method: paymentMethod,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
    });

    const createdPurchaseItems: string[] = [];

    // STEP 4: AUTO-CREATE CRM CONTACT & B2B ORGANIZATION
    console.log("📋 [STEP 4] Creating CRM contact and B2B organization...");
    let crmContactId: Id<"objects"> | undefined;
    let crmOrganizationId: Id<"objects"> | undefined;
    let frontendUserId: Id<"objects"> | undefined;

    try {
      console.log("   [STEP 4a] Calling autoCreateContactFromCheckoutInternal...");
      const contactResult = await ctx.runMutation(internal.crmIntegrations.autoCreateContactFromCheckoutInternal, {
        checkoutSessionId: args.checkoutSessionId,
      });
      crmContactId = contactResult.contactId;
      console.log("   ✅ [STEP 4a] CRM contact created:", crmContactId);

      // STEP 4b: Create dormant frontend user for guest checkout
      try {
        console.log("   [STEP 4b] Creating dormant frontend user for guest checkout...");

        // Extract name parts from customerName
        const nameParts = customerName.split(' ');
        const firstName = nameParts[0] || customerName;
        const lastName = nameParts.slice(1).join(' ') || '';

        frontendUserId = await ctx.runMutation(internal.auth.createOrGetGuestUser, {
          email: customerEmail,
          firstName,
          lastName,
          organizationId,
        });

        console.log(`   ✅ [STEP 4b] Created/found dormant frontend user: ${frontendUserId}`);
      } catch (userError) {
        console.error("   ⚠️ [STEP 4b] Failed to create frontend user (non-critical):", userError);
      }

      // 🔥 FIRST: Check if employer-detection behavior already identified a CRM org
      const behaviorMetadata = behaviorContext?.metadata;
      const isEmployerBilling = behaviorMetadata?.isEmployerBilling === true;
      const employerOrgId = behaviorMetadata?.crmOrganizationId;

      if (isEmployerBilling && employerOrgId) {
        // Employer detection found an existing CRM organization - use it directly!
        crmOrganizationId = employerOrgId as Id<"objects">;

        // Link the contact to the employer organization
        await ctx.runMutation(internal.crmIntegrations.linkContactToOrganization, {
          contactId: crmContactId,
          organizationId: crmOrganizationId,
          role: "employee", // They're an employee, not the company buyer
        });

        console.log("✅ [completeCheckoutAndFulfill] Using employer-detected CRM organization:", {
          crmOrganizationId,
          contactId: crmContactId,
          employerFieldValue: (behaviorMetadata as { employerFieldValue?: string })?.employerFieldValue,
        });
      }

      // SECOND: B2B ORGANIZATION CREATION (if B2B self-pay transaction and no employer detected)
      const transactionType = session.customProperties?.transactionType as "B2C" | "B2B" | undefined;
      const companyName = session.customProperties?.companyName as string | undefined;
      const vatNumber = session.customProperties?.vatNumber as string | undefined;

      if (!crmOrganizationId && transactionType === "B2B" && companyName) {
        try {
          // Extract billing address from checkout session
          const billingLine1 = session.customProperties?.billingLine1 as string | undefined;
          const billingLine2 = session.customProperties?.billingLine2 as string | undefined;
          const billingCity = session.customProperties?.billingCity as string | undefined;
          const billingState = session.customProperties?.billingState as string | undefined;
          const billingPostalCode = session.customProperties?.billingPostalCode as string | undefined;
          const billingCountry = session.customProperties?.billingCountry as string | undefined;

          // Construct BillingAddress object (only if we have required fields)
          const billingAddress = billingLine1 && billingCity && billingPostalCode && billingCountry
            ? {
                line1: billingLine1,
                line2: billingLine2,
                city: billingCity,
                state: billingState,
                postalCode: billingPostalCode,
                country: billingCountry,
              }
            : undefined;

          // Create CRM organization with billing address
          crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
            organizationId,
            companyName,
            vatNumber,
            billingAddress, // ✅ Now passing billing address
            email: customerEmail,
            phone: customerPhone,
          });

          // Link contact to organization
          await ctx.runMutation(internal.crmIntegrations.linkContactToOrganization, {
            contactId: crmContactId,
            organizationId: crmOrganizationId,
            role: "buyer",
          });

          console.log(`B2B: Created organization ${crmOrganizationId} and linked to contact ${crmContactId}`);
        } catch (orgError) {
          console.error("Failed to create CRM organization (non-critical):", orgError);
          // Don't fail checkout if organization creation fails
        }
      }
    } catch (error) {
      console.error("   ⚠️ [STEP 4] Failed to create CRM contact (non-critical):", error);
    }
    console.log("✅ [STEP 4] CRM setup complete. crmContactId:", crmContactId, "crmOrganizationId:", crmOrganizationId);

    // STEP 5: Create form responses for audit trail (only for tickets WITH custom forms)
    // Uses internal mutation to avoid auth requirement (supports guest checkout)
    console.log("📋 [STEP 5] Creating form responses for audit trail...");
    if (formResponses && formResponses.length > 0) {
      for (const formResp of formResponses) {
        // Only create form response if a custom form was actually used
        // (formId is only set when ticket has a custom form configured)
        if (formResp.formId) {
          await ctx.runMutation(internal.formsOntology.createCheckoutFormResponse, {
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
    }
    console.log("✅ [STEP 5] Form responses created:", formResponses?.length || 0);

    // STEP 6: Create purchase_items for each purchased product
    console.log("📋 [STEP 6] Creating purchase items for", selectedProducts.length, "products...");

    if (selectedProducts.length === 0) {
      console.error("❌ [STEP 6] NO SELECTED PRODUCTS! Cannot complete checkout.");
      throw new Error("No products selected - cannot complete checkout");
    }

    // Track global ticket number across all products (for matching with form responses)
    // Form responses use a global ticket number (1, 2, 3... across all products)
    let globalTicketOffset = 0;

    for (let productIndex = 0; productIndex < selectedProducts.length; productIndex++) {
      const selectedProduct = selectedProducts[productIndex];
      console.log(`   [STEP 6.${productIndex + 1}] Processing product ${productIndex + 1}/${selectedProducts.length}:`, selectedProduct.productId);

      const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
        productId: selectedProduct.productId,
      });

      if (!product) {
        console.error(`   ❌ [STEP 6.${productIndex + 1}] Product ${selectedProduct.productId} not found, skipping`);
        continue;
      }

      console.log(`   ✅ [STEP 6.${productIndex + 1}] Product found:`, {
        productId: product._id,
        name: product.name,
        subtype: product.subtype,
      });

      // Determine fulfillment type from product
      const fulfillmentType = product.subtype || "ticket"; // Default to ticket for backward compatibility

      // Extract B2B info from session for purchase_items
      const transactionType = session.customProperties?.transactionType as "B2C" | "B2B" | undefined;
      const companyName = session.customProperties?.companyName as string | undefined;
      const vatNumber = session.customProperties?.vatNumber as string | undefined;

      console.log(`   [STEP 6.${productIndex + 1}] Creating purchase items...`, {
        quantity: selectedProduct.quantity,
        fulfillmentType,
      });

      // Create purchase_items (one per quantity)
      let purchaseItemsResult;
      try {
        purchaseItemsResult = await ctx.runMutation(internal.purchaseOntology.createPurchaseItemInternal, {
        organizationId,
        checkoutSessionId: args.checkoutSessionId,
        productId: selectedProduct.productId,
        quantity: selectedProduct.quantity,
        pricePerUnit: selectedProduct.pricePerUnit,
        totalPrice: selectedProduct.totalPrice,
        buyerEmail: customerEmail,
        buyerName: customerName,
        buyerPhone: customerPhone,
        // B2B fields
        buyerTransactionType: transactionType,
        buyerCompanyName: companyName,
        buyerVatNumber: vatNumber,
        crmOrganizationId, // Link to CRM organization if B2B
        fulfillmentType,
        registrationData: undefined, // Will be set below if forms exist
          userId: frontendUserId,
        });

        console.log(`   ✅ [STEP 6.${productIndex + 1}] Purchase items created:`, {
          count: purchaseItemsResult.purchaseItemIds.length,
          ids: purchaseItemsResult.purchaseItemIds,
        });
      } catch (purchaseError) {
        console.error(`   ❌ [STEP 6.${productIndex + 1}] Failed to create purchase items:`, purchaseError);
        throw purchaseError;
      }

      createdPurchaseItems.push(...purchaseItemsResult.purchaseItemIds);

      // STEP 6.x.FULFILLMENT: Create fulfillment object based on product type
      console.log(`   [STEP 6.${productIndex + 1}] Creating fulfillment for ${purchaseItemsResult.purchaseItemIds.length} items...`);
      for (let i = 0; i < purchaseItemsResult.purchaseItemIds.length; i++) {
        const purchaseItemId = purchaseItemsResult.purchaseItemIds[i];
        const itemNumber = i + 1;
        // Calculate global ticket number (form responses use global numbering: 1, 2, 3... across all products)
        const globalTicketNumber = globalTicketOffset + itemNumber;
        console.log(`      [STEP 6.${productIndex + 1}.${i + 1}] Processing item ${itemNumber}/${purchaseItemsResult.purchaseItemIds.length} (global ticket #${globalTicketNumber})...`);

        // Find corresponding form response for this item using GLOBAL ticket number
        // Form responses are stored with global ticketNumber (e.g., product A qty 2 = tickets 1,2; product B qty 1 = ticket 3)
        const formResponse = formResponses?.find(
          (fr) =>
            fr.productId === selectedProduct.productId &&
            fr.ticketNumber === globalTicketNumber
        );

        // Extract registration data
        let registrationData: Record<string, unknown> | undefined;
        let holderEmail: string;
        let holderName: string;

        if (formResponse) {
          registrationData = formResponse.responses as Record<string, unknown>;
          holderEmail = (formResponse.responses.email as string) || customerEmail;

          // Extract attendee name from form responses
          // Priority: firstName+lastName > name > fullName > customerName (buyer)
          const firstName = formResponse.responses.firstName as string | undefined;
          const lastName = formResponse.responses.lastName as string | undefined;

          if (firstName && lastName) {
            // Form collected firstName and lastName separately (standard flow)
            holderName = `${firstName} ${lastName}`.trim();
          } else if (firstName) {
            // Only first name provided
            holderName = firstName;
          } else {
            // Fallback to legacy field names or buyer name
            holderName =
              (formResponse.responses.name as string) ||
              (formResponse.responses.fullName as string) ||
              (formResponse.responses.attendeeName as string) ||
              customerName;
          }
        } else {
          registrationData = undefined;
          holderEmail = customerEmail;
          holderName = customerName;
        }

        // FULFILLMENT DISPATCH - Based on product type
        if (fulfillmentType === "ticket") {
          // Create event ticket for access control
          const eventId = product.customProperties?.eventId as Id<"objects"> | undefined;
          console.log(`      [STEP 6.${productIndex + 1}.${i + 1}] Creating ticket (eventId: ${eventId})...`);

          try {
            const ticketId = await ctx.runMutation(internal.ticketOntology.createTicketInternal, {
            organizationId,
            productId: selectedProduct.productId,
            eventId,
            holderName,
            holderEmail,
            userId: frontendUserId, // ✅ CHANGED: Pass dormant user ID instead of undefined
            customProperties: {
              purchaseDate: Date.now(),
              paymentIntentId: args.paymentIntentId,
              pricePaid: selectedProduct.pricePerUnit, // Legacy field (kept for compatibility)
              totalPriceInCents: selectedProduct.pricePerUnit, // ✅ Required for invoice generation
              ticketNumber: itemNumber,
              totalTicketsInOrder: selectedProduct.quantity,
              checkoutSessionId: args.checkoutSessionId,
              purchaseItemId, // Link back to purchase_item
              registrationData,
              eventId, // ✅ Store event ID in customProperties for invoice line items
              // 🔥 CRITICAL: Link ticket to CRM organization for consolidated invoicing
              crmOrganizationId, // Detected by employer-detection behavior
              contactId: crmContactId, // Link to individual contact
            },
            });

            console.log(`      ✅ [STEP 6.${productIndex + 1}.${i + 1}] Ticket created:`, ticketId);

            // Update purchase_item with fulfillment info
            await ctx.runMutation(internal.purchaseOntology.updateFulfillmentStatusInternal, {
              purchaseItemId: purchaseItemId as Id<"objects">,
              fulfillmentStatus: "fulfilled",
              fulfillmentData: {
                ticketId,
                eventId,
              },
              userId: frontendUserId,
            });
            console.log(`      ✅ [STEP 6.${productIndex + 1}.${i + 1}] Fulfillment status updated`);
          } catch (ticketError) {
            console.error(`      ❌ [STEP 6.${productIndex + 1}.${i + 1}] Failed to create ticket:`, ticketError);
            throw ticketError;
          }
        }
        // TODO: Add more fulfillment types here
      }

      // Update global ticket offset for next product
      // This ensures form response matching works correctly across multiple products
      globalTicketOffset += selectedProduct.quantity;
    }
    console.log("✅ [STEP 6] All purchase items and tickets created:", createdPurchaseItems.length);

    // STEP 7: Mark session as completed
    console.log("📋 [STEP 7] Marking session as completed...");
    try {
      await ctx.runMutation(internal.checkoutSessionOntology.completeCheckoutSessionInternal, {
        checkoutSessionId: args.checkoutSessionId,
        paymentIntentId: args.paymentIntentId,
        purchasedItemIds: createdPurchaseItems,
        crmContactId,
        crmOrganizationId,
        userId: frontendUserId,
        paymentMethod,
      });
      console.log("✅ [STEP 7] Session marked as completed");
    } catch (sessionError) {
      console.error("❌ [STEP 7] Failed to mark session as completed:", sessionError);
      throw sessionError;
    }

    // STEP 8: CREATE TRANSACTIONS AND LINK TO TICKETS
    console.log("📋 [STEP 8] Creating transactions and linking to tickets...");
    try {
      await ctx.runAction(internal.createTransactionsFromCheckout.createTransactionsFromCheckout, {
        checkoutSessionId: args.checkoutSessionId,
      });
      console.log("✅ [STEP 8] Transactions created and linked successfully");
    } catch (transactionError) {
      console.error("⚠️ [STEP 8] Transaction creation failed (non-critical):", transactionError);
    }

    // STEP 9: Determine invoice handling based on payment method
    console.log("📋 [STEP 9] Determining invoice handling...");
    const isEmployerBilled = !!crmOrganizationId && behaviorContext?.metadata?.isEmployerBilling === true;
    const isManualInvoice = args.paymentIntentId.startsWith('inv_') || args.paymentIntentId === 'invoice';
    const isFreeRegistration = args.paymentIntentId === 'free' || args.paymentIntentId.startsWith('free_');

    // Invoice PDF logic:
    // - Auto-detected employer billing: Skip PDF (they get consolidated invoice later)
    // - Manual invoice request (B2B/B2C): Include PDF in email
    // - Free registration: No invoice needed
    // - Stripe payment: Receipt/invoice included

    let includeInvoicePDF = false;
    let invoiceType: 'employer' | 'manual_b2b' | 'manual_b2c' | 'receipt' | 'none' = 'none';

    if (isEmployerBilled && !isManualInvoice) {
      // Auto-detected employer billing - consolidated invoice later
      includeInvoicePDF = false;
      invoiceType = 'employer';
      console.log("📋 [completeCheckoutAndFulfill] Employer billing - consolidated invoice will be generated later");

    } else if (isManualInvoice) {
      // Manual invoice request (B2B or B2C pay-later)
      includeInvoicePDF = true;

      // Determine if B2B or B2C based on presence of CRM organization
      if (crmOrganizationId) {
        invoiceType = 'manual_b2b';
        console.log("📋 [completeCheckoutAndFulfill] Manual B2B invoice - will generate and send PDF");
      } else {
        invoiceType = 'manual_b2c';
        console.log("📋 [completeCheckoutAndFulfill] Manual B2C invoice - will generate and send PDF");
      }

    } else if (isFreeRegistration) {
      // Free registration - no invoice needed
      includeInvoicePDF = false;
      invoiceType = 'none';
      console.log("📋 [completeCheckoutAndFulfill] Free registration - no invoice needed");

    } else {
      // Stripe payment - include receipt/invoice
      includeInvoicePDF = true;
      invoiceType = 'receipt';
      console.log("   Stripe payment - will include receipt/invoice PDF");
    }
    console.log("✅ [STEP 9] Invoice handling determined:", { invoiceType, includeInvoicePDF });

    // STEP 10: SEND ORDER CONFIRMATION EMAIL
    console.log("📋 [STEP 10] Sending order confirmation email...");
    try {
      await ctx.runAction(internal.ticketGeneration.sendOrderConfirmationEmail, {
        checkoutSessionId: args.checkoutSessionId,
        recipientEmail: customerEmail,
        recipientName: customerName,
        includeInvoicePDF,
      });
      console.log("✅ [STEP 10] Order confirmation email sent");
    } catch (emailError) {
      console.error("⚠️ [STEP 10] Email sending failed (non-critical):", emailError);
    }

    // STEP 11: SEND SALES NOTIFICATION EMAIL
    console.log("📋 [STEP 11] Sending sales notification email...");
    try {
      // Get checkout instance to retrieve sales notification settings
      const checkoutInstanceId = session.customProperties?.checkoutInstanceId as Id<"objects"> | undefined;

      if (checkoutInstanceId) {
        // ✅ Use public query - no authentication required
        const checkoutInstance = await ctx.runQuery(api.checkoutOntology.getPublicCheckoutInstanceById, {
          instanceId: checkoutInstanceId,
        });

        const salesNotificationRecipientEmail =
          checkoutInstance?.customProperties?.salesNotificationRecipientEmail as string | undefined;
        const salesNotificationEmailTemplateId =
          checkoutInstance?.customProperties?.salesNotificationEmailTemplateId as Id<"objects"> | undefined;

        // Send sales notification if recipient is configured
        if (salesNotificationRecipientEmail) {
          console.log("📧 [completeCheckoutAndFulfill] Sending sales notification to:", salesNotificationRecipientEmail);

          await ctx.runAction(internal.emailDelivery.sendSalesNotificationEmail, {
            checkoutSessionId: args.checkoutSessionId,
            recipientEmail: salesNotificationRecipientEmail,
            templateId: salesNotificationEmailTemplateId, // Optional: use custom template
          });
        } else {
          console.log("📧 [completeCheckoutAndFulfill] No sales notification recipient configured, skipping");
        }
      } else {
        console.log("   No checkout instance ID, skipping sales notification");
      }
      console.log("✅ [STEP 11] Sales notification handled");
    } catch (salesEmailError) {
      console.error("⚠️ [STEP 11] Sales notification email failed (non-critical):", salesEmailError);
    }

    console.log("🎉 [completeCheckoutAndFulfill] CHECKOUT COMPLETE! Returning success...");
    return {
      success: true,
      purchasedItemIds: createdPurchaseItems, // Generic! Works for any product type
      crmContactId,
      paymentId: paymentResult.paymentId,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
      // ✅ NEW: Indicate if guest registration (for frontend account activation prompt)
      isGuestRegistration: !!frontendUserId,
      frontendUserId, // For debugging/linking
      invoiceType, // 'employer' | 'manual_b2b' | 'manual_b2c' | 'receipt' | 'none'
    };
  },
});
