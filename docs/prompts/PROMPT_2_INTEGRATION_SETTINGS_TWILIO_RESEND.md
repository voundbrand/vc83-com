# Prompt 2: Build Twilio & Resend Integration Settings (BYOK Pattern)

Build proper integration settings modules for **Twilio** and **Resend** on the vc83-com platform, following the existing Slack / ElevenLabs BYOK (Bring Your Own Key) pattern. Each organization can configure their own API keys, or fall back to the platform's default keys from env vars.

## Context

The platform already has integration settings for several providers following a consistent pattern:
- **Slack**: `convex/integrationSettingsSlack.ts` + `src/components/window-content/integrations-window/slack-settings.tsx`
- **ElevenLabs**: `convex/integrationSettingsElevenlabs.ts` + UI component
- **Resend** (partial): `convex/integrations/resend.ts` + `convex/integrations/resendResolver.ts` + `src/components/window-content/integrations-window/resend-settings.tsx`

The Resend integration already exists but may need updates. Twilio is entirely new.

The landing page (`apps/one-of-one-landing/`) needs to resolve Twilio and Resend credentials for the platform organization when sending SMS OTP codes (Twilio Verify) and emails (Resend) during lead capture.

## What to build

### 1. Twilio Integration Settings (new)

**Convex backend** — `convex/integrationSettingsTwilio.ts` (or `convex/integrations/twilio.ts`):
- Store settings in `objects` table with `type: "twilio_settings"`, one per org
- Encrypted fields: `accountSid`, `authToken`
- Plain fields: `verifyServiceSid`, `smsPhoneNumber`, `enabled`
- CRUD mutations: `getTwilioSettings`, `saveTwilioSettings`, `deleteTwilioSettings`
- Use `oauth.encryption.encryptToken` / `decryptToken` for API key encryption (same as Resend)
- Permission check: require org admin role

**Resolver** — `convex/integrations/twilioResolver.ts`:
- `resolveTwilioCredentials(ctx, organizationId)` — checks org settings first, falls back to:
  - `process.env.TWILIO_ACCOUNT_SID`
  - `process.env.TWILIO_AUTH_TOKEN`
  - `process.env.TWILIO_VERIFY_SERVICE_SID`
- Returns `{ accountSid, authToken, verifyServiceSid, source: "org" | "platform" }`

**UI component** — `src/components/window-content/integrations-window/twilio-settings.tsx`:
- Follow existing Slack/Resend settings pattern
- Fields: Account SID, Auth Token (masked), Verify Service SID, SMS Phone Number
- "Test connection" button that verifies credentials
- "Use platform default" toggle (when org keys are not set)
- Save/delete buttons

### 2. Resend Integration Settings (update existing)

The Resend integration already exists at:
- `convex/integrations/resend.ts` — per-org settings (API key, sender email, reply-to, verified domains)
- `convex/integrations/resendResolver.ts` — fallback resolver (org → platform env)
- `src/components/window-content/integrations-window/resend-settings.tsx` — UI

**Review and update** the existing Resend integration to ensure:
- The resolver properly falls back to `process.env.RESEND_API_KEY`
- The sender email resolution works for both org-specific and platform-default cases
- The landing page's lead capture can use `resolveResendApiKey()` to get the right key
- Add `sevenlayers.io` domain support if needed

### 3. Landing Page Integration

**Update** the landing page API routes to use the resolvers instead of raw env vars:

- `apps/one-of-one-landing/app/api/lead-capture/request-code/route.ts`:
  - Currently: `twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)`
  - Target: Call Convex to resolve Twilio credentials for the platform org, fall back to env vars

- `apps/one-of-one-landing/app/api/lead-capture/verify/route.ts`:
  - Currently: `createResendClient()` using `process.env.RESEND_API_KEY`
  - Target: Resolve Resend API key via the platform org's settings, fall back to env vars

**Note:** The landing page uses `getConvexClient()` with admin auth via `CONVEX_DEPLOY_KEY`. The resolvers would need to be exposed as internal queries callable from the landing page's server-side routes. Look at how `channels.router.listObjectsByOrgTypeInternal` is already called for the pattern.

## Key existing patterns to follow

- **Integration settings file structure**: Look at `convex/integrationSettingsSlack.ts` for the full CRUD pattern with session validation, permission checks, and encrypted storage
- **Encryption**: `convex/oauth.ts` has `encryption.encryptToken()` and `encryption.decryptToken()`
- **UI component pattern**: `src/components/window-content/integrations-window/slack-settings.tsx` for the React component structure
- **Resolver pattern**: `convex/integrations/resendResolver.ts` for the org → platform fallback chain
- **Object type constants**: Settings are stored in the polymorphic `objects` table with a unique `type` field per integration
- **RBAC**: Use `checkPermission()` from `convex/rbacHelpers.ts` — require admin for integration settings

## Environment

- Stack: Next.js frontend (`src/`) + Convex backend (`convex/`)
- Existing Resend API key: `re_b4oocYWc_...` (in root `.env.local`)
- Existing Infobip SMS (separate from Twilio): `INFOBIP_APPLICATION_ID`, `INFOBIP_API_KEY`
- Platform org ID configured via `PLATFORM_ORG_ID` env var
- Integration settings UI lives under the org settings window
