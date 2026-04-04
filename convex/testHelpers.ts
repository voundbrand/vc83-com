/**
 * Test Helpers for VAT Calculation Tests
 *
 * Simple mutations for creating test data without authentication.
 * Used only by VAT calculation tests.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateTransactionLineAmounts } from "./lib/transactionTaxMath";

/**
 * Create test organization with tax settings
 */
export const createTestOrganizationWithTax = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    creatorUserId: v.id("users"),
    defaultTaxBehavior: v.optional(
      v.union(v.literal("inclusive"), v.literal("exclusive"), v.literal("automatic"))
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      businessName: args.name,
      // NOTE: Plan/tier managed in organization_license object
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create organization_legal object with tax settings
    const orgLegalId = await ctx.db.insert("objects", {
      organizationId: orgId,
      type: "organization_legal",
      subtype: "legal_entity",
      name: `${args.name} Legal`,
      description: "Test organization legal entity",
      status: "active",
      createdBy: args.creatorUserId,
      createdAt: now,
      updatedAt: now,
      customProperties: {
        legalName: `${args.name} Legal`,
        taxId: "DE123456789",
        country: "Germany",
        defaultTaxBehavior: args.defaultTaxBehavior || "exclusive",
      },
    });

    return { organizationId: orgId, organizationLegalId: orgLegalId };
  },
});

/**
 * Create test product with tax behavior
 */
export const createTestProduct = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    priceInCents: v.number(),
    createdBy: v.id("users"),
    taxBehavior: v.optional(
      v.union(v.literal("inclusive"), v.literal("exclusive"), v.literal("automatic"))
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const productId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "product",
      subtype: "ticket",
      name: args.name,
      description: "Test product for VAT testing",
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      customProperties: {
        price: args.priceInCents,
        currency: "EUR",
        inventory: 100,
        taxBehavior: args.taxBehavior,
      },
    });

    return productId;
  },
});

/**
 * Create test transaction with VAT calculation
 */
export const createTestTransaction = mutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("objects"),
    productName: v.string(),
    amountInCents: v.number(),
    quantity: v.number(),
    taxRatePercent: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get product to check tax behavior
    const product = await ctx.db.get(args.productId);

    // Get org legal for default tax behavior
    const orgLegal = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_legal")
      )
      .first();

    // Determine tax behavior (same logic as transactionOntology.ts)
    const productTaxBehavior = product?.customProperties?.taxBehavior as
      | "inclusive"
      | "exclusive"
      | "automatic"
      | undefined;
    const orgTaxBehavior =
      (orgLegal?.customProperties?.defaultTaxBehavior as "inclusive" | "exclusive" | "automatic") ||
      "exclusive";
    const taxBehavior = productTaxBehavior || orgTaxBehavior;
    const taxRatePercent = args.taxRatePercent || 0;

    // Calculate VAT (same logic as transactionOntology.ts:538-567)
    const pricing = calculateTransactionLineAmounts({
      amountInCents: args.amountInCents,
      quantity: args.quantity,
      taxRatePercent,
      taxBehavior,
      pricePerUnitInCents: Math.round(args.amountInCents / Math.max(args.quantity, 1)),
    });

    // Create minimal test transaction
    const systemUser = await ctx.db.query("users").first();
    if (!systemUser) {
      throw new Error("No users found - cannot create test transaction");
    }

    const transactionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "transaction",
      subtype: "sale",
      name: `${args.productName} - Test`,
      description: "VAT test transaction",
      status: "active",
      createdBy: systemUser._id,
      createdAt: now,
      updatedAt: now,
      customProperties: {
        productId: args.productId,
        productName: args.productName,
        quantity: args.quantity,
        unitPriceInCents: pricing.unitPriceInCents,
        subtotalInCents: pricing.subtotalInCents,
        taxAmountInCents: pricing.taxAmountInCents,
        totalPriceInCents: pricing.totalPriceInCents,
        totalInCents: pricing.totalPriceInCents,
        taxRatePercent,
        currency: "EUR",
      },
    });

    return {
      transactionId,
      unitPriceInCents: pricing.unitPriceInCents,
      taxAmountInCents: pricing.taxAmountInCents,
      totalPriceInCents: pricing.totalPriceInCents,
    };
  },
});
