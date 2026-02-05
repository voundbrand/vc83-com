# 06 — WhatsApp Native

> First-class WhatsApp Business API integration. The DACH non-negotiable.

---

## Why This Is Non-Negotiable

From ICP research (Insight #2): *"93% penetration in DACH. GHL doesn't have WhatsApp. In Germany that's a dealbreaker."*

WhatsApp is how the plumber's customer contacts the plumber. Not email. Not SMS. Not a contact form. WhatsApp. If the agent can't answer WhatsApp, the product doesn't work in DACH.

---

## Current State

We have three paths to WhatsApp already built:

| Provider | File | How It Works | Self-Service? |
|----------|------|--------------|---------------|
| Chatwoot | `channels/providers/chatwoot.ts` | WhatsApp via Chatwoot inbox | No — requires Chatwoot account + setup |
| ManyChat | `channels/providers/manychatAdapter.ts` | WhatsApp via ManyChat | No — requires ManyChat account |
| WhatsApp Direct | `channels/providers/whatsappProvider.ts` | Meta Cloud API directly | Partial — OAuth exists but no onboarding flow |

**The gap:** All three require manual configuration. The agency owner can't just enter a phone number and go.

---

## Target: Self-Service WhatsApp Onboarding

### The Flow

```
1. Agency opens Integrations → WhatsApp
2. Clicks "Connect WhatsApp Business Number"
3. Redirected to Meta's Embedded Signup flow
4. Selects/creates WhatsApp Business Account
5. Selects phone number to connect
6. Grants permissions (messaging, webhooks)
7. Redirected back to platform
8. Platform stores access token (encrypted)
9. Webhook auto-registered for this phone number
10. WhatsApp channel is now live for this org
```

### Meta Embedded Signup

Meta provides an Embedded Signup flow specifically for ISV platforms like ours:
- `https://developers.facebook.com/docs/whatsapp/embedded-signup`
- User signs up for WhatsApp Business through our platform's UI
- We receive their WABA ID + phone number ID + access token
- We register our webhook URL for their number
- Messages flow directly to our webhook endpoint

### What We Need

1. **Meta Business App registration** (one-time, platform-level)
   - Register as a Tech Provider with Meta
   - Get approved for Embedded Signup
   - Configure webhook URL: `https://[our-domain]/webhooks/whatsapp`

2. **Embedded Signup UI component** (~200 lines)
   - Button that launches Meta's signup popup
   - Callback handler that receives the credentials
   - Store WABA ID, phone number ID, access token in `oauthConnections`

3. **Webhook handler** (already exists in `convex/channels/webhooks.ts`)
   - `processWhatsAppWebhook` — already normalizes and routes to agent pipeline
   - Needs: phone number → org resolution (already exists: `resolveOrgFromWhatsAppPhoneNumberId`)

4. **Message templates** (required by Meta for outbound)
   - Businesses can only initiate conversations using pre-approved templates
   - We need a template management UI for common messages:
     - "Thank you for contacting us. We'll respond shortly."
     - "Your appointment is confirmed for [DATE] at [TIME]."
     - "We noticed you were interested in [SERVICE]. Can we help?"

---

## Architecture

### Inbound (Customer → Agent)
```
Customer sends WhatsApp message
    ↓
Meta Cloud API webhook → POST /webhooks/whatsapp
    ↓
processWhatsAppWebhook (already exists)
    ↓
Resolve org from phone number ID
    ↓
processInboundMessage (existing agent pipeline)
    ↓
Agent responds
    ↓
channels.router.sendMessage → WhatsApp provider → Meta API
    ↓
Customer receives response in WhatsApp
```

### Outbound (Agent → Customer)
```
Agent decides to send follow-up
    ↓
Check: is there an active conversation window? (24h rule)
  YES → send free-form message via Meta API
  NO → must use approved message template
    ↓
channels.router.sendMessage → whatsappProvider.sendMessage
    ↓
Customer receives message in WhatsApp
```

### 24-Hour Rule
Meta enforces: after 24h of customer inactivity, you can only send template messages. This matters for follow-up sequences. The agent must know:
- If customer last messaged <24h ago → free-form reply OK
- If customer last messaged >24h ago → must use template

Store `lastCustomerMessageAt` on the session. Check before sending outbound.

---

## Pricing Implications

Meta charges per conversation:
- Business-initiated: ~€0.07 per conversation (DACH)
- User-initiated: ~€0.04 per conversation (DACH)
- 1,000 free user-initiated conversations per month

These costs should be transparent to the agency owner but abstracted:
- Option A: Include in platform credits (1 WhatsApp conversation = X credits)
- Option B: Pass through directly (agency connects own Meta billing)
- **Recommendation:** Option A for simplicity. Factor Meta costs into credit pricing.

---

## Build Effort

| Component | Effort | Status |
|-----------|--------|--------|
| WhatsApp provider | Done | `channels/providers/whatsappProvider.ts` |
| Webhook processing | Done | `channels/webhooks.ts` |
| Org resolution | Done | `resolveOrgFromWhatsAppPhoneNumberId` |
| Embedded Signup UI | Build | ~200 lines (integrations window) |
| Meta Business App registration | Config | One-time setup |
| Message template management | Build | ~300 lines (UI + backend) |
| 24h window tracking | Build | ~50 lines (session update) |
| **Total new code** | | **~550 lines** |

---

## Phasing

### Phase 1: Connect via existing WhatsApp provider
- Agency manually enters WABA credentials in integrations window
- Works but not self-service
- Unblocks early adopters

### Phase 2: Embedded Signup (self-service)
- Meta Embedded Signup flow
- One-click connect
- This is the ICP experience

### Phase 3: Message templates + outbound
- Template management UI
- 24h window enforcement
- Follow-up sequence integration
