/**
 * RATE LIMITING INTEGRATION EXAMPLE
 *
 * This file demonstrates how to integrate rate limiting into API endpoints.
 * Copy this pattern to all API endpoints that need rate limiting.
 *
 * @see convex/middleware/rateLimit.ts
 * @see convex/api/v1/crm.ts (for real implementation)
 */

import { httpAction } from "../_generated/server";
import { authenticateRequest, AuthContext } from "./auth";
import {
  checkRateLimit,
  addRateLimitHeaders,
  getRateLimitIdentifier,
  getRateLimitPlan,
} from "./rateLimit";

/**
 * EXAMPLE API ENDPOINT WITH RATE LIMITING
 *
 * Integration Steps:
 * 1. Authenticate request (existing)
 * 2. Get rate limit identifier (API key, user, or IP)
 * 3. Check rate limit
 * 4. Handle rate limit exceeded (HTTP 429)
 * 5. Process request normally
 * 6. Add rate limit headers to response
 */
export const exampleEndpoint = httpAction(async (ctx, request) => {
  // ============================================================================
  // STEP 1: AUTHENTICATE REQUEST (Existing pattern)
  // ============================================================================
  const authResult = await authenticateRequest(ctx, request);

  if (!authResult.success) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      {
        status: authResult.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const authContext = authResult.context;

  // ============================================================================
  // STEP 2: GET RATE LIMIT IDENTIFIER
  // ============================================================================
  // Priority: API Key > User ID > IP Address
  // Note: apiKeyId needs to be passed from middleware auth context
  const { identifier, identifierType } = getRateLimitIdentifier(
    {
      // apiKeyId: authContext.apiKeyId, // This would come from enhanced auth context
      userId: authContext.userId,
      authMethod: authContext.authMethod,
    },
    request
  );

  // ============================================================================
  // STEP 3: GET RATE LIMIT PLAN
  // ============================================================================
  // Get organization's rate limit plan (free, pro, business, etc.)
  // In real implementation, you'd query the organization
  // const organization = await ctx.runQuery(internal.organizations.get, {
  //   organizationId: authContext.organizationId,
  // });
  const organization = { plan: "free" }; // Example - replace with real query

  const rateLimitPlan = getRateLimitPlan(organization?.plan);

  // ============================================================================
  // STEP 4: CHECK RATE LIMIT
  // ============================================================================
  const rateLimitResult = await checkRateLimit(
    ctx,
    identifier,
    identifierType,
    rateLimitPlan
  );

  if (!rateLimitResult.allowed) {
    // Rate limit exceeded! Return HTTP 429
    const response = new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
        limit: rateLimitResult.limit,
      }),
      {
        status: 429, // Too Many Requests
        headers: { "Content-Type": "application/json" },
      }
    );

    // Add rate limit headers (includes Retry-After)
    return addRateLimitHeaders(response, rateLimitResult);
  }

  // ============================================================================
  // STEP 5: PROCESS REQUEST NORMALLY
  // ============================================================================
  // Your endpoint logic goes here...
  try {
    // Example: Get contact by ID
    const url = new URL(request.url);
    const contactId = url.searchParams.get("id");

    if (!contactId) {
      const response = new Response(
        JSON.stringify({ error: "Missing contact ID" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // Get contact from database (example - replace with real query)
    // const contact = await ctx.runQuery(internal.crm.getContact, {
    //   contactId,
    //   organizationId: authContext.organizationId,
    // });
    const contact = { id: contactId, name: "Example Contact" }; // Example

    if (!contact) {
      const response = new Response(
        JSON.stringify({ error: "Contact not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // Return success response
    const response = new Response(
      JSON.stringify({ data: contact }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    // ============================================================================
    // STEP 6: ADD RATE LIMIT HEADERS TO SUCCESS RESPONSE
    // ============================================================================
    return addRateLimitHeaders(response, rateLimitResult);

  } catch (error) {
    // Handle errors
    const response = new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );

    // Still add rate limit headers even on error
    return addRateLimitHeaders(response, rateLimitResult);
  }
});

/**
 * SIMPLIFIED RATE LIMIT HELPER
 *
 * Helper function to reduce boilerplate.
 * Wraps the rate limit check pattern.
 */
export async function withRateLimit(
  ctx: any,
  request: Request,
  authContext: AuthContext,
  handler: () => Promise<Response>
): Promise<Response> {
  // Get rate limit identifier and plan
  const { identifier, identifierType } = getRateLimitIdentifier(
    {
      // apiKeyId: authContext.apiKeyId,
      userId: authContext.userId,
      authMethod: authContext.authMethod,
    },
    request
  );

  // Example - replace with real organization query
  const organization = { plan: "free" };

  const rateLimitPlan = getRateLimitPlan(organization?.plan);

  // Check rate limit
  const rateLimitResult = await checkRateLimit(
    ctx,
    identifier,
    identifierType,
    rateLimitPlan
  );

  if (!rateLimitResult.allowed) {
    const response = new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
        limit: rateLimitResult.limit,
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );

    return addRateLimitHeaders(response, rateLimitResult);
  }

  // Process request
  const response = await handler();

  // Add rate limit headers to response
  return addRateLimitHeaders(response, rateLimitResult);
}

/**
 * USAGE EXAMPLE WITH HELPER:
 *
 * export const myEndpoint = httpAction(async (ctx, request) => {
 *   const authResult = await authenticateRequest(ctx, request);
 *   if (!authResult.success) {
 *     return new Response(JSON.stringify({ error: authResult.error }), {
 *       status: authResult.status
 *     });
 *   }
 *
 *   return withRateLimit(ctx, request, authResult.context, async () => {
 *     // Your endpoint logic here...
 *     return new Response(JSON.stringify({ data: "success" }), {
 *       status: 200
 *     });
 *   });
 * });
 */
