"use node";

/**
 * SECURITY ACTIONS
 *
 * Scheduled actions for security monitoring and anomaly detection.
 * These run asynchronously and don't block API responses.
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 3
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { detectAnomalies, UsageContext } from "../middleware/anomalyDetection";

/**
 * DETECT ANOMALIES ACTION
 *
 * Scheduled action to run anomaly detection asynchronously.
 * This is called AFTER the API response is sent to avoid blocking the response.
 *
 * Usage:
 * ```typescript
 * ctx.scheduler.runAfter(0, internal.security.actions.detectAnomaliesAction, {
 *   usage: usageContext
 * });
 * ```
 */
export const detectAnomaliesAction = action({
  args: {
    usage: v.any(), // UsageContext as JSON (v.any() used for flexibility)
  },
  handler: async (ctx, args) => {
    const usage = args.usage as UsageContext;
    await detectAnomalies(ctx, usage);
  },
});
