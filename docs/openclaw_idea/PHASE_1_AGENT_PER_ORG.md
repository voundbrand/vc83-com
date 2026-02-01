# Phase 1: Agent-Per-Org Architecture

> Every organization on the platform gets an AI agent that represents them — to their customers, to their data, and eventually to other agents.

## Vision

The GoHighLevel model gives businesses tools they operate manually. We give businesses **an agent that operates the tools for them**. Each org's agent:

- Answers customer questions using the org's actual data (CRM, bookings, products)
- Manages outbound comms (email sequences, SMS reminders, social posts)
- Handles inbound messages across channels (WhatsApp, email, social DMs)
- Acts autonomously within guardrails set by the business owner
- Eventually interacts with other businesses' agents (the Moltbook pattern)

---

## What Already Exists

### AI Chat System (ready to extend)
- `convex/ai/chat.ts` — Multi-turn conversational AI using OpenRouter
- `convex/ai/conversations.ts` — Per-org, per-user conversation management with slugs
- `convex/ai/tools/registry.ts` — 12+ tools already registered:
  - `crm_tool` — Create/read/update contacts, organizations
  - `booking_tool` — Book resources, check availability
  - `sequences_tool` — Create email/SMS sequences
  - `bulk_crm_email_tool` — Send emails to CRM segments
  - `workflow_tool` — Trigger automated workflows
  - `webinar_tool` — Manage webinars, registrations
  - `contact_sync_tool` — Sync contacts from Gmail/Outlook
  - `activity_protocol_tool` — Trace data flow
  - `projects_tool` — Query builder projects
  - `forms_tool` — Create forms, view submissions
- `convex/ai/openrouter.ts` — Multi-LLM support (Claude, GPT-4o, etc.)
- `convex/ai/billing.ts` — Cost tracking per model/session (exists but not enforced)

### Data Model (already tenant-isolated)
- `convex/schemas/ontologySchemas.ts` — Universal objects table with `organizationId`
- Every query already scoped by `organizationId` — true multi-tenant isolation
- CRM contacts, bookings, products, forms, workflows all in ontology

### Agent-First Architecture (already planned)
- `docs/AGENT_FIRST_ARCHITECTURE.md` — Covers agent identity, auth, MCP patterns
- `docs/MCP_SERVER_ARCHITECTURE.md` — MCP tool registry for external agent consumption
- `docs/API_AND_AI_TOOL_REGISTRATION.md` — How to register new AI tools

---

## What to Build

### 1. Agent Configuration Object

Each org gets an agent config stored in the ontology:

```typescript
// Object type: "org_agent"
{
  type: "org_agent",
  subtype: "primary",  // future: "sales", "support", "social"
  organizationId: Id<"organizations">,
  name: "Sailing School Assistant",
  status: "active" | "paused" | "draft",

  customProperties: {
    // Personality & Voice
    displayName: "Haff Assistant",
    personality: "friendly, professional, nautical terminology",
    language: "de",  // primary language
    additionalLanguages: ["en"],
    brandVoiceInstructions: "Always sign off with 'Mast- und Schotbruch!'",

    // Knowledge Base
    systemPrompt: "You are the AI assistant for Segelschule am Stettiner Haff...",
    knowledgeDocIds: [Id<"objects">],  // linked docs the agent can reference
    faqEntries: [
      { q: "Wo finde ich euch?", a: "Am Stettiner Haff, Adresse..." },
      { q: "Was kostet der SBF Binnen?", a: "..." },
    ],

    // Tool Access (which AI tools this agent can use)
    enabledTools: [
      "crm_tool",
      "booking_tool",
      "sequences_tool",
      "data_query_tool",  // NEW - Phase 1 deliverable
    ],
    disabledTools: ["bulk_crm_email_tool"],  // restrict dangerous tools

    // Autonomy Level
    autonomyLevel: "supervised" | "autonomous" | "draft_only",
    // supervised: agent drafts, human approves
    // autonomous: agent acts immediately within guardrails
    // draft_only: agent only creates drafts, never sends

    // Guardrails
    maxMessagesPerDay: 100,
    maxCostPerDay: 5.00,  // USD
    requireApprovalFor: ["bulk_email", "delete_contact", "financial"],
    blockedTopics: ["competitor pricing", "legal advice"],

    // Model Configuration
    modelProvider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    temperature: 0.7,
    maxTokens: 4096,

    // Channel Bindings (which channels this agent serves)
    channelBindings: [
      { channel: "whatsapp", enabled: true },
      { channel: "email", enabled: true },
      { channel: "webchat", enabled: true },
      { channel: "instagram_dm", enabled: false },
    ],
  }
}
```

### 2. Data Query Tool (highest leverage new tool)

A new AI tool that lets agents query any data in their org's ontology via natural language:

```typescript
// convex/ai/tools/dataQueryTool.ts

export const data_query_tool = {
  name: "data_query_tool",
  description: "Query your organization's data across all domains",
  parameters: {
    objectType: "crm_contact | booking | product | form_submission | transaction | invoice | ...",
    filters: [
      { field: "status", op: "eq", value: "active" },
      { field: "customProperties.country", op: "eq", value: "DE" },
      { field: "createdAt", op: "gt", value: "2025-01-01" },
    ],
    // Optional joins via objectLinks
    includeRelated: ["transactions", "bookings"],
    // Aggregations
    aggregate: { type: "count" | "sum" | "avg", field: "customProperties.totalSpent" },
    // Pagination
    limit: 50,
    offset: 0,
  },
  handler: async (ctx, args) => {
    // CRITICAL: Always scope by organizationId from the agent's context
    // Never allow cross-org queries
    const results = await ctx.db
      .query("objects")
      .withIndex("by_org_type_status", q =>
        q.eq("organizationId", agentContext.organizationId)
          .eq("type", args.objectType)
      )
      .filter(/* apply args.filters */)
      .take(args.limit);

    return formatResultsForAgent(results);
  }
};
```

**Why this is the highest leverage piece:** With this single tool, an org's agent can answer:
- "How many leads did we get this week?"
- "Show me all customers who haven't booked in 6 months"
- "What's our revenue from sailing courses this year?"
- "List all bookings for next week"

And it works with the ENTIRE ontology — every object type the org has.

### 3. Agent Session Management

Extend the existing AI conversation system for agent-specific sessions:

```typescript
// Agent sessions are keyed differently from user chat sessions
// User chat: user asks AI for help within the platform
// Agent session: customer/external system talks to the org's agent

interface AgentSession {
  agentId: Id<"objects">;          // org_agent reference
  organizationId: Id<"organizations">;
  channel: "whatsapp" | "email" | "webchat" | "sms" | "instagram_dm";
  externalContactId?: string;      // e.g., WhatsApp phone number
  crmContactId?: Id<"objects">;    // linked CRM contact (auto-resolved)
  status: "active" | "closed" | "handed_off";
  handedOffTo?: Id<"users">;       // if human took over
  metadata: {
    lastMessageAt: number;
    messageCount: number;
    tokensUsed: number;
    costUsd: number;
  };
}
```

### 4. Agent Execution Pipeline

```
Inbound Message (any channel)
  │
  ├─► Identify Org (from channel binding / phone number / email)
  ├─► Load Agent Config (org_agent object)
  ├─► Resolve CRM Contact (match by phone/email, or create new)
  ├─► Load/Create Agent Session
  ├─► Build Context:
  │     ├─ Agent system prompt + personality
  │     ├─ Conversation history (last N messages)
  │     ├─ Contact context (name, history, bookings)
  │     └─ Available tools (from agent config)
  ├─► Call LLM (via OpenRouter, model from agent config)
  ├─► Process Response:
  │     ├─ If tool call → execute tool → feed result back to LLM
  │     ├─ If needs approval → queue for human review
  │     └─ If text response → deliver via channel
  ├─► Log Everything:
  │     ├─ Message in session transcript
  │     ├─ Tool executions in audit log
  │     ├─ Cost tracking
  │     └─ Activity protocol event
  └─► Send Response (via channel connector - Phase 2)
```

### 5. Human-in-the-Loop Controls

```
┌─────────────────────────────────────────────────────────┐
│  Agent Dashboard (per-org)                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  Active Sessions │  │  Pending Approvals            │  │
│  │                  │  │                                │  │
│  │  🟢 Max M.      │  │  ⚠️ Agent wants to send      │  │
│  │  WhatsApp       │  │    bulk email to 50 contacts  │  │
│  │  "Wann ist..."  │  │    [Approve] [Reject] [Edit]  │  │
│  │                  │  │                                │  │
│  │  🟢 Lisa K.     │  │  ⚠️ Agent wants to create    │  │
│  │  Email          │  │    booking for €450            │  │
│  │  "Booking..."   │  │    [Approve] [Reject]          │  │
│  └──────────────────┘  └──────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Agent Activity Log                                   │ │
│  │                                                       │ │
│  │  14:32 — Answered Max's question about pricing       │ │
│  │  14:28 — Queried 3 bookings for next week            │ │
│  │  14:15 — Created CRM contact for new WhatsApp user   │ │
│  │  13:50 — Sent booking reminder to 5 customers        │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Security Model

### Tenant Isolation (already built into ontology)
- All queries scoped by `organizationId` — agents can NEVER access another org's data
- Agent config itself is an ontology object — same isolation model
- Tool executions validated against agent's `enabledTools` list

### Credential Isolation
- Each org's API keys stored encrypted in `oauthConnections` (existing pattern)
- Agent uses org's credentials for channel delivery (not platform-level keys)
- See `docs/plans/multichannel-automation/CONNECTIONS.md` for credential flow

### Audit Trail
- Every tool call logged in `aiToolExecutions` table (existing)
- Every message logged in agent session transcript
- Activity protocol events for compliance
- Cost tracking per agent per org

### Rate Limiting & Cost Controls
- `maxMessagesPerDay` per agent
- `maxCostPerDay` per agent (USD spend cap)
- Per-org rate limits on API calls
- Model-level token limits

---

## Implementation Priority

### Step 1: Agent Config Object
- Add `org_agent` type to ontology
- Create CRUD mutations (create, update, get, list)
- Add to admin UI (settings page for org's agent)

### Step 2: Data Query Tool
- Implement `data_query_tool` in `convex/ai/tools/`
- Register in tool registry
- Test with existing AI chat (user-facing first)

### Step 3: Agent Execution Pipeline
- Extend `convex/ai/chat.ts` to support agent-mode sessions
- Build context assembly (system prompt + contact + tools)
- Add tool execution with guardrails

### Step 4: Agent Session Management
- New session type for agent conversations
- Contact resolution (phone/email → CRM contact)
- Session persistence and history

### Step 5: Human-in-the-Loop UI
- Approval queue component
- Live session monitoring
- Activity log view
- Takeover/handoff controls

---

## Dependencies

- **Phase 2 (Channel Connectors)** needed for inbound message routing
- **Existing AI chat** provides the foundation
- **Existing ontology** provides tenant-isolated data access
- **Existing tool registry** provides extensible tool framework

---

## OpenClaw Reference Patterns

From the cloned OpenClaw repo at `/Users/foundbrand_001/Development/openclaw/`:

| Pattern | OpenClaw Location | How We Adapt |
|---------|------------------|-------------|
| Agent config | `src/config/agents.ts` | Our `org_agent` ontology object |
| Tool policy (allow/deny) | `src/agents/tool-policy.ts` | `enabledTools` / `disabledTools` |
| Session isolation | `src/gateway/session-utils.ts` | Agent sessions keyed by org + channel + contact |
| Skill system | `skills/*/SKILL.md` | Future: org-specific custom tools |
| Exec approval | `src/gateway/server-methods/exec-approval.ts` | Human-in-the-loop approval queue |

---

## Success Metrics

- Agent can answer data questions about org's CRM, bookings, products
- Agent respects tool access controls and guardrails
- Human can monitor agent activity and take over conversations
- Cost tracking accurate per org per agent
- No cross-tenant data leaks (security audit pass)
