/**
 * SEED STORE TRANSLATIONS
 *
 * Seeds translations for the Platform Store window
 *
 * Run: npx convex run translations/seedStore:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

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
          en: "l4yercak3 Store",
          de: "l4yercak3 Shop",
          pl: "Sklep l4yercak3",
          es: "Tienda l4yercak3",
          fr: "Boutique l4yercak3",
          ja: "l4yercak3 ストア",
        }
      },
      {
        key: "ui.store.subtitle",
        values: {
          en: "Platform services and subscriptions • Store prices are VAT-inclusive (EUR)",
          de: "Plattformdienste und Abonnements • Store-Preise sind inkl. MwSt. (EUR)",
          pl: "Usługi platformowe i subskrypcje • Ceny w sklepie zawierają VAT (EUR)",
          es: "Servicios y suscripciones de la plataforma • Los precios de la tienda incluyen IVA (EUR)",
          fr: "Services et abonnements de la plateforme • Les prix de la boutique incluent la TVA (EUR)",
          ja: "プラットフォームサービスとサブスクリプション • ストア価格はVAT込み（EUR）",
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
          en: "All 16 AI models with global routing for best performance",
          de: "Alle 16 KI-Modelle mit globalem Routing für beste Leistung",
          pl: "Wszystkie 16 modeli AI z globalnym routingiem dla najlepszej wydajności",
          es: "Todos los 16 modelos de IA con enrutamiento global para un mejor rendimiento",
          fr: "Tous les 16 modèles IA avec routage global pour les meilleures performances",
          ja: "最高のパフォーマンスを実現するグローバルルーティングを備えた全16のAIモデル",
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
          en: "Global routing",
          de: "Globales Routing",
          pl: "Globalny routing",
          es: "Enrutamiento global",
          fr: "Routage global",
          ja: "グローバルルーティング",
        }
      },
      {
        key: "ui.store.ai.standard.feature4",
        values: {
          en: "Best performance",
          de: "Beste Leistung",
          pl: "Najlepsza wydajność",
          es: "Mejor rendimiento",
          fr: "Meilleures performances",
          ja: "最高のパフォーマンス",
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
          en: "GDPR-compliant AI with zero data retention",
          de: "DSGVO-konforme KI ohne Datenspeicherung",
          pl: "AI zgodny z RODO bez przechowywania danych",
          es: "IA compatible con GDPR sin retención de datos",
          fr: "IA conforme au RGPD sans rétention de données",
          ja: "データ保持なしのGDPR準拠AI",
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
          en: "Self-hosted AI with scale-to-zero compute",
          de: "Selbst gehostete KI mit Scale-to-Zero-Computing",
          pl: "Samodzielnie hostowane AI z obliczeniami skalującymi do zera",
          es: "IA autohospedada con computación de escalado a cero",
          fr: "IA auto-hébergée avec calcul évolutif à zéro",
          ja: "ゼロまでスケールするセルフホストAI",
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
          en: "Scale-to-zero compute",
          de: "Scale-to-Zero-Computing",
          pl: "Obliczenia skalujące do zera",
          es: "Computación de escalado a cero",
          fr: "Calcul évolutif à zéro",
          ja: "ゼロまでスケール",
        }
      },
      {
        key: "ui.store.private_llm.starter.feature4",
        values: {
          en: "Full data sovereignty",
          de: "Vollständige Datensouveränität",
          pl: "Pełna suwerenność danych",
          es: "Soberanía completa de datos",
          fr: "Souveraineté complète des données",
          ja: "完全なデータ主権",
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
          en: "Dedicated GPU infrastructure with 99.5% SLA",
          de: "Dedizierte GPU-Infrastruktur mit 99,5% SLA",
          pl: "Dedykowana infrastruktura GPU z 99,5% SLA",
          es: "Infraestructura GPU dedicada con 99.5% SLA",
          fr: "Infrastructure GPU dédiée avec 99,5% SLA",
          ja: "99.5% SLA付き専用GPUインフラ",
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
          en: "Custom infrastructure with unlimited requests",
          de: "Individuelle Infrastruktur mit unbegrenzten Anfragen",
          pl: "Niestandardowa infrastruktura z nieograniczonymi zapytaniami",
          es: "Infraestructura personalizada con solicitudes ilimitadas",
          fr: "Infrastructure personnalisée avec requêtes illimitées",
          ja: "無制限リクエストのカスタムインフラ",
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
          en: "Get a fully custom web application built specifically for your needs, connected to the l4yercak3 backend via API. Perfect for unique business requirements.",
          de: "Erhalten Sie eine vollständig maßgeschneiderte Webanwendung für Ihre spezifischen Anforderungen, verbunden mit dem l4yercak3-Backend über die API. Perfekt für einzigartige Geschäftsanforderungen.",
          pl: "Otrzymaj w pełni niestandardową aplikację internetową dostosowaną do Twoich potrzeb, połączoną z backendem l4yercak3 przez API. Idealne dla unikalnych wymagań biznesowych.",
          es: "Obtenga una aplicación web totalmente personalizada creada específicamente para sus necesidades, conectada al backend de l4yercak3 a través de API. Perfecta para requisitos comerciales únicos.",
          fr: "Obtenez une application web entièrement personnalisée conçue spécifiquement pour vos besoins, connectée au backend l4yercak3 via API. Parfait pour des exigences commerciales uniques.",
          ja: "l4yercak3バックエンドにAPI経由で接続された、あなたのニーズに特化した完全なカスタムWebアプリケーションを入手しましょう。独自のビジネス要件に最適です。",
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
          en: "Seamless connection to l4yercak3 backend",
          de: "Nahtlose Verbindung zum l4yercak3-Backend",
          pl: "Bezproblemowe połączenie z backendem l4yercak3",
          es: "Conexión perfecta con el backend de l4yercak3",
          fr: "Connexion transparente au backend l4yercak3",
          ja: "l4yercak3バックエンドへのシームレスな接続",
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
          en: "Let's discuss your project and create a custom quote",
          de: "Lassen Sie uns über Ihr Projekt sprechen und ein individuelles Angebot erstellen",
          pl: "Omówmy Twój projekt i stwórzmy indywidualną wycenę",
          es: "Hablemos de su proyecto y creemos un presupuesto personalizado",
          fr: "Discutons de votre projet et créons un devis personnalisé",
          ja: "あなたのプロジェクトについて話し、カスタム見積もりを作成しましょう",
        }
      },
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

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
            "ui",
            "store"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} store translations`);
    return { success: true, count, totalKeys: translations.length };
  }
});
