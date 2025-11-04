/**
 * CHECKOUT BEHAVIOR ADAPTER
 *
 * Adapter layer between existing checkout components and universal behavior system.
 *
 * **Purpose:**
 * - Provides helper functions to execute behaviors in checkout context
 * - Transforms checkout data (products, forms, sessions) into behavior inputs
 * - Handles behavior results and updates checkout state
 *
 * **Usage:**
 * ```ts
 * import { executeCheckoutBehaviors, detectEmployerBilling } from './behaviors/checkout-adapter';
 *
 * // Execute all behaviors on a product
 * const results = await executeCheckoutBehaviors(product, formResponses, context);
 *
 * // Or execute specific behavior
 * const employer = await detectEmployerBilling(product, formResponses);
 * ```
 */

import { behaviorRegistry } from "..";
import type { Behavior, InputSource } from "../types";
import type { EmployerBillingInfo, EmployerDetectionResult } from "../handlers/employer-detection";
import type { Id } from "../../../../convex/_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

/**
 * Checkout product format (matches CheckoutProduct from templates)
 */
export interface CheckoutProductFormat {
  _id: string | Id<"objects">;
  name: string;
  customProperties?: {
    behaviors?: Behavior[];
    invoiceConfig?: {
      employerSourceField: string;
      employerMapping: Record<string, string | null>;
      defaultPaymentTerms?: "net30" | "net60" | "net90";
    };
    [key: string]: unknown;
  };
}

/**
 * Form response format (from checkout session)
 */
export interface CheckoutFormResponse {
  productId: Id<"objects">;
  ticketNumber: number;
  formId: string;
  responses: Record<string, unknown>;
  addedCosts: number;
  submittedAt: number;
}

/**
 * Checkout context - extends BehaviorContext with checkout-specific fields
 */
export interface CheckoutBehaviorContext {
  // Required base fields
  organizationId: Id<"organizations">;
  workflow: string;
  objects: Array<{
    objectId: Id<"objects">;
    objectType: string;
    quantity?: number;
    data?: Record<string, unknown>;
  }>;

  // Optional fields
  sessionId?: string;
  inputs?: InputSource[];
  actor?: {
    type: "user" | "agent" | "system" | "external";
    id?: Id<"users"> | string;
    email?: string;
    name?: string;
    metadata?: Record<string, unknown>;
  };

  // Checkout-specific fields
  checkoutSessionId?: Id<"objects">;
  customerInfo?: {
    email: string;
    name: string;
    phone?: string;
  };

  // Standard context fields
  workflowData?: Record<string, unknown>;
  behaviorData?: Record<string, unknown>;
  capabilities?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * EXECUTE CHECKOUT BEHAVIORS
 *
 * Execute all behaviors attached to a product in checkout context.
 *
 * @param product - Product with behaviors in customProperties
 * @param formResponses - Form responses from checkout
 * @param context - Checkout context (org, session, customer)
 * @returns Behavior execution results
 */
export async function executeCheckoutBehaviors(
  product: CheckoutProductFormat,
  formResponses: CheckoutFormResponse[],
  context: CheckoutBehaviorContext
) {
  // Get behaviors from product
  const behaviors = product.customProperties?.behaviors || [];

  if (behaviors.length === 0) {
    return { success: true, results: [] };
  }

  // Convert form responses to input sources
  const inputs: InputSource[] = formResponses.map((fr) => ({
    type: "form" as const,
    data: {
      ...fr.responses,
      productId: fr.productId,
      ticketNumber: fr.ticketNumber,
    },
    metadata: {
      timestamp: fr.submittedAt,
    },
  }));

  // Execute behaviors
  try {
    const results = await behaviorRegistry.executeMany(behaviors, {
      ...context,
      inputs,
      metadata: {
        ...context.metadata,
        checkoutSessionId: context.checkoutSessionId,
        productId: product._id,
        customerInfo: context.customerInfo,
      },
    });

    return { success: true, results };
  } catch (error) {
    console.error("[CheckoutAdapter] Error executing behaviors:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results: [],
    };
  }
}

/**
 * DETECT EMPLOYER BILLING
 *
 * Convenience function to detect employer billing from form responses.
 * Uses employer-detection behavior under the hood.
 *
 * @param product - Product with invoiceConfig
 * @param formResponses - Form responses from checkout
 * @param organizationId - Organization ID for context
 * @returns Employer billing info or null
 */
export async function detectEmployerBilling(
  product: CheckoutProductFormat,
  formResponses: CheckoutFormResponse[],
  organizationId: Id<"organizations">
): Promise<EmployerBillingInfo | null> {
  // Check if product has invoice config
  const invoiceConfig = product.customProperties?.invoiceConfig;
  if (!invoiceConfig) {
    return null;
  }

  // Create employer-detection behavior
  const behavior: Behavior = {
    type: "employer_detection",
    config: {
      employerSourceField: invoiceConfig.employerSourceField,
      employerMapping: invoiceConfig.employerMapping,
      defaultPaymentTerms: invoiceConfig.defaultPaymentTerms,
      autoFillBillingAddress: true,
    },
  };

  // Convert form responses to inputs
  const inputs: InputSource[] = formResponses.map((fr) => ({
    type: "form" as const,
    data: fr.responses,
    metadata: {
      timestamp: fr.submittedAt,
    },
  }));

  // Execute behavior
  try {
    const result = await behaviorRegistry.execute(behavior, {
      organizationId,
      workflow: "checkout",
      objects: [{
        objectId: product._id as Id<"objects">,
        objectType: "product",
      }],
      inputs,
      metadata: { productId: product._id },
    });

    if (!result.success) {
      console.error("[CheckoutAdapter] Employer detection failed:", result.errors);
      return null;
    }

    // Get result data
    const employerResult = result.data as EmployerDetectionResult | null;
    return employerResult?.employerBilling || null;
  } catch (error) {
    console.error("[CheckoutAdapter] Error detecting employer:", error);
    return null;
  }
}

/**
 * EVALUATE PAYMENT RULES
 *
 * Convenience function to evaluate payment rules using behaviors.
 * Replaces direct calls to paymentRulesEngine.evaluatePaymentRules().
 *
 * @param product - Product with invoiceConfig
 * @param formResponses - Form responses from checkout
 * @param configuredProviders - Available payment providers
 * @param organizationId - Organization ID for context
 * @returns Payment rules result
 */
export async function evaluatePaymentRulesWithBehaviors(
  product: CheckoutProductFormat,
  formResponses: CheckoutFormResponse[],
  configuredProviders: string[],
  organizationId: Id<"organizations">
): Promise<{
  availableProviders: string[];
  enforceInvoice: boolean;
  enforcementDetails?: {
    employerName: string;
    employerFieldValue: string;
    paymentTerms: "net30" | "net60" | "net90";
  };
  errors: string[];
}> {
  // Check if product has invoice config
  const invoiceConfig = product.customProperties?.invoiceConfig;
  if (!invoiceConfig) {
    return {
      availableProviders: configuredProviders,
      enforceInvoice: false,
      errors: [],
    };
  }

  // Detect employer billing first
  const employerBilling = await detectEmployerBilling(product, formResponses, organizationId);

  // If no employer billing, return default
  if (!employerBilling) {
    return {
      availableProviders: configuredProviders,
      enforceInvoice: false,
      errors: [],
    };
  }

  // If employer billing detected, enforce invoice
  return {
    availableProviders: ["invoice"],
    enforceInvoice: true,
    enforcementDetails: {
      employerName: employerBilling.organizationName,
      employerFieldValue: "", // TODO: Extract from form
      paymentTerms: employerBilling.defaultPaymentTerms || "net30",
    },
    errors: [],
  };
}

/**
 * CREATE INVOICE MAPPING BEHAVIOR
 *
 * Helper to create invoice-mapping behavior from product config.
 *
 * @param product - Product with invoiceConfig
 * @returns Behavior configuration
 */
export function createInvoiceMappingBehavior(
  product: CheckoutProductFormat
): Behavior | null {
  const invoiceConfig = product.customProperties?.invoiceConfig;
  if (!invoiceConfig) {
    return null;
  }

  return {
    type: "invoice_mapping",
    config: {
      organizationSourceField: invoiceConfig.employerSourceField,
      organizationMapping: invoiceConfig.employerMapping,
      defaultPaymentTerms: invoiceConfig.defaultPaymentTerms,
      autoCreateInvoice: true,
      syncToCRM: true,
    },
  };
}

/**
 * ATTACH BEHAVIORS TO PRODUCT
 *
 * Helper to attach behaviors to product.customProperties.behaviors array.
 * Used in admin UI when configuring products.
 *
 * @param product - Product to attach behaviors to
 * @param behaviors - Behaviors to attach
 * @returns Updated product
 */
export function attachBehaviorsToProduct(
  product: CheckoutProductFormat,
  behaviors: Behavior[]
): CheckoutProductFormat {
  return {
    ...product,
    customProperties: {
      ...product.customProperties,
      behaviors: [
        ...(product.customProperties?.behaviors || []),
        ...behaviors,
      ],
    },
  };
}

/**
 * GET PRODUCT BEHAVIORS
 *
 * Extract all behaviors from a product.
 *
 * @param product - Product with behaviors
 * @returns Array of behaviors
 */
export function getProductBehaviors(
  product: CheckoutProductFormat
): Behavior[] {
  return product.customProperties?.behaviors || [];
}
