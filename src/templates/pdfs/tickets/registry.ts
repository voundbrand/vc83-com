/**
 * PDF TICKET TEMPLATE REGISTRY
 *
 * Maps template codes (stored in database) to PDF generation functions (in code).
 * Follows the same pattern as email templates.
 */

import {
  PdfTicketTemplateFunction,
  PdfTicketTemplateMetadata,
} from "./types";

// Import templates
import { ElegantGoldTemplate } from "./elegant-gold";
import { ModernTicketTemplate } from "./modern-ticket";
import { VIPPremiumTemplate } from "./vip-premium";

/**
 * PDF TICKET TEMPLATE REGISTRY
 *
 * Maps template codes to PDF generation functions.
 */
export const pdfTicketTemplateRegistry: Record<string, PdfTicketTemplateFunction> = {
  "elegant-gold": ElegantGoldTemplate,
  "modern-ticket": ModernTicketTemplate,
  "vip-premium": VIPPremiumTemplate,
  // Add more templates as you create them:
  // "festival-vibrant": FestivalVibrantTemplate,
  // "minimal-clean": MinimalCleanTemplate,
};

/**
 * Get PDF Ticket Template by Code
 *
 * Returns the template function for a given code.
 * Falls back to elegant-gold if template not found.
 */
export function getPdfTicketTemplate(templateCode: string): PdfTicketTemplateFunction {
  const template = pdfTicketTemplateRegistry[templateCode];

  if (!template) {
    console.warn(
      `PDF ticket template "${templateCode}" not found in registry. Falling back to elegant-gold.`
    );
    return pdfTicketTemplateRegistry["elegant-gold"];
  }

  return template;
}

/**
 * Get All PDF Ticket Template Codes
 */
export function getAllPdfTicketTemplateCodes(): string[] {
  return Object.keys(pdfTicketTemplateRegistry);
}

/**
 * Check if PDF Ticket Template Exists
 */
export function pdfTicketTemplateExists(templateCode: string): boolean {
  return templateCode in pdfTicketTemplateRegistry;
}

/**
 * PDF Ticket Template Metadata
 *
 * Information about available templates for UI display.
 */
export const pdfTicketTemplateMetadata: Record<string, PdfTicketTemplateMetadata> = {
  "elegant-gold": {
    code: "elegant-gold",
    name: "Elegant Gold",
    description: "Elegant black and gold design for upscale events. Perfect for exclusive gatherings, galas, and premium experiences.",
    category: "elegant",
    previewImageUrl: "/templates/pdfs/elegant-gold-preview.jpg",
    features: {
      qrCodePosition: "top-right",
      showBarcode: true,
      showSponsors: true,
      colorScheme: "gold",
    },
    author: "l4yercak3 Design Team",
    version: "1.0.0",
  },
  "modern-ticket": {
    code: "modern-ticket",
    name: "Modern Ticket",
    description: "Clean, contemporary design with bold typography. Ideal for tech events, conferences, and modern brands.",
    category: "modern",
    previewImageUrl: "/templates/pdfs/modern-ticket-preview.jpg",
    features: {
      qrCodePosition: "bottom-right",
      showBarcode: true,
      showSponsors: false,
      colorScheme: "light",
    },
    author: "l4yercak3 Design Team",
    version: "1.0.0",
  },
  "vip-premium": {
    code: "vip-premium",
    name: "VIP Premium",
    description: "Exclusive VIP design with premium styling and VIP badge. Features elevated aesthetics for VIP ticket holders.",
    category: "vip",
    previewImageUrl: "/templates/pdfs/vip-premium-preview.jpg",
    features: {
      qrCodePosition: "center",
      showBarcode: true,
      showSponsors: true,
      colorScheme: "dark",
    },
    author: "l4yercak3 Design Team",
    version: "1.0.0",
  },
};

/**
 * Get PDF Ticket Template Metadata
 *
 * Returns metadata for a specific template.
 */
export function getPdfTicketTemplateMetadata(
  templateCode: string
): PdfTicketTemplateMetadata | null {
  return pdfTicketTemplateMetadata[templateCode] || null;
}

/**
 * Get All PDF Ticket Template Metadata
 *
 * Returns metadata for all templates (for UI pickers).
 */
export function getAllPdfTicketTemplateMetadata(): PdfTicketTemplateMetadata[] {
  return Object.values(pdfTicketTemplateMetadata);
}
