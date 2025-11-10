/**
 * SEED CHECKOUT WINDOW TRANSLATIONS
 *
 * Seeds translations for the Checkout Window management interface.
 * This includes the templates tab, checkouts list tab, and preview components.
 *
 * Components:
 * - src/components/window-content/checkout-window/checkout-templates-tab.tsx
 * - src/components/window-content/checkout-window/checkouts-list-tab.tsx
 * - src/components/window-content/checkout-window/checkout-preview.tsx
 *
 * Namespace: ui.checkout_window
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCheckoutWindow:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Window UI Translations...");

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
      // ============================================================
      // MAIN WINDOW - Headers & Tabs
      // ============================================================
      {
        key: "ui.checkout_window.main.title",
        values: {
          en: "Checkout Manager",
          de: "Checkout-Manager",
          pl: "Menedżer płatności",
          es: "Gestor de pagos",
          fr: "Gestionnaire de paiement",
          ja: "チェックアウトマネージャー",
        }
      },
      {
        key: "ui.checkout_window.main.description",
        values: {
          en: "Create and manage checkout pages for your products and events",
          de: "Erstellen und verwalten Sie Checkout-Seiten für Ihre Produkte und Veranstaltungen",
          pl: "Twórz i zarządzaj stronami płatności dla swoich produktów i wydarzeń",
          es: "Crea y administra páginas de pago para tus productos y eventos",
          fr: "Créez et gérez des pages de paiement pour vos produits et événements",
          ja: "製品やイベントのチェックアウトページを作成・管理",
        }
      },
      {
        key: "ui.checkout_window.main.tabs.checkouts",
        values: {
          en: "Checkouts",
          de: "Checkouts",
          pl: "Płatności",
          es: "Pagos",
          fr: "Paiements",
          ja: "チェックアウト",
        }
      },
      {
        key: "ui.checkout_window.main.tabs.create",
        values: {
          en: "Create",
          de: "Erstellen",
          pl: "Utwórz",
          es: "Crear",
          fr: "Créer",
          ja: "作成",
        }
      },
      {
        key: "ui.checkout_window.main.tabs.templates",
        values: {
          en: "Templates",
          de: "Vorlagen",
          pl: "Szablony",
          es: "Plantillas",
          fr: "Modèles",
          ja: "テンプレート",
        }
      },
      {
        key: "ui.checkout_window.main.tabs.settings",
        values: {
          en: "Settings",
          de: "Einstellungen",
          pl: "Ustawienia",
          es: "Configuración",
          fr: "Paramètres",
          ja: "設定",
        }
      },
      {
        key: "ui.checkout_window.main.tabs.analytics",
        values: {
          en: "Analytics",
          de: "Analysen",
          pl: "Analityka",
          es: "Analíticas",
          fr: "Analytique",
          ja: "分析",
        }
      },
      {
        key: "ui.checkout_window.main.coming_soon",
        values: {
          en: "Coming soon",
          de: "Demnächst",
          pl: "Wkrótce",
          es: "Próximamente",
          fr: "Bientôt disponible",
          ja: "近日公開",
        }
      },
      {
        key: "ui.checkout_window.main.settings_coming_soon",
        values: {
          en: "Settings Coming Soon",
          de: "Einstellungen demnächst verfügbar",
          pl: "Ustawienia wkrótce",
          es: "Configuración próximamente",
          fr: "Paramètres bientôt disponibles",
          ja: "設定は近日公開",
        }
      },
      {
        key: "ui.checkout_window.main.settings_description",
        values: {
          en: "Configure Stripe integration and checkout options",
          de: "Stripe-Integration und Checkout-Optionen konfigurieren",
          pl: "Skonfiguruj integrację Stripe i opcje płatności",
          es: "Configura la integración de Stripe y opciones de pago",
          fr: "Configurez l'intégration Stripe et les options de paiement",
          ja: "Stripe統合とチェックアウトオプションを設定",
        }
      },
      {
        key: "ui.checkout_window.main.analytics_coming_soon",
        values: {
          en: "Analytics Coming Soon",
          de: "Analysen demnächst verfügbar",
          pl: "Analityka wkrótce",
          es: "Analíticas próximamente",
          fr: "Analytique bientôt disponible",
          ja: "分析は近日公開",
        }
      },
      {
        key: "ui.checkout_window.main.analytics_description",
        values: {
          en: "Track sales, conversions, and revenue metrics",
          de: "Verfolgen Sie Verkäufe, Konversionen und Umsatzkennzahlen",
          pl: "Śledź sprzedaż, konwersje i metryki przychodów",
          es: "Rastrea ventas, conversiones y métricas de ingresos",
          fr: "Suivez les ventes, les conversions et les métriques de revenus",
          ja: "売上、コンバージョン、収益メトリクスを追跡",
        }
      },

      // ============================================================
      // TEMPLATES TAB - Headers & Titles
      // ============================================================
      {
        key: "ui.checkout_window.templates.title",
        values: {
          en: "Available Checkout Templates",
          de: "Verfügbare Checkout-Vorlagen",
          pl: "Dostępne szablony płatności",
          es: "Plantillas de pago disponibles",
          fr: "Modèles de paiement disponibles",
          ja: "利用可能なチェックアウトテンプレート",
        }
      },
      {
        key: "ui.checkout_window.templates.count",
        values: {
          en: "{count} template{plural} enabled for your organization",
          de: "{count} Vorlage{plural} für Ihre Organisation aktiviert",
          pl: "{count} szablon{plural} włączony dla Twojej organizacji",
          es: "{count} plantilla{plural} habilitada{plural} para tu organización",
          fr: "{count} modèle{plural} activé{plural} pour votre organisation",
          ja: "組織で{count}個のテンプレートが有効",
        }
      },
      {
        key: "ui.checkout_window.templates.complexity.beginner",
        values: {
          en: "beginner",
          de: "Anfänger",
          pl: "początkujący",
          es: "principiante",
          fr: "débutant",
          ja: "初級",
        }
      },
      {
        key: "ui.checkout_window.templates.complexity.intermediate",
        values: {
          en: "intermediate",
          de: "Fortgeschritten",
          pl: "średniozaawansowany",
          es: "intermedio",
          fr: "intermédiaire",
          ja: "中級",
        }
      },
      {
        key: "ui.checkout_window.templates.complexity.advanced",
        values: {
          en: "advanced",
          de: "Experte",
          pl: "zaawansowany",
          es: "avanzado",
          fr: "avancé",
          ja: "上級",
        }
      },

      // ============================================================
      // TEMPLATES TAB - Badges & Status
      // ============================================================
      {
        key: "ui.checkout_window.templates.badge.form_compatible",
        values: {
          en: "Form Compatible",
          de: "Formularkompatibel",
          pl: "Kompatybilny z formularzami",
          es: "Compatible con formularios",
          fr: "Compatible avec les formulaires",
          ja: "フォーム対応",
        }
      },
      {
        key: "ui.checkout_window.templates.badge.form_incompatible",
        values: {
          en: "Form Incompatible",
          de: "Nicht formularkompatibel",
          pl: "Niekompatybilny z formularzami",
          es: "Incompatible con formularios",
          fr: "Incompatible avec les formulaires",
          ja: "フォーム非対応",
        }
      },
      {
        key: "ui.checkout_window.templates.badge.coming_soon",
        values: {
          en: "Coming Soon",
          de: "Demnächst",
          pl: "Wkrótce",
          es: "Próximamente",
          fr: "Bientôt disponible",
          ja: "近日公開",
        }
      },
      {
        key: "ui.checkout_window.templates.tooltip.form_supports",
        values: {
          en: "This template supports form integration during checkout",
          de: "Diese Vorlage unterstützt Formularintegration während des Checkouts",
          pl: "Ten szablon obsługuje integrację formularzy podczas płatności",
          es: "Esta plantilla admite integración de formularios durante el pago",
          fr: "Ce modèle prend en charge l'intégration de formulaires lors du paiement",
          ja: "このテンプレートはチェックアウト時のフォーム統合をサポートします",
        }
      },
      {
        key: "ui.checkout_window.templates.tooltip.form_not_supports",
        values: {
          en: "This template does not support form integration",
          de: "Diese Vorlage unterstützt keine Formularintegration",
          pl: "Ten szablon nie obsługuje integracji formularzy",
          es: "Esta plantilla no admite integración de formularios",
          fr: "Ce modèle ne prend pas en charge l'intégration de formulaires",
          ja: "このテンプレートはフォーム統合をサポートしていません",
        }
      },

      // ============================================================
      // TEMPLATES TAB - Empty State
      // ============================================================
      {
        key: "ui.checkout_window.templates.empty.title",
        values: {
          en: "No Templates Available",
          de: "Keine Vorlagen verfügbar",
          pl: "Brak dostępnych szablonów",
          es: "No hay plantillas disponibles",
          fr: "Aucun modèle disponible",
          ja: "利用可能なテンプレートがありません",
        }
      },
      {
        key: "ui.checkout_window.templates.empty.description",
        values: {
          en: "Your organization doesn't have access to any checkout templates yet.",
          de: "Ihre Organisation hat noch keinen Zugriff auf Checkout-Vorlagen.",
          pl: "Twoja organizacja nie ma jeszcze dostępu do szablonów płatności.",
          es: "Tu organización aún no tiene acceso a plantillas de pago.",
          fr: "Votre organisation n'a pas encore accès aux modèles de paiement.",
          ja: "組織はまだチェックアウトテンプレートにアクセスできません。",
        }
      },
      {
        key: "ui.checkout_window.templates.empty.help",
        values: {
          en: "Contact your administrator to enable checkout templates for your organization.",
          de: "Kontaktieren Sie Ihren Administrator, um Checkout-Vorlagen für Ihre Organisation zu aktivieren.",
          pl: "Skontaktuj się z administratorem, aby włączyć szablony płatności dla swojej organizacji.",
          es: "Contacta a tu administrador para habilitar plantillas de pago para tu organización.",
          fr: "Contactez votre administrateur pour activer les modèles de paiement pour votre organisation.",
          ja: "管理者に連絡して、組織のチェックアウトテンプレートを有効にしてください。",
        }
      },

      // ============================================================
      // TEMPLATES TAB - Actions & Buttons
      // ============================================================
      {
        key: "ui.checkout_window.templates.actions.use_template",
        values: {
          en: "Use Template",
          de: "Vorlage verwenden",
          pl: "Użyj szablonu",
          es: "Usar plantilla",
          fr: "Utiliser le modèle",
          ja: "テンプレートを使用",
        }
      },
      {
        key: "ui.checkout_window.templates.actions.view_docs",
        values: {
          en: "View Documentation",
          de: "Dokumentation anzeigen",
          pl: "Zobacz dokumentację",
          es: "Ver documentación",
          fr: "Voir la documentation",
          ja: "ドキュメントを表示",
        }
      },
      {
        key: "ui.checkout_window.templates.sections.features",
        values: {
          en: "Features ({count})",
          de: "Funktionen ({count})",
          pl: "Funkcje ({count})",
          es: "Características ({count})",
          fr: "Fonctionnalités ({count})",
          ja: "機能 ({count})",
        }
      },
      {
        key: "ui.checkout_window.templates.sections.use_cases",
        values: {
          en: "Use Cases ({count})",
          de: "Anwendungsfälle ({count})",
          pl: "Przypadki użycia ({count})",
          es: "Casos de uso ({count})",
          fr: "Cas d'utilisation ({count})",
          ja: "ユースケース ({count})",
        }
      },

      // ============================================================
      // TEMPLATES TAB - Help Section
      // ============================================================
      {
        key: "ui.checkout_window.templates.help.title",
        values: {
          en: "How to Use Checkout Templates",
          de: "So verwenden Sie Checkout-Vorlagen",
          pl: "Jak używać szablonów płatności",
          es: "Cómo usar plantillas de pago",
          fr: "Comment utiliser les modèles de paiement",
          ja: "チェックアウトテンプレートの使用方法",
        }
      },
      {
        key: "ui.checkout_window.templates.help.step1",
        values: {
          en: "Choose a template that fits your use case",
          de: "Wählen Sie eine Vorlage, die zu Ihrem Anwendungsfall passt",
          pl: "Wybierz szablon pasujący do Twojego przypadku użycia",
          es: "Elige una plantilla que se ajuste a tu caso de uso",
          fr: "Choisissez un modèle qui correspond à votre cas d'utilisation",
          ja: "ユースケースに合ったテンプレートを選択",
        }
      },
      {
        key: "ui.checkout_window.templates.help.step2",
        values: {
          en: "Create products/tickets in the Products window",
          de: "Erstellen Sie Produkte/Tickets im Produktfenster",
          pl: "Utwórz produkty/bilety w oknie Produkty",
          es: "Crea productos/tickets en la ventana de Productos",
          fr: "Créez des produits/tickets dans la fenêtre Produits",
          ja: "製品ウィンドウで製品/チケットを作成",
        }
      },
      {
        key: "ui.checkout_window.templates.help.step3",
        values: {
          en: "Use Web Publishing to create a page and link products",
          de: "Verwenden Sie Web Publishing, um eine Seite zu erstellen und Produkte zu verknüpfen",
          pl: "Użyj Web Publishing, aby utworzyć stronę i połączyć produkty",
          es: "Usa Web Publishing para crear una página y vincular productos",
          fr: "Utilisez Web Publishing pour créer une page et lier des produits",
          ja: "Web Publishingを使用してページを作成し、製品をリンク",
        }
      },
      {
        key: "ui.checkout_window.templates.help.step4",
        values: {
          en: "The checkout template will be automatically applied to your page",
          de: "Die Checkout-Vorlage wird automatisch auf Ihre Seite angewendet",
          pl: "Szablon płatności zostanie automatycznie zastosowany do Twojej strony",
          es: "La plantilla de pago se aplicará automáticamente a tu página",
          fr: "Le modèle de paiement sera automatiquement appliqué à votre page",
          ja: "チェックアウトテンプレートがページに自動的に適用されます",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Headers & Titles
      // ============================================================
      {
        key: "ui.checkout_window.list.title",
        values: {
          en: "Your Checkouts",
          de: "Ihre Checkouts",
          pl: "Twoje płatności",
          es: "Tus pagos",
          fr: "Vos paiements",
          ja: "あなたのチェックアウト",
        }
      },
      {
        key: "ui.checkout_window.list.count",
        values: {
          en: "{count} checkout{plural} created",
          de: "{count} Checkout{plural} erstellt",
          pl: "{count} płatnoś{plural} utworzon{plural}",
          es: "{count} pago{plural} creado{plural}",
          fr: "{count} paiement{plural} créé{plural}",
          ja: "{count}個のチェックアウトが作成されました",
        }
      },
      {
        key: "ui.checkout_window.list.create_checkout",
        values: {
          en: "Create Checkout",
          de: "Checkout erstellen",
          pl: "Utwórz płatność",
          es: "Crear pago",
          fr: "Créer un paiement",
          ja: "チェックアウトを作成",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Table Headers
      // ============================================================
      {
        key: "ui.checkout_window.list.table.name",
        values: {
          en: "Name",
          de: "Name",
          pl: "Nazwa",
          es: "Nombre",
          fr: "Nom",
          ja: "名前",
        }
      },
      {
        key: "ui.checkout_window.list.table.template",
        values: {
          en: "Template",
          de: "Vorlage",
          pl: "Szablon",
          es: "Plantilla",
          fr: "Modèle",
          ja: "テンプレート",
        }
      },
      {
        key: "ui.checkout_window.list.table.status",
        values: {
          en: "Status",
          de: "Status",
          pl: "Status",
          es: "Estado",
          fr: "Statut",
          ja: "ステータス",
        }
      },
      {
        key: "ui.checkout_window.list.table.products",
        values: {
          en: "Products",
          de: "Produkte",
          pl: "Produkty",
          es: "Productos",
          fr: "Produits",
          ja: "製品",
        }
      },
      {
        key: "ui.checkout_window.list.table.updated",
        values: {
          en: "Updated",
          de: "Aktualisiert",
          pl: "Zaktualizowano",
          es: "Actualizado",
          fr: "Mis à jour",
          ja: "更新日",
        }
      },
      {
        key: "ui.checkout_window.list.table.actions",
        values: {
          en: "Actions",
          de: "Aktionen",
          pl: "Akcje",
          es: "Acciones",
          fr: "Actions",
          ja: "操作",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Status Values
      // ============================================================
      {
        key: "ui.checkout_window.list.status.published",
        values: {
          en: "published",
          de: "veröffentlicht",
          pl: "opublikowano",
          es: "publicado",
          fr: "publié",
          ja: "公開済み",
        }
      },
      {
        key: "ui.checkout_window.list.status.draft",
        values: {
          en: "draft",
          de: "Entwurf",
          pl: "szkic",
          es: "borrador",
          fr: "brouillon",
          ja: "下書き",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Empty State
      // ============================================================
      {
        key: "ui.checkout_window.list.empty.title",
        values: {
          en: "No Checkouts Yet",
          de: "Noch keine Checkouts",
          pl: "Brak płatności",
          es: "Aún no hay pagos",
          fr: "Aucun paiement pour le moment",
          ja: "チェックアウトがまだありません",
        }
      },
      {
        key: "ui.checkout_window.list.empty.description",
        values: {
          en: "Create your first checkout page to start accepting payments.",
          de: "Erstellen Sie Ihre erste Checkout-Seite, um Zahlungen zu akzeptieren.",
          pl: "Utwórz swoją pierwszą stronę płatności, aby zacząć przyjmować płatności.",
          es: "Crea tu primera página de pago para comenzar a aceptar pagos.",
          fr: "Créez votre première page de paiement pour commencer à accepter les paiements.",
          ja: "最初のチェックアウトページを作成して支払いの受け付けを開始してください。",
        }
      },
      {
        key: "ui.checkout_window.list.empty.action",
        values: {
          en: "Create Your First Checkout",
          de: "Erstellen Sie Ihren ersten Checkout",
          pl: "Utwórz swoją pierwszą płatność",
          es: "Crea tu primer pago",
          fr: "Créez votre premier paiement",
          ja: "最初のチェックアウトを作成",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Actions & Notifications
      // ============================================================
      {
        key: "ui.checkout_window.list.actions.publish",
        values: {
          en: "Publish",
          de: "Veröffentlichen",
          pl: "Opublikuj",
          es: "Publicar",
          fr: "Publier",
          ja: "公開",
        }
      },
      {
        key: "ui.checkout_window.list.actions.unpublish",
        values: {
          en: "Unpublish",
          de: "Veröffentlichung aufheben",
          pl: "Cofnij publikację",
          es: "Despublicar",
          fr: "Dépublier",
          ja: "非公開",
        }
      },
      {
        key: "ui.checkout_window.list.actions.preview",
        values: {
          en: "View live checkout",
          de: "Live-Checkout anzeigen",
          pl: "Zobacz płatność na żywo",
          es: "Ver pago en vivo",
          fr: "Voir le paiement en direct",
          ja: "ライブチェックアウトを表示",
        }
      },
      {
        key: "ui.checkout_window.list.actions.preview_editor",
        values: {
          en: "Preview in editor",
          de: "Vorschau im Editor",
          pl: "Podgląd w edytorze",
          es: "Vista previa en el editor",
          fr: "Aperçu dans l'éditeur",
          ja: "エディタでプレビュー",
        }
      },
      {
        key: "ui.checkout_window.list.actions.edit",
        values: {
          en: "Edit configuration",
          de: "Konfiguration bearbeiten",
          pl: "Edytuj konfigurację",
          es: "Editar configuración",
          fr: "Modifier la configuration",
          ja: "設定を編集",
        }
      },
      {
        key: "ui.checkout_window.list.actions.delete",
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
        key: "ui.checkout_window.list.notifications.published",
        values: {
          en: "Checkout is now live and accessible via its public URL.",
          de: "Checkout ist jetzt live und über seine öffentliche URL erreichbar.",
          pl: "Płatność jest teraz aktywna i dostępna przez swój publiczny URL.",
          es: "El pago ahora está activo y accesible a través de su URL pública.",
          fr: "Le paiement est maintenant en ligne et accessible via son URL publique.",
          ja: "チェックアウトが公開され、公開URLからアクセス可能になりました。",
        }
      },
      {
        key: "ui.checkout_window.list.notifications.unpublished",
        values: {
          en: "Checkout has been unpublished successfully.",
          de: "Checkout wurde erfolgreich unveröffentlicht.",
          pl: "Płatność została pomyślnie cofnięta.",
          es: "El pago se ha despublicado correctamente.",
          fr: "Le paiement a été dépublié avec succès.",
          ja: "チェックアウトが正常に非公開になりました。",
        }
      },
      {
        key: "ui.checkout_window.list.notifications.deleted",
        values: {
          en: '"{name}" has been deleted successfully.',
          de: '"{name}" wurde erfolgreich gelöscht.',
          pl: '"{name}" został pomyślnie usunięty.',
          es: '"{name}" se ha eliminado correctamente.',
          fr: '"{name}" a été supprimé avec succès.',
          ja: '"{name}" が正常に削除されました。',
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Help Section
      // ============================================================
      {
        key: "ui.checkout_window.list.help.title",
        values: {
          en: "Quick Actions",
          de: "Schnellaktionen",
          pl: "Szybkie akcje",
          es: "Acciones rápidas",
          fr: "Actions rapides",
          ja: "クイックアクション",
        }
      },
      {
        key: "ui.checkout_window.list.help.publish",
        values: {
          en: "Publish/Unpublish - Toggle checkout availability",
          de: "Veröffentlichen/Unveröffentlichen - Checkout-Verfügbarkeit umschalten",
          pl: "Publikuj/Cofnij - Przełącz dostępność płatności",
          es: "Publicar/Despublicar - Alternar disponibilidad de pago",
          fr: "Publier/Dépublier - Basculer la disponibilité du paiement",
          ja: "公開/非公開 - チェックアウトの可用性を切り替え",
        }
      },
      {
        key: "ui.checkout_window.list.help.preview",
        values: {
          en: "Preview - View published checkout in new tab",
          de: "Vorschau - Veröffentlichten Checkout in neuem Tab anzeigen",
          pl: "Podgląd - Zobacz opublikowaną płatność w nowej karcie",
          es: "Vista previa - Ver pago publicado en nueva pestaña",
          fr: "Aperçu - Voir le paiement publié dans un nouvel onglet",
          ja: "プレビュー - 新しいタブで公開されたチェックアウトを表示",
        }
      },
      {
        key: "ui.checkout_window.list.help.edit",
        values: {
          en: "Edit - Modify checkout configuration",
          de: "Bearbeiten - Checkout-Konfiguration ändern",
          pl: "Edytuj - Zmodyfikuj konfigurację płatności",
          es: "Editar - Modificar configuración de pago",
          fr: "Modifier - Modifier la configuration du paiement",
          ja: "編集 - チェックアウト設定を変更",
        }
      },
      {
        key: "ui.checkout_window.list.help.delete",
        values: {
          en: "Delete - Remove checkout (with confirmation)",
          de: "Löschen - Checkout entfernen (mit Bestätigung)",
          pl: "Usuń - Usuń płatność (z potwierdzeniem)",
          es: "Eliminar - Eliminar pago (con confirmación)",
          fr: "Supprimer - Supprimer le paiement (avec confirmation)",
          ja: "削除 - チェックアウトを削除（確認あり）",
        }
      },

      // ============================================================
      // CHECKOUT PREVIEW - Messages
      // ============================================================
      {
        key: "ui.checkout_window.preview.template_not_found",
        values: {
          en: "Template Not Found",
          de: "Vorlage nicht gefunden",
          pl: "Nie znaleziono szablonu",
          es: "Plantilla no encontrada",
          fr: "Modèle introuvable",
          ja: "テンプレートが見つかりません",
        }
      },
      {
        key: "ui.checkout_window.preview.template_not_loaded",
        values: {
          en: 'The checkout template "{code}" could not be loaded.',
          de: 'Die Checkout-Vorlage "{code}" konnte nicht geladen werden.',
          pl: 'Nie można załadować szablonu płatności "{code}".',
          es: 'No se pudo cargar la plantilla de pago "{code}".',
          fr: 'Le modèle de paiement "{code}" n\'a pas pu être chargé.',
          ja: 'チェックアウトテンプレート "{code}" を読み込めませんでした。',
        }
      },
      {
        key: "ui.checkout_window.preview.no_products_title",
        values: {
          en: "No Products Linked",
          de: "Keine Produkte verknüpft",
          pl: "Brak powiązanych produktów",
          es: "No hay productos vinculados",
          fr: "Aucun produit lié",
          ja: "リンクされた製品がありません",
        }
      },
      {
        key: "ui.checkout_window.preview.no_products_description",
        values: {
          en: "Link products from the configuration panel to see them in the checkout preview.",
          de: "Verknüpfen Sie Produkte aus dem Konfigurationspanel, um sie in der Checkout-Vorschau zu sehen.",
          pl: "Połącz produkty z panelu konfiguracji, aby zobaczyć je w podglądzie płatności.",
          es: "Vincula productos desde el panel de configuración para verlos en la vista previa del pago.",
          fr: "Liez des produits depuis le panneau de configuration pour les voir dans l'aperçu du paiement.",
          ja: "設定パネルから製品をリンクして、チェックアウトプレビューで表示します。",
        }
      },

      // ============================================================
      // COMMON - Error Messages
      // ============================================================
      {
        key: "ui.checkout_window.error.auth_required_title",
        values: {
          en: "Authentication Required",
          de: "Authentifizierung erforderlich",
          pl: "Wymagana autoryzacja",
          es: "Autenticación requerida",
          fr: "Authentification requise",
          ja: "認証が必要です",
        }
      },
      {
        key: "ui.checkout_window.error.auth_required_templates",
        values: {
          en: "Please log in to view available checkout templates.",
          de: "Bitte melden Sie sich an, um verfügbare Checkout-Vorlagen anzuzeigen.",
          pl: "Zaloguj się, aby zobaczyć dostępne szablony płatności.",
          es: "Por favor, inicia sesión para ver las plantillas de pago disponibles.",
          fr: "Veuillez vous connecter pour voir les modèles de paiement disponibles.",
          ja: "利用可能なチェックアウトテンプレートを表示するにはログインしてください。",
        }
      },
      {
        key: "ui.checkout_window.error.auth_required_list",
        values: {
          en: "Please log in to view your checkouts.",
          de: "Bitte melden Sie sich an, um Ihre Checkouts anzuzeigen.",
          pl: "Zaloguj się, aby zobaczyć swoje płatności.",
          es: "Por favor, inicia sesión para ver tus pagos.",
          fr: "Veuillez vous connecter pour voir vos paiements.",
          ja: "チェックアウトを表示するにはログインしてください。",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Headers & Titles
      // ============================================================
      {
        key: "ui.checkout_window.create.error.auth_required",
        values: {
          en: "Please log in to create checkouts.",
          de: "Bitte melden Sie sich an, um Checkouts zu erstellen.",
          pl: "Zaloguj się, aby tworzyć płatności.",
          es: "Por favor, inicia sesión para crear pagos.",
          fr: "Veuillez vous connecter pour créer des paiements.",
          ja: "チェックアウトを作成するにはログインしてください。",
        }
      },
      {
        key: "ui.checkout_window.create.select_template_title",
        values: {
          en: "Select Checkout Template",
          de: "Checkout-Vorlage auswählen",
          pl: "Wybierz szablon płatności",
          es: "Seleccionar plantilla de pago",
          fr: "Sélectionner un modèle de paiement",
          ja: "チェックアウトテンプレートを選択",
        }
      },
      {
        key: "ui.checkout_window.create.select_template_description",
        values: {
          en: "Choose a template to get started",
          de: "Wählen Sie eine Vorlage, um zu beginnen",
          pl: "Wybierz szablon, aby rozpocząć",
          es: "Elige una plantilla para comenzar",
          fr: "Choisissez un modèle pour commencer",
          ja: "テンプレートを選択して開始",
        }
      },
      {
        key: "ui.checkout_window.create.edit_title",
        values: {
          en: "Edit Checkout",
          de: "Checkout bearbeiten",
          pl: "Edytuj płatność",
          es: "Editar pago",
          fr: "Modifier le paiement",
          ja: "チェックアウトを編集",
        }
      },
      {
        key: "ui.checkout_window.create.configure_title",
        values: {
          en: "Configure Checkout",
          de: "Checkout konfigurieren",
          pl: "Konfiguruj płatność",
          es: "Configurar pago",
          fr: "Configurer le paiement",
          ja: "チェックアウトを設定",
        }
      },
      {
        key: "ui.checkout_window.create.template_label",
        values: {
          en: "Template: {template}",
          de: "Vorlage: {template}",
          pl: "Szablon: {template}",
          es: "Plantilla: {template}",
          fr: "Modèle: {template}",
          ja: "テンプレート: {template}",
        }
      },
      {
        key: "ui.checkout_window.create.cancel_button",
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
        key: "ui.checkout_window.create.save_button",
        values: {
          en: "Save Changes",
          de: "Änderungen speichern",
          pl: "Zapisz zmiany",
          es: "Guardar cambios",
          fr: "Enregistrer les modifications",
          ja: "変更を保存",
        }
      },
      {
        key: "ui.checkout_window.create.create_button",
        values: {
          en: "Create Checkout",
          de: "Checkout erstellen",
          pl: "Utwórz płatność",
          es: "Crear pago",
          fr: "Créer un paiement",
          ja: "チェックアウトを作成",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Configuration Form
      // ============================================================
      {
        key: "ui.checkout_window.create.configuration_title",
        values: {
          en: "Configuration",
          de: "Konfiguration",
          pl: "Konfiguracja",
          es: "Configuración",
          fr: "Configuration",
          ja: "設定",
        }
      },
      {
        key: "ui.checkout_window.create.name_label",
        values: {
          en: "Checkout Name",
          de: "Checkout-Name",
          pl: "Nazwa płatności",
          es: "Nombre del pago",
          fr: "Nom du paiement",
          ja: "チェックアウト名",
        }
      },
      {
        key: "ui.checkout_window.create.description_label",
        values: {
          en: "Description (Optional)",
          de: "Beschreibung (Optional)",
          pl: "Opis (opcjonalny)",
          es: "Descripción (Opcional)",
          fr: "Description (Facultatif)",
          ja: "説明（任意）",
        }
      },
      {
        key: "ui.checkout_window.create.description_placeholder",
        values: {
          en: "Internal description for your team...",
          de: "Interne Beschreibung für Ihr Team...",
          pl: "Wewnętrzny opis dla Twojego zespołu...",
          es: "Descripción interna para tu equipo...",
          fr: "Description interne pour votre équipe...",
          ja: "チーム用の内部説明...",
        }
      },
      {
        key: "ui.checkout_window.create.slug_label",
        values: {
          en: "Public URL Slug",
          de: "Öffentlicher URL-Slug",
          pl: "Publiczny slug URL",
          es: "Slug de URL pública",
          fr: "Slug d'URL publique",
          ja: "公開URLスラッグ",
        }
      },
      {
        key: "ui.checkout_window.create.language_label",
        values: {
          en: "🌐 Default Language",
          de: "🌐 Standardsprache",
          pl: "🌐 Domyślny język",
          es: "🌐 Idioma predeterminado",
          fr: "🌐 Langue par défaut",
          ja: "🌐 デフォルト言語",
        }
      },
      {
        key: "ui.checkout_window.create.language_description",
        values: {
          en: "Set the default language for this checkout. Customers will see the checkout in this language initially.",
          de: "Legen Sie die Standardsprache für diesen Checkout fest. Kunden sehen den Checkout zunächst in dieser Sprache.",
          pl: "Ustaw domyślny język dla tej płatności. Klienci zobaczą płatność początkowo w tym języku.",
          es: "Establece el idioma predeterminado para este pago. Los clientes verán el pago inicialmente en este idioma.",
          fr: "Définissez la langue par défaut pour ce paiement. Les clients verront le paiement dans cette langue initialement.",
          ja: "このチェックアウトのデフォルト言語を設定します。顧客は最初にこの言語でチェックアウトを表示します。",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Payment Providers
      // ============================================================
      {
        key: "ui.checkout_window.create.payment_providers_label",
        values: {
          en: "Payment Providers",
          de: "Zahlungsanbieter",
          pl: "Dostawcy płatności",
          es: "Proveedores de pago",
          fr: "Fournisseurs de paiement",
          ja: "支払いプロバイダー",
        }
      },
      {
        key: "ui.checkout_window.create.payment_providers_description",
        values: {
          en: "Select payment providers to offer during checkout. Customers will choose their preferred method.",
          de: "Wählen Sie Zahlungsanbieter aus, die beim Checkout angeboten werden. Kunden wählen ihre bevorzugte Methode.",
          pl: "Wybierz dostawców płatności oferowanych podczas płatności. Klienci wybiorą preferowaną metodę.",
          es: "Selecciona proveedores de pago para ofrecer durante el pago. Los clientes elegirán su método preferido.",
          fr: "Sélectionnez les fournisseurs de paiement à proposer lors du paiement. Les clients choisiront leur méthode préférée.",
          ja: "チェックアウト時に提供する支払いプロバイダーを選択します。顧客は希望する方法を選択します。",
        }
      },
      {
        key: "ui.checkout_window.create.no_payment_providers_title",
        values: {
          en: "No Payment Providers Connected",
          de: "Keine Zahlungsanbieter verbunden",
          pl: "Brak podłączonych dostawców płatności",
          es: "No hay proveedores de pago conectados",
          fr: "Aucun fournisseur de paiement connecté",
          ja: "支払いプロバイダーが接続されていません",
        }
      },
      {
        key: "ui.checkout_window.create.no_payment_providers_description",
        values: {
          en: "You need to connect a payment provider before creating checkouts.",
          de: "Sie müssen einen Zahlungsanbieter verbinden, bevor Sie Checkouts erstellen.",
          pl: "Musisz połączyć dostawcę płatności przed utworzeniem płatności.",
          es: "Necesitas conectar un proveedor de pago antes de crear pagos.",
          fr: "Vous devez connecter un fournisseur de paiement avant de créer des paiements.",
          ja: "チェックアウトを作成する前に支払いプロバイダーを接続する必要があります。",
        }
      },
      {
        key: "ui.checkout_window.create.no_payment_providers_help",
        values: {
          en: "Go to Payments → Stripe Connect to connect a payment provider.",
          de: "Gehen Sie zu Zahlungen → Stripe Connect, um einen Zahlungsanbieter zu verbinden.",
          pl: "Przejdź do Płatności → Stripe Connect, aby połączyć dostawcę płatności.",
          es: "Ve a Pagos → Stripe Connect para conectar un proveedor de pago.",
          fr: "Allez dans Paiements → Stripe Connect pour connecter un fournisseur de paiement.",
          ja: "支払い → Stripe Connectに移動して支払いプロバイダーを接続してください。",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Theme & Products
      // ============================================================
      {
        key: "ui.checkout_window.create.select_theme_label",
        values: {
          en: "Select Theme",
          de: "Thema auswählen",
          pl: "Wybierz motyw",
          es: "Seleccionar tema",
          fr: "Sélectionner un thème",
          ja: "テーマを選択",
        }
      },
      {
        key: "ui.checkout_window.create.linked_products_label",
        values: {
          en: "Linked Products",
          de: "Verknüpfte Produkte",
          pl: "Połączone produkty",
          es: "Productos vinculados",
          fr: "Produits liés",
          ja: "リンクされた製品",
        }
      },
      {
        key: "ui.checkout_window.create.linked_products_description",
        values: {
          en: "Select products to include in this checkout.",
          de: "Wählen Sie Produkte aus, die in diesen Checkout aufgenommen werden sollen.",
          pl: "Wybierz produkty do uwzględnienia w tej płatności.",
          es: "Selecciona productos para incluir en este pago.",
          fr: "Sélectionnez les produits à inclure dans ce paiement.",
          ja: "このチェックアウトに含める製品を選択します。",
        }
      },
      {
        key: "ui.checkout_window.create.template_settings_title",
        values: {
          en: "Template Settings",
          de: "Vorlageneinstellungen",
          pl: "Ustawienia szablonu",
          es: "Configuración de plantilla",
          fr: "Paramètres du modèle",
          ja: "テンプレート設定",
        }
      },
      {
        key: "ui.checkout_window.create.template_settings_description",
        values: {
          en: "Advanced settings for {template}",
          de: "Erweiterte Einstellungen für {template}",
          pl: "Zaawansowane ustawienia dla {template}",
          es: "Configuración avanzada para {template}",
          fr: "Paramètres avancés pour {template}",
          ja: "{template}の詳細設定",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Preview
      // ============================================================
      {
        key: "ui.checkout_window.create.preview_title",
        values: {
          en: "Live Preview",
          de: "Live-Vorschau",
          pl: "Podgląd na żywo",
          es: "Vista previa en vivo",
          fr: "Aperçu en direct",
          ja: "ライブプレビュー",
        }
      },
      {
        key: "ui.checkout_window.create.preview_no_template",
        values: {
          en: "No Template Selected",
          de: "Keine Vorlage ausgewählt",
          pl: "Nie wybrano szablonu",
          es: "No se seleccionó plantilla",
          fr: "Aucun modèle sélectionné",
          ja: "テンプレートが選択されていません",
        }
      },
      {
        key: "ui.checkout_window.create.preview_no_theme",
        values: {
          en: "No Theme Selected",
          de: "Kein Thema ausgewählt",
          pl: "Nie wybrano motywu",
          es: "No se seleccionó tema",
          fr: "Aucun thème sélectionné",
          ja: "テーマが選択されていません",
        }
      },
      {
        key: "ui.checkout_window.create.preview_loading",
        values: {
          en: "Preview Loading",
          de: "Vorschau lädt",
          pl: "Ładowanie podglądu",
          es: "Cargando vista previa",
          fr: "Chargement de l'aperçu",
          ja: "プレビューを読み込み中",
        }
      },
      {
        key: "ui.checkout_window.create.preview_no_template_description",
        values: {
          en: "Select a template to see a live preview of your checkout.",
          de: "Wählen Sie eine Vorlage aus, um eine Live-Vorschau Ihres Checkouts zu sehen.",
          pl: "Wybierz szablon, aby zobaczyć podgląd na żywo swojej płatności.",
          es: "Selecciona una plantilla para ver una vista previa en vivo de tu pago.",
          fr: "Sélectionnez un modèle pour voir un aperçu en direct de votre paiement.",
          ja: "テンプレートを選択してチェックアウトのライブプレビューを表示します。",
        }
      },
      {
        key: "ui.checkout_window.create.preview_no_theme_description",
        values: {
          en: "Select a theme to see a live preview with styling.",
          de: "Wählen Sie ein Thema aus, um eine Live-Vorschau mit Styling zu sehen.",
          pl: "Wybierz motyw, aby zobaczyć podgląd na żywo ze stylizacją.",
          es: "Selecciona un tema para ver una vista previa en vivo con estilo.",
          fr: "Sélectionnez un thème pour voir un aperçu en direct avec le style.",
          ja: "テーマを選択してスタイル付きのライブプレビューを表示します。",
        }
      },
      {
        key: "ui.checkout_window.create.preview_loading_description",
        values: {
          en: "Select products to preview the checkout.",
          de: "Wählen Sie Produkte aus, um den Checkout in der Vorschau anzuzeigen.",
          pl: "Wybierz produkty, aby wyświetlić podgląd płatności.",
          es: "Selecciona productos para previsualizar el pago.",
          fr: "Sélectionnez des produits pour prévisualiser le paiement.",
          ja: "製品を選択してチェックアウトをプレビューします。",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Notifications
      // ============================================================
      {
        key: "ui.checkout_window.create.notifications.created_title",
        values: {
          en: "Checkout Created",
          de: "Checkout erstellt",
          pl: "Płatność utworzona",
          es: "Pago creado",
          fr: "Paiement créé",
          ja: "チェックアウトが作成されました",
        }
      },
      {
        key: "ui.checkout_window.create.notifications.created_message",
        values: {
          en: "Your new checkout has been created successfully.",
          de: "Ihr neuer Checkout wurde erfolgreich erstellt.",
          pl: "Twoja nowa płatność została pomyślnie utworzona.",
          es: "Tu nuevo pago se ha creado correctamente.",
          fr: "Votre nouveau paiement a été créé avec succès.",
          ja: "新しいチェックアウトが正常に作成されました。",
        }
      },
      {
        key: "ui.checkout_window.create.notifications.updated_title",
        values: {
          en: "Checkout Updated",
          de: "Checkout aktualisiert",
          pl: "Płatność zaktualizowana",
          es: "Pago actualizado",
          fr: "Paiement mis à jour",
          ja: "チェックアウトが更新されました",
        }
      },
      {
        key: "ui.checkout_window.create.notifications.updated_message",
        values: {
          en: "Your changes have been saved successfully.",
          de: "Ihre Änderungen wurden erfolgreich gespeichert.",
          pl: "Twoje zmiany zostały pomyślnie zapisane.",
          es: "Tus cambios se han guardado correctamente.",
          fr: "Vos modifications ont été enregistrées avec succès.",
          ja: "変更が正常に保存されました。",
        }
      },
      {
        key: "ui.checkout_window.create.notifications.save_failed_title",
        values: {
          en: "Save Failed",
          de: "Speichern fehlgeschlagen",
          pl: "Zapisywanie nie powiodło się",
          es: "Error al guardar",
          fr: "Échec de l'enregistrement",
          ja: "保存に失敗しました",
        }
      },
      {
        key: "ui.checkout_window.create.notifications.save_failed_message",
        values: {
          en: "Could not save checkout. Please check your configuration and try again.",
          de: "Checkout konnte nicht gespeichert werden. Bitte überprüfen Sie Ihre Konfiguration und versuchen Sie es erneut.",
          pl: "Nie można zapisać płatności. Sprawdź konfigurację i spróbuj ponownie.",
          es: "No se pudo guardar el pago. Verifica tu configuración e inténtalo de nuevo.",
          fr: "Impossible d'enregistrer le paiement. Veuillez vérifier votre configuration et réessayer.",
          ja: "チェックアウトを保存できませんでした。設定を確認してもう一度お試しください。",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Payment Provider Badges
      // ============================================================
      {
        key: "ui.checkout_window.create.payment_mode.test",
        values: {
          en: "Test Mode",
          de: "Testmodus",
          pl: "Tryb testowy",
          es: "Modo de prueba",
          fr: "Mode test",
          ja: "テストモード",
        }
      },
      {
        key: "ui.checkout_window.create.payment_mode.live",
        values: {
          en: "Live Mode",
          de: "Live-Modus",
          pl: "Tryb na żywo",
          es: "Modo en vivo",
          fr: "Mode en direct",
          ja: "ライブモード",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Form Timing Tooltips & Badges
      // ============================================================
      {
        key: "ui.checkout_window.create.form_timing.in_checkout_tooltip",
        values: {
          en: "Form will be collected during checkout",
          de: "Formular wird während des Checkouts erfasst",
          pl: "Formularz zostanie zebrany podczas płatności",
          es: "El formulario se recopilará durante el pago",
          fr: "Le formulaire sera collecté lors du paiement",
          ja: "チェックアウト時にフォームが収集されます",
        }
      },
      {
        key: "ui.checkout_window.create.form_timing.in_checkout_badge",
        values: {
          en: "🛒 In Checkout",
          de: "🛒 Im Checkout",
          pl: "🛒 W płatności",
          es: "🛒 En el pago",
          fr: "🛒 Lors du paiement",
          ja: "🛒 チェックアウト時",
        }
      },
      {
        key: "ui.checkout_window.create.form_timing.after_purchase_tooltip",
        values: {
          en: "Form link sent via email after purchase",
          de: "Formularlink wird nach dem Kauf per E-Mail gesendet",
          pl: "Link do formularza wysyłany e-mailem po zakupie",
          es: "Enlace del formulario enviado por correo después de la compra",
          fr: "Lien du formulaire envoyé par e-mail après l'achat",
          ja: "購入後にフォームリンクがメールで送信されます",
        }
      },
      {
        key: "ui.checkout_window.create.form_timing.after_purchase_badge",
        values: {
          en: "✉️ After Purchase",
          de: "✉️ Nach dem Kauf",
          pl: "✉️ Po zakupie",
          es: "✉️ Después de la compra",
          fr: "✉️ Après l'achat",
          ja: "✉️ 購入後",
        }
      },

      // ============================================================
      // CREATE/EDIT TAB - Theme Preview Titles
      // ============================================================
      {
        key: "ui.checkout_window.create.theme_preview.primary_gradient",
        values: {
          en: "Primary Gradient",
          de: "Primärer Farbverlauf",
          pl: "Gradient podstawowy",
          es: "Gradiente primario",
          fr: "Dégradé principal",
          ja: "プライマリグラデーション",
        }
      },
      {
        key: "ui.checkout_window.create.theme_preview.background",
        values: {
          en: "Background",
          de: "Hintergrund",
          pl: "Tło",
          es: "Fondo",
          fr: "Arrière-plan",
          ja: "背景",
        }
      },
      {
        key: "ui.checkout_window.create.theme_preview.text",
        values: {
          en: "Text",
          de: "Text",
          pl: "Tekst",
          es: "Texto",
          fr: "Texte",
          ja: "テキスト",
        }
      },
      {
        key: "ui.checkout_window.create.theme_preview.secondary",
        values: {
          en: "Secondary",
          de: "Sekundär",
          pl: "Drugi",
          es: "Secundario",
          fr: "Secondaire",
          ja: "セカンダリ",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Confirmation Modals
      // ============================================================
      {
        key: "ui.checkout_window.list.confirm.delete_title",
        values: {
          en: "Delete Checkout",
          de: "Checkout löschen",
          pl: "Usuń płatność",
          es: "Eliminar pago",
          fr: "Supprimer le paiement",
          ja: "チェックアウトを削除",
        }
      },
      {
        key: "ui.checkout_window.list.confirm.delete_message",
        values: {
          en: 'Are you sure you want to delete "{name}"?\n\nThis action cannot be undone.',
          de: 'Möchten Sie "{name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.',
          pl: 'Czy na pewno chcesz usunąć "{name}"?\n\nTej czynności nie można cofnąć.',
          es: '¿Estás seguro de que quieres eliminar "{name}"?\n\nEsta acción no se puede deshacer.',
          fr: 'Êtes-vous sûr de vouloir supprimer "{name}"?\n\nCette action ne peut pas être annulée.',
          ja: '"{name}"を削除してもよろしいですか？\n\nこの操作は元に戻せません。',
        }
      },
      {
        key: "ui.checkout_window.list.confirm.delete_button",
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
        key: "ui.checkout_window.list.confirm.cancel_button",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },

      // ============================================================
      // CHECKOUTS LIST TAB - Error Notifications
      // ============================================================
      {
        key: "ui.checkout_window.list.notifications.update_failed",
        values: {
          en: "Failed to Update",
          de: "Aktualisierung fehlgeschlagen",
          pl: "Aktualizacja nie powiodła się",
          es: "Error al actualizar",
          fr: "Échec de la mise à jour",
          ja: "更新に失敗しました",
        }
      },
      {
        key: "ui.checkout_window.list.notifications.update_error",
        values: {
          en: "Could not {action} checkout. Please try again.",
          de: "Checkout konnte nicht {action} werden. Bitte versuchen Sie es erneut.",
          pl: "Nie można {action} płatności. Spróbuj ponownie.",
          es: "No se pudo {action} el pago. Por favor, inténtalo de nuevo.",
          fr: "Impossible de {action} le paiement. Veuillez réessayer.",
          ja: "チェックアウトを{action}できませんでした。もう一度お試しください。",
        }
      },
      {
        key: "ui.checkout_window.list.notifications.delete_failed",
        values: {
          en: "Delete Failed",
          de: "Löschen fehlgeschlagen",
          pl: "Usuwanie nie powiodło się",
          es: "Error al eliminar",
          fr: "Échec de la suppression",
          ja: "削除に失敗しました",
        }
      },
      {
        key: "ui.checkout_window.list.notifications.delete_error",
        values: {
          en: "Could not delete checkout. Please try again.",
          de: "Checkout konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
          pl: "Nie można usunąć płatności. Spróbuj ponownie.",
          es: "No se pudo eliminar el pago. Por favor, inténtalo de nuevo.",
          fr: "Impossible de supprimer le paiement. Veuillez réessayer.",
          ja: "チェックアウトを削除できませんでした。もう一度お試しください。",
        }
      },

      // ============================================================
      // TEMPLATES TAB - Alert Messages
      // ============================================================
      {
        key: "ui.checkout_window.templates.alerts.use_template_instructions",
        values: {
          en: "To use this checkout template:\n\n1. Go to Web Publishing app\n2. Create a new page (Event Landing, Product Page, etc.)\n3. Link your products to the page\n4. The checkout template will be automatically applied!",
          de: "Um diese Checkout-Vorlage zu verwenden:\n\n1. Gehen Sie zur Web Publishing-App\n2. Erstellen Sie eine neue Seite (Event-Landingpage, Produktseite usw.)\n3. Verknüpfen Sie Ihre Produkte mit der Seite\n4. Die Checkout-Vorlage wird automatisch angewendet!",
          pl: "Aby użyć tego szablonu płatności:\n\n1. Przejdź do aplikacji Web Publishing\n2. Utwórz nową stronę (Landing eventu, Strona produktu itp.)\n3. Połącz swoje produkty ze stroną\n4. Szablon płatności zostanie automatycznie zastosowany!",
          es: "Para usar esta plantilla de pago:\n\n1. Ve a la aplicación Web Publishing\n2. Crea una nueva página (Página de evento, Página de producto, etc.)\n3. Vincula tus productos a la página\n4. ¡La plantilla de pago se aplicará automáticamente!",
          fr: "Pour utiliser ce modèle de paiement:\n\n1. Accédez à l'application Web Publishing\n2. Créez une nouvelle page (Page d'événement, Page de produit, etc.)\n3. Liez vos produits à la page\n4. Le modèle de paiement sera automatiquement appliqué!",
          ja: "このチェックアウトテンプレートを使用するには:\n\n1. Web Publishingアプリに移動\n2. 新しいページを作成（イベントランディング、製品ページなど）\n3. 製品をページにリンク\n4. チェックアウトテンプレートが自動的に適用されます！",
        }
      },
      {
        key: "ui.checkout_window.templates.alerts.docs_coming_soon",
        values: {
          en: "Template documentation coming soon!",
          de: "Vorlagendokumentation kommt bald!",
          pl: "Dokumentacja szablonu wkrótce!",
          es: "¡Documentación de plantilla próximamente!",
          fr: "Documentation du modèle bientôt disponible!",
          ja: "テンプレートドキュメントは近日公開！",
        }
      },

      // ============================================================
      // COMMON - Loading & Generic
      // ============================================================
      {
        key: "ui.checkout_window.loading",
        values: {
          en: "Loading...",
          de: "Lädt...",
          pl: "Ładowanie...",
          es: "Cargando...",
          fr: "Chargement...",
          ja: "読み込み中...",
        }
      },
      {
        key: "ui.checkout_window.common.product_count",
        values: {
          en: "{count} product{plural}",
          de: "{count} Produkt{plural}",
          pl: "{count} produkt{plural}",
          es: "{count} producto{plural}",
          fr: "{count} produit{plural}",
          ja: "{count}個の製品",
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
            "checkout-window",
            "ui"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Checkout Window UI translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
