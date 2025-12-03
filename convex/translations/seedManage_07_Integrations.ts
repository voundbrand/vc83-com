/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 7: INTEGRATIONS
 *
 * Seeds translations for:
 * - Integrations tab
 * - Microsoft integration
 * - Connection status
 * - Sync settings
 *
 * Run: npx convex run translations/seedManage_07_Integrations:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 7: Integrations)...");

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
      // === TAB LABEL ===
      {
        key: "ui.manage.tab.integrations",
        values: {
          en: "Integrations",
          de: "Integrationen",
          pl: "Integracje",
          es: "Integraciones",
          fr: "Intégrations",
          ja: "統合",
        }
      },

      // === MICROSOFT INTEGRATION ===
      {
        key: "ui.manage.integrations.microsoft.title",
        values: {
          en: "Microsoft Account",
          de: "Microsoft-Konto",
          pl: "Konto Microsoft",
          es: "Cuenta de Microsoft",
          fr: "Compte Microsoft",
          ja: "Microsoftアカウント",
        }
      },
      {
        key: "ui.manage.integrations.microsoft.description",
        values: {
          en: "Connect your Microsoft account to sync emails, calendar, and files",
          de: "Verbinde dein Microsoft-Konto, um E-Mails, Kalender und Dateien zu synchronisieren",
          pl: "Połącz swoje konto Microsoft, aby zsynchronizować e-maile, kalendarz i pliki",
          es: "Conecta tu cuenta de Microsoft para sincronizar correos electrónicos, calendario y archivos",
          fr: "Connectez votre compte Microsoft pour synchroniser les e-mails, le calendrier et les fichiers",
          ja: "Microsoftアカウントを接続して、メール、カレンダー、ファイルを同期します",
        }
      },

      // === CONNECTION STATUS ===
      {
        key: "ui.manage.integrations.status.loading",
        values: {
          en: "Loading connection status...",
          de: "Verbindungsstatus wird geladen...",
          pl: "Ładowanie statusu połączenia...",
          es: "Cargando estado de conexión...",
          fr: "Chargement de l'état de la connexion...",
          ja: "接続状態を読み込んでいます...",
        }
      },
      {
        key: "ui.manage.integrations.status.connected",
        values: {
          en: "Connected",
          de: "Verbunden",
          pl: "Połączono",
          es: "Conectado",
          fr: "Connecté",
          ja: "接続済み",
        }
      },
      {
        key: "ui.manage.integrations.status.not_connected",
        values: {
          en: "Not Connected",
          de: "Nicht verbunden",
          pl: "Niepołączony",
          es: "No conectado",
          fr: "Non connecté",
          ja: "未接続",
        }
      },
      {
        key: "ui.manage.integrations.account_label",
        values: {
          en: "Account:",
          de: "Konto:",
          pl: "Konto:",
          es: "Cuenta:",
          fr: "Compte:",
          ja: "アカウント:",
        }
      },
      {
        key: "ui.manage.integrations.last_synced",
        values: {
          en: "Last Synced:",
          de: "Zuletzt synchronisiert:",
          pl: "Ostatnia synchronizacja:",
          es: "Última sincronización:",
          fr: "Dernière synchronisation:",
          ja: "最終同期:",
        }
      },

      // === ACTIONS ===
      {
        key: "ui.manage.integrations.actions.connect",
        values: {
          en: "Connect Microsoft Account",
          de: "Microsoft-Konto verbinden",
          pl: "Połącz konto Microsoft",
          es: "Conectar cuenta de Microsoft",
          fr: "Connecter le compte Microsoft",
          ja: "Microsoftアカウントを接続",
        }
      },
      {
        key: "ui.manage.integrations.actions.connecting",
        values: {
          en: "Connecting...",
          de: "Verbindung wird hergestellt...",
          pl: "Łączenie...",
          es: "Conectando...",
          fr: "Connexion en cours...",
          ja: "接続中...",
        }
      },
      {
        key: "ui.manage.integrations.actions.disconnect",
        values: {
          en: "Disconnect",
          de: "Trennen",
          pl: "Rozłącz",
          es: "Desconectar",
          fr: "Déconnecter",
          ja: "切断",
        }
      },
      {
        key: "ui.manage.integrations.actions.sync_now",
        values: {
          en: "Sync Now",
          de: "Jetzt synchronisieren",
          pl: "Synchronizuj teraz",
          es: "Sincronizar ahora",
          fr: "Synchroniser maintenant",
          ja: "今すぐ同期",
        }
      },
      {
        key: "ui.manage.integrations.actions.syncing",
        values: {
          en: "Syncing...",
          de: "Synchronisierung läuft...",
          pl: "Synchronizowanie...",
          es: "Sincronizando...",
          fr: "Synchronisation en cours...",
          ja: "同期中...",
        }
      },

      // === SYNC SETTINGS ===
      {
        key: "ui.manage.integrations.sync_settings.title",
        values: {
          en: "Sync Settings",
          de: "Synchronisierungseinstellungen",
          pl: "Ustawienia synchronizacji",
          es: "Configuración de sincronización",
          fr: "Paramètres de synchronisation",
          ja: "同期設定",
        }
      },
      {
        key: "ui.manage.integrations.sync_settings.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo electrónico",
          fr: "E-mail",
          ja: "メール",
        }
      },
      {
        key: "ui.manage.integrations.sync_settings.calendar_coming_soon",
        values: {
          en: "Calendar (Coming Soon)",
          de: "Kalender (Demnächst)",
          pl: "Kalendarz (Wkrótce)",
          es: "Calendario (Próximamente)",
          fr: "Calendrier (Prochainement)",
          ja: "カレンダー（近日公開）",
        }
      },
      {
        key: "ui.manage.integrations.sync_settings.onedrive_coming_soon",
        values: {
          en: "OneDrive (Coming Soon)",
          de: "OneDrive (Demnächst)",
          pl: "OneDrive (Wkrótce)",
          es: "OneDrive (Próximamente)",
          fr: "OneDrive (Prochainement)",
          ja: "OneDrive（近日公開）",
        }
      },

      // === FEATURES LIST ===
      {
        key: "ui.manage.integrations.features.connect_message",
        values: {
          en: "Connect your Microsoft account to access these features:",
          de: "Verbinde dein Microsoft-Konto, um auf diese Funktionen zuzugreifen:",
          pl: "Połącz swoje konto Microsoft, aby uzyskać dostęp do tych funkcji:",
          es: "Conecta tu cuenta de Microsoft para acceder a estas funciones:",
          fr: "Connectez votre compte Microsoft pour accéder à ces fonctionnalités:",
          ja: "これらの機能にアクセスするには、Microsoftアカウントを接続してください:",
        }
      },
      {
        key: "ui.manage.integrations.features.sync_emails",
        values: {
          en: "Sync emails and contacts (Coming Soon)",
          de: "E-Mails und Kontakte synchronisieren (Demnächst)",
          pl: "Synchronizuj e-maile i kontakty (Wkrótce)",
          es: "Sincronizar correos electrónicos y contactos (Próximamente)",
          fr: "Synchroniser les e-mails et les contacts (Prochainement)",
          ja: "メールと連絡先を同期（近日公開）",
        }
      },
      {
        key: "ui.manage.integrations.features.access_calendar",
        values: {
          en: "Access calendar and events (Coming Soon)",
          de: "Zugriff auf Kalender und Ereignisse (Demnächst)",
          pl: "Dostęp do kalendarza i wydarzeń (Wkrótce)",
          es: "Acceder a calendario y eventos (Próximamente)",
          fr: "Accéder au calendrier et aux événements (Prochainement)",
          ja: "カレンダーとイベントにアクセス（近日公開）",
        }
      },
      {
        key: "ui.manage.integrations.features.browse_onedrive",
        values: {
          en: "Browse OneDrive files (Coming Soon)",
          de: "OneDrive-Dateien durchsuchen (Demnächst)",
          pl: "Przeglądaj pliki OneDrive (Wkrótce)",
          es: "Explorar archivos de OneDrive (Próximamente)",
          fr: "Parcourir les fichiers OneDrive (Prochainement)",
          ja: "OneDriveファイルを参照（近日公開）",
        }
      },
      {
        key: "ui.manage.integrations.features.secure_oauth",
        values: {
          en: "Secure OAuth 2.0 connection with encryption",
          de: "Sichere OAuth 2.0-Verbindung mit Verschlüsselung",
          pl: "Bezpieczne połączenie OAuth 2.0 z szyfrowaniem",
          es: "Conexión OAuth 2.0 segura con cifrado",
          fr: "Connexion OAuth 2.0 sécurisée avec chiffrement",
          ja: "暗号化によるセキュアなOAuth 2.0接続",
        }
      },

      // === MESSAGES ===
      {
        key: "ui.manage.integrations.messages.sign_in_required",
        values: {
          en: "Please sign in to connect integrations",
          de: "Bitte melde dich an, um Integrationen zu verbinden",
          pl: "Zaloguj się, aby połączyć integracje",
          es: "Por favor, inicia sesión para conectar integraciones",
          fr: "Veuillez vous connecter pour connecter les intégrations",
          ja: "統合を接続するにはサインインしてください",
        }
      },

      // === ERROR MESSAGES ===
      {
        key: "ui.manage.integrations.errors.connection_issue_title",
        values: {
          en: "Microsoft Connection Issue",
          de: "Microsoft-Verbindungsproblem",
          pl: "Problem z połączeniem Microsoft",
          es: "Problema de conexión con Microsoft",
          fr: "Problème de connexion Microsoft",
          ja: "Microsoft接続の問題",
        }
      },
      {
        key: "ui.manage.integrations.errors.connection_expired",
        values: {
          en: "Your Microsoft account connection has expired. Please reconnect your account to continue syncing emails.",
          de: "Deine Microsoft-Kontoverbindung ist abgelaufen. Bitte verbinde dein Konto erneut, um E-Mails weiter zu synchronisieren.",
          pl: "Twoje połączenie z kontem Microsoft wygasło. Połącz ponownie swoje konto, aby kontynuować synchronizację e-maili.",
          es: "Tu conexión con la cuenta de Microsoft ha expirado. Vuelve a conectar tu cuenta para continuar sincronizando correos electrónicos.",
          fr: "Votre connexion au compte Microsoft a expiré. Veuillez reconnecter votre compte pour continuer à synchroniser les e-mails.",
          ja: "Microsoftアカウントの接続が期限切れです。メールの同期を続けるには、アカウントを再接続してください。",
        }
      },
      {
        key: "ui.manage.integrations.errors.sync_failed_title",
        values: {
          en: "Email Sync Failed",
          de: "E-Mail-Synchronisierung fehlgeschlagen",
          pl: "Synchronizacja e-mail nie powiodła się",
          es: "Error al sincronizar correo electrónico",
          fr: "Échec de la synchronisation des e-mails",
          ja: "メール同期に失敗しました",
        }
      },
      {
        key: "ui.manage.integrations.errors.permissions_expired",
        values: {
          en: "Your Microsoft account permissions have expired. Please reconnect your account below.",
          de: "Deine Microsoft-Kontoberechtigungen sind abgelaufen. Bitte verbinde dein Konto unten erneut.",
          pl: "Twoje uprawnienia konta Microsoft wygasły. Połącz ponownie swoje konto poniżej.",
          es: "Tus permisos de cuenta de Microsoft han expirado. Vuelve a conectar tu cuenta a continuación.",
          fr: "Vos autorisations de compte Microsoft ont expiré. Veuillez reconnecter votre compte ci-dessous.",
          ja: "Microsoftアカウントの権限が期限切れです。以下でアカウントを再接続してください。",
        }
      },
      {
        key: "ui.manage.integrations.errors.session_expired",
        values: {
          en: "Your Microsoft session has expired. Please reconnect your account below.",
          de: "Deine Microsoft-Sitzung ist abgelaufen. Bitte verbinde dein Konto unten erneut.",
          pl: "Twoja sesja Microsoft wygasła. Połącz ponownie swoje konto poniżej.",
          es: "Tu sesión de Microsoft ha expirado. Vuelve a conectar tu cuenta a continuación.",
          fr: "Votre session Microsoft a expiré. Veuillez reconnecter votre compte ci-dessous.",
          ja: "Microsoftセッションが期限切れです。以下でアカウントを再接続してください。",
        }
      },
      {
        key: "ui.manage.integrations.errors.authorization_expired",
        values: {
          en: "Your Microsoft authorization has expired. Please reconnect your account below.",
          de: "Deine Microsoft-Autorisierung ist abgelaufen. Bitte verbinde dein Konto unten erneut.",
          pl: "Twoja autoryzacja Microsoft wygasła. Połącz ponownie swoje konto poniżej.",
          es: "Tu autorización de Microsoft ha expirado. Vuelve a conectar tu cuenta a continuación.",
          fr: "Votre autorisation Microsoft a expiré. Veuillez reconnecter votre compte ci-dessous.",
          ja: "Microsoftの認証が期限切れです。以下でアカウントを再接続してください。",
        }
      },
      {
        key: "ui.manage.integrations.errors.sync_unavailable",
        values: {
          en: "Unable to sync emails at this time. Please check your connection and try again.",
          de: "E-Mails können derzeit nicht synchronisiert werden. Bitte überprüfe deine Verbindung und versuche es erneut.",
          pl: "Nie można zsynchronizować e-maili w tej chwili. Sprawdź połączenie i spróbuj ponownie.",
          es: "No se pueden sincronizar correos electrónicos en este momento. Verifica tu conexión e inténtalo de nuevo.",
          fr: "Impossible de synchroniser les e-mails pour le moment. Veuillez vérifier votre connexion et réessayer.",
          ja: "現在メールを同期できません。接続を確認してもう一度お試しください。",
        }
      },
      {
        key: "ui.manage.integrations.errors.sync_generic",
        values: {
          en: "Failed to sync emails. Please try again.",
          de: "E-Mail-Synchronisierung fehlgeschlagen. Bitte versuche es erneut.",
          pl: "Nie udało się zsynchronizować e-maili. Spróbuj ponownie.",
          es: "Error al sincronizar correos. Inténtalo de nuevo.",
          fr: "Échec de la synchronisation des e-mails. Veuillez réessayer.",
          ja: "メールの同期に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.manage.integrations.actions.reconnect",
        values: {
          en: "Reconnect Account",
          de: "Konto erneut verbinden",
          pl: "Połącz ponownie konto",
          es: "Reconectar cuenta",
          fr: "Reconnecter le compte",
          ja: "アカウントを再接続",
        }
      },
      {
        key: "ui.manage.integrations.actions.reconnecting",
        values: {
          en: "Reconnecting...",
          de: "Erneute Verbindung...",
          pl: "Ponowne łączenie...",
          es: "Reconectando...",
          fr: "Reconnexion...",
          ja: "再接続中...",
        }
      },
      {
        key: "ui.manage.integrations.errors.connection_error",
        values: {
          en: "Connection Error",
          de: "Verbindungsfehler",
          pl: "Błąd połączenia",
          es: "Error de conexión",
          fr: "Erreur de connexion",
          ja: "接続エラー",
        }
      },

      // === OTHER INTEGRATIONS ===
      {
        key: "ui.manage.integrations.other.title",
        values: {
          en: "Other Integrations",
          de: "Weitere Integrationen",
          pl: "Inne integracje",
          es: "Otras integraciones",
          fr: "Autres intégrations",
          ja: "その他の統合",
        }
      },
      {
        key: "ui.manage.integrations.other.description",
        values: {
          en: "More integrations coming soon",
          de: "Weitere Integrationen folgen in Kürze",
          pl: "Więcej integracji wkrótce",
          es: "Más integraciones próximamente",
          fr: "D'autres intégrations arrivent bientôt",
          ja: "さらに多くの統合が近日公開",
        }
      },
      {
        key: "ui.manage.integrations.google.title",
        values: {
          en: "Google Workspace",
          de: "Google Workspace",
          pl: "Google Workspace",
          es: "Google Workspace",
          fr: "Google Workspace",
          ja: "Google Workspace",
        }
      },
      {
        key: "ui.manage.integrations.slack.title",
        values: {
          en: "Slack",
          de: "Slack",
          pl: "Slack",
          es: "Slack",
          fr: "Slack",
          ja: "Slack",
        }
      },
      {
        key: "ui.manage.integrations.coming_soon",
        values: {
          en: "Coming Soon",
          de: "Demnächst",
          pl: "Wkrótce",
          es: "Próximamente",
          fr: "Prochainement",
          ja: "近日公開",
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
            "manage-window-integrations"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Integrations translations`);
    return { success: true, count };
  }
});
