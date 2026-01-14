/**
 * SEED ONBOARDING WELCOME SCREEN TRANSLATIONS
 *
 * Seeds translations for the onboarding welcome screen shown to first-time users.
 * Supports browser language detection for new users who haven't set preferences yet.
 *
 * Run: npx convex run translations/seedOnboarding:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Onboarding Welcome Screen translations...");

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
      // === WINDOW TITLES ===
      {
        key: "ui.windows.onboarding_welcome.title",
        values: {
          en: "Welcome",
          de: "Willkommen",
          pl: "Witaj",
          es: "Bienvenido",
          fr: "Bienvenue",
          ja: "ようこそ",
        }
      },
      {
        key: "ui.windows.web_publishing.title",
        values: {
          en: "Web Publishing",
          de: "Web-Publishing",
          pl: "Publikowanie stron",
          es: "Publicación web",
          fr: "Publication web",
          ja: "Webパブリッシング",
        }
      },

      // === HEADER ===
      {
        key: "ui.onboarding.welcome.header_title",
        values: {
          en: "Welcome to l4yercak3",
          de: "Willkommen bei l4yercak3",
          pl: "Witaj w l4yercak3",
          es: "Bienvenido a l4yercak3",
          fr: "Bienvenue sur l4yercak3",
          ja: "l4yercak3へようこそ",
        }
      },
      {
        key: "ui.onboarding.welcome.header_subtitle",
        values: {
          en: "Get started with your new workspace",
          de: "Starten Sie mit Ihrem neuen Arbeitsbereich",
          pl: "Rozpocznij pracę z nowym obszarem roboczym",
          es: "Comienza con tu nuevo espacio de trabajo",
          fr: "Commencez avec votre nouvel espace de travail",
          ja: "新しいワークスペースを始めましょう",
        }
      },

      // === MAIN CTA ===
      {
        key: "ui.onboarding.welcome.deploy_now",
        values: {
          en: "Deploy Web App Now",
          de: "Web-App jetzt bereitstellen",
          pl: "Wdróż aplikację teraz",
          es: "Desplegar aplicación web ahora",
          fr: "Déployer l'application web maintenant",
          ja: "今すぐWebアプリをデプロイ",
        }
      },
      {
        key: "ui.onboarding.welcome.deploy_description",
        values: {
          en: "Deploy a professional client portal in one click",
          de: "Stellen Sie ein professionelles Kundenportal mit einem Klick bereit",
          pl: "Wdróż profesjonalny portal klienta jednym kliknięciem",
          es: "Despliega un portal de cliente profesional con un clic",
          fr: "Déployez un portail client professionnel en un clic",
          ja: "ワンクリックでプロフェッショナルなクライアントポータルをデプロイ",
        }
      },

      // === QUICK ACTIONS SECTION ===
      {
        key: "ui.onboarding.welcome.quick_actions",
        values: {
          en: "Quick Actions",
          de: "Schnellaktionen",
          pl: "Szybkie akcje",
          es: "Acciones rápidas",
          fr: "Actions rapides",
          ja: "クイックアクション",
        }
      },

      // === ACTION TILES ===
      {
        key: "ui.onboarding.welcome.docs_tutorials",
        values: {
          en: "Docs & Tutorials",
          de: "Dokumentation & Tutorials",
          pl: "Dokumentacja i samouczki",
          es: "Documentación y tutoriales",
          fr: "Documentation et tutoriels",
          ja: "ドキュメントとチュートリアル",
        }
      },
      {
        key: "ui.onboarding.welcome.docs_tutorials_desc",
        values: {
          en: "Learn the basics",
          de: "Lernen Sie die Grundlagen",
          pl: "Poznaj podstawy",
          es: "Aprende lo básico",
          fr: "Apprenez les bases",
          ja: "基本を学ぶ",
        }
      },
      {
        key: "ui.onboarding.welcome.explore_crm",
        values: {
          en: "Explore CRM",
          de: "CRM erkunden",
          pl: "Odkryj CRM",
          es: "Explorar CRM",
          fr: "Explorer le CRM",
          ja: "CRMを探索",
        }
      },
      {
        key: "ui.onboarding.welcome.explore_crm_desc",
        values: {
          en: "Manage contacts",
          de: "Kontakte verwalten",
          pl: "Zarządzaj kontaktami",
          es: "Gestionar contactos",
          fr: "Gérer les contacts",
          ja: "連絡先を管理",
        }
      },
      {
        key: "ui.onboarding.welcome.settings",
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
        key: "ui.onboarding.welcome.settings_desc",
        values: {
          en: "Configure account",
          de: "Konto konfigurieren",
          pl: "Skonfiguruj konto",
          es: "Configurar cuenta",
          fr: "Configurer le compte",
          ja: "アカウントを設定",
        }
      },
      {
        key: "ui.onboarding.welcome.customize_desktop",
        values: {
          en: "Customize Desktop",
          de: "Desktop anpassen",
          pl: "Dostosuj pulpit",
          es: "Personalizar escritorio",
          fr: "Personnaliser le bureau",
          ja: "デスクトップをカスタマイズ",
        }
      },
      {
        key: "ui.onboarding.welcome.customize_desktop_desc",
        values: {
          en: "Personalize workspace",
          de: "Arbeitsbereich personalisieren",
          pl: "Spersonalizuj obszar roboczy",
          es: "Personalizar espacio de trabajo",
          fr: "Personnaliser l'espace de travail",
          ja: "ワークスペースをパーソナライズ",
        }
      },
      {
        key: "ui.onboarding.welcome.setup_oauth",
        values: {
          en: "Setup OAuth",
          de: "OAuth einrichten",
          pl: "Skonfiguruj OAuth",
          es: "Configurar OAuth",
          fr: "Configurer OAuth",
          ja: "OAuthを設定",
        }
      },
      {
        key: "ui.onboarding.welcome.setup_oauth_desc",
        values: {
          en: "Enable integrations",
          de: "Integrationen aktivieren",
          pl: "Włącz integracje",
          es: "Habilitar integraciones",
          fr: "Activer les intégrations",
          ja: "統合を有効にする",
        }
      },
      {
        key: "ui.onboarding.welcome.look_around",
        values: {
          en: "Look Around",
          de: "Umsehen",
          pl: "Rozejrzyj się",
          es: "Explorar",
          fr: "Explorer",
          ja: "見て回る",
        }
      },
      {
        key: "ui.onboarding.welcome.look_around_desc",
        values: {
          en: "Explore on your own",
          de: "Erkunden Sie selbst",
          pl: "Odkryj na własną rękę",
          es: "Explora por tu cuenta",
          fr: "Explorez par vous-même",
          ja: "自分で探索する",
        }
      },
    ];

    // Seed translations using upsert (updates existing, inserts new)
    let count = 0;
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
            "onboarding"
          );

          if (result.inserted || result.updated) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} onboarding translations (${translations.length} keys × ${supportedLocales.length} languages)`);

    return {
      success: true,
      count,
      totalTranslations: translations.length * supportedLocales.length,
    };
  },
});
