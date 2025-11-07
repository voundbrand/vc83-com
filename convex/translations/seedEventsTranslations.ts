/**
 * EVENTS TRANSLATIONS
 *
 * All UI translations for the Events Management window/app.
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
  { locale: "en", key: "ui.events.action.cancel_event", value: "Cancel" },
  { locale: "en", key: "ui.events.action.save", value: "Save Event" },
  { locale: "en", key: "ui.events.action.cancel_form", value: "Cancel" },
  { locale: "en", key: "ui.events.action.saving", value: "Saving..." },

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

  // Event Form - Basic Info
  { locale: "en", key: "ui.events.form.title_create", value: "Create Event" },
  { locale: "en", key: "ui.events.form.title_edit", value: "Edit Event" },
  { locale: "en", key: "ui.events.form.basic_info", value: "Basic Information" },
  { locale: "en", key: "ui.events.form.event_type", value: "Event Type" },
  { locale: "en", key: "ui.events.form.event_format", value: "Event Format" },
  { locale: "en", key: "ui.events.form.event_name", value: "Event Name" },
  { locale: "en", key: "ui.events.form.event_name_placeholder", value: "e.g., Tech Summit 2024" },
  { locale: "en", key: "ui.events.form.required", value: "*" },

  // Event Form - Date & Time
  { locale: "en", key: "ui.events.form.date_time", value: "Date & Time" },
  { locale: "en", key: "ui.events.form.start_date", value: "Start Date" },
  { locale: "en", key: "ui.events.form.start_time", value: "Start Time" },
  { locale: "en", key: "ui.events.form.end_date", value: "End Date" },
  { locale: "en", key: "ui.events.form.end_time", value: "End Time" },
  { locale: "en", key: "ui.events.form.timezone_note", value: "All times in {timezone}" },

  // Event Form - Location
  { locale: "en", key: "ui.events.form.location", value: "Location" },
  { locale: "en", key: "ui.events.form.location_placeholder", value: "e.g., 123 Main St, New York, NY 10001" },
  { locale: "en", key: "ui.events.form.validate_address", value: "Validate Address" },
  { locale: "en", key: "ui.events.form.validating", value: "Validating..." },
  { locale: "en", key: "ui.events.form.address_verified", value: "✓ Address Verified" },
  { locale: "en", key: "ui.events.form.formatted_address", value: "Formatted Address:" },
  { locale: "en", key: "ui.events.form.confidence", value: "Confidence:" },
  { locale: "en", key: "ui.events.form.get_directions", value: "Get Directions" },
  { locale: "en", key: "ui.events.form.view_on_maps", value: "View on Google Maps" },
  { locale: "en", key: "ui.events.form.address_error", value: "Address Validation Error" },
  { locale: "en", key: "ui.events.form.validation_failed", value: "Could not validate address. Please check the address and try again." },

  // Event Form - Capacity
  { locale: "en", key: "ui.events.form.capacity", value: "Capacity (optional)" },
  { locale: "en", key: "ui.events.form.capacity_placeholder", value: "Maximum number of attendees" },

  // Event Form - Description Section
  { locale: "en", key: "ui.events.form.description", value: "Detailed Description" },
  { locale: "en", key: "ui.events.form.description_placeholder", value: "Add a detailed description of your event..." },
  { locale: "en", key: "ui.events.form.description_help", value: "Rich text editor - format your event details with headings, lists, and links" },

  // Event Form - Media Section
  { locale: "en", key: "ui.events.form.media", value: "Media & Gallery" },
  { locale: "en", key: "ui.events.form.videos", value: "Videos" },
  { locale: "en", key: "ui.events.form.video_url", value: "Video URL" },
  { locale: "en", key: "ui.events.form.video_url_placeholder", value: "YouTube or Vimeo URL" },
  { locale: "en", key: "ui.events.form.video_provider", value: "Provider" },
  { locale: "en", key: "ui.events.form.video_loop", value: "Loop video" },
  { locale: "en", key: "ui.events.form.video_autostart", value: "Autostart" },
  { locale: "en", key: "ui.events.form.add_video", value: "+ Add Video" },
  { locale: "en", key: "ui.events.form.remove_video", value: "Remove" },
  { locale: "en", key: "ui.events.form.show_video_first", value: "Show video before images in gallery" },
  { locale: "en", key: "ui.events.form.save_media", value: "Save Media" },

  // Event Form - Agenda Section
  { locale: "en", key: "ui.events.form.agenda", value: "Event Agenda" },
  { locale: "en", key: "ui.events.form.agenda_item", value: "Agenda Item" },
  { locale: "en", key: "ui.events.form.agenda_date", value: "Date" },
  { locale: "en", key: "ui.events.form.agenda_time", value: "Start Time" },
  { locale: "en", key: "ui.events.form.agenda_end_time", value: "End Time (optional)" },
  { locale: "en", key: "ui.events.form.agenda_title", value: "Session Title" },
  { locale: "en", key: "ui.events.form.agenda_description", value: "Description (optional)" },
  { locale: "en", key: "ui.events.form.agenda_speaker", value: "Speaker (optional)" },
  { locale: "en", key: "ui.events.form.agenda_location", value: "Location (optional)" },
  { locale: "en", key: "ui.events.form.add_agenda_item", value: "+ Add Agenda Item" },
  { locale: "en", key: "ui.events.form.remove_agenda_item", value: "Remove" },
  { locale: "en", key: "ui.events.form.save_agenda", value: "Save Agenda" },

  // Event Form - Sponsors
  { locale: "en", key: "ui.events.form.sponsors", value: "Event Sponsors" },
  { locale: "en", key: "ui.events.form.add_sponsor", value: "+ Add Sponsor" },
  { locale: "en", key: "ui.events.form.sponsor_org", value: "Sponsor Organization" },
  { locale: "en", key: "ui.events.form.sponsor_level", value: "Sponsorship Level" },
  { locale: "en", key: "ui.events.form.sponsor_platinum", value: "Platinum" },
  { locale: "en", key: "ui.events.form.sponsor_gold", value: "Gold" },
  { locale: "en", key: "ui.events.form.sponsor_silver", value: "Silver" },
  { locale: "en", key: "ui.events.form.sponsor_bronze", value: "Bronze" },
  { locale: "en", key: "ui.events.form.sponsor_community", value: "Community" },
  { locale: "en", key: "ui.events.form.add_sponsor_button", value: "Add Sponsor" },
  { locale: "en", key: "ui.events.form.cancel_sponsor", value: "Cancel" },
  { locale: "en", key: "ui.events.form.remove_sponsor", value: "Remove" },
  { locale: "en", key: "ui.events.form.no_sponsors", value: "No sponsors added yet" },

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
  { locale: "de", key: "ui.events.action.cancel_event", value: "Abbrechen" },
  { locale: "de", key: "ui.events.action.save", value: "Veranstaltung speichern" },
  { locale: "de", key: "ui.events.action.cancel_form", value: "Abbrechen" },
  { locale: "de", key: "ui.events.action.saving", value: "Speichern..." },

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

  // Event Form - Basic Info
  { locale: "de", key: "ui.events.form.title_create", value: "Veranstaltung erstellen" },
  { locale: "de", key: "ui.events.form.title_edit", value: "Veranstaltung bearbeiten" },
  { locale: "de", key: "ui.events.form.basic_info", value: "Grundinformationen" },
  { locale: "de", key: "ui.events.form.event_type", value: "Veranstaltungstyp" },
  { locale: "de", key: "ui.events.form.event_format", value: "Veranstaltungsformat" },
  { locale: "de", key: "ui.events.form.event_name", value: "Veranstaltungsname" },
  { locale: "de", key: "ui.events.form.event_name_placeholder", value: "z.B. Tech Summit 2024" },
  { locale: "de", key: "ui.events.form.required", value: "*" },

  // Event Form - Date & Time
  { locale: "de", key: "ui.events.form.date_time", value: "Datum & Uhrzeit" },
  { locale: "de", key: "ui.events.form.start_date", value: "Startdatum" },
  { locale: "de", key: "ui.events.form.start_time", value: "Startzeit" },
  { locale: "de", key: "ui.events.form.end_date", value: "Enddatum" },
  { locale: "de", key: "ui.events.form.end_time", value: "Endzeit" },
  { locale: "de", key: "ui.events.form.timezone_note", value: "Alle Zeiten in {timezone}" },

  // Event Form - Location
  { locale: "de", key: "ui.events.form.location", value: "Ort" },
  { locale: "de", key: "ui.events.form.location_placeholder", value: "z.B. Hauptstraße 123, 10115 Berlin" },
  { locale: "de", key: "ui.events.form.validate_address", value: "Adresse validieren" },
  { locale: "de", key: "ui.events.form.validating", value: "Validiere..." },
  { locale: "de", key: "ui.events.form.address_verified", value: "✓ Adresse verifiziert" },
  { locale: "de", key: "ui.events.form.formatted_address", value: "Formatierte Adresse:" },
  { locale: "de", key: "ui.events.form.confidence", value: "Vertrauenswürdigkeit:" },
  { locale: "de", key: "ui.events.form.get_directions", value: "Routenplaner" },
  { locale: "de", key: "ui.events.form.view_on_maps", value: "In Google Maps anzeigen" },
  { locale: "de", key: "ui.events.form.address_error", value: "Adressvalidierungsfehler" },
  { locale: "de", key: "ui.events.form.validation_failed", value: "Adresse konnte nicht validiert werden. Bitte überprüfen Sie die Adresse und versuchen Sie es erneut." },

  // Event Form - Capacity
  { locale: "de", key: "ui.events.form.capacity", value: "Kapazität (optional)" },
  { locale: "de", key: "ui.events.form.capacity_placeholder", value: "Maximale Teilnehmerzahl" },

  // Event Form - Description Section
  { locale: "de", key: "ui.events.form.description", value: "Detaillierte Beschreibung" },
  { locale: "de", key: "ui.events.form.description_placeholder", value: "Fügen Sie eine detaillierte Beschreibung Ihrer Veranstaltung hinzu..." },
  { locale: "de", key: "ui.events.form.description_help", value: "Rich-Text-Editor - formatieren Sie Ihre Veranstaltungsdetails mit Überschriften, Listen und Links" },

  // Event Form - Media Section
  { locale: "de", key: "ui.events.form.media", value: "Medien & Galerie" },
  { locale: "de", key: "ui.events.form.videos", value: "Videos" },
  { locale: "de", key: "ui.events.form.video_url", value: "Video-URL" },
  { locale: "de", key: "ui.events.form.video_url_placeholder", value: "YouTube- oder Vimeo-URL" },
  { locale: "de", key: "ui.events.form.video_provider", value: "Anbieter" },
  { locale: "de", key: "ui.events.form.video_loop", value: "Video wiederholen" },
  { locale: "de", key: "ui.events.form.video_autostart", value: "Autostart" },
  { locale: "de", key: "ui.events.form.add_video", value: "+ Video hinzufügen" },
  { locale: "de", key: "ui.events.form.remove_video", value: "Entfernen" },
  { locale: "de", key: "ui.events.form.show_video_first", value: "Video vor Bildern in der Galerie anzeigen" },
  { locale: "de", key: "ui.events.form.save_media", value: "Medien speichern" },

  // Event Form - Agenda Section
  { locale: "de", key: "ui.events.form.agenda", value: "Veranstaltungsagenda" },
  { locale: "de", key: "ui.events.form.agenda_item", value: "Agendapunkt" },
  { locale: "de", key: "ui.events.form.agenda_date", value: "Datum" },
  { locale: "de", key: "ui.events.form.agenda_time", value: "Startzeit" },
  { locale: "de", key: "ui.events.form.agenda_end_time", value: "Endzeit (optional)" },
  { locale: "de", key: "ui.events.form.agenda_title", value: "Sitzungstitel" },
  { locale: "de", key: "ui.events.form.agenda_description", value: "Beschreibung (optional)" },
  { locale: "de", key: "ui.events.form.agenda_speaker", value: "Sprecher (optional)" },
  { locale: "de", key: "ui.events.form.agenda_location", value: "Ort (optional)" },
  { locale: "de", key: "ui.events.form.add_agenda_item", value: "+ Agendapunkt hinzufügen" },
  { locale: "de", key: "ui.events.form.remove_agenda_item", value: "Entfernen" },
  { locale: "de", key: "ui.events.form.save_agenda", value: "Agenda speichern" },

  // Event Form - Sponsors
  { locale: "de", key: "ui.events.form.sponsors", value: "Veranstaltungssponsoren" },
  { locale: "de", key: "ui.events.form.add_sponsor", value: "+ Sponsor hinzufügen" },
  { locale: "de", key: "ui.events.form.sponsor_org", value: "Sponsororganisation" },
  { locale: "de", key: "ui.events.form.sponsor_level", value: "Sponsorenstufe" },
  { locale: "de", key: "ui.events.form.sponsor_platinum", value: "Platin" },
  { locale: "de", key: "ui.events.form.sponsor_gold", value: "Gold" },
  { locale: "de", key: "ui.events.form.sponsor_silver", value: "Silber" },
  { locale: "de", key: "ui.events.form.sponsor_bronze", value: "Bronze" },
  { locale: "de", key: "ui.events.form.sponsor_community", value: "Community" },
  { locale: "de", key: "ui.events.form.add_sponsor_button", value: "Sponsor hinzufügen" },
  { locale: "de", key: "ui.events.form.cancel_sponsor", value: "Abbrechen" },
  { locale: "de", key: "ui.events.form.remove_sponsor", value: "Entfernen" },
  { locale: "de", key: "ui.events.form.no_sponsors", value: "Noch keine Sponsoren hinzugefügt" },

  // Event Format Options
  { locale: "de", key: "ui.events.format.in_person", value: "Präsenz" },
  { locale: "de", key: "ui.events.format.online", value: "Online" },
  { locale: "de", key: "ui.events.format.hybrid", value: "Hybrid" },
];

/**
 * Seed events translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEventsTranslations:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Translations...");

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

    console.log(`✅ Seeded Events translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
