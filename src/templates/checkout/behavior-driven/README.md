# Behavior-Driven Checkout Template

Clean, modern checkout template powered by the Universal Behavior System.

## Features

✅ **Behavior-Powered** - Business logic handled by reusable behaviors
✅ **6-Step Flow** - Product selection → Registration → Customer info → Review → Payment → Confirmation
✅ **Smart Step Skipping** - Automatically skips payment for invoice checkouts
✅ **Progress Tracking** - Visual progress bar shows completion percentage
✅ **Debug Mode** - Built-in debug panel for development
✅ **Type-Safe** - Full TypeScript support with strict typing
✅ **Mobile-Ready** - Responsive design (pending CSS)

## Quick Start

### 1. Import the Template

```typescript
import { BehaviorDrivenCheckout } from "@/templates/checkout/behavior-driven";
```

### 2. Prepare Your Products

```typescript
const products = [
  {
    _id: "prod_001",
    type: "product",
    subtype: "ticket",
    name: "Conference Ticket",
    price: 50000, // $500.00 in cents
    currency: "EUR",
    customProperties: {
      // Optional: Attach behaviors
      behaviors: [
        {
          type: "employer-detection",
          config: { employerField: "company" },
          priority: 100,
        },
        {
          type: "invoice-mapping",
          config: {
            sourceField: "company",
            mapping: { "Acme Corp": "org_123" },
          },
          priority: 90,
        },
      ],
      // Optional: Attach form
      formId: "registration_form_001",
    },
  },
];
```

### 3. Render the Checkout

```tsx
<BehaviorDrivenCheckout
  organizationId={orgId}
  products={products}
  theme={theme}
  debugMode={true} // Enable debug panel in development
/>
```

## Configuration Options

```typescript
interface BehaviorDrivenCheckoutConfig {
  // Required
  organizationId: Id<"organizations">;
  products: BehaviorDrivenProduct[];
  theme: Theme;

  // Optional
  allowBackNavigation?: boolean;       // Default: true
  showProgressBar?: boolean;           // Default: true
  enableAutoSave?: boolean;            // Default: false
  debugMode?: boolean;                 // Default: false
  executeBehaviorsOnStepChange?: boolean;  // Default: true
  behaviorExecutionTiming?: "eager" | "lazy"; // Default: "eager"

  // Callbacks
  onStepChange?: (from: Step, to: Step) => void;
  onBehaviorExecution?: (result: BehaviorExecutionResult) => void;
  onComplete?: (data: CheckoutData) => void;
  onError?: (error: Error) => void;
}
```

## Checkout Steps

### Step 1: Product Selection
- Select products and quantities
- Shows product cards with images, descriptions, features
- Calculates cart totals in real-time
- **Behaviors executed:** None (just collecting data)

### Step 2: Registration Form (Optional)
- Dynamic form based on product configuration
- One form per ticket if product has `formId`
- Collects responses for behavior processing
- **Behaviors executed:** None (form data collected for next steps)

### Step 3: Customer Info
- Minimal contact information (email, name, phone)
- Behaviors can auto-fill company details if employer detected
- **Behaviors executed:** `employer-detection`, `invoice-mapping` (eager mode)

### Step 4: Review Order
- Show complete order summary
- Display applied behavior results (employer billing notice)
- Preview what happens next (invoice vs payment)
- **Behaviors executed:** None (using results from previous step)

### Step 5: Payment (Conditional)
- **Skipped if behaviors determine invoice checkout**
- Shows payment UI for Stripe/PayPal/etc.
- Currently placeholder - payment integration TBD
- **Behaviors executed:** None

### Step 6: Confirmation
- Success message with order details
- Email confirmation notice
- Download tickets/receipts (TBD)
- Shows applied behavior summary for transparency
- **Behaviors executed:** None (final step)

## Behavior Integration

### How Behaviors Execute

**Eager Mode (Default):**
```typescript
// Behaviors execute BEFORE step transition
Step 3 (Customer Info) → Execute behaviors → Step 4 (Review Order)
```

**Lazy Mode:**
```typescript
// Behaviors execute on-demand when component calls executeBehaviors()
Step 3 (Customer Info) → Step 4 (Review Order) → User clicks "Execute" → Behaviors run
```

### Accessing Behavior Results

```typescript
// In any step component
const { checkoutData } = props;
const behaviorResults = checkoutData.behaviorResults;

// Check for specific behavior
const invoiceInfo = getInvoiceMappingFromResults(behaviorResults);
if (invoiceInfo.shouldInvoice) {
  // Show invoice UI instead of payment
}
```

### Smart Step Skipping

The checkout automatically skips payment step when behaviors determine invoice checkout:

```typescript
// config.ts - getNextStep()
if (nextStep === "payment" && behaviorResults?.shouldSkipPayment) {
  nextStep = "confirmation"; // Skip directly to confirmation
}
```

## Testing Scenarios

### Scenario 1: Simple B2C Checkout
```typescript
const simpleProduct = {
  name: "General Admission",
  price: 5000, // $50
  customProperties: {
    // No behaviors - standard flow
  },
};
// Expected: Product → Customer Info → Payment → Confirmation
```

### Scenario 2: Employer-Paid B2B
```typescript
const b2bProduct = {
  name: "Conference Ticket - Employer Paid",
  price: 50000, // $500
  customProperties: {
    behaviors: [
      { type: "employer-detection", ... },
      { type: "invoice-mapping", ... },
    ],
    formId: "conference_registration",
  },
};
// Expected: Product → Form (collects company) → Customer Info → Review (shows employer notice) → Confirmation (skips payment!)
```

### Scenario 3: Multi-Product with Forms
```typescript
const products = [
  workshopTicket, // Has form
  conferenceTicket, // Has form
  dinnerTicket, // No form
];
// Expected: Product → Forms (one per ticket) → Customer Info → Review → Payment → Confirmation
```

## Debug Mode

Enable debug panel to see:
- Current step
- Products in cart
- Form responses collected
- Customer info entered
- Behavior execution results
- Full checkout data JSON

```tsx
<BehaviorDrivenCheckout
  {...props}
  debugMode={true}
/>
```

Debug panel appears bottom-right corner with real-time state inspection.

## Customization

### Custom Styling

Add your own CSS classes:
```css
.behavior-driven-checkout {
  /* Main container */
}

.checkout-progress {
  /* Progress bar */
}

.checkout-step {
  /* Step container */
}
```

### Custom Step Components

Replace default steps:
```typescript
// Create custom step
function MyCustomCustomerInfo(props: StepProps) {
  return <div>My custom UI</div>;
}

// Modify index.tsx to use custom step
case "customer-info":
  return <MyCustomCustomerInfo {...stepProps} />;
```

### Custom Callbacks

Track user actions:
```typescript
<BehaviorDrivenCheckout
  onStepChange={(from, to) => {
    console.log(`Step transition: ${from} → ${to}`);
    analytics.track("checkout_step_change", { from, to });
  }}
  onBehaviorExecution={(result) => {
    console.log("Behaviors executed:", result.results.length);
    analytics.track("behaviors_executed", {
      count: result.results.length,
      success: result.success,
    });
  }}
  onComplete={(data) => {
    console.log("Checkout complete!", data);
    analytics.track("checkout_complete", {
      total: data.totalPrice,
      products: data.selectedProducts?.length,
    });
  }}
/>
```

## Architecture

```
behavior-driven/
├── index.tsx           # Main orchestrator component
├── config.ts           # Step definitions and flow logic
├── types.ts            # TypeScript interfaces
├── README.md           # This file
└── steps/
    ├── product-selection.tsx
    ├── registration-form.tsx
    ├── customer-info.tsx
    ├── review-order.tsx
    ├── payment.tsx
    └── confirmation.tsx
```

## Comparison to Old Checkout

| Feature | Old Multi-Step | New Behavior-Driven |
|---------|---------------|-------------------|
| Business Logic | Hardcoded in components (50+ lines) | Behaviors (reusable) |
| Employer Detection | Manual CRM queries | `employer-detection` behavior |
| Step Flow | Static 5 steps | Dynamic (skips payment for invoices) |
| Testability | Hard to test logic | Behaviors testable in isolation |
| Configuration | Deep component props | Product customProperties |
| Lines of Code | ~2000 lines | ~1200 lines (40% reduction) |

## Next Steps

1. **Add Payment Integration** - Replace payment.tsx placeholder with real Stripe/PayPal
2. **Form Fetching** - Implement actual form loading in registration-form.tsx
3. **PDF Generation** - Add ticket/receipt download functionality
4. **Styling** - Apply consistent design system
5. **More Behaviors** - Add capacity checking, discount rules, etc.

## Support

Questions? Check the behavior system docs:
- [Behavior Integration Guide](../../lib/behaviors/INTEGRATION.md)
- [Behavior Structure](../../lib/behaviors/STRUCTURE.md)
- [Available Behaviors](../../lib/behaviors/README.md)
