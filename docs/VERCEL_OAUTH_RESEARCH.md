# Vercel OAuth Integration Research

## Research Date
2025-12-12

## Problem Statement
The Vercel OAuth authorize URL returns "The app ID is invalid" error despite having valid credentials:
- Client ID: `oac_PcuayJt9KSxN4Xuzjv6NmLPl`
- Client Integration Secret: `dytP87Ill4XGsE6SdoqySGPn`

## Key Findings

### 1. **THE MAIN ISSUE: Wrong Authorization URL**

**Current (WRONG) URL in code:**
```typescript
const VERCEL_AUTH_URL = "https://vercel.com/oauth/authorize";
```
Location: `/convex/oauth/vercel.ts` line 14

**Correct URL Format:**
```typescript
const VERCEL_AUTH_URL = "https://vercel.com/integrations/{integration-slug}/new";
```

### Why This Matters:
- **Vercel marketplace integrations do NOT use `/oauth/authorize`**
- They use `/integrations/{slug}/new` where `{slug}` is your integration's URL slug
- This is NOT the Client ID - it's a separate URL slug value
- The old OAuth2 entrypoint was sunset on December 31, 2022

### 2. **Credential Clarification**

✅ **YES, the visible credentials ARE the OAuth credentials:**

| Vercel Dashboard Label | Environment Variable | Purpose |
|------------------------|---------------------|---------|
| Client ID | `VERCEL_OAUTH_CLIENT_ID` | Public identifier (oac_PcuayJt9KSxN4Xuzjv6NmLPl) |
| Client Integration Secret | `VERCEL_OAUTH_CLIENT_SECRET` | Private secret for token exchange |

**There is NO separate "OAuth Client Secret"** - the "Client Integration Secret" IS the OAuth secret.

### 3. **Missing Configuration: Integration Slug**

**What You Need:**
1. Go to Vercel Integrations Console
2. Find your integration's **URL Slug** (different from Client ID)
3. This slug is used in the authorization URL

**Example:**
```
If your integration slug is: my-cool-integration
Authorization URL: https://vercel.com/integrations/my-cool-integration/new?state=xyz
```

### 4. **Complete OAuth Flow**

#### Step 1: Authorization URL (User Redirected Here)
```
https://vercel.com/integrations/{INTEGRATION_SLUG}/new?state={CSRF_TOKEN}
```

**Parameters:**
- `state` (required): CSRF protection token
- NO `client_id` in URL (uses slug instead)
- NO `redirect_uri` in URL (configured in Vercel dashboard)
- NO `scope` in URL (configured in integration settings)

#### Step 2: Token Exchange (After Callback)
```
POST https://api.vercel.com/v2/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id=oac_PcuayJt9KSxN4Xuzjv6NmLPl
client_secret=dytP87Ill4XGsE6SdoqySGPn
code={authorization_code}
redirect_uri={configured_redirect_uri}
```

### 5. **Configuration Checklist**

In Vercel Integrations Console, verify:

- [ ] **Redirect Login URL** is set to: `https://vc83-com.vercel.app/api/oauth/vercel/callback`
- [ ] **URL Slug** is noted (you need this!)
- [ ] **Scopes** are configured (not in URL, but in integration settings)
- [ ] Integration status is not "Draft" (must be at least Community-published)

### 6. **Why "App ID is Invalid" Error Occurs**

**Root Causes:**
1. ❌ Using wrong URL format (`/oauth/authorize` instead of `/integrations/{slug}/new`)
2. ❌ Using Client ID instead of URL slug in the path
3. ❌ Integration not published (still in draft mode)
4. ❌ Wrong slug value

### 7. **Differences from Standard OAuth**

| Standard OAuth | Vercel Marketplace Integration |
|----------------|-------------------------------|
| `client_id` in URL | Integration slug in URL |
| `redirect_uri` in URL | Configured in dashboard only |
| `scope` in URL | Configured in dashboard only |
| `/oauth/authorize` endpoint | `/integrations/{slug}/new` endpoint |

### 8. **Integration Types & Requirements**

**Two Types of Integrations:**

1. **Community Integration** (What you have)
   - Badge appears in Integrations Console
   - Does NOT appear in public marketplace
   - Can be installed via direct link
   - OAuth works immediately after creation

2. **Marketplace Integration** (Published)
   - Requires approval (email integrations@vercel.com)
   - Appears in public marketplace
   - Must follow review guidelines
   - OAuth works same way

**No approval needed for OAuth to work** - it works immediately for Community integrations.

### 9. **Code Changes Required**

**File: `/convex/oauth/vercel.ts`**

```typescript
// BEFORE (WRONG)
const VERCEL_AUTH_URL = "https://vercel.com/oauth/authorize";

// AFTER (CORRECT)
const VERCEL_INTEGRATION_SLUG = process.env.VERCEL_INTEGRATION_SLUG; // NEW ENV VAR
const VERCEL_AUTH_URL = `https://vercel.com/integrations/${VERCEL_INTEGRATION_SLUG}/new`;
```

**Update authorization URL generation (around line 100):**

```typescript
// BEFORE
const params = new URLSearchParams({
  client_id: process.env.VERCEL_OAUTH_CLIENT_ID || "",
  redirect_uri: redirectUri,
  state: state,
  scope: scopeString,
});
const authUrl = `${VERCEL_AUTH_URL}?${params.toString()}`;

// AFTER - Only state parameter needed
const params = new URLSearchParams({
  state: state,
});
const authUrl = `${VERCEL_AUTH_URL}?${params.toString()}`;
```

### 10. **Environment Variables Needed**

Add to `.env.local` and Convex environment:

```bash
# Existing (correct)
VERCEL_OAUTH_CLIENT_ID=oac_PcuayJt9KSxN4Xuzjv6NmLPl
VERCEL_OAUTH_CLIENT_SECRET=dytP87Ill4XGsE6SdoqySGPn

# NEW - Get from Vercel Integrations Console
VERCEL_INTEGRATION_SLUG=your-integration-url-slug
```

### 11. **Finding Your Integration Slug**

1. Go to https://vercel.com/dashboard/integrations/console
2. Select your integration
3. Look for "URL Slug" field or check the integration's public URL
4. Example: If your integration is at `vercel.com/integrations/my-app`, slug is `my-app`

### 12. **Redirect URI Configuration**

**In Vercel Dashboard:**
- Set **Redirect Login URL** to: `https://vc83-com.vercel.app/api/oauth/vercel/callback`
- For development: `http://localhost:3000/api/oauth/vercel/callback`

**This URL is configured once in dashboard** - you don't pass it in the authorization URL.

### 13. **Testing Steps**

1. Add `VERCEL_INTEGRATION_SLUG` to environment
2. Update code to use new URL format
3. Deploy Convex changes
4. Test authorization flow
5. Check Convex logs for any errors

### 14. **Common Mistakes to Avoid**

❌ Don't use Client ID in authorization URL path
❌ Don't include redirect_uri in authorization URL query params
❌ Don't include scope in authorization URL query params
❌ Don't use `/oauth/authorize` endpoint
❌ Don't confuse URL slug with Client ID

### 15. **Reference Links**

- [Vercel Integrations API](https://vercel.com/docs/integrations/create-integration/marketplace-api)
- [Example Integration](https://github.com/vercel/example-marketplace-integration)
- [OAuth Guide (Medium)](https://medium.com/@tony.infisical/guide-to-using-oauth-2-0-to-access-vercel-api-f2f101d33341)
- [Sentry's Implementation](https://develop.sentry.dev/integrations/vercel/)

## Summary

### Clear Answers to Your Questions:

1. **Are the visible credentials the OAuth credentials?**
   - ✅ YES - "Client ID" and "Client Integration Secret" ARE your OAuth credentials
   - No separate OAuth settings section needed

2. **What's the difference between Integration Secret and OAuth Client Secret?**
   - ✅ They're the SAME thing - just different names for the same credential

3. **What causes "app ID is invalid"?**
   - ❌ Using `/oauth/authorize` instead of `/integrations/{slug}/new`
   - ❌ Not having the integration URL slug configured

4. **Missing configuration steps?**
   - ⚠️ Need to get your integration's URL slug from Vercel dashboard
   - ⚠️ Need to update authorization URL format in code

5. **Approval/verification needed?**
   - ✅ NO - OAuth works immediately for Community integrations
   - Only marketplace listing requires approval

## Next Steps

1. Find your integration URL slug in Vercel dashboard
2. Add `VERCEL_INTEGRATION_SLUG` environment variable
3. Update `/convex/oauth/vercel.ts` with correct URL format
4. Remove unnecessary parameters from authorization URL
5. Test the flow

## Example Working Implementation

```typescript
// Environment
VERCEL_INTEGRATION_SLUG=my-app-slug
VERCEL_OAUTH_CLIENT_ID=oac_PcuayJt9KSxN4Xuzjv6NmLPl
VERCEL_OAUTH_CLIENT_SECRET=dytP87Ill4XGsE6SdoqySGPn

// Code
const authUrl = `https://vercel.com/integrations/${process.env.VERCEL_INTEGRATION_SLUG}/new?state=${state}`;
// User clicks, authorizes, redirected to callback
// Callback receives code and state
// Exchange code for token using Client ID + Client Secret
```
