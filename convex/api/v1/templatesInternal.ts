/**
 * API V1: TEMPLATE INTERNAL HANDLERS
 *
 * Internal mutations/queries for MCP template management.
 * Handles email and PDF template CRUD operations without requiring sessionId authentication.
 *
 * NOTE: The existing templateOntology.ts handles page templates.
 * This file focuses on email and PDF templates for MCP/AI skill usage.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { checkResourceLimit, checkFeatureAccess } from "../../licensing/helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type TemplateSubtype =
  | "email"
  | "pdf"
  | "pdf_ticket"
  | "transactional"
  | "event_confirmation"
  | "event_reminder"
  | "event_followup"
  | "newsletter"
  | "marketing"
  | "promotional"
  | "invoice"
  | "receipt"
  | "ticket"
  | "certificate"
  | "badge";

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * LIST TEMPLATES (Internal)
 * Returns all templates for an organization with optional filters
 */
export const listTemplatesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    includeSystem: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get organization templates
    let templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    // Filter out page templates (handled separately)
    templates = templates.filter((t) => t.subtype !== "page");

    // Optionally include system templates
    if (args.includeSystem) {
      const systemOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", "system"))
        .first();

      if (systemOrg) {
        // Get template availability for this org
        const availabilities = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", args.organizationId).eq("type", "template_availability")
          )
          .filter((q) => q.eq(q.field("customProperties.available"), true))
          .collect();

        const enabledTemplateIds = new Set(
          availabilities
            .map((a) => a.customProperties?.templateId)
            .filter((id): id is string => typeof id === "string")
        );

        // Get enabled system templates
        const systemTemplates = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", systemOrg._id).eq("type", "template")
          )
          .collect();

        const enabledSystemTemplates = systemTemplates.filter(
          (t) => t.subtype !== "page" && enabledTemplateIds.has(t._id)
        );

        templates = [...templates, ...enabledSystemTemplates];
      }
    }

    // Apply filters
    if (args.subtype) {
      templates = templates.filter((t) => t.subtype === args.subtype);
    }

    if (args.status) {
      templates = templates.filter((t) => t.status === args.status);
    }

    if (args.category) {
      templates = templates.filter((t) => t.customProperties?.category === args.category);
    }

    return templates.map((t) => ({
      _id: t._id,
      name: t.name,
      description: t.description,
      subtype: t.subtype,
      status: t.status,
      code: t.customProperties?.code,
      category: t.customProperties?.category,
      isDefault: t.customProperties?.isDefault,
      isSystemTemplate: t.organizationId !== args.organizationId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  },
});

/**
 * GET TEMPLATE (Internal)
 * Returns a single template by ID
 */
export const getTemplateInternal = internalQuery({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template || template.type !== "template") {
      return null;
    }

    return template;
  },
});

/**
 * GET TEMPLATE BY CODE (Internal)
 * Returns a template by its code within an organization
 */
export const getTemplateByCodeInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    code: v.string(),
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    let matches = templates.filter((t) => t.customProperties?.code === args.code);

    if (args.subtype) {
      matches = matches.filter((t) => t.subtype === args.subtype);
    }

    return matches[0] || null;
  },
});

/**
 * GET DEFAULT TEMPLATE (Internal)
 * Returns the default template for a given category/subtype
 */
export const getDefaultTemplateInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    category: v.string(),
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    let matches = templates.filter(
      (t) =>
        t.customProperties?.category === args.category &&
        t.customProperties?.isDefault === true
    );

    if (args.subtype) {
      matches = matches.filter((t) => t.subtype === args.subtype);
    }

    return matches[0] || null;
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * CREATE EMAIL TEMPLATE (Internal)
 * Creates a new email template
 */
export const createEmailTemplateInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    subject: v.string(),
    htmlContent: v.string(),
    textContent: v.optional(v.string()),
    variables: v.optional(v.array(v.string())),
    previewText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // Check license limit
    await checkResourceLimit(ctx, args.organizationId, "template", "maxCustomTemplates");

    // Check code uniqueness
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    const existingByCode = existing.find(
      (t) => t.customProperties?.code === args.code && t.subtype?.startsWith("email")
    );

    if (existingByCode) {
      throw new Error(`Email template code "${args.code}" is already in use`);
    }

    // Determine subtype based on category
    const categoryToSubtype: Record<string, TemplateSubtype> = {
      transactional: "transactional",
      event_confirmation: "event_confirmation",
      event_reminder: "event_reminder",
      event_followup: "event_followup",
      newsletter: "newsletter",
      marketing: "marketing",
      promotional: "promotional",
    };

    const subtype = categoryToSubtype[args.category] || "email";

    // Create template
    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template",
      subtype,
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties: {
        code: args.code,
        category: args.category,
        subject: args.subject,
        htmlContent: args.htmlContent,
        textContent: args.textContent,
        variables: args.variables || [],
        previewText: args.previewText,
        isDefault: false,
        author: "Custom",
        version: "1.0.0",
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "template_created",
      actionData: {
        templateType: "email",
        code: args.code,
        category: args.category,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * CREATE PDF TEMPLATE (Internal)
 * Creates a new PDF template (ticket, certificate, invoice, etc.)
 */
export const createPdfTemplateInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("ticket"),
      v.literal("certificate"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("badge"),
      v.literal("other")
    ),
    layout: v.optional(v.object({
      pageSize: v.optional(v.string()),
      orientation: v.optional(v.string()),
      margins: v.optional(v.any()),
    })),
    sections: v.optional(v.array(v.any())),
    styles: v.optional(v.any()),
    features: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // Check license limit
    await checkResourceLimit(ctx, args.organizationId, "template", "maxCustomTemplates");

    // Check code uniqueness
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    const existingByCode = existing.find(
      (t) => t.customProperties?.code === args.code && (t.subtype === "pdf" || t.subtype === "pdf_ticket")
    );

    if (existingByCode) {
      throw new Error(`PDF template code "${args.code}" is already in use`);
    }

    // Determine subtype
    const categoryToSubtype: Record<string, string> = {
      ticket: "pdf_ticket",
      certificate: "certificate",
      invoice: "invoice",
      receipt: "receipt",
      badge: "badge",
      other: "pdf",
    };

    const subtype = categoryToSubtype[args.category] || "pdf";

    // Create template
    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template",
      subtype,
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties: {
        code: args.code,
        category: args.category,
        layout: args.layout || {
          pageSize: "A4",
          orientation: "portrait",
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
        },
        sections: args.sections || [],
        styles: args.styles || {},
        features: args.features || {},
        isDefault: false,
        author: "Custom",
        version: "1.0.0",
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "template_created",
      actionData: {
        templateType: "pdf",
        code: args.code,
        category: args.category,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * UPDATE TEMPLATE (Internal)
 * Updates an existing template (email or PDF)
 */
export const updateTemplateInternal = internalMutation({
  args: {
    templateId: v.id("objects"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    // Email-specific
    subject: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    previewText: v.optional(v.string()),
    variables: v.optional(v.array(v.string())),
    // PDF-specific
    layout: v.optional(v.any()),
    sections: v.optional(v.array(v.any())),
    styles: v.optional(v.any()),
    features: v.optional(v.any()),
    // General
    customProperties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "template") {
      throw new Error("Template not found");
    }

    // Check feature access for custom CSS (Professional+)
    if (args.styles || args.customProperties?.customCss) {
      await checkFeatureAccess(ctx, template.organizationId, "advancedEditorEnabled");
    }

    const existingProps = template.customProperties as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...existingProps };

    // Update email-specific properties
    if (args.subject !== undefined) updatedProps.subject = args.subject;
    if (args.htmlContent !== undefined) updatedProps.htmlContent = args.htmlContent;
    if (args.textContent !== undefined) updatedProps.textContent = args.textContent;
    if (args.previewText !== undefined) updatedProps.previewText = args.previewText;
    if (args.variables !== undefined) updatedProps.variables = args.variables;

    // Update PDF-specific properties
    if (args.layout !== undefined) updatedProps.layout = args.layout;
    if (args.sections !== undefined) updatedProps.sections = args.sections;
    if (args.styles !== undefined) updatedProps.styles = args.styles;
    if (args.features !== undefined) updatedProps.features = args.features;

    // Merge custom properties if provided
    if (args.customProperties) {
      Object.assign(updatedProps, args.customProperties);
    }

    await ctx.db.patch(args.templateId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.status && { status: args.status }),
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "template_updated",
      actionData: {
        updatedFields: Object.keys(args).filter((k) => k !== "templateId" && k !== "userId"),
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE TEMPLATE (Internal)
 * Deletes a template (cannot delete defaults or system templates)
 */
export const deleteTemplateInternal = internalMutation({
  args: {
    templateId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "template") {
      throw new Error("Template not found");
    }

    // Check if system template
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (systemOrg && template.organizationId === systemOrg._id) {
      throw new Error("Cannot delete system templates");
    }

    // Check if default template
    if (template.customProperties?.isDefault === true) {
      throw new Error("Cannot delete default template. Set another template as default first.");
    }

    const templateInfo = {
      name: template.name,
      code: template.customProperties?.code,
      category: template.customProperties?.category,
      subtype: template.subtype,
    };

    // Delete the template
    await ctx.db.delete(args.templateId);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "template_deleted",
      actionData: {
        templateInfo,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * PUBLISH TEMPLATE (Internal)
 * Publishes a draft template
 */
export const publishTemplateInternal = internalMutation({
  args: {
    templateId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "template") {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      status: "published",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "template_published",
      actionData: {
        previousStatus: template.status,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNPUBLISH TEMPLATE (Internal)
 * Reverts a published template to draft
 */
export const unpublishTemplateInternal = internalMutation({
  args: {
    templateId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "template") {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "template_unpublished",
      actionData: {
        previousStatus: template.status,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * SET DEFAULT TEMPLATE (Internal)
 * Sets a template as the default for its category
 */
export const setDefaultTemplateInternal = internalMutation({
  args: {
    templateId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "template") {
      throw new Error("Template not found");
    }

    const category = template.customProperties?.category as string | undefined;
    if (!category) {
      throw new Error("Template has no category");
    }

    // Find and unset current default for this category
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", template.organizationId).eq("type", "template")
      )
      .collect();

    const sameCategory = allTemplates.filter(
      (t) =>
        t.customProperties?.category === category &&
        t.subtype === template.subtype &&
        t.customProperties?.isDefault === true
    );

    for (const t of sameCategory) {
      await ctx.db.patch(t._id, {
        customProperties: {
          ...t.customProperties,
          isDefault: false,
        },
        updatedAt: Date.now(),
      });
    }

    // Set new default
    await ctx.db.patch(args.templateId, {
      customProperties: {
        ...template.customProperties,
        isDefault: true,
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "template_set_default",
      actionData: {
        category,
        previousDefaults: sameCategory.map((t) => t._id),
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DUPLICATE TEMPLATE (Internal)
 * Creates a copy of an existing template
 */
export const duplicateTemplateInternal = internalMutation({
  args: {
    templateId: v.id("objects"),
    userId: v.id("users"),
    newName: v.optional(v.string()),
    targetOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<{ templateId: Id<"objects">; name: string }> => {
    const sourceTemplate = await ctx.db.get(args.templateId);
    if (!sourceTemplate || sourceTemplate.type !== "template") {
      throw new Error("Template not found");
    }

    const targetOrgId = args.targetOrganizationId || sourceTemplate.organizationId;

    // Check license limit
    await checkResourceLimit(ctx, targetOrgId, "template", "maxCustomTemplates");

    // Generate new name and code
    const newName = args.newName || `Copy of ${sourceTemplate.name}`;
    const timestamp = Date.now();
    const sourceCode = sourceTemplate.customProperties?.code || "template";
    const newCode = `${sourceCode}-copy-${timestamp}`;

    // Copy properties (but not isDefault)
    const newProps = {
      ...sourceTemplate.customProperties,
      code: newCode,
      isDefault: false,
    };

    // Create duplicate
    const newTemplateId = await ctx.db.insert("objects", {
      organizationId: targetOrgId,
      type: "template",
      subtype: sourceTemplate.subtype,
      name: newName,
      description: sourceTemplate.description,
      status: "draft",
      customProperties: newProps,
      createdBy: args.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.insert("objectActions", {
      organizationId: targetOrgId,
      objectId: newTemplateId,
      actionType: "template_duplicated",
      actionData: {
        sourceTemplateId: args.templateId,
        sourceTemplateName: sourceTemplate.name,
        newCode,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: timestamp,
    });

    return { templateId: newTemplateId, name: newName };
  },
});
