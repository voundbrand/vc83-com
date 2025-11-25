/**
 * FORMS RESPONSES TRANSLATIONS - POLISH
 *
 * Polish translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (PL)...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const translations = [
      { key: "ui.forms.responses.select_form", value: "Wybierz formularz aby wyświetlić odpowiedzi" },
      { key: "ui.forms.responses.no_responses", value: "Jeszcze brak odpowiedzi na formularze" },
      { key: "ui.forms.responses.no_responses_hint", value: "Odpowiedzi pojawią się tutaj gdy formularze zostaną przesłane" },
      { key: "ui.forms.responses.response_singular", value: "odpowiedź" },
      { key: "ui.forms.responses.response_plural", value: "odpowiedzi" },
      { key: "ui.forms.responses.back_to_forms", value: "Powrót do formularzy" },
      { key: "ui.forms.responses.export_csv", value: "Eksportuj CSV" },
      { key: "ui.forms.responses.export_csv_coming_soon", value: "Eksport CSV wkrótce dostępny" },
      { key: "ui.forms.responses.search_placeholder", value: "Szukaj odpowiedzi..." },
      { key: "ui.forms.responses.no_matches", value: "Brak odpowiedzi pasujących do wyszukiwania" },
      { key: "ui.forms.responses.anonymous", value: "Anonimowy" },
      { key: "ui.forms.responses.public", value: "Publiczny" },
      { key: "ui.forms.responses.unknown_time", value: "Nieznany czas" },
      { key: "ui.forms.responses.view", value: "Widok" },
      { key: "ui.forms.responses.response_details", value: "Szczegóły odpowiedzi" },
      { key: "ui.forms.responses.submission_info", value: "Informacje o przesłaniu" },
      { key: "ui.forms.responses.submitted", value: "Przesłano" },
      { key: "ui.forms.responses.type", value: "Typ" },
      { key: "ui.forms.responses.public_submission", value: "Publiczne przesłanie" },
      { key: "ui.forms.responses.authenticated", value: "Uwierzytelniony" },
      { key: "ui.forms.responses.ip_address", value: "Adres IP" },
      { key: "ui.forms.responses.form_data", value: "Dane formularza" },
      { key: "ui.forms.responses.close", value: "Zamknij" },
    ];

    let created = 0;
    for (const t of translations) {
      const existing = await ctx.db
        .query("objects")
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "translation"),
            q.eq(q.field("locale"), "pl"),
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
          locale: "pl",
          name: t.key,
          value: t.value,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        created++;
      }
    }

    console.log(`✅ PL translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
