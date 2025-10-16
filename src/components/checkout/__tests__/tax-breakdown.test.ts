/**
 * TAX BREAKDOWN COMPONENT TESTS
 *
 * Tests for tax calculation logic and display components.
 */

import { describe, it, expect } from "vitest";
import { calculateTaxFromItems } from "../tax-breakdown";

describe("Tax Breakdown Calculations", () => {
  describe("calculateTaxFromItems", () => {
    it("calculates exclusive tax correctly", () => {
      const items = [{ price: 10000, taxable: true }]; // $100.00
      const quantity = 2;
      const taxRate = 0.085; // 8.5%

      const result = calculateTaxFromItems(items, quantity, taxRate, "exclusive");

      expect(result.subtotal).toBe(20000); // $200.00
      expect(result.taxAmount).toBe(1700); // $17.00 (8.5% of $200)
      expect(result.total).toBe(21700); // $217.00
      expect(result.taxBehavior).toBe("exclusive");
    });

    it("calculates inclusive tax correctly", () => {
      const items = [{ price: 10000, taxable: true }]; // $100.00 (includes tax)
      const quantity = 1;
      const taxRate = 0.19; // 19% VAT

      const result = calculateTaxFromItems(items, quantity, taxRate, "inclusive");

      expect(result.total).toBe(10000); // $100.00
      expect(result.taxAmount).toBe(1597); // ~$15.97 (tax portion)
      expect(result.subtotal).toBe(8403); // ~$84.03 (net amount)
      expect(result.taxBehavior).toBe("inclusive");
    });

    it("handles multiple items", () => {
      const items = [
        { price: 5000, taxable: true }, // $50.00
        { price: 3000, taxable: true }, // $30.00
      ];
      const quantity = 1;
      const taxRate = 0.1; // 10%

      const result = calculateTaxFromItems(items, quantity, taxRate, "exclusive");

      expect(result.subtotal).toBe(8000); // $80.00
      expect(result.taxAmount).toBe(800); // $8.00 (10% of $80)
      expect(result.total).toBe(8800); // $88.00
    });

    it("excludes non-taxable items from tax calculation", () => {
      const items = [
        { price: 10000, taxable: true }, // $100.00 - taxable
        { price: 5000, taxable: false }, // $50.00 - not taxable
      ];
      const quantity = 1;
      const taxRate = 0.08; // 8%

      const result = calculateTaxFromItems(items, quantity, taxRate, "exclusive");

      // Only $100 should be taxed
      expect(result.subtotal).toBe(10000); // Only taxable items
      expect(result.taxAmount).toBe(800); // 8% of $100
      expect(result.total).toBe(10800); // $108.00
    });

    it("handles zero tax rate", () => {
      const items = [{ price: 10000, taxable: true }];
      const quantity = 1;
      const taxRate = 0;

      const result = calculateTaxFromItems(items, quantity, taxRate, "exclusive");

      expect(result.subtotal).toBe(10000);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(10000);
    });

    it("handles quantity multiplier", () => {
      const items = [{ price: 2500, taxable: true }]; // $25.00
      const quantity = 4;
      const taxRate = 0.06; // 6%

      const result = calculateTaxFromItems(items, quantity, taxRate, "exclusive");

      expect(result.subtotal).toBe(10000); // $25 × 4 = $100
      expect(result.taxAmount).toBe(600); // 6% of $100
      expect(result.total).toBe(10600); // $106.00
    });

    it("defaults to exclusive when behavior is automatic", () => {
      const items = [{ price: 10000, taxable: true }];
      const quantity = 1;
      const taxRate = 0.1;

      const result = calculateTaxFromItems(items, quantity, taxRate, "automatic");

      // Should behave like exclusive
      expect(result.subtotal).toBe(10000);
      expect(result.taxAmount).toBe(1000);
      expect(result.total).toBe(11000);
      expect(result.taxBehavior).toBe("automatic");
    });
  });
});

/**
 * MANUAL TAX CALCULATION TEST CASES
 *
 * These are reference calculations for different jurisdictions:
 */

describe("Manual Tax Calculation Test Cases", () => {
  it("US Sales Tax (California) - Exclusive", () => {
    // California sales tax: 8.5%
    // Product: $120.00
    const items = [{ price: 12000, taxable: true }];
    const result = calculateTaxFromItems(items, 1, 0.085, "exclusive");

    expect(result.subtotal).toBe(12000); // $120.00
    expect(result.taxAmount).toBe(1020); // $10.20
    expect(result.total).toBe(13020); // $130.20
  });

  it("EU VAT (Germany) - Inclusive", () => {
    // German VAT: 19%
    // Product price: €119.00 (includes VAT)
    const items = [{ price: 11900, taxable: true }];
    const result = calculateTaxFromItems(items, 1, 0.19, "inclusive");

    expect(result.total).toBe(11900); // €119.00
    expect(result.taxAmount).toBe(1898); // ~€18.98
    expect(result.subtotal).toBe(10002); // ~€100.02
  });

  it("Canada GST - Exclusive", () => {
    // Canadian GST: 5%
    // Product: CAD $100.00
    const items = [{ price: 10000, taxable: true }];
    const result = calculateTaxFromItems(items, 1, 0.05, "exclusive");

    expect(result.subtotal).toBe(10000); // $100.00
    expect(result.taxAmount).toBe(500); // $5.00
    expect(result.total).toBe(10500); // $105.00
  });

  it("UK VAT - Inclusive", () => {
    // UK VAT: 20%
    // Product price: £120.00 (includes VAT)
    const items = [{ price: 12000, taxable: true }];
    const result = calculateTaxFromItems(items, 1, 0.2, "inclusive");

    expect(result.total).toBe(12000); // £120.00
    expect(result.taxAmount).toBe(2000); // £20.00
    expect(result.subtotal).toBe(10000); // £100.00
  });

  it("Multiple items with mixed taxable status", () => {
    // Event tickets (taxable) + digital content (non-taxable)
    const items = [
      { price: 5000, taxable: true }, // Ticket: $50.00
      { price: 1000, taxable: false }, // Digital download: $10.00 (non-taxable)
    ];
    const quantity = 2;
    const result = calculateTaxFromItems(items, quantity, 0.08, "exclusive");

    // Only tickets are taxed
    expect(result.subtotal).toBe(10000); // $50 × 2 = $100 (taxable only)
    expect(result.taxAmount).toBe(800); // 8% of $100
    expect(result.total).toBe(10800); // $108.00 (excludes non-taxable $20)
  });
});
