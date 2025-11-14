/**
 * TEMPLATE QUERIES
 *
 * Public queries for fetching available templates (PDF and Email).
 * Used by frontend UI to display template selection dropdowns.
 */

import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { resolvePdfTemplate } from "./pdfTemplateResolver";

/**
 * Get Available PDF Templates by Category
 *
 * Returns all published PDF templates for a specific category.
 * Includes both system templates and organization-specific templates.
 *
 * Usage:
 * - Invoice templates: category="invoice"
 * - Ticket templates: category="ticket"
 * - Certificate templates: category="certificate"
 */
export const getPdfTemplatesByCategory = query({
  args: {
    category: v.union(
      v.literal("invoice"),
      v.literal("ticket"),
      v.literal("certificate"),
      v.literal("receipt"),
      v.literal("badge")
    ),
    organizationId: v.optional(v.id("organizations")), // Optional: include org-specific templates
  },
  handler: async (ctx, args) => {
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
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter by category
    const filteredSystemTemplates = systemTemplates.filter((t) => {
      const props = t.customProperties || {};
      return props.category === args.category;
    });

    // Get org-specific templates if organization provided
    let orgTemplates: typeof systemTemplates = [];
    if (args.organizationId && args.organizationId !== systemOrg._id) {
      const allOrgTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId!).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "pdf"))
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();

      orgTemplates = allOrgTemplates.filter((t) => {
        const props = t.customProperties || {};
        return props.category === args.category;
      });
    }

    // Combine and format results
    const allTemplates = [...filteredSystemTemplates, ...orgTemplates];

    return allTemplates.map((t) => {
      const props = t.customProperties || {};
      return {
        _id: t._id,
        name: t.name,
        description: t.description || "",
        templateCode: props.templateCode as string,
        category: props.category as string,
        version: props.version as string || "1.0",
        previewImageUrl: props.previewImageUrl as string | undefined,
        isDefault: props.isDefault as boolean || false,
        isSystemTemplate: t.organizationId === systemOrg._id,
      };
    });
  },
});

/**
 * Get Default PDF Template for Category
 *
 * Returns the default template ID for a given category.
 * Used for fallback when no template is explicitly selected.
 */
export const getDefaultPdfTemplate = query({
  args: {
    category: v.union(
      v.literal("invoice"),
      v.literal("ticket"),
      v.literal("certificate"),
      v.literal("receipt"),
      v.literal("badge")
    ),
  },
  handler: async (ctx, args) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      return null;
    }

    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Find default template for category
    const defaultTemplate = templates.find((t) => {
      const props = t.customProperties || {};
      return props.category === args.category && props.isDefault === true;
    });

    if (defaultTemplate) {
      return defaultTemplate._id;
    }

    // Fallback: return first matching category
    const firstMatch = templates.find((t) => {
      const props = t.customProperties || {};
      return props.category === args.category;
    });

    return firstMatch?._id || null;
  },
});

/**
 * Get PDF Template by Template Code
 *
 * Legacy support: Find template by its templateCode string.
 * Used for backward compatibility with old templateCode system.
 */
export const getPdfTemplateByCode = query({
  args: {
    templateCode: v.string(),
  },
  handler: async (ctx, args) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      return null;
    }

    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .collect();

    return templates.find((t) =>
      t.customProperties?.templateCode === args.templateCode
    ) || null;
  },
});

/**
 * Resolve PDF Template (Internal)
 *
 * Internal query for actions to resolve template IDs.
 * Actions can't access ctx.db directly, so they use this query.
 */
export const resolvePdfTemplateInternal = internalQuery({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await resolvePdfTemplate(ctx, args.templateId);
  },
});

/**
 * Get Available Email Templates by Category
 *
 * Returns all published email templates for a specific category.
 * Categories: "luxury", "minimal", "internal"
 */
export const getEmailTemplatesByCategory = query({
  args: {
    category: v.union(
      v.literal("luxury"),
      v.literal("minimal"),
      v.literal("internal")
    ),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
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
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter by category
    const filteredSystemTemplates = systemTemplates.filter((t) => {
      const props = t.customProperties || {};
      return props.category === args.category;
    });

    // Get org-specific templates if organization provided
    let orgTemplates: typeof systemTemplates = [];
    if (args.organizationId && args.organizationId !== systemOrg._id) {
      const allOrgTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId!).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "email"))
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();

      orgTemplates = allOrgTemplates.filter((t) => {
        const props = t.customProperties || {};
        return props.category === args.category;
      });
    }

    // Combine and format results
    const allTemplates = [...filteredSystemTemplates, ...orgTemplates];

    return allTemplates.map((t) => {
      const props = t.customProperties || {};
      return {
        _id: t._id,
        name: t.name,
        description: t.description || "",
        templateCode: props.templateCode as string,
        category: props.category as string,
        version: props.version as string || "1.0",
        previewImageUrl: props.previewImageUrl as string | undefined,
        isDefault: props.isDefault as boolean || false,
        isSystemTemplate: t.organizationId === systemOrg._id,
      };
    });
  },
});

/**
 * Get ALL Email Templates (No Category Filter)
 *
 * Returns all published email templates regardless of category.
 * Used for dropdowns that should show all available options.
 */
export const getAllEmailTemplates = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system templates (no category filter)
    const systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Get org-specific templates if organization provided
    let orgTemplates: typeof systemTemplates = [];
    if (args.organizationId && args.organizationId !== systemOrg._id) {
      orgTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId!).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "email"))
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();
    }

    // Combine and format results
    const allTemplates = [...systemTemplates, ...orgTemplates];

    return allTemplates.map((t) => {
      const props = t.customProperties || {};
      return {
        _id: t._id,
        name: t.name,
        description: t.description || "",
        templateCode: props.templateCode as string,
        category: props.category as string,
        version: props.version as string || "1.0",
        previewImageUrl: props.previewImageUrl as string | undefined,
        isDefault: props.isDefault as boolean || false,
        isSystemTemplate: t.organizationId === systemOrg._id,
      };
    });
  },
});

/**
 * Resolve Email Template for Actions (Internal Query)
 *
 * Resolves email template ID to templateCode for use in actions.
 * Actions can't access ctx.db directly, so they use this query.
 */
export const resolveEmailTemplateInternal = internalQuery({
  args: {
    templateId: v.optional(v.id("objects")),
    fallbackCategory: v.union(
      v.literal("luxury"),
      v.literal("minimal"),
      v.literal("internal")
    ),
  },
  handler: async (ctx, args) => {
    const { resolveEmailTemplateWithFallback } = await import("./emailTemplateResolver");
    const resolved = await resolveEmailTemplateWithFallback(
      ctx,
      args.templateId,
      args.fallbackCategory
    );
    return resolved;
  },
});
