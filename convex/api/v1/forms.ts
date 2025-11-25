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
