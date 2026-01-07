/**
 * SEED WINDOW TITLES TRANSLATIONS
 *
 * Seeds translations for all window titleKey values used in window-registry.tsx
 * These are the titles that appear in window title bars and taskbar.
 *
 * Run: npx convex run translations/seedWindowTitles:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Window Titles translations...");

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

    // All window titles from window-registry.tsx
    const translations = [
      // === CORE SYSTEM WINDOWS ===
      {
        key: "ui.windows.ai_assistant.title",
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
        key: "ui.windows.manage.title",
        values: {
          en: "Manage",
          de: "Verwalten",
          pl: "Zarządzaj",
          es: "Administrar",
          fr: "Gérer",
          ja: "管理",
        }
      },
      {
        key: "ui.windows.control_panel.title",
        values: {
          en: "Control Panel",
          de: "Systemsteuerung",
          pl: "Panel sterowania",
          es: "Panel de control",
          fr: "Panneau de configuration",
          ja: "コントロールパネル",
        }
      },
      {
        key: "ui.windows.organizations.title",
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
        key: "ui.windows.settings.title",
        values: {
          en: "Settings",
          de: "Einstellungen",
          pl: "Ustawienia",
          es: "Configuración",
          fr: "Paramètres",
          ja: "設定",
        }
      },

      // === BUSINESS APPS ===
      {
        key: "ui.windows.crm.title",
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
        key: "ui.windows.store.title",
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
        key: "ui.windows.compliance.title",
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
        key: "ui.windows.translations.title",
        values: {
          en: "Translations",
          de: "Übersetzungen",
          pl: "Tłumaczenia",
          es: "Traducciones",
          fr: "Traductions",
          ja: "翻訳",
        }
      },

      // === INFO WINDOWS ===
      {
        key: "ui.windows.about.title",
        values: {
          en: "About",
          de: "Über",
          pl: "O programie",
          es: "Acerca de",
          fr: "À propos",
          ja: "情報",
        }
      },
      {
        key: "ui.windows.welcome.title",
        values: {
          en: "Welcome",
          de: "Willkommen",
          pl: "Witaj",
          es: "Bienvenido",
          fr: "Bienvenue",
          ja: "ようこそ",
        }
      },

      // === UTILITY WINDOWS ===
      {
        key: "ui.windows.all_apps.title",
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
        key: "ui.windows.cart.title",
        values: {
          en: "Shopping Cart",
          de: "Warenkorb",
          pl: "Koszyk",
          es: "Carrito de compras",
          fr: "Panier",
          ja: "ショッピングカート",
        }
      },
      {
        key: "ui.windows.media_library.title",
        values: {
          en: "Media Library",
          de: "Medienbibliothek",
          pl: "Biblioteka multimediów",
          es: "Biblioteca multimedia",
          fr: "Bibliothèque multimédia",
          ja: "メディアライブラリ",
        }
      },

      // === COMMERCE WINDOWS ===
      {
        key: "ui.windows.payments.title",
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
        key: "ui.windows.products.title",
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
        key: "ui.windows.tickets.title",
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
        key: "ui.windows.certificates.title",
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
        key: "ui.windows.events.title",
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
        key: "ui.windows.checkout.title",
        values: {
          en: "Checkout",
          de: "Kasse",
          pl: "Kasa",
          es: "Caja",
          fr: "Caisse",
          ja: "チェックアウト",
        }
      },

      // === WORKFLOW WINDOWS ===
      {
        key: "ui.windows.forms.title",
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
        key: "ui.windows.web_publishing.title",
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
        key: "ui.windows.invoicing.title",
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
        key: "ui.windows.workflows.title",
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
        key: "ui.windows.templates.title",
        values: {
          en: "Templates",
          de: "Vorlagen",
          pl: "Szablony",
          es: "Plantillas",
          fr: "Modèles",
          ja: "テンプレート",
        }
      },

      // === INTEGRATION WINDOWS ===
      {
        key: "ui.windows.integrations.title",
        values: {
          en: "Integrations & API",
          de: "Integrationen & API",
          pl: "Integracje i API",
          es: "Integraciones y API",
          fr: "Intégrations et API",
          ja: "連携とAPI",
        }
      },
      {
        key: "ui.windows.oauth_tutorial.title",
        values: {
          en: "OAuth Tutorial",
          de: "OAuth-Tutorial",
          pl: "Samouczek OAuth",
          es: "Tutorial de OAuth",
          fr: "Tutoriel OAuth",
          ja: "OAuthチュートリアル",
        }
      },
      {
        key: "ui.windows.tutorials_docs.title",
        values: {
          en: "Tutorials & Docs",
          de: "Tutorials & Dokumente",
          pl: "Samouczki i dokumentacja",
          es: "Tutoriales y documentación",
          fr: "Tutoriels et documentation",
          ja: "チュートリアルとドキュメント",
        }
      },

      // === ONBOARDING WINDOWS ===
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
            "ui",
            "windows"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} window title translations`);
    return { success: true, count, totalKeys: translations.length };
  }
});
