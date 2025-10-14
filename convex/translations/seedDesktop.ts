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
          en: "L4YERCAK3 Podcast",
          de: "L4YERCAK3 Podcast",
          pl: "L4YERCAK3 Podcast",
          es: "L4YERCAK3 Podcast",
          fr: "L4YERCAK3 Podcast",
          ja: "L4YERCAK3 Podcast",
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
          en: "L4YERCAK3.exe",
          de: "L4YERCAK3.exe",
          pl: "L4YERCAK3.exe",
          es: "L4YERCAK3.exe",
          fr: "L4YERCAK3.exe",
          ja: "L4YERCAK3.exe",
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

    // Load ALL existing translations once (optimized!)
    const existingTranslations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    // Create lookup set for fast duplicate checking
    const existingKeys = new Set(
      existingTranslations.map(t => `${t.name}:${t.locale}`)
    );

    // Seed translations
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const lookupKey = `${trans.key}:${locale.code}`;

          // Check if translation already exists using our Set
          if (!existingKeys.has(lookupKey)) {
            await ctx.db.insert("objects", {
              organizationId: systemOrg._id,
              type: "translation",
              subtype: "ui",
              name: trans.key,
              value: value,
              locale: locale.code,
              status: "approved",
              customProperties: {
                category: "desktop",
                component: "start-menu",
              },
              createdBy: systemUser._id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Desktop & Start Menu translations`);
    return { success: true, count };
  }
});
