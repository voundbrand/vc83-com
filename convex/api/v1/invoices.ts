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
 * - POST /api/v1/invoices/:invoiceId/sync-stripe - Sync to Stripe
 * - GET /api/v1/invoices/client/:crmOrganizationId - Get client invoices
 *
 * Security: Dual authentication support
 * - API keys (full access, backward compatible)
 * - OAuth tokens (scope-based access control)
 * Scope: Returns only invoices for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";

/**
 * CREATE INVOICE
 * Creates a new draft invoice
 *
 * POST /api/v1/invoices
 * Required Scope: invoices:write
 */
export const createInvoice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:read
 */
export const listInvoices = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:read
 */
export const getInvoice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:write
 */
export const updateInvoice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:write
 */
export const deleteInvoice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:write
 */
export const sealInvoice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:send or invoices:write
 */
export const sendInvoice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:send or invoices:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:send"]);
    if (!scopeCheck.success) {
      // Fall back to invoices:write
      const writeCheck = requireScopes(authContext, ["invoices:write"]);
      if (!writeCheck.success) {
        return new Response(
          JSON.stringify({ error: "Missing required scope: invoices:send or invoices:write" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:read
 */
export const getInvoicePdf = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:write
 */
export const syncInvoiceToStripe = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: invoices:read
 */
export const getInvoicesForClient = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require invoices:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["invoices:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
