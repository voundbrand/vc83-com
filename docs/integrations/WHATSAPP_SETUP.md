# WhatsApp Business API Integration Setup

This guide covers how to set up the Meta Developer App that enables your platform users to connect their WhatsApp Business accounts.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Platform (l4yercak3)                                       │
│  - Provides OAuth "Connect WhatsApp" button                      │
│  - Stores org credentials encrypted in oauthConnections          │
│  - Sends messages using org's token + phoneNumberId              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Meta Platform (developers.facebook.com)                         │
│  - Your Meta App handles OAuth                                   │
│  - Each org connects their own WhatsApp Business Account         │
│  - Meta bills each org directly for messages                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with your Facebook account (or create one)
3. Accept the developer terms

---

## Step 2: Create Meta App

1. Click **Create App** in the top right
2. Select **"Other"** use case → **"Business"** type
3. Fill in:
   - **App Name**: `l4yercak3 WhatsApp Integration` (or your brand)
   - **App Contact Email**: Your support email
   - **Business Account**: Select or create one
4. Click **Create App**

---

## Step 3: Add WhatsApp Product

1. In your app dashboard, find **"Add products to your app"**
2. Click **Set Up** on **WhatsApp**
3. You'll see the WhatsApp Business API setup page

---

## Step 4: Configure OAuth Settings

### 4.1 Facebook Login Settings

1. In left sidebar: **Facebook Login** → **Settings**
2. Add OAuth Redirect URI:
   ```
   https://your-domain.com/api/oauth/whatsapp/callback
   ```
   For development:
   ```
   http://localhost:3000/api/oauth/whatsapp/callback
   ```
3. Enable:
   - ✅ Client OAuth Login
   - ✅ Web OAuth Login
   - ✅ Enforce HTTPS (for production)

### 4.2 App Settings

1. Go to **Settings** → **Basic**
2. Note your:
   - **App ID** → `META_APP_ID`
   - **App Secret** → `META_APP_SECRET`
3. Add your domain to **App Domains**
4. Set **Privacy Policy URL** (required for production)
5. Set **Terms of Service URL** (optional but recommended)

---

## Step 5: Request Permissions

For users to connect their WhatsApp Business Accounts, you need these permissions:

### Required Permissions

| Permission | Description | Review Required |
|------------|-------------|-----------------|
| `whatsapp_business_management` | Read WABA info, phone numbers | Yes |
| `whatsapp_business_messaging` | Send messages on behalf of user | Yes |
| `business_management` | Access business info | Yes |

### How to Request

1. Go to **App Review** → **Permissions and Features**
2. Click **Request** next to each permission
3. Provide:
   - **Use case description**: Explain that your platform allows businesses to automate WhatsApp messaging for appointment reminders, booking confirmations, etc.
   - **Screencast**: Record a video showing the OAuth flow and how messages are sent
   - **Privacy policy**: Link to your privacy policy

**Note**: For development/testing, you can use these permissions with your own WhatsApp Business Account without approval.

---

## Step 6: Environment Variables

Add these to your Convex environment (`npx convex env set`):

```bash
# Meta App Credentials
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here

# Optional: Embedded Signup Config ID (for simplified onboarding)
META_WHATSAPP_CONFIG_ID=

# Your app URL (for OAuth redirect)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

For local development:
```bash
npx convex env set META_APP_ID "your_app_id"
npx convex env set META_APP_SECRET "your_app_secret"
```

---

## Step 7: Test the Integration

### 7.1 Development Testing

1. Use your own Meta Business account
2. Ensure you have a WhatsApp Business Account with a phone number
3. Click "Connect WhatsApp" in your platform
4. Complete the OAuth flow
5. Check the connection in your database

### 7.2 Verify Connection

```typescript
// In Convex dashboard or via API
const connection = await ctx.db
  .query("oauthConnections")
  .withIndex("by_org_and_provider", q =>
    q.eq("organizationId", orgId).eq("provider", "whatsapp")
  )
  .first();

console.log(connection?.customProperties);
// Should show: { wabaId, phoneNumberId, phoneNumber, ... }
```

### 7.3 Send Test Message

Use the WhatsApp Manager in Meta Business Suite to send a test message first, then try via your platform.

---

## Step 8: Message Templates

WhatsApp requires pre-approved templates for business-initiated messages.

### Create Templates in Meta Business Suite

1. Go to [business.facebook.com](https://business.facebook.com)
2. Navigate to **WhatsApp Manager** → **Account tools** → **Message templates**
3. Click **Create template**
4. Fill in:
   - **Category**: `UTILITY` (for reminders/confirmations)
   - **Name**: `booking_reminder` (lowercase, underscores)
   - **Language**: `de` (German)
   - **Body**: Include variables as `{{1}}`, `{{2}}`, etc.

### Example Templates

**Booking Reminder** (`booking_reminder`):
```
Hallo {{1}},

Erinnerung: {{2}} am {{3}} um {{4}} Uhr.

Wir freuen uns auf Sie!
```

**Booking Confirmation** (`booking_confirmation`):
```
Vielen Dank für Ihre Buchung!

{{1}} wurde bestätigt für {{2}}.

Bei Fragen antworten Sie auf diese Nachricht.
```

### Template Approval

- Templates are reviewed by Meta (24-72 hours)
- `UTILITY` templates have higher approval rates
- Avoid promotional language in utility templates

---

## Costs

### Who Pays?

- **Your platform**: Nothing for WhatsApp API access
- **Your users (orgs)**: Pay Meta directly based on their message volume

### Meta Pricing (Germany, approx.)

| Conversation Type | Cost |
|-------------------|------|
| Utility (reminders, confirmations) | ~€0.05-0.07 |
| Marketing (promotions) | ~€0.10-0.15 |
| Authentication (OTP) | ~€0.03-0.05 |

First 1,000 conversations/month are FREE per WhatsApp Business Account.

---

## Token Refresh

Meta access tokens are valid for **60 days**. Your platform should:

1. Track `tokenExpiresAt` in the connection
2. Warn users when token expires in < 7 days
3. Prompt re-authentication when expired

The `getWhatsAppConnectionStatus` query already checks for expiring tokens.

---

## Troubleshooting

### "No approved WhatsApp Business Account found"

- User needs to set up WABA in Meta Business Suite first
- WABA must be in "APPROVED" status

### "No WhatsApp phone number configured"

- User needs to add a phone number to their WABA
- Phone must be verified in Meta Business Suite

### "Token expired"

- Long-lived tokens last 60 days
- User needs to reconnect via OAuth

### "Template not found"

- Template name is case-sensitive (use lowercase)
- Template must be approved by Meta
- Check language code matches

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `convex/schemas/coreSchemas.ts` | Added `"whatsapp"` to provider union |
| `convex/oauth/whatsapp.ts` | OAuth flow + message sending |
| `convex/sequences/messageSender.ts` | Updated to use org credentials |
| `src/app/api/oauth/whatsapp/callback/route.ts` | OAuth callback handler |

---

## Next Steps

1. [ ] Create Meta Developer App
2. [ ] Configure OAuth settings
3. [ ] Add environment variables
4. [ ] Test with your own WABA
5. [ ] Request permission approval for production
6. [ ] Create message templates
7. [ ] Add UI for "Connect WhatsApp" in Integrations window
