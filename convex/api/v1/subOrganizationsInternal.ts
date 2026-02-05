/**
 * INTERNAL: Sub-Organization CRUD
 *
 * Manages parent-child organization hierarchy for the agency model.
 * Agencies (parent orgs) create sub-orgs for each of their SMB clients.
 *
 * Credit pool sharing: when a child org runs out of credits,
 * the system checks the parent org's balance as a fallback.
 */

import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";

/**
 * CREATE CHILD ORGANIZATION
 *
 * Creates a sub-org under a parent organization.
 * The child inherits the parent's plan but gets its own credit balance.
 */
export const createChildOrganizationInternal = internalMutation({
  args: {
    parentOrganizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    businessName: v.optional(v.string()),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify parent exists
    const parent = await ctx.db.get(args.parentOrganizationId);
    if (!parent) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Parent organization not found" });
    }

    // Prevent nesting deeper than 1 level
    if (parent.parentOrganizationId) {
      throw new ConvexError({
        code: "INVALID_OPERATION",
        message: "Cannot create sub-org under another sub-org. Only one level of nesting is supported.",
      });
    }

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingSlug) {
      throw new ConvexError({ code: "DUPLICATE_SLUG", message: `Slug "${args.slug}" is already in use` });
    }

    // Create child org inheriting parent plan
    const now = Date.now();
    const childId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      businessName: args.businessName || args.name,
      parentOrganizationId: args.parentOrganizationId,
      plan: parent.plan,
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { childOrganizationId: childId };
  },
});

/**
 * GET CHILD ORGANIZATIONS
 *
 * Lists all sub-orgs for a parent organization.
 */
export const getChildOrganizationsInternal = internalQuery({
  args: {
    parentOrganizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allChildren = await ctx.db
      .query("organizations")
      .withIndex("by_parent", (q) =>
        q.eq("parentOrganizationId", args.parentOrganizationId)
      )
      .collect();

    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const children = allChildren.slice(offset, offset + limit);

    return {
      organizations: children.map((org) => ({
        id: org._id,
        name: org.name,
        slug: org.slug,
        businessName: org.businessName,
        plan: org.plan,
        isActive: org.isActive,
        createdAt: org._creationTime,
      })),
      total: allChildren.length,
      limit,
      offset,
    };
  },
});

/**
 * GET CHILD ORGANIZATION BY ID
 *
 * Returns a single child org, verifying it belongs to the parent.
 */
export const getChildOrganizationInternal = internalQuery({
  args: {
    parentOrganizationId: v.id("organizations"),
    childOrganizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.childOrganizationId);
    if (!child) return null;

    // Verify parent-child relationship
    if (String(child.parentOrganizationId) !== String(args.parentOrganizationId)) {
      return null;
    }

    return {
      id: child._id,
      name: child.name,
      slug: child.slug,
      businessName: child.businessName,
      plan: child.plan,
      isActive: child.isActive,
      createdAt: child._creationTime,
    };
  },
});

/**
 * UPDATE CHILD ORGANIZATION
 */
export const updateChildOrganizationInternal = internalMutation({
  args: {
    parentOrganizationId: v.id("organizations"),
    childOrganizationId: v.id("organizations"),
    updates: v.object({
      name: v.optional(v.string()),
      businessName: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.childOrganizationId);
    if (!child) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Child organization not found" });
    }

    if (String(child.parentOrganizationId) !== String(args.parentOrganizationId)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Organization is not a child of the specified parent" });
    }

    const patch: Record<string, unknown> = {};
    if (args.updates.name !== undefined) patch.name = args.updates.name;
    if (args.updates.businessName !== undefined) patch.businessName = args.updates.businessName;
    if (args.updates.isActive !== undefined) patch.isActive = args.updates.isActive;

    await ctx.db.patch(args.childOrganizationId, patch);
  },
});
