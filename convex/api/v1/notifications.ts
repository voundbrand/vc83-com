/**
 * API V1: NOTIFICATIONS ENDPOINTS
 *
 * External API for sending notifications via configured channels.
 *
 * Endpoints:
 * - POST /api/v1/notifications/pushover - Send a Pushover notification
 *
 * Security: Triple authentication (API keys, OAuth, CLI sessions)
 * Scope: notifications:write
 */

import { httpAction } from "../../_generated/server";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import { parseJsonBody, BodyTooLargeError } from "./httpHelpers";
import { getCorsHeaders } from "./corsHeaders";
import { PUSHOVER_SOUNDS } from "../../integrations/pushover";

const generatedApi: any = require("../../_generated/api");

/**
 * SEND PUSHOVER NOTIFICATION
 * POST /api/v1/notifications/pushover
 *
 * Request Body:
 * {
 *   message: string          (required)
 *   title?: string
 *   priority?: number        (-2 to 2)
 *   sound?: string           (one of PUSHOVER_SOUNDS)
 *   url?: string
 *   urlTitle?: string
 *   device?: string
 *   html?: boolean
 * }
 */
export const sendPushover = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

  try {
    // 1. Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: jsonHeaders }
      );
    }

    const authContext = authResult.context;

    // 2. Check scopes
    const scopeCheck = requireScopes(authContext, ["notifications:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: jsonHeaders }
      );
    }

    // 3. Parse body
    const body = await parseJsonBody<Record<string, unknown>>(request, "standard");

    // 4. Validate required fields
    const { message, title, priority, sound, url, urlTitle, device, html } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: message" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 5. Validate optional fields
    if (title !== undefined && typeof title !== "string") {
      return new Response(
        JSON.stringify({ error: "Field 'title' must be a string" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (priority !== undefined) {
      if (typeof priority !== "number" || priority < -2 || priority > 2 || !Number.isInteger(priority)) {
        return new Response(
          JSON.stringify({ error: "Field 'priority' must be an integer from -2 to 2" }),
          { status: 400, headers: jsonHeaders }
        );
      }
    }

    if (sound !== undefined) {
      if (typeof sound !== "string" || !(PUSHOVER_SOUNDS as readonly string[]).includes(sound)) {
        return new Response(
          JSON.stringify({ error: `Field 'sound' must be one of: ${PUSHOVER_SOUNDS.join(", ")}` }),
          { status: 400, headers: jsonHeaders }
        );
      }
    }

    if (url !== undefined && typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Field 'url' must be a string" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (urlTitle !== undefined && typeof urlTitle !== "string") {
      return new Response(
        JSON.stringify({ error: "Field 'urlTitle' must be a string" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (device !== undefined && typeof device !== "string") {
      return new Response(
        JSON.stringify({ error: "Field 'device' must be a string" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (html !== undefined && typeof html !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Field 'html' must be a boolean" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 6. Send via internal action
    const result = await (ctx as any).runAction(
      generatedApi.internal.integrations.pushover.sendPushoverNotification,
      {
        organizationId: authContext.organizationId,
        message: message as string,
        title: title as string | undefined,
        priority: priority as number | undefined,
        sound: sound as string | undefined,
        url: url as string | undefined,
        urlTitle: urlTitle as string | undefined,
        device: device as string | undefined,
        html: html as boolean | undefined,
      }
    );

    // 7. Handle result
    if (!result.success) {
      const status = result.error?.includes("not enabled") || result.error?.includes("not configured")
        ? 400
        : 502;
      return new Response(
        JSON.stringify({ error: result.error }),
        { status, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        requestId: result.request,
        ...(result.receipt ? { receipt: result.receipt } : {}),
      }),
      {
        status: 200,
        headers: {
          ...jsonHeaders,
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /notifications/pushover (POST) error:", error);

    if (error instanceof BodyTooLargeError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 413, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
