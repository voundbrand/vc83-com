/**
 * EVENTS TRANSLATIONS - FORM AGENDA
 *
 * Event Agenda section translations:
 * - Agenda items
 * - Session details
 * - Speakers
 * - Locations
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
  // Event Form - Agenda Section
  { locale: "en", key: "ui.events.form.agenda", value: "Event Agenda & Schedule" },
  { locale: "en", key: "ui.events.form.agenda_description", value: "Build your event schedule with sessions, speakers, and timing" },
  { locale: "en", key: "ui.events.form.add_session", value: "Add Session" },
  { locale: "en", key: "ui.events.form.no_sessions", value: "No sessions yet. Click \"Add Session\" to get started." },
  { locale: "en", key: "ui.events.form.sessions_scheduled", value: "{count} session{plural} scheduled" },
  { locale: "en", key: "ui.events.form.agenda_date", value: "Date" },
  { locale: "en", key: "ui.events.form.agenda_time", value: "Time" },
  { locale: "en", key: "ui.events.form.session_title", value: "Session Title" },
  { locale: "en", key: "ui.events.form.session_title_placeholder", value: "e.g., Opening Keynote, Workshop, Panel Discussion" },
  { locale: "en", key: "ui.events.form.speaker_optional", value: "Speaker (Optional)" },
  { locale: "en", key: "ui.events.form.speaker_placeholder", value: "Speaker name" },
  { locale: "en", key: "ui.events.form.location_optional", value: "Location (Optional)" },
  { locale: "en", key: "ui.events.form.location_placeholder", value: "Room/venue" },
  { locale: "en", key: "ui.events.form.description_optional", value: "Description (Optional)" },
  { locale: "en", key: "ui.events.form.description_placeholder", value: "Brief description of this session..." },
  { locale: "en", key: "ui.events.form.session_badge", value: "Session Badge (Optional)" },
  { locale: "en", key: "ui.events.form.show_badge", value: "Show Badge" },
  { locale: "en", key: "ui.events.form.badge_text", value: "Badge Text" },
  { locale: "en", key: "ui.events.form.badge_text_placeholder", value: "e.g., Keynote, Workshop, Break" },
  { locale: "en", key: "ui.events.form.badge_color", value: "Badge Color" },
  { locale: "en", key: "ui.events.form.badge_preview", value: "Preview:" },
  { locale: "en", key: "ui.events.form.delete_session", value: "Delete session" },

  // ===== GERMAN =====
  // Event Form - Agenda Section
  { locale: "de", key: "ui.events.form.agenda", value: "Veranstaltungsagenda & Zeitplan" },
  { locale: "de", key: "ui.events.form.agenda_description", value: "Erstellen Sie Ihren Veranstaltungsplan mit Sitzungen, Sprechern und Zeitangaben" },
  { locale: "de", key: "ui.events.form.add_session", value: "Sitzung hinzufügen" },
  { locale: "de", key: "ui.events.form.no_sessions", value: "Noch keine Sitzungen. Klicken Sie auf \"Sitzung hinzufügen\", um zu beginnen." },
  { locale: "de", key: "ui.events.form.sessions_scheduled", value: "{count} Sitzung{plural} geplant" },
  { locale: "de", key: "ui.events.form.agenda_date", value: "Datum" },
  { locale: "de", key: "ui.events.form.agenda_time", value: "Zeit" },
  { locale: "de", key: "ui.events.form.session_title", value: "Sitzungstitel" },
  { locale: "de", key: "ui.events.form.session_title_placeholder", value: "z.B. Eröffnungsrede, Workshop, Podiumsdiskussion" },
  { locale: "de", key: "ui.events.form.speaker_optional", value: "Sprecher (Optional)" },
  { locale: "de", key: "ui.events.form.speaker_placeholder", value: "Name des Sprechers" },
  { locale: "de", key: "ui.events.form.location_optional", value: "Ort (Optional)" },
  { locale: "de", key: "ui.events.form.location_placeholder", value: "Raum/Veranstaltungsort" },
  { locale: "de", key: "ui.events.form.description_optional", value: "Beschreibung (Optional)" },
  { locale: "de", key: "ui.events.form.description_placeholder", value: "Kurze Beschreibung dieser Sitzung..." },
  { locale: "de", key: "ui.events.form.session_badge", value: "Sitzungsabzeichen (Optional)" },
  { locale: "de", key: "ui.events.form.show_badge", value: "Abzeichen anzeigen" },
  { locale: "de", key: "ui.events.form.badge_text", value: "Abzeichen-Text" },
  { locale: "de", key: "ui.events.form.badge_text_placeholder", value: "z.B. Keynote, Workshop, Pause" },
  { locale: "de", key: "ui.events.form.badge_color", value: "Abzeichen-Farbe" },
  { locale: "de", key: "ui.events.form.badge_preview", value: "Vorschau:" },
  { locale: "de", key: "ui.events.form.delete_session", value: "Sitzung löschen" },

  // ===== SPANISH =====
  // Event Form - Agenda Section
  { locale: "es", key: "ui.events.form.agenda", value: "Agenda y cronograma del evento" },
  { locale: "es", key: "ui.events.form.agenda_description", value: "Construye el cronograma de tu evento con sesiones, ponentes y horarios" },
  { locale: "es", key: "ui.events.form.add_session", value: "Añadir sesión" },
  { locale: "es", key: "ui.events.form.no_sessions", value: "Aún no hay sesiones. Haz clic en \"Añadir sesión\" para comenzar." },
  { locale: "es", key: "ui.events.form.sessions_scheduled", value: "{count} sesión{plural} programada{plural}" },
  { locale: "es", key: "ui.events.form.agenda_date", value: "Fecha" },
  { locale: "es", key: "ui.events.form.agenda_time", value: "Hora" },
  { locale: "es", key: "ui.events.form.session_title", value: "Título de la sesión" },
  { locale: "es", key: "ui.events.form.session_title_placeholder", value: "ej., Discurso de apertura, Taller, Mesa redonda" },
  { locale: "es", key: "ui.events.form.speaker_optional", value: "Ponente (Opcional)" },
  { locale: "es", key: "ui.events.form.speaker_placeholder", value: "Nombre del ponente" },
  { locale: "es", key: "ui.events.form.location_optional", value: "Ubicación (Opcional)" },
  { locale: "es", key: "ui.events.form.location_placeholder", value: "Sala/lugar" },
  { locale: "es", key: "ui.events.form.description_optional", value: "Descripción (Opcional)" },
  { locale: "es", key: "ui.events.form.description_placeholder", value: "Breve descripción de esta sesión..." },
  { locale: "es", key: "ui.events.form.session_badge", value: "Insignia de sesión (Opcional)" },
  { locale: "es", key: "ui.events.form.show_badge", value: "Mostrar insignia" },
  { locale: "es", key: "ui.events.form.badge_text", value: "Texto de insignia" },
  { locale: "es", key: "ui.events.form.badge_text_placeholder", value: "ej., Keynote, Taller, Descanso" },
  { locale: "es", key: "ui.events.form.badge_color", value: "Color de insignia" },
  { locale: "es", key: "ui.events.form.badge_preview", value: "Vista previa:" },
  { locale: "es", key: "ui.events.form.delete_session", value: "Eliminar sesión" },

  // ===== FRENCH =====
  // Event Form - Agenda Section
  { locale: "fr", key: "ui.events.form.agenda", value: "Agenda et programme de l'événement" },
  { locale: "fr", key: "ui.events.form.agenda_description", value: "Créez le programme de votre événement avec des sessions, des intervenants et des horaires" },
  { locale: "fr", key: "ui.events.form.add_session", value: "Ajouter une session" },
  { locale: "fr", key: "ui.events.form.no_sessions", value: "Aucune session pour le moment. Cliquez sur \"Ajouter une session\" pour commencer." },
  { locale: "fr", key: "ui.events.form.sessions_scheduled", value: "{count} session{plural} programmée{plural}" },
  { locale: "fr", key: "ui.events.form.agenda_date", value: "Date" },
  { locale: "fr", key: "ui.events.form.agenda_time", value: "Heure" },
  { locale: "fr", key: "ui.events.form.session_title", value: "Titre de la session" },
  { locale: "fr", key: "ui.events.form.session_title_placeholder", value: "ex. Discours d'ouverture, Atelier, Table ronde" },
  { locale: "fr", key: "ui.events.form.speaker_optional", value: "Intervenant (Optionnel)" },
  { locale: "fr", key: "ui.events.form.speaker_placeholder", value: "Nom de l'intervenant" },
  { locale: "fr", key: "ui.events.form.location_optional", value: "Lieu (Optionnel)" },
  { locale: "fr", key: "ui.events.form.location_placeholder", value: "Salle/lieu" },
  { locale: "fr", key: "ui.events.form.description_optional", value: "Description (Optionnelle)" },
  { locale: "fr", key: "ui.events.form.description_placeholder", value: "Brève description de cette session..." },
  { locale: "fr", key: "ui.events.form.session_badge", value: "Badge de session (Optionnel)" },
  { locale: "fr", key: "ui.events.form.show_badge", value: "Afficher le badge" },
  { locale: "fr", key: "ui.events.form.badge_text", value: "Texte du badge" },
  { locale: "fr", key: "ui.events.form.badge_text_placeholder", value: "ex. Conférence, Atelier, Pause" },
  { locale: "fr", key: "ui.events.form.badge_color", value: "Couleur du badge" },
  { locale: "fr", key: "ui.events.form.badge_preview", value: "Aperçu :" },
  { locale: "fr", key: "ui.events.form.delete_session", value: "Supprimer la session" },

  // ===== JAPANESE =====
  // Event Form - Agenda Section
  { locale: "ja", key: "ui.events.form.agenda", value: "イベントアジェンダとスケジュール" },
  { locale: "ja", key: "ui.events.form.agenda_description", value: "セッション、スピーカー、タイミングでイベントスケジュールを作成" },
  { locale: "ja", key: "ui.events.form.add_session", value: "セッションを追加" },
  { locale: "ja", key: "ui.events.form.no_sessions", value: "まだセッションがありません。「セッションを追加」をクリックして始めましょう。" },
  { locale: "ja", key: "ui.events.form.sessions_scheduled", value: "{count}件のセッションをスケジュール済み" },
  { locale: "ja", key: "ui.events.form.agenda_date", value: "日付" },
  { locale: "ja", key: "ui.events.form.agenda_time", value: "時間" },
  { locale: "ja", key: "ui.events.form.session_title", value: "セッションタイトル" },
  { locale: "ja", key: "ui.events.form.session_title_placeholder", value: "例：基調講演、ワークショップ、パネルディスカッション" },
  { locale: "ja", key: "ui.events.form.speaker_optional", value: "スピーカー（任意）" },
  { locale: "ja", key: "ui.events.form.speaker_placeholder", value: "スピーカー名" },
  { locale: "ja", key: "ui.events.form.location_optional", value: "場所（任意）" },
  { locale: "ja", key: "ui.events.form.location_placeholder", value: "部屋/会場" },
  { locale: "ja", key: "ui.events.form.description_optional", value: "説明（任意）" },
  { locale: "ja", key: "ui.events.form.description_placeholder", value: "このセッションの簡単な説明..." },
  { locale: "ja", key: "ui.events.form.session_badge", value: "セッションバッジ（任意）" },
  { locale: "ja", key: "ui.events.form.show_badge", value: "バッジを表示" },
  { locale: "ja", key: "ui.events.form.badge_text", value: "バッジテキスト" },
  { locale: "ja", key: "ui.events.form.badge_text_placeholder", value: "例：キーノート、ワークショップ、休憩" },
  { locale: "ja", key: "ui.events.form.badge_color", value: "バッジの色" },
  { locale: "ja", key: "ui.events.form.badge_preview", value: "プレビュー：" },
  { locale: "ja", key: "ui.events.form.delete_session", value: "セッションを削除" },

  // ===== POLISH =====
  // Event Form - Agenda Section
  { locale: "pl", key: "ui.events.form.agenda", value: "Agenda i harmonogram wydarzenia" },
  { locale: "pl", key: "ui.events.form.agenda_description", value: "Zbuduj harmonogram wydarzenia z sesjami, prelegentami i czasem" },
  { locale: "pl", key: "ui.events.form.add_session", value: "Dodaj sesję" },
  { locale: "pl", key: "ui.events.form.no_sessions", value: "Brak sesji. Kliknij \"Dodaj sesję\", aby rozpocząć." },
  { locale: "pl", key: "ui.events.form.sessions_scheduled", value: "{count} sesj{plural} zaplanowanych" },
  { locale: "pl", key: "ui.events.form.agenda_date", value: "Data" },
  { locale: "pl", key: "ui.events.form.agenda_time", value: "Godzina" },
  { locale: "pl", key: "ui.events.form.session_title", value: "Tytuł sesji" },
  { locale: "pl", key: "ui.events.form.session_title_placeholder", value: "np. Przemówienie otwierające, Warsztat, Dyskusja panelowa" },
  { locale: "pl", key: "ui.events.form.speaker_optional", value: "Prelegent (Opcjonalnie)" },
  { locale: "pl", key: "ui.events.form.speaker_placeholder", value: "Nazwa prelegenta" },
  { locale: "pl", key: "ui.events.form.location_optional", value: "Lokalizacja (Opcjonalnie)" },
  { locale: "pl", key: "ui.events.form.location_placeholder", value: "Sala/miejsce" },
  { locale: "pl", key: "ui.events.form.description_optional", value: "Opis (Opcjonalnie)" },
  { locale: "pl", key: "ui.events.form.description_placeholder", value: "Krótki opis tej sesji..." },
  { locale: "pl", key: "ui.events.form.session_badge", value: "Odznaka sesji (Opcjonalnie)" },
  { locale: "pl", key: "ui.events.form.show_badge", value: "Pokaż odznakę" },
  { locale: "pl", key: "ui.events.form.badge_text", value: "Tekst odznaki" },
  { locale: "pl", key: "ui.events.form.badge_text_placeholder", value: "np. Keynote, Warsztat, Przerwa" },
  { locale: "pl", key: "ui.events.form.badge_color", value: "Kolor odznaki" },
  { locale: "pl", key: "ui.events.form.badge_preview", value: "Podgląd:" },
  { locale: "pl", key: "ui.events.form.delete_session", value: "Usuń sesję" },
];

/**
 * Seed events form agenda translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_03_FormAgenda:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Form Agenda Translations...");

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

    console.log(`✅ Seeded Events Form Agenda translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
