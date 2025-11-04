/**
 * SEED CHECKOUT TEMPLATE - REVIEW ORDER STEP
 *
 * Seeds translations for the behavior-driven checkout template - Review Order step.
 * Run independently: npx convex run translations/seedCheckoutTemplate_04_ReviewOrder:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Review Order translations...");

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
        key: "ui.checkout_template.behavior_driven.review_order.headers.title",
        values: {
          en: "Review Your Order",
          de: "Bestellung überprüfen",
          pl: "Przejrzyj zamówienie",
          es: "Revisar tu pedido",
          fr: "Vérifier votre commande",
          ja: "注文を確認する",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.headers.subtitle",
        values: {
          en: "Please review your information before continuing",
          de: "Bitte überprüfen Sie Ihre Angaben vor dem Fortfahren",
          pl: "Proszę sprawdzić informacje przed kontynuowaniem",
          es: "Por favor, revise su información antes de continuar",
          fr: "Veuillez vérifier vos informations avant de continuer",
          ja: "続行する前に情報を確認してください",
        }
      },

      // Order summary
      {
        key: "ui.checkout_template.behavior_driven.review_order.sections.order_summary",
        values: {
          en: "Order Summary",
          de: "Bestellübersicht",
          pl: "Podsumowanie zamówienia",
          es: "Resumen del pedido",
          fr: "Récapitulatif de commande",
          ja: "注文概要",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.subtotal",
        values: {
          en: "Subtotal:",
          de: "Zwischensumme:",
          pl: "Suma częściowa:",
          es: "Subtotal:",
          fr: "Sous-total :",
          ja: "小計:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.tax",
        values: {
          en: "Tax",
          de: "MwSt.",
          pl: "Podatek",
          es: "Impuesto",
          fr: "Taxe",
          ja: "税金",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.total",
        values: {
          en: "Total:",
          de: "Gesamt:",
          pl: "Razem:",
          es: "Total:",
          fr: "Total :",
          ja: "合計:",
        }
      },

      // Customer information
      {
        key: "ui.checkout_template.behavior_driven.review_order.sections.your_information",
        values: {
          en: "Your Information",
          de: "Ihre Informationen",
          pl: "Twoje informacje",
          es: "Tu información",
          fr: "Vos informations",
          ja: "あなたの情報",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.email",
        values: {
          en: "Email:",
          de: "E-Mail:",
          pl: "E-mail:",
          es: "Correo:",
          fr: "E-mail :",
          ja: "メール:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.name",
        values: {
          en: "Name:",
          de: "Name:",
          pl: "Imię:",
          es: "Nombre:",
          fr: "Nom :",
          ja: "氏名:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.phone",
        values: {
          en: "Phone:",
          de: "Telefon:",
          pl: "Telefon:",
          es: "Teléfono:",
          fr: "Téléphone :",
          ja: "電話:",
        }
      },

      // Registration info
      {
        key: "ui.checkout_template.behavior_driven.review_order.sections.registration_info",
        values: {
          en: "Registration Information",
          de: "Registrierungsinformationen",
          pl: "Informacje o rejestracji",
          es: "Información de registro",
          fr: "Informations d'inscription",
          ja: "登録情報",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.ticket_registered",
        values: {
          en: "ticket registered",
          de: "Ticket registriert",
          pl: "bilet zarejestrowany",
          es: "entrada registrada",
          fr: "billet enregistré",
          ja: "チケット登録済み",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.labels.tickets_registered",
        values: {
          en: "tickets registered",
          de: "Tickets registriert",
          pl: "bilety zarejestrowane",
          es: "entradas registradas",
          fr: "billets enregistrés",
          ja: "チケット登録済み",
        }
      },

      // Employer billing
      {
        key: "ui.checkout_template.behavior_driven.review_order.employer_billing.title",
        values: {
          en: "Employer Billing Detected",
          de: "Arbeitgeberabrechnung erkannt",
          pl: "Wykryto rozliczenie pracodawcy",
          es: "Facturación del empleador detectada",
          fr: "Facturation employeur détectée",
          ja: "雇用主請求を検出",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.employer_billing.employer",
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
        key: "ui.checkout_template.behavior_driven.review_order.employer_billing.payment_terms",
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
        key: "ui.checkout_template.behavior_driven.review_order.employer_billing.net_days",
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
        key: "ui.checkout_template.behavior_driven.review_order.employer_billing.notice",
        values: {
          en: "ℹ️ An invoice will be sent to your employer. No immediate payment required.",
          de: "ℹ️ Eine Rechnung wird an Ihren Arbeitgeber gesendet. Keine sofortige Zahlung erforderlich.",
          pl: "ℹ️ Faktura zostanie wysłana do Twojego pracodawcy. Nie wymagana natychmiastowa płatność.",
          es: "ℹ️ Se enviará una factura a tu empleador. No se requiere pago inmediato.",
          fr: "ℹ️ Une facture sera envoyée à votre employeur. Aucun paiement immédiat requis.",
          ja: "ℹ️ 請求書が雇用主に送信されます。即座の支払いは不要です。",
        }
      },

      // Buttons
      {
        key: "ui.checkout_template.behavior_driven.review_order.buttons.continue_invoice",
        values: {
          en: "Complete Registration (Invoice)",
          de: "Registrierung abschließen (Rechnung)",
          pl: "Zakończ rejestrację (Faktura)",
          es: "Completar registro (Factura)",
          fr: "Terminer l'inscription (Facture)",
          ja: "登録を完了 (請求書)",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.buttons.continue_payment",
        values: {
          en: "Continue to Payment →",
          de: "Weiter zur Zahlung →",
          pl: "Przejdź do płatności →",
          es: "Continuar al pago →",
          fr: "Continuer vers paiement →",
          ja: "支払いに進む →",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.review_order.buttons.back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
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
            "behavior-driven-review-order"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Review Order step translations`);
    return { success: true, count };
  }
});
