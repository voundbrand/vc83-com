/**
 * API V1: INVOICES ENDPOINTS
 *
 * External API for creating and managing invoices.
 * Used by external systems to manage invoice lifecycle.
 *
 * Endpoints:
 * - POST /api/v1/invoices - Create draft invoice
 * - GET /api/v1/invoices - List invoices
 * - GET /api/v1/invoices/:invoiceId - Get invoice details
 * - PATCH /api/v1/invoices/:invoiceId - Update draft invoice
 * - DELETE /api/v1/invoices/:invoiceId - Delete draft invoice
 * - POST /api/v1/invoices/:invoiceId/seal - Seal draft invoice
 * - POST /api/v1/invoices/:invoiceId/send - Send invoice
 * - GET /api/v1/invoices/:invoiceId/pdf - Get invoice PDF
 *
 * Security: API key required in Authorization header
 * Scope: Returns only invoices for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * CREATE INVOICE
 * Creates a new draft invoice
 *
 * POST /api/v1/invoices
 *
 * Request Body:
 * {
 *   crmOrganizationId: string,         // CRM organization to bill
 *   billToName: string,
 *   billToEmail: string,
 *   billToVatNumber?: string,
 *   billToAddress?: {
 *     street?: string,
 *     city?: string,
 *     state?: string,
 *     postalCode?: string,
 *     country?: string
 *   },
 *   lineItems: Array<{
 *     description: string,
 *     quantity: number,
 *     unitPriceInCents: number,
 *     totalPriceInCents: number
 *   }>,
 *   subtotalInCents: number,
 *   taxInCents: number,
 *   totalInCents: number,
 *   currency: string,
 *   invoiceDate: number,              // Unix timestamp
 *   dueDate: number,                   // Unix timestamp
 *   paymentTerms?: string,             // "net30", "net60", etc.
 *   notes?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   invoiceId: string,
 *   message: string
 * }
 */
export const createInvoice = httpAction(async (ctx, request) => {
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

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse request body
    const body = await request.json();
    const {
      crmOrganizationId,
      billToName,
      billToEmail,
      billToVatNumber,
      billToAddress,
      lineItems,
      subtotalInCents,
      taxInCents,
      totalInCents,
      currency,
      invoiceDate,
      dueDate,
      paymentTerms,
      notes,
    } = body;

    // Validate required fields
    if (!crmOrganizationId || !billToName || !billToEmail || !lineItems || !currency || !invoiceDate || !dueDate) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: crmOrganizationId, billToName, billToEmail, lineItems, currency, invoiceDate, dueDate"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create invoice
    const invoiceId = await ctx.runMutation(
      internal.api.v1.invoicesInternal.createInvoiceInternal,
      {
        organizationId,
        crmOrganizationId,
        billToName,
        billToEmail,
        billToVatNumber,
        billToAddress,
        lineItems,
        subtotalInCents,
        taxInCents,
        totalInCents,
        currency,
        invoiceDate,
        dueDate,
        paymentTerms,
        notes,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        invoiceId,
        message: "Draft invoice created successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices (create) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST INVOICES
 * Lists invoices for an organization
 *
 * GET /api/v1/invoices
 *
 * Query Parameters:
 * - status: Filter by payment status (draft, sent, paid, overdue, cancelled, awaiting_employer_payment)
 * - type: Filter by invoice type (b2b_consolidated, b2b_single, b2c_single)
 * - isDraft: Filter by draft status (true/false)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   invoices: Array<{
 *     id: string,
 *     organizationId: string,
 *     invoiceNumber: string,
 *     invoiceDate: number,
 *     dueDate: number,
 *     type: string,
 *     status: string,
 *     isDraft: boolean,
 *     billTo: object,
 *     subtotalInCents: number,
 *     taxInCents: number,
 *     totalInCents: number,
 *     currency: string,
 *     paidAt: number,
 *     createdAt: number,
 *     updatedAt: number
 *   }>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listInvoices = httpAction(async (ctx, request) => {
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
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const isDraftParam = url.searchParams.get("isDraft");
    const isDraft = isDraftParam === "true" ? true : isDraftParam === "false" ? false : undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      200
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query invoices
    const result = await ctx.runQuery(
      internal.api.v1.invoicesInternal.listInvoicesInternal,
      {
        organizationId,
        status,
        type,
        isDraft,
        limit,
        offset,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET INVOICE
 * Gets a specific invoice by ID
 *
 * GET /api/v1/invoices/:invoiceId
 *
 * Response:
 * {
 *   id: string,
 *   organizationId: string,
 *   invoiceNumber: string,
 *   invoiceDate: number,
 *   dueDate: number,
 *   type: string,
 *   status: string,
 *   isDraft: boolean,
 *   billTo: object,
 *   lineItems: Array<object>,
 *   subtotalInCents: number,
 *   taxInCents: number,
 *   totalInCents: number,
 *   currency: string,
 *   paymentTerms: string,
 *   notes: string,
 *   pdfUrl: string,
 *   sentAt: number,
 *   sentTo: Array<string>,
 *   paidAt: number,
 *   paymentMethod: string,
 *   transactionId: string,
 *   customProperties: object,
 *   createdBy: string,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */
export const getInvoice = httpAction(async (ctx, request) => {
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
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 1];

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query invoice
    const invoice = await ctx.runQuery(
      internal.api.v1.invoicesInternal.getInvoiceInternal,
      {
        organizationId,
        invoiceId,
      }
    );

    if (!invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(invoice),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE INVOICE
 * Updates an existing draft invoice
 *
 * PATCH /api/v1/invoices/:invoiceId
 *
 * Request Body: (all fields optional)
 * {
 *   lineItems?: Array<object>,
 *   subtotalInCents?: number,
 *   taxInCents?: number,
 *   totalInCents?: number,
 *   invoiceDate?: number,
 *   dueDate?: number,
 *   paymentTerms?: string,
 *   notes?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   invoiceId: string,
 *   message: string
 * }
 */
export const updateInvoice = httpAction(async (ctx, request) => {
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

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 1];

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      lineItems,
      subtotalInCents,
      taxInCents,
      totalInCents,
      invoiceDate,
      dueDate,
      paymentTerms,
      notes,
    } = body;

    // 5. Update invoice
    await ctx.runMutation(
      internal.api.v1.invoicesInternal.updateInvoiceInternal,
      {
        organizationId,
        invoiceId,
        lineItems,
        subtotalInCents,
        taxInCents,
        totalInCents,
        invoiceDate,
        dueDate,
        paymentTerms,
        notes,
        performedBy: userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        invoiceId,
        message: "Invoice updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id (update) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE INVOICE
 * Permanently deletes a draft invoice
 *
 * DELETE /api/v1/invoices/:invoiceId
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
export const deleteInvoice = httpAction(async (ctx, request) => {
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

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 1];

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Delete invoice
    await ctx.runMutation(
      internal.api.v1.invoicesInternal.deleteInvoiceInternal,
      {
        organizationId,
        invoiceId,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice deleted successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id (delete) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * SEAL INVOICE
 * Converts a draft invoice to a final sealed invoice
 *
 * POST /api/v1/invoices/:invoiceId/seal
 *
 * Response:
 * {
 *   success: true,
 *   invoiceNumber: string,
 *   message: string
 * }
 */
export const sealInvoice = httpAction(async (ctx, request) => {
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

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 2]; // /invoices/:invoiceId/seal

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Seal invoice
    const result = await ctx.runMutation(
      internal.api.v1.invoicesInternal.sealInvoiceInternal,
      {
        organizationId,
        invoiceId,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        invoiceNumber: result.invoiceNumber,
        message: "Invoice sealed successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id/seal error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * SEND INVOICE
 * Marks invoice as sent and records recipients
 *
 * POST /api/v1/invoices/:invoiceId/send
 *
 * Request Body:
 * {
 *   sentTo: Array<string>    // Email addresses
 * }
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
export const sendInvoice = httpAction(async (ctx, request) => {
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

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 2]; // /invoices/:invoiceId/send

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { sentTo } = body;

    if (!sentTo || !Array.isArray(sentTo)) {
      return new Response(
        JSON.stringify({ error: "sentTo array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Send invoice
    await ctx.runMutation(
      internal.api.v1.invoicesInternal.sendInvoiceInternal,
      {
        organizationId,
        invoiceId,
        sentTo,
        performedBy: userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id/send error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET INVOICE PDF
 * Returns the PDF URL for an invoice
 *
 * GET /api/v1/invoices/:invoiceId/pdf
 *
 * Response:
 * {
 *   pdfUrl: string,
 *   invoiceNumber: string
 * }
 */
export const getInvoicePdf = httpAction(async (ctx, request) => {
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
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 2]; // /invoices/:invoiceId/pdf

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get PDF URL
    const result = await ctx.runQuery(
      internal.api.v1.invoicesInternal.getInvoicePdfInternal,
      {
        organizationId,
        invoiceId,
      }
    );

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Invoice PDF not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id/pdf error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * SYNC INVOICE TO STRIPE
 * Syncs an invoice to Stripe (optional - only if Stripe invoicing is enabled)
 *
 * POST /api/v1/invoices/:invoiceId/sync-stripe
 *
 * Request Body:
 * {
 *   sendImmediately?: boolean  // If true, finalizes and sends invoice immediately
 * }
 *
 * Response:
 * {
 *   success: true,
 *   stripeInvoiceId?: string,
 *   stripeHostedUrl?: string,  // URL for client to view/pay invoice
 *   message: string
 * }
 *
 * Use Case: Freelancer creates invoice, then triggers Stripe sync when ready to send
 */
export const syncInvoiceToStripe = httpAction(async (ctx, request) => {
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

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 2]; // /invoices/:id/sync-stripe

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const sendImmediately = body.sendImmediately === true;

    // 5. Check if Stripe invoicing is available for this organization
    const stripeCheck = await ctx.runQuery(
      internal.stripeInvoices.checkStripeInvoicingAvailable,
      { organizationId }
    );

    if (!stripeCheck.available) {
      return new Response(
        JSON.stringify({
          success: false,
          message: stripeCheck.reason || "Stripe invoicing not available",
          hint: !stripeCheck.hasStripeConnect
            ? "Connect your Stripe account first"
            : !stripeCheck.invoicingEnabled
            ? "Enable invoicing in settings"
            : "Enable Stripe invoicing in settings",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Sync invoice to Stripe
    const result = await ctx.runAction(
      internal.stripeInvoices.syncInvoiceToStripe,
      {
        invoiceId: invoiceId as any, // Type cast for Convex ID
        sendImmediately,
      }
    );

    // 7. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /invoices/:id/sync-stripe error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET INVOICES FOR CRM ORGANIZATION
 * Lists all invoices for a specific CRM organization (client)
 *
 * GET /api/v1/invoices/client/:crmOrganizationId
 *
 * Query Parameters:
 * - status: Filter by payment status
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset
 *
 * Response:
 * {
 *   invoices: Array<{
 *     id: string,
 *     invoiceNumber: string,
 *     invoiceDate: number,
 *     dueDate: number,
 *     status: string,
 *     totalInCents: number,
 *     currency: string,
 *     pdfUrl?: string,         // Your PDF
 *     stripeHostedUrl?: string, // Stripe hosted page (if synced)
 *     stripePdfUrl?: string     // Stripe PDF (if synced)
 *   }>,
 *   total: number
 * }
 *
 * Use Case: Client logs into freelancer portal, sees their invoices in billing section
 */
export const getInvoicesForClient = httpAction(async (ctx, request) => {
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
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract CRM organization ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const crmOrganizationId = pathParts[pathParts.length - 1];

    if (!crmOrganizationId) {
      return new Response(
        JSON.stringify({ error: "CRM Organization ID required" }),
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

    // 5. Query invoices for this client
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
      JSON.stringify(result),
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
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
