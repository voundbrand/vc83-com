/**
 * API V1: CERTIFICATES ENDPOINTS
 *
 * External API for managing certificates (CE/CME/CPD credits).
 * Used by CLI apps and external integrations for certificate management.
 *
 * Endpoints:
 * - GET /api/v1/certificates - List certificates
 * - GET /api/v1/certificates/:certificateId - Get certificate details
 * - POST /api/v1/certificates - Create certificate
 * - PATCH /api/v1/certificates/:certificateId - Update certificate
 * - DELETE /api/v1/certificates/:certificateId - Delete certificate
 * - POST /api/v1/certificates/:certificateId/revoke - Revoke certificate
 * - POST /api/v1/certificates/:certificateId/reinstate - Reinstate certificate
 * - POST /api/v1/certificates/batch - Batch issue certificates
 * - GET /api/v1/certificates/verify/:certificateNumber - Verify certificate (public)
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: certificates:read, certificates:write
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import type { Id } from "../../_generated/dataModel";

/**
 * LIST CERTIFICATES
 * Lists certificates for an organization with optional filters
 *
 * GET /api/v1/certificates
 *
 * Query Parameters:
 * - pointType: Filter by certificate type (ce, cme, cpd, etc.)
 * - status: Filter by status (issued, revoked, expired)
 * - recipientEmail: Filter by recipient email
 * - eventId: Filter by linked event
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   certificates: Array<{...}>,
 *   total: number,
 *   hasMore: boolean
 * }
 */
export const listCertificates = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:read scope
    const scopeCheck = requireScopes(authContext, ["certificates:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const pointType = url.searchParams.get("pointType") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const recipientEmail = url.searchParams.get("recipientEmail") || undefined;
    const eventIdParam = url.searchParams.get("eventId");
    const eventId = eventIdParam ? eventIdParam as Id<"objects"> : undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query certificates
    const result = await ctx.runQuery(
      internal.api.v1.certificatesInternal.listCertificatesInternal,
      {
        organizationId: authContext.organizationId,
        pointType,
        status,
        recipientEmail,
        eventId,
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
    console.error("API /certificates (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CERTIFICATE
 * Gets a specific certificate by ID
 *
 * GET /api/v1/certificates/:certificateId
 *
 * Response: Full certificate object
 */
export const getCertificate = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:read scope
    const scopeCheck = requireScopes(authContext, ["certificates:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract certificate ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const certificateId = pathParts[pathParts.length - 1];

    if (!certificateId) {
      return new Response(
        JSON.stringify({ error: "Certificate ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get certificate
    const certificate = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificateInternal,
      { certificateId: certificateId as Id<"objects"> }
    );

    if (!certificate) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Verify organization access
    if (certificate.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Return response
    return new Response(
      JSON.stringify(certificate),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /certificates/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE CERTIFICATE
 * Creates a new certificate
 *
 * POST /api/v1/certificates
 *
 * Request Body:
 * {
 *   pointType: string,           // "ce", "cme", "cpd", etc.
 *   pointsAwarded: number,       // Number of credits
 *   pointCategory: string,       // Category description
 *   pointUnit: string,           // "credits", "hours", etc.
 *   recipientName: string,
 *   recipientEmail: string,
 *   licenseNumber?: string,
 *   profession?: string,
 *   specialty?: string,
 *   eventId?: string,            // Link to event
 *   eventName?: string,          // Event name (if no eventId)
 *   eventDate?: number,          // Event date (if no eventId)
 *   accreditingBody?: string,
 *   activityId?: string,
 *   expirationMonths?: number    // Months until expiration
 * }
 *
 * Response:
 * {
 *   success: true,
 *   certificateId: string,
 *   certificateNumber: string
 * }
 */
export const createCertificate = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:write scope
    const scopeCheck = requireScopes(authContext, ["certificates:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      pointType,
      pointsAwarded,
      pointCategory,
      pointUnit,
      recipientName,
      recipientEmail,
      licenseNumber,
      profession,
      specialty,
      eventId,
      eventName,
      eventDate,
      accreditingBody,
      activityId,
      expirationMonths,
    } = body;

    // Validate required fields
    if (!pointType || pointsAwarded === undefined || !pointCategory || !pointUnit || !recipientName || !recipientEmail) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: pointType, pointsAwarded, pointCategory, pointUnit, recipientName, recipientEmail"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create certificate
    const certificateId = await ctx.runMutation(
      internal.api.v1.certificatesInternal.createCertificateInternal,
      {
        organizationId: authContext.organizationId,
        userId: authContext.userId,
        pointType,
        pointsAwarded,
        pointCategory,
        pointUnit,
        recipientName,
        recipientEmail,
        licenseNumber,
        profession,
        specialty,
        eventId: eventId ? eventId as Id<"objects"> : undefined,
        eventName,
        eventDate,
        accreditingBody,
        activityId,
        expirationMonths,
      }
    );

    // 5. Get the created certificate for certificate number
    const certificate = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificateInternal,
      { certificateId }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        certificateId,
        certificateNumber: certificate?.customProperties?.certificateNumber || "",
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
    console.error("API /certificates (POST) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE CERTIFICATE
 * Updates certificate details (limited fields)
 *
 * PATCH /api/v1/certificates/:certificateId
 *
 * Request Body:
 * {
 *   recipientName?: string,
 *   licenseNumber?: string,
 *   profession?: string,
 *   specialty?: string,
 *   expirationDate?: number
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const updateCertificate = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:write scope
    const scopeCheck = requireScopes(authContext, ["certificates:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract certificate ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const certificateId = pathParts[pathParts.length - 1];

    if (!certificateId) {
      return new Response(
        JSON.stringify({ error: "Certificate ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify certificate belongs to organization
    const certificate = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificateInternal,
      { certificateId: certificateId as Id<"objects"> }
    );

    if (!certificate || certificate.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Parse request body
    const body = await request.json();
    const {
      recipientName,
      licenseNumber,
      profession,
      specialty,
      expirationDate,
    } = body;

    // 6. Update certificate
    await ctx.runMutation(
      internal.api.v1.certificatesInternal.updateCertificateInternal,
      {
        certificateId: certificateId as Id<"objects">,
        userId: authContext.userId,
        recipientName,
        licenseNumber,
        profession,
        specialty,
        expirationDate,
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
    console.error("API /certificates/:id (PATCH) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Certificate not found" ? 404 :
                   message === "Cannot update a revoked certificate" ? 400 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE CERTIFICATE
 * Permanently deletes a certificate
 *
 * DELETE /api/v1/certificates/:certificateId
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const deleteCertificate = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:write scope
    const scopeCheck = requireScopes(authContext, ["certificates:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract certificate ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const certificateId = pathParts[pathParts.length - 1];

    if (!certificateId) {
      return new Response(
        JSON.stringify({ error: "Certificate ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify certificate belongs to organization
    const certificate = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificateInternal,
      { certificateId: certificateId as Id<"objects"> }
    );

    if (!certificate || certificate.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Delete certificate
    await ctx.runMutation(
      internal.api.v1.certificatesInternal.deleteCertificateInternal,
      {
        certificateId: certificateId as Id<"objects">,
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
    console.error("API /certificates/:id (DELETE) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Certificate not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * REVOKE CERTIFICATE
 * Revokes a certificate with reason
 *
 * POST /api/v1/certificates/:certificateId/revoke
 *
 * Request Body:
 * {
 *   reason: string
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const revokeCertificate = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:write scope
    const scopeCheck = requireScopes(authContext, ["certificates:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract certificate ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/certificates/:certificateId/revoke
    const certificateId = pathParts[pathParts.length - 2];

    if (!certificateId || certificateId === "certificates") {
      return new Response(
        JSON.stringify({ error: "Certificate ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify certificate belongs to organization
    const certificate = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificateInternal,
      { certificateId: certificateId as Id<"objects"> }
    );

    if (!certificate || certificate.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Parse request body
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return new Response(
        JSON.stringify({ error: "Revocation reason required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Revoke certificate
    await ctx.runMutation(
      internal.api.v1.certificatesInternal.revokeCertificateInternal,
      {
        certificateId: certificateId as Id<"objects">,
        userId: authContext.userId,
        reason,
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
    console.error("API /certificates/:id/revoke error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Certificate not found" ? 404 :
                   message === "Certificate is already revoked" ? 400 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * REINSTATE CERTIFICATE
 * Reinstates a previously revoked certificate
 *
 * POST /api/v1/certificates/:certificateId/reinstate
 *
 * Request Body:
 * {
 *   reason?: string  // Optional reason for reinstatement
 * }
 *
 * Response:
 * {
 *   success: true,
 *   newStatus: string
 * }
 */
export const reinstateCertificate = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:write scope
    const scopeCheck = requireScopes(authContext, ["certificates:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract certificate ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL format: /api/v1/certificates/:certificateId/reinstate
    const certificateId = pathParts[pathParts.length - 2];

    if (!certificateId || certificateId === "certificates") {
      return new Response(
        JSON.stringify({ error: "Certificate ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify certificate belongs to organization
    const certificate = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificateInternal,
      { certificateId: certificateId as Id<"objects"> }
    );

    if (!certificate || certificate.organizationId !== authContext.organizationId) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Parse request body (optional reason)
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    // 6. Reinstate certificate
    const result = await ctx.runMutation(
      internal.api.v1.certificatesInternal.reinstateCertificateInternal,
      {
        certificateId: certificateId as Id<"objects">,
        userId: authContext.userId,
        reason,
      }
    );

    // 7. Return success
    return new Response(
      JSON.stringify({
        success: true,
        newStatus: result.newStatus,
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
    console.error("API /certificates/:id/reinstate error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Certificate not found" ? 404 :
                   message === "Certificate is not revoked" ? 400 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * BATCH ISSUE CERTIFICATES
 * Issues multiple certificates at once (e.g., for all event attendees)
 *
 * POST /api/v1/certificates/batch
 *
 * Request Body:
 * {
 *   eventId: string,             // Required - event to issue certificates for
 *   pointType: string,           // "ce", "cme", "cpd", etc.
 *   pointsAwarded: number,
 *   pointCategory: string,
 *   pointUnit: string,
 *   recipients: Array<{
 *     name: string,
 *     email: string,
 *     licenseNumber?: string,
 *     profession?: string,
 *     transactionId?: string
 *   }>,
 *   accreditingBody?: string,
 *   expirationMonths?: number
 * }
 *
 * Response:
 * {
 *   success: true,
 *   total: number,
 *   issued: number,
 *   failed: number,
 *   results: Array<{ recipientEmail, success, certificateId?, certificateNumber?, error? }>
 * }
 */
export const batchIssueCertificates = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:write scope
    const scopeCheck = requireScopes(authContext, ["certificates:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      eventId,
      pointType,
      pointsAwarded,
      pointCategory,
      pointUnit,
      recipients,
      accreditingBody,
      expirationMonths,
    } = body;

    // Validate required fields
    if (!eventId || !pointType || pointsAwarded === undefined || !pointCategory || !pointUnit || !recipients) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: eventId, pointType, pointsAwarded, pointCategory, pointUnit, recipients"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "recipients must be a non-empty array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (recipients.length > 500) {
      return new Response(
        JSON.stringify({ error: "Maximum 500 recipients per batch request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Issue certificates
    const result = await ctx.runMutation(
      internal.api.v1.certificatesInternal.batchIssueCertificatesInternal,
      {
        organizationId: authContext.organizationId,
        userId: authContext.userId,
        eventId: eventId as Id<"objects">,
        pointType,
        pointsAwarded,
        pointCategory,
        pointUnit,
        recipients: recipients.map((r: { name: string; email: string; licenseNumber?: string; profession?: string; transactionId?: string }) => ({
          name: r.name,
          email: r.email,
          licenseNumber: r.licenseNumber,
          profession: r.profession,
          transactionId: r.transactionId ? r.transactionId as Id<"objects"> : undefined,
        })),
        accreditingBody,
        expirationMonths,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        success: true,
        total: result.total,
        issued: result.success,
        failed: result.failed,
        results: result.results,
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
    console.error("API /certificates/batch error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * VERIFY CERTIFICATE (PUBLIC)
 * Verifies a certificate's authenticity and validity
 * This is a PUBLIC endpoint - no authentication required
 *
 * GET /api/v1/certificates/verify/:certificateNumber
 *
 * Response:
 * {
 *   valid: boolean,
 *   message: string,
 *   certificate?: {
 *     certificateNumber: string,
 *     recipientName: string,
 *     pointsAwarded: number,
 *     pointCategory: string,
 *     eventName: string,
 *     eventDate: number,
 *     issueDate: number,
 *     expirationDate: number,
 *     status: string,
 *     accreditingBody?: string
 *   }
 * }
 */
export const verifyCertificate = httpAction(async (ctx, request) => {
  try {
    // 1. Extract certificate number from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const certificateNumber = pathParts[pathParts.length - 1];

    if (!certificateNumber || certificateNumber === "verify") {
      return new Response(
        JSON.stringify({ error: "Certificate number required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Verify certificate
    const result = await ctx.runQuery(
      internal.api.v1.certificatesInternal.verifyCertificateInternal,
      { certificateNumber }
    );

    // 3. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // Allow CORS for public endpoint
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  } catch (error) {
    console.error("API /certificates/verify/:number error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CERTIFICATES BY RECIPIENT
 * Gets all certificates for a specific recipient email
 *
 * GET /api/v1/certificates/recipient/:email
 *
 * Response:
 * {
 *   certificates: Array<{...}>
 * }
 */
export const getCertificatesByRecipient = httpAction(async (ctx, request) => {
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

    // 2. Require certificates:read scope
    const scopeCheck = requireScopes(authContext, ["certificates:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract email from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const email = decodeURIComponent(pathParts[pathParts.length - 1]);

    if (!email || email === "recipient") {
      return new Response(
        JSON.stringify({ error: "Recipient email required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get certificates
    const certificates = await ctx.runQuery(
      internal.api.v1.certificatesInternal.getCertificatesByRecipientInternal,
      {
        organizationId: authContext.organizationId,
        recipientEmail: email,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({ certificates }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /certificates/recipient/:email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CORS OPTIONS handler for certificates endpoints
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

/**
 * COMBINED POST HANDLER for /api/v1/certificates/:id/revoke and /reinstate
 * Routes POST requests to the appropriate handler based on URL path
 */
export const handleCertificatePost = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/revoke")) {
    // ---- REVOKE CERTIFICATE ----
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

      // 2. Require certificates:write scope
      const scopeCheck = requireScopes(authContext, ["certificates:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Extract certificate ID from URL
      const pathParts = url.pathname.split("/");
      const certificateId = pathParts[pathParts.length - 2];

      if (!certificateId || certificateId === "certificates") {
        return new Response(
          JSON.stringify({ error: "Certificate ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Verify certificate belongs to organization
      const certificate = await ctx.runQuery(
        internal.api.v1.certificatesInternal.getCertificateInternal,
        { certificateId: certificateId as Id<"objects"> }
      );

      if (!certificate || certificate.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Certificate not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 5. Parse request body
      const body = await request.json();
      const { reason } = body;

      if (!reason) {
        return new Response(
          JSON.stringify({ error: "Revocation reason required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 6. Revoke certificate
      await ctx.runMutation(
        internal.api.v1.certificatesInternal.revokeCertificateInternal,
        {
          certificateId: certificateId as Id<"objects">,
          userId: authContext.userId,
          reason,
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
      console.error("API /certificates/:id/revoke error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      const status = message === "Certificate not found" ? 404 :
                     message === "Certificate is already revoked" ? 400 : 500;
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (url.pathname.endsWith("/reinstate")) {
    // ---- REINSTATE CERTIFICATE ----
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

      // 2. Require certificates:write scope
      const scopeCheck = requireScopes(authContext, ["certificates:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Extract certificate ID from URL
      const pathParts = url.pathname.split("/");
      const certificateId = pathParts[pathParts.length - 2];

      if (!certificateId || certificateId === "certificates") {
        return new Response(
          JSON.stringify({ error: "Certificate ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 4. Verify certificate belongs to organization
      const certificate = await ctx.runQuery(
        internal.api.v1.certificatesInternal.getCertificateInternal,
        { certificateId: certificateId as Id<"objects"> }
      );

      if (!certificate || certificate.organizationId !== authContext.organizationId) {
        return new Response(
          JSON.stringify({ error: "Certificate not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 5. Parse request body (optional reason)
      let reason: string | undefined;
      try {
        const body = await request.json();
        reason = body.reason;
      } catch {
        // Body is optional
      }

      // 6. Reinstate certificate
      const result = await ctx.runMutation(
        internal.api.v1.certificatesInternal.reinstateCertificateInternal,
        {
          certificateId: certificateId as Id<"objects">,
          userId: authContext.userId,
          reason,
        }
      );

      // 7. Return success
      return new Response(
        JSON.stringify({
          success: true,
          newStatus: result.newStatus,
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
      console.error("API /certificates/:id/reinstate error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      const status = message === "Certificate not found" ? 404 :
                     message === "Certificate is not revoked" ? 400 : 500;
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Path not matched
  return new Response(
    JSON.stringify({ error: "Not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});
