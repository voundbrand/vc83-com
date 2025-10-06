import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a super admin user with an organization
 * This mutation is specifically for seeding the initial super admin
 *
 * IMPORTANT: This should only be used for initial setup!
 * In production, you might want to add additional security checks
 * or remove this mutation entirely after initial setup.
 */
export const createSuperAdminUser = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    organizationName: v.string(),
    organizationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return {
        success: false,
        message: `User with email ${args.email} already exists`,
        userId: existingUser._id
      };
    }

    // Get super_admin role (must run seedRBAC first)
    const superAdminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "super_admin"))
      .first();

    if (!superAdminRole) {
      return {
        success: false,
        message: "Super admin role not found. Please run seedRBAC first."
      };
    }

    // Check if organization exists
    let orgId;
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.organizationSlug))
      .first();

    if (existingOrg) {
      orgId = existingOrg._id;
      console.log(`Using existing organization: ${existingOrg.name}`);
    } else {
      // Create organization
      orgId = await ctx.db.insert("organizations", {
        name: args.organizationName,
        businessName: args.organizationName,
        slug: args.organizationSlug,
        plan: "enterprise" as const, // Super admin gets enterprise plan
        isActive: true,
        isPersonalWorkspace: false,
        createdAt: now,
        updatedAt: now,
        settings: {
          features: {
            apiAccess: true,
            customDomain: true,
            sso: true,
          },
        },
      });
      console.log(`Created new organization: ${args.organizationName}`);
    }

    // Create user with global super admin role
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      defaultOrgId: orgId,
      global_role_id: superAdminRole._id, // This gives them global super admin access
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Also add them as org_owner to their organization for consistency
    const orgOwnerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "org_owner"))
      .first();

    if (orgOwnerRole) {
      await ctx.db.insert("organizationMembers", {
        userId,
        organizationId: orgId,
        role: orgOwnerRole._id, // They're org_owner in their own org
        isActive: true,
        joinedAt: now,
        acceptedAt: now,
      });
    }

    // Create audit log entry
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: orgId,
      action: "create_super_admin",
      resource: "users",
      resourceId: userId,
      success: true,
      metadata: {
        email: args.email,
        organizationName: args.organizationName,
        createdBy: "seed_script",
      },
      createdAt: now,
    });

    return {
      success: true,
      message: `Super admin user ${args.email} created successfully with organization ${args.organizationName}`,
      userId,
      organizationId: orgId,
    };
  },
});

/**
 * Create an organization manager user
 * This mutation creates a user and assigns them a specific role in an organization
 *
 * IMPORTANT: This is for seeding/testing purposes
 */
export const createOrgManagerUser = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    organizationId: v.id("organizations"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Check if they're already a member of this org
      const existingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", existingUser._id).eq("organizationId", args.organizationId)
        )
        .first();

      if (existingMembership) {
        return {
          success: false,
          message: `User ${args.email} is already a member of this organization`,
          userId: existingUser._id,
        };
      }

      // Add them to the organization with the specified role
      const membershipId = await ctx.db.insert("organizationMembers", {
        userId: existingUser._id,
        organizationId: args.organizationId,
        role: args.roleId,
        isActive: true,
        joinedAt: now,
        acceptedAt: now,
      });

      // Update their default org if they don't have one
      if (!existingUser.defaultOrgId) {
        await ctx.db.patch(existingUser._id, {
          defaultOrgId: args.organizationId,
        });
      }

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: existingUser._id,
        organizationId: args.organizationId,
        action: "add_org_member",
        resource: "organizationMembers",
        resourceId: membershipId,
        success: true,
        metadata: {
          email: args.email,
          roleId: args.roleId,
          existingUser: true,
        },
        createdAt: now,
      });

      return {
        success: true,
        message: `Existing user ${args.email} added to organization with specified role`,
        userId: existingUser._id,
        membershipId,
      };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      defaultOrgId: args.organizationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add them to the organization with the specified role
    const membershipId = await ctx.db.insert("organizationMembers", {
      userId,
      organizationId: args.organizationId,
      role: args.roleId,
      isActive: true,
      joinedAt: now,
      acceptedAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId: args.organizationId,
      action: "create_org_member",
      resource: "users",
      resourceId: userId,
      success: true,
      metadata: {
        email: args.email,
        roleId: args.roleId,
        createdBy: "seed_script",
      },
      createdAt: now,
    });

    return {
      success: true,
      message: `User ${args.email} created and added to organization with specified role`,
      userId,
      membershipId,
    };
  },
});