# Phase 5 Step 3: Telegram Card Wiring

## Goal

Add the Telegram integration card to the integrations grid and wire it to the settings panel.

## Depends On

- Step 1 backend API
- Step 2 settings panel component

## File to Modify

**`src/components/window-content/integrations-window/index.tsx`**

### Change A: Add Import (after line 14)

```typescript
import { TelegramSettings } from "./telegram-settings";
```

### Change B: Add Card to BUILT_IN_INTEGRATIONS (before api-keys entry, line 134)

```typescript
{
  id: "telegram",
  name: "Telegram",
  description: "Bot messaging & team group chat",
  icon: "fab fa-telegram-plane",
  iconColor: "#0088cc",
  status: "available" as const,
  type: "builtin" as const,
  accessCheck: { type: "feature" as const, key: "deploymentIntegrationsEnabled" },
},
```

Using `deploymentIntegrationsEnabled` — available on all tiers including Free.

### Change C: Add Status Query (after line 708)

Extract `sessionId` from `useAuth()` at line 665, then add:

```typescript
const telegramStatus = useQuery(
  api.integrations.telegram.getTelegramIntegrationStatus,
  isSignedIn && sessionId ? { sessionId } : "skip"
);
```

### Change D: Dynamic Connected Status (line 1076-1082)

Extend the status computation ternary:

```typescript
status={
  isLocked
    ? "locked"
    : integration.id === "microsoft" && microsoftConnection?.status === "active"
    ? "connected"
    : integration.id === "telegram" && telegramStatus?.platformBot?.connected
    ? "connected"
    : integration.status
}
```

### Change E: Panel Routing (after line 887)

```typescript
if (selectedIntegration.type === "builtin" && selectedIntegration.id === "telegram") {
  return <TelegramSettings onBack={handleBack} />;
}
```

## Verification

1. `npx tsc --noEmit` — compiles clean
2. Open integrations window → Telegram card visible in "Platform Integrations" grid
3. Card shows green "connected" badge if org has active telegramMappings
4. Click card → TelegramSettings panel opens with back button
5. Back button returns to grid view
