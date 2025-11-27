import { query } from "./_generated/server";

/**
 * TEST: List all email templates with full details
 * Run: npx convex run testEmailTemplates:testGetAllTemplates
 */
export const testGetAllTemplates = query({
  args: {},
  handler: async (ctx) => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      console.log("❌ System organization not found");
      return [];
    }

    console.log("✅ System org found:", systemOrg._id);

    // Get all email templates
    const emailTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    console.log(`📧 Found ${emailTemplates.length} email templates`);

    // Find newsletter template
    const newsletter = emailTemplates.find(
      (t) => t.customProperties?.code === "newsletter-confirmation"
    );

    if (newsletter) {
      console.log("✅ Newsletter template found!");
      console.log("  ID:", newsletter._id);
      console.log("  Name:", newsletter.name);
      console.log("  Has schema:", !!newsletter.customProperties?.emailTemplateSchema);
    } else {
      console.log("❌ Newsletter template NOT found in query results");
    }

    return emailTemplates.map((t) => ({
      _id: t._id,
      name: t.name,
      code: t.customProperties?.code,
      category: t.customProperties?.category,
      hasSchema: !!t.customProperties?.emailTemplateSchema,
    }));
  },
});
