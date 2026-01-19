"use client";

/**
 * STEP 1: PRODUCT SELECTION
 *
 * Select products and quantities for checkout.
 * Calculates taxes inline using organization tax settings.
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StepProps } from "../types";
import { ShoppingCart } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { calculateCheckoutTax, getTaxRateByCode, getDefaultTaxRate as getDefaultTaxRateByCountry } from "@/lib/tax-calculator";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export function ProductSelectionStep({ organizationId, products, checkoutData, onComplete }: StepProps) {
  const { t } = useNamespaceTranslations("ui.checkout_template.behavior_driven");

  // Fetch organization tax settings
  const taxSettings = useQuery(api.organizationTaxSettings.getPublicTaxSettings, {
    organizationId,
  });
  // Initialize quantities from checkoutData or default to 0
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    checkoutData.selectedProducts?.forEach((sp) => {
      initial[sp.productId] = sp.quantity;
    });
    return initial;
  });

  // Calculate selected products
  const selectedProducts = useMemo(() => {
    return products
      .filter((p) => quantities[p._id] > 0)
      .map((p) => ({
        productId: p._id,
        quantity: quantities[p._id],
        price: p.price,
      }));
  }, [products, quantities]);

  // Calculate tax using organization settings
  // Get default tax rate for products without a tax code
  // This runs on every render, so it recalculates when taxSettings loads
  const getDefaultTaxRate = () => {
    if (!taxSettings?.taxEnabled) return 0;

    // Try to find active custom rate for origin address
    const activeRate = taxSettings.customRates?.find(
      (rate: { active: boolean; jurisdiction: string; rate: number }) => rate.active &&
        rate.jurisdiction === `${taxSettings.originAddress.country}-${taxSettings.originAddress.state || ""}`
    );

    if (activeRate) {
      return activeRate.rate * 100; // Convert decimal to percentage
    }

    // Use organization's default tax code if set
    if (taxSettings.defaultTaxCode) {
      return getTaxRateByCode(taxSettings.defaultTaxCode, 0);
    }

    // Fallback to country-level standard rates from our comprehensive mapping
    return getDefaultTaxRateByCountry(
      taxSettings.originAddress.country,
      taxSettings.originAddress.state
    );
  };

  const defaultTaxRate = getDefaultTaxRate();
  const defaultTaxBehavior = taxSettings?.defaultTaxBehavior || "exclusive";

  // Calculate tax - the calculator will use each product's tax code if available
  // NOTE: This runs on every render so tax updates when products change or settings load
  const taxCalculation = selectedProducts.length === 0
    ? {
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        taxRate: defaultTaxRate,
        taxBehavior: defaultTaxBehavior,
        isTaxable: false,
        lineItems: [],
      }
    : calculateCheckoutTax(
        selectedProducts.map((sp) => {
          const product = products.find((p) => p._id === sp.productId);
          return { product: product!, quantity: sp.quantity };
        }),
        defaultTaxRate,
        defaultTaxBehavior
      );

  // Extract values from tax calculation
  // subtotal = NET amount (before tax) - correct for both inclusive and exclusive modes
  // taxAmount = tax to charge
  // total = final total (subtotal + tax for exclusive, original price for inclusive)
  const { subtotal: subtotalNet, taxAmount, total } = taxCalculation;

  const formatPrice = (amount: number, currency: string) => {
    // Use locale based on currency for correct thousand/decimal separators
    // EUR, GBP, etc. → European format (1.000,00)
    // USD, CAD, etc. → US format (1,000.00)
    const locale = currency.toUpperCase() === "USD" ? "en-US" : "de-DE";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      alert(t("ui.checkout_template.behavior_driven.product_selection.messages.select_at_least_one"));
      return;
    }

    onComplete({
      selectedProducts: selectedProducts.map(p => ({
        ...p,
        productId: p.productId as Id<"objects">,
      })),
      totalPrice: total,
      taxCalculation: {
        subtotal: subtotalNet,
        taxAmount,
        total,
        taxRate: defaultTaxRate,
        isTaxable: taxCalculation.isTaxable,
        taxBehavior: taxCalculation.taxBehavior,
        lineItems: taxCalculation.lineItems.map(item => ({
          subtotal: item.subtotal,
          taxAmount: item.taxAmount,
          taxRate: item.taxCode ? getTaxRateByCode(item.taxCode, defaultTaxRate) : defaultTaxRate,
          taxable: item.taxable,
          taxCode: item.taxCode,
        })),
      },
    });
  };

  return (
    <div className="w-full sm:max-w-4xl mx-auto p-4 sm:p-6 box-border">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-3xl font-bold mb-2 flex items-center gap-2 sm:gap-3 flex-wrap">
          <ShoppingCart size={24} className="sm:w-8 sm:h-8 flex-shrink-0" />
          <span className="break-words">{t("ui.checkout_template.behavior_driven.product_selection.headers.title")}</span>
        </h2>
        <p className="text-sm sm:text-base break-words" style={{ color: 'var(--color-textLight, #6B7280)' }}>{t("ui.checkout_template.behavior_driven.product_selection.headers.subtitle")}</p>
      </div>

      {/* Product Grid */}
      <div className="grid gap-4 sm:gap-6 mb-6 sm:mb-8 w-full">
        {products.map((product) => {
          const quantity = quantities[product._id] || 0;
          const maxQty = product.customProperties?.maxQuantity || 99;

          return (
            <div
              key={product._id}
              className="bg-white border-2 border-gray-300 rounded-lg p-4 sm:p-6 hover:border-purple-400 transition-colors w-full box-border overflow-hidden"
            >
              {/* Product Info - Stack vertically on mobile */}
              <div className="w-full min-w-0">
                <h3 className="text-lg sm:text-xl font-bold mb-2 break-words overflow-wrap-anywhere">{product.name}</h3>
                {product.description && (
                  <p className="text-sm sm:text-base mb-4 break-words overflow-wrap-anywhere" style={{ color: 'var(--color-textLight, #6B7280)' }}>{product.description}</p>
                )}

                {/* Price and Quantity - On mobile: price + controls on one line, total on second line */}
                <div className="w-full">
                  {/* Price and quantity controls row */}
                  <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
                    <div className="text-xl sm:text-2xl font-bold flex-shrink-0" style={{ color: 'var(--color-primary, #6B46C1)' }}>
                      {formatPrice(product.price, product.currency)}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setQuantities({ ...quantities, [product._id]: Math.max(0, quantity - 1) })}
                        disabled={quantity === 0}
                        className="px-3 py-1 border-2 border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[40px]"
                      >
                        −
                      </button>
                      <span className="w-10 sm:w-12 text-center font-bold">{quantity}</span>
                      <button
                        onClick={() => setQuantities({ ...quantities, [product._id]: Math.min(maxQty, quantity + 1) })}
                        disabled={quantity >= maxQty}
                        className="px-3 py-1 border-2 border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[40px]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total on separate line on mobile, inline on desktop */}
                  {quantity > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 sm:border-0 sm:mt-0 sm:pt-0 text-right">
                      <span className="text-sm text-gray-500 sm:hidden mr-2">{t("ui.checkout_template.behavior_driven.product_selection.cart.total")}:</span>
                      <span className="text-base sm:text-lg font-bold">
                        {formatPrice(product.price * quantity, product.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary with Tax Breakdown */}
      {selectedProducts.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 sm:p-6 mb-6 w-full box-border">
          <h3 className="text-base sm:text-lg font-bold mb-4">{t("ui.checkout_template.behavior_driven.product_selection.cart.title")}</h3>
          <div className="space-y-2 mb-4">
            {selectedProducts.map((sp) => {
              const product = products.find((p) => p._id === sp.productId);
              return (
                <div key={sp.productId} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="break-words min-w-0 flex-1">
                    {product?.name} × {sp.quantity}
                  </span>
                  <span className="font-medium flex-shrink-0">
                    {formatPrice(sp.price * sp.quantity, product?.currency || "EUR")}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Tax Breakdown */}
          <div className="space-y-2 pt-4 border-t-2 border-purple-200">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span>{t("ui.checkout_template.behavior_driven.product_selection.cart.subtotal")}</span>
              <span className="font-medium">{formatPrice(subtotalNet, products[0]?.currency || "EUR")}</span>
            </div>
            {taxCalculation.isTaxable && taxAmount > 0 && taxCalculation.lineItems && (() => {
              // Group line items by tax rate
              const taxGroups = new Map<number, { subtotal: number; taxAmount: number }>();

              for (const item of taxCalculation.lineItems) {
                // Calculate effective tax rate from tax amount and subtotal
                const rate = item.taxable && item.subtotal > 0
                  ? (item.taxAmount / item.subtotal) * 100
                  : 0;
                const roundedRate = Math.round(rate * 10) / 10; // Round to 1 decimal place

                const existing = taxGroups.get(roundedRate) || { subtotal: 0, taxAmount: 0 };
                taxGroups.set(roundedRate, {
                  subtotal: existing.subtotal + item.subtotal,
                  taxAmount: existing.taxAmount + item.taxAmount,
                });
              }

              // Sort by tax rate (0% first, then ascending)
              const sortedRates = Array.from(taxGroups.entries()).sort((a, b) => a[0] - b[0]);

              return (
                <>
                  {sortedRates.map(([rate, amounts]) => {
                    // Ensure rate is a valid number
                    const rateDisplay = typeof rate === 'number' && !isNaN(rate) ? rate.toFixed(1) : '0.0';
                    return (
                      <div key={rate} className="flex flex-wrap justify-between gap-2 text-sm">
                        <span className="break-words">
                          {t("ui.checkout_template.behavior_driven.product_selection.cart.tax")} ({rateDisplay}%)
                          <span className="text-xs ml-1 opacity-70">
                            {taxCalculation.taxBehavior === "inclusive"
                              ? t("ui.checkout_template.behavior_driven.product_selection.cart.tax_included")
                              : t("ui.checkout_template.behavior_driven.product_selection.cart.tax_added")
                            }
                          </span>
                        </span>
                        <span className="font-medium flex-shrink-0">{formatPrice(amounts.taxAmount, products[0]?.currency || "EUR")}</span>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
          <div className="pt-4 border-t-2 border-purple-400 flex flex-wrap justify-between items-center gap-2">
            <span className="text-lg sm:text-xl font-bold">{t("ui.checkout_template.behavior_driven.product_selection.cart.total")}</span>
            <span className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-primary, #6B46C1)' }}>
              {formatPrice(total, products[0]?.currency || "EUR")}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleContinue}
          disabled={selectedProducts.length === 0}
          className="flex-1 px-4 sm:px-6 py-3 text-base sm:text-lg font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors break-words"
        >
          {t("ui.checkout_template.behavior_driven.product_selection.buttons.continue")}
        </button>
      </div>
    </div>
  );
}
