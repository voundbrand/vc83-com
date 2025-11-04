import { internalMutation } from "../_generated/server";

/**
 * MIGRATION: Standardize Page Templates
 *
 * Changes:
 * 1. Update templates: type: "page_template" → type: "template", subtype: "page"
 * 2. Update availabilities: Standardize property names
 *    - pageTemplateCode → templateCode
 *    - isEnabled → available
 *    - subtype: "page_template" → subtype: "page"
 */
export const migratePageTemplatesToStandardPattern = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting page template migration...");

    // STEP 1: Migrate template objects
    const pageTemplates = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "page_template"))
      .collect();

    console.log(`📄 Found ${pageTemplates.length} page templates to migrate`);

    for (const template of pageTemplates) {
      await ctx.db.patch(template._id, {
        type: "template",
        subtype: "page",
        updatedAt: Date.now(),
      });
      console.log(`  ✅ Migrated template: ${template.name} (${template.customProperties?.code})`);
    }

    // STEP 2: Migrate template availability objects
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "template_availability"))
      .filter((q) => q.eq(q.field("subtype"), "page_template"))
      .collect();

    console.log(`📄 Found ${availabilities.length} availability records to migrate`);

    for (const availability of availabilities) {
      // Standardize property names
      const oldCode = availability.customProperties?.pageTemplateCode;
      const oldEnabled = availability.customProperties?.isEnabled;

      if (oldCode) {
        const newCustomProperties = { ...availability.customProperties };

        // Add new standardized properties
        newCustomProperties.templateCode = oldCode;
        newCustomProperties.available = oldEnabled ?? true;

        // Remove old properties
        delete newCustomProperties.pageTemplateCode;
        delete newCustomProperties.isEnabled;

        await ctx.db.patch(availability._id, {
          subtype: "page",
          customProperties: newCustomProperties,
          updatedAt: Date.now(),
        });
        console.log(`  ✅ Migrated availability for: ${oldCode}`);
      }
    }

    console.log("✨ Migration complete!");

    return {
      success: true,
      migratedTemplates: pageTemplates.length,
      migratedAvailabilities: availabilities.length,
    };
  },
});

/**
 * ROLLBACK: Revert page templates to old pattern
 *
 * Use if migration causes issues
 */
export const rollbackPageTemplateMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Rolling back page template migration...");

    // Revert templates
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "template"))
      .filter((q) => q.eq(q.field("subtype"), "page"))
      .collect();

    for (const template of templates) {
      await ctx.db.patch(template._id, {
        type: "page_template",
        subtype: undefined,
        updatedAt: Date.now(),
      });
      console.log(`  ⏪ Reverted template: ${template.name}`);
    }

    // Revert availabilities
    const availabilities = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "template_availability"))
      .filter((q) => q.eq(q.field("subtype"), "page"))
      .collect();

    for (const availability of availabilities) {
      const code = availability.customProperties?.templateCode;
      const available = availability.customProperties?.available;

      if (code) {
        const newCustomProperties = { ...availability.customProperties };

        // Restore old property names
        newCustomProperties.pageTemplateCode = code;
        newCustomProperties.isEnabled = available ?? true;

        // Remove new properties
        delete newCustomProperties.templateCode;
        delete newCustomProperties.available;

        await ctx.db.patch(availability._id, {
          subtype: "page_template",
          customProperties: newCustomProperties,
          updatedAt: Date.now(),
        });
        console.log(`  ⏪ Reverted availability for: ${code}`);
      }
    }

    console.log("✨ Rollback complete!");

    return {
      success: true,
      rolledBackTemplates: templates.length,
      rolledBackAvailabilities: availabilities.length,
    };
  },
});
