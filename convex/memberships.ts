import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Check if user has permission in organization
export async function checkUserPermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  requiredRole: "owner" | "admin" | "member" | "viewer"
): Promise<boolean> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    .first();

  if (!membership || !membership.isActive) return false;

  // Role hierarchy: owner > admin > member > viewer
  const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
}

// Get all members of an organization
export const getOrganizationMembers = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if user has access to view members (must be at least a viewer)
    const hasAccess = await checkUserPermission(ctx, args.userId, args.organizationId, "viewer");
    if (!hasAccess) {
      throw new Error("Access denied: Not a member of this organization");
    }

    // Get all memberships
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get user details for each membership
    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user || !user.isActive) return null;

        return {
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: membership.role,
          joinedAt: membership.joinedAt,
          invitedBy: membership.invitedBy,
        };
      })
    );

    // Filter out null values
    return members.filter((member): member is NonNullable<typeof member> => member !== null);
  },
});

// Invite user to organization
export const inviteToOrganization = mutation({
  args: {
    userId: v.id("users"), // User doing the inviting
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    // Check if inviter has permission (must be at least admin)
    const hasPermission = await checkUserPermission(ctx, args.userId, args.organizationId, "admin");
    if (!hasPermission) {
      throw new Error("Access denied: Only admins and owners can invite members");
    }

    // Check if email is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Check if already a member
      const existingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", existingUser._id).eq("organizationId", args.organizationId)
        )
        .first();

      if (existingMembership && existingMembership.isActive) {
        throw new Error("User is already a member of this organization");
      }
    }

    // Generate invitation token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    // Create invitation
    const invitationId = await ctx.db.insert("invitations", {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role,
      status: "pending",
      token,
      expiresAt,
      invitedBy: args.userId,
      invitedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "member.invite",
      resource: "invitation",
      resourceId: invitationId,
      metadata: {
        email: args.email,
        role: args.role,
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      invitationId,
      token,
      message: "Invitation sent successfully",
    };
  },
});

// Accept invitation (creates membership)
export const acceptInvitation = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find invitation by token
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation");
    }

    // Check if expired
    if (Date.now() > invitation.expiresAt) {
      throw new Error("Invitation has expired");
    }

    // Check if already accepted
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been used");
    }

    // Verify user email matches invitation email
    const user = await ctx.db.get(args.userId);
    if (!user || user.email !== invitation.email) {
      throw new Error("This invitation is for a different email address");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", invitation.organizationId)
      )
      .first();

    if (existingMembership && existingMembership.isActive) {
      throw new Error("You are already a member of this organization");
    }

    // Create or reactivate membership
    if (existingMembership) {
      // Reactivate existing membership
      await ctx.db.patch(existingMembership._id, {
        isActive: true,
        role: invitation.role,
        joinedAt: Date.now(),
      });
    } else {
      // Create new membership
      await ctx.db.insert("organizationMembers", {
        userId: args.userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
        isActive: true,
        joinedAt: Date.now(),
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.invitedAt,
        acceptedAt: Date.now(),
      });
    }

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: invitation.organizationId,
      userId: args.userId,
      action: "member.join",
      resource: "membership",
      resourceId: args.userId,
      metadata: {
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      organizationId: invitation.organizationId,
      message: "Successfully joined organization",
    };
  },
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    userId: v.id("users"), // User making the change
    organizationId: v.id("organizations"),
    targetUserId: v.id("users"), // User whose role is being changed
    newRole: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    // Check if user has permission (must be owner or admin)
    const hasPermission = await checkUserPermission(ctx, args.userId, args.organizationId, "admin");
    if (!hasPermission) {
      throw new Error("Access denied: Only admins and owners can change member roles");
    }

    // Can't change your own role
    if (args.userId === args.targetUserId) {
      throw new Error("You cannot change your own role");
    }

    // Get target membership
    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.targetUserId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!targetMembership || !targetMembership.isActive) {
      throw new Error("Member not found");
    }

    // Can't change owner's role
    if (targetMembership.role === "owner") {
      throw new Error("Cannot change owner's role");
    }

    // Only owners can create other admins
    const userMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (args.newRole === "admin" && userMembership?.role !== "owner") {
      throw new Error("Only owners can promote members to admin");
    }

    // Update role
    await ctx.db.patch(targetMembership._id, {
      role: args.newRole,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "member.role_change",
      resource: "membership",
      resourceId: args.targetUserId,
      metadata: {
        previousRole: targetMembership.role,
        newRole: args.newRole,
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      message: "Member role updated successfully",
    };
  },
});

// Remove member from organization
export const removeMember = mutation({
  args: {
    userId: v.id("users"), // User doing the removing
    organizationId: v.id("organizations"),
    targetUserId: v.id("users"), // User being removed
  },
  handler: async (ctx, args) => {
    // Check if user has permission (must be admin or owner)
    const hasPermission = await checkUserPermission(ctx, args.userId, args.organizationId, "admin");
    if (!hasPermission) {
      throw new Error("Access denied: Only admins and owners can remove members");
    }

    // Get target membership
    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.targetUserId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!targetMembership || !targetMembership.isActive) {
      throw new Error("Member not found");
    }

    // Can't remove owner
    if (targetMembership.role === "owner") {
      throw new Error("Cannot remove organization owner");
    }

    // Only owners can remove admins
    const userMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (targetMembership.role === "admin" && userMembership?.role !== "owner") {
      throw new Error("Only owners can remove admins");
    }

    // Check if this is the user's personal organization
    const targetUser = await ctx.db.get(args.targetUserId);
    if (targetUser?.defaultOrgId === args.organizationId) {
      const organization = await ctx.db.get(args.organizationId);
      if (organization?.isPersonalWorkspace) {
        throw new Error("Cannot remove user from their personal workspace");
      }
    }

    // Soft delete membership
    await ctx.db.patch(targetMembership._id, {
      isActive: false,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "member.remove",
      resource: "membership",
      resourceId: args.targetUserId,
      metadata: {
        removedRole: targetMembership.role,
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      message: "Member removed successfully",
    };
  },
});

// Leave organization (user removes themselves)
export const leaveOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You are not a member of this organization");
    }

    // Can't leave if you're the only owner
    if (membership.role === "owner") {
      const otherOwners = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_and_role", (q) =>
          q.eq("organizationId", args.organizationId).eq("role", "owner")
        )
        .filter((q) => 
          q.and(
            q.eq(q.field("isActive"), true),
            q.neq(q.field("userId"), args.userId)
          )
        )
        .collect();

      if (otherOwners.length === 0) {
        throw new Error("Cannot leave organization: You are the only owner");
      }
    }

    // Can't leave personal workspace
    const user = await ctx.db.get(args.userId);
    if (user?.defaultOrgId === args.organizationId) {
      const organization = await ctx.db.get(args.organizationId);
      if (organization?.isPersonalWorkspace) {
        throw new Error("Cannot leave your personal workspace");
      }
    }

    // Soft delete membership
    await ctx.db.patch(membership._id, {
      isActive: false,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "member.leave",
      resource: "membership",
      resourceId: args.userId,
      metadata: {
        previousRole: membership.role,
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      message: "Successfully left organization",
    };
  },
});