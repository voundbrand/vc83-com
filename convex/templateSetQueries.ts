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
 * Resolve Template Set (Internal Query)
 *
 * Used by actions to resolve template sets.
 * Actions can't access ctx.db directly, so they use this query.
 */
export const resolveTemplateSetInternal = internalQuery({
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
    return await resolveTemplateSet(ctx, args.organizationId, args.context);
  },
});

/**
 * Resolve Individual Template (Internal Query)
 *
 * Resolves a single template type (ticket, invoice, or email) from the set.
 * Used by actions that only need one template type.
 */
export const resolveIndividualTemplateInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    templateType: v.union(v.literal("ticket"), v.literal("invoice"), v.literal("email")),
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
 * Get Template Set by ID
 *
 * Returns full details for a single template set including linked templates.
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

    // Fetch linked templates
    const props = set.customProperties || {};
    const ticketTemplate = await ctx.db.get(props.ticketTemplateId as Id<"objects">);
    const invoiceTemplate = await ctx.db.get(props.invoiceTemplateId as Id<"objects">);
    const emailTemplate = await ctx.db.get(props.emailTemplateId as Id<"objects">);

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
