# Phase 4 Step 1: GHL OAuth Foundation + App Setup

## Goal

Establish the authentication and credential management layer for GoHighLevel. An org owner clicks "Connect GoHighLevel" in the control panel, completes an OAuth flow, and their GHL sub-account is linked. Tokens refresh automatically. All subsequent steps depend on this foundation.

## Depends On

- Existing OAuth infrastructure (`convex/oauth/`)
- Token encryption (`convex/oauth/encryption.ts`)
- Connection panel UI pattern (`src/components/builder/connection-panel.tsx`)
- `oauthConnections` table schema

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| OAuth app CRUD (create, list, delete) | Done | `convex/oauth/applications.ts` |
| Token encryption/decryption | Done | `convex/oauth/encryption.ts` |
| Verified integrations registry | Done | `convex/oauth/verifiedIntegrations.ts` |
| `oauthConnections` table | Done | `convex/schemas/coreSchemas.ts` |
| GitHub OAuth pattern (reference) | Done | `convex/integrations/github.ts` |
| Connection panel UI | Done | `src/components/builder/connection-panel.tsx` |

## What's Missing

### 1. GHL Marketplace App Registration

Before any code, we need a registered app on the GHL Developer Marketplace:

| Config | Value |
|--------|-------|
| **App Name** | L4YERCAK3 (or vc83 Agent Platform) |
| **App Type** | Private (initially) → Public (after testing) |
| **Redirect URI** | `{CONVEX_SITE_URL}/ghl-oauth-callback` |
| **Required Scopes** | contacts.readonly, contacts.write, conversations.readonly, conversations.write, conversations/message.readonly, conversations/message.write, opportunities.readonly, opportunities.write, calendars.readonly, calendars.write, calendars/events.readonly, calendars/events.write, locations.readonly, users.readonly |
| **Webhook URL** | `{CONVEX_SITE_URL}/ghl-webhook` |
| **Webhook Events** | ContactCreate, ContactUpdate, ContactDelete, InboundMessage, OutboundMessage, OpportunityCreate, OpportunityUpdate, OpportunityStageUpdate, AppointmentCreate, AppointmentUpdate, AppInstall, AppUninstall |

### 2. Environment Variables

```bash
# .env.local
GHL_CLIENT_ID=your_client_id
GHL_CLIENT_SECRET=your_client_secret
GHL_REDIRECT_URI=https://your-convex-site.convex.site/ghl-oauth-callback
GHL_WEBHOOK_SECRET=your_webhook_signing_secret  # Optional — GHL doesn't sign webhooks by default
```

### 3. OAuth Flow Implementation

### 4. Token Refresh Cron

### 5. Connection Settings UI

## Architecture

```
User clicks "Connect GHL"
         │
         ▼
┌─────────────────────────┐
│ Frontend generates       │
│ OAuth URL with:          │
│   client_id              │
│   redirect_uri           │
│   scope                  │
│   state (org + csrf)     │
└────────┬────────────────┘
         │ Redirect to GHL
         ▼
┌─────────────────────────┐
│ GHL Login + Consent      │
│ User selects sub-account │
│ (Location)               │
└────────┬────────────────┘
         │ Redirect back with ?code=xxx
         ▼
┌─────────────────────────┐
│ /ghl-oauth-callback      │
│ (Convex HTTP endpoint)   │
│                          │
│ 1. Exchange code → token │
│ 2. Get location info     │
│ 3. Encrypt tokens        │
│ 4. Store in              │
│    oauthConnections      │
│ 5. Redirect to app       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Token Refresh Cron       │
│ (every 12 hours)         │
│                          │
│ 1. Query all GHL conns   │
│ 2. Refresh if > 20h old  │
│ 3. Store new tokens      │
│ 4. Log failures          │
└─────────────────────────┘
```

## Implementation

### 1. OAuth Connection Flow

**File:** `convex/integrations/ghl.ts` (new)

```typescript
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "../_generated/server";
import { internal } from "../_generated/api";

const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const GHL_LOCATION_URL = "https://services.leadconnectorhq.com/locations";
const GHL_AUTH_BASE = "https://marketplace.gohighlevel.com/oauth/chooselocation";

/**
 * Generate the OAuth authorization URL for GHL.
 * Frontend calls this, then redirects the user.
 */
export const getGhlAuthUrl = query({
  args: { sessionId: v.string(), organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Validate session + org ownership
    const clientId = process.env.GHL_CLIENT_ID;
    if (!clientId) return { error: "GHL not configured" };

    const state = JSON.stringify({
      organizationId: args.organizationId,
      csrf: crypto.randomUUID(),
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: process.env.GHL_REDIRECT_URI!,
      scope: [
        "contacts.readonly", "contacts.write",
        "conversations.readonly", "conversations.write",
        "conversations/message.readonly", "conversations/message.write",
        "opportunities.readonly", "opportunities.write",
        "calendars.readonly", "calendars.write",
        "calendars/events.readonly", "calendars/events.write",
        "locations.readonly", "users.readonly",
      ].join(" "),
      state: Buffer.from(state).toString("base64"),
    });

    return { url: `${GHL_AUTH_BASE}?${params.toString()}` };
  },
});

/**
 * Exchange authorization code for access + refresh tokens.
 * Called from the HTTP callback endpoint.
 */
export const exchangeGhlCode = internalAction({
  args: {
    code: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const response = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID!,
        client_secret: process.env.GHL_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: process.env.GHL_REDIRECT_URI!,
        user_type: "Location",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GHL token exchange failed: ${err}`);
    }

    const tokens = await response.json();
    // tokens: { access_token, refresh_token, expires_in, locationId, userId, ... }

    // Fetch location details for display
    const locationRes = await fetch(
      `${GHL_LOCATION_URL}/${tokens.locationId}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}`, Version: "2021-07-28" } }
    );
    const locationData = locationRes.ok ? await locationRes.json() : null;
    const locationName = locationData?.location?.name || tokens.locationId;

    // Encrypt and store
    const encryptedAccessToken = await ctx.runAction(
      internal.oauth.encryption.encryptToken, { token: tokens.access_token }
    );
    const encryptedRefreshToken = await ctx.runAction(
      internal.oauth.encryption.encryptToken, { token: tokens.refresh_token }
    );

    await ctx.runMutation(internal.integrations.ghl.storeGhlConnection, {
      organizationId: args.organizationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      locationId: tokens.locationId,
      locationName,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      userId: tokens.userId || undefined,
    });

    return { success: true, locationName };
  },
});

/**
 * Store GHL OAuth connection in the database.
 */
export const storeGhlConnection = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    accessToken: v.string(),
    refreshToken: v.string(),
    locationId: v.string(),
    locationName: v.string(),
    expiresAt: v.number(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for existing connection
    const existing = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "ghl")
      )
      .first();

    const connectionData = {
      provider: "ghl" as const,
      organizationId: args.organizationId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      providerEmail: args.locationName, // Display name
      customProperties: {
        locationId: args.locationId,
        locationName: args.locationName,
        expiresAt: args.expiresAt,
        ghlUserId: args.userId,
        connectedAt: Date.now(),
      },
    };

    if (existing) {
      await ctx.db.patch(existing._id, connectionData);
    } else {
      await ctx.db.insert("oauthConnections", connectionData);
    }
  },
});

/**
 * Check if GHL is connected for an organization.
 */
export const checkGhlConnection = query({
  args: { sessionId: v.string(), organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const conn = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "ghl")
      )
      .first();

    if (!conn) return { connected: false };

    return {
      connected: true,
      locationName: (conn.customProperties as any)?.locationName || "Unknown",
      locationId: (conn.customProperties as any)?.locationId,
      connectedAt: (conn.customProperties as any)?.connectedAt,
    };
  },
});

/**
 * Disconnect GHL from an organization.
 */
export const disconnectGhl = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const conn = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "ghl")
      )
      .first();

    if (conn) {
      await ctx.db.delete(conn._id);
    }

    // Also remove any channel bindings for GHL
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "channel_provider_binding")
      )
      .collect();

    for (const binding of bindings) {
      if ((binding.customProperties as any)?.providerId === "ghl") {
        await ctx.db.delete(binding._id);
      }
    }
  },
});

/**
 * Get a decrypted GHL access token for API calls.
 * Internal only — never expose to client.
 */
export const getGhlAccessToken = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!conn) throw new Error("GHL not connected for this organization");

    // Check if token needs refresh (> 20 hours old)
    const expiresAt = (conn.customProperties as any)?.expiresAt || 0;
    if (Date.now() > expiresAt - 4 * 3600_000) {
      // Refresh the token
      return await ctx.runAction(internal.integrations.ghl.refreshGhlToken, {
        organizationId: args.organizationId,
      });
    }

    return await ctx.runAction(
      internal.oauth.encryption.decryptToken,
      { encryptedToken: conn.accessToken }
    );
  },
});

export const getGhlConnectionInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "ghl")
      )
      .first();
  },
});
```

### 2. Token Refresh

**File:** `convex/integrations/ghl.ts` (continued)

```typescript
/**
 * Refresh GHL access token using refresh token.
 * Returns the new decrypted access token.
 */
export const refreshGhlToken = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!conn?.refreshToken) throw new Error("No GHL refresh token");

    const decryptedRefreshToken = await ctx.runAction(
      internal.oauth.encryption.decryptToken,
      { encryptedToken: conn.refreshToken }
    );

    const response = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID!,
        client_secret: process.env.GHL_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
        user_type: "Location",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[GHL] Token refresh failed for org ${args.organizationId}: ${err}`);
      throw new Error(`GHL token refresh failed: ${err}`);
    }

    const tokens = await response.json();

    // Encrypt new tokens
    const encryptedAccessToken = await ctx.runAction(
      internal.oauth.encryption.encryptToken, { token: tokens.access_token }
    );
    const encryptedRefreshToken = await ctx.runAction(
      internal.oauth.encryption.encryptToken, { token: tokens.refresh_token }
    );

    // Update stored tokens
    await ctx.runMutation(internal.integrations.ghl.updateGhlTokens, {
      organizationId: args.organizationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    });

    return tokens.access_token;
  },
});

export const updateGhlTokens = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "ghl")
      )
      .first();

    if (conn) {
      await ctx.db.patch(conn._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        customProperties: {
          ...(conn.customProperties as Record<string, unknown>),
          expiresAt: args.expiresAt,
          lastRefreshed: Date.now(),
        },
      });
    }
  },
});
```

### 3. Token Refresh Cron

**File:** `convex/crons.ts` (add to existing)

```typescript
// GHL token refresh — every 12 hours
crons.interval("ghl-token-refresh", { hours: 12 }, internal.integrations.ghl.refreshAllGhlTokens);
```

**File:** `convex/integrations/ghl.ts` (add)

```typescript
/**
 * Refresh all GHL tokens that are within 4 hours of expiry.
 * Scheduled via cron every 12 hours.
 */
export const refreshAllGhlTokens = internalAction({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.runQuery(
      internal.integrations.ghl.listGhlConnections
    );

    const threshold = Date.now() + 4 * 3600_000; // 4 hours from now
    let refreshed = 0;
    let errors = 0;

    for (const conn of connections) {
      const expiresAt = (conn.customProperties as any)?.expiresAt || 0;
      if (expiresAt < threshold) {
        try {
          await ctx.runAction(internal.integrations.ghl.refreshGhlToken, {
            organizationId: conn.organizationId,
          });
          refreshed++;
        } catch (err) {
          errors++;
          console.error(`[GHL] Failed to refresh token for org ${conn.organizationId}:`, err);
        }
      }
    }

    console.log(`[GHL] Token refresh cron: ${refreshed} refreshed, ${errors} errors`);
  },
});

export const listGhlConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("oauthConnections")
      .filter((q) => q.eq(q.field("provider"), "ghl"))
      .collect();
  },
});
```

### 4. HTTP OAuth Callback Endpoint

**File:** `convex/http.ts` (add to existing routes)

```typescript
// GHL OAuth callback
http.route({
  path: "/ghl-oauth-callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const stateB64 = url.searchParams.get("state");

    if (!code || !stateB64) {
      return new Response("Missing code or state", { status: 400 });
    }

    try {
      const state = JSON.parse(Buffer.from(stateB64, "base64").toString());
      const { organizationId } = state;

      await ctx.runAction(internal.integrations.ghl.exchangeGhlCode, {
        code,
        organizationId,
      });

      // Redirect back to the app's control panel
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vc83.com";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}?ghl=connected` },
      });
    } catch (error) {
      console.error("[GHL OAuth] Callback error:", error);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vc83.com";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}?ghl=error` },
      });
    }
  }),
});
```

### 5. GHL Webhook Endpoint

**File:** `convex/http.ts` (add to existing routes)

```typescript
// GHL Webhook (all event types)
http.route({
  path: "/ghl-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    // Return 200 immediately (GHL does NOT retry on 5xx)
    ctx.scheduler.runAfter(0, internal.integrations.ghl.processGhlWebhook, {
      payload: body,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

### 6. Add to Verified Integrations

**File:** `convex/oauth/verifiedIntegrations.ts` (add entry)

```typescript
{
  id: "ghl",
  name: "GoHighLevel",
  verified: true,
  redirectUris: [],
  domains: ["*.gohighlevel.com", "*.leadconnectorhq.com"],
  description: "CRM, conversations, calendars, and pipeline management via GoHighLevel",
},
```

## Files Summary

| File | Change | Risk |
|------|--------|------|
| `convex/integrations/ghl.ts` | **New** — OAuth flow, token management, CRUD | Medium |
| `convex/http.ts` | Add `/ghl-oauth-callback` and `/ghl-webhook` routes | Low |
| `convex/crons.ts` | Add 12-hour token refresh cron | Low |
| `convex/oauth/verifiedIntegrations.ts` | Add GHL entry | Low |
| `.env.local` | Add GHL_CLIENT_ID, GHL_CLIENT_SECRET, GHL_REDIRECT_URI | Low |

## Verification

1. **OAuth flow**: Click "Connect GHL" → redirects to GHL → selects sub-account → redirects back with connection stored
2. **Token storage**: `oauthConnections` has entry with provider="ghl", encrypted tokens, locationId
3. **Connection check**: `checkGhlConnection` returns `{ connected: true, locationName: "..." }`
4. **Token refresh**: Manually trigger `refreshGhlToken` → new tokens stored, old ones overwritten
5. **Cron refresh**: Wait 12h (or trigger manually) → tokens within 4h of expiry get refreshed
6. **Disconnect**: Call `disconnectGhl` → connection removed, channel bindings cleaned up
7. **Webhook endpoint**: POST to `/ghl-webhook` → returns 200, schedules processing

## Pre-requisites (Manual)

1. Create GHL Developer account at `marketplace.gohighlevel.com`
2. Register app with redirect URI and scopes listed above
3. Copy Client ID and Client Secret to `.env.local`
4. Deploy Convex to get the `CONVEX_SITE_URL` for the redirect URI
