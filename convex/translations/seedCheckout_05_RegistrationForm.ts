/**
 * SEED CHECKOUT TRANSLATIONS - REGISTRATION FORM STEP
 *
 * Multi-ticket registration form with dynamic fields, conditional logic, and validation
 *
 * Component: src/components/checkout/steps/registration-form-step.tsx
 * Namespace: ui.checkout.registration
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCheckout_05_RegistrationForm:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Registration Form Step...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
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
      // ERROR STATES
      // ============================================================
      {
        key: "ui.checkout.registration.error.no_form_id",
        values: {
          en: "No form ID found. Skipping registration form.",
          de: "Keine Formular-ID gefunden. Registrierungsformular wird übersprungen.",
          pl: "Nie znaleziono identyfikatora formularza. Pomijanie formularza rejestracji.",
          es: "No se encontró ID de formulario. Omitiendo formulario de registro.",
          fr: "Aucun ID de formulaire trouvé. Formulaire d'inscription ignoré.",
          ja: "フォームIDが見つかりません。登録フォームをスキップします。",
        }
      },
      {
        key: "ui.checkout.registration.error.invalid_form_id",
        values: {
          en: 'Invalid form configuration. The product has an invalid formId: "{formId}"',
          de: 'Ungültige Formularkonfiguration. Das Produkt hat eine ungültige formId: "{formId}"',
          pl: 'Nieprawidłowa konfiguracja formularza. Produkt ma nieprawidłowy formId: "{formId}"',
          es: 'Configuración de formulario no válida. El producto tiene un formId no válido: "{formId}"',
          fr: 'Configuration de formulaire invalide. Le produit a un formId invalide : "{formId}"',
          ja: '無効なフォーム構成。製品に無効なformIdがあります："{formId}"',
        }
      },
      {
        key: "ui.checkout.registration.error.invalid_form_id_help",
        values: {
          en: "Please edit the product and select a valid form from the dropdown, then save.",
          de: "Bitte bearbeiten Sie das Produkt und wählen Sie ein gültiges Formular aus dem Dropdown-Menü aus, dann speichern Sie.",
          pl: "Proszę edytować produkt i wybrać prawidłowy formularz z listy rozwijanej, a następnie zapisać.",
          es: "Por favor, edite el producto y seleccione un formulario válido del menú desplegable, luego guarde.",
          fr: "Veuillez modifier le produit et sélectionner un formulaire valide dans le menu déroulant, puis enregistrer.",
          ja: "製品を編集して、ドロップダウンから有効なフォームを選択し、保存してください。",
        }
      },
      {
        key: "ui.checkout.registration.error.form_not_found",
        values: {
          en: "Form not found.",
          de: "Formular nicht gefunden.",
          pl: "Formularz nie znaleziony.",
          es: "Formulario no encontrado.",
          fr: "Formulaire introuvable.",
          ja: "フォームが見つかりません。",
        }
      },

      // ============================================================
      // HEADERS
      // ============================================================
      {
        key: "ui.checkout.registration.header.title",
        values: {
          en: "Registration - Ticket {currentTicket} of {totalTickets}",
          de: "Registrierung - Ticket {currentTicket} von {totalTickets}",
          pl: "Rejestracja - Bilet {currentTicket} z {totalTickets}",
          es: "Registro - Ticket {currentTicket} de {totalTickets}",
          fr: "Inscription - Billet {currentTicket} sur {totalTickets}",
          ja: "登録 - チケット {currentTicket} / {totalTickets}",
        }
      },

      // ============================================================
      // PROGRESS INDICATORS
      // ============================================================
      {
        key: "ui.checkout.registration.progress.completed_checkmark",
        values: {
          en: "✓",
          de: "✓",
          pl: "✓",
          es: "✓",
          fr: "✓",
          ja: "✓",
        }
      },

      // ============================================================
      // COPY FROM PREVIOUS BUTTON
      // ============================================================
      {
        key: "ui.checkout.registration.copy_button.label",
        values: {
          en: "Copy from Previous Ticket",
          de: "Vom vorherigen Ticket kopieren",
          pl: "Kopiuj z poprzedniego biletu",
          es: "Copiar del ticket anterior",
          fr: "Copier depuis le billet précédent",
          ja: "前のチケットからコピー",
        }
      },

      // ============================================================
      // FORM LABELS & FIELD COMMON TEXT
      // ============================================================
      {
        key: "ui.checkout.registration.field.required_asterisk",
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
        key: "ui.checkout.registration.select.placeholder",
        values: {
          en: "Please select",
          de: "Bitte wählen",
          pl: "Proszę wybrać",
          es: "Por favor seleccione",
          fr: "Veuillez sélectionner",
          ja: "選択してください",
        }
      },

      // ============================================================
      // VALIDATION ERROR MESSAGES
      // ============================================================
      {
        key: "ui.checkout.registration.validation.field_required",
        values: {
          en: "{fieldLabel} is required",
          de: "{fieldLabel} ist erforderlich",
          pl: "{fieldLabel} jest wymagane",
          es: "{fieldLabel} es obligatorio",
          fr: "{fieldLabel} est requis",
          ja: "{fieldLabel}は必須です",
        }
      },

      // ============================================================
      // NAVIGATION BUTTONS
      // ============================================================
      {
        key: "ui.checkout.registration.button.back",
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
        key: "ui.checkout.registration.button.previous_ticket",
        values: {
          en: "Previous Ticket",
          de: "Vorheriges Ticket",
          pl: "Poprzedni bilet",
          es: "Ticket anterior",
          fr: "Billet précédent",
          ja: "前のチケット",
        }
      },
      {
        key: "ui.checkout.registration.button.next_ticket",
        values: {
          en: "Next Ticket ({nextTicket}/{totalTickets}) →",
          de: "Nächstes Ticket ({nextTicket}/{totalTickets}) →",
          pl: "Następny bilet ({nextTicket}/{totalTickets}) →",
          es: "Siguiente ticket ({nextTicket}/{totalTickets}) →",
          fr: "Billet suivant ({nextTicket}/{totalTickets}) →",
          ja: "次のチケット ({nextTicket}/{totalTickets}) →",
        }
      },
      {
        key: "ui.checkout.registration.button.continue_to_payment",
        values: {
          en: "Continue to Payment →",
          de: "Weiter zur Zahlung →",
          pl: "Przejdź do płatności →",
          es: "Continuar al pago →",
          fr: "Continuer vers le paiement →",
          ja: "支払いへ進む →",
        }
      },
      {
        key: "ui.checkout.registration.button.continue",
        values: {
          en: "Continue",
          de: "Weiter",
          pl: "Kontynuuj",
          es: "Continuar",
          fr: "Continuer",
          ja: "続ける",
        }
      },
      {
        key: "ui.checkout.registration.button.go_back",
        values: {
          en: "Go Back",
          de: "Zurück gehen",
          pl: "Wróć",
          es: "Volver",
          fr: "Retourner",
          ja: "戻る",
        }
      },

      // ============================================================
      // LOADING STATE
      // ============================================================
      {
        key: "ui.checkout.registration.loading.message",
        values: {
          en: "Loading form...",
          de: "Formular wird geladen...",
          pl: "Ładowanie formularza...",
          es: "Cargando formulario...",
          fr: "Chargement du formulaire...",
          ja: "フォームを読み込み中...",
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
            "checkout",
            "registration-form"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} registration form translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
