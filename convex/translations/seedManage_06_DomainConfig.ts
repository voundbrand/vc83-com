/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 6: DOMAIN CONFIGURATION TAB
 *
 * Seeds translations for:
 * - Domain Configuration Tab UI
 * - Domain config list and management
 * - Domain config modal (branding, email, web publishing)
 *
 * Run: npx convex run translations/seedManage_06_DomainConfig:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 6: Domain Configuration Tab)...");

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
      // === TAB LABEL ===
      {
        key: "ui.manage.tab.domains",
        values: {
          en: "Domains",
          de: "Domains",
          pl: "Domeny",
          es: "Dominios",
          fr: "Domaines",
          ja: "ドメイン",
        }
      },

      // === HEADER ===
      {
        key: "ui.manage.domains.header.title",
        values: {
          en: "Domain Configurations",
          de: "Domain-Konfigurationen",
          pl: "Konfiguracje domen",
          es: "Configuraciones de dominio",
          fr: "Configurations de domaine",
          ja: "ドメイン構成",
        }
      },
      {
        key: "ui.manage.domains.header.description",
        values: {
          en: "Manage domain-specific settings for email, branding, and web publishing",
          de: "Verwalten Sie domänenspezifische Einstellungen für E-Mail, Branding und Web-Publishing",
          pl: "Zarządzaj ustawieniami specyficznymi dla domeny, takimi jak e-mail, branding i publikowanie w sieci",
          es: "Administre la configuración específica del dominio para correo electrónico, marca y publicación web",
          fr: "Gérez les paramètres spécifiques au domaine pour l'email, l'image de marque et la publication web",
          ja: "メール、ブランディング、ウェブ公開のドメイン固有の設定を管理",
        }
      },

      // === ACTIONS ===
      {
        key: "ui.manage.domains.actions.add_domain",
        values: {
          en: "Add Domain",
          de: "Domain hinzufügen",
          pl: "Dodaj domenę",
          es: "Agregar dominio",
          fr: "Ajouter un domaine",
          ja: "ドメインを追加",
        }
      },

      // === INFO BOX ===
      {
        key: "ui.manage.domains.info.title",
        values: {
          en: "What are Domain Configurations?",
          de: "Was sind Domain-Konfigurationen?",
          pl: "Czym są konfiguracje domen?",
          es: "¿Qué son las configuraciones de dominio?",
          fr: "Qu'est-ce que les configurations de domaine?",
          ja: "ドメイン構成とは何ですか？",
        }
      },
      {
        key: "ui.manage.domains.info.point_1",
        values: {
          en: "Configure domain-specific branding (logo, colors, fonts)",
          de: "Konfigurieren Sie domänenspezifisches Branding (Logo, Farben, Schriftarten)",
          pl: "Skonfiguruj branding specyficzny dla domeny (logo, kolory, czcionki)",
          es: "Configure la marca específica del dominio (logo, colores, fuentes)",
          fr: "Configurez l'image de marque spécifique au domaine (logo, couleurs, polices)",
          ja: "ドメイン固有のブランディングを設定（ロゴ、色、フォント）",
        }
      },
      {
        key: "ui.manage.domains.info.point_2",
        values: {
          en: "Set up email settings for customer and sales notifications",
          de: "Richten Sie E-Mail-Einstellungen für Kunden- und Vertriebsbenachrichtigungen ein",
          pl: "Skonfiguruj ustawienia e-mail dla powiadomień klientów i sprzedaży",
          es: "Configure los ajustes de correo electrónico para notificaciones de clientes y ventas",
          fr: "Configurez les paramètres d'email pour les notifications clients et commerciales",
          ja: "顧客および営業通知のメール設定を行う",
        }
      },
      {
        key: "ui.manage.domains.info.point_3",
        values: {
          en: "Manage web publishing metadata for different frontends",
          de: "Verwalten Sie Metadaten für die Web-Veröffentlichung für verschiedene Frontends",
          pl: "Zarządzaj metadanymi publikacji internetowych dla różnych interfejsów użytkownika",
          es: "Gestione los metadatos de publicación web para diferentes interfaces",
          fr: "Gérez les métadonnées de publication web pour différents frontends",
          ja: "異なるフロントエンドのウェブ公開メタデータを管理",
        }
      },
      {
        key: "ui.manage.domains.info.point_4",
        values: {
          en: "Support multiple domains per organization",
          de: "Unterstützen Sie mehrere Domains pro Organisation",
          pl: "Obsługuj wiele domen na organizację",
          es: "Admita múltiples dominios por organización",
          fr: "Prenez en charge plusieurs domaines par organisation",
          ja: "組織ごとに複数のドメインをサポート",
        }
      },

      // === STATUS LABELS ===
      {
        key: "ui.manage.domains.status.active",
        values: {
          en: "Active",
          de: "Aktiv",
          pl: "Aktywny",
          es: "Activo",
          fr: "Actif",
          ja: "有効",
        }
      },
      {
        key: "ui.manage.domains.status.inactive",
        values: {
          en: "Inactive",
          de: "Inaktiv",
          pl: "Nieaktywny",
          es: "Inactivo",
          fr: "Inactif",
          ja: "無効",
        }
      },

      // === DOMAIN CONFIG FIELDS ===
      {
        key: "ui.manage.domains.field.branding",
        values: {
          en: "Branding:",
          de: "Branding:",
          pl: "Branding:",
          es: "Marca:",
          fr: "Image de marque:",
          ja: "ブランディング：",
        }
      },
      {
        key: "ui.manage.domains.field.email",
        values: {
          en: "Email:",
          de: "E-Mail:",
          pl: "E-mail:",
          es: "Correo electrónico:",
          fr: "Email:",
          ja: "メール：",
        }
      },
      {
        key: "ui.manage.domains.field.web",
        values: {
          en: "Web:",
          de: "Web:",
          pl: "Web:",
          es: "Web:",
          fr: "Web:",
          ja: "ウェブ：",
        }
      },
      {
        key: "ui.manage.domains.field.configured",
        values: {
          en: "Configured",
          de: "Konfiguriert",
          pl: "Skonfigurowane",
          es: "Configurado",
          fr: "Configuré",
          ja: "設定済み",
        }
      },

      // === EMPTY STATE ===
      {
        key: "ui.manage.domains.empty.title",
        values: {
          en: "No Domain Configurations",
          de: "Keine Domain-Konfigurationen",
          pl: "Brak konfiguracji domen",
          es: "No hay configuraciones de dominio",
          fr: "Aucune configuration de domaine",
          ja: "ドメイン構成なし",
        }
      },
      {
        key: "ui.manage.domains.empty.description",
        values: {
          en: "Create your first domain configuration to enable email notifications and branding.",
          de: "Erstellen Sie Ihre erste Domain-Konfiguration, um E-Mail-Benachrichtigungen und Branding zu aktivieren.",
          pl: "Utwórz swoją pierwszą konfigurację domeny, aby włączyć powiadomienia e-mail i branding.",
          es: "Cree su primera configuración de dominio para habilitar las notificaciones por correo electrónico y la marca.",
          fr: "Créez votre première configuration de domaine pour activer les notifications par email et l'image de marque.",
          ja: "メール通知とブランディングを有効にするための最初のドメイン構成を作成します。",
        }
      },
      {
        key: "ui.manage.domains.empty.action",
        values: {
          en: "Create Domain Configuration",
          de: "Domain-Konfiguration erstellen",
          pl: "Utwórz konfigurację domeny",
          es: "Crear configuración de dominio",
          fr: "Créer une configuration de domaine",
          ja: "ドメイン構成を作成",
        }
      },

      // === WARNINGS ===
      {
        key: "ui.manage.domains.warning.view_only.title",
        values: {
          en: "View Only",
          de: "Nur ansehen",
          pl: "Tylko do odczytu",
          es: "Solo lectura",
          fr: "Lecture seule",
          ja: "閲覧のみ",
        }
      },
      {
        key: "ui.manage.domains.warning.view_only.message",
        values: {
          en: "You don't have permission to modify domain configurations.",
          de: "Sie haben keine Berechtigung, Domain-Konfigurationen zu ändern.",
          pl: "Nie masz uprawnień do modyfikowania konfiguracji domen.",
          es: "No tiene permiso para modificar las configuraciones de dominio.",
          fr: "Vous n'avez pas la permission de modifier les configurations de domaine.",
          ja: "ドメイン構成を変更する権限がありません。",
        }
      },

      // === MODAL: HEADER ===
      {
        key: "ui.manage.domains.modal.title.create",
        values: {
          en: "Add Domain Configuration",
          de: "Domain-Konfiguration hinzufügen",
          pl: "Dodaj konfigurację domeny",
          es: "Agregar configuración de dominio",
          fr: "Ajouter une configuration de domaine",
          ja: "ドメイン構成を追加",
        }
      },
      {
        key: "ui.manage.domains.modal.title.edit",
        values: {
          en: "Edit Domain Configuration",
          de: "Domain-Konfiguration bearbeiten",
          pl: "Edytuj konfigurację domeny",
          es: "Editar configuración de dominio",
          fr: "Modifier la configuration de domaine",
          ja: "ドメイン構成を編集",
        }
      },

      // === MODAL: TABS ===
      {
        key: "ui.manage.domains.modal.tab.core",
        values: {
          en: "Core & Branding",
          de: "Kern & Branding",
          pl: "Rdzeń i branding",
          es: "Núcleo y marca",
          fr: "Base et image de marque",
          ja: "コアとブランディング",
        }
      },
      {
        key: "ui.manage.domains.modal.tab.email",
        values: {
          en: "Email Settings",
          de: "E-Mail-Einstellungen",
          pl: "Ustawienia e-mail",
          es: "Configuración de correo electrónico",
          fr: "Paramètres d'email",
          ja: "メール設定",
        }
      },
      {
        key: "ui.manage.domains.modal.tab.web",
        values: {
          en: "Web Publishing",
          de: "Web-Publishing",
          pl: "Publikowanie w sieci",
          es: "Publicación web",
          fr: "Publication web",
          ja: "ウェブ公開",
        }
      },

      // === MODAL: CORE SECTION ===
      {
        key: "ui.manage.domains.modal.field.domain_name",
        values: {
          en: "Domain Name",
          de: "Domänenname",
          pl: "Nazwa domeny",
          es: "Nombre de dominio",
          fr: "Nom de domaine",
          ja: "ドメイン名",
        }
      },
      {
        key: "ui.manage.domains.modal.field.domain_name.placeholder",
        values: {
          en: "e.g., pluseins.gg",
          de: "z.B. pluseins.gg",
          pl: "np. pluseins.gg",
          es: "ej., pluseins.gg",
          fr: "ex., pluseins.gg",
          ja: "例: pluseins.gg",
        }
      },
      {
        key: "ui.manage.domains.modal.field.logo_url",
        values: {
          en: "Logo URL",
          de: "Logo-URL",
          pl: "Adres URL logo",
          es: "URL del logo",
          fr: "URL du logo",
          ja: "ロゴURL",
        }
      },
      {
        key: "ui.manage.domains.modal.field.logo_url.placeholder",
        values: {
          en: "https://example.com/logo.png",
          de: "https://beispiel.de/logo.png",
          pl: "https://przyklad.pl/logo.png",
          es: "https://ejemplo.com/logo.png",
          fr: "https://exemple.com/logo.png",
          ja: "https://example.com/logo.png",
        }
      },
      {
        key: "ui.manage.domains.modal.field.primary_color",
        values: {
          en: "Primary Color",
          de: "Primärfarbe",
          pl: "Kolor podstawowy",
          es: "Color primario",
          fr: "Couleur primaire",
          ja: "プライマリカラー",
        }
      },
      {
        key: "ui.manage.domains.modal.field.secondary_color",
        values: {
          en: "Secondary Color",
          de: "Sekundärfarbe",
          pl: "Kolor dodatkowy",
          es: "Color secundario",
          fr: "Couleur secondaire",
          ja: "セカンダリカラー",
        }
      },
      {
        key: "ui.manage.domains.modal.field.font_family",
        values: {
          en: "Font Family",
          de: "Schriftfamilie",
          pl: "Rodzina czcionek",
          es: "Familia de fuentes",
          fr: "Famille de polices",
          ja: "フォントファミリー",
        }
      },
      {
        key: "ui.manage.domains.modal.field.font_family.placeholder",
        values: {
          en: "system-ui, sans-serif",
          de: "system-ui, sans-serif",
          pl: "system-ui, sans-serif",
          es: "system-ui, sans-serif",
          fr: "system-ui, sans-serif",
          ja: "system-ui, sans-serif",
        }
      },

      // === MODAL: EMAIL SECTION ===
      {
        key: "ui.manage.domains.modal.email.enable",
        values: {
          en: "Enable Email Configuration",
          de: "E-Mail-Konfiguration aktivieren",
          pl: "Włącz konfigurację e-mail",
          es: "Habilitar configuración de correo electrónico",
          fr: "Activer la configuration d'email",
          ja: "メール構成を有効化",
        }
      },
      {
        key: "ui.manage.domains.modal.field.resend_domain_id",
        values: {
          en: "Resend Domain ID",
          de: "Resend Domain ID",
          pl: "Resend Domain ID",
          es: "Resend Domain ID",
          fr: "Resend Domain ID",
          ja: "Resend ドメインID",
        }
      },
      {
        key: "ui.manage.domains.modal.field.resend_domain_id.placeholder",
        values: {
          en: "dom_xxxxxxxxxx",
          de: "dom_xxxxxxxxxx",
          pl: "dom_xxxxxxxxxx",
          es: "dom_xxxxxxxxxx",
          fr: "dom_xxxxxxxxxx",
          ja: "dom_xxxxxxxxxx",
        }
      },
      {
        key: "ui.manage.domains.modal.field.resend_domain_id.help",
        values: {
          en: "Found in your Resend dashboard",
          de: "In Ihrem Resend-Dashboard zu finden",
          pl: "Znajduje się na pulpicie Resend",
          es: "Se encuentra en su panel de Resend",
          fr: "Trouvé dans votre tableau de bord Resend",
          ja: "Resendダッシュボードで確認できます",
        }
      },
      {
        key: "ui.manage.domains.modal.field.sender_email",
        values: {
          en: "Sender Email",
          de: "Absender-E-Mail",
          pl: "E-mail nadawcy",
          es: "Correo electrónico del remitente",
          fr: "Email de l'expéditeur",
          ja: "送信者メール",
        }
      },
      {
        key: "ui.manage.domains.modal.field.sender_email.placeholder",
        values: {
          en: "Company Name <events@yourdomain.com>",
          de: "Firmenname <events@ihredomain.de>",
          pl: "Nazwa firmy <events@twojadomena.pl>",
          es: "Nombre de la empresa <events@tudominio.com>",
          fr: "Nom de l'entreprise <events@votredomaine.com>",
          ja: "会社名 <events@yourdomain.com>",
        }
      },
      {
        key: "ui.manage.domains.modal.field.system_email",
        values: {
          en: "System Email",
          de: "System-E-Mail",
          pl: "E-mail systemowy",
          es: "Correo electrónico del sistema",
          fr: "Email système",
          ja: "システムメール",
        }
      },
      {
        key: "ui.manage.domains.modal.field.system_email.placeholder",
        values: {
          en: "system@yourdomain.com",
          de: "system@ihredomain.de",
          pl: "system@twojadomena.pl",
          es: "system@tudominio.com",
          fr: "system@votredomaine.com",
          ja: "system@yourdomain.com",
        }
      },
      {
        key: "ui.manage.domains.modal.field.sales_email",
        values: {
          en: "Sales Email",
          de: "Vertriebs-E-Mail",
          pl: "E-mail sprzedaży",
          es: "Correo electrónico de ventas",
          fr: "Email des ventes",
          ja: "営業メール",
        }
      },
      {
        key: "ui.manage.domains.modal.field.sales_email.placeholder",
        values: {
          en: "sales@yourdomain.com",
          de: "vertrieb@ihredomain.de",
          pl: "sprzedaz@twojadomena.pl",
          es: "ventas@tudominio.com",
          fr: "ventes@votredomaine.com",
          ja: "sales@yourdomain.com",
        }
      },
      {
        key: "ui.manage.domains.modal.field.reply_to_email",
        values: {
          en: "Reply-To Email",
          de: "Antwort-an-E-Mail",
          pl: "E-mail odpowiedzi",
          es: "Correo electrónico de respuesta",
          fr: "Email de réponse",
          ja: "返信先メール",
        }
      },
      {
        key: "ui.manage.domains.modal.field.reply_to_email.placeholder",
        values: {
          en: "support@yourdomain.com",
          de: "support@ihredomain.de",
          pl: "wsparcie@twojadomena.pl",
          es: "soporte@tudominio.com",
          fr: "support@votredomaine.com",
          ja: "support@yourdomain.com",
        }
      },

      // === MODAL: WEB SECTION ===
      {
        key: "ui.manage.domains.modal.web.enable",
        values: {
          en: "Enable Web Publishing Configuration",
          de: "Web-Publishing-Konfiguration aktivieren",
          pl: "Włącz konfigurację publikacji w sieci",
          es: "Habilitar configuración de publicación web",
          fr: "Activer la configuration de publication web",
          ja: "ウェブ公開構成を有効化",
        }
      },
      {
        key: "ui.manage.domains.modal.field.site_url",
        values: {
          en: "Site URL",
          de: "Website-URL",
          pl: "Adres URL strony",
          es: "URL del sitio",
          fr: "URL du site",
          ja: "サイトURL",
        }
      },
      {
        key: "ui.manage.domains.modal.field.site_url.placeholder",
        values: {
          en: "https://yourdomain.com",
          de: "https://ihredomain.de",
          pl: "https://twojadomena.pl",
          es: "https://tudominio.com",
          fr: "https://votredomaine.com",
          ja: "https://yourdomain.com",
        }
      },
      {
        key: "ui.manage.domains.modal.field.meta_title",
        values: {
          en: "Meta Title",
          de: "Meta-Titel",
          pl: "Tytuł meta",
          es: "Meta título",
          fr: "Méta titre",
          ja: "メタタイトル",
        }
      },
      {
        key: "ui.manage.domains.modal.field.meta_title.placeholder",
        values: {
          en: "Your Site Name - Tagline",
          de: "Ihr Seitenname - Slogan",
          pl: "Nazwa Twojej strony - Slogan",
          es: "Nombre de su sitio - Eslogan",
          fr: "Nom de votre site - Slogan",
          ja: "サイト名 - タグライン",
        }
      },
      {
        key: "ui.manage.domains.modal.field.meta_description",
        values: {
          en: "Meta Description",
          de: "Meta-Beschreibung",
          pl: "Opis meta",
          es: "Meta descripción",
          fr: "Méta description",
          ja: "メタ説明",
        }
      },
      {
        key: "ui.manage.domains.modal.field.meta_description.placeholder",
        values: {
          en: "A brief description of your site for search engines",
          de: "Eine kurze Beschreibung Ihrer Website für Suchmaschinen",
          pl: "Krótki opis Twojej strony dla wyszukiwarek",
          es: "Una breve descripción de su sitio para motores de búsqueda",
          fr: "Une brève description de votre site pour les moteurs de recherche",
          ja: "検索エンジン向けのサイトの簡単な説明",
        }
      },
      {
        key: "ui.manage.domains.modal.field.is_external",
        values: {
          en: "External Frontend (separate website)",
          de: "Externes Frontend (separate Website)",
          pl: "Frontend zewnętrzny (oddzielna strona internetowa)",
          es: "Frontend externo (sitio web separado)",
          fr: "Frontend externe (site web séparé)",
          ja: "外部フロントエンド（別ウェブサイト）",
        }
      },

      // === MODAL: ACTIONS ===
      {
        key: "ui.manage.domains.modal.actions.cancel",
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
        key: "ui.manage.domains.modal.actions.create",
        values: {
          en: "Create Configuration",
          de: "Konfiguration erstellen",
          pl: "Utwórz konfigurację",
          es: "Crear configuración",
          fr: "Créer la configuration",
          ja: "構成を作成",
        }
      },
      {
        key: "ui.manage.domains.modal.actions.update",
        values: {
          en: "Update Configuration",
          de: "Konfiguration aktualisieren",
          pl: "Zaktualizuj konfigurację",
          es: "Actualizar configuración",
          fr: "Mettre à jour la configuration",
          ja: "構成を更新",
        }
      },
      {
        key: "ui.manage.domains.modal.actions.saving",
        values: {
          en: "Saving...",
          de: "Speichern...",
          pl: "Zapisywanie...",
          es: "Guardando...",
          fr: "Enregistrement...",
          ja: "保存中...",
        }
      },

      // === ERRORS / ALERTS ===
      {
        key: "ui.manage.domains.alert.delete_confirm",
        values: {
          en: "Are you sure you want to delete the domain configuration for \"{domain}\"?",
          de: "Möchten Sie die Domain-Konfiguration für \"{domain}\" wirklich löschen?",
          pl: "Czy na pewno chcesz usunąć konfigurację domeny dla \"{domain}\"?",
          es: "¿Está seguro de que desea eliminar la configuración de dominio para \"{domain}\"?",
          fr: "Êtes-vous sûr de vouloir supprimer la configuration de domaine pour \"{domain}\"?",
          ja: "\"{domain}\" のドメイン構成を削除してもよろしいですか？",
        }
      },
      {
        key: "ui.manage.domains.alert.delete_error",
        values: {
          en: "Failed to delete domain configuration. Please try again.",
          de: "Fehler beim Löschen der Domain-Konfiguration. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się usunąć konfiguracji domeny. Spróbuj ponownie.",
          es: "Error al eliminar la configuración de dominio. Inténtelo de nuevo.",
          fr: "Échec de la suppression de la configuration de domaine. Veuillez réessayer.",
          ja: "ドメイン構成の削除に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.manage.domains.alert.save_error",
        values: {
          en: "Failed to save domain configuration: {error}",
          de: "Fehler beim Speichern der Domain-Konfiguration: {error}",
          pl: "Nie udało się zapisać konfiguracji domeny: {error}",
          es: "Error al guardar la configuración de dominio: {error}",
          fr: "Échec de l'enregistrement de la configuration de domaine: {error}",
          ja: "ドメイン構成の保存に失敗しました：{error}",
        }
      },
    ];

    // Insert translations
    let insertCount = 0;
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];
        if (value) {
          const inserted = await insertTranslationIfNew(
            ctx.db,
            new Set(), // existingKeys (ignored by helper)
            systemOrg._id,
            systemUser._id,
            translation.key,
            value,
            locale.code,
            "ui.manage.domains" // category
          );
          if (inserted) insertCount++;
        }
      }
    }

    console.log(`✅ Inserted ${insertCount} new translation(s) for Domain Configuration Tab`);
    return { success: true, insertCount };
  },
});
