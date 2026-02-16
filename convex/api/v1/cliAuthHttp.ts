/**
 * CLI AUTH HTTP HANDLERS
 *
 * HTTP action handlers for CLI authentication endpoints.
 * These wrap the existing cliAuth queries/mutations for HTTP access.
 *
 * Endpoints:
 * - GET /api/v1/auth/cli/validate - Validate CLI session token
 * - POST /api/v1/auth/cli/refresh - Refresh CLI session token
 * - GET /api/v1/auth/cli/organizations - List user's organizations
 * - POST /api/v1/auth/cli/organizations - Create new organization
 * - GET /api/v1/auth/cli/api-keys - List API keys for organization
 * - POST /api/v1/auth/cli/api-keys - Generate new API key
 */

import { httpAction } from "../../_generated/server";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import type { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

// ============================================================================
// GET /api/v1/auth/cli/validate - Validate CLI Session
// ============================================================================

export const validateSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");
    console.log(`[CLI Auth HTTP] validateSession: authHeader present: ${!!authHeader}`);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[CLI Auth HTTP] validateSession: Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Missing or invalid Authorization header",
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    // Enhanced debug logging: show token prefix and FULL LENGTH
    console.log(`[CLI Auth HTTP] validateSession: Token: ${token.substring(0, 30)}... (length: ${token.length})`);

    // validateCliSession is now an Action (uses bcrypt verification)
    const userInfo = await (ctx as any).runAction(generatedApi.api.api.v1.cliAuth.validateCliSession, {
      token,
    });
    console.log(`[CLI Auth HTTP] validateSession: Query result: ${userInfo ? 'found user' : 'null'}`);

    if (!userInfo) {
      console.log("[CLI Auth HTTP] validateSession: Returning invalid session response");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid or expired session",
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Return CLI-compatible format with organizationId and permissions for MCP tools
    return new Response(
      JSON.stringify({
        valid: true,
        userId: userInfo.userId,
        email: userInfo.email,
        organizationId: userInfo.organizationId,
        organizationName: userInfo.organizationName,
        permissions: userInfo.permissions,
        user: {
          id: userInfo.userId,
          email: userInfo.email,
          name: userInfo.email.split("@")[0],
        },
        organizations: userInfo.organizations,
        expiresAt: userInfo.expiresAt,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] Validation error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Failed to validate session",
        error_description: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/auth/cli/refresh - Refresh CLI Session
// ============================================================================

export const refreshSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);

    // refreshCliSession is now an Action (uses bcrypt for new token)
    const result = await (ctx as any).runAction(generatedApi.api.api.v1.cliAuth.refreshCliSession, {
      token,
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] Refresh error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to refresh session",
        error_description: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/auth/cli/revoke - Revoke CLI Session (Logout)
// ============================================================================

export const revokeSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    console.log(`[CLI Auth HTTP] revokeSession: Revoking token prefix: ${token.substring(0, 20)}...`);

    // revokeCliSession is now an Action (uses bcrypt verification)
    const result = await (ctx as any).runAction(generatedApi.api.api.v1.cliAuth.revokeCliSession, {
      token,
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] Revoke error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to revoke session",
        error_description: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/auth/cli/organizations - List User's Organizations
// ============================================================================

export const listOrganizations = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[CLI Auth HTTP] listOrganizations: Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    const tokenPrefix = token.substring(0, 20);
    console.log(`[CLI Auth HTTP] listOrganizations: Received token prefix: ${tokenPrefix}...`);

    // getCliUserOrganizations is now an Action (uses bcrypt verification)
    const result = await (ctx as any).runAction(generatedApi.api.api.v1.cliAuth.getCliUserOrganizations, {
      token,
    });

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] List organizations error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list organizations" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/auth/cli/organizations - Create Organization
// ============================================================================

export const createOrganization = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Organization name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await (ctx as any).runAction(generatedApi.api.api.v1.cliAuth.createCliOrganization, {
      token,
      name,
    });

    return new Response(
      JSON.stringify(result),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] Create organization error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to create organization" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/auth/cli/api-keys - List API Keys
// ============================================================================

export const listApiKeys = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);

    // Get organizationId from query params
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await (ctx as any).runQuery(generatedApi.api.api.v1.cliAuth.listCliApiKeys, {
      token,
      organizationId: organizationId as Id<"organizations">,
    });

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Invalid session or no access to organization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] List API keys error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list API keys" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/auth/cli/api-keys - Generate API Key
// ============================================================================

export const generateApiKey = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    const body = await request.json();
    const { organizationId, name, scopes } = body;

    if (!organizationId || !name) {
      return new Response(
        JSON.stringify({ error: "organizationId and name are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await (ctx as any).runAction(generatedApi.api.api.v1.cliAuth.generateCliApiKey, {
      token,
      organizationId: organizationId as Id<"organizations">,
      name,
      scopes,
    });

    return new Response(
      JSON.stringify(result),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Auth] Generate API key error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate API key";

    // Check for specific error types
    if (errorMessage.includes("limit reached") || errorMessage.includes("API key limit")) {
      return new Response(
        JSON.stringify({
          error: errorMessage,
          code: "LIMIT_REACHED",
          upgradeUrl: "https://app.l4yercak3.com/upgrade"
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// OPTIONS Handler (CORS)
// ============================================================================

export const handleOptions = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});
