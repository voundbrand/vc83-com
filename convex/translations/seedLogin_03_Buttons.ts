/**
 * SEED LOGIN WINDOW TRANSLATIONS - PART 3: BUTTONS, ERRORS & VALIDATION
 *
 * Buttons, error messages, validation messages, and notes
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Login Window translations (Part 3: Buttons & Errors)...");

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

      // Error Messages
      {
        key: "ui.login.error_email_required",
        values: {
          en: "Please enter your email address",
          de: "Bitte gib deine E-Mail-Adresse ein",
          pl: "Proszę wprowadzić adres e-mail",
          es: "Por favor ingresa tu dirección de correo",
          fr: "Veuillez entrer votre adresse e-mail",
          ja: "メールアドレスを入力してください",
        }
      },
      {
        key: "ui.login.error_no_account",
        values: {
          en: "No account found. Please contact an administrator for access.",
          de: "Kein Konto gefunden. Bitte kontaktiere einen Administrator für Zugriff.",
          pl: "Nie znaleziono konta. Skontaktuj się z administratorem, aby uzyskać dostęp.",
          es: "No se encontró cuenta. Contacta a un administrador para acceso.",
          fr: "Aucun compte trouvé. Contactez un administrateur pour l'accès.",
          ja: "アカウントが見つかりません。アクセスについては管理者にお問い合わせください。",
        }
      },
      {
        key: "ui.login.error_generic",
        values: {
          en: "An error occurred",
          de: "Ein Fehler ist aufgetreten",
          pl: "Wystąpił błąd",
          es: "Ocurrió un error",
          fr: "Une erreur s'est produite",
          ja: "エラーが発生しました",
        }
      },
      {
        key: "ui.login.error_invalid_credentials",
        values: {
          en: "Invalid credentials",
          de: "Ungültige Anmeldedaten",
          pl: "Nieprawidłowe dane logowania",
          es: "Credenciales inválidas",
          fr: "Identifiants invalides",
          ja: "無効な認証情報",
        }
      },
      {
        key: "ui.login.error_passwords_mismatch",
        values: {
          en: "Passwords do not match",
          de: "Passwörter stimmen nicht überein",
          pl: "Hasła nie pasują do siebie",
          es: "Las contraseñas no coinciden",
          fr: "Les mots de passe ne correspondent pas",
          ja: "パスワードが一致しません",
        }
      },
      {
        key: "ui.login.error_password_length",
        values: {
          en: "Password must be at least 6 characters",
          de: "Passwort muss mindestens 6 Zeichen lang sein",
          pl: "Hasło musi zawierać co najmniej 6 znaków",
          es: "La contraseña debe tener al menos 6 caracteres",
          fr: "Le mot de passe doit contenir au moins 6 caractères",
          ja: "パスワードは6文字以上である必要があります",
        }
      },

      // Validation Messages
      {
        key: "ui.login.validation_passwords_match",
        values: {
          en: "✓ Passwords match",
          de: "✓ Passwörter stimmen überein",
          pl: "✓ Hasła pasują",
          es: "✓ Las contraseñas coinciden",
          fr: "✓ Les mots de passe correspondent",
          ja: "✓ パスワードが一致します",
        }
      },
      {
        key: "ui.login.validation_passwords_mismatch",
        values: {
          en: "✗ Passwords do not match",
          de: "✗ Passwörter stimmen nicht überein",
          pl: "✗ Hasła nie pasują",
          es: "✗ Las contraseñas no coinciden",
          fr: "✗ Les mots de passe ne correspondent pas",
          ja: "✗ パスワードが一致しません",
        }
      },

      // Notes
      {
        key: "ui.login.note_title",
        values: {
          en: "Note:",
          de: "Hinweis:",
          pl: "Uwaga:",
          es: "Nota:",
          fr: "Remarque:",
          ja: "注意：",
        }
      },
      {
        key: "ui.login.note_invitation_only",
        values: {
          en: "This is an invitation-only system. You must have been granted access by an administrator to sign in.",
          de: "Dies ist ein System nur auf Einladung. Du musst von einem Administrator Zugriff erhalten haben, um dich anzumelden.",
          pl: "To jest system tylko dla zaproszonych. Musisz otrzymać dostęp od administratora, aby się zalogować.",
          es: "Este es un sistema solo por invitación. Debes haber recibido acceso de un administrador para iniciar sesión.",
          fr: "Il s'agit d'un système sur invitation uniquement. Vous devez avoir reçu l'accès d'un administrateur pour vous connecter.",
          ja: "これは招待制のシステムです。サインインするには管理者からアクセス権を付与されている必要があります。",
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

    console.log(`✅ Seeded ${count} Login Window translations (Part 3)`);
    return { success: true, count };
  }
});
