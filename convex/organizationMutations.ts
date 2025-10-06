import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Helper to check if a role has a specific permission
 * Super admins and org owners have all organization permissions
 */
async function hasOrgPermission(
  role: { name: string },
  permissionName: string
): Promise<boolean> {
  // Super admins and org owners always have organization permissions
  if (role.name === "super_admin" || role.name === "org_owner") {
    return true;
  }

  // For business_manager, check specific permissions
  if (role.name === "business_manager") {
    // Business managers can manage users but not organization settings
    if (permissionName === "manage_users") {
      return true;
    }
    if (permissionName === "manage_organization") {
      return false; // Only owners can change org settings
    }
  }

  // Employees and viewers don't have management permissions
  return false;
}

/**
 * Update organization details
 * Requires org_owner or super_admin role
 */
export const updateOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    updates: v.object({
      // Basic Information
      name: v.optional(v.string()),
      businessName: v.optional(v.string()),
      slug: v.optional(v.string()),
      industry: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      employeeCount: v.optional(v.string()),
      bio: v.optional(v.string()),

      // Contact Information
      contactEmail: v.optional(v.string()),
      billingEmail: v.optional(v.string()),
      supportEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      faxNumber: v.optional(v.string()),
      website: v.optional(v.string()),
      socialMedia: v.optional(v.object({
        linkedin: v.optional(v.string()),
        twitter: v.optional(v.string()),
        facebook: v.optional(v.string()),
        instagram: v.optional(v.string()),
      })),

      // Legal & Tax
      taxId: v.optional(v.string()),
      vatNumber: v.optional(v.string()),
      companyRegistrationNumber: v.optional(v.string()),
      legalEntityType: v.optional(v.string()),

      // Settings
      settings: v.optional(v.object({
        branding: v.optional(v.object({
          primaryColor: v.optional(v.string()),
          logo: v.optional(v.string()),
        })),
        locale: v.optional(v.object({
          language: v.optional(v.string()),
          currency: v.optional(v.string()),
          timezone: v.optional(v.string()),
        })),
        invoicing: v.optional(v.object({
          prefix: v.optional(v.string()),
          nextNumber: v.optional(v.number()),
          defaultTerms: v.optional(v.string()),
        })),
        features: v.optional(v.object({
          customDomain: v.optional(v.boolean()),
          sso: v.optional(v.boolean()),
          apiAccess: v.optional(v.boolean()),
        })),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Get session and verify
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    // Get user's membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", session.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("Not a member of this organization");
    }

    // Get role and check permissions
    const role = await ctx.db.get(membership.role);
    if (!role) {
      throw new Error("Role not found");
    }

    // Only super_admin and org_owner can update organization settings
    if (role.name !== "super_admin" && role.name !== "org_owner") {
      throw new Error("You don't have permission to update organization settings");
    }

    // Update organization with updatedAt timestamp
    await ctx.db.patch(args.organizationId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update a user's role in an organization
 * Requires manage_users permission (org_owner, super_admin, or business_manager)
 */
export const updateUserRole = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    // Get session and verify
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    // Get current user's membership
    const currentUserMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", session.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!currentUserMembership || !currentUserMembership.isActive) {
      throw new Error("Not a member of this organization");
    }

    // Get current user's role
    const currentUserRole = await ctx.db.get(currentUserMembership.role);
    if (!currentUserRole) {
      throw new Error("Role not found");
    }

    // Check if current user has manage_users permission
    const canManageUsers = await hasOrgPermission(currentUserRole, "manage_users");
    if (!canManageUsers) {
      throw new Error("You don't have permission to manage users");
    }

    // Get target user's membership
    const targetUserMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!targetUserMembership) {
      throw new Error("User is not a member of this organization");
    }

    // Get the new role to validate it exists
    const newRole = await ctx.db.get(args.roleId);
    if (!newRole) {
      throw new Error("Invalid role");
    }

    // Get the target user's current role
    const targetCurrentRole = await ctx.db.get(targetUserMembership.role);
    if (!targetCurrentRole) {
      throw new Error("Target user's role not found");
    }

    // Permission rules for role changes:
    // 1. Only super_admin can assign/remove super_admin role
    if ((newRole.name === "super_admin" || targetCurrentRole.name === "super_admin")
        && currentUserRole.name !== "super_admin") {
      throw new Error("Only super admins can assign or remove super admin role");
    }

    // 2. Only super_admin and org_owner can assign/remove org_owner role
    if ((newRole.name === "org_owner" || targetCurrentRole.name === "org_owner")
        && currentUserRole.name !== "super_admin" && currentUserRole.name !== "org_owner") {
      throw new Error("Only super admins and organization owners can assign or remove owner role");
    }

    // 3. Business managers can only assign employee and viewer roles
    if (currentUserRole.name === "business_manager") {
      if (newRole.name !== "employee" && newRole.name !== "viewer") {
        throw new Error("Business managers can only assign employee or viewer roles");
      }
    }

    // 4. Users cannot change their own role unless they're super_admin
    if (args.userId === session.userId && currentUserRole.name !== "super_admin") {
      throw new Error("You cannot change your own role");
    }

    // Update the user's role
    await ctx.db.patch(targetUserMembership._id, {
      role: args.roleId,
    });

    return { success: true };
  },
});

/**
 * Remove a user from an organization (soft delete)
 * Requires manage_users permission
 */
export const removeUserFromOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get session and verify
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    // Get current user's membership
    const currentUserMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", session.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!currentUserMembership || !currentUserMembership.isActive) {
      throw new Error("Not a member of this organization");
    }

    // Get current user's role
    const currentUserRole = await ctx.db.get(currentUserMembership.role);
    if (!currentUserRole) {
      throw new Error("Role not found");
    }

    // Check if current user has manage_users permission
    const canManageUsers = await hasOrgPermission(currentUserRole, "manage_users");
    if (!canManageUsers) {
      throw new Error("You don't have permission to manage users");
    }

    // Prevent users from removing themselves unless they're super_admin
    if (args.userId === session.userId && currentUserRole.name !== "super_admin") {
      throw new Error("You cannot remove yourself from the organization");
    }

    // Get target user's membership
    const targetUserMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!targetUserMembership) {
      throw new Error("User is not a member of this organization");
    }

    // Get target user's role
    const targetUserRole = await ctx.db.get(targetUserMembership.role);
    if (!targetUserRole) {
      throw new Error("Target user role not found");
    }

    // Only super_admin can remove org_owner
    if (targetUserRole.name === "org_owner" && currentUserRole.name !== "super_admin") {
      throw new Error("Only super admins can remove organization owners");
    }

    // Only super_admin can remove other super_admins
    if (targetUserRole.name === "super_admin" && currentUserRole.name !== "super_admin") {
      throw new Error("Only super admins can remove other super admins");
    }

    // Mark membership as inactive (soft delete)
    await ctx.db.patch(targetUserMembership._id, {
      isActive: false,
    });

    return { success: true };
  },
});

/**
 * Update user profile information
 * Users can update their own profile, or admins can update others
 */
export const updateUserProfile = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      title: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get session and verify
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    // Check if user is updating their own profile
    const isOwnProfile = session.userId === args.userId;

    if (!isOwnProfile) {
      // Check if user has permission to update others
      // We need to check if they have manage_users permission in ANY organization
      // where the target user is a member

      // Get all organizations where the current user has manage_users permission
      const currentUserMemberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      let canEditOthers = false;

      for (const membership of currentUserMemberships) {
        const role = await ctx.db.get(membership.role);
        if (role && (role.name === "super_admin" || role.name === "org_owner" || role.name === "business_manager")) {
          // Check if the target user is in the same organization
          const targetInSameOrg = await ctx.db
            .query("organizationMembers")
            .withIndex("by_user_and_org", (q) =>
              q.eq("userId", args.userId).eq("organizationId", membership.organizationId)
            )
            .first();

          if (targetInSameOrg && targetInSameOrg.isActive) {
            canEditOthers = true;
            break;
          }
        }
      }

      if (!canEditOthers) {
        throw new Error("You can only update your own profile or profiles of users in your organization");
      }
    }

    // Update user profile
    await ctx.db.patch(args.userId, args.updates);

    return { success: true };
  },
});