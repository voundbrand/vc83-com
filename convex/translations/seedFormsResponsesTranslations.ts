/**
 * FORMS RESPONSES TRANSLATIONS
 *
 * Translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "System"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const translations = [
      // ENGLISH (en)
      {
        locale: "en",
        key: "ui.forms.responses.select_form",
        value: "Select a form to view responses",
      },
      {
        locale: "en",
        key: "ui.forms.responses.no_responses",
        value: "No form responses yet",
      },
      {
        locale: "en",
        key: "ui.forms.responses.no_responses_hint",
        value: "Responses will appear here once forms are submitted",
      },
      {
        locale: "en",
        key: "ui.forms.responses.response_singular",
        value: "response",
      },
      {
        locale: "en",
        key: "ui.forms.responses.response_plural",
        value: "responses",
      },
      {
        locale: "en",
        key: "ui.forms.responses.back_to_forms",
        value: "Back to Forms",
      },
      {
        locale: "en",
        key: "ui.forms.responses.export_csv",
        value: "Export CSV",
      },
      {
        locale: "en",
        key: "ui.forms.responses.export_csv_coming_soon",
        value: "CSV export coming soon",
      },
      {
        locale: "en",
        key: "ui.forms.responses.search_placeholder",
        value: "Search responses...",
      },
      {
        locale: "en",
        key: "ui.forms.responses.no_matches",
        value: "No responses match your search",
      },
      {
        locale: "en",
        key: "ui.forms.responses.anonymous",
        value: "Anonymous",
      },
      {
        locale: "en",
        key: "ui.forms.responses.public",
        value: "Public",
      },
      {
        locale: "en",
        key: "ui.forms.responses.unknown_time",
        value: "Unknown time",
      },
      {
        locale: "en",
        key: "ui.forms.responses.view",
        value: "View",
      },
      {
        locale: "en",
        key: "ui.forms.responses.response_details",
        value: "Response Details",
      },
      {
        locale: "en",
        key: "ui.forms.responses.submission_info",
        value: "Submission Info",
      },
      {
        locale: "en",
        key: "ui.forms.responses.submitted",
        value: "Submitted",
      },
      {
        locale: "en",
        key: "ui.forms.responses.type",
        value: "Type",
      },
      {
        locale: "en",
        key: "ui.forms.responses.public_submission",
        value: "Public Submission",
      },
      {
        locale: "en",
        key: "ui.forms.responses.authenticated",
        value: "Authenticated",
      },
      {
        locale: "en",
        key: "ui.forms.responses.ip_address",
        value: "IP Address",
      },
      {
        locale: "en",
        key: "ui.forms.responses.form_data",
        value: "Form Data",
      },
      {
        locale: "en",
        key: "ui.forms.responses.close",
        value: "Close",
      },

      // GERMAN (de)
      {
        locale: "de",
        key: "ui.forms.responses.select_form",
        value: "Formular auswählen um Antworten anzuzeigen",
      },
      {
        locale: "de",
        key: "ui.forms.responses.no_responses",
        value: "Noch keine Formularantworten",
      },
      {
        locale: "de",
        key: "ui.forms.responses.no_responses_hint",
        value: "Antworten werden hier angezeigt sobald Formulare eingereicht werden",
      },
      {
        locale: "de",
        key: "ui.forms.responses.response_singular",
        value: "Antwort",
      },
      {
        locale: "de",
        key: "ui.forms.responses.response_plural",
        value: "Antworten",
      },
      {
        locale: "de",
        key: "ui.forms.responses.back_to_forms",
        value: "Zurück zu Formularen",
      },
      {
        locale: "de",
        key: "ui.forms.responses.export_csv",
        value: "CSV Exportieren",
      },
      {
        locale: "de",
        key: "ui.forms.responses.export_csv_coming_soon",
        value: "CSV-Export demnächst verfügbar",
      },
      {
        locale: "de",
        key: "ui.forms.responses.search_placeholder",
        value: "Antworten durchsuchen...",
      },
      {
        locale: "de",
        key: "ui.forms.responses.no_matches",
        value: "Keine Antworten entsprechen Ihrer Suche",
      },
      {
        locale: "de",
        key: "ui.forms.responses.anonymous",
        value: "Anonym",
      },
      {
        locale: "de",
        key: "ui.forms.responses.public",
        value: "Öffentlich",
      },
      {
        locale: "de",
        key: "ui.forms.responses.unknown_time",
        value: "Unbekannte Zeit",
      },
      {
        locale: "de",
        key: "ui.forms.responses.view",
        value: "Ansehen",
      },
      {
        locale: "de",
        key: "ui.forms.responses.response_details",
        value: "Antwortdetails",
      },
      {
        locale: "de",
        key: "ui.forms.responses.submission_info",
        value: "Übermittlungsinformationen",
      },
      {
        locale: "de",
        key: "ui.forms.responses.submitted",
        value: "Eingereicht",
      },
      {
        locale: "de",
        key: "ui.forms.responses.type",
        value: "Typ",
      },
      {
        locale: "de",
        key: "ui.forms.responses.public_submission",
        value: "Öffentliche Übermittlung",
      },
      {
        locale: "de",
        key: "ui.forms.responses.authenticated",
        value: "Authentifiziert",
      },
      {
        locale: "de",
        key: "ui.forms.responses.ip_address",
        value: "IP-Adresse",
      },
      {
        locale: "de",
        key: "ui.forms.responses.form_data",
        value: "Formulardaten",
      },
      {
        locale: "de",
        key: "ui.forms.responses.close",
        value: "Schließen",
      },

      // POLISH (pl)
      {
        locale: "pl",
        key: "ui.forms.responses.select_form",
        value: "Wybierz formularz aby wyświetlić odpowiedzi",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.no_responses",
        value: "Jeszcze brak odpowiedzi na formularze",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.no_responses_hint",
        value: "Odpowiedzi pojawią się tutaj gdy formularze zostaną przesłane",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.response_singular",
        value: "odpowiedź",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.response_plural",
        value: "odpowiedzi",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.back_to_forms",
        value: "Powrót do formularzy",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.export_csv",
        value: "Eksportuj CSV",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.export_csv_coming_soon",
        value: "Eksport CSV wkrótce dostępny",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.search_placeholder",
        value: "Szukaj odpowiedzi...",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.no_matches",
        value: "Brak odpowiedzi pasujących do wyszukiwania",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.anonymous",
        value: "Anonimowy",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.public",
        value: "Publiczny",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.unknown_time",
        value: "Nieznany czas",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.view",
        value: "Widok",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.response_details",
        value: "Szczegóły odpowiedzi",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.submission_info",
        value: "Informacje o przesłaniu",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.submitted",
        value: "Przesłano",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.type",
        value: "Typ",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.public_submission",
        value: "Publiczne przesłanie",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.authenticated",
        value: "Uwierzytelniony",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.ip_address",
        value: "Adres IP",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.form_data",
        value: "Dane formularza",
      },
      {
        locale: "pl",
        key: "ui.forms.responses.close",
        value: "Zamknij",
      },
    ];

    // Insert all translations
    let created = 0;
    for (const t of translations) {
      // Check if translation already exists
      const existing = await ctx.db
        .query("objects")
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "translation"),
            q.eq(q.field("locale"), t.locale),
            q.eq(q.field("name"), t.key)
          )
        )
        .first();

      if (existing) {
        // Update if value changed
        if (existing.value !== t.value) {
          await ctx.db.patch(existing._id, { value: t.value });
          console.log(`  ↻ Updated: ${t.key} (${t.locale})`);
        }
      } else {
        // Create new translation
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "translation",
          locale: t.locale,
          name: t.key,
          value: t.value,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        created++;
      }
    }

    console.log(`✅ Forms Responses translations seeded (${created} new, ${translations.length - created} existing)`);
    return {
      success: true,
      created,
      total: translations.length,
    };
  },
});
