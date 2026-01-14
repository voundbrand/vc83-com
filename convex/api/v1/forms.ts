/**
 * API V1: FORMS ENDPOINT
 *
 * External API for form management.
 * Used by external websites and MCP tools to display and manage registration forms.
 *
 * Endpoints:
 * - GET /api/v1/forms - List forms (authenticated)
 * - POST /api/v1/forms - Create form (authenticated)
 * - GET /api/v1/forms/{formId} - Get form (authenticated)
 * - GET /api/v1/forms/{formId}/responses - Get form responses (authenticated)
 * - POST /api/v1/forms/{formId}/responses - Submit form response (authenticated)
 * - GET /api/v1/forms/public/{formId} - Public access (for published forms only)
 * - POST /api/v1/forms/public/{formId}/submit - Public form submission
 *
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 */

import { httpAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getCorsHeaders } from "./corsHeaders";
import { authenticateRequest, requireScopes } from "../../middleware/auth";

/**
 * LIST FORMS
 * Returns forms for an organization with filtering and pagination
 *
 * GET /api/v1/forms
 */
export const listForms = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require forms:read scope
    const scopeCheck = requireScopes(authContext, ["forms:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const eventIdParam = url.searchParams.get("eventId");
    const eventId = eventIdParam ? eventIdParam as Id<"objects"> : undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query forms
    const result = await ctx.runQuery(internal.api.v1.formsInternal.listFormsInternal, {
      organizationId: authContext.organizationId,
      subtype,
      status,
      eventId,
      limit,
      offset,
    });

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /forms (list) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * CREATE FORM
 * Creates a new form
 *
 * POST /api/v1/forms
 */
export const createForm = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require forms:write scope
    const scopeCheck = requireScopes(authContext, ["forms:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { subtype, name, description, formSchema, eventId } = body;

    // Validate required fields
    if (!subtype || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subtype, name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Create form
    const result = await ctx.runMutation(internal.api.v1.formsInternal.createFormInternal, {
      organizationId: authContext.organizationId,
      subtype,
      name,
      description,
      formSchema,
      eventId: eventId ? eventId as Id<"objects"> : undefined,
      performedBy: authContext.userId,
    });

    // 5. Return response
    return new Response(
      JSON.stringify({
        success: true,
        formId: result.formId,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /forms (POST) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * GET FORM (or FORM RESPONSES)
 * Returns form schema with all fields and validation rules
 * Also handles /responses sub-route since we use pathPrefix routing
 *
 * GET /api/v1/forms/{formId}
 * GET /api/v1/forms/{formId}/responses
 */
export const getForm = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 0. Check if this is a request for /responses (route internally)
    const url = new URL(request.url);
    if (url.pathname.endsWith("/responses")) {
      // Delegate to getFormResponses handler
      return getFormResponsesHandler(ctx, request);
    }

    // Skip paths that should go to public routes
    if (url.pathname.includes("/public/")) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require forms:read scope
    const scopeCheck = requireScopes(authContext, ["forms:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract form ID from URL
    const pathParts = url.pathname.split("/");
    const formId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!formId || formId === "forms") {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Get form
    const form = await ctx.runQuery(
      internal.api.v1.formsInternal.getFormInternal,
      {
        formId,
        organizationId: authContext.organizationId,
      }
    );

    if (!form) {
      return new Response(
        JSON.stringify({ error: "Form not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Return response
    return new Response(JSON.stringify(form), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": authContext.organizationId,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("API /forms/:formId error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * Internal handler for GET FORM RESPONSES
 * Called by getForm when URL ends with /responses
 */
async function getFormResponsesHandler(ctx: Parameters<typeof httpAction>[0] extends (ctx: infer C, req: Request) => unknown ? C : never, request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // 1. Universal authentication
  const authResult = await authenticateRequest(ctx, request);
  if (!authResult.success) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const authContext = authResult.context;

  // 2. Require forms:read scope
  const scopeCheck = requireScopes(authContext, ["forms:read"]);
  if (!scopeCheck.success) {
    return new Response(
      JSON.stringify({ error: scopeCheck.error }),
      { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // 3. Extract form ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const formId = pathParts[pathParts.length - 2]; // /api/v1/forms/:formId/responses
  const status = url.searchParams.get("status") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  if (!formId) {
    return new Response(
      JSON.stringify({ error: "Form ID required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // 4. Get form responses
  const result = await ctx.runQuery(internal.api.v1.formsInternal.getFormResponsesInternal, {
    organizationId: authContext.organizationId,
    formId,
    status,
    limit,
    offset,
  });

  // 5. Return response
  return new Response(
    JSON.stringify(result),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": authContext.organizationId,
        ...corsHeaders,
      },
    }
  );
}

/**
 * GET FORM RESPONSES
 * Returns all responses for a form with pagination
 *
 * GET /api/v1/forms/{formId}/responses
 */
export const getFormResponses = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require forms:read scope
    const scopeCheck = requireScopes(authContext, ["forms:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract form ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const formId = pathParts[pathParts.length - 2]; // /api/v1/forms/:formId/responses
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Get form responses
    const result = await ctx.runQuery(internal.api.v1.formsInternal.getFormResponsesInternal, {
      organizationId: authContext.organizationId,
      formId,
      status,
      limit,
      offset,
    });

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /forms/:formId/responses error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * SUBMIT FORM RESPONSE (Authenticated)
 * Submit a form response with authentication
 *
 * POST /api/v1/forms/{formId}/responses
 */
export const submitFormResponse = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 0. Verify path ends with /responses (since we use pathPrefix routing)
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/responses")) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Skip paths that should go to public routes
    if (url.pathname.includes("/public/")) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require forms:write scope
    const scopeCheck = requireScopes(authContext, ["forms:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract form ID from URL
    const pathParts = url.pathname.split("/");
    const formId = pathParts[pathParts.length - 2]; // /api/v1/forms/:formId/responses

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { responses, metadata } = body;

    if (!responses) {
      return new Response(
        JSON.stringify({ error: "Missing required field: responses" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Create form response
    const result = await ctx.runMutation(internal.api.v1.formsInternal.createFormResponseInternal, {
      organizationId: authContext.organizationId,
      formId,
      responses,
      metadata,
      performedBy: authContext.userId,
    });

    // 6. Return response
    return new Response(
      JSON.stringify({
        success: true,
        responseId: result.responseId,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /forms/:formId/responses (POST) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * DELETE FORM
 * Permanently deletes a form
 *
 * DELETE /api/v1/forms/{formId}
 */
export const deleteForm = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authContext = authResult.context;

    // 2. Require forms:write scope
    const scopeCheck = requireScopes(authContext, ["forms:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Extract form ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const formId = pathParts[pathParts.length - 1];

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Delete form
    await ctx.runMutation(internal.api.v1.formsInternal.deleteFormInternal, {
      organizationId: authContext.organizationId,
      formId,
      performedBy: authContext.userId,
    });

    // 5. Return response
    return new Response(
      JSON.stringify({ success: true, message: "Form deleted successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("API /forms/:formId (DELETE) error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Form not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * GET PUBLIC FORM
 * Returns form schema for published forms (no authentication required)
 *
 * Path: /api/v1/forms/public/{formId}
 *
 * Security: None - public endpoint
 * Scope: Only returns forms with status="published"
 *
 * Response: Same as getForm above
 */
export const getPublicForm = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Extract form ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const formId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    console.log(`🔓 [GET /api/v1/forms/public] Fetching public form: ${formId}`);

    // 2. Get form using public query (no auth required)
    const form = await ctx.runQuery(api.formsOntology.getPublicForm, {
      formId,
    });

    if (!form) {
      console.log(`❌ [GET /api/v1/forms/public] Form not found or not published: ${formId}`);
      return new Response(
        JSON.stringify({ error: "Form not found or not published" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    console.log(`✅ [GET /api/v1/forms/public] Form found: ${form.name}`);

    // 3. Transform response to match API format (same as authenticated endpoint)
    const customProps = form.customProperties as Record<string, unknown> | undefined;
    const formSchema = customProps?.formSchema as Record<string, unknown> | undefined;

    const transformedForm = {
      id: form._id,
      organizationId: form.organizationId,
      name: form.name,
      description: form.description,
      status: form.status,
      subtype: form.subtype,
      fields: (formSchema?.fields as unknown[]) || [],
      settings: (formSchema?.settings as Record<string, unknown>) || {
        submitButtonText: "Submit",
        successMessage: "Form submitted successfully",
      },
      translations: (customProps?.translations as Record<string, unknown>) || {},
      customProperties: {
        formSchema: formSchema,
        fields: (formSchema?.fields as unknown[]) || [],
        settings: (formSchema?.settings as Record<string, unknown>) || {},
        translations: (customProps?.translations as Record<string, unknown>) || {},
        ...customProps,
      },
    };

    // 4. Return transformed response
    return new Response(JSON.stringify(transformedForm), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("API /forms/public error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      }
    );
  }
});

/**
 * SUBMIT PUBLIC FORM
 * Submit a form response without authentication (public endpoint)
 *
 * Path: /api/v1/forms/public/:formId/submit
 * Method: POST
 *
 * Security:
 * - Rate limiting: 5 submissions per IP per hour per form
 * - Honeypot field detection (bot_trap field)
 * - Only accepts submissions to published forms
 * - CORS enabled for external domains
 *
 * Request Body:
 * {
 *   "responses": {
 *     "firstName": "John",
 *     "email": "john@example.com",
 *     ...
 *   },
 *   "bot_trap": "" // Should be empty (honeypot field)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "responseId": "...",
 *   "message": "Form submitted successfully"
 * }
 */
export const submitPublicForm = httpAction(async (ctx, request) => {
  try {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // 1. Extract form ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path is /api/v1/forms/public/:formId/submit
    const formIdIndex = pathParts.indexOf("public") + 1;
    const formId = pathParts[formIdIndex] as Id<"objects">;

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    console.log(`📝 [POST /api/v1/forms/public/${formId}/submit] Receiving submission...`);

    // 2. Parse request body
    let body: { responses: Record<string, unknown>; bot_trap?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // 3. Honeypot validation - reject if bot_trap field is filled
    if (body.bot_trap && body.bot_trap.length > 0) {
      console.log(`🍯 [POST /api/v1/forms/public] Honeypot triggered - bot detected`);
      // Return success to fool the bot
      return new Response(
        JSON.stringify({
          success: true,
          message: "Form submitted successfully"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // 4. Rate limiting - extract IP address
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    console.log(`🔍 [POST /api/v1/forms/public] IP: ${ipAddress}`);

    // 5. Check rate limit (5 submissions per IP per hour per form)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    // Query recent submissions from this IP for this form
    const recentSubmissions = await ctx.runQuery(internal.api.v1.formsInternal.checkRateLimit, {
      formId,
      ipAddress,
      since: oneHourAgo,
    });

    if (recentSubmissions >= 5) {
      console.log(`⚠️ [POST /api/v1/forms/public] Rate limit exceeded for IP: ${ipAddress}`);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: 3600 // seconds
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "3600",
            ...corsHeaders,
          }
        }
      );
    }

    // 6. Extract metadata
    const metadata = {
      ipAddress,
      userAgent: request.headers.get("user-agent") || "unknown",
      submittedAt: Date.now(),
      referer: request.headers.get("referer") || null,
    };

    // 7. Submit the form
    const responseId = await ctx.runMutation(internal.formsOntology.createPublicFormResponse, {
      formId,
      responses: body.responses,
      metadata,
    });

    console.log(`✅ [POST /api/v1/forms/public] Submission successful: ${responseId}`);

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        responseId,
        message: "Form submitted successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      }
    );

  } catch (error) {
    console.error("API /forms/public/submit error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // Check if it's a known error
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const statusCode = errorMessage.includes("not published") ? 403
      : errorMessage.includes("not found") ? 404
      : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        }
      }
    );
  }
});
