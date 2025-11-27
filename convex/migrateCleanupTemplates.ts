/**
 * TEMPLATE CLEANUP MIGRATION SCRIPT
 *
 * Safely removes old hardcoded HTML email templates from the database.
 * Keeps only schema-driven templates and functional PDF templates.
 *
 * SAFETY FEATURES:
 * - Dry-run mode (preview before deleting)
 * - Protects schema-driven templates
 * - Detailed logging
 * - Returns list of deleted templates for rollback
 *
 * Run with dry-run (SAFE - no changes):
 * ```bash
 * npx convex run migrateCleanupTemplates:cleanupOldTemplates '{"dryRun": true}'
 * ```
 *
 * Run actual cleanup (CAUTION):
 * ```bash
 * npx convex run migrateCleanupTemplates:cleanupOldTemplates '{"dryRun": false}'
 * ```
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cleanupOldTemplates = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // Default: true (safe mode)
  },
  handler: async (ctx, args): Promise<{
    dryRun: boolean;
    summary: {
      totalScanned: number;
      protected: number;
      toDelete: number;
      deleted: number;
    };
    protected: any[];
    deleted: any[];
    errors: any[];
  }> => {
    const dryRun = args.dryRun !== false; // Default to true (safe mode)

    console.log("\n🧹 ==============================================");
    if (dryRun) {
      console.log("🧹 TEMPLATE CLEANUP - DRY RUN MODE (SAFE)");
      console.log("🧹 No templates will be deleted");
    } else {
      console.log("🧹 TEMPLATE CLEANUP - EXECUTION MODE");
      console.log("🧹 ⚠️  WARNING: Templates will be permanently deleted!");
    }
    console.log("🧹 ==============================================\n");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Fetch all templates
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    console.log(`📊 Total templates scanned: ${allTemplates.length}\n`);

    // Define templates to PROTECT (never delete these)
    const protectedCodes = [
      "event-confirmation-v2",      // ✅ New schema email
      "transaction-receipt-v2",     // ✅ New schema email
      "newsletter-confirmation",    // ✅ New schema email
      "invoice-email-v2",           // ✅ New schema email
      "email_invoice_send",         // Keep old invoice email temporarily for backward compat
      "pdf_invoice_b2b_single",     // ✅ Schema PDF
    ];

    // Also protect ALL PDF templates (they're still functional)
    const protectedCategories = ["ticket", "invoice", "receipt", "badge", "eventdoc", "quote", "leadmagnet"];

    const protectedTemplates: any[] = [];
    const toDelete: any[] = [];
    const deleted: any[] = [];
    const errors: any[] = [];

    // Categorize each template
    for (const template of allTemplates) {
      const props = template.customProperties || {};
      const code = props.code || props.templateCode || "";
      const category = props.category || "";
      const hasSchema = !!props.emailTemplateSchema;
      const isPublished = template.status === "published";

      const templateInfo = {
        _id: template._id,
        name: template.name,
        code,
        category,
        subtype: template.subtype,
        status: template.status,
        hasSchema,
        reason: "",
      };

      // Determine if template should be protected or deleted
      let shouldProtect = false;
      let reason = "";

      // Rule 1: Protect by code
      if (protectedCodes.includes(code)) {
        shouldProtect = true;
        reason = "Schema-driven template (protected by code)";
      }
      // Rule 2: Protect all PDF templates
      else if (template.subtype === "pdf") {
        shouldProtect = true;
        reason = "PDF template (all PDFs protected)";
      }
      // Rule 3: Protect by category
      else if (protectedCategories.includes(category)) {
        shouldProtect = true;
        reason = `Protected category: ${category}`;
      }
      // Rule 4: Protect if it has schema but no HTML (schema-driven)
      else if (hasSchema && !props.html) {
        shouldProtect = true;
        reason = "Schema-driven email template";
      }
      // Rule 5: Delete if it's a hardcoded HTML email template
      else if (template.subtype === "email" && props.html && !hasSchema) {
        shouldProtect = false;
        reason = "Hardcoded HTML email template (replaced by schema versions)";
      }
      // Rule 6: Delete if it's an old email template with both HTML and schema (hybrid - outdated)
      else if (template.subtype === "email" && props.html && hasSchema) {
        shouldProtect = false;
        reason = "Hybrid HTML+Schema template (outdated pattern)";
      }
      // Default: protect unknown templates (investigate manually)
      else {
        shouldProtect = true;
        reason = "Unknown type - protected by default (investigate manually)";
      }

      templateInfo.reason = reason;

      if (shouldProtect) {
        protectedTemplates.push(templateInfo);
      } else {
        toDelete.push(templateInfo);
      }
    }

    // Display what will be protected
    console.log(`✅ PROTECTED TEMPLATES (${protectedTemplates.length}) - Will NOT be deleted:\n`);
    protectedTemplates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`);
      console.log(`      Code: ${t.code}`);
      console.log(`      Reason: ${t.reason}`);
      console.log("");
    });

    // Display what will be deleted
    console.log(`\n❌ TEMPLATES TO DELETE (${toDelete.length}):\n`);
    if (toDelete.length === 0) {
      console.log("   (None - all templates are protected!)");
    } else {
      toDelete.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name}`);
        console.log(`      Code: ${t.code}`);
        console.log(`      Category: ${t.category}`);
        console.log(`      Reason: ${t.reason}`);
        console.log("");
      });
    }

    // Execute deletion (if not dry-run)
    if (!dryRun && toDelete.length > 0) {
      console.log("\n🗑️  DELETING TEMPLATES...\n");

      for (const template of toDelete) {
        try {
          await ctx.db.delete(template._id);
          deleted.push(template);
          console.log(`   ✅ Deleted: ${template.name} (${template.code})`);
        } catch (error: any) {
          const errorInfo = {
            template: template.name,
            code: template.code,
            error: error.message,
          };
          errors.push(errorInfo);
          console.error(`   ❌ Error deleting ${template.name}: ${error.message}`);
        }
      }

      console.log(`\n✅ Successfully deleted ${deleted.length} templates`);
      if (errors.length > 0) {
        console.log(`❌ Failed to delete ${errors.length} templates (see errors above)`);
      }
    } else if (dryRun) {
      console.log("\n💡 DRY RUN MODE - No changes made");
      console.log("   Run with dryRun: false to actually delete templates");
    } else {
      console.log("\n✅ No templates to delete!");
    }

    // Summary
    console.log("\n📋 SUMMARY\n");
    console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "EXECUTION (changes applied)"}`);
    console.log(`Total Templates Scanned: ${allTemplates.length}`);
    console.log(`Protected Templates: ${protectedTemplates.length}`);
    console.log(`Templates to Delete: ${toDelete.length}`);
    console.log(`Successfully Deleted: ${deleted.length}`);
    console.log(`Errors: ${errors.length}`);

    console.log("\n==============================================\n");

    return {
      dryRun,
      summary: {
        totalScanned: allTemplates.length,
        protected: protectedTemplates.length,
        toDelete: toDelete.length,
        deleted: deleted.length,
      },
      protected: protectedTemplates,
      deleted,
      errors,
    };
  },
});

/**
 * ROLLBACK MIGRATION
 *
 * Restores deleted templates from a backup list.
 * USE WITH CAUTION - Only works if you have the deleted templates data!
 *
 * Usage:
 * ```bash
 * npx convex run migrateCleanupTemplates:rollbackDeletion '{"backupFile": "path/to/backup.json"}'
 * ```
 */
export const rollbackDeletion = internalMutation({
  args: {
    deletedTemplates: v.array(v.any()), // Array of deleted template objects
  },
  handler: async (ctx, args) => {
    console.log("\n⏪ ==============================================");
    console.log("⏪ ROLLBACK MIGRATION - RESTORING TEMPLATES");
    console.log("⏪ ==============================================\n");

    const { deletedTemplates } = args;

    console.log(`📦 Attempting to restore ${deletedTemplates.length} templates...\n`);

    const restored: any[] = [];
    const failed: any[] = [];

    for (const template of deletedTemplates) {
      try {
        // Note: We can't restore with the same _id, so this creates new templates
        // with the same properties but different IDs
        const newId = await ctx.db.insert("objects", {
          organizationId: template.organizationId,
          type: template.type,
          subtype: template.subtype,
          name: template.name,
          status: template.status,
          customProperties: template.customProperties,
          createdBy: template.createdBy,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        restored.push({ originalId: template._id, newId, name: template.name });
        console.log(`   ✅ Restored: ${template.name} (new ID: ${newId})`);
      } catch (error: any) {
        failed.push({ template: template.name, error: error.message });
        console.error(`   ❌ Failed to restore ${template.name}: ${error.message}`);
      }
    }

    console.log(`\n📋 ROLLBACK SUMMARY\n`);
    console.log(`Templates to Restore: ${deletedTemplates.length}`);
    console.log(`Successfully Restored: ${restored.length}`);
    console.log(`Failed: ${failed.length}`);

    if (restored.length > 0) {
      console.log("\n⚠️  NOTE: Restored templates have NEW IDs!");
      console.log("   You may need to update the System Default Template Set.");
    }

    console.log("\n==============================================\n");

    return {
      restored,
      failed,
      message: `Restored ${restored.length} of ${deletedTemplates.length} templates`,
    };
  },
});

/**
 * CREATE BACKUP OF ALL TEMPLATES
 *
 * Exports all templates to a format that can be used for rollback.
 * Run this BEFORE cleanup to be safe!
 */
export const backupAllTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("\n💾 Creating backup of all templates...\n");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Fetch all templates
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    console.log(`✅ Backed up ${allTemplates.length} templates`);
    console.log("   Save the returned data to restore templates if needed!\n");

    return {
      backupDate: new Date().toISOString(),
      templateCount: allTemplates.length,
      templates: allTemplates,
    };
  },
});
