/**
 * WORKFLOW VALIDATION
 *
 * Validates workflow configurations to ensure they're properly set up.
 * Catches configuration errors before execution.
 */

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate employer detection workflow config
 */
export function validateEmployerDetection(config: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.employerSourceField || typeof config.employerSourceField !== "string") {
    errors.push({
      field: "employerSourceField",
      message: "employerSourceField is required and must be a string",
    });
  }

  if (!config.employerMapping || typeof config.employerMapping !== "object") {
    errors.push({
      field: "employerMapping",
      message: "employerMapping is required and must be an object",
    });
  }

  // Optional fields - only validate if present
  if (config.requireOrganization !== undefined && typeof config.requireOrganization !== "boolean") {
    errors.push({
      field: "requireOrganization",
      message: "requireOrganization must be a boolean",
    });
  }

  if (config.autoFillBillingAddress !== undefined && typeof config.autoFillBillingAddress !== "boolean") {
    errors.push({
      field: "autoFillBillingAddress",
      message: "autoFillBillingAddress must be a boolean",
    });
  }

  const validPaymentTerms = ["net30", "net60", "net90"];
  if (config.defaultPaymentTerms && !validPaymentTerms.includes(config.defaultPaymentTerms)) {
    errors.push({
      field: "defaultPaymentTerms",
      message: `defaultPaymentTerms must be one of: ${validPaymentTerms.join(", ")}`,
    });
  }

  return errors;
}

/**
 * Validate invoice mapping workflow config
 */
export function validateInvoiceMapping(config: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for organizationSourceField (new field name)
  const sourceFieldName = config.organizationSourceField || config.sourceField;
  if (!sourceFieldName || typeof sourceFieldName !== "string") {
    errors.push({
      field: "organizationSourceField",
      message: "organizationSourceField is required and must be a string",
    });
  }

  // Check for organizationMapping (new field name)
  const mapping = config.organizationMapping || config.mapping;
  if (!mapping || typeof mapping !== "object") {
    errors.push({
      field: "organizationMapping",
      message: "organizationMapping is required and must be an object",
    });
  } else {
    // Validate mapping structure (keys are strings, values are strings or null)
    for (const [key, value] of Object.entries(mapping)) {
      if (typeof key !== "string") {
        errors.push({
          field: "organizationMapping",
          message: `Invalid mapping key: ${key} (must be string)`,
        });
      }
      if (value !== null && typeof value !== "string") {
        errors.push({
          field: "organizationMapping",
          message: `Invalid mapping value for "${key}": ${value} (must be string or null)`,
        });
      }
    }
  }

  // Validate payment terms if provided
  const validPaymentTerms = ["net30", "net60", "net90"];
  if (
    config.defaultPaymentTerms &&
    !validPaymentTerms.includes(config.defaultPaymentTerms)
  ) {
    errors.push({
      field: "defaultPaymentTerms",
      message: `Invalid defaultPaymentTerms: ${config.defaultPaymentTerms} (must be one of: ${validPaymentTerms.join(", ")})`,
    });
  }

  // Validate template ID if provided
  const validTemplates = ["b2c_receipt", "b2b_single", "b2b_consolidated", "b2b_consolidated_detailed"];
  if (config.templateId && !validTemplates.includes(config.templateId)) {
    errors.push({
      field: "templateId",
      message: `Invalid templateId: ${config.templateId} (must be one of: ${validTemplates.join(", ")})`,
    });
  }

  // Validate payment terms by org if provided
  if (config.paymentTermsByOrg && typeof config.paymentTermsByOrg === "object") {
    for (const [orgId, terms] of Object.entries(config.paymentTermsByOrg)) {
      if (!validPaymentTerms.includes(terms as string)) {
        errors.push({
          field: "paymentTermsByOrg",
          message: `Invalid payment terms for org ${orgId}: ${terms} (must be one of: ${validPaymentTerms.join(", ")})`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate workflow configuration based on type (old function for single behavior)
 */
export function validateWorkflowConfigOld(
  workflowType: string,
  config: any
): ValidationError[] {
  switch (workflowType) {
    case "employer-detection":
    case "employer_detection":
      return validateEmployerDetection(config);
    case "invoice-mapping":
    case "invoice_mapping":
      return validateInvoiceMapping(config);
    // Payment behaviors - no validation needed (handled by payment providers)
    case "invoice-payment":
    case "invoice_payment":
    case "stripe-payment":
    case "stripe_payment":
    case "payment-provider-selection":
    case "payment_provider_selection":
      return []; // Basic validation - config is provider-specific
    // Other behaviors - allow with basic validation
    case "form-linking":
    case "form_linking":
    case "addon-calculation":
    case "addon_calculation":
    case "tax-calculation":
    case "tax_calculation":
    case "consolidated-invoice-generation":
      return []; // Basic validation - these have complex configs
    default:
      // Don't fail on unknown types - behaviors are extensible
      console.warn(`Unknown behavior type: ${workflowType}, skipping validation`);
      return [];
  }
}

/**
 * Validate workflow configuration (for standalone workflows with behaviors array)
 */
export function validateWorkflowConfig(
  behaviors: Array<{ type: string; config: any }>
): string[] {
  const errors: string[] = [];

  for (const behavior of behaviors) {
    const behaviorErrors = validateWorkflowConfigOld(behavior.type, behavior.config);
    if (behaviorErrors.length > 0) {
      errors.push(
        ...behaviorErrors.map((e) => `${behavior.type}.${e.field}: ${e.message}`)
      );
    }
  }

  return errors;
}

/**
 * Validate object references exist in database
 */
export async function validateObjectReferences(
  ctx: any,
  objects: Array<{ objectId: any; objectType: string }>
): Promise<string[]> {
  const errors: string[] = [];

  for (const obj of objects) {
    try {
      const dbObject = await ctx.db.get(obj.objectId);
      if (!dbObject) {
        errors.push(`Object not found: ${obj.objectId}`);
      } else if (dbObject.type !== obj.objectType) {
        errors.push(
          `Object type mismatch for ${obj.objectId}: expected ${obj.objectType}, got ${dbObject.type}`
        );
      }
    } catch (error) {
      errors.push(`Error validating object ${obj.objectId}: ${error}`);
    }
  }

  return errors;
}
