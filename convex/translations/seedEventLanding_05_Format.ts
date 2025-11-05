/**
 * SEED EVENT LANDING - FORMAT TYPES
 *
 * Seeds translations for event format types (Virtual, In-Person, Hybrid).
 * Run independently: npx convex run translations/seedEventLanding_05_Format:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Event Landing - Format Types...");

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
      // Event format types
      {
        key: "ui.event_landing.format.virtual",
        values: {
          en: "Virtual Event",
          de: "Virtuelles Event",
          pl: "Wydarzenie wirtualne",
          es: "Evento virtual",
          fr: "Événement virtuel",
          ja: "バーチャルイベント",
        }
      },
      {
        key: "ui.event_landing.format.in_person",
        values: {
          en: "In-Person",
          de: "Vor Ort",
          pl: "Osobiście",
          es: "Presencial",
          fr: "En personne",
          ja: "対面",
        }
      },
      {
        key: "ui.event_landing.format.hybrid",
        values: {
          en: "Hybrid Event",
          de: "Hybrides Event",
          pl: "Wydarzenie hybrydowe",
          es: "Evento híbrido",
          fr: "Événement hybride",
          ja: "ハイブリッドイベント",
        }
      },
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const inserted = await insertTranslationIfNew(
            ctx.db,
            existingKeys,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "event-landing",
            "format-types"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} event format translations`);
    return { success: true, count, totalKeys: translations.length };
  }
});
