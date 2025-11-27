/**
 * B2B INVOICE EMAIL SCHEMA
 *
 * Example of how the B2B invoice template looks as a schema.
 * This can be:
 * - Stored in the database
 * - Edited through UI
 * - Modified by AI agents
 * - Rendered dynamically
 */

import type { EmailTemplateSchema } from "../email-template-schema";
import type { EmailSection } from "../generic-types";

export const invoiceB2BSchema: EmailTemplateSchema = {
  // Metadata
  code: "email_invoice_b2b",
  name: "B2B Invoice",
  description: "Professional invoice for business-to-business transactions with company details and tax information",
  category: "transactional",
  version: "1.0.0",

  // Visual settings
  defaultBrandColor: "#6B46C1",
  supportedLanguages: ["en", "de", "es", "fr"],

  // Template structure
  defaultSections: [
    // Hero section
    {
      type: "hero",
      title: "Invoice {invoiceNumber}",
      subtitle: "Professional services for {buyerCompanyName}",
    },

    // Body section with greeting
    {
      type: "body",
      paragraphs: [
        "Dear {recipientFirstName},",
        "Please find attached your invoice for services rendered. Payment is due according to the terms outlined below.",
        "If you have any questions regarding this invoice, please don't hesitate to contact our accounts department.",
      ],
    },

    // Invoice details section
    {
      type: "invoiceDetails",
      invoiceNumber: "{invoiceNumber}",
      invoiceDate: "{invoiceDate}",
      dueDate: "{dueDate}",
      status: "sent",
      lineItems: "{lineItems}", // JSON array
      subtotal: "{subtotal}",
      taxTotal: "{taxTotal}",
      total: "{total}",
      amountDue: "{amountDue}",
      paymentTerms: "{paymentTerms}",
      purchaseOrderNumber: "{purchaseOrderNumber}",
      sellerCompany: "{sellerCompany}", // JSON object
      buyerCompany: "{buyerCompany}", // JSON object
      notes: "{notes}",
    },

    // CTA for viewing online
    {
      type: "cta",
      text: "View Invoice Online",
      url: "{viewInvoiceUrl}",
      style: "secondary",
    },

    // CTA for payment
    {
      type: "cta",
      text: "Pay Invoice Now",
      url: "{payNowUrl}",
      style: "primary",
    },
  ] as EmailSection[],

  // Variable definitions
  variables: [
    // Invoice data
    {
      name: "invoiceNumber",
      type: "string",
      description: "Invoice number (e.g., INV-2024-001)",
      required: true,
      aiInstructions: "Generate a unique invoice number in format INV-YYYY-NNN",
    },
    {
      name: "invoiceDate",
      type: "date",
      description: "Invoice issue date",
      required: true,
    },
    {
      name: "dueDate",
      type: "date",
      description: "Payment due date",
      required: true,
    },
    {
      name: "paymentTerms",
      type: "string",
      description: "Payment terms (e.g., Net 30, Net 60)",
      required: true,
      defaultValue: "Net 30",
    },
    {
      name: "purchaseOrderNumber",
      type: "string",
      description: "Client's purchase order number",
      required: false,
    },

    // Financial data
    {
      name: "subtotal",
      type: "currency",
      description: "Subtotal before tax",
      required: true,
    },
    {
      name: "taxTotal",
      type: "currency",
      description: "Total tax amount",
      required: true,
    },
    {
      name: "total",
      type: "currency",
      description: "Total invoice amount including tax",
      required: true,
    },
    {
      name: "amountDue",
      type: "currency",
      description: "Amount currently due",
      required: true,
    },

    // Company data
    {
      name: "sellerCompany",
      type: "string", // JSON object stringified
      description: "Seller company details (name, address, taxId)",
      required: true,
      aiInstructions: "JSON object with: name, address, taxId, registrationNumber",
    },
    {
      name: "buyerCompany",
      type: "string", // JSON object stringified
      description: "Buyer company details (name, address, taxId)",
      required: true,
      aiInstructions: "JSON object with: name, address, taxId, registrationNumber",
    },
    {
      name: "buyerCompanyName",
      type: "string",
      description: "Buyer company name for hero section",
      required: true,
    },

    // Line items
    {
      name: "lineItems",
      type: "string", // JSON array stringified
      description: "Array of invoice line items",
      required: true,
      aiInstructions: "JSON array with objects: {description, quantity, unitPrice, total, taxRate}",
    },

    // Recipient data
    {
      name: "recipientFirstName",
      type: "string",
      description: "Recipient's first name",
      required: true,
    },

    // Action URLs
    {
      name: "viewInvoiceUrl",
      type: "url",
      description: "URL to view invoice online",
      required: false,
    },
    {
      name: "payNowUrl",
      type: "url",
      description: "URL to pay invoice online",
      required: false,
    },

    // Optional notes
    {
      name: "notes",
      type: "string",
      description: "Additional notes or terms",
      required: false,
    },
  ],

  // Preview data for testing
  previewData: {
    header: {
      brandColor: "#6B46C1",
      companyName: "ACME Corporation",
      logo: "",
    },
    recipient: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@clientinc.com",
    },
    invoiceNumber: "INV-2024-001",
    invoiceDate: "January 15, 2024",
    dueDate: "February 14, 2024",
    paymentTerms: "Net 30",
    subtotal: 50000,
    taxTotal: 5000,
    total: 55000,
    amountDue: 55000,
    sellerCompany: {
      name: "ACME Corporation",
      address: "123 Business St, City, State 12345",
      taxId: "12-3456789",
    },
    buyerCompany: {
      name: "Client Inc",
      address: "456 Client Ave, City, State 67890",
      taxId: "98-7654321",
    },
    buyerCompanyName: "Client Inc",
    lineItems: [
      {
        description: "Enterprise Software License",
        quantity: 5,
        unitPrice: 10000,
        total: 50000,
      },
    ],
    recipientFirstName: "John",
    viewInvoiceUrl: "https://example.com/invoices/INV-2024-001",
    payNowUrl: "https://example.com/pay/INV-2024-001",
  },
};
