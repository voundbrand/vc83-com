/**
 * EMAIL TEMPLATE TRANSLATIONS
 *
 * Translations for order confirmation emails and other transactional emails.
 * Used by orderEmailRenderer.ts
 *
 * Follows the translation system architecture from TRANSLATION_SYSTEM.md
 */

import { mutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export default mutation(async ({ db }) => {
  // Get system organization
  const systemOrg = await db
    .query("organizations")
    .filter((q) => q.eq(q.field("slug"), "system"))
    .first();

  if (!systemOrg) {
    throw new Error("System organization not found");
  }

  // Get or create a system user for createdBy field
  let systemUser = await db
    .query("users")
    .filter((q) => q.eq(q.field("defaultOrgId"), systemOrg._id))
    .first();

  // If no user exists in system org, use the first available user
  if (!systemUser) {
    systemUser = await db.query("users").first();
  }

  if (!systemUser) {
    throw new Error("No users found in database - please create at least one user first");
  }

  const category = "email_templates";
  let insertedCount = 0;
  let updatedCount = 0;

  // ============================================================================
  // ENGLISH TRANSLATIONS
  // ============================================================================

  const englishTranslations = [
    // Email Subject (uses {eventName} placeholder)
    { key: "email.order.subject", value: "Your Tickets for {eventName}" },

    // Email Header
    { key: "email.order.header", value: "Order Confirmation" },

    // Email Body
    { key: "email.order.greeting", value: "Dear" },
    { key: "email.order.confirmed", value: "Your order has been confirmed. We look forward to welcoming you!" },

    // Event Details - These are LABELS for the table
    { key: "email.order.eventName", value: "Event" },
    { key: "email.order.presentedBy", value: "Presented by" },
    { key: "email.order.ticketCount", value: "Tickets" },
    { key: "email.order.date", value: "Date" },
    { key: "email.order.location", value: "Location" },

    // Order Info - These are LABELS
    { key: "email.order.orderNumber", value: "Order" },
    { key: "email.order.orderDate", value: "Date" },

    // Attachments
    { key: "email.order.documentsHeader", value: "Your Documents" },
    { key: "email.order.documentsBody", value: "Your tickets and invoice are attached as PDF files. Please present your ticket at the event entrance." },

    // Footer (uses {supportEmail}, {year}, {organizationName} placeholders)
    { key: "email.order.supportText", value: "Need assistance? Contact us at {supportEmail}" },
    { key: "email.order.copyright", value: "© {year} {organizationName}. All rights reserved." },
  ];

  for (const t of englishTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "en",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  // ============================================================================
  // GERMAN TRANSLATIONS
  // ============================================================================

  const germanTranslations = [
    // Email Subject (uses {eventName} placeholder)
    { key: "email.order.subject", value: "Ihre Tickets für {eventName}" },

    // Email Header
    { key: "email.order.header", value: "Bestellbestätigung" },

    // Email Body
    { key: "email.order.greeting", value: "Sehr geehrte/r" },
    { key: "email.order.confirmed", value: "Ihre Bestellung wurde bestätigt. Wir freuen uns, Sie begrüßen zu dürfen!" },

    // Event Details - These are LABELS for the table
    { key: "email.order.eventName", value: "Veranstaltung" },
    { key: "email.order.presentedBy", value: "Präsentiert von" },
    { key: "email.order.ticketCount", value: "Tickets" },
    { key: "email.order.date", value: "Datum" },
    { key: "email.order.location", value: "Ort" },

    // Order Info - These are LABELS
    { key: "email.order.orderNumber", value: "Bestellung" },
    { key: "email.order.orderDate", value: "Datum" },

    // Attachments
    { key: "email.order.documentsHeader", value: "Ihre Dokumente" },
    { key: "email.order.documentsBody", value: "Ihre Tickets und Rechnung sind als PDF-Dateien angehängt. Bitte zeigen Sie Ihr Ticket am Eingang vor." },

    // Footer (uses {supportEmail}, {year}, {organizationName} placeholders)
    { key: "email.order.supportText", value: "Benötigen Sie Hilfe? Kontaktieren Sie uns unter {supportEmail}" },
    { key: "email.order.copyright", value: "© {year} {organizationName}. Alle Rechte vorbehalten." },
  ];

  for (const t of germanTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "de",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  // ============================================================================
  // SPANISH TRANSLATIONS
  // ============================================================================

  const spanishTranslations = [
    // Email Subject (uses {eventName} placeholder)
    { key: "email.order.subject", value: "Sus boletos para {eventName}" },

    // Email Header
    { key: "email.order.header", value: "Confirmación de Pedido" },

    // Email Body
    { key: "email.order.greeting", value: "Estimado/a" },
    { key: "email.order.confirmed", value: "Su pedido ha sido confirmado. ¡Esperamos darle la bienvenida!" },

    // Event Details - These are LABELS for the table
    { key: "email.order.eventName", value: "Evento" },
    { key: "email.order.presentedBy", value: "Presentado por" },
    { key: "email.order.ticketCount", value: "Boletos" },
    { key: "email.order.date", value: "Fecha" },
    { key: "email.order.location", value: "Ubicación" },

    // Order Info - These are LABELS
    { key: "email.order.orderNumber", value: "Pedido" },
    { key: "email.order.orderDate", value: "Fecha" },

    // Attachments
    { key: "email.order.documentsHeader", value: "Sus Documentos" },
    { key: "email.order.documentsBody", value: "Sus boletos y factura están adjuntos como archivos PDF. Por favor presente su boleto en la entrada del evento." },

    // Footer (uses {supportEmail}, {year}, {organizationName} placeholders)
    { key: "email.order.supportText", value: "¿Necesita ayuda? Contáctenos en {supportEmail}" },
    { key: "email.order.copyright", value: "© {year} {organizationName}. Todos los derechos reservados." },
  ];

  for (const t of spanishTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "es",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  // ============================================================================
  // FRENCH TRANSLATIONS
  // ============================================================================

  const frenchTranslations = [
    // Email Subject (uses {eventName} placeholder)
    { key: "email.order.subject", value: "Vos billets pour {eventName}" },

    // Email Header
    { key: "email.order.header", value: "Confirmation de Commande" },

    // Email Body
    { key: "email.order.greeting", value: "Cher/Chère" },
    { key: "email.order.confirmed", value: "Votre commande a été confirmée. Nous avons hâte de vous accueillir!" },

    // Event Details - These are LABELS for the table
    { key: "email.order.eventName", value: "Événement" },
    { key: "email.order.presentedBy", value: "Présenté par" },
    { key: "email.order.ticketCount", value: "Billets" },
    { key: "email.order.date", value: "Date" },
    { key: "email.order.location", value: "Lieu" },

    // Order Info - These are LABELS
    { key: "email.order.orderNumber", value: "Commande" },
    { key: "email.order.orderDate", value: "Date" },

    // Attachments
    { key: "email.order.documentsHeader", value: "Vos Documents" },
    { key: "email.order.documentsBody", value: "Vos billets et facture sont joints en fichiers PDF. Veuillez présenter votre billet à l'entrée de l'événement." },

    // Footer (uses {supportEmail}, {year}, {organizationName} placeholders)
    { key: "email.order.supportText", value: "Besoin d'aide? Contactez-nous à {supportEmail}" },
    { key: "email.order.copyright", value: "© {year} {organizationName}. Tous droits réservés." },
  ];

  for (const t of frenchTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "fr",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  console.log(`✅ Email template translations seeded: ${insertedCount} new, ${updatedCount} updated`);
  return { success: true, inserted: insertedCount, updated: updatedCount };
});
