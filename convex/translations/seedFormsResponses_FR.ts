/**
 * FORMS RESPONSES TRANSLATIONS - FRENCH
 *
 * French translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (FR)...");

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
      { key: "ui.forms.responses.select_form", value: "Sélectionner un formulaire pour voir les réponses" },
      { key: "ui.forms.responses.no_responses", value: "Aucune réponse au formulaire pour le moment" },
      { key: "ui.forms.responses.no_responses_hint", value: "Les réponses apparaîtront ici une fois les formulaires soumis" },
      { key: "ui.forms.responses.response_singular", value: "réponse" },
      { key: "ui.forms.responses.response_plural", value: "réponses" },
      { key: "ui.forms.responses.back_to_forms", value: "Retour aux Formulaires" },
      { key: "ui.forms.responses.export_csv", value: "Exporter CSV" },
      { key: "ui.forms.responses.export_csv_coming_soon", value: "Export CSV bientôt disponible" },
      { key: "ui.forms.responses.search_placeholder", value: "Rechercher des réponses..." },
      { key: "ui.forms.responses.no_matches", value: "Aucune réponse ne correspond à votre recherche" },
      { key: "ui.forms.responses.anonymous", value: "Anonyme" },
      { key: "ui.forms.responses.public", value: "Public" },
      { key: "ui.forms.responses.unknown_time", value: "Heure inconnue" },
      { key: "ui.forms.responses.view", value: "Voir" },
      { key: "ui.forms.responses.response_details", value: "Détails de la Réponse" },
      { key: "ui.forms.responses.submission_info", value: "Informations de Soumission" },
      { key: "ui.forms.responses.submitted", value: "Soumis" },
      { key: "ui.forms.responses.type", value: "Type" },
      { key: "ui.forms.responses.public_submission", value: "Soumission Publique" },
      { key: "ui.forms.responses.authenticated", value: "Authentifié" },
      { key: "ui.forms.responses.ip_address", value: "Adresse IP" },
      { key: "ui.forms.responses.form_data", value: "Données du Formulaire" },
      { key: "ui.forms.responses.close", value: "Fermer" },
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
        "fr",
        "forms",
        "responses-tab"
      );
      if (inserted) created++;
    }

    console.log(`✅ FR translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
