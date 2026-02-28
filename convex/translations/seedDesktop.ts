/**
 * SEED DESKTOP & START MENU TRANSLATIONS
 *
 * Seeds translations for:
 * - Desktop page (page.tsx)
 * - Start menu items
 * - Taskbar elements
 *
 * Run: npx convex run translations/seedDesktop:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Desktop & Start Menu translations...");

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
      // === START MENU ITEMS ===
      {
        key: "ui.startmenu.programs",
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
        key: "ui.startmenu.documents",
        values: {
          en: "Documents",
          de: "Dokumente",
          pl: "Dokumenty",
          es: "Documentos",
          fr: "Documents",
          ja: "ドキュメント",
        }
      },
      {
        key: "ui.startmenu.settings",
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
        key: "ui.startmenu.organizations",
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
        key: "ui.startmenu.switch_organization",
        values: {
          en: "Switch Organization",
          de: "Organisation wechseln",
          pl: "Zmień organizację",
          es: "Cambiar organización",
          fr: "Changer d'organisation",
          ja: "組織を切り替え",
        }
      },
      {
        key: "ui.startmenu.shutdown",
        values: {
          en: "Shut Down",
          de: "Herunterfahren",
          pl: "Zamknij system",
          es: "Apagar",
          fr: "Arrêter",
          ja: "シャットダウン",
        }
      },
      {
        key: "ui.startmenu.sign_out",
        values: {
          en: "Sign Out",
          de: "Abmelden",
          pl: "Wyloguj się",
          es: "Cerrar sesión",
          fr: "Se déconnecter",
          ja: "サインアウト",
        }
      },

      // === PROGRAM NAMES ===
      {
        key: "ui.desktop.program.layer_docs",
        values: {
          en: "L4YER.docs",
          de: "L4YER.docs",
          pl: "L4YER.docs",
          es: "L4YER.docs",
          fr: "L4YER.docs",
          ja: "L4YER.docs",
        }
      },
      {
        key: "ui.desktop.program.podcast",
        values: {
          en: "sevenlayers.io Podcast",
          de: "sevenlayers.io Podcast",
          pl: "sevenlayers.io Podcast",
          es: "sevenlayers.io Podcast",
          fr: "sevenlayers.io Podcast",
          ja: "sevenlayers.io Podcast",
        }
      },
      {
        key: "ui.desktop.program.subscribe",
        values: {
          en: "Subscribe",
          de: "Abonnieren",
          pl: "Subskrybuj",
          es: "Suscribirse",
          fr: "S'abonner",
          ja: "購読",
        }
      },

      // === DESKTOP ICONS ===
      {
        key: "ui.desktop.icon.welcome",
        values: {
          en: "Welcome",
          de: "Willkommen",
          pl: "Witamy",
          es: "Bienvenido",
          fr: "Bienvenue",
          ja: "ようこそ",
        }
      },
      {
        key: "ui.desktop.icon.settings",
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
        key: "ui.desktop.icon.login",
        values: {
          en: "User Account",
          de: "Benutzerkonto",
          pl: "Konto użytkownika",
          es: "Cuenta de usuario",
          fr: "Compte utilisateur",
          ja: "ユーザーアカウント",
        }
      },

      // === TASKBAR ===
      {
        key: "ui.taskbar.start",
        values: {
          en: "Start",
          de: "Start",
          pl: "Start",
          es: "Inicio",
          fr: "Démarrer",
          ja: "スタート",
        }
      },

      // === WINDOW TITLES ===
      {
        key: "ui.desktop.window_title.welcome",
        values: {
          en: "sevenlayers.io",
          de: "sevenlayers.io",
          pl: "sevenlayers.io",
          es: "sevenlayers.io",
          fr: "sevenlayers.io",
          ja: "sevenlayers.io",
        }
      },
      {
        key: "ui.desktop.window_title.settings",
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
        key: "ui.desktop.window_title.login",
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
        key: "ui.desktop.window_title.layer_docs",
        values: {
          en: "L4YER.docs",
          de: "L4YER.docs",
          pl: "L4YER.docs",
          es: "L4YER.docs",
          fr: "L4YER.docs",
          ja: "L4YER.docs",
        }
      },

      // === AUTH MESSAGES ===
      {
        key: "ui.desktop.auth.login_required",
        values: {
          en: "Please sign in to access this feature",
          de: "Bitte melde dich an, um auf diese Funktion zuzugreifen",
          pl: "Zaloguj się, aby uzyskać dostęp do tej funkcji",
          es: "Inicia sesión para acceder a esta función",
          fr: "Veuillez vous connecter pour accéder à cette fonctionnalité",
          ja: "この機能にアクセスするにはサインインしてください",
        }
      },
      {
        key: "ui.desktop.auth.coming_soon",
        values: {
          en: "Coming soon",
          de: "Demnächst",
          pl: "Wkrótce",
          es: "Próximamente",
          fr: "Bientôt disponible",
          ja: "近日公開",
        }
      },
    ];

    // Seed translations (upsert: insert new, update existing)
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
            "desktop",
            "start-menu"
          );
          if (result.inserted) inserted++;
          if (result.updated) updated++;
        }
      }
    }

    console.log(`✅ Seeded Desktop & Start Menu translations: ${inserted} inserted, ${updated} updated`);
    return { success: true, inserted, updated };
  }
});
