/**
 * TAX CALCULATION UTILITY
 *
 * Calculates taxes for checkout based on product configuration,
 * organization tax settings, and customer location.
 */

import type { CheckoutProduct } from "@/templates/checkout/types";

/**
 * Tax calculation result
 */
export interface TaxCalculation {
  subtotal: number; // Price before tax (in cents)
  taxAmount: number; // Calculated tax (in cents)
  total: number; // Final total (in cents)
  taxRate: number; // Effective tax rate (percentage, e.g., 8.5 for 8.5%)
  taxBehavior: "exclusive" | "inclusive" | "automatic";
  isTaxable: boolean;
}

/**
 * Line item with tax calculation
 */
export interface LineItemWithTax {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Price per unit (in cents)
  subtotal: number; // quantity * unitPrice (in cents)
  taxAmount: number; // Tax for this line item (in cents)
  total: number; // subtotal + taxAmount (in cents)
  taxable: boolean;
  taxCode?: string;
  taxBehavior: "exclusive" | "inclusive" | "automatic";
}

/**
 * Calculate tax for a single product
 *
 * @param product - Product with tax configuration
 * @param quantity - Quantity purchased
 * @param defaultTaxRate - Organization default tax rate (percentage)
 * @param defaultTaxBehavior - Organization default tax behavior
 * @returns Tax calculation for this product
 */
export function calculateProductTax(
  product: CheckoutProduct,
  quantity: number,
  defaultTaxRate: number = 0,
  defaultTaxBehavior: "exclusive" | "inclusive" | "automatic" = "exclusive"
): LineItemWithTax {
  const taxable = product.customProperties?.taxable ?? true;
  const taxBehavior = (product.customProperties?.taxBehavior as "exclusive" | "inclusive" | "automatic") || defaultTaxBehavior;
  const unitPrice = product.price; // Price is already in cents
  const subtotalBeforeTax = unitPrice * quantity;

  // If product is not taxable, return zero tax
  if (!taxable) {
    return {
      productId: product._id,
      productName: product.name,
      quantity,
      unitPrice,
      subtotal: subtotalBeforeTax,
      taxAmount: 0,
      total: subtotalBeforeTax,
      taxable: false,
      taxCode: product.customProperties?.taxCode,
      taxBehavior,
    };
  }

  // Calculate tax based on behavior
  let subtotal: number;
  let taxAmount: number;
  let total: number;

  if (taxBehavior === "inclusive") {
    // Tax is already included in the price
    // Price = Base + Tax, so Base = Price / (1 + rate)
    total = subtotalBeforeTax;
    const taxMultiplier = 1 + (defaultTaxRate / 100);
    subtotal = Math.round(total / taxMultiplier);
    taxAmount = total - subtotal;
  } else {
    // Exclusive (default) or Automatic (we'll treat as exclusive for now)
    // Tax is added on top of price
    subtotal = subtotalBeforeTax;
    taxAmount = Math.round(subtotal * (defaultTaxRate / 100));
    total = subtotal + taxAmount;
  }

  return {
    productId: product._id,
    productName: product.name,
    quantity,
    unitPrice,
    subtotal,
    taxAmount,
    total,
    taxable: true,
    taxCode: product.customProperties?.taxCode,
    taxBehavior,
  };
}

/**
 * Calculate total tax for multiple line items
 *
 * @param products - Array of products with quantities
 * @param defaultTaxRate - Organization default tax rate (percentage)
 * @param defaultTaxBehavior - Organization default tax behavior
 * @returns Total tax calculation
 */
export function calculateCheckoutTax(
  products: Array<{ product: CheckoutProduct; quantity: number }>,
  defaultTaxRate: number = 0,
  defaultTaxBehavior: "exclusive" | "inclusive" | "automatic" = "exclusive"
): TaxCalculation & { lineItems: LineItemWithTax[] } {
  const lineItems = products.map(({ product, quantity }) =>
    calculateProductTax(product, quantity, defaultTaxRate, defaultTaxBehavior)
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = lineItems.reduce((sum, item) => sum + item.total, 0);
  const isTaxable = lineItems.some((item) => item.taxable);

  // Determine overall tax behavior (use first taxable item's behavior)
  const taxBehavior = lineItems.find((item) => item.taxable)?.taxBehavior || defaultTaxBehavior;

  return {
    subtotal,
    taxAmount,
    total,
    taxRate: defaultTaxRate,
    taxBehavior,
    isTaxable,
    lineItems,
  };
}

/**
 * Format tax amount for display
 *
 * @param amount - Amount in cents
 * @param currency - Currency code (e.g., "USD")
 * @returns Formatted string (e.g., "$10.20")
 */
export function formatTaxAmount(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Get default tax rate for a jurisdiction (mock implementation)
 * In production, this would integrate with Stripe Tax or another service
 *
 * @param country - Country code (e.g., "US")
 * @param state - State/province code (e.g., "CA")
 * @param city - City name (optional)
 * @returns Tax rate as percentage
 */
export function getDefaultTaxRate(
  country: string = "US",
  state?: string,
  city?: string
): number {
  // Mock tax rates for common jurisdictions
  // In production, use Stripe Tax API or similar service
  const taxRates: Record<string, number> = {
    "US-CA": 8.5, // California
    "US-NY": 8.875, // New York
    "US-TX": 8.25, // Texas
    "US-FL": 6.0, // Florida
    "UK": 20.0, // UK VAT
    "FR": 20.0, // France VAT
    "DE": 19.0, // Germany VAT
    "CA-ON": 13.0, // Ontario HST
  };

  const key = state ? `${country}-${state}` : country;
  return taxRates[key] || 0;
}
