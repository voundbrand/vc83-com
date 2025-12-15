/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 2: ORGANIZATION TAB
 *
 * Seeds translations for:
 * - Organization details form
 * - Contact information
 * - Legal & tax information
 * - Settings & preferences
 * - Plan & features
 * - Addresses
 *
 * Run: npx convex run translations/seedManage_02_Organization:seed
 */

import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 2: Organization Tab)...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found.");
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
      // === ORGANIZATION TAB - HEADER ===
      {
        key: "ui.manage.org.view_only",
        values: {
          en: "View Only",
          de: "Nur ansehen",
          pl: "Tylko do odczytu",
          es: "Solo lectura",
          fr: "Lecture seule",
          ja: "表示のみ",
        }
      },
      {
        key: "ui.manage.org.view_only_message",
        values: {
          en: "You don't have permission to modify organization settings.",
          de: "Du hast keine Berechtigung, Organisationseinstellungen zu ändern.",
          pl: "Nie masz uprawnień do modyfikowania ustawień organizacji.",
          es: "No tienes permiso para modificar la configuración de la organización.",
          fr: "Vous n'avez pas la permission de modifier les paramètres de l'organisation.",
          ja: "組織設定を変更する権限がありません。",
        }
      },
      {
        key: "ui.manage.org.details_title",
        values: {
          en: "Organization Details",
          de: "Organisationsdetails",
          pl: "Szczegóły organizacji",
          es: "Detalles de la organización",
          fr: "Détails de l'organisation",
          ja: "組織の詳細",
        }
      },
      {
        key: "ui.manage.org.edit_organization",
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
        key: "ui.manage.org.cancel",
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
        key: "ui.manage.org.saving",
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
        key: "ui.manage.org.save_all_changes",
        values: {
          en: "Save All Changes",
          de: "Alle Änderungen speichern",
          pl: "Zapisz wszystkie zmiany",
          es: "Guardar todos los cambios",
          fr: "Enregistrer toutes les modifications",
          ja: "すべての変更を保存",
        }
      },
      {
        key: "ui.manage.org.changes_saved_auto",
        values: {
          en: "Changes are saved automatically",
          de: "Änderungen werden automatisch gespeichert",
          pl: "Zmiany są zapisywane automatycznie",
          es: "Los cambios se guardan automáticamente",
          fr: "Les modifications sont enregistrées automatiquement",
          ja: "変更は自動的に保存されます",
        }
      },

      // === BASIC INFORMATION ===
      {
        key: "ui.manage.org.section.basic_info",
        values: {
          en: "Basic Information",
          de: "Grundlegende Informationen",
          pl: "Podstawowe informacje",
          es: "Información básica",
          fr: "Informations de base",
          ja: "基本情報",
        }
      },
      {
        key: "ui.manage.org.organization_name",
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
        key: "ui.manage.org.business_name",
        values: {
          en: "Business Name",
          de: "Firmenname",
          pl: "Nazwa firmy",
          es: "Nombre comercial",
          fr: "Nom commercial",
          ja: "ビジネス名",
        }
      },
      {
        key: "ui.manage.org.slug",
        values: {
          en: "Slug",
          de: "Slug",
          pl: "Slug",
          es: "Slug",
          fr: "Slug",
          ja: "スラッグ",
        }
      },
      {
        key: "ui.manage.org.industry",
        values: {
          en: "Industry",
          de: "Branche",
          pl: "Branża",
          es: "Industria",
          fr: "Secteur",
          ja: "業界",
        }
      },
      {
        key: "ui.manage.org.industry_placeholder",
        values: {
          en: "e.g., Technology, Finance, Healthcare",
          de: "z.B. Technologie, Finanzen, Gesundheitswesen",
          pl: "np. Technologia, Finanse, Opieka zdrowotna",
          es: "ej., Tecnología, Finanzas, Salud",
          fr: "par ex., Technologie, Finance, Santé",
          ja: "例：テクノロジー、金融、医療",
        }
      },
      {
        key: "ui.manage.org.founded_year",
        values: {
          en: "Founded Year",
          de: "Gründungsjahr",
          pl: "Rok założenia",
          es: "Año de fundación",
          fr: "Année de fondation",
          ja: "設立年",
        }
      },
      {
        key: "ui.manage.org.employee_count",
        values: {
          en: "Employee Count",
          de: "Mitarbeiterzahl",
          pl: "Liczba pracowników",
          es: "Número de empleados",
          fr: "Nombre d'employés",
          ja: "従業員数",
        }
      },
      {
        key: "ui.manage.org.employee_count_select",
        values: {
          en: "Select range",
          de: "Bereich auswählen",
          pl: "Wybierz zakres",
          es: "Seleccionar rango",
          fr: "Sélectionner la plage",
          ja: "範囲を選択",
        }
      },
      {
        key: "ui.manage.org.bio",
        values: {
          en: "About / Bio",
          de: "Über uns / Bio",
          pl: "O nas / Bio",
          es: "Acerca de / Biografía",
          fr: "À propos / Bio",
          ja: "について / 略歴",
        }
      },
      {
        key: "ui.manage.org.bio_placeholder",
        values: {
          en: "Tell us about your organization...",
          de: "Erzähle uns von deiner Organisation...",
          pl: "Opowiedz nam o swojej organizacji...",
          es: "Cuéntanos sobre tu organización...",
          fr: "Parlez-nous de votre organisation...",
          ja: "組織について教えてください...",
        }
      },

      // === CONTACT INFORMATION ===
      {
        key: "ui.manage.org.section.contact_info",
        values: {
          en: "Contact Information",
          de: "Kontaktinformationen",
          pl: "Informacje kontaktowe",
          es: "Información de contacto",
          fr: "Informations de contact",
          ja: "連絡先情報",
        }
      },
      {
        key: "ui.manage.org.primary_contact_email",
        values: {
          en: "Primary Contact Email",
          de: "Primäre Kontakt-E-Mail",
          pl: "Główny adres e-mail kontaktowy",
          es: "Correo electrónico de contacto principal",
          fr: "E-mail de contact principal",
          ja: "主要連絡先メール",
        }
      },
      {
        key: "ui.manage.org.billing_email",
        values: {
          en: "Billing Email",
          de: "Abrechnungs-E-Mail",
          pl: "E-mail rozliczeniowy",
          es: "Correo electrónico de facturación",
          fr: "E-mail de facturation",
          ja: "請求先メール",
        }
      },
      {
        key: "ui.manage.org.support_email",
        values: {
          en: "Support Email",
          de: "Support-E-Mail",
          pl: "E-mail wsparcia",
          es: "Correo electrónico de soporte",
          fr: "E-mail d'assistance",
          ja: "サポートメール",
        }
      },
      {
        key: "ui.manage.org.phone_number",
        values: {
          en: "Phone Number",
          de: "Telefonnummer",
          pl: "Numer telefonu",
          es: "Número de teléfono",
          fr: "Numéro de téléphone",
          ja: "電話番号",
        }
      },
      {
        key: "ui.manage.org.fax_number",
        values: {
          en: "Fax Number",
          de: "Faxnummer",
          pl: "Numer faksu",
          es: "Número de fax",
          fr: "Numéro de fax",
          ja: "FAX番号",
        }
      },
      {
        key: "ui.manage.org.website",
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
        key: "ui.manage.org.social_media",
        values: {
          en: "Social Media Links",
          de: "Social Media Links",
          pl: "Linki do mediów społecznościowych",
          es: "Enlaces de redes sociales",
          fr: "Liens de médias sociaux",
          ja: "ソーシャルメディアリンク",
        }
      },
      {
        key: "ui.manage.org.linkedin",
        values: {
          en: "LinkedIn",
          de: "LinkedIn",
          pl: "LinkedIn",
          es: "LinkedIn",
          fr: "LinkedIn",
          ja: "LinkedIn",
        }
      },
      {
        key: "ui.manage.org.twitter",
        values: {
          en: "Twitter / X",
          de: "Twitter / X",
          pl: "Twitter / X",
          es: "Twitter / X",
          fr: "Twitter / X",
          ja: "Twitter / X",
        }
      },
      {
        key: "ui.manage.org.facebook",
        values: {
          en: "Facebook",
          de: "Facebook",
          pl: "Facebook",
          es: "Facebook",
          fr: "Facebook",
          ja: "Facebook",
        }
      },
      {
        key: "ui.manage.org.instagram",
        values: {
          en: "Instagram",
          de: "Instagram",
          pl: "Instagram",
          es: "Instagram",
          fr: "Instagram",
          ja: "Instagram",
        }
      },

      // === LEGAL & TAX ===
      {
        key: "ui.manage.org.section.legal_tax",
        values: {
          en: "Legal & Tax Information",
          de: "Rechtliche und Steuerinformationen",
          pl: "Informacje prawne i podatkowe",
          es: "Información legal y fiscal",
          fr: "Informations juridiques et fiscales",
          ja: "法務・税務情報",
        }
      },
      {
        key: "ui.manage.org.tax_id",
        values: {
          en: "Tax ID / EIN",
          de: "Steuernummer / EIN",
          pl: "NIP / EIN",
          es: "ID fiscal / EIN",
          fr: "ID fiscal / EIN",
          ja: "納税者番号 / EIN",
        }
      },
      {
        key: "ui.manage.org.vat_number",
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
        key: "ui.manage.org.vat_number_placeholder",
        values: {
          en: "e.g., EU123456789",
          de: "z.B. EU123456789",
          pl: "np. EU123456789",
          es: "ej., EU123456789",
          fr: "par ex., EU123456789",
          ja: "例：EU123456789",
        }
      },
      {
        key: "ui.manage.org.company_registration_number",
        values: {
          en: "Company Registration Number",
          de: "Handelsregisternummer",
          pl: "Numer rejestracyjny firmy",
          es: "Número de registro de la empresa",
          fr: "Numéro d'enregistrement de l'entreprise",
          ja: "会社登録番号",
        }
      },
      {
        key: "ui.manage.org.legal_entity_type",
        values: {
          en: "Legal Entity Type",
          de: "Rechtsform",
          pl: "Typ podmiotu prawnego",
          es: "Tipo de entidad legal",
          fr: "Type d'entité juridique",
          ja: "法人格の種類",
        }
      },
      {
        key: "ui.manage.org.legal_entity_type_select",
        values: {
          en: "Select entity type",
          de: "Rechtsform auswählen",
          pl: "Wybierz typ podmiotu",
          es: "Seleccionar tipo de entidad",
          fr: "Sélectionner le type d'entité",
          ja: "法人格を選択",
        }
      },

      // === SETTINGS & PREFERENCES ===
      {
        key: "ui.manage.org.section.settings_preferences",
        values: {
          en: "Settings & Preferences",
          de: "Einstellungen & Präferenzen",
          pl: "Ustawienia i preferencje",
          es: "Configuración y preferencias",
          fr: "Paramètres et préférences",
          ja: "設定と環境設定",
        }
      },
      {
        key: "ui.manage.org.branding",
        values: {
          en: "Branding",
          de: "Markenbildung",
          pl: "Branding",
          es: "Marca",
          fr: "Image de marque",
          ja: "ブランディング",
        }
      },
      {
        key: "ui.manage.org.primary_color",
        values: {
          en: "Primary Color",
          de: "Primärfarbe",
          pl: "Kolor główny",
          es: "Color principal",
          fr: "Couleur principale",
          ja: "プライマリカラー",
        }
      },
      {
        key: "ui.manage.org.logo_url",
        values: {
          en: "Logo URL",
          de: "Logo-URL",
          pl: "URL logo",
          es: "URL del logotipo",
          fr: "URL du logo",
          ja: "ロゴURL",
        }
      },
      {
        key: "ui.manage.org.locale_regional",
        values: {
          en: "Locale & Regional Settings",
          de: "Regionale Einstellungen",
          pl: "Ustawienia regionalne",
          es: "Configuración regional",
          fr: "Paramètres régionaux",
          ja: "ロケールと地域設定",
        }
      },
      {
        key: "ui.manage.org.language",
        values: {
          en: "Language",
          de: "Sprache",
          pl: "Język",
          es: "Idioma",
          fr: "Langue",
          ja: "言語",
        }
      },
      {
        key: "ui.manage.org.currency",
        values: {
          en: "Currency",
          de: "Währung",
          pl: "Waluta",
          es: "Moneda",
          fr: "Devise",
          ja: "通貨",
        }
      },
      {
        key: "ui.manage.org.timezone",
        values: {
          en: "Timezone",
          de: "Zeitzone",
          pl: "Strefa czasowa",
          es: "Zona horaria",
          fr: "Fuseau horaire",
          ja: "タイムゾーン",
        }
      },
      {
        key: "ui.manage.org.date_format",
        values: {
          en: "Date Format",
          de: "Datumsformat",
          pl: "Format daty",
          es: "Formato de fecha",
          fr: "Format de date",
          ja: "日付形式",
        }
      },
      {
        key: "ui.manage.org.invoicing_settings",
        values: {
          en: "Invoicing Settings",
          de: "Rechnungseinstellungen",
          pl: "Ustawienia fakturowania",
          es: "Configuración de facturación",
          fr: "Paramètres de facturation",
          ja: "請求書設定",
        }
      },
      {
        key: "ui.manage.org.invoice_prefix",
        values: {
          en: "Invoice Prefix",
          de: "Rechnungspräfix",
          pl: "Prefiks faktury",
          es: "Prefijo de factura",
          fr: "Préfixe de facture",
          ja: "請求書プレフィックス",
        }
      },
      {
        key: "ui.manage.org.next_invoice_number",
        values: {
          en: "Next Invoice Number",
          de: "Nächste Rechnungsnummer",
          pl: "Następny numer faktury",
          es: "Siguiente número de factura",
          fr: "Prochain numéro de facture",
          ja: "次の請求書番号",
        }
      },
      {
        key: "ui.manage.org.default_payment_terms",
        values: {
          en: "Default Payment Terms",
          de: "Standard-Zahlungsbedingungen",
          pl: "Domyślne warunki płatności",
          es: "Términos de pago predeterminados",
          fr: "Conditions de paiement par défaut",
          ja: "デフォルトの支払条件",
        }
      },

      // === PLAN & FEATURES ===
      {
        key: "ui.manage.org.section.plan_features",
        values: {
          en: "Plan & Features",
          de: "Plan & Funktionen",
          pl: "Plan i funkcje",
          es: "Plan y características",
          fr: "Plan et fonctionnalités",
          ja: "プランと機能",
        }
      },
      {
        key: "ui.manage.org.current_plan",
        values: {
          en: "Current Plan",
          de: "Aktueller Plan",
          pl: "Aktualny plan",
          es: "Plan actual",
          fr: "Plan actuel",
          ja: "現在のプラン",
        }
      },
      {
        key: "ui.manage.org.workspace_type",
        values: {
          en: "Workspace Type",
          de: "Arbeitsbereich-Typ",
          pl: "Typ obszaru roboczego",
          es: "Tipo de espacio de trabajo",
          fr: "Type d'espace de travail",
          ja: "ワークスペースタイプ",
        }
      },
      {
        key: "ui.manage.org.workspace_personal",
        values: {
          en: "Personal Workspace",
          de: "Persönlicher Arbeitsbereich",
          pl: "Osobisty obszar roboczy",
          es: "Espacio de trabajo personal",
          fr: "Espace de travail personnel",
          ja: "個人ワークスペース",
        }
      },
      {
        key: "ui.manage.org.workspace_team",
        values: {
          en: "Team Workspace",
          de: "Team-Arbeitsbereich",
          pl: "Zespołowy obszar roboczy",
          es: "Espacio de trabajo de equipo",
          fr: "Espace de travail d'équipe",
          ja: "チームワークスペース",
        }
      },
      {
        key: "ui.manage.org.enabled_features",
        values: {
          en: "Enabled Features",
          de: "Aktivierte Funktionen",
          pl: "Włączone funkcje",
          es: "Funciones habilitadas",
          fr: "Fonctionnalités activées",
          ja: "有効な機能",
        }
      },
      {
        key: "ui.manage.org.no_features",
        values: {
          en: "No additional features enabled",
          de: "Keine zusätzlichen Funktionen aktiviert",
          pl: "Brak dodatkowych funkcji",
          es: "No hay funciones adicionales habilitadas",
          fr: "Aucune fonctionnalité supplémentaire activée",
          ja: "追加機能は有効になっていません",
        }
      },

      // === ADDRESSES ===
      {
        key: "ui.manage.org.section.addresses",
        values: {
          en: "Addresses",
          de: "Adressen",
          pl: "Adresy",
          es: "Direcciones",
          fr: "Adresses",
          ja: "住所",
        }
      },
      {
        key: "ui.manage.org.add_address",
        values: {
          en: "Add Address",
          de: "Adresse hinzufügen",
          pl: "Dodaj adres",
          es: "Agregar dirección",
          fr: "Ajouter une adresse",
          ja: "住所を追加",
        }
      },
      {
        key: "ui.manage.org.no_addresses",
        values: {
          en: "No addresses added yet",
          de: "Noch keine Adressen hinzugefügt",
          pl: "Nie dodano jeszcze adresów",
          es: "Aún no se han agregado direcciones",
          fr: "Aucune adresse ajoutée pour le moment",
          ja: "まだ住所が追加されていません",
        }
      },
      {
        key: "ui.manage.org.add_first_address",
        values: {
          en: "Add Your First Address",
          de: "Füge deine erste Adresse hinzu",
          pl: "Dodaj swój pierwszy adres",
          es: "Agrega tu primera dirección",
          fr: "Ajoutez votre première adresse",
          ja: "最初の住所を追加",
        }
      },
      {
        key: "ui.manage.org.primary_address",
        values: {
          en: "Primary Address",
          de: "Hauptadresse",
          pl: "Adres główny",
          es: "Dirección principal",
          fr: "Adresse principale",
          ja: "主要住所",
        }
      },
      {
        key: "ui.manage.org.other_addresses",
        values: {
          en: "Other Addresses",
          de: "Weitere Adressen",
          pl: "Inne adresy",
          es: "Otras direcciones",
          fr: "Autres adresses",
          ja: "その他の住所",
        }
      },

      // === ADDRESS MODAL ===
      {
        key: "ui.manage.address.modal.add_title",
        values: {
          en: "Add New Address",
          de: "Neue Adresse hinzufügen",
          pl: "Dodaj nowy adres",
          es: "Agregar nueva dirección",
          fr: "Ajouter une nouvelle adresse",
          ja: "新しい住所を追加",
        }
      },
      {
        key: "ui.manage.address.modal.edit_title",
        values: {
          en: "Edit Address",
          de: "Adresse bearbeiten",
          pl: "Edytuj adres",
          es: "Editar dirección",
          fr: "Modifier l'adresse",
          ja: "住所を編集",
        }
      },

      // === ADDRESS CARD ===
      {
        key: "ui.manage.address.type.billing",
        values: {
          en: "Billing",
          de: "Abrechnung",
          pl: "Rozliczenia",
          es: "Facturación",
          fr: "Facturation",
          ja: "請求先",
        }
      },
      {
        key: "ui.manage.address.type.shipping",
        values: {
          en: "Shipping",
          de: "Versand",
          pl: "Wysyłka",
          es: "Envío",
          fr: "Expédition",
          ja: "配送先",
        }
      },
      {
        key: "ui.manage.address.type.mailing",
        values: {
          en: "Mailing",
          de: "Postversand",
          pl: "Korespondencja",
          es: "Correspondencia",
          fr: "Courrier",
          ja: "郵送先",
        }
      },
      {
        key: "ui.manage.address.type.physical",
        values: {
          en: "Physical Location",
          de: "Physischer Standort",
          pl: "Lokalizacja fizyczna",
          es: "Ubicación física",
          fr: "Emplacement physique",
          ja: "物理的な場所",
        }
      },
      {
        key: "ui.manage.address.type.other",
        values: {
          en: "Other",
          de: "Sonstige",
          pl: "Inne",
          es: "Otro",
          fr: "Autre",
          ja: "その他",
        }
      },
      {
        key: "ui.manage.address.type.address",
        values: {
          en: "Address",
          de: "Adresse",
          pl: "Adres",
          es: "Dirección",
          fr: "Adresse",
          ja: "住所",
        }
      },
      {
        key: "ui.manage.address.default_badge",
        values: {
          en: "DEFAULT",
          de: "STANDARD",
          pl: "DOMYŚLNY",
          es: "PREDETERMINADO",
          fr: "PAR DÉFAUT",
          ja: "デフォルト",
        }
      },
      {
        key: "ui.manage.address.region_label",
        values: {
          en: "Region:",
          de: "Region:",
          pl: "Region:",
          es: "Región:",
          fr: "Région:",
          ja: "地域:",
        }
      },
      {
        key: "ui.manage.address.set_primary",
        values: {
          en: "Set as primary address",
          de: "Als Hauptadresse festlegen",
          pl: "Ustaw jako adres główny",
          es: "Establecer como dirección principal",
          fr: "Définir comme adresse principale",
          ja: "主要住所として設定",
        }
      },
      {
        key: "ui.manage.address.edit",
        values: {
          en: "Edit address",
          de: "Adresse bearbeiten",
          pl: "Edytuj adres",
          es: "Editar dirección",
          fr: "Modifier l'adresse",
          ja: "住所を編集",
        }
      },
      {
        key: "ui.manage.address.delete",
        values: {
          en: "Delete address",
          de: "Adresse löschen",
          pl: "Usuń adres",
          es: "Eliminar dirección",
          fr: "Supprimer l'adresse",
          ja: "住所を削除",
        }
      },

      // === ADDRESS FORM ===
      {
        key: "ui.manage.address.form.type_label",
        values: {
          en: "Address Type",
          de: "Adresstyp",
          pl: "Typ adresu",
          es: "Tipo de dirección",
          fr: "Type d'adresse",
          ja: "住所タイプ",
        }
      },
      {
        key: "ui.manage.address.form.label_field",
        values: {
          en: "Label (Optional)",
          de: "Beschriftung (Optional)",
          pl: "Etykieta (Opcjonalne)",
          es: "Etiqueta (Opcional)",
          fr: "Libellé (Facultatif)",
          ja: "ラベル（任意）",
        }
      },
      {
        key: "ui.manage.address.form.label_placeholder",
        values: {
          en: "e.g., Headquarters, Warehouse 1",
          de: "z.B. Hauptsitz, Lager 1",
          pl: "np. Siedziba główna, Magazyn 1",
          es: "ej., Sede central, Almacén 1",
          fr: "par ex., Siège social, Entrepôt 1",
          ja: "例：本社、倉庫1",
        }
      },
      {
        key: "ui.manage.address.form.label_help",
        values: {
          en: "Custom name for this address",
          de: "Benutzerdefinierter Name für diese Adresse",
          pl: "Niestandardowa nazwa dla tego adresu",
          es: "Nombre personalizado para esta dirección",
          fr: "Nom personnalisé pour cette adresse",
          ja: "この住所のカスタム名",
        }
      },
      {
        key: "ui.manage.address.form.line1_label",
        values: {
          en: "Address Line 1",
          de: "Adresszeile 1",
          pl: "Linia adresu 1",
          es: "Línea de dirección 1",
          fr: "Ligne d'adresse 1",
          ja: "住所1行目",
        }
      },
      {
        key: "ui.manage.address.form.line1_placeholder",
        values: {
          en: "123 Main Street",
          de: "Hauptstraße 123",
          pl: "ul. Główna 123",
          es: "Calle Principal 123",
          fr: "123 Rue Principale",
          ja: "メインストリート123",
        }
      },
      {
        key: "ui.manage.address.form.line1_required",
        values: {
          en: "Address line 1 is required",
          de: "Adresszeile 1 ist erforderlich",
          pl: "Linia adresu 1 jest wymagana",
          es: "La línea de dirección 1 es obligatoria",
          fr: "La ligne d'adresse 1 est obligatoire",
          ja: "住所1行目は必須です",
        }
      },
      {
        key: "ui.manage.address.form.line2_label",
        values: {
          en: "Address Line 2 (Optional)",
          de: "Adresszeile 2 (Optional)",
          pl: "Linia adresu 2 (Opcjonalne)",
          es: "Línea de dirección 2 (Opcional)",
          fr: "Ligne d'adresse 2 (Facultatif)",
          ja: "住所2行目（任意）",
        }
      },
      {
        key: "ui.manage.address.form.line2_placeholder",
        values: {
          en: "Suite 100, Apartment 4B",
          de: "Suite 100, Wohnung 4B",
          pl: "Apartament 100, Mieszkanie 4B",
          es: "Suite 100, Apartamento 4B",
          fr: "Suite 100, Appartement 4B",
          ja: "スイート100、アパートメント4B",
        }
      },
      {
        key: "ui.manage.address.form.city_label",
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
        key: "ui.manage.address.form.city_placeholder",
        values: {
          en: "San Francisco",
          de: "Berlin",
          pl: "Warszawa",
          es: "Madrid",
          fr: "Paris",
          ja: "東京",
        }
      },
      {
        key: "ui.manage.address.form.city_required",
        values: {
          en: "City is required",
          de: "Stadt ist erforderlich",
          pl: "Miasto jest wymagane",
          es: "La ciudad es obligatoria",
          fr: "La ville est obligatoire",
          ja: "市区町村は必須です",
        }
      },
      {
        key: "ui.manage.address.form.state_label",
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
        key: "ui.manage.address.form.state_placeholder",
        values: {
          en: "CA",
          de: "BY",
          pl: "MZ",
          es: "MD",
          fr: "IDF",
          ja: "東京都",
        }
      },
      {
        key: "ui.manage.address.form.postal_label",
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
        key: "ui.manage.address.form.postal_placeholder",
        values: {
          en: "94102",
          de: "10115",
          pl: "00-001",
          es: "28001",
          fr: "75001",
          ja: "100-0001",
        }
      },
      {
        key: "ui.manage.address.form.postal_required",
        values: {
          en: "Postal code is required",
          de: "Postleitzahl ist erforderlich",
          pl: "Kod pocztowy jest wymagany",
          es: "El código postal es obligatorio",
          fr: "Le code postal est obligatoire",
          ja: "郵便番号は必須です",
        }
      },
      {
        key: "ui.manage.address.form.country_label",
        values: {
          en: "Country",
          de: "Land",
          pl: "Kraj",
          es: "País",
          fr: "Pays",
          ja: "国",
        }
      },
      {
        key: "ui.manage.address.form.country_placeholder",
        values: {
          en: "United States",
          de: "Deutschland",
          pl: "Polska",
          es: "España",
          fr: "France",
          ja: "日本",
        }
      },
      {
        key: "ui.manage.address.form.country_required",
        values: {
          en: "Country is required",
          de: "Land ist erforderlich",
          pl: "Kraj jest wymagany",
          es: "El país es obligatorio",
          fr: "Le pays est obligatoire",
          ja: "国は必須です",
        }
      },
      {
        key: "ui.manage.address.form.region_label",
        values: {
          en: "Region (Optional)",
          de: "Region (Optional)",
          pl: "Region (Opcjonalne)",
          es: "Región (Opcional)",
          fr: "Région (Facultatif)",
          ja: "地域（任意）",
        }
      },
      {
        key: "ui.manage.address.form.region_placeholder",
        values: {
          en: "e.g., Americas, EU, APAC",
          de: "z.B. Amerika, EU, APAC",
          pl: "np. Ameryki, UE, APAC",
          es: "ej., Américas, UE, APAC",
          fr: "par ex., Amériques, UE, APAC",
          ja: "例：アメリカ大陸、EU、APAC",
        }
      },
      {
        key: "ui.manage.address.form.region_help",
        values: {
          en: "Geographic region for reporting",
          de: "Geografische Region für Berichte",
          pl: "Region geograficzny do raportowania",
          es: "Región geográfica para informes",
          fr: "Région géographique pour les rapports",
          ja: "レポート用の地理的地域",
        }
      },
      {
        key: "ui.manage.address.form.default_checkbox",
        values: {
          en: "Set as default {type} address",
          de: "Als Standard-{type}-Adresse festlegen",
          pl: "Ustaw jako domyślny adres {type}",
          es: "Establecer como dirección de {type} predeterminada",
          fr: "Définir comme adresse {type} par défaut",
          ja: "デフォルトの{type}住所として設定",
        }
      },
      {
        key: "ui.manage.address.form.primary_checkbox",
        values: {
          en: "Set as primary organization address",
          de: "Als Hauptadresse der Organisation festlegen",
          pl: "Ustaw jako główny adres organizacji",
          es: "Establecer como dirección principal de la organización",
          fr: "Définir comme adresse principale de l'organisation",
          ja: "組織の主要住所として設定",
        }
      },
      {
        key: "ui.manage.address.form.saving",
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
        key: "ui.manage.address.form.update_button",
        values: {
          en: "Update Address",
          de: "Adresse aktualisieren",
          pl: "Zaktualizuj adres",
          es: "Actualizar dirección",
          fr: "Mettre à jour l'adresse",
          ja: "住所を更新",
        }
      },
      {
        key: "ui.manage.address.form.add_button",
        values: {
          en: "Add Address",
          de: "Adresse hinzufügen",
          pl: "Dodaj adres",
          es: "Agregar dirección",
          fr: "Ajouter l'adresse",
          ja: "住所を追加",
        }
      },
      {
        key: "ui.manage.address.form.cancel_button",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },
    ];

    // Process translations in smaller batches to avoid document read limits
    const BATCH_SIZE = 15; // Process 15 translation keys at a time (15 * 6 locales = 90 inserts)
    let count = 0;

    for (let i = 0; i < translations.length; i += BATCH_SIZE) {
      const batch = translations.slice(i, i + BATCH_SIZE);

      // Get all unique translation keys for this batch
      const batchKeys = batch.map(t => t.key);

      // Efficiently check which translations already exist
      const existingKeys = await getExistingTranslationKeys(
        ctx.db,
        systemOrg._id,
        batchKeys
      );

      // Insert only new translations for this batch
      for (const trans of batch) {
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
              "manage-window-organization"
            );

            if (inserted) {
              count++;
            }
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Organization Tab translations`);
    return { success: true, count };
  }
});

// Public export for CLI access
export default mutation(async (ctx): Promise<{ success: boolean; count: number }> => {
  return await ctx.runMutation(internal.translations.seedManage_02_Organization.seed, {});
});
