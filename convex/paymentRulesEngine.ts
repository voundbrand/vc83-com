/**
 * PAYMENT RULES ENGINE
 *
 * Pure functions that determine available payment methods based on:
 * - Product configuration (invoiceConfig)
 * - Form responses (employer field values)
 * - Multi-ticket validation (all tickets must use same employer)
 *
 * This module is:
 * - Testable (pure functions, no database dependencies)
 * - Reusable (works in frontend preview, backend validation, webhooks)
 * - Type-safe (full TypeScript support)
 *
 * Integration Points:
 * - Frontend: multi-step-checkout.tsx calls evaluatePaymentRules()
 * - Backend: checkoutSessions.ts validates before payment
 * - Admin: Shows enforcement preview in product form
 */

import { Id } from "./_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

/**
 * PRODUCT INVOICE CONFIGURATION
 * Stored in product.customProperties.invoiceConfig
 */
export interface InvoiceConfig {
  employerSourceField: string; // Form field ID (e.g., "attendee_category")
  employerMapping: Record<string, string | null>; // form value -> CRM org name (null = no invoice)
  defaultPaymentTerms?: "net30" | "net60" | "net90";
}

/**
 * FORM RESPONSE STRUCTURE
 * From checkout session formResponses array
 */
export interface FormResponse {
  productId: Id<"objects">;
  ticketNumber: number;
  formId: string;
  responses: Record<string, unknown>;
  addedCosts: number;
  submittedAt: number;
}

/**
 * PAYMENT RULE EVALUATION RESULT
 */
export interface PaymentRulesResult {
  // Available payment providers (subset of configured providers)
  availableProviders: string[];

  // If true, skip payment method selection step (only 1 provider)
  skipPaymentMethodStep: boolean;

  // If invoice is enforced
  enforceInvoice: boolean;

  // Details about enforcement (for UI display)
  enforcementDetails?: {
    employerName: string; // CRM organization name
    employerFieldValue: string; // Original form field value
    paymentTerms: "net30" | "net60" | "net90";
  };

  // Validation errors (if any)
  errors: string[];

  // Debug info (helpful for troubleshooting)
  debug: {
    hasInvoiceConfig: boolean;
    formResponseCount: number;
    checkedEmployers: string[];
    mappingResults: Array<{
      ticketNumber: number;
      fieldValue: string | undefined;
      mappedOrg: string | null | undefined;
    }>;
  };
}

// ============================================================================
// Main API
// ============================================================================

/**
 * EVALUATE PAYMENT RULES
 *
 * Main entry point - determines available payment methods.
 *
 * Logic:
 * 1. Check if product has invoiceConfig
 * 2. If yes, extract employer from form responses
 * 3. Validate all tickets have same employer
 * 4. Check if employer requires invoice
 * 5. Return available providers + enforcement details
 *
 * @param product - Product with potential invoiceConfig
 * @param formResponses - Form responses from checkout session
 * @param configuredProviders - All payment providers available to org
 * @returns Payment rules evaluation result
 */
export function evaluatePaymentRules(
  product: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      invoiceConfig?: InvoiceConfig;
      [key: string]: unknown;
    };
  },
  formResponses: FormResponse[],
  configuredProviders: string[]
): PaymentRulesResult {
  // Default: all providers available, no enforcement
  const defaultResult: PaymentRulesResult = {
    availableProviders: configuredProviders,
    skipPaymentMethodStep: configuredProviders.length === 1,
    enforceInvoice: false,
    errors: [],
    debug: {
      hasInvoiceConfig: false,
      formResponseCount: formResponses.length,
      checkedEmployers: [],
      mappingResults: [],
    },
  };

  // ========================================================================
  // STEP 1: Check if product has invoice configuration
  // ========================================================================
  const invoiceConfig = product.customProperties?.invoiceConfig;
  if (!invoiceConfig) {
    // No invoice config = default behavior (all providers)
    return defaultResult;
  }

  defaultResult.debug.hasInvoiceConfig = true;

  // ========================================================================
  // STEP 2: Check if we have form responses
  // ========================================================================
  if (formResponses.length === 0) {
    // No forms yet = can't evaluate rules, return default
    return defaultResult;
  }

  // ========================================================================
  // STEP 3: Extract employer values from all form responses
  // ========================================================================
  const employerValues: Array<{
    ticketNumber: number;
    fieldValue: string | undefined;
    mappedOrg: string | null | undefined;
  }> = formResponses.map((fr) => {
    const fieldValue = fr.responses[invoiceConfig.employerSourceField] as
      | string
      | undefined;
    const mappedOrg = fieldValue
      ? invoiceConfig.employerMapping[fieldValue]
      : undefined;

    return {
      ticketNumber: fr.ticketNumber,
      fieldValue,
      mappedOrg,
    };
  });

  defaultResult.debug.mappingResults = employerValues;
  defaultResult.debug.checkedEmployers = employerValues
    .map((ev) => ev.fieldValue || "undefined")
    .filter((v, i, arr) => arr.indexOf(v) === i); // unique values

  // ========================================================================
  // STEP 4: Validate all tickets have same employer
  // ========================================================================
  const uniqueEmployers = new Set(
    employerValues.map((ev) => ev.fieldValue || "undefined")
  );

  if (uniqueEmployers.size > 1) {
    // Multiple employers in same checkout = ERROR
    return {
      ...defaultResult,
      availableProviders: [],
      errors: [
        `Mixed employer tickets detected. All tickets must be for the same employer. ` +
          `Found: ${Array.from(uniqueEmployers).join(", ")}. ` +
          `Please complete separate checkouts for each employer.`,
      ],
    };
  }

  // ========================================================================
  // STEP 5: Check if employer requires invoice
  // ========================================================================
  const employerFieldValue = employerValues[0].fieldValue;
  const mappedOrgName = employerValues[0].mappedOrg;

  // If no field value or not in mapping, return default
  if (!employerFieldValue || mappedOrgName === undefined) {
    return defaultResult;
  }

  // If mapped to null, means "no invoice for this value"
  if (mappedOrgName === null) {
    return defaultResult;
  }

  // ========================================================================
  // STEP 6: Invoice is ENFORCED!
  // ========================================================================
  return {
    availableProviders: ["invoice"], // ONLY invoice allowed
    skipPaymentMethodStep: true, // Skip selection step
    enforceInvoice: true,
    enforcementDetails: {
      employerName: mappedOrgName,
      employerFieldValue,
      paymentTerms: invoiceConfig.defaultPaymentTerms || "net30",
    },
    errors: [],
    debug: defaultResult.debug,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * GET EMPLOYER DISPLAY NAME
 *
 * Helper to get human-readable employer name for UI display.
 *
 * @param invoiceConfig - Product invoice configuration
 * @param formResponses - Form responses from checkout
 * @returns Employer display name or null
 */
export function getEmployerDisplayName(
  invoiceConfig: InvoiceConfig | undefined,
  formResponses: FormResponse[]
): string | null {
  if (!invoiceConfig || formResponses.length === 0) return null;

  const fieldValue = formResponses[0].responses[
    invoiceConfig.employerSourceField
  ] as string | undefined;

  if (!fieldValue) return null;

  const mappedOrg = invoiceConfig.employerMapping[fieldValue];
  return mappedOrg || null;
}

/**
 * VALIDATE PAYMENT PROVIDER SELECTION
 *
 * Backend validation - ensures selected provider is allowed by rules.
 * Called before processing payment to prevent bypassing frontend rules.
 *
 * @param product - Product with invoice config
 * @param formResponses - Form responses from checkout
 * @param selectedProvider - User's selected payment provider
 * @param configuredProviders - All available providers
 * @returns Validation result with error message if invalid
 */
export function validatePaymentProviderSelection(
  product: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      invoiceConfig?: InvoiceConfig;
      [key: string]: unknown;
    };
  },
  formResponses: FormResponse[],
  selectedProvider: string,
  configuredProviders: string[]
): { valid: boolean; error?: string } {
  const rulesResult = evaluatePaymentRules(
    product,
    formResponses,
    configuredProviders
  );

  // Check for rule evaluation errors
  if (rulesResult.errors.length > 0) {
    return {
      valid: false,
      error: rulesResult.errors[0],
    };
  }

  // Check if selected provider is in available list
  if (!rulesResult.availableProviders.includes(selectedProvider)) {
    return {
      valid: false,
      error: rulesResult.enforceInvoice
        ? `Invoice payment is required for employer: ${rulesResult.enforcementDetails?.employerName}. ` +
          `Credit card payment is not allowed.`
        : `Payment provider "${selectedProvider}" is not available for this checkout.`,
    };
  }

  return { valid: true };
}
