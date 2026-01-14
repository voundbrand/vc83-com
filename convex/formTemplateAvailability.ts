/**
 * FORM TEMPLATE AVAILABILITY
 *
 * Manages which form templates are available to which organizations.
 * Similar to webPublishingTemplateAvailability.ts
 *
 * Types stored in objects table:
 * - form_template_availability (defines which orgs can use which form templates)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";

/**
 * GET AVAILABLE FORM TEMPLATES FOR ORGANIZATION
 *
 * Returns form templates that are available to the specified organization.
 *
 * UPDATED: All published form templates are now available to all organizations.
 * The tier-based licensing system (tierConfigs.ts) handles feature limits.
 * Legacy availability rules are no longer checked.
 */
export const getAvailableFormTemplates = query({
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

    // Get all system form templates (type: "template", subtype: "form")
    let systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("subtype"), "form"))
      .collect();

    // Filter by category if specified
    if (args.category) {
      systemTemplates = systemTemplates.filter(
        (t) => t.subtype === args.category
      );
    }

    // All published templates are now available to all organizations
    // Feature limits are enforced by the tier system (tierConfigs.ts)
    return systemTemplates;
  },
});

/**
 * ENABLE FORM TEMPLATE FOR ORGANIZATION
 *
 * Makes a form template available to an organization.
 */
export const enableFormTemplate = mutation({
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
        "Permission denied: manage_system_settings required to enable form templates"
      );
    }

    // Check if availability rule already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "form_template_availability")
      )
      .filter((q) =>
        q.eq(
          q.field("customProperties.templateCode"),
          args.templateCode
        )
      )
      .first();

    let availabilityRuleId: Id<"objects">;

    if (existing) {
      // Update existing rule
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...existing.customProperties,
          available: true,
          enabledBy: userId,
          enabledAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
      availabilityRuleId = existing._id;
    } else {
      // Create new availability rule
      availabilityRuleId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "form_template_availability",
        name: `Form Template Availability: ${args.templateCode}`,
        status: "active",
        customProperties: {
          templateCode: args.templateCode,
          available: true,
          enabledBy: userId,
          enabledAt: Date.now(),
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: availabilityRuleId,
      actionType: "form_template_enabled",
      actionData: {
        templateCode: args.templateCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DISABLE FORM TEMPLATE FOR ORGANIZATION
 *
 * Removes access to a form template for an organization.
 */
export const disableFormTemplate = mutation({
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
        "Permission denied: manage_system_settings required to disable form templates"
      );
    }

    // Find availability rule
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "form_template_availability")
      )
      .filter((q) =>
        q.eq(
          q.field("customProperties.templateCode"),
          args.templateCode
        )
      )
      .first();

    let availabilityRuleId: Id<"objects">;

    if (existing) {
      // Update to disabled
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...existing.customProperties,
          available: false,
          disabledBy: userId,
          disabledAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
      availabilityRuleId = existing._id;
    } else {
      // Create disabled rule
      availabilityRuleId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "form_template_availability",
        name: `Form Template Availability: ${args.templateCode}`,
        status: "active",
        customProperties: {
          templateCode: args.templateCode,
          available: false,
          disabledBy: userId,
          disabledAt: Date.now(),
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: availabilityRuleId,
      actionType: "form_template_disabled",
      actionData: {
        templateCode: args.templateCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET ALL SYSTEM FORM TEMPLATES
 *
 * Returns all form templates from the system organization.
 * Used in super admin UI to see which form templates can be enabled.
 */
export const getAllSystemFormTemplates = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all form templates
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
      throw new Error("Permission denied: Only super admins can view all form templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all form templates from system org (type: "template", subtype: "form")
    const formTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("subtype"), "form"))
      .collect();

    return formTemplates;
  },
});

/**
 * GET ALL FORM TEMPLATE AVAILABILITIES
 *
 * Returns all form template availability records for all organizations.
 * Used in super admin UI.
 */
export const getAllFormTemplateAvailabilities = query({
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
      throw new Error("Permission denied: Only super admins can view all form template availabilities");
    }

    // Get availabilities
    const queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "form_template_availability"));

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
