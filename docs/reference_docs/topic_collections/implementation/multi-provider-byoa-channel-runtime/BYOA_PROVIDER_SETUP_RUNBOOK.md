# Multi-Provider BYOA Setup Runbook (Slack, Telegram, WhatsApp)

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`  
**Last updated:** 2026-02-19  
**Audience:** org owners, agency implementers, platform operators

---

## Purpose

Provide one concrete playbook for onboarding org-owned channel apps while preserving platform-managed fallback behavior.

Dual-mode contract:

1. **Platform-managed profile** remains available as controlled fallback.
2. **Org BYOA profile** is the default target for tenant-owned production messaging.

---

## Environment Values (Per Environment)

Set these values before onboarding any provider.

| Key | Dev Example | Prod Example | Used By |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://dev.example.com` | `https://app.example.com` | Slack/WhatsApp OAuth callbacks |
| `NEXT_PUBLIC_API_ENDPOINT_URL` | `https://dev.convex.site` | `https://prod.convex.site` | Telegram webhook registration |
| `META_WEBHOOK_VERIFY_TOKEN` | `dev-whatsapp-verify-token` | `prod-whatsapp-verify-token` | WhatsApp webhook challenge |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | env-scoped | env-scoped | Slack OAuth |
| `META_APP_ID` / `META_APP_SECRET` | env-scoped | env-scoped | WhatsApp OAuth + HMAC |

Use separate app credentials per environment. Do not reuse dev app credentials in production.

---

## Slack BYOA Setup

### Manifest and app configuration

Create app in the client workspace and configure these values:

1. **OAuth callback URL:**
   - `${NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback`
2. **Event subscription request URL:**
   - `${NEXT_PUBLIC_APP_URL}/slack/events`
3. **Slash command request URL** (if `commands` scope enabled):
   - `${NEXT_PUBLIC_APP_URL}/slack/commands`
4. **Bot token scopes:**
   - `app_mentions:read`
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `commands` (optional, when slash commands are enabled)

### Suggested minimal Slack manifest snippet

```yaml
display_information:
  name: Client AI Agent
features:
  bot_user:
    display_name: Client Agent
    always_online: false
oauth_config:
  redirect_urls:
    - ${NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:read
      - chat:write
      - commands
settings:
  event_subscriptions:
    request_url: ${NEXT_PUBLIC_APP_URL}/slack/events
    bot_events:
      - app_mention
```

### Slack onboarding checklist

1. Install app to client workspace.
2. From Integrations UI, run **Connect Slack Workspace**.
3. Verify one app mention response and one slash command response in a canary channel.
4. Confirm workspace metadata (workspace ID, bot user ID, granted scopes) in the settings panel.

---

## Telegram BYOA Setup

### Bot creation and webhook values

1. Create client bot with `@BotFather` (`/newbot`) and capture bot token.
2. Deploy custom bot from Integrations UI (token pasted in BYOA section).
3. Ensure webhook is set to:
   - `${NEXT_PUBLIC_API_ENDPOINT_URL}/telegram-webhook`
4. Ensure Telegram webhook secret header is supported:
   - `X-Telegram-Bot-Api-Secret-Token`

### Telegram onboarding checklist

1. Deploy custom bot token via Integrations UI.
2. Send one direct message to the bot and confirm agent response.
3. Add bot to team group and verify optional mirror behavior.
4. Confirm custom bot username and webhook URL are present in settings.

---

## WhatsApp BYOA Setup

### Meta app and OAuth/webhook configuration

Configure client Meta app with:

1. **OAuth redirect URI:**
   - `${NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`
2. **Webhook callback URL:**
   - `${NEXT_PUBLIC_APP_URL}/webhooks/whatsapp`
3. **Webhook verify token:**
   - `${META_WEBHOOK_VERIFY_TOKEN}` (or environment equivalent)
4. **Required Meta scopes:**
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`

### WhatsApp onboarding checklist

1. Org owner authorizes Meta OAuth from Integrations UI.
2. Confirm selected WABA and verified phone number post-redirect.
3. Complete webhook challenge in Meta dashboard.
4. Send inbound canary message and verify outbound agent response.

---

## Dev -> Prod Cutover Checklist

Run this checklist for each provider before production cutover.

1. Create separate production app/bot assets (Slack app, Telegram bot, Meta app).
2. Replace all callback/webhook values with production domain values.
3. Reconnect provider in production org (do not reuse dev tokens/secrets).
4. Validate inbound webhook verification and outbound response in production canary channel/chat.
5. Confirm audit trail for connect/disconnect and no platform-fallback leakage for BYOA-bound orgs.
6. Keep platform-managed fallback disabled unless explicitly required by rollback policy.

---

## Rollout Controls (Canary First)

Use rollout flags seeded by lane `A` migration and controlled by lane `E` rollout mutations.

### 1) Seed + inspect rollout flags

1. Seed defaults (idempotent):
   - `npx convex run migrations/backfillChannelRuntimeIdentity:initializeChannelRuntimeIdentityFlags`
2. Inspect current state:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:getChannelRuntimeIdentityFlagState`

### 2) Configure global rollback posture

1. Enable identity rollout controls while preserving legacy fallback during canary:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityGlobalFlag '{"enabled":true,"allowLegacyProviderFallback":true,"progressiveRollout":true,"rollbackMode":"legacy_provider_only","updatedBy":"ops@company.com"}'`

### 3) Promote providers through canary stage

1. Slack canary:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"slack","stage":"canary","canaryOrganizationIds":["org_canary_a","org_canary_b"],"updatedBy":"ops@company.com"}'`
2. Telegram canary:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"telegram","stage":"canary","canaryOrganizationIds":["org_canary_a"],"updatedBy":"ops@company.com"}'`
3. WhatsApp canary:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"whatsapp","stage":"canary","canaryOrganizationIds":["org_canary_a"],"updatedBy":"ops@company.com"}'`

### 4) Promote canary -> on only when security matrix is green

Required reference:

1. `docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/SECURITY_FAILURE_PATH_MATRIX.md`

Promotion commands (matrix evidence required):

1. Slack:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"slack","stage":"on","securityMatrixGreen":true,"securityMatrixReference":"SECURITY_FAILURE_PATH_MATRIX.md","updatedBy":"ops@company.com"}'`
2. Telegram:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"telegram","stage":"on","securityMatrixGreen":true,"securityMatrixReference":"SECURITY_FAILURE_PATH_MATRIX.md","updatedBy":"ops@company.com"}'`
3. WhatsApp:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityProviderFlag '{"provider":"whatsapp","stage":"on","securityMatrixGreen":true,"securityMatrixReference":"SECURITY_FAILURE_PATH_MATRIX.md","updatedBy":"ops@company.com"}'`

---

## Explicit Rollback Commands (Per Provider)

Run immediately when canary regression or security failure is detected.

1. Slack rollback:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:rollbackChannelRuntimeIdentityProviderFlag '{"provider":"slack","reason":"lane_e_canary_regression","updatedBy":"ops@company.com"}'`
2. Telegram rollback:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:rollbackChannelRuntimeIdentityProviderFlag '{"provider":"telegram","reason":"lane_e_canary_regression","updatedBy":"ops@company.com"}'`
3. WhatsApp rollback:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:rollbackChannelRuntimeIdentityProviderFlag '{"provider":"whatsapp","reason":"lane_e_canary_regression","updatedBy":"ops@company.com"}'`
4. Force global legacy-provider behavior:
   - `npx convex run migrations/backfillChannelRuntimeIdentity:setChannelRuntimeIdentityGlobalFlag '{"enabled":false,"allowLegacyProviderFallback":true,"rollbackMode":"legacy_provider_only","updatedBy":"ops@company.com"}'`

Post-rollback validation:

1. `npx convex run migrations/backfillChannelRuntimeIdentity:getChannelRuntimeIdentityFlagState`
2. `npm run test:unit`
3. `npm run test:integration`

---

## Key Rotation Checklist

### Slack

1. Rotate Slack client secret in provider dashboard.
2. Update environment secret and redeploy.
3. Re-run OAuth reconnect from Integrations UI.
4. Confirm scopes and event delivery after reconnect.

### Telegram

1. Regenerate bot token in `@BotFather`.
2. Redeploy custom bot with new token.
3. Verify webhook registration and secret-token validation.
4. Validate DM + team group mirror behavior.

### WhatsApp

1. Rotate Meta app secret.
2. Update environment secret and redeploy.
3. Reconnect WhatsApp OAuth token from Integrations UI.
4. Re-validate webhook challenge, HMAC verification, and inbound/outbound message flow.

---

## Agency Handoff Template

For each client handoff, record:

1. Provider owner account email (Slack/Telegram/Meta).
2. Production callback/webhook URLs configured.
3. Scope list approved and verified.
4. Canary validation timestamp and channel/chat identifiers.
5. Rotation owner and next scheduled rotation date.
