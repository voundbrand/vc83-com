/**
 * FORM TEMPLATE REGISTRY
 *
 * Maps form template codes to their React components.
 * Similar to web publishing template registry.
 */

import { FormTemplateComponent } from "./types"; // Use form-specific type with .schema property
import { HaffSymposiumRegistrationForm } from "./haffsymposium-registration";

/**
 * Form Template Registry
 *
 * Add new form templates here to make them available system-wide.
 */
export const formTemplateRegistry: Record<string, FormTemplateComponent> = {
  "haffsymposium-registration": HaffSymposiumRegistrationForm,
  // Add more form templates here:
  // "contact-form": ContactForm,
  // "feedback-survey": FeedbackSurvey,
  // "speaker-proposal": SpeakerProposalForm,
};

/**
 * Get form template component by code
 */
export function getFormTemplate(code: string): FormTemplateComponent | null {
  return formTemplateRegistry[code] || null;
}

/**
 * Get all available form template codes
 */
export function getAvailableFormTemplateCodes(): string[] {
  return Object.keys(formTemplateRegistry);
}

/**
 * Check if a form template exists
 */
export function hasFormTemplate(code: string): boolean {
  return code in formTemplateRegistry;
}
