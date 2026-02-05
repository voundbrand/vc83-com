# 01 — What We Have

> Complete inventory of every production-ready system. No fluff — just what exists, where it lives, and what it can do today.

---

## 1. Agent Execution Platform

**Status: PRODUCTION-READY**

### Agent CRUD — `convex/agentOntology.ts` (454 lines)
- Create, update, activate, pause, delete agents
- Per-org isolation via universal ontology (`objects` table, type=`org_agent`)
- 4 subtypes: `customer_support`, `sales_assistant`, `booking_agent`, `general`
- Status workflow: `draft` → `active` → `paused` → `archived`
- Config fields: displayName, personality, language, brandVoiceInstructions, systemPrompt, faqEntries, enabledTools, disabledTools, autonomyLevel, maxMessagesPerDay, maxCostPerDay, requireApprovalFor, blockedTopics, modelProvider, modelId, temperature, maxTokens, channelBindings

### Execution Pipeline — `convex/ai/agentExecution.ts` (459 lines)
13-step pipeline via `processInboundMessage`:
1. Load agent config
2. Check rate limits
3. Resolve/create session
4. Auto-resolve CRM contact (phone → WhatsApp, email → email)
5. Build system prompt (identity + personality + language + brand voice + FAQ + guardrails)
6. Load conversation history (last 20 messages)
7. Filter tools based on agent config + autonomy level
8. Pre-flight credit check
9. Call LLM via OpenRouter (Claude Sonnet 4, GPT-4o, GPT-4o Mini, Gemini Pro 1.5)
10. Execute tool calls with autonomy enforcement
11. Save messages to session
12. Deduct credits (LLM cost + tool costs)
13. Route response back through channel provider

### Session Management — `convex/ai/agentSessions.ts` (329 lines)
- resolveSession (find or create by org + channel + external ID)
- CRM contact auto-matching (phone/email)
- Message history per session (role, content, toolCalls, timestamp)
- Stats tracking (messageCount, tokensUsed, costUsd)
- Session lifecycle: `active` → `closed` / `handed_off`
- Rate limit enforcement (daily messages + daily cost)

### Human-in-the-Loop — `convex/ai/agentApprovals.ts` (418 lines)
- Approval requests for tool execution (supervised mode)
- Approve → schedules async execution
- Reject with optional reason
- 24-hour expiry on pending approvals (cron job)
- Post-execution: update approval record, add system message to session

### Agent Config UI — `src/components/window-content/agent-configuration-window.tsx` (959 lines)
4 tabs:
- **Agents list**: status indicators, play/pause, edit, delete
- **Create/Edit**: multi-section form (Identity → Knowledge → Model → Guardrails → Channels)
- **Activity**: active sessions with message counts, token usage, costs
- **Approvals**: pending approval queue with approve/reject

---

## 2. 50+ Agent Tools

**Status: PRODUCTION-READY**

Available via tool registry. Categories:
- **CRM**: create/search/update contacts, companies, pipeline deals
- **Booking**: check availability, create/cancel bookings, list upcoming
- **Invoicing**: create invoices, send payment reminders
- **Products**: list products, check inventory, get pricing
- **Forms**: get form responses, create form submissions
- **Payments**: create checkout sessions, check payment status
- **Workflows**: trigger automation workflows
- **Sequences**: add contact to email sequence, check sequence status
- **Media**: search media library, get document content
- **Email**: send emails, send AI-generated emails
- **Events**: create/manage events, registrations
- **Data**: natural language query across org data

Tools respect autonomy levels:
- `supervised`: all tools require approval
- `autonomous`: execute freely, check `requireApprovalFor` list
- `draft_only`: read-only tools only (query, search, list, get)

---

## 3. Multichannel Routing

**Status: PRODUCTION-READY (3 providers)**

### Channel Abstraction — `convex/channels/`
- **types.ts**: 8 channel types (whatsapp, sms, email, instagram, facebook_messenger, webchat, telegram, pushover)
- **registry.ts**: Provider registration and lookup
- **router.ts**: Message routing — find provider for org+channel, load credentials, send message
- **webhooks.ts**: Inbound webhook processing → normalize → agent pipeline → response

### Providers
| Provider | Channels | File | Status |
|----------|----------|------|--------|
| Chatwoot | WhatsApp, SMS, Instagram, FB, webchat | `providers/chatwoot.ts` | Complete |
| ManyChat | SMS, WhatsApp | `providers/manychatAdapter.ts` | Complete |
| WhatsApp Direct | WhatsApp (Meta Cloud API) | `providers/whatsappProvider.ts` | Complete |

### Data Flow
```
Provider Webhook → HTTP route → Schedule async processor
→ Normalize message → processInboundMessage (agent pipeline)
→ Agent response → channels.router.sendMessage → Provider API
```

---

## 4. Credit System

**Status: PRODUCTION-READY, NOT WIRED TO AGENTS**

### Core — `convex/credits/index.ts` (652 lines)
- `getCreditBalance`: 3-tier balance (daily + monthly + purchased)
- `deductCredits`: Check balance, deduct, record transaction
- `grantDailyCredits`: Login bonus (once per calendar day)
- `grantMonthlyCredits`: Billing cycle allocation
- `addPurchasedCredits`: From credit pack purchase
- `checkCreditsInternalQuery`: Pre-flight check with shortfall calculation

### Credit Costs
| Action | Credits |
|--------|---------|
| Agent message (simple model) | 1 |
| Agent message (complex model) | 3 |
| Tool: create_contact | 1 |
| Tool: send_email | 1 |
| Tool: send_ai_email | 2 |
| Tool: trigger_workflow | 1 |
| Tool: create_checkout | 1 |
| Tool: query_org_data | 0 (free) |
| Tool: search_contacts | 0 (free) |
| Builder generation | 0 (BYOK) |

### Consumption Order
Daily → Monthly → Purchased (3-tier fallback, hard wall at zero)

### Schemas — `convex/schemas/creditSchemas.ts` (151 lines)
Tables: `creditBalances`, `creditTransactions`, `creditPurchases`

---

## 5. Stripe Billing

**Status: PRODUCTION-READY**

- `convex/stripe/platformCheckout.ts`: Tier subscriptions + credit packs
- `convex/stripe/stripePrices.ts`: Price ID management
- `convex/stripe/platformWebhooks.ts`: subscription.created/updated/deleted, invoice.succeeded/failed
- `convex/stripe/aiWebhooks.ts`: Routes events to platform handler

### Configured Products
- Pro: 29 EUR/mo (290 EUR/yr)
- Agency: 299 EUR/mo (2,990 EUR/yr)
- Credit packs: 100 (19 EUR), 500 (79 EUR), 2,000 (249 EUR), 10,000 (999 EUR)
- Sub-org add-on: 79 EUR/mo (metered)

---

## 6. Builder (v0 Pipeline)

**Status: PRODUCTION-READY**

### Backend — `convex/integrations/v0.ts` (1,079 lines)
- Create v0 chats, send messages, poll for completion
- Async mode with 2-minute max polling
- Store chat references in objects table
- Create aiConversations for history

### Builder App Ontology — `convex/builderAppOntology.ts` (1,450+ lines)
- Full CRUD for builder apps
- Link to v0 chat, conversation, SDK connections
- Deployment config (Vercel), environment variables
- Publish config wizard

### Frontend
- `builder-chat-panel.tsx` (2,269 lines): Chat UI with tabs (chat, design, files, vars, rules, settings)
- `publish-config-wizard.tsx` (951 lines): Deploy flow
- `v0-connection-panel.tsx` (832 lines): v0 API key setup
- File explorer, preview panel, connection panel

### Pipeline
```
User prompt → v0 API → Generated files → Preview (iframe)
→ Connect mode (link ontology types) → Scaffold generator
→ GitHub atomic commit → Vercel deploy → Self-heal if errors
```

---

## 7. Rate Limiting — `convex/middleware/rateLimit.ts` (315 lines)

Token bucket algorithm with plan-based limits:
| Plan | Req/min | Burst | Daily |
|------|---------|-------|-------|
| Free | 30 | 60 | 1,000 |
| Pro | 60 | 120 | 5,000 |
| Agency | 300 | 600 | 100,000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

---

## 8. HTTP API — `convex/http.ts` (2,900+ lines)

Webhook endpoints:
- `POST /stripe-webhooks` — Main Stripe
- `POST /stripe-ai-webhooks` — AI subscription events
- `POST /stripe-connect-webhooks` — Stripe Connect
- Channel webhooks for Chatwoot, WhatsApp, ManyChat

---

## 9. System Knowledge Base (NEW)

**Status: JUST BUILT**

Location: `convex/ai/systemKnowledge/`

15 markdown files + TypeScript registry providing the agent with marketing, sales, and strategy frameworks. See [03-SYSTEM-KNOWLEDGE.md](03-SYSTEM-KNOWLEDGE.md) for full documentation.

---

## Summary: What's Complete

| System | Files | Status | Connected? |
|--------|-------|--------|------------|
| Agent CRUD | agentOntology.ts | Production | Yes |
| Agent Pipeline | agentExecution.ts | Production | Yes |
| Agent Sessions | agentSessions.ts | Production | Yes |
| Agent Approvals | agentApprovals.ts | Production | Yes |
| Agent UI | agent-configuration-window.tsx | Production | Yes |
| 50+ Tools | ai/tools/* | Production | Yes |
| Channel Routing | channels/* | Production | Yes |
| Credit System | credits/index.ts | Production | **NO — not wired to agent pipeline** |
| Stripe Billing | stripe/* | Production | Yes (to credits) |
| Builder Pipeline | integrations/v0.ts | Production | Yes |
| Builder UI | builder/* components | Production | Yes |
| Rate Limiting | middleware/rateLimit.ts | Production | Yes |
| System Knowledge | ai/systemKnowledge/* | Complete | **NO — not wired to agent pipeline** |
