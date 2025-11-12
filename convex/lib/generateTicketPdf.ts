/**
 * Ticket PDF Generation using API Template.io
 *
 * This module provides functions to generate ticket PDFs from HTML/CSS templates
 * using the API Template.io /v2/create-pdf-from-html endpoint.
 *
 * Integrates with the new ticket template system and resolution chain.
 */

import {
  ELEGANT_GOLD_TICKET_TEMPLATE_HTML,
  ELEGANT_GOLD_TICKET_TEMPLATE_CSS,
} from "./pdf_templates/elegant_gold_ticket_template";
import {
  MODERN_TICKET_TEMPLATE_HTML,
  MODERN_TICKET_TEMPLATE_CSS,
} from "./pdf_templates/modern_ticket_template";
import {
  VIP_PREMIUM_TICKET_TEMPLATE_HTML,
  VIP_PREMIUM_TICKET_TEMPLATE_CSS,
} from "./pdf_templates/vip_premium_ticket_template";

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
 * Template registry for ticket templates
 */
interface TicketTemplateDefinition {
  html: string;
  css: string;
}

const TICKET_TEMPLATE_REGISTRY: Record<string, TicketTemplateDefinition> = {
  "elegant-gold": {
    html: ELEGANT_GOLD_TICKET_TEMPLATE_HTML,
    css: ELEGANT_GOLD_TICKET_TEMPLATE_CSS,
  },
  "modern-ticket": {
    html: MODERN_TICKET_TEMPLATE_HTML,
    css: MODERN_TICKET_TEMPLATE_CSS,
  },
  "vip-premium": {
    html: VIP_PREMIUM_TICKET_TEMPLATE_HTML,
    css: VIP_PREMIUM_TICKET_TEMPLATE_CSS,
  },
};

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
    net_price?: string;
    tax_amount?: string;
    tax_rate?: string;
    total_price?: string;
  };
  paperSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

/**
 * Generate Ticket PDF from HTML template using API Template.io
 *
 * @example
 * ```typescript
 * const pdfUrl = await generateTicketPdfFromTemplate({
 *   apiKey: process.env.API_TEMPLATE_IO_KEY!,
 *   templateCode: "elegant-gold",
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
  options: TicketPdfGenerationOptions
): Promise<ApiTemplateResponse> {
  const {
    apiKey,
    templateCode,
    ticketData,
    paperSize = "A4",
    orientation = "portrait",
  } = options;

  // Get template from registry
  const template = TICKET_TEMPLATE_REGISTRY[templateCode];
  if (!template) {
    return {
      status: "error",
      error: "TEMPLATE_NOT_FOUND",
      message: `Ticket template '${templateCode}' not found in registry. Available templates: ${Object.keys(TICKET_TEMPLATE_REGISTRY).join(", ")}`,
    };
  }

  // Ensure highlight_color defaults
  const templateDataWithDefaults = {
    ...ticketData,
    highlight_color: ticketData.highlight_color || "#6B46C1",
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
    console.log(`📤 API Template.io: Generating ticket PDF for template ${templateCode}`);

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
      console.log(`✅ Ticket PDF generated successfully. Transaction: ${result.transaction_ref}`);
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
  return Object.keys(TICKET_TEMPLATE_REGISTRY);
}

/**
 * Check if a ticket template code exists
 */
export function isValidTicketTemplateCode(code: string): boolean {
  return code in TICKET_TEMPLATE_REGISTRY;
}
