/**
 * FORM LINKING BEHAVIOR
 *
 * Determines which forms should be shown during a workflow (e.g., checkout)
 * and when/how they should be collected.
 *
 * **Use Cases:**
 * - Checkout: Show registration forms during checkout flow
 * - Post-purchase: Send form links via email after payment
 * - Standalone: Generate form links for separate completion
 *
 * **Input Types Supported:**
 * - Form: Can check existing form responses to determine if more needed
 * - API: External system can request form collection
 * - Agent: AI agent can determine form requirements
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

export interface FormLinkingConfig {
  /**
   * Form ID to link (Convex ID)
   */
  formId: Id<"objects">;

  /**
   * When to collect the form
   */
  timing: "duringCheckout" | "afterPurchase" | "standalone";

  /**
   * Whether form completion is required
   * @default true
   */
  required?: boolean;

  /**
   * Optional trigger conditions
   */
  triggerConditions?: {
    /**
     * Only show form for these product subtypes
     * e.g., ["ticket", "physical"]
     */
    productSubtype?: string[];

    /**
     * Minimum quantity required to trigger form
     * e.g., 1 (at least one item), 2 (two or more items)
     */
    minQuantity?: number;

    /**
     * Only show form if specific field has value
     * e.g., { field: "attendee_category", value: "BDE Students" }
     */
    conditionalField?: {
      field: string;
      value: string | string[];
    };
  };
}

// ============================================================================
// Extracted Data (what we extract from inputs)
// ============================================================================

export interface ExtractedFormData {
  /**
   * Whether the trigger conditions are met
   */
  shouldShowForm: boolean;

  /**
   * Reason for showing/not showing form
   */
  reason: string;

  /**
   * Product subtypes in cart (for conditional logic)
   */
  productSubtypes: string[];

  /**
   * Total quantity (for conditional logic)
   */
  totalQuantity: number;

  /**
   * Existing form responses (if any)
   */
  existingResponses?: Record<string, unknown>;
}

// ============================================================================
// Result Data (what we return after applying behavior)
// ============================================================================

export interface FormLinkingResult {
  type: "form_linking";
  formId: Id<"objects">;
  timing: "duringCheckout" | "afterPurchase" | "standalone";
  required: boolean;
  shouldShow: boolean;
  reason: string;
  formUrl?: string;
  emailTemplate?: string;
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const formLinkingHandler: BehaviorHandler<
  FormLinkingConfig,
  ExtractedFormData,
  FormLinkingResult
> = {
  type: "form_linking",
  name: "Form Linking",
  description: "Link forms to workflows and determine when/how to collect them",
  category: "data",
  supportedInputTypes: ["form", "api", "agent_decision", "database"],
  supportedObjectTypes: ["product", "event_ticket", "service"],
  supportedWorkflows: ["checkout", "events", "registration"],

  /**
   * EXTRACT - Determine if form should be shown based on context
   */
  extract: (
    config: FormLinkingConfig,
    inputs: InputSource[],
    context: Readonly<BehaviorContext>
  ): ExtractedFormData | null => {
    // Check trigger conditions
    const { triggerConditions } = config;

    // Extract product subtypes and quantities from context
    const productSubtypes: string[] = [];
    let totalQuantity = 0;

    for (const obj of context.objects || []) {
      if (obj.data?.subtype) {
        productSubtypes.push(obj.data.subtype as string);
      }
      totalQuantity += obj.quantity || 1;
    }

    // Check if we should show form based on conditions
    let shouldShowForm = true;
    let reason = "Default: show form";

    // Check product subtype condition
    if (triggerConditions?.productSubtype) {
      const matchesSubtype = productSubtypes.some((st) =>
        triggerConditions.productSubtype?.includes(st)
      );
      if (!matchesSubtype) {
        shouldShowForm = false;
        reason = `Product subtype ${productSubtypes.join(", ")} not in ${triggerConditions.productSubtype.join(", ")}`;
      }
    }

    // Check minimum quantity condition
    if (triggerConditions?.minQuantity) {
      if (totalQuantity < triggerConditions.minQuantity) {
        shouldShowForm = false;
        reason = `Quantity ${totalQuantity} less than minimum ${triggerConditions.minQuantity}`;
      }
    }

    // Check conditional field condition
    if (triggerConditions?.conditionalField && shouldShowForm) {
      const { field, value } = triggerConditions.conditionalField;

      // Look for field value in form inputs
      let fieldValue: unknown = null;
      for (const input of inputs) {
        if (input.type === "form" && input.data[field] !== undefined) {
          fieldValue = input.data[field];
          break;
        }
      }

      const expectedValues = Array.isArray(value) ? value : [value];
      const matches = expectedValues.includes(String(fieldValue));

      if (!matches) {
        shouldShowForm = false;
        reason = `Field ${field} value "${fieldValue}" not in [${expectedValues.join(", ")}]`;
      }
    }

    // Check for existing form responses
    let existingResponses: Record<string, unknown> | undefined;
    for (const input of inputs) {
      if (input.type === "form" && input.sourceObjectId === config.formId) {
        existingResponses = input.data;
        reason = "Form already submitted";
        break;
      }
    }

    return {
      shouldShowForm,
      reason,
      productSubtypes,
      totalQuantity,
      existingResponses,
    };
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: FormLinkingConfig,
    _context?: Partial<BehaviorContext>
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Check required fields
    if (!config.formId) {
      errors.push({
        field: "formId",
        message: "formId is required",
        code: "required",
        severity: "error",
      });
    }

    if (!config.timing) {
      errors.push({
        field: "timing",
        message: "timing is required",
        code: "required",
        severity: "error",
      });
    }

    // Validate timing value
    const validTimings = ["duringCheckout", "afterPurchase", "standalone"];
    if (config.timing && !validTimings.includes(config.timing)) {
      errors.push({
        field: "timing",
        message: `timing must be one of: ${validTimings.join(", ")}`,
        code: "invalid_value",
        severity: "error",
      });
    }

    // Validate trigger conditions if provided
    if (config.triggerConditions) {
      const { minQuantity, conditionalField } = config.triggerConditions;

      if (minQuantity !== undefined && minQuantity < 1) {
        errors.push({
          field: "triggerConditions.minQuantity",
          message: "minQuantity must be at least 1",
          code: "invalid_value",
          severity: "error",
        });
      }

      if (conditionalField) {
        if (!conditionalField.field) {
          errors.push({
            field: "triggerConditions.conditionalField.field",
            message: "conditionalField.field is required when conditionalField is set",
            code: "required",
            severity: "error",
          });
        }

        if (!conditionalField.value) {
          errors.push({
            field: "triggerConditions.conditionalField.value",
            message: "conditionalField.value is required when conditionalField is set",
            code: "required",
            severity: "error",
          });
        }
      }
    }

    return errors;
  },

  /**
   * APPLY - Execute form linking logic
   *
   * Returns actions to display form or send form link
   */
  apply: (
    config: FormLinkingConfig,
    extracted: ExtractedFormData,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<FormLinkingResult> => {
    const { shouldShowForm, reason, existingResponses } = extracted;

    // If form already submitted, skip
    if (existingResponses) {
      return {
        success: true,
        skipped: true,
        data: null,
        warnings: ["Form already submitted, skipping form linking"],
      };
    }

    // If conditions not met, skip
    if (!shouldShowForm) {
      return {
        success: true,
        skipped: true,
        data: null,
        warnings: [`Form not shown: ${reason}`],
      };
    }

    const result: FormLinkingResult = {
      type: "form_linking",
      formId: config.formId,
      timing: config.timing,
      required: config.required ?? true,
      shouldShow: true,
      reason,
    };

    const actions = [];

    // Generate appropriate action based on timing
    switch (config.timing) {
      case "duringCheckout":
        // Add form to checkout flow
        actions.push({
          type: "show_form",
          when: "immediate" as const,
          payload: {
            formId: config.formId,
            required: config.required ?? true,
            position: "beforePayment",
          },
        });
        break;

      case "afterPurchase":
        // Send form link via email after purchase
        actions.push({
          type: "send_form_link",
          when: "deferred" as const,
          payload: {
            formId: config.formId,
            required: config.required ?? true,
            emailTemplate: "post_purchase_form",
            expiryHours: 168, // 7 days
          },
        });
        break;

      case "standalone":
        // Generate standalone form link
        actions.push({
          type: "generate_form_link",
          when: "immediate" as const,
          payload: {
            formId: config.formId,
            sessionId: context.sessionId,
          },
        });
        break;
    }

    return {
      success: true,
      data: result,
      actions,
      modifiedContext: {
        behaviorData: {
          form_linking: result,
        },
        workflowData: {
          ...context.workflowData,
          linkedFormId: config.formId,
          formRequired: config.required ?? true,
        },
      },
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if form has been completed for this session
 */
export function isFormCompleted(
  formId: Id<"objects">,
  inputs: InputSource[]
): boolean {
  return inputs.some(
    (input) =>
      input.type === "form" &&
      input.sourceObjectId === formId &&
      Object.keys(input.data).length > 0
  );
}

/**
 * Extract form responses for a specific form
 */
export function getFormResponses(
  formId: Id<"objects">,
  inputs: InputSource[]
): Record<string, unknown> | null {
  const formInput = inputs.find(
    (input) => input.type === "form" && input.sourceObjectId === formId
  );

  return formInput ? formInput.data : null;
}
