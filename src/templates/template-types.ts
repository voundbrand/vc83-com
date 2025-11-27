/**
 * TEMPLATE TYPES CONFIGURATION
 *
 * Central configuration for all supported template types (subtypes).
 * Used across the application for:
 * - Template builder dropdowns
 * - Template list display
 * - Icons and labels
 * - Translations
 *
 * Follows same pattern as form-types.ts for consistency
 */

export interface TemplateTypeDefinition {
  code: string;
  icon: string;
  translationKey: string;
}

/**
 * EMAIL TEMPLATE SUBTYPES
 *
 * All supported email template subtypes with icons and translation keys
 * Translation keys follow pattern: ui.templates.email_type_{code}
 * Order matters - will be displayed in this order in dropdowns
 */
export const EMAIL_TEMPLATE_TYPES: TemplateTypeDefinition[] = [
  {
    code: "transactional",
    icon: "📧",
    translationKey: "ui.templates.email_type_transactional",
  },
  {
    code: "event_confirmation",
    icon: "🎫",
    translationKey: "ui.templates.email_type_event_confirmation",
  },
  {
    code: "event_reminder",
    icon: "⏰",
    translationKey: "ui.templates.email_type_event_reminder",
  },
  {
    code: "event_followup",
    icon: "📝",
    translationKey: "ui.templates.email_type_event_followup",
  },
  {
    code: "newsletter",
    icon: "📰",
    translationKey: "ui.templates.email_type_newsletter",
  },
  {
    code: "marketing",
    icon: "📢",
    translationKey: "ui.templates.email_type_marketing",
  },
  {
    code: "promotional",
    icon: "🎁",
    translationKey: "ui.templates.email_type_promotional",
  },
  {
    code: "invoice",
    icon: "💰",
    translationKey: "ui.templates.email_type_invoice",
  },
  {
    code: "receipt",
    icon: "🧾",
    translationKey: "ui.templates.email_type_receipt",
  },
  {
    code: "shipping",
    icon: "📦",
    translationKey: "ui.templates.email_type_shipping",
  },
  {
    code: "support",
    icon: "💬",
    translationKey: "ui.templates.email_type_support",
  },
  {
    code: "account",
    icon: "👤",
    translationKey: "ui.templates.email_type_account",
  },
  {
    code: "notification",
    icon: "🔔",
    translationKey: "ui.templates.email_type_notification",
  },
  {
    code: "welcome",
    icon: "👋",
    translationKey: "ui.templates.email_type_welcome",
  },
  {
    code: "other",
    icon: "✉️",
    translationKey: "ui.templates.email_type_other",
  },
];

/**
 * PDF TEMPLATE SUBTYPES
 *
 * All supported PDF template subtypes with icons and translation keys
 * Translation keys follow pattern: ui.templates.pdf_type_{code}
 * Order matters - will be displayed in this order in dropdowns
 */
export const PDF_TEMPLATE_TYPES: TemplateTypeDefinition[] = [
  {
    code: "ticket",
    icon: "🎫",
    translationKey: "ui.templates.pdf_type_ticket",
  },
  {
    code: "invoice",
    icon: "💰",
    translationKey: "ui.templates.pdf_type_invoice",
  },
  {
    code: "receipt",
    icon: "🧾",
    translationKey: "ui.templates.pdf_type_receipt",
  },
  {
    code: "certificate",
    icon: "🏆",
    translationKey: "ui.templates.pdf_type_certificate",
  },
  {
    code: "badge",
    icon: "🏷️",
    translationKey: "ui.templates.pdf_type_badge",
  },
  {
    code: "program",
    icon: "📋",
    translationKey: "ui.templates.pdf_type_program",
  },
  {
    code: "quote",
    icon: "💵",
    translationKey: "ui.templates.pdf_type_quote",
  },
  {
    code: "proposal",
    icon: "📄",
    translationKey: "ui.templates.pdf_type_proposal",
  },
  {
    code: "contract",
    icon: "📜",
    translationKey: "ui.templates.pdf_type_contract",
  },
  {
    code: "report",
    icon: "📊",
    translationKey: "ui.templates.pdf_type_report",
  },
  {
    code: "ebook",
    icon: "📖",
    translationKey: "ui.templates.pdf_type_ebook",
  },
  {
    code: "guide",
    icon: "📚",
    translationKey: "ui.templates.pdf_type_guide",
  },
  {
    code: "checklist",
    icon: "✅",
    translationKey: "ui.templates.pdf_type_checklist",
  },
  {
    code: "flyer",
    icon: "📰",
    translationKey: "ui.templates.pdf_type_flyer",
  },
  {
    code: "other",
    icon: "📝",
    translationKey: "ui.templates.pdf_type_other",
  },
];

/**
 * Get email template type definition by code
 */
export function getEmailTemplateType(code: string): TemplateTypeDefinition {
  const templateType = EMAIL_TEMPLATE_TYPES.find((type) => type.code === code);
  // Fallback to "other" if code not found
  return templateType || EMAIL_TEMPLATE_TYPES[EMAIL_TEMPLATE_TYPES.length - 1];
}

/**
 * Get PDF template type definition by code
 */
export function getPdfTemplateType(code: string): TemplateTypeDefinition {
  const templateType = PDF_TEMPLATE_TYPES.find((type) => type.code === code);
  // Fallback to "other" if code not found
  return templateType || PDF_TEMPLATE_TYPES[PDF_TEMPLATE_TYPES.length - 1];
}

/**
 * Get template type definition by template type and code
 */
export function getTemplateType(
  templateType: "email" | "pdf",
  code: string
): TemplateTypeDefinition {
  return templateType === "email"
    ? getEmailTemplateType(code)
    : getPdfTemplateType(code);
}

/**
 * Get icon for template
 */
export function getTemplateTypeIcon(
  templateType: "email" | "pdf",
  code: string
): string {
  return getTemplateType(templateType, code).icon;
}

/**
 * Get translation key for template
 */
export function getTemplateTypeTranslationKey(
  templateType: "email" | "pdf",
  code: string
): string {
  return getTemplateType(templateType, code).translationKey;
}

/**
 * Check if email template type code is valid
 */
export function isValidEmailTemplateType(code: string): boolean {
  return EMAIL_TEMPLATE_TYPES.some((type) => type.code === code);
}

/**
 * Check if PDF template type code is valid
 */
export function isValidPdfTemplateType(code: string): boolean {
  return PDF_TEMPLATE_TYPES.some((type) => type.code === code);
}

/**
 * Get all email template type codes
 */
export function getEmailTemplateTypeCodes(): string[] {
  return EMAIL_TEMPLATE_TYPES.map((type) => type.code);
}

/**
 * Get all PDF template type codes
 */
export function getPdfTemplateTypeCodes(): string[] {
  return PDF_TEMPLATE_TYPES.map((type) => type.code);
}

/**
 * Default template types for new templates
 */
export const DEFAULT_EMAIL_TEMPLATE_TYPE = "transactional";
export const DEFAULT_PDF_TEMPLATE_TYPE = "invoice";
