# F6 - Affiliate Event to Reward Pipeline

## Intent

Ingest affiliate tracking events and convert them into reward records through rule evaluation.

## Entry points

- `POST /v1/track/signup`
- `POST /v1/track/purchase`

## Primary anchors

- `services/affiliate/apps/api/src/routes/v1/track/signup.ts`
- `services/affiliate/apps/api/src/routes/v1/track/purchase.ts`
- `services/affiliate/apps/api/src/services/events.ts`
- `services/affiliate/apps/api/src/services/reward-engine.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Client as Affiliate Client
    participant API as Affiliate API
    participant Events as Events Service
    participant Rewards as Reward Engine
    participant DB as CoreDB (Drizzle/Postgres)

    Client->>API: Track signup or purchase event
    API->>DB: Resolve/create participant + referral context
    API->>Events: createEvent(input)
    Events->>DB: Insert event with pending status
    Events->>Rewards: processEventForRewards(eventId)
    Rewards->>DB: Load active reward rules
    loop Matching rules
        Rewards->>DB: Check idempotency + insert reward
    end
    Rewards->>DB: Mark event processed/failed
    API-->>Client: success + eventId
```

## Invariants

1. Event creation validates event definition and participant integrity.
2. Reward generation is idempotent per event/rule/participant.
3. Event status tracks processing outcome (`pending`, `processed`, `failed`).
