/**
 * FRONTEND OAUTH AUTHENTICATION API
 *
 * Handles OAuth user synchronization and validation for frontend applications.
 * Frontend users authenticate via OAuth (Google, Microsoft) and this API
 * manages their user records in the backend ontology system.
 *
 * Endpoints:
 * - POST /api/v1/auth/sync-user - Create/update frontend user after OAuth login
 * - POST /api/v1/auth/validate-token - Validate frontend user session
 * - GET /api/v1/auth/user - Get current user details
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * POST /api/v1/auth/sync-user
 *
 * Called by frontend after successful OAuth authentication.
 * Creates or updates a frontend_user object in the ontology system.
 *
 * Request Body:
 * {
 *   email: string;
 *   name?: string;
 *   oauthProvider: "google" | "microsoft";
 *   oauthId: string; // Provider's user ID
 * }
 *
 * Response:
 * {
 *   _id: string;
 *   organizationId: string;
 *   type: "frontend_user";
 *   name: string; // email
 *   customProperties: {
 *     oauthProvider: string;
 *     oauthId: string;
 *     displayName: string;
 *     lastLogin: number;
 *     crmContactId?: string;
 *     crmOrganizationId?: string;
 *   }
 * }
 */
export const syncUser = httpAction(async (ctx, request) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, name, oauthProvider, oauthId } = body;

    // Validate required fields
    if (!email || !oauthProvider || !oauthId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, oauthProvider, oauthId",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate OAuth provider
    if (oauthProvider !== "google" && oauthProvider !== "microsoft") {
      return new Response(
        JSON.stringify({
          error: "Invalid oauthProvider. Must be 'google' or 'microsoft'",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call internal mutation to sync user
    const frontendUser = await ctx.runMutation(internal.auth.syncFrontendUser, {
      email,
      name: name || email,
      oauthProvider,
      oauthId,
    });

    return new Response(JSON.stringify(frontendUser), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific origins
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error syncing frontend user:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * POST /api/v1/auth/validate-token
 *
 * Validates a frontend user's session token (user ID).
 * Returns user details and CRM context if valid.
 *
 * Headers:
 * Authorization: Bearer <frontend_user_id>
 *
 * Response:
 * {
 *   valid: true,
 *   user: { ... frontend_user object ... },
 *   crmContext: {
 *     contactId?: string,
 *     organizationId?: string
 *   }
 * }
 */
export const validateToken = httpAction(async (ctx, request) => {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Missing or invalid Authorization header",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract user ID from token
    const userId = authHeader.substring(7); // Remove "Bearer "

    // Validate user ID format
    if (!userId.startsWith("k1") || userId.length < 10) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid user ID format",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Query user from database
    const userResult = await ctx.runQuery(internal.auth.validateFrontendUser, {
      userId: userId as Id<"objects">,
    });

    if (!userResult) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "User not found",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(userResult), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific origins
      },
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * GET /api/v1/auth/user
 *
 * Get current authenticated user's details.
 * Requires valid Authorization header.
 *
 * Headers:
 * Authorization: Bearer <frontend_user_id>
 *
 * Response:
 * {
 *   _id: string;
 *   email: string;
 *   displayName: string;
 *   oauthProvider: string;
 *   crmContext: {
 *     contactId?: string,
 *     organizationId?: string
 *   }
 * }
 */
export const getUser = httpAction(async (ctx, request) => {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid Authorization header",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract user ID
    const userId = authHeader.substring(7);

    // Validate user ID format
    if (!userId.startsWith("k1") || userId.length < 10) {
      return new Response(
        JSON.stringify({
          error: "Invalid user ID format",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Query user
    const userResult = await ctx.runQuery(internal.auth.validateFrontendUser, {
      userId: userId as Id<"objects">,
    });

    if (!userResult || !userResult.valid) {
      return new Response(
        JSON.stringify({
          error: "User not found",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return user details
    if (!userResult.user) {
      return new Response(
        JSON.stringify({ error: "User not found after sync" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        _id: userResult.user._id,
        email: userResult.user.name,
        displayName: userResult.user.customProperties?.displayName,
        oauthProvider: userResult.user.customProperties?.oauthProvider,
        crmContext: userResult.crmContext,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific origins
        },
      }
    );
  } catch (error) {
    console.error("Error getting user:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * OPTIONS /api/v1/auth/* - CORS preflight
 */
export const authOptions = httpAction(async (ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific origins
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
});
