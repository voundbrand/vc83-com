/**
 * VAT Calculation Tests
 *
 * Tests comprehensive VAT calculation functionality including:
 * - Inclusive pricing (gross price includes VAT)
 * - Exclusive pricing (net price excludes VAT)
 * - Product-level tax behavior overrides
 * - Organization-level tax behavior defaults
 * - Invoice generation and validation
 * - No double taxation verification
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

describe("VAT Calculation - Inclusive Pricing", () => {
  let t: ConvexTestingHelper;
  let testEnv: Awaited<ReturnType<typeof setupVATTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();

    // Setup test environment with inclusive pricing at organization level
    testEnv = await setupVATTestEnvironment(t, {
      organizationTaxBehavior: "inclusive",
      taxRate: 19,
    });
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  it("should calculate VAT correctly for single item with inclusive pricing", async () => {
    /**
     * Test Case: €79.00 gross price with 19% VAT
     * Expected:
     * - Unit net: €66.39 (7900 / 1.19 = 6639 cents)
     * - VAT: €12.61 (7900 - 6639 = 1261 cents)
     * - Total: €79.00 (7900 cents)
     */
    const expected = calculateInclusiveVAT(7900, 19, 1);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Test Ticket €79",
      amountInCents: 7900, // Gross price
      quantity: 1,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);

    // Verify actual values
    expect(result.verification.actualValues.unitPriceInCents).toBe(6639);
    expect(result.verification.actualValues.taxAmountInCents).toBe(1261);
    expect(result.verification.actualValues.totalPriceInCents).toBe(7900);
  }, 30000);

  it("should calculate VAT correctly for multiple quantities with inclusive pricing", async () => {
    /**
     * Test Case: €158.00 gross total for 2 items (€79 each) with 19% VAT
     * Expected:
     * - Unit net: €66.39 (7900 / 1.19 = 6639 cents per item)
     * - VAT: €25.22 (15800 - (6639 * 2) = 2522 cents total)
     * - Total: €158.00 (15800 cents)
     */
    const expected = calculateInclusiveVAT(15800, 19, 2);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Test Ticket €79 x2",
      amountInCents: 15800, // Gross total for 2 items
      quantity: 2,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);

    // Verify actual values
    expect(result.verification.actualValues.unitPriceInCents).toBe(6639);
    expect(result.verification.actualValues.taxAmountInCents).toBe(2522);
    expect(result.verification.actualValues.totalPriceInCents).toBe(15800);
  }, 30000);

  it("should handle zero tax rate correctly", async () => {
    /**
     * Test Case: €100.00 with 0% VAT
     * Expected:
     * - Unit net: €100.00 (10000 cents)
     * - VAT: €0.00 (0 cents)
     * - Total: €100.00 (10000 cents)
     */
    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Tax-free Product €100",
      amountInCents: 10000,
      quantity: 1,
      taxRatePercent: 0,
      customerName: "Test Customer",
      expectedUnitPriceInCents: 10000,
      expectedTaxAmountInCents: 0,
      expectedTotalPriceInCents: 10000,
    });

    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);
  }, 30000);
});

describe("VAT Calculation - Exclusive Pricing", () => {
  let t: ConvexTestingHelper;
  let testEnv: Awaited<ReturnType<typeof setupVATTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();

    // Setup test environment with exclusive pricing at organization level
    testEnv = await setupVATTestEnvironment(t, {
      organizationTaxBehavior: "exclusive",
      taxRate: 19,
    });
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  it("should add VAT on top of net price for exclusive pricing", async () => {
    /**
     * Test Case: €66.39 net price with 19% VAT
     * Expected:
     * - Unit net: €66.39 (6639 cents)
     * - VAT: €12.61 (6639 * 0.19 = 1261 cents)
     * - Total: €79.00 (6639 + 1261 = 7900 cents)
     */
    const expected = calculateExclusiveVAT(6639, 19, 1);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Test Ticket €66.39 net",
      amountInCents: 6639, // Net price
      quantity: 1,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);

    // Verify actual values
    expect(result.verification.actualValues.unitPriceInCents).toBe(6639);
    expect(result.verification.actualValues.taxAmountInCents).toBe(1261);
    expect(result.verification.actualValues.totalPriceInCents).toBe(7900);
  }, 30000);

  it("should calculate exclusive VAT for multiple quantities", async () => {
    /**
     * Test Case: €132.78 net total for 2 items (€66.39 each) with 19% VAT
     * Expected:
     * - Unit net: €66.39 (6639 cents)
     * - VAT: €25.22 (13278 * 0.19 = 2522 cents)
     * - Total: €158.00 (13278 + 2522 = 15800 cents)
     */
    const expected = calculateExclusiveVAT(13278, 19, 2);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Test Ticket €66.39 x2 net",
      amountInCents: 13278, // Net total for 2 items
      quantity: 2,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);
  }, 30000);
});

describe("VAT Calculation - Tax Behavior Hierarchy", () => {
  let t: ConvexTestingHelper;

  beforeAll(async () => {
    t = createTestHelper();
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  it("should use product-level tax behavior when it overrides organization default", async () => {
    /**
     * Test Case: Organization set to "exclusive", Product set to "inclusive"
     * Expected: Should use INCLUSIVE calculation from product level
     *
     * €79.00 gross price with 19% VAT (inclusive)
     * Expected:
     * - Unit net: €66.39 (6639 cents)
     * - VAT: €12.61 (1261 cents)
     * - Total: €79.00 (7900 cents)
     */
    const testEnv = await setupVATTestEnvironment(t, {
      organizationTaxBehavior: "exclusive", // Organization default
      productTaxBehavior: "inclusive", // Product override
      taxRate: 19,
    });

    const expected = calculateInclusiveVAT(7900, 19, 1);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Product Override Test",
      amountInCents: 7900, // Gross price
      quantity: 1,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    // Verify it used inclusive calculation (from product), not exclusive (from org)
    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);
    expect(result.verification.actualValues.unitPriceInCents).toBe(6639); // Inclusive result
  }, 30000);

  it("should fall back to organization default when product has no tax behavior set", async () => {
    /**
     * Test Case: Organization set to "inclusive", Product has NO taxBehavior
     * Expected: Should use INCLUSIVE calculation from organization default
     *
     * €79.00 gross price with 19% VAT (inclusive)
     * Expected:
     * - Unit net: €66.39 (6639 cents)
     * - VAT: €12.61 (1261 cents)
     * - Total: €79.00 (7900 cents)
     */
    const testEnv = await setupVATTestEnvironment(t, {
      organizationTaxBehavior: "inclusive", // Organization default
      productTaxBehavior: undefined, // No product override
      taxRate: 19,
    });

    const expected = calculateInclusiveVAT(7900, 19, 1);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Org Default Test",
      amountInCents: 7900, // Gross price
      quantity: 1,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    // Verify it used organization default
    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);
  }, 30000);
});

describe("Math Verification Tests", () => {
  it("should correctly calculate inclusive VAT with helper function", () => {
    /**
     * Verify the calculateInclusiveVAT helper matches expected math
     * €79.00 ÷ 1.19 = €66.39 net, VAT = €12.61
     */
    const result = calculateInclusiveVAT(7900, 19, 1);

    expect(result.unitPriceInCents).toBe(6639);
    expect(result.taxAmountInCents).toBe(1261);
    expect(result.totalPriceInCents).toBe(7900);

    // Math check: net + vat = gross
    expect(result.unitPriceInCents + result.taxAmountInCents).toBe(result.totalPriceInCents);
  });

  it("should correctly calculate exclusive VAT with helper function", () => {
    /**
     * Verify the calculateExclusiveVAT helper matches expected math
     * €66.39 × 1.19 = €79.00 gross, VAT = €12.61
     */
    const result = calculateExclusiveVAT(6639, 19, 1);

    expect(result.unitPriceInCents).toBe(6639);
    expect(result.taxAmountInCents).toBe(1261);
    expect(result.totalPriceInCents).toBe(7900);

    // Math check: net + vat = gross
    expect(result.unitPriceInCents + result.taxAmountInCents).toBe(result.totalPriceInCents);
  });

  it("should handle rounding correctly for inclusive VAT", () => {
    /**
     * Test rounding edge case
     * €100.00 ÷ 1.19 = €84.0336... → should round to €84.03
     */
    const result = calculateInclusiveVAT(10000, 19, 1);

    // 10000 / 1.19 = 8403.36... → rounds to 8403
    expect(result.unitPriceInCents).toBe(8403);
    expect(result.taxAmountInCents).toBe(1597); // 10000 - 8403
    expect(result.totalPriceInCents).toBe(10000);
  });
});

describe("Edge Cases and Error Handling", () => {
  let t: ConvexTestingHelper;
  let testEnv: Awaited<ReturnType<typeof setupVATTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();
    testEnv = await setupVATTestEnvironment(t, {
      organizationTaxBehavior: "inclusive",
      taxRate: 19,
    });
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  it("should handle very small amounts correctly", async () => {
    /**
     * Test Case: €0.01 (1 cent) with 19% VAT
     * Expected: Should not cause division errors
     */
    const expected = calculateInclusiveVAT(1, 19, 1);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Tiny Amount Test",
      amountInCents: 1,
      quantity: 1,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    expect(result.verification.totalPriceMatches).toBe(true);
  }, 30000);

  it("should handle large amounts correctly", async () => {
    /**
     * Test Case: €10,000.00 with 19% VAT
     * Expected: Should handle large numbers without overflow
     */
    const expected = calculateInclusiveVAT(1000000, 19, 1);

    const result = await createTransactionAndVerify(t, {
      organizationId: testEnv.organization,
      productId: testEnv.product,
      productName: "Large Amount Test",
      amountInCents: 1000000, // €10,000
      quantity: 1,
      taxRatePercent: 19,
      customerName: "Test Customer",
      expectedUnitPriceInCents: expected.unitPriceInCents,
      expectedTaxAmountInCents: expected.taxAmountInCents,
      expectedTotalPriceInCents: expected.totalPriceInCents,
    });

    expect(result.verification.unitPriceMatches).toBe(true);
    expect(result.verification.taxAmountMatches).toBe(true);
    expect(result.verification.totalPriceMatches).toBe(true);
  }, 30000);
});
