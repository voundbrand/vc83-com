/**
 * PII detection patterns, with a focus on German data formats.
 * Each pattern has a type label, regex, and confidence level.
 */
export interface PiiPattern {
  type: string;
  pattern: RegExp;
  confidence: "high" | "medium" | "low";
}

export const PII_PATTERNS: PiiPattern[] = [
  // Email
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    confidence: "high",
  },

  // Phone numbers (German formats)
  {
    type: "phone_de",
    pattern: /(?:\+49|0049|0)\s?[\d\s/()-]{6,14}\d/g,
    confidence: "medium",
  },

  // IBAN (German: DE + 2 check digits + 18 digits)
  {
    type: "iban_de",
    pattern: /\bDE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/gi,
    confidence: "high",
  },

  // Generic IBAN (EU countries)
  {
    type: "iban",
    pattern: /\b[A-Z]{2}\d{2}\s?[\dA-Z\s]{10,30}\b/g,
    confidence: "medium",
  },

  // German tax ID (Steuer-ID: 11 digits)
  {
    type: "tax_id_de",
    pattern: /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g,
    confidence: "low",
  },

  // German social security number (Sozialversicherungsnummer: 12 chars)
  {
    type: "social_security_de",
    pattern: /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b/g,
    confidence: "medium",
  },

  // Credit card numbers (basic Luhn-compatible patterns)
  {
    type: "credit_card",
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    confidence: "medium",
  },

  // German postal code + city (common in addresses)
  {
    type: "address_de",
    pattern: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?\b/g,
    confidence: "low",
  },

  // Date of birth patterns (DD.MM.YYYY German format)
  {
    type: "date_of_birth",
    pattern:
      /\b(?:0[1-9]|[12]\d|3[01])\.(?:0[1-9]|1[0-2])\.(?:19|20)\d{2}\b/g,
    confidence: "low",
  },

  // Health insurance number (German Krankenversicherungsnummer)
  {
    type: "health_insurance_de",
    pattern: /\b[A-Z]\d{9}\b/g,
    confidence: "low",
  },

  // IP addresses
  {
    type: "ip_address",
    pattern:
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    confidence: "medium",
  },
];
