/**
 * EMAIL TEMPLATE REGISTRY
 *
 * Maps template codes (stored in database) to React components (stored in code).
 * Follows the same pattern as checkout, web, and form templates.
 */

import { EmailTemplateComponent, EmailTemplateMetadata } from "./types";

// Import templates
import { LuxuryConfirmationTemplate } from "./luxury-confirmation";
import { ModernMinimalTemplate } from "./modern-minimal";
import { VIPExclusiveTemplate } from "./vip-exclusive";
import { SalesNotificationTemplate } from "./sales-notification";

/**
 * EMAIL TEMPLATE REGISTRY
 *
 * Maps template codes to email generation functions.
 */
export const emailTemplateRegistry: Record<string, EmailTemplateComponent> = {
  "luxury-confirmation": LuxuryConfirmationTemplate,
  "modern-minimal": ModernMinimalTemplate,
  "vip-exclusive": VIPExclusiveTemplate,
  "sales-notification": SalesNotificationTemplate,
  // Add more templates as you create them:
  // "festival-bright": FestivalBrightTemplate,
  // "corporate-formal": CorporateFormalTemplate,
};

/**
 * Get Email Template by Code
 *
 * Returns the template function for a given code.
 * Falls back to luxury-confirmation if template not found.
 */
export function getEmailTemplate(templateCode: string): EmailTemplateComponent {
  const template = emailTemplateRegistry[templateCode];

  if (!template) {
    console.warn(
      `Email template "${templateCode}" not found in registry. Falling back to luxury-confirmation.`
    );
    return emailTemplateRegistry["luxury-confirmation"];
  }

  return template;
}

/**
 * Get All Email Template Codes
 */
export function getAllEmailTemplateCodes(): string[] {
  return Object.keys(emailTemplateRegistry);
}

/**
 * Check if Email Template Exists
 */
export function emailTemplateExists(templateCode: string): boolean {
  return templateCode in emailTemplateRegistry;
}

/**
 * Email Template Metadata
 *
 * Information about available templates for UI display.
 */
export const emailTemplateMetadata: Record<string, EmailTemplateMetadata> = {
  "luxury-confirmation": {
    code: "luxury-confirmation",
    name: "Luxury Event Confirmation",
    description: "Elegant gold & dark theme for upscale events. Perfect for exclusive gatherings, cigar lounges, and premium experiences.",
    category: "luxury",
    previewImageUrl: "/templates/emails/luxury-preview.jpg",
    supportedLanguages: ["de", "en", "es", "fr"],
    supportsAttachments: true,
    author: "L4YERCAK3 Design Team",
    version: "1.0.0",
  },
  "modern-minimal": {
    code: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean, minimalist design with modern typography. Ideal for tech events, conferences, and contemporary brands.",
    category: "minimal",
    previewImageUrl: "/templates/emails/modern-preview.jpg",
    supportedLanguages: ["de", "en", "es", "fr"],
    supportsAttachments: true,
    author: "L4YERCAK3 Design Team",
    version: "1.0.0",
  },
  "vip-exclusive": {
    code: "vip-exclusive",
    name: "VIP Exclusive",
    description: "Premium black and gold design for VIP tickets. Features exclusive messaging and elevated styling.",
    category: "luxury",
    previewImageUrl: "/templates/emails/vip-preview.jpg",
    supportedLanguages: ["de", "en", "es", "fr"],
    supportsAttachments: true,
    author: "L4YERCAK3 Design Team",
    version: "1.0.0",
  },
  "sales-notification": {
    code: "sales-notification",
    name: "Sales Team Notification",
    description: "Internal notification sent to sales team when new tickets/reservations are created. Clean, actionable design with quick contact buttons.",
    category: "internal",
    previewImageUrl: "/templates/emails/sales-notification-preview.jpg",
    supportedLanguages: ["de", "en", "es", "fr"],
    supportsAttachments: true,
    author: "L4YERCAK3 Design Team",
    version: "1.0.0",
  },
};

/**
 * Get Email Template Metadata
 *
 * Returns metadata for a specific template.
 */
export function getEmailTemplateMetadata(templateCode: string): EmailTemplateMetadata | null {
  return emailTemplateMetadata[templateCode] || null;
}

/**
 * Get All Email Template Metadata
 *
 * Returns metadata for all templates (for UI pickers).
 */
export function getAllEmailTemplateMetadata(): EmailTemplateMetadata[] {
  return Object.values(emailTemplateMetadata);
}
