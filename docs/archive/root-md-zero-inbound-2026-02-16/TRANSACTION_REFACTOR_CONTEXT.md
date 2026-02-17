# Transaction Data Model Refactor - Implementation Context

## 🔴 CRITICAL ISSUE DISCOVERED

**Problem:** The system currently creates **one transaction per product** in a checkout, but it should create **one transaction per checkout** with multiple line items.

**Impact:**
- Invoices show multiple transactions when they should show one consolidated transaction
- Currency/totals are split across multiple records
- Invoice email resolver can't properly fetch "the transaction" (which one?)
- Accounting reports show inflated transaction counts

---

## 📊 CURRENT (WRONG) ARCHITECTURE

```
Checkout Session (user buys 2 products):
  - Product A: qty 2, $50/unit = $100
  - Product B: qty 1, $100/unit = $100
  - Subtotal: $200
  - Tax (19%): $38
  - Total: $238

↓ CURRENT BEHAVIOR (WRONG):

Transaction 1:
  - productId: Product A
  - quantity: 2
  - amountInCents: 10000 (only Product A!)
  - currency: EUR
  - taxRatePercent: 19

Transaction 2:
  - productId: Product B
  - quantity: 1
  - amountInCents: 10000 (only Product B!)
  - currency: EUR
  - taxRatePercent: 19

Invoice:
  - References both Transaction 1 AND Transaction 2 (???)
  - Has to somehow consolidate these
  - Confusing and error-prone
```

---

## ✅ TARGET (CORRECT) ARCHITECTURE

```
Checkout Session (user buys 2 products):
  - Product A: qty 2, $50/unit = $100
  - Product B: qty 1, $100/unit = $100
  - Subtotal: $200
  - Tax (19%): $38
  - Total: $238

↓ NEW BEHAVIOR (CORRECT):

Transaction 1:
  - checkoutSessionId: cs_abc123
  - lineItems: [
      {
        productId: Product A,
        productName: "Product A",
        quantity: 2,
        unitPriceInCents: 5000,
        totalPriceInCents: 10000,
        taxRatePercent: 19,
        taxAmountInCents: 1900,
        description: "..."
      },
      {
        productId: Product B,
        productName: "Product B",
        quantity: 1,
        unitPriceInCents: 10000,
        totalPriceInCents: 10000,
        taxRatePercent: 19,
        taxAmountInCents: 1900,
        description: "..."
      }
    ]
  - subtotalInCents: 20000
  - taxAmountInCents: 3800
  - totalInCents: 23800
  - currency: EUR
  - paymentMethod: "stripe"
  - paymentStatus: "paid"

Invoice:
  - transactionId: Transaction 1 (single reference!)
  - OR: checkoutSessionId: cs_abc123
  - Fetches ONE transaction with all line items
  - Clean and simple
```

---

## 🎯 OPTION 1: FIX THE DATA MODEL (CHOSEN APPROACH)

### Why This Is The Right Choice:

1. **Correct Business Logic**: One checkout = one payment = one transaction
2. **Proper Accounting**: Transaction reports are accurate
3. **Invoice Simplicity**: Invoice references one transaction, not multiple
4. **Better Performance**: One DB write instead of N writes per checkout
5. **Future-Proof**: Aligns with standard e-commerce/invoicing patterns

### What Needs To Change:

#### 1. **Transaction Schema** (`convex/schema.ts`)
```typescript
// Current schema has these fields directly on transaction:
productId: v.id("objects"),
productName: v.string(),
quantity: v.number(),
amountInCents: v.number(), // Total for this ONE product

// NEW schema needs:
lineItems: v.array(v.object({
  productId: v.id("objects"),
  productName: v.string(),
  productDescription: v.optional(v.string()),
  quantity: v.number(),
  unitPriceInCents: v.number(),
  totalPriceInCents: v.number(),
  taxRatePercent: v.number(),
  taxAmountInCents: v.number(),
  // For ticket products:
  ticketId: v.optional(v.id("objects")),
  eventId: v.optional(v.id("objects")),
  eventName: v.optional(v.string()),
})),
subtotalInCents: v.number(), // Sum of all line items before tax
taxAmountInCents: v.number(), // Total tax
totalInCents: v.number(), // Grand total
```

#### 2. **Transaction Creation Logic** (`convex/transactionHelpers.ts`)
```typescript
// CURRENT (line 108):
for (const item of params.purchasedItems) {
  // Creates ONE transaction per item
  const transactionId = await ctx.runMutation(
    internal.transactionOntology.createTransactionInternal, { ... }
  );
  transactionIds.push(transactionId);
}
return transactionIds; // Returns ARRAY of IDs

// NEW (should be):
// Build line items array
const lineItems = await Promise.all(
  params.purchasedItems.map(async (item) => {
    const product = await ctx.runQuery(...);
    return {
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPriceInCents: item.pricePerUnit,
      totalPriceInCents: item.totalPrice,
      taxRatePercent: params.taxInfo.taxRatePercent,
      taxAmountInCents: calculateTax(item.totalPrice, params.taxInfo.taxRatePercent),
      ticketId: item.ticketId,
      // ... event details if applicable
    };
  })
);

// Calculate totals
const subtotalInCents = lineItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);
const taxAmountInCents = lineItems.reduce((sum, item) => sum + item.taxAmountInCents, 0);
const totalInCents = subtotalInCents + taxAmountInCents;

// Create ONE transaction
const transactionId = await ctx.runMutation(
  internal.transactionOntology.createTransactionInternal, {
    organizationId: params.organizationId,
    checkoutSessionId: params.checkoutSessionId,
    lineItems, // Array of line items
    subtotalInCents,
    taxAmountInCents,
    totalInCents,
    currency: params.taxInfo.currency,
    paymentMethod: params.paymentInfo.method,
    paymentStatus: params.paymentInfo.status,
    // ... customer/payer info
  }
);

return [transactionId]; // Returns SINGLE ID in array for backwards compat
```

#### 3. **Transaction Ontology Mutation** (`convex/transactionOntology.ts`)
```typescript
// Update createTransactionInternal to accept lineItems array
export const createTransactionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    checkoutSessionId: v.id("objects"),

    // NEW: Array of line items instead of single product
    lineItems: v.array(v.object({
      productId: v.id("objects"),
      productName: v.string(),
      productDescription: v.optional(v.string()),
      quantity: v.number(),
      unitPriceInCents: v.number(),
      totalPriceInCents: v.number(),
      taxRatePercent: v.number(),
      taxAmountInCents: v.number(),
      ticketId: v.optional(v.id("objects")),
      eventId: v.optional(v.id("objects")),
      eventName: v.optional(v.string()),
    })),

    // NEW: Aggregate totals
    subtotalInCents: v.number(),
    taxAmountInCents: v.number(),
    totalInCents: v.number(),

    currency: v.string(),
    paymentMethod: v.string(),
    paymentStatus: v.string(),
    // ... rest of fields
  },
  handler: async (ctx, args) => {
    // Create transaction with lineItems array
    const transactionId = await ctx.db.insert("objects", {
      type: "transaction",
      subtype: "purchase", // Or determine from line items
      organizationId: args.organizationId,
      // ... other fields
      customProperties: {
        checkoutSessionId: args.checkoutSessionId,
        lineItems: args.lineItems,
        subtotalInCents: args.subtotalInCents,
        taxAmountInCents: args.taxAmountInCents,
        totalInCents: args.totalInCents,
        currency: args.currency,
        // ...
      },
    });

    return transactionId;
  }
});
```

#### 4. **Invoice Generation** (`convex/createTransactionsFromCheckout.ts`)
```typescript
// Currently (line 216+):
// Creates invoice with reference to checkout session
// Should now reference the single transaction ID

const invoiceId = await ctx.runMutation(
  internal.invoicingOntology.createInvoice, {
    organizationId: session.organizationId,
    transactionId: transactionIds[0], // NOW just one transaction!
    checkoutSessionId: args.checkoutSessionId,
    // ... rest of invoice data
  }
);
```

#### 5. **Invoice Data Resolver** (`convex/invoiceDataResolver.ts`)
```typescript
// Currently (line 186):
// TODO: Add proper transaction fetching when checkout session query is available
const checkoutSession = null; // Placeholder

// NEW:
// Fetch the single transaction for this invoice
const transactionId = invoiceProps.transactionId as Id<"objects"> | undefined;

if (transactionId) {
  console.log(`🔍 [RESOLVER] Fetching transaction: ${transactionId}`);
  const transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
    transactionId: transactionId,
  });

  if (transaction) {
    // Extract currency from transaction
    const transactionProps = transaction.customProperties as any;
    const currencyFromTransaction = transactionProps.currency;
    console.log(`✅ [RESOLVER] Found transaction with currency: ${currencyFromTransaction}`);

    // Use transaction data directly!
    // lineItems already formatted in transaction
    // totals already calculated in transaction
    // currency already set in transaction
  }
}
```

---

## 📁 FILES THAT NEED CHANGES

### Critical Files:
1. **`convex/schema.ts`** - Update transaction schema to support lineItems
2. **`convex/transactionHelpers.ts`** - Refactor `createTransactionsForPurchase` to create single transaction
3. **`convex/transactionOntology.ts`** - Update `createTransactionInternal` mutation
4. **`convex/createTransactionsFromCheckout.ts`** - Update invoice creation to reference single transaction
5. **`convex/invoiceDataResolver.ts`** - Update to fetch transaction correctly
6. **`convex/invoicingOntology.ts`** - Ensure invoice schema references transaction properly

### Files That May Need Updates:
7. **`convex/ticketOntology.ts`** - If tickets still need transaction links
8. **Transaction queries** - Any queries that fetch/filter transactions
9. **Analytics/reporting** - Anything that counts transactions

---

## 🔄 MIGRATION STRATEGY

### Handling Existing Data:

**Option A: Clean Break (Recommended for Development)**
- Add new schema fields
- Old transactions stay as-is
- New transactions use new format
- Old invoices reference old transactions
- New invoices reference new transactions

**Option B: Data Migration (Production)**
- Write migration script to consolidate old transactions
- Group by `checkoutSessionId`
- Merge into single transaction with lineItems
- Update invoice references

---

## 🧪 TESTING CHECKLIST

After implementing changes:

1. **Create checkout with 1 product**
   - ✅ Creates 1 transaction with 1 line item
   - ✅ Invoice references that transaction
   - ✅ Email shows correct totals

2. **Create checkout with 3 products**
   - ✅ Creates 1 transaction with 3 line items
   - ✅ Invoice references that transaction
   - ✅ Email shows all 3 products with correct totals

3. **B2B vs B2C**
   - ✅ Both create single transaction
   - ✅ Payer info correct in transaction
   - ✅ Invoice format correct for each type

4. **Different currencies**
   - ✅ Transaction stores correct currency
   - ✅ Invoice resolver uses transaction currency
   - ✅ Email formats currency correctly

5. **Ticket purchases**
   - ✅ Line items include ticketId references
   - ✅ Tickets still link to transaction
   - ✅ Event info included in line items

---

## 📝 IMPLEMENTATION ORDER

1. **Update Schema** (`convex/schema.ts`)
   - Add `lineItems`, `subtotalInCents`, `taxAmountInCents`, `totalInCents` to transaction
   - Keep old fields for backwards compatibility (mark as optional)

2. **Update Transaction Creation** (`convex/transactionHelpers.ts`)
   - Refactor `createTransactionsForPurchase` to build lineItems array
   - Calculate aggregate totals
   - Create single transaction

3. **Update Transaction Mutation** (`convex/transactionOntology.ts`)
   - Update `createTransactionInternal` args to accept new structure
   - Handle both old and new formats during migration

4. **Update Invoice Creation** (`convex/createTransactionsFromCheckout.ts`)
   - Update invoice creation to expect single transaction ID
   - Remove any logic that consolidates multiple transactions

5. **Update Invoice Data Resolver** (`convex/invoiceDataResolver.ts`)
   - Add transaction fetching using transactionId from invoice
   - Extract currency, lineItems, totals from transaction

6. **Run Tests**
   - Test complete flow: checkout → transaction → invoice → email
   - Verify all currencies work
   - Verify all languages work

7. **Update Queries** (if needed)
   - Any transaction queries that filter/count
   - Analytics that aggregate transaction data

---

## 🚀 NEXT STEPS TO RESUME

When ready to implement:

1. Read current transaction schema from `convex/schema.ts`
2. Read `createTransactionsForPurchase` implementation details
3. Read `createTransactionInternal` mutation signature
4. Start with schema update (safest first step)
5. Then update transaction creation logic
6. Test thoroughly at each step

---

## 💡 KEY INSIGHTS

- **Root cause:** The for-loop in `transactionHelpers.ts:108` creates one transaction per product
- **Business logic:** One checkout session = one payment = one transaction with line items
- **Invoice simplification:** Invoice should reference ONE transaction, not multiple
- **Currency resolution:** Transaction has definitive currency, invoice inherits it
- **Future-proof:** This aligns with standard invoicing/accounting practices

---

## 📚 RELATED FILES TO REVIEW

- `convex/schema.ts` - Transaction schema definition
- `convex/transactionHelpers.ts:108` - The problematic for-loop
- `convex/transactionOntology.ts` - Transaction creation mutation
- `convex/createTransactionsFromCheckout.ts:180` - Call to createTransactionsForPurchase
- `convex/invoiceDataResolver.ts:186` - Where transaction should be fetched
- `convex/invoicingOntology.ts` - Invoice creation and schema

---

## 📝 IMPLEMENTATION PROGRESS

### ✅ Phase 1: Schema Documentation (COMPLETED)
- Updated `convex/schemas/ontologySchemas.ts` with comprehensive transaction structure documentation
- Documented NEW structure (v2 - Multi-line Item Transactions) with lineItems array
- Documented LEGACY structure (v1 - Single Product Per Transaction) for backward compatibility
- TypeScript checks pass ✓

### ✅ Phase 2: Transaction Creation Logic (COMPLETED)
- Refactored `convex/transactionHelpers.ts:createTransactionsForPurchase()` to create SINGLE transaction with lineItems array
- Updated `convex/transactionOntology.ts:createTransactionInternal()` mutation to support both NEW (lineItems) and LEGACY (single product) structures
- Added intelligent detection to handle both formats for backward compatibility
- TypeScript checks pass ✓

### ✅ Phase 3: Invoice Integration (COMPLETED)
- Updated `convex/invoicingOntology.ts:createSimpleInvoiceFromCheckout()` to use single transaction
- Added logic to extract lineItems from transaction's lineItems array OR legacy single-product structure
- Invoice now uses currency and totals directly from transaction (source of truth!)
- Updated invoice-transaction linking to patch single transaction instead of looping
- Updated `convex/invoiceDataResolver.ts` to fetch transaction from invoice's lineItems
- Removed TODO placeholder and implemented proper transaction fetching
- TypeScript checks pass ✓

### 🧪 Phase 4: Testing (PENDING)
- Test checkout with 1 product → verify 1 transaction created
- Test checkout with 3 products → verify 1 transaction with 3 lineItems
- Test invoice generation → verify correct currency and totals
- Test email sending → verify all products displayed correctly

---

**Status:** Phases 1-3 COMPLETED! All TypeScript checks pass. Ready for testing.

## 🎯 WHAT CHANGED

### Before (WRONG):
```typescript
// Created 3 transactions for a 3-product checkout
for (const item of purchasedItems) {
  transactionId = await createTransactionInternal({
    productId: item.productId,
    quantity: item.quantity,
    amountInCents: item.totalPrice, // Just this product
  });
}
// Invoice couldn't properly reference "the transaction"
```

### After (CORRECT):
```typescript
// Creates 1 transaction with 3 line items
const lineItems = purchasedItems.map(item => ({
  productId: item.productId,
  quantity: item.quantity,
  unitPriceInCents: item.pricePerUnit,
  totalPriceInCents: item.totalPrice,
  taxRatePercent: 19,
  taxAmountInCents: calculateTax(item.totalPrice),
}));

const transactionId = await createTransactionInternal({
  lineItems,
  subtotalInCents,  // Sum of all items
  taxAmountInCents, // Sum of all taxes
  totalInCents,     // Grand total
  currency: "EUR",
});

// Invoice references ONE transaction with all data
```
