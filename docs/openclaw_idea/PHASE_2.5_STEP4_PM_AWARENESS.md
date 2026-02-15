# Phase 2.5 Step 4: PM Agent Team Awareness

## Goal
The PM agent knows about its team — who's available, what they specialize in, and when to tag them in. This info is injected into the PM's system prompt via the harness.

## Depends On
- Step 3 (Team Tools) — tools must exist for the harness to reference them
- `getAllActiveAgentsForOrg` query from Step 3

## Changes

### 1. convex/ai/harness.ts — Enhance `buildHarnessContext`

Add a team section when the org has multiple active agents:

```typescript
// In buildHarnessContext(), after the existing sections:

// Fetch all active agents for the org
const allAgents = await ctx.runQuery(
  getInternal().agentOntology.getAllActiveAgentsForOrg,
  { organizationId }
);

if (allAgents.length > 1) {
  harnessLines.push("");
  harnessLines.push("=== YOUR TEAM ===");
  harnessLines.push("You are the lead agent (PM) for this organization.");
  harnessLines.push("You coordinate the team. Handle general questions yourself.");
  harnessLines.push("Tag in a specialist when their expertise is needed.");
  harnessLines.push("");
  harnessLines.push("Team members:");

  for (const agent of allAgents) {
    if (agent._id === currentAgentId) continue; // Skip self
    const props = agent.customProperties as Record<string, any>;
    const name = props?.displayName || agent.name;
    const soul = props?.soul;
    const tagline = soul?.tagline || agent.subtype;
    const traits = soul?.traits?.slice(0, 3)?.join(", ") || "";

    harnessLines.push(`- **${name}** (${agent.subtype}): ${tagline}`);
    if (traits) harnessLines.push(`  Traits: ${traits}`);
  }

  harnessLines.push("");
  harnessLines.push("Use the `tag_in_specialist` tool to bring in a team member.");
  harnessLines.push("Use `list_team_agents` to see the current team roster.");
  harnessLines.push("=== END TEAM ===");
}
```

### 2. buildHarnessContext function signature
Currently `buildHarnessContext` is a pure function that takes pre-loaded data. To avoid adding a query inside it, we can:

**Option A (preferred):** Fetch team data in `processInboundMessage` and pass it to `buildHarnessContext`:
```typescript
// In processInboundMessage, after loading agent config:
const teamAgents = await ctx.runQuery(
  getInternal().agentOntology.getAllActiveAgentsForOrg,
  { organizationId: args.organizationId }
);

// Pass to buildHarnessContext:
const harnessContext = buildHarnessContext(config, sessionStats, teamAgents);
```

**Option B:** Add team data to the system prompt separately in `buildAgentSystemPrompt`.

### 3. PM soul template
When bootstrapping the first/primary agent for an org, set its subtype to `"general"` and include PM-specific soul traits:
```json
{
  "alwaysDo": [
    "Always check if a specialist would handle this better before responding in detail",
    "Always introduce team members by name when tagging them in",
    "Always maintain awareness of the full conversation even when specialists respond"
  ]
}
```

This is a soul generation hint, not a code change — the soul generator already uses hints.

## Verification
1. Create org with 2+ agents
2. Send "who's on your team?" → PM should list team members from harness context
3. Send "I need help with booking" → PM should tag in booking agent
4. Check system prompt in Convex logs → verify team section appears

## Complexity: Medium
1-2 files modified. Main work is extending the harness context builder.
