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
          en: "Private AI. You can Trust.",
          de: "Private KI. Der Sie vertrauen k\u00f6nnen.",
          pl: "Prywatna AI. Kt\u00f3rej mo\u017cesz zaufa\u0107.",
          es: "IA privada. En la que puedes confiar.",
          fr: "IA priv\u00e9e. En qui vous pouvez avoir confiance.",
          ja: "\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8AI\u3002\u4fe1\u983c\u3067\u304d\u308b\u3002",
        },
      },
      {
        key: "ui.welcome.v2.description_para1",
        values: {
          en: "You already know you are the bottleneck. Not because you manage poorly \u2014 because the work that matters most still lives in your head. Context, judgment, the decisions no hire has ever fully absorbed.",
          de: "Sie wissen bereits, dass Sie der Engpass sind. Nicht weil Sie schlecht f\u00fchren \u2014 sondern weil die wichtigste Arbeit immer noch in Ihrem Kopf lebt. Kontext, Urteilsverm\u00f6gen, Entscheidungen, die kein Mitarbeiter je vollst\u00e4ndig aufnehmen konnte.",
          pl: "Ju\u017c wiesz, \u017ce jeste\u015b w\u0105skim gard\u0142em. Nie dlatego, \u017ce \u017ale zarz\u0105dzasz \u2014 bo najwa\u017cniejsza praca wci\u0105\u017c \u017cyje w Twojej g\u0142owie. Kontekst, os\u0105d, decyzje, kt\u00f3rych \u017caden pracownik nigdy w pe\u0142ni nie przyswoi\u0142.",
          es: "Ya sabes que eres el cuello de botella. No porque gestiones mal \u2014 sino porque el trabajo que m\u00e1s importa sigue viviendo en tu cabeza. Contexto, criterio, las decisiones que ning\u00fan empleado ha absorbido por completo.",
          fr: "Vous savez d\u00e9j\u00e0 que vous \u00eates le goulet d'\u00e9tranglement. Pas parce que vous g\u00e9rez mal \u2014 parce que le travail qui compte le plus vit encore dans votre t\u00eate. Le contexte, le jugement, les d\u00e9cisions qu'aucun employ\u00e9 n'a jamais pleinement absorb\u00e9es.",
          ja: "\u3042\u306a\u305f\u304c\u30dc\u30c8\u30eb\u30cd\u30c3\u30af\u3060\u3068\u3044\u3046\u3053\u3068\u306f\u3001\u3082\u3046\u308f\u304b\u3063\u3066\u3044\u308b\u306f\u305a\u3067\u3059\u3002\u7d4c\u55b6\u304c\u4e0b\u624b\u3060\u304b\u3089\u3067\u306f\u306a\u304f\u2014\u2014\u6700\u3082\u91cd\u8981\u306a\u4ed5\u4e8b\u304c\u307e\u3060\u3042\u306a\u305f\u306e\u982d\u306e\u4e2d\u306b\u3042\u308b\u304b\u3089\u3067\u3059\u3002\u6587\u8108\u3001\u5224\u65ad\u3001\u8ab0\u3082\u5b8c\u5168\u306b\u306f\u5438\u53ce\u3067\u304d\u306a\u304b\u3063\u305f\u610f\u601d\u6c7a\u5b9a\u3002",
        },
      },
      {
        key: "ui.welcome.v2.description_para2",
        values: {
          en: "One operator. Yours alone. Built on your business, your clients, and your way of working. It starts with a single briefing conversation and goes live within seven days.",
          de: "Ein Operator. Nur f\u00fcr Sie. Aufgebaut auf Ihrem Gesch\u00e4ft, Ihren Kunden und Ihrer Arbeitsweise. Es beginnt mit einem einzigen Briefing-Gespr\u00e4ch und geht innerhalb von sieben Tagen live.",
          pl: "Jeden operator. Tylko Tw\u00f3j. Zbudowany na Twoim biznesie, Twoich klientach i Twoim sposobie pracy. Zaczyna si\u0119 od jednej rozmowy briefingowej i rusza w ci\u0105gu siedmiu dni.",
          es: "Un operador. Solo tuyo. Construido sobre tu negocio, tus clientes y tu forma de trabajar. Comienza con una sola conversaci\u00f3n de briefing y entra en funcionamiento en siete d\u00edas.",
          fr: "Un op\u00e9rateur. Le v\u00f4tre seul. Construit sur votre entreprise, vos clients et votre fa\u00e7on de travailler. Tout commence par une seule conversation de briefing et entre en service sous sept jours.",
          ja: "\u4e00\u4eba\u306e\u30aa\u30da\u30ec\u30fc\u30bf\u30fc\u3002\u3042\u306a\u305f\u5c02\u7528\u3002\u3042\u306a\u305f\u306e\u30d3\u30b8\u30cd\u30b9\u3001\u9867\u5ba2\u3001\u50cd\u304d\u65b9\u306b\u57fa\u3065\u3044\u3066\u69cb\u7bc9\u3002\u4e00\u56de\u306e\u30d6\u30ea\u30fc\u30d5\u30a3\u30f3\u30b0\u4f1a\u8a71\u304b\u3089\u59cb\u307e\u308a\u30017\u65e5\u4ee5\u5185\u306b\u7a3c\u50cd\u3057\u307e\u3059\u3002",
        },
      },
      {
        key: "ui.welcome.v2.description_para3",
        values: {
          en: "Monthly. No lock-in. If it does not earn its seat, cancel. C-suite leverage at a fraction of the payroll.",
          de: "Monatlich. Keine Bindung. Wenn es seinen Platz nicht verdient, k\u00fcndigen. C-Suite-Hebel zu einem Bruchteil der Gehaltskosten.",
          pl: "Miesi\u0119cznie. Bez zobowi\u0105za\u0144. Je\u015bli nie zasługuje na swoje miejsce, zrezygnuj. D\u017awignia na poziomie zarz\u0105du za u\u0142amek koszt\u00f3w.",
          es: "Mensual. Sin permanencia. Si no se gana su lugar, cancela. Apalancamiento de nivel directivo a una fracci\u00f3n del coste salarial.",
          fr: "Mensuel. Sans engagement. S'il ne m\u00e9rite pas sa place, r\u00e9siliez. Un levier de direction g\u00e9n\u00e9rale pour une fraction de la masse salariale.",
          ja: "\u6708\u984d\u5236\u3002\u7e1b\u308a\u306a\u3057\u3002\u305d\u306e\u4fa1\u5024\u304c\u306a\u3051\u308c\u3070\u89e3\u7d04\u3002\u7d4c\u55b6\u5e79\u90e8\u306e\u30ec\u30d0\u30ec\u30c3\u30b8\u3092\u3001\u4eba\u4ef6\u8cbb\u306e\u307b\u3093\u306e\u4e00\u90e8\u3067\u3002",
        },
      },
      {
        key: "ui.welcome.v2.cta",
        values: {
          en: "Start the briefing",
          de: "Briefing starten",
          pl: "Rozpocznij briefing",
          es: "Iniciar el briefing",
          fr: "Commencer le briefing",
          ja: "\u30d6\u30ea\u30fc\u30d5\u30a3\u30f3\u30b0\u3092\u59cb\u3081\u308b",
        },
      },
      {
        key: "ui.welcome.first_run_path",
        values: {
          en: "The first hire that actually compounds.",
          de: "Die erste Einstellung, die sich tats\u00e4chlich potenziert.",
          pl: "Pierwszy pracownik, kt\u00f3ry naprawd\u0119 si\u0119 kumuluje.",
          es: "La primera contrataci\u00f3n que realmente se multiplica.",
          fr: "La premi\u00e8re embauche qui se compose vraiment.",
          ja: "\u672c\u5f53\u306b\u8907\u5229\u3067\u6210\u9577\u3059\u308b\u3001\u6700\u521d\u306e\u63a1\u7528\u3002",
        },
      },
      {
        key: "ui.welcome.footer",
        values: {
          en: "Built for owners running \u20ac1M\u2013\u20ac50M companies.",
          de: "F\u00fcr Unternehmer mit \u20ac1M\u2013\u20ac50M Umsatz.",
          pl: "Dla w\u0142a\u015bcicieli firm o obrotach \u20ac1M\u2013\u20ac50M.",
          es: "Para due\u00f1os de empresas de \u20ac1M\u2013\u20ac50M.",
          fr: "Con\u00e7u pour les dirigeants d'entreprises de 1M\u20ac\u20132650M\u20ac.",
          ja: "\u20ac1M\u301c\u20ac50M\u898f\u6a21\u306e\u4f01\u696d\u30aa\u30fc\u30ca\u30fc\u306e\u305f\u3081\u306b\u69cb\u7bc9\u3002",
        }
      },
      {
        key: "ui.welcome.footer_startup",
        values: {
          en: "sevenlayers.io is a vc83-W26 startup",
          de: "sevenlayers.io ist ein vc83-W26 Startup",
          pl: "sevenlayers.io to startup vc83-W26",
          es: "sevenlayers.io es una startup de vc83-W26",
          fr: "sevenlayers.io est une startup vc83-W26",
          ja: "sevenlayers.ioはvc83-W26のスタートアップです",
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
