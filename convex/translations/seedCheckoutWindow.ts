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
