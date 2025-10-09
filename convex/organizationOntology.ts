/**
 * ORGANIZATION ONTOLOGY HELPERS
 *
 * Helper functions for managing organization data in the ontology system.
 * Organizations use the ontology pattern for flexible, extensible data storage.
 *
 * Core Patterns:
 * - organization_profile: Industry, bio, employee count, etc.
 * - organization_legal: Tax ID, VAT, registration numbers
 * - organization_contact: Emails, phones, website
 * - organization_social: Social media links
 * - organization_settings: Branding, locale, invoicing settings
 * - address (with subtypes): Physical, billing, shipping, mailing addresses
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, requirePermission } from "./rbacHelpers";

/**
 * GET ORGANIZATION PROFILE
 * Retrieves profile information (industry, bio, employee count, etc.)
 */
export const getOrganizationProfile = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_profile")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION LEGAL INFO
 * Retrieves legal information (tax ID, VAT, registration numbers)
 */
export const getOrganizationLegal = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_legal")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION CONTACT INFO
 * Retrieves contact information (emails, phones, website)
 */
export const getOrganizationContact = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_contact")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION SOCIAL MEDIA
 * Retrieves social media links (LinkedIn, Twitter, Facebook, etc.)
 */
export const getOrganizationSocial = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_social")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION SETTINGS
 * Retrieves settings by subtype (branding, locale, invoicing, etc.)
 */
export const getOrganizationSettings = query({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // "branding", "locale", "invoicing", etc.
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      );

    if (args.subtype) {
      return await baseQuery
        .filter(q => q.eq(q.field("subtype"), args.subtype))
        .first();
    }

    return await baseQuery.collect();
  },
});

/**
 * GET ORGANIZATION ADDRESSES
 * Retrieves organization addresses, optionally filtered by subtype
 */
export const getOrganizationAddresses = query({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // "billing", "shipping", "physical", "mailing", etc.
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "address")
      );

    if (args.subtype) {
      return await baseQuery
        .filter(q => q.eq(q.field("subtype"), args.subtype))
        .collect();
    }

    return await baseQuery.collect();
  },
});

/**
 * GET PRIMARY ADDRESS
 * Retrieves the primary address for an organization
 */
export const getPrimaryAddress = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "address")
      )
      .filter(q => q.eq(q.field("customProperties.isPrimary"), true))
      .first();
  },
});

/**
 * UPDATE ORGANIZATION PROFILE
 * Creates or updates organization profile information
 */
export const updateOrganizationProfile = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    industry: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    employeeCount: v.optional(v.string()),
    bio: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    // Get existing profile
    const profile = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_profile")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (profile) {
      // Update existing profile
      await ctx.db.patch(profile._id, {
        customProperties: {
          ...profile.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return profile._id;
    } else {
      // Create new profile
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organization not found");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_profile",
        name: `${org.slug}-profile`,
        status: "active",
        customProperties: updates,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE ORGANIZATION LEGAL
 * Creates or updates organization legal information
 */
export const updateOrganizationLegal = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    taxId: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    companyRegistrationNumber: v.optional(v.string()),
    legalEntityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const legal = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (legal) {
      await ctx.db.patch(legal._id, {
        customProperties: {
          ...legal.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return legal._id;
    } else {
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organization not found");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_legal",
        name: `${org.slug}-legal`,
        status: "verified",
        customProperties: updates,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE ORGANIZATION CONTACT
 * Creates or updates organization contact information
 */
export const updateOrganizationContact = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    contactEmail: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    faxNumber: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const contact = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_contact")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (contact) {
      await ctx.db.patch(contact._id, {
        customProperties: {
          ...contact.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return contact._id;
    } else {
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organization not found");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_contact",
        name: `${org.slug}-contact`,
        status: "active",
        customProperties: updates,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE ORGANIZATION SOCIAL
 * Creates or updates organization social media links
 */
export const updateOrganizationSocial = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    linkedin: v.optional(v.string()),
    twitter: v.optional(v.string()),
    facebook: v.optional(v.string()),
    instagram: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const social = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_social")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (social) {
      await ctx.db.patch(social._id, {
        customProperties: {
          ...social.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return social._id;
    } else {
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organization not found");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_social",
        name: `${org.slug}-social`,
        status: "active",
        customProperties: updates,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE ORGANIZATION SETTINGS
 * Creates or updates organization settings by subtype
 */
export const updateOrganizationSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "branding", "locale", "invoicing", etc.
    settings: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const settingsObj = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter(q => q.eq(q.field("subtype"), args.subtype))
      .first();

    if (settingsObj) {
      await ctx.db.patch(settingsObj._id, {
        customProperties: {
          ...settingsObj.customProperties,
          ...args.settings,
        },
        updatedAt: Date.now(),
      });
      return settingsObj._id;
    } else {
      const org = await ctx.db.get(args.organizationId);
      if (!org) throw new Error("Organization not found");

      return await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "organization_settings",
        subtype: args.subtype,
        name: `${org.slug}-settings-${args.subtype}`,
        status: "active",
        customProperties: args.settings,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * CREATE ORGANIZATION ADDRESS
 * Adds a new address for an organization
 */
export const createOrganizationAddress = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "billing", "shipping", "physical", "mailing", "other"
    name: v.string(),
    description: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
    region: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const { organizationId, subtype, name, description, ...addressProps } = args;

    return await ctx.db.insert("objects", {
      organizationId,
      type: "address",
      subtype,
      name,
      description,
      status: "active",
      customProperties: addressProps,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * UPDATE ORGANIZATION ADDRESS
 * Updates an existing organization address
 */
export const updateOrganizationAddress = mutation({
  args: {
    sessionId: v.string(),
    addressId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const address = await ctx.db.get(args.addressId);
    if (!address) throw new Error("Address not found");
    if (address.type !== "address") throw new Error("Invalid object type");

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: address.organizationId
    });

    const { addressId, name, description, ...updates } = args;

    const patch: Partial<typeof address> = { updatedAt: Date.now() };
    if (name) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (Object.keys(updates).length > 0) {
      patch.customProperties = {
        ...address.customProperties,
        ...updates,
      };
    }

    await ctx.db.patch(addressId, patch);
    return addressId;
  },
});

/**
 * DELETE ORGANIZATION ADDRESS
 * Soft deletes an organization address
 */
export const deleteOrganizationAddress = mutation({
  args: {
    sessionId: v.string(),
    addressId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const address = await ctx.db.get(args.addressId);
    if (!address) throw new Error("Address not found");
    if (address.type !== "address") throw new Error("Invalid object type");

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: address.organizationId
    });

    await ctx.db.patch(args.addressId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    return args.addressId;
  },
});
