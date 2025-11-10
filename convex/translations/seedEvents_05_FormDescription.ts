/**
 * EVENTS TRANSLATIONS - FORM DESCRIPTION
 *
 * Event Description section translations:
 * - Rich text editor
 * - Detailed description
 *
 * Namespace: ui.events.form
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

interface Translation {
  locale: string;
  key: string;
  value: string;
}

const translations: Translation[] = [
  // ===== ENGLISH =====
  // Event Form - Description Section
  { locale: "en", key: "ui.events.form.description", value: "Detailed Description (Rich Text)" },
  { locale: "en", key: "ui.events.form.description_help", value: "Add rich formatting, links, and detailed information about your event" },
  { locale: "en", key: "ui.events.form.description_placeholder", value: "Write a detailed description of your event. Include schedule, what attendees can expect, special guests, and any other important information..." },
  { locale: "en", key: "ui.events.form.ai_suggestions", value: "AI-powered content suggestions" },
  { locale: "en", key: "ui.events.form.coming_soon", value: "Coming soon!" },

  // ===== GERMAN =====
  // Event Form - Description Section
  { locale: "de", key: "ui.events.form.description", value: "Detaillierte Beschreibung (Rich Text)" },
  { locale: "de", key: "ui.events.form.description_help", value: "Fügen Sie Rich-Formatierung, Links und detaillierte Informationen zu Ihrer Veranstaltung hinzu" },
  { locale: "de", key: "ui.events.form.description_placeholder", value: "Schreiben Sie eine detaillierte Beschreibung Ihrer Veranstaltung. Fügen Sie den Zeitplan, was Teilnehmer erwarten können, besondere Gäste und andere wichtige Informationen hinzu..." },
  { locale: "de", key: "ui.events.form.ai_suggestions", value: "KI-gestützte Inhaltsvorschläge" },
  { locale: "de", key: "ui.events.form.coming_soon", value: "Demnächst verfügbar!" },

  // ===== SPANISH =====
  // Event Form - Description Section
  { locale: "es", key: "ui.events.form.description", value: "Descripción detallada (Rich Text)" },
  { locale: "es", key: "ui.events.form.description_help", value: "Añade formato enriquecido, enlaces e información detallada sobre tu evento" },
  { locale: "es", key: "ui.events.form.description_placeholder", value: "Escribe una descripción detallada de tu evento. Incluye el horario, qué pueden esperar los asistentes, invitados especiales y cualquier otra información importante..." },
  { locale: "es", key: "ui.events.form.ai_suggestions", value: "Sugerencias de contenido con IA" },
  { locale: "es", key: "ui.events.form.coming_soon", value: "¡Próximamente!" },

  // ===== FRENCH =====
  // Event Form - Description Section
  { locale: "fr", key: "ui.events.form.description", value: "Description détaillée (Rich Text)" },
  { locale: "fr", key: "ui.events.form.description_help", value: "Ajoutez du formatage enrichi, des liens et des informations détaillées sur votre événement" },
  { locale: "fr", key: "ui.events.form.description_placeholder", value: "Rédigez une description détaillée de votre événement. Incluez le programme, ce que les participants peuvent attendre, les invités spéciaux et toute autre information importante..." },
  { locale: "fr", key: "ui.events.form.ai_suggestions", value: "Suggestions de contenu alimentées par l'IA" },
  { locale: "fr", key: "ui.events.form.coming_soon", value: "Bientôt disponible !" },

  // ===== JAPANESE =====
  // Event Form - Description Section
  { locale: "ja", key: "ui.events.form.description", value: "詳細説明（リッチテキスト）" },
  { locale: "ja", key: "ui.events.form.description_help", value: "リッチフォーマット、リンク、イベントの詳細情報を追加" },
  { locale: "ja", key: "ui.events.form.description_placeholder", value: "イベントの詳細な説明を記入してください。スケジュール、参加者が期待できること、特別ゲスト、その他の重要な情報を含めてください..." },
  { locale: "ja", key: "ui.events.form.ai_suggestions", value: "AI駆動のコンテンツ提案" },
  { locale: "ja", key: "ui.events.form.coming_soon", value: "近日公開！" },

  // ===== POLISH =====
  // Event Form - Description Section
  { locale: "pl", key: "ui.events.form.description", value: "Szczegółowy opis (Rich Text)" },
  { locale: "pl", key: "ui.events.form.description_help", value: "Dodaj bogate formatowanie, linki i szczegółowe informacje o swoim wydarzeniu" },
  { locale: "pl", key: "ui.events.form.description_placeholder", value: "Napisz szczegółowy opis swojego wydarzenia. Dołącz harmonogram, czego mogą spodziewać się uczestnicy, specjalnych gości i wszelkie inne ważne informacje..." },
  { locale: "pl", key: "ui.events.form.ai_suggestions", value: "Sugestie treści oparte na AI" },
  { locale: "pl", key: "ui.events.form.coming_soon", value: "Wkrótce!" },
];

/**
 * Seed events form description translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_05_FormDescription:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Form Description Translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of translations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        translation.locale,
        "events",
        "events-window"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded Events Form Description translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
