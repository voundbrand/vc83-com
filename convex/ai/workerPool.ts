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
import { ensureTemplateVersionCertificationForLifecycle } from "./agentCatalogAdmin";
import { evaluateTemplateOrgPreflight } from "../agentOntology";
import {
  MANAGED_USE_CASE_CLONE_LIFECYCLE,
  buildManagedTemplateCloneLinkage,
  isManagedUseCaseCloneProperties,
  readTemplateCloneLinkageContract,
  resolveTemplateSourceId,
  resolveTemplateSourceVersion,
} from "./templateCloneLinkage";
import {
  hasPlatformMotherTemplateRole,
  matchesPlatformMotherIdentityName,
} from "../platformMother";
import {
  applyKanzleiPromptInputMinimization,
  resolveKanzleiPromptInputMinimizationContract,
  type KanzleiPromptInputMinimizationContract,
} from "./agentSpecRegistry";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SYSTEM_WORKERS = 10;
const WORKER_IDLE_TIMEOUT_MS = DURATION_MS.ONE_HOUR; // 60 minutes
const WORKER_BUSY_THRESHOLD_MS = 30_000; // 30 seconds — worker is "busy" if active within this window

const PRIMARY_AGENT_INELIGIBLE_STATUSES = new Set(["archived", "deleted", "template"]);
const DEFAULT_OPERATOR_CONTEXT_ID = "__org_default__";
const DEFAULT_CLONE_LIMITS = {
  maxClonesPerOrg: 12,
  maxClonesPerTemplatePerOrg: 4,
  maxClonesPerOwner: 3,
};
const DAVID_OGILVY_COPYWRITER_TEMPLATE_ROLE = "david_ogilvy_copywriter_template";

// Dynamic require to avoid TS2589 deep type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _generatedApiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGeneratedApi(): any {
  if (!_generatedApiCache) {
    _generatedApiCache = require("../_generated/api");
  }
  return _generatedApiCache;
}

type TemplateKnowledgeBaseImportResult = {
  status: "skipped" | "success" | "failed";
  templateRole: string | null;
  folderPath?: string;
  folderId?: string;
  createdCount?: number;
  updatedCount?: number;
  documentIds?: string[];
  message?: string;
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
  createdBy?: unknown;
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

function normalizeAgentClass(value: unknown): "internal_operator" | "external_customer_facing" {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "external_customer_facing") {
    return "external_customer_facing";
  }
  if (normalized === "customer_facing") {
    return "external_customer_facing";
  }
  return "internal_operator";
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

function normalizeDeterministicStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  ).sort((left, right) => left.localeCompare(right));
}

export interface SpawnMetadataPromptInputMinimizationAudit {
  contractVersion: string;
  mode: "need_to_know";
  retainedFields: string[];
  droppedFields: string[];
  droppedDeniedFields: string[];
  droppedFieldCount: number;
}

export interface SpawnMetadataNormalizationResult {
  spawnMetadata: Record<string, unknown>;
  promptInputMinimizationContract: KanzleiPromptInputMinimizationContract | null;
  promptInputMinimizationAudit: SpawnMetadataPromptInputMinimizationAudit | null;
}

function collectTemplatePromptInputPolicyTokens(
  templateProps: Record<string, unknown>,
): string[] {
  const deduped = new Set<string>();
  for (const token of [
    templateProps.orgPolicyRef,
    templateProps.policyMode,
    templateProps.complianceMode,
    templateProps.templateRole,
    templateProps.templatePlaybook,
    templateProps.templateLayer,
  ]) {
    const normalized = normalizeOptionalString(token);
    if (normalized) {
      deduped.add(normalized);
    }
  }
  for (const token of [
    ...normalizeDeterministicStringArray(templateProps.knowledgeBaseTags),
    ...normalizeDeterministicStringArray(templateProps.policyTags),
    ...normalizeDeterministicStringArray(templateProps.complianceTags),
  ]) {
    deduped.add(token);
  }
  return Array.from(deduped).sort((left, right) => left.localeCompare(right));
}

export function normalizeSpawnMetadataForPromptInputMinimization(args: {
  templateProps: Record<string, unknown>;
  metadata: unknown;
}): SpawnMetadataNormalizationResult {
  const spawnMetadata = asRecord(args.metadata);
  const promptInputMinimizationContract =
    resolveKanzleiPromptInputMinimizationContract({
      modeTokens: collectTemplatePromptInputPolicyTokens(args.templateProps),
      customProperties: args.templateProps,
    });

  if (!promptInputMinimizationContract) {
    return {
      spawnMetadata,
      promptInputMinimizationContract: null,
      promptInputMinimizationAudit: null,
    };
  }

  const minimization = applyKanzleiPromptInputMinimization(
    spawnMetadata.promptInput,
    promptInputMinimizationContract,
  );
  const promptInputMinimizationAudit: SpawnMetadataPromptInputMinimizationAudit = {
    contractVersion: promptInputMinimizationContract.contractVersion,
    mode: promptInputMinimizationContract.mode,
    retainedFields: minimization.retainedFields,
    droppedFields: minimization.droppedFields,
    droppedDeniedFields: minimization.droppedDeniedFields,
    droppedFieldCount: minimization.droppedFields.length,
  };

  return {
    spawnMetadata: {
      ...spawnMetadata,
      promptInput: minimization.minimizedPayload,
      promptInputMinimization: promptInputMinimizationAudit,
    },
    promptInputMinimizationContract,
    promptInputMinimizationAudit,
  };
}

function arraysAreEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
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

async function maybeEnsureTemplateKnowledgeBase(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  cloneAgentId: Id<"objects">;
  templateProps: Record<string, unknown>;
  requestedByUserId: Id<"users">;
  timestamp: number;
}): Promise<TemplateKnowledgeBaseImportResult> {
  const templateRole = readTemplateRole(args.templateProps);
  if (templateRole !== DAVID_OGILVY_COPYWRITER_TEMPLATE_ROLE) {
    return {
      status: "skipped",
      templateRole,
    };
  }

  try {
    const generatedApi = getGeneratedApi();
    const importResult = await args.ctx.runMutation(
      generatedApi.internal.onboarding.seedPlatformAgents.ensureDavidOgilvyKnowledgeBaseForOrganizationInternal,
      {
        organizationId: args.organizationId,
        performedBy: args.requestedByUserId,
        source: "workerPool.spawnUseCaseAgent",
      },
    );

    await args.ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.cloneAgentId,
      actionType: "template_clone_kb_imported",
      actionData: {
        templateRole,
        ...importResult,
      },
      performedBy: args.requestedByUserId,
      performedAt: args.timestamp,
    });

    return {
      status: "success",
      templateRole,
      ...(importResult as {
        folderPath: string;
        folderId: string;
        createdCount: number;
        updatedCount: number;
        documentIds: string[];
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "knowledge_base_import_failed";
    await args.ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.cloneAgentId,
      actionType: "template_clone_kb_import_failed",
      actionData: {
        templateRole,
        message,
      },
      performedBy: args.requestedByUserId,
      performedAt: args.timestamp,
    });
    console.error("[workerPool] template knowledge base import failed", {
      organizationId: args.organizationId,
      cloneAgentId: args.cloneAgentId,
      templateRole,
      message,
    });
    return {
      status: "failed",
      templateRole,
      message,
    };
  }
}

function isProtectedTemplateAgent(agent: AgentLikeRecord): boolean {
  const props = asRecord(agent.customProperties);
  return agent.status === "template" && props.protected === true;
}

async function writeWaeSpawnBlockedAudit(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  template: AgentLikeRecord;
  templateVersionId?: string | null;
  templateVersionTag?: string | null;
  requestedByUserId: Id<"users">;
  ownerUserId: Id<"users">;
  reasonCode: string;
  message: string;
  gate: unknown;
  orgPreflight?: unknown;
  useCase: string;
  timestamp: number;
}) {
  const payload = {
    templateAgentId: args.template._id,
    templateVersionId: args.templateVersionId ?? null,
    templateVersionTag: args.templateVersionTag ?? null,
    requestedByUserId: args.requestedByUserId,
    ownerUserId: args.ownerUserId,
    reasonCode: args.reasonCode,
    message: args.message,
    gate: args.gate,
    orgPreflight: args.orgPreflight ?? null,
    useCase: args.useCase,
    timestamp: args.timestamp,
  };

  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.template._id,
    actionType: "template_clone_spawn_blocked_wae_gate",
    actionData: payload,
    performedBy: args.requestedByUserId,
    performedAt: args.timestamp,
  });

  await args.ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId: args.requestedByUserId,
    action: "template_clone_spawn_blocked_wae_gate",
    resource: "org_agent",
    resourceId: String(args.template._id),
    success: false,
    metadata: payload,
    createdAt: args.timestamp,
  });
}

function selectOnboardingTemplateAgent(agents: AgentLikeRecord[]): AgentLikeRecord | null {
  const templates = agents.filter((agent) => isProtectedTemplateAgent(agent));

  const explicitTemplate = templates.find((template) => {
    const props = asRecord(template.customProperties);
    return hasPlatformMotherTemplateRole(props);
  });
  if (explicitTemplate) {
    return explicitTemplate;
  }

  const legacyQuinnTemplate = templates.find(
    (template) => matchesPlatformMotherIdentityName(template.name, asRecord(template.customProperties))
  );
  if (legacyQuinnTemplate) {
    return legacyQuinnTemplate;
  }

  return templates[0] ?? null;
}

function readTemplateAgentId(customProperties: Record<string, unknown>): string | null {
  return resolveTemplateSourceId(customProperties) ?? null;
}

function isManagedUseCaseClone(agent: AgentLikeRecord): boolean {
  const props = asRecord(agent.customProperties);
  if (agent.status !== "active" && agent.status !== "draft") {
    return false;
  }
  return readTemplateAgentId(props) !== null && isManagedUseCaseCloneProperties(props);
}

function resolveOperatorContextId(agent: AgentLikeRecord): string {
  const props = asRecord(agent.customProperties);
  return (
    normalizeOptionalString(props.operatorId)
    || normalizeOptionalString(props.ownerUserId)
    || normalizeOptionalString(agent.createdBy)
    || DEFAULT_OPERATOR_CONTEXT_ID
  );
}

function isPrimaryFlagged(agent: AgentLikeRecord): boolean {
  const props = asRecord(agent.customProperties);
  return props.isPrimary === true;
}

function isViablePrimaryCandidate(agent: AgentLikeRecord): boolean {
  if (agent.type !== "org_agent") {
    return false;
  }

  const normalizedStatus = normalizeOptionalString(agent.status)?.toLowerCase();
  if (!normalizedStatus) {
    return true;
  }

  return !PRIMARY_AGENT_INELIGIBLE_STATUSES.has(normalizedStatus);
}

export function hasPrimaryForOperator(
  agents: AgentLikeRecord[],
  operatorId: string
): boolean {
  return agents.some((agent) =>
    isViablePrimaryCandidate(agent)
    && resolveOperatorContextId(agent) === operatorId
    && isPrimaryFlagged(agent)
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
      throw new Error("Platform onboarding template not found — run seedPlatformAgents first");
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
          agentClass: normalizeAgentClass(templateProps.agentClass),
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
    requiredTools: v.optional(v.array(v.string())),
    requiredCapabilities: v.optional(v.array(v.string())),
    contractSourceCatalogAgentNumber: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ownerOperatorId = String(args.ownerUserId);

    const template = await ctx.db.get(args.templateAgentId) as AgentLikeRecord | null;
    if (!template || template.type !== "org_agent") {
      throw new Error("Template agent not found.");
    }
    if (!isProtectedTemplateAgent(template)) {
      throw new Error("Only protected template agents can spawn managed use-case clones.");
    }

    const templateProps = asRecord(template.customProperties);
    const spawnMetadataNormalization = normalizeSpawnMetadataForPromptInputMinimization({
      templateProps,
      metadata: args.metadata,
    });
    const spawnMetadata = spawnMetadataNormalization.spawnMetadata;
    const promptInputMinimizationContract =
      spawnMetadataNormalization.promptInputMinimizationContract;
    const promptInputMinimizationAudit =
      spawnMetadataNormalization.promptInputMinimizationAudit;
    const templateSourceVersion = resolveTemplateSourceVersion(
      template._id,
      templateProps,
      template.updatedAt
    );
    const metadataRecord = spawnMetadata;
    const lastTemplateSyncJobId =
      normalizeOptionalString(metadataRecord.templateJobId) ||
      normalizeOptionalString(metadataRecord.lastTemplateJobId) ||
      normalizeOptionalString(metadataRecord.distributionJobId) ||
      normalizeOptionalString(metadataRecord.jobId) ||
      undefined;
    const templateCloneLinkage = buildManagedTemplateCloneLinkage({
      sourceTemplateId: String(template._id),
      sourceTemplateVersion: templateSourceVersion,
      lastTemplateSyncAt: now,
      lastTemplateSyncJobId,
    });
    if (hasPlatformMotherTemplateRole(templateProps)) {
      throw new Error("Platform onboarding template cannot be used for use-case clone spawning.");
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

    const publishedTemplateVersionId =
      normalizeOptionalString(templateProps.templatePublishedVersionId) || null;
    const publishedTemplateVersion = publishedTemplateVersionId
      ? await ctx.db.get(publishedTemplateVersionId as Id<"objects">)
      : null;
    const publishedTemplateVersionProps = asRecord(publishedTemplateVersion?.customProperties);
    const publishedTemplateBaseline = asRecord(
      asRecord(publishedTemplateVersionProps.snapshot).baselineCustomProperties,
    );
    const certificationEvaluation = publishedTemplateVersionId
      ? await ensureTemplateVersionCertificationForLifecycle(ctx, {
          templateId: template._id,
          templateVersionId: publishedTemplateVersionId as Id<"objects">,
          templateVersionTag: templateSourceVersion,
          recordedByUserId: requestedByUserId,
        })
      : {
          allowed: false,
          reasonCode: "certification_missing",
          message: "Template certification is missing for this protected template version.",
          certification: null,
        };
    if (!certificationEvaluation.allowed) {
      await writeWaeSpawnBlockedAudit({
        ctx,
        organizationId: args.organizationId,
        template,
        templateVersionId: publishedTemplateVersionId,
        templateVersionTag: templateSourceVersion,
        requestedByUserId,
        ownerUserId: args.ownerUserId,
        reasonCode: certificationEvaluation.reasonCode ?? "certification_invalid",
        message:
          certificationEvaluation.message
          || "Template certification blocked managed clone spawning.",
        gate: certificationEvaluation.certification,
        useCase: args.useCase,
        timestamp: now,
      });
      throw new Error(
        certificationEvaluation.message
        || "Template certification blocked managed clone spawning.",
      );
    }

    const orgPreflight = await evaluateTemplateOrgPreflight(ctx, {
      organizationId: args.organizationId,
      templateBaseline:
        Object.keys(publishedTemplateBaseline).length > 0
          ? publishedTemplateBaseline
          : templateProps,
    });
    if (orgPreflight.status === "fail") {
      await writeWaeSpawnBlockedAudit({
        ctx,
        organizationId: args.organizationId,
        template,
        templateVersionId: publishedTemplateVersionId,
        templateVersionTag: templateSourceVersion,
        requestedByUserId,
        ownerUserId: args.ownerUserId,
        reasonCode: "org_preflight_failed",
        message: orgPreflight.blockers[0] || "Organization preflight blocked managed clone spawning.",
        gate: certificationEvaluation.certification,
        orgPreflight,
        useCase: args.useCase,
        timestamp: now,
      });
      throw new Error(
        orgPreflight.blockers[0] || "Organization preflight blocked managed clone spawning.",
      );
    }

    const normalizedPlaybook = normalizeOptionalString(args.playbook)?.toLowerCase() ?? null;
    if (normalizedPlaybook && clonePolicy.allowedPlaybooks && !clonePolicy.allowedPlaybooks.includes(normalizedPlaybook)) {
      throw new Error(
        `Template clone policy blocks playbook "${normalizedPlaybook}". Allowed: ${clonePolicy.allowedPlaybooks.join(", ")}.`
      );
    }

    const useCaseLabel = normalizeUseCaseLabel(args.useCase);
    const useCaseKey = normalizeUseCaseKey(args.useCase);
    const templateRequiredTools = normalizeDeterministicStringArray(templateProps.requiredTools);
    const templateRequiredCapabilities = normalizeDeterministicStringArray(
      templateProps.requiredCapabilities
    );
    const requestedRequiredTools = normalizeDeterministicStringArray(args.requiredTools);
    const requestedRequiredCapabilities = normalizeDeterministicStringArray(
      args.requiredCapabilities
    );
    const requiredTools =
      requestedRequiredTools.length > 0 ? requestedRequiredTools : templateRequiredTools;
    const requiredCapabilities =
      requestedRequiredCapabilities.length > 0
        ? requestedRequiredCapabilities
        : templateRequiredCapabilities;
    const specialistContract = {
      contractVersion: "curated_specialist_scope_requirements_v1",
      requiredTools,
      requiredCapabilities,
      sourceCatalogAgentNumber:
        typeof args.contractSourceCatalogAgentNumber === "number"
          ? Math.floor(args.contractSourceCatalogAgentNumber)
          : undefined,
    };

    const allOrgAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect() as AgentLikeRecord[];
    const ownerHadPrimaryBeforeSpawn = hasPrimaryForOperator(
      allOrgAgents,
      ownerOperatorId
    );

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
      const matchingCloneProps = asRecord(matchingClone.customProperties);
      const existingTemplateLinkage =
        readTemplateCloneLinkageContract(matchingCloneProps);
      const currentRequiredTools = normalizeDeterministicStringArray(matchingCloneProps.requiredTools);
      const currentRequiredCapabilities = normalizeDeterministicStringArray(
        matchingCloneProps.requiredCapabilities
      );
      const requiresContractUpdate =
        !arraysAreEqual(currentRequiredTools, requiredTools)
        || !arraysAreEqual(currentRequiredCapabilities, requiredCapabilities);
      await ctx.db.patch(matchingClone._id, {
        customProperties: {
          ...matchingCloneProps,
          agentClass: normalizeAgentClass(matchingCloneProps.agentClass),
          operatorId: ownerOperatorId,
          isPrimary: !ownerHadPrimaryBeforeSpawn ? true : matchingCloneProps.isPrimary === true,
          requiredTools,
          requiredCapabilities,
          specialistScopeContract: specialistContract,
          templateAgentId: template._id,
          templateVersion: templateSourceVersion,
          cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
          overridePolicy: existingTemplateLinkage?.overridePolicy ?? templateCloneLinkage.overridePolicy,
          lastTemplateSyncAt: now,
          lastTemplateJobId: lastTemplateSyncJobId,
          templateCloneLinkage: buildManagedTemplateCloneLinkage({
            sourceTemplateId: String(template._id),
            sourceTemplateVersion: templateSourceVersion,
            overridePolicy: existingTemplateLinkage?.overridePolicy,
            lastTemplateSyncAt: now,
            lastTemplateSyncJobId,
            cloneLifecycleState: existingTemplateLinkage?.cloneLifecycleState,
          }),
          ...(promptInputMinimizationContract
            ? { promptInputMinimization: promptInputMinimizationContract }
            : {}),
          spawnMetadata,
        },
        updatedAt: now,
      });

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
          operatorId: ownerOperatorId,
          promotedToPrimary: !ownerHadPrimaryBeforeSpawn,
          templateVersion: templateSourceVersion,
          templateCloneLinkage,
          requiredTools,
          requiredCapabilities,
          specialistScopeContract: specialistContract,
          linkageRefreshReason: requiresContractUpdate
            ? "required_capability_drift"
            : "spawn_reuse",
          ...(promptInputMinimizationAudit
            ? { promptInputMinimization: promptInputMinimizationAudit }
            : {}),
        },
        performedBy: requestedByUserId,
        performedAt: now,
      });

      const knowledgeBaseImport = await maybeEnsureTemplateKnowledgeBase({
        ctx,
        organizationId: args.organizationId,
        cloneAgentId: matchingClone._id,
        templateProps,
        requestedByUserId,
        timestamp: now,
      });

      return {
        cloneAgentId: matchingClone._id,
        reused: true,
        created: false,
        useCase: useCaseLabel,
        useCaseKey,
        ...(knowledgeBaseImport.status === "skipped"
          ? {}
          : { knowledgeBaseImport }),
        ...(promptInputMinimizationAudit
          ? { promptInputMinimization: promptInputMinimizationAudit }
          : {}),
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
        agentClass: normalizeAgentClass(templateProps.agentClass),
        displayName: preferredCloneName || `${templateDisplayName} (${useCaseLabel})`,
        protected: false,
        status: "active",
        templateAgentId: template._id,
        templateVersion: templateSourceVersion,
        templateSourceOrgId: template.organizationId,
        cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
        overridePolicy: templateCloneLinkage.overridePolicy,
        lastTemplateSyncAt: now,
        lastTemplateJobId: lastTemplateSyncJobId,
        templateCloneLinkage,
        ownerUserId: args.ownerUserId,
        operatorId: ownerOperatorId,
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
        isPrimary: !ownerHadPrimaryBeforeSpawn,
        clonePolicy: {
          ...asRecord(templateProps.clonePolicy),
          spawnEnabled: clonePolicy.spawnEnabled,
          maxClonesPerOrg: clonePolicy.maxClonesPerOrg,
          maxClonesPerTemplatePerOrg: clonePolicy.maxClonesPerTemplatePerOrg,
          maxClonesPerOwner: clonePolicy.maxClonesPerOwner,
          allowedPlaybooks: clonePolicy.allowedPlaybooks,
        },
        ...(promptInputMinimizationContract
          ? { promptInputMinimization: promptInputMinimizationContract }
          : {}),
        requiredTools,
        requiredCapabilities,
        specialistScopeContract: specialistContract,
        spawnMetadata,
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
      lifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
      templateVersion: templateSourceVersion,
      templateCloneLinkage,
      lastTemplateSyncAt: now,
      lastTemplateSyncJobId,
      operatorId: ownerOperatorId,
      isPrimaryAssigned: !ownerHadPrimaryBeforeSpawn,
      requiredTools,
      requiredCapabilities,
      specialistScopeContract: specialistContract,
      ...(promptInputMinimizationAudit
        ? { promptInputMinimization: promptInputMinimizationAudit }
        : {}),
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

    const knowledgeBaseImport = await maybeEnsureTemplateKnowledgeBase({
      ctx,
      organizationId: args.organizationId,
      cloneAgentId: cloneId,
      templateProps,
      requestedByUserId,
      timestamp: now,
    });

    return {
      cloneAgentId: cloneId,
      reused: false,
      created: true,
      useCase: useCaseLabel,
      useCaseKey,
      ...(knowledgeBaseImport.status === "skipped"
        ? {}
        : { knowledgeBaseImport }),
      ...(promptInputMinimizationAudit
        ? { promptInputMinimization: promptInputMinimizationAudit }
        : {}),
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
