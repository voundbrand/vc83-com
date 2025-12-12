/**
 * PORTAL AUTHENTICATION
 *
 * Universal authentication system for external portals.
 * Supports both OAuth 2.0 and Magic Link authentication.
 *
 * AUTHENTICATION FLOWS:
 *
 * 1. OAUTH 2.0 (Recommended - Most Secure)
 *    - Contact clicks "Login with Google/Microsoft"
 *    - Portal redirects to l4yercak3.com OAuth endpoint
 *    - User authorizes, portal receives access token
 *    - Portal uses token to call API endpoints
 *
 * 2. MAGIC LINK (Simple - No OAuth Setup)
 *    - Contact receives email with magic link token
 *    - Clicks link → portal verifies token
 *    - Portal creates frontend session
 *    - Session expires after 30 days
 *
 * FRONTEND SESSION:
 * External portals use frontendSessions table (separate from platform sessions).
 * This allows CRM contacts to log into external portals without platform access.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * MAGIC LINK LOGIN
 *
 * Authenticates a contact using a magic link token (from invitation).
 * Creates a frontend session for the external portal.
 *
 * PUBLIC MUTATION - Called by external portals
 */
export const magicLinkLogin = mutation({
  args: {
    invitationToken: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify invitation token
    const allInvitations = await ctx.db
      .query("objects")
      .collect();

    const invitation = allInvitations.find(
      (inv) =>
        inv.type === "portal_invitation" &&
        inv.customProperties?.invitationToken === args.invitationToken
    );

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    // 2. Check expiration
    const expiresAt = invitation.customProperties?.expiresAt as number;
    if (Date.now() > expiresAt) {
      await ctx.db.patch(invitation._id, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new Error("Invitation has expired");
    }

    // 3. Check if revoked
    if (invitation.status === "revoked") {
      throw new Error("Invitation has been revoked");
    }

    // 4. Get contact
    const contactId = invitation.customProperties?.contactId as string;
    const contact = await ctx.db.get(contactId as any);
    if (!contact || !("type" in contact) || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    const contactEmail = invitation.customProperties?.contactEmail as string;

    // 5. Mark invitation as accepted (if first login)
    if (invitation.status === "pending") {
      await ctx.db.patch(invitation._id, {
        status: "accepted",
        customProperties: {
          ...invitation.customProperties,
          acceptedAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 1,
        },
        updatedAt: Date.now(),
      });
    } else {
      // Update access tracking
      await ctx.db.patch(invitation._id, {
        customProperties: {
          ...invitation.customProperties,
          lastAccessedAt: Date.now(),
          accessCount: ((invitation.customProperties?.accessCount as number) || 0) + 1,
        },
        updatedAt: Date.now(),
      });
    }

    // 6. Create frontend session (30-day expiration)
    const sessionId = crypto.randomUUID();
    const expiresIn = 30 * 24 * 60 * 60 * 1000; // 30 days
    const expiresAtSession = Date.now() + expiresIn;

    await ctx.db.insert("frontendSessions", {
      sessionId: sessionId,
      contactEmail: contactEmail,
      organizationId: invitation.organizationId,
      frontendUserId: contactId as any,
      portalType: invitation.customProperties?.portalType as string,
      portalUrl: invitation.customProperties?.portalUrl as string,
      invitationId: invitation._id,
      expiresAt: expiresAtSession,
      lastActivityAt: Date.now(),
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      createdAt: Date.now(),
    });

    // 7. Get organization details
    const org = await ctx.db.get(invitation.organizationId);

    return {
      success: true,
      sessionId: sessionId,
      contactEmail: contactEmail,
      expiresAt: expiresAtSession,
      organizationSlug: org?.slug,
      portalType: invitation.customProperties?.portalType,
      permissions: invitation.customProperties?.permissions || [],
    };
  },
});

/**
 * OAUTH LOGIN (For future OAuth implementation)
 *
 * Handles OAuth 2.0 login flow for external portals.
 * Creates a frontend session after successful OAuth authorization.
 *
 * This will integrate with the existing OAuth system in convex/oauth/
 */
export const oauthLogin = mutation({
  args: {
    authorizationCode: v.string(),
    organizationSlug: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement OAuth flow integration
    // 1. Verify authorization code
    // 2. Exchange for access token
    // 3. Get user info from token
    // 4. Find matching CRM contact by email
    // 5. Create frontend session

    throw new Error("OAuth login not yet implemented - use magic link for now");
  },
});

/**
 * VERIFY SESSION
 *
 * Verifies a frontend session is valid and returns contact info.
 * Called by external portals on every request to check auth.
 *
 * PUBLIC QUERY
 */
export const verifySession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session
    const session = await ctx.db
      .query("frontendSessions")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      return { valid: false, reason: "Session expired" };
    }

    // Update last activity (mutation context needed)
    // Note: This is a query, so we can't mutate. The portal should call refreshSession periodically.

    // Get organization
    const org = await ctx.db.get(session.organizationId);

    return {
      valid: true,
      contactEmail: session.contactEmail,
      contactId: session.frontendUserId,
      organizationId: session.organizationId,
      organizationSlug: org?.slug,
      portalType: session.portalType,
      portalUrl: session.portalUrl,
      expiresAt: session.expiresAt,
    };
  },
});

/**
 * LOGOUT
 *
 * Invalidates a frontend session.
 *
 * PUBLIC MUTATION
 */
export const logout = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session
    const session = await ctx.db
      .query("frontendSessions")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) {
      return { success: false, reason: "Session not found" };
    }

    // Delete session
    await ctx.db.delete(session._id);

    return { success: true };
  },
});

/**
 * REFRESH SESSION
 *
 * Extends session expiration (30 days from now).
 *
 * PUBLIC MUTATION
 */
export const refreshSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session
    const session = await ctx.db
      .query("frontendSessions")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      throw new Error("Session has expired - please log in again");
    }

    // Extend expiration by 30 days
    const newExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
      lastActivityAt: Date.now(),
    });

    return {
      success: true,
      expiresAt: newExpiresAt,
    };
  },
});

/**
 * GET ACTIVE SESSIONS
 *
 * Returns all active frontend sessions for a contact.
 *
 * Used by CRM to show where a contact is logged in.
 */
export const getContactActiveSessions = query({
  args: {
    sessionId: v.string(), // Platform session
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify platform session
    const platformSession = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!platformSession) {
      throw new Error("Invalid session");
    }

    // Get all active frontend sessions for this contact
    const now = Date.now();
    const sessions = await ctx.db
      .query("frontendSessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("frontendUserId"), args.contactId),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .collect();

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      portalType: s.portalType,
      portalUrl: s.portalUrl,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
    }));
  },
});

/**
 * REVOKE SESSION
 *
 * Revokes a specific frontend session (e.g., security breach).
 */
export const revokeSession = mutation({
  args: {
    sessionId: v.string(), // Platform session
    frontendSessionId: v.string(), // Frontend session to revoke
  },
  handler: async (ctx, args) => {
    // Verify platform session
    const platformSession = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!platformSession) {
      throw new Error("Invalid session");
    }

    // Find frontend session
    const frontendSession = await ctx.db
      .query("frontendSessions")
      .filter((q) => q.eq(q.field("sessionId"), args.frontendSessionId))
      .first();

    if (!frontendSession) {
      throw new Error("Frontend session not found");
    }

    // Delete session
    await ctx.db.delete(frontendSession._id);

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: frontendSession.organizationId,
      objectId: frontendSession.frontendUserId,
      actionType: "session_revoked",
      actionData: {
        sessionId: args.frontendSessionId,
        portalType: frontendSession.portalType,
        revokedBy: platformSession.userId,
      },
      performedBy: platformSession.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});
