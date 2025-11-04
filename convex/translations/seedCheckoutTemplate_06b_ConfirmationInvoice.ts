/**
 * SEED CHECKOUT TEMPLATE - CONFIRMATION STEP (PART B: INVOICE & DOWNLOADS)
 *
 * Seeds translations for invoice payment info and download actions.
 * Part of behavior-driven checkout template - Confirmation step.
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Confirmation Invoice & Downloads...");

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
      // Invoice payment info
      {
        key: "ui.checkout_template.behavior_driven.confirmation.invoice.title",
        values: {
          en: "📄 Invoice Payment",
          de: "📄 Rechnungszahlung",
          pl: "📄 Płatność fakturą",
          es: "📄 Pago con factura",
          fr: "📄 Paiement par facture",
          ja: "📄 請求書払い",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.invoice.employer",
        values: {
          en: "Employer:",
          de: "Arbeitgeber:",
          pl: "Pracodawca:",
          es: "Empleador:",
          fr: "Employeur :",
          ja: "雇用主:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.invoice.payment_terms",
        values: {
          en: "Payment Terms:",
          de: "Zahlungsbedingungen:",
          pl: "Warunki płatności:",
          es: "Condiciones de pago:",
          fr: "Conditions de paiement :",
          ja: "支払い条件:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.invoice.net_days",
        values: {
          en: "Net {days} days",
          de: "Netto {days} Tage",
          pl: "Netto {days} dni",
          es: "Neto {days} días",
          fr: "Net {days} jours",
          ja: "ネット{days}日",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.invoice.notice",
        values: {
          en: "An invoice has been sent to your employer for payment.",
          de: "Eine Rechnung wurde zur Zahlung an Ihren Arbeitgeber gesendet.",
          pl: "Faktura została wysłana do Twojego pracodawcy w celu płatności.",
          es: "Se ha enviado una factura a tu empleador para el pago.",
          fr: "Une facture a été envoyée à votre employeur pour paiement.",
          ja: "請求書が雇用主に送信されました。",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.invoice.tickets_confirmed",
        values: {
          en: "Your tickets are confirmed and will be delivered to your email.",
          de: "Ihre Tickets sind bestätigt und werden an Ihre E-Mail-Adresse geliefert.",
          pl: "Twoje bilety są potwierdzone i zostaną dostarczone na Twój e-mail.",
          es: "Tus entradas están confirmadas y se entregarán a tu correo.",
          fr: "Vos billets sont confirmés et seront livrés à votre e-mail.",
          ja: "チケットが確認され、メールアドレスに配信されます。",
        }
      },

      // Download actions
      {
        key: "ui.checkout_template.behavior_driven.confirmation.downloads.download_tickets",
        values: {
          en: "Download Tickets",
          de: "Tickets herunterladen",
          pl: "Pobierz bilety",
          es: "Descargar entradas",
          fr: "Télécharger les billets",
          ja: "チケットをダウンロード",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.downloads.download_receipt",
        values: {
          en: "Download Receipt",
          de: "Quittung herunterladen",
          pl: "Pobierz paragon",
          es: "Descargar recibo",
          fr: "Télécharger le reçu",
          ja: "領収書をダウンロード",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.downloads.downloading",
        values: {
          en: "Downloading...",
          de: "Wird heruntergeladen...",
          pl: "Pobieranie...",
          es: "Descargando...",
          fr: "Téléchargement...",
          ja: "ダウンロード中...",
        }
      },

      // Support
      {
        key: "ui.checkout_template.behavior_driven.confirmation.support.text",
        values: {
          en: "Questions? Contact us at",
          de: "Fragen? Kontaktieren Sie uns unter",
          pl: "Pytania? Skontaktuj się z nami pod adresem",
          es: "¿Preguntas? Contáctanos en",
          fr: "Des questions ? Contactez-nous à",
          ja: "ご質問は",
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
            "checkout-template",
            "behavior-driven-confirmation"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Confirmation Invoice & Downloads translations (${translations.length} keys)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
