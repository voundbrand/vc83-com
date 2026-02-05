# Continuation Prompt: Phase 4A (Sub-Org + Conversations API) + Phase 3.2 (Webchat Widget)

> Use this as context to continue work in the current window.
> Branch: `agent_per_org`
> Codebase: `/Users/foundbrand_001/Development/vc83-com`

---

## What Was Just Completed

- **Phase 1.2** — Stripe prices verified (all aligned across `stripePrices.ts`, `tierConfigs.ts`, `NEW_PRICING_PLAN.md`, `credits/index.ts`)
- **Phase 1.3** — Credit wall wired into agent config UI (`agent-configuration-window.tsx`): compact CreditBalance in tab bar, low-credit banner at <20%, CreditWall at zero
- **Handoff prompt written** for Phase 2.3/2.4 (builder-as-setup-wizard) in a separate window

**Checklist:** `docs/bring_it_all_together/CHECKLIST.md` — Phase 1.2 and 1.3 marked done. See Phase 4A (lines 155-167) and Phase 3 (lines 130-144) for the work ahead.

---

## Phase 4A: Sub-Org + Conversations API

### Goal
Add sub-organization hierarchy and expose agent conversations as the 10th REST API category, so builder-generated portals can show real conversation data.

### What Already Exists

**Organizations schema already supports sub-orgs:**
- `parentOrganizationId: v.optional(v.id("organizations"))` — already in `convex/schemas/coreSchemas.ts:55`
- Index: `.index("by_parent", ["parentOrganizationId"])` — already defined

**Agent sessions fully functional:**
- `convex/ai/agentSessions.ts` — resolveSession, getSessionMessages, addSessionMessage, closeSession, handOffSession, getActiveSessions
- `convex/schemas/aiSchemas.ts:546-588` — agentSessions + agentSessionMessages tables with indexes by_org_channel_contact, by_agent, by_org_status
- Most functions are `internal` — need public-facing wrappers for REST

**HTTP router ready:**
- `convex/http.ts` — 2900+ lines, established pattern with httpAction handlers
- Auth via API key extraction in handler body
- CORS headers helper available

**API catalog has 9 categories:**
- `src/lib/api-catalog.ts:37-157` — forms, crm, events, products, workflows, invoices, tickets, bookings, checkout
- Each has: id, label, description, icon, scopes, endpoints array

**Scaffold generator pattern established:**
- `src/lib/scaffold-generators/thin-client.ts` — `generateCategoryHelper(categoryId)` switch (line 612-633)
- Each category: generates `lib/{category}.ts` with typed wrapper functions using shared `apiRequest()`

**V0 file analyzer detects 7 types:**
- `src/lib/builder/v0-file-analyzer.ts:22-158` — detectForms, detectContacts, detectProducts, detectBookings, detectTickets, detectInvoices, detectCheckout

### Checklist Items (from CHECKLIST.md)

```
4A.1 Add parentOrganizationId to organizations schema        — ALREADY DONE (coreSchemas.ts:55)
4A.2 Sub-org CRUD: createChildOrganization, getChildOrganizations, credit pool sharing
4A.3 Conversations API: 5 REST endpoints in convex/http.ts
  - GET  /api/v1/conversations              — list sessions (filter by status, channel, date)
  - GET  /api/v1/conversations/:sessionId   — session detail
  - GET  /api/v1/conversations/:sessionId/messages — message history
  - POST /api/v1/conversations/:sessionId/messages — human takeover message
  - PATCH /api/v1/conversations/:sessionId  — update status (close, hand off)
4A.4 convex/api/v1/conversations.ts — queries wrapping agentSessions
4A.5 Add conversations as 10th API category in src/lib/api-catalog.ts
4A.6 Add conversations scaffold to src/lib/scaffold-generators/thin-client.ts
4A.7 Add conversations detection in src/lib/builder/v0-file-analyzer.ts
```

### Implementation Order

1. **4A.1 — Already done.** `parentOrganizationId` + index exist.
2. **4A.2 — Sub-org CRUD.** Create `convex/api/v1/subOrganizations.ts` or add to existing org file:
   - `createChildOrganization(parentOrgId, name, slug)` — creates org with parentOrganizationId set
   - `getChildOrganizations(parentOrgId)` — query using by_parent index
   - Credit pool: when deducting credits for a child org, check parent org's balance if child has none
3. **4A.4 → 4A.3 — Conversations queries first, then HTTP endpoints.**
   - Create `convex/api/v1/conversations.ts` with public queries wrapping the internal functions in `agentSessions.ts`
   - Then register HTTP routes in `convex/http.ts` calling those queries
   - Auth: API key scoped with `conversations:read` / `conversations:write`
4. **4A.5 — API catalog.** Add 10th category to `api-catalog.ts`:
   - id: `"conversations"`, label: `"Conversations & AI Agents"`
   - scopes: `["conversations:read", "conversations:write"]`
   - 5 endpoints matching the REST API
5. **4A.6 — Scaffold helper.** Add `generateConversationsHelper()` in `thin-client.ts`:
   - Generates `lib/conversations.ts` with: `fetchConversations()`, `fetchConversation()`, `fetchMessages()`, `sendMessage()`, `updateConversation()`
6. **4A.7 — V0 detection.** Add `detectConversations()` in `v0-file-analyzer.ts`:
   - Signals: chat/message/conversation keywords, message arrays, chat input components

### Key Files

| File | Purpose |
|------|---------|
| `convex/schemas/coreSchemas.ts:47-130` | Organizations schema (parentOrganizationId at line 55) |
| `convex/schemas/aiSchemas.ts:546-588` | agentSessions + agentSessionMessages tables |
| `convex/ai/agentSessions.ts` | Internal session functions to wrap |
| `convex/http.ts` | HTTP router — add conversation endpoints |
| `convex/api/v1/` | Existing API v1 handlers (follow pattern) |
| `src/lib/api-catalog.ts:37-157` | 9 categories — add 10th |
| `src/lib/scaffold-generators/thin-client.ts:612-633` | Category helper switch — add conversations |
| `src/lib/builder/v0-file-analyzer.ts:22-158` | Detection functions — add conversations |
| `convex/credits/index.ts` | Credit deduction — extend for child org pool sharing |

---

## Phase 3.2: Webchat Widget

### Goal
Embeddable chat widget that connects to the agent execution pipeline. Customers chat with the AI agent on landing pages or any website.

### What Already Exists

**Channel infrastructure ready:**
- `"webchat"` already in ChannelType union (`convex/channels/types.ts:19`)
- `"webchat"` in message queue schema (`convex/schemas/messageQueueSchema.ts:33`)
- `processInboundMessage` handles all channels including webchat (`convex/ai/agentExecution.ts:57`)
- Channel router ready for webchat bindings (`convex/channels/router.ts`)
- Chatwoot provider already maps `"webchat"` channel type (`convex/channels/providers/chatwoot.ts:25`) — but Phase 3.2 needs a direct provider, not Chatwoot

**Agent config already has channel bindings:**
- `channelBindings` array in agent config — checkboxes for 8 channels including webchat
- Agent config UI shows provider status per channel

### What's Missing

1. **HTTP endpoints** — `POST /api/v1/webchat/message` + `GET /api/v1/webchat/config/:agentId`
2. **Direct webchat provider** — simple provider that returns responses via HTTP (no external service)
3. **React chat widget** — ~500-line component (bubble, panel, message list, input)
4. **Session management** — localStorage session token, 24h expiry
5. **Embed script** — `<script>` tag loader for external sites
6. **Scaffold integration** — auto-include ChatWidget in builder-generated apps

### Spec
Full spec at `docs/bring_it_all_together/05-WEBCHAT-WIDGET.md`. Key points:
- Floating bubble with unread badge → 400x600px expandable panel
- Markdown rendering, link detection
- Mobile responsive (full-screen on small)
- Rate limit: 30 req/min free, 60 req/min pro
- Session via localStorage token
- Config via env vars: `NEXT_PUBLIC_L4YERCAK3_AGENT_ID`, `NEXT_PUBLIC_L4YERCAK3_ORG_ID`
- Embed options: script tag, React component, iframe

### Implementation Order

1. **HTTP endpoints** in `convex/http.ts`:
   - `POST /api/v1/webchat/message` — accepts `{ agentId, organizationId, message, sessionToken? }`, calls `processInboundMessage`, returns `{ sessionToken, response }`
   - `GET /api/v1/webchat/config/:agentId` — returns widget config (name, color, welcome message)
   - CORS: allow all origins (public widget)
   - Rate limiting: per-IP via existing rate limit middleware
2. **Chat widget component** — `src/components/webchat/ChatWidget.tsx`
   - Self-contained, no external deps beyond React
   - Fetches config on mount, stores session token in localStorage
   - Posts messages to HTTP endpoint
3. **Embed script** — `public/widget.js`
   - Loads React + ChatWidget, mounts into shadow DOM
   - `<script src="https://app.l4yercak3.com/widget.js" data-agent-id="..." data-org-id="...">`
4. **Scaffold integration** — Update `thin-client.ts` to include ChatWidget in generated layouts when webchat category selected
5. **Builder preview** — Widget auto-appears in preview when agent has webchat enabled

### Key Files

| File | Purpose |
|------|---------|
| `convex/http.ts` | Add webchat endpoints |
| `convex/ai/agentExecution.ts` | processInboundMessage (already handles webchat) |
| `convex/ai/agentSessions.ts` | Session management (already handles all channels) |
| `convex/channels/types.ts:19` | ChannelType includes "webchat" |
| `convex/channels/router.ts` | Channel routing (ready for webchat) |
| `docs/bring_it_all_together/05-WEBCHAT-WIDGET.md` | Full spec |
| `src/components/webchat/` | New — ChatWidget component |
| `src/lib/scaffold-generators/thin-client.ts` | Add webchat to scaffold |

---

## Recommended Sequence

**Start with Phase 4A** — it's the foundation for everything:
1. 4A.2 (sub-org CRUD) — needed for multi-client agency model
2. 4A.4 + 4A.3 (conversations queries + HTTP endpoints) — unlocks portal data
3. 4A.5 + 4A.6 + 4A.7 (catalog + scaffold + detection) — integrates into builder

**Then Phase 3.2** — can run in parallel once 4A.3 is done:
1. Webchat HTTP endpoints (similar pattern to conversations API)
2. Chat widget component
3. Embed script + scaffold integration

Both phases share the HTTP endpoint pattern in `convex/http.ts`, so doing 4A first establishes the pattern for 3.2.
