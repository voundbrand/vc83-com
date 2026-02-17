# F2 - AI Conversation Runtime

## Intent

Process inbound user/channel messages through policy-driven model and tool execution, then deliver outbound responses.

## Entry points

- `convex/ai/chat.ts` (`sendMessage`)
- `convex/ai/agentExecution.ts` (`processInboundMessage`)

## Primary anchors

- `convex/ai/modelPolicy.ts`
- `convex/ai/retryPolicy.ts`
- `convex/ai/toolScoping.ts`
- `convex/ai/toolBroker.ts`
- `convex/ai/outboundDelivery.ts`
- `convex/channels/router.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Inbound as UI or Channel Inbound
    participant Agent as Agent Execution
    participant Policy as Model + Tool Policy
    participant LLM
    participant Tools as Tool Runtime
    participant Outbound as Outbound Delivery
    participant Router as Channel Router
    participant Provider
    participant DB

    Inbound->>Agent: Message + org + channel context
    Agent->>DB: Resolve session/contact/agent config
    DB-->>Agent: Session + history + metadata
    Agent->>Policy: Resolve model + active tools
    Policy-->>Agent: Selected model + scoped tools
    Agent->>LLM: Prompt + tool schemas
    LLM-->>Agent: Assistant content + optional tool calls
    Agent->>Tools: Execute approved tool calls
    Tools->>DB: Read/write domain state
    DB-->>Tools: Tool results
    Tools-->>Agent: Tool execution outputs
    Agent->>Outbound: Final assistant response
    Outbound->>Router: sendMessage
    Router->>Provider: Provider-specific outbound API
    Provider-->>Router: Delivery status
    Router-->>Outbound: Delivered or failed
    Outbound->>DB: Persist DLQ on failure
```

## Invariants

1. Tool access is resolved with most-restrictive-wins scoping.
2. Model selection is policy-driven, not hardcoded per flow.
3. Outbound failure must not silently drop messages; DLQ fallback is required.
