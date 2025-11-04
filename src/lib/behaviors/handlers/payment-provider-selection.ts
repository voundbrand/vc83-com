/**
 * PAYMENT PROVIDER SELECTION BEHAVIOR
 *
 * Determines which payment provider(s) should be available based on:
 * - Customer type (B2B vs B2C)
 * - Employer billing configuration
 * - Form responses (employer selection)
 * - Product configuration
 * - Organization settings
 *
 * This replaces hardcoded payment rules in:
 * - multi-step-checkout.tsx (payment provider logic)
 * - paymentRulesEngine.ts (invoice enforcement)
 */

import type { BehaviorHandler, BehaviorContext, BehaviorResult } from "../types";

/**
 * Payment Provider Selection Config
 */
export interface PaymentProviderSelectionConfig {
  // Default providers available (if no conditions match)
  defaultProviders: string[]; // ["stripe", "paypal", "invoice"]

  // Conditional provider rules
  rules: Array<{
    conditions: {
      // Customer conditions
      customerType?: "B2B" | "B2C";
      hasEmployer?: boolean; // From employer detection behavior
      employerIds?: string[]; // Specific CRM org IDs

      // Form response conditions
      formField?: string; // Field ID to check
      formValues?: string[]; // Values that trigger this rule

      // Product conditions
      productIds?: string[];
      productSubtypes?: string[];

      // Order conditions
      minAmount?: number; // Minimum order amount in cents
      maxAmount?: number; // Maximum order amount in cents
    };

    // Actions when conditions match
    availableProviders: string[]; // Which providers to allow
    enforceProvider?: string; // Force this specific provider (skip selection)
    skipPaymentStep?: boolean; // Skip payment entirely (for invoice)
    paymentTerms?: "net30" | "net60" | "net90"; // For invoice providers
  }>;

  // Override settings
  allowMultipleProviders?: boolean; // Allow user to choose (default: true)
  requireProviderSelection?: boolean; // Must have at least one provider
}

/**
 * Payment Provider Selection Handler
 */
export const paymentProviderSelectionHandler: BehaviorHandler<PaymentProviderSelectionConfig> = {
  type: "payment-provider-selection",
  name: "Payment Provider Selection",
  description: "Control which payment providers are available based on conditions",
  category: "data",
  supportedInputTypes: ["form", "api"],
  supportedObjectTypes: ["checkout_instance", "product"],
  supportedWorkflows: ["checkout"],

  /**
   * Extract data needed for payment provider selection
   */
  extract: (
    _config: PaymentProviderSelectionConfig,
    inputs: Array<{ type: string; data: unknown }>,
    context: Readonly<BehaviorContext>
  ) => {
    // Get employer from behavior data
    interface EmployerDetectionData {
      employerId?: string;
      employerName?: string;
    }
    const employerBehaviorData = (context.behaviorData?.employer_detection || {}) as EmployerDetectionData;
    const hasEmployer = !!employerBehaviorData.employerId;
    const employerId = employerBehaviorData.employerId;

    // Get customer type from objects
    const customerType = context.objects?.find(o => o.objectType === "checkout_instance")?.data?.customerType || "B2C";

    // Get form responses from inputs
    const formResponses = inputs.filter(i => i.type === "form").map(i => i.data);

    // Get selected products
    const productIds = context.objects?.filter(o => o.objectType === "product").map(o => o.objectId) || [];
    const productSubtypes = context.objects?.filter(o => o.objectType === "product").map(o => o.data?.subtype).filter(Boolean) || [];

    // Calculate order total
    const orderTotal = context.workflowData?.totalPrice || 0;

    return {
      customerType,
      hasEmployer,
      employerId,
      formResponses,
      productIds,
      productSubtypes,
      orderTotal,
    };
  },

  /**
   * Apply payment provider selection rules
   */
  apply: (
    config: PaymentProviderSelectionConfig,
    extractedData: unknown,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<unknown> => {
    const data = extractedData as Record<string, unknown>;
    const {
      customerType,
      hasEmployer,
      employerId,
      formResponses,
      productIds,
      productSubtypes,
      orderTotal,
    } = data;

    // Check each rule to find matching providers
    for (const rule of config.rules) {
      const { conditions } = rule;

      // Check all conditions
      let matches = true;

      // Customer type condition
      if (conditions.customerType && conditions.customerType !== customerType) {
        matches = false;
      }

      // Has employer condition
      if (conditions.hasEmployer !== undefined && conditions.hasEmployer !== hasEmployer) {
        matches = false;
      }

      // Specific employer IDs
      if (conditions.employerIds && typeof employerId === 'string') {
        if (!conditions.employerIds.includes(employerId)) {
          matches = false;
        }
      }

      // Form field condition
      if (conditions.formField && conditions.formValues && Array.isArray(formResponses)) {
        const firstResponse = formResponses[0] as Record<string, unknown> | undefined;
        const responses = firstResponse?.responses as Record<string, unknown> | undefined;
        const formValue = responses?.[conditions.formField] as string;
        if (!conditions.formValues.includes(formValue)) {
          matches = false;
        }
      }

      // Product conditions
      if (conditions.productIds) {
        const hasMatchingProduct = (productIds as string[]).some((id) =>
          conditions.productIds?.includes(id)
        );
        if (!hasMatchingProduct) {
          matches = false;
        }
      }

      if (conditions.productSubtypes) {
        const hasMatchingSubtype = (productSubtypes as string[]).some((st) =>
          conditions.productSubtypes?.includes(st)
        );
        if (!hasMatchingSubtype) {
          matches = false;
        }
      }

      // Order amount conditions
      const total = typeof orderTotal === 'number' ? orderTotal : 0;
      if (conditions.minAmount && total < conditions.minAmount) {
        matches = false;
      }

      if (conditions.maxAmount && total > conditions.maxAmount) {
        matches = false;
      }

      // If all conditions match, use this rule
      if (matches) {
        const result = {
          availableProviders: rule.availableProviders,
          enforceProvider: rule.enforceProvider,
          skipPaymentStep: rule.skipPaymentStep || false,
          paymentTerms: rule.paymentTerms || "net30",
        };

        return {
          success: true,
          data: result,
        };
      }
    }

    // No rules matched, use defaults
    const result = {
      availableProviders: config.defaultProviders,
      enforceProvider: undefined,
      skipPaymentStep: false,
      paymentTerms: "net30",
    };

    return {
      success: true,
      data: result,
    };
  },

  /**
   * Validate configuration
   */
  validate: (config: PaymentProviderSelectionConfig, _context?: Partial<BehaviorContext>) => {
    const errors: Array<{ field: string; message: string; code: string; severity: "error" | "warning" }> = [];

    // Must have default providers
    if (!config.defaultProviders || config.defaultProviders.length === 0) {
      errors.push({
        field: "defaultProviders",
        message: "Must specify at least one default payment provider",
        code: "required",
        severity: "error" as const,
      });
    }

    // Validate each rule
    config.rules.forEach((rule, index) => {
      if (!rule.availableProviders || rule.availableProviders.length === 0) {
        errors.push({
          field: `rules[${index}].availableProviders`,
          message: `Rule ${index + 1}: Must specify at least one available provider`,
          code: "required",
          severity: "error" as const,
        });
      }

      // If enforcing a provider, it must be in availableProviders
      if (rule.enforceProvider && !rule.availableProviders.includes(rule.enforceProvider)) {
        errors.push({
          field: `rules[${index}].enforceProvider`,
          message: `Rule ${index + 1}: Enforced provider "${rule.enforceProvider}" must be in availableProviders`,
          code: "invalid_value",
          severity: "error" as const,
        });
      }

      // If skipPaymentStep, must enforce invoice provider
      if (rule.skipPaymentStep && rule.enforceProvider !== "invoice") {
        errors.push({
          field: `rules[${index}].skipPaymentStep`,
          message: `Rule ${index + 1}: skipPaymentStep requires enforceProvider = "invoice"`,
          code: "invalid_value",
          severity: "error" as const,
        });
      }
    });

    return errors;
  },
};
