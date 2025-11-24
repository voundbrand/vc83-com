/**
 * Login Translations - Part 4: Passkey Authentication
 *
 * This file contains all translations for passkey (Face ID/Touch ID) authentication features.
 * Supports: English, German, Polish, Spanish, French, Japanese
 * Run: npx convex run translations/seedLogin_04_Passkeys:seedLoginPasskeyTranslations
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seedLoginPasskeyTranslations = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get system organization and user
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

    console.log("🔐 Seeding passkey authentication translations (6 languages)...");

    // Define supported locales
    const locales = ["en", "de", "pl", "es", "fr", "ja"];

    const translations = [
      // Passkey Encouragement Banner
      {
        key: "ui.login.passkey_banner.title",
        values: {
          en: "Add Face ID / Touch ID for Faster Login",
          de: "Face ID / Touch ID für schnellere Anmeldung hinzufügen",
          pl: "Dodaj Face ID / Touch ID dla szybszego logowania",
          es: "Añade Face ID / Touch ID para un inicio de sesión más rápido",
          fr: "Ajouter Face ID / Touch ID pour une connexion plus rapide",
          ja: "Face ID / Touch IDを追加して高速ログイン",
        }
      },
      {
        key: "ui.login.passkey_banner.description",
        values: {
          en: "Sign in instantly with your fingerprint or face — no typing needed. More secure than passwords.",
          de: "Melden Sie sich sofort mit Ihrem Fingerabdruck oder Gesicht an – ohne Tippen. Sicherer als Passwörter.",
          pl: "Zaloguj się natychmiast za pomocą odcisku palca lub twarzy – bez pisania. Bezpieczniejsze niż hasła.",
          es: "Inicia sesión instantáneamente con tu huella dactilar o rostro — sin necesidad de escribir. Más seguro que las contraseñas.",
          fr: "Connectez-vous instantanément avec votre empreinte digitale ou votre visage — sans saisie. Plus sûr que les mots de passe.",
          ja: "指紋または顔で即座にサインイン — 入力不要。パスワードよりも安全です。",
        }
      },
      {
        key: "ui.login.passkey_banner.button_setup",
        values: {
          en: "Set up now (30 sec)",
          de: "Jetzt einrichten (30 Sek.)",
          pl: "Skonfiguruj teraz (30 sek.)",
          es: "Configurar ahora (30 seg.)",
          fr: "Configurer maintenant (30 sec)",
          ja: "今すぐ設定（30秒）",
        }
      },
      {
        key: "ui.login.passkey_banner.button_setting_up",
        values: {
          en: "Setting up...",
          de: "Wird eingerichtet...",
          pl: "Konfigurowanie...",
          es: "Configurando...",
          fr: "Configuration en cours...",
          ja: "設定中...",
        }
      },

      // First Login Passkey Modal
      {
        key: "ui.login.passkey_modal.welcome",
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
        key: "ui.login.passkey_modal.title",
        values: {
          en: "Add Face ID / Touch ID?",
          de: "Face ID / Touch ID hinzufügen?",
          pl: "Dodać Face ID / Touch ID?",
          es: "¿Añadir Face ID / Touch ID?",
          fr: "Ajouter Face ID / Touch ID ?",
          ja: "Face ID / Touch IDを追加しますか？",
        }
      },
      {
        key: "ui.login.passkey_modal.description",
        values: {
          en: "Sign in faster and more securely with biometric authentication. Takes just 30 seconds.",
          de: "Melden Sie sich schneller und sicherer mit biometrischer Authentifizierung an. Dauert nur 30 Sekunden.",
          pl: "Zaloguj się szybciej i bezpieczniej dzięki uwierzytelnianiu biometrycznemu. Zajmuje tylko 30 sekund.",
          es: "Inicia sesión más rápido y de forma más segura con autenticación biométrica. Solo toma 30 segundos.",
          fr: "Connectez-vous plus rapidement et en toute sécurité avec l'authentification biométrique. Prend seulement 30 secondes.",
          ja: "生体認証でより速く、より安全にサインイン。わずか30秒で完了します。",
        }
      },
      {
        key: "ui.login.passkey_modal.benefit_instant",
        values: {
          en: "Instant login with fingerprint or face",
          de: "Sofortige Anmeldung mit Fingerabdruck oder Gesicht",
          pl: "Natychmiastowe logowanie odciskiem palca lub twarzą",
          es: "Inicio de sesión instantáneo con huella dactilar o rostro",
          fr: "Connexion instantanée avec empreinte digitale ou visage",
          ja: "指紋または顔で即座にログイン",
        }
      },
      {
        key: "ui.login.passkey_modal.benefit_no_typing",
        values: {
          en: "No more typing passwords",
          de: "Keine Passwörter mehr tippen",
          pl: "Koniec z wpisywaniem haseł",
          es: "No más escribir contraseñas",
          fr: "Fini la saisie des mots de passe",
          ja: "パスワードの入力不要",
        }
      },
      {
        key: "ui.login.passkey_modal.benefit_phishing_proof",
        values: {
          en: "Phishing-proof security",
          de: "Phishing-sichere Sicherheit",
          pl: "Bezpieczeństwo odporne na phishing",
          es: "Seguridad a prueba de phishing",
          fr: "Sécurité anti-phishing",
          ja: "フィッシング対策セキュリティ",
        }
      },
      {
        key: "ui.login.passkey_modal.button_setup",
        values: {
          en: "Set up Face ID / Touch ID",
          de: "Face ID / Touch ID einrichten",
          pl: "Skonfiguruj Face ID / Touch ID",
          es: "Configurar Face ID / Touch ID",
          fr: "Configurer Face ID / Touch ID",
          ja: "Face ID / Touch IDを設定",
        }
      },
      {
        key: "ui.login.passkey_modal.button_skip",
        values: {
          en: "Maybe later",
          de: "Vielleicht später",
          pl: "Może później",
          es: "Quizás más tarde",
          fr: "Peut-être plus tard",
          ja: "後で設定",
        }
      },
      {
        key: "ui.login.passkey_modal.note",
        values: {
          en: "You can always add this later in Security settings",
          de: "Sie können dies jederzeit später in den Sicherheitseinstellungen hinzufügen",
          pl: "Możesz to zawsze dodać później w ustawieniach bezpieczeństwa",
          es: "Siempre puedes añadir esto más tarde en la configuración de Seguridad",
          fr: "Vous pouvez toujours ajouter cela plus tard dans les paramètres de sécurité",
          ja: "セキュリティ設定でいつでも追加できます",
        }
      },

      // Passkey Notifications
      {
        key: "ui.login.passkey_notification.success_title",
        values: {
          en: "Passkey Set Up!",
          de: "Passkey eingerichtet!",
          pl: "Passkey skonfigurowany!",
          es: "¡Passkey configurado!",
          fr: "Passkey configuré !",
          ja: "パスキー設定完了！",
        }
      },
      {
        key: "ui.login.passkey_notification.success_message",
        values: {
          en: "You can now sign in with Face ID or Touch ID",
          de: "Sie können sich jetzt mit Face ID oder Touch ID anmelden",
          pl: "Możesz teraz zalogować się za pomocą Face ID lub Touch ID",
          es: "Ahora puedes iniciar sesión con Face ID o Touch ID",
          fr: "Vous pouvez maintenant vous connecter avec Face ID ou Touch ID",
          ja: "Face IDまたはTouch IDでサインインできるようになりました",
        }
      },
      {
        key: "ui.login.passkey_notification.account_created_title",
        values: {
          en: "Account Created!",
          de: "Konto erstellt!",
          pl: "Konto utworzone!",
          es: "¡Cuenta creada!",
          fr: "Compte créé !",
          ja: "アカウント作成完了！",
        }
      },
      {
        key: "ui.login.passkey_notification.account_created_message",
        values: {
          en: "Your passkey has been set up. You can now sign in with Face ID or Touch ID.",
          de: "Ihr Passkey wurde eingerichtet. Sie können sich jetzt mit Face ID oder Touch ID anmelden.",
          pl: "Twój passkey został skonfigurowany. Możesz teraz zalogować się za pomocą Face ID lub Touch ID.",
          es: "Tu passkey ha sido configurado. Ahora puedes iniciar sesión con Face ID o Touch ID.",
          fr: "Votre passkey a été configuré. Vous pouvez maintenant vous connecter avec Face ID ou Touch ID.",
          ja: "パスキーが設定されました。Face IDまたはTouch IDでサインインできます。",
        }
      },
      {
        key: "ui.login.passkey_notification.setup_cancelled_title",
        values: {
          en: "Setup Cancelled",
          de: "Einrichtung abgebrochen",
          pl: "Konfiguracja anulowana",
          es: "Configuración cancelada",
          fr: "Configuration annulée",
          ja: "設定がキャンセルされました",
        }
      },
      {
        key: "ui.login.passkey_notification.setup_cancelled_message",
        values: {
          en: "Try again when you're ready.",
          de: "Versuchen Sie es erneut, wenn Sie bereit sind.",
          pl: "Spróbuj ponownie, gdy będziesz gotowy.",
          es: "Inténtalo de nuevo cuando estés listo.",
          fr: "Réessayez quand vous êtes prêt.",
          ja: "準備ができたら再度お試しください。",
        }
      },
      {
        key: "ui.login.passkey_notification.setup_cancelled_security",
        values: {
          en: "You can set up passkeys later in Security settings.",
          de: "Sie können Passkeys später in den Sicherheitseinstellungen einrichten.",
          pl: "Możesz skonfigurować passkey później w ustawieniach bezpieczeństwa.",
          es: "Puedes configurar passkeys más tarde en la configuración de Seguridad.",
          fr: "Vous pouvez configurer les passkeys plus tard dans les paramètres de sécurité.",
          ja: "セキュリティ設定で後からパスキーを設定できます。",
        }
      },
      {
        key: "ui.login.passkey_notification.setup_failed_title",
        values: {
          en: "Setup Failed",
          de: "Einrichtung fehlgeschlagen",
          pl: "Konfiguracja nieudana",
          es: "Configuración fallida",
          fr: "Échec de la configuration",
          ja: "設定に失敗しました",
        }
      },
      {
        key: "ui.login.passkey_notification.skipped_title",
        values: {
          en: "Passkey Setup Skipped",
          de: "Passkey-Einrichtung übersprungen",
          pl: "Konfiguracja passkey pominięta",
          es: "Configuración de passkey omitida",
          fr: "Configuration du passkey ignorée",
          ja: "パスキー設定をスキップしました",
        }
      },
      {
        key: "ui.login.passkey_notification.skipped_message",
        values: {
          en: "You can add Face ID / Touch ID later in Security settings.",
          de: "Sie können Face ID / Touch ID später in den Sicherheitseinstellungen hinzufügen.",
          pl: "Możesz dodać Face ID / Touch ID później w ustawieniach bezpieczeństwa.",
          es: "Puedes añadir Face ID / Touch ID más tarde en la configuración de Seguridad.",
          fr: "Vous pouvez ajouter Face ID / Touch ID plus tard dans les paramètres de sécurité.",
          ja: "セキュリティ設定で後からFace ID / Touch IDを追加できます。",
        }
      },

      // Passkey Errors
      {
        key: "ui.login.passkey_error.challenge_failed",
        values: {
          en: "Failed to generate passkey challenge",
          de: "Passkey-Herausforderung konnte nicht generiert werden",
          pl: "Nie udało się wygenerować wyzwania passkey",
          es: "Error al generar el desafío de passkey",
          fr: "Échec de la génération du défi passkey",
          ja: "パスキーチャレンジの生成に失敗しました",
        }
      },
      {
        key: "ui.login.passkey_error.verification_failed",
        values: {
          en: "Failed to verify passkey",
          de: "Passkey konnte nicht verifiziert werden",
          pl: "Nie udało się zweryfikować passkey",
          es: "Error al verificar el passkey",
          fr: "Échec de la vérification du passkey",
          ja: "パスキーの検証に失敗しました",
        }
      },

      // Passkey Setup Required Modal
      {
        key: "ui.login.passkey_setup_required.title",
        values: {
          en: "Passkey Setup Required",
          de: "Passkey-Einrichtung erforderlich",
          pl: "Wymagana konfiguracja passkey",
          es: "Configuración de passkey requerida",
          fr: "Configuration du passkey requise",
          ja: "パスキー設定が必要です",
        }
      },
      {
        key: "ui.login.passkey_setup_required.heading",
        values: {
          en: "No Passkey Found",
          de: "Kein Passkey gefunden",
          pl: "Nie znaleziono passkey",
          es: "No se encontró passkey",
          fr: "Aucun passkey trouvé",
          ja: "パスキーが見つかりません",
        }
      },
      {
        key: "ui.login.passkey_setup_required.description",
        values: {
          en: "You don't have Face ID / Touch ID set up for this account yet. Please sign in with your password first, then you can set up biometric authentication from your account settings.",
          de: "Sie haben noch kein Face ID / Touch ID für dieses Konto eingerichtet. Bitte melden Sie sich zuerst mit Ihrem Passwort an, dann können Sie die biometrische Authentifizierung in Ihren Kontoeinstellungen einrichten.",
          pl: "Nie masz jeszcze skonfigurowanego Face ID / Touch ID dla tego konta. Zaloguj się najpierw hasłem, a następnie możesz skonfigurować uwierzytelnianie biometryczne w ustawieniach konta.",
          es: "Aún no tienes Face ID / Touch ID configurado para esta cuenta. Inicia sesión primero con tu contraseña y luego podrás configurar la autenticación biométrica desde la configuración de tu cuenta.",
          fr: "Vous n'avez pas encore configuré Face ID / Touch ID pour ce compte. Veuillez d'abord vous connecter avec votre mot de passe, puis vous pourrez configurer l'authentification biométrique dans les paramètres de votre compte.",
          ja: "このアカウントにはまだFace ID / Touch IDが設定されていません。まずパスワードでサインインしてから、アカウント設定で生体認証を設定できます。",
        }
      },
      {
        key: "ui.login.passkey_setup_required.button_use_password",
        values: {
          en: "Use Password",
          de: "Passwort verwenden",
          pl: "Użyj hasła",
          es: "Usar contraseña",
          fr: "Utiliser le mot de passe",
          ja: "パスワードを使用",
        }
      },
      {
        key: "ui.login.passkey_setup_required.tip_title",
        values: {
          en: "Tip:",
          de: "Tipp:",
          pl: "Wskazówka:",
          es: "Consejo:",
          fr: "Astuce :",
          ja: "ヒント：",
        }
      },
      {
        key: "ui.login.passkey_setup_required.tip_description",
        values: {
          en: "After signing in, look for the passkey setup banner or visit your account settings to enable Face ID / Touch ID for faster logins.",
          de: "Suchen Sie nach dem Anmelden nach dem Passkey-Einrichtungs-Banner oder besuchen Sie Ihre Kontoeinstellungen, um Face ID / Touch ID für schnellere Anmeldungen zu aktivieren.",
          pl: "Po zalogowaniu poszukaj baneru konfiguracji passkey lub odwiedź ustawienia konta, aby włączyć Face ID / Touch ID dla szybszych logowań.",
          es: "Después de iniciar sesión, busca el banner de configuración de passkey o visita la configuración de tu cuenta para habilitar Face ID / Touch ID para inicios de sesión más rápidos.",
          fr: "Après vous être connecté, recherchez la bannière de configuration du passkey ou visitez les paramètres de votre compte pour activer Face ID / Touch ID pour des connexions plus rapides.",
          ja: "サインイン後、パスキー設定バナーを探すか、アカウント設定にアクセスしてFace ID / Touch IDを有効にすると、より速くログインできます。",
        }
      },
    ];

    let count = 0;

    // Insert translations for all locales
    for (const translation of translations) {
      for (const locale of locales) {
        await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          translation.values[locale as keyof typeof translation.values],
          locale,
          "ui.login"
        );
        count++;
      }
    }

    console.log(`✅ Seeded ${translations.length} passkey authentication translations across ${locales.length} languages (${count} total entries)`);
    return {
      success: true,
      translationKeys: translations.length,
      languages: locales.length,
      totalEntries: count
    };
  },
});
