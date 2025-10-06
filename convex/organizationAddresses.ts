import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all addresses for an organization
 */
export const getAddresses = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const addresses = await ctx.db
      .query("organizationAddresses")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return addresses.sort((a, b) => {
      // Sort: primary first, then by type, then by creation date
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.createdAt - b.createdAt;
    });
  },
});

/**
 * Get addresses by type
 */
export const getAddressesByType = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("billing"),
      v.literal("shipping"),
      v.literal("mailing"),
      v.literal("physical"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationAddresses")
      .withIndex("by_org_and_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.type)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get primary address
 */
export const getPrimaryAddress = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationAddresses")
      .withIndex("by_org_and_primary", (q) =>
        q.eq("organizationId", args.organizationId).eq("isPrimary", true)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

/**
 * Get default address for a specific type
 */
export const getDefaultAddressForType = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("billing"),
      v.literal("shipping"),
      v.literal("mailing"),
      v.literal("physical"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationAddresses")
      .withIndex("by_org_and_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.type)
      )
      .filter((q) => q.eq(q.field("isDefault"), true))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a new address
 */
export const addAddress = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("billing"),
      v.literal("shipping"),
      v.literal("mailing"),
      v.literal("physical"),
      v.literal("other")
    ),
    label: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
    region: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If setting as default for this type, unset other defaults of same type
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("organizationAddresses")
        .withIndex("by_org_and_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", args.type)
        )
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const addr of existingDefaults) {
        await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
      }
    }

    // If setting as primary, unset other primary addresses
    if (args.isPrimary) {
      const existingPrimary = await ctx.db
        .query("organizationAddresses")
        .withIndex("by_org_and_primary", (q) =>
          q.eq("organizationId", args.organizationId).eq("isPrimary", true)
        )
        .collect();

      for (const addr of existingPrimary) {
        await ctx.db.patch(addr._id, { isPrimary: false, updatedAt: now });
      }
    }

    // Create the new address
    const addressId = await ctx.db.insert("organizationAddresses", {
      organizationId: args.organizationId,
      type: args.type,
      label: args.label,
      addressLine1: args.addressLine1,
      addressLine2: args.addressLine2,
      city: args.city,
      state: args.state,
      postalCode: args.postalCode,
      country: args.country,
      region: args.region,
      isDefault: args.isDefault ?? false,
      isPrimary: args.isPrimary ?? false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return addressId;
  },
});

/**
 * Update an existing address
 */
export const updateAddress = mutation({
  args: {
    addressId: v.id("organizationAddresses"),
    label: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { addressId, ...updates } = args;

    await ctx.db.patch(addressId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return addressId;
  },
});

/**
 * Set an address as default for its type
 */
export const setAsDefault = mutation({
  args: {
    addressId: v.id("organizationAddresses"),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.addressId);
    if (!address) {
      throw new Error("Address not found");
    }

    const now = Date.now();

    // Unset other defaults of the same type
    const existingDefaults = await ctx.db
      .query("organizationAddresses")
      .withIndex("by_org_and_type", (q) =>
        q.eq("organizationId", address.organizationId).eq("type", address.type)
      )
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();

    for (const addr of existingDefaults) {
      if (addr._id !== args.addressId) {
        await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
      }
    }

    // Set this address as default
    await ctx.db.patch(args.addressId, {
      isDefault: true,
      updatedAt: now,
    });

    return args.addressId;
  },
});

/**
 * Set an address as primary (main address for organization)
 */
export const setAsPrimary = mutation({
  args: {
    addressId: v.id("organizationAddresses"),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.addressId);
    if (!address) {
      throw new Error("Address not found");
    }

    const now = Date.now();

    // Unset other primary addresses
    const existingPrimary = await ctx.db
      .query("organizationAddresses")
      .withIndex("by_org_and_primary", (q) =>
        q.eq("organizationId", address.organizationId).eq("isPrimary", true)
      )
      .collect();

    for (const addr of existingPrimary) {
      if (addr._id !== args.addressId) {
        await ctx.db.patch(addr._id, { isPrimary: false, updatedAt: now });
      }
    }

    // Set this address as primary
    await ctx.db.patch(args.addressId, {
      isPrimary: true,
      updatedAt: now,
    });

    return args.addressId;
  },
});

/**
 * Delete an address (soft delete)
 */
export const deleteAddress = mutation({
  args: {
    addressId: v.id("organizationAddresses"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.addressId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.addressId;
  },
});

/**
 * Permanently delete an address
 */
export const permanentlyDeleteAddress = mutation({
  args: {
    addressId: v.id("organizationAddresses"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.addressId);
    return { success: true };
  },
});
