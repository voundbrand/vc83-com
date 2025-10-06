import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// Check if user needs password setup (first-time login)
export const checkNeedsPasswordSetup = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { userExists: false, needsSetup: false };
    }

    // Check if password is already set
    const userPassword = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      userExists: true,
      needsSetup: !userPassword || !user.isPasswordSet,
      userName: user.firstName || user.lastName || null,
    };
  },
});

// Setup password for first-time user (invite-only system)
// This is an action because it needs to call the crypto action
export const setupPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sessionId: string;
    user: { id: Id<"users">; email: string; firstName?: string; lastName?: string };
  }> => {
    // First, verify user exists and needs password setup
    const checkResult: { userExists: boolean; hasPassword: boolean; userId: Id<"users"> | null } =
      await ctx.runQuery(internal.auth.internalCheckUser, {
        email: args.email,
      });

    if (!checkResult.userExists) {
      throw new Error("User not found. Please contact an administrator.");
    }

    if (checkResult.hasPassword) {
      throw new Error("Password already set. Please use sign in.");
    }

    // Hash the password using bcrypt in Node.js runtime
    const passwordHash: string = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: args.password,
    });

    // Store the password and update user via mutation
    const result: {
      success: boolean;
      sessionId: string;
      user: { id: Id<"users">; email: string; firstName?: string; lastName?: string };
    } =
      await ctx.runMutation(internal.auth.internalSetupPassword, {
        userId: checkResult.userId!,
        passwordHash,
        firstName: args.firstName,
        lastName: args.lastName,
      });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: checkResult.userId!,
      organizationId: undefined, // Global action for initial setup
      action: "setup_password",
      resource: "users",
      success: true,
      metadata: { email: args.email },
    });

    return result;
  },
});

// Internal query to check user (not exposed to client)
export const internalCheckUser = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { userExists: false, hasPassword: false, userId: null };
    }

    const userPassword = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      userExists: true,
      hasPassword: !!userPassword,
      userId: user._id,
    };
  },
});

// Internal mutation to store password (not exposed to client)
export const internalSetupPassword = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store password
    await ctx.db.insert("userPasswords", {
      userId: args.userId,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
    });

    // Update user info
    const updates: {
      isPasswordSet: boolean;
      updatedAt: number;
      firstName?: string;
      lastName?: string;
    } = {
      isPasswordSet: true,
      updatedAt: Date.now(),
    };

    if (args.firstName) updates.firstName = args.firstName;
    if (args.lastName) updates.lastName = args.lastName;

    await ctx.db.patch(args.userId, updates);

    // Create a session
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      email: (await ctx.db.get(args.userId))!.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    const user = await ctx.db.get(args.userId);

    return {
      success: true,
      sessionId,
      user: {
        id: args.userId,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
      },
    };
  },
});

// Sign in action - uses bcrypt to verify password
export const signIn = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sessionId: string;
    user: { id: Id<"users">; email: string; firstName?: string; lastName?: string };
  }> => {
    // Get user and password hash
    const userData: {
      userExists: boolean;
      passwordHash: string | null;
      userId: Id<"users"> | null;
      email: string | null;
      defaultOrgId: Id<"organizations"> | undefined;
      firstName?: string;
      lastName?: string;
    } = await ctx.runQuery(internal.auth.internalGetUserAuth, {
      email: args.email,
    });

    if (!userData.userExists || !userData.passwordHash) {
      throw new Error("Invalid credentials");
    }

    // Verify password using bcrypt
    const isValid: boolean = await ctx.runAction(internal.cryptoActions.verifyPassword, {
      password: args.password,
      hash: userData.passwordHash,
    });

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Create session via mutation
    const result: {
      success: boolean;
      sessionId: string;
      user: { id: Id<"users">; email: string; firstName?: string; lastName?: string };
    } =
      await ctx.runMutation(internal.auth.internalCreateSession, {
        userId: userData.userId!,
        email: userData.email!,
      });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: userData.userId!,
      organizationId: userData.defaultOrgId,
      action: "sign_in",
      resource: "sessions",
      success: true,
      metadata: { email: args.email },
    });

    return result;
  },
});

// Internal query to get user auth data
export const internalGetUserAuth = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { userExists: false, passwordHash: null, userId: null, email: null, defaultOrgId: undefined };
    }

    const userPassword = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      userExists: true,
      passwordHash: userPassword?.passwordHash || null,
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultOrgId: user.defaultOrgId,
    };
  },
});

// Internal mutation to create session
export const internalCreateSession = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      email: args.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    const user = await ctx.db.get(args.userId);

    return {
      success: true,
      sessionId,
      user: {
        id: args.userId,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
      },
    };
  },
});

// Sign out mutation (doesn't need crypto)
export const signOut = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (session) {
      // Log audit event before deletion
      await ctx.runMutation(internal.rbac.logAudit, {
        userId: session.userId,
        organizationId: undefined,
        action: "sign_out",
        resource: "sessions",
        success: true,
        metadata: {},
      });
    }

    await ctx.db.delete(args.sessionId as Id<"sessions">);
    return { success: true };
  },
});

// Switch organization mutation
export const switchOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
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
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership && !user.global_role_id) {
      throw new Error("Access denied: No membership in this organization");
    }

    // Update user's default organization
    await ctx.db.patch(user._id, {
      defaultOrgId: args.organizationId,
      updatedAt: Date.now(),
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: user._id,
      organizationId: args.organizationId,
      action: "switch_organization",
      resource: "organizations",
      success: true,
      metadata: { previousOrgId: user.defaultOrgId },
    });

    return { success: true };
  },
});

// Get current user query with full RBAC context
export const getCurrentUser = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // Check for global super admin role
    let globalRole = null;
    let isSuperAdmin = false;
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role) {
        globalRole = {
          id: role._id,
          name: role.name,
          description: role.description,
        };
        isSuperAdmin = role.name === 'super_admin';
      }
    }

    // Get user's organizations and roles
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        const role = await ctx.db.get(membership.role);
        if (!org || !role) return null;

        // Get permissions for the role
        const rolePermissions = await ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("roleId", membership.role))
          .collect();

        const permissions = await Promise.all(
          rolePermissions.map(async (rp) => {
            const permission = await ctx.db.get(rp.permissionId);
            return permission ? {
              id: permission._id,
              name: permission.name,
              resource: permission.resource,
              action: permission.action,
            } : null;
          })
        );

        return {
          id: org._id,
          name: org.name,
          slug: org.slug,
          role: {
            id: role._id,
            name: role.name,
            description: role.description,
          },
          permissions: permissions.filter(Boolean),
          isOwner: membership.invitedBy === user._id,
        };
      })
    );

    // Get the default/current organization
    const validOrganizations = organizations.filter(Boolean);
    const currentOrg = user.defaultOrgId
      ? validOrganizations.find(org => org?.id === user.defaultOrgId)
      : validOrganizations[0];

    // Legacy role support
    let legacyRole = null;
    if (user.roleId) {
      const role = await ctx.db.get(user.roleId);
      if (role) {
        legacyRole = {
          id: role._id,
          name: role.name,
          description: role.description,
        };
      }
    }

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isPasswordSet: user.isPasswordSet || false,
      isSuperAdmin,
      globalRole,
      organizations: validOrganizations,
      currentOrganization: currentOrg || null,
      defaultOrgId: user.defaultOrgId,
      // Legacy fields for backward compatibility
      roleId: user.roleId,
      roleName: legacyRole?.name,
    };
  },
});

// Check if current user has a specific permission
export const canUserPerform = query({
  args: {
    sessionId: v.optional(v.string()),
    permission: v.string(),
    resource: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      return false;
    }

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return false;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return false;
    }

    // Super admins can do everything
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role && role.name === "super_admin") {
        return true;
      }
    }

    // Determine which organization to check
    const orgId = args.organizationId || user.defaultOrgId;
    if (!orgId) {
      return false;
    }

    // Get user's membership in the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", orgId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership) {
      return false;
    }

    // Check the permission
    const role = await ctx.db.get(membership.role);
    if (!role || !role.isActive) {
      return false;
    }

    // Check if role has the specific permission
    const permission = await ctx.db
      .query("permissions")
      .withIndex("by_name", (q) => q.eq("name", args.permission))
      .first();

    if (!permission) {
      return false;
    }

    if (args.resource && permission.resource !== args.resource) {
      return false;
    }

    // Check role-permission mapping
    const hasPermission = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", membership.role).eq("permissionId", permission._id)
      )
      .first();

    return !!hasPermission;
  },
});

// Batch check multiple permissions
export const canUserPerformMany = query({
  args: {
    sessionId: v.optional(v.string()),
    permissions: v.array(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      const results: Record<string, boolean> = {};
      args.permissions.forEach(p => results[p] = false);
      return results;
    }

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      const results: Record<string, boolean> = {};
      args.permissions.forEach(p => results[p] = false);
      return results;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      const results: Record<string, boolean> = {};
      args.permissions.forEach(p => results[p] = false);
      return results;
    }

    // Super admins can do everything
    if (user.global_role_id) {
      const role = await ctx.db.get(user.global_role_id);
      if (role && role.name === "super_admin") {
        const results: Record<string, boolean> = {};
        args.permissions.forEach(p => results[p] = true);
        return results;
      }
    }

    // Determine which organization to check
    const orgId = args.organizationId || user.defaultOrgId;
    if (!orgId) {
      const results: Record<string, boolean> = {};
      args.permissions.forEach(p => results[p] = false);
      return results;
    }

    // Get user's membership in the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", orgId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership) {
      const results: Record<string, boolean> = {};
      args.permissions.forEach(p => results[p] = false);
      return results;
    }

    // Get all permissions for the role
    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", membership.role))
      .collect();

    const permissionIds = new Set(rolePermissions.map(rp => rp.permissionId));

    // Check each requested permission
    const results: Record<string, boolean> = {};
    for (const permName of args.permissions) {
      const permission = await ctx.db
        .query("permissions")
        .withIndex("by_name", (q) => q.eq("name", permName))
        .first();

      results[permName] = permission ? permissionIds.has(permission._id) : false;
    }

    return results;
  },
});

// Admin function to create a user (for invitation system)
export const adminCreateUser = action({
  args: {
    sessionId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"users">; message: string }> => {
    // Verify admin permissions
    const canCreate: boolean = await ctx.runQuery(api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_users",
      resource: "users",
      organizationId: args.organizationId,
    });

    if (!canCreate) {
      throw new Error("Permission denied: Cannot create users");
    }

    // Get the admin user
    const session: {
      _id: Id<"sessions">;
      userId: Id<"users">;
      email: string;
      createdAt: number;
      expiresAt: number;
    } | null = await ctx.runQuery(internal.auth.internalGetSession, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Invalid session");
    }

    // Check if user already exists
    const existingUser: { userExists: boolean; hasPassword: boolean; userId: Id<"users"> | null } =
      await ctx.runQuery(internal.auth.internalCheckUser, {
        email: args.email,
      });

    if (existingUser.userExists) {
      throw new Error("User with this email already exists");
    }

    // Create the user
    const userId: Id<"users"> = await ctx.runMutation(internal.auth.internalCreateUser, {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      invitedBy: session.userId,
      isPasswordSet: false, // New users need to set password
    });

    // If organization and role specified, add membership
    if (args.organizationId && args.roleId) {
      await ctx.runMutation(internal.auth.internalAddOrgMembership, {
        userId,
        organizationId: args.organizationId,
        roleId: args.roleId,
        invitedBy: session.userId,
      });
    }

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: session.userId,
      organizationId: args.organizationId,
      action: "create_user",
      resource: "users",
      success: true,
      metadata: {
        newUserEmail: args.email,
        newUserId: userId,
      },
    });

    // TODO: Send invitation email via emailActions.ts

    return {
      success: true,
      userId,
      message: "User created. They will receive an email invitation to set their password.",
    };
  },
});

// Internal query to get session
export const internalGetSession = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    return session;
  },
});

// Internal mutation to create user
export const internalCreateUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    invitedBy: v.id("users"),
    isPasswordSet: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      isPasswordSet: args.isPasswordSet,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Internal mutation to add org membership
export const internalAddOrgMembership = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("organizationMembers", {
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