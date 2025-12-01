/**
 * SEED CRM TRANSLATIONS - CONTACT FORM MODAL
 *
 * Comprehensive contact management form with collapsible sections
 *
 * Component: src/components/window-content/crm-window/contact-form-modal.tsx
 * Namespace: ui.crm.contact_form
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCRM_03_ContactForm:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding CRM - Contact Form Modal...");

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
      // MODAL TITLE
      // ============================================================
      {
        key: "ui.crm.contact_form.title.edit",
        values: {
          en: "Edit Contact",
          de: "Kontakt bearbeiten",
          pl: "Edytuj kontakt",
          es: "Editar contacto",
          fr: "Modifier le contact",
          ja: "連絡先を編集",
        }
      },
      {
        key: "ui.crm.contact_form.title.add_new",
        values: {
          en: "Add New Contact",
          de: "Neuen Kontakt hinzufügen",
          pl: "Dodaj nowy kontakt",
          es: "Agregar nuevo contacto",
          fr: "Ajouter un nouveau contact",
          ja: "新しい連絡先を追加",
        }
      },

      // ============================================================
      // SECTION HEADERS
      // ============================================================
      {
        key: "ui.crm.contact_form.sections.basic_information",
        values: {
          en: "Basic Information",
          de: "Basisinformationen",
          pl: "Podstawowe informacje",
          es: "Información básica",
          fr: "Informations de base",
          ja: "基本情報",
        }
      },
      {
        key: "ui.crm.contact_form.sections.contact_type",
        values: {
          en: "Contact Type",
          de: "Kontakttyp",
          pl: "Typ kontaktu",
          es: "Tipo de contacto",
          fr: "Type de contact",
          ja: "連絡先タイプ",
        }
      },
      {
        key: "ui.crm.contact_form.sections.company",
        values: {
          en: "Company (Optional)",
          de: "Firma (Optional)",
          pl: "Firma (Opcjonalne)",
          es: "Empresa (Opcional)",
          fr: "Entreprise (Optionnel)",
          ja: "会社（オプション）",
        }
      },
      {
        key: "ui.crm.contact_form.sections.address",
        values: {
          en: "Address (Optional)",
          de: "Adresse (Optional)",
          pl: "Adres (Opcjonalny)",
          es: "Dirección (Opcional)",
          fr: "Adresse (Optionnel)",
          ja: "住所（オプション）",
        }
      },
      {
        key: "ui.crm.contact_form.sections.tags_notes",
        values: {
          en: "Tags & Notes (Optional)",
          de: "Tags & Notizen (Optional)",
          pl: "Tagi i notatki (Opcjonalne)",
          es: "Etiquetas y notas (Opcional)",
          fr: "Tags et notes (Optionnel)",
          ja: "タグとメモ（オプション）",
        }
      },
      {
        key: "ui.crm.contact_form.sections.pipelines",
        values: {
          en: "Pipelines",
          de: "Pipelines",
          pl: "Ścieżki sprzedaży",
          es: "Canales",
          fr: "Pipelines",
          ja: "パイプライン",
        }
      },

      // ============================================================
      // FIELD LABELS
      // ============================================================
      {
        key: "ui.crm.contact_form.labels.first_name",
        values: {
          en: "First Name",
          de: "Vorname",
          pl: "Imię",
          es: "Nombre",
          fr: "Prénom",
          ja: "名",
        }
      },
      {
        key: "ui.crm.contact_form.labels.last_name",
        values: {
          en: "Last Name",
          de: "Nachname",
          pl: "Nazwisko",
          es: "Apellido",
          fr: "Nom de famille",
          ja: "姓",
        }
      },
      {
        key: "ui.crm.contact_form.labels.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo electrónico",
          fr: "E-mail",
          ja: "メールアドレス",
        }
      },
      {
        key: "ui.crm.contact_form.labels.phone",
        values: {
          en: "Phone",
          de: "Telefon",
          pl: "Telefon",
          es: "Teléfono",
          fr: "Téléphone",
          ja: "電話番号",
        }
      },
      {
        key: "ui.crm.contact_form.labels.job_title",
        values: {
          en: "Job Title",
          de: "Berufsbezeichnung",
          pl: "Stanowisko",
          es: "Cargo",
          fr: "Titre du poste",
          ja: "役職",
        }
      },
      {
        key: "ui.crm.contact_form.labels.contact_stage",
        values: {
          en: "Contact Stage",
          de: "Kontaktphase",
          pl: "Etap kontaktu",
          es: "Etapa de contacto",
          fr: "Étape de contact",
          ja: "連絡先ステージ",
        }
      },
      {
        key: "ui.crm.contact_form.labels.source",
        values: {
          en: "Source",
          de: "Quelle",
          pl: "Źródło",
          es: "Fuente",
          fr: "Source",
          ja: "ソース",
        }
      },
      {
        key: "ui.crm.contact_form.labels.tags",
        values: {
          en: "Tags",
          de: "Tags",
          pl: "Tagi",
          es: "Etiquetas",
          fr: "Tags",
          ja: "タグ",
        }
      },
      {
        key: "ui.crm.contact_form.labels.notes",
        values: {
          en: "Notes",
          de: "Notizen",
          pl: "Notatki",
          es: "Notas",
          fr: "Notes",
          ja: "メモ",
        }
      },

      // ============================================================
      // COMPANY ASSOCIATION OPTIONS
      // ============================================================
      {
        key: "ui.crm.contact_form.company.no_affiliation",
        values: {
          en: "No company affiliation",
          de: "Keine Firmenzugehörigkeit",
          pl: "Brak przynależności do firmy",
          es: "Sin afiliación de empresa",
          fr: "Pas d'affiliation d'entreprise",
          ja: "会社との関連なし",
        }
      },
      {
        key: "ui.crm.contact_form.company.link_existing",
        values: {
          en: "Link to existing organization",
          de: "Mit bestehender Organisation verknüpfen",
          pl: "Połącz z istniejącą organizacją",
          es: "Vincular a organización existente",
          fr: "Lier à une organisation existante",
          ja: "既存の組織にリンク",
        }
      },
      {
        key: "ui.crm.contact_form.company.create_new",
        values: {
          en: "Create new organization (Quick add)",
          de: "Neue Organisation erstellen (Schnellhinzufügen)",
          pl: "Utwórz nową organizację (Szybkie dodanie)",
          es: "Crear nueva organización (Adición rápida)",
          fr: "Créer une nouvelle organisation (Ajout rapide)",
          ja: "新しい組織を作成（クイック追加）",
        }
      },
      {
        key: "ui.crm.contact_form.company.select_organization",
        values: {
          en: "-- Select Organization --",
          de: "-- Organisation auswählen --",
          pl: "-- Wybierz organizację --",
          es: "-- Seleccionar organización --",
          fr: "-- Sélectionner l'organisation --",
          ja: "-- 組織を選択 --",
        }
      },
      {
        key: "ui.crm.contact_form.company.no_industry",
        values: {
          en: "No industry",
          de: "Keine Branche",
          pl: "Brak branży",
          es: "Sin industria",
          fr: "Pas d'industrie",
          ja: "業界なし",
        }
      },

      // ============================================================
      // PLACEHOLDERS
      // ============================================================
      {
        key: "ui.crm.contact_form.placeholders.company_name",
        values: {
          en: "Company Name",
          de: "Firmenname",
          pl: "Nazwa firmy",
          es: "Nombre de la empresa",
          fr: "Nom de l'entreprise",
          ja: "会社名",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.industry",
        values: {
          en: "Industry",
          de: "Branche",
          pl: "Branża",
          es: "Industria",
          fr: "Industrie",
          ja: "業界",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.website",
        values: {
          en: "Website",
          de: "Webseite",
          pl: "Strona internetowa",
          es: "Sitio web",
          fr: "Site web",
          ja: "ウェブサイト",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.street",
        values: {
          en: "Street",
          de: "Straße",
          pl: "Ulica",
          es: "Calle",
          fr: "Rue",
          ja: "通り",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.city",
        values: {
          en: "City",
          de: "Stadt",
          pl: "Miasto",
          es: "Ciudad",
          fr: "Ville",
          ja: "市区町村",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.state_province",
        values: {
          en: "State/Province",
          de: "Bundesland/Provinz",
          pl: "Województwo/Prowincja",
          es: "Estado/Provincia",
          fr: "État/Province",
          ja: "都道府県",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.postal_code",
        values: {
          en: "Postal Code",
          de: "Postleitzahl",
          pl: "Kod pocztowy",
          es: "Código postal",
          fr: "Code postal",
          ja: "郵便番号",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.tag_input",
        values: {
          en: "Enter tag and press Enter",
          de: "Tag eingeben und Enter drücken",
          pl: "Wprowadź tag i naciśnij Enter",
          es: "Ingrese etiqueta y presione Enter",
          fr: "Saisissez le tag et appuyez sur Entrée",
          ja: "タグを入力してEnterキーを押してください",
        }
      },
      {
        key: "ui.crm.contact_form.placeholders.notes",
        values: {
          en: "Add any additional information about this contact...",
          de: "Fügen Sie zusätzliche Informationen zu diesem Kontakt hinzu...",
          pl: "Dodaj dodatkowe informacje o tym kontakcie...",
          es: "Agregue información adicional sobre este contacto...",
          fr: "Ajoutez des informations supplémentaires sur ce contact...",
          ja: "この連絡先に関する追加情報を入力してください...",
        }
      },

      // ============================================================
      // LIFECYCLE STAGE OPTIONS
      // ============================================================
      {
        key: "ui.crm.contact_form.stages.lead",
        values: {
          en: "Lead",
          de: "Lead",
          pl: "Lead",
          es: "Prospecto",
          fr: "Lead",
          ja: "リード",
        }
      },
      {
        key: "ui.crm.contact_form.stages.prospect",
        values: {
          en: "Prospect",
          de: "Interessent",
          pl: "Prospekt",
          es: "Prospecto",
          fr: "Prospect",
          ja: "見込み客",
        }
      },
      {
        key: "ui.crm.contact_form.stages.customer",
        values: {
          en: "Customer",
          de: "Kunde",
          pl: "Klient",
          es: "Cliente",
          fr: "Client",
          ja: "顧客",
        }
      },
      {
        key: "ui.crm.contact_form.stages.partner",
        values: {
          en: "Partner",
          de: "Partner",
          pl: "Partner",
          es: "Socio",
          fr: "Partenaire",
          ja: "パートナー",
        }
      },

      // ============================================================
      // SOURCE OPTIONS
      // ============================================================
      {
        key: "ui.crm.contact_form.sources.manual",
        values: {
          en: "Manual",
          de: "Manuell",
          pl: "Ręczne",
          es: "Manual",
          fr: "Manuel",
          ja: "手動",
        }
      },
      {
        key: "ui.crm.contact_form.sources.import",
        values: {
          en: "Import",
          de: "Import",
          pl: "Import",
          es: "Importar",
          fr: "Importer",
          ja: "インポート",
        }
      },
      {
        key: "ui.crm.contact_form.sources.event",
        values: {
          en: "Event",
          de: "Event",
          pl: "Wydarzenie",
          es: "Evento",
          fr: "Événement",
          ja: "イベント",
        }
      },
      {
        key: "ui.crm.contact_form.sources.form",
        values: {
          en: "Form",
          de: "Formular",
          pl: "Formularz",
          es: "Formulario",
          fr: "Formulaire",
          ja: "フォーム",
        }
      },

      // ============================================================
      // COUNTRY OPTIONS
      // ============================================================
      {
        key: "ui.crm.contact_form.countries.united_states",
        values: {
          en: "United States",
          de: "Vereinigte Staaten",
          pl: "Stany Zjednoczone",
          es: "Estados Unidos",
          fr: "États-Unis",
          ja: "アメリカ合衆国",
        }
      },
      {
        key: "ui.crm.contact_form.countries.canada",
        values: {
          en: "Canada",
          de: "Kanada",
          pl: "Kanada",
          es: "Canadá",
          fr: "Canada",
          ja: "カナダ",
        }
      },
      {
        key: "ui.crm.contact_form.countries.united_kingdom",
        values: {
          en: "United Kingdom",
          de: "Vereinigtes Königreich",
          pl: "Wielka Brytania",
          es: "Reino Unido",
          fr: "Royaume-Uni",
          ja: "イギリス",
        }
      },
      {
        key: "ui.crm.contact_form.countries.australia",
        values: {
          en: "Australia",
          de: "Australien",
          pl: "Australia",
          es: "Australia",
          fr: "Australie",
          ja: "オーストラリア",
        }
      },

      // ============================================================
      // BUTTONS
      // ============================================================
      {
        key: "ui.crm.contact_form.buttons.add_tag",
        values: {
          en: "Add",
          de: "Hinzufügen",
          pl: "Dodaj",
          es: "Agregar",
          fr: "Ajouter",
          ja: "追加",
        }
      },
      {
        key: "ui.crm.contact_form.buttons.cancel",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },
      {
        key: "ui.crm.contact_form.buttons.save_contact",
        values: {
          en: "Save Contact",
          de: "Kontakt speichern",
          pl: "Zapisz kontakt",
          es: "Guardar contacto",
          fr: "Enregistrer le contact",
          ja: "連絡先を保存",
        }
      },
      {
        key: "ui.crm.contact_form.buttons.saving",
        values: {
          en: "Saving...",
          de: "Speichern...",
          pl: "Zapisywanie...",
          es: "Guardando...",
          fr: "Enregistrement...",
          ja: "保存中...",
        }
      },
      {
        key: "ui.crm.contact_form.buttons.delete",
        values: {
          en: "Delete",
          de: "Löschen",
          pl: "Usuń",
          es: "Eliminar",
          fr: "Supprimer",
          ja: "削除",
        }
      },
      {
        key: "ui.crm.contact_form.buttons.deleting",
        values: {
          en: "Deleting...",
          de: "Löschen...",
          pl: "Usuwanie...",
          es: "Eliminando...",
          fr: "Suppression...",
          ja: "削除中...",
        }
      },
      {
        key: "ui.crm.contact_form.buttons.add_to_pipeline",
        values: {
          en: "Add to Pipeline",
          de: "Zu Pipeline hinzufügen",
          pl: "Dodaj do ścieżki sprzedaży",
          es: "Agregar al canal",
          fr: "Ajouter au pipeline",
          ja: "パイプラインに追加",
        }
      },

      // ============================================================
      // VALIDATION / ERROR MESSAGES
      // ============================================================
      {
        key: "ui.crm.contact_form.validation.email_invalid",
        values: {
          en: "Please enter a valid email address",
          de: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
          pl: "Proszę podać prawidłowy adres e-mail",
          es: "Por favor ingrese una dirección de correo válida",
          fr: "Veuillez saisir une adresse e-mail valide",
          ja: "有効なメールアドレスを入力してください",
        }
      },
      {
        key: "ui.crm.contact_form.errors.create_failed",
        values: {
          en: "Failed to create contact. Please try again.",
          de: "Kontakt konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się utworzyć kontaktu. Spróbuj ponownie.",
          es: "Error al crear el contacto. Por favor, inténtelo de nuevo.",
          fr: "Échec de la création du contact. Veuillez réessayer.",
          ja: "連絡先の作成に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.crm.contact_form.errors.update_failed",
        values: {
          en: "Failed to update contact. Please try again.",
          de: "Kontakt konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się zaktualizować kontaktu. Spróbuj ponownie.",
          es: "Error al actualizar el contacto. Por favor, inténtelo de nuevo.",
          fr: "Échec de la mise à jour du contact. Veuillez réessayer.",
          ja: "連絡先の更新に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.crm.contact_form.errors.delete_failed",
        values: {
          en: "Failed to delete contact. Please try again.",
          de: "Kontakt konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się usunąć kontaktu. Spróbuj ponownie.",
          es: "Error al eliminar el contacto. Por favor, inténtelo de nuevo.",
          fr: "Échec de la suppression du contact. Veuillez réessayer.",
          ja: "連絡先の削除に失敗しました。もう一度お試しください。",
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
            "crm",
            "contact-form"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} contact form translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
