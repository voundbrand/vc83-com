/**
 * SEED PROFILE TRANSLATIONS
 *
 * Seeds translations for organization profiles.
 * Run independently: npx convex run translations/seedProfileTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

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
          en: "Core platform organization managing sevenlayers.io infrastructure",
          de: "Kernplattformorganisation zur Verwaltung der sevenlayers.io-Infrastruktur",
          pl: "Główna organizacja platformy zarządzająca infrastrukturą sevenlayers.io",
          es: "Organización central de la plataforma que gestiona la infraestructura de sevenlayers.io",
          fr: "Organisation principale de la plateforme gérant l'infrastructure sevenlayers.io",
          ja: "sevenlayers.ioインフラストラクチャを管理するコアプラットフォーム組織",
        }
      },
    ];

    // Seed translations for each locale (upsert: insert new, update existing)
    let inserted = 0;
    let updated = 0;
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
            "profile"
          );
          if (result.inserted) inserted++;
          if (result.updated) updated++;
        }
      }
    }

    console.log(`✅ Seeded Profile translations: ${inserted} inserted, ${updated} updated`);
    return { success: true, inserted, updated };
  }
});
