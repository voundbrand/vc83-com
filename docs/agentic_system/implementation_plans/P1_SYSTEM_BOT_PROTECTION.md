# P1: System Bot Protection & Worker Pool

> Priority: HIGH | Estimated complexity: Medium-High | Files touched: 5-7

---

## Problem Statement

Quinn (system bot) is a single `org_agent` object with no special protection. Same rate limits, same soul evolution eligibility, same mutability as any customer agent. Quinn is a single point of failure — if corrupted, all onboarding breaks. No scaling when multiple users onboard simultaneously.

---

## Deliverables

1. **`protected` flag** on agent objects — immutable system agents
2. **Protection enforcement** — block soul evolution, pausing, archiving, config edits
3. **Worker pool model** — spawn Quinn instances from a frozen template
4. **Routing logic** — distribute onboarding sessions across workers
5. **Auto-scaling** — spawn workers on demand, archive idle ones
6. **Platform-level rate limits** — separate from org-level

---

## Design

### Protected Agent Model

```
Quinn Prime (template)
  ├── protected: true
  ├── status: "template" (new status, never receives messages directly)
  ├── soul: frozen, version-controlled
  ├── tools: ["complete_onboarding", "verify_telegram_link", ...]
  ├── Stored as canonical reference
  └── Workers cloned FROM this template

Quinn Worker Pool
  ├── Worker 1 (active, handling session A)
  │   ├── protected: true
  │   ├── status: "active"
  │   ├── templateAgentId: Quinn Prime's ID
  │   └── Auto-archives after 60min idle
  ├── Worker 2 (active, handling session B)
  └── Worker N (spawned on demand)

MAX_SYSTEM_WORKERS = 10 (platform config)
WORKER_IDLE_TIMEOUT = 60 minutes
```

### Worker Lifecycle

```
Onboarding request arrives
  ↓
telegramResolver resolves to platform org
  ↓
getOnboardingWorker():
  1. Query active workers with recent sessions (last 30s)
  2. Find idle worker → reuse
  3. No idle worker + count < MAX → spawn new from template
  4. count >= MAX → queue request (edge case, should rarely happen)
  ↓
Route to selected worker
  ↓
Worker handles onboarding conversation
  ↓
After completeOnboarding → worker goes idle
  ↓
After 60min idle → auto-archive worker
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/agentOntology.ts` | Add `protected` flag enforcement, `template` status, worker CRUD |
| `convex/onboarding/telegramResolver.ts` | Route to worker pool instead of single Quinn |
| `convex/ai/agentExecution.ts` | Check `protected` before allowing soul modifications |
| `convex/ai/soulEvolution.ts` | Block proposals for protected agents |
| `convex/onboarding/seedPlatformAgents.ts` | Seed Quinn as `template` + `protected` |
| `convex/crons.ts` | Add worker archival cron |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/workerPool.ts` | Worker spawning, routing, idle detection, archival |

---

## Implementation Steps

### Step 1: Add `protected` flag and `template` status

In agent config schema:

```typescript
// Agent status lifecycle (enhanced)
status: "draft" | "active" | "paused" | "archived" | "template"

// New fields
protected: boolean,            // immutable system agent
templateAgentId: optional(id), // ID of template this worker was cloned from
lastActiveSessionAt: optional(number), // for worker idle detection
```

### Step 2: Enforce protection in mutations

```typescript
// convex/agentOntology.ts — add to all agent update mutations
function enforceNotProtected(agent) {
  if (agent.customProperties.protected) {
    throw new Error("Cannot modify protected system agent");
  }
}

// Block soul evolution
// convex/ai/soulEvolution.ts — createSoulProposal
const agent = await ctx.db.get(agentId);
if (agent.customProperties.protected) {
  return; // silently skip proposals for protected agents
}

// Block status changes
// convex/agentOntology.ts — updateAgentStatus
if (agent.customProperties.protected && !["active", "template"].includes(newStatus)) {
  throw new Error("Cannot pause or archive protected system agent");
}
```

### Step 3: Create worker pool (`convex/ai/workerPool.ts`)

```typescript
const MAX_SYSTEM_WORKERS = 10;
const WORKER_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

export const getOnboardingWorker = internalMutation({
  args: { platformOrgId: v.id("organizations") },
  handler: async (ctx, { platformOrgId }) => {
    // Get Quinn template
    const template = await ctx.db.query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .filter(q => q.and(
        q.eq(q.field("customProperties.protected"), true),
        q.eq(q.field("customProperties.status"), "template"),
      ))
      .first();

    if (!template) throw new Error("Quinn template not found");

    // Find idle worker
    const workers = await ctx.db.query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .filter(q => q.and(
        q.eq(q.field("customProperties.status"), "active"),
        q.neq(q.field("customProperties.templateAgentId"), undefined),
      ))
      .collect();

    const now = Date.now();
    const idleWorker = workers.find(w => {
      const lastActive = w.customProperties.lastActiveSessionAt ?? 0;
      return (now - lastActive) > 30000; // idle for 30s+
    });

    if (idleWorker) {
      await ctx.db.patch(idleWorker._id, {
        customProperties: {
          ...idleWorker.customProperties,
          lastActiveSessionAt: now,
        },
      });
      return idleWorker._id;
    }

    // Spawn new worker if under limit
    if (workers.length < MAX_SYSTEM_WORKERS) {
      const worker = await ctx.db.insert("objects", {
        organizationId: platformOrgId,
        type: "org_agent",
        customProperties: {
          ...template.customProperties,
          status: "active",
          templateAgentId: template._id,
          displayName: `Quinn Worker ${workers.length + 1}`,
          lastActiveSessionAt: now,
        },
      });
      return worker;
    }

    // All workers busy — use least recently active
    const leastActive = workers.sort((a, b) =>
      (a.customProperties.lastActiveSessionAt ?? 0) - (b.customProperties.lastActiveSessionAt ?? 0)
    )[0];

    return leastActive._id;
  },
});

// Archival cron
export const archiveIdleWorkers = internalMutation({
  handler: async (ctx) => {
    const platformOrgId = getPlatformOrgId();
    const workers = await ctx.db.query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .filter(q => q.and(
        q.eq(q.field("customProperties.status"), "active"),
        q.neq(q.field("customProperties.templateAgentId"), undefined),
      ))
      .collect();

    const now = Date.now();
    let archivedCount = 0;

    // Keep at least 1 worker active
    const sortedByActivity = workers.sort((a, b) =>
      (b.customProperties.lastActiveSessionAt ?? 0) - (a.customProperties.lastActiveSessionAt ?? 0)
    );

    for (let i = 1; i < sortedByActivity.length; i++) { // skip first (most recent)
      const worker = sortedByActivity[i];
      const lastActive = worker.customProperties.lastActiveSessionAt ?? 0;
      if (now - lastActive > WORKER_IDLE_TIMEOUT_MS) {
        await ctx.db.patch(worker._id, {
          customProperties: { ...worker.customProperties, status: "archived" },
        });
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      console.log(`[WorkerPool] Archived ${archivedCount} idle Quinn workers`);
    }
  },
});
```

### Step 4: Update telegram resolver routing

```typescript
// convex/onboarding/telegramResolver.ts
// BEFORE: Route to single Quinn
const systemAgent = await getActiveAgentForOrg(platformOrgId);
return { organizationId: platformOrgId, agentId: systemAgent._id };

// AFTER: Route to worker pool
const workerId = await ctx.runMutation(internal.ai.workerPool.getOnboardingWorker, {
  platformOrgId,
});
return { organizationId: platformOrgId, agentId: workerId };
```

### Step 5: Update seed script

```typescript
// convex/onboarding/seedPlatformAgents.ts
// Mark Quinn as template + protected
await ctx.db.insert("objects", {
  organizationId: platformOrgId,
  type: "org_agent",
  customProperties: {
    displayName: "Quinn",
    subtype: "system",
    status: "template",      // changed from "active"
    protected: true,         // new
    // ... rest of Quinn config
  },
});

// Also spawn initial worker
await ctx.runMutation(internal.ai.workerPool.getOnboardingWorker, { platformOrgId });
```

### Step 6: Add archival cron

```typescript
// convex/crons.ts
crons.interval("archive-idle-workers", { minutes: 15 }, internal.ai.workerPool.archiveIdleWorkers);
```

---

## Testing Strategy

1. **Protection enforcement**: verify protected agents can't have soul proposals, status changes, or config edits
2. **Worker spawning**: first onboarding request spawns worker from template
3. **Worker reuse**: subsequent requests reuse idle workers
4. **Worker cap**: requests beyond MAX_SYSTEM_WORKERS fall back to least-active worker
5. **Worker archival**: idle workers archived after 60 minutes
6. **Template immutability**: Quinn Prime template never receives direct messages

---

## Success Criteria

- [ ] Quinn template is `protected: true` and `status: "template"`
- [ ] Protected agents are immune to soul evolution, archiving, pausing, config edits
- [ ] Onboarding requests route to worker pool, not single agent
- [ ] Workers spawned on demand up to MAX_SYSTEM_WORKERS
- [ ] Idle workers auto-archived after 60 minutes
- [ ] At least 1 worker always kept active
- [ ] Seed script creates template + initial worker
