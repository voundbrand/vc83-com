/**
 * ADDON CALCULATION BEHAVIOR
 *
 * Calculates add-on quantities based on form responses or other input data.
 * Maps form field values to add-on quantities using configurable rules.
 *
 * **Use Cases:**
 * - Event Registration: "How many guests?" → Add guest tickets
 * - Product Customization: Select options → Add customization fees
 * - Subscription Tiers: Select tier → Add features/services
 *
 * **Input Types Supported:**
 * - Form: Read form responses and map to add-ons
 * - API: External system provides add-on requirements
 * - Agent: AI agent determines add-ons needed
 */

import type {
  BehaviorHandler,
  InputSource,
  BehaviorResult,
  BehaviorContext,
  ValidationError,
} from "../types";

// ============================================================================
// Configuration
// ============================================================================

export interface AddonDefinition {
  /**
   * Unique identifier for this add-on
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Optional icon (emoji or URL)
   */
  icon?: string;

  /**
   * Price per unit (in cents)
   */
  pricePerUnit: number;

  /**
   * Currency code (ISO 4217)
   */
  currency: string;

  /**
   * Whether this add-on is taxable
   * @default true
   */
  taxable?: boolean;

  /**
   * Stripe tax code (e.g., "txcd_10401000")
   */
  taxCode?: string;

  /**
   * Form field IDs that trigger this add-on
   * Can be multiple fields (quantities will be summed based on strategy)
   */
  formFieldIds: string[];

  /**
   * Mapping from form field value to quantity
   * e.g., { "0": 0, "1": 1, "2": 2 }
   * or { "yes": 1, "no": 0 }
   */
  formFieldMapping: Record<string, number>;

  /**
   * Maximum quantity allowed
   */
  maxQuantity?: number;

  /**
   * Minimum quantity required
   * @default 0
   */
  minQuantity?: number;
}

export interface AddonCalculationConfig {
  /**
   * List of add-ons to calculate
   */
  addons: AddonDefinition[];

  /**
   * How to calculate quantities when multiple fields contribute
   * - "sum": Add all quantities together
   * - "max": Take the maximum quantity
   * - "min": Take the minimum quantity
   * - "first": Use first field's quantity only
   * @default "sum"
   */
  calculationStrategy?: "sum" | "max" | "min" | "first";

  /**
   * Whether to fail if required fields are missing
   * @default false
   */
  requireAllFields?: boolean;
}

// ============================================================================
// Extracted Data (what we extract from inputs)
// ============================================================================

export interface ExtractedAddonData {
  /**
   * Calculated quantities for each add-on
   */
  addonQuantities: Array<{
    addonId: string;
    addonName: string;
    quantity: number;
    pricePerUnit: number;
    currency: string;
    taxable: boolean;
    taxCode?: string;
    sourceFields: Array<{
      fieldId: string;
      fieldValue: unknown;
      mappedQuantity: number;
    }>;
  }>;

  /**
   * Missing fields (if requireAllFields is true)
   */
  missingFields: string[];
}

// ============================================================================
// Result Data (what we return after applying behavior)
// ============================================================================

export interface AddonCalculationResult {
  type: "addon_calculation";
  lineItems: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    currency: string;
    taxable: boolean;
    taxCode?: string;
  }>;
  totalAddonCost: number;
  currency: string;
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const addonCalculationHandler: BehaviorHandler<
  AddonCalculationConfig,
  ExtractedAddonData,
  AddonCalculationResult
> = {
  type: "addon-calculation",
  name: "Add-on Calculation",
  description: "Calculate add-on quantities from form responses using configurable mappings",
  category: "data",
  supportedInputTypes: ["form", "api", "agent_decision", "database"],
  supportedObjectTypes: ["product", "event_ticket", "service"],
  supportedWorkflows: ["checkout", "events", "registration"],

  /**
   * EXTRACT - Calculate add-on quantities from form responses
   */
  extract: (
    config: AddonCalculationConfig,
    inputs: InputSource[],
    _context: Readonly<BehaviorContext>
  ): ExtractedAddonData | null => {
    const addonQuantities: ExtractedAddonData["addonQuantities"] = [];
    const missingFields: string[] = [];

    // Collect all form data
    const allFormData: Record<string, unknown> = {};
    for (const input of inputs) {
      if (input.type === "form") {
        Object.assign(allFormData, input.data);
      }
    }

    // Calculate quantity for each add-on
    for (const addon of config.addons) {
      const sourceFields: Array<{
        fieldId: string;
        fieldValue: unknown;
        mappedQuantity: number;
      }> = [];

      let calculatedQuantity = 0;
      const strategy = config.calculationStrategy || "sum";

      // Process each form field for this add-on
      for (const fieldId of addon.formFieldIds) {
        const fieldValue = allFormData[fieldId];

        // Check if field exists
        if (fieldValue === undefined) {
          missingFields.push(fieldId);
          continue;
        }

        // Map field value to quantity using formFieldMapping
        const valueStr = String(fieldValue);
        const mappedQuantity = addon.formFieldMapping[valueStr];

        // If no mapping found, try numeric value directly
        const quantity =
          mappedQuantity !== undefined
            ? mappedQuantity
            : typeof fieldValue === "number"
              ? fieldValue
              : 0;

        sourceFields.push({
          fieldId,
          fieldValue,
          mappedQuantity: quantity,
        });

        // Apply calculation strategy
        switch (strategy) {
          case "sum":
            calculatedQuantity += quantity;
            break;
          case "max":
            calculatedQuantity = Math.max(calculatedQuantity, quantity);
            break;
          case "min":
            if (calculatedQuantity === 0) {
              calculatedQuantity = quantity;
            } else {
              calculatedQuantity = Math.min(calculatedQuantity, quantity);
            }
            break;
          case "first":
            if (calculatedQuantity === 0) {
              calculatedQuantity = quantity;
            }
            break;
        }
      }

      // Apply min/max constraints
      if (addon.minQuantity !== undefined) {
        calculatedQuantity = Math.max(calculatedQuantity, addon.minQuantity);
      }
      if (addon.maxQuantity !== undefined) {
        calculatedQuantity = Math.min(calculatedQuantity, addon.maxQuantity);
      }

      // Only add if quantity > 0
      if (calculatedQuantity > 0) {
        addonQuantities.push({
          addonId: addon.id,
          addonName: addon.name,
          quantity: calculatedQuantity,
          pricePerUnit: addon.pricePerUnit,
          currency: addon.currency,
          taxable: addon.taxable ?? true,
          taxCode: addon.taxCode,
          sourceFields,
        });
      }
    }

    return {
      addonQuantities,
      missingFields,
    };
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: AddonCalculationConfig,
    _context?: Partial<BehaviorContext>
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Check required fields
    if (!config.addons || !Array.isArray(config.addons)) {
      errors.push({
        field: "addons",
        message: "addons must be an array",
        code: "invalid_type",
        severity: "error",
      });
      return errors;
    }

    if (config.addons.length === 0) {
      errors.push({
        field: "addons",
        message: "addons must contain at least one add-on",
        code: "required",
        severity: "error",
      });
    }

    // Validate each add-on
    config.addons.forEach((addon, index) => {
      const prefix = `addons[${index}]`;

      if (!addon.id) {
        errors.push({
          field: `${prefix}.id`,
          message: "Add-on ID is required",
          code: "required",
          severity: "error",
        });
      }

      if (!addon.name) {
        errors.push({
          field: `${prefix}.name`,
          message: "Add-on name is required",
          code: "required",
          severity: "error",
        });
      }

      if (addon.pricePerUnit === undefined || addon.pricePerUnit < 0) {
        errors.push({
          field: `${prefix}.pricePerUnit`,
          message: "Add-on price must be >= 0",
          code: "invalid_value",
          severity: "error",
        });
      }

      if (!addon.currency) {
        errors.push({
          field: `${prefix}.currency`,
          message: "Add-on currency is required",
          code: "required",
          severity: "error",
        });
      }

      if (!addon.formFieldIds || addon.formFieldIds.length === 0) {
        errors.push({
          field: `${prefix}.formFieldIds`,
          message: "Add-on must have at least one form field",
          code: "required",
          severity: "error",
        });
      }

      if (!addon.formFieldMapping || typeof addon.formFieldMapping !== "object") {
        errors.push({
          field: `${prefix}.formFieldMapping`,
          message: "Add-on formFieldMapping is required and must be an object",
          code: "required",
          severity: "error",
        });
      }

      if (addon.maxQuantity !== undefined && addon.maxQuantity < 1) {
        errors.push({
          field: `${prefix}.maxQuantity`,
          message: "Add-on maxQuantity must be at least 1",
          code: "invalid_value",
          severity: "error",
        });
      }
    });

    // Validate calculation strategy
    if (config.calculationStrategy) {
      const validStrategies = ["sum", "max", "min", "first"];
      if (!validStrategies.includes(config.calculationStrategy)) {
        errors.push({
          field: "calculationStrategy",
          message: `calculationStrategy must be one of: ${validStrategies.join(", ")}`,
          code: "invalid_value",
          severity: "error",
        });
      }
    }

    return errors;
  },

  /**
   * APPLY - Execute add-on calculation
   *
   * Returns line items to add to cart
   */
  apply: (
    config: AddonCalculationConfig,
    extracted: ExtractedAddonData,
    _context: Readonly<BehaviorContext>
  ): BehaviorResult<AddonCalculationResult> => {
    const { addonQuantities, missingFields } = extracted;

    // Check for missing required fields
    if (config.requireAllFields && missingFields.length > 0) {
      return {
        success: false,
        errors: [`Missing required form fields: ${missingFields.join(", ")}`],
      };
    }

    // If no add-ons calculated, skip
    if (addonQuantities.length === 0) {
      return {
        success: true,
        skipped: true,
        data: null,
        warnings: ["No add-ons calculated from form responses"],
      };
    }

    // Build line items
    const lineItems = addonQuantities.map((addon) => ({
      id: addon.addonId,
      name: addon.addonName,
      description: config.addons.find((a) => a.id === addon.addonId)?.description,
      icon: config.addons.find((a) => a.id === addon.addonId)?.icon,
      quantity: addon.quantity,
      pricePerUnit: addon.pricePerUnit,
      totalPrice: addon.quantity * addon.pricePerUnit,
      currency: addon.currency,
      taxable: addon.taxable,
      taxCode: addon.taxCode,
    }));

    const totalAddonCost = lineItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const result: AddonCalculationResult = {
      type: "addon_calculation",
      lineItems,
      totalAddonCost,
      currency: lineItems[0]?.currency || "USD",
    };

    return {
      success: true,
      data: result,
      actions: [
        {
          type: "add_line_items",
          when: "immediate",
          payload: {
            lineItems: lineItems.map((item) => ({
              type: "addon",
              id: item.id,
              name: item.name,
              description: item.description,
              icon: item.icon,
              quantity: item.quantity,
              unitAmount: item.pricePerUnit,
              currency: item.currency,
              taxable: item.taxable,
              taxCode: item.taxCode,
            })),
          },
        },
      ],
      modifiedContext: {
        behaviorData: {
          addon_calculation: result,
        },
        workflowData: {
          addonTotalCost: totalAddonCost,
          addonLineItems: lineItems,
        },
      },
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple addon with 1:1 quantity mapping
 */
export function createSimpleAddon(
  id: string,
  name: string,
  formFieldId: string,
  pricePerUnit: number,
  currency: string = "USD"
): AddonDefinition {
  return {
    id,
    name,
    pricePerUnit,
    currency,
    formFieldIds: [formFieldId],
    formFieldMapping: {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
    },
    taxable: true,
  };
}

/**
 * Create a boolean addon (yes/no)
 */
export function createBooleanAddon(
  id: string,
  name: string,
  formFieldId: string,
  pricePerUnit: number,
  currency: string = "USD"
): AddonDefinition {
  return {
    id,
    name,
    pricePerUnit,
    currency,
    formFieldIds: [formFieldId],
    formFieldMapping: {
      yes: 1,
      true: 1,
      "1": 1,
      no: 0,
      false: 0,
      "0": 0,
    },
    taxable: true,
  };
}
