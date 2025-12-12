/**
 * SEED CHECKOUT FAILED TRANSLATIONS
 *
 * Seeds translations for the Checkout Failed Window
 * Namespace: ui.checkout_failed
 *
 * Run: npx convex run translations/seedCheckoutFailed:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

// Define translation value type
type TranslationValues = {
  en: string;
  de: string;
  pl: string;
  es: string;
  fr: string;
  ja: string;
};

const translations: Array<{ key: string; values: TranslationValues }> = [
  // Main Title
  {
    key: "ui.checkout_failed.title",
    values: {
      en: "Checkout Failed",
      de: "Bezahlung fehlgeschlagen",
      pl: "Płatność nieudana",
      es: "Pago fallido",
      fr: "Échec du paiement",
      ja: "チェックアウト失敗",
    },
  },

  // Reason: Cancel
  {
    key: "ui.checkout_failed.reason_cancel_title",
    values: {
      en: "Checkout Cancelled",
      de: "Bezahlung abgebrochen",
      pl: "Płatność anulowana",
      es: "Pago cancelado",
      fr: "Paiement annulé",
      ja: "チェックアウトがキャンセルされました",
    },
  },
  {
    key: "ui.checkout_failed.reason_cancel_message",
    values: {
      en: "You cancelled the checkout process. No payment was taken.",
      de: "Sie haben den Bezahlvorgang abgebrochen. Es wurde keine Zahlung vorgenommen.",
      pl: "Anulowałeś proces płatności. Żadna płatność nie została pobrana.",
      es: "Has cancelado el proceso de pago. No se ha realizado ningún cargo.",
      fr: "Vous avez annulé le processus de paiement. Aucun paiement n'a été effectué.",
      ja: "チェックアウトプロセスをキャンセルしました。支払いは行われていません。",
    },
  },

  // Reason: Payment Failed
  {
    key: "ui.checkout_failed.reason_payment_title",
    values: {
      en: "Payment Declined",
      de: "Zahlung abgelehnt",
      pl: "Płatność odrzucona",
      es: "Pago rechazado",
      fr: "Paiement refusé",
      ja: "支払いが拒否されました",
    },
  },
  {
    key: "ui.checkout_failed.reason_payment_message",
    values: {
      en: "Your payment could not be processed. Please check your card details or try a different payment method.",
      de: "Ihre Zahlung konnte nicht verarbeitet werden. Bitte überprüfen Sie Ihre Kartendaten oder versuchen Sie eine andere Zahlungsmethode.",
      pl: "Nie udało się przetworzyć płatności. Sprawdź dane karty lub wypróbuj inną metodę płatności.",
      es: "No se pudo procesar tu pago. Por favor verifica los datos de tu tarjeta o prueba otro método de pago.",
      fr: "Votre paiement n'a pas pu être traité. Veuillez vérifier vos coordonnées bancaires ou essayer un autre moyen de paiement.",
      ja: "お支払いを処理できませんでした。カード情報を確認するか、別の支払い方法をお試しください。",
    },
  },

  // Reason: Expired
  {
    key: "ui.checkout_failed.reason_expired_title",
    values: {
      en: "Session Expired",
      de: "Sitzung abgelaufen",
      pl: "Sesja wygasła",
      es: "Sesión expirada",
      fr: "Session expirée",
      ja: "セッションが期限切れです",
    },
  },
  {
    key: "ui.checkout_failed.reason_expired_message",
    values: {
      en: "Your checkout session has expired. Please start again from the store.",
      de: "Ihre Bezahlsitzung ist abgelaufen. Bitte beginnen Sie erneut im Shop.",
      pl: "Twoja sesja płatności wygasła. Zacznij ponownie ze sklepu.",
      es: "Tu sesión de pago ha expirado. Por favor, comienza de nuevo desde la tienda.",
      fr: "Votre session de paiement a expiré. Veuillez recommencer depuis la boutique.",
      ja: "チェックアウトセッションの有効期限が切れました。ストアからやり直してください。",
    },
  },

  // Reason: Generic Error
  {
    key: "ui.checkout_failed.reason_error_title",
    values: {
      en: "Something Went Wrong",
      de: "Etwas ist schiefgelaufen",
      pl: "Coś poszło nie tak",
      es: "Algo salió mal",
      fr: "Une erreur s'est produite",
      ja: "エラーが発生しました",
    },
  },
  {
    key: "ui.checkout_failed.reason_error_message",
    values: {
      en: "An unexpected error occurred during checkout. Please try again or contact support if the problem persists.",
      de: "Ein unerwarteter Fehler ist während des Bezahlvorgangs aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht.",
      pl: "Wystąpił nieoczekiwany błąd podczas płatności. Spróbuj ponownie lub skontaktuj się z pomocą techniczną, jeśli problem będzie się powtarzał.",
      es: "Ocurrió un error inesperado durante el pago. Por favor intenta de nuevo o contacta soporte si el problema persiste.",
      fr: "Une erreur inattendue s'est produite lors du paiement. Veuillez réessayer ou contacter le support si le problème persiste.",
      ja: "チェックアウト中に予期しないエラーが発生しました。もう一度お試しいただくか、問題が解決しない場合はサポートにお問い合わせください。",
    },
  },

  // What Happened Card
  {
    key: "ui.checkout_failed.what_happened_title",
    values: {
      en: "What Happened?",
      de: "Was ist passiert?",
      pl: "Co się stało?",
      es: "¿Qué pasó?",
      fr: "Que s'est-il passé?",
      ja: "何が起こりましたか？",
    },
  },

  // No Charge Card
  {
    key: "ui.checkout_failed.no_charge_title",
    values: {
      en: "No Payment Taken",
      de: "Keine Zahlung erfolgt",
      pl: "Brak pobrania płatności",
      es: "Sin cargo realizado",
      fr: "Aucun paiement effectué",
      ja: "支払いは行われていません",
    },
  },
  {
    key: "ui.checkout_failed.no_charge_message",
    values: {
      en: "Don't worry - your card has not been charged. You can safely try again when you're ready.",
      de: "Keine Sorge - Ihre Karte wurde nicht belastet. Sie können es jederzeit erneut versuchen.",
      pl: "Nie martw się - Twoja karta nie została obciążona. Możesz bezpiecznie spróbować ponownie, gdy będziesz gotowy.",
      es: "No te preocupes - no se ha cobrado a tu tarjeta. Puedes intentarlo de nuevo cuando estés listo.",
      fr: "Ne vous inquiétez pas - votre carte n'a pas été débitée. Vous pouvez réessayer en toute sécurité quand vous le souhaitez.",
      ja: "ご安心ください - カードは請求されていません。準備ができたら安全にやり直すことができます。",
    },
  },

  // Next Steps Card
  {
    key: "ui.checkout_failed.next_steps_title",
    values: {
      en: "What Can I Do?",
      de: "Was kann ich tun?",
      pl: "Co mogę zrobić?",
      es: "¿Qué puedo hacer?",
      fr: "Que puis-je faire?",
      ja: "どうすればいいですか？",
    },
  },
  {
    key: "ui.checkout_failed.next_steps_message",
    values: {
      en: "Close this window and visit the Store to try again. If you continue to have issues, please contact our support team.",
      de: "Schließen Sie dieses Fenster und besuchen Sie den Shop, um es erneut zu versuchen. Bei weiteren Problemen kontaktieren Sie bitte unser Support-Team.",
      pl: "Zamknij to okno i odwiedź Sklep, aby spróbować ponownie. Jeśli nadal masz problemy, skontaktuj się z naszym zespołem wsparcia.",
      es: "Cierra esta ventana y visita la Tienda para intentarlo de nuevo. Si continúas teniendo problemas, por favor contacta a nuestro equipo de soporte.",
      fr: "Fermez cette fenêtre et visitez la Boutique pour réessayer. Si vous continuez à avoir des problèmes, veuillez contacter notre équipe de support.",
      ja: "このウィンドウを閉じてストアにアクセスし、もう一度お試しください。問題が続く場合は、サポートチームにお問い合わせください。",
    },
  },

  // Buttons
  {
    key: "ui.checkout_failed.close_button",
    values: {
      en: "Close",
      de: "Schließen",
      pl: "Zamknij",
      es: "Cerrar",
      fr: "Fermer",
      ja: "閉じる",
    },
  },
  {
    key: "ui.checkout_failed.try_again_button",
    values: {
      en: "Try Again",
      de: "Erneut versuchen",
      pl: "Spróbuj ponownie",
      es: "Intentar de nuevo",
      fr: "Réessayer",
      ja: "もう一度試す",
    },
  },

  // Support Message
  {
    key: "ui.checkout_failed.support_message",
    values: {
      en: "Need help? Contact us at support@l4yercak3.com",
      de: "Brauchen Sie Hilfe? Kontaktieren Sie uns unter support@l4yercak3.com",
      pl: "Potrzebujesz pomocy? Skontaktuj się z nami: support@l4yercak3.com",
      es: "¿Necesitas ayuda? Contáctanos en support@l4yercak3.com",
      fr: "Besoin d'aide? Contactez-nous à support@l4yercak3.com",
      ja: "サポートが必要ですか？support@l4yercak3.com までご連絡ください",
    },
  },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Failed translations...");

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

    // Get existing translations to avoid duplicates
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      translations.map(t => t.key)
    );

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert all translations
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof TranslationValues];
        if (!value) continue;

        const wasInserted = await insertTranslationIfNew(
          ctx.db,
          existingKeys,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "checkout",
          "checkout-failed"
        );

        if (wasInserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(
      `✅ Seeded ${insertedCount} new Checkout Failed translations (skipped ${skippedCount} existing)`
    );

    return {
      success: true,
      insertedCount,
      skippedCount,
      keysCount: translations.length,
    };
  },
});

export default seed;
