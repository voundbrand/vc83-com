/**
 * HTTP ENDPOINTS (REFACTORED)
 *
 * This is the refactored version using the payment provider abstraction.
 * Once tested, this will replace http.ts
 *
 * Key Changes:
 * - Uses payment provider for webhook signature verification
 * - Provider-agnostic webhook handling
 * - Cleaner error handling
 */

import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { getProviderByCode } from "./paymentProviders";

const http = httpRouter();

/**
 * STRIPE WEBHOOK ENDPOINT (REFACTORED)
 *
 * Receives events from Stripe (Connect account updates, payments, etc.)
 * Now uses the payment provider for signature verification.
 *
 * Events handled:
 * - account.updated: Auto-sync Connect account status
 * - account.external_account.created: Log bank account additions
 * - account.application.deauthorized: Handle user disconnect
 * - payment_intent.succeeded: Payment completion
 * - payment_intent.payment_failed: Failed payments
 * - charge.refunded: Refund handling
 * - invoice.* : Invoice events (future)
 */
http.route({
  path: "/stripe-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Get raw body and signature header
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      if (!signature) {
        console.error("Webhook error: No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // 2. Get Stripe provider
      let provider;
      try {
        provider = getProviderByCode("stripe-connect");
      } catch (error) {
        console.error("Stripe provider not configured:", error);
        return new Response("Payment provider not configured", { status: 500 });
      }

      // 3. Verify webhook signature using provider
      const isValidSignature = provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        console.error("Webhook signature verification failed");
        return new Response("Invalid signature", { status: 400 });
      }

      // 4. Parse event
      const event = JSON.parse(body);
      console.log(`✓ Webhook received: ${event.type} (${event.id})`);

      // 5. Schedule async processing (returns quickly to Stripe)
      await ctx.runAction(internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
        signature: signature,
      });

      // 6. Respond immediately (< 5 seconds required by Stripe)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * STRIPE CONNECT WEBHOOK ENDPOINT (REFACTORED)
 *
 * Separate endpoint for Connect-specific events if needed.
 * Uses same provider-based verification.
 */
http.route({
  path: "/stripe-connect-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      if (!signature) {
        return new Response("Missing signature", { status: 400 });
      }

      // Get Stripe provider
      let provider;
      try {
        provider = getProviderByCode("stripe-connect");
      } catch (error) {
        console.error("Stripe provider not configured:", error);
        return new Response("Payment provider not configured", { status: 500 });
      }

      // Verify signature using provider
      const isValidSignature = provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        console.error("Connect webhook signature verification failed");
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      const event = JSON.parse(body);
      console.log(`✓ Connect webhook received: ${event.type} (${event.id})`);

      // Process Connect-specific events
      await ctx.runAction(internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
        signature: signature,
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Connect webhook error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * GENERIC PAYMENT WEBHOOK ENDPOINT (Future)
 *
 * This will handle webhooks from ANY payment provider (Stripe, PayPal, Square, etc.)
 * Provider is determined by a URL parameter or header.
 */
http.route({
  path: "/payment-webhooks/:providerCode",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get provider code from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const providerCode = pathParts[pathParts.length - 1];

      const body = await request.text();
      const signature = request.headers.get("stripe-signature") ||
                       request.headers.get("paypal-transmission-sig") ||
                       request.headers.get("x-square-signature") ||
                       "";

      if (!signature) {
        console.error(`Webhook error: No signature for ${providerCode}`);
        return new Response("Missing signature", { status: 400 });
      }

      // Get provider
      let provider;
      try {
        provider = getProviderByCode(providerCode);
      } catch (error) {
        console.error(`Provider ${providerCode} not found:`, error);
        return new Response(`Provider ${providerCode} not configured`, { status: 404 });
      }

      // Verify signature
      const isValidSignature = provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        console.error(`${providerCode} webhook signature verification failed`);
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event (provider-specific format)
      const event = JSON.parse(body);
      console.log(`✓ ${providerCode} webhook received: ${event.type || event.event_type} (${event.id})`);

      // TODO: Route to provider-specific webhook processor
      // For now, Stripe-only
      if (providerCode === "stripe-connect") {
        await ctx.runAction(internal.stripeWebhooks.processWebhook, {
          eventType: event.type,
          eventId: event.id,
          eventData: JSON.stringify(event.data.object),
          created: event.created,
          signature: signature,
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Payment webhook error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * HEALTH CHECK ENDPOINT
 * Verify the server is running
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: Date.now(),
        providers: ["stripe-connect"], // Could be dynamic
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
