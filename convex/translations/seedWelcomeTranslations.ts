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
          en: "Where creativity meets technology to redefine what's possible",
          de: "Wo Kreativität auf Technologie trifft, um das Mögliche neu zu definieren",
          pl: "Gdzie kreatywność spotyka technologię, aby na nowo zdefiniować możliwości",
          es: "Donde la creatividad se encuentra con la tecnología para redefinir lo posible",
          fr: "Où la créativité rencontre la technologie pour redéfinir le possible",
          ja: "創造性とテクノロジーが出会い、可能性を再定義する場所",
        }
      },
      {
        key: "ui.welcome.description_para1",
        values: {
          en: "Step into a workspace that bridges the nostalgic charm of 1983 with cutting-edge business tools. Your entire workflow—CRM, analytics, invoicing, scheduling—lives in one beautifully retro desktop environment.",
          de: "Tritt ein in einen Arbeitsbereich, der den nostalgischen Charme von 1983 mit modernsten Business-Tools verbindet. Dein gesamter Workflow – CRM, Analytics, Rechnungsstellung, Terminplanung – lebt in einer wunderschön retro Desktop-Umgebung.",
          pl: "Wejdź do przestrzeni roboczej, która łączy nostalgiczny urok 1983 roku z najnowocześniejszymi narzędziami biznesowymi. Cały twój przepływ pracy – CRM, analityka, fakturowanie, planowanie – w jednym pięknie retro środowisku pulpitu.",
          es: "Entra en un espacio de trabajo que une el encanto nostálgico de 1983 con herramientas empresariales de vanguardia. Todo tu flujo de trabajo—CRM, analíticas, facturación, programación—vive en un entorno de escritorio bellamente retro.",
          fr: "Entrez dans un espace de travail qui allie le charme nostalgique de 1983 aux outils professionnels de pointe. L'ensemble de votre flux de travail—CRM, analytique, facturation, planification—vit dans un environnement de bureau magnifiquement rétro.",
          ja: "1983年の懐かしい魅力と最先端のビジネスツールを融合したワークスペースへようこそ。CRM、分析、請求、スケジューリングなど、すべてのワークフローが美しいレトロなデスクトップ環境で完結します。",
        }
      },
      {
        key: "ui.welcome.description_para2",
        values: {
          en: "We stand at the forefront of a new era, transforming how startups manage their operations. No more scattered tabs and forgotten passwords—just the focused power of an integrated desktop OS.",
          de: "Wir stehen an der Spitze einer neuen Ära und transformieren, wie Startups ihre Abläufe managen. Keine verstreuten Tabs und vergessenen Passwörter mehr – nur die fokussierte Power eines integrierten Desktop-OS.",
          pl: "Stoimy na czele nowej ery, transformując sposób, w jaki startupy zarządzają swoimi operacjami. Koniec z rozproszonymi kartami i zapomnianymi hasłami – tylko skoncentrowana moc zintegrowanego systemu operacyjnego.",
          es: "Estamos a la vanguardia de una nueva era, transformando cómo las startups gestionan sus operaciones. No más pestañas dispersas y contraseñas olvidadas—solo el poder enfocado de un sistema operativo de escritorio integrado.",
          fr: "Nous sommes à l'avant-garde d'une nouvelle ère, transformant la façon dont les startups gèrent leurs opérations. Fini les onglets dispersés et les mots de passe oubliés—juste la puissance concentrée d'un OS de bureau intégré.",
          ja: "私たちは新時代の最前線に立ち、スタートアップの運営方法を変革しています。散らばったタブや忘れたパスワードはもう必要ありません—統合デスクトップOSの集中的なパワーだけです。",
        }
      },
      {
        key: "ui.welcome.greeting",
        values: {
          en: "Welcome to the future of startup operations",
          de: "Willkommen in der Zukunft des Startup-Betriebs",
          pl: "Witamy w przyszłości operacji startupowych",
          es: "Bienvenido al futuro de las operaciones de startup",
          fr: "Bienvenue dans l'avenir des opérations de startup",
          ja: "スタートアップ運営の未来へようこそ",
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
