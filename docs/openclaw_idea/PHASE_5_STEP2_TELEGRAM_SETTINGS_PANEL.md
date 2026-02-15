# Phase 5 Step 2: Telegram Settings Panel

## Goal

Create the React settings panel component that displays when a user clicks the Telegram integration card.

## Depends On

- Step 1 backend API (`convex/integrations/telegram.ts`)
- `whatsapp-settings.tsx` — component structure pattern
- `chatwoot-settings.tsx` — token input + test/deploy pattern

## New File

**`src/components/window-content/integrations-window/telegram-settings.tsx`**

### Props

```typescript
interface TelegramSettingsProps {
  onBack: () => void;
}
```

### Data Hooks

```typescript
const { sessionId } = useAuth();
const { currentOrg } = useCurrentOrganization();
const status = useQuery(api.integrations.telegram.getTelegramIntegrationStatus, sessionId ? { sessionId } : "skip");
const deployBot = useAction(api.integrations.telegram.deployCustomBot);
const disconnectBot = useMutation(api.integrations.telegram.disconnectCustomBot);
const toggleMirror = useMutation(api.integrations.telegram.toggleTeamGroupMirror);
```

### Layout (3 Sections)

#### Section 1: Connection Status (always shown)

| State | Display |
|-------|---------|
| `platformBot.status === "active"` | Green CheckCircle2 + "Connected via Platform Bot" + chat ID + sender name + connected date + active chat count |
| `platformBot.status === "onboarding"` | Yellow AlertCircle + "Onboarding in Progress" + "Complete the setup interview to activate" |
| `!platformBot.connected` | Info box: "Start a conversation with the platform bot on Telegram to connect" |

#### Section 2: Custom Bot Deployment

| State | Display |
|-------|---------|
| `customBot.deployed` | Green badge "Deployed" + @username + webhook URL (copyable) + "Disconnect Custom Bot" button (with confirm dialog) |
| `!customBot.deployed` | Benefits list + BotFather token input (password field + eye toggle) + helper text ("Get a token from @BotFather...") + "Deploy Bot" button with loading state |

#### Section 3: Team Group Chat

| State | Display |
|-------|---------|
| `teamGroup.linked` | Green badge "Group Linked" + group chat ID + mirror toggle checkbox ("Mirror conversations to team group") |
| `!teamGroup.linked` | Instructions: 1. Create a Telegram group 2. Add the bot to the group 3. Auto-detected + note about who needs to add the bot |

### Key Patterns

- Use `"use client"` directive
- Dynamic API import: `const { api } = require("../../../../convex/_generated/api") as { api: any }`
- Retro UI styling with `var(--win95-*)` CSS variables
- Copy-to-clipboard for webhook URL
- Confirm dialog before disconnect
- Loading spinner while deploying

### Styling

- Header: back arrow + Send icon (color #0088cc) + "Telegram" title
- Sections: bordered cards with `var(--win95-bg-light)` backgrounds
- Badges: green for connected/deployed/linked, yellow for onboarding
- Follow existing Win95 retro theme

## Verification

- Component renders without errors
- All three sections display correctly for each state
- Deploy button calls action and updates UI
- Mirror toggle patches and reflects state
- Disconnect confirms and removes custom bot
