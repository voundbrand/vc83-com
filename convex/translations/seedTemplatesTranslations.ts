/**
 * SEED TEMPLATES WINDOW TRANSLATIONS
 *
 * Seeds translations for:
 * - Templates Window UI
 * - Template Categories
 * - Template Card
 * - Template Preview Modal
 *
 * Run: npx convex run translations/seedTemplatesTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Templates Window translations...");

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
      // === TEMPLATES WINDOW - HEADER ===
      {
        key: "ui.templates.header.title",
        values: {
          en: "Templates Library",
          de: "Vorlagenbibliothek",
          pl: "Biblioteka szablonów",
          es: "Biblioteca de plantillas",
          fr: "Bibliothèque de modèles",
          ja: "テンプレートライブラリ",
        }
      },
      {
        key: "ui.templates.header.subtitle",
        values: {
          en: "Browse and preview templates available to your organization",
          de: "Durchsuchen und Vorschau der für Ihre Organisation verfügbaren Vorlagen",
          pl: "Przeglądaj i podejrzyj szablony dostępne dla Twojej organizacji",
          es: "Explorar y previsualizar plantillas disponibles para su organización",
          fr: "Parcourir et prévisualiser les modèles disponibles pour votre organisation",
          ja: "組織で利用可能なテンプレートを閲覧・プレビュー",
        }
      },
      {
        key: "ui.templates.header.templates_count",
        values: {
          en: "{count} templates",
          de: "{count} Vorlagen",
          pl: "{count} szablonów",
          es: "{count} plantillas",
          fr: "{count} modèles",
          ja: "{count}個のテンプレート",
        }
      },

      // === TEMPLATES WINDOW - SEARCH ===
      {
        key: "ui.templates.search.placeholder",
        values: {
          en: "Search templates...",
          de: "Vorlagen suchen...",
          pl: "Szukaj szablonów...",
          es: "Buscar plantillas...",
          fr: "Rechercher des modèles...",
          ja: "テンプレートを検索...",
        }
      },

      // === TEMPLATES WINDOW - LOADING & ERRORS ===
      {
        key: "ui.templates.loading",
        values: {
          en: "Loading templates...",
          de: "Vorlagen werden geladen...",
          pl: "Ładowanie szablonów...",
          es: "Cargando plantillas...",
          fr: "Chargement des modèles...",
          ja: "テンプレートを読み込んでいます...",
        }
      },
      {
        key: "ui.templates.error.login_required",
        values: {
          en: "Please log in to browse templates.",
          de: "Bitte melden Sie sich an, um Vorlagen zu durchsuchen.",
          pl: "Zaloguj się, aby przeglądać szablony.",
          es: "Por favor, inicie sesión para explorar plantillas.",
          fr: "Veuillez vous connecter pour parcourir les modèles.",
          ja: "テンプレートを閲覧するにはログインしてください。",
        }
      },
      {
        key: "ui.templates.error.no_org_title",
        values: {
          en: "No Organization Selected",
          de: "Keine Organisation ausgewählt",
          pl: "Nie wybrano organizacji",
          es: "No se ha seleccionado organización",
          fr: "Aucune organisation sélectionnée",
          ja: "組織が選択されていません",
        }
      },
      {
        key: "ui.templates.error.no_org_message",
        values: {
          en: "Please select an organization to view templates.",
          de: "Bitte wählen Sie eine Organisation aus, um Vorlagen anzuzeigen.",
          pl: "Wybierz organizację, aby wyświetlić szablony.",
          es: "Seleccione una organización para ver las plantillas.",
          fr: "Veuillez sélectionner une organisation pour afficher les modèles.",
          ja: "テンプレートを表示するには組織を選択してください。",
        }
      },
      {
        key: "ui.templates.error.no_templates_title",
        values: {
          en: "No Templates Found",
          de: "Keine Vorlagen gefunden",
          pl: "Nie znaleziono szablonów",
          es: "No se encontraron plantillas",
          fr: "Aucun modèle trouvé",
          ja: "テンプレートが見つかりません",
        }
      },
      {
        key: "ui.templates.error.no_search_results",
        values: {
          en: "No templates match \"{query}\"",
          de: "Keine Vorlagen entsprechen \"{query}\"",
          pl: "Żadne szablony nie pasują do \"{query}\"",
          es: "Ninguna plantilla coincide con \"{query}\"",
          fr: "Aucun modèle ne correspond à \"{query}\"",
          ja: "\"{query}\"に一致するテンプレートがありません",
        }
      },
      {
        key: "ui.templates.error.no_category_templates",
        values: {
          en: "No templates available in this category",
          de: "Keine Vorlagen in dieser Kategorie verfügbar",
          pl: "Brak dostępnych szablonów w tej kategorii",
          es: "No hay plantillas disponibles en esta categoría",
          fr: "Aucun modèle disponible dans cette catégorie",
          ja: "このカテゴリーには利用可能なテンプレートがありません",
        }
      },

      // === TEMPLATE CATEGORIES ===
      {
        key: "ui.templates.categories.title",
        values: {
          en: "Categories",
          de: "Kategorien",
          pl: "Kategorie",
          es: "Categorías",
          fr: "Catégories",
          ja: "カテゴリー",
        }
      },
      {
        key: "ui.templates.categories.all",
        values: {
          en: "All Templates",
          de: "Alle Vorlagen",
          pl: "Wszystkie szablony",
          es: "Todas las plantillas",
          fr: "Tous les modèles",
          ja: "すべてのテンプレート",
        }
      },
      {
        key: "ui.templates.categories.email",
        values: {
          en: "Email Templates",
          de: "E-Mail-Vorlagen",
          pl: "Szablony e-mail",
          es: "Plantillas de correo",
          fr: "Modèles d'e-mail",
          ja: "メールテンプレート",
        }
      },
      {
        key: "ui.templates.categories.pdf_ticket",
        values: {
          en: "PDF Tickets",
          de: "PDF-Tickets",
          pl: "Bilety PDF",
          es: "Entradas PDF",
          fr: "Billets PDF",
          ja: "PDFチケット",
        }
      },
      {
        key: "ui.templates.categories.pdf_invoice",
        values: {
          en: "PDF Invoices",
          de: "PDF-Rechnungen",
          pl: "Faktury PDF",
          es: "Facturas PDF",
          fr: "Factures PDF",
          ja: "PDF請求書",
        }
      },
      {
        key: "ui.templates.categories.web",
        values: {
          en: "Web Publishing",
          de: "Web-Publishing",
          pl: "Publikowanie stron",
          es: "Publicación web",
          fr: "Publication web",
          ja: "ウェブパブリッシング",
        }
      },
      {
        key: "ui.templates.categories.form",
        values: {
          en: "Form Templates",
          de: "Formularvorlagen",
          pl: "Szablony formularzy",
          es: "Plantillas de formularios",
          fr: "Modèles de formulaires",
          ja: "フォームテンプレート",
        }
      },
      {
        key: "ui.templates.categories.checkout",
        values: {
          en: "Checkout Templates",
          de: "Kassen-Vorlagen",
          pl: "Szablony kasy",
          es: "Plantillas de caja",
          fr: "Modèles de caisse",
          ja: "チェックアウトテンプレート",
        }
      },

      // === TEMPLATE CARD ===
      {
        key: "ui.templates.card.no_preview",
        values: {
          en: "No Preview",
          de: "Keine Vorschau",
          pl: "Brak podglądu",
          es: "Sin vista previa",
          fr: "Aucun aperçu",
          ja: "プレビューなし",
        }
      },
      {
        key: "ui.templates.card.author",
        values: {
          en: "by {author}",
          de: "von {author}",
          pl: "autor: {author}",
          es: "por {author}",
          fr: "par {author}",
          ja: "作者: {author}",
        }
      },
      {
        key: "ui.templates.card.version",
        values: {
          en: "v{version}",
          de: "v{version}",
          pl: "v{version}",
          es: "v{version}",
          fr: "v{version}",
          ja: "v{version}",
        }
      },
      {
        key: "ui.templates.card.button.preview",
        values: {
          en: "Preview",
          de: "Vorschau",
          pl: "Podgląd",
          es: "Vista previa",
          fr: "Aperçu",
          ja: "プレビュー",
        }
      },
      {
        key: "ui.templates.card.button.select",
        values: {
          en: "Select",
          de: "Auswählen",
          pl: "Wybierz",
          es: "Seleccionar",
          fr: "Sélectionner",
          ja: "選択",
        }
      },

      // === TEMPLATE PREVIEW MODAL ===
      {
        key: "ui.templates.preview.title",
        values: {
          en: "Template Preview: {name}",
          de: "Vorlagenvorschau: {name}",
          pl: "Podgląd szablonu: {name}",
          es: "Vista previa de plantilla: {name}",
          fr: "Aperçu du modèle: {name}",
          ja: "テンプレートプレビュー: {name}",
        }
      },
      {
        key: "ui.templates.preview.view.desktop",
        values: {
          en: "Desktop",
          de: "Desktop",
          pl: "Pulpit",
          es: "Escritorio",
          fr: "Bureau",
          ja: "デスクトップ",
        }
      },
      {
        key: "ui.templates.preview.view.mobile",
        values: {
          en: "Mobile",
          de: "Mobil",
          pl: "Mobilny",
          es: "Móvil",
          fr: "Mobile",
          ja: "モバイル",
        }
      },
      {
        key: "ui.templates.preview.loading",
        values: {
          en: "Loading preview...",
          de: "Vorschau wird geladen...",
          pl: "Ładowanie podglądu...",
          es: "Cargando vista previa...",
          fr: "Chargement de l'aperçu...",
          ja: "プレビューを読み込んでいます...",
        }
      },
      {
        key: "ui.templates.preview.button.close",
        values: {
          en: "Close",
          de: "Schließen",
          pl: "Zamknij",
          es: "Cerrar",
          fr: "Fermer",
          ja: "閉じる",
        }
      },
      {
        key: "ui.templates.preview.button.select",
        values: {
          en: "Select This Template",
          de: "Diese Vorlage auswählen",
          pl: "Wybierz ten szablon",
          es: "Seleccionar esta plantilla",
          fr: "Sélectionner ce modèle",
          ja: "このテンプレートを選択",
        }
      },

      // === CATEGORY LABELS (for display in cards and elsewhere) ===
      {
        key: "ui.templates.category.ticket",
        values: {
          en: "Ticket",
          de: "Ticket",
          pl: "Bilet",
          es: "Entrada",
          fr: "Billet",
          ja: "チケット",
        }
      },
      {
        key: "ui.templates.category.invoice",
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
        key: "ui.templates.category.receipt",
        values: {
          en: "Receipt",
          de: "Quittung",
          pl: "Paragon",
          es: "Recibo",
          fr: "Reçu",
          ja: "レシート",
        }
      },
      {
        key: "ui.templates.category.certificate",
        values: {
          en: "Certificate",
          de: "Zertifikat",
          pl: "Certyfikat",
          es: "Certificado",
          fr: "Certificat",
          ja: "証明書",
        }
      },
      {
        key: "ui.templates.category.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo",
          fr: "E-mail",
          ja: "メール",
        }
      },
      {
        key: "ui.templates.category.web",
        values: {
          en: "Web",
          de: "Web",
          pl: "Web",
          es: "Web",
          fr: "Web",
          ja: "ウェブ",
        }
      },
      {
        key: "ui.templates.category.form",
        values: {
          en: "Form",
          de: "Formular",
          pl: "Formularz",
          es: "Formulario",
          fr: "Formulaire",
          ja: "フォーム",
        }
      },
      {
        key: "ui.templates.category.checkout",
        values: {
          en: "Checkout",
          de: "Kasse",
          pl: "Kasa",
          es: "Caja",
          fr: "Caisse",
          ja: "チェックアウト",
        }
      },
      {
        key: "ui.templates.category.events",
        values: {
          en: "Events",
          de: "Veranstaltungen",
          pl: "Wydarzenia",
          es: "Eventos",
          fr: "Événements",
          ja: "イベント",
        }
      },
      {
        key: "ui.templates.category.general",
        values: {
          en: "General",
          de: "Allgemein",
          pl: "Ogólne",
          es: "General",
          fr: "Général",
          ja: "一般",
        }
      },
      {
        key: "ui.templates.category.luxury",
        values: {
          en: "Luxury",
          de: "Luxus",
          pl: "Luksus",
          es: "Lujo",
          fr: "Luxe",
          ja: "ラグジュアリー",
        }
      },
      {
        key: "ui.templates.category.minimal",
        values: {
          en: "Minimal",
          de: "Minimal",
          pl: "Minimalistyczny",
          es: "Minimalista",
          fr: "Minimaliste",
          ja: "ミニマル",
        }
      },
      {
        key: "ui.templates.category.internal",
        values: {
          en: "Internal",
          de: "Intern",
          pl: "Wewnętrzny",
          es: "Interno",
          fr: "Interne",
          ja: "内部",
        }
      },

      // === TEMPLATE SETS (NEW!) ===
      {
        key: "ui.templates.categories.template_sets",
        values: {
          en: "Template Sets",
          de: "Vorlagensätze",
          pl: "Zestawy szablonów",
          es: "Conjuntos de plantillas",
          fr: "Ensembles de modèles",
          ja: "テンプレートセット",
        }
      },
      {
        key: "ui.templates.template_set.badge.default",
        values: {
          en: "Default",
          de: "Standard",
          pl: "Domyślny",
          es: "Predeterminado",
          fr: "Par défaut",
          ja: "デフォルト",
        }
      },
      {
        key: "ui.templates.template_set.label.ticket",
        values: {
          en: "Ticket",
          de: "Ticket",
          pl: "Bilet",
          es: "Entrada",
          fr: "Billet",
          ja: "チケット",
        }
      },
      {
        key: "ui.templates.template_set.label.invoice",
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
        key: "ui.templates.template_set.label.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo",
          fr: "E-mail",
          ja: "メール",
        }
      },
      {
        key: "ui.templates.template_set.label.not_set",
        values: {
          en: "Not set",
          de: "Nicht festgelegt",
          pl: "Nie ustawiono",
          es: "No establecido",
          fr: "Non défini",
          ja: "未設定",
        }
      },
      {
        key: "ui.templates.template_set.button.preview_all",
        values: {
          en: "Preview All",
          de: "Alle anzeigen",
          pl: "Podgląd wszystkich",
          es: "Ver todo",
          fr: "Tout prévisualiser",
          ja: "すべてプレビュー",
        }
      },
      {
        key: "ui.templates.template_set.button.use_set",
        values: {
          en: "Use This Set",
          de: "Dieses Set verwenden",
          pl: "Użyj tego zestawu",
          es: "Usar este conjunto",
          fr: "Utiliser cet ensemble",
          ja: "このセットを使用",
        }
      },
      {
        key: "ui.templates.template_set.preview.title",
        values: {
          en: "Template Set Preview",
          de: "Vorlagensatz-Vorschau",
          pl: "Podgląd zestawu szablonów",
          es: "Vista previa del conjunto",
          fr: "Aperçu de l'ensemble",
          ja: "テンプレートセットプレビュー",
        }
      },
      {
        key: "ui.templates.template_set.preview.ticket_tab",
        values: {
          en: "🎫 Ticket",
          de: "🎫 Ticket",
          pl: "🎫 Bilet",
          es: "🎫 Entrada",
          fr: "🎫 Billet",
          ja: "🎫 チケット",
        }
      },
      {
        key: "ui.templates.template_set.preview.invoice_tab",
        values: {
          en: "💰 Invoice",
          de: "💰 Rechnung",
          pl: "💰 Faktura",
          es: "💰 Factura",
          fr: "💰 Facture",
          ja: "💰 請求書",
        }
      },
      {
        key: "ui.templates.template_set.preview.email_tab",
        values: {
          en: "📧 Email",
          de: "📧 E-Mail",
          pl: "📧 E-mail",
          es: "📧 Correo",
          fr: "📧 E-mail",
          ja: "📧 メール",
        }
      },
      {
        key: "ui.templates.template_set.preview.ticket_title",
        values: {
          en: "🎫 Ticket Template Preview",
          de: "🎫 Ticket-Vorlage Vorschau",
          pl: "🎫 Podgląd szablonu biletu",
          es: "🎫 Vista previa de plantilla de entrada",
          fr: "🎫 Aperçu du modèle de billet",
          ja: "🎫 チケットテンプレートプレビュー",
        }
      },
      {
        key: "ui.templates.template_set.preview.invoice_title",
        values: {
          en: "💰 Invoice Template Preview",
          de: "💰 Rechnungs-Vorlage Vorschau",
          pl: "💰 Podgląd szablonu faktury",
          es: "💰 Vista previa de plantilla de factura",
          fr: "💰 Aperçu du modèle de facture",
          ja: "💰 請求書テンプレートプレビュー",
        }
      },
      {
        key: "ui.templates.template_set.preview.email_title",
        values: {
          en: "📧 Email Template Preview",
          de: "📧 E-Mail-Vorlage Vorschau",
          pl: "📧 Podgląd szablonu e-mail",
          es: "📧 Vista previa de plantilla de correo",
          fr: "📧 Aperçu du modèle d'e-mail",
          ja: "📧 メールテンプレートプレビュー",
        }
      },
      {
        key: "ui.templates.template_set.preview.no_ticket",
        values: {
          en: "No ticket template configured",
          de: "Keine Ticket-Vorlage konfiguriert",
          pl: "Nie skonfigurowano szablonu biletu",
          es: "No se configuró plantilla de entrada",
          fr: "Aucun modèle de billet configuré",
          ja: "チケットテンプレートが設定されていません",
        }
      },
      {
        key: "ui.templates.template_set.preview.no_invoice",
        values: {
          en: "No invoice template configured",
          de: "Keine Rechnungs-Vorlage konfiguriert",
          pl: "Nie skonfigurowano szablonu faktury",
          es: "No se configuró plantilla de factura",
          fr: "Aucun modèle de facture configuré",
          ja: "請求書テンプレートが設定されていません",
        }
      },
      {
        key: "ui.templates.template_set.preview.no_email",
        values: {
          en: "No email template configured",
          de: "Keine E-Mail-Vorlage konfiguriert",
          pl: "Nie skonfigurowano szablonu e-mail",
          es: "No se configuró plantilla de correo",
          fr: "Aucun modèle d'e-mail configuré",
          ja: "メールテンプレートが設定されていません",
        }
      },
      {
        key: "ui.templates.template_set.preview.placeholder",
        values: {
          en: "Template preview will be rendered here",
          de: "Vorlagenvorschau wird hier angezeigt",
          pl: "Podgląd szablonu zostanie wyświetlony tutaj",
          es: "La vista previa se mostrará aquí",
          fr: "L'aperçu sera affiché ici",
          ja: "テンプレートプレビューがここに表示されます",
        }
      },
      {
        key: "ui.templates.template_set.preview.button.use_set",
        values: {
          en: "Use This Template Set",
          de: "Diesen Vorlagensatz verwenden",
          pl: "Użyj tego zestawu szablonów",
          es: "Usar este conjunto de plantillas",
          fr: "Utiliser cet ensemble de modèles",
          ja: "このテンプレートセットを使用",
        }
      },
      {
        key: "ui.templates.template_set.error.no_sets_title",
        values: {
          en: "No Template Sets Available",
          de: "Keine Vorlagensätze verfügbar",
          pl: "Brak dostępnych zestawów szablonów",
          es: "No hay conjuntos disponibles",
          fr: "Aucun ensemble disponible",
          ja: "利用可能なテンプレートセットがありません",
        }
      },
      {
        key: "ui.templates.template_set.error.no_sets_message",
        values: {
          en: "No template sets have been configured for your organization.",
          de: "Für Ihre Organisation wurden keine Vorlagensätze konfiguriert.",
          pl: "Nie skonfigurowano zestawów szablonów dla Twojej organizacji.",
          es: "No se configuraron conjuntos para su organización.",
          fr: "Aucun ensemble n'a été configuré pour votre organisation.",
          ja: "組織に対してテンプレートセットが設定されていません。",
        }
      },
    ];

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

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
            "ui",
            "templates"
          );

          if (result.inserted) {
            insertedCount++;
          } else if (result.updated) {
            updatedCount++;
          }
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`✅ Templates Window translations:`);
    console.log(`   - Inserted: ${insertedCount} new translations`);
    console.log(`   - Updated: ${updatedCount} existing translations`);
    console.log(`   - Skipped: ${skippedCount} (no value provided)`);

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      totalKeys: translations.length
    };
  }
});
