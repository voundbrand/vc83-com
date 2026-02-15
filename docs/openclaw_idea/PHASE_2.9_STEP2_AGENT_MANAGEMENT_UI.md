# Phase 2.9 Step 2: Agent Management UI — `/agents` Dashboard

## Goal

Give org owners a web-based dashboard at `/agents` to create, configure, monitor, and manage their AI agents. Everything currently done via Telegram commands and direct database manipulation gets a proper UI. Follows the existing window-component pattern used by `/store`, `/forms`, and other pages.

## Depends On

- Phase 2.9 Step 1 (Production Bridge) — agents work without terminal process
- Phase 2.8 Step 2 (Layer Architecture) — layer awareness for multi-agent orgs
- Phase 2.5 Step 7 (Soul Evolution) — proposal/approval workflow
- Agent CRUD in `convex/agentOntology.ts` — all queries/mutations exist

## What Already Exists

| Component | Status | Location |
|---|---|---|
| `getAgents` query (list by org, filter by subtype/status) | Done | `convex/agentOntology.ts:37-63` |
| `getAgent` query (single agent by ID) | Done | `convex/agentOntology.ts:69-84` |
| `createAgent` mutation | Done | `convex/agentOntology.ts` |
| `updateAgent` mutation | Done | `convex/agentOntology.ts` |
| `deleteAgent` mutation | Done | `convex/agentOntology.ts` |
| `activateAgent` / `pauseAgent` mutations | Done | `convex/agentOntology.ts` |
| `getSessionsForAgent` query | Done | `convex/ai/agentSessions.ts` |
| `getSessionMessages` query | Done | `convex/ai/agentSessions.ts` |
| `getSessionStats` query | Done | `convex/ai/agentSessions.ts` |
| Soul evolution proposals (list, approve, reject) | Done | `convex/ai/soulEvolution.ts` |
| Approval queue (pending tool executions) | Done | `convex/ai/agentApprovals.ts` |
| Agent config schema (soul, tools, autonomy, model) | Done | `convex/agentOntology.ts` |
| Window-component UI pattern | Done | `src/components/window-content/*.tsx` |
| Window registry | Done | `src/hooks/window-registry.tsx` |
| `/store` page (reference implementation) | Done | `src/app/store/page.tsx` |
| `/forms` page (reference implementation) | Done | `src/app/forms/page.tsx` |
| Builder context (includes `agent` record type) | Done | `src/contexts/builder-context.tsx` |
| Agent config detector (parses AI-generated configs) | Done | `src/lib/builder/agent-config-detector.ts` |

## What's Missing

No agent management UI exists. All agent operations are done via:
- Telegram commands to the System Bot
- CLI scripts (`scripts/agent-cli.ts`, `scripts/telegram-bridge.ts`)
- Direct Convex dashboard mutations

## Architecture

### Page Pattern

Following the established pattern:

```
src/app/agents/page.tsx              ← Thin wrapper
src/components/window-content/
  agents-window.tsx                  ← Main window component
  agents/
    agent-list.tsx                   ← Agent grid/list view
    agent-detail.tsx                 ← Single agent config panel
    agent-soul-editor.tsx            ← Soul editing UI
    agent-sessions.tsx               ← Session list + conversation viewer
    agent-tools-config.tsx           ← Tool enable/disable toggles
    agent-approval-queue.tsx         ← Pending approval items
    agent-analytics.tsx              ← Usage stats + charts
```

### Data Flow

```
┌─────────────────────────────────────────┐
│            AgentsWindow                  │
│                                          │
│  ┌──────────┐    ┌────────────────────┐ │
│  │ AgentList │    │ AgentDetail        │ │
│  │           │    │                    │ │
│  │ [Quinn ●] │───►│ ┌──────────────┐  │ │
│  │ [Jake  ○] │    │ │ Soul Editor  │  │ │
│  │ [+ New  ] │    │ ├──────────────┤  │ │
│  │           │    │ │ Tools Config │  │ │
│  │           │    │ ├──────────────┤  │ │
│  │           │    │ │ Sessions     │  │ │
│  │           │    │ ├──────────────┤  │ │
│  │           │    │ │ Approvals    │  │ │
│  │           │    │ ├──────────────┤  │ │
│  │           │    │ │ Analytics    │  │ │
│  │           │    │ └──────────────┘  │ │
│  └──────────┘    └────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation

### 1. Page Route

**New file:** `src/app/agents/page.tsx`

```tsx
"use client";

/**
 * AGENTS PAGE - Full-screen agent management dashboard
 *
 * Renders the AgentsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { AgentsWindow } from "@/components/window-content/agents-window";

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <AgentsWindow fullScreen />
    </div>
  );
}
```

### 2. Window Registration

**File:** `src/hooks/window-registry.tsx`

Add `agents` to the window registry alongside existing entries:

```typescript
{
  id: "agents",
  title: "Agents",
  icon: BotIcon, // or Brain icon from lucide-react
  component: AgentsWindow,
  defaultSize: { width: 900, height: 600 },
  minSize: { width: 600, height: 400 },
}
```

### 3. Main Window Component

**New file:** `src/components/window-content/agents-window.tsx`

```tsx
interface AgentsWindowProps {
  fullScreen?: boolean;
}

export function AgentsWindow({ fullScreen }: AgentsWindowProps) {
  const { sessionId, activeOrganization } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "detail" | "create">("list");

  // Query agents for current org
  const agents = useQuery(api.agentOntology.getAgents, {
    sessionId,
    organizationId: activeOrganization._id,
  });

  return (
    <div className={cn("flex h-full", fullScreen && "min-h-screen")}>
      {/* Left panel: Agent list */}
      <AgentList
        agents={agents}
        selectedId={selectedAgentId}
        onSelect={(id) => { setSelectedAgentId(id); setView("detail"); }}
        onCreate={() => setView("create")}
      />

      {/* Right panel: Detail/Create */}
      <div className="flex-1 overflow-y-auto">
        {view === "create" && (
          <AgentCreateForm
            organizationId={activeOrganization._id}
            onCreated={(id) => { setSelectedAgentId(id); setView("detail"); }}
          />
        )}
        {view === "detail" && selectedAgentId && (
          <AgentDetail
            agentId={selectedAgentId}
            organizationId={activeOrganization._id}
          />
        )}
        {view === "list" && !selectedAgentId && (
          <EmptyState message="Select an agent or create a new one" />
        )}
      </div>
    </div>
  );
}
```

### 4. Agent List Component

**New file:** `src/components/window-content/agents/agent-list.tsx`

Displays all agents for the org with status indicators:

```tsx
function AgentList({ agents, selectedId, onSelect, onCreate }) {
  return (
    <div className="w-64 border-r border-zinc-700 flex flex-col">
      <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Agents</h3>
        <button onClick={onCreate} className="text-xs text-emerald-400 hover:text-emerald-300">
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {agents?.map((agent) => (
          <button
            key={agent._id}
            onClick={() => onSelect(agent._id)}
            className={cn(
              "w-full p-3 text-left hover:bg-zinc-800 border-b border-zinc-800",
              selectedId === agent._id && "bg-zinc-800"
            )}
          >
            <div className="flex items-center gap-2">
              <StatusDot status={agent.status} />
              <span className="text-sm text-zinc-200 truncate">
                {agent.customProperties?.displayName || agent.name}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {agent.subtype} · {agent.customProperties?.totalMessages || 0} msgs
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 5. Agent Detail Component (Tabbed)

**New file:** `src/components/window-content/agents/agent-detail.tsx`

Tabbed interface for all agent configuration:

```tsx
type Tab = "soul" | "tools" | "sessions" | "approvals" | "analytics";

function AgentDetail({ agentId, organizationId }) {
  const [activeTab, setActiveTab] = useState<Tab>("soul");
  const agent = useQuery(api.agentOntology.getAgent, { sessionId, agentId });

  const tabs: { id: Tab; label: string }[] = [
    { id: "soul", label: "Soul & Identity" },
    { id: "tools", label: "Tools" },
    { id: "sessions", label: "Sessions" },
    { id: "approvals", label: "Approvals" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Agent header with name, status, actions */}
      <AgentHeader agent={agent} />

      {/* Tab bar */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "soul" && <AgentSoulEditor agent={agent} />}
        {activeTab === "tools" && <AgentToolsConfig agent={agent} />}
        {activeTab === "sessions" && <AgentSessions agentId={agentId} orgId={organizationId} />}
        {activeTab === "approvals" && <AgentApprovalQueue agentId={agentId} />}
        {activeTab === "analytics" && <AgentAnalytics agentId={agentId} />}
      </div>
    </div>
  );
}
```

### 6. Soul Editor

**New file:** `src/components/window-content/agents/agent-soul-editor.tsx`

Visual editor for the agent's soul/personality:

```tsx
function AgentSoulEditor({ agent }) {
  const soul = agent?.customProperties?.soul;
  const updateAgent = useMutation(api.agentOntology.updateAgent);

  // Editable fields
  const [name, setName] = useState(soul?.name || "");
  const [tagline, setTagline] = useState(soul?.tagline || "");
  const [traits, setTraits] = useState<string[]>(soul?.traits || []);
  const [communicationStyle, setCommunicationStyle] = useState(soul?.communicationStyle || "");
  const [toneGuidelines, setToneGuidelines] = useState(soul?.toneGuidelines || "");
  const [neverDo, setNeverDo] = useState<string[]>(soul?.neverDo || []);
  const [alwaysDo, setAlwaysDo] = useState<string[]>(soul?.alwaysDo || []);
  const [emojiUsage, setEmojiUsage] = useState(soul?.emojiUsage || "minimal");

  // Soul evolution proposals
  const proposals = useQuery(api.ai.soulEvolution.getPendingSoulProposals, {
    agentId: agent._id,
  });

  return (
    <div className="space-y-6">
      {/* Identity section */}
      <Section title="Identity">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Tagline" value={tagline} onChange={setTagline} />
      </Section>

      {/* Personality traits (tag input) */}
      <Section title="Traits">
        <TagInput tags={traits} onChange={setTraits} placeholder="Add trait..." />
      </Section>

      {/* Communication style (textarea) */}
      <Section title="Communication Style">
        <Textarea value={communicationStyle} onChange={setCommunicationStyle} rows={3} />
      </Section>

      {/* Rules */}
      <Section title="Rules">
        <ListEditor label="Always Do" items={alwaysDo} onChange={setAlwaysDo} />
        <ListEditor label="Never Do" items={neverDo} onChange={setNeverDo} />
      </Section>

      {/* Emoji usage */}
      <Section title="Emoji Usage">
        <Select value={emojiUsage} onChange={setEmojiUsage}
          options={["none", "minimal", "moderate", "expressive"]} />
      </Section>

      {/* Soul evolution proposals */}
      {proposals?.length > 0 && (
        <Section title={`Pending Proposals (${proposals.length})`}>
          {proposals.map((p) => (
            <SoulProposalCard key={p._id} proposal={p}
              onApprove={() => approveSoulProposal(p._id)}
              onReject={() => rejectSoulProposal(p._id)}
            />
          ))}
        </Section>
      )}

      {/* Soul version history */}
      <Section title="Soul History">
        <SoulVersionHistory agentId={agent._id} />
      </Section>

      <SaveButton onClick={handleSave} />
    </div>
  );
}
```

### 7. Tool Configuration

**New file:** `src/components/window-content/agents/agent-tools-config.tsx`

Toggle which tools the agent can use:

```tsx
function AgentToolsConfig({ agent }) {
  const config = agent?.customProperties;
  const enabledTools = config?.enabledTools || [];
  const disabledTools = config?.disabledTools || [];

  // Get all available tools from registry
  const allTools = useQuery(api.ai.tools.registry.getToolList, {
    organizationId: agent.organizationId,
  });

  // Group tools by category
  const categories = groupToolsByCategory(allTools);

  return (
    <div className="space-y-6">
      {/* Autonomy level selector */}
      <Section title="Autonomy Level">
        <RadioGroup
          value={config?.autonomyLevel || "supervised"}
          options={[
            { value: "draft_only", label: "Draft Only", desc: "Generates but never sends" },
            { value: "supervised", label: "Supervised", desc: "Actions require approval" },
            { value: "autonomous", label: "Autonomous", desc: "Acts freely within guardrails" },
          ]}
          onChange={handleAutonomyChange}
        />
      </Section>

      {/* Tool toggles by category */}
      {Object.entries(categories).map(([category, tools]) => (
        <Section key={category} title={category}>
          {tools.map((tool) => (
            <ToolToggle
              key={tool.name}
              tool={tool}
              enabled={!disabledTools.includes(tool.name)}
              requiresApproval={config?.requireApprovalFor?.includes(tool.name)}
              onToggle={handleToolToggle}
              onApprovalToggle={handleApprovalToggle}
            />
          ))}
        </Section>
      ))}

      {/* Model selection */}
      <Section title="Model">
        <ModelSelector
          modelId={config?.modelId || "anthropic/claude-sonnet-4-5"}
          temperature={config?.temperature || 0.7}
          maxTokens={config?.maxTokens || 4096}
          onChange={handleModelChange}
        />
      </Section>

      {/* Rate limits */}
      <Section title="Rate Limits">
        <Field label="Max messages/day" type="number"
          value={config?.maxMessagesPerDay || ""} onChange={handleRateLimitChange} />
        <Field label="Max cost/day (USD)" type="number"
          value={config?.maxCostPerDay || ""} onChange={handleCostLimitChange} />
      </Section>
    </div>
  );
}
```

### 8. Session Viewer

**New file:** `src/components/window-content/agents/agent-sessions.tsx`

View active/closed sessions and conversation history:

```tsx
function AgentSessions({ agentId, orgId }) {
  const [selectedSession, setSelectedSession] = useState(null);

  const sessions = useQuery(api.ai.agentSessions.getSessionsForAgent, {
    agentId,
    organizationId: orgId,
  });

  const messages = useQuery(
    selectedSession ? api.ai.agentSessions.getSessionMessages : null,
    selectedSession ? { sessionId: selectedSession._id } : null
  );

  return (
    <div className="flex h-full">
      {/* Session list */}
      <div className="w-72 border-r border-zinc-700 overflow-y-auto">
        {sessions?.map((session) => (
          <SessionCard
            key={session._id}
            session={session}
            selected={selectedSession?._id === session._id}
            onClick={() => setSelectedSession(session)}
          />
        ))}
      </div>

      {/* Conversation viewer */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages?.map((msg) => (
          <MessageBubble
            key={msg._id}
            role={msg.role}
            content={msg.content}
            agentName={msg.agentName}
            toolCalls={msg.toolCalls}
            timestamp={msg.timestamp}
          />
        ))}
      </div>
    </div>
  );
}
```

### 9. Approval Queue

**New file:** `src/components/window-content/agents/agent-approval-queue.tsx`

For supervised agents — review and approve/reject pending tool executions:

```tsx
function AgentApprovalQueue({ agentId }) {
  const pendingApprovals = useQuery(api.ai.agentApprovals.getPendingApprovals, {
    agentId,
  });

  return (
    <div className="space-y-4">
      {pendingApprovals?.length === 0 && (
        <EmptyState message="No pending approvals" />
      )}

      {pendingApprovals?.map((approval) => (
        <ApprovalCard
          key={approval._id}
          approval={approval}
          onApprove={() => handleApprove(approval._id)}
          onReject={() => handleReject(approval._id)}
        />
      ))}
    </div>
  );
}
```

### 10. Analytics

**New file:** `src/components/window-content/agents/agent-analytics.tsx`

Usage stats for the agent:

```tsx
function AgentAnalytics({ agentId }) {
  const stats = useQuery(api.ai.agentSessions.getAgentStats, { agentId });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Messages" value={stats?.totalMessages || 0} />
        <StatCard label="Active Sessions" value={stats?.activeSessions || 0} />
        <StatCard label="Tokens Used" value={formatNumber(stats?.tokensUsed || 0)} />
        <StatCard label="Total Cost" value={`$${(stats?.costUsd || 0).toFixed(2)}`} />
      </div>

      {/* Recent activity (audit log) */}
      <Section title="Recent Activity">
        <ActivityLog agentId={agentId} limit={20} />
      </Section>

      {/* Top tools used */}
      <Section title="Tool Usage">
        <ToolUsageChart agentId={agentId} />
      </Section>
    </div>
  );
}
```

### 11. Backend: Tool List Query

**File:** `convex/ai/tools/registry.ts` (add query)

The UI needs a list of available tools with metadata:

```typescript
/**
 * Get the list of available tools for an org.
 * Used by the agent tools configuration UI.
 */
export const getToolList = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Return tool metadata (not implementations)
    return Object.values(toolRegistry).map((tool) => ({
      name: tool.name,
      description: tool.description,
      status: tool.status,
      category: tool.category || "general",
      permissions: tool.permissions || [],
    }));
  },
});
```

### 12. Backend: Agent Stats Query

**File:** `convex/ai/agentSessions.ts` (add query)

Aggregate stats for the analytics panel:

```typescript
/**
 * Get aggregate stats for an agent.
 * Used by the agent analytics panel.
 */
export const getAgentStats = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const activeSessions = sessions.filter((s) => s.status === "active").length;
    const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0);
    const tokensUsed = sessions.reduce((sum, s) => sum + (s.tokensUsed || 0), 0);
    const costUsd = sessions.reduce((sum, s) => sum + (s.costUsd || 0), 0);

    return {
      totalSessions: sessions.length,
      activeSessions,
      totalMessages,
      tokensUsed,
      costUsd,
      lastActiveAt: sessions[sessions.length - 1]?.lastMessageAt || null,
    };
  },
});
```

## Agent Create Flow

When "New Agent" is clicked:

1. **Choose type**: pm, customer_service, sales_assistant, booking_agent, general
2. **Name & basics**: Display name, language
3. **Soul generation**: Either manual entry or AI-generated via `soulGenerator.bootstrapAgent`
4. **Tool selection**: Default tools for the type, user can customize
5. **Autonomy level**: Default supervised, can change
6. **Activate**: Set status to `active`

This maps directly to the existing `createAgent` mutation + `bootstrapAgent` action.

## Files Summary

| File | Change | Risk |
|---|---|---|
| `src/app/agents/page.tsx` | **New** — page route | None |
| `src/components/window-content/agents-window.tsx` | **New** — main window | None |
| `src/components/window-content/agents/agent-list.tsx` | **New** — agent list | None |
| `src/components/window-content/agents/agent-detail.tsx` | **New** — tabbed detail | None |
| `src/components/window-content/agents/agent-soul-editor.tsx` | **New** — soul editor | None |
| `src/components/window-content/agents/agent-tools-config.tsx` | **New** — tool toggles | None |
| `src/components/window-content/agents/agent-sessions.tsx` | **New** — session viewer | None |
| `src/components/window-content/agents/agent-approval-queue.tsx` | **New** — approval UI | None |
| `src/components/window-content/agents/agent-analytics.tsx` | **New** — stats dashboard | None |
| `src/hooks/window-registry.tsx` | Add `agents` entry | Low |
| `convex/ai/tools/registry.ts` | Add `getToolList` query | Low |
| `convex/ai/agentSessions.ts` | Add `getAgentStats` query | Low |

## Verification

1. Navigate to `/agents` — page loads, shows agent list for current org
2. Click agent — detail panel shows with tabs
3. Soul tab — edit name, traits, rules; save persists to DB
4. Soul proposals — pending proposals display, approve/reject works
5. Tools tab — toggle tools on/off, change autonomy level
6. Sessions tab — shows conversation history, message bubbles with tool call details
7. Approvals tab — pending tool executions for supervised agents
8. Analytics tab — message count, token usage, cost, activity log
9. Create agent — form walks through type, name, soul gen, activation
10. Window manager — agents window opens alongside other windows

## Estimated Effort

| Task | Effort |
|------|--------|
| Page route + window registration | 0.25 session |
| Agent list + create flow | 0.5 session |
| Agent detail (tabs, header, actions) | 0.5 session |
| Soul editor + evolution proposals | 0.75 session |
| Tools config + autonomy controls | 0.5 session |
| Session viewer | 0.5 session |
| Approval queue | 0.25 session |
| Analytics | 0.25 session |
| Backend queries (tool list, stats) | 0.25 session |
| **Total** | **~3.5 sessions** |
