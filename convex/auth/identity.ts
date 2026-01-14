/**
 * Identity Management Functions
 *
 * Handles multi-provider OAuth identity linking. Enables users to sign in
 * with Google, Apple, or Microsoft and link accounts together.
 *
 * Key concepts:
 * - userIdentities table links OAuth providers to platform users
 * - Each user can have multiple identities (Google + Apple + Microsoft)
 * - Account collision detection prompts users to link accounts
 * - Apple private relay emails are handled specially (can't auto-link)
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Provider type used across the identity system
export const identityProviderValidator = v.union(
  v.literal("google"),
  v.literal("apple"),
  v.literal("microsoft"),
  v.literal("github"),
  v.literal("password")
);

export type IdentityProvider = "google" | "apple" | "microsoft" | "github" | "password";

// ============================================================================
// INTERNAL QUERIES (Used by mobileOAuth handler)
// ============================================================================

/**
 * Find user by provider + providerUserId
 *
 * This is the primary lookup - if found, we know exactly which user to log in.
 * Used when: User signs in with a provider they've used before.
 */
export const findByProviderUser = internalQuery({
  args: {
    provider: identityProviderValidator,
    providerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("userIdentities")
      .withIndex("by_provider_user", (q) =>
        q.eq("provider", args.provider).eq("providerUserId", args.providerUserId)
      )
      .first();

    if (!identity) return null;

    // Get the user
    const user = await ctx.db.get(identity.userId);
    if (!user) return null;

    return {
      identity,
      user,
    };
  },
});

/**
 * Find identity by email
 *
 * Used for collision detection - check if email is already used by another provider.
 * Returns all identities with this email (could be multiple if user has linked accounts).
 */
export const findByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const identities = await ctx.db
      .query("userIdentities")
      .withIndex("by_email", (q) => q.eq("providerEmail", normalizedEmail))
      .collect();

    if (identities.length === 0) return null;

    // Get unique user IDs
    const userIds = [...new Set(identities.map((i) => i.userId))];

    // Get users
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));

    return {
      identities,
      users: users.filter(Boolean),
    };
  },
});

/**
 * Get all identities for a user
 *
 * Used to show linked providers in settings UI.
 */
export const getLinkedIdentities = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userIdentities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Check if user has specific provider
 *
 * Used to prevent duplicate linking.
 */
export const hasProvider = internalQuery({
  args: {
    userId: v.id("users"),
    provider: identityProviderValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("userIdentities")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    return identity !== null;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Used by mobileOAuth handler)
// ============================================================================

/**
 * Create identity for a new user
 *
 * Called when creating a new user from OAuth - creates both user and identity.
 */
export const createIdentity = internalMutation({
  args: {
    userId: v.id("users"),
    provider: identityProviderValidator,
    providerUserId: v.string(),
    providerEmail: v.string(),
    isPrimary: v.boolean(),
    isApplePrivateRelay: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = args.providerEmail.toLowerCase().trim();

    const identityId = await ctx.db.insert("userIdentities", {
      userId: args.userId,
      provider: args.provider,
      providerUserId: args.providerUserId,
      providerEmail: normalizedEmail,
      isApplePrivateRelay: args.isApplePrivateRelay ?? normalizedEmail.includes("privaterelay.appleid.com"),
      isPrimary: args.isPrimary,
      isVerified: true, // OAuth emails are verified by provider
      connectedAt: now,
      lastUsedAt: now,
      metadata: args.metadata,
    });

    return identityId;
  },
});

/**
 * Link new identity to existing user
 *
 * Called after user confirms account linking.
 */
export const linkIdentity = internalMutation({
  args: {
    userId: v.id("users"),
    provider: identityProviderValidator,
    providerUserId: v.string(),
    providerEmail: v.string(),
    isApplePrivateRelay: v.optional(v.boolean()),
    realEmailHint: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = args.providerEmail.toLowerCase().trim();

    // Check if this provider is already linked
    const existing = await ctx.db
      .query("userIdentities")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      // Update existing identity
      await ctx.db.patch(existing._id, {
        providerUserId: args.providerUserId,
        providerEmail: normalizedEmail,
        lastUsedAt: now,
        metadata: args.metadata,
      });
      return existing._id;
    }

    // Create new identity (not primary since user already has one)
    const identityId = await ctx.db.insert("userIdentities", {
      userId: args.userId,
      provider: args.provider,
      providerUserId: args.providerUserId,
      providerEmail: normalizedEmail,
      isApplePrivateRelay: args.isApplePrivateRelay ?? normalizedEmail.includes("privaterelay.appleid.com"),
      realEmailHint: args.realEmailHint,
      isPrimary: false, // Additional identities are not primary
      isVerified: true,
      connectedAt: now,
      lastUsedAt: now,
      metadata: args.metadata,
    });

    return identityId;
  },
});

/**
 * Update last used timestamp
 *
 * Called on every successful login.
 */
export const updateLastUsed = internalMutation({
  args: {
    identityId: v.id("userIdentities"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.identityId, {
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Unlink identity from user
 *
 * Allows user to remove a linked provider.
 * Cannot remove the last/only identity.
 */
export const unlinkIdentity = internalMutation({
  args: {
    userId: v.id("users"),
    provider: identityProviderValidator,
  },
  handler: async (ctx, args) => {
    // Get all identities for this user
    const identities = await ctx.db
      .query("userIdentities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Must have at least 2 identities to unlink one
    if (identities.length <= 1) {
      throw new Error("Cannot remove the only sign-in method");
    }

    // Find the identity to remove
    const toRemove = identities.find((i) => i.provider === args.provider);
    if (!toRemove) {
      throw new Error(`No ${args.provider} identity found`);
    }

    // If removing primary, make another one primary
    if (toRemove.isPrimary) {
      const newPrimary = identities.find((i) => i.provider !== args.provider);
      if (newPrimary) {
        await ctx.db.patch(newPrimary._id, { isPrimary: true });
      }
    }

    // Delete the identity
    await ctx.db.delete(toRemove._id);

    return { success: true };
  },
});

// ============================================================================
// ACCOUNT LINKING STATE MANAGEMENT
// ============================================================================

/**
 * Create account linking state
 *
 * Called when a new OAuth login detects an existing account with the same email.
 */
export const createLinkingState = internalMutation({
  args: {
    sourceProvider: v.union(
      v.literal("google"),
      v.literal("apple"),
      v.literal("microsoft"),
      v.literal("github")
    ),
    sourceProviderUserId: v.string(),
    sourceEmail: v.string(),
    sourceName: v.optional(v.string()),
    sourceIdToken: v.optional(v.string()),
    targetUserId: v.id("users"),
    targetEmail: v.string(),
    targetProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const state = crypto.randomUUID();

    // Check for existing pending link request
    const existing = await ctx.db
      .query("accountLinkingStates")
      .withIndex("by_source_provider", (q) =>
        q.eq("sourceProvider", args.sourceProvider).eq("sourceProviderUserId", args.sourceProviderUserId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      // Update existing state
      await ctx.db.patch(existing._id, {
        sourceEmail: args.sourceEmail,
        sourceName: args.sourceName,
        sourceIdToken: args.sourceIdToken,
        targetUserId: args.targetUserId,
        targetEmail: args.targetEmail,
        targetProvider: args.targetProvider,
        expiresAt: now + 15 * 60 * 1000, // 15 minutes
      });
      return existing.state;
    }

    // Create new linking state
    await ctx.db.insert("accountLinkingStates", {
      state,
      sourceProvider: args.sourceProvider,
      sourceProviderUserId: args.sourceProviderUserId,
      sourceEmail: args.sourceEmail,
      sourceName: args.sourceName,
      sourceIdToken: args.sourceIdToken,
      targetUserId: args.targetUserId,
      targetEmail: args.targetEmail,
      targetProvider: args.targetProvider,
      status: "pending",
      createdAt: now,
      expiresAt: now + 15 * 60 * 1000, // 15 minutes
    });

    return state;
  },
});

/**
 * Get linking state by state token
 */
export const getLinkingState = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const linkingState = await ctx.db
      .query("accountLinkingStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!linkingState) return null;

    // Check expiration
    if (linkingState.expiresAt < Date.now()) {
      return { ...linkingState, status: "expired" as const };
    }

    return linkingState;
  },
});

/**
 * Confirm account linking
 *
 * Called when user confirms they want to link accounts.
 */
export const confirmLinking = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const linkingState = await ctx.db
      .query("accountLinkingStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!linkingState) {
      throw new Error("Linking state not found");
    }

    if (linkingState.status !== "pending") {
      throw new Error(`Linking already ${linkingState.status}`);
    }

    if (linkingState.expiresAt < Date.now()) {
      await ctx.db.patch(linkingState._id, { status: "expired" });
      throw new Error("Linking request has expired");
    }

    // Update status
    await ctx.db.patch(linkingState._id, {
      status: "confirmed",
      resolvedAt: Date.now(),
    });

    return linkingState;
  },
});

/**
 * Reject account linking
 *
 * Called when user doesn't want to link accounts.
 */
export const rejectLinking = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const linkingState = await ctx.db
      .query("accountLinkingStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!linkingState) {
      throw new Error("Linking state not found");
    }

    if (linkingState.status !== "pending") {
      throw new Error(`Linking already ${linkingState.status}`);
    }

    await ctx.db.patch(linkingState._id, {
      status: "rejected",
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// PUBLIC QUERIES (For mobile app settings UI)
// ============================================================================

/**
 * Get linked identities for authenticated user
 *
 * Used in settings UI to show linked providers.
 */
export const getMyLinkedIdentities = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    // Get identities
    const identities = await ctx.db
      .query("userIdentities")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    // Return without sensitive data
    return identities.map((identity) => ({
      provider: identity.provider,
      providerEmail: identity.providerEmail,
      isPrimary: identity.isPrimary,
      isApplePrivateRelay: identity.isApplePrivateRelay,
      connectedAt: identity.connectedAt,
      lastUsedAt: identity.lastUsedAt,
    }));
  },
});
