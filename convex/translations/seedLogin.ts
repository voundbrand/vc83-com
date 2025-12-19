/**
 * SEED LOGIN WINDOW TRANSLATIONS
 *
 * Seeds translations for:
 * - Login/User Account window
 * - Sign in/sign up forms
 * - Password reset
 * - Error messages
 *
 * Run: npx convex run translations/seedLogin:seed
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Login Window translations...");

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
      // === MAIN TITLES ===
      {
        key: "ui.login.title",
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
        key: "ui.login.sign_in_title",
        values: {
          en: "Sign In",
          de: "Anmelden",
          pl: "Zaloguj się",
          es: "Iniciar sesión",
          fr: "Se connecter",
          ja: "サインイン",
        }
      },
      {
        key: "ui.login.sign_up_title",
        values: {
          en: "Create Account",
          de: "Konto erstellen",
          pl: "Utwórz konto",
          es: "Crear cuenta",
          fr: "Créer un compte",
          ja: "アカウント作成",
        }
      },

      // === FORM LABELS ===
      {
        key: "ui.login.email_label",
        values: {
          en: "Email Address",
          de: "E-Mail-Adresse",
          pl: "Adres email",
          es: "Dirección de correo electrónico",
          fr: "Adresse e-mail",
          ja: "メールアドレス",
        }
      },
      {
        key: "ui.login.password_label",
        values: {
          en: "Password",
          de: "Passwort",
          pl: "Hasło",
          es: "Contraseña",
          fr: "Mot de passe",
          ja: "パスワード",
        }
      },
      {
        key: "ui.login.confirm_password_label",
        values: {
          en: "Confirm Password",
          de: "Passwort bestätigen",
          pl: "Potwierdź hasło",
          es: "Confirmar contraseña",
          fr: "Confirmer le mot de passe",
          ja: "パスワード確認",
        }
      },
      {
        key: "ui.login.remember_me",
        values: {
          en: "Remember me",
          de: "Angemeldet bleiben",
          pl: "Zapamiętaj mnie",
          es: "Recuérdame",
          fr: "Se souvenir de moi",
          ja: "ログイン状態を保持",
        }
      },

      // === BUTTONS ===
      {
        key: "ui.login.button.sign_in",
        values: {
          en: "Sign In",
          de: "Anmelden",
          pl: "Zaloguj się",
          es: "Iniciar sesión",
          fr: "Se connecter",
          ja: "サインイン",
        }
      },
      {
        key: "ui.login.button.sign_up",
        values: {
          en: "Sign Up",
          de: "Registrieren",
          pl: "Zarejestruj się",
          es: "Registrarse",
          fr: "S'inscrire",
          ja: "登録",
        }
      },
      {
        key: "ui.login.button.forgot_password",
        values: {
          en: "Forgot Password?",
          de: "Passwort vergessen?",
          pl: "Zapomniałeś hasła?",
          es: "¿Olvidaste tu contraseña?",
          fr: "Mot de passe oublié ?",
          ja: "パスワードをお忘れですか？",
        }
      },
      {
        key: "ui.login.button.reset_password",
        values: {
          en: "Reset Password",
          de: "Passwort zurücksetzen",
          pl: "Zresetuj hasło",
          es: "Restablecer contraseña",
          fr: "Réinitialiser le mot de passe",
          ja: "パスワードリセット",
        }
      },
      {
        key: "ui.login.button.back_to_login",
        values: {
          en: "Back to Login",
          de: "Zurück zur Anmeldung",
          pl: "Powrót do logowania",
          es: "Volver al inicio de sesión",
          fr: "Retour à la connexion",
          ja: "ログインに戻る",
        }
      },
      {
        key: "ui.login.last_used",
        values: {
          en: "Last used",
          de: "Zuletzt verwendet",
          pl: "Ostatnio używane",
          es: "Último usado",
          fr: "Dernière utilisation",
          ja: "最後に使用",
        }
      },

      // === LINKS ===
      {
        key: "ui.login.link.need_account",
        values: {
          en: "Need an account?",
          de: "Brauchst du ein Konto?",
          pl: "Potrzebujesz konta?",
          es: "¿Necesitas una cuenta?",
          fr: "Besoin d'un compte ?",
          ja: "アカウントが必要ですか？",
        }
      },
      {
        key: "ui.login.link.have_account",
        values: {
          en: "Already have an account?",
          de: "Hast du bereits ein Konto?",
          pl: "Masz już konto?",
          es: "¿Ya tienes una cuenta?",
          fr: "Vous avez déjà un compte ?",
          ja: "すでにアカウントをお持ちですか？",
        }
      },

      // === MESSAGES ===
      {
        key: "ui.login.message.success",
        values: {
          en: "Successfully signed in!",
          de: "Erfolgreich angemeldet!",
          pl: "Pomyślnie zalogowano!",
          es: "¡Inicio de sesión exitoso!",
          fr: "Connexion réussie !",
          ja: "サインインに成功しました！",
        }
      },
      {
        key: "ui.login.message.loading",
        values: {
          en: "Loading...",
          de: "Laden...",
          pl: "Ładowanie...",
          es: "Cargando...",
          fr: "Chargement...",
          ja: "読み込み中...",
        }
      },
      {
        key: "ui.login.message.email_sent",
        values: {
          en: "Password reset email sent! Check your inbox.",
          de: "Passwort-Zurücksetzen-E-Mail gesendet! Überprüfe deinen Posteingang.",
          pl: "Wysłano email z resetowaniem hasła! Sprawdź swoją skrzynkę.",
          es: "¡Correo de restablecimiento de contraseña enviado! Revisa tu bandeja de entrada.",
          fr: "E-mail de réinitialisation du mot de passe envoyé ! Vérifiez votre boîte de réception.",
          ja: "パスワードリセットメールを送信しました！受信トレイを確認してください。",
        }
      },

      // === ERROR MESSAGES ===
      {
        key: "ui.login.error.invalid_credentials",
        values: {
          en: "Invalid email or password",
          de: "Ungültige E-Mail oder Passwort",
          pl: "Nieprawidłowy email lub hasło",
          es: "Correo electrónico o contraseña no válidos",
          fr: "E-mail ou mot de passe invalide",
          ja: "メールアドレスまたはパスワードが無効です",
        }
      },
      {
        key: "ui.login.error.email_required",
        values: {
          en: "Email is required",
          de: "E-Mail ist erforderlich",
          pl: "Email jest wymagany",
          es: "El correo electrónico es obligatorio",
          fr: "L'e-mail est requis",
          ja: "メールアドレスは必須です",
        }
      },
      {
        key: "ui.login.error.password_required",
        values: {
          en: "Password is required",
          de: "Passwort ist erforderlich",
          pl: "Hasło jest wymagane",
          es: "La contraseña es obligatoria",
          fr: "Le mot de passe est requis",
          ja: "パスワードは必須です",
        }
      },
      {
        key: "ui.login.error.password_mismatch",
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
        key: "ui.login.error.password_too_short",
        values: {
          en: "Password must be at least 8 characters",
          de: "Passwort muss mindestens 8 Zeichen lang sein",
          pl: "Hasło musi mieć co najmniej 8 znaków",
          es: "La contraseña debe tener al menos 8 caracteres",
          fr: "Le mot de passe doit contenir au moins 8 caractères",
          ja: "パスワードは8文字以上である必要があります",
        }
      },
      {
        key: "ui.login.error.email_exists",
        values: {
          en: "An account with this email already exists",
          de: "Ein Konto mit dieser E-Mail existiert bereits",
          pl: "Konto z tym adresem email już istnieje",
          es: "Ya existe una cuenta con este correo electrónico",
          fr: "Un compte avec cet e-mail existe déjà",
          ja: "このメールアドレスのアカウントは既に存在します",
        }
      },
      {
        key: "ui.login.error.network_error",
        values: {
          en: "Network error. Please try again.",
          de: "Netzwerkfehler. Bitte versuche es erneut.",
          pl: "Błąd sieci. Spróbuj ponownie.",
          es: "Error de red. Por favor, inténtalo de nuevo.",
          fr: "Erreur réseau. Veuillez réessayer.",
          ja: "ネットワークエラー。もう一度お試しください。",
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

    console.log(`✅ Seeded ${count} Login Window translations`);
    return { success: true, count };
  }
});
