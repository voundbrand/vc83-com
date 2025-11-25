/**
 * FORMS RESPONSES TRANSLATIONS - ENGLISH
 *
 * English translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (EN)...");

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
      { key: "ui.forms.responses.select_form", value: "Select a form to view responses" },
      { key: "ui.forms.responses.no_responses", value: "No form responses yet" },
      { key: "ui.forms.responses.no_responses_hint", value: "Responses will appear here once forms are submitted" },
      { key: "ui.forms.responses.response_singular", value: "response" },
      { key: "ui.forms.responses.response_plural", value: "responses" },
      { key: "ui.forms.responses.back_to_forms", value: "Back to Forms" },
      { key: "ui.forms.responses.export_csv", value: "Export CSV" },
      { key: "ui.forms.responses.export_csv_coming_soon", value: "CSV export coming soon" },
      { key: "ui.forms.responses.search_placeholder", value: "Search responses..." },
      { key: "ui.forms.responses.no_matches", value: "No responses match your search" },
      { key: "ui.forms.responses.anonymous", value: "Anonymous" },
      { key: "ui.forms.responses.public", value: "Public" },
      { key: "ui.forms.responses.unknown_time", value: "Unknown time" },
      { key: "ui.forms.responses.view", value: "View" },
      { key: "ui.forms.responses.response_details", value: "Response Details" },
      { key: "ui.forms.responses.submission_info", value: "Submission Info" },
      { key: "ui.forms.responses.submitted", value: "Submitted" },
      { key: "ui.forms.responses.type", value: "Type" },
      { key: "ui.forms.responses.public_submission", value: "Public Submission" },
      { key: "ui.forms.responses.authenticated", value: "Authenticated" },
      { key: "ui.forms.responses.ip_address", value: "IP Address" },
      { key: "ui.forms.responses.form_data", value: "Form Data" },
      { key: "ui.forms.responses.close", value: "Close" },
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
        "en",
        "forms",
        "responses-tab"
      );
      if (inserted) created++;
    }

    console.log(`✅ EN translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
