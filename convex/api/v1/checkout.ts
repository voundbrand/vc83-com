/**
 * API V1: CHECKOUT ENDPOINTS
 *
 * External API for payment processing on customer websites.
 * Enables organizations to accept payments on their own websites
 * without redirecting users away.
 *
 * Key Features:
 * - Get payment provider configuration (public keys, provider info)
 * - Create checkout sessions (returns clientSecret for Stripe Elements)
 * - Verify payment completion (confirms payment and fulfills orders)
 *
 * Security: API key required in Authorization header
 * Scope: Operates on the authenticated organization's payment providers
 *
 * Example Usage:
 * ```typescript
 * // 1. Get payment config
 * const config = await fetch('/api/v1/checkout/config', {
 *   headers: { 'Authorization': 'Bearer sk_...' }
 * });
 * // Returns: { provider: 'stripe', publishableKey: 'pk_...' }
 *
 * // 2. Create checkout session
 * const session = await fetch('/api/v1/checkout/sessions', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer sk_...' },
 *   body: JSON.stringify({
 *     productId: 'prod_123',
 *     quantity: 1,
 *     customerEmail: 'customer@example.com'
 *   })
 * });
 * // Returns: { clientSecret: 'pi_...', sessionId: '...' }
 *
 * // 3. Initialize Stripe Elements on your website
 * const stripe = Stripe(config.publishableKey);
 * const elements = stripe.elements({ clientSecret: session.clientSecret });
 * const paymentElement = elements.create('payment');
 * paymentElement.mount('#payment-element');
 *
 * // 4. Confirm payment (after customer submits)
 * const result = await stripe.confirmPayment({
 *   elements,
 *   confirmParams: { return_url: 'https://yoursite.com/success' }
 * });
 *
 * // 5. Verify and fulfill (backend)
 * await fetch('/api/v1/checkout/confirm', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer sk_...' },
 *   body: JSON.stringify({
 *     sessionId: session.sessionId,
 *     paymentIntentId: result.paymentIntent.id
 *   })
 * });
 * ```
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * GET PAYMENT PROVIDER CONFIG
 *
 * Returns payment provider configuration for initializing
 * payment UI on the client side (e.g., Stripe publishable key).
 *
 * Endpoint: GET /api/v1/checkout/config
 *
 * Response:
 * {
 *   provider: "stripe" | "invoice",
 *   providerName: "Stripe",
 *   publishableKey?: string, // For Stripe
 *   accountId: string,
 *   supportedCurrencies: string[]
 * }
 */
export const getCheckoutConfig = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Get organization's payment provider config
    const config = await ctx.runQuery(
      internal.api.v1.checkoutInternal.getPaymentConfig,
      { organizationId }
    );

    if (!config) {
      return new Response(
        JSON.stringify({
          error: "No payment provider configured",
          message:
            "Please connect a payment provider (Stripe) in your dashboard first",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Return config (public keys only - safe to expose)
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /checkout/config error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE CHECKOUT SESSION
 *
 * Creates a payment session and returns clientSecret for
 * initializing Stripe Elements (or equivalent) on the client.
 *
 * Endpoint: POST /api/v1/checkout/sessions
 *
 * Request Body:
 * {
 *   productId: string,
 *   quantity?: number,
 *   customerEmail?: string,
 *   customerName?: string,
 *   customerPhone?: string,
 *   metadata?: object
 * }
 *
 * Response:
 * {
 *   sessionId: string,
 *   clientSecret: string, // For Stripe Elements
 *   expiresAt: number,
 *   amount: number,
 *   currency: string
 * }
 */
export const createCheckoutSession = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Parse request body
    const body = await request.json();

    if (!body.productId) {
      return new Response(
        JSON.stringify({ error: "Missing 'productId' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create checkout session via internal action
    const session = await ctx.runAction(
      internal.api.v1.checkoutInternal.createCheckoutSessionInternal,
      {
        organizationId,
        productId: body.productId as Id<"objects">,
        quantity: body.quantity || 1,
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        metadata: body.metadata,
      }
    );

    // 4. Update API key usage
    // TODO: Implement async usage tracking - await ctx.scheduler.runAfter(0, internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

    // 5. Return session details
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /checkout/sessions error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CONFIRM PAYMENT AND FULFILL ORDER
 *
 * Verifies payment completion and fulfills the order
 * (creates tickets, sends emails, generates invoices, etc.)
 *
 * Endpoint: POST /api/v1/checkout/confirm
 *
 * Request Body:
 * {
 *   sessionId: string,
 *   paymentIntentId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   transactionId: string,
 *   purchaseItemIds: string[], // Generic - works for any product type
 *   downloadUrls: {
 *     purchaseItems: string,  // Generic download for all purchased items
 *     tickets?: string,       // If products include tickets
 *     invoice?: string        // If B2B transaction
 *   }
 * }
 */
export const confirmPayment = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Parse request body
    const body = await request.json();

    if (!body.sessionId || !body.paymentIntentId) {
      return new Response(
        JSON.stringify({
          error: "Missing 'sessionId' or 'paymentIntentId' field",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Verify payment and fulfill order
    const result = await ctx.runAction(
      internal.api.v1.checkoutInternal.confirmPaymentInternal,
      {
        organizationId,
        sessionId: body.sessionId,
        paymentIntentId: body.paymentIntentId,
      }
    );

    // 4. Update API key usage
    // TODO: Implement async usage tracking - await ctx.scheduler.runAfter(0, internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

    // 5. Return fulfillment result
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /checkout/confirm error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to confirm payment",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
