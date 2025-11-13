/**
 * MIGRATE PDF TEMPLATES - Add templateCode field
 *
 * One-time migration script to add templateCode field to existing templates.
 * This fixes the "Template missing templateCode" error.
 *
 * Run with: npx convex run migratePdfTemplates:migrateTemplateCodeField
 */

import { mutation } from "./_generated/server";

export const migrateTemplateCodeField = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting PDF template migration...");

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

    console.log(`📋 Found ${pdfTemplates.length} PDF templates`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const template of pdfTemplates) {
      try {
        const props = template.customProperties || {};
        const code = props.code as string | undefined;
        const templateCode = props.templateCode as string | undefined;

        // Skip if already has templateCode
        if (templateCode) {
          console.log(`⏭️  ${template.name}: Already has templateCode`);
          skipped++;
          continue;
        }

        // Skip if missing code field entirely
        if (!code) {
          console.error(`❌ ${template.name}: Missing both code and templateCode - cannot migrate`);
          errors++;
          continue;
        }

        // Add templateCode field from code
        await ctx.db.patch(template._id, {
          customProperties: {
            ...props,
            templateCode: code, // Copy code to templateCode
          },
          updatedAt: Date.now(),
        });

        console.log(`✅ ${template.name}: Added templateCode = "${code}"`);
        migrated++;
      } catch (error) {
        console.error(`❌ Failed to migrate ${template.name}:`, error);
        errors++;
      }
    }

    console.log("✨ Migration complete!");
    console.log(`📊 Summary: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);

    return {
      migrated,
      skipped,
      errors,
      total: pdfTemplates.length,
    };
  },
});

/**
 * SET DEFAULT TEMPLATES
 *
 * Marks specific templates as defaults for their categories.
 * Run after migration to set up default fallbacks.
 *
 * Run with: npx convex run migratePdfTemplates:setDefaultTemplates
 */
export const setDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Setting default templates...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Define default templates by category
    const defaults: Record<string, string> = {
      ticket: "ticket_professional_v1",
      invoice: "invoice_b2b_single_v1",
      receipt: "invoice_b2c_receipt_v1",
    };

    let updated = 0;

    for (const [category, templateCode] of Object.entries(defaults)) {
      // Find template by templateCode
      const templates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", systemOrg._id).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "pdf"))
        .collect();

      const template = templates.find((t) => {
        const props = t.customProperties || {};
        return props.templateCode === templateCode || props.code === templateCode;
      });

      if (template) {
        await ctx.db.patch(template._id, {
          customProperties: {
            ...template.customProperties,
            isDefault: true,
          },
          updatedAt: Date.now(),
        });
        console.log(`✅ Set default for ${category}: ${template.name}`);
        updated++;
      } else {
        console.warn(`⚠️  Default template not found: ${templateCode} for ${category}`);
      }
    }

    console.log(`✨ Set ${updated} default templates`);

    return { updated };
  },
});
