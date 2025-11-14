/**
 * EMAIL TEMPLATE TRANSLATIONS
 *
 * Translations for order confirmation emails and other transactional emails.
 * Used by orderEmailRenderer.ts
 *
 * Follows the translation system architecture from TRANSLATION_SYSTEM.md
 */

import { mutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

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

  const existingKeys = new Set<string>();
  const category = "email_templates";
  let insertedCount = 0;

  // ============================================================================
  // ENGLISH TRANSLATIONS
  // ============================================================================

  const englishTranslations = [
    // Email Subject
    { key: "email.order.subject", value: "Your Tickets for {eventName}" },

    // Email Header
    { key: "email.order.header", value: "Order Confirmation" },

    // Email Body
    { key: "email.order.greeting", value: "{recipientName}" },
    { key: "email.order.confirmed", value: "Your order has been confirmed" },

    // Event Details
    { key: "email.order.eventName", value: "{eventName}" },
    { key: "email.order.presentedBy", value: "Presented by {sponsors}" },
    { key: "email.order.ticketCount", value: "{count} Ticket{plural}" },
    { key: "email.order.date", value: "{date}" },
    { key: "email.order.location", value: "{location}" },

    // Order Info
    { key: "email.order.orderNumber", value: "Order #{orderNumber}" },
    { key: "email.order.orderDate", value: "{date}" },

    // Attachments
    { key: "email.order.documentsHeader", value: "Your Documents" },
    { key: "email.order.documentsBody", value: "Your tickets and invoice are attached as PDF files. Please present your ticket at the event entrance." },

    // Footer
    { key: "email.order.supportText", value: "Need assistance? Contact us at {supportEmail}" },
    { key: "email.order.copyright", value: "© {year} {organizationName}. All rights reserved." },
  ];

  for (const t of englishTranslations) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "en",
      category
    );
    if (inserted) insertedCount++;
  }

  // ============================================================================
  // GERMAN TRANSLATIONS
  // ============================================================================

  const germanTranslations = [
    // Email Subject
    { key: "email.order.subject", value: "Ihre Tickets für {eventName}" },

    // Email Header
    { key: "email.order.header", value: "Bestellbestätigung" },

    // Email Body
    { key: "email.order.greeting", value: "{recipientName}" },
    { key: "email.order.confirmed", value: "Ihre Bestellung wurde bestätigt" },

    // Event Details
    { key: "email.order.eventName", value: "{eventName}" },
    { key: "email.order.presentedBy", value: "Präsentiert von {sponsors}" },
    { key: "email.order.ticketCount", value: "{count} Ticket{plural}" },
    { key: "email.order.date", value: "{date}" },
    { key: "email.order.location", value: "{location}" },

    // Order Info
    { key: "email.order.orderNumber", value: "Bestellung #{orderNumber}" },
    { key: "email.order.orderDate", value: "{date}" },

    // Attachments
    { key: "email.order.documentsHeader", value: "Ihre Dokumente" },
    { key: "email.order.documentsBody", value: "Ihre Tickets und Rechnung sind als PDF-Dateien angehängt. Bitte zeigen Sie Ihr Ticket am Eingang vor." },

    // Footer
    { key: "email.order.supportText", value: "Benötigen Sie Hilfe? Kontaktieren Sie uns unter {supportEmail}" },
    { key: "email.order.copyright", value: "© {year} {organizationName}. Alle Rechte vorbehalten." },
  ];

  for (const t of germanTranslations) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "de",
      category
    );
    if (inserted) insertedCount++;
  }

  console.log(`✅ Email template translations seeded: ${insertedCount} new translations`);
  return { success: true, inserted: insertedCount };
});
