/**
 * STRIPE PAYMENT BEHAVIOR
 *
 * Handles Stripe payment processing including:
 * - Payment intent creation
 * - Stripe Elements configuration
 * - Payment confirmation
 * - Error handling
 *
 * This extracts Stripe-specific logic from:
 * - payment-form-step.tsx (StripePaymentForm component)
 * - checkoutSessions.ts (createPaymentIntentForSession)
 */

import type { BehaviorHandler, BehaviorContext, BehaviorResult } from "../types";

/**
 * Stripe Payment Config
 */
export interface StripePaymentConfig {
  // Stripe Elements styling
  elementsStyle?: {
    base?: {
      fontSize?: string;
      color?: string;
      fontFamily?: string;
      "::placeholder"?: {
        color?: string;
      };
    };
    invalid?: {
      color?: string;
      iconColor?: string;
    };
  };

  // Payment intent options
  paymentIntentOptions?: {
    setupFutureUsage?: "on_session" | "off_session"; // Save card for later
    captureMethod?: "automatic" | "manual"; // When to capture payment
  };

  // Billing details to collect
  collectBillingDetails?: {
    name?: boolean;
    email?: boolean;
    phone?: boolean;
    address?: boolean;
  };

  // Error handling
  retryOnFailure?: boolean;
  maxRetries?: number;

  // Metadata to attach to payment
  includeMetadata?: boolean;
  customMetadata?: Record<string, string>;
}

/**
 * Stripe Payment Handler
 */
export const stripePaymentHandler: BehaviorHandler<StripePaymentConfig> = {
  type: "stripe-payment",
  name: "Stripe Payment",
  description: "Configure Stripe payment processing and styling",
  category: "action",
  supportedInputTypes: ["form", "api"],
  supportedObjectTypes: ["checkout_instance"],
  supportedWorkflows: ["checkout"],

  /**
   * Extract data needed for Stripe payment
   */
  extract: (
    config: StripePaymentConfig,
    inputs: Array<{ type: string; data: unknown }>,
    context: Readonly<BehaviorContext>
  ) => {
    const { organizationId, workflowData = {}, objects = [] } = context;

    // Get customer info from workflow data
    const customerInfo = workflowData.customerInfo as Record<string, unknown> | undefined;

    // Get order details from workflow data
    const totalAmount = (workflowData.totalPrice as number) || 0;

    // Get currency from first product object
    const firstProduct = objects.find(o => o.objectType === "product");
    const currency = firstProduct?.data?.currency || "EUR";

    // Get tax calculation from workflow data (set by tax-calculation behavior)
    const taxCalculation = workflowData.taxCalculation;

    // Build billing address (if B2B)
    const billingAddress = customerInfo?.transactionType === "B2B" && customerInfo.billingAddress
      ? customerInfo.billingAddress
      : undefined;

    // Build metadata
    const metadata: Record<string, string> = {
      organizationId: organizationId.toString(),
      customerEmail: (customerInfo?.email as string) || "",
      customerName: (customerInfo?.name as string) || "",
      ...(config.customMetadata || {}),
    };

    // Add B2B metadata
    if (customerInfo?.transactionType === "B2B") {
      metadata.transactionType = "B2B";
      metadata.companyName = (customerInfo?.companyName as string) || "";
      metadata.vatNumber = (customerInfo?.vatNumber as string) || "";
    }

    // Add product info from objects
    const productObjects = objects.filter(o => o.objectType === "product");
    if (productObjects.length > 0) {
      metadata.productCount = productObjects.length.toString();
      metadata.productIds = productObjects.map(o => o.objectId.toString()).join(",");
    }

    return {
      customerInfo,
      totalAmount,
      currency,
      taxCalculation,
      billingAddress,
      metadata,
    };
  },

  /**
   * Apply Stripe payment configuration
   */
  apply: (
    config: StripePaymentConfig,
    extractedData: unknown,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<unknown> => {
    const data = extractedData as Record<string, unknown>;
    const {
      customerInfo,
      totalAmount,
      currency,
      taxCalculation,
      billingAddress,
      metadata,
    } = data;

    // Build payment intent parameters
    const currencyStr = typeof currency === 'string' ? currency : 'USD';
    const paymentIntentParams: Record<string, unknown> = {
      amount: totalAmount,
      currency: currencyStr.toLowerCase(),
      metadata,
    };

    // Add payment intent options
    if (config.paymentIntentOptions) {
      Object.assign(paymentIntentParams, config.paymentIntentOptions);
    }

    // Build Stripe Elements configuration
    const elementsConfig = {
      style: config.elementsStyle || {
        base: {
          fontSize: "16px",
          color: "#424770",
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          "::placeholder": {
            color: "#aab7c4",
          },
        },
        invalid: {
          color: "#9e2146",
          iconColor: "#9e2146",
        },
      },
    };

    // Build billing details to collect
    const custInfo = customerInfo as Record<string, unknown> | undefined;
    const billingDetailsToCollect = {
      name: config.collectBillingDetails?.name ?? true,
      email: config.collectBillingDetails?.email ?? true,
      phone: config.collectBillingDetails?.phone ?? false,
      address: config.collectBillingDetails?.address ?? (custInfo?.transactionType === "B2B"),
    };

    const result = {
      paymentIntentParams,
      elementsConfig,
      billingDetailsToCollect,
      customerInfo,
      billingAddress,
      retryOnFailure: config.retryOnFailure ?? true,
      maxRetries: config.maxRetries ?? 3,
    };

    return {
      success: true,
      data: result,
    };
  },

  /**
   * Validate Stripe payment configuration
   */
  validate: (config: StripePaymentConfig, _context?: Partial<BehaviorContext>) => {
    const errors: string[] = [];

    // Validate retry settings
    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      errors.push("maxRetries must be >= 0");
    }

    if (config.maxRetries !== undefined && config.maxRetries > 10) {
      errors.push("maxRetries must be <= 10 (to prevent infinite loops)");
    }

    // Validate capture method
    if (config.paymentIntentOptions?.captureMethod) {
      const valid = ["automatic", "manual"].includes(config.paymentIntentOptions.captureMethod);
      if (!valid) {
        errors.push("captureMethod must be 'automatic' or 'manual'");
      }
    }

    // Validate setup future usage
    if (config.paymentIntentOptions?.setupFutureUsage) {
      const valid = ["on_session", "off_session"].includes(config.paymentIntentOptions.setupFutureUsage);
      if (!valid) {
        errors.push("setupFutureUsage must be 'on_session' or 'off_session'");
      }
    }

    return errors.map(err => ({
      field: "config",
      message: err,
      code: "invalid_value",
      severity: "error" as const,
    }));
  },
};
