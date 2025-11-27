/**
 * CENTRALIZED CURRENCY FORMATTING HOOK
 *
 * Provides consistent, locale-aware currency formatting across the entire app.
 * Currency and locale are determined by ORGANIZATION SETTINGS, not browser detection.
 *
 * Organization settings are stored in: organization_settings (type) with subtype "locale"
 * Fields: customProperties.currency, customProperties.locale
 *
 * This ensures:
 * - Consistent currency across all invoices, emails, PDFs, checkout
 * - Business-level decision (not technical/browser-based)
 * - Single source of truth from organization settings
 */

import { useMemo } from "react";

export interface FormatCurrencyOptions {
  /**
   * Currency code (e.g., "EUR", "USD").
   * Should come from organization settings, NOT hardcoded.
   * Use with: useCurrentOrganization() to get org currency
   */
  currency?: string;
  /**
   * Locale for formatting (e.g., "de-DE", "en-US").
   * Auto-detected based on currency if not provided
   */
  locale?: string;
}

/**
 * Default locale mapping based on currency
 */
const DEFAULT_LOCALE_MAP: Record<string, string> = {
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  JPY: "ja-JP",
  CHF: "de-CH",
  CAD: "en-CA",
  AUD: "en-AU",
};

/**
 * Hook for consistent currency formatting across the app
 *
 * @param options - Default currency and locale settings
 * @returns formatCurrency function
 *
 * @example
 * // In a component:
 * const { formatCurrency } = useFormatCurrency({ currency: "EUR" });
 * formatCurrency(12000) // "120,00 €" (in de-DE locale)
 *
 * @example
 * // With custom locale:
 * const { formatCurrency } = useFormatCurrency({ currency: "EUR", locale: "en-US" });
 * formatCurrency(12000) // "€120.00" (in en-US locale)
 *
 * @example
 * // Override per call:
 * const { formatCurrency } = useFormatCurrency({ currency: "EUR" });
 * formatCurrency(12000, "USD") // "$120.00"
 */
export function useFormatCurrency(options: FormatCurrencyOptions = {}) {
  const defaultCurrency = options.currency || "EUR";
  const defaultLocale = options.locale || DEFAULT_LOCALE_MAP[defaultCurrency.toUpperCase()] || "de-DE";

  /**
   * Format amount in cents to localized currency string
   *
   * @param amountInCents - Amount in cents (e.g., 12000 = €120.00)
   * @param currencyOverride - Optional currency override for this specific call
   * @returns Formatted currency string
   */
  const formatCurrency = useMemo(
    () => (amountInCents: number, currencyOverride?: string): string => {
      const currency = currencyOverride || defaultCurrency;
      const locale = DEFAULT_LOCALE_MAP[currency.toUpperCase()] || defaultLocale;
      const amountInMajorUnits = amountInCents / 100;

      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency.toUpperCase(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amountInMajorUnits);
      } catch (error) {
        // Fallback to basic formatting
        console.error(
          `[useFormatCurrency] Error formatting ${amountInCents} with locale ${locale}, currency ${currency}:`,
          error
        );

        // Basic fallback with symbol
        const symbol = getCurrencySymbol(currency);
        const formatted = amountInMajorUnits.toFixed(2);

        // EUR usually goes after, others before
        if (currency.toUpperCase() === "EUR") {
          return `${formatted} ${symbol}`;
        }
        return `${symbol}${formatted}`;
      }
    },
    [defaultCurrency, defaultLocale]
  );

  /**
   * Format amount without currency symbol (just the number)
   *
   * @param amountInCents - Amount in cents
   * @returns Formatted number string
   */
  const formatNumber = useMemo(
    () => (amountInCents: number): string => {
      const amountInMajorUnits = amountInCents / 100;

      try {
        return new Intl.NumberFormat(defaultLocale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amountInMajorUnits);
      } catch (error) {
        console.error(`[useFormatCurrency] Error formatting number ${amountInCents}:`, error);
        return amountInMajorUnits.toFixed(2);
      }
    },
    [defaultLocale]
  );

  return {
    formatCurrency,
    formatNumber,
    currency: defaultCurrency,
    locale: defaultLocale,
  };
}

/**
 * Get currency symbol for a currency code
 */
function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    JPY: "¥",
    CHF: "CHF",
    CAD: "$",
    AUD: "$",
  };

  return symbols[currencyCode.toUpperCase()] || currencyCode;
}
