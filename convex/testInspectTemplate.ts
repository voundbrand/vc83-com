import { query } from "./_generated/server";
import { v } from "convex/values";

export const inspectInvoiceTemplate = query({
  args: {},
  handler: async (ctx) => {
    // Find ALL templates with subtype "invoice" (should be "pdf" instead!)
    const templates = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "template"))
      .filter((q) => q.eq(q.field("subtype"), "invoice"))
      .collect();

    if (templates.length === 0) {
      return { error: "No invoice templates found", count: 0, templates: [] };
    }

    return {
      count: templates.length,
      templates: templates.map(t => ({
        templateId: t._id,
        name: t.name,
        subtype: t.subtype,
        templateCode: t.customProperties?.templateCode,
        category: t.customProperties?.category,
      })),
    };
  },
});
