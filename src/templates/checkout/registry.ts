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
import { BehaviorDrivenCheckout } from "./behavior-driven";
import { behaviorDrivenSchema } from "./behavior-driven/schema";

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
 * Adapter: Use BehaviorDrivenCheckout template
 * This new component uses the universal behavior system for business logic
 */
function BehaviorDrivenCheckoutAdapter({
  linkedProducts,
  organizationId,
  configuration,
  theme,
}: CheckoutTemplateProps) {
  // Extract configuration settings
  const allowBackNavigation = (configuration?.allowBackNavigation as boolean) ?? true;
  const showProgressBar = (configuration?.showProgressBar as boolean) ?? true;
  const executeBehaviorsOnStepChange = (configuration?.executeBehaviorsOnStepChange as boolean) ?? true;
  const behaviorExecutionTiming = (configuration?.behaviorExecutionTiming as "eager" | "lazy") || "eager";
  const debugMode = (configuration?.debugMode as boolean) ?? false;

  console.log("🧠 [BehaviorDrivenCheckoutAdapter] Configuration:", {
    allowBackNavigation,
    showProgressBar,
    executeBehaviorsOnStepChange,
    behaviorExecutionTiming,
    debugMode,
    fullConfig: configuration,
  });

  // BehaviorDrivenCheckout handles everything through the behavior system:
  // - Employer detection (behaviors decide if invoice checkout)
  // - Form flows (behaviors control registration requirements)
  // - Payment routing (behaviors set payment provider)
  // - Business logic (no hardcoded rules in checkout code)
  return React.createElement(BehaviorDrivenCheckout, {
    organizationId,
    products: linkedProducts,
    theme,
    allowBackNavigation,
    showProgressBar,
    executeBehaviorsOnStepChange,
    behaviorExecutionTiming,
    debugMode,
    onComplete: (data) => {
      console.log("🎉 Checkout completed:", data);
      // Template handles actual checkout completion
    },
    onError: (error) => {
      console.error("❌ Checkout error:", error);
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
  "behavior-driven": {
    code: "behavior-driven",
    name: "Behavior-Driven Checkout",
    component: BehaviorDrivenCheckoutAdapter as ComponentType<CheckoutTemplateProps>,
    schema: behaviorDrivenSchema,
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
