# Checkout Result Window — Implementation Plan

## Problem

After a Stripe checkout (credit purchase or plan subscription), the user is redirected to either:
- `/store?credits=success` — full-screen store page (bad UX, no confirmation details)
- `/?checkout=success` — homepage with a generic success window

We want a **single, unified checkout result window** that shows custom messages based on what the user actually purchased (credits, plan upgrade, etc.) with purchase details.

## Current State

### Success/Cancel URLs (set at checkout time)

**Credit purchases** ([store-window.tsx:989-990](src/components/window-content/store-window.tsx#L989-L990)):
```typescript
successUrl: `${window.location.origin}/store?credits=success`,
cancelUrl: `${window.location.origin}/store?credits=canceled`,
```

**Platform plan subscriptions** ([platform-cart-window.tsx:61-62](src/components/window-content/platform-cart-window.tsx#L61-L62)):
```typescript
successUrl: `${window.location.origin}?checkout=success`,
cancelUrl: `${window.location.origin}?checkout=cancel`,
```

### Query param handling ([src/app/page.tsx:478-533](src/app/page.tsx#L478-L533))

The main page.tsx has a `useEffect` that reads query params and opens windows:
- `?checkout=success` → opens `CheckoutSuccessWindow` (generic "Order Complete")
- `?checkout=cancel` / `?checkout=failed` → opens `CheckoutFailedWindow`
- `?credits=success` / `?credits=canceled` → **NOT HANDLED** (just loads /store page)

### Existing window components

| Component | File | What it shows |
|-----------|------|---------------|
| `CheckoutSuccessWindow` | [src/components/window-content/checkout-success-window.tsx](src/components/window-content/checkout-success-window.tsx) | Generic "Order Complete" with confetti, 3 info cards |
| `CheckoutFailedWindow` | [src/components/window-content/checkout-failed-window.tsx](src/components/window-content/checkout-failed-window.tsx) | Generic failure with reason-specific messages |

### Window registry pattern ([src/hooks/window-registry.tsx](src/hooks/window-registry.tsx))

```typescript
// 1. Lazy import
const CheckoutSuccessWindow = lazy(() =>
  import("@/components/window-content/checkout-success-window").then(m => ({ default: m.CheckoutSuccessWindow }))
);

// 2. Register in WINDOW_REGISTRY
"checkout-success": {
  createComponent: () => <CheckoutSuccessWindow />,
  defaultConfig: {
    title: "Order Complete",
    titleKey: "ui.app.checkout",
    icon: "✅",
    position: { x: 400, y: 100 },
    size: { width: 600, height: 650 }
  }
},
```

### Opening a window from page.tsx

```typescript
const openCheckoutSuccessWindow = () => {
  const centerX = (window.innerWidth - 600) / 2;
  const centerY = (window.innerHeight - 650) / 2;
  openWindow("checkout-success", "Order Complete", <CheckoutSuccessWindow />,
    { x: centerX, y: centerY }, { width: 600, height: 650 }, 'ui.app.checkout')
}
```

---

## Implementation Plan

### Step 1: Update success/cancel URLs to pass purchase details

Both checkout functions already pass URLs to Stripe. Stripe supports `{CHECKOUT_SESSION_ID}` placeholder in success URLs.

**In [store-window.tsx](src/components/window-content/store-window.tsx) `CreditPurchasePanel.handlePurchase`:**
```typescript
// BEFORE:
successUrl: `${window.location.origin}/store?credits=success`,
cancelUrl: `${window.location.origin}/store?credits=canceled`,

// AFTER:
successUrl: `${window.location.origin}/?purchase=success&type=credits&amount=${selectedAmount}&credits=${credits}`,
cancelUrl: `${window.location.origin}/?purchase=canceled&type=credits`,
```

**In [platform-cart-window.tsx](src/components/window-content/platform-cart-window.tsx) `handleCheckout`:**
```typescript
// BEFORE:
successUrl: `${window.location.origin}?checkout=success`,
cancelUrl: `${window.location.origin}?checkout=cancel`,

// AFTER (for platform plans):
successUrl: `${window.location.origin}/?purchase=success&type=plan&tier=${tier}&period=${billingPeriod}`,
cancelUrl: `${window.location.origin}/?purchase=canceled&type=plan`,

// AFTER (for AI subscriptions):
successUrl: `${window.location.origin}/?purchase=success&type=ai&tier=${tier}`,
cancelUrl: `${window.location.origin}/?purchase=canceled&type=ai`,
```

### Step 2: Create `PurchaseResultWindow` component

**New file: `src/components/window-content/purchase-result-window.tsx`**

Props interface:
```typescript
interface PurchaseResultWindowProps {
  status: "success" | "canceled" | "failed";
  type: "credits" | "plan" | "ai";
  // Success details (optional, only present on success)
  amount?: number;       // EUR cents for credits
  credits?: number;      // Credit count for credit purchases
  tier?: string;         // "pro" | "agency" for plan purchases
  period?: string;       // "monthly" | "annual" for plan purchases
  reason?: string;       // Failure reason
}
```

**Success view should show:**
- Confetti animation (reuse from existing CheckoutSuccessWindow)
- Purchase type icon (⚡ credits, 🚀 plan upgrade, 🤖 AI subscription)
- Dynamic title: "Credits Added!" / "Welcome to Pro!" / "AI Subscription Active!"
- Purchase summary: "550 credits added to your account" / "Pro Plan — €29/mo"
- 3 info cards (similar to existing but with purchase-specific content):
  - Receipt/confirmation info
  - What happens next (credits available immediately / features unlocked)
  - Support contact

**Canceled/Failed view should show:**
- Warning icon (reuse shake animation from CheckoutFailedWindow)
- Dynamic message based on type: "Credit purchase canceled" / "Plan upgrade canceled"
- Reassurance: "No charge was made"
- "Try Again" button → opens Store window
- "Contact Support" link

### Step 3: Register in window-registry.tsx

In [src/hooks/window-registry.tsx](src/hooks/window-registry.tsx):

```typescript
const PurchaseResultWindow = lazy(() =>
  import("@/components/window-content/purchase-result-window").then(m => ({ default: m.PurchaseResultWindow }))
);

"purchase-result": {
  createComponent: (props) => <PurchaseResultWindow {...props as PurchaseResultWindowProps} />,
  defaultConfig: {
    title: "Purchase",
    icon: "🛒",
    position: { x: 400, y: 100 },
    size: { width: 550, height: 550 }
  }
},
```

### Step 4: Update query param handler in page.tsx

In [src/app/page.tsx](src/app/page.tsx) (~line 478), update the existing `useEffect`:

```typescript
// Replace both the checkout= and credits= handling with unified purchase= handling
const purchaseParam = params.get('purchase');
const purchaseType = params.get('type');

if (purchaseParam === 'success') {
  const props = {
    status: 'success' as const,
    type: purchaseType || 'plan',
    amount: params.get('amount') ? parseInt(params.get('amount')!) : undefined,
    credits: params.get('credits') ? parseInt(params.get('credits')!) : undefined,
    tier: params.get('tier') || undefined,
    period: params.get('period') || undefined,
  };
  openWindow("purchase-result", "Purchase Complete", <PurchaseResultWindow {...props} />,
    { x: centerX, y: centerY }, { width: 550, height: 550 });
  window.history.replaceState({}, '', window.location.pathname);
} else if (purchaseParam === 'canceled' || purchaseParam === 'failed') {
  const props = {
    status: purchaseParam as 'canceled' | 'failed',
    type: purchaseType || 'plan',
    reason: params.get('reason') || undefined,
  };
  openWindow("purchase-result", "Purchase Canceled", <PurchaseResultWindow {...props} />,
    { x: centerX, y: centerY }, { width: 550, height: 500 });
  window.history.replaceState({}, '', window.location.pathname);
}
```

**Keep the old `?checkout=success` handling** for backwards compatibility (in case a user has an old Stripe session that redirects with old params). Can remove later.

### Step 5: (Optional) Remove old windows

Once the new `PurchaseResultWindow` is working, the old windows can be deprecated:
- `checkout-success-window.tsx` — replaced by `purchase-result-window.tsx` with `status=success`
- `checkout-failed-window.tsx` — replaced by `purchase-result-window.tsx` with `status=canceled/failed`

Don't delete immediately — keep for backwards compatibility until all active Stripe sessions have expired (sessions expire after 24h).

---

## Files to modify

| File | Change |
|------|--------|
| **NEW** `src/components/window-content/purchase-result-window.tsx` | Create unified purchase result component |
| `src/hooks/window-registry.tsx` | Register `purchase-result` window |
| `src/app/page.tsx` | Add `?purchase=` query param handler |
| `src/components/window-content/store-window.tsx` | Update credit purchase success/cancel URLs |
| `src/components/window-content/platform-cart-window.tsx` | Update plan checkout success/cancel URLs |

## Design notes

- Reuse the existing retro/win95 styling from CheckoutSuccessWindow and CheckoutFailedWindow
- Keep the confetti animation for success states
- Keep the shake animation for failed states
- The window should be closeable (standard window chrome)
- "Try Again" button should call `openWindow("store", ...)` to open the store
- Match the visual language of the existing store window (gradients, `font-pixel`, CSS vars)

## Stripe URL limitations

- Stripe success URLs support the `{CHECKOUT_SESSION_ID}` template variable
- Query params in success/cancel URLs are preserved as-is
- Max URL length is ~2000 chars (our params are well under this)
- Credit amounts and tier info are safe to put in URLs (not sensitive data)
