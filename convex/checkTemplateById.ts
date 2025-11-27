import { query } from "./_generated/server";
import { v } from "convex/values";

export const checkTemplate = query({
  args: { templateId: v.id("objects") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) {
      return { error: "Template not found" };
    }

    return {
      templateId: template._id,
      name: template.name,
      type: template.type,
      subtype: template.subtype,
      templateCode: template.customProperties?.templateCode,
      category: template.customProperties?.category,
    };
  },
});
