/**
 * FIX: Invoice Template Subtype
 * Directly patches the invoice template to fix the subtype
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const fixInvoiceTemplate = internalMutation({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) {
      throw new Error("Template not found");
    }

    console.log("📋 Current template state:");
    console.log("  Name:", template.name);
    console.log("  Type:", template.type);
    console.log("  Subtype:", template.subtype);
    console.log("  Category:", template.customProperties?.category);

    // Fix the subtype
    await ctx.db.patch(args.templateId, {
      subtype: "pdf",
    });

    console.log("✅ Updated template subtype to 'pdf'");

    const updated = await ctx.db.get(args.templateId);
    console.log("📋 New template state:");
    console.log("  Subtype:", updated?.subtype);

    return {
      success: true,
      oldSubtype: template.subtype,
      newSubtype: updated?.subtype,
    };
  },
});
