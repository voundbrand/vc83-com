# Agent Control Center Data Contract

**Date:** 2026-02-18  
**Scope:** Canonical UI contracts for thread rows, timeline events, intervention payloads, and human-in-loop ingress across provider channels.

---

## Canonical lifecycle contract (locked)

All UI contracts must use:

`draft -> active -> paused -> escalated -> takeover -> resolved -> active`

Source of truth:

- `convex/ai/agentLifecycle.ts`

---

## 1) Thread row contract

```ts
type AgentLifecycleState =
  | "draft"
  | "active"
  | "paused"
  | "escalated"
  | "takeover"
  | "resolved";

type ThreadDeliveryState =
  | "queued"
  | "running"
  | "done"
  | "blocked"
  | "failed";

type ProviderChannel =
  | "webchat"
  | "native_guest"
  | "telegram"
  | "slack"
  | "sms"
  | "whatsapp"
  | "email"
  | "api";

type ControlCenterThreadRow = {
  threadId: string; // stable operator-facing thread ID
  sessionId: string; // active agent session
  organizationId: string;
  templateAgentId: string;
  templateAgentName: string;

  lifecycleState: AgentLifecycleState;
  deliveryState: ThreadDeliveryState;

  escalationCountOpen: number;
  escalationUrgency: "low" | "normal" | "high" | null;
  waitingOnHuman: boolean;

  activeInstanceCount: number;
  takeoverOwnerUserId?: string;

  channel: ProviderChannel;
  externalContactIdentifier: string;
  lastMessagePreview: string;
  unreadCount: number;
  pinned: boolean;

  updatedAt: number;
  sortScore: number; // urgency + recency ordering
};
```

Validation rules:

1. `lifecycleState` cannot be inferred from UI-local strings.
2. `deliveryState` must not reuse lifecycle colors.
3. `waitingOnHuman=true` only when lifecycle is `escalated` or `takeover`.

---

## 2) Timeline event contract

```ts
type TimelineEventKind =
  | "lifecycle"
  | "approval"
  | "escalation"
  | "handoff"
  | "tool"
  | "memory"
  | "soul"
  | "operator";

type EscalationGate =
  | "pre_llm"
  | "post_llm"
  | "tool_failure"
  | "not_applicable";

type ControlCenterTimelineEvent = {
  eventId: string;
  sessionId: string;
  threadId: string;
  kind: TimelineEventKind;
  occurredAt: number;

  actorType: "agent" | "operator" | "system";
  actorId: string;

  fromState?: AgentLifecycleState;
  toState?: AgentLifecycleState;
  checkpoint?: string; // e.g. escalation_created, escalation_taken_over
  escalationGate: EscalationGate;

  title: string;
  summary: string;
  reason?: string;

  trustEventName?: string;
  trustEventId?: string;
  sourceObjectIds?: string[];
  metadata?: Record<string, unknown>;
};
```

Validation rules:

1. `kind="lifecycle"` requires `fromState`, `toState`, and `checkpoint`.
2. Escalation checkpoints must map to one of the three gates.
3. Every intervention-caused event must include `trustEventName` when emitted.

---

## 3) Intervention queue payload contract

```ts
type InterventionKind = "approval" | "escalation" | "handoff" | "operator_reply";

type InterventionAction =
  | "approve"
  | "reject"
  | "take_over"
  | "dismiss"
  | "resolve"
  | "hand_off"
  | "reply_in_stream"
  | "resume_agent";

type InterventionQueueItem = {
  itemId: string;
  kind: InterventionKind;
  sessionId: string;
  threadId: string;
  lifecycleState: AgentLifecycleState;

  blockerReason: string;
  urgency: "low" | "normal" | "high";
  createdAt: number;
  slaDueAt?: number;

  availableActions: InterventionAction[];

  context: {
    channel: ProviderChannel;
    externalContactIdentifier: string;
    activeInstanceId?: string;
    escalationId?: string;
    approvalId?: string;
    handoffId?: string;
  };
};

type InterventionActionPayload = {
  action: InterventionAction;
  sessionId: string;
  threadId: string;
  actorUserId: string;
  actorLabel: string;
  reason: string;
  note?: string;

  // action-specific
  approvalId?: string;
  escalationId?: string;
  handOffToUserId?: string;
  replyText?: string;
  replyChannel?: ProviderChannel;
  resolutionSummary?: string;
};
```

Audit requirements:

1. Every mutation writes `objectActions` and trust event payloads.
2. `reason` is mandatory for `reject`, `dismiss`, `resolve`, and `reply_in_stream`.
3. `reply_in_stream` must carry channel + session provenance.

---

## 4) Spawn and lineage contract

```ts
type AgentInstanceSummary = {
  instanceAgentId: string;
  templateAgentId: string;
  sessionId: string;
  roleLabel: string; // PM, specialist, etc.
  spawnedAt: number;
  parentInstanceAgentId?: string;
  handoffReason?: string;
  active: boolean;
};
```

Validation rules:

1. Parent-child lineage must be acyclic.
2. Instance inherits template identity + boundary memory.
3. Session-level scope narrowing is allowed; widening is not.

---

## 5) Human-in-loop ingress policy

Decision:

1. Use **Agents UI** as the primary operational HITL surface.
2. Keep **AI chat UI** for configuration/testing and non-operational chat.
3. Human “jump in-stream” is session-scoped intervention, not global chat.

### Current channel capability snapshot (as of 2026-02-18)

| Channel | Customer ↔ agent messaging | Escalation takeover action | Human in-stream reply to customer from same provider |
|---|---|---|---|
| `telegram` | `yes` (`/telegram-webhook` -> `processInboundMessage`) | `yes` (inline callback `esc_takeover` / `esc_resume`, with `esc_dismiss` backward compatibility) | `yes` (`reply_in_stream` routes via `channels.router.sendMessage`) |
| `slack` | `yes` (events + slash commands -> `processInboundMessage`) | `yes` (slash quick action `hitl takeover <sessionId>` / `hitl resume <sessionId>`) | `yes` (`reply_in_stream` routes via `channels.router.sendMessage`) |
| `webchat` | `yes` (`/api/v1/webchat/message` -> `processInboundMessage`) | `yes` (`/api/v1/webchat/hitl` quick action endpoint) | `yes` (`reply_in_stream` routes via `channels.router.sendMessage`) |

Required implementation target:

1. `reply_in_stream` action must dispatch outbound through `channels.router.sendMessage` with session/channel provenance.
2. Channel parity required for Telegram, Slack, and Webchat before GA.

### HITL quick-action runbook (takeover + resume)

1. Telegram:
   - Take over: tap `Take Over` (`esc_takeover:<sessionId>`) in escalation notification.
   - Resume agent: tap `Resume Agent` (`esc_resume:<sessionId>`).
   - Backward compatibility: legacy `esc_dismiss` still maps to resume behavior.
2. Slack:
   - Use slash command format: `hitl takeover <sessionId>` to enter takeover mode.
   - Use slash command format: `hitl resume <sessionId>` to resume autonomous agent handling.
   - Quick actions execute outside inbound message ingestion and do not create customer message receipts.
3. Webchat:
   - Use widget quick-action controls (`Take over`, `Resume agent`) when escalation/takeover state is present.
   - Widget posts to `/api/v1/webchat/hitl` with current `sessionToken`.
   - Quick actions mutate lifecycle/escalation state directly and do not route through `processInboundMessage`.

---

## 6) Code anchors

1. Lifecycle transitions: `convex/ai/agentLifecycle.ts`
2. Escalation/takeover actions: `convex/ai/escalation.ts`
3. Session handoff and status: `convex/ai/agentSessions.ts`
4. Conversation API human injection: `convex/api/v1/conversations.ts`; `convex/api/v1/conversationsInternal.ts`
5. Provider ingress paths: `convex/http.ts`; `convex/channels/webhooks.ts`; `convex/api/v1/webchatApi.ts`
6. Operator surfaces: `src/components/window-content/agents/agent-trust-cockpit.tsx`; `src/components/window-content/agents/agent-sessions-viewer.tsx`

---

## 7) Verification contract

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run docs:guard`
