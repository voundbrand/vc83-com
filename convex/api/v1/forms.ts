/**
 * API V1: FORMS ENDPOINT
 *
 * External API for getting form schemas.
 * Used by external websites to display registration forms.
 *
 * Endpoints:
 * - GET /api/v1/forms/{formId} - Authenticated access (requires API key)
 * - GET /api/v1/forms/public/{formId} - Public access (for published forms only)
 *
 * Security:
 * - Authenticated endpoint: API key required in Authorization header
 * - Public endpoint: No authentication, only returns published forms
 */

import { httpAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

/**
 * GET FORM
 * Returns form schema with all fields and validation rules
 *
 * Path Parameters:
 * - formId: Form ID
 *
 * Response:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   status: string,
 *   fields: Array<{
 *     id: string,
 *     type: string,
 *     label: string,
 *     required: boolean,
 *     validation: object,
 *     options: array (for select/radio/etc),
 *     conditionalLogic: object
 *   }>,
 *   settings: {
 *     submitButtonText: string,
 *     successMessage: string,
 *     ...
 *   }
 * }
 */
export const getForm = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Extract form ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const formId = pathParts[pathParts.length - 1] as Id<"objects">;

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get form
    const form = await ctx.runQuery(
      internal.api.v1.formsInternal.getFormInternal,
      {
        formId,
        organizationId,
      }
    );

    if (!form) {
      return new Response(
        JSON.stringify({ error: "Form not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(JSON.stringify(form), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /forms error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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
