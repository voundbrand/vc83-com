# OAuth Provider Setup Guide

Complete setup instructions for Google, Microsoft, and GitHub OAuth providers. These credentials are used for both **Platform UI signup/login** and **CLI authentication**.

**Important:** You only need to configure **one callback URL per provider** - the unified callback handles both Platform UI and CLI automatically.

## Overview

You need to create OAuth apps with each provider and configure callback URLs. The same OAuth apps are used for:
- Platform UI signup/login (`/api/auth/oauth-signup/callback`)
- CLI authentication (`/api/auth/cli/callback`)

---

## 1. GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. **Go to GitHub Settings:**
   - Navigate to: [https://github.com/settings/developers](https://github.com/settings/developers)
   - Click **"OAuth Apps"** → **"New OAuth App"**

2. **Fill in Application Details:**
   - **Application name:** `L4YERCAK3 Platform` (or your app name)
   - **Homepage URL:** `https://app.l4yercak3.com` (or your production URL)
   - **Authorization callback URL:** See below

3. **Configure Callback URL:**

   Add **one unified callback URL** (works for both Platform UI and CLI):

   **Production:**
   ```
   https://app.l4yercak3.com/api/auth/oauth/callback
   ```

   **Development (if applicable):**
   ```
   http://localhost:3000/api/auth/oauth/callback
   ```

   > **Note:** This single callback URL handles both Platform UI signup and CLI authentication automatically.

4. **Save and Copy Credentials:**
   - Click **"Register application"**
   - Copy the **Client ID**
   - Click **"Generate a new client secret"** and copy the **Client Secret**

### Step 2: Add Environment Variables

Add to your `.env.local` (and production environment):

```bash
# GitHub OAuth Credentials
GITHUB_OAUTH_CLIENT_ID=your_github_client_id_here
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret_here

# Public client ID for frontend (CLI login page)
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
```

### Step 3: Testing

1. **Platform UI:**
   - Navigate to signup page
   - Click "Continue with GitHub"
   - Complete OAuth flow
   - Should redirect back to platform with session

2. **CLI:**
   - Run `l4yercak3 login`
   - Select GitHub provider
   - Complete OAuth flow
   - Should redirect to CLI with token

---

## 2. Microsoft OAuth Setup (Azure AD / Entra ID)

### Step 1: Register Application in Azure Portal

1. **Go to Azure Portal:**
   - Navigate to: [https://portal.azure.com/](https://portal.azure.com/)
   - Go to **"Microsoft Entra ID"** (formerly Azure AD)
   - Click **"App registrations"** → **"New registration"**

2. **Fill in Application Details:**
   - **Name:** `L4YERCAK3 Platform` (or your app name)
   - **Supported account types:** 
     - Choose based on your needs:
       - **"Accounts in any organizational directory and personal Microsoft accounts"** (recommended for public platform)
       - **"Accounts in this organizational directory only"** (for internal use)
   - **Redirect URI:** See below

3. **Configure Redirect URIs:**

   Add **one unified redirect URI** (works for both Platform UI and CLI):

   **Production:**
   - **Platform:** Web
   - **URL:** `https://app.l4yercak3.com/api/auth/oauth/callback`

   **Development (if applicable):**
   - **Platform:** Web
   - **URL:** `http://localhost:3000/api/auth/oauth/callback`

4. **Create Client Secret:**
   - Go to **"Certificates & secrets"** → **"New client secret"**
   - **Description:** `L4YERCAK3 Platform Secret`
   - **Expires:** Choose expiration (recommend 24 months)
   - Click **"Add"**
   - **⚠️ IMPORTANT:** Copy the **Value** immediately (you won't see it again!)

5. **Copy Credentials:**
   - Go to **"Overview"**
   - Copy the **Application (client) ID**
   - Copy the **Directory (tenant) ID** (if needed)
   - Copy the **Client Secret Value** (from step 4)

### Step 2: Add Environment Variables

Add to your `.env.local` (and production environment):

```bash
# Microsoft OAuth Credentials
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here

# Public client ID for frontend (CLI login page)
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
```

### Step 3: Testing

1. **Platform UI:**
   - Navigate to signup page
   - Click "Continue with Microsoft"
   - Complete OAuth flow
   - Should redirect back to platform with session

2. **CLI:**
   - Run `l4yercak3 login`
   - Select Microsoft provider
   - Complete OAuth flow
   - Should redirect to CLI with token

---

## 3. Google OAuth Setup

### Step 1: Create Google OAuth App

1. **Go to Google Cloud Console:**
   - Navigate to: [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Select an existing project or create a new one

2. **Enable Google People API:**
   - Go to **"APIs & Services"** → **"Enable APIs and Services"**
   - Search for **"Google People API"** and enable it
   - This is needed to fetch user profile information (email, name)

3. **Create OAuth Client ID:**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - If prompted, configure OAuth consent screen first:
     - **User Type:** External (for public platform) or Internal (for workspace)
     - **App name:** `L4YERCAK3 Platform`
     - **User support email:** Your email
     - **Developer contact:** Your email
     - **Scopes:** Add `openid`, `profile`, `email`
     - **Test users:** Add test emails if in testing mode

4. **Configure OAuth Client:**
   - **Application type:** **Web application**
   - **Name:** `L4YERCAK3 Platform` (or your app name)

5. **Configure Authorized Redirect URIs:**

   Add **one unified redirect URI** (works for both Platform UI and CLI):

   **Production:**
   ```
   https://app.l4yercak3.com/api/auth/oauth/callback
   ```

   **Development (if applicable):**
   ```
   http://localhost:3000/api/auth/oauth/callback
   ```

6. **Save Credentials:**
   - Click **"Create"**
   - Copy the **Client ID**
   - Copy the **Client Secret**

### Step 2: Add Environment Variables

Add to your `.env.local` (and production environment):

```bash
# Google OAuth Credentials
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here

# Public client ID for frontend (CLI login page)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Step 3: Testing

1. **Platform UI:**
   - Navigate to signup page
   - Click "Continue with Google"
   - Complete OAuth flow
   - Should redirect back to platform with session

2. **CLI:**
   - Run `l4yercak3 login`
   - Select Google provider
   - Complete OAuth flow
   - Should redirect to CLI with token

---

## Complete Environment Variables Checklist

Here's a complete `.env.local` template with all OAuth providers:

```bash
# App URL
NEXT_PUBLIC_APP_URL=https://app.l4yercak3.com

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Callback URL Summary

### Unified Callback URL (Platform UI + CLI)

**Production:**
```
https://app.l4yercak3.com/api/auth/oauth/callback
```

**Development (if applicable):**
```
http://localhost:3000/api/auth/oauth/callback
```

> **Note:** This single callback URL automatically handles both Platform UI signup and CLI authentication by detecting the session type from the OAuth state parameter.

---

## Troubleshooting

### "Invalid redirect_uri" Error

**Cause:** Callback URL doesn't match exactly what's registered in OAuth app.

**Solution:**
- Check that URLs match **exactly** (including `http` vs `https`, trailing slashes, etc.)
- Ensure both callback URLs are registered (platform UI and CLI)
- For GitHub: You may need separate OAuth apps for production/development

### "Missing required parameters" Error

**Cause:** Environment variables not set correctly.

**Solution:**
- Verify all `CLIENT_ID` and `CLIENT_SECRET` variables are set
- Check that `NEXT_PUBLIC_*` variables are set for frontend
- Restart your development server after adding environment variables

### "Failed to fetch user profile" Error

**Cause:** Required APIs not enabled (Google) or insufficient scopes.

**Solution:**
- **Google:** Ensure "Google People API" is enabled
- **Microsoft:** Ensure scopes include `openid profile email`
- **GitHub:** Ensure scopes include `read:user user:email`

### CLI Callback Not Working

**Cause:** Local server on port 3001 not accessible or blocked.

**Solution:**
- Ensure port 3001 is not blocked by firewall
- Check that no other process is using port 3001
- Try a different port if needed (update CLI code)

---

## Security Best Practices

1. **Never commit secrets to git:**
   - Add `.env.local` to `.gitignore`
   - Use environment variable management (Vercel, etc.) for production

2. **Rotate secrets regularly:**
   - Set expiration dates on client secrets
   - Rotate secrets if compromised

3. **Use separate OAuth apps for production/development:**
   - Prevents accidental production access from development
   - Easier to manage and audit

4. **Restrict redirect URIs:**
   - Only add URIs you actually use
   - Don't use wildcards unless necessary

5. **Monitor OAuth usage:**
   - Check provider dashboards for unusual activity
   - Set up alerts for failed authentication attempts

---

## Next Steps

After setting up OAuth providers:

1. ✅ Test Platform UI signup with each provider
2. ✅ Test CLI login with each provider
3. ✅ Verify sessions are created correctly
4. ✅ Test account creation (new users) and login (existing users)
5. ✅ Monitor for any errors in production

---

## Support

If you encounter issues:

1. Check provider-specific documentation:
   - [GitHub OAuth Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
   - [Microsoft Identity Platform Docs](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
   - [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)

2. Check application logs for detailed error messages

3. Verify callback URLs are accessible and match exactly

