/**
 * ACTIVITY PROTOCOL API
 *
 * HTTP handlers for Activity Protocol - event logging, page detection, and activity tracking.
 * Uses universal authentication (CLI session, API key, or OAuth token).
 *
 * Endpoints:
 * - POST /api/v1/activity/events - Log an activity event
 * - GET /api/v1/activity/events - Get activity events
 * - GET /api/v1/activity/stats - Get activity statistics
 * - POST /api/v1/activity/pages - Register a single page
 * - POST /api/v1/activity/pages/bulk - Bulk register pages
 * - GET /api/v1/activity/pages - Get application pages
 * - PATCH /api/v1/activity/pages/:id/bindings - Update page bindings
 * - PATCH /api/v1/activity/pages/:id/status - Update page status
 * - DELETE /api/v1/activity/pages/:id - Delete a page
 * - GET /api/v1/activity/settings - Get activity settings
 * - PATCH /api/v1/activity/settings - Update activity settings
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// POST /api/v1/activity/events - Log Activity Event
// ============================================================================

export const logEvent = httpAction(async (ctx, request) => {
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

    // Require activity:write scope
    const scopeCheck = requireScopes(authContext, ["activity:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      applicationId,
      eventType,
      severity,
      category,
      summary,
      details,
      pageId,
    } = body;

    // Validate required fields
    if (!applicationId || !eventType || !severity || !category || !summary) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: applicationId, eventType, severity, category, summary",
          code: "VALIDATION_ERROR",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate severity
    if (!["debug", "info", "warning", "error"].includes(severity)) {
      return new Response(
        JSON.stringify({
          error: "Invalid severity. Must be: debug, info, warning, error",
          code: "VALIDATION_ERROR",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log event
    const result = await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.logActivityEventInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        eventType,
        severity,
        category,
        summary,
        details,
        pageId: pageId ? (pageId as Id<"objects">) : undefined,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        eventId: result.eventId,
        timestamp: result.timestamp,
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Log event error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/activity/events - Get Activity Events
// ============================================================================

export const getEvents = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require activity:read scope
    const scopeCheck = requireScopes(authContext, ["activity:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId");
    const severity = url.searchParams.get("severity") as "debug" | "info" | "warning" | "error" | null;
    const category = url.searchParams.get("category");
    const debugMode = url.searchParams.get("debugMode") === "true";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: applicationId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get events
    const result = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getActivityEventsInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        severity: severity || undefined,
        category: category || undefined,
        debugMode,
        limit,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        events: result.events,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Get events error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/activity/stats - Get Activity Statistics
// ============================================================================

export const getStats = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require activity:read scope
    const scopeCheck = requireScopes(authContext, ["activity:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId");
    const timeRange = url.searchParams.get("timeRange") as "1h" | "24h" | "7d" | null;

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: applicationId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get stats
    const stats = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getActivityStatsInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        timeRange: timeRange || undefined,
      }
    );

    return new Response(
      JSON.stringify({ success: true, stats }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Get stats error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/activity/pages - Register Single Page
// ============================================================================

export const registerPage = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
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
      applicationId,
      path,
      name,
      detectionMethod,
      pageType,
      objectBindings,
    } = body;

    // Validate required fields
    if (!applicationId || !path || !name || !detectionMethod) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: applicationId, path, name, detectionMethod",
          code: "VALIDATION_ERROR",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Register page
    const result = await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.registerPageInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        path,
        name,
        detectionMethod,
        pageType,
        objectBindings,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        pageId: result.pageId,
        created: result.created,
      }),
      { status: result.created ? 201 : 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Register page error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// POST /api/v1/activity/pages/bulk - Bulk Register Pages
// ============================================================================

export const bulkRegisterPages = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
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
    const { applicationId, pages } = body;

    // Validate required fields
    if (!applicationId || !pages || !Array.isArray(pages)) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: applicationId, pages (array)",
          code: "VALIDATION_ERROR",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate pages array
    for (const page of pages) {
      if (!page.path || !page.name) {
        return new Response(
          JSON.stringify({
            error: "Each page must have path and name",
            code: "VALIDATION_ERROR",
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Bulk register
    const result = await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.bulkRegisterPagesInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        pages,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        results: result.results,
        total: result.total,
        created: result.results.filter((r: { created: boolean }) => r.created).length,
        updated: result.results.filter((r: { created: boolean }) => !r.created).length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Bulk register pages error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/activity/pages - Get Application Pages
// ============================================================================

export const getPages = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
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
    const applicationId = url.searchParams.get("applicationId");
    const status = url.searchParams.get("status");

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: applicationId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get pages
    const pages = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getApplicationPagesInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        status: status || undefined,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        pages: pages.map((p) => ({
          id: p._id,
          name: p.name,
          path: (p.customProperties as { path?: string })?.path,
          detectionMethod: (p.customProperties as { detectionMethod?: string })?.detectionMethod,
          pageType: (p.customProperties as { pageType?: string })?.pageType,
          objectBindings: (p.customProperties as { objectBindings?: unknown[] })?.objectBindings || [],
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        total: pages.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Get pages error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// PATCH /api/v1/activity/pages/:id/bindings - Update Page Bindings
// ============================================================================

export const updatePageBindings = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
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

    // Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const bindingsIndex = pathParts.indexOf("bindings");
    const pageId = bindingsIndex > 0 ? pathParts[bindingsIndex - 1] : null;

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: "Page ID required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { objectBindings } = body;

    if (!objectBindings || !Array.isArray(objectBindings)) {
      return new Response(
        JSON.stringify({ error: "Missing required field: objectBindings (array)", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update bindings
    const result = await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.updatePageBindingsInternal,
      {
        pageId: pageId as Id<"objects">,
        objectBindings,
      }
    );

    return new Response(
      JSON.stringify({ success: true, pageId: result.pageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Update page bindings error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// DELETE /api/v1/activity/pages/:id - Delete Page
// ============================================================================

export const deletePage = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
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

    // Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const pageId = pathParts[pathParts.length - 1];

    if (!pageId || pageId === "pages") {
      return new Response(
        JSON.stringify({ error: "Page ID required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete page
    await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.deletePageInternal,
      {
        pageId: pageId as Id<"objects">,
        organizationId: authContext.organizationId,
      }
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Delete page error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// GET /api/v1/activity/settings - Get Activity Settings
// ============================================================================

export const getSettings = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require activity:read scope
    const scopeCheck = requireScopes(authContext, ["activity:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId");

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: applicationId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get settings
    const settings = await ctx.runQuery(
      internal.api.v1.activityProtocolInternal.getSettingsInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
      }
    );

    return new Response(
      JSON.stringify({ success: true, settings }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Get settings error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// PATCH /api/v1/activity/settings - Update Activity Settings
// ============================================================================

export const updateSettings = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: "INVALID_SESSION" }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // Require activity:write scope
    const scopeCheck = requireScopes(authContext, ["activity:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error, code: "INSUFFICIENT_PERMISSIONS" }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      applicationId,
      enabled,
      debugModeDefault,
      retentionDays,
      alertsEnabled,
      alertThresholds,
    } = body;

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: applicationId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update settings
    const result = await ctx.runMutation(
      internal.api.v1.activityProtocolInternal.updateSettingsInternal,
      {
        organizationId: authContext.organizationId,
        applicationId: applicationId as Id<"objects">,
        enabled,
        debugModeDefault,
        retentionDays,
        alertsEnabled,
        alertThresholds,
      }
    );

    return new Response(
      JSON.stringify({ success: true, settingsId: result.settingsId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[Activity Protocol] Update settings error:", error);
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
