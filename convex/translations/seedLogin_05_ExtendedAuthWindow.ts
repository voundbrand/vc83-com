/**
 * SEED LOGIN WINDOW TRANSLATIONS - PART 5: EXTENDED AUTH WINDOW COPY
 *
 * Adds missing translation keys used by login-window.tsx
 * for all supported locales.
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Login Window translations (Part 5: Extended Auth Window)...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
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
      {
        key: "ui.login.check.create_free_account",
        values: {
          en: "Create Free Account",
          de: "Kostenloses Konto erstellen",
          pl: "Utwórz darmowe konto",
          es: "Crear cuenta gratis",
          fr: "Créer un compte gratuit",
          ja: "無料アカウントを作成",
        },
      },
      {
        key: "ui.login.check.no_account_prompt",
        values: {
          en: "Don't have an account?",
          de: "Noch kein Konto?",
          pl: "Nie masz konta?",
          es: "¿No tienes una cuenta?",
          fr: "Vous n'avez pas de compte ?",
          ja: "アカウントをお持ちではありませんか？",
        },
      },
      {
        key: "ui.login.check.note_invited_users",
        values: {
          en: "Invited users can sign in above. Free accounts get 100 contacts, 1 API key, and 250MB storage.",
          de: "Eingeladene Benutzer können sich oben anmelden. Kostenlose Konten erhalten 100 Kontakte, 1 API-Schlüssel und 250 MB Speicher.",
          pl: "Zaproszeni użytkownicy mogą zalogować się powyżej. Darmowe konta otrzymują 100 kontaktów, 1 klucz API i 250 MB miejsca.",
          es: "Los usuarios invitados pueden iniciar sesión arriba. Las cuentas gratuitas incluyen 100 contactos, 1 clave API y 250 MB de almacenamiento.",
          fr: "Les utilisateurs invités peuvent se connecter ci-dessus. Les comptes gratuits incluent 100 contacts, 1 clé API et 250 Mo de stockage.",
          ja: "招待されたユーザーは上からサインインできます。無料アカウントには100件の連絡先、1つのAPIキー、250MBのストレージが含まれます。",
        },
      },
      {
        key: "ui.login.check.note_label",
        values: {
          en: "Note:",
          de: "Hinweis:",
          pl: "Uwaga:",
          es: "Nota:",
          fr: "Remarque :",
          ja: "注意:",
        },
      },
      {
        key: "ui.login.check.private_beta_autoapprove_copy",
        values: {
          en: "New signups require approval unless a valid beta code is provided.",
          de: "Neue Registrierungen erfordern eine Freigabe, es sei denn, ein gültiger Beta-Code wird angegeben.",
          pl: "Nowe rejestracje wymagają zatwierdzenia, chyba że podano prawidłowy kod beta.",
          es: "Los nuevos registros requieren aprobación, a menos que se proporcione un código beta válido.",
          fr: "Les nouvelles inscriptions nécessitent une approbation, sauf si un code bêta valide est fourni.",
          ja: "有効なベータコードが提供されない限り、新規登録には承認が必要です。",
        },
      },
      {
        key: "ui.login.check.private_beta_label",
        values: {
          en: "Private Beta:",
          de: "Private Beta:",
          pl: "Prywatna beta:",
          es: "Beta privada:",
          fr: "Bêta privée :",
          ja: "プライベートベータ:",
        },
      },
      {
        key: "ui.login.check.private_beta_manual_copy",
        values: {
          en: "New signups require approval before accessing the platform.",
          de: "Neue Registrierungen benötigen vor dem Zugriff auf die Plattform eine Freigabe.",
          pl: "Nowe rejestracje wymagają zatwierdzenia przed uzyskaniem dostępu do platformy.",
          es: "Los nuevos registros requieren aprobación antes de acceder a la plataforma.",
          fr: "Les nouvelles inscriptions nécessitent une approbation avant d'accéder à la plateforme.",
          ja: "新規登録は、プラットフォームにアクセスする前に承認が必要です。",
        },
      },
      {
        key: "ui.login.common.or",
        values: {
          en: "or",
          de: "oder",
          pl: "lub",
          es: "o",
          fr: "ou",
          ja: "または",
        },
      },
      {
        key: "ui.login.error_terms_required",
        values: {
          en: "You must agree to the terms to continue",
          de: "Du musst den Bedingungen zustimmen, um fortzufahren",
          pl: "Aby kontynuować, musisz zaakceptować warunki",
          es: "Debes aceptar los términos para continuar",
          fr: "Vous devez accepter les conditions pour continuer",
          ja: "続行するには利用規約に同意する必要があります",
        },
      },
      {
        key: "ui.login.oauth.continue_with",
        values: {
          en: "Continue with {provider}",
          de: "Mit {provider} fortfahren",
          pl: "Kontynuuj z {provider}",
          es: "Continuar con {provider}",
          fr: "Continuer avec {provider}",
          ja: "{provider}で続行",
        },
      },
      {
        key: "ui.login.provider.apple",
        values: {
          en: "Apple",
          de: "Apple",
          pl: "Apple",
          es: "Apple",
          fr: "Apple",
          ja: "Apple",
        },
      },
      {
        key: "ui.login.provider.github",
        values: {
          en: "GitHub",
          de: "GitHub",
          pl: "GitHub",
          es: "GitHub",
          fr: "GitHub",
          ja: "GitHub",
        },
      },
      {
        key: "ui.login.provider.google",
        values: {
          en: "Google",
          de: "Google",
          pl: "Google",
          es: "Google",
          fr: "Google",
          ja: "Google",
        },
      },
      {
        key: "ui.login.provider.microsoft",
        values: {
          en: "Microsoft",
          de: "Microsoft",
          pl: "Microsoft",
          es: "Microsoft",
          fr: "Microsoft",
          ja: "Microsoft",
        },
      },
      {
        key: "ui.login.signin.passkey_authenticating",
        values: {
          en: "Authenticating...",
          de: "Authentifizierung...",
          pl: "Uwierzytelnianie...",
          es: "Autenticando...",
          fr: "Authentification...",
          ja: "認証中...",
        },
      },
      {
        key: "ui.login.signin.passkey_button",
        values: {
          en: "Sign in with Face ID / Touch ID",
          de: "Mit Face ID / Touch ID anmelden",
          pl: "Zaloguj się przez Face ID / Touch ID",
          es: "Iniciar sesión con Face ID / Touch ID",
          fr: "Se connecter avec Face ID / Touch ID",
          ja: "Face ID / Touch ID でサインイン",
        },
      },
      {
        key: "ui.login.signup.beta_access_code_required",
        values: {
          en: "A valid beta code is required for immediate access.",
          de: "Für sofortigen Zugriff ist ein gültiger Beta-Code erforderlich.",
          pl: "Do natychmiastowego dostępu wymagany jest prawidłowy kod beta.",
          es: "Se requiere un código beta válido para acceso inmediato.",
          fr: "Un code bêta valide est requis pour un accès immédiat.",
          ja: "即時アクセスには有効なベータコードが必要です。",
        },
      },
      {
        key: "ui.login.signup.beta_access_manual_approval",
        values: {
          en: "Without a valid code, your request enters manual review.",
          de: "Ohne gültigen Code wird deine Anfrage manuell geprüft.",
          pl: "Bez prawidłowego kodu Twoje zgłoszenie trafi do ręcznej weryfikacji.",
          es: "Sin un código válido, tu solicitud pasará a revisión manual.",
          fr: "Sans code valide, votre demande passera en examen manuel.",
          ja: "有効なコードがない場合、リクエストは手動審査に回されます。",
        },
      },
      {
        key: "ui.login.signup.beta_access_required",
        values: {
          en: "Beta Access Required:",
          de: "Beta-Zugang erforderlich:",
          pl: "Wymagany dostęp beta:",
          es: "Se requiere acceso beta:",
          fr: "Accès bêta requis :",
          ja: "ベータアクセスが必要:",
        },
      },
      {
        key: "ui.login.signup.beta_code_autoapprove_disabled",
        values: {
          en: "Beta codes are currently disabled for auto-approval.",
          de: "Beta-Codes sind derzeit für die automatische Freigabe deaktiviert.",
          pl: "Kody beta są obecnie wyłączone dla automatycznego zatwierdzania.",
          es: "Los códigos beta están desactivados actualmente para aprobación automática.",
          fr: "Les codes bêta sont actuellement désactivés pour l'approbation automatique.",
          ja: "現在、ベータコードによる自動承認は無効です。",
        },
      },
      {
        key: "ui.login.signup.beta_code_autoapprove_enabled",
        values: {
          en: "Valid beta code grants instant access.",
          de: "Ein gültiger Beta-Code gewährt sofortigen Zugriff.",
          pl: "Prawidłowy kod beta zapewnia natychmiastowy dostęp.",
          es: "Un código beta válido otorga acceso instantáneo.",
          fr: "Un code bêta valide accorde un accès instantané.",
          ja: "有効なベータコードで即時アクセスできます。",
        },
      },
      {
        key: "ui.login.signup.button_back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
        },
      },
      {
        key: "ui.login.signup.button_create_free_account",
        values: {
          en: "Create Free Account",
          de: "Kostenloses Konto erstellen",
          pl: "Utwórz darmowe konto",
          es: "Crear cuenta gratis",
          fr: "Créer un compte gratuit",
          ja: "無料アカウントを作成",
        },
      },
      {
        key: "ui.login.signup.button_creating_account",
        values: {
          en: "Creating Account...",
          de: "Konto wird erstellt...",
          pl: "Tworzenie konta...",
          es: "Creando cuenta...",
          fr: "Création du compte...",
          ja: "アカウント作成中...",
        },
      },
      {
        key: "ui.login.signup.label_beta_code",
        values: {
          en: "Beta Code (optional)",
          de: "Beta-Code (optional)",
          pl: "Kod beta (opcjonalnie)",
          es: "Código beta (opcional)",
          fr: "Code bêta (optionnel)",
          ja: "ベータコード（任意）",
        },
      },
      {
        key: "ui.login.signup.label_confirm_password",
        values: {
          en: "Confirm Password",
          de: "Passwort bestätigen",
          pl: "Potwierdź hasło",
          es: "Confirmar contraseña",
          fr: "Confirmer le mot de passe",
          ja: "パスワードを確認",
        },
      },
      {
        key: "ui.login.signup.label_email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo electrónico",
          fr: "E-mail",
          ja: "メール",
        },
      },
      {
        key: "ui.login.signup.label_first_name",
        values: {
          en: "First Name",
          de: "Vorname",
          pl: "Imię",
          es: "Nombre",
          fr: "Prénom",
          ja: "名",
        },
      },
      {
        key: "ui.login.signup.label_last_name",
        values: {
          en: "Last Name",
          de: "Nachname",
          pl: "Nazwisko",
          es: "Apellido",
          fr: "Nom",
          ja: "姓",
        },
      },
      {
        key: "ui.login.signup.label_organization_name",
        values: {
          en: "Organization Name (optional)",
          de: "Organisationsname (optional)",
          pl: "Nazwa organizacji (opcjonalnie)",
          es: "Nombre de la organización (opcional)",
          fr: "Nom de l'organisation (optionnel)",
          ja: "組織名（任意）",
        },
      },
      {
        key: "ui.login.signup.label_password",
        values: {
          en: "Password",
          de: "Passwort",
          pl: "Hasło",
          es: "Contraseña",
          fr: "Mot de passe",
          ja: "パスワード",
        },
      },
      {
        key: "ui.login.signup.placeholder_beta_code",
        values: {
          en: "BNI-PSW-001",
          de: "BNI-PSW-001",
          pl: "BNI-PSW-001",
          es: "BNI-PSW-001",
          fr: "BNI-PSW-001",
          ja: "BNI-PSW-001",
        },
      },
      {
        key: "ui.login.signup.placeholder_org_owner",
        values: {
          en: "Your",
          de: "Deine",
          pl: "Twoja",
          es: "Tu",
          fr: "Votre",
          ja: "あなたの",
        },
      },
      {
        key: "ui.login.signup.placeholder_organization",
        values: {
          en: "{owner}'s Organization",
          de: "Organisation von {owner}",
          pl: "Organizacja {owner}",
          es: "Organización de {owner}",
          fr: "Organisation de {owner}",
          ja: "{owner} の組織",
        },
      },
      {
        key: "ui.login.signup.placeholder_password",
        values: {
          en: "Min. 8 characters",
          de: "Mind. 8 Zeichen",
          pl: "Min. 8 znaków",
          es: "Mín. 8 caracteres",
          fr: "Min. 8 caractères",
          ja: "8文字以上",
        },
      },
      {
        key: "ui.login.signup.subtitle_beta_code",
        values: {
          en: "Request access or activate instantly with a valid beta code",
          de: "Zugang anfordern oder mit gültigem Beta-Code sofort aktivieren",
          pl: "Poproś o dostęp lub aktywuj natychmiast prawidłowym kodem beta",
          es: "Solicita acceso o activa al instante con un código beta válido",
          fr: "Demandez l'accès ou activez instantanément avec un code bêta valide",
          ja: "アクセスを申請するか、有効なベータコードで即時有効化",
        },
      },
      {
        key: "ui.login.signup.subtitle_free_tier",
        values: {
          en: "100 contacts - 1 API key - Free forever",
          de: "100 Kontakte - 1 API-Schlüssel - Für immer kostenlos",
          pl: "100 kontaktów - 1 klucz API - Za darmo na zawsze",
          es: "100 contactos - 1 clave API - Gratis para siempre",
          fr: "100 contacts - 1 clé API - Gratuit pour toujours",
          ja: "100件の連絡先 - 1つのAPIキー - ずっと無料",
        },
      },
      {
        key: "ui.login.signup.subtitle_private_beta",
        values: {
          en: "Request access to our private beta",
          de: "Zugang zur privaten Beta anfordern",
          pl: "Poproś o dostęp do naszej prywatnej bety",
          es: "Solicita acceso a nuestra beta privada",
          fr: "Demandez l'accès à notre bêta privée",
          ja: "プライベートベータへのアクセスを申請",
        },
      },
      {
        key: "ui.login.signup.terms.and",
        values: {
          en: "and",
          de: "und",
          pl: "i",
          es: "y",
          fr: "et",
          ja: "および",
        },
      },
      {
        key: "ui.login.signup.terms.prefix",
        values: {
          en: "I agree to the",
          de: "Ich stimme den",
          pl: "Akceptuję",
          es: "Acepto los",
          fr: "J'accepte les",
          ja: "私は次に同意します",
        },
      },
      {
        key: "ui.login.signup.terms.privacy_policy",
        values: {
          en: "Privacy Policy",
          de: "Datenschutzerklärung",
          pl: "Polityka prywatności",
          es: "Política de privacidad",
          fr: "Politique de confidentialité",
          ja: "プライバシーポリシー",
        },
      },
      {
        key: "ui.login.signup.terms.terms_of_service",
        values: {
          en: "Terms of Service",
          de: "Nutzungsbedingungen",
          pl: "Warunki korzystania",
          es: "Términos del servicio",
          fr: "Conditions d'utilisation",
          ja: "利用規約",
        },
      },
      {
        key: "ui.login.signup.title_beta_access",
        values: {
          en: "Apply for Beta Access",
          de: "Für Beta-Zugang bewerben",
          pl: "Złóż wniosek o dostęp beta",
          es: "Solicitar acceso beta",
          fr: "Demander l'accès bêta",
          ja: "ベータアクセスを申請",
        },
      },
      {
        key: "ui.login.signup.title_start_building",
        values: {
          en: "Start Building with sevenlayers.io",
          de: "Mit sevenlayers.io loslegen",
          pl: "Zacznij budować z sevenlayers.io",
          es: "Empieza a crear con sevenlayers.io",
          fr: "Commencez à créer avec sevenlayers.io",
          ja: "sevenlayers.io で構築を開始",
        },
      },
      {
        key: "ui.login.signup.validation_passwords_match",
        values: {
          en: "Passwords match",
          de: "Passwörter stimmen überein",
          pl: "Hasła są zgodne",
          es: "Las contraseñas coinciden",
          fr: "Les mots de passe correspondent",
          ja: "パスワードが一致しています",
        },
      },
      {
        key: "ui.login.signup.validation_passwords_mismatch",
        values: {
          en: "Passwords don't match",
          de: "Passwörter stimmen nicht überein",
          pl: "Hasła nie są zgodne",
          es: "Las contraseñas no coinciden",
          fr: "Les mots de passe ne correspondent pas",
          ja: "パスワードが一致しません",
        },
      },
      {
        key: "ui.login.signup_success.account_details.api_keys",
        values: {
          en: "API Keys:",
          de: "API-Schlüssel:",
          pl: "Klucze API:",
          es: "Claves API:",
          fr: "Clés API :",
          ja: "APIキー:",
        },
      },
      {
        key: "ui.login.signup_success.account_details.api_keys_usage",
        values: {
          en: "1/1 used",
          de: "1/1 verwendet",
          pl: "1/1 użyte",
          es: "1/1 usado",
          fr: "1/1 utilisé",
          ja: "1/1 使用中",
        },
      },
      {
        key: "ui.login.signup_success.account_details.contacts",
        values: {
          en: "Contacts:",
          de: "Kontakte:",
          pl: "Kontakty:",
          es: "Contactos:",
          fr: "Contacts :",
          ja: "連絡先:",
        },
      },
      {
        key: "ui.login.signup_success.account_details.contacts_usage",
        values: {
          en: "0/100 available",
          de: "0/100 verfügbar",
          pl: "0/100 dostępnych",
          es: "0/100 disponibles",
          fr: "0/100 disponibles",
          ja: "0/100 利用可能",
        },
      },
      {
        key: "ui.login.signup_success.account_details.organization",
        values: {
          en: "Organization:",
          de: "Organisation:",
          pl: "Organizacja:",
          es: "Organización:",
          fr: "Organisation :",
          ja: "組織:",
        },
      },
      {
        key: "ui.login.signup_success.account_details.plan",
        values: {
          en: "Plan:",
          de: "Plan:",
          pl: "Plan:",
          es: "Plan:",
          fr: "Forfait :",
          ja: "プラン:",
        },
      },
      {
        key: "ui.login.signup_success.account_details.plan_free",
        values: {
          en: "Free",
          de: "Kostenlos",
          pl: "Darmowy",
          es: "Gratis",
          fr: "Gratuit",
          ja: "無料",
        },
      },
      {
        key: "ui.login.signup_success.account_details_title",
        values: {
          en: "Account Details:",
          de: "Kontodetails:",
          pl: "Szczegóły konta:",
          es: "Detalles de la cuenta:",
          fr: "Détails du compte :",
          ja: "アカウント詳細:",
        },
      },
      {
        key: "ui.login.signup_success.api_key_label",
        values: {
          en: "Your API Key",
          de: "Dein API-Schlüssel",
          pl: "Twój klucz API",
          es: "Tu clave API",
          fr: "Votre clé API",
          ja: "あなたのAPIキー",
        },
      },
      {
        key: "ui.login.signup_success.api_key_purpose_body",
        values: {
          en: "Use this key to connect your apps and services to sevenlayers.io.",
          de: "Verwende diesen Schlüssel, um deine Apps und Dienste mit sevenlayers.io zu verbinden.",
          pl: "Użyj tego klucza, aby połączyć swoje aplikacje i usługi z sevenlayers.io.",
          es: "Usa esta clave para conectar tus apps y servicios con sevenlayers.io.",
          fr: "Utilisez cette clé pour connecter vos applications et services à sevenlayers.io.",
          ja: "このキーを使って、アプリやサービスを sevenlayers.io に接続します。",
        },
      },
      {
        key: "ui.login.signup_success.api_key_purpose_title",
        values: {
          en: "What's this for?",
          de: "Wofür ist das?",
          pl: "Do czego to służy?",
          es: "¿Para qué sirve esto?",
          fr: "À quoi cela sert-il ?",
          ja: "これは何に使いますか？",
        },
      },
      {
        key: "ui.login.signup_success.api_keys_manage_location",
        values: {
          en: "Settings -> Integrations",
          de: "Einstellungen -> Integrationen",
          pl: "Ustawienia -> Integracje",
          es: "Configuración -> Integraciones",
          fr: "Paramètres -> Intégrations",
          ja: "設定 -> 連携",
        },
      },
      {
        key: "ui.login.signup_success.api_keys_manage_prefix",
        values: {
          en: "You can manage your API keys in",
          de: "Du kannst deine API-Schlüssel verwalten unter",
          pl: "Kluczami API możesz zarządzać w",
          es: "Puedes administrar tus claves API en",
          fr: "Vous pouvez gérer vos clés API dans",
          ja: "APIキーは次の場所で管理できます",
        },
      },
      {
        key: "ui.login.signup_success.awaiting_approval",
        values: {
          en: "Awaiting Approval",
          de: "Warte auf Freigabe",
          pl: "Oczekuje na zatwierdzenie",
          es: "En espera de aprobación",
          fr: "En attente d'approbation",
          ja: "承認待ち",
        },
      },
      {
        key: "ui.login.signup_success.beta_access_requested",
        values: {
          en: "Beta Access Requested",
          de: "Beta-Zugang angefragt",
          pl: "Poproszono o dostęp beta",
          es: "Acceso beta solicitado",
          fr: "Accès bêta demandé",
          ja: "ベータアクセスを申請しました",
        },
      },
      {
        key: "ui.login.signup_success.continue_to_dashboard",
        values: {
          en: "Continue to Dashboard ->",
          de: "Zum Dashboard weiter ->",
          pl: "Przejdź do panelu ->",
          es: "Continuar al panel ->",
          fr: "Continuer vers le tableau de bord ->",
          ja: "ダッシュボードに進む ->",
        },
      },
      {
        key: "ui.login.signup_success.copy_api_key",
        values: {
          en: "Copy to Clipboard",
          de: "In Zwischenablage kopieren",
          pl: "Skopiuj do schowka",
          es: "Copiar al portapapeles",
          fr: "Copier dans le presse-papiers",
          ja: "クリップボードにコピー",
        },
      },
      {
        key: "ui.login.signup_success.download_env",
        values: {
          en: "Download .env File",
          de: ".env-Datei herunterladen",
          pl: "Pobierz plik .env",
          es: "Descargar archivo .env",
          fr: "Télécharger le fichier .env",
          ja: ".env ファイルをダウンロード",
        },
      },
      {
        key: "ui.login.signup_success.pending_copy",
        values: {
          en: "Your request is pending review. We will email you once access is approved.",
          de: "Deine Anfrage wird geprüft. Wir senden dir eine E-Mail, sobald der Zugriff freigegeben ist.",
          pl: "Twoje zgłoszenie oczekuje na weryfikację. Wyślemy e-mail, gdy dostęp zostanie zatwierdzony.",
          es: "Tu solicitud está en revisión. Te enviaremos un correo cuando se apruebe el acceso.",
          fr: "Votre demande est en cours d'examen. Nous vous enverrons un e-mail une fois l'accès approuvé.",
          ja: "リクエストは審査中です。アクセスが承認され次第メールでお知らせします。",
        },
      },
      {
        key: "ui.login.signup_success.pending_review_window",
        values: {
          en: "Most requests are reviewed within 24-48 hours.",
          de: "Die meisten Anfragen werden innerhalb von 24-48 Stunden geprüft.",
          pl: "Większość zgłoszeń jest rozpatrywana w ciągu 24-48 godzin.",
          es: "La mayoría de las solicitudes se revisan en 24-48 horas.",
          fr: "La plupart des demandes sont examinées sous 24 à 48 heures.",
          ja: "ほとんどのリクエストは24〜48時間以内に審査されます。",
        },
      },
      {
        key: "ui.login.signup_success.ready_copy",
        values: {
          en: "Your account is ready. Save your API key now before continuing.",
          de: "Dein Konto ist bereit. Speichere jetzt deinen API-Schlüssel, bevor du fortfährst.",
          pl: "Twoje konto jest gotowe. Zapisz teraz swój klucz API, zanim przejdziesz dalej.",
          es: "Tu cuenta está lista. Guarda tu clave API ahora antes de continuar.",
          fr: "Votre compte est prêt. Enregistrez votre clé API maintenant avant de continuer.",
          ja: "アカウントの準備ができました。続行する前にAPIキーを保存してください。",
        },
      },
      {
        key: "ui.login.signup_success.welcome",
        values: {
          en: "Welcome to sevenlayers.io!",
          de: "Willkommen bei sevenlayers.io!",
          pl: "Witamy w sevenlayers.io!",
          es: "¡Bienvenido a sevenlayers.io!",
          fr: "Bienvenue sur sevenlayers.io !",
          ja: "sevenlayers.io へようこそ！",
        },
      },
      {
        key: "ui.login.user.super_admin_badge",
        values: {
          en: "SUPER ADMIN",
          de: "SUPER-ADMIN",
          pl: "SUPER ADMIN",
          es: "SUPERADMIN",
          fr: "SUPER ADMIN",
          ja: "スーパー管理者",
        },
      },
    ];

    const allKeys = translations.map((t) => t.key);
    const existingKeys = await getExistingTranslationKeys(ctx.db, systemOrg._id, allKeys);

    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];
        if (!value) continue;

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

        if (inserted) count++;
      }
    }

    console.log(`✅ Seeded ${count} Login Window translations (Part 5)`);
    return { success: true, count };
  },
});
