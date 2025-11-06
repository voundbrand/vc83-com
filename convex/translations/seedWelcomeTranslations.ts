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
          en: "Stack your startup tools like a pro",
          de: "Stapel deine Startup-Tools wie ein Profi",
          pl: "Ułóż narzędzia startupowe jak profesjonalista",
          es: "Apila tus herramientas de startup como un profesional",
          fr: "Empilez vos outils de startup comme un pro",
          ja: "スタートアップツールをプロのように積み重ねる",
        }
      },
      {
        key: "ui.welcome.description_para1",
        values: {
          en: "Imagine a retro desktop where you stack marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.",
          de: "Stell dir einen Retro-Desktop vor, auf dem du Marketing-Superkräfte stapelst: Rechnungen, die sich mit deinem CRM synchronisieren, Analysen, die deine Funnels visualisieren, Terminplanung, die deine Workflows automatisiert – alles in einem gemütlichen Arbeitsbereich.",
          pl: "Wyobraź sobie retro pulpit, na którym układasz marketingowe supermoce: fakturowanie zsynchronizowane z CRM, analizy wizualizujące lejki sprzedażowe, planowanie automatyzujące przepływy pracy—wszystko w jednym przytulnym obszarze roboczym.",
          es: "Imagina un escritorio retro donde apilas superpoderes de marketing: facturación sincronizada con tu CRM, análisis que visualizan tus embudos, programación que automatiza tus flujos de trabajo, todo en un espacio acogedor.",
          fr: "Imaginez un bureau rétro où vous empilez des superpouvoirs marketing : facturation synchronisée avec votre CRM, analyses visualisant vos entonnoirs, planification automatisant vos flux de travail—le tout dans un espace confortable.",
          ja: "レトロなデスクトップを想像してください。そこではマーケティングのスーパーパワーを積み重ねます：CRMと同期する請求書、ファネルを可視化する分析、ワークフローを自動化するスケジューリング—すべてが快適なワークスペースに。",
        }
      },
      {
        key: "ui.welcome.description_para2",
        values: {
          en: "No more tab chaos. Just you, your tools, and the satisfying click of a floppy disk saving your next big idea.",
          de: "Kein Tab-Chaos mehr. Nur du, deine Tools und das befriedigende Klicken einer Diskette, die deine nächste große Idee speichert.",
          pl: "Koniec z chaosem kart. Tylko ty, twoje narzędzia i satysfakcjonujące kliknięcie dyskietki zapisującej twój kolejny wielki pomysł.",
          es: "No más caos de pestañas. Solo tú, tus herramientas y el satisfactorio clic de un disquete guardando tu próxima gran idea.",
          fr: "Fini le chaos des onglets. Juste vous, vos outils, et le clic satisfaisant d'une disquette sauvegardant votre prochaine grande idée.",
          ja: "タブの混乱はもうありません。あなたとツール、そして次の大きなアイデアを保存するフロッピーディスクの心地よいクリック音だけです。",
        }
      },
      {
        key: "ui.welcome.greeting",
        values: {
          en: "Welcome to the retro desktop experience!",
          de: "Willkommen beim Retro-Desktop-Erlebnis!",
          pl: "Witamy w retro doświadczeniu pulpitu!",
          es: "¡Bienvenido a la experiencia de escritorio retro!",
          fr: "Bienvenue dans l'expérience de bureau rétro !",
          ja: "レトロなデスクトップ体験へようこそ！",
        }
      },
      {
        key: "ui.welcome.footer",
        values: {
          en: "Made for startups • Inspired by the 90s",
          de: "Gemacht für Startups • Inspiriert von den 90ern",
          pl: "Stworzone dla startupów • Inspirowane latami 90.",
          es: "Hecho para startups • Inspirado en los 90",
          fr: "Fait pour les startups • Inspiré par les années 90",
          ja: "スタートアップのために作られた • 90年代に触発された",
        }
      },
      {
        key: "ui.welcome.footer_startup",
        values: {
          en: "L4YERCAK3 is a vc83-W26 startup",
          de: "L4YERCAK3 ist ein vc83-W26 Startup",
          pl: "L4YERCAK3 to startup vc83-W26",
          es: "L4YERCAK3 es una startup de vc83-W26",
          fr: "L4YERCAK3 est une startup vc83-W26",
          ja: "L4YERCAK3はvc83-W26のスタートアップです",
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
