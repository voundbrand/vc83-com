import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * TEMPLATE ONTOLOGY
 *
 * Manages page_template objects and their application to published content.
 * Templates provide consistent styling across all page types.
 */

/**
 * Get available templates for a specific page type
 *
 * Returns both system templates and organization-specific templates.
 */
export const getAvailableTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    pageType: v.optional(v.string()), // Filter by supported type
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

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

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system templates
    const systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "page"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Get org-specific templates
    const orgTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "page"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    const allTemplates = [...systemTemplates, ...orgTemplates];

    // Filter by page type if specified
    if (args.pageType) {
      return allTemplates.filter((template) => {
        const supportedTypes = template.customProperties?.supportedTypes || [];
        return supportedTypes.includes(args.pageType);
      });
    }

    return allTemplates;
  },
});

/**
 * Apply template to a published page
 *
 * Creates or updates the objectLink with template customizations.
 */
export const applyTemplateToPage = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
    templateId: v.id("objects"),
    colorOverrides: v.optional(v.any()),
    sectionVisibility: v.optional(v.any()),
    customCss: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get page object
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");

    const userContext = await getUserContext(ctx, userId, page.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "apply_templates",
      page.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: apply_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== page.organizationId) {
      throw new Error("Cannot apply template to another organization's page");
    }

    // Get template
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Verify template is published
    if (template.status !== "published") {
      throw new Error("Template is not published");
    }

    // Check if link already exists
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.pageId).eq("linkType", "uses_template")
      )
      .first();

    if (existingLink) {
      // Update existing link
      await ctx.db.patch(existingLink._id, {
        toObjectId: args.templateId,
        properties: {
          colorOverrides: args.colorOverrides || {},
          sectionVisibility: args.sectionVisibility || {},
          customCss: args.customCss || "",
          appliedAt: Date.now(),
        },
      });
    } else {
      // Create new link
      await ctx.db.insert("objectLinks", {
        fromObjectId: args.pageId,
        toObjectId: args.templateId,
        linkType: "uses_template",
        organizationId: page.organizationId,
        properties: {
          colorOverrides: args.colorOverrides || {},
          sectionVisibility: args.sectionVisibility || {},
          customCss: args.customCss || "",
          appliedAt: Date.now(),
        },
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: page.organizationId,
      objectId: args.pageId,
      actionType: "template_applied",
      actionData: {
        templateId: args.templateId,
        templateName: template.name,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get page with template applied
 *
 * Fetches page object, template, and merges overrides.
 */
export const getPageWithTemplate = query({
  args: {
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get page object
    const page = await ctx.db.get(args.pageId);
    if (!page) return null;

    // Fetch template link
    const templateLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.pageId).eq("linkType", "uses_template")
      )
      .first();

    if (!templateLink) {
      // No template applied
      return {
        page,
        template: null,
        mergedConfig: null,
      };
    }

    // Fetch template
    const template = await ctx.db.get(templateLink.toObjectId);
    if (!template) {
      return {
        page,
        template: null,
        mergedConfig: null,
      };
    }

    // Merge template config with overrides
    const templateConfig = template.customProperties || {};
    const overrides = templateLink.properties || {};

    const mergedDesignTokens = {
      ...templateConfig.designTokens,
      colors: {
        ...templateConfig.designTokens?.colors,
        ...(overrides.colorOverrides || {}),
      },
    };

    const mergedConfig = {
      ...templateConfig,
      designTokens: mergedDesignTokens,
      sections: (templateConfig.sections || []).map((section: { id: string }) => ({
        ...section,
        visible:
          overrides.sectionVisibility?.[section.id] !== undefined
            ? overrides.sectionVisibility[section.id]
            : true,
      })),
      customCss:
        templateConfig.customCss + "\n\n" + (overrides.customCss || ""),
    };

    return {
      page,
      template,
      mergedConfig,
      overrides,
    };
  },
});

/**
 * Create custom template for organization
 */
export const createCustomTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(),
    description: v.string(),
    designTokens: v.any(),
    sections: v.any(),
    customCss: v.optional(v.string()),
    supportedTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "create_templates",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: create_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== args.organizationId) {
      throw new Error("Cannot create template for another organization");
    }

    // Check code uniqueness within org
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "page"))
      .collect();

    const existingByCode = allTemplates.find(
      (template) => template.customProperties?.code === args.code
    );

    if (existingByCode) {
      throw new Error(`Template code "${args.code}" is already in use`);
    }

    // Create template
    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template",
      subtype: "page",
      name: args.name,
      status: "draft",
      customProperties: {
        code: args.code,
        description: args.description,
        previewImageUrl: "",
        author: "Custom Template",
        version: "1.0.0",
        supportedTypes: args.supportedTypes,
        layout: {
          type: "centered",
          maxWidth: "1200px",
          padding: "2rem",
          responsive: true,
        },
        designTokens: args.designTokens,
        sections: args.sections,
        customCss: args.customCss || "",
        customJs: "",
        a11y: {
          highContrast: true,
          keyboardNav: true,
          screenReaderOptimized: true,
          minFontSize: "16px",
        },
        performance: {
          lazyLoadImages: true,
          optimizeAssets: true,
          criticalCss: true,
        },
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "created",
      actionData: {
        code: args.code,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { templateId };
  },
});

/**
 * Update existing template
 */
export const updateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      designTokens: v.optional(v.any()),
      sections: v.optional(v.any()),
      customCss: v.optional(v.string()),
      supportedTypes: v.optional(v.array(v.string())),
      // Allow full customProperties update for schema editor
      customProperties: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    const userContext = await getUserContext(ctx, userId, template.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== template.organizationId) {
      throw new Error("Cannot edit template for another organization");
    }

    // Update template
    // If customProperties is provided, use it directly (schema editor full update)
    // Otherwise, merge individual fields (backward compatibility)
    const updatedProperties = args.updates.customProperties
      ? args.updates.customProperties
      : {
          ...template.customProperties,
          ...args.updates,
        };

    await ctx.db.patch(args.templateId, {
      name: args.updates.name || template.name,
      description: args.updates.description || template.description,
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "updated",
      actionData: {
        before: template.customProperties,
        after: updatedProperties,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove template from page
 */
export const removeTemplateFromPage = mutation({
  args: {
    sessionId: v.string(),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");

    await getUserContext(ctx, userId, page.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "apply_templates",
      page.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: apply_templates required");
    }

    // Find and delete template link
    const templateLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.pageId).eq("linkType", "uses_template")
      )
      .first();

    if (templateLink) {
      await ctx.db.delete(templateLink._id);

      // Audit log
      await ctx.db.insert("objectActions", {
        organizationId: page.organizationId,
        objectId: args.pageId,
        actionType: "template_removed",
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Get Email Template by ID
 *
 * Used by email template renderer to resolve template codes.
 */
export const getEmailTemplateById = query({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) return null;

    if (template.type !== "template" || template.subtype !== "email") {
      return null;
    }

    return template;
  },
});

/**
 * Get PDF Template by ID
 *
 * Used by PDF template renderer to resolve template codes.
 */
export const getPdfTemplateById = query({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) return null;

    if (template.type !== "template" || template.subtype !== "pdf_ticket") {
      return null;
    }

    return template;
  },
});

/**
 * List PDF Ticket Templates
 *
 * Returns both system templates and organization-specific PDF ticket templates.
 */
export const listPdfTicketTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

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

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system templates
    const systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf_ticket"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Get org-specific templates
    const orgTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf_ticket"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    return [...systemTemplates, ...orgTemplates];
  },
});

/**
 * Create PDF Ticket Template
 *
 * Creates a custom PDF ticket template for an organization.
 * The template stores the template code which references a registered template.
 */
export const createPdfTicketTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(), // References registered template code (e.g., "elegant-gold")
    description: v.string(),
    category: v.union(
      v.literal("elegant"),
      v.literal("modern"),
      v.literal("vip"),
      v.literal("festival"),
      v.literal("minimal")
    ),
    features: v.optional(v.any()), // Template-specific features
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "create_templates",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: create_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== args.organizationId) {
      throw new Error("Cannot create template for another organization");
    }

    // Check code uniqueness within org
    const existingTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf_ticket"))
      .collect();

    const existingByCode = existingTemplates.find(
      (template) => template.customProperties?.code === args.code
    );

    if (existingByCode) {
      throw new Error(`PDF template code "${args.code}" is already in use`);
    }

    // Create template
    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template",
      subtype: "pdf_ticket",
      name: args.name,
      status: "published", // Auto-publish org templates
      customProperties: {
        code: args.code,
        description: args.description,
        category: args.category,
        features: args.features || {},
        author: "Organization Custom",
        version: "1.0.0",
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "created",
      actionData: {
        code: args.code,
        category: args.category,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { templateId };
  },
});

/**
 * Update PDF Ticket Template
 *
 * Updates an existing PDF ticket template.
 */
export const updatePdfTicketTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      features: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    if (template.type !== "template" || template.subtype !== "pdf_ticket") {
      throw new Error("Not a PDF ticket template");
    }

    const userContext = await getUserContext(ctx, userId, template.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== template.organizationId) {
      throw new Error("Cannot edit template for another organization");
    }

    // Update template
    const updatedProperties = {
      ...template.customProperties,
      ...args.updates,
    };

    await ctx.db.patch(args.templateId, {
      name: args.updates.name || template.name,
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "updated",
      actionData: {
        before: template.customProperties,
        after: updatedProperties,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get Template By ID
 *
 * Fetches a single template by its ID.
 * Checks permissions to ensure user has access to this template.
 */
export const getTemplateById = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    // Validate it's a template
    if (template.type !== "template") {
      throw new Error("Object is not a template");
    }

    // Check permission in template's organization
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    return template;
  },
});

/**
 * Get User Templates
 *
 * Fetches all templates (email, PDF, etc.) for a specific organization.
 * Returns both draft and published templates for management.
 */
export const getUserTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

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

    // Get all templates for this organization
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    // Only exclude "page" templates (they're used for a different system)
    // All email and PDF templates (with any subtype) should be returned
    // Filtering by email/pdf type happens on the frontend
    const emailAndPdfTemplates = templates.filter((t) => {
      const subtype = t.subtype;
      if (!subtype) return false;

      // Exclude page templates only
      if (subtype === "page") return false;

      return true;
    });

    return emailAndPdfTemplates;
  },
});

/**
 * GET ALL TEMPLATES INCLUDING SYSTEM
 *
 * Returns BOTH organization templates AND system templates for the "All Templates" tab.
 * System templates are marked with isSystemTemplate=true for UI badging.
 *
 * This allows organization owners to see all available templates with clear distinction:
 * - Organization templates (can be edited)
 * - System templates (can be duplicated, shown with "System" badge)
 */
export const getAllTemplatesIncludingSystem = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

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

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // 🔧 FIX: Get template availability records for this organization
    // Only show system templates that have been enabled via availability ontology
    const templateAvailabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_availability")
      )
      .filter((q) => q.eq(q.field("customProperties.available"), true))
      .collect();

    const enabledTemplateIds = new Set(
      templateAvailabilities
        .map((a) => a.customProperties?.templateId)
        .filter((id): id is string => typeof id === "string")
    );

    console.log(`🔍 [Templates] Org ${args.organizationId} has ${enabledTemplateIds.size} enabled templates`);

    // Get system templates (email and PDF only, exclude page templates)
    const systemTemplatesRaw = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    const systemTemplates = systemTemplatesRaw
      .filter((t) => {
        const subtype = t.subtype;
        if (!subtype || subtype === "page") return false;

        // 🔧 FIX: Only include system templates that are enabled for this organization
        if (!enabledTemplateIds.has(t._id)) {
          console.log(`⚠️ [Templates] Filtering out system template "${t.name}" - not enabled for org`);
          return false;
        }

        return true;
      })
      .map((t) => ({
        ...t,
        isSystemTemplate: true, // Add flag for UI badging
      }));

    console.log(`✅ [Templates] Showing ${systemTemplates.length} enabled system templates`);

    // Get organization templates (email and PDF only, exclude page templates)
    // Organization's own templates should ALWAYS be visible
    const orgTemplatesRaw = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    const orgTemplates = orgTemplatesRaw
      .filter((t) => {
        const subtype = t.subtype;
        if (!subtype || subtype === "page") return false;
        return true;
      })
      .map((t) => ({
        ...t,
        isSystemTemplate: false, // Org templates are NOT system templates
      }));

    console.log(`✅ [Templates] Showing ${orgTemplates.length} organization templates`);

    // Combine: org templates first, then system templates
    const allTemplates = [...orgTemplates, ...systemTemplates];

    return allTemplates;
  },
});

/**
 * Toggle Template Status (Publish/Unpublish)
 *
 * Toggles template between "draft" (inactive) and "published" (active).
 */
export const toggleTemplateStatus = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Validate it's a template
    if (template.type !== "template") {
      throw new Error("Object is not a template");
    }

    const userContext = await getUserContext(ctx, userId, template.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== template.organizationId) {
      throw new Error("Cannot toggle status for template in another organization");
    }

    // Toggle status
    const newStatus = template.status === "published" ? "draft" : "published";

    await ctx.db.patch(args.templateId, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: newStatus === "published" ? "published" : "unpublished",
      actionData: {
        templateName: template.name,
        previousStatus: template.status,
        newStatus,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, newStatus };
  },
});

/**
 * Delete Template
 *
 * Deletes a template (email or PDF). Cannot delete default templates.
 */
export const deleteTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Validate it's a template
    if (template.type !== "template") {
      throw new Error("Object is not a template");
    }

    const userContext = await getUserContext(ctx, userId, template.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "delete_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: delete_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== template.organizationId) {
      throw new Error("Cannot delete template from another organization");
    }

    // Prevent deletion of default templates
    if (template.customProperties?.isDefault === true) {
      throw new Error("Cannot delete default template. Please set another template as default first.");
    }

    // Store template info for audit log
    const templateInfo = {
      name: template.name,
      code: template.customProperties?.code,
      category: template.customProperties?.category,
      subtype: template.subtype,
    };

    // Delete the template
    await ctx.db.delete(args.templateId);

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "deleted",
      actionData: {
        templateInfo,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Duplicate Template
 *
 * Creates a copy of an existing template with "Copy of" prefix.
 * The duplicate is created in the target organization (defaults to user's org).
 * The duplicate is NOT set as default, even if the source template was.
 * Validates that the subtype is valid for the template type.
 */
export const duplicateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    targetOrganizationId: v.optional(v.id("organizations")), // Where to create the duplicate
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const sourceTemplate = await ctx.db.get(args.templateId);
    if (!sourceTemplate) throw new Error("Template not found");

    // Validate it's a template
    if (sourceTemplate.type !== "template") {
      throw new Error("Object is not a template");
    }

    // Validate subtype is valid (if it's an email or PDF template)
    // Email templates should have subtype "email" or a valid email template type
    // PDF templates should have a valid PDF template type
    // Note: This is defensive validation - templates should already have valid subtypes
    if (sourceTemplate.subtype) {
      const subtype = sourceTemplate.subtype;
      // Accept legacy "email" and "pdf" subtypes for backward compatibility
      // Also accept all predefined template types from template-types.ts
      const isValidSubtype =
        subtype === "email" ||
        subtype === "pdf" ||
        subtype === "page" ||
        subtype === "pdf_ticket" || // Legacy
        // Modern template types (from template-types.ts)
        subtype === "transactional" || subtype === "event_confirmation" ||
        subtype === "event_reminder" || subtype === "event_followup" ||
        subtype === "newsletter" || subtype === "marketing" ||
        subtype === "promotional" || subtype === "invoice" ||
        subtype === "receipt" || subtype === "shipping" ||
        subtype === "support" || subtype === "account" ||
        subtype === "notification" || subtype === "welcome" ||
        subtype === "ticket" || subtype === "certificate" ||
        subtype === "badge" || subtype === "program" ||
        subtype === "quote" || subtype === "proposal" ||
        subtype === "contract" || subtype === "report" ||
        subtype === "ebook" || subtype === "guide" ||
        subtype === "checklist" || subtype === "flyer" ||
        subtype === "other";

      if (!isValidSubtype) {
        console.warn(`Template ${sourceTemplate._id} has unknown subtype: ${subtype}`);
      }
    }

    // Determine target organization (where duplicate will be created)
    // If not specified, try to get user's current organization
    let targetOrgId = args.targetOrganizationId;

    if (!targetOrgId) {
      // Get user's default organization (first one they're a member of)
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!membership) {
        throw new Error("User is not a member of any organization");
      }

      targetOrgId = membership.organizationId;
    }

    const userContext = await getUserContext(ctx, userId, targetOrgId);

    // Check permission in TARGET organization (where duplicate will be created)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "create_templates",
      targetOrgId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: create_templates required");
    }

    // Validate organization membership in target org
    if (!userContext.isGlobal && userContext.organizationId !== targetOrgId) {
      throw new Error("Cannot create template in this organization");
    }

    // Generate unique name and code
    const newName = `Copy of ${sourceTemplate.name}`;
    const timestamp = Date.now();
    const sourceCode = sourceTemplate.customProperties?.code || "template";
    const newCode = `${sourceCode}-copy-${timestamp}`;

    // Copy all custom properties but reset isDefault
    const newCustomProperties = {
      ...sourceTemplate.customProperties,
      code: newCode,
      isDefault: false, // Never duplicate as default
    };

    // Create the duplicate template in TARGET organization
    const newTemplateId = await ctx.db.insert("objects", {
      organizationId: targetOrgId, // Use target org, not source org!
      type: sourceTemplate.type,
      subtype: sourceTemplate.subtype,
      name: newName,
      description: sourceTemplate.description,
      status: "draft", // Start as draft
      locale: sourceTemplate.locale,
      value: sourceTemplate.value,
      customProperties: newCustomProperties,
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Audit log in TARGET organization
    await ctx.db.insert("objectActions", {
      organizationId: targetOrgId, // Log in target org
      objectId: newTemplateId,
      actionType: "created",
      actionData: {
        duplicatedFrom: args.templateId,
        sourceTemplateName: sourceTemplate.name,
        sourceOrganizationId: sourceTemplate.organizationId,
        newCode,
      },
      performedBy: userId,
      performedAt: timestamp,
    });

    return { templateId: newTemplateId, name: newName };
  },
});

/**
 * Set Default Template
 *
 * Sets a template as the default for its category.
 * Automatically unsets any other default templates in the same category.
 */
export const setDefaultTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    category: v.string(), // e.g., "transactional", "marketing", "event"
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Validate it's a template
    if (template.type !== "template") {
      throw new Error("Object is not a template");
    }

    const userContext = await getUserContext(ctx, userId, template.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== template.organizationId) {
      throw new Error("Cannot set default for template in another organization");
    }

    // Verify category matches
    const templateCategory = template.customProperties?.category;
    if (templateCategory !== args.category) {
      throw new Error(
        `Template category "${templateCategory}" does not match specified category "${args.category}"`
      );
    }

    // Check if this template is already default
    const isCurrentlyDefault = template.customProperties?.isDefault === true;

    // Find all templates in this organization with the same category and subtype
    const allTemplatesInCategory = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", template.organizationId).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), template.subtype))
      .collect();

    // Filter by category in customProperties
    const templatesInCategory = allTemplatesInCategory.filter(
      (t) => t.customProperties?.category === args.category
    );

    if (isCurrentlyDefault) {
      // UNSET: Remove default status from this template
      await ctx.db.patch(args.templateId, {
        customProperties: {
          ...template.customProperties,
          isDefault: false,
        },
        updatedAt: Date.now(),
      });
    } else {
      // SET: Unset default for all other templates in this category
      for (const t of templatesInCategory) {
        if (t._id !== args.templateId && t.customProperties?.isDefault === true) {
          await ctx.db.patch(t._id, {
            customProperties: {
              ...t.customProperties,
              isDefault: false,
            },
            updatedAt: Date.now(),
          });
        }
      }

      // Set this template as default
      await ctx.db.patch(args.templateId, {
        customProperties: {
          ...template.customProperties,
          isDefault: true,
        },
        updatedAt: Date.now(),
      });
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: isCurrentlyDefault ? "unset_default" : "set_default",
      actionData: {
        category: args.category,
        templateName: template.name,
        templateCode: template.customProperties?.code,
        wasDefault: isCurrentlyDefault,
        previousDefaults: isCurrentlyDefault
          ? []
          : templatesInCategory
              .filter((t) => t._id !== args.templateId && t.customProperties?.isDefault === true)
              .map((t) => ({ id: t._id, name: t.name })),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});
