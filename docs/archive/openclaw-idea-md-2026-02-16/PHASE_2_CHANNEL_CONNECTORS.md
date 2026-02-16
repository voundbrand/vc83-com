# Phase 2: Channel Connectors — Unified Inbox & Social Media

> Connect the org's agent to every channel their customers use — and every platform where they need presence.

## Vision

Two sides of the same coin:

1. **Inbound**: Customers message the business on WhatsApp, email, Instagram DM, etc. → The org's agent responds using real data.
2. **Outbound/Social**: The org's agent posts content, manages social presence, and engages on behalf of the business.

No ManyChat. No third-party chatbot dependency. Direct API integrations + Chatwoot as the open-source unified inbox.

---

## What Already Exists

### Messaging Infrastructure (spec'd, partially built)
- `docs/plans/multichannel-automation/ARCHITECTURE.md` — Sequence engine, message queue, delivery router
- `docs/plans/multichannel-automation/SCHEMA.md` — `messageQueue` table schema with status lifecycle
- `docs/plans/multichannel-automation/SEQUENCES.md` — Pre-configured booking automation sequences
- `docs/plans/multichannel-automation/CONNECTIONS.md` — Resend + Infobip connection UI, encrypted credential storage
- `docs/plans/multichannel-automation/INFOBIP-INTEGRATION.md` — SMS + WhatsApp delivery via Infobip API
- `docs/plans/multichannel-automation/IMPLEMENTATION-CHECKLIST.md` — 6-phase build plan
- `docs/integrations/WHATSAPP_SETUP.md` — Meta WhatsApp Business API OAuth (per-org billing)

### Existing Code
- `convex/emailService.ts` + `convex/emailQueue.ts` — Email delivery (Resend)
- `convex/sequences/` — Multi-channel sequence automation (email, SMS, WhatsApp, push)
- `convex/sequences/messageQueueProcessor.ts` — Scheduled message delivery
- `convex/integrations/manychat.ts` — ManyChat integration (1000+ lines, **REPLACE** with Chatwoot)
- `convex/integrations/pushover.ts` — Push notifications (**DEPRECATE**, replace with Chatwoot + native)
- `convex/http.ts` — Webhook endpoints for ManyChat, ActiveCampaign, Vercel, Stripe
- `convex/schemas/coreSchemas.ts` — `oauthConnections` table with provider union

### Credential Pattern (ready to extend)
- Encrypted API key storage via `oauthConnections` table
- Per-org credential isolation
- Fallback to platform-level env vars when org hasn't configured their own
- Test connection flow built into UI

---

## Architecture

### Replace ManyChat with Chatwoot + Direct APIs

```
┌─────────────────────────────────────────────────────────────────┐
│                 CHANNEL ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  INBOUND (Customer → Agent)                                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Chatwoot (Self-Hosted or Cloud)                          │    │
│  │  ─────────────────────────────────                        │    │
│  │  Unified inbox aggregating:                               │    │
│  │  • WhatsApp (via Meta Cloud API)                          │    │
│  │  • Email (IMAP/SMTP)                                      │    │
│  │  • Website live chat (widget)                             │    │
│  │  • Instagram DM (via Meta API)                            │    │
│  │  • Facebook Messenger (via Meta API)                      │    │
│  │  • Telegram (via Bot API)                                 │    │
│  │  • SMS (via Twilio/Infobip)                               │    │
│  └──────────────┬───────────────────────────────────────────┘    │
│                 │ Webhook: new message                            │
│                 ▼                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  L4YERCAK3 Webhook Handler                                │    │
│  │  ─────────────────────────                                │    │
│  │  1. Identify org (from Chatwoot inbox → org mapping)     │    │
│  │  2. Load org's agent (Phase 1)                            │    │
│  │  3. Resolve CRM contact                                   │    │
│  │  4. Agent processes message                               │    │
│  │  5. Send response via Chatwoot API                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  OUTBOUND (Agent → Customer / Platform)                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Delivery Router (existing architecture)                   │    │
│  │  ─────────────────────────────────                        │    │
│  │  email    → Resend API (existing)                         │    │
│  │  sms      → Infobip API (spec'd)                         │    │
│  │  whatsapp → Meta Cloud API / Infobip (spec'd)            │    │
│  │  push     → Native / Chatwoot                             │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  SOCIAL MEDIA (Agent → Platform)                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Social Channel Connectors (NEW)                           │    │
│  │  ─────────────────────────────                            │    │
│  │  instagram  → Meta Graph API (posts, stories, reels)      │    │
│  │  facebook   → Meta Graph API (page posts)                 │    │
│  │  x/twitter  → X API v2 (tweets, replies)                  │    │
│  │  linkedin   → LinkedIn API (company page posts)           │    │
│  │  tiktok     → TikTok Content Posting API                  │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Chatwoot Integration

### Why Chatwoot

- **Open source** (MIT license) — no vendor lock-in
- **Self-hostable** — full data control, or use their cloud ($19/agent/mo)
- **Multi-channel out of the box** — WhatsApp, email, Telegram, Instagram, Messenger, live chat
- **API-first** — Application, Client, and Platform APIs
- **Webhook system** — Real-time event notifications
- **Contact management** — syncs with our CRM
- API Reference: https://developers.chatwoot.com/api-reference/introduction

### Chatwoot Setup per Org

Each org on our platform gets:
1. A Chatwoot **account** (via Platform API for self-hosted, or manual for cloud)
2. One or more **inboxes** (one per channel: WhatsApp inbox, email inbox, etc.)
3. An **agent bot** connected to our webhook endpoint
4. **Contacts** synced bidirectionally with our CRM

### Chatwoot ↔ L4YERCAK3 Data Model Mapping

| Chatwoot | L4YERCAK3 | Sync Direction |
|----------|-----------|----------------|
| Account | Organization | 1:1, created on org setup |
| Inbox | Channel binding (from org_agent) | 1:1 per channel |
| Contact | crm_contact (ontology) | Bidirectional |
| Conversation | Agent session | Created on first message |
| Message | Agent session transcript | Bidirectional |
| Agent (human) | Organization member | Read-only from L4YERCAK3 |
| Agent Bot | org_agent AI | Our webhook handles responses |

### Chatwoot Webhook Flow

```typescript
// convex/http.ts — new webhook endpoint
// POST /api/webhooks/chatwoot

export const chatwootWebhook = httpAction(async (ctx, request) => {
  const payload = await request.json();

  // Chatwoot sends events like:
  // message_created, message_updated, conversation_created,
  // conversation_status_changed, contact_created, etc.

  switch (payload.event) {
    case "message_created":
      // Only process customer messages (not agent/bot messages)
      if (payload.message_type === "incoming") {
        await ctx.runMutation(internal.agentPipeline.handleInboundMessage, {
          chatwootAccountId: payload.account.id,
          conversationId: payload.conversation.id,
          contactId: payload.sender.id,
          content: payload.content,
          channel: payload.inbox.channel_type,
          // Attachments, metadata, etc.
        });
      }
      break;

    case "conversation_status_changed":
      // Handle human takeover, resolution, etc.
      break;
  }

  return new Response("OK", { status: 200 });
});
```

### Sending Responses via Chatwoot API

```typescript
// convex/integrations/chatwoot.ts

async function sendAgentResponse(
  chatwootBaseUrl: string,
  apiToken: string,
  accountId: number,
  conversationId: number,
  message: string
) {
  const response = await fetch(
    `${chatwootBaseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_access_token": apiToken,
      },
      body: JSON.stringify({
        content: message,
        message_type: "outgoing",
        // Optional: private (internal note), content_type, etc.
      }),
    }
  );
  return response.json();
}
```

### CRM ↔ Chatwoot Contact Sync

```
New message on Chatwoot from unknown number
  │
  ├─► Chatwoot creates contact (phone/email)
  ├─► Webhook fires → our handler receives contact_created
  ├─► We check: does this phone/email exist in CRM?
  │     ├─ YES → Link Chatwoot contact ID to CRM contact
  │     └─ NO  → Create new crm_contact in ontology
  └─► Future messages carry CRM context to the agent

CRM contact updated in our platform
  │
  ├─► After mutation → sync to Chatwoot via API
  └─► Update Chatwoot contact with name, email, custom attributes
```

---

## Direct Outbound APIs (Already Spec'd)

These exist in the multichannel-automation docs and just need implementation:

### Email — Resend
- **Status**: Existing integration, working
- **File**: `convex/emailService.ts`
- **Spec**: `docs/plans/multichannel-automation/CONNECTIONS.md`

### SMS — Infobip
- **Status**: Fully spec'd, not yet implemented
- **File**: Will be `convex/messageDelivery.ts`
- **Spec**: `docs/plans/multichannel-automation/INFOBIP-INTEGRATION.md`
- **Cost**: ~€0.07-0.09 per SMS (Germany)

### WhatsApp — Meta Cloud API / Infobip
- **Status**: Fully spec'd, not yet implemented
- **File**: Will be `convex/oauth/whatsapp.ts`
- **Spec**: `docs/integrations/WHATSAPP_SETUP.md`
- **Note**: Per-org Meta OAuth — each org connects their own WABA, Meta bills them directly
- **Cost**: First 1,000 conversations/month FREE per WABA, then ~€0.05-0.07/utility message

---

## Social Media Channel Connectors (NEW)

These are net-new and power Phase 3 (Content Generation):

### Channel Abstraction Layer

```typescript
// convex/channels/channelRegistry.ts
// Inspired by OpenClaw's channel registry pattern
// See: /Users/foundbrand_001/Development/openclaw/src/channels/registry.ts

interface ChannelConnector {
  id: string;                    // "instagram", "facebook", "x", "linkedin", "tiktok"
  name: string;
  capabilities: {
    inbound: boolean;            // Can receive DMs/messages
    outbound: boolean;           // Can send DMs/messages
    posting: boolean;            // Can create posts/content
    stories: boolean;            // Can create stories/reels
    analytics: boolean;          // Can read engagement metrics
  };
  auth: {
    type: "oauth" | "api_key";
    provider: string;            // OAuth provider name
    scopes: string[];            // Required permissions
  };
  // Operations
  post: (ctx, content) => Promise<PostResult>;
  sendMessage: (ctx, to, message) => Promise<MessageResult>;
  getAnalytics: (ctx, postId) => Promise<AnalyticsResult>;
}
```

### Instagram (via Meta Graph API)
- **Auth**: Meta OAuth (same app as WhatsApp — one Meta app for all)
- **Capabilities**: Posts, Stories, Reels, DMs (via Chatwoot), Analytics
- **Scopes**: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
- **Posting API**: `POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish`
- **Note**: Requires Instagram Business/Creator account linked to Facebook Page

### Facebook (via Meta Graph API)
- **Auth**: Meta OAuth (shared Meta app)
- **Capabilities**: Page posts, Messenger (via Chatwoot), Analytics
- **Scopes**: `pages_manage_posts`, `pages_read_engagement`
- **Posting API**: `POST /{page-id}/feed`

### X / Twitter (via X API v2)
- **Auth**: OAuth 2.0 with PKCE
- **Capabilities**: Tweets, replies, DMs, Analytics
- **Scopes**: `tweet.read`, `tweet.write`, `dm.read`, `dm.write`, `users.read`
- **Posting API**: `POST /2/tweets`
- **Cost**: Free tier: 1,500 tweets/month. Basic ($200/mo): 3,000 tweets/month

### LinkedIn (via LinkedIn API)
- **Auth**: OAuth 2.0
- **Capabilities**: Company page posts, Analytics
- **Scopes**: `w_organization_social`, `r_organization_social`
- **Posting API**: `POST /rest/posts` (UGC API)
- **Note**: Requires LinkedIn Company Page admin access

### TikTok (via Content Posting API)
- **Auth**: OAuth 2.0
- **Capabilities**: Video posts
- **Scopes**: `video.upload`, `video.publish`
- **Note**: Video-only, requires TikTok Developer account approval

---

## Connection Setup Flow (per Org)

```
Org Settings → Integrations → "Connect Channel"
  │
  ├─► Messaging Channels
  │     ├─ WhatsApp    → Meta OAuth → stores WABA credentials
  │     ├─ Email       → Resend API key → stores encrypted
  │     ├─ SMS         → Infobip API key → stores encrypted
  │     ├─ Instagram DM → via Chatwoot inbox
  │     ├─ Telegram    → via Chatwoot inbox
  │     └─ Live Chat   → Chatwoot widget embed code
  │
  ├─► Social Media
  │     ├─ Instagram   → Meta OAuth (shared with WhatsApp)
  │     ├─ Facebook    → Meta OAuth (shared)
  │     ├─ X/Twitter   → X OAuth 2.0
  │     ├─ LinkedIn    → LinkedIn OAuth 2.0
  │     └─ TikTok      → TikTok OAuth 2.0
  │
  └─► Stored in oauthConnections table
        provider: "meta" | "x" | "linkedin" | "tiktok" | "infobip" | "resend" | "chatwoot"
        organizationId: <org>
        accessToken: <encrypted>
        customProperties: { pageId, igUserId, phoneNumberId, ... }
```

---

## What to Build vs What's Already Spec'd

### Already Spec'd (implement from existing docs)
- [ ] Resend connection UI and backend (`CONNECTIONS.md`)
- [ ] Infobip connection UI and backend (`CONNECTIONS.md`)
- [ ] Infobip SMS delivery (`INFOBIP-INTEGRATION.md`)
- [ ] WhatsApp Meta OAuth flow (`WHATSAPP_SETUP.md`)
- [ ] Message queue and delivery router (`ARCHITECTURE.md`, `SCHEMA.md`)
- [ ] Sequence engine and cron processor (`IMPLEMENTATION-CHECKLIST.md`)

### New to Build
- [ ] Chatwoot integration module (`convex/integrations/chatwoot.ts`)
- [ ] Chatwoot webhook handler in `convex/http.ts`
- [ ] Chatwoot ↔ CRM contact sync
- [ ] Channel abstraction layer (`convex/channels/channelRegistry.ts`)
- [ ] Instagram posting connector
- [ ] Facebook posting connector
- [ ] X/Twitter posting connector
- [ ] LinkedIn posting connector
- [ ] TikTok posting connector
- [ ] Social media connection UI in integrations window
- [ ] Agent inbound pipeline (message → agent → response → channel)

### To Deprecate/Replace
- [ ] `convex/integrations/manychat.ts` → Replace with Chatwoot
- [ ] `convex/integrations/pushover.ts` → Replace with Chatwoot notifications + native
- [ ] ManyChat webhook in `convex/http.ts` → Replace with Chatwoot webhook

---

## Implementation Priority

### Step 1: Chatwoot Core Integration
- Set up Chatwoot (self-hosted Docker or cloud account)
- Create `convex/integrations/chatwoot.ts` (API client)
- Add Chatwoot webhook endpoint to `convex/http.ts`
- Wire webhook → agent pipeline (from Phase 1)

### Step 2: Implement Existing Multichannel Specs
- Follow `IMPLEMENTATION-CHECKLIST.md` Phases 0-4
- Resend + Infobip connections
- Message queue + delivery router
- SMS and WhatsApp delivery

### Step 3: CRM ↔ Chatwoot Sync
- Contact creation/update sync (bidirectional)
- Conversation → agent session mapping
- Message history sync

### Step 4: Social Media Connectors
- Meta OAuth for Instagram + Facebook posting
- X/Twitter OAuth + posting
- LinkedIn OAuth + posting
- (TikTok later — requires video content)

### Step 5: Unified Channel UI
- Integrations window showing all connected channels
- Per-channel status and health monitoring
- Channel-specific settings (sender ID, templates, etc.)

---

## Security Considerations

- **Per-org credentials**: Each org connects their own accounts (no shared platform accounts)
- **OAuth token refresh**: Track expiry, prompt re-auth (Meta tokens: 60 days)
- **Webhook signature verification**: Validate Chatwoot webhook signatures
- **Rate limiting**: Respect per-channel API limits (X: 1,500 tweets/mo free, WhatsApp: tiered)
- **Content moderation**: Agent guardrails prevent inappropriate posts (from Phase 1)
- **GDPR compliance**: Contact opt-in tracking, message retention policies

---

## OpenClaw Reference Patterns

| Pattern | OpenClaw Location | How We Adapt |
|---------|------------------|-------------|
| Channel registry | `src/channels/registry.ts` | Our `channelRegistry.ts` abstraction |
| Channel plugin structure | `src/channels/plugins/*/index.ts` | Per-connector module pattern |
| Multi-account per channel | `config.channels.whatsapp.accounts` | Per-org credential isolation |
| Delivery context | `src/channels/delivery-context.ts` | Route responses back to correct channel |
| Channel lifecycle | `src/gateway/server-channels.ts` | Start/stop/reload channel connections |
