/**
 * INVOICE PAYMENT BEHAVIOR
 *
 * Handles invoice payment processing including:
 * - Invoice creation from checkout session
 * - Payment terms configuration
 * - CRM organization linking
 * - Email notifications
 *
 * This extracts invoice-specific logic from:
 * - payment-form-step.tsx (InvoicePaymentForm component)
 * - invoice-enforcement-step.tsx
 * - paymentProviders/invoice.ts
 */

import type { BehaviorHandler, BehaviorContext, BehaviorResult } from "../types";

/**
 * Invoice Payment Config
 */
export interface InvoicePaymentConfig {
  // Payment terms
  defaultPaymentTerms: "net30" | "net60" | "net90";

  // Payment terms by employer (overrides default)
  employerPaymentTerms?: Record<string, "net30" | "net60" | "net90">;

  // Invoice numbering
  invoicePrefix?: string; // e.g., "INV-" or "2024-"
  invoiceNumberFormat?: "sequential" | "timestamp" | "uuid";

  // CRM integration
  requireCrmOrganization?: boolean; // Must have CRM org to create invoice
  autoCreateCrmOrganization?: boolean; // Auto-create if missing

  // Billing address
  requireBillingAddress?: boolean;
  autoFillFromCrm?: boolean; // Use CRM org address if available

  // Email notifications
  sendInvoiceEmail?: boolean;
  invoiceEmailTemplate?: string; // Email template ID
  ccEmails?: string[]; // Additional recipients

  // Line item details
  includeDetailedLineItems?: boolean; // Show each product separately
  includeTaxBreakdown?: boolean; // Show tax details
  includeAddons?: boolean; // Show add-ons as separate line items

  // Payment instructions
  customPaymentInstructions?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    iban?: string;
    swift?: string;
    bankName?: string;
    bankAddress?: string;
  };

  // Due date calculation
  dueDateBusinessDaysOnly?: boolean; // Exclude weekends/holidays
  gracePeriodDays?: number; // Extra days before late
}

/**
 * Invoice Payment Handler
 */
export const invoicePaymentHandler: BehaviorHandler<InvoicePaymentConfig> = {
  type: "invoice-payment",
  name: "Invoice Payment",
  description: "Configure B2B invoice generation and payment terms",
  category: "action",
  supportedInputTypes: ["form", "api"],
  supportedObjectTypes: ["checkout_instance", "crm_organization"],
  supportedWorkflows: ["checkout"],

  /**
   * Extract data needed for invoice creation
   */
  extract: (
    config: InvoicePaymentConfig,
    inputs: Array<{ type: string; data: unknown }>,
    context: Readonly<BehaviorContext>
  ) => {
    const { organizationId, workflowData = {}, behaviorData = {}, objects = [] } = context;

    // Get customer info from workflow data
    const customerInfo = workflowData.customerInfo as Record<string, unknown> | undefined;

    // Get employer from behavior data (set by employer-detection behavior)
    const employerBehaviorData = (behaviorData.employer_detection || {}) as Record<string, unknown>;
    const employerId = employerBehaviorData?.employerId as string | undefined;
    const employerName = employerBehaviorData?.employerName as string | undefined;
    const employerBillingInfo = employerBehaviorData?.billingInfo as Record<string, unknown> | undefined;

    // Get order details from objects and workflow data
    const productObjects = objects.filter(o => o.objectType === "product");
    const selectedProducts = productObjects.map(obj => ({
      productId: obj.objectId,
      quantity: obj.quantity || 1,
      price: obj.data?.price || 0,
    }));

    // Get form responses from inputs
    const formResponses = inputs.filter(i => i.type === "form").map(i => i.data);

    const totalAmount = (workflowData.totalPrice as number) || 0;
    const taxCalculation = workflowData.taxCalculation;

    // Determine payment terms
    let paymentTerms = config.defaultPaymentTerms;
    if (employerId && config.employerPaymentTerms?.[employerId]) {
      paymentTerms = config.employerPaymentTerms[employerId];
    }

    // Get billing address (priority: employer CRM > customer billing address)
    let billingAddress = customerInfo?.billingAddress;
    if (config.autoFillFromCrm && employerBillingInfo?.billingAddress) {
      billingAddress = employerBillingInfo.billingAddress;
    }

    return {
      organizationId,
      customerInfo,
      employerId,
      employerName,
      employerBillingInfo,
      selectedProducts,
      formResponses,
      totalAmount,
      taxCalculation,
      paymentTerms,
      billingAddress,
    };
  },

  /**
   * Apply invoice payment configuration
   */
  apply: (
    config: InvoicePaymentConfig,
    extractedData: unknown,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<unknown> => {
    const data = extractedData as Record<string, unknown>;
    const {
      organizationId,
      customerInfo,
      employerId,
      employerName,
      employerBillingInfo,
      selectedProducts,
      formResponses,
      totalAmount,
      taxCalculation,
      paymentTerms,
      billingAddress,
    } = data;

    // Validate requirements
    if (config.requireCrmOrganization && !employerId) {
      return {
        success: false,
        errors: ["Invoice payment requires a CRM organization. Please select an employer or contact support."],
      };
    }

    if (config.requireBillingAddress && !billingAddress) {
      return {
        success: false,
        errors: ["Invoice payment requires a billing address. Please provide company billing details."],
      };
    }

    // Calculate due date
    const now = new Date();
    const daysToAdd = paymentTerms === "net30" ? 30 : paymentTerms === "net60" ? 60 : 90;

    const dueDate = new Date(now);
    if (config.dueDateBusinessDaysOnly) {
      // Add business days only
      let addedDays = 0;
      while (addedDays < daysToAdd) {
        dueDate.setDate(dueDate.getDate() + 1);
        const dayOfWeek = dueDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
          addedDays++;
        }
      }
    } else {
      // Add calendar days
      dueDate.setDate(dueDate.getDate() + daysToAdd);
    }

    // Add grace period
    if (config.gracePeriodDays) {
      dueDate.setDate(dueDate.getDate() + config.gracePeriodDays);
    }

    // Build line items
    const lineItems: Array<Record<string, unknown>> = [];

    if (config.includeDetailedLineItems && Array.isArray(selectedProducts)) {
      // Add each product as separate line item
      (selectedProducts as Array<Record<string, unknown>>).forEach((sp) => {
        const products = data.products as Array<Record<string, unknown>> | undefined;
        const product = products?.find((p) => p._id === sp.productId);
        const price = typeof sp.price === 'number' ? sp.price : 0;
        const quantity = typeof sp.quantity === 'number' ? sp.quantity : 1;
        lineItems.push({
          type: "product",
          description: product?.name || "Product",
          quantity,
          unitPrice: price,
          totalPrice: price * quantity,
          productId: sp.productId,
        });
      });

      // Add add-ons as separate line items
      if (config.includeAddons && Array.isArray(formResponses) && formResponses.length > 0) {
        (formResponses as Array<Record<string, unknown>>).forEach((fr) => {
          const addedCosts = fr.addedCosts as number;
          if (addedCosts > 0) {
            lineItems.push({
              type: "addon",
              description: `Add-ons (Ticket ${fr.ticketNumber as string})`,
              quantity: 1,
              unitPrice: addedCosts,
              totalPrice: addedCosts,
              ticketNumber: fr.ticketNumber as string,
            });
          }
        });
      }
    } else {
      // Single line item for entire order
      lineItems.push({
        type: "order",
        description: "Order Total",
        quantity: 1,
        unitPrice: totalAmount,
        totalPrice: totalAmount,
      });
    }

    // Add tax line item
    const taxCalc = taxCalculation as { taxAmount?: number; taxRate?: number; subtotal?: number } | undefined;
    if (config.includeTaxBreakdown && taxCalc && typeof taxCalc.taxAmount === 'number' && taxCalc.taxAmount > 0) {
      lineItems.push({
        type: "tax",
        description: `Tax (${(taxCalc.taxRate || 0).toFixed(1)}%)`,
        quantity: 1,
        unitPrice: taxCalc.taxAmount,
        totalPrice: taxCalc.taxAmount,
      });
    }

    // Build invoice data
    const custInfo = (customerInfo as Record<string, unknown> | undefined) || {};
    const empBillingInfo = (employerBillingInfo as Record<string, unknown> | undefined) || {};
    const invoiceData = {
      // Customer/Employer info
      billToName: (employerName as string) || (custInfo.companyName as string) || (custInfo.name as string),
      billToEmail: (empBillingInfo.billingEmail as string) || (custInfo.email as string),
      billToAddress: billingAddress,
      vatNumber: (empBillingInfo.vatNumber as string) || (custInfo.vatNumber as string),

      // CRM linking
      crmOrganizationId: employerId,

      // Amounts
      subtotal: taxCalc?.subtotal || totalAmount,
      taxAmount: taxCalc?.taxAmount || 0,
      totalAmount,
      currency: (data.currency as string) || "USD",

      // Payment terms
      paymentTerms,
      issueDate: now,
      dueDate,

      // Line items
      lineItems,

      // Payment instructions
      paymentInstructions: config.customPaymentInstructions,
      bankDetails: config.bankDetails,

      // Email settings
      sendEmail: config.sendInvoiceEmail ?? true,
      emailTemplate: config.invoiceEmailTemplate,
      ccEmails: config.ccEmails || [],
    };

    const result = {
      invoiceData,
      skipPaymentStep: true, // Invoice doesn't need payment form
      showConfirmation: true, // Show invoice confirmation step
    };

    return {
      success: true,
      data: result,
      // ✅ Return action to be executed by checkout
      actions: [{
        type: "create_invoice",
        payload: invoiceData,
        priority: 100,
        when: "immediate", // Execute immediately when reaching confirmation step
      }],
    };
  },

  /**
   * Validate invoice payment configuration
   */
  validate: (config: InvoicePaymentConfig, _context?: Partial<BehaviorContext>) => {
    const errors: string[] = [];

    // Validate payment terms
    const validTerms = ["net30", "net60", "net90"];
    if (!validTerms.includes(config.defaultPaymentTerms)) {
      errors.push("defaultPaymentTerms must be 'net30', 'net60', or 'net90'");
    }

    // Validate employer-specific payment terms
    if (config.employerPaymentTerms) {
      Object.entries(config.employerPaymentTerms).forEach(([employerId, terms]) => {
        if (!validTerms.includes(terms)) {
          errors.push(`Invalid payment terms for employer ${employerId}: ${terms}`);
        }
      });
    }

    // Validate grace period
    if (config.gracePeriodDays !== undefined && config.gracePeriodDays < 0) {
      errors.push("gracePeriodDays must be >= 0");
    }

    if (config.gracePeriodDays !== undefined && config.gracePeriodDays > 90) {
      errors.push("gracePeriodDays must be <= 90");
    }

    // Validate email addresses
    if (config.ccEmails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      config.ccEmails.forEach((email) => {
        if (!emailRegex.test(email)) {
          errors.push(`Invalid CC email address: ${email}`);
        }
      });
    }

    return errors.map(err => ({
      field: "config",
      message: err,
      code: "invalid_value",
      severity: "error" as const,
    }));
  },
};
