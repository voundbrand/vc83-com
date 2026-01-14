/**
 * TEMPLATE ONTOLOGY
 *
 * Manages message templates for sequences.
 * Uses the universal ontology system (objects table).
 *
 * Object Type: message_template
 *
 * Subtypes (channel):
 * - "email" - Email templates with subject, body, and HTML
 * - "sms" - SMS templates (short text only)
 * - "whatsapp" - WhatsApp templates (must match Meta-approved templates)
 *
 * Status:
 * - "draft" - Being edited
 * - "active" - Available for use
 * - "archived" - No longer available
 *
 * Template Variables:
 * Use {{variableName}} syntax for dynamic content:
 * - {{firstName}}, {{lastName}}, {{email}} - Contact info
 * - {{eventName}}, {{eventDate}}, {{eventTime}} - Event/booking info
 * - {{locationName}}, {{locationAddress}} - Location info
 * - {{daysUntil}}, {{daysAgo}} - Relative time
 * - {{bookingRef}} - Booking reference
 * - {{companyName}} - Organization name
 */

import { query, mutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { checkResourceLimit } from "../licensing/helpers";

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Template channel type
 */
export const templateChannelValidator = v.union(
  v.literal("email"),
  v.literal("sms"),
  v.literal("whatsapp")
);

/**
 * Template category
 */
export const templateCategoryValidator = v.union(
  v.literal("reminder"),
  v.literal("confirmation"),
  v.literal("followup"),
  v.literal("upsell"),
  v.literal("review"),
  v.literal("certificate"),
  v.literal("checkin"),
  v.literal("custom")
);

// ============================================================================
// TEMPLATE CRUD OPERATIONS
// ============================================================================

/**
 * LIST TEMPLATES
 * Returns all templates for an organization
 */
export const listTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    channel: v.optional(templateChannelValidator),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "message_template")
      )
      .collect();

    // Apply filters
    if (args.channel) {
      templates = templates.filter((t) => t.subtype === args.channel);
    }

    if (args.status) {
      templates = templates.filter((t) => t.status === args.status);
    }

    if (args.category) {
      templates = templates.filter((t) => {
        const props = t.customProperties as Record<string, unknown> | undefined;
        return props?.category === args.category;
      });
    }

    if (args.language) {
      templates = templates.filter((t) => {
        const props = t.customProperties as Record<string, unknown> | undefined;
        return props?.language === args.language;
      });
    }

    // Sort by name
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return templates;
  },
});

/**
 * GET TEMPLATE
 * Get a single template with full details
 */
export const getTemplate = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);

    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    return template;
  },
});

/**
 * GET TEMPLATE (INTERNAL)
 * For internal systems
 */
export const getTemplateInternal = internalQuery({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template || template.type !== "message_template") {
      return null;
    }

    return template;
  },
});

/**
 * CREATE TEMPLATE
 * Create a new message template
 */
export const createTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    channel: templateChannelValidator,
    language: v.optional(v.string()),
    category: v.optional(templateCategoryValidator),
    // Email-specific
    subject: v.optional(v.string()),
    // Content
    body: v.string(), // Plain text with {{variables}}
    bodyHtml: v.optional(v.string()), // HTML for email
    // WhatsApp-specific
    whatsappTemplateName: v.optional(v.string()),
    // Metadata
    variables: v.optional(v.array(v.string())),
    sampleData: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Check resource limit
    await checkResourceLimit(ctx, args.organizationId, "message_template", "maxMessageTemplates");

    // Extract variables from body if not provided
    let variables = args.variables;
    if (!variables) {
      const matches = args.body.match(/\{\{(\w+)\}\}/g) || [];
      variables = [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
    }

    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "message_template",
      subtype: args.channel,
      name: args.name,
      description: `${args.channel.toUpperCase()} template - ${args.category || "custom"}`,
      status: "draft",
      customProperties: {
        language: args.language || "de", // Default to German
        category: args.category || "custom",
        subject: args.subject,
        body: args.body,
        bodyHtml: args.bodyHtml,
        whatsappTemplateName: args.whatsappTemplateName,
        variables,
        sampleData: args.sampleData || generateDefaultSampleData(variables),
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "created",
      actionData: {
        channel: args.channel,
        category: args.category,
        language: args.language,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * UPDATE TEMPLATE
 * Update an existing template
 */
export const updateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      language: v.optional(v.string()),
      category: v.optional(templateCategoryValidator),
      subject: v.optional(v.string()),
      body: v.optional(v.string()),
      bodyHtml: v.optional(v.string()),
      whatsappTemplateName: v.optional(v.string()),
      variables: v.optional(v.array(v.string())),
      sampleData: v.optional(v.record(v.string(), v.string())),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    const currentProps = template.customProperties as Record<string, unknown>;

    // Re-extract variables if body changed and variables not provided
    let newVariables = args.updates.variables;
    if (args.updates.body && !newVariables) {
      const matches = args.updates.body.match(/\{\{(\w+)\}\}/g) || [];
      newVariables = [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
    }

    // Build updated properties
    const updatedProps: Record<string, unknown> = { ...currentProps };
    if (args.updates.language !== undefined) updatedProps.language = args.updates.language;
    if (args.updates.category !== undefined) updatedProps.category = args.updates.category;
    if (args.updates.subject !== undefined) updatedProps.subject = args.updates.subject;
    if (args.updates.body !== undefined) updatedProps.body = args.updates.body;
    if (args.updates.bodyHtml !== undefined) updatedProps.bodyHtml = args.updates.bodyHtml;
    if (args.updates.whatsappTemplateName !== undefined) updatedProps.whatsappTemplateName = args.updates.whatsappTemplateName;
    if (newVariables !== undefined) updatedProps.variables = newVariables;
    if (args.updates.sampleData !== undefined) updatedProps.sampleData = args.updates.sampleData;

    await ctx.db.patch(args.templateId, {
      name: args.updates.name || template.name,
      status: args.updates.status || template.status,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * ACTIVATE TEMPLATE
 * Make a template available for use
 */
export const activateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    const props = template.customProperties as Record<string, unknown>;

    // Validate template has required content
    if (!props.body) {
      throw new Error("Template must have body content to activate");
    }

    // Email templates need a subject
    if (template.subtype === "email" && !props.subject) {
      throw new Error("Email templates must have a subject to activate");
    }

    await ctx.db.patch(args.templateId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Log activation
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "activated",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * ARCHIVE TEMPLATE
 * Remove a template from use
 */
export const archiveTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log archive
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "archived",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * DELETE TEMPLATE
 * Permanently delete a template
 */
export const deleteTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    // Check if template is in use by any active sequences
    const sequences = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", template.organizationId).eq("type", "automation_sequence")
      )
      .filter((q) => q.neq(q.field("status"), "archived"))
      .collect();

    for (const seq of sequences) {
      const props = seq.customProperties as Record<string, unknown>;
      const steps = (props.steps as Array<Record<string, unknown>>) || [];
      const usesTemplate = steps.some((s) => s.templateId === args.templateId);
      if (usesTemplate) {
        throw new Error(`Cannot delete template in use by sequence "${seq.name}"`);
      }
    }

    // Delete the template
    await ctx.db.delete(args.templateId);

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "deleted",
      actionData: {
        templateName: template.name,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * DUPLICATE TEMPLATE
 * Create a copy of an existing template
 */
export const duplicateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    // Check resource limit
    await checkResourceLimit(ctx, template.organizationId, "message_template", "maxMessageTemplates");

    const props = template.customProperties as Record<string, unknown>;

    const newTemplateId = await ctx.db.insert("objects", {
      organizationId: template.organizationId,
      type: "message_template",
      subtype: template.subtype,
      name: args.newName || `${template.name} (Copy)`,
      description: template.description,
      status: "draft",
      customProperties: {
        ...props,
        // Reset usage stats if any
        usageCount: 0,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log duplication
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: newTemplateId,
      actionType: "duplicated",
      actionData: {
        sourceTemplateId: args.templateId,
        sourceTemplateName: template.name,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return newTemplateId;
  },
});

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * PREVIEW TEMPLATE
 * Render a template with sample or provided data
 */
export const previewTemplate = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "message_template") {
      throw new Error("Template not found");
    }

    const props = template.customProperties as Record<string, unknown>;
    const sampleData = (props.sampleData as Record<string, string>) || {};
    const renderData = { ...sampleData, ...args.data };

    // Render template
    const rendered = {
      subject: renderString(props.subject as string | undefined, renderData),
      body: renderString(props.body as string, renderData),
      bodyHtml: renderString(props.bodyHtml as string | undefined, renderData),
    };

    return {
      template: {
        id: template._id,
        name: template.name,
        channel: template.subtype,
      },
      rendered,
      variables: props.variables as string[],
      usedData: renderData,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Render a string with variable substitution
 */
function renderString(
  template: string | undefined,
  data: Record<string, string>
): string | undefined {
  if (!template) return undefined;

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Generate default sample data for variables
 */
function generateDefaultSampleData(variables: string[]): Record<string, string> {
  const defaults: Record<string, string> = {
    firstName: "Max",
    lastName: "Mustermann",
    email: "max.mustermann@example.de",
    phone: "+49 170 1234567",
    eventName: "SBF Binnen Intensivkurs",
    eventDate: "15. Juni 2024",
    eventTime: "09:00 Uhr",
    locationName: "Segelschule Stettiner Haff",
    locationAddress: "Hafenstraße 1, 17375 Altwarp",
    daysUntil: "7",
    daysAgo: "2",
    bookingRef: "BK-2024-001",
    companyName: "Segelschule am Haff GmbH",
    instructorName: "Gerrit",
    courseType: "Segelkurs",
    priceFormatted: "549,00 €",
  };

  const result: Record<string, string> = {};
  for (const variable of variables) {
    result[variable] = defaults[variable] || `[${variable}]`;
  }

  return result;
}
