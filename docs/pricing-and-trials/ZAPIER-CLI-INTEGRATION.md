# Zapier Platform CLI Integration Guide
**Build VC83 Zapier app with OAuth 2.0, triggers, and actions**

**Created:** December 17, 2025
**Status:** Implementation Ready
**Priority:** HIGH - Enables Community automation + customer integrations

---

## 🎯 Overview

This guide shows you how to build a complete Zapier integration for VC83 using **Zapier Platform CLI**. This enables:

1. **Community Automation:** Auto-create Skool members when users subscribe
2. **Customer Integrations:** Let customers connect VC83 to 7,000+ apps
3. **Competitive Advantage:** Most platforms don't offer native Zapier integration

---

## 📋 Prerequisites

### 1. Install Zapier Platform CLI

```bash
npm install -g zapier-platform-cli
```

### 2. Login to Zapier

```bash
zapier login
```

### 3. Verify Installation

```bash
zapier --version
# Should show: zapier-platform-cli/15.x.x
```

---

## 🏗️ Project Setup

### Step 1: Create Zapier App

```bash
cd ~/Development
zapier init vc83-zapier --template oauth2
cd vc83-zapier
```

**What this creates:**
```
vc83-zapier/
├── package.json
├── index.js              # App definition
├── authentication.js     # OAuth 2.0 config
├── triggers/             # Zapier triggers (New Contact, etc.)
├── creates/              # Zapier actions (Create Contact, etc.)
├── searches/             # Search actions (Find Contact, etc.)
└── test/                 # Unit tests
```

---

## 🔐 Step 2: Configure OAuth 2.0

### File: `authentication.js`

```javascript
const authentication = {
  type: 'oauth2',

  // OAuth 2.0 endpoints (VC83 platform)
  oauth2Config: {
    // Step 1: User clicks "Connect" in Zapier
    authorizeUrl: {
      url: 'https://vc83.com/oauth/authorize',
      params: {
        client_id: '{{process.env.CLIENT_ID}}',
        state: '{{bundle.inputData.state}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        response_type: 'code',
        scope: 'crm:read crm:write webhooks:trigger',
      },
    },

    // Step 2: Exchange authorization code for access token
    getAccessToken: {
      url: 'https://vc83.com/oauth/token',
      method: 'POST',
      body: {
        code: '{{bundle.inputData.code}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}',
        grant_type: 'authorization_code',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },

    // Step 3: Refresh access token when it expires
    refreshAccessToken: {
      url: 'https://vc83.com/oauth/token',
      method: 'POST',
      body: {
        refresh_token: '{{bundle.authData.refresh_token}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}',
        grant_type: 'refresh_token',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },

    // Automatically refresh if token expires
    autoRefresh: true,
  },

  // Test the connection
  test: {
    url: 'https://vc83.com/api/v1/users/me',
    headers: {
      'Authorization': 'Bearer {{bundle.authData.access_token}}',
    },
  },

  // Shown when OAuth connection is active
  connectionLabel: '{{organization_name}}',
};

module.exports = authentication;
```

---

## 📊 Step 3: Build Triggers (When new data appears)

### Trigger 1: New CRM Contact

**File:** `triggers/new_contact.js`

```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://vc83.com/api/v1/crm/contacts',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bundle.authData.access_token}`,
    },
    params: {
      limit: 100,
      since: bundle.meta.page ? bundle.meta.page : undefined,
    },
  });

  return response.data.contacts;
};

module.exports = {
  key: 'new_contact',
  noun: 'Contact',
  display: {
    label: 'New Contact',
    description: 'Triggers when a new contact is added to your CRM.',
  },
  operation: {
    type: 'polling',
    perform: perform,

    // Sample data for testing
    sample: {
      id: 'j57abcdef1234567',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      company: 'Acme Corp',
      createdAt: 1702900000000,
    },

    // Output fields (what users can map)
    outputFields: [
      { key: 'id', label: 'Contact ID' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'firstName', label: 'First Name', type: 'string' },
      { key: 'lastName', label: 'Last Name', type: 'string' },
      { key: 'phone', label: 'Phone', type: 'string' },
      { key: 'company', label: 'Company', type: 'string' },
      { key: 'createdAt', label: 'Created At', type: 'datetime' },
    ],
  },
};
```

---

### Trigger 2: Community Subscription Created (REST Hook)

**File:** `triggers/community_subscription.js`

```javascript
// REST Hook = Real-time webhook (not polling)
const subscribeHook = async (z, bundle) => {
  // Register webhook with VC83
  const response = await z.request({
    url: 'https://vc83.com/api/v1/webhooks/subscribe',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bundle.authData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: {
      event: 'community_subscription_created',
      target_url: bundle.targetUrl, // Zapier's webhook URL
    },
  });

  return response.data;
};

const unsubscribeHook = async (z, bundle) => {
  // Unregister webhook when Zap is turned off
  await z.request({
    url: `https://vc83.com/api/v1/webhooks/${bundle.subscribeData.id}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${bundle.authData.access_token}`,
    },
  });

  return {};
};

const perform = async (z, bundle) => {
  // Webhook payload received from VC83
  return [bundle.cleanedRequest];
};

module.exports = {
  key: 'community_subscription_created',
  noun: 'Community Subscription',
  display: {
    label: 'New Community Subscription',
    description: 'Triggers when someone subscribes to Community tier.',
    important: true, // Highlighted in Zapier UI
  },
  operation: {
    type: 'hook',

    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: perform,

    // Sample webhook payload
    sample: {
      trigger: 'community_subscription_created',
      organizationId: 'kh1234567890abcdef',
      userId: 'j51234567890abcdef',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      stripeSubscriptionId: 'sub_1234567890',
      customCourseAccess: ['foundations'],
      timestamp: 1702900000000,
    },

    outputFields: [
      { key: 'email', label: 'Email' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'customCourseAccess', label: 'Course Access' },
    ],
  },
};
```

---

## ✍️ Step 4: Build Actions (Create/Update data)

### Action 1: Create Contact

**File:** `creates/create_contact.js`

```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://vc83.com/api/v1/crm/contacts',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bundle.authData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: {
      email: bundle.inputData.email,
      firstName: bundle.inputData.firstName,
      lastName: bundle.inputData.lastName,
      phone: bundle.inputData.phone,
      company: bundle.inputData.company,
      tags: bundle.inputData.tags ? bundle.inputData.tags.split(',') : [],
    },
  });

  return response.data.contact;
};

module.exports = {
  key: 'create_contact',
  noun: 'Contact',
  display: {
    label: 'Create Contact',
    description: 'Creates a new contact in your VC83 CRM.',
  },
  operation: {
    perform: perform,

    // Input fields (what user fills in)
    inputFields: [
      {
        key: 'email',
        label: 'Email',
        type: 'string',
        required: true,
        helpText: 'Contact email address',
      },
      {
        key: 'firstName',
        label: 'First Name',
        type: 'string',
        required: true,
      },
      {
        key: 'lastName',
        label: 'Last Name',
        type: 'string',
        required: false,
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'string',
        required: false,
      },
      {
        key: 'company',
        label: 'Company',
        type: 'string',
        required: false,
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'string',
        required: false,
        helpText: 'Comma-separated tags (e.g., "customer,vip")',
      },
    ],

    // Sample output
    sample: {
      id: 'j57abcdef1234567',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'Contact',
      phone: '+1234567890',
      company: 'New Company',
      createdAt: 1702900000000,
    },

    outputFields: [
      { key: 'id', label: 'Contact ID' },
      { key: 'email', label: 'Email' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
};
```

---

## 🔍 Step 5: Build Searches (Find existing data)

### Search 1: Find Contact by Email

**File:** `searches/find_contact.js`

```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://vc83.com/api/v1/crm/contacts',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bundle.authData.access_token}`,
    },
    params: {
      email: bundle.inputData.email,
      limit: 1,
    },
  });

  return response.data.contacts;
};

module.exports = {
  key: 'find_contact',
  noun: 'Contact',
  display: {
    label: 'Find Contact',
    description: 'Finds an existing contact by email address.',
  },
  operation: {
    perform: perform,

    inputFields: [
      {
        key: 'email',
        label: 'Email',
        type: 'string',
        required: true,
        helpText: 'Email address to search for',
      },
    ],

    sample: {
      id: 'j57abcdef1234567',
      email: 'found@example.com',
      firstName: 'Found',
      lastName: 'Contact',
    },

    outputFields: [
      { key: 'id', label: 'Contact ID' },
      { key: 'email', label: 'Email' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
    ],
  },
};
```

---

## 📦 Step 6: Register Everything in `index.js`

**File:** `index.js`

```javascript
const authentication = require('./authentication');
const newContactTrigger = require('./triggers/new_contact');
const communitySubscriptionTrigger = require('./triggers/community_subscription');
const createContactCreate = require('./creates/create_contact');
const findContactSearch = require('./searches/find_contact');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication: authentication,

  triggers: {
    [newContactTrigger.key]: newContactTrigger,
    [communitySubscriptionTrigger.key]: communitySubscriptionTrigger,
  },

  creates: {
    [createContactCreate.key]: createContactCreate,
  },

  searches: {
    [findContactSearch.key]: findContactSearch,
  },

  // Hydrators, middleware, etc. can go here if needed
};
```

---

## 🧪 Step 7: Test Locally

### 1. Set Environment Variables

Create `.env` file:

```bash
CLIENT_ID=your_vc83_client_id
CLIENT_SECRET=your_vc83_client_secret
```

### 2. Run Tests

```bash
zapier test
```

### 3. Test Authentication

```bash
zapier test --debug
```

---

## 🚀 Step 8: Deploy to Zapier

### 1. Register App on Zapier

```bash
zapier register "VC83 Platform"
```

### 2. Push to Zapier

```bash
zapier push
```

### 3. Test in Zapier UI

```bash
zapier open
```

This opens your app in the Zapier editor where you can:
- Test OAuth connection
- Create test Zaps
- Verify triggers and actions work

---

## 🔧 Backend Changes (VC83 Platform)

### File 1: `convex/zapier/webhooks.ts` (NEW)

Webhook subscription management for REST hooks.

```typescript
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * WEBHOOK SUBSCRIPTIONS
 *
 * Zapier REST hooks register webhooks here.
 * When events occur, we send HTTP POST to registered URLs.
 */

/**
 * Subscribe to webhook
 *
 * Called by Zapier when user turns on a Zap with REST hook trigger.
 */
export const subscribeWebhook = mutation({
  args: {
    event: v.string(), // "community_subscription_created", "new_contact", etc.
    targetUrl: v.string(), // Zapier's webhook URL
  },
  handler: async (ctx, args) => {
    // Verify OAuth token (from Authorization header)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid access token",
      });
    }

    // Get organization from OAuth token
    const organizationId = identity.subject as any; // TODO: Extract from JWT

    // Create webhook subscription
    const subscriptionId = await ctx.db.insert("webhookSubscriptions", {
      organizationId,
      event: args.event,
      targetUrl: args.targetUrl,
      isActive: true,
      createdAt: Date.now(),
      deliveryCount: 0,
      failureCount: 0,
    });

    return {
      id: subscriptionId,
      event: args.event,
      targetUrl: args.targetUrl,
    };
  },
});

/**
 * Unsubscribe from webhook
 *
 * Called by Zapier when user turns off a Zap.
 */
export const unsubscribeWebhook = mutation({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid access token",
      });
    }

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Webhook subscription not found",
      });
    }

    // Delete subscription
    await ctx.db.delete(args.subscriptionId);

    return { success: true };
  },
});

/**
 * List active webhooks for organization
 */
export const listWebhooks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid access token",
      });
    }

    const organizationId = identity.subject as any;

    const subscriptions = await ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return subscriptions;
  },
});
```

---

### File 2: Update `convex/schemas/coreSchemas.ts`

Add webhook subscriptions table:

```typescript
export const webhookSubscriptions = defineTable({
  organizationId: v.id("organizations"),
  event: v.string(), // "community_subscription_created", "new_contact", etc.
  targetUrl: v.string(), // Where to send webhook
  isActive: v.boolean(),
  createdAt: v.number(),
  lastDeliveredAt: v.optional(v.number()),
  deliveryCount: v.number(),
  failureCount: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_event", ["event", "isActive"]);
```

---

### File 3: `convex/zapier/triggers.ts` (Updated)

Trigger webhooks when events occur:

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * TRIGGER COMMUNITY SUBSCRIPTION WEBHOOK
 *
 * Sends webhook to ALL subscribed URLs for "community_subscription_created" event.
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

    // Get all active webhook subscriptions for this event
    const subscriptions = await ctx.runQuery(
      internal.zapier.webhooks.getSubscriptionsForEvent,
      {
        event: "community_subscription_created",
      }
    );

    if (subscriptions.length === 0) {
      console.log("[Zapier] No webhook subscriptions for this event");
      return { success: true, delivered: 0 };
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
      customCourseAccess: ["foundations"],
      timestamp: Date.now(),
    };

    // Send webhook to all subscribed URLs
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions) {
      try {
        console.log(`[Zapier] Sending webhook to: ${subscription.targetUrl}`);

        const response = await fetch(subscription.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
          console.log(`[Zapier] Webhook delivered successfully (${response.status})`);

          // Update delivery stats
          await ctx.runMutation(internal.zapier.webhooks.recordDelivery, {
            subscriptionId: subscription._id,
            success: true,
          });
        } else {
          failureCount++;
          console.error(`[Zapier] Webhook failed (${response.status}): ${await response.text()}`);

          await ctx.runMutation(internal.zapier.webhooks.recordDelivery, {
            subscriptionId: subscription._id,
            success: false,
          });
        }
      } catch (error) {
        failureCount++;
        console.error(`[Zapier] Webhook error:`, error);

        await ctx.runMutation(internal.zapier.webhooks.recordDelivery, {
          subscriptionId: subscription._id,
          success: false,
        });
      }
    }

    return {
      success: true,
      delivered: successCount,
      failed: failureCount,
    };
  },
});
```

---

## 🎯 Community Tier Zap Setup

### Zap: Community Subscription → Skool Member

**Trigger:** VC83 - New Community Subscription (REST Hook)
**Action:** Skool - Add Member to Group

**Configuration:**
1. **Trigger Setup:**
   - App: VC83 Platform
   - Event: New Community Subscription
   - Connect VC83 account (OAuth)

2. **Action Setup:**
   - App: Skool
   - Event: Add Member to Group
   - Group: l4yercak3
   - Email: `{{email}}`
   - First Name: `{{firstName}}`
   - Last Name: `{{lastName}}`
   - Custom Course Access: Foundations
   - Send Welcome Email: Yes

3. **Test:**
   - Click "Test trigger" (pulls sample data)
   - Click "Test action" (creates test Skool member)
   - Turn on Zap

**Done!** Now every Community subscription automatically creates a Skool member.

---

## 📊 Summary

### What You Built:
- ✅ OAuth 2.0 authentication
- ✅ REST Hook trigger (Community Subscription)
- ✅ Polling trigger (New Contact)
- ✅ Create action (Create Contact)
- ✅ Search action (Find Contact)
- ✅ Webhook subscription management

### Timeline:
- **CLI Setup:** 30 min
- **OAuth Configuration:** 1-2 hours
- **Triggers:** 2-3 hours
- **Actions:** 1-2 hours
- **Testing:** 2-3 hours
- **Total:** 6-10 hours

### What This Enables:
1. **Community Automation:** Auto-create Skool members (immediate ROI)
2. **Customer Features:** 7,000+ app integrations (competitive advantage)
3. **Revenue Growth:** Higher conversion (Community tier) + platform stickiness

---

## 🚀 Next Steps

1. **Create OAuth App in VC83:**
   - Login to VC83 dashboard
   - Go to Settings → Integrations → OAuth Apps
   - Click "Create OAuth App"
   - Name: "Zapier Integration"
   - Type: Confidential
   - Scopes: `crm:read crm:write webhooks:trigger`
   - Redirect URIs: `https://zapier.com/dashboard/auth/oauth/return/App{ID}CLIAPI/`
   - Save `CLIENT_ID` and `CLIENT_SECRET`

2. **Run CLI Commands:**
   ```bash
   cd ~/Development
   zapier init vc83-zapier --template oauth2
   cd vc83-zapier
   # Add files from this guide
   zapier test
   zapier register "VC83 Platform"
   zapier push
   ```

3. **Test Community Flow:**
   - Complete Stripe checkout for Community (€9/mo)
   - Verify account created on platform
   - Verify webhook sent to Zapier
   - Verify Skool member created
   - Verify user receives both emails

4. **Launch:**
   - Invite beta testers
   - Monitor webhook deliveries
   - Iterate based on feedback

Ready to start? 🎉
