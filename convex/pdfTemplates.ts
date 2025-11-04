/**
 * PDF TEMPLATE REGISTRY
 *
 * Defines all available PDF templates for invoices and receipts.
 * Templates are hard-coded (no UI editing) and selected based on invoice type.
 *
 * Features:
 * - Template metadata (name, description, category, fields)
 * - Template registry for lookup
 * - Template validation
 * - Preview data generation
 */

// Id type available for future use if needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Id } from "./_generated/dataModel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TemplateCategory = "B2C" | "B2B";
export type TemplateId = "b2c_receipt" | "b2b_single" | "b2b_consolidated" | "b2b_consolidated_detailed";

export interface PdfTemplateField {
  name: string;
  type: "string" | "number" | "date" | "array" | "object";
  required: boolean;
  description: string;
}

export interface PdfTemplateStyling {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerFontSize: number;
  bodyFontSize: number;
  showLogo: boolean;
  showFooter: boolean;
}

export interface PdfTemplate {
  id: TemplateId;
  name: string;
  description: string;
  category: TemplateCategory;
  version: string;

  // Visual preview
  previewImageUrl?: string;
  previewDescription: string;

  // Required data fields
  requiredFields: PdfTemplateField[];

  // Default styling
  defaultStyling: PdfTemplateStyling;

  // Use cases
  useCases: string[];

  // Features
  features: string[];
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

/**
 * B2C RECEIPT TEMPLATE
 *
 * Simple receipt for individual customer purchases.
 * Used for standard checkout transactions.
 */
export const B2C_RECEIPT_TEMPLATE: PdfTemplate = {
  id: "b2c_receipt",
  name: "B2C Receipt",
  description: "Simple receipt for individual customer transactions",
  category: "B2C",
  version: "1.0.0",

  previewDescription: "Clean, professional receipt for B2C transactions. Shows customer details, purchased items, tax breakdown, and payment method.",

  requiredFields: [
    {
      name: "customerName",
      type: "string",
      required: true,
      description: "Customer's full name",
    },
    {
      name: "customerEmail",
      type: "string",
      required: true,
      description: "Customer's email address",
    },
    {
      name: "orderNumber",
      type: "string",
      required: true,
      description: "Unique order identifier",
    },
    {
      name: "orderDate",
      type: "date",
      required: true,
      description: "Date of purchase",
    },
    {
      name: "lineItems",
      type: "array",
      required: true,
      description: "Array of purchased items with quantities and prices",
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal before tax",
    },
    {
      name: "taxAmount",
      type: "number",
      required: true,
      description: "Total tax amount",
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Final total amount",
    },
    {
      name: "paymentMethod",
      type: "string",
      required: true,
      description: "Payment method used (card, bank transfer, etc.)",
    },
  ],

  defaultStyling: {
    primaryColor: "#6B46C1", // Purple
    secondaryColor: "#9F7AEA", // Light purple
    accentColor: "#2D3748", // Dark gray
    headerFontSize: 16,
    bodyFontSize: 10,
    showLogo: true,
    showFooter: true,
  },

  useCases: [
    "Individual event ticket purchases",
    "Single product orders",
    "B2C checkout transactions",
    "Customer order confirmations",
  ],

  features: [
    "Customer contact information",
    "Itemized line items",
    "Tax breakdown",
    "Payment method details",
    "Order tracking number",
    "Seller organization footer",
  ],
};

/**
 * B2B SINGLE INVOICE TEMPLATE
 *
 * Professional invoice for single B2B transactions.
 * Includes company details, VAT numbers, and billing address.
 */
export const B2B_SINGLE_TEMPLATE: PdfTemplate = {
  id: "b2b_single",
  name: "B2B Single Invoice",
  description: "Professional invoice for individual B2B transactions",
  category: "B2B",
  version: "1.0.0",

  previewDescription: "Professional B2B invoice with company details, VAT numbers, billing addresses, and payment terms. Perfect for single business transactions.",

  requiredFields: [
    {
      name: "invoiceNumber",
      type: "string",
      required: true,
      description: "Unique invoice number",
    },
    {
      name: "invoiceDate",
      type: "date",
      required: true,
      description: "Date invoice was issued",
    },
    {
      name: "dueDate",
      type: "date",
      required: true,
      description: "Payment due date",
    },
    {
      name: "billTo",
      type: "object",
      required: true,
      description: "Billing organization details (name, VAT, address, contact)",
    },
    {
      name: "lineItems",
      type: "array",
      required: true,
      description: "Invoice line items with descriptions and amounts",
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal before tax",
    },
    {
      name: "taxAmount",
      type: "number",
      required: true,
      description: "Tax amount",
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Total amount due",
    },
    {
      name: "paymentTerms",
      type: "string",
      required: true,
      description: "Payment terms (NET30, NET60, etc.)",
    },
  ],

  defaultStyling: {
    primaryColor: "#2563EB", // Blue
    secondaryColor: "#60A5FA", // Light blue
    accentColor: "#1E293B", // Dark slate
    headerFontSize: 18,
    bodyFontSize: 10,
    showLogo: true,
    showFooter: true,
  },

  useCases: [
    "Single B2B event registration",
    "Individual corporate service purchase",
    "One-time business transaction",
  ],

  features: [
    "Company billing information",
    "VAT/Tax ID numbers",
    "Billing address",
    "Payment terms and due date",
    "Professional invoice formatting",
    "Invoice numbering",
    "Seller organization details",
  ],
};

/**
 * B2B CONSOLIDATED INVOICE TEMPLATE
 *
 * Consolidated invoice for multiple transactions from same organization.
 * Groups multiple employee tickets into a single invoice.
 */
export const B2B_CONSOLIDATED_TEMPLATE: PdfTemplate = {
  id: "b2b_consolidated",
  name: "B2B Consolidated Invoice",
  description: "Consolidated invoice for multiple employees/tickets",
  category: "B2B",
  version: "1.0.0",

  previewDescription: "Consolidated B2B invoice that groups multiple employee registrations into a single billing document. Perfect for organizations like AMEOS that need one invoice for multiple employees.",

  requiredFields: [
    {
      name: "invoiceNumber",
      type: "string",
      required: true,
      description: "Unique invoice number",
    },
    {
      name: "invoiceDate",
      type: "date",
      required: true,
      description: "Date invoice was issued",
    },
    {
      name: "dueDate",
      type: "date",
      required: true,
      description: "Payment due date",
    },
    {
      name: "billTo",
      type: "object",
      required: true,
      description: "Billing organization details",
    },
    {
      name: "eventName",
      type: "string",
      required: true,
      description: "Name of the event",
    },
    {
      name: "lineItems",
      type: "array",
      required: true,
      description: "Array of employees/tickets (one line per employee)",
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal of all tickets",
    },
    {
      name: "taxAmount",
      type: "number",
      required: true,
      description: "Total tax amount",
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Total amount due",
    },
    {
      name: "paymentTerms",
      type: "string",
      required: true,
      description: "Payment terms",
    },
    {
      name: "employeeCount",
      type: "number",
      required: true,
      description: "Number of employees included",
    },
  ],

  defaultStyling: {
    primaryColor: "#059669", // Green
    secondaryColor: "#34D399", // Light green
    accentColor: "#064E3B", // Dark green
    headerFontSize: 18,
    bodyFontSize: 10,
    showLogo: true,
    showFooter: true,
  },

  useCases: [
    "AMEOS: Multiple doctors attending HaffSymposium",
    "Corporate bulk event registrations",
    "Employer-invoiced employee tickets",
    "Organization-wide training sessions",
  ],

  features: [
    "Consolidated line items (one per employee)",
    "Employee names prominently displayed",
    "Event details at top",
    "Subtotals and grand total",
    "Payment terms for employer billing",
    "Clear employee count",
    "Professional corporate formatting",
  ],
};

/**
 * B2B CONSOLIDATED DETAILED TEMPLATE
 *
 * Extended consolidated invoice with detailed breakdown per employee.
 * Shows base ticket price + add-ons for each employee.
 */
export const B2B_CONSOLIDATED_DETAILED_TEMPLATE: PdfTemplate = {
  id: "b2b_consolidated_detailed",
  name: "B2B Consolidated Invoice (Detailed)",
  description: "Detailed consolidated invoice with per-employee breakdowns",
  category: "B2B",
  version: "1.0.0",

  previewDescription: "Detailed consolidated invoice showing base ticket price and add-ons for each employee. Provides transparency for organizations that want to see exactly what each employee purchased.",

  requiredFields: [
    {
      name: "invoiceNumber",
      type: "string",
      required: true,
      description: "Unique invoice number",
    },
    {
      name: "invoiceDate",
      type: "date",
      required: true,
      description: "Date invoice was issued",
    },
    {
      name: "dueDate",
      type: "date",
      required: true,
      description: "Payment due date",
    },
    {
      name: "billTo",
      type: "object",
      required: true,
      description: "Billing organization details",
    },
    {
      name: "eventName",
      type: "string",
      required: true,
      description: "Name of the event",
    },
    {
      name: "lineItems",
      type: "array",
      required: true,
      description: "Array of employees with sub-items (base + add-ons)",
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal of all tickets",
    },
    {
      name: "taxAmount",
      type: "number",
      required: true,
      description: "Total tax amount",
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Total amount due",
    },
    {
      name: "paymentTerms",
      type: "string",
      required: true,
      description: "Payment terms",
    },
    {
      name: "employeeCount",
      type: "number",
      required: true,
      description: "Number of employees included",
    },
  ],

  defaultStyling: {
    primaryColor: "#7C3AED", // Purple
    secondaryColor: "#A78BFA", // Light purple
    accentColor: "#4C1D95", // Dark purple
    headerFontSize: 18,
    bodyFontSize: 9,
    showLogo: true,
    showFooter: true,
  },

  useCases: [
    "Detailed breakdown for auditing",
    "Organizations requiring itemized expenses",
    "Events with multiple add-ons per employee",
    "Finance departments needing transparency",
  ],

  features: [
    "Per-employee line items",
    "Sub-items showing base + add-ons",
    "Individual employee subtotals",
    "Clear pricing breakdown",
    "Add-on descriptions (UCRA boat event, etc.)",
    "Professional detailed formatting",
    "Easy to audit and verify",
  ],
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

/**
 * Master registry of all available templates
 */
export const PDF_TEMPLATE_REGISTRY: Record<TemplateId, PdfTemplate> = {
  b2c_receipt: B2C_RECEIPT_TEMPLATE,
  b2b_single: B2B_SINGLE_TEMPLATE,
  b2b_consolidated: B2B_CONSOLIDATED_TEMPLATE,
  b2b_consolidated_detailed: B2B_CONSOLIDATED_DETAILED_TEMPLATE,
};

/**
 * Get all available templates
 */
export function getAllTemplates(): PdfTemplate[] {
  return Object.values(PDF_TEMPLATE_REGISTRY);
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: TemplateId): PdfTemplate | null {
  return PDF_TEMPLATE_REGISTRY[templateId] || null;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): PdfTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Validate template data against required fields
 */
export function validateTemplateData(
  templateId: TemplateId,
  data: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const template = getTemplateById(templateId);
  if (!template) {
    return { valid: false, missingFields: ["Invalid template ID"] };
  }

  const missingFields: string[] = [];

  for (const field of template.requiredFields) {
    if (field.required && !(field.name in data)) {
      missingFields.push(field.name);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get recommended template for invoice type
 */
export function getRecommendedTemplate(
  invoiceType: "b2c_single" | "b2b_single" | "b2b_consolidated",
  options?: { showDetails?: boolean }
): TemplateId {
  if (invoiceType === "b2c_single") {
    return "b2c_receipt";
  }

  if (invoiceType === "b2b_single") {
    return "b2b_single";
  }

  // B2B consolidated - choose between simple and detailed
  if (invoiceType === "b2b_consolidated") {
    return options?.showDetails ? "b2b_consolidated_detailed" : "b2b_consolidated";
  }

  // Default fallback
  return "b2c_receipt";
}

// ============================================================================
// CONVEX QUERIES
// ============================================================================

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all available PDF templates
 *
 * Optionally filter by category (B2B or B2C)
 */
export const getAvailableTemplates = query({
  args: {
    category: v.optional(v.union(v.literal("B2B"), v.literal("B2C"))),
  },
  handler: async (_ctx, args) => {
    const templates = getAllTemplates();

    if (args.category) {
      return templates.filter(t => t.category === args.category);
    }

    return templates;
  },
});

/**
 * Get a specific template by ID (Convex query)
 */
export const getTemplate = query({
  args: {
    templateId: v.union(
      v.literal("b2c_receipt"),
      v.literal("b2b_single"),
      v.literal("b2b_consolidated"),
      v.literal("b2b_consolidated_detailed")
    ),
  },
  handler: async (_ctx, args) => {
    const template = PDF_TEMPLATE_REGISTRY[args.templateId];
    return template || null;
  },
});

// ============================================================================
// SAMPLE DATA GENERATORS (for UI previews)
// ============================================================================

/**
 * Generate sample data for template preview
 */
export function generateSampleData(templateId: TemplateId): Record<string, unknown> {
  const now = Date.now();

  switch (templateId) {
    case "b2c_receipt":
      return {
        customerName: "Max Mustermann",
        customerEmail: "max.mustermann@example.com",
        orderNumber: "ORD-2024-0001",
        orderDate: now,
        lineItems: [
          {
            description: "HaffSymposium 2024 - General Admission",
            quantity: 1,
            unitPrice: 15000,
            totalPrice: 15000,
          },
          {
            description: "UCRA Boat Event (1 person)",
            quantity: 1,
            unitPrice: 3000,
            totalPrice: 3000,
          },
        ],
        subtotal: 18000,
        taxAmount: 0,
        total: 18000,
        currency: "EUR",
        paymentMethod: "Credit Card",
      };

    case "b2b_single":
      return {
        invoiceNumber: "INV-2024-0001",
        invoiceDate: now,
        dueDate: now + 30 * 24 * 60 * 60 * 1000, // +30 days
        billTo: {
          name: "AMEOS Klinikum Ueckermünde",
          vatNumber: "DE123456789",
          billingAddress: {
            line1: "Ravensteinstraße 23",
            city: "Ueckermünde",
            postalCode: "17373",
            country: "Germany",
          },
          billingEmail: "buchhaltung@ameos.de",
          billingContact: "Frau Schmidt",
        },
        lineItems: [
          {
            description: "HaffSymposium 2024 - Dr. Anna Müller",
            quantity: 1,
            unitPrice: 18000,
            totalPrice: 18000,
          },
        ],
        subtotal: 18000,
        taxAmount: 0,
        total: 18000,
        currency: "EUR",
        paymentTerms: "NET30",
      };

    case "b2b_consolidated":
      return {
        invoiceNumber: "INV-AMEOS-2024-0001",
        invoiceDate: now,
        dueDate: now + 30 * 24 * 60 * 60 * 1000,
        billTo: {
          name: "AMEOS Klinikum Ueckermünde",
          vatNumber: "DE123456789",
          billingAddress: {
            line1: "Ravensteinstraße 23",
            city: "Ueckermünde",
            postalCode: "17373",
            country: "Germany",
          },
          billingEmail: "buchhaltung@ameos.de",
          billingContact: "Frau Schmidt",
        },
        eventName: "HaffSymposium 2024",
        lineItems: [
          {
            description: "Dr. Anna Müller",
            totalPrice: 18000,
          },
          {
            description: "Dr. Thomas Wagner",
            totalPrice: 21000,
          },
          {
            description: "Dr. Lisa Schmidt",
            totalPrice: 15000,
          },
        ],
        subtotal: 54000,
        taxAmount: 0,
        total: 54000,
        currency: "EUR",
        paymentTerms: "NET30",
        employeeCount: 3,
      };

    case "b2b_consolidated_detailed":
      return {
        invoiceNumber: "INV-AMEOS-2024-0001",
        invoiceDate: now,
        dueDate: now + 30 * 24 * 60 * 60 * 1000,
        billTo: {
          name: "AMEOS Klinikum Ueckermünde",
          vatNumber: "DE123456789",
          billingAddress: {
            line1: "Ravensteinstraße 23",
            city: "Ueckermünde",
            postalCode: "17373",
            country: "Germany",
          },
          billingEmail: "buchhaltung@ameos.de",
          billingContact: "Frau Schmidt",
        },
        eventName: "HaffSymposium 2024",
        lineItems: [
          {
            description: "Dr. Anna Müller",
            totalPrice: 18000,
            subItems: [
              { description: "Base Ticket", price: 15000 },
              { description: "UCRA Boat Event (1 person)", price: 3000 },
            ],
          },
          {
            description: "Dr. Thomas Wagner",
            totalPrice: 21000,
            subItems: [
              { description: "Base Ticket", price: 15000 },
              { description: "UCRA Boat Event (2 people)", price: 6000 },
            ],
          },
          {
            description: "Dr. Lisa Schmidt",
            totalPrice: 15000,
            subItems: [
              { description: "Base Ticket", price: 15000 },
            ],
          },
        ],
        subtotal: 54000,
        taxAmount: 0,
        total: 54000,
        currency: "EUR",
        paymentTerms: "NET30",
        employeeCount: 3,
      };

    default:
      return {};
  }
}
