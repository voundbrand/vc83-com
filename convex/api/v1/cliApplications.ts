/**
 * CLI APPLICATIONS API
 *
 * HTTP handlers for CLI application registration and management.
 * Uses universal authentication (CLI session, API key, or OAuth token).
 *
 * Endpoints:
 * - POST /api/v1/cli/applications - Register new application
 * - GET /api/v1/cli/applications - List all applications
 * - GET /api/v1/cli/applications/by-path?hash={hash} - Find by project path
 * - GET /api/v1/cli/applications/:id - Get application details
 * - PATCH /api/v1/cli/applications/:id - Update application
 */

import { httpAction } from "../../_generated/server";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import type { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

// ============================================================================
// POST /api/v1/cli/applications - Register Application
// ============================================================================

export const registerApplication = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication (CLI session, API key, or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require applications:write scope
    const scopeCheck = requireScopes(authContext, ["applications:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
    const hasAccess = await (ctx as any).runQuery(generatedApi.internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
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
    const result = await (ctx as any).runMutation(generatedApi.internal.applicationOntology.registerApplicationInternal, {
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
    const apiKeyResult = await (ctx as any).runAction(generatedApi.internal.api.v1.cliAuth.generateCliApiKeyInternal, {
      organizationId: targetOrgId,
      userId: authContext.userId,
      name: `${name} API Key`,
      scopes: ["*"],
    });

    // Link API key to application
    // This enforces "one API key = one application" constraint
    try {
      await (ctx as any).runMutation(generatedApi.internal.api.v1.cliApplicationsInternal.linkApiKeyToApplication, {
        applicationId: result.applicationId,
        apiKeyId: apiKeyResult.id,
      });
    } catch (linkError: any) {
      // Check if this is an API key already linked error
      if (linkError.message?.includes("already connected to another application")) {
        return new Response(
          JSON.stringify({
            error: linkError.message,
            code: "API_KEY_ALREADY_LINKED",
            suggestion: "Each API key can only be connected to one application. Generate a new API key from your L4YERCAK3 dashboard, or disconnect the existing application first.",
            details: {
              applicationId: result.applicationId,
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw linkError; // Re-throw other errors
    }

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
  } catch (error: any) {
    console.error("[CLI Applications] Register error:", error);

    // Handle specific error codes
    if (error.code === "API_KEY_ALREADY_LINKED") {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          suggestion: error.suggestion || "Generate a new API key for this application.",
          linkedApplicationName: error.linkedApplicationName,
        }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
    // Universal authentication (CLI session, API key, or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require applications:read scope
    const scopeCheck = requireScopes(authContext, ["applications:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") || authContext.organizationId;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Verify user has access to the organization
    const hasAccess = await (ctx as any).runQuery(generatedApi.internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
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
    const result = await (ctx as any).runQuery(generatedApi.internal.applicationOntology.listApplicationsInternal, {
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
    // Universal authentication (CLI session, API key, or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require applications:read scope
    const scopeCheck = requireScopes(authContext, ["applications:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
    const hasAccess = await (ctx as any).runQuery(generatedApi.internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
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
    const app = await (ctx as any).runQuery(generatedApi.internal.applicationOntology.getApplicationByPathHashInternal, {
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
    // Universal authentication (CLI session, API key, or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require applications:read scope
    const scopeCheck = requireScopes(authContext, ["applications:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
    const app = await (ctx as any).runQuery(generatedApi.internal.applicationOntology.getApplicationInternal, {
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
    const hasAccess = await (ctx as any).runQuery(generatedApi.internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
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
    // Universal authentication (CLI session, API key, or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require applications:write scope
    const scopeCheck = requireScopes(authContext, ["applications:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
    const app = await (ctx as any).runQuery(generatedApi.internal.applicationOntology.getApplicationInternal, {
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
    const hasAccess = await (ctx as any).runQuery(generatedApi.internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
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
    await (ctx as any).runMutation(generatedApi.internal.applicationOntology.updateApplicationInternal, {
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
    // Universal authentication (CLI session, API key, or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require applications:write scope for sync operations
    const scopeCheck = requireScopes(authContext, ["applications:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
    const app = await (ctx as any).runQuery(generatedApi.internal.applicationOntology.getApplicationInternal, {
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
    const hasAccess = await (ctx as any).runQuery(generatedApi.internal.api.v1.cliApplicationsInternal.checkOrgAccessInternal, {
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
      await (ctx as any).runMutation(generatedApi.internal.api.v1.cliApplicationsInternal.recordSyncEvent, {
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
