/**
 * FORM TYPES CONFIGURATION
 *
 * Central configuration for all supported form types (subtypes).
 * Used across the application for:
 * - Form builder dropdowns
 * - Form list display
 * - Icons and labels
 * - Translations
 */

export interface FormTypeDefinition {
  code: string;
  icon: string;
  translationKey: string;
}

/**
 * All supported form types with icons and translation keys
 *
 * Translation keys follow pattern: ui.forms.type_{code}
 *
 * Order matters - will be displayed in this order in dropdowns
 */
export const FORM_TYPES: FormTypeDefinition[] = [
  {
    code: "registration",
    icon: "🎫",
    translationKey: "ui.forms.type_registration",
  },
  {
    code: "survey",
    icon: "📊",
    translationKey: "ui.forms.type_survey",
  },
  {
    code: "application",
    icon: "📝",
    translationKey: "ui.forms.type_application",
  },
  {
    code: "contact",
    icon: "📧",
    translationKey: "ui.forms.type_contact",
  },
  {
    code: "booking",
    icon: "📅",
    translationKey: "ui.forms.type_booking",
  },
  {
    code: "order",
    icon: "🛒",
    translationKey: "ui.forms.type_order",
  },
  {
    code: "donation",
    icon: "💝",
    translationKey: "ui.forms.type_donation",
  },
  {
    code: "membership",
    icon: "👥",
    translationKey: "ui.forms.type_membership",
  },
  {
    code: "rsvp",
    icon: "✉️",
    translationKey: "ui.forms.type_rsvp",
  },
  {
    code: "feedback",
    icon: "💬",
    translationKey: "ui.forms.type_feedback",
  },
  {
    code: "quiz",
    icon: "🎯",
    translationKey: "ui.forms.type_quiz",
  },
  {
    code: "volunteer",
    icon: "🙋",
    translationKey: "ui.forms.type_volunteer",
  },
  {
    code: "other",
    icon: "📋",
    translationKey: "ui.forms.type_other",
  },
];

/**
 * Get form type definition by code
 */
export function getFormType(code: string): FormTypeDefinition {
  const formType = FORM_TYPES.find((type) => type.code === code);

  // Fallback to "other" if code not found
  return formType || FORM_TYPES[FORM_TYPES.length - 1]; // Last item is "other"
}

/**
 * Get icon for form type
 */
export function getFormTypeIcon(code: string): string {
  return getFormType(code).icon;
}

/**
 * Get translation key for form type
 */
export function getFormTypeTranslationKey(code: string): string {
  return getFormType(code).translationKey;
}

/**
 * Check if form type code is valid
 */
export function isValidFormType(code: string): boolean {
  return FORM_TYPES.some((type) => type.code === code);
}

/**
 * Get all form type codes
 */
export function getFormTypeCodes(): string[] {
  return FORM_TYPES.map((type) => type.code);
}

/**
 * Default form type for new forms
 */
export const DEFAULT_FORM_TYPE = "survey";
