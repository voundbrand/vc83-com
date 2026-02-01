# Plan: Move Self-Heal Deploy Flow to Builder Chat

## Current State (2026-01-30)

### What Works
- **npm SDK published**: `@l4yercak3/sdk@1.0.0` is live on npm - the root cause of all prior `404 Not Found` build failures is resolved
- **GitHub integration**: `convex/integrations/github.ts` pushes scaffold + v0-generated files to a GitHub repo
- **Vercel integration**: `convex/integrations/vercel.ts` creates Vercel projects, sets env vars, polls deployment status
- **Self-heal module**: `convex/integrations/selfHealDeploy.ts` uses OpenRouter/Claude to analyze build logs, generate code fixes, push to GitHub, and poll for success (max 3 attempts, with v0 fallback on attempt 3)
- **Scaffold files**: Now includes `globals.css`, `tsconfig.json`, `layout.tsx`, `package.json`, `next.config.js`, `.gitignore`, `README.md`
- **Publish dropdown UI**: Shows inline deployment progress, build logs, Auto-Fix & Redeploy button

### What's Broken / Needs Fixing
1. **State loss on dropdown close**: The publish dropdown (`src/components/builder/publish-dropdown.tsx`) loses all healing state when closed. Multi-attempt heal loops can't survive UI navigation.
2. **v0 font import issue**: v0-generated `layout.tsx` often imports local fonts like `@/fonts/GeistVF.woff` that don't exist in the deployed file tree. The self-heal LLM needs to strip these, or we need to always override v0's layout.
3. **Self-heal JSON parsing**: Was fixed (bumped `MAX_FIX_TOKENS` to 16000, added brace-depth JSON extraction + truncation repair), but needs testing with a real deployment.
4. **Scaffold files untested**: `globals.css` and `tsconfig.json` were just added to `github.ts` but haven't been tested in a deploy yet.

---

## Architecture: Chat-Based Self-Heal Loop

### Problem
The publish dropdown is ephemeral UI. Closing it loses all healing state (attempt count, build logs, fix history). The builder chat already has persistent message state in the DB and is the natural place for a multi-attempt debug loop.

### Proposed Flow

```
User clicks "Publish to Production" in dropdown
  |
  v
Dropdown triggers deploy (existing flow)
  |
  v
Deploy fails? --> Dropdown shows error summary + "Fix in Chat" button
  |                 (instead of current "Auto-Fix & Redeploy" button)
  v
User clicks "Fix in Chat" --> Sends a system/assistant message to builder chat:
  |
  v
Builder Chat receives deployment failure context:
  - Build error logs
  - Current file tree (what was pushed)
  - Attempt number (1 of 3)
  - vercelProjectId, githubRepo, etc.
  |
  v
Chat auto-triggers self-heal action:
  1. LLM analyzes build logs (existing selfHealDeploy.ts logic)
  2. Generates fixes, pushes to GitHub
  3. Polls Vercel for new deploy status
  4. Posts progress messages to chat ("Applying fix...", "Building...", "Still failing...")
  |
  v
If still failing (attempt < 3):
  - Posts error to chat with new build logs
  - Auto-triggers next attempt
  - User can see all attempts in chat history
  |
  v
If attempt 3 fails:
  - Sends error context to v0 chat for full regeneration (existing fallback)
  - Posts result to builder chat
  |
  v
If succeeds at any point:
  - Posts success message with production URL
  - Updates deployment record in DB
```

### Key Benefits
- **Persistent state**: Chat messages survive navigation, page refreshes, dropdown closes
- **Visibility**: User sees full history of all fix attempts, build logs, and fixes applied
- **Interruptible**: User can chat with the system mid-heal ("try a different approach", "skip that file")
- **Resumable**: If user leaves and comes back, chat history shows where things left off

---

## Implementation Steps

### Step 1: Create chat-based heal action
**File**: `convex/integrations/selfHealChat.ts` (NEW)

Wraps existing `selfHealDeploy.ts` logic but integrates with the builder chat message system:
- Accepts `chatSessionId` / `appId` to post messages
- Uses `addBuilderMessage()` (or equivalent) to post progress updates as assistant messages
- Manages attempt counter via DB (not React state)
- Stores heal state in a new field on the builder app or deployment record:
  ```ts
  healState: {
    attemptNumber: number,
    maxAttempts: 3,
    lastBuildLogs: string,
    fixHistory: Array<{ attempt: number, filesChanged: string[], error?: string }>,
    status: "idle" | "analyzing" | "fixing" | "building" | "succeeded" | "failed"
  }
  ```

### Step 2: Add "Fix in Chat" button to publish dropdown
**File**: `src/components/builder/publish-dropdown.tsx` (MODIFY)

Replace "Auto-Fix & Redeploy" button with "Fix in Chat" that:
- Sends deployment failure context to builder chat
- Switches focus to the chat panel
- Closes the dropdown

Keep the dropdown simple: show deploy status, build logs summary, and the redirect button.

### Step 3: Builder chat panel handles heal messages
**File**: `src/components/builder/builder-chat-panel.tsx` (MODIFY)

- Detect incoming heal messages (special message type or metadata)
- Show rich UI for heal progress (progress steps, build logs expandable, file diff viewer)
- Allow user to intervene ("try different approach", "skip", "redeploy as-is")

### Step 4: Heal state persistence
**File**: `convex/builderAppOntology.ts` (MODIFY)

Add `healState` field to the deployment record schema so state survives across sessions.

### Step 5: Resume heal on chat load
When builder chat loads and there's an active `healState` with `status !== "idle"`:
- Show current heal progress
- Resume polling if `status === "building"`
- Offer retry if `status === "failed"` and `attemptNumber < maxAttempts`

---

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `convex/integrations/selfHealDeploy.ts` | Core self-heal logic (LLM + GitHub push + Vercel poll) | Working (just fixed JSON parsing + token limit) |
| `convex/integrations/github.ts` | GitHub repo creation + file push | Working (just added globals.css + tsconfig.json scaffolds) |
| `convex/integrations/vercel.ts` | Vercel project creation + deploy polling | Working |
| `convex/integrations/v0.ts` | v0 chat integration (fallback on attempt 3) | Working |
| `src/components/builder/publish-dropdown.tsx` | Publish UI with deploy progress | Working but loses state on close |
| `src/components/builder/builder-chat-panel.tsx` | Builder chat panel | Needs heal message handling |
| `convex/builderAppOntology.ts` | Builder app schema + mutations | Needs healState field |
| `convex/publishingHelpers.ts` | URL generators, deploy helpers | No changes needed |
| `packages/sdk/` | `@l4yercak3/sdk@1.0.0` | Published to npm |

---

## Immediate Next Steps (Before Chat Migration)

1. **Test current deploy** with the new scaffold files (globals.css + tsconfig.json) - the v0 font import may still fail, but at least CSS and TS config won't be missing
2. **If font import still fails**: The self-heal LLM should now successfully parse and fix it (with the JSON parsing fix + higher token limit)
3. **After confirming self-heal works**: Begin the chat migration (Steps 1-5 above)

---

## Known Edge Cases

- **v0 layout.tsx font imports**: v0 frequently generates `import localFont from 'next/font/local'` with references to `@/fonts/GeistVF.woff` etc. These files don't exist in the deployed tree. The self-heal LLM prompt already instructs it to replace these with Google Fonts or remove them, but this should also be handled at scaffold generation time by always overriding the layout if it contains local font imports.
- **Concurrent deploys**: If user triggers multiple deploys, the heal state should be scoped to a specific deployment ID, not the app globally.
- **v0 regeneration on attempt 3**: The v0 fallback sends the error to the existing v0 chat. If v0 regenerates all files, they need to be re-pushed to GitHub and a new Vercel deploy triggered. This path exists in `selfHealDeploy.ts` but may need adjustment for the chat-based flow.
