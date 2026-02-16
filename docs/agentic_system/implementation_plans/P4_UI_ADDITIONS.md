# P4: Agentic System — UI Additions

> Priority: UI | Estimated complexity: Medium-High | Files touched: ~15-20

---

## Problem Statement

The agentic system backend (P0–P3) has grown significantly, but the web UI hasn't kept pace. Most new functionality is only accessible via Telegram bot commands or has no user-facing surface at all. Owners managing agents from the web dashboard are missing visibility into soul history, credit tiers, session policies, error health, escalations, channel config, and team coordination.

This plan adds UI surfaces for every meaningful backend feature — primarily by extending existing components rather than creating new windows.

---

## Existing UI Inventory

| Component | File | Current Scope |
|-----------|------|---------------|
| Agent List Panel | `agents/agent-list-panel.tsx` | Agent CRUD, status, quick actions |
| Agent Detail — Soul Tab | `agents/agent-soul-editor.tsx` | Edit personality, approve/reject pending proposals |
| Agent Detail — Tools Tab | `agents/agent-tools-config.tsx` | Tool toggles, autonomy level, rate limits |
| Agent Detail — Sessions Tab | `agents/agent-sessions-viewer.tsx` | Session list, conversation viewer, hand-off button |
| Agent Detail — Approvals Tab | `agents/agent-approval-queue.tsx` | Pending tool action approvals |
| Agent Detail — Analytics Tab | `agents/agent-analytics.tsx` | Stats cards, config summary, channel badges |
| AI Settings Tab | `org-owner-manage-window/ai-settings-tab.tsx` | Model selection, privacy tiers, BYOK |
| Brain Window | `brain-window/` | Knowledge upload, review, AI interview |

---

## Deliverables

### Tier A — Extend existing tabs (backend already shipped)

| # | Deliverable | Target Component | Backend Dependency |
|---|-------------|-----------------|-------------------|
| A1 | Soul Version History + Rollback UI | Soul Tab | `soulEvolution.ts` — done |
| A2 | Credit Tier Breakdown | Analytics Tab / Agent Header | `credits/index.ts` — done |
| A3 | Pending Proposals Badge | Agent List Panel | `soulEvolution.ts` — done |
| A4 | Session Handoff Indicators | Sessions Tab | `agentSessions.ts` — done |
| A5 | Auto-Reflection Results | Soul Tab | `soulEvolution.ts` — done |

### Tier B — New sections within existing tabs

| # | Deliverable | Target Component | Backend Dependency |
|---|-------------|-----------------|-------------------|
| B1 | Session Policy Config (TTL, auto-summary) | Tools Tab | `sessionPolicy.ts` — done |
| B2 | Escalation Trigger Config | Tools Tab | `soulEvolution.ts` — partial |
| B3 | Knowledge Binding per Agent | Soul Tab or Tools Tab | Brain queries — exists |
| B4 | Credit Sharing Config (parent orgs) | Org Settings | `credits/sharing.ts` — done |

### Tier C — New tabs on Agent Detail

| # | Deliverable | Target Component | Backend Dependency |
|---|-------------|-----------------|-------------------|
| C1 | Health Tab (errors, DLQ, degraded tools) | New 6th tab | `errorMessages.ts`, `deadLetterQueue.ts`, `retryPolicy.ts` — done |
| C2 | Channels Tab (enable/disable, provider config) | New 7th tab | `channels/router.ts` — exists |

### Tier D — New surfaces outside Agent Detail

| # | Deliverable | Target Component | Backend Dependency |
|---|-------------|-----------------|-------------------|
| D1 | Escalation Queue (web-based take over) | Agents Window header or new panel | `P2_HUMAN_IN_THE_LOOP` — planned |
| D2 | Human Takeover from Web | Sessions Tab | `P2_TEAM_HARNESS` — planned |
| D3 | Team Session / Multi-Agent View | Sessions Tab | `P2_TEAM_HARNESS` — planned |

---

## Implementation Details

### A1: Soul Version History + Rollback

**Location:** Below the "Pending Proposals" section in `agent-soul-editor.tsx`

**UI Elements:**
- Collapsible "Version History" section with History icon
- List of versions (newest first), each showing:
  - Version number + badge (e.g., `v3`)
  - Change type badge: `proposal` | `rollback` | `manual` | `reflection`
  - Changed by: owner name, agent self-reflection, or "rollback"
  - Timestamp (relative)
  - Expand arrow → shows diff (changed fields, old vs new values)
- "Rollback to this version" button on each entry (except current)
- Confirmation dialog: "Rollback {agentName}'s soul to v{N}? This creates a new version."
- Max 10 shown, "Load more" pagination

**Convex queries needed:**
- `getSoulVersionHistoryAuth` — already exists, needs pagination args
- `rollbackSoulAuth` — already exists

**Diff display:**
```
v4 → v2 (rollback)   •   2 hours ago   •   by Owner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  personality:  "Friendly and warm"  →  "Professional and concise"
  tagline:      "Your helpful assistant"  →  "Your business partner"
```

---

### A2: Credit Tier Breakdown

**Location:** Replace single credit number in `agents-window.tsx` header + expand in `agent-analytics.tsx`

**Agent Header (compact):**
```
Credits: 45 daily | 200 monthly | 1,250 purchased
```

**Analytics Tab (detailed):**
- 3 horizontal progress bars stacked:
  - Daily: `32/50 used` (green → yellow → red gradient)
  - Monthly: `180/500 used`
  - Purchased: `750/2,000 used`
- Consumption order indicator: "Daily credits used first → Monthly → Purchased"
- Per-agent cost breakdown (if data available): pie chart or simple table
- Alert threshold indicator (80% warning line on each bar)

**Convex queries needed:**
- `getCreditBalanceByTier` — may need new query, current `getCreditBalance` returns single number

---

### A3: Pending Proposals Badge

**Location:** `agent-list-panel.tsx` — on each agent item

**UI Elements:**
- Small notification dot/count badge on agents that have pending proposals
- Orange dot with count (e.g., `2`) next to agent name
- Clicking navigates to Soul Tab → Pending Proposals section

---

### A4: Session Handoff Indicators

**Location:** `agent-sessions-viewer.tsx` — session list items + conversation view

**Session List Item additions:**
- Handoff icon (ArrowRightLeft) if session has `handoffHistory`
- Badge showing number of agents involved (e.g., "3 agents")
- Active agent name (if different from original)

**Conversation View additions:**
- Inline handoff markers between messages:
  ```
  ─── Maya handed off to Alex (reason: billing question) ───
  ```
- Agent avatar/name changes when active agent switches
- Human takeover indicator: `── Owner took over ──`

---

### A5: Auto-Reflection Results

**Location:** `agent-soul-editor.tsx` — new section between Soul Metadata and Pending Proposals

**UI Elements:**
- "Recent Reflections" collapsible section (Sparkles icon)
- Each reflection entry:
  - Date + trigger type (weekly cron / manual)
  - Summary of what the agent observed
  - Proposals generated (links to Pending Proposals)
  - "No changes needed" if reflection produced nothing
- Max 3 shown, "View all" link

---

### B1: Session Policy Config

**Location:** `agent-tools-config.tsx` — new section below "Rate Limits"

**UI Elements:**
- "Session Settings" section header (Clock icon)
- Idle TTL input: number + unit dropdown (minutes/hours/days), default 24h
- Max session duration input: number + unit dropdown, default 7d
- Auto-summary toggle: checkbox + description "Generate AI summary when session closes"
- Summary model selector: dropdown (only shown when auto-summary on), defaults to haiku

---

### B2: Escalation Trigger Config

**Location:** `agent-tools-config.tsx` — new section below "Session Settings"

**UI Elements:**
- "Escalation Triggers" section header (AlertTriangle icon)
- Toggle list:
  - [ ] Customer requests human help
  - [ ] Negative sentiment detected
  - [ ] Agent stuck in loop (3+ repeated failures)
  - [ ] Blocked topic mentioned
  - [ ] Tool failures exceed threshold
- Custom trigger textarea: "Additional escalation keywords (one per line)"
- Escalation destination: dropdown (Owner Telegram / Team Group / Email)

---

### B3: Knowledge Binding per Agent

**Location:** `agent-soul-editor.tsx` — new section, or `agent-tools-config.tsx`

**UI Elements:**
- "Knowledge Sources" section (BookOpen icon)
- Multi-select list of knowledge base items from Brain
- Search/filter by category (Content DNA, Documents, Web Links, Notes)
- Selected items shown as tags with remove button
- "Open Brain" link to Brain Window for adding new sources
- Count display: "4 sources assigned"

---

### B4: Credit Sharing Config

**Location:** `org-owner-manage-window/` — new section in org settings (only visible for parent orgs)

**UI Elements:**
- "Credit Sharing" section header (Share2 icon)
- Enable/disable toggle
- Total shared pool cap: number input (default 500/day)
- Per-child org table:
  - Child org name
  - Daily cap input (default 100)
  - Today's usage (progress bar)
  - Override toggle
- Summary: "3 child orgs sharing from pool • 245/500 used today"

---

### C1: Health Tab

**Location:** New 6th tab on `agent-detail-panel.tsx`

**Tab:** Health (HeartPulse icon)

**UI Sections:**

**Status Banner:**
- Green: "All systems healthy"
- Yellow: "Degraded — 2 tools temporarily disabled"
- Red: "Errors detected — 5 undelivered messages"

**Error Log (scrollable, last 50):**
- Each entry: timestamp, error type badge (TRANSIENT/DEGRADED/FATAL/LOOP), message, action taken
- Filter by type dropdown

**Dead Letter Queue:**
- Count of undelivered messages
- Each entry: recipient, channel, error reason, retry count, timestamp
- Actions: "Retry" button, "Abandon" button
- Empty state: "No undelivered messages"

**Degraded Tools:**
- List of tools temporarily disabled due to repeated failures
- Each shows: tool name, failure count, last error, time disabled
- "Re-enable" button per tool

**Retry Stats (compact):**
- LLM retries today: count
- Channel retries today: count
- Success rate: percentage

---

### C2: Channels Tab

**Location:** New 7th tab on `agent-detail-panel.tsx`

**Tab:** Channels (Radio icon)

**UI Sections:**

**Channel Grid (2-column):**
Each channel card:
- Icon + name (Telegram, WhatsApp, SMS, Email, Webchat, Instagram, Facebook, API)
- Enable/disable toggle
- Status dot (connected/disconnected/not configured)
- "Configure" button → expands settings

**Channel Settings (expanded):**
- Provider dropdown (if multiple providers for channel)
- API key / webhook URL field (masked)
- Test button → sends test message, shows result
- Per-channel session TTL override (optional)

**Active Channels Summary:**
- "3 of 8 channels active"
- List of active channels with message counts

---

### D1: Escalation Queue

**Location:** `agents-window.tsx` — header badge + expandable panel, or standalone section

**UI Elements:**
- Badge in Agents Window header: "3 escalations" (red dot)
- Clicking opens escalation panel (slide-in or inline)
- Each escalation card:
  - Urgency badge (LOW/MEDIUM/HIGH/CRITICAL)
  - Agent name + customer identifier
  - Channel icon
  - Reason (auto-generated or trigger type)
  - Timestamp
  - Actions: [Take Over] [Assign] [Dismiss]
- "Take Over" opens session in Sessions Tab with owner typing mode
- "Assign" shows team member dropdown
- "Dismiss" with reason input

---

### D2: Human Takeover from Web

**Location:** `agent-sessions-viewer.tsx` — conversation view

**UI Elements:**
- "Take Over" button in session header (existing, but needs implementation)
- When active: shows text input at bottom of conversation
- Owner messages styled differently (gold background, "Owner" label)
- "Return to Agent" button to resume AI
- Notification in agent's context: "Owner handled this, here's what was resolved: ..."

---

### D3: Team Session View

**Location:** `agent-sessions-viewer.tsx` — enhanced view for multi-agent sessions

**UI Elements:**
- Team session indicator in session list: multi-avatar stack icon
- Conversation view shows agent transitions with context
- Sidebar panel: "Agents in session" with list + active indicator
- Handoff timeline: visual flow of agent switches with reasons
- Shared context display: what context was passed between agents

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/window-content/agents/agent-soul-history.tsx` | A1 — Version history + rollback UI |
| `src/components/window-content/agents/agent-health-tab.tsx` | C1 — Error log, DLQ, degraded tools |
| `src/components/window-content/agents/agent-channels-tab.tsx` | C2 — Channel management per agent |
| `src/components/window-content/agents/escalation-panel.tsx` | D1 — Escalation queue panel |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/window-content/agents/agent-soul-editor.tsx` | A1 (import history component), A5 (reflection results section), B3 (knowledge binding) |
| `src/components/window-content/agents/agent-analytics.tsx` | A2 (credit tier breakdown, progress bars) |
| `src/components/window-content/agents/agent-list-panel.tsx` | A3 (pending proposal badge) |
| `src/components/window-content/agents/agent-sessions-viewer.tsx` | A4 (handoff indicators), D2 (human takeover input), D3 (team session view) |
| `src/components/window-content/agents/agent-tools-config.tsx` | B1 (session policy config), B2 (escalation trigger config) |
| `src/components/window-content/agents/agent-detail-panel.tsx` | Add Health + Channels tabs, update tab type |
| `src/components/window-content/agents/types.ts` | Extend `AgentTab` type with `"health"` and `"channels"` |
| `src/components/window-content/agents-window.tsx` | A2 (credit tier in header), D1 (escalation badge + panel) |
| `src/components/window-content/org-owner-manage-window/index.tsx` | B4 (credit sharing section for parent orgs) |

---

## Implementation Order

### Phase 1 — Quick wins, backend ready (Tier A)

Ship order: A3 → A1 → A2 → A4 → A5

| Step | Deliverable | Effort | Why this order |
|------|-------------|--------|----------------|
| 1 | A3: Proposal badge on agent list | Small | Tiny change, immediate visibility |
| 2 | A1: Soul version history + rollback | Medium | Highest user value, backend 100% ready |
| 3 | A2: Credit tier breakdown | Medium | Important for billing clarity |
| 4 | A4: Session handoff indicators | Small | Visual enhancement, data exists |
| 5 | A5: Auto-reflection results | Small | Informational, uses existing data |

### Phase 2 — Config surfaces (Tier B)

Ship order: B1 → B2 → B4 → B3

| Step | Deliverable | Effort | Why this order |
|------|-------------|--------|----------------|
| 6 | B1: Session policy config | Small | Simple form, backend ready |
| 7 | B2: Escalation trigger config | Small | Simple form, backend partial |
| 8 | B4: Credit sharing config | Medium | Needed for multi-tenant orgs |
| 9 | B3: Knowledge binding per agent | Medium | Requires Brain ↔ Agent data link |

### Phase 3 — New tabs (Tier C)

Ship order: C1 → C2

| Step | Deliverable | Effort | Why this order |
|------|-------------|--------|----------------|
| 10 | C1: Health tab | Medium | Critical for debugging agent issues |
| 11 | C2: Channels tab | Medium | Needed for multi-channel setup |

### Phase 4 — Team & escalation (Tier D, depends on P2 backend)

Ship order: D1 → D2 → D3

| Step | Deliverable | Effort | Why this order |
|------|-------------|--------|----------------|
| 12 | D1: Escalation queue | Medium | Core team workflow |
| 13 | D2: Human takeover from web | Medium | Depends on D1 patterns |
| 14 | D3: Team session view | High | Most complex, depends on P2 team harness |

---

## Convex Queries/Mutations Needed

| Function | Type | Purpose | Status |
|----------|------|---------|--------|
| `getSoulVersionHistoryAuth` | query | Paginated version history | Exists, needs pagination |
| `rollbackSoulAuth` | mutation | Trigger rollback from web | Exists |
| `getCreditBalanceByTier` | query | Daily/monthly/purchased breakdown | Needs creation |
| `getAgentReflectionHistory` | query | Recent reflection summaries | Needs creation |
| `getPendingProposalCount` | query | Badge count for agent list | Needs creation (or derive from existing) |
| `getDeadLetterQueue` | query | Failed messages for health tab | Needs creation |
| `getDegradedTools` | query | Temporarily disabled tools | Needs creation |
| `getErrorLog` | query | Recent errors for agent | Needs creation |
| `updateSessionPolicy` | mutation | Save TTL/summary settings | Needs creation |
| `updateEscalationTriggers` | mutation | Save escalation config | Needs creation |
| `updateAgentChannels` | mutation | Enable/disable channels | May exist, needs verification |
| `getEscalationQueue` | query | Pending escalations for org | Needs creation |
| `takeOverSession` | mutation | Owner takes control | Needs creation |
| `resumeAgentSession` | mutation | Return control to agent | Needs creation |
| `getCreditSharingConfig` | query | Parent org sharing rules | Needs creation |
| `updateCreditSharingConfig` | mutation | Save sharing rules | Needs creation |
| `getAgentKnowledgeSources` | query | Linked knowledge items | Needs creation |
| `updateAgentKnowledgeSources` | mutation | Link/unlink knowledge items | Needs creation |

---

## Design Constraints

1. **Win95 theme** — All new components must use `var(--win95-*)` CSS variables and match existing retro aesthetic
2. **No new windows** — Everything fits into existing Agent Detail tabs or Agent Window panels
3. **4 new files max** — Soul history, health tab, channels tab, escalation panel
4. **Mobile consideration** — Agent detail tabs should collapse to dropdown on narrow widths (existing pattern)
5. **Loading states** — Every section needs skeleton/spinner state matching existing patterns
6. **Empty states** — Every list needs an icon + message empty state (existing pattern)

---

## Success Criteria

- [ ] Owner can view soul version history and rollback from web UI (not just Telegram)
- [ ] Credit display shows all 3 tiers with visual progress bars
- [ ] Agent list shows proposal count badges
- [ ] Session viewer shows handoff transitions inline
- [ ] Session TTL and auto-summary configurable from Tools Tab
- [ ] Escalation triggers configurable per agent
- [ ] Health tab shows errors, DLQ, and degraded tools
- [ ] Channel management available per agent
- [ ] Escalation queue accessible from Agents Window
- [ ] Human takeover works from web (not just Telegram)
- [ ] Knowledge sources assignable per agent
- [ ] Credit sharing configurable for parent orgs

---

## Dependencies

| Deliverable | Depends On |
|-------------|-----------|
| A1–A5, B1–B2 | No blockers — backend done |
| B3 | Brain queries need agent binding field |
| B4 | `credits/sharing.ts` — done |
| C1 | `errorMessages.ts`, `deadLetterQueue.ts` — done |
| C2 | `channels/router.ts` — exists, may need auth-wrapped queries |
| D1–D3 | P2 Team Harness + Human-in-the-Loop backend — planned |
