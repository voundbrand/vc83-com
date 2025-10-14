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

    // Get super_admin role (must run seedRBAC first)
    const superAdminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "super_admin"))
      .first();

    if (!superAdminRole) {
      return {
        success: false,
        message: "Super-Admin-Rolle nicht gefunden. Bitte führe zuerst seedRBAC aus."
      };
    }

    const orgOwnerRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "org_owner"))
      .first();

    // STEP 1: Ensure organization exists (create if needed)
    let orgId;
    let orgCreated = false;
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
      });
      orgCreated = true;
      console.log(`Created new organization: ${args.organizationName}`);
    }

    // STEP 2: Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    let userId;
    let userCreated = false;

    if (existingUser) {
      userId = existingUser._id;
      console.log(`User ${args.email} already exists`);

      // Update their defaultOrgId if not set
      if (!existingUser.defaultOrgId) {
        await ctx.db.patch(userId, {
          defaultOrgId: orgId,
        });
      }

      // Ensure they have super_admin role
      if (existingUser.global_role_id !== superAdminRole._id) {
        await ctx.db.patch(userId, {
          global_role_id: superAdminRole._id,
        });
      }
    } else {
      // Create new user with global super admin role
      userId = await ctx.db.insert("users", {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        defaultOrgId: orgId,
        global_role_id: superAdminRole._id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      userCreated = true;
      console.log(`Created new user: ${args.email}`);
    }

    // STEP 3: Create organization settings if new org
    if (orgCreated) {
      await ctx.db.insert("objects", {
        organizationId: orgId,
        type: "organization_settings",
        subtype: "features",
        name: `${args.organizationSlug}-features`,
        status: "active",
        customProperties: {
          apiAccess: true,
          customDomain: true,
          sso: true,
        },
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // STEP 4: Ensure user is org_owner in the organization
    if (orgOwnerRole) {
      const existingMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userId).eq("organizationId", orgId)
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("organizationMembers", {
          userId,
          organizationId: orgId,
          role: orgOwnerRole._id,
          isActive: true,
          joinedAt: now,
          acceptedAt: now,
        });
        console.log(`Added user as org_owner to ${args.organizationName}`);
      }
    }

    // STEP 5: Create audit log entry
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
        userCreated,
        orgCreated,
      },
      createdAt: now,
    });

    return {
      success: true,
      message: userCreated
        ? `Super-Admin-Benutzer ${args.email} erfolgreich mit Organisation ${args.organizationName} erstellt`
        : `Super-Admin ${args.email} aktualisiert, Organisation ${args.organizationName} sichergestellt`,
      userId,
      organizationId: orgId,
      userCreated,
      orgCreated,
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
          message: `Benutzer ${args.email} ist bereits Mitglied dieser Organisation`,
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
        message: `Bestehender Benutzer ${args.email} zur Organisation mit festgelegter Rolle hinzugefügt`,
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
      message: `Benutzer ${args.email} erstellt und zur Organisation mit festgelegter Rolle hinzugefügt`,
      userId,
      membershipId,
    };
  },
});