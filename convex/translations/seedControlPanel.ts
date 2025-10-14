/**
 * SEED CONTROL PANEL TRANSLATIONS
 *
 * Seeds translations for:
 * - Control Panel window
 * - Control panel items
 *
 * Run: npx convex run translations/seedControlPanel:seed
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Control Panel translations...");

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
      // === MAIN WINDOW ===
      {
        key: "ui.controlpanel.description",
        values: {
          en: "Use the settings in Control Panel to personalize your workspace.",
          de: "Verwende die Einstellungen in der Systemsteuerung, um deinen Arbeitsbereich anzupassen.",
          pl: "Użyj ustawień w Panelu sterowania, aby spersonalizować swój obszar roboczy.",
          es: "Usa la configuración del Panel de control para personalizar tu espacio de trabajo.",
          fr: "Utilisez les paramètres du Panneau de configuration pour personnaliser votre espace de travail.",
          ja: "コントロールパネルの設定を使用してワークスペースをカスタマイズします。",
        }
      },
      {
        key: "ui.controlpanel.super_admin_mode",
        values: {
          en: "SUPER ADMIN MODE",
          de: "SUPER ADMIN MODUS",
          pl: "TRYB SUPER ADMINISTRATORA",
          es: "MODO SUPER ADMINISTRADOR",
          fr: "MODE SUPER ADMINISTRATEUR",
          ja: "スーパー管理者モード",
        }
      },

      // === CONTROL PANEL ITEMS ===
      {
        key: "ui.controlpanel.item.desktop",
        values: {
          en: "Desktop",
          de: "Desktop",
          pl: "Pulpit",
          es: "Escritorio",
          fr: "Bureau",
          ja: "デスクトップ",
        }
      },
      {
        key: "ui.controlpanel.item.manage",
        values: {
          en: "Manage",
          de: "Verwalten",
          pl: "Zarządzaj",
          es: "Gestionar",
          fr: "Gérer",
          ja: "管理",
        }
      },
      {
        key: "ui.controlpanel.item.translations",
        values: {
          en: "Translations",
          de: "Übersetzungen",
          pl: "Tłumaczenia",
          es: "Traducciones",
          fr: "Traductions",
          ja: "翻訳",
        }
      },
      {
        key: "ui.controlpanel.item.system_organizations",
        values: {
          en: "System Organizations",
          de: "Systemorganisationen",
          pl: "Organizacje systemowe",
          es: "Organizaciones del sistema",
          fr: "Organisations système",
          ja: "システム組織",
        }
      },
      {
        key: "ui.controlpanel.item.ontology",
        values: {
          en: "Ontology",
          de: "Ontologie",
          pl: "Ontologia",
          es: "Ontología",
          fr: "Ontologie",
          ja: "オントロジー",
        }
      },
    ];

    // Load ALL existing translations once (optimized!)
    const existingTranslations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    // Create lookup set for fast duplicate checking
    const existingKeys = new Set(
      existingTranslations.map(t => `${t.name}:${t.locale}`)
    );

    // Seed translations
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const lookupKey = `${trans.key}:${locale.code}`;

          // Check if translation already exists using our Set
          if (!existingKeys.has(lookupKey)) {
            await ctx.db.insert("objects", {
              organizationId: systemOrg._id,
              type: "translation",
              subtype: "ui",
              name: trans.key,
              value: value,
              locale: locale.code,
              status: "approved",
              customProperties: {
                category: "control-panel",
                component: "control-panel-window",
              },
              createdBy: systemUser._id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Control Panel translations`);
    return { success: true, count };
  }
});
