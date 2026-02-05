# Zapier Integration - Continuation Prompt

**Use this prompt to continue where we left off:**

---

## 📋 Context Prompt

```
I'm building a Zapier integration for my l4yercak3 platform (VC83.com).

We've completed the core implementation (6-8 hours):
- Zapier CLI app in /Users/foundbrand_001/Development/l4yercak3-zapier/
- Backend webhook system in convex/zapier/webhooks.ts and convex/zapier/triggers.ts
- Database schema added (webhookSubscriptions table)
- OAuth 2.0 authentication configured
- Triggers: Community Subscription (REST Hook), New Contact (polling)
- Actions: Create Contact, Find Contact

What's remaining (2-3 hours):

1. Add HTTP routes to convex/http.ts for:
   - POST /api/v1/webhooks/subscribe
   - DELETE /api/v1/webhooks/:id
   - GET /api/v1/community/subscriptions (for Zapier testing)

2. Integrate Community trigger into convex/onboarding.ts:
   - After createCommunityAccountFromStripe() succeeds
   - Call internal.zapier.triggers.triggerCommunitySubscriptionCreated()

3. Create documentation:
   - .env.example for l4yercak3-zapier app
   - README.md with setup instructions

4. Test end-to-end:
   - Zapier app locally
   - OAuth connection
   - Community → Skool automation

Key files to read:
- /Users/foundbrand_001/Development/vc83-com/convex/http.ts (add webhook routes)
- /Users/foundbrand_001/Development/vc83-com/convex/onboarding.ts (integrate trigger)
- /Users/foundbrand_001/Development/vc83-com/convex/zapier/webhooks.ts (webhook management)
- /Users/foundbrand_001/Development/vc83-com/convex/zapier/triggers.ts (trigger functions)
- /Users/foundbrand_001/Development/l4yercak3-zapier/index.js (Zapier app config)

Documentation to reference:
- /Users/foundbrand_001/Development/vc83-com/docs/pricing-and-trials/ZAPIER-INTEGRATION-SUMMARY.md (complete overview)
- /Users/foundbrand_001/Development/vc83-com/docs/pricing-and-trials/ZAPIER-CLI-INTEGRATION.md (detailed guide)
- /Users/foundbrand_001/Development/vc83-com/docs/pricing-and-trials/ZAPIER-SKOOL-AUTOMATION.md (use case details)

Architecture:
- Multi-tenant: Each OAuth connection scoped to ONE organization
- l4yercak3 will create an org, get OAuth credentials, use for landing page automation
- Other customers can create their own orgs and build custom Zaps

Use case: When user subscribes to Community (€9/mo) → auto-create Skool member via Zapier

Let's finish the remaining 2-3 hours of work!
```

---

## 🎯 What You'll Ask Claude to Do

1. **"Add the HTTP webhook routes to convex/http.ts"**
   - POST /api/v1/webhooks/subscribe
   - DELETE /api/v1/webhooks/:id
   - GET /api/v1/community/subscriptions

2. **"Integrate the Community trigger into convex/onboarding.ts"**
   - Find createCommunityAccountFromStripe action
   - Add triggerCommunitySubscriptionCreated call

3. **"Create .env.example and README for l4yercak3-zapier"**
   - Document required environment variables
   - Setup and deployment instructions

4. **"Help me test the integration locally"**
   - Test Zapier CLI app
   - Test webhook subscription
   - Verify Community → Skool flow

---

## 📂 Key File Locations

**Platform Backend:**
```
convex/
├── http.ts                          ← ADD: webhook routes here
├── onboarding.ts                    ← ADD: Community trigger here
├── zapier/
│   ├── webhooks.ts                  ← DONE: subscription management
│   └── triggers.ts                  ← DONE: webhook triggers
└── schemas/
    └── coreSchemas.ts               ← DONE: webhookSubscriptions schema
```

**Zapier App:**
```
l4yercak3-zapier/
├── authentication.js                ← DONE: OAuth config
├── index.js                         ← DONE: app registration
├── triggers/
│   ├── community_subscription.js    ← DONE: REST hook
│   └── new_contact.js               ← DONE: polling
├── creates/
│   └── create_contact.js            ← DONE: action
├── searches/
│   └── find_contact.js              ← DONE: search
├── .env.example                     ← TODO: create this
└── README.md                        ← TODO: update this
```

---

## 🔑 Important Context

**OAuth Token Flow:**
- User authorizes via vc83.com/oauth/authorize
- Platform issues JWT with organizationId
- Zapier stores access_token + refresh_token
- All webhook subscriptions scoped to that organizationId

**Community Subscription Event:**
- Stripe webhook → checkout.session.completed
- Platform creates account (plan: "free", communitySubscription.active: true)
- Platform triggers: triggerCommunitySubscriptionCreated()
- Query webhookSubscriptions for event "community_subscription_created"
- Send HTTP POST to all targetUrls (Zapier's webhook URLs)
- Zapier Zap receives webhook → creates Skool member

**Multi-Tenancy:**
- webhookSubscriptions table has organizationId column
- Each subscription is scoped to ONE org
- l4yercak3 org sees ONLY l4yercak3 webhooks
- Acme Corp sees ONLY Acme Corp webhooks

---

## ✅ Verification Checklist

After completion, verify:
- [ ] HTTP routes respond correctly (test with curl/Postman)
- [ ] Community trigger fires after subscription
- [ ] Webhook payload matches Zapier trigger schema
- [ ] Zapier CLI app tests pass (`zapier test`)
- [ ] OAuth connection works in Zapier UI
- [ ] End-to-end: Stripe checkout → Skool member created

---

## 🚀 Ready to Continue!

Use the context prompt above to continue with fresh Claude context.
Estimated time remaining: 2-3 hours.

---

**Pro Tip:** Read ZAPIER-INTEGRATION-SUMMARY.md first for the complete picture!
