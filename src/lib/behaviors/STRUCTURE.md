# Universal Behavior System - File Structure

## Overview

The behavior system is organized into **4 main categories** to prevent confusion and maintain clear separation of concerns:

```
src/lib/behaviors/
├── 📋 Core System Files (root level)
├── 🎯 handlers/ (individual behavior implementations)
├── 🔌 adapters/ (domain-specific helpers)
└── 🧪 __tests__/ (system-level tests)
```

## Directory Structure

```
src/lib/behaviors/
│
├── README.md                      # System documentation
├── STRUCTURE.md                   # This file
├── types.ts                       # Universal type definitions
├── index.ts                       # Behavior registry + core API
│
├── handlers/                      # Individual behavior implementations
│   ├── invoice-mapping.ts         # Invoice/CRM organization mapping
│   ├── employer-detection.ts      # Employer billing detection
│   └── __tests__/                 # Handler-specific tests
│       └── invoice-mapping.test.ts
│
├── adapters/                      # Domain-specific integration helpers
│   └── checkout-adapter.ts        # Checkout workflow integration
│
└── __tests__/                     # System-level tests
    └── registry.test.ts           # Registry functionality tests
```

## File Categories Explained

### 📋 Core System Files (Root Level)

**What goes here:**
- `types.ts` - Universal type definitions used across all behaviors
- `index.ts` - Behavior registry, core API, auto-registration
- `README.md` - User-facing documentation
- `STRUCTURE.md` - This file

**Why at root:**
These are the foundational pieces that everything else depends on. They should be easily accessible and clearly separated from implementations.

### 🎯 handlers/ - Individual Behavior Implementations

**What goes here:**
- Individual behavior handler files (e.g., `invoice-mapping.ts`, `employer-detection.ts`)
- Each file exports a `BehaviorHandler` implementation
- Handler-specific tests in `__tests__/`

**Naming convention:**
- Use kebab-case: `employer-detection.ts`, `invoice-mapping.ts`
- Be descriptive: the filename should clearly indicate what the behavior does
- Export handler as `{name}Handler`: `employerDetectionHandler`, `invoiceMappingHandler`

**Example handler structure:**
```typescript
// handlers/employer-detection.ts
export interface EmployerDetectionConfig { ... }
export interface EmployerDetectionResult { ... }

export const employerDetectionHandler: BehaviorHandler<
  EmployerDetectionConfig,
  ExtractedData,
  EmployerDetectionResult
> = {
  type: "employer_detection",
  name: "Employer Detection",
  extract: (...) => { ... },
  validate: (...) => { ... },
  apply: (...) => { ... },
};
```

### 🔌 adapters/ - Domain-Specific Integration Helpers

**What goes here:**
- Helper functions that make it easier to use behaviors in specific contexts
- Convenience wrappers that combine multiple behaviors
- Domain-specific transformations (e.g., checkout data → behavior inputs)

**Current adapters:**
- `checkout-adapter.ts` - Helpers for using behaviors in checkout flows
  - `executeCheckoutBehaviors()` - Execute all product behaviors
  - `detectEmployerBilling()` - Convenience wrapper for employer detection
  - `evaluatePaymentRulesWithBehaviors()` - Payment rules using behaviors

**Future adapters:**
- `crm-adapter.ts` - CRM workflow helpers
- `api-adapter.ts` - REST API integration helpers
- `webhook-adapter.ts` - Webhook event processing
- `agent-adapter.ts` - AI agent tool helpers

**Naming convention:**
- Use kebab-case: `checkout-adapter.ts`, `crm-adapter.ts`
- Include `-adapter` suffix to clearly identify purpose
- Export named functions (not classes)

### 🧪 __tests__/ - Test Files

**What goes here:**
- System-level tests: `__tests__/registry.test.ts`
- Handler-specific tests: `handlers/__tests__/invoice-mapping.test.ts`

**Test organization:**
- Tests live next to the code they test
- System tests at root level `__tests__/`
- Handler tests in `handlers/__tests__/`

## Import Path Examples

**From a handler to core:**
```typescript
// handlers/employer-detection.ts
import type { BehaviorHandler, BehaviorContext } from "../types";
```

**From an adapter to handlers:**
```typescript
// adapters/checkout-adapter.ts
import { behaviorRegistry } from "..";
import type { EmployerBillingInfo } from "../handlers/employer-detection";
```

**From application code:**
```typescript
// src/components/checkout/multi-step-checkout.tsx
import { detectEmployerBilling } from "@/lib/behaviors/adapters/checkout-adapter";
import { behaviorRegistry } from "@/lib/behaviors";
```

## Adding New Files

### Adding a New Behavior Handler

1. Create file in `handlers/`: `handlers/notification-sender.ts`
2. Implement `BehaviorHandler` interface
3. Register in `index.ts`:
   ```typescript
   import { notificationSenderHandler } from "./handlers/notification-sender";
   behaviorRegistry.register(notificationSenderHandler);
   ```

### Adding a New Adapter

1. Create file in `adapters/`: `adapters/crm-adapter.ts`
2. Import from core: `import { behaviorRegistry } from "..";`
3. Import handlers: `import { invoiceMappingHandler } from "../handlers/invoice-mapping";`
4. Export helper functions

### Adding Tests

1. Handler tests: `handlers/__tests__/your-handler.test.ts`
2. System tests: `__tests__/your-feature.test.ts`
3. Adapter tests: `adapters/__tests__/your-adapter.test.ts` (if needed)

## Common Mistakes to Avoid

❌ **DON'T** put behavior implementations in the root folder
- ✅ **DO** put them in `handlers/`

❌ **DON'T** put adapters in `handlers/`
- ✅ **DO** put them in `adapters/`

❌ **DON'T** create nested folders inside `handlers/`
- ✅ **DO** keep all handlers at the same level in `handlers/`

❌ **DON'T** mix concerns (handler + adapter in same file)
- ✅ **DO** separate into appropriate folders

## Benefits of This Structure

1. **Clear Separation**: Handlers vs adapters vs core system
2. **Easy Navigation**: Know exactly where to find/add code
3. **Scalability**: Can add 100s of handlers without chaos
4. **Discoverability**: New developers immediately understand organization
5. **Testability**: Tests live next to code they test

## Questions?

- "Where do I put a new behavior?" → `handlers/`
- "Where do I put checkout helpers?" → `adapters/checkout-adapter.ts`
- "Where do I import types from?" → `../types` (from handlers/adapters)
- "Where do I register behaviors?" → `index.ts`
