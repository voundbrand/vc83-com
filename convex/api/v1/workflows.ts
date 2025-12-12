/**
 * API V1: WORKFLOWS ENDPOINT
 *
 * External API for triggering workflows.
 * This is the CORE endpoint that external websites use to register users,
 * which triggers all your behaviors (invoice generation, email sending, etc.)
 *
 * Endpoint: POST /api/v1/workflows/trigger
 *
 * Security: Dual authentication support
 * - API keys (full access, backward compatible)
 * - OAuth tokens (scope-based access control)
 * Scope: Executes workflows for the authenticated organization only
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getCorsHeaders } from "./corsHeaders";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";

/**
 * TRIGGER WORKFLOW
 * Executes a workflow with provided input data
 *
 * POST /api/v1/workflows/trigger
 * Required Scope: workflows:trigger or workflows:write
 *
 * Request Body:
 * {
 *   trigger: string, // e.g., "course_registration"
 *   inputData: {
 *     productId?: string,
 *     formResponses?: object,
 *     metadata?: object
 *   },
 *   webhookUrl?: string // Optional callback URL for async results
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   transactionId: string,
 *   ticketId?: string,
 *   invoiceId?: string,
 *   message: string
 * }
 */
export const triggerWorkflow = httpAction(async (ctx, request) => {
  try {
    // Get CORS headers for this request
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: authResult.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    const authContext = authResult.context;

    // 2. Require workflows:trigger or workflows:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["workflows:trigger"]);
    if (!scopeCheck.success) {
      // Fall back to workflows:write
      const writeCheck = requireScopes(authContext, ["workflows:write"]);
      if (!writeCheck.success) {
        return new Response(
          JSON.stringify({ error: "Missing required scope: workflows:trigger or workflows:write" }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            }
          }
        );
      }
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Parse request body
    const body = await request.json();

    if (!body.trigger) {
      return new Response(
        JSON.stringify({ error: "Missing 'trigger' field" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    if (!body.inputData) {
      return new Response(
        JSON.stringify({ error: "Missing 'inputData' field" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    // 4. Execute workflow (now an action, not a mutation)
    const result = await ctx.runAction(
      internal.api.v1.workflowsInternal.executeWorkflowInternal,
      {
        organizationId,
        userId, // Pass the user who owns the API key
        trigger: body.trigger,
        inputData: body.inputData,
        webhookUrl: body.webhookUrl,
        apiKey: authContext.authMethod === "api_key" ? "api_key_auth" : "oauth_token_auth", // For tracking usage
      }
    );

    // 5. Return response
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
        "X-Auth-Type": authContext.authMethod,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("API /workflows/trigger error:", error);
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
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
