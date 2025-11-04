# Behavior System Integration Guide

This guide explains how to integrate the behavior system into your application components.

## Overview

The behavior system allows you to attach **dynamic actions** to any workflow without hardcoding logic. Perfect for:

- **Dynamic checkout rules** (employer billing, invoice enforcement)
- **Form-driven automation** (map form responses to CRM records)
- **Conditional UI logic** (show/hide steps based on data)
- **Cross-object coordination** (link products → organizations → billing)

## Quick Start: Checkout Integration

### Step 1: Import the Integration Utilities

```typescript
import {
  useCheckoutBehaviors,
  executeCheckoutBehaviors,
  getEmployerBillingFromResults,
  getInvoiceMappingFromResults,
} from "@/lib/behaviors/adapters/checkout-integration";
```

### Step 2: Prepare Your Checkout Context

```typescript
const checkoutContext = {
  organizationId: "org_123",
  sessionId: "session_abc",
  selectedProducts: [
    {
      productId: "prod_001",
      quantity: 2,
      price: 10000, // cents
    },
  ],
  linkedProducts: products, // Full product objects with customProperties
  formResponses: [
    {
      productId: "prod_001",
      ticketNumber: 1,
      formId: "form_reg",
      responses: { employer: "Acme Corp" },
      addedCosts: 500,
      submittedAt: Date.now(),
    },
  ],
  customerInfo: {
    email: "john@example.com",
    name: "John Doe",
  },
};
```

### Step 3: Execute Behaviors

```typescript
const result = await executeCheckoutBehaviors(checkoutContext);

if (result.success) {
  // Check for employer billing
  const employerOrgId = getEmployerBillingFromResults(result);

  // Check for invoice mapping
  const invoiceInfo = getInvoiceMappingFromResults(result);

  if (invoiceInfo.shouldInvoice) {
    console.log("Employer billing detected:", invoiceInfo.employerOrgId);
    console.log("Payment terms:", invoiceInfo.paymentTerms); // net30, net60, net90
  }
}
```

### Step 4: React Hook Usage

```typescript
function CheckoutComponent() {
  const [checkoutData, setCheckoutData] = useState(null);

  const { behaviors, context, execute } = useCheckoutBehaviors(checkoutData);

  // Execute behaviors when needed
  const handleSubmit = async () => {
    const result = await execute();

    if (result.success) {
      // Use behavior results to modify checkout flow
      const employerOrgId = getEmployerBillingFromResults(result);
      // ...continue with modified flow
    }
  };

  return (
    <div>
      <p>Active behaviors: {behaviors.length}</p>
      <button onClick={handleSubmit}>Complete Checkout</button>
    </div>
  );
}
```

## Behavior Results Structure

```typescript
interface BehaviorExecutionResult {
  success: boolean;                    // Overall success
  results: Array<{                     // Individual behavior results
    type: string;                      // Behavior type (e.g., "invoice-mapping")
    result: {
      success: boolean;
      data?: any;                      // Behavior-specific data
      errors?: string[];
      warnings?: string[];
      actions?: BehaviorAction[];
    };
  }>;
  finalContext: BehaviorContext;       // Modified context
  errors: string[];                    // All errors
  warnings?: string[];                 // All warnings
  actions?: BehaviorAction[];          // Aggregated actions
}
```

## Available Behaviors

### 1. Invoice Mapping (`invoice-mapping`)

Maps form responses to CRM organizations and determines payment terms.

**Configuration:**
```typescript
{
  type: "invoice-mapping",
  config: {
    sourceField: "employer",           // Form field with employer name
    mapping: {
      "Acme Corp": "org_123",         // employer → CRM org ID
      "Tech Inc": "org_456",
    },
    defaultPaymentTerms: "net30",     // net30 | net60 | net90
    paymentTermsByOrg: {              // Override per organization
      "org_123": "net60",
    },
  },
  priority: 100,                       // Higher = runs first
  enabled: true,
}
```

**Returns:**
```typescript
{
  crmOrganizationId: "org_123",
  paymentTerms: "net60",
  employerName: "Acme Corp",
}
```

### 2. Employer Detection (`employer-detection`)

Detects employer from form responses and validates against CRM.

**Configuration:**
```typescript
{
  type: "employer-detection",
  config: {
    employerField: "employer",
    requireCrmMatch: true,            // Fail if no CRM match
    autoCreateOrg: false,             // Create CRM org if missing
  },
  priority: 90,
}
```

**Returns:**
```typescript
{
  crmOrganizationId: "org_123",
  employerName: "Acme Corp",
  matchSource: "exact" | "fuzzy" | "none",
}
```

## Creating Custom Behaviors

### Step 1: Define Your Behavior Handler

```typescript
// src/lib/behaviors/handlers/my-behavior.ts
import {
  BehaviorHandler,
  BehaviorContext,
  BehaviorResult,
  InputSource,
  ValidationError,
} from "../types";

interface MyBehaviorConfig {
  someField: string;
  someOption: boolean;
}

interface MyBehaviorData {
  extractedValue: string;
}

interface MyBehaviorResult {
  computedValue: number;
}

export const myBehaviorHandler: BehaviorHandler<
  MyBehaviorConfig,
  MyBehaviorData,
  MyBehaviorResult
> = {
  type: "my-behavior",
  name: "My Custom Behavior",
  description: "Does something cool",
  category: "automation",
  supportedInputTypes: ["form"],
  supportedWorkflows: ["checkout"],

  extract(config, inputs, context) {
    // Extract relevant data from inputs
    const formInput = inputs.find(i => i.type === "form");
    if (!formInput) return null;

    const value = formInput.data[config.someField];
    if (!value || typeof value !== "string") return null;

    return { extractedValue: value };
  },

  apply(config, extracted, context) {
    // Perform your logic
    const computed = extracted.extractedValue.length * 100;

    return {
      success: true,
      data: { computedValue: computed },
      actions: [
        {
          type: "log",
          payload: { message: `Computed: ${computed}` },
          priority: 1,
          when: "immediate",
        },
      ],
    };
  },

  validate(config, context) {
    const errors: ValidationError[] = [];

    if (!config.someField) {
      errors.push({
        field: "someField",
        message: "someField is required",
        severity: "error",
      });
    }

    return errors;
  },
};
```

### Step 2: Register Your Behavior

```typescript
// src/lib/behaviors/index.ts
import { myBehaviorHandler } from "./handlers/my-behavior";

behaviorRegistry.register(myBehaviorHandler);
```

### Step 3: Use in Product Configuration

```typescript
const product = {
  name: "My Product",
  customProperties: {
    behaviors: [
      {
        type: "my-behavior",
        config: {
          someField: "customerName",
          someOption: true,
        },
        priority: 50,
        enabled: true,
      },
    ],
  },
};
```

## Advanced Topics

### Behavior Priority

Behaviors execute in priority order (highest first). Use priorities to control execution flow:

- **100+**: Critical pre-processing (employer detection, validation)
- **50-99**: Main logic (invoice mapping, calculations)
- **1-49**: Post-processing (notifications, logging)
- **0 or unset**: Default priority (executed last)

### Context Mutation

Behaviors can modify the context for downstream behaviors:

```typescript
apply(config, extracted, context) {
  return {
    success: true,
    data: { result: "computed" },
    modifiedContext: {
      behaviorData: {
        ...context.behaviorData,
        myBehavior: { result: "computed" },
      },
      workflowData: {
        ...context.workflowData,
        customField: "new value",
      },
    },
  };
}
```

### Actions

Behaviors can emit actions for external systems:

```typescript
{
  type: "send_email",
  payload: {
    to: "admin@example.com",
    subject: "Invoice created",
    body: "An invoice was created for Acme Corp",
  },
  priority: 1,
  when: "deferred", // or "immediate" or "scheduled"
  scheduledFor: Date.now() + 3600000, // 1 hour from now
}
```

### Error Handling

```typescript
const result = await executeCheckoutBehaviors(context);

if (!result.success) {
  console.error("Behavior errors:", result.errors);

  // Check which behaviors failed
  result.results.forEach(r => {
    if (!r.result.success) {
      console.error(`${r.type} failed:`, r.result.errors);
    }
  });
}

// Process warnings (non-fatal)
if (result.warnings && result.warnings.length > 0) {
  console.warn("Warnings:", result.warnings);
}
```

## Testing Behaviors

```typescript
import { executeBehaviors } from "@/lib/behaviors/engine";
import { myBehaviorHandler } from "@/lib/behaviors/handlers/my-behavior";

describe("My Behavior", () => {
  it("should extract and process data", () => {
    const context = {
      organizationId: "org_test",
      workflow: "checkout",
      objects: [],
      inputs: [
        {
          type: "form",
          inputId: "form_1",
          data: { customerName: "John Doe" },
          metadata: { timestamp: Date.now() },
        },
      ],
    };

    const behaviors = [
      {
        type: "my-behavior",
        config: {
          someField: "customerName",
          someOption: true,
        },
        priority: 100,
        enabled: true,
      },
    ];

    const result = await executeBehaviors(behaviors, context);

    expect(result.success).toBe(true);
    expect(result.results[0].result.data).toEqual({
      computedValue: 800, // "John Doe".length * 100
    });
  });
});
```

## Best Practices

1. **Keep behaviors focused** - Each behavior should do one thing well
2. **Validate configuration** - Always implement thorough validation
3. **Handle missing data gracefully** - Return `null` from `extract()` if data is missing
4. **Use meaningful priorities** - Higher priority for critical pre-processing
5. **Document configuration schema** - Make it clear what configuration is needed
6. **Test edge cases** - Missing data, invalid formats, concurrent execution
7. **Avoid side effects in `extract()`** - Only read data, don't modify anything
8. **Use TypeScript generics** - Type-safe configuration and results

## Troubleshooting

### Behavior not executing

1. Check `enabled` flag in behavior configuration
2. Verify behavior is registered in `behaviorRegistry`
3. Check trigger conditions (`inputTypes`, `objectTypes`, `workflows`)
4. Ensure `extract()` is returning non-null data

### Wrong execution order

1. Check behavior priorities (higher = first)
2. Multiple behaviors with same priority execute in registration order
3. Use console logging to debug: `console.log("Executing:", behavior.type)`

### Context not updating

1. Return `modifiedContext` from `apply()`
2. Merge with existing context, don't replace
3. Remember: only affects downstream behaviors in same execution

### Performance issues

1. Move expensive operations to `apply()`, not `extract()`
2. Use caching for repeated lookups
3. Consider async operations for external API calls
4. Profile with `console.time()` if needed

## Next Steps

- Read [STRUCTURE.md](./STRUCTURE.md) for file organization
- See [README.md](./README.md) for user-facing documentation
- Check [handlers/](./handlers/) for example implementations
- Review [adapters/](./adapters/) for domain-specific integrations
