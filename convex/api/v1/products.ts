/**
 * API V1: PRODUCTS ENDPOINTS
 *
 * External API for product management (tickets, physical, digital products).
 * Used by CLI apps and external integrations for product catalog management.
 *
 * Endpoints:
 * - GET /api/v1/products - List products
 * - GET /api/v1/products/:productId - Get product details
 * - POST /api/v1/products - Create product
 * - PATCH /api/v1/products/:productId - Update product
 * - DELETE /api/v1/products/:productId - Delete product
 * - POST /api/v1/products/:productId/publish - Publish product (set active)
 * - POST /api/v1/products/:productId/archive - Archive product
 * - POST /api/v1/products/:productId/price - Update product price
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: products:read, products:write
 */

import { httpAction } from "../../_generated/server";
import { authenticateRequest, requireScopes, type AuthContext } from "../../middleware/auth";
import type { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

/**
 * LIST PRODUCTS
 * Lists products for an organization with optional filters
 *
 * GET /api/v1/products
 *
 * Query Parameters:
 * - subtype: Filter by product type (ticket, physical, digital)
 * - status: Filter by status (draft, active, sold_out, archived)
 * - eventId: Filter by linked event
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   products: Array<{...}>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listProducts = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:read scope
    const scopeCheck = requireScopes(authContext, ["products:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const eventIdParam = url.searchParams.get("eventId");
    const eventId = eventIdParam ? eventIdParam as Id<"objects"> : undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query products
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.productsInternal.listProductsInternal,
      {
        organizationId: authContext.organizationId,
        subtype,
        status,
        eventId,
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
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET PRODUCT
 * Gets a specific product by ID
 *
 * GET /api/v1/products/:productId
 *
 * Response: Full product object with pricing and metadata
 */
export const getProduct = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:read scope
    const scopeCheck = requireScopes(authContext, ["products:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const productId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get product
    const product = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.productsInternal.getProductInternal,
      {
        productId,
        organizationId: authContext.organizationId,
      }
    );

    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(product),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE PRODUCT
 * Creates a new product
 *
 * POST /api/v1/products
 *
 * Request Body:
 * {
 *   name: string,
 *   subtype: "ticket" | "physical" | "digital",
 *   description?: string,
 *   price: number, // Price in cents
 *   currency?: string, // Default: EUR
 *   inventory?: number, // null for unlimited
 *   eventId?: string, // Link product to event
 *   customProperties?: Record<string, any>
 * }
 *
 * Response: { productId: string }
 */
export const createProduct = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:write scope
    const scopeCheck = requireScopes(authContext, ["products:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { name, subtype, description, price, currency, inventory, eventId, customProperties } = body;

    // 4. Validate required fields
    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validSubtypes = ["ticket", "physical", "digital", "room", "staff", "equipment", "space", "appointment", "class", "treatment"];
    if (!subtype || !validSubtypes.includes(subtype)) {
      return new Response(
        JSON.stringify({ error: `Subtype must be one of: ${validSubtypes.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (price === undefined || typeof price !== "number" || price < 0) {
      return new Response(
        JSON.stringify({ error: "Price is required and must be a non-negative number (in cents)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Create product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.createProductInternal,
      {
        organizationId: authContext.organizationId,
        name,
        subtype,
        description,
        price,
        currency: currency || "EUR",
        inventory: inventory ?? undefined,
        eventId: eventId ? eventId as Id<"objects"> : undefined,
        customProperties,
        performedBy: authContext.userId,
      }
    );

    // 6. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products (create) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE PRODUCT
 * Updates an existing product
 *
 * PATCH /api/v1/products/:productId
 *
 * Request Body (all fields optional):
 * {
 *   name?: string,
 *   subtype?: "ticket" | "physical" | "digital",
 *   description?: string,
 *   status?: "draft" | "active" | "sold_out" | "archived",
 *   price?: number,
 *   currency?: string,
 *   inventory?: number,
 *   eventId?: string | null, // null to unlink from event
 *   customProperties?: Record<string, any>
 * }
 *
 * Response: { success: true, productId: string }
 */
export const updateProduct = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:write scope
    const scopeCheck = requireScopes(authContext, ["products:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const productId = pathParts[pathParts.length - 1];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { name, subtype, description, status, price, currency, inventory, eventId, customProperties } = body;

    // 5. Validate optional fields if provided
    const validSubtypes = ["ticket", "physical", "digital", "room", "staff", "equipment", "space", "appointment", "class", "treatment"];
    if (subtype !== undefined && !validSubtypes.includes(subtype)) {
      return new Response(
        JSON.stringify({ error: `Subtype must be one of: ${validSubtypes.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (status !== undefined && !["draft", "active", "sold_out", "archived"].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Status must be 'draft', 'active', 'sold_out', or 'archived'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return new Response(
        JSON.stringify({ error: "Price must be a non-negative number (in cents)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Update product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.updateProductInternal,
      {
        organizationId: authContext.organizationId,
        productId,
        updates: {
          name,
          subtype,
          description,
          status,
          price,
          currency,
          inventory,
          eventId: eventId === null ? null : (eventId ? eventId as Id<"objects"> : undefined),
          customProperties,
        },
        performedBy: authContext.userId,
      }
    );

    // 7. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id (update) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE PRODUCT
 * Permanently deletes a product and all associated links
 *
 * DELETE /api/v1/products/:productId
 *
 * Response: { success: true }
 */
export const deleteProduct = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:write scope
    const scopeCheck = requireScopes(authContext, ["products:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const productId = pathParts[pathParts.length - 1];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Delete product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.deleteProductInternal,
      {
        organizationId: authContext.organizationId,
        productId,
        performedBy: authContext.userId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id (delete) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * PUBLISH PRODUCT
 * Sets product status to "active" (available for sale)
 *
 * POST /api/v1/products/:productId/publish
 *
 * Response: { success: true }
 */
export const publishProduct = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:write scope
    const scopeCheck = requireScopes(authContext, ["products:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/products/:productId/publish -> productId is second to last
    const productId = pathParts[pathParts.length - 2];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Publish product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.publishProductInternal,
      {
        organizationId: authContext.organizationId,
        productId,
        performedBy: authContext.userId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id/publish error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * ARCHIVE PRODUCT
 * Sets product status to "archived" (soft delete)
 *
 * POST /api/v1/products/:productId/archive
 *
 * Response: { success: true }
 */
export const archiveProduct = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:write scope
    const scopeCheck = requireScopes(authContext, ["products:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/products/:productId/archive -> productId is second to last
    const productId = pathParts[pathParts.length - 2];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Archive product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.archiveProductInternal,
      {
        organizationId: authContext.organizationId,
        productId,
        performedBy: authContext.userId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id/archive error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * SET PRODUCT PRICE
 * Updates only the price of a product
 *
 * POST /api/v1/products/:productId/price
 *
 * Request Body:
 * {
 *   price: number, // Price in cents
 *   currency?: string
 * }
 *
 * Response: { success: true, oldPrice: number, newPrice: number }
 */
export const setProductPrice = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require products:write scope
    const scopeCheck = requireScopes(authContext, ["products:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/products/:productId/price -> productId is second to last
    const productId = pathParts[pathParts.length - 2];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { price, currency } = body;

    if (price === undefined || typeof price !== "number" || price < 0) {
      return new Response(
        JSON.stringify({ error: "Price is required and must be a non-negative number (in cents)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Update price
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.setProductPriceInternal,
      {
        organizationId: authContext.organizationId,
        productId,
        price,
        currency,
        performedBy: authContext.userId,
      }
    );

    // 6. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id/price error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// COMBINED HANDLERS FOR HTTP ROUTING
// ============================================================================

// Helper: Authenticate and check scope
async function authenticateWithScope(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  scope: string
): Promise<{ success: true; authContext: AuthContext } | { success: false; response: Response }> {
  const authResult = await authenticateRequest(ctx, request);
  if (!authResult.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const scopeCheck = requireScopes(authResult.context, [scope]);
  if (!scopeCheck.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { success: true, authContext: authResult.context };
}

/**
 * Combined GET handler for products routes
 * Handles: GET /api/v1/products/:productId (pathPrefix route)
 */
export const handleProductsGet = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "products:read");
    if (!auth.success) return auth.response;

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
    const product = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.productsInternal.getProductInternal,
      {
        productId,
        organizationId: auth.authContext.organizationId,
      }
    );

    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(product),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": auth.authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id (get) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Combined POST handler for products routes
 * Handles:
 * - POST /api/v1/products (create) - exact path match in http.ts
 * - POST /api/v1/products/:productId/publish (pathPrefix)
 * - POST /api/v1/products/:productId/archive (pathPrefix)
 * - POST /api/v1/products/:productId/price (pathPrefix)
 */
export const handleProductsPost = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "products:write");
    if (!auth.success) return auth.response;

    // Route to appropriate action based on path
    if (pathname.endsWith("/publish")) {
      // PUBLISH PRODUCT
      const pathParts = pathname.split("/");
      const productId = pathParts[pathParts.length - 2];

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.productsInternal.publishProductInternal,
        {
          organizationId: auth.authContext.organizationId,
          productId,
          performedBy: auth.authContext.userId,
        }
      );

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": auth.authContext.organizationId,
          },
        }
      );
    } else if (pathname.endsWith("/archive")) {
      // ARCHIVE PRODUCT
      const pathParts = pathname.split("/");
      const productId = pathParts[pathParts.length - 2];

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.productsInternal.archiveProductInternal,
        {
          organizationId: auth.authContext.organizationId,
          productId,
          performedBy: auth.authContext.userId,
        }
      );

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": auth.authContext.organizationId,
          },
        }
      );
    } else if (pathname.endsWith("/price")) {
      // SET PRODUCT PRICE
      const pathParts = pathname.split("/");
      const productId = pathParts[pathParts.length - 2];

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = await request.json();
      const { price, currency } = body;

      if (price === undefined || typeof price !== "number" || price < 0) {
        return new Response(
          JSON.stringify({ error: "Price is required and must be a non-negative number (in cents)" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.productsInternal.setProductPriceInternal,
        {
          organizationId: auth.authContext.organizationId,
          productId,
          price,
          currency,
          performedBy: auth.authContext.userId,
        }
      );

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": auth.authContext.organizationId,
          },
        }
      );
    } else if (pathname.match(/\/api\/v1\/products\/?$/)) {
      // CREATE PRODUCT
      const body = await request.json();
      const { name, subtype, description, price, currency, inventory, eventId, customProperties } = body;

      if (!name || typeof name !== "string") {
        return new Response(
          JSON.stringify({ error: "Name is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const validSubtypes = ["ticket", "physical", "digital", "room", "staff", "equipment", "space", "appointment", "class", "treatment"];
      if (!subtype || !validSubtypes.includes(subtype)) {
        return new Response(
          JSON.stringify({ error: `Subtype must be one of: ${validSubtypes.join(", ")}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (price === undefined || typeof price !== "number" || price < 0) {
        return new Response(
          JSON.stringify({ error: "Price is required and must be a non-negative number (in cents)" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.productsInternal.createProductInternal,
        {
          organizationId: auth.authContext.organizationId,
          name,
          subtype,
          description,
          price,
          currency: currency || "EUR",
          inventory: inventory ?? undefined,
          eventId: eventId ? eventId as Id<"objects"> : undefined,
          customProperties,
          performedBy: auth.authContext.userId,
        }
      );

      return new Response(
        JSON.stringify(result),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": auth.authContext.organizationId,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("API /products (POST) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Combined PATCH handler for products routes
 * Handles: PATCH /api/v1/products/:productId
 */
export const handleProductsPatch = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "products:write");
    if (!auth.success) return auth.response;

    // 2. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const productId = pathParts[pathParts.length - 1];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { name, subtype, description, status, price, currency, inventory, eventId, customProperties } = body;

    // 4. Validate optional fields if provided
    const validSubtypes = ["ticket", "physical", "digital", "room", "staff", "equipment", "space", "appointment", "class", "treatment"];
    if (subtype !== undefined && !validSubtypes.includes(subtype)) {
      return new Response(
        JSON.stringify({ error: `Subtype must be one of: ${validSubtypes.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (status !== undefined && !["draft", "active", "sold_out", "archived"].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Status must be 'draft', 'active', 'sold_out', or 'archived'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return new Response(
        JSON.stringify({ error: "Price must be a non-negative number (in cents)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Update product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.updateProductInternal,
      {
        organizationId: auth.authContext.organizationId,
        productId,
        updates: {
          name,
          subtype,
          description,
          status,
          price,
          currency,
          inventory,
          eventId: eventId === null ? null : (eventId ? eventId as Id<"objects"> : undefined),
          customProperties,
        },
        performedBy: auth.authContext.userId,
      }
    );

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": auth.authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id (PATCH) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Combined DELETE handler for products routes
 * Handles: DELETE /api/v1/products/:productId
 */
export const handleProductsDelete = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "products:write");
    if (!auth.success) return auth.response;

    // 2. Extract product ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const productId = pathParts[pathParts.length - 1];

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Delete product
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.productsInternal.deleteProductInternal,
      {
        organizationId: auth.authContext.organizationId,
        productId,
        performedBy: auth.authContext.userId,
      }
    );

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": auth.authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /products/:id (DELETE) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * OPTIONS handler for CORS preflight requests
 */
export const handleOptions = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
});
