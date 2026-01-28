/**
 * Customer Auth Internal Functions
 *
 * Internal queries and mutations for customer authentication endpoints.
 * These create frontend_users (in objects table) and link them to CRM contacts.
 *
 * Key differences from platform auth (emailAuthInternal.ts):
 * - Creates frontend_user objects (NOT platform users)
 * - Passwords stored in frontendUserPasswords table
 * - Sessions stored in frontendSessions table
 * - Organization determined by API key (not self-created)
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

/**
 * Find frontend_user by email within organization
 *
 * Used to check if customer already has an account.
 */
export const findFrontendUserByEmail = internalQuery({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Query frontend_users in this organization
    const users = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "frontend_user")
      )
      .collect();

    // Find by email (stored in name field or customProperties.email)
    return users.find(
      (u) =>
        u.name === normalizedEmail ||
        u.customProperties?.email === normalizedEmail
    ) || null;
  },
});

/**
 * Find frontend_user with password hash for sign-in
 */
export const findFrontendUserWithPassword = internalQuery({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Query frontend_users in this organization
    const users = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "frontend_user")
      )
      .collect();

    // Find by email
    const user = users.find(
      (u) =>
        u.name === normalizedEmail ||
        u.customProperties?.email === normalizedEmail
    );

    if (!user) return null;

    // Get password from frontendUserPasswords table
    const passwordRecord = await ctx.db
      .query("frontendUserPasswords")
      .withIndex("by_frontend_user", (q) => q.eq("frontendUserId", user._id))
      .first();

    return {
      _id: user._id,
      email: user.customProperties?.email || user.name,
      firstName: user.customProperties?.firstName || null,
      lastName: user.customProperties?.lastName || null,
      passwordHash: passwordRecord?.passwordHash || null,
      isPasswordSet: user.customProperties?.isPasswordSet || false,
      status: user.status,
      subtype: user.subtype,
    };
  },
});

/**
 * Create frontend_user with password
 *
 * Creates a new customer account that can log in with email/password.
 */
export const createFrontendUserWithPassword = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    passwordHash: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    const normalizedEmail = args.email.toLowerCase().trim();
    const displayName = args.lastName
      ? `${args.firstName} ${args.lastName}`
      : args.firstName;

    // Create frontend_user object
    const userId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "frontend_user",
      subtype: "password", // Distinguishes from "guest" and "oauth"
      name: normalizedEmail, // Email stored in name field
      description: "Customer account (email/password)",
      status: "active", // Active since they have password
      customProperties: {
        email: normalizedEmail,
        firstName: args.firstName,
        lastName: args.lastName || "",
        displayName,
        registrationSource: "mobile_app",
        isPasswordSet: true,
        lastLogin: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Store password in frontendUserPasswords table
    await ctx.db.insert("frontendUserPasswords", {
      frontendUserId: userId,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
    });

    console.log(`[Customer Auth] Created frontend_user: ${userId} for ${normalizedEmail}`);
    return userId;
  },
});

/**
 * Create frontend_user from OAuth (Google/Apple)
 */
export const createFrontendUserFromOAuth = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    provider: v.union(v.literal("google"), v.literal("apple")),
    providerUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    const normalizedEmail = args.email.toLowerCase().trim();
    const displayName = args.lastName
      ? `${args.firstName} ${args.lastName}`
      : args.firstName;

    // Create frontend_user object
    const userId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "frontend_user",
      subtype: "oauth",
      name: normalizedEmail,
      description: `Customer account (${args.provider})`,
      status: "active",
      customProperties: {
        email: normalizedEmail,
        firstName: args.firstName,
        lastName: args.lastName || "",
        displayName,
        registrationSource: "mobile_app",
        oauthProvider: args.provider,
        oauthId: args.providerUserId,
        isPasswordSet: false,
        lastLogin: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`[Customer Auth] Created OAuth frontend_user: ${userId} for ${normalizedEmail}`);
    return userId;
  },
});

/**
 * Find frontend_user by OAuth provider ID
 */
export const findFrontendUserByOAuth = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("google"), v.literal("apple")),
    providerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query frontend_users in this organization
    const users = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "frontend_user")
      )
      .collect();

    // Find by provider + providerUserId
    return users.find(
      (u) =>
        u.customProperties?.oauthProvider === args.provider &&
        u.customProperties?.oauthId === args.providerUserId
    ) || null;
  },
});

/**
 * Update frontend_user last login
 */
export const updateFrontendUserLastLogin = internalMutation({
  args: {
    userId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    await ctx.db.patch(args.userId, {
      updatedAt: Date.now(),
      customProperties: {
        ...user.customProperties,
        lastLogin: Date.now(),
      },
    });
  },
});

/**
 * Create frontend session
 *
 * Creates a session in the frontendSessions table (NOT platform sessions).
 */
export const createFrontendSession = internalMutation({
  args: {
    frontendUserId: v.id("objects"),
    email: v.string(),
    organizationId: v.id("organizations"),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const sessionId = crypto.randomUUID();
    const expiresIn = 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("frontendSessions", {
      sessionId,
      frontendUserId: args.frontendUserId,
      contactEmail: args.email.toLowerCase().trim(),
      organizationId: args.organizationId,
      portalType: "mobile_app",
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresIn,
      lastActivityAt: Date.now(),
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    console.log(`[Customer Auth] Created frontend session: ${sessionId}`);
    return sessionId;
  },
});

/**
 * Validate frontend session
 */
export const validateFrontendSession = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) return null;

    // Check expiration
    if (session.expiresAt < Date.now()) {
      return { expired: true, session: null };
    }

    // Get frontend_user
    const user = await ctx.db.get(session.frontendUserId);

    return {
      expired: false,
      session,
      user,
    };
  },
});

/**
 * Delete frontend session (logout)
 */
export const deleteFrontendSession = internalMutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
      console.log(`[Customer Auth] Deleted session: ${args.sessionId}`);
    }
  },
});

/**
 * Get frontend user profile for response
 */
export const getFrontendUserProfile = internalQuery({
  args: {
    userId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.type !== "frontend_user") return null;

    // Get linked CRM contact
    const contactLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.userId).eq("linkType", "authenticates_as")
      )
      .first();

    let contact = null;
    if (contactLink) {
      contact = await ctx.db.get(contactLink.toObjectId);
    }

    return {
      id: user._id,
      email: user.customProperties?.email || user.name,
      firstName: user.customProperties?.firstName,
      lastName: user.customProperties?.lastName,
      displayName: user.customProperties?.displayName,
      isPasswordSet: user.customProperties?.isPasswordSet || false,
      status: user.status,
      contactId: contact?._id || null,
      crmContactId: user.customProperties?.crmContactId || contact?._id || null,
    };
  },
});
