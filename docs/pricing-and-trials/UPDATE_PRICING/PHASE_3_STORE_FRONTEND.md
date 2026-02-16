# Phase 3: Store Window Frontend Rewrite

> **Priority:** HIGH
> **Dependencies:** Phase 1 + 2 (backend must support new tiers and credit checkout)
> **Files touched:** 4 (1 rewrite + 3 create)

## Goal

Replace the 1,902-line `store-window.tsx` with a single-page, no-tabs store under 500 lines, plus extracted sub-components. Match the actual Stripe plans.

---

## Current State (WRONG)

```
┌──────────────────────────────────────────────┐
│ [Platform Plans]  [AI & Add-ons]    ← TABS   │
├──────────────────────────────────────────────┤
│ Free  Community  Starter  Pro  Agency  Ent   │
│ €0    €9/mo     €199/mo  €399 €599   custom │
│                                               │
│ (Tab 2: AI Standard, AI Privacy, Token Packs, │
│  Private LLM, Custom Frontend)                │
└──────────────────────────────────────────────┘
```

## Target State (CORRECT)

```
┌──────────────────────────────────────────────┐
│ l4yercak3 Store                               │
├──────────────────────────────────────────────┤
│ [Monthly] [Annual - Save 17%]                 │
│                                               │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐        │
│ │Free │ │ Pro │ │Agcy │ │Enterprise│        │
│ │ €0  │ │€29  │ │€299 │ │ Custom  │        │
│ │     │ │/mo  │ │/mo  │ │         │        │
│ └─────┘ └─────┘ └─────┘ └─────────┘        │
│                                               │
│ ── Buy More Credits ──────────────────        │
│                                               │
│ [€30] [€60] [€100] [€250] [€500] [Custom]   │
│                                               │
│ €100.00 → 1,100 credits                      │
│ [Continue to Payment]                         │
└──────────────────────────────────────────────┘
```

---

## 3A. CREATE `src/components/window-content/store/store-plan-cards.tsx`

**Target:** ~250 lines

### Plan Data

```typescript
const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Try the platform with daily credits",
    icon: <Gift />,
    features: [
      "5 credits/day on login",
      "1 user",
      "100 contacts",
      "1 builder app",
      "Community access",
      "Badge required on sites",
    ],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 2900,   // €29/mo
    annualPrice: 29000,    // €290/yr (≈€24/mo)
    description: "Full platform for one business",
    icon: <Rocket />,
    features: [
      "200 credits/mo + 5/day",
      "3 users",
      "2,000 contacts",
      "Full CRM & invoicing",
      "500 emails/mo",
      "Email support (48h)",
    ],
    cta: "Subscribe",
    highlight: true,
    badge: "Most Popular",
    savingsPercent: 17,
  },
  {
    id: "agency",
    name: "Agency",
    monthlyPrice: 29900,   // €299/mo
    annualPrice: 299000,   // €2,990/yr (≈€249/mo)
    description: "Multi-client operations",
    icon: <Users />,
    features: [
      "2,000 credits/mo + 5/day",
      "15 users",
      "10,000 contacts",
      "Sub-organizations",
      "White label",
      "Priority support (12h)",
    ],
    cta: "Start 14-Day Trial",
    trialBadge: "14-DAY FREE TRIAL",
    subtext: "+ €79/sub-org",
    savingsPercent: 17,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: -1,
    annualPrice: -1,
    description: "Large organizations",
    icon: <Building2 />,
    features: [
      "Unlimited credits",
      "Unlimited users",
      "Custom SLA",
      "SSO/SAML",
      "Private LLM option",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    isEnterprise: true,
  },
];
```

### Props

```typescript
interface StorePlanCardsProps {
  currentPlan: string;
  hasActiveSubscription: boolean;
  isAnnual: boolean;
  onToggleBilling: () => void;
  onSelectPlan: (product: PlanProduct) => void;
  onSubscriptionChange: (tier: string, billingPeriod: "monthly" | "annual") => Promise<void>;
  onContactSales: () => void;
  isManagingSubscription: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
}
```

### Reuse

- Billing toggle from current store
- `SubscriptionStatusBanner` logic (inline in this component)
- CTA button logic (upgrade/downgrade detection using `TIER_ORDER`)

---

## 3B. CREATE `src/components/window-content/store/store-credit-section.tsx`

**Target:** ~200 lines

### UI Design

```
── Buy More Credits ──────────────────

Buying credits lets you pay for AI agent usage beyond
your included monthly limit. Credits never expire.

       US$100.00              ← Large display
  [€30] [€60] [€100] [€250] [€500] [Custom]
                ^^^^^ selected

  At €100: 1,100 credits (11 credits/EUR — 10% bonus!)

  [ Cancel ]  [ Continue to Payment ]
```

### Key Logic

```typescript
// Import shared rate calculation from backend (or duplicate)
import { CREDIT_TIERS, calculateCreditsFromAmount } from "@/lib/credit-pricing";

const PRESET_AMOUNTS = [3000, 6000, 10000, 25000, 50000]; // cents

function StoreCreditSection({ organizationId }: Props) {
  const [selectedAmount, setSelectedAmount] = useState(10000); // €100 default
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const credits = calculateCreditsFromAmount(selectedAmount);
  const rate = selectedAmount > 0 ? credits / (selectedAmount / 100) : 0;
  const bonus = rate > 10 ? Math.round(((rate - 10) / 10) * 100) : 0;

  const handlePurchase = async () => {
    const result = await createCreditCheckout({
      organizationId,
      amountInCents: selectedAmount,
      successUrl: `${origin}/?purchase=success&type=credits&amount=${selectedAmount}&credits=${credits}`,
      cancelUrl: `${origin}/?purchase=canceled&type=credits`,
    });
    window.location.href = result.checkoutUrl;
  };
}
```

### Shared Credit Pricing

Create `src/lib/credit-pricing.ts` (~20 lines) — shared between frontend and backend:
```typescript
export const CREDIT_TIERS = [
  { minCents: 0,     rate: 10 },
  { minCents: 3000,  rate: 11 },
  { minCents: 10000, rate: 12 },
  { minCents: 25000, rate: 13 },
  { minCents: 50000, rate: 15 },
];

export function calculateCreditsFromAmount(amountInCents: number): number {
  const tier = [...CREDIT_TIERS].reverse().find(t => amountInCents >= t.minCents);
  return Math.floor((amountInCents / 100) * (tier?.rate ?? 10));
}
```

---

## 3C. REWRITE `src/components/window-content/store-window.tsx`

**Target:** ~300 lines (down from 1,902)

### What to REMOVE

- `TabButton` component
- `AIAddonsTab` component
- `AIProductCard` component
- `TokenPackCard` component
- `PrivateLLMCard` component
- `CustomFrontendCard` component
- `SectionHeader` component
- `PlatformPlansTab` component (extracted to 3A)
- Tab navigation JSX
- All AI/token pack related imports and logic

### What to KEEP

- Header with gradient
- `EnterpriseContactModal` integration
- Subscription management hooks (`managePlatformSubscription`, `getSubscriptionStatus`, `cancelPendingDowngrade`)
- `handleSubscriptionChange` logic
- `handleAddToCart` for plan checkout flow
- `fullScreen` prop and `/store` route support

### Structure

```typescript
export function StoreWindow({ fullScreen = false }) {
  // Auth + org hooks
  // Subscription management state
  // Subscription status fetch

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      {/* Header with gradient */}
      <StoreHeader fullScreen={fullScreen} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Plan Cards */}
        <StorePlanCards
          currentPlan={currentPlan}
          hasActiveSubscription={hasActiveSubscription}
          // ...subscription props
        />

        {/* Credit Purchase */}
        <StoreCreditSection
          organizationId={currentOrganization?.id}
        />
      </div>

      <EnterpriseContactModal ... />
    </div>
  );
}
```

### Update TIER_ORDER

```typescript
const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  agency: 2,
  enterprise: 3,
};
```

---

## 3D. CREATE `src/components/window-content/store/index.ts`

```typescript
export { StorePlanCards } from "./store-plan-cards";
export { StoreCreditSection } from "./store-credit-section";
```

---

## Verification

1. Visual: Load store window, confirm:
   - No tabs — single scrollable page
   - 4 plan cards with correct pricing (Free, Pro €29, Agency €299, Enterprise)
   - Billing toggle shows annual savings
   - Current plan badge on correct card
   - Credit section with preset amounts
   - Credit calculation updates live

2. Functional:
   - Click Pro "Subscribe" → adds to cart / opens Stripe checkout
   - Click Agency "Start 14-Day Trial" → Stripe checkout with trial
   - Click credit preset → shows correct credit count
   - Click "Continue to Payment" → redirects to Stripe
   - Upgrade/downgrade buttons work for existing subscribers

3. File sizes:
   - `store-window.tsx` < 350 lines
   - `store-plan-cards.tsx` < 300 lines
   - `store-credit-section.tsx` < 250 lines
