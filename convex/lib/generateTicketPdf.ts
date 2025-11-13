/**
 * Ticket PDF Generation using API Template.io
 *
 * This module provides functions to generate ticket PDFs using API Template.io.
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
 * Integrates with the new ticket template system and resolution chain.
 */

import {
  TICKET_TEMPLATES,
  getTicketTemplateByCode,
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
 * Ticket PDF Generation Options
 */
export interface TicketPdfGenerationOptions {
  apiKey: string;
  templateCode: string;
  ticketData: {
    // Ticket info
    ticket_number?: string;
    ticket_type?: string;
    attendee_name: string;
    attendee_email?: string;
    guest_count?: number;

    // Event info
    event_name: string;
    event_date: string;
    event_time: string;
    event_location: string;
    event_address?: string;
    event_sponsors?: Array<{ name: string; level?: string }>;

    // QR code
    qr_code_data: string;

    // Organization/branding
    organization_name?: string;
    organization_email?: string;
    organization_phone?: string;
    organization_website?: string;
    logo_url?: string;
    highlight_color?: string;

    // Order info (optional)
    order_id?: string;
    order_date?: string;
    currency?: string;
    // Changed to numbers for Jinja2 template comparisons
    net_price?: number;
    tax_amount?: number;
    tax_rate?: number;
    total_price?: number;
  };
  paperSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

/**
 * Generate Ticket PDF using API Template.io
 *
 * Automatically chooses between:
 * 1. Dashboard template (if apiTemplateDashboardId is set in template) - RECOMMENDED
 * 2. HTML/CSS template (fallback)
 *
 * @param options.dashboardTemplateId - Optional: Dashboard template ID from resolved template
 *
 * @example
 * ```typescript
 * const pdfUrl = await generateTicketPdfFromTemplate({
 *   apiKey: process.env.API_TEMPLATE_IO_KEY!,
 *   templateCode: "ticket_elegant_gold_v1",
 *   dashboardTemplateId: "abc123def456", // From template.customProperties.apiTemplateDashboardId
 *   ticketData: {
 *     ticket_number: "TKT-2025-001234",
 *     ticket_type: "VIP Access",
 *     attendee_name: "Dr. John Doe",
 *     attendee_email: "john.doe@example.com",
 *     event_name: "Medical Conference 2025",
 *     event_date: "March 15, 2025",
 *     event_time: "9:00 AM - 5:00 PM",
 *     event_location: "Convention Center",
 *     event_address: "456 Event Plaza, City, State 12345",
 *     qr_code_data: "https://vc83.com/validate/TKT-2025-001234",
 *     highlight_color: "#d4af37",
 *   }
 * });
 * ```
 */
export async function generateTicketPdfFromTemplate(
  options: TicketPdfGenerationOptions & { dashboardTemplateId?: string }
): Promise<ApiTemplateResponse> {
  const {
    apiKey,
    templateCode,
    dashboardTemplateId,
    ticketData,
    paperSize = "A4",
    orientation = "portrait",
  } = options;

  // Check if we should use dashboard template (from database field)
  if (dashboardTemplateId && dashboardTemplateId.length > 0) {
    // MODE 1: Use dashboard template (RECOMMENDED)
    console.log(`📤 API Template.io: Using DASHBOARD template ${dashboardTemplateId} for ${templateCode}`);
    return await generateTicketPdfFromDashboard(apiKey, dashboardTemplateId, ticketData, {
      paperSize,
      orientation,
      marginTop: options.marginTop,
      marginBottom: options.marginBottom,
      marginLeft: options.marginLeft,
      marginRight: options.marginRight,
    });
  } else {
    // MODE 2: Use HTML/CSS template (FALLBACK)
    console.log(`📤 API Template.io: Using HTML/CSS template for ${templateCode} (no dashboard template ID in database)`);
    return await generateTicketPdfFromHtml(options);
  }
}

/**
 * Generate Ticket PDF from Dashboard Template (Mode 1 - RECOMMENDED)
 */
async function generateTicketPdfFromDashboard(
  apiKey: string,
  templateId: string,
  ticketData: TicketPdfGenerationOptions["ticketData"],
  settings: {
    paperSize: string;
    orientation: string;
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
        data: ticketData,
        settings: {
          paper_size: settings.paperSize,
          orientation: settings.orientation === "portrait" ? "1" : "2",
          margin_top: settings.marginTop || "5mm",
          margin_bottom: settings.marginBottom || "5mm",
          margin_left: settings.marginLeft || "5mm",
          margin_right: settings.marginRight || "5mm",
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
      console.log(`✅ Ticket PDF generated from DASHBOARD template. Transaction: ${result.transaction_ref}`);
      console.log(`🔗 Download URL: ${result.download_url}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Network error generating ticket PDF from dashboard:`, error);
    return {
      status: "error",
      error: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate Ticket PDF from HTML/CSS Template (Mode 2 - FALLBACK)
 */
async function generateTicketPdfFromHtml(
  options: TicketPdfGenerationOptions
): Promise<ApiTemplateResponse> {
  const {
    apiKey,
    templateCode,
    ticketData,
    paperSize = "A4",
    orientation = "portrait",
  } = options;

  // Get template from centralized registry
  const template = getTicketTemplateByCode(templateCode);
  if (!template) {
    return {
      status: "error",
      error: "TEMPLATE_NOT_FOUND",
      message: `Ticket template '${templateCode}' not found in registry. Available templates: ${TICKET_TEMPLATES.map(t => t.code).join(", ")}`,
    };
  }

  // Ensure highlight_color defaults
  const templateDataWithDefaults = {
    ...ticketData,
    highlight_color: ticketData.highlight_color || "#6B46C1",
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
      console.error(`❌ API Template.io error: ${response.status} ${response.statusText}`, errorText);
      return {
        status: "error",
        error: "API_REQUEST_FAILED",
        message: `API Template.io request failed: ${response.status} ${errorText}`,
      };
    }

    const result = (await response.json()) as ApiTemplateResponse;

    if (result.status === "success") {
      console.log(`✅ Ticket PDF generated from HTML/CSS. Transaction: ${result.transaction_ref}`);
      console.log(`🔗 Download URL: ${result.download_url}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Network error generating ticket PDF:`, error);
    return {
      status: "error",
      error: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get available ticket template codes
 */
export function getAvailableTicketTemplateCodes(): string[] {
  return TICKET_TEMPLATES.map(t => t.code);
}

/**
 * Check if a ticket template code exists
 */
export function isValidTicketTemplateCode(code: string): boolean {
  return getTicketTemplateByCode(code) !== null;
}
