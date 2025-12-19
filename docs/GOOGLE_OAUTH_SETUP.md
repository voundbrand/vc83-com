# Google OAuth Setup Guide

## Overview

This guide walks you through setting up Google OAuth for the L4YERCAK3 platform. Google OAuth is used for:
- Platform user authentication (CLI and web UI)
- Google Workspace integrations (email, calendar, etc.)

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console

## Step 1: Create OAuth 2.0 Client ID

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Enable Google+ API** (if not already enabled)
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
   - Note: Google+ API is being deprecated, but OAuth still works

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - User Type: External (or Internal if using Google Workspace)
     - App name: "L4YERCAK3 Platform"
     - User support email: Your email
     - Developer contact: Your email
     - Scopes: `openid`, `profile`, `email` (minimum)
     - Save and continue

4. **Create OAuth Client ID**
   - Application type: **Web application**
   - Name: `L4YERCAK3 Platform`
   - Authorized redirect URIs:
     ```
     https://your-app.com/api/oauth/google/callback
     http://localhost:3000/api/oauth/google/callback  (for development)
     ```

5. **Save Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Store them securely

## Step 2: Configure Environment Variables

Add these to your `.env` or environment configuration:

```bash
# Google OAuth (Platform)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here

# For CLI login page (if using client-side OAuth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Step 3: Test the Integration

1. **Test Platform OAuth Connection:**
   - Go to platform settings → Integrations
   - Click "Connect Google"
   - Complete OAuth flow
   - Verify connection appears

2. **Test CLI Login:**
   ```bash
   cd ~/Development/l4yercak3-cli
   node bin/cli.js login
   ```
   - Select "Continue with Google"
   - Complete OAuth flow
   - Verify CLI receives token

## OAuth Scopes

### Minimum Scopes (for authentication)
- `openid` - OpenID Connect
- `profile` - Basic profile info
- `email` - Email address

### Additional Scopes (for integrations)
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/calendar` - Calendar access
- `https://www.googleapis.com/auth/drive` - Google Drive access

## Security Notes

- **Client Secret:** Never expose in client-side code
- **Redirect URIs:** Only add trusted domains
- **Scopes:** Request minimum required scopes
- **Refresh Tokens:** Stored encrypted in database

## Troubleshooting

### "redirect_uri_mismatch" Error
- Check redirect URI matches exactly (including http vs https)
- Verify redirect URI is added in Google Cloud Console

### "invalid_client" Error
- Verify `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` are correct
- Check environment variables are loaded

### Token Exchange Fails
- Verify OAuth consent screen is configured
- Check scopes are approved
- Ensure API is enabled in Google Cloud Console

## Files Created

- `convex/oauth/google.ts` - Google OAuth integration logic
- `src/app/api/oauth/google/callback/route.ts` - OAuth callback handler
- `docs/GOOGLE_OAUTH_SETUP.md` - This guide

## Next Steps

1. ✅ Set up Google OAuth app in Google Cloud Console
2. ✅ Add environment variables
3. ✅ Test platform integration
4. ✅ Test CLI login
5. ⏭️ Add Google-specific integrations (Gmail, Calendar, etc.)

---

**Status:** Google OAuth implementation complete ✅  
**Ready for:** Testing and integration

