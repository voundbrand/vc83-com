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
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

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

      // === SYSTEM APPS ===
      {
        key: "ui.app.l4yercak3_exe",
        values: {
          en: "L4YERCAK3.exe",
          de: "L4YERCAK3.exe",
          pl: "L4YERCAK3.exe",
          es: "L4YERCAK3.exe",
          fr: "L4YERCAK3.exe",
          ja: "L4YERCAK3.exe",
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
            "start-menu"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} start menu & app name translations`);
    return { success: true, count, totalKeys: translations.length };
  }
});
