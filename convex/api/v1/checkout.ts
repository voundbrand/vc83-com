/**
 * API V1: CHECKOUT ENDPOINTS
 *
 * External API for payment processing on customer websites.
 * Enables organizations to accept payments on their own websites
 * without redirecting users away.
 *
 * Endpoints:
 * - GET /api/v1/checkout/config - Get payment provider configuration
 * - GET /api/v1/checkout/sessions - List checkout sessions
 * - GET /api/v1/checkout/sessions/:sessionId - Get session details
 * - POST /api/v1/checkout/sessions - Create checkout session
 * - POST /api/v1/checkout/sessions/:sessionId/cancel - Cancel session
 * - POST /api/v1/checkout/confirm - Confirm payment and fulfill
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: checkout:read, checkout:write
 *
 * Example Usage:
 * ```typescript
 * // 1. Get payment config
 * const config = await fetch('/api/v1/checkout/config', {
 *   headers: { 'Authorization': 'Bearer sk_...' }
 * });
 * // Returns: { provider: 'stripe', publishableKey: 'pk_...' }
 *
 * // 2. Create checkout session
 * const session = await fetch('/api/v1/checkout/sessions', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer sk_...' },
 *   body: JSON.stringify({
 *     productId: 'prod_123',
 *     quantity: 1,
 *     customerEmail: 'customer@example.com'
 *   })
 * });
 * // Returns: { clientSecret: 'pi_...', sessionId: '...' }
 *
 * // 3. Initialize Stripe Elements on your website
 * const stripe = Stripe(config.publishableKey);
 * const elements = stripe.elements({ clientSecret: session.clientSecret });
 * const paymentElement = elements.create('payment');
 * paymentElement.mount('#payment-element');
 *
 * // 4. Confirm payment (after customer submits)
 * const result = await stripe.confirmPayment({
 *   elements,
 *   confirmParams: { return_url: 'https://yoursite.com/success' }
 * });
 *
 * // 5. Verify and fulfill (backend)
 * await fetch('/api/v1/checkout/confirm', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer sk_...' },
 *   body: JSON.stringify({
 *     sessionId: session.sessionId,
 *     paymentIntentId: result.paymentIntent.id
 *   })
 * });
 * ```
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes, type AuthContext } from "../../middleware/auth";
import { Id } from "../../_generated/dataModel";

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
 * GET PAYMENT PROVIDER CONFIG
 *
 * Returns payment provider configuration for initializing
 * payment UI on the client side (e.g., Stripe publishable key).
 *
 * Endpoint: GET /api/v1/checkout/config
 *
 * Response:
 * {
 *   provider: "stripe" | "invoice",
 *   providerName: "Stripe",
 *   publishableKey?: string, // For Stripe
 *   accountId: string,
 *   supportedCurrencies: string[]
 * }
 */
export const getCheckoutConfig = httpAction(async (ctx, request) => {
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

    // 2. Get organization's payment provider config
    const config = await ctx.runQuery(
      internal.api.v1.checkoutInternal.getPaymentConfig,
      { organizationId }
    );

    if (!config) {
      return new Response(
        JSON.stringify({
          error: "No payment provider configured",
          message:
            "Please connect a payment provider (Stripe) in your dashboard first",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Return config (public keys only - safe to expose)
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /checkout/config error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE CHECKOUT SESSION
 *
 * Creates a payment session and returns clientSecret for
 * initializing Stripe Elements (or equivalent) on the client.
 *
 * Endpoint: POST /api/v1/checkout/sessions
 *
 * Request Body:
 * {
 *   productId: string,
 *   quantity?: number,
 *   customerEmail?: string,
 *   customerName?: string,
 *   customerPhone?: string,
 *   metadata?: object
 * }
 *
 * Response:
 * {
 *   sessionId: string,
 *   clientSecret: string, // For Stripe Elements
 *   expiresAt: number,
 *   amount: number,
 *   currency: string
 * }
 */
export const createCheckoutSession = httpAction(async (ctx, request) => {
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

    // 2. Parse request body
    const body = await request.json();

    if (!body.productId) {
      return new Response(
        JSON.stringify({ error: "Missing 'productId' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create checkout session via internal action
    const session = await ctx.runAction(
      internal.api.v1.checkoutInternal.createCheckoutSessionInternal,
      {
        organizationId,
        productId: body.productId as Id<"objects">,
        quantity: body.quantity || 1,
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        metadata: body.metadata,
      }
    );

    // 4. Update API key usage
    // TODO: Implement async usage tracking - await ctx.scheduler.runAfter(0, internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

    // 5. Return session details
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /checkout/sessions error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CONFIRM PAYMENT AND FULFILL ORDER
 *
 * Verifies payment completion and fulfills the order
 * (creates tickets, sends emails, generates invoices, etc.)
 *
 * Endpoint: POST /api/v1/checkout/confirm
 *
 * Request Body:
 * {
 *   sessionId: string,
 *   paymentIntentId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   transactionId: string,
 *   purchaseItemIds: string[], // Generic - works for any product type
 *   downloadUrls: {
 *     purchaseItems: string,  // Generic download for all purchased items
 *     tickets?: string,       // If products include tickets
 *     invoice?: string        // If B2B transaction
 *   }
 * }
 */
export const confirmPayment = httpAction(async (ctx, request) => {
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

    // 2. Parse request body
    const body = await request.json();

    if (!body.sessionId || !body.paymentIntentId) {
      return new Response(
        JSON.stringify({
          error: "Missing 'sessionId' or 'paymentIntentId' field",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Verify payment and fulfill order
    const result = await ctx.runAction(
      internal.api.v1.checkoutInternal.confirmPaymentInternal,
      {
        organizationId,
        sessionId: body.sessionId,
        paymentIntentId: body.paymentIntentId,
      }
    );

    // 4. Update API key usage
    // TODO: Implement async usage tracking - await ctx.scheduler.runAfter(0, internal.apiKeys.trackUsage, { apiKeyId, ipAddress });

    // 5. Return fulfillment result
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /checkout/confirm error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to confirm payment",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// CHECKOUT SESSION CRUD ENDPOINTS
// ============================================================================

/**
 * LIST CHECKOUT SESSIONS
 *
 * Lists checkout sessions for the organization with optional filters.
 *
 * GET /api/v1/checkout/sessions
 *
 * Query Parameters:
 * - status: Filter by status (pending, completed, expired)
 * - customerEmail: Filter by customer email
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   sessions: Array<{
 *     id: string,
 *     status: string,
 *     customerEmail?: string,
 *     totalAmount?: number,
 *     currency?: string,
 *     createdAt: number,
 *     ...
 *   }>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listCheckoutSessions = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "checkout:read");
    if (!auth.success) return auth.response;

    // 2. Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const customerEmail = url.searchParams.get("customerEmail") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 3. Query checkout sessions
    const result = await ctx.runQuery(
      internal.api.v1.checkoutInternal.listCheckoutSessionsInternal,
      {
        organizationId: auth.authContext.organizationId,
        status,
        customerEmail,
        limit,
        offset,
      }
    );

    // 4. Return response
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
    console.error("API /checkout/sessions (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CHECKOUT SESSION
 *
 * Gets details of a specific checkout session.
 *
 * GET /api/v1/checkout/sessions/:sessionId
 *
 * Response: Full checkout session object
 */
export const getCheckoutSession = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "checkout:read");
    if (!auth.success) return auth.response;

    // 2. Extract session ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const sessionId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get checkout session
    const session = await ctx.runQuery(
      internal.api.v1.checkoutInternal.getCheckoutSessionInternal,
      {
        organizationId: auth.authContext.organizationId,
        sessionId,
      }
    );

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Checkout session not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(
      JSON.stringify(session),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": auth.authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /checkout/sessions/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CANCEL CHECKOUT SESSION
 *
 * Cancels a pending checkout session.
 *
 * POST /api/v1/checkout/sessions/:sessionId/cancel
 *
 * Response: { success: true }
 */
export const cancelCheckoutSession = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "checkout:write");
    if (!auth.success) return auth.response;

    // 2. Extract session ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/checkout/sessions/:sessionId/cancel -> sessionId is second to last
    const sessionId = pathParts[pathParts.length - 2] as Id<"objects">;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Cancel checkout session
    const result = await ctx.runMutation(
      internal.api.v1.checkoutInternal.cancelCheckoutSessionInternal,
      {
        organizationId: auth.authContext.organizationId,
        sessionId,
      }
    );

    // 4. Return response
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
    console.error("API /checkout/sessions/:id/cancel error:", error);
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

/**
 * Combined GET handler for checkout/sessions routes
 * Handles: GET /api/v1/checkout/sessions and GET /api/v1/checkout/sessions/:sessionId
 */
export const handleCheckoutSessionsGet = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // /api/v1/checkout/sessions -> ["api", "v1", "checkout", "sessions"] -> list
  // /api/v1/checkout/sessions/:id -> ["api", "v1", "checkout", "sessions", ":id"] -> get by id
  if (pathParts.length === 4 && pathParts[3] === "sessions") {
    // List checkout sessions - inline the logic
    try {
      const auth = await authenticateWithScope(ctx, request, "checkout:read");
      if (!auth.success) return auth.response;

      const status = url.searchParams.get("status") || undefined;
      const customerEmail = url.searchParams.get("customerEmail") || undefined;
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const result = await ctx.runQuery(
        internal.api.v1.checkoutInternal.listCheckoutSessionsInternal,
        {
          organizationId: auth.authContext.organizationId,
          status,
          customerEmail,
          limit,
          offset,
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
      console.error("API /checkout/sessions (list) error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (pathParts.length === 5) {
    // Get single checkout session - inline the logic
    try {
      const auth = await authenticateWithScope(ctx, request, "checkout:read");
      if (!auth.success) return auth.response;

      const sessionId = pathParts[4] as Id<"objects">;

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Session ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const session = await ctx.runQuery(
        internal.api.v1.checkoutInternal.getCheckoutSessionInternal,
        {
          organizationId: auth.authContext.organizationId,
          sessionId,
        }
      );

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Checkout session not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(session),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": auth.authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /checkout/sessions/:id error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});

/**
 * Combined POST handler for checkout/sessions routes
 * Handles:
 * - POST /api/v1/checkout/sessions (create)
 * - POST /api/v1/checkout/sessions/:sessionId/cancel
 */
export const handleCheckoutSessionsPost = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.endsWith("/cancel")) {
    // Cancel checkout session - inline the logic
    try {
      const auth = await authenticateWithScope(ctx, request, "checkout:write");
      if (!auth.success) return auth.response;

      const pathParts = pathname.split("/");
      const sessionId = pathParts[pathParts.length - 2] as Id<"objects">;

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Session ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(
        internal.api.v1.checkoutInternal.cancelCheckoutSessionInternal,
        {
          organizationId: auth.authContext.organizationId,
          sessionId,
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
      console.error("API /checkout/sessions/:id/cancel error:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      const isNotFound = errorMessage.includes("not found");
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (pathname.match(/\/api\/v1\/checkout\/sessions\/?$/)) {
    // Create checkout session - use existing handler but with updated auth
    // (The original createCheckoutSession already uses API key auth, leave it for backwards compatibility)
    try {
      // Use triple auth (API key, OAuth, CLI session)
      const auth = await authenticateWithScope(ctx, request, "checkout:write");
      if (!auth.success) return auth.response;

      const body = await request.json();

      if (!body.productId) {
        return new Response(
          JSON.stringify({ error: "Missing 'productId' field" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const session = await ctx.runAction(
        internal.api.v1.checkoutInternal.createCheckoutSessionInternal,
        {
          organizationId: auth.authContext.organizationId,
          productId: body.productId as Id<"objects">,
          quantity: body.quantity || 1,
          customerEmail: body.customerEmail,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          metadata: body.metadata,
        }
      );

      return new Response(JSON.stringify(session), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": auth.authContext.organizationId,
        },
      });
    } catch (error) {
      console.error("API /checkout/sessions (create) error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create checkout session",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});

/**
 * OPTIONS handler for CORS preflight requests
 */
export const handleOptions = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
});
