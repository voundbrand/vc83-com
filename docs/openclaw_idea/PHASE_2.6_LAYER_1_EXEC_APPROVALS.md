# Phase 2.6 — Layer 1: Exec Approvals (Tool-Level HITL)

> **Status:** Implementation Plan
> **Depends on:** Phase 1 (Agent Per Org), Phase 2.5 Steps 1–6
> **OpenClaw ref:** `openclaw/docs/tools/exec-approvals.md`

---

## 1. What Exists Today

### Working
| Component | File | What It Does |
|---|---|---|
| Approval queue | `convex/ai/agentApprovals.ts` | `createApprovalRequest` → `approveAction` → `executeApprovedAction` full lifecycle |
| Autonomy gate | `convex/ai/agentExecution.ts:909-920` | `checkNeedsApproval()` — supervised=all, autonomous=check list, draft_only=no exec |
| 3 autonomy levels | `convex/agentOntology.ts:191-195` | `supervised`, `autonomous`, `draft_only` stored on agent |
| requireApprovalFor | `convex/agentOntology.ts:198` | Simple `string[]` of tool names needing approval in autonomous mode |
| Approval statuses | `convex/schemas/aiSchemas.ts:101-109` | `proposed→approved→executing→success/failed/rejected/cancelled` |
| Org-level HITL flag | `convex/schemas/aiSchemas.ts:216` | `humanInLoopEnabled` boolean on org settings |
| Tool approval mode | `convex/schemas/aiSchemas.ts:227-231` | `all`, `dangerous`, `none` (schema only, not wired) |
| User responses | `convex/schemas/aiSchemas.ts:113-119` | `approve`, `approve_always`, `reject`, `custom`, `cancel` |
| Auto-expiry | `convex/ai/agentApprovals.ts:386-418` | Stale approvals expire after 24h (no cron registered yet) |
| Credit gating | `convex/ai/agentApprovals.ts:271-285` | Pre-flight credit check before executing approved actions |
| Audit trail | `convex/ai/agentApprovals.ts:63-74,179-188` | `objectActions` entries for every approval lifecycle event |

### Missing (vs. OpenClaw spec)
| Gap | OpenClaw Feature | Priority |
|---|---|---|
| **Always-allow flow** | `approve_always` → auto-add to allowlist so agent never asks again for that tool | HIGH |
| **Chat channel forwarding** | Forward approval prompts to Telegram/WhatsApp/Slack with `/approve <id>` | HIGH |
| **Approval expiry cron** | `expireStaleApprovals` exists but isn't registered in `crons.ts` | HIGH |
| **toolApprovalMode wiring** | Schema has `all/dangerous/none` but execution pipeline doesn't read it | MEDIUM |
| **Tool risk categories** | Classify tools as `read-only`, `write`, `destructive` for the `dangerous` mode | MEDIUM |
| **Approval timeout** | OpenClaw returns denial reason on timeout; we just expire silently | LOW |
| **System events** | OpenClaw posts `Exec running/finished/denied` to session; we only post on success | LOW |

---

## 2. Architecture

### 2.1 Approval Decision Flow (Enhanced)

```
Agent calls tool
     │
     ▼
checkNeedsApproval(config, toolName, orgSettings)
     │
     ├─ draft_only → BLOCK (tools already filtered to read-only)
     │
     ├─ supervised → QUEUE ALL
     │
     ├─ autonomous
     │    ├─ tool in alwaysAllowList? → EXECUTE DIRECTLY
     │    ├─ tool in requireApprovalFor? → QUEUE
     │    ├─ orgSettings.toolApprovalMode === "all"? → QUEUE
     │    ├─ orgSettings.toolApprovalMode === "dangerous" AND tool.riskLevel === "destructive"? → QUEUE
     │    └─ else → EXECUTE DIRECTLY
     │
     └─ semi_autonomous (Layer 2 addition)
          └─ See PHASE_2.6_LAYER_2
```

### 2.2 Enhanced Approval Request Object

```typescript
// objects table, type="agent_approval"
customProperties: {
  // Existing
  agentId: Id<"objects">,
  sessionId: Id<"agentSessions">,
  actionType: string,           // tool name
  actionPayload: any,           // tool args
  requestedAt: number,
  expiresAt: number,            // 24h default

  // NEW: Resolution tracking
  resolvedAt?: number,
  resolvedBy?: Id<"users"> | "system",  // "system" = auto-expired or chat-approved
  resolvedVia?: "dashboard" | "telegram" | "whatsapp" | "email" | "sms" | "api",
  rejectionReason?: string,

  // NEW: Execution tracking
  executedAt?: number,
  executionSuccess?: boolean,
  executionResult?: string,

  // NEW: Always-allow tracking
  alwaysAllowed?: boolean,      // User chose "approve_always"

  // NEW: Tool risk metadata
  toolRiskLevel?: "read-only" | "write" | "destructive",
  toolDescription?: string,     // Human-readable explanation of what the tool does
}
```

### 2.3 Always-Allow List (Per-Agent)

Instead of OpenClaw's glob-pattern allowlist, we use a **tool-name allowlist** stored on the agent config. When a user approves with `approve_always`, the tool name is added to `alwaysAllowList` on the agent.

```typescript
// In agent customProperties (agentOntology)
interface AgentConfig {
  // Existing
  requireApprovalFor: string[],    // Tools that ALWAYS need approval (blocklist)

  // NEW
  alwaysAllowList: string[],       // Tools the owner has pre-approved (allowlist)
  // Priority: requireApprovalFor > alwaysAllowList > default behavior
}
```

**Decision priority:**
1. `requireApprovalFor` includes tool → ALWAYS queue (highest priority)
2. `alwaysAllowList` includes tool → ALWAYS skip approval
3. Default → follow autonomy level rules

---

## 3. Implementation Steps

### Step 1: Wire `toolApprovalMode` into execution pipeline

**File:** `convex/ai/agentExecution.ts`

Modify `checkNeedsApproval()` to also read org AI settings:

```typescript
function checkNeedsApproval(
  config: AgentConfig,
  toolName: string,
  orgToolApprovalMode?: "all" | "dangerous" | "none"
): boolean {
  // Supervised mode: everything needs approval
  if (config.autonomyLevel === "supervised") return true;

  // Draft-only mode: nothing executes
  if (config.autonomyLevel === "draft_only") return false;

  // Per-tool blocklist (highest priority)
  if (config.requireApprovalFor?.includes(toolName)) return true;

  // Per-tool allowlist (user said "always allow")
  if (config.alwaysAllowList?.includes(toolName)) return false;

  // Org-level approval mode
  if (orgToolApprovalMode === "all") return true;
  if (orgToolApprovalMode === "dangerous") {
    const riskLevel = getToolRiskLevel(toolName);
    if (riskLevel === "destructive") return true;
  }
  if (orgToolApprovalMode === "none") return false;

  return false;
}
```

**Load org settings in the pipeline** (~line 275):
```typescript
// Load org AI settings for HITL config
const orgAiSettings = await ctx.runQuery(
  getInternal().ai.settings.getOrgAiSettingsInternal,
  { organizationId: args.organizationId }
);
const orgToolApprovalMode = orgAiSettings?.toolApprovalMode;
```

**Changes:**
- `convex/ai/agentExecution.ts` — Update `checkNeedsApproval()` signature, pass org settings
- `convex/schemas/aiSchemas.ts` — No changes (schema already has `toolApprovalMode`)

### Step 2: Tool risk classification

**New file:** `convex/ai/tools/riskClassification.ts`

```typescript
export type ToolRiskLevel = "read-only" | "write" | "destructive";

const TOOL_RISK_MAP: Record<string, ToolRiskLevel> = {
  // Read-only (never needs approval in "dangerous" mode)
  query_org_data: "read-only",
  search_contacts: "read-only",
  list_events: "read-only",
  list_products: "read-only",
  list_forms: "read-only",
  list_tickets: "read-only",
  list_workflows: "read-only",
  search_media: "read-only",
  search_unsplash_images: "read-only",
  get_form_responses: "read-only",
  review_own_soul: "read-only",
  view_pending_proposals: "read-only",
  list_team_agents: "read-only",
  list_client_orgs: "read-only",
  get_client_org_stats: "read-only",

  // Write (creates/modifies data, reversible)
  create_contact: "write",
  update_contact: "write",
  create_event: "write",
  create_booking: "write",
  create_ticket: "write",
  create_form: "write",
  tag_in_specialist: "write",
  propose_soul_update: "write",
  download_media: "write",
  transcribe_audio: "write",
  analyze_image: "write",
  parse_document: "write",

  // Destructive (sends external messages, costs money, hard to undo)
  send_email: "destructive",
  send_bulk_email: "destructive",
  send_sms: "destructive",
  send_whatsapp: "destructive",
  create_client_org: "destructive",
  contact_sync: "destructive",
  request_feature: "write",
};

export function getToolRiskLevel(toolName: string): ToolRiskLevel {
  return TOOL_RISK_MAP[toolName] || "write"; // Default to write (cautious)
}
```

### Step 3: Always-allow flow (`approve_always`)

**File:** `convex/ai/agentApprovals.ts`

Add `approveAlways` mutation alongside existing `approveAction`:

```typescript
export const approveAlways = mutation({
  args: {
    sessionId: v.string(),
    approvalId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();
    if (!session) throw new Error("Invalid session");

    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.type !== "agent_approval" || approval.status !== "pending") {
      throw new Error("Approval not found or not pending");
    }

    const props = approval.customProperties as Record<string, unknown>;
    const toolName = props.actionType as string;
    const agentId = props.agentId as Id<"objects">;

    // 1. Approve this request
    await ctx.db.patch(args.approvalId, {
      status: "approved",
      customProperties: {
        ...approval.customProperties,
        resolvedAt: Date.now(),
        resolvedBy: session.userId,
        alwaysAllowed: true,
      },
      updatedAt: Date.now(),
    });

    // 2. Add tool to agent's alwaysAllowList
    const agent = await ctx.db.get(agentId);
    if (agent) {
      const config = (agent.customProperties || {}) as Record<string, unknown>;
      const currentList = (config.alwaysAllowList as string[]) || [];
      if (!currentList.includes(toolName)) {
        await ctx.db.patch(agentId, {
          customProperties: {
            ...agent.customProperties,
            alwaysAllowList: [...currentList, toolName],
          },
          updatedAt: Date.now(),
        });
      }
    }

    // 3. Schedule execution
    await ctx.scheduler.runAfter(0, internal.ai.agentApprovals.executeApprovedAction, {
      approvalId: args.approvalId,
    });

    // 4. Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: approval.organizationId,
      objectId: args.approvalId,
      actionType: "approval_always_granted",
      actionData: { resolvedBy: session.userId, toolName },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});
```

**Also add to agent ontology schema** (`convex/agentOntology.ts` createAgent/updateAgent):
- Add `alwaysAllowList: v.optional(v.array(v.string()))` to args
- Default to `[]` in createAgent

### Step 4: Approval channel forwarding

**New file:** `convex/ai/approvalNotifier.ts`

This forwards approval requests to the org owner's preferred channels using the existing channel router.

```typescript
/**
 * APPROVAL NOTIFIER
 *
 * Forwards pending approval requests to org owner via connected channels.
 * Supports Telegram inline buttons, WhatsApp templates, email, SMS.
 *
 * Reply commands:
 *   /approve <id>          — approve once
 *   /approve_always <id>   — approve + add to allowlist
 *   /deny <id> [reason]    — reject with optional reason
 */

export const notifyOwnerOfApproval = internalAction({
  args: {
    approvalId: Id<"objects">,
    organizationId: Id<"organizations">,
    agentName: string,
    toolName: string,
    toolDescription: string,
    toolArgs: any,
  },
  handler: async (ctx, args) => {
    // 1. Find org owner
    const owner = await ctx.runQuery(
      getInternal().organizations.getOwnerInternal,
      { organizationId: args.organizationId }
    );

    if (!owner) return;

    // 2. Get org's connected channels
    const bindings = await ctx.runQuery(
      getInternal().channels.webhooks.getChannelBindingsInternal,
      { organizationId: args.organizationId }
    );

    // 3. Format approval message
    const shortId = args.approvalId.toString().slice(-8);
    const message = formatApprovalMessage({
      shortId,
      agentName: args.agentName,
      toolName: args.toolName,
      toolDescription: args.toolDescription,
      toolArgs: args.toolArgs,
    });

    // 4. Send via each connected channel
    for (const binding of bindings) {
      if (binding.channel === "telegram") {
        // Telegram: use inline keyboard buttons
        await sendTelegramApproval(ctx, {
          chatId: binding.recipientId,
          message: message.text,
          approvalId: args.approvalId,
        });
      } else {
        // All other channels: text with /approve command
        await ctx.runAction(
          getInternal().channels.router.sendMessage,
          {
            organizationId: args.organizationId,
            channel: binding.channel,
            recipientIdentifier: binding.recipientId,
            content: message.textWithCommands,
          }
        );
      }
    }

    // 5. Always send in-app (dashboard will show via getPendingApprovals query)
    // No action needed — the approval object is already queryable
  },
});

function formatApprovalMessage(args: {
  shortId: string;
  agentName: string;
  toolName: string;
  toolDescription: string;
  toolArgs: any;
}) {
  const argsPreview = JSON.stringify(args.toolArgs, null, 2).slice(0, 300);

  return {
    text: [
      `🔔 *Approval Request* (${args.shortId})`,
      ``,
      `*${args.agentName}* wants to execute: *${args.toolName}*`,
      `${args.toolDescription}`,
      ``,
      `Arguments:`,
      `\`\`\`${argsPreview}\`\`\``,
    ].join("\n"),

    textWithCommands: [
      `🔔 Approval Request (${args.shortId})`,
      ``,
      `${args.agentName} wants to execute: ${args.toolName}`,
      `${args.toolDescription}`,
      ``,
      `Arguments: ${argsPreview}`,
      ``,
      `Reply with:`,
      `  /approve ${args.shortId}`,
      `  /approve_always ${args.shortId}`,
      `  /deny ${args.shortId} [reason]`,
    ].join("\n"),
  };
}

async function sendTelegramApproval(ctx: ActionCtx, args: {
  chatId: string;
  message: string;
  approvalId: Id<"objects">;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: args.chatId,
      text: args.message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Allow Once", callback_data: `approve:${args.approvalId}` },
            { text: "✅ Always Allow", callback_data: `approve_always:${args.approvalId}` },
          ],
          [
            { text: "❌ Deny", callback_data: `deny:${args.approvalId}` },
          ],
        ],
      },
    }),
  });
}
```

### Step 5: Chat command handler (`/approve`, `/deny`)

**File:** `convex/channels/webhooks.ts` (modify existing webhook handler)

When an inbound message matches `/approve`, `/approve_always`, or `/deny`, intercept it before passing to the agent pipeline:

```typescript
// In the webhook handler, before calling processInboundMessage:
const approvalCommand = parseApprovalCommand(message.message);
if (approvalCommand) {
  await handleApprovalCommand(ctx, {
    organizationId: message.organizationId,
    command: approvalCommand,
    channel: message.channel,
    senderId: message.externalContactIdentifier,
  });
  return; // Don't pass to agent pipeline
}

function parseApprovalCommand(text: string): {
  action: "approve" | "approve_always" | "deny";
  shortId: string;
  reason?: string;
} | null {
  const match = text.match(/^\/(approve_always|approve|deny)\s+(\S+)(?:\s+(.+))?$/i);
  if (!match) return null;
  return {
    action: match[1].toLowerCase() as "approve" | "approve_always" | "deny",
    shortId: match[2],
    reason: match[3],
  };
}
```

### Step 6: Register approval expiry cron

**File:** `convex/crons.ts`

```typescript
/**
 * Expire Stale Agent Approvals
 *
 * Runs every hour to expire approval requests older than 24 hours.
 */
crons.interval(
  "Expire stale agent approvals",
  { hours: 1 },
  internal.ai.agentApprovals.expireStaleApprovals
);
```

### Step 7: System event messages

When an approval is resolved (approved/rejected/expired), post a system message to the agent session so the agent knows what happened:

**File:** `convex/ai/agentApprovals.ts` — modify `rejectAction` and `expireStaleApprovals`

```typescript
// In rejectAction, after patching the approval:
await ctx.runMutation(internal.ai.agentSessions.addSessionMessage, {
  sessionId: props.sessionId,
  role: "system",
  content: `[Action rejected] ${props.actionType}: ${args.reason || "No reason given"}`,
});

// In expireStaleApprovals, for each expired approval:
await ctx.db.insert("agentSessionMessages", {
  sessionId: props.sessionId,
  role: "system",
  content: `[Action expired] ${props.actionType}: No response within 24 hours`,
  timestamp: Date.now(),
});
```

### Step 8: Trigger notification on approval creation

**File:** `convex/ai/agentExecution.ts` — after `createApprovalRequest` (~line 340):

```typescript
if (needsApproval) {
  const approvalId = await ctx.runMutation(
    getInternal().ai.agentApprovals.createApprovalRequest,
    { ... }
  );

  // NEW: Notify owner via connected channels
  ctx.scheduler.runAfter(0, getInternal().ai.approvalNotifier.notifyOwnerOfApproval, {
    approvalId,
    organizationId: args.organizationId,
    agentName: config.displayName || agent.name,
    toolName,
    toolDescription: TOOL_REGISTRY[toolName]?.description || toolName,
    toolArgs: parsedArgs,
  });

  toolResults.push({ tool: toolName, status: "pending_approval" });
}
```

---

## 4. Schema Changes

### `convex/agentOntology.ts` — Agent Config

```diff
  requireApprovalFor: v.optional(v.array(v.string())),
+ alwaysAllowList: v.optional(v.array(v.string())),
```

### `convex/ai/tools/registry.ts` — AITool interface

```diff
  export interface AITool {
    name: string;
    description: string;
    status: ToolStatus;
    parameters: { ... };
    permissions?: string[];
+   riskLevel?: "read-only" | "write" | "destructive";
    execute: (ctx: ToolExecutionContext, args: any) => Promise<unknown>;
  }
```

---

## 5. Files Changed

| File | Change |
|---|---|
| `convex/ai/agentExecution.ts` | Update `checkNeedsApproval()`, load org settings, trigger notifier |
| `convex/ai/agentApprovals.ts` | Add `approveAlways`, system event messages on reject/expire |
| `convex/agentOntology.ts` | Add `alwaysAllowList` to create/update args |
| `convex/ai/tools/registry.ts` | Add `riskLevel` to `AITool` interface |
| `convex/crons.ts` | Register `expireStaleApprovals` cron |
| **NEW** `convex/ai/tools/riskClassification.ts` | Tool risk level map |
| **NEW** `convex/ai/approvalNotifier.ts` | Multi-channel approval forwarding |
| `convex/channels/webhooks.ts` | `/approve` command interception |

---

## 6. Testing Checklist

- [ ] **Supervised agent**: Every tool call queued as approval
- [ ] **Autonomous agent + requireApprovalFor**: Listed tools queued, others execute
- [ ] **Autonomous agent + alwaysAllowList**: Listed tools skip approval
- [ ] **Priority**: `requireApprovalFor` overrides `alwaysAllowList`
- [ ] **toolApprovalMode=all**: All tools queued regardless of autonomy
- [ ] **toolApprovalMode=dangerous**: Only destructive tools queued
- [ ] **approve_always**: Tool added to agent's `alwaysAllowList`, subsequent calls skip
- [ ] **Telegram approval**: Inline buttons resolve approval correctly
- [ ] **Chat /approve command**: Works via WhatsApp, SMS, email
- [ ] **Expiry cron**: Approvals expire after 24h, system message posted to session
- [ ] **Rejection**: System message posted to session with reason
- [ ] **Credit gating**: Approval rejected if org has insufficient credits
- [ ] **Audit trail**: All lifecycle events logged in `objectActions`

---

## 7. Migration

No data migration needed. New fields (`alwaysAllowList`, `riskLevel`) are optional and default to empty/undefined. Existing agents continue working with current behavior.

**Rollout:**
1. Deploy schema + risk classification (no behavior change)
2. Deploy `checkNeedsApproval` enhancement (reads new fields if present)
3. Deploy `approveAlways` mutation + cron registration
4. Deploy approval notifier + chat command handler
5. Enable `toolApprovalMode` in org settings UI
