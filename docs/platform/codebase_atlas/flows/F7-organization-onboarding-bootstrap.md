# F7 - Organization Onboarding and Bootstrap

## Intent

Create a net-new organization from signup or onboarding conversations, seed core runtime state, and hand control to the tenant-scoped agent/runtime.

## Entry points

- `src/app/api/auth/oauth-signup/route.ts`
- `convex/onboarding.ts` (`signupFreeAccount`)
- `convex/onboarding/completeOnboarding.ts` (`run`)

## Primary anchors

- `convex/onboarding.ts`
- `convex/onboarding/orgBootstrap.ts`
- `convex/onboarding/completeOnboarding.ts`
- `convex/onboarding/telegramResolver.ts`
- `convex/organizationOntology.ts`
- `convex/credits/index.ts`

## Sequence

```mermaid
sequenceDiagram
    participant User as Web User or Telegram User
    participant Entry as Auth/Onboarding Entry
    participant Onboarding as Onboarding Runtime
    participant Crypto as Crypto Actions
    participant Org as Org Bootstrap
    participant Credits as Credit System
    participant Billing as Stripe Customer Bootstrap
    participant Agent as Agent Bootstrap
    participant Routing as Channel Mapping
    participant DB

    User->>Entry: Signup or onboarding completion signal
    Entry->>Onboarding: Start onboarding flow
    alt Web free signup
        Onboarding->>Crypto: Hash password + API key
        Crypto-->>Onboarding: Hashes
        Onboarding->>Org: Create organization + session
    else Conversational onboarding
        Onboarding->>DB: Read extracted interview data
        Onboarding->>Org: createMinimalOrg
    end
    Org->>DB: Insert organization and bootstrap records
    DB-->>Org: organizationId
    Onboarding->>Credits: Grant initial credits
    Credits->>DB: Insert/update credit balances
    Onboarding->>Billing: Create Stripe customer (best effort)
    Billing-->>Onboarding: stripeCustomerId
    Onboarding->>Agent: Bootstrap first org agent/soul
    Agent->>DB: Insert agent config and defaults
    Onboarding->>Routing: Activate org/channel mapping
    Routing->>DB: Persist active routing
    Onboarding-->>User: Tenant is ready for runtime traffic
```

## Invariants

1. Organization bootstrap must complete before tenant-scoped agent routing activates.
2. Initial credit and billing state must be provisioned idempotently.
3. Onboarding failures must not leave partially active routing.
