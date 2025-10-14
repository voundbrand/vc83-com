/**
 * INVITATION ONTOLOGY HELPERS
 *
 * Manages user invitations using the ontology system.
 * Invitations are stored as objects with type="invitation"
 *
 * Core Pattern:
 * - type: "invitation"
 * - subtype: "user" (future: could be "admin", "viewer-only", etc.)
 * - value: email address of invitee
 * - status: "pending" | "accepted" | "expired" | "cancelled"
 * - customProperties: token, expiration, role, inviter info, etc.
 */

import { query, mutation, internalMutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAuthenticatedUser, requirePermission, checkPermission } from "./rbacHelpers";
import { Id, Doc } from "./_generated/dataModel";

// ============================================================================
// CONSTANTS
// ============================================================================

const INVITATION_EXPIRY_DAYS = 7;
const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET INVITATION BY ID
 * Retrieves a specific invitation by its object ID
 */
export const getInvitation = query({
  args: {
    invitationId: v.id("objects"),
  },
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);

    if (!invitation || invitation.type !== "invitation") {
      return null;
    }

    return invitation;
  },
});

/**
 * GET INVITATION BY TOKEN
 * Public query for invitation acceptance flow
 * Used on the accept-invitation page
 */
export const getInvitationByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Validate token format (64 hex chars)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return null;
    }

    // Find invitation by token in customProperties
    const invitations = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "invitation"))
      .collect();

    const invitation = invitations.find(
      (inv) => inv.customProperties?.token === token
    );

    return invitation || null;
  },
});

/**
 * LIST INVITATIONS
 * List all invitations for an organization with optional status filter
 *
 * @permission manage_users - Required to view invitations
 */
export const listInvitations = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()), // "pending", "accepted", "expired", "cancelled"
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission to view invitations (using checkPermission for queries)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_users",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Du hast keine Berechtigung, Einladungen anzuzeigen");
    }

    let invitations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invitation")
      )
      .collect();

    // Filter by status if provided
    if (args.status) {
      invitations = invitations.filter((inv) => inv.status === args.status);
    }

    // Enrich with role and inviter information
    const enrichedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        const roleId = inv.customProperties?.roleId as Id<"roles"> | undefined;
        const invitedBy = inv.customProperties?.invitedBy as Id<"users"> | undefined;

        const role = roleId ? await ctx.db.get(roleId) : null;
        const inviter = invitedBy ? await ctx.db.get(invitedBy) : null;

        return {
          ...inv,
          roleName: role?.name || "unknown",
          roleDisplayName: role?.description || role?.name || "Unknown Role",
          inviterName:
            inviter
              ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email
              : "Unknown",
        };
      })
    );

    // Sort by creation date (newest first)
    return enrichedInvitations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * GET PENDING INVITATIONS
 * Quick query for pending invitations only (most common use case)
 *
 * @permission manage_users - Required to view invitations
 */
export const getPendingInvitations = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission to view invitations (using checkPermission for queries)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_users",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Du hast keine Berechtigung, Einladungen anzuzeigen");
    }

    const invitations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invitation")
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Enrich with role and inviter information
    const enrichedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        const roleId = inv.customProperties?.roleId as Id<"roles"> | undefined;
        const invitedBy = inv.customProperties?.invitedBy as Id<"users"> | undefined;

        const role = roleId ? await ctx.db.get(roleId) : null;
        const inviter = invitedBy ? await ctx.db.get(invitedBy) : null;

        return {
          ...inv,
          roleName: role?.name || "unknown",
          roleDisplayName: role?.description || role?.name || "Unknown Role",
          inviterName:
            inviter
              ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email
              : "Unknown",
        };
      })
    );

    // Sort by creation date (newest first)
    return enrichedInvitations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * CHECK FOR EXISTING PENDING INVITATION
 * Prevents duplicate invitations to same email
 */
export const checkPendingInvitation = query({
  args: {
    sessionId: v.string(),
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const existingInvitation = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invitation")
      )
      .filter((q) => q.eq(q.field("value"), args.email.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    return existingInvitation || null;
  },
});

// ============================================================================
// ACTIONS (for operations requiring crypto)
// ============================================================================

/**
 * CREATE INVITATION
 * Creates a new invitation object with secure token
 *
 * @permission manage_users - Required to create invitations
 */
export const createInvitation = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    email: v.string(),
    roleId: v.id("roles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    invitationId: Id<"objects">;
    token: string;
    expiresAt: number;
  }> => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Ungültige E-Mail-Adresse");
    }

    // Generate secure token using crypto action
    const token: string = await ctx.runAction(internal.cryptoActions.generateSecureToken, {
      bytes: 32,
    });

    // Run the internal mutation to create the invitation
    const result: {
      invitationId: Id<"objects">;
      token: string;
      expiresAt: number;
    } = await ctx.runMutation(internal.invitationOntology.internalCreateInvitation, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      email: args.email.toLowerCase(),
      roleId: args.roleId,
      firstName: args.firstName,
      lastName: args.lastName,
      token,
    });

    return result;
  },
});

/**
 * ACCEPT INVITATION
 * Public action - accepts invitation and creates user/membership
 * No authentication required (uses token validation)
 */
export const acceptInvitation = action({
  args: {
    token: v.string(),
    password: v.optional(v.string()), // Required for new users
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
    isNewUser: boolean;
    organizationId: Id<"organizations">;
  }> => {
    // Validate token format
    if (!/^[a-f0-9]{64}$/i.test(args.token)) {
      throw new Error("Ungültiger Einladungstoken");
    }

    // Get invitation via internal query
    const invitation: Doc<"objects"> | null =
      await ctx.runQuery(internal.invitationOntology.internalGetInvitationByToken, {
        token: args.token,
      });

    if (!invitation) {
      throw new Error("Einladung nicht gefunden");
    }

    // Validate invitation status
    if (invitation.status !== "pending") {
      throw new Error(`Diese Einladung wurde bereits ${invitation.status}`);
    }

    // Check expiration
    const expiresAt = invitation.customProperties?.expiresAt as number;
    if (expiresAt && expiresAt <= Date.now()) {
      throw new Error("Diese Einladung ist abgelaufen");
    }

    // Hash password if provided (for new users)
    let passwordHash: string | undefined = undefined;
    if (args.password) {
      if (args.password.length < 8) {
        throw new Error("Passwort muss mindestens 8 Zeichen lang sein");
      }
      passwordHash = await ctx.runAction(internal.cryptoActions.hashPassword, {
        password: args.password,
      });
    }

    // Run the internal mutation to accept the invitation
    const result: {
      success: boolean;
      userId: Id<"users">;
      isNewUser: boolean;
      organizationId: Id<"organizations">;
    } = await ctx.runMutation(internal.invitationOntology.internalAcceptInvitation, {
      invitationId: invitation._id,
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
    });

    return result;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (called by actions)
// ============================================================================

/**
 * Internal mutation to create invitation
 * Called by createInvitation action after token generation
 */
export const internalCreateInvitation = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    email: v.string(),
    roleId: v.id("roles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission to manage users
    await requirePermission(ctx, userId, "manage_users", {
      organizationId: args.organizationId,
    });

    // Check for existing pending invitation
    const existingInvitation = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invitation")
      )
      .filter((q) => q.eq(q.field("value"), args.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error(
        "Diese E-Mail-Adresse hat bereits eine ausstehende Einladung. Verwende die Schaltfläche 'Erneut senden', um eine weitere E-Mail zu senden."
      );
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", existingUser._id).eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (existingMembership) {
        throw new Error("Dieser Benutzer ist bereits Mitglied dieser Organisation");
      }
    }

    // Get organization and inviter info
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organisation nicht gefunden");

    const inviter = await ctx.db.get(userId);
    if (!inviter) throw new Error("Einlader nicht gefunden");

    const role = await ctx.db.get(args.roleId);
    if (!role) throw new Error("Rolle nicht gefunden");

    const now = Date.now();
    const expiresAt = now + INVITATION_EXPIRY_MS;

    // Create invitation object
    const invitationId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "invitation",
      subtype: "user",
      name: `Invitation for ${args.email}`,
      value: args.email,
      status: "pending",
      description: `Invited by ${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email,
      customProperties: {
        // Invitee details
        firstName: args.firstName,
        lastName: args.lastName,
        roleId: args.roleId,

        // Security
        token: args.token,
        expiresAt,

        // Inviter info
        invitedBy: userId,
        invitedByName: `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email,

        // Email tracking
        emailSentAt: now,
        emailSentCount: 0, // Will be incremented when email is sent
        lastEmailSentAt: undefined,

        // Acceptance tracking
        acceptedAt: undefined,
        acceptedBy: undefined,

        // Cancellation tracking
        cancelledAt: undefined,
        cancelledBy: undefined,
        cancelledReason: undefined,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action in objectActions for audit trail
    await ctx.db.insert("objectActions", {
      objectId: invitationId,
      organizationId: args.organizationId,
      actionType: "invitation_created",
      performedBy: userId,
      performedAt: now,
      actionData: {
        email: args.email,
        roleId: args.roleId,
        roleName: role.name,
        expiresAt,
      },
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: args.organizationId,
      action: "create_invitation",
      resource: "invitations",
      success: true,
      metadata: {
        email: args.email,
        roleId: args.roleId,
        invitationId,
      },
      createdAt: now,
    });

    return {
      invitationId,
      token: args.token,
      expiresAt,
    };
  },
});

/**
 * Internal query to get invitation by token
 * Used by acceptInvitation action
 */
export const internalGetInvitationByToken = internalQuery({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Find invitation by token in customProperties
    const invitations = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "invitation"))
      .collect();

    const invitation = invitations.find(
      (inv) => inv.customProperties?.token === token
    );

    return invitation || null;
  },
});

/**
 * Internal mutation to accept invitation
 * Called by acceptInvitation action after password hashing
 */
export const internalAcceptInvitation = internalMutation({
  args: {
    invitationId: v.id("objects"),
    passwordHash: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.type !== "invitation") {
      throw new Error("Einladung nicht gefunden");
    }

    const email = invitation.value || "";
    const roleId = invitation.customProperties?.roleId as Id<"roles">;

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    let userId: Id<"users">;
    let isNewUser = false;

    if (existingUser) {
      // Existing user - verify not already a member
      const existingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", existingUser._id).eq("organizationId", invitation.organizationId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (existingMembership) {
        throw new Error("Du bist bereits Mitglied dieser Organisation");
      }

      userId = existingUser._id;
    } else {
      // New user - password required
      if (!args.passwordHash) {
        throw new Error("Passwort ist für neue Benutzer erforderlich");
      }

      // Create new user
      userId = await ctx.db.insert("users", {
        email,
        firstName: args.firstName || invitation.customProperties?.firstName as string | undefined,
        lastName: args.lastName || invitation.customProperties?.lastName as string | undefined,
        isPasswordSet: true,
        defaultOrgId: invitation.organizationId,
        invitedBy: invitation.customProperties?.invitedBy as Id<"users">,
        invitedAt: invitation.createdAt,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Store password in userPasswords table
      await ctx.db.insert("userPasswords", {
        userId,
        passwordHash: args.passwordHash,
        createdAt: Date.now(),
      });

      isNewUser = true;
    }

    // Create organization membership
    const now = Date.now();
    await ctx.db.insert("organizationMembers", {
      userId,
      organizationId: invitation.organizationId,
      role: roleId,
      isActive: true,
      joinedAt: now,
      invitedBy: invitation.customProperties?.invitedBy as Id<"users">,
      invitedAt: invitation.createdAt,
    });

    // Update invitation status to accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      customProperties: {
        ...invitation.customProperties,
        acceptedAt: now,
        acceptedBy: userId,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: invitation._id,
      organizationId: invitation.organizationId,
      actionType: "invitation_accepted",
      performedBy: userId,
      performedAt: now,
      actionData: {
        isNewUser,
        acceptedAt: now,
      },
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: invitation.organizationId,
      action: "accept_invitation",
      resource: "invitations",
      success: true,
      metadata: {
        invitationId: invitation._id,
        isNewUser,
      },
      createdAt: now,
    });

    return {
      success: true,
      userId,
      isNewUser,
      organizationId: invitation.organizationId,
    };
  },
});

// ============================================================================
// MUTATIONS (for operations without crypto)
// ============================================================================

/**
 * RESEND INVITATION
 * Resends invitation email and updates tracking
 *
 * @permission manage_users - Required to resend invitations
 */
export const resendInvitation = mutation({
  args: {
    sessionId: v.string(),
    invitationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.type !== "invitation") {
      throw new Error("Einladung nicht gefunden");
    }

    await requirePermission(ctx, userId, "manage_users", {
      organizationId: invitation.organizationId,
    });

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      throw new Error(`Diese Einladung wurde bereits ${invitation.status}`);
    }

    // Check if expired
    const expiresAt = invitation.customProperties?.expiresAt as number;
    if (expiresAt && expiresAt <= Date.now()) {
      // Auto-expire it
      await ctx.db.patch(args.invitationId, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new Error("Diese Einladung ist abgelaufen");
    }

    const now = Date.now();
    const emailSentCount = (invitation.customProperties?.emailSentCount as number) || 0;

    // Update email tracking
    await ctx.db.patch(args.invitationId, {
      customProperties: {
        ...invitation.customProperties,
        emailSentCount: emailSentCount + 1,
        lastEmailSentAt: now,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: args.invitationId,
      organizationId: invitation.organizationId,
      actionType: "invitation_resent",
      performedBy: userId,
      performedAt: now,
      actionData: {
        emailSentCount: emailSentCount + 1,
      },
    });

    return {
      success: true,
      token: invitation.customProperties?.token as string,
      email: invitation.value,
    };
  },
});

/**
 * CANCEL INVITATION
 * Cancels a pending invitation
 *
 * @permission manage_users - Required to cancel invitations
 */
export const cancelInvitation = mutation({
  args: {
    sessionId: v.string(),
    invitationId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.type !== "invitation") {
      throw new Error("Einladung nicht gefunden");
    }

    await requirePermission(ctx, userId, "manage_users", {
      organizationId: invitation.organizationId,
    });

    // Check if invitation is pending
    if (invitation.status !== "pending") {
      throw new Error(`Diese Einladung wurde bereits ${invitation.status}`);
    }

    const now = Date.now();
    const canceller = await ctx.db.get(userId);

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
      customProperties: {
        ...invitation.customProperties,
        cancelledAt: now,
        cancelledBy: userId,
        cancelledReason: args.reason,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: args.invitationId,
      organizationId: invitation.organizationId,
      actionType: "invitation_cancelled",
      performedBy: userId,
      performedAt: now,
      actionData: {
        reason: args.reason,
        cancellerName: `${canceller?.firstName || ""} ${canceller?.lastName || ""}`.trim() || canceller?.email,
      },
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: invitation.organizationId,
      action: "cancel_invitation",
      resource: "invitations",
      success: true,
      metadata: {
        invitationId: args.invitationId,
        email: invitation.value,
        reason: args.reason,
      },
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * EXPIRE OLD INVITATIONS
 * Internal mutation to cleanup expired invitations
 * Should be called periodically via cron
 */
export const expireOldInvitations = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const pendingInvitations = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "invitation"))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let expiredCount = 0;

    for (const invitation of pendingInvitations) {
      const expiresAt = invitation.customProperties?.expiresAt as number;
      if (expiresAt && expiresAt <= now) {
        await ctx.db.patch(invitation._id, {
          status: "expired",
          updatedAt: now,
        });

        // Log action
        await ctx.db.insert("objectActions", {
          objectId: invitation._id,
          organizationId: invitation.organizationId,
          actionType: "invitation_expired",
          performedBy: invitation.createdBy,
          performedAt: now,
          actionData: {
            expiredAt: now,
            originalExpiresAt: expiresAt,
          },
        });

        expiredCount++;
      }
    }

    return {
      expiredCount,
      executedAt: now,
    };
  },
});
