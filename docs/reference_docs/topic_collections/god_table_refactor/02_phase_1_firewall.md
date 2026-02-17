# Phase 1: The "Type Firewall" (Immediate Fix)

**Goal**: Eliminate `TS2589` errors and `@ts-ignore` usage without changing the database schema.
**Mechanism**: Explicit Return Types for Actions/Queries.

## 1. Create Shared Types
Create a file to define manual interfaces for your "God Objects".

**File**: `convex/types/ontology.ts`
```typescript
import { Id } from "../_generated/dataModel";

// Simplified generic interface for basic interaction
export interface OntologyObject {
  _id: Id<"objects">;
  _creationTime: number;
  type: string;
  subtype?: string;
  name: string;
  customProperties?: Record<string, any>;
}

// Explicit interfaces for specific subtypes we use heavily
export interface TransactionObject extends OntologyObject {
  type: "transaction";
  customProperties: {
    amount: number;
    currency: string;
    status: string;
    [key: string]: any;
  };
}
```

## 2. Refactor "Bottleneck" Functions
Identify functions causing `TS2589` (like `verifySession` in `apiKeys.ts` or `createTransactions` in `transactionHelpers.ts`) and apply explicit return types.

**Example Refactor: `convex/transactionHelpers.ts`**

*Current (Problematic - Inferred Return)*
```typescript
export async function createTransactionsForPurchase(/*...*/) {
  // TypeScript tries to infer the return type based on the complex internal logic
  // logic involves v.any() customProperties -> Infinite Recursion
  return [transactionId];
}
```

*Refactored (Firewalled)*
```typescript
import { Id } from "./_generated/dataModel";

// EXPICIT RETURN TYPE STOPS RECURSION
export async function createTransactionsForPurchase(
   /* ... */
): Promise<Id<"objects">[]> { 
  // ... implementation ...
  return [transactionId];
}
```

## 3. Cast at the Boundary
Inside the function, when interacting with the "God Table", cast the result immediately to your manual type to stop the inference chain.

```typescript
const sessionDoc = await ctx.runQuery(...) as unknown as OntologyObject;
// Now TypeScript treats 'sessionDoc' as a simple interface, not a complex Schema type
```

## Implementation Steps
1.  [ ] Create `convex/types/ontology.ts`.
2.  [ ] Refactor `convex/actions/apiKeys.ts`: Add `: Promise<VerifySessionResult>` to `verifySession`.
3.  [ ] Refactor `src/hooks/use-namespace-translations.ts`: Define a `TranslationMap` interface and cast the query result.
4.  [ ] Refactor `convex/transactionHelpers.ts`: Identify all exported functions and add explicit return types.
