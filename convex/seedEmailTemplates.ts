import { mutation } from "./_generated/server";
import { getAllEmailTemplateMetadata } from "../src/templates/emails/registry";

/**
 * SEED EMAIL TEMPLATES
 *
 * Creates template metadata in database for email templates.
 * Templates follow pattern: type: "template", subtype: "email"
 *
 * Run with: npx convex run seedEmailTemplates:seedEmailTemplates
 */
export const seedEmailTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting email template seeding...");

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

    // Get all email templates from registry
    const emailTemplates = getAllEmailTemplateMetadata();

    // Seed each template from registry
    for (const template of emailTemplates) {
      // Check if template already exists
      const existing = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", systemOrg._id).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "email"))
        .filter((q) => q.eq(q.field("customProperties.code"), template.code))
        .first();

      if (!existing) {
        // Create new template
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "template",
          subtype: "email",
          name: template.name,
          status: "published",
          customProperties: {
            code: template.code, // Legacy field
            templateCode: template.code, // Required field for template resolution
            description: template.description,
            category: template.category,
            supportedLanguages: template.supportedLanguages,
            supportsAttachments: template.supportsAttachments,
            author: template.author,
            version: template.version,
            previewImageUrl: template.previewImageUrl,
            isDefault: false, // Can be set to true for default templates
          },
          createdBy: firstUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        created.push(template.code);
        console.log(`✅ Created email template: ${template.name} (${template.code})`);
      } else {
        // Check if template needs updating (version changed OR missing templateCode)
        const existingVersion = existing.customProperties?.version;
        const missingTemplateCode = !existing.customProperties?.templateCode;

        if (existingVersion !== template.version || missingTemplateCode) {
          // Update template
          await ctx.db.patch(existing._id, {
            name: template.name,
            customProperties: {
              code: template.code, // Legacy field
              templateCode: template.code, // Required field for template resolution
              description: template.description,
              category: template.category,
              supportedLanguages: template.supportedLanguages,
              supportsAttachments: template.supportsAttachments,
              author: template.author,
              version: template.version,
              previewImageUrl: template.previewImageUrl,
              isDefault: existing.customProperties?.isDefault || false,
            },
            updatedAt: Date.now(),
          });
          updated.push(template.code);
          if (missingTemplateCode) {
            console.log(`🔄 Updated email template (added templateCode): ${template.name} (${template.code})`);
          } else {
            console.log(
              `🔄 Updated email template: ${template.name} (${template.code}) - v${existingVersion} → v${template.version}`
            );
          }
        } else {
          skipped.push(template.code);
          console.log(`⏭️  Skipping ${template.code} (already exists with same version)`);
        }
      }
    }

    console.log("✨ Email template seeding complete!");
    console.log(`📊 Summary: ${created.length} created, ${updated.length} updated, ${skipped.length} skipped`);

    return {
      created,
      updated,
      skipped,
      total: emailTemplates.length,
    };
  },
});

/**
 * DELETE ALL EMAIL TEMPLATES (for testing/reset)
 *
 * DANGEROUS: Only use in development!
 */
export const deleteAllEmailTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("⚠️  Deleting all email templates...");

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
      .collect();

    // Delete each template
    for (const template of emailTemplates) {
      await ctx.db.delete(template._id);
      console.log(`🗑️  Deleted: ${template.name}`);
    }

    console.log(`✨ Deleted ${emailTemplates.length} email templates`);

    return { deleted: emailTemplates.length };
  },
});

/**
 * LIST ALL EMAIL TEMPLATES
 *
 * Utility to view seeded templates
 */
export const listEmailTemplates = mutation({
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
      .collect();

    console.log(`📋 Found ${emailTemplates.length} email templates:`);

    const summary = emailTemplates.map((t) => ({
      code: t.customProperties?.code,
      name: t.name,
      category: t.customProperties?.category,
      version: t.customProperties?.version,
      languages: t.customProperties?.supportedLanguages,
    }));

    // Can't use console.table in Convex, just return data
    return summary;
  },
});
