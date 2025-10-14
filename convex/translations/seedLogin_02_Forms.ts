/**
 * SEED LOGIN WINDOW TRANSLATIONS - PART 2: FORMS & LABELS
 *
 * Form labels, placeholders, and buttons
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Login Window translations (Part 2: Forms)...");

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
      // Form Labels
      {
        key: "ui.login.label_email",
        values: {
          en: "E-MAIL",
          de: "E-MAIL",
          pl: "E-MAIL",
          es: "CORREO ELECTRÓNICO",
          fr: "E-MAIL",
          ja: "メール",
        }
      },
      {
        key: "ui.login.label_password",
        values: {
          en: "PASSWORD",
          de: "PASSWORT",
          pl: "HASŁO",
          es: "CONTRASEÑA",
          fr: "MOT DE PASSE",
          ja: "パスワード",
        }
      },
      {
        key: "ui.login.label_confirm_password",
        values: {
          en: "CONFIRM PASSWORD",
          de: "PASSWORT BESTÄTIGEN",
          pl: "POTWIERDŹ HASŁO",
          es: "CONFIRMAR CONTRASEÑA",
          fr: "CONFIRMER LE MOT DE PASSE",
          ja: "パスワードを確認",
        }
      },
      {
        key: "ui.login.label_first_name",
        values: {
          en: "FIRST NAME (Optional)",
          de: "VORNAME (Optional)",
          pl: "IMIĘ (Opcjonalne)",
          es: "NOMBRE (Opcional)",
          fr: "PRÉNOM (Optionnel)",
          ja: "名 (オプション)",
        }
      },
      {
        key: "ui.login.label_last_name",
        values: {
          en: "LAST NAME (Optional)",
          de: "NACHNAME (Optional)",
          pl: "NAZWISKO (Opcjonalne)",
          es: "APELLIDO (Opcional)",
          fr: "NOM DE FAMILLE (Optionnel)",
          ja: "姓 (オプション)",
        }
      },
      {
        key: "ui.login.label_user_id",
        values: {
          en: "User ID",
          de: "Benutzer-ID",
          pl: "ID użytkownika",
          es: "ID de usuario",
          fr: "ID utilisateur",
          ja: "ユーザーID",
        }
      },

      // Placeholders
      {
        key: "ui.login.placeholder_email",
        values: {
          en: "user@example.com",
          de: "benutzer@beispiel.de",
          pl: "użytkownik@przykład.pl",
          es: "usuario@ejemplo.com",
          fr: "utilisateur@exemple.fr",
          ja: "user@example.com",
        }
      },
      {
        key: "ui.login.placeholder_password",
        values: {
          en: "At least 6 characters",
          de: "Mindestens 6 Zeichen",
          pl: "Co najmniej 6 znaków",
          es: "Al menos 6 caracteres",
          fr: "Au moins 6 caractères",
          ja: "最低6文字",
        }
      },

      // Accessibility Labels
      {
        key: "ui.login.aria_show_password",
        values: {
          en: "Show password",
          de: "Passwort anzeigen",
          pl: "Pokaż hasło",
          es: "Mostrar contraseña",
          fr: "Afficher le mot de passe",
          ja: "パスワードを表示",
        }
      },
      {
        key: "ui.login.aria_hide_password",
        values: {
          en: "Hide password",
          de: "Passwort verbergen",
          pl: "Ukryj hasło",
          es: "Ocultar contraseña",
          fr: "Masquer le mot de passe",
          ja: "パスワードを隠す",
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

    console.log(`✅ Seeded ${count} Login Window translations (Part 2)`);
    return { success: true, count };
  }
});
