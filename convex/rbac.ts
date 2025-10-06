import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";

/**
 * RBAC (Role-Based Access Control) System
 *
 * This module implements a comprehensive, multi-vertical RBAC system with:
 * - Hierarchical roles (super_admin > org_owner > business_manager > employee > viewer)
 * - Granular permissions by resource and action
 * - Per-organization role assignments via organizationMembers
 * - Global super admin bypass via users.global_role_id
 * - SOC2-compliant audit logging
 * - Support for vertical-specific extensions (invoicing, project management, events, HR)
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * Base role definitions for the multi-vertical platform
 * These roles are hierarchical and work across all business verticals
 */
export const BASE_ROLES = [
  {
    name: 'super_admin',
    description: 'Global system administrator with complete platform access',
    isActive: true,
    hierarchy: 0, // Highest level
  },
  {
    name: 'org_owner',
    description: 'Organization owner with full control including billing and team management',
    isActive: true,
    hierarchy: 1,
  },
  {
    name: 'business_manager',
    description: 'Manages operations and teams (project manager, event coordinator, etc.)',
    isActive: true,
    hierarchy: 2,
  },
  {
    name: 'employee',
    description: 'Executes day-to-day tasks and operations',
    isActive: true,
    hierarchy: 3,
  },
  {
    name: 'viewer',
    description: 'Read-only access for audits, reviews, and approvals',
    isActive: true,
    hierarchy: 4, // Lowest level
  },
] as const;

/**
 * Permission categories for organizing related permissions
 */
export const PERMISSION_CATEGORIES = {
  ORG_MANAGEMENT: 'org_management',
  USER_MANAGEMENT: 'user_management',
  FINANCIALS: 'financials',
  OPERATIONS: 'operations',
  REPORTING: 'reporting',
  APP_MANAGEMENT: 'app_management',
  VERTICAL_SPECIFIC: 'vertical_specific',
} as const;

/**
 * Base permissions that work across all business verticals
 * Resource-action pairs for granular access control
 */
export const BASE_PERMISSIONS = [
  // Organization Management
  {
    name: 'manage_organization',
    resource: 'organizations',
    action: 'write',
    category: PERMISSION_CATEGORIES.ORG_MANAGEMENT,
    description: 'Create, update, and delete organization settings'
  },
  {
    name: 'view_organization',
    resource: 'organizations',
    action: 'read',
    category: PERMISSION_CATEGORIES.ORG_MANAGEMENT,
    description: 'View organization details and settings'
  },

  // User/Team Management
  {
    name: 'manage_users',
    resource: 'users',
    action: 'write',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Invite, remove, and assign roles to users'
  },
  {
    name: 'view_users',
    resource: 'users',
    action: 'read',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'View team members and their roles'
  },
  {
    name: 'update_profile',
    resource: 'users',
    action: 'write_self',
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
    description: 'Update own user profile'
  },

  // Financial Management
  {
    name: 'manage_financials',
    resource: 'purchases',
    action: 'write',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Manage billing, subscriptions, and financial settings'
  },
  {
    name: 'create_invoice',
    resource: 'invoices',
    action: 'write',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Create and generate invoices'
  },
  {
    name: 'approve_invoice',
    resource: 'invoices',
    action: 'approve',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'Approve and sign off on invoices'
  },
  {
    name: 'view_financials',
    resource: 'purchases',
    action: 'read',
    category: PERMISSION_CATEGORIES.FINANCIALS,
    description: 'View financial reports and billing information'
  },

  // Operations Management
  {
    name: 'manage_operations',
    resource: 'operations',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Full CRUD on tasks, projects, and events'
  },
  {
    name: 'create_task',
    resource: 'tasks',
    action: 'write',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Create new tasks, projects, or event items'
  },
  {
    name: 'assign_task',
    resource: 'tasks',
    action: 'assign',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Delegate tasks to team members'
  },
  {
    name: 'execute_task',
    resource: 'tasks',
    action: 'update',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'Complete and update assigned tasks'
  },
  {
    name: 'view_operations',
    resource: 'operations',
    action: 'read',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    description: 'View tasks, projects, and operational data'
  },

  // Reporting and Analytics
  {
    name: 'create_report',
    resource: 'reports',
    action: 'write',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Generate custom reports and analytics'
  },
  {
    name: 'view_reports',
    resource: 'reports',
    action: 'read',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Access dashboards and reports'
  },
  {
    name: 'export_data',
    resource: 'reports',
    action: 'export',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'Download and export data'
  },
  {
    name: 'view_audit_logs',
    resource: 'auditLogs',
    action: 'read',
    category: PERMISSION_CATEGORIES.REPORTING,
    description: 'View audit trail and security logs'
  },

  // App Management
  {
    name: 'install_apps',
    resource: 'appInstallations',
    action: 'write',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'Install and configure apps from the app store'
  },
  {
    name: 'manage_apps',
    resource: 'appInstallations',
    action: 'manage',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'Configure and manage installed apps'
  },
  {
    name: 'view_apps',
    resource: 'appInstallations',
    action: 'read',
    category: PERMISSION_CATEGORIES.APP_MANAGEMENT,
    description: 'View installed apps and their configurations'
  },
] as const;

/**
 * Role-permission mappings defining what each role can do
 * Hierarchical inheritance is implemented in the seeding logic
 */
export const ROLE_PERMISSION_MAPPINGS: Record<string, string[]> = {
  'super_admin': ['*'], // All permissions via wildcard

  'org_owner': [
    'manage_organization',
    'manage_users',
    'manage_financials',
    'manage_operations',
    'create_invoice',
    'approve_invoice',
    'create_report',
    'export_data',
    'install_apps',
    'manage_apps',
    'view_audit_logs',
    'view_*', // All view permissions
  ],

  'business_manager': [
    'manage_users', // Limited to team management
    'manage_operations',
    'create_task',
    'assign_task',
    'execute_task',
    'create_invoice', // Can create but not approve
    'create_report',
    'install_apps',
    'manage_apps',
    'view_*', // All view permissions
  ],

  'employee': [
    'update_profile',
    'execute_task',
    'create_task', // Can create their own tasks
    'view_organization',
    'view_users',
    'view_operations',
    'view_apps',
    'view_reports',
  ],

  'viewer': [
    'view_organization',
    'view_users',
    'view_operations',
    'view_financials',
    'view_reports',
    'view_apps',
  ],
};

/**
 * Vertical-specific permission extensions
 * These are added when specific business verticals are activated
 */
export const VERTICAL_PERMISSIONS = {
  invoicing: [
    { name: 'manage_payment_terms', resource: 'invoices', action: 'configure' },
    { name: 'send_reminders', resource: 'invoices', action: 'notify' },
  ],
  project_management: [
    { name: 'manage_milestones', resource: 'projects', action: 'write' },
    { name: 'track_time', resource: 'timesheets', action: 'write' },
  ],
  events: [
    { name: 'book_venue', resource: 'events', action: 'book' },
    { name: 'manage_vendors', resource: 'events', action: 'coordinate' },
  ],
  hr_employee: [
    { name: 'manage_payroll', resource: 'employees', action: 'payroll' },
    { name: 'view_performance', resource: 'employees', action: 'review' },
  ],
} as const;

// ============================================================================
// SEEDING & INITIALIZATION
// ============================================================================

/**
 * Seed the RBAC system with base roles and permissions
 * Idempotent: Can be run multiple times safely
 */
export const seedRBAC = mutation({
  args: {
    includeVertical: v.optional(v.union(
      v.literal('invoicing'),
      v.literal('project_management'),
      v.literal('events'),
      v.literal('hr_employee')
    )),
  },
  handler: async (ctx, { includeVertical }) => {
    // Check if already seeded
    const existingSuper = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "super_admin"))
      .first();

    if (existingSuper) {
      return {
        message: "RBAC already seeded",
        skipped: true,
        rolesCount: 0,
        permissionsCount: 0,
      };
    }

    const now = Date.now();
    const roleIds: Record<string, Id<"roles">> = {};
    const permissionIds: Record<string, Id<"permissions">> = {};

    // Insert base permissions
    let permissionCount = 0;
    for (const perm of BASE_PERMISSIONS) {
      const permId = await ctx.db.insert("permissions", {
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        createdAt: now,
      });
      permissionIds[perm.name] = permId;
      permissionCount++;
    }

    // Insert vertical-specific permissions if requested
    if (includeVertical) {
      const verticalPerms = VERTICAL_PERMISSIONS[includeVertical];
      for (const perm of verticalPerms) {
        const permId = await ctx.db.insert("permissions", {
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          description: `${includeVertical}: ${perm.name}`,
          createdAt: now,
        });
        permissionIds[perm.name] = permId;
        permissionCount++;
      }
    }

    // Insert roles
    let roleCount = 0;
    for (const role of BASE_ROLES) {
      const roleId = await ctx.db.insert("roles", {
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        createdAt: now,
        updatedAt: now,
      });
      roleIds[role.name] = roleId;
      roleCount++;
    }

    // Map permissions to roles
    for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAPPINGS)) {
      const roleId = roleIds[roleName];
      if (!roleId) continue;

      for (const permName of permNames) {
        if (permName === '*') {
          // Grant all permissions to super_admin
          for (const permId of Object.values(permissionIds)) {
            await ctx.db.insert("rolePermissions", {
              roleId,
              permissionId: permId,
              createdAt: now,
            });
          }
        } else if (permName.endsWith('*')) {
          // Wildcard matching (e.g., 'view_*')
          const prefix = permName.replace('*', '');
          for (const [pName, pId] of Object.entries(permissionIds)) {
            if (pName.startsWith(prefix)) {
              await ctx.db.insert("rolePermissions", {
                roleId,
                permissionId: pId,
                createdAt: now,
              });
            }
          }
        } else {
          // Direct permission mapping
          const permId = permissionIds[permName];
          if (permId) {
            await ctx.db.insert("rolePermissions", {
              roleId,
              permissionId: permId,
              createdAt: now,
            });
          }
        }
      }
    }

    return {
      message: "RBAC seeded successfully",
      skipped: false,
      rolesCount: roleCount,
      permissionsCount: permissionCount,
    };
  },
});

// ============================================================================
// CONTEXT RESOLUTION
// ============================================================================

/**
 * Get the user's effective context (role and organization)
 * Handles super admin bypass via global_role_id
 */
export const getUserContext = internalQuery({
  args: {
    userId: v.id("users"),
    orgId: v.optional(v.id("organizations"))
  },
  handler: async (ctx, { userId, orgId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check for global super admin role
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === 'super_admin') {
        return {
          userId,
          orgId: null,
          roleId: user.global_role_id,
          roleName: globalRole.name,
          isGlobal: true,
        };
      }
    }

    // Require organization for non-global users
    if (!orgId) {
      throw new Error("Organization required for non-global users");
    }

    // Get user's membership in the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", orgId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership) {
      throw new Error("Access denied: No active membership in organization");
    }

    const role = await ctx.db.get(membership.role);
    if (!role || !role.isActive) {
      throw new Error("Access denied: Invalid or inactive role");
    }

    return {
      userId,
      orgId,
      roleId: membership.role,
      roleName: role.name,
      isGlobal: false,
    };
  },
});

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if a role has a specific permission
 * Supports wildcard permissions and resource filtering
 */
export const hasPermission = internalQuery({
  args: {
    roleId: v.id("roles"),
    permName: v.string(),
    resource: v.optional(v.string()),
  },
  handler: async (ctx, { roleId, permName, resource }) => {
    const role = await ctx.db.get(roleId);
    if (!role || !role.isActive) {
      return false;
    }

    // Super admin always has all permissions
    if (role.name === 'super_admin') {
      return true;
    }

    // Look up the specific permission
    const permission = await ctx.db
      .query("permissions")
      .withIndex("by_name", (q) => q.eq("name", permName))
      .first();

    if (!permission) {
      return false;
    }

    // Check resource match if specified
    if (resource && permission.resource !== resource) {
      return false;
    }

    // Check direct role-permission mapping
    const directMapping = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", roleId).eq("permissionId", permission._id)
      )
      .first();

    if (directMapping) {
      return true;
    }

    // Check for wildcard permissions
    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", roleId))
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
        if (permName.startsWith(prefix)) {
          return true;
        }
      }
    }

    return false;
  },
});

/**
 * Check multiple permissions at once (batch operation)
 */
export const hasPermissions = internalQuery({
  args: {
    roleId: v.id("roles"),
    permissions: v.array(v.object({
      name: v.string(),
      resource: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { roleId, permissions }) => {
    const results: Record<string, boolean> = {};

    // Check permissions directly instead of calling internal function
    const role = await ctx.db.get(roleId);
    if (!role || !role.isActive) {
      for (const perm of permissions) {
        results[perm.name] = false;
      }
      return results;
    }

    // Super admin always has all permissions
    if (role.name === 'super_admin') {
      for (const perm of permissions) {
        results[perm.name] = true;
      }
      return results;
    }

    // Check each permission
    for (const perm of permissions) {
      const permission = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", perm.name))
        .first();

      if (!permission || (perm.resource && permission.resource !== perm.resource)) {
        results[perm.name] = false;
        continue;
      }

      // Check direct mapping
      const directMapping = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role_permission", (q) =>
          q.eq("roleId", roleId).eq("permissionId", permission._id)
        )
        .first();

      results[perm.name] = !!directMapping;
    }

    return results;
  },
});

// Backward compatibility - keep the old checkPermission function
export const checkPermission = query({
  args: {
    userId: v.id("users"),
    resource: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to get user's global role first
    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Check global role
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role && role.isActive && role.name === 'super_admin') {
        return true;
      }
    }

    // Check org-specific role (use default org if available)
    if (user.defaultOrgId) {
      // Get user's membership in the organization
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", args.userId).eq("organizationId", user.defaultOrgId!)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (membership) {
        const role = await ctx.db.get(membership.role);
        if (role && role.isActive) {
          // Construct permission name from resource and action
          const permName = `${args.action}_${args.resource}`;

          // Look up the permission
          const permission = await ctx.db
            .query("permissions")
            .withIndex("by_name", (q) => q.eq("name", permName))
            .first();

          if (permission && permission.resource === args.resource) {
            // Check role-permission mapping
            const hasMapping = await ctx.db
              .query("rolePermissions")
              .withIndex("by_role_permission", (q) =>
                q.eq("roleId", membership.role).eq("permissionId", permission._id)
              )
              .first();

            if (hasMapping) return true;
          }
        }
      }
    }

    return false;
  },
});

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an action to the audit trail
 * Used for SOC2 compliance and security monitoring
 */
export const logAudit = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For global actions, we need to provide a valid organizationId
    // We'll use the user's default org or create a system org reference
    let orgId = args.organizationId;

    if (!orgId) {
      const user = await ctx.db.get(args.userId);
      if (user && user.defaultOrgId) {
        orgId = user.defaultOrgId;
      } else {
        // For truly global actions, we need a system organization
        // For now, we'll skip the audit log if no org is available
        // In production, you'd want a dedicated "system" organization
        console.warn("Skipping audit log for global action without organization");
        return;
      }
    }

    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      organizationId: orgId,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      success: args.success,
      errorMessage: args.errorMessage,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

/**
 * Query audit logs with filters
 */
export const getAuditLogs = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
    fromTime: v.optional(v.number()),
    toTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get results based on filters
    let results;

    if (args.organizationId && args.action) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_org_and_action", (q) =>
          q.eq("organizationId", args.organizationId!).eq("action", args.action!)
        )
        .collect();
    } else if (args.organizationId && args.resource) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_org_and_resource", (q) =>
          q.eq("organizationId", args.organizationId!).eq("resource", args.resource!)
        )
        .collect();
    } else if (args.organizationId) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .collect();
    } else if (args.userId) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_user", (q) =>
          q.eq("userId", args.userId!)
        )
        .collect();
    } else {
      // No filters - get all (be careful with this in production)
      results = await ctx.db
        .query("auditLogs")
        .collect();
    }

    // Apply time filters

    if (args.fromTime) {
      results = results.filter(log => log.createdAt >= args.fromTime!);
    }
    if (args.toTime) {
      results = results.filter(log => log.createdAt <= args.toTime!);
    }

    // Apply limit
    if (args.limit) {
      results = results.slice(0, args.limit);
    }

    return results;
  },
});

// ============================================================================
// ROLE & PERMISSION MANAGEMENT
// ============================================================================

/**
 * Get all organizations (for seeding scripts)
 */
export const getOrganizations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get all roles in the system
 */
export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get all permissions in the system
 */
export const getPermissions = query({
  args: {
    resource: v.optional(v.string()),
  },
  handler: async (ctx, { resource }) => {
    if (resource) {
      return await ctx.db
        .query("permissions")
        .withIndex("by_resource", (q) => q.eq("resource", resource))
        .collect();
    }

    return await ctx.db.query("permissions").collect();
  },
});

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = query({
  args: {
    roleId: v.id("roles"),
  },
  handler: async (ctx, { roleId }) => {
    const mappings = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", roleId))
      .collect();

    const permissions = await Promise.all(
      mappings.map(async (mapping) => {
        const permission = await ctx.db.get(mapping.permissionId);
        return permission;
      })
    );

    return permissions.filter(Boolean);
  },
});

/**
 * Get all role-permission mappings for the entire system
 * Returns a map of roleId -> permissions array
 */
export const getAllRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    // Get all role-permission mappings
    const allMappings = await ctx.db.query("rolePermissions").collect();

    // Group by role
    const mappingsByRole: Record<string, string[]> = {};
    for (const mapping of allMappings) {
      const roleId = mapping.roleId;
      if (!mappingsByRole[roleId]) {
        mappingsByRole[roleId] = [];
      }
      mappingsByRole[roleId].push(mapping.permissionId);
    }

    // Fetch all permissions for each role
    const result: Record<string, (Doc<"permissions"> | null)[]> = {};
    for (const [roleId, permissionIds] of Object.entries(mappingsByRole)) {
      const permissions = await Promise.all(
        permissionIds.map(id => ctx.db.get(id as Id<"permissions">))
      );
      result[roleId] = permissions.filter(p => p !== null);
    }

    return result;
  },
});

/**
 * Assign a role to a user in an organization
 */
export const assignRoleToOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    assignedBy: v.id("users"),
  },
  handler: async (ctx, { userId, organizationId, roleId, assignedBy }) => {
    // Check if membership exists
    const existing = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userId).eq("organizationId", organizationId)
      )
      .first();

    if (existing) {
      // Update existing membership
      await ctx.db.patch(existing._id, {
        role: roleId,
        isActive: true,
      });
    } else {
      // Create new membership
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId,
        role: roleId,
        isActive: true,
        joinedAt: Date.now(),
        invitedBy: assignedBy,
        invitedAt: Date.now(),
        acceptedAt: Date.now(),
      });
    }

    // Log the role assignment directly (avoid internal function call)
    // In production, you would want to use a proper internal API
    await ctx.db.insert("auditLogs", {
      userId: assignedBy,
      organizationId,
      action: 'assign_role',
      resource: 'organizationMembers',
      resourceId: userId,
      success: true,
      metadata: { roleId, targetUserId: userId },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// VERTICAL EXTENSIONS
// ============================================================================

/**
 * Add vertical-specific permissions to the system
 */
export const addVerticalPermissions = mutation({
  args: {
    vertical: v.union(
      v.literal('invoicing'),
      v.literal('project_management'),
      v.literal('events'),
      v.literal('hr_employee')
    ),
  },
  handler: async (ctx, { vertical }) => {
    const permissions = VERTICAL_PERMISSIONS[vertical];
    const now = Date.now();
    let count = 0;

    for (const perm of permissions) {
      // Check if permission already exists
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", perm.name))
        .first();

      if (!existing) {
        await ctx.db.insert("permissions", {
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          description: `${vertical}: ${perm.name}`,
          createdAt: now,
        });
        count++;
      }
    }

    return {
      message: `Added ${count} permissions for ${vertical}`,
      permissionsAdded: count,
    };
  },
});

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

// Get all permissions for a user (legacy)
export const getUserPermissions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    // Try to get permissions via org membership first
    if (user.defaultOrgId) {
      try {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_user_and_org", (q) =>
            q.eq("userId", args.userId).eq("organizationId", user.defaultOrgId!)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        if (membership) {
          // Get role permissions directly
          const mappings = await ctx.db
            .query("rolePermissions")
            .withIndex("by_role", (q) => q.eq("roleId", membership.role))
            .collect();

          const permissions = await Promise.all(
            mappings.map(async (mapping) => {
              const permission = await ctx.db.get(mapping.permissionId);
              return permission;
            })
          );

          return permissions.filter(Boolean);
        }
      } catch {
        // Fall through
      }
    }

    return [];
  },
});

// Get user's role (legacy)
export const getUserRole = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Try org membership first
    if (user.defaultOrgId) {
      try {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_user_and_org", (q) =>
            q.eq("userId", args.userId).eq("organizationId", user.defaultOrgId!)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        if (membership) {
          const role = await ctx.db.get(membership.role);
          if (role) {
            return {
              id: role._id,
              name: role.name,
              description: role.description,
            };
          }
        }
      } catch {
        // Fall through
      }
    }

    return null;
  },
});

// Check if user is super admin (convenience function)
export const isSuperAdmin = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) return false;

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) return false;

    const user = await ctx.db.get(session.userId);
    if (!user) return false;

    // Check global role
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      return role?.name === "super_admin";
    }

    return false;
  },
});

