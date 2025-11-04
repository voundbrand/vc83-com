/**
 * PDF Generation using API Template.io
 *
 * This module provides functions to generate PDFs from HTML/CSS templates
 * using the API Template.io /v2/create-pdf-from-html endpoint.
 */

import { getTemplateByCode } from "../pdfTemplateRegistry";

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
 * PDF Generation Options
 */
export interface PdfGenerationOptions {
  apiKey: string;
  templateCode: string;
  data: Record<string, unknown>;
  paperSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

/**
 * Generate PDF from HTML template using API Template.io
 *
 * @example
 * ```typescript
 * const pdfUrl = await generatePdfFromTemplate({
 *   apiKey: process.env.API_TEMPLATE_IO_KEY!,
 *   templateCode: "invoice_b2b_consolidated_v1",
 *   data: {
 *     logo_url: "https://cdn.example.com/logo.png",
 *     highlight_color: "#6B46C1",
 *     organization_name: "Medical Education Institute",
 *     invoice_number: "INV-2025-001234",
 *     invoice_date: "January 15, 2025",
 *     due_date: "February 14, 2025",
 *     items: [
 *       { description: "Conference Registration", quantity: 10, rate: 299, amount: 2990 }
 *     ],
 *     subtotal: 2990,
 *     tax_rate: 8.0,
 *     tax: 239.20,
 *     total: 3229.20,
 *   }
 * });
 * ```
 */
export async function generatePdfFromTemplate(
  options: PdfGenerationOptions
): Promise<ApiTemplateResponse> {
  const { apiKey, templateCode, data, paperSize = "A4", orientation = "portrait" } = options;

  // Get template from registry
  const template = getTemplateByCode(templateCode);
  if (!template) {
    return {
      status: "error",
      error: "TEMPLATE_NOT_FOUND",
      message: `Template '${templateCode}' not found in registry`,
    };
  }

  // Prepare API request
  const requestBody = {
    body: template.template.html,
    css: template.template.css,
    data: data,
    settings: {
      paper_size: paperSize,
      orientation: orientation === "portrait" ? "1" : "2",
      margin_top: options.marginTop || "20mm",
      margin_bottom: options.marginBottom || "20mm",
      margin_left: options.marginLeft || "20mm",
      margin_right: options.marginRight || "20mm",
    },
  };

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
      return {
        status: "error",
        error: "API_REQUEST_FAILED",
        message: `API Template.io request failed: ${response.status} ${errorText}`,
      };
    }

    const result = (await response.json()) as ApiTemplateResponse;
    return result;
  } catch (error) {
    return {
      status: "error",
      error: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate Invoice PDF
 *
 * Helper function specifically for invoice generation
 */
export async function generateInvoicePdf(params: {
  apiKey: string;
  templateCode: "invoice_b2b_consolidated_v1" | "invoice_b2c_receipt_v1";
  organizationSettings: {
    logo_url?: string;
    highlight_color?: string;
    organization_name: string;
    organization_address: string;
    organization_phone: string;
    organization_email: string;
  };
  invoiceData: {
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    bill_to: {
      company_name: string;
      address: string;
      city: string;
      state: string;
      zip_code: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    subtotal: number;
    tax_rate?: number;
    tax?: number;
    total: number;
  };
}): Promise<ApiTemplateResponse> {
  const { apiKey, templateCode, organizationSettings, invoiceData } = params;

  // Merge organization settings with invoice data
  const templateData = {
    // Organization settings (configurable per org)
    logo_url: organizationSettings.logo_url,
    highlight_color: organizationSettings.highlight_color || "#6B46C1",
    organization_name: organizationSettings.organization_name,
    organization_address: organizationSettings.organization_address,
    organization_phone: organizationSettings.organization_phone,
    organization_email: organizationSettings.organization_email,

    // Invoice-specific data
    ...invoiceData,
  };

  return generatePdfFromTemplate({
    apiKey,
    templateCode,
    data: templateData,
  });
}

/**
 * Generate Ticket PDF
 *
 * Helper function specifically for ticket generation
 */
export async function generateTicketPdf(params: {
  apiKey: string;
  templateCode: "ticket_professional_v1" | "ticket_retro_v1";
  organizationSettings: {
    logo_url?: string;
    highlight_color?: string;
    organization_name: string;
  };
  ticketData: {
    ticket_number: string;
    ticket_type?: string;
    attendee_name: string;
    attendee_email?: string;
    event_name: string;
    event_date: string;
    event_time: string;
    event_location: string;
    event_address: string;
    qr_code_data: string;
  };
}): Promise<ApiTemplateResponse> {
  const { apiKey, templateCode, organizationSettings, ticketData } = params;

  // Merge organization settings with ticket data
  const templateData = {
    // Organization settings (configurable per org)
    logo_url: organizationSettings.logo_url,
    highlight_color: organizationSettings.highlight_color || "#6B46C1",
    organization_name: organizationSettings.organization_name,

    // Ticket-specific data
    ...ticketData,
  };

  return generatePdfFromTemplate({
    apiKey,
    templateCode,
    data: templateData,
  });
}
