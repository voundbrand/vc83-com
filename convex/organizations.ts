import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
const generatedApi: any = require("./_generated/api");
import { requireAuthenticatedUser, getUserContext, checkPermission, requirePermission } from "./rbacHelpers";
import { getLicenseInternal } from "./licensing/helpers";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all organizations (super admin only)
 *
 * @permission view_all_organizations - Super admin only
 * @roles super_admin
 */
export const listAll = query({
  args: {
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can list all organizations
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Nicht autorisiert: Nur Super-Administratoren können alle Organisationen auflisten");
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
 * List organizations with cursor pagination (super admin only)
 *
 * Returns a manageable page for large installations so the UI does not load
 * thousands of organizations at once.
 */
export const listAllPaginated = query({
  args: {
    sessionId: v.string(),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Nicht autorisiert: Nur Super-Administratoren können alle Organisationen auflisten");
    }

    const pageSize = Math.max(10, Math.min(args.pageSize ?? 25, 100));
    const normalizedSearch = args.search?.trim().slice(0, 120);

    const organizationPage = normalizedSearch
      ? await ctx.db
          .query("organizations")
          .withSearchIndex("search_by_name", (q) => q.search("name", normalizedSearch))
          .paginate({ cursor: args.cursor ?? null, numItems: pageSize })
      : await ctx.db
          .query("organizations")
          .order("desc")
          .paginate({ cursor: args.cursor ?? null, numItems: pageSize });

    const organizationsWithDetails = await Promise.all(
      organizationPage.page.map(async (org) => {
        const activeMembers = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        return {
          ...org,
          memberCount: activeMembers.length,
        };
      }),
    );

    return {
      organizations: organizationsWithDetails,
      continueCursor: organizationPage.continueCursor,
      isDone: organizationPage.isDone,
      pageSize,
      search: normalizedSearch ?? null,
    };
  },
});

/**
 * Get organization by ID with detailed information
 *
 * @permission view_organization - Required to view organization details
 * @roles org_owner, business_manager, employee, viewer, super_admin
 */
export const getById = query({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission to view this organization
    const hasAccess = await checkPermission(ctx, userId, "view_organization", args.organizationId);

    if (!hasAccess) {
      // Return null instead of throwing to allow graceful error handling in UI
      return null;
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      // Return null instead of throwing to allow graceful error handling in UI
      return null;
    }

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId, args.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";

    // Get members with their roles
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        const role = await ctx.db.get(member.role);

        // Check if this member is a super admin
        const memberIsSuperAdmin = memberUser?.global_role_id ?
          (await ctx.db.get(memberUser.global_role_id))?.name === "super_admin" : false;

        return {
          ...member,
          user: memberUser ? {
            id: memberUser._id,
            email: memberUser.email,
            firstName: memberUser.firstName,
            lastName: memberUser.lastName,
            avatarUrl: memberUser.avatarUrl,
          } : null,
          roleName: role?.name || "unknown",
          isSuperAdmin: memberIsSuperAdmin,
        };
      })
    );

    // Filter out super admin users unless the current user is also a super admin
    const filteredMembers = membersWithDetails.filter(member => {
      // If current user is super admin, show all members
      if (isSuperAdmin) return true;
      // Otherwise, hide super admin members
      return !member.isSuperAdmin;
    });

    return {
      ...organization,
      members: filteredMembers,
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

    if (!session) {
      // Session doesn't exist - return null instead of throwing
      // This allows the frontend to handle it gracefully (redirect to login)
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      // Session expired - return null instead of throwing
      // This allows the frontend to clear localStorage and redirect to login
      return null;
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

    // Filter out null organizations but keep inactive ones (for management UI)
    return organizationsWithRoles.filter(item => item.organization);
  },
});

/**
 * Search users that can be invited to an organization
 *
 * @permission manage_users - Required to search and invite users
 * @roles org_owner, business_manager, super_admin
 */
export const searchUsersToInvite = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.optional(v.string()),
    sessionId: v.string(), // Required - no Clerk fallback
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission to manage users in this organization
    const hasPermission = await checkPermission(ctx, userId, "manage_users", args.organizationId);

    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Nur Organisationsbesitzer und Manager können Benutzer einladen");
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
 *
 * @permission manage_users - Required to invite users
 * @roles org_owner, business_manager, super_admin
 */
export const inviteUser = action({
  args: {
    sessionId: v.string(),
    email: v.string(),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    sendEmail: v.optional(v.boolean()), // Default true
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId: inviterId } = await (ctx as any).runQuery(generatedApi.internal.rbacHelpers.requireAuthenticatedUserQuery, {
      sessionId: args.sessionId,
    });

    // Check permissions
    await (ctx as any).runMutation(generatedApi.internal.rbacHelpers.requirePermissionMutation, {
      userId: inviterId,
      permission: "manage_users",
      organizationId: args.organizationId,
    });

    // Check if user already exists
    const existingUser = await (ctx as any).runQuery(generatedApi.internal.organizations.getUserByEmail, {
      email: args.email,
    });

    let newUserId: Id<"users">;
    let isNewUser = false;

    if (existingUser) {
      // Check if already a member
      const existingMembership = await (ctx as any).runQuery(generatedApi.internal.organizations.checkMembership, {
        userId: existingUser._id,
        organizationId: args.organizationId,
      });

      if (existingMembership) {
        throw new Error("This user is already a member of your organization");
      }

      newUserId = existingUser._id;
    } else {
      // Create new user
      newUserId = await (ctx as any).runMutation(generatedApi.internal.organizations.createInvitedUser, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        invitedBy: inviterId,
        defaultOrgId: args.organizationId,
      });
      isNewUser = true;
    }

    // Add user to organization
    try {
      await (ctx as any).runMutation(generatedApi.internal.organizations.addUserToOrganization, {
        userId: newUserId,
        organizationId: args.organizationId,
        roleId: args.roleId,
        invitedBy: inviterId,
      });
    } catch (error) {
      // If this was a new user we created, we need to clean up
      if (isNewUser) {
        // Delete the newly created user since the invitation failed
        await (ctx as any).runMutation(generatedApi.internal.organizations.deleteInvitedUser, {
          userId: newUserId,
        });
      }
      // Re-throw the error with proper message
      throw error;
    }

    // Send invitation email (if enabled)
    if (args.sendEmail !== false) {
      const organization = await (ctx as any).runQuery(generatedApi.internal.organizations.getOrganization, {
        organizationId: args.organizationId,
      });

      const inviter = await (ctx as any).runQuery(generatedApi.internal.organizations.getUser, {
        userId: inviterId,
      });

      await (ctx as any).runAction(generatedApi.internal.emailService.sendInvitationEmail, {
        to: args.email,
        organizationName: organization.name,
        inviterName: inviter.firstName || inviter.email,
        isNewUser,
        setupLink: process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com",
      });
    }

    // Log audit event
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: inviterId,
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
      userId: newUserId,
      isNewUser,
    };
  },
});

/**
 * Resend invitation email to a user
 *
 * @permission manage_users - Required to resend invitations
 * @roles org_owner, business_manager, super_admin
 */
export const resendInvitation = action({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId: resenderId } = await (ctx as any).runQuery(generatedApi.internal.rbacHelpers.requireAuthenticatedUserQuery, {
      sessionId: args.sessionId,
    });

    // Check permissions
    await (ctx as any).runMutation(generatedApi.internal.rbacHelpers.requirePermissionMutation, {
      userId: resenderId,
      permission: "manage_users",
      organizationId: args.organizationId,
    });

    // Get user and membership details
    const user = await (ctx as any).runQuery(generatedApi.internal.organizations.getUser, {
      userId: args.userId,
    });

    const membership = await (ctx as any).runQuery(generatedApi.internal.organizations.checkMembership, {
      userId: args.userId,
      organizationId: args.organizationId,
    });

    if (!membership) {
      throw new Error("User is not a member of this organization");
    }

    // Check if already accepted
    if (membership.acceptedAt) {
      throw new Error("This user has already accepted the invitation and is active");
    }

    // Get organization and resender details
    const organization = await (ctx as any).runQuery(generatedApi.internal.organizations.getOrganization, {
      organizationId: args.organizationId,
    });

    const resender = await (ctx as any).runQuery(generatedApi.internal.organizations.getUser, {
      userId: resenderId,
    });

    // Check if user needs password setup (invited users without password)
    const isNewUser = !user.isPasswordSet;

    // Send invitation email
    await (ctx as any).runAction(generatedApi.internal.emailService.sendInvitationEmail, {
      to: user.email,
      organizationName: organization.name,
      inviterName: resender.firstName || resender.email,
      isNewUser,
      setupLink: process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com",
    });

    // Log audit event
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: resenderId,
      organizationId: args.organizationId,
      action: "resend_invitation",
      resource: "users",
      success: true,
      metadata: {
        targetUserId: args.userId,
        userEmail: user.email,
      },
    });

    return {
      success: true,
      message: "Invitation email resent successfully",
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

export const deleteInvitedUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Only delete users that were invited (have invitedBy set) and haven't set up their password yet
    const user = await ctx.db.get(args.userId);
    if (user && user.invitedBy && !user.isPasswordSet) {
      await ctx.db.delete(args.userId);
    }
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
    // CHECK USER LIMIT: Enforce maxUsers limit for organization's tier
    const license = await getLicenseInternal(ctx, args.organizationId);
    const maxUsers = license.limits.maxUsers;

    // If not unlimited, check current user count
    if (maxUsers !== -1) {
      const currentMembers = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const currentCount = currentMembers.length;

      // Check if limit would be exceeded
      if (currentCount >= maxUsers) {
        const tierNames: Record<string, string> = {
          free: "Starter (€199/month)",
          starter: "Professional (€399/month)",
          professional: "Agency (€599/month)",
          agency: "Enterprise (€1,500+/month)",
          enterprise: "Enterprise",
        };
        const nextTier = tierNames[license.planTier] || "a higher tier";

        throw new Error(
          `You've reached your user limit (${maxUsers}). ` +
          `Upgrade to ${nextTier} for more users.`
        );
      }
    }

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

// ============================================================================
// ORGANIZATION CREATION (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Create a new organization (super admin only)
 *
 * This mutation creates a complete organization with:
 * - Base organization record
 * - organization_settings ontology object with defaults
 * - Creator added as org_owner (optional)
 * - Full audit trail
 *
 * @permission create_system_organization - Only super admins can create organizations
 * @roles super_admin
 */
export const createOrganization = action({
  args: {
    sessionId: v.string(),
    businessName: v.string(), // REQUIRED: Legal business name
    description: v.optional(v.string()),
    industry: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    addCreatorAsOwner: v.optional(v.boolean()), // Default: true
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York")
    dateFormat: v.optional(v.string()), // Date format (e.g., "MM/DD/YYYY")
    language: v.optional(v.string()), // Language code (e.g., "en", "de")
    parentOrganizationId: v.optional(v.id("organizations")), // Create as sub-org of parent
  },
  handler: async (ctx, args): Promise<{ success: boolean; organizationId: Id<"organizations">; slug: string; message: string }> => {
    // 1. Authenticate user
    const authResult = await (ctx as any).runQuery(generatedApi.internal.rbacHelpers.requireAuthenticatedUserQuery, {
      sessionId: args.sessionId,
    });
    const userId: Id<"users"> = authResult.userId;

    // 2. Check permission (will throw if user doesn't have permission)
    await (ctx as any).runMutation(generatedApi.internal.rbacHelpers.requirePermissionMutation, {
      userId,
      permission: "create_system_organization",
    });

    // 3. Validate business name
    if (!args.businessName || args.businessName.trim().length === 0) {
      throw new Error("Business name is required");
    }

    // 4. Generate slug from business name
    const slug = args.businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes

    // 5. Check for duplicate slug
    const existingOrg = await (ctx as any).runQuery(generatedApi.internal.organizations.getOrgBySlug, {
      slug,
    });

    if (existingOrg) {
      throw new Error(`An organization with the slug "${slug}" already exists. Please use a different business name.`);
    }

    // 5.5. Validate parent organization if creating sub-org
    if (args.parentOrganizationId) {
      // Verify parent org exists
      const parentOrg = await (ctx as any).runQuery(generatedApi.internal.organizations.getOrgById, {
        organizationId: args.parentOrganizationId,
      });
      if (!parentOrg) {
        throw new Error("Parent organization not found");
      }

      // Check parent's license allows sub-orgs
      const parentLicense = await (ctx as any).runQuery(generatedApi.internal.licensing.helpers.getLicenseInternalQuery, {
        organizationId: args.parentOrganizationId,
      });
      if (!parentLicense.features.subOrgsEnabled) {
        throw new Error("Parent organization's plan does not support sub-organizations");
      }

      // Check sub-org limit
      const currentSubOrgCount = await (ctx as any).runQuery(generatedApi.internal.organizations.countSubOrganizations, {
        parentOrganizationId: args.parentOrganizationId,
      });
      const limit = parentLicense.limits.maxSubOrganizations;
      if (limit !== -1 && currentSubOrgCount >= limit) {
        throw new Error(`Parent organization has reached the maximum number of sub-organizations (${limit})`);
      }
    }

    // 6. Create the organization
    const organizationId: Id<"organizations"> = await (ctx as any).runMutation(generatedApi.internal.organizations.createOrgRecord, {
      businessName: args.businessName,
      name: args.businessName, // Display name = business name
      slug,
      description: args.description,
      createdBy: userId,
      parentOrganizationId: args.parentOrganizationId,
    });

    // 7. Create organization_settings ontology object with provided locale settings
    await (ctx as any).runMutation(generatedApi.internal.organizations.createOrgSettings, {
      organizationId,
      createdBy: userId,
      timezone: args.timezone,
      dateFormat: args.dateFormat,
      language: args.language,
    });

    // 8. Save contact information (if provided)
    if (args.contactEmail || args.contactPhone) {
      await (ctx as any).runMutation(generatedApi.internal.organizationOntology.createOrgContact, {
        organizationId,
        createdBy: userId,
        primaryEmail: args.contactEmail,
        primaryPhone: args.contactPhone,
      });
    }

    // 9. Save profile information (if provided)
    if (args.industry || args.description) {
      await (ctx as any).runMutation(generatedApi.internal.organizationOntology.createOrgProfile, {
        organizationId,
        createdBy: userId,
        industry: args.industry,
        bio: args.description,
      });
    }

    // 10. Add creator as org_owner (if requested, default true)
    if (args.addCreatorAsOwner !== false) {
      await (ctx as any).runMutation(generatedApi.internal.organizations.addCreatorAsOwner, {
        userId,
        organizationId,
      });
    }

    // 11. Assign all apps to new organization (automatic app availability)
    await (ctx as any).runMutation(generatedApi.internal.onboarding.assignAllAppsToOrg, {
      organizationId,
      userId,
    });

    // 12. Log success audit
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId,
      organizationId,
      action: "create_organization",
      resource: "organizations",
      resourceId: organizationId,
      success: true,
      metadata: {
        businessName: args.businessName,
        slug,
        addedCreatorAsOwner: args.addCreatorAsOwner !== false,
        parentOrganizationId: args.parentOrganizationId || null,
        isSubOrganization: !!args.parentOrganizationId,
      },
    });

    return {
      success: true,
      organizationId,
      slug,
      message: args.parentOrganizationId
        ? `Sub-organization "${args.businessName}" created successfully`
        : `Organization "${args.businessName}" created successfully`,
    };
  },
});

// ============================================================================
// SUB-ORGANIZATION CREATION (SELF-SERVICE)
// ============================================================================

/**
 * Create a sub-organization (self-service for Agency/Enterprise users)
 *
 * This allows org_owners of organizations with subOrgsEnabled to create
 * sub-organizations within their tier limits.
 *
 * Requirements:
 * - User must be org_owner of the parent organization
 * - Parent organization must have subOrgsEnabled feature
 * - Parent organization must not have exceeded maxSubOrganizations limit
 *
 * @permission None - role-based (org_owner of parent org)
 * @roles org_owner
 */
export const createSubOrganization = action({
  args: {
    sessionId: v.string(),
    parentOrganizationId: v.id("organizations"), // REQUIRED: Parent org
    businessName: v.string(), // REQUIRED: Legal business name for sub-org
    description: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    timezone: v.optional(v.string()),
    dateFormat: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; organizationId: Id<"organizations">; slug: string; message: string }> => {
    // 1. Authenticate user
    const authResult = await (ctx as any).runQuery(generatedApi.internal.rbacHelpers.requireAuthenticatedUserQuery, {
      sessionId: args.sessionId,
    });
    const userId: Id<"users"> = authResult.userId;

    // 2. Verify parent organization exists
    const parentOrg = await (ctx as any).runQuery(generatedApi.internal.organizations.getOrgById, {
      organizationId: args.parentOrganizationId,
    });
    if (!parentOrg) {
      throw new Error("Parent organization not found");
    }

    // 3. Check user is org_owner of parent organization
    const membership = await (ctx as any).runQuery(generatedApi.internal.organizations.getUserMembership, {
      userId,
      organizationId: args.parentOrganizationId,
    });
    if (!membership || !membership.isActive) {
      throw new Error("You are not a member of this organization");
    }

    const memberRole = await (ctx as any).runQuery(generatedApi.internal.rbac.getRoleById, {
      roleId: membership.role,
    });
    if (!memberRole || memberRole.name !== "org_owner") {
      throw new Error("Only organization owners can create sub-organizations");
    }

    // 4. Check parent's license allows sub-orgs
    const parentLicense = await (ctx as any).runQuery(generatedApi.internal.licensing.helpers.getLicenseInternalQuery, {
      organizationId: args.parentOrganizationId,
    });
    if (!parentLicense.features.subOrgsEnabled) {
      throw new Error("Your organization's plan does not support sub-organizations. Please upgrade to Agency or Enterprise tier.");
    }

    // 5. Check sub-org limit
    const currentSubOrgCount = await (ctx as any).runQuery(generatedApi.internal.organizations.countSubOrganizations, {
      parentOrganizationId: args.parentOrganizationId,
    });
    const limit = parentLicense.limits.maxSubOrganizations;
    if (limit !== -1 && currentSubOrgCount >= limit) {
      throw new Error(`You have reached the maximum number of sub-organizations (${limit}). Please contact support to increase your limit.`);
    }

    // 6. Validate business name
    if (!args.businessName || args.businessName.trim().length === 0) {
      throw new Error("Business name is required");
    }

    // 7. Generate slug from business name
    const baseSlug = args.businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Add parent org slug as prefix for sub-orgs to ensure uniqueness
    const slug = `${parentOrg.slug}-${baseSlug}`;

    // 8. Check for duplicate slug
    const existingOrg = await (ctx as any).runQuery(generatedApi.internal.organizations.getOrgBySlug, {
      slug,
    });

    if (existingOrg) {
      throw new Error(`A sub-organization with this name already exists. Please use a different business name.`);
    }

    // 9. Create the sub-organization
    const organizationId: Id<"organizations"> = await (ctx as any).runMutation(generatedApi.internal.organizations.createOrgRecord, {
      businessName: args.businessName,
      name: args.businessName,
      slug,
      description: args.description,
      createdBy: userId,
      parentOrganizationId: args.parentOrganizationId,
    });

    // 10. Create organization_settings
    await (ctx as any).runMutation(generatedApi.internal.organizations.createOrgSettings, {
      organizationId,
      createdBy: userId,
      timezone: args.timezone,
      dateFormat: args.dateFormat,
      language: args.language,
    });

    // 11. Save contact information (if provided)
    if (args.contactEmail || args.contactPhone) {
      await (ctx as any).runMutation(generatedApi.internal.organizationOntology.createOrgContact, {
        organizationId,
        createdBy: userId,
        primaryEmail: args.contactEmail,
        primaryPhone: args.contactPhone,
      });
    }

    // 12. Add creator as org_owner of sub-org
    await (ctx as any).runMutation(generatedApi.internal.organizations.addCreatorAsOwner, {
      userId,
      organizationId,
    });

    // 13. Assign all apps to new sub-organization
    await (ctx as any).runMutation(generatedApi.internal.onboarding.assignAllAppsToOrg, {
      organizationId,
      userId,
    });

    // 14. Log success audit
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId,
      organizationId,
      action: "create_sub_organization",
      resource: "organizations",
      resourceId: organizationId,
      success: true,
      metadata: {
        businessName: args.businessName,
        slug,
        parentOrganizationId: args.parentOrganizationId,
        parentOrganizationName: parentOrg.name,
      },
    });

    return {
      success: true,
      organizationId,
      slug,
      message: `Sub-organization "${args.businessName}" created successfully`,
    };
  },
});

// ============================================================================
// ORGANIZATION PARENT RELATIONSHIP MANAGEMENT
// ============================================================================

/**
 * Update an organization's parent relationship (super admin only)
 *
 * This allows super admins to:
 * - Assign a top-level org as a sub-org of another
 * - Remove an org from its parent (make it top-level)
 * - Move a sub-org to a different parent
 *
 * @permission manage_organization or super_admin
 * @roles super_admin
 */
export const updateOrganizationParent = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    parentOrganizationId: v.union(v.id("organizations"), v.null()), // null = remove parent
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can change parent relationships
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Only super admins can change organization parent relationships");
    }

    // 3. Get the organization being updated
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // 4. Validate new parent if provided
    if (args.parentOrganizationId !== null) {
      const parentOrg = await ctx.db.get(args.parentOrganizationId);
      if (!parentOrg) {
        throw new Error("Parent organization not found");
      }

      // Prevent circular references - parent can't be a descendant
      if (parentOrg.parentOrganizationId === args.organizationId) {
        throw new Error("Cannot create circular parent relationship");
      }

      // Prevent setting self as parent
      if (args.parentOrganizationId === args.organizationId) {
        throw new Error("Organization cannot be its own parent");
      }

      // Check parent's license allows sub-orgs
      const parentLicense = await getLicenseInternal(ctx, args.parentOrganizationId);
      if (!parentLicense.features.subOrgsEnabled) {
        throw new Error("Parent organization's plan does not support sub-organizations");
      }

      // Check sub-org limit (only if adding, not moving)
      if (organization.parentOrganizationId !== args.parentOrganizationId) {
        // args.parentOrganizationId is guaranteed non-null here due to the outer if check
        const parentId = args.parentOrganizationId!;
        const currentSubOrgCount = await ctx.db
          .query("organizations")
          .withIndex("by_parent", (q) => q.eq("parentOrganizationId", parentId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        const limit = parentLicense.limits.maxSubOrganizations;
        if (limit !== -1 && currentSubOrgCount.length >= limit) {
          throw new Error(`Parent organization has reached the maximum number of sub-organizations (${limit})`);
        }
      }
    }

    // 5. Update the organization
    const oldParentId = organization.parentOrganizationId;
    await ctx.db.patch(args.organizationId, {
      parentOrganizationId: args.parentOrganizationId ?? undefined,
      updatedAt: Date.now(),
    });

    // 6. Log to audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: args.organizationId,
      action: "update_organization_parent",
      resource: "organizations",
      resourceId: String(args.organizationId),
      success: true,
      createdAt: Date.now(),
      metadata: {
        oldParentId: oldParentId || null,
        newParentId: args.parentOrganizationId,
      },
    });

    return {
      success: true,
      message: args.parentOrganizationId
        ? `Organization is now a sub-organization`
        : `Organization is now a top-level organization`,
    };
  },
});

/**
 * Get sub-organizations for a parent organization
 *
 * @permission view_organization
 * @roles org_owner, business_manager, super_admin
 */
export const getSubOrganizations = query({
  args: {
    sessionId: v.string(),
    parentOrganizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission using checkPermission (for queries)
    const hasPermission = await checkPermission(ctx, userId, "view_organization", args.parentOrganizationId);
    if (!hasPermission) {
      throw new Error("You do not have permission to view this organization's sub-organizations");
    }

    // Get all sub-organizations
    const subOrgs = await ctx.db
      .query("organizations")
      .withIndex("by_parent", (q) => q.eq("parentOrganizationId", args.parentOrganizationId))
      .collect();

    // Get member counts for each sub-org
    const subOrgsWithDetails = await Promise.all(
      subOrgs.map(async (org) => {
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

    return subOrgsWithDetails;
  },
});

// ============================================================================
// INTERNAL QUERIES FOR ORGANIZATION MANAGEMENT
// ============================================================================

export const getOrgById = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

export const countSubOrganizations = internalQuery({
  args: { parentOrganizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const subOrgs = await ctx.db
      .query("organizations")
      .withIndex("by_parent", (q) => q.eq("parentOrganizationId", args.parentOrganizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return subOrgs.length;
  },
});

export const getUserMembership = internalQuery({
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

export const getOrgBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const createOrgRecord = internalMutation({
  args: {
    businessName: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    parentOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const orgData: {
      businessName: string;
      name: string;
      slug: string;
      plan: "free";
      isPersonalWorkspace: boolean;
      isActive: boolean;
      createdAt: number;
      updatedAt: number;
      description?: string;
      parentOrganizationId?: Id<"organizations">;
      createdBy?: Id<"users">;
    } = {
      businessName: args.businessName,
      name: args.name,
      slug: args.slug,
      plan: "free" as const, // Default plan
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Only add description if provided
    if (args.description) {
      orgData.description = args.description;
    }

    // Add parent organization ID for sub-organizations
    if (args.parentOrganizationId) {
      orgData.parentOrganizationId = args.parentOrganizationId;
    }

    // Track who created this organization
    if (args.createdBy) {
      orgData.createdBy = args.createdBy;
    }

    return await ctx.db.insert("organizations", orgData);
  },
});

export const createOrgSettings = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    timezone: v.optional(v.string()),
    dateFormat: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create organization_settings ontology object with provided values or sensible defaults
    // Default timezone based on common usage: America/New_York (US Eastern Time)
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_settings",
      subtype: "main",
      name: "Organization Settings",
      status: "active",
      customProperties: {
        timezone: args.timezone || "America/New_York", // Default to US Eastern Time
        dateFormat: args.dateFormat || "MM/DD/YYYY", // Default to US date format
        language: args.language || "en", // Default to English
      },
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const addCreatorAsOwner = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get org_owner role
    const orgOwnerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "org_owner"))
      .first();

    if (!orgOwnerRole) {
      throw new Error("org_owner role not found. Please run RBAC seeding.");
    }

    const now = Date.now();

    // Add user as organization member with org_owner role
    await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId: args.organizationId,
      role: orgOwnerRole._id,
      isActive: true,
      joinedAt: now,
      invitedBy: args.userId, // Self-invited
      invitedAt: now,
      acceptedAt: now, // Auto-accepted for creator
    });
  },
});

// ============================================================================
// ORGANIZATION DELETION
// ============================================================================

/**
 * Delete an organization (org owner or super admin only)
 *
 * This mutation soft-deletes an organization by setting isActive = false
 * Only org owners and super admins can delete organizations
 *
 * @permission delete_organization or super admin
 * @roles org_owner, super_admin
 */
export const deleteOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // Call internal mutation to handle the deletion
    const result = await (ctx as any).runMutation(generatedApi.internal.organizations.deleteOrganizationInternal, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

    return result;
  },
});

export const deleteOrganizationInternal = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get organization
    const organization = await ctx.db.get(args.organizationId);

    if (!organization) {
      throw new Error("Organization not found");
    }

    // 3. Check if user is org owner or super admin
    const userContext = await getUserContext(ctx, userId);

    // Check if super admin
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";

    // Check if org owner of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let isOrgOwner = false;
    if (membership) {
      const role = await ctx.db.get(membership.role);
      isOrgOwner = role?.name === "org_owner";
    }

    if (!isSuperAdmin && !isOrgOwner) {
      throw new Error("Not authorized: Only organization owners and super admins can delete organizations");
    }

    // 4. Soft delete the organization
    await ctx.db.patch(args.organizationId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Organization "${organization.name}" has been deleted successfully`,
    };
  },
});

export const getOrgMembership = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!membership) return null;

    const role = await ctx.db.get(membership.role);
    return {
      ...membership,
      role: role?.name || "unknown",
    };
  },
});

export const softDeleteOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Restore an archived organization (super admin only)
 *
 * This mutation restores a soft-deleted organization by setting isActive = true
 * Only super admins can restore organizations (typically after permanent deletion)
 *
 * @permission super admin only
 * @roles super_admin
 */
export const restoreOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const result = await (ctx as any).runMutation(generatedApi.internal.organizations.restoreOrganizationInternal, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    return result;
  },
});

export const restoreOrganizationInternal = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get organization
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // 3. Check if organization is archived
    if (organization.isActive) {
      throw new Error("Organization is already active");
    }

    // 4. Check if user is super admin (only super admins can restore)
    const userContext = await getUserContext(ctx, userId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";

    if (!isSuperAdmin) {
      throw new Error("Not authorized: Only super admins can restore archived organizations");
    }

    // 5. Restore the organization
    await ctx.db.patch(args.organizationId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    // 6. Log audit event
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId,
      organizationId: args.organizationId,
      action: "restore_organization",
      resource: "organizations",
      success: true,
      metadata: { organizationName: organization.name },
    });

    return {
      success: true,
      message: `Organization "${organization.name}" has been restored successfully`,
    };
  },
});

/**
 * Permanently delete an organization (org owner or super admin only)
 *
 * This mutation HARD DELETES an organization and all related data
 * Only works on organizations that are already soft-deleted (isActive = false)
 *
 * @permission delete_organization or super admin
 * @roles org_owner, super_admin
 */
export const permanentlyDeleteOrganization = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // Call internal mutation to handle the permanent deletion
    const result = await (ctx as any).runMutation(generatedApi.internal.organizations.permanentlyDeleteOrganizationInternal, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

    return result;
  },
});

export const permanentlyDeleteOrganizationInternal = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get organization
    const organization = await ctx.db.get(args.organizationId);

    if (!organization) {
      throw new Error("Organization not found");
    }

    // 3. Check if organization is already soft-deleted
    if (organization.isActive) {
      throw new Error("Cannot permanently delete an active organization. Please deactivate it first.");
    }

    // 4. Check if user is org owner or super admin
    const userContext = await getUserContext(ctx, userId);

    // Check if super admin
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";

    // Check if org owner of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    let isOrgOwner = false;
    if (membership) {
      const role = await ctx.db.get(membership.role);
      isOrgOwner = role?.name === "org_owner";
    }

    if (!isSuperAdmin && !isOrgOwner) {
      throw new Error("Not authorized: Only organization owners and super admins can permanently delete organizations");
    }

    // 5. HARD DELETE - Remove all related data
    // TODO: Add cleanup for all related tables (objects, etc.)
    // For now, just delete the organization record
    await ctx.db.delete(args.organizationId);

    return {
      success: true,
      message: `Organization "${organization.name}" has been permanently deleted from the database`,
    };
  },
});
// ============================================================================
// STRIPE BILLING SUPPORT
// ============================================================================

/**
 * Get organization by ID (for Stripe integration)
 * Used by Stripe checkout actions
 */
export const get = query({
  args: {
    id: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Update Stripe customer ID for organization
 * Used when creating Stripe customers for AI billing
 */
export const updateStripeCustomer = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
    });
    return { success: true };
  },
});

/**
 * SUPER ADMIN: Clear Stripe subscription data for organization
 *
 * Clears the stripeSubscriptionId field. Use when:
 * - Subscription was deleted in Stripe dashboard
 * - Need to reset subscription state for testing
 * - Fixing orphaned subscription references
 *
 * NOTE: Plan/tier is managed through organization_license object.
 * Use changePlanTier from convex/licensing/superAdmin.ts to change plans.
 *
 * @permission super_admin only
 */
export const clearStripeSubscriptionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    clearCustomerId: v.optional(v.boolean()), // Also clear customer ID if needed
    resetPlan: v.optional(v.boolean()), // DEPRECATED: Use changePlanTier from licensing/superAdmin.ts instead
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const updates: Record<string, unknown> = {
      stripeSubscriptionId: undefined,
    };

    if (args.clearCustomerId) {
      updates.stripeCustomerId = undefined;
    }

    // NOTE: args.resetPlan is deprecated - plan is now in organization_license object
    // If you need to reset the plan, use changePlanTier from convex/licensing/superAdmin.ts

    await ctx.db.patch(args.organizationId, updates);

    return {
      success: true,
      cleared: {
        subscriptionId: true,
        customerId: args.clearCustomerId || false,
        planReset: false, // Always false now - plan is managed separately
      },
    };
  },
});

/**
 * SUPER ADMIN: Clear Stripe subscription data for organization (public wrapper)
 *
 * Clears the stripeSubscriptionId field. Use when:
 * - Subscription was deleted in Stripe dashboard
 * - Need to reset subscription state for testing
 * - Fixing orphaned subscription references
 *
 * @permission super_admin only
 */
export const clearStripeSubscription = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    clearCustomerId: v.optional(v.boolean()),
    resetPlan: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Verify super admin status
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Not authorized: Only super admins can clear Stripe subscription data");
    }

    // 3. Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // 4. Clear subscription data
    const updates: Record<string, unknown> = {
      stripeSubscriptionId: undefined,
      updatedAt: Date.now(),
    };

    if (args.clearCustomerId) {
      updates.stripeCustomerId = undefined;
    }

    // NOTE: args.resetPlan is deprecated - plan is now in organization_license object
    // If you need to reset the plan, use changePlanTier from convex/licensing/superAdmin.ts

    await ctx.db.patch(args.organizationId, updates);

    // 5. Log audit event
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId,
      organizationId: args.organizationId,
      action: "clear_stripe_subscription",
      resource: "organizations",
      success: true,
      metadata: {
        organizationName: org.name,
        clearedSubscriptionId: !!org.stripeSubscriptionId,
        clearedCustomerId: args.clearCustomerId || false,
        planReset: false, // Always false now - plan is managed separately in organization_license
      },
    });

    return {
      success: true,
      message: `Stripe subscription data cleared for ${org.name}`,
      cleared: {
        subscriptionId: !!org.stripeSubscriptionId,
        customerId: args.clearCustomerId || false,
        planReset: args.resetPlan || false,
      },
    };
  },
});
