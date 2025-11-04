import { mutation } from "./_generated/server";
import { PDF_TEMPLATE_REGISTRY } from "./pdfTemplateRegistry";

/**
 * SEED PDF TEMPLATES
 *
 * Creates template metadata in database that references API Template.io templates.
 * Templates follow the standardized pattern: type: "template", subtype: "pdf"
 *
 * Run with: npx convex run seedPdfTemplates:seedPdfTemplates
 */
export const seedPdfTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting PDF template seeding...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first before seeding templates.");
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const updated: string[] = [];

    // Seed each template from registry
    for (const [code, template] of Object.entries(PDF_TEMPLATE_REGISTRY)) {
      // Check if template already exists
      const existing = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", systemOrg._id).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "pdf"))
        .filter((q) => q.eq(q.field("customProperties.code"), code))
        .first();

      if (!existing) {
        // Create new template
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "template",
          subtype: "pdf",
          name: template.name,
          status: "published",
          customProperties: {
            code: template.code,
            description: template.description,
            category: template.category,
            apiTemplate: template.apiTemplate,
            requiredFields: template.requiredFields,
            defaultStyling: template.defaultStyling,
            previewImageUrl: template.previewImageUrl,
            version: template.version,
          },
          createdBy: firstUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        created.push(code);
        console.log(`✅ Created PDF template: ${template.name} (${code})`);
      } else {
        // Check if template needs updating (version changed)
        const existingVersion = existing.customProperties?.version;
        if (existingVersion !== template.version) {
          // Update template
          await ctx.db.patch(existing._id, {
            name: template.name,
            customProperties: {
              code: template.code,
              description: template.description,
              category: template.category,
              apiTemplate: template.apiTemplate,
              requiredFields: template.requiredFields,
              defaultStyling: template.defaultStyling,
              previewImageUrl: template.previewImageUrl,
              version: template.version,
            },
            updatedAt: Date.now(),
          });
          updated.push(code);
          console.log(`🔄 Updated PDF template: ${template.name} (${code}) - v${existingVersion} → v${template.version}`);
        } else {
          skipped.push(code);
          console.log(`⏭️  Skipping ${code} (already exists with same version)`);
        }
      }
    }

    console.log("✨ PDF template seeding complete!");
    console.log(`📊 Summary: ${created.length} created, ${updated.length} updated, ${skipped.length} skipped`);

    return {
      created,
      updated,
      skipped,
      total: Object.keys(PDF_TEMPLATE_REGISTRY).length,
    };
  },
});

/**
 * DELETE ALL PDF TEMPLATES (for testing/reset)
 *
 * DANGEROUS: Only use in development!
 */
export const deleteAllPdfTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("⚠️  Deleting all PDF templates...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all PDF templates
    const pdfTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .collect();

    // Delete each template
    for (const template of pdfTemplates) {
      await ctx.db.delete(template._id);
      console.log(`🗑️  Deleted: ${template.name}`);
    }

    console.log(`✨ Deleted ${pdfTemplates.length} PDF templates`);

    return { deleted: pdfTemplates.length };
  },
});

/**
 * LIST ALL PDF TEMPLATES
 *
 * Utility to view seeded templates
 */
export const listPdfTemplates = mutation({
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

    // Get all PDF templates
    const pdfTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .collect();

    console.log(`📋 Found ${pdfTemplates.length} PDF templates:`);

    const summary = pdfTemplates.map((t) => ({
      code: t.customProperties?.code,
      name: t.name,
      category: t.customProperties?.category,
      version: t.customProperties?.version,
      templateId: t.customProperties?.apiTemplate?.templateId,
    }));

    console.table(summary);

    return summary;
  },
});
