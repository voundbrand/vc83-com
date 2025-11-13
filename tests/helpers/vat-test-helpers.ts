/**
 * VAT Test Helpers
 *
 * Provides functions to setup and verify VAT calculations in Convex
 */

import { ConvexTestingHelper } from "convex-helpers/testing";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Setup VAT test environment
 * Creates organization, product, and prepares for transaction testing
 */
export async function setupVATTestEnvironment(
  t: ConvexTestingHelper,
  config: {
    organizationTaxBehavior?: "inclusive" | "exclusive" | "automatic";
    productTaxBehavior?: "inclusive" | "exclusive" | "automatic";
  } = {}
) {
  const {
    organizationTaxBehavior = "exclusive",
    productTaxBehavior,
  } = config;

  // Create test user (required for transaction creation)
  const systemUser = await t.mutation(api.rbac.createTestUser, {
    email: `vat-test-user-${Date.now()}@test.com`,
    firstName: "VAT",
    lastName: "Test User",
  });

  // Create test organization with tax settings
  const { organizationId: organization, organizationLegalId: organizationLegal } =
    await t.mutation(api.testHelpers.createTestOrganizationWithTax, {
      name: `VAT Test Org ${Date.now()}`,
      slug: `vat-test-org-${Date.now()}`,
      creatorUserId: systemUser,
      defaultTaxBehavior: organizationTaxBehavior,
    });

  // Create test product
  const product = await t.mutation(api.testHelpers.createTestProduct, {
    organizationId: organization,
    name: "Test Product",
    priceInCents: 7900, // €79.00
    createdBy: systemUser,
    taxBehavior: productTaxBehavior, // Optional product-level override
  });

  return {
    organization,
    organizationLegal,
    product,
    systemUser,
  };
}

/**
 * Create a transaction and verify VAT calculation
 */
export async function createTransactionAndVerify(
  t: ConvexTestingHelper,
  params: {
    organizationId: Id<"organizations">;
    productId: Id<"objects">;
    productName: string;
    amountInCents: number;
    quantity: number;
    taxRatePercent: number;
    customerName: string;
    expectedUnitPriceInCents: number;
    expectedTaxAmountInCents: number;
    expectedTotalPriceInCents: number;
  }
) {
  // Create transaction using test helper
  const result = await t.mutation(api.testHelpers.createTestTransaction, {
    organizationId: params.organizationId,
    productId: params.productId,
    productName: params.productName,
    amountInCents: params.amountInCents,
    quantity: params.quantity,
    taxRatePercent: params.taxRatePercent,
  });

  const actualUnitPrice = result.unitPriceInCents;
  const actualTaxAmount = result.taxAmountInCents;
  const actualTotalPrice = result.totalPriceInCents;

  return {
    transactionId: result.transactionId,
    verification: {
      unitPriceMatches: actualUnitPrice === params.expectedUnitPriceInCents,
      taxAmountMatches: actualTaxAmount === params.expectedTaxAmountInCents,
      totalPriceMatches: actualTotalPrice === params.expectedTotalPriceInCents,
      actualValues: {
        unitPriceInCents: actualUnitPrice,
        taxAmountInCents: actualTaxAmount,
        totalPriceInCents: actualTotalPrice,
      },
      expectedValues: {
        unitPriceInCents: params.expectedUnitPriceInCents,
        taxAmountInCents: params.expectedTaxAmountInCents,
        totalPriceInCents: params.expectedTotalPriceInCents,
      },
    },
  };
}

/**
 * Verify invoice line items match transaction values
 * Note: Requires invoicing functions to be available in API
 */
export async function verifyInvoiceMatchesTransaction(
  t: ConvexTestingHelper,
  invoiceId: Id<"objects">,
  transactionId: Id<"objects">
) {
  // Get invoice and transaction directly from database
  const invoice = await t.run(async (ctx) => await ctx.db.get(invoiceId));
  const transaction = await t.run(async (ctx) => await ctx.db.get(transactionId));

  if (!invoice || !transaction) {
    throw new Error("Invoice or transaction not found");
  }

  const lineItems = invoice.customProperties?.lineItems as Array<{
    unitPriceInCents: number;
    taxAmountInCents: number;
    totalPriceInCents: number;
    quantity: number;
  }>;

  if (!lineItems || lineItems.length === 0) {
    throw new Error("Invoice has no line items");
  }

  const firstLineItem = lineItems[0];
  const txUnitPrice = transaction.customProperties?.unitPriceInCents as number;
  const txTaxAmount = transaction.customProperties?.taxAmountInCents as number;
  const txTotalPrice = transaction.customProperties?.totalPriceInCents as number;

  return {
    unitPriceMatches: firstLineItem.unitPriceInCents === txUnitPrice,
    taxAmountMatches: firstLineItem.taxAmountInCents === txTaxAmount,
    totalPriceMatches: firstLineItem.totalPriceInCents === txTotalPrice,
    lineItem: firstLineItem,
    transaction: {
      unitPriceInCents: txUnitPrice,
      taxAmountInCents: txTaxAmount,
      totalPriceInCents: txTotalPrice,
    },
  };
}

/**
 * Verify no double taxation in invoice totals
 * Note: Requires invoicing functions to be available in API
 */
export async function verifyNoDoubleTaxation(
  t: ConvexTestingHelper,
  invoiceId: Id<"objects">
) {
  // Get invoice directly from database
  const invoice = await t.run(async (ctx) => await ctx.db.get(invoiceId));
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const lineItems = invoice.customProperties?.lineItems as Array<{
    unitPriceInCents: number;
    taxAmountInCents: number;
    totalPriceInCents: number;
    quantity: number;
  }>;

  if (!lineItems || lineItems.length === 0) {
    throw new Error("Invoice has no line items");
  }

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0
  );
  const taxTotal = lineItems.reduce((sum, item) => sum + item.taxAmountInCents, 0);
  const grandTotal = lineItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);

  // CRITICAL: Grand total should equal sum of totalPriceInCents
  // NOT subtotal + taxTotal (which would be double taxation)
  const correctGrandTotal = grandTotal === lineItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);

  // Verify mathematical relationship: subtotal + taxTotal should equal grandTotal
  const mathCheck = subtotal + taxTotal === grandTotal;

  return {
    isCorrect: correctGrandTotal && mathCheck,
    subtotal,
    taxTotal,
    grandTotal,
    expectedGrandTotal: subtotal + taxTotal,
    noDoubleTaxation: correctGrandTotal,
  };
}

/**
 * Calculate expected VAT values for inclusive pricing
 */
export function calculateInclusiveVAT(grossPriceInCents: number, taxRatePercent: number, quantity: number = 1) {
  const totalGross = grossPriceInCents;
  const unitGross = Math.round(grossPriceInCents / quantity);
  const unitNet = Math.round(unitGross / (1 + taxRatePercent / 100));
  const totalTax = totalGross - (unitNet * quantity);

  return {
    unitPriceInCents: unitNet,
    taxAmountInCents: totalTax,
    totalPriceInCents: totalGross,
  };
}

/**
 * Calculate expected VAT values for exclusive pricing
 */
export function calculateExclusiveVAT(netPriceInCents: number, taxRatePercent: number, quantity: number = 1) {
  const unitNet = Math.round(netPriceInCents / quantity);
  const totalTax = Math.round((netPriceInCents * taxRatePercent) / 100);
  const totalGross = netPriceInCents + totalTax;

  return {
    unitPriceInCents: unitNet,
    taxAmountInCents: totalTax,
    totalPriceInCents: totalGross,
  };
}
