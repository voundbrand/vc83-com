# F5 - External Webhooks and Channel Ingestion

## Intent

Receive provider webhooks, verify and normalize payloads, then route to domain handlers or agent pipeline.

## Entry points

- `/stripe-webhooks`
- `/stripe-connect-webhooks`
- `/telegram-webhook`
- other provider webhook paths in `convex/http.ts`

## Primary anchors

- `convex/http.ts`
- `convex/stripeWebhooks.ts`
- `convex/channels/webhooks.ts`
- `convex/channels/router.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Provider
    participant Http as HTTP Webhook Endpoint
    participant Proc as Webhook Processor
    participant Domain as Domain Runtime or Agent Runtime
    participant Router as Channel Router
    participant DB

    Provider->>Http: Webhook POST
    Http->>Http: Verify signature/token
    Http->>Proc: Schedule async processing
    Proc->>Proc: Normalize provider payload
    alt Domain event
        Proc->>Domain: Process business event
        Domain->>DB: Persist state updates
    else Inbound message event
        Proc->>Domain: processInboundMessage
        Domain->>Router: sendMessage (outbound)
        Router->>Provider: Delivery API call
    end
    Proc->>DB: Write webhook processing log
    Http-->>Provider: 200/ack
```

## Invariants

1. Webhook endpoints should return quickly; heavy work runs async.
2. Signature/token checks must happen before processing.
3. Message-channel webhooks route through the same outbound adapter path.
