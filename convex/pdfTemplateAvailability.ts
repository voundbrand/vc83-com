import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * PDF TEMPLATE AVAILABILITY ONTOLOGY
 *
 * Manages which PDF template objects are available to each organization.
 * Follows the same pattern as formTemplateAvailability and checkoutTemplateAvailability.
 *
 * Templates include: ticket PDFs, invoice PDFs, certificate PDFs
 */

/**
 * Enable a PDF template for an organization
 *
 * Only super admins can enable templates.
 * Creates a template_availability object with subtype: "pdf".
 */
export const enablePdfTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
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
      throw new Error("Permission denied: Only super admins can enable PDF templates");
    }

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Verify PDF template exists
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
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .collect();

    const template = allTemplates.find(
      (t) => t.customProperties?.code === args.templateCode
    );

    if (!template) {
      throw new Error(`PDF template with code "${args.templateCode}" not found`);
    }

    // Check if availability already exists
    const existingAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .collect();

    const existing = existingAvailabilities.find(
      (a) => a.customProperties?.templateCode === args.templateCode
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
        actionType: "pdf_template_enabled",
        actionData: {
          templateCode: args.templateCode,
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
        subtype: "pdf",
        name: `${template.name} - PDF Availability`,
        status: "published",
        customProperties: {
          templateCode: args.templateCode,
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
        actionType: "pdf_template_enabled",
        actionData: {
          templateCode: args.templateCode,
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
 * Disable a PDF template for an organization
 *
 * Only super admins can disable templates.
 */
export const disablePdfTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
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
      throw new Error("Permission denied: Only super admins can disable PDF templates");
    }

    // Find existing availability
    const existingAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .collect();

    const existing = existingAvailabilities.find(
      (a) => a.customProperties?.templateCode === args.templateCode
    );

    if (!existing) {
      return { success: true, message: "PDF template was not enabled for this organization" };
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
      actionType: "pdf_template_disabled",
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
 * Get available PDF templates for an organization
 *
 * Returns only PDF templates that are enabled for this org.
 * Used by org owners when generating tickets, invoices, certificates.
 */
export const getAvailablePdfTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(v.string()), // Filter by category (ticket, invoice, certificate)
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
      throw new Error("Cannot view PDF templates for another organization");
    }

    // Get enabled availabilities for this org
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("customProperties.available"), true))
      .collect();

    const enabledTemplateCodes = availabilities.map(
      (a) => a.customProperties?.templateCode
    );

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system PDF templates
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
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
        (a) => a.customProperties?.templateCode === template.customProperties?.code
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
 * Get all PDF template availabilities (super admin view)
 *
 * Shows which PDF templates are enabled for which orgs.
 * Used in super admin UI.
 */
export const getAllPdfTemplateAvailabilities = query({
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
      throw new Error("Permission denied: Only super admins can view all PDF template availabilities");
    }

    // Get PDF template availabilities
    const queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "template_availability"));

    // Get all availabilities and filter for PDF subtype
    const allAvailabilities = await queryBuilder.collect();
    let pdfAvailabilities = allAvailabilities.filter((a) => a.subtype === "pdf");

    // Filter by org if specified
    if (args.organizationId) {
      pdfAvailabilities = pdfAvailabilities.filter(
        (a) => a.organizationId === args.organizationId
      );
    }

    // Enhance with org info
    return await Promise.all(
      pdfAvailabilities.map(async (availability) => {
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
 * Get all system PDF templates (super admin view)
 *
 * Used in super admin UI to see which PDF templates can be enabled.
 */
export const getAllSystemPdfTemplates = query({
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
      throw new Error("Permission denied: Only super admins can view all PDF templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system PDF templates
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    return templates;
  },
});
