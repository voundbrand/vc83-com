/**
 * FORMS RESPONSES TRANSLATIONS - GERMAN
 *
 * German translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (DE)...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found");
    }

    const translations = [
      { key: "ui.forms.responses.select_form", value: "Formular auswählen um Antworten anzuzeigen" },
      { key: "ui.forms.responses.no_responses", value: "Noch keine Formularantworten" },
      { key: "ui.forms.responses.no_responses_hint", value: "Antworten werden hier angezeigt sobald Formulare eingereicht werden" },
      { key: "ui.forms.responses.response_singular", value: "Antwort" },
      { key: "ui.forms.responses.response_plural", value: "Antworten" },
      { key: "ui.forms.responses.back_to_forms", value: "Zurück zu Formularen" },
      { key: "ui.forms.responses.export_csv", value: "CSV Exportieren" },
      { key: "ui.forms.responses.export_csv_coming_soon", value: "CSV-Export demnächst verfügbar" },
      { key: "ui.forms.responses.search_placeholder", value: "Antworten durchsuchen..." },
      { key: "ui.forms.responses.no_matches", value: "Keine Antworten entsprechen Ihrer Suche" },
      { key: "ui.forms.responses.anonymous", value: "Anonym" },
      { key: "ui.forms.responses.public", value: "Öffentlich" },
      { key: "ui.forms.responses.unknown_time", value: "Unbekannte Zeit" },
      { key: "ui.forms.responses.view", value: "Ansehen" },
      { key: "ui.forms.responses.response_details", value: "Antwortdetails" },
      { key: "ui.forms.responses.submission_info", value: "Übermittlungsinformationen" },
      { key: "ui.forms.responses.submitted", value: "Eingereicht" },
      { key: "ui.forms.responses.type", value: "Typ" },
      { key: "ui.forms.responses.public_submission", value: "Öffentliche Übermittlung" },
      { key: "ui.forms.responses.authenticated", value: "Authentifiziert" },
      { key: "ui.forms.responses.ip_address", value: "IP-Adresse" },
      { key: "ui.forms.responses.form_data", value: "Formulardaten" },
      { key: "ui.forms.responses.close", value: "Schließen" },
    ];

    let created = 0;
    const existingKeys = new Set<string>(); // Not used, but required for function signature

    for (const t of translations) {
      const inserted = await insertTranslationIfNew(
        ctx.db,
        existingKeys,
        systemOrg._id,
        systemUser._id,
        t.key,
        t.value,
        "de",
        "forms",
        "responses-tab"
      );
      if (inserted) created++;
    }

    console.log(`✅ DE translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
