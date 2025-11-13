/**
 * PDF TEMPLATE REGISTRY
 *
 * Defines available PDF templates with API Template.io configuration.
 * These templates are seeded into the database with type: "template", subtype: "pdf".
 *
 * Philosophy: Template HTML/CSS stored as TypeScript string constants in code.
 * API Template.io's /v2/create-pdf-from-html endpoint renders them to PDFs.
 */

import {
  INVOICE_TEMPLATE_HTML,
  INVOICE_TEMPLATE_CSS,
} from "./lib/pdf_templates/invoice_template";
import {
  INVOICE_B2B_SINGLE_HTML,
  INVOICE_B2B_SINGLE_CSS,
} from "./lib/pdf_templates/invoice_b2b_single";
import {
  TICKET_TEMPLATE_HTML,
  TICKET_TEMPLATE_CSS,
} from "./lib/pdf_templates/ticket_template";
import {
  ELEGANT_GOLD_TICKET_TEMPLATE_HTML,
  ELEGANT_GOLD_TICKET_TEMPLATE_CSS,
} from "./lib/pdf_templates/elegant_gold_ticket_template";
import {
  MODERN_TICKET_TEMPLATE_HTML,
  MODERN_TICKET_TEMPLATE_CSS,
} from "./lib/pdf_templates/modern_ticket_template";
import {
  VIP_PREMIUM_TICKET_TEMPLATE_HTML,
  VIP_PREMIUM_TICKET_TEMPLATE_CSS,
} from "./lib/pdf_templates/vip_premium_ticket_template";

export interface PdfTemplateField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  required: boolean;
  description?: string;
  example?: unknown;
}

export interface PdfTemplateDefinition {
  code: string;
  name: string;
  description: string;
  category: "ticket" | "invoice" | "receipt" | "certificate";
  template: {
    html: string; // HTML template with Jinja2 variables
    css: string; // CSS styling
  };
  apiTemplate: {
    provider: "apitemplate.io";
    endpoint: string; // /v2/create-pdf-from-html or /v2/create-pdf-url
    dashboardTemplateId?: string; // Template ID from API Template.io dashboard (when using /v2/create-pdf-url)
  };
  requiredFields: PdfTemplateField[];
  defaultStyling?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontSize?: string;
    fontFamily?: string;
  };
  previewImageUrl?: string;
  version: string;
}

/**
 * TICKET TEMPLATES
 */

export const TICKET_PROFESSIONAL_V1: PdfTemplateDefinition = {
  code: "ticket_professional_v1",
  name: "Professional Event Ticket",
  description: "Clean, professional ticket design with QR code, event details, and branding",
  category: "ticket",
  template: {
    html: TICKET_TEMPLATE_HTML,
    css: TICKET_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    {
      name: "ticketNumber",
      type: "string",
      required: true,
      description: "Unique ticket identifier",
      example: "TKT-2025-001234",
    },
    {
      name: "attendeeName",
      type: "string",
      required: true,
      description: "Full name of ticket holder",
      example: "John Doe",
    },
    {
      name: "attendeeEmail",
      type: "string",
      required: false,
      description: "Email address of ticket holder",
      example: "john@example.com",
    },
    {
      name: "eventName",
      type: "string",
      required: true,
      description: "Name of the event",
      example: "Medical Conference 2025",
    },
    {
      name: "eventDate",
      type: "string",
      required: true,
      description: "Event date and time",
      example: "March 15, 2025 at 9:00 AM",
    },
    {
      name: "eventLocation",
      type: "string",
      required: true,
      description: "Event venue and address",
      example: "Convention Center, 123 Main St, City, State",
    },
    {
      name: "qrCodeData",
      type: "string",
      required: true,
      description: "Data to encode in QR code (typically ticket URL for validation)",
      example: "https://vc83.com/validate/TKT-2025-001234",
    },
    {
      name: "organizerName",
      type: "string",
      required: true,
      description: "Organization hosting the event",
      example: "Medical Education Institute",
    },
    {
      name: "organizerLogo",
      type: "string",
      required: false,
      description: "URL to organizer logo image",
      example: "https://cdn.vc83.com/logos/mei-logo.png",
    },
    {
      name: "ticketType",
      type: "string",
      required: false,
      description: "Type/category of ticket",
      example: "VIP Access",
    },
    {
      name: "seatNumber",
      type: "string",
      required: false,
      description: "Assigned seat number",
      example: "A-15",
    },
  ],
  defaultStyling: {
    primaryColor: "#6B46C1",
    secondaryColor: "#9F7AEA",
    fontSize: "12pt",
    fontFamily: "Helvetica",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/ticket-professional-preview.png",
  version: "1.0.0",
};

export const TICKET_RETRO_V1: PdfTemplateDefinition = {
  code: "ticket_retro_v1",
  name: "Retro Event Ticket",
  description: "Fun retro-themed ticket with vintage computer aesthetic",
  category: "ticket",
  template: {
    html: TICKET_TEMPLATE_HTML, // Uses same HTML as professional, different styling
    css: TICKET_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    // Same fields as professional, but different styling
    ...TICKET_PROFESSIONAL_V1.requiredFields,
  ],
  defaultStyling: {
    primaryColor: "#00FF00",
    secondaryColor: "#FFFF00",
    fontSize: "10pt",
    fontFamily: "Courier",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/ticket-retro-preview.png",
  version: "1.0.0",
};

export const TICKET_ELEGANT_GOLD_V1: PdfTemplateDefinition = {
  code: "ticket_elegant_gold_v1",
  name: "Elegant Gold Ticket",
  description: "Luxurious black & gold design for upscale events with elegant typography and premium styling",
  category: "ticket",
  template: {
    html: ELEGANT_GOLD_TICKET_TEMPLATE_HTML,
    css: ELEGANT_GOLD_TICKET_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    ...TICKET_PROFESSIONAL_V1.requiredFields,
  ],
  defaultStyling: {
    primaryColor: "#d4af37",
    secondaryColor: "#8b7355",
    fontSize: "11pt",
    fontFamily: "Garamond, Georgia, serif",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/ticket-elegant-gold-preview.png",
  version: "1.0.0",
};

export const TICKET_MODERN_V1: PdfTemplateDefinition = {
  code: "ticket_modern_v1",
  name: "Modern Ticket",
  description: "Clean contemporary design with bold typography and ample whitespace for tech events and modern brands",
  category: "ticket",
  template: {
    html: MODERN_TICKET_TEMPLATE_HTML,
    css: MODERN_TICKET_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    ...TICKET_PROFESSIONAL_V1.requiredFields,
  ],
  defaultStyling: {
    primaryColor: "#6B46C1",
    secondaryColor: "#9F7AEA",
    fontSize: "11pt",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/ticket-modern-preview.png",
  version: "1.0.0",
};

export const TICKET_VIP_PREMIUM_V1: PdfTemplateDefinition = {
  code: "ticket_vip_premium_v1",
  name: "VIP Premium Ticket",
  description: "Exclusive VIP design with premium styling and VIP badge for elevated ticket holder experience",
  category: "ticket",
  template: {
    html: VIP_PREMIUM_TICKET_TEMPLATE_HTML,
    css: VIP_PREMIUM_TICKET_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    ...TICKET_PROFESSIONAL_V1.requiredFields,
  ],
  defaultStyling: {
    primaryColor: "#FFD700",
    secondaryColor: "#C0C0C0",
    fontSize: "11pt",
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/ticket-vip-premium-preview.png",
  version: "1.0.0",
};

/**
 * INVOICE TEMPLATES
 */

export const INVOICE_B2C_RECEIPT_V1: PdfTemplateDefinition = {
  code: "invoice_b2c_receipt_v1",
  name: "B2C Receipt",
  description: "Simple receipt for individual purchases",
  category: "receipt",
  template: {
    html: INVOICE_TEMPLATE_HTML, // Uses simplified version of invoice template
    css: INVOICE_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    {
      name: "receiptNumber",
      type: "string",
      required: true,
      description: "Unique receipt identifier",
      example: "RCP-2025-001234",
    },
    {
      name: "receiptDate",
      type: "string",
      required: true,
      description: "Date of purchase",
      example: "January 15, 2025",
    },
    {
      name: "customerName",
      type: "string",
      required: true,
      description: "Customer name",
      example: "Jane Smith",
    },
    {
      name: "customerEmail",
      type: "string",
      required: false,
      description: "Customer email",
      example: "jane@example.com",
    },
    {
      name: "items",
      type: "array",
      required: true,
      description: "Purchased items with name, quantity, price",
      example: [
        { name: "Event Ticket", quantity: 1, price: 299.00 },
        { name: "Workshop Access", quantity: 1, price: 99.00 },
      ],
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal before tax",
      example: 398.00,
    },
    {
      name: "tax",
      type: "number",
      required: false,
      description: "Tax amount",
      example: 31.84,
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Total amount paid",
      example: 429.84,
    },
    {
      name: "paymentMethod",
      type: "string",
      required: false,
      description: "Payment method used",
      example: "Visa •••• 4242",
    },
    {
      name: "organizationName",
      type: "string",
      required: true,
      description: "Seller organization name",
      example: "Medical Education Institute",
    },
    {
      name: "organizationLogo",
      type: "string",
      required: false,
      description: "Organization logo URL",
      example: "https://cdn.vc83.com/logos/org-logo.png",
    },
  ],
  defaultStyling: {
    primaryColor: "#6B46C1",
    secondaryColor: "#9F7AEA",
    fontSize: "11pt",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/receipt-b2c-preview.png",
  version: "1.0.0",
};

export const INVOICE_B2B_CONSOLIDATED_V1: PdfTemplateDefinition = {
  code: "invoice_b2b_consolidated_v1",
  name: "B2B Consolidated Invoice",
  description: "Professional invoice for business clients with multiple line items, tax breakdown, and payment terms",
  category: "invoice",
  template: {
    html: INVOICE_TEMPLATE_HTML,
    css: INVOICE_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    {
      name: "invoiceNumber",
      type: "string",
      required: true,
      description: "Unique invoice identifier",
      example: "INV-2025-001234",
    },
    {
      name: "invoiceDate",
      type: "string",
      required: true,
      description: "Invoice issue date",
      example: "January 15, 2025",
    },
    {
      name: "dueDate",
      type: "string",
      required: true,
      description: "Payment due date",
      example: "February 14, 2025",
    },
    {
      name: "billTo",
      type: "object",
      required: true,
      description: "Billing company information",
      example: {
        companyName: "ABC Medical School",
        contactName: "Dr. John Smith",
        address: "123 University Ave",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        taxId: "12-3456789",
      },
    },
    {
      name: "billFrom",
      type: "object",
      required: true,
      description: "Seller company information",
      example: {
        companyName: "Medical Education Institute",
        address: "456 Provider St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        taxId: "98-7654321",
        phone: "(555) 123-4567",
        email: "billing@mei.org",
      },
    },
    {
      name: "lineItems",
      type: "array",
      required: true,
      description: "Invoice line items with description, quantity, rate, amount",
      example: [
        {
          description: "Conference Registration (10 attendees)",
          quantity: 10,
          rate: 299.00,
          amount: 2990.00,
        },
        {
          description: "Workshop Bundle Access",
          quantity: 10,
          rate: 99.00,
          amount: 990.00,
        },
      ],
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal before tax",
      example: 3980.00,
    },
    {
      name: "taxRate",
      type: "number",
      required: false,
      description: "Tax rate percentage",
      example: 8.0,
    },
    {
      name: "tax",
      type: "number",
      required: false,
      description: "Tax amount",
      example: 318.40,
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Total amount due",
      example: 4298.40,
    },
    {
      name: "paymentTerms",
      type: "string",
      required: false,
      description: "Payment terms and instructions",
      example: "Net 30. Payment due within 30 days of invoice date. Wire transfer or check accepted.",
    },
    {
      name: "notes",
      type: "string",
      required: false,
      description: "Additional notes or instructions",
      example: "Thank you for your business. CME credits will be issued upon payment.",
    },
  ],
  defaultStyling: {
    primaryColor: "#2C3E50",
    secondaryColor: "#6B46C1",
    fontSize: "10pt",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/invoice-b2b-preview.png",
  version: "1.0.0",
};

export const INVOICE_B2B_CONSOLIDATED_DETAILED_V1: PdfTemplateDefinition = {
  code: "invoice_b2b_consolidated_detailed_v1",
  name: "B2B Consolidated Invoice (Detailed)",
  description: "Detailed invoice with itemized breakdown of all attendees and their registrations",
  category: "invoice",
  template: {
    html: INVOICE_TEMPLATE_HTML, // Extended with attendee breakdown section
    css: INVOICE_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    ...INVOICE_B2B_CONSOLIDATED_V1.requiredFields,
    {
      name: "attendeeBreakdown",
      type: "array",
      required: false,
      description: "Detailed list of all attendees and their individual items",
      example: [
        {
          attendeeName: "Dr. Jane Doe",
          email: "jane.doe@abcmedical.edu",
          items: ["Conference Registration", "Workshop: Advanced Diagnostics"],
          total: 398.00,
        },
        {
          attendeeName: "Dr. Bob Smith",
          email: "bob.smith@abcmedical.edu",
          items: ["Conference Registration"],
          total: 299.00,
        },
      ],
    },
  ],
  defaultStyling: {
    primaryColor: "#2C3E50",
    secondaryColor: "#6B46C1",
    fontSize: "9pt",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/invoice-b2b-detailed-preview.png",
  version: "1.0.0",
};

export const INVOICE_B2B_SINGLE_V1: PdfTemplateDefinition = {
  code: "invoice_b2b_single_v1",
  name: "B2B Single Invoice",
  description: "Professional invoice for individual B2B transactions with complete VAT breakdown",
  category: "invoice",
  template: {
    html: INVOICE_B2B_SINGLE_HTML,
    css: INVOICE_B2B_SINGLE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    {
      name: "invoiceNumber",
      type: "string",
      required: true,
      description: "Unique invoice identifier",
      example: "INV-2025-001234",
    },
    {
      name: "invoiceDate",
      type: "string",
      required: true,
      description: "Invoice issue date",
      example: "January 15, 2025",
    },
    {
      name: "dueDate",
      type: "string",
      required: true,
      description: "Payment due date",
      example: "February 14, 2025",
    },
    {
      name: "billTo",
      type: "object",
      required: true,
      description: "Billing company information",
      example: {
        companyName: "ABC Medical School",
        contactName: "Dr. John Smith",
        address: "123 University Ave",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        vatNumber: "DE123456789",
      },
    },
    {
      name: "items",
      type: "array",
      required: true,
      description: "Invoice line items with VAT breakdown",
      example: [
        {
          description: "VIP Conference Ticket",
          quantity: 1,
          unitPrice: 6639, // Net price in cents (€66.39)
          taxAmount: 1261, // VAT in cents (€12.61)
          totalPrice: 7900, // Gross in cents (€79.00)
          taxRate: 19, // Tax rate percentage
        },
      ],
    },
    {
      name: "subtotal",
      type: "number",
      required: true,
      description: "Subtotal (net) in cents",
      example: 6639,
    },
    {
      name: "taxRate",
      type: "number",
      required: true,
      description: "Tax rate percentage",
      example: 19,
    },
    {
      name: "tax",
      type: "number",
      required: true,
      description: "Tax amount (VAT) in cents",
      example: 1261,
    },
    {
      name: "total",
      type: "number",
      required: true,
      description: "Total amount (gross) in cents",
      example: 7900,
    },
    {
      name: "currency",
      type: "string",
      required: true,
      description: "Currency symbol",
      example: "€",
    },
    {
      name: "paymentTerms",
      type: "string",
      required: false,
      description: "Payment terms",
      example: "NET30",
    },
    {
      name: "paymentMethod",
      type: "string",
      required: false,
      description: "Payment method used",
      example: "Stripe",
    },
    {
      name: "organizationName",
      type: "string",
      required: true,
      description: "Seller organization name",
      example: "Medical Education Institute",
    },
    {
      name: "organizationAddress",
      type: "string",
      required: true,
      description: "Seller address",
      example: "456 Provider St, New York, NY 10001",
    },
    {
      name: "organizationPhone",
      type: "string",
      required: true,
      description: "Seller phone",
      example: "(555) 123-4567",
    },
    {
      name: "organizationEmail",
      type: "string",
      required: true,
      description: "Seller email",
      example: "billing@mei.org",
    },
    {
      name: "logoUrl",
      type: "string",
      required: false,
      description: "Organization logo URL",
      example: "https://cdn.vc83.com/logos/org-logo.png",
    },
    {
      name: "highlightColor",
      type: "string",
      required: false,
      description: "Accent color for branding",
      example: "#6B46C1",
    },
  ],
  defaultStyling: {
    primaryColor: "#2C3E50",
    secondaryColor: "#6B46C1",
    fontSize: "11pt",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/invoice-b2b-single-preview.png",
  version: "1.0.0",
};

/**
 * CERTIFICATE TEMPLATES
 */

export const CERTIFICATE_CME_V1: PdfTemplateDefinition = {
  code: "certificate_cme_v1",
  name: "CME Completion Certificate",
  description: "Professional certificate for continuing medical education course completion",
  category: "certificate",
  template: {
    html: TICKET_TEMPLATE_HTML, // Placeholder - need to create certificate template
    css: TICKET_TEMPLATE_CSS,
  },
  apiTemplate: {
    provider: "apitemplate.io",
    endpoint: "https://rest.apitemplate.io/v2/create-pdf-from-html",
  },
  requiredFields: [
    {
      name: "recipientName",
      type: "string",
      required: true,
      description: "Name of certificate recipient",
      example: "Dr. Sarah Johnson, MD",
    },
    {
      name: "courseName",
      type: "string",
      required: true,
      description: "Name of completed course",
      example: "Advanced Cardiac Imaging Techniques",
    },
    {
      name: "completionDate",
      type: "string",
      required: true,
      description: "Date course was completed",
      example: "March 15, 2025",
    },
    {
      name: "creditHours",
      type: "number",
      required: true,
      description: "Number of CME credits earned",
      example: 12.5,
    },
    {
      name: "certificateNumber",
      type: "string",
      required: true,
      description: "Unique certificate identifier",
      example: "CME-2025-001234",
    },
    {
      name: "accreditationBody",
      type: "string",
      required: false,
      description: "Accrediting organization",
      example: "Accreditation Council for Continuing Medical Education",
    },
    {
      name: "providerName",
      type: "string",
      required: true,
      description: "CME provider organization",
      example: "Medical Education Institute",
    },
    {
      name: "providerLogo",
      type: "string",
      required: false,
      description: "Provider logo URL",
      example: "https://cdn.vc83.com/logos/mei-logo.png",
    },
    {
      name: "signatoryName",
      type: "string",
      required: false,
      description: "Name of signing authority",
      example: "Dr. Michael Chen, Course Director",
    },
    {
      name: "signatorySignature",
      type: "string",
      required: false,
      description: "Digital signature image URL",
      example: "https://cdn.vc83.com/signatures/dr-chen-sig.png",
    },
  ],
  defaultStyling: {
    primaryColor: "#1E3A8A",
    secondaryColor: "#6B46C1",
    fontSize: "12pt",
  },
  previewImageUrl: "https://cdn.vc83.com/templates/certificate-cme-preview.png",
  version: "1.0.0",
};

/**
 * EXPORT: Template Registry
 *
 * All available PDF templates indexed by code.
 */
export const PDF_TEMPLATE_REGISTRY: Record<string, PdfTemplateDefinition> = {
  // Tickets
  ticket_professional_v1: TICKET_PROFESSIONAL_V1,
  ticket_retro_v1: TICKET_RETRO_V1,
  ticket_elegant_gold_v1: TICKET_ELEGANT_GOLD_V1,
  ticket_modern_v1: TICKET_MODERN_V1,
  ticket_vip_premium_v1: TICKET_VIP_PREMIUM_V1,

  // Receipts & Invoices
  invoice_b2c_receipt_v1: INVOICE_B2C_RECEIPT_V1,
  invoice_b2b_single_v1: INVOICE_B2B_SINGLE_V1,
  invoice_b2b_consolidated_v1: INVOICE_B2B_CONSOLIDATED_V1,
  invoice_b2b_consolidated_detailed_v1: INVOICE_B2B_CONSOLIDATED_DETAILED_V1,

  // Certificates
  certificate_cme_v1: CERTIFICATE_CME_V1,
};

/**
 * HELPER FUNCTIONS
 */

/**
 * Get template definition by code
 */
export function getTemplateByCode(code: string): PdfTemplateDefinition | undefined {
  return PDF_TEMPLATE_REGISTRY[code];
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(
  category: "ticket" | "invoice" | "receipt" | "certificate"
): PdfTemplateDefinition[] {
  return Object.values(PDF_TEMPLATE_REGISTRY).filter((t) => t.category === category);
}

/**
 * Validate template data against required fields
 */
export function validateTemplateData(
  templateCode: string,
  data: Record<string, unknown>
): { valid: boolean; missing: string[]; errors: string[] } {
  const template = getTemplateByCode(templateCode);
  if (!template) {
    return {
      valid: false,
      missing: [],
      errors: [`Template ${templateCode} not found in registry`],
    };
  }

  const missing: string[] = [];
  const errors: string[] = [];

  for (const field of template.requiredFields) {
    if (field.required && !(field.name in data)) {
      missing.push(field.name);
    }

    // Type validation (basic)
    if (field.name in data) {
      const value = data[field.name];
      const actualType = Array.isArray(value) ? "array" : typeof value;

      if (field.type === "date" && typeof value === "string") {
        // Accept strings for dates
        continue;
      }

      if (field.type !== actualType && !(field.type === "object" && value === null)) {
        errors.push(
          `Field ${field.name}: expected ${field.type}, got ${actualType}`
        );
      }
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}
// Helper functions for template lookups

/**
 * TICKET TEMPLATES - Subset for easy access
 */
export const TICKET_TEMPLATES = [
  TICKET_PROFESSIONAL_V1,
  TICKET_RETRO_V1,
  TICKET_ELEGANT_GOLD_V1,
  TICKET_MODERN_V1,
  TICKET_VIP_PREMIUM_V1,
];

/**
 * INVOICE TEMPLATES - Subset for easy access
 */
export const INVOICE_TEMPLATES = [
  INVOICE_B2C_RECEIPT_V1,
  INVOICE_B2B_SINGLE_V1,
  INVOICE_B2B_CONSOLIDATED_V1,
  INVOICE_B2B_CONSOLIDATED_DETAILED_V1,
];

/**
 * Get ticket template by code
 */
export function getTicketTemplateByCode(code: string): PdfTemplateDefinition | null {
  return TICKET_TEMPLATES.find(t => t.code === code) || null;
}

/**
 * Get invoice template by code
 */
export function getInvoiceTemplateByCode(code: string): PdfTemplateDefinition | null {
  return INVOICE_TEMPLATES.find(t => t.code === code) || null;
}
