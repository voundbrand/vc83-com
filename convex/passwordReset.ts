/**
 * Password Reset Flow
 *
 * Handles password reset for users who forgot their password:
 * 1. Request password reset (generate token and send email)
 * 2. Verify reset token
 * 3. Reset password with new password
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hash } from "bcryptjs";
import { internal } from "./_generated/api";

/**
 * Generate a random reset token
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
 * Request password reset
 * Sends email with reset token
 */
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (!user || !user.isActive) {
      return {
        success: true,
        message: "If an account exists with this email, a reset link will be sent",
      };
    }

    // Check for recent reset request (rate limiting)
    const recentReset = await ctx.db
      .query("resetTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("used"), false),
          q.gt(q.field("createdAt"), Date.now() - 5 * 60 * 1000) // 5 minutes
        )
      )
      .first();

    if (recentReset) {
      // Resend existing token
      await ctx.scheduler.runAfter(0, internal.email.sendPasswordResetEmail, {
        email: user.email,
        firstName: user.firstName,
        token: recentReset.token,
      });

      return {
        success: true,
        message: "If an account exists with this email, a reset link will be sent",
      };
    }

    // Generate reset token
    const token = generateToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store reset token
    await ctx.db.insert("resetTokens", {
      userId: user._id,
      email: user.email,
      token,
      expiresAt,
      createdAt: Date.now(),
      used: false,
    });

    // Schedule email sending (using action)
    await ctx.scheduler.runAfter(0, internal.email.sendPasswordResetEmail, {
      email: user.email,
      firstName: user.firstName,
      token,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: user.defaultOrgId,
      userId: user._id,
      action: "password.reset.requested",
      resource: "user",
      resourceId: user._id,
      success: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "If an account exists with this email, a reset link will be sent",
    };
  },
});

/**
 * Verify reset token (check if valid before showing reset form)
 */
export const verifyResetToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find reset token
    const resetToken = await ctx.db
      .query("resetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      return {
        valid: false,
        error: "Invalid reset token",
      };
    }

    if (resetToken.used) {
      return {
        valid: false,
        error: "Reset token already used",
      };
    }

    if (resetToken.expiresAt < Date.now()) {
      return {
        valid: false,
        error: "Reset token expired",
      };
    }

    // Get user info
    const user = await ctx.db.get(resetToken.userId);
    if (!user || !user.isActive) {
      return {
        valid: false,
        error: "User not found",
      };
    }

    return {
      valid: true,
      email: user.email,
      firstName: user.firstName,
    };
  },
});

/**
 * Reset password with token and new password
 */
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate password strength
    const { validators } = await import("./security");
    const passwordCheck = validators.isStrongPassword(args.newPassword);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(". "));
    }

    // Find reset token
    const resetToken = await ctx.db
      .query("resetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      throw new Error("Invalid reset token");
    }

    if (resetToken.used) {
      throw new Error("Reset token already used");
    }

    if (resetToken.expiresAt < Date.now()) {
      throw new Error("Reset token expired");
    }

    // Get user
    const user = await ctx.db.get(resetToken.userId);
    if (!user || !user.isActive) {
      throw new Error("User not found");
    }

    // Hash new password
    const hashedPassword = await hash(args.newPassword, 10);

    // Update auth account with new password
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("provider"), "password")
        )
      )
      .first();

    if (!authAccount) {
      throw new Error("Auth account not found");
    }

    await ctx.db.patch(authAccount._id, {
      secret: hashedPassword,
    });

    // Mark reset token as used
    await ctx.db.patch(resetToken._id, {
      used: true,
      usedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: user.defaultOrgId,
      userId: user._id,
      action: "password.reset.completed",
      resource: "user",
      resourceId: user._id,
      success: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Password reset successfully",
    };
  },
});

/**
 * Change password for authenticated user
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || !user.isActive) {
      throw new Error("User not found");
    }

    // Get auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("provider"), "password")
        )
      )
      .first();

    if (!authAccount || !authAccount.secret) {
      throw new Error("Auth account not found");
    }

    // Verify current password
    const { compare } = await import("bcryptjs");
    const isValid = await compare(args.currentPassword, authAccount.secret);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password strength
    const { validators } = await import("./security");
    const passwordCheck = validators.isStrongPassword(args.newPassword);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(". "));
    }

    // Hash new password
    const hashedPassword = await hash(args.newPassword, 10);

    // Update password
    await ctx.db.patch(authAccount._id, {
      secret: hashedPassword,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: user.defaultOrgId,
      userId: user._id,
      action: "password.changed",
      resource: "user",
      resourceId: user._id,
      success: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  },
});
