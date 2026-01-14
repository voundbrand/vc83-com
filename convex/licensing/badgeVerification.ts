/**
 * BADGE VERIFICATION VIA HTTP
 *
 * Phase 2: Badge Enforcement
 *
 * This module performs HTTP-based verification of:
 * 1. Domain ownership (verification endpoint exists)
 * 2. Badge presence (for free tier)
 *
 * Called by:
 * - verifyDomainOwnership mutation (on-demand)
 * - Daily cron job (periodic checks)
 * - API middleware (opportunistic checks)
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

// ============================================================================
// HTTP BADGE VERIFICATION
// ============================================================================

/**
 * VERIFY DOMAIN BADGE (HTTP CHECK)
 *
 * Makes an HTTP request to the customer's website to verify:
 * 1. Verification endpoint exists at /.well-known/l4yercak3-verify
 * 2. Endpoint returns correct verification token
 * 3. Badge status (badge_visible field)
 *
 * This action is internal-only and called by:
 * - verifyDomainOwnership mutation
 * - verifyAllBadges cron job
 * - API request middleware
 */
export const verifyDomainBadgeInternal = internalAction({
  args: {
    configId: v.id("objects"), // Changed from domainId to configId (unified domain configs)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    domain?: string;
    badgePresent?: boolean;
    status?: string;
    suspended?: boolean;
    message?: string;
    error?: string;
    failedChecks?: number;
    requestDomain?: string;
  }> => {
    try {
      // 1. Get domain configuration
      const domain: any = await ctx.runQuery(internal.domainConfigOntology.getDomainConfigInternal, {
        configId: args.configId,
      });

      if (!domain) {
        return {
          success: false,
          error: "Domain not found",
        };
      }

      if (!domain) {
        return {
          success: false,
          error: "Domain configuration not found",
        };
      }

      const props = domain.customProperties;
      const domainName = props.domainName;

      // 2. Build verification URL
      const verificationUrl = `https://${domainName}/.well-known/l4yercak3-verify`;

      console.log(`[Badge Verification] Checking ${domainName}...`);

      // 3. Make HTTP request with timeout
      let response: Response;
      try {
        response = await fetch(verificationUrl, {
          method: "GET",
          headers: {
            "User-Agent": "l4yercak3-verification/2.0",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
      } catch (fetchError: any) {
        throw new Error(`Network error: ${fetchError.message}`);
      }

      // 4. Check HTTP status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 5. Parse JSON response
      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid JSON response from verification endpoint");
      }

      // 6. Verify token matches
      if (!data.token) {
        throw new Error("Missing verification token in response");
      }

      if (data.token !== props.verificationToken) {
        throw new Error("Invalid verification token - does not match registered token");
      }

      // 7. Check badge status (required for free tier)
      const badgePresent = data.badge_visible === true;

      // 8. Determine new status
      let newStatus: "active" | "suspended" = "active";
      let suspensionReason: string | undefined;

      if (props.badgeRequired && !badgePresent) {
        newStatus = "suspended";
        suspensionReason = "Badge not visible on website (required for free tier)";
      }

      // 9. Update domain configuration
      await ctx.runMutation(internal.domainConfigOntology.updateBadgeStatusInternal, {
        configId: args.configId,
        domainVerified: true,
        badgeVerified: badgePresent,
        lastBadgeCheck: Date.now(),
        status: newStatus,
        suspensionReason,
        failedBadgeChecks: badgePresent ? 0 : (props.failedBadgeChecks || 0) + 1,
      });

      console.log(
        `[Badge Verification] ${domainName}: ` +
        `${badgePresent ? "✓ Badge present" : "✗ Badge missing"} ` +
        `(Status: ${newStatus})`
      );

      return {
        success: true,
        domain: domainName,
        badgePresent,
        status: newStatus,
        suspended: newStatus === "suspended",
        message: suspensionReason,
      };

    } catch (error: any) {
      // Get domain configuration for failure handling
      const domain: any = await ctx.runQuery(internal.domainConfigOntology.getDomainConfigInternal, {
        configId: args.configId,
      });

      if (!domain) {
        return { success: false, error: "Domain configuration not found" };
      }

      const props = domain.customProperties;
      const domainName = props.domainName;
      const errorMessage = error.message || "Unknown error";
      console.error(`[Badge Verification] ${domainName}: ERROR - ${errorMessage}`);

      // Only suspend if badge is required AND we've had multiple failures
      const failedChecks = (props.failedBadgeChecks || 0) + 1;
      const shouldSuspend = props.badgeRequired && failedChecks >= 3; // Grace period: 3 failures

      if (shouldSuspend) {
        await ctx.runMutation(internal.domainConfigOntology.updateBadgeStatusInternal, {
          configId: args.configId,
          domainVerified: false,
          badgeVerified: false,
          lastBadgeCheck: Date.now(),
          status: "suspended",
          suspensionReason: `Badge verification failed 3 times: ${errorMessage}`,
          failedBadgeChecks: failedChecks,
        });

        console.log(`[Badge Verification] ${domainName}: SUSPENDED after ${failedChecks} failures`);
      } else {
        // Update failed check count but don't suspend yet
        await ctx.runMutation(internal.domainConfigOntology.updateBadgeStatusInternal, {
          configId: args.configId,
          lastBadgeCheck: Date.now(),
          failedBadgeChecks: failedChecks,
        });

        console.log(
          `[Badge Verification] ${domainName}: ` +
          `Failed check ${failedChecks}/3 (grace period)`
        );
      }

      return {
        success: false,
        error: errorMessage,
        domain: domainName,
        failedChecks,
        suspended: shouldSuspend,
      };
    }
  },
});

// ============================================================================
// BATCH VERIFICATION (for cron jobs)
// ============================================================================

/**
 * VERIFY ALL BADGES (CRON JOB)
 *
 * Daily cron job that:
 * 1. Gets all domains requiring badge verification
 * 2. Checks each domain's badge status via HTTP
 * 3. Suspends domains with missing badges (after grace period)
 * 4. Logs results for monitoring
 */
export const verifyAllBadgesInternal = internalAction({
  handler: async (ctx): Promise<{
    total: number;
    verified: number;
    suspended: number;
    failed: number;
    timestamp?: number;
  }> => {
    console.log("[Badge Verification Cron] Starting daily badge check...");

    // Get all domains needing verification
    const domains: any[] = await ctx.runQuery(
      internal.domainConfigOntology.getDomainsNeedingVerification,
      {}
    );

    console.log(`[Badge Verification Cron] Found ${domains.length} domains to check`);

    if (domains.length === 0) {
      console.log("[Badge Verification Cron] No domains need verification");
      return {
        total: 0,
        verified: 0,
        suspended: 0,
        failed: 0,
      };
    }

    let verified = 0;
    let suspended = 0;
    let failed = 0;

    // Process each domain (with small delay to avoid rate limiting)
    for (const domain of domains) {
      try {
        const result: any = await ctx.runAction(
          internal.licensing.badgeVerification.verifyDomainBadgeInternal,
          { configId: domain._id } // Changed from domainId to configId
        );

        if (result.success) {
          verified++;
          if (result.suspended) {
            suspended++;
          }
        } else {
          failed++;
        }

        // Small delay between checks (100ms)
        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(
          `[Badge Verification Cron] Error checking ${domain.domain}:`,
          error.message
        );
        failed++;
      }
    }

    const summary: {
      total: number;
      verified: number;
      suspended: number;
      failed: number;
      timestamp: number;
    } = {
      total: domains.length,
      verified,
      suspended,
      failed,
      timestamp: Date.now(),
    };

    console.log(
      `[Badge Verification Cron] Complete: ` +
      `${verified} verified, ${suspended} suspended, ${failed} failed`
    );

    return summary;
  },
});

// ============================================================================
// RETRY LOGIC: Verify with exponential backoff
// ============================================================================

/**
 * RETRY VERIFICATION (with backoff)
 *
 * Retries failed verification with exponential backoff.
 * Used for transient network errors or temporary site issues.
 */
export const retryDomainVerification = internalAction({
  args: {
    domainId: v.id("objects"), // Changed to objects table (unified domain configs)
    maxRetries: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    domain?: string;
    badgePresent?: boolean;
    status?: string;
    suspended?: boolean;
    message?: string;
  }> => {
    const maxRetries = args.maxRetries || 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Badge Verification] Retry attempt ${attempt}/${maxRetries}...`);

      const result: any = await ctx.runAction(
        internal.licensing.badgeVerification.verifyDomainBadgeInternal,
        { configId: args.domainId } // Accept domainId for backwards compat but pass as configId
      );

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Exponential backoff: 2s, 4s, 8s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: `All ${maxRetries} retry attempts failed: ${lastError}`,
    };
  },
});
