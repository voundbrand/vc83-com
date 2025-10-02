import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper to check if user is a member of an organization
async function checkOrgMembership(
  ctx: any,
  userId: Id<"users">,
  organizationId: Id<"organizations">
) {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q: any) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    .first();

  return membership && membership.isActive ? membership : null;
}

// Get organization by ID (with membership check)
export const getOrganizationById = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check membership
    const membership = await checkOrgMembership(ctx, args.userId, args.organizationId);
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization || !organization.isActive) {
      throw new Error("Organization not found");
    }

    return {
      ...organization,
      memberRole: membership.role,
    };
  },
});

// Get organization by ID (simpler version without requiring userId in args)
export const getOrganization = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    // Check membership
    const membership = await checkOrgMembership(ctx, user._id, args.orgId);
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    const organization = await ctx.db.get(args.orgId);
    if (!organization || !organization.isActive) {
      throw new Error("Organization not found");
    }

    return organization;
  },
});

// Get organization by slug (public - for guest access to VC83 org)
export const getOrganizationBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!organization || !organization.isActive) {
      return null;
    }

    return organization;
  },
});

// Get all organizations for a user
export const getUserOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) {
      return [];
    }

    // Get all memberships for the user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get organization details for each membership
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org || !org.isActive) return null;

        return {
          ...org,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    // Filter out null values and return
    return organizations.filter((org): org is NonNullable<typeof org> => org !== null);
  },
});

// Create a new organization (for users who want additional orgs)
export const createOrganization = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    plan: v.union(v.literal("personal"), v.literal("business"), v.literal("enterprise")),
    
    // Business details (optional for personal plans)
    businessName: v.optional(v.string()),
    taxId: v.optional(v.string()),
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the user exists
    const user = await ctx.db.get(args.userId);
    if (!user || !user.isActive) {
      throw new Error("User not found");
    }

    // For business/enterprise plans, require business details
    if (args.plan !== "personal" && !args.businessName) {
      throw new Error("Business name is required for business/enterprise plans");
    }

    // Generate slug
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 45);
    
    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the organization
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      businessName: args.businessName || args.name,
      taxId: args.taxId,
      street: args.street,
      city: args.city,
      postalCode: args.postalCode,
      country: args.country,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      website: args.website,
      plan: args.plan,
      isPersonalWorkspace: args.plan === "personal",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create membership (creator is owner)
    await ctx.db.insert("organizationMembers", {
      userId: args.userId,
      organizationId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId: args.userId,
      action: "organization.create",
      resource: "organization",
      resourceId: organizationId,
      metadata: {
        plan: args.plan,
        name: args.name,
      },
      success: true,
      createdAt: Date.now(),
    });

    // Auto-install free apps for new organization
    const freeApps = await ctx.db
      .query("apps")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const app of freeApps) {
      if (app.plans.includes(args.plan)) {
        await ctx.db.insert("appInstallations", {
          organizationId,
          appId: app._id,
          status: "active",
          permissions: { read: true, write: false },
          isVisible: true,
          usageCount: 0,
          installedAt: Date.now(),
          installedBy: args.userId,
          updatedAt: Date.now(),
        });
      }
    }

    return {
      organizationId,
      slug,
      message: "Organization created successfully",
    };
  },
});

// Update organization details
export const updateOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    
    // Updatable fields
    name: v.optional(v.string()),
    businessName: v.optional(v.string()),
    taxId: v.optional(v.string()),
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    bio: v.optional(v.string()),
    
    // Settings
    settings: v.optional(v.object({
      branding: v.optional(v.object({
        primaryColor: v.optional(v.string()),
        logo: v.optional(v.string()),
      })),
      features: v.optional(v.object({
        customDomain: v.optional(v.boolean()),
        sso: v.optional(v.boolean()),
        apiAccess: v.optional(v.boolean()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    // Check membership and permissions
    const membership = await checkOrgMembership(ctx, args.userId, args.organizationId);
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    // Only owners and admins can update organization
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Access denied: Only owners and admins can update organization");
    }

    // Get current organization
    const organization = await ctx.db.get(args.organizationId);
    if (!organization || !organization.isActive) {
      throw new Error("Organization not found");
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    // Add fields that were provided
    if (args.name !== undefined) updates.name = args.name;
    if (args.businessName !== undefined) updates.businessName = args.businessName;
    if (args.taxId !== undefined) updates.taxId = args.taxId;
    if (args.street !== undefined) updates.street = args.street;
    if (args.city !== undefined) updates.city = args.city;
    if (args.postalCode !== undefined) updates.postalCode = args.postalCode;
    if (args.country !== undefined) updates.country = args.country;
    if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) updates.contactPhone = args.contactPhone;
    if (args.website !== undefined) updates.website = args.website;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.settings !== undefined) updates.settings = args.settings;

    // Update the organization
    await ctx.db.patch(args.organizationId, updates);

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "organization.update",
      resource: "organization",
      resourceId: args.organizationId,
      metadata: {
        updates: Object.keys(updates).filter(k => k !== "updatedAt"),
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      message: "Organization updated successfully",
    };
  },
});

// Switch user's default organization
export const switchDefaultOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user || !user.isActive) {
      throw new Error("User not found");
    }

    // Check membership in target organization
    const membership = await checkOrgMembership(ctx, args.userId, args.organizationId);
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    // Update user's default org
    await ctx.db.patch(args.userId, {
      defaultOrgId: args.organizationId,
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "user.switch_organization",
      resource: "user",
      resourceId: args.userId,
      metadata: {
        previousOrgId: user.defaultOrgId,
        newOrgId: args.organizationId,
      },
      success: true,
      createdAt: Date.now(),
    });

    return {
      message: "Default organization switched successfully",
    };
  },
});

// Get organization statistics (for dashboard)
export const getOrganizationStats = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check membership
    const membership = await checkOrgMembership(ctx, args.userId, args.organizationId);
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    // Get member count
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get installed apps count
    const installedApps = await ctx.db
      .query("appInstallations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return {
      memberCount: members.length,
      installedAppCount: installedApps.length,
      contentCount: 0, // Legacy field - apps now have their own tables
      membersByRole: {
        owner: members.filter(m => m.role === "owner").length,
        admin: members.filter(m => m.role === "admin").length,
        member: members.filter(m => m.role === "member").length,
        viewer: members.filter(m => m.role === "viewer").length,
      },
    };
  },
});