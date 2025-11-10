/**
 * EVENTS TRANSLATIONS - FORM BASICS
 *
 * Form basic information translations:
 * - Form titles
 * - Basic info section
 * - Event type & format
 * - Date & time
 * - Location & address validation
 * - Capacity
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
  // Form Titles
  { locale: "en", key: "ui.events.form.title_create", value: "Create Event" },
  { locale: "en", key: "ui.events.form.title_edit", value: "Edit Event" },
  { locale: "en", key: "ui.events.form.required", value: "*" },

  // Basic Information
  { locale: "en", key: "ui.events.form.basic_info", value: "Basic Information" },
  { locale: "en", key: "ui.events.form.event_type", value: "Event Type" },
  { locale: "en", key: "ui.events.form.event_type_conference", value: "Conference - Multi-track professional event" },
  { locale: "en", key: "ui.events.form.event_type_workshop", value: "Workshop - Hands-on training session" },
  { locale: "en", key: "ui.events.form.event_type_concert", value: "Concert - Live music performance" },
  { locale: "en", key: "ui.events.form.event_type_meetup", value: "Meetup - Casual networking event" },

  // Event Format
  { locale: "en", key: "ui.events.form.event_format", value: "Event Format" },
  { locale: "en", key: "ui.events.form.event_format_in_person", value: "In-Person - Physical venue attendance" },
  { locale: "en", key: "ui.events.form.event_format_online", value: "Online - Virtual/remote attendance" },
  { locale: "en", key: "ui.events.form.event_format_hybrid", value: "Hybrid - Both in-person and virtual options" },
  { locale: "en", key: "ui.events.form.event_format_help", value: "How will attendees participate in this event?" },

  // Event Name
  { locale: "en", key: "ui.events.form.event_name", value: "Event Name" },
  { locale: "en", key: "ui.events.form.event_name_placeholder", value: "Tech Summit 2025, Design Workshop, Jazz Night, etc." },

  // Date & Time
  { locale: "en", key: "ui.events.form.date_time", value: "Date & Time" },
  { locale: "en", key: "ui.events.form.start_date", value: "Start Date" },
  { locale: "en", key: "ui.events.form.start_time", value: "Start Time" },
  { locale: "en", key: "ui.events.form.end_date", value: "End Date" },
  { locale: "en", key: "ui.events.form.end_time", value: "End Time" },
  { locale: "en", key: "ui.events.form.timezone_note", value: "Times are in your organization's timezone: {timezone}" },

  // Location & Address Validation
  { locale: "en", key: "ui.events.form.location", value: "Location" },
  { locale: "en", key: "ui.events.form.location_placeholder", value: "San Francisco Convention Center, 747 Howard St, SF" },
  { locale: "en", key: "ui.events.form.validate_address", value: "Verify" },
  { locale: "en", key: "ui.events.form.validating", value: "Validating..." },
  { locale: "en", key: "ui.events.form.address_verified", value: "Address Verified!" },
  { locale: "en", key: "ui.events.form.address_not_verified", value: "Could not verify address" },
  { locale: "en", key: "ui.events.form.formatted_address", value: "Formatted Address:" },
  { locale: "en", key: "ui.events.form.confidence", value: "Confidence:" },
  { locale: "en", key: "ui.events.form.get_directions", value: "Get Directions" },
  { locale: "en", key: "ui.events.form.view_on_maps", value: "View on Google Maps" },
  { locale: "en", key: "ui.events.form.open_google_maps", value: "Open in Google Maps" },
  { locale: "en", key: "ui.events.form.open_radar_maps", value: "Open in Radar Maps" },
  { locale: "en", key: "ui.events.form.address_error", value: "Address Validation Error" },
  { locale: "en", key: "ui.events.form.validation_failed", value: "Please check the location and try again" },
  { locale: "en", key: "ui.events.form.validation_tip", value: "💡 Tip: Include street number, postal code, and country for best results" },
  { locale: "en", key: "ui.events.form.validation_help", value: "Click \"Verify\" to validate the address and get automatic directions for attendees" },

  // Capacity
  { locale: "en", key: "ui.events.form.capacity", value: "Capacity (Optional)" },
  { locale: "en", key: "ui.events.form.capacity_placeholder", value: "Maximum number of attendees" },
  { locale: "en", key: "ui.events.form.capacity_help", value: "Leave empty for unlimited capacity" },

  // Info & Alerts
  { locale: "en", key: "ui.events.form.info_draft", value: "Events start in \"Draft\" status. Click \"Publish\" to make them visible to attendees." },
  { locale: "en", key: "ui.events.form.info_new_event", value: "Note: Media and Sponsors can only be added after saving the event. Description is available now." },
  { locale: "en", key: "ui.events.form.alert_save_first", value: "Please save the event first before adding sponsors" },
  { locale: "en", key: "ui.events.form.alert_select_sponsor", value: "Please select a sponsor organization" },
  { locale: "en", key: "ui.events.form.alert_date_time_required", value: "Please provide both start and end date/time" },
  { locale: "en", key: "ui.events.form.alert_save_failed", value: "Failed to save event. Please try again." },

  // ===== GERMAN =====
  // Form Titles
  { locale: "de", key: "ui.events.form.title_create", value: "Veranstaltung erstellen" },
  { locale: "de", key: "ui.events.form.title_edit", value: "Veranstaltung bearbeiten" },
  { locale: "de", key: "ui.events.form.required", value: "*" },

  // Basic Information
  { locale: "de", key: "ui.events.form.basic_info", value: "Grundinformationen" },
  { locale: "de", key: "ui.events.form.event_type", value: "Veranstaltungstyp" },
  { locale: "de", key: "ui.events.form.event_type_conference", value: "Konferenz - Professionelle Mehrkanal-Veranstaltung" },
  { locale: "de", key: "ui.events.form.event_type_workshop", value: "Workshop - Praktische Schulung" },
  { locale: "de", key: "ui.events.form.event_type_concert", value: "Konzert - Live-Musikauftritt" },
  { locale: "de", key: "ui.events.form.event_type_meetup", value: "Treffen - Lockere Networking-Veranstaltung" },

  // Event Format
  { locale: "de", key: "ui.events.form.event_format", value: "Veranstaltungsformat" },
  { locale: "de", key: "ui.events.form.event_format_in_person", value: "Präsenz - Physische Teilnahme vor Ort" },
  { locale: "de", key: "ui.events.form.event_format_online", value: "Online - Virtuelle/Remote-Teilnahme" },
  { locale: "de", key: "ui.events.form.event_format_hybrid", value: "Hybrid - Sowohl Präsenz als auch virtuelle Optionen" },
  { locale: "de", key: "ui.events.form.event_format_help", value: "Wie werden Teilnehmer an dieser Veranstaltung teilnehmen?" },

  // Event Name
  { locale: "de", key: "ui.events.form.event_name", value: "Veranstaltungsname" },
  { locale: "de", key: "ui.events.form.event_name_placeholder", value: "Tech Summit 2025, Design Workshop, Jazz Abend, etc." },

  // Date & Time
  { locale: "de", key: "ui.events.form.date_time", value: "Datum & Uhrzeit" },
  { locale: "de", key: "ui.events.form.start_date", value: "Startdatum" },
  { locale: "de", key: "ui.events.form.start_time", value: "Startzeit" },
  { locale: "de", key: "ui.events.form.end_date", value: "Enddatum" },
  { locale: "de", key: "ui.events.form.end_time", value: "Endzeit" },
  { locale: "de", key: "ui.events.form.timezone_note", value: "Zeiten sind in der Zeitzone Ihrer Organisation: {timezone}" },

  // Location & Address Validation
  { locale: "de", key: "ui.events.form.location", value: "Ort" },
  { locale: "de", key: "ui.events.form.location_placeholder", value: "Berliner Kongresszentrum, Alexanderplatz 1, Berlin" },
  { locale: "de", key: "ui.events.form.validate_address", value: "Verifizieren" },
  { locale: "de", key: "ui.events.form.validating", value: "Validiere..." },
  { locale: "de", key: "ui.events.form.address_verified", value: "Adresse verifiziert!" },
  { locale: "de", key: "ui.events.form.address_not_verified", value: "Adresse konnte nicht verifiziert werden" },
  { locale: "de", key: "ui.events.form.formatted_address", value: "Formatierte Adresse:" },
  { locale: "de", key: "ui.events.form.confidence", value: "Vertrauenswürdigkeit:" },
  { locale: "de", key: "ui.events.form.get_directions", value: "Routenplaner" },
  { locale: "de", key: "ui.events.form.view_on_maps", value: "In Google Maps anzeigen" },
  { locale: "de", key: "ui.events.form.open_google_maps", value: "In Google Maps öffnen" },
  { locale: "de", key: "ui.events.form.open_radar_maps", value: "In Radar Maps öffnen" },
  { locale: "de", key: "ui.events.form.address_error", value: "Adressvalidierungsfehler" },
  { locale: "de", key: "ui.events.form.validation_failed", value: "Bitte überprüfen Sie den Ort und versuchen Sie es erneut" },
  { locale: "de", key: "ui.events.form.validation_tip", value: "💡 Tipp: Geben Sie Hausnummer, Postleitzahl und Land für beste Ergebnisse an" },
  { locale: "de", key: "ui.events.form.validation_help", value: "Klicken Sie auf \"Verifizieren\", um die Adresse zu validieren und automatische Wegbeschreibungen für Teilnehmer zu erhalten" },

  // Capacity
  { locale: "de", key: "ui.events.form.capacity", value: "Kapazität (Optional)" },
  { locale: "de", key: "ui.events.form.capacity_placeholder", value: "Maximale Teilnehmerzahl" },
  { locale: "de", key: "ui.events.form.capacity_help", value: "Leer lassen für unbegrenzte Kapazität" },

  // Info & Alerts
  { locale: "de", key: "ui.events.form.info_draft", value: "Veranstaltungen beginnen im Status \"Entwurf\". Klicken Sie auf \"Veröffentlichen\", um sie für Teilnehmer sichtbar zu machen." },
  { locale: "de", key: "ui.events.form.info_new_event", value: "Hinweis: Medien und Sponsoren können erst nach dem Speichern der Veranstaltung hinzugefügt werden. Beschreibung ist jetzt verfügbar." },
  { locale: "de", key: "ui.events.form.alert_save_first", value: "Bitte speichern Sie die Veranstaltung zuerst, bevor Sie Sponsoren hinzufügen" },
  { locale: "de", key: "ui.events.form.alert_select_sponsor", value: "Bitte wählen Sie eine Sponsororganisation aus" },
  { locale: "de", key: "ui.events.form.alert_date_time_required", value: "Bitte geben Sie sowohl Start- als auch Enddatum/-zeit an" },
  { locale: "de", key: "ui.events.form.alert_save_failed", value: "Veranstaltung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut." },

  // ===== SPANISH =====
  // Form Titles
  { locale: "es", key: "ui.events.form.title_create", value: "Crear evento" },
  { locale: "es", key: "ui.events.form.title_edit", value: "Editar evento" },
  { locale: "es", key: "ui.events.form.required", value: "*" },

  // Basic Information
  { locale: "es", key: "ui.events.form.basic_info", value: "Información básica" },
  { locale: "es", key: "ui.events.form.event_type", value: "Tipo de evento" },
  { locale: "es", key: "ui.events.form.event_type_conference", value: "Conferencia - Evento profesional de múltiples temas" },
  { locale: "es", key: "ui.events.form.event_type_workshop", value: "Taller - Sesión de capacitación práctica" },
  { locale: "es", key: "ui.events.form.event_type_concert", value: "Concierto - Actuación musical en directo" },
  { locale: "es", key: "ui.events.form.event_type_meetup", value: "Encuentro - Evento de networking informal" },

  // Event Format
  { locale: "es", key: "ui.events.form.event_format", value: "Formato del evento" },
  { locale: "es", key: "ui.events.form.event_format_in_person", value: "Presencial - Asistencia al lugar físico" },
  { locale: "es", key: "ui.events.form.event_format_online", value: "En línea - Asistencia virtual/remota" },
  { locale: "es", key: "ui.events.form.event_format_hybrid", value: "Híbrido - Opciones presenciales y virtuales" },
  { locale: "es", key: "ui.events.form.event_format_help", value: "¿Cómo participarán los asistentes en este evento?" },

  // Event Name
  { locale: "es", key: "ui.events.form.event_name", value: "Nombre del evento" },
  { locale: "es", key: "ui.events.form.event_name_placeholder", value: "Cumbre Tecnológica 2025, Taller de Diseño, Noche de Jazz, etc." },

  // Date & Time
  { locale: "es", key: "ui.events.form.date_time", value: "Fecha y hora" },
  { locale: "es", key: "ui.events.form.start_date", value: "Fecha de inicio" },
  { locale: "es", key: "ui.events.form.start_time", value: "Hora de inicio" },
  { locale: "es", key: "ui.events.form.end_date", value: "Fecha de finalización" },
  { locale: "es", key: "ui.events.form.end_time", value: "Hora de finalización" },
  { locale: "es", key: "ui.events.form.timezone_note", value: "Las horas están en la zona horaria de su organización: {timezone}" },

  // Location & Address Validation
  { locale: "es", key: "ui.events.form.location", value: "Ubicación" },
  { locale: "es", key: "ui.events.form.location_placeholder", value: "Centro de Convenciones Madrid, Paseo de la Castellana 99, Madrid" },
  { locale: "es", key: "ui.events.form.validate_address", value: "Verificar" },
  { locale: "es", key: "ui.events.form.validating", value: "Validando..." },
  { locale: "es", key: "ui.events.form.address_verified", value: "¡Dirección verificada!" },
  { locale: "es", key: "ui.events.form.address_not_verified", value: "No se pudo verificar la dirección" },
  { locale: "es", key: "ui.events.form.formatted_address", value: "Dirección formateada:" },
  { locale: "es", key: "ui.events.form.confidence", value: "Confianza:" },
  { locale: "es", key: "ui.events.form.get_directions", value: "Obtener direcciones" },
  { locale: "es", key: "ui.events.form.view_on_maps", value: "Ver en Google Maps" },
  { locale: "es", key: "ui.events.form.open_google_maps", value: "Abrir en Google Maps" },
  { locale: "es", key: "ui.events.form.open_radar_maps", value: "Abrir en Radar Maps" },
  { locale: "es", key: "ui.events.form.address_error", value: "Error de validación de dirección" },
  { locale: "es", key: "ui.events.form.validation_failed", value: "Por favor verifica la ubicación e intenta de nuevo" },
  { locale: "es", key: "ui.events.form.validation_tip", value: "💡 Consejo: Incluye número de calle, código postal y país para mejores resultados" },
  { locale: "es", key: "ui.events.form.validation_help", value: "Haz clic en \"Verificar\" para validar la dirección y obtener direcciones automáticas para asistentes" },

  // Capacity
  { locale: "es", key: "ui.events.form.capacity", value: "Capacidad (Opcional)" },
  { locale: "es", key: "ui.events.form.capacity_placeholder", value: "Número máximo de asistentes" },
  { locale: "es", key: "ui.events.form.capacity_help", value: "Dejar vacío para capacidad ilimitada" },

  // Info & Alerts
  { locale: "es", key: "ui.events.form.info_draft", value: "Los eventos comienzan en estado \"Borrador\". Haz clic en \"Publicar\" para hacerlos visibles a los asistentes." },
  { locale: "es", key: "ui.events.form.info_new_event", value: "Nota: Solo se pueden agregar medios y patrocinadores después de guardar el evento. La descripción está disponible ahora." },
  { locale: "es", key: "ui.events.form.alert_save_first", value: "Por favor guarda el evento primero antes de agregar patrocinadores" },
  { locale: "es", key: "ui.events.form.alert_select_sponsor", value: "Por favor selecciona una organización patrocinadora" },
  { locale: "es", key: "ui.events.form.alert_date_time_required", value: "Por favor proporciona tanto la fecha/hora de inicio como de finalización" },
  { locale: "es", key: "ui.events.form.alert_save_failed", value: "Error al guardar el evento. Por favor intenta de nuevo." },

  // ===== FRENCH =====
  // Form Titles
  { locale: "fr", key: "ui.events.form.title_create", value: "Créer un événement" },
  { locale: "fr", key: "ui.events.form.title_edit", value: "Modifier l'événement" },
  { locale: "fr", key: "ui.events.form.required", value: "*" },

  // Basic Information
  { locale: "fr", key: "ui.events.form.basic_info", value: "Informations de base" },
  { locale: "fr", key: "ui.events.form.event_type", value: "Type d'événement" },
  { locale: "fr", key: "ui.events.form.event_type_conference", value: "Conférence - Événement professionnel multi-thèmes" },
  { locale: "fr", key: "ui.events.form.event_type_workshop", value: "Atelier - Session de formation pratique" },
  { locale: "fr", key: "ui.events.form.event_type_concert", value: "Concert - Performance musicale en direct" },
  { locale: "fr", key: "ui.events.form.event_type_meetup", value: "Rencontre - Événement de networking informel" },

  // Event Format
  { locale: "fr", key: "ui.events.form.event_format", value: "Format de l'événement" },
  { locale: "fr", key: "ui.events.form.event_format_in_person", value: "En présentiel - Présence physique sur le lieu" },
  { locale: "fr", key: "ui.events.form.event_format_online", value: "En ligne - Présence virtuelle/à distance" },
  { locale: "fr", key: "ui.events.form.event_format_hybrid", value: "Hybride - Options en présentiel et virtuelles" },
  { locale: "fr", key: "ui.events.form.event_format_help", value: "Comment les participants participeront-ils à cet événement ?" },

  // Event Name
  { locale: "fr", key: "ui.events.form.event_name", value: "Nom de l'événement" },
  { locale: "fr", key: "ui.events.form.event_name_placeholder", value: "Sommet Tech 2025, Atelier de Design, Soirée Jazz, etc." },

  // Date & Time
  { locale: "fr", key: "ui.events.form.date_time", value: "Date et heure" },
  { locale: "fr", key: "ui.events.form.start_date", value: "Date de début" },
  { locale: "fr", key: "ui.events.form.start_time", value: "Heure de début" },
  { locale: "fr", key: "ui.events.form.end_date", value: "Date de fin" },
  { locale: "fr", key: "ui.events.form.end_time", value: "Heure de fin" },
  { locale: "fr", key: "ui.events.form.timezone_note", value: "Les horaires sont dans le fuseau horaire de votre organisation : {timezone}" },

  // Location & Address Validation
  { locale: "fr", key: "ui.events.form.location", value: "Lieu" },
  { locale: "fr", key: "ui.events.form.location_placeholder", value: "Centre de Congrès Paris, 2 Place de la Porte Maillot, Paris" },
  { locale: "fr", key: "ui.events.form.validate_address", value: "Vérifier" },
  { locale: "fr", key: "ui.events.form.validating", value: "Validation..." },
  { locale: "fr", key: "ui.events.form.address_verified", value: "Adresse vérifiée !" },
  { locale: "fr", key: "ui.events.form.address_not_verified", value: "Impossible de vérifier l'adresse" },
  { locale: "fr", key: "ui.events.form.formatted_address", value: "Adresse formatée :" },
  { locale: "fr", key: "ui.events.form.confidence", value: "Confiance :" },
  { locale: "fr", key: "ui.events.form.get_directions", value: "Obtenir l'itinéraire" },
  { locale: "fr", key: "ui.events.form.view_on_maps", value: "Voir sur Google Maps" },
  { locale: "fr", key: "ui.events.form.open_google_maps", value: "Ouvrir dans Google Maps" },
  { locale: "fr", key: "ui.events.form.open_radar_maps", value: "Ouvrir dans Radar Maps" },
  { locale: "fr", key: "ui.events.form.address_error", value: "Erreur de validation d'adresse" },
  { locale: "fr", key: "ui.events.form.validation_failed", value: "Veuillez vérifier le lieu et réessayer" },
  { locale: "fr", key: "ui.events.form.validation_tip", value: "💡 Conseil : Incluez le numéro de rue, le code postal et le pays pour de meilleurs résultats" },
  { locale: "fr", key: "ui.events.form.validation_help", value: "Cliquez sur \"Vérifier\" pour valider l'adresse et obtenir des itinéraires automatiques pour les participants" },

  // Capacity
  { locale: "fr", key: "ui.events.form.capacity", value: "Capacité (Optionnel)" },
  { locale: "fr", key: "ui.events.form.capacity_placeholder", value: "Nombre maximum de participants" },
  { locale: "fr", key: "ui.events.form.capacity_help", value: "Laisser vide pour une capacité illimitée" },

  // Info & Alerts
  { locale: "fr", key: "ui.events.form.info_draft", value: "Les événements commencent en statut \"Brouillon\". Cliquez sur \"Publier\" pour les rendre visibles aux participants." },
  { locale: "fr", key: "ui.events.form.info_new_event", value: "Note : Les médias et sponsors ne peuvent être ajoutés qu'après l'enregistrement de l'événement. La description est disponible maintenant." },
  { locale: "fr", key: "ui.events.form.alert_save_first", value: "Veuillez d'abord enregistrer l'événement avant d'ajouter des sponsors" },
  { locale: "fr", key: "ui.events.form.alert_select_sponsor", value: "Veuillez sélectionner une organisation sponsor" },
  { locale: "fr", key: "ui.events.form.alert_date_time_required", value: "Veuillez fournir à la fois la date/heure de début et de fin" },
  { locale: "fr", key: "ui.events.form.alert_save_failed", value: "Échec de l'enregistrement de l'événement. Veuillez réessayer." },

  // ===== JAPANESE =====
  // Form Titles
  { locale: "ja", key: "ui.events.form.title_create", value: "イベントを作成" },
  { locale: "ja", key: "ui.events.form.title_edit", value: "イベントを編集" },
  { locale: "ja", key: "ui.events.form.required", value: "*" },

  // Basic Information
  { locale: "ja", key: "ui.events.form.basic_info", value: "基本情報" },
  { locale: "ja", key: "ui.events.form.event_type", value: "イベントタイプ" },
  { locale: "ja", key: "ui.events.form.event_type_conference", value: "会議 - マルチトラックのプロフェッショナルイベント" },
  { locale: "ja", key: "ui.events.form.event_type_workshop", value: "ワークショップ - ハンズオントレーニングセッション" },
  { locale: "ja", key: "ui.events.form.event_type_concert", value: "コンサート - ライブミュージックパフォーマンス" },
  { locale: "ja", key: "ui.events.form.event_type_meetup", value: "ミートアップ - カジュアルなネットワーキングイベント" },

  // Event Format
  { locale: "ja", key: "ui.events.form.event_format", value: "イベント形式" },
  { locale: "ja", key: "ui.events.form.event_format_in_person", value: "対面 - 物理的な会場への出席" },
  { locale: "ja", key: "ui.events.form.event_format_online", value: "オンライン - バーチャル/リモート出席" },
  { locale: "ja", key: "ui.events.form.event_format_hybrid", value: "ハイブリッド - 対面とバーチャルの両方のオプション" },
  { locale: "ja", key: "ui.events.form.event_format_help", value: "参加者はどのようにこのイベントに参加しますか？" },

  // Event Name
  { locale: "ja", key: "ui.events.form.event_name", value: "イベント名" },
  { locale: "ja", key: "ui.events.form.event_name_placeholder", value: "テックサミット2025、デザインワークショップ、ジャズナイトなど" },

  // Date & Time
  { locale: "ja", key: "ui.events.form.date_time", value: "日時" },
  { locale: "ja", key: "ui.events.form.start_date", value: "開始日" },
  { locale: "ja", key: "ui.events.form.start_time", value: "開始時刻" },
  { locale: "ja", key: "ui.events.form.end_date", value: "終了日" },
  { locale: "ja", key: "ui.events.form.end_time", value: "終了時刻" },
  { locale: "ja", key: "ui.events.form.timezone_note", value: "時刻は組織のタイムゾーンです：{timezone}" },

  // Location & Address Validation
  { locale: "ja", key: "ui.events.form.location", value: "場所" },
  { locale: "ja", key: "ui.events.form.location_placeholder", value: "東京国際フォーラム、千代田区丸の内3-5-1" },
  { locale: "ja", key: "ui.events.form.validate_address", value: "確認" },
  { locale: "ja", key: "ui.events.form.validating", value: "検証中..." },
  { locale: "ja", key: "ui.events.form.address_verified", value: "住所が確認されました！" },
  { locale: "ja", key: "ui.events.form.address_not_verified", value: "住所を確認できませんでした" },
  { locale: "ja", key: "ui.events.form.formatted_address", value: "フォーマットされた住所：" },
  { locale: "ja", key: "ui.events.form.confidence", value: "信頼度：" },
  { locale: "ja", key: "ui.events.form.get_directions", value: "道順を取得" },
  { locale: "ja", key: "ui.events.form.view_on_maps", value: "Google マップで表示" },
  { locale: "ja", key: "ui.events.form.open_google_maps", value: "Google マップで開く" },
  { locale: "ja", key: "ui.events.form.open_radar_maps", value: "Radar マップで開く" },
  { locale: "ja", key: "ui.events.form.address_error", value: "住所検証エラー" },
  { locale: "ja", key: "ui.events.form.validation_failed", value: "場所を確認して再度お試しください" },
  { locale: "ja", key: "ui.events.form.validation_tip", value: "💡 ヒント：最良の結果を得るために、番地、郵便番号、国を含めてください" },
  { locale: "ja", key: "ui.events.form.validation_help", value: "「確認」をクリックして住所を検証し、参加者向けの自動案内を取得してください" },

  // Capacity
  { locale: "ja", key: "ui.events.form.capacity", value: "定員（オプション）" },
  { locale: "ja", key: "ui.events.form.capacity_placeholder", value: "最大参加者数" },
  { locale: "ja", key: "ui.events.form.capacity_help", value: "無制限の場合は空欄のままにしてください" },

  // Info & Alerts
  { locale: "ja", key: "ui.events.form.info_draft", value: "イベントは「下書き」ステータスで開始されます。「公開」をクリックして参加者に表示してください。" },
  { locale: "ja", key: "ui.events.form.info_new_event", value: "注：メディアとスポンサーはイベント保存後にのみ追加できます。説明は現在利用可能です。" },
  { locale: "ja", key: "ui.events.form.alert_save_first", value: "スポンサーを追加する前にまずイベントを保存してください" },
  { locale: "ja", key: "ui.events.form.alert_select_sponsor", value: "スポンサー組織を選択してください" },
  { locale: "ja", key: "ui.events.form.alert_date_time_required", value: "開始と終了の両方の日時を入力してください" },
  { locale: "ja", key: "ui.events.form.alert_save_failed", value: "イベントの保存に失敗しました。もう一度お試しください。" },

  // ===== POLISH =====
  // Form Titles
  { locale: "pl", key: "ui.events.form.title_create", value: "Utwórz wydarzenie" },
  { locale: "pl", key: "ui.events.form.title_edit", value: "Edytuj wydarzenie" },
  { locale: "pl", key: "ui.events.form.required", value: "*" },

  // Basic Information
  { locale: "pl", key: "ui.events.form.basic_info", value: "Podstawowe informacje" },
  { locale: "pl", key: "ui.events.form.event_type", value: "Typ wydarzenia" },
  { locale: "pl", key: "ui.events.form.event_type_conference", value: "Konferencja - Profesjonalne wydarzenie wielotematyczne" },
  { locale: "pl", key: "ui.events.form.event_type_workshop", value: "Warsztat - Praktyczna sesja szkoleniowa" },
  { locale: "pl", key: "ui.events.form.event_type_concert", value: "Koncert - Występ muzyczny na żywo" },
  { locale: "pl", key: "ui.events.form.event_type_meetup", value: "Spotkanie - Nieformalne wydarzenie networkingowe" },

  // Event Format
  { locale: "pl", key: "ui.events.form.event_format", value: "Format wydarzenia" },
  { locale: "pl", key: "ui.events.form.event_format_in_person", value: "Stacjonarne - Obecność w fizycznej lokalizacji" },
  { locale: "pl", key: "ui.events.form.event_format_online", value: "Online - Udział wirtualny/zdalny" },
  { locale: "pl", key: "ui.events.form.event_format_hybrid", value: "Hybrydowe - Opcje stacjonarne i wirtualne" },
  { locale: "pl", key: "ui.events.form.event_format_help", value: "Jak uczestnicy będą brać udział w tym wydarzeniu?" },

  // Event Name
  { locale: "pl", key: "ui.events.form.event_name", value: "Nazwa wydarzenia" },
  { locale: "pl", key: "ui.events.form.event_name_placeholder", value: "Szczyt Technologiczny 2025, Warsztat Projektowania, Wieczór Jazzowy, itp." },

  // Date & Time
  { locale: "pl", key: "ui.events.form.date_time", value: "Data i godzina" },
  { locale: "pl", key: "ui.events.form.start_date", value: "Data rozpoczęcia" },
  { locale: "pl", key: "ui.events.form.start_time", value: "Godzina rozpoczęcia" },
  { locale: "pl", key: "ui.events.form.end_date", value: "Data zakończenia" },
  { locale: "pl", key: "ui.events.form.end_time", value: "Godzina zakończenia" },
  { locale: "pl", key: "ui.events.form.timezone_note", value: "Godziny są w strefie czasowej Twojej organizacji: {timezone}" },

  // Location & Address Validation
  { locale: "pl", key: "ui.events.form.location", value: "Lokalizacja" },
  { locale: "pl", key: "ui.events.form.location_placeholder", value: "Centrum Kongresowe Warszawa, Plac Defilad 1, Warszawa" },
  { locale: "pl", key: "ui.events.form.validate_address", value: "Zweryfikuj" },
  { locale: "pl", key: "ui.events.form.validating", value: "Weryfikacja..." },
  { locale: "pl", key: "ui.events.form.address_verified", value: "Adres zweryfikowany!" },
  { locale: "pl", key: "ui.events.form.address_not_verified", value: "Nie udało się zweryfikować adresu" },
  { locale: "pl", key: "ui.events.form.formatted_address", value: "Sformatowany adres:" },
  { locale: "pl", key: "ui.events.form.confidence", value: "Pewność:" },
  { locale: "pl", key: "ui.events.form.get_directions", value: "Uzyskaj dojazd" },
  { locale: "pl", key: "ui.events.form.view_on_maps", value: "Zobacz w Google Maps" },
  { locale: "pl", key: "ui.events.form.open_google_maps", value: "Otwórz w Google Maps" },
  { locale: "pl", key: "ui.events.form.open_radar_maps", value: "Otwórz w Radar Maps" },
  { locale: "pl", key: "ui.events.form.address_error", value: "Błąd weryfikacji adresu" },
  { locale: "pl", key: "ui.events.form.validation_failed", value: "Sprawdź lokalizację i spróbuj ponownie" },
  { locale: "pl", key: "ui.events.form.validation_tip", value: "💡 Wskazówka: Uwzględnij numer domu, kod pocztowy i kraj dla najlepszych wyników" },
  { locale: "pl", key: "ui.events.form.validation_help", value: "Kliknij \"Zweryfikuj\", aby zweryfikować adres i uzyskać automatyczne wskazówki dojazdu dla uczestników" },

  // Capacity
  { locale: "pl", key: "ui.events.form.capacity", value: "Pojemność (Opcjonalne)" },
  { locale: "pl", key: "ui.events.form.capacity_placeholder", value: "Maksymalna liczba uczestników" },
  { locale: "pl", key: "ui.events.form.capacity_help", value: "Pozostaw puste dla nieograniczonej pojemności" },

  // Info & Alerts
  { locale: "pl", key: "ui.events.form.info_draft", value: "Wydarzenia rozpoczynają się w statusie \"Szkic\". Kliknij \"Opublikuj\", aby były widoczne dla uczestników." },
  { locale: "pl", key: "ui.events.form.info_new_event", value: "Uwaga: Media i sponsorzy mogą być dodani dopiero po zapisaniu wydarzenia. Opis jest dostępny teraz." },
  { locale: "pl", key: "ui.events.form.alert_save_first", value: "Najpierw zapisz wydarzenie przed dodaniem sponsorów" },
  { locale: "pl", key: "ui.events.form.alert_select_sponsor", value: "Wybierz organizację sponsorującą" },
  { locale: "pl", key: "ui.events.form.alert_date_time_required", value: "Podaj zarówno datę/godzinę rozpoczęcia, jak i zakończenia" },
  { locale: "pl", key: "ui.events.form.alert_save_failed", value: "Nie udało się zapisać wydarzenia. Spróbuj ponownie." },
];

/**
 * Seed events form basics translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_01_FormBasics:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Form Basics Translations...");

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

    console.log(`✅ Seeded Events Form Basics translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
