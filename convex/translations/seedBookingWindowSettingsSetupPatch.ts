/**
 * TARGETED BOOKING SETTINGS + SETUP TRANSLATION PATCH
 *
 * Seeds only the booking settings/setup slice so we can update live translations
 * without hitting Convex's read limit for the full booking window seed.
 *
 * Run: npx convex run translations/seedBookingWindowSettingsSetupPatch:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const supportedLocales = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "pl", name: "Polish" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ja", name: "Japanese" },
];

const translations = [
  {
    key: "ui.app.booking.settings.menu.calendar",
    values: {
      en: "Calendar",
      de: "Kalender",
      pl: "Calendar",
      es: "Calendar",
      fr: "Calendar",
      ja: "Calendar",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.add_to_calendar.sync_off",
    values: {
      en: "Google calendar sync is off. Native bookings stay internal until sync is re-enabled.",
      de: "Die Google-Kalendersynchronisierung ist deaktiviert. Native Buchungen bleiben intern, bis die Synchronisierung wieder aktiviert wird.",
      pl: "Google calendar sync is off. Native bookings stay internal until sync is re-enabled.",
      es: "Google calendar sync is off. Native bookings stay internal until sync is re-enabled.",
      fr: "Google calendar sync is off. Native bookings stay internal until sync is re-enabled.",
      ja: "Google calendar sync is off. Native bookings stay internal until sync is re-enabled.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.actions.choose_calendar",
    values: {
      en: "Choose calendar",
      de: "Kalender waehlen",
      pl: "Choose calendar",
      es: "Choose calendar",
      fr: "Choose calendar",
      ja: "Choose calendar",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.actions.connect_google",
    values: {
      en: "Connect Google",
      de: "Google verbinden",
      pl: "Connect Google",
      es: "Connect Google",
      fr: "Connect Google",
      ja: "Connect Google",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.actions.enable_sync",
    values: {
      en: "Enable sync",
      de: "Synchronisierung aktivieren",
      pl: "Enable sync",
      es: "Enable sync",
      fr: "Enable sync",
      ja: "Enable sync",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.actions.reconnect_google",
    values: {
      en: "Reconnect Google",
      de: "Google neu verbinden",
      pl: "Reconnect Google",
      es: "Reconnect Google",
      fr: "Reconnect Google",
      ja: "Reconnect Google",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.add_to_calendar.missing_write_scope",
    values: {
      en: "Reconnect Google with calendar write scope before outbound booking pushes can run.",
      de: "Verbinden Sie Google erneut mit Kalender-Schreibrechten, bevor ausgehende Buchungseintraege synchronisiert werden koennen.",
      pl: "Reconnect Google with calendar write scope before outbound booking pushes can run.",
      es: "Reconnect Google with calendar write scope before outbound booking pushes can run.",
      fr: "Reconnect Google with calendar write scope before outbound booking pushes can run.",
      ja: "Reconnect Google with calendar write scope before outbound booking pushes can run.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.add_to_calendar.missing_push_target",
    values: {
      en: "No outbound calendar selected. Confirmed bookings stay native-only until you choose one.",
      de: "Kein Zielkalender ausgewaehlt. Bestaetigte Buchungen bleiben rein nativ, bis Sie einen Kalender auswaehlen.",
      pl: "No outbound calendar selected. Confirmed bookings stay native-only until you choose one.",
      es: "No outbound calendar selected. Confirmed bookings stay native-only until you choose one.",
      fr: "No outbound calendar selected. Confirmed bookings stay native-only until you choose one.",
      ja: "No outbound calendar selected. Confirmed bookings stay native-only until you choose one.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.add_to_calendar.reconcile_selected_target",
    values: {
      en: "Confirmed bookings reconcile by target connection and selected Google calendar instead of always writing a new primary-calendar event.",
      de: "Bestaetigte Buchungen werden anhand der Zielverbindung und des ausgewaehlten Google-Kalenders abgeglichen, statt immer ein neues Ereignis im Primaerkalender zu schreiben.",
      pl: "Confirmed bookings reconcile by target connection and selected Google calendar instead of always writing a new primary-calendar event.",
      es: "Confirmed bookings reconcile by target connection and selected Google calendar instead of always writing a new primary-calendar event.",
      fr: "Confirmed bookings reconcile by target connection and selected Google calendar instead of always writing a new primary-calendar event.",
      ja: "Confirmed bookings reconcile by target connection and selected Google calendar instead of always writing a new primary-calendar event.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.labels.primary_suffix",
    values: {
      en: "(primary)",
      de: "(Hauptkalender)",
      pl: "(primary)",
      es: "(primary)",
      fr: "(primary)",
      ja: "(primary)",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.conflicts.sync_google_hint",
    values: {
      en: "Conflict checks fail closed when sync is off, the connection is inactive, or Google read scope is missing.",
      de: "Konfliktpruefungen schlagen absichernd fehl, wenn die Synchronisierung deaktiviert ist, die Verbindung inaktiv ist oder die Google-Leseberechtigung fehlt.",
      pl: "Conflict checks fail closed when sync is off, the connection is inactive, or Google read scope is missing.",
      es: "Conflict checks fail closed when sync is off, the connection is inactive, or Google read scope is missing.",
      fr: "Conflict checks fail closed when sync is off, the connection is inactive, or Google read scope is missing.",
      ja: "Conflict checks fail closed when sync is off, the connection is inactive, or Google read scope is missing.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.conflicts.reconnect_provider_hint",
    values: {
      en: "Reconnect your {provider} account to manage conflict calendars.",
      de: "Verbinden Sie Ihr {provider}-Konto erneut, um Konfliktkalender zu verwalten.",
      pl: "Reconnect your {provider} account to manage conflict calendars.",
      es: "Reconnect your {provider} account to manage conflict calendars.",
      fr: "Reconnect your {provider} account to manage conflict calendars.",
      ja: "Reconnect your {provider} account to manage conflict calendars.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.conflicts.sync_disabled_hint",
    values: {
      en: "Google conflict checks are disabled. The booking engine will fail closed until sync is turned back on.",
      de: "Google-Konfliktpruefungen sind deaktiviert. Die Booking-Engine blockiert absichernd, bis die Synchronisierung wieder aktiviert wird.",
      pl: "Google conflict checks are disabled. The booking engine will fail closed until sync is turned back on.",
      es: "Google conflict checks are disabled. The booking engine will fail closed until sync is turned back on.",
      fr: "Google conflict checks are disabled. The booking engine will fail closed until sync is turned back on.",
      ja: "Google conflict checks are disabled. The booking engine will fail closed until sync is turned back on.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.conflicts.missing_read_scope",
    values: {
      en: "This Google connection is missing calendar read scope. Reconnect before using Google as a conflict source.",
      de: "Dieser Google-Verbindung fehlt die Kalender-Leseberechtigung. Verbinden Sie sie erneut, bevor Sie Google als Konfliktquelle verwenden.",
      pl: "This Google connection is missing calendar read scope. Reconnect before using Google as a conflict source.",
      es: "This Google connection is missing calendar read scope. Reconnect before using Google as a conflict source.",
      fr: "This Google connection is missing calendar read scope. Reconnect before using Google as a conflict source.",
      ja: "This Google connection is missing calendar read scope. Reconnect before using Google as a conflict source.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.conflicts.selection_hint",
    values: {
      en: "Select at least one Google calendar to block native bookings. The final selected blocker stays on until another blocker is enabled.",
      de: "Waehlen Sie mindestens einen Google-Kalender aus, der native Buchungen blockiert. Der zuletzt aktive Blocker bleibt eingeschaltet, bis ein anderer aktiviert wird.",
      pl: "Select at least one Google calendar to block native bookings. The final selected blocker stays on until another blocker is enabled.",
      es: "Select at least one Google calendar to block native bookings. The final selected blocker stays on until another blocker is enabled.",
      fr: "Select at least one Google calendar to block native bookings. The final selected blocker stays on until another blocker is enabled.",
      ja: "Select at least one Google calendar to block native bookings. The final selected blocker stays on until another blocker is enabled.",
    },
  },
  {
    key: "ui.app.booking.settings.calendar.conflicts.no_calendars_loaded",
    values: {
      en: "No calendars loaded yet. Fetch your Google calendars or reconnect if needed.",
      de: "Es wurden noch keine Kalender geladen. Rufen Sie Ihre Google-Kalender ab oder verbinden Sie die Integration bei Bedarf erneut.",
      pl: "No calendars loaded yet. Fetch your Google calendars or reconnect if needed.",
      es: "No calendars loaded yet. Fetch your Google calendars or reconnect if needed.",
      fr: "No calendars loaded yet. Fetch your Google calendars or reconnect if needed.",
      ja: "No calendars loaded yet. Fetch your Google calendars or reconnect if needed.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.title",
    values: {
      en: "Booking Setup Wizard",
      de: "Buchungs-Einrichtungsassistent",
      pl: "Booking Setup Wizard",
      es: "Booking Setup Wizard",
      fr: "Booking Setup Wizard",
      ja: "Booking Setup Wizard",
    },
  },
  {
    key: "ui.app.booking.settings.setup.subtitle",
    values: {
      en: "Configure tickets, checkout, and availability bindings for any frontend surface.",
      de: "Konfigurieren Sie Tickets, Checkout- und Verfuegbarkeits-Bindungen fuer jede Frontend-Oberflaeche.",
      pl: "Configure tickets, checkout, and availability bindings for any frontend surface.",
      es: "Configure tickets, checkout, and availability bindings for any frontend surface.",
      fr: "Configure tickets, checkout, and availability bindings for any frontend surface.",
      ja: "Configure tickets, checkout, and availability bindings for any frontend surface.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.organization",
    values: {
      en: "Organization",
      de: "Organisation",
      pl: "Organization",
      es: "Organization",
      fr: "Organization",
      ja: "Organization",
    },
  },
  {
    key: "ui.app.booking.settings.setup.login_required",
    values: {
      en: "Please sign in to run setup actions.",
      de: "Bitte melden Sie sich an, um Setup-Aktionen auszufuehren.",
      pl: "Please sign in to run setup actions.",
      es: "Please sign in to run setup actions.",
      fr: "Please sign in to run setup actions.",
      ja: "Please sign in to run setup actions.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.surface_identity",
    values: {
      en: "Surface Identity",
      de: "Oberflaechen-Identitaet",
      pl: "Surface Identity",
      es: "Surface Identity",
      fr: "Surface Identity",
      ja: "Surface Identity",
    },
  },
  {
    key: "ui.app.booking.settings.setup.organization_context_required",
    values: {
      en: "Organization context is required to start AI chat.",
      de: "Ein Organisationskontext ist erforderlich, um den KI-Chat zu starten.",
      pl: "Organization context is required to start AI chat.",
      es: "Organization context is required to start AI chat.",
      fr: "Organization context is required to start AI chat.",
      ja: "Organization context is required to start AI chat.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.template.option.custom",
    values: {
      en: "Custom",
      de: "Benutzerdefiniert",
      pl: "Custom",
      es: "Custom",
      fr: "Custom",
      ja: "Custom",
    },
  },
  {
    key: "ui.app.booking.settings.setup.template.option.sailing_school_two_boats",
    values: {
      en: "Sailing school (two boats)",
      de: "Segelschule (zwei Boote)",
      pl: "Sailing school (two boats)",
      es: "Sailing school (two boats)",
      fr: "Sailing school (two boats)",
      ja: "Sailing school (two boats)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.template.help",
    values: {
      en: "`Custom` keeps the catalog schema generic. `Sailing school (two boats)` is a preset only.",
      de: "`Benutzerdefiniert` haelt das Katalogschema generisch. `Segelschule (zwei Boote)` ist nur ein Preset.",
      pl: "`Custom` keeps the catalog schema generic. `Sailing school (two boats)` is a preset only.",
      es: "`Custom` keeps the catalog schema generic. `Sailing school (two boats)` is a preset only.",
      fr: "`Custom` keeps the catalog schema generic. `Sailing school (two boats)` is a preset only.",
      ja: "`Custom` keeps the catalog schema generic. `Sailing school (two boats)` is a preset only.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.template",
    values: {
      en: "Template",
      de: "Vorlage",
      pl: "Template",
      es: "Template",
      fr: "Template",
      ja: "Template",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.app_slug",
    values: {
      en: "App slug",
      de: "App-Slug",
      pl: "App slug",
      es: "App slug",
      fr: "App slug",
      ja: "App slug",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.surface_type",
    values: {
      en: "Surface type",
      de: "Oberflaechentyp",
      pl: "Surface type",
      es: "Surface type",
      fr: "Surface type",
      ja: "Surface type",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.surface_key",
    values: {
      en: "Surface key",
      de: "Oberflaechenschluessel",
      pl: "Surface key",
      es: "Surface key",
      fr: "Surface key",
      ja: "Surface key",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.default_times_csv",
    values: {
      en: "Default times (CSV)",
      de: "Standardzeiten (CSV)",
      pl: "Default times (CSV)",
      es: "Default times (CSV)",
      fr: "Default times (CSV)",
      ja: "Default times (CSV)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.priority",
    values: {
      en: "Priority",
      de: "Prioritaet",
      pl: "Priority",
      es: "Priority",
      fr: "Priority",
      ja: "Priority",
    },
  },
  {
    key: "ui.app.booking.settings.setup.fields.binding_enabled",
    values: {
      en: "Binding enabled",
      de: "Bindung aktiviert",
      pl: "Binding enabled",
      es: "Binding enabled",
      fr: "Binding enabled",
      ja: "Binding enabled",
    },
  },
  {
    key: "ui.app.booking.settings.setup.placeholders.custom_app_slug",
    values: {
      en: "Custom app slug",
      de: "Benutzerdefinierter App-Slug",
      pl: "Custom app slug",
      es: "Custom app slug",
      fr: "Custom app slug",
      ja: "Custom app slug",
    },
  },
  {
    key: "ui.app.booking.settings.setup.registered_app_slugs.single",
    values: {
      en: "{count} registered app slug",
      de: "{count} registrierter App-Slug",
      pl: "{count} registered app slug",
      es: "{count} registered app slug",
      fr: "{count} registered app slug",
      ja: "{count} registered app slug",
    },
  },
  {
    key: "ui.app.booking.settings.setup.registered_app_slugs.plural",
    values: {
      en: "{count} registered app slugs",
      de: "{count} registrierte App-Slugs",
      pl: "{count} registered app slugs",
      es: "{count} registered app slugs",
      fr: "{count} registered app slugs",
      ja: "{count} registered app slugs",
    },
  },
  {
    key: "ui.app.booking.settings.setup.registered_app_slugs.empty",
    values: {
      en: "No registered app slugs found yet",
      de: "Es wurden noch keine registrierten App-Slugs gefunden",
      pl: "No registered app slugs found yet",
      es: "No registered app slugs found yet",
      fr: "No registered app slugs found yet",
      ja: "No registered app slugs found yet",
    },
  },
  {
    key: "ui.app.booking.settings.setup.inventory_groups.title",
    values: {
      en: "Inventory groups (seat/unit)",
      de: "Inventargruppen (Sitz/Einheit)",
      pl: "Inventory groups (seat/unit)",
      es: "Inventory groups (seat/unit)",
      fr: "Inventory groups (seat/unit)",
      ja: "Inventory groups (seat/unit)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.inventory_groups.actions.add",
    values: {
      en: "Add group",
      de: "Gruppe hinzufuegen",
      pl: "Add group",
      es: "Add group",
      fr: "Add group",
      ja: "Add group",
    },
  },
  {
    key: "ui.app.booking.settings.setup.inventory_groups.actions.remove_aria",
    values: {
      en: "Remove inventory group {id}",
      de: "Inventargruppe {id} entfernen",
      pl: "Remove inventory group {id}",
      es: "Remove inventory group {id}",
      fr: "Remove inventory group {id}",
      ja: "Remove inventory group {id}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.inventory_groups.placeholders.id",
    values: {
      en: "Group ID",
      de: "Gruppen-ID",
      pl: "Group ID",
      es: "Group ID",
      fr: "Group ID",
      ja: "Group ID",
    },
  },
  {
    key: "ui.app.booking.settings.setup.inventory_groups.placeholders.label",
    values: {
      en: "Group label",
      de: "Gruppenbezeichnung",
      pl: "Group label",
      es: "Group label",
      fr: "Group label",
      ja: "Group label",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.title",
    values: {
      en: "Profiles / products",
      de: "Profile / Produkte",
      pl: "Profiles / products",
      es: "Profiles / products",
      fr: "Profiles / products",
      ja: "Profiles / products",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.actions.add",
    values: {
      en: "Add profile",
      de: "Profil hinzufuegen",
      pl: "Add profile",
      es: "Add profile",
      fr: "Add profile",
      ja: "Add profile",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.actions.remove_aria",
    values: {
      en: "Remove profile {id}",
      de: "Profil {id} entfernen",
      pl: "Remove profile {id}",
      es: "Remove profile {id}",
      fr: "Remove profile {id}",
      ja: "Remove profile {id}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.fields.multi_day",
    values: {
      en: "Multi-day",
      de: "Mehrtaegig",
      pl: "Multi-day",
      es: "Multi-day",
      fr: "Multi-day",
      ja: "Multi-day",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.id",
    values: {
      en: "Profile ID",
      de: "Profil-ID",
      pl: "Profile ID",
      es: "Profile ID",
      fr: "Profile ID",
      ja: "Profile ID",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.display_name",
    values: {
      en: "Display name",
      de: "Anzeigename",
      pl: "Display name",
      es: "Display name",
      fr: "Display name",
      ja: "Display name",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.duration_minutes",
    values: {
      en: "Duration (minutes)",
      de: "Dauer (Minuten)",
      pl: "Duration (minutes)",
      es: "Duration (minutes)",
      fr: "Duration (minutes)",
      ja: "Duration (minutes)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.available_times_csv",
    values: {
      en: "Available times (CSV)",
      de: "Verfuegbare Zeiten (CSV)",
      pl: "Available times (CSV)",
      es: "Available times (CSV)",
      fr: "Available times (CSV)",
      ja: "Available times (CSV)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.booking_resource_id",
    values: {
      en: "Booking resource ID",
      de: "Buchungsressourcen-ID",
      pl: "Booking resource ID",
      es: "Booking resource ID",
      fr: "Booking resource ID",
      ja: "Booking resource ID",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.checkout_product_id",
    values: {
      en: "Checkout product ID",
      de: "Checkout-Produkt-ID",
      pl: "Checkout product ID",
      es: "Checkout product ID",
      fr: "Checkout product ID",
      ja: "Checkout product ID",
    },
  },
  {
    key: "ui.app.booking.settings.setup.profiles.placeholders.checkout_public_url_optional",
    values: {
      en: "Checkout public URL (optional)",
      de: "Oeffentliche Checkout-URL (optional)",
      pl: "Checkout public URL (optional)",
      es: "Checkout public URL (optional)",
      fr: "Checkout public URL (optional)",
      ja: "Checkout public URL (optional)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.start_chat_title",
    values: {
      en: "Open AI Assistant for booking setup",
      de: "KI-Assistenten fuer das Buchungs-Setup oeffnen",
      pl: "Open AI Assistant for booking setup",
      es: "Open AI Assistant for booking setup",
      fr: "Open AI Assistant for booking setup",
      ja: "Open AI Assistant for booking setup",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.start_chat",
    values: {
      en: "Start chat",
      de: "Chat starten",
      pl: "Start chat",
      es: "Start chat",
      fr: "Start chat",
      ja: "Start chat",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.load_template_defaults",
    values: {
      en: "Load template defaults",
      de: "Vorlagenstandards laden",
      pl: "Load template defaults",
      es: "Load template defaults",
      fr: "Load template defaults",
      ja: "Load template defaults",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.generate_blueprint",
    values: {
      en: "Generate blueprint",
      de: "Blueprint erzeugen",
      pl: "Generate blueprint",
      es: "Generate blueprint",
      fr: "Generate blueprint",
      ja: "Generate blueprint",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.save_binding",
    values: {
      en: "Save binding",
      de: "Bindung speichern",
      pl: "Save binding",
      es: "Save binding",
      fr: "Save binding",
      ja: "Save binding",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.list_bindings",
    values: {
      en: "List bindings",
      de: "Bindungen auflisten",
      pl: "List bindings",
      es: "List bindings",
      fr: "List bindings",
      ja: "List bindings",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.bootstrap_interview",
    values: {
      en: "Bootstrap interview",
      de: "Bootstrap-Interview",
      pl: "Bootstrap interview",
      es: "Bootstrap interview",
      fr: "Bootstrap interview",
      ja: "Bootstrap interview",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.bootstrap_execute",
    values: {
      en: "Bootstrap execute",
      de: "Bootstrap ausfuehren",
      pl: "Bootstrap execute",
      es: "Bootstrap execute",
      fr: "Bootstrap execute",
      ja: "Bootstrap execute",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.copy_catalog_json",
    values: {
      en: "Copy catalog JSON",
      de: "Katalog-JSON kopieren",
      pl: "Copy catalog JSON",
      es: "Copy catalog JSON",
      fr: "Copy catalog JSON",
      ja: "Copy catalog JSON",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.copy_bindings_json",
    values: {
      en: "Copy bindings JSON",
      de: "Bindings-JSON kopieren",
      pl: "Copy bindings JSON",
      es: "Copy bindings JSON",
      fr: "Copy bindings JSON",
      ja: "Copy bindings JSON",
    },
  },
  {
    key: "ui.app.booking.settings.setup.actions.copy_prompt",
    values: {
      en: "Copy prompt",
      de: "Prompt kopieren",
      pl: "Copy prompt",
      es: "Copy prompt",
      fr: "Copy prompt",
      ja: "Copy prompt",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.title",
    values: {
      en: "Interview / execute flow",
      de: "Interview- / Ausfuehrungsablauf",
      pl: "Interview / execute flow",
      es: "Interview / execute flow",
      fr: "Interview / execute flow",
      ja: "Interview / execute flow",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.sequence",
    values: {
      en: "Sequence: {sequence}",
      de: "Abfolge: {sequence}",
      pl: "Sequence: {sequence}",
      es: "Sequence: {sequence}",
      fr: "Sequence: {sequence}",
      ja: "Sequence: {sequence}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.next",
    values: {
      en: "Next: {action}",
      de: "Naechster Schritt: {action}",
      pl: "Next: {action}",
      es: "Next: {action}",
      fr: "Next: {action}",
      ja: "Next: {action}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.question_meta",
    values: {
      en: "Field: {field}. Type: {type}. Required: {required}.",
      de: "Feld: {field}. Typ: {type}. Erforderlich: {required}.",
      pl: "Field: {field}. Type: {type}. Required: {required}.",
      es: "Field: {field}. Type: {type}. Required: {required}.",
      fr: "Field: {field}. Type: {type}. Required: {required}.",
      ja: "Field: {field}. Type: {type}. Required: {required}.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.default",
    values: {
      en: "Default: {value}",
      de: "Standard: {value}",
      pl: "Default: {value}",
      es: "Default: {value}",
      fr: "Default: {value}",
      ja: "Default: {value}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.options",
    values: {
      en: "Options: {options}",
      de: "Optionen: {options}",
      pl: "Options: {options}",
      es: "Options: {options}",
      fr: "Options: {options}",
      ja: "Options: {options}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.interview.hints",
    values: {
      en: "Hints: {hints}",
      de: "Hinweise: {hints}",
      pl: "Hints: {hints}",
      es: "Hints: {hints}",
      fr: "Hints: {hints}",
      ja: "Hints: {hints}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.title",
    values: {
      en: "Diagnostics",
      de: "Diagnostik",
      pl: "Diagnostics",
      es: "Diagnostics",
      fr: "Diagnostics",
      ja: "Diagnostics",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.course_id",
    values: {
      en: "Course ID: {value}",
      de: "Kurs-ID: {value}",
      pl: "Course ID: {value}",
      es: "Course ID: {value}",
      fr: "Course ID: {value}",
      ja: "Course ID: {value}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.resource_and_checkout",
    values: {
      en: "Booking resource ID: {resourceId} | Checkout product ID: {productId}",
      de: "Buchungsressourcen-ID: {resourceId} | Checkout-Produkt-ID: {productId}",
      pl: "Booking resource ID: {resourceId} | Checkout product ID: {productId}",
      es: "Booking resource ID: {resourceId} | Checkout product ID: {productId}",
      fr: "Booking resource ID: {resourceId} | Checkout product ID: {productId}",
      ja: "Booking resource ID: {resourceId} | Checkout product ID: {productId}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.checkout_public_url",
    values: {
      en: "Checkout public URL: {value}",
      de: "Oeffentliche Checkout-URL: {value}",
      pl: "Checkout public URL: {value}",
      es: "Checkout public URL: {value}",
      fr: "Checkout public URL: {value}",
      ja: "Checkout public URL: {value}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.warnings",
    values: {
      en: "Warnings: {warnings}",
      de: "Warnungen: {warnings}",
      pl: "Warnings: {warnings}",
      es: "Warnings: {warnings}",
      fr: "Warnings: {warnings}",
      ja: "Warnings: {warnings}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.resource_candidate",
    values: {
      en: "Resource: {name}",
      de: "Ressource: {name}",
      pl: "Resource: {name}",
      es: "Resource: {name}",
      fr: "Resource: {name}",
      ja: "Resource: {name}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.checkout_candidate",
    values: {
      en: "Checkout: {name}",
      de: "Checkout: {name}",
      pl: "Checkout: {name}",
      es: "Checkout: {name}",
      fr: "Checkout: {name}",
      ja: "Checkout: {name}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.diagnostics.checkout_url_candidate",
    values: {
      en: "Checkout URL: {url}",
      de: "Checkout-URL: {url}",
      pl: "Checkout URL: {url}",
      es: "Checkout URL: {url}",
      fr: "Checkout URL: {url}",
      ja: "Checkout URL: {url}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.env_mapping.title",
    values: {
      en: "Env mapping",
      de: "Env-Zuordnung",
      pl: "Env mapping",
      es: "Env mapping",
      fr: "Env mapping",
      ja: "Env mapping",
    },
  },
  {
    key: "ui.app.booking.settings.setup.saved_bindings.title",
    values: {
      en: "Saved bindings",
      de: "Gespeicherte Bindungen",
      pl: "Saved bindings",
      es: "Saved bindings",
      fr: "Saved bindings",
      ja: "Saved bindings",
    },
  },
  {
    key: "ui.app.booking.settings.setup.saved_bindings.meta",
    values: {
      en: "Enabled: {enabled}. Priority: {priority}. Status: {status}. Updated: {updated}",
      de: "Aktiviert: {enabled}. Prioritaet: {priority}. Status: {status}. Aktualisiert: {updated}",
      pl: "Enabled: {enabled}. Priority: {priority}. Status: {status}. Updated: {updated}",
      es: "Enabled: {enabled}. Priority: {priority}. Status: {status}. Updated: {updated}",
      fr: "Enabled: {enabled}. Priority: {priority}. Status: {status}. Updated: {updated}",
      ja: "Enabled: {enabled}. Priority: {priority}. Status: {status}. Updated: {updated}",
    },
  },
  {
    key: "ui.app.booking.settings.setup.calendar_readiness.title",
    values: {
      en: "Google Calendar readiness",
      de: "Google-Kalender-Bereitschaft",
      pl: "Google Calendar readiness",
      es: "Google Calendar readiness",
      fr: "Google Calendar readiness",
      ja: "Google Calendar readiness",
    },
  },
  {
    key: "ui.app.booking.settings.setup.agent_prompt.title",
    values: {
      en: "Agent prompt",
      de: "Agent-Prompt",
      pl: "Agent prompt",
      es: "Agent prompt",
      fr: "Agent prompt",
      ja: "Agent prompt",
    },
  },
  {
    key: "ui.app.booking.settings.setup.notifications.copy_failed",
    values: {
      en: "Copy failed",
      de: "Kopieren fehlgeschlagen",
      pl: "Copy failed",
      es: "Copy failed",
      fr: "Copy failed",
      ja: "Copy failed",
    },
  },
  {
    key: "ui.app.booking.settings.setup.notifications.wizard_updated_title",
    values: {
      en: "Wizard updated",
      de: "Assistent aktualisiert",
      pl: "Wizard updated",
      es: "Wizard updated",
      fr: "Wizard updated",
      ja: "Wizard updated",
    },
  },
  {
    key: "ui.app.booking.settings.setup.notifications.wizard_updated_body",
    values: {
      en: "Applied AI booking setup updates to this wizard.",
      de: "KI-Buchungs-Setup-Aktualisierungen wurden auf diesen Assistenten angewendet.",
      pl: "Applied AI booking setup updates to this wizard.",
      es: "Applied AI booking setup updates to this wizard.",
      fr: "Applied AI booking setup updates to this wizard.",
      ja: "Applied AI booking setup updates to this wizard.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.notifications.copied_runtime_config_json",
    values: {
      en: "Copied runtime config JSON",
      de: "Runtime-Config-JSON kopiert",
      pl: "Copied runtime config JSON",
      es: "Copied runtime config JSON",
      fr: "Copied runtime config JSON",
      ja: "Copied runtime config JSON",
    },
  },
  {
    key: "ui.app.booking.settings.setup.notifications.copied_course_bindings_json",
    values: {
      en: "Copied course bindings JSON",
      de: "Kurs-Bindings-JSON kopiert",
      pl: "Copied course bindings JSON",
      es: "Copied course bindings JSON",
      fr: "Copied course bindings JSON",
      ja: "Copied course bindings JSON",
    },
  },
  {
    key: "ui.app.booking.settings.setup.notifications.copied_agent_setup_prompt",
    values: {
      en: "Copied agent setup prompt",
      de: "Agent-Setup-Prompt kopiert",
      pl: "Copied agent setup prompt",
      es: "Copied agent setup prompt",
      fr: "Copied agent setup prompt",
      ja: "Copied agent setup prompt",
    },
  },
  {
    key: "ui.app.booking.settings.setup.status.ai_writeback_applied",
    values: {
      en: "AI write-back applied. Wizard fields updated from chat.",
      de: "KI-Writeback angewendet. Die Felder des Assistenten wurden aus dem Chat aktualisiert.",
      pl: "AI write-back applied. Wizard fields updated from chat.",
      es: "AI write-back applied. Wizard fields updated from chat.",
      fr: "AI write-back applied. Wizard fields updated from chat.",
      ja: "AI write-back applied. Wizard fields updated from chat.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.status.template_loaded",
    values: {
      en: 'Template defaults loaded for "{template}".',
      de: 'Vorlagenstandards fuer "{template}" geladen.',
      pl: 'Template defaults loaded for "{template}".',
      es: 'Template defaults loaded for "{template}".',
      fr: 'Template defaults loaded for "{template}".',
      ja: 'Template defaults loaded for "{template}".',
    },
  },
  {
    key: "ui.app.booking.settings.setup.status.action_failed",
    values: {
      en: "Setup action failed",
      de: "Setup-Aktion fehlgeschlagen",
      pl: "Setup action failed",
      es: "Setup action failed",
      fr: "Setup action failed",
      ja: "Setup action failed",
    },
  },
  {
    key: "ui.app.booking.settings.setup.status.action_completed",
    values: {
      en: "Action completed.",
      de: "Aktion abgeschlossen.",
      pl: "Action completed.",
      es: "Action completed.",
      fr: "Action completed.",
      ja: "Action completed.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.status.ai_assistant_opened",
    values: {
      en: "AI Assistant opened with booking setup context.",
      de: "Der KI-Assistent wurde mit Buchungs-Setup-Kontext geoeffnet.",
      pl: "AI Assistant opened with booking setup context.",
      es: "AI Assistant opened with booking setup context.",
      fr: "AI Assistant opened with booking setup context.",
      ja: "AI Assistant opened with booking setup context.",
    },
  },
  {
    key: "ui.app.booking.settings.setup.values.unset",
    values: {
      en: "(unset)",
      de: "(nicht gesetzt)",
      pl: "(unset)",
      es: "(unset)",
      fr: "(unset)",
      ja: "(unset)",
    },
  },
  {
    key: "ui.app.booking.settings.setup.values.optional",
    values: {
      en: "(optional)",
      de: "(optional)",
      pl: "(optional)",
      es: "(optional)",
      fr: "(optional)",
      ja: "(optional)",
    },
  },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding booking settings/setup translation patch...");

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

    let inserted = 0;
    let updated = 0;

    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];
        const result = await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "booking_window",
        );
        if (result.inserted) inserted++;
        if (result.updated) updated++;
      }
    }

    console.log(
      `✅ Seeded booking settings/setup translation patch: ${inserted} inserted, ${updated} updated`
    );
  },
});
