/**
 * Invoice Mapping Behavior
 *
 * Universal behavior that maps input data to CRM organizations and creates invoices.
 * Works with ANY input type (forms, APIs, agent decisions, webhooks, etc.)
 *
 * Use Cases:
 * - Checkout forms: Map employer field to CRM org → create invoice
 * - API integrations: External system provides org data → create invoice
 * - AI agents: Agent decides which org to bill → create invoice
 * - Webhooks: External event triggers invoice creation
 */

import type {
  BehaviorHandler,
  InputSource,
  BehaviorContext,
  BehaviorResult,
  ValidationError,
} from "../types";

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface InvoiceMappingConfig {
  /**
   * Field name in input data that contains the organization identifier
   * Examples: "employer", "company", "organization_id"
   */
  organizationSourceField: string;

  /**
   * Mapping from input values to CRM organization IDs
   * Examples:
   * - "Acme Corp" → "org_123"
   * - "employer:acme" → "org_123"
   * - null → "default_org_456" (for individual/no employer)
   */
  organizationMapping: Record<string, string | null>;

  /**
   * PDF template to use for invoice generation
   * Templates:
   * - "b2c_receipt" - Individual customer receipts
   * - "b2b_single" - Single B2B invoice
   * - "b2b_consolidated" - Multiple employees → one invoice (RECOMMENDED for hospitals)
   * - "b2b_consolidated_detailed" - Consolidated with per-employee breakdowns
   */
  templateId?: "b2c_receipt" | "b2b_single" | "b2b_consolidated" | "b2b_consolidated_detailed";

  /**
   * Default payment terms for invoices
   */
  defaultPaymentTerms?: "net30" | "net60" | "net90";

  /**
   * Whether to require organization mapping for all inputs
   * If true, missing organizations will cause behavior to fail
   * If false, unmapped organizations will be skipped
   */
  requireMapping?: boolean;

  /**
   * Optional: Custom field mapping for invoice data
   * Maps input field names to invoice field names
   */
  invoiceFieldMapping?: Record<string, string>;
}

// ============================================================================
// EXTRACTED DATA
// ============================================================================

interface ExtractedInvoiceData {
  /**
   * The organization value from the input
   */
  organizationValue: string | null;

  /**
   * The mapped CRM organization ID (if found)
   */
  crmOrganizationId: string | null;

  /**
   * Input source that provided the data
   */
  inputSource: InputSource;

  /**
   * Additional invoice data extracted from input
   */
  additionalData?: Record<string, unknown>;
}

// ============================================================================
// RESULT DATA
// ============================================================================

interface InvoiceMappingResult {
  /**
   * CRM organization ID to create invoice for
   */
  crmOrganizationId: string;

  /**
   * Organization name/value from input
   */
  organizationValue: string | null;

  /**
   * PDF template ID for invoice generation
   */
  templateId: "b2c_receipt" | "b2b_single" | "b2b_consolidated" | "b2b_consolidated_detailed";

  /**
   * Payment terms for the invoice
   */
  paymentTerms: "net30" | "net60" | "net90";

  /**
   * Whether this was mapped or is a default
   */
  mappingSource: "explicit" | "default" | "unmapped";

  /**
   * Additional invoice data
   */
  invoiceData?: Record<string, unknown>;
}

// ============================================================================
// BEHAVIOR HANDLER
// ============================================================================

export const invoiceMappingHandler: BehaviorHandler<
  InvoiceMappingConfig,
  ExtractedInvoiceData,
  InvoiceMappingResult
> = {
  type: "invoice-mapping",
  name: "Invoice Mapping",
  description:
    "Maps input data (from any source) to CRM organizations and creates invoices",
  category: "action",
  supportedInputTypes: [
    "form",
    "api",
    "agent_decision",
    "webhook",
    "manual",
    "user_action",
  ],
  supportedObjectTypes: ["product", "service", "subscription", "event_ticket"],
  supportedWorkflows: ["checkout", "crm", "events"],

  /**
   * Extract organization data from ANY input source
   */
  extract: (
    config: InvoiceMappingConfig,
    inputs: InputSource[],
    _context: Readonly<BehaviorContext>
  ): ExtractedInvoiceData | null => {
    void _context; // Required by interface but not used in this handler
    // Find first input that has the organization field
    for (const input of inputs) {
      const orgValue = input.data[config.organizationSourceField];

      if (orgValue !== undefined) {
        // Convert to string for mapping lookup
        const orgValueStr =
          orgValue === null ? null : String(orgValue);

        // Look up mapped CRM org ID
        const crmOrgId = orgValueStr !== null
          ? config.organizationMapping[orgValueStr] ?? null
          : config.organizationMapping["null"] ?? null;

        // Extract additional invoice data if field mapping provided
        const additionalData: Record<string, unknown> = {};
        if (config.invoiceFieldMapping) {
          for (const [inputField, invoiceField] of Object.entries(
            config.invoiceFieldMapping
          )) {
            if (input.data[inputField] !== undefined) {
              additionalData[invoiceField] = input.data[inputField];
            }
          }
        }

        return {
          organizationValue: orgValueStr,
          crmOrganizationId: crmOrgId,
          inputSource: input,
          additionalData: Object.keys(additionalData).length > 0
            ? additionalData
            : undefined,
        };
      }
    }

    // No input had the organization field
    return null;
  },

  /**
   * Apply invoice mapping logic and return invoice creation action
   */
  apply: (
    config: InvoiceMappingConfig,
    extracted: ExtractedInvoiceData,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<InvoiceMappingResult> => {
    const { organizationValue, crmOrganizationId, additionalData } = extracted;

    // Handle missing mapping
    if (crmOrganizationId === null) {
      if (config.requireMapping) {
        return {
          success: false,
          errors: [
            `No CRM organization mapping found for value: ${organizationValue}`,
          ],
        };
      }

      // Skip if mapping not required
      return {
        success: true,
        skipped: true,
        data: null,
        warnings: [
          `Organization value "${organizationValue}" not mapped, skipping invoice creation`,
        ],
      };
    }

    // Determine payment terms
    const paymentTerms = config.defaultPaymentTerms || "net30";

    // Determine template (default to b2b_consolidated for multi-employee invoicing)
    const templateId = config.templateId || "b2b_consolidated";

    // Determine mapping source
    let mappingSource: "explicit" | "default" | "unmapped";
    if (organizationValue === null) {
      mappingSource = "default";
    } else if (config.organizationMapping[organizationValue] !== undefined) {
      mappingSource = "explicit";
    } else {
      mappingSource = "unmapped";
    }

    const result: InvoiceMappingResult = {
      crmOrganizationId,
      organizationValue,
      templateId,
      paymentTerms,
      mappingSource,
      invoiceData: additionalData,
    };

    // Return action to create invoice (don't create it here!)
    return {
      success: true,
      data: result,
      actions: [
        {
          type: "create_invoice",
          payload: {
            organizationId: context.organizationId,
            crmOrganizationId,
            templateId,
            paymentTerms,
            sessionId: context.sessionId,
            workflow: context.workflow,
            objects: context.objects,
            additionalData,
          },
          when: "deferred", // Create after all behaviors complete
        },
      ],
      modifiedContext: {
        behaviorData: {
          invoice_mapping: result,
        },
        workflowData: {
          ...context.workflowData,
          billingOrganizationId: crmOrganizationId,
          invoicePaymentTerms: paymentTerms,
        },
      },
    };
  },

  /**
   * Validate configuration
   */
  validate: (
    config: InvoiceMappingConfig,
    _context?: Partial<BehaviorContext>
  ): ValidationError[] => {
    void _context; // Required by interface but not used in this handler
    const errors: ValidationError[] = [];

    // Check required fields
    if (!config.organizationSourceField) {
      errors.push({
        field: "organizationSourceField",
        code: "required",
        message: "organizationSourceField is required",
        severity: "error",
      });
    }

    if (!config.organizationMapping) {
      errors.push({
        field: "organizationMapping",
        code: "required",
        message: "organizationMapping is required",
        severity: "error",
      });
    }

    // Check mapping is valid object
    if (
      config.organizationMapping &&
      typeof config.organizationMapping !== "object"
    ) {
      errors.push({
        field: "organizationMapping",
        code: "invalid_type",
        message: "organizationMapping must be an object",
        severity: "error",
      });
    }

    // Check mapping has at least one entry
    if (
      config.organizationMapping &&
      Object.keys(config.organizationMapping).length === 0
    ) {
      errors.push({
        field: "organizationMapping",
        code: "empty",
        message: "organizationMapping must have at least one entry",
        severity: "error",
      });
    }

    // Validate payment terms if provided
    if (config.defaultPaymentTerms) {
      const validTerms = ["net30", "net60", "net90"];
      if (!validTerms.includes(config.defaultPaymentTerms)) {
        errors.push({
          field: "defaultPaymentTerms",
          code: "invalid_value",
          message: `defaultPaymentTerms must be one of: ${validTerms.join(", ")}`,
          severity: "error",
        });
      }
    }

    // Validate field mapping if provided
    if (config.invoiceFieldMapping) {
      if (typeof config.invoiceFieldMapping !== "object") {
        errors.push({
          field: "invoiceFieldMapping",
          code: "invalid_type",
          message: "invoiceFieldMapping must be an object",
          severity: "error",
        });
      }
    }

    // Validate template ID if provided
    if (config.templateId) {
      const validTemplates = ["b2c_receipt", "b2b_single", "b2b_consolidated", "b2b_consolidated_detailed"];
      if (!validTemplates.includes(config.templateId)) {
        errors.push({
          field: "templateId",
          code: "invalid_value",
          message: `templateId must be one of: ${validTemplates.join(", ")}`,
          severity: "error",
        });
      }
    }

    return errors;
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create invoice mapping behavior from legacy invoiceConfig
 *
 * Provides backward compatibility with old checkout system
 */
export function createInvoiceMappingFromLegacyConfig(legacyConfig: {
  employerSourceField: string;
  employerMapping: Record<string, string | null>;
  defaultPaymentTerms?: "net30" | "net60" | "net90";
}): InvoiceMappingConfig {
  return {
    organizationSourceField: legacyConfig.employerSourceField,
    organizationMapping: legacyConfig.employerMapping,
    defaultPaymentTerms: legacyConfig.defaultPaymentTerms,
    requireMapping: false, // Legacy system didn't require mapping
  };
}

/**
 * Example: Create invoice mapping for checkout form
 */
export function createCheckoutInvoiceMapping(
  employerField: string = "employer",
  employerToOrgMap: Record<string, string>
): InvoiceMappingConfig {
  return {
    organizationSourceField: employerField,
    organizationMapping: employerToOrgMap,
    defaultPaymentTerms: "net30",
    requireMapping: true,
  };
}

/**
 * Example: Create invoice mapping for API integration
 */
export function createAPIInvoiceMapping(
  orgIdField: string = "organization_id",
  defaultPaymentTerms: "net30" | "net60" | "net90" = "net30"
): InvoiceMappingConfig {
  return {
    organizationSourceField: orgIdField,
    organizationMapping: {}, // API provides org IDs directly
    defaultPaymentTerms,
    requireMapping: false,
    invoiceFieldMapping: {
      customer_email: "email",
      customer_name: "name",
      purchase_order: "poNumber",
    },
  };
}
