# AI Chat & Tools Implementation - Session Handoff

## 🎯 Context: Where We Are

### Current Session Summary
We just completed comprehensive internationalization of the AI Settings page with German price formatting. Before that, we were working on AI chat functionality, tool integration, and CRM connections.

### ⚠️ Outstanding Issue
**API Error encountered** - User wants to discuss this in next session.

---

## 🏗️ AI Infrastructure Overview

### Architecture Type: **Single LLM + Function Calling (NOT Multi-Agent)**

```
User → AI Chat → OpenRouter (Claude/GPT) → Function Calling (Tools) → Backend
```

**What you HAVE:**
- ✅ Single LLM call via OpenRouter
- ✅ Function calling (LLM can invoke your backend tools)
- ✅ Conversation history stored in database
- ✅ Platform API key (not BYOK - that's shelved)

**What you DON'T have:**
- ❌ Multi-agent orchestration
- ❌ Autonomous agent loops
- ❌ Agent-to-agent communication

### Key Files

**Backend (Convex):**
- `convex/ai/chat.ts` - Main chat handler with OpenRouter integration
- `convex/ai/tools/registry.ts` - Tool registry for function calling
- `convex/ai/tools/bulkCRMEmailTool.ts` - Bulk email tool (NEW)
- `convex/ai/tools/contactSyncTool.ts` - Contact sync tool (NEW)
- `convex/ai/settings.ts` - AI settings management
- `convex/ai/billing.ts` - Subscription & usage tracking
- `convex/ai/campaigns.ts` - Email campaign tracking (NEW)
- `convex/ai/contactSyncs.ts` - Contact sync tracking (NEW)

**Frontend:**
- `src/components/window-content/org-owner-manage-window/ai-settings-tab-v3.tsx` - AI Settings UI
- `src/hooks/use-ai-config.ts` - AI configuration hook

**Schemas:**
- `convex/schemas/aiSchemas.ts` - AI settings & conversations
- `convex/schemas/aiBillingSchemas.ts` - Subscriptions, usage, tokens
- `convex/schemas/contactSyncSchemas.ts` - Contact sync tracking (NEW)

---

## 🔧 AI Tools Implemented

### 1. **Bulk CRM Email Tool** (`bulkCRMEmailTool.ts`)

**Purpose:** Send personalized bulk emails to CRM contacts with AI tone adjustment

**Status:** ✅ File created, ⚠️ Needs testing

**Key Features:**
- Target contacts by: all contacts, tags, lifecycle stage, custom filter
- AI tone: professional, friendly, casual, formal
- Personalization: name, company, custom fields
- Campaign tracking via `convex/ai/campaigns.ts`

**Current Issues:**
- Session object access pattern fixed (was using `session.user`, now uses `session.organizationId`)
- Internal API exports commented out (tool functions moved to separate files)

**What It Does:**
```typescript
// 1. User selects contacts to email
// 2. AI generates personalized emails for each contact
// 3. Tracks campaign in emailCampaigns
// 4. Sends emails (integration TBD)
```

### 2. **Contact Sync Tool** (`contactSyncTool.ts`)

**Purpose:** Sync contacts from Microsoft/Google into CRM

**Status:** ✅ File created, ⚠️ Needs testing

**Key Features:**
- Preview mode: Show what will sync before executing
- Execute mode: Actually sync contacts
- Supports: Microsoft Graph API, Google Contacts
- Deduplication: email-based matching
- Tracking via `convex/ai/contactSyncs.ts`

**Current Issues:**
- Session object access pattern fixed
- Internal API exports commented out

**What It Does:**
```typescript
// 1. Connect to Microsoft/Google OAuth
// 2. Fetch contacts from provider
// 3. Match against existing CRM contacts
// 4. Create/update contacts in CRM
// 5. Track sync stats
```

### 3. **Existing Tools** (In Registry)

From `convex/ai/tools/registry.ts`:
- Form creation tools
- Event management tools
- Contact search tools
- (And more...)

---

## 🔌 OAuth & CRM Integration

### Microsoft OAuth Connection

**Status:** ✅ Implemented

**Flow:**
```
1. User → Integrations Tab → Connect Microsoft
2. OAuth redirect to Microsoft
3. Callback receives tokens
4. Stores in oauthConnections table
5. AI tools can use connection to access Graph API
```

**Key Files:**
- `convex/oauthConnections.ts` - Store/retrieve OAuth tokens
- `src/app/api/oauth/microsoft/callback/route.ts` - OAuth callback handler

### CRM Contacts Schema

**Table:** `objects` (using ontology pattern)
- `type`: "contact"
- `organizationId`: Organization owning the contact
- `customProperties`: Flexible schema for contact data
  - name, email, phone, company, lifecycle stage, tags, etc.

---

## 💰 AI Billing & Subscriptions

### Current Setup: **Platform Key Mode (Manual Grants)**

**Super Admin Workflow:**
```
1. Super Admin → Organizations → Select Org → Licensing Tab
2. Grant Manual Subscription:
   - Standard (€49/month): 500K tokens
   - Privacy-Enhanced (€49/month): 500K tokens, GDPR-compliant
   - Private LLM (€2,999-14,999/month): Self-hosted
3. Customer → AI Settings → Enable AI → Select Models → Use AI Chat
```

**What's Working:**
- ✅ Manual subscription grants
- ✅ Usage tracking (tokens)
- ✅ Platform provides OpenRouter API key
- ✅ Organizations don't need their own keys

**What's Shelved:**
- ❌ BYOK (Bring Your Own Key) - super admin detection not implemented
- ❌ Self-service subscription purchasing

**Test Checklist:**
See `/Users/foundbrand_001/Development/vc83-com/TEST_AI_MANUAL_GRANT.md`

---

## 📊 Recent Changes (This Session)

### 1. **AI Settings Translations** (COMPLETED ✅)
- Added 282 translations (47 keys × 6 languages)
- Fixed German Euro formatting: €2.999 instead of €2,999
- Entire AI Settings page now fully translated

### 2. **Tool Bug Fixes** (COMPLETED ✅)
- Fixed session object access in `bulkCRMEmailTool.ts`
- Fixed session object access in `contactSyncTool.ts`
- Created separate files for campaign/sync tracking

### 3. **Button Styling Fixes** (COMPLETED ✅)
- Fixed AI Settings buttons (were invisible in dark mode)
- Updated to retro button style matching Store window
- Added missing translations for button text

### 4. **Dark Mode Border Fixes** (COMPLETED ✅)
- Added missing CSS variables for dark mode borders
- Fixed white separator lines in multi-window UI

---

## 🚨 Known Issues to Address

### 1. **API Error** (PRIORITY)
- User encountered an API error
- Needs investigation in next session
- Context: Working on AI chat/tools/CRM connections

### 2. **Tool Testing Needed**
- Bulk email tool never tested end-to-end
- Contact sync tool never tested end-to-end
- Microsoft OAuth integration needs testing
- Need to verify tool registry properly exports new tools

### 3. **Internal API Exports**
Some tool functions are commented out:
```typescript
// convex/ai/tools/bulkCRMEmailTool.ts:217
// await ctx.runMutation(internal.ai.tools.bulkCRMEmailTool.createCampaign, ...)
```
**Reason:** `internal.ai.tools` doesn't exist - tools folder not exported in `_generated/api.ts`

**Solution:** Functions moved to:
- `convex/ai/campaigns.ts` → `api.ai.campaigns.createCampaign`
- `convex/ai/contactSyncs.ts` → `api.ai.contactSyncs.createSyncRecord`

### 4. **Missing Integrations**
- Email sending service not connected (Resend? SendGrid?)
- Microsoft Graph API calls stubbed out
- Google Contacts API not implemented

---

## 📝 Next Steps (Recommended Order)

### 1. **Investigate API Error** ⚠️
- User wants to discuss the API error first
- Gather details: What endpoint? What was the request? Error message?

### 2. **Test AI Chat with Tools**
```bash
# Grant AI subscription to test org
# Enable AI in settings
# Open AI chat
# Try: "Sync my Microsoft contacts to CRM"
# Try: "Send a bulk email to all contacts tagged 'newsletter'"
```

### 3. **Implement Missing Services**
- Email sending integration (Resend/SendGrid)
- Complete Microsoft Graph API calls
- Test OAuth flow end-to-end

### 4. **Fix Tool Registry**
- Verify new tools (bulkCRMEmailTool, contactSyncTool) are registered
- Test function calling works
- Ensure LLM can discover and invoke tools

### 5. **Production Testing**
- Follow `TEST_AI_MANUAL_GRANT.md` checklist
- Test with real customer organization
- Verify token tracking works

---

## 💡 Important Notes

### Session Object Pattern
```typescript
// ❌ OLD (broken):
session.user?.defaultOrgId
session.user._id

// ✅ NEW (correct):
session.organizationId
session.userId
```

### Price Formatting (German)
```typescript
// For cents (€49):
formatPrice(4900) // → "49,00 €"

// For whole euros (€2,999):
formatLargePrice(2999) // → "2.999 €" (German period for thousands)
```

### Database Tables
```
AI Billing: aiSubscriptions, aiUsage, aiTokenBalance
AI Chat: aiConversations, aiMessages, aiSettings
Tracking: campaigns (via objects), contactSyncs (via objects)
OAuth: oauthConnections
CRM: contacts (via objects table with type="contact")
```

---

## 🔍 Debugging Commands

```bash
# Check AI settings for org
# In Convex dashboard → Data → organizationAiSettings

# Check subscriptions
# In Convex dashboard → Data → aiSubscriptions

# Check OAuth connections
# In Convex dashboard → Data → oauthConnections

# View tool registry
# Read: convex/ai/tools/registry.ts

# Test OpenRouter connection
# Check: process.env.OPENROUTER_API_KEY in Convex dashboard
```

---

## 📞 Questions to Ask User in Next Session

1. **What was the API error?**
   - Which endpoint/operation failed?
   - Error message?
   - Stack trace?

2. **What were you trying to do?**
   - Testing AI chat?
   - Testing contact sync?
   - Testing bulk email?

3. **Current environment?**
   - Development or production?
   - Which organization?
   - Do they have an active AI subscription?

4. **What should we prioritize?**
   - Fix the error first?
   - Complete tool implementation?
   - Test end-to-end workflow?

---

## 🎯 Session Goals (Proposed)

### Immediate (This Session):
1. ✅ Fix API error
2. ✅ Test one tool end-to-end
3. ✅ Verify OAuth flow works

### Short Term (Next 1-2 Sessions):
1. Complete email sending integration
2. Test all tools with real data
3. Document tool usage for customers

### Long Term:
1. Self-service subscription purchasing
2. More AI tools (calendar, tasks, etc.)
3. BYOK implementation (if needed)

---

**Last Updated:** 2025-12-03
**Git Commit:** e59a1a0
**Branch:** main
