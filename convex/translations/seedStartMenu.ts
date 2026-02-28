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
          en: "sevenlayers.io",
          de: "sevenlayers.io",
          pl: "sevenlayers.io",
          es: "sevenlayers.io",
          fr: "sevenlayers.io",
          ja: "sevenlayers.io",
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

      // === PRODUCT OS APPS ===
      {
        key: "ui.app.ai_agents",
        values: {
          en: "AI Agents",
          de: "KI-Agenten",
          pl: "Agenci AI",
          es: "Agentes de IA",
          fr: "Agents IA",
          ja: "AIエージェント",
        }
      },
      {
        key: "ui.app.web_chat_deployment",
        values: {
          en: "Web Chat Deployment",
          de: "Web-Chat-Bereitstellung",
          pl: "Wdrożenie czatu webowego",
          es: "Implementación de chat web",
          fr: "Déploiement du chat web",
          ja: "Webチャットのデプロイ",
        }
      },
      {
        key: "ui.app.builder",
        values: {
          en: "Builder",
          de: "Builder",
          pl: "Builder",
          es: "Builder",
          fr: "Builder",
          ja: "ビルダー",
        }
      },
      {
        key: "ui.app.layers",
        values: {
          en: "Layers",
          de: "Layers",
          pl: "Warstwy",
          es: "Capas",
          fr: "Couches",
          ja: "レイヤー",
        }
      },
      {
        key: "ui.app.text_editor",
        values: {
          en: "Text Editor",
          de: "Texteditor",
          pl: "Edytor tekstu",
          es: "Editor de texto",
          fr: "Éditeur de texte",
          ja: "テキストエディター",
        }
      },
      {
        key: "ui.app.terminal",
        values: {
          en: "Terminal",
          de: "Terminal",
          pl: "Terminal",
          es: "Terminal",
          fr: "Terminal",
          ja: "ターミナル",
        }
      },

      // === PRODUCT OS MENU, CATEGORIES, BADGES ===
      {
        key: "ui.product_os.title",
        values: {
          en: "Product OS",
          de: "Product OS",
          pl: "Product OS",
          es: "Product OS",
          fr: "Product OS",
          ja: "Product OS",
        }
      },
      {
        key: "ui.product_os.view.browse",
        values: {
          en: "Browse",
          de: "Durchsuchen",
          pl: "Przeglądaj",
          es: "Explorar",
          fr: "Parcourir",
          ja: "閲覧",
        }
      },
      {
        key: "ui.product_os.view.search",
        values: {
          en: "Search",
          de: "Suchen",
          pl: "Szukaj",
          es: "Buscar",
          fr: "Rechercher",
          ja: "検索",
        }
      },
      {
        key: "ui.product_os.view.roadmap",
        values: {
          en: "Roadmap",
          de: "Roadmap",
          pl: "Mapa drogowa",
          es: "Hoja de ruta",
          fr: "Feuille de route",
          ja: "ロードマップ",
        }
      },
      {
        key: "ui.product_os.menu.browse_all_apps",
        values: {
          en: "Browse all apps ({count})",
          de: "Alle Apps durchsuchen ({count})",
          pl: "Przeglądaj wszystkie aplikacje ({count})",
          es: "Explorar todas las aplicaciones ({count})",
          fr: "Parcourir toutes les applications ({count})",
          ja: "すべてのアプリを表示 ({count})",
        }
      },
      {
        key: "ui.product_os.menu.search_apps",
        values: {
          en: "Search apps",
          de: "Apps suchen",
          pl: "Szukaj aplikacji",
          es: "Buscar aplicaciones",
          fr: "Rechercher des applications",
          ja: "アプリを検索",
        }
      },
      {
        key: "ui.product_os.menu.popular_products",
        values: {
          en: "Popular products ({count})",
          de: "Beliebte Produkte ({count})",
          pl: "Popularne produkty ({count})",
          es: "Productos populares ({count})",
          fr: "Produits populaires ({count})",
          ja: "人気の製品 ({count})",
        }
      },
      {
        key: "ui.product_os.menu.new_products",
        values: {
          en: "New products ({count})",
          de: "Neue Produkte ({count})",
          pl: "Nowe produkty ({count})",
          es: "Nuevos productos ({count})",
          fr: "Nouveaux produits ({count})",
          ja: "新着製品 ({count})",
        }
      },
      {
        key: "ui.product_os.menu.roadmap",
        values: {
          en: "Roadmap",
          de: "Roadmap",
          pl: "Mapa drogowa",
          es: "Hoja de ruta",
          fr: "Feuille de route",
          ja: "ロードマップ",
        }
      },
      {
        key: "ui.product_os.menu.category_count",
        values: {
          en: "{category} ({count})",
          de: "{category} ({count})",
          pl: "{category} ({count})",
          es: "{category} ({count})",
          fr: "{category} ({count})",
          ja: "{category} ({count})",
        }
      },
      {
        key: "ui.product_os.categories",
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
        key: "ui.product_os.more_count",
        values: {
          en: "+{count} more",
          de: "+{count} mehr",
          pl: "+{count} więcej",
          es: "+{count} más",
          fr: "+{count} de plus",
          ja: "さらに{count}件",
        }
      },
      {
        key: "ui.product_os.badge.new",
        values: {
          en: "New",
          de: "Neu",
          pl: "Nowe",
          es: "Nuevo",
          fr: "Nouveau",
          ja: "新着",
        }
      },
      {
        key: "ui.product_os.badge.beta",
        values: {
          en: "Beta",
          de: "Beta",
          pl: "Beta",
          es: "Beta",
          fr: "Bêta",
          ja: "ベータ",
        }
      },
      {
        key: "ui.product_os.badge.wip",
        values: {
          en: "WIP",
          de: "In Arbeit",
          pl: "W trakcie",
          es: "En progreso",
          fr: "En cours",
          ja: "作業中",
        }
      },
      {
        key: "ui.product_os.category.content_publishing",
        values: {
          en: "Content & Publishing",
          de: "Inhalt & Veröffentlichung",
          pl: "Treści i publikacja",
          es: "Contenido y publicación",
          fr: "Contenu et publication",
          ja: "コンテンツと公開",
        }
      },
      {
        key: "ui.product_os.category.customer_management",
        values: {
          en: "Customer Management",
          de: "Kundenmanagement",
          pl: "Zarządzanie klientami",
          es: "Gestión de clientes",
          fr: "Gestion client",
          ja: "顧客管理",
        }
      },
      {
        key: "ui.product_os.category.commerce_payments",
        values: {
          en: "Commerce & Payments",
          de: "Handel & Zahlungen",
          pl: "Handel i płatności",
          es: "Comercio y pagos",
          fr: "Commerce et paiements",
          ja: "コマースと支払い",
        }
      },
      {
        key: "ui.product_os.category.events_ticketing",
        values: {
          en: "Events & Ticketing",
          de: "Veranstaltungen & Ticketing",
          pl: "Wydarzenia i bilety",
          es: "Eventos y entradas",
          fr: "Événements et billetterie",
          ja: "イベントとチケット",
        }
      },
      {
        key: "ui.product_os.category.automation_workflows",
        values: {
          en: "Automation & Workflows",
          de: "Automatisierung & Workflows",
          pl: "Automatyzacja i workflow",
          es: "Automatización y flujos de trabajo",
          fr: "Automatisation et workflows",
          ja: "自動化とワークフロー",
        }
      },
      {
        key: "ui.product_os.category.media_files",
        values: {
          en: "Media & Files",
          de: "Medien & Dateien",
          pl: "Media i pliki",
          es: "Medios y archivos",
          fr: "Médias et fichiers",
          ja: "メディアとファイル",
        }
      },
      {
        key: "ui.product_os.category.revenue_growth",
        values: {
          en: "Revenue & Growth",
          de: "Umsatz & Wachstum",
          pl: "Przychody i wzrost",
          es: "Ingresos y crecimiento",
          fr: "Revenus et croissance",
          ja: "収益と成長",
        }
      },
      {
        key: "ui.product_os.category.ai_intelligence",
        values: {
          en: "AI & Intelligence",
          de: "KI & Intelligenz",
          pl: "AI i inteligencja",
          es: "IA e inteligencia",
          fr: "IA et intelligence",
          ja: "AIとインテリジェンス",
        }
      },
      {
        key: "ui.product_os.category.utilities_tools",
        values: {
          en: "Utilities & Tools",
          de: "Dienstprogramme & Tools",
          pl: "Narzędzia i utility",
          es: "Utilidades y herramientas",
          fr: "Utilitaires et outils",
          ja: "ユーティリティとツール",
        }
      },

      // === PRODUCT OS ALL APPS WINDOW ===
      {
        key: "ui.product_os.about.title",
        values: {
          en: "About Product OS",
          de: "Über Product OS",
          pl: "O Product OS",
          es: "Acerca de Product OS",
          fr: "À propos de Product OS",
          ja: "Product OS について",
        }
      },
      {
        key: "ui.product_os.about.body",
        values: {
          en: "Product OS bundles our full application suite into one discoverable workspace. Teams can launch, connect, and operate products without hopping between tools. Shared navigation keeps capabilities easy to find as your stack grows. The structure is designed for faster onboarding and clearer ownership.",
          de: "Product OS bündelt unsere gesamte Anwendungssuite in einem leicht auffindbaren Workspace. Teams können Produkte starten, verbinden und betreiben, ohne zwischen Tools zu wechseln. Die gemeinsame Navigation macht Funktionen leicht auffindbar, wenn Ihr Stack wächst. Die Struktur ist für schnelleres Onboarding und klarere Verantwortlichkeiten ausgelegt.",
          pl: "Product OS łączy cały nasz zestaw aplikacji w jednym, łatwym do odkrycia obszarze roboczym. Zespoły mogą uruchamiać, łączyć i obsługiwać produkty bez przechodzenia między narzędziami. Wspólna nawigacja ułatwia znajdowanie funkcji wraz ze wzrostem stosu. Ta struktura została zaprojektowana pod szybszy onboarding i czytelniejszą odpowiedzialność.",
          es: "Product OS reúne todo nuestro conjunto de aplicaciones en un espacio de trabajo único y fácil de descubrir. Los equipos pueden lanzar, conectar y operar productos sin saltar entre herramientas. La navegación compartida mantiene las capacidades fáciles de encontrar a medida que crece tu stack. La estructura está diseñada para una incorporación más rápida y una propiedad más clara.",
          fr: "Product OS regroupe toute notre suite d’applications dans un espace de travail unique et facile à explorer. Les équipes peuvent lancer, connecter et exploiter des produits sans passer d’un outil à l’autre. La navigation partagée permet de trouver facilement les capacités à mesure que votre stack évolue. La structure est conçue pour un onboarding plus rapide et des responsabilités plus claires.",
          ja: "Product OSは、全アプリケーションスイートを1つの見つけやすいワークスペースにまとめます。チームはツールを行き来せずに、製品の立ち上げ、連携、運用を行えます。共通ナビゲーションにより、スタックが拡大しても機能をすぐ見つけられます。この構成は、オンボーディングの高速化と責任範囲の明確化を目的としています。",
        }
      },
      {
        key: "ui.product_os.pricing.title",
        values: {
          en: "How pricing works",
          de: "So funktioniert die Preisgestaltung",
          pl: "Jak działa wycena",
          es: "Cómo funciona el precio",
          fr: "Comment fonctionne la tarification",
          ja: "価格の仕組み",
        }
      },
      {
        key: "ui.product_os.pricing.body",
        values: {
          en: "Plans unlock app bundles, usage limits, and advanced automation capabilities.",
          de: "Tarife schalten App-Bundles, Nutzungslimits und erweiterte Automatisierungsfunktionen frei.",
          pl: "Plany odblokowują pakiety aplikacji, limity użycia i zaawansowane możliwości automatyzacji.",
          es: "Los planes desbloquean paquetes de aplicaciones, límites de uso y capacidades avanzadas de automatización.",
          fr: "Les offres débloquent des bundles d’applications, des limites d’utilisation et des capacités d’automatisation avancées.",
          ja: "プランでは、アプリバンドル、利用上限、高度な自動化機能が利用可能になります。",
        }
      },
      {
        key: "ui.product_os.pricing.explore",
        values: {
          en: "Explore pricing",
          de: "Preise ansehen",
          pl: "Zobacz ceny",
          es: "Ver precios",
          fr: "Voir les tarifs",
          ja: "料金を見る",
        }
      },
      {
        key: "ui.product_os.roadmap.sidebar.body",
        values: {
          en: "Preview feature bets and delivery ownership. Interactive voting lands in a future release.",
          de: "Vorschau auf Feature-Schwerpunkte und Lieferverantwortung. Interaktive Abstimmung kommt in einer späteren Version.",
          pl: "Podgląd kierunków funkcji i odpowiedzialności za dostarczenie. Interaktywne głosowanie pojawi się w przyszłym wydaniu.",
          es: "Vista previa de apuestas de producto y ownership de entrega. La votación interactiva llegará en una versión futura.",
          fr: "Aperçu des paris produit et de la responsabilité de livraison. Le vote interactif arrivera dans une prochaine version.",
          ja: "機能方針と提供オーナーシップのプレビューです。インタラクティブ投票は今後のリリースで提供予定です。",
        }
      },
      {
        key: "ui.product_os.roadmap.open",
        values: {
          en: "Open roadmap",
          de: "Roadmap öffnen",
          pl: "Otwórz mapę drogową",
          es: "Abrir hoja de ruta",
          fr: "Ouvrir la feuille de route",
          ja: "ロードマップを開く",
        }
      },
      {
        key: "ui.product_os.search.placeholder",
        values: {
          en: "Search apps",
          de: "Apps suchen",
          pl: "Szukaj aplikacji",
          es: "Buscar aplicaciones",
          fr: "Rechercher des applications",
          ja: "アプリを検索",
        }
      },
      {
        key: "ui.product_os.search.empty.title",
        values: {
          en: "No apps found",
          de: "Keine Apps gefunden",
          pl: "Nie znaleziono aplikacji",
          es: "No se encontraron aplicaciones",
          fr: "Aucune application trouvée",
          ja: "アプリが見つかりません",
        }
      },
      {
        key: "ui.product_os.search.empty.body",
        values: {
          en: "Try a different keyword or browse all categories.",
          de: "Versuchen Sie ein anderes Stichwort oder durchsuchen Sie alle Kategorien.",
          pl: "Spróbuj innego słowa kluczowego lub przeglądaj wszystkie kategorie.",
          es: "Prueba otra palabra clave o explora todas las categorías.",
          fr: "Essayez un autre mot-clé ou parcourez toutes les catégories.",
          ja: "別のキーワードを試すか、すべてのカテゴリを参照してください。",
        }
      },
      {
        key: "ui.product_os.roadmap.title",
        values: {
          en: "Product roadmap (mock)",
          de: "Produkt-Roadmap (Mockup)",
          pl: "Mapa drogowa produktu (makieta)",
          es: "Hoja de ruta del producto (maqueta)",
          fr: "Feuille de route produit (maquette)",
          ja: "プロダクトロードマップ（モック）",
        }
      },
      {
        key: "ui.product_os.roadmap.subtitle",
        values: {
          en: "Static preview of the upcoming roadmap surface. Vote interactions and filtering are planned.",
          de: "Statische Vorschau der kommenden Roadmap-Ansicht. Abstimmung und Filterung sind geplant.",
          pl: "Statyczny podgląd nadchodzącego widoku roadmapy. Planowane są głosowania i filtrowanie.",
          es: "Vista previa estática de la próxima vista de hoja de ruta. Se planean votación interactiva y filtros.",
          fr: "Aperçu statique de la future vue roadmap. Les interactions de vote et le filtrage sont prévus.",
          ja: "今後提供予定のロードマップ画面の静的プレビューです。投票機能とフィルタリングを予定しています。",
        }
      },
      {
        key: "ui.product_os.roadmap.table.votes",
        values: {
          en: "Votes",
          de: "Stimmen",
          pl: "Głosy",
          es: "Votos",
          fr: "Votes",
          ja: "投票数",
        }
      },
      {
        key: "ui.product_os.roadmap.table.team",
        values: {
          en: "Team",
          de: "Team",
          pl: "Zespół",
          es: "Equipo",
          fr: "Équipe",
          ja: "チーム",
        }
      },
      {
        key: "ui.product_os.roadmap.table.feature",
        values: {
          en: "Feature idea",
          de: "Feature-Idee",
          pl: "Pomysł na funkcję",
          es: "Idea de funcionalidad",
          fr: "Idée de fonctionnalité",
          ja: "機能アイデア",
        }
      },
      {
        key: "ui.product_os.roadmap.table.details",
        values: {
          en: "Details",
          de: "Details",
          pl: "Szczegóły",
          es: "Detalles",
          fr: "Détails",
          ja: "詳細",
        }
      },
      {
        key: "ui.product_os.roadmap.table.more_info",
        values: {
          en: "More info",
          de: "Mehr Infos",
          pl: "Więcej informacji",
          es: "Más información",
          fr: "Plus d'infos",
          ja: "詳細情報",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_201.team",
        values: {
          en: "Platform",
          de: "Plattform",
          pl: "Platforma",
          es: "Plataforma",
          fr: "Plateforme",
          ja: "プラットフォーム",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_201.title",
        values: {
          en: "Unified app permissions model",
          de: "Einheitliches App-Berechtigungsmodell",
          pl: "Ujednolicony model uprawnień aplikacji",
          es: "Modelo unificado de permisos de aplicaciones",
          fr: "Modèle unifié d’autorisations applicatives",
          ja: "統一アプリ権限モデル",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_201.details",
        values: {
          en: "Centralize app-level access, org policies, and team roles for safer launches.",
          de: "Zentralisieren Sie App-Zugriffe, Org-Richtlinien und Teamrollen für sicherere Releases.",
          pl: "Scentralizuj dostęp na poziomie aplikacji, polityki organizacji i role zespołów dla bezpieczniejszych wdrożeń.",
          es: "Centraliza el acceso por aplicación, las políticas de organización y los roles del equipo para lanzamientos más seguros.",
          fr: "Centralisez les accès par application, les politiques d’organisation et les rôles d’équipe pour des lancements plus sûrs.",
          ja: "より安全なリリースのために、アプリ単位のアクセス、組織ポリシー、チームロールを一元化します。",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_201.link",
        values: {
          en: "Open proposal",
          de: "Vorschlag öffnen",
          pl: "Otwórz propozycję",
          es: "Abrir propuesta",
          fr: "Ouvrir la proposition",
          ja: "提案を開く",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_202.team",
        values: {
          en: "Product OS",
          de: "Product OS",
          pl: "Product OS",
          es: "Product OS",
          fr: "Product OS",
          ja: "Product OS",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_202.title",
        values: {
          en: "Cross-app command palette",
          de: "App-übergreifende Befehlspalette",
          pl: "Wieloaplikacyjna paleta poleceń",
          es: "Paleta de comandos entre aplicaciones",
          fr: "Palette de commandes inter-applications",
          ja: "アプリ横断コマンドパレット",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_202.details",
        values: {
          en: "Jump to any app surface, action, or record from one keyboard-first interface.",
          de: "Springen Sie von einer keyboard-first Oberfläche zu jeder App-Ansicht, Aktion oder jedem Datensatz.",
          pl: "Przechodź do dowolnej powierzchni aplikacji, akcji lub rekordu z jednego interfejsu keyboard-first.",
          es: "Salta a cualquier superficie, acción o registro de la app desde una única interfaz centrada en teclado.",
          fr: "Accédez à n’importe quelle vue, action ou fiche via une interface unique orientée clavier.",
          ja: "キーボード中心の単一インターフェースから、任意のアプリ画面・操作・レコードへ移動できます。",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_202.link",
        values: {
          en: "View concept",
          de: "Konzept ansehen",
          pl: "Zobacz koncepcję",
          es: "Ver concepto",
          fr: "Voir le concept",
          ja: "コンセプトを見る",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_203.team",
        values: {
          en: "Automation",
          de: "Automatisierung",
          pl: "Automatyzacja",
          es: "Automatización",
          fr: "Automatisation",
          ja: "自動化",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_203.title",
        values: {
          en: "Template-driven onboarding journeys",
          de: "Vorlagenbasierte Onboarding-Journeys",
          pl: "Ścieżki onboardingu oparte na szablonach",
          es: "Recorridos de onboarding guiados por plantillas",
          fr: "Parcours d’onboarding pilotés par des modèles",
          ja: "テンプレート駆動のオンボーディング",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_203.details",
        values: {
          en: "Generate best-practice setup flows for CRM, workflows, and deployment apps.",
          de: "Erstellen Sie Best-Practice-Setup-Flows für CRM-, Workflow- und Deployment-Apps.",
          pl: "Generuj wzorcowe ścieżki konfiguracji dla CRM, workflow i aplikacji deploymentowych.",
          es: "Genera flujos de configuración de mejores prácticas para CRM, workflows y apps de despliegue.",
          fr: "Générez des parcours de configuration de référence pour CRM, workflows et apps de déploiement.",
          ja: "CRM、ワークフロー、デプロイ関連アプリ向けに、ベストプラクティスのセットアップフローを生成します。",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_203.link",
        values: {
          en: "See draft",
          de: "Entwurf ansehen",
          pl: "Zobacz szkic",
          es: "Ver borrador",
          fr: "Voir le brouillon",
          ja: "ドラフトを見る",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_204.team",
        values: {
          en: "Data",
          de: "Daten",
          pl: "Dane",
          es: "Datos",
          fr: "Données",
          ja: "データ",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_204.title",
        values: {
          en: "Live category health metrics",
          de: "Live-Metriken zur Kategorie-Gesundheit",
          pl: "Metryki kondycji kategorii na żywo",
          es: "Métricas en vivo de salud por categoría",
          fr: "Indicateurs en temps réel de santé des catégories",
          ja: "カテゴリ健全性のライブ指標",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_204.details",
        values: {
          en: "Track install velocity, adoption, and retention by app category in real time.",
          de: "Verfolgen Sie Installationsrate, Adoption und Retention nach App-Kategorie in Echtzeit.",
          pl: "Śledź w czasie rzeczywistym tempo instalacji, adopcję i retencję według kategorii aplikacji.",
          es: "Sigue en tiempo real la velocidad de instalación, adopción y retención por categoría de aplicación.",
          fr: "Suivez en temps réel la vitesse d’installation, l’adoption et la rétention par catégorie d’application.",
          ja: "アプリカテゴリごとの導入速度、利用定着、継続率をリアルタイムで追跡します。",
        }
      },
      {
        key: "ui.product_os.roadmap.items.rm_204.link",
        values: {
          en: "Explore metrics",
          de: "Metriken ansehen",
          pl: "Poznaj metryki",
          es: "Explorar métricas",
          fr: "Explorer les indicateurs",
          ja: "指標を見る",
        }
      },
      {
        key: "ui.product_os.browse.library",
        values: {
          en: "Browse app library",
          de: "App-Bibliothek durchsuchen",
          pl: "Przeglądaj bibliotekę aplikacji",
          es: "Explorar biblioteca de aplicaciones",
          fr: "Parcourir la bibliothèque d’applications",
          ja: "アプリライブラリを閲覧",
        }
      },
      {
        key: "ui.product_os.apps_count",
        values: {
          en: "{count} apps",
          de: "{count} Apps",
          pl: "{count} aplikacji",
          es: "{count} aplicaciones",
          fr: "{count} applications",
          ja: "{count}個のアプリ",
        }
      },
      {
        key: "ui.product_os.default_description",
        values: {
          en: "Open {appName}.",
          de: "{appName} öffnen.",
          pl: "Otwórz {appName}.",
          es: "Abrir {appName}.",
          fr: "Ouvrir {appName}.",
          ja: "{appName}を開く。",
        }
      },
      {
        key: "ui.product_os.preview.live_panel",
        values: {
          en: "Live preview panel",
          de: "Live-Vorschaupanel",
          pl: "Panel podglądu na żywo",
          es: "Panel de vista previa en vivo",
          fr: "Panneau d’aperçu en direct",
          ja: "ライブプレビューパネル",
        }
      },
      {
        key: "ui.product_os.preview.open_app",
        values: {
          en: "Open {appName}",
          de: "{appName} öffnen",
          pl: "Otwórz {appName}",
          es: "Abrir {appName}",
          fr: "Ouvrir {appName}",
          ja: "{appName}を開く",
        }
      },
      {
        key: "ui.product_os.preview.select_title",
        values: {
          en: "Select an app to preview",
          de: "Wählen Sie eine App zur Vorschau",
          pl: "Wybierz aplikację do podglądu",
          es: "Selecciona una aplicación para previsualizar",
          fr: "Sélectionnez une application à prévisualiser",
          ja: "プレビューするアプリを選択",
        }
      },
      {
        key: "ui.product_os.preview.select_body",
        values: {
          en: "Hover or choose an app card to load details and launch actions.",
          de: "Bewegen Sie den Mauszeiger über eine App-Karte oder wählen Sie sie aus, um Details und Startaktionen zu laden.",
          pl: "Najedź lub wybierz kartę aplikacji, aby wczytać szczegóły i akcje uruchamiania.",
          es: "Pasa el cursor o elige una tarjeta de aplicación para cargar detalles y acciones de lanzamiento.",
          fr: "Survolez ou sélectionnez une carte d’application pour charger les détails et les actions de lancement.",
          ja: "アプリカードにホバーまたは選択すると、詳細と起動アクションを表示します。",
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
