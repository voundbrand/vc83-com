/**
 * CLI APPLICATIONS API
 *
 * HTTP handlers for CLI application registration and management.
 * Uses CLI session token authentication (Bearer token).
 *
 * Endpoints:
 * - POST /api/v1/cli/applications - Register new application
 * - GET /api/v1/cli/applications - List all applications
 * - GET /api/v1/cli/applications/by-path?hash={hash} - Find by project path
 * - GET /api/v1/cli/applications/:id - Get application details
 * - PATCH /api/v1/cli/applications/:id - Update application
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// HELPER: Verify CLI Token
// ============================================================================

async function verifyCliToken(
  ctx: { runQuery: (fn: any, args: any) => Promise<any> },
  authHeader: string | null
): Promise<{
  userId: Id<"users">;
  email: string;
  organizationId: Id<"organizations">;
} | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  // Validate CLI session
  const session = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.validateCliTokenInternal, {
    token,
  });

  return session;
}

// ============================================================================
// POST /api/v1/cli/applications - Register Application
// ============================================================================

export const registerApplication = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify CLI token
    const authContext = await verifyCliToken(ctx, request.headers.get("Authorization"));
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired CLI session", code: "INVALID_SESSION" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      organizationId,
      name,
      description,
      source,
      connection,
      modelMappings,
    } = body;

    // Validate required fields
    if (!name || !source || !connection) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, source, connection", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use provided organizationId or default from session
    const targetOrgId = organizationId || authContext.organizationId;

    // Verify user has access to the organization
    const hasAccess = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
      userId: authContext.userId,
      organizationId: targetOrgId,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Not authorized to access this organization", code: "UNAUTHORIZED" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Register application
    const result = await ctx.runMutation(internal.applicationOntology.registerApplicationInternal, {
      organizationId: targetOrgId,
      name,
      description,
      source: {
        type: source.type || "cli",
        projectPathHash: source.projectPathHash,
        cliVersion: source.cliVersion,
        framework: source.framework,
        frameworkVersion: source.frameworkVersion,
        hasTypeScript: source.hasTypeScript,
        routerType: source.routerType,
      },
      connection: {
        features: connection.features || [],
        hasFrontendDatabase: connection.hasFrontendDatabase,
        frontendDatabaseType: connection.frontendDatabaseType,
      },
      modelMappings: modelMappings?.map((m: any) => ({
        localModel: m.localModel,
        layerCakeType: m.layerCakeType,
        syncDirection: m.syncDirection || "none",
        confidence: m.confidence || 0,
        isAutoDetected: m.isAutoDetected || false,
      })),
    });

    // If this was an existing application, return 200 with existing flag
    if (result.existingApplication) {
      return new Response(
        JSON.stringify({
          success: true,
          applicationId: result.applicationId,
          existingApplication: true,
          message: "Application already registered for this project",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate API key for the new application
    const apiKeyResult = await ctx.runAction(internal.api.v1.cliAuth.generateCliApiKeyInternal, {
      organizationId: targetOrgId,
      userId: authContext.userId,
      name: `${name} API Key`,
      scopes: ["*"],
    });

    // Link API key to application
    await ctx.runMutation(internal.api.v1.cliApplicationsInternal.linkApiKeyToApplication, {
      applicationId: result.applicationId,
      apiKeyId: apiKeyResult.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        applicationId: result.applicationId,
        existingApplication: false,
        apiKey: {
          id: apiKeyResult.id,
          key: apiKeyResult.key,
          prefix: apiKeyResult.key.substring(0, 12) + "...",
        },
        backendUrl: result.backendUrl,
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Applications] Register error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/cli/applications - List Applications
// ============================================================================

export const listApplications = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify CLI token
    const authContext = await verifyCliToken(ctx, request.headers.get("Authorization"));
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired CLI session", code: "INVALID_SESSION" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") || authContext.organizationId;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Verify user has access to the organization
    const hasAccess = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
      userId: authContext.userId,
      organizationId: organizationId as Id<"organizations">,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Not authorized to access this organization", code: "UNAUTHORIZED" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // List applications
    const result = await ctx.runQuery(internal.applicationOntology.listApplicationsInternal, {
      organizationId: organizationId as Id<"organizations">,
      status,
      limit,
      offset,
    });

    return new Response(
      JSON.stringify({
        success: true,
        applications: result.applications.map((app: any) => ({
          id: app._id,
          name: app.name,
          description: app.description,
          status: app.status,
          framework: app.customProperties?.source?.framework,
          features: app.customProperties?.connection?.features || [],
          registeredAt: app.customProperties?.cli?.registeredAt,
          lastActivityAt: app.customProperties?.cli?.lastActivityAt,
        })),
        total: result.total,
        hasMore: result.hasMore,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Applications] List error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/cli/applications/by-path - Find by Path Hash
// ============================================================================

export const getApplicationByPath = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify CLI token
    const authContext = await verifyCliToken(ctx, request.headers.get("Authorization"));
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired CLI session", code: "INVALID_SESSION" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const hash = url.searchParams.get("hash");
    const organizationId = url.searchParams.get("organizationId") || authContext.organizationId;

    if (!hash) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: hash", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has access to the organization
    const hasAccess = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
      userId: authContext.userId,
      organizationId: organizationId as Id<"organizations">,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Not authorized to access this organization", code: "UNAUTHORIZED" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find application
    const app = await ctx.runQuery(internal.applicationOntology.getApplicationByPathHashInternal, {
      organizationId: organizationId as Id<"organizations">,
      projectPathHash: hash,
    });

    if (!app) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        found: true,
        application: app,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Applications] Get by path error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/cli/applications/:id - Get Application Details
// ============================================================================

export const getApplication = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify CLI token
    const authContext = await verifyCliToken(ctx, request.headers.get("Authorization"));
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired CLI session", code: "INVALID_SESSION" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract application ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const applicationId = pathParts[pathParts.length - 1];

    // Skip handling for special paths that should be handled by other routes
    if (!applicationId || applicationId === "by-path" || applicationId === "applications") {
      return new Response(
        JSON.stringify({ error: "Application ID required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get application
    const app = await ctx.runQuery(internal.applicationOntology.getApplicationInternal, {
      applicationId: applicationId as Id<"objects">,
      organizationId: authContext.organizationId,
    });

    if (!app) {
      return new Response(
        JSON.stringify({ error: "Application not found", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has access to the application's organization
    const hasAccess = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
      userId: authContext.userId,
      organizationId: app.organizationId,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Not authorized to access this application", code: "UNAUTHORIZED" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const props = app.customProperties as any;

    return new Response(
      JSON.stringify({
        success: true,
        application: {
          id: app._id,
          name: app.name,
          description: app.description,
          status: app.status,
          source: props?.source,
          connection: {
            ...props?.connection,
            apiKeyPrefix: props?.connection?.apiKeyId ? "***" : undefined,
          },
          modelMappings: props?.modelMappings,
          deployment: props?.deployment,
          sync: props?.sync,
          cli: props?.cli,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Applications] Get error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// PATCH /api/v1/cli/applications/:id - Update Application
// ============================================================================

export const updateApplication = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify CLI token
    const authContext = await verifyCliToken(ctx, request.headers.get("Authorization"));
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired CLI session", code: "INVALID_SESSION" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract application ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const applicationId = pathParts[pathParts.length - 1];

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Application ID required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get application to verify ownership
    const app = await ctx.runQuery(internal.applicationOntology.getApplicationInternal, {
      applicationId: applicationId as Id<"objects">,
      organizationId: authContext.organizationId,
    });

    if (!app) {
      return new Response(
        JSON.stringify({ error: "Application not found", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has access
    const hasAccess = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
      userId: authContext.userId,
      organizationId: app.organizationId,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Not authorized to update this application", code: "UNAUTHORIZED" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await request.json();

    // Update application
    await ctx.runMutation(internal.applicationOntology.updateApplicationInternal, {
      applicationId: applicationId as Id<"objects">,
      organizationId: app.organizationId,
      name: body.name,
      description: body.description,
      status: body.status,
      connection: body.connection,
      deployment: body.deployment,
      modelMappings: body.modelMappings,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Applications] Update error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/cli/applications/:id/sync - Sync Application
// ============================================================================

export const syncApplication = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify CLI token
    const authContext = await verifyCliToken(ctx, request.headers.get("Authorization"));
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired CLI session", code: "INVALID_SESSION" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract application ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL: /api/v1/cli/applications/:id/sync
    const syncIndex = pathParts.indexOf("sync");
    const applicationId = syncIndex > 0 ? pathParts[syncIndex - 1] : null;

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Application ID required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get application to verify ownership
    const app = await ctx.runQuery(internal.applicationOntology.getApplicationInternal, {
      applicationId: applicationId as Id<"objects">,
      organizationId: authContext.organizationId,
    });

    if (!app) {
      return new Response(
        JSON.stringify({ error: "Application not found", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has access
    const hasAccess = await ctx.runQuery(internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
      userId: authContext.userId,
      organizationId: app.organizationId,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Not authorized to sync this application", code: "UNAUTHORIZED" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      direction = "bidirectional",
      models,
      dryRun = false,
      // Sync results (if CLI is reporting completed sync)
      results,
    } = body;

    // If CLI is reporting sync results
    if (results) {
      // Record sync event
      await ctx.runMutation(internal.api.v1.cliApplicationsInternal.recordSyncEvent, {
        applicationId: applicationId as Id<"objects">,
        direction: results.direction || direction,
        status: results.status || "success",
        recordsProcessed: results.recordsProcessed || 0,
        recordsCreated: results.recordsCreated || 0,
        recordsUpdated: results.recordsUpdated || 0,
        errors: results.errors || 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Sync results recorded",
          syncId: `sync_${Date.now()}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Otherwise, this is a sync request - return what should be synced
    // For now, return sync configuration (CLI will execute the actual sync)
    const props = app.customProperties as any;
    const modelMappings = props?.modelMappings || [];
    const features = props?.connection?.features || [];

    // Filter mappings by requested models if specified
    const filteredMappings = models
      ? modelMappings.filter((m: any) => models.includes(m.localModel))
      : modelMappings;

    return new Response(
      JSON.stringify({
        success: true,
        syncId: `sync_${Date.now()}`,
        dryRun,
        direction,
        application: {
          id: app._id,
          name: app.name,
          features,
        },
        modelMappings: filteredMappings,
        // Sync instructions for CLI
        instructions: {
          backendUrl: props?.connection?.backendUrl,
          endpoints: features.map((feature: string) => ({
            feature,
            push: `/api/v1/${feature}/bulk`,
            pull: `/api/v1/${feature}`,
          })),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLI Applications] Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
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
