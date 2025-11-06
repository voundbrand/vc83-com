/**
 * WEB PUBLISHING TRANSLATIONS
 *
 * All UI translations for the Web Publishing window/app.
 * Namespace: ui.web_publishing
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
  // Header
  { locale: "en", key: "ui.web_publishing.header.title", value: "Web Publishing" },
  { locale: "en", key: "ui.web_publishing.header.description", value: "Create and manage public pages with templates" },

  // Tabs
  { locale: "en", key: "ui.web_publishing.tab.published_pages", value: "Published Pages" },
  { locale: "en", key: "ui.web_publishing.tab.create_page", value: "Create Page" },
  { locale: "en", key: "ui.web_publishing.tab.settings", value: "Settings" },
  { locale: "en", key: "ui.web_publishing.tab.analytics", value: "Analytics" },
  { locale: "en", key: "ui.web_publishing.tab.coming_soon", value: "Coming soon" },

  // Published Pages Tab
  { locale: "en", key: "ui.web_publishing.pages.auth_required", value: "Authentication Required" },
  { locale: "en", key: "ui.web_publishing.pages.auth_required_desc", value: "Please log in to view published pages." },
  { locale: "en", key: "ui.web_publishing.pages.no_pages_title", value: "No Published Pages Yet" },
  { locale: "en", key: "ui.web_publishing.pages.no_pages_desc", value: "Create your first published page using the \"Create Page\" tab." },
  { locale: "en", key: "ui.web_publishing.pages.your_pages", value: "Your Published Pages" },
  { locale: "en", key: "ui.web_publishing.pages.count", value: "{count} page" },
  { locale: "en", key: "ui.web_publishing.pages.count_plural", value: "{count} pages" },
  { locale: "en", key: "ui.web_publishing.pages.total", value: "total" },
  { locale: "en", key: "ui.web_publishing.pages.status_label", value: "Status:" },
  { locale: "en", key: "ui.web_publishing.pages.filter.active", value: "Active (Non-Archived)" },
  { locale: "en", key: "ui.web_publishing.pages.filter.all", value: "All Pages" },
  { locale: "en", key: "ui.web_publishing.pages.filter.draft", value: "Draft" },
  { locale: "en", key: "ui.web_publishing.pages.filter.review", value: "Review" },
  { locale: "en", key: "ui.web_publishing.pages.filter.published", value: "Published" },
  { locale: "en", key: "ui.web_publishing.pages.filter.unpublished", value: "Unpublished" },
  { locale: "en", key: "ui.web_publishing.pages.filter.archived", value: "Archived Only" },

  // Page Card
  { locale: "en", key: "ui.web_publishing.page_card.status.draft", value: "Draft" },
  { locale: "en", key: "ui.web_publishing.page_card.status.review", value: "Review" },
  { locale: "en", key: "ui.web_publishing.page_card.status.live", value: "Live" },
  { locale: "en", key: "ui.web_publishing.page_card.status.unpublished", value: "Unpublished" },
  { locale: "en", key: "ui.web_publishing.page_card.status.archived", value: "Archived" },
  { locale: "en", key: "ui.web_publishing.page_card.template", value: "Template:" },
  { locale: "en", key: "ui.web_publishing.page_card.views", value: "{count} views" },
  { locale: "en", key: "ui.web_publishing.page_card.published_on", value: "Published {date}" },
  { locale: "en", key: "ui.web_publishing.page_card.not_published", value: "Not yet published" },
  { locale: "en", key: "ui.web_publishing.page_card.action.edit", value: "Edit page content" },
  { locale: "en", key: "ui.web_publishing.page_card.action.publish", value: "Publish" },
  { locale: "en", key: "ui.web_publishing.page_card.action.unpublish", value: "Unpublish" },
  { locale: "en", key: "ui.web_publishing.page_card.action.delete", value: "Delete (archive)" },
  { locale: "en", key: "ui.web_publishing.page_card.delete_confirm", value: "Are you sure you want to delete \"{name}\"? This will archive the page." },

  // Create/Edit Page Tab
  { locale: "en", key: "ui.web_publishing.create.auth_required", value: "Authentication Required" },
  { locale: "en", key: "ui.web_publishing.create.auth_required_desc", value: "Please log in to create pages." },
  { locale: "en", key: "ui.web_publishing.create.loading", value: "Loading..." },
  { locale: "en", key: "ui.web_publishing.create.no_templates_title", value: "Templates or Themes Not Available" },
  { locale: "en", key: "ui.web_publishing.create.no_templates_desc", value: "Your organization does not have any templates enabled yet." },
  { locale: "en", key: "ui.web_publishing.create.no_themes_desc", value: "No themes found in system." },
  { locale: "en", key: "ui.web_publishing.create.contact_admin", value: "Contact your system administrator to enable templates." },
  { locale: "en", key: "ui.web_publishing.create.debug_info", value: "Debug Info" },
  { locale: "en", key: "ui.web_publishing.create.title_new", value: "Create New Page" },
  { locale: "en", key: "ui.web_publishing.create.title_edit", value: "Edit Page" },
  { locale: "en", key: "ui.web_publishing.create.editing_mode_title", value: "Editing Mode" },
  { locale: "en", key: "ui.web_publishing.create.editing_mode_desc", value: "You are editing an existing page. Changes will update the page immediately." },
  { locale: "en", key: "ui.web_publishing.create.success_title", value: "Page Created Successfully!" },
  { locale: "en", key: "ui.web_publishing.create.success_desc", value: "Your page has been created as a draft. You can publish it from the Published Pages tab." },

  // Template Selection
  { locale: "en", key: "ui.web_publishing.template.select_title", value: "Select Template" },
  { locale: "en", key: "ui.web_publishing.template.required", value: "*" },

  // Theme Selection
  { locale: "en", key: "ui.web_publishing.theme.select_title", value: "Select Theme" },
  { locale: "en", key: "ui.web_publishing.theme.required", value: "*" },
  { locale: "en", key: "ui.web_publishing.theme.colors", value: "Colors:" },
  { locale: "en", key: "ui.web_publishing.theme.primary_gradient", value: "Primary Gradient" },
  { locale: "en", key: "ui.web_publishing.theme.background", value: "Background" },
  { locale: "en", key: "ui.web_publishing.theme.text", value: "Text" },
  { locale: "en", key: "ui.web_publishing.theme.secondary", value: "Secondary" },

  // Page Metadata
  { locale: "en", key: "ui.web_publishing.meta.page_title", value: "Page Title" },
  { locale: "en", key: "ui.web_publishing.meta.page_slug", value: "Page Slug" },
  { locale: "en", key: "ui.web_publishing.meta.meta_description", value: "Meta Description (Optional)" },
  { locale: "en", key: "ui.web_publishing.meta.meta_description_placeholder", value: "Brief description for SEO and social sharing" },
  { locale: "en", key: "ui.web_publishing.meta.character_count", value: "{count}/160 characters" },
  { locale: "en", key: "ui.web_publishing.meta.url_preview", value: "URL:" },

  // Link Products
  { locale: "en", key: "ui.web_publishing.products.title", value: "Link Products (Optional)" },
  { locale: "en", key: "ui.web_publishing.products.description", value: "Connect products to this page. They'll appear in your template's checkout UI." },
  { locale: "en", key: "ui.web_publishing.products.checkout_required_title", value: "Checkout App Required" },
  { locale: "en", key: "ui.web_publishing.products.checkout_required_desc", value: "To link products to your pages, you need the Checkout app enabled for your organization." },
  { locale: "en", key: "ui.web_publishing.products.contact_admin", value: "Contact your administrator to enable the Checkout app, or visit the Control Panel if you're an admin." },
  { locale: "en", key: "ui.web_publishing.products.no_products", value: "No products yet. Create products in the Products app first." },
  { locale: "en", key: "ui.web_publishing.products.linked", value: "✓ Linked" },
  { locale: "en", key: "ui.web_publishing.products.link", value: "Link" },
  { locale: "en", key: "ui.web_publishing.products.count_linked", value: "✓ {count} product linked" },
  { locale: "en", key: "ui.web_publishing.products.count_linked_plural", value: "✓ {count} products linked" },

  // Page Content
  { locale: "en", key: "ui.web_publishing.content.title", value: "Page Content" },

  // Submit
  { locale: "en", key: "ui.web_publishing.submit.draft_notice", value: "Page will be created as a" },
  { locale: "en", key: "ui.web_publishing.submit.draft", value: "draft" },
  { locale: "en", key: "ui.web_publishing.submit.creating", value: "Creating..." },
  { locale: "en", key: "ui.web_publishing.submit.create_page", value: "Create Page" },
  { locale: "en", key: "ui.web_publishing.submit.update_page", value: "Update Page" },

  // Preview
  { locale: "en", key: "ui.web_publishing.preview.title", value: "Live Preview" },
  { locale: "en", key: "ui.web_publishing.preview.loading", value: "Template preview loading..." },
  { locale: "en", key: "ui.web_publishing.preview.select_template_title", value: "Select Template & Theme" },
  { locale: "en", key: "ui.web_publishing.preview.select_template_desc", value: "Choose a template and theme from the left panel to see a live preview here." },
  { locale: "en", key: "ui.web_publishing.preview.template_label", value: "Template:" },
  { locale: "en", key: "ui.web_publishing.preview.theme_label", value: "Theme:" },

  // Form Fields (Dynamic Form Generator)
  { locale: "en", key: "ui.web_publishing.form.required", value: "*" },
  { locale: "en", key: "ui.web_publishing.form.media_library.select", value: "📁 Select from Media Library" },
  { locale: "en", key: "ui.web_publishing.form.media_library.required_notice", value: "Images must be uploaded to Media Library first, then selected here." },
  { locale: "en", key: "ui.web_publishing.form.media_library.selected_image", value: "Selected Image:" },
  { locale: "en", key: "ui.web_publishing.form.media_library.remove", value: "Remove" },
  { locale: "en", key: "ui.web_publishing.form.media_library.remove_title", value: "Remove this image" },
  { locale: "en", key: "ui.web_publishing.form.icon.custom_placeholder", value: "Or enter custom icon/emoji" },
  { locale: "en", key: "ui.web_publishing.form.event_link.select_event", value: "-- Select an event --" },
  { locale: "en", key: "ui.web_publishing.form.event_link.linked_event", value: "Linked Event:" },
  { locale: "en", key: "ui.web_publishing.form.event_link.auto_populated", value: "✓ Fields auto-populated from this event" },
  { locale: "en", key: "ui.web_publishing.form.event_link.name", value: "Name:" },
  { locale: "en", key: "ui.web_publishing.form.event_link.type", value: "Type:" },
  { locale: "en", key: "ui.web_publishing.form.event_link.date", value: "Date:" },
  { locale: "en", key: "ui.web_publishing.form.event_link.location", value: "Location:" },
  { locale: "en", key: "ui.web_publishing.form.checkout_link.select_checkout", value: "-- Select a checkout --" },
  { locale: "en", key: "ui.web_publishing.form.checkout_link.linked_checkout", value: "Linked Checkout:" },
  { locale: "en", key: "ui.web_publishing.form.checkout_link.products_displayed", value: "✓ Products will be displayed from this checkout" },
  { locale: "en", key: "ui.web_publishing.form.checkout_link.products", value: "Products:" },
  { locale: "en", key: "ui.web_publishing.form.checkout_link.products_linked", value: "{count} linked" },
  { locale: "en", key: "ui.web_publishing.form.checkout_link.payment", value: "Payment:" },
  { locale: "en", key: "ui.web_publishing.form.text_array.add", value: "+ Add {label}" },
  { locale: "en", key: "ui.web_publishing.form.text_array.remove", value: "Remove" },
  { locale: "en", key: "ui.web_publishing.form.repeater.add", value: "+ Add" },
  { locale: "en", key: "ui.web_publishing.form.repeater.remove", value: "Remove" },
  { locale: "en", key: "ui.web_publishing.form.repeater.item_number", value: "{label} #{number}" },

  // ===== GERMAN =====
  // Header
  { locale: "de", key: "ui.web_publishing.header.title", value: "Web-Publishing" },
  { locale: "de", key: "ui.web_publishing.header.description", value: "Erstellen und verwalten Sie öffentliche Seiten mit Vorlagen" },

  // Tabs
  { locale: "de", key: "ui.web_publishing.tab.published_pages", value: "Veröffentlichte Seiten" },
  { locale: "de", key: "ui.web_publishing.tab.create_page", value: "Seite erstellen" },
  { locale: "de", key: "ui.web_publishing.tab.settings", value: "Einstellungen" },
  { locale: "de", key: "ui.web_publishing.tab.analytics", value: "Analytics" },
  { locale: "de", key: "ui.web_publishing.tab.coming_soon", value: "Demnächst" },

  // Published Pages Tab
  { locale: "de", key: "ui.web_publishing.pages.auth_required", value: "Authentifizierung erforderlich" },
  { locale: "de", key: "ui.web_publishing.pages.auth_required_desc", value: "Bitte melden Sie sich an, um veröffentlichte Seiten anzuzeigen." },
  { locale: "de", key: "ui.web_publishing.pages.no_pages_title", value: "Noch keine veröffentlichten Seiten" },
  { locale: "de", key: "ui.web_publishing.pages.no_pages_desc", value: "Erstellen Sie Ihre erste veröffentlichte Seite im Tab \"Seite erstellen\"." },
  { locale: "de", key: "ui.web_publishing.pages.your_pages", value: "Ihre veröffentlichten Seiten" },
  { locale: "de", key: "ui.web_publishing.pages.count", value: "{count} Seite" },
  { locale: "de", key: "ui.web_publishing.pages.count_plural", value: "{count} Seiten" },
  { locale: "de", key: "ui.web_publishing.pages.total", value: "gesamt" },
  { locale: "de", key: "ui.web_publishing.pages.status_label", value: "Status:" },
  { locale: "de", key: "ui.web_publishing.pages.filter.active", value: "Aktiv (Nicht archiviert)" },
  { locale: "de", key: "ui.web_publishing.pages.filter.all", value: "Alle Seiten" },
  { locale: "de", key: "ui.web_publishing.pages.filter.draft", value: "Entwurf" },
  { locale: "de", key: "ui.web_publishing.pages.filter.review", value: "Überprüfung" },
  { locale: "de", key: "ui.web_publishing.pages.filter.published", value: "Veröffentlicht" },
  { locale: "de", key: "ui.web_publishing.pages.filter.unpublished", value: "Unveröffentlicht" },
  { locale: "de", key: "ui.web_publishing.pages.filter.archived", value: "Nur archiviert" },

  // Page Card
  { locale: "de", key: "ui.web_publishing.page_card.status.draft", value: "Entwurf" },
  { locale: "de", key: "ui.web_publishing.page_card.status.review", value: "Überprüfung" },
  { locale: "de", key: "ui.web_publishing.page_card.status.live", value: "Live" },
  { locale: "de", key: "ui.web_publishing.page_card.status.unpublished", value: "Unveröffentlicht" },
  { locale: "de", key: "ui.web_publishing.page_card.status.archived", value: "Archiviert" },
  { locale: "de", key: "ui.web_publishing.page_card.template", value: "Vorlage:" },
  { locale: "de", key: "ui.web_publishing.page_card.views", value: "{count} Aufrufe" },
  { locale: "de", key: "ui.web_publishing.page_card.published_on", value: "Veröffentlicht {date}" },
  { locale: "de", key: "ui.web_publishing.page_card.not_published", value: "Noch nicht veröffentlicht" },
  { locale: "de", key: "ui.web_publishing.page_card.action.edit", value: "Seiteninhalt bearbeiten" },
  { locale: "de", key: "ui.web_publishing.page_card.action.publish", value: "Veröffentlichen" },
  { locale: "de", key: "ui.web_publishing.page_card.action.unpublish", value: "Veröffentlichung rückgängig machen" },
  { locale: "de", key: "ui.web_publishing.page_card.action.delete", value: "Löschen (archivieren)" },
  { locale: "de", key: "ui.web_publishing.page_card.delete_confirm", value: "Möchten Sie \"{name}\" wirklich löschen? Dadurch wird die Seite archiviert." },

  // Create/Edit Page Tab
  { locale: "de", key: "ui.web_publishing.create.auth_required", value: "Authentifizierung erforderlich" },
  { locale: "de", key: "ui.web_publishing.create.auth_required_desc", value: "Bitte melden Sie sich an, um Seiten zu erstellen." },
  { locale: "de", key: "ui.web_publishing.create.loading", value: "Laden..." },
  { locale: "de", key: "ui.web_publishing.create.no_templates_title", value: "Vorlagen oder Themes nicht verfügbar" },
  { locale: "de", key: "ui.web_publishing.create.no_templates_desc", value: "Ihre Organisation hat noch keine Vorlagen aktiviert." },
  { locale: "de", key: "ui.web_publishing.create.no_themes_desc", value: "Keine Themes im System gefunden." },
  { locale: "de", key: "ui.web_publishing.create.contact_admin", value: "Wenden Sie sich an Ihren Systemadministrator, um Vorlagen zu aktivieren." },
  { locale: "de", key: "ui.web_publishing.create.debug_info", value: "Debug-Info" },
  { locale: "de", key: "ui.web_publishing.create.title_new", value: "Neue Seite erstellen" },
  { locale: "de", key: "ui.web_publishing.create.title_edit", value: "Seite bearbeiten" },
  { locale: "de", key: "ui.web_publishing.create.editing_mode_title", value: "Bearbeitungsmodus" },
  { locale: "de", key: "ui.web_publishing.create.editing_mode_desc", value: "Sie bearbeiten eine vorhandene Seite. Änderungen werden sofort aktualisiert." },
  { locale: "de", key: "ui.web_publishing.create.success_title", value: "Seite erfolgreich erstellt!" },
  { locale: "de", key: "ui.web_publishing.create.success_desc", value: "Ihre Seite wurde als Entwurf erstellt. Sie können sie im Tab \"Veröffentlichte Seiten\" veröffentlichen." },

  // Template Selection
  { locale: "de", key: "ui.web_publishing.template.select_title", value: "Vorlage auswählen" },
  { locale: "de", key: "ui.web_publishing.template.required", value: "*" },

  // Theme Selection
  { locale: "de", key: "ui.web_publishing.theme.select_title", value: "Theme auswählen" },
  { locale: "de", key: "ui.web_publishing.theme.required", value: "*" },
  { locale: "de", key: "ui.web_publishing.theme.colors", value: "Farben:" },
  { locale: "de", key: "ui.web_publishing.theme.primary_gradient", value: "Primärer Gradient" },
  { locale: "de", key: "ui.web_publishing.theme.background", value: "Hintergrund" },
  { locale: "de", key: "ui.web_publishing.theme.text", value: "Text" },
  { locale: "de", key: "ui.web_publishing.theme.secondary", value: "Sekundär" },

  // Page Metadata
  { locale: "de", key: "ui.web_publishing.meta.page_title", value: "Seitentitel" },
  { locale: "de", key: "ui.web_publishing.meta.page_slug", value: "Seiten-Slug" },
  { locale: "de", key: "ui.web_publishing.meta.meta_description", value: "Meta-Beschreibung (Optional)" },
  { locale: "de", key: "ui.web_publishing.meta.meta_description_placeholder", value: "Kurze Beschreibung für SEO und Social Sharing" },
  { locale: "de", key: "ui.web_publishing.meta.character_count", value: "{count}/160 Zeichen" },
  { locale: "de", key: "ui.web_publishing.meta.url_preview", value: "URL:" },

  // Link Products
  { locale: "de", key: "ui.web_publishing.products.title", value: "Produkte verknüpfen (Optional)" },
  { locale: "de", key: "ui.web_publishing.products.description", value: "Verknüpfen Sie Produkte mit dieser Seite. Sie werden in der Checkout-UI Ihrer Vorlage angezeigt." },
  { locale: "de", key: "ui.web_publishing.products.checkout_required_title", value: "Checkout-App erforderlich" },
  { locale: "de", key: "ui.web_publishing.products.checkout_required_desc", value: "Um Produkte mit Ihren Seiten zu verknüpfen, benötigen Sie die Checkout-App für Ihre Organisation." },
  { locale: "de", key: "ui.web_publishing.products.contact_admin", value: "Wenden Sie sich an Ihren Administrator, um die Checkout-App zu aktivieren, oder besuchen Sie das Control Panel, wenn Sie Administrator sind." },
  { locale: "de", key: "ui.web_publishing.products.no_products", value: "Noch keine Produkte. Erstellen Sie zuerst Produkte in der Produkte-App." },
  { locale: "de", key: "ui.web_publishing.products.linked", value: "✓ Verknüpft" },
  { locale: "de", key: "ui.web_publishing.products.link", value: "Verknüpfen" },
  { locale: "de", key: "ui.web_publishing.products.count_linked", value: "✓ {count} Produkt verknüpft" },
  { locale: "de", key: "ui.web_publishing.products.count_linked_plural", value: "✓ {count} Produkte verknüpft" },

  // Page Content
  { locale: "de", key: "ui.web_publishing.content.title", value: "Seiteninhalt" },

  // Submit
  { locale: "de", key: "ui.web_publishing.submit.draft_notice", value: "Seite wird als" },
  { locale: "de", key: "ui.web_publishing.submit.draft", value: "Entwurf erstellt" },
  { locale: "de", key: "ui.web_publishing.submit.creating", value: "Erstelle..." },
  { locale: "de", key: "ui.web_publishing.submit.create_page", value: "Seite erstellen" },
  { locale: "de", key: "ui.web_publishing.submit.update_page", value: "Seite aktualisieren" },

  // Preview
  { locale: "de", key: "ui.web_publishing.preview.title", value: "Live-Vorschau" },
  { locale: "de", key: "ui.web_publishing.preview.loading", value: "Vorlagenvorschau wird geladen..." },
  { locale: "de", key: "ui.web_publishing.preview.select_template_title", value: "Vorlage & Theme auswählen" },
  { locale: "de", key: "ui.web_publishing.preview.select_template_desc", value: "Wählen Sie eine Vorlage und ein Theme aus dem linken Bereich, um hier eine Live-Vorschau zu sehen." },
  { locale: "de", key: "ui.web_publishing.preview.template_label", value: "Vorlage:" },
  { locale: "de", key: "ui.web_publishing.preview.theme_label", value: "Theme:" },

  // Form Fields (Dynamic Form Generator)
  { locale: "de", key: "ui.web_publishing.form.required", value: "*" },
  { locale: "de", key: "ui.web_publishing.form.media_library.select", value: "📁 Aus Mediathek auswählen" },
  { locale: "de", key: "ui.web_publishing.form.media_library.required_notice", value: "Bilder müssen zuerst in die Mediathek hochgeladen und dann hier ausgewählt werden." },
  { locale: "de", key: "ui.web_publishing.form.media_library.selected_image", value: "Ausgewähltes Bild:" },
  { locale: "de", key: "ui.web_publishing.form.media_library.remove", value: "Entfernen" },
  { locale: "de", key: "ui.web_publishing.form.media_library.remove_title", value: "Dieses Bild entfernen" },
  { locale: "de", key: "ui.web_publishing.form.icon.custom_placeholder", value: "Oder geben Sie ein benutzerdefiniertes Symbol/Emoji ein" },
  { locale: "de", key: "ui.web_publishing.form.event_link.select_event", value: "-- Veranstaltung auswählen --" },
  { locale: "de", key: "ui.web_publishing.form.event_link.linked_event", value: "Verknüpfte Veranstaltung:" },
  { locale: "de", key: "ui.web_publishing.form.event_link.auto_populated", value: "✓ Felder automatisch aus dieser Veranstaltung ausgefüllt" },
  { locale: "de", key: "ui.web_publishing.form.event_link.name", value: "Name:" },
  { locale: "de", key: "ui.web_publishing.form.event_link.type", value: "Typ:" },
  { locale: "de", key: "ui.web_publishing.form.event_link.date", value: "Datum:" },
  { locale: "de", key: "ui.web_publishing.form.event_link.location", value: "Ort:" },
  { locale: "de", key: "ui.web_publishing.form.checkout_link.select_checkout", value: "-- Checkout auswählen --" },
  { locale: "de", key: "ui.web_publishing.form.checkout_link.linked_checkout", value: "Verknüpfter Checkout:" },
  { locale: "de", key: "ui.web_publishing.form.checkout_link.products_displayed", value: "✓ Produkte werden aus diesem Checkout angezeigt" },
  { locale: "de", key: "ui.web_publishing.form.checkout_link.products", value: "Produkte:" },
  { locale: "de", key: "ui.web_publishing.form.checkout_link.products_linked", value: "{count} verknüpft" },
  { locale: "de", key: "ui.web_publishing.form.checkout_link.payment", value: "Zahlung:" },
  { locale: "de", key: "ui.web_publishing.form.text_array.add", value: "+ {label} hinzufügen" },
  { locale: "de", key: "ui.web_publishing.form.text_array.remove", value: "Entfernen" },
  { locale: "de", key: "ui.web_publishing.form.repeater.add", value: "+ Hinzufügen" },
  { locale: "de", key: "ui.web_publishing.form.repeater.remove", value: "Entfernen" },
  { locale: "de", key: "ui.web_publishing.form.repeater.item_number", value: "{label} #{number}" },
];

/**
 * Seed web publishing translations
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌐 Seeding Web Publishing Translations...");

    // Get system organization and user
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
        "web_publishing",
        "web-publishing-window"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded Web Publishing translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
