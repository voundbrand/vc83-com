/**
 * VAT NUMBER VALIDATION
 *
 * Country-specific VAT number format validation for B2B billing.
 * Validates format only (not existence with tax authorities).
 *
 * Supported countries:
 * - DE (Germany)
 * - FR (France)
 * - GB (United Kingdom)
 * - ES (Spain)
 * - IT (Italy)
 * - PL (Poland)
 * - NL (Netherlands)
 * - BE (Belgium)
 * - AT (Austria)
 * - SE (Sweden)
 * - DK (Denmark)
 * - FI (Finland)
 * - IE (Ireland)
 * - PT (Portugal)
 * - CZ (Czech Republic)
 * - HU (Hungary)
 * - RO (Romania)
 * - GR (Greece)
 * - US (EIN for tax ID)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VATValidationResult {
  valid: boolean;
  country?: string;
  format: string;
  message?: string;
}

// ============================================================================
// VAT VALIDATION PATTERNS
// ============================================================================

const VAT_PATTERNS: Record<string, { pattern: RegExp; format: string; name: string }> = {
  // EU Countries
  DE: {
    pattern: /^DE\d{9}$/,
    format: "DE123456789",
    name: "Germany",
  },
  FR: {
    pattern: /^FR[A-Z0-9]{2}\d{9}$/,
    format: "FRXX123456789",
    name: "France",
  },
  GB: {
    pattern: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
    format: "GB123456789 or GB123456789012",
    name: "United Kingdom",
  },
  ES: {
    pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    format: "ESX1234567X",
    name: "Spain",
  },
  IT: {
    pattern: /^IT\d{11}$/,
    format: "IT12345678901",
    name: "Italy",
  },
  PL: {
    pattern: /^PL\d{10}$/,
    format: "PL1234567890",
    name: "Poland",
  },
  NL: {
    pattern: /^NL\d{9}B\d{2}$/,
    format: "NL123456789B01",
    name: "Netherlands",
  },
  BE: {
    pattern: /^BE0\d{9}$/,
    format: "BE0123456789",
    name: "Belgium",
  },
  AT: {
    pattern: /^ATU\d{8}$/,
    format: "ATU12345678",
    name: "Austria",
  },
  SE: {
    pattern: /^SE\d{12}$/,
    format: "SE123456789001",
    name: "Sweden",
  },
  DK: {
    pattern: /^DK\d{8}$/,
    format: "DK12345678",
    name: "Denmark",
  },
  FI: {
    pattern: /^FI\d{8}$/,
    format: "FI12345678",
    name: "Finland",
  },
  IE: {
    pattern: /^IE\d[A-Z0-9]\d{5}[A-Z]$/,
    format: "IE1X12345X",
    name: "Ireland",
  },
  PT: {
    pattern: /^PT\d{9}$/,
    format: "PT123456789",
    name: "Portugal",
  },
  CZ: {
    pattern: /^CZ\d{8,10}$/,
    format: "CZ12345678",
    name: "Czech Republic",
  },
  HU: {
    pattern: /^HU\d{8}$/,
    format: "HU12345678",
    name: "Hungary",
  },
  RO: {
    pattern: /^RO\d{2,10}$/,
    format: "RO1234567890",
    name: "Romania",
  },
  GR: {
    pattern: /^(EL|GR)\d{9}$/,
    format: "EL123456789 or GR123456789",
    name: "Greece",
  },
  LU: {
    pattern: /^LU\d{8}$/,
    format: "LU12345678",
    name: "Luxembourg",
  },
  SK: {
    pattern: /^SK\d{10}$/,
    format: "SK1234567890",
    name: "Slovakia",
  },
  SI: {
    pattern: /^SI\d{8}$/,
    format: "SI12345678",
    name: "Slovenia",
  },
  BG: {
    pattern: /^BG\d{9,10}$/,
    format: "BG123456789",
    name: "Bulgaria",
  },
  HR: {
    pattern: /^HR\d{11}$/,
    format: "HR12345678901",
    name: "Croatia",
  },
  CY: {
    pattern: /^CY\d{8}[A-Z]$/,
    format: "CY12345678X",
    name: "Cyprus",
  },
  EE: {
    pattern: /^EE\d{9}$/,
    format: "EE123456789",
    name: "Estonia",
  },
  LV: {
    pattern: /^LV\d{11}$/,
    format: "LV12345678901",
    name: "Latvia",
  },
  LT: {
    pattern: /^LT(\d{9}|\d{12})$/,
    format: "LT123456789 or LT123456789012",
    name: "Lithuania",
  },
  MT: {
    pattern: /^MT\d{8}$/,
    format: "MT12345678",
    name: "Malta",
  },

  // Non-EU countries
  US: {
    pattern: /^US\d{2}-\d{7}$/,
    format: "US12-3456789 (EIN)",
    name: "United States",
  },
  CH: {
    pattern: /^CHE-\d{3}\.\d{3}\.\d{3}$/,
    format: "CHE-123.456.789",
    name: "Switzerland",
  },
  NO: {
    pattern: /^NO\d{9}MVA$/,
    format: "NO123456789MVA",
    name: "Norway",
  },
  AU: {
    pattern: /^AU\d{11}$/,
    format: "AU12345678901 (ABN)",
    name: "Australia",
  },
  CA: {
    pattern: /^CA\d{9}RT\d{4}$/,
    format: "CA123456789RT0001 (GST/HST)",
    name: "Canada",
  },
  JP: {
    pattern: /^JP\d{13}$/,
    format: "JP1234567890123",
    name: "Japan",
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate VAT number format
 */
export function validateVATNumber(vatNumber: string): VATValidationResult {
  if (!vatNumber) {
    return {
      valid: false,
      format: "",
      message: "VAT number is required",
    };
  }

  // Remove spaces and convert to uppercase
  const cleanVAT = vatNumber.replace(/\s/g, "").toUpperCase();

  // Extract country code (first 2 characters)
  const countryCode = cleanVAT.substring(0, 2);

  // Check if country is supported
  const countryPattern = VAT_PATTERNS[countryCode];
  if (!countryPattern) {
    return {
      valid: false,
      format: "",
      message: `Country code "${countryCode}" is not supported. Please use format: CC123456789`,
    };
  }

  // Validate format
  const isValid = countryPattern.pattern.test(cleanVAT);

  if (!isValid) {
    return {
      valid: false,
      country: countryPattern.name,
      format: countryPattern.format,
      message: `Invalid VAT format for ${countryPattern.name}. Expected format: ${countryPattern.format}`,
    };
  }

  return {
    valid: true,
    country: countryPattern.name,
    format: countryPattern.format,
  };
}

/**
 * Format VAT number with proper spacing
 */
export function formatVATNumber(vatNumber: string): string {
  if (!vatNumber) return "";

  const cleanVAT = vatNumber.replace(/\s/g, "").toUpperCase();
  const countryCode = cleanVAT.substring(0, 2);

  // Special formatting for certain countries
  switch (countryCode) {
    case "NL":
      // NL123456789B01 -> NL 1234.5678.9.B01
      if (cleanVAT.length === 14) {
        return `${cleanVAT.substring(0, 2)} ${cleanVAT.substring(2, 6)}.${cleanVAT.substring(6, 10)}.${cleanVAT.substring(10, 11)}.${cleanVAT.substring(11)}`;
      }
      break;
    case "GB":
      // GB123456789 -> GB 123 4567 89
      if (cleanVAT.length === 11) {
        return `${cleanVAT.substring(0, 2)} ${cleanVAT.substring(2, 5)} ${cleanVAT.substring(5, 9)} ${cleanVAT.substring(9)}`;
      }
      break;
    case "CH":
      // CHE-123.456.789 (already formatted)
      return cleanVAT;
    case "US":
      // US12-3456789 (already formatted)
      return cleanVAT;
  }

  // Default: Add space after country code
  return `${cleanVAT.substring(0, 2)} ${cleanVAT.substring(2)}`;
}

/**
 * Get supported countries list
 */
export function getSupportedVATCountries(): Array<{
  code: string;
  name: string;
  format: string;
}> {
  return Object.entries(VAT_PATTERNS).map(([code, info]) => ({
    code,
    name: info.name,
    format: info.format,
  }));
}

/**
 * Check if country uses VAT
 */
export function countryUsesVAT(countryCode: string): boolean {
  return countryCode in VAT_PATTERNS;
}

/**
 * Extract country code from VAT number
 */
export function extractCountryCode(vatNumber: string): string | null {
  if (!vatNumber || vatNumber.length < 2) return null;
  const cleanVAT = vatNumber.replace(/\s/g, "").toUpperCase();
  const countryCode = cleanVAT.substring(0, 2);
  return countryCode in VAT_PATTERNS ? countryCode : null;
}

/**
 * Validate VAT number and return detailed result
 */
export function validateVATWithDetails(vatNumber: string): {
  valid: boolean;
  formatted: string;
  country?: string;
  countryCode?: string;
  errors: string[];
} {
  const errors: string[] = [];

  if (!vatNumber || vatNumber.trim() === "") {
    errors.push("VAT number cannot be empty");
    return { valid: false, formatted: "", errors };
  }

  const validation = validateVATNumber(vatNumber);

  if (!validation.valid) {
    errors.push(validation.message || "Invalid VAT format");
    return {
      valid: false,
      formatted: vatNumber,
      country: validation.country,
      errors,
    };
  }

  const countryCode = extractCountryCode(vatNumber);
  const formatted = formatVATNumber(vatNumber);

  return {
    valid: true,
    formatted,
    country: validation.country,
    countryCode: countryCode || undefined,
    errors: [],
  };
}
