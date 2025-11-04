# Universal Behavior System

A powerful, input-agnostic behavior framework that works with ANY data source: forms, APIs, AI agents, webhooks, cron jobs, database events, and more.

## 🎯 What Are Behaviors?

**Behaviors are tools/actions that can be triggered by any input and operate on any data.**

Think of them as:
- 🤖 **AI Agent Tools** - Functions Claude can call
- 🔄 **Workflow Actions** - Steps in automation pipelines
- 📝 **Form Processors** - Logic triggered by form submissions
- 🔗 **API Handlers** - Actions triggered by external systems
- ⏰ **Scheduled Tasks** - Time-based automation
- 🪝 **Webhook Processors** - External event handlers

## 🚀 Quick Start

### 1. Use an Existing Behavior

```typescript
import { behaviorRegistry, executeBehaviorsFromObject } from "@/lib/behaviors";
import type { Behavior, BehaviorContext } from "@/lib/behaviors/types";

// Define behavior configuration
const behavior: Behavior = {
  type: "invoice_mapping",
  config: {
    organizationSourceField: "employer",
    organizationMapping: {
      "Acme Corp": "org_abc123",
      "Tech Inc": "org_xyz789",
    },
    defaultPaymentTerms: "net30",
  },
};

// Create context with inputs
const context: BehaviorContext = {
  organizationId: currentOrgId,
  workflow: "checkout",
  objects: [{ objectId: productId, objectType: "product", quantity: 1 }],
  inputs: [
    {
      type: "form",
      data: {
        employer: "Acme Corp",
        email: "user@acme.com",
      },
      metadata: { timestamp: Date.now() },
    },
  ],
};

// Execute behavior
const result = await behaviorRegistry.execute(behavior, context);

if (result.success) {
  console.log("Invoice mapping:", result.data);
  console.log("Actions to execute:", result.actions);

  // Execute actions (system responsibility)
  for (const action of result.actions || []) {
    await executeAction(action);
  }
}
```

### 2. Attach Behaviors to Objects

```typescript
// Store behaviors in object customProperties
const product = {
  _id: productId,
  type: "product",
  name: "Event Ticket",
  customProperties: {
    behaviors: [
      {
        type: "invoice_mapping",
        config: {
          organizationSourceField: "employer",
          organizationMapping: { /* ... */ },
        },
      },
    ],
  },
};

// Execute all behaviors for an object
const result = await executeBehaviorsFromObject(product, context);
```

### 3. Create a Custom Behavior

```typescript
import type { BehaviorHandler } from "@/lib/behaviors/types";

export const myBehaviorHandler: BehaviorHandler = {
  type: "my_behavior",
  name: "My Custom Behavior",
  description: "Does something useful",
  category: "action",

  extract: (config, inputs, context) => {
    // Extract relevant data from inputs
    const input = inputs.find(i => i.type === "form");
    if (!input) return null;

    return {
      value: input.data.myField,
    };
  },

  apply: (config, extracted, context) => {
    // Apply behavior logic and return actions
    return {
      success: true,
      data: { processed: extracted.value },
      actions: [
        {
          type: "send_email",
          payload: { to: "admin@example.com", subject: "..." },
          when: "immediate",
        },
      ],
    };
  },

  validate: (config) => {
    // Validate configuration
    const errors = [];
    if (!config.requiredField) {
      errors.push({
        field: "requiredField",
        code: "required",
        message: "requiredField is required",
      });
    }
    return errors;
  },
};

// Register your behavior
import { behaviorRegistry } from "@/lib/behaviors";
behaviorRegistry.register(myBehaviorHandler);
```

## 📚 Available Behaviors

### invoice_mapping

Maps input data to CRM organizations and creates invoices.

**Config:**
```typescript
{
  organizationSourceField: string;
  organizationMapping: Record<string, string | null>;
  defaultPaymentTerms?: "net30" | "net60" | "net90";
  requireMapping?: boolean;
  invoiceFieldMapping?: Record<string, string>;
}
```

**Example:**
```typescript
{
  type: "invoice_mapping",
  config: {
    organizationSourceField: "employer",
    organizationMapping: {
      "Acme Corp": "org_abc",
      "null": "individual_org", // For users without employer
    },
    defaultPaymentTerms: "net30",
  },
}
```

**Input Types:** form, api, agent_decision, webhook, manual, user_action

**Workflows:** checkout, crm, events

## 🔄 Input Types

Behaviors work with these input types:

- **form** - Form submissions
- **api** - API requests
- **agent_decision** - AI agent decisions
- **webhook** - External webhooks
- **time** - Scheduled/cron triggers
- **database** - Database change events
- **user_action** - Manual user actions
- **event** - System events
- **manual** - Manual triggers

## 🎭 Behavior Lifecycle

1. **Extract** - Get relevant data from inputs
2. **Validate** - Check configuration is valid
3. **Apply** - Execute logic and return actions
4. **Actions** - System executes returned actions

```
Input → Extract → Validate → Apply → Actions → Results
```

## 🧠 Key Concepts

### Actions vs Execution

**Behaviors DON'T execute side effects directly.** Instead, they return **actions** for the system to execute:

```typescript
// ❌ WRONG: Behavior executes directly
apply: async (config, extracted) => {
  await sendEmail(config.email); // NO!
  await createInvoice(data); // NO!
};

// ✅ CORRECT: Behavior returns actions
apply: (config, extracted) => {
  return {
    success: true,
    actions: [
      { type: "send_email", payload: {...}, when: "immediate" },
      { type: "create_invoice", payload: {...}, when: "deferred" },
    ],
  };
};
```

### Context Propagation

Behaviors can modify context for subsequent behaviors:

```typescript
apply: (config, extracted) => {
  return {
    success: true,
    data: { result: "..." },
    modifiedContext: {
      workflowData: {
        ...context.workflowData,
        billingOrg: extracted.orgId,
      },
    },
  };
};
```

### Action Timing

Actions can be executed at different times:

- **immediate** - Execute right away
- **deferred** - Execute after all behaviors complete
- **scheduled** - Execute at specific time

## 🔧 Advanced Usage

### Multiple Behaviors

Execute multiple behaviors in sequence:

```typescript
const behaviors = [
  { type: "validate_input", config: {...} },
  { type: "invoice_mapping", config: {...} },
  { type: "send_notification", config: {...} },
];

const result = await behaviorRegistry.executeMany(behaviors, context);
```

### Action Batching

Group actions by timing for optimized execution:

```typescript
const { result, batches } = await behaviorRegistry.executeManyWithBatching(
  behaviors,
  context
);

// Execute immediate actions
for (const action of batches.immediate) {
  await executeAction(action);
}

// Queue deferred actions
queueActions(batches.deferred);

// Schedule future actions
scheduleActions(batches.scheduled);
```

### Conditional Execution

Behaviors can skip based on context:

```typescript
extract: (config, inputs, context) => {
  // Skip if condition not met
  if (!shouldRun(context)) return null;

  return extractedData;
};
```

## 🧪 Testing

```typescript
import { BehaviorRegistry } from "@/lib/behaviors";
import { myBehaviorHandler } from "./my-behavior";

describe("My Behavior", () => {
  let registry: BehaviorRegistry;

  beforeEach(() => {
    registry = new BehaviorRegistry();
    registry.register(myBehaviorHandler);
  });

  it("should process input correctly", async () => {
    const behavior = {
      type: "my_behavior",
      config: { /* ... */ },
    };

    const context = {
      organizationId: "test" as any,
      workflow: "test",
      objects: [],
      inputs: [
        {
          type: "form",
          data: { field: "value" },
          metadata: { timestamp: Date.now() },
        },
      ],
    };

    const result = await registry.execute(behavior, context);

    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(1);
  });
});
```

## 📖 Best Practices

1. **Keep behaviors pure** - No side effects, return actions instead
2. **Validate thoroughly** - Check all config before execution
3. **Handle missing data** - Return null from extract when data unavailable
4. **Use types** - Leverage TypeScript for safety
5. **Document configs** - Clear examples in behavior file
6. **Test extensively** - Unit test all paths
7. **Think universal** - Design for ANY input type, not just forms

## 🤝 Contributing

See [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for guidelines on:
- Creating new behaviors
- Extending existing behaviors
- Testing requirements
- Documentation standards

## 📚 Additional Resources

- [Architecture Plan](../../../.kiro/rules_and_workflows/000_plan.md)
- [Todo List](../../../.kiro/rules_and_workflows/001_todo_list_complete.md)
- [Type Definitions](./types.ts)
- [Registry Implementation](./index.ts)

---

**Remember:** Behaviors are tools that ANY system can use (forms, APIs, AI agents, webhooks, etc.). Design them to be universal and reusable!
