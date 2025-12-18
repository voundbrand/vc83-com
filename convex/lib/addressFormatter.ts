/**
 * ADDRESS FORMATTING UTILITY
 *
 * Formats addresses according to regional conventions.
 * Different countries have different address formats:
 * - Germany (DE): Postal code comes BEFORE city (e.g., "12345 Berlin")
 * - US/UK/Canada: City comes before postal code (e.g., "New York, NY 10001")
 * - Most EU countries: Postal code before city (like Germany)
 */

/**
 * Countries where postal code comes BEFORE city (European style)
 */
const POSTAL_CODE_FIRST_COUNTRIES = [
  "DE", // Germany
  "AT", // Austria
  "CH", // Switzerland
  "FR", // France
  "IT", // Italy
  "ES", // Spain
  "NL", // Netherlands
  "BE", // Belgium
  "PL", // Poland
  "CZ", // Czech Republic
  "SE", // Sweden
  "NO", // Norway
  "DK", // Denmark
  "FI", // Finland
  "PT", // Portugal
  "GR", // Greece
  "IE", // Ireland
  "LU", // Luxembourg
  "HU", // Hungary
  "RO", // Romania
  "SK", // Slovakia
  "SI", // Slovenia
  "HR", // Croatia
  "BG", // Bulgaria
  "EE", // Estonia
  "LV", // Latvia
  "LT", // Lithuania
];

/**
 * Format city and postal code according to country conventions
 *
 * @param city - City name
 * @param postalCode - Postal/ZIP code
 * @param country - ISO country code (e.g., "DE", "US")
 * @param state - Optional state/province
 * @returns Formatted city/postal code string
 *
 * @example
 * formatCityPostalCode("Berlin", "12345", "DE") // Returns "12345 Berlin"
 * formatCityPostalCode("New York", "10001", "US", "NY") // Returns "New York, NY 10001"
 */
export function formatCityPostalCode(
  city: string | undefined,
  postalCode: string | undefined,
  country?: string | undefined,
  state?: string | undefined
): string {
  if (!city && !postalCode) return "";

  const countryCode = country?.toUpperCase() || "";
  const isPostalCodeFirst = POSTAL_CODE_FIRST_COUNTRIES.includes(countryCode);

  const parts: string[] = [];

  if (isPostalCodeFirst) {
    // European format: Postal code BEFORE city
    // Example: "12345 Berlin" or "12345 Berlin, Brandenburg"
    if (postalCode) parts.push(postalCode);
    if (city) parts.push(city);
    if (state) parts.push(state);
  } else {
    // US/UK/Canada format: City BEFORE postal code
    // Example: "New York, NY 10001" or "London SW1A 1AA"
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (postalCode) parts.push(postalCode);
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * Format a complete address line (city, state, postal code)
 *
 * @param address - Address object with city, postalCode, state, country
 * @returns Formatted address line
 *
 * @example
 * formatAddressLine({ city: "Berlin", postalCode: "12345", country: "DE" })
 * // Returns "12345 Berlin"
 */
export function formatAddressLine(address: {
  city?: string;
  postalCode?: string;
  state?: string;
  country?: string;
}): string {
  return formatCityPostalCode(
    address.city,
    address.postalCode,
    address.country,
    address.state
  );
}

/**
 * Format full address block (multi-line)
 *
 * @param address - Complete address object
 * @param options - Formatting options
 * @returns Array of address lines
 *
 * @example
 * formatAddressBlock({
 *   line1: "Am Vögenteich 25",
 *   city: "Berlin",
 *   postalCode: "12345",
 *   country: "DE"
 * })
 * // Returns ["Am Vögenteich 25", "12345 Berlin", "Germany"]
 */
export function formatAddressBlock(
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    country?: string;
  },
  options?: {
    includeCountry?: boolean;
    countryName?: string; // Full country name if available
  }
): string[] {
  const lines: string[] = [];

  // Line 1 (street address)
  if (address.line1) {
    lines.push(address.line1);
  }

  // Line 2 (apartment, suite, etc.)
  if (address.line2) {
    lines.push(address.line2);
  }

  // City/Postal code line (formatted according to country)
  const cityPostalLine = formatAddressLine(address);
  if (cityPostalLine) {
    lines.push(cityPostalLine);
  }

  // Country (optional)
  if (options?.includeCountry && (address.country || options.countryName)) {
    lines.push(options.countryName || address.country || "");
  }

  return lines.filter(Boolean);
}

/**
 * Get address format preference for a country
 *
 * @param country - ISO country code
 * @returns Address format preference
 */
export function getAddressFormat(country?: string): {
  postalCodeFirst: boolean;
  format: "european" | "us_uk" | "other";
} {
  const countryCode = country?.toUpperCase() || "";
  const postalCodeFirst = POSTAL_CODE_FIRST_COUNTRIES.includes(countryCode);

  return {
    postalCodeFirst,
    format: postalCodeFirst ? "european" : countryCode === "US" || countryCode === "GB" || countryCode === "CA" ? "us_uk" : "other",
  };
}
