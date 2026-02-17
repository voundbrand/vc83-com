# Unified OAuth Account Creation System

## Overview

We've created a **unified OAuth account creation system** that works for both **Platform UI** and **CLI**. This replaces the previous CLI-specific OAuth flow and enables OAuth signup for the platform UI.

## What Changed

### Before
- **Platform UI**: Only email/password signup (no OAuth)
- **CLI**: Had its own OAuth flow (`cliAuth.ts`) that was CLI-specific
- **Platform OAuth**: Only for connecting external accounts to existing platform accounts (not for signup)

### After
- **Platform UI**: Can now sign up/login with Microsoft, Google, or GitHub OAuth
- **CLI**: Uses the same unified OAuth endpoints
- **Unified Flow**: One set of endpoints handles both UI and CLI OAuth signup

## Architecture

### New Files Created

1. **`convex/api/v1/oauthSignup.ts`**
   - Unified OAuth account creation logic
   - Supports Microsoft, Google, and GitHub
   - Creates platform sessions OR CLI sessions based on `sessionType`

2. **`src/app/api/auth/oauth-signup/route.ts`**
   - Initiates OAuth signup flow
   - Works for both platform UI and CLI
   - Query params: `provider`, `sessionType`, `callback`, `organizationName`

3. **`src/app/api/auth/oauth/callback/route.ts`**
   - Unified OAuth callback for both Platform UI and CLI
   - Detects session type from state and routes accordingly

4. **Schema Updates**
   - Added `oauthSignupStates` table for CSRF protection
   - Stores state for both platform and CLI flows

### Updated Files

- **`convex/schemas/coreSchemas.ts`**: Added `oauthSignupStates` table
- **`convex/schema.ts`**: Exported `oauthSignupStates` table

## How It Works

### Platform UI Flow

```
1. User clicks "Sign up with Microsoft" on platform UI
   ↓
2. GET /api/auth/oauth-signup?provider=microsoft&sessionType=platform
   ↓
3. Redirects to Microsoft OAuth (with callback: /api/auth/oauth/callback)
   ↓
4. User authorizes
   ↓
5. GET /api/auth/oauth/callback?code=...&state=...
   ↓
6. Unified callback detects sessionType="platform" from state
   ↓
7. Creates account (if new) or logs in (if existing)
   ↓
8. Creates platform session
   ↓
9. Redirects to platform home with session token
```

### CLI Flow

```
1. User runs `l4yercak3 login`
   ↓
2. CLI opens browser: GET /api/auth/oauth-signup?provider=microsoft&sessionType=cli&callback=http://localhost:3001/callback
   ↓
3. Redirects to Microsoft OAuth (with callback: /api/auth/oauth/callback)
   ↓
4. User authorizes
   ↓
5. GET /api/auth/oauth/callback?code=...&state=...
   ↓
6. Unified callback detects sessionType="cli" from state
   ↓
7. Creates account (if new) or logs in (if existing)
   ↓
8. Creates CLI session
   ↓
9. Redirects to CLI callback URL (localhost:3001) with token
```

## Key Differences from Old System

### Old CLI Flow (`cliAuth.ts`)
- CLI-specific logic
- Used `cliLoginStates` table
- Separate from platform signup

### New Unified Flow (`oauthSignup.ts`)
- **Reusable** by both UI and CLI
- Uses `oauthSignupStates` table
- Same account creation logic for both
- Determines session type via `sessionType` parameter

## OAuth Providers Supported

All three providers work for both Platform UI and CLI:

1. **Microsoft** ✅ (NEW - was missing for account creation)
2. **Google** ✅
3. **GitHub** ✅

## API Endpoints

### Initiate OAuth Signup
```
GET /api/auth/oauth-signup
Query params:
  - provider: "microsoft" | "google" | "github" (required)
  - sessionType: "platform" | "cli" (default: "platform")
  - callback: Callback URL (required for CLI, optional for platform - defaults to home)
  - organizationName: Optional organization name for new accounts
```

### Unified OAuth Callback (Platform UI + CLI)
```
GET /api/auth/oauth/callback
Query params:
  - code: OAuth authorization code
  - state: CSRF state token (contains sessionType and other metadata)
  - provider: OAuth provider (optional, can be detected from state)
```

> **Note:** This single callback URL handles both Platform UI and CLI automatically by detecting `sessionType` from the state parameter.

## Next Steps

### For Platform UI
1. Create signup page component with OAuth buttons
2. Add "Sign up with Microsoft/Google/GitHub" buttons
3. Link buttons to `/api/auth/oauth-signup?provider=...&sessionType=platform`

### For CLI
1. Update CLI login command to use unified endpoints
2. Update CLI to call `/api/auth/oauth-signup` instead of `/api/auth/cli-login`
3. Keep backward compatibility with old CLI auth flow (or migrate)

## Migration Notes

- **Old CLI auth flow** (`cliAuth.ts`) still exists for backward compatibility
- **New unified flow** (`oauthSignup.ts`) is the recommended approach
- Both flows create the same account type - just different session types
- Platform OAuth connection flow (`oauth/microsoft.ts`) is unchanged - that's for connecting external accounts to existing platform accounts

## Benefits

1. **DRY**: One codebase for OAuth signup (not duplicated)
2. **Consistency**: Same account creation logic for UI and CLI
3. **Microsoft Support**: Now supports Microsoft OAuth for account creation
4. **Future-Proof**: Easy to add more providers or session types
5. **Simplified Setup**: **One callback URL per provider** (instead of two) - easier OAuth app configuration

