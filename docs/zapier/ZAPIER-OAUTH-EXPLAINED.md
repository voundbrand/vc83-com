# Zapier OAuth Architecture - Clarification

## 🔴 Two Different "Clients" (Don't Mix Them Up!)

### 1. **Platform-Level Zapier App** (YOU set up ONCE)

This is the **l4yercak3 Zapier integration** - the app that appears in Zapier's directory.

**Who:** l4yercak3 platform owner (you)
**When:** ONE TIME during initial setup
**Where:** Zapier Developer Portal

```bash
# Register your Zapier app with Zapier
cd l4yercak3-zapier
zapier register "l4yercak3"
```

**What Zapier gives you:**
- Zapier App ID (e.g., `App123456CLIAPI`)
- CLIENT_ID (for OAuth flow)
- CLIENT_SECRET (for OAuth flow)

**Where to find them:**
- https://developer.zapier.com/apps
- Click your "l4yercak3" app → "OAuth Settings"

**These go in:** `l4yercak3-zapier/.env`

---

### 2. **User-Level OAuth Connection** (EACH user does this)

This is when **end users connect THEIR l4yercak3 account** to Zapier.

**Who:** Any l4yercak3 user (you, your customers, etc.)
**When:** When creating a Zap
**Where:** Zapier's Zap editor

**Flow:**
```
1. User creates Zap
2. Clicks "Connect l4yercak3 account"
3. Zapier redirects to: https://vc83.com/oauth/authorize
4. User LOGS IN with their existing l4yercak3 email/password
5. User sees consent screen: "Allow Zapier to access your account?"
6. User clicks "Approve"
7. Platform redirects back to Zapier with authorization code
8. Zapier exchanges code for access token (using YOUR CLIENT_SECRET)
9. Access token is scoped to THIS user's organization
10. User builds Zap using their data
```

**Users DON'T need to:**
- ❌ Create an OAuth client in your platform
- ❌ Generate API keys manually
- ❌ Configure redirect URLs
- ❌ Set up credentials

**Users ONLY need to:**
- ✅ Have a l4yercak3 account (email + password)
- ✅ Click "Connect l4yercak3" in Zapier
- ✅ Log in
- ✅ Approve access

---

## 🎯 The Confusion: What's the Difference?

### ❌ WRONG Mental Model
> "Each user needs to create an OAuth client in my platform to use Zapier"

### ✅ CORRECT Mental Model
> "I create ONE Zapier app (with OAuth credentials from Zapier). Then ANY user can connect their account by just logging in."

---

## 🔄 OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM SETUP (ONE TIME)                    │
└─────────────────────────────────────────────────────────────────┘

YOU (Platform Owner):
1. Register Zapier app: zapier register "l4yercak3"
2. Get CLIENT_ID and CLIENT_SECRET from Zapier
3. Add to l4yercak3-zapier/.env
4. Deploy: zapier push

┌─────────────────────────────────────────────────────────────────┐
│                    USER FLOW (EACH USER)                        │
└─────────────────────────────────────────────────────────────────┘

End User (e.g., John):
1. Opens Zapier → Create Zap
2. Selects "l4yercak3" app (from Zapier directory)
3. Clicks "Connect l4yercak3 account"

Zapier:
4. Redirects to: https://vc83.com/oauth/authorize?
   - client_id=YOUR_ZAPIER_APP_CLIENT_ID
   - redirect_uri=https://zapier.com/...
   - response_type=code
   - scope=contacts:read,contacts:write,community:read

Your Platform (vc83.com):
5. Shows login page (if not logged in)
6. John logs in with email/password
7. Shows consent screen: "Allow Zapier to access your contacts?"
8. John clicks "Approve"
9. Redirects back: https://zapier.com/...?code=ABC123

Zapier:
10. Exchanges code for token:
    POST https://vc83.com/oauth/token
    {
      grant_type: "authorization_code",
      code: "ABC123",
      client_id: YOUR_ZAPIER_APP_CLIENT_ID,
      client_secret: YOUR_ZAPIER_APP_CLIENT_SECRET
    }

Your Platform:
11. Validates code
12. Returns access token: { access_token: "XYZ789", scope: "orgId:john_org_123" }

Zapier:
13. Stores token
14. Uses token for ALL API calls for John's Zaps:
    GET https://vc83.com/api/v1/crm/contacts
    Authorization: Bearer XYZ789

Your Platform:
15. Validates token → scoped to John's organization
16. Returns ONLY John's data
```

---

## 🏗️ Multi-Tenant Architecture

**Key Insight:** All users use the SAME Zapier app (with SAME CLIENT_ID/SECRET), but each gets a token scoped to THEIR data.

```
┌─────────────────────────────────────────────────────────┐
│          ONE Zapier App (l4yercak3)                     │
│  CLIENT_ID: zapier_app_12345                            │
│  CLIENT_SECRET: secret_abc123                           │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  User A       │  │  User B       │  │  You          │
│  Logs in      │  │  Logs in      │  │  Log in       │
│  ↓            │  │  ↓            │  │  ↓            │
│  Token A      │  │  Token B      │  │  Token C      │
│  ↓            │  │  ↓            │  │  ↓            │
│  Org A data   │  │  Org B data   │  │  Your org     │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 📋 Setup Checklist

### Platform Owner (YOU - ONE TIME)

- [ ] 1. Install Zapier CLI: `npm install -g zapier-platform-cli`
- [ ] 2. Login to Zapier: `zapier login`
- [ ] 3. Register app: `zapier register "l4yercak3"`
- [ ] 4. Go to https://developer.zapier.com/apps
- [ ] 5. Click "l4yercak3" → "OAuth Settings"
- [ ] 6. Copy CLIENT_ID and CLIENT_SECRET
- [ ] 7. Add to `l4yercak3-zapier/.env`
- [ ] 8. Set API_BASE_URL in `.env`
- [ ] 9. Test: `zapier test`
- [ ] 10. Deploy: `zapier push`

### End Users (EACH USER - WHEN THEY CREATE ZAPS)

- [ ] 1. Create Zap in Zapier
- [ ] 2. Select "l4yercak3" trigger/action
- [ ] 3. Click "Connect l4yercak3 account"
- [ ] 4. Log in with existing l4yercak3 credentials
- [ ] 5. Approve access
- [ ] 6. Build Zap!

---

## 🎯 Your Use Case: Community → Skool

**Scenario:** When someone subscribes to Community tier (€9/mo) on YOUR landing page, auto-create Skool member.

**Setup (YOU do this ONCE):**

1. Register Zapier app (done above)
2. Create Zap in YOUR Zapier account:
   - Trigger: "l4yercak3 - Community Subscription Created"
   - Action: "Skool - Add Member"
3. Connect YOUR l4yercak3 account (via OAuth login)
4. Connect YOUR Skool account
5. Map fields: email, firstName, lastName, courses
6. Turn on Zap

**What happens automatically:**

1. User subscribes to Community on landing page
2. Stripe webhook fires → `customer.subscription.created`
3. Platform creates/updates account
4. Platform calls: `internal.zapier.triggers.triggerCommunitySubscriptionCreated()`
5. Webhook sent to Zapier: `https://hooks.zapier.com/...`
6. YOUR Zap runs (using YOUR Skool credentials)
7. User is added to Skool with course access

**Multi-tenant future:** Other customers can create THEIR OWN Community → Skool Zaps using THEIR Skool accounts!

---

## 🔧 Technical Details

### OAuth Endpoints (Backend - Already Implemented)

```typescript
// convex/http.ts

// 1. Authorization endpoint (shows login + consent)
GET /oauth/authorize
  → Shows login form if not authenticated
  → Shows consent screen: "Allow Zapier to access...?"
  → Redirects back with authorization code

// 2. Token exchange endpoint
POST /oauth/token
  → Validates authorization code
  → Returns access token scoped to user's organization

// 3. Token revocation endpoint
POST /oauth/revoke
  → Invalidates access token
```

### Webhook Endpoints (Backend - Already Implemented)

```typescript
// convex/http.ts

// Subscribe to webhook (called by Zapier when Zap is turned on)
POST /api/v1/webhooks/subscribe
{
  "event": "community_subscription_created",
  "target_url": "https://hooks.zapier.com/..."
}

// Unsubscribe (called when Zap is turned off)
DELETE /api/v1/webhooks/:id

// List subscriptions (for testing)
GET /api/v1/community/subscriptions
```

### Trigger Implementation (Backend - Already Implemented)

```typescript
// convex/stripe/platformWebhooks.ts

async function handleSubscriptionCreated(ctx, subscription) {
  // ... create subscription ...

  // ZAPIER INTEGRATION
  if (tier === "community") {
    await ctx.runAction(internal.zapier.triggers.triggerCommunitySubscriptionCreated, {
      organizationId,
      userId,
      email,
      firstName,
      lastName,
      stripeSubscriptionId,
    });
  }
}
```

---

## 🚀 Next Steps

1. **Register Zapier app**: `zapier register "l4yercak3"`
2. **Get credentials**: https://developer.zapier.com/apps
3. **Configure .env**: Add CLIENT_ID, CLIENT_SECRET, API_BASE_URL
4. **Test**: `zapier test`
5. **Deploy**: `zapier push`
6. **Connect YOUR account**: Create Zap → Connect l4yercak3
7. **Build Community → Skool Zap**
8. **Test end-to-end**: Subscribe to Community → Check Skool

---

## ❓ FAQ

**Q: Do my users need to create OAuth clients in the platform?**
A: No! They just log in with their existing account.

**Q: Where do CLIENT_ID and CLIENT_SECRET come from?**
A: From Zapier, when you register your Zapier app.

**Q: Can multiple users use the same Zapier app?**
A: Yes! Each gets a token scoped to their organization.

**Q: How does Zapier know which organization to use?**
A: The OAuth token includes the organization ID. When a user logs in and approves, the token is scoped to THEIR organization.

**Q: Can I test this without deploying to production?**
A: Yes! Use `zapier dev` for local testing with ngrok.

---

## 📚 Resources

- Zapier CLI Docs: https://github.com/zapier/zapier-platform/blob/main/packages/cli/README.md
- OAuth 2.0 Guide: https://platform.zapier.com/build/oauth
- REST Hooks Guide: https://platform.zapier.com/build/hook-trigger
- l4yercak3 Zapier README: /Users/foundbrand_001/Development/l4yercak3-zapier/README.md
