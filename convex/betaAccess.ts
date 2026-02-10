import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthenticatedUser, requireAuthenticatedUser, checkPermission } from "./rbacHelpers";
import { requirePermission } from "./rbacHelpers";

/**
 * Beta Access Gateway System
 *
 * This module implements a toggleable beta access gate for the platform.
 * When enabled, new signups are automatically marked as "pending" and must
 * receive admin approval before accessing the platform.
 *
 * Flow:
 * 1. User signs up normally (OAuth or email/password)
 * 2. If beta gating is ON → user.betaAccessStatus = "pending"
 * 3. If beta gating is OFF → user.betaAccessStatus = "approved"
 * 4. Admin approves/rejects in Organizations → Beta Access tab
 * 5. Approval email sent → user can access platform
 */

// ==================== SETTINGS ====================

/**
 * Check if beta access gating is enabled (platform-wide setting)
 * INTERNAL QUERY - use via runQuery from other queries
 */
export const isBetaGatingEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", "betaAccessEnabled"))
      .first();

    // Default to false (gate off) if not set
    return setting?.value ?? false;
  },
});

/**
 * PUBLIC: Check if beta gating is enabled (for client-side UI)
 */
export const getBetaGatingStatus = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", "betaAccessEnabled"))
      .first();

    return {
      enabled: setting?.value ?? false,
      updatedAt: setting?.updatedAt,
    };
  },
});

/**
 * Toggle beta access gating on/off (admin only)
 */
export const toggleBetaGating = mutation({
  args: {
    sessionId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify admin permission
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_platform_settings");

    // Get or create setting
    const setting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", "betaAccessEnabled"))
      .first();

    if (setting) {
      await ctx.db.patch(setting._id, {
        value: args.enabled,
        updatedBy: auth.userId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platformSettings", {
        key: "betaAccessEnabled",
        value: args.enabled,
        description: "Controls whether beta access gating is enabled platform-wide",
        updatedBy: auth.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, enabled: args.enabled };
  },
});

// ==================== USER BETA STATUS ====================
// Note: Beta access is now automatically assigned during signup.
// Users no longer manually request beta access - it's handled in the auth flow.

/**
 * Check user's beta access status (public query)
 */
export const checkBetaAccessStatus = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Check if beta gating is enabled
    const gatingEnabled = await ctx.runQuery(internal.betaAccess.isBetaGatingEnabled, {});

    // If gating is disabled, everyone has access
    if (!gatingEnabled) {
      return { hasAccess: true, status: "approved", reason: "gating_disabled" };
    }

    // No session = no access
    if (!args.sessionId) {
      return { hasAccess: false, status: "none" };
    }

    // Get session and user
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId as Id<"sessions">))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { hasAccess: false, status: "none" };
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return { hasAccess: false, status: "none" };
    }

    // Super admins always bypass
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role?.name === "super_admin") {
        return { hasAccess: true, status: "approved", reason: "super_admin" };
      }
    }

    const status = user.betaAccessStatus || "none";

    return {
      hasAccess: status === "approved",
      status,
      requestedAt: user.betaAccessRequestedAt,
      rejectionReason: user.betaAccessRejectionReason,
    };
  },
});

// ==================== ADMIN FUNCTIONS ====================

/**
 * List beta access requests (admin only)
 */
export const listBetaRequests = query({
  args: {
    sessionId: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("none")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify admin permission
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const hasPermission = await checkPermission(ctx, auth.userId, "manage_platform_settings");
    if (!hasPermission) {
      throw new Error("Permission denied: manage_platform_settings required");
    }

    // Build query
    const query = args.status
      ? ctx.db.query("users").withIndex("by_beta_status", (q) =>
          q.eq("betaAccessStatus", args.status)
        )
      : ctx.db.query("users");

    // Get requests
    const users = await query
      .order("desc")
      .take(args.limit || 100);

    // Filter to only users with beta status (exclude users who never requested)
    const requests = users
      .filter(u => u.betaAccessStatus && u.betaAccessStatus !== "none")
      .map(u => ({
        userId: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        status: u.betaAccessStatus,
        requestedAt: u.betaAccessRequestedAt,
        approvedAt: u.betaAccessApprovedAt,
        approvedBy: u.betaAccessApprovedBy,
        rejectionReason: u.betaAccessRejectionReason,
        requestReason: u.betaRequestReason,
        useCase: u.betaRequestUseCase,
        referralSource: u.betaReferralSource,
      }));

    return requests;
  },
});

/**
 * Get pending beta request count (for admin UI badge)
 */
export const getPendingBetaRequestCount = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // Verify admin permission
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const hasPermission = await checkPermission(ctx, auth.userId, "manage_platform_settings");
    if (!hasPermission) {
      throw new Error("Permission denied: manage_platform_settings required");
    }

    const pending = await ctx.db
      .query("users")
      .withIndex("by_beta_status", (q) => q.eq("betaAccessStatus", "pending"))
      .collect();

    return pending.length;
  },
});

/**
 * Approve beta access request (admin only)
 */
export const approveBetaAccess = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin permission
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_platform_settings");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update user to approved
    await ctx.db.patch(args.userId, {
      betaAccessStatus: "approved",
      betaAccessApprovedAt: Date.now(),
      betaAccessApprovedBy: auth.userId,
      betaAccessRejectionReason: undefined, // Clear any previous rejection
      updatedAt: Date.now(),
    });

    // Get user's organization for sales notification
    const org = await ctx.db.get(user.defaultOrgId!);
    const orgName = org?.name || `${user.firstName}'s Organization`;

    // Send approval notification emails (fire and forget - don't block on email sending)
    // Note: We skip the regular welcome email - the beta approval email already welcomes them
    try {
      await Promise.all([
        // 1. Beta approval notification (includes welcome content)
        ctx.scheduler.runAfter(0, internal.actions.betaAccessEmails.sendBetaApprovalEmail, {
          email: user.email,
          firstName: user.firstName,
        }),
        // 2. Sales notification
        ctx.scheduler.runAfter(0, internal.actions.salesNotificationEmail.sendSalesNotification, {
          eventType: "beta_approved",
          user: {
            email: user.email,
            firstName: user.firstName ?? "User",
            lastName: user.lastName ?? "",
          },
          organization: {
            name: orgName,
            planTier: "free",
          },
        }),
      ]);
    } catch (emailError) {
      // Log but don't fail if email fails
      console.error("Failed to send approval emails:", emailError);
    }

    return { success: true };
  },
});

/**
 * Reject beta access request (admin only)
 */
export const rejectBetaAccess = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin permission
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_platform_settings");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update user to rejected
    await ctx.db.patch(args.userId, {
      betaAccessStatus: "rejected",
      betaAccessRejectionReason: args.reason,
      updatedAt: Date.now(),
    });

    // Send rejection email (fire and forget - don't block on email sending)
    try {
      await ctx.scheduler.runAfter(0, internal.actions.betaAccessEmails.sendBetaRejectionEmail, {
        email: user.email,
        firstName: user.firstName,
        reason: args.reason,
      });
    } catch (emailError) {
      // Log but don't fail if email fails
      console.error("Failed to send rejection email:", emailError);
    }

    return { success: true };
  },
});

// ==================== INTERNAL HELPERS ====================
// Helper functions for beta access management
