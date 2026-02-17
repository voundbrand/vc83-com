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
      "ui.ai_assistant.footer.loading": {
        en: "Loading...",
        de: "Lädt...",
        pl: "Ładowanie...",
        es: "Cargando...",
        fr: "Chargement...",
        ja: "読み込み中..."
      },
      "ui.ai_assistant.footer.error": {
        en: "Error",
        de: "Fehler",
        pl: "Błąd",
        es: "Error",
        fr: "Erreur",
        ja: "エラー"
      },
      "ui.ai_assistant.footer.ai_disabled": {
        en: "AI Disabled",
        de: "KI deaktiviert",
        pl: "AI wyłączone",
        es: "IA deshabilitada",
        fr: "IA désactivée",
        ja: "AI無効"
      },
      "ui.ai_assistant.footer.no_subscription": {
        en: "No Credits",
        de: "Keine Credits",
        pl: "Brak kredytów",
        es: "Sin créditos",
        fr: "Aucun crédit",
        ja: "クレジットがありません"
      },
      "ui.ai_assistant.footer.subscription_inactive": {
        en: "Credits Inactive",
        de: "Credits inaktiv",
        pl: "Kredyty nieaktywne",
        es: "Créditos inactivos",
        fr: "Crédits inactifs",
        ja: "クレジットが無効です"
      },
      "ui.ai_assistant.footer.no_models": {
        en: "No Models Configured",
        de: "Keine Modelle konfiguriert",
        pl: "Brak skonfigurowanych modeli",
        es: "Sin modelos configurados",
        fr: "Aucun modèle configuré",
        ja: "モデル未設定"
      },
      "ui.ai_assistant.footer.ai_offline": {
        en: "AI Offline",
        de: "KI Offline",
        pl: "AI Offline",
        es: "IA desconectada",
        fr: "IA hors ligne",
        ja: "AIオフライン"
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
      },

      // Conversation History (Left Pane)
      "ui.ai_assistant.history.title": {
        en: "Conversations",
        de: "Gespräche",
        pl: "Rozmowy",
        es: "Conversaciones",
        fr: "Conversations",
        ja: "会話"
      },
      "ui.ai_assistant.history.new_chat": {
        en: "New Chat",
        de: "Neuer Chat",
        pl: "Nowa rozmowa",
        es: "Nuevo chat",
        fr: "Nouveau chat",
        ja: "新しいチャット"
      },
      "ui.ai_assistant.history.search_placeholder": {
        en: "Search conversations...",
        de: "Gespräche durchsuchen...",
        pl: "Szukaj rozmów...",
        es: "Buscar conversaciones...",
        fr: "Rechercher des conversations...",
        ja: "会話を検索..."
      },
      "ui.ai_assistant.history.no_results": {
        en: "No conversations found",
        de: "Keine Gespräche gefunden",
        pl: "Nie znaleziono rozmów",
        es: "No se encontraron conversaciones",
        fr: "Aucune conversation trouvée",
        ja: "会話が見つかりません"
      },
      "ui.ai_assistant.history.empty": {
        en: "No conversations yet",
        de: "Noch keine Gespräche",
        pl: "Brak rozmów",
        es: "Aún no hay conversaciones",
        fr: "Aucune conversation pour le moment",
        ja: "まだ会話がありません"
      },
      "ui.ai_assistant.history.messages": {
        en: "messages",
        de: "Nachrichten",
        pl: "wiadomości",
        es: "mensajes",
        fr: "messages",
        ja: "メッセージ"
      },
      "ui.ai_assistant.history.conversations": {
        en: "conversations",
        de: "Gespräche",
        pl: "rozmów",
        es: "conversaciones",
        fr: "conversations",
        ja: "会話"
      },

      // Tool Execution Panel (Right Pane)
      "ui.ai_assistant.tools.title": {
        en: "Tools",
        de: "Werkzeuge",
        pl: "Narzędzia",
        es: "Herramientas",
        fr: "Outils",
        ja: "ツール"
      },
      "ui.ai_assistant.tools.empty": {
        en: "No tool executions yet",
        de: "Noch keine Werkzeugausführungen",
        pl: "Brak wykonań narzędzi",
        es: "Aún no hay ejecuciones de herramientas",
        fr: "Aucune exécution d'outil pour le moment",
        ja: "まだツールの実行がありません"
      },
      "ui.ai_assistant.tools.active": {
        en: "active",
        de: "aktiv",
        pl: "aktywnych",
        es: "activo",
        fr: "actif",
        ja: "アクティブ"
      },
      "ui.ai_assistant.tool.input": {
        en: "Input",
        de: "Eingabe",
        pl: "Wejście",
        es: "Entrada",
        fr: "Entrée",
        ja: "入力"
      },
      "ui.ai_assistant.tool.output": {
        en: "Output",
        de: "Ausgabe",
        pl: "Wyjście",
        es: "Salida",
        fr: "Sortie",
        ja: "出力"
      },

      // Feature Request Notification
      "ui.ai_assistant.feature_request.notification": {
        en: "💡 Great idea! We've noticed you're trying to use \"{toolName}\" and we're actively working on adding this feature to our platform. We'll notify you when it's ready! In the meantime, let me show you how to do this manually.",
        de: "💡 Tolle Idee! Wir haben bemerkt, dass Sie versuchen, \"{toolName}\" zu verwenden, und arbeiten aktiv daran, diese Funktion zu unserer Plattform hinzuzufügen. Wir werden Sie benachrichtigen, wenn sie fertig ist! In der Zwischenzeit zeige ich Ihnen, wie Sie dies manuell tun können.",
        pl: "💡 Świetny pomysł! Zauważyliśmy, że próbujesz użyć \"{toolName}\" i aktywnie pracujemy nad dodaniem tej funkcji do naszej platformy. Powiadomimy Cię, gdy będzie gotowa! W międzyczasie pokażę Ci, jak zrobić to ręcznie.",
        es: "💡 ¡Gran idea! Hemos notado que estás intentando usar \"{toolName}\" y estamos trabajando activamente para agregar esta función a nuestra plataforma. ¡Te notificaremos cuando esté lista! Mientras tanto, déjame mostrarte cómo hacer esto manualmente.",
        fr: "💡 Excellente idée ! Nous avons remarqué que vous essayez d'utiliser \"{toolName}\" et nous travaillons activement à l'ajout de cette fonctionnalité à notre plateforme. Nous vous préviendrons quand elle sera prête ! En attendant, laissez-moi vous montrer comment faire cela manuellement.",
        ja: "💡 素晴らしいアイデアです！\"{toolName}\"を使用しようとしていることに気付きました。現在、この機能をプラットフォームに追加するために積極的に取り組んでいます。準備ができたらお知らせします！それまでの間、手動で行う方法をご紹介します。"
      },
      "ui.ai_assistant.feature_request.short": {
        en: "We're working on adding this feature!",
        de: "Wir arbeiten daran, diese Funktion hinzuzufügen!",
        pl: "Pracujemy nad dodaniem tej funkcji!",
        es: "¡Estamos trabajando para agregar esta función!",
        fr: "Nous travaillons à l'ajout de cette fonctionnalité !",
        ja: "この機能を追加する作業を進めています！"
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
