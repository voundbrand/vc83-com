# Phase 2.5 Step 11: Agency Sub-Org Model — Build Agents for Clients

## Goal
Agency owners can create client sub-organizations via Telegram conversation, each getting its own agent team bootstrapped automatically. The agency owner's PM agent coordinates the process: collecting business info, creating the sub-org, generating the client's agent soul, and routing that client's end-customers to the right org. This turns the platform into a **white-label agency engine** — the agency owner types "I want to build an agent for my German pharmacy client" and the system handles the rest.

## Depends On
- Step 3 (Team Tools) — PM agent coordinates specialist creation
- Step 5 (Onboarding Completion) — agent bootstrap + soul generation
- Step 7 (Soul Evolution) — client agents evolve independently
- Step 8 (Telegram Group Chat) — per-sub-org team visibility
- Step 10 (Self-Improvement Loop) — client agents self-improve

## What Already Exists

The infrastructure is solid — this step wires it together:

| Component | Status | Location |
|---|---|---|
| `parentOrganizationId` on orgs table | Done | `convex/schemas/coreSchemas.ts:64-145` |
| `by_parent` index | Done | Same file |
| Sub-org CRUD API | Done | `convex/api/v1/subOrganizations.ts` |
| Internal CRUD mutations | Done | `convex/api/v1/subOrganizationsInternal.ts` |
| Self-service `createSubOrganization` | Done | `convex/organizations.ts:832-980` |
| License gating (agency/enterprise) | Done | `convex/licensing/tierConfigs.ts` |
| Credit pool sharing (parent fallback) | Done | `convex/credits/index.ts:106-126` |
| 1-level nesting enforcement | Done | `subOrganizationsInternal.ts:36-41` |
| Agent session scoping by org | Done | `convex/schemas/agentSessionSchemas.ts` |
| Soul generation | Done | `convex/ai/soulGenerator.ts` |
| Minimal org bootstrap | Done | `convex/onboarding/orgBootstrap.ts` |

## What's Missing

### 1. Conversational Sub-Org Creation (via Telegram)
The PM agent needs a tool to create a sub-org during conversation. Right now `createSubOrganization` requires a web session — there's no agent-callable path.

### 2. Agent Bootstrap for Sub-Orgs
When a sub-org is created, it gets no agents. The onboarding flow that creates PM + specialists only runs for top-level orgs via Telegram. Sub-orgs need the same bootstrap.

### 3. Telegram Routing for Sub-Org Customers
The resolver (`telegramResolver.resolveChatToOrg`) maps `chat_id → org`. Sub-org customers need their own Telegram entry points — either unique deep links or a routing command that directs them to the right sub-org agent.

### 4. Sub-Org Team Group (per client)
Each sub-org should optionally get its own Telegram team group so the agency owner can observe the client's agent at work independently.

### 5. Agency Dashboard Queries
The agency owner's PM needs to report on all sub-orgs: credit usage, conversation volume, agent performance across the portfolio.

### 6. Cross-Org Escalation
A sub-org agent that hits its limits should be able to escalate to the parent org's PM for resolution.

## Architecture

```
Agency Owner (Telegram DM with PM)
    │
    │  "Build an agent for Apotheke Schmidt"
    │
    ▼
PM Agent collects info via guided conversation:
    - Business name? "Apotheke Schmidt"
    - Industry? "Pharmacy"
    - Location? "Berlin"
    - Who are their customers? "Elderly, families"
    - What should the agent do? "Answer medication questions,
      check stock, handle refill reminders"
    - Language & tone? "Formal German (Sie), warm & caring"
    │
    ▼
PM calls `create_client_org` tool
    │
    ├── 1. Creates sub-org under parent
    ├── 2. Seeds initial credit pool from parent
    ├── 3. Creates PM agent for sub-org
    ├── 4. Generates soul from collected context
    ├── 5. Creates Telegram deep link for sub-org
    ├── 6. (Optional) Creates team group for sub-org
    │
    ▼
Returns to agency owner:
    "Apotheke Schmidt is set up! Here's what I created:
     - Agent: 'Petra' (pharmacy assistant)
     - Personality: Warm, formal German, healthcare-focused
     - Deep link: t.me/l4yercak3_platform_bot?start=apotheke-schmidt
     - Give this link to Schmidt — their customers use it to
       reach Petra directly."
```

### Customer Routing via Deep Links

```
Customer opens: t.me/l4yercak3_platform_bot?start=apotheke-schmidt
    │
    ▼
Bridge receives /start apotheke-schmidt
    │
    ▼
Resolver: looks up org by slug → Apotheke Schmidt's sub-org ID
    │
    ▼
Routes to Apotheke Schmidt's PM agent (Petra)
    │
    ▼
Petra handles the customer conversation
    │
    ▼
(Optional) Conversation mirrored to sub-org's team group
           AND/OR agency owner's master group
```

## Changes

### 1. NEW: convex/ai/tools/agencyTools.ts — Agent-callable sub-org management

```typescript
/**
 * AGENCY TOOLS — Sub-Organization Management
 *
 * Tools that let the agency PM agent create and manage client sub-orgs.
 * Only available to agents on agency-tier or enterprise-tier orgs.
 */

import type { AITool, ToolExecutionContext } from "./registry";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../../_generated/api").internal;
  return _apiCache;
}

/**
 * create_client_org — Create a sub-org for an agency client
 */
export const createClientOrgTool: AITool = {
  name: "create_client_org",
  description: `Create a new client organization under your agency. Use this after collecting the client's business details. This will:
1. Create the sub-organization
2. Bootstrap a PM agent for the client
3. Generate the agent's personality from the business context
4. Create a Telegram deep link for the client's customers

Only available for agency-tier organizations.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      businessName: {
        type: "string",
        description: "The client's legal business name (e.g., 'Apotheke Schmidt')",
      },
      industry: {
        type: "string",
        description: "Industry category (e.g., 'pharmacy', 'fitness', 'restaurant')",
      },
      description: {
        type: "string",
        description: "Brief description of the business and what the agent should do",
      },
      targetAudience: {
        type: "string",
        description: "Who the client's customers are (e.g., 'elderly patients, young families')",
      },
      language: {
        type: "string",
        description: "Primary language for the agent (e.g., 'de', 'en', 'es')",
      },
      tonePreference: {
        type: "string",
        description: "Communication style (e.g., 'formal German with Sie, warm and caring')",
      },
      agentNameHint: {
        type: "string",
        description: "Optional preferred name for the client's agent",
      },
    },
    required: ["businessName", "industry", "description", "targetAudience"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    try {
      const result = await ctx.runAction(
        getInternal().onboarding.agencySubOrgBootstrap.bootstrapClientOrg,
        {
          parentOrganizationId: ctx.organizationId,
          businessName: args.businessName as string,
          industry: args.industry as string,
          description: args.description as string,
          targetAudience: args.targetAudience as string,
          language: (args.language as string) || "en",
          tonePreference: (args.tonePreference as string) || undefined,
          agentNameHint: (args.agentNameHint as string) || undefined,
        }
      );

      return result;
    } catch (e) {
      return { error: String(e) };
    }
  },
};

/**
 * list_client_orgs — List all client sub-orgs for the agency
 */
export const listClientOrgsTool: AITool = {
  name: "list_client_orgs",
  description: "List all client organizations under your agency, including their status, agent names, and recent activity.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    const children = await ctx.runQuery(
      getInternal().api.v1.subOrganizationsInternal.getChildOrganizationsInternal,
      { parentOrganizationId: ctx.organizationId }
    );

    if (!children?.organizations?.length) {
      return { message: "No client organizations yet. Use create_client_org to set up your first client." };
    }

    // Enrich with agent info per sub-org
    const enriched = [];
    for (const child of children.organizations) {
      const agents = await ctx.runQuery(
        getInternal().agentOntology.getAllActiveAgentsForOrg,
        { organizationId: child.id }
      );

      enriched.push({
        name: child.name,
        slug: child.slug,
        isActive: child.isActive,
        agentCount: (agents as any[])?.length || 0,
        agents: (agents as any[])?.map((a: any) => ({
          name: (a.customProperties as any)?.displayName || a.name,
          subtype: a.subtype,
        })) || [],
        deepLink: `t.me/l4yercak3_platform_bot?start=${child.slug}`,
      });
    }

    return {
      clientCount: enriched.length,
      clients: enriched,
    };
  },
};

/**
 * get_client_org_stats — Get performance stats for a client org
 */
export const getClientOrgStatsTool: AITool = {
  name: "get_client_org_stats",
  description: "Get conversation and credit usage stats for a specific client organization. Use the client's business name or slug.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      clientSlug: {
        type: "string",
        description: "The client's org slug (e.g., 'acme-apotheke-schmidt')",
      },
    },
    required: ["clientSlug"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    // Look up child org by slug
    const child = await ctx.runQuery(
      getInternal().organizations.getOrgBySlug,
      { slug: args.clientSlug as string }
    );

    if (!child || String(child.parentOrganizationId) !== String(ctx.organizationId)) {
      return { error: "Client organization not found or not under your agency" };
    }

    // Get credit balance
    const credits = await ctx.runQuery(
      getInternal().credits.getCreditBalanceInternalQuery,
      { organizationId: child._id }
    );

    // Get recent metrics
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const metrics = await ctx.runQuery(
      getInternal().ai.selfImprovement.getMetricsSince,
      { agentId: child._id, since: weekAgo }
    );

    // Get session count
    const sessions = await ctx.runQuery(
      getInternal().ai.agentSessions.getActiveSessions,
      { organizationId: child._id, status: "active" }
    );

    return {
      client: child.name,
      isActive: child.isActive,
      credits: credits ? {
        monthly: credits.monthlyCredits,
        purchased: credits.purchasedCredits,
      } : { message: "Using parent credit pool" },
      last7Days: {
        conversations: metrics?.length || 0,
        avgMessages: metrics?.length
          ? (metrics.reduce((s: number, m: any) => s + m.messageCount, 0) / metrics.length).toFixed(1)
          : "N/A",
      },
      activeSessions: sessions?.length || 0,
    };
  },
};
```

### 2. NEW: convex/onboarding/agencySubOrgBootstrap.ts — Backend orchestrator

```typescript
/**
 * AGENCY SUB-ORG BOOTSTRAP
 *
 * Orchestrates the creation of a client sub-org:
 * 1. Create the organization under the parent
 * 2. Seed credits from parent pool
 * 3. Bootstrap a PM agent
 * 4. Generate agent soul from business context
 * 5. Register Telegram deep link slug
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../_generated/api").internal;
  return _apiCache;
}

/**
 * Full bootstrap pipeline for a client sub-org.
 * Called by the create_client_org tool.
 */
export const bootstrapClientOrg = internalAction({
  args: {
    parentOrganizationId: v.id("organizations"),
    businessName: v.string(),
    industry: v.string(),
    description: v.string(),
    targetAudience: v.string(),
    language: v.optional(v.string()),
    tonePreference: v.optional(v.string()),
    agentNameHint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate parent has sub-org capability
    const parentLicense = await ctx.runQuery(
      getInternal().licensing.helpers.getLicenseInternalQuery,
      { organizationId: args.parentOrganizationId }
    );

    if (!parentLicense.features.subOrgsEnabled) {
      return {
        error: "Sub-organizations require Agency or Enterprise tier",
        upgradeRequired: true,
      };
    }

    // 2. Check sub-org limit
    const currentCount = await ctx.runQuery(
      getInternal().organizations.countSubOrganizations,
      { parentOrganizationId: args.parentOrganizationId }
    );
    const limit = parentLicense.limits.maxSubOrganizations;
    if (limit !== -1 && currentCount >= limit) {
      return {
        error: `Sub-org limit reached (${currentCount}/${limit}). Contact support or upgrade.`,
        currentCount,
        limit,
      };
    }

    // 3. Get parent org for slug prefix
    const parent = await ctx.runQuery(
      getInternal().organizations.getOrgById,
      { organizationId: args.parentOrganizationId }
    );

    // 4. Create the sub-org
    const slug = `${parent.slug}-${args.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)}`;

    const childOrgResult = await ctx.runMutation(
      getInternal().api.v1.subOrganizationsInternal.createChildOrganizationInternal,
      {
        parentOrganizationId: args.parentOrganizationId,
        name: args.businessName,
        slug,
        businessName: args.businessName,
      }
    );

    const childOrgId = childOrgResult.childOrganizationId;

    // 5. Bootstrap PM agent for sub-org
    const agentId = await ctx.runMutation(
      getInternal().onboarding.agencySubOrgBootstrap.createSubOrgAgent,
      {
        organizationId: childOrgId,
        businessName: args.businessName,
        industry: args.industry,
        subtype: "pm",
      }
    );

    // 6. Generate soul from business context
    await ctx.runAction(
      getInternal().ai.soulGenerator.generateSoul,
      {
        organizationId: childOrgId,
        agentId,
        hints: {
          preferredName: args.agentNameHint || undefined,
          industry: args.industry,
          targetAudience: args.targetAudience,
          tonePreference: args.tonePreference || undefined,
          additionalContext: args.description,
        },
      }
    );

    // 7. Register the deep link slug for routing
    await ctx.runMutation(
      getInternal().onboarding.agencySubOrgBootstrap.registerDeepLinkSlug,
      {
        organizationId: childOrgId,
        slug,
      }
    );

    // 8. Load the generated agent name
    const agent = await ctx.runQuery(
      getInternal().agentOntology.getAgentInternal,
      { agentId }
    );
    const agentName = (agent?.customProperties as any)?.soul?.name
      || (agent?.customProperties as any)?.displayName
      || args.businessName;

    return {
      success: true,
      childOrganizationId: childOrgId,
      slug,
      agentId,
      agentName,
      deepLink: `t.me/l4yercak3_platform_bot?start=${slug}`,
      message: `Created "${args.businessName}" with agent "${agentName}". Share the deep link with your client.`,
    };
  },
});

/**
 * Create a PM agent object for a sub-org
 */
export const createSubOrgAgent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    businessName: v.string(),
    industry: v.string(),
    subtype: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "org_agent",
      subtype: args.subtype,
      name: `${args.businessName} Agent`,
      status: "active",
      customProperties: {
        displayName: `${args.businessName} Agent`,
        industry: args.industry,
        model: "anthropic/claude-sonnet-4.5",
        maxMessagesPerDay: 200,
        maxCostPerDay: 5.0,
      },
    });
  },
});

/**
 * Register a deep link slug → org mapping
 * Stored in telegramMappings as a special entry with a known prefix
 */
export const registerDeepLinkSlug = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Store the slug as a telegramMapping with a special prefix
    // so the resolver can find it: "deeplink:<slug>" → org
    await ctx.db.insert("telegramMappings", {
      telegramChatId: `deeplink:${args.slug}`,
      organizationId: args.organizationId,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

/**
 * Resolve a deep link slug to an organization
 */
export const resolveDeepLink = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", `deeplink:${args.slug}`))
      .first();

    if (!mapping) return null;
    return { organizationId: mapping.organizationId };
  },
});
```

### 3. convex/onboarding/telegramResolver.ts — Handle deep link routing

In `resolveChatToOrg`, add deep link handling at the top of the handler:

```typescript
// Handle /start deep links (sub-org routing)
// The bridge passes the start param as metadata
if (args.startParam) {
  const deepLinkResult = await ctx.runQuery(
    getInternal().onboarding.agencySubOrgBootstrap.resolveDeepLink,
    { slug: args.startParam }
  );

  if (deepLinkResult) {
    // Create a telegram mapping for this chat_id → sub-org
    // so future messages from this customer route correctly
    const existing = await ctx.runQuery(
      getInternal().channels.telegramGroupSetup.getMappingByUserTelegramId,
      { telegramUserId: args.telegramChatId }
    );

    if (!existing) {
      await ctx.runMutation(
        getInternal().onboarding.telegramResolverInternal.createMapping,
        {
          telegramChatId: args.telegramChatId,
          organizationId: deepLinkResult.organizationId,
          senderName: args.senderName,
          status: "active",
        }
      );
    }

    return {
      organizationId: deepLinkResult.organizationId,
      isNew: !existing,
      routeToSystemBot: false,
    };
  }
}
```

### 4. scripts/telegram-bridge.ts — Extract /start deep link param

In the DM message handler, detect `/start <slug>` messages:

```typescript
// Handle /start deep links (sub-org routing)
const text = msg.text || "";
let startParam: string | undefined;
if (text.startsWith("/start ")) {
  startParam = text.slice(7).trim();
  // Don't pass "/start slug" as the message — it's a routing command
  // Instead, send a greeting
}

// In the resolver call, add startParam:
const resolution = await convex.action(
  api.onboarding.telegramResolver.resolveChatToOrg,
  {
    telegramChatId: chatId,
    senderName,
    startParam, // NEW: deep link slug
  }
);
```

### 5. convex/ai/tools/registry.ts — Register agency tools

```typescript
import {
  createClientOrgTool,
  listClientOrgsTool,
  getClientOrgStatsTool,
} from "./agencyTools";

// In TOOL_REGISTRY:
create_client_org: createClientOrgTool,
list_client_orgs: listClientOrgsTool,
get_client_org_stats: getClientOrgStatsTool,
```

### 6. convex/ai/harness.ts — Agency awareness in system prompt

After the existing self-awareness blocks, add:

```typescript
// Agency model awareness (sub-org management)
const parentOrg = config.parentOrganizationId
  ? await ctx.runQuery(getInternal().organizations.getOrgById, {
      organizationId: config.parentOrganizationId,
    })
  : null;

if (!parentOrg) {
  // This is a top-level org — check if it has sub-orgs
  const hasSubOrgs = config.subOrgsEnabled;
  if (hasSubOrgs) {
    lines.push("\n**Agency Model:**");
    lines.push("You are the PM for an agency. You can create client sub-organizations.");
    lines.push("- Use `create_client_org` to set up a new client");
    lines.push("- Use `list_client_orgs` to see all your clients");
    lines.push("- Use `get_client_org_stats` to check a client's performance");
    lines.push("- When the owner says they want to build an agent for a client, guide them through:");
    lines.push("  1. Business name and industry");
    lines.push("  2. Target audience (who are their customers?)");
    lines.push("  3. What the agent should do");
    lines.push("  4. Language and tone preferences");
    lines.push("  5. Then call create_client_org with all the details");
  }
}
```

### 7. convex/ai/agentExecution.ts — Tool filtering for agency tools

In the `filterToolsForAgent` function, gate agency tools behind the license tier:

```typescript
// In filterToolsForAgent, add tier-based filtering:
const agencyOnlyTools = ["create_client_org", "list_client_orgs", "get_client_org_stats"];

// Only include agency tools if the org has subOrgsEnabled
if (!config.subOrgsEnabled) {
  toolSchemas = toolSchemas.filter(
    (t) => !agencyOnlyTools.includes(t.function.name)
  );
}
```

### 8. convex/onboarding/telegramResolver.ts — Add startParam arg

Update the `resolveChatToOrg` action args:

```typescript
export const resolveChatToOrg = action({
  args: {
    telegramChatId: v.string(),
    senderName: v.optional(v.string()),
    startParam: v.optional(v.string()), // NEW: deep link slug from /start command
  },
  handler: async (ctx, args) => {
    // Deep link handling (see change #3 above)
    // ... then existing resolution logic
  },
});
```

## Verification

1. `npx convex typecheck` — passes
2. Agency owner messages PM: "I want to create an agent for Apotheke Schmidt"
3. PM guides owner through business details via conversation
4. PM calls `create_client_org` → sub-org created, agent bootstrapped, soul generated
5. PM returns deep link: `t.me/l4yercak3_platform_bot?start=agency-slug-apotheke-schmidt`
6. Customer opens deep link → routed to Apotheke Schmidt's agent → gets pharmacy-specific responses
7. Agency owner says "list my clients" → PM calls `list_client_orgs` → shows all sub-orgs
8. Agency owner says "how is Apotheke Schmidt doing?" → PM calls `get_client_org_stats`

## Complexity: High
- 2 new files (`agencyTools.ts`, `agencySubOrgBootstrap.ts`)
- 4 modified files (`registry.ts`, `harness.ts`, `agentExecution.ts`, `telegram-bridge.ts`, `telegramResolver.ts`)
- Relies heavily on existing sub-org infrastructure (no schema changes needed)
- The bootstrap orchestrator is the most complex piece — coordinates org creation, agent setup, soul generation, and routing

## Edge Cases

### Credit Exhaustion
When a sub-org runs out of credits, the existing credit pool sharing logic kicks in automatically (`convex/credits/index.ts:106-126`). The sub-org's agent will fall back to the parent agency's credit pool. The agency owner sees this in `get_client_org_stats`.

### Multiple Agents per Sub-Org
Initial bootstrap creates one PM agent. The agency owner can later tell their PM to "add a sales specialist to Apotheke Schmidt" — this would create additional agent objects on the sub-org, using the same soul generation flow.

### Sub-Org Deactivation
The existing `updateChildOrganizationInternal` supports `isActive: false`. When deactivated, the sub-org's agents stop responding and credit usage stops. The deep link still works but returns a "this business is currently unavailable" message.

### Language Isolation
Each sub-org agent gets its own soul with language/tone settings. A German pharmacy agent and a Spanish restaurant agent can coexist under the same agency, each responding in their configured language.

## The "Wow" Moment

```
Agency Owner: I have a new client — a pharmacy in Berlin called
  Apotheke Schmidt. They want an agent that answers medication
  questions, checks stock, and reminds customers about refills.
  Their customers are mostly elderly and families. It should
  be in formal German.

PM (Quinn): Great! Let me set that up for you.

  [create_client_org]
  ✓ Created "Apotheke Schmidt"
  ✓ Agent "Petra" generated (pharmacy assistant)
  ✓ Soul: Warm, formal German (Sie), healthcare-focused
  ✓ Deep link ready

Here's what I've created:

  *Apotheke Schmidt*
  Agent: Petra — Ihre freundliche Apotheken-Assistentin
  Deep link: t.me/l4yercak3_platform_bot?start=acme-apotheke-schmidt

  Share this link with Schmidt. When their customers open it,
  they'll be connected directly to Petra.

  Petra will:
  - Answer medication questions in formal German
  - Help with refill scheduling
  - Escalate complex cases to the pharmacist

  I'll keep you posted on how she's doing. You can check
  anytime with "how is Apotheke Schmidt doing?"

---

[Meanwhile, a customer in Berlin opens the deep link]

Customer: Guten Tag, ich brauche eine Nachfüllung für mein
  Blutdruckmedikament.

Petra: Guten Tag! Ich helfe Ihnen gerne bei Ihrer Nachfüllung.
  Könnten Sie mir bitte den Namen des Medikaments nennen?

Customer: Ramipril 5mg

Petra: Vielen Dank! Ramipril 5mg ist bei uns vorrätig.
  Möchten Sie es zur Abholung reservieren lassen,
  oder haben Sie Fragen zur Einnahme?
```

## What This Enables

- **Agency-as-a-Service**: Agency owners become AI consultants — they sell "AI agents for your business" to SMB clients, built in minutes via Telegram
- **Portfolio Management**: One agency manages 20 clients, each with their own specialized agent, all from a single Telegram DM
- **Self-Sustaining Revenue**: Each sub-org consumes credits → drives parent org's credit purchases → platform revenue
- **Compounding Value**: Each client agent improves via Steps 7+10 (soul evolution + self-improvement) independently, making the agency's offering more valuable over time
- **Zero Technical Barrier**: The agency owner never touches code — they describe the client's business in natural language and the system handles the rest
