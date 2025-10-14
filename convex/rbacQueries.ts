/**
 * RBAC Query and Mutation API for Testing
 *
 * This module provides simplified, test-friendly wrappers around the core RBAC system.
 * It exports public query and mutation functions that can be called from tests and client code.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Check if a user has a specific permission
 *
 * Simplified wrapper for testing that uses permission name directly
 * Permission names follow the format: "resource.action" or use wildcards "*"
 */
export const hasPermission = query({
  args: {
    userId: v.optional(v.string()),
    permission: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, permission, organizationId }) => {
    try {
      // Validate required fields
      if (!userId) return false;
      if (userId.length < 10) return false;

      // Type cast after validation
      const userIdTyped = userId as Id<"users">;
      const orgIdTyped = organizationId && organizationId.length >= 10 ? organizationId as Id<"organizations"> : undefined;

      // Get user
      const user = await ctx.db.get(userIdTyped);
      if (!user) return false;

      // Check for global super admin role first
      if (user.global_role_id) {
        const globalRole = await ctx.db.get(user.global_role_id);
        if (globalRole && globalRole.name === 'super_admin') {
          return true;
        }
      }

      // Get organization ID (use default if not provided)
      const orgId = orgIdTyped || user.defaultOrgId;
      if (!orgId) return false;

      // Get user's membership in the organization
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userIdTyped).eq("organizationId", orgId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (!membership) return false;

      // Get role
      const role = await ctx.db.get(membership.role);
      if (!role || !role.isActive) return false;

      // Super admin always has all permissions
      if (role.name === 'super_admin') {
        return true;
      }

      // Handle wildcard permission check
      if (permission === '*' || permission === '*.*') {
        // Only super admin has all permissions
        return false;
      }

      // Look up the specific permission
      const permissionDoc = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", permission))
        .first();

      if (!permissionDoc) return false;

      // Check direct role-permission mapping
      const directMapping = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role_permission", (q) =>
          q.eq("roleId", membership.role).eq("permissionId", permissionDoc._id)
        )
        .first();

      if (directMapping) return true;

      // Check for wildcard permissions in role
      const rolePermissions = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("roleId", membership.role))
        .collect();

      for (const rp of rolePermissions) {
        const perm = await ctx.db.get(rp.permissionId);
        if (!perm) continue;

        // Check for wildcard match
        if (perm.name === '*') {
          return true;
        }

        // Check for prefix wildcard (e.g., 'view_*')
        if (perm.name.endsWith('*')) {
          const prefix = perm.name.replace('*', '');
          if (permission.startsWith(prefix)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  },
});

/**
 * Get all permissions for a user (returns permission names as strings)
 *
 * Returns an array of permission name strings (e.g., ["view_users", "manage_organization"])
 */
export const getUserPermissions = query({
  args: {
    userId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, organizationId }) => {
    try {
      // Validate required fields
      if (!userId) return [];
      if (userId.length < 10) return [];

      // Type cast after validation
      const userIdTyped = userId as Id<"users">;
      const orgIdTyped = organizationId && organizationId.length >= 10 ? organizationId as Id<"organizations"> : undefined;

      const user = await ctx.db.get(userIdTyped);
      if (!user) return [];

      // Check for global super admin
      if (user.global_role_id) {
        const globalRole = await ctx.db.get(user.global_role_id);
        if (globalRole && globalRole.name === 'super_admin') {
          // Return all permissions
          const allPerms = await ctx.db.query("permissions").collect();
          return allPerms.map(p => p.name);
        }
      }

      // Get organization ID
      const orgId = orgIdTyped || user.defaultOrgId;
      if (!orgId) return [];

      // Get user's membership
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userIdTyped).eq("organizationId", orgId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (!membership) return [];

      // Get role
      const role = await ctx.db.get(membership.role);
      if (!role || !role.isActive) return [];

      // Super admin has all permissions
      if (role.name === 'super_admin') {
        const allPerms = await ctx.db.query("permissions").collect();
        return allPerms.map(p => p.name);
      }

      // Get role permissions
      const mappings = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("roleId", membership.role))
        .collect();

      const permissionNames: string[] = [];
      const wildcardPerms: string[] = [];

      for (const mapping of mappings) {
        const permission = await ctx.db.get(mapping.permissionId);
        if (permission) {
          if (permission.name === '*') {
            // Has all permissions
            const allPerms = await ctx.db.query("permissions").collect();
            return allPerms.map(p => p.name);
          } else if (permission.name.endsWith('*')) {
            wildcardPerms.push(permission.name);
          } else {
            permissionNames.push(permission.name);
          }
        }
      }

      // Expand wildcards
      if (wildcardPerms.length > 0) {
        const allPerms = await ctx.db.query("permissions").collect();
        for (const wildcard of wildcardPerms) {
          const prefix = wildcard.replace('*', '');
          for (const perm of allPerms) {
            if (perm.name.startsWith(prefix) && !permissionNames.includes(perm.name)) {
              permissionNames.push(perm.name);
            }
          }
        }
      }

      return permissionNames;
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return [];
    }
  },
});

/**
 * Assign a role to a user in an organization
 */
export const assignRole = mutation({
  args: {
    userId: v.optional(v.string()),
    roleId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    assignedBy: v.optional(v.string()),
  },
  handler: async (ctx, { userId, roleId, organizationId, assignedBy }) => {
    try {
      // Manual validation for required fields
      if (!userId) {
        return { success: false, error: "Benutzer-ID ist erforderlich" };
      }
      if (!roleId) {
        return { success: false, error: "Rollen-ID ist erforderlich" };
      }
      if (!organizationId) {
        return { success: false, error: "Organisations-ID ist erforderlich" };
      }
      if (!assignedBy) {
        return { success: false, error: "Zuweiser-ID ist erforderlich" };
      }

      // Validate ID formats (Convex IDs are non-empty strings with specific patterns)
      if (userId.length < 10) {
        return { success: false, error: "Ungültiges Benutzer-ID-Format" };
      }
      if (roleId.length < 10) {
        return { success: false, error: "Ungültiges Rollen-ID-Format" };
      }
      if (organizationId.length < 10) {
        return { success: false, error: "Ungültiges Organisations-ID-Format" };
      }
      if (assignedBy.length < 10) {
        return { success: false, error: "Ungültiges Zuweiser-ID-Format" };
      }

      // Type cast after validation
      const userIdTyped = userId as Id<"users">;
      const roleIdTyped = roleId as Id<"roles">;
      const orgIdTyped = organizationId as Id<"organizations">;
      const assignedByTyped = assignedBy as Id<"users">;

      // Verify user exists
      const user = await ctx.db.get(userIdTyped);
      if (!user) {
        return { success: false, error: "Benutzer nicht gefunden" };
      }

      // Verify role exists and is active
      const role = await ctx.db.get(roleIdTyped);
      if (!role) {
        return { success: false, error: "Rolle nicht gefunden" };
      }
      if (!role.isActive) {
        return { success: false, error: "Rolle ist inaktiv" };
      }

      // Verify organization exists
      const org = await ctx.db.get(orgIdTyped);
      if (!org) {
        return { success: false, error: "Organisation nicht gefunden" };
      }

      // Verify assigner exists
      const assigner = await ctx.db.get(assignedByTyped);
      if (!assigner) {
        return { success: false, error: "Zuweiser nicht gefunden" };
      }

      // Check if membership exists
      const existing = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userIdTyped).eq("organizationId", orgIdTyped)
        )
        .first();

      if (existing) {
        // Update existing membership
        await ctx.db.patch(existing._id, {
          role: roleIdTyped,
          isActive: true,
        });
      } else {
        // Create new membership
        await ctx.db.insert("organizationMembers", {
          userId: userIdTyped,
          organizationId: orgIdTyped,
          role: roleIdTyped,
          isActive: true,
          joinedAt: Date.now(),
          invitedBy: assignedByTyped,
          invitedAt: Date.now(),
          acceptedAt: Date.now(),
        });
      }

      // Log the role assignment
      await ctx.db.insert("auditLogs", {
        userId: assignedByTyped,
        organizationId: orgIdTyped,
        action: 'assign_role',
        resource: 'organizationMembers',
        resourceId: userIdTyped,
        success: true,
        metadata: { roleId: roleIdTyped, targetUserId: userIdTyped, roleName: role.name },
        createdAt: Date.now(),
      });

      return {
        success: true,
        message: `Rolle ${role.name} dem Benutzer zugewiesen`,
      };
    } catch (error) {
      console.error("Error assigning role:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler aufgetreten",
      };
    }
  },
});

/**
 * Remove a role from a user in an organization
 */
export const removeRole = mutation({
  args: {
    userId: v.optional(v.string()),
    roleId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    removedBy: v.optional(v.string()),
  },
  handler: async (ctx, { userId, roleId, organizationId, removedBy }) => {
    try {
      // Manual validation for required fields
      if (!userId) {
        return { success: false, error: "Benutzer-ID ist erforderlich" };
      }
      if (!roleId) {
        return { success: false, error: "Rollen-ID ist erforderlich" };
      }
      if (!organizationId) {
        return { success: false, error: "Organisations-ID ist erforderlich" };
      }
      if (!removedBy) {
        return { success: false, error: "Entferner-ID ist erforderlich" };
      }

      // Validate ID formats (Convex IDs are non-empty strings with specific patterns)
      if (userId.length < 10) {
        return { success: false, error: "Ungültiges Benutzer-ID-Format" };
      }
      if (roleId.length < 10) {
        return { success: false, error: "Ungültiges Rollen-ID-Format" };
      }
      if (organizationId.length < 10) {
        return { success: false, error: "Ungültiges Organisations-ID-Format" };
      }
      if (removedBy.length < 10) {
        return { success: false, error: "Ungültiges Entferner-ID-Format" };
      }

      // Type cast after validation
      const userIdTyped = userId as Id<"users">;
      const roleIdTyped = roleId as Id<"roles">;
      const orgIdTyped = organizationId as Id<"organizations">;
      const removedByTyped = removedBy as Id<"users">;

      // Find the membership
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userIdTyped).eq("organizationId", orgIdTyped)
        )
        .first();

      if (!membership) {
        return { success: false, error: "Benutzer ist kein Mitglied dieser Organisation" };
      }

      if (membership.role !== roleIdTyped) {
        return { success: false, error: "Benutzer hat diese Rolle nicht" };
      }

      // Get role name for logging
      const role = await ctx.db.get(roleIdTyped);

      // Deactivate the membership
      await ctx.db.patch(membership._id, {
        isActive: false,
      });

      // Log the role removal
      await ctx.db.insert("auditLogs", {
        userId: removedByTyped,
        organizationId: orgIdTyped,
        action: 'remove_role',
        resource: 'organizationMembers',
        resourceId: userIdTyped,
        success: true,
        metadata: { roleId: roleIdTyped, targetUserId: userIdTyped, roleName: role?.name },
        createdAt: Date.now(),
      });

      return {
        success: true,
        message: `Rolle vom Benutzer entfernt`,
      };
    } catch (error) {
      console.error("Error removing role:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler aufgetreten",
      };
    }
  },
});

/**
 * Get user's roles in an organization
 */
export const getUserRoles = query({
  args: {
    userId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, organizationId }) => {
    try {
      // Validate required fields
      if (!userId) return [];
      if (userId.length < 10) return [];

      // Type cast after validation
      const userIdTyped = userId as Id<"users">;
      const orgIdTyped = organizationId && organizationId.length >= 10 ? organizationId as Id<"organizations"> : undefined;

      const user = await ctx.db.get(userIdTyped);
      if (!user) return [];

      const roles: Array<{ id: Id<"roles">; name: string; description: string | undefined }> = [];

      // Check global role
      if (user.global_role_id) {
        const globalRole = await ctx.db.get(user.global_role_id);
        if (globalRole && globalRole.isActive) {
          roles.push({
            id: globalRole._id,
            name: globalRole.name,
            description: globalRole.description,
          });
        }
      }

      // Get organization roles
      const orgId = orgIdTyped || user.defaultOrgId;
      if (orgId) {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_user_and_org", (q) =>
            q.eq("userId", userIdTyped).eq("organizationId", orgId)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        if (membership) {
          const role = await ctx.db.get(membership.role);
          if (role && role.isActive) {
            roles.push({
              id: role._id,
              name: role.name,
              description: role.description,
            });
          }
        }
      }

      return roles;
    } catch (error) {
      console.error("Error getting user roles:", error);
      return [];
    }
  },
});
