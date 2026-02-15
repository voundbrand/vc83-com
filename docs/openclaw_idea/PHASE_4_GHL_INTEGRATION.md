# Phase 4: GoHighLevel Native Integration — Full Two-Way Sync

> Replace GoHighLevel's manual workflows with AI agents that operate GHL for the business.

## The Play

GoHighLevel gives businesses CRM, conversations, calendars, pipelines, and automations — but they still run them manually. Our Phase 1–3 agent system already talks to customers, queries data, and creates content. Phase 4 **plugs our agents directly into GHL** so they can:

1. **Sync contacts bidirectionally** — GHL contacts appear in our CRM ontology, and vice versa
2. **Route conversations through GHL** — SMS, email, and WhatsApp via GHL as a channel provider
3. **Manage pipelines and opportunities** — Agent updates deal stages, monetary values, and statuses in GHL
4. **Book and manage appointments** — Agent schedules, reschedules, and cancels via GHL Calendar API
5. **React to GHL events in real-time** — Webhooks trigger agent actions on contacts, conversations, opportunities, and appointments

This turns GHL from "a tool businesses operate" into "a tool the agent operates."

## Depends On

- Phase 1 (Agent-Per-Org) — agent config, execution pipeline, data tools
- Phase 2 (Channel Connectors) — channel provider interface, routing, webhook processing
- Phase 2.9 Step 3 (Provider Abstraction) — generic patterns for adding new providers
- Existing OAuth infrastructure (`convex/oauth/`)

## GHL API Overview

| Aspect | Detail |
|--------|--------|
| **Auth** | OAuth 2.0 Authorization Code Grant (V1 API keys are EOL) |
| **Token endpoint** | `https://services.leadconnectorhq.com/oauth/token` |
| **Access token TTL** | ~24 hours (86,399s) |
| **Refresh token** | Single-use, valid up to 1 year, yields new refresh token on exchange |
| **Token levels** | Agency-level (company ops) + Location-level (sub-account ops) |
| **Rate limits** | 100 req/10s burst, 200k/day per app per resource |
| **Official SDK** | `@gohighlevel/api-client` (Node.js/TypeScript, 30+ modules) |
| **Webhooks** | 50+ event types, NOT retried on 5xx (only on 429) |
| **Marketplace** | Register at marketplace.gohighlevel.com |

## Steps

| Step | Doc | What | Effort | Impact |
|------|-----|------|--------|--------|
| 1 | **[OAuth Foundation + App Setup](./PHASE_4_STEP1_GHL_OAUTH_FOUNDATION.md)** | GHL Marketplace app, OAuth 2.0 flow, token management, connection UI | Medium | Unblocks everything else |
| 2 | **[CRM Contact Sync](./PHASE_4_STEP2_GHL_CONTACT_SYNC.md)** | Bidirectional contact sync with conflict resolution | Medium | Core CRM value |
| 3 | **[Conversations & Messaging](./PHASE_4_STEP3_GHL_CONVERSATIONS.md)** | GHL as a ChannelProvider, inbound/outbound messaging | Medium | Agent talks via GHL channels |
| 4 | **[Opportunities & Pipelines](./PHASE_4_STEP4_GHL_OPPORTUNITIES.md)** | Pipeline/deal sync, stage tracking, monetary values | Medium | Sales automation |
| 5 | **[Calendar & Appointments](./PHASE_4_STEP5_GHL_CALENDAR.md)** | Appointment sync, agent booking/rescheduling | Small | Scheduling automation |
| 6 | **[Agent Tools + Automation](./PHASE_4_STEP6_GHL_AGENT_TOOLS.md)** | Agent tools for all GHL ops, workflow triggers, full agent awareness | Medium | The "aha" — agent runs GHL |

## Build Order

```
Step 1: OAuth Foundation (~2 sessions)
    │   GHL Marketplace app registration
    │   OAuth 2.0 flow + token refresh cron
    │   Credential storage + encryption
    │   Settings UI for connection management
    │
Step 2: CRM Contact Sync (~3 sessions)
    │   Initial pull (GHL → ontology)
    │   Push (ontology → GHL)
    │   Webhook listeners (real-time sync)
    │   Conflict resolution + field mapping
    │
Step 3: Conversations & Messaging (~2 sessions)
    │   Implement ChannelProvider interface
    │   Webhook processing for inbound
    │   Outbound via GHL Conversations API
    │   Register in channel registry
    │
Step 4: Opportunities & Pipelines (~2 sessions)
    │   Pipeline/stage mapping
    │   Bidirectional opportunity sync
    │   Webhook listeners for deal events
    │
Step 5: Calendar & Appointments (~1.5 sessions)
    │   Appointment CRUD via GHL API
    │   Webhook listeners for booking events
    │   Agent scheduling awareness
    │
Step 6: Agent Tools + Automation (~2 sessions)
        GHL-specific agent tools
        Workflow trigger integration
        Full data awareness in agent context
```

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Auth method** | OAuth 2.0 (not API keys) | V1 API keys are EOL; OAuth is the only supported path |
| **SDK usage** | Official `@gohighlevel/api-client` | Built-in token refresh, typed interfaces, maintained by GHL |
| **Token storage** | `oauthConnections` table (encrypted) | Matches existing pattern (GitHub, WhatsApp, Google) |
| **Sync strategy** | Event-driven (webhooks) + periodic reconciliation | Real-time for most ops; scheduled sync catches missed webhooks |
| **Channel provider** | Implement `ChannelProvider` interface | Plugs into existing routing, registry, and binding system |
| **Contact mapping** | GHL contact ID stored in ontology `customProperties` | Preserves both systems' identifiers for bidirectional lookups |
| **Token level** | Location-level tokens per org | Each org connects their own GHL sub-account |

## What Already Exists (don't rebuild)

| Component | Status | Location |
|-----------|--------|----------|
| OAuth infrastructure (apps, tokens, encryption) | Done | `convex/oauth/` |
| Channel provider interface + registry | Done | `convex/channels/types.ts`, `registry.ts` |
| Channel routing + credential resolution | Done | `convex/channels/router.ts` |
| Webhook HTTP endpoint pattern | Done | `convex/http.ts` |
| CRM ontology (contacts, orgs, pipelines) | Done | `convex/crmOntology.ts` |
| Agent tool registry (30+ tools) | Done | `convex/ai/tools/registry.ts` |
| Connection panel UI pattern | Done | `src/components/builder/connection-panel.tsx` |
| Verified integrations registry | Done | `convex/oauth/verifiedIntegrations.ts` |

## GHL Webhook Events We'll Use

| Category | Events | Step |
|----------|--------|------|
| **Contacts** | ContactCreate, ContactUpdate, ContactDelete, ContactTagUpdate, ContactDndUpdate | Step 2 |
| **Conversations** | InboundMessage, OutboundMessage, ConversationUnreadWebhook | Step 3 |
| **Opportunities** | OpportunityCreate, OpportunityUpdate, OpportunityDelete, OpportunityStageUpdate, OpportunityStatusUpdate, OpportunityMonetaryValueUpdate | Step 4 |
| **Appointments** | AppointmentCreate, AppointmentUpdate, AppointmentDelete | Step 5 |
| **App lifecycle** | AppInstall, AppUninstall | Step 1 |

## Success Criteria

1. An org owner can connect their GHL sub-account via OAuth in < 2 minutes
2. Contacts sync bidirectionally within 5 seconds of a change
3. Agent can send SMS/email via GHL to a contact by name
4. Agent can move a deal to a pipeline stage by voice command
5. Agent can book an appointment on behalf of a customer
6. All GHL webhooks process reliably without 5xx failures
7. Token refresh runs automatically — zero manual intervention
8. Disconnecting GHL cleanly stops all sync without data loss

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GHL webhook 5xx = no retry | Missed events | Periodic reconciliation cron (every 15min) |
| Token refresh race conditions | Auth failures | Mutex via Convex mutation (single writer) |
| Rate limit (100/10s) | Throttled during bulk sync | Queue + exponential backoff in actions |
| Two-tier tokens (Agency vs Location) | Wrong token used | Scope detection at connection time, per-org Location tokens |
| GHL API changes | Breaking integration | Pin SDK version, monitor changelog |
| Contact field mapping drift | Sync errors | Schema validation + configurable field mapping |
