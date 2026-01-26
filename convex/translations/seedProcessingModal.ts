/**
 * SEED PROCESSING MODAL TRANSLATIONS
 *
 * Seeds translations for the ProcessingModal component.
 * This modal shows real-time progress during checkout fulfillment.
 *
 * Component: src/components/processing-modal.tsx
 * Namespace: ui.processing_modal
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedProcessingModal:seed
 */

import { mutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = mutation({
  handler: async (ctx) => {
    console.log("\n🌱 ================================================");
    console.log("🌱 SEEDING PROCESSING MODAL TRANSLATIONS");
    console.log("🌱 ================================================\n");

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
      // Header - Working
      {
        key: "ui.processing_modal.header.title",
        values: {
          en: "Working Our Magic...",
          de: "Wir zaubern für Sie...",
          pl: "Pracujemy nad tym...",
          es: "Trabajando en tu pedido...",
          fr: "Nous travaillons pour vous...",
          ja: "処理中です...",
        }
      },
      {
        key: "ui.processing_modal.header.title_error",
        values: {
          en: "Something went wrong",
          de: "Etwas ist schiefgelaufen",
          pl: "Coś poszło nie tak",
          es: "Algo salió mal",
          fr: "Une erreur s'est produite",
          ja: "エラーが発生しました",
        }
      },
      {
        key: "ui.processing_modal.header.subtitle_card",
        values: {
          en: "Processing your payment and creating your tickets",
          de: "Wir verarbeiten Ihre Zahlung und erstellen Ihre Tickets",
          pl: "Przetwarzamy Twoją płatność i tworzymy bilety",
          es: "Procesando tu pago y creando tus entradas",
          fr: "Traitement de votre paiement et création de vos billets",
          ja: "お支払いの処理とチケットの作成中",
        }
      },
      {
        key: "ui.processing_modal.header.subtitle_invoice",
        values: {
          en: "Creating your invoice and tickets",
          de: "Wir erstellen Ihre Rechnung und Tickets",
          pl: "Tworzymy Twoją fakturę i bilety",
          es: "Creando tu factura y entradas",
          fr: "Création de votre facture et billets",
          ja: "請求書とチケットを作成中",
        }
      },
      {
        key: "ui.processing_modal.header.subtitle_error",
        values: {
          en: "There was an issue processing your order",
          de: "Bei der Verarbeitung Ihrer Bestellung ist ein Problem aufgetreten",
          pl: "Wystąpił problem z przetwarzaniem Twojego zamówienia",
          es: "Hubo un problema al procesar tu pedido",
          fr: "Un problème est survenu lors du traitement de votre commande",
          ja: "ご注文の処理中に問題が発生しました",
        }
      },

      // Real progress steps (maps to fulfillmentStep 0-5)
      {
        key: "ui.processing_modal.steps.real.0",
        values: {
          en: "Payment confirmed! Starting fulfillment...",
          de: "Zahlung bestätigt! Verarbeitung beginnt...",
          pl: "Płatność potwierdzona! Rozpoczynamy realizację...",
          es: "¡Pago confirmado! Iniciando la entrega...",
          fr: "Paiement confirmé ! Démarrage du traitement...",
          ja: "お支払い確認済み！処理を開始中...",
        }
      },
      {
        key: "ui.processing_modal.steps.real.1",
        values: {
          en: "Setting up your account...",
          de: "Ihr Konto wird eingerichtet...",
          pl: "Konfigurujemy Twoje konto...",
          es: "Configurando tu cuenta...",
          fr: "Configuration de votre compte...",
          ja: "アカウントを設定中...",
        }
      },
      {
        key: "ui.processing_modal.steps.real.2",
        values: {
          en: "Creating your tickets...",
          de: "Ihre Tickets werden erstellt...",
          pl: "Tworzymy Twoje bilety...",
          es: "Creando tus entradas...",
          fr: "Création de vos billets...",
          ja: "チケットを作成中...",
        }
      },
      {
        key: "ui.processing_modal.steps.real.3",
        values: {
          en: "Recording your purchase...",
          de: "Ihr Einkauf wird erfasst...",
          pl: "Rejestrujemy Twój zakup...",
          es: "Registrando tu compra...",
          fr: "Enregistrement de votre achat...",
          ja: "購入を記録中...",
        }
      },
      {
        key: "ui.processing_modal.steps.real.4",
        values: {
          en: "Sending confirmation email...",
          de: "Bestätigungs-E-Mail wird gesendet...",
          pl: "Wysyłamy e-mail z potwierdzeniem...",
          es: "Enviando correo de confirmación...",
          fr: "Envoi de l'e-mail de confirmation...",
          ja: "確認メールを送信中...",
        }
      },
      {
        key: "ui.processing_modal.steps.real.5",
        values: {
          en: "All done!",
          de: "Alles erledigt!",
          pl: "Gotowe!",
          es: "¡Todo listo!",
          fr: "Terminé !",
          ja: "完了！",
        }
      },

      // Footer messages
      {
        key: "ui.processing_modal.footer.complete",
        values: {
          en: "All done! Redirecting you now...",
          de: "Alles erledigt! Sie werden weitergeleitet...",
          pl: "Gotowe! Przekierowujemy Cię...",
          es: "¡Todo listo! Redireccionando...",
          fr: "Terminé ! Redirection en cours...",
          ja: "完了！リダイレクト中...",
        }
      },
      {
        key: "ui.processing_modal.footer.please_wait",
        values: {
          en: "Please don't close this window or refresh the page",
          de: "Bitte schließen Sie dieses Fenster nicht und aktualisieren Sie die Seite nicht",
          pl: "Proszę nie zamykać tego okna ani nie odświeżać strony",
          es: "Por favor, no cierres esta ventana ni actualices la página",
          fr: "Veuillez ne pas fermer cette fenêtre ni actualiser la page",
          ja: "このウィンドウを閉じたり、ページを更新したりしないでください",
        }
      },
      {
        key: "ui.processing_modal.footer.error",
        values: {
          en: "Your payment was processed. Please contact support if needed.",
          de: "Ihre Zahlung wurde verarbeitet. Bitte kontaktieren Sie den Support, falls nötig.",
          pl: "Twoja płatność została przetworzona. W razie potrzeby skontaktuj się z pomocą techniczną.",
          es: "Tu pago fue procesado. Por favor, contacta soporte si es necesario.",
          fr: "Votre paiement a été traité. Veuillez contacter le support si nécessaire.",
          ja: "お支払いは処理されました。必要に応じてサポートにご連絡ください。",
        }
      },
      {
        key: "ui.processing_modal.footer.error_default",
        values: {
          en: "An unexpected error occurred. Please contact support.",
          de: "Ein unerwarteter Fehler ist aufgetreten. Bitte kontaktieren Sie den Support.",
          pl: "Wystąpił nieoczekiwany błąd. Skontaktuj się z pomocą techniczną.",
          es: "Ocurrió un error inesperado. Por favor, contacta soporte.",
          fr: "Une erreur inattendue s'est produite. Veuillez contacter le support.",
          ja: "予期せぬエラーが発生しました。サポートにお問い合わせください。",
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
            "processing-modal"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log("🌱 ================================================");
    console.log("🎉 PROCESSING MODAL TRANSLATIONS COMPLETE");
    console.log("🌱 ================================================");
    console.log(`📊 Total Keys: ${translations.length}`);
    console.log(`✅ Inserted: ${insertedCount}`);
    console.log(`🔄 Updated: ${updatedCount}`);
    console.log(`🌍 Languages: 6 (en, de, pl, es, fr, ja)`);
    console.log("🌱 ================================================\n");

    return {
      success: true,
      totalKeys: translations.length,
      inserted: insertedCount,
      updated: updatedCount,
      count: insertedCount + updatedCount,
    };
  }
});
