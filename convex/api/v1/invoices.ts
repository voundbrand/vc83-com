/**
 * API V1: INVOICES ENDPOINT
 *
 * External API for downloading invoice PDFs.
 * Used by external websites to provide invoices for employer billing.
 *
 * Endpoint: GET /api/v1/invoices/{invoiceId}
 *
 * Security: API key required in Authorization header
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * GET INVOICE
 * Returns invoice as PDF file
 *
 * Response: PDF file (application/pdf)
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

    const { organizationId, userId } = authContext;

    // 2. Extract invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const invoiceId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Generate invoice PDF
    const pdfBlob = await ctx.runAction(
      internal.api.v1.invoicesInternal.generateInvoicePdfInternal,
      {
        invoiceId,
        organizationId,
      }
    );

    if (!pdfBlob) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return PDF
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /invoices error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
