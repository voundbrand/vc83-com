/**
 * TAX CALCULATION BEHAVIOR
 *
 * Handles tax calculation including:
 * - Tax rate selection (by jurisdiction, product type, customer type)
 * - Tax-inclusive vs tax-exclusive pricing
 * - Multi-jurisdiction tax (for international sales)
 * - B2B reverse charge mechanism (EU VAT)
 * - Custom tax rules
 *
 * This extracts tax logic from:
 * - lib/tax-calculator.ts
 * - product-selection-step.tsx (tax calculation)
 * - payment-form-step.tsx (tax display)
 */

import type { BehaviorHandler, BehaviorContext, BehaviorResult } from "../types";

/**
 * Tax Calculation Config
 */
export interface TaxCalculationConfig {
  // Tax enable/disable
  taxEnabled: boolean;

  // Default tax settings
  defaultTaxRate: number; // Percentage (e.g., 19 for 19%)
  defaultTaxBehavior: "exclusive" | "inclusive"; // Add to price or include in price

  // Tax rates by jurisdiction
  taxRates?: Array<{
    jurisdiction: string; // Country code (e.g., "DE", "US-CA", "UK")
    rate: number; // Tax rate percentage
    name?: string; // Display name (e.g., "VAT", "Sales Tax", "GST")
  }>;

  // Tax codes for different product types
  taxCodes?: Array<{
    code: string; // Tax code (e.g., "standard", "reduced", "zero")
    rate: number; // Tax rate percentage
    applicableSubtypes?: string[]; // Product subtypes this applies to
  }>;

  // B2B/B2C rules
  b2bTaxRules?: {
    domesticB2B: "charge" | "reverse_charge"; // How to handle domestic B2B
    internationalB2B: "charge" | "reverse_charge" | "exempt"; // International B2B
    requireVatNumber: boolean; // VAT number required for B2B
  };

  // Exemptions
  exemptions?: Array<{
    customerType?: "B2B" | "B2C";
    jurisdictions?: string[]; // Jurisdictions where exemption applies
    productSubtypes?: string[]; // Product types that are exempt
    requireCertificate?: boolean; // Require tax exemption certificate
  }>;

  // Rounding
  roundingMode?: "up" | "down" | "nearest"; // How to round tax amounts
  roundingPrecision?: number; // Decimal places (default: 2)

  // Display settings
  showTaxInPrice?: boolean; // Show "incl. tax" or "excl. tax" in UI
  showTaxBreakdown?: boolean; // Show detailed tax breakdown
}

/**
 * Tax Calculation Handler
 */
export const taxCalculationHandler: BehaviorHandler<TaxCalculationConfig> = {
  type: "tax-calculation",
  name: "Tax Calculation",
  description: "Calculate taxes based on jurisdiction and customer type",
  category: "data",
  supportedInputTypes: ["form", "api"],
  supportedObjectTypes: ["product", "checkout_instance"],
  supportedWorkflows: ["checkout"],

  /**
   * Extract data needed for tax calculation
   */
  extract: (
    config: TaxCalculationConfig,
    inputs: Array<{ type: string; data: unknown }>,
    context: Readonly<BehaviorContext>
  ) => {
    const { workflowData = {}, objects = [] } = context;

    // Get customer info from workflow data
    const customerInfo = workflowData.customerInfo as Record<string, unknown> | undefined;
    const billingAddress = customerInfo?.billingAddress as Record<string, unknown> | undefined;
    const customerType = customerInfo?.transactionType || "B2C";
    const billingCountry = billingAddress?.country || "DE";
    const vatNumber = customerInfo?.vatNumber;

    // Get selected products with details from objects
    const productObjects = objects.filter(o => o.objectType === "product");
    const selectedProducts = productObjects.map(obj => ({
      productId: obj.objectId,
      quantity: obj.quantity || 1,
      price: (obj.data?.price as number) || 0,
      subtype: obj.data?.subtype as string | undefined,
      taxCode: obj.data?.taxCode as string | undefined,
      currency: (obj.data?.currency as string) || "EUR",
    }));

    // Get add-ons from form responses (from inputs)
    const formResponses = inputs.filter(i => i.type === "form");
    const addons = formResponses.flatMap(fr => {
      const data = fr.data as Record<string, unknown>;
      return (data.addons as Array<Record<string, unknown>>) || [];
    });

    return {
      customerType,
      billingCountry,
      vatNumber,
      selectedProducts,
      addons,
    };
  },

  /**
   * Apply tax calculation
   */
  apply: (
    config: TaxCalculationConfig,
    extractedData: unknown,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<unknown> => {
    const data = extractedData as Record<string, unknown>;
    const {
      customerType,
      billingCountry,
      vatNumber,
      selectedProducts,
      addons,
    } = data;

    // If tax disabled, return zero tax
    if (!config.taxEnabled) {
      return {
        success: true,
        data: {
          isTaxable: false,
          taxRate: 0,
          taxAmount: 0,
          subtotal: 0,
          total: 0,
          taxBehavior: config.defaultTaxBehavior,
          lineItems: [],
        },
      };
    }

    // Check for exemptions
    const isExempt = config.exemptions?.some(exemption => {
      // Check customer type
      if (exemption.customerType && exemption.customerType !== customerType) {
        return false;
      }

      // Check jurisdiction
      if (exemption.jurisdictions && typeof billingCountry === 'string' && !exemption.jurisdictions.includes(billingCountry)) {
        return false;
      }

      // Check product subtypes
      if (exemption.productSubtypes && Array.isArray(selectedProducts)) {
        const products = selectedProducts as Array<Record<string, unknown>>;
        const hasExemptProduct = products.some((sp) => {
          const subtype = sp.subtype as string | undefined;
          return subtype && exemption.productSubtypes?.includes(subtype);
        });
        if (!hasExemptProduct) {
          return false;
        }
      }

      // Check certificate requirement
      if (exemption.requireCertificate && !vatNumber) {
        return false;
      }

      return true;
    });

    if (isExempt) {
      // Calculate totals without tax
      const products = (selectedProducts as Array<Record<string, unknown>>) || [];
      const addonsList = (addons as Array<Record<string, unknown>>) || [];
      const subtotal = calculateSubtotal(products, addonsList);
      return {
        success: true,
        data: {
          isTaxable: false,
          taxRate: 0,
          taxAmount: 0,
          subtotal,
          total: subtotal,
          taxBehavior: config.defaultTaxBehavior,
          exemptReason: "Tax exempt",
          lineItems: [],
        },
      };
    }

    // Apply B2B rules
    if (customerType === "B2B" && config.b2bTaxRules) {
      const isDomestic = billingCountry === "DE"; // Assume org is in DE for now
      const rule = isDomestic
        ? config.b2bTaxRules.domesticB2B
        : config.b2bTaxRules.internationalB2B;

      // Reverse charge or exempt (no tax charged)
      if (rule === "reverse_charge" || rule === "exempt") {
        const products = (selectedProducts as Array<Record<string, unknown>>) || [];
        const addonsList = (addons as Array<Record<string, unknown>>) || [];
        const subtotal = calculateSubtotal(products, addonsList);
        return {
          success: true,
          data: {
            isTaxable: false,
            taxRate: 0,
            taxAmount: 0,
            subtotal,
            total: subtotal,
            taxBehavior: config.defaultTaxBehavior,
            reverseCharge: rule === "reverse_charge",
            exemptReason: rule === "exempt" ? "International B2B - Tax exempt" : undefined,
            lineItems: [],
          },
        };
      }
    }

    // Calculate tax for each line item
    const lineItems: Array<Record<string, unknown>> = [];
    let totalTax = 0;
    let totalSubtotal = 0;

    // Products
    const products = (selectedProducts as Array<Record<string, unknown>>) || [];
    for (const sp of products) {
      const subtype = sp.subtype as string | undefined;
      const taxCode = sp.taxCode as string | undefined;
      const price = typeof sp.price === 'number' ? sp.price : 0;
      const quantity = typeof sp.quantity === 'number' ? sp.quantity : 1;
      const taxRate = getTaxRate(config, subtype, taxCode, billingCountry as string);
      const subtotal = price * quantity;
      const taxAmount = calculateTaxAmount(subtotal, taxRate, config);

      lineItems.push({
        type: "product",
        productId: sp.productId,
        subtotal,
        taxRate,
        taxAmount,
        taxable: true,
        taxCode,
      });

      totalSubtotal += subtotal;
      totalTax += taxAmount;
    }

    // Add-ons
    const addonsList = (addons as Array<Record<string, unknown>>) || [];
    for (const addon of addonsList) {
      const taxRate = config.defaultTaxRate; // Addons use default rate
      const subtotal = typeof addon.totalPrice === 'number' ? addon.totalPrice : 0;
      const taxAmount = calculateTaxAmount(subtotal, taxRate, config);

      lineItems.push({
        type: "addon",
        addonId: addon.addonId,
        subtotal,
        taxRate,
        taxAmount,
        taxable: true,
      });

      totalSubtotal += subtotal;
      totalTax += taxAmount;
    }

    // Round tax amount
    totalTax = roundAmount(totalTax, config.roundingMode || "nearest", config.roundingPrecision || 2);

    // Calculate total
    const total = config.defaultTaxBehavior === "inclusive"
      ? totalSubtotal // Tax already included
      : totalSubtotal + totalTax; // Add tax to subtotal

    const result = {
      isTaxable: true,
      taxRate: config.defaultTaxRate,
      taxAmount: totalTax,
      subtotal: totalSubtotal,
      total,
      taxBehavior: config.defaultTaxBehavior,
      lineItems,
    };

    return {
      success: true,
      data: result,
    };
  },

  /**
   * Validate tax calculation configuration
   */
  validate: (config: TaxCalculationConfig, _context?: Partial<BehaviorContext>) => {
    const errors: string[] = [];

    // Validate default tax rate
    if (config.defaultTaxRate < 0 || config.defaultTaxRate > 100) {
      errors.push("defaultTaxRate must be between 0 and 100");
    }

    // Validate default tax behavior
    if (!["exclusive", "inclusive"].includes(config.defaultTaxBehavior)) {
      errors.push("defaultTaxBehavior must be 'exclusive' or 'inclusive'");
    }

    // Validate jurisdiction tax rates
    if (config.taxRates) {
      config.taxRates.forEach((rate, index) => {
        if (!rate.jurisdiction) {
          errors.push(`Tax rate ${index + 1}: jurisdiction is required`);
        }
        if (rate.rate < 0 || rate.rate > 100) {
          errors.push(`Tax rate ${index + 1}: rate must be between 0 and 100`);
        }
      });
    }

    // Validate tax codes
    if (config.taxCodes) {
      config.taxCodes.forEach((code, index) => {
        if (!code.code) {
          errors.push(`Tax code ${index + 1}: code is required`);
        }
        if (code.rate < 0 || code.rate > 100) {
          errors.push(`Tax code ${index + 1}: rate must be between 0 and 100`);
        }
      });
    }

    // Validate B2B rules
    if (config.b2bTaxRules) {
      const validDomestic = ["charge", "reverse_charge"];
      if (!validDomestic.includes(config.b2bTaxRules.domesticB2B)) {
        errors.push("b2bTaxRules.domesticB2B must be 'charge' or 'reverse_charge'");
      }

      const validInternational = ["charge", "reverse_charge", "exempt"];
      if (!validInternational.includes(config.b2bTaxRules.internationalB2B)) {
        errors.push("b2bTaxRules.internationalB2B must be 'charge', 'reverse_charge', or 'exempt'");
      }
    }

    // Validate rounding
    if (config.roundingMode && !["up", "down", "nearest"].includes(config.roundingMode)) {
      errors.push("roundingMode must be 'up', 'down', or 'nearest'");
    }

    if (config.roundingPrecision !== undefined && (config.roundingPrecision < 0 || config.roundingPrecision > 4)) {
      errors.push("roundingPrecision must be between 0 and 4");
    }

    return errors.map(err => ({
      field: "config",
      message: err,
      code: "invalid_value",
      severity: "error" as const,
    }));
  },
};

/**
 * Helper: Calculate subtotal from products and addons
 */
function calculateSubtotal(products: Array<Record<string, unknown>>, addons: Array<Record<string, unknown>>): number {
  const productTotal = products.reduce((sum, p) => {
    const price = typeof p.price === 'number' ? p.price : 0;
    const quantity = typeof p.quantity === 'number' ? p.quantity : 1;
    return sum + (price * quantity);
  }, 0);
  const addonTotal = addons.reduce((sum, a) => {
    const totalPrice = typeof a.totalPrice === 'number' ? a.totalPrice : 0;
    return sum + totalPrice;
  }, 0);
  return productTotal + addonTotal;
}

/**
 * Helper: Get tax rate for a product
 */
function getTaxRate(
  config: TaxCalculationConfig,
  subtype: string | undefined,
  taxCode: string | undefined,
  jurisdiction: string
): number {
  // Priority 1: Product-specific tax code
  if (taxCode && config.taxCodes) {
    const matchingCode = config.taxCodes.find(tc =>
      tc.code === taxCode &&
      (!tc.applicableSubtypes || tc.applicableSubtypes.includes(subtype || ""))
    );
    if (matchingCode) {
      return matchingCode.rate;
    }
  }

  // Priority 2: Jurisdiction-specific rate
  if (config.taxRates) {
    const matchingRate = config.taxRates.find(tr => tr.jurisdiction === jurisdiction);
    if (matchingRate) {
      return matchingRate.rate;
    }
  }

  // Priority 3: Default rate
  return config.defaultTaxRate;
}

/**
 * Helper: Calculate tax amount
 */
function calculateTaxAmount(
  subtotal: number,
  taxRate: number,
  config: TaxCalculationConfig
): number {
  if (config.defaultTaxBehavior === "inclusive") {
    // Tax is included in price, calculate backwards
    return subtotal - (subtotal / (1 + taxRate / 100));
  } else {
    // Tax is added to price
    return subtotal * (taxRate / 100);
  }
}

/**
 * Helper: Round amount
 */
function roundAmount(amount: number, mode: "up" | "down" | "nearest", precision: number): number {
  const multiplier = Math.pow(10, precision);

  switch (mode) {
    case "up":
      return Math.ceil(amount * multiplier) / multiplier;
    case "down":
      return Math.floor(amount * multiplier) / multiplier;
    case "nearest":
    default:
      return Math.round(amount * multiplier) / multiplier;
  }
}
