import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { checkPermission, requireAuthenticatedUser, requirePermission } from "./rbacHelpers";

const generatedApi: any = require("./_generated/api");

const BETA_GATING_SETTING_KEY = "betaAccessEnabled";
const BETA_ONBOARDING_ROLLOUT_SETTING_KEY = "betaOnboardingRolloutControls";
const LEGACY_MANUAL_APPROVAL_STAGE = "legacy_manual_approval";
const V2_BETA_CODE_AUTO_APPROVE_STAGE = "v2_beta_code_auto_approve";
const MIGRATION_SOURCE_LEGACY_GATE = "beta_gate_manual_approval_v1";

type BetaOnboardingRolloutStage =
  | typeof LEGACY_MANUAL_APPROVAL_STAGE
  | typeof V2_BETA_CODE_AUTO_APPROVE_STAGE;

type NormalizedRolloutControls = {
  rolloutStage: BetaOnboardingRolloutStage;
  killSwitchForceLegacyManualApproval: boolean;
  migratedFrom: typeof MIGRATION_SOURCE_LEGACY_GATE;
  updatedAt?: number;
};

const rolloutStageValidator = v.union(
  v.literal(LEGACY_MANUAL_APPROVAL_STAGE),
  v.literal(V2_BETA_CODE_AUTO_APPROVE_STAGE)
);

function normalizeRolloutStage(value: unknown): BetaOnboardingRolloutStage {
  if (value === V2_BETA_CODE_AUTO_APPROVE_STAGE) {
    return V2_BETA_CODE_AUTO_APPROVE_STAGE;
  }
  return LEGACY_MANUAL_APPROVAL_STAGE;
}

function normalizeRolloutControls(value: unknown): Omit<NormalizedRolloutControls, "updatedAt"> {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    rolloutStage: normalizeRolloutStage(raw.rolloutStage),
    killSwitchForceLegacyManualApproval:
      raw.killSwitchForceLegacyManualApproval === true,
    migratedFrom: MIGRATION_SOURCE_LEGACY_GATE,
  };
}

async function getPlatformSettingByKey(ctx: any, key: string) {
  return ctx.db
    .query("platformSettings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
}

async function upsertPlatformSetting(
  ctx: any,
  args: {
    key: string;
    value: unknown;
    description: string;
    updatedBy?: Id<"users">;
  }
) {
  const now = Date.now();
  const setting = await getPlatformSettingByKey(ctx, args.key);

  if (setting) {
    await ctx.db.patch(setting._id, {
      value: args.value,
      description: args.description,
      ...(args.updatedBy ? { updatedBy: args.updatedBy } : {}),
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("platformSettings", {
    key: args.key,
    value: args.value,
    description: args.description,
    ...(args.updatedBy ? { updatedBy: args.updatedBy } : {}),
    createdAt: now,
    updatedAt: now,
  });
}

async function readBetaGatingEnabled(ctx: any): Promise<boolean> {
  const setting = await getPlatformSettingByKey(ctx, BETA_GATING_SETTING_KEY);
  return setting?.value === true;
}

async function readRolloutControls(ctx: any): Promise<NormalizedRolloutControls> {
  const setting = await getPlatformSettingByKey(
    ctx,
    BETA_ONBOARDING_ROLLOUT_SETTING_KEY
  );
  const normalized = normalizeRolloutControls(setting?.value);
  return {
    ...normalized,
    updatedAt: setting?.updatedAt,
  };
}

/**
 * Check if beta access gating is enabled (platform-wide setting)
 * INTERNAL QUERY - use via runQuery from other queries
 */
export const isBetaGatingEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    return readBetaGatingEnabled(ctx);
  },
});

/**
 * Resolve onboarding signup approval outcome from rollout stage + kill switch.
 * Internal contract consumed by signup flows (email/OAuth/chat-first handoff).
 */
export const resolveSignupBetaAccessDecision = internalQuery({
  args: {
    hasValidBetaCode: v.boolean(),
  },
  handler: async (ctx, args) => {
    const gatingEnabled = await readBetaGatingEnabled(ctx);
    const rolloutControls = await readRolloutControls(ctx);
    const effectiveRolloutStage = rolloutControls.killSwitchForceLegacyManualApproval
      ? LEGACY_MANUAL_APPROVAL_STAGE
      : rolloutControls.rolloutStage;

    const shouldAutoApprove =
      effectiveRolloutStage === V2_BETA_CODE_AUTO_APPROVE_STAGE
        ? !gatingEnabled || args.hasValidBetaCode
        : !gatingEnabled;

    const reason =
      !gatingEnabled
        ? "gating_disabled"
        : effectiveRolloutStage === LEGACY_MANUAL_APPROVAL_STAGE
        ? rolloutControls.killSwitchForceLegacyManualApproval
          ? "kill_switch_force_legacy_manual"
          : "legacy_manual_approval"
        : args.hasValidBetaCode
        ? "beta_code_auto_approved"
        : "manual_review_required";

    return {
      resolvedStatus: shouldAutoApprove ? "approved" : "pending",
      shouldAutoApprove,
      reason,
      gatingEnabled,
      rolloutStage: rolloutControls.rolloutStage,
      killSwitchForceLegacyManualApproval:
        rolloutControls.killSwitchForceLegacyManualApproval,
      effectiveRolloutStage,
      supportsBetaCodeAutoApprove:
        effectiveRolloutStage === V2_BETA_CODE_AUTO_APPROVE_STAGE,
      migratedFrom: rolloutControls.migratedFrom,
      updatedAt: rolloutControls.updatedAt,
    };
  },
});

/**
 * PUBLIC: Check beta gating + rollout controls status (for client-side UI/admin surfaces)
 */
export const getBetaGatingStatus = query({
  args: {},
  handler: async (ctx) => {
    const gatingSetting = await getPlatformSettingByKey(
      ctx,
      BETA_GATING_SETTING_KEY
    );
    const rolloutControls = await readRolloutControls(ctx);
    const effectiveRolloutStage = rolloutControls.killSwitchForceLegacyManualApproval
      ? LEGACY_MANUAL_APPROVAL_STAGE
      : rolloutControls.rolloutStage;

    return {
      enabled: gatingSetting?.value === true,
      updatedAt: gatingSetting?.updatedAt,
      rollout: {
        rolloutStage: rolloutControls.rolloutStage,
        killSwitchForceLegacyManualApproval:
          rolloutControls.killSwitchForceLegacyManualApproval,
        effectiveRolloutStage,
        supportsBetaCodeAutoApprove:
          effectiveRolloutStage === V2_BETA_CODE_AUTO_APPROVE_STAGE,
        migratedFrom: rolloutControls.migratedFrom,
        updatedAt: rolloutControls.updatedAt,
      },
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
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_platform_settings");

    await upsertPlatformSetting(ctx, {
      key: BETA_GATING_SETTING_KEY,
      value: args.enabled,
      description: "Controls whether beta access gating is enabled platform-wide",
      updatedBy: auth.userId,
    });

    return { success: true, enabled: args.enabled };
  },
});

/**
 * Set rollout stage + kill switch for signup approval flow (admin only).
 */
export const setBetaOnboardingRolloutControls = mutation({
  args: {
    sessionId: v.string(),
    rolloutStage: rolloutStageValidator,
    killSwitchForceLegacyManualApproval: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_platform_settings");

    const controls = {
      rolloutStage: args.rolloutStage,
      killSwitchForceLegacyManualApproval:
        args.killSwitchForceLegacyManualApproval,
      migratedFrom: MIGRATION_SOURCE_LEGACY_GATE,
    };

    await upsertPlatformSetting(ctx, {
      key: BETA_ONBOARDING_ROLLOUT_SETTING_KEY,
      value: controls,
      description:
        "Rollout controls for signup approval policy (legacy manual approval vs v2 beta-code auto-approve).",
      updatedBy: auth.userId,
    });

    const effectiveRolloutStage = controls.killSwitchForceLegacyManualApproval
      ? LEGACY_MANUAL_APPROVAL_STAGE
      : controls.rolloutStage;

    return {
      success: true,
      rollout: {
        ...controls,
        effectiveRolloutStage,
        supportsBetaCodeAutoApprove:
          effectiveRolloutStage === V2_BETA_CODE_AUTO_APPROVE_STAGE,
      },
    };
  },
});

/**
 * Emergency kill switch for signup approval flow (admin only).
 */
export const setBetaOnboardingKillSwitch = mutation({
  args: {
    sessionId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_platform_settings");

    const existing = await readRolloutControls(ctx);
    const controls = {
      rolloutStage: existing.rolloutStage,
      killSwitchForceLegacyManualApproval: args.enabled,
      migratedFrom: MIGRATION_SOURCE_LEGACY_GATE,
    };

    await upsertPlatformSetting(ctx, {
      key: BETA_ONBOARDING_ROLLOUT_SETTING_KEY,
      value: controls,
      description:
        "Rollout controls for signup approval policy (legacy manual approval vs v2 beta-code auto-approve).",
      updatedBy: auth.userId,
    });

    return {
      success: true,
      killSwitchForceLegacyManualApproval: controls.killSwitchForceLegacyManualApproval,
      effectiveRolloutStage: controls.killSwitchForceLegacyManualApproval
        ? LEGACY_MANUAL_APPROVAL_STAGE
        : controls.rolloutStage,
      rolloutStage: controls.rolloutStage,
    };
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
    const gatingEnabled = await (ctx as any).runQuery(generatedApi.internal.betaAccess.isBetaGatingEnabled, {});

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

async function sendBetaApprovalNotifications(
  ctx: any,
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    defaultOrgId?: Id<"organizations">;
  }
) {
  const org = user.defaultOrgId ? await ctx.db.get(user.defaultOrgId) : null;
  const orgName = org?.name || `${user.firstName || "User"}'s Organization`;

  try {
    await Promise.all([
      (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.betaAccessEmails.sendBetaApprovalEmail, {
        email: user.email,
        firstName: user.firstName,
      }),
      (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.salesNotificationEmail.sendSalesNotification, {
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
    console.error("Failed to send approval emails:", emailError);
  }
}

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

    await sendBetaApprovalNotifications(ctx, user);

    return { success: true };
  },
});

/**
 * Approve beta access request via signed one-click email link.
 * Internal-only; HTTP handler verifies link token before invoking this mutation.
 */
export const approveBetaAccessFromEmailLink = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, reason: "user_not_found" as const };
    }

    if (user.betaAccessStatus === "approved") {
      return { success: true, alreadyApproved: true as const };
    }

    await ctx.db.patch(args.userId, {
      betaAccessStatus: "approved",
      betaAccessApprovedAt: Date.now(),
      betaAccessApprovedBy: undefined,
      betaAccessRejectionReason: undefined,
      updatedAt: Date.now(),
    });

    await sendBetaApprovalNotifications(ctx, user);
    return { success: true, alreadyApproved: false as const };
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
      await (ctx.scheduler as any).runAfter(0, generatedApi.internal.actions.betaAccessEmails.sendBetaRejectionEmail, {
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
