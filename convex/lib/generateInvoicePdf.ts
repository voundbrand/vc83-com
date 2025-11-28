/**
 * Invoice PDF Generation using API Template.io
 *
 * This module provides functions to generate invoice PDFs using API Template.io.
 *
 * SUPPORTS TWO MODES:
 * 1. Dashboard Templates (Recommended): Uses template IDs from API Template.io dashboard
 *    - Template ID stored in database: template.customProperties.apiTemplateDashboardId
 *    - Uses /v2/create-pdf-url endpoint
 *    - Beautiful pre-designed templates from dashboard
 *
 * 2. HTML/CSS Templates (Fallback): Uses HTML/CSS stored in code
 *    - Uses /v2/create-pdf-from-html endpoint
 *    - Templates stored in convex/lib/pdf_templates/
 *
 * Integrates with the B2B invoicing system and invoice template registry.
 */

import {
  INVOICE_TEMPLATES,
  getInvoiceTemplateByCode,
} from "../pdfTemplateRegistry";

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
 * Invoice PDF Generation Options
 */
export interface InvoicePdfGenerationOptions {
  apiKey: string;
  templateCode: string;
  filename?: string; // Optional custom filename (without .pdf extension)
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

    // Line items (supports both raw cents and pre-formatted strings)
    items: Array<{
      description: string;
      quantity: number;
      // New approach: pre-formatted strings (recommended)
      unit_price_formatted?: string;
      tax_amount_formatted?: string;
      total_price_formatted?: string;
      // Legacy: raw cents (deprecated, for backward compatibility)
      unit_price?: number;
      tax_amount?: number;
      total_price?: number;
      tax_rate: number; // percentage (e.g., 19 for 19%)
    }>;

    // Totals (supports both raw cents and pre-formatted strings)
    // New approach: pre-formatted strings (recommended)
    subtotal_formatted?: string;
    tax_formatted?: string;
    total_formatted?: string;
    // Legacy: raw cents (deprecated, for backward compatibility)
    subtotal?: number;
    tax?: number;
    total?: number;
    tax_rate?: number;
    currency_symbol?: string;

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
 * Generate Invoice PDF using API Template.io
 *
 * Automatically chooses between:
 * 1. Dashboard template (if apiTemplateDashboardId is set in template) - RECOMMENDED
 * 2. HTML/CSS template (fallback)
 *
 * @param options.dashboardTemplateId - Optional: Dashboard template ID from resolved template
 *
 * @example
 * ```typescript
 * const pdfUrl = await generateInvoicePdfFromTemplate({
 *   apiKey: process.env.API_TEMPLATE_IO_KEY!,
 *   templateCode: "invoice_b2b_single_v1",
 *   dashboardTemplateId: "abc123def456", // From template.customProperties.apiTemplateDashboardId
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
 *         unit_price_formatted: "$299.00",
 *         tax_amount_formatted: "$57.00",
 *         total_price_formatted: "$356.00",
 *         tax_rate: 19,
 *       },
 *     ],
 *     subtotal_formatted: "$2,990.00",
 *     tax_formatted: "$570.00",
 *     total_formatted: "$3,560.00",
 *     tax_rate: 19,
 *     highlight_color: "#6B46C1",
 *   }
 * });
 * ```
 */
export async function generateInvoicePdfFromTemplate(
  options: InvoicePdfGenerationOptions & { dashboardTemplateId?: string }
): Promise<ApiTemplateResponse> {
  const {
    apiKey,
    templateCode,
    dashboardTemplateId,
    invoiceData,
    filename,
    paperSize = "A4",
    orientation = "portrait",
  } = options;

  // Check if we should use dashboard template (from database field)
  if (dashboardTemplateId && dashboardTemplateId.length > 0) {
    // MODE 1: Use dashboard template (RECOMMENDED)
    console.log(`📤 API Template.io: Using DASHBOARD template ${dashboardTemplateId} for ${templateCode}`);
    return await generateInvoicePdfFromDashboard(apiKey, dashboardTemplateId, invoiceData, {
      paperSize,
      orientation,
      filename,
      marginTop: options.marginTop,
      marginBottom: options.marginBottom,
      marginLeft: options.marginLeft,
      marginRight: options.marginRight,
    });
  } else {
    // MODE 2: Use HTML/CSS template (FALLBACK)
    console.log(`📤 API Template.io: Using HTML/CSS template for ${templateCode} (no dashboard template ID in database)`);
    return await generateInvoicePdfFromHtml(options);
  }
}

/**
 * Generate Invoice PDF from Dashboard Template (Mode 1 - RECOMMENDED)
 */
async function generateInvoicePdfFromDashboard(
  apiKey: string,
  templateId: string,
  invoiceData: InvoicePdfGenerationOptions["invoiceData"],
  settings: {
    paperSize: string;
    orientation: string;
    filename?: string;
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  }
): Promise<ApiTemplateResponse> {
  try {
    const response = await fetch(`${API_TEMPLATE_BASE_URL}/v2/create-pdf-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: invoiceData,
        settings: {
          paper_size: settings.paperSize,
          orientation: settings.orientation === "portrait" ? "1" : "2",
          margin_top: settings.marginTop || "5mm",
          margin_bottom: settings.marginBottom || "5mm",
          margin_left: settings.marginLeft || "5mm",
          margin_right: settings.marginRight || "5mm",
          output_file: settings.filename, // Custom filename for PDF
        },
      }),
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
      console.log(`✅ Invoice PDF generated from DASHBOARD template. Transaction: ${result.transaction_ref}`);
      console.log(`🔗 Download URL: ${result.download_url}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Network error generating invoice PDF from dashboard:`, error);
    return {
      status: "error",
      error: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate Invoice PDF from HTML/CSS Template (Mode 2 - FALLBACK)
 */
async function generateInvoicePdfFromHtml(
  options: InvoicePdfGenerationOptions
): Promise<ApiTemplateResponse> {
  const {
    apiKey,
    templateCode,
    invoiceData,
    paperSize = "A4",
    orientation = "portrait",
  } = options;

  // Get template from centralized registry
  const template = getInvoiceTemplateByCode(templateCode);
  if (!template) {
    return {
      status: "error",
      error: "TEMPLATE_NOT_FOUND",
      message: `Invoice template '${templateCode}' not found in registry. Available templates: ${INVOICE_TEMPLATES.map(t => t.code).join(", ")}`,
    };
  }

  // Ensure highlight_color defaults
  const templateDataWithDefaults = {
    ...invoiceData,
    highlight_color: invoiceData.highlight_color || "#6B46C1",
  };

  // Prepare API request with HTML and CSS as SEPARATE fields (per API Template.io spec)
  // NOTE: The 'css' field should contain CSS wrapped in <style> tags according to API docs
  const requestBody = {
    body: template.template.html, // HTML (without CSS)
    css: `<style>${template.template.css}</style>`, // CSS wrapped in style tags!
    data: templateDataWithDefaults,
    settings: {
      paper_size: paperSize,
      orientation: orientation === "portrait" ? "1" : "2",
      margin_top: options.marginTop || "5mm",
      margin_bottom: options.marginBottom || "5mm",
      margin_left: options.marginLeft || "5mm",
      margin_right: options.marginRight || "5mm",
      print_background: true, // Enable background colors/gradients
      output_file: options.filename, // Custom filename for PDF
    },
  };

  // DEBUG: Minimal logging (can be expanded for troubleshooting)
  console.log("🔍 [generateInvoicePdfFromHtml] Request body keys:", Object.keys(requestBody));
  console.log("🔍 [generateInvoicePdfFromHtml] Has css field?", 'css' in requestBody);
  console.log("🔍 [generateInvoicePdfFromHtml] CSS preview:", requestBody.css?.substring(0, 150));

  try {
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
      console.log(`✅ Invoice PDF generated from HTML/CSS. Transaction: ${result.transaction_ref}`);
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
  return INVOICE_TEMPLATES.map(t => t.code);
}

/**
 * Check if an invoice template code exists
 */
export function isValidInvoiceTemplateCode(code: string): boolean {
  return getInvoiceTemplateByCode(code) !== null;
}
