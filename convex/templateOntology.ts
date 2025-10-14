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
        q.eq("organizationId", systemOrg._id).eq("type", "page_template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Get org-specific templates
    const orgTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "page_template")
      )
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
        q.eq("organizationId", args.organizationId).eq("type", "page_template")
      )
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
      type: "page_template",
      subtype: "full-page",
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
