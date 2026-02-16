/**
 * API V1: OAUTH CONNECTIONS ENDPOINTS
 *
 * External API for managing OAuth connections.
 * Used by CLI apps and external integrations for OAuth account management.
 *
 * Endpoints:
 * - GET /api/v1/oauth/connections - List OAuth connections
 * - GET /api/v1/oauth/connections/:connectionId - Get connection details
 * - GET /api/v1/oauth/connections/provider/:provider - Get connections by provider
 * - PATCH /api/v1/oauth/connections/:connectionId - Update connection sync settings
 * - POST /api/v1/oauth/connections/:connectionId/disconnect - Disconnect (soft delete)
 * - DELETE /api/v1/oauth/connections/:connectionId - Delete connection permanently
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: oauth:read, oauth:write
 *
 * NOTE: Token values are NEVER exposed via these endpoints for security.
 */

import { httpAction } from "../../_generated/server";
import { authenticateRequest, requireScopes, type AuthContext } from "../../middleware/auth";
import type { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

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
 * LIST OAUTH CONNECTIONS
 *
 * GET /api/v1/oauth/connections
 *
 * Query Parameters:
 * - provider: Filter by provider (microsoft, google, github, etc.)
 * - status: Filter by status (active, expired, revoked, error)
 * - connectionType: Filter by type (personal, organizational)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 */
export const listOAuthConnections = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "oauth:read");
    if (!auth.success) return auth.response;

    // 2. Parse query parameters
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const connectionType = url.searchParams.get("connectionType") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 3. Query OAuth connections
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.oauthConnectionsInternal.listOAuthConnectionsInternal,
      {
        organizationId: auth.authContext.organizationId,
        provider,
        status,
        connectionType,
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
    console.error("API /oauth/connections (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET OAUTH CONNECTION
 *
 * GET /api/v1/oauth/connections/:connectionId
 */
export const getOAuthConnection = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "oauth:read");
    if (!auth.success) return auth.response;

    // 2. Extract connection ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const connectionId = pathParts[pathParts.length - 1] as Id<"oauthConnections">;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Connection ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get connection
    const connection = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.oauthConnectionsInternal.getOAuthConnectionInternal,
      {
        organizationId: auth.authContext.organizationId,
        connectionId,
      }
    );

    if (!connection) {
      return new Response(
        JSON.stringify({ error: "OAuth connection not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(
      JSON.stringify(connection),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": auth.authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /oauth/connections/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE OAUTH CONNECTION SYNC SETTINGS
 *
 * PATCH /api/v1/oauth/connections/:connectionId
 *
 * Request Body:
 * {
 *   syncSettings: {
 *     email: boolean,
 *     calendar: boolean,
 *     oneDrive: boolean,
 *     sharePoint: boolean
 *   }
 * }
 */
export const updateOAuthConnection = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "oauth:write");
    if (!auth.success) return auth.response;

    // 2. Extract connection ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const connectionId = pathParts[pathParts.length - 1] as Id<"oauthConnections">;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Connection ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { syncSettings } = body;

    if (!syncSettings || typeof syncSettings !== "object") {
      return new Response(
        JSON.stringify({ error: "syncSettings object is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate syncSettings structure
    const requiredFields = ["email", "calendar", "oneDrive", "sharePoint"];
    for (const field of requiredFields) {
      if (typeof syncSettings[field] !== "boolean") {
        return new Response(
          JSON.stringify({ error: `syncSettings.${field} must be a boolean` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Update connection
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.oauthConnectionsInternal.updateOAuthConnectionSyncSettingsInternal,
      {
        organizationId: auth.authContext.organizationId,
        connectionId,
        syncSettings,
      }
    );

    // 5. Return response
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
    console.error("API /oauth/connections/:id (update) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DISCONNECT OAUTH CONNECTION
 *
 * POST /api/v1/oauth/connections/:connectionId/disconnect
 *
 * Soft deletes (revokes) the connection, clearing tokens but keeping the record.
 */
export const disconnectOAuthConnection = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "oauth:write");
    if (!auth.success) return auth.response;

    // 2. Extract connection ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/oauth/connections/:connectionId/disconnect -> connectionId is second to last
    const connectionId = pathParts[pathParts.length - 2] as Id<"oauthConnections">;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Connection ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Disconnect connection
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.oauthConnectionsInternal.disconnectOAuthConnectionInternal,
      {
        organizationId: auth.authContext.organizationId,
        connectionId,
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
    console.error("API /oauth/connections/:id/disconnect error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE OAUTH CONNECTION
 *
 * DELETE /api/v1/oauth/connections/:connectionId
 *
 * Permanently deletes the OAuth connection.
 */
export const deleteOAuthConnection = httpAction(async (ctx, request) => {
  try {
    // 1. Authenticate
    const auth = await authenticateWithScope(ctx, request, "oauth:write");
    if (!auth.success) return auth.response;

    // 2. Extract connection ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const connectionId = pathParts[pathParts.length - 1] as Id<"oauthConnections">;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Connection ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Delete connection
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.oauthConnectionsInternal.deleteOAuthConnectionInternal,
      {
        organizationId: auth.authContext.organizationId,
        connectionId,
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
    console.error("API /oauth/connections/:id (delete) error:", error);
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
 * Combined GET handler for oauth/connections routes
 * Handles: GET /api/v1/oauth/connections and GET /api/v1/oauth/connections/:connectionId
 */
export const handleOAuthConnectionsGet = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // /api/v1/oauth/connections -> ["api", "v1", "oauth", "connections"] -> list
  // /api/v1/oauth/connections/:id -> ["api", "v1", "oauth", "connections", ":id"] -> get by id
  if (pathParts.length === 4 && pathParts[3] === "connections") {
    // List OAuth connections - inline the logic
    try {
      const auth = await authenticateWithScope(ctx, request, "oauth:read");
      if (!auth.success) return auth.response;

      const provider = url.searchParams.get("provider") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const connectionType = url.searchParams.get("connectionType") || undefined;
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const result = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.oauthConnectionsInternal.listOAuthConnectionsInternal,
        {
          organizationId: auth.authContext.organizationId,
          provider,
          status,
          connectionType,
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
      console.error("API /oauth/connections (list) error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (pathParts.length === 5) {
    // Get single OAuth connection - inline the logic
    try {
      const auth = await authenticateWithScope(ctx, request, "oauth:read");
      if (!auth.success) return auth.response;

      const connectionId = pathParts[4] as Id<"oauthConnections">;

      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: "Connection ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const connection = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.oauthConnectionsInternal.getOAuthConnectionInternal,
        {
          organizationId: auth.authContext.organizationId,
          connectionId,
        }
      );

      if (!connection) {
        return new Response(
          JSON.stringify({ error: "OAuth connection not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(connection),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": auth.authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /oauth/connections/:id error:", error);
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
 * Combined POST handler for oauth/connections routes
 * Handles: POST /api/v1/oauth/connections/:connectionId/disconnect
 */
export const handleOAuthConnectionsPost = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.endsWith("/disconnect")) {
    // Disconnect OAuth connection - inline the logic
    try {
      const auth = await authenticateWithScope(ctx, request, "oauth:write");
      if (!auth.success) return auth.response;

      const pathParts = pathname.split("/");
      const connectionId = pathParts[pathParts.length - 2] as Id<"oauthConnections">;

      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: "Connection ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.oauthConnectionsInternal.disconnectOAuthConnectionInternal,
        {
          organizationId: auth.authContext.organizationId,
          connectionId,
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
      console.error("API /oauth/connections/:id/disconnect error:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      const isNotFound = errorMessage.includes("not found");
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});

/**
 * Combined PATCH handler for oauth/connections routes
 * Handles: PATCH /api/v1/oauth/connections/:connectionId
 */
export const handleOAuthConnectionsPatch = httpAction(async (ctx, request) => {
  try {
    const auth = await authenticateWithScope(ctx, request, "oauth:write");
    if (!auth.success) return auth.response;

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const connectionId = pathParts[pathParts.length - 1] as Id<"oauthConnections">;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Connection ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { syncSettings } = body;

    if (!syncSettings || typeof syncSettings !== "object") {
      return new Response(
        JSON.stringify({ error: "syncSettings object is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate syncSettings structure
    const requiredFields = ["email", "calendar", "oneDrive", "sharePoint"];
    for (const field of requiredFields) {
      if (typeof syncSettings[field] !== "boolean") {
        return new Response(
          JSON.stringify({ error: `syncSettings.${field} must be a boolean` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.oauthConnectionsInternal.updateOAuthConnectionSyncSettingsInternal,
      {
        organizationId: auth.authContext.organizationId,
        connectionId,
        syncSettings,
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
    console.error("API /oauth/connections/:id (PATCH) error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = errorMessage.includes("not found");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isNotFound ? 404 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Combined DELETE handler for oauth/connections routes
 * Handles: DELETE /api/v1/oauth/connections/:connectionId
 */
export const handleOAuthConnectionsDelete = httpAction(async (ctx, request) => {
  try {
    const auth = await authenticateWithScope(ctx, request, "oauth:write");
    if (!auth.success) return auth.response;

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const connectionId = pathParts[pathParts.length - 1] as Id<"oauthConnections">;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Connection ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.oauthConnectionsInternal.deleteOAuthConnectionInternal,
      {
        organizationId: auth.authContext.organizationId,
        connectionId,
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
    console.error("API /oauth/connections/:id (DELETE) error:", error);
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
