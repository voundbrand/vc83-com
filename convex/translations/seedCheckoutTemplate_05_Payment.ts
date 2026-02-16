/**
 * SEED CHECKOUT TEMPLATE - PAYMENT STEP (MASTER ORCHESTRATOR)
 *
 * This is a master seed file that orchestrates the seeding of all Payment step translations.
 * It calls two sub-seed files to avoid buffer overflow issues:
 *
 * 1. seedCheckoutTemplate_05a_PaymentMethods - Payment method selection (~15 keys)
 * 2. seedCheckoutTemplate_05b_PaymentForm - Payment form and errors (~15 keys)
 *
 * Total: ~30 keys × 6 languages = 180 translations
 *
 * Component: src/templates/checkout/behavior-driven/steps/payment.tsx
 * Namespace: ui.checkout_template.behavior_driven.payment
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCheckoutTemplate_05_Payment:seed
 */

import { mutation } from "../_generated/server";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("\n🌱 ================================================");
    console.log("🌱 SEEDING PAYMENT STEP TRANSLATIONS (MASTER)");
    console.log("🌱 ================================================\n");

    const results = {
      paymentMethods: null as any,
      paymentForm: null as any,
    };

    try {
      // Part 1: Payment Methods
      console.log("📦 Part 1/2: Payment Methods...");
      results.paymentMethods = await (ctx as any).runMutation(
        generatedApi.internal.translations.seedCheckoutTemplate_05a_PaymentMethods.seed
      );
      console.log(`   ✅ ${results.paymentMethods.count} translations inserted (${results.paymentMethods.totalKeys} keys)\n`);

      // Part 2: Payment Form
      console.log("📦 Part 2/2: Payment Form...");
      results.paymentForm = await (ctx as any).runMutation(
        generatedApi.internal.translations.seedCheckoutTemplate_05b_PaymentForm.seed
      );
      console.log(`   ✅ ${results.paymentForm.count} translations inserted (${results.paymentForm.totalKeys} keys)\n`);

      // Summary
      const totalKeys = results.paymentMethods.totalKeys + results.paymentForm.totalKeys;
      const totalInserted = results.paymentMethods.count + results.paymentForm.count;

      console.log("🌱 ================================================");
      console.log("🎉 PAYMENT STEP TRANSLATIONS COMPLETE");
      console.log("🌱 ================================================");
      console.log(`📊 Total Keys: ${totalKeys}`);
      console.log(`✅ Total Inserted: ${totalInserted}`);
      console.log(`🌍 Languages: 6 (en, de, pl, es, fr, ja)`);
      console.log(`📦 Split Files: 2 (payment methods, payment form)`);
      console.log("🌱 ================================================\n");

      return {
        success: true,
        totalKeys,
        totalInserted,
        parts: {
          paymentMethods: results.paymentMethods,
          paymentForm: results.paymentForm,
        },
      };
    } catch (error) {
      console.error("❌ Error seeding Payment step translations:", error);
      throw error;
    }
  }
});
