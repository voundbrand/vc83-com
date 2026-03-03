/**
 * SEED STORE TRANSLATIONS
 *
 * Seeds translations for the Platform Store window
 *
 * Run: npx convex run translations/seedStore:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Store translations...");

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
      // === STORE HEADER ===
      {
        key: "ui.store.title",
        values: {
          en: "sevenlayers.io Store",
          de: "sevenlayers.io Shop",
          pl: "Sklep sevenlayers.io",
          es: "Tienda sevenlayers.io",
          fr: "Boutique sevenlayers.io",
          ja: "sevenlayers.io ストア",
        }
      },
      {
        key: "ui.store.subtitle",
        values: {
          en: "Everything you need to get started, scale, and grow. All prices include VAT (EUR).",
          de: "Alles, was Sie für den Start, die Skalierung und das Wachstum brauchen. Alle Preise inkl. MwSt. (EUR).",
          pl: "Wszystko, czego potrzebujesz, aby zacząć, skalować i rozwijać się. Wszystkie ceny zawierają VAT (EUR).",
          es: "Todo lo que necesita para empezar, escalar y crecer. Todos los precios incluyen IVA (EUR).",
          fr: "Tout ce dont vous avez besoin pour démarrer, évoluer et grandir. Tous les prix incluent la TVA (EUR).",
          ja: "開始、拡張、成長に必要なすべてが揃っています。すべての価格はVAT込み（EUR）です。",
        }
      },

      // === SECTIONS ===
      {
        key: "ui.store.section.ai_agents",
        values: {
          en: "AI-Agents (Monthly Subscriptions)",
          de: "KI-Agenten (Monatsabonnements)",
          pl: "Agenci AI (subskrypcje miesięczne)",
          es: "Agentes de IA (suscripciones mensuales)",
          fr: "Agents IA (abonnements mensuels)",
          ja: "AI エージェント（月額サブスクリプション）",
        }
      },
      {
        key: "ui.store.section.private_llm",
        values: {
          en: "Private LLM Models (Self-Hosted)",
          de: "Private LLM-Modelle (selbst gehostet)",
          pl: "Prywatne modele LLM (samodzielnie hostowane)",
          es: "Modelos LLM privados (autohospedados)",
          fr: "Modèles LLM privés (auto-hébergés)",
          ja: "プライベート LLM モデル（セルフホスト）",
        }
      },
      {
        key: "ui.store.section.token_packs",
        values: {
          en: "Token Packs (One-Time Purchase)",
          de: "Token-Pakete (Einmaliger Kauf)",
          pl: "Pakiety tokenów (jednorazowy zakup)",
          es: "Paquetes de tokens (compra única)",
          fr: "Packs de jetons (achat unique)",
          ja: "トークンパック（1回限りの購入）",
        }
      },
      {
        key: "ui.store.section.custom_frontend",
        values: {
          en: "Custom Frontend Development",
          de: "Individuelle Frontend-Entwicklung",
          pl: "Niestandardowy rozwój frontendu",
          es: "Desarrollo de frontend personalizado",
          fr: "Développement frontend personnalisé",
          ja: "カスタムフロントエンド開発",
        }
      },

      // === AI STANDARD ===
      {
        key: "ui.store.ai.standard.name",
        values: {
          en: "Standard",
          de: "Standard",
          pl: "Standardowy",
          es: "Estándar",
          fr: "Standard",
          ja: "スタンダード",
        }
      },
      {
        key: "ui.store.ai.standard.description",
        values: {
          en: "Access all 16 AI models. Automatic smart routing picks the fastest option for you.",
          de: "Zugriff auf alle 16 KI-Modelle. Automatisches Smart-Routing wählt die schnellste Option für Sie.",
          pl: "Dostęp do wszystkich 16 modeli AI. Automatyczny smart routing wybiera najszybszą opcję.",
          es: "Acceda a los 16 modelos de IA. El enrutamiento inteligente elige la opción más rápida para usted.",
          fr: "Accédez aux 16 modèles IA. Le routage intelligent choisit automatiquement l'option la plus rapide.",
          ja: "全16のAIモデルにアクセス。スマートルーティングが最速のオプションを自動選択します。",
        }
      },
      {
        key: "ui.store.ai.standard.feature1",
        values: {
          en: "All 16 AI models",
          de: "Alle 16 KI-Modelle",
          pl: "Wszystkie 16 modeli AI",
          es: "Todos los 16 modelos de IA",
          fr: "Tous les 16 modèles IA",
          ja: "全16のAIモデル",
        }
      },
      {
        key: "ui.store.ai.standard.feature2",
        values: {
          en: "500K tokens/month",
          de: "500.000 Token/Monat",
          pl: "500 tys. tokenów/miesiąc",
          es: "500K tokens/mes",
          fr: "500K jetons/mois",
          ja: "月間50万トークン",
        }
      },
      {
        key: "ui.store.ai.standard.feature3",
        values: {
          en: "Smart routing for speed",
          de: "Smart-Routing für Geschwindigkeit",
          pl: "Smart routing dla szybkości",
          es: "Enrutamiento inteligente",
          fr: "Routage intelligent rapide",
          ja: "高速スマートルーティング",
        }
      },
      {
        key: "ui.store.ai.standard.feature4",
        values: {
          en: "Fast, reliable responses",
          de: "Schnelle, zuverlässige Antworten",
          pl: "Szybkie, niezawodne odpowiedzi",
          es: "Respuestas rápidas y fiables",
          fr: "Réponses rapides et fiables",
          ja: "高速で信頼性の高い応答",
        }
      },
      {
        key: "ui.store.ai.standard.cart_name",
        values: {
          en: "AI Assistant Standard",
          de: "KI-Assistent Standard",
          pl: "Asystent AI Standard",
          es: "Asistente de IA Estándar",
          fr: "Assistant IA Standard",
          ja: "AIアシスタント スタンダード",
        }
      },
      {
        key: "ui.store.ai.standard.cart_description",
        values: {
          en: "All 16 AI models with global routing",
          de: "Alle 16 KI-Modelle mit globalem Routing",
          pl: "Wszystkie 16 modeli AI z globalnym routingiem",
          es: "Todos los 16 modelos de IA con enrutamiento global",
          fr: "Tous les 16 modèles IA avec routage global",
          ja: "グローバルルーティングを備えた全16のAIモデル",
        }
      },

      // === AI PRIVACY ===
      {
        key: "ui.store.ai.privacy.name",
        values: {
          en: "Privacy-Enhanced",
          de: "Datenschutz-optimiert",
          pl: "Wzmocniona prywatność",
          es: "Privacidad mejorada",
          fr: "Confidentialité renforcée",
          ja: "プライバシー強化",
        }
      },
      {
        key: "ui.store.ai.privacy.description",
        values: {
          en: "Your data stays yours. GDPR-compliant models with zero data retention.",
          de: "Ihre Daten bleiben Ihre. DSGVO-konforme Modelle ohne Datenspeicherung.",
          pl: "Twoje dane pozostają Twoje. Modele zgodne z RODO bez przechowywania danych.",
          es: "Sus datos son suyos. Modelos compatibles con GDPR sin retención de datos.",
          fr: "Vos données restent les vôtres. Modèles conformes au RGPD sans rétention de données.",
          ja: "あなたのデータはあなたのもの。データ保持なしのGDPR準拠モデル。",
        }
      },
      {
        key: "ui.store.ai.privacy.feature1",
        values: {
          en: "6 GDPR-compliant models",
          de: "6 DSGVO-konforme Modelle",
          pl: "6 modeli zgodnych z RODO",
          es: "6 modelos compatibles con GDPR",
          fr: "6 modèles conformes au RGPD",
          ja: "6つのGDPR準拠モデル",
        }
      },
      {
        key: "ui.store.ai.privacy.feature2",
        values: {
          en: "500K tokens/month",
          de: "500.000 Token/Monat",
          pl: "500 tys. tokenów/miesiąc",
          es: "500K tokens/mes",
          fr: "500K jetons/mois",
          ja: "月間50万トークン",
        }
      },
      {
        key: "ui.store.ai.privacy.feature3",
        values: {
          en: "🇪🇺 EU providers prioritized",
          de: "🇪🇺 EU-Anbieter priorisiert",
          pl: "🇪🇺 Priorytet dla dostawców z UE",
          es: "🇪🇺 Proveedores de la UE priorizados",
          fr: "🇪🇺 Fournisseurs UE prioritaires",
          ja: "🇪🇺 EUプロバイダー優先",
        }
      },
      {
        key: "ui.store.ai.privacy.feature4",
        values: {
          en: "🛡️ Zero Data Retention",
          de: "🛡️ Keine Datenspeicherung",
          pl: "🛡️ Brak przechowywania danych",
          es: "🛡️ Sin retención de datos",
          fr: "🛡️ Aucune rétention de données",
          ja: "🛡️ データ保持なし",
        }
      },
      {
        key: "ui.store.ai.privacy.feature5",
        values: {
          en: "🚫 No training on your data",
          de: "🚫 Kein Training mit Ihren Daten",
          pl: "🚫 Brak trenowania na Twoich danych",
          es: "🚫 Sin entrenamiento con tus datos",
          fr: "🚫 Pas d'entraînement sur vos données",
          ja: "🚫 あなたのデータでのトレーニングなし",
        }
      },
      {
        key: "ui.store.ai.privacy.cart_name",
        values: {
          en: "AI Assistant Privacy-Enhanced",
          de: "KI-Assistent Datenschutz-optimiert",
          pl: "Asystent AI z wzmocnioną prywatnością",
          es: "Asistente de IA con privacidad mejorada",
          fr: "Assistant IA confidentialité renforcée",
          ja: "AIアシスタント プライバシー強化",
        }
      },
      {
        key: "ui.store.ai.privacy.cart_description",
        values: {
          en: "GDPR-compliant with zero data retention",
          de: "DSGVO-konform ohne Datenspeicherung",
          pl: "Zgodny z RODO bez przechowywania danych",
          es: "Compatible con GDPR sin retención de datos",
          fr: "Conforme au RGPD sans rétention de données",
          ja: "データ保持なしのGDPR準拠",
        }
      },

      // === PRIVATE LLM - STARTER ===
      {
        key: "ui.store.private_llm.starter.name",
        values: {
          en: "Private LLM Starter",
          de: "Private LLM Starter",
          pl: "Prywatny LLM Starter",
          es: "LLM privado Starter",
          fr: "LLM privé Starter",
          ja: "プライベート LLM スターター",
        }
      },
      {
        key: "ui.store.private_llm.starter.description",
        values: {
          en: "Run AI on your own infrastructure. Pay only when it's active.",
          de: "KI auf Ihrer eigenen Infrastruktur betreiben. Nur bei Nutzung zahlen.",
          pl: "Uruchom AI na własnej infrastrukturze. Płać tylko, gdy jest aktywne.",
          es: "Ejecute IA en su propia infraestructura. Pague solo cuando esté activo.",
          fr: "Exécutez l'IA sur votre propre infrastructure. Payez uniquement quand elle est active.",
          ja: "自社のインフラでAIを実行。アクティブ時のみ課金。",
        }
      },
      {
        key: "ui.store.private_llm.starter.feature1",
        values: {
          en: "Self-hosted AI",
          de: "Selbst gehostete KI",
          pl: "Samodzielnie hostowane AI",
          es: "IA autohospedada",
          fr: "IA auto-hébergée",
          ja: "セルフホストAI",
        }
      },
      {
        key: "ui.store.private_llm.starter.feature2",
        values: {
          en: "~50K requests/month",
          de: "~50.000 Anfragen/Monat",
          pl: "~50 tys. zapytań/miesiąc",
          es: "~50K solicitudes/mes",
          fr: "~50K requêtes/mois",
          ja: "月間約5万リクエスト",
        }
      },
      {
        key: "ui.store.private_llm.starter.feature3",
        values: {
          en: "No cost when idle",
          de: "Keine Kosten im Ruhezustand",
          pl: "Brak kosztów w stanie bezczynności",
          es: "Sin coste cuando está inactivo",
          fr: "Aucun coût au repos",
          ja: "アイドル時は無料",
        }
      },
      {
        key: "ui.store.private_llm.starter.feature4",
        values: {
          en: "Complete data ownership",
          de: "Vollständige Datenhoheit",
          pl: "Pełna kontrola nad danymi",
          es: "Control total de sus datos",
          fr: "Propriété totale de vos données",
          ja: "データの完全な所有権",
        }
      },

      // === PRIVATE LLM - PROFESSIONAL ===
      {
        key: "ui.store.private_llm.professional.name",
        values: {
          en: "Private LLM Professional",
          de: "Private LLM Professional",
          pl: "Prywatny LLM Professional",
          es: "LLM privado Professional",
          fr: "LLM privé Professional",
          ja: "プライベート LLM プロフェッショナル",
        }
      },
      {
        key: "ui.store.private_llm.professional.description",
        values: {
          en: "Dedicated GPU power for teams that need guaranteed performance and uptime.",
          de: "Dedizierte GPU-Leistung für Teams, die garantierte Performance und Verfügbarkeit benötigen.",
          pl: "Dedykowana moc GPU dla zespołów potrzebujących gwarantowanej wydajności i dostępności.",
          es: "Potencia GPU dedicada para equipos que necesitan rendimiento y disponibilidad garantizados.",
          fr: "Puissance GPU dédiée pour les équipes qui ont besoin de performances et de disponibilité garanties.",
          ja: "パフォーマンスと稼働時間を保証する専用GPUパワー。",
        }
      },
      {
        key: "ui.store.private_llm.professional.feature1",
        values: {
          en: "Dedicated GPU infrastructure",
          de: "Dedizierte GPU-Infrastruktur",
          pl: "Dedykowana infrastruktura GPU",
          es: "Infraestructura GPU dedicada",
          fr: "Infrastructure GPU dédiée",
          ja: "専用GPUインフラ",
        }
      },
      {
        key: "ui.store.private_llm.professional.feature2",
        values: {
          en: "~200K requests/month",
          de: "~200.000 Anfragen/Monat",
          pl: "~200 tys. zapytań/miesiąc",
          es: "~200K solicitudes/mes",
          fr: "~200K requêtes/mois",
          ja: "月間約20万リクエスト",
        }
      },
      {
        key: "ui.store.private_llm.professional.feature3",
        values: {
          en: "99.5% SLA",
          de: "99,5% SLA",
          pl: "99,5% SLA",
          es: "99.5% SLA",
          fr: "99,5% SLA",
          ja: "99.5% SLA",
        }
      },
      {
        key: "ui.store.private_llm.professional.feature4",
        values: {
          en: "Priority support",
          de: "Prioritätssupport",
          pl: "Priorytetowe wsparcie",
          es: "Soporte prioritario",
          fr: "Support prioritaire",
          ja: "優先サポート",
        }
      },

      // === PRIVATE LLM - ENTERPRISE ===
      {
        key: "ui.store.private_llm.enterprise.name",
        values: {
          en: "Private LLM Enterprise",
          de: "Private LLM Enterprise",
          pl: "Prywatny LLM Enterprise",
          es: "LLM privado Enterprise",
          fr: "LLM privé Enterprise",
          ja: "プライベート LLM エンタープライズ",
        }
      },
      {
        key: "ui.store.private_llm.enterprise.description",
        values: {
          en: "Fully custom setup with no request limits. Built around your exact requirements.",
          de: "Vollständig individuelle Einrichtung ohne Anfragelimits. Auf Ihre Anforderungen zugeschnitten.",
          pl: "W pełni niestandardowa konfiguracja bez limitów zapytań. Dostosowana do Twoich wymagań.",
          es: "Configuración totalmente personalizada sin límites de solicitudes. Diseñada según sus requisitos.",
          fr: "Configuration entièrement personnalisée sans limites de requêtes. Conçue selon vos besoins.",
          ja: "リクエスト制限なしの完全カスタムセットアップ。お客様の要件に合わせて構築。",
        }
      },
      {
        key: "ui.store.private_llm.enterprise.feature1",
        values: {
          en: "Custom infrastructure",
          de: "Individuelle Infrastruktur",
          pl: "Niestandardowa infrastruktura",
          es: "Infraestructura personalizada",
          fr: "Infrastructure personnalisée",
          ja: "カスタムインフラ",
        }
      },
      {
        key: "ui.store.private_llm.enterprise.feature2",
        values: {
          en: "Unlimited requests",
          de: "Unbegrenzte Anfragen",
          pl: "Nieograniczone zapytania",
          es: "Solicitudes ilimitadas",
          fr: "Requêtes illimitées",
          ja: "無制限リクエスト",
        }
      },
      {
        key: "ui.store.private_llm.enterprise.feature3",
        values: {
          en: "Dedicated support team",
          de: "Dediziertes Support-Team",
          pl: "Dedykowany zespół wsparcia",
          es: "Equipo de soporte dedicado",
          fr: "Équipe de support dédiée",
          ja: "専任サポートチーム",
        }
      },
      {
        key: "ui.store.private_llm.enterprise.feature4",
        values: {
          en: "Custom SLA",
          de: "Individuelles SLA",
          pl: "Niestandardowe SLA",
          es: "SLA personalizado",
          fr: "SLA personnalisé",
          ja: "カスタムSLA",
        }
      },

      // === TOKEN PACKS ===
      {
        key: "ui.store.tokens.starter.name",
        values: {
          en: "Starter",
          de: "Starter",
          pl: "Starter",
          es: "Starter",
          fr: "Starter",
          ja: "スターター",
        }
      },
      {
        key: "ui.store.tokens.starter.cart_name",
        values: {
          en: "Token Pack - Starter (1M tokens)",
          de: "Token-Paket - Starter (1 Mio. Token)",
          pl: "Pakiet tokenów - Starter (1 mln tokenów)",
          es: "Paquete de tokens - Starter (1M tokens)",
          fr: "Pack de jetons - Starter (1M jetons)",
          ja: "トークンパック - スターター（100万トークン）",
        }
      },
      {
        key: "ui.store.tokens.starter.cart_description",
        values: {
          en: "1,000,000 AI tokens",
          de: "1.000.000 KI-Token",
          pl: "1 000 000 tokenów AI",
          es: "1,000,000 tokens de IA",
          fr: "1 000 000 jetons IA",
          ja: "100万AIトークン",
        }
      },
      {
        key: "ui.store.tokens.standard.name",
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
        key: "ui.store.tokens.standard.cart_name",
        values: {
          en: "Token Pack - Standard (5M tokens)",
          de: "Token-Paket - Standard (5 Mio. Token)",
          pl: "Pakiet tokenów - Standard (5 mln tokenów)",
          es: "Paquete de tokens - Standard (5M tokens)",
          fr: "Pack de jetons - Standard (5M jetons)",
          ja: "トークンパック - スタンダード（500万トークン）",
        }
      },
      {
        key: "ui.store.tokens.standard.cart_description",
        values: {
          en: "5,000,000 AI tokens",
          de: "5.000.000 KI-Token",
          pl: "5 000 000 tokenów AI",
          es: "5,000,000 tokens de IA",
          fr: "5 000 000 jetons IA",
          ja: "500万AIトークン",
        }
      },
      {
        key: "ui.store.tokens.professional.name",
        values: {
          en: "Professional",
          de: "Professional",
          pl: "Professional",
          es: "Professional",
          fr: "Professional",
          ja: "プロフェッショナル",
        }
      },
      {
        key: "ui.store.tokens.professional.cart_name",
        values: {
          en: "Token Pack - Professional (10M tokens)",
          de: "Token-Paket - Professional (10 Mio. Token)",
          pl: "Pakiet tokenów - Professional (10 mln tokenów)",
          es: "Paquete de tokens - Professional (10M tokens)",
          fr: "Pack de jetons - Professional (10M jetons)",
          ja: "トークンパック - プロフェッショナル（1000万トークン）",
        }
      },
      {
        key: "ui.store.tokens.professional.cart_description",
        values: {
          en: "10,000,000 AI tokens",
          de: "10.000.000 KI-Token",
          pl: "10 000 000 tokenów AI",
          es: "10,000,000 tokens de IA",
          fr: "10 000 000 jetons IA",
          ja: "1000万AIトークン",
        }
      },
      {
        key: "ui.store.tokens.enterprise.name",
        values: {
          en: "Enterprise",
          de: "Enterprise",
          pl: "Enterprise",
          es: "Enterprise",
          fr: "Enterprise",
          ja: "エンタープライズ",
        }
      },
      {
        key: "ui.store.tokens.enterprise.cart_name",
        values: {
          en: "Token Pack - Enterprise (50M tokens)",
          de: "Token-Paket - Enterprise (50 Mio. Token)",
          pl: "Pakiet tokenów - Enterprise (50 mln tokenów)",
          es: "Paquete de tokens - Enterprise (50M tokens)",
          fr: "Pack de jetons - Enterprise (50M jetons)",
          ja: "トークンパック - エンタープライズ（5000万トークン）",
        }
      },
      {
        key: "ui.store.tokens.enterprise.cart_description",
        values: {
          en: "50,000,000 AI tokens",
          de: "50.000.000 KI-Token",
          pl: "50 000 000 tokenów AI",
          es: "50,000,000 tokens de IA",
          fr: "50 000 000 jetons IA",
          ja: "5000万AIトークン",
        }
      },

      // === CUSTOM FRONTEND ===
      {
        key: "ui.store.custom.title",
        values: {
          en: "Custom Frontend Package",
          de: "Individuelles Frontend-Paket",
          pl: "Niestandardowy pakiet frontendu",
          es: "Paquete de frontend personalizado",
          fr: "Pack frontend personnalisé",
          ja: "カスタムフロントエンドパッケージ",
        }
      },
      {
        key: "ui.store.custom.description",
        values: {
          en: "We build a custom web application for your business, fully connected to sevenlayers.io. You get a solution designed around your workflows — not a template.",
          de: "Wir entwickeln eine maßgeschneiderte Webanwendung für Ihr Unternehmen, vollständig mit sevenlayers.io verbunden. Sie erhalten eine Lösung, die auf Ihre Arbeitsabläufe zugeschnitten ist — kein Template.",
          pl: "Budujemy niestandardową aplikację internetową dla Twojej firmy, w pełni połączoną z sevenlayers.io. Otrzymujesz rozwiązanie zaprojektowane wokół Twoich procesów — nie szablon.",
          es: "Construimos una aplicación web personalizada para su negocio, completamente conectada a sevenlayers.io. Obtiene una solución diseñada en torno a sus flujos de trabajo, no una plantilla.",
          fr: "Nous construisons une application web sur mesure pour votre entreprise, entièrement connectée à sevenlayers.io. Vous obtenez une solution conçue autour de vos flux de travail — pas un modèle.",
          ja: "sevenlayers.ioと完全に連携した、お客様のビジネス向けカスタムWebアプリケーションを構築します。テンプレートではなく、ワークフローに合わせた設計です。",
        }
      },
      {
        key: "ui.store.custom.feature1",
        values: {
          en: "Custom Design & Development",
          de: "Individuelles Design & Entwicklung",
          pl: "Niestandardowy projekt i rozwój",
          es: "Diseño y desarrollo personalizado",
          fr: "Design et développement personnalisés",
          ja: "カスタムデザインと開発",
        }
      },
      {
        key: "ui.store.custom.feature1_desc",
        values: {
          en: "Tailored to your brand and workflows",
          de: "Angepasst an Ihre Marke und Arbeitsabläufe",
          pl: "Dostosowane do Twojej marki i przepływów pracy",
          es: "Adaptado a su marca y flujos de trabajo",
          fr: "Adapté à votre marque et vos flux de travail",
          ja: "あなたのブランドとワークフローに合わせて調整",
        }
      },
      {
        key: "ui.store.custom.feature2",
        values: {
          en: "Full API Integration",
          de: "Vollständige API-Integration",
          pl: "Pełna integracja API",
          es: "Integración completa de API",
          fr: "Intégration API complète",
          ja: "完全なAPI統合",
        }
      },
      {
        key: "ui.store.custom.feature2_desc",
        values: {
          en: "Seamless connection to sevenlayers.io backend",
          de: "Nahtlose Verbindung zum sevenlayers.io-Backend",
          pl: "Bezproblemowe połączenie z backendem sevenlayers.io",
          es: "Conexión perfecta con el backend de sevenlayers.io",
          fr: "Connexion transparente au backend sevenlayers.io",
          ja: "sevenlayers.ioバックエンドへのシームレスな接続",
        }
      },
      {
        key: "ui.store.custom.feature3",
        values: {
          en: "Responsive & Modern",
          de: "Responsiv & Modern",
          pl: "Responsywne i nowoczesne",
          es: "Responsive y moderno",
          fr: "Responsive et moderne",
          ja: "レスポンシブでモダン",
        }
      },
      {
        key: "ui.store.custom.feature3_desc",
        values: {
          en: "Works perfectly on desktop, tablet, and mobile",
          de: "Funktioniert perfekt auf Desktop, Tablet und Mobilgerät",
          pl: "Działa perfekcyjnie na komputerze, tablecie i telefonie",
          es: "Funciona perfectamente en escritorio, tablet y móvil",
          fr: "Fonctionne parfaitement sur ordinateur, tablette et mobile",
          ja: "デスクトップ、タブレット、モバイルで完璧に動作",
        }
      },
      {
        key: "ui.store.custom.feature4",
        values: {
          en: "Ongoing Support",
          de: "Fortlaufender Support",
          pl: "Bieżące wsparcie",
          es: "Soporte continuo",
          fr: "Support continu",
          ja: "継続的なサポート",
        }
      },
      {
        key: "ui.store.custom.feature4_desc",
        values: {
          en: "Maintenance and updates included",
          de: "Wartung und Updates inklusive",
          pl: "Konserwacja i aktualizacje w zestawie",
          es: "Mantenimiento y actualizaciones incluidas",
          fr: "Maintenance et mises à jour incluses",
          ja: "メンテナンスとアップデートを含む",
        }
      },
      {
        key: "ui.store.custom.starting_at",
        values: {
          en: "Starting at",
          de: "Ab",
          pl: "Począwszy od",
          es: "A partir de",
          fr: "À partir de",
          ja: "から",
        }
      },
      {
        key: "ui.store.custom.one_time_fee",
        values: {
          en: "One-time project fee",
          de: "Einmalige Projektgebühr",
          pl: "Jednorazowa opłata za projekt",
          es: "Tarifa de proyecto única",
          fr: "Frais de projet uniques",
          ja: "1回限りのプロジェクト料金",
        }
      },
      {
        key: "ui.store.custom.cta",
        values: {
          en: "Tell us about your project — we'll send you a tailored quote.",
          de: "Erzählen Sie uns von Ihrem Projekt — wir senden Ihnen ein maßgeschneidertes Angebot.",
          pl: "Opowiedz nam o swoim projekcie — wyślemy Ci dostosowaną wycenę.",
          es: "Cuéntenos sobre su proyecto — le enviaremos un presupuesto personalizado.",
          fr: "Parlez-nous de votre projet — nous vous enverrons un devis sur mesure.",
          ja: "プロジェクトについてお聞かせください — カスタマイズされた見積もりをお送りします。",
        }
      },
      {
        key: "ui.store.commercial_architecture.title",
        values: {
          en: "Plans and pricing overview",
          de: "Pläne und Preisübersicht",
          pl: "Przegląd planów i cen",
          es: "Resumen de planes y precios",
          fr: "Aperçu des forfaits et tarifs",
          ja: "プランと料金の概要",
        }
      },
      {
        key: "ui.store.commercial_architecture.description",
        values: {
          en: "Setup fees, monthly platform fees, and consulting options are listed below. Existing Pro/Scale subscribers keep full access.",
          de: "Setup-Gebühren, monatliche Plattformgebühren und Beratungsoptionen sind unten aufgeführt. Bestehende Pro/Scale-Abonnenten behalten vollen Zugang.",
          pl: "Opłaty konfiguracyjne, miesięczne opłaty platformowe i opcje konsultingowe poniżej. Obecni subskrybenci Pro/Scale zachowują pełny dostęp.",
          es: "Las tarifas de configuración, tarifas mensuales y opciones de consultoría se enumeran a continuación. Los suscriptores existentes de Pro/Scale mantienen acceso completo.",
          fr: "Les frais d'installation, les frais mensuels de plateforme et les options de conseil sont listés ci-dessous. Les abonnés Pro/Scale existants conservent un accès complet.",
          ja: "セットアップ料金、月額プラットフォーム料金、コンサルティングオプションを以下に示します。既存のPro/Scaleサブスクライバーはフルアクセスを維持します。",
        }
      },
      {
        key: "ui.store.commercial_architecture.description_v2",
        values: {
          en: "Browse setup fees, monthly platform fees, and consulting options below. Existing Pro/Scale subscribers keep full access during the transition.",
          de: "Durchsuchen Sie unten Setup-Gebühren, monatliche Plattformgebühren und Beratungsoptionen. Bestehende Pro/Scale-Abonnenten behalten während der Umstellung vollen Zugang.",
          pl: "Przeglądaj opłaty konfiguracyjne, miesięczne opłaty platformowe i opcje konsultingowe poniżej. Obecni subskrybenci Pro/Scale zachowują pełny dostęp podczas przejścia.",
          es: "Consulte las tarifas de configuración, tarifas mensuales y opciones de consultoría a continuación. Los suscriptores existentes de Pro/Scale mantienen acceso completo durante la transición.",
          fr: "Parcourez ci-dessous les frais d'installation, les frais mensuels et les options de conseil. Les abonnés Pro/Scale existants conservent un accès complet pendant la transition.",
          ja: "以下のセットアップ料金、月額プラットフォーム料金、コンサルティングオプションをご覧ください。既存のPro/Scaleサブスクライバーは移行中もフルアクセスを維持します。",
        }
      },
      {
        key: "ui.store.commercial_architecture.coexistence_notice",
        values: {
          en: "Your existing billing and credit balances are safe. New customers start with a Free Diagnostic, Consulting Sprint (€3,500), or Implementation Start (€7,000+).",
          de: "Ihre bestehende Abrechnung und Guthaben sind sicher. Neukunden starten mit einer kostenlosen Diagnose, einem Consulting Sprint (3.500 €) oder einem Implementierungsstart (7.000 €+).",
          pl: "Twoje obecne rozliczenia i salda kredytów są bezpieczne. Nowi klienci zaczynają od bezpłatnej diagnozy, sprintu konsultingowego (3 500 €) lub startu wdrożenia (7 000 €+).",
          es: "Su facturación y saldos de créditos existentes están seguros. Los nuevos clientes comienzan con un diagnóstico gratuito, sprint de consultoría (3.500 €) o inicio de implementación (7.000 €+).",
          fr: "Votre facturation et vos soldes de crédits existants sont préservés. Les nouveaux clients commencent par un diagnostic gratuit, un sprint de conseil (3 500 €) ou un démarrage d'implémentation (7 000 €+).",
          ja: "既存の請求とクレジット残高は安全です。新規のお客様は、無料診断、コンサルティングスプリント（€3,500）、または実装開始（€7,000+）から始められます。",
        }
      },
      {
        key: "ui.store.commercial_architecture.coexistence_notice_v2",
        values: {
          en: "Your existing billing and credit balances are safe. New customers start with the options shown above.",
          de: "Ihre bestehende Abrechnung und Guthaben sind sicher. Neukunden starten mit den oben gezeigten Optionen.",
          pl: "Twoje obecne rozliczenia i salda kredytów są bezpieczne. Nowi klienci zaczynają od opcji pokazanych powyżej.",
          es: "Su facturación y saldos existentes están seguros. Los nuevos clientes comienzan con las opciones mostradas arriba.",
          fr: "Votre facturation et vos soldes existants sont préservés. Les nouveaux clients commencent avec les options ci-dessus.",
          ja: "既存の請求とクレジット残高は安全です。新規のお客様は上記のオプションから始められます。",
        }
      },
      {
        key: "ui.store.motion_contract.title_v2",
        values: {
          en: "How our pricing works",
          de: "So funktioniert unsere Preisgestaltung",
          pl: "Jak działa nasz cennik",
          es: "Cómo funciona nuestro precio",
          fr: "Comment fonctionne notre tarification",
          ja: "料金体系のご案内",
        }
      },
      {
        key: "ui.store.motion_contract.free_v2",
        values: {
          en: "Free Diagnostic — Explore the platform and see what's possible. No credit card needed.",
          de: "Kostenlose Diagnose — Erkunden Sie die Plattform und sehen Sie, was möglich ist. Keine Kreditkarte erforderlich.",
          pl: "Bezpłatna diagnoza — Poznaj platformę i sprawdź możliwości. Karta kredytowa nie jest wymagana.",
          es: "Diagnóstico gratuito — Explore la plataforma y vea lo que es posible. Sin tarjeta de crédito.",
          fr: "Diagnostic gratuit — Explorez la plateforme et découvrez les possibilités. Sans carte bancaire.",
          ja: "無料診断 — プラットフォームを探索し、可能性をご確認ください。クレジットカード不要。",
        }
      },
      {
        key: "ui.store.motion_contract.consult_v2",
        values: {
          en: "Consulting Sprint (€3,500) — Get a tailored strategy and project scope. Consulting only, no build work included.",
          de: "Consulting Sprint (3.500 €) — Erhalten Sie eine maßgeschneiderte Strategie und Projektumfang. Nur Beratung, keine Umsetzung enthalten.",
          pl: "Sprint konsultingowy (3 500 €) — Otrzymaj dostosowaną strategię i zakres projektu. Wyłącznie doradztwo, bez wdrożenia.",
          es: "Sprint de consultoría (3.500 €) — Obtenga una estrategia personalizada y alcance del proyecto. Solo consultoría, sin implementación.",
          fr: "Sprint de conseil (3 500 €) — Obtenez une stratégie sur mesure et un périmètre de projet. Conseil uniquement, sans développement.",
          ja: "コンサルティングスプリント（€3,500）— カスタマイズされた戦略とプロジェクト範囲を取得。コンサルティングのみ、構築作業は含まれません。",
        }
      },
      {
        key: "ui.store.motion_contract.implementation_v2",
        values: {
          en: "Implementation Start (from €7,000) — Launch your first production environment. Includes Layer 1 Foundation setup and above.",
          de: "Implementierungsstart (ab 7.000 €) — Starten Sie Ihre erste Produktionsumgebung. Enthält Layer 1 Foundation-Setup und höher.",
          pl: "Start wdrożenia (od 7 000 €) — Uruchom swoje pierwsze środowisko produkcyjne. Obejmuje konfigurację Layer 1 Foundation i wyżej.",
          es: "Inicio de implementación (desde 7.000 €) — Lance su primer entorno de producción. Incluye configuración Layer 1 Foundation y superior.",
          fr: "Démarrage d'implémentation (à partir de 7 000 €) — Lancez votre premier environnement de production. Inclut la configuration Layer 1 Foundation et au-delà.",
          ja: "実装開始（€7,000から）— 最初の本番環境を立ち上げ。Layer 1 Foundationセットアップ以上を含みます。",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.title_v2",
        values: {
          en: "Admin: previous plan visibility",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.description_v2",
        values: {
          en: "Show or hide the previous Pro/Scale plan cards for this workspace. Existing subscribers keep their current access.",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.reveal_v2",
        values: {
          en: "Show previous plan cards",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.hide_v2",
        values: {
          en: "Hide previous plan cards",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.updating_v2",
        values: {
          en: "Updating...",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.status_override_v2",
        values: {
          en: "Shown by admin",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.status_compatibility_v2",
        values: {
          en: "Shown for existing subscribers",
        }
      },
      {
        key: "ui.store.legacy_pricing_control.status_hidden_v2",
        values: {
          en: "Hidden from public view",
        }
      },
    ];

    let inserted = 0;
    let updated = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "ui",
            "store"
          );
          if (result.inserted) inserted++;
          if (result.updated) updated++;
        }
      }
    }

    console.log(`✅ Seeded store translations: ${inserted} inserted, ${updated} updated`);
    return { success: true, inserted, updated, totalKeys: translations.length };
  }
});
