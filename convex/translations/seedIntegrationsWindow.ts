/**
 * SEED INTEGRATIONS WINDOW TRANSLATIONS
 *
 * Seeds translations for the Integrations & API window.
 *
 * Run: npx convex run translations/seedIntegrationsWindow:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Integrations Window translations...");

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
      // === WINDOW TITLE ===
      {
        key: "ui.windows.integrations.title",
        values: {
          en: "Integrations & API",
          de: "Integrationen & API",
          pl: "Integracje i API",
          es: "Integraciones y API",
          fr: "Intégrations et API",
          ja: "統合とAPI",
        }
      },
    ];

    // Get all unique translation keys
    const allKeys = translations.map(t => t.key);

    // Efficiently check which translations already exist
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    // Insert only new translations
    let count = 0;
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
            "ui",
            "integrations-window"
          );

          if (result.inserted || result.updated) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Integrations Window translations`);
    return { success: true, count };
  }
});
