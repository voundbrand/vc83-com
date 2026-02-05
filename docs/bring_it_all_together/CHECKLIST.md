# Implementation Checklist

> Living checklist for building the agent platform. Grab fresh context, read this file, know where we left off.
>
> **Plan docs:** See [00-INDEX.md](00-INDEX.md) for full architecture details.
> **Branch:** `agent_per_org`
> **Last updated:** 2026-02-05

---

## Status Key

- [ ] Not started
- [x] Done
- [~] In progress (note who/when in comments)
- [S] Skipped (with reason)

---

## Pre-Work: Audit Results (2026-02-01)

Things we thought were gaps but are actually DONE:

- [x] **Credits wiring to agent pipeline** — `agentExecution.ts` already imports + calls `checkCreditsInternalQuery` (line 145) and `deductCreditsInternalMutation` (line 252). Pre-flight check, post-deduction, per-tool costs, and credit exhaustion notifications all implemented.
- [x] **Agent session schema** — `agentSessions` and `agentSessionMessages` both registered in `schema.ts` (lines 229-230).
- [x] **Credit wall component** — `src/components/credit-wall.tsx` (161 lines). Shows shortfall, buy credits CTA, tier upgrade recommendations.
- [x] **WhatsApp OAuth flow** — `src/components/window-content/integrations-window/whatsapp-settings.tsx` (483 lines). Full Meta OAuth, connection status, webhook URL display, reconnect/disconnect.
- [x] **System knowledge library** — 15 MD files + TypeScript registry in `convex/ai/systemKnowledge/`. All written.

---

## Phase 1: Make It Billable
> Doc: [08-CREDITS-WIRING.md](08-CREDITS-WIRING.md)
> Goal: Agent runs, credits consumed, agency billed.

- [x] 1.1 Wire credits to agent execution pipeline — **ALREADY DONE** (see audit above)
- [x] 1.2 Verify Stripe products/prices match credit pack + subscription tiers — **DONE 2026-02-03**
  - Verified: `stripePrices.ts`, `tierConfigs.ts`, `NEW_PRICING_PLAN.md`, `credits/index.ts` all aligned
  - Free (€0, 0 credits), Pro (€29, 200/mo), Agency (€299, 2000/mo), Enterprise (custom, unlimited)
  - Credit packs: 100/€19, 500/€79, 2000/€249, 10000/€999 — all mapped correctly
- [x] 1.3 Credit wall integration into agent config UI — **DONE 2026-02-03**
  - Widened `creditBalance` type cast to include full breakdown (daily/monthly/purchased)
  - Added compact `CreditBalance` component in tab bar header
  - Added `hasLowCredits` flag at <20% of monthly allocation
  - Low-credit warning banner shown between tab bar and content
  - CreditWall still shown at zero credits (unchanged)
- [ ] 1.4 Per-agent credit usage display
  - Query `creditTransactions` by `relatedEntityId` (session → agent)
  - UI: breakdown per agent (LLM messages, tool calls, totals)
  - Add to agent config window "Activity" tab

**Phase 1 Acceptance:** Agency owner subscribes, agent handles a conversation, credits deducted, visible in UI. At zero credits, agent responds with "unavailable" message and notifies agency.

---

## Phase 2: Make It Fast
> Docs: [03-SYSTEM-KNOWLEDGE.md](03-SYSTEM-KNOWLEDGE.md), [04-AGENT-TEMPLATES.md](04-AGENT-TEMPLATES.md), [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md)
> Goal: Agency sets up a client agent in 25 minutes via builder setup mode.
> **Approach change (2026-02-03):** Builder chat panel in "setup mode" replaces standalone wizard. See doc 09.

- [x] 2.1 Wire system knowledge into agent pipeline — **DONE 2026-02-01**
  - `scripts/generate-knowledge-content.mjs` reads all 15 .md files → generates `_content.ts` (77K chars)
  - `convex/ai/systemKnowledge/index.ts` imports `_content.ts`, exports `getKnowledgeContent("customer"|"setup")`
  - `convex/ai/agentExecution.ts` line 355: injects CUSTOMER_MODE knowledge (meta-context + conversation-design + handoff) into system prompt
  - To regenerate after editing .md files: `node scripts/generate-knowledge-content.mjs`
- [x] 2.2 Knowledge base from media library — **DONE 2026-02-01**
  - `convex/organizationMedia.ts`: `getKnowledgeBaseDocsInternal` internalQuery — fetches layercake_documents + files with extractedText, sorted by most recent, capped at 60K chars
  - `convex/ai/agentExecution.ts` line 124: pipeline step 4.5 fetches KB docs (with optional tag filter from agent config)
  - `convex/ai/agentExecution.ts` line 375: `buildAgentSystemPrompt` injects org KB docs between system knowledge and agent identity
  - Covers all markdown docs created collaboratively with the AI in the media library — user and AI co-author docs, they automatically become agent context
  - **Tag-based filtering**: agent config has `knowledgeBaseTags` field — if set, only docs with matching tags are included. If empty, all docs are included.
  - **PDF/text extraction**: `saveMedia` auto-schedules `extractTextFromMedia` for PDFs, TXT, CSV, MD uploads. Extracted text stored in `extractedText` field, then picked up by KB query.
  - Schema: added `extractedText` optional field to `organizationMedia` table
  - Agent config: added `knowledgeBaseTags` to `AgentConfig`, `createAgent`, `updateAgent`
- [~] 2.3 Builder setup mode (replaces standalone wizard — decision 2026-02-03)
  - [x] BB1: Add `"setup"` to `BuilderUIMode` in `builder-chat-panel.tsx` — **DONE 2026-02-05**
    - Mode selector entry with Sparkles icon, cyan color theme
    - `isSetupMode` state controlled via context (not local state)
  - [x] BB2: Setup system prompt construction — **DONE 2026-02-05**
    - Added `isSetupMode` parameter to `convex/ai/chat.ts:sendMessage` action
    - When `isSetupMode=true`, injects all setup knowledge (~78KB) into system prompt
    - Includes framework sequence instructions and output format for KB docs
  - [x] Entry point: "New Agent" button opens builder with `initialMode: "setup"`
- [ ] 2.4 KB document generation + agent creation via connect step
  - BB3: Builder AI generates files visible in file explorer:
    - `agent-config.json` (system prompt, FAQ, tools, channels, autonomy)
    - 8 KB docs: `kb/hero-profile.md` through `kb/success-stories.md`
  - BB4: Connect step detects `agent-config.json` → creates agent via `agentOntology.createAgent`
    - Saves KB docs to media library with appropriate tags
    - Binds channels based on `channelBindings` in config
  - BB5: Channel bindings in builder conversation → written into `agent-config.json`
  - BB6 (optional): Test chat in preview panel — calls `processInboundMessage` with generated config

**Phase 2 Acceptance:** Agency clicks "New Agent" → builder opens in setup mode → AI interviews agency owner → generates agent-config.json + 8 KB docs (visible in file explorer) → connect step creates agent + saves KB docs. Optionally generates a client portal in the same session. Works for a plumber, a salon, a yoga studio — any vertical.

---

## Phase 2.5: SMS Channel — L4YERCAK3 SMS
> Doc: [../infobip/VLN_STRIPE_WORKSTREAM.md](../infobip/VLN_STRIPE_WORKSTREAM.md)
> Goal: Org-level SMS sender config with per-org isolation and optional dedicated numbers.

### Infobip CPaaS X Multi-Tenant Isolation — DONE 2026-02-01
- [x] 2.5.1 CPaaS X entity provisioning per org (`convex/channels/infobipCpaasX.ts`)
- [x] 2.5.2 Application + Entity IDs in SMS send payload (`convex/channels/providers/infobipProvider.ts`)
- [x] 2.5.3 Inbound webhook: entityId fast-path org resolution (`convex/channels/webhooks.ts`)
- [x] 2.5.4 Lazy entity provisioning on first platform SMS send (`convex/channels/router.ts`)

### Org-Level Sender Configuration — DONE 2026-02-02
- [x] 2.5.5 Backend: `convex/channels/platformSms.ts` — queries, mutations, actions for platform SMS config
  - `getPlatformSmsConfig`, `saveAlphanumericSender`, `disconnectPlatformSms`
  - `getAvailableNumbers` (Infobip Numbers API), `saveVlnOrder`, `activateVln`, `updateVlnStatus`, `purchaseInfobipNumber`
- [x] 2.5.6 Router: per-org sender ID lookup in platform fallback (`convex/channels/router.ts:140-162`)
  - Checks `platform_sms_config` → uses alphanumeric sender or VLN number instead of global `INFOBIP_SMS_SENDER_ID`
- [x] 2.5.7 Feature flag: `platformSmsEnabled` in `convex/licensing/tierConfigs.ts` (FREE=false, PRO/AGENCY/ENTERPRISE=true)
- [x] 2.5.8 Frontend: `platform-sms-settings.tsx` — full settings panel with alphanumeric + VLN wizard (4 steps: Country → Offers → Details → Checkout)
- [x] 2.5.9 Integration card: "L4YERCAK3 SMS" in integrations grid (purple #7c3aed, gated by `platformSmsEnabled`)

### VLN Stripe Subscription — DONE 2026-02-02
- [x] 2.5.10 Stripe checkout route: `src/app/api/stripe/create-sms-checkout/route.ts`
  - Dynamic Stripe prices from Infobip pricing + 35% markup
  - Subscription with one-time setup fee via `subscription_data.add_invoice_items`
  - Convex action: `convex/stripe/smsCheckout.ts:createSmsCheckoutSession`
- [x] 2.5.11 Wire frontend "Subscribe & Purchase" button to Stripe checkout
  - `platform-sms-settings.tsx`: real Stripe redirect replaces "Coming Soon"
  - `isSubmittingCheckout` state, loading spinner, error handling
- [x] 2.5.12 Webhook handler: `checkout.session.completed` for `type: "sms-number"` → `activateVln` + `purchaseInfobipNumber`
  - Added in `convex/stripe/platformWebhooks.ts:handleCheckoutCompleted`
- [x] 2.5.13 Webhook handler: `customer.subscription.deleted` for `type: "sms-number"` → cancel VLN
  - Early return in `handleSubscriptionDeleted` — updates VLN status to "cancelled", doesn't process as tier change
- [x] 2.5.14 Fix `disconnectPlatformSms` to cancel Stripe subscription + add `cancelVlnSubscription` internalAction
  - `disconnectPlatformSms` schedules `cancelVlnSubscription` if VLN has a Stripe subscription
  - `cancelVlnSubscription` internalAction cancels Stripe subscription + cleans up CPaaS X entity

**Phase 2.5 Acceptance:** Org saves alphanumeric sender → outbound SMS uses it. Org purchases VLN via Stripe → number provisioned on Infobip → two-way SMS works with dedicated number.

---

## Phase 3: Make It Reachable
> Docs: [06-WHATSAPP-NATIVE.md](06-WHATSAPP-NATIVE.md), [05-WEBCHAT-WIDGET.md](05-WEBCHAT-WIDGET.md)
> Goal: Agent deployed on WhatsApp and/or landing page.

- [x] 3.1 WhatsApp connection — **ALREADY DONE** (OAuth flow exists, not just manual)
- [x] 3.2 Webchat widget — **DONE 2026-02-05**
  - [x] Backend: `convex/api/v1/webchatApi.ts` — session management, config, message handling
  - [x] Backend: `convex/schemas/webchatSchemas.ts` — `webchatSessions`, `webchatRateLimits` tables
  - [x] HTTP routes: `POST /api/v1/webchat/message`, `GET /api/v1/webchat/config/:agentId`
  - [x] Frontend: `src/components/chat-widget/ChatWidget.tsx` — embeddable React component
    - Floating bubble widget with configurable position and brand color
    - Session persistence via localStorage (24h expiry)
    - Messages stored locally (last 50)
    - Typing indicator, error handling, powered-by footer
  - [x] Rate limiting: 30/min (free), 60/min (pro) in webchatApi
  - [ ] Embed script: `public/widget.js` for script tag embedding (future)
- [ ] 3.3 Scaffold integration
  - Auto-inject webchat widget into builder-generated apps
  - Widget config from agent settings
  - "Add chat to your site" toggle in agent config
- [ ] 3.4 WhatsApp Embedded Signup (self-service)
  - Meta Embedded Signup flow (ISV registration required)
  - One-click connect for agency owners who don't have WABA yet
  - Store WABA ID + phone number ID + access token

**Phase 3 Acceptance:** Customer messages agent on WhatsApp OR via webchat on a landing page. Both routes hit the same `processInboundMessage` pipeline.

---

## Phase 4: Make It Professional (Builder-Generated Portal)
> Docs: [11-BUILDER-PORTAL-TEMPLATE.md](11-BUILDER-PORTAL-TEMPLATE.md), [07-WHITE-LABEL-PORTAL.md](07-WHITE-LABEL-PORTAL.md)
> Goal: Plumber has branded dashboard deployed to Vercel. Agency sees all clients in-platform.
> Prototype: `docs/bring_it_all_together/white-label-customer-portal/freelancer-portal-build/`
>
> **Approach change (2026-02-02):** Portal is builder-generated + deployed to Vercel, not built inside the platform. Uses existing connect + scaffold + deploy pipeline. See doc 11 for full architecture.

### Phase 4A: Sub-Org + Conversations API (Prerequisites)
- [x] 4A.1 Add `parentOrganizationId` to organizations schema — **ALREADY DONE**
  - Field at `convex/schemas/coreSchemas.ts:55`
  - Index `.index("by_parent", ["parentOrganizationId"])` at line 125
- [x] 4A.2 Sub-org CRUD — **DONE 2026-02-05**
  - `convex/api/v1/subOrganizations.ts` (290 lines) — 4 httpAction handlers
  - `convex/api/v1/subOrganizationsInternal.ts` (152 lines) — internal queries/mutations
  - Routes registered in `convex/http.ts` (lines 3158-3195)
  - Endpoints: POST/GET `/organizations/children`, GET/PATCH `/organizations/children/:childId`
- [x] 4A.3 Conversations API: 5 REST endpoints — **DONE 2026-02-05**
  - `convex/api/v1/conversations.ts` (420+ lines) — all 5 httpAction handlers
  - Routes registered in `convex/http.ts` (lines 3103-3156)
  - Internal path dispatching for `/messages` sub-route (follows forms.ts pattern)
  - `GET /api/v1/conversations` — list agent sessions (filter by status, channel, date)
  - `GET /api/v1/conversations/:sessionId` — session detail
  - `GET /api/v1/conversations/:sessionId/messages` — message history
  - `POST /api/v1/conversations/:sessionId/messages` — human takeover message
  - `PATCH /api/v1/conversations/:sessionId` — update status (close, hand off)
- [x] 4A.4 `convex/api/v1/conversations.ts` — **DONE 2026-02-03**
  - `convex/api/v1/conversationsInternal.ts` (240 lines) — internal queries wrapping agentSessions
- [x] 4A.5 Add `conversations` as 10th API category — **DONE 2026-02-05**
  - `src/lib/api-catalog.ts` — added conversations category with 5 endpoints
  - Scopes: `conversations:read`, `conversations:write`
  - Icon: `MessageSquare`
- [x] 4A.6 Add `conversations` scaffold — **DONE 2026-02-05**
  - `src/lib/scaffold-generators/thin-client.ts`:
    - Added `Conversation` and `ConversationMessage` types to `generateTypesIndex`
    - Added `generateConversationsHelper()` — 60+ line typed API wrapper
    - Added conversations listing + detail pages to `generateCategoryPages`
    - Added webhook events: `conversation.started`, `conversation.closed`, `conversation.handed_off`, `message.received`
    - Added to `getCategoryImportName` mapping
- [x] 4A.7 Add `conversations` detection — **DONE 2026-02-05**
  - `src/lib/builder/v0-file-analyzer.ts`:
    - Added `detectConversations()` function — detects chat/messaging UI patterns
    - Uses 2+ signals (hasChatUI, hasMessageList, hasChatComponents, hasSendMessageHandler) to avoid false positives
    - Added `conversation` type mapping and `conversations` label

### Phase 4B: Portal Template in Builder
- [ ] 4B.1 Create portal template scaffold (based on V0 prototype)
  - Modular sections: Dashboard (always), Conversations (always), Bookings, Invoices, Contacts, KB, Settings
- [ ] 4B.2 Add portal template to builder template gallery
- [ ] 4B.3 Wire Messages page to conversations API (replace "coming soon" placeholder)
- [ ] 4B.4 Wire Dashboard stats to real queries (conversation count, bookings, invoices)
- [ ] 4B.5 Wire Invoices page to invoices API
- [ ] 4B.6 Add Bookings page (calendar view from availability API)
- [ ] 4B.7 Add Contacts page (CRM API)
- [ ] 4B.8 Branding injection (logo, colors, names from env vars or branding API)

### Phase 4C: Auth + Deploy
- [ ] 4C.1 Client auth: magic link login for plumber (reuse project drawer pattern)
- [ ] 4C.2 Agency auth: OAuth JWT with `sub_org` claim for multi-tenant
- [ ] 4C.3 Multi-tenant switcher component (agency owner sees all client portals)
- [ ] 4C.4 Custom domain setup in post-deploy settings (Vercel domain API)

### Phase 4D: Agency Dashboard (In-Platform)
- [ ] 4D.1 All-clients view in l4yercak3 (list sub-orgs with summary stats)
- [ ] 4D.2 Per-client drill-down (conversations, bookings, credit usage)
- [ ] 4D.3 "New Client" flow: create sub-org → setup wizard → generate portal → deploy
- [ ] 4D.4 Client portal management (view URL, redeploy, update branding)

**Phase 4 Acceptance:** Agency opens builder → "Client Portal" template → customizes → connects to sub-org data → publishes to Vercel. Plumber logs into `portal.schmidt-sanitaer.de` via magic link, sees real conversations + bookings. Agency sees all clients from l4yercak3 dashboard.

---

## Phase 5: Make It Scale
> Goal: Advanced features for retention + upsell.

- [ ] 5.1 WhatsApp message templates + outbound
- [ ] 5.2 Follow-up sequence automation
- [ ] 5.3 Instagram DM automation
- [ ] 5.4 Review request automation
- [ ] 5.5 Voice agent / AI phone answering
- [ ] 5.6 Custom domains for client portals
- [ ] 5.7 Setup agent improvements (learns from successful setups)

---

## Phase 6: Communications Platform
> Doc: [12-COMMS-PLATFORM-SPEC.md](12-COMMS-PLATFORM-SPEC.md)
> Goal: Internal messaging, feed, and notifications across the four-level hierarchy (Platform → Agency Owner → Agency Customer → End User).

### Existing Infrastructure (Audit)
- [x] **AI agent communications (Layer 4)** — `agentExecution.ts`, `agentSessions.ts` handle End User ↔ AI ↔ Organization flow
- [x] **Conversations API** — 5 REST endpoints for agent session data (Phase 4A)
- [x] **Notifications backend** — `convex/api/v1/notifications.ts` (untracked, needs audit)
- [x] **Pushover integration** — `pushover-settings.tsx` (untracked, needs audit)
- [x] **Sub-organization hierarchy** — `parentOrganizationId` field + API (Phase 4A)

### Phase 6A: Foundation (Internal Chat + Basic Notifications)
- [ ] 6A.1 Schema: `directMessages` table (sender, recipient, orgId, content, readAt, createdAt)
- [ ] 6A.2 Schema: `notifications` table (userId, orgId, type, priority, title, body, readAt, metadata)
- [ ] 6A.3 DM queries/mutations: `sendDirectMessage`, `getConversationWith`, `markAsRead`
- [ ] 6A.4 Notification queries/mutations: `createNotification`, `getNotifications`, `markNotificationRead`
- [ ] 6A.5 Real-time subscriptions for DMs and notifications (Convex reactivity)
- [ ] 6A.6 UI: Chat sidebar component (org-scoped user list, conversation threads)
- [ ] 6A.7 UI: Notification bell + dropdown (in-app notification center)
- [ ] 6A.8 Per-org notification settings (user can configure per organization they belong to)
- [ ] 6A.9 Platform "super organization" concept — special org for platform-level broadcasts

### Phase 6B: Live Community Feed + Broadcasts
- [ ] 6B.1 Schema: `feedItems` table (orgId, authorId, type, content, metadata, createdAt)
- [ ] 6B.2 Feed item types: broadcast, activity (follow, like, referral, caching event)
- [ ] 6B.3 Broadcast mutations: agency owner → all customers, platform → all feeds
- [ ] 6B.4 Feed queries: `getFeedForOrg`, `getFeedItem`, paginated with real-time updates
- [ ] 6B.5 Platform badge for super-org broadcasts (visual distinction)
- [ ] 6B.6 UI: Feed component per organization
- [ ] 6B.7 UI: Broadcast composer for agency owners
- [ ] 6B.8 Activity item generation (auto-create feed items for follows, likes, referrals)

### Phase 6C: Notification Priority + External Integrations
- [ ] 6C.1 Priority schema: Critical (platform only), High, Normal, Low
- [ ] 6C.2 Priority behavior: Critical = all channels + unmutable, High = push+email default, Normal = in-app, Low = batched
- [ ] 6C.3 Audit existing Pushover integration — wire to priority system
- [ ] 6C.4 External integration config per org (map notification types → external channels)
- [ ] 6C.5 User opt-in/out for external delivery channels
- [ ] 6C.6 UI: Notification preferences per org (sound, email, push toggles)
- [ ] 6C.7 Email delivery integration (Resend for notification emails)
- [ ] 6C.8 Push notification infrastructure (web push + mobile via existing channels)

### Phase 6D: Cross-Org Messaging + Advanced
- [ ] 6D.1 Org-level setting: `allowCrossOrgMessaging` (boolean)
- [ ] 6D.2 Cross-org DM logic: only if BOTH orgs allow it
- [ ] 6D.3 User blocking: `blockedUsers` field or separate table
- [ ] 6D.4 "Who can message me" permission levels
- [ ] 6D.5 Group chats / channels within organizations (future)
- [ ] 6D.6 Rich feed features: comments, reactions, threads (future)

### Phase 6E: Mobile Parity
- [ ] 6E.1 iPhone app: DM sync (real-time via WebSocket or polling)
- [ ] 6E.2 iPhone app: Notifications with priority-mapped push
- [ ] 6E.3 iPhone app: Feed view per organization
- [ ] 6E.4 iPhone app: Notification settings per org

**Phase 6 Acceptance:** Agency owner can DM their customers. Platform can broadcast to all users. Users see a live feed per org with activity items. Notification priority determines delivery channel. Pushover (and later email/SMS) delivers external notifications. Mobile app has feature parity with web.

---

## Key Files Reference

| Area | File | Lines | Notes |
|------|------|-------|-------|
| Agent CRUD | `convex/agentOntology.ts` | 454 | `createAgent` at line 144 |
| Agent Execution | `convex/ai/agentExecution.ts` | 459 | `processInboundMessage` L57, credit check L145, deduction L252, prompt builder L345 |
| Agent Sessions | `convex/ai/agentSessions.ts` | 329 | `resolveSession` at line 25 |
| Agent Approvals | `convex/ai/agentApprovals.ts` | 418 | `executeApprovedAction` at line 245 |
| Agent Config UI | `src/components/window-content/agent-configuration-window.tsx` | 959 | 4 tabs |
| Credits | `convex/credits/index.ts` | 652 | Complete system |
| Credit Wall | `src/components/credit-wall.tsx` | 161 | Ready to wire into agent UI |
| Knowledge Registry | `convex/ai/systemKnowledge/index.ts` | — | Metadata only, needs content bundling |
| Channel Webhooks | `convex/channels/webhooks.ts` | 425 | `processWhatsAppWebhook` L96, `processInfobipWebhook` L312, entityId fast-path |
| Channel Router | `convex/channels/router.ts` | 280 | `sendMessage` L124, per-org sender ID L140-162, CPaaS X lazy provisioning |
| CPaaS X | `convex/channels/infobipCpaasX.ts` | 323 | Multi-tenant: Application + Entity provisioning, association |
| Infobip Provider | `convex/channels/providers/infobipProvider.ts` | 248 | SMS send with CPaaS X IDs, E.164 normalization |
| Platform SMS Config | `convex/channels/platformSms.ts` | 631 | Alphanumeric + VLN backend, Infobip Numbers API |
| Platform SMS UI | `src/components/window-content/integrations-window/platform-sms-settings.tsx` | 600+ | Full wizard: choose → country → offers → details → checkout |
| WhatsApp Settings | `src/components/window-content/integrations-window/whatsapp-settings.tsx` | 483 | Full OAuth flow |
| HTTP Endpoints | `convex/http.ts` | 3200+ | Webchat routes: POST/GET /api/v1/webchat/* |
| Webchat API | `convex/api/v1/webchatApi.ts` | 340 | Session management, config, message handling |
| Webchat Schema | `convex/schemas/webchatSchemas.ts` | 40 | webchatSessions, webchatRateLimits tables |
| Chat Widget | `src/components/chat-widget/ChatWidget.tsx` | 400+ | Embeddable React widget for websites |
| Stripe | `convex/stripe/platformCheckout.ts` | 400+ | Subscriptions + credit packs |
| Stripe SMS Checkout | `convex/stripe/smsCheckout.ts` | 177 | VLN number Stripe checkout (dynamic prices, setup fee) |
| Stripe Webhooks | `convex/stripe/platformWebhooks.ts` | 500+ | Tier + credit-pack + sms-number handlers |
| SMS Checkout Route | `src/app/api/stripe/create-sms-checkout/route.ts` | 49 | Next.js bridge to Convex SMS checkout action |
| Schema | `convex/schema.ts` | — | Agent tables registered |
| Builder Connect | `src/components/builder/connection-panel.tsx` | 569 | Create/Link/Skip per detected data item |
| V0 Connection | `src/components/builder/v0-connection-panel.tsx` | 833 | API category selector + env vars + key |
| Conversations API | `convex/api/v1/conversations.ts` | 404 | 5 httpAction handlers for agent sessions |
| Conversations Internal | `convex/api/v1/conversationsInternal.ts` | 240 | Internal queries wrapping agentSessions |
| Sub-Org API | `convex/api/v1/subOrganizations.ts` | 290 | 4 httpAction handlers for child orgs |
| Sub-Org Internal | `convex/api/v1/subOrganizationsInternal.ts` | 152 | Internal CRUD for sub-organizations |
| API Catalog | `src/lib/api-catalog.ts` | 177 | 10 API categories (conversations added 2026-02-05) |
| Scaffold Generator | `src/lib/scaffold-generators/thin-client.ts` | 800+ | Generates typed API helpers per category |
| V0 File Analyzer | `src/lib/builder/v0-file-analyzer.ts` | ~150 | Heuristic detection in React source |
| Builder App CRUD | `convex/builderAppOntology.ts` | 1500+ | App creation, connections, matching |
| Portal Prototype | `docs/bring_it_all_together/white-label-customer-portal/freelancer-portal-build/` | — | V0-generated portal scaffold |
| Comms Spec | `docs/bring_it_all_together/12-COMMS-PLATFORM-SPEC.md` | 184 | Four-level hierarchy, 3 primitives (Chat, Feed, Notifications) |
| Notifications API | `convex/api/v1/notifications.ts` | — | (untracked) Needs audit for Phase 6 |
| Pushover Settings | `src/components/window-content/integrations-window/pushover-settings.tsx` | — | (untracked) Existing external integration |

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-01 | No rigid agent templates | System knowledge library replaces them. Setup agent generates tailored configs dynamically for ANY vertical. See [04-AGENT-TEMPLATES.md](04-AGENT-TEMPLATES.md). |
| 2026-02-01 | Credits wiring already done | Audit confirmed `agentExecution.ts` already integrates with credits system. Focus shifts to verification + UI. |
| 2026-02-01 | WhatsApp OAuth already done | Full Meta OAuth component exists. Skip "manual credentials" step, go straight to verification + Embedded Signup. |
| 2026-02-01 | CPaaS X multi-tenant isolation | Every org gets its own Infobip Entity for per-org SMS isolation, reporting, and security. Application = L4YERCAK3 platform (one per env). |
| 2026-02-02 | Separate Stripe subscription for VLN numbers | VLN numbers have fixed monthly costs (EUR ~30/mo), not usage-based. Credits are wrong for this — separate Stripe subscription needed. Per-message cost stays on credits (2 credits/SMS). |
| 2026-02-02 | Dynamic pricing from Infobip API | Prices fetched at point of purchase via Infobip Numbers API, 35% markup applied programmatically. No hardcoded prices. |
| 2026-02-02 | Alphanumeric sender = free, instant | No cost, no provisioning delay. Alphanumeric senders are outbound-only (recipients can't reply). Ships immediately as zero-cost value-add for PRO+ tiers. |
| 2026-02-02 | Builder-generated portal, not built-in | Portal is a real Next.js app generated by the builder, connected to API, deployed to Vercel. Custom domains, agency differentiation, reuses existing pipeline. See [11-BUILDER-PORTAL-TEMPLATE.md](11-BUILDER-PORTAL-TEMPLATE.md). |
| 2026-02-02 | One portal per client | Each sub-org gets its own deployed portal with custom domain. Better white-labeling than one portal with client switching. |
| 2026-02-02 | Conversations as 10th API category | Agent sessions are first-class data. Portal Messages page needs them like it needs invoices. 5 REST endpoints wrapping existing `agentSessions`. |
| 2026-02-02 | Credit pool from parent org | Agency buys credits once, sub-org deductions come from parent pool. No per-sub-org billing complexity. |
| 2026-02-03 | Builder IS the setup wizard (no standalone wizard) | The builder already has chat, file generation, preview, connect, and deploy. Adding "agent setup" is just a new mode, not a second UI. Saves ~570 lines vs standalone wizard. One session can produce agent config + KB docs + optional portal. See [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md). |
| 2026-02-05 | Communications Platform = Phase 6 | Four-level hierarchy (Platform → Agency → Customer → End User). Three primitives: Chats (1:1 DMs), Feed (broadcasts + activity), Notifications (priority-tiered). AI agent comms (Layer 4) already done via agentSessions. Phase 6 adds internal platform messaging. See [12-COMMS-PLATFORM-SPEC.md](12-COMMS-PLATFORM-SPEC.md). |

---

## Next Up

**Phase 2.5 VLN Stripe:** DONE. All 5 items (2.5.10–2.5.14) completed 2026-02-02.
**Phase 1.2 + 1.3:** DONE. Stripe config verified, credit wall integrated 2026-02-03.
**Phase 4A:** COMPLETE 2026-02-05. All 7 items done:
- 4A.1–4A.4: Backend API complete (sub-orgs + conversations + HTTP routes)
- 4A.5–4A.7: Builder integration complete (API catalog + scaffold generator + file analyzer)

**Phase 2.3 Builder Setup Mode (BB1 + BB2):** DONE 2026-02-05
- BB1: "setup" mode added to BuilderUIMode with Sparkles icon, cyan theme
- BB2: `isSetupMode` parameter added to chat action, injects ~78KB setup knowledge

**Phase 3.2 Webchat Widget:** DONE 2026-02-05
- Backend: `webchatApi.ts` — session management, config, message handling
- Frontend: `ChatWidget.tsx` — embeddable floating widget

**NOW: Remaining Setup Mode (Phase 2.3 + 2.4)**
- [x] Entry point: "New Agent" button opens builder with `initialMode: "setup"`
- BB3: KB document generation in builder file explorer
- BB4: Agent creation via connect step
- BB5: Channel bindings in builder conversation
- BB6: Test chat in preview (optional)

**Then:**
- Phase 3.3 (scaffold integration for webchat widget)
- Phase 4B (portal template in builder) — V0 prototype exists, needs wiring to real data

**Architecture docs:**
- Builder setup mode: [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md)
- Portal spec: [11-BUILDER-PORTAL-TEMPLATE.md](11-BUILDER-PORTAL-TEMPLATE.md)
- Communications platform: [12-COMMS-PLATFORM-SPEC.md](12-COMMS-PLATFORM-SPEC.md)
- Builder pipeline: [V0 Pipeline Master Plan](../v0_to_l4yercak3_backend/MASTER_PLAN.md)
- Ontology reference: [ONTOLOGY_CONNECTION_REFERENCE.md](../v0_to_l4yercak3_backend/ONTOLOGY_CONNECTION_REFERENCE.md)
