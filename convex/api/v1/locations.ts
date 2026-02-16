/**
 * API V1: LOCATIONS ENDPOINTS
 *
 * External API for managing locations.
 * Used by CLI apps and external integrations for location management.
 *
 * Endpoints:
 * - GET /api/v1/locations - List locations
 * - POST /api/v1/locations - Create location
 * - GET /api/v1/locations/:id - Get location details
 * - PATCH /api/v1/locations/:id - Update location
 * - DELETE /api/v1/locations/:id - Archive location
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: locations:read, locations:write
 */

import { httpAction } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { authenticateRequest, requireScopes } from "../../middleware/auth";

const generatedApi: any = require("../../_generated/api");

/**
 * LIST LOCATIONS
 * Lists all locations for an organization with optional filters
 *
 * GET /api/v1/locations
 *
 * Query Parameters:
 * - status: Filter by status (active, inactive, archived)
 * - subtype: Filter by location type (branch, venue, virtual)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   locations: Array<{...}>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listLocations = httpAction(async (ctx, request) => {
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

    // 2. Require locations:read scope
    const scopeCheck = requireScopes(authContext, ["locations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const subtype = url.searchParams.get("subtype") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query locations
    const result = await (ctx as any).runQuery(generatedApi.internal.locationOntology.listLocationsInternal, {
      organizationId: authContext.organizationId,
      status,
      subtype,
      limit,
      offset,
    });

    return new Response(
      JSON.stringify({
        locations: result.locations,
        total: result.total,
        limit,
        offset,
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
    console.error("API /locations error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE LOCATION
 * Creates a new location
 *
 * POST /api/v1/locations
 *
 * Request Body:
 * {
 *   name: string,
 *   subtype: "branch" | "venue" | "virtual",
 *   address?: { street, city, state, postalCode, country },
 *   timezone?: string,
 *   operatingHours?: { monday: { open, close }, ... },
 *   contactEmail?: string,
 *   contactPhone?: string
 * }
 *
 * Response:
 * { locationId: string, name: string, status: string }
 */
export const createLocation = httpAction(async (ctx, request) => {
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

    // 2. Require locations:write scope
    const scopeCheck = requireScopes(authContext, ["locations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();

    // 4. Validate required fields
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validSubtypes = ["branch", "venue", "virtual"];
    if (!body.subtype || !validSubtypes.includes(body.subtype)) {
      return new Response(
        JSON.stringify({ error: `subtype must be one of: ${validSubtypes.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Create location
    const result = await (ctx as any).runMutation(generatedApi.internal.locationOntology.createLocationInternal, {
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      name: body.name,
      subtype: body.subtype,
      address: body.address,
      timezone: body.timezone,
      operatingHours: body.operatingHours,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    });

    return new Response(
      JSON.stringify({
        locationId: result.locationId,
        name: body.name,
        status: "active",
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
    console.error("API POST /locations error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET LOCATION
 * Gets a single location by ID
 *
 * GET /api/v1/locations/:id
 *
 * Response:
 * {
 *   _id: string,
 *   name: string,
 *   subtype: string,
 *   status: string,
 *   address: {...},
 *   timezone: string,
 *   operatingHours: {...},
 *   ...
 * }
 */
export const getLocation = httpAction(async (ctx, request) => {
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

    // 2. Require locations:read scope
    const scopeCheck = requireScopes(authContext, ["locations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract location ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const locationId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!locationId) {
      return new Response(
        JSON.stringify({ error: "Location ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get location
    const location = await (ctx as any).runQuery(generatedApi.internal.locationOntology.getLocationInternal, {
      locationId,
      organizationId: authContext.organizationId,
    });

    if (!location) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format response
    const props = location.customProperties as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        _id: location._id,
        name: location.name,
        subtype: location.subtype,
        status: location.status,
        address: props.address || null,
        timezone: props.timezone || "UTC",
        operatingHours: props.defaultOperatingHours || null,
        contactEmail: props.contactEmail || null,
        contactPhone: props.contactPhone || null,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
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
    console.error("API GET /locations/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE LOCATION
 * Updates a location
 *
 * PATCH /api/v1/locations/:id
 *
 * Request Body (all fields optional):
 * {
 *   name?: string,
 *   status?: "active" | "inactive" | "archived",
 *   address?: { street, city, state, postalCode, country },
 *   timezone?: string,
 *   operatingHours?: { monday: { open, close }, ... },
 *   contactEmail?: string,
 *   contactPhone?: string
 * }
 *
 * Response:
 * { locationId: string, updated: true }
 */
export const updateLocation = httpAction(async (ctx, request) => {
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

    // 2. Require locations:write scope
    const scopeCheck = requireScopes(authContext, ["locations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract location ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const locationId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!locationId) {
      return new Response(
        JSON.stringify({ error: "Location ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();

    // 5. Validate status if provided
    if (body.status) {
      const validStatuses = ["active", "inactive", "archived"];
      if (!validStatuses.includes(body.status)) {
        return new Response(
          JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 6. Update location
    await (ctx as any).runMutation(generatedApi.internal.locationOntology.updateLocationInternal, {
      locationId,
      organizationId: authContext.organizationId,
      name: body.name,
      status: body.status,
      address: body.address,
      timezone: body.timezone,
      operatingHours: body.operatingHours,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    });

    return new Response(
      JSON.stringify({
        locationId,
        updated: true,
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
    console.error("API PATCH /locations/:id error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage === "Location not found") {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE LOCATION
 * Archives a location (soft delete)
 *
 * DELETE /api/v1/locations/:id
 *
 * Response:
 * { locationId: string, archived: true }
 */
export const deleteLocation = httpAction(async (ctx, request) => {
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

    // 2. Require locations:write scope
    const scopeCheck = requireScopes(authContext, ["locations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract location ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const locationId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!locationId) {
      return new Response(
        JSON.stringify({ error: "Location ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Archive location
    await (ctx as any).runMutation(generatedApi.internal.locationOntology.archiveLocationInternal, {
      locationId,
      organizationId: authContext.organizationId,
    });

    return new Response(
      JSON.stringify({
        locationId,
        archived: true,
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
    console.error("API DELETE /locations/:id error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    if (errorMessage === "Location not found") {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
