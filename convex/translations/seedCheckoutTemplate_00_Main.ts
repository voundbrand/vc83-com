/**
 * SEED CHECKOUT TEMPLATE - MAIN ORCHESTRATOR COMPONENT
 *
 * Seeds translations for the main behavior-driven checkout template orchestrator.
 * Includes progress indicators, step names, loading states, and error messages.
 *
 * Component: src/templates/checkout/behavior-driven/index.tsx
 * Namespace: ui.checkout_template.behavior_driven.main
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCheckoutTemplate_00_Main:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Main Orchestrator...");

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
      // Progress indicators
      {
        key: "ui.checkout_template.behavior_driven.main.progress.step_of",
        values: {
          en: "Step {current} of {total}",
          de: "Schritt {current} von {total}",
          pl: "Krok {current} z {total}",
          es: "Paso {current} de {total}",
          fr: "Étape {current} sur {total}",
          ja: "ステップ {current} / {total}",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.progress.complete",
        values: {
          en: "{percent}% Complete",
          de: "{percent}% abgeschlossen",
          pl: "{percent}% ukończone",
          es: "{percent}% completado",
          fr: "{percent}% terminé",
          ja: "{percent}% 完了",
        }
      },

      // Loading states
      {
        key: "ui.checkout_template.behavior_driven.main.loading.processing",
        values: {
          en: "Processing...",
          de: "Verarbeitung läuft...",
          pl: "Przetwarzanie...",
          es: "Procesando...",
          fr: "Traitement en cours...",
          ja: "処理中...",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.loading.initializing",
        values: {
          en: "Initializing checkout...",
          de: "Checkout wird initialisiert...",
          pl: "Inicjalizacja płatności...",
          es: "Inicializando compra...",
          fr: "Initialisation du paiement...",
          ja: "チェックアウトを初期化中...",
        }
      },

      // Error messages
      {
        key: "ui.checkout_template.behavior_driven.main.errors.title",
        values: {
          en: "Error",
          de: "Fehler",
          pl: "Błąd",
          es: "Error",
          fr: "Erreur",
          ja: "エラー",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.errors.dismiss",
        values: {
          en: "Dismiss",
          de: "Schließen",
          pl: "Zamknij",
          es: "Cerrar",
          fr: "Fermer",
          ja: "閉じる",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.errors.generic",
        values: {
          en: "An error occurred. Please try again.",
          de: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
          pl: "Wystąpił błąd. Spróbuj ponownie.",
          es: "Ocurrió un error. Por favor, inténtalo de nuevo.",
          fr: "Une erreur s'est produite. Veuillez réessayer.",
          ja: "エラーが発生しました。もう一度お試しください。",
        }
      },

      // Step names (for navigation/progress)
      {
        key: "ui.checkout_template.behavior_driven.main.steps.product_selection",
        values: {
          en: "Product Selection",
          de: "Produktauswahl",
          pl: "Wybór produktu",
          es: "Selección de producto",
          fr: "Sélection de produit",
          ja: "製品選択",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.steps.registration",
        values: {
          en: "Registration",
          de: "Registrierung",
          pl: "Rejestracja",
          es: "Registro",
          fr: "Inscription",
          ja: "登録",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.steps.customer_info",
        values: {
          en: "Customer Info",
          de: "Kundeninfo",
          pl: "Info o kliencie",
          es: "Info del cliente",
          fr: "Info client",
          ja: "顧客情報",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.steps.review",
        values: {
          en: "Review",
          de: "Überprüfung",
          pl: "Przegląd",
          es: "Revisión",
          fr: "Révision",
          ja: "確認",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.steps.payment",
        values: {
          en: "Payment",
          de: "Zahlung",
          pl: "Płatność",
          es: "Pago",
          fr: "Paiement",
          ja: "支払い",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.steps.confirmation",
        values: {
          en: "Confirmation",
          de: "Bestätigung",
          pl: "Potwierdzenie",
          es: "Confirmación",
          fr: "Confirmation",
          ja: "確認",
        }
      },

      // Common
      {
        key: "ui.checkout_template.behavior_driven.main.common.required",
        values: {
          en: "*",
          de: "*",
          pl: "*",
          es: "*",
          fr: "*",
          ja: "*",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.main.common.optional",
        values: {
          en: "(Optional)",
          de: "(Optional)",
          pl: "(Opcjonalne)",
          es: "(Opcional)",
          fr: "(Optionnel)",
          ja: "(任意)",
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
            "behavior-driven-main"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Main Orchestrator translations (${translations.length} keys)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
