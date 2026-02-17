/**
 * SEED START MENU & APP NAMES TRANSLATIONS
 *
 * Seeds translations for:
 * - Start menu items (Programs, Organizations, Settings, Log In/Out)
 * - All application names across the system
 * - Desktop elements
 *
 * Run: npx convex run translations/seedStartMenu:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew, upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Start Menu & App Names translations...");

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
      // === START MENU TOP-LEVEL ===
      {
        key: "ui.start_menu.programs",
        values: {
          en: "Programs",
          de: "Programme",
          pl: "Programy",
          es: "Programas",
          fr: "Programmes",
          ja: "プログラム",
        }
      },
      {
        key: "ui.start_menu.organizations",
        values: {
          en: "Organizations",
          de: "Organisationen",
          pl: "Organizacje",
          es: "Organizaciones",
          fr: "Organisations",
          ja: "組織",
        }
      },
      {
        key: "ui.start_menu.store",
        values: {
          en: "Store",
          de: "Shop",
          pl: "Sklep",
          es: "Tienda",
          fr: "Boutique",
          ja: "ストア",
        }
      },
      {
        key: "ui.start_menu.settings",
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
        key: "ui.start_menu.log_in",
        values: {
          en: "Log In",
          de: "Anmelden",
          pl: "Zaloguj się",
          es: "Iniciar sesión",
          fr: "Se connecter",
          ja: "ログイン",
        }
      },
      {
        key: "ui.start_menu.log_out",
        values: {
          en: "Log Out",
          de: "Abmelden",
          pl: "Wyloguj się",
          es: "Cerrar sesión",
          fr: "Se déconnecter",
          ja: "ログアウト",
        }
      },
      {
        key: "ui.start_menu.org_switcher.currently",
        values: {
          en: "Currently: {orgName}",
          de: "Aktuell: {orgName}",
          pl: "Obecnie: {orgName}",
          es: "Actualmente: {orgName}",
          fr: "Actuellement : {orgName}",
          ja: "現在: {orgName}",
        }
      },
      {
        key: "ui.start_menu.org_switcher.no_organizations_available",
        values: {
          en: "No organizations available",
          de: "Keine Organisationen verfügbar",
          pl: "Brak dostępnych organizacji",
          es: "No hay organizaciones disponibles",
          fr: "Aucune organisation disponible",
          ja: "利用可能な組織がありません",
        }
      },
      {
        key: "ui.start_menu.org_switcher.mode_platform",
        values: {
          en: "Platform Org",
          de: "Plattform-Org",
          pl: "Org. platformy",
          es: "Org. de plataforma",
          fr: "Org. plateforme",
          ja: "プラットフォーム組織",
        }
      },
      {
        key: "ui.start_menu.org_switcher.mode_sub",
        values: {
          en: "Sub-Org",
          de: "Unter-Org",
          pl: "Podorganizacja",
          es: "Suborganización",
          fr: "Sous-organisation",
          ja: "サブ組織",
        }
      },
      {
        key: "ui.start_menu.org_switcher.placeholder_sub_name",
        values: {
          en: "Sub-organization name...",
          de: "Name der Unterorganisation...",
          pl: "Nazwa podorganizacji...",
          es: "Nombre de la suborganización...",
          fr: "Nom de la sous-organisation...",
          ja: "サブ組織名...",
        }
      },
      {
        key: "ui.start_menu.org_switcher.placeholder_org_name",
        values: {
          en: "Organization name...",
          de: "Name der Organisation...",
          pl: "Nazwa organizacji...",
          es: "Nombre de la organización...",
          fr: "Nom de l'organisation...",
          ja: "組織名...",
        }
      },
      {
        key: "ui.start_menu.org_switcher.create_sub_short",
        values: {
          en: "Create Sub-Org",
          de: "Unter-Org erstellen",
          pl: "Utwórz podorganizację",
          es: "Crear suborganización",
          fr: "Créer une sous-organisation",
          ja: "サブ組織を作成",
        }
      },
      {
        key: "ui.start_menu.org_switcher.create_org",
        values: {
          en: "Create Organization",
          de: "Organisation erstellen",
          pl: "Utwórz organizację",
          es: "Crear organización",
          fr: "Créer une organisation",
          ja: "組織を作成",
        }
      },
      {
        key: "ui.start_menu.org_switcher.create_sub",
        values: {
          en: "Create Sub-Organization",
          de: "Unterorganisation erstellen",
          pl: "Utwórz podorganizację",
          es: "Crear suborganización",
          fr: "Créer une sous-organisation",
          ja: "サブ組織を作成",
        }
      },
      {
        key: "ui.start_menu.org_switcher.cancel",
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
        key: "ui.start_menu.org_switcher.footer_switch_or_new_org",
        values: {
          en: "Switch organizations or create a new organization",
          de: "Organisationen wechseln oder neue Organisation erstellen",
          pl: "Przełącz organizacje lub utwórz nową organizację",
          es: "Cambia de organización o crea una nueva",
          fr: "Changez d'organisation ou créez-en une nouvelle",
          ja: "組織を切り替えるか、新しい組織を作成",
        }
      },
      {
        key: "ui.start_menu.org_switcher.footer_switch_or_sub",
        values: {
          en: "Switch organizations or create a new sub-organization",
          de: "Organisationen wechseln oder neue Unterorganisation erstellen",
          pl: "Przełącz organizacje lub utwórz nową podorganizację",
          es: "Cambia de organización o crea una nueva suborganización",
          fr: "Changez d'organisation ou créez une nouvelle sous-organisation",
          ja: "組織を切り替えるか、新しいサブ組織を作成",
        }
      },
      {
        key: "ui.start_menu.org_switcher.footer_switch_or_platform",
        values: {
          en: "Switch organizations or create a new platform organization",
          de: "Organisationen wechseln oder neue Plattform-Organisation erstellen",
          pl: "Przełącz organizacje lub utwórz nową organizację platformową",
          es: "Cambia de organización o crea una nueva organización de plataforma",
          fr: "Changez d'organisation ou créez une nouvelle organisation de plateforme",
          ja: "組織を切り替えるか、新しいプラットフォーム組織を作成",
        }
      },
      {
        key: "ui.start_menu.org_switcher.footer_switch_only",
        values: {
          en: "Click an organization to switch",
          de: "Klicken Sie auf eine Organisation, um zu wechseln",
          pl: "Kliknij organizację, aby się przełączyć",
          es: "Haz clic en una organización para cambiar",
          fr: "Cliquez sur une organisation pour changer",
          ja: "組織をクリックして切り替え",
        }
      },
      {
        key: "ui.start_menu.org_switcher.error_create_sub",
        values: {
          en: "Failed to create sub-organization",
          de: "Unterorganisation konnte nicht erstellt werden",
          pl: "Nie udało się utworzyć podorganizacji",
          es: "No se pudo crear la suborganización",
          fr: "Impossible de créer la sous-organisation",
          ja: "サブ組織の作成に失敗しました",
        }
      },
      {
        key: "ui.start_menu.org_switcher.error_create_org",
        values: {
          en: "Failed to create organization",
          de: "Organisation konnte nicht erstellt werden",
          pl: "Nie udało się utworzyć organizacji",
          es: "No se pudo crear la organización",
          fr: "Impossible de créer l'organisation",
          ja: "組織の作成に失敗しました",
        }
      },

      // === WINDOW/APP TITLES ===
      {
        key: "ui.app.all_applications",
        values: {
          en: "All Applications",
          de: "Alle Anwendungen",
          pl: "Wszystkie aplikacje",
          es: "Todas las aplicaciones",
          fr: "Toutes les applications",
          ja: "すべてのアプリケーション",
        }
      },
      {
        key: "ui.app.media_library",
        values: {
          en: "Media Library",
          de: "Medienbibliothek",
          pl: "Biblioteka multimediów",
          es: "Biblioteca multimedia",
          fr: "Bibliothèque multimédia",
          ja: "メディアライブラリ",
        }
      },
      {
        key: "ui.app.payments",
        values: {
          en: "Payments",
          de: "Zahlungen",
          pl: "Płatności",
          es: "Pagos",
          fr: "Paiements",
          ja: "支払い",
        }
      },
      {
        key: "ui.app.payment_management",
        values: {
          en: "Payment Management",
          de: "Zahlungsverwaltung",
          pl: "Zarządzanie płatnościami",
          es: "Gestión de pagos",
          fr: "Gestion des paiements",
          ja: "支払い管理",
        }
      },
      {
        key: "ui.app.products",
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
        key: "ui.app.tickets",
        values: {
          en: "Tickets",
          de: "Tickets",
          pl: "Bilety",
          es: "Entradas",
          fr: "Billets",
          ja: "チケット",
        }
      },
      {
        key: "ui.app.certificates",
        values: {
          en: "Certificates",
          de: "Zertifikate",
          pl: "Certyfikaty",
          es: "Certificados",
          fr: "Certificats",
          ja: "証明書",
        }
      },
      {
        key: "ui.app.events",
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
        key: "ui.app.checkout",
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
        key: "ui.app.forms",
        values: {
          en: "Forms",
          de: "Formulare",
          pl: "Formularze",
          es: "Formularios",
          fr: "Formulaires",
          ja: "フォーム",
        }
      },
      {
        key: "ui.app.web_publishing",
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
        key: "ui.app.crm",
        values: {
          en: "CRM",
          de: "CRM",
          pl: "CRM",
          es: "CRM",
          fr: "CRM",
          ja: "CRM",
        }
      },
      {
        key: "ui.app.crm_full",
        values: {
          en: "Customer Relationship Management",
          de: "Kundenbeziehungsmanagement",
          pl: "Zarządzanie relacjami z klientami",
          es: "Gestión de relaciones con clientes",
          fr: "Gestion de la relation client",
          ja: "顧客関係管理",
        }
      },
      {
        key: "ui.app.invoicing",
        values: {
          en: "Invoicing",
          de: "Rechnungsstellung",
          pl: "Fakturowanie",
          es: "Facturación",
          fr: "Facturation",
          ja: "請求書発行",
        }
      },
      {
        key: "ui.app.workflows",
        values: {
          en: "Workflows",
          de: "Arbeitsabläufe",
          pl: "Przepływy pracy",
          es: "Flujos de trabajo",
          fr: "Flux de travail",
          ja: "ワークフロー",
        }
      },
      {
        key: "ui.app.compliance",
        values: {
          en: "Compliance",
          de: "Compliance",
          pl: "Zgodność",
          es: "Cumplimiento",
          fr: "Conformité",
          ja: "コンプライアンス",
        }
      },
      {
        key: "ui.app.templates",
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
        key: "ui.app.ai_assistant",
        values: {
          en: "AI Assistant",
          de: "KI-Assistent",
          pl: "Asystent AI",
          es: "Asistente de IA",
          fr: "Assistant IA",
          ja: "AIアシスタント",
        }
      },
      {
        key: "ui.app.user_account",
        values: {
          en: "User Account",
          de: "Benutzerkonto",
          pl: "Konto użytkownika",
          es: "Cuenta de usuario",
          fr: "Compte utilisateur",
          ja: "ユーザーアカウント",
        }
      },
      {
        key: "ui.app.benefits",
        values: {
          en: "Benefits",
          de: "Vorteile",
          pl: "Korzyści",
          es: "Beneficios",
          fr: "Avantages",
          ja: "特典",
        }
      },
      {
        key: "ui.windows.benefits.title",
        values: {
          en: "Benefits",
          de: "Vorteile",
          pl: "Korzyści",
          es: "Beneficios",
          fr: "Avantages",
          ja: "特典",
        }
      },
      {
        key: "ui.app.booking",
        values: {
          en: "Booking",
          de: "Buchungen",
          pl: "Rezerwacje",
          es: "Reservas",
          fr: "Réservations",
          ja: "予約",
        }
      },
      {
        key: "ui.windows.booking.title",
        values: {
          en: "Booking",
          de: "Buchungen",
          pl: "Rezerwacje",
          es: "Reservas",
          fr: "Réservations",
          ja: "予約",
        }
      },

      {
        key: "ui.app.projects",
        values: {
          en: "Projects",
          de: "Projekte",
          pl: "Projekty",
          es: "Proyectos",
          fr: "Projets",
          ja: "プロジェクト",
        }
      },

      // === SYSTEM APPS ===
      {
        key: "ui.app.l4yercak3_exe",
        values: {
          en: "l4yercak3.exe",
          de: "l4yercak3.exe",
          pl: "l4yercak3.exe",
          es: "l4yercak3.exe",
          fr: "l4yercak3.exe",
          ja: "l4yercak3.exe",
        }
      },

      // === ALL APPS WINDOW TRANSLATIONS ===
      {
        key: "ui.start_menu.sign_in_required",
        values: {
          en: "Sign In Required",
          de: "Anmeldung erforderlich",
          pl: "Wymagane logowanie",
          es: "Inicio de sesión requerido",
          fr: "Connexion requise",
          ja: "サインインが必要です",
        }
      },
      {
        key: "ui.start_menu.sign_in_to_view_apps",
        values: {
          en: "Please sign in to view your installed applications.",
          de: "Bitte melden Sie sich an, um Ihre installierten Anwendungen anzuzeigen.",
          pl: "Zaloguj się, aby zobaczyć zainstalowane aplikacje.",
          es: "Por favor, inicie sesión para ver sus aplicaciones instaladas.",
          fr: "Veuillez vous connecter pour voir vos applications installées.",
          ja: "インストールされているアプリケーションを表示するにはサインインしてください。",
        }
      },
      {
        key: "ui.start_menu.loading_applications",
        values: {
          en: "Loading applications...",
          de: "Anwendungen werden geladen...",
          pl: "Ładowanie aplikacji...",
          es: "Cargando aplicaciones...",
          fr: "Chargement des applications...",
          ja: "アプリケーションを読み込んでいます...",
        }
      },
      {
        key: "ui.start_menu.no_apps_installed",
        values: {
          en: "No Apps Installed",
          de: "Keine Apps installiert",
          pl: "Brak zainstalowanych aplikacji",
          es: "No hay aplicaciones instaladas",
          fr: "Aucune application installée",
          ja: "アプリがインストールされていません",
        }
      },
      {
        key: "ui.start_menu.org_no_apps",
        values: {
          en: "{orgName} has no applications installed yet.",
          de: "{orgName} hat noch keine Anwendungen installiert.",
          pl: "{orgName} nie ma jeszcze zainstalowanych aplikacji.",
          es: "{orgName} aún no tiene aplicaciones instaladas.",
          fr: "{orgName} n'a pas encore d'applications installées.",
          ja: "{orgName}にはまだアプリケーションがインストールされていません。",
        }
      },
      {
        key: "ui.start_menu.contact_admin",
        values: {
          en: "Contact your administrator to install apps for your organization.",
          de: "Wenden Sie sich an Ihren Administrator, um Apps für Ihre Organisation zu installieren.",
          pl: "Skontaktuj się z administratorem, aby zainstalować aplikacje dla swojej organizacji.",
          es: "Contacte a su administrador para instalar aplicaciones para su organización.",
          fr: "Contactez votre administrateur pour installer des applications pour votre organisation.",
          ja: "組織のアプリをインストールするには管理者にお問い合わせください。",
        }
      },
      {
        key: "ui.start_menu.apps_installed_for",
        values: {
          en: "{count} app(s) installed for {orgName}",
          de: "{count} App(s) installiert für {orgName}",
          pl: "{count} aplikacja/aplikacje zainstalowane dla {orgName}",
          es: "{count} aplicación/aplicaciones instaladas para {orgName}",
          fr: "{count} application(s) installée(s) pour {orgName}",
          ja: "{orgName}に{count}個のアプリがインストールされています",
        }
      },
      {
        key: "ui.start_menu.click_app_to_open",
        values: {
          en: "Click an app to open it",
          de: "Klicken Sie auf eine App, um sie zu öffnen",
          pl: "Kliknij aplikację, aby ją otworzyć",
          es: "Haga clic en una aplicación para abrirla",
          fr: "Cliquez sur une application pour l'ouvrir",
          ja: "アプリをクリックして開く",
        }
      },
      {
        key: "ui.start_menu.app_coming_soon",
        values: {
          en: "This application is coming soon!",
          de: "Diese Anwendung kommt bald!",
          pl: "Ta aplikacja pojawi się wkrótce!",
          es: "¡Esta aplicación estará disponible pronto!",
          fr: "Cette application arrive bientôt!",
          ja: "このアプリケーションは近日公開予定です！",
        }
      },
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    let inserted = 0;
    let updated = 0;
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
            "start-menu"
          );

          if (result.inserted) inserted++;
          if (result.updated) updated++;
        }
      }
    }

    console.log(`✅ Seeded ${inserted} new, updated ${updated} existing start menu & app name translations`);
    return { success: true, inserted, updated, totalKeys: translations.length };
  }
});

/**
 * FIX: Upsert all start menu & app name translations
 * Use this to repair ghost records (existing but with empty/wrong values)
 *
 * Run: npx convex run translations/seedStartMenu:fix
 */
export const fix = internalMutation({
  handler: async (ctx) => {
    console.log("🔧 Upserting Start Menu & App Names translations...");

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
      { code: "en" }, { code: "de" }, { code: "pl" },
      { code: "es" }, { code: "fr" }, { code: "ja" },
    ];

    // Only upsert keys that are known to have issues
    const translations = [
      {
        key: "ui.app.projects",
        values: {
          en: "Projects",
          de: "Projekte",
          pl: "Projekty",
          es: "Proyectos",
          fr: "Projets",
          ja: "プロジェクト",
        }
      },
    ];

    let inserted = 0;
    let updated = 0;

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
            "start-menu"
          );
          if (result.inserted) inserted++;
          if (result.updated) updated++;
        }
      }
    }

    console.log(`🔧 Fixed: ${inserted} inserted, ${updated} updated`);
    return { success: true, inserted, updated };
  }
});
