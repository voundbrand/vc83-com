/**
 * EVENTS TRANSLATIONS - MAIN
 *
 * Core translations for Events window:
 * - Header
 * - Actions (buttons)
 * - List view
 * - Event types
 * - Event statuses
 * - Event formats
 *
 * Namespace: ui.events
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
  // Main Window - Header
  { locale: "en", key: "ui.events.header.title", value: "Events" },
  { locale: "en", key: "ui.events.header.description", value: "Manage conferences, workshops, concerts, and meetups" },
  { locale: "en", key: "ui.events.header.loading", value: "Loading events..." },
  { locale: "en", key: "ui.events.header.login_required", value: "Please log in to access events" },
  { locale: "en", key: "ui.events.header.no_org_title", value: "No Organization Selected" },
  { locale: "en", key: "ui.events.header.no_org_desc", value: "Please select an organization to manage events" },

  // Actions
  { locale: "en", key: "ui.events.action.create", value: "Create Event" },
  { locale: "en", key: "ui.events.action.back_to_list", value: "Back to List" },
  { locale: "en", key: "ui.events.action.edit", value: "Edit" },
  { locale: "en", key: "ui.events.action.publish", value: "Publish" },
  { locale: "en", key: "ui.events.action.cancel", value: "Cancel" },
  { locale: "en", key: "ui.events.action.delete", value: "Delete" },
  { locale: "en", key: "ui.events.action.save", value: "Save Event" },
  { locale: "en", key: "ui.events.action.cancel_form", value: "Cancel" },
  { locale: "en", key: "ui.events.action.saving", value: "Saving..." },

  // Confirmation Modals
  { locale: "en", key: "ui.events.list.confirm_cancel_title", value: "Cancel Event" },
  { locale: "en", key: "ui.events.list.confirm_cancel_message", value: "Are you sure you want to cancel \"{name}\"?\n\nThis will mark the event as cancelled but it will remain in the system." },
  { locale: "en", key: "ui.events.list.confirm_delete_title", value: "Delete Event" },
  { locale: "en", key: "ui.events.list.confirm_delete_message", value: "Are you sure you want to permanently delete \"{name}\"?\n\nThis action cannot be undone!" },
  { locale: "en", key: "ui.events.list.confirm_publish_title", value: "Publish Event" },
  { locale: "en", key: "ui.events.list.confirm_publish_message", value: "Publish \"{name}\" and make it visible to attendees?" },

  // Events List
  { locale: "en", key: "ui.events.list.no_events", value: "No events yet. Click \"Create Event\" to get started." },
  { locale: "en", key: "ui.events.list.filter.all_types", value: "All Types" },
  { locale: "en", key: "ui.events.list.filter.all_statuses", value: "All Statuses" },
  { locale: "en", key: "ui.events.list.capacity", value: "Capacity: {count} attendees" },
  { locale: "en", key: "ui.events.list.delete_confirm", value: "Are you sure you want to cancel this event?" },
  { locale: "en", key: "ui.events.list.delete_error", value: "Failed to delete event" },
  { locale: "en", key: "ui.events.list.publish_error", value: "Failed to publish event" },

  // Event Types
  { locale: "en", key: "ui.events.type.conference", value: "📊 Conference" },
  { locale: "en", key: "ui.events.type.workshop", value: "🛠️ Workshop" },
  { locale: "en", key: "ui.events.type.concert", value: "🎵 Concert" },
  { locale: "en", key: "ui.events.type.meetup", value: "👥 Meetup" },

  // Event Statuses
  { locale: "en", key: "ui.events.status.draft", value: "Draft" },
  { locale: "en", key: "ui.events.status.published", value: "Published" },
  { locale: "en", key: "ui.events.status.in_progress", value: "In Progress" },
  { locale: "en", key: "ui.events.status.completed", value: "Completed" },
  { locale: "en", key: "ui.events.status.cancelled", value: "Cancelled" },

  // Event Format Options
  { locale: "en", key: "ui.events.format.in_person", value: "In-Person" },
  { locale: "en", key: "ui.events.format.online", value: "Online" },
  { locale: "en", key: "ui.events.format.hybrid", value: "Hybrid" },

  // ===== GERMAN =====
  // Main Window - Header
  { locale: "de", key: "ui.events.header.title", value: "Veranstaltungen" },
  { locale: "de", key: "ui.events.header.description", value: "Verwalten Sie Konferenzen, Workshops, Konzerte und Treffen" },
  { locale: "de", key: "ui.events.header.loading", value: "Veranstaltungen werden geladen..." },
  { locale: "de", key: "ui.events.header.login_required", value: "Bitte melden Sie sich an, um auf Veranstaltungen zuzugreifen" },
  { locale: "de", key: "ui.events.header.no_org_title", value: "Keine Organisation ausgewählt" },
  { locale: "de", key: "ui.events.header.no_org_desc", value: "Bitte wählen Sie eine Organisation aus, um Veranstaltungen zu verwalten" },

  // Actions
  { locale: "de", key: "ui.events.action.create", value: "Veranstaltung erstellen" },
  { locale: "de", key: "ui.events.action.back_to_list", value: "Zurück zur Liste" },
  { locale: "de", key: "ui.events.action.edit", value: "Bearbeiten" },
  { locale: "de", key: "ui.events.action.publish", value: "Veröffentlichen" },
  { locale: "de", key: "ui.events.action.cancel", value: "Stornieren" },
  { locale: "de", key: "ui.events.action.delete", value: "Löschen" },
  { locale: "de", key: "ui.events.action.save", value: "Veranstaltung speichern" },
  { locale: "de", key: "ui.events.action.cancel_form", value: "Abbrechen" },
  { locale: "de", key: "ui.events.action.saving", value: "Speichern..." },

  // Confirmation Modals
  { locale: "de", key: "ui.events.list.confirm_cancel_title", value: "Veranstaltung stornieren" },
  { locale: "de", key: "ui.events.list.confirm_cancel_message", value: "Möchten Sie \"{name}\" wirklich stornieren?\n\nDies markiert die Veranstaltung als storniert, aber sie bleibt im System." },
  { locale: "de", key: "ui.events.list.confirm_delete_title", value: "Veranstaltung löschen" },
  { locale: "de", key: "ui.events.list.confirm_delete_message", value: "Möchten Sie \"{name}\" wirklich dauerhaft löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!" },
  { locale: "de", key: "ui.events.list.confirm_publish_title", value: "Veranstaltung veröffentlichen" },
  { locale: "de", key: "ui.events.list.confirm_publish_message", value: "\"{name}\" veröffentlichen und für Teilnehmer sichtbar machen?" },

  // Events List
  { locale: "de", key: "ui.events.list.no_events", value: "Noch keine Veranstaltungen. Klicken Sie auf \"Veranstaltung erstellen\", um zu beginnen." },
  { locale: "de", key: "ui.events.list.filter.all_types", value: "Alle Typen" },
  { locale: "de", key: "ui.events.list.filter.all_statuses", value: "Alle Status" },
  { locale: "de", key: "ui.events.list.capacity", value: "Kapazität: {count} Teilnehmer" },
  { locale: "de", key: "ui.events.list.delete_confirm", value: "Möchten Sie diese Veranstaltung wirklich absagen?" },
  { locale: "de", key: "ui.events.list.delete_error", value: "Veranstaltung konnte nicht gelöscht werden" },
  { locale: "de", key: "ui.events.list.publish_error", value: "Veranstaltung konnte nicht veröffentlicht werden" },

  // Event Types
  { locale: "de", key: "ui.events.type.conference", value: "📊 Konferenz" },
  { locale: "de", key: "ui.events.type.workshop", value: "🛠️ Workshop" },
  { locale: "de", key: "ui.events.type.concert", value: "🎵 Konzert" },
  { locale: "de", key: "ui.events.type.meetup", value: "👥 Treffen" },

  // Event Statuses
  { locale: "de", key: "ui.events.status.draft", value: "Entwurf" },
  { locale: "de", key: "ui.events.status.published", value: "Veröffentlicht" },
  { locale: "de", key: "ui.events.status.in_progress", value: "In Bearbeitung" },
  { locale: "de", key: "ui.events.status.completed", value: "Abgeschlossen" },
  { locale: "de", key: "ui.events.status.cancelled", value: "Abgesagt" },

  // Event Format Options
  { locale: "de", key: "ui.events.format.in_person", value: "Präsenz" },
  { locale: "de", key: "ui.events.format.online", value: "Online" },
  { locale: "de", key: "ui.events.format.hybrid", value: "Hybrid" },

  // ===== SPANISH =====
  // Main Window - Header
  { locale: "es", key: "ui.events.header.title", value: "Eventos" },
  { locale: "es", key: "ui.events.header.description", value: "Gestiona conferencias, talleres, conciertos y encuentros" },
  { locale: "es", key: "ui.events.header.loading", value: "Cargando eventos..." },
  { locale: "es", key: "ui.events.header.login_required", value: "Por favor inicia sesión para acceder a los eventos" },
  { locale: "es", key: "ui.events.header.no_org_title", value: "No hay organización seleccionada" },
  { locale: "es", key: "ui.events.header.no_org_desc", value: "Por favor selecciona una organización para gestionar eventos" },

  // Actions
  { locale: "es", key: "ui.events.action.create", value: "Crear evento" },
  { locale: "es", key: "ui.events.action.back_to_list", value: "Volver a la lista" },
  { locale: "es", key: "ui.events.action.edit", value: "Editar" },
  { locale: "es", key: "ui.events.action.publish", value: "Publicar" },
  { locale: "es", key: "ui.events.action.cancel_event", value: "Cancelar" },
  { locale: "es", key: "ui.events.action.save", value: "Guardar evento" },
  { locale: "es", key: "ui.events.action.cancel_form", value: "Cancelar" },
  { locale: "es", key: "ui.events.action.saving", value: "Guardando..." },

  // Events List
  { locale: "es", key: "ui.events.list.no_events", value: "Aún no hay eventos. Haz clic en \"Crear evento\" para comenzar." },
  { locale: "es", key: "ui.events.list.filter.all_types", value: "Todos los tipos" },
  { locale: "es", key: "ui.events.list.filter.all_statuses", value: "Todos los estados" },
  { locale: "es", key: "ui.events.list.capacity", value: "Capacidad: {count} asistentes" },
  { locale: "es", key: "ui.events.list.delete_confirm", value: "¿Estás seguro de que quieres cancelar este evento?" },
  { locale: "es", key: "ui.events.list.delete_error", value: "Error al eliminar el evento" },
  { locale: "es", key: "ui.events.list.publish_error", value: "Error al publicar el evento" },

  // Event Types
  { locale: "es", key: "ui.events.type.conference", value: "📊 Conferencia" },
  { locale: "es", key: "ui.events.type.workshop", value: "🛠️ Taller" },
  { locale: "es", key: "ui.events.type.concert", value: "🎵 Concierto" },
  { locale: "es", key: "ui.events.type.meetup", value: "👥 Encuentro" },

  // Event Statuses
  { locale: "es", key: "ui.events.status.draft", value: "Borrador" },
  { locale: "es", key: "ui.events.status.published", value: "Publicado" },
  { locale: "es", key: "ui.events.status.in_progress", value: "En progreso" },
  { locale: "es", key: "ui.events.status.completed", value: "Completado" },
  { locale: "es", key: "ui.events.status.cancelled", value: "Cancelado" },

  // Event Format Options
  { locale: "es", key: "ui.events.format.in_person", value: "Presencial" },
  { locale: "es", key: "ui.events.format.online", value: "En línea" },
  { locale: "es", key: "ui.events.format.hybrid", value: "Híbrido" },

  // ===== FRENCH =====
  // Main Window - Header
  { locale: "fr", key: "ui.events.header.title", value: "Événements" },
  { locale: "fr", key: "ui.events.header.description", value: "Gérez les conférences, ateliers, concerts et rencontres" },
  { locale: "fr", key: "ui.events.header.loading", value: "Chargement des événements..." },
  { locale: "fr", key: "ui.events.header.login_required", value: "Veuillez vous connecter pour accéder aux événements" },
  { locale: "fr", key: "ui.events.header.no_org_title", value: "Aucune organisation sélectionnée" },
  { locale: "fr", key: "ui.events.header.no_org_desc", value: "Veuillez sélectionner une organisation pour gérer les événements" },

  // Actions
  { locale: "fr", key: "ui.events.action.create", value: "Créer un événement" },
  { locale: "fr", key: "ui.events.action.back_to_list", value: "Retour à la liste" },
  { locale: "fr", key: "ui.events.action.edit", value: "Modifier" },
  { locale: "fr", key: "ui.events.action.publish", value: "Publier" },
  { locale: "fr", key: "ui.events.action.cancel_event", value: "Annuler" },
  { locale: "fr", key: "ui.events.action.save", value: "Enregistrer l'événement" },
  { locale: "fr", key: "ui.events.action.cancel_form", value: "Annuler" },
  { locale: "fr", key: "ui.events.action.saving", value: "Enregistrement..." },

  // Events List
  { locale: "fr", key: "ui.events.list.no_events", value: "Aucun événement pour le moment. Cliquez sur \"Créer un événement\" pour commencer." },
  { locale: "fr", key: "ui.events.list.filter.all_types", value: "Tous les types" },
  { locale: "fr", key: "ui.events.list.filter.all_statuses", value: "Tous les statuts" },
  { locale: "fr", key: "ui.events.list.capacity", value: "Capacité : {count} participants" },
  { locale: "fr", key: "ui.events.list.delete_confirm", value: "Êtes-vous sûr de vouloir annuler cet événement ?" },
  { locale: "fr", key: "ui.events.list.delete_error", value: "Échec de la suppression de l'événement" },
  { locale: "fr", key: "ui.events.list.publish_error", value: "Échec de la publication de l'événement" },

  // Event Types
  { locale: "fr", key: "ui.events.type.conference", value: "📊 Conférence" },
  { locale: "fr", key: "ui.events.type.workshop", value: "🛠️ Atelier" },
  { locale: "fr", key: "ui.events.type.concert", value: "🎵 Concert" },
  { locale: "fr", key: "ui.events.type.meetup", value: "👥 Rencontre" },

  // Event Statuses
  { locale: "fr", key: "ui.events.status.draft", value: "Brouillon" },
  { locale: "fr", key: "ui.events.status.published", value: "Publié" },
  { locale: "fr", key: "ui.events.status.in_progress", value: "En cours" },
  { locale: "fr", key: "ui.events.status.completed", value: "Terminé" },
  { locale: "fr", key: "ui.events.status.cancelled", value: "Annulé" },

  // Event Format Options
  { locale: "fr", key: "ui.events.format.in_person", value: "En présentiel" },
  { locale: "fr", key: "ui.events.format.online", value: "En ligne" },
  { locale: "fr", key: "ui.events.format.hybrid", value: "Hybride" },

  // ===== JAPANESE =====
  // Main Window - Header
  { locale: "ja", key: "ui.events.header.title", value: "イベント" },
  { locale: "ja", key: "ui.events.header.description", value: "会議、ワークショップ、コンサート、ミートアップを管理" },
  { locale: "ja", key: "ui.events.header.loading", value: "イベントを読み込み中..." },
  { locale: "ja", key: "ui.events.header.login_required", value: "イベントにアクセスするにはログインしてください" },
  { locale: "ja", key: "ui.events.header.no_org_title", value: "組織が選択されていません" },
  { locale: "ja", key: "ui.events.header.no_org_desc", value: "イベントを管理するには組織を選択してください" },

  // Actions
  { locale: "ja", key: "ui.events.action.create", value: "イベントを作成" },
  { locale: "ja", key: "ui.events.action.back_to_list", value: "リストに戻る" },
  { locale: "ja", key: "ui.events.action.edit", value: "編集" },
  { locale: "ja", key: "ui.events.action.publish", value: "公開" },
  { locale: "ja", key: "ui.events.action.cancel_event", value: "キャンセル" },
  { locale: "ja", key: "ui.events.action.save", value: "イベントを保存" },
  { locale: "ja", key: "ui.events.action.cancel_form", value: "キャンセル" },
  { locale: "ja", key: "ui.events.action.saving", value: "保存中..." },

  // Events List
  { locale: "ja", key: "ui.events.list.no_events", value: "まだイベントがありません。「イベントを作成」をクリックして始めましょう。" },
  { locale: "ja", key: "ui.events.list.filter.all_types", value: "すべてのタイプ" },
  { locale: "ja", key: "ui.events.list.filter.all_statuses", value: "すべてのステータス" },
  { locale: "ja", key: "ui.events.list.capacity", value: "定員：{count}名" },
  { locale: "ja", key: "ui.events.list.delete_confirm", value: "このイベントをキャンセルしてもよろしいですか？" },
  { locale: "ja", key: "ui.events.list.delete_error", value: "イベントの削除に失敗しました" },
  { locale: "ja", key: "ui.events.list.publish_error", value: "イベントの公開に失敗しました" },

  // Event Types
  { locale: "ja", key: "ui.events.type.conference", value: "📊 会議" },
  { locale: "ja", key: "ui.events.type.workshop", value: "🛠️ ワークショップ" },
  { locale: "ja", key: "ui.events.type.concert", value: "🎵 コンサート" },
  { locale: "ja", key: "ui.events.type.meetup", value: "👥 ミートアップ" },

  // Event Statuses
  { locale: "ja", key: "ui.events.status.draft", value: "下書き" },
  { locale: "ja", key: "ui.events.status.published", value: "公開済み" },
  { locale: "ja", key: "ui.events.status.in_progress", value: "進行中" },
  { locale: "ja", key: "ui.events.status.completed", value: "完了" },
  { locale: "ja", key: "ui.events.status.cancelled", value: "キャンセル済み" },

  // Event Format Options
  { locale: "ja", key: "ui.events.format.in_person", value: "対面" },
  { locale: "ja", key: "ui.events.format.online", value: "オンライン" },
  { locale: "ja", key: "ui.events.format.hybrid", value: "ハイブリッド" },

  // ===== POLISH =====
  // Main Window - Header
  { locale: "pl", key: "ui.events.header.title", value: "Wydarzenia" },
  { locale: "pl", key: "ui.events.header.description", value: "Zarządzaj konferencjami, warsztatami, koncertami i spotkaniami" },
  { locale: "pl", key: "ui.events.header.loading", value: "Ładowanie wydarzeń..." },
  { locale: "pl", key: "ui.events.header.login_required", value: "Zaloguj się, aby uzyskać dostęp do wydarzeń" },
  { locale: "pl", key: "ui.events.header.no_org_title", value: "Nie wybrano organizacji" },
  { locale: "pl", key: "ui.events.header.no_org_desc", value: "Wybierz organizację, aby zarządzać wydarzeniami" },

  // Actions
  { locale: "pl", key: "ui.events.action.create", value: "Utwórz wydarzenie" },
  { locale: "pl", key: "ui.events.action.back_to_list", value: "Powrót do listy" },
  { locale: "pl", key: "ui.events.action.edit", value: "Edytuj" },
  { locale: "pl", key: "ui.events.action.publish", value: "Opublikuj" },
  { locale: "pl", key: "ui.events.action.cancel_event", value: "Anuluj" },
  { locale: "pl", key: "ui.events.action.save", value: "Zapisz wydarzenie" },
  { locale: "pl", key: "ui.events.action.cancel_form", value: "Anuluj" },
  { locale: "pl", key: "ui.events.action.saving", value: "Zapisywanie..." },

  // Events List
  { locale: "pl", key: "ui.events.list.no_events", value: "Brak wydarzeń. Kliknij \"Utwórz wydarzenie\", aby rozpocząć." },
  { locale: "pl", key: "ui.events.list.filter.all_types", value: "Wszystkie typy" },
  { locale: "pl", key: "ui.events.list.filter.all_statuses", value: "Wszystkie statusy" },
  { locale: "pl", key: "ui.events.list.capacity", value: "Pojemność: {count} uczestników" },
  { locale: "pl", key: "ui.events.list.delete_confirm", value: "Czy na pewno chcesz anulować to wydarzenie?" },
  { locale: "pl", key: "ui.events.list.delete_error", value: "Nie udało się usunąć wydarzenia" },
  { locale: "pl", key: "ui.events.list.publish_error", value: "Nie udało się opublikować wydarzenia" },

  // Event Types
  { locale: "pl", key: "ui.events.type.conference", value: "📊 Konferencja" },
  { locale: "pl", key: "ui.events.type.workshop", value: "🛠️ Warsztat" },
  { locale: "pl", key: "ui.events.type.concert", value: "🎵 Koncert" },
  { locale: "pl", key: "ui.events.type.meetup", value: "👥 Spotkanie" },

  // Event Statuses
  { locale: "pl", key: "ui.events.status.draft", value: "Szkic" },
  { locale: "pl", key: "ui.events.status.published", value: "Opublikowane" },
  { locale: "pl", key: "ui.events.status.in_progress", value: "W trakcie" },
  { locale: "pl", key: "ui.events.status.completed", value: "Zakończone" },
  { locale: "pl", key: "ui.events.status.cancelled", value: "Anulowane" },

  // Event Format Options
  { locale: "pl", key: "ui.events.format.in_person", value: "Stacjonarne" },
  { locale: "pl", key: "ui.events.format.online", value: "Online" },
  { locale: "pl", key: "ui.events.format.hybrid", value: "Hybrydowe" },
];

/**
 * Seed events main translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_00_Main:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Main Translations...");

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
        "events-window"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded Events Main translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
