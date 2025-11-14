/**
 * TEMPLATE SET ONTOLOGY
 *
 * Template Sets bundle together ticket, invoice, and email templates
 * for consistent branding across all customer touchpoints.
 *
 * Architecture:
 * - One configuration = All three templates (ticket + invoice + email)
 * - Simple precedence: Manual > Product > Checkout > Domain > Organization
 * - No more juggling individual template IDs!
 *
 * Object Type: template_set
 * Type: "template_set"
 * Subtype: N/A (no subtypes for sets)
 *
 * Example:
 * {
 *   type: "template_set",
 *   name: "VIP Premium",
 *   description: "Luxury branding for premium events",
 *   customProperties: {
 *     ticketTemplateId: "...",   // Reference to PDF ticket template
 *     invoiceTemplateId: "...",  // Reference to PDF invoice template
 *     emailTemplateId: "...",    // Reference to email template
 *     isDefault: true,            // Organization default set
 *     tags: ["vip", "premium", "luxury"],
 *     previewImageUrl: "https://..."
 *   }
 * }
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * CREATE TEMPLATE SET
 *
 * Creates a new template set bundling ticket, invoice, and email templates.
 */
export const createTemplateSet = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    ticketTemplateId: v.id("objects"),   // Required: PDF ticket template
    invoiceTemplateId: v.id("objects"),  // Required: PDF invoice template
    emailTemplateId: v.id("objects"),    // Required: Email template
    isDefault: v.optional(v.boolean()),  // Set as org default
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

    // Create template set
    const setId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template_set",
      name: args.name,
      description: args.description || "",
      status: "active",
      customProperties: {
        ticketTemplateId: args.ticketTemplateId,
        invoiceTemplateId: args.invoiceTemplateId,
        emailTemplateId: args.emailTemplateId,
        isDefault: args.isDefault || false,
        tags: args.tags || [],
        previewImageUrl: args.previewImageUrl || "",
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create links to templates
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: setId,
      toObjectId: args.ticketTemplateId,
      linkType: "includes_template",
      properties: { templateType: "ticket" },
      createdBy: userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: setId,
      toObjectId: args.invoiceTemplateId,
      linkType: "includes_template",
      properties: { templateType: "invoice" },
      createdBy: userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: setId,
      toObjectId: args.emailTemplateId,
      linkType: "includes_template",
      properties: { templateType: "email" },
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: setId,
      actionType: "template_set_created",
      actionData: {
        name: args.name,
        isDefault: args.isDefault || false,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { setId };
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

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: set.organizationId,
      objectId: args.setId,
      actionType: "template_set_updated",
      actionData: {
        updates: Object.keys(args).filter((k) => k !== "sessionId" && k !== "setId"),
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
