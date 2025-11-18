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
      throw new Error("Benutzer nicht gefunden. Bitte kontaktiere einen Administrator.");
    }

    if (checkResult.hasPassword) {
      throw new Error("Passwort bereits festgelegt. Bitte verwende die Anmeldung.");
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

    // Update all pending organization memberships to mark them as accepted
    // This happens when user sets password for the first time (activates account)
    const pendingMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const now = Date.now();
    for (const membership of pendingMemberships) {
      // Only update if not already accepted
      if (!membership.acceptedAt) {
        await ctx.db.patch(membership._id, {
          acceptedAt: now,
        });
      }
    }

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
      isActive: boolean;
    } = await ctx.runQuery(internal.auth.internalGetUserAuth, {
      email: args.email,
    });

    if (!userData.userExists || !userData.passwordHash) {
      throw new Error("Ungültige Anmeldedaten");
    }

    // Allow login during grace period - user will see warning banner in UI
    // Only block login if account is permanently deleted (isActive: false)
    if (userData.isActive === false) {
      throw new Error("Dieses Konto wurde dauerhaft gelöscht.");
    }

    // Verify password using bcrypt
    const isValid: boolean = await ctx.runAction(internal.cryptoActions.verifyPassword, {
      password: args.password,
      hash: userData.passwordHash,
    });

    if (!isValid) {
      throw new Error("Ungültige Anmeldedaten");
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
      return { userExists: false, passwordHash: null, userId: null, email: null, defaultOrgId: undefined, isActive: false };
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
      isActive: user.isActive ?? true, // Default to true for existing users
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

// Set default organization mutation (for first-time users)
export const setDefaultOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Ungültige oder abgelaufene Sitzung");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
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
      throw new Error("Zugriff verweigert: Keine Mitgliedschaft in dieser Organisation");
    }

    // Update user's default organization
    await ctx.db.patch(user._id, {
      defaultOrgId: args.organizationId,
      updatedAt: Date.now(),
    });

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
      throw new Error("Ungültige oder abgelaufene Sitzung");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
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
      throw new Error("Zugriff verweigert: Keine Mitgliedschaft in dieser Organisation");
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
          isActive: org.isActive, // Include isActive field
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

    // If user has no defaultOrgId but has organizations, use the first one
    // (Frontend should call setDefaultOrganization mutation to persist this)
    const currentOrg = user.defaultOrgId
      ? validOrganizations.find(org => org?.id === user.defaultOrgId)
      : validOrganizations[0]; // Fallback to first org

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
      scheduledDeletionDate: user.scheduledDeletionDate, // For grace period warning banner
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
      throw new Error("Berechtigung verweigert: Benutzer können nicht erstellt werden");
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
      throw new Error("Ungültige Sitzung");
    }

    // Check if user already exists
    const existingUser: { userExists: boolean; hasPassword: boolean; userId: Id<"users"> | null } =
      await ctx.runQuery(internal.auth.internalCheckUser, {
        email: args.email,
      });

    if (existingUser.userExists) {
      throw new Error("Ein Benutzer mit dieser E-Mail-Adresse existiert bereits");
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
      message: "Benutzer erstellt. Der Benutzer erhält eine E-Mail-Einladung, um sein Passwort festzulegen.",
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

// Internal query to get session by email
export const getSessionByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("email"), args.email))
      .order("desc")
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  },
});

// Internal query to get session by ID
export const getSessionById = internalQuery({
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

// Internal mutation to delete session
export const deleteSession = internalMutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId as Id<"sessions">);
  },
});

// ==========================================
// FRONTEND USER AUTHENTICATION
// ==========================================
// These functions manage OAuth users from frontend applications
// stored in the ontology system (objects table with type="frontend_user")

/**
 * Find a frontend user by email
 */
export const findFrontendUserByEmail = internalQuery({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "frontend_user")
      )
      .filter((q) => q.eq(q.field("name"), args.email))
      .first();

    return user;
  },
});

/**
 * Find a frontend user by OAuth provider and ID
 */
export const findFrontendUserByOAuth = internalQuery({
  args: {
    oauthProvider: v.string(),
    oauthId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "frontend_user")
      )
      .collect();

    const user = users.find(
      (u) =>
        u.customProperties?.oauthProvider === args.oauthProvider &&
        u.customProperties?.oauthId === args.oauthId
    );

    return user || null;
  },
});

/**
 * Sync a frontend user (create or update after OAuth login)
 */
export const syncFrontendUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    oauthProvider: v.string(),
    oauthId: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Get organization ID from request context or environment
    const PLATFORM_ORG_ID = process.env.PLATFORM_ORGANIZATION_ID;
    if (!PLATFORM_ORG_ID) {
      throw new Error("PLATFORM_ORGANIZATION_ID not configured");
    }
    const organizationId = PLATFORM_ORG_ID as Id<"organizations">;

    type FrontendUserObject = {
      _id: Id<"objects">;
      customProperties?: Record<string, unknown>;
    } | null;

    // Check by OAuth provider first
    const existingUserByOAuth: FrontendUserObject = await ctx.runQuery(internal.auth.findFrontendUserByOAuth, {
      oauthProvider: args.oauthProvider,
      oauthId: args.oauthId,
      organizationId,
    }) as FrontendUserObject;

    if (existingUserByOAuth) {
      await ctx.db.patch(existingUserByOAuth._id, {
        updatedAt: Date.now(),
        customProperties: {
          ...existingUserByOAuth.customProperties,
          lastLogin: Date.now(),
          displayName: args.name,
        },
      });
      return await ctx.db.get(existingUserByOAuth._id);
    }

    // Check by email
    const existingUserByEmail: FrontendUserObject = await ctx.runQuery(internal.auth.findFrontendUserByEmail, {
      email: args.email,
      organizationId,
    }) as FrontendUserObject;

    if (existingUserByEmail) {
      await ctx.db.patch(existingUserByEmail._id, {
        updatedAt: Date.now(),
        customProperties: {
          ...existingUserByEmail.customProperties,
          lastLogin: Date.now(),
          displayName: args.name,
          [`${args.oauthProvider}Id`]: args.oauthId,
        },
      });
      return await ctx.db.get(existingUserByEmail._id);
    }

    // Create new frontend_user
    const SYSTEM_USER_ID = "k1system000000000000000000" as Id<"users">;
    const userId = await ctx.db.insert("objects", {
      organizationId,
      type: "frontend_user",
      subtype: "oauth",
      name: args.email,
      description: `OAuth user from ${args.oauthProvider}`,
      status: "active",
      customProperties: {
        oauthProvider: args.oauthProvider,
        oauthId: args.oauthId,
        displayName: args.name,
        lastLogin: Date.now(),
      },
      createdBy: SYSTEM_USER_ID,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to CRM contact if exists
    await ctx.runMutation(internal.auth.linkFrontendUserToCRM, {
      userId,
      email: args.email,
      organizationId,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Create or get guest frontend_user for event registrations
 *
 * This creates a DORMANT account that can be activated later via password setup.
 * See docs/FRONTEND_USER_ARCHITECTURE.md for full details.
 *
 * IMPORTANT: frontend_user objects are stored in the objects table (NOT users table)
 * They represent CUSTOMERS, not platform staff.
 */
export const createOrGetGuestUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if frontend_user already exists for this email
    const existingUsers = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "frontend_user")
      )
      .collect();

    const existingUser = existingUsers.find(
      (u) => u.customProperties?.email === args.email
    );

    if (existingUser) {
      // Update last activity
      await ctx.db.patch(existingUser._id, {
        updatedAt: Date.now(),
        customProperties: {
          ...existingUser.customProperties,
          lastLogin: Date.now(),
        },
      });
      console.log(`✅ Using existing frontend_user: ${existingUser._id} for ${args.email}`);
      return existingUser._id;
    }

    // Create new guest frontend_user (dormant account - no password set)
    const displayName = args.firstName && args.lastName
      ? `${args.firstName} ${args.lastName}`
      : args.email;

    const userId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "frontend_user",
      subtype: "guest", // Different from "oauth"
      name: args.email,
      description: `Guest user from event registration`,
      status: "dormant", // Will be "active" after password setup
      customProperties: {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        displayName,
        registrationSource: "event_registration",
        isPasswordSet: false, // No password yet - can activate later
        lastLogin: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // NO createdBy field - frontend_users are top-level customer accounts
    });

    console.log(`✅ Created guest frontend_user: ${userId} for ${args.email}`);
    return userId;
  },
});

/**
 * Link frontend_user to existing crm_contact by email
 */
export const linkFrontendUserToCRM = internalMutation({
  args: {
    userId: v.id("objects"),
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Find crm_contact with matching email
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const matchingContact = contacts.find(
      (c) => c.customProperties?.email === args.email
    );

    if (!matchingContact) {
      console.log(`No matching crm_contact found for: ${args.email}`);
      return;
    }

    // Create link: frontend_user -> crm_contact
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.userId,
      toObjectId: matchingContact._id,
      linkType: "authenticates_as",
      createdAt: Date.now(),
    });

    // Update user with CRM contact reference
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        customProperties: {
          ...user.customProperties,
          crmContactId: matchingContact._id,
        },
      });
    }

    // Get CRM organization
    const crmOrgLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", matchingContact._id).eq("linkType", "belongs_to_organization")
      )
      .collect();

    if (crmOrgLinks.length > 0) {
      const crmOrganizationId = crmOrgLinks[0].toObjectId;

      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: args.userId,
        toObjectId: crmOrganizationId,
        linkType: "belongs_to_crm_org",
        createdAt: Date.now(),
      });

      const updatedUser = await ctx.db.get(args.userId);
      if (updatedUser) {
        await ctx.db.patch(args.userId, {
          customProperties: {
            ...updatedUser.customProperties,
            crmOrganizationId: crmOrganizationId,
          },
        });
      }
    }

    console.log(`✓ Linked frontend_user to crm_contact: ${matchingContact._id}`);
  },
});

/**
 * Validate a frontend user by ID
 */
export const validateFrontendUser = internalQuery({
  args: {
    userId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user || user.type !== "frontend_user") {
      return null;
    }

    if (user.status !== "active") {
      return {
        valid: false,
        error: "User account is not active",
      };
    }

    return {
      valid: true,
      user,
      crmContext: {
        contactId: user.customProperties?.crmContactId,
        organizationId: user.customProperties?.crmOrganizationId,
      },
    };
  },
});

/**
 * Get CRM organization for frontend user
 */
export const getCrmOrganizationForUser = internalQuery({
  args: {
    userId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.type !== "frontend_user") {
      return null;
    }

    const crmOrganizationId = user.customProperties?.crmOrganizationId;
    if (crmOrganizationId) {
      return await ctx.db.get(crmOrganizationId as Id<"objects">);
    }

    const orgLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.userId).eq("linkType", "belongs_to_crm_org")
      )
      .first();

    if (!orgLinks) {
      return null;
    }

    return await ctx.db.get(orgLinks.toObjectId);
  },
});