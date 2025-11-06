/**
 * SEED CHECKOUT TEMPLATE - PROGRESS INDICATORS
 *
 * Seeds translations for checkout progress bar (Step X of Y, % Complete).
 * Run independently: npx convex run translations/seedCheckoutTemplate_00_Progress:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Progress Indicators...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // Progress indicators
      {
        key: "ui.checkout_template.behavior_driven.progress.step_of",
        values: {
          en: "Step {current} of {total}",
          de: "Schritt {current} von {total}",
          pl: "Krok {current} z {total}",
          es: "Paso {current} de {total}",
          fr: "Étape {current} sur {total}",
          ja: "ステップ{current}/{total}",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.progress.percent_complete",
        values: {
          en: "{percent}% Complete",
          de: "{percent}% abgeschlossen",
          pl: "{percent}% ukończone",
          es: "{percent}% completado",
          fr: "{percent}% terminé",
          ja: "{percent}% 完了",
        }
      },
    ];

    let insertedCount = 0;
    let updatedCount = 0;

    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "checkout-template",
            "progress-indicators"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Progress indicators: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  }
});
