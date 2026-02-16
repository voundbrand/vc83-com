# Agent Architecture — Full Context Prompt

> Use this as a system prompt or paste into a new session to discuss the l4yercak3 agent platform architecture in detail.

---

## Platform Overview

l4yercak3 is a multi-tenant SaaS platform built on Convex (real-time backend) + Next.js. Each organization gets its own AI agent that handles customer interactions across Telegram, WhatsApp, SMS, email, and webchat. The platform uses a universal ontology (`objects` table) for flexible data storage with tenant isolation.

**Stack:** Convex (backend), Next.js (frontend), OpenRouter (LLM gateway), Telegram Bot API, Infobip (SMS), Meta Cloud API (WhatsApp), Resend (email), Stripe (billing)

---

## Agent Architecture

### Agent Hierarchy

```
Platform Org (l4yercak3)
  └─ Quinn (System Bot, subtype="system")
       ├─ Handles Telegram onboarding for new users
       ├─ Tools: complete_onboarding, verify_telegram_link (2 of 63)
       ├─ Runs guided interview → creates org + agent → hands off
       └─ Model: claude-sonnet-4.5, autonomous, unlimited credits

Per-Org Agents (bootstrapped after onboarding)
  └─ [Customer's Agent] (subtype="general"|"customer_support"|"sales_assistant"|"booking_agent")
       ├─ Tools: ALL 63 tools (enabledTools=[] means no filter)
       ├─ Soul: AI-generated personality from interview data
       ├─ Model: claude-sonnet-4.5 (default), configurable
       └─ Credits: daily + monthly + purchased, consumption-based
```

### Agent Config (stored in `objects.customProperties` where `type="org_agent"`)

```
Identity:        displayName, personality, language, additionalLanguages
Brand:           brandVoiceInstructions, systemPrompt, faqEntries[]
Knowledge:       knowledgeBaseTags[] (filters media library docs)
Tools:           enabledTools[], disabledTools[]
Autonomy:        autonomyLevel (supervised|autonomous|draft_only)
Guardrails:      maxMessagesPerDay, maxCostPerDay, requireApprovalFor[], blockedTopics[]
Model:           modelProvider (openrouter), modelId, temperature, maxTokens
Channels:        channelBindings[] (which channels this agent handles)
Soul:            name, tagline, traits[], communicationStyle, toneGuidelines,
                 coreValues[], neverDo[], alwaysDo[], escalationTriggers[],
                 greetingStyle, closingStyle, emojiUsage, soulMarkdown (SOUL.md)
Stats:           totalMessages, totalCostUsd
```

### Agent Status Lifecycle

```
draft → active → paused → archived
```

### Autonomy Levels

| Level | Behavior |
|-------|----------|
| `autonomous` | Acts freely within guardrails. `requireApprovalFor[]` can still block specific tools. |
| `supervised` | ALL tool calls require manual approval via `agentApprovals` queue. |
| `draft_only` | Read-only tools only (search, list, get). Never sends anything externally. |

---

## Message Processing Pipeline (13 Steps)

```
Inbound webhook (Telegram, WhatsApp, SMS, etc.)
  │
  ▼
HTTP Route (convex/http.ts)
  │ Parse provider-specific payload
  │ Resolve organization (via resolver or query param)
  ▼
processInboundMessage (convex/ai/agentExecution.ts) — THE CORE PIPELINE
  │
  ├─ 1.  Load agent config (agentOntology.getActiveAgentForOrg)
  ├─ 2.  Check rate limits (messages/day, cost/day)
  ├─ 3.  Resolve or create session (agentSessions.resolveSession)
  ├─ 4.  Auto-resolve CRM contact + link to session
  ├─ 4.5 Fetch org knowledge base docs (filtered by knowledgeBaseTags)
  ├─ 4.6 Check for guided interview mode (sessionMode="guided")
  ├─ 5.  Build system prompt (soul + personality + FAQs + brand voice + knowledge)
  ├─ 6.  Load conversation history (last 20 messages)
  ├─ 7.  Filter tools (enabledTools/disabledTools/draft_only logic)
  ├─ 7.5 Pre-flight credit check
  ├─ 8.  Call LLM via OpenRouter
  ├─ 9.  Execute tool calls (with approval checks for supervised mode)
  ├─ 10. Save user + assistant messages to session
  ├─ 11. Update session stats (tokens, cost) + deduct credits
  ├─ 12. Audit log (objectActions)
  └─ 13. Route response back through channel provider (auto-send)
         │
         ▼
      channels.router.sendMessage
         │ Resolve provider binding (per-org or platform fallback)
         │ Get credentials (objects table or oauthConnections)
         ▼
      provider.sendMessage (Telegram Bot API, Infobip, Meta, Resend, etc.)
```

### Tool Filtering Logic

```javascript
// If enabledTools is specified and non-empty → whitelist mode
if (config.enabledTools.length > 0) {
  schemas = schemas.filter(s => enabledTools.has(s.name)); // + query_org_data always
}

// If enabledTools is empty [] → ALL tools available

// disabledTools always excluded
// draft_only → only read-only tools
```

---

## Channel Architecture

### Provider Registry (convex/channels/registry.ts)

Registered providers: `chatwoot`, `manychat`, `whatsapp`, `infobip`, `telegram`

Each implements `ChannelProvider` interface:
- `normalizeInbound(rawPayload, credentials) → NormalizedInboundMessage | null`
- `sendMessage(credentials, message) → SendResult`
- `verifyWebhook(body, headers, credentials) → boolean`
- `testConnection(credentials) → { success, accountName?, error? }`

### Supported Channels (8)

`whatsapp`, `sms`, `email`, `instagram`, `facebook_messenger`, `webchat`, `telegram`, `pushover`

### Routing Logic (convex/channels/router.ts)

```
sendMessage(org, channel, recipient, content)
  ↓
1. Query channel_provider_binding (objects table) for org+channel
2. If binding exists → use its providerId
3. If no binding → platform fallbacks:
   - telegram + TELEGRAM_BOT_TOKEN env → "telegram"
   - sms + INFOBIP_* env vars → "infobip"
   - otherwise → error
4. Get provider credentials (objects table "{providerId}_settings" or oauthConnections for WhatsApp)
5. Call provider.sendMessage()
```

### Telegram Flow

```
User sends /start to @l4yercak3_bot
  ↓
Telegram API → POST /telegram-webhook (convex/http.ts)
  ↓
Parse update → extract chat_id, sender_name, /start param
  ↓
telegramResolver.resolveChatToOrg (convex/onboarding/telegramResolver.ts)
  ├─ /start link_{token} → Path B dashboard deep link → activate mapping → confirm
  ├─ /start {slug} → Sub-org deep link → create/update mapping → route to sub-org agent
  ├─ Existing mapping "active" → route to org's agent (grant daily credits)
  ├─ Existing mapping "onboarding" → route to System Bot (Quinn)
  └─ Unknown chat_id → create mapping "onboarding" → route to System Bot
  ↓
processInboundMessage(organizationId, "telegram", chatId, text)
  ↓
Agent pipeline → LLM → tool calls → response
  ↓
channels.router.sendMessage → telegramProvider.sendMessage → Telegram Bot API
```

---

## Session Model

### agentSessions Table

```
agentId             → objects (type="org_agent")
organizationId      → organizations
channel             → "telegram" | "whatsapp" | "sms" | "webchat" | ...
externalContactIdentifier → phone/email/chat_id
status              → "active" | "closed" | "handed_off"
crmContactId?       → objects (type="crm_contact")
sessionMode         → "freeform" | "guided"
interviewTemplateId? → objects (type="interview_template")
interviewState?     → { currentPhase, extractedData, isComplete, ... }
messageCount, tokensUsed, costUsd, startedAt, lastMessageAt
```

### telegramMappings Table

```
telegramChatId      → unique Telegram chat ID
organizationId      → which org this chat routes to
status              → "onboarding" | "active" | "churned"
senderName?         → display name
userId?             → linked platform user (Path A/B)
teamGroupChatId?    → linked team group for mirroring
teamGroupEnabled?   → mirror toggle
```

### Session Resolution

```
resolveSession(agentId, orgId, channel, identifier)
  → Query by_org_channel_contact index
  → If active session exists → reuse
  → If not → insert new session
```

---

## Credit System

### Tiers

```
creditBalances per org:
  dailyCredits        → reset on login/daily grant
  monthlyCredits      → from subscription tier (-1 = unlimited)
  purchasedCredits    → from credit packs (never expire during sub)
```

### Consumption Order

`daily → monthly → purchased`

### Per-Message Cost

Model-specific: Claude ~1-3 credits, tool execution adds more (search_media, send_email, etc.)

### Sub-Org Credit Sharing

Child orgs can fall back to `parentOrganizationId` credit pool when exhausted.

---

## Soul Evolution (Self-Improving Agents)

```
Agent observes patterns during conversations
  ↓
Creates soulProposal (type: add|modify|remove|add_faq)
  ↓
Notifies owner via Telegram inline buttons
  ↓
Owner approves/rejects
  ├─ Approve → apply changes to agent soul, bump version, save history
  └─ Reject → store feedback for learning
  ↓
proposalFeedback + soulVersionHistory for audit trail
```

### Conversation Metrics (agentConversationMetrics)

Tracked per session: message count, tool calls, failures, escalations, customer sentiment, unanswered questions, response time, self-assessment score.

---

## Tool Catalog (63 Tools)

| Category | Tools |
|----------|-------|
| **CRM** (8) | manage_crm, sync_contacts, send_bulk_crm_email, create_contact, search_contacts, update_contact, tag_contacts |
| **Events** (4) | create_event, list_events, update_event, register_attendee |
| **Products** (6) | create_product, list_products, set_product_price, set_product_form, activate_product, deactivate_product |
| **Forms** (5) | create_form, list_forms, publish_form, get_form_responses, manage_forms |
| **Payments** (3) | create_invoice, send_invoice, process_payment |
| **Support** (3) | create_ticket, update_ticket_status, list_tickets |
| **Workflows** (5) | create_workflow, enable_workflow, list_workflows, add_behavior_to_workflow, remove_behavior_from_workflow |
| **Content/Media** (7) | upload_media, search_media, create_template, send_email_from_template, create_page, publish_page, search_unsplash_images |
| **Sales** (3) | create_checkout_page, publish_checkout, publish_all |
| **Business Ops** (5) | manage_projects, manage_benefits, manage_bookings, manage_activity_protocol, manage_sequences |
| **Settings** (4) | update_organization_settings, configure_ai_models, manage_webinars, configure_booking_workflow |
| **Meta** (2) | request_feature, check_oauth_connection |
| **Certificates** (1) | generate_certificate |
| **Onboarding** (7) | complete_onboarding, verify_telegram_link, skip_phase, mark_phase_complete, request_clarification, get_interview_progress, get_extracted_data |

**Tool Execution Context:** Each tool receives `{ organizationId, userId, conversationId, sessionId, agentId, agentSessionId, channel, contactId, runQuery, runMutation, runAction, scheduler }`

---

## Onboarding Pipeline

```
New Telegram user → /start
  ↓
Quinn (System Bot) runs guided interview:
  1. Detect language
  2. "Do you already have an account?"
     ├─ YES → Path A email verification (verify_telegram_link tool)
     └─ NO → Continue onboarding
  3. Business name
  4. Industry
  5. Target audience
  6. Agent purpose (support/sales/booking/general)
  7. Tone preference
  8. Confirm → complete_onboarding tool
  ↓
completeOnboarding action:
  1. Extract interview data from session
  2. Guard: skip if already linked via email verification
  3. Create minimal org (name, slug, free plan)
  4. Seed daily credits
  5. bootstrapAgent → create agent + generate soul via LLM + activate
  6. Switch telegramMapping: onboarding → active (routes to new agent)
  7. New agent introduces itself via Telegram
  8. Create session + store intro message
  ↓
Next user message → their own agent (full 63-tool access)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `convex/ai/agentExecution.ts` | Core 13-step pipeline |
| `convex/ai/tools/registry.ts` | 63-tool catalog with schemas |
| `convex/agentOntology.ts` | Agent CRUD + config schema |
| `convex/channels/router.ts` | Outbound message routing |
| `convex/channels/registry.ts` | Provider registration |
| `convex/channels/providers/telegramProvider.ts` | Telegram Bot API integration |
| `convex/channels/types.ts` | Channel/provider type definitions |
| `convex/onboarding/telegramResolver.ts` | Chat → org resolution (deep links, onboarding) |
| `convex/onboarding/completeOnboarding.ts` | Post-interview org+agent creation |
| `convex/onboarding/seedPlatformAgents.ts` | Quinn System Bot seed |
| `convex/ai/soulGenerator.ts` | AI-generated agent personalities |
| `convex/ai/soulEvolution.ts` | Self-improvement proposal system |
| `convex/http.ts` | All HTTP webhook routes |

---

## Known Gaps / TODOs

1. **Knowledge base integration** — `getKnowledgeBaseDocsInternal` referenced but marked TODO in agentExecution
2. **Agency tools** — `agencyTools.ts` exists for sub-org management (spawn sub-org, deploy bot, test agent) but integration with bootstrapping is partial
3. **Team tools** — Multi-agent sessions (`participatingAgentIds`) exist in schema but tag-in workflow unclear
4. **Webchat provider** — Channel type exists but no dedicated provider in registry
5. **Instagram/Facebook Messenger** — Channel types defined, no providers implemented
6. **Interview → Content DNA** — Extraction fields defined but `contentDNAId` saving unclear
7. **Soul evolution reflection** — Metrics collection exists but auto-trigger for reflection proposals unclear

---

## Discussion Topics

- How should tool access differ between agent subtypes (support vs sales vs booking)?
- Should Quinn gain more tools for platform-level help during onboarding?
- How should the approval queue work for supervised agents across channels?
- What's the right credit cost model per tool category?
- How should soul evolution proposals be prioritized and batched?
- Multi-agent coordination: when should agents tag each other in?
- Channel-specific formatting: how should agents adapt responses per channel?
- Knowledge base: how should documents flow into agent context?
