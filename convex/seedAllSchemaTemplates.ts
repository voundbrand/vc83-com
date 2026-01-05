/**
 * MASTER SEED SCRIPT - ALL SCHEMA-DRIVEN TEMPLATES
 *
 * This script seeds all 5 schema-driven templates and the System Default Template Set v2.0.
 * Run this script to set up a clean, schema-driven template system from scratch.
 *
 * Templates included:
 * 1. Event Confirmation Email (v2.0 - Required)
 * 2. Transaction Receipt Email (v2.0 - Optional)
 * 3. Newsletter Confirmation Email (v1.0 - Optional)
 * 4. Invoice Email (v2.0 - Optional)
 * 5. B2B Invoice PDF (v1.0 - Optional)
 *
 * Run with:
 * ```bash
 * npx convex run seedAllSchemaTemplates:seedAllSchemaTemplates
 * ```
 *
 * Or with overwrite:
 * ```bash
 * npx convex run seedAllSchemaTemplates:seedAllSchemaTemplates '{"overwrite": true}'
 * ```
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const seedAllSchemaTemplates = internalMutation({
  args: {
    overwrite: v.optional(v.boolean()), // Set to true to update existing templates
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, _args): Promise<{
    message: string;
    totalTemplates: number;
    successCount: number;
    failedCount: number;
    results: Array<{ template: string; status: string; result?: unknown; error?: string }>;
    allSuccess: boolean;
  }> => {
    console.log("\n🌱 ==============================================");
    console.log("🌱 SEEDING ALL SCHEMA-DRIVEN TEMPLATES (v2.0)");
    console.log("🌱 ==============================================\n");

    const results: Array<{ template: string; status: string; result?: unknown; error?: string }> = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    // Helper to get error message
    const getErrorMessage = (error: unknown): string =>
      error instanceof Error ? error.message : String(error);

    // 1. Seed Event Confirmation Email
    console.log("📧 [1/5] Seeding Event Confirmation Email...");
    try {
      const eventResult = await ctx.runMutation(
        internal.seedEventConfirmationTemplate.seedEventConfirmationTemplate,
        {}
      );
      results.push({ template: "Event Confirmation Email", status: "success", result: eventResult });
      totalSuccess++;
      console.log("✅ Event Confirmation Email seeded successfully\n");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      results.push({ template: "Event Confirmation Email", status: "failed", error: msg });
      totalFailed++;
      console.error("❌ Failed to seed Event Confirmation Email:", msg, "\n");
    }

    // 2. Seed Transaction Receipt Email
    console.log("💳 [2/5] Seeding Transaction Receipt Email...");
    try {
      const receiptResult = await ctx.runMutation(
        internal.seedTransactionReceiptTemplate.seedTransactionReceiptTemplate,
        {}
      );
      results.push({ template: "Transaction Receipt Email", status: "success", result: receiptResult });
      totalSuccess++;
      console.log("✅ Transaction Receipt Email seeded successfully\n");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      results.push({ template: "Transaction Receipt Email", status: "failed", error: msg });
      totalFailed++;
      console.error("❌ Failed to seed Transaction Receipt Email:", msg, "\n");
    }

    // 3. Seed Newsletter Confirmation Email
    console.log("📰 [3/5] Seeding Newsletter Confirmation Email...");
    try {
      const newsletterResult = await ctx.runMutation(
        internal.seedNewsletterTemplate.seedNewsletterTemplate,
        {}
      );
      results.push({ template: "Newsletter Confirmation Email", status: "success", result: newsletterResult });
      totalSuccess++;
      console.log("✅ Newsletter Confirmation Email seeded successfully\n");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      results.push({ template: "Newsletter Confirmation Email", status: "failed", error: msg });
      totalFailed++;
      console.error("❌ Failed to seed Newsletter Confirmation Email:", msg, "\n");
    }

    // 4. Seed Invoice Email v2.0
    console.log("📄 [4/5] Seeding Invoice Email v2.0...");
    try {
      const invoiceEmailResult = await ctx.runMutation(
        internal.seedInvoiceEmailTemplateV2.seedInvoiceEmailTemplateV2,
        {}
      );
      results.push({ template: "Invoice Email v2.0", status: "success", result: invoiceEmailResult });
      totalSuccess++;
      console.log("✅ Invoice Email v2.0 seeded successfully\n");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      results.push({ template: "Invoice Email v2.0", status: "failed", error: msg });
      totalFailed++;
      console.error("❌ Failed to seed Invoice Email v2.0:", msg, "\n");
    }

    // 5. Seed B2B Invoice PDF
    console.log("💰 [5/5] Seeding B2B Invoice PDF...");
    try {
      const invoicePdfResult = await ctx.runMutation(
        internal.seedInvoiceB2BTemplate.seedInvoiceB2BTemplate,
        {}
      );
      results.push({ template: "B2B Invoice PDF", status: "success", result: invoicePdfResult });
      totalSuccess++;
      console.log("✅ B2B Invoice PDF seeded successfully\n");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      results.push({ template: "B2B Invoice PDF", status: "failed", error: msg });
      totalFailed++;
      console.error("❌ Failed to seed B2B Invoice PDF:", msg, "\n");
    }

    // 6. Seed System Default Template Set v2.0
    console.log("📦 [6/6] Seeding System Default Template Set v2.0...");
    try {
      const templateSetResult = await ctx.runMutation(
        internal.seedSystemDefaultTemplateSet.seedSystemDefaultTemplateSet,
        { overwrite: true } // Always overwrite to ensure latest config
      );
      results.push({ template: "System Default Template Set v2.0", status: "success", result: templateSetResult });
      totalSuccess++;
      console.log("✅ System Default Template Set v2.0 seeded successfully\n");
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      results.push({ template: "System Default Template Set v2.0", status: "failed", error: msg });
      totalFailed++;
      console.error("❌ Failed to seed System Default Template Set:", msg, "\n");
    }

    // Final summary
    console.log("\n🎉 ==============================================");
    console.log("🎉 SCHEMA TEMPLATE SEEDING COMPLETE");
    console.log("🎉 ==============================================\n");

    console.log("📊 Summary:");
    console.log(`   ✅ Success: ${totalSuccess}/6`);
    console.log(`   ❌ Failed: ${totalFailed}/6`);
    console.log("\n📋 Details:");

    results.forEach((r, i) => {
      const emoji = r.status === "success" ? "✅" : "❌";
      console.log(`   ${emoji} [${i + 1}] ${r.template}`);
      if (r.status === "failed") {
        console.log(`       Error: ${r.error}`);
      }
    });

    if (totalSuccess === 6) {
      console.log("\n🚀 All schema-driven templates are ready!");
      console.log("   Your system now has:");
      console.log("   • 4 Email Templates (Event, Receipt, Newsletter, Invoice)");
      console.log("   • 1 PDF Template (B2B Invoice)");
      console.log("   • 1 System Default Template Set (v2.0)");
      console.log("   • 100% Schema-Driven Architecture");
      console.log("   • AI-Ready for intelligent content generation");
    } else {
      console.log("\n⚠️  Some templates failed to seed. Check errors above.");
    }

    console.log("\n==============================================\n");

    return {
      message: "Schema template seeding complete",
      totalTemplates: 6,
      successCount: totalSuccess,
      failedCount: totalFailed,
      results,
      allSuccess: totalSuccess === 6,
    };
  },
});

/**
 * DELETE ALL SCHEMA TEMPLATES
 *
 * Removes all schema-driven templates for testing/reset purposes.
 * WARNING: This will delete all 5 schema templates!
 */
export const deleteAllSchemaTemplates = internalMutation({
  args: {},
  handler: async (ctx): Promise<{
    message: string;
    deletedCount: number;
    results: Array<{ template: string; deleted?: boolean; error?: string }>;
  }> => {
    console.log("\n🗑️  ==============================================");
    console.log("🗑️  DELETING ALL SCHEMA-DRIVEN TEMPLATES");
    console.log("🗑️  ==============================================\n");

    const results: Array<{ template: string; deleted?: boolean; error?: string }> = [];
    let totalDeleted = 0;

    // Helper to get error message
    const getErrorMessage = (error: unknown): string =>
      error instanceof Error ? error.message : String(error);

    // Delete Event Confirmation
    try {
      const r1 = await ctx.runMutation(
        internal.seedEventConfirmationTemplate.deleteEventConfirmationTemplate,
        {}
      );
      results.push({ template: "Event Confirmation", deleted: r1.deleted });
      if (r1.deleted) totalDeleted++;
    } catch (e: unknown) {
      results.push({ template: "Event Confirmation", error: getErrorMessage(e) });
    }

    // Delete Transaction Receipt
    try {
      const r2 = await ctx.runMutation(
        internal.seedTransactionReceiptTemplate.deleteTransactionReceiptTemplate,
        {}
      );
      results.push({ template: "Transaction Receipt", deleted: r2.deleted });
      if (r2.deleted) totalDeleted++;
    } catch (e: unknown) {
      results.push({ template: "Transaction Receipt", error: getErrorMessage(e) });
    }

    // Delete Newsletter
    try {
      const r3 = await ctx.runMutation(
        internal.seedNewsletterTemplate.deleteNewsletterTemplate,
        {}
      );
      results.push({ template: "Newsletter", deleted: r3.deleted });
      if (r3.deleted) totalDeleted++;
    } catch (e: unknown) {
      results.push({ template: "Newsletter", error: getErrorMessage(e) });
    }

    // Delete Invoice Email v2
    try {
      const r4 = await ctx.runMutation(
        internal.seedInvoiceEmailTemplateV2.deleteInvoiceEmailTemplateV2,
        {}
      );
      results.push({ template: "Invoice Email v2", deleted: r4.deleted });
      if (r4.deleted) totalDeleted++;
    } catch (e: unknown) {
      results.push({ template: "Invoice Email v2", error: getErrorMessage(e) });
    }

    console.log(`\n✅ Deleted ${totalDeleted} templates\n`);
    console.log("==============================================\n");

    return {
      message: "Schema templates deleted",
      deletedCount: totalDeleted,
      results,
    };
  },
});
