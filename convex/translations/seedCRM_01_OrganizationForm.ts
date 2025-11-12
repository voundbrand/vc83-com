/**
 * SEED CRM TRANSLATIONS - ORGANIZATION FORM MODAL
 *
 * Comprehensive organization management form with collapsible sections
 *
 * Component: src/components/window-content/crm-window/organization-form-modal.tsx
 * Namespace: ui.crm.organization_form
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCRM_01_OrganizationForm:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding CRM - Organization Form Modal...");

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
        key: "ui.crm.organization_form.modal.title_edit",
        values: {
          en: "Edit Organization",
          de: "Organisation bearbeiten",
          pl: "Edytuj organizację",
          es: "Editar organización",
          fr: "Modifier l'organisation",
          ja: "組織を編集",
        }
      },
      {
        key: "ui.crm.organization_form.modal.title_add",
        values: {
          en: "Add New Organization",
          de: "Neue Organisation hinzufügen",
          pl: "Dodaj nową organizację",
          es: "Agregar nueva organización",
          fr: "Ajouter une nouvelle organisation",
          ja: "新しい組織を追加",
        }
      },

      // ============================================================
      // SECTION HEADERS
      // ============================================================
      {
        key: "ui.crm.organization_form.sections.organization_details",
        values: {
          en: "🏢 Organization Details",
          de: "🏢 Organisationsdetails",
          pl: "🏢 Szczegóły organizacji",
          es: "🏢 Detalles de la organización",
          fr: "🏢 Détails de l'organisation",
          ja: "🏢 組織の詳細",
        }
      },
      {
        key: "ui.crm.organization_form.sections.organization_type",
        values: {
          en: "🎯 Organization Type",
          de: "🎯 Organisationstyp",
          pl: "🎯 Typ organizacji",
          es: "🎯 Tipo de organización",
          fr: "🎯 Type d'organisation",
          ja: "🎯 組織タイプ",
        }
      },
      {
        key: "ui.crm.organization_form.sections.contact_details",
        values: {
          en: "📞 Contact Details (Optional)",
          de: "📞 Kontaktdaten (Optional)",
          pl: "📞 Dane kontaktowe (Opcjonalne)",
          es: "📞 Detalles de contacto (Opcional)",
          fr: "📞 Coordonnées (Optionnel)",
          ja: "📞 連絡先詳細（オプション）",
        }
      },
      {
        key: "ui.crm.organization_form.sections.address",
        values: {
          en: "📍 Address (Optional)",
          de: "📍 Adresse (Optional)",
          pl: "📍 Adres (Opcjonalny)",
          es: "📍 Dirección (Opcional)",
          fr: "📍 Adresse (Optionnel)",
          ja: "📍 住所（オプション）",
        }
      },
      {
        key: "ui.crm.organization_form.sections.sponsorship_details",
        values: {
          en: "🌟 Sponsorship Details",
          de: "🌟 Sponsoring-Details",
          pl: "🌟 Szczegóły sponsoringu",
          es: "🌟 Detalles de patrocinio",
          fr: "🌟 Détails du parrainage",
          ja: "🌟 スポンサーシップ詳細",
        }
      },
      {
        key: "ui.crm.organization_form.sections.tags_notes",
        values: {
          en: "🏷️ Tags & Notes (Optional)",
          de: "🏷️ Tags & Notizen (Optional)",
          pl: "🏷️ Tagi i notatki (Opcjonalne)",
          es: "🏷️ Etiquetas y notas (Opcional)",
          fr: "🏷️ Tags et notes (Optionnel)",
          ja: "🏷️ タグとメモ（オプション）",
        }
      },

      // ============================================================
      // FIELD LABELS - BASIC INFO
      // ============================================================
      {
        key: "ui.crm.organization_form.labels.organization_name",
        values: {
          en: "Organization Name",
          de: "Organisationsname",
          pl: "Nazwa organizacji",
          es: "Nombre de la organización",
          fr: "Nom de l'organisation",
          ja: "組織名",
        }
      },
      {
        key: "ui.crm.organization_form.labels.website",
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
        key: "ui.crm.organization_form.labels.industry",
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
        key: "ui.crm.organization_form.labels.organization_size",
        values: {
          en: "Organization Size",
          de: "Organisationsgröße",
          pl: "Wielkość organizacji",
          es: "Tamaño de la organización",
          fr: "Taille de l'organisation",
          ja: "組織規模",
        }
      },

      // ============================================================
      // FIELD LABELS - CONTACT
      // ============================================================
      {
        key: "ui.crm.organization_form.labels.primary_phone",
        values: {
          en: "Primary Phone",
          de: "Haupttelefon",
          pl: "Telefon główny",
          es: "Teléfono principal",
          fr: "Téléphone principal",
          ja: "主電話番号",
        }
      },
      {
        key: "ui.crm.organization_form.labels.billing_email",
        values: {
          en: "Billing Email",
          de: "Rechnungs-E-Mail",
          pl: "E-mail rozliczeniowy",
          es: "Correo de facturación",
          fr: "E-mail de facturation",
          ja: "請求メールアドレス",
        }
      },
      {
        key: "ui.crm.organization_form.labels.tax_id",
        values: {
          en: "Tax ID / VAT Number",
          de: "Steuer-ID / USt-IdNr.",
          pl: "NIP / Numer VAT",
          es: "ID fiscal / Número de IVA",
          fr: "ID fiscal / Numéro de TVA",
          ja: "税務番号 / VAT番号",
        }
      },

      // ============================================================
      // FIELD LABELS - SPONSORSHIP
      // ============================================================
      {
        key: "ui.crm.organization_form.labels.sponsor_level",
        values: {
          en: "Sponsor Level",
          de: "Sponsor-Stufe",
          pl: "Poziom sponsora",
          es: "Nivel de patrocinio",
          fr: "Niveau de parrainage",
          ja: "スポンサーレベル",
        }
      },
      {
        key: "ui.crm.organization_form.labels.logo_url",
        values: {
          en: "Logo URL",
          de: "Logo-URL",
          pl: "URL logo",
          es: "URL del logo",
          fr: "URL du logo",
          ja: "ロゴURL",
        }
      },
      {
        key: "ui.crm.organization_form.labels.sponsor_bio",
        values: {
          en: "Sponsor Bio",
          de: "Sponsor-Biografie",
          pl: "Biografia sponsora",
          es: "Biografía del patrocinador",
          fr: "Biographie du parrain",
          ja: "スポンサープロフィール",
        }
      },
      {
        key: "ui.crm.organization_form.labels.tags",
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
        key: "ui.crm.organization_form.labels.notes",
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
      // PLACEHOLDERS
      // ============================================================
      {
        key: "ui.crm.organization_form.placeholders.website",
        values: {
          en: "example.com",
          de: "beispiel.de",
          pl: "przyklad.pl",
          es: "ejemplo.com",
          fr: "exemple.fr",
          ja: "example.jp",
        }
      },
      {
        key: "ui.crm.organization_form.placeholders.street",
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
        key: "ui.crm.organization_form.placeholders.city",
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
        key: "ui.crm.organization_form.placeholders.state",
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
        key: "ui.crm.organization_form.placeholders.postal_code",
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
        key: "ui.crm.organization_form.placeholders.logo_url",
        values: {
          en: "https://example.com/logo.png",
          de: "https://beispiel.de/logo.png",
          pl: "https://przyklad.pl/logo.png",
          es: "https://ejemplo.com/logo.png",
          fr: "https://exemple.fr/logo.png",
          ja: "https://example.jp/logo.png",
        }
      },
      {
        key: "ui.crm.organization_form.placeholders.sponsor_bio",
        values: {
          en: "Optional - shown on event pages",
          de: "Optional - wird auf Eventseiten angezeigt",
          pl: "Opcjonalne - wyświetlane na stronach wydarzeń",
          es: "Opcional - se muestra en páginas de eventos",
          fr: "Optionnel - affiché sur les pages d'événements",
          ja: "オプション - イベントページに表示されます",
        }
      },
      {
        key: "ui.crm.organization_form.placeholders.tag_input",
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
        key: "ui.crm.organization_form.placeholders.notes",
        values: {
          en: "Add any additional information about this organization...",
          de: "Fügen Sie zusätzliche Informationen zu dieser Organisation hinzu...",
          pl: "Dodaj dodatkowe informacje o tej organizacji...",
          es: "Agregue información adicional sobre esta organización...",
          fr: "Ajoutez des informations supplémentaires sur cette organisation...",
          ja: "この組織に関する追加情報を入力してください...",
        }
      },

      // ============================================================
      // HELPER TEXT
      // ============================================================
      {
        key: "ui.crm.organization_form.helpers.website_prefix",
        values: {
          en: "Auto-prefixed with https:// if not provided",
          de: "Wird automatisch mit https:// vorangestellt, falls nicht angegeben",
          pl: "Automatycznie dodawane https:// jeśli nie podano",
          es: "Se antepone automáticamente https:// si no se proporciona",
          fr: "Préfixé automatiquement par https:// si non fourni",
          ja: "指定されていない場合、自動的にhttps://が付加されます",
        }
      },
      {
        key: "ui.crm.organization_form.helpers.logo_optional",
        values: {
          en: "Optional - for event displays",
          de: "Optional - für Eventanzeigen",
          pl: "Opcjonalne - do wyświetlania na wydarzeniach",
          es: "Opcional - para mostrar en eventos",
          fr: "Optionnel - pour l'affichage des événements",
          ja: "オプション - イベント表示用",
        }
      },
      {
        key: "ui.crm.organization_form.helpers.org_type_description",
        values: {
          en: "Select the relationship type for this organization",
          de: "Wählen Sie den Beziehungstyp für diese Organisation",
          pl: "Wybierz typ relacji dla tej organizacji",
          es: "Seleccione el tipo de relación para esta organización",
          fr: "Sélectionnez le type de relation pour cette organisation",
          ja: "この組織の関係タイプを選択してください",
        }
      },

      // ============================================================
      // REQUIRED INDICATOR
      // ============================================================
      {
        key: "ui.crm.organization_form.required",
        values: {
          en: "*",
          de: "*",
          pl: "*",
          es: "*",
          fr: "*",
          ja: "*",
        }
      },

      // ============================================================
      // DROPDOWNS - INDUSTRY
      // ============================================================
      {
        key: "ui.crm.organization_form.industry.select_placeholder",
        values: {
          en: "-- Select Industry --",
          de: "-- Branche auswählen --",
          pl: "-- Wybierz branżę --",
          es: "-- Seleccionar industria --",
          fr: "-- Sélectionner l'industrie --",
          ja: "-- 業界を選択 --",
        }
      },
      {
        key: "ui.crm.organization_form.industry.technology",
        values: {
          en: "Technology",
          de: "Technologie",
          pl: "Technologia",
          es: "Tecnología",
          fr: "Technologie",
          ja: "テクノロジー",
        }
      },
      {
        key: "ui.crm.organization_form.industry.healthcare",
        values: {
          en: "Healthcare",
          de: "Gesundheitswesen",
          pl: "Opieka zdrowotna",
          es: "Salud",
          fr: "Santé",
          ja: "ヘルスケア",
        }
      },
      {
        key: "ui.crm.organization_form.industry.finance",
        values: {
          en: "Finance",
          de: "Finanzwesen",
          pl: "Finanse",
          es: "Finanzas",
          fr: "Finance",
          ja: "金融",
        }
      },
      {
        key: "ui.crm.organization_form.industry.manufacturing",
        values: {
          en: "Manufacturing",
          de: "Fertigung",
          pl: "Produkcja",
          es: "Manufactura",
          fr: "Fabrication",
          ja: "製造業",
        }
      },
      {
        key: "ui.crm.organization_form.industry.retail",
        values: {
          en: "Retail",
          de: "Einzelhandel",
          pl: "Handel detaliczny",
          es: "Comercio minorista",
          fr: "Commerce de détail",
          ja: "小売",
        }
      },
      {
        key: "ui.crm.organization_form.industry.education",
        values: {
          en: "Education",
          de: "Bildung",
          pl: "Edukacja",
          es: "Educación",
          fr: "Éducation",
          ja: "教育",
        }
      },
      {
        key: "ui.crm.organization_form.industry.media",
        values: {
          en: "Media",
          de: "Medien",
          pl: "Media",
          es: "Medios",
          fr: "Médias",
          ja: "メディア",
        }
      },
      {
        key: "ui.crm.organization_form.industry.real_estate",
        values: {
          en: "Real Estate",
          de: "Immobilien",
          pl: "Nieruchomości",
          es: "Bienes raíces",
          fr: "Immobilier",
          ja: "不動産",
        }
      },
      {
        key: "ui.crm.organization_form.industry.other",
        values: {
          en: "Other",
          de: "Sonstige",
          pl: "Inne",
          es: "Otro",
          fr: "Autre",
          ja: "その他",
        }
      },

      // ============================================================
      // DROPDOWNS - SIZE
      // ============================================================
      {
        key: "ui.crm.organization_form.size.select_placeholder",
        values: {
          en: "-- Select Size --",
          de: "-- Größe auswählen --",
          pl: "-- Wybierz wielkość --",
          es: "-- Seleccionar tamaño --",
          fr: "-- Sélectionner la taille --",
          ja: "-- 規模を選択 --",
        }
      },

      // ============================================================
      // ORGANIZATION TYPES
      // ============================================================
      {
        key: "ui.crm.organization_form.types.prospect",
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
        key: "ui.crm.organization_form.types.customer",
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
        key: "ui.crm.organization_form.types.partner",
        values: {
          en: "Partner",
          de: "Partner",
          pl: "Partner",
          es: "Socio",
          fr: "Partenaire",
          ja: "パートナー",
        }
      },
      {
        key: "ui.crm.organization_form.types.sponsor",
        values: {
          en: "Sponsor",
          de: "Sponsor",
          pl: "Sponsor",
          es: "Patrocinador",
          fr: "Parrain",
          ja: "スポンサー",
        }
      },

      // ============================================================
      // SPONSOR LEVELS
      // ============================================================
      {
        key: "ui.crm.organization_form.sponsor_level.select_placeholder",
        values: {
          en: "-- Select Level --",
          de: "-- Stufe auswählen --",
          pl: "-- Wybierz poziom --",
          es: "-- Seleccionar nivel --",
          fr: "-- Sélectionner le niveau --",
          ja: "-- レベルを選択 --",
        }
      },
      {
        key: "ui.crm.organization_form.sponsor_level.platinum",
        values: {
          en: "Platinum",
          de: "Platin",
          pl: "Platyna",
          es: "Platino",
          fr: "Platine",
          ja: "プラチナ",
        }
      },
      {
        key: "ui.crm.organization_form.sponsor_level.gold",
        values: {
          en: "Gold",
          de: "Gold",
          pl: "Złoto",
          es: "Oro",
          fr: "Or",
          ja: "ゴールド",
        }
      },
      {
        key: "ui.crm.organization_form.sponsor_level.silver",
        values: {
          en: "Silver",
          de: "Silber",
          pl: "Srebro",
          es: "Plata",
          fr: "Argent",
          ja: "シルバー",
        }
      },
      {
        key: "ui.crm.organization_form.sponsor_level.bronze",
        values: {
          en: "Bronze",
          de: "Bronze",
          pl: "Brąz",
          es: "Bronce",
          fr: "Bronze",
          ja: "ブロンズ",
        }
      },
      {
        key: "ui.crm.organization_form.sponsor_level.community",
        values: {
          en: "Community",
          de: "Community",
          pl: "Społeczność",
          es: "Comunidad",
          fr: "Communauté",
          ja: "コミュニティ",
        }
      },

      // ============================================================
      // COUNTRY SELECTION
      // ============================================================
      {
        key: "ui.crm.organization_form.country.select_placeholder",
        values: {
          en: "-- Select Country --",
          de: "-- Land auswählen --",
          pl: "-- Wybierz kraj --",
          es: "-- Seleccionar país --",
          fr: "-- Sélectionner le pays --",
          ja: "-- 国を選択 --",
        }
      },

      // ============================================================
      // BUTTONS
      // ============================================================
      {
        key: "ui.crm.organization_form.buttons.add_tag",
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
        key: "ui.crm.organization_form.buttons.cancel",
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
        key: "ui.crm.organization_form.buttons.save",
        values: {
          en: "Save Organization",
          de: "Organisation speichern",
          pl: "Zapisz organizację",
          es: "Guardar organización",
          fr: "Enregistrer l'organisation",
          ja: "組織を保存",
        }
      },
      {
        key: "ui.crm.organization_form.buttons.saving",
        values: {
          en: "Saving...",
          de: "Speichern...",
          pl: "Zapisywanie...",
          es: "Guardando...",
          fr: "Enregistrement...",
          ja: "保存中...",
        }
      },

      // ============================================================
      // VALIDATION / ERROR MESSAGES
      // ============================================================
      {
        key: "ui.crm.organization_form.validation.email_invalid",
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
        key: "ui.crm.organization_form.errors.create_failed",
        values: {
          en: "Failed to create organization. Please try again.",
          de: "Organisation konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się utworzyć organizacji. Spróbuj ponownie.",
          es: "Error al crear la organización. Por favor, inténtelo de nuevo.",
          fr: "Échec de la création de l'organisation. Veuillez réessayer.",
          ja: "組織の作成に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.crm.organization_form.errors.update_failed",
        values: {
          en: "Failed to update organization. Please try again.",
          de: "Organisation konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się zaktualizować organizacji. Spróbuj ponownie.",
          es: "Error al actualizar la organización. Por favor, inténtelo de nuevo.",
          fr: "Échec de la mise à jour de l'organisation. Veuillez réessayer.",
          ja: "組織の更新に失敗しました。もう一度お試しください。",
        }
      },

      // ============================================================
      // B2B BILLING & LEGAL SETTINGS
      // ============================================================
      {
        key: "ui.crm.organization_form.sections.b2b_billing",
        values: {
          en: "💳 B2B Billing & Legal Settings (Optional)",
          de: "💳 B2B-Abrechnung & rechtliche Einstellungen (Optional)",
          pl: "💳 Rozliczenia B2B i ustawienia prawne (Opcjonalne)",
          es: "💳 Facturación B2B y configuración legal (Opcional)",
          fr: "💳 Facturation B2B et paramètres juridiques (Optionnel)",
          ja: "💳 B2B請求と法的設定（オプション）",
        }
      },

      // Legal Entity
      {
        key: "ui.crm.organization_form.b2b.legal_entity_info",
        values: {
          en: "Legal Entity Information",
          de: "Informationen zur juristischen Person",
          pl: "Informacje o podmiocie prawnym",
          es: "Información de entidad legal",
          fr: "Informations sur l'entité juridique",
          ja: "法人情報",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_entity_type",
        values: {
          en: "Legal Entity Type",
          de: "Art der juristischen Person",
          pl: "Typ podmiotu prawnego",
          es: "Tipo de entidad legal",
          fr: "Type d'entité juridique",
          ja: "法人種別",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_type.select",
        values: {
          en: "-- Select Type --",
          de: "-- Typ auswählen --",
          pl: "-- Wybierz typ --",
          es: "-- Seleccionar tipo --",
          fr: "-- Sélectionner le type --",
          ja: "-- タイプを選択 --",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_type.corporation",
        values: {
          en: "Corporation",
          de: "Kapitalgesellschaft",
          pl: "Spółka akcyjna",
          es: "Corporación",
          fr: "Société anonyme",
          ja: "株式会社",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_type.llc",
        values: {
          en: "LLC",
          de: "GmbH",
          pl: "Sp. z o.o.",
          es: "SRL",
          fr: "SARL",
          ja: "合同会社",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_type.partnership",
        values: {
          en: "Partnership",
          de: "Personengesellschaft",
          pl: "Spółka osobowa",
          es: "Sociedad",
          fr: "Société de personnes",
          ja: "パートナーシップ",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_type.sole_proprietorship",
        values: {
          en: "Sole Proprietorship",
          de: "Einzelunternehmen",
          pl: "Jednoosobowa działalność gospodarcza",
          es: "Empresa individual",
          fr: "Entreprise individuelle",
          ja: "個人事業主",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.legal_type.nonprofit",
        values: {
          en: "Nonprofit",
          de: "Gemeinnützig",
          pl: "Organizacja non-profit",
          es: "Sin fines de lucro",
          fr: "Organisation à but non lucratif",
          ja: "非営利団体",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.registration_number",
        values: {
          en: "Registration Number",
          de: "Registrierungsnummer",
          pl: "Numer rejestracyjny",
          es: "Número de registro",
          fr: "Numéro d'enregistrement",
          ja: "登録番号",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.registration_placeholder",
        values: {
          en: "Company registration #",
          de: "Handelsregisternummer",
          pl: "Nr wpisu do rejestru",
          es: "# de registro de empresa",
          fr: "Numéro d'immatriculation",
          ja: "会社登録番号",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.vat_number",
        values: {
          en: "VAT Number",
          de: "USt-IdNr.",
          pl: "Numer VAT",
          es: "Número de IVA",
          fr: "Numéro de TVA",
          ja: "VAT番号",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.vat_placeholder",
        values: {
          en: "VAT/GST number",
          de: "USt-IdNr./MwSt-Nr.",
          pl: "Numer VAT/GST",
          es: "Número de IVA/GST",
          fr: "Numéro TVA/TPS",
          ja: "VAT/GST番号",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.tax_exempt",
        values: {
          en: "Tax Exempt",
          de: "Steuerbefreit",
          pl: "Zwolniony z podatku",
          es: "Exento de impuestos",
          fr: "Exonéré de taxe",
          ja: "免税",
        }
      },

      // Billing Address
      {
        key: "ui.crm.organization_form.b2b.billing_address",
        values: {
          en: "Billing Address (if different from main address)",
          de: "Rechnungsadresse (falls abweichend)",
          pl: "Adres rozliczeniowy (jeśli inny)",
          es: "Dirección de facturación (si es diferente)",
          fr: "Adresse de facturation (si différente)",
          ja: "請求先住所（メイン住所と異なる場合）",
        }
      },

      // Payment Settings
      {
        key: "ui.crm.organization_form.b2b.payment_settings",
        values: {
          en: "Payment Settings",
          de: "Zahlungseinstellungen",
          pl: "Ustawienia płatności",
          es: "Configuración de pago",
          fr: "Paramètres de paiement",
          ja: "支払い設定",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_terms",
        values: {
          en: "Payment Terms",
          de: "Zahlungsbedingungen",
          pl: "Warunki płatności",
          es: "Condiciones de pago",
          fr: "Conditions de paiement",
          ja: "支払い条件",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_terms.due_on_receipt",
        values: {
          en: "Due on Receipt",
          de: "Sofort fällig",
          pl: "Płatne przy otrzymaniu",
          es: "Vencimiento al recibo",
          fr: "À réception",
          ja: "受領時",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_terms.net15",
        values: {
          en: "Net 15",
          de: "Netto 15",
          pl: "Net 15",
          es: "Neto 15",
          fr: "Net 15",
          ja: "ネット15",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_terms.net30",
        values: {
          en: "Net 30",
          de: "Netto 30",
          pl: "Net 30",
          es: "Neto 30",
          fr: "Net 30",
          ja: "ネット30",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_terms.net60",
        values: {
          en: "Net 60",
          de: "Netto 60",
          pl: "Net 60",
          es: "Neto 60",
          fr: "Net 60",
          ja: "ネット60",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_terms.net90",
        values: {
          en: "Net 90",
          de: "Netto 90",
          pl: "Net 90",
          es: "Neto 90",
          fr: "Net 90",
          ja: "ネット90",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.credit_limit",
        values: {
          en: "Credit Limit",
          de: "Kreditlimit",
          pl: "Limit kredytowy",
          es: "Límite de crédito",
          fr: "Limite de crédit",
          ja: "与信限度額",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.preferred_payment_method",
        values: {
          en: "Preferred Payment Method",
          de: "Bevorzugte Zahlungsmethode",
          pl: "Preferowana metoda płatności",
          es: "Método de pago preferido",
          fr: "Mode de paiement préféré",
          ja: "希望する支払い方法",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_method.select",
        values: {
          en: "-- Select Method --",
          de: "-- Methode auswählen --",
          pl: "-- Wybierz metodę --",
          es: "-- Seleccionar método --",
          fr: "-- Sélectionner la méthode --",
          ja: "-- 方法を選択 --",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_method.invoice",
        values: {
          en: "Invoice",
          de: "Rechnung",
          pl: "Faktura",
          es: "Factura",
          fr: "Facture",
          ja: "請求書",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_method.bank_transfer",
        values: {
          en: "Bank Transfer",
          de: "Banküberweisung",
          pl: "Przelew bankowy",
          es: "Transferencia bancaria",
          fr: "Virement bancaire",
          ja: "銀行振込",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.payment_method.credit_card",
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
        key: "ui.crm.organization_form.b2b.payment_method.check",
        values: {
          en: "Check",
          de: "Scheck",
          pl: "Czek",
          es: "Cheque",
          fr: "Chèque",
          ja: "小切手",
        }
      },

      // Accounting Integration
      {
        key: "ui.crm.organization_form.b2b.accounting_integration",
        values: {
          en: "Accounting Integration",
          de: "Buchhaltungsintegration",
          pl: "Integracja księgowa",
          es: "Integración contable",
          fr: "Intégration comptable",
          ja: "会計統合",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.accounting_reference",
        values: {
          en: "Accounting Reference",
          de: "Buchhaltungsreferenz",
          pl: "Referencja księgowa",
          es: "Referencia contable",
          fr: "Référence comptable",
          ja: "会計参照",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.accounting_reference_placeholder",
        values: {
          en: "External system ID",
          de: "Externes System-ID",
          pl: "ID systemu zewnętrznego",
          es: "ID de sistema externo",
          fr: "ID du système externe",
          ja: "外部システムID",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.cost_center",
        values: {
          en: "Cost Center",
          de: "Kostenstelle",
          pl: "Centrum kosztów",
          es: "Centro de costos",
          fr: "Centre de coûts",
          ja: "コストセンター",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.cost_center_placeholder",
        values: {
          en: "Cost center code",
          de: "Kostenstellennummer",
          pl: "Kod centrum kosztów",
          es: "Código de centro de costos",
          fr: "Code du centre de coûts",
          ja: "コストセンターコード",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.purchase_order_required",
        values: {
          en: "Purchase Order Required",
          de: "Bestellung erforderlich",
          pl: "Wymagane zamówienie zakupu",
          es: "Orden de compra requerida",
          fr: "Bon de commande requis",
          ja: "発注書が必要",
        }
      },

      // Billing Contact
      {
        key: "ui.crm.organization_form.b2b.billing_contact",
        values: {
          en: "Billing Contact Person",
          de: "Abrechnungskontakt",
          pl: "Osoba kontaktowa ds. rozliczeń",
          es: "Persona de contacto de facturación",
          fr: "Personne de contact facturation",
          ja: "請求担当者",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.billing_contact_name",
        values: {
          en: "Contact Name",
          de: "Kontaktname",
          pl: "Nazwa kontaktu",
          es: "Nombre de contacto",
          fr: "Nom du contact",
          ja: "連絡先名",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.billing_contact_name_placeholder",
        values: {
          en: "Full name",
          de: "Vollständiger Name",
          pl: "Pełna nazwa",
          es: "Nombre completo",
          fr: "Nom complet",
          ja: "フルネーム",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.billing_contact_email",
        values: {
          en: "Contact Email",
          de: "Kontakt-E-Mail",
          pl: "E-mail kontaktowy",
          es: "Correo de contacto",
          fr: "E-mail de contact",
          ja: "連絡先メール",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.billing_contact_email_placeholder",
        values: {
          en: "billing@company.com",
          de: "abrechnung@firma.de",
          pl: "rozliczenia@firma.pl",
          es: "facturacion@empresa.com",
          fr: "facturation@entreprise.fr",
          ja: "billing@company.jp",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.billing_contact_phone",
        values: {
          en: "Contact Phone",
          de: "Kontakttelefon",
          pl: "Telefon kontaktowy",
          es: "Teléfono de contacto",
          fr: "Téléphone de contact",
          ja: "連絡先電話",
        }
      },
      {
        key: "ui.crm.organization_form.b2b.billing_contact_phone_placeholder",
        values: {
          en: "+1 234 567 8900",
          de: "+49 123 456 7890",
          pl: "+48 123 456 789",
          es: "+34 123 456 789",
          fr: "+33 1 23 45 67 89",
          ja: "+81 12 3456 7890",
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
            "organization-form"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} organization form translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
