# Environment Variable Migration Summary

**Date**: 2025-01-27  
**Status**: ✅ Code Updated - Environment Variables Need Update

## Problem Solved

Resolved naming conflict between OAuth credentials used for:
- **Integrations** (GitHub/Vercel deployment connections)
- **Authentication** (user signup/login)

## Changes Made

### Code Updates ✅

**Files Updated**:
1. ✅ `convex/oauth/github.ts`
   - Changed `GITHUB_OAUTH_CLIENT_ID` → `GITHUB_INTEGRATION_CLIENT_ID` (3 occurrences)
   - Changed `GITHUB_OAUTH_CLIENT_SECRET` → `GITHUB_INTEGRATION_CLIENT_SECRET` (1 occurrence)

2. ✅ `convex/oauth/vercel.ts`
   - Changed `VERCEL_OAUTH_CLIENT_ID` → `VERCEL_INTEGRATION_CLIENT_ID` (2 occurrences)
   - Changed `VERCEL_OAUTH_CLIENT_SECRET` → `VERCEL_INTEGRATION_CLIENT_SECRET` (1 occurrence)

### Environment Variables to Update ⚠️

**In `.env.local` and production environment**:

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

**Add** (new authentication variables - separate GitHub OAuth app):
```bash
# GITHUB OAUTH - AUTHENTICATION (NEW - separate from integration)
GITHUB_OAUTH_CLIENT_ID=<create_new_github_oauth_app_for_auth>
GITHUB_OAUTH_CLIENT_SECRET=<create_new_github_oauth_app_secret>
NEXT_PUBLIC_GITHUB_CLIENT_ID=<same_as_above>
```

## New Naming Convention

### Integration OAuth (Deployment Connections)
- `GITHUB_INTEGRATION_CLIENT_ID`
- `GITHUB_INTEGRATION_CLIENT_SECRET`
- `VERCEL_INTEGRATION_CLIENT_ID`
- `VERCEL_INTEGRATION_CLIENT_SECRET`

### Authentication OAuth (User Signup/Login)
- `GITHUB_OAUTH_CLIENT_ID` (for authentication)
- `GITHUB_OAUTH_CLIENT_SECRET` (for authentication)
- `GOOGLE_OAUTH_CLIENT_ID` (no change)
- `GOOGLE_OAUTH_CLIENT_SECRET` (no change)
- `MICROSOFT_CLIENT_ID` (no change)
- `MICROSOFT_CLIENT_SECRET` (no change)

## Next Steps

1. ✅ **Code updated** - Integration files now use new variable names
2. ⚠️ **Update `.env.local`** - Rename integration variables
3. ⚠️ **Update production environment** - Rename integration variables
4. ⚠️ **Create GitHub OAuth app for authentication** - Separate from integration app
5. ⚠️ **Test** - Verify integrations and authentication both work

## Testing Checklist

After updating environment variables:
- [ ] Test GitHub integration connection (deployment)
- [ ] Test Vercel integration connection (deployment)
- [ ] Test GitHub authentication (signup/login)
- [ ] Test Google authentication (signup/login)
- [ ] Test Microsoft authentication (signup/login)
- [ ] Test CLI authentication with all providers

## Files That Reference These Variables

### Integration Files (Updated ✅):
- `convex/oauth/github.ts` - Uses `GITHUB_INTEGRATION_CLIENT_ID` / `GITHUB_INTEGRATION_CLIENT_SECRET`
- `convex/oauth/vercel.ts` - Uses `VERCEL_INTEGRATION_CLIENT_ID` / `VERCEL_INTEGRATION_CLIENT_SECRET`

### Authentication Files (No changes needed ✅):
- `convex/api/v1/oauthSignup.ts` - Uses `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` (for auth)
- `convex/api/v1/cliAuth.ts` - Uses `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` (for auth)
- `src/app/api/auth/oauth-signup/route.ts` - Uses `GITHUB_OAUTH_CLIENT_ID` (for auth)

## Documentation

See `docs/ENV_VAR_NAMING_CONVENTION.md` for complete naming convention and migration guide.
