/**
 * API V1: BENEFITS ENDPOINTS
 *
 * External API for creating and managing benefits and commissions.
 * Used by external systems to manage employee/partner benefits.
 *
 * Endpoints:
 * - POST /api/v1/benefits - Create benefit
 * - GET /api/v1/benefits - List benefits
 * - GET /api/v1/benefits/:benefitId - Get benefit details
 * - PATCH /api/v1/benefits/:benefitId - Update benefit
 * - DELETE /api/v1/benefits/:benefitId - Delete benefit (draft only)
 * - POST /api/v1/benefits/:benefitId/claims - Create claim
 * - GET /api/v1/benefits/:benefitId/claims - List claims for benefit
 * - POST /api/v1/commissions - Create commission
 * - GET /api/v1/commissions - List commissions
 * - GET /api/v1/commissions/:commissionId - Get commission details
 * - POST /api/v1/commissions/:commissionId/payouts - Create payout
 * - GET /api/v1/commissions/:commissionId/payouts - List payouts
 *
 * Security: Dual authentication support
 * - API keys (full access, backward compatible)
 * - OAuth tokens (scope-based access control)
 * Scope: Returns only benefits/commissions for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";

// ============================================================================
// BENEFITS ENDPOINTS
// ============================================================================

/**
 * CREATE BENEFIT
 * Creates a new benefit
 *
 * POST /api/v1/benefits
 * Required Scope: benefits:write
 */
export const createBenefit = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Parse request body
    const body = await request.json();
    const {
      subtype,
      name,
      description,
      discountValue,
      category,
      validFrom,
      validUntil,
      maxTotalClaims,
      maxClaimsPerMember,
      requirements,
      contactEmail,
      contactPhone,
      customProperties,
    } = body;

    // Validate required fields
    if (!subtype || !name) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: subtype, name"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create benefit
    const benefitId = await ctx.runMutation(
      internal.api.v1.benefitsInternal.createBenefitInternal,
      {
        organizationId,
        subtype,
        name,
        description,
        discountValue,
        category,
        validFrom,
        validUntil,
        maxTotalClaims,
        maxClaimsPerMember,
        requirements,
        contactEmail,
        contactPhone,
        customProperties,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        benefitId,
        message: "Benefit created successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits (create) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST BENEFITS
 * Lists benefits for an organization
 *
 * GET /api/v1/benefits
 * Required Scope: benefits:read
 */
export const listBenefits = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      200
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query benefits
    const result = await ctx.runQuery(
      internal.api.v1.benefitsInternal.listBenefitsInternal,
      {
        organizationId,
        subtype,
        status,
        category,
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
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET BENEFIT
 * Gets a specific benefit by ID
 *
 * GET /api/v1/benefits/:benefitId
 * Required Scope: benefits:read
 */
export const getBenefit = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

    // 3. Extract benefit ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const benefitId = pathParts[pathParts.length - 1];

    if (!benefitId) {
      return new Response(
        JSON.stringify({ error: "Benefit ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query benefit
    const benefit = await ctx.runQuery(
      internal.api.v1.benefitsInternal.getBenefitInternal,
      {
        organizationId,
        benefitId,
      }
    );

    if (!benefit) {
      return new Response(
        JSON.stringify({ error: "Benefit not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(benefit),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE BENEFIT
 * Updates an existing benefit
 *
 * PATCH /api/v1/benefits/:benefitId
 * Required Scope: benefits:write
 */
export const updateBenefit = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Extract benefit ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const benefitId = pathParts[pathParts.length - 1];

    if (!benefitId) {
      return new Response(
        JSON.stringify({ error: "Benefit ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      subtype,
      name,
      description,
      status,
      discountValue,
      category,
      validFrom,
      validUntil,
      maxTotalClaims,
      maxClaimsPerMember,
      requirements,
      contactEmail,
      contactPhone,
      customProperties,
    } = body;

    // 5. Update benefit
    await ctx.runMutation(
      internal.api.v1.benefitsInternal.updateBenefitInternal,
      {
        organizationId,
        benefitId,
        subtype,
        name,
        description,
        status,
        discountValue,
        category,
        validFrom,
        validUntil,
        maxTotalClaims,
        maxClaimsPerMember,
        requirements,
        contactEmail,
        contactPhone,
        customProperties,
        performedBy: userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        benefitId,
        message: "Benefit updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits/:id (update) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE BENEFIT
 * Permanently deletes a draft benefit
 *
 * DELETE /api/v1/benefits/:benefitId
 * Required Scope: benefits:write
 */
export const deleteBenefit = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Extract benefit ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const benefitId = pathParts[pathParts.length - 1];

    if (!benefitId) {
      return new Response(
        JSON.stringify({ error: "Benefit ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Delete benefit
    await ctx.runMutation(
      internal.api.v1.benefitsInternal.deleteBenefitInternal,
      {
        organizationId,
        benefitId,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Benefit deleted successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits/:id (delete) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE CLAIM
 * Creates a claim for a benefit
 *
 * POST /api/v1/benefits/:benefitId/claims
 * Required Scope: benefits:write
 */
export const createClaim = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Extract benefit ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const benefitId = pathParts[pathParts.length - 2]; // /benefits/:benefitId/claims

    if (!benefitId) {
      return new Response(
        JSON.stringify({ error: "Benefit ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { memberId, notes } = body;

    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "memberId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Create claim
    const claimId = await ctx.runMutation(
      internal.api.v1.benefitsInternal.createClaimInternal,
      {
        organizationId,
        benefitId,
        memberId,
        notes,
        performedBy: userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        claimId,
        message: "Claim created successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits/:id/claims (create) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST CLAIMS
 * Lists claims for a benefit
 *
 * GET /api/v1/benefits/:benefitId/claims
 * Required Scope: benefits:read
 */
export const listClaims = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

    // 3. Extract benefit ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const benefitId = pathParts[pathParts.length - 2]; // /benefits/:benefitId/claims
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    if (!benefitId) {
      return new Response(
        JSON.stringify({ error: "Benefit ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query claims
    const claims = await ctx.runQuery(
      internal.api.v1.benefitsInternal.listClaimsInternal,
      {
        organizationId,
        benefitId,
        status,
        limit,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        claims,
        total: claims.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /benefits/:id/claims (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// COMMISSIONS ENDPOINTS
// ============================================================================

/**
 * CREATE COMMISSION
 * Creates a new commission
 *
 * POST /api/v1/commissions
 * Required Scope: benefits:write
 */
export const createCommission = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Parse request body
    const body = await request.json();
    const {
      subtype,
      name,
      description,
      commissionType,
      commissionValue,
      currency,
      category,
      targetDescription,
      customProperties,
    } = body;

    // Validate required fields
    if (!subtype || !name || !commissionType || commissionValue === undefined) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: subtype, name, commissionType, commissionValue"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create commission
    const commissionId = await ctx.runMutation(
      internal.api.v1.benefitsInternal.createCommissionInternal,
      {
        organizationId,
        subtype,
        name,
        description,
        commissionType,
        commissionValue,
        currency,
        category,
        targetDescription,
        customProperties,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        commissionId,
        message: "Commission created successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /commissions (create) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST COMMISSIONS
 * Lists commissions for an organization
 *
 * GET /api/v1/commissions
 * Required Scope: benefits:read
 */
export const listCommissions = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      200
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query commissions
    const result = await ctx.runQuery(
      internal.api.v1.benefitsInternal.listCommissionsInternal,
      {
        organizationId,
        subtype,
        status,
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
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /commissions (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET COMMISSION
 * Gets a specific commission by ID
 *
 * GET /api/v1/commissions/:commissionId
 * Required Scope: benefits:read
 */
export const getCommission = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

    // 3. Extract commission ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const commissionId = pathParts[pathParts.length - 1];

    if (!commissionId) {
      return new Response(
        JSON.stringify({ error: "Commission ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query commission
    const commission = await ctx.runQuery(
      internal.api.v1.benefitsInternal.getCommissionInternal,
      {
        organizationId,
        commissionId,
      }
    );

    if (!commission) {
      return new Response(
        JSON.stringify({ error: "Commission not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(commission),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /commissions/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE PAYOUT
 * Creates a payout for a commission
 *
 * POST /api/v1/commissions/:commissionId/payouts
 * Required Scope: benefits:write
 */
export const createPayout = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Extract commission ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const commissionId = pathParts[pathParts.length - 2]; // /commissions/:commissionId/payouts

    if (!commissionId) {
      return new Response(
        JSON.stringify({ error: "Commission ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { affiliateId, merchantId, amount, currency, referralDetails, referralValue } = body;

    if (!affiliateId || !merchantId || amount === undefined) {
      return new Response(
        JSON.stringify({ error: "affiliateId, merchantId, and amount are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Create payout
    const payoutId = await ctx.runMutation(
      internal.api.v1.benefitsInternal.createPayoutInternal,
      {
        organizationId,
        commissionId,
        affiliateId,
        merchantId,
        amount,
        currency,
        referralDetails,
        referralValue,
        performedBy: userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        payoutId,
        message: "Payout created successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /commissions/:id/payouts (create) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST PAYOUTS
 * Lists payouts for a commission
 *
 * GET /api/v1/commissions/:commissionId/payouts
 * Required Scope: benefits:read
 */
export const listPayouts = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require benefits:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["benefits:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

    // 3. Extract commission ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const commissionId = pathParts[pathParts.length - 2]; // /commissions/:commissionId/payouts
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    if (!commissionId) {
      return new Response(
        JSON.stringify({ error: "Commission ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query payouts
    const payouts = await ctx.runQuery(
      internal.api.v1.benefitsInternal.listPayoutsInternal,
      {
        organizationId,
        commissionId,
        status,
        limit,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        payouts,
        total: payouts.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-Auth-Type": authContext.authMethod,
        },
      }
    );
  } catch (error) {
    console.error("API /commissions/:id/payouts (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
