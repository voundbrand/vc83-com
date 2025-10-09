import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * RBAC Helper Functions for Backend Permission Enforcement
 *
 * These helpers provide a centralized, consistent way to check permissions
 * across all mutations and queries, ensuring frontend and backend stay in sync.
 *
 * Security Layer: These are the actual enforcement points - cannot be bypassed
 * by client-side code or browser DevTools.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthenticatedUser {
  userId: Id<"users">;
  session: {
    _id: Id<"sessions">;
    userId: Id<"users">;
    email: string;
    expiresAt: number;
  };
}

export interface UserContext extends AuthenticatedUser {
  organizationId?: Id<"organizations">;
  roleId?: Id<"roles">;
  roleName?: string;
  isGlobal: boolean;
}

// ============================================================================
// SESSION & AUTHENTICATION
// ============================================================================

/**
 * Verify session and extract authenticated user context
 *
 * @throws Error if session is invalid or expired
 * @returns Authenticated user with session details
 *
 * @example
 * const { userId, session } = await requireAuthenticatedUser(ctx, args.sessionId);
 */
export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  sessionId: string
): Promise<AuthenticatedUser> {
  const session = await ctx.db.get(sessionId as Id<"sessions">);

  if (!session) {
    throw new Error("Invalid session: Session not found");
  }

  if (!session.userId) {
    throw new Error("Invalid session: No user associated with session");
  }

  if (session.expiresAt <= Date.now()) {
    throw new Error("Session expired: Please log in again");
  }

  return {
    userId: session.userId,
    session: {
      _id: session._id,
      userId: session.userId,
      email: session.email,
      expiresAt: session.expiresAt,
    },
  };
}

/**
 * Get user's context including role and organization membership
 *
 * @param ctx Query or Mutation context
 * @param userId User ID
 * @param organizationId Organization ID (optional for super admins)
 * @returns User context with role information
 */
export async function getUserContext(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId?: Id<"organizations">
): Promise<UserContext> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check for global super admin role
  if (user.global_role_id) {
    const globalRole = await ctx.db.get(user.global_role_id);
    if (globalRole && globalRole.name === "super_admin") {
      return {
        userId,
        session: { _id: "" as Id<"sessions">, userId, email: user.email, expiresAt: 0 },
        roleId: user.global_role_id,
        roleName: globalRole.name,
        isGlobal: true,
      };
    }
  }

  // For non-global users, organization is required
  if (!organizationId) {
    // Try to use default org if available
    if (user.defaultOrgId) {
      organizationId = user.defaultOrgId;
    } else {
      throw new Error("Organization required for non-global users");
    }
  }

  // Get user's membership in the organization
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId!)
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
    session: { _id: "" as Id<"sessions">, userId, email: user.email, expiresAt: 0 },
    organizationId,
    roleId: membership.role,
    roleName: role.name,
    isGlobal: false,
  };
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has a specific permission (returns boolean)
 *
 * @param ctx Query or Mutation context
 * @param userId User ID
 * @param permission Permission name (e.g., "manage_organization")
 * @param organizationId Organization context (optional for super admins)
 * @returns true if user has permission, false otherwise
 *
 * @example
 * const canManage = await checkPermission(ctx, userId, "manage_organization", orgId);
 * if (!canManage) {
 *   return { error: "Permission denied" };
 * }
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  permission: string,
  organizationId?: Id<"organizations">
): Promise<boolean> {
  try {
    const userContext = await getUserContext(ctx, userId, organizationId);

    // Super admins always have all permissions
    if (userContext.isGlobal && userContext.roleName === "super_admin") {
      return true;
    }

    if (!userContext.roleId) {
      return false;
    }

    // Check permission via the RBAC system
    const role = await ctx.db.get(userContext.roleId);
    if (!role || !role.isActive) {
      return false;
    }

    // Look up the specific permission
    const permissionDoc = await ctx.db
      .query("permissions")
      .withIndex("by_name", (q) => q.eq("name", permission))
      .first();

    if (!permissionDoc) {
      return false;
    }

    // Check direct role-permission mapping
    const directMapping = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", userContext.roleId!).eq("permissionId", permissionDoc._id)
      )
      .first();

    if (directMapping) {
      return true;
    }

    // Check for wildcard permissions (e.g., "view_*")
    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", userContext.roleId!))
      .collect();

    for (const rp of rolePermissions) {
      const perm = await ctx.db.get(rp.permissionId);
      if (!perm) continue;

      // Check for universal wildcard
      if (perm.name === "*") {
        return true;
      }

      // Check for prefix wildcard (e.g., 'view_*')
      if (perm.name.endsWith("*")) {
        const prefix = perm.name.replace("*", "");
        if (permission.startsWith(prefix)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Require permission - throws error if user doesn't have permission
 *
 * This is the main enforcement function for mutations. It checks permissions
 * and throws a descriptive error if the user doesn't have access.
 *
 * @param ctx Mutation context
 * @param userId User ID
 * @param permission Permission name (e.g., "manage_organization")
 * @param options Additional options (errorMessage, organizationId)
 * @throws Error if user doesn't have permission
 *
 * @example
 * await requirePermission(ctx, userId, "manage_organization", {
 *   organizationId: orgId,
 *   errorMessage: "Only organization owners can update settings"
 * });
 */
export async function requirePermission(
  ctx: MutationCtx,
  userId: Id<"users">,
  permission: string,
  options?: {
    errorMessage?: string;
    organizationId?: Id<"organizations">;
  }
): Promise<void> {
  const hasPermission = await checkPermission(
    ctx,
    userId,
    permission,
    options?.organizationId
  );

  if (!hasPermission) {
    const message =
      options?.errorMessage ||
      `Permission denied: You need '${permission}' permission to perform this action`;

    // Log the permission denial for audit trail
    try {
      const user = await ctx.db.get(userId);
      await ctx.db.insert("auditLogs", {
        userId,
        organizationId: options?.organizationId || user?.defaultOrgId || ("" as Id<"organizations">),
        action: "permission_denied",
        resource: permission,
        success: false,
        errorMessage: message,
        metadata: { attemptedPermission: permission },
        createdAt: Date.now(),
      });
    } catch {
      // Silent fail on audit log - don't block the error
    }

    throw new Error(message);
  }
}

/**
 * Check multiple permissions at once
 *
 * @param ctx Query or Mutation context
 * @param userId User ID
 * @param permissions Array of permission names
 * @param organizationId Organization context
 * @returns Object mapping permission names to boolean values
 *
 * @example
 * const perms = await checkPermissions(ctx, userId, ["manage_users", "manage_organization"], orgId);
 * if (perms.manage_users && perms.manage_organization) {
 *   // User has both permissions
 * }
 */
export async function checkPermissions(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  permissions: string[],
  organizationId?: Id<"organizations">
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const permission of permissions) {
    results[permission] = await checkPermission(
      ctx,
      userId,
      permission,
      organizationId
    );
  }

  return results;
}

/**
 * Require ANY of the specified permissions (OR logic)
 *
 * @param ctx Mutation context
 * @param userId User ID
 * @param permissions Array of permission names (user needs at least one)
 * @param options Additional options
 * @throws Error if user has none of the permissions
 *
 * @example
 * // User needs either manage_users OR manage_organization
 * await requireAnyPermission(ctx, userId, ["manage_users", "manage_organization"], { orgId });
 */
export async function requireAnyPermission(
  ctx: MutationCtx,
  userId: Id<"users">,
  permissions: string[],
  options?: {
    errorMessage?: string;
    organizationId?: Id<"organizations">;
  }
): Promise<void> {
  for (const permission of permissions) {
    const hasPermission = await checkPermission(
      ctx,
      userId,
      permission,
      options?.organizationId
    );
    if (hasPermission) {
      return; // User has at least one permission
    }
  }

  const message =
    options?.errorMessage ||
    `Permission denied: You need one of [${permissions.join(", ")}] permissions`;

  throw new Error(message);
}

/**
 * Require ALL of the specified permissions (AND logic)
 *
 * @param ctx Mutation context
 * @param userId User ID
 * @param permissions Array of permission names (user needs all of them)
 * @param options Additional options
 * @throws Error if user is missing any permission
 *
 * @example
 * // User needs both manage_users AND manage_organization
 * await requireAllPermissions(ctx, userId, ["manage_users", "manage_organization"], { orgId });
 */
export async function requireAllPermissions(
  ctx: MutationCtx,
  userId: Id<"users">,
  permissions: string[],
  options?: {
    errorMessage?: string;
    organizationId?: Id<"organizations">;
  }
): Promise<void> {
  const results = await checkPermissions(
    ctx,
    userId,
    permissions,
    options?.organizationId
  );

  const missingPermissions = permissions.filter((p) => !results[p]);

  if (missingPermissions.length > 0) {
    const message =
      options?.errorMessage ||
      `Permission denied: You need [${missingPermissions.join(", ")}] permissions`;

    throw new Error(message);
  }
}

// ============================================================================
// ORGANIZATION MEMBERSHIP HELPERS
// ============================================================================

/**
 * Check if user is a member of an organization
 *
 * @param ctx Query or Mutation context
 * @param userId User ID
 * @param organizationId Organization ID
 * @returns true if user is an active member
 */
export async function isMemberOfOrganization(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  return !!membership;
}

/**
 * Require organization membership - throws if user is not a member
 *
 * @param ctx Mutation context
 * @param userId User ID
 * @param organizationId Organization ID
 * @throws Error if user is not an active member
 */
export async function requireOrganizationMembership(
  ctx: MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<void> {
  const isMember = await isMemberOfOrganization(ctx, userId, organizationId);

  if (!isMember) {
    throw new Error(
      "Access denied: You must be a member of this organization"
    );
  }
}

// ============================================================================
// ROLE HIERARCHY HELPERS
// ============================================================================

/**
 * Role hierarchy levels (lower number = higher privilege)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 0,
  org_owner: 1,
  business_manager: 2,
  employee: 3,
  viewer: 4,
};

/**
 * Check if user has higher or equal role privilege than target role
 *
 * @param userRoleName User's role name
 * @param targetRoleName Target role name to compare against
 * @returns true if user has higher or equal privilege
 *
 * @example
 * const canAssign = hasHigherOrEqualRole("org_owner", "employee"); // true
 * const canAssign2 = hasHigherOrEqualRole("employee", "org_owner"); // false
 */
export function hasHigherOrEqualRole(
  userRoleName: string,
  targetRoleName: string
): boolean {
  const userLevel = ROLE_HIERARCHY[userRoleName] ?? 999;
  const targetLevel = ROLE_HIERARCHY[targetRoleName] ?? 999;
  return userLevel <= targetLevel;
}

/**
 * Check if user can manage target user (based on role hierarchy)
 *
 * Rules:
 * - Super admins can manage anyone
 * - Users can only manage users with equal or lower privileges
 * - Users cannot manage themselves (except super admins)
 *
 * @param ctx Query or Mutation context
 * @param userId Current user ID
 * @param targetUserId Target user ID
 * @param organizationId Organization context
 * @returns true if user can manage target
 */
export async function canManageUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  targetUserId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  // Get current user's context
  const userContext = await getUserContext(ctx, userId, organizationId);

  // Super admins can manage anyone
  if (userContext.isGlobal && userContext.roleName === "super_admin") {
    return true;
  }

  // Users cannot manage themselves (except super admins)
  if (userId === targetUserId && userContext.roleName !== "super_admin") {
    return false;
  }

  // Get target user's context
  const targetContext = await getUserContext(ctx, targetUserId, organizationId);

  // Check role hierarchy
  if (!userContext.roleName || !targetContext.roleName) {
    return false;
  }

  return hasHigherOrEqualRole(userContext.roleName, targetContext.roleName);
}

/**
 * Require that user can manage target user
 *
 * @param ctx Mutation context
 * @param userId Current user ID
 * @param targetUserId Target user ID
 * @param organizationId Organization context
 * @throws Error if user cannot manage target
 */
export async function requireCanManageUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  targetUserId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<void> {
  const canManage = await canManageUser(ctx, userId, targetUserId, organizationId);

  if (!canManage) {
    throw new Error(
      "Permission denied: You cannot manage this user due to role hierarchy restrictions"
    );
  }
}
