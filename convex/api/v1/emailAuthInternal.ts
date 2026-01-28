/**
 * Email Auth Internal Functions
 *
 * Internal queries and mutations used by the email auth HTTP handlers.
 * These are not exposed via HTTP - they're called from the httpAction handlers.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";

/**
 * Find user by email (internal query)
 *
 * Used to check if email is already registered.
 */
export const findUserByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    return user;
  },
});

/**
 * Find user with password hash (internal query)
 *
 * Returns user data including password hash for authentication.
 * Password is stored in separate userPasswords table for security.
 * Only used by sign-in handler.
 */
export const findUserWithPassword = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) return null;

    // Get password from separate userPasswords table
    const passwordRecord = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: passwordRecord?.passwordHash || null,
      isPasswordSet: user.isPasswordSet || false,
      defaultOrgId: user.defaultOrgId || null,
    };
  },
});

/**
 * Set password hash for user (internal mutation)
 *
 * Used after creating a new user to set their password.
 * Stores password hash in separate userPasswords table.
 */
export const setPasswordHash = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already has a password record
    const existingPassword = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingPassword) {
      // Update existing password
      await ctx.db.patch(existingPassword._id, {
        passwordHash: args.passwordHash,
      });
    } else {
      // Create new password record
      await ctx.db.insert("userPasswords", {
        userId: args.userId,
        passwordHash: args.passwordHash,
        createdAt: Date.now(),
      });
    }

    // Update user's isPasswordSet flag
    await ctx.db.patch(args.userId, {
      isPasswordSet: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update password identity last used timestamp (internal mutation)
 *
 * Called on successful password login.
 */
export const updatePasswordIdentityLastUsed = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("userIdentities")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .first();

    if (identity) {
      await ctx.db.patch(identity._id, {
        lastUsedAt: Date.now(),
      });
    }
  },
});

/**
 * Delete session (internal mutation)
 *
 * Invalidates a session for logout.
 */
export const deleteSession = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (session) {
      await ctx.db.delete(args.sessionId);
    }
  },
});
