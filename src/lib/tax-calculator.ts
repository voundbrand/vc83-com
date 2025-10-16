/**
 * TAX CALCULATION UTILITY
 *
 * Calculates taxes for checkout based on product configuration,
 * organization tax settings, and customer location.
 */

import type { CheckoutProduct } from "@/templates/checkout/types";

/**
 * COMPREHENSIVE TAX CODE TO RATE MAPPING
 *
 * Maps Stripe tax codes and custom codes to actual tax rates (as percentages).
 * Covers all major countries and their various tax rates.
 *
 * Format: "COUNTRY_CODE-RATE_TYPE" -> percentage
 * Example: "DE-STANDARD" -> 19.0 (Germany standard VAT)
 */
export const TAX_CODE_RATES: Record<string, number> = {
  // === EUROPEAN UNION ===

  // Germany (DE)
  "DE-STANDARD": 19.0,           // Standard VAT rate
  "DE-REDUCED": 7.0,             // Reduced rate (food, books, cultural events)
  "DE-ZERO": 0.0,                // Zero-rated (exports, specific services)
  "txcd_10000000": 19.0,         // Stripe: Standard rate
  "txcd_99999999": 7.0,          // Stripe: Reduced rate

  // France (FR)
  "FR-STANDARD": 20.0,           // Standard VAT rate
  "FR-INTERMEDIATE": 10.0,       // Intermediate rate (restaurants, hotels)
  "FR-REDUCED": 5.5,             // Reduced rate (food, books)
  "FR-SUPER-REDUCED": 2.1,       // Super-reduced rate (medicines, newspapers)
  "FR-ZERO": 0.0,

  // United Kingdom (UK)
  "GB-STANDARD": 20.0,           // Standard VAT rate
  "GB-REDUCED": 5.0,             // Reduced rate (fuel, children's car seats)
  "GB-ZERO": 0.0,                // Zero-rated (food, books, children's clothing)

  // Italy (IT)
  "IT-STANDARD": 22.0,           // Standard VAT rate
  "IT-REDUCED": 10.0,            // Reduced rate (tourism, restaurants)
  "IT-SUPER-REDUCED": 5.0,       // Super-reduced (food, medical)
  "IT-MINIMUM": 4.0,             // Minimum rate (basic necessities)
  "IT-ZERO": 0.0,

  // Spain (ES)
  "ES-STANDARD": 21.0,           // Standard VAT rate
  "ES-REDUCED": 10.0,            // Reduced rate (transport, hotels)
  "ES-SUPER-REDUCED": 4.0,       // Super-reduced (food, medicine)
  "ES-ZERO": 0.0,

  // Netherlands (NL)
  "NL-STANDARD": 21.0,           // Standard VAT rate
  "NL-REDUCED": 9.0,             // Reduced rate (food, medicine, books)
  "NL-ZERO": 0.0,

  // Belgium (BE)
  "BE-STANDARD": 21.0,           // Standard VAT rate
  "BE-INTERMEDIATE": 12.0,       // Intermediate rate (restaurants, social housing)
  "BE-REDUCED": 6.0,             // Reduced rate (food, medicine, books)
  "BE-ZERO": 0.0,

  // Austria (AT)
  "AT-STANDARD": 20.0,           // Standard VAT rate
  "AT-INTERMEDIATE": 13.0,       // Intermediate rate (wine, cultural events)
  "AT-REDUCED": 10.0,            // Reduced rate (food, books, hotels)
  "AT-ZERO": 0.0,

  // Sweden (SE)
  "SE-STANDARD": 25.0,           // Standard VAT rate
  "SE-INTERMEDIATE": 12.0,       // Intermediate rate (food, restaurants)
  "SE-REDUCED": 6.0,             // Reduced rate (newspapers, books, cultural)
  "SE-ZERO": 0.0,

  // Denmark (DK)
  "DK-STANDARD": 25.0,           // Standard VAT rate (no reduced rates)
  "DK-ZERO": 0.0,

  // Poland (PL)
  "PL-STANDARD": 23.0,           // Standard VAT rate
  "PL-REDUCED": 8.0,             // Reduced rate (food, medicine)
  "PL-SUPER-REDUCED": 5.0,       // Super-reduced (books, newspapers)
  "PL-ZERO": 0.0,

  // Czech Republic (CZ)
  "CZ-STANDARD": 21.0,           // Standard VAT rate
  "CZ-REDUCED": 15.0,            // First reduced rate (food, medicine)
  "CZ-SUPER-REDUCED": 10.0,      // Second reduced rate (books, baby food)
  "CZ-ZERO": 0.0,

  // Portugal (PT)
  "PT-STANDARD": 23.0,           // Standard VAT rate
  "PT-INTERMEDIATE": 13.0,       // Intermediate rate (restaurants, wine)
  "PT-REDUCED": 6.0,             // Reduced rate (food, medicine, books)
  "PT-ZERO": 0.0,

  // Greece (GR)
  "GR-STANDARD": 24.0,           // Standard VAT rate
  "GR-REDUCED": 13.0,            // Reduced rate (food, energy)
  "GR-SUPER-REDUCED": 6.0,       // Super-reduced (medicine, books, theaters)
  "GR-ZERO": 0.0,

  // Ireland (IE)
  "IE-STANDARD": 23.0,           // Standard VAT rate
  "IE-REDUCED": 13.5,            // Reduced rate (fuel, electricity, repair)
  "IE-SUPER-REDUCED": 9.0,       // Super-reduced (tourism, newspapers)
  "IE-PARKING": 13.5,            // Parking rate
  "IE-ZERO": 0.0,

  // === NORTH AMERICA ===

  // United States - State Sales Tax
  "US-CA": 7.25,                 // California base rate
  "US-NY": 4.0,                  // New York state rate
  "US-TX": 6.25,                 // Texas
  "US-FL": 6.0,                  // Florida
  "US-IL": 6.25,                 // Illinois
  "US-PA": 6.0,                  // Pennsylvania
  "US-OH": 5.75,                 // Ohio
  "US-GA": 4.0,                  // Georgia
  "US-NC": 4.75,                 // North Carolina
  "US-MI": 6.0,                  // Michigan
  "US-WA": 6.5,                  // Washington
  "US-AZ": 5.6,                  // Arizona
  "US-MA": 6.25,                 // Massachusetts
  "US-TN": 7.0,                  // Tennessee
  "US-IN": 7.0,                  // Indiana
  "US-MO": 4.225,                // Missouri
  "US-MD": 6.0,                  // Maryland
  "US-WI": 5.0,                  // Wisconsin
  "US-CO": 2.9,                  // Colorado
  "US-MN": 6.875,                // Minnesota

  // Canada - Provincial Sales Tax
  "CA-ON": 13.0,                 // Ontario HST (Harmonized Sales Tax)
  "CA-QC": 14.975,               // Quebec (GST 5% + QST 9.975%)
  "CA-BC": 12.0,                 // British Columbia (GST 5% + PST 7%)
  "CA-AB": 5.0,                  // Alberta (GST only)
  "CA-SK": 11.0,                 // Saskatchewan (GST 5% + PST 6%)
  "CA-MB": 12.0,                 // Manitoba (GST 5% + PST 7%)
  "CA-NS": 15.0,                 // Nova Scotia HST
  "CA-NB": 15.0,                 // New Brunswick HST
  "CA-NL": 15.0,                 // Newfoundland HST
  "CA-PE": 15.0,                 // Prince Edward Island HST

  // Mexico
  "MX-STANDARD": 16.0,           // Standard IVA rate
  "MX-BORDER": 8.0,              // Border zone rate
  "MX-ZERO": 0.0,

  // === ASIA-PACIFIC ===

  // Australia
  "AU-GST": 10.0,                // Goods and Services Tax
  "AU-ZERO": 0.0,

  // New Zealand
  "NZ-GST": 15.0,                // Goods and Services Tax
  "NZ-ZERO": 0.0,

  // Japan
  "JP-STANDARD": 10.0,           // Standard consumption tax
  "JP-REDUCED": 8.0,             // Reduced rate (food, newspapers)
  "JP-ZERO": 0.0,

  // Singapore
  "SG-GST": 9.0,                 // Goods and Services Tax (2024)
  "SG-ZERO": 0.0,

  // South Korea
  "KR-VAT": 10.0,                // Value Added Tax
  "KR-ZERO": 0.0,

  // India
  "IN-GST-28": 28.0,             // Highest GST rate (luxury goods)
  "IN-GST-18": 18.0,             // Standard rate (most goods)
  "IN-GST-12": 12.0,             // Lower rate (processed food)
  "IN-GST-5": 5.0,               // Reduced rate (essential items)
  "IN-GST-0": 0.0,               // Zero-rated

  // China
  "CN-VAT-13": 13.0,             // Standard VAT rate
  "CN-VAT-9": 9.0,               // Reduced rate (transport, construction)
  "CN-VAT-6": 6.0,               // Lower rate (modern services)
  "CN-VAT-0": 0.0,

  // === MIDDLE EAST & AFRICA ===

  // UAE
  "AE-VAT": 5.0,                 // Value Added Tax
  "AE-ZERO": 0.0,

  // Saudi Arabia
  "SA-VAT": 15.0,                // Value Added Tax
  "SA-ZERO": 0.0,

  // South Africa
  "ZA-VAT": 15.0,                // Value Added Tax
  "ZA-ZERO": 0.0,

  // Israel
  "IL-VAT": 17.0,                // Value Added Tax
  "IL-ZERO": 0.0,

  // === SOUTH AMERICA ===

  // Brazil
  "BR-ICMS": 18.0,               // State VAT (varies by state)
  "BR-PIS-COFINS": 9.25,         // Federal taxes
  "BR-ZERO": 0.0,

  // Argentina
  "AR-IVA": 21.0,                // Standard VAT
  "AR-IVA-REDUCED": 10.5,        // Reduced rate
  "AR-ZERO": 0.0,

  // Chile
  "CL-IVA": 19.0,                // Value Added Tax
  "CL-ZERO": 0.0,

  // === SWITZERLAND (Non-EU) ===
  "CH-STANDARD": 8.1,            // Standard VAT rate
  "CH-REDUCED": 2.6,             // Reduced rate (food, medicine, books)
  "CH-ACCOMMODATION": 3.8,       // Accommodation rate
  "CH-ZERO": 0.0,

  // === NORWAY (Non-EU) ===
  "NO-STANDARD": 25.0,           // Standard VAT rate
  "NO-FOOD": 15.0,               // Food rate
  "NO-TRANSPORT": 12.0,          // Transport, accommodation
  "NO-ZERO": 0.0,
};

/**
 * Get tax rate for a specific tax code
 *
 * @param taxCode - Tax code (e.g., "DE-STANDARD", "US-CA")
 * @param fallbackRate - Fallback rate if code not found
 * @returns Tax rate as percentage
 */
export function getTaxRateByCode(taxCode: string | undefined, fallbackRate: number = 0): number {
  if (!taxCode) return fallbackRate;
  return TAX_CODE_RATES[taxCode] ?? fallbackRate;
}

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
 * @param defaultTaxRate - Organization default tax rate (percentage) - used as fallback
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
  const productTaxCode = product.customProperties?.taxCode as string | undefined;
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
      taxCode: productTaxCode,
      taxBehavior,
    };
  }

  // Get tax rate for this product
  // Priority: product taxCode > defaultTaxRate
  const productTaxRate = getTaxRateByCode(productTaxCode, defaultTaxRate);

  // Calculate tax based on behavior
  let subtotal: number;
  let taxAmount: number;
  let total: number;

  if (taxBehavior === "inclusive") {
    // Tax is already included in the price
    // Price = Base + Tax, so Base = Price / (1 + rate)
    total = subtotalBeforeTax;
    const taxMultiplier = 1 + (productTaxRate / 100);
    subtotal = Math.round(total / taxMultiplier);
    taxAmount = total - subtotal;
  } else {
    // Exclusive (default) or Automatic (we'll treat as exclusive for now)
    // Tax is added on top of price
    subtotal = subtotalBeforeTax;
    taxAmount = Math.round(subtotal * (productTaxRate / 100));
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
    taxCode: productTaxCode,
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
 * Get default tax rate for a jurisdiction
 * Uses the comprehensive TAX_CODE_RATES mapping
 *
 * @param country - Country code (e.g., "US", "DE")
 * @param state - State/province code (e.g., "CA", "ON")
 * @returns Tax rate as percentage
 */
export function getDefaultTaxRate(
  country: string = "US",
  state?: string
): number {
  // Try state/province specific rate first
  if (state) {
    const stateKey = `${country}-${state}`;
    if (TAX_CODE_RATES[stateKey]) {
      return TAX_CODE_RATES[stateKey];
    }
  }

  // Try country-level standard rate
  const standardKey = `${country}-STANDARD`;
  if (TAX_CODE_RATES[standardKey]) {
    return TAX_CODE_RATES[standardKey];
  }

  // No rate found
  return 0;
}

/**
 * TAX CODE METADATA
 * Human-readable labels for tax codes organized by country
 * Used in product forms to display tax code options
 */
export interface TaxCodeOption {
  value: string;
  label: string;
}

export interface CountryTaxCodes {
  countryCode: string;
  flag: string;
  label: string;
  codes: TaxCodeOption[];
}

export const TAX_CODE_METADATA: Record<string, CountryTaxCodes> = {
  "DE": {
    countryCode: "DE",
    flag: "🇩🇪",
    label: "Germany (VAT)",
    codes: [
      { value: "DE-STANDARD", label: "Standard 19% - Most products/services" },
      { value: "DE-REDUCED", label: "Reduced 7% - Food, books, cultural events" },
      { value: "DE-ZERO", label: "Zero 0% - Exports, specific services" },
    ]
  },
  "FR": {
    countryCode: "FR",
    flag: "🇫🇷",
    label: "France (TVA)",
    codes: [
      { value: "FR-STANDARD", label: "Standard 20%" },
      { value: "FR-INTERMEDIATE", label: "Intermediate 10% - Restaurants, hotels" },
      { value: "FR-REDUCED", label: "Reduced 5.5% - Food, books" },
      { value: "FR-SUPER-REDUCED", label: "Super-Reduced 2.1% - Medicine, newspapers" },
      { value: "FR-ZERO", label: "Zero 0%" },
    ]
  },
  "GB": {
    countryCode: "GB",
    flag: "🇬🇧",
    label: "United Kingdom (VAT)",
    codes: [
      { value: "GB-STANDARD", label: "Standard 20%" },
      { value: "GB-REDUCED", label: "Reduced 5% - Fuel, children's car seats" },
      { value: "GB-ZERO", label: "Zero 0% - Food, books, children's clothing" },
    ]
  },
  "IT": {
    countryCode: "IT",
    flag: "🇮🇹",
    label: "Italy (IVA)",
    codes: [
      { value: "IT-STANDARD", label: "Standard 22%" },
      { value: "IT-REDUCED", label: "Reduced 10% - Tourism, restaurants" },
      { value: "IT-SUPER-REDUCED", label: "Super-Reduced 5% - Food, medical" },
      { value: "IT-MINIMUM", label: "Minimum 4% - Basic necessities" },
      { value: "IT-ZERO", label: "Zero 0%" },
    ]
  },
  "ES": {
    countryCode: "ES",
    flag: "🇪🇸",
    label: "Spain (IVA)",
    codes: [
      { value: "ES-STANDARD", label: "Standard 21%" },
      { value: "ES-REDUCED", label: "Reduced 10% - Transport, hotels" },
      { value: "ES-SUPER-REDUCED", label: "Super-Reduced 4% - Food, medicine" },
      { value: "ES-ZERO", label: "Zero 0%" },
    ]
  },
  "NL": {
    countryCode: "NL",
    flag: "🇳🇱",
    label: "Netherlands (BTW)",
    codes: [
      { value: "NL-STANDARD", label: "Standard 21%" },
      { value: "NL-REDUCED", label: "Reduced 9% - Food, medicine, books" },
      { value: "NL-ZERO", label: "Zero 0%" },
    ]
  },
  "BE": {
    countryCode: "BE",
    flag: "🇧🇪",
    label: "Belgium (TVA/BTW)",
    codes: [
      { value: "BE-STANDARD", label: "Standard 21%" },
      { value: "BE-INTERMEDIATE", label: "Intermediate 12% - Restaurants, housing" },
      { value: "BE-REDUCED", label: "Reduced 6% - Food, medicine, books" },
      { value: "BE-ZERO", label: "Zero 0%" },
    ]
  },
  "AT": {
    countryCode: "AT",
    flag: "🇦🇹",
    label: "Austria (USt)",
    codes: [
      { value: "AT-STANDARD", label: "Standard 20%" },
      { value: "AT-INTERMEDIATE", label: "Intermediate 13% - Wine, culture" },
      { value: "AT-REDUCED", label: "Reduced 10% - Food, books, hotels" },
      { value: "AT-ZERO", label: "Zero 0%" },
    ]
  },
  "SE": {
    countryCode: "SE",
    flag: "🇸🇪",
    label: "Sweden (Moms)",
    codes: [
      { value: "SE-STANDARD", label: "Standard 25%" },
      { value: "SE-INTERMEDIATE", label: "Intermediate 12% - Food, restaurants" },
      { value: "SE-REDUCED", label: "Reduced 6% - Newspapers, books, culture" },
      { value: "SE-ZERO", label: "Zero 0%" },
    ]
  },
  "DK": {
    countryCode: "DK",
    flag: "🇩🇰",
    label: "Denmark (Moms)",
    codes: [
      { value: "DK-STANDARD", label: "Standard 25% (no reduced rates)" },
      { value: "DK-ZERO", label: "Zero 0%" },
    ]
  },
  "PL": {
    countryCode: "PL",
    flag: "🇵🇱",
    label: "Poland (VAT)",
    codes: [
      { value: "PL-STANDARD", label: "Standard 23%" },
      { value: "PL-REDUCED", label: "Reduced 8% - Food, medicine" },
      { value: "PL-SUPER-REDUCED", label: "Super-Reduced 5% - Books, newspapers" },
      { value: "PL-ZERO", label: "Zero 0%" },
    ]
  },
  "PT": {
    countryCode: "PT",
    flag: "🇵🇹",
    label: "Portugal (IVA)",
    codes: [
      { value: "PT-STANDARD", label: "Standard 23%" },
      { value: "PT-INTERMEDIATE", label: "Intermediate 13% - Restaurants, wine" },
      { value: "PT-REDUCED", label: "Reduced 6% - Food, medicine, books" },
      { value: "PT-ZERO", label: "Zero 0%" },
    ]
  },
  "IE": {
    countryCode: "IE",
    flag: "🇮🇪",
    label: "Ireland (VAT)",
    codes: [
      { value: "IE-STANDARD", label: "Standard 23%" },
      { value: "IE-REDUCED", label: "Reduced 13.5% - Fuel, electricity, repair" },
      { value: "IE-SUPER-REDUCED", label: "Super-Reduced 9% - Tourism, newspapers" },
      { value: "IE-ZERO", label: "Zero 0%" },
    ]
  },
  "US": {
    countryCode: "US",
    flag: "🇺🇸",
    label: "United States (Sales Tax)",
    codes: [
      { value: "US-CA", label: "California 7.25%" },
      { value: "US-NY", label: "New York 4.0%" },
      { value: "US-TX", label: "Texas 6.25%" },
      { value: "US-FL", label: "Florida 6.0%" },
      { value: "US-IL", label: "Illinois 6.25%" },
      { value: "US-PA", label: "Pennsylvania 6.0%" },
      { value: "US-WA", label: "Washington 6.5%" },
      { value: "US-MA", label: "Massachusetts 6.25%" },
    ]
  },
  "CA": {
    countryCode: "CA",
    flag: "🇨🇦",
    label: "Canada (GST/HST/PST)",
    codes: [
      { value: "CA-ON", label: "Ontario 13% (HST)" },
      { value: "CA-QC", label: "Quebec 14.975% (GST+QST)" },
      { value: "CA-BC", label: "British Columbia 12% (GST+PST)" },
      { value: "CA-AB", label: "Alberta 5% (GST only)" },
      { value: "CA-NS", label: "Nova Scotia 15% (HST)" },
    ]
  },
  "MX": {
    countryCode: "MX",
    flag: "🇲🇽",
    label: "Mexico (IVA)",
    codes: [
      { value: "MX-STANDARD", label: "Standard 16%" },
      { value: "MX-BORDER", label: "Border Zone 8%" },
      { value: "MX-ZERO", label: "Zero 0%" },
    ]
  },
  "AU": {
    countryCode: "AU",
    flag: "🇦🇺",
    label: "Australia (GST)",
    codes: [
      { value: "AU-GST", label: "GST 10%" },
      { value: "AU-ZERO", label: "Zero 0%" },
    ]
  },
  "NZ": {
    countryCode: "NZ",
    flag: "🇳🇿",
    label: "New Zealand (GST)",
    codes: [
      { value: "NZ-GST", label: "GST 15%" },
      { value: "NZ-ZERO", label: "Zero 0%" },
    ]
  },
  "JP": {
    countryCode: "JP",
    flag: "🇯🇵",
    label: "Japan (消費税)",
    codes: [
      { value: "JP-STANDARD", label: "Standard 10%" },
      { value: "JP-REDUCED", label: "Reduced 8% - Food, newspapers" },
      { value: "JP-ZERO", label: "Zero 0%" },
    ]
  },
  "SG": {
    countryCode: "SG",
    flag: "🇸🇬",
    label: "Singapore (GST)",
    codes: [
      { value: "SG-GST", label: "GST 9%" },
      { value: "SG-ZERO", label: "Zero 0%" },
    ]
  },
  "IN": {
    countryCode: "IN",
    flag: "🇮🇳",
    label: "India (GST)",
    codes: [
      { value: "IN-GST-28", label: "28% - Luxury goods" },
      { value: "IN-GST-18", label: "18% - Standard rate" },
      { value: "IN-GST-12", label: "12% - Processed food" },
      { value: "IN-GST-5", label: "5% - Essential items" },
      { value: "IN-GST-0", label: "0% - Zero-rated" },
    ]
  },
  "CH": {
    countryCode: "CH",
    flag: "🇨🇭",
    label: "Switzerland (MWST/TVA/IVA)",
    codes: [
      { value: "CH-STANDARD", label: "Standard 8.1%" },
      { value: "CH-REDUCED", label: "Reduced 2.6% - Food, medicine, books" },
      { value: "CH-ACCOMMODATION", label: "Accommodation 3.8%" },
      { value: "CH-ZERO", label: "Zero 0%" },
    ]
  },
  "NO": {
    countryCode: "NO",
    flag: "🇳🇴",
    label: "Norway (MVA)",
    codes: [
      { value: "NO-STANDARD", label: "Standard 25%" },
      { value: "NO-FOOD", label: "Food 15%" },
      { value: "NO-TRANSPORT", label: "Transport/Accommodation 12%" },
      { value: "NO-ZERO", label: "Zero 0%" },
    ]
  },
  "AE": {
    countryCode: "AE",
    flag: "🇦🇪",
    label: "UAE (VAT)",
    codes: [
      { value: "AE-VAT", label: "VAT 5%" },
      { value: "AE-ZERO", label: "Zero 0%" },
    ]
  },
  "ZA": {
    countryCode: "ZA",
    flag: "🇿🇦",
    label: "South Africa (VAT)",
    codes: [
      { value: "ZA-VAT", label: "VAT 15%" },
      { value: "ZA-ZERO", label: "Zero 0%" },
    ]
  },
};

/**
 * Get tax code options for a specific country
 * Used in product forms to show only relevant tax codes based on organization's tax origin
 *
 * @param countryCode - ISO country code (e.g., "DE", "US")
 * @returns Tax code metadata for that country, or null if not found
 */
export function getTaxCodesForCountry(countryCode: string): CountryTaxCodes | null {
  return TAX_CODE_METADATA[countryCode] || null;
}
