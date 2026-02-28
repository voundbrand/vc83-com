/**
 * EMAIL TEMPLATE REGISTRY
 *
 * Central registry of all email templates for dynamic selection and AI integration.
 * All templates use modular sections and support 4 languages (EN, DE, ES, FR).
 *
 * Version: 1.0.0 - Professional System Default
 */

import type { EmailTemplateComponent, EmailTemplateOutput } from "./types";
import type { GenericEmailMetadata } from "./generic-types";

// Import all template components
import { TransactionEmailTemplate, TRANSACTION_EMAIL_METADATA } from "./transaction/index";
import { AccountEmailTemplate, ACCOUNT_EMAIL_METADATA } from "./account/index";
import { ShippingEmailTemplate, SHIPPING_EMAIL_METADATA } from "./shipping/index";
import { NewsletterEmailTemplate, NEWSLETTER_EMAIL_METADATA } from "./newsletter/index";
import { LeadMagnetEmailTemplate, LEAD_MAGNET_EMAIL_METADATA } from "./lead-magnet/index";
import { EventInvitationEmailTemplate, EVENT_INVITATION_EMAIL_METADATA } from "./event-invitation/index";
import { EventConfirmationEmailTemplate, EVENT_CONFIRMATION_EMAIL_METADATA } from "./event-confirmation/index";
import { EventReminderEmailTemplate, EVENT_REMINDER_EMAIL_METADATA } from "./event-reminder/index";
import { EventFollowupEmailTemplate, EVENT_FOLLOWUP_EMAIL_METADATA } from "./event-followup/index";
import { SupportResponseEmailTemplate, SUPPORT_RESPONSE_EMAIL_METADATA } from "./support-response/index";
import { StatusUpdateEmailTemplate, STATUS_UPDATE_EMAIL_METADATA } from "./status-update/index";
import { InvoiceB2BEmailTemplate, INVOICE_B2B_EMAIL_METADATA } from "./invoice-b2b/index";
import { InvoiceB2CEmailTemplate, INVOICE_B2C_EMAIL_METADATA } from "./invoice-b2c/index";
import { ReceiptEmailTemplate, RECEIPT_EMAIL_METADATA } from "./receipt/index";
import { SalesNotificationTemplate, SALES_NOTIFICATION_EMAIL_METADATA } from "./sales-notification/index";
import { LuxuryConfirmationTemplate } from "./luxury-confirmation/index";
import { ModernMinimalTemplate } from "./modern-minimal/index";
import { VIPExclusiveTemplate } from "./vip-exclusive/index";

/**
 * Email Template Registry Entry
 */
export interface EmailTemplateRegistryEntry {
  code: string;
  component: EmailTemplateComponent;
  metadata: GenericEmailMetadata;
  catalogPolicy: EmailTemplateCatalogPolicy;
}

export type EmailTemplateCatalogPolicy = "core" | "compatibility";

const COMPATIBILITY_ARCHIVED_EMAIL_TEMPLATE_CODES = new Set([
  "email_newsletter",
  "email_lead_magnet_delivery",
  "email_support_response",
  "email_status_update",
]);

/**
 * Email Template Registry
 *
 * All 14 email templates indexed by code for dynamic lookup.
 */
const EMAIL_TEMPLATE_REGISTRY_RAW: Record<string, Omit<EmailTemplateRegistryEntry, "catalogPolicy">> = {
  // Transactional (6)
  email_transaction_generic: {
    code: "email_transaction_generic",
    component: TransactionEmailTemplate,
    metadata: TRANSACTION_EMAIL_METADATA,
  },
  email_account_management: {
    code: "email_account_management",
    component: AccountEmailTemplate,
    metadata: ACCOUNT_EMAIL_METADATA,
  },
  email_shipping_delivery: {
    code: "email_shipping_delivery",
    component: ShippingEmailTemplate,
    metadata: SHIPPING_EMAIL_METADATA,
  },
  email_invoice_b2b: {
    code: "email_invoice_b2b",
    component: InvoiceB2BEmailTemplate as unknown as EmailTemplateComponent,
    metadata: INVOICE_B2B_EMAIL_METADATA,
  },
  "invoice-email-v2": {
    code: "invoice-email-v2",
    component: InvoiceB2BEmailTemplate as unknown as EmailTemplateComponent,
    metadata: {
      ...INVOICE_B2B_EMAIL_METADATA,
      code: "invoice-email-v2",
      name: "Invoice Email v2",
      description: "Schema-based compatibility alias for invoice transactional email rendering",
    },
  },
  email_invoice_send: {
    code: "email_invoice_send",
    component: InvoiceB2BEmailTemplate as unknown as EmailTemplateComponent,
    metadata: {
      ...INVOICE_B2B_EMAIL_METADATA,
      code: "email_invoice_send",
      name: "Invoice Email Send",
      description: "Legacy compatibility alias for invoice transactional email rendering",
    },
  },
  email_invoice_b2c: {
    code: "email_invoice_b2c",
    component: InvoiceB2CEmailTemplate as unknown as EmailTemplateComponent,
    metadata: INVOICE_B2C_EMAIL_METADATA,
  },
  email_receipt: {
    code: "email_receipt",
    component: ReceiptEmailTemplate as EmailTemplateComponent,
    metadata: RECEIPT_EMAIL_METADATA,
  },

  // Marketing/Engagement (3)
  email_newsletter: {
    code: "email_newsletter",
    component: NewsletterEmailTemplate,
    metadata: NEWSLETTER_EMAIL_METADATA,
  },
  email_lead_magnet_delivery: {
    code: "email_lead_magnet_delivery",
    component: LeadMagnetEmailTemplate,
    metadata: LEAD_MAGNET_EMAIL_METADATA,
  },
  email_event_invitation: {
    code: "email_event_invitation",
    component: EventInvitationEmailTemplate,
    metadata: EVENT_INVITATION_EMAIL_METADATA,
  },

  // Event-Specific (3)
  email_event_confirmation: {
    code: "email_event_confirmation",
    component: EventConfirmationEmailTemplate,
    metadata: EVENT_CONFIRMATION_EMAIL_METADATA,
  },
  "event-confirmation-v2": {
    code: "event-confirmation-v2",
    component: EventConfirmationEmailTemplate,
    metadata: {
      ...EVENT_CONFIRMATION_EMAIL_METADATA,
      code: "event-confirmation-v2",
      name: "Event Confirmation v2",
      description: "Schema-based compatibility alias for event confirmation rendering",
    },
  },
  email_event_reminder: {
    code: "email_event_reminder",
    component: EventReminderEmailTemplate,
    metadata: EVENT_REMINDER_EMAIL_METADATA,
  },
  email_event_followup: {
    code: "email_event_followup",
    component: EventFollowupEmailTemplate,
    metadata: EVENT_FOLLOWUP_EMAIL_METADATA,
  },

  // Customer Service (2)
  email_support_response: {
    code: "email_support_response",
    component: SupportResponseEmailTemplate,
    metadata: SUPPORT_RESPONSE_EMAIL_METADATA,
  },
  email_status_update: {
    code: "email_status_update",
    component: StatusUpdateEmailTemplate,
    metadata: STATUS_UPDATE_EMAIL_METADATA,
  },

  // System/Internal (1)
  email_sales_notification: {
    code: "email_sales_notification",
    component: SalesNotificationTemplate as unknown as EmailTemplateComponent,
    metadata: SALES_NOTIFICATION_EMAIL_METADATA,
  },

  // Premium Templates (3) - Luxury ticket confirmation templates
  "luxury-confirmation": {
    code: "luxury-confirmation",
    component: LuxuryConfirmationTemplate,
    metadata: {
      code: "luxury-confirmation",
      name: "Luxury Confirmation",
      description: "Elegant gold & dark theme for upscale event confirmations",
      category: "event",
      suggestedSections: ["hero", "eventDetails", "attachmentInfo", "cta"],
      previewImageUrl: "/templates/luxury-confirmation-preview.png",
      supportedLanguages: ["en", "de", "es", "fr"],
      author: "l4yercak3",
      version: "1.0.0",
    },
  },
  "modern-minimal": {
    code: "modern-minimal",
    component: ModernMinimalTemplate,
    metadata: {
      code: "modern-minimal",
      name: "Modern Minimal",
      description: "Clean, minimal design for modern event confirmations",
      category: "event",
      suggestedSections: ["hero", "eventDetails", "attachmentInfo", "cta"],
      previewImageUrl: "/templates/modern-minimal-preview.png",
      supportedLanguages: ["en", "de", "es", "fr"],
      author: "l4yercak3",
      version: "1.0.0",
    },
  },
  "vip-exclusive": {
    code: "vip-exclusive",
    component: VIPExclusiveTemplate,
    metadata: {
      code: "vip-exclusive",
      name: "VIP Exclusive",
      description: "Premium VIP design for exclusive event confirmations",
      category: "event",
      suggestedSections: ["hero", "eventDetails", "attachmentInfo", "cta"],
      previewImageUrl: "/templates/vip-exclusive-preview.png",
      supportedLanguages: ["en", "de", "es", "fr"],
      author: "l4yercak3",
      version: "1.0.0",
    },
  },
};

export const EMAIL_TEMPLATE_REGISTRY: Record<string, EmailTemplateRegistryEntry> = Object.fromEntries(
  Object.entries(EMAIL_TEMPLATE_REGISTRY_RAW).map(([code, entry]) => [
    code,
    {
      ...entry,
      catalogPolicy: COMPATIBILITY_ARCHIVED_EMAIL_TEMPLATE_CODES.has(code) ? "compatibility" : "core",
    },
  ])
) as Record<string, EmailTemplateRegistryEntry>;

/**
 * Helper Functions
 */

function isCatalogPolicyMatch(
  entry: EmailTemplateRegistryEntry,
  options?: {
    includeCompatibility?: boolean;
  }
): boolean {
  return options?.includeCompatibility === true || entry.catalogPolicy === "core";
}

/**
 * Get email template by code
 */
export function getEmailTemplateByCode(code: string): EmailTemplateRegistryEntry | undefined {
  return EMAIL_TEMPLATE_REGISTRY[code];
}

export function getEmailTemplateCatalogPolicy(code: string): EmailTemplateCatalogPolicy | null {
  const entry = getEmailTemplateByCode(code);
  return entry ? entry.catalogPolicy : null;
}

export function isCompatibilityArchivedEmailTemplateCode(code: string): boolean {
  return getEmailTemplateCatalogPolicy(code) === "compatibility";
}

/**
 * Get all email templates by category
 */
export function getEmailTemplatesByCategory(
  category: "transactional" | "marketing" | "event" | "support" | "system" | "newsletter",
  options?: {
    includeCompatibility?: boolean;
  }
): EmailTemplateRegistryEntry[] {
  return Object.values(EMAIL_TEMPLATE_REGISTRY).filter(
    (entry) => entry.metadata.category === category && isCatalogPolicyMatch(entry, options)
  );
}

/**
 * Get all email template codes
 */
export function getAllEmailTemplateCodes(options?: {
  includeCompatibility?: boolean;
}): string[] {
  return getAllEmailTemplates(options).map((entry) => entry.code);
}

/**
 * Get all email templates
 */
export function getAllEmailTemplates(options?: {
  includeCompatibility?: boolean;
}): EmailTemplateRegistryEntry[] {
  return Object.values(EMAIL_TEMPLATE_REGISTRY).filter((entry) => isCatalogPolicyMatch(entry, options));
}

/**
 * Check if template code exists
 */
export function emailTemplateExists(code: string): boolean {
  return code in EMAIL_TEMPLATE_REGISTRY;
}

/**
 * Template Subsets for Easy Access
 */

/**
 * Transactional Email Templates
 */
export const TRANSACTIONAL_EMAIL_TEMPLATES = [
  EMAIL_TEMPLATE_REGISTRY.email_transaction_generic,
  EMAIL_TEMPLATE_REGISTRY.email_account_management,
  EMAIL_TEMPLATE_REGISTRY.email_shipping_delivery,
  EMAIL_TEMPLATE_REGISTRY.email_invoice_b2b,
  EMAIL_TEMPLATE_REGISTRY.email_invoice_b2c,
  EMAIL_TEMPLATE_REGISTRY.email_receipt,
];

/**
 * Marketing Email Templates
 */
export const MARKETING_EMAIL_TEMPLATES = [
  EMAIL_TEMPLATE_REGISTRY.email_newsletter,
  EMAIL_TEMPLATE_REGISTRY.email_lead_magnet_delivery,
  EMAIL_TEMPLATE_REGISTRY.email_event_invitation,
].filter((entry) => entry.catalogPolicy === "core");

/**
 * Event Email Templates
 */
export const EVENT_EMAIL_TEMPLATES = [
  EMAIL_TEMPLATE_REGISTRY.email_event_confirmation,
  EMAIL_TEMPLATE_REGISTRY.email_event_reminder,
  EMAIL_TEMPLATE_REGISTRY.email_event_followup,
];

/**
 * Support Email Templates
 */
export const SUPPORT_EMAIL_TEMPLATES = [
  EMAIL_TEMPLATE_REGISTRY.email_support_response,
  EMAIL_TEMPLATE_REGISTRY.email_status_update,
].filter((entry) => entry.catalogPolicy === "core");

/**
 * System/Internal Email Templates
 */
export const SYSTEM_EMAIL_TEMPLATES = [
  EMAIL_TEMPLATE_REGISTRY.email_sales_notification,
];

export const COMPATIBILITY_ARCHIVED_EMAIL_TEMPLATES = Object.values(EMAIL_TEMPLATE_REGISTRY).filter(
  (entry) => entry.catalogPolicy === "compatibility"
);

/**
 * Get suggested sections for a template
 *
 * Returns the section types that work best with a given template.
 * Useful for AI to know which sections to include.
 */
export function getSuggestedSectionsForTemplate(code: string): string[] {
  const template = getEmailTemplateByCode(code);
  if (!template) return [];
  return template.metadata.suggestedSections as string[];
}

/**
 * Find template by use case
 *
 * AI helper function to find appropriate template based on use case description.
 * Returns most relevant template codes.
 */
export function findTemplatesByUseCase(
  useCase: string,
  options?: {
    includeCompatibility?: boolean;
  }
): string[] {
  const lowerUseCase = useCase.toLowerCase();
  const includeCompatibility = options?.includeCompatibility === true;

  // Invoice-related
  if (
    lowerUseCase.includes("invoice") ||
    lowerUseCase.includes("bill") ||
    lowerUseCase.includes("billing")
  ) {
    if (lowerUseCase.includes("b2b") || lowerUseCase.includes("business")) {
      return ["email_invoice_b2b"];
    }
    if (lowerUseCase.includes("b2c") || lowerUseCase.includes("consumer")) {
      return ["email_invoice_b2c"];
    }
    return ["email_invoice_b2b", "email_invoice_b2c"];
  }

  // Receipt-related
  if (
    lowerUseCase.includes("receipt") ||
    lowerUseCase.includes("payment confirmation") ||
    lowerUseCase.includes("paid")
  ) {
    return ["email_receipt"];
  }

  // Transaction-related
  if (
    lowerUseCase.includes("order") ||
    lowerUseCase.includes("purchase") ||
    lowerUseCase.includes("payment") ||
    lowerUseCase.includes("transaction")
  ) {
    return ["email_transaction_generic"];
  }

  // Account-related
  if (
    lowerUseCase.includes("account") ||
    lowerUseCase.includes("verification") ||
    lowerUseCase.includes("password") ||
    lowerUseCase.includes("reset") ||
    lowerUseCase.includes("signup") ||
    lowerUseCase.includes("welcome")
  ) {
    return ["email_account_management"];
  }

  // Shipping-related
  if (
    lowerUseCase.includes("shipping") ||
    lowerUseCase.includes("delivery") ||
    lowerUseCase.includes("tracking") ||
    lowerUseCase.includes("shipped")
  ) {
    return ["email_shipping_delivery"];
  }

  // Newsletter
  if (
    lowerUseCase.includes("newsletter") ||
    lowerUseCase.includes("announcement") ||
    lowerUseCase.includes("update") ||
    lowerUseCase.includes("digest")
  ) {
    return includeCompatibility ? ["email_newsletter"] : ["email_transaction_generic"];
  }

  // Lead magnet
  if (
    lowerUseCase.includes("lead magnet") ||
    lowerUseCase.includes("download") ||
    lowerUseCase.includes("ebook") ||
    lowerUseCase.includes("guide") ||
    lowerUseCase.includes("checklist") ||
    lowerUseCase.includes("resource")
  ) {
    return includeCompatibility ? ["email_lead_magnet_delivery"] : ["email_transaction_generic"];
  }

  // Event invitation
  if (
    lowerUseCase.includes("invitation") ||
    lowerUseCase.includes("invite") ||
    lowerUseCase.includes("register") ||
    lowerUseCase.includes("webinar")
  ) {
    return ["email_event_invitation"];
  }

  // Event confirmation
  if (
    lowerUseCase.includes("confirm") ||
    lowerUseCase.includes("booked") ||
    lowerUseCase.includes("registered") ||
    (lowerUseCase.includes("event") && lowerUseCase.includes("ticket"))
  ) {
    return ["email_event_confirmation"];
  }

  // Event reminder
  if (
    lowerUseCase.includes("reminder") ||
    lowerUseCase.includes("tomorrow") ||
    lowerUseCase.includes("upcoming") ||
    (lowerUseCase.includes("event") && lowerUseCase.includes("soon"))
  ) {
    return ["email_event_reminder"];
  }

  // Event follow-up
  if (
    lowerUseCase.includes("thank you") ||
    lowerUseCase.includes("feedback") ||
    lowerUseCase.includes("follow-up") ||
    lowerUseCase.includes("followup") ||
    (lowerUseCase.includes("event") && lowerUseCase.includes("after"))
  ) {
    return ["email_event_followup"];
  }

  // Support
  if (
    lowerUseCase.includes("support") ||
    lowerUseCase.includes("ticket") ||
    lowerUseCase.includes("help") ||
    lowerUseCase.includes("customer service")
  ) {
    return includeCompatibility ? ["email_support_response"] : ["email_transaction_generic"];
  }

  // Status update
  if (
    lowerUseCase.includes("status") ||
    lowerUseCase.includes("progress") ||
    lowerUseCase.includes("update")
  ) {
    return includeCompatibility ? ["email_status_update"] : ["email_transaction_generic"];
  }

  // Sales/Internal notification
  if (
    lowerUseCase.includes("sales notification") ||
    lowerUseCase.includes("internal notification") ||
    lowerUseCase.includes("new sale") ||
    lowerUseCase.includes("reservation notification") ||
    (lowerUseCase.includes("sales") && lowerUseCase.includes("team"))
  ) {
    return ["email_sales_notification"];
  }

  // Default: return generic transaction as fallback
  return ["email_transaction_generic"];
}

/**
 * Template Statistics
 */
export const EMAIL_TEMPLATE_STATS = {
  total: Object.keys(EMAIL_TEMPLATE_REGISTRY).length,
  active: getAllEmailTemplates().length,
  compatibilityArchived: COMPATIBILITY_ARCHIVED_EMAIL_TEMPLATES.length,
  byCategory: {
    transactional: TRANSACTIONAL_EMAIL_TEMPLATES.length,
    marketing: MARKETING_EMAIL_TEMPLATES.length,
    event: EVENT_EMAIL_TEMPLATES.length,
    support: SUPPORT_EMAIL_TEMPLATES.length,
    system: SYSTEM_EMAIL_TEMPLATES.length,
  },
  supportedLanguages: ["en", "de", "es", "fr"],
  totalSectionTypes: 11, // hero, body, cta, eventDetails, orderDetails, accountDetails, attachmentInfo, shippingInfo, leadMagnetInfo, supportInfo, invoiceDetails
};

/**
 * Backward Compatibility Functions
 *
 * These functions maintain compatibility with existing codebase
 * that uses the old email registry format.
 */

/**
 * Get Email Template by Code (Legacy)
 *
 * Returns the template component function.
 * Maintains backward compatibility with existing code.
 */
export function getEmailTemplate(templateCode: string): EmailTemplateComponent {
  const entry = getEmailTemplateByCode(templateCode);

  if (!entry) {
    console.warn(
      `Email template "${templateCode}" not found in registry. Falling back to event confirmation.`
    );
    return EMAIL_TEMPLATE_REGISTRY.email_event_confirmation.component;
  }

  return entry.component;
}

export type AnyEmailTemplateRenderer = (props: unknown) => EmailTemplateOutput;

/**
 * Get Email Template Renderer by Code (untyped props compatibility).
 *
 * Some runtime paths use invoice-specific payloads while others use event payloads.
 * This helper preserves dynamic template lookup while allowing those payload shapes.
 */
export function getEmailTemplateRenderer(templateCode: string): AnyEmailTemplateRenderer {
  return getEmailTemplate(templateCode) as unknown as AnyEmailTemplateRenderer;
}

/**
 * Get Email Template Metadata (Legacy)
 *
 * Returns metadata for a specific template.
 * Maintains backward compatibility.
 */
export function getEmailTemplateMetadata(templateCode: string): GenericEmailMetadata | null {
  const entry = getEmailTemplateByCode(templateCode);
  return entry ? entry.metadata : null;
}

/**
 * Get All Email Template Metadata (Legacy)
 *
 * Returns metadata for all templates.
 * Maintains backward compatibility.
 */
export function getAllEmailTemplateMetadata(options?: {
  includeCompatibility?: boolean;
}): GenericEmailMetadata[] {
  return getAllEmailTemplates(options).map((entry) => entry.metadata);
}
