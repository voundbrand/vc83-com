/**
 * BENEFITS MEMBER SYNC
 *
 * Handles syncing external OAuth members into the L4YERCAK3 ontology.
 * When a member logs in via OAuth, their profile is synced to the objects table.
 *
 * This creates/updates crm_contact objects for members who authenticate
 * via external OAuth providers (e.g., Gründungswerft OAuth).
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// MEMBER SYNC OPERATIONS
// ============================================================================

/**
 * SYNC MEMBER FROM OAUTH
 * Creates or updates a member from OAuth profile data.
 * Called after successful OAuth authentication.
 */
export const syncMemberFromOAuth = mutation({
  args: {
    organizationId: v.id("organizations"),
    externalUserId: v.string(),      // OAuth provider user ID
    externalMembershipId: v.optional(v.string()), // Membership ID if available
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    // Address fields
    street: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    // Profile fields
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    // Social/additional
    languages: v.optional(v.array(v.string())),
    socialMedia: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if member already exists by external user ID
    const existingByExternalId = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.externalUserId"), args.externalUserId)
      )
      .first();

    // Also check by email as fallback
    const existingByEmail = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.email"), args.email)
      )
      .first();

    const existing = existingByExternalId || existingByEmail;

    // Build address object if any address field provided
    const address = (args.street || args.city || args.postalCode) ? {
      street: args.houseNumber
        ? `${args.street || ""} ${args.houseNumber}`.trim()
        : args.street,
      city: args.city,
      postalCode: args.postalCode,
      country: args.country || "DE",
    } : undefined;

    const memberData = {
      organizationId: args.organizationId,
      type: "crm_contact" as const,
      subtype: "member",
      name: `${args.firstName} ${args.lastName}`,
      description: args.jobTitle || args.company || "Member",
      status: "active" as const,
      customProperties: {
        // External IDs
        externalUserId: args.externalUserId,
        externalMembershipId: args.externalMembershipId,
        // Contact info
        email: args.email,
        phone: args.phone,
        firstName: args.firstName,
        lastName: args.lastName,
        // Address
        address,
        // Profile
        avatar: args.avatar,
        bio: args.bio,
        jobTitle: args.jobTitle,
        company: args.company,
        // Additional
        languages: args.languages,
        socialMedia: args.socialMedia,
        website: args.website,
        // Sync metadata
        source: "oauth",
        lastSyncedAt: Date.now(),
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      // Update existing member
      await ctx.db.patch(existing._id, {
        ...memberData,
        customProperties: {
          ...existing.customProperties,
          ...memberData.customProperties,
        },
      });

      return {
        memberId: existing._id,
        isNew: false,
        action: "updated",
      };
    } else {
      // Create new member
      const memberId = await ctx.db.insert("objects", {
        ...memberData,
        createdAt: Date.now(),
      });

      // Log creation
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: memberId,
        actionType: "created",
        actionData: {
          source: "oauth",
          externalUserId: args.externalUserId,
        },
        performedAt: Date.now(),
      });

      return {
        memberId,
        isNew: true,
        action: "created",
      };
    }
  },
});

/**
 * GET MEMBER BY EXTERNAL ID
 * Look up a member by their external OAuth user ID
 */
export const getMemberByExternalId = query({
  args: {
    organizationId: v.id("organizations"),
    externalUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.externalUserId"), args.externalUserId)
      )
      .first();

    return member;
  },
});

/**
 * GET MEMBER BY EMAIL
 * Look up a member by email address
 */
export const getMemberByEmail = query({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.email"), args.email)
      )
      .first();

    return member;
  },
});

/**
 * UPDATE MEMBER PROFILE
 * Update member profile data (can be called by the member themselves)
 */
export const updateMemberProfile = mutation({
  args: {
    memberId: v.id("objects"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.object({
        street: v.optional(v.string()),
        city: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      bio: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      website: v.optional(v.string()),
      languages: v.optional(v.array(v.string())),
      socialMedia: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.type !== "crm_contact") {
      throw new Error("Member not found");
    }

    // Build updated name if name fields changed
    let newName = member.name;
    if (args.updates.firstName || args.updates.lastName) {
      const firstName = args.updates.firstName || member.customProperties?.firstName;
      const lastName = args.updates.lastName || member.customProperties?.lastName;
      newName = `${firstName} ${lastName}`;
    }

    await ctx.db.patch(args.memberId, {
      name: newName,
      description: args.updates.jobTitle || args.updates.company || member.description,
      customProperties: {
        ...member.customProperties,
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: member.organizationId,
      objectId: args.memberId,
      actionType: "profile_updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: args.memberId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// INTERNAL OPERATIONS (for server-side use)
// ============================================================================

/**
 * INTERNAL: Sync member from OAuth (no auth required)
 * Used by API routes during OAuth callback
 */
export const syncMemberFromOAuthInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    externalUserId: v.string(),
    externalMembershipId: v.optional(v.string()),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    street: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    languages: v.optional(v.array(v.string())),
    socialMedia: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Same logic as syncMemberFromOAuth but without auth check
    const existingByExternalId = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.externalUserId"), args.externalUserId)
      )
      .first();

    const existingByEmail = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.email"), args.email)
      )
      .first();

    const existing = existingByExternalId || existingByEmail;

    const address = (args.street || args.city || args.postalCode) ? {
      street: args.houseNumber
        ? `${args.street || ""} ${args.houseNumber}`.trim()
        : args.street,
      city: args.city,
      postalCode: args.postalCode,
      country: args.country || "DE",
    } : undefined;

    const memberData = {
      organizationId: args.organizationId,
      type: "crm_contact" as const,
      subtype: "member",
      name: `${args.firstName} ${args.lastName}`,
      description: args.jobTitle || args.company || "Member",
      status: "active" as const,
      customProperties: {
        externalUserId: args.externalUserId,
        externalMembershipId: args.externalMembershipId,
        email: args.email,
        phone: args.phone,
        firstName: args.firstName,
        lastName: args.lastName,
        address,
        avatar: args.avatar,
        bio: args.bio,
        jobTitle: args.jobTitle,
        company: args.company,
        languages: args.languages,
        socialMedia: args.socialMedia,
        website: args.website,
        source: "oauth",
        lastSyncedAt: Date.now(),
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...memberData,
        customProperties: {
          ...existing.customProperties,
          ...memberData.customProperties,
        },
      });

      return {
        memberId: existing._id,
        isNew: false,
      };
    } else {
      const memberId = await ctx.db.insert("objects", {
        ...memberData,
        createdAt: Date.now(),
      });

      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: memberId,
        actionType: "created",
        actionData: {
          source: "oauth",
          externalUserId: args.externalUserId,
        },
        performedAt: Date.now(),
      });

      return {
        memberId,
        isNew: true,
      };
    }
  },
});

/**
 * INTERNAL: Get member by external ID
 */
export const getMemberByExternalIdInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    externalUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.externalUserId"), args.externalUserId)
      )
      .first();
  },
});
