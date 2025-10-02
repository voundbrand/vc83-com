/**
 * Email Verification Flow
 *
 * Handles email verification for new user accounts:
 * 1. Generate verification token
 * 2. Send verification email
 * 3. Verify token and mark email as verified
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Generate a random verification token
 */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Send verification email to user
 * Called after registration
 */
export const sendVerificationEmail = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.emailVerified) {
      throw new Error("Email already verified");
    }

    // Check for existing pending verification
    const existingVerification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("verified"), false),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (existingVerification) {
      // Resend existing token
      await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
        email: user.email,
        firstName: user.firstName,
        token: existingVerification.token,
      });

      return {
        success: true,
        message: "Verification email resent",
      };
    }

    // Generate new token
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store verification token
    await ctx.db.insert("emailVerifications", {
      userId: args.userId,
      email: user.email,
      token,
      expiresAt,
      createdAt: Date.now(),
      verified: false,
    });

    // Schedule email sending (using action)
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      email: user.email,
      firstName: user.firstName,
      token,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: user.defaultOrgId,
      userId: args.userId,
      action: "email.verification.sent",
      resource: "user",
      resourceId: args.userId,
      success: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Verification email sent",
    };
  },
});

/**
 * Verify email with token
 */
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find verification token
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verification) {
      throw new Error("Invalid verification token");
    }

    if (verification.verified) {
      throw new Error("Email already verified");
    }

    if (verification.expiresAt < Date.now()) {
      throw new Error("Verification token expired");
    }

    // Get user
    const user = await ctx.db.get(verification.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Mark email as verified
    await ctx.db.patch(user._id, {
      emailVerified: true,
    });

    // Mark verification as used
    await ctx.db.patch(verification._id, {
      verified: true,
      verifiedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: user.defaultOrgId,
      userId: user._id,
      action: "email.verified",
      resource: "user",
      resourceId: user._id,
      success: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Email verified successfully",
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },
});

/**
 * Check if user's email is verified
 */
export const checkEmailVerified = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { verified: false };
    }

    return {
      verified: user.emailVerified || false,
      email: user.email,
    };
  },
});

/**
 * Get verification status for current user
 */
export const getVerificationStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return null;
    }

    // Check for pending verification
    const pendingVerification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("verified"), false),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    return {
      verified: user.emailVerified || false,
      email: user.email,
      hasPendingVerification: !!pendingVerification,
      canResend: !!pendingVerification,
    };
  },
});
