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
 * CORS Helper - Add CORS headers to API responses
 * Allows requests from pluseins.gg and all subdomains
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://pluseins.gg",
    "https://www.pluseins.gg",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  // Allow all subdomains of pluseins.gg
  const isAllowedOrigin = origin && (
    allowedOrigins.includes(origin) ||
    origin.match(/^https:\/\/[\w-]+\.pluseins\.gg$/)
  );

  if (isAllowedOrigin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    };
  }

  return {};
}

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

/**
 * ==========================================
 * ENTERPRISE API v1 ENDPOINTS
 * ==========================================
 *
 * External API for integration with customer websites.
 * Requires API key authentication via Authorization: Bearer <key>
 */

// Import API handlers
import { getEvents, getEventBySlug, getEventById, getEventProducts } from "./api/v1/events";
import { getProduct } from "./api/v1/products";
import { getForm } from "./api/v1/forms";
import { triggerWorkflow } from "./api/v1/workflows";
import { getTransaction } from "./api/v1/transactions";
import { getTicketPdf } from "./api/v1/tickets";
import { getInvoice } from "./api/v1/invoices";
import {
  getCheckoutConfig,
  createCheckoutSession,
  confirmPayment,
} from "./api/v1/checkout";
import {
  createContactFromEvent,
  createContact,
  listContacts,
  getContact,
} from "./api/v1/crm";
import { createBooking } from "./api/v1/bookings";

/**
 * Layer 1: READ APIs (Before Checkout)
 */

// GET /api/v1/events (exact match - list all events)
http.route({
  path: "/api/v1/events",
  method: "GET",
  handler: getEvents,
});

// GET /api/v1/events/by-slug/:slug (get event by slug)
http.route({
  pathPrefix: "/api/v1/events/by-slug/",
  method: "GET",
  handler: getEventBySlug,
});

// GET /api/v1/events/:eventId (get event by ID)
// GET /api/v1/events/:eventId/products (get event products)
http.route({
  pathPrefix: "/api/v1/events/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const origin = request.headers.get("origin");
      const corsHeaders = getCorsHeaders(origin);

      // Skip if it's the by-slug route (handled above)
      if (pathname.includes("/by-slug/")) {
        return new Response("Route handled elsewhere", { status: 404 });
      }

      // Verify API key first
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid Authorization header" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            }
          }
        );
      }

      const apiKey = authHeader.substring(7);
      const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, { apiKey });

      if (!authContext) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            }
          }
        );
      }

      const { organizationId } = authContext;

      // Parse path
      const afterPrefix = pathname.substring("/api/v1/events/".length);
      const parts = afterPrefix.split("/").filter(p => p);

      // Route: /api/v1/events/{eventId}/products
      if (parts.length === 2 && parts[1] === "products") {
        const eventId = parts[0];
        const products = await ctx.runQuery(
          internal.api.v1.eventsInternal.getEventProductsInternal,
          { eventId: eventId as any, organizationId }
        );

        return new Response(
          JSON.stringify({ success: true, products, total: products.length }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Organization-Id": organizationId,
              ...corsHeaders,
            },
          }
        );
      }

      // Route: /api/v1/events/{eventId}
      if (parts.length === 1) {
        const eventId = parts[0];
        const event = await ctx.runQuery(
          internal.api.v1.eventsInternal.getEventByIdInternal,
          { eventId: eventId as any, organizationId }
        );

        if (!event) {
          return new Response(
            JSON.stringify({ error: "Event not found" }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              }
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, event }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Organization-Id": organizationId,
              ...corsHeaders,
            },
          }
        );
      }

      // No matching route
      return new Response("No matching routes found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error("API /events/* error:", error);
      const origin = request.headers.get("origin");
      const corsHeaders = getCorsHeaders(origin);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }
  }),
});

// GET /api/v1/products/:productId
http.route({
  path: "/api/v1/products/:productId",
  method: "GET",
  handler: getProduct,
});

// GET /api/v1/forms/:formId
http.route({
  path: "/api/v1/forms/:formId",
  method: "GET",
  handler: getForm,
});

/**
 * Layer 2: CHECKOUT APIs (Payment Processing)
 */

// GET /api/v1/checkout/config - Get payment provider configuration
http.route({
  path: "/api/v1/checkout/config",
  method: "GET",
  handler: getCheckoutConfig,
});

// POST /api/v1/checkout/sessions - Create checkout session
http.route({
  path: "/api/v1/checkout/sessions",
  method: "POST",
  handler: createCheckoutSession,
});

// POST /api/v1/checkout/confirm - Confirm payment and fulfill order
http.route({
  path: "/api/v1/checkout/confirm",
  method: "POST",
  handler: confirmPayment,
});

/**
 * Layer 3: WORKFLOW API (During Checkout)
 */

// POST /api/v1/workflows/trigger
http.route({
  path: "/api/v1/workflows/trigger",
  method: "POST",
  handler: triggerWorkflow,
});

/**
 * Layer 4: RESULT APIs (After Checkout)
 */

// GET /api/v1/transactions/:transactionId
http.route({
  path: "/api/v1/transactions/:transactionId",
  method: "GET",
  handler: getTransaction,
});

// GET /api/v1/tickets/:ticketId/pdf
http.route({
  path: "/api/v1/tickets/:ticketId/pdf",
  method: "GET",
  handler: getTicketPdf,
});

// GET /api/v1/invoices/:invoiceId
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "GET",
  handler: getInvoice,
});

/**
 * Layer 5: CRM APIs (Contact Management)
 */

// POST /api/v1/crm/contacts/from-event - Create contact from event registration
http.route({
  path: "/api/v1/crm/contacts/from-event",
  method: "POST",
  handler: createContactFromEvent,
});

// POST /api/v1/crm/contacts - Create generic contact
http.route({
  path: "/api/v1/crm/contacts",
  method: "POST",
  handler: createContact,
});

// GET /api/v1/crm/contacts - List contacts
http.route({
  path: "/api/v1/crm/contacts",
  method: "GET",
  handler: listContacts,
});

// GET /api/v1/crm/contacts/:contactId - Get contact details
http.route({
  path: "/api/v1/crm/contacts/:contactId",
  method: "GET",
  handler: getContact,
});

/**
 * Layer 6: BOOKINGS API (Event Registration)
 */

// OPTIONS /api/v1/bookings/create - CORS preflight
http.route({
  path: "/api/v1/bookings/create",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// POST /api/v1/bookings/create - Create event booking with tickets (with CORS)
http.route({
  path: "/api/v1/bookings/create",
  method: "POST",
  handler: createBooking,
});

export default http;
