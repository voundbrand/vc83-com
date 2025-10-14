/**
 * SEED LOGIN WINDOW TRANSLATIONS - PART 3A: BUTTONS
 *
 * All button labels and loading states
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Login Window translations (Part 3a: Buttons)...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

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
      // Buttons
      {
        key: "ui.login.button_continue",
        values: {
          en: "CONTINUE",
          de: "WEITER",
          pl: "KONTYNUUJ",
          es: "CONTINUAR",
          fr: "CONTINUER",
          ja: "続ける",
        }
      },
      {
        key: "ui.login.button_checking",
        values: {
          en: "CHECKING...",
          de: "PRÜFE...",
          pl: "SPRAWDZANIE...",
          es: "VERIFICANDO...",
          fr: "VÉRIFICATION...",
          ja: "確認中...",
        }
      },
      {
        key: "ui.login.button_sign_in",
        values: {
          en: "SIGN IN",
          de: "ANMELDEN",
          pl: "ZALOGUJ",
          es: "INICIAR SESIÓN",
          fr: "SE CONNECTER",
          ja: "サインイン",
        }
      },
      {
        key: "ui.login.button_signing_in",
        values: {
          en: "SIGNING IN...",
          de: "MELDE AN...",
          pl: "LOGOWANIE...",
          es: "INICIANDO SESIÓN...",
          fr: "CONNEXION...",
          ja: "サインイン中...",
        }
      },
      {
        key: "ui.login.button_sign_out",
        values: {
          en: "SIGN OUT",
          de: "ABMELDEN",
          pl: "WYLOGUJ",
          es: "CERRAR SESIÓN",
          fr: "SE DÉCONNECTER",
          ja: "サインアウト",
        }
      },
      {
        key: "ui.login.button_set_password",
        values: {
          en: "SET PASSWORD",
          de: "PASSWORT FESTLEGEN",
          pl: "USTAW HASŁO",
          es: "ESTABLECER CONTRASEÑA",
          fr: "DÉFINIR LE MOT DE PASSE",
          ja: "パスワードを設定",
        }
      },
      {
        key: "ui.login.button_setting_up",
        values: {
          en: "SETTING UP...",
          de: "RICHTE EIN...",
          pl: "KONFIGUROWANIE...",
          es: "CONFIGURANDO...",
          fr: "CONFIGURATION...",
          ja: "設定中...",
        }
      },
      {
        key: "ui.login.button_back",
        values: {
          en: "BACK",
          de: "ZURÜCK",
          pl: "WSTECZ",
          es: "ATRÁS",
          fr: "RETOUR",
          ja: "戻る",
        }
      },
      {
        key: "ui.login.button_use_different_email",
        values: {
          en: "USE DIFFERENT EMAIL",
          de: "ANDERE E-MAIL VERWENDEN",
          pl: "UŻYJ INNEGO E-MAILA",
          es: "USAR OTRO CORREO",
          fr: "UTILISER UN AUTRE E-MAIL",
          ja: "別のメールを使用",
        }
      },
    ];

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

    console.log(`✅ Seeded ${count} Login Window translations (Part 3a)`);
    return { success: true, count };
  }
});
