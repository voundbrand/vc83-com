# F14 - Credits, Licensing, and AI Billing

## Intent

Enforce plan limits and credit economics while synchronizing paid billing state (Stripe + AI subscriptions) with runtime consumption.

## Entry points

- Credit deduction in `convex/credits/index.ts`
- License checks in `convex/licensing/helpers.ts`
- AI billing checkout/webhooks in `convex/stripe/aiCheckout.ts` and `convex/stripe/aiWebhooks.ts`

## Primary anchors

- `convex/credits/index.ts`
- `convex/licensing/helpers.ts`
- `convex/ai/billing.ts`
- `convex/stripe/aiCheckout.ts`
- `convex/stripe/aiWebhooks.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Runtime as App or AI Runtime
    participant License as License Helper
    participant Credits as Credit System
    participant Billing as AI Billing Runtime
    participant Stripe as Stripe Checkout/Webhooks
    participant DB

    Runtime->>License: checkFeatureAccess/checkResourceLimit
    License->>DB: Resolve active organization license
    DB-->>License: Tier + limits + feature flags

    Runtime->>Credits: deductCredits(amount, action)
    Credits->>DB: Resolve balance and sharing context
    alt Sufficient balance
        Credits->>DB: Write deduction transaction
        Credits-->>Runtime: Success + remaining credits
    else Exhausted
        Credits-->>Runtime: CREDITS_EXHAUSTED/LIMIT_EXCEEDED
    end

    Runtime->>Billing: Query subscription/token balance context
    Billing->>DB: Read aiSubscriptions/aiTokenBalance/aiUsage

    Runtime->>Stripe: Create checkout session for upgrade/purchase
    Stripe-->>Runtime: Hosted checkout URL
    Stripe->>Billing: Webhook upsert for subscription lifecycle
    Billing->>DB: Persist billing state transitions
```

## Invariants

1. License checks must happen before resource creation/mutation side effects.
2. Credit deduction order and transaction logs must be deterministic.
3. Stripe webhook updates must be idempotent for subscription state transitions.
