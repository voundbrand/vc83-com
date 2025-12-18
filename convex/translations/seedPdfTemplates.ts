/**
 * PDF TEMPLATE TRANSLATIONS
 *
 * Translations for invoice and ticket PDF templates.
 * Used by pdfGeneration.ts
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

  const category = "pdf_templates";
  let insertedCount = 0;
  let updatedCount = 0;

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
    // Payment status translations
    { key: "pdf.invoice.paid", value: "Paid" },
    { key: "pdf.invoice.paidOn", value: "Paid on" },
    { key: "pdf.invoice.paymentReceived", value: "Payment Received" },
    { key: "pdf.invoice.status", value: "Status" },
    // Payment terms translations
    { key: "pdf.invoice.paymentTerms.due_on_receipt", value: "Due upon receipt" },
    { key: "pdf.invoice.paymentTerms.dueonreceipt", value: "Due upon receipt" },
    { key: "pdf.invoice.paymentTerms.net7", value: "Net 7 – Payment due within 7 days" },
    { key: "pdf.invoice.paymentTerms.net15", value: "Net 15 – Payment due within 15 days" },
    { key: "pdf.invoice.paymentTerms.net30", value: "Net 30 – Payment due within 30 days" },
    { key: "pdf.invoice.paymentTerms.net60", value: "Net 60 – Payment due within 60 days" },
    { key: "pdf.invoice.paymentTerms.net90", value: "Net 90 – Payment due within 90 days" },
  ];

  for (const t of englishInvoiceTranslations) {
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
    // Payment status translations
    { key: "pdf.invoice.paid", value: "Bezahlt" },
    { key: "pdf.invoice.paidOn", value: "Bezahlt am" },
    { key: "pdf.invoice.paymentReceived", value: "Zahlung erhalten" },
    { key: "pdf.invoice.status", value: "Status" },
    // Payment terms translations
    { key: "pdf.invoice.paymentTerms.due_on_receipt", value: "Sofort fällig" },
    { key: "pdf.invoice.paymentTerms.dueonreceipt", value: "Sofort fällig" },
    { key: "pdf.invoice.paymentTerms.net7", value: "Netto 7 – Zahlung innerhalb von 7 Tagen" },
    { key: "pdf.invoice.paymentTerms.net15", value: "Netto 15 – Zahlung innerhalb von 15 Tagen" },
    { key: "pdf.invoice.paymentTerms.net30", value: "Netto 30 – Zahlung innerhalb von 30 Tagen" },
    { key: "pdf.invoice.paymentTerms.net60", value: "Netto 60 – Zahlung innerhalb von 60 Tagen" },
    { key: "pdf.invoice.paymentTerms.net90", value: "Netto 90 – Zahlung innerhalb von 90 Tagen" },
  ];

  for (const t of germanInvoiceTranslations) {
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
  // SPANISH TRANSLATIONS (Invoice)
  // ============================================================================

  const spanishInvoiceTranslations = [
    { key: "pdf.invoice.title", value: "Factura" },
    { key: "pdf.invoice.number", value: "Factura #" },
    { key: "pdf.invoice.date", value: "Fecha" },
    { key: "pdf.invoice.dueDate", value: "Fecha de Vencimiento" },
    { key: "pdf.invoice.from", value: "De" },
    { key: "pdf.invoice.billTo", value: "Facturar a" },
    { key: "pdf.invoice.attention", value: "Atención:" },
    { key: "pdf.invoice.vat", value: "NIF/CIF" },
    { key: "pdf.invoice.itemDescription", value: "Descripción" },
    { key: "pdf.invoice.quantity", value: "Cant." },
    { key: "pdf.invoice.unitPrice", value: "Precio Unitario" },
    { key: "pdf.invoice.net", value: "Neto" },
    { key: "pdf.invoice.gross", value: "Bruto" },
    { key: "pdf.invoice.total", value: "Total" },
    { key: "pdf.invoice.subtotal", value: "Subtotal" },
    { key: "pdf.invoice.tax", value: "IVA" },
    { key: "pdf.invoice.paymentTerms", value: "Condiciones de Pago" },
    { key: "pdf.invoice.terms", value: "Condiciones:" },
    { key: "pdf.invoice.method", value: "Método:" },
    { key: "pdf.invoice.paymentDue", value: "Pago vence el" },
    { key: "pdf.invoice.latePayment", value: "Pueden aplicarse recargos por pago tardío." },
    { key: "pdf.invoice.forQuestions", value: "Para consultas, contacte" },
    { key: "pdf.invoice.contactUs", value: "o llame al" },
    { key: "pdf.invoice.thankYou", value: "¡Gracias por su compra!" },
    // Payment status translations
    { key: "pdf.invoice.paid", value: "Pagado" },
    { key: "pdf.invoice.paidOn", value: "Pagado el" },
    { key: "pdf.invoice.paymentReceived", value: "Pago Recibido" },
    { key: "pdf.invoice.status", value: "Estado" },
    // Payment terms translations
    { key: "pdf.invoice.paymentTerms.due_on_receipt", value: "Pago al recibo" },
    { key: "pdf.invoice.paymentTerms.dueonreceipt", value: "Pago al recibo" },
    { key: "pdf.invoice.paymentTerms.net7", value: "Neto 7 – Pago en 7 días" },
    { key: "pdf.invoice.paymentTerms.net15", value: "Neto 15 – Pago en 15 días" },
    { key: "pdf.invoice.paymentTerms.net30", value: "Neto 30 – Pago en 30 días" },
    { key: "pdf.invoice.paymentTerms.net60", value: "Neto 60 – Pago en 60 días" },
    { key: "pdf.invoice.paymentTerms.net90", value: "Neto 90 – Pago en 90 días" },
  ];

  for (const t of spanishInvoiceTranslations) {
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
  // FRENCH TRANSLATIONS (Invoice)
  // ============================================================================

  const frenchInvoiceTranslations = [
    { key: "pdf.invoice.title", value: "Facture" },
    { key: "pdf.invoice.number", value: "Facture n°" },
    { key: "pdf.invoice.date", value: "Date" },
    { key: "pdf.invoice.dueDate", value: "Date d'échéance" },
    { key: "pdf.invoice.from", value: "De" },
    { key: "pdf.invoice.billTo", value: "Facturer à" },
    { key: "pdf.invoice.attention", value: "À l'attention de :" },
    { key: "pdf.invoice.vat", value: "N° TVA" },
    { key: "pdf.invoice.itemDescription", value: "Description" },
    { key: "pdf.invoice.quantity", value: "Qté" },
    { key: "pdf.invoice.unitPrice", value: "Prix Unitaire" },
    { key: "pdf.invoice.net", value: "HT" },
    { key: "pdf.invoice.gross", value: "TTC" },
    { key: "pdf.invoice.total", value: "Total" },
    { key: "pdf.invoice.subtotal", value: "Sous-total" },
    { key: "pdf.invoice.tax", value: "TVA" },
    { key: "pdf.invoice.paymentTerms", value: "Conditions de Paiement" },
    { key: "pdf.invoice.terms", value: "Conditions :" },
    { key: "pdf.invoice.method", value: "Méthode :" },
    { key: "pdf.invoice.paymentDue", value: "Paiement dû le" },
    { key: "pdf.invoice.latePayment", value: "Des frais de retard peuvent s'appliquer." },
    { key: "pdf.invoice.forQuestions", value: "Pour toute question, contactez" },
    { key: "pdf.invoice.contactUs", value: "ou appelez le" },
    { key: "pdf.invoice.thankYou", value: "Merci pour votre confiance !" },
    // Payment status translations
    { key: "pdf.invoice.paid", value: "Payé" },
    { key: "pdf.invoice.paidOn", value: "Payé le" },
    { key: "pdf.invoice.paymentReceived", value: "Paiement Reçu" },
    { key: "pdf.invoice.status", value: "Statut" },
    // Payment terms translations
    { key: "pdf.invoice.paymentTerms.due_on_receipt", value: "Payable à réception" },
    { key: "pdf.invoice.paymentTerms.dueonreceipt", value: "Payable à réception" },
    { key: "pdf.invoice.paymentTerms.net7", value: "Net 7 – Paiement sous 7 jours" },
    { key: "pdf.invoice.paymentTerms.net15", value: "Net 15 – Paiement sous 15 jours" },
    { key: "pdf.invoice.paymentTerms.net30", value: "Net 30 – Paiement sous 30 jours" },
    { key: "pdf.invoice.paymentTerms.net60", value: "Net 60 – Paiement sous 60 jours" },
    { key: "pdf.invoice.paymentTerms.net90", value: "Net 90 – Paiement sous 90 jours" },
  ];

  for (const t of frenchInvoiceTranslations) {
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

  // ============================================================================
  // POLISH TRANSLATIONS (Invoice)
  // ============================================================================

  const polishInvoiceTranslations = [
    { key: "pdf.invoice.title", value: "Faktura" },
    { key: "pdf.invoice.number", value: "Faktura nr" },
    { key: "pdf.invoice.date", value: "Data" },
    { key: "pdf.invoice.dueDate", value: "Termin płatności" },
    { key: "pdf.invoice.from", value: "Od" },
    { key: "pdf.invoice.billTo", value: "Nabywca" },
    { key: "pdf.invoice.attention", value: "Do wiadomości:" },
    { key: "pdf.invoice.vat", value: "NIP" },
    { key: "pdf.invoice.itemDescription", value: "Opis" },
    { key: "pdf.invoice.quantity", value: "Ilość" },
    { key: "pdf.invoice.unitPrice", value: "Cena jedn." },
    { key: "pdf.invoice.net", value: "Netto" },
    { key: "pdf.invoice.gross", value: "Brutto" },
    { key: "pdf.invoice.total", value: "Razem" },
    { key: "pdf.invoice.subtotal", value: "Suma częściowa" },
    { key: "pdf.invoice.tax", value: "VAT" },
    { key: "pdf.invoice.paymentTerms", value: "Warunki Płatności" },
    { key: "pdf.invoice.terms", value: "Warunki:" },
    { key: "pdf.invoice.method", value: "Metoda:" },
    { key: "pdf.invoice.paymentDue", value: "Płatność do" },
    { key: "pdf.invoice.latePayment", value: "Mogą być naliczane odsetki za opóźnienie." },
    { key: "pdf.invoice.forQuestions", value: "W razie pytań prosimy o kontakt" },
    { key: "pdf.invoice.contactUs", value: "lub zadzwoń" },
    { key: "pdf.invoice.thankYou", value: "Dziękujemy za zakupy!" },
    // Payment status translations
    { key: "pdf.invoice.paid", value: "Opłacone" },
    { key: "pdf.invoice.paidOn", value: "Opłacone dnia" },
    { key: "pdf.invoice.paymentReceived", value: "Płatność Otrzymana" },
    { key: "pdf.invoice.status", value: "Status" },
    // Payment terms translations
    { key: "pdf.invoice.paymentTerms.due_on_receipt", value: "Płatne przy odbiorze" },
    { key: "pdf.invoice.paymentTerms.dueonreceipt", value: "Płatne przy odbiorze" },
    { key: "pdf.invoice.paymentTerms.net7", value: "Netto 7 – Płatność w ciągu 7 dni" },
    { key: "pdf.invoice.paymentTerms.net15", value: "Netto 15 – Płatność w ciągu 15 dni" },
    { key: "pdf.invoice.paymentTerms.net30", value: "Netto 30 – Płatność w ciągu 30 dni" },
    { key: "pdf.invoice.paymentTerms.net60", value: "Netto 60 – Płatność w ciągu 60 dni" },
    { key: "pdf.invoice.paymentTerms.net90", value: "Netto 90 – Płatność w ciągu 90 dni" },
  ];

  for (const t of polishInvoiceTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "pl",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  // ============================================================================
  // JAPANESE TRANSLATIONS (Invoice)
  // ============================================================================

  const japaneseInvoiceTranslations = [
    { key: "pdf.invoice.title", value: "請求書" },
    { key: "pdf.invoice.number", value: "請求書番号" },
    { key: "pdf.invoice.date", value: "発行日" },
    { key: "pdf.invoice.dueDate", value: "支払期限" },
    { key: "pdf.invoice.from", value: "発行者" },
    { key: "pdf.invoice.billTo", value: "請求先" },
    { key: "pdf.invoice.attention", value: "担当者:" },
    { key: "pdf.invoice.vat", value: "登録番号" },
    { key: "pdf.invoice.itemDescription", value: "品目" },
    { key: "pdf.invoice.quantity", value: "数量" },
    { key: "pdf.invoice.unitPrice", value: "単価" },
    { key: "pdf.invoice.net", value: "税抜" },
    { key: "pdf.invoice.gross", value: "税込" },
    { key: "pdf.invoice.total", value: "合計" },
    { key: "pdf.invoice.subtotal", value: "小計" },
    { key: "pdf.invoice.tax", value: "消費税" },
    { key: "pdf.invoice.paymentTerms", value: "支払条件" },
    { key: "pdf.invoice.terms", value: "条件:" },
    { key: "pdf.invoice.method", value: "方法:" },
    { key: "pdf.invoice.paymentDue", value: "お支払い期限" },
    { key: "pdf.invoice.latePayment", value: "遅延の場合、延滞料金が発生する場合があります。" },
    { key: "pdf.invoice.forQuestions", value: "ご不明な点は、こちらまでお問い合わせください" },
    { key: "pdf.invoice.contactUs", value: "または電話" },
    { key: "pdf.invoice.thankYou", value: "ご利用ありがとうございます！" },
    // Payment status translations
    { key: "pdf.invoice.paid", value: "支払済み" },
    { key: "pdf.invoice.paidOn", value: "支払日" },
    { key: "pdf.invoice.paymentReceived", value: "お支払い受領" },
    { key: "pdf.invoice.status", value: "ステータス" },
    // Payment terms translations
    { key: "pdf.invoice.paymentTerms.due_on_receipt", value: "受領時払い" },
    { key: "pdf.invoice.paymentTerms.dueonreceipt", value: "受領時払い" },
    { key: "pdf.invoice.paymentTerms.net7", value: "7日以内のお支払い" },
    { key: "pdf.invoice.paymentTerms.net15", value: "15日以内のお支払い" },
    { key: "pdf.invoice.paymentTerms.net30", value: "30日以内のお支払い" },
    { key: "pdf.invoice.paymentTerms.net60", value: "60日以内のお支払い" },
    { key: "pdf.invoice.paymentTerms.net90", value: "90日以内のお支払い" },
  ];

  for (const t of japaneseInvoiceTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "ja",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  // ============================================================================
  // ENGLISH TRANSLATIONS (Ticket)
  // ============================================================================

  const englishTicketTranslations = [
    // Field labels
    { key: "pdf.ticket.attendee", value: "Attendee" },
    { key: "pdf.ticket.ticketHolder", value: "Ticket Holder" },
    { key: "pdf.ticket.date", value: "Date" },
    { key: "pdf.ticket.dateTime", value: "Date & Time" },
    { key: "pdf.ticket.time", value: "Time" },
    { key: "pdf.ticket.location", value: "Location" },
    { key: "pdf.ticket.venue", value: "Venue" },
    { key: "pdf.ticket.event", value: "Event" },
    { key: "pdf.ticket.guests", value: "Guests" },
    { key: "pdf.ticket.guest", value: "Guest" },
    { key: "pdf.ticket.ticketNumber", value: "Ticket Number" },
    { key: "pdf.ticket.ticketId", value: "Ticket ID" },
    { key: "pdf.ticket.ticketInfo", value: "Ticket Information" },
    { key: "pdf.ticket.ticketType", value: "Type" },
    { key: "pdf.ticket.ticketHash", value: "Ticket #" },

    // Order summary
    { key: "pdf.ticket.orderSummary", value: "Order Summary" },
    { key: "pdf.ticket.orderNumber", value: "Order #" },
    { key: "pdf.ticket.purchased", value: "Purchased" },
    { key: "pdf.ticket.subtotal", value: "Subtotal" },
    { key: "pdf.ticket.tax", value: "Tax" },
    { key: "pdf.ticket.total", value: "Total" },

    // QR and verification
    { key: "pdf.ticket.scanToVerify", value: "Scan to verify" },
    { key: "pdf.ticket.scanAtEntrance", value: "Scan at entrance for check-in" },
    { key: "pdf.ticket.presentTicket", value: "Please present this ticket (digital or printed) at the event entrance." },
    { key: "pdf.ticket.presentAtDoor", value: "Please show at the door" },

    // Sections
    { key: "pdf.ticket.eventPolicies", value: "Event Policies" },
    { key: "pdf.ticket.contactInfo", value: "Contact Information" },
    { key: "pdf.ticket.reservedFor", value: "Reserved for" },
    { key: "pdf.ticket.presentedBy", value: "Presented by" },

    // Policy items
    { key: "pdf.ticket.arrival", value: "Arrival" },
    { key: "pdf.ticket.arrivalPolicy", value: "Please arrive 30 minutes before the event start time for registration and check-in." },
    { key: "pdf.ticket.identification", value: "Identification" },
    { key: "pdf.ticket.identificationPolicy", value: "Valid photo ID may be required for entrance." },
    { key: "pdf.ticket.transfers", value: "Transfers" },
    { key: "pdf.ticket.transfersPolicy", value: "Tickets are non-transferable unless authorized by the event organizer." },
    { key: "pdf.ticket.refunds", value: "Refunds" },
    { key: "pdf.ticket.refundsPolicy", value: "Refund policy varies by event. Contact the organizer for details." },
    { key: "pdf.ticket.accessibility", value: "Accessibility" },
    { key: "pdf.ticket.accessibilityPolicy", value: "For accessibility accommodations, please contact us at least 48 hours before the event." },
    { key: "pdf.ticket.photography", value: "Photography" },
    { key: "pdf.ticket.photographyPolicy", value: "By attending, you consent to being photographed or recorded for promotional purposes." },

    // Footer and closing
    { key: "pdf.ticket.forQuestions", value: "For questions or support regarding this event ticket, please contact" },
    { key: "pdf.ticket.lookForward", value: "We look forward to seeing you at the event!" },
    { key: "pdf.ticket.privateEvent", value: "Private · Open · Real" },
    { key: "pdf.ticket.curatedEvent", value: "This is a curated event. Entry is only possible with a valid ticket." },
  ];

  for (const t of englishTicketTranslations) {
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
  // GERMAN TRANSLATIONS (Ticket)
  // ============================================================================

  const germanTicketTranslations = [
    // Field labels
    { key: "pdf.ticket.attendee", value: "Teilnehmer" },
    { key: "pdf.ticket.ticketHolder", value: "Ticketinhaber" },
    { key: "pdf.ticket.date", value: "Datum" },
    { key: "pdf.ticket.dateTime", value: "Datum & Uhrzeit" },
    { key: "pdf.ticket.time", value: "Zeit" },
    { key: "pdf.ticket.location", value: "Ort" },
    { key: "pdf.ticket.venue", value: "Veranstaltungsort" },
    { key: "pdf.ticket.event", value: "Veranstaltung" },
    { key: "pdf.ticket.guests", value: "Gäste" },
    { key: "pdf.ticket.guest", value: "Gast" },
    { key: "pdf.ticket.ticketNumber", value: "Ticketnummer" },
    { key: "pdf.ticket.ticketId", value: "Ticket-ID" },
    { key: "pdf.ticket.ticketInfo", value: "Ticketinformationen" },
    { key: "pdf.ticket.ticketType", value: "Typ" },
    { key: "pdf.ticket.ticketHash", value: "Ticket-Nr." },

    // Order summary
    { key: "pdf.ticket.orderSummary", value: "Bestellübersicht" },
    { key: "pdf.ticket.orderNumber", value: "Bestellung-Nr." },
    { key: "pdf.ticket.purchased", value: "Gekauft" },
    { key: "pdf.ticket.subtotal", value: "Zwischensumme" },
    { key: "pdf.ticket.tax", value: "Steuer" },
    { key: "pdf.ticket.total", value: "Gesamt" },

    // QR and verification
    { key: "pdf.ticket.scanToVerify", value: "Scannen zum Verifizieren" },
    { key: "pdf.ticket.scanAtEntrance", value: "Am Eingang zum Einchecken scannen" },
    { key: "pdf.ticket.presentTicket", value: "Bitte zeigen Sie dieses Ticket (digital oder gedruckt) am Veranstaltungseingang vor." },
    { key: "pdf.ticket.presentAtDoor", value: "Bitte an der Tür vorzeigen" },

    // Sections
    { key: "pdf.ticket.eventPolicies", value: "Veranstaltungsrichtlinien" },
    { key: "pdf.ticket.contactInfo", value: "Kontaktinformationen" },
    { key: "pdf.ticket.reservedFor", value: "Reserviert für" },
    { key: "pdf.ticket.presentedBy", value: "Präsentiert von" },

    // Policy items
    { key: "pdf.ticket.arrival", value: "Ankunft" },
    { key: "pdf.ticket.arrivalPolicy", value: "Bitte kommen Sie 30 Minuten vor Veranstaltungsbeginn zur Registrierung und zum Check-in." },
    { key: "pdf.ticket.identification", value: "Identifikation" },
    { key: "pdf.ticket.identificationPolicy", value: "Ein gültiger Lichtbildausweis kann für den Einlass erforderlich sein." },
    { key: "pdf.ticket.transfers", value: "Übertragungen" },
    { key: "pdf.ticket.transfersPolicy", value: "Tickets sind nicht übertragbar, es sei denn, dies wird vom Veranstalter genehmigt." },
    { key: "pdf.ticket.refunds", value: "Rückerstattungen" },
    { key: "pdf.ticket.refundsPolicy", value: "Die Rückerstattungsrichtlinie variiert je nach Veranstaltung. Kontaktieren Sie den Veranstalter für Details." },
    { key: "pdf.ticket.accessibility", value: "Barrierefreiheit" },
    { key: "pdf.ticket.accessibilityPolicy", value: "Für barrierefreie Anpassungen kontaktieren Sie uns bitte mindestens 48 Stunden vor der Veranstaltung." },
    { key: "pdf.ticket.photography", value: "Fotografie" },
    { key: "pdf.ticket.photographyPolicy", value: "Durch Ihre Teilnahme stimmen Sie zu, für Werbezwecke fotografiert oder aufgenommen zu werden." },

    // Footer and closing
    { key: "pdf.ticket.forQuestions", value: "Bei Fragen oder Unterstützung zu diesem Ticket kontaktieren Sie bitte" },
    { key: "pdf.ticket.lookForward", value: "Wir freuen uns darauf, Sie bei der Veranstaltung zu sehen!" },
    { key: "pdf.ticket.privateEvent", value: "Privat · Offen · Echt" },
    { key: "pdf.ticket.curatedEvent", value: "Dies ist eine kuratierte Veranstaltung. Der Zutritt ist nur mit gültigem Ticket möglich." },
  ];

  for (const t of germanTicketTranslations) {
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
  // SPANISH TRANSLATIONS (Ticket)
  // ============================================================================

  const spanishTicketTranslations = [
    // Field labels
    { key: "pdf.ticket.attendee", value: "Asistente" },
    { key: "pdf.ticket.ticketHolder", value: "Titular del Ticket" },
    { key: "pdf.ticket.date", value: "Fecha" },
    { key: "pdf.ticket.dateTime", value: "Fecha y Hora" },
    { key: "pdf.ticket.time", value: "Hora" },
    { key: "pdf.ticket.location", value: "Ubicación" },
    { key: "pdf.ticket.venue", value: "Lugar" },
    { key: "pdf.ticket.event", value: "Evento" },
    { key: "pdf.ticket.guests", value: "Invitados" },
    { key: "pdf.ticket.guest", value: "Invitado" },
    { key: "pdf.ticket.ticketNumber", value: "Número de Ticket" },
    { key: "pdf.ticket.ticketId", value: "ID de Ticket" },
    { key: "pdf.ticket.ticketInfo", value: "Información del Ticket" },
    { key: "pdf.ticket.ticketType", value: "Tipo" },
    { key: "pdf.ticket.ticketHash", value: "Ticket #" },

    // Order summary
    { key: "pdf.ticket.orderSummary", value: "Resumen del Pedido" },
    { key: "pdf.ticket.orderNumber", value: "Pedido #" },
    { key: "pdf.ticket.purchased", value: "Comprado" },
    { key: "pdf.ticket.subtotal", value: "Subtotal" },
    { key: "pdf.ticket.tax", value: "Impuesto" },
    { key: "pdf.ticket.total", value: "Total" },

    // QR and verification
    { key: "pdf.ticket.scanToVerify", value: "Escanear para verificar" },
    { key: "pdf.ticket.scanAtEntrance", value: "Escanear en la entrada para registrarse" },
    { key: "pdf.ticket.presentTicket", value: "Por favor presente este ticket (digital o impreso) en la entrada del evento." },
    { key: "pdf.ticket.presentAtDoor", value: "Por favor muestre en la puerta" },

    // Sections
    { key: "pdf.ticket.eventPolicies", value: "Políticas del Evento" },
    { key: "pdf.ticket.contactInfo", value: "Información de Contacto" },
    { key: "pdf.ticket.reservedFor", value: "Reservado para" },
    { key: "pdf.ticket.presentedBy", value: "Presentado por" },

    // Policy items
    { key: "pdf.ticket.arrival", value: "Llegada" },
    { key: "pdf.ticket.arrivalPolicy", value: "Por favor llegue 30 minutos antes del inicio del evento para el registro y check-in." },
    { key: "pdf.ticket.identification", value: "Identificación" },
    { key: "pdf.ticket.identificationPolicy", value: "Puede requerirse una identificación con foto válida para la entrada." },
    { key: "pdf.ticket.transfers", value: "Transferencias" },
    { key: "pdf.ticket.transfersPolicy", value: "Los tickets no son transferibles a menos que sea autorizado por el organizador del evento." },
    { key: "pdf.ticket.refunds", value: "Reembolsos" },
    { key: "pdf.ticket.refundsPolicy", value: "La política de reembolso varía según el evento. Contacte al organizador para más detalles." },
    { key: "pdf.ticket.accessibility", value: "Accesibilidad" },
    { key: "pdf.ticket.accessibilityPolicy", value: "Para adaptaciones de accesibilidad, por favor contáctenos al menos 48 horas antes del evento." },
    { key: "pdf.ticket.photography", value: "Fotografía" },
    { key: "pdf.ticket.photographyPolicy", value: "Al asistir, usted consiente ser fotografiado o grabado con fines promocionales." },

    // Footer and closing
    { key: "pdf.ticket.forQuestions", value: "Para preguntas o soporte sobre este ticket, por favor contacte" },
    { key: "pdf.ticket.lookForward", value: "¡Esperamos verle en el evento!" },
    { key: "pdf.ticket.privateEvent", value: "Privado · Abierto · Real" },
    { key: "pdf.ticket.curatedEvent", value: "Este es un evento curado. La entrada solo es posible con un ticket válido." },
  ];

  for (const t of spanishTicketTranslations) {
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
  // FRENCH TRANSLATIONS (Ticket)
  // ============================================================================

  const frenchTicketTranslations = [
    // Field labels
    { key: "pdf.ticket.attendee", value: "Participant" },
    { key: "pdf.ticket.ticketHolder", value: "Titulaire du Billet" },
    { key: "pdf.ticket.date", value: "Date" },
    { key: "pdf.ticket.dateTime", value: "Date et Heure" },
    { key: "pdf.ticket.time", value: "Heure" },
    { key: "pdf.ticket.location", value: "Lieu" },
    { key: "pdf.ticket.venue", value: "Salle" },
    { key: "pdf.ticket.event", value: "Événement" },
    { key: "pdf.ticket.guests", value: "Invités" },
    { key: "pdf.ticket.guest", value: "Invité" },
    { key: "pdf.ticket.ticketNumber", value: "Numéro de Billet" },
    { key: "pdf.ticket.ticketId", value: "ID de Billet" },
    { key: "pdf.ticket.ticketInfo", value: "Informations du Billet" },
    { key: "pdf.ticket.ticketType", value: "Type" },
    { key: "pdf.ticket.ticketHash", value: "Billet #" },

    // Order summary
    { key: "pdf.ticket.orderSummary", value: "Résumé de la Commande" },
    { key: "pdf.ticket.orderNumber", value: "Commande #" },
    { key: "pdf.ticket.purchased", value: "Acheté" },
    { key: "pdf.ticket.subtotal", value: "Sous-total" },
    { key: "pdf.ticket.tax", value: "Taxe" },
    { key: "pdf.ticket.total", value: "Total" },

    // QR and verification
    { key: "pdf.ticket.scanToVerify", value: "Scanner pour vérifier" },
    { key: "pdf.ticket.scanAtEntrance", value: "Scanner à l'entrée pour l'enregistrement" },
    { key: "pdf.ticket.presentTicket", value: "Veuillez présenter ce billet (numérique ou imprimé) à l'entrée de l'événement." },
    { key: "pdf.ticket.presentAtDoor", value: "Veuillez montrer à la porte" },

    // Sections
    { key: "pdf.ticket.eventPolicies", value: "Politiques de l'Événement" },
    { key: "pdf.ticket.contactInfo", value: "Informations de Contact" },
    { key: "pdf.ticket.reservedFor", value: "Réservé pour" },
    { key: "pdf.ticket.presentedBy", value: "Présenté par" },

    // Policy items
    { key: "pdf.ticket.arrival", value: "Arrivée" },
    { key: "pdf.ticket.arrivalPolicy", value: "Veuillez arriver 30 minutes avant le début de l'événement pour l'inscription et l'enregistrement." },
    { key: "pdf.ticket.identification", value: "Identification" },
    { key: "pdf.ticket.identificationPolicy", value: "Une pièce d'identité avec photo valide peut être requise pour l'entrée." },
    { key: "pdf.ticket.transfers", value: "Transferts" },
    { key: "pdf.ticket.transfersPolicy", value: "Les billets ne sont pas transférables sauf autorisation de l'organisateur de l'événement." },
    { key: "pdf.ticket.refunds", value: "Remboursements" },
    { key: "pdf.ticket.refundsPolicy", value: "La politique de remboursement varie selon l'événement. Contactez l'organisateur pour plus de détails." },
    { key: "pdf.ticket.accessibility", value: "Accessibilité" },
    { key: "pdf.ticket.accessibilityPolicy", value: "Pour les aménagements d'accessibilité, veuillez nous contacter au moins 48 heures avant l'événement." },
    { key: "pdf.ticket.photography", value: "Photographie" },
    { key: "pdf.ticket.photographyPolicy", value: "En assistant, vous consentez à être photographié ou enregistré à des fins promotionnelles." },

    // Footer and closing
    { key: "pdf.ticket.forQuestions", value: "Pour des questions ou un soutien concernant ce billet, veuillez contacter" },
    { key: "pdf.ticket.lookForward", value: "Nous avons hâte de vous voir à l'événement!" },
    { key: "pdf.ticket.privateEvent", value: "Privé · Ouvert · Authentique" },
    { key: "pdf.ticket.curatedEvent", value: "Il s'agit d'un événement organisé. L'entrée n'est possible qu'avec un billet valide." },
  ];

  for (const t of frenchTicketTranslations) {
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

  // ============================================================================
  // POLISH TRANSLATIONS (Ticket)
  // ============================================================================

  const polishTicketTranslations = [
    // Field labels
    { key: "pdf.ticket.attendee", value: "Uczestnik" },
    { key: "pdf.ticket.ticketHolder", value: "Posiadacz Biletu" },
    { key: "pdf.ticket.date", value: "Data" },
    { key: "pdf.ticket.dateTime", value: "Data i Godzina" },
    { key: "pdf.ticket.time", value: "Godzina" },
    { key: "pdf.ticket.location", value: "Lokalizacja" },
    { key: "pdf.ticket.venue", value: "Miejsce" },
    { key: "pdf.ticket.event", value: "Wydarzenie" },
    { key: "pdf.ticket.guests", value: "Goście" },
    { key: "pdf.ticket.guest", value: "Gość" },
    { key: "pdf.ticket.ticketNumber", value: "Numer Biletu" },
    { key: "pdf.ticket.ticketId", value: "ID Biletu" },
    { key: "pdf.ticket.ticketInfo", value: "Informacje o Bilecie" },
    { key: "pdf.ticket.ticketType", value: "Typ" },
    { key: "pdf.ticket.ticketHash", value: "Bilet #" },

    // Order summary
    { key: "pdf.ticket.orderSummary", value: "Podsumowanie Zamówienia" },
    { key: "pdf.ticket.orderNumber", value: "Zamówienie #" },
    { key: "pdf.ticket.purchased", value: "Zakupiono" },
    { key: "pdf.ticket.subtotal", value: "Suma częściowa" },
    { key: "pdf.ticket.tax", value: "Podatek" },
    { key: "pdf.ticket.total", value: "Suma" },

    // QR and verification
    { key: "pdf.ticket.scanToVerify", value: "Skanuj aby zweryfikować" },
    { key: "pdf.ticket.scanAtEntrance", value: "Skanuj przy wejściu, aby się zameldować" },
    { key: "pdf.ticket.presentTicket", value: "Proszę okazać ten bilet (cyfrowy lub wydrukowany) przy wejściu na wydarzenie." },
    { key: "pdf.ticket.presentAtDoor", value: "Proszę pokazać przy drzwiach" },

    // Sections
    { key: "pdf.ticket.eventPolicies", value: "Zasady Wydarzenia" },
    { key: "pdf.ticket.contactInfo", value: "Informacje Kontaktowe" },
    { key: "pdf.ticket.reservedFor", value: "Zarezerwowane dla" },
    { key: "pdf.ticket.presentedBy", value: "Prezentowane przez" },

    // Policy items
    { key: "pdf.ticket.arrival", value: "Przybycie" },
    { key: "pdf.ticket.arrivalPolicy", value: "Prosimy przybyć 30 minut przed rozpoczęciem wydarzenia na rejestrację i zameldowanie." },
    { key: "pdf.ticket.identification", value: "Identyfikacja" },
    { key: "pdf.ticket.identificationPolicy", value: "Ważny dowód tożsamości ze zdjęciem może być wymagany przy wejściu." },
    { key: "pdf.ticket.transfers", value: "Przekazywanie" },
    { key: "pdf.ticket.transfersPolicy", value: "Bilety są nieprzenośne, chyba że organizator wydarzenia wyrazi zgodę." },
    { key: "pdf.ticket.refunds", value: "Zwroty" },
    { key: "pdf.ticket.refundsPolicy", value: "Zasady zwrotu różnią się w zależności od wydarzenia. Skontaktuj się z organizatorem w celu uzyskania szczegółów." },
    { key: "pdf.ticket.accessibility", value: "Dostępność" },
    { key: "pdf.ticket.accessibilityPolicy", value: "W celu zapewnienia dostosowań dla osób niepełnosprawnych prosimy o kontakt co najmniej 48 godzin przed wydarzeniem." },
    { key: "pdf.ticket.photography", value: "Fotografia" },
    { key: "pdf.ticket.photographyPolicy", value: "Uczestnicząc, wyrażasz zgodę na fotografowanie lub nagrywanie w celach promocyjnych." },

    // Footer and closing
    { key: "pdf.ticket.forQuestions", value: "W razie pytań lub wsparcia dotyczącego tego biletu prosimy o kontakt" },
    { key: "pdf.ticket.lookForward", value: "Nie możemy się doczekać spotkania na wydarzeniu!" },
    { key: "pdf.ticket.privateEvent", value: "Prywatne · Otwarte · Prawdziwe" },
    { key: "pdf.ticket.curatedEvent", value: "To jest wydarzenie kuratorskie. Wejście jest możliwe tylko z ważnym biletem." },
  ];

  for (const t of polishTicketTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "pl",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  // ============================================================================
  // JAPANESE TRANSLATIONS (Ticket)
  // ============================================================================

  const japaneseTicketTranslations = [
    // Field labels
    { key: "pdf.ticket.attendee", value: "参加者" },
    { key: "pdf.ticket.ticketHolder", value: "チケット所有者" },
    { key: "pdf.ticket.date", value: "日付" },
    { key: "pdf.ticket.dateTime", value: "日時" },
    { key: "pdf.ticket.time", value: "時間" },
    { key: "pdf.ticket.location", value: "場所" },
    { key: "pdf.ticket.venue", value: "会場" },
    { key: "pdf.ticket.event", value: "イベント" },
    { key: "pdf.ticket.guests", value: "ゲスト" },
    { key: "pdf.ticket.guest", value: "ゲスト" },
    { key: "pdf.ticket.ticketNumber", value: "チケット番号" },
    { key: "pdf.ticket.ticketId", value: "チケットID" },
    { key: "pdf.ticket.ticketInfo", value: "チケット情報" },
    { key: "pdf.ticket.ticketType", value: "種類" },
    { key: "pdf.ticket.ticketHash", value: "チケット #" },

    // Order summary
    { key: "pdf.ticket.orderSummary", value: "注文概要" },
    { key: "pdf.ticket.orderNumber", value: "注文番号" },
    { key: "pdf.ticket.purchased", value: "購入日" },
    { key: "pdf.ticket.subtotal", value: "小計" },
    { key: "pdf.ticket.tax", value: "税金" },
    { key: "pdf.ticket.total", value: "合計" },

    // QR and verification
    { key: "pdf.ticket.scanToVerify", value: "確認のためにスキャン" },
    { key: "pdf.ticket.scanAtEntrance", value: "入場時にチェックインのためにスキャン" },
    { key: "pdf.ticket.presentTicket", value: "このチケット（デジタルまたは印刷）をイベント入場時に提示してください。" },
    { key: "pdf.ticket.presentAtDoor", value: "ドアでご提示ください" },

    // Sections
    { key: "pdf.ticket.eventPolicies", value: "イベントポリシー" },
    { key: "pdf.ticket.contactInfo", value: "連絡先情報" },
    { key: "pdf.ticket.reservedFor", value: "予約済み" },
    { key: "pdf.ticket.presentedBy", value: "主催" },

    // Policy items
    { key: "pdf.ticket.arrival", value: "到着" },
    { key: "pdf.ticket.arrivalPolicy", value: "受付とチェックインのため、イベント開始の30分前にお越しください。" },
    { key: "pdf.ticket.identification", value: "本人確認" },
    { key: "pdf.ticket.identificationPolicy", value: "入場時に有効な写真付き身分証明書が必要な場合があります。" },
    { key: "pdf.ticket.transfers", value: "譲渡" },
    { key: "pdf.ticket.transfersPolicy", value: "イベント主催者の許可がない限り、チケットは譲渡できません。" },
    { key: "pdf.ticket.refunds", value: "払い戻し" },
    { key: "pdf.ticket.refundsPolicy", value: "払い戻しポリシーはイベントによって異なります。詳細については主催者にお問い合わせください。" },
    { key: "pdf.ticket.accessibility", value: "アクセシビリティ" },
    { key: "pdf.ticket.accessibilityPolicy", value: "アクセシビリティの配慮については、イベントの48時間前までにご連絡ください。" },
    { key: "pdf.ticket.photography", value: "写真撮影" },
    { key: "pdf.ticket.photographyPolicy", value: "参加することにより、宣伝目的で撮影または録画されることに同意したものとみなされます。" },

    // Footer and closing
    { key: "pdf.ticket.forQuestions", value: "このチケットに関するご質問やサポートについては、こちらまでお問い合わせください" },
    { key: "pdf.ticket.lookForward", value: "イベントでお会いできることを楽しみにしています！" },
    { key: "pdf.ticket.privateEvent", value: "プライベート · オープン · 本物" },
    { key: "pdf.ticket.curatedEvent", value: "これは厳選されたイベントです。有効なチケットでのみ入場可能です。" },
  ];

  for (const t of japaneseTicketTranslations) {
    const result = await upsertTranslation(
      db,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "ja",
      category
    );
    if (result.inserted) insertedCount++;
    if (result.updated) updatedCount++;
  }

  console.log(`✅ PDF template translations seeded: ${insertedCount} new, ${updatedCount} updated`);
  return { success: true, inserted: insertedCount, updated: updatedCount };
});
