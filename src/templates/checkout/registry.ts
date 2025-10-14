/**
 * CHECKOUT TEMPLATE REGISTRY
 *
 * Central registry for all checkout template variants.
 * Provides type-safe access to templates by type.
 */

import { TicketCheckoutTemplate } from "./ticket-checkout";
import { ProductCheckoutTemplate } from "./product-checkout";
import { ServiceCheckoutTemplate } from "./service-checkout";

/**
 * Registry of all available checkout templates.
 */
export const checkoutTemplates = {
  ticket: TicketCheckoutTemplate,
  product: ProductCheckoutTemplate,
  service: ServiceCheckoutTemplate,
} as const;

/**
 * Type for valid checkout template keys.
 */
export type CheckoutTemplateType = keyof typeof checkoutTemplates;

/**
 * Get a checkout template by type.
 *
 * @param type - The template type to retrieve
 * @returns The template component
 */
export function getCheckoutTemplate(type: CheckoutTemplateType) {
  return checkoutTemplates[type];
}

/**
 * Check if a template type is valid.
 *
 * @param type - The type to check
 * @returns True if the type exists in the registry
 */
export function isValidCheckoutType(type: string): type is CheckoutTemplateType {
  return type in checkoutTemplates;
}

/**
 * Get all available template types.
 *
 * @returns Array of template type keys
 */
export function getAvailableCheckoutTypes(): CheckoutTemplateType[] {
  return Object.keys(checkoutTemplates) as CheckoutTemplateType[];
}
