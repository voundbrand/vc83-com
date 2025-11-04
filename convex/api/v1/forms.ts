/**
 * API V1: FORMS ENDPOINT
 *
 * External API for getting form schemas.
 * Used by external websites to display registration forms.
 *
 * Endpoint: GET /api/v1/forms/{formId}
 *
 * Security: API key required in Authorization header
 * Scope: Returns only forms for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

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

    const { organizationId, userId } = authContext;

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
