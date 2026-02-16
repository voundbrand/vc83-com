# Phase 5: Telegram Integration UI

## Goal

Surface the Telegram connection in the Integrations window so users who onboarded via Telegram can see their setup, optionally deploy a custom branded bot, and manage team group chat mirroring.

## Why

After onboarding, the org has an active `telegramMappings` record and uses the platform bot — but users have zero visibility into this. The integrations window shows WhatsApp, Chatwoot, GitHub, etc., but no Telegram. All backend features (custom bot deployment, team group mirroring) already exist and work; they just lack a UI.

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Telegram provider (inbound + outbound) | Done | `convex/channels/providers/telegramProvider.ts` |
| Per-org bot deployment (validate, register webhook, store) | Done | `convex/channels/telegramBotSetup.ts` |
| Team group detection + linking | Done | `convex/channels/telegramGroupSetup.ts` |
| Team group message mirroring | Done | `convex/channels/telegramGroupMirror.ts` |
| telegramMappings table + schema | Done | `convex/schemas/telegramSchemas.ts` |
| Integrations window with card grid | Done | `src/components/window-content/integrations-window/` |
| WhatsApp/Chatwoot settings panels (reference) | Done | Same folder |
| Platform bot fallback in router | Done | `convex/channels/router.ts` |

## What's Missing

| Component | Step |
|-----------|------|
| Public backend API for Telegram settings UI | Step 1 |
| Telegram settings panel React component | Step 2 |
| Telegram card in integrations grid + routing | Step 3 |

## Steps

1. **PHASE_5_STEP1_TELEGRAM_BACKEND_API** — Create `convex/integrations/telegram.ts` with status query, deploy action, disconnect mutation, mirror toggle
2. **PHASE_5_STEP2_TELEGRAM_SETTINGS_PANEL** — Create `telegram-settings.tsx` with 3 sections: connection status, custom bot, team group
3. **PHASE_5_STEP3_TELEGRAM_CARD_WIRING** — Add Telegram card to BUILT_IN_INTEGRATIONS, status query, connected badge, panel routing

## Licensing

Available on **all tiers including Free** — Telegram is the primary onboarding channel, and the platform bot costs nothing. Uses existing `deploymentIntegrationsEnabled` feature flag.

## No Infrastructure Changes Needed

- No schema changes (telegramMappings + objects tables ready)
- No channel registry changes (telegram provider registered)
- No http.ts changes (`/telegram-webhook` route exists)
- No tierConfigs.ts changes (using existing feature flag)
