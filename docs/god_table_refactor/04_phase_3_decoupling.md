# Phase 3: Decoupling (The Long-Term Fix)

**Goal**: Move away from the "God Table" (`objects`) for high-volume or complex entities. Break the dependency cycle.

## Concept
The "God Table" is great for CMS-like flexibility (Defining new content types on the fly). It is **terrible** for core business logic (Transactions, Users, Subscriptions) that requires strict schemas and high-performance querying.

## Strategy: Hybrid Architecture
Keep `objects` for loose, CMS-like data. Move core business entities to their own dedicated tables.

## 1. Proposed Schema Migration
**New Tables**:
```typescript
// convex/schema.ts
export default defineSchema({
  // CORE BUSINESS ENTITIES (Strictly Typed)
  transactions: defineTable({
    amount: v.number(),
    currency: v.string(),
    metadata: v.optional(v.any()), // Smaller scope for 'any'
    // ...
  }),
  
  tickets: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    // ...
  }),

  // CMS ENTITIES (Loose)
  objects: defineTable({
    // ... existing God Table definition
  })
});
```

## 2. Migration Path
You cannot change this overnight. Use a "Double Write" strategy.

1.  **Define New Tables**: Add `transactions`, `events`, `tickets` to schema.
2.  **Double Write**: Update `createTransactionsForPurchase` to write to BOTH `objects` (legacy) and `transactions` (new).
3.  **Backfill**: Write a migration script to copy data from `objects` (where `type === 'transaction'`) to `transactions` table.
4.  **Read Switch**: Update queries to read from `transactions` table.
5.  **Deprecate**: Stop writing to `objects` for transactions.

## Implementation Steps
1.  [ ] **RFC**: Draft specific schema definitions for `transactions` and `tickets`.
2.  [ ] **Schema Update**: Add new tables to `convex/schema.ts`.
3.  [ ] **Mutation Update**: Update `convex/transactionHelpers.ts` to double-write.
4.  [ ] **Migration**: Create `convex/migrations/backfillTransactions.ts`.
5.  [ ] **Query Update**: Switch `convex/stripe` webhooks to use new tables.
