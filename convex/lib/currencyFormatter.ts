/**
 * CURRENCY FORMATTER
 *
 * Provides locale-aware currency formatting for invoices and tickets.
 * Uses Intl.NumberFormat for proper international formatting.
 */

export interface CurrencyFormatterOptions {
  locale: string; // e.g., "de-DE", "en-US"
  currency: string; // e.g., "EUR", "USD"
}

/**
 * Format amount in cents to localized currency string
 *
 * @param amountInCents - Amount in cents (e.g., 7900 = €79.00 or $79.00)
 * @param options - Locale and currency settings
 * @returns Formatted string (e.g., "79,00 €" for de-DE, "$79.00" for en-US)
 *
 * @example
 * formatCurrency(7900, { locale: "de-DE", currency: "EUR" })
 * // Returns: "79,00 €"
 *
 * formatCurrency(7900, { locale: "en-US", currency: "USD" })
 * // Returns: "$79.00"
 *
 * formatCurrency(120000, { locale: "de-DE", currency: "EUR" })
 * // Returns: "1.200,00 €"
 */
export function formatCurrency(
  amountInCents: number,
  options: CurrencyFormatterOptions
): string {
  const amountInMajorUnits = amountInCents / 100;

  try {
    return new Intl.NumberFormat(options.locale, {
      style: "currency",
      currency: options.currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountInMajorUnits);
  } catch (error) {
    // Fallback to basic formatting if locale/currency not supported
    console.error(`[formatCurrency] Error formatting ${amountInCents} with locale ${options.locale}, currency ${options.currency}:`, error);

    // Basic fallback
    const symbol = getCurrencySymbol(options.currency);
    const formatted = (amountInMajorUnits).toFixed(2);

    // Simple heuristic: EUR usually goes after, USD before
    if (options.currency.toUpperCase() === "EUR") {
      return `${formatted} ${symbol}`;
    }
    return `${symbol}${formatted}`;
  }
}

/**
 * Format amount without currency symbol (just the number)
 *
 * @param amountInCents - Amount in cents
 * @param locale - Locale for number formatting
 * @returns Formatted number string
 *
 * @example
 * formatNumber(7900, "de-DE")
 * // Returns: "79,00"
 *
 * formatNumber(120000, "de-DE")
 * // Returns: "1.200,00"
 */
export function formatNumber(amountInCents: number, locale: string): string {
  const amountInMajorUnits = amountInCents / 100;

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountInMajorUnits);
  } catch (error) {
    // Fallback
    console.error(`[formatNumber] Error formatting ${amountInCents} with locale ${locale}:`, error);
    return (amountInMajorUnits).toFixed(2);
  }
}

/**
 * Get currency symbol for a currency code
 *
 * @param currencyCode - ISO currency code (e.g., "EUR", "USD")
 * @returns Currency symbol (e.g., "€", "$")
 */
export function getCurrencySymbol(currencyCode: string): string {
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

/**
 * Validate locale and currency combination
 *
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Whether the combination is valid
 */
export function isValidLocaleCurrency(locale: string, currency: string): boolean {
  try {
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    return true;
  } catch {
    return false;
  }
}
