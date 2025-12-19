# CLI Authentication Implementation

## Overview

Backend implementation for CLI authentication following GitHub CLI pattern. Users authenticate via browser OAuth, then receive a CLI session token.

## Files Created

### Convex Backend (`convex/api/v1/cliAuth.ts`)
- `initiateCliLogin` - Creates OAuth state and returns auth URL
- `completeCliLogin` - Creates CLI session after OAuth completes
- `validateCliSession` - Validates CLI session token
- `refreshCliSession` - Refreshes expired session
- Internal helpers for state management

### Next.js API Routes

1. **`src/app/api/auth/cli-login/route.ts`**
   - `GET /api/auth/cli-login` - Initiates CLI login flow
   - Redirects to platform OAuth

2. **`src/app/api/auth/cli/callback/route.ts`**
   - `GET /api/auth/cli/callback` - Handles OAuth callback
   - Creates CLI session and redirects to CLI callback URL
   - **TODO:** Needs to extract user info from OAuth code

3. **`src/app/api/v1/auth/cli/validate/route.ts`**
   - `GET /api/v1/auth/cli/validate` - Validates CLI session
   - Returns user info and organizations

4. **`src/app/api/v1/auth/cli/refresh/route.ts`**
   - `POST /api/v1/auth/cli/refresh` - Refreshes CLI session
   - Returns new token

## Database Schema Required

See `docs/CLI_AUTH_SCHEMA.md` for required schema changes:

- `cliSessions` table - Stores CLI session tokens
- `cliLoginStates` table - Stores temporary OAuth state

## TODO: OAuth Integration

The callback route (`src/app/api/auth/cli/callback/route.ts`) currently has placeholders for:
1. Exchanging OAuth code for access token
2. Getting user info from OAuth provider
3. Finding/creating user in database

**Next Steps:**
- Integrate with existing OAuth flow (Google/Microsoft/GitHub)
- Extract user info from OAuth provider
- Use existing user lookup/create logic from `convex/onboarding.ts`

## Testing

1. **Test CLI Login Flow:**
   ```bash
   # CLI calls
   GET /api/auth/cli-login?callback=http://localhost:3001/callback
   
   # Should redirect to platform OAuth
   # After OAuth, redirects to:
   GET /api/auth/cli/callback?state=...&code=...
   
   # Which redirects to CLI callback with token:
   http://localhost:3001/callback?token=cli_session_...
   ```

2. **Test Session Validation:**
   ```bash
   GET /api/v1/auth/cli/validate
   Authorization: Bearer cli_session_...
   ```

3. **Test Session Refresh:**
   ```bash
   POST /api/v1/auth/cli/refresh
   Authorization: Bearer cli_session_...
   ```

## Integration Points

- Uses existing `sessions` table pattern
- Follows OAuth state management pattern from `convex/oauth/microsoft.ts`
- Integrates with existing user/organization system

## Security Considerations

- CLI tokens expire after 30 days
- OAuth state tokens expire after 10 minutes
- CSRF protection via state tokens
- Tokens stored securely (not in git)
- Session validation on every request

