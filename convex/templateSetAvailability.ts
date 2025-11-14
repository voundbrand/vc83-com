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

    // Only super admins can enable template sets
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

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Verify template set exists
    const templateSet = await ctx.db.get(args.templateSetId);
    if (!templateSet || templateSet.type !== "template_set") {
      throw new Error("Template set not found");
    }

    // Check if availability already exists
    const existingAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set_availability")
      )
      .collect();

    const existing = existingAvailabilities.find(
      (a) => a.customProperties?.templateSetId === args.templateSetId
    );

    if (existing) {
      // Update existing availability
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...existing.customProperties,
          available: true,
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
        actionType: "template_set_enabled",
        actionData: {
          templateSetId: args.templateSetId,
          templateSetName: templateSet.name,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return { availabilityId: existing._id, updated: true };
    }

    // Create new availability
    const availabilityId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template_set_availability",
      name: `${templateSet.name} - Availability`,
      description: `Availability for template set: ${templateSet.name}`,
      status: "active",
      customProperties: {
        templateSetId: args.templateSetId,
        templateSetName: templateSet.name,
        available: true,
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
      actionType: "template_set_enabled",
      actionData: {
        templateSetId: args.templateSetId,
        templateSetName: templateSet.name,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { availabilityId, updated: false };
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

    // Only super admins can disable template sets
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

    // Find existing availability
    const existingAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set_availability")
      )
      .collect();

    const existing = existingAvailabilities.find(
      (a) => a.customProperties?.templateSetId === args.templateSetId
    );

    if (!existing) {
      return { success: true, message: "Template set was not enabled for this organization" };
    }

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

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: existing._id,
      actionType: "template_set_disabled",
      actionData: {
        templateSetId: args.templateSetId,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get available Template Sets for an organization
 *
 * Returns only template sets that are enabled for this org.
 * Used by org owners when configuring checkouts and products.
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

    // Get enabled availabilities for this org
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set_availability")
      )
      .filter((q) => q.eq(q.field("customProperties.available"), true))
      .collect();

    const enabledSetIds = availabilities.map(
      (a) => a.customProperties?.templateSetId
    ).filter(Boolean);

    if (enabledSetIds.length === 0) {
      return [];
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

    // Filter to only enabled sets
    const availableSets = systemSets.filter((set) =>
      enabledSetIds.includes(set._id)
    );

    // Format results
    return availableSets.map((set) => {
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

    // Get all availabilities for this org
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set_availability")
      )
      .collect();

    // Create a map of templateSetId -> availability status
    const availabilityMap = new Map(
      availabilities.map((a) => [
        a.customProperties?.templateSetId as string,
        a.customProperties?.available as boolean || false
      ])
    );

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
        // Availability status for this specific organization
        availableForOrg: availabilityMap.get(set._id) || false,
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
