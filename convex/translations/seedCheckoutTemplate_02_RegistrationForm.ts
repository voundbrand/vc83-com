/**
 * SEED CHECKOUT TEMPLATE - REGISTRATION FORM STEP
 *
 * Seeds translations for the behavior-driven checkout template - Registration Form step.
 * Run independently: npx convex run translations/seedCheckoutTemplate_02_RegistrationForm:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Registration Form translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    // Define supported locales
    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    // Registration Form Step translations
    const translations = [
      // Headers
      {
        key: "ui.checkout_template.behavior_driven.registration_form.headers.title",
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
        key: "ui.checkout_template.behavior_driven.registration_form.headers.subtitle",
        values: {
          en: "Please provide information for each ticket holder",
          de: "Bitte geben Sie Informationen für jeden Ticketinhaber an",
          pl: "Proszę podać informacje o każdym posiadaczu biletu",
          es: "Por favor, proporcione información para cada titular de entrada",
          fr: "Veuillez fournir des informations pour chaque titulaire de billet",
          ja: "各チケット保持者の情報を提供してください",
        }
      },

      // Ticket labels
      {
        key: "ui.checkout_template.behavior_driven.registration_form.labels.ticket",
        values: {
          en: "ticket",
          de: "Ticket",
          pl: "bilet",
          es: "entrada",
          fr: "billet",
          ja: "チケット",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.registration_form.labels.tickets",
        values: {
          en: "tickets",
          de: "Tickets",
          pl: "bilety",
          es: "entradas",
          fr: "billets",
          ja: "チケット",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.registration_form.labels.ticket_number",
        values: {
          en: "Ticket #",
          de: "Ticket Nr.",
          pl: "Bilet nr",
          es: "Entrada #",
          fr: "Billet n°",
          ja: "チケット番号",
        }
      },

      // Form controls
      {
        key: "ui.checkout_template.behavior_driven.registration_form.labels.select_placeholder",
        values: {
          en: "Select...",
          de: "Auswählen...",
          pl: "Wybierz...",
          es: "Seleccionar...",
          fr: "Sélectionner...",
          ja: "選択...",
        }
      },

      // Buttons
      {
        key: "ui.checkout_template.behavior_driven.registration_form.buttons.continue",
        values: {
          en: "Continue to Customer Info →",
          de: "Weiter zu Kundeninformationen →",
          pl: "Przejdź do informacji o kliencie →",
          es: "Continuar con información del cliente →",
          fr: "Continuer vers informations client →",
          ja: "顧客情報に進む →",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.registration_form.buttons.back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
        }
      },

      // Messages
      {
        key: "ui.checkout_template.behavior_driven.registration_form.messages.loading",
        values: {
          en: "Loading form...",
          de: "Formular wird geladen...",
          pl: "Ładowanie formularza...",
          es: "Cargando formulario...",
          fr: "Chargement du formulaire...",
          ja: "フォームを読み込んでいます...",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.registration_form.messages.complete_all",
        values: {
          en: "Please complete all registration forms",
          de: "Bitte füllen Sie alle Registrierungsformulare aus",
          pl: "Proszę wypełnić wszystkie formularze rejestracyjne",
          es: "Por favor, complete todos los formularios de registro",
          fr: "Veuillez compléter tous les formulaires d'inscription",
          ja: "すべての登録フォームに記入してください",
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
            "behavior-driven-registration-form"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Registration Form: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  }
});
