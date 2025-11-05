/**
 * SEED EVENT LANDING TRANSLATIONS - CHECKOUT SECTION
 *
 * Checkout section text for event landing pages (mobile view)
 *
 * Component: src/templates/web/event-landing/index.tsx
 * Namespace: ui.event_landing.checkout
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Event Landing - Checkout Section...");

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
      // CHECKOUT SECTION
      // ============================================================
      {
        key: "ui.event_landing.checkout.get_ticket",
        values: {
          en: "Get Your Ticket",
          de: "Hol dir dein Ticket",
          pl: "Zdobądź swój bilet",
          es: "Obtén tu boleto",
          fr: "Obtenez votre billet",
          ja: "チケットを取得",
        }
      },
      {
        key: "ui.event_landing.checkout.view_tickets",
        values: {
          en: "View Tickets",
          de: "Tickets ansehen",
          pl: "Zobacz bilety",
          es: "Ver boletos",
          fr: "Voir les billets",
          ja: "チケットを見る",
        }
      },
      {
        key: "ui.event_landing.checkout.view_available_tickets",
        values: {
          en: "View available tickets",
          de: "Verfügbare Tickets ansehen",
          pl: "Zobacz dostępne bilety",
          es: "Ver boletos disponibles",
          fr: "Voir les billets disponibles",
          ja: "利用可能なチケットを表示",
        }
      },
      {
        key: "ui.event_landing.checkout.no_products_linked_title",
        values: {
          en: "No Products Linked",
          de: "Keine Produkte verknüpft",
          pl: "Brak powiązanych produktów",
          es: "No hay productos vinculados",
          fr: "Aucun produit lié",
          ja: "製品がリンクされていません",
        }
      },
      {
        key: "ui.event_landing.checkout.no_products_linked_text",
        values: {
          en: "Link products to this checkout to enable purchase.",
          de: "Verknüpfe Produkte mit diesem Checkout, um Käufe zu ermöglichen.",
          pl: "Powiąż produkty z tym koszykiem, aby umożliwić zakup.",
          es: "Vincula productos a este checkout para habilitar la compra.",
          fr: "Liez des produits à ce paiement pour permettre l'achat.",
          ja: "購入を有効にするには、このチェックアウトに製品をリンクしてください。",
        }
      },
      {
        key: "ui.event_landing.checkout.no_checkout_linked_title",
        values: {
          en: "No Checkout Linked",
          de: "Kein Checkout verknüpft",
          pl: "Brak powiązanego koszyka",
          es: "No hay checkout vinculado",
          fr: "Aucun paiement lié",
          ja: "チェックアウトがリンクされていません",
        }
      },
      {
        key: "ui.event_landing.checkout.no_checkout_linked_text",
        values: {
          en: "Link a checkout to this page to enable ticket purchases.",
          de: "Verknüpfe einen Checkout mit dieser Seite, um Ticketkäufe zu ermöglichen.",
          pl: "Powiąż koszyk z tą stroną, aby umożliwić zakup biletów.",
          es: "Vincula un checkout a esta página para habilitar la compra de boletos.",
          fr: "Liez un paiement à cette page pour permettre l'achat de billets.",
          ja: "チケット購入を有効にするには、このページにチェックアウトをリンクしてください。",
        }
      },
      // ============================================================
      // FAQ SECTION
      // ============================================================
      {
        key: "ui.event_landing.faq.still_have_questions",
        values: {
          en: "Still have questions?",
          de: "Haben Sie noch Fragen?",
          pl: "Masz jeszcze pytania?",
          es: "¿Todavía tienes preguntas?",
          fr: "Vous avez encore des questions ?",
          ja: "まだ質問がありますか？",
        }
      },
      {
        key: "ui.event_landing.faq.contact_text",
        values: {
          en: "Our team is here to help you with any inquiries.",
          de: "Unser Team steht Ihnen bei allen Fragen zur Verfügung.",
          pl: "Nasz zespół jest tutaj, aby pomóc Ci w każdej sprawie.",
          es: "Nuestro equipo está aquí para ayudarte con cualquier consulta.",
          fr: "Notre équipe est là pour vous aider avec toutes vos questions.",
          ja: "私たちのチームがお問い合わせにお答えします。",
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
            "checkout"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} checkout translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
