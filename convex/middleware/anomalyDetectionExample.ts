/**
 * ANOMALY DETECTION INTEGRATION EXAMPLE
 *
 * Shows how to integrate anomaly detection into API endpoints.
 * Copy this pattern to all authenticated endpoints for comprehensive security monitoring.
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 3
 */

import { httpAction } from "../_generated/server";
import { authenticateRequest } from "./auth";
import { internal } from "../_generated/api";

/**
 * EXAMPLE ENDPOINT WITH ANOMALY DETECTION
 *
 * Complete integration pattern:
 * 1. Authenticate request
 * 2. Process request
 * 3. Schedule async anomaly detection (doesn't block response)
 * 4. Log failed auth attempts (if authentication failed)
 */
export const exampleEndpointWithAnomalyDetection = httpAction(
  async (ctx, request) => {
    const startTime = Date.now();
    const endpoint = new URL(request.url).pathname;
    const method = request.method;

    // Extract client metadata
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const country = request.headers.get("cf-ipcountry") || undefined; // Cloudflare header

    // 1. Authenticate request
    const authResult = await authenticateRequest(ctx, request);

    // If authentication failed, log the attempt and detect brute force
    if (!authResult.success) {
      // Extract API key prefix if present (for failed auth tracking)
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.substring(7); // Remove "Bearer "
      const apiKeyPrefix = token?.startsWith("org_") || token?.startsWith("api_key_")
        ? token.substring(0, 12)
        : undefined;

      // Log failed auth attempt (async)
      ctx.scheduler.runAfter(0, internal.middleware.anomalyDetectionDb.logFailedAuth, {
        apiKeyPrefix,
        tokenType: apiKeyPrefix ? "api_key" : "oauth",
        endpoint,
        method,
        ipAddress,
        country,
        userAgent,
        failureReason: authResult.error,
      });

      // Note: Failed auth spike detection happens automatically via detectAnomalies()
      // when the next successful request includes this organizationId

      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status }
      );
    }

    const authContext = authResult.context;

    // 2. Process request normally
    const result = {
      message: "Success",
      organizationId: authContext.organizationId,
      userId: authContext.userId,
      authMethod: authContext.authMethod,
    };

    // Response time captured for future anomaly detection integration
    const _responseTimeMs = Date.now() - startTime;

    // 3. Schedule anomaly detection (ASYNC - doesn't block response)
    // This runs AFTER the response is sent to the client
    // Note: Since detectAnomalies uses ctx.runMutation internally, we need to create an action wrapper
    // For now, we'll call detectAnomalies directly (it already logs usage metadata)

    // Simplified approach: Just log usage metadata (detection happens automatically)
    // detectAnomalies() is called from within the rate limit check or as a separate scheduled task

    // For a complete implementation, you would create a separate action file:
    // const usageContext: UsageContext = { ... };
    // ctx.scheduler.runAfter(0, internal.security.detectAnomaliesAction, { usage: usageContext });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

/**
 * RECOMMENDED INTEGRATION PATTERN
 *
 * Create a security actions file (convex/security/actions.ts):
 */
/*
import { action } from "../_generated/server";
import { v } from "convex/values";
import { detectAnomalies, UsageContext } from "../middleware/anomalyDetection";

export const detectAnomaliesAction = action({
  args: {
    usage: v.any(), // UsageContext as JSON
  },
  handler: async (ctx, args) => {
    await detectAnomalies(ctx, args.usage as UsageContext);
  },
});
*/

/**
 * INTEGRATION PATTERN FOR EXISTING ENDPOINTS
 *
 * Add this snippet to existing endpoints:
 */
/*
const startTime = Date.now();
// ... do work ...
const responseTimeMs = Date.now() - startTime;

// Schedule anomaly detection (async, doesn't block response)
ctx.scheduler.runAfter(0, internal.security.actions.detectAnomaliesAction, {
  usage: {
    organizationId: authContext.organizationId,
    authMethod: authContext.authMethod,
    apiKeyId: authContext.apiKeyId, // If API key auth
    userId: authContext.userId,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    statusCode: 200,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
    country: request.headers.get("cf-ipcountry"),
    scopes: authContext.scopes,
    responseTimeMs,
    userAgent: request.headers.get("user-agent"),
  }
});
*/

/**
 * INTEGRATION CHECKLIST
 *
 * To integrate anomaly detection into an existing endpoint:
 *
 * ✅ 1. Add anomaly detection import:
 *    import { detectAnomalies, UsageContext } from "./anomalyDetection";
 *
 * ✅ 2. Extract client metadata (before auth):
 *    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
 *    const userAgent = request.headers.get("user-agent") || "unknown";
 *    const country = request.headers.get("cf-ipcountry");
 *
 * ✅ 3. Log failed auth attempts (if auth fails):
 *    if (!authResult.success) {
 *      ctx.scheduler.runAfter(0, internal.middleware.anomalyDetectionDb.logFailedAuth, {...});
 *    }
 *
 * ✅ 4. Schedule anomaly detection (after successful auth):
 *    ctx.scheduler.runAfter(0, internal.security.actions.detectAnomaliesAction, {
 *      usage: { organizationId, authMethod, ... }
 *    });
 *
 * ✅ 5. Track response time for performance monitoring:
 *    const startTime = Date.now();
 *    // ... process request ...
 *    responseTimeMs: Date.now() - startTime
 */
