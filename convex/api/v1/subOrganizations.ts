/**
 * API V1: SUB-ORGANIZATION ENDPOINTS
 *
 * Manages parent-child organization hierarchy for the agency model.
 *
 * Endpoints:
 * - POST /api/v1/organizations/children         - Create child org
 * - GET  /api/v1/organizations/children          - List child orgs
 * - GET  /api/v1/organizations/children/:childId - Get child org
 * - PATCH /api/v1/organizations/children/:childId - Update child org
 *
 * Security: Triple authentication (API keys, OAuth, CLI sessions)
 * Scope: organizations:read, organizations:write
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import { validateConvexId, invalidIdResponse } from "./httpHelpers";

/**
 * CREATE CHILD ORGANIZATION
 * POST /api/v1/organizations/children
 */
export const createChildOrganization = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["organizations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { name, slug, businessName } = body;

    if (!name || !slug) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(
      internal.api.v1.subOrganizationsInternal.createChildOrganizationInternal,
      {
        parentOrganizationId: authContext.organizationId,
        name,
        slug,
        businessName,
        performedBy: authContext.userId,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        childOrganizationId: result.childOrganizationId,
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
    console.error("API /organizations/children (POST) error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    if (errMsg.includes("DUPLICATE_SLUG")) {
      return new Response(
        JSON.stringify({ error: "Slug already in use" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    if (errMsg.includes("INVALID_OPERATION")) {
      return new Response(
        JSON.stringify({ error: "Cannot nest sub-orgs more than one level deep" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST CHILD ORGANIZATIONS
 * GET /api/v1/organizations/children
 */
export const listChildOrganizations = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["organizations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await ctx.runQuery(
      internal.api.v1.subOrganizationsInternal.getChildOrganizationsInternal,
      {
        parentOrganizationId: authContext.organizationId,
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
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /organizations/children (GET) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CHILD ORGANIZATION
 * GET /api/v1/organizations/children/:childId
 */
export const getChildOrganization = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["organizations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const childIdStr = pathParts[pathParts.length - 1];
    const childId = validateConvexId(childIdStr, "organizations");

    if (!childId) {
      return invalidIdResponse("childOrganizationId");
    }

    const org = await ctx.runQuery(
      internal.api.v1.subOrganizationsInternal.getChildOrganizationInternal,
      {
        parentOrganizationId: authContext.organizationId,
        childOrganizationId: childId,
      }
    );

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Child organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(org),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /organizations/children/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE CHILD ORGANIZATION
 * PATCH /api/v1/organizations/children/:childId
 */
export const updateChildOrganization = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["organizations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const childIdStr = pathParts[pathParts.length - 1];
    const childId = validateConvexId(childIdStr, "organizations");

    if (!childId) {
      return invalidIdResponse("childOrganizationId");
    }

    const body = await request.json();
    const { name, businessName, isActive } = body;

    await ctx.runMutation(
      internal.api.v1.subOrganizationsInternal.updateChildOrganizationInternal,
      {
        parentOrganizationId: authContext.organizationId,
        childOrganizationId: childId,
        updates: { name, businessName, isActive },
        performedBy: authContext.userId,
      }
    );

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
    console.error("API /organizations/children/:id (PATCH) error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    const status = errMsg.includes("NOT_FOUND") ? 404 : errMsg.includes("FORBIDDEN") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: status === 500 ? "Internal server error" : errMsg }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});
