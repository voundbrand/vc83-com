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
          en: "Deploy AI employees for your clients. Get paid while they work.",
          de: "Setze KI-Mitarbeiter für deine Kunden ein. Werde bezahlt, während sie arbeiten.",
          pl: "Wdrażaj pracowników AI dla swoich klientów. Zarabiaj, gdy oni pracują.",
          es: "Despliega empleados IA para tus clientes. Cobra mientras ellos trabajan.",
          fr: "Déployez des employés IA pour vos clients. Soyez payé pendant qu'ils travaillent.",
          ja: "クライアント向けにAI従業員を導入。彼らが働く間、報酬を得よう。",
        }
      },
      {
        key: "ui.welcome.description_para1",
        values: {
          en: "Start a conversation with our agent. It learns your client's business through stories — not forms, not config screens. Fifteen minutes later, their customers are getting answers on WhatsApp, Telegram, or web. 24/7. Under your brand.",
          de: "Starte ein Gespräch mit unserem Agenten. Er lernt das Geschäft deines Kunden durch Geschichten — keine Formulare, keine Konfigurationsbildschirme. Fünfzehn Minuten später erhalten deren Kunden Antworten auf WhatsApp, Telegram oder im Web. 24/7. Unter deiner Marke.",
          pl: "Rozpocznij rozmowę z naszym agentem. Poznaje biznes Twojego klienta przez historie — nie formularze, nie ekrany konfiguracji. Piętnaście minut później ich klienci dostają odpowiedzi na WhatsApp, Telegram lub w sieci. 24/7. Pod Twoją marką.",
          es: "Inicia una conversación con nuestro agente. Aprende el negocio de tu cliente a través de historias — sin formularios, sin pantallas de configuración. Quince minutos después, sus clientes reciben respuestas en WhatsApp, Telegram o web. 24/7. Bajo tu marca.",
          fr: "Démarrez une conversation avec notre agent. Il apprend le business de votre client à travers des histoires — pas de formulaires, pas d'écrans de configuration. Quinze minutes plus tard, leurs clients obtiennent des réponses sur WhatsApp, Telegram ou le web. 24/7. Sous votre marque.",
          ja: "エージェントと会話を始めましょう。フォームや設定画面ではなく、ストーリーを通じてクライアントのビジネスを学びます。15分後、顧客はWhatsApp、Telegram、Webで回答を得ています。24時間365日。あなたのブランドで。",
        }
      },
      {
        key: "ui.welcome.description_para2",
        values: {
          en: "You don't need another dashboard. You don't need another tool to learn. You need an AI employee that handles the frontline, knows when to escalate, and never forgets who the business is.",
          de: "Du brauchst kein weiteres Dashboard. Du brauchst kein weiteres Tool zum Lernen. Du brauchst einen KI-Mitarbeiter, der die Frontline übernimmt, weiß wann er eskalieren muss und nie vergisst, wer das Unternehmen ist.",
          pl: "Nie potrzebujesz kolejnego dashboardu. Nie potrzebujesz kolejnego narzędzia do nauki. Potrzebujesz pracownika AI, który obsługuje pierwszą linię, wie kiedy eskalować i nigdy nie zapomina, kim jest firma.",
          es: "No necesitas otro panel de control. No necesitas otra herramienta que aprender. Necesitas un empleado IA que maneje la primera línea, sepa cuándo escalar y nunca olvide quién es el negocio.",
          fr: "Vous n'avez pas besoin d'un autre tableau de bord. Vous n'avez pas besoin d'un autre outil à apprendre. Vous avez besoin d'un employé IA qui gère la première ligne, sait quand escalader et n'oublie jamais qui est l'entreprise.",
          ja: "別のダッシュボードは必要ありません。新しいツールを学ぶ必要もありません。最前線を担当し、エスカレーションのタイミングを知り、ビジネスの本質を決して忘れないAI従業員が必要です。",
        }
      },
      {
        key: "ui.welcome.description_para3",
        values: {
          en: "You set the price. They pay monthly. You keep the margin.",
          de: "Du bestimmst den Preis. Sie zahlen monatlich. Du behältst die Marge.",
          pl: "Ty ustalasz cenę. Oni płacą miesięcznie. Ty zatrzymujesz marżę.",
          es: "Tú fijas el precio. Ellos pagan mensualmente. Tú te quedas con el margen.",
          fr: "Vous fixez le prix. Ils paient mensuellement. Vous gardez la marge.",
          ja: "価格はあなたが決める。顧客は月額で支払う。マージンはあなたのもの。",
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
        key: "ui.welcome.footer",
        values: {
          en: "Built for agencies · Agents that earn trust",
          de: "Für Agenturen gebaut · Agenten, die Vertrauen gewinnen",
          pl: "Stworzone dla agencji · Agenci, którzy zdobywają zaufanie",
          es: "Hecho para agencias · Agentes que generan confianza",
          fr: "Conçu pour les agences · Des agents qui gagnent la confiance",
          ja: "エージェンシーのために構築 · 信頼を勝ち取るエージェント",
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
