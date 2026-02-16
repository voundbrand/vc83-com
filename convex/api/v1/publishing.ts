/**
 * API V1: PUBLISHING ENDPOINTS
 *
 * External API for managing published pages.
 * Used by CLI apps and external integrations for publishing management.
 *
 * Endpoints:
 * - GET /api/v1/publishing/pages - List published pages
 * - GET /api/v1/publishing/pages/:pageId - Get page details
 * - POST /api/v1/publishing/pages - Create published page
 * - PATCH /api/v1/publishing/pages/:pageId - Update page
 * - DELETE /api/v1/publishing/pages/:pageId - Delete page
 * - POST /api/v1/publishing/pages/:pageId/publish - Publish page
 * - POST /api/v1/publishing/pages/:pageId/unpublish - Unpublish page
 * - GET /api/v1/publishing/pages/:pageId/analytics - Get page analytics
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: publishing:read, publishing:write
 */

import { httpAction } from "../../_generated/server";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import type { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

/**
 * LIST PUBLISHED PAGES
 * Lists all published pages for an organization with optional filters
 *
 * GET /api/v1/publishing/pages
 *
 * Query Parameters:
 * - status: Filter by status (draft, review, published, unpublished, archived)
 * - linkedObjectType: Filter by type (checkout_product, event, etc.)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   pages: Array<{...}>,
 *   total: number,
 *   hasMore: boolean
 * }
 */
export const listPublishedPages = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:read scope
    const scopeCheck = requireScopes(authContext, ["publishing:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const linkedObjectType = url.searchParams.get("linkedObjectType") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query pages
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.listPublishedPagesInternal,
      {
        organizationId: authContext.organizationId,
        status,
        linkedObjectType,
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
    console.error("API /publishing/pages (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET PUBLISHED PAGE
 * Gets a specific published page by ID
 *
 * GET /api/v1/publishing/pages/:pageId
 *
 * Response: Full page object
 */
export const getPublishedPage = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:read scope
    const scopeCheck = requireScopes(authContext, ["publishing:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const pageId = pathParts[pathParts.length - 1];

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: "Page ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get page
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId: pageId as Id<"objects"> }
    );

    if (!page) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Verify organization access
    if (page.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Return response
    return new Response(
      JSON.stringify(page),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE PUBLISHED PAGE
 * Creates a new published page
 *
 * POST /api/v1/publishing/pages
 *
 * Request Body:
 * {
 *   linkedObjectId: string,       // Object to publish (checkout, event, etc.)
 *   linkedObjectType: string,     // "checkout_product", "event", etc.
 *   slug: string,                 // URL slug
 *   metaTitle: string,            // Page title for SEO
 *   metaDescription?: string,
 *   metaKeywords?: string[],
 *   ogImage?: string,
 *   templateCode?: string,        // Template code (e.g., "landing-page")
 *   themeCode?: string,           // Theme code (e.g., "modern-gradient")
 *   templateContent?: object,     // Template-specific content
 *   colorOverrides?: object,
 *   sectionVisibility?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   pageId: string,
 *   publicUrl: string
 * }
 */
export const createPublishedPage = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:write scope
    const scopeCheck = requireScopes(authContext, ["publishing:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      linkedObjectId,
      linkedObjectType,
      slug,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogImage,
      templateCode,
      themeCode,
      templateContent,
      colorOverrides,
      sectionVisibility,
    } = body;

    // Validate required fields
    if (!linkedObjectId || !linkedObjectType || !slug || !metaTitle) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: linkedObjectId, linkedObjectType, slug, metaTitle"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create page
    const pageId = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.publishingInternal.createPublishedPageInternal,
      {
        organizationId: authContext.organizationId,
        userId: authContext.userId,
        linkedObjectId: linkedObjectId as Id<"objects">,
        linkedObjectType,
        slug,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
        templateCode,
        themeCode,
        templateContent,
        colorOverrides,
        sectionVisibility,
      }
    );

    // 5. Get the created page for public URL
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        pageId,
        publicUrl: page?.publicUrl || "",
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages (POST) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("already in use") ? 409 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE PUBLISHED PAGE
 * Updates page details
 *
 * PATCH /api/v1/publishing/pages/:pageId
 *
 * Request Body:
 * {
 *   slug?: string,
 *   metaTitle?: string,
 *   metaDescription?: string,
 *   metaKeywords?: string[],
 *   ogImage?: string,
 *   templateCode?: string,
 *   themeCode?: string,
 *   templateContent?: object,
 *   colorOverrides?: object,
 *   sectionVisibility?: object,
 *   contentRules?: object
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const updatePublishedPage = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:write scope
    const scopeCheck = requireScopes(authContext, ["publishing:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const pageId = pathParts[pathParts.length - 1];

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: "Page ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify page belongs to organization
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId: pageId as Id<"objects"> }
    );

    if (!page || page.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Parse request body
    const body = await request.json();
    const {
      slug,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogImage,
      templateCode,
      themeCode,
      templateContent,
      colorOverrides,
      sectionVisibility,
      contentRules,
    } = body;

    // 6. Update page
    await (ctx as any).runMutation(
      generatedApi.internal.api.v1.publishingInternal.updatePublishedPageInternal,
      {
        pageId: pageId as Id<"objects">,
        userId: authContext.userId,
        slug,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
        templateCode,
        themeCode,
        templateContent,
        colorOverrides,
        sectionVisibility,
        contentRules,
      }
    );

    // 7. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages/:id (PATCH) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Published page not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE PUBLISHED PAGE
 * Permanently deletes a published page
 *
 * DELETE /api/v1/publishing/pages/:pageId
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const deletePublishedPage = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:write scope
    const scopeCheck = requireScopes(authContext, ["publishing:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const pageId = pathParts[pathParts.length - 1];

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: "Page ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify page belongs to organization
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId: pageId as Id<"objects"> }
    );

    if (!page || page.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Delete page
    await (ctx as any).runMutation(
      generatedApi.internal.api.v1.publishingInternal.deletePublishedPageInternal,
      {
        pageId: pageId as Id<"objects">,
        userId: authContext.userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages/:id (DELETE) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Published page not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * PUBLISH PAGE
 * Changes page status to published
 *
 * POST /api/v1/publishing/pages/:pageId/publish
 *
 * Response:
 * {
 *   success: true,
 *   previousStatus: string
 * }
 */
export const publishPage = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:write scope
    const scopeCheck = requireScopes(authContext, ["publishing:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/publishing/pages/:pageId/publish
    const pageId = pathParts[pathParts.length - 2];

    if (!pageId || pageId === "pages") {
      return new Response(
        JSON.stringify({ error: "Page ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify page belongs to organization
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId: pageId as Id<"objects"> }
    );

    if (!page || page.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Set status to published
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.publishingInternal.setPublishingStatusInternal,
      {
        pageId: pageId as Id<"objects">,
        userId: authContext.userId,
        status: "published",
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        previousStatus: result.previousStatus,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages/:id/publish error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Published page not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UNPUBLISH PAGE
 * Changes page status to unpublished
 *
 * POST /api/v1/publishing/pages/:pageId/unpublish
 *
 * Response:
 * {
 *   success: true,
 *   previousStatus: string
 * }
 */
export const unpublishPage = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:write scope
    const scopeCheck = requireScopes(authContext, ["publishing:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/publishing/pages/:pageId/unpublish
    const pageId = pathParts[pathParts.length - 2];

    if (!pageId || pageId === "pages") {
      return new Response(
        JSON.stringify({ error: "Page ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify page belongs to organization
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId: pageId as Id<"objects"> }
    );

    if (!page || page.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Set status to unpublished
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.publishingInternal.setPublishingStatusInternal,
      {
        pageId: pageId as Id<"objects">,
        userId: authContext.userId,
        status: "unpublished",
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        previousStatus: result.previousStatus,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages/:id/unpublish error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Published page not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET PAGE ANALYTICS
 * Returns analytics for a published page
 *
 * GET /api/v1/publishing/pages/:pageId/analytics
 *
 * Response:
 * {
 *   viewCount: number,
 *   uniqueVisitors: number,
 *   lastViewedAt: number | null,
 *   publishedAt: number | null,
 *   analyticsEnabled: boolean
 * }
 */
export const getPageAnalytics = httpAction(async (ctx, request) => {
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

    // 2. Require publishing:read scope
    const scopeCheck = requireScopes(authContext, ["publishing:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract page ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/publishing/pages/:pageId/analytics
    const pageId = pathParts[pathParts.length - 2];

    if (!pageId || pageId === "pages") {
      return new Response(
        JSON.stringify({ error: "Page ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify page belongs to organization
    const page = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
      { pageId: pageId as Id<"objects"> }
    );

    if (!page || page.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Published page not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Get analytics
    const analytics = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.publishingInternal.getPageAnalyticsInternal,
      { pageId: pageId as Id<"objects"> }
    );

    // 6. Return response
    return new Response(
      JSON.stringify(analytics),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /publishing/pages/:id/analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * COMBINED POST HANDLER for /api/v1/publishing/pages/:id/publish and /unpublish
 * Routes POST requests to the appropriate handler based on URL path
 */
export const handlePublishingPost = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/publish")) {
    // Extract page ID and call publish logic inline
    const pathParts = url.pathname.split("/");
    const pageId = pathParts[pathParts.length - 2];

    try {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const authContext = authResult.context;

      const scopeCheck = requireScopes(authContext, ["publishing:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!pageId || pageId === "pages") {
        return new Response(
          JSON.stringify({ error: "Page ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const page = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
        { pageId: pageId as Id<"objects"> }
      );

      if (!page || page.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Published page not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.publishingInternal.setPublishingStatusInternal,
        {
          pageId: pageId as Id<"objects">,
          userId: authContext.userId,
          status: "published",
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          previousStatus: result.previousStatus,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /publishing/pages/:id/publish error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (url.pathname.endsWith("/unpublish")) {
    // Extract page ID and call unpublish logic inline
    const pathParts = url.pathname.split("/");
    const pageId = pathParts[pathParts.length - 2];

    try {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const authContext = authResult.context;

      const scopeCheck = requireScopes(authContext, ["publishing:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!pageId || pageId === "pages") {
        return new Response(
          JSON.stringify({ error: "Page ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const page = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
        { pageId: pageId as Id<"objects"> }
      );

      if (!page || page.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Published page not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await (ctx as any).runMutation(
        generatedApi.internal.api.v1.publishingInternal.setPublishingStatusInternal,
        {
          pageId: pageId as Id<"objects">,
          userId: authContext.userId,
          status: "unpublished",
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          previousStatus: result.previousStatus,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /publishing/pages/:id/unpublish error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Path not matched
  return new Response(
    JSON.stringify({ error: "Not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});

/**
 * COMBINED GET HANDLER for /api/v1/publishing/pages/:id and /analytics
 * Routes GET requests to the appropriate handler based on URL path
 */
export const handlePublishingGet = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/analytics")) {
    // ---- GET PAGE ANALYTICS ----
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

      // 2. Require publishing:read scope
      const scopeCheck = requireScopes(authContext, ["publishing:read"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Extract page ID from URL
      const pathParts = url.pathname.split("/");
      const pageId = pathParts[pathParts.length - 2];

      if (!pageId || pageId === "pages") {
        return new Response(
          JSON.stringify({ error: "Page ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Verify page belongs to organization
      const page = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
        { pageId: pageId as Id<"objects"> }
      );

      if (!page || page.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Published page not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 5. Get analytics
      const analytics = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.publishingInternal.getPageAnalyticsInternal,
        { pageId: pageId as Id<"objects"> }
      );

      // 6. Return response
      return new Response(
        JSON.stringify(analytics),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /publishing/pages/:id/analytics error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    // ---- GET PAGE DETAILS ----
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

      // 2. Require publishing:read scope
      const scopeCheck = requireScopes(authContext, ["publishing:read"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Extract page ID from URL
      const pathParts = url.pathname.split("/");
      const pageId = pathParts[pathParts.length - 1];

      if (!pageId) {
        return new Response(
          JSON.stringify({ error: "Page ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Get page
      const page = await (ctx as any).runQuery(
        generatedApi.internal.api.v1.publishingInternal.getPublishedPageInternal,
        { pageId: pageId as Id<"objects"> }
      );

      if (!page) {
        return new Response(
          JSON.stringify({ error: "Published page not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 5. Verify organization access
      if (page.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Published page not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 6. Return response
      return new Response(
        JSON.stringify(page),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": authContext.organizationId,
          },
        }
      );
    } catch (error) {
      console.error("API /publishing/pages/:id error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
});

/**
 * CORS OPTIONS handler for publishing endpoints
 */
export const handleOptions = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Organization-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
});
