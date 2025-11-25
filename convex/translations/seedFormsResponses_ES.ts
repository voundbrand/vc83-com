/**
 * FORMS RESPONSES TRANSLATIONS - SPANISH
 *
 * Spanish translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (ES)...");

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
      { key: "ui.forms.responses.select_form", value: "Seleccionar un formulario para ver respuestas" },
      { key: "ui.forms.responses.no_responses", value: "Aún no hay respuestas de formulario" },
      { key: "ui.forms.responses.no_responses_hint", value: "Las respuestas aparecerán aquí una vez que se envíen los formularios" },
      { key: "ui.forms.responses.response_singular", value: "respuesta" },
      { key: "ui.forms.responses.response_plural", value: "respuestas" },
      { key: "ui.forms.responses.back_to_forms", value: "Volver a Formularios" },
      { key: "ui.forms.responses.export_csv", value: "Exportar CSV" },
      { key: "ui.forms.responses.export_csv_coming_soon", value: "Exportación CSV próximamente" },
      { key: "ui.forms.responses.search_placeholder", value: "Buscar respuestas..." },
      { key: "ui.forms.responses.no_matches", value: "No hay respuestas que coincidan con tu búsqueda" },
      { key: "ui.forms.responses.anonymous", value: "Anónimo" },
      { key: "ui.forms.responses.public", value: "Público" },
      { key: "ui.forms.responses.unknown_time", value: "Hora desconocida" },
      { key: "ui.forms.responses.view", value: "Ver" },
      { key: "ui.forms.responses.response_details", value: "Detalles de Respuesta" },
      { key: "ui.forms.responses.submission_info", value: "Información de Envío" },
      { key: "ui.forms.responses.submitted", value: "Enviado" },
      { key: "ui.forms.responses.type", value: "Tipo" },
      { key: "ui.forms.responses.public_submission", value: "Envío Público" },
      { key: "ui.forms.responses.authenticated", value: "Autenticado" },
      { key: "ui.forms.responses.ip_address", value: "Dirección IP" },
      { key: "ui.forms.responses.form_data", value: "Datos del Formulario" },
      { key: "ui.forms.responses.close", value: "Cerrar" },
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
        "es",
        "forms",
        "responses-tab"
      );
      if (inserted) created++;
    }

    console.log(`✅ ES translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
