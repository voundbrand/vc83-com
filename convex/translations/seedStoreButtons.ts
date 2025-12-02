/**
 * SEED STORE BUTTON TRANSLATIONS
 *
 * Seeds translations for store window buttons and UI elements
 *
 * Run: npx convex run translations/seedStoreButtons:seed
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Store Button translations...");

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
      // === BUTTON LABELS ===
      {
        key: "ui.store.button.add_to_cart",
        values: {
          en: "Add to Cart",
          de: "In den Warenkorb",
          pl: "Dodaj do koszyka",
          es: "Añadir al carrito",
          fr: "Ajouter au panier",
          ja: "カートに追加",
        }
      },
      {
        key: "ui.store.button.buy_now",
        values: {
          en: "Buy Now",
          de: "Jetzt kaufen",
          pl: "Kup teraz",
          es: "Comprar ahora",
          fr: "Acheter maintenant",
          ja: "今すぐ購入",
        }
      },
      {
        key: "ui.store.button.contact_sales",
        values: {
          en: "Contact Sales",
          de: "Vertrieb kontaktieren",
          pl: "Skontaktuj się ze sprzedażą",
          es: "Contactar Ventas",
          fr: "Contacter les ventes",
          ja: "営業に連絡",
        }
      },

      // === PRICING LABELS ===
      {
        key: "ui.store.pricing.per_month",
        values: {
          en: "per month",
          de: "pro Monat",
          pl: "miesięcznie",
          es: "por mes",
          fr: "par mois",
          ja: "月額",
        }
      },
      {
        key: "ui.store.pricing.per_million",
        values: {
          en: "per 1M",
          de: "pro 1 Mio.",
          pl: "za 1 mln",
          es: "por 1M",
          fr: "par 1M",
          ja: "100万あたり",
        }
      },
      {
        key: "ui.store.pricing.tokens",
        values: {
          en: "tokens",
          de: "Tokens",
          pl: "tokenów",
          es: "tokens",
          fr: "jetons",
          ja: "トークン",
        }
      },

      // === CUSTOM FRONTEND SECTION ===
      {
        key: "ui.store.custom.example_text",
        values: {
          en: "Example: Custom web project",
          de: "Beispiel: Benutzerdefiniertes Webprojekt",
          pl: "Przykład: Niestandardowy projekt internetowy",
          es: "Ejemplo: Proyecto web personalizado",
          fr: "Exemple: Projet web personnalisé",
          ja: "例：カスタムWebプロジェクト",
        }
      },
      {
        key: "ui.store.custom.starting_price",
        values: {
          en: "Starting from €5,000 one-time project fee",
          de: "ab 5.000 EUR einmalige Projektgebühr",
          pl: "Od 5 000 EUR jednorazowa opłata projektowa",
          es: "Desde €5,000 tarifa única del proyecto",
          fr: "À partir de 5 000 € frais de projet unique",
          ja: "5,000ユーロから～一回限りのプロジェクト料金",
        }
      },
    ];

    const existingKeys = new Set<string>();

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert translations for each locale
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];

        const inserted = await insertTranslationIfNew(
          ctx.db,
          existingKeys,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "ui",
          "store"
        );

        if (inserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`✅ Store Button translations seeded successfully!`);
    console.log(`   - Inserted: ${insertedCount} new translations`);
    console.log(`   - Skipped: ${skippedCount} existing translations`);

    return {
      success: true,
      totalTranslations: translations.length * supportedLocales.length,
      inserted: insertedCount,
      skipped: skippedCount,
    };
  },
});
