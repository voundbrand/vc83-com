/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 8: AI SETTINGS
 *
 * Seeds translations for:
 * - AI Settings tab
 * - LLM configuration
 * - Embedding settings
 * - Budget and usage tracking
 *
 * Run: npx convex run translations/seedManage_08_AISettings:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding AI Settings translations...");

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
      // === MAIN TAB ===
      {
        key: "ui.manage.tab.ai",
        values: {
          en: "AI Settings",
          de: "KI-Einstellungen",
          pl: "Ustawienia AI",
          es: "Configuración de IA",
          fr: "Paramètres IA",
          ja: "AI設定",
        }
      },
      {
        key: "ui.manage.ai.title",
        values: {
          en: "AI Settings",
          de: "KI-Einstellungen",
          pl: "Ustawienia AI",
          es: "Configuración de IA",
          fr: "Paramètres IA",
          ja: "AI設定",
        }
      },
      {
        key: "ui.manage.ai.subtitle",
        values: {
          en: "Configure AI assistant, language models, and automation features",
          de: "Konfigurieren Sie KI-Assistent, Sprachmodelle und Automatisierungsfunktionen",
          pl: "Skonfiguruj asystenta AI, modele językowe i funkcje automatyzacji",
          es: "Configure el asistente de IA, modelos de lenguaje y funciones de automatización",
          fr: "Configurez l'assistant IA, les modèles de langage et les fonctionnalités d'automatisation",
          ja: "AIアシスタント、言語モデル、自動化機能を設定する",
        }
      },

      // === ENABLE TOGGLE ===
      {
        key: "ui.manage.ai.enable_toggle",
        values: {
          en: "Enable AI Assistant",
          de: "KI-Assistent aktivieren",
          pl: "Włącz asystenta AI",
          es: "Activar asistente de IA",
          fr: "Activer l'assistant IA",
          ja: "AIアシスタントを有効にする",
        }
      },
      {
        key: "ui.manage.ai.enable_description",
        values: {
          en: "Turn on AI features for your organization",
          de: "Aktivieren Sie KI-Funktionen für Ihre Organisation",
          pl: "Włącz funkcje AI dla swojej organizacji",
          es: "Active las funciones de IA para su organización",
          fr: "Activez les fonctionnalités IA pour votre organisation",
          ja: "組織のAI機能を有効にする",
        }
      },

      // === BILLING MODE ===
      {
        key: "ui.manage.ai.billing_mode",
        values: {
          en: "Billing Mode",
          de: "Abrechnungsmodus",
          pl: "Tryb rozliczeń",
          es: "Modo de facturación",
          fr: "Mode de facturation",
          ja: "請求モード",
        }
      },
      {
        key: "ui.manage.ai.billing_platform",
        values: {
          en: "Use Platform API Key (Recommended)",
          de: "Plattform-API-Schlüssel verwenden (Empfohlen)",
          pl: "Użyj klucza API platformy (Zalecane)",
          es: "Usar clave API de la plataforma (Recomendado)",
          fr: "Utiliser la clé API de la plateforme (Recommandé)",
          ja: "プラットフォームAPIキーを使用（推奨）",
        }
      },
      {
        key: "ui.manage.ai.billing_platform_benefit1",
        values: {
          en: "Included in your subscription",
          de: "In Ihrem Abonnement enthalten",
          pl: "Wliczone w abonament",
          es: "Incluido en su suscripción",
          fr: "Inclus dans votre abonnement",
          ja: "サブスクリプションに含まれる",
        }
      },
      {
        key: "ui.manage.ai.billing_platform_benefit2",
        values: {
          en: "Automatic budget controls",
          de: "Automatische Budgetkontrolle",
          pl: "Automatyczna kontrola budżetu",
          es: "Controles de presupuesto automáticos",
          fr: "Contrôles budgétaires automatiques",
          ja: "自動予算管理",
        }
      },
      {
        key: "ui.manage.ai.billing_platform_benefit3",
        values: {
          en: "No additional setup required",
          de: "Keine zusätzliche Einrichtung erforderlich",
          pl: "Nie wymaga dodatkowej konfiguracji",
          es: "No requiere configuración adicional",
          fr: "Aucune configuration supplémentaire requise",
          ja: "追加設定不要",
        }
      },
      {
        key: "ui.manage.ai.billing_byok",
        values: {
          en: "Bring Your Own OpenRouter Key",
          de: "Eigenen OpenRouter-Schlüssel verwenden",
          pl: "Użyj własnego klucza OpenRouter",
          es: "Traiga su propia clave de OpenRouter",
          fr: "Apportez votre propre clé OpenRouter",
          ja: "独自のOpenRouterキーを使用",
        }
      },
      {
        key: "ui.manage.ai.billing_byok_benefit1",
        values: {
          en: "Direct billing from OpenRouter",
          de: "Direkte Abrechnung von OpenRouter",
          pl: "Bezpośrednie rozliczenia z OpenRouter",
          es: "Facturación directa de OpenRouter",
          fr: "Facturation directe d'OpenRouter",
          ja: "OpenRouterから直接請求",
        }
      },
      {
        key: "ui.manage.ai.billing_byok_benefit2",
        values: {
          en: "Full cost transparency",
          de: "Volle Kostentransparenz",
          pl: "Pełna przejrzystość kosztów",
          es: "Transparencia total de costos",
          fr: "Transparence totale des coûts",
          ja: "完全なコスト透明性",
        }
      },
      {
        key: "ui.manage.ai.billing_byok_benefit3",
        values: {
          en: "Enterprise control",
          de: "Unternehmenskontrolle",
          pl: "Kontrola korporacyjna",
          es: "Control empresarial",
          fr: "Contrôle d'entreprise",
          ja: "エンタープライズ管理",
        }
      },
      {
        key: "ui.manage.ai.billing_byok_note",
        values: {
          en: "You will be charged directly by OpenRouter. Budget tracking is informational only.",
          de: "Sie werden direkt von OpenRouter abgerechnet. Budget-Tracking ist nur informativ.",
          pl: "Zostaniesz obciążony bezpośrednio przez OpenRouter. Śledzenie budżetu jest tylko informacyjne.",
          es: "Se le facturará directamente por OpenRouter. El seguimiento del presupuesto es solo informativo.",
          fr: "Vous serez facturé directement par OpenRouter. Le suivi budgétaire est informatif uniquement.",
          ja: "OpenRouterから直接請求されます。予算追跡は情報提供のみです。",
        }
      },
      {
        key: "ui.manage.ai.billing_byok_signup",
        values: {
          en: "Don't have an OpenRouter account?",
          de: "Kein OpenRouter-Konto?",
          pl: "Nie masz konta OpenRouter?",
          es: "¿No tiene una cuenta de OpenRouter?",
          fr: "Vous n'avez pas de compte OpenRouter?",
          ja: "OpenRouterアカウントをお持ちでない場合",
        }
      },
      {
        key: "ui.manage.ai.billing_byok_signup_link",
        values: {
          en: "Sign up here",
          de: "Hier anmelden",
          pl: "Zarejestruj się tutaj",
          es: "Regístrese aquí",
          fr: "Inscrivez-vous ici",
          ja: "こちらから登録",
        }
      },
      {
        key: "ui.manage.ai.api_key_required",
        values: {
          en: "OpenRouter API Key (Required)",
          de: "OpenRouter-API-Schlüssel (Erforderlich)",
          pl: "Klucz API OpenRouter (Wymagany)",
          es: "Clave API de OpenRouter (Requerida)",
          fr: "Clé API OpenRouter (Requis)",
          ja: "OpenRouter APIキー（必須）",
        }
      },
      {
        key: "ui.manage.ai.api_key_get_yours",
        values: {
          en: "Get your API key at",
          de: "Holen Sie sich Ihren API-Schlüssel bei",
          pl: "Uzyskaj klucz API na",
          es: "Obtenga su clave API en",
          fr: "Obtenez votre clé API sur",
          ja: "APIキーを取得:",
        }
      },
      {
        key: "ui.manage.ai.budget_platform_note",
        values: {
          en: "These controls apply to platform API key usage. Requests will be blocked when budget is reached.",
          de: "Diese Kontrollen gelten für die Nutzung des Plattform-API-Schlüssels. Anfragen werden blockiert, wenn das Budget erreicht ist.",
          pl: "Te kontrole dotyczą użycia klucza API platformy. Żądania zostaną zablokowane po osiągnięciu budżetu.",
          es: "Estos controles se aplican al uso de la clave API de la plataforma. Las solicitudes se bloquearán cuando se alcance el presupuesto.",
          fr: "Ces contrôles s'appliquent à l'utilisation de la clé API de la plateforme. Les demandes seront bloquées lorsque le budget sera atteint.",
          ja: "これらのコントロールはプラットフォームAPIキーの使用に適用されます。予算に達するとリクエストがブロックされます。",
        }
      },
      {
        key: "ui.manage.ai.budget_byok_note",
        values: {
          en: "Budget tracking is informational only when using your own API key. You will be charged directly by OpenRouter.",
          de: "Budget-Tracking ist nur informativ, wenn Sie Ihren eigenen API-Schlüssel verwenden. Sie werden direkt von OpenRouter abgerechnet.",
          pl: "Śledzenie budżetu jest tylko informacyjne przy użyciu własnego klucza API. Zostaniesz obciążony bezpośrednio przez OpenRouter.",
          es: "El seguimiento del presupuesto es solo informativo cuando usa su propia clave API. Se le facturará directamente por OpenRouter.",
          fr: "Le suivi budgétaire est informatif uniquement lors de l'utilisation de votre propre clé API. Vous serez facturé directement par OpenRouter.",
          ja: "独自のAPIキーを使用する場合、予算追跡は情報提供のみです。OpenRouterから直接請求されます。",
        }
      },

      // === LLM SECTION ===
      {
        key: "ui.manage.ai.llm_title",
        values: {
          en: "Language Model (LLM) Configuration",
          de: "Sprachmodell (LLM) Konfiguration",
          pl: "Konfiguracja modelu językowego (LLM)",
          es: "Configuración del modelo de lenguaje (LLM)",
          fr: "Configuration du modèle de langage (LLM)",
          ja: "言語モデル（LLM）設定",
        }
      },
      {
        key: "ui.manage.ai.llm_description",
        values: {
          en: "Choose which AI model to use for general assistant features",
          de: "Wählen Sie, welches KI-Modell für allgemeine Assistentenfunktionen verwendet werden soll",
          pl: "Wybierz model AI do ogólnych funkcji asystenta",
          es: "Elija qué modelo de IA usar para las funciones generales del asistente",
          fr: "Choisissez quel modèle IA utiliser pour les fonctionnalités générales de l'assistant",
          ja: "一般的なアシスタント機能に使用するAIモデルを選択",
        }
      },
      {
        key: "ui.manage.ai.provider",
        values: {
          en: "Provider",
          de: "Anbieter",
          pl: "Dostawca",
          es: "Proveedor",
          fr: "Fournisseur",
          ja: "プロバイダー",
        }
      },
      {
        key: "ui.manage.ai.model",
        values: {
          en: "Model",
          de: "Modell",
          pl: "Model",
          es: "Modelo",
          fr: "Modèle",
          ja: "モデル",
        }
      },
      {
        key: "ui.manage.ai.temperature",
        values: {
          en: "Temperature",
          de: "Temperatur",
          pl: "Temperatura",
          es: "Temperatura",
          fr: "Température",
          ja: "温度",
        }
      },
      {
        key: "ui.manage.ai.temperature_description",
        values: {
          en: "Controls creativity vs. focus (0 = focused, 1 = creative)",
          de: "Steuert Kreativität vs. Fokus (0 = fokussiert, 1 = kreativ)",
          pl: "Kontroluje kreatywność vs. fokus (0 = skupiony, 1 = kreatywny)",
          es: "Controla creatividad vs. enfoque (0 = enfocado, 1 = creativo)",
          fr: "Contrôle la créativité vs. la concentration (0 = concentré, 1 = créatif)",
          ja: "創造性と集中力を制御（0 = 集中、1 = 創造的）",
        }
      },
      {
        key: "ui.manage.ai.max_tokens",
        values: {
          en: "Max Tokens",
          de: "Max. Token",
          pl: "Maks. tokenów",
          es: "Tokens máximos",
          fr: "Tokens max",
          ja: "最大トークン",
        }
      },
      {
        key: "ui.manage.ai.max_tokens_description",
        values: {
          en: "Maximum response length",
          de: "Maximale Antwortlänge",
          pl: "Maksymalna długość odpowiedzi",
          es: "Longitud máxima de respuesta",
          fr: "Longueur maximale de la réponse",
          ja: "最大応答長",
        }
      },
      {
        key: "ui.manage.ai.custom_api_key",
        values: {
          en: "Custom API Key (Optional)",
          de: "Benutzerdefinierter API-Schlüssel (Optional)",
          pl: "Niestandardowy klucz API (Opcjonalny)",
          es: "Clave API personalizada (Opcional)",
          fr: "Clé API personnalisée (Optionnel)",
          ja: "カスタムAPIキー（オプション）",
        }
      },
      {
        key: "ui.manage.ai.custom_api_key_description",
        values: {
          en: "Your own OpenRouter API key for this organization",
          de: "Ihr eigener OpenRouter API-Schlüssel für diese Organisation",
          pl: "Twój własny klucz API OpenRouter dla tej organizacji",
          es: "Su propia clave API de OpenRouter para esta organización",
          fr: "Votre propre clé API OpenRouter pour cette organisation",
          ja: "この組織用の独自のOpenRouter APIキー",
        }
      },

      // === EMBEDDING SECTION ===
      {
        key: "ui.manage.ai.embedding_title",
        values: {
          en: "Embedding Configuration (For Email AI)",
          de: "Embedding-Konfiguration (Für E-Mail-KI)",
          pl: "Konfiguracja osadzania (dla AI e-mail)",
          es: "Configuración de incrustación (para IA de correo electrónico)",
          fr: "Configuration d'intégration (pour l'IA de messagerie)",
          ja: "埋め込み設定（メールAI用）",
        }
      },
      {
        key: "ui.manage.ai.embedding_description",
        values: {
          en: "Configure vector embeddings for semantic search and email AI features",
          de: "Konfigurieren Sie Vektor-Embeddings für semantische Suche und E-Mail-KI-Funktionen",
          pl: "Skonfiguruj osadzenia wektorów dla wyszukiwania semantycznego i funkcji AI e-mail",
          es: "Configure incrustaciones vectoriales para búsqueda semántica y funciones de IA de correo electrónico",
          fr: "Configurez les intégrations vectorielles pour la recherche sémantique et les fonctionnalités IA de messagerie",
          ja: "セマンティック検索とメールAI機能用のベクトル埋め込みを設定",
        }
      },
      {
        key: "ui.manage.ai.embedding_provider",
        values: {
          en: "Embedding Provider",
          de: "Embedding-Anbieter",
          pl: "Dostawca osadzania",
          es: "Proveedor de incrustación",
          fr: "Fournisseur d'intégration",
          ja: "埋め込みプロバイダー",
        }
      },
      {
        key: "ui.manage.ai.embedding_model",
        values: {
          en: "Embedding Model",
          de: "Embedding-Modell",
          pl: "Model osadzania",
          es: "Modelo de incrustación",
          fr: "Modèle d'intégration",
          ja: "埋め込みモデル",
        }
      },
      {
        key: "ui.manage.ai.embedding_api_key",
        values: {
          en: "Embedding API Key",
          de: "Embedding-API-Schlüssel",
          pl: "Klucz API osadzania",
          es: "Clave API de incrustación",
          fr: "Clé API d'intégration",
          ja: "埋め込みAPIキー",
        }
      },
      {
        key: "ui.manage.ai.embedding_api_key_description",
        values: {
          en: "Required for semantic search and email AI features",
          de: "Erforderlich für semantische Suche und E-Mail-KI-Funktionen",
          pl: "Wymagane do wyszukiwania semantycznego i funkcji AI e-mail",
          es: "Requerido para búsqueda semántica y funciones de IA de correo electrónico",
          fr: "Requis pour la recherche sémantique et les fonctionnalités IA de messagerie",
          ja: "セマンティック検索とメールAI機能に必要",
        }
      },
      {
        key: "ui.manage.ai.embedding_none",
        values: {
          en: "None (Disable embeddings)",
          de: "Keine (Embeddings deaktivieren)",
          pl: "Brak (wyłącz osadzanie)",
          es: "Ninguno (Desactivar incrustaciones)",
          fr: "Aucun (Désactiver les intégrations)",
          ja: "なし（埋め込みを無効化）",
        }
      },

      // === BUDGET SECTION ===
      {
        key: "ui.manage.ai.budget_title",
        values: {
          en: "Budget & Usage Tracking",
          de: "Budget & Nutzungsverfolgung",
          pl: "Budżet i śledzenie użycia",
          es: "Presupuesto y seguimiento de uso",
          fr: "Budget et suivi d'utilisation",
          ja: "予算と使用状況の追跡",
        }
      },
      {
        key: "ui.manage.ai.monthly_budget",
        values: {
          en: "Monthly Budget (USD)",
          de: "Monatliches Budget (USD)",
          pl: "Miesięczny budżet (USD)",
          es: "Presupuesto mensual (USD)",
          fr: "Budget mensuel (USD)",
          ja: "月間予算（USD）",
        }
      },
      {
        key: "ui.manage.ai.monthly_budget_description",
        values: {
          en: "Maximum AI spending per month. Requests will be blocked when reached.",
          de: "Maximale KI-Ausgaben pro Monat. Anfragen werden blockiert, wenn erreicht.",
          pl: "Maksymalne wydatki AI miesięcznie. Żądania będą blokowane po osiągnięciu.",
          es: "Gasto máximo de IA por mes. Las solicitudes se bloquearán al alcanzar.",
          fr: "Dépense IA maximale par mois. Les demandes seront bloquées une fois atteint.",
          ja: "月間最大AI支出。到達すると要求がブロックされます。",
        }
      },
      {
        key: "ui.manage.ai.current_month_spend",
        values: {
          en: "Current Month Spend",
          de: "Aktuelle Monatsausgaben",
          pl: "Wydatki w bieżącym miesiącu",
          es: "Gasto del mes actual",
          fr: "Dépenses du mois en cours",
          ja: "今月の支出",
        }
      },
      {
        key: "ui.manage.ai.budget_used",
        values: {
          en: "of budget used",
          de: "des Budgets verwendet",
          pl: "budżetu użyto",
          es: "del presupuesto usado",
          fr: "du budget utilisé",
          ja: "予算使用済み",
        }
      },
      {
        key: "ui.manage.ai.budget_exceeded",
        values: {
          en: "Budget exceeded!",
          de: "Budget überschritten!",
          pl: "Budżet przekroczony!",
          es: "¡Presupuesto excedido!",
          fr: "Budget dépassé!",
          ja: "予算超過！",
        }
      },

      // === RATE LIMIT SECTION ===
      {
        key: "ui.manage.ai.rate_limit_title",
        values: {
          en: "Rate Limit Status",
          de: "Rate-Limit-Status",
          pl: "Status limitu żądań",
          es: "Estado de límite de tasa",
          fr: "État de limite de débit",
          ja: "レート制限ステータス",
        }
      },
      {
        key: "ui.manage.ai.rate_limit_description",
        values: {
          en: "requests per hour",
          de: "Anfragen pro Stunde",
          pl: "żądań na godzinę",
          es: "solicitudes por hora",
          fr: "demandes par heure",
          ja: "時間あたりのリクエスト",
        }
      },
      {
        key: "ui.manage.ai.rate_limit_remaining",
        values: {
          en: "remaining",
          de: "verbleibend",
          pl: "pozostało",
          es: "restante",
          fr: "restant",
          ja: "残り",
        }
      },

      // === SUBSCRIPTION STATUS BANNERS ===
      {
        key: "ui.manage.ai.plan_active.standard",
        values: {
          en: "Standard Plan Active",
          de: "Standard-Abo aktiv",
          pl: "Plan Standard aktywny",
          es: "Plan Estándar activo",
          fr: "Plan Standard actif",
          ja: "スタンダードプランアクティブ",
        }
      },
      {
        key: "ui.manage.ai.plan_active.privacy_enhanced",
        values: {
          en: "Privacy-Enhanced Plan Active",
          de: "Datenschutz-Abo aktiv",
          pl: "Plan Prywatności aktywny",
          es: "Plan Privacidad Mejorada activo",
          fr: "Plan Confidentialité Améliorée actif",
          ja: "プライバシー強化プランアクティブ",
        }
      },
      {
        key: "ui.manage.ai.plan_active.private_llm",
        values: {
          en: "Private LLM Plan Active",
          de: "Private-LLM-Abo aktiv",
          pl: "Plan Private LLM aktywny",
          es: "Plan LLM Privado activo",
          fr: "Plan LLM Privé actif",
          ja: "プライベートLLMプランアクティブ",
        }
      },
      {
        key: "ui.manage.ai.tokens_used",
        values: {
          en: "tokens used",
          de: "Tokens verbraucht",
          pl: "tokenów użyto",
          es: "tokens usados",
          fr: "jetons utilisés",
          ja: "トークン使用済み",
        }
      },
      {
        key: "ui.manage.ai.browse_store",
        values: {
          en: "Browse Store",
          de: "Shop durchsuchen",
          pl: "Przeglądaj sklep",
          es: "Explorar tienda",
          fr: "Parcourir la boutique",
          ja: "ストアを見る",
        }
      },
      {
        key: "ui.manage.ai.subscribe_to_activate",
        values: {
          en: "Subscribe to Activate AI Features",
          de: "Abonnieren Sie, um KI-Funktionen zu aktivieren",
          pl: "Zasubskrybuj, aby aktywować funkcje AI",
          es: "Suscríbase para activar funciones de IA",
          fr: "Abonnez-vous pour activer les fonctionnalités IA",
          ja: "AI機能を有効にするには購読してください",
        }
      },
      {
        key: "ui.manage.ai.choose_plan_description",
        values: {
          en: "Choose a plan to enable AI-powered features for your organization.",
          de: "Wählen Sie ein Abo, um KI-gestützte Funktionen für Ihre Organisation zu aktivieren.",
          pl: "Wybierz plan, aby włączyć funkcje AI dla swojej organizacji.",
          es: "Elija un plan para habilitar funciones con IA para su organización.",
          fr: "Choisissez un plan pour activer les fonctionnalités IA pour votre organisation.",
          ja: "組織のAI機能を有効にするプランを選択してください。",
        }
      },
      {
        key: "ui.manage.ai.open_store",
        values: {
          en: "Open Store",
          de: "Shop öffnen",
          pl: "Otwórz sklep",
          es: "Abrir tienda",
          fr: "Ouvrir la boutique",
          ja: "ストアを開く",
        }
      },

      // === AI CONFIGURATION HEADER ===
      {
        key: "ui.manage.ai.configuration_title",
        values: {
          en: "AI Configuration",
          de: "KI-Konfiguration",
          pl: "Konfiguracja AI",
          es: "Configuración de IA",
          fr: "Configuration IA",
          ja: "AI設定",
        }
      },
      {
        key: "ui.manage.ai.configuration_description",
        values: {
          en: "Configure AI features for your organization. Choose your privacy tier and preferred models.",
          de: "Konfigurieren Sie KI-Funktionen für Ihre Organisation. Wählen Sie Ihre Datenschutzstufe und bevorzugte Modelle.",
          pl: "Skonfiguruj funkcje AI dla swojej organizacji. Wybierz poziom prywatności i preferowane modele.",
          es: "Configure las funciones de IA para su organización. Elija su nivel de privacidad y modelos preferidos.",
          fr: "Configurez les fonctionnalités IA pour votre organisation. Choisissez votre niveau de confidentialité et vos modèles préférés.",
          ja: "組織のAI機能を設定します。プライバシーレベルと優先モデルを選択してください。",
        }
      },

      // === ENABLE TOGGLE ===
      {
        key: "ui.manage.ai.enable_features",
        values: {
          en: "Enable AI Features",
          de: "KI-Funktionen aktivieren",
          pl: "Włącz funkcje AI",
          es: "Activar funciones de IA",
          fr: "Activer les fonctionnalités IA",
          ja: "AI機能を有効にする",
        }
      },
      {
        key: "ui.manage.ai.enable_features_description",
        values: {
          en: "Turn on AI-powered features for your organization",
          de: "Aktivieren Sie KI-gestützte Funktionen für Ihre Organisation",
          pl: "Włącz funkcje AI dla swojej organizacji",
          es: "Active funciones con IA para su organización",
          fr: "Activez les fonctionnalités IA pour votre organisation",
          ja: "組織のAI機能を有効にする",
        }
      },

      // === DATA PRIVACY LEVEL ===
      {
        key: "ui.manage.ai.data_privacy_level",
        values: {
          en: "Data Privacy Level",
          de: "Datenschutzstufe",
          pl: "Poziom prywatności danych",
          es: "Nivel de privacidad de datos",
          fr: "Niveau de confidentialité des données",
          ja: "データプライバシーレベル",
        }
      },

      // === STANDARD TIER ===
      {
        key: "ui.manage.ai.tier.standard.name",
        values: {
          en: "Standard",
          de: "Standard",
          pl: "Standard",
          es: "Estándar",
          fr: "Standard",
          ja: "スタンダード",
        }
      },
      {
        key: "ui.manage.ai.tier.standard.description",
        values: {
          en: "All models available. Data may be processed globally.",
          de: "Alle Modelle verfügbar. Daten können weltweit verarbeitet werden.",
          pl: "Wszystkie modele dostępne. Dane mogą być przetwarzane globalnie.",
          es: "Todos los modelos disponibles. Los datos pueden procesarse globalmente.",
          fr: "Tous les modèles disponibles. Les données peuvent être traitées globalement.",
          ja: "すべてのモデルが利用可能。データはグローバルに処理される場合があります。",
        }
      },
      {
        key: "ui.manage.ai.tier.feature.all_models",
        values: {
          en: "All AI models",
          de: "Alle KI-Modelle",
          pl: "Wszystkie modele AI",
          es: "Todos los modelos de IA",
          fr: "Tous les modèles IA",
          ja: "すべてのAIモデル",
        }
      },
      {
        key: "ui.manage.ai.tier.feature.tokens_included",
        values: {
          en: "500,000 tokens/month included",
          de: "500.000 Tokens/Monat inklusive",
          pl: "500 000 tokenów/miesiąc wliczone",
          es: "500,000 tokens/mes incluidos",
          fr: "500 000 jetons/mois inclus",
          ja: "月間50万トークン含む",
        }
      },
      {
        key: "ui.manage.ai.tier.feature.global_routing",
        values: {
          en: "Global routing",
          de: "Globales Routing",
          pl: "Routing globalny",
          es: "Enrutamiento global",
          fr: "Routage mondial",
          ja: "グローバルルーティング",
        }
      },
      {
        key: "ui.manage.ai.price.incl_vat",
        values: {
          en: "incl. VAT",
          de: "inkl. MwSt.",
          pl: "z VAT",
          es: "IVA incl.",
          fr: "TTC",
          ja: "税込",
        }
      },

      // === PRIVACY-ENHANCED TIER ===
      {
        key: "ui.manage.ai.tier.privacy_enhanced.name",
        values: {
          en: "Privacy-Enhanced",
          de: "Datenschutz-Plus",
          pl: "Wzmocniona prywatność",
          es: "Privacidad mejorada",
          fr: "Confidentialité améliorée",
          ja: "プライバシー強化",
        }
      },
      {
        key: "ui.manage.ai.tier.recommended",
        values: {
          en: "RECOMMENDED",
          de: "EMPFOHLEN",
          pl: "ZALECANE",
          es: "RECOMENDADO",
          fr: "RECOMMANDÉ",
          ja: "推奨",
        }
      },
      {
        key: "ui.manage.ai.tier.privacy_enhanced.description",
        values: {
          en: "Zero Data Retention. EU providers prioritized.",
          de: "Keine Datenspeicherung. EU-Anbieter priorisiert.",
          pl: "Zerowa retencja danych. Priorytet dla dostawców UE.",
          es: "Retención cero de datos. Proveedores de la UE priorizados.",
          fr: "Rétention zéro des données. Fournisseurs UE priorisés.",
          ja: "データ保持ゼロ。EUプロバイダー優先。",
        }
      },
      {
        key: "ui.manage.ai.tier.feature.gdpr_optimized",
        values: {
          en: "GDPR-optimized",
          de: "DSGVO-optimiert",
          pl: "Zoptymalizowane pod RODO",
          es: "Optimizado para RGPD",
          fr: "Optimisé RGPD",
          ja: "GDPR最適化",
        }
      },
      {
        key: "ui.manage.ai.tier.feature.no_training",
        values: {
          en: "No training on your data",
          de: "Kein Training mit Ihren Daten",
          pl: "Brak treningu na Twoich danych",
          es: "Sin entrenamiento con sus datos",
          fr: "Pas d'entraînement sur vos données",
          ja: "データでのトレーニングなし",
        }
      },

      // === PRIVATE LLM HOSTING ===
      {
        key: "ui.manage.ai.private_llm.hosting_title",
        values: {
          en: "Private LLM Hosting",
          de: "Private LLM-Hosting",
          pl: "Prywatny hosting LLM",
          es: "Alojamiento LLM privado",
          fr: "Hébergement LLM privé",
          ja: "プライベートLLMホスティング",
        }
      },
      {
        key: "ui.manage.ai.private_llm.hosting_description",
        values: {
          en: "Self-hosted AI infrastructure. Data never leaves your servers.",
          de: "Selbst gehostete KI-Infrastruktur. Daten verlassen niemals Ihre Server.",
          pl: "Samodzielnie hostowana infrastruktura AI. Dane nigdy nie opuszczają Twoich serwerów.",
          es: "Infraestructura IA autoalojada. Los datos nunca salen de sus servidores.",
          fr: "Infrastructure IA auto-hébergée. Les données ne quittent jamais vos serveurs.",
          ja: "自己ホスト型AIインフラ。データはサーバーから出ません。",
        }
      },
      {
        key: "ui.manage.ai.private_llm.name",
        values: {
          en: "Private LLM",
          de: "Privates LLM",
          pl: "Prywatne LLM",
          es: "LLM Privado",
          fr: "LLM Privé",
          ja: "プライベートLLM",
        }
      },
      {
        key: "ui.manage.ai.private_llm.tier.starter",
        values: {
          en: "Starter",
          de: "Starter",
          pl: "Starter",
          es: "Inicial",
          fr: "Démarrage",
          ja: "スターター",
        }
      },
      {
        key: "ui.manage.ai.private_llm.tier.professional",
        values: {
          en: "Professional",
          de: "Professional",
          pl: "Profesjonalny",
          es: "Profesional",
          fr: "Professionnel",
          ja: "プロフェッショナル",
        }
      },
      {
        key: "ui.manage.ai.private_llm.tier.enterprise",
        values: {
          en: "Enterprise",
          de: "Enterprise",
          pl: "Enterprise",
          es: "Empresarial",
          fr: "Entreprise",
          ja: "エンタープライズ",
        }
      },
      {
        key: "ui.manage.ai.price.per_month",
        values: {
          en: "per month",
          de: "pro Monat",
          pl: "miesięcznie",
          es: "por mes",
          fr: "par mois",
          ja: "月額",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.self_hosted",
        values: {
          en: "Self-hosted AI",
          de: "Selbst gehostete KI",
          pl: "Samodzielnie hostowana AI",
          es: "IA autoalojada",
          fr: "IA auto-hébergée",
          ja: "自己ホスト型AI",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.requests_50k",
        values: {
          en: "~50K requests/month",
          de: "~50.000 Anfragen/Monat",
          pl: "~50 tys. żądań/miesiąc",
          es: "~50K solicitudes/mes",
          fr: "~50K requêtes/mois",
          ja: "月間約5万リクエスト",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.scale_to_zero",
        values: {
          en: "Scale-to-zero compute",
          de: "Skalierung auf Null",
          pl: "Skalowanie do zera",
          es: "Computación escalable a cero",
          fr: "Calcul évolutif à zéro",
          ja: "ゼロスケールコンピュート",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.dedicated_infra",
        values: {
          en: "Dedicated infrastructure",
          de: "Dedizierte Infrastruktur",
          pl: "Dedykowana infrastruktura",
          es: "Infraestructura dedicada",
          fr: "Infrastructure dédiée",
          ja: "専用インフラ",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.requests_150k",
        values: {
          en: "~150K requests/month",
          de: "~150.000 Anfragen/Monat",
          pl: "~150 tys. żądań/miesiąc",
          es: "~150K solicitudes/mes",
          fr: "~150K requêtes/mois",
          ja: "月間約15万リクエスト",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.sla_999",
        values: {
          en: "99.9% SLA",
          de: "99,9 % SLA",
          pl: "99,9% SLA",
          es: "99.9% SLA",
          fr: "99,9% SLA",
          ja: "99.9% SLA",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.priority_support",
        values: {
          en: "Priority support",
          de: "Prioritätssupport",
          pl: "Priorytetowe wsparcie",
          es: "Soporte prioritario",
          fr: "Support prioritaire",
          ja: "優先サポート",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.unlimited_requests",
        values: {
          en: "Unlimited requests",
          de: "Unbegrenzte Anfragen",
          pl: "Nieograniczone żądania",
          es: "Solicitudes ilimitadas",
          fr: "Requêtes illimitées",
          ja: "無制限リクエスト",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.data_sovereignty",
        values: {
          en: "Full data sovereignty",
          de: "Vollständige Datensouveränität",
          pl: "Pełna suwerenność danych",
          es: "Soberanía completa de datos",
          fr: "Souveraineté complète des données",
          ja: "完全なデータ主権",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.multi_region",
        values: {
          en: "Multi-region deployment",
          de: "Multi-Region-Bereitstellung",
          pl: "Wdrożenie wieloregionowe",
          es: "Despliegue multirregión",
          fr: "Déploiement multi-régions",
          ja: "マルチリージョン展開",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.enterprise_support",
        values: {
          en: "24/7 enterprise support",
          de: "24/7-Unternehmenssupport",
          pl: "Wsparcie korporacyjne 24/7",
          es: "Soporte empresarial 24/7",
          fr: "Support entreprise 24/7",
          ja: "24/7エンタープライズサポート",
        }
      },
      {
        key: "ui.manage.ai.private_llm.feature.custom_sla",
        values: {
          en: "Custom SLA",
          de: "Individuelles SLA",
          pl: "Niestandardowe SLA",
          es: "SLA personalizado",
          fr: "SLA personnalisé",
          ja: "カスタムSLA",
        }
      },

      // === PRIVACY MODE MESSAGE ===
      {
        key: "ui.manage.ai.privacy_mode_active",
        values: {
          en: "Privacy-Enhanced Mode Active",
          de: "Datenschutz-Plus-Modus aktiv",
          pl: "Tryb wzmocnionej prywatności aktywny",
          es: "Modo de privacidad mejorada activo",
          fr: "Mode confidentialité améliorée actif",
          ja: "プライバシー強化モード有効",
        }
      },
      {
        key: "ui.manage.ai.privacy_mode_description",
        values: {
          en: "Only GDPR-compliant models are available. OpenAI and Google models are filtered out. EU-native providers (Mistral) and ZDR-compliant models (Claude) are prioritized.",
          de: "Nur DSGVO-konforme Modelle sind verfügbar. OpenAI- und Google-Modelle werden herausgefiltert. EU-native Anbieter (Mistral) und ZDR-konforme Modelle (Claude) werden priorisiert.",
          pl: "Dostępne są tylko modele zgodne z RODO. Modele OpenAI i Google są odfiltrowywane. Priorytet dla dostawców z UE (Mistral) i modeli zgodnych z ZDR (Claude).",
          es: "Solo están disponibles modelos compatibles con RGPD. Los modelos de OpenAI y Google están filtrados. Se priorizan los proveedores nativos de la UE (Mistral) y los modelos compatibles con ZDR (Claude).",
          fr: "Seuls les modèles conformes au RGPD sont disponibles. Les modèles OpenAI et Google sont filtrés. Les fournisseurs natifs de l'UE (Mistral) et les modèles conformes ZDR (Claude) sont priorisés.",
          ja: "GDPR準拠モデルのみ利用可能です。OpenAIとGoogleモデルは除外されます。EU内プロバイダー（Mistral）とZDR準拠モデル（Claude）が優先されます。",
        }
      },

      // === MODEL SELECTION ===
      {
        key: "ui.manage.ai.enabled_models",
        values: {
          en: "Enabled Models",
          de: "Aktivierte Modelle",
          pl: "Włączone modele",
          es: "Modelos habilitados",
          fr: "Modèles activés",
          ja: "有効なモデル",
        }
      },
      {
        key: "ui.manage.ai.enabled_models_description",
        values: {
          en: "Select which models your organization can use. These will appear in AI chat for all users.",
          de: "Wählen Sie, welche Modelle Ihre Organisation verwenden kann. Diese erscheinen im KI-Chat für alle Benutzer.",
          pl: "Wybierz modele, których może używać Twoja organizacja. Będą one dostępne w czacie AI dla wszystkich użytkowników.",
          es: "Seleccione qué modelos puede usar su organización. Estos aparecerán en el chat de IA para todos los usuarios.",
          fr: "Sélectionnez les modèles que votre organisation peut utiliser. Ceux-ci apparaîtront dans le chat IA pour tous les utilisateurs.",
          ja: "組織が使用できるモデルを選択してください。これらはすべてのユーザーのAIチャットに表示されます。",
        }
      },

      // === BUTTONS ===
      {
        key: "ui.manage.ai.contact_sales",
        values: {
          en: "Contact Sales",
          de: "Vertrieb kontaktieren",
          pl: "Skontaktuj się ze sprzedażą",
          es: "Contactar Ventas",
          fr: "Contacter les ventes",
          ja: "営業に連絡",
        }
      },
      {
        key: "ui.manage.ai.save_settings",
        values: {
          en: "Save AI Settings",
          de: "KI-Einstellungen speichern",
          pl: "Zapisz ustawienia AI",
          es: "Guardar configuración de IA",
          fr: "Enregistrer les paramètres IA",
          ja: "AI設定を保存",
        }
      },
      {
        key: "ui.manage.ai.saving",
        values: {
          en: "Saving...",
          de: "Speichere...",
          pl: "Zapisywanie...",
          es: "Guardando...",
          fr: "Enregistrement...",
          ja: "保存中...",
        }
      },

      // === STATUS MESSAGES ===
      {
        key: "ui.manage.ai.save_success",
        values: {
          en: "AI settings saved successfully!",
          de: "KI-Einstellungen erfolgreich gespeichert!",
          pl: "Ustawienia AI zapisane pomyślnie!",
          es: "¡Configuración de IA guardada con éxito!",
          fr: "Paramètres IA enregistrés avec succès!",
          ja: "AI設定が正常に保存されました！",
        }
      },
      {
        key: "ui.manage.ai.loading",
        values: {
          en: "Loading AI settings...",
          de: "Lade KI-Einstellungen...",
          pl: "Ładowanie ustawień AI...",
          es: "Cargando configuración de IA...",
          fr: "Chargement des paramètres IA...",
          ja: "AI設定を読み込み中...",
        }
      },
      {
        key: "ui.manage.ai.not_authenticated",
        values: {
          en: "Not authenticated",
          de: "Nicht authentifiziert",
          pl: "Nie uwierzytelniono",
          es: "No autenticado",
          fr: "Non authentifié",
          ja: "認証されていません",
        }
      },

      // === MODEL OPTIONS ===
      {
        key: "ui.manage.ai.provider.anthropic",
        values: {
          en: "Anthropic (Claude)",
          de: "Anthropic (Claude)",
          pl: "Anthropic (Claude)",
          es: "Anthropic (Claude)",
          fr: "Anthropic (Claude)",
          ja: "Anthropic（Claude）",
        }
      },
      {
        key: "ui.manage.ai.provider.openai",
        values: {
          en: "OpenAI (GPT)",
          de: "OpenAI (GPT)",
          pl: "OpenAI (GPT)",
          es: "OpenAI (GPT)",
          fr: "OpenAI (GPT)",
          ja: "OpenAI（GPT）",
        }
      },
      {
        key: "ui.manage.ai.provider.google",
        values: {
          en: "Google (Gemini)",
          de: "Google (Gemini)",
          pl: "Google (Gemini)",
          es: "Google (Gemini)",
          fr: "Google (Gemini)",
          ja: "Google（Gemini）",
        }
      },

      // === PRIVACY INDICATORS (DYNAMIC) ===
      {
        key: "ui.manage.ai.privacy_indicators",
        values: {
          en: "Privacy Indicators",
          de: "Datenschutzindikatoren",
          pl: "Wskaźniki prywatności",
          es: "Indicadores de privacidad",
          fr: "Indicateurs de confidentialité",
          ja: "プライバシー指標",
        }
      },
      {
        key: "ui.manage.ai.location",
        values: {
          en: "Location",
          de: "Standort",
          pl: "Lokalizacja",
          es: "Ubicación",
          fr: "Emplacement",
          ja: "場所",
        }
      },
      {
        key: "ui.manage.ai.location_none",
        values: {
          en: "None",
          de: "Keine",
          pl: "Brak",
          es: "Ninguna",
          fr: "Aucun",
          ja: "なし",
        }
      },
      {
        key: "ui.manage.ai.zero_data_retention",
        values: {
          en: "Zero Data Retention",
          de: "Keine Datenspeicherung",
          pl: "Zerowa retencja danych",
          es: "Retención cero de datos",
          fr: "Rétention zéro des données",
          ja: "データ保持ゼロ",
        }
      },
      {
        key: "ui.manage.ai.zero_data_retention_desc",
        values: {
          en: "{count} model(s) - Data deleted immediately after processing",
          de: "{count} Modell(e) - Daten werden sofort nach der Verarbeitung gelöscht",
          pl: "{count} model(i) - Dane usuwane natychmiast po przetworzeniu",
          es: "{count} modelo(s) - Datos eliminados inmediatamente después del procesamiento",
          fr: "{count} modèle(s) - Données supprimées immédiatement après traitement",
          ja: "{count}モデル - 処理後すぐにデータ削除",
        }
      },
      {
        key: "ui.manage.ai.no_training",
        values: {
          en: "No Training",
          de: "Kein Training",
          pl: "Brak treningu",
          es: "Sin entrenamiento",
          fr: "Pas d'entraînement",
          ja: "トレーニングなし",
        }
      },
      {
        key: "ui.manage.ai.no_training_desc",
        values: {
          en: "{count} model(s) - Provider does not train AI on your data",
          de: "{count} Modell(e) - Anbieter trainiert KI nicht mit Ihren Daten",
          pl: "{count} model(i) - Dostawca nie trenuje AI na Twoich danych",
          es: "{count} modelo(s) - El proveedor no entrena IA con sus datos",
          fr: "{count} modèle(s) - Le fournisseur n'entraîne pas l'IA sur vos données",
          ja: "{count}モデル - プロバイダーはあなたのデータでAIをトレーニングしません",
        }
      },
      {
        key: "ui.manage.ai.smart_defaults",
        values: {
          en: "Smart Defaults",
          de: "Intelligente Standardwerte",
          pl: "Inteligentne ustawienia domyślne",
          es: "Valores predeterminados inteligentes",
          fr: "Valeurs par défaut intelligentes",
          ja: "スマートデフォルト",
        }
      },
      {
        key: "ui.manage.ai.smart_defaults_desc",
        values: {
          en: "We automatically pre-select {count} popular models to get you started. You can enable additional models or disable any you don't want to offer to your team.",
          de: "Wir wählen automatisch {count} beliebte Modelle aus, um Ihnen den Einstieg zu erleichtern. Sie können weitere Modelle aktivieren oder beliebige deaktivieren, die Sie Ihrem Team nicht anbieten möchten.",
          pl: "Automatycznie wybieramy {count} popularnych modeli, aby ułatwić Ci start. Możesz włączyć dodatkowe modele lub wyłączyć te, których nie chcesz oferować swojemu zespołowi.",
          es: "Preseleccionamos automáticamente {count} modelos populares para comenzar. Puede habilitar modelos adicionales o deshabilitar cualquiera que no desee ofrecer a su equipo.",
          fr: "Nous présélectionnons automatiquement {count} modèles populaires pour vous aider à démarrer. Vous pouvez activer des modèles supplémentaires ou désactiver ceux que vous ne souhaitez pas proposer à votre équipe.",
          ja: "開始するために{count}個の人気モデルを自動的に事前選択します。追加のモデルを有効にしたり、チームに提供したくないモデルを無効にすることができます。",
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
            "ai-settings"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} AI Settings translations`);
    return { success: true, count };
  }
});
