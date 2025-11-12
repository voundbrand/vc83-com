/**
 * EVENTS TRANSLATIONS - DETAIL MODAL
 *
 * Translations for Event Detail Modal:
 * - Section headers
 * - Field labels
 * - Action buttons
 * - Error messages
 * - Loading states
 *
 * Namespace: ui.events.detail
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
  // Section Headers
  { locale: "en", key: "ui.events.detail.section.datetime", value: "Date & Time" },
  { locale: "en", key: "ui.events.detail.section.location", value: "Location" },
  { locale: "en", key: "ui.events.detail.section.capacity", value: "Capacity & Attendees" },
  { locale: "en", key: "ui.events.detail.section.description", value: "Description" },
  { locale: "en", key: "ui.events.detail.section.details", value: "Event Details" },
  { locale: "en", key: "ui.events.detail.section.agenda", value: "Agenda" },
  { locale: "en", key: "ui.events.detail.section.system", value: "System Information" },

  // Field Labels
  { locale: "en", key: "ui.events.detail.field.start", value: "Start" },
  { locale: "en", key: "ui.events.detail.field.end", value: "End" },
  { locale: "en", key: "ui.events.detail.field.timezone", value: "Timezone" },
  { locale: "en", key: "ui.events.detail.field.registered", value: "registered" },
  { locale: "en", key: "ui.events.detail.field.max_capacity", value: "Maximum capacity" },
  { locale: "en", key: "ui.events.detail.field.event_id", value: "Event ID" },
  { locale: "en", key: "ui.events.detail.field.created_at", value: "Created" },
  { locale: "en", key: "ui.events.detail.field.last_updated", value: "Last Updated" },

  // Actions
  { locale: "en", key: "ui.events.detail.action.view_map", value: "View on Google Maps" },
  { locale: "en", key: "ui.events.detail.button.download_attendees", value: "Download Attendee List" },
  { locale: "en", key: "ui.events.detail.button.downloading", value: "Downloading..." },

  // Agenda Labels
  { locale: "en", key: "ui.events.detail.agenda.speaker", value: "Speaker" },
  { locale: "en", key: "ui.events.detail.agenda.location", value: "Location" },

  // Loading States
  { locale: "en", key: "ui.events.detail.loading.attendees", value: "Loading attendees..." },
  { locale: "en", key: "ui.events.detail.loading.button", value: "Loading..." },

  // Tooltips
  { locale: "en", key: "ui.events.detail.tooltip.loading", value: "Loading attendees..." },
  { locale: "en", key: "ui.events.detail.tooltip.no_attendees", value: "No attendees to download" },
  { locale: "en", key: "ui.events.detail.tooltip.download_pdf", value: "Download attendee list PDF" },

  // Error Messages
  { locale: "en", key: "ui.events.detail.error.download_failed", value: "Failed to download attendee list. Please try again." },

  // ===== GERMAN =====
  // Section Headers
  { locale: "de", key: "ui.events.detail.section.datetime", value: "Datum & Uhrzeit" },
  { locale: "de", key: "ui.events.detail.section.location", value: "Ort" },
  { locale: "de", key: "ui.events.detail.section.capacity", value: "Kapazität & Teilnehmer" },
  { locale: "de", key: "ui.events.detail.section.description", value: "Beschreibung" },
  { locale: "de", key: "ui.events.detail.section.details", value: "Veranstaltungsdetails" },
  { locale: "de", key: "ui.events.detail.section.agenda", value: "Programm" },
  { locale: "de", key: "ui.events.detail.section.system", value: "Systeminformationen" },

  // Field Labels
  { locale: "de", key: "ui.events.detail.field.start", value: "Beginn" },
  { locale: "de", key: "ui.events.detail.field.end", value: "Ende" },
  { locale: "de", key: "ui.events.detail.field.timezone", value: "Zeitzone" },
  { locale: "de", key: "ui.events.detail.field.registered", value: "angemeldet" },
  { locale: "de", key: "ui.events.detail.field.max_capacity", value: "Maximale Kapazität" },
  { locale: "de", key: "ui.events.detail.field.event_id", value: "Veranstaltungs-ID" },
  { locale: "de", key: "ui.events.detail.field.created_at", value: "Erstellt" },
  { locale: "de", key: "ui.events.detail.field.last_updated", value: "Zuletzt aktualisiert" },

  // Actions
  { locale: "de", key: "ui.events.detail.action.view_map", value: "Auf Google Maps anzeigen" },
  { locale: "de", key: "ui.events.detail.button.download_attendees", value: "Teilnehmerliste herunterladen" },
  { locale: "de", key: "ui.events.detail.button.downloading", value: "Wird heruntergeladen..." },

  // Agenda Labels
  { locale: "de", key: "ui.events.detail.agenda.speaker", value: "Sprecher" },
  { locale: "de", key: "ui.events.detail.agenda.location", value: "Ort" },

  // Loading States
  { locale: "de", key: "ui.events.detail.loading.attendees", value: "Teilnehmer werden geladen..." },
  { locale: "de", key: "ui.events.detail.loading.button", value: "Lädt..." },

  // Tooltips
  { locale: "de", key: "ui.events.detail.tooltip.loading", value: "Teilnehmer werden geladen..." },
  { locale: "de", key: "ui.events.detail.tooltip.no_attendees", value: "Keine Teilnehmer zum Herunterladen" },
  { locale: "de", key: "ui.events.detail.tooltip.download_pdf", value: "Teilnehmerliste als PDF herunterladen" },

  // Error Messages
  { locale: "de", key: "ui.events.detail.error.download_failed", value: "Download der Teilnehmerliste fehlgeschlagen. Bitte versuchen Sie es erneut." },

  // ===== SPANISH =====
  // Section Headers
  { locale: "es", key: "ui.events.detail.section.datetime", value: "Fecha y Hora" },
  { locale: "es", key: "ui.events.detail.section.location", value: "Ubicación" },
  { locale: "es", key: "ui.events.detail.section.capacity", value: "Capacidad y Asistentes" },
  { locale: "es", key: "ui.events.detail.section.description", value: "Descripción" },
  { locale: "es", key: "ui.events.detail.section.details", value: "Detalles del Evento" },
  { locale: "es", key: "ui.events.detail.section.agenda", value: "Programa" },
  { locale: "es", key: "ui.events.detail.section.system", value: "Información del Sistema" },

  // Field Labels
  { locale: "es", key: "ui.events.detail.field.start", value: "Inicio" },
  { locale: "es", key: "ui.events.detail.field.end", value: "Fin" },
  { locale: "es", key: "ui.events.detail.field.timezone", value: "Zona horaria" },
  { locale: "es", key: "ui.events.detail.field.registered", value: "registrados" },
  { locale: "es", key: "ui.events.detail.field.max_capacity", value: "Capacidad máxima" },
  { locale: "es", key: "ui.events.detail.field.event_id", value: "ID del evento" },
  { locale: "es", key: "ui.events.detail.field.created_at", value: "Creado" },
  { locale: "es", key: "ui.events.detail.field.last_updated", value: "Última actualización" },

  // Actions
  { locale: "es", key: "ui.events.detail.action.view_map", value: "Ver en Google Maps" },
  { locale: "es", key: "ui.events.detail.button.download_attendees", value: "Descargar Lista de Asistentes" },
  { locale: "es", key: "ui.events.detail.button.downloading", value: "Descargando..." },

  // Agenda Labels
  { locale: "es", key: "ui.events.detail.agenda.speaker", value: "Orador" },
  { locale: "es", key: "ui.events.detail.agenda.location", value: "Ubicación" },

  // Loading States
  { locale: "es", key: "ui.events.detail.loading.attendees", value: "Cargando asistentes..." },
  { locale: "es", key: "ui.events.detail.loading.button", value: "Cargando..." },

  // Tooltips
  { locale: "es", key: "ui.events.detail.tooltip.loading", value: "Cargando asistentes..." },
  { locale: "es", key: "ui.events.detail.tooltip.no_attendees", value: "No hay asistentes para descargar" },
  { locale: "es", key: "ui.events.detail.tooltip.download_pdf", value: "Descargar lista de asistentes en PDF" },

  // Error Messages
  { locale: "es", key: "ui.events.detail.error.download_failed", value: "Error al descargar la lista de asistentes. Por favor, intente de nuevo." },

  // ===== FRENCH =====
  // Section Headers
  { locale: "fr", key: "ui.events.detail.section.datetime", value: "Date et Heure" },
  { locale: "fr", key: "ui.events.detail.section.location", value: "Lieu" },
  { locale: "fr", key: "ui.events.detail.section.capacity", value: "Capacité et Participants" },
  { locale: "fr", key: "ui.events.detail.section.description", value: "Description" },
  { locale: "fr", key: "ui.events.detail.section.details", value: "Détails de l'Événement" },
  { locale: "fr", key: "ui.events.detail.section.agenda", value: "Programme" },
  { locale: "fr", key: "ui.events.detail.section.system", value: "Informations Système" },

  // Field Labels
  { locale: "fr", key: "ui.events.detail.field.start", value: "Début" },
  { locale: "fr", key: "ui.events.detail.field.end", value: "Fin" },
  { locale: "fr", key: "ui.events.detail.field.timezone", value: "Fuseau horaire" },
  { locale: "fr", key: "ui.events.detail.field.registered", value: "inscrits" },
  { locale: "fr", key: "ui.events.detail.field.max_capacity", value: "Capacité maximale" },
  { locale: "fr", key: "ui.events.detail.field.event_id", value: "ID de l'événement" },
  { locale: "fr", key: "ui.events.detail.field.created_at", value: "Créé le" },
  { locale: "fr", key: "ui.events.detail.field.last_updated", value: "Dernière mise à jour" },

  // Actions
  { locale: "fr", key: "ui.events.detail.action.view_map", value: "Voir sur Google Maps" },
  { locale: "fr", key: "ui.events.detail.button.download_attendees", value: "Télécharger la Liste des Participants" },
  { locale: "fr", key: "ui.events.detail.button.downloading", value: "Téléchargement..." },

  // Agenda Labels
  { locale: "fr", key: "ui.events.detail.agenda.speaker", value: "Intervenant" },
  { locale: "fr", key: "ui.events.detail.agenda.location", value: "Lieu" },

  // Loading States
  { locale: "fr", key: "ui.events.detail.loading.attendees", value: "Chargement des participants..." },
  { locale: "fr", key: "ui.events.detail.loading.button", value: "Chargement..." },

  // Tooltips
  { locale: "fr", key: "ui.events.detail.tooltip.loading", value: "Chargement des participants..." },
  { locale: "fr", key: "ui.events.detail.tooltip.no_attendees", value: "Aucun participant à télécharger" },
  { locale: "fr", key: "ui.events.detail.tooltip.download_pdf", value: "Télécharger la liste des participants en PDF" },

  // Error Messages
  { locale: "fr", key: "ui.events.detail.error.download_failed", value: "Échec du téléchargement de la liste des participants. Veuillez réessayer." },

  // ===== JAPANESE =====
  // Section Headers
  { locale: "ja", key: "ui.events.detail.section.datetime", value: "日時" },
  { locale: "ja", key: "ui.events.detail.section.location", value: "場所" },
  { locale: "ja", key: "ui.events.detail.section.capacity", value: "定員と参加者" },
  { locale: "ja", key: "ui.events.detail.section.description", value: "説明" },
  { locale: "ja", key: "ui.events.detail.section.details", value: "イベント詳細" },
  { locale: "ja", key: "ui.events.detail.section.agenda", value: "スケジュール" },
  { locale: "ja", key: "ui.events.detail.section.system", value: "システム情報" },

  // Field Labels
  { locale: "ja", key: "ui.events.detail.field.start", value: "開始" },
  { locale: "ja", key: "ui.events.detail.field.end", value: "終了" },
  { locale: "ja", key: "ui.events.detail.field.timezone", value: "タイムゾーン" },
  { locale: "ja", key: "ui.events.detail.field.registered", value: "登録済み" },
  { locale: "ja", key: "ui.events.detail.field.max_capacity", value: "最大定員" },
  { locale: "ja", key: "ui.events.detail.field.event_id", value: "イベントID" },
  { locale: "ja", key: "ui.events.detail.field.created_at", value: "作成日" },
  { locale: "ja", key: "ui.events.detail.field.last_updated", value: "最終更新" },

  // Actions
  { locale: "ja", key: "ui.events.detail.action.view_map", value: "Googleマップで見る" },
  { locale: "ja", key: "ui.events.detail.button.download_attendees", value: "参加者リストをダウンロード" },
  { locale: "ja", key: "ui.events.detail.button.downloading", value: "ダウンロード中..." },

  // Agenda Labels
  { locale: "ja", key: "ui.events.detail.agenda.speaker", value: "スピーカー" },
  { locale: "ja", key: "ui.events.detail.agenda.location", value: "場所" },

  // Loading States
  { locale: "ja", key: "ui.events.detail.loading.attendees", value: "参加者を読み込み中..." },
  { locale: "ja", key: "ui.events.detail.loading.button", value: "読み込み中..." },

  // Tooltips
  { locale: "ja", key: "ui.events.detail.tooltip.loading", value: "参加者を読み込み中..." },
  { locale: "ja", key: "ui.events.detail.tooltip.no_attendees", value: "ダウンロードする参加者がいません" },
  { locale: "ja", key: "ui.events.detail.tooltip.download_pdf", value: "参加者リストのPDFをダウンロード" },

  // Error Messages
  { locale: "ja", key: "ui.events.detail.error.download_failed", value: "参加者リストのダウンロードに失敗しました。もう一度お試しください。" },

  // ===== POLISH =====
  // Section Headers
  { locale: "pl", key: "ui.events.detail.section.datetime", value: "Data i Godzina" },
  { locale: "pl", key: "ui.events.detail.section.location", value: "Lokalizacja" },
  { locale: "pl", key: "ui.events.detail.section.capacity", value: "Pojemność i Uczestnicy" },
  { locale: "pl", key: "ui.events.detail.section.description", value: "Opis" },
  { locale: "pl", key: "ui.events.detail.section.details", value: "Szczegóły Wydarzenia" },
  { locale: "pl", key: "ui.events.detail.section.agenda", value: "Agenda" },
  { locale: "pl", key: "ui.events.detail.section.system", value: "Informacje Systemowe" },

  // Field Labels
  { locale: "pl", key: "ui.events.detail.field.start", value: "Początek" },
  { locale: "pl", key: "ui.events.detail.field.end", value: "Koniec" },
  { locale: "pl", key: "ui.events.detail.field.timezone", value: "Strefa czasowa" },
  { locale: "pl", key: "ui.events.detail.field.registered", value: "zarejestrowanych" },
  { locale: "pl", key: "ui.events.detail.field.max_capacity", value: "Maksymalna pojemność" },
  { locale: "pl", key: "ui.events.detail.field.event_id", value: "ID wydarzenia" },
  { locale: "pl", key: "ui.events.detail.field.created_at", value: "Utworzono" },
  { locale: "pl", key: "ui.events.detail.field.last_updated", value: "Ostatnia aktualizacja" },

  // Actions
  { locale: "pl", key: "ui.events.detail.action.view_map", value: "Zobacz na Mapach Google" },
  { locale: "pl", key: "ui.events.detail.button.download_attendees", value: "Pobierz Listę Uczestników" },
  { locale: "pl", key: "ui.events.detail.button.downloading", value: "Pobieranie..." },

  // Agenda Labels
  { locale: "pl", key: "ui.events.detail.agenda.speaker", value: "Prelegent" },
  { locale: "pl", key: "ui.events.detail.agenda.location", value: "Lokalizacja" },

  // Loading States
  { locale: "pl", key: "ui.events.detail.loading.attendees", value: "Ładowanie uczestników..." },
  { locale: "pl", key: "ui.events.detail.loading.button", value: "Ładowanie..." },

  // Tooltips
  { locale: "pl", key: "ui.events.detail.tooltip.loading", value: "Ładowanie uczestników..." },
  { locale: "pl", key: "ui.events.detail.tooltip.no_attendees", value: "Brak uczestników do pobrania" },
  { locale: "pl", key: "ui.events.detail.tooltip.download_pdf", value: "Pobierz listę uczestników w formacie PDF" },

  // Error Messages
  { locale: "pl", key: "ui.events.detail.error.download_failed", value: "Nie udało się pobrać listy uczestników. Spróbuj ponownie." },
];

/**
 * Seed events detail modal translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_06_DetailModal:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Detail Modal Translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    // Upsert translations (insert new, update existing)
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
        "events-detail-modal"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded Events Detail Modal translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
