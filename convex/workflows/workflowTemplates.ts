/**
 * WORKFLOW TEMPLATES
 *
 * Pre-built workflow templates that users can instantiate and customize.
 * Templates provide starting points for common workflow patterns.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "checkout" | "registration" | "invoicing" | "automation";
  subtype: string;
  objects: Array<{
    objectType: string;
    role: string;
    description: string;
    required: boolean;
  }>;
  behaviors: Array<{
    type: string;
    enabled: boolean;
    priority: number;
    description: string;
    config: Record<string, unknown>;
  }>;
  execution: {
    triggerOn: string;
    requiredInputs?: string[];
    outputActions?: string[];
    errorHandling: "rollback" | "continue" | "notify";
  };
}

/**
 * Built-in workflow templates
 */
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "event-registration-employer-billing",
    name: "Event Registration with Employer Billing",
    description:
      "Handles event registration with automatic employer detection and invoice generation for employer-paid tickets.",
    category: "registration",
    subtype: "checkout-flow",
    objects: [
      {
        objectType: "product",
        role: "primary",
        description: "Event ticket product",
        required: true,
      },
      {
        objectType: "form",
        role: "input-source",
        description: "Registration form collecting attendee and employer info",
        required: true,
      },
      {
        objectType: "checkout",
        role: "payment-processor",
        description: "Checkout instance for payment processing",
        required: true,
      },
    ],
    behaviors: [
      {
        type: "employer-detection",
        enabled: true,
        priority: 100,
        description: "Detects employer from form data and matches to CRM",
        config: {
          employerField: "company",
          requireCrmMatch: true,
        },
      },
      {
        type: "invoice-mapping",
        enabled: true,
        priority: 90,
        description: "Maps detected employer to CRM organization",
        config: {
          organizationSourceField: "company",
          organizationMapping: {},
          defaultPaymentTerms: "net30",
          templateId: "b2b_consolidated",
        },
      },
      {
        type: "invoice-payment",
        enabled: true,
        priority: 80,
        description: "Creates invoice and skips payment step for employer billing",
        config: {
          defaultPaymentTerms: "net30",
          employerPaymentTerms: {},
          requireCrmOrganization: true,
          requireBillingAddress: false,
          autoFillFromCrm: true,
          sendInvoiceEmail: true,
          includeDetailedLineItems: true,
          includeTaxBreakdown: true,
          includeAddons: true,
        },
      },
    ],
    execution: {
      triggerOn: "checkout_start",
      requiredInputs: ["form_responses", "product_selection"],
      outputActions: ["create_invoice", "skip_payment_step"],
      errorHandling: "continue",
    },
  },
  {
    id: "simple-product-checkout",
    name: "Simple Product Checkout",
    description: "Basic checkout flow for products without special behaviors.",
    category: "checkout",
    subtype: "checkout-flow",
    objects: [
      {
        objectType: "product",
        role: "primary",
        description: "Product to sell",
        required: true,
      },
      {
        objectType: "checkout",
        role: "payment-processor",
        description: "Checkout instance for payment processing",
        required: true,
      },
    ],
    behaviors: [],
    execution: {
      triggerOn: "checkout_start",
      requiredInputs: ["product_selection"],
      outputActions: [],
      errorHandling: "rollback",
    },
  },
  {
    id: "multi-product-bundle",
    name: "Multi-Product Bundle with Discounts",
    description:
      "Checkout flow for product bundles with automatic discount application.",
    category: "checkout",
    subtype: "checkout-flow",
    objects: [
      {
        objectType: "product",
        role: "primary",
        description: "Primary product",
        required: true,
      },
      {
        objectType: "product",
        role: "bundle-item",
        description: "Additional bundled products",
        required: false,
      },
      {
        objectType: "checkout",
        role: "payment-processor",
        description: "Checkout instance",
        required: true,
      },
    ],
    behaviors: [
      // Discount behaviors can be added here when implemented
    ],
    execution: {
      triggerOn: "checkout_start",
      requiredInputs: ["product_selection"],
      outputActions: ["apply_discount"],
      errorHandling: "continue",
    },
  },
];

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * GET TEMPLATES
 * Returns all available workflow templates
 */
export const getTemplates = query({
  args: {
    sessionId: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let templates = WORKFLOW_TEMPLATES;

    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    return templates;
  },
});

/**
 * GET TEMPLATE
 * Returns a specific template by ID
 */
export const getTemplate = query({
  args: {
    sessionId: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = WORKFLOW_TEMPLATES.find((t) => t.id === args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    return template;
  },
});

// ============================================================================
// MUTATION OPERATIONS
// ============================================================================

/**
 * CREATE FROM TEMPLATE
 * Creates a new workflow based on a template
 */
export const createFromTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateId: v.string(),
    customization: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      objects: v.array(
        v.object({
          objectId: v.id("objects"),
          objectType: v.string(),
          role: v.string(),
        })
      ),
      behaviorConfig: v.optional(v.any()), // Overrides for behavior configs
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get template
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Validate that all required object types are provided
    const requiredObjectTypes = template.objects
      .filter((o) => o.required)
      .map((o) => o.objectType);

    for (const requiredType of requiredObjectTypes) {
      const hasType = args.customization.objects.some(
        (o) => o.objectType === requiredType
      );
      if (!hasType) {
        throw new Error(`Required object type missing: ${requiredType}`);
      }
    }

    // Build behaviors with custom config if provided
    const behaviors = template.behaviors.map((b, index) => {
      const customConfig =
        args.customization.behaviorConfig &&
        args.customization.behaviorConfig[index]
          ? args.customization.behaviorConfig[index]
          : b.config;

      return {
        id: `bhv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: b.type,
        enabled: b.enabled,
        priority: b.priority,
        config: customConfig,
        metadata: {
          createdAt: Date.now(),
          createdBy: userId,
        },
      };
    });

    // Create workflow object
    const workflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: template.subtype,
      organizationId: args.organizationId,
      name: args.customization.name,
      description:
        args.customization.description || template.description,
      status: "draft", // Always create as draft
      customProperties: {
        objects: args.customization.objects,
        behaviors,
        execution: template.execution,
        templateId: template.id,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "workflow_created_from_template",
      actionData: {
        templateId: template.id,
        templateName: template.name,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return workflowId;
  },
});
