import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  requireAuthenticatedUser,
  requirePermission,
  hasHigherOrEqualRole,
} from "./rbacHelpers";

/**
 * Update organization details
 *
 * @permission manage_organization - Required to update organization settings
 * @roles org_owner, super_admin
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
    // ✅ Verify authentication
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ Check permission using RBAC system
    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId,
      errorMessage: "You don't have permission to update organization settings",
    });

    // Update organization with updatedAt timestamp
    await ctx.db.patch(args.organizationId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    // Log success to audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: args.organizationId,
      action: "update_organization",
      resource: "organizations",
      resourceId: args.organizationId,
      success: true,
      metadata: { updatedFields: Object.keys(args.updates) },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update a user's role in an organization
 *
 * @permission manage_users - Required to change user roles
 * @roles org_owner, super_admin, business_manager (limited)
 *
 * Business rules:
 * - Only super_admin can assign/remove super_admin role
 * - Only super_admin and org_owner can assign/remove org_owner role
 * - Business managers can only assign employee and viewer roles
 * - Users cannot change their own role (except super_admin)
 */
export const updateUserRole = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    // ✅ Verify authentication
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ Check base permission using RBAC system
    await requirePermission(ctx, currentUserId, "manage_users", {
      organizationId: args.organizationId,
      errorMessage: "You don't have permission to manage users",
    });

    // Get current user's role for additional business rules
    const currentUserMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", currentUserId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!currentUserMembership) {
      throw new Error("Not a member of this organization");
    }

    const currentUserRole = await ctx.db.get(currentUserMembership.role);
    if (!currentUserRole) {
      throw new Error("Current user role not found");
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

    // Business Rule 1: Only super_admin can assign/remove super_admin role
    if ((newRole.name === "super_admin" || targetCurrentRole.name === "super_admin")
        && currentUserRole.name !== "super_admin") {
      throw new Error("Only super admins can assign or remove super admin role");
    }

    // Business Rule 2: Only super_admin and org_owner can assign/remove org_owner role
    if ((newRole.name === "org_owner" || targetCurrentRole.name === "org_owner")
        && !hasHigherOrEqualRole(currentUserRole.name, "org_owner")) {
      throw new Error("Only super admins and organization owners can assign or remove owner role");
    }

    // Business Rule 3: Business managers can only assign employee and viewer roles
    if (currentUserRole.name === "business_manager") {
      if (newRole.name !== "employee" && newRole.name !== "viewer") {
        throw new Error("Business managers can only assign employee or viewer roles");
      }
    }

    // Business Rule 4: Users cannot change their own role unless they're super_admin
    if (args.userId === currentUserId && currentUserRole.name !== "super_admin") {
      throw new Error("You cannot change your own role");
    }

    // Update the user's role
    await ctx.db.patch(targetUserMembership._id, {
      role: args.roleId,
    });

    // Log success to audit trail
    await ctx.db.insert("auditLogs", {
      userId: currentUserId,
      organizationId: args.organizationId,
      action: "update_user_role",
      resource: "organizationMembers",
      resourceId: args.userId,
      success: true,
      metadata: {
        targetUserId: args.userId,
        oldRoleId: targetCurrentRole._id,
        oldRoleName: targetCurrentRole.name,
        newRoleId: newRole._id,
        newRoleName: newRole.name,
      },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a user from an organization (soft delete)
 *
 * @permission manage_users - Required to remove users
 * @roles org_owner, super_admin, business_manager
 *
 * Business rules:
 * - Users cannot remove themselves (except super_admin)
 * - Only super_admin can remove org_owner
 * - Only super_admin can remove other super_admins
 */
export const removeUserFromOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ✅ Verify authentication
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // ✅ Check permission using RBAC system
    await requirePermission(ctx, currentUserId, "manage_users", {
      organizationId: args.organizationId,
      errorMessage: "You don't have permission to manage users",
    });

    // Get current user's role for business rules
    const currentUserMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", currentUserId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!currentUserMembership) {
      throw new Error("Not a member of this organization");
    }

    const currentUserRole = await ctx.db.get(currentUserMembership.role);
    if (!currentUserRole) {
      throw new Error("Role not found");
    }

    // Business Rule: Prevent users from removing themselves unless they're super_admin
    if (args.userId === currentUserId && currentUserRole.name !== "super_admin") {
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

    // Business Rule: Only super_admin can remove org_owner
    if (targetUserRole.name === "org_owner" && currentUserRole.name !== "super_admin") {
      throw new Error("Only super admins can remove organization owners");
    }

    // Business Rule: Only super_admin can remove other super_admins
    if (targetUserRole.name === "super_admin" && currentUserRole.name !== "super_admin") {
      throw new Error("Only super admins can remove other super admins");
    }

    // Mark membership as inactive (soft delete)
    await ctx.db.patch(targetUserMembership._id, {
      isActive: false,
    });

    // Log success to audit trail
    await ctx.db.insert("auditLogs", {
      userId: currentUserId,
      organizationId: args.organizationId,
      action: "remove_user",
      resource: "organizationMembers",
      resourceId: args.userId,
      success: true,
      metadata: {
        targetUserId: args.userId,
        targetRoleName: targetUserRole.name,
      },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update user profile information
 *
 * @permission update_profile - Users can update their own profile
 * @permission manage_users - Admins can update others' profiles
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
    // ✅ Verify authentication
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if user is updating their own profile
    const isOwnProfile = currentUserId === args.userId;

    if (!isOwnProfile) {
      // Check if user has permission to update others
      // We need to check if they have manage_users permission in ANY organization
      // where the target user is a member

      // Get all organizations where the current user has manage_users permission
      const currentUserMemberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", currentUserId))
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

    // Log success to audit trail
    const user = await ctx.db.get(currentUserId);
    await ctx.db.insert("auditLogs", {
      userId: currentUserId,
      organizationId: user?.defaultOrgId || ("" as Id<"organizations">),
      action: isOwnProfile ? "update_own_profile" : "update_user_profile",
      resource: "users",
      resourceId: args.userId,
      success: true,
      metadata: {
        targetUserId: args.userId,
        updatedFields: Object.keys(args.updates),
      },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});