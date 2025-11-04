/**
 * API V1: WORKFLOWS ENDPOINT
 *
 * External API for triggering workflows.
 * This is the CORE endpoint that external websites use to register users,
 * which triggers all your behaviors (invoice generation, email sending, etc.)
 *
 * Endpoint: POST /api/v1/workflows/trigger
 *
 * Security: API key required in Authorization header
 * Scope: Executes workflows for the authenticated organization only
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * TRIGGER WORKFLOW
 * Executes a workflow with provided input data
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

    // 2. Parse request body
    const body = await request.json();

    if (!body.trigger) {
      return new Response(
        JSON.stringify({ error: "Missing 'trigger' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.inputData) {
      return new Response(
        JSON.stringify({ error: "Missing 'inputData' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Execute workflow
    const result = await ctx.runMutation(
      internal.api.v1.workflowsInternal.executeWorkflowInternal,
      {
        organizationId,
        userId, // Pass the user who owns the API key
        trigger: body.trigger,
        inputData: body.inputData,
        webhookUrl: body.webhookUrl,
        apiKey, // For tracking usage
      }
    );

    // 4. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, {
      apiKey,
    });

    // 5. Return response
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
    });
  } catch (error) {
    console.error("API /workflows/trigger error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
