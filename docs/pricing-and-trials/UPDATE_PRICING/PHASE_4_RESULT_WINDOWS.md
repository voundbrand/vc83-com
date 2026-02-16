# Phase 4: Purchase Result Window Wiring

> **Priority:** HIGH
> **Dependencies:** Phase 3 (store must use new checkout URLs)
> **Files touched:** 4 (2 modify + 2 delete)

## Goal

Wire the already-built `purchase-result-window.tsx` into the Stripe callback flow and in-app subscription changes. Replace the old `checkout-success-window.tsx` and `checkout-failed-window.tsx`.

---

## Existing Asset: `purchase-result-window.tsx` (614 lines)

This component is **already fully built** and supports all result types:

| Type | Success | Canceled/Failed |
|------|---------|----------------|
| `credits` | "Credits Added!" + confetti | "Credit Purchase Cancelled" |
| `plan` | "Welcome to {Tier}!" + confetti | "Plan Upgrade Cancelled" |
| `ai` | "AI Subscription Active!" | "AI Subscription Cancelled" |
| `upgrade` | "Upgraded to {Tier}!" + proration info | — |
| `downgrade` | "Downgrade Scheduled" + effective date | — |
| `cancel` | "Cancellation Scheduled" + end date | — |
| `revert` | "Change Reverted!" | — |

Props interface:
```typescript
interface PurchaseResultWindowProps {
  status: "success" | "canceled" | "failed";
  type: "credits" | "plan" | "ai" | "upgrade" | "downgrade" | "cancel" | "revert";
  amount?: number;
  credits?: number;
  tier?: string;
  period?: string;
  reason?: string;
  fromTier?: string;
  toTier?: string;
  effectiveDate?: number;
  message?: string;
}
```

---

## 4A. Update URL Parameter Handling — `src/app/page.tsx`

**Action:** MODIFY (lines ~497-552)

### New URL Scheme

**Stripe callbacks (redirect after checkout):**
```
/?purchase=success&type=plan&tier=pro&period=monthly
/?purchase=success&type=credits&amount=10000&credits=1100
/?purchase=canceled&type=plan&reason=cancel
/?purchase=canceled&type=credits&reason=cancel
/?purchase=failed&type=plan&reason=payment_failed
```

**Backward compatibility:**
```
/?checkout=success  →  /?purchase=success&type=plan  (map internally)
/?checkout=cancel   →  /?purchase=canceled&type=plan
/?checkout=failed   →  /?purchase=failed&type=plan
```

### Code Changes

```typescript
// Replace the existing checkout param handling block with:

const purchaseParam = params.get('purchase');
const purchaseType = params.get('type') as PurchaseResultWindowProps['type'] || 'plan';

// Backward compat: map old ?checkout= to new ?purchase=
const checkoutParam = params.get('checkout');
const effectivePurchase = purchaseParam || (checkoutParam === 'success' ? 'success' :
  checkoutParam === 'cancel' ? 'canceled' :
  checkoutParam === 'failed' ? 'failed' : null);

if (effectivePurchase === 'success') {
  const props: PurchaseResultWindowProps = {
    status: 'success',
    type: purchaseType,
    amount: params.get('amount') ? parseInt(params.get('amount')!) : undefined,
    credits: params.get('credits') ? parseInt(params.get('credits')!) : undefined,
    tier: params.get('tier') || undefined,
    period: params.get('period') || undefined,
    fromTier: params.get('fromTier') || undefined,
    toTier: params.get('toTier') || undefined,
    effectiveDate: params.get('effectiveDate') ? parseInt(params.get('effectiveDate')!) : undefined,
    message: params.get('message') || undefined,
  };

  const centerX = (window.innerWidth - 600) / 2;
  const centerY = (window.innerHeight - 650) / 2;
  openWindow("purchase-result", "Purchase Complete",
    <PurchaseResultWindow {...props} />,
    { x: centerX, y: centerY }, { width: 600, height: 650 });
  window.history.replaceState({}, '', window.location.pathname);

} else if (effectivePurchase === 'canceled' || effectivePurchase === 'failed') {
  const props: PurchaseResultWindowProps = {
    status: effectivePurchase as 'canceled' | 'failed',
    type: purchaseType,
    reason: params.get('reason') || effectivePurchase,
  };

  const centerX = (window.innerWidth - 600) / 2;
  const centerY = (window.innerHeight - 600) / 2;
  openWindow("purchase-result", "Purchase",
    <PurchaseResultWindow {...props} />,
    { x: centerX, y: centerY }, { width: 600, height: 600 });
  window.history.replaceState({}, '', window.location.pathname);
}
```

### Imports

Remove:
```typescript
// DELETE these imports
import { CheckoutSuccessWindow } from "...";
import { CheckoutFailedWindow } from "...";
```

Add:
```typescript
import { PurchaseResultWindow, type PurchaseResultWindowProps } from "@/components/window-content/purchase-result-window";
```

Remove old helper functions: `openCheckoutSuccessWindow`, `openCheckoutFailedWindow`.

---

## 4B. Update Checkout Success/Cancel URLs

### In `store-window.tsx` (plan checkout)

```typescript
// When creating Stripe checkout for plans
successUrl: `${window.location.origin}/?purchase=success&type=plan&tier=${tier}&period=${billingPeriod}`,
cancelUrl: `${window.location.origin}/?purchase=canceled&type=plan&reason=cancel`,
```

### In `store-credit-section.tsx` (credit checkout)

```typescript
successUrl: `${window.location.origin}/?purchase=success&type=credits&amount=${amountInCents}&credits=${calculatedCredits}`,
cancelUrl: `${window.location.origin}/?purchase=canceled&type=credits&reason=cancel`,
```

### In `store-window.tsx` (in-app upgrade/downgrade)

When `handleSubscriptionChange` returns success, open PurchaseResultWindow directly:

```typescript
const result = await managePlatformSubscription({ organizationId, newTier, billingPeriod });

if (result.success) {
  const isUpgrade = TIER_ORDER[newTier] > TIER_ORDER[currentPlan];
  const isDowngrade = TIER_ORDER[newTier] < TIER_ORDER[currentPlan];
  const isCancelToFree = newTier === "free";

  const type = isCancelToFree ? "cancel" : isUpgrade ? "upgrade" : "downgrade";

  openWindow("purchase-result", "Subscription Updated",
    <PurchaseResultWindow
      status="success"
      type={type}
      fromTier={currentPlan}
      toTier={newTier}
      message={result.message}
      effectiveDate={result.effectiveDate}
    />,
    { x: centerX, y: centerY }, { width: 600, height: 650 });
}
```

### In `platform-cart-window.tsx`

Update the existing success/cancel URLs to use new scheme:
```typescript
successUrl: `${window.location.origin}/?purchase=success&type=plan&tier=${tier}&period=${billingPeriod}`,
cancelUrl: `${window.location.origin}/?purchase=canceled&type=plan&reason=cancel`,
```

---

## 4C. Update Window Registry — `src/hooks/window-registry.tsx`

### Add purchase-result

```typescript
const PurchaseResultWindow = lazy(() =>
  import("@/components/window-content/purchase-result-window").then(m => ({ default: m.PurchaseResultWindow }))
);

// In WINDOW_REGISTRY:
"purchase-result": {
  createComponent: (props) => <PurchaseResultWindow {...(props as PurchaseResultWindowProps)} />,
  defaultConfig: {
    title: "Purchase",
    titleKey: "ui.windows.purchase.title",
    icon: "🛒",
    position: { x: 400, y: 100 },
    size: { width: 600, height: 650 },
  },
},
```

### Remove old entries

Delete from `WINDOW_REGISTRY`:
- `"checkout-success"` entry (lines ~556-560)
- `"checkout-failed"` entry (lines ~567+)

Delete lazy imports:
- `CheckoutSuccessWindow`
- `CheckoutFailedWindow`

---

## 4D. DELETE Old Windows

- `src/components/window-content/checkout-success-window.tsx` (223 lines)
- `src/components/window-content/checkout-failed-window.tsx` (250 lines)

These are fully replaced by `purchase-result-window.tsx`.

---

## Verification

1. **Stripe callback — credit success:**
   Navigate to `/?purchase=success&type=credits&amount=10000&credits=1100`
   Expected: PurchaseResultWindow opens with "Credits Added!" + confetti

2. **Stripe callback — plan success:**
   Navigate to `/?purchase=success&type=plan&tier=pro&period=monthly`
   Expected: PurchaseResultWindow opens with "Welcome to Pro!" + confetti

3. **Stripe callback — canceled:**
   Navigate to `/?purchase=canceled&type=plan&reason=cancel`
   Expected: PurchaseResultWindow opens with "Plan Upgrade Cancelled"

4. **Backward compat:**
   Navigate to `/?checkout=success`
   Expected: Still works, maps to PurchaseResultWindow with `type=plan`

5. **In-app upgrade:**
   Click "Upgrade" on Pro card (while on Free)
   Expected: After success, PurchaseResultWindow opens with "Upgraded to Pro!"

6. **In-app downgrade:**
   Click "Downgrade" on Free card (while on Pro)
   Expected: PurchaseResultWindow opens with "Downgrade Scheduled" + effective date
