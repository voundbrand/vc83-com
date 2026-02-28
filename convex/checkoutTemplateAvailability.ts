/**
 * CHECKOUT TEMPLATE AVAILABILITY
 *
 * Manages which checkout templates are available to which organizations.
 * Similar to formTemplateAvailability.ts and templateAvailability.ts
 *
 * Types stored in objects table:
 * - checkout_template_availability (defines which orgs can use which checkout templates)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";

/**
 * GET AVAILABLE CHECKOUT TEMPLATES FOR ORGANIZATION
 *
 * Returns checkout templates that are available to the specified organization.
 *
 * UPDATED: All published checkout templates are now available to all organizations.
 * The tier-based licensing system (tierConfigs.ts) handles feature limits.
 * Legacy availability rules are no longer checked.
 */
export const getAvailableCheckoutTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(v.string()), // Filter by category
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system checkout templates (type: "template", subtype: "checkout")
    let systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("subtype"), "checkout"))
      .collect();

    // Filter by category if specified (category is stored in customProperties)
    if (args.category) {
      systemTemplates = systemTemplates.filter(
        (t) => t.customProperties?.category === args.category
      );
    }

    // All published templates are now available to all organizations
    // Feature limits are enforced by the tier system (tierConfigs.ts)
    return systemTemplates;
  },
});

/**
 * ENABLE CHECKOUT TEMPLATE FOR ORGANIZATION
 *
 * Makes a checkout template available to an organization.
 */
export const enableCheckoutTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission (super admin only)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_system_settings",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error(
        "Permission denied: manage_system_settings required to enable checkout templates"
      );
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    console.warn(
      `⚠️ [Template Availability] enableCheckoutTemplate is deprecated. No write performed for ${args.templateCode}.`
    );
    return {
      success: true,
      deprecated: true,
      noop: true,
      action: "enable",
      organizationId: args.organizationId,
      templateCode: args.templateCode,
      message:
        "Checkout template availability writes are deprecated. Published templates are globally available by policy.",
    };
  },
});

/**
 * DISABLE CHECKOUT TEMPLATE FOR ORGANIZATION
 *
 * Removes access to a checkout template for an organization.
 */
export const disableCheckoutTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission (super admin only)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_system_settings",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error(
        "Permission denied: manage_system_settings required to disable checkout templates"
      );
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    console.warn(
      `⚠️ [Template Availability] disableCheckoutTemplate is deprecated. No write performed for ${args.templateCode}.`
    );
    return {
      success: true,
      deprecated: true,
      noop: true,
      action: "disable",
      organizationId: args.organizationId,
      templateCode: args.templateCode,
      message:
        "Checkout template availability writes are deprecated. Published templates are globally available by policy.",
    };
  },
});

/**
 * GET ALL SYSTEM CHECKOUT TEMPLATES
 *
 * Returns all checkout templates from the system organization.
 * Used in super admin UI to see which checkout templates can be enabled.
 */
export const getAllSystemCheckoutTemplates = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all checkout templates
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can view all checkout templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all checkout templates from system org (type: "template", subtype: "checkout")
    const checkoutTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("subtype"), "checkout"))
      .collect();

    return checkoutTemplates;
  },
});

/**
 * GET ALL CHECKOUT TEMPLATE AVAILABILITIES
 *
 * Returns all checkout template availability records for all organizations.
 * Used in super admin UI.
 */
export const getAllCheckoutTemplateAvailabilities = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")), // Filter by org
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all availabilities
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can view all checkout template availabilities");
    }

    // Get availabilities
    const queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "checkout_template_availability"));

    // Optionally filter by organization
    let availabilities;
    if (args.organizationId) {
      availabilities = await queryBuilder
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .collect();
    } else {
      availabilities = await queryBuilder.collect();
    }

    return availabilities;
  },
});
