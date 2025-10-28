# Multi-Provider Checkout Implementation Plan

**Created**: 2025-10-28
**Completed**: 2025-10-28
**Status**: ✅ Phases 1-3 COMPLETE
**Goal**: Support multiple payment provider types (Stripe, Invoice, PayPal, etc.) in checkout flow

## 🎉 Implementation Complete (Phases 1-3)

**Implemented Features:**
- ✅ Provider availability queries from ontology
- ✅ Auto-selection logic (single provider or default)
- ✅ Conditional payment method step
- ✅ Provider-specific payment forms (Stripe + Invoice)
- ✅ Invoice provider factory and registration
- ✅ Provider field stored in checkout sessions
- ✅ TypeScript compilation passes

**Remaining**: Phase 4 (Testing with real data)

---

## 🎯 Current State Analysis

### What We Have ✅

#### 1. **Payment Provider Abstraction** (`convex/paymentProviders/`)
- ✅ `IPaymentProvider` interface - standardized API for all providers
- ✅ `PaymentProviderManager` - central registry and selector
- ✅ **Stripe Connect Provider** - fully implemented
- ✅ **Invoice Provider** - B2B invoicing implemented
- ✅ Provider-agnostic architecture ready for expansion

#### 2. **Provider Storage** (Ontology-based)
```typescript
// objects table - type: "payment_provider_config"
{
  organizationId: "org_123",
  type: "payment_provider_config",
  subtype: "stripe_connect", // or "invoice", "paypal", etc.
  name: "Stripe Configuration",
  status: "active",
  customProperties: {
    providerCode: "stripe-connect",
    accountId: "acct_123",
    isDefault: true,
    isTestMode: false,
    // Provider-specific config...
  }
}
```

#### 3. **Checkout UI Components**
- ✅ `PaymentMethodStep` - UI for provider selection (already built!)
- ✅ Supports displaying: Stripe, PayPal, Square, Manual, Invoice
- ✅ Provider info with icons and descriptions
- ❌ **Not currently integrated** - skipped in flow

#### 4. **Multi-Step Checkout Flow**
```
1. Product Selection →
2. Customer Info →
3. [Payment Method Selection] ← SKIPPED (if only 1 provider)
4. Payment Form →
5. Confirmation
```

---

## 🔍 What's Missing

### 1. **Provider Availability Query** ❌
No query to fetch available providers for an organization.

**Need:**
```typescript
// convex/paymentProviders/helpers.ts
export const getAvailableProviders = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    // Get all active provider configs for org
    const providerConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_and_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "payment_provider_config")
      )
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    return providerConfigs.map(config => ({
      providerCode: config.customProperties.providerCode,
      isDefault: config.customProperties.isDefault,
      name: config.name,
      // ...
    }));
  }
});
```

### 2. **Checkout Flow Integration** ❌
`PaymentMethodStep` exists but not used when multiple providers available.

**Current Issue:**
- Checkout always uses default provider
- No UI to select between Stripe vs Invoice vs PayPal
- Step 3 (Payment Method Selection) is always skipped

**Need:**
- Query available providers during checkout
- Show `PaymentMethodStep` if `providers.length > 1`
- Pass selected provider to payment form

### 3. **Provider Selection in Checkout Session** ❌
Checkout sessions don't store which provider was selected.

**Need to add:**
```typescript
// In checkout session object
customProperties: {
  selectedProvider: "stripe-connect" | "invoice" | "paypal",
  // ...existing fields
}
```

### 4. **Invoice Provider Registration** ❌
Invoice provider not registered in `PaymentProviderManager`.

**Currently:**
- Stripe provider is registered automatically (line 52-72 in manager.ts)
- Invoice provider exists but not registered in manager
- Can't use manager to get invoice provider

**Need:**
```typescript
// In PaymentProviderManager.registerAllProviders()
const invoiceProvider = createInvoiceProvider();
this.registerProvider(invoiceProvider);
```

### 5. **Provider-Specific Payment Forms** ⚠️
`PaymentFormStep` only handles Stripe.

**Need:**
- Conditional rendering based on provider type
- Stripe → Show Stripe Elements
- Invoice → Show invoice acknowledgment
- PayPal → Show PayPal button
- Manual → Show instructions

---

## 📋 Implementation Phases

### **Phase 1: Provider Availability System** (2-3 hours)

#### 1.1 Create Provider Queries
**File:** `convex/paymentProviders/helpers.ts`

```typescript
/**
 * Get all available payment providers for an organization
 */
export const getAvailableProviders = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const configs = await ctx.db
      .query("objects")
      .withIndex("by_org_and_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "payment_provider_config")
      )
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    return configs.map(config => ({
      providerCode: config.customProperties.providerCode as string,
      providerName: config.name,
      isDefault: config.customProperties.isDefault as boolean,
      isTestMode: config.customProperties.isTestMode as boolean,
      capabilities: {
        supportsB2B: config.customProperties.supportsB2B as boolean,
        supportsB2C: config.customProperties.supportsB2C as boolean,
      }
    }));
  }
});

/**
 * Get default payment provider for organization
 */
export const getDefaultProvider = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const defaultConfig = await ctx.db
      .query("objects")
      .withIndex("by_org_and_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "payment_provider_config")
      )
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("customProperties.isDefault"), true)
        )
      )
      .first();

    return defaultConfig?.customProperties.providerCode as string | null;
  }
});
```

**Export in** `convex/paymentProviders/index.ts`:
```typescript
export { getAvailableProviders, getDefaultProvider } from "./helpers";
```

#### 1.2 Register Invoice Provider
**File:** `convex/paymentProviders/invoice.ts`

Add factory function:
```typescript
export function createInvoiceProvider(): IPaymentProvider {
  return {
    providerCode: "invoice",
    providerName: "Invoice (Pay Later)",
    providerIcon: "📄",

    // Implement IPaymentProvider interface
    async startAccountConnection() {
      // No setup needed for invoice provider
      return { success: true, accountId: "invoice-system" };
    },

    async createCheckoutSession(params) {
      // Handled by initiateInvoicePayment action
      return {
        success: true,
        sessionId: params.checkoutSessionId,
        requiresUserAction: false,
      };
    },

    // ... implement other required methods
  };
}
```

**Register in** `convex/paymentProviders/manager.ts`:
```typescript
import { createInvoiceProvider } from "./invoice";

private registerAllProviders(): void {
  // ... existing Stripe registration

  // Register Invoice Provider (always available)
  const invoiceProvider = createInvoiceProvider();
  this.registerProvider(invoiceProvider);
  console.log("✓ Registered Invoice provider");
}
```

---

### **Phase 2: Checkout Flow Integration** (3-4 hours)

#### 2.1 Update Multi-Step Checkout Logic
**File:** `src/components/checkout/multi-step-checkout.tsx`

**Add state for provider selection:**
```typescript
const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
const [availableProviders, setAvailableProviders] = useState<string[]>([]);
```

**Query available providers:**
```typescript
const providers = useQuery(
  api.paymentProviders.getAvailableProviders,
  organizationId ? { organizationId } : "skip"
);

useEffect(() => {
  if (providers) {
    setAvailableProviders(providers.map(p => p.providerCode));

    // Auto-select if only one provider
    if (providers.length === 1) {
      setSelectedProvider(providers[0].providerCode);
    } else if (providers.find(p => p.isDefault)) {
      setSelectedProvider(providers.find(p => p.isDefault)!.providerCode);
    }
  }
}, [providers]);
```

**Update step logic:**
```typescript
const shouldShowPaymentMethodStep = availableProviders.length > 1;

const totalSteps = shouldShowPaymentMethodStep ? 5 : 4;

// Step navigation
if (currentStep === 2 && !shouldShowPaymentMethodStep) {
  // Skip payment method step if only 1 provider
  setCurrentStep(3);
}
```

**Render `PaymentMethodStep`:**
```typescript
{currentStep === 3 && shouldShowPaymentMethodStep && (
  <PaymentMethodStep
    paymentProviders={availableProviders}
    initialSelection={selectedProvider || undefined}
    onComplete={(provider) => {
      setSelectedProvider(provider);
      setCurrentStep(4);
    }}
    onBack={() => setCurrentStep(2)}
  />
)}
```

#### 2.2 Pass Provider to Payment Form
**Update `PaymentFormStep` props:**
```typescript
{currentStep === (shouldShowPaymentMethodStep ? 4 : 3) && (
  <PaymentFormStep
    selectedProvider={selectedProvider || availableProviders[0]}
    // ... other props
  />
)}
```

#### 2.3 Store Provider in Checkout Session
**File:** `convex/checkoutSessionOntology.ts`

**Update `createCheckoutSession` mutation:**
```typescript
await ctx.db.insert("objects", {
  // ... existing fields
  customProperties: {
    // ... existing properties
    selectedProvider: args.selectedProvider || "stripe-connect",
    // ...
  }
});
```

---

### **Phase 3: Provider-Specific Payment Forms** (4-5 hours)

#### 3.1 Refactor PaymentFormStep
**File:** `src/components/checkout/steps/payment-form-step.tsx`

**Add conditional rendering:**
```typescript
export function PaymentFormStep({
  selectedProvider,
  // ... other props
}: PaymentFormStepProps) {

  // Render different UI based on provider
  switch (selectedProvider) {
    case "stripe-connect":
      return <StripePaymentForm {...props} />;

    case "invoice":
      return <InvoicePaymentForm {...props} />;

    case "paypal":
      return <PayPalPaymentForm {...props} />;

    case "manual":
      return <ManualPaymentInstructions {...props} />;

    default:
      return <div>Unsupported payment provider</div>;
  }
}
```

#### 3.2 Create Invoice Payment Form
**File:** `src/components/checkout/steps/invoice-payment-form.tsx`

```typescript
export function InvoicePaymentForm({
  organizationId,
  totalAmount,
  onComplete,
  onBack,
}: InvoicePaymentFormProps) {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          📄 Invoice Payment
        </h2>
        <p className={styles.stepSubtitle}>
          An invoice will be sent to your employer for payment
        </p>
      </div>

      <div className={styles.invoiceInfo}>
        <div className={styles.infoBox}>
          <p><strong>Total Amount:</strong> ${(totalAmount / 100).toFixed(2)}</p>
          <p><strong>Payment Terms:</strong> Net 30 days</p>
          <p><strong>Invoice Recipient:</strong> Your employer organization</p>
        </div>

        <p className={styles.note}>
          By clicking "Complete Registration", you acknowledge that:
        </p>
        <ul className={styles.acknowledgment}>
          <li>An invoice will be generated and sent to your employer</li>
          <li>Payment is due within 30 days of invoice date</li>
          <li>Your registration will be confirmed upon invoice acceptance</li>
        </ul>
      </div>

      <div className={styles.actionButtons}>
        <button onClick={onBack} className={styles.secondaryButton}>
          ← Back
        </button>
        <button
          onClick={() => onComplete({ provider: "invoice" })}
          className={styles.primaryButton}
        >
          Complete Registration →
        </button>
      </div>
    </div>
  );
}
```

#### 3.3 Update Payment Processing
**File:** `convex/checkoutSessions.ts`

**Add provider routing in payment action:**
```typescript
export const processPayment = action({
  args: {
    checkoutSessionId: v.id("objects"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const manager = getPaymentProviderManager();
    const provider = manager.getProvider(args.provider);

    // Use provider to process payment
    const result = await provider.createCheckoutSession({
      checkoutSessionId: args.checkoutSessionId,
      // ... params
    });

    return result;
  }
});
```

---

### **Phase 4: Testing & Validation** (2-3 hours)

#### 4.1 Test Scenarios

**Scenario 1: Single Provider (Stripe)**
- ✅ Payment method step should be skipped
- ✅ Goes directly to Stripe payment form
- ✅ Payment processes normally

**Scenario 2: Multiple Providers (Stripe + Invoice)**
- ✅ Payment method step shows both options
- ✅ Can select Stripe → shows Stripe Elements
- ✅ Can select Invoice → shows invoice acknowledgment
- ✅ Each provider processes correctly

**Scenario 3: Invoice-Only Provider**
- ✅ Payment method step skipped (only 1 option)
- ✅ Goes directly to invoice form
- ✅ Creates consolidated invoice
- ✅ Tickets marked as "awaiting_employer_payment"

**Scenario 4: No Providers Configured**
- ⚠️ Show error message
- ⚠️ Prevent checkout

#### 4.2 Data Validation
- ✅ Provider selection stored in checkout session
- ✅ Correct provider used during payment processing
- ✅ Provider config retrieved from ontology
- ✅ Default provider respected when available

---

## 🗂️ File Structure Summary

```
convex/
├── paymentProviders/
│   ├── index.ts                  ✅ Exports
│   ├── types.ts                  ✅ IPaymentProvider interface
│   ├── manager.ts                🔧 Add invoice registration
│   ├── stripe.ts                 ✅ Stripe Connect implementation
│   ├── invoice.ts                🔧 Add createInvoiceProvider()
│   └── helpers.ts                🔧 Add getAvailableProviders()
│
├── checkoutSessions.ts           🔧 Add provider routing
└── checkoutSessionOntology.ts    🔧 Store selectedProvider

src/components/checkout/
├── multi-step-checkout.tsx       🔧 Add provider selection logic
├── steps/
│   ├── payment-method-step.tsx   ✅ Already built
│   ├── payment-form-step.tsx     🔧 Add provider switching
│   ├── stripe-payment-form.tsx   🆕 Extract Stripe-specific UI
│   └── invoice-payment-form.tsx  🆕 New invoice UI
```

---

## ⏱️ Time Estimates

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Provider availability queries & registration | 2-3 hours |
| Phase 2 | Checkout flow integration | 3-4 hours |
| Phase 3 | Provider-specific payment forms | 4-5 hours |
| Phase 4 | Testing & validation | 2-3 hours |
| **Total** | | **11-15 hours** |

---

## 🎯 Success Criteria

- ✅ Organizations can have multiple payment providers configured
- ✅ Checkout detects available providers automatically
- ✅ Payment method selection step shows when multiple providers exist
- ✅ Each provider has appropriate payment form UI
- ✅ Provider selection is stored and used during payment processing
- ✅ Stripe payments work unchanged
- ✅ Invoice payments create proper B2B invoices
- ✅ Default provider is pre-selected when available
- ✅ Single-provider checkouts skip selection step

---

## 📚 Related Documentation

- [Payment Provider Types](./convex/paymentProviders/types.ts)
- [RBAC Guide](./docs/RBAC_COMPLETE_GUIDE.md)
- [App Availability System](./docs/APP_AVAILABILITY_SYSTEM.md)
- [Checkout System Architecture](./.kiro/checkout_system/CHECKOUT_SYSTEM_ARCHITECTURE.md)

---

**Next Steps:**
1. Review this plan with the team
2. Start with Phase 1 (Provider Availability System)
3. Test each phase thoroughly before moving to next
4. Document any deviations or improvements as we go

**Status**: 📋 Ready for implementation
