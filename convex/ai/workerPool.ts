/**
 * WORKER POOL — System Bot Scaling
 *
 * Manages a pool of Quinn workers cloned from a frozen template.
 * Workers handle onboarding sessions concurrently and are archived
 * after idle timeout.
 *
 * Lifecycle:
 * 1. Quinn Prime lives as a "template" agent (protected, never receives messages)
 * 2. Workers are cloned from the template with status "active"
 * 3. Idle workers auto-archive after WORKER_IDLE_TIMEOUT_MS
 * 4. At least 1 worker is always kept active
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { DURATION_MS } from "../lib/constants";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SYSTEM_WORKERS = 10;
const WORKER_IDLE_TIMEOUT_MS = DURATION_MS.ONE_HOUR; // 60 minutes
const WORKER_BUSY_THRESHOLD_MS = 30_000; // 30 seconds — worker is "busy" if active within this window

// ============================================================================
// WORKER SPAWNING & ROUTING
// ============================================================================

/**
 * Get an available onboarding worker, spawning a new one if needed.
 *
 * Priority:
 * 1. Reuse an idle worker (no recent activity in last 30s)
 * 2. Spawn a new worker from template (if under MAX_SYSTEM_WORKERS)
 * 3. Fall back to least-recently-active worker (overload case)
 */
export const getOnboardingWorker = internalMutation({
  args: {
    platformOrgId: v.id("organizations"),
  },
  handler: async (ctx, { platformOrgId }) => {
    // 1. Find the template agent
    const allAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .collect();

    const template = allAgents.find((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = a.customProperties as Record<string, any> | undefined;
      return props?.protected === true && a.status === "template";
    });

    if (!template) {
      throw new Error("Quinn template not found — run seedPlatformAgents first");
    }

    // 2. Get all active workers (agents cloned from this template)
    const workers = allAgents.filter((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = a.customProperties as Record<string, any> | undefined;
      return a.status === "active" && props?.templateAgentId !== undefined;
    });

    const now = Date.now();

    // 3. Find an idle worker (not used in the last 30s)
    const idleWorker = workers.find((w) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = w.customProperties as Record<string, any>;
      const lastActive = (props?.lastActiveSessionAt as number) ?? 0;
      return (now - lastActive) > WORKER_BUSY_THRESHOLD_MS;
    });

    if (idleWorker) {
      // Mark as active
      await ctx.db.patch(idleWorker._id, {
        customProperties: {
          ...idleWorker.customProperties,
          lastActiveSessionAt: now,
        },
      });
      return idleWorker._id;
    }

    // 4. Spawn new worker if under limit
    if (workers.length < MAX_SYSTEM_WORKERS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const templateProps = template.customProperties as Record<string, any>;
      const workerNumber = workers.length + 1;

      const workerId = await ctx.db.insert("objects", {
        organizationId: platformOrgId,
        type: "org_agent",
        subtype: "system",
        name: `Quinn Worker ${workerNumber}`,
        description: `Quinn onboarding worker #${workerNumber} (auto-spawned)`,
        status: "active",
        customProperties: {
          ...templateProps,
          // Worker-specific overrides
          displayName: `Quinn Worker ${workerNumber}`,
          status: "active",
          protected: true,
          templateAgentId: template._id,
          lastActiveSessionAt: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[WorkerPool] Spawned Quinn Worker ${workerNumber}: ${workerId}`);
      return workerId;
    }

    // 5. All workers busy — reuse the least-recently-active one
    const leastActive = [...workers].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aTime = ((a.customProperties as Record<string, any>)?.lastActiveSessionAt as number) ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bTime = ((b.customProperties as Record<string, any>)?.lastActiveSessionAt as number) ?? 0;
      return aTime - bTime;
    })[0];

    if (leastActive) {
      await ctx.db.patch(leastActive._id, {
        customProperties: {
          ...leastActive.customProperties,
          lastActiveSessionAt: now,
        },
      });
      return leastActive._id;
    }

    // Should never reach here if template exists, but just in case
    throw new Error("No workers available and cannot spawn new ones");
  },
});

// ============================================================================
// WORKER ACTIVITY TRACKING
// ============================================================================

/**
 * Update a worker's last active timestamp.
 * Called by processInboundMessage to keep workers from being archived.
 */
export const touchWorker = internalMutation({
  args: {
    workerId: v.id("objects"),
  },
  handler: async (ctx, { workerId }) => {
    const worker = await ctx.db.get(workerId);
    if (!worker) return;

    await ctx.db.patch(workerId, {
      customProperties: {
        ...worker.customProperties,
        lastActiveSessionAt: Date.now(),
      },
    });
  },
});

// ============================================================================
// WORKER ARCHIVAL
// ============================================================================

/**
 * Archive idle workers that haven't been active for WORKER_IDLE_TIMEOUT_MS.
 * Always keeps at least 1 worker active.
 * Called by a cron job every 15 minutes.
 */
export const archiveIdleWorkers = internalMutation({
  handler: async (ctx) => {
    // Get platform org ID
    const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
    if (!id) {
      console.log("[WorkerPool] No PLATFORM_ORG_ID set — skipping archival");
      return;
    }
    const platformOrgId = id as Id<"organizations">;

    // Get all active workers
    const allAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .collect();

    const workers = allAgents.filter((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = a.customProperties as Record<string, any> | undefined;
      return a.status === "active" && props?.templateAgentId !== undefined;
    });

    if (workers.length <= 1) {
      // Always keep at least 1 worker active
      return;
    }

    const now = Date.now();
    let archivedCount = 0;

    // Sort by most recent activity first — skip the most-recently-active worker
    const sortedByActivity = [...workers].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aTime = ((a.customProperties as Record<string, any>)?.lastActiveSessionAt as number) ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bTime = ((b.customProperties as Record<string, any>)?.lastActiveSessionAt as number) ?? 0;
      return bTime - aTime;
    });

    // Start from index 1 (skip the most recently active worker)
    for (let i = 1; i < sortedByActivity.length; i++) {
      const worker = sortedByActivity[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = worker.customProperties as Record<string, any>;
      const lastActive = (props?.lastActiveSessionAt as number) ?? 0;

      if (now - lastActive > WORKER_IDLE_TIMEOUT_MS) {
        await ctx.db.patch(worker._id, {
          status: "archived",
          customProperties: {
            ...props,
            status: "archived",
          },
          updatedAt: now,
        });
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      console.log(`[WorkerPool] Archived ${archivedCount} idle Quinn worker(s)`);
    }
  },
});
