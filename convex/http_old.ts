/**
 * HTTP ENDPOINTS
 * Handles incoming HTTP requests, primarily Stripe webhooks
 */

import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * STRIPE WEBHOOK ENDPOINT
 * Receives events from Stripe (Connect account updates, payments, etc.)
 *
 * Events handled:
 * - account.updated: Auto-sync Connect account status
 * - account.external_account.created: Log bank account additions
 * - account.application.deauthorized: Handle user disconnect
 * - payment_intent.succeeded: Payment completion (Phase 3)
 * - charge.refunded: Refund handling (Phase 3)
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

      // 2. Verify this is a real webhook from Stripe
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured in environment");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        console.error("STRIPE_SECRET_KEY not configured");
        return new Response("Stripe not configured", { status: 500 });
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-09-30.clover",
      });

      // 3. Construct and verify event signature (async version for Convex)
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        const error = err as Error;
        console.error("Webhook signature verification failed:", error.message);
        return new Response(`Webhook Error: ${error.message}`, { status: 400 });
      }

      // 4. Log the webhook receipt
      console.log(`✓ Webhook received: ${event.type} (${event.id})`);

      // 5. Schedule async processing (returns quickly to Stripe)
      await ctx.runAction(internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
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
 * STRIPE CONNECT WEBHOOK ENDPOINT (Optional - Separate endpoint for Connect events)
 * You can use this if you want separate webhook endpoints for Connect vs Billing
 *
 * Uses: STRIPE_CONNECT_WEBHOOK_SECRET
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

      // Use separate webhook secret for Connect events
      const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!webhookSecret || !stripeSecretKey) {
        console.error("Stripe webhook configuration missing");
        return new Response("Webhook not configured", { status: 500 });
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-09-30.clover",
      });

      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        const error = err as Error;
        console.error("Connect webhook verification failed:", error.message);
        return new Response(`Webhook Error: ${error.message}`, { status: 400 });
      }

      console.log(`✓ Connect webhook received: ${event.type} (${event.id})`);

      // Process Connect-specific events
      await ctx.runAction(internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
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
 * HEALTH CHECK ENDPOINT
 * Verify the server is running
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
