/**
 * SEED CHECKOUT TEMPLATE - PAYMENT STEP (PART A: PAYMENT METHODS)
 *
 * Seeds translations for payment methods selection.
 * Part of behavior-driven checkout template - Payment step.
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Payment Methods...");

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
      // Headers
      {
        key: "ui.checkout_template.behavior_driven.payment.headers.title",
        values: {
          en: "Payment Method",
          de: "Zahlungsmethode",
          pl: "Metoda płatności",
          es: "Método de pago",
          fr: "Méthode de paiement",
          ja: "支払い方法",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.headers.title_card",
        values: {
          en: "Payment Details",
          de: "Zahlungsdetails",
          pl: "Szczegóły płatności",
          es: "Detalles de pago",
          fr: "Détails du paiement",
          ja: "支払い詳細",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.headers.subtitle",
        values: {
          en: "Choose how you want to pay",
          de: "Wählen Sie, wie Sie bezahlen möchten",
          pl: "Wybierz sposób płatności",
          es: "Elige cómo quieres pagar",
          fr: "Choisissez comment vous souhaitez payer",
          ja: "支払い方法を選択してください",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.headers.subtitle_card",
        values: {
          en: "Enter your card details to complete payment",
          de: "Geben Sie Ihre Kartendaten ein, um die Zahlung abzuschließen",
          pl: "Wprowadź dane karty, aby dokończyć płatność",
          es: "Introduce los datos de tu tarjeta para completar el pago",
          fr: "Entrez les détails de votre carte pour finaliser le paiement",
          ja: "支払いを完了するにはカード情報を入力してください",
        }
      },

      // Invoice payment
      {
        key: "ui.checkout_template.behavior_driven.payment.invoice.title",
        values: {
          en: "Invoice Payment (Pay Later)",
          de: "Rechnungszahlung (Später bezahlen)",
          pl: "Płatność fakturą (Zapłać później)",
          es: "Pago con factura (Pagar más tarde)",
          fr: "Paiement par facture (Payer plus tard)",
          ja: "請求書払い（後払い）",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.invoice.creating",
        values: {
          en: "Creating Invoice...",
          de: "Rechnung wird erstellt...",
          pl: "Tworzenie faktury...",
          es: "Creando factura...",
          fr: "Création de la facture...",
          ja: "請求書を作成中...",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.invoice.sent_to",
        values: {
          en: "An invoice will be sent to:",
          de: "Eine Rechnung wird gesendet an:",
          pl: "Faktura zostanie wysłana do:",
          es: "Se enviará una factura a:",
          fr: "Une facture sera envoyée à :",
          ja: "請求書の送付先:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.invoice.payment_terms",
        values: {
          en: "Payment terms:",
          de: "Zahlungsbedingungen:",
          pl: "Warunki płatności:",
          es: "Condiciones de pago:",
          fr: "Conditions de paiement :",
          ja: "支払い条件:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.invoice.net_days",
        values: {
          en: "{terms} days",
          de: "{terms} Tage",
          pl: "{terms} dni",
          es: "{terms} días",
          fr: "{terms} jours",
          ja: "{terms}日",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.invoice.net_days_default",
        values: {
          en: "Net 30 days",
          de: "Netto 30 Tage",
          pl: "Netto 30 dni",
          es: "Neto 30 días",
          fr: "Net 30 jours",
          ja: "ネット30日",
        }
      },

      // Credit card
      {
        key: "ui.checkout_template.behavior_driven.payment.credit_card.title",
        values: {
          en: "Credit Card",
          de: "Kreditkarte",
          pl: "Karta kredytowa",
          es: "Tarjeta de crédito",
          fr: "Carte de crédit",
          ja: "クレジットカード",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.credit_card.subtitle",
        values: {
          en: "Pay securely with Visa, Mastercard, or American Express",
          de: "Sicher bezahlen mit Visa, Mastercard oder American Express",
          pl: "Płać bezpiecznie kartą Visa, Mastercard lub American Express",
          es: "Paga de forma segura con Visa, Mastercard o American Express",
          fr: "Payez en toute sécurité avec Visa, Mastercard ou American Express",
          ja: "Visa、Mastercard、American Expressで安全にお支払いください",
        }
      },
    ];

    let insertedCount = 0;
    let updatedCount = 0;

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
            "checkout-template",
            "behavior-driven-payment"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Payment Methods: ${insertedCount} inserted, ${updatedCount} updated (${translations.length} keys)`);
    return { success: true, count: insertedCount + updatedCount, inserted: insertedCount, updated: updatedCount, totalKeys: translations.length };
  }
});
