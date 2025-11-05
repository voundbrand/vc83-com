/**
 * SEED EVENT LANDING TRANSLATIONS - HERO AND VENUE SECTIONS
 *
 * Hero section and venue location text for event landing pages
 *
 * Component: src/templates/web/event-landing/index.tsx
 * Namespace: ui.event_landing.hero, ui.event_landing.venue
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Event Landing - Hero and Venue...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

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
      // VENUE SECTION
      // ============================================================
      {
        key: "ui.event_landing.venue.title",
        values: {
          en: "Venue Location",
          de: "Veranstaltungsort",
          pl: "Lokalizacja wydarzenia",
          es: "Ubicación del evento",
          fr: "Lieu de l'événement",
          ja: "会場の場所",
        }
      },
      {
        key: "ui.event_landing.venue.get_directions",
        values: {
          en: "Get Directions",
          de: "Wegbeschreibung",
          pl: "Uzyskaj wskazówki dojazdu",
          es: "Obtener direcciones",
          fr: "Obtenir l'itinéraire",
          ja: "道順を取得",
        }
      },
      // ============================================================
      // GALLERY SECTION
      // ============================================================
      {
        key: "ui.event_landing.gallery.title",
        values: {
          en: "Event Gallery",
          de: "Veranstaltungsgalerie",
          pl: "Galeria wydarzenia",
          es: "Galería del evento",
          fr: "Galerie de l'événement",
          ja: "イベントギャラリー",
        }
      },
      // ============================================================
      // SESSION TYPES
      // ============================================================
      {
        key: "ui.event_landing.session_type.keynote",
        values: {
          en: "keynote",
          de: "Keynote",
          pl: "wystąpienie główne",
          es: "conferencia magistral",
          fr: "discours principal",
          ja: "基調講演",
        }
      },
      {
        key: "ui.event_landing.session_type.workshop",
        values: {
          en: "workshop",
          de: "Workshop",
          pl: "warsztat",
          es: "taller",
          fr: "atelier",
          ja: "ワークショップ",
        }
      },
      {
        key: "ui.event_landing.session_type.panel",
        values: {
          en: "panel",
          de: "Panel",
          pl: "panel",
          es: "panel",
          fr: "panel",
          ja: "パネル",
        }
      },
      {
        key: "ui.event_landing.session_type.break",
        values: {
          en: "break",
          de: "Pause",
          pl: "przerwa",
          es: "descanso",
          fr: "pause",
          ja: "休憩",
        }
      },
      {
        key: "ui.event_landing.session_type.session",
        values: {
          en: "session",
          de: "Sitzung",
          pl: "sesja",
          es: "sesión",
          fr: "session",
          ja: "セッション",
        }
      },
      {
        key: "ui.event_landing.session_type.general",
        values: {
          en: "general",
          de: "Allgemein",
          pl: "ogólne",
          es: "general",
          fr: "général",
          ja: "一般",
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
            "hero-venue"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} hero/venue translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
