/**
 * EMPLOYER DETECTION BEHAVIOR
 *
 * Extracts employer information from form responses and fetches CRM organization billing data.
 *
 * **Use Cases:**
 * - Checkout forms: Detect employer from registration form and fetch billing details
 * - Invoice generation: Get employer billing address for invoices
 * - Payment rules: Determine if employer billing applies
 *
 * **Input Types Supported:**
 * - Form: Registration form with employer field
 * - API: Direct employer ID lookup
 * - Agent: Claude can detect employer from context
 */

import type {
  BehaviorHandler,
  InputSource,
  BehaviorResult,
  BehaviorContext,
  ValidationError,
} from "../types";
import type { Id } from "../../../../convex/_generated/dataModel";

// ============================================================================
// Configuration
// ============================================================================

export interface EmployerDetectionConfig {
  /**
   * Form field that contains employer identifier (e.g., "attendee_category")
   */
  employerSourceField: string;

  /**
   * Mapping of form field values to CRM organization IDs
   * Example: { "BDE Students": "j975...", "Others": null }
   */
  employerMapping: Record<string, string | null>;

  /**
   * Whether to auto-fill billing address from CRM organization
   * @default true
   */
  autoFillBillingAddress?: boolean;

  /**
   * Whether to require CRM organization to exist
   * @default false
   */
  requireOrganization?: boolean;

  /**
   * Default payment terms if employer billing applies
   * @default "net30"
   */
  defaultPaymentTerms?: "net30" | "net60" | "net90";

  /**
   * Whether to skip payment step and create tickets immediately for employer billing
   * When enabled, emits skip_payment_step and create_tickets actions
   * @default false
   */
  skipPaymentStep?: boolean;
}

// ============================================================================
// Extracted Data (what we extract from inputs)
// ============================================================================

export interface ExtractedEmployerData {
  /**
   * Employer value from form/input (e.g., "BDE Students")
   */
  employerValue: string;

  /**
   * CRM organization ID from mapping (if found)
   */
  crmOrganizationId: string | null;

  /**
   * The input source that contained the employer data
   */
  inputSource: InputSource;
}

// ============================================================================
// Result Data (what we return after applying behavior)
// ============================================================================

export interface EmployerBillingInfo {
  type: "employer_billing";
  crmOrganizationId: Id<"objects">;
  organizationName: string;
  displayName?: string;
  legalEntityName?: string;
  vatNumber?: string;
  taxId?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  billingEmail?: string;
  billingContact?: string;
  primaryPhone?: string;
  website?: string;
  defaultPaymentTerms?: "net30" | "net60" | "net90";
  preferredPaymentMethod?: string;
  notes?: string;
  accountingReference?: string;
}

export interface EmployerDetectionResult {
  employerBilling: EmployerBillingInfo | null;
  employerValue: string | null;
  crmOrganizationId: string | null;
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const employerDetectionHandler: BehaviorHandler<
  EmployerDetectionConfig,
  ExtractedEmployerData,
  EmployerDetectionResult
> = {
  type: "employer-detection",
  name: "Employer Detection",
  description: "Extract employer from form responses and fetch CRM organization billing data",
  category: "data",
  supportedInputTypes: ["form", "api", "agent_decision", "webhook", "database"],

  /**
   * EXTRACT - Get employer identifier from inputs
   */
  extract: (
    config: EmployerDetectionConfig,
    inputs: InputSource[],
    _context: Readonly<BehaviorContext>
  ): ExtractedEmployerData | null => {
    void _context; // Required by interface but not used in this handler
    // Find first input that has employer data
    for (const input of inputs) {
      let employerValue: string | null = null;

      switch (input.type) {
        case "form": {
          // Get employer field value from form data
          const formData = input.data;
          const value = formData[config.employerSourceField] || formData.employer || formData.attendee_category;
          employerValue = typeof value === "string" ? value : null;
          break;
        }

        case "api": {
          // Direct employer ID or org ID from API
          const apiData = input.data;
          const value = apiData.employerId || apiData.crmOrganizationId;
          employerValue = typeof value === "string" ? value : null;
          break;
        }

        case "agent_decision": {
          // AI agent can specify employer in context
          const agentData = input.data;
          const value = agentData.employer;
          employerValue = typeof value === "string" ? value : null;
          break;
        }

        case "webhook": {
          // External system provides employer data
          const webhookData = input.data;
          const value = webhookData.employerId;
          employerValue = typeof value === "string" ? value : null;
          break;
        }

        case "database": {
          // Read employer from existing record
          const dbData = input.data;
          const value = dbData.crmOrganizationId;
          employerValue = typeof value === "string" ? value : null;
          break;
        }

        default:
          continue;
      }

      // If we found an employer value, look it up in mapping
      if (employerValue) {
        const crmOrganizationId = config.employerMapping[employerValue] ?? null;

        return {
          employerValue,
          crmOrganizationId,
          inputSource: input,
        };
      }
    }

    // No input had employer data
    return null;
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: EmployerDetectionConfig,
    _context?: Partial<BehaviorContext>
  ): ValidationError[] => {
    void _context; // Required by interface but not used in this handler
    const errors: ValidationError[] = [];

    // Check if config has required fields
    if (!config.employerSourceField) {
      errors.push({
        field: "employerSourceField",
        message: "employerSourceField is required",
        code: "required",
      });
    }

    if (!config.employerMapping || Object.keys(config.employerMapping).length === 0) {
      errors.push({
        field: "employerMapping",
        message: "employerMapping must contain at least one entry",
        code: "required",
      });
    }

    return errors;
  },

  /**
   * APPLY - Execute employer detection
   *
   * Returns actions to fetch CRM organization data
   */
  apply: (
    config: EmployerDetectionConfig,
    extracted: ExtractedEmployerData,
    _context: Readonly<BehaviorContext>
  ): BehaviorResult<EmployerDetectionResult> => {
    void _context; // Required by interface but not used in this handler
    const { employerValue, crmOrganizationId } = extracted;

    // If not mapped or mapped to null, return null result
    if (!crmOrganizationId) {
      return {
        success: true,
        data: {
          employerBilling: null,
          employerValue,
          crmOrganizationId: null,
        },
      };
    }

    // Validate ID format
    if (crmOrganizationId.length < 20) {
      return {
        success: false,
        errors: [`Invalid CRM organization ID: ${crmOrganizationId}`],
        data: {
          employerBilling: null,
          employerValue,
          crmOrganizationId: null,
        },
      };
    }

    // Return action to fetch CRM organization
    return {
      success: true,
      data: {
        employerBilling: {
          type: "employer_billing",
          crmOrganizationId: crmOrganizationId as Id<"objects">,
          organizationName: employerValue, // Use form value as placeholder
          billingAddress: {
            line1: "",
            city: "",
            postalCode: "",
            country: "DE",
          },
        },
        employerValue,
        crmOrganizationId,
      },
      actions: [
        {
          type: "query",
          when: "immediate",
          payload: {
            api: "crmOntology.getPublicCrmOrganizationBilling",
            args: { crmOrganizationId: crmOrganizationId as Id<"objects"> },
          },
        },
        // ✅ CONFIGURABLE: Only emit payment skip/ticket creation actions if enabled in config
        ...(config.skipPaymentStep
          ? [
              {
                type: "skip_payment_step",
                when: "immediate" as const,
                payload: {
                  reason: "employer_billing",
                  message: "Payment will be invoiced to your employer",
                },
              },
              {
                type: "create_tickets",
                when: "after_customer_info" as const,
                payload: {
                  crmOrganizationId: crmOrganizationId as Id<"objects">,
                  paymentStatus: "awaiting_employer_payment",
                },
              },
            ]
          : []),
      ],
      modifiedContext: {
        metadata: {
          crmOrganizationId: crmOrganizationId as Id<"objects">,
          employerFieldValue: employerValue,
          isEmployerBilling: true,
        },
        behaviorData: {
          employer_detection: {
            employerId: crmOrganizationId,
            employerName: employerValue,
            employerValue,
            crmOrganizationId,
            billingInfo: {
              type: "employer_billing",
              crmOrganizationId: crmOrganizationId as Id<"objects">,
              organizationName: employerValue,
              billingAddress: {
                line1: "",
                city: "",
                postalCode: "",
                country: "DE",
              },
            },
          },
        },
      },
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform CRM organization query result into EmployerBillingInfo
 */
export function transformCrmOrgToEmployerBilling(
  crmOrg: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      taxId?: string;
      billingEmail?: string;
      phone?: string;
      website?: string;
    };
  },
  config: EmployerDetectionConfig
): EmployerBillingInfo | null {
  const address = crmOrg.customProperties?.address;
  if (!address) return null;

  return {
    type: "employer_billing",
    crmOrganizationId: crmOrg._id,
    organizationName: crmOrg.name,
    displayName: crmOrg.name,
    vatNumber: crmOrg.customProperties?.taxId,
    taxId: crmOrg.customProperties?.taxId,
    billingAddress: {
      line1: address.street || "",
      city: address.city || "",
      state: address.state,
      postalCode: address.postalCode || "",
      country: address.country || "DE",
    },
    billingEmail: crmOrg.customProperties?.billingEmail,
    primaryPhone: crmOrg.customProperties?.phone,
    website: crmOrg.customProperties?.website,
    defaultPaymentTerms: config.defaultPaymentTerms,
  };
}

/**
 * Backward compatibility: Extract employer from old checkout format
 */
export function extractEmployerFromCheckoutSession(
  checkoutSession: {
    formResponses?: Array<{
      responses: Record<string, unknown>;
    }>;
  },
  config: EmployerDetectionConfig
): string | null {
  if (!checkoutSession.formResponses || checkoutSession.formResponses.length === 0) {
    return null;
  }

  const firstResponse = checkoutSession.formResponses[0];
  const employerValue = firstResponse.responses[config.employerSourceField];

  return typeof employerValue === "string" ? employerValue : null;
}
