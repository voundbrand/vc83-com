/**
 * SEED PROFILE TRANSLATIONS
 *
 * Seeds translations for organization profiles.
 * Run independently: npx convex run translations/seedProfileTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Profile translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    // Define supported locales
    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    // Profile translations
    const translations = [
      {
        key: "org.profile.system.bio",
        values: {
          en: "System organization for platform management",
          de: "Systemorganisation für Plattformverwaltung",
          pl: "Organizacja systemowa do zarządzania platformą",
          es: "Organización del sistema para la gestión de la plataforma",
          fr: "Organisation système pour la gestion de la plateforme",
          ja: "プラットフォーム管理用システム組織",
        }
      },
      {
        key: "org.profile.system.description",
        values: {
          en: "Core platform organization managing l4yercak3 infrastructure",
          de: "Kernplattformorganisation zur Verwaltung der l4yercak3-Infrastruktur",
          pl: "Główna organizacja platformy zarządzająca infrastrukturą l4yercak3",
          es: "Organización central de la plataforma que gestiona la infraestructura de l4yercak3",
          fr: "Organisation principale de la plateforme gérant l'infrastructure l4yercak3",
          ja: "l4yercak3インフラストラクチャを管理するコアプラットフォーム組織",
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

    // Seed translations for each locale
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
            "profile"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Profile translations`);
    return { success: true, count };
  }
});
