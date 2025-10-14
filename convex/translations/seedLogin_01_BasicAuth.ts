/**
 * SEED LOGIN WINDOW TRANSLATIONS - PART 1: BASIC AUTH
 *
 * Basic authentication UI strings (titles, system access, sign in/out)
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Login Window translations (Part 1: Basic Auth)...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) throw new Error("System user not found");

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // System Access Screen
      {
        key: "ui.login.title_system_access",
        values: {
          en: "SYSTEM ACCESS",
          de: "SYSTEMZUGRIFF",
          pl: "DOSTĘP DO SYSTEMU",
          es: "ACCESO AL SISTEMA",
          fr: "ACCÈS SYSTÈME",
          ja: "システムアクセス",
        }
      },
      {
        key: "ui.login.subtitle_enter_email",
        values: {
          en: "Enter your email address to continue",
          de: "Gib deine E-Mail-Adresse ein, um fortzufahren",
          pl: "Wprowadź swój adres e-mail, aby kontynuować",
          es: "Ingresa tu dirección de correo electrónico para continuar",
          fr: "Entrez votre adresse e-mail pour continuer",
          ja: "続行するにはメールアドレスを入力してください",
        }
      },

      // Sign In Screen
      {
        key: "ui.login.title_sign_in",
        values: {
          en: "SIGN IN",
          de: "ANMELDEN",
          pl: "ZALOGUJ SIĘ",
          es: "INICIAR SESIÓN",
          fr: "SE CONNECTER",
          ja: "サインイン",
        }
      },

      // Welcome / Setup Screen
      {
        key: "ui.login.title_welcome",
        values: {
          en: "WELCOME!",
          de: "WILLKOMMEN!",
          pl: "WITAMY!",
          es: "¡BIENVENIDO!",
          fr: "BIENVENUE!",
          ja: "ようこそ！",
        }
      },
      {
        key: "ui.login.subtitle_hello",
        values: {
          en: "Hello {name}!",
          de: "Hallo {name}!",
          pl: "Cześć {name}!",
          es: "¡Hola {name}!",
          fr: "Bonjour {name}!",
          ja: "こんにちは {name}！",
        }
      },
      {
        key: "ui.login.subtitle_setup_password",
        values: {
          en: "Set up your password to continue",
          de: "Richte dein Passwort ein, um fortzufahren",
          pl: "Ustaw hasło, aby kontynuować",
          es: "Configura tu contraseña para continuar",
          fr: "Configurez votre mot de passe pour continuer",
          ja: "続行するにはパスワードを設定してください",
        }
      },

      // Logged In Status
      {
        key: "ui.login.welcome",
        values: {
          en: "Welcome, {name}!",
          de: "Willkommen, {name}!",
          pl: "Witamy, {name}!",
          es: "¡Bienvenido, {name}!",
          fr: "Bienvenue, {name}!",
          ja: "ようこそ、{name}！",
        }
      },
      {
        key: "ui.login.status_logged_in",
        values: {
          en: "You are currently logged in",
          de: "Du bist derzeit angemeldet",
          pl: "Jesteś obecnie zalogowany",
          es: "Actualmente has iniciado sesión",
          fr: "Vous êtes actuellement connecté",
          ja: "現在ログインしています",
        }
      },
    ];

    // Seed translations
    // Get all unique translation keys
    const allKeys = translations.map(t => t.key);

    // Efficiently check which translations already exist
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    // Insert only new translations
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
            "login",
            "login-window"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Login Window translations (Part 1)`);
    return { success: true, count };
  }
});
