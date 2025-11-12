/**
 * EMAIL TEMPLATE ONTOLOGY
 *
 * Queries for fetching email templates for use in email sending.
 * Email templates are stored as: type: "template", subtype: "email"
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all system email templates
 * (Public - for template browsing/selection)
 */
export const getAllSystemEmailTemplates = query({
  args: {},
  handler: async (ctx) => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all email templates
    const emailTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    return emailTemplates;
  },
});

/**
 * Get email template by code
 * (Public - for template lookups)
 */
export const getEmailTemplateByCode = query({
  args: {
    templateCode: v.string(),
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

    // Find template by code
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), args.templateCode))
      .first();

    return template;
  },
});
