/**
 * VAT VALIDATION SERVICE
 *
 * Validates EU VAT numbers against the VIES (VAT Information Exchange System)
 * https://ec.europa.eu/taxation_customs/vies/
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * EU VIES VAT VALIDATION
 *
 * Validates a VAT number format and checks against EU VIES database
 */
export const validateVATNumber = action({
  args: {
    vatNumber: v.string(),
  },
  handler: async (ctx, args): Promise<{
    valid: boolean;
    countryCode?: string;
    vatNumber?: string;
    requestDate?: string;
    name?: string;
    address?: string;
    error?: string;
  }> => {
    const vatNumber = args.vatNumber.trim().toUpperCase();

    // Extract country code and number
    // IMPORTANT: VIES expects them separated (country code is sent separately from number)
    const countryCode = vatNumber.substring(0, 2);
    let number = vatNumber.substring(2).replace(/[^0-9A-Z]/g, ''); // Remove any non-alphanumeric chars

    // Strip country code prefix if user entered it twice (e.g., "DEDE123456789")
    if (number.startsWith(countryCode)) {
      number = number.substring(2);
    }

    if (!countryCode || !number) {
      return {
        valid: false,
        error: "Invalid VAT format. Must start with 2-letter country code (e.g., DE123456789).",
      };
    }

    // Validate country code is EU member
    const euCountries = [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
      "PL", "PT", "RO", "SK", "SI", "ES", "SE", "XI", // XI = Northern Ireland
    ];

    if (!euCountries.includes(countryCode)) {
      return {
        valid: false,
        error: `${countryCode} is not a valid EU country code`,
      };
    }

    try {
      // Call EU VIES SOAP API with retry logic for rate limiting
      const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types"
               xmlns:impl="urn:ec.europa.eu:taxud:vies:services:checkVat">
  <soap:Header></soap:Header>
  <soap:Body>
    <tns1:checkVat xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types"
                   xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <tns1:countryCode>${countryCode}</tns1:countryCode>
      <tns1:vatNumber>${number}</tns1:vatNumber>
    </tns1:checkVat>
  </soap:Body>
</soap:Envelope>`;

      console.log(`[VAT Validation] Calling VIES API - Country: ${countryCode}, Number: ${number}`);

      // Retry logic for rate limiting (MS_MAX_CONCURRENT_REQ)
      let lastError: string | undefined;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Add delay between retries (exponential backoff)
        if (attempt > 1) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`[VAT Validation] Retry ${attempt}/${maxRetries} after ${delayMs}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const response = await fetch(
          "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
          {
            method: "POST",
            headers: {
              "Content-Type": "text/xml; charset=utf-8",
              "SOAPAction": "",
            },
            body: soapRequest,
          }
        );

        console.log(`[VAT Validation] VIES response status: ${response.status}`);

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`[VAT Validation] HTTP error: ${lastError}`);
          continue; // Retry
        }

        const xmlText = await response.text();
        console.log(`[VAT Validation] Response XML length: ${xmlText.length} chars`);

        // Check for SOAP faults
        if (xmlText.includes("<soap:Fault>") || xmlText.includes("faultstring")) {
          const faultMatch = xmlText.match(/<faultstring>([^<]*)<\/faultstring>/);
          const faultMessage = faultMatch ? faultMatch[1] : "VIES service error";
          console.log(`[VAT Validation] SOAP Fault: ${faultMessage}`);

          // Check if it's a rate limit error - retry if so
          if (faultMessage.includes("MS_MAX_CONCURRENT_REQ") ||
              faultMessage.includes("MS_UNAVAILABLE") ||
              faultMessage.includes("SERVER_BUSY")) {
            lastError = faultMessage;
            console.log(`[VAT Validation] Rate limit/busy error, will retry...`);
            continue; // Retry
          }

          // Other SOAP faults are not retryable
          return {
            valid: false,
            countryCode,
            vatNumber: number,
            error: `VIES service temporarily unavailable. Please try again in a few minutes.`,
          };
        }

        // Parse SOAP response - success!
        // Handle both with and without namespace prefix (ns2:valid or valid)
        const isValid = xmlText.includes("<valid>true</valid>") ||
                       xmlText.includes(":valid>true</") ||
                       xmlText.includes("<ns2:valid>true</ns2:valid>");
        console.log(`[VAT Validation] Valid status: ${isValid}`);

        if (!isValid) {
          return {
            valid: false,
            countryCode,
            vatNumber: number,
            error: "VAT number not found in EU VIES database or format invalid for this country",
          };
        }

        // Extract company info from response
        // Handle XML namespaces (ns2:name, ns2:address, etc.)
        const extractValue = (tag: string): string | undefined => {
          // Try with namespace prefix first (ns2:name, etc.)
          const nsMatch = xmlText.match(new RegExp(`<[^:]*:${tag}>([^<]*)</[^:]*:${tag}>`));
          if (nsMatch) return nsMatch[1];

          // Fallback to without namespace
          const match = xmlText.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
          return match ? match[1] : undefined;
        };

        return {
          valid: true,
          countryCode,
          vatNumber: number,
          requestDate: extractValue("requestDate"),
          name: extractValue("name"),
          address: extractValue("address"),
        };
      }

      // All retries exhausted
      return {
        valid: false,
        countryCode,
        vatNumber: number,
        error: `VIES service is busy (${lastError || 'rate limited'}). Please try again in a few minutes.`,
      };
    } catch (error) {
      console.error("VAT validation error:", error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error occurred during validation",
      };
    }
  },
});

/**
 * VALIDATE VAT FORMAT (CLIENT-SIDE)
 *
 * Quick format validation without calling VIES API
 * Based on EU VAT number formats
 */
export const validateVATFormat = (vatNumber: string): { valid: boolean; error?: string } => {
  const vat = vatNumber.trim().toUpperCase();
  const countryCode = vat.substring(0, 2);
  const number = vat.substring(2);

  if (!countryCode || !number) {
    return { valid: false, error: "Must start with 2-letter country code" };
  }

  // VAT format patterns by country
  const patterns: Record<string, RegExp> = {
    AT: /^U\d{8}$/, // Austria
    BE: /^[0-1]\d{9}$/, // Belgium
    BG: /^\d{9,10}$/, // Bulgaria
    CY: /^\d{8}[A-Z]$/, // Cyprus
    CZ: /^\d{8,10}$/, // Czech Republic
    DE: /^\d{9}$/, // Germany
    DK: /^\d{8}$/, // Denmark
    EE: /^\d{9}$/, // Estonia
    EL: /^\d{9}$/, // Greece (EL code)
    GR: /^\d{9}$/, // Greece (GR code)
    ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/, // Spain
    FI: /^\d{8}$/, // Finland
    FR: /^[A-Z0-9]{2}\d{9}$/, // France
    GB: /^(\d{9}|\d{12}|(GD|HA)\d{3})$/, // United Kingdom
    HR: /^\d{11}$/, // Croatia
    HU: /^\d{8}$/, // Hungary
    IE: /^(\d{7}[A-Z]{1,2}|\d[A-Z]\d{5}[A-Z])$/, // Ireland
    IT: /^\d{11}$/, // Italy
    LT: /^(\d{9}|\d{12})$/, // Lithuania
    LU: /^\d{8}$/, // Luxembourg
    LV: /^\d{11}$/, // Latvia
    MT: /^\d{8}$/, // Malta
    NL: /^\d{9}B\d{2}$/, // Netherlands
    PL: /^\d{10}$/, // Poland
    PT: /^\d{9}$/, // Portugal
    RO: /^\d{2,10}$/, // Romania
    SE: /^\d{12}$/, // Sweden
    SI: /^\d{8}$/, // Slovenia
    SK: /^\d{10}$/, // Slovakia
    XI: /^\d{9}$/, // Northern Ireland
  };

  const pattern = patterns[countryCode];
  if (!pattern) {
    return { valid: false, error: `Unknown country code: ${countryCode}` };
  }

  if (!pattern.test(number)) {
    return { valid: false, error: `Invalid ${countryCode} VAT format` };
  }

  return { valid: true };
};
