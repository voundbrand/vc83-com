/**
 * MIGRATION: Fix Template Subtypes
 *
 * Migrates templates with category-specific subtypes (invoice, ticket, etc.)
 * to use the correct "pdf" subtype with category in customProperties.
 *
 * Run with: npx convex run migrateTemplateSubtypes:fixTemplateSubtypes
 */

import { internalMutation } from "./_generated/server";

export const fixTemplateSubtypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting template subtype migration...");

    // Find all templates with category-specific subtypes
    const categoriesToFix = ["invoice", "ticket", "certificate", "receipt", "badge"];
    let totalFixed = 0;

    for (const category of categoriesToFix) {
      // Find templates with this category as subtype
      const templates = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "template"))
        .filter((q) => q.eq(q.field("subtype"), category))
        .collect();

      console.log(`📋 Found ${templates.length} templates with subtype="${category}"`);

      for (const template of templates) {
        // Update to correct format
        await ctx.db.patch(template._id, {
          subtype: "pdf",
        });

        // Ensure category is in customProperties
        const props = template.customProperties || {};
        if (!props.category) {
          await ctx.db.patch(template._id, {
            customProperties: {
              ...props,
              category: category,
            },
          });
        }

        console.log(`✅ Fixed template: ${template.name} (${template._id})`);
        console.log(`   Old: subtype="${category}"`);
        console.log(`   New: subtype="pdf", category="${category}"`);
        totalFixed++;
      }
    }

    console.log(`\n🎉 Migration complete! Fixed ${totalFixed} templates.`);

    return {
      success: true,
      templatesFixed: totalFixed,
      message: `Updated ${totalFixed} templates to use subtype="pdf"`,
    };
  },
});
