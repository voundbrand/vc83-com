/**
 * PRODUCTS TRANSLATION SEED DATA
 *
 * Translation keys for all Product UI text across the platform.
 * Supports English (en) and German (de) initially.
 *
 * Key format: ui.products.{section}.{element}
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

interface TranslationEntry {
  locale: string;
  key: string;
  value: string;
}

export function getProductTranslations(): TranslationEntry[] {
  return [
    // ========================================
    // PRODUCTS WINDOW - MAIN HEADER
    // ========================================
    { locale: "en", key: "ui.products.header.title", value: "Products" },
    { locale: "de", key: "ui.products.header.title", value: "Produkte" },
    { locale: "pl", key: "ui.products.header.title", value: "Produkty" },
    { locale: "es", key: "ui.products.header.title", value: "Productos" },
    { locale: "fr", key: "ui.products.header.title", value: "Produits" },
    { locale: "ja", key: "ui.products.header.title", value: "製品" },

    { locale: "en", key: "ui.products.header.description", value: "Manage your product catalog - tickets, merchandise, and digital goods" },
    { locale: "de", key: "ui.products.header.description", value: "Verwalten Sie Ihren Produktkatalog - Tickets, Merchandise und digitale Güter" },
    { locale: "pl", key: "ui.products.header.description", value: "Zarządzaj katalogiem produktów - bilety, towary i produkty cyfrowe" },
    { locale: "es", key: "ui.products.header.description", value: "Gestiona tu catálogo de productos - entradas, mercancía y productos digitales" },
    { locale: "fr", key: "ui.products.header.description", value: "Gérez votre catalogue de produits - billets, marchandises et produits numériques" },
    { locale: "ja", key: "ui.products.header.description", value: "製品カタログを管理 - チケット、商品、デジタル製品" },

    { locale: "en", key: "ui.products.button.createProduct", value: "Create Product" },
    { locale: "de", key: "ui.products.button.createProduct", value: "Produkt erstellen" },

    { locale: "en", key: "ui.products.button.backToList", value: "Back to List" },
    { locale: "de", key: "ui.products.button.backToList", value: "Zurück zur Liste" },

    { locale: "en", key: "ui.products.loading", value: "Loading products..." },
    { locale: "de", key: "ui.products.loading", value: "Produkte laden..." },

    { locale: "en", key: "ui.products.error.login", value: "Please log in to access products" },
    { locale: "de", key: "ui.products.error.login", value: "Bitte melden Sie sich an, um auf Produkte zuzugreifen" },

    { locale: "en", key: "ui.products.error.noOrg", value: "No Organization Selected" },
    { locale: "de", key: "ui.products.error.noOrg", value: "Keine Organisation ausgewählt" },

    { locale: "en", key: "ui.products.error.noOrgDescription", value: "Please select an organization to manage products" },
    { locale: "de", key: "ui.products.error.noOrgDescription", value: "Bitte wählen Sie eine Organisation aus, um Produkte zu verwalten" },

    // ========================================
    // PRODUCTS LIST
    // ========================================
    { locale: "en", key: "ui.products.list.empty", value: "No products yet. Click \"Create Product\" to get started." },
    { locale: "de", key: "ui.products.list.empty", value: "Noch keine Produkte. Klicken Sie auf \"Produkt erstellen\", um loszulegen." },

    { locale: "en", key: "ui.products.list.filter.allTypes", value: "All Types" },
    { locale: "de", key: "ui.products.list.filter.allTypes", value: "Alle Typen" },

    { locale: "en", key: "ui.products.list.filter.tickets", value: "Tickets" },
    { locale: "de", key: "ui.products.list.filter.tickets", value: "Tickets" },

    { locale: "en", key: "ui.products.list.filter.physical", value: "Physical" },
    { locale: "de", key: "ui.products.list.filter.physical", value: "Physisch" },

    { locale: "en", key: "ui.products.list.filter.digital", value: "Digital" },
    { locale: "de", key: "ui.products.list.filter.digital", value: "Digital" },

    { locale: "en", key: "ui.products.list.filter.allStatuses", value: "All Statuses" },
    { locale: "de", key: "ui.products.list.filter.allStatuses", value: "Alle Status" },

    { locale: "en", key: "ui.products.list.status.draft", value: "Draft" },
    { locale: "de", key: "ui.products.list.status.draft", value: "Entwurf" },

    { locale: "en", key: "ui.products.list.status.active", value: "Active" },
    { locale: "de", key: "ui.products.list.status.active", value: "Aktiv" },

    { locale: "en", key: "ui.products.list.status.soldOut", value: "Sold Out" },
    { locale: "de", key: "ui.products.list.status.soldOut", value: "Ausverkauft" },

    { locale: "en", key: "ui.products.list.status.archived", value: "Archived" },
    { locale: "de", key: "ui.products.list.status.archived", value: "Archiviert" },

    { locale: "en", key: "ui.products.list.label.price", value: "Price:" },
    { locale: "de", key: "ui.products.list.label.price", value: "Preis:" },

    { locale: "en", key: "ui.products.list.label.inventory", value: "Inventory:" },
    { locale: "de", key: "ui.products.list.label.inventory", value: "Bestand:" },

    { locale: "en", key: "ui.products.list.label.available", value: "available" },
    { locale: "de", key: "ui.products.list.label.available", value: "verfügbar" },

    { locale: "en", key: "ui.products.list.label.sold", value: "Sold:" },
    { locale: "de", key: "ui.products.list.label.sold", value: "Verkauft:" },

    { locale: "en", key: "ui.products.list.button.edit", value: "Edit" },
    { locale: "de", key: "ui.products.list.button.edit", value: "Bearbeiten" },

    { locale: "en", key: "ui.products.list.button.publish", value: "Publish" },
    { locale: "de", key: "ui.products.list.button.publish", value: "Veröffentlichen" },

    { locale: "en", key: "ui.products.list.confirm.delete", value: "Are you sure you want to archive this product?" },
    { locale: "de", key: "ui.products.list.confirm.delete", value: "Sind Sie sicher, dass Sie dieses Produkt archivieren möchten?" },

    { locale: "en", key: "ui.products.list.error.deleteFailed", value: "Failed to delete product" },
    { locale: "de", key: "ui.products.list.error.deleteFailed", value: "Produkt konnte nicht gelöscht werden" },

    { locale: "en", key: "ui.products.list.error.publishFailed", value: "Failed to publish product" },
    { locale: "de", key: "ui.products.list.error.publishFailed", value: "Produkt konnte nicht veröffentlicht werden" },

    // ========================================
    // PRODUCT FORM - BASIC INFO
    // ========================================
    { locale: "en", key: "ui.products.form.type.label", value: "Product Type" },
    { locale: "de", key: "ui.products.form.type.label", value: "Produkttyp" },

    { locale: "en", key: "ui.products.form.type.ticket", value: "Ticket - Event tickets (VIP, standard, early-bird)" },
    { locale: "de", key: "ui.products.form.type.ticket", value: "Ticket - Veranstaltungstickets (VIP, Standard, Frühbucher)" },

    { locale: "en", key: "ui.products.form.type.physical", value: "Physical - Merchandise, swag, physical goods" },
    { locale: "de", key: "ui.products.form.type.physical", value: "Physisch - Merchandise, Swag, physische Güter" },

    { locale: "en", key: "ui.products.form.type.digital", value: "Digital - Downloads, access codes, digital content" },
    { locale: "de", key: "ui.products.form.type.digital", value: "Digital - Downloads, Zugangs codes, digitale Inhalte" },

    { locale: "en", key: "ui.products.form.type.locked", value: "Product type cannot be changed after creation" },
    { locale: "de", key: "ui.products.form.type.locked", value: "Produkttyp kann nach der Erstellung nicht geändert werden" },

    { locale: "en", key: "ui.products.form.name.label", value: "Product Name" },
    { locale: "de", key: "ui.products.form.name.label", value: "Produktname" },

    { locale: "en", key: "ui.products.form.name.placeholder", value: "VIP Ticket, T-Shirt, Digital Album, etc." },
    { locale: "de", key: "ui.products.form.name.placeholder", value: "VIP-Ticket, T-Shirt, Digitales Album usw." },

    { locale: "en", key: "ui.products.form.description.label", value: "Description" },
    { locale: "de", key: "ui.products.form.description.label", value: "Beschreibung" },

    { locale: "en", key: "ui.products.form.description.placeholder", value: "Describe the product features, benefits, and details..." },
    { locale: "de", key: "ui.products.form.description.placeholder", value: "Beschreiben Sie die Produkteigenschaften, Vorteile und Details..." },

    { locale: "en", key: "ui.products.form.price.label", value: "Price" },
    { locale: "de", key: "ui.products.form.price.label", value: "Preis" },

    { locale: "en", key: "ui.products.form.price.help", value: "Enter price in dollars/euros (e.g., 49.99 for $49.99)" },
    { locale: "de", key: "ui.products.form.price.help", value: "Geben Sie den Preis in Dollar/Euro ein (z.B. 49,99 für 49,99 €)" },

    { locale: "en", key: "ui.products.form.inventory.label", value: "Inventory (Optional)" },
    { locale: "de", key: "ui.products.form.inventory.label", value: "Bestand (Optional)" },

    { locale: "en", key: "ui.products.form.inventory.placeholder", value: "Leave empty for unlimited" },
    { locale: "de", key: "ui.products.form.inventory.placeholder", value: "Leer lassen für unbegrenzt" },

    { locale: "en", key: "ui.products.form.inventory.help", value: "Available quantity. Leave empty for unlimited inventory." },
    { locale: "de", key: "ui.products.form.inventory.help", value: "Verfügbare Menge. Leer lassen für unbegrenzten Bestand." },

    // ========================================
    // PRODUCT FORM - TAX SETTINGS
    // ========================================
    { locale: "en", key: "ui.products.form.tax.title", value: "Tax Settings" },
    { locale: "de", key: "ui.products.form.tax.title", value: "Steuereinstellungen" },

    { locale: "en", key: "ui.products.form.tax.description", value: "Configure how taxes are calculated and displayed for this product" },
    { locale: "de", key: "ui.products.form.tax.description", value: "Konfigurieren Sie, wie Steuern für dieses Produkt berechnet und angezeigt werden" },

    { locale: "en", key: "ui.products.form.tax.taxable", value: "Product is Taxable" },
    { locale: "de", key: "ui.products.form.tax.taxable", value: "Produkt ist steuerpflichtig" },

    { locale: "en", key: "ui.products.form.tax.taxableYes", value: "Tax will be calculated for this product" },
    { locale: "de", key: "ui.products.form.tax.taxableYes", value: "Steuern werden für dieses Produkt berechnet" },

    { locale: "en", key: "ui.products.form.tax.taxableNo", value: "Product is tax-exempt" },
    { locale: "de", key: "ui.products.form.tax.taxableNo", value: "Produkt ist steuerfrei" },

    { locale: "en", key: "ui.products.form.tax.taxCode.label", value: "Tax Code (Optional)" },
    { locale: "de", key: "ui.products.form.tax.taxCode.label", value: "Steuercode (Optional)" },

    { locale: "en", key: "ui.products.form.tax.behavior.label", value: "Tax Behavior" },
    { locale: "de", key: "ui.products.form.tax.behavior.label", value: "Steuerverhalten" },

    { locale: "en", key: "ui.products.form.tax.behavior.exclusive", value: "Exclusive (US-style) - Tax added on top of price" },
    { locale: "de", key: "ui.products.form.tax.behavior.exclusive", value: "Exklusiv (US-Stil) - Steuer wird auf den Preis aufgeschlagen" },

    { locale: "en", key: "ui.products.form.tax.behavior.inclusive", value: "Inclusive (EU-style) - Tax included in price" },
    { locale: "de", key: "ui.products.form.tax.behavior.inclusive", value: "Inklusiv (EU-Stil) - Steuer im Preis enthalten" },

    { locale: "en", key: "ui.products.form.tax.behavior.automatic", value: "Automatic - Let Stripe decide based on currency/region" },
    { locale: "de", key: "ui.products.form.tax.behavior.automatic", value: "Automatisch - Stripe entscheidet basierend auf Währung/Region" },

    // ========================================
    // PRODUCT FORM - FORM LINKING
    // ========================================
    { locale: "en", key: "ui.products.form.formLink.title", value: "Registration Form (Optional)" },
    { locale: "de", key: "ui.products.form.formLink.title", value: "Anmeldeformular (Optional)" },

    { locale: "en", key: "ui.products.form.formLink.description", value: "Link a form to collect additional information during or after checkout" },
    { locale: "de", key: "ui.products.form.formLink.description", value: "Verknüpfen Sie ein Formular, um zusätzliche Informationen während oder nach dem Checkout zu sammeln" },

    { locale: "en", key: "ui.products.form.formLink.select", value: "Select Form" },
    { locale: "de", key: "ui.products.form.formLink.select", value: "Formular auswählen" },

    { locale: "en", key: "ui.products.form.formLink.none", value: "-- No Form --" },
    { locale: "de", key: "ui.products.form.formLink.none", value: "-- Kein Formular --" },

    { locale: "en", key: "ui.products.form.formLink.timing.label", value: "When to Collect Form" },
    { locale: "de", key: "ui.products.form.formLink.timing.label", value: "Wann das Formular einzusammeln ist" },

    { locale: "en", key: "ui.products.form.formLink.timing.duringCheckout", value: "During Checkout (before payment)" },
    { locale: "de", key: "ui.products.form.formLink.timing.duringCheckout", value: "Während des Checkouts (vor der Zahlung)" },

    { locale: "en", key: "ui.products.form.formLink.timing.afterPurchase", value: "After Purchase (via email link)" },
    { locale: "de", key: "ui.products.form.formLink.timing.afterPurchase", value: "Nach dem Kauf (per E-Mail-Link)" },

    { locale: "en", key: "ui.products.form.formLink.timing.standalone", value: "Standalone (separate link only)" },
    { locale: "de", key: "ui.products.form.formLink.timing.standalone", value: "Eigenständig (nur separater Link)" },

    { locale: "en", key: "ui.products.form.formLink.required.label", value: "Form Completion Required" },
    { locale: "de", key: "ui.products.form.formLink.required.label", value: "Formularausfüllung erforderlich" },

    { locale: "en", key: "ui.products.form.formLink.required.yes", value: "Customer must complete form to proceed" },
    { locale: "de", key: "ui.products.form.formLink.required.yes", value: "Kunde muss Formular ausfüllen, um fortzufahren" },

    { locale: "en", key: "ui.products.form.formLink.required.no", value: "Form is optional" },
    { locale: "de", key: "ui.products.form.formLink.required.no", value: "Formular ist optional" },

    // ========================================
    // ADDONS
    // ========================================
    { locale: "en", key: "ui.products.addons.title", value: "Product Add-ons" },
    { locale: "de", key: "ui.products.addons.title", value: "Produkt-Zusätze" },

    { locale: "en", key: "ui.products.addons.description", value: "Optional extras that can be added via form selections (e.g., boat trip, workshop upgrade, meal options)" },
    { locale: "de", key: "ui.products.addons.description", value: "Optionale Extras, die über Formularauswahlen hinzugefügt werden können (z.B. Bootsfahrt, Workshop-Upgrade, Mahlzeiten-Optionen)" },

    { locale: "en", key: "ui.products.addons.button.add", value: "Add Addon" },
    { locale: "de", key: "ui.products.addons.button.add", value: "Zusatz hinzufügen" },

    { locale: "en", key: "ui.products.addons.button.save", value: "Save Addon" },
    { locale: "de", key: "ui.products.addons.button.save", value: "Zusatz speichern" },

    { locale: "en", key: "ui.products.addons.button.cancel", value: "Cancel" },
    { locale: "de", key: "ui.products.addons.button.cancel", value: "Abbrechen" },

    { locale: "en", key: "ui.products.addons.button.edit", value: "Edit" },
    { locale: "de", key: "ui.products.addons.button.edit", value: "Bearbeiten" },

    { locale: "en", key: "ui.products.addons.button.delete", value: "Delete" },
    { locale: "de", key: "ui.products.addons.button.delete", value: "Löschen" },

    { locale: "en", key: "ui.products.addons.name.label", value: "Name" },
    { locale: "de", key: "ui.products.addons.name.label", value: "Name" },

    { locale: "en", key: "ui.products.addons.name.placeholder", value: "UCRA Evening Event, Workshop Upgrade, etc." },
    { locale: "de", key: "ui.products.addons.name.placeholder", value: "UCRA-Abendveranstaltung, Workshop-Upgrade usw." },

    { locale: "en", key: "ui.products.addons.price.label", value: "Price Per Unit" },
    { locale: "de", key: "ui.products.addons.price.label", value: "Preis pro Einheit" },

    { locale: "en", key: "ui.products.addons.taxable.label", value: "Addon is Taxable" },
    { locale: "de", key: "ui.products.addons.taxable.label", value: "Zusatz ist steuerpflichtig" },

    // ========================================
    // INVOICING CONFIG
    // ========================================
    { locale: "en", key: "ui.products.invoicing.title", value: "B2B Invoicing - Employer Mapping (Optional)" },
    { locale: "de", key: "ui.products.invoicing.title", value: "B2B-Rechnungsstellung - Arbeitgeber-Zuordnung (Optional)" },

    { locale: "en", key: "ui.products.invoicing.description", value: "Map form values to employer organizations for invoice payment (enable invoice payment at checkout level)" },
    { locale: "de", key: "ui.products.invoicing.description", value: "Ordnen Sie Formularwerte Arbeitgeberorganisationen für Rechnungszahlung zu (Rechnungszahlung auf Checkout-Ebene aktivieren)" },

    { locale: "en", key: "ui.products.invoicing.sourceField.label", value: "Form Field Containing Employer Info" },
    { locale: "de", key: "ui.products.invoicing.sourceField.label", value: "Formularfeld mit Arbeitgeberinformationen" },

    { locale: "en", key: "ui.products.invoicing.mapping.label", value: "Form Value → Organization Mapping" },
    { locale: "de", key: "ui.products.invoicing.mapping.label", value: "Formularwert → Organisations-Zuordnung" },

    { locale: "en", key: "ui.products.invoicing.button.addMapping", value: "Add Mapping" },
    { locale: "de", key: "ui.products.invoicing.button.addMapping", value: "Zuordnung hinzufügen" },

    { locale: "en", key: "ui.products.invoicing.paymentTerms.label", value: "Default Payment Terms" },
    { locale: "de", key: "ui.products.invoicing.paymentTerms.label", value: "Standard-Zahlungsbedingungen" },

    { locale: "en", key: "ui.products.invoicing.paymentTerms.net30", value: "NET 30 (Due in 30 days)" },
    { locale: "de", key: "ui.products.invoicing.paymentTerms.net30", value: "NET 30 (Fällig in 30 Tagen)" },

    { locale: "en", key: "ui.products.invoicing.paymentTerms.net60", value: "NET 60 (Due in 60 days)" },
    { locale: "de", key: "ui.products.invoicing.paymentTerms.net60", value: "NET 60 (Fällig in 60 Tagen)" },

    { locale: "en", key: "ui.products.invoicing.paymentTerms.net90", value: "NET 90 (Due in 90 days)" },
    { locale: "de", key: "ui.products.invoicing.paymentTerms.net90", value: "NET 90 (Fällig in 90 Tagen)" },

    // ========================================
    // CHECKOUT - PRODUCT SELECTION
    // ========================================
    { locale: "en", key: "ui.products.checkout.title", value: "Get Your Ticket" },
    { locale: "de", key: "ui.products.checkout.title", value: "Holen Sie sich Ihr Ticket" },

    { locale: "en", key: "ui.products.checkout.subtitle.earlyBird", value: "Early bird pricing ends soon!" },
    { locale: "de", key: "ui.products.checkout.subtitle.earlyBird", value: "Frühbucherpreise enden bald!" },

    { locale: "en", key: "ui.products.checkout.subtitle.default", value: "Select your ticket type" },
    { locale: "de", key: "ui.products.checkout.subtitle.default", value: "Wählen Sie Ihren Ticket-Typ" },

    { locale: "en", key: "ui.products.checkout.selectType", value: "Select Ticket Type" },
    { locale: "de", key: "ui.products.checkout.selectType", value: "Ticket-Typ auswählen" },

    { locale: "en", key: "ui.products.checkout.quantity", value: "Quantity" },
    { locale: "de", key: "ui.products.checkout.quantity", value: "Menge" },

    { locale: "en", key: "ui.products.checkout.orderSummary", value: "Order Summary" },
    { locale: "de", key: "ui.products.checkout.orderSummary", value: "Bestellübersicht" },

    { locale: "en", key: "ui.products.checkout.whatsIncluded", value: "What's Included" },
    { locale: "de", key: "ui.products.checkout.whatsIncluded", value: "Was ist enthalten" },

    { locale: "en", key: "ui.products.checkout.subtotal", value: "Subtotal" },
    { locale: "de", key: "ui.products.checkout.subtotal", value: "Zwischensumme" },

    { locale: "en", key: "ui.products.checkout.ticket", value: "ticket" },
    { locale: "de", key: "ui.products.checkout.ticket", value: "Ticket" },

    { locale: "en", key: "ui.products.checkout.tickets", value: "tickets" },
    { locale: "de", key: "ui.products.checkout.tickets", value: "Tickets" },

    { locale: "en", key: "ui.products.checkout.savings", value: "Early Bird Savings" },
    { locale: "de", key: "ui.products.checkout.savings", value: "Frühbucher-Ersparnis" },

    { locale: "en", key: "ui.products.checkout.tax", value: "Tax" },
    { locale: "de", key: "ui.products.checkout.tax", value: "Steuer" },

    { locale: "en", key: "ui.products.checkout.tax.included", value: "included" },
    { locale: "de", key: "ui.products.checkout.tax.included", value: "enthalten" },

    { locale: "en", key: "ui.products.checkout.tax.added", value: "added" },
    { locale: "de", key: "ui.products.checkout.tax.added", value: "hinzugefügt" },

    { locale: "en", key: "ui.products.checkout.total", value: "Total" },
    { locale: "de", key: "ui.products.checkout.total", value: "Gesamt" },

    { locale: "en", key: "ui.products.checkout.button.proceed", value: "Proceed to Checkout" },
    { locale: "de", key: "ui.products.checkout.button.proceed", value: "Zur Kasse gehen" },

    { locale: "en", key: "ui.products.checkout.footer.secure", value: "Secure checkout powered by Stripe" },
    { locale: "de", key: "ui.products.checkout.footer.secure", value: "Sichere Kasse unterstützt von Stripe" },

    // ========================================
    // COMMON ACTIONS
    // ========================================
    { locale: "en", key: "ui.products.button.save", value: "Save" },
    { locale: "de", key: "ui.products.button.save", value: "Speichern" },

    { locale: "en", key: "ui.products.button.cancel", value: "Cancel" },
    { locale: "de", key: "ui.products.button.cancel", value: "Abbrechen" },

    { locale: "en", key: "ui.products.button.update", value: "Update" },
    { locale: "de", key: "ui.products.button.update", value: "Aktualisieren" },

    { locale: "en", key: "ui.products.button.create", value: "Create" },
    { locale: "de", key: "ui.products.button.create", value: "Erstellen" },

    { locale: "en", key: "ui.products.saving", value: "Saving..." },
    { locale: "de", key: "ui.products.saving", value: "Speichern..." },

    { locale: "en", key: "ui.products.required", value: "*" },
    { locale: "de", key: "ui.products.required", value: "*" },
  ];
}

/**
 * Seed mutation for Product translations
 * Run with: npx convex run translations/seedProductTranslations:seed
 */
export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Product translations...");

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

    const systemOrgId = systemOrg._id;
    const systemUserId = systemUser._id;

    // Get all translation entries
    const translations = getProductTranslations();

    // Insert translations
    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of translations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrgId,
        systemUserId,
        translation.key,
        translation.value,
        translation.locale,
        "products" // category
      );
      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(
      `✅ Product translations seeded: ${insertedCount} inserted, ${updatedCount} updated`
    );

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      totalTranslations: translations.length,
      locales: ["en", "de"],
    };
  },
});
