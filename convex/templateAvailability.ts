import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * TEMPLATE AVAILABILITY ONTOLOGY
 *
 * Manages which page_template objects are available to each organization.
 * Similar to appAvailabilities table pattern.
 *
 * Philosophy: Forward-deployed engineer approach
 * - We build templates (code)
 * - We seed templates (database)
 * - Super admin enables templates for orgs
 * - Org owners use enabled templates
 */

/**
 * Enable a template for an organization
 *
 * Only super admins can enable templates.
 * Creates a template_availability object.
 */
export const enableTemplateForOrg = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    pageTemplateCode: v.string(),
    customSettings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can enable templates
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
      throw new Error("Permission denied: Only super admins can enable templates for organizations");
    }

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Verify template exists
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    const template = allTemplates.find(
      (t) => t.customProperties?.code === args.pageTemplateCode
    );

    if (!template) {
      throw new Error(`Template with code "${args.pageTemplateCode}" not found`);
    }

    // Check if availability already exists
    const existingAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .collect();

    const existing = existingAvailabilities.find(
      (a) => a.customProperties?.pageTemplateCode === args.pageTemplateCode
    );

    if (existing) {
      // Update existing availability
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...existing.customProperties,
          isEnabled: true,
          enabledBy: userId,
          enabledAt: Date.now(),
          customSettings: args.customSettings || existing.customProperties?.customSettings || {},
        },
        updatedAt: Date.now(),
      });

      // Audit log
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: existing._id,
        actionType: "template_enabled",
        actionData: {
          pageTemplateCode: args.pageTemplateCode,
          templateName: template.name,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return { availabilityId: existing._id, updated: true };
    } else {
      // Create new availability
      const availabilityId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "template_availability",
        subtype: "page_template",
        name: `${template.name} - Availability`,
        status: "published",
        customProperties: {
          pageTemplateCode: args.pageTemplateCode,
          isEnabled: true,
          enabledBy: userId,
          enabledAt: Date.now(),
          customSettings: args.customSettings || {},
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Audit log
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: availabilityId,
        actionType: "template_enabled",
        actionData: {
          pageTemplateCode: args.pageTemplateCode,
          templateName: template.name,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return { availabilityId, updated: false };
    }
  },
});

/**
 * Disable a template for an organization
 *
 * Only super admins can disable templates.
 */
export const disableTemplateForOrg = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    pageTemplateCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can disable templates
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
      throw new Error("Permission denied: Only super admins can disable templates for organizations");
    }

    // Find existing availability
    const existingAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .collect();

    const existing = existingAvailabilities.find(
      (a) => a.customProperties?.pageTemplateCode === args.pageTemplateCode
    );

    if (!existing) {
      throw new Error("Template availability not found");
    }

    // Update to disabled
    await ctx.db.patch(existing._id, {
      customProperties: {
        ...existing.customProperties,
        isEnabled: false,
        disabledBy: userId,
        disabledAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: existing._id,
      actionType: "template_disabled",
      actionData: {
        pageTemplateCode: args.pageTemplateCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get available templates for an organization
 *
 * Returns only templates that are enabled for this org.
 * Used by org owners when creating published pages.
 */
export const getAvailableTemplatesForOrg = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(v.string()), // Filter by category (events, checkout, invoicing, etc.)
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
      throw new Error("Cannot view templates for another organization");
    }

    // Get enabled availabilities for this org
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .filter((q) => q.eq(q.field("customProperties.isEnabled"), true))
      .collect();

    const enabledTemplateCodes = availabilities.map(
      (a) => a.customProperties?.pageTemplateCode
    );

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system templates
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter to only enabled templates
    let availableTemplates = allTemplates.filter((template) =>
      enabledTemplateCodes.includes(template.customProperties?.code)
    );

    // Filter by category if specified
    if (args.category) {
      availableTemplates = availableTemplates.filter(
        (template) => template.customProperties?.category === args.category
      );
    }

    // Enhance with availability info
    return availableTemplates.map((template) => {
      const availability = availabilities.find(
        (a) => a.customProperties?.pageTemplateCode === template.customProperties?.code
      );

      return {
        ...template,
        availability: {
          customSettings: availability?.customProperties?.customSettings || {},
          enabledAt: availability?.customProperties?.enabledAt,
        },
      };
    });
  },
});

/**
 * Get all template availabilities (super admin view)
 *
 * Shows which templates are enabled for which orgs.
 * Used in super admin UI.
 */
export const getAllTemplateAvailabilities = query({
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
      throw new Error("Permission denied: Only super admins can view all template availabilities");
    }

    // Get availabilities
    const queryBuilder = ctx.db.query("objects").withIndex("by_type", (q) => q.eq("type", "template_availability"));

    // Filter by org if specified
    if (args.organizationId) {
      const availabilities = await queryBuilder.collect();
      const filtered = availabilities.filter((a) => a.organizationId === args.organizationId);

      return await Promise.all(
        filtered.map(async (availability) => {
          const org = await ctx.db.get(availability.organizationId);
          return {
            ...availability,
            organizationName: org?.name || "Unknown",
            organizationSlug: org?.slug || "unknown",
          };
        })
      );
    }

    const availabilities = await queryBuilder.collect();

    // Enhance with org info
    return await Promise.all(
      availabilities.map(async (availability) => {
        const org = await ctx.db.get(availability.organizationId);
        return {
          ...availability,
          organizationName: org?.name || "Unknown",
          organizationSlug: org?.slug || "unknown",
        };
      })
    );
  },
});

/**
 * Get template by code (helper for UI)
 */
export const getTemplateByCode = query({
  args: {
    sessionId: v.string(),
    templateCode: v.string(),
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

    // Find template
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    const template = allTemplates.find(
      (t) => t.customProperties?.code === args.templateCode
    );

    if (!template) {
      return null;
    }

    return template;
  },
});

/**
 * Get all system templates (super admin view)
 *
 * Used in super admin UI to see which templates can be enabled.
 */
export const getAllSystemTemplates = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all templates
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
      throw new Error("Permission denied: Only super admins can view all templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system templates
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    return templates;
  },
});

/**
 * Get all system themes (available to ALL organizations)
 *
 * Themes do NOT have an availability system - they are always available to everyone.
 * Any authenticated user can view all themes.
 */
export const getAllSystemThemes = query({
  args: {
    sessionId: v.string(),
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

    // Get all system themes - available to everyone
    const themes = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "theme")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    return themes;
  },
});
