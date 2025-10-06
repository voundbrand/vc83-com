import { action, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all organizations (super admin only)
 */
export const listAll = query({
  args: {
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Get session and validate
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || session.expiresAt <= Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is super admin
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role?.name !== "super_admin") {
        throw new Error("Unauthorized: Only super admins can list all organizations");
      }
    } else {
      throw new Error("Unauthorized: Only super admins can list all organizations");
    }

    // Get all organizations with member counts
    const organizations = await ctx.db.query("organizations").collect();

    const orgsWithDetails = await Promise.all(
      organizations.map(async (org) => {
        const memberCount = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        return {
          ...org,
          memberCount: memberCount.length,
        };
      })
    );

    return orgsWithDetails;
  },
});

/**
 * Get organization by ID with detailed information
 */
export const getById = query({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Get session and validate
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || session.expiresAt <= Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .first();

    // Allow super admins or organization members
    const isSuperAdmin = user.global_role_id ?
      (await ctx.db.get(user.global_role_id))?.name === "super_admin" : false;

    if (!isSuperAdmin && !membership) {
      throw new Error("Unauthorized: You don't have access to this organization");
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get members with their roles
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        const role = await ctx.db.get(member.role);
        return {
          ...member,
          user: user ? {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          } : null,
          roleName: role?.name || "unknown",
        };
      })
    );

    return {
      ...organization,
      members: membersWithDetails,
    };
  },
});

/**
 * Get current user's organizations
 */
export const getUserOrganizations = query({
  args: {
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Get session and validate
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || session.expiresAt <= Date.now()) {
      throw new Error("Invalid or expired session");
    }

    // Get all organization memberships for this user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const organizationsWithRoles = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        const role = await ctx.db.get(membership.role);
        return {
          organization: org,
          role: role?.name || "unknown",
          joinedAt: membership.joinedAt,
        };
      })
    );

    return organizationsWithRoles.filter(item => item.organization);
  },
});

/**
 * Search users that can be invited to an organization
 */
export const searchUsersToInvite = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.optional(v.string()),
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Get session and validate
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || session.expiresAt <= Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", session.userId).eq("organizationId", args.organizationId)
      )
      .first();

    const isSuperAdmin = user.global_role_id ?
      (await ctx.db.get(user.global_role_id))?.name === "super_admin" : false;

    if (!isSuperAdmin && membership) {
      const role = await ctx.db.get(membership.role);
      if (role?.name !== "org_owner" && role?.name !== "business_manager") {
        throw new Error("Unauthorized: Only org owners and managers can invite users");
      }
    } else if (!isSuperAdmin) {
      throw new Error("Unauthorized");
    }

    // Get existing members to exclude
    const existingMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const existingUserIds = new Set(existingMembers.map(m => m.userId));

    // Search for users not in the organization
    let users = await ctx.db.query("users").collect();

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      users = users.filter(u =>
        u.email.toLowerCase().includes(searchLower) ||
        u.firstName?.toLowerCase().includes(searchLower) ||
        u.lastName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter out existing members
    const availableUsers = users
      .filter(u => !existingUserIds.has(u._id))
      .map(u => ({
        id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        hasPassword: u.isPasswordSet || false,
      }));

    return availableUsers;
  },
});

// ============================================================================
// INVITATION ACTION
// ============================================================================

/**
 * Invite a user to an organization
 */
export const inviteUser = action({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    sendEmail: v.optional(v.boolean()), // Default true
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user session
    const session = await ctx.runQuery(internal.auth.getSessionByEmail, {
      email: identity.email!,
    });

    if (!session) {
      throw new Error("Invalid session");
    }

    // Check permissions
    const hasPermission = await ctx.runQuery(internal.organizations.checkInvitePermission, {
      userId: session.userId,
      organizationId: args.organizationId,
      targetRoleId: args.roleId,
    });

    if (!hasPermission) {
      throw new Error("Unauthorized: You don't have permission to invite users with this role");
    }

    // Check if user already exists
    const existingUser = await ctx.runQuery(internal.organizations.getUserByEmail, {
      email: args.email,
    });

    let userId: Id<"users">;
    let isNewUser = false;

    if (existingUser) {
      // Check if already a member
      const existingMembership = await ctx.runQuery(internal.organizations.checkMembership, {
        userId: existingUser._id,
        organizationId: args.organizationId,
      });

      if (existingMembership) {
        throw new Error("User is already a member of this organization");
      }

      userId = existingUser._id;
    } else {
      // Create new user
      userId = await ctx.runMutation(internal.organizations.createInvitedUser, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        invitedBy: session.userId,
        defaultOrgId: args.organizationId,
      });
      isNewUser = true;
    }

    // Add user to organization
    await ctx.runMutation(internal.organizations.addUserToOrganization, {
      userId,
      organizationId: args.organizationId,
      roleId: args.roleId,
      invitedBy: session.userId,
    });

    // Send invitation email (if enabled)
    if (args.sendEmail !== false) {
      const organization = await ctx.runQuery(internal.organizations.getOrganization, {
        organizationId: args.organizationId,
      });

      const inviter = await ctx.runQuery(internal.organizations.getUser, {
        userId: session.userId,
      });

      await ctx.runAction(internal.emailService.sendInvitationEmail, {
        to: args.email,
        organizationName: organization.name,
        inviterName: inviter.firstName || inviter.email,
        isNewUser,
        setupLink: isNewUser
          ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/setup-password?email=${encodeURIComponent(args.email)}`
          : `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-in`,
      });
    }

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: session.userId,
      organizationId: args.organizationId,
      action: "invite_user",
      resource: "users",
      success: true,
      metadata: {
        invitedEmail: args.email,
        roleId: args.roleId,
        isNewUser,
      },
    });

    return {
      success: true,
      userId,
      isNewUser,
    };
  },
});

// ============================================================================
// INTERNAL QUERIES AND MUTATIONS
// ============================================================================

export const getSessionByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const checkInvitePermission = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    targetRoleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Super admins can invite anyone to any organization
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole?.name === "super_admin") return true;
    }

    // Check organization membership and role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership) return false;

    const userRole = await ctx.db.get(membership.role);
    const targetRole = await ctx.db.get(args.targetRoleId);

    if (!userRole || !targetRole) return false;

    // Define role hierarchy
    const roleHierarchy: Record<string, number> = {
      super_admin: 0,
      org_owner: 1,
      business_manager: 2,
      employee: 3,
      viewer: 4,
    };

    // Can only invite users with equal or lower privileges
    return roleHierarchy[userRole.name] <= roleHierarchy[targetRole.name];
  },
});

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const checkMembership = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();
  },
});

export const createInvitedUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    invitedBy: v.id("users"),
    defaultOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      defaultOrgId: args.defaultOrgId,
      isPasswordSet: false,
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const addUserToOrganization = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId: args.organizationId,
      role: args.roleId,
      isActive: true,
      joinedAt: Date.now(),
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
    });
  },
});

export const getOrganization = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");
    return org;
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return user;
  },
});