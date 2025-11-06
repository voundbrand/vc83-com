/**
 * SEED CHECKOUT TEMPLATE - PAYMENT STEP (PART B: PAYMENT FORM)
 *
 * Seeds translations for payment form fields and errors.
 * Part of behavior-driven checkout template - Payment step.
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Payment Form...");

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
      // Order summary
      {
        key: "ui.checkout_template.behavior_driven.payment.order_summary.title",
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
        key: "ui.checkout_template.behavior_driven.payment.order_summary.total_amount",
        values: {
          en: "Total Amount:",
          de: "Gesamtbetrag:",
          pl: "Całkowita kwota:",
          es: "Importe total:",
          fr: "Montant total :",
          ja: "合計金額:",
        }
      },

      // Card details
      {
        key: "ui.checkout_template.behavior_driven.payment.card_details.title",
        values: {
          en: "Card Details",
          de: "Kartendetails",
          pl: "Szczegóły karty",
          es: "Detalles de la tarjeta",
          fr: "Détails de la carte",
          ja: "カード情報",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.card_details.loading",
        values: {
          en: "Loading payment form...",
          de: "Zahlungsformular wird geladen...",
          pl: "Ładowanie formularza płatności...",
          es: "Cargando formulario de pago...",
          fr: "Chargement du formulaire de paiement...",
          ja: "支払いフォームを読み込んでいます...",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.security.notice",
        values: {
          en: "🔒 Your payment information is encrypted and secure. We never store your card details.",
          de: "🔒 Ihre Zahlungsinformationen sind verschlüsselt und sicher. Wir speichern niemals Ihre Kartendaten.",
          pl: "🔒 Twoje dane płatności są szyfrowane i bezpieczne. Nigdy nie przechowujemy danych karty.",
          es: "🔒 Tu información de pago está encriptada y segura. Nunca almacenamos los datos de tu tarjeta.",
          fr: "🔒 Vos informations de paiement sont cryptées et sécurisées. Nous ne stockons jamais les détails de votre carte.",
          ja: "🔒 お支払い情報は暗号化されて安全です。カード情報を保存することはありません。",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.security.notice_footer",
        values: {
          en: "🔒 Your payment information is encrypted and secure",
          de: "🔒 Ihre Zahlungsinformationen sind verschlüsselt und sicher",
          pl: "🔒 Twoje dane płatności są szyfrowane i bezpieczne",
          es: "🔒 Tu información de pago está encriptada y segura",
          fr: "🔒 Vos informations de paiement sont cryptées et sécurisées",
          ja: "🔒 お支払い情報は暗号化されて安全です",
        }
      },

      // Error messages
      {
        key: "ui.checkout_template.behavior_driven.payment.errors.not_initialized",
        values: {
          en: "Payment not initialized. Please try again.",
          de: "Zahlung nicht initialisiert. Bitte versuchen Sie es erneut.",
          pl: "Płatność nie została zainicjowana. Spróbuj ponownie.",
          es: "Pago no inicializado. Por favor, inténtalo de nuevo.",
          fr: "Paiement non initialisé. Veuillez réessayer.",
          ja: "支払いが初期化されていません。もう一度お試しください。",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.errors.session_not_found",
        values: {
          en: "Checkout session not found. Please try again.",
          de: "Checkout-Sitzung nicht gefunden. Bitte versuchen Sie es erneut.",
          pl: "Sesja zakupów nie została znaleziona. Spróbuj ponownie.",
          es: "Sesión de compra no encontrada. Por favor, inténtalo de nuevo.",
          fr: "Session de paiement introuvable. Veuillez réessayer.",
          ja: "チェックアウトセッションが見つかりません。もう一度お試しください。",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.errors.complete_card_details",
        values: {
          en: "Please enter complete card details.",
          de: "Bitte geben Sie vollständige Kartendaten ein.",
          pl: "Proszę wprowadzić kompletne dane karty.",
          es: "Por favor, introduce los datos completos de la tarjeta.",
          fr: "Veuillez entrer les détails complets de la carte.",
          ja: "カード情報を完全に入力してください。",
        }
      },

      // Buttons
      {
        key: "ui.checkout_template.behavior_driven.payment.buttons.back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.buttons.pay",
        values: {
          en: "Complete Payment ${amount}",
          de: "Zahlung abschließen ${amount}",
          pl: "Dokończ płatność ${amount}",
          es: "Completar pago ${amount}",
          fr: "Finaliser le paiement ${amount}",
          ja: "支払いを完了 ${amount}",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.payment.buttons.processing",
        values: {
          en: "Processing Payment...",
          de: "Zahlung wird verarbeitet...",
          pl: "Przetwarzanie płatności...",
          es: "Procesando pago...",
          fr: "Traitement du paiement...",
          ja: "支払いを処理中...",
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

    console.log(`✅ Payment Form: ${insertedCount} inserted, ${updatedCount} updated (${translations.length} keys)`);
    return { success: true, count: insertedCount + updatedCount, inserted: insertedCount, updated: updatedCount, totalKeys: translations.length };
  }
});
