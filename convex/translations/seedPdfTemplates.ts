/**
 * PDF TEMPLATE TRANSLATIONS
 *
 * Translations for invoice and ticket PDF templates.
 * Used by pdfGeneration.ts
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
  const category = "pdf_templates";
  let insertedCount = 0;

  // ============================================================================
  // ENGLISH TRANSLATIONS (Invoice)
  // ============================================================================

  const englishInvoiceTranslations = [
    { key: "pdf.invoice.title", value: "Invoice" },
    { key: "pdf.invoice.number", value: "Invoice #" },
    { key: "pdf.invoice.date", value: "Date" },
    { key: "pdf.invoice.dueDate", value: "Due Date" },
    { key: "pdf.invoice.from", value: "From" },
    { key: "pdf.invoice.billTo", value: "Bill To" },
    { key: "pdf.invoice.attention", value: "Attn:" },
    { key: "pdf.invoice.vat", value: "VAT #" },
    { key: "pdf.invoice.itemDescription", value: "Description" },
    { key: "pdf.invoice.quantity", value: "Qty" },
    { key: "pdf.invoice.unitPrice", value: "Unit Price" },
    { key: "pdf.invoice.net", value: "Net" },
    { key: "pdf.invoice.gross", value: "Gross" },
    { key: "pdf.invoice.total", value: "Total" },
    { key: "pdf.invoice.subtotal", value: "Subtotal" },
    { key: "pdf.invoice.tax", value: "VAT" },
    { key: "pdf.invoice.paymentTerms", value: "Payment Terms" },
    { key: "pdf.invoice.terms", value: "Terms:" },
    { key: "pdf.invoice.method", value: "Method:" },
    { key: "pdf.invoice.paymentDue", value: "Payment due by" },
    { key: "pdf.invoice.latePayment", value: "Late fees may apply." },
    { key: "pdf.invoice.forQuestions", value: "For questions, contact" },
    { key: "pdf.invoice.contactUs", value: "or call" },
    { key: "pdf.invoice.thankYou", value: "Thank you for your business!" },
  ];

  for (const t of englishInvoiceTranslations) {
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
  // GERMAN TRANSLATIONS (Invoice)
  // ============================================================================

  const germanInvoiceTranslations = [
    { key: "pdf.invoice.title", value: "Rechnung" },
    { key: "pdf.invoice.number", value: "Rechnungsnr." },
    { key: "pdf.invoice.date", value: "Datum" },
    { key: "pdf.invoice.dueDate", value: "Fällig am" },
    { key: "pdf.invoice.from", value: "Von" },
    { key: "pdf.invoice.billTo", value: "Rechnungsempfänger" },
    { key: "pdf.invoice.attention", value: "Z. Hd.:" },
    { key: "pdf.invoice.vat", value: "USt-IdNr." },
    { key: "pdf.invoice.itemDescription", value: "Beschreibung" },
    { key: "pdf.invoice.quantity", value: "Menge" },
    { key: "pdf.invoice.unitPrice", value: "Einzelpreis" },
    { key: "pdf.invoice.net", value: "Netto" },
    { key: "pdf.invoice.gross", value: "Brutto" },
    { key: "pdf.invoice.total", value: "Gesamt" },
    { key: "pdf.invoice.subtotal", value: "Zwischensumme" },
    { key: "pdf.invoice.tax", value: "MwSt." },
    { key: "pdf.invoice.paymentTerms", value: "Zahlungsbedingungen" },
    { key: "pdf.invoice.terms", value: "Bedingungen:" },
    { key: "pdf.invoice.method", value: "Methode:" },
    { key: "pdf.invoice.paymentDue", value: "Zahlung fällig bis" },
    { key: "pdf.invoice.latePayment", value: "Bei verspäteter Zahlung können Mahngebühren anfallen." },
    { key: "pdf.invoice.forQuestions", value: "Bei Fragen kontaktieren Sie" },
    { key: "pdf.invoice.contactUs", value: "oder rufen Sie an" },
    { key: "pdf.invoice.thankYou", value: "Vielen Dank für Ihre Bestellung!" },
  ];

  for (const t of germanInvoiceTranslations) {
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

  console.log(`✅ PDF template translations seeded: ${insertedCount} new translations`);
  return { success: true, inserted: insertedCount };
});
