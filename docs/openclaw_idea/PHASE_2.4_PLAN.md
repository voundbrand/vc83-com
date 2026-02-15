# Phase 2.4: Universal Agent Builder + KB Generation Pipeline

## Context

Phase 2.4 completes the builder setup mode (BB3-BB6) so agency owners can create fully-configured AI agents through a guided chat conversation. But the agent builder shouldn't live only inside `/builder` — we already have a fully-built `AgentConfigurationWindow` (~1050 lines) that's **orphaned**: not registered in the window system, not accessible from Control Panel, Start Menu, or anywhere. This plan wires up universal access AND completes the setup-to-creation pipeline.

**What already exists:**
- `agent-configuration-window.tsx` — Full multi-tab agent management UI (list, create/edit, activity, approvals) with all `agentOntology` mutations wired. Has a "New Agent (AI Setup)" button that opens `BuilderBrowserWindow` with `initialSetupMode=true`.
- `chat.ts:487-529` — Setup knowledge injection (78KB of StoryBrand frameworks) with file generation instructions.
- `agentOntology.ts` — Full `createAgent` mutation with personality, systemPrompt, faqEntries, knowledgeBaseTags, channelBindings, autonomyLevel.
- `organizationMedia.ts` — `createLayerCakeDocument` mutation saves markdown docs with tags.
- `agentExecution.ts:141-142` — Explicit TODO: "Wire up getKnowledgeBaseDocsInternal".
- `v0-file-analyzer.ts` — Detection pattern for connect step (DetectedItem → SectionConnection → executeConnections).

**What's missing:**
1. Agent window not registered/accessible anywhere
2. Setup mode responses aren't parsed for files
3. Connect step can't detect agent configs
4. KB docs aren't retrievable at runtime

---

## Implementation Steps

### Step 0: Register Agent Window + Universal Access (~30 lines across 3 files)

Make `AgentConfigurationWindow` accessible from Control Panel, window registry, and anywhere in the app.

**Files:**
- `src/hooks/window-registry.tsx`
  - Add `"agent-config"` entry importing `AgentConfigurationWindow`
  - Config: title "AI Agents", icon "🤖", size 1100x700

- `src/components/window-content/control-panel-window.tsx`
  - Add `openAgentConfig()` function (same pattern as other items, lines 29-91)
  - Add to `controlPanelItems` array for signed-in users with an org (same guard as Integrations, line 158)
  - Item: `{ id: "agents", icon: "🤖", label: "AI Agents", onClick: openAgentConfig, description: "Create and manage AI agents for your organization" }`

This immediately makes the agent builder launchable from:
- Control Panel (grid icon)
- `openWindow("agent-config", ...)` call from anywhere (Layers, admin, builder, start menu)

---

### Step 1: Wire KB Doc Runtime Retrieval (~40 lines across 2 files)

Unblocks agent execution — without this, created agents can't use their KB docs.

**Files:**
- `convex/organizationMedia.ts` — Add `getKnowledgeBaseDocsInternal` internalQuery
  - Args: `organizationId`, optional `tags` array
  - Fetches `layercake_document` records by org, filters by tag intersection
  - Caps total content at 60K chars, returns `Array<{ filename, content, description, tags }>`

- `convex/ai/agentExecution.ts:141-142` — Replace empty array with query call
  - `const knowledgeBaseDocs = await ctx.runQuery(internal.organizationMedia.getKnowledgeBaseDocsInternal, { organizationId, tags: config.knowledgeBaseTags })`

---

### Step 2: BB3 — Setup Response Parser + File Persistence (~110 lines: 80 new + 30 modified)

The setup prompt already instructs the AI to generate files, but: (A) the format instructions aren't explicit enough, and (B) the built-in provider response handler tries to parse the response as a JSON page schema, which fails.

**Files:**
- **NEW** `src/lib/builder/setup-response-parser.ts` (~80 lines)
  - `parseSetupResponse(aiResponse): ParsedSetupFile[]` — extracts fenced code blocks with filename annotations (`` ```json agent-config.json ``)
  - `validateAgentConfig(files): AgentConfigJson | null` — validates parsed config has required fields

- `convex/ai/chat.ts:509-519` — Enhance output format instructions (~20 lines changed)
  - Add explicit fenced-code-block format with filename after language tag
  - Add channel-gathering step to the interview flow
  - Specify `agent-config.json` schema matching `createAgent` args

- `src/contexts/builder-context.tsx:1222-1260` — Wire parser into built-in provider response (~30 lines)
  - **Before** `parseAndValidateAIResponse`: if `isSetupMode`, run `parseSetupResponse(aiContent)` instead
  - If setup files found: persist via `createBuilderAppMutation`/`updateBuilderAppMutation` (reuse v0 pattern from lines 891-917)
  - Show conversational response as normal assistant message (skip page schema validation)
  - Files appear reactively in file explorer via existing `builderFilesRaw` query (line 549)

---

### Step 3: BB4 — Agent Detection + Connect Step Creation (~195 lines: 90 new + 105 modified)

When the user switches to Connect mode, detect the agent config and offer to create the agent.

**Files:**
- **NEW** `src/lib/builder/agent-config-detector.ts` (~90 lines)
  - `AgentConfigJson` interface matching `createAgent` mutation args
  - `detectAgentConfig(files): { section: SectionConnection | null, config: AgentConfigJson | null, kbFiles: Array<{ path, content }> }`
    - Finds `agent-config.json` in builder files (JSON file, not TSX)
    - Parses and validates config
    - Collects `kb/*.md` files
    - Returns `SectionConnection` with `DetectedItem` of type `"agent"`

- `src/contexts/builder-context.tsx` — Multiple touch points:
  - **Line 48**: Add `"agent"` to `DetectedItem.type` union
  - **Line ~1425**: In `analyzePageForConnections`, add setup mode detection path:
    - Currently only runs for `aiProvider === "v0"`. Add: `if (isSetupMode && builderFiles.length > 0)` to also run `detectAgentConfig(builderFiles)` for built-in provider
  - **Line ~1647**: Add mutation references: `useMutation(api.agentOntology.createAgent)`, `useMutation(api.organizationMedia.createLayerCakeDocument)`
  - **Line ~1706**: In `executeConnections`, add `"agent"` branch:
    - Parse `agent-config.json` via `detectAgentConfig(builderFiles)`
    - Call `createAgent` with all config fields
    - Loop over `kbFiles`, call `createLayerCakeDocument` for each with tags: `[...config.knowledgeBaseTags, "agent-kb", "agent:<agentId>"]`
    - Set `createdId = agentId`

---

### Step 4: BB5 — Channel Binding Validation + UI (~65 lines)

Channel bindings are already stored by `createAgent`. The work is validation and UI feedback.

**Files:**
- `src/lib/builder/agent-config-detector.ts` — Add `validateChannelBindings()` (~25 lines)
  - Takes bindings + org's configured channels
  - Returns `{ ready: string[], needsConfig: string[] }`

- `src/components/builder/v0-connection-panel.tsx` — Add channel status display (~40 lines)
  - When rendering an agent `DetectedItem`, show channel badges
  - Green = provider configured, orange = needs setup with link to Integrations

---

## File Summary

| File | Action | Est. Lines |
|------|--------|------------|
| `src/hooks/window-registry.tsx` | Register agent-config window | +8 |
| `src/components/window-content/control-panel-window.tsx` | Add AI Agents to Control Panel | +20 |
| `convex/organizationMedia.ts` | Add `getKnowledgeBaseDocsInternal` | +35 |
| `convex/ai/agentExecution.ts` | Wire KB docs query (replace TODO) | +5, -2 |
| `src/lib/builder/setup-response-parser.ts` | **NEW** — Parse AI code blocks | ~80 |
| `src/lib/builder/agent-config-detector.ts` | **NEW** — Detect agent config + validate channels | ~115 |
| `src/contexts/builder-context.tsx` | Add "agent" type, wire detection, handle creation, setup mode response | +105 |
| `convex/ai/chat.ts` | Enhance setup prompt format + channel instructions | +25, -15 |
| `src/components/builder/v0-connection-panel.tsx` | Channel status badges for agent items | +40 |

**Total: ~435 lines across 9 files (2 new, 7 modified). No schema changes.**

---

## Build Order

```
Step 0: Register agent window (immediate universal access)
  ↓
Step 1: getKnowledgeBaseDocsInternal (unblocks runtime)
  ↓
Step 2: BB3 — parser + prompt enhancement + response handling
  ↓
Step 3: BB4 — detection + connect step agent creation
  ↓
Step 4: BB5 — channel validation + UI badges
```

Each step is independently testable and deployable.

---

## Key Integration Points

1. **`AgentConfigurationWindow` already calls `openWindow("builder-browser", ..., { initialSetupMode: true })`** (line 256) — this launches the builder in setup mode. Once the builder setup flow (BB3-BB5) works, the full pipeline is: Control Panel → Agent Config Window → "New Agent (AI Setup)" → Builder setup chat → files generated → connect → agent created.

2. **`builderFiles` query** (builder-context.tsx:549) reacts to `builderAppId`. Once setup files are persisted via `createBuilderAppMutation`, they appear automatically in the file explorer.

3. **`analyzePageForConnections`** (line 1419) only runs for `aiProvider === "v0"` today. We need to also trigger it for `isSetupMode` with the built-in provider.

4. **`executeConnections`** (line 1661) has a `typeToBucket` map and `idsByType` tracking. Agent creation doesn't fit the standard link pattern (agents aren't linked to builder apps the same way). The agent branch should handle creation independently and skip the `linkObjectsMutation` step.

5. **Tags are the KB doc retrieval mechanism.** Agent has `knowledgeBaseTags` → KB docs saved with matching tags → `getKnowledgeBaseDocsInternal` filters by tag → `buildAgentSystemPrompt` injects docs into context.

---

## Verification

| Step | Test |
|------|------|
| Step 0 | Open Control Panel → "AI Agents" icon visible → click opens AgentConfigurationWindow → "New Agent (AI Setup)" button opens builder in setup mode |
| Step 1 | Create agent + KB docs manually → send message to agent → verify KB content in system prompt (check logs) |
| Step 2 | Enter setup mode → chat about a business → verify files appear in file explorer with valid `agent-config.json` + `kb/*.md` |
| Step 3 | Switch to Connect → "Agent" section detected → click Create → agent in DB with status "draft" + KB docs saved with correct tags |
| Step 4 | Channel badges show green/orange based on org's configured providers |
| E2E | Setup → interview → files → connect → agent created → activate → send webchat message → agent responds using KB docs |

---

## Deferred: BB6 (Test Chat)

Test chat in the builder preview panel is deferred. The existing agent testing flow (activate agent → send message via API/webchat) covers validation. BB6 can be a fast follow.
