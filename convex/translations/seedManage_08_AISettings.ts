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

      // === BUTTONS ===
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
