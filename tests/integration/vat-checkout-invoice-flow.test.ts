/**
 * VAT Checkout to Invoice Integration Tests
 *
 * Tests the complete flow from checkout through invoice generation:
 * 1. Organization tax settings (defaultTaxBehavior)
 * 2. Product tax settings (taxBehavior)
 * 3. Tax behavior hierarchy (product overrides organization)
 * 4. Checkout calculation
 * 5. Transaction creation
 * 6. Invoice PDF generation
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { createTestHelper } from "../setup";
import {
  setupVATTestEnvironment,
  createTransactionAndVerify,
  calculateInclusiveVAT,
  calculateExclusiveVAT,
} from "../helpers/vat-test-helpers";

describe("VAT Checkout to Invoice Flow - Integration Tests", () => {
  console.log("🧪 Starting VAT integration test suite...");

  /**
   * Scenario 1: Product INCLUSIVE overrides Organization EXCLUSIVE
   *
   * Setup:
   * - Organization defaultTaxBehavior: "exclusive"
   * - Product taxBehavior: "inclusive"
   *
   * Expected:
   * - Transaction uses INCLUSIVE calculation
   * - €79.00 gross = €66.39 net + €12.61 VAT (19%)
   * - Invoice shows correct inclusive amounts
   */
  it("should use INCLUSIVE pricing when product overrides org EXCLUSIVE setting", async () => {
    const t = createTestHelper();

    try {
      // Setup: Org=exclusive, but product will override with inclusive
      const testEnv = await setupVATTestEnvironment(t, {
        organizationTaxBehavior: "exclusive", // Org default
        productTaxBehavior: "inclusive", // Product OVERRIDES
        taxRate: 19,
      });

      // Calculate expected values for INCLUSIVE pricing
      const expected = calculateInclusiveVAT(7900, 19, 1);

      // Create transaction via checkout simulation
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "VIP Ticket €79 (Inclusive)",
        amountInCents: 7900, // Gross price
        quantity: 1,
        taxRatePercent: 19,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify product INCLUSIVE override worked
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.taxAmountMatches).toBe(true);
      expect(result.verification.totalPriceMatches).toBe(true);

      // Verify actual amounts
      expect(result.verification.actualValues.unitPriceInCents).toBe(6639); // €66.39
      expect(result.verification.actualValues.taxAmountInCents).toBe(1261); // €12.61
      expect(result.verification.actualValues.totalPriceInCents).toBe(7900); // €79.00

      console.log("✅ Scenario 1: Product INCLUSIVE overrides Org EXCLUSIVE");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 2: Product EXCLUSIVE overrides Organization INCLUSIVE
   *
   * Setup:
   * - Organization defaultTaxBehavior: "inclusive"
   * - Product taxBehavior: "exclusive"
   *
   * Expected:
   * - Transaction uses EXCLUSIVE calculation
   * - €66.39 net + €12.61 VAT (19%) = €79.00 gross
   * - Invoice shows correct exclusive amounts
   */
  it("should use EXCLUSIVE pricing when product overrides org INCLUSIVE setting", async () => {
    const t = createTestHelper();

    try {
      // Setup: Org=inclusive, but product will override with exclusive
      const testEnv = await setupVATTestEnvironment(t, {
        organizationTaxBehavior: "inclusive", // Org default
        productTaxBehavior: "exclusive", // Product OVERRIDES
        taxRate: 19,
      });

      // Calculate expected values for EXCLUSIVE pricing
      const expected = calculateExclusiveVAT(6639, 19, 1);

      // Create transaction
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Standard Ticket €66.39 (Exclusive)",
        amountInCents: 6639, // Net price
        quantity: 1,
        taxRatePercent: 19,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify product EXCLUSIVE override worked
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.taxAmountMatches).toBe(true);
      expect(result.verification.totalPriceMatches).toBe(true);

      // Verify actual amounts
      expect(result.verification.actualValues.unitPriceInCents).toBe(6639); // €66.39
      expect(result.verification.actualValues.taxAmountInCents).toBe(1261); // €12.61
      expect(result.verification.actualValues.totalPriceInCents).toBe(7900); // €79.00

      console.log("✅ Scenario 2: Product EXCLUSIVE overrides Org INCLUSIVE");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 3: Product inherits Organization INCLUSIVE (no override)
   *
   * Setup:
   * - Organization defaultTaxBehavior: "inclusive"
   * - Product taxBehavior: undefined (inherits from org)
   *
   * Expected:
   * - Transaction uses INCLUSIVE calculation (inherited)
   * - €79.00 gross = €66.39 net + €12.61 VAT (19%)
   */
  it("should inherit INCLUSIVE pricing from org when product has no tax behavior", async () => {
    const t = createTestHelper();

    try {
      // Setup: Org=inclusive, product has no override
      const testEnv = await setupVATTestEnvironment(t, {
        organizationTaxBehavior: "inclusive", // Org default
        // productTaxBehavior: undefined (not specified = inherit)
        taxRate: 19,
      });

      // Calculate expected values for INCLUSIVE pricing
      const expected = calculateInclusiveVAT(7900, 19, 1);

      // Create transaction
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Early Bird €79 (Inherits Inclusive)",
        amountInCents: 7900, // Gross price
        quantity: 1,
        taxRatePercent: 19,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify inherited INCLUSIVE calculation
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.taxAmountMatches).toBe(true);
      expect(result.verification.totalPriceMatches).toBe(true);

      // Verify actual amounts
      expect(result.verification.actualValues.unitPriceInCents).toBe(6639); // €66.39
      expect(result.verification.actualValues.taxAmountInCents).toBe(1261); // €12.61
      expect(result.verification.actualValues.totalPriceInCents).toBe(7900); // €79.00

      console.log("✅ Scenario 3: Product inherits Org INCLUSIVE");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 4: Product inherits Organization EXCLUSIVE (no override)
   *
   * Setup:
   * - Organization defaultTaxBehavior: "exclusive"
   * - Product taxBehavior: undefined (inherits from org)
   *
   * Expected:
   * - Transaction uses EXCLUSIVE calculation (inherited)
   * - €66.39 net + €12.61 VAT = €79.00 gross
   */
  it("should inherit EXCLUSIVE pricing from org when product has no tax behavior", async () => {
    const t = createTestHelper();

    try {
      // Setup: Org=exclusive, product has no override
      const testEnv = await setupVATTestEnvironment(t, {
        organizationTaxBehavior: "exclusive", // Org default
        // productTaxBehavior: undefined (not specified = inherit)
        taxRate: 19,
      });

      // Calculate expected values for EXCLUSIVE pricing
      const expected = calculateExclusiveVAT(6639, 19, 1);

      // Create transaction
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Regular Ticket €66.39 (Inherits Exclusive)",
        amountInCents: 6639, // Net price
        quantity: 1,
        taxRatePercent: 19,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify inherited EXCLUSIVE calculation
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.taxAmountMatches).toBe(true);
      expect(result.verification.totalPriceMatches).toBe(true);

      // Verify actual amounts
      expect(result.verification.actualValues.unitPriceInCents).toBe(6639); // €66.39
      expect(result.verification.actualValues.taxAmountInCents).toBe(1261); // €12.61
      expect(result.verification.actualValues.totalPriceInCents).toBe(7900); // €79.00

      console.log("✅ Scenario 4: Product inherits Org EXCLUSIVE");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 5: Multiple quantities with INCLUSIVE pricing
   *
   * Setup:
   * - Product taxBehavior: "inclusive"
   * - Quantity: 3
   *
   * Expected:
   * - Total: €237.00 gross = €199.17 net + €37.83 VAT
   */
  it("should calculate correct VAT for multiple quantities with INCLUSIVE pricing", async () => {
    const t = createTestHelper();

    try {
      // Setup: Product with INCLUSIVE pricing
      const testEnv = await setupVATTestEnvironment(t, {
        productTaxBehavior: "inclusive",
        taxRate: 19,
      });

      // Calculate expected values for 3 tickets
      const expected = calculateInclusiveVAT(23700, 19, 3);

      // Create transaction with 3 tickets
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Group Ticket €79 x3 (Inclusive)",
        amountInCents: 23700, // €237.00 total (3 x €79)
        quantity: 3,
        taxRatePercent: 19,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify calculations for 3 tickets
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.taxAmountMatches).toBe(true);
      expect(result.verification.totalPriceMatches).toBe(true);

      console.log("✅ Scenario 5: Multiple quantities INCLUSIVE");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 6: Zero VAT rate (0%)
   *
   * Setup:
   * - Tax rate: 0%
   * - Product taxBehavior: "inclusive"
   *
   * Expected:
   * - €79.00 gross = €79.00 net + €0.00 VAT
   */
  it("should handle zero VAT rate correctly", async () => {
    const t = createTestHelper();

    try {
      // Setup: Product with 0% VAT
      const testEnv = await setupVATTestEnvironment(t, {
        productTaxBehavior: "inclusive",
        taxRate: 0, // 0% VAT
      });

      // Calculate expected values for 0% VAT
      const expected = calculateInclusiveVAT(7900, 0, 1);

      // Create transaction
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Tax-Free Ticket €79 (0% VAT)",
        amountInCents: 7900,
        quantity: 1,
        taxRatePercent: 0,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify no VAT is calculated
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.actualValues.unitPriceInCents).toBe(7900); // Net = Gross
      expect(result.verification.actualValues.taxAmountInCents).toBe(0); // No VAT
      expect(result.verification.actualValues.totalPriceInCents).toBe(7900); // Total = Net

      console.log("✅ Scenario 6: Zero VAT rate handled");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 7: High VAT rate (25%)
   *
   * Setup:
   * - Tax rate: 25% (Nordic countries)
   * - Product taxBehavior: "inclusive"
   *
   * Expected:
   * - €100.00 gross = €80.00 net + €20.00 VAT
   */
  it("should calculate correctly with high VAT rate (25%)", async () => {
    const t = createTestHelper();

    try {
      // Setup: Product with 25% VAT
      const testEnv = await setupVATTestEnvironment(t, {
        productTaxBehavior: "inclusive",
        taxRate: 25,
      });

      // Calculate expected values for 25% VAT
      const expected = calculateInclusiveVAT(10000, 25, 1);

      // Create transaction
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Nordic Ticket €100 (25% VAT)",
        amountInCents: 10000, // €100.00
        quantity: 1,
        taxRatePercent: 25,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify 25% VAT calculation
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.actualValues.unitPriceInCents).toBe(8000); // €80.00
      expect(result.verification.actualValues.taxAmountInCents).toBe(2000); // €20.00
      expect(result.verification.actualValues.totalPriceInCents).toBe(10000); // €100.00

      console.log("✅ Scenario 7: High VAT rate (25%) calculated");
    } finally {
      await t.close();
    }
  }, 30000);

  /**
   * Scenario 8: EXCLUSIVE pricing with multiple quantities
   *
   * Setup:
   * - Product taxBehavior: "exclusive"
   * - Quantity: 5
   *
   * Expected:
   * - €331.95 net + €63.07 VAT = €395.02 gross
   */
  it("should calculate correct VAT for multiple quantities with EXCLUSIVE pricing", async () => {
    const t = createTestHelper();

    try {
      // Setup: Product with EXCLUSIVE pricing
      const testEnv = await setupVATTestEnvironment(t, {
        productTaxBehavior: "exclusive",
        taxRate: 19,
      });

      // Calculate expected values for 5 tickets at €66.39 each
      const expected = calculateExclusiveVAT(33195, 19, 5); // 5 x €66.39 = €331.95

      // Create transaction with 5 tickets
      const result = await createTransactionAndVerify(t, {
        organizationId: testEnv.organization,
        productId: testEnv.product,
        productName: "Group Ticket €66.39 x5 (Exclusive)",
        amountInCents: 33195, // €331.95 net total
        quantity: 5,
        taxRatePercent: 19,
        customerName: "Test Customer",
        expectedUnitPriceInCents: expected.unitPriceInCents,
        expectedTaxAmountInCents: expected.taxAmountInCents,
        expectedTotalPriceInCents: expected.totalPriceInCents,
      });

      // Verify calculations for 5 tickets
      expect(result.verification.unitPriceMatches).toBe(true);
      expect(result.verification.taxAmountMatches).toBe(true);
      expect(result.verification.totalPriceMatches).toBe(true);

      console.log("✅ Scenario 8: Multiple quantities EXCLUSIVE");
    } finally {
      await t.close();
    }
  }, 30000);
});
