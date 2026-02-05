# Zapier + Skool Automation Plan
**Automated Skool member creation via platform CRM events**

**Created:** December 17, 2025
**Status:** Implementation Ready
**Priority:** HIGH - Enables Community Tier automation

---

## 🎯 Overview

This document outlines the Zapier integration strategy to **automatically create Skool members** when Community subscriptions are created on the platform.

**Why Zapier?**
- Skool has no public API for member creation
- Skool supports Zapier integration with custom course access
- Platform needs Zapier OAuth anyway (for customer Zaps)
- Solves two problems at once (Community automation + customer features)

---

## 🏗️ Architecture: Platform → Zapier → Skool

```
┌────────────────────────────────────────────────────────────┐
│ 1. STRIPE CHECKOUT COMPLETED                              │
│    User pays €9/mo for Community                           │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────┐
│ 2. PLATFORM CREATES ACCOUNT                                │
│    - User record (email, name)                             │
│    - Organization record (plan: free, communitySubscription)│
│    - CRM Contact record (with Community metadata)          │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────┐
│ 3. PLATFORM TRIGGERS ZAPIER WEBHOOK                        │
│    POST https://hooks.zapier.com/hooks/catch/xxx/yyy       │
│    {                                                        │
│      "trigger": "community_subscription_created",          │
│      "email": "user@example.com",                          │
│      "firstName": "John",                                  │
│      "lastName": "Doe",                                    │
│      "organizationId": "kh...",                            │
│      "customCourseAccess": ["foundations"]                 │
│    }                                                        │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────┐
│ 4. ZAPIER CREATES SKOOL MEMBER                             │
│    Action: Skool → Add Member                              │
│    - Email: {{email}}                                      │
│    - First Name: {{firstName}}                             │
│    - Last Name: {{lastName}}                               │
│    - Course Access: ["Foundations"]                        │
│    - Auto-approve: Yes                                     │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────┐
│ 5. SKOOL SENDS WELCOME EMAIL                               │
│    User receives:                                           │
│    - "You've been added to l4yercak3"                      │
│    - Login credentials (Skool handles this)                │
│    - Direct link to Foundations Course                     │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────┐
│ 6. PLATFORM MARKS SKOOL INVITED                            │
│    Updates organization:                                    │
│    communitySubscription.skoolInviteSent = true            │
│    communitySubscription.skoolInvitedAt = now              │
└────────────────────────────────────────────────────────────┘
```

---

## 🔌 Platform Zapier Integration (NEW!)

### Phase 1: Build Zapier OAuth Integration

**Why This Matters:**
- Community tier needs to trigger Skool invites → requires Zapier
- Platform needs to expose CRM triggers for customer Zaps → requires Zapier
- This solves BOTH problems at once!

**What We're Building:**
1. **OAuth 2.0 server** (for Zapier to authenticate)
2. **Webhook triggers** (so Zapier knows when events happen)
3. **Polling API** (for Zapier to fetch new CRM contacts/orgs)
4. **Actions API** (for customers to create contacts/orgs from Zaps)

---

### Implementation Files

#### File 1: `convex/zapier/oauth.ts`
OAuth endpoints for Zapier authentication.

```typescript
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";

/**
 * ZAPIER OAUTH INTEGRATION
 *
 * Implements OAuth 2.0 for Zapier app connections.
 * Users authorize Zapier to access their VC83 organization.
 *
 * Flow:
 * 1. User clicks "Connect Account" in Zapier
 * 2. Redirected to vc83.com/oauth/authorize
 * 3. User approves scopes
 * 4. Zapier receives access token
 * 5. Zapier can now trigger webhooks and call APIs
 */

/**
 * CREATE ZAPIER ACCESS TOKEN
 *
 * Internal action to generate OAuth access tokens for Zapier.
 * Called after user approves the connection.
 */
export const createZapierAccessToken = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const crypto = await import("crypto");

    // Generate secure access token
    const accessToken = crypto.randomBytes(32).toString("hex");
    const refreshToken = crypto.randomBytes(32).toString("hex");

    // Store in zapierConnections table
    const connectionId = await ctx.db.insert("zapierConnections", {
      organizationId: args.organizationId,
      userId: args.userId,
      accessToken,
      refreshToken,
      scopes: args.scopes,
      isActive: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: 31536000, // 1 year in seconds
      scope: args.scopes.join(" "),
    };
  },
});

/**
 * VERIFY ZAPIER ACCESS TOKEN
 *
 * Verify that a Zapier webhook has valid credentials.
 */
export const verifyZapierToken = internalQuery({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("zapierConnections")
      .filter(q => q.eq(q.field("accessToken"), args.accessToken))
      .filter(q => q.eq(q.field("isActive"), true))
      .first();

    if (!connection) {
      return null;
    }

    // Check if expired
    if (connection.expiresAt < Date.now()) {
      return null;
    }

    return {
      organizationId: connection.organizationId,
      userId: connection.userId,
      scopes: connection.scopes,
    };
  },
});
```

---

#### File 2: `convex/zapier/triggers.ts`
Zapier webhook triggers for CRM events.

```typescript
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * ZAPIER TRIGGERS
 *
 * These functions send webhook notifications to Zapier when events occur.
 * Example: When a Community subscription is created, notify Zapier to create Skool member.
 */

/**
 * TRIGGER COMMUNITY SUBSCRIPTION CREATED
 *
 * Sends webhook to Zapier when a new Community subscription starts.
 * Zapier uses this to automatically create Skool member.
 */
export const triggerCommunitySubscriptionCreated = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[Zapier Trigger] Community subscription created:", args.email);

    // Get Zapier webhook URLs for this organization
    const webhookUrl = process.env.ZAPIER_COMMUNITY_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("[Zapier] No webhook URL configured for Community subscriptions");
      return { success: false, reason: "no_webhook_configured" };
    }

    // Prepare webhook payload
    const payload = {
      trigger: "community_subscription_created",
      organizationId: args.organizationId,
      userId: args.userId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      stripeSubscriptionId: args.stripeSubscriptionId,
      customCourseAccess: ["foundations"], // Grant access to Foundations course
      timestamp: Date.now(),
    };

    console.log("[Zapier] Sending webhook:", webhookUrl);

    // Send webhook to Zapier
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("[Zapier] Webhook failed:", response.status, await response.text());
        return { success: false, reason: "webhook_failed", status: response.status };
      }

      console.log("[Zapier] Webhook sent successfully");

      // Update organization to mark Skool invite as sent
      await ctx.runMutation(internal.zapier.triggers.markSkoolInviteSent, {
        organizationId: args.organizationId,
      });

      return { success: true };
    } catch (error) {
      console.error("[Zapier] Webhook error:", error);
      return { success: false, reason: "network_error", error: String(error) };
    }
  },
});

/**
 * MARK SKOOL INVITE SENT
 *
 * Updates organization after Zapier webhook is sent.
 */
export const markSkoolInviteSent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);

    if (!org || !org.communitySubscription) {
      return { success: false };
    }

    await ctx.db.patch(args.organizationId, {
      communitySubscription: {
        ...org.communitySubscription,
        skoolInviteSent: true,
        skoolInvitedAt: Date.now(),
      },
    });

    return { success: true };
  },
});
```

---

#### File 3: Update `convex/onboarding.ts`
Add Zapier trigger when Community account is created.

```typescript
// In createCommunityAccountFromStripe action:

// After account creation succeeds, trigger Zapier webhook
await ctx.scheduler.runAfter(0, internal.zapier.triggers.triggerCommunitySubscriptionCreated, {
  organizationId: result.organization.id,
  userId: result.user.id,
  email: args.email,
  firstName,
  lastName,
  stripeSubscriptionId: args.stripeSubscriptionId,
});

console.log("[Community Onboarding] Zapier webhook triggered for Skool invite");
```

---

## 🔧 Zapier Zap Configuration

### Zap Setup (You'll Create This in Zapier)

**Trigger:**
- App: Webhooks by Zapier
- Event: Catch Hook
- Webhook URL: (Zapier generates this)

**Action:**
- App: Skool
- Event: Add Member to Group
- Fields:
  - **Group**: l4yercak3 (select from dropdown)
  - **Email**: `{{email}}` (from webhook)
  - **First Name**: `{{firstName}}` (from webhook)
  - **Last Name**: `{{lastName}}` (from webhook)
  - **Custom Course Access**: Foundations (select from dropdown)
  - **Send Welcome Email**: Yes

**Zap Name:** "Auto-Add l4yercak3 Community Members to Skool"

---

## 🗄️ Database Schema Updates

### New Table: `zapierConnections`

```typescript
zapierConnections: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  accessToken: v.string(), // OAuth access token
  refreshToken: v.string(), // OAuth refresh token
  scopes: v.array(v.string()), // ["crm:read", "crm:write", "webhooks:trigger"]
  isActive: v.boolean(),
  createdAt: v.number(),
  expiresAt: v.number(),
  lastUsedAt: v.optional(v.number()),
})
  .index("by_access_token", ["accessToken"])
  .index("by_organization", ["organizationId", "isActive"]),
```

### Update `organizations` Table

```typescript
// Already exists, no changes needed:
communitySubscription: v.optional(v.object({
  active: v.boolean(),
  stripeSubscriptionId: v.string(),
  stripeCustomerId: v.string(),
  startedAt: v.number(),
  trialEndsAt: v.optional(v.number()),
  skoolInviteSent: v.boolean(),           // Track if Zapier webhook was sent
  skoolInvitedAt: v.optional(v.number()), // When webhook was sent
  skoolJoinedAt: v.optional(v.number()),  // Future: Track when user joined
})),
```

---

## 🚀 Implementation Steps

### Step 1: Platform Zapier OAuth (6-8 hours)

**What to Build:**
1. ✅ OAuth endpoints in `convex/http.ts` (already exists!)
2. New: Zapier-specific OAuth client in database
3. New: `convex/zapier/oauth.ts` (token generation)
4. New: `convex/zapier/triggers.ts` (webhook notifications)
5. New: Admin UI to manage Zapier connections

**Tasks:**
- [x] Create `zapierConnections` table schema
- [ ] Build OAuth token generation
- [ ] Build webhook trigger system
- [ ] Add Zapier connection UI in platform dashboard
- [ ] Test OAuth flow with Zapier

---

### Step 2: Community Trigger Integration (2-3 hours)

**What to Build:**
1. Update `createCommunityAccountFromStripe` to trigger webhook
2. Create Zapier webhook in account
3. Test end-to-end flow

**Tasks:**
- [ ] Add webhook trigger to onboarding flow
- [ ] Create Zap: Webhook → Skool Add Member
- [ ] Test with real Stripe checkout
- [ ] Verify Skool member created automatically

---

### Step 3: Environment Configuration (15 min)

**Environment Variables:**

```bash
# Zapier Webhook URLs (generated by Zapier)
ZAPIER_COMMUNITY_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxx/yyy

# Optional: Zapier OAuth credentials (if using custom app)
ZAPIER_CLIENT_ID=xxx
ZAPIER_CLIENT_SECRET=xxx
```

---

## 📊 Complete Flow Diagram (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER PAYS FOR COMMUNITY (€9/mo)                         │
│    Stripe Checkout → checkout.session.completed webhook     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PLATFORM CREATES ACCOUNT                                 │
│    - User record (users table)                              │
│    - Organization (plan: free, communitySubscription)       │
│    - CRM Contact (linked to user)                           │
│    - Password reset token                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PLATFORM SENDS WELCOME EMAIL                             │
│    Email contains:                                           │
│    - Password setup link                                     │
│    - What to expect (Skool invite coming)                   │
│    - Platform login instructions                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PLATFORM TRIGGERS ZAPIER WEBHOOK                         │
│    POST https://hooks.zapier.com/hooks/catch/xxx/yyy        │
│    Body: { email, firstName, lastName, customCourseAccess } │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ZAPIER CREATES SKOOL MEMBER                              │
│    Action: Skool → Add Member to Group                      │
│    - Auto-approve: Yes                                       │
│    - Grants Foundations Course access                       │
│    - Skool sends welcome email with login                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. USER RECEIVES TWO EMAILS                                 │
│    Email 1: Platform welcome + password setup               │
│    Email 2: Skool welcome + login credentials               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. USER COMPLETES ONBOARDING                                │
│    Step 1: Set platform password → Login                    │
│    Step 2: Login to Skool → Access Foundations             │
│    Step 3: Start using both platforms                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Test Case 1: New Community Subscription

**Steps:**
1. User completes Stripe checkout for Community (€9/mo)
2. Webhook creates platform account
3. Zapier webhook is triggered
4. Skool member is created
5. User receives both emails

**Expected:**
- ✅ Platform account created (plan: free, communitySubscription.active: true)
- ✅ Zapier webhook sent successfully
- ✅ Skool member created with Foundations access
- ✅ Two emails received (platform + Skool)
- ✅ User can login to both platforms

---

### Test Case 2: Existing User Adds Community

**Steps:**
1. Existing platform user subscribes to Community
2. Zapier webhook triggered
3. Skool member created

**Expected:**
- ✅ No duplicate account created
- ✅ communitySubscription added to existing org
- ✅ Skool member created
- ✅ Upgrade email sent (not new user email)

---

### Test Case 3: Webhook Failure Recovery

**Steps:**
1. Simulate Zapier webhook failure
2. Platform logs error
3. Manual retry option available

**Expected:**
- ✅ Error logged in Convex
- ✅ Organization marked with skoolInviteSent: false
- ✅ Admin can manually trigger webhook
- ✅ User notified of delay

---

## 🎯 Success Metrics

### User Experience:
- **Time to Platform Access:** < 2 minutes (immediate after payment)
- **Time to Skool Access:** < 5 minutes (via email link)
- **Zero Manual Work:** No admin intervention needed

### Technical:
- **Webhook Success Rate:** > 99.5%
- **Average Webhook Latency:** < 5 seconds
- **Account Creation Time:** < 2 seconds

---

## 🚨 Important Notes

### Why Not Use Skool API Directly?

Skool has no public API for member creation. The only automated way is via Zapier integration. Once Skool launches a public API, we can migrate from Zapier to direct API calls.

### Why Build Platform Zapier OAuth Now?

Two birds, one stone:
1. **Community Tier:** Needs Zapier to create Skool members
2. **Customer Features:** Platform users need to connect their Zaps to VC83 CRM

Building this now enables:
- Community automation (immediate ROI)
- Customer Zapier integrations (future revenue)
- Platform as integration hub (competitive advantage)

### Zapier Webhook Reliability

**What if Zapier is down?**
- Platform logs webhook failures
- Admin dashboard shows failed invites
- Manual retry button available
- User still gets platform account (they can login immediately)

**What if Skool is down?**
- Zapier retries automatically (3 times)
- If all retries fail, user receives fallback email with manual join link
- No impact on platform access

---

## 📈 Future Enhancements

### Phase 2: Bi-Directional Sync (Future)
- Detect when user joins Skool → Update platform
- Detect when user completes Foundations → Badge on platform
- Sync Skool activity → Platform CRM

### Phase 3: Advanced Zapier Features (Future)
- **Triggers:** New CRM contact, New invoice, New project
- **Actions:** Create contact, Create invoice, Create project
- **Searches:** Find contact by email, Find invoice by number

---

## 🎉 Summary

**What This Achieves:**
✅ Fully automated Skool member creation
✅ Zero manual admin work
✅ Professional onboarding experience
✅ Platform Zapier integration (bonus!)
✅ Foundation for customer Zaps (future revenue)

**Timeline:**
- Zapier OAuth integration: 6-8 hours
- Community trigger integration: 2-3 hours
- Testing and docs: 2 hours
- **Total:** 10-13 hours implementation

**Next Steps:**
1. Build Zapier OAuth endpoints
2. Create Zap (Webhook → Skool)
3. Integrate trigger into Community onboarding
4. Test end-to-end
5. Launch! 🚀
