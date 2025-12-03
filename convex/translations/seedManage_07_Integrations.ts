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

      // === INDIVIDUAL SCOPE NAMES & DESCRIPTIONS ===
      // Mail Scopes (5)
      {
        key: "ui.manage.integrations.scopes.mail.read.name",
        values: {
          en: "Read mail",
          de: "E-Mails lesen",
          pl: "Czytaj pocztę",
          es: "Leer correo",
          fr: "Lire le courrier",
          ja: "メールを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mail.read.description",
        values: {
          en: "Read your email",
          de: "Lese deine E-Mails",
          pl: "Czytaj swoje e-maile",
          es: "Lee tu correo electrónico",
          fr: "Lire vos e-mails",
          ja: "メールを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mail.readwrite.name",
        values: {
          en: "Read & write mail",
          de: "E-Mails lesen & schreiben",
          pl: "Czytaj i pisz pocztę",
          es: "Leer y escribir correo",
          fr: "Lire et écrire du courrier",
          ja: "メールの読み書き",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mail.readwrite.description",
        values: {
          en: "Read, update, create, and delete email",
          de: "E-Mails lesen, aktualisieren, erstellen und löschen",
          pl: "Czytaj, aktualizuj, twórz i usuwaj e-maile",
          es: "Leer, actualizar, crear y eliminar correo",
          fr: "Lire, mettre à jour, créer et supprimer des e-mails",
          ja: "メールの読み取り、更新、作成、削除",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mail.send.name",
        values: {
          en: "Send mail",
          de: "E-Mails senden",
          pl: "Wysyłaj pocztę",
          es: "Enviar correo",
          fr: "Envoyer du courrier",
          ja: "メールを送信",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mail.send.description",
        values: {
          en: "Send email on your behalf",
          de: "E-Mails in deinem Namen senden",
          pl: "Wysyłaj e-maile w twoim imieniu",
          es: "Enviar correo en tu nombre",
          fr: "Envoyer des e-mails en votre nom",
          ja: "あなたの代わりにメールを送信",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mailboxsettings.read.name",
        values: {
          en: "Read mailbox settings",
          de: "Postfacheinstellungen lesen",
          pl: "Czytaj ustawienia skrzynki pocztowej",
          es: "Leer configuración del buzón",
          fr: "Lire les paramètres de la boîte aux lettres",
          ja: "メールボックス設定を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mailboxsettings.read.description",
        values: {
          en: "Read your mailbox settings",
          de: "Lese deine Postfacheinstellungen",
          pl: "Czytaj ustawienia swojej skrzynki",
          es: "Lee la configuración de tu buzón",
          fr: "Lire vos paramètres de boîte aux lettres",
          ja: "メールボックス設定を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mailboxsettings.readwrite.name",
        values: {
          en: "Manage mailbox settings",
          de: "Postfacheinstellungen verwalten",
          pl: "Zarządzaj ustawieniami skrzynki",
          es: "Gestionar configuración del buzón",
          fr: "Gérer les paramètres de la boîte aux lettres",
          ja: "メールボックス設定を管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.mailboxsettings.readwrite.description",
        values: {
          en: "Update your mailbox settings",
          de: "Aktualisiere deine Postfacheinstellungen",
          pl: "Aktualizuj ustawienia skrzynki",
          es: "Actualiza la configuración de tu buzón",
          fr: "Mettre à jour vos paramètres de boîte aux lettres",
          ja: "メールボックス設定を更新",
        }
      },

      // Calendar Scopes (4)
      {
        key: "ui.manage.integrations.scopes.calendars.read.name",
        values: {
          en: "Read calendars",
          de: "Kalender lesen",
          pl: "Czytaj kalendarze",
          es: "Leer calendarios",
          fr: "Lire les calendriers",
          ja: "カレンダーを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.read.description",
        values: {
          en: "Read your calendars",
          de: "Lese deine Kalender",
          pl: "Czytaj swoje kalendarze",
          es: "Lee tus calendarios",
          fr: "Lire vos calendriers",
          ja: "カレンダーを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.readwrite.name",
        values: {
          en: "Manage calendars",
          de: "Kalender verwalten",
          pl: "Zarządzaj kalendarzami",
          es: "Gestionar calendarios",
          fr: "Gérer les calendriers",
          ja: "カレンダーを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.readwrite.description",
        values: {
          en: "Read and write to your calendars",
          de: "Lese und schreibe in deine Kalender",
          pl: "Czytaj i pisz do swoich kalendarzy",
          es: "Lee y escribe en tus calendarios",
          fr: "Lire et écrire dans vos calendriers",
          ja: "カレンダーの読み書き",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.read.shared.name",
        values: {
          en: "Read shared calendars",
          de: "Geteilte Kalender lesen",
          pl: "Czytaj udostępnione kalendarze",
          es: "Leer calendarios compartidos",
          fr: "Lire les calendriers partagés",
          ja: "共有カレンダーを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.read.shared.description",
        values: {
          en: "Read calendars shared with you",
          de: "Lese mit dir geteilte Kalender",
          pl: "Czytaj kalendarze udostępnione tobie",
          es: "Lee calendarios compartidos contigo",
          fr: "Lire les calendriers partagés avec vous",
          ja: "共有されたカレンダーを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.readwrite.shared.name",
        values: {
          en: "Manage shared calendars",
          de: "Geteilte Kalender verwalten",
          pl: "Zarządzaj udostępnionymi kalendarzami",
          es: "Gestionar calendarios compartidos",
          fr: "Gérer les calendriers partagés",
          ja: "共有カレンダーを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.calendars.readwrite.shared.description",
        values: {
          en: "Read and write to shared calendars",
          de: "Lese und schreibe in geteilte Kalender",
          pl: "Czytaj i pisz do udostępnionych kalendarzy",
          es: "Lee y escribe en calendarios compartidos",
          fr: "Lire et écrire dans les calendriers partagés",
          ja: "共有カレンダーの読み書き",
        }
      },

      // Contacts Scopes (4)
      {
        key: "ui.manage.integrations.scopes.contacts.read.name",
        values: {
          en: "Read contacts",
          de: "Kontakte lesen",
          pl: "Czytaj kontakty",
          es: "Leer contactos",
          fr: "Lire les contacts",
          ja: "連絡先を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.read.description",
        values: {
          en: "Read your contacts",
          de: "Lese deine Kontakte",
          pl: "Czytaj swoje kontakty",
          es: "Lee tus contactos",
          fr: "Lire vos contacts",
          ja: "連絡先を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.readwrite.name",
        values: {
          en: "Manage contacts",
          de: "Kontakte verwalten",
          pl: "Zarządzaj kontaktami",
          es: "Gestionar contactos",
          fr: "Gérer les contacts",
          ja: "連絡先を管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.readwrite.description",
        values: {
          en: "Read and write to your contacts",
          de: "Lese und schreibe deine Kontakte",
          pl: "Czytaj i pisz swoje kontakty",
          es: "Lee y escribe tus contactos",
          fr: "Lire et écrire vos contacts",
          ja: "連絡先の読み書き",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.read.shared.name",
        values: {
          en: "Read shared contacts",
          de: "Geteilte Kontakte lesen",
          pl: "Czytaj udostępnione kontakty",
          es: "Leer contactos compartidos",
          fr: "Lire les contacts partagés",
          ja: "共有連絡先を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.read.shared.description",
        values: {
          en: "Read contacts shared with you",
          de: "Lese mit dir geteilte Kontakte",
          pl: "Czytaj kontakty udostępnione tobie",
          es: "Lee contactos compartidos contigo",
          fr: "Lire les contacts partagés avec vous",
          ja: "共有された連絡先を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.readwrite.shared.name",
        values: {
          en: "Manage shared contacts",
          de: "Geteilte Kontakte verwalten",
          pl: "Zarządzaj udostępnionymi kontaktami",
          es: "Gestionar contactos compartidos",
          fr: "Gérer les contacts partagés",
          ja: "共有連絡先を管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.contacts.readwrite.shared.description",
        values: {
          en: "Read and write to shared contacts",
          de: "Lese und schreibe geteilte Kontakte",
          pl: "Czytaj i pisz udostępnione kontakty",
          es: "Lee y escribe contactos compartidos",
          fr: "Lire et écrire les contacts partagés",
          ja: "共有連絡先の読み書き",
        }
      },

      // Files Scopes (4)
      {
        key: "ui.manage.integrations.scopes.files.read.name",
        values: {
          en: "Read files",
          de: "Dateien lesen",
          pl: "Czytaj pliki",
          es: "Leer archivos",
          fr: "Lire les fichiers",
          ja: "ファイルを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.read.description",
        values: {
          en: "Read your files",
          de: "Lese deine Dateien",
          pl: "Czytaj swoje pliki",
          es: "Lee tus archivos",
          fr: "Lire vos fichiers",
          ja: "ファイルを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.readwrite.name",
        values: {
          en: "Manage files",
          de: "Dateien verwalten",
          pl: "Zarządzaj plikami",
          es: "Gestionar archivos",
          fr: "Gérer les fichiers",
          ja: "ファイルを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.readwrite.description",
        values: {
          en: "Read and write to your files",
          de: "Lese und schreibe deine Dateien",
          pl: "Czytaj i pisz swoje pliki",
          es: "Lee y escribe tus archivos",
          fr: "Lire et écrire vos fichiers",
          ja: "ファイルの読み書き",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.read.all.name",
        values: {
          en: "Read all accessible files",
          de: "Alle zugänglichen Dateien lesen",
          pl: "Czytaj wszystkie dostępne pliki",
          es: "Leer todos los archivos accesibles",
          fr: "Lire tous les fichiers accessibles",
          ja: "アクセス可能なすべてのファイルを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.read.all.description",
        values: {
          en: "Read all files you can access",
          de: "Lese alle Dateien, auf die du zugreifen kannst",
          pl: "Czytaj wszystkie pliki, do których masz dostęp",
          es: "Lee todos los archivos a los que puedes acceder",
          fr: "Lire tous les fichiers auxquels vous pouvez accéder",
          ja: "アクセス可能なすべてのファイルを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.readwrite.all.name",
        values: {
          en: "Manage all accessible files",
          de: "Alle zugänglichen Dateien verwalten",
          pl: "Zarządzaj wszystkimi dostępnymi plikami",
          es: "Gestionar todos los archivos accesibles",
          fr: "Gérer tous les fichiers accessibles",
          ja: "アクセス可能なすべてのファイルを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.files.readwrite.all.description",
        values: {
          en: "Read and write to all accessible files",
          de: "Lese und schreibe alle zugänglichen Dateien",
          pl: "Czytaj i pisz wszystkie dostępne pliki",
          es: "Lee y escribe todos los archivos accesibles",
          fr: "Lire et écrire tous les fichiers accessibles",
          ja: "アクセス可能なすべてのファイルの読み書き",
        }
      },

      // Teams Scopes (4)
      {
        key: "ui.manage.integrations.scopes.chat.read.name",
        values: {
          en: "Read chats",
          de: "Chats lesen",
          pl: "Czytaj czaty",
          es: "Leer chats",
          fr: "Lire les discussions",
          ja: "チャットを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.chat.read.description",
        values: {
          en: "Read your chat messages",
          de: "Lese deine Chat-Nachrichten",
          pl: "Czytaj swoje wiadomości czatu",
          es: "Lee tus mensajes de chat",
          fr: "Lire vos messages de discussion",
          ja: "チャットメッセージを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.chat.readwrite.name",
        values: {
          en: "Read & write chats",
          de: "Chats lesen & schreiben",
          pl: "Czytaj i pisz czaty",
          es: "Leer y escribir chats",
          fr: "Lire et écrire des discussions",
          ja: "チャットの読み書き",
        }
      },
      {
        key: "ui.manage.integrations.scopes.chat.readwrite.description",
        values: {
          en: "Read and send chat messages",
          de: "Lese und sende Chat-Nachrichten",
          pl: "Czytaj i wysyłaj wiadomości czatu",
          es: "Lee y envía mensajes de chat",
          fr: "Lire et envoyer des messages de discussion",
          ja: "チャットメッセージの読み取りと送信",
        }
      },
      {
        key: "ui.manage.integrations.scopes.chatmessage.send.name",
        values: {
          en: "Send chat messages",
          de: "Chat-Nachrichten senden",
          pl: "Wysyłaj wiadomości czatu",
          es: "Enviar mensajes de chat",
          fr: "Envoyer des messages de discussion",
          ja: "チャットメッセージを送信",
        }
      },
      {
        key: "ui.manage.integrations.scopes.chatmessage.send.description",
        values: {
          en: "Send messages in chats",
          de: "Nachrichten in Chats senden",
          pl: "Wysyłaj wiadomości w czatach",
          es: "Envía mensajes en chats",
          fr: "Envoyer des messages dans les discussions",
          ja: "チャットでメッセージを送信",
        }
      },
      {
        key: "ui.manage.integrations.scopes.team.readbasic.all.name",
        values: {
          en: "Read team info",
          de: "Team-Infos lesen",
          pl: "Czytaj informacje o zespole",
          es: "Leer información del equipo",
          fr: "Lire les informations de l'équipe",
          ja: "チーム情報を読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.team.readbasic.all.description",
        values: {
          en: "Read team names and descriptions",
          de: "Lese Team-Namen und Beschreibungen",
          pl: "Czytaj nazwy i opisy zespołów",
          es: "Lee nombres y descripciones de equipos",
          fr: "Lire les noms et descriptions des équipes",
          ja: "チーム名と説明を読む",
        }
      },

      // Sites Scopes (2)
      {
        key: "ui.manage.integrations.scopes.sites.read.all.name",
        values: {
          en: "Read sites",
          de: "Sites lesen",
          pl: "Czytaj witryny",
          es: "Leer sitios",
          fr: "Lire les sites",
          ja: "サイトを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.sites.read.all.description",
        values: {
          en: "Read documents and lists in all sites",
          de: "Lese Dokumente und Listen in allen Sites",
          pl: "Czytaj dokumenty i listy we wszystkich witrynach",
          es: "Lee documentos y listas en todos los sitios",
          fr: "Lire les documents et listes dans tous les sites",
          ja: "すべてのサイトのドキュメントとリストを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.sites.readwrite.all.name",
        values: {
          en: "Manage sites",
          de: "Sites verwalten",
          pl: "Zarządzaj witrynami",
          es: "Gestionar sitios",
          fr: "Gérer les sites",
          ja: "サイトを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.sites.readwrite.all.description",
        values: {
          en: "Edit documents and lists in all sites",
          de: "Bearbeite Dokumente und Listen in allen Sites",
          pl: "Edytuj dokumenty i listy we wszystkich witrynach",
          es: "Edita documentos y listas en todos los sitios",
          fr: "Modifier les documents et listes dans tous les sites",
          ja: "すべてのサイトのドキュメントとリストを編集",
        }
      },

      // Tasks Scopes (4)
      {
        key: "ui.manage.integrations.scopes.tasks.read.name",
        values: {
          en: "Read tasks",
          de: "Aufgaben lesen",
          pl: "Czytaj zadania",
          es: "Leer tareas",
          fr: "Lire les tâches",
          ja: "タスクを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.read.description",
        values: {
          en: "Read your tasks",
          de: "Lese deine Aufgaben",
          pl: "Czytaj swoje zadania",
          es: "Lee tus tareas",
          fr: "Lire vos tâches",
          ja: "タスクを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.readwrite.name",
        values: {
          en: "Manage tasks",
          de: "Aufgaben verwalten",
          pl: "Zarządzaj zadaniami",
          es: "Gestionar tareas",
          fr: "Gérer les tâches",
          ja: "タスクを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.readwrite.description",
        values: {
          en: "Read and write to your tasks",
          de: "Lese und schreibe deine Aufgaben",
          pl: "Czytaj i pisz swoje zadania",
          es: "Lee y escribe tus tareas",
          fr: "Lire et écrire vos tâches",
          ja: "タスクの読み書き",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.read.shared.name",
        values: {
          en: "Read shared tasks",
          de: "Geteilte Aufgaben lesen",
          pl: "Czytaj udostępnione zadania",
          es: "Leer tareas compartidas",
          fr: "Lire les tâches partagées",
          ja: "共有タスクを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.read.shared.description",
        values: {
          en: "Read shared tasks",
          de: "Lese geteilte Aufgaben",
          pl: "Czytaj udostępnione zadania",
          es: "Lee tareas compartidas",
          fr: "Lire les tâches partagées",
          ja: "共有タスクを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.readwrite.shared.name",
        values: {
          en: "Manage shared tasks",
          de: "Geteilte Aufgaben verwalten",
          pl: "Zarządzaj udostępnionymi zadaniami",
          es: "Gestionar tareas compartidas",
          fr: "Gérer les tâches partagées",
          ja: "共有タスクを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.tasks.readwrite.shared.description",
        values: {
          en: "Read and write to shared tasks",
          de: "Lese und schreibe geteilte Aufgaben",
          pl: "Czytaj i pisz udostępnione zadania",
          es: "Lee y escribe tareas compartidas",
          fr: "Lire et écrire les tâches partagées",
          ja: "共有タスクの読み書き",
        }
      },

      // Notes Scopes (3)
      {
        key: "ui.manage.integrations.scopes.notes.read.name",
        values: {
          en: "Read notebooks",
          de: "Notizbücher lesen",
          pl: "Czytaj notatniki",
          es: "Leer cuadernos",
          fr: "Lire les carnets",
          ja: "ノートブックを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.notes.read.description",
        values: {
          en: "Read your OneNote notebooks",
          de: "Lese deine OneNote-Notizbücher",
          pl: "Czytaj swoje notatniki OneNote",
          es: "Lee tus cuadernos de OneNote",
          fr: "Lire vos carnets OneNote",
          ja: "OneNoteノートブックを読む",
        }
      },
      {
        key: "ui.manage.integrations.scopes.notes.create.name",
        values: {
          en: "Create pages",
          de: "Seiten erstellen",
          pl: "Twórz strony",
          es: "Crear páginas",
          fr: "Créer des pages",
          ja: "ページを作成",
        }
      },
      {
        key: "ui.manage.integrations.scopes.notes.create.description",
        values: {
          en: "Create new OneNote pages",
          de: "Erstelle neue OneNote-Seiten",
          pl: "Twórz nowe strony OneNote",
          es: "Crea nuevas páginas de OneNote",
          fr: "Créer de nouvelles pages OneNote",
          ja: "OneNoteページを作成",
        }
      },
      {
        key: "ui.manage.integrations.scopes.notes.readwrite.name",
        values: {
          en: "Manage notebooks",
          de: "Notizbücher verwalten",
          pl: "Zarządzaj notatnikami",
          es: "Gestionar cuadernos",
          fr: "Gérer les carnets",
          ja: "ノートブックを管理",
        }
      },
      {
        key: "ui.manage.integrations.scopes.notes.readwrite.description",
        values: {
          en: "Read and write to your notebooks",
          de: "Lese und schreibe deine Notizbücher",
          pl: "Czytaj i pisz swoje notatniki",
          es: "Lee y escribe tus cuadernos",
          fr: "Lire et écrire vos carnets",
          ja: "ノートブックの読み書き",
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

      // === MICROSOFT SCOPE SELECTOR ===
      // Info & Warnings
      {
        key: "ui.manage.integrations.scopes.info.title",
        values: {
          en: "Permission Scopes:",
          de: "Berechtigungsbereiche:",
          pl: "Zakresy uprawnień:",
          es: "Ámbitos de permisos:",
          fr: "Portées de permissions:",
          ja: "権限スコープ:",
        }
      },
      {
        key: "ui.manage.integrations.scopes.info.description",
        values: {
          en: "Select which Microsoft data you want to sync. You can always add or remove permissions later.",
          de: "Wähle, welche Microsoft-Daten du synchronisieren möchtest. Du kannst Berechtigungen später jederzeit hinzufügen oder entfernen.",
          pl: "Wybierz, które dane Microsoft chcesz synchronizować. Zawsze możesz później dodać lub usunąć uprawnienia.",
          es: "Selecciona qué datos de Microsoft deseas sincronizar. Siempre puedes agregar o eliminar permisos más tarde.",
          fr: "Sélectionnez les données Microsoft que vous souhaitez synchroniser. Vous pouvez toujours ajouter ou supprimer des autorisations plus tard.",
          ja: "同期するMicrosoftデータを選択してください。後でいつでも権限を追加または削除できます。",
        }
      },
      {
        key: "ui.manage.integrations.scopes.warning.title",
        values: {
          en: "Reconnection Required:",
          de: "Erneute Verbindung erforderlich:",
          pl: "Wymagane ponowne połączenie:",
          es: "Reconexión requerida:",
          fr: "Reconnexion requise:",
          ja: "再接続が必要:",
        }
      },
      {
        key: "ui.manage.integrations.scopes.warning.description",
        values: {
          en: "Changing permissions requires reconnecting your Microsoft account.",
          de: "Das Ändern von Berechtigungen erfordert eine erneute Verbindung deines Microsoft-Kontos.",
          pl: "Zmiana uprawnień wymaga ponownego połączenia konta Microsoft.",
          es: "Cambiar permisos requiere reconectar tu cuenta de Microsoft.",
          fr: "La modification des autorisations nécessite de reconnecter votre compte Microsoft.",
          ja: "権限を変更するには、Microsoftアカウントを再接続する必要があります。",
        }
      },
      {
        key: "ui.manage.integrations.scopes.readonly.title",
        values: {
          en: "Connected Permissions:",
          de: "Verbundene Berechtigungen:",
          pl: "Połączone uprawnienia:",
          es: "Permisos conectados:",
          fr: "Autorisations connectées :",
          ja: "接続された権限:",
        }
      },
      {
        key: "ui.manage.integrations.scopes.readonly.description",
        values: {
          en: "These are the permissions currently connected to your Microsoft account. To change them, disconnect and reconnect.",
          de: "Dies sind die derzeit mit deinem Microsoft-Konto verbundenen Berechtigungen. Um sie zu ändern, trenne die Verbindung und verbinde dich erneut.",
          pl: "To są uprawnienia obecnie połączone z twoim kontem Microsoft. Aby je zmienić, rozłącz i połącz ponownie.",
          es: "Estos son los permisos conectados actualmente a tu cuenta de Microsoft. Para cambiarlos, desconecta y vuelve a conectar.",
          fr: "Ce sont les autorisations actuellement connectées à votre compte Microsoft. Pour les modifier, déconnectez-vous et reconnectez-vous.",
          ja: "これらは現在Microsoftアカウントに接続されている権限です。変更するには、切断して再接続してください。",
        }
      },

      // Presets
      {
        key: "ui.manage.integrations.scopes.presets.title",
        values: {
          en: "Quick Presets",
          de: "Schnellvorlagen",
          pl: "Szybkie ustawienia",
          es: "Ajustes rápidos",
          fr: "Préréglages rapides",
          ja: "クイックプリセット",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.minimal.name",
        values: {
          en: "Minimal",
          de: "Minimal",
          pl: "Minimalne",
          es: "Mínimo",
          fr: "Minimal",
          ja: "最小限",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.minimal.description",
        values: {
          en: "Only required permissions",
          de: "Nur erforderliche Berechtigungen",
          pl: "Tylko wymagane uprawnienia",
          es: "Solo permisos requeridos",
          fr: "Uniquement les autorisations requises",
          ja: "必要な権限のみ",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.email.name",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo",
          fr: "E-mail",
          ja: "メール",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.email.description",
        values: {
          en: "Read and send emails",
          de: "E-Mails lesen und senden",
          pl: "Czytaj i wysyłaj e-maile",
          es: "Leer y enviar correos",
          fr: "Lire et envoyer des e-mails",
          ja: "メールの読み取りと送信",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.crm.name",
        values: {
          en: "CRM Suite",
          de: "CRM-Suite",
          pl: "Pakiet CRM",
          es: "Suite CRM",
          fr: "Suite CRM",
          ja: "CRMスイート",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.crm.description",
        values: {
          en: "Email, calendar, contacts",
          de: "E-Mail, Kalender, Kontakte",
          pl: "E-mail, kalendarz, kontakty",
          es: "Correo, calendario, contactos",
          fr: "E-mail, calendrier, contacts",
          ja: "メール、カレンダー、連絡先",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.productivity.name",
        values: {
          en: "Full Productivity",
          de: "Volle Produktivität",
          pl: "Pełna produktywność",
          es: "Productividad completa",
          fr: "Productivité complète",
          ja: "完全な生産性",
        }
      },
      {
        key: "ui.manage.integrations.scopes.presets.productivity.description",
        values: {
          en: "All 30 permissions (complete access)",
          de: "Alle 30 Berechtigungen (vollständiger Zugriff)",
          pl: "Wszystkie 30 uprawnień (pełny dostęp)",
          es: "Los 30 permisos (acceso completo)",
          fr: "Les 30 autorisations (accès complet)",
          ja: "全30権限（完全アクセス）",
        }
      },

      // Categories
      {
        key: "ui.manage.integrations.scopes.categories.title",
        values: {
          en: "Permission Categories",
          de: "Berechtigungskategorien",
          pl: "Kategorie uprawnień",
          es: "Categorías de permisos",
          fr: "Catégories de permissions",
          ja: "権限カテゴリ",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.mail.name",
        values: {
          en: "Email & Messages",
          de: "E-Mail & Nachrichten",
          pl: "E-mail i wiadomości",
          es: "Correo y mensajes",
          fr: "E-mail et messages",
          ja: "メールとメッセージ",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.calendar.name",
        values: {
          en: "Calendar & Events",
          de: "Kalender & Ereignisse",
          pl: "Kalendarz i wydarzenia",
          es: "Calendario y eventos",
          fr: "Calendrier et événements",
          ja: "カレンダーとイベント",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.contacts.name",
        values: {
          en: "Contacts & People",
          de: "Kontakte & Personen",
          pl: "Kontakty i osoby",
          es: "Contactos y personas",
          fr: "Contacts et personnes",
          ja: "連絡先と人々",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.files.name",
        values: {
          en: "Files & OneDrive",
          de: "Dateien & OneDrive",
          pl: "Pliki i OneDrive",
          es: "Archivos y OneDrive",
          fr: "Fichiers et OneDrive",
          ja: "ファイルとOneDrive",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.teams.name",
        values: {
          en: "Teams & Chat",
          de: "Teams & Chat",
          pl: "Teams i czat",
          es: "Teams y chat",
          fr: "Teams et chat",
          ja: "Teamsとチャット",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.sites.name",
        values: {
          en: "SharePoint Sites",
          de: "SharePoint-Sites",
          pl: "Witryny SharePoint",
          es: "Sitios de SharePoint",
          fr: "Sites SharePoint",
          ja: "SharePointサイト",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.tasks.name",
        values: {
          en: "Tasks & To-Do",
          de: "Aufgaben & To-Do",
          pl: "Zadania i lista zadań",
          es: "Tareas y lista de tareas",
          fr: "Tâches et to-do",
          ja: "タスクとTo-Do",
        }
      },
      {
        key: "ui.manage.integrations.scopes.categories.notes.name",
        values: {
          en: "OneNote",
          de: "OneNote",
          pl: "OneNote",
          es: "OneNote",
          fr: "OneNote",
          ja: "OneNote",
        }
      },

      // Actions
      {
        key: "ui.manage.integrations.scopes.actions.clear_all",
        values: {
          en: "Clear All",
          de: "Alle löschen",
          pl: "Wyczyść wszystko",
          es: "Limpiar todo",
          fr: "Tout effacer",
          ja: "すべてクリア",
        }
      },
      {
        key: "ui.manage.integrations.scopes.selected_count",
        values: {
          en: "{count} permission{plural} selected",
          de: "{count} Berechtigung{plural} ausgewählt",
          pl: "{count} uprawnienie{plural} wybrane",
          es: "{count} permiso{plural} seleccionado{plural}",
          fr: "{count} autorisation{plural} sélectionnée{plural}",
          ja: "{count}個の権限が選択されています",
        }
      },
      {
        key: "ui.manage.integrations.scopes.required_additional",
        values: {
          en: "(+ 5 required)",
          de: "(+ 5 erforderlich)",
          pl: "(+ 5 wymaganych)",
          es: "(+ 5 requeridos)",
          fr: "(+ 5 requis)",
          ja: "(+5つ必須)",
        }
      },
      {
        key: "ui.manage.integrations.scopes.admin_consent",
        values: {
          en: "Admin Consent",
          de: "Admin-Zustimmung",
          pl: "Zgoda administratora",
          es: "Consentimiento del administrador",
          fr: "Consentement administrateur",
          ja: "管理者の同意",
        }
      },
      {
        key: "ui.manage.integrations.scopes.category_stats",
        values: {
          en: "{selected} of {total} selected",
          de: "{selected} von {total} ausgewählt",
          pl: "{selected} z {total} wybrano",
          es: "{selected} de {total} seleccionados",
          fr: "{selected} sur {total} sélectionnées",
          ja: "{total}個中{selected}個選択",
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
