/**
 * TEMPLATE SET ONTOLOGY (v2.0 - Flexible Composition)
 *
 * Template Sets bundle ANY combination of templates for consistent branding.
 *
 * Architecture:
 * - v2.0: Flexible composition (1+ templates of any type)
 * - v1.0: Legacy 3-template structure (backward compatible)
 * - Precedence: Manual > Product > Checkout > Domain > Organization > System
 *
 * Object Type: template_set
 * Type: "template_set"
 * Subtype: N/A (no subtypes for sets)
 *
 * v2.0 Example (Flexible):
 * {
 *   type: "template_set",
 *   name: "VIP Premium Package",
 *   description: "Complete VIP branding with 5 templates",
 *   customProperties: {
 *     version: "2.0",
 *     templates: [
 *       { templateId: "...", templateType: "ticket", isRequired: true, displayOrder: 1 },
 *       { templateId: "...", templateType: "invoice", isRequired: true, displayOrder: 2 },
 *       { templateId: "...", templateType: "email", isRequired: true, displayOrder: 3 },
 *       { templateId: "...", templateType: "badge", isRequired: false, displayOrder: 4 },
 *       { templateId: "...", templateType: "program", isRequired: false, displayOrder: 5 }
 *     ],
 *     isDefault: true,
 *     isSystemDefault: false,
 *     tags: ["vip", "premium", "luxury"]
 *   }
 * }
 *
 * v1.0 Example (Legacy - Backward Compatible):
 * {
 *   type: "template_set",
 *   name: "Classic Set",
 *   customProperties: {
 *     version: "1.0",
 *     ticketTemplateId: "...",
 *     invoiceTemplateId: "...",
 *     emailTemplateId: "...",
 *     isDefault: true
 *   }
 * }
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * CREATE TEMPLATE SET (v2.0 - Flexible Composition)
 *
 * Creates a new template set with ANY combination of templates.
 * Supports both v1.0 (legacy 3-template) and v2.0 (flexible array) formats.
 */
export const createTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),

    // v2.0 format (flexible composition)
    templates: v.optional(v.array(v.object({
      templateId: v.id("objects"),
      templateType: v.string(), // "ticket" | "invoice" | "email" | "badge" | "receipt" | "program" | "quote" | etc.
      isRequired: v.optional(v.boolean()),
      displayOrder: v.optional(v.number()),
    }))),

    // v1.0 format (legacy - backward compatible)
    ticketTemplateId: v.optional(v.id("objects")),
    invoiceTemplateId: v.optional(v.id("objects")),
    emailTemplateId: v.optional(v.id("objects")),

    isDefault: v.optional(v.boolean()),
    isSystemDefault: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    previewImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

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

    // Determine version and validate
    let version = "2.0";
    let templatesList: Array<{ templateId: Id<"objects">; templateType: string; isRequired: boolean; displayOrder: number }> = [];

    if (args.templates && args.templates.length > 0) {
      // v2.0: Flexible composition
      version = "2.0";
      templatesList = args.templates.map((t, idx) => ({
        templateId: t.templateId,
        templateType: t.templateType,
        isRequired: t.isRequired ?? true,
        displayOrder: t.displayOrder ?? idx + 1,
      }));

      // Validate all templates exist
      for (const t of templatesList) {
        const template = await ctx.db.get(t.templateId);
        if (!template || template.type !== "template") {
          throw new Error(`Invalid template: ${t.templateId}`);
        }
      }
    } else if (args.ticketTemplateId && args.invoiceTemplateId && args.emailTemplateId) {
      // v1.0: Legacy 3-template format
      version = "1.0";

      // Validate all three templates exist
      const ticketTemplate = await ctx.db.get(args.ticketTemplateId);
      const invoiceTemplate = await ctx.db.get(args.invoiceTemplateId);
      const emailTemplate = await ctx.db.get(args.emailTemplateId);

      if (!ticketTemplate || ticketTemplate.type !== "template") {
        throw new Error("Invalid ticket template");
      }
      if (!invoiceTemplate || invoiceTemplate.type !== "template") {
        throw new Error("Invalid invoice template");
      }
      if (!emailTemplate || emailTemplate.type !== "template") {
        throw new Error("Invalid email template");
      }

      // Convert to v2.0 internal format for consistency
      templatesList = [
        { templateId: args.ticketTemplateId, templateType: "ticket", isRequired: true, displayOrder: 1 },
        { templateId: args.invoiceTemplateId, templateType: "invoice", isRequired: true, displayOrder: 2 },
        { templateId: args.emailTemplateId, templateType: "email", isRequired: true, displayOrder: 3 },
      ];
    } else {
      throw new Error("Must provide either 'templates' array (v2.0) or all three template IDs (v1.0)");
    }

    // If setting as default, unset any existing defaults
    if (args.isDefault) {
      const existingSets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "template_set")
        )
        .collect();

      for (const set of existingSets) {
        if (set.customProperties?.isDefault) {
          await ctx.db.patch(set._id, {
            customProperties: {
              ...set.customProperties,
              isDefault: false,
            },
          });
        }
      }
    }

    // Create template set with v2.0 schema
    const customProps: Record<string, unknown> = {
      version,
      templates: templatesList,
      isDefault: args.isDefault || false,
      isSystemDefault: args.isSystemDefault || false,
      tags: args.tags || [],
      previewImageUrl: args.previewImageUrl || "",
    };

    // For backward compatibility, also store legacy fields if v1.0
    if (version === "1.0" && args.ticketTemplateId && args.invoiceTemplateId && args.emailTemplateId) {
      customProps.ticketTemplateId = args.ticketTemplateId;
      customProps.invoiceTemplateId = args.invoiceTemplateId;
      customProps.emailTemplateId = args.emailTemplateId;
    }

    const setId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template_set",
      name: args.name,
      description: args.description || "",
      status: "active",
      customProperties: customProps,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create links to all templates
    for (const t of templatesList) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: setId,
        toObjectId: t.templateId,
        linkType: "includes_template",
        properties: {
          templateType: t.templateType,
          isRequired: t.isRequired,
          displayOrder: t.displayOrder,
        },
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: setId,
      actionType: "template_set_created",
      actionData: {
        name: args.name,
        version,
        templateCount: templatesList.length,
        isDefault: args.isDefault || false,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { setId, version, templateCount: templatesList.length };
  },
});

/**
 * UPDATE TEMPLATE SET
 *
 * Updates an existing template set.
 */
export const updateTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),

    // v2.0 format (flexible composition)
    templates: v.optional(v.array(v.object({
      templateId: v.id("objects"),
      templateType: v.string(),
      isRequired: v.optional(v.boolean()),
      displayOrder: v.optional(v.number()),
    }))),

    // v1.0 format (legacy - backward compatible)
    ticketTemplateId: v.optional(v.id("objects")),
    invoiceTemplateId: v.optional(v.id("objects")),
    emailTemplateId: v.optional(v.id("objects")),

    isDefault: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    previewImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    await getUserContext(ctx, userId, set.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      set.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // If setting as default, unset any existing defaults
    if (args.isDefault && !set.customProperties?.isDefault) {
      const existingSets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", set.organizationId).eq("type", "template_set")
        )
        .collect();

      for (const existingSet of existingSets) {
        if (existingSet._id !== args.setId && existingSet.customProperties?.isDefault) {
          await ctx.db.patch(existingSet._id, {
            customProperties: {
              ...existingSet.customProperties,
              isDefault: false,
            },
          });
        }
      }
    }

    // Build updated properties
    const updatedProperties = {
      ...set.customProperties,
      ...(args.ticketTemplateId && { ticketTemplateId: args.ticketTemplateId }),
      ...(args.invoiceTemplateId && { invoiceTemplateId: args.invoiceTemplateId }),
      ...(args.emailTemplateId && { emailTemplateId: args.emailTemplateId }),
      ...(args.templates && { templates: args.templates }), // 🔧 FIX: Save v2.0 templates array!
      ...(args.isDefault !== undefined && { isDefault: args.isDefault }),
      ...(args.tags && { tags: args.tags }),
      ...(args.previewImageUrl !== undefined && { previewImageUrl: args.previewImageUrl }),
    };

    // Update set
    await ctx.db.patch(args.setId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    // 🔧 FIX: Update objectLinks when templates array changes (v2.0)
    if (args.templates) {
      // Delete existing template links
      const existingLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q) =>
          q.eq("fromObjectId", args.setId).eq("linkType", "includes_template")
        )
        .collect();

      for (const link of existingLinks) {
        await ctx.db.delete(link._id);
      }

      // Create new links for each template
      for (const t of args.templates) {
        await ctx.db.insert("objectLinks", {
          organizationId: set.organizationId,
          fromObjectId: args.setId,
          toObjectId: t.templateId,
          linkType: "includes_template",
          properties: {
            templateType: t.templateType,
            isRequired: t.isRequired || false,
            displayOrder: t.displayOrder || 0,
          },
          createdBy: userId,
          createdAt: Date.now(),
        });
      }
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: set.organizationId,
      objectId: args.setId,
      actionType: "template_set_updated",
      actionData: {
        updates: Object.keys(args).filter((k) => k !== "sessionId" && k !== "setId"),
        templateCount: args.templates?.length,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE TEMPLATE SET
 *
 * Soft deletes a template set.
 */
export const deleteTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    await getUserContext(ctx, userId, set.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "delete_templates",
      set.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: delete_templates required");
    }

    // Soft delete
    await ctx.db.patch(args.setId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: set.organizationId,
      objectId: args.setId,
      actionType: "template_set_deleted",
      actionData: {
        name: set.name,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET TEMPLATE SETS
 *
 * Lists all template sets for an organization.
 */
export const getTemplateSets = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    includeSystem: v.optional(v.boolean()), // Include system sets
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get org sets
    const orgSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    let allSets = [...orgSets];

    // Optionally include system sets
    if (args.includeSystem) {
      const systemOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", "system"))
        .first();

      if (systemOrg) {
        const systemSets = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", systemOrg._id).eq("type", "template_set")
          )
          .filter((q) => q.neq(q.field("status"), "deleted"))
          .collect();

        allSets = [...allSets, ...systemSets];
      }
    }

    // Sort by update time descending
    allSets.sort((a, b) => b.updatedAt - a.updatedAt);

    return allSets;
  },
});

/**
 * GET TEMPLATE SET BY ID
 *
 * Returns full details for a single template set including linked templates.
 */
export const getTemplateSetById = query({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    // Fetch linked templates
    const ticketTemplate = await ctx.db.get(set.customProperties?.ticketTemplateId as Id<"objects">);
    const invoiceTemplate = await ctx.db.get(set.customProperties?.invoiceTemplateId as Id<"objects">);
    const emailTemplate = await ctx.db.get(set.customProperties?.emailTemplateId as Id<"objects">);

    return {
      set,
      templates: {
        ticket: ticketTemplate,
        invoice: invoiceTemplate,
        email: emailTemplate,
      },
    };
  },
});

/**
 * GET DEFAULT TEMPLATE SET
 *
 * Returns the default template set for an organization.
 * Falls back to system default if no org default is set.
 */
export const getDefaultTemplateSet = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Check for org default
    const orgSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    const orgDefault = orgSets.find((set) => set.customProperties?.isDefault);
    if (orgDefault) return orgDefault;

    // Fall back to system default
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) return null;

    const systemSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    return systemSets.find((set) => set.customProperties?.isDefault) || systemSets[0] || null;
  },
});

/**
 * SET DEFAULT TEMPLATE SET
 *
 * Sets a template set as the organization default.
 */
export const setDefaultTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    await getUserContext(ctx, userId, set.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      set.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Unset all existing defaults
    const allSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", set.organizationId).eq("type", "template_set")
      )
      .collect();

    for (const existingSet of allSets) {
      if (existingSet.customProperties?.isDefault) {
        await ctx.db.patch(existingSet._id, {
          customProperties: {
            ...existingSet.customProperties,
            isDefault: false,
          },
        });
      }
    }

    // Set new default
    await ctx.db.patch(args.setId, {
      customProperties: {
        ...set.customProperties,
        isDefault: true,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET TEMPLATE BY ID
 *
 * Fetches a single template by its ID with permission checking.
 * Returns the full template object.
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
 * GET TEMPLATE USAGE
 *
 * Shows where a specific template is being used across the system.
 * Returns all template sets, products, checkouts, and domains that reference this template.
 */
export const getTemplateUsage = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Find template sets using this template
    const setLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.templateId).eq("linkType", "includes_template")
      )
      .collect();

    const templateSets = [];
    for (const link of setLinks) {
      const set = await ctx.db.get(link.fromObjectId);
      if (set && set.type === "template_set") {
        templateSets.push({
          setId: set._id,
          setName: set.name,
          isDefault: set.customProperties?.isDefault || false,
          organizationId: set.organizationId,
        });
      }
    }

    // Find products with template set overrides that use this template
    // (Products reference template sets, which reference templates)
    const products = [];
    for (const setData of templateSets) {
      const productLinks = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", setData.organizationId).eq("type", "product")
        )
        .filter((q) => q.eq(q.field("customProperties.templateSetId"), setData.setId))
        .collect();

      for (const product of productLinks) {
        products.push({
          productId: product._id,
          productName: product.name,
          templateSetName: setData.setName,
        });
      }
    }

    // Find checkouts with template set overrides
    const checkouts = [];
    for (const setData of templateSets) {
      const checkoutLinks = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", setData.organizationId).eq("type", "checkout_config")
        )
        .filter((q) => q.eq(q.field("customProperties.templateSetId"), setData.setId))
        .collect();

      for (const checkout of checkoutLinks) {
        checkouts.push({
          checkoutId: checkout._id,
          checkoutName: checkout.name,
          templateSetName: setData.setName,
        });
      }
    }

    // Find domains with template set overrides
    const domains = [];
    for (const setData of templateSets) {
      const domainLinks = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", setData.organizationId).eq("type", "domain_config")
        )
        .filter((q) => q.eq(q.field("customProperties.templateSetId"), setData.setId))
        .collect();

      for (const domain of domainLinks) {
        domains.push({
          domainId: domain._id,
          domainName: domain.name,
          templateSetName: setData.setName,
        });
      }
    }

    return {
      template: {
        id: template._id,
        name: template.name,
        type: template.subtype,
        category: template.customProperties?.category,
      },
      usage: {
        templateSets,
        products,
        checkouts,
        domains,
      },
      totalUsages: templateSets.length + products.length + checkouts.length + domains.length,
    };
  },
});

/**
 * ADD TEMPLATES TO SET (v2.0)
 *
 * Adds one or more templates to an existing template set.
 * Creates objectLinks for each template.
 */
export const addTemplatesToSet = mutation({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
    templates: v.array(v.object({
      templateId: v.id("objects"),
      templateType: v.string(),
      isRequired: v.optional(v.boolean()),
      displayOrder: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    await getUserContext(ctx, userId, set.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      set.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Get current templates array
    const currentTemplates = (set.customProperties?.templates as Array<{
      templateId: string;
      templateType: string;
      isRequired: boolean;
      displayOrder: number;
    }>) || [];

    // Validate new templates exist and get next display order
    let maxDisplayOrder = Math.max(...currentTemplates.map(t => t.displayOrder), 0);

    for (const template of args.templates) {
      const templateObj = await ctx.db.get(template.templateId);
      if (!templateObj || templateObj.type !== "template") {
        throw new Error(`Invalid template: ${template.templateId}`);
      }

      // Check if template already exists in set
      const exists = currentTemplates.some(t => t.templateId === template.templateId);
      if (exists) {
        throw new Error(`Template ${templateObj.name} is already in this set`);
      }

      // Add to templates array
      currentTemplates.push({
        templateId: template.templateId as string,
        templateType: template.templateType,
        isRequired: template.isRequired ?? false,
        displayOrder: template.displayOrder ?? ++maxDisplayOrder,
      });

      // Create objectLink
      await ctx.db.insert("objectLinks", {
        organizationId: set.organizationId,
        fromObjectId: args.setId,
        toObjectId: template.templateId,
        linkType: "includes_template",
        properties: {
          templateType: template.templateType,
          isRequired: template.isRequired ?? false,
          displayOrder: template.displayOrder ?? maxDisplayOrder,
        },
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Update template set with new templates array
    await ctx.db.patch(args.setId, {
      customProperties: {
        ...set.customProperties,
        templates: currentTemplates,
        version: "2.0",
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: set.organizationId,
      objectId: args.setId,
      actionType: "templates_added_to_set",
      actionData: {
        addedCount: args.templates.length,
        templateIds: args.templates.map(t => t.templateId),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, addedCount: args.templates.length };
  },
});

/**
 * REMOVE TEMPLATES FROM SET (v2.0)
 *
 * Removes one or more templates from an existing template set.
 * Deletes the corresponding objectLinks.
 */
export const removeTemplatesFromSet = mutation({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
    templateIds: v.array(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    await getUserContext(ctx, userId, set.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      set.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Get current templates array
    const currentTemplates = (set.customProperties?.templates as Array<{
      templateId: string;
      templateType: string;
      isRequired: boolean;
      displayOrder: number;
    }>) || [];

    // Remove templates from array
    const updatedTemplates = currentTemplates.filter(
      t => !args.templateIds.includes(t.templateId as Id<"objects">)
    );

    // Delete objectLinks
    for (const templateId of args.templateIds) {
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.setId))
        .filter((q) => q.eq(q.field("toObjectId"), templateId))
        .collect();

      for (const link of links) {
        await ctx.db.delete(link._id);
      }
    }

    // Update template set
    await ctx.db.patch(args.setId, {
      customProperties: {
        ...set.customProperties,
        templates: updatedTemplates,
        version: "2.0",
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: set.organizationId,
      objectId: args.setId,
      actionType: "templates_removed_from_set",
      actionData: {
        removedCount: args.templateIds.length,
        templateIds: args.templateIds,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, removedCount: args.templateIds.length };
  },
});

/**
 * UPDATE TEMPLATE IN SET (v2.0)
 *
 * Updates a template's properties within a set (isRequired, displayOrder).
 */
export const updateTemplateInSet = mutation({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
    templateId: v.id("objects"),
    isRequired: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    await getUserContext(ctx, userId, set.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_templates",
      set.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: edit_templates required");
    }

    // Get current templates array
    const currentTemplates = (set.customProperties?.templates as Array<{
      templateId: string;
      templateType: string;
      isRequired: boolean;
      displayOrder: number;
    }>) || [];

    // Find and update template
    const templateIndex = currentTemplates.findIndex(
      t => t.templateId === args.templateId
    );

    if (templateIndex === -1) {
      throw new Error("Template not found in set");
    }

    if (args.isRequired !== undefined) {
      currentTemplates[templateIndex].isRequired = args.isRequired;
    }

    if (args.displayOrder !== undefined) {
      currentTemplates[templateIndex].displayOrder = args.displayOrder;
    }

    // Update objectLink
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.setId))
      .filter((q) => q.eq(q.field("toObjectId"), args.templateId))
      .collect();

    for (const link of links) {
      await ctx.db.patch(link._id, {
        properties: {
          ...link.properties,
          ...(args.isRequired !== undefined && { isRequired: args.isRequired }),
          ...(args.displayOrder !== undefined && { displayOrder: args.displayOrder }),
        },
      });
    }

    // Update template set
    await ctx.db.patch(args.setId, {
      customProperties: {
        ...set.customProperties,
        templates: currentTemplates,
        version: "2.0",
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: set.organizationId,
      objectId: args.setId,
      actionType: "template_updated_in_set",
      actionData: {
        templateId: args.templateId,
        updates: {
          isRequired: args.isRequired,
          displayOrder: args.displayOrder,
        },
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET SYSTEM DEFAULT TEMPLATE SET
 *
 * Retrieves the System Default template set (isSystemDefault: true).
 * Used by organization owners to find the system default before copying it.
 */
export const getSystemDefaultTemplateSet = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Find system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      return null;
    }

    // Find system default template set
    const systemSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template_set")
      )
      .collect();

    const systemDefault = systemSets.find((set) => set.customProperties?.isSystemDefault);

    return systemDefault || null;
  },
});

/**
 * COPY TEMPLATE SET (Security Fix)
 *
 * Copies a template set (typically System Default) to an organization.
 * This allows organization owners to customize system defaults without modifying them.
 *
 * Flow:
 * 1. User sees "Using System Default Template Set" message
 * 2. User clicks "Copy System Default & Customize"
 * 3. This mutation copies all templates from System Default to org
 * 4. User can then customize their copy without affecting system defaults
 */
export const copyTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    sourceSetId: v.id("objects"), // System Default template set ID
    targetOrganizationId: v.id("organizations"),
    name: v.optional(v.string()), // Custom name for the copy
    setAsDefault: v.optional(v.boolean()), // Set as org default?
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.targetOrganizationId);

    // Check permission to create template sets
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "create_templates",
      args.targetOrganizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: create_templates required");
    }

    // Fetch source template set
    const sourceSet = await ctx.db.get(args.sourceSetId);
    if (!sourceSet || sourceSet.type !== "template_set") {
      throw new Error("Source template set not found");
    }

    const sourceProps = sourceSet.customProperties || {};
    const sourceTemplates = sourceProps.templates || [];

    if (sourceTemplates.length === 0) {
      throw new Error("Source template set has no templates");
    }

    // If setting as default, unset any existing defaults in target org
    if (args.setAsDefault) {
      const existingSets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.targetOrganizationId).eq("type", "template_set")
        )
        .collect();

      for (const set of existingSets) {
        if (set.customProperties?.isDefault) {
          await ctx.db.patch(set._id, {
            customProperties: {
              ...set.customProperties,
              isDefault: false,
            },
          });
        }
      }
    }

    // Validate all templates exist and are accessible
    const validatedTemplates: Array<{
      templateId: Id<"objects">;
      templateType: string;
      isRequired: boolean;
      displayOrder: number;
    }> = [];

    for (const t of sourceTemplates as Array<{
      templateId: Id<"objects">;
      templateType: string;
      isRequired: boolean;
      displayOrder: number;
    }>) {
      const template = await ctx.db.get(t.templateId);
      if (!template || template.type !== "template") {
        console.warn(`Template ${t.templateId} not found, skipping`);
        continue;
      }
      validatedTemplates.push({
        templateId: t.templateId,
        templateType: t.templateType,
        isRequired: t.isRequired ?? false,
        displayOrder: t.displayOrder ?? 0,
      });
    }

    if (validatedTemplates.length === 0) {
      throw new Error("No valid templates found in source template set");
    }

    // Create new template set in target organization
    const newSetName = args.name || `${sourceSet.name} (Copy)`;
    const newSetDescription = `Copy of ${sourceSet.name}. ${sourceSet.description || ""}`.trim();

    const customProps: Record<string, unknown> = {
      version: "2.0",
      templates: validatedTemplates,
      isDefault: args.setAsDefault || false,
      isSystemDefault: false, // Copies are NEVER system defaults
      tags: [...(sourceProps.tags || []), "copied"],
      previewImageUrl: sourceProps.previewImageUrl || "",
      copiedFrom: args.sourceSetId, // Track origin
      copiedAt: Date.now(),
    };

    const newSetId = await ctx.db.insert("objects", {
      organizationId: args.targetOrganizationId,
      type: "template_set",
      name: newSetName,
      description: newSetDescription,
      status: "active",
      customProperties: customProps,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create objectLinks for all templates
    for (const t of validatedTemplates) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.targetOrganizationId,
        fromObjectId: newSetId,
        toObjectId: t.templateId,
        linkType: "includes_template",
        properties: {
          templateType: t.templateType,
          isRequired: t.isRequired,
          displayOrder: t.displayOrder,
        },
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.targetOrganizationId,
      objectId: newSetId,
      actionType: "template_set_copied",
      actionData: {
        sourceSetId: args.sourceSetId,
        sourceSetName: sourceSet.name,
        templateCount: validatedTemplates.length,
        setAsDefault: args.setAsDefault || false,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      setId: newSetId,
      templateCount: validatedTemplates.length,
    };
  },
});
