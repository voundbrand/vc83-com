/**
 * WORKER POOL — System Bot Scaling + Managed Use-Case Clones
 *
 * Keeps Quinn onboarding worker behavior stable while adding a controlled
 * template-clone factory for org/user specific use cases.
 */

import { internalMutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { DURATION_MS } from "../lib/constants";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SYSTEM_WORKERS = 10;
const WORKER_IDLE_TIMEOUT_MS = DURATION_MS.ONE_HOUR; // 60 minutes
const WORKER_BUSY_THRESHOLD_MS = 30_000; // 30 seconds — worker is "busy" if active within this window

const USE_CASE_CLONE_LIFECYCLE = "managed_use_case_clone_v1";
const DEFAULT_CLONE_LIMITS = {
  maxClonesPerOrg: 12,
  maxClonesPerTemplatePerOrg: 4,
  maxClonesPerOwner: 3,
};

type AgentLikeRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  subtype?: string;
  name: string;
  description?: string;
  status: string;
  customProperties?: unknown;
  createdAt: number;
  updatedAt: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNonNegativeLimit(
  value: unknown,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  if (value === -1) {
    return -1;
  }
  if (value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeAllowedPlaybooks(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => entry.toLowerCase());
  return normalized.length > 0 ? Array.from(new Set(normalized)) : null;
}

export interface TemplateClonePolicy {
  spawnEnabled: boolean;
  maxClonesPerOrg: number;
  maxClonesPerTemplatePerOrg: number;
  maxClonesPerOwner: number;
  allowedPlaybooks: string[] | null;
}

export function resolveTemplateClonePolicy(
  customProperties: Record<string, unknown> | undefined
): TemplateClonePolicy {
  const clonePolicy = asRecord(customProperties?.clonePolicy);
  const spawnEnabled = clonePolicy.spawnEnabled !== false;

  return {
    spawnEnabled,
    maxClonesPerOrg: normalizeNonNegativeLimit(
      clonePolicy.maxClonesPerOrg,
      DEFAULT_CLONE_LIMITS.maxClonesPerOrg
    ),
    maxClonesPerTemplatePerOrg: normalizeNonNegativeLimit(
      clonePolicy.maxClonesPerTemplatePerOrg,
      DEFAULT_CLONE_LIMITS.maxClonesPerTemplatePerOrg
    ),
    maxClonesPerOwner: normalizeNonNegativeLimit(
      clonePolicy.maxClonesPerOwner,
      DEFAULT_CLONE_LIMITS.maxClonesPerOwner
    ),
    allowedPlaybooks: normalizeAllowedPlaybooks(clonePolicy.allowedPlaybooks),
  };
}

export function normalizeUseCaseKey(useCase: string): string {
  const normalized = useCase.trim().toLowerCase();
  if (!normalized) {
    return "default";
  }
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return slug.length > 0 ? slug : "default";
}

export function normalizeUseCaseLabel(useCase: string): string {
  const normalized = useCase.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "General";
  }
  return normalized.slice(0, 80);
}

export function buildUseCaseCloneName(args: {
  templateName: string;
  useCaseLabel: string;
  cloneNumber: number;
}): string {
  const base = args.templateName.trim().length > 0 ? args.templateName.trim() : "Template Agent";
  const useCaseLabel = args.useCaseLabel.trim().length > 0 ? args.useCaseLabel.trim() : "General";
  return `${base} - ${useCaseLabel} #${Math.max(1, args.cloneNumber)}`;
}

function readTemplateRole(customProperties: Record<string, unknown> | undefined): string | null {
  return normalizeOptionalString(customProperties?.templateRole);
}

function isProtectedTemplateAgent(agent: AgentLikeRecord): boolean {
  const props = asRecord(agent.customProperties);
  return agent.status === "template" && props.protected === true;
}

function selectOnboardingTemplateAgent(agents: AgentLikeRecord[]): AgentLikeRecord | null {
  const templates = agents.filter((agent) => isProtectedTemplateAgent(agent));

  const explicitTemplate = templates.find((template) => {
    const props = asRecord(template.customProperties);
    return readTemplateRole(props) === "platform_system_bot_template";
  });
  if (explicitTemplate) {
    return explicitTemplate;
  }

  const legacyQuinnTemplate = templates.find(
    (template) => template.name.trim().toLowerCase() === "quinn"
  );
  if (legacyQuinnTemplate) {
    return legacyQuinnTemplate;
  }

  return templates[0] ?? null;
}

function readTemplateAgentId(customProperties: Record<string, unknown>): string | null {
  return normalizeOptionalString(customProperties.templateAgentId);
}

function isManagedUseCaseClone(agent: AgentLikeRecord): boolean {
  const props = asRecord(agent.customProperties);
  if (agent.status !== "active" && agent.status !== "draft") {
    return false;
  }
  return (
    readTemplateAgentId(props) !== null &&
    normalizeOptionalString(props.cloneLifecycle) === USE_CASE_CLONE_LIFECYCLE
  );
}

function ensureWithinLimit(args: {
  limit: number;
  currentCount: number;
  label: string;
}) {
  if (args.limit === -1) {
    return;
  }
  if (args.currentCount >= args.limit) {
    throw new Error(
      `Use-case clone quota exceeded for ${args.label} (${args.currentCount}/${args.limit}).`
    );
  }
}

async function isOrgMemberOrSuperAdmin(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
): Promise<boolean> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (membership) {
    return true;
  }

  const user = await ctx.db.get(userId);
  if (!user?.global_role_id) {
    return false;
  }
  const role = await ctx.db.get(user.global_role_id);
  return Boolean(role && role.name === "super_admin" && role.isActive !== false);
}

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
    // 1. Find the onboarding template agent
    const allAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .collect() as AgentLikeRecord[];

    const template = selectOnboardingTemplateAgent(allAgents);

    if (!template) {
      throw new Error("Quinn template not found — run seedPlatformAgents first");
    }

    // 2. Get all active workers cloned from this template
    const workers = allAgents.filter((agent) => {
      const props = asRecord(agent.customProperties);
      return (
        agent.status === "active" &&
        readTemplateAgentId(props) === String(template._id)
      );
    });

    const now = Date.now();

    // 3. Find an idle worker (not used in the last 30s)
    const idleWorker = workers.find((worker) => {
      const props = asRecord(worker.customProperties);
      const lastActive = (typeof props.lastActiveSessionAt === "number"
        ? props.lastActiveSessionAt
        : 0);
      return (now - lastActive) > WORKER_BUSY_THRESHOLD_MS;
    });

    if (idleWorker) {
      const idleProps = asRecord(idleWorker.customProperties);
      await ctx.db.patch(idleWorker._id, {
        customProperties: {
          ...idleProps,
          lastActiveSessionAt: now,
        },
        updatedAt: now,
      });
      return idleWorker._id;
    }

    // 4. Spawn new worker if under limit
    if (workers.length < MAX_SYSTEM_WORKERS) {
      const templateProps = asRecord(template.customProperties);
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
          displayName: `Quinn Worker ${workerNumber}`,
          status: "active",
          protected: true,
          templateAgentId: template._id,
          workerPoolRole: "onboarding_worker",
          lastActiveSessionAt: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("objectActions", {
        organizationId: platformOrgId,
        objectId: workerId,
        actionType: "worker_spawned",
        actionData: {
          templateAgentId: template._id,
          workerNumber,
          source: "getOnboardingWorker",
        },
        performedAt: now,
      });

      console.log(`[WorkerPool] Spawned Quinn Worker ${workerNumber}: ${workerId}`);
      return workerId;
    }

    // 5. All workers busy — reuse the least-recently-active one
    const leastActive = [...workers].sort((a, b) => {
      const aProps = asRecord(a.customProperties);
      const bProps = asRecord(b.customProperties);
      const aTime = typeof aProps.lastActiveSessionAt === "number" ? aProps.lastActiveSessionAt : 0;
      const bTime = typeof bProps.lastActiveSessionAt === "number" ? bProps.lastActiveSessionAt : 0;
      return aTime - bTime;
    })[0];

    if (leastActive) {
      const leastActiveProps = asRecord(leastActive.customProperties);
      await ctx.db.patch(leastActive._id, {
        customProperties: {
          ...leastActiveProps,
          lastActiveSessionAt: now,
        },
        updatedAt: now,
      });
      return leastActive._id;
    }

    throw new Error("No workers available and cannot spawn new ones");
  },
});

/**
 * Spawn or reuse a managed use-case clone from a protected template.
 * This is the single managed clone lifecycle path for lane-D use-case spawns.
 */
export const spawnUseCaseAgent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    templateAgentId: v.id("objects"),
    ownerUserId: v.id("users"),
    requestedByUserId: v.optional(v.id("users")),
    useCase: v.string(),
    playbook: v.optional(v.string()),
    spawnReason: v.optional(v.string()),
    preferredCloneName: v.optional(v.string()),
    reuseExisting: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const template = await ctx.db.get(args.templateAgentId) as AgentLikeRecord | null;
    if (!template || template.type !== "org_agent") {
      throw new Error("Template agent not found.");
    }
    if (!isProtectedTemplateAgent(template)) {
      throw new Error("Only protected template agents can spawn managed use-case clones.");
    }

    const templateProps = asRecord(template.customProperties);
    if (readTemplateRole(templateProps) === "platform_system_bot_template") {
      throw new Error("Quinn onboarding template cannot be used for use-case clone spawning.");
    }

    const templateScope = normalizeOptionalString(templateProps.templateScope);
    const isCrossOrgTemplate = template.organizationId !== args.organizationId;
    if (isCrossOrgTemplate && templateScope !== "platform") {
      throw new Error("Template inheritance blocked: only platform-scoped templates can spawn cross-org clones.");
    }

    const clonePolicy = resolveTemplateClonePolicy(templateProps);
    if (!clonePolicy.spawnEnabled) {
      throw new Error("Template clone spawning is disabled by template policy.");
    }

    if (!(await isOrgMemberOrSuperAdmin(ctx, args.organizationId, args.ownerUserId))) {
      throw new Error("Clone owner must be an active organization member.");
    }

    const requestedByUserId = args.requestedByUserId ?? args.ownerUserId;
    if (!(await isOrgMemberOrSuperAdmin(ctx, args.organizationId, requestedByUserId))) {
      throw new Error("Requester must be an active organization member.");
    }

    const normalizedPlaybook = normalizeOptionalString(args.playbook)?.toLowerCase() ?? null;
    if (normalizedPlaybook && clonePolicy.allowedPlaybooks && !clonePolicy.allowedPlaybooks.includes(normalizedPlaybook)) {
      throw new Error(
        `Template clone policy blocks playbook "${normalizedPlaybook}". Allowed: ${clonePolicy.allowedPlaybooks.join(", ")}.`
      );
    }

    const useCaseLabel = normalizeUseCaseLabel(args.useCase);
    const useCaseKey = normalizeUseCaseKey(args.useCase);

    const allOrgAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect() as AgentLikeRecord[];

    const templateClonesForOrg = allOrgAgents.filter((agent) => {
      if (!isManagedUseCaseClone(agent)) {
        return false;
      }
      const props = asRecord(agent.customProperties);
      return readTemplateAgentId(props) === String(template._id);
    });

    const matchingClone = templateClonesForOrg
      .filter((agent) => {
        const props = asRecord(agent.customProperties);
        return (
          normalizeOptionalString(props.ownerUserId) === String(args.ownerUserId) &&
          normalizeOptionalString(props.useCaseKey) === useCaseKey
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    const reuseExisting = args.reuseExisting !== false;
    if (reuseExisting && matchingClone) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: matchingClone._id,
        actionType: "clone_reused",
        actionData: {
          templateAgentId: template._id,
          ownerUserId: args.ownerUserId,
          requestedByUserId,
          useCase: useCaseLabel,
          useCaseKey,
          spawnReason: normalizeOptionalString(args.spawnReason) || "spawn_use_case_agent",
          playbook: normalizedPlaybook ?? normalizeOptionalString(templateProps.templatePlaybook),
        },
        performedBy: requestedByUserId,
        performedAt: now,
      });

      return {
        cloneAgentId: matchingClone._id,
        reused: true,
        created: false,
        useCase: useCaseLabel,
        useCaseKey,
        quota: {
          orgUsed: allOrgAgents.filter((agent) => isManagedUseCaseClone(agent)).length,
          templateUsed: templateClonesForOrg.length,
          ownerUsed: allOrgAgents.filter((agent) => {
            if (!isManagedUseCaseClone(agent)) {
              return false;
            }
            const props = asRecord(agent.customProperties);
            return normalizeOptionalString(props.ownerUserId) === String(args.ownerUserId);
          }).length,
          limits: clonePolicy,
        },
      };
    }

    const managedUseCaseClones = allOrgAgents.filter((agent) => isManagedUseCaseClone(agent));
    const ownerUseCaseClones = managedUseCaseClones.filter((agent) => {
      const props = asRecord(agent.customProperties);
      return normalizeOptionalString(props.ownerUserId) === String(args.ownerUserId);
    });

    ensureWithinLimit({
      limit: clonePolicy.maxClonesPerOrg,
      currentCount: managedUseCaseClones.length,
      label: "organization",
    });
    ensureWithinLimit({
      limit: clonePolicy.maxClonesPerTemplatePerOrg,
      currentCount: templateClonesForOrg.length,
      label: "template-per-organization",
    });
    ensureWithinLimit({
      limit: clonePolicy.maxClonesPerOwner,
      currentCount: ownerUseCaseClones.length,
      label: "owner",
    });

    const preferredCloneName = normalizeOptionalString(args.preferredCloneName);
    const cloneName = preferredCloneName || buildUseCaseCloneName({
      templateName: template.name,
      useCaseLabel,
      cloneNumber: templateClonesForOrg.length + 1,
    });
    const templateDisplayName = normalizeOptionalString(templateProps.displayName) || template.name;
    const clonePlaybook = normalizedPlaybook || normalizeOptionalString(templateProps.templatePlaybook);

    const cloneId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "org_agent",
      subtype: template.subtype,
      name: cloneName,
      description:
        normalizeOptionalString(template.description) ||
        `Use-case clone of ${templateDisplayName} (${useCaseLabel})`,
      status: "active",
      customProperties: {
        ...templateProps,
        displayName: preferredCloneName || `${templateDisplayName} (${useCaseLabel})`,
        protected: false,
        status: "active",
        templateAgentId: template._id,
        templateSourceOrgId: template.organizationId,
        cloneLifecycle: USE_CASE_CLONE_LIFECYCLE,
        ownerUserId: args.ownerUserId,
        requestedByUserId,
        spawnReason: normalizeOptionalString(args.spawnReason) || "spawn_use_case_agent",
        useCase: useCaseLabel,
        useCaseKey,
        playbook: clonePlaybook ?? undefined,
        workerPoolRole: "use_case_clone",
        spawnedAt: now,
        lastActiveSessionAt: now,
        totalMessages: 0,
        totalCostUsd: 0,
        clonePolicy: {
          ...asRecord(templateProps.clonePolicy),
          spawnEnabled: clonePolicy.spawnEnabled,
          maxClonesPerOrg: clonePolicy.maxClonesPerOrg,
          maxClonesPerTemplatePerOrg: clonePolicy.maxClonesPerTemplatePerOrg,
          maxClonesPerOwner: clonePolicy.maxClonesPerOwner,
          allowedPlaybooks: clonePolicy.allowedPlaybooks,
        },
        spawnMetadata: asRecord(args.metadata),
      },
      createdBy: requestedByUserId,
      createdAt: now,
      updatedAt: now,
    });

    const auditPayload = {
      templateAgentId: template._id,
      templateName: template.name,
      cloneAgentId: cloneId,
      ownerUserId: args.ownerUserId,
      requestedByUserId,
      useCase: useCaseLabel,
      useCaseKey,
      playbook: clonePlaybook,
      spawnReason: normalizeOptionalString(args.spawnReason) || "spawn_use_case_agent",
      lifecycle: USE_CASE_CLONE_LIFECYCLE,
    };

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: cloneId,
      actionType: "clone_spawned",
      actionData: auditPayload,
      performedBy: requestedByUserId,
      performedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: template._id,
      actionType: "template_clone_spawned",
      actionData: auditPayload,
      performedBy: requestedByUserId,
      performedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: requestedByUserId,
      action: "spawn_use_case_agent",
      resource: "org_agent",
      resourceId: String(cloneId),
      success: true,
      metadata: auditPayload,
      createdAt: now,
    });

    return {
      cloneAgentId: cloneId,
      reused: false,
      created: true,
      useCase: useCaseLabel,
      useCaseKey,
      quota: {
        orgUsed: managedUseCaseClones.length + 1,
        templateUsed: templateClonesForOrg.length + 1,
        ownerUsed: ownerUseCaseClones.length + 1,
        limits: clonePolicy,
      },
    };
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
    if (!worker) {
      return;
    }

    await ctx.db.patch(workerId, {
      customProperties: {
        ...worker.customProperties,
        lastActiveSessionAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// WORKER ARCHIVAL
// ============================================================================

/**
 * Archive idle Quinn onboarding workers that haven't been active for
 * WORKER_IDLE_TIMEOUT_MS. Always keeps at least 1 worker active.
 * Called by a cron job every 15 minutes.
 */
export const archiveIdleWorkers = internalMutation({
  handler: async (ctx) => {
    const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
    if (!id) {
      console.log("[WorkerPool] No PLATFORM_ORG_ID set — skipping archival");
      return;
    }
    const platformOrgId = id as Id<"organizations">;

    const allAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .collect() as AgentLikeRecord[];

    const onboardingTemplate = selectOnboardingTemplateAgent(allAgents);
    if (!onboardingTemplate) {
      return;
    }

    const workers = allAgents.filter((agent) => {
      const props = asRecord(agent.customProperties);
      return (
        agent.status === "active" &&
        readTemplateAgentId(props) === String(onboardingTemplate._id)
      );
    });

    if (workers.length <= 1) {
      return;
    }

    const now = Date.now();
    let archivedCount = 0;

    const sortedByActivity = [...workers].sort((a, b) => {
      const aProps = asRecord(a.customProperties);
      const bProps = asRecord(b.customProperties);
      const aTime = typeof aProps.lastActiveSessionAt === "number" ? aProps.lastActiveSessionAt : 0;
      const bTime = typeof bProps.lastActiveSessionAt === "number" ? bProps.lastActiveSessionAt : 0;
      return bTime - aTime;
    });

    for (let i = 1; i < sortedByActivity.length; i += 1) {
      const worker = sortedByActivity[i];
      const props = asRecord(worker.customProperties);
      const lastActive = typeof props.lastActiveSessionAt === "number" ? props.lastActiveSessionAt : 0;

      if (now - lastActive > WORKER_IDLE_TIMEOUT_MS) {
        await ctx.db.patch(worker._id, {
          status: "archived",
          customProperties: {
            ...props,
            status: "archived",
          },
          updatedAt: now,
        });
        archivedCount += 1;
      }
    }

    if (archivedCount > 0) {
      console.log(`[WorkerPool] Archived ${archivedCount} idle Quinn worker(s)`);
    }
  },
});
