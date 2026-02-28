/**
 * SEED WELCOME WINDOW TRANSLATIONS
 *
 * Seeds translations for the welcome/landing window.
 * Run independently: npx convex run translations/seedWelcomeTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Welcome Window translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    // Define supported locales
    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    // Welcome window translations
    const translations = [
      {
        key: "ui.welcome.tagline",
        values: {
          en: "An AI employee that learns your business. Live in 15 minutes.",
          de: "Ein KI-Mitarbeiter, der dein Geschäft lernt. In 15 Minuten live.",
          pl: "Pracownik AI, który poznaje Twój biznes. Na żywo w 15 minut.",
          es: "Un empleado IA que aprende tu negocio. En vivo en 15 minutos.",
          fr: "Un employé IA qui apprend votre entreprise. En ligne en 15 minutes.",
          ja: "あなたのビジネスを学ぶAI従業員。15分でライブ。",
        }
      },
      {
        key: "ui.welcome.description_para1",
        values: {
          en: "Start a conversation with our agent. Tell it how your business works — through stories, not forms, not config screens. Fifteen minutes later, your customers are getting answers on WhatsApp, Telegram, or your website. 24/7.",
          de: "Starte ein Gespräch mit unserem Agenten. Erzähle ihm, wie dein Geschäft funktioniert — durch Geschichten, nicht Formulare, nicht Konfigurationsbildschirme. Fünfzehn Minuten später erhalten deine Kunden Antworten auf WhatsApp, Telegram oder deiner Website. 24/7.",
          pl: "Rozpocznij rozmowę z naszym agentem. Opowiedz mu, jak działa Twój biznes — przez historie, nie formularze, nie ekrany konfiguracji. Piętnaście minut później Twoi klienci dostają odpowiedzi na WhatsApp, Telegram lub Twojej stronie. 24/7.",
          es: "Inicia una conversación con nuestro agente. Cuéntale cómo funciona tu negocio — a través de historias, no formularios, no pantallas de configuración. Quince minutos después, tus clientes reciben respuestas en WhatsApp, Telegram o tu sitio web. 24/7.",
          fr: "Démarrez une conversation avec notre agent. Racontez-lui comment fonctionne votre entreprise — à travers des histoires, pas des formulaires, pas des écrans de configuration. Quinze minutes plus tard, vos clients obtiennent des réponses sur WhatsApp, Telegram ou votre site web. 24/7.",
          ja: "エージェントと会話を始めましょう。あなたのビジネスの仕組みを教えてください — フォームや設定画面ではなく、ストーリーで。15分後、顧客はWhatsApp、Telegram、またはあなたのウェブサイトで回答を得ています。24時間365日。",
        }
      },
      {
        key: "ui.welcome.description_para2",
        values: {
          en: "You don't need another dashboard. You don't need another tool to learn. You need an AI employee that handles the frontline, knows when to escalate, and never forgets who it works for.",
          de: "Du brauchst kein weiteres Dashboard. Du brauchst kein weiteres Tool zum Lernen. Du brauchst einen KI-Mitarbeiter, der die Frontline übernimmt, weiß wann er eskalieren muss und nie vergisst, für wen er arbeitet.",
          pl: "Nie potrzebujesz kolejnego dashboardu. Nie potrzebujesz kolejnego narzędzia do nauki. Potrzebujesz pracownika AI, który obsługuje pierwszą linię, wie kiedy eskalować i nigdy nie zapomina, dla kogo pracuje.",
          es: "No necesitas otro panel de control. No necesitas otra herramienta que aprender. Necesitas un empleado IA que maneje la primera línea, sepa cuándo escalar y nunca olvide para quién trabaja.",
          fr: "Vous n'avez pas besoin d'un autre tableau de bord. Vous n'avez pas besoin d'un autre outil à apprendre. Vous avez besoin d'un employé IA qui gère la première ligne, sait quand escalader et n'oublie jamais pour qui il travaille.",
          ja: "別のダッシュボードは必要ありません。新しいツールを学ぶ必要もありません。最前線を担当し、エスカレーションのタイミングを知り、誰のために働いているかを決して忘れないAI従業員が必要です。",
        }
      },
      {
        key: "ui.welcome.description_para3",
        values: {
          en: "No more losing customers to slow replies. No more answering the same 10 questions every day. Your agent handles it — so you can focus on the work that actually needs you.",
          de: "Keine Kunden mehr durch langsame Antworten verlieren. Nicht mehr jeden Tag die gleichen 10 Fragen beantworten. Dein Agent erledigt das — damit du dich auf die Arbeit konzentrieren kannst, die dich wirklich braucht.",
          pl: "Koniec z traceniem klientów przez wolne odpowiedzi. Koniec z odpowiadaniem na te same 10 pytań każdego dnia. Twój agent się tym zajmie — abyś mógł skupić się na pracy, która naprawdę Cię potrzebuje.",
          es: "No más perder clientes por respuestas lentas. No más responder las mismas 10 preguntas cada día. Tu agente se encarga — para que puedas enfocarte en el trabajo que realmente te necesita.",
          fr: "Fini de perdre des clients à cause de réponses lentes. Fini de répondre aux mêmes 10 questions chaque jour. Votre agent s'en charge — pour que vous puissiez vous concentrer sur le travail qui a vraiment besoin de vous.",
          ja: "返信が遅くて顧客を失うことはもうありません。毎日同じ10の質問に答える必要もありません。エージェントが対応します — あなたは本当に必要な仕事に集中できます。",
        }
      },
      {
        key: "ui.welcome.cta",
        values: {
          en: "Deploy your first agent today",
          de: "Setze noch heute deinen ersten Agenten ein",
          pl: "Wdróż swojego pierwszego agenta już dziś",
          es: "Despliega tu primer agente hoy",
          fr: "Déployez votre premier agent aujourd'hui",
          ja: "今日、最初のエージェントをデプロイしよう",
        }
      },
      {
        key: "ui.welcome.v2.tagline",
        values: {
          en: "Voice-first agent setup with deploy handoff in about 15 minutes.",
        },
      },
      {
        key: "ui.welcome.v2.description_para1",
        values: {
          en: "Start in Talk mode for voice-first setup, or switch to Type mode at any step. The first-run flow keeps both paths in sync.",
        },
      },
      {
        key: "ui.welcome.v2.description_para2",
        values: {
          en: "Capture your agent mission, trust checkpoints, and channel guardrails in one guided pass without opening separate configuration tools.",
        },
      },
      {
        key: "ui.welcome.v2.description_para3",
        values: {
          en: "After calibration, deployment handoff appears immediately with choices for Webchat, Telegram, or Both so launch momentum is not lost.",
        },
      },
      {
        key: "ui.welcome.v2.cta",
        values: {
          en: "Create my agent now",
        },
      },
      {
        key: "ui.welcome.first_run_path",
        values: {
          en: "First-run path: Talk or Type -> Soul-binding completion -> Deploy to Webchat / Telegram / Both.",
        },
      },
      {
        key: "ui.welcome.footer",
        values: {
          en: "Built for business · Agents that earn trust",
          de: "Für Unternehmen gebaut · Agenten, die Vertrauen gewinnen",
          pl: "Stworzone dla biznesu · Agenci, którzy zdobywają zaufanie",
          es: "Hecho para negocios · Agentes que generan confianza",
          fr: "Conçu pour les entreprises · Des agents qui gagnent la confiance",
          ja: "ビジネスのために構築 · 信頼を勝ち取るエージェント",
        }
      },
      {
        key: "ui.welcome.footer_startup",
        values: {
          en: "l4yercak3 is a vc83-W26 startup",
          de: "l4yercak3 ist ein vc83-W26 Startup",
          pl: "l4yercak3 to startup vc83-W26",
          es: "l4yercak3 es una startup de vc83-W26",
          fr: "l4yercak3 est une startup vc83-W26",
          ja: "l4yercak3はvc83-W26のスタートアップです",
        }
      },
    ];

    // Upsert translations (insert new, update existing)
    let insertedCount = 0;
    let updatedCount = 0;

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
            "welcome"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Welcome Window translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  }
});
