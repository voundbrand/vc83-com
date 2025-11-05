/**
 * SEED EVENT LANDING TRANSLATIONS - NAVIGATION
 *
 * Navigation bar text for event landing pages
 *
 * Component: src/templates/web/event-landing/index.tsx
 * Namespace: ui.event_landing.nav
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Event Landing - Navigation...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) throw new Error("System user not found");

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // ============================================================
      // NAVIGATION LINKS
      // ============================================================
      {
        key: "ui.event_landing.nav.about",
        values: {
          en: "ABOUT",
          de: "ÜBER UNS",
          pl: "O NAS",
          es: "ACERCA DE",
          fr: "À PROPOS",
          ja: "詳細",
        }
      },
      {
        key: "ui.event_landing.nav.schedule",
        values: {
          en: "SCHEDULE",
          de: "PROGRAMM",
          pl: "PROGRAM",
          es: "PROGRAMA",
          fr: "PROGRAMME",
          ja: "スケジュール",
        }
      },
      {
        key: "ui.event_landing.nav.speakers",
        values: {
          en: "SPEAKERS",
          de: "REDNER",
          pl: "PRELEGENCI",
          es: "PONENTES",
          fr: "INTERVENANTS",
          ja: "スピーカー",
        }
      },
      {
        key: "ui.event_landing.nav.faq",
        values: {
          en: "FAQ",
          de: "FAQ",
          pl: "FAQ",
          es: "FAQ",
          fr: "FAQ",
          ja: "FAQ",
        }
      },
      {
        key: "ui.event_landing.nav.login",
        values: {
          en: "LOG IN",
          de: "ANMELDEN",
          pl: "ZALOGUJ SIĘ",
          es: "INICIAR SESIÓN",
          fr: "SE CONNECTER",
          ja: "ログイン",
        }
      },
      {
        key: "ui.event_landing.nav.signup",
        values: {
          en: "SIGN UP",
          de: "REGISTRIEREN",
          pl: "ZAREJESTRUJ SIĘ",
          es: "REGISTRARSE",
          fr: "S'INSCRIRE",
          ja: "サインアップ",
        }
      },
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(ctx.db, systemOrg._id, allKeys);

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
            "navigation"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} navigation translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
