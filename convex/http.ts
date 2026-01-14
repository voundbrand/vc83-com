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
import type { Id } from "./_generated/dataModel";
import type Stripe from "stripe";

// Helper to get error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Helper to check if error has data property with code
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { code?: string } }).data;
    return data?.code;
  }
  return undefined;
}

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
 *
 * IMPORTANT: For development with Stripe CLI:
 * - Run `stripe listen --forward-to https://your-site.convex.site/stripe-connect-webhooks`
 * - Copy the webhook secret (starts with whsec_)
 * - Set it: `npx convex env set STRIPE_WEBHOOK_SECRET whsec_...`
 * - Restart Convex dev server
 */
http.route({
  path: "/stripe-connect-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    let responseStatus = 200;
    
    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      console.log("[Connect Webhook] 📥 Received webhook request", {
        hasSignature: !!signature,
        bodyLength: body.length,
        url: request.url,
      });

      if (!signature) {
        console.error("[Connect Webhook] ❌ Missing signature header");
        responseStatus = 400;
        return new Response("Missing signature", { status: 400 });
      }

      // Get Stripe provider
      let provider;
      try {
        provider = getProviderByCode("stripe-connect");
      } catch (error) {
        console.error("[Connect Webhook] ❌ Stripe provider not configured:", error);
        responseStatus = 500;
        return new Response("Payment provider not configured", { status: 500 });
      }

      // Log current environment secret for debugging
      const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
      console.log("[Connect Webhook] 🔑 Environment check", {
        envSecretConfigured: !!envSecret,
        envSecretPrefix: envSecret ? envSecret.substring(0, 15) + "..." : "not set",
        envSecretLength: envSecret?.length || 0,
      });

      // Try to parse event ID for idempotency check (before signature verification)
      let eventId: string | null = null;
      try {
        const event = JSON.parse(body);
        eventId = event.id;
      } catch {
        // If we can't parse, continue with signature verification
      }

      // Verify signature using provider (async required in Convex runtime)
      const isValidSignature = await provider.verifyWebhookSignature(body, signature);

      if (!isValidSignature) {
        // Check if this might be a retry of an already-processed event
        // (Stripe CLI sometimes modifies body slightly on retry, causing sig verification to fail)
        if (eventId) {
          const alreadyProcessed = await ctx.runQuery(
            internal.stripeWebhooks.checkEventProcessed,
            { eventId }
          );
          
          if (alreadyProcessed) {
            console.log(`[Connect Webhook] ℹ️ Event ${eventId} already processed, returning 200 (idempotency)`);
            responseStatus = 200;
            return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const eventType = eventId ? (() => {
          try {
            const event = JSON.parse(body);
            return event.type;
          } catch {
            return "unknown";
          }
        })() : "unknown";
        
        console.error("[Connect Webhook] ❌ Signature verification failed", {
          eventType,
          eventId: eventId || "unknown",
          hasSignature: !!signature,
          bodyLength: body.length,
          signaturePrefix: signature ? signature.substring(0, 30) + "..." : "missing",
        });
        console.error("[Connect Webhook] 💡 Tip: Ensure STRIPE_WEBHOOK_SECRET matches the secret from 'stripe listen' output");
        console.error("[Connect Webhook] 💡 Tip: Restart Convex dev server after updating environment variables");
        console.error("[Connect Webhook] 💡 Note: Stripe CLI may retry failed webhooks - this is normal");
        responseStatus = 400;
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      const event = JSON.parse(body);
      console.log(`[Connect Webhook] ✅ Signature verified: ${event.type} (${event.id})`);

      // Process Connect-specific events
      await ctx.runAction(internal.stripeWebhooks.processWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: JSON.stringify(event.data.object),
        created: event.created,
        signature: signature,
      });

      const duration = Date.now() - startTime;
      console.log(`[Connect Webhook] ✅ Successfully processed ${event.type} in ${duration}ms`);
      
      responseStatus = 200;
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Connect Webhook] ❌ Error after ${duration}ms:`, error);
      responseStatus = 500;
      return new Response("Internal server error", { status: 500 });
    } finally {
      console.log(`[Connect Webhook] 📤 Responding with status ${responseStatus}`);
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
      let event: Stripe.Event;
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
        invoiceData: event.data.object as Stripe.Invoice,
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
      let event: Stripe.Event;
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
      const eventObject = event.data.object as unknown as Record<string, unknown>;
      console.log(`[AI Webhooks] 📧 Customer email: ${eventObject.customer_email || 'N/A'}`);

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
import {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  getEventAttendees,
  getEventBySlug,
  getEventProducts,
  cancelEvent,
} from "./api/v1/events";
import {
  listProducts,
  handleProductsGet,
  handleProductsPost,
  handleProductsPatch,
  handleProductsDelete,
  handleOptions as productsHandleOptions,
} from "./api/v1/products";
import {
  listForms,
  createForm,
  getForm,
  getFormResponses,
  submitFormResponse,
  deleteForm,
  getPublicForm,
  submitPublicForm,
} from "./api/v1/forms";
import { triggerWorkflow } from "./api/v1/workflows";
import { getTransaction } from "./api/v1/transactions";
import {
  getTicketPdf,
  listTickets,
  validateTicket,
  handleTicketsGet,
  handleTicketsPost,
  handleOptions as ticketsHandleOptions,
} from "./api/v1/tickets";
import {
  getCheckoutConfig,
  createCheckoutSession,
  confirmPayment,
  listCheckoutSessions,
  handleCheckoutSessionsGet,
  handleCheckoutSessionsPost,
  handleOptions as checkoutHandleOptions,
} from "./api/v1/checkout";
import {
  createContactFromEvent,
  createContact,
  listContacts,
  getContact,
  updateContact,
  deleteContact,
  bulkImportContacts,
  exportContacts,
  listCrmOrganizations,
  createCrmOrganization,
  getCrmOrganization,
  updateCrmOrganization,
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
import {
  createBenefit,
  listBenefits,
  getBenefit,
  updateBenefit,
  deleteBenefit,
  createClaim,
  listClaims,
  createCommission,
  listCommissions,
  getCommission,
  createPayout,
  listPayouts,
} from "./api/v1/benefits";
import {
  listCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  batchIssueCertificates,
  verifyCertificate,
  getCertificatesByRecipient,
  handleOptions as certificatesHandleOptions,
  handleCertificatePost,
} from "./api/v1/certificates";
import {
  listPublishedPages,
  createPublishedPage,
  updatePublishedPage,
  deletePublishedPage,
  handlePublishingPost,
  handlePublishingGet,
  handleOptions as publishingHandleOptions,
} from "./api/v1/publishing";
import {
  listOAuthConnections,
  handleOAuthConnectionsGet,
  handleOAuthConnectionsPost,
  handleOAuthConnectionsPatch,
  handleOAuthConnectionsDelete,
  handleOptions as oauthConnectionsHandleOptions,
} from "./api/v1/oauthConnections";
import {
  listLocations,
  createLocation,
  getLocation,
  updateLocation,
  deleteLocation,
} from "./api/v1/locations";
import {
  getResourceAvailability,
  setWeeklySchedule,
  createException,
  createBlock,
  deleteAvailability,
  getAvailableSlots,
} from "./api/v1/availability";
import {
  listResourceBookings,
  createResourceBooking,
  getResourceBooking,
  confirmResourceBooking,
  checkInResourceBooking,
  completeResourceBooking,
  cancelResourceBooking,
} from "./api/v1/resourceBookings";
import {
  handleOptions as aiChatHandleOptions,
  createConversation as aiChatCreateConversation,
  listConversations as aiChatListConversations,
  getConversation as aiChatGetConversation,
  sendMessage as aiChatSendMessage,
  getSettings as aiChatGetSettings,
  getModels as aiChatGetModels,
  handleToolAction as aiChatHandleToolAction,
  getPendingTools as aiChatGetPendingTools,
  updateConversation as aiChatUpdateConversation,
  archiveConversation as aiChatArchiveConversation,
  listOrganizations as aiChatListOrganizations,
  switchOrganization as aiChatSwitchOrganization,
} from "./api/v1/aiChat";

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
  handler: listEvents,
});

// POST /api/v1/events (create event)
http.route({
  path: "/api/v1/events",
  method: "POST",
  handler: createEvent,
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

// OPTIONS /api/v1/events/:eventId (CORS preflight for event paths)
http.route({
  pathPrefix: "/api/v1/events/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/events/:eventId/attendees (get event attendees)
http.route({
  path: "/api/v1/events/:eventId/attendees",
  method: "GET",
  handler: getEventAttendees,
});

// GET /api/v1/events/:eventId/products (get event products)
http.route({
  path: "/api/v1/events/:eventId/products",
  method: "GET",
  handler: getEventProducts,
});

// POST /api/v1/events/:eventId/cancel (cancel event)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/events/",
  method: "POST",
  handler: cancelEvent,
});

// GET /api/v1/events/:eventId (get event by ID)
// Uses pathPrefix to handle dynamic eventId parameter
http.route({
  pathPrefix: "/api/v1/events/",
  method: "GET",
  handler: getEvent,
});

// PATCH /api/v1/events/:eventId (update event)
http.route({
  pathPrefix: "/api/v1/events/",
  method: "PATCH",
  handler: updateEvent,
});

// ============================================================================
// LAYER 4: PRODUCTS API (Full CRUD)
// ============================================================================

// GET /api/v1/products (list products)
http.route({
  path: "/api/v1/products",
  method: "GET",
  handler: listProducts,
});

// POST /api/v1/products (create product)
http.route({
  path: "/api/v1/products",
  method: "POST",
  handler: handleProductsPost,
});

// OPTIONS /api/v1/products (CORS preflight)
http.route({
  path: "/api/v1/products",
  method: "OPTIONS",
  handler: productsHandleOptions,
});

// GET /api/v1/products/:productId (get product by ID)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "GET",
  handler: handleProductsGet,
});

// POST /api/v1/products/:productId/* (publish, archive, price)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "POST",
  handler: handleProductsPost,
});

// PATCH /api/v1/products/:productId (update product)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "PATCH",
  handler: handleProductsPatch,
});

// DELETE /api/v1/products/:productId (delete product)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "DELETE",
  handler: handleProductsDelete,
});

// OPTIONS /api/v1/products/:productId/* (CORS preflight)
http.route({
  pathPrefix: "/api/v1/products/",
  method: "OPTIONS",
  handler: productsHandleOptions,
});

// ============================================================================
// LAYER 5: FORMS API
// ============================================================================

// GET /api/v1/forms (list forms - authenticated)
http.route({
  path: "/api/v1/forms",
  method: "GET",
  handler: listForms,
});

// POST /api/v1/forms (create form - authenticated)
http.route({
  path: "/api/v1/forms",
  method: "POST",
  handler: createForm,
});

// GET /api/v1/forms/:formId/responses (get form responses - authenticated)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/forms/",
  method: "GET",
  handler: getForm, // Handler checks for /responses suffix internally
});

// POST /api/v1/forms/:formId/responses (submit form response - authenticated)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/forms/",
  method: "POST",
  handler: submitFormResponse, // Handler checks for /responses suffix internally
});

// DELETE /api/v1/forms/:formId (delete form - authenticated)
// Uses pathPrefix because Convex doesn't support Express-style :param in path
http.route({
  pathPrefix: "/api/v1/forms/",
  method: "DELETE",
  handler: deleteForm,
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
 * Layer 2: CHECKOUT APIs (Payment Processing + Session CRUD)
 */

// GET /api/v1/checkout/config - Get payment provider configuration
http.route({
  path: "/api/v1/checkout/config",
  method: "GET",
  handler: getCheckoutConfig,
});

// GET /api/v1/checkout/sessions - List checkout sessions
http.route({
  path: "/api/v1/checkout/sessions",
  method: "GET",
  handler: listCheckoutSessions,
});

// POST /api/v1/checkout/sessions - Create checkout session
http.route({
  path: "/api/v1/checkout/sessions",
  method: "POST",
  handler: createCheckoutSession,
});

// OPTIONS /api/v1/checkout/sessions (CORS preflight)
http.route({
  path: "/api/v1/checkout/sessions",
  method: "OPTIONS",
  handler: checkoutHandleOptions,
});

// GET /api/v1/checkout/sessions/:sessionId - Get session details
http.route({
  pathPrefix: "/api/v1/checkout/sessions/",
  method: "GET",
  handler: handleCheckoutSessionsGet,
});

// POST /api/v1/checkout/sessions/:sessionId/cancel - Cancel session
http.route({
  pathPrefix: "/api/v1/checkout/sessions/",
  method: "POST",
  handler: handleCheckoutSessionsPost,
});

// OPTIONS /api/v1/checkout/sessions/:sessionId/* (CORS preflight)
http.route({
  pathPrefix: "/api/v1/checkout/sessions/",
  method: "OPTIONS",
  handler: checkoutHandleOptions,
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

/**
 * Layer 4b: TICKETS API
 *
 * Endpoints for managing event tickets.
 * Security: Dual auth (API keys + OAuth tokens with tickets:read/write scopes)
 */

// OPTIONS /api/v1/tickets - CORS preflight
http.route({
  path: "/api/v1/tickets",
  method: "OPTIONS",
  handler: ticketsHandleOptions,
});

// OPTIONS /api/v1/tickets/* - CORS preflight for all ticket paths
http.route({
  pathPrefix: "/api/v1/tickets/",
  method: "OPTIONS",
  handler: ticketsHandleOptions,
});

// GET /api/v1/tickets - List tickets
http.route({
  path: "/api/v1/tickets",
  method: "GET",
  handler: listTickets,
});

// POST /api/v1/tickets/validate - Validate ticket by QR code
http.route({
  path: "/api/v1/tickets/validate",
  method: "POST",
  handler: validateTicket,
});

// GET /api/v1/tickets/:ticketId or /pdf
// Combined handler routes based on URL path
http.route({
  pathPrefix: "/api/v1/tickets/",
  method: "GET",
  handler: handleTicketsGet,
});

// POST /api/v1/tickets/:ticketId/redeem or /void
// Combined handler routes based on URL path
http.route({
  pathPrefix: "/api/v1/tickets/",
  method: "POST",
  handler: handleTicketsPost,
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
// Uses the exported getContact handler from crm.ts which supports CLI sessions
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "GET",
  handler: getContact,
});

// PATCH /api/v1/crm/contacts/:contactId - Update contact
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "PATCH",
  handler: updateContact,
});

// DELETE /api/v1/crm/contacts/:contactId - Delete contact
http.route({
  pathPrefix: "/api/v1/crm/contacts/",
  method: "DELETE",
  handler: deleteContact,
});

/**
 * Layer 5b: CRM Organization APIs
 */

// GET /api/v1/crm/organizations - List CRM organizations
http.route({
  path: "/api/v1/crm/organizations",
  method: "GET",
  handler: listCrmOrganizations,
});

// POST /api/v1/crm/organizations - Create CRM organization
http.route({
  path: "/api/v1/crm/organizations",
  method: "POST",
  handler: createCrmOrganization,
});

// GET /api/v1/crm/organizations/:organizationId - Get CRM organization details
http.route({
  pathPrefix: "/api/v1/crm/organizations/",
  method: "GET",
  handler: getCrmOrganization,
});

// PATCH /api/v1/crm/organizations/:organizationId - Update CRM organization
http.route({
  pathPrefix: "/api/v1/crm/organizations/",
  method: "PATCH",
  handler: updateCrmOrganization,
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
          crmOrganizationId: crmOrganizationId as Id<"objects">,
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
 * Layer 7.6: BENEFITS API (Benefits & Commissions Management)
 *
 * Endpoints for managing benefits, claims, commissions, and payouts.
 * Security: Dual auth (API keys + OAuth tokens with benefits:read/write scopes)
 */

// OPTIONS /api/v1/benefits - CORS preflight
http.route({
  path: "/api/v1/benefits",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// OPTIONS /api/v1/benefits/:benefitId - CORS preflight
http.route({
  pathPrefix: "/api/v1/benefits/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// OPTIONS /api/v1/commissions - CORS preflight
http.route({
  path: "/api/v1/commissions",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// OPTIONS /api/v1/commissions/:commissionId - CORS preflight
http.route({
  pathPrefix: "/api/v1/commissions/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// POST /api/v1/benefits - Create benefit
http.route({
  path: "/api/v1/benefits",
  method: "POST",
  handler: createBenefit,
});

// GET /api/v1/benefits - List benefits
http.route({
  path: "/api/v1/benefits",
  method: "GET",
  handler: listBenefits,
});

// GET /api/v1/benefits/:benefitId - Get benefit details
http.route({
  path: "/api/v1/benefits/:benefitId",
  method: "GET",
  handler: getBenefit,
});

// PATCH /api/v1/benefits/:benefitId - Update benefit
http.route({
  path: "/api/v1/benefits/:benefitId",
  method: "PATCH",
  handler: updateBenefit,
});

// DELETE /api/v1/benefits/:benefitId - Delete benefit (draft only)
http.route({
  path: "/api/v1/benefits/:benefitId",
  method: "DELETE",
  handler: deleteBenefit,
});

// POST /api/v1/benefits/:benefitId/claims - Create claim
http.route({
  path: "/api/v1/benefits/:benefitId/claims",
  method: "POST",
  handler: createClaim,
});

// GET /api/v1/benefits/:benefitId/claims - List claims for benefit
http.route({
  path: "/api/v1/benefits/:benefitId/claims",
  method: "GET",
  handler: listClaims,
});

// POST /api/v1/commissions - Create commission
http.route({
  path: "/api/v1/commissions",
  method: "POST",
  handler: createCommission,
});

// GET /api/v1/commissions - List commissions
http.route({
  path: "/api/v1/commissions",
  method: "GET",
  handler: listCommissions,
});

// GET /api/v1/commissions/:commissionId - Get commission details
http.route({
  path: "/api/v1/commissions/:commissionId",
  method: "GET",
  handler: getCommission,
});

// POST /api/v1/commissions/:commissionId/payouts - Create payout
http.route({
  path: "/api/v1/commissions/:commissionId/payouts",
  method: "POST",
  handler: createPayout,
});

// GET /api/v1/commissions/:commissionId/payouts - List payouts
http.route({
  path: "/api/v1/commissions/:commissionId/payouts",
  method: "GET",
  handler: listPayouts,
});

/**
 * Layer 7.7: CERTIFICATES API (CE/CME/CPD Credits)
 *
 * Endpoints for managing certificates and continuing education credits.
 * Security: Dual auth (API keys + OAuth tokens with certificates:read/write scopes)
 */

// OPTIONS /api/v1/certificates - CORS preflight
http.route({
  path: "/api/v1/certificates",
  method: "OPTIONS",
  handler: certificatesHandleOptions,
});

// OPTIONS /api/v1/certificates/* - CORS preflight for all certificate paths
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "OPTIONS",
  handler: certificatesHandleOptions,
});

// GET /api/v1/certificates/verify/:certificateNumber - Verify certificate (PUBLIC - no auth)
// Must be before the pathPrefix route for /:certificateId
http.route({
  pathPrefix: "/api/v1/certificates/verify/",
  method: "GET",
  handler: verifyCertificate,
});

// GET /api/v1/certificates/recipient/:email - Get certificates by recipient
http.route({
  pathPrefix: "/api/v1/certificates/recipient/",
  method: "GET",
  handler: getCertificatesByRecipient,
});

// POST /api/v1/certificates/batch - Batch issue certificates
http.route({
  path: "/api/v1/certificates/batch",
  method: "POST",
  handler: batchIssueCertificates,
});

// POST /api/v1/certificates - Create certificate
http.route({
  path: "/api/v1/certificates",
  method: "POST",
  handler: createCertificate,
});

// GET /api/v1/certificates - List certificates
http.route({
  path: "/api/v1/certificates",
  method: "GET",
  handler: listCertificates,
});

// POST /api/v1/certificates/:certificateId/revoke or /reinstate
// Combined handler routes based on URL path suffix
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "POST",
  handler: handleCertificatePost,
});

// GET /api/v1/certificates/:certificateId - Get certificate details
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "GET",
  handler: getCertificate,
});

// PATCH /api/v1/certificates/:certificateId - Update certificate
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "PATCH",
  handler: updateCertificate,
});

// DELETE /api/v1/certificates/:certificateId - Delete certificate
http.route({
  pathPrefix: "/api/v1/certificates/",
  method: "DELETE",
  handler: deleteCertificate,
});

/**
 * Layer 8: BOOKINGS API (Event Registration)
 */

/**
 * Layer 7.8: PUBLISHING API (Published Pages Management)
 *
 * Endpoints for managing published pages via CLI/MCP.
 * Security: Dual auth (API keys + OAuth tokens with publishing:read/write scopes)
 */

// OPTIONS /api/v1/publishing/pages - CORS preflight
http.route({
  path: "/api/v1/publishing/pages",
  method: "OPTIONS",
  handler: publishingHandleOptions,
});

// OPTIONS /api/v1/publishing/pages/* - CORS preflight for all publishing paths
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "OPTIONS",
  handler: publishingHandleOptions,
});

// GET /api/v1/publishing/pages/:pageId or /analytics
// Combined handler routes based on URL path
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "GET",
  handler: handlePublishingGet,
});

// POST /api/v1/publishing/pages - Create published page
http.route({
  path: "/api/v1/publishing/pages",
  method: "POST",
  handler: createPublishedPage,
});

// GET /api/v1/publishing/pages - List published pages
http.route({
  path: "/api/v1/publishing/pages",
  method: "GET",
  handler: listPublishedPages,
});

// POST /api/v1/publishing/pages/:pageId/publish or /unpublish
// Combined handler routes based on URL path suffix
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "POST",
  handler: handlePublishingPost,
});

// PATCH /api/v1/publishing/pages/:pageId - Update page
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "PATCH",
  handler: updatePublishedPage,
});

// DELETE /api/v1/publishing/pages/:pageId - Delete page
http.route({
  pathPrefix: "/api/v1/publishing/pages/",
  method: "DELETE",
  handler: deletePublishedPage,
});

/**
 * Layer 7.9: OAUTH CONNECTIONS API (OAuth Account Management)
 *
 * Endpoints for managing OAuth connections via CLI/MCP.
 * Security: Triple auth (API keys, OAuth tokens, CLI sessions) with oauth:read/write scopes
 * NOTE: Token values are NEVER exposed via these endpoints for security.
 */

// OPTIONS /api/v1/oauth/connections - CORS preflight
http.route({
  path: "/api/v1/oauth/connections",
  method: "OPTIONS",
  handler: oauthConnectionsHandleOptions,
});

// OPTIONS /api/v1/oauth/connections/* - CORS preflight for all oauth paths
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "OPTIONS",
  handler: oauthConnectionsHandleOptions,
});

// GET /api/v1/oauth/connections - List OAuth connections
http.route({
  path: "/api/v1/oauth/connections",
  method: "GET",
  handler: listOAuthConnections,
});

// GET /api/v1/oauth/connections/:connectionId - Get connection details
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "GET",
  handler: handleOAuthConnectionsGet,
});

// POST /api/v1/oauth/connections/:connectionId/disconnect - Disconnect connection
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "POST",
  handler: handleOAuthConnectionsPost,
});

// PATCH /api/v1/oauth/connections/:connectionId - Update sync settings
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "PATCH",
  handler: handleOAuthConnectionsPatch,
});

// DELETE /api/v1/oauth/connections/:connectionId - Delete connection permanently
http.route({
  pathPrefix: "/api/v1/oauth/connections/",
  method: "DELETE",
  handler: handleOAuthConnectionsDelete,
});

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
    } catch (error: unknown) {
      console.error("[Webhooks API] Subscribe error:", error);
      const errorCode = getErrorCode(error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) || "Failed to subscribe webhook" }),
        {
          status: errorCode === "UNAUTHORIZED" ? 401 : 400,
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
        subscriptionId: subscriptionId as Id<"webhookSubscriptions">,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("[Webhooks API] Unsubscribe error:", error);
      const errorCode = getErrorCode(error);
      return new Response(
        JSON.stringify({ error: getErrorMessage(error) || "Failed to unsubscribe webhook" }),
        {
          status: errorCode === "UNAUTHORIZED" ? 401 : 404,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: httpAction(async (_ctx, _request) => {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Signup error:", error);

      // Handle specific error codes
      const errorCode = getErrorCode(error);
      const errorMessage = errorCode === "EMAIL_EXISTS"
        ? "An account with this email already exists"
        : errorCode === "WEAK_PASSWORD"
        ? "Password must be at least 8 characters long"
        : errorCode === "INVALID_EMAIL"
        ? "Invalid email format"
        : errorCode === "DISPOSABLE_EMAIL"
        ? "Please use a permanent email address"
        : getErrorMessage(error) || "Signup failed";

      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: errorCode,
        }),
        {
          status: errorCode === "EMAIL_EXISTS" ? 409 : 400,
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

/**
 * ==========================================
 * MUX WEBHOOK ENDPOINT
 * ==========================================
 *
 * Receives webhooks from Mux for video processing events.
 * Events handled:
 * - video.asset.created: Asset is being processed
 * - video.asset.ready: Video is ready for playback
 * - video.asset.errored: Processing failed
 * - video.live_stream.active: Live stream started
 * - video.live_stream.idle: Live stream stopped
 */
http.route({
  path: "/mux-webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[Mux Webhook] 📥 Received webhook request");

    try {
      const body = await request.text();
      const signature = request.headers.get("mux-signature");

      if (!signature) {
        console.error("[Mux Webhook] ❌ No signature provided");
        return new Response("Missing signature", { status: 400 });
      }

      // Verify webhook signature
      const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Mux Webhook] ❌ MUX_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      // Verify signature using Mux's format
      const { verifyMuxWebhookSignature } = await import("./actions/mux");
      const isValid = verifyMuxWebhookSignature(body, signature, webhookSecret);

      if (!isValid) {
        console.error("[Mux Webhook] ❌ Signature verification failed");
        return new Response("Invalid signature", { status: 400 });
      }

      // Parse event
      const event = JSON.parse(body);
      console.log(`[Mux Webhook] ✅ Verified event: ${event.type} (${event.id})`);

      // Process webhook
      await ctx.runAction(internal.actions.mux.processMuxWebhook, {
        eventType: event.type,
        eventId: event.id,
        eventData: event.data,
      });

      console.log(`[Mux Webhook] ✅ Event queued for processing`);

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Mux Webhook] ❌ Processing error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Import CLI auth HTTP handlers
import {
  validateSession as cliValidateSession,
  refreshSession as cliRefreshSession,
  revokeSession as cliRevokeSession,
  listOrganizations as cliListOrganizations,
  createOrganization as cliCreateOrganization,
  listApiKeys as cliListApiKeys,
  generateApiKey as cliGenerateApiKey,
  handleOptions as cliAuthHandleOptions,
} from "./api/v1/cliAuthHttp";

// Import Mobile OAuth handlers
import {
  mobileOAuthHandler,
  mobileOAuthOptionsHandler,
} from "./api/v1/mobileOAuth";

// Import Account Linking handlers
import {
  confirmLinking,
  rejectLinking,
  getLinkingStatus,
  handleOptions as accountLinkingHandleOptions,
} from "./api/v1/accountLinking";

/**
 * ==========================================
 * MOBILE OAUTH API
 * ==========================================
 *
 * Native mobile OAuth authentication for iOS/Android apps.
 * Accepts user info from native OAuth SDKs (Google Sign-In, Apple Sign-In)
 * and creates/logs into platform users.
 */

// OPTIONS /api/v1/auth/mobile-oauth - CORS preflight
http.route({
  path: "/api/v1/auth/mobile-oauth",
  method: "OPTIONS",
  handler: mobileOAuthOptionsHandler,
});

// POST /api/v1/auth/mobile-oauth - Native mobile OAuth authentication
http.route({
  path: "/api/v1/auth/mobile-oauth",
  method: "POST",
  handler: mobileOAuthHandler,
});

/**
 * ==========================================
 * WEBINAR API v1 ENDPOINTS
 * ==========================================
 */

// Import webinar API handlers (these are httpAction wrapped - use directly as handlers)
import {
  updateWebinar,
  deleteWebinar,
  webinarGetRouter,
  webinarPostRouter,
} from "./api/v1/webinars";

// OPTIONS /api/v1/webinars/* - CORS preflight
http.route({
  pathPrefix: "/api/v1/webinars",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return handleOptionsRequest(origin);
  }),
});

// GET /api/v1/webinars/* - Master router for all GET requests
http.route({
  pathPrefix: "/api/v1/webinars",
  method: "GET",
  handler: webinarGetRouter,
});

// POST /api/v1/webinars/* - Master router for all POST requests
http.route({
  pathPrefix: "/api/v1/webinars",
  method: "POST",
  handler: webinarPostRouter,
});

// PATCH /api/v1/webinars/:id - Update webinar (authenticated)
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "PATCH",
  handler: updateWebinar,
});

// DELETE /api/v1/webinars/:id - Delete webinar (authenticated)
http.route({
  pathPrefix: "/api/v1/webinars/",
  method: "DELETE",
  handler: deleteWebinar,
});

/**
 * ==========================================
 * ACCOUNT LINKING API
 * ==========================================
 *
 * Handles account linking when a user signs in with a new OAuth provider
 * but their email matches an existing account.
 */

// OPTIONS /api/v1/auth/link-account/confirm - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/confirm",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// POST /api/v1/auth/link-account/confirm - Confirm account linking
http.route({
  path: "/api/v1/auth/link-account/confirm",
  method: "POST",
  handler: confirmLinking,
});

// OPTIONS /api/v1/auth/link-account/reject - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/reject",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// POST /api/v1/auth/link-account/reject - Reject account linking
http.route({
  path: "/api/v1/auth/link-account/reject",
  method: "POST",
  handler: rejectLinking,
});

// OPTIONS /api/v1/auth/link-account/status - CORS preflight
http.route({
  path: "/api/v1/auth/link-account/status",
  method: "OPTIONS",
  handler: accountLinkingHandleOptions,
});

// GET /api/v1/auth/link-account/status - Get linking status
http.route({
  path: "/api/v1/auth/link-account/status",
  method: "GET",
  handler: getLinkingStatus,
});

// OPTIONS /api/v1/auth/cli/validate - CORS preflight
http.route({
  path: "/api/v1/auth/cli/validate",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// GET /api/v1/auth/cli/validate - Validate CLI session
http.route({
  path: "/api/v1/auth/cli/validate",
  method: "GET",
  handler: cliValidateSession,
});

// OPTIONS /api/v1/auth/cli/refresh - CORS preflight
http.route({
  path: "/api/v1/auth/cli/refresh",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// POST /api/v1/auth/cli/refresh - Refresh CLI session
http.route({
  path: "/api/v1/auth/cli/refresh",
  method: "POST",
  handler: cliRefreshSession,
});

// OPTIONS /api/v1/auth/cli/revoke - CORS preflight
http.route({
  path: "/api/v1/auth/cli/revoke",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// POST /api/v1/auth/cli/revoke - Revoke CLI session (logout)
http.route({
  path: "/api/v1/auth/cli/revoke",
  method: "POST",
  handler: cliRevokeSession,
});

// OPTIONS /api/v1/auth/cli/organizations - CORS preflight
http.route({
  path: "/api/v1/auth/cli/organizations",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// GET /api/v1/auth/cli/organizations - List user's organizations
http.route({
  path: "/api/v1/auth/cli/organizations",
  method: "GET",
  handler: cliListOrganizations,
});

// POST /api/v1/auth/cli/organizations - Create organization
http.route({
  path: "/api/v1/auth/cli/organizations",
  method: "POST",
  handler: cliCreateOrganization,
});

// OPTIONS /api/v1/auth/cli/api-keys - CORS preflight
http.route({
  path: "/api/v1/auth/cli/api-keys",
  method: "OPTIONS",
  handler: cliAuthHandleOptions,
});

// GET /api/v1/auth/cli/api-keys - List API keys
http.route({
  path: "/api/v1/auth/cli/api-keys",
  method: "GET",
  handler: cliListApiKeys,
});

// POST /api/v1/auth/cli/api-keys - Generate API key
http.route({
  path: "/api/v1/auth/cli/api-keys",
  method: "POST",
  handler: cliGenerateApiKey,
});

/**
 * ==========================================
 * CLI APPLICATIONS API
 * ==========================================
 *
 * Endpoints for CLI-connected application management.
 * Uses CLI session token authentication (Bearer token).
 */

// Import CLI applications handlers
import {
  registerApplication as cliRegisterApplication,
  listApplications as cliListApplications,
  getApplicationByPath as cliGetApplicationByPath,
  getApplication as cliGetApplication,
  updateApplication as cliUpdateApplication,
  syncApplication as cliSyncApplication,
  handleOptions as cliHandleOptions,
} from "./api/v1/cliApplications";

// OPTIONS /api/v1/cli/applications - CORS preflight
http.route({
  path: "/api/v1/cli/applications",
  method: "OPTIONS",
  handler: cliHandleOptions,
});

// POST /api/v1/cli/applications - Register new application
http.route({
  path: "/api/v1/cli/applications",
  method: "POST",
  handler: cliRegisterApplication,
});

// GET /api/v1/cli/applications - List all applications
http.route({
  path: "/api/v1/cli/applications",
  method: "GET",
  handler: cliListApplications,
});

// OPTIONS /api/v1/cli/applications/by-path - CORS preflight
http.route({
  path: "/api/v1/cli/applications/by-path",
  method: "OPTIONS",
  handler: cliHandleOptions,
});

// GET /api/v1/cli/applications/by-path?hash={hash} - Find by project path
http.route({
  path: "/api/v1/cli/applications/by-path",
  method: "GET",
  handler: cliGetApplicationByPath,
});

// GET /api/v1/cli/applications/:id - Get application details (uses pathPrefix for dynamic ID)
http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "OPTIONS",
  handler: cliHandleOptions,
});

http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "GET",
  handler: cliGetApplication,
});

// PATCH /api/v1/cli/applications/:id - Update application
http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "PATCH",
  handler: cliUpdateApplication,
});

// POST /api/v1/cli/applications/:id/sync - Sync application data
http.route({
  pathPrefix: "/api/v1/cli/applications/",
  method: "POST",
  handler: cliSyncApplication,
});

// ============================================================================
// LOCATIONS API
// ============================================================================

// GET /api/v1/locations - List all locations
http.route({
  path: "/api/v1/locations",
  method: "GET",
  handler: listLocations,
});

// POST /api/v1/locations - Create location
http.route({
  path: "/api/v1/locations",
  method: "POST",
  handler: createLocation,
});

// GET /api/v1/locations/:id - Get location details
http.route({
  pathPrefix: "/api/v1/locations/",
  method: "GET",
  handler: getLocation,
});

// PATCH /api/v1/locations/:id - Update location
http.route({
  pathPrefix: "/api/v1/locations/",
  method: "PATCH",
  handler: updateLocation,
});

// DELETE /api/v1/locations/:id - Archive location
http.route({
  pathPrefix: "/api/v1/locations/",
  method: "DELETE",
  handler: deleteLocation,
});

// ============================================================================
// AVAILABILITY API
// ============================================================================

// GET /api/v1/resources/:id/availability - Get resource availability
http.route({
  pathPrefix: "/api/v1/resources/",
  method: "GET",
  handler: getResourceAvailability,
});

// POST /api/v1/resources/:id/availability/schedule - Set weekly schedule
http.route({
  pathPrefix: "/api/v1/resources/",
  method: "POST",
  handler: setWeeklySchedule,
});

// DELETE /api/v1/resources/:id/availability/:availId - Delete availability item
http.route({
  pathPrefix: "/api/v1/resources/",
  method: "DELETE",
  handler: deleteAvailability,
});

// ============================================================================
// RESOURCE BOOKINGS API
// ============================================================================

// GET /api/v1/resource-bookings - List all resource bookings
http.route({
  path: "/api/v1/resource-bookings",
  method: "GET",
  handler: listResourceBookings,
});

// POST /api/v1/resource-bookings - Create resource booking
http.route({
  path: "/api/v1/resource-bookings",
  method: "POST",
  handler: createResourceBooking,
});

// GET /api/v1/resource-bookings/:id - Get booking details
http.route({
  pathPrefix: "/api/v1/resource-bookings/",
  method: "GET",
  handler: getResourceBooking,
});

// POST /api/v1/resource-bookings/:id/confirm - Confirm booking
http.route({
  pathPrefix: "/api/v1/resource-bookings/",
  method: "POST",
  handler: confirmResourceBooking,
});

// ============================================================================
// AI CHAT API (Mobile App Integration)
// ============================================================================
//
// REST API for AI chat functionality, used by mobile apps (iOS/Android).
// Authentication: Bearer token (session ID from mobile OAuth)
//
// These endpoints wrap the existing Convex AI chat functions to provide
// HTTP access for mobile clients. Both web and mobile apps share the same
// underlying data and AI system.
// ============================================================================

// OPTIONS /api/v1/ai/conversations - CORS preflight
http.route({
  path: "/api/v1/ai/conversations",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/ai/conversations - Create new conversation
http.route({
  path: "/api/v1/ai/conversations",
  method: "POST",
  handler: aiChatCreateConversation,
});

// GET /api/v1/ai/conversations - List user's conversations
http.route({
  path: "/api/v1/ai/conversations",
  method: "GET",
  handler: aiChatListConversations,
});

// OPTIONS /api/v1/ai/conversations/:id - CORS preflight
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/conversations/:id - Get conversation with messages
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "GET",
  handler: aiChatGetConversation,
});

// PATCH /api/v1/ai/conversations/:id - Update conversation (rename)
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "PATCH",
  handler: aiChatUpdateConversation,
});

// DELETE /api/v1/ai/conversations/:id - Archive conversation
http.route({
  pathPrefix: "/api/v1/ai/conversations/",
  method: "DELETE",
  handler: aiChatArchiveConversation,
});

// OPTIONS /api/v1/ai/chat - CORS preflight
http.route({
  path: "/api/v1/ai/chat",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/ai/chat - Send message and get AI response
http.route({
  path: "/api/v1/ai/chat",
  method: "POST",
  handler: aiChatSendMessage,
});

// OPTIONS /api/v1/ai/settings - CORS preflight
http.route({
  path: "/api/v1/ai/settings",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/settings - Get organization AI settings
http.route({
  path: "/api/v1/ai/settings",
  method: "GET",
  handler: aiChatGetSettings,
});

// OPTIONS /api/v1/ai/models - CORS preflight
http.route({
  path: "/api/v1/ai/models",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/ai/models - Get available AI models
http.route({
  path: "/api/v1/ai/models",
  method: "GET",
  handler: aiChatGetModels,
});

// OPTIONS /api/v1/ai/tools/:id/* - CORS preflight
http.route({
  pathPrefix: "/api/v1/ai/tools/",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/ai/tools/:id/approve - Approve tool execution
// POST /api/v1/ai/tools/:id/reject - Reject tool execution
http.route({
  pathPrefix: "/api/v1/ai/tools/",
  method: "POST",
  handler: aiChatHandleToolAction,
});

// ============================================================================
// ORGANIZATION MANAGEMENT API (Mobile App Integration)
// ============================================================================
//
// REST API for organization switching, used by mobile apps.
// Allows users to switch between organizations they have access to.
// ============================================================================

// OPTIONS /api/v1/auth/organizations - CORS preflight
http.route({
  path: "/api/v1/auth/organizations",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// GET /api/v1/auth/organizations - List user's organizations
http.route({
  path: "/api/v1/auth/organizations",
  method: "GET",
  handler: aiChatListOrganizations,
});

// OPTIONS /api/v1/auth/switch-organization - CORS preflight
http.route({
  path: "/api/v1/auth/switch-organization",
  method: "OPTIONS",
  handler: aiChatHandleOptions,
});

// POST /api/v1/auth/switch-organization - Switch active organization
http.route({
  path: "/api/v1/auth/switch-organization",
  method: "POST",
  handler: aiChatSwitchOrganization,
});

// ============================================================================
// ACTIVITY PROTOCOL API
// ============================================================================
// Activity monitoring, page detection, and event logging for connected apps

// Import Activity Protocol handlers
import {
  logEvent as activityLogEvent,
  getEvents as activityGetEvents,
  getStats as activityGetStats,
  registerPage as activityRegisterPage,
  bulkRegisterPages as activityBulkRegisterPages,
  getPages as activityGetPages,
  updatePageBindings as activityUpdatePageBindings,
  deletePage as activityDeletePage,
  getSettings as activityGetSettings,
  updateSettings as activityUpdateSettings,
  handleOptions as activityHandleOptions,
} from "./api/v1/activityProtocol";

// OPTIONS /api/v1/activity/events - CORS preflight
http.route({
  path: "/api/v1/activity/events",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// POST /api/v1/activity/events - Log an activity event
http.route({
  path: "/api/v1/activity/events",
  method: "POST",
  handler: activityLogEvent,
});

// GET /api/v1/activity/events - Get activity events
http.route({
  path: "/api/v1/activity/events",
  method: "GET",
  handler: activityGetEvents,
});

// OPTIONS /api/v1/activity/stats - CORS preflight
http.route({
  path: "/api/v1/activity/stats",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// GET /api/v1/activity/stats - Get activity statistics
http.route({
  path: "/api/v1/activity/stats",
  method: "GET",
  handler: activityGetStats,
});

// OPTIONS /api/v1/activity/pages - CORS preflight
http.route({
  path: "/api/v1/activity/pages",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// POST /api/v1/activity/pages - Register a single page
http.route({
  path: "/api/v1/activity/pages",
  method: "POST",
  handler: activityRegisterPage,
});

// GET /api/v1/activity/pages - Get application pages
http.route({
  path: "/api/v1/activity/pages",
  method: "GET",
  handler: activityGetPages,
});

// OPTIONS /api/v1/activity/pages/bulk - CORS preflight
http.route({
  path: "/api/v1/activity/pages/bulk",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// POST /api/v1/activity/pages/bulk - Bulk register pages
http.route({
  path: "/api/v1/activity/pages/bulk",
  method: "POST",
  handler: activityBulkRegisterPages,
});

// OPTIONS /api/v1/activity/pages/:id - CORS preflight for page operations
http.route({
  pathPrefix: "/api/v1/activity/pages/",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// PATCH /api/v1/activity/pages/:id/bindings - Update page bindings
http.route({
  pathPrefix: "/api/v1/activity/pages/",
  method: "PATCH",
  handler: activityUpdatePageBindings,
});

// DELETE /api/v1/activity/pages/:id - Delete a page
http.route({
  pathPrefix: "/api/v1/activity/pages/",
  method: "DELETE",
  handler: activityDeletePage,
});

// OPTIONS /api/v1/activity/settings - CORS preflight
http.route({
  path: "/api/v1/activity/settings",
  method: "OPTIONS",
  handler: activityHandleOptions,
});

// GET /api/v1/activity/settings - Get activity settings
http.route({
  path: "/api/v1/activity/settings",
  method: "GET",
  handler: activityGetSettings,
});

// PATCH /api/v1/activity/settings - Update activity settings
http.route({
  path: "/api/v1/activity/settings",
  method: "PATCH",
  handler: activityUpdateSettings,
});

export default http;
