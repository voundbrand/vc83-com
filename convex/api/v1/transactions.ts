/**
 * API V1: TRANSACTIONS ENDPOINT
 *
 * External API for getting transaction status and results.
 * Used by external websites to show confirmation after registration.
 *
 * Endpoint: GET /api/v1/transactions/{transactionId}
 *
 * Security: API key required in Authorization header
 */

import { httpAction } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

/**
 * GET TRANSACTION
 * Returns transaction details with linked tickets and invoices
 *
 * Response:
 * {
 *   id: string,
 *   status: string,
 *   name: string,
 *   description: string,
 *   createdAt: number,
 *   tickets: Array<{
 *     id: string,
 *     status: string,
 *     qrCode: string
 *   }>,
 *   invoices: Array<{
 *     id: string,
 *     status: string,
 *     dueDate: number
 *   }>
 * }
 */
export const getTransaction = httpAction(async (ctx, request) => {
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
    const authContext = await (ctx as any).runQuery(generatedApi.internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Extract transaction ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const transactionId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Transaction ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get transaction
    const transaction = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.transactionsInternal.getTransactionInternal,
      {
        transactionId,
        organizationId,
      }
    );

    if (!transaction) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(JSON.stringify(transaction), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /transactions error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
