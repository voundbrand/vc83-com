/**
 * FORMS RESPONSES TRANSLATIONS - GERMAN
 *
 * German translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (DE)...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
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
    for (const t of translations) {
      const existing = await ctx.db
        .query("objects")
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "translation"),
            q.eq(q.field("locale"), "de"),
            q.eq(q.field("name"), t.key)
          )
        )
        .first();

      if (existing) {
        if (existing.value !== t.value) {
          await ctx.db.patch(existing._id, { value: t.value });
          console.log(`  ↻ Updated: ${t.key}`);
        }
      } else {
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "translation",
          locale: "de",
          name: t.key,
          value: t.value,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        created++;
      }
    }

    console.log(`✅ DE translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
