# Environment Variable Naming Convention

## Problem

We have a naming conflict between OAuth credentials used for:
1. **Integrations** (GitHub/Vercel deployment connections)
2. **Authentication** (user signup/login)

Both were using `{PROVIDER}_OAUTH_CLIENT_ID` which causes conflicts.

## Solution

Rename **integration** variables to clearly separate them from authentication.

## Naming Convention

### Integration OAuth (Deployment Connections)
Used for connecting third-party services (GitHub, Vercel) for deployment integrations.

**Pattern**: `{PROVIDER}_INTEGRATION_CLIENT_ID` / `{PROVIDER}_INTEGRATION_CLIENT_SECRET`

**Examples**:
- `GITHUB_INTEGRATION_CLIENT_ID`
- `GITHUB_INTEGRATION_CLIENT_SECRET`
- `VERCEL_INTEGRATION_CLIENT_ID`
- `VERCEL_INTEGRATION_CLIENT_SECRET`

**Used in**:
- `convex/oauth/github.ts` - GitHub deployment integration
- `convex/oauth/vercel.ts` - Vercel deployment integration

### Authentication OAuth (User Signup/Login)
Used for user authentication (signup, login, CLI auth).

**Pattern**: `{PROVIDER}_OAUTH_CLIENT_ID` / `{PROVIDER}_OAUTH_CLIENT_SECRET`

**Examples**:
- `GITHUB_OAUTH_CLIENT_ID` (for authentication)
- `GITHUB_OAUTH_CLIENT_SECRET` (for authentication)
- `GOOGLE_OAUTH_CLIENT_ID` (for authentication)
- `GOOGLE_OAUTH_CLIENT_SECRET` (for authentication)
- `MICROSOFT_CLIENT_ID` (for authentication - already correct)
- `MICROSOFT_CLIENT_SECRET` (for authentication - already correct)

**Used in**:
- `convex/api/v1/oauthSignup.ts` - Platform signup/login
- `convex/api/v1/cliAuth.ts` - CLI authentication
- `src/app/api/auth/oauth-signup/route.ts` - Next.js auth routes

## Migration Plan

### Step 1: Update Code (Integration Files)

**Files to update**:
1. `convex/oauth/github.ts`
   - Change `GITHUB_OAUTH_CLIENT_ID` → `GITHUB_INTEGRATION_CLIENT_ID`
   - Change `GITHUB_OAUTH_CLIENT_SECRET` → `GITHUB_INTEGRATION_CLIENT_SECRET`

2. `convex/oauth/vercel.ts`
   - Change `VERCEL_OAUTH_CLIENT_ID` → `VERCEL_INTEGRATION_CLIENT_ID`
   - Change `VERCEL_OAUTH_CLIENT_SECRET` → `VERCEL_INTEGRATION_CLIENT_SECRET`

### Step 2: Update Environment Variables

**In `.env.local` and production**:

**Remove** (old integration variables):
```bash
# GITHUB OAUTH - INTEGRATION (OLD - REMOVE)
GITHUB_OAUTH_CLIENT_ID=Iv23liGO0d7cT4I1a6UE
GITHUB_OAUTH_CLIENT_SECRET=17009c962bfaf8f2b5d34b7933f8654436b4f2eb

# VERCEL OAUTH - INTEGRATION (OLD - REMOVE)
VERCEL_OAUTH_CLIENT_ID=oac_PcuayJt9KSxN4Xuzjv6NmLPl
VERCEL_OAUTH_CLIENT_SECRET=dytP87Ill4XGsE6SdoqySGPn
```

**Add** (new integration variables):
```bash
# GITHUB INTEGRATION - Deployment connections
GITHUB_INTEGRATION_CLIENT_ID=Iv23liGO0d7cT4I1a6UE
GITHUB_INTEGRATION_CLIENT_SECRET=17009c962bfaf8f2b5d34b7933f8654436b4f2eb

# VERCEL INTEGRATION - Deployment connections
VERCEL_INTEGRATION_CLIENT_ID=oac_PcuayJt9KSxN4Xuzjv6NmLPl
VERCEL_INTEGRATION_CLIENT_SECRET=dytP87Ill4XGsE6SdoqySGPn
```

**Keep** (authentication variables - no change):
```bash
# GOOGLE OAUTH - AUTHENTICATION (no change)
GOOGLE_OAUTH_CLIENT_ID=19450024372-6pavh8e8mdjvhfq9bk6hrv8gmus8csk2.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=19450024372-6pavh8e8mdjvhfq9bk6hrv8gmus8csk2.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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

# MICROSOFT OAUTH - AUTHENTICATION (no change)
MICROSOFT_CLIENT_ID=2dea334b-f0cf-4c18-bd97-a178104e84be
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
MICROSOFT_TENANT_ID=common
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=2dea334b-f0cf-4c18-bd97-a178104e84be

# GITHUB OAUTH - AUTHENTICATION (ADD NEW - separate from integration)
GITHUB_OAUTH_CLIENT_ID=<new_github_oauth_app_client_id>
GITHUB_OAUTH_CLIENT_SECRET=<new_github_oauth_app_client_secret>
NEXT_PUBLIC_GITHUB_CLIENT_ID=<new_github_oauth_app_client_id>
```

### Step 3: Create Separate GitHub OAuth App for Authentication

Since integrations need different scopes than authentication, create a separate GitHub OAuth app:

1. **Go to GitHub Settings**: [https://github.com/settings/developers](https://github.com/settings/developers)
2. **Create New OAuth App**:
   - **Name**: `L4YERCAK3 Platform Authentication` (or similar)
   - **Homepage URL**: `https://app.l4yercak3.com`
   - **Callback URL**: `https://app.l4yercak3.com/api/auth/oauth/callback`
   - **Scopes**: `read:user`, `user:email` (no `repo` scope needed for auth)
3. **Copy credentials** to `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`

## Complete Environment Variable Template

```bash
# ============================================
# OAUTH - AUTHENTICATION (User Signup/Login)
# ============================================

# Google OAuth - Authentication
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Microsoft OAuth - Authentication
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=common
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id

# GitHub OAuth - Authentication
GITHUB_OAUTH_CLIENT_ID=your_github_auth_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_auth_client_secret
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_auth_client_id

# ============================================
# OAUTH - INTEGRATIONS (Deployment Connections)
# ============================================

# GitHub Integration - Deployment connections
GITHUB_INTEGRATION_CLIENT_ID=your_github_integration_client_id
GITHUB_INTEGRATION_CLIENT_SECRET=your_github_integration_client_secret

# Vercel Integration - Deployment connections
VERCEL_INTEGRATION_CLIENT_ID=your_vercel_integration_client_id
VERCEL_INTEGRATION_CLIENT_SECRET=your_vercel_integration_client_secret
VERCEL_INTEGRATION_SLUG=your_vercel_integration_slug
```

## Benefits

1. ✅ **Clear separation** - Integration vs Authentication
2. ✅ **No conflicts** - Different variable names
3. ✅ **Better security** - Different OAuth apps with different scopes
4. ✅ **Easier to understand** - Variable names indicate purpose
5. ✅ **Minimal changes** - Only 2 files need updating (integration files)

## Files That Need Updates

### Code Changes (2 files):
- [ ] `convex/oauth/github.ts` - Update env var names
- [ ] `convex/oauth/vercel.ts` - Update env var names

### Documentation Updates:
- [ ] `docs/OAUTH_PROVIDER_SETUP.md` - Update with new naming
- [ ] `.env.local` - Update variable names
- [ ] Production environment variables - Update variable names

## Testing Checklist

After migration:
- [ ] Test GitHub integration connection (deployment)
- [ ] Test Vercel integration connection (deployment)
- [ ] Test GitHub authentication (signup/login)
- [ ] Test Google authentication (signup/login)
- [ ] Test Microsoft authentication (signup/login)
- [ ] Test CLI authentication with all providers
