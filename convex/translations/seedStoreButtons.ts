/**
 * SEED STORE BUTTON TRANSLATIONS
 *
 * Seeds translations for store window buttons and UI elements
 *
 * Run: npx convex run translations/seedStoreButtons:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

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

      // === DAILY FREE CREDITS CALLOUT ===
      {
        key: "ui.store.daily_credits.badge",
        values: {
          en: "Included free",
          de: "Kostenlos enthalten",
          pl: "Zawarte bezpłatnie",
          es: "Incluido gratis",
          fr: "Inclus gratuitement",
          ja: "無料で含まれています",
        }
      },
      {
        key: "ui.store.daily_credits.title",
        values: {
          en: "5 Free Credits Every Day",
          de: "5 kostenlose Credits jeden Tag",
          pl: "5 darmowych kredytów każdego dnia",
          es: "5 créditos gratis cada día",
          fr: "5 crédits gratuits chaque jour",
          ja: "毎日5クレジット無料",
        }
      },
      {
        key: "ui.store.daily_credits.description",
        values: {
          en: "Try AI features, run automations, and explore the platform — no commitment required.",
          de: "Testen Sie KI-Funktionen, führen Sie Automatisierungen aus und erkunden Sie die Plattform — unverbindlich.",
          pl: "Wypróbuj funkcje AI, uruchom automatyzacje i poznaj platformę — bez zobowiązań.",
          es: "Pruebe funciones de IA, ejecute automatizaciones y explore la plataforma — sin compromiso.",
          fr: "Testez les fonctionnalités IA, lancez des automatisations et explorez la plateforme — sans engagement.",
          ja: "AI機能を試し、自動化を実行し、プラットフォームを探索 — コミットメント不要。",
        }
      },
      {
        key: "ui.store.daily_credits.reset_note",
        values: {
          en: "Credits refresh every 24 hours. Unused credits don't carry over.",
          de: "Credits werden alle 24 Stunden erneuert. Unbenutzte Credits verfallen.",
          pl: "Kredyty odnawiają się co 24 godziny. Niewykorzystane kredyty nie przechodzą na kolejny dzień.",
          es: "Los créditos se renuevan cada 24 horas. Los créditos no utilizados no se acumulan.",
          fr: "Les crédits se renouvellent toutes les 24 heures. Les crédits inutilisés ne sont pas reportés.",
          ja: "クレジットは24時間ごとに更新されます。未使用のクレジットは繰り越されません。",
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

    let insertedCount = 0;
    let updatedCount = 0;

    // Upsert translations for each locale
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];

        const result = await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "ui",
          "store"
        );

        if (result.inserted) insertedCount++;
        if (result.updated) updatedCount++;
      }
    }

    console.log(`✅ Store Button translations seeded successfully!`);
    console.log(`   - Inserted: ${insertedCount} new translations`);
    console.log(`   - Updated: ${updatedCount} existing translations`);

    return {
      success: true,
      totalTranslations: translations.length * supportedLocales.length,
      inserted: insertedCount,
      updated: updatedCount,
    };
  },
});
