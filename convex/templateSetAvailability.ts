import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * TEMPLATE SET AVAILABILITY ONTOLOGY
 *
 * Manages which template set objects are available to each organization.
 * Follows the same pattern as pdfTemplateAvailability, formTemplateAvailability, etc.
 *
 * Template Sets bundle ticket, invoice, and email templates for consistent branding.
 * Super admins control which template sets each organization can access.
 */

/**
 * Enable a Template Set for an organization
 *
 * Only super admins can enable template sets.
 * Creates a template_set_availability object.
 */
export const enableTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateSetId: v.id("objects"),
    customSettings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can call compatibility mutations.
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
      throw new Error("Permission denied: Only super admins can enable template sets");
    }

    // Keep validation behavior for compatibility callers.
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Keep template set existence validation for better operator feedback.
    const templateSet = await ctx.db.get(args.templateSetId);
    if (!templateSet || templateSet.type !== "template_set") {
      throw new Error("Template set not found");
    }

    console.warn(
      `⚠️ [Template Availability] enableTemplateSet is deprecated. No write performed for template set ${args.templateSetId}.`
    );
    return {
      success: true,
      deprecated: true,
      noop: true,
      action: "enable",
      organizationId: args.organizationId,
      templateSetId: args.templateSetId,
      message:
        "Template set availability writes are deprecated. System template sets are globally available by policy.",
    };
  },
});

/**
 * Disable a Template Set for an organization
 *
 * Only super admins can disable template sets.
 */
export const disableTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateSetId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can call compatibility mutations.
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
      throw new Error("Permission denied: Only super admins can disable template sets");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    const templateSet = await ctx.db.get(args.templateSetId);
    if (!templateSet || templateSet.type !== "template_set") {
      throw new Error("Template set not found");
    }

    console.warn(
      `⚠️ [Template Availability] disableTemplateSet is deprecated. No write performed for template set ${args.templateSetId}.`
    );
    return {
      success: true,
      deprecated: true,
      noop: true,
      action: "disable",
      organizationId: args.organizationId,
      templateSetId: args.templateSetId,
      message:
        "Template set availability writes are deprecated. System template sets are globally available by policy.",
    };
  },
});

/**
 * Get available Template Sets for an organization
 *
 * UPDATED: All template sets are now available to all organizations.
 * The tier-based licensing system (tierConfigs.ts) handles feature limits.
 * Legacy availability rules are no longer checked.
 */
export const getAvailableTemplateSets = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== args.organizationId) {
      throw new Error("Cannot view template sets for another organization");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Fetch all system template sets
    const systemSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    // All template sets are now available to all organizations
    // Feature limits are enforced by the tier system (tierConfigs.ts)

    // Format results
    return systemSets.map((set) => {
      const props = set.customProperties || {};
      return {
        _id: set._id,
        name: set.name,
        description: set.description || "",
        isDefault: props.isDefault as boolean || false,
        isSystemSet: true, // All template sets are system-level
        tags: props.tags as string[] || [],
        previewImageUrl: props.previewImageUrl as string | undefined,
        ticketTemplateId: props.ticketTemplateId as string,
        invoiceTemplateId: props.invoiceTemplateId as string,
        emailTemplateId: props.emailTemplateId as string,
      };
    });
  },
});

/**
 * List all Template Sets with availability status (Super Admin only)
 *
 * Returns all system template sets with their availability status for a specific org.
 * Used by super admins to manage which sets are enabled for each organization.
 */
export const listTemplateSetsWithAvailability = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can list all template sets with availability
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
      throw new Error("Permission denied: Only super admins can list template sets with availability");
    }

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system template sets
    const allSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    // Return with availability status
    return allSets.map((set) => {
      const props = set.customProperties || {};
      return {
        _id: set._id,
        name: set.name,
        description: set.description || "",
        isSystemDefault: props.isSystemDefault as boolean || false,
        tags: props.tags as string[] || [],
        previewImageUrl: props.previewImageUrl as string | undefined,
        ticketTemplateId: props.ticketTemplateId as string,
        invoiceTemplateId: props.invoiceTemplateId as string,
        emailTemplateId: props.emailTemplateId as string,
        // Read-only policy: template sets are universally available.
        availableForOrg: true,
      };
    });
  },
});

/**
 * Get All Template Set Availabilities (Super Admin UI)
 *
 * Returns ALL template_set_availability objects across ALL organizations.
 * Used by the super admin matrix UI to display which template sets are available to which orgs.
 */
export const getAllTemplateSetAvailabilities = query({
  args: {
    sessionId: v.string(),
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
      throw new Error("Permission denied: Only super admins can view all template set availabilities");
    }

    // Get all template_set_availability objects across all organizations
    const allAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "template_set_availability"))
      .collect();

    return allAvailabilities.map((a) => {
      const props = a.customProperties || {};
      return {
        _id: a._id,
        organizationId: a.organizationId,
        templateSetId: props.templateSetId as string,
        available: props.available as boolean || false,
        customSettings: props.customSettings || {},
      };
    });
  },
});

/**
 * Get All System Template Sets (Super Admin UI)
 *
 * Returns all template sets from the system organization.
 * Used by the super admin matrix UI to show columns for each template set.
 */
export const getAllSystemTemplateSets = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view system template sets
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
      throw new Error("Permission denied: Only super admins can view system template sets");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all template sets from system organization
    const templateSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    return templateSets.map((set) => {
      const props = set.customProperties || {};
      return {
        _id: set._id,
        name: set.name,
        description: set.description || "",
        isSystemDefault: props.isSystemDefault as boolean || false,
        tags: props.tags as string[] || [],
        previewImageUrl: props.previewImageUrl as string | undefined,
        ticketTemplateId: props.ticketTemplateId as string,
        invoiceTemplateId: props.invoiceTemplateId as string,
        emailTemplateId: props.emailTemplateId as string,
      };
    });
  },
});
