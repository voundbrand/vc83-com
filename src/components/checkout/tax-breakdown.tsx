"use client";

/**
 * TAX BREAKDOWN COMPONENT
 *
 * Displays tax calculation breakdown in checkout flow.
 * Shows subtotal, tax amount, and total with clear itemization.
 */

import { DollarSign, Info } from "lucide-react";

export interface TaxGroup {
  rate: number;
  subtotal: number;
  taxAmount: number;
}

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  taxBehavior: "inclusive" | "exclusive" | "automatic";
  jurisdiction?: string;
  taxName?: string;
  currency: string;
  // NEW: Support for multiple tax rates
  taxGroups?: TaxGroup[];
  hasMultipleTaxRates?: boolean;
}

interface TaxBreakdownProps {
  calculation: TaxCalculation;
  showDetails?: boolean;
}

export function TaxBreakdown({ calculation, showDetails = false }: TaxBreakdownProps) {
  const formatPrice = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const { subtotal, taxAmount, taxRate, total, taxBehavior, jurisdiction, taxName, currency, taxGroups, hasMultipleTaxRates } =
    calculation;

  return (
    <div className="tax-breakdown bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
      {/* Subtotal */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-700">Subtotal</span>
        <span className="text-sm font-medium">{formatPrice(subtotal, currency)}</span>
      </div>

      {/* Tax Lines - Show multiple tax rates if available */}
      {hasMultipleTaxRates && taxGroups && taxGroups.length > 0 ? (
        // Multiple tax rates
        taxGroups.map((group, index) => (
          <div key={`tax-${group.rate}-${index}`} className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-700">
                {taxName || "Tax"}
                <span className="text-xs text-gray-500 ml-1">
                  ({group.rate.toFixed(1)}%)
                </span>
              </span>
              {showDetails && jurisdiction && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  title={`Tax collected for ${jurisdiction}`}
                >
                  <Info size={14} />
                </button>
              )}
            </div>
            <span className="text-sm font-medium">{formatPrice(group.taxAmount, currency)}</span>
          </div>
        ))
      ) : (
        // Single tax rate (legacy)
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">
              {taxName || "Tax"}
              {taxRate > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({(taxRate).toFixed(1)}%)
                </span>
              )}
            </span>
            {showDetails && jurisdiction && (
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                title={`Tax collected for ${jurisdiction}`}
              >
                <Info size={14} />
              </button>
            )}
          </div>
          <span className="text-sm font-medium">{formatPrice(taxAmount, currency)}</span>
        </div>
      )}

      {/* Tax Behavior Note */}
      {showDetails && taxBehavior === "inclusive" && (
        <div className="text-xs text-gray-500 italic mb-2">
          * Tax is included in the product price
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-300 my-2" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-base font-bold text-gray-900 flex items-center gap-1">
          <DollarSign size={16} />
          Total
        </span>
        <span className="text-lg font-bold text-violet-600">{formatPrice(total, currency)}</span>
      </div>

      {/* Tax Behavior Info */}
      {showDetails && taxBehavior !== "inclusive" && (
        <div className="mt-2 text-xs text-gray-500">
          Tax calculated based on your location
        </div>
      )}
    </div>
  );
}

/**
 * COMPACT TAX BREAKDOWN
 *
 * Simplified version for smaller spaces (e.g., order summary cards)
 */
interface CompactTaxBreakdownProps {
  calculation: TaxCalculation;
}

export function CompactTaxBreakdown({ calculation }: CompactTaxBreakdownProps) {
  const formatPrice = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const { subtotal, taxAmount, total, currency, taxGroups, hasMultipleTaxRates } = calculation;

  return (
    <div className="compact-tax-breakdown space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal:</span>
        <span>{formatPrice(subtotal, currency)}</span>
      </div>

      {/* Tax Lines - Show multiple tax rates if available */}
      {hasMultipleTaxRates && taxGroups && taxGroups.length > 0 ? (
        // Multiple tax rates
        taxGroups.map((group, index) => (
          <div key={`compact-tax-${group.rate}-${index}`} className="flex justify-between text-sm">
            <span className="text-gray-600">Tax ({group.rate.toFixed(1)}%):</span>
            <span>{formatPrice(group.taxAmount, currency)}</span>
          </div>
        ))
      ) : (
        // Single tax rate (legacy)
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax:</span>
          <span>{formatPrice(taxAmount, currency)}</span>
        </div>
      )}

      <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-1">
        <span>Total:</span>
        <span className="text-violet-600">{formatPrice(total, currency)}</span>
      </div>
    </div>
  );
}

/**
 * UTILITY: Calculate tax from items
 */
export function calculateTaxFromItems(
  items: Array<{ price: number; taxable?: boolean }>,
  quantity: number,
  taxRate: number,
  taxBehavior: "inclusive" | "exclusive" | "automatic" = "exclusive"
): TaxCalculation {
  // Calculate subtotal (taxable items only)
  const taxableSubtotal = items
    .filter((item) => item.taxable !== false)
    .reduce((sum, item) => sum + item.price * quantity, 0);

  let subtotal: number;
  let taxAmount: number;
  let total: number;

  if (taxBehavior === "inclusive") {
    // Tax is included in price
    total = taxableSubtotal;
    taxAmount = Math.round((total * taxRate) / (1 + taxRate));
    subtotal = total - taxAmount;
  } else {
    // Tax is added to price (exclusive or automatic defaults to exclusive)
    subtotal = taxableSubtotal;
    taxAmount = Math.round(subtotal * taxRate);
    total = subtotal + taxAmount;
  }

  return {
    subtotal,
    taxAmount,
    taxRate,
    total,
    taxBehavior,
    currency: "eur", // Default to EUR (matches organization's currency settings)
  };
}
