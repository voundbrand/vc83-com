/**
 * CHECKOUT TEMPLATE REGISTRY
 *
 * Central registry for all checkout templates.
 * Similar to the web template registry but for checkout pages.
 */

import React, { type ComponentType } from "react";
import type { CheckoutTemplateProps, CheckoutTemplateSchema } from "./types";

// Import templates
import { MultiStepCheckout } from "@/components/checkout/multi-step-checkout";
import { ticketCheckoutSchema } from "./ticket-checkout/schema";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Template Registration Entry
 */
interface CheckoutTemplateRegistration {
  code: string;
  name: string;
  component: ComponentType<CheckoutTemplateProps>;
  schema: CheckoutTemplateSchema;
}

/**
 * Adapter: Use MultiStepCheckout for ticket checkout template
 * This new component supports forms, multiple products, and full checkout flow
 */
function TicketCheckoutAdapter({
  linkedProducts,
  organizationId,
  configuration,
}: CheckoutTemplateProps) {
  // Extract payment providers from configuration
  const paymentProviders = (configuration?.paymentProviders as string[]) || ["stripe"];

  // Extract Force B2B setting from configuration
  const forceB2B = (configuration?.forceB2B as boolean) || false;

  console.log("🔍 [TicketCheckoutAdapter] Configuration:", {
    forceB2B,
    paymentProviders,
    fullConfig: configuration
  });

  // MultiStepCheckout handles everything:
  // - Product selection with quantity controls
  // - Customer information collection
  // - Registration form (if product has formId)
  // - Payment processing
  // - Confirmation
  return React.createElement(MultiStepCheckout, {
    organizationId: organizationId,
    linkedProducts: linkedProducts,
    paymentProviders: paymentProviders,
    forceB2B: forceB2B, // ✅ Pass Force B2B setting to checkout flow
    onComplete: (result) => {
      console.log("Checkout completed:", result);
      // In preview mode, just log. In production, this would trigger actual checkout
    },
  });
}

/**
 * Checkout Template Registry
 */
const checkoutTemplateRegistry: Record<string, CheckoutTemplateRegistration> = {
  "ticket-checkout": {
    code: "ticket-checkout",
    name: "Event Ticket Checkout",
    component: TicketCheckoutAdapter as ComponentType<CheckoutTemplateProps>,
    schema: ticketCheckoutSchema,
  },
  // Future templates will be added here:
  // "product-checkout": { ... },
  // "service-checkout": { ... },
};

/**
 * Get complete template registration
 */
export function getCheckoutTemplate(code: string): CheckoutTemplateRegistration | undefined {
  return checkoutTemplateRegistry[code];
}

/**
 * Get template component
 */
export function getCheckoutComponent(code: string): ComponentType<CheckoutTemplateProps> | undefined {
  return checkoutTemplateRegistry[code]?.component;
}

/**
 * Get template schema
 */
export function getCheckoutSchema(code: string): CheckoutTemplateSchema | undefined {
  return checkoutTemplateRegistry[code]?.schema;
}

/**
 * List all available templates
 */
export function listCheckoutTemplates(): CheckoutTemplateRegistration[] {
  return Object.values(checkoutTemplateRegistry);
}

/**
 * Check if template exists
 */
export function hasCheckoutTemplate(code: string): boolean {
  return code in checkoutTemplateRegistry;
}
