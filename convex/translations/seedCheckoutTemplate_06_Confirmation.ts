/**
 * SEED CHECKOUT TEMPLATE - CONFIRMATION STEP (MASTER ORCHESTRATOR)
 *
 * This is a master seed file that orchestrates the seeding of all Confirmation step translations.
 * It calls two sub-seed files to avoid buffer overflow issues:
 *
 * 1. seedCheckoutTemplate_06a_ConfirmationSuccess - Success messages and order summary (~18 keys)
 * 2. seedCheckoutTemplate_06b_ConfirmationInvoice - Invoice info and downloads (~11 keys)
 *
 * Total: ~29 keys × 6 languages = 174 translations
 *
 * Component: src/templates/checkout/behavior-driven/steps/confirmation.tsx
 * Namespace: ui.checkout_template.behavior_driven.confirmation
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCheckoutTemplate_06_Confirmation:seed
 */

import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("\n🌱 ================================================");
    console.log("🌱 SEEDING CONFIRMATION STEP TRANSLATIONS (MASTER)");
    console.log("🌱 ================================================\n");

    const results = {
      success: null as any,
      invoice: null as any,
    };

    try {
      // Part 1: Success & Order Summary
      console.log("📦 Part 1/2: Success & Order Summary...");
      results.success = await ctx.runMutation(
        internal.translations.seedCheckoutTemplate_06a_ConfirmationSuccess.seed
      );
      console.log(`   ✅ ${results.success.count} translations inserted (${results.success.totalKeys} keys)\n`);

      // Part 2: Invoice & Downloads
      console.log("📦 Part 2/2: Invoice & Downloads...");
      results.invoice = await ctx.runMutation(
        internal.translations.seedCheckoutTemplate_06b_ConfirmationInvoice.seed
      );
      console.log(`   ✅ ${results.invoice.count} translations inserted (${results.invoice.totalKeys} keys)\n`);

      // Summary
      const totalKeys = results.success.totalKeys + results.invoice.totalKeys;
      const totalInserted = results.success.count + results.invoice.count;

      console.log("🌱 ================================================");
      console.log("🎉 CONFIRMATION STEP TRANSLATIONS COMPLETE");
      console.log("🌱 ================================================");
      console.log(`📊 Total Keys: ${totalKeys}`);
      console.log(`✅ Total Inserted: ${totalInserted}`);
      console.log(`🌍 Languages: 6 (en, de, pl, es, fr, ja)`);
      console.log(`📦 Split Files: 2 (success, invoice & downloads)`);
      console.log("🌱 ================================================\n");

      return {
        success: true,
        totalKeys,
        totalInserted,
        parts: {
          success: results.success,
          invoice: results.invoice,
        },
      };
    } catch (error) {
      console.error("❌ Error seeding Confirmation step translations:", error);
      throw error;
    }
  }
});
