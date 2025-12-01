import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

/**
 * Seed AI Assistant translations
 *
 * Namespace: ui.ai_assistant
 * Languages: EN, DE, PL, ES, FR, JA
 *
 * Run: npx convex run translations/seedAIAssistant:seed
 */
export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding AI Assistant translations...");

    // Find system organization
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

    const translations = {
      // Header
      "ui.ai_assistant.header.title": {
        en: "AI Assistant",
        de: "KI-Assistent",
        pl: "Asystent AI",
        es: "Asistente de IA",
        fr: "Assistant IA",
        ja: "AIアシスタント"
      },
      "ui.ai_assistant.header.online": {
        en: "Online",
        de: "Online",
        pl: "Online",
        es: "En línea",
        fr: "En ligne",
        ja: "オンライン"
      },
      "ui.ai_assistant.header.workflow_button": {
        en: "Workflow",
        de: "Arbeitsablauf",
        pl: "Przepływ pracy",
        es: "Flujo de trabajo",
        fr: "Flux de travail",
        ja: "ワークフロー"
      },

      // Input
      "ui.ai_assistant.input.placeholder": {
        en: "Type a message... (Shift+Enter for new line)",
        de: "Nachricht eingeben... (Umschalt+Enter für neue Zeile)",
        pl: "Wpisz wiadomość... (Shift+Enter dla nowej linii)",
        es: "Escribe un mensaje... (Shift+Enter para nueva línea)",
        fr: "Tapez un message... (Shift+Entrée pour nouvelle ligne)",
        ja: "メッセージを入力... (Shift+Enterで改行)"
      },
      "ui.ai_assistant.input.send_button": {
        en: "Send",
        de: "Senden",
        pl: "Wyślij",
        es: "Enviar",
        fr: "Envoyer",
        ja: "送信"
      },
      "ui.ai_assistant.input.quick_commands": {
        en: "Quick: /email, /forms, /crm, /events",
        de: "Schnell: /email, /forms, /crm, /events",
        pl: "Szybko: /email, /forms, /crm, /events",
        es: "Rápido: /email, /forms, /crm, /events",
        fr: "Rapide : /email, /forms, /crm, /events",
        ja: "クイック: /email, /forms, /crm, /events"
      },

      // Footer
      "ui.ai_assistant.footer.tokens": {
        en: "tokens",
        de: "Token",
        pl: "tokenów",
        es: "tokens",
        fr: "jetons",
        ja: "トークン"
      },
      "ui.ai_assistant.footer.cost_tooltip": {
        en: "Estimated cost",
        de: "Geschätzte Kosten",
        pl: "Szacowany koszt",
        es: "Costo estimado",
        fr: "Coût estimé",
        ja: "推定コスト"
      },
      "ui.ai_assistant.footer.tokens_tooltip": {
        en: "Tokens used in this conversation",
        de: "In dieser Unterhaltung verwendete Token",
        pl: "Tokeny użyte w tej rozmowie",
        es: "Tokens utilizados en esta conversación",
        fr: "Jetons utilisés dans cette conversation",
        ja: "この会話で使用されたトークン"
      },
      "ui.ai_assistant.footer.ai_online": {
        en: "AI Online",
        de: "KI Online",
        pl: "AI Online",
        es: "IA en línea",
        fr: "IA en ligne",
        ja: "AIオンライン"
      },
      "ui.ai_assistant.footer.ready": {
        en: "Ready",
        de: "Bereit",
        pl: "Gotowy",
        es: "Listo",
        fr: "Prêt",
        ja: "準備完了"
      },

      // Welcome message
      "ui.ai_assistant.welcome.message": {
        en: "Welcome! I'm your AI assistant. I can help with emails, CRM, forms, events, and more. What would you like to do today?",
        de: "Willkommen! Ich bin Ihr KI-Assistent. Ich kann bei E-Mails, CRM, Formularen, Veranstaltungen und mehr helfen. Was möchten Sie heute tun?",
        pl: "Witaj! Jestem Twoim asystentem AI. Mogę pomóc z e-mailami, CRM, formularzami, wydarzeniami i nie tylko. Co chciałbyś dzisiaj zrobić?",
        es: "¡Bienvenido! Soy tu asistente de IA. Puedo ayudar con correos electrónicos, CRM, formularios, eventos y más. ¿Qué te gustaría hacer hoy?",
        fr: "Bienvenue ! Je suis votre assistant IA. Je peux vous aider avec les e-mails, le CRM, les formulaires, les événements et plus encore. Que souhaitez-vous faire aujourd'hui ?",
        ja: "ようこそ！私はあなたのAIアシスタントです。メール、CRM、フォーム、イベントなどでお手伝いします。今日は何をしたいですか？"
      },

      // Tool execution status
      "ui.ai_assistant.tool.running": {
        en: "Running...",
        de: "Läuft...",
        pl: "Uruchamianie...",
        es: "Ejecutando...",
        fr: "En cours...",
        ja: "実行中..."
      },
      "ui.ai_assistant.tool.success": {
        en: "Success",
        de: "Erfolg",
        pl: "Sukces",
        es: "Éxito",
        fr: "Succès",
        ja: "成功"
      },
      "ui.ai_assistant.tool.error": {
        en: "Error",
        de: "Fehler",
        pl: "Błąd",
        es: "Error",
        fr: "Erreur",
        ja: "エラー"
      },

      // Loading states
      "ui.ai_assistant.loading.translations": {
        en: "Loading translations...",
        de: "Übersetzungen werden geladen...",
        pl: "Ładowanie tłumaczeń...",
        es: "Cargando traducciones...",
        fr: "Chargement des traductions...",
        ja: "翻訳を読み込み中..."
      }
    };

    let count = 0;
    const emptySet = new Set<string>(); // Required for helper signature (ignored internally)

    // Insert translations using helper function
    for (const [key, values] of Object.entries(translations)) {
      for (const [locale, value] of Object.entries(values)) {
        const inserted = await insertTranslationIfNew(
          ctx.db,
          emptySet,
          systemOrg._id,
          systemUser._id,
          key,
          value as string,
          locale,
          "ai_assistant"
        );
        if (inserted) count++;
      }
    }

    console.log(`✅ Seeded ${count} AI Assistant translations`);
    return {
      success: true,
      count,
      totalKeys: Object.keys(translations).length,
      namespace: "ui.ai_assistant"
    };
  }
});
