# Phase 2: Strong Type Definitions (Safety)

**Goal**: Replace `v.any()` chaos with strictly typed interfaces in your application code, even if the DB schema remains loose.

## 1. Defining the "Shapes"
Since the database stores everything as `objects`, we need Zod schemas or TypeScript interfaces in our application layer to enforce structure.

**File**: `convex/schema/shapes.ts` (Application-level schemas, not DB-level)

```typescript
import { z } from "zod";

export const TransactionShape = z.object({
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "paid", "failed"]),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number()
  }))
});

export type Transaction = z.infer<typeof TransactionShape>;
```

## 2. Validation Helpers
Create helpers to safely "parse" a generic `OntologyObject` into a typed entity.

```typescript
// convex/lib/ontologyHelpers.ts
export function parseTransaction(doc: OntologyObject): Transaction | null {
  if (doc.type !== "transaction") return null;
  const result = TransactionShape.safeParse(doc.customProperties);
  return result.success ? result.data : null;
}
```

## 3. Update Consumers
Update strict consumers (like Stripe webhooks or PDF generators) to use these parsers.

```typescript
// convex/stripe/platformWebhooks.ts
const transaction = await ctx.runQuery(...);
const safeTransaction = parseTransaction(transaction);

if (!safeTransaction) {
  throw new Error("Invalid transaction structure");
}
// Now safeTransaction is fully typed and safe to use
```

## Implementation Steps
1.  [ ] Audit `objects` table subtypes (Audit existing data to see what `customProperties` actually exist).
2.  [ ] Create `convex/schema/shapes.ts` with Zod definitions for:
    -   `Transaction`
    -   `Ticket`
    -   `Event`
    -   `Contact`
3.  [ ] Create validation helpers in `convex/lib/ontologyHelpers.ts`.
4.  [ ] Replace loose `as any` casts in `platformWebhooks.ts` with explicit `parseTransaction` calls.
