/**
 * TEMPLATE SET QUERIES
 *
 * Public queries for fetching template sets and resolving templates.
 * Used by frontend UI for template set selection dropdowns.
 */

import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { resolveTemplateSet, resolveIndividualTemplate } from "./templateSetResolver";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";

/**
 * Get Available Template Sets
 *
 * Returns ONLY template sets that are enabled for this organization via availability ontology.
 * Super admins control which template sets each organization can access.
 *
 * NOTE: This is a public query (no auth) for use in UI components.
 * For authenticated availability queries, use templateSetAvailability.getAvailableTemplateSets
 */
export const getAvailableTemplateSets = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get enabled availabilities for this org
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set_availability")
      )
      .filter((q) => q.eq(q.field("customProperties.available"), true))
      .collect();

    const enabledSetIds = availabilities.map(
      (a) => a.customProperties?.templateSetId as Id<"objects">
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

    // Get all template sets (both system and org)
    const allSets = await Promise.all(
      enabledSetIds.map(async (setId) => {
        const set = await ctx.db.get(setId);
        return set;
      })
    );

    return allSets.filter(Boolean) as Doc<"objects">[];
  },
});

/**
 * Get Template Set by ID
 */
export const getTemplateSetById = query({
  args: {
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      return null;
    }

    const props = set.customProperties || {};
    const templates = (props.templates || []) as Array<{
      templateId: string;
      templateType: string;
      isRequired?: boolean;
    }>;

    return {
      _id: set._id,
      name: set.name,
      description: set.description || "",
      ticketTemplateId: props.ticketTemplateId as string,
      invoiceTemplateId: props.invoiceTemplateId as string,
      emailTemplateId: props.emailTemplateId as string,
    };
  },
});

/**
 * Get Default Template Set for Organization
 *
 * Returns the default template set ID for an organization.
 * Used for fallback when no template set is explicitly selected.
 */
export const getDefaultTemplateSet = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
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

    const systemDefault = systemSets.find((set) => set.customProperties?.isSystemDefault);
    return systemDefault || systemSets[0] || null;
  },
});

/**
 * Resolve Template Set for Entity (Public)
 *
 * Wraps the internal resolver for public use.
 * Returns the complete template set with resolved templates.
 */
export const resolveTemplateSetForEntity = query({
  args: {
    organizationId: v.id("organizations"),
    context: v.optional(v.object({
      manualSetId: v.optional(v.id("objects")),
      productId: v.optional(v.id("objects")),
      checkoutInstanceId: v.optional(v.id("objects")),
      domainConfigId: v.optional(v.id("objects")),
    })),
  },
  handler: async (ctx, args) => {
    return await resolveTemplateSet(
      ctx,
      args.organizationId,
      args.context
    );
  },
});

/**
 * Resolve Individual Template (Public)
 *
 * Wraps the internal template resolver for public use.
 * Returns a single resolved template.
 */
export const resolveIndividualTemplatePublic = query({
  args: {
    organizationId: v.id("organizations"),
    templateType: v.string(),
    context: v.optional(v.object({
      manualSetId: v.optional(v.id("objects")),
      productId: v.optional(v.id("objects")),
      checkoutInstanceId: v.optional(v.id("objects")),
      domainConfigId: v.optional(v.id("objects")),
    })),
  },
  handler: async (ctx, args) => {
    return await resolveIndividualTemplate(
      ctx,
      args.organizationId,
      args.templateType,
      args.context
    );
  },
});

/**
 * Resolve Individual Template (Internal)
 *
 * Internal version for use by other Convex functions.
 * Returns a single resolved template ID.
 */
export const resolveIndividualTemplateInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    templateType: v.string(),
    context: v.optional(v.object({
      manualSetId: v.optional(v.id("objects")),
      productId: v.optional(v.id("objects")),
      checkoutInstanceId: v.optional(v.id("objects")),
      domainConfigId: v.optional(v.id("objects")),
    })),
  },
  handler: async (ctx, args) => {
    return await resolveIndividualTemplate(
      ctx,
      args.organizationId,
      args.templateType,
      args.context
    );
  },
});

/**
 * Get Templates in Template Set (Public)
 *
 * Returns all templates included in a specific template set with their metadata.
 * Used for displaying template set contents in UI.
 */
export const getTemplatesInSet = internalQuery({
  args: {
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    // Get objectLinks that connect this template set to templates
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.setId))
      .filter((q) => q.eq(q.field("linkType"), "includes_template"))
      .collect();

    // Get all template details
    const templates = await Promise.all(
      links.map(async (link) => {
        const template = await ctx.db.get(link.toObjectId);
        if (!template) return null;

        return {
          template,
          templateType: link.properties?.templateType as string,
          isRequired: link.properties?.isRequired as boolean || false,
          linkMetadata: link.properties || {},
        };
      })
    );

    // Filter out nulls and organize by type
    const validTemplates = templates.filter((t) => t !== null) as Array<{
      template: Doc<"objects">;
      templateType: string;
      isRequired: boolean;
      linkMetadata: Record<string, any>;
    }>;

    // Separate by template category
    const emailTemplates = validTemplates.filter(t => {
      const type = t.template.type;
      const subtype = t.template.subtype;
      return type === "template" && subtype === "email";
    });

    const pdfTemplates = validTemplates.filter(t => {
      const type = t.template.type;
      const subtype = t.template.subtype;
      return type === "template" && subtype === "pdf";
    });

    return {
      set,
      templates: validTemplates,
      emailTemplates,
      pdfTemplates,
      counts: {
        total: validTemplates.length,
        email: emailTemplates.length,
        pdf: pdfTemplates.length,
        required: validTemplates.filter(t => t.isRequired).length,
        optional: validTemplates.filter(t => !t.isRequired).length,
      },
    };
  },
});

/**
 * Get Template Set With All Templates (Public)
 *
 * Public wrapper for getTemplatesInSet.
 * Returns template set details with all linked templates organized by type.
 * Used by UI components to display template set contents.
 */
export const getTemplateSetWithAllTemplates = query({
  args: {
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const set = await ctx.db.get(args.setId);
    if (!set || set.type !== "template_set") {
      throw new Error("Template set not found");
    }

    // Get objectLinks that connect this template set to templates
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.setId))
      .filter((q) => q.eq(q.field("linkType"), "includes_template"))
      .collect();

    // Get all template details
    const templates = await Promise.all(
      links.map(async (link) => {
        const template = await ctx.db.get(link.toObjectId);
        if (!template) return null;

        return {
          template,
          templateType: link.properties?.templateType as string,
          isRequired: link.properties?.isRequired as boolean || false,
          linkMetadata: link.properties || {},
        };
      })
    );

    // Filter out nulls and organize by type
    const validTemplates = templates.filter((t) => t !== null) as Array<{
      template: Doc<"objects">;
      templateType: string;
      isRequired: boolean;
      linkMetadata: Record<string, any>;
    }>;

    // Separate by template category
    const emailTemplates = validTemplates.filter(t => {
      const type = t.template.type;
      const subtype = t.template.subtype;
      return type === "template" && subtype === "email";
    });

    const pdfTemplates = validTemplates.filter(t => {
      const type = t.template.type;
      const subtype = t.template.subtype;
      return type === "template" && subtype === "pdf";
    });

    return {
      set,
      templates: validTemplates,
      emailTemplates,
      pdfTemplates,
      counts: {
        total: validTemplates.length,
        email: emailTemplates.length,
        pdf: pdfTemplates.length,
        required: validTemplates.filter(t => t.isRequired).length,
        optional: validTemplates.filter(t => !t.isRequired).length,
      },
    };
  },
});

/**
 * Get Template Set Links for Organization
 *
 * Returns a mapping of template IDs to template set IDs for filtering purposes.
 * Used in the Templates window to filter templates by template set.
 */
export const getTemplateSetLinks = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get all template sets for this organization
    const templateSets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template_set")
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    if (templateSets.length === 0) {
      return []; // Graceful handling: no template sets yet
    }

    // Get all objectLinks that connect template sets to templates
    const allLinks = await Promise.all(
      templateSets.map(async (set) => {
        const links = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_object", (q) => q.eq("fromObjectId", set._id))
          .filter((q) => q.eq(q.field("linkType"), "includes_template"))
          .collect();

        return links.map((link) => ({
          templateSetId: set._id,
          templateSetName: set.name,
          templateId: link.toObjectId,
        }));
      })
    );

    // Flatten the array
    return allLinks.flat();
  },
});
