/**
 * SEED CHECKOUT TRANSLATIONS - CUSTOMER INFO STEP (MASTER ORCHESTRATOR)
 *
 * This is a master seed file that orchestrates the seeding of all Customer Info translations.
 * It calls three sub-seed files to avoid buffer overflow issues:
 *
 * 1. seedCheckout_01a_BasicInfo - Headers, labels, placeholders, helpers, buttons (~24 keys)
 * 2. seedCheckout_01b_Errors - All validation error messages (~9 keys)
 * 3. seedCheckout_01c_B2BFields - B2B fields, countries, employer billing (~40 keys)
 *
 * Total: ~73 keys × 6 languages = 438 translations
 *
 * Component: src/components/checkout/steps/customer-info-step.tsx
 * Namespace: ui.checkout.customer_info
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations:seedCheckout_01_CustomerInfo
 */

import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("\n🌱 ================================================");
    console.log("🌱 SEEDING CUSTOMER INFO TRANSLATIONS (MASTER)");
    console.log("🌱 ================================================\n");

    const results = {
      basicInfo: null as any,
      errors: null as any,
      b2bFields: null as any,
    };

    try {
      // ============================================================
      // PART 1: Basic Information (Headers, Labels, Placeholders)
      // ============================================================
      console.log("📦 Part 1/3: Basic Information...");
      results.basicInfo = await ctx.runMutation(
        internal.translations.seedCheckout_01a_BasicInfo.seed
      );
      console.log(`   ✅ ${results.basicInfo.count} translations inserted (${results.basicInfo.totalKeys} keys)\n`);

      // ============================================================
      // PART 2: Error Messages
      // ============================================================
      console.log("📦 Part 2/3: Error Messages...");
      results.errors = await ctx.runMutation(
        internal.translations.seedCheckout_01b_Errors.seed
      );
      console.log(`   ✅ ${results.errors.count} translations inserted (${results.errors.totalKeys} keys)\n`);

      // ============================================================
      // PART 3: B2B Fields & Countries
      // ============================================================
      console.log("📦 Part 3/3: B2B Fields & Countries...");
      results.b2bFields = await ctx.runMutation(
        internal.translations.seedCheckout_01c_B2BFields.seed
      );
      console.log(`   ✅ ${results.b2bFields.count} translations inserted (${results.b2bFields.totalKeys} keys)\n`);

      // ============================================================
      // SUMMARY
      // ============================================================
      const totalKeys = results.basicInfo.totalKeys + results.errors.totalKeys + results.b2bFields.totalKeys;
      const totalInserted = results.basicInfo.count + results.errors.count + results.b2bFields.count;

      console.log("🌱 ================================================");
      console.log("🎉 CUSTOMER INFO TRANSLATIONS COMPLETE");
      console.log("🌱 ================================================");
      console.log(`📊 Total Keys: ${totalKeys}`);
      console.log(`✅ Total Inserted: ${totalInserted}`);
      console.log(`🌍 Languages: 6 (en, de, pl, es, fr, ja)`);
      console.log(`📦 Split Files: 3 (basic info, errors, B2B fields)`);
      console.log("🌱 ================================================\n");

      return {
        success: true,
        totalKeys,
        totalInserted,
        parts: {
          basicInfo: results.basicInfo,
          errors: results.errors,
          b2bFields: results.b2bFields,
        },
      };
    } catch (error) {
      console.error("❌ Error seeding Customer Info translations:", error);
      throw error;
    }
  }
});
