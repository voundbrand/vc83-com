/**
 * API V1: PRODUCTS ENDPOINT
 *
 * External API for getting product details.
 * Used by external websites to display course pricing, CME credits, etc.
 *
 * Endpoint: GET /api/v1/products/{productId}
 *
 * Security: API key required in Authorization header
 * Scope: Returns only products for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * GET PRODUCT
 * Returns detailed information about a specific product
 *
 * Path Parameters:
 * - productId: Product ID
 *
 * Response:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   subtype: string,
 *   status: string,
 *   pricing: {
 *     basePrice: number,
 *     currency: string,
 *     taxInclusive: boolean
 *   },
 *   metadata: {
 *     cmeCredits?: number,
 *     instructors?: string[],
 *     duration?: string,
 *     ...
 *   },
 *   invoiceConfig?: {
 *     employerSourceField: string,
 *     employerMapping: object,
 *     defaultPaymentTerms: string
 *   },
 *   linkedForm?: string // Form ID for registration
 * }
 */
export const getProduct = httpAction(async (ctx, request) => {
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

    // 2. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const productId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get product
    const product = await ctx.runQuery(
      internal.api.v1.productsInternal.getProductInternal,
      {
        productId,
        organizationId,
      }
    );

    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(JSON.stringify(product), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /products error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
