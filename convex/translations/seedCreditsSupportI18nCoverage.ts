import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const SUPPORTED_LOCALES = ["en", "de", "pl", "es", "fr", "ja"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type TranslationEntry = {
  key: string;
  values: Record<SupportedLocale, string>;
};

const translations: TranslationEntry[] = [
  // Start menu + shell labels used by credits/support flows.
  {
    key: "ui.start_menu.feedback",
    values: {
      en: "Feedback",
      de: "Feedback",
      pl: "Opinie",
      es: "Comentarios",
      fr: "Commentaires",
      ja: "フィードバック",
    },
  },
  {
    key: "ui.start_menu.support_intake",
    values: {
      en: "Support Intake",
      de: "Support-Eingang",
      pl: "Intake wsparcia",
      es: "Ingreso de soporte",
      fr: "Accueil support",
      ja: "サポート受付",
    },
  },
  {
    key: "ui.start_menu.buy_credits",
    values: {
      en: "Buy Credits",
      de: "Credits kaufen",
      pl: "Kup kredyty",
      es: "Comprar créditos",
      fr: "Acheter des crédits",
      ja: "クレジットを購入",
    },
  },
  {
    key: "ui.start_menu.redeem_code",
    values: {
      en: "Redeem Code",
      de: "Code einlösen",
      pl: "Zrealizuj kod",
      es: "Canjear código",
      fr: "Utiliser un code",
      ja: "コードを引き換え",
    },
  },
  {
    key: "ui.start_menu.refer",
    values: {
      en: "Refer",
      de: "Empfehlen",
      pl: "Poleć",
      es: "Referir",
      fr: "Parrainer",
      ja: "紹介",
    },
  },
  {
    key: "ui.start_menu.credits",
    values: {
      en: "Credits",
      de: "Credits",
      pl: "Kredyty",
      es: "Créditos",
      fr: "Crédits",
      ja: "クレジット",
    },
  },
  {
    key: "ui.start_menu.language",
    values: {
      en: "Language",
      de: "Sprache",
      pl: "Język",
      es: "Idioma",
      fr: "Langue",
      ja: "言語",
    },
  },
  {
    key: "ui.start_menu.user_profile",
    values: {
      en: "User Profile",
      de: "Benutzerprofil",
      pl: "Profil użytkownika",
      es: "Perfil de usuario",
      fr: "Profil utilisateur",
      ja: "ユーザープロフィール",
    },
  },

  // Credits dropdown + top-right shell contract copy.
  {
    key: "ui.credits.menu.loading_balance",
    values: {
      en: "Loading credit balance...",
      de: "Lade Kreditstand...",
      pl: "Ładowanie salda kredytów...",
      es: "Cargando saldo de créditos...",
      fr: "Chargement du solde de crédits...",
      ja: "クレジット残高を読み込み中...",
    },
  },
  {
    key: "ui.credits.menu.current_buckets",
    values: {
      en: "Current credit buckets",
      de: "Aktuelle Kredit-Buckets",
      pl: "Aktualne pule kredytów",
      es: "Bolsas de créditos actuales",
      fr: "Poches de crédits actuelles",
      ja: "現在のクレジット内訳",
    },
  },
  {
    key: "ui.credits.menu.no_credits_allocated",
    values: {
      en: "No credits allocated yet",
      de: "Noch keine Credits zugewiesen",
      pl: "Nie przydzielono jeszcze kredytów",
      es: "Aún no hay créditos asignados",
      fr: "Aucun crédit attribué pour le moment",
      ja: "まだクレジットが割り当てられていません",
    },
  },
  {
    key: "ui.credits.menu.bucket.gifted",
    values: {
      en: "Gifted",
      de: "Geschenkt",
      pl: "Podarowane",
      es: "Regalados",
      fr: "Offerts",
      ja: "付与",
    },
  },
  {
    key: "ui.credits.menu.bucket.monthly",
    values: {
      en: "Monthly",
      de: "Monatlich",
      pl: "Miesięczne",
      es: "Mensuales",
      fr: "Mensuels",
      ja: "月次",
    },
  },
  {
    key: "ui.credits.menu.bucket.purchased",
    values: {
      en: "Purchased",
      de: "Gekauft",
      pl: "Zakupione",
      es: "Comprados",
      fr: "Achetés",
      ja: "購入",
    },
  },
  {
    key: "ui.credits.menu.bucket.total",
    values: {
      en: "Total",
      de: "Gesamt",
      pl: "Łącznie",
      es: "Total",
      fr: "Total",
      ja: "合計",
    },
  },
  {
    key: "ui.credits.menu.action.redeem_code",
    values: {
      en: "Redeem Code",
      de: "Code einlösen",
      pl: "Zrealizuj kod",
      es: "Canjear código",
      fr: "Utiliser un code",
      ja: "コードを引き換え",
    },
  },
  {
    key: "ui.credits.menu.action.buy_credits",
    values: {
      en: "Buy Credits",
      de: "Credits kaufen",
      pl: "Kup kredyty",
      es: "Comprar créditos",
      fr: "Acheter des crédits",
      ja: "クレジットを購入",
    },
  },
  {
    key: "ui.credits.menu.action.refer",
    values: {
      en: "Refer",
      de: "Empfehlen",
      pl: "Poleć",
      es: "Referir",
      fr: "Parrainer",
      ja: "紹介",
    },
  },
  {
    key: "ui.credits.menu.open_aria",
    values: {
      en: "Open credits menu",
      de: "Credits-Menü öffnen",
      pl: "Otwórz menu kredytów",
      es: "Abrir menú de créditos",
      fr: "Ouvrir le menu des crédits",
      ja: "クレジットメニューを開く",
    },
  },

  // Credits redeem modal.
  {
    key: "ui.credits.redeem.title",
    values: {
      en: "Redeem Credits",
      de: "Credits einlösen",
      pl: "Zrealizuj kredyty",
      es: "Canjear créditos",
      fr: "Utiliser des crédits",
      ja: "クレジットを引き換え",
    },
  },
  {
    key: "ui.credits.redeem.subtitle",
    values: {
      en: "Add gifted credits using a valid redeem code.",
      de: "Füge geschenkte Credits mit einem gültigen Code hinzu.",
      pl: "Dodaj podarowane kredyty za pomocą poprawnego kodu.",
      es: "Añade créditos regalados con un código válido.",
      fr: "Ajoutez des crédits offerts avec un code valide.",
      ja: "有効な引き換えコードで付与クレジットを追加します。",
    },
  },
  {
    key: "ui.credits.redeem.current_credits",
    values: {
      en: "Current credits",
      de: "Aktuelle Credits",
      pl: "Aktualne kredyty",
      es: "Créditos actuales",
      fr: "Crédits actuels",
      ja: "現在のクレジット",
    },
  },
  {
    key: "ui.credits.redeem.code_label",
    values: {
      en: "Redeem code",
      de: "Einlösecode",
      pl: "Kod realizacji",
      es: "Código de canje",
      fr: "Code d'utilisation",
      ja: "引き換えコード",
    },
  },
  {
    key: "ui.credits.redeem.code_placeholder",
    values: {
      en: "EXAMPLE-ABCD-1234",
      de: "BEISPIEL-ABCD-1234",
      pl: "PRZYKLAD-ABCD-1234",
      es: "EJEMPLO-ABCD-1234",
      fr: "EXEMPLE-ABCD-1234",
      ja: "EXAMPLE-ABCD-1234",
    },
  },
  {
    key: "ui.credits.redeem.notice.last_redeem",
    values: {
      en: "Last redeem:",
      de: "Letzte Einlösung:",
      pl: "Ostatnia realizacja:",
      es: "Último canje:",
      fr: "Dernière utilisation :",
      ja: "前回の引き換え:",
    },
  },
  {
    key: "ui.credits.redeem.notice.remaining_redemptions",
    values: {
      en: "Remaining redemptions for this code:",
      de: "Verbleibende Einlösungen für diesen Code:",
      pl: "Pozostałe realizacje dla tego kodu:",
      es: "Canjes restantes para este código:",
      fr: "Utilisations restantes pour ce code :",
      ja: "このコードの残り利用回数:",
    },
  },
  {
    key: "ui.credits.redeem.status.redeeming",
    values: {
      en: "Redeeming...",
      de: "Wird eingelöst...",
      pl: "Realizacja...",
      es: "Canjeando...",
      fr: "Utilisation...",
      ja: "引き換え中...",
    },
  },
  {
    key: "ui.credits.redeem.action.redeem",
    values: {
      en: "Redeem Code",
      de: "Code einlösen",
      pl: "Zrealizuj kod",
      es: "Canjear código",
      fr: "Utiliser un code",
      ja: "コードを引き換え",
    },
  },
  {
    key: "ui.credits.redeem.action.buy_credits",
    values: {
      en: "Buy Credits",
      de: "Credits kaufen",
      pl: "Kup kredyty",
      es: "Comprar créditos",
      fr: "Acheter des crédits",
      ja: "クレジットを購入",
    },
  },
  {
    key: "ui.credits.redeem.error.sign_in_required",
    values: {
      en: "Sign in to redeem a code.",
      de: "Melde dich an, um einen Code einzulösen.",
      pl: "Zaloguj się, aby zrealizować kod.",
      es: "Inicia sesión para canjear un código.",
      fr: "Connectez-vous pour utiliser un code.",
      ja: "コードを引き換えるにはサインインしてください。",
    },
  },
  {
    key: "ui.credits.redeem.error.min_length",
    values: {
      en: "Enter at least 6 characters.",
      de: "Gib mindestens 6 Zeichen ein.",
      pl: "Wpisz co najmniej 6 znaków.",
      es: "Introduce al menos 6 caracteres.",
      fr: "Saisissez au moins 6 caractères.",
      ja: "6文字以上入力してください。",
    },
  },
  {
    key: "ui.credits.redeem.success.redeemed_added",
    values: {
      en: "Code redeemed. Added {credits} gifted credits.",
      de: "Code eingelöst. {credits} geschenkte Credits hinzugefügt.",
      pl: "Kod zrealizowany. Dodano {credits} podarowanych kredytów.",
      es: "Código canjeado. Se añadieron {credits} créditos regalados.",
      fr: "Code utilisé. {credits} crédits offerts ajoutés.",
      ja: "コードを引き換えました。{credits} の付与クレジットを追加しました。",
    },
  },
  {
    key: "ui.credits.redeem.error.generic",
    values: {
      en: "We could not redeem that code. Please try again.",
      de: "Dieser Code konnte nicht eingelöst werden. Bitte versuche es erneut.",
      pl: "Nie udało się zrealizować tego kodu. Spróbuj ponownie.",
      es: "No pudimos canjear ese código. Inténtalo de nuevo.",
      fr: "Impossible d'utiliser ce code. Veuillez réessayer.",
      ja: "そのコードを引き換えできませんでした。もう一度お試しください。",
    },
  },
  {
    key: "ui.credits.redeem.error.invalid_format",
    values: {
      en: "Enter a valid redeem code format.",
      de: "Gib ein gültiges Code-Format ein.",
      pl: "Wpisz prawidłowy format kodu.",
      es: "Introduce un formato de código válido.",
      fr: "Saisissez un format de code valide.",
      ja: "有効なコード形式を入力してください。",
    },
  },
  {
    key: "ui.credits.redeem.error.code_not_recognized",
    values: {
      en: "This code is not recognized.",
      de: "Dieser Code ist nicht bekannt.",
      pl: "Ten kod nie jest rozpoznany.",
      es: "Este código no se reconoce.",
      fr: "Ce code n'est pas reconnu.",
      ja: "このコードは認識されません。",
    },
  },
  {
    key: "ui.credits.redeem.error.expired",
    values: {
      en: "This code has expired.",
      de: "Dieser Code ist abgelaufen.",
      pl: "Ten kod wygasł.",
      es: "Este código ha caducado.",
      fr: "Ce code a expiré.",
      ja: "このコードは期限切れです。",
    },
  },
  {
    key: "ui.credits.redeem.error.revoked",
    values: {
      en: "This code has been revoked.",
      de: "Dieser Code wurde widerrufen.",
      pl: "Ten kod został unieważniony.",
      es: "Este código fue revocado.",
      fr: "Ce code a été révoqué.",
      ja: "このコードは無効化されました。",
    },
  },
  {
    key: "ui.credits.redeem.error.exhausted",
    values: {
      en: "This code has no remaining redemptions.",
      de: "Dieser Code hat keine verbleibenden Einlösungen.",
      pl: "Ten kod nie ma już pozostałych realizacji.",
      es: "Este código ya no tiene canjes disponibles.",
      fr: "Ce code n'a plus d'utilisations disponibles.",
      ja: "このコードの利用可能回数は残っていません。",
    },
  },
  {
    key: "ui.credits.redeem.error.already_redeemed",
    values: {
      en: "You have already redeemed this code.",
      de: "Du hast diesen Code bereits eingelöst.",
      pl: "Ten kod został już przez Ciebie zrealizowany.",
      es: "Ya has canjeado este código.",
      fr: "Vous avez déjà utilisé ce code.",
      ja: "このコードはすでに引き換え済みです。",
    },
  },
  {
    key: "ui.credits.redeem.error.not_eligible",
    values: {
      en: "Your account is not eligible for this code.",
      de: "Dein Konto ist für diesen Code nicht berechtigt.",
      pl: "Twoje konto nie kwalifikuje się do tego kodu.",
      es: "Tu cuenta no es elegible para este código.",
      fr: "Votre compte n'est pas éligible pour ce code.",
      ja: "このコードはあなたのアカウントでは利用できません。",
    },
  },
  {
    key: "ui.credits.redeem.error.invalid_policy",
    values: {
      en: "This code policy is invalid. Contact support.",
      de: "Diese Code-Richtlinie ist ungültig. Kontaktiere den Support.",
      pl: "Polityka tego kodu jest nieprawidłowa. Skontaktuj się ze wsparciem.",
      es: "La política de este código es inválida. Contacta con soporte.",
      fr: "La politique de ce code est invalide. Contactez le support.",
      ja: "このコードポリシーは無効です。サポートに連絡してください。",
    },
  },
  {
    key: "ui.credits.redeem.error.grant_failed",
    values: {
      en: "The code was validated but credits could not be applied.",
      de: "Der Code wurde validiert, aber Credits konnten nicht angewendet werden.",
      pl: "Kod został zweryfikowany, ale kredyty nie mogły zostać dodane.",
      es: "El código fue validado, pero no se pudieron aplicar créditos.",
      fr: "Le code a été validé, mais les crédits n'ont pas pu être appliqués.",
      ja: "コードは検証されましたが、クレジットを適用できませんでした。",
    },
  },

  // Feedback modal.
  {
    key: "ui.feedback.title",
    values: {
      en: "Feedback",
      de: "Feedback",
      pl: "Opinie",
      es: "Comentarios",
      fr: "Commentaires",
      ja: "フィードバック",
    },
  },
  {
    key: "ui.feedback.subtitle",
    values: {
      en: "Share sentiment and context so support can triage faster",
      de: "Teile Stimmung und Kontext, damit Support schneller triagieren kann",
      pl: "Podziel się oceną i kontekstem, aby wsparcie mogło szybciej reagować",
      es: "Comparte sentimiento y contexto para que soporte priorice más rápido",
      fr: "Partagez votre ressenti et le contexte pour accélérer le triage support",
      ja: "感情と状況を共有して、サポートの初期対応を迅速化します",
    },
  },
  {
    key: "ui.feedback.sentiment.label",
    values: {
      en: "Sentiment",
      de: "Stimmung",
      pl: "Ocena",
      es: "Sentimiento",
      fr: "Ressenti",
      ja: "評価",
    },
  },
  {
    key: "ui.feedback.sentiment.negative.label",
    values: {
      en: "Negative",
      de: "Negativ",
      pl: "Negatywna",
      es: "Negativo",
      fr: "Négatif",
      ja: "ネガティブ",
    },
  },
  {
    key: "ui.feedback.sentiment.negative.description",
    values: {
      en: "Something blocked or degraded your workflow.",
      de: "Etwas hat deinen Workflow blockiert oder verschlechtert.",
      pl: "Coś zablokowało lub pogorszyło Twój przepływ pracy.",
      es: "Algo bloqueó o degradó tu flujo de trabajo.",
      fr: "Quelque chose a bloqué ou dégradé votre flux de travail.",
      ja: "ワークフローを妨げる、または低下させる問題がありました。",
    },
  },
  {
    key: "ui.feedback.sentiment.negative.hint",
    values: {
      en: "Tell us what failed, where it happened, and what you expected.",
      de: "Sag uns, was fehlgeschlagen ist, wo es passiert ist und was du erwartet hast.",
      pl: "Opisz, co nie zadziałało, gdzie to się stało i czego oczekiwałeś.",
      es: "Cuéntanos qué falló, dónde ocurrió y qué esperabas.",
      fr: "Dites-nous ce qui a échoué, où cela s'est produit et ce que vous attendiez.",
      ja: "何が失敗し、どこで発生し、何を期待していたかを教えてください。",
    },
  },
  {
    key: "ui.feedback.sentiment.neutral.label",
    values: {
      en: "Neutral",
      de: "Neutral",
      pl: "Neutralna",
      es: "Neutral",
      fr: "Neutre",
      ja: "ニュートラル",
    },
  },
  {
    key: "ui.feedback.sentiment.neutral.description",
    values: {
      en: "The experience was okay but needs refinement.",
      de: "Die Erfahrung war okay, braucht aber Feinschliff.",
      pl: "Doświadczenie było w porządku, ale wymaga dopracowania.",
      es: "La experiencia fue aceptable, pero necesita mejoras.",
      fr: "L'expérience était correcte mais nécessite des améliorations.",
      ja: "体験は問題ないものの、改善の余地があります。",
    },
  },
  {
    key: "ui.feedback.sentiment.neutral.hint",
    values: {
      en: "Share what worked and where the flow still feels unclear.",
      de: "Teile, was funktioniert hat und wo der Ablauf noch unklar ist.",
      pl: "Podziel się tym, co działało i gdzie przepływ nadal jest niejasny.",
      es: "Comparte qué funcionó y dónde el flujo aún no es claro.",
      fr: "Partagez ce qui a fonctionné et ce qui reste flou.",
      ja: "うまくいった点と、まだ分かりにくい流れを共有してください。",
    },
  },
  {
    key: "ui.feedback.sentiment.positive.label",
    values: {
      en: "Positive",
      de: "Positiv",
      pl: "Pozytywna",
      es: "Positivo",
      fr: "Positif",
      ja: "ポジティブ",
    },
  },
  {
    key: "ui.feedback.sentiment.positive.description",
    values: {
      en: "The experience met or exceeded expectations.",
      de: "Die Erfahrung hat Erwartungen erfüllt oder übertroffen.",
      pl: "Doświadczenie spełniło lub przekroczyło oczekiwania.",
      es: "La experiencia cumplió o superó expectativas.",
      fr: "L'expérience a répondu ou dépassé les attentes.",
      ja: "体験は期待どおり、または期待以上でした。",
    },
  },
  {
    key: "ui.feedback.sentiment.positive.hint",
    values: {
      en: "Tell us what worked so we can preserve it while we improve.",
      de: "Sag uns, was funktioniert hat, damit wir es bei Verbesserungen beibehalten.",
      pl: "Powiedz, co działało, abyśmy mogli to utrzymać podczas ulepszeń.",
      es: "Cuéntanos qué funcionó para mantenerlo mientras mejoramos.",
      fr: "Dites-nous ce qui a bien marché pour le préserver pendant les améliorations.",
      ja: "改善を進める中でも維持すべき、うまくいった点を教えてください。",
    },
  },
  {
    key: "ui.feedback.message.label",
    values: {
      en: "Your message",
      de: "Deine Nachricht",
      pl: "Twoja wiadomość",
      es: "Tu mensaje",
      fr: "Votre message",
      ja: "メッセージ",
    },
  },
  {
    key: "ui.feedback.message.placeholder",
    values: {
      en: "Describe what happened and what you expected.",
      de: "Beschreibe, was passiert ist und was du erwartet hast.",
      pl: "Opisz, co się stało i czego oczekiwałeś.",
      es: "Describe qué ocurrió y qué esperabas.",
      fr: "Décrivez ce qui s'est passé et ce que vous attendiez.",
      ja: "何が起きたか、何を期待していたかを記入してください。",
    },
  },
  {
    key: "ui.feedback.link.open_support",
    values: {
      en: "Need help now? Open support intake",
      de: "Brauchst du jetzt Hilfe? Support-Eingang öffnen",
      pl: "Potrzebujesz pomocy teraz? Otwórz intake wsparcia",
      es: "¿Necesitas ayuda ahora? Abre ingreso de soporte",
      fr: "Besoin d'aide maintenant ? Ouvrez l'accueil support",
      ja: "今すぐサポートが必要ですか？サポート受付を開く",
    },
  },
  {
    key: "ui.feedback.button.submitting",
    values: {
      en: "Submitting...",
      de: "Wird gesendet...",
      pl: "Wysyłanie...",
      es: "Enviando...",
      fr: "Envoi...",
      ja: "送信中...",
    },
  },
  {
    key: "ui.feedback.button.submit",
    values: {
      en: "Submit Feedback",
      de: "Feedback senden",
      pl: "Wyślij opinię",
      es: "Enviar comentarios",
      fr: "Envoyer un retour",
      ja: "フィードバックを送信",
    },
  },
  {
    key: "ui.feedback.success.title",
    values: {
      en: "Thanks for your feedback",
      de: "Danke für dein Feedback",
      pl: "Dziękujemy za opinię",
      es: "Gracias por tus comentarios",
      fr: "Merci pour votre retour",
      ja: "フィードバックありがとうございます",
    },
  },
  {
    key: "ui.feedback.success.description",
    values: {
      en: "Your message was sent to our support team with runtime context so they can act quickly.",
      de: "Deine Nachricht wurde mit Laufzeitkontext an unser Support-Team gesendet.",
      pl: "Twoja wiadomość została wysłana do wsparcia wraz z kontekstem działania.",
      es: "Tu mensaje se envió a soporte con contexto de ejecución para actuar rápido.",
      fr: "Votre message a été envoyé au support avec le contexte d'exécution.",
      ja: "メッセージは実行時コンテキスト付きでサポートチームに送信されました。",
    },
  },
  {
    key: "ui.feedback.button.open_support",
    values: {
      en: "Open Support Intake",
      de: "Support-Eingang öffnen",
      pl: "Otwórz intake wsparcia",
      es: "Abrir ingreso de soporte",
      fr: "Ouvrir l'accueil support",
      ja: "サポート受付を開く",
    },
  },
  {
    key: "ui.feedback.button.submit_another",
    values: {
      en: "Submit Another",
      de: "Weiteres senden",
      pl: "Wyślij kolejną",
      es: "Enviar otro",
      fr: "Envoyer un autre",
      ja: "もう一件送信",
    },
  },
  {
    key: "ui.feedback.error.submit_failed",
    values: {
      en: "Failed to submit feedback. Please try again.",
      de: "Feedback konnte nicht gesendet werden. Bitte erneut versuchen.",
      pl: "Nie udało się wysłać opinii. Spróbuj ponownie.",
      es: "No se pudo enviar el comentario. Inténtalo de nuevo.",
      fr: "Échec de l'envoi du retour. Veuillez réessayer.",
      ja: "フィードバックの送信に失敗しました。もう一度お試しください。",
    },
  },

  // Support intake surface.
  {
    key: "ui.tickets.action.support_intake",
    values: {
      en: "Support Intake",
      de: "Support-Eingang",
      pl: "Intake wsparcia",
      es: "Ingreso de soporte",
      fr: "Accueil support",
      ja: "サポート受付",
    },
  },
  {
    key: "ui.tickets.support_intake.system_status",
    values: {
      en: "System Status",
      de: "Systemstatus",
      pl: "Status systemu",
      es: "Estado del sistema",
      fr: "État du système",
      ja: "システム状態",
    },
  },
  {
    key: "ui.tickets.support_intake.system_operational",
    values: {
      en: "Operational",
      de: "Betriebsbereit",
      pl: "Operacyjny",
      es: "Operativo",
      fr: "Opérationnel",
      ja: "稼働中",
    },
  },
  {
    key: "ui.tickets.support_intake.product_label",
    values: {
      en: "Product",
      de: "Produkt",
      pl: "Produkt",
      es: "Producto",
      fr: "Produit",
      ja: "製品",
    },
  },
  {
    key: "ui.tickets.support_intake.account_label",
    values: {
      en: "Account",
      de: "Konto",
      pl: "Konto",
      es: "Cuenta",
      fr: "Compte",
      ja: "アカウント",
    },
  },
  {
    key: "ui.tickets.support_intake.account_current",
    values: {
      en: "Current account",
      de: "Aktuelles Konto",
      pl: "Bieżące konto",
      es: "Cuenta actual",
      fr: "Compte actuel",
      ja: "現在のアカウント",
    },
  },
  {
    key: "ui.tickets.support_intake.card.support.title",
    values: {
      en: "Contact Support",
      de: "Support kontaktieren",
      pl: "Skontaktuj się ze wsparciem",
      es: "Contactar soporte",
      fr: "Contacter le support",
      ja: "サポートへ連絡",
    },
  },
  {
    key: "ui.tickets.support_intake.card.support.description",
    values: {
      en: "General-purpose path for bug reports, incidents, and billing/product questions.",
      de: "Allgemeiner Weg für Bugs, Vorfälle und Abrechnungs-/Produktfragen.",
      pl: "Ogólna ścieżka dla błędów, incydentów i pytań o produkt lub rozliczenia.",
      es: "Ruta general para errores, incidentes y dudas de facturación o producto.",
      fr: "Voie générale pour bugs, incidents et questions produit/facturation.",
      ja: "不具合・障害・請求/製品に関する問い合わせ向けの一般窓口です。",
    },
  },
  {
    key: "ui.tickets.support_intake.card.support.action",
    values: {
      en: "Open AI Support Intake",
      de: "KI-Support-Eingang öffnen",
      pl: "Otwórz intake wsparcia AI",
      es: "Abrir ingreso de soporte IA",
      fr: "Ouvrir l'accueil support IA",
      ja: "AIサポート受付を開く",
    },
  },
  {
    key: "ui.tickets.support_intake.card.community.title",
    values: {
      en: "Community Help",
      de: "Community-Hilfe",
      pl: "Pomoc społeczności",
      es: "Ayuda de la comunidad",
      fr: "Aide communauté",
      ja: "コミュニティヘルプ",
    },
  },
  {
    key: "ui.tickets.support_intake.card.community.description",
    values: {
      en: "Best for how-to guidance, setup patterns, and peer-driven answers.",
      de: "Am besten für Anleitungen, Setup-Muster und Antworten aus der Community.",
      pl: "Najlepsze do poradników, konfiguracji i odpowiedzi społeczności.",
      es: "Ideal para guías prácticas, patrones de configuración y respuestas de la comunidad.",
      fr: "Idéal pour guides, modèles de configuration et réponses entre pairs.",
      ja: "手順ガイド、設定パターン、コミュニティ回答に最適です。",
    },
  },
  {
    key: "ui.tickets.support_intake.card.community.action",
    values: {
      en: "Open Community Assistant",
      de: "Community-Assistent öffnen",
      pl: "Otwórz asystenta społeczności",
      es: "Abrir asistente de comunidad",
      fr: "Ouvrir l'assistant communauté",
      ja: "コミュニティアシスタントを開く",
    },
  },
  {
    key: "ui.tickets.support_intake.card.sales.title",
    values: {
      en: "Enterprise Sales",
      de: "Enterprise-Vertrieb",
      pl: "Sprzedaż Enterprise",
      es: "Ventas Enterprise",
      fr: "Ventes Enterprise",
      ja: "エンタープライズ営業",
    },
  },
  {
    key: "ui.tickets.support_intake.card.sales.description",
    values: {
      en: "Enterprise-only path for procurement, volume pricing, and rollout planning.",
      de: "Nur für Enterprise: Beschaffung, Mengenpreise und Rollout-Planung.",
      pl: "Ścieżka enterprise dla zakupów, cen wolumenowych i planu wdrożenia.",
      es: "Ruta enterprise para compras, precios por volumen y planificación de despliegue.",
      fr: "Voie enterprise pour achats, prix volume et planification de déploiement.",
      ja: "調達・ボリューム価格・導入計画向けのエンタープライズ窓口です。",
    },
  },
  {
    key: "ui.tickets.support_intake.card.sales.badge",
    values: {
      en: "Enterprise",
      de: "Enterprise",
      pl: "Enterprise",
      es: "Enterprise",
      fr: "Enterprise",
      ja: "Enterprise",
    },
  },
  {
    key: "ui.tickets.support_intake.card.sales.action",
    values: {
      en: "Contact Sales",
      de: "Vertrieb kontaktieren",
      pl: "Skontaktuj się ze sprzedażą",
      es: "Contactar ventas",
      fr: "Contacter les ventes",
      ja: "営業に連絡",
    },
  },
  {
    key: "ui.tickets.support_intake.card.sales.note",
    values: {
      en: "Product issues, bugs, and account incidents should use the support path above.",
      de: "Produktprobleme, Bugs und Konto-Vorfälle sollten den Support-Weg oben nutzen.",
      pl: "Problemy produktowe, błędy i incydenty konta powinny iść ścieżką wsparcia powyżej.",
      es: "Problemas de producto, errores e incidencias de cuenta deben usar la ruta de soporte.",
      fr: "Les problèmes produit, bugs et incidents de compte doivent passer par le support ci-dessus.",
      ja: "製品問題・不具合・アカウント障害は上記サポート経路をご利用ください。",
    },
  },
  {
    key: "ui.tickets.support_intake.routing_context",
    values: {
      en: "Current routing context: product {product}, account {account}.",
      de: "Aktueller Routing-Kontext: Produkt {product}, Konto {account}.",
      pl: "Bieżący kontekst routingu: produkt {product}, konto {account}.",
      es: "Contexto de enrutamiento actual: producto {product}, cuenta {account}.",
      fr: "Contexte de routage actuel : produit {product}, compte {account}.",
      ja: "現在のルーティングコンテキスト: 製品 {product}、アカウント {account}。",
    },
  },
  {
    key: "ui.tickets.support_intake.product.ai_assistant",
    values: {
      en: "AI Assistant",
      de: "KI-Assistent",
      pl: "Asystent AI",
      es: "Asistente IA",
      fr: "Assistant IA",
      ja: "AIアシスタント",
    },
  },
  {
    key: "ui.tickets.support_intake.product.store_credits",
    values: {
      en: "Store & Credits",
      de: "Store & Credits",
      pl: "Sklep i kredyty",
      es: "Tienda y créditos",
      fr: "Boutique et crédits",
      ja: "ストアとクレジット",
    },
  },
  {
    key: "ui.tickets.support_intake.product.integrations",
    values: {
      en: "Integrations",
      de: "Integrationen",
      pl: "Integracje",
      es: "Integraciones",
      fr: "Intégrations",
      ja: "連携",
    },
  },
  {
    key: "ui.tickets.support_intake.product.billing",
    values: {
      en: "Billing",
      de: "Abrechnung",
      pl: "Rozliczenia",
      es: "Facturación",
      fr: "Facturation",
      ja: "請求",
    },
  },
  {
    key: "ui.tickets.support_intake.product.builder",
    values: {
      en: "Builder",
      de: "Builder",
      pl: "Builder",
      es: "Builder",
      fr: "Builder",
      ja: "Builder",
    },
  },
  {
    key: "ui.tickets.support_intake.product.other",
    values: {
      en: "Other",
      de: "Andere",
      pl: "Inne",
      es: "Otro",
      fr: "Autre",
      ja: "その他",
    },
  },
  {
    key: "ui.tickets.support_intake.sales_subject",
    values: {
      en: "[Enterprise] {product} inquiry",
      de: "[Enterprise] Anfrage zu {product}",
      pl: "[Enterprise] zapytanie o {product}",
      es: "[Enterprise] consulta sobre {product}",
      fr: "[Enterprise] demande sur {product}",
      ja: "[Enterprise] {product} に関する問い合わせ",
    },
  },
  {
    key: "ui.tickets.support_intake.sales_body",
    values: {
      en: "Account: {account}\nProduct: {product}\nSource: {source}\n\nPlease share enterprise pricing and rollout options.",
      de: "Konto: {account}\nProdukt: {product}\nQuelle: {source}\n\nBitte teilen Sie Enterprise-Preise und Rollout-Optionen mit.",
      pl: "Konto: {account}\nProdukt: {product}\nŹródło: {source}\n\nProszę o ceny enterprise i opcje wdrożenia.",
      es: "Cuenta: {account}\nProducto: {product}\nOrigen: {source}\n\nCompartan precios enterprise y opciones de despliegue.",
      fr: "Compte : {account}\nProduit : {product}\nSource : {source}\n\nMerci de partager les tarifs enterprise et options de déploiement.",
      ja: "アカウント: {account}\n製品: {product}\nソース: {source}\n\nEnterprise 料金と導入オプションをご案内ください。",
    },
  },

  // Benefits + referrals additions.
  {
    key: "ui.benefits.tabs.referrals",
    values: {
      en: "Referrals",
      de: "Empfehlungen",
      pl: "Polecenia",
      es: "Referidos",
      fr: "Parrainages",
      ja: "紹介",
    },
  },
  {
    key: "ui.benefits.detail.select_benefit_hint",
    values: {
      en: "Click on a benefit to view details",
      de: "Klicke auf einen Benefit, um Details zu sehen",
      pl: "Kliknij benefit, aby zobaczyć szczegóły",
      es: "Haz clic en un beneficio para ver detalles",
      fr: "Cliquez sur un avantage pour voir les détails",
      ja: "特典をクリックして詳細を表示",
    },
  },
  {
    key: "ui.benefits.commission_detail.select_hint",
    values: {
      en: "Click on a commission to view details",
      de: "Klicke auf eine Provision, um Details zu sehen",
      pl: "Kliknij prowizję, aby zobaczyć szczegóły",
      es: "Haz clic en una comisión para ver detalles",
      fr: "Cliquez sur une commission pour voir les détails",
      ja: "コミッションをクリックして詳細を表示",
    },
  },
  {
    key: "ui.benefits.referrals.login_required_title",
    values: {
      en: "Please log in",
      de: "Bitte einloggen",
      pl: "Zaloguj się",
      es: "Inicia sesión",
      fr: "Veuillez vous connecter",
      ja: "ログインしてください",
    },
  },
  {
    key: "ui.benefits.referrals.login_required_description",
    values: {
      en: "Login required to access referral rewards.",
      de: "Anmeldung erforderlich, um Empfehlungsprämien zu sehen.",
      pl: "Logowanie wymagane, aby uzyskać dostęp do nagród za polecenia.",
      es: "Se requiere inicio de sesión para acceder a recompensas por referidos.",
      fr: "Connexion requise pour accéder aux récompenses de parrainage.",
      ja: "紹介報酬にアクセスするにはログインが必要です。",
    },
  },
  {
    key: "ui.benefits.referrals.loading",
    values: {
      en: "Loading referral dashboard...",
      de: "Lade Empfehlungs-Dashboard...",
      pl: "Ładowanie panelu poleceń...",
      es: "Cargando panel de referidos...",
      fr: "Chargement du tableau de bord de parrainage...",
      ja: "紹介ダッシュボードを読み込み中...",
    },
  },
  {
    key: "ui.benefits.referrals.unavailable_title",
    values: {
      en: "Referral program unavailable",
      de: "Empfehlungsprogramm nicht verfügbar",
      pl: "Program poleceń niedostępny",
      es: "Programa de referidos no disponible",
      fr: "Programme de parrainage indisponible",
      ja: "紹介プログラムは利用できません",
    },
  },
  {
    key: "ui.benefits.referrals.unavailable_description",
    values: {
      en: "The platform referral program is not configured yet.",
      de: "Das Plattform-Empfehlungsprogramm ist noch nicht konfiguriert.",
      pl: "Program poleceń platformy nie jest jeszcze skonfigurowany.",
      es: "El programa de referidos de la plataforma aún no está configurado.",
      fr: "Le programme de parrainage de la plateforme n'est pas encore configuré.",
      ja: "プラットフォーム紹介プログラムはまだ設定されていません。",
    },
  },
  {
    key: "ui.benefits.referrals.link_title",
    values: {
      en: "Referral link",
      de: "Empfehlungslink",
      pl: "Link polecający",
      es: "Enlace de referido",
      fr: "Lien de parrainage",
      ja: "紹介リンク",
    },
  },
  {
    key: "ui.benefits.referrals.link_description",
    values: {
      en: "Share your personal /ref/<code> URL. Both users earn credits on signup and subscription.",
      de: "Teile deine persönliche /ref/<code>-URL. Beide Nutzer erhalten Credits bei Anmeldung und Abo.",
      pl: "Udostępnij swój osobisty URL /ref/<code>. Obie strony dostają kredyty za rejestrację i subskrypcję.",
      es: "Comparte tu URL personal /ref/<code>. Ambos usuarios ganan créditos en registro y suscripción.",
      fr: "Partagez votre URL personnelle /ref/<code>. Les deux utilisateurs gagnent des crédits à l'inscription et à l'abonnement.",
      ja: "個人用 /ref/<code> URL を共有します。登録と購読で双方にクレジットが付与されます。",
    },
  },
  {
    key: "ui.benefits.referrals.paused",
    values: {
      en: "Referral rewards are currently paused by platform settings.",
      de: "Empfehlungsprämien sind derzeit durch Plattform-Einstellungen pausiert.",
      pl: "Nagrody za polecenia są obecnie wstrzymane ustawieniami platformy.",
      es: "Las recompensas por referidos están en pausa por configuración de la plataforma.",
      fr: "Les récompenses de parrainage sont actuellement suspendues par les paramètres de la plateforme.",
      ja: "紹介報酬は現在、プラットフォーム設定により停止中です。",
    },
  },
  {
    key: "ui.benefits.referrals.generating_link",
    values: {
      en: "Generating your referral link...",
      de: "Erzeuge deinen Empfehlungslink...",
      pl: "Generowanie linku polecającego...",
      es: "Generando tu enlace de referido...",
      fr: "Génération de votre lien de parrainage...",
      ja: "紹介リンクを生成中...",
    },
  },
  {
    key: "ui.benefits.referrals.empty_link",
    values: {
      en: "No referral link yet",
      de: "Noch kein Empfehlungslink",
      pl: "Brak linku polecającego",
      es: "Aún no hay enlace de referido",
      fr: "Pas encore de lien de parrainage",
      ja: "紹介リンクはまだありません",
    },
  },
  {
    key: "ui.benefits.referrals.copy",
    values: {
      en: "Copy",
      de: "Kopieren",
      pl: "Kopiuj",
      es: "Copiar",
      fr: "Copier",
      ja: "コピー",
    },
  },
  {
    key: "ui.benefits.referrals.copied",
    values: {
      en: "Referral link copied.",
      de: "Empfehlungslink kopiert.",
      pl: "Skopiowano link polecający.",
      es: "Enlace de referido copiado.",
      fr: "Lien de parrainage copié.",
      ja: "紹介リンクをコピーしました。",
    },
  },
  {
    key: "ui.benefits.referrals.copy_failed",
    values: {
      en: "Failed to copy link.",
      de: "Link konnte nicht kopiert werden.",
      pl: "Nie udało się skopiować linku.",
      es: "No se pudo copiar el enlace.",
      fr: "Échec de la copie du lien.",
      ja: "リンクのコピーに失敗しました。",
    },
  },
  {
    key: "ui.benefits.referrals.monthly_progress",
    values: {
      en: "Monthly progress",
      de: "Monatlicher Fortschritt",
      pl: "Postęp miesięczny",
      es: "Progreso mensual",
      fr: "Progression mensuelle",
      ja: "月次進捗",
    },
  },
  {
    key: "ui.benefits.referrals.earned_this_month",
    values: {
      en: "Earned this month: {value}",
      de: "Diesen Monat verdient: {value}",
      pl: "Uzyskane w tym miesiącu: {value}",
      es: "Ganado este mes: {value}",
      fr: "Gagné ce mois-ci : {value}",
      ja: "今月の獲得: {value}",
    },
  },
  {
    key: "ui.benefits.referrals.remaining",
    values: {
      en: "Remaining: {value}",
      de: "Verbleibend: {value}",
      pl: "Pozostało: {value}",
      es: "Restante: {value}",
      fr: "Restant : {value}",
      ja: "残り: {value}",
    },
  },
  {
    key: "ui.benefits.referrals.cap",
    values: {
      en: "Cap: {value}",
      de: "Limit: {value}",
      pl: "Limit: {value}",
      es: "Límite: {value}",
      fr: "Plafond : {value}",
      ja: "上限: {value}",
    },
  },
  {
    key: "ui.benefits.referrals.referral_signups",
    values: {
      en: "Referral signups",
      de: "Empfehlungs-Anmeldungen",
      pl: "Rejestracje z poleceń",
      es: "Registros por referido",
      fr: "Inscriptions par parrainage",
      ja: "紹介登録数",
    },
  },
  {
    key: "ui.benefits.referrals.referral_subscriptions",
    values: {
      en: "Referral subscriptions",
      de: "Empfehlungs-Abos",
      pl: "Subskrypcje z poleceń",
      es: "Suscripciones por referido",
      fr: "Abonnements par parrainage",
      ja: "紹介購読数",
    },
  },
  {
    key: "ui.benefits.referrals.calculator_title",
    values: {
      en: "Run the numbers",
      de: "Zahlen durchrechnen",
      pl: "Policz to",
      es: "Calcula resultados",
      fr: "Faites le calcul",
      ja: "試算",
    },
  },
  {
    key: "ui.benefits.referrals.expected_signups",
    values: {
      en: "Expected signups",
      de: "Erwartete Anmeldungen",
      pl: "Oczekiwane rejestracje",
      es: "Registros esperados",
      fr: "Inscriptions prévues",
      ja: "想定登録数",
    },
  },
  {
    key: "ui.benefits.referrals.expected_paid_subscriptions",
    values: {
      en: "Expected paid subscriptions",
      de: "Erwartete bezahlte Abos",
      pl: "Oczekiwane płatne subskrypcje",
      es: "Suscripciones de pago esperadas",
      fr: "Abonnements payants prévus",
      ja: "想定有料購読数",
    },
  },
  {
    key: "ui.benefits.referrals.projected_signup_rewards",
    values: {
      en: "Signup rewards: {value}",
      de: "Anmeldeprämien: {value}",
      pl: "Nagrody za rejestracje: {value}",
      es: "Recompensas por registro: {value}",
      fr: "Récompenses d'inscription : {value}",
      ja: "登録報酬: {value}",
    },
  },
  {
    key: "ui.benefits.referrals.projected_subscription_rewards",
    values: {
      en: "Subscription rewards: {value}",
      de: "Abo-Prämien: {value}",
      pl: "Nagrody za subskrypcję: {value}",
      es: "Recompensas por suscripción: {value}",
      fr: "Récompenses d'abonnement : {value}",
      ja: "購読報酬: {value}",
    },
  },
  {
    key: "ui.benefits.referrals.projected_monthly_total",
    values: {
      en: "Projected monthly total: {value}",
      de: "Prognostizierter Monatssaldo: {value}",
      pl: "Prognozowana suma miesięczna: {value}",
      es: "Total mensual proyectado: {value}",
      fr: "Total mensuel projeté : {value}",
      ja: "予測月次合計: {value}",
    },
  },
  {
    key: "ui.benefits.referrals.projection_capped",
    values: {
      en: "Projection capped at {cap} credits/month.",
      de: "Prognose bei {cap} Credits/Monat gedeckelt.",
      pl: "Prognoza ograniczona do {cap} kredytów/miesiąc.",
      es: "Proyección limitada a {cap} créditos/mes.",
      fr: "Projection plafonnée à {cap} crédits/mois.",
      ja: "予測は {cap} クレジット/月で上限に達します。",
    },
  },
  {
    key: "ui.benefits.referrals.rules_title",
    values: {
      en: "Referral rules",
      de: "Empfehlungsregeln",
      pl: "Zasady poleceń",
      es: "Reglas de referidos",
      fr: "Règles de parrainage",
      ja: "紹介ルール",
    },
  },
  {
    key: "ui.benefits.referrals.rule_signup",
    values: {
      en: "Signup reward: {amount} credits for each side.",
      de: "Anmeldeprämie: {amount} Credits für beide Seiten.",
      pl: "Nagroda za rejestrację: {amount} kredytów dla obu stron.",
      es: "Recompensa por registro: {amount} créditos para ambas partes.",
      fr: "Récompense d'inscription : {amount} crédits pour chaque partie.",
      ja: "登録報酬: 双方に {amount} クレジット。",
    },
  },
  {
    key: "ui.benefits.referrals.rule_subscription",
    values: {
      en: "Subscription reward: {amount} credits for each side, after payment confirmation.",
      de: "Abo-Prämie: {amount} Credits für beide Seiten nach Zahlungsbestätigung.",
      pl: "Nagroda za subskrypcję: {amount} kredytów dla obu stron po potwierdzeniu płatności.",
      es: "Recompensa por suscripción: {amount} créditos para ambas partes tras confirmar pago.",
      fr: "Récompense d'abonnement : {amount} crédits pour chaque partie après confirmation du paiement.",
      ja: "購読報酬: 支払い確認後、双方に {amount} クレジット。",
    },
  },
  {
    key: "ui.benefits.referrals.rule_cap",
    values: {
      en: "Monthly cap: {cap} credits per user.",
      de: "Monatslimit: {cap} Credits pro Nutzer.",
      pl: "Limit miesięczny: {cap} kredytów na użytkownika.",
      es: "Límite mensual: {cap} créditos por usuario.",
      fr: "Plafond mensuel : {cap} crédits par utilisateur.",
      ja: "月次上限: 1ユーザーあたり {cap} クレジット。",
    },
  },
  {
    key: "ui.benefits.referrals.rule_self_referral",
    values: {
      en: "Self-referrals are blocked.",
      de: "Eigenempfehlungen sind blockiert.",
      pl: "Samopolecenia są blokowane.",
      es: "Las autorreferencias están bloqueadas.",
      fr: "Les auto-parrainages sont bloqués.",
      ja: "自己紹介はブロックされます。",
    },
  },
  {
    key: "ui.benefits.referrals.rule_fraud_checks",
    values: {
      en: "Rewards are skipped when fraud/safety checks fail.",
      de: "Belohnungen werden übersprungen, wenn Betrugs-/Sicherheitsprüfungen fehlschlagen.",
      pl: "Nagrody są pomijane, gdy kontrole oszustw/bezpieczeństwa nie przejdą.",
      es: "Las recompensas se omiten cuando fallan controles de fraude/seguridad.",
      fr: "Les récompenses sont ignorées si les contrôles fraude/sécurité échouent.",
      ja: "不正/安全チェックに失敗した場合、報酬は付与されません。",
    },
  },
];

/**
 * Seed credits/support/referrals i18n parity coverage (Lane G / CSI-019).
 */
export const seedCreditsSupportI18nCoverage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    let inserted = 0;
    let updated = 0;

    for (const translation of translations) {
      for (const locale of SUPPORTED_LOCALES) {
        const result = await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          translation.values[locale],
          locale,
          "ui",
          "credits-support-i18n-coverage",
        );

        if (result.inserted) {
          inserted += 1;
        }

        if (result.updated) {
          updated += 1;
        }
      }
    }

    return {
      success: true,
      keys: translations.length,
      locales: SUPPORTED_LOCALES.length,
      inserted,
      updated,
      totalOperations: translations.length * SUPPORTED_LOCALES.length,
    };
  },
});
