/**
 * Invoice PDF Generation using API Template.io
 *
 * This module provides functions to generate invoice PDFs from HTML/CSS templates
 * using the API Template.io /v2/create-pdf-from-html endpoint.
 *
 * Integrates with the B2B invoicing system and invoice template registry.
 */

import {
  INVOICE_TEMPLATE_HTML,
  INVOICE_TEMPLATE_CSS,
} from "./pdf_templates/invoice_template";

/**
 * API Template.io Configuration
 */
const API_TEMPLATE_BASE_URL = "https://rest.apitemplate.io";

/**
 * Response from API Template.io
 */
export interface ApiTemplateResponse {
  status: "success" | "error";
  download_url?: string;
  download_url_png?: string;
  transaction_ref?: string;
  error?: string;
  message?: string;
}

/**
 * Template registry for invoice templates
 */
interface InvoiceTemplateDefinition {
  html: string;
  css: string;
}

const INVOICE_TEMPLATE_REGISTRY: Record<string, InvoiceTemplateDefinition> = {
  "b2b-professional": {
    html: INVOICE_TEMPLATE_HTML,
    css: INVOICE_TEMPLATE_CSS,
  },
  "b2c-receipt": {
    html: INVOICE_TEMPLATE_HTML, // Can be customized later
    css: INVOICE_TEMPLATE_CSS,
  },
  "detailed-breakdown": {
    html: INVOICE_TEMPLATE_HTML, // Can be extended with attendee breakdown
    css: INVOICE_TEMPLATE_CSS,
  },
};

/**
 * Invoice PDF Generation Options
 */
export interface InvoicePdfGenerationOptions {
  apiKey: string;
  templateCode: string;
  invoiceData: {
    // Organization (seller)
    organization_name: string;
    organization_address?: string;
    organization_phone?: string;
    organization_email?: string;
    logo_url?: string;
    highlight_color?: string;

    // Invoice metadata
    invoice_number: string;
    invoice_date: string;
    due_date: string;

    // Bill to (customer)
    bill_to: {
      company_name: string;
      contact_name?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      country?: string;
      tax_id?: string;
      vat_number?: string;
    };

    // Line items
    items: Array<{
      description: string;
      quantity: number;
      rate: number; // in dollars
      amount: number; // in dollars
    }>;

    // Totals
    subtotal: number;
    tax_rate?: number;
    tax: number;
    total: number;

    // Payment terms
    payment_terms?: string;
    payment_method?: string;
    notes?: string;

    // Optional: Attendee breakdown for detailed invoices
    attendee_breakdown?: Array<{
      attendee_name: string;
      email?: string;
      items: string[];
      total: number;
    }>;
  };
  paperSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

/**
 * Generate Invoice PDF from HTML template using API Template.io
 *
 * @example
 * ```typescript
 * const pdfUrl = await generateInvoicePdfFromTemplate({
 *   apiKey: process.env.API_TEMPLATE_IO_KEY!,
 *   templateCode: "b2b-professional",
 *   invoiceData: {
 *     organization_name: "Medical Education Institute",
 *     organization_address: "123 Provider St, New York, NY 10001",
 *     organization_phone: "(555) 123-4567",
 *     organization_email: "billing@mei.org",
 *     invoice_number: "INV-2025-001234",
 *     invoice_date: "January 15, 2025",
 *     due_date: "February 14, 2025",
 *     bill_to: {
 *       company_name: "ABC Medical School",
 *       contact_name: "Dr. John Smith",
 *       address: "123 University Ave",
 *       city: "Boston",
 *       state: "MA",
 *       zip_code: "02115",
 *       tax_id: "12-3456789",
 *     },
 *     items: [
 *       {
 *         description: "Conference Registration (10 attendees)",
 *         quantity: 10,
 *         rate: 299.00,
 *         amount: 2990.00,
 *       },
 *       {
 *         description: "Workshop Bundle Access",
 *         quantity: 10,
 *         rate: 99.00,
 *         amount: 990.00,
 *       },
 *     ],
 *     subtotal: 3980.00,
 *     tax_rate: 8.0,
 *     tax: 318.40,
 *     total: 4298.40,
 *     highlight_color: "#6B46C1",
 *   }
 * });
 * ```
 */
export async function generateInvoicePdfFromTemplate(
  options: InvoicePdfGenerationOptions
): Promise<ApiTemplateResponse> {
  const {
    apiKey,
    templateCode,
    invoiceData,
    paperSize = "A4",
    orientation = "portrait",
  } = options;

  // Get template from registry
  const template = INVOICE_TEMPLATE_REGISTRY[templateCode];
  if (!template) {
    return {
      status: "error",
      error: "TEMPLATE_NOT_FOUND",
      message: `Invoice template '${templateCode}' not found in registry. Available templates: ${Object.keys(INVOICE_TEMPLATE_REGISTRY).join(", ")}`,
    };
  }

  // Ensure highlight_color defaults
  const templateDataWithDefaults = {
    ...invoiceData,
    highlight_color: invoiceData.highlight_color || "#6B46C1",
  };

  // Prepare API request
  const requestBody = {
    body: template.html,
    css: template.css,
    data: templateDataWithDefaults,
    settings: {
      paper_size: paperSize,
      orientation: orientation === "portrait" ? "1" : "2",
      margin_top: options.marginTop || "15mm",
      margin_bottom: options.marginBottom || "15mm",
      margin_left: options.marginLeft || "15mm",
      margin_right: options.marginRight || "15mm",
    },
  };

  try {
    console.log(`📤 API Template.io: Generating invoice PDF for template ${templateCode}`);

    const response = await fetch(`${API_TEMPLATE_BASE_URL}/v2/create-pdf-from-html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Template.io error: ${response.status} ${response.statusText}`, errorText);
      return {
        status: "error",
        error: "API_REQUEST_FAILED",
        message: `API Template.io request failed: ${response.status} ${errorText}`,
      };
    }

    const result = (await response.json()) as ApiTemplateResponse;

    if (result.status === "success") {
      console.log(`✅ Invoice PDF generated successfully. Transaction: ${result.transaction_ref}`);
      console.log(`🔗 Download URL: ${result.download_url}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Network error generating invoice PDF:`, error);
    return {
      status: "error",
      error: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get available invoice template codes
 */
export function getAvailableInvoiceTemplateCodes(): string[] {
  return Object.keys(INVOICE_TEMPLATE_REGISTRY);
}

/**
 * Check if an invoice template code exists
 */
export function isValidInvoiceTemplateCode(code: string): boolean {
  return code in INVOICE_TEMPLATE_REGISTRY;
}
