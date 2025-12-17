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
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { getProviderByCode } from "./paymentProviders";
import { getCorsHeaders, handleOptionsRequest } from "./api/v1/corsHeaders";

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

      // 3. Verify webhook signature using provider (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

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

      // Verify signature using provider (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

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
 * STRIPE INVOICE WEBHOOK ENDPOINT
 *
 * Handles Stripe webhooks for B2B invoicing.
 * Separate from AI subscriptions and Connect webhooks.
 *
 * Events handled:
 * - invoice.created - Invoice created in Stripe
 * - invoice.finalized - Invoice finalized (sealed)
 * - invoice.paid - Payment received
 * - invoice.payment_failed - Payment failed
 * - invoice.payment_action_required - Action required
 * - invoice.voided - Invoice voided
 * - invoice.marked_uncollectible - Marked uncollectible
 */
http.route({
  path: "/stripe-invoice-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[Invoice Webhooks] 🔔 Received webhook request");

    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      if (!signature) {
        console.error("[Invoice Webhooks] ❌ No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Invoice Webhooks] ❌ STRIPE_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      // Import Stripe for signature verification
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-10-29.clover",
      });

      // Verify signature - MUST use async version in Convex runtime
      let event: any;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log(`[Invoice Webhooks] ✅ Signature verified for event: ${event.type}`);
      } catch (error) {
        console.error("[Invoice Webhooks] ❌ Signature verification failed:", error);
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      console.log(`[Invoice Webhooks] 📦 Processing: ${event.type} (${event.id})`);

      // Schedule async processing
      await ctx.runAction(internal.api.v1.stripeInvoiceWebhooks.processStripeInvoiceWebhook, {
        eventType: event.type,
        eventId: event.id,
        invoiceData: event.data.object,
        created: event.created,
      });

      console.log(`[Invoice Webhooks] ✅ Event queued for processing`);

      // Respond immediately (< 5 seconds required by Stripe)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Invoice Webhooks] ❌ Processing error:", error);
      console.error("[Invoice Webhooks] Stack:", (error as Error).stack);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * AI SUBSCRIPTION WEBHOOK ENDPOINT
 *
 * Handles Stripe webhooks for AI subscription billing.
 * This is separate from Stripe Connect webhooks (which are for organization payment processing).
 *
 * IMPORTANT: This endpoint uses STRIPE_AI_WEBHOOK_SECRET for signature verification,
 * which is DIFFERENT from STRIPE_WEBHOOK_SECRET used for Stripe Connect webhooks.
 * These are two separate Stripe integrations:
 * 1. Platform-level: Organizations subscribe to YOUR platform (this endpoint)
 * 2. Organization-level: Organizations accept payments from THEIR customers (Stripe Connect)
 *
 * Events handled:
 * - customer.subscription.created - New AI subscription
 * - customer.subscription.updated - Subscription changes
 * - customer.subscription.deleted - Subscription cancellation
 * - invoice.payment_succeeded - Monthly payment success
 * - invoice.payment_failed - Payment failure
 */
http.route({
  path: "/stripe-ai-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[AI Webhooks] 🔔 Received webhook request");

    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      console.log("[AI Webhooks] 📝 Request details:", {
        hasSignature: !!signature,
        bodyLength: body.length,
        url: request.url
      });

      if (!signature) {
        console.error("[AI Webhooks] ❌ No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // Verify webhook signature using AI-specific webhook secret
      // NOTE: This uses STRIPE_AI_WEBHOOK_SECRET, NOT the Stripe Connect webhook secret
      const webhookSecret = process.env.STRIPE_AI_WEBHOOK_SECRET;

      console.log("[AI Webhooks] 🔑 Webhook secret configured:", !!webhookSecret);

      if (!webhookSecret) {
        console.error("[AI Webhooks] ❌ STRIPE_AI_WEBHOOK_SECRET not configured");
        console.error("[AI Webhooks] 💡 Set this in Convex dashboard or use stripe listen secret");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      // Import Stripe for signature verification
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-10-29.clover",
      });

      // Verify signature - MUST use async version in Convex runtime
      let event: any;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log(`[AI Webhooks] ✅ Signature verified for event: ${event.type}`);
      } catch (error) {
        console.error("[AI Webhooks] ❌ Signature verification failed:", error);
        console.error("[AI Webhooks] 🔍 Webhook secret starts with:", webhookSecret.substring(0, 10) + "...");
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event (already parsed by constructEvent)
      console.log(`[AI Webhooks] 📦 Processing: ${event.type} (${event.id})`);
      console.log(`[AI Webhooks] 📧 Customer email: ${(event.data.object as any).customer_email || 'N/A'}`);

      // Schedule async processing
      await ctx.runAction(internal.stripe.aiWebhooks.processAIWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
      });

      console.log(`[AI Webhooks] ✅ Event queued for processing`);

      // Respond immediately (< 5 seconds required by Stripe)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[AI Webhooks] ❌ Processing error:", error);
      console.error("[AI Webhooks] Stack:", (error as Error).stack);
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

      // Verify signature (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

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
import { getForm, getPublicForm, submitPublicForm } from "./api/v1/forms";
import { triggerWorkflow } from "./api/v1/workflows";
import { getTransaction } from "./api/v1/transactions";
import { getTicketPdf } from "./api/v1/tickets";
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
  bulkImportContacts,
  exportContacts,
} from "./api/v1/crm";
import { createBooking } from "./api/v1/bookings";
import {
  getCurrentUser,
  getCompleteProfile,
  getTransactions,
  getTickets,
  getEvents as getUserEvents,
  updateCurrentUser,
} from "./api/v1/users";
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  listMilestones,
  listTasks,
  listTeamMembers,
  listComments,
  getActivityLog,
} from "./api/v1/projects";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sealInvoice,
  sendInvoice,
  getInvoicePdf,
  syncInvoiceToStripe,
} from "./api/v1/invoices";

/**
 * Layer 1: READ APIs (Before Checkout)
 */

// OPTIONS /api/v1/events (CORS preflight)
http.route({
  path: "/api/v1/events",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/events (exact match - list all events)
http.route({
  path: "/api/v1/events",
  method: "GET",
  handler: getEvents,
});

// OPTIONS /api/v1/events/by-slug/:slug (CORS preflight)
http.route({
  pathPrefix: "/api/v1/events/by-slug/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/events/by-slug/:slug (get event by slug)
http.route({
  pathPrefix: "/api/v1/events/by-slug/",
  method: "GET",
  handler: getEventBySlug,
});

// OPTIONS /api/v1/events/:eventId (CORS preflight for both /:eventId and /:eventId/products)
http.route({
  pathPrefix: "/api/v1/events/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
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

// GET /api/v1/forms/:formId (authenticated)
http.route({
  path: "/api/v1/forms/:formId",
  method: "GET",
  handler: getForm,
});

// OPTIONS /api/v1/forms/public/:formId (CORS preflight)
http.route({
  pathPrefix: "/api/v1/forms/public/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/forms/public/:formId (public access - no auth)
http.route({
  pathPrefix: "/api/v1/forms/public/",
  method: "GET",
  handler: getPublicForm,
});

// POST /api/v1/forms/public/:formId/submit (public submission - no auth)
http.route({
  pathPrefix: "/api/v1/forms/public/",
  method: "POST",
  handler: submitPublicForm,
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

// OPTIONS /api/v1/workflows/trigger (CORS preflight)
http.route({
  path: "/api/v1/workflows/trigger",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

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

// POST /api/v1/crm/contacts/bulk - Bulk import contacts (Starter+ only)
http.route({
  path: "/api/v1/crm/contacts/bulk",
  method: "POST",
  handler: bulkImportContacts,
});

// GET /api/v1/crm/contacts/export - Export contacts (Starter+ only)
http.route({
  path: "/api/v1/crm/contacts/export",
  method: "GET",
  handler: exportContacts,
});

// GET /api/v1/crm/contacts/:contactId - Get contact details
// Uses pathPrefix to handle dynamic contactId parameter
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Extract contactId from path
      const afterPrefix = pathname.substring("/api/v1/crm/contacts/".length);
      const contactId = afterPrefix.split("/")[0];

      // If no contactId, this is the list endpoint (handled above)
      if (!contactId) {
        return new Response(
          JSON.stringify({ error: "Contact ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Verify API key
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

      // Update API key usage tracking
      // TODO: Implement async usage tracking - await ctx.scheduler.runAfter(0, internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

      // Query contact
      const contact = await ctx.runQuery(
        internal.api.v1.crmInternal.getContactInternal,
        {
          organizationId,
          contactId,
        }
      );

      if (!contact) {
        return new Response(
          JSON.stringify({ error: "Contact not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Return response
      return new Response(
        JSON.stringify(contact),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /crm/contacts/:id error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Layer 6: USER PROFILE APIs (Session-Based Authentication)
 *
 * These endpoints allow logged-in users to access their own data.
 * Authentication: Session-based (NOT API key)
 * Users can ONLY access their own data.
 */

// GET /api/v1/users/me - Get current user profile
http.route({
  path: "/api/v1/users/me",
  method: "GET",
  handler: getCurrentUser,
});

// GET /api/v1/users/me/profile-complete - Get complete user profile with activity
http.route({
  path: "/api/v1/users/me/profile-complete",
  method: "GET",
  handler: getCompleteProfile,
});

// GET /api/v1/users/me/transactions - Get user's transactions
http.route({
  path: "/api/v1/users/me/transactions",
  method: "GET",
  handler: getTransactions,
});

// GET /api/v1/users/me/tickets - Get user's event tickets
http.route({
  path: "/api/v1/users/me/tickets",
  method: "GET",
  handler: getTickets,
});

// GET /api/v1/users/me/events - Get user's registered events
http.route({
  path: "/api/v1/users/me/events",
  method: "GET",
  handler: getUserEvents,
});

// PATCH /api/v1/users/me - Update user profile
http.route({
  path: "/api/v1/users/me",
  method: "PATCH",
  handler: updateCurrentUser,
});

/**
 * Layer 7: PROJECTS API (Project Management)
 */

// POST /api/v1/projects - Create project
http.route({
  path: "/api/v1/projects",
  method: "POST",
  handler: createProject,
});

// GET /api/v1/projects - List projects
http.route({
  path: "/api/v1/projects",
  method: "GET",
  handler: listProjects,
});

// GET /api/v1/projects/:projectId - Get project details
http.route({
  path: "/api/v1/projects/:projectId",
  method: "GET",
  handler: getProject,
});

// PATCH /api/v1/projects/:projectId - Update project
http.route({
  path: "/api/v1/projects/:projectId",
  method: "PATCH",
  handler: updateProject,
});

// DELETE /api/v1/projects/:projectId - Delete project
http.route({
  path: "/api/v1/projects/:projectId",
  method: "DELETE",
  handler: deleteProject,
});

// GET /api/v1/projects/:projectId/milestones - List milestones
http.route({
  path: "/api/v1/projects/:projectId/milestones",
  method: "GET",
  handler: listMilestones,
});

// GET /api/v1/projects/:projectId/tasks - List tasks
http.route({
  path: "/api/v1/projects/:projectId/tasks",
  method: "GET",
  handler: listTasks,
});

// GET /api/v1/projects/:projectId/team - List team members
http.route({
  path: "/api/v1/projects/:projectId/team",
  method: "GET",
  handler: listTeamMembers,
});

// GET /api/v1/projects/:projectId/comments - List comments
http.route({
  path: "/api/v1/projects/:projectId/comments",
  method: "GET",
  handler: listComments,
});

// GET /api/v1/projects/:projectId/activity - Get activity log
http.route({
  path: "/api/v1/projects/:projectId/activity",
  method: "GET",
  handler: getActivityLog,
});

/**
 * Layer 7.5: INVOICES API
 */

// POST /api/v1/invoices - Create draft invoice
http.route({
  path: "/api/v1/invoices",
  method: "POST",
  handler: createInvoice,
});

// GET /api/v1/invoices - List invoices
http.route({
  path: "/api/v1/invoices",
  method: "GET",
  handler: listInvoices,
});

// GET /api/v1/invoices/:invoiceId - Get invoice details
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "GET",
  handler: getInvoice,
});

// PATCH /api/v1/invoices/:invoiceId - Update draft invoice
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "PATCH",
  handler: updateInvoice,
});

// DELETE /api/v1/invoices/:invoiceId - Delete draft invoice
http.route({
  path: "/api/v1/invoices/:invoiceId",
  method: "DELETE",
  handler: deleteInvoice,
});

// POST /api/v1/invoices/:invoiceId/seal - Seal draft invoice
http.route({
  path: "/api/v1/invoices/:invoiceId/seal",
  method: "POST",
  handler: sealInvoice,
});

// POST /api/v1/invoices/:invoiceId/send - Send invoice
http.route({
  path: "/api/v1/invoices/:invoiceId/send",
  method: "POST",
  handler: sendInvoice,
});

// GET /api/v1/invoices/:invoiceId/pdf - Get invoice PDF
http.route({
  path: "/api/v1/invoices/:invoiceId/pdf",
  method: "GET",
  handler: getInvoicePdf,
});

// POST /api/v1/invoices/:invoiceId/sync-stripe - Sync invoice to Stripe (optional)
http.route({
  path: "/api/v1/invoices/:invoiceId/sync-stripe",
  method: "POST",
  handler: syncInvoiceToStripe,
});

// GET /api/v1/invoices/client/:crmOrganizationId - Get client's invoices
http.route({
  pathPrefix: "/api/v1/invoices/client/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
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

      // 2. Update API key usage tracking
      // TODO: Implement async usage tracking - await ctx.scheduler.runAfter(0, internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

      // 3. Extract CRM organization ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const crmOrganizationId = pathParts[pathParts.length - 1];

      if (!crmOrganizationId) {
        return new Response(
          JSON.stringify({ error: "CRM organization ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Parse query parameters
      const status = url.searchParams.get("status") || undefined;
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "50"),
        200
      );
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // 5. Query invoices for client
      const result = await ctx.runQuery(
        internal.api.v1.invoicesInternal.getInvoicesForClientInternal,
        {
          organizationId,
          crmOrganizationId: crmOrganizationId as any,
          status,
          limit,
          offset,
        }
      );

      // 6. Return response
      return new Response(
        JSON.stringify({ success: true, ...result }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /invoices/client/:id error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Layer 8: BOOKINGS API (Event Registration)
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

/**
 * Layer 8: EXTERNAL FRONTEND CONTENT API
 *
 * Public API for external Next.js frontends to fetch CMS-configured content
 */

// OPTIONS /api/v1/published-content - CORS preflight
http.route({
  path: "/api/v1/published-content",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/published-content?org=vc83&page=/events
http.route({
  path: "/api/v1/published-content",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("org");
    const pageSlug = url.searchParams.get("page");

    console.log("🌐 [GET /api/v1/published-content] Query params:", { orgSlug, pageSlug });

    // Validate parameters
    if (!orgSlug || !pageSlug) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: org and page"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }

    // Fetch content using the publishing ontology query
    const content = await ctx.runQuery(api.publishingOntology.getPublishedContentForFrontend, {
      orgSlug,
      pageSlug,
    });

    if (!content) {
      return new Response(
        JSON.stringify({
          error: "Published page not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }

    console.log("✅ [GET /api/v1/published-content] Content found:", {
      page: content.page.name,
      events: content.events.length,
      checkout: content.checkout ? "loaded" : "none",
      forms: content.forms.length,
    });

    // Return content
    return new Response(
      JSON.stringify(content),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request.headers.get("origin")),
        },
      }
    );
  }),
});

/**
 * ==========================================
 * ZAPIER WEBHOOK ENDPOINTS
 * ==========================================
 *
 * REST Hook subscription management for Zapier integrations.
 * Allows Zapier to subscribe/unsubscribe to platform events.
 */

// POST /api/v1/webhooks/subscribe - Subscribe to webhook
http.route({
  path: "/api/v1/webhooks/subscribe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.json();
      const { event, target_url } = body;

      // Validate required fields
      if (!event || !target_url) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: event, target_url" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Call Convex mutation to create subscription
      const result = await ctx.runMutation(api.zapier.webhooks.subscribeWebhook, {
        event,
        target_url,
      });

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[Webhooks API] Subscribe error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to subscribe webhook" }),
        {
          status: error.data?.code === "UNAUTHORIZED" ? 401 : 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// DELETE /api/v1/webhooks/:id - Unsubscribe from webhook
http.route({
  pathPrefix: "/api/v1/webhooks/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const subscriptionId = pathParts[pathParts.length - 1];

      if (!subscriptionId || subscriptionId === "webhooks") {
        return new Response(
          JSON.stringify({ error: "Subscription ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Call Convex mutation to delete subscription
      await ctx.runMutation(api.zapier.webhooks.unsubscribeWebhook, {
        subscriptionId: subscriptionId as any,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[Webhooks API] Unsubscribe error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to unsubscribe webhook" }),
        {
          status: error.data?.code === "UNAUTHORIZED" ? 401 : 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// GET /api/v1/community/subscriptions - List community subscriptions (for Zapier testing)
http.route({
  path: "/api/v1/community/subscriptions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // This endpoint is for Zapier's "Load Sample Data" feature
      // Returns example community subscriptions for testing triggers

      // In production, this should query real data
      // For now, return sample data structure
      const sampleData = [
        {
          id: "sample-1",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          stripeSubscriptionId: "sub_sample123",
          customCourseAccess: ["foundations"],
          createdAt: Date.now(),
        },
      ];

      return new Response(JSON.stringify(sampleData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[Community API] List subscriptions error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to list subscriptions" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * ==========================================
 * OAUTH 2.0 ENDPOINTS
 * ==========================================
 *
 * OAuth 2.0 Authorization Code flow with PKCE support.
 * Allows third-party apps (Zapier, Make, etc.) to access VC83 APIs.
 */

// Import OAuth handlers
import { authorize, authorizePost, token, revoke } from "./oauth/endpoints";

// GET /oauth/authorize - Show consent screen
http.route({
  path: "/oauth/authorize",
  method: "GET",
  handler: authorize,
});

// POST /oauth/authorize - Handle user approval/denial
http.route({
  path: "/oauth/authorize",
  method: "POST",
  handler: authorizePost,
});

// POST /oauth/token - Exchange authorization code for access token
http.route({
  path: "/oauth/token",
  method: "POST",
  handler: token,
});

// POST /oauth/revoke - Revoke access or refresh token
http.route({
  path: "/oauth/revoke",
  method: "POST",
  handler: revoke,
});

/**
 * SELF-SERVICE SIGNUP ENDPOINT
 *
 * Allows users to create free accounts with auto-organization creation.
 * Part of Starter Conversion Path: Template → Create account → Use platform → Upgrade
 */
http.route({
  path: "/api/signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.json();
      const { email, password, firstName, lastName, organizationName } = body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: email, password, firstName, lastName",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(request.headers.get("origin")),
            },
          }
        );
      }

      // Call signup action
      const result = await ctx.runAction(api.onboarding.signupFreeAccount, {
        email,
        password,
        firstName,
        lastName,
        organizationName,
      });

      // Return success with session and API key
      return new Response(
        JSON.stringify(result),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    } catch (error: any) {
      console.error("Signup error:", error);

      // Handle specific error codes
      const errorMessage = error.data?.code === "EMAIL_EXISTS"
        ? "An account with this email already exists"
        : error.data?.code === "WEAK_PASSWORD"
        ? "Password must be at least 8 characters long"
        : error.data?.code === "INVALID_EMAIL"
        ? "Invalid email format"
        : error.data?.code === "DISPOSABLE_EMAIL"
        ? "Please use a permanent email address"
        : error.message || "Signup failed";

      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: error.data?.code,
        }),
        {
          status: error.data?.code === "EMAIL_EXISTS" ? 409 : 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request.headers.get("origin")),
          },
        }
      );
    }
  }),
});

// OPTIONS /api/signup - CORS preflight
http.route({
  path: "/api/signup",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

export default http;
