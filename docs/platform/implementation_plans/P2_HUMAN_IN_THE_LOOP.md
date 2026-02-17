# P2: Human-in-the-Loop Escalation Framework

> Priority: MEDIUM | Estimated complexity: Medium | Files touched: 4-5
> Prerequisites: P2 (team harness), P0 (error harness)

---

## Problem Statement

Human-in-the-loop is limited to the approval queue for supervised mode tool calls. No visibility into agent reasoning. No auto-escalation when agents are uncertain, stuck, or dealing with upset customers. No way for humans to seamlessly take over and resume agents.

---

## Deliverables

1. **Auto-escalation trigger system** — configurable triggers per agent
2. **Escalation notification pipeline** — Telegram push, team group, email
3. **Human takeover mode** — route messages to human, bypass agent
4. **Human resume mode** — agent resumes with human's resolution context
5. **Escalation queue dashboard** — UI for viewing/managing escalations
6. **Escalation metrics** — track reasons, response times, resolution rates

---

## Escalation Triggers

### Configurable Per Agent

```typescript
escalationPolicy: {
  triggers: {
    // Customer explicitly asks for human
    explicitRequest: {
      enabled: true,
      urgency: "normal",
      patterns: [
        "talk to a human", "speak with someone",
        "real person", "customer service", "connect me",
      ],
    },

    // Customer sentiment drops
    negativeSentiment: {
      enabled: true,
      urgency: "high",
      threshold: -0.5,         // sentiment score
      windowMessages: 3,       // over last N messages
    },

    // Agent stuck in loop
    responseLoop: {
      enabled: true,
      urgency: "normal",
      similarityThreshold: 0.8,
      consecutiveCount: 2,
    },

    // Topic matches blockedTopics
    blockedTopic: {
      enabled: true,
      urgency: "normal",
      // Uses agent.blockedTopics config
    },

    // Agent uncertain
    uncertainty: {
      enabled: true,
      urgency: "low",
      phrases: ["I'm not sure", "I don't have that information", "I can't help with"],
      maxOccurrences: 3,        // per session
    },

    // Tool failures
    toolFailures: {
      enabled: true,
      urgency: "normal",
      threshold: 3,             // failures per session
    },
  },

  // Notification routing
  recipients: [
    { role: "owner", channels: ["telegram", "email"] },
    { role: "support", channels: ["telegram"] },
  ],

  // Timeouts
  initialResponseTimeout: "5m",     // re-escalate if no human responds
  maxWaitTime: "30m",               // auto-close escalation after this
  autoResumeOnTimeout: true,        // resume agent if no human responds

  // Agent behavior during escalation
  holdMessage: "Let me connect you with my team. They'll be right with you.",
  resumeMessage: "I'm back! My team took care of that. How else can I help?",
}
```

### Detection Flow (in agentExecution.ts)

```typescript
// Before step 8 (LLM call)
async function checkAutoEscalation(message, session, agentConfig) {
  const policy = agentConfig.escalationPolicy;
  if (!policy) return null;

  const triggers = policy.triggers;

  // Explicit request (cheapest check first)
  if (triggers.explicitRequest?.enabled) {
    const matches = triggers.explicitRequest.patterns.some(p =>
      message.toLowerCase().includes(p.toLowerCase())
    );
    if (matches) return { reason: "Customer requested human contact", urgency: triggers.explicitRequest.urgency };
  }

  // Blocked topic
  if (triggers.blockedTopic?.enabled && agentConfig.blockedTopics?.length > 0) {
    const matched = agentConfig.blockedTopics.find(topic =>
      message.toLowerCase().includes(topic.toLowerCase())
    );
    if (matched) return { reason: `Restricted topic: ${matched}`, urgency: triggers.blockedTopic.urgency };
  }

  // Response loop (check after LLM response)
  // Uncertainty (check after LLM response)
  // Tool failures (check after tool execution)
  // Sentiment (check after LLM response)

  return null;
}
```

---

## Notification Pipeline

```
Escalation triggered
  │
  ├─ Telegram push to owner:
  │  "🆘 {urgency} escalation from {agentName}
  │   Customer: {contactName} ({channel})
  │   Reason: {reason}
  │   Context: {summary}
  │   [Take Over] [Assign] [Dismiss]"
  │
  ├─ Team group (if configured):
  │  Full escalation + last 5 messages
  │
  └─ Email (if HIGH urgency and no response in 5 min):
     Full escalation details with one-click takeover link
```

---

## Human Takeover/Resume

See [TEAM_COORDINATION.md](../TEAM_COORDINATION.md#human-escalation) for full takeover and resume protocol.

---

## Metrics

| Metric | Description |
|--------|-------------|
| `escalation_count_by_reason` | Which triggers fire most often |
| `escalation_response_time` | How fast humans respond |
| `escalation_resolution_rate` | % of escalations resolved by human |
| `auto_resume_rate` | % of escalations where agent auto-resumes (timeout) |
| `false_positive_rate` | Escalations dismissed without action |

---

## Success Criteria

- [ ] Auto-escalation triggers detect customer distress, explicit requests, loops, and blocked topics
- [ ] Owner receives Telegram notification with inline action buttons
- [ ] Human can take over conversation via team group or dashboard
- [ ] Agent resumes with context from human's resolution
- [ ] Escalation metrics tracked for policy tuning
- [ ] Configurable per agent — different agents can have different escalation policies
