/**
 * AGENT ONTOLOGY
 *
 * Manages AI agents assigned to organizations.
 * Uses the universal ontology system (objects table) with type="org_agent".
 *
 * Agent Subtypes:
 * - "customer_support" - Handles customer inquiries
 * - "sales_assistant" - Qualifies leads and assists sales
 * - "booking_agent" - Manages appointments and reservations
 * - "general" - General purpose agent
 *
 * Status Workflow:
 * - "draft" - Being configured, not active
 * - "active" - Running and processing messages
 * - "paused" - Temporarily disabled
 * - "archived" - Deactivated
 *
 * Autonomy Levels:
 * - "supervised" - All actions require approval
 * - "autonomous" - Acts freely within guardrails
 * - "draft_only" - Generates responses but never sends them
 */

import { query, mutation, internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "./rbacHelpers";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./ai/modelDefaults";
import {
  evaluateWaeRolloutGateForTemplateVersion,
  type WaeRolloutGateBlockReasonCode,
} from "./ai/agentCatalogAdmin";
import { SUBTYPE_DEFAULT_PROFILES, normalizeDeterministicToolNames } from "./ai/toolScoping";
import {
  MANAGED_USE_CASE_CLONE_LIFECYCLE,
  buildManagedTemplateCloneLinkage,
  isManagedUseCaseCloneProperties,
  readTemplateCloneLinkageContract,
  resolveTemplateSourceId,
} from "./ai/templateCloneLinkage";
import {
  normalizeChannelBindingsContract,
  webchatChannelBindingValidator,
  type ChannelBindingContractRecord,
} from "./webchatCustomizationContract";

const OPERATOR_ROUTING_CHANNELS = new Set(["desktop", "slack"]);
const PLATFORM_MANAGED_CHANNEL_BINDING_CHANNELS = new Set(["desktop", "slack"]);
const TELEPHONY_ROUTING_CHANNELS = new Set(["phone_call"]);
const ORCHESTRATOR_DEFAULT_SUBTYPE = "general";
const DEFAULT_ORG_AGENT_TEMPLATE_ROLE = "personal_life_operator_template";
const DEFAULT_ORG_AGENT_TEMPLATE_ID_ENV_KEY = "DEFAULT_ORG_AGENT_TEMPLATE_ID";

const operatorCollaborationDefaultsValidator = v.object({
  defaultSurface: v.union(v.literal("group"), v.literal("dm")),
  allowSpecialistDmRouting: v.boolean(),
  proposalOnlyDmActions: v.boolean(),
});

const teamAccessModeValidator = v.union(
  v.literal("invisible"),
  v.literal("direct"),
  v.literal("meeting"),
);

const dreamTeamWorkspaceTypeValidator = v.union(
  v.literal("personal"),
  v.literal("business"),
);

const soulModeValidator = v.union(
  v.literal("work"),
  v.literal("private"),
);

export const AGENT_CLASS_VALUES = [
  "internal_operator",
  "external_customer_facing",
] as const;
export type AgentClass = (typeof AGENT_CLASS_VALUES)[number];

const agentClassValidator = v.union(
  v.literal("internal_operator"),
  v.literal("external_customer_facing"),
);

const modeChannelBindingValidator = v.object({
  channel: v.string(),
  mode: soulModeValidator,
});

const creationSourceValidator = v.union(
  v.literal("legacy_direct"),
  v.literal("catalog_clone"),
  v.literal("custom_concierge"),
  v.literal("admin_manual"),
);

const dreamTeamSpecialistContractValidator = v.object({
  soulBlendId: v.string(),
  specialistSubtype: v.optional(v.string()),
  specialistName: v.optional(v.string()),
  specialistId: v.optional(v.string()),
  directAccessEnabled: v.optional(v.boolean()),
  meetingParticipant: v.optional(v.boolean()),
  activationHints: v.optional(v.array(v.string())),
  accessModes: v.optional(v.array(teamAccessModeValidator)),
  workspaceTypes: v.optional(v.array(dreamTeamWorkspaceTypeValidator)),
  organizationTypes: v.optional(v.array(dreamTeamWorkspaceTypeValidator)),
  orgTypes: v.optional(v.array(dreamTeamWorkspaceTypeValidator)),
});

type OperatorCollaborationDefaults = {
  defaultSurface: "group" | "dm";
  allowSpecialistDmRouting: boolean;
  proposalOnlyDmActions: boolean;
};

const DEFAULT_OPERATOR_COLLABORATION_DEFAULTS: OperatorCollaborationDefaults = {
  defaultSurface: "group",
  allowSpecialistDmRouting: true,
  proposalOnlyDmActions: true,
};

function resolveChannelCandidates(channel: string): string[] {
  // Native guest should reuse webchat-enabled agents until dedicated config ships.
  return channel === "native_guest" ? ["native_guest", "webchat"] : [channel];
}

function isOperatorRoutingChannel(channel: string | undefined): boolean {
  const normalizedChannel = normalizeOptionalString(channel)?.toLowerCase();
  return Boolean(normalizedChannel && OPERATOR_ROUTING_CHANNELS.has(normalizedChannel));
}

function hasEnabledChannelBinding(
  customProperties: Record<string, unknown> | undefined,
  channel: string
): boolean {
  const channelCandidates = resolveChannelCandidates(channel);
  const rawBindings = customProperties?.channelBindings;

  if (Array.isArray(rawBindings)) {
    return rawBindings.some((binding) => {
      if (!binding || typeof binding !== "object") {
        return false;
      }
      const bindingRecord = binding as Record<string, unknown>;
      return (
        typeof bindingRecord.channel === "string" &&
        channelCandidates.includes(bindingRecord.channel) &&
        bindingRecord.enabled === true
      );
    });
  }

  if (rawBindings && typeof rawBindings === "object") {
    const legacyBindings = rawBindings as Record<string, unknown>;
    return channelCandidates.some((candidate) => {
      const channelConfig = legacyBindings[candidate];
      return (
        !!channelConfig &&
        typeof channelConfig === "object" &&
        (channelConfig as Record<string, unknown>).enabled === true
      );
    });
  }

  return false;
}

function normalizeBindingChannel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function readChannelBindingEnabledByChannel(
  rawBindings: unknown
): Map<string, boolean> {
  const map = new Map<string, boolean>();

  if (Array.isArray(rawBindings)) {
    for (const rawBinding of rawBindings) {
      if (!rawBinding || typeof rawBinding !== "object") {
        continue;
      }
      const record = rawBinding as Record<string, unknown>;
      const channel = normalizeBindingChannel(record.channel);
      if (!channel) {
        continue;
      }
      map.set(channel, record.enabled === true);
    }
    return map;
  }

  if (rawBindings && typeof rawBindings === "object") {
    for (const [rawChannel, rawValue] of Object.entries(
      rawBindings as Record<string, unknown>
    )) {
      const channel = normalizeBindingChannel(rawChannel);
      if (!channel) {
        continue;
      }
      if (rawValue && typeof rawValue === "object") {
        map.set(channel, (rawValue as Record<string, unknown>).enabled === true);
      }
    }
  }

  return map;
}

export function detectPlatformManagedChannelBindingOverride(
  currentBindings: unknown,
  nextBindings: ChannelBindingContractRecord[]
): boolean {
  const currentByChannel = readChannelBindingEnabledByChannel(currentBindings);
  const nextByChannel = readChannelBindingEnabledByChannel(nextBindings);

  for (const channel of PLATFORM_MANAGED_CHANNEL_BINDING_CHANNELS) {
    const currentEnabled = currentByChannel.get(channel) === true;
    const nextEnabled = nextByChannel.get(channel) === true;
    if (currentEnabled !== nextEnabled) {
      return true;
    }
  }

  return false;
}

function normalizeOperatorCollaborationDefaults(
  value: unknown
): OperatorCollaborationDefaults {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_OPERATOR_COLLABORATION_DEFAULTS };
  }

  const record = value as Record<string, unknown>;
  return {
    defaultSurface: record.defaultSurface === "dm" ? "dm" : "group",
    allowSpecialistDmRouting:
      typeof record.allowSpecialistDmRouting === "boolean"
        ? record.allowSpecialistDmRouting
        : DEFAULT_OPERATOR_COLLABORATION_DEFAULTS.allowSpecialistDmRouting,
    proposalOnlyDmActions:
      typeof record.proposalOnlyDmActions === "boolean"
        ? record.proposalOnlyDmActions
        : DEFAULT_OPERATOR_COLLABORATION_DEFAULTS.proposalOnlyDmActions,
  };
}

interface ActiveAgentCandidate {
  _id?: string;
  type?: string;
  name?: string;
  status?: string;
  subtype?: string;
  createdAt?: number;
  createdBy?: unknown;
  customProperties?: Record<string, unknown>;
}

const PRIMARY_AGENT_INELIGIBLE_STATUSES = new Set(["archived", "deleted", "template"]);
const DEFAULT_OPERATOR_CONTEXT_ID = "__org_default__";
export const AGENT_TEMPLATE_CLONE_PRECEDENCE_ORDER = [
  "platform_policy",
  "template_baseline",
  "org_clone_overrides",
  "runtime_session_restrictions",
] as const;
const AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION = "ath_template_lifecycle_v1";
const AGENT_TEMPLATE_OBJECT_TYPE = "org_agent";
const AGENT_TEMPLATE_VERSION_OBJECT_TYPE = "org_agent_template_version";
const AGENT_TEMPLATE_LIFECYCLE_STATUSES = ["draft", "published", "deprecated"] as const;
const AGENT_TEMPLATE_VERSION_LIFECYCLE_STATUSES = [
  "draft",
  "published",
  "deprecated",
] as const;
const SANCTIONED_MANAGED_CLONE_TUNING_FIELDS = new Set([
  "agentClass",
  "displayName",
  "personality",
  "language",
  "voiceLanguage",
  "additionalLanguages",
  "brandVoiceInstructions",
  "elevenLabsVoiceId",
  "systemPrompt",
  "faqEntries",
  "knowledgeBaseTags",
  "toolProfile",
  "enabledTools",
  "disabledTools",
  "autonomyLevel",
  "maxMessagesPerDay",
  "maxCostPerDay",
  "requireApprovalFor",
  "blockedTopics",
  "domainAutonomy",
  "autonomyTrust",
  "modelProvider",
  "modelId",
  "temperature",
  "maxTokens",
  "channelBindings",
  "unifiedPersonality",
  "teamAccessMode",
  "dreamTeamSpecialists",
  "activeSoulMode",
  "activeArchetype",
  "modeChannelBindings",
  "enabledArchetypes",
  "operatorCollaborationDefaults",
  "soul",
  "escalationPolicy",
]);

const TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS = [
  "toolProfile",
  "enabledTools",
  "disabledTools",
  "autonomyLevel",
  "modelProvider",
  "modelId",
  "systemPrompt",
  "channelBindings",
] as const;

type TemplateCloneDriftField = (typeof TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS)[number];
type TemplateClonePolicyState = "in_sync" | "overridden" | "stale" | "blocked";
type TemplateClonePolicyMode = "locked" | "warn" | "free";
type TemplateCloneRiskLevel = "low" | "medium" | "high";

type TemplateCloneDriftFieldDiff = {
  field: TemplateCloneDriftField;
  policyMode: TemplateClonePolicyMode;
  templateValue: unknown;
  cloneValue: unknown;
};

type TemplateCloneDriftContract = {
  policyState: TemplateClonePolicyState;
  stale: boolean;
  blocked: boolean;
  blockedFields: TemplateCloneDriftField[];
  overriddenFields: TemplateCloneDriftField[];
  diff: TemplateCloneDriftFieldDiff[];
};

function resolveTemplateCloneRiskLevel(
  policyState: TemplateClonePolicyState
): TemplateCloneRiskLevel {
  if (policyState === "blocked" || policyState === "stale") {
    return "high";
  }
  if (policyState === "overridden") {
    return "medium";
  }
  return "low";
}

export type PrimaryAgentRepairCandidate = ActiveAgentCandidate;

export interface PrimaryAgentRepairPatch {
  agentId: string;
  operatorId: string;
  isPrimary: boolean;
}

export interface PrimaryAgentContextRepairPlan {
  operatorId: string;
  primaryAgentId: string | null;
  previousPrimaryAgentIds: string[];
  hadZeroPrimary: boolean;
  hadMultiplePrimaries: boolean;
  patches: PrimaryAgentRepairPatch[];
}

export interface ActiveAgentRouteSelectors {
  channel?: string;
  providerId?: string;
  account?: string;
  team?: string;
  peer?: string;
  channelRef?: string;
}

interface ActiveAgentResolutionArgs {
  channel?: string;
  subtype?: string;
  routeSelectors?: ActiveAgentRouteSelectors;
}

type EnsureActiveAgentForOrgArgs = {
  organizationId: Id<"organizations">;
  channel?: string;
  subtype?: string;
  routeSelectors?: ActiveAgentRouteSelectors;
};

type AgentTemplateLifecycleStatus =
  (typeof AGENT_TEMPLATE_LIFECYCLE_STATUSES)[number];
type AgentTemplateVersionLifecycleStatus =
  (typeof AGENT_TEMPLATE_VERSION_LIFECYCLE_STATUSES)[number];

type SuperAdminMutationSession = {
  sessionId: string;
  userId: Id<"users">;
  roleName: "super_admin";
};

type TemplateDistributionOperation = "create" | "update" | "skip" | "blocked";
type TemplateDistributionOperationKind = "rollout_apply" | "rollout_rollback";
type TemplateDistributionOperationSummary = {
  creates: number;
  updates: number;
  skips: number;
  blocked: number;
};
type TemplateOverrideGateDecision = "allow" | "blocked_locked" | "blocked_warn_confirmation_required";
type TemplateOverrideGateSummary = {
  evaluatedFields: TemplateCloneDriftField[];
  changedFields: TemplateCloneDriftField[];
  lockedFields: TemplateCloneDriftField[];
  warnFields: TemplateCloneDriftField[];
  freeFields: TemplateCloneDriftField[];
  warnConfirmationAccepted: boolean;
  reason: string | null;
  decision: TemplateOverrideGateDecision;
};
type TemplateDistributionPolicyGateSummary = {
  blockedLocked: number;
  blockedWarnConfirmation: number;
  warnConfirmed: number;
  free: number;
};
type TemplateDistributionReasonCounts = Record<string, number>;

interface AgentRoutePolicy {
  policyId?: string;
  priority: number;
  selectors: ActiveAgentRouteSelectors;
  policyIndex: number;
}

interface AgentRouteMatch<T extends ActiveAgentCandidate> {
  agent: T;
  policy: AgentRoutePolicy;
  specificity: number;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeAgentClass(
  value: unknown,
  fallback: AgentClass = "internal_operator"
): AgentClass {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "internal_operator" || normalized === "external_customer_facing") {
    return normalized;
  }
  if (normalized === "internal_team") {
    return "internal_operator";
  }
  if (normalized === "customer_facing") {
    return "external_customer_facing";
  }
  return fallback;
}

export function readAgentClass(
  customProperties: Record<string, unknown> | undefined,
  fallback: AgentClass = "internal_operator"
): AgentClass {
  return normalizeAgentClass(customProperties?.agentClass, fallback);
}

export function resolveExpectedAgentClassForChannel(
  channel: string | undefined
): AgentClass | null {
  const normalizedChannel = normalizeOptionalString(channel)?.toLowerCase();
  if (!normalizedChannel) {
    return null;
  }
  if (OPERATOR_ROUTING_CHANNELS.has(normalizedChannel)) {
    return "internal_operator";
  }
  if (TELEPHONY_ROUTING_CHANNELS.has(normalizedChannel)) {
    return "external_customer_facing";
  }
  return null;
}

function normalizeTemplateLifecycleStatus(
  value: unknown
): AgentTemplateLifecycleStatus {
  return value === "published" || value === "deprecated" ? value : "draft";
}

function normalizeTemplateVersionLifecycleStatus(
  value: unknown
): AgentTemplateVersionLifecycleStatus {
  return value === "published" || value === "deprecated" ? value : "draft";
}

function pickTemplateBaselineSnapshot(
  customProperties: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!customProperties) {
    return {};
  }
  const snapshot = { ...customProperties };
  delete snapshot.totalMessages;
  delete snapshot.totalCostUsd;
  delete snapshot.templateLifecycleContractVersion;
  delete snapshot.templateLifecycleStatus;
  delete snapshot.templateLifecycleUpdatedAt;
  delete snapshot.templateLifecycleUpdatedBy;
  delete snapshot.templatePublishedVersion;
  delete snapshot.templatePublishedVersionId;
  delete snapshot.templateCurrentVersion;
  delete snapshot.templateLastVersionSnapshotId;
  return snapshot;
}

function deriveChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(keys)
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort((a, b) => a.localeCompare(b));
}

function toComparablePrimitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => toComparablePrimitive(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, toComparablePrimitive(record[key])])
  );
}

function normalizeComparableTemplateCloneFieldValue(
  field: TemplateCloneDriftField,
  value: unknown
): unknown {
  if (field === "enabledTools" || field === "disabledTools") {
    if (!Array.isArray(value)) {
      return [];
    }
    return normalizeDeterministicToolNames(
      value.filter((entry): entry is string => typeof entry === "string")
    );
  }

  if (field === "channelBindings") {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalizedBindings = normalizeChannelBindingsContract(
      value.filter((entry): entry is ChannelBindingContractRecord => {
        return (
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as Record<string, unknown>).channel === "string"
        );
      })
    ).map((binding) => toComparablePrimitive(binding) as Record<string, unknown>);

    return normalizedBindings.sort((left, right) => {
      const leftChannel = normalizeOptionalString(left.channel) || "";
      const rightChannel = normalizeOptionalString(right.channel) || "";
      if (leftChannel !== rightChannel) {
        return leftChannel.localeCompare(rightChannel);
      }
      return JSON.stringify(left).localeCompare(JSON.stringify(right));
    });
  }

  if (field === "toolProfile") {
    return normalizeOptionalString(value) || null;
  }

  return toComparablePrimitive(value ?? null);
}

function resolveTemplateCloneFieldPolicyMode(
  linkage: ReturnType<typeof readTemplateCloneLinkageContract> | null,
  field: TemplateCloneDriftField
): TemplateClonePolicyMode {
  const mode = linkage?.overridePolicy.fields?.[field]?.mode ?? linkage?.overridePolicy.mode;
  return mode === "locked" || mode === "free" ? mode : "warn";
}

function resolveTemplateCloneDriftContract(args: {
  templateBaseline: Record<string, unknown>;
  cloneCustomProperties: Record<string, unknown>;
  baselineTemplateVersion: string;
  linkage: ReturnType<typeof readTemplateCloneLinkageContract> | null;
}): TemplateCloneDriftContract {
  const fieldDiffs: TemplateCloneDriftFieldDiff[] = [];
  for (const field of TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS) {
    const templateValue = normalizeComparableTemplateCloneFieldValue(
      field,
      args.templateBaseline[field]
    );
    const cloneValue = normalizeComparableTemplateCloneFieldValue(
      field,
      args.cloneCustomProperties[field]
    );
    if (JSON.stringify(templateValue) === JSON.stringify(cloneValue)) {
      continue;
    }
    fieldDiffs.push({
      field,
      policyMode: resolveTemplateCloneFieldPolicyMode(args.linkage, field),
      templateValue,
      cloneValue,
    });
  }

  const stale =
    args.linkage?.cloneLifecycleState === "managed_stale" ||
    (Boolean(args.linkage?.sourceTemplateVersion) &&
      args.linkage?.sourceTemplateVersion !== args.baselineTemplateVersion);
  const blockedFields = fieldDiffs
    .filter((entry) => entry.policyMode === "locked")
    .map((entry) => entry.field);
  const overriddenFields = fieldDiffs
    .filter((entry) => entry.policyMode !== "locked")
    .map((entry) => entry.field);

  const blocked =
    !args.linkage ||
    blockedFields.length > 0 ||
    args.linkage.cloneLifecycleState === "legacy_unmanaged";
  let policyState: TemplateClonePolicyState = "in_sync";
  if (blocked) {
    policyState = "blocked";
  } else if (stale) {
    policyState = "stale";
  } else if (fieldDiffs.length > 0) {
    policyState = "overridden";
  }

  return {
    policyState,
    stale,
    blocked,
    blockedFields,
    overriddenFields,
    diff: fieldDiffs,
  };
}

async function requireSuperAdminMutationSession(
  ctx: MutationCtx,
  sessionId: string
): Promise<SuperAdminMutationSession> {
  const session = await ctx.db
    .query("sessions")
    .filter((q) => q.eq(q.field("_id"), sessionId))
    .first();
  if (!session) {
    throw new Error("Invalid session");
  }
  const userContext = await getUserContext(ctx, session.userId);
  if (!(userContext.isGlobal && userContext.roleName === "super_admin")) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Template lifecycle operations require super_admin role.",
    });
  }
  return {
    sessionId,
    userId: session.userId,
    roleName: "super_admin",
  };
}

async function writeTemplateLifecycleAuditEvent(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  objectId: Id<"objects">;
  actionType:
    | "agent_template.created"
    | "agent_template.version_snapshot_created"
    | "agent_template.version_published"
    | "agent_template.deprecated"
    | "agent_template.version_deprecated";
  actor: SuperAdminMutationSession;
  objectScope: {
    scope: "global_template" | "template_version";
    templateId: string;
    templateVersionId?: string;
    templateVersionTag?: string;
  };
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  summary: Record<string, unknown>;
  timestamp: number;
}) {
  const changedFields = deriveChangedFields(args.before, args.after);
  const deterministicPayload = {
    contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
    actor: {
      userId: String(args.actor.userId),
      sessionId: args.actor.sessionId,
      role: args.actor.roleName,
    },
    actionType: args.actionType,
    objectScope: {
      ...args.objectScope,
      organizationId: String(args.organizationId),
      precedenceOrder: [...AGENT_TEMPLATE_CLONE_PRECEDENCE_ORDER],
    },
    diff: {
      changedFields,
      before: args.before,
      after: args.after,
      summary: args.summary,
    },
    timestamp: args.timestamp,
  };

  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.objectId,
    actionType: args.actionType,
    actionData: deterministicPayload,
    performedBy: args.actor.userId,
    performedAt: args.timestamp,
  });

  await args.ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId: args.actor.userId,
    action: args.actionType,
    resource: args.objectScope.scope,
    resourceId:
      args.objectScope.scope === "template_version"
        ? args.objectScope.templateVersionId
        : args.objectScope.templateId,
    success: true,
    metadata: deterministicPayload,
    createdAt: args.timestamp,
  });
}

async function writeTemplateWaeGateBlockedEvent(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  objectId: Id<"objects">;
  actionType:
    | "agent_template.publish_blocked_wae_gate"
    | "agent_template.distribution_blocked_wae_gate";
  actor: SuperAdminMutationSession;
  resource: "template_version" | "global_template";
  resourceId: string;
  templateId: string;
  templateVersionId?: string | null;
  templateVersionTag?: string | null;
  reasonCode: WaeRolloutGateBlockReasonCode;
  message: string;
  gate: unknown;
  timestamp: number;
}) {
  const payload = {
    contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
    actor: {
      userId: String(args.actor.userId),
      sessionId: args.actor.sessionId,
      role: args.actor.roleName,
    },
    reasonCode: args.reasonCode,
    message: args.message,
    templateId: args.templateId,
    templateVersionId: args.templateVersionId ?? null,
    templateVersionTag: args.templateVersionTag ?? null,
    gate: args.gate,
    timestamp: args.timestamp,
  };

  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.objectId,
    actionType: args.actionType,
    actionData: payload,
    performedBy: args.actor.userId,
    performedAt: args.timestamp,
  });

  await args.ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId: args.actor.userId,
    action: args.actionType,
    resource: args.resource,
    resourceId: args.resourceId,
    success: false,
    metadata: payload,
    createdAt: args.timestamp,
  });
}

function dedupeAndSortObjectIds(values: Id<"organizations">[]): Id<"organizations">[] {
  return Array.from(new Set(values.map((value) => String(value))))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => value as Id<"organizations">);
}

function summarizeTemplateDistributionOperations(
  rows: Array<{ operation: TemplateDistributionOperation }>
): TemplateDistributionOperationSummary {
  return {
    creates: rows.filter((row) => row.operation === "create").length,
    updates: rows.filter((row) => row.operation === "update").length,
    skips: rows.filter((row) => row.operation === "skip").length,
    blocked: rows.filter((row) => row.operation === "blocked").length,
  };
}

function summarizeTemplateDistributionReasonCounts(
  rows: Array<{ reason?: string }>
): TemplateDistributionReasonCounts {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const reason = normalizeOptionalString(row.reason) || "unspecified";
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return Object.fromEntries(
    Array.from(counts.entries()).sort((left, right) => left[0].localeCompare(right[0]))
  );
}

function buildDeterministicTemplateDistributionJobId(args: {
  templateId: string;
  templateVersionTag: string;
  targetOrganizationIds: string[];
}): string {
  const basis = `${args.templateId}|${args.templateVersionTag}|${args.targetOrganizationIds.join(",")}`;
  let hash = 0;
  for (let index = 0; index < basis.length; index += 1) {
    hash = (hash * 31 + basis.charCodeAt(index)) >>> 0;
  }
  return `ath_dist_${args.templateId}_${args.templateVersionTag}_${hash.toString(16).padStart(8, "0")}`;
}

function resolveTemplateVersionTagFromVersionObject(
  versionCustomProperties: Record<string, unknown> | undefined
): string | undefined {
  return normalizeOptionalString(versionCustomProperties?.versionTag);
}

function resolveDefaultOrgAgentTemplateIdFromEnv(): string | undefined {
  return normalizeOptionalString(
    process.env[DEFAULT_ORG_AGENT_TEMPLATE_ID_ENV_KEY]
  );
}

function resolvePlatformOrgIdFromEnv(): Id<"organizations"> | undefined {
  const platformOrgId = normalizeOptionalString(process.env.PLATFORM_ORG_ID);
  if (platformOrgId) {
    return platformOrgId as Id<"organizations">;
  }
  const testOrgId = normalizeOptionalString(process.env.TEST_ORG_ID);
  if (testOrgId) {
    return testOrgId as Id<"organizations">;
  }
  return undefined;
}

function resolveDefaultOrgTemplateVersionTag(args: {
  templateId: Id<"objects">;
  templateUpdatedAt: number;
  templateCustomProperties: Record<string, unknown> | undefined;
}): string {
  return (
    normalizeOptionalString(args.templateCustomProperties?.templatePublishedVersion) ||
    normalizeOptionalString(args.templateCustomProperties?.templateVersion) ||
    `${String(args.templateId)}@${args.templateUpdatedAt}`
  );
}

function buildOrgDefaultTemplateSyncJobId(args: {
  organizationId: Id<"organizations">;
  templateId: Id<"objects">;
  templateVersion: string;
}): string {
  const basis = `${String(args.organizationId)}|${String(args.templateId)}|${args.templateVersion}`;
  let hash = 0;
  for (let index = 0; index < basis.length; index += 1) {
    hash = (hash * 31 + basis.charCodeAt(index)) >>> 0;
  }
  return `org_default_template_${String(args.templateId)}_${hash.toString(16).padStart(8, "0")}`;
}

function isLegacyAutoRecoveryAssistantCandidate(candidate: ActiveAgentCandidate): boolean {
  const customProperties = readAgentCustomProperties(candidate);
  return (
    (candidate.name === "Default Assistant"
      || customProperties.displayName === "Default Assistant")
    && normalizeOptionalString(customProperties.toolProfile) === "general"
  );
}

function isLegacyAutoProvisionUpgradeCandidate(
  candidate: ActiveAgentCandidate
): boolean {
  if (
    candidate.status === "archived"
    || candidate.status === "deleted"
    || candidate.status === "template"
  ) {
    return false;
  }
  const customProperties = readAgentCustomProperties(candidate);
  const displayName = normalizeOptionalString(customProperties.displayName);
  const name = normalizeOptionalString(candidate.name);
  const toolProfile = normalizeOptionalString(customProperties.toolProfile);
  const creationSource = normalizeOptionalString(customProperties.creationSource);
  const isFallbackName =
    name === "One-of-One Operator"
    || name === "Default Assistant"
    || displayName === "One-of-One Operator"
    || displayName === "Default Assistant";
  const isFallbackTooling = toolProfile === "admin" || toolProfile === "general";
  const isFallbackSource =
    creationSource === undefined ||
    creationSource === "admin_manual" ||
    creationSource === "legacy_direct";

  return isFallbackName && isFallbackTooling && isFallbackSource;
}

function resolveRecoverySubtype(args: {
  channel?: string;
  subtype?: string;
}): string | undefined {
  const explicitSubtype = normalizeOptionalString(args.subtype);
  if (explicitSubtype) {
    return explicitSubtype;
  }
  if (isOperatorRoutingChannel(args.channel)) {
    return ORCHESTRATOR_DEFAULT_SUBTYPE;
  }
  return undefined;
}

function readAgentCustomProperties(
  candidate: ActiveAgentCandidate
): Record<string, unknown> {
  const rawCustomProperties = candidate.customProperties;
  if (!rawCustomProperties || typeof rawCustomProperties !== "object") {
    return {};
  }
  return rawCustomProperties;
}

function isPrimaryFlagged(candidate: ActiveAgentCandidate): boolean {
  const customProperties = readAgentCustomProperties(candidate);
  return customProperties.isPrimary === true;
}

export function isManagedUseCaseCloneCandidate(candidate: ActiveAgentCandidate): boolean {
  const customProperties = readAgentCustomProperties(candidate);
  return isManagedUseCaseCloneProperties(customProperties);
}

export function resolveDisallowedManagedCloneTuningFields(updatedFields: string[]): string[] {
  return Array.from(
    new Set(
      updatedFields.filter((field) => !SANCTIONED_MANAGED_CLONE_TUNING_FIELDS.has(field))
    )
  );
}

function normalizeDeterministicUpdatedFields(updatedFields: string[]): string[] {
  return Array.from(new Set(updatedFields)).sort((a, b) => a.localeCompare(b));
}

function resolveTemplateOverrideGateForManagedClone(args: {
  customProperties: Record<string, unknown>;
  updates: Record<string, unknown>;
  warnConfirmation: boolean;
  reason: string | null;
}): TemplateOverrideGateSummary | null {
  if (!isManagedUseCaseCloneProperties(args.customProperties)) {
    return null;
  }
  const linkage = readTemplateCloneLinkageContract(args.customProperties);
  if (!linkage || linkage.cloneLifecycleState === "legacy_unmanaged") {
    return null;
  }

  const evaluatedFields: TemplateCloneDriftField[] = [];
  const changedFields: TemplateCloneDriftField[] = [];
  const lockedFields: TemplateCloneDriftField[] = [];
  const warnFields: TemplateCloneDriftField[] = [];
  const freeFields: TemplateCloneDriftField[] = [];

  for (const field of TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(args.updates, field)) {
      continue;
    }
    evaluatedFields.push(field);
    const currentValue = normalizeComparableTemplateCloneFieldValue(
      field,
      args.customProperties[field]
    );
    const nextValue = normalizeComparableTemplateCloneFieldValue(
      field,
      args.updates[field]
    );
    if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) {
      continue;
    }
    changedFields.push(field);
    const mode = resolveTemplateCloneFieldPolicyMode(linkage, field);
    if (mode === "locked") {
      lockedFields.push(field);
    } else if (mode === "warn") {
      warnFields.push(field);
    } else {
      freeFields.push(field);
    }
  }

  if (evaluatedFields.length === 0) {
    return null;
  }

  let decision: TemplateOverrideGateDecision = "allow";
  if (lockedFields.length > 0) {
    decision = "blocked_locked";
  } else if (warnFields.length > 0 && !args.warnConfirmation) {
    decision = "blocked_warn_confirmation_required";
  }

  return {
    evaluatedFields,
    changedFields,
    lockedFields,
    warnFields,
    freeFields,
    warnConfirmationAccepted: args.warnConfirmation,
    reason: args.reason,
    decision,
  };
}

function summarizeTemplateDistributionPolicyGates(
  rows: Array<{ policyGate?: TemplateOverrideGateSummary }>
): TemplateDistributionPolicyGateSummary {
  return {
    blockedLocked: rows.filter((row) => row.policyGate?.decision === "blocked_locked").length,
    blockedWarnConfirmation: rows.filter(
      (row) => row.policyGate?.decision === "blocked_warn_confirmation_required"
    ).length,
    warnConfirmed: rows.filter(
      (row) =>
        row.policyGate?.decision === "allow" &&
        (row.policyGate?.warnFields.length || 0) > 0
    ).length,
    free: rows.filter(
      (row) =>
        row.policyGate?.decision === "allow" &&
        (row.policyGate?.freeFields.length || 0) > 0
    ).length,
  };
}

function resolveOperatorContextId(candidate: ActiveAgentCandidate): string {
  const customProperties = readAgentCustomProperties(candidate);
  const explicitOperatorId = normalizeOptionalString(customProperties.operatorId);
  if (explicitOperatorId) {
    return explicitOperatorId;
  }

  const ownerUserId = normalizeOptionalString(customProperties.ownerUserId);
  if (ownerUserId) {
    return ownerUserId;
  }

  const createdById = normalizeOptionalString(candidate.createdBy);
  if (createdById) {
    return createdById;
  }

  return DEFAULT_OPERATOR_CONTEXT_ID;
}

function isViablePrimaryCandidate(candidate: ActiveAgentCandidate): boolean {
  if (candidate.type && candidate.type !== "org_agent") {
    return false;
  }
  const normalizedStatus = normalizeOptionalString(candidate.status)?.toLowerCase();
  if (!normalizedStatus) {
    return true;
  }
  return !PRIMARY_AGENT_INELIGIBLE_STATUSES.has(normalizedStatus);
}

function compareAgentsByPrimaryOrder(
  a: ActiveAgentCandidate,
  b: ActiveAgentCandidate
): number {
  const aCreatedAt = typeof a.createdAt === "number" ? a.createdAt : Number.MAX_SAFE_INTEGER;
  const bCreatedAt = typeof b.createdAt === "number" ? b.createdAt : Number.MAX_SAFE_INTEGER;
  if (aCreatedAt !== bCreatedAt) {
    return aCreatedAt - bCreatedAt;
  }
  return String(a._id || "").localeCompare(String(b._id || ""));
}

export function planPrimaryAgentRepairs<T extends PrimaryAgentRepairCandidate>(
  agents: T[],
  args?: {
    operatorId?: string;
    forcePrimaryAgentId?: string;
  }
): PrimaryAgentContextRepairPlan[] {
  const targetOperatorId = normalizeOptionalString(args?.operatorId);
  const forcedPrimaryAgentId = normalizeOptionalString(args?.forcePrimaryAgentId);
  const agentsByOperator = new Map<string, T[]>();

  for (const agent of agents) {
    if (!agent || !agent._id) {
      continue;
    }
    const operatorId = resolveOperatorContextId(agent);
    if (targetOperatorId && operatorId !== targetOperatorId) {
      continue;
    }
    const existing = agentsByOperator.get(operatorId);
    if (existing) {
      existing.push(agent);
    } else {
      agentsByOperator.set(operatorId, [agent]);
    }
  }

  const plans: PrimaryAgentContextRepairPlan[] = [];
  for (const [operatorId, operatorAgents] of agentsByOperator.entries()) {
    const sortedAgents = [...operatorAgents].sort(compareAgentsByPrimaryOrder);
    const viableAgents = sortedAgents.filter((candidate) =>
      isViablePrimaryCandidate(candidate)
    );
    const currentPrimaryAgents = sortedAgents.filter((candidate) =>
      isPrimaryFlagged(candidate)
    );
    const currentViablePrimaryAgents = viableAgents.filter((candidate) =>
      isPrimaryFlagged(candidate)
    );

    let canonicalPrimary = forcedPrimaryAgentId
      ? viableAgents.find((candidate) => String(candidate._id) === forcedPrimaryAgentId) ||
        null
      : null;

    if (!canonicalPrimary) {
      if (currentViablePrimaryAgents.length === 1) {
        canonicalPrimary = currentViablePrimaryAgents[0];
      } else if (currentViablePrimaryAgents.length > 1) {
        canonicalPrimary = [...currentViablePrimaryAgents].sort(compareAgentsByPrimaryOrder)[0];
      } else {
        canonicalPrimary = viableAgents[0] || null;
      }
    }

    const canonicalPrimaryId = canonicalPrimary ? String(canonicalPrimary._id) : null;
    const patches: PrimaryAgentRepairPatch[] = [];
    for (const candidate of sortedAgents) {
      const candidateId = String(candidate._id);
      const nextIsPrimary = canonicalPrimaryId !== null && candidateId === canonicalPrimaryId;
      const currentIsPrimary = isPrimaryFlagged(candidate);
      const currentOperatorId = normalizeOptionalString(
        readAgentCustomProperties(candidate).operatorId
      );

      if (currentIsPrimary !== nextIsPrimary || currentOperatorId !== operatorId) {
        patches.push({
          agentId: candidateId,
          operatorId,
          isPrimary: nextIsPrimary,
        });
      }
    }

    plans.push({
      operatorId,
      primaryAgentId: canonicalPrimaryId,
      previousPrimaryAgentIds: currentPrimaryAgents.map((candidate) =>
        String(candidate._id)
      ),
      hadZeroPrimary:
        viableAgents.length > 0 && currentViablePrimaryAgents.length === 0,
      hadMultiplePrimaries: currentViablePrimaryAgents.length > 1,
      patches,
    });
  }

  return plans;
}

function normalizeRouteSelectors(
  value: unknown
): ActiveAgentRouteSelectors | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const selectors: ActiveAgentRouteSelectors = {
    channel: normalizeOptionalString(record.channel),
    providerId: normalizeOptionalString(record.providerId),
    account: normalizeOptionalString(record.account),
    team: normalizeOptionalString(record.team),
    peer: normalizeOptionalString(record.peer),
    channelRef: normalizeOptionalString(record.channelRef),
  };

  return Object.values(selectors).some((entry) => Boolean(entry))
    ? selectors
    : undefined;
}

function hasRouteSelectorValue(
  selectors: ActiveAgentRouteSelectors | undefined
): selectors is ActiveAgentRouteSelectors {
  return Boolean(
    selectors &&
      Object.values(selectors).some((entry) => typeof entry === "string" && entry.length > 0)
  );
}

function readAuthorityRoleFromCustomProperties(
  customProperties: Record<string, unknown> | undefined
): string | undefined {
  const directRole = normalizeOptionalString(customProperties?.authorityRole)?.toLowerCase();
  if (directRole) {
    return directRole;
  }

  const collaborationAuthority = customProperties?.collaborationAuthority;
  if (!collaborationAuthority || typeof collaborationAuthority !== "object") {
    return undefined;
  }

  return normalizeOptionalString(
    (collaborationAuthority as Record<string, unknown>).authorityRole
  )?.toLowerCase();
}

function isOrchestratorCandidate(agent: ActiveAgentCandidate): boolean {
  const props = agent.customProperties as Record<string, unknown> | undefined;
  const authorityRole = readAuthorityRoleFromCustomProperties(props);
  if (authorityRole === "orchestrator") {
    return true;
  }
  return agent.subtype === ORCHESTRATOR_DEFAULT_SUBTYPE;
}

function resolveOrchestratorCandidate<T extends ActiveAgentCandidate>(
  candidates: T[],
  channel?: string
): T | null {
  const orchestratorCandidates = candidates.filter((candidate) =>
    isOrchestratorCandidate(candidate)
  );
  if (orchestratorCandidates.length === 0) {
    return null;
  }

  if (channel) {
    const channelBoundOrchestrator = orchestratorCandidates.find((candidate) => {
      const props = candidate.customProperties as Record<string, unknown> | undefined;
      return hasEnabledChannelBinding(props, channel);
    });
    if (channelBoundOrchestrator) {
      return channelBoundOrchestrator;
    }
  }

  return orchestratorCandidates[0] ?? null;
}

function extractAgentRoutePolicies(
  customProperties: Record<string, unknown> | undefined
): AgentRoutePolicy[] {
  const rawPolicies =
    customProperties?.channelRoutePolicies ??
    customProperties?.routePolicies ??
    customProperties?.dispatchRoutes;

  if (!Array.isArray(rawPolicies)) {
    return [];
  }

  const policies: AgentRoutePolicy[] = [];

  for (let index = 0; index < rawPolicies.length; index += 1) {
    const rawPolicy = rawPolicies[index];
    if (!rawPolicy || typeof rawPolicy !== "object") {
      continue;
    }

    const policyRecord = rawPolicy as Record<string, unknown>;
    if (policyRecord.enabled === false) {
      continue;
    }

    const selectors = normalizeRouteSelectors({
      channel: policyRecord.channel,
      providerId: policyRecord.providerId,
      account:
        policyRecord.account ??
        policyRecord.accountId ??
        policyRecord.providerAccountId,
      team:
        policyRecord.team ??
        policyRecord.teamId ??
        policyRecord.providerTeamId ??
        policyRecord.slackTeamId,
      peer:
        policyRecord.peer ??
        policyRecord.peerId ??
        policyRecord.externalContactIdentifier ??
        policyRecord.providerPeerId ??
        policyRecord.slackUserId,
      channelRef:
        policyRecord.channelRef ??
        policyRecord.channelId ??
        policyRecord.providerChannelId ??
        policyRecord.slackChannelId,
    });
    if (!selectors) {
      continue;
    }

    const rawPriority = policyRecord.priority;
    const priority = typeof rawPriority === "number" && Number.isFinite(rawPriority)
      ? rawPriority
      : 100;

    policies.push({
      policyId: normalizeOptionalString(policyRecord.id) || `policy_${index}`,
      priority,
      selectors,
      policyIndex: index,
    });
  }

  return policies;
}

function policyMatchesSelectors(
  policySelectors: ActiveAgentRouteSelectors,
  selectors: ActiveAgentRouteSelectors
): boolean {
  const checks: Array<[string | undefined, string | undefined]> = [
    [policySelectors.channel, selectors.channel],
    [policySelectors.providerId, selectors.providerId],
    [policySelectors.account, selectors.account],
    [policySelectors.team, selectors.team],
    [policySelectors.peer, selectors.peer],
    [policySelectors.channelRef, selectors.channelRef],
  ];

  for (const [policyValue, selectorValue] of checks) {
    if (!policyValue) {
      continue;
    }
    if (!selectorValue || selectorValue !== policyValue) {
      return false;
    }
  }

  return true;
}

function countSelectorSpecificity(selectors: ActiveAgentRouteSelectors): number {
  return Object.values(selectors).filter((value) => Boolean(value)).length;
}

function resolveRoutePolicyMatch<T extends ActiveAgentCandidate>(
  candidates: T[],
  selectors: ActiveAgentRouteSelectors
): AgentRouteMatch<T> | null {
  const matches: Array<AgentRouteMatch<T>> = [];

  for (const candidate of candidates) {
    const policies = extractAgentRoutePolicies(candidate.customProperties);
    if (policies.length === 0) {
      continue;
    }

    const matchedPolicies = policies
      .filter((policy) => policyMatchesSelectors(policy.selectors, selectors))
      .sort((a, b) => {
        const specificityDelta =
          countSelectorSpecificity(b.selectors) - countSelectorSpecificity(a.selectors);
        if (specificityDelta !== 0) {
          return specificityDelta;
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.policyIndex - b.policyIndex;
      });
    const bestPolicy = matchedPolicies[0];
    if (!bestPolicy) {
      continue;
    }

    matches.push({
      agent: candidate,
      policy: bestPolicy,
      specificity: countSelectorSpecificity(bestPolicy.selectors),
    });
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => {
    if (a.specificity !== b.specificity) {
      return b.specificity - a.specificity;
    }
    if (a.policy.priority !== b.policy.priority) {
      return a.policy.priority - b.policy.priority;
    }
    if (a.policy.policyIndex !== b.policy.policyIndex) {
      return a.policy.policyIndex - b.policy.policyIndex;
    }
    return String(a.agent._id || "").localeCompare(String(b.agent._id || ""));
  });

  return matches[0];
}

function findPrimaryActiveCandidate<T extends ActiveAgentCandidate>(
  candidates: T[]
): T | null {
  const primaryCandidate = candidates.find((candidate) => isPrimaryFlagged(candidate));
  return primaryCandidate ?? null;
}

export function resolveActiveAgentForOrgCandidates<T extends ActiveAgentCandidate>(
  agents: T[],
  args: ActiveAgentResolutionArgs
): T | null {
  const activeAgents = agents
    .filter((agent) => agent.status === "active")
    .sort((a, b) => String(a._id || "").localeCompare(String(b._id || "")));

  let candidates = activeAgents;
  if (args.subtype) {
    candidates = activeAgents.filter((agent) => agent.subtype === args.subtype);
    if (candidates.length === 0) {
      // Do not route to a different subtype when callers explicitly request one.
      return null;
    }
  }

  const expectedAgentClass = resolveExpectedAgentClassForChannel(args.channel);
  if (expectedAgentClass) {
    candidates = candidates.filter((agent) => {
      const props = readAgentCustomProperties(agent);
      return readAgentClass(props) === expectedAgentClass;
    });
    if (candidates.length === 0) {
      return null;
    }
  }

  const operatorRoutingChannelRequested = isOperatorRoutingChannel(args.channel);
  const orchestratorCandidate = operatorRoutingChannelRequested
    ? resolveOrchestratorCandidate(candidates, args.channel)
    : null;

  const normalizedRouteSelectors = normalizeRouteSelectors(args.routeSelectors);
  if (hasRouteSelectorValue(normalizedRouteSelectors)) {
    const routeMatch = resolveRoutePolicyMatch(candidates, normalizedRouteSelectors);
    if (routeMatch) {
      return routeMatch.agent;
    }
  }

  if (args.channel) {
    const requestedChannel = args.channel;
    const channelCandidates = candidates.filter((agent) => {
      const props = agent.customProperties as Record<string, unknown> | undefined;
      return hasEnabledChannelBinding(props, requestedChannel);
    });
    const channelAgent =
      findPrimaryActiveCandidate(channelCandidates) || channelCandidates[0] || null;
    if (channelAgent) {
      if (operatorRoutingChannelRequested && !isOrchestratorCandidate(channelAgent)) {
        return orchestratorCandidate;
      }
      return channelAgent;
    }
  }

  if (operatorRoutingChannelRequested) {
    return orchestratorCandidate;
  }

  return findPrimaryActiveCandidate(candidates) || candidates[0] || null;
}

function readTemplateRole(
  customProperties: Record<string, unknown> | undefined
): string | null {
  const role = customProperties?.templateRole;
  if (typeof role !== "string") {
    return null;
  }
  const normalized = role.trim();
  return normalized.length > 0 ? normalized : null;
}

function isProtectedTemplateRecord(candidate: ActiveAgentCandidate): boolean {
  const props = candidate.customProperties as Record<string, unknown> | undefined;
  return candidate.status === "template" && props?.protected === true;
}

export function selectOnboardingTemplateAgent<T extends ActiveAgentCandidate>(
  agents: T[]
): T | null {
  const templates = agents
    .filter((candidate) => isProtectedTemplateRecord(candidate))
    .sort((a, b) => String(a._id || "").localeCompare(String(b._id || "")));

  const explicitOnboardingTemplate = templates.find((template) => {
    const props = template.customProperties as Record<string, unknown> | undefined;
    return readTemplateRole(props) === "platform_system_bot_template";
  });
  if (explicitOnboardingTemplate) {
    return explicitOnboardingTemplate;
  }

  const legacyQuinnTemplate = templates.find((template) =>
    typeof template.name === "string" && template.name.trim().toLowerCase() === "quinn"
  );
  if (legacyQuinnTemplate) {
    return legacyQuinnTemplate;
  }

  return templates[0] ?? null;
}

function filterProtectedTemplateAgents<T extends ActiveAgentCandidate>(
  agents: T[],
  args?: {
    templateLayer?: string;
    templatePlaybook?: string;
    templateRole?: string;
  }
): T[] {
  const layerFilter = typeof args?.templateLayer === "string"
    ? args.templateLayer.trim().toLowerCase()
    : "";
  const playbookFilter = typeof args?.templatePlaybook === "string"
    ? args.templatePlaybook.trim().toLowerCase()
    : "";
  const roleFilter = typeof args?.templateRole === "string"
    ? args.templateRole.trim().toLowerCase()
    : "";

  return agents
    .filter((candidate) => isProtectedTemplateRecord(candidate))
    .filter((candidate) => {
      const props = candidate.customProperties as Record<string, unknown> | undefined;
      const templateLayer = typeof props?.templateLayer === "string"
        ? props.templateLayer.trim().toLowerCase()
        : "";
      const templatePlaybook = typeof props?.templatePlaybook === "string"
        ? props.templatePlaybook.trim().toLowerCase()
        : "";
      const templateRole = readTemplateRole(props)?.toLowerCase() ?? "";
      if (layerFilter && templateLayer !== layerFilter) {
        return false;
      }
      if (playbookFilter && templatePlaybook !== playbookFilter) {
        return false;
      }
      if (roleFilter && templateRole !== roleFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export interface AppliedPrimaryAgentContextRepair {
  operatorId: string;
  primaryAgentId: string | null;
  previousPrimaryAgentIds: string[];
  hadZeroPrimary: boolean;
  hadMultiplePrimaries: boolean;
  patchedAgentIds: string[];
}

function resolvePrimaryAgentForContext<T extends PrimaryAgentRepairCandidate>(
  agents: T[],
  operatorId: string
): T | null {
  const plans = planPrimaryAgentRepairs(agents, { operatorId });
  const contextPlan = plans[0];
  if (!contextPlan?.primaryAgentId) {
    return null;
  }
  return (
    agents.find((candidate) => String(candidate._id) === contextPlan.primaryAgentId) || null
  );
}

async function applyPrimaryAgentRepairsForOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: string;
    operatorId?: string;
    forcePrimaryAgentId?: string;
  }
): Promise<AppliedPrimaryAgentContextRepair[]> {
  const now = Date.now();
  const agents = (await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("type", "org_agent")
    )
    .collect()) as PrimaryAgentRepairCandidate[];

  const plans = planPrimaryAgentRepairs(agents, {
    operatorId: args.operatorId,
    forcePrimaryAgentId: args.forcePrimaryAgentId,
  });
  if (plans.length === 0) {
    return [];
  }

  const agentById = new Map(
    agents
      .filter((agent): agent is PrimaryAgentRepairCandidate & { _id: string } =>
        typeof agent._id === "string"
      )
      .map((agent) => [agent._id, agent])
  );
  const appliedContexts: AppliedPrimaryAgentContextRepair[] = [];
  for (const plan of plans) {
    const patchedAgentIds: string[] = [];

    for (const patch of plan.patches) {
      const agent = agentById.get(patch.agentId);
      if (!agent) {
        continue;
      }
      const customProperties = agent.customProperties as Record<string, unknown> | undefined;

      await ctx.db.patch(agent._id, {
        customProperties: {
          ...(customProperties || {}),
          operatorId: patch.operatorId,
          isPrimary: patch.isPrimary,
        },
        updatedAt: now,
      });
      patchedAgentIds.push(patch.agentId);
    }

    appliedContexts.push({
      operatorId: plan.operatorId,
      primaryAgentId: plan.primaryAgentId,
      previousPrimaryAgentIds: plan.previousPrimaryAgentIds,
      hadZeroPrimary: plan.hadZeroPrimary,
      hadMultiplePrimaries: plan.hadMultiplePrimaries,
      patchedAgentIds,
    });
  }

  return appliedContexts;
}

// ============================================================================
// AGENT QUERIES
// ============================================================================

/**
 * GET AGENTS
 * Returns all agents for an organization
 */
export const getAgents = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    if (args.subtype) {
      agents = agents.filter((a) => a.subtype === args.subtype);
    }
    if (args.status) {
      agents = agents.filter((a) => a.status === args.status);
    }

    return agents;
  },
});

/**
 * GET AGENT
 * Get a single agent by ID
 */
export const getAgent = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return null;
    }

    return agent;
  },
});

/**
 * INTERNAL: Get agent by ID (no auth, for pipeline use)
 */
export const getAgentInternal = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return null;
    }
    return agent;
  },
});

/**
 * INTERNAL: Get active agent for an organization
 * Used by the execution pipeline to find which agent handles inbound messages
 */
export const getActiveAgentForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.string()),
    subtype: v.optional(v.string()),
    routeSelectors: v.optional(v.object({
      channel: v.optional(v.string()),
      providerId: v.optional(v.string()),
      account: v.optional(v.string()),
      team: v.optional(v.string()),
      peer: v.optional(v.string()),
      channelRef: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();
    return resolveActiveAgentForOrgCandidates(agents, {
      channel: args.channel,
      subtype: args.subtype,
      routeSelectors: args.routeSelectors,
    });
  },
});

/**
 * INTERNAL: Ensure an organization has an active agent available for routing.
 * Recovery strategy:
 * 1) Return an existing active route match if present
 * 2) Reactivate a viable existing agent
 * 3) Create a default active agent
 */
async function ensureActiveAgentForOrgInternalHandler(
  ctx: MutationCtx,
  args: EnsureActiveAgentForOrgArgs
): Promise<{
  agentId: Id<"objects">;
  recoveryAction: "existing" | "reactivated" | "created";
}> {
  const recoverySubtype = resolveRecoverySubtype({
    channel: args.channel,
    subtype: args.subtype,
  });
  const expectedAgentClass = resolveExpectedAgentClassForChannel(args.channel);
  const agents = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "org_agent")
    )
    .collect();

  const existingActiveAgent = resolveActiveAgentForOrgCandidates(agents, {
    channel: args.channel,
    subtype: recoverySubtype,
    routeSelectors: args.routeSelectors,
  });
  if (existingActiveAgent?._id) {
    const existingProps =
      (existingActiveAgent.customProperties as Record<string, unknown> | undefined) ?? {};
    const normalizedExistingAgentClass = readAgentClass(
      existingProps,
      expectedAgentClass ?? "internal_operator"
    );
    if (isLegacyAutoRecoveryAssistantCandidate(existingActiveAgent)) {
      await ctx.db.patch(existingActiveAgent._id, {
        name: "One-of-One Operator",
        description: "Auto-created primary operator agent",
        customProperties: {
          ...existingProps,
          agentClass: normalizedExistingAgentClass,
          displayName: "One-of-One Operator",
          toolProfile: "admin",
        },
        updatedAt: Date.now(),
      });
    } else if (existingProps.agentClass !== normalizedExistingAgentClass) {
      await ctx.db.patch(existingActiveAgent._id, {
        customProperties: {
          ...existingProps,
          agentClass: normalizedExistingAgentClass,
        },
        updatedAt: Date.now(),
      });
    }
    return {
      agentId: existingActiveAgent._id,
      recoveryAction: "existing",
    };
  }

  const now = Date.now();
  const viableAgents = agents
    .filter((candidate) =>
      candidate.status !== "archived" &&
      candidate.status !== "deleted" &&
      candidate.status !== "template" &&
      (!recoverySubtype || normalizeOptionalString(candidate.subtype) === recoverySubtype) &&
      (!expectedAgentClass || readAgentClass(
        (candidate.customProperties as Record<string, unknown> | undefined) ?? {}
      ) === expectedAgentClass)
    )
    .sort(compareAgentsByPrimaryOrder);
  const reactivationCandidate =
    viableAgents.find((candidate) => isPrimaryFlagged(candidate)) || viableAgents[0];

  if (reactivationCandidate?._id) {
    if (reactivationCandidate.status !== "active") {
      await ctx.db.patch(reactivationCandidate._id, {
        status: "active",
        updatedAt: now,
      });
    }

    const operatorId = resolveOperatorContextId(reactivationCandidate);
    await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(args.organizationId),
      operatorId,
      forcePrimaryAgentId: String(reactivationCandidate._id),
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: reactivationCandidate._id,
      actionType: "activated_auto_recovery",
      actionData: {
        source: "ensureActiveAgentForOrgInternal",
        previousStatus: reactivationCandidate.status || null,
        channel: args.channel || null,
      },
      performedAt: now,
    });

    return {
      agentId: reactivationCandidate._id,
      recoveryAction: "reactivated",
    };
  }

  const defaultChannelBindings = args.channel
    ? normalizeChannelBindingsContract([{ channel: args.channel, enabled: true }])
    : undefined;
  const fallbackAgentClass = expectedAgentClass ?? "internal_operator";
  const agentId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: recoverySubtype || "general",
    name: "One-of-One Operator",
    description: "Auto-created primary operator agent",
    status: "active",
    customProperties: {
      agentClass: fallbackAgentClass,
      displayName: "One-of-One Operator",
      language: "en",
      voiceLanguage: "en",
      additionalLanguages: [],
      faqEntries: [],
      knowledgeBaseTags: [],
      toolProfile: "admin",
      enabledTools: [],
      disabledTools: [],
      autonomyLevel: "autonomous",
      maxMessagesPerDay: 100,
      maxCostPerDay: 5.0,
      requireApprovalFor: [],
      blockedTopics: [],
      modelProvider: "openrouter",
      modelId: ONBOARDING_DEFAULT_MODEL_ID,
      temperature: 0.7,
      maxTokens: 4096,
      channelBindings: defaultChannelBindings,
      unifiedPersonality: true,
      teamAccessMode: "invisible",
      dreamTeamSpecialists: [],
      activeSoulMode: "work",
      activeArchetype: null,
      modeChannelBindings: [],
      enabledArchetypes: [],
      creationSource: "admin_manual",
      operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
      isPrimary: true,
      operatorCollaborationDefaults: {
        ...DEFAULT_OPERATOR_COLLABORATION_DEFAULTS,
      },
      totalMessages: 0,
      totalCostUsd: 0,
    },
    createdAt: now,
    updatedAt: now,
  });

  await applyPrimaryAgentRepairsForOrganization(ctx, {
    organizationId: String(args.organizationId),
    operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
    forcePrimaryAgentId: String(agentId),
  });

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: agentId,
    actionType: "created_auto_recovery",
    actionData: {
      source: "ensureActiveAgentForOrgInternal",
      channel: args.channel || null,
    },
    performedAt: now,
  });

  return {
    agentId,
    recoveryAction: "created",
  };
}

async function resolveDefaultTemplateForOrgBootstrap(
  ctx: MutationCtx
): Promise<{
  template: {
    _id: Id<"objects">;
    organizationId: Id<"organizations">;
    type: string;
    subtype?: string;
    name: string;
    description?: string;
    status: string;
    customProperties?: Record<string, unknown>;
    createdBy?: Id<"users">;
    createdAt: number;
    updatedAt: number;
  };
  resolutionSource: "env_template_id" | "platform_template_role";
}> {
  const configuredTemplateId = resolveDefaultOrgAgentTemplateIdFromEnv();
  if (configuredTemplateId) {
    const configuredTemplate = await ctx.db.get(configuredTemplateId as Id<"objects">);
    if (!configuredTemplate || configuredTemplate.type !== "org_agent") {
      throw new Error(
        `${DEFAULT_ORG_AGENT_TEMPLATE_ID_ENV_KEY} does not resolve to an org_agent template (${configuredTemplateId}).`
      );
    }
    if (configuredTemplate.status !== "template") {
      throw new Error(
        `${DEFAULT_ORG_AGENT_TEMPLATE_ID_ENV_KEY} must point to a template-status org_agent (${configuredTemplateId}).`
      );
    }
    return {
      template: configuredTemplate as {
        _id: Id<"objects">;
        organizationId: Id<"organizations">;
        type: string;
        subtype?: string;
        name: string;
        description?: string;
        status: string;
        customProperties?: Record<string, unknown>;
        createdBy?: Id<"users">;
        createdAt: number;
        updatedAt: number;
      },
      resolutionSource: "env_template_id",
    };
  }

  const platformOrgId = resolvePlatformOrgIdFromEnv();
  if (!platformOrgId) {
    throw new Error(
      "Default org template resolution failed: PLATFORM_ORG_ID/TEST_ORG_ID is not configured."
    );
  }
  const platformAgents = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", platformOrgId).eq("type", "org_agent")
    )
    .collect();

  const templateCandidates = filterProtectedTemplateAgents(platformAgents, {
    templateRole: DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
  });
  const template = templateCandidates[0];
  if (!template || !template._id) {
    throw new Error(
      `Default org template role not found on platform org: ${DEFAULT_ORG_AGENT_TEMPLATE_ROLE}.`
    );
  }
  if (template.status !== "template") {
    throw new Error(
      `Default org template role is not template-status: ${DEFAULT_ORG_AGENT_TEMPLATE_ROLE}.`
    );
  }
  return {
    template: template as {
      _id: Id<"objects">;
      organizationId: Id<"organizations">;
      type: string;
      subtype?: string;
      name: string;
      description?: string;
      status: string;
      customProperties?: Record<string, unknown>;
      createdBy?: Id<"users">;
      createdAt: number;
      updatedAt: number;
    },
    resolutionSource: "platform_template_role",
  };
}

async function ensureManagedDefaultTemplateCloneForOrgHandler(
  ctx: MutationCtx,
  args: EnsureActiveAgentForOrgArgs
): Promise<{
  agentId: Id<"objects">;
  provisioningAction:
    | "template_clone_created"
    | "template_clone_updated"
    | "template_clone_promoted_legacy";
  templateAgentId: Id<"objects">;
  templateResolutionSource: "env_template_id" | "platform_template_role";
}> {
  const now = Date.now();
  const recoverySubtype = resolveRecoverySubtype({
    channel: args.channel,
    subtype: args.subtype,
  });
  const resolvedTemplate = await resolveDefaultTemplateForOrgBootstrap(ctx);
  const template = resolvedTemplate.template;
  const templateProps =
    (template.customProperties as Record<string, unknown> | undefined) ?? {};
  const templateLifecycleStatus = normalizeTemplateLifecycleStatus(
    templateProps.templateLifecycleStatus
  );
  if (templateLifecycleStatus === "deprecated") {
    throw new Error("Default org template is deprecated and cannot be provisioned.");
  }

  const templateVersion = resolveDefaultOrgTemplateVersionTag({
    templateId: template._id,
    templateUpdatedAt: template.updatedAt,
    templateCustomProperties: templateProps,
  });
  const templateBaseline = pickTemplateBaselineSnapshot(templateProps);
  const syncJobId = buildOrgDefaultTemplateSyncJobId({
    organizationId: args.organizationId,
    templateId: template._id,
    templateVersion,
  });
  const defaultChannelBindings = args.channel
    ? normalizeChannelBindingsContract([{ channel: args.channel, enabled: true }])
    : undefined;

  const orgAgents = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "org_agent")
    )
    .collect();

  const existingClone = orgAgents
    .filter((agent) => {
      const props = (agent.customProperties as Record<string, unknown> | undefined) ?? {};
      return resolveTemplateSourceId(props) === String(template._id);
    })
    .sort((left, right) => String(left._id).localeCompare(String(right._id)))[0];

  if (existingClone?._id) {
    const existingProps =
      (existingClone.customProperties as Record<string, unknown> | undefined) ?? {};
    const existingLinkage = readTemplateCloneLinkageContract(existingProps);
    const templateCloneLinkage = buildManagedTemplateCloneLinkage({
      sourceTemplateId: String(template._id),
      sourceTemplateVersion: templateVersion,
      overridePolicy: existingLinkage?.overridePolicy,
      lastTemplateSyncAt: now,
      lastTemplateSyncJobId: syncJobId,
      cloneLifecycleState: existingLinkage?.cloneLifecycleState,
    });
    const nextCustomProperties: Record<string, unknown> = {
      ...existingProps,
      templateAgentId: template._id,
      templateVersion,
      cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
      templateCloneLinkage,
      lastTemplateSyncAt: now,
      lastTemplateJobId: syncJobId,
      creationSource: "catalog_clone",
      protected: false,
      operatorId: normalizeOptionalString(existingProps.operatorId) || DEFAULT_OPERATOR_CONTEXT_ID,
      isPrimary: true,
    };
    if (!Array.isArray(nextCustomProperties.channelBindings) && defaultChannelBindings) {
      nextCustomProperties.channelBindings = defaultChannelBindings;
    }
    await ctx.db.patch(existingClone._id, {
      subtype: template.subtype || recoverySubtype || existingClone.subtype || "general",
      status: "active",
      customProperties: nextCustomProperties,
      updatedAt: now,
    });

    await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(args.organizationId),
      operatorId: String(nextCustomProperties.operatorId || DEFAULT_OPERATOR_CONTEXT_ID),
      forcePrimaryAgentId: String(existingClone._id),
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: existingClone._id,
      actionType: "org_default_template_clone_upserted",
      actionData: {
        source: "ensureTemplateManagedDefaultAgentForOrgInternal",
        mode: "existing_clone",
        channel: args.channel || null,
        templateAgentId: String(template._id),
        templateVersion,
        templateResolutionSource: resolvedTemplate.resolutionSource,
        syncJobId,
      },
      performedAt: now,
    });

    return {
      agentId: existingClone._id,
      provisioningAction: "template_clone_updated",
      templateAgentId: template._id,
      templateResolutionSource: resolvedTemplate.resolutionSource,
    };
  }

  const legacyPromotionCandidate = orgAgents
    .filter((agent) =>
      (!recoverySubtype || normalizeOptionalString(agent.subtype) === recoverySubtype)
      && isLegacyAutoProvisionUpgradeCandidate(agent)
    )
    .sort(compareAgentsByPrimaryOrder)[0];

  if (legacyPromotionCandidate?._id) {
    const legacyProps =
      (legacyPromotionCandidate.customProperties as Record<string, unknown> | undefined) ?? {};
    const legacyLinkage = readTemplateCloneLinkageContract(legacyProps);
    const templateCloneLinkage = buildManagedTemplateCloneLinkage({
      sourceTemplateId: String(template._id),
      sourceTemplateVersion: templateVersion,
      overridePolicy: legacyLinkage?.overridePolicy,
      lastTemplateSyncAt: now,
      lastTemplateSyncJobId: syncJobId,
      cloneLifecycleState: legacyLinkage?.cloneLifecycleState,
    });
    const nextCustomProperties: Record<string, unknown> = {
      ...templateBaseline,
      ...legacyProps,
      templateAgentId: template._id,
      templateVersion,
      cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
      templateCloneLinkage,
      lastTemplateSyncAt: now,
      lastTemplateJobId: syncJobId,
      creationSource: "catalog_clone",
      protected: false,
      operatorId: normalizeOptionalString(legacyProps.operatorId) || DEFAULT_OPERATOR_CONTEXT_ID,
      isPrimary: true,
      totalMessages: typeof legacyProps.totalMessages === "number" ? legacyProps.totalMessages : 0,
      totalCostUsd: typeof legacyProps.totalCostUsd === "number" ? legacyProps.totalCostUsd : 0,
    };
    if (!Array.isArray(nextCustomProperties.channelBindings) && defaultChannelBindings) {
      nextCustomProperties.channelBindings = defaultChannelBindings;
    }

    await ctx.db.patch(legacyPromotionCandidate._id, {
      subtype: template.subtype || recoverySubtype || legacyPromotionCandidate.subtype || "general",
      name: template.name,
      description:
        normalizeOptionalString(template.description)
        || normalizeOptionalString(legacyPromotionCandidate.description)
        || "Auto-provisioned default template clone",
      status: "active",
      customProperties: nextCustomProperties,
      updatedAt: now,
    });

    await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(args.organizationId),
      operatorId: String(nextCustomProperties.operatorId || DEFAULT_OPERATOR_CONTEXT_ID),
      forcePrimaryAgentId: String(legacyPromotionCandidate._id),
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: legacyPromotionCandidate._id,
      actionType: "org_default_template_clone_upserted",
      actionData: {
        source: "ensureTemplateManagedDefaultAgentForOrgInternal",
        mode: "promoted_legacy",
        channel: args.channel || null,
        templateAgentId: String(template._id),
        templateVersion,
        templateResolutionSource: resolvedTemplate.resolutionSource,
        syncJobId,
      },
      performedAt: now,
    });

    return {
      agentId: legacyPromotionCandidate._id,
      provisioningAction: "template_clone_promoted_legacy",
      templateAgentId: template._id,
      templateResolutionSource: resolvedTemplate.resolutionSource,
    };
  }

  const customProperties: Record<string, unknown> = {
    ...templateBaseline,
    agentClass: normalizeAgentClass(templateBaseline.agentClass, "internal_operator"),
    protected: false,
    templateAgentId: template._id,
    templateVersion,
    cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
    templateCloneLinkage: buildManagedTemplateCloneLinkage({
      sourceTemplateId: String(template._id),
      sourceTemplateVersion: templateVersion,
      lastTemplateSyncAt: now,
      lastTemplateSyncJobId: syncJobId,
    }),
    lastTemplateSyncAt: now,
    lastTemplateJobId: syncJobId,
    creationSource: "catalog_clone",
    operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
    isPrimary: true,
    totalMessages:
      typeof templateBaseline.totalMessages === "number" ? templateBaseline.totalMessages : 0,
    totalCostUsd:
      typeof templateBaseline.totalCostUsd === "number" ? templateBaseline.totalCostUsd : 0,
  };
  if (!Array.isArray(customProperties.channelBindings) && defaultChannelBindings) {
    customProperties.channelBindings = defaultChannelBindings;
  }

  const cloneId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: template.subtype || recoverySubtype || "general",
    name: template.name,
    description:
      normalizeOptionalString(template.description) ||
      "Auto-provisioned default template clone",
    status: "active",
    customProperties,
    createdBy: template.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  await applyPrimaryAgentRepairsForOrganization(ctx, {
    organizationId: String(args.organizationId),
    operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
    forcePrimaryAgentId: String(cloneId),
  });

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: cloneId,
    actionType: "org_default_template_clone_upserted",
    actionData: {
      source: "ensureTemplateManagedDefaultAgentForOrgInternal",
      mode: "created",
      channel: args.channel || null,
      templateAgentId: String(template._id),
      templateVersion,
      templateResolutionSource: resolvedTemplate.resolutionSource,
      syncJobId,
    },
    performedAt: now,
  });

  return {
    agentId: cloneId,
    provisioningAction: "template_clone_created",
    templateAgentId: template._id,
    templateResolutionSource: resolvedTemplate.resolutionSource,
  };
}

export const ensureActiveAgentForOrgInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.string()),
    subtype: v.optional(v.string()),
    routeSelectors: v.optional(v.object({
      channel: v.optional(v.string()),
      providerId: v.optional(v.string()),
      account: v.optional(v.string()),
      team: v.optional(v.string()),
      peer: v.optional(v.string()),
      channelRef: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => ensureActiveAgentForOrgInternalHandler(ctx, args),
});

/**
 * INTERNAL: Provision the org's default agent as a managed template clone.
 * Fail-closed behavior: falls back to ensureActiveAgentForOrgInternal recovery.
 */
export const ensureTemplateManagedDefaultAgentForOrgInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.string()),
    subtype: v.optional(v.string()),
    routeSelectors: v.optional(v.object({
      channel: v.optional(v.string()),
      providerId: v.optional(v.string()),
      account: v.optional(v.string()),
      team: v.optional(v.string()),
      peer: v.optional(v.string()),
      channelRef: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    try {
      const provisioned = await ensureManagedDefaultTemplateCloneForOrgHandler(ctx, args);
      return {
        agentId: provisioned.agentId,
        provisioningAction: provisioned.provisioningAction,
        fallbackUsed: false,
        templateAgentId: provisioned.templateAgentId,
        templateResolutionSource: provisioned.templateResolutionSource,
      };
    } catch (error) {
      const fallback = await ensureActiveAgentForOrgInternalHandler(ctx, args);
      return {
        agentId: fallback.agentId,
        provisioningAction: `fallback_${fallback.recoveryAction}` as const,
        fallbackUsed: true,
        templateAgentId: null,
        templateResolutionSource: null,
        fallbackReason: error instanceof Error ? error.message : "unknown_template_provisioning_error",
      };
    }
  },
});

/**
 * GET PRIMARY AGENT FOR ORG
 * Returns the primary agent in the caller's operator context.
 */
export const getPrimaryAgentForOrg = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    operatorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const operatorId = normalizeOptionalString(args.operatorId) || String(auth.userId);

    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    const operatorScopedPrimary = resolvePrimaryAgentForContext(agents, operatorId);
    if (operatorScopedPrimary) {
      return operatorScopedPrimary;
    }

    // Legacy compatibility: many existing orgs only have __org_default__ primary assignment.
    // Fallback keeps routing stable while operator-context backfill catches up.
    return resolvePrimaryAgentForContext(agents, DEFAULT_OPERATOR_CONTEXT_ID);
  },
});

/**
 * INTERNAL: Repair primary agent flags for all operator contexts in an org.
 * Idempotent: safe to run repeatedly.
 */
export const repairPrimaryAgentContextsForOrgInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    operatorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const repairs = await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(args.organizationId),
      operatorId: normalizeOptionalString(args.operatorId),
    });
    return {
      organizationId: args.organizationId,
      repairedContexts: repairs.length,
      patchedAgentCount: repairs.reduce(
        (sum, entry) => sum + entry.patchedAgentIds.length,
        0
      ),
      repairs,
    };
  },
});

// ============================================================================
// PROTECTION HELPERS
// ============================================================================

/**
 * Throws if the agent is a protected system agent.
 * Protected agents (e.g. Quinn template) cannot be modified via user mutations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enforceNotProtected(agent: { customProperties?: Record<string, any> }) {
  const props = agent.customProperties as Record<string, unknown> | undefined;
  if (props?.protected) {
    throw new Error("Cannot modify protected system agent");
  }
}

async function enforceOneOfOneOperatorMutationAccess(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    agent: ActiveAgentCandidate;
    operation: "update" | "set_primary" | "activate" | "pause" | "delete";
    updatedFields?: string[];
  }
) {
  const userContext = await getUserContext(ctx, args.userId, args.organizationId);
  const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
  // Role boundary lock:
  // - super_admin can perform global template/platform operations.
  // - org-scoped users can only mutate owner context within one-of-one guardrails.
  if (isSuperAdmin) {
    return;
  }

  const operatorId = resolveOperatorContextId(args.agent);
  const expectedOperatorId = String(args.userId);
  const operatorOwnsAgent =
    operatorId === expectedOperatorId
    || (
      operatorId === DEFAULT_OPERATOR_CONTEXT_ID
      && userContext.roleName === "org_owner"
    );

  if (!operatorOwnsAgent) {
    throw new Error(
      "ONE_OF_ONE_AGENT_ACCESS_DENIED: only super_admin can manage non-owner agents."
    );
  }

  if (isPrimaryFlagged(args.agent)) {
    return;
  }

  if (args.operation === "set_primary") {
    return;
  }

  if (args.operation === "update" && isManagedUseCaseCloneCandidate(args.agent)) {
    const disallowedFields = resolveDisallowedManagedCloneTuningFields(
      args.updatedFields ?? []
    );
    if (disallowedFields.length === 0) {
      return;
    }
    throw new Error(
      `ONE_OF_ONE_MANAGED_CLONE_TUNING_FIELD_FORBIDDEN: disallowed update fields: ${disallowedFields.join(", ")}`
    );
  }

  throw new Error(
    "ONE_OF_ONE_PRIMARY_AGENT_REQUIRED: operator edits are limited to the primary one-of-one agent."
  );
}

// ============================================================================
// AGENT MUTATIONS
// ============================================================================

export const createAgentTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    displayName: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    toolProfile: v.optional(v.string()),
    enabledTools: v.optional(v.array(v.string())),
    disabledTools: v.optional(v.array(v.string())),
    autonomyLevel: v.optional(v.union(
      v.literal("supervised"),
      v.literal("sandbox"),
      v.literal("autonomous"),
      v.literal("delegation"),
      v.literal("draft_only"),
    )),
    modelProvider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    templateRole: v.optional(v.string()),
    templateLayer: v.optional(v.string()),
    templatePlaybook: v.optional(v.string()),
    protectedTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminMutationSession(ctx, args.sessionId);
    const now = Date.now();

    const customProperties = {
      displayName: args.displayName || args.name,
      systemPrompt: args.systemPrompt,
      toolProfile: args.toolProfile || SUBTYPE_DEFAULT_PROFILES[args.subtype] || "general",
      enabledTools: args.enabledTools || [],
      disabledTools: args.disabledTools || [],
      autonomyLevel: args.autonomyLevel || "autonomous",
      modelProvider: args.modelProvider || "openrouter",
      modelId: args.modelId || ONBOARDING_DEFAULT_MODEL_ID,
      templateRole: args.templateRole,
      templateLayer: args.templateLayer,
      templatePlaybook: args.templatePlaybook,
      protected: args.protectedTemplate === true,
      templateLifecycleContractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
      templateLifecycleStatus: "draft" as AgentTemplateLifecycleStatus,
      templateLifecycleUpdatedAt: now,
      templateLifecycleUpdatedBy: String(actor.userId),
    };

    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: AGENT_TEMPLATE_OBJECT_TYPE,
      subtype: args.subtype,
      name: args.name,
      description: args.description || `${args.subtype} template`,
      status: "template",
      customProperties,
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    });

    await writeTemplateLifecycleAuditEvent({
      ctx,
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "agent_template.created",
      actor,
      objectScope: {
        scope: "global_template",
        templateId: String(templateId),
      },
      before: {},
      after: {
        lifecycleStatus: "draft",
        subtype: args.subtype,
        templateRole: args.templateRole || null,
      },
      summary: {
        event: "template_created",
        createdFrom: "super_admin_manual",
      },
      timestamp: now,
    });

    return {
      templateId,
      lifecycleStatus: "draft" as AgentTemplateLifecycleStatus,
    };
  },
});

export const createAgentTemplateVersionSnapshot = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    versionTag: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminMutationSession(ctx, args.sessionId);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== AGENT_TEMPLATE_OBJECT_TYPE || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }

    const now = Date.now();
    const templateProps =
      (template.customProperties as Record<string, unknown> | undefined) ?? {};
    const normalizedVersionTag =
      normalizeOptionalString(args.versionTag) ||
      `${String(args.templateId)}@${template.updatedAt || now}`;

    const existingVersions = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", template.organizationId).eq("type", AGENT_TEMPLATE_VERSION_OBJECT_TYPE)
      )
      .collect();
    const duplicateVersion = existingVersions.find((row) => {
      const props = row.customProperties as Record<string, unknown> | undefined;
      return (
        normalizeOptionalString(props?.sourceTemplateId) === String(args.templateId)
        && normalizeOptionalString(props?.versionTag) === normalizedVersionTag
      );
    });
    if (duplicateVersion) {
      throw new ConvexError({
        code: "CONFLICT",
        message: `Template version '${normalizedVersionTag}' already exists.`,
      });
    }

    const snapshot = {
      name: template.name,
      description: template.description,
      subtype: template.subtype,
      status: template.status,
      baselineCustomProperties: pickTemplateBaselineSnapshot(templateProps),
    };

    const versionObjectId = await ctx.db.insert("objects", {
      organizationId: template.organizationId,
      type: AGENT_TEMPLATE_VERSION_OBJECT_TYPE,
      subtype: normalizeOptionalString(template.subtype) || "general",
      name: `${template.name} @ ${normalizedVersionTag}`,
      description: `Immutable snapshot for template ${template.name}`,
      status: "template_version",
      customProperties: {
        sourceTemplateId: String(args.templateId),
        sourceTemplateName: template.name,
        versionTag: normalizedVersionTag,
        lifecycleStatus: "draft" as AgentTemplateVersionLifecycleStatus,
        immutableSnapshot: true,
        summary: normalizeOptionalString(args.summary),
        snapshotCreatedAt: now,
        snapshotCreatedBy: String(actor.userId),
        snapshot,
      },
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.templateId, {
      customProperties: {
        ...templateProps,
        templateCurrentVersion: normalizedVersionTag,
        templateLastVersionSnapshotId: String(versionObjectId),
        templateLifecycleContractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
        templateLifecycleUpdatedAt: now,
        templateLifecycleUpdatedBy: String(actor.userId),
      },
      updatedAt: now,
    });

    await writeTemplateLifecycleAuditEvent({
      ctx,
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "agent_template.version_snapshot_created",
      actor,
      objectScope: {
        scope: "template_version",
        templateId: String(args.templateId),
        templateVersionId: String(versionObjectId),
        templateVersionTag: normalizedVersionTag,
      },
      before: {
        templateCurrentVersion:
          normalizeOptionalString(templateProps.templateCurrentVersion) || null,
        templateLastVersionSnapshotId:
          normalizeOptionalString(templateProps.templateLastVersionSnapshotId) || null,
      },
      after: {
        templateCurrentVersion: normalizedVersionTag,
        templateLastVersionSnapshotId: String(versionObjectId),
      },
      summary: {
        event: "template_version_snapshot_created",
        immutableSnapshot: true,
      },
      timestamp: now,
    });

    return {
      templateId: args.templateId,
      templateVersionId: versionObjectId,
      versionTag: normalizedVersionTag,
      lifecycleStatus: "draft" as AgentTemplateVersionLifecycleStatus,
    };
  },
});

export const publishAgentTemplateVersion = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    templateVersionId: v.id("objects"),
    publishReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminMutationSession(ctx, args.sessionId);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== AGENT_TEMPLATE_OBJECT_TYPE || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }
    const version = await ctx.db.get(args.templateVersionId);
    if (!version || version.type !== AGENT_TEMPLATE_VERSION_OBJECT_TYPE) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template version snapshot not found.",
      });
    }
    const versionProps =
      (version.customProperties as Record<string, unknown> | undefined) ?? {};
    const sourceTemplateId = normalizeOptionalString(versionProps.sourceTemplateId);
    if (sourceTemplateId !== String(args.templateId)) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Template version does not belong to template.",
      });
    }

    const now = Date.now();
    const templateProps =
      (template.customProperties as Record<string, unknown> | undefined) ?? {};
    const versionTag = normalizeOptionalString(versionProps.versionTag);
    if (!versionTag) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Template version snapshot is missing versionTag.",
      });
    }
    const currentVersionLifecycle = normalizeTemplateVersionLifecycleStatus(
      versionProps.lifecycleStatus
    );
    if (currentVersionLifecycle === "deprecated") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Deprecated template version cannot be published.",
      });
    }

    const waeGate = await evaluateWaeRolloutGateForTemplateVersion(ctx, {
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      templateVersionTag: versionTag,
      now,
    });
    if (!waeGate.allowed) {
      await writeTemplateWaeGateBlockedEvent({
        ctx,
        organizationId: template.organizationId,
        objectId: args.templateVersionId,
        actionType: "agent_template.publish_blocked_wae_gate",
        actor,
        resource: "template_version",
        resourceId: String(args.templateVersionId),
        templateId: String(args.templateId),
        templateVersionId: String(args.templateVersionId),
        templateVersionTag: versionTag,
        reasonCode: waeGate.reasonCode ?? "wae_gate_failed",
        message: waeGate.message || "WAE rollout gate blocked template publication.",
        gate: waeGate.gate,
        timestamp: now,
      });
      throw new ConvexError({
        code: "INVALID_STATE",
        message: waeGate.message || "WAE rollout gate blocked template publication.",
      });
    }

    await ctx.db.patch(args.templateVersionId, {
      customProperties: {
        ...versionProps,
        lifecycleStatus: "published",
        publishedAt: now,
        publishedBy: String(actor.userId),
      },
      updatedAt: now,
    });

    await ctx.db.patch(args.templateId, {
      customProperties: {
        ...templateProps,
        templateVersion: versionTag,
        templatePublishedVersion: versionTag,
        templatePublishedVersionId: String(args.templateVersionId),
        templateCurrentVersion: versionTag,
        templateLifecycleContractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
        templateLifecycleStatus: "published",
        templateLifecycleUpdatedAt: now,
        templateLifecycleUpdatedBy: String(actor.userId),
      },
      updatedAt: now,
    });

    await writeTemplateLifecycleAuditEvent({
      ctx,
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "agent_template.version_published",
      actor,
      objectScope: {
        scope: "template_version",
        templateId: String(args.templateId),
        templateVersionId: String(args.templateVersionId),
        templateVersionTag: versionTag,
      },
      before: {
        templateLifecycleStatus: normalizeTemplateLifecycleStatus(
          templateProps.templateLifecycleStatus
        ),
        templatePublishedVersion:
          normalizeOptionalString(templateProps.templatePublishedVersion) || null,
        versionLifecycleStatus: currentVersionLifecycle,
      },
      after: {
        templateLifecycleStatus: "published",
        templatePublishedVersion: versionTag,
        versionLifecycleStatus: "published",
      },
      summary: {
        event: "template_version_published",
        publishReason: normalizeOptionalString(args.publishReason) || null,
      },
      timestamp: now,
    });

    return {
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      publishedVersion: versionTag,
      templateLifecycleStatus: "published" as AgentTemplateLifecycleStatus,
      versionLifecycleStatus: "published" as AgentTemplateVersionLifecycleStatus,
    };
  },
});

export const deprecateAgentTemplateLifecycle = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    target: v.union(v.literal("template"), v.literal("version")),
    templateVersionId: v.optional(v.id("objects")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminMutationSession(ctx, args.sessionId);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== AGENT_TEMPLATE_OBJECT_TYPE || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }

    const now = Date.now();
    const templateProps =
      (template.customProperties as Record<string, unknown> | undefined) ?? {};
    const normalizedReason = normalizeOptionalString(args.reason) || null;

    if (args.target === "template") {
      await ctx.db.patch(args.templateId, {
        customProperties: {
          ...templateProps,
          templateLifecycleContractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
          templateLifecycleStatus: "deprecated",
          templateDeprecatedAt: now,
          templateDeprecatedBy: String(actor.userId),
          templateDeprecationReason: normalizedReason,
          templateLifecycleUpdatedAt: now,
          templateLifecycleUpdatedBy: String(actor.userId),
        },
        updatedAt: now,
      });

      await writeTemplateLifecycleAuditEvent({
        ctx,
        organizationId: template.organizationId,
        objectId: args.templateId,
        actionType: "agent_template.deprecated",
        actor,
        objectScope: {
          scope: "global_template",
          templateId: String(args.templateId),
        },
        before: {
          templateLifecycleStatus: normalizeTemplateLifecycleStatus(
            templateProps.templateLifecycleStatus
          ),
          templateDeprecatedAt:
            typeof templateProps.templateDeprecatedAt === "number"
              ? templateProps.templateDeprecatedAt
              : null,
        },
        after: {
          templateLifecycleStatus: "deprecated",
          templateDeprecatedAt: now,
        },
        summary: {
          event: "template_deprecated",
          reason: normalizedReason,
        },
        timestamp: now,
      });

      return {
        target: "template" as const,
        templateId: args.templateId,
        lifecycleStatus: "deprecated" as AgentTemplateLifecycleStatus,
      };
    }

    if (!args.templateVersionId) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "templateVersionId is required when target=version.",
      });
    }

    const version = await ctx.db.get(args.templateVersionId);
    if (!version || version.type !== AGENT_TEMPLATE_VERSION_OBJECT_TYPE) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template version snapshot not found.",
      });
    }
    const versionProps =
      (version.customProperties as Record<string, unknown> | undefined) ?? {};
    const versionTemplateId = normalizeOptionalString(versionProps.sourceTemplateId);
    if (versionTemplateId !== String(args.templateId)) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Template version does not belong to template.",
      });
    }
    const versionTag = normalizeOptionalString(versionProps.versionTag) || String(args.templateVersionId);

    await ctx.db.patch(args.templateVersionId, {
      customProperties: {
        ...versionProps,
        lifecycleStatus: "deprecated",
        deprecatedAt: now,
        deprecatedBy: String(actor.userId),
        deprecationReason: normalizedReason,
      },
      updatedAt: now,
    });

    await writeTemplateLifecycleAuditEvent({
      ctx,
      organizationId: template.organizationId,
      objectId: args.templateVersionId,
      actionType: "agent_template.version_deprecated",
      actor,
      objectScope: {
        scope: "template_version",
        templateId: String(args.templateId),
        templateVersionId: String(args.templateVersionId),
        templateVersionTag: versionTag,
      },
      before: {
        versionLifecycleStatus: normalizeTemplateVersionLifecycleStatus(
          versionProps.lifecycleStatus
        ),
      },
      after: {
        versionLifecycleStatus: "deprecated",
      },
      summary: {
        event: "template_version_deprecated",
        reason: normalizedReason,
      },
      timestamp: now,
    });

    return {
      target: "version" as const,
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      templateVersionTag: versionTag,
      lifecycleStatus: "deprecated" as AgentTemplateVersionLifecycleStatus,
    };
  },
});

export const distributeAgentTemplateToOrganizations = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    templateVersionId: v.optional(v.id("objects")),
    targetOrganizationIds: v.array(v.id("organizations")),
    stagedRollout: v.optional(v.object({
      stageSize: v.number(),
      stageStartIndex: v.optional(v.number()),
    })),
    dryRun: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    distributionJobId: v.optional(v.string()),
    operationKind: v.optional(v.union(v.literal("rollout_apply"), v.literal("rollout_rollback"))),
    overridePolicyGate: v.optional(v.object({
      confirmWarnOverride: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminMutationSession(ctx, args.sessionId);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== AGENT_TEMPLATE_OBJECT_TYPE || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }

    const templateProps =
      (template.customProperties as Record<string, unknown> | undefined) ?? {};
    const templateLifecycle = normalizeTemplateLifecycleStatus(
      templateProps.templateLifecycleStatus
    );
    if (templateLifecycle === "deprecated") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Deprecated templates cannot be distributed.",
      });
    }

    const templateVersion = args.templateVersionId
      ? await ctx.db.get(args.templateVersionId)
      : null;
    if (args.templateVersionId && (!templateVersion || templateVersion.type !== AGENT_TEMPLATE_VERSION_OBJECT_TYPE)) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template version snapshot not found.",
      });
    }
    const templateVersionProps =
      (templateVersion?.customProperties as Record<string, unknown> | undefined) ?? {};
    if (templateVersion) {
      const sourceTemplateId = normalizeOptionalString(templateVersionProps.sourceTemplateId);
      if (sourceTemplateId !== String(args.templateId)) {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "Template version does not belong to template.",
        });
      }
      const versionLifecycle = normalizeTemplateVersionLifecycleStatus(
        templateVersionProps.lifecycleStatus
      );
      if (versionLifecycle === "deprecated") {
        throw new ConvexError({
          code: "INVALID_STATE",
          message: "Deprecated template versions cannot be distributed.",
        });
      }
    }

    const resolvedVersionTag =
      resolveTemplateVersionTagFromVersionObject(templateVersionProps) ||
      normalizeOptionalString(templateProps.templatePublishedVersion) ||
      normalizeOptionalString(templateProps.templateVersion) ||
      `${String(args.templateId)}@${template.updatedAt}`;
    const resolvedTemplateVersionId =
      args.templateVersionId
      ?? (
        normalizeOptionalString(templateProps.templatePublishedVersionId) as Id<"objects"> | null
      );

    const snapshotBaseline = templateVersion
      ? (
          (
            templateVersionProps.snapshot as
              | Record<string, unknown>
              | undefined
          )?.baselineCustomProperties as Record<string, unknown> | undefined
        ) ?? pickTemplateBaselineSnapshot(templateProps)
      : pickTemplateBaselineSnapshot(templateProps);

    const requestedTargetOrganizationIds = dedupeAndSortObjectIds(args.targetOrganizationIds);
    const rawStageSize = args.stagedRollout?.stageSize;
    const rawStageStartIndex = args.stagedRollout?.stageStartIndex ?? 0;
    if (rawStageSize !== undefined) {
      if (!Number.isInteger(rawStageSize) || rawStageSize < 1) {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "stagedRollout.stageSize must be an integer greater than 0.",
        });
      }
    }
    if (!Number.isInteger(rawStageStartIndex) || rawStageStartIndex < 0) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "stagedRollout.stageStartIndex must be a non-negative integer.",
      });
    }
    const stageSize = rawStageSize ?? requestedTargetOrganizationIds.length;
    const stageStartIndex = rawStageStartIndex;
    const targetOrganizationIds = requestedTargetOrganizationIds.slice(
      Math.min(stageStartIndex, requestedTargetOrganizationIds.length),
      Math.min(stageStartIndex + stageSize, requestedTargetOrganizationIds.length),
    );
    const deterministicJobId =
      normalizeOptionalString(args.distributionJobId) ||
      buildDeterministicTemplateDistributionJobId({
        templateId: String(args.templateId),
        templateVersionTag: resolvedVersionTag,
        targetOrganizationIds: targetOrganizationIds.map((value) => String(value)),
      });
    const dryRun = args.dryRun === true;
    const operationKind: TemplateDistributionOperationKind =
      args.operationKind === "rollout_rollback" ? "rollout_rollback" : "rollout_apply";
    const now = Date.now();
    const normalizedReason = normalizeOptionalString(args.reason) || "template_distribution_rollout";
    const normalizedOverrideReason =
      normalizeOptionalString(args.overridePolicyGate?.reason) || null;
    const warnConfirmationAccepted =
      args.overridePolicyGate?.confirmWarnOverride === true &&
      normalizedOverrideReason !== null;

    const waeGate = await evaluateWaeRolloutGateForTemplateVersion(ctx, {
      templateId: args.templateId,
      templateVersionId: resolvedTemplateVersionId,
      templateVersionTag: resolvedVersionTag,
      now,
    });
    if (!waeGate.allowed) {
      await writeTemplateWaeGateBlockedEvent({
        ctx,
        organizationId: template.organizationId,
        objectId: args.templateId,
        actionType: "agent_template.distribution_blocked_wae_gate",
        actor,
        resource: "global_template",
        resourceId: String(args.templateId),
        templateId: String(args.templateId),
        templateVersionId: resolvedTemplateVersionId ? String(resolvedTemplateVersionId) : null,
        templateVersionTag: resolvedVersionTag,
        reasonCode: waeGate.reasonCode ?? "wae_gate_failed",
        message: waeGate.message || "WAE rollout gate blocked template distribution.",
        gate: waeGate.gate,
        timestamp: now,
      });
      throw new ConvexError({
        code: "INVALID_STATE",
        message: waeGate.message || "WAE rollout gate blocked template distribution.",
      });
    }

    const plan: Array<{
      organizationId: Id<"organizations">;
      operation: TemplateDistributionOperation;
      reason: string;
      existingCloneId?: Id<"objects">;
      changedFields: string[];
      writableTemplateFields: TemplateCloneDriftField[];
      policyGate?: TemplateOverrideGateSummary;
    }> = [];
    const applyResults: Array<{
      organizationId: Id<"organizations">;
      cloneAgentId?: Id<"objects">;
      operation: TemplateDistributionOperation;
      reason?: string;
      policyGate?: TemplateOverrideGateSummary;
    }> = [];

    for (const organizationId of targetOrganizationIds) {
      const orgAgents = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", organizationId).eq("type", "org_agent")
        )
        .collect();

      const managedTemplateClones = orgAgents
        .filter((agent) => {
          const customProperties =
            (agent.customProperties as Record<string, unknown> | undefined) ?? {};
          return resolveTemplateSourceId(customProperties) === String(args.templateId);
        })
        .sort((left, right) => String(left._id).localeCompare(String(right._id)));

      const existingClone = managedTemplateClones[0];
      if (!existingClone) {
        plan.push({
          organizationId,
          operation: "create",
          reason: "missing_clone",
          changedFields: [
            "templateAgentId",
            "templateVersion",
            "templateCloneLinkage",
          ],
          writableTemplateFields: [],
        });
        continue;
      }

      const existingProps =
        (existingClone.customProperties as Record<string, unknown> | undefined) ?? {};
      const existingLinkage = readTemplateCloneLinkageContract(existingProps);
      const nextLinkage = buildManagedTemplateCloneLinkage({
        sourceTemplateId: String(args.templateId),
        sourceTemplateVersion: resolvedVersionTag,
        overridePolicy: existingLinkage?.overridePolicy,
        lastTemplateSyncAt: now,
        lastTemplateSyncJobId: deterministicJobId,
        cloneLifecycleState: existingLinkage?.cloneLifecycleState,
      });

      const before = {
        templateVersion: normalizeOptionalString(existingProps.templateVersion) || null,
        templateAgentId: normalizeOptionalString(existingProps.templateAgentId) || null,
        templateCloneLinkage: existingProps.templateCloneLinkage || null,
      };
      const after = {
        templateVersion: resolvedVersionTag,
        templateAgentId: String(args.templateId),
        templateCloneLinkage: nextLinkage,
      };
      const changedFields = deriveChangedFields(before, after);
      const changedTemplateFields = TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS.filter((field) => {
        const existingValue = normalizeComparableTemplateCloneFieldValue(
          field,
          existingProps[field]
        );
        const templateValue = normalizeComparableTemplateCloneFieldValue(
          field,
          snapshotBaseline[field]
        );
        return JSON.stringify(existingValue) !== JSON.stringify(templateValue);
      });
      const overrideGateUpdates = Object.fromEntries(
        changedTemplateFields
          .filter((field) => Object.prototype.hasOwnProperty.call(existingProps, field))
          .map((field) => [field, snapshotBaseline[field]])
      );
      const overrideGate = resolveTemplateOverrideGateForManagedClone({
        customProperties: existingProps,
        updates: overrideGateUpdates,
        warnConfirmation: warnConfirmationAccepted,
        reason: normalizedOverrideReason,
      });
      const writableTemplateFields = changedTemplateFields.filter((field) => {
        if (!overrideGate?.changedFields.includes(field)) {
          return true;
        }
        return !overrideGate.lockedFields.includes(field);
      });
      const blockedByLocked = (overrideGate?.lockedFields.length || 0) > 0;
      const blockedByWarn =
        overrideGate?.decision === "blocked_warn_confirmation_required";
      const finalChangedFields = normalizeDeterministicUpdatedFields([
        ...changedFields,
        ...writableTemplateFields,
      ]);
      if (finalChangedFields.length === 0) {
        plan.push({
          organizationId,
          existingCloneId: existingClone._id,
          operation: "skip",
          reason: "already_in_sync",
          changedFields: finalChangedFields,
          writableTemplateFields,
          policyGate: overrideGate || undefined,
        });
      } else if (blockedByLocked || blockedByWarn) {
        plan.push({
          organizationId,
          existingCloneId: existingClone._id,
          operation: "blocked",
          reason: blockedByLocked
            ? "locked_override_fields"
            : "warn_override_confirmation_required",
          changedFields: finalChangedFields,
          writableTemplateFields,
          policyGate: overrideGate || undefined,
        });
      } else {
        plan.push({
          organizationId,
          existingCloneId: existingClone._id,
          operation: "update",
          reason: "template_version_drift",
          changedFields: finalChangedFields,
          writableTemplateFields,
          policyGate: overrideGate || undefined,
        });
      }
    }

    if (!dryRun) {
      for (const row of plan) {
        if (row.operation === "skip") {
          applyResults.push({
            organizationId: row.organizationId,
            operation: row.operation,
            reason: row.reason,
            policyGate: row.policyGate,
          });
          continue;
        }
        if (row.operation === "blocked") {
          if (row.existingCloneId) {
            await ctx.db.insert("objectActions", {
              organizationId: row.organizationId,
              objectId: row.existingCloneId,
              actionType: "template_distribution_blocked",
              actionData: {
                contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
                distributionJobId: deterministicJobId,
                templateId: String(args.templateId),
                templateVersion: resolvedVersionTag,
                reason: row.reason,
                changedFields: row.changedFields,
                policyGate: row.policyGate,
              },
              performedBy: actor.userId,
              performedAt: now,
            });

            await ctx.db.insert("auditLogs", {
              organizationId: row.organizationId,
              userId: actor.userId,
              action: "template_distribution_blocked",
              resource: "org_agent",
              resourceId: String(row.existingCloneId),
              success: false,
              metadata: {
                distributionJobId: deterministicJobId,
                templateId: String(args.templateId),
                templateVersion: resolvedVersionTag,
                reason: row.reason,
                changedFields: row.changedFields,
                policyGate: row.policyGate,
              },
              createdAt: now,
            });
          }
          applyResults.push({
            organizationId: row.organizationId,
            operation: row.operation,
            reason: row.reason,
            policyGate: row.policyGate,
          });
          continue;
        }

        if (row.operation === "create") {
          const templateCloneLinkage = buildManagedTemplateCloneLinkage({
            sourceTemplateId: String(args.templateId),
            sourceTemplateVersion: resolvedVersionTag,
            lastTemplateSyncAt: now,
            lastTemplateSyncJobId: deterministicJobId,
          });
          const cloneId = await ctx.db.insert("objects", {
            organizationId: row.organizationId,
            type: "org_agent",
            subtype: template.subtype,
            name: template.name,
            description: template.description,
            status: "active",
            customProperties: {
              ...snapshotBaseline,
              agentClass: normalizeAgentClass(
                snapshotBaseline.agentClass,
                "internal_operator"
              ),
              protected: false,
              templateAgentId: args.templateId,
              templateVersion: resolvedVersionTag,
              cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
              templateCloneLinkage,
              lastTemplateSyncAt: now,
              lastTemplateJobId: deterministicJobId,
              creationSource: "catalog_clone",
            },
            createdBy: actor.userId,
            createdAt: now,
            updatedAt: now,
          });

          await ctx.db.insert("objectActions", {
            organizationId: row.organizationId,
            objectId: cloneId,
            actionType: "template_distribution_created",
            actionData: {
              contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
              distributionJobId: deterministicJobId,
              templateId: String(args.templateId),
              templateVersion: resolvedVersionTag,
              reason: normalizedReason,
              changedFields: row.changedFields,
              policyGate: row.policyGate,
            },
            performedBy: actor.userId,
            performedAt: now,
          });

          await ctx.db.insert("auditLogs", {
            organizationId: row.organizationId,
            userId: actor.userId,
            action: "template_distribution_created",
            resource: "org_agent",
            resourceId: String(cloneId),
            success: true,
            metadata: {
              distributionJobId: deterministicJobId,
              templateId: String(args.templateId),
              templateVersion: resolvedVersionTag,
              reason: normalizedReason,
              changedFields: row.changedFields,
              policyGate: row.policyGate,
            },
            createdAt: now,
          });

          applyResults.push({
            organizationId: row.organizationId,
            cloneAgentId: cloneId,
            operation: "create",
            reason: row.reason,
            policyGate: row.policyGate,
          });
          continue;
        }

        if (row.operation === "update" && row.existingCloneId) {
          const existingClone = await ctx.db.get(row.existingCloneId);
          if (!existingClone) {
            applyResults.push({
              organizationId: row.organizationId,
              operation: "blocked",
              reason: "missing_clone",
              policyGate: row.policyGate,
            });
            continue;
          }
          const existingProps =
            (existingClone.customProperties as Record<string, unknown> | undefined) ?? {};
          const existingLinkage = readTemplateCloneLinkageContract(existingProps);
          const templateCloneLinkage = buildManagedTemplateCloneLinkage({
            sourceTemplateId: String(args.templateId),
            sourceTemplateVersion: resolvedVersionTag,
            overridePolicy: existingLinkage?.overridePolicy,
            lastTemplateSyncAt: now,
            lastTemplateSyncJobId: deterministicJobId,
            cloneLifecycleState: existingLinkage?.cloneLifecycleState,
          });
          const templateFieldPatch = Object.fromEntries(
            row.writableTemplateFields.map((field) => {
              if (Object.prototype.hasOwnProperty.call(snapshotBaseline, field)) {
                return [field, snapshotBaseline[field]];
              }
              return [field, null];
            })
          );

          await ctx.db.patch(row.existingCloneId, {
            customProperties: {
              ...existingProps,
              ...templateFieldPatch,
              templateAgentId: args.templateId,
              templateVersion: resolvedVersionTag,
              cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
              templateCloneLinkage,
              lastTemplateSyncAt: now,
              lastTemplateJobId: deterministicJobId,
            },
            updatedAt: now,
          });

          await ctx.db.insert("objectActions", {
            organizationId: row.organizationId,
            objectId: row.existingCloneId,
            actionType: "template_distribution_updated",
            actionData: {
              contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
              distributionJobId: deterministicJobId,
              templateId: String(args.templateId),
              templateVersion: resolvedVersionTag,
              reason: normalizedReason,
              changedFields: row.changedFields,
              policyGate: row.policyGate,
            },
            performedBy: actor.userId,
            performedAt: now,
          });

          await ctx.db.insert("auditLogs", {
            organizationId: row.organizationId,
            userId: actor.userId,
            action: "template_distribution_updated",
            resource: "org_agent",
            resourceId: String(row.existingCloneId),
            success: true,
            metadata: {
              distributionJobId: deterministicJobId,
              templateId: String(args.templateId),
              templateVersion: resolvedVersionTag,
              reason: normalizedReason,
              changedFields: row.changedFields,
              policyGate: row.policyGate,
            },
            createdAt: now,
          });

          applyResults.push({
            organizationId: row.organizationId,
            cloneAgentId: row.existingCloneId,
            operation: "update",
            reason: row.reason,
            policyGate: row.policyGate,
          });
        }
      }
    }

    const planSummary = summarizeTemplateDistributionOperations(plan);
    const applySummary = summarizeTemplateDistributionOperations(applyResults);
    const policyGateSummary = summarizeTemplateDistributionPolicyGates(plan);
    const reasonCounts = {
      plan: summarizeTemplateDistributionReasonCounts(plan),
      applied: summarizeTemplateDistributionReasonCounts(
        applyResults.map((row) => ({
          reason: row.reason || row.operation,
        }))
      ),
    };

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: dryRun
        ? "template_distribution_plan_generated"
        : "template_distribution_applied",
      actionData: {
        contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
        distributionJobId: deterministicJobId,
        templateId: String(args.templateId),
        templateVersion: resolvedVersionTag,
        operationKind,
        reason: normalizedReason,
        dryRun,
        requestedTargetOrganizationIds: requestedTargetOrganizationIds.map((value) => String(value)),
        targetOrganizationIds: targetOrganizationIds.map((value) => String(value)),
        rolloutWindow: {
          stageStartIndex,
          stageSize,
          requestedTargetCount: requestedTargetOrganizationIds.length,
          stagedTargetCount: targetOrganizationIds.length,
        },
        summary: {
          plan: planSummary,
          applied: applySummary,
        },
        policyGates: policyGateSummary,
        reasonCounts,
        overridePolicyGate: {
          confirmWarnOverride: warnConfirmationAccepted,
          reason: normalizedOverrideReason,
        },
      },
      performedBy: actor.userId,
      performedAt: now,
    });

    return {
      distributionJobId: deterministicJobId,
      templateId: args.templateId,
      templateVersion: resolvedVersionTag,
      operationKind,
      dryRun,
      requestedTargetOrganizationIds,
      targetOrganizationIds,
      rolloutWindow: {
        stageStartIndex,
        stageSize,
        requestedTargetCount: requestedTargetOrganizationIds.length,
        stagedTargetCount: targetOrganizationIds.length,
      },
      summary: {
        plan: planSummary,
        applied: applySummary,
      },
      policyGates: policyGateSummary,
      reasonCounts,
      plan: plan.map((row) => ({
        organizationId: row.organizationId,
        operation: row.operation,
        reason: row.reason,
        existingCloneId: row.existingCloneId,
        changedFields: row.changedFields,
        writableTemplateFields: row.writableTemplateFields,
        policyGate: row.policyGate,
      })),
      applied: applyResults,
      overridePolicyGate: {
        confirmWarnOverride: warnConfirmationAccepted,
        reason: normalizedOverrideReason,
      },
    };
  },
});

export const getTemplateCloneDriftReport = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    templateVersionId: v.optional(v.id("objects")),
    targetOrganizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, auth.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== AGENT_TEMPLATE_OBJECT_TYPE || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }

    const templateProps =
      (template.customProperties as Record<string, unknown> | undefined) ?? {};
    const templateVersion = args.templateVersionId
      ? await ctx.db.get(args.templateVersionId)
      : null;
    if (args.templateVersionId && (!templateVersion || templateVersion.type !== AGENT_TEMPLATE_VERSION_OBJECT_TYPE)) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template version snapshot not found.",
      });
    }
    const templateVersionProps =
      (templateVersion?.customProperties as Record<string, unknown> | undefined) ?? {};
    if (templateVersion) {
      const sourceTemplateId = normalizeOptionalString(templateVersionProps.sourceTemplateId);
      if (sourceTemplateId !== String(args.templateId)) {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "Template version does not belong to template.",
        });
      }
    }

    const resolvedVersionTag =
      resolveTemplateVersionTagFromVersionObject(templateVersionProps) ||
      normalizeOptionalString(templateProps.templatePublishedVersion) ||
      normalizeOptionalString(templateProps.templateVersion) ||
      `${String(args.templateId)}@${template.updatedAt}`;
    const templateBaseline = templateVersion
      ? (
          (
            templateVersionProps.snapshot as
              | Record<string, unknown>
              | undefined
          )?.baselineCustomProperties as Record<string, unknown> | undefined
        ) ?? pickTemplateBaselineSnapshot(templateProps)
      : pickTemplateBaselineSnapshot(templateProps);

    const requestedTargetOrgIds = dedupeAndSortObjectIds(args.targetOrganizationIds ?? []);
    if (!isSuperAdmin && requestedTargetOrgIds.length > 0) {
      const outOfScopeTarget = requestedTargetOrgIds.find(
        (organizationId) => organizationId !== auth.organizationId
      );
      if (outOfScopeTarget) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Template drift query is restricted to caller organization scope.",
        });
      }
    }

    const cloneCandidates = requestedTargetOrgIds.length > 0
      ? (
          await Promise.all(
            requestedTargetOrgIds.map(async (organizationId) => {
              const orgAgents = await ctx.db
                .query("objects")
                .withIndex("by_org_type", (q) =>
                  q.eq("organizationId", organizationId).eq("type", "org_agent")
                )
                .collect();
              return orgAgents.filter((agent) => {
                const customProperties =
                  (agent.customProperties as Record<string, unknown> | undefined) ?? {};
                return resolveTemplateSourceId(customProperties) === String(args.templateId);
              });
            })
          )
        ).flat()
      : isSuperAdmin
      ? (
          await ctx.db
            .query("objects")
            .withIndex("by_type", (q) => q.eq("type", "org_agent"))
            .collect()
        ).filter((agent) => {
          const customProperties =
            (agent.customProperties as Record<string, unknown> | undefined) ?? {};
          return resolveTemplateSourceId(customProperties) === String(args.templateId);
        })
      : (
          await ctx.db
            .query("objects")
            .withIndex("by_org_type", (q) =>
              q.eq("organizationId", auth.organizationId).eq("type", "org_agent")
            )
            .collect()
        ).filter((agent) => {
          const customProperties =
            (agent.customProperties as Record<string, unknown> | undefined) ?? {};
          return resolveTemplateSourceId(customProperties) === String(args.templateId);
        });

    const orderedTargets = cloneCandidates
      .slice()
      .sort((left, right) => {
        const orgSort = String(left.organizationId).localeCompare(String(right.organizationId));
        if (orgSort !== 0) {
          return orgSort;
        }
        return String(left._id).localeCompare(String(right._id));
      });

    const targets = orderedTargets.map((cloneAgent) => {
      const cloneCustomProperties =
        (cloneAgent.customProperties as Record<string, unknown> | undefined) ?? {};
      const linkage = readTemplateCloneLinkageContract(cloneCustomProperties);
      const drift = resolveTemplateCloneDriftContract({
        templateBaseline,
        cloneCustomProperties,
        baselineTemplateVersion: resolvedVersionTag,
        linkage,
      });

      return {
        organizationId: cloneAgent.organizationId,
        cloneAgentId: cloneAgent._id,
        sourceTemplateId: resolveTemplateSourceId(cloneCustomProperties) || String(args.templateId),
        sourceTemplateVersion: linkage?.sourceTemplateVersion || null,
        cloneLifecycleState: linkage?.cloneLifecycleState || "legacy_unmanaged",
        policyState: drift.policyState,
        stale: drift.stale,
        blocked: drift.blocked,
        blockedFields: drift.blockedFields,
        overriddenFields: drift.overriddenFields,
        diff: drift.diff,
      };
    });

    return {
      templateId: args.templateId,
      templateVersion: resolvedVersionTag,
      precedenceOrder: [...AGENT_TEMPLATE_CLONE_PRECEDENCE_ORDER],
      fields: [...TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS],
      targets,
    };
  },
});

export const listTemplateCloneInventory = query({
  args: {
    sessionId: v.string(),
    filters: v.optional(v.object({
      organizationId: v.optional(v.id("organizations")),
      templateId: v.optional(v.id("objects")),
      policyState: v.optional(v.union(
        v.literal("in_sync"),
        v.literal("overridden"),
        v.literal("stale"),
        v.literal("blocked"),
      )),
      riskLevel: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      )),
      search: v.optional(v.string()),
    })),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, auth.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    if (!isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Template clone inventory is restricted to super_admin role.",
      });
    }

    const normalizedSearch = normalizeOptionalString(args.filters?.search)?.toLowerCase();
    const limit = Math.max(25, Math.min(args.limit ?? 300, 1000));
    const cloneCandidates = (
      await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "org_agent"))
        .collect()
    ).filter((agent) => {
      const customProperties =
        (agent.customProperties as Record<string, unknown> | undefined) ?? {};
      return resolveTemplateSourceId(customProperties) !== undefined;
    });

    const templateIdSet = new Set<string>();
    const organizationIdSet = new Set<string>();
    for (const clone of cloneCandidates) {
      organizationIdSet.add(String(clone.organizationId));
      const customProperties =
        (clone.customProperties as Record<string, unknown> | undefined) ?? {};
      const templateId = resolveTemplateSourceId(customProperties);
      if (templateId) {
        templateIdSet.add(templateId);
      }
    }

    const [templates, organizations] = await Promise.all([
      Promise.all(
        Array.from(templateIdSet).map(async (templateId) => {
          const template = await ctx.db.get(templateId as Id<"objects">);
          return template && template.type === AGENT_TEMPLATE_OBJECT_TYPE
            ? template
            : null;
        })
      ),
      Promise.all(
        Array.from(organizationIdSet).map(async (organizationId) =>
          ctx.db.get(organizationId as Id<"organizations">)
        )
      ),
    ]);

    const templateById = new Map(
      templates
        .filter((template): template is NonNullable<typeof template> => Boolean(template))
        .map((template) => [String(template._id), template] as const)
    );
    const organizationById = new Map(
      organizations
        .filter((organization): organization is NonNullable<typeof organization> => Boolean(organization))
        .map((organization) => [String(organization._id), organization] as const)
    );

    const rows = cloneCandidates
      .map((cloneAgent) => {
        const cloneCustomProperties =
          (cloneAgent.customProperties as Record<string, unknown> | undefined) ?? {};
        const sourceTemplateId = resolveTemplateSourceId(cloneCustomProperties);
        if (!sourceTemplateId) {
          return null;
        }
        const template = templateById.get(sourceTemplateId);
        const templateCustomProperties =
          (template?.customProperties as Record<string, unknown> | undefined) ?? {};
        const linkage = readTemplateCloneLinkageContract(cloneCustomProperties);
        const baselineTemplateVersion = template
          ? normalizeOptionalString(templateCustomProperties.templatePublishedVersion)
            || normalizeOptionalString(templateCustomProperties.templateVersion)
            || `${String(template._id)}@${template.updatedAt}`
          : linkage?.sourceTemplateVersion || "template_missing";
        const drift = resolveTemplateCloneDriftContract({
          templateBaseline: template
            ? pickTemplateBaselineSnapshot(templateCustomProperties)
            : {},
          cloneCustomProperties,
          baselineTemplateVersion,
          linkage,
        });
        const riskLevel = resolveTemplateCloneRiskLevel(drift.policyState);
        const organization = organizationById.get(String(cloneAgent.organizationId));
        return {
          organizationId: cloneAgent.organizationId,
          organizationName: organization?.name || String(cloneAgent.organizationId),
          templateId: sourceTemplateId,
          templateName: template?.name || "[missing template]",
          templateVersion: baselineTemplateVersion,
          cloneAgentId: cloneAgent._id,
          cloneAgentName: cloneAgent.name,
          cloneLifecycleState: linkage?.cloneLifecycleState || "legacy_unmanaged",
          policyState: drift.policyState,
          riskLevel,
          stale: drift.stale,
          blocked: drift.blocked,
          blockedFields: drift.blockedFields,
          overriddenFields: drift.overriddenFields,
          diffCount: drift.diff.length,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => {
        if (args.filters?.organizationId && row.organizationId !== args.filters.organizationId) {
          return false;
        }
        if (args.filters?.templateId && row.templateId !== String(args.filters.templateId)) {
          return false;
        }
        if (args.filters?.policyState && row.policyState !== args.filters.policyState) {
          return false;
        }
        if (args.filters?.riskLevel && row.riskLevel !== args.filters.riskLevel) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        const haystack = [
          row.organizationName,
          row.templateName,
          row.cloneAgentName,
          row.templateId,
          String(row.cloneAgentId),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const orgSort = String(left.organizationId).localeCompare(String(right.organizationId));
        if (orgSort !== 0) {
          return orgSort;
        }
        const templateSort = left.templateId.localeCompare(right.templateId);
        if (templateSort !== 0) {
          return templateSort;
        }
        return String(left.cloneAgentId).localeCompare(String(right.cloneAgentId));
      })
      .slice(0, limit);

    const byPolicyState = {
      in_sync: 0,
      overridden: 0,
      stale: 0,
      blocked: 0,
    };
    const byRisk = {
      low: 0,
      medium: 0,
      high: 0,
    };
    const organizationCounts = new Map<string, { id: Id<"organizations">; name: string; count: number }>();
    const templateCounts = new Map<string, { id: string; name: string; count: number }>();
    for (const row of rows) {
      byPolicyState[row.policyState] += 1;
      byRisk[row.riskLevel] += 1;

      const existingOrg = organizationCounts.get(String(row.organizationId));
      if (existingOrg) {
        existingOrg.count += 1;
      } else {
        organizationCounts.set(String(row.organizationId), {
          id: row.organizationId,
          name: row.organizationName,
          count: 1,
        });
      }

      const existingTemplate = templateCounts.get(row.templateId);
      if (existingTemplate) {
        existingTemplate.count += 1;
      } else {
        templateCounts.set(row.templateId, {
          id: row.templateId,
          name: row.templateName,
          count: 1,
        });
      }
    }

    return {
      generatedAt: Date.now(),
      total: rows.length,
      summary: {
        byPolicyState,
        byRisk,
      },
      filterMetadata: {
        organizations: Array.from(organizationCounts.values()).sort((left, right) => {
          const nameSort = left.name.localeCompare(right.name);
          if (nameSort !== 0) {
            return nameSort;
          }
          return String(left.id).localeCompare(String(right.id));
        }),
        templates: Array.from(templateCounts.values()).sort((left, right) => {
          const nameSort = left.name.localeCompare(right.name);
          if (nameSort !== 0) {
            return nameSort;
          }
          return left.id.localeCompare(right.id);
        }),
      },
      rows,
    };
  },
});

export const listTemplateRolloutOptions = query({
  args: {
    sessionId: v.string(),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, auth.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    if (!isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Template rollout options are restricted to super_admin role.",
      });
    }

    const [templates, versions] = await Promise.all([
      ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", AGENT_TEMPLATE_OBJECT_TYPE))
        .collect(),
      ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", AGENT_TEMPLATE_VERSION_OBJECT_TYPE))
        .collect(),
    ]);

    const templateRows = templates
      .filter((template) => template.status === "template")
      .map((template) => {
        const customProperties =
          (template.customProperties as Record<string, unknown> | undefined) ?? {};
        const lifecycleStatus = normalizeTemplateLifecycleStatus(
          customProperties.templateLifecycleStatus
        );
        const publishedVersionId = normalizeOptionalString(
          customProperties.templatePublishedVersionId
        );
        const publishedVersionTag = normalizeOptionalString(
          customProperties.templatePublishedVersion
        );
        return {
          templateId: template._id,
          templateName: template.name,
          templateOrganizationId: template.organizationId,
          lifecycleStatus,
          publishedVersionId,
          publishedVersionTag,
          updatedAt: template.updatedAt,
        };
      })
      .sort((left, right) => {
        const nameSort = left.templateName.localeCompare(right.templateName);
        if (nameSort !== 0) {
          return nameSort;
        }
        return String(left.templateId).localeCompare(String(right.templateId));
      });

    const versionsByTemplateId = new Map<
      string,
      Array<{
        templateVersionId: Id<"objects">;
        versionTag: string;
        lifecycleStatus: AgentTemplateVersionLifecycleStatus;
        createdAt: number;
        updatedAt: number;
      }>
    >();
    for (const version of versions) {
      const customProperties =
        (version.customProperties as Record<string, unknown> | undefined) ?? {};
      const sourceTemplateId = normalizeOptionalString(customProperties.sourceTemplateId);
      if (!sourceTemplateId) {
        continue;
      }
      const versionTag =
        resolveTemplateVersionTagFromVersionObject(customProperties) ||
        `${String(version._id)}@${version.updatedAt}`;
      const row = {
        templateVersionId: version._id,
        versionTag,
        lifecycleStatus: normalizeTemplateVersionLifecycleStatus(
          customProperties.lifecycleStatus
        ),
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      };
      const existing = versionsByTemplateId.get(sourceTemplateId);
      if (existing) {
        existing.push(row);
      } else {
        versionsByTemplateId.set(sourceTemplateId, [row]);
      }
    }

    const templateOptions = templateRows.map((template) => {
      const versionsForTemplate = (versionsByTemplateId.get(String(template.templateId)) ?? [])
        .slice()
        .sort((left, right) => {
          const updatedSort = right.updatedAt - left.updatedAt;
          if (updatedSort !== 0) {
            return updatedSort;
          }
          return String(left.templateVersionId).localeCompare(String(right.templateVersionId));
        });
      return {
        templateId: template.templateId,
        templateName: template.templateName,
        templateOrganizationId: template.templateOrganizationId,
        lifecycleStatus: template.lifecycleStatus,
        publishedVersionId: template.publishedVersionId,
        publishedVersionTag: template.publishedVersionTag,
        versions: versionsForTemplate,
      };
    });

    return {
      generatedAt: Date.now(),
      templates: templateOptions,
    };
  },
});

export const listTemplateLifecycleOptions = query({
  args: {
    sessionId: v.string(),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, auth.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    if (!isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Template lifecycle options are restricted to super_admin role.",
      });
    }

    const [templates, versions] = await Promise.all([
      ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", AGENT_TEMPLATE_OBJECT_TYPE))
        .collect(),
      ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", AGENT_TEMPLATE_VERSION_OBJECT_TYPE))
        .collect(),
    ]);

    const templateRows = templates
      .filter((template) => template.status === "template")
      .map((template) => {
        const customProperties =
          (template.customProperties as Record<string, unknown> | undefined) ?? {};
        const lifecycleStatus = normalizeTemplateLifecycleStatus(
          customProperties.templateLifecycleStatus
        );
        const publishedVersionId = normalizeOptionalString(
          customProperties.templatePublishedVersionId
        );
        const publishedVersionTag = normalizeOptionalString(
          customProperties.templatePublishedVersion
        );
        return {
          templateId: template._id,
          templateName: template.name,
          lifecycleStatus,
          publishedVersionId,
          publishedVersionTag,
          updatedAt: template.updatedAt,
        };
      })
      .sort((left, right) => {
        const nameSort = left.templateName.localeCompare(right.templateName);
        if (nameSort !== 0) {
          return nameSort;
        }
        return String(left.templateId).localeCompare(String(right.templateId));
      });

    const versionsByTemplateId = new Map<
      string,
      Array<{
        templateVersionId: Id<"objects">;
        versionTag: string;
        lifecycleStatus: AgentTemplateVersionLifecycleStatus;
        createdAt: number;
        updatedAt: number;
      }>
    >();
    for (const version of versions) {
      const customProperties =
        (version.customProperties as Record<string, unknown> | undefined) ?? {};
      const sourceTemplateId = normalizeOptionalString(customProperties.sourceTemplateId);
      if (!sourceTemplateId) {
        continue;
      }
      const versionTag =
        resolveTemplateVersionTagFromVersionObject(customProperties) ||
        `${String(version._id)}@${version.updatedAt}`;
      const row = {
        templateVersionId: version._id,
        versionTag,
        lifecycleStatus: normalizeTemplateVersionLifecycleStatus(
          customProperties.lifecycleStatus
        ),
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
      };
      const existing = versionsByTemplateId.get(sourceTemplateId);
      if (existing) {
        existing.push(row);
      } else {
        versionsByTemplateId.set(sourceTemplateId, [row]);
      }
    }

    const templateOptions = templateRows.map((template) => {
      const versionsForTemplate = (versionsByTemplateId.get(String(template.templateId)) ?? [])
        .slice()
        .sort((left, right) => {
          const updatedSort = right.updatedAt - left.updatedAt;
          if (updatedSort !== 0) {
            return updatedSort;
          }
          return String(left.templateVersionId).localeCompare(String(right.templateVersionId));
        });
      return {
        templateId: template.templateId,
        templateName: template.templateName,
        lifecycleStatus: template.lifecycleStatus,
        publishedVersionId: template.publishedVersionId,
        publishedVersionTag: template.publishedVersionTag,
        versions: versionsForTemplate,
      };
    });

    return {
      generatedAt: Date.now(),
      templates: templateOptions,
    };
  },
});

export const listTemplateDistributionTelemetry = query({
  args: {
    sessionId: v.string(),
    templateId: v.optional(v.id("objects")),
    limit: v.optional(v.number()),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, auth.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    if (!isSuperAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Template distribution telemetry is restricted to super_admin role.",
      });
    }

    const limit = Math.max(10, Math.min(args.limit ?? 30, 200));
    const scanLimit = Math.max(limit * 40, 500);
    const rows = await ctx.db
      .query("objectActions")
      .withIndex("by_performed_at")
      .order("desc")
      .take(scanLimit);

    const jobRows = rows
      .filter((row) => {
        return (
          row.actionType === "template_distribution_plan_generated" ||
          row.actionType === "template_distribution_applied"
        );
      })
      .map((row) => {
        const actionData = (row.actionData as Record<string, unknown> | undefined) ?? {};
        const distributionJobId = normalizeOptionalString(actionData.distributionJobId);
        if (!distributionJobId) {
          return null;
        }
        const templateId = normalizeOptionalString(actionData.templateId);
        if (!templateId) {
          return null;
        }
        if (args.templateId && templateId !== String(args.templateId)) {
          return null;
        }
        const templateVersion = normalizeOptionalString(actionData.templateVersion) || "unknown";
        const reason = normalizeOptionalString(actionData.reason) || "unspecified";
        const operationKind =
          actionData.operationKind === "rollout_rollback"
            ? "rollout_rollback"
            : "rollout_apply";
        const dryRun = actionData.dryRun === true;
        const summary = (actionData.summary as Record<string, unknown> | undefined) ?? {};
        const planSummary = (summary.plan as Record<string, unknown> | undefined) ?? {};
        const appliedSummary = (summary.applied as Record<string, unknown> | undefined) ?? {};
        const rolloutWindow = (actionData.rolloutWindow as Record<string, unknown> | undefined) ?? {};
        const policyGates =
          (actionData.policyGates as Record<string, unknown> | undefined) ?? {};
        const reasonCounts = (actionData.reasonCounts as Record<string, unknown> | undefined) ?? {};
        const appliedBlocked =
          typeof appliedSummary.blocked === "number" ? appliedSummary.blocked : 0;
        const status =
          row.actionType === "template_distribution_plan_generated"
            ? "planned"
            : appliedBlocked > 0
              ? "completed_with_errors"
              : "completed";
        const stagedTargetCount =
          typeof rolloutWindow.stagedTargetCount === "number"
            ? rolloutWindow.stagedTargetCount
            : 0;
        const requestedTargetCount =
          typeof rolloutWindow.requestedTargetCount === "number"
            ? rolloutWindow.requestedTargetCount
            : 0;
        const creates = typeof appliedSummary.creates === "number" ? appliedSummary.creates : 0;
        const updates = typeof appliedSummary.updates === "number" ? appliedSummary.updates : 0;
        const skips = typeof appliedSummary.skips === "number" ? appliedSummary.skips : 0;
        return {
          _id: row._id,
          performedAt: row.performedAt,
          actionType: row.actionType,
          distributionJobId,
          templateId,
          templateVersion,
          operationKind,
          reason,
          dryRun,
          status,
          affectedOrgCounts: {
            requested: requestedTargetCount,
            staged: stagedTargetCount,
            mutated: creates + updates,
            skipped: skips,
            blocked: appliedBlocked,
          },
          summary: {
            plan: {
              creates: typeof planSummary.creates === "number" ? planSummary.creates : 0,
              updates: typeof planSummary.updates === "number" ? planSummary.updates : 0,
              skips: typeof planSummary.skips === "number" ? planSummary.skips : 0,
              blocked: typeof planSummary.blocked === "number" ? planSummary.blocked : 0,
            },
            applied: {
              creates,
              updates,
              skips,
              blocked: appliedBlocked,
            },
          },
          policyGates: {
            blockedLocked:
              typeof policyGates.blockedLocked === "number"
                ? policyGates.blockedLocked
                : 0,
            blockedWarnConfirmation:
              typeof policyGates.blockedWarnConfirmation === "number"
                ? policyGates.blockedWarnConfirmation
                : 0,
            warnConfirmed:
              typeof policyGates.warnConfirmed === "number"
                ? policyGates.warnConfirmed
                : 0,
            free: typeof policyGates.free === "number" ? policyGates.free : 0,
          },
          reasonCounts: {
            plan:
              reasonCounts.plan && typeof reasonCounts.plan === "object"
                ? (reasonCounts.plan as Record<string, number>)
                : {},
            applied:
              reasonCounts.applied && typeof reasonCounts.applied === "object"
                ? (reasonCounts.applied as Record<string, number>)
                : {},
          },
          rolloutWindow: {
            stageStartIndex:
              typeof rolloutWindow.stageStartIndex === "number"
                ? rolloutWindow.stageStartIndex
                : 0,
            stageSize:
              typeof rolloutWindow.stageSize === "number" ? rolloutWindow.stageSize : 0,
            requestedTargetCount,
            stagedTargetCount,
          },
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => {
        if (left.performedAt !== right.performedAt) {
          return right.performedAt - left.performedAt;
        }
        const jobSort = left.distributionJobId.localeCompare(right.distributionJobId);
        if (jobSort !== 0) {
          return jobSort;
        }
        return String(left._id).localeCompare(String(right._id));
      })
      .slice(0, limit);

    const summary = {
      totalJobs: jobRows.length,
      byStatus: {
        planned: jobRows.filter((row) => row.status === "planned").length,
        completed: jobRows.filter((row) => row.status === "completed").length,
        completedWithErrors: jobRows.filter((row) => row.status === "completed_with_errors")
          .length,
      },
      byOperationKind: {
        rolloutApply: jobRows.filter((row) => row.operationKind === "rollout_apply").length,
        rolloutRollback: jobRows.filter((row) => row.operationKind === "rollout_rollback").length,
      },
      totalAffectedOrgs: {
        requested: jobRows.reduce((acc, row) => acc + row.affectedOrgCounts.requested, 0),
        staged: jobRows.reduce((acc, row) => acc + row.affectedOrgCounts.staged, 0),
        mutated: jobRows.reduce((acc, row) => acc + row.affectedOrgCounts.mutated, 0),
        blocked: jobRows.reduce((acc, row) => acc + row.affectedOrgCounts.blocked, 0),
      },
    };

    return {
      generatedAt: Date.now(),
      summary,
      rows: jobRows,
    };
  },
});

/**
 * CREATE AGENT
 * Create a new AI agent for an organization
 */
export const createAgent = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(),
    agentClass: v.optional(agentClassValidator),
    name: v.string(),
    displayName: v.optional(v.string()),
    // Identity & Personality
    personality: v.optional(v.string()),
    language: v.optional(v.string()),
    voiceLanguage: v.optional(v.string()),
    additionalLanguages: v.optional(v.array(v.string())),
    brandVoiceInstructions: v.optional(v.string()),
    elevenLabsVoiceId: v.optional(v.string()),
    // Knowledge
    systemPrompt: v.optional(v.string()),
    faqEntries: v.optional(v.array(v.object({
      q: v.string(),
      a: v.string(),
    }))),
    knowledgeBaseTags: v.optional(v.array(v.string())),
    // Tool Access
    toolProfile: v.optional(v.string()),
    enabledTools: v.optional(v.array(v.string())),
    disabledTools: v.optional(v.array(v.string())),
    // Autonomy & Guardrails
    autonomyLevel: v.union(
      v.literal("supervised"),
      v.literal("sandbox"),
      v.literal("autonomous"),
      v.literal("delegation"),
      v.literal("draft_only")
    ),
    maxMessagesPerDay: v.optional(v.number()),
    maxCostPerDay: v.optional(v.number()),
    requireApprovalFor: v.optional(v.array(v.string())),
    blockedTopics: v.optional(v.array(v.string())),
    domainAutonomy: v.optional(v.any()),
    autonomyTrust: v.optional(v.any()),
    // Model Config
    modelProvider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    // Channel Bindings
    channelBindings: v.optional(v.array(webchatChannelBindingValidator)),
    unifiedPersonality: v.optional(v.boolean()),
    teamAccessMode: v.optional(teamAccessModeValidator),
    dreamTeamSpecialists: v.optional(v.array(dreamTeamSpecialistContractValidator)),
    activeSoulMode: v.optional(soulModeValidator),
    activeArchetype: v.optional(v.string()),
    modeChannelBindings: v.optional(v.array(modeChannelBindingValidator)),
    enabledArchetypes: v.optional(v.array(v.string())),
    operatorCollaborationDefaults: v.optional(
      operatorCollaborationDefaultsValidator
    ),
    creationSource: v.optional(creationSourceValidator),
    // Escalation Policy (per-agent HITL configuration)
    escalationPolicy: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");
    const creationSource = args.creationSource ?? "legacy_direct";
    const userContext = await getUserContext(
      ctx,
      session.userId,
      args.organizationId
    );
    const isSuperAdmin =
      userContext.isGlobal && userContext.roleName === "super_admin";
    if (!isSuperAdmin) {
      throw new ConvexError({
        code: "ONE_OF_ONE_AGENT_CREATION_LOCKED",
        message:
          "Only super_admin can create or manage additional agents. Operators use one primary one-of-one agent.",
      });
    }

    const operatorId = String(session.userId);
    const resolvedAgentClass = normalizeAgentClass(args.agentClass, "internal_operator");
    const normalizedChannelBindings = normalizeChannelBindingsContract(
      args.channelBindings as ChannelBindingContractRecord[] | undefined
    );

    const agentId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "org_agent",
      subtype: args.subtype,
      name: args.name,
      description: args.displayName || `${args.subtype} agent`,
      status: "draft",
      customProperties: {
        agentClass: resolvedAgentClass,
        displayName: args.displayName || args.name,
        personality: args.personality,
        language: args.language || "en",
        voiceLanguage: args.voiceLanguage || args.language || "en",
        additionalLanguages: args.additionalLanguages || [],
        brandVoiceInstructions: args.brandVoiceInstructions,
        elevenLabsVoiceId: args.elevenLabsVoiceId,
        systemPrompt: args.systemPrompt,
        faqEntries: args.faqEntries || [],
        knowledgeBaseTags: args.knowledgeBaseTags || [],
        toolProfile: args.toolProfile || SUBTYPE_DEFAULT_PROFILES[args.subtype] || "general",
        enabledTools: args.enabledTools || [],
        disabledTools: args.disabledTools || [],
        autonomyLevel: args.autonomyLevel,
        maxMessagesPerDay: args.maxMessagesPerDay || 100,
        maxCostPerDay: args.maxCostPerDay || 5.0,
        requireApprovalFor: args.requireApprovalFor || [],
        blockedTopics: args.blockedTopics || [],
        domainAutonomy: args.domainAutonomy,
        autonomyTrust: args.autonomyTrust,
        modelProvider: args.modelProvider || "openrouter",
        modelId: args.modelId || ONBOARDING_DEFAULT_MODEL_ID,
        temperature: args.temperature ?? 0.7,
        maxTokens: args.maxTokens || 4096,
        channelBindings: normalizedChannelBindings,
        unifiedPersonality: args.unifiedPersonality ?? true,
        teamAccessMode: args.teamAccessMode || "invisible",
        dreamTeamSpecialists: args.dreamTeamSpecialists || [],
        activeSoulMode: args.activeSoulMode || "work",
        activeArchetype: args.activeArchetype || null,
        modeChannelBindings: args.modeChannelBindings || [],
        enabledArchetypes: args.enabledArchetypes || [],
        creationSource,
        operatorId,
        isPrimary: false,
        operatorCollaborationDefaults: normalizeOperatorCollaborationDefaults(
          args.operatorCollaborationDefaults
        ),
        // Escalation policy (per-agent HITL configuration)
        ...(args.escalationPolicy ? { escalationPolicy: args.escalationPolicy } : {}),
        // Stats (populated at runtime)
        totalMessages: 0,
        totalCostUsd: 0,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const primaryRepairs = await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(args.organizationId),
      operatorId,
    });
    const primaryContext = primaryRepairs.find((entry) => entry.operatorId === operatorId);
    const isPrimary = primaryContext?.primaryAgentId === String(agentId);

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: agentId,
      actionType: "created",
      actionData: {
        subtype: args.subtype,
        agentClass: resolvedAgentClass,
        autonomyLevel: args.autonomyLevel,
        creationSource,
        operatorId,
        isPrimary,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return agentId;
  },
});

/**
 * UPDATE AGENT
 * Update an existing agent's configuration
 */
export const updateAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      displayName: v.optional(v.string()),
      subtype: v.optional(v.string()),
      agentClass: v.optional(agentClassValidator),
      personality: v.optional(v.string()),
      language: v.optional(v.string()),
      voiceLanguage: v.optional(v.string()),
      additionalLanguages: v.optional(v.array(v.string())),
      brandVoiceInstructions: v.optional(v.string()),
      elevenLabsVoiceId: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      faqEntries: v.optional(v.array(v.object({
        q: v.string(),
        a: v.string(),
      }))),
      knowledgeBaseTags: v.optional(v.array(v.string())),
      toolProfile: v.optional(v.string()),
      enabledTools: v.optional(v.array(v.string())),
      disabledTools: v.optional(v.array(v.string())),
      autonomyLevel: v.optional(v.union(
        v.literal("supervised"),
        v.literal("sandbox"),
        v.literal("autonomous"),
        v.literal("delegation"),
        v.literal("draft_only")
      )),
      maxMessagesPerDay: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      requireApprovalFor: v.optional(v.array(v.string())),
      blockedTopics: v.optional(v.array(v.string())),
      domainAutonomy: v.optional(v.any()),
      autonomyTrust: v.optional(v.any()),
      modelProvider: v.optional(v.string()),
      modelId: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      channelBindings: v.optional(v.array(webchatChannelBindingValidator)),
      unifiedPersonality: v.optional(v.boolean()),
      teamAccessMode: v.optional(teamAccessModeValidator),
      dreamTeamSpecialists: v.optional(v.array(dreamTeamSpecialistContractValidator)),
      activeSoulMode: v.optional(soulModeValidator),
      activeArchetype: v.optional(v.string()),
      modeChannelBindings: v.optional(v.array(modeChannelBindingValidator)),
      enabledArchetypes: v.optional(v.array(v.string())),
      operatorCollaborationDefaults: v.optional(
        operatorCollaborationDefaultsValidator
      ),
      // Soul payload is owner-editable from the Soul editor tab.
      // Keep this permissive because soul schema evolves independently.
      soul: v.optional(v.any()),
      // Escalation Policy (per-agent HITL configuration)
      escalationPolicy: v.optional(v.any()),
    }),
    overridePolicyGate: v.optional(v.object({
      confirmWarnOverride: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    enforceNotProtected(agent);
    const normalizedChannelBindings = args.updates.channelBindings
      ? normalizeChannelBindingsContract(
          args.updates.channelBindings as ChannelBindingContractRecord[]
        )
      : undefined;
    const normalizedAgentClass =
      typeof args.updates.agentClass === "string"
        ? normalizeAgentClass(args.updates.agentClass, readAgentClass(
            (agent.customProperties as Record<string, unknown> | undefined) ?? {}
          ))
        : undefined;
    const hasPlatformManagedOverride = normalizedChannelBindings
      ? detectPlatformManagedChannelBindingOverride(
          (agent.customProperties as Record<string, unknown> | undefined)
            ?.channelBindings,
          normalizedChannelBindings
        )
      : false;

    if (hasPlatformManagedOverride) {
      const userContext = await getUserContext(
        ctx,
        session.userId,
        agent.organizationId
      );
      const isSuperAdmin =
        userContext.isGlobal && userContext.roleName === "super_admin";
      if (!isSuperAdmin) {
        throw new Error(
          "PLATFORM_MANAGED_CHANNEL_BINDING_OVERRIDE_FORBIDDEN: desktop/slack binding overrides require super_admin role."
        );
      }
    }

    const normalizedUpdates = {
      ...args.updates,
      ...(normalizedAgentClass ? { agentClass: normalizedAgentClass } : {}),
      ...(normalizedChannelBindings
        ? { channelBindings: normalizedChannelBindings }
        : {}),
      ...(args.updates.operatorCollaborationDefaults
        ? {
            operatorCollaborationDefaults:
              normalizeOperatorCollaborationDefaults(
                args.updates.operatorCollaborationDefaults
              ),
          }
        : {}),
    };
    const updatedFields = normalizeDeterministicUpdatedFields(
      Object.keys(normalizedUpdates)
    );
    const normalizedOverrideReason =
      normalizeOptionalString(args.overridePolicyGate?.reason) || null;
    const warnConfirmationAccepted =
      args.overridePolicyGate?.confirmWarnOverride === true &&
      normalizedOverrideReason !== null;
    const isManagedCloneTuningMutation = isManagedUseCaseCloneCandidate(agent);
    await enforceOneOfOneOperatorMutationAccess(ctx, {
      userId: session.userId,
      organizationId: agent.organizationId,
      agent,
      operation: "update",
      updatedFields,
    });

    const now = Date.now();
    const agentCustomProperties =
      (agent.customProperties as Record<string, unknown> | undefined) ?? {};
    const overrideGate = resolveTemplateOverrideGateForManagedClone({
      customProperties: agentCustomProperties,
      updates: normalizedUpdates,
      warnConfirmation: warnConfirmationAccepted,
      reason: normalizedOverrideReason,
    });

    if (overrideGate) {
      await ctx.db.insert("objectActions", {
        organizationId: agent.organizationId,
        objectId: args.agentId,
        actionType: "managed_clone_override_gate_evaluated",
        actionData: {
          contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
          ...overrideGate,
        },
        performedBy: session.userId,
        performedAt: now,
      });

      await ctx.db.insert("auditLogs", {
        organizationId: agent.organizationId,
        userId: session.userId,
        action: "managed_clone_override_gate_evaluated",
        resource: "org_agent",
        resourceId: String(args.agentId),
        success: overrideGate.decision === "allow",
        metadata: {
          contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
          ...overrideGate,
          mutationSurface: "owner_managed_clone_tuning",
        },
        createdAt: now,
      });

      if (overrideGate.decision === "blocked_locked") {
        throw new ConvexError({
          code: "MANAGED_CLONE_OVERRIDE_POLICY_LOCKED",
          message: `Managed clone override blocked by locked policy fields: ${overrideGate.lockedFields.join(", ")}`,
        });
      }
      if (overrideGate.decision === "blocked_warn_confirmation_required") {
        throw new ConvexError({
          code: "MANAGED_CLONE_OVERRIDE_POLICY_WARN_CONFIRMATION_REQUIRED",
          message: `Managed clone warn override requires explicit confirmation and reason: ${overrideGate.warnFields.join(", ")}`,
        });
      }
    }

    await ctx.db.patch(args.agentId, {
      name: args.updates.name || agent.name,
      subtype: args.updates.subtype || agent.subtype,
      customProperties: {
        ...agent.customProperties,
        ...normalizedUpdates,
      },
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: isManagedCloneTuningMutation ? "managed_clone_tuned" : "updated",
      actionData: {
        updatedFields,
        mutationSurface: isManagedCloneTuningMutation
          ? "owner_managed_clone_tuning"
          : "standard_agent_update",
        ...(overrideGate ? { overrideGate } : {}),
      },
      performedBy: session.userId,
      performedAt: now,
    });

    if (isManagedCloneTuningMutation) {
      await ctx.db.insert("auditLogs", {
        organizationId: agent.organizationId,
        userId: session.userId,
        action: "managed_clone_tuned",
        resource: "org_agent",
        resourceId: String(args.agentId),
        success: true,
        metadata: {
          updatedFields,
          mutationSurface: "owner_managed_clone_tuning",
          cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
          ...(overrideGate ? { overrideGate } : {}),
        },
        createdAt: now,
      });
    }
  },
});

/**
 * OWNER SPECIALIST CLONE TUNING
 * Owner-facing mutation surface for sanctioned managed specialist clone tuning only.
 */
export const tuneManagedSpecialistClone = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    updates: v.object({
      agentClass: v.optional(agentClassValidator),
      displayName: v.optional(v.string()),
      personality: v.optional(v.string()),
      language: v.optional(v.string()),
      voiceLanguage: v.optional(v.string()),
      additionalLanguages: v.optional(v.array(v.string())),
      brandVoiceInstructions: v.optional(v.string()),
      elevenLabsVoiceId: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      faqEntries: v.optional(v.array(v.object({
        q: v.string(),
        a: v.string(),
      }))),
      knowledgeBaseTags: v.optional(v.array(v.string())),
      toolProfile: v.optional(v.string()),
      enabledTools: v.optional(v.array(v.string())),
      disabledTools: v.optional(v.array(v.string())),
      autonomyLevel: v.optional(v.union(
        v.literal("supervised"),
        v.literal("sandbox"),
        v.literal("autonomous"),
        v.literal("delegation"),
        v.literal("draft_only")
      )),
      maxMessagesPerDay: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      requireApprovalFor: v.optional(v.array(v.string())),
      blockedTopics: v.optional(v.array(v.string())),
      domainAutonomy: v.optional(v.any()),
      autonomyTrust: v.optional(v.any()),
      modelProvider: v.optional(v.string()),
      modelId: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      channelBindings: v.optional(v.array(webchatChannelBindingValidator)),
      unifiedPersonality: v.optional(v.boolean()),
      teamAccessMode: v.optional(teamAccessModeValidator),
      dreamTeamSpecialists: v.optional(v.array(dreamTeamSpecialistContractValidator)),
      activeSoulMode: v.optional(soulModeValidator),
      activeArchetype: v.optional(v.string()),
      modeChannelBindings: v.optional(v.array(modeChannelBindingValidator)),
      enabledArchetypes: v.optional(v.array(v.string())),
      operatorCollaborationDefaults: v.optional(
        operatorCollaborationDefaultsValidator
      ),
      // Soul payload is owner-editable from the Soul editor tab.
      // Keep this permissive because soul schema evolves independently.
      soul: v.optional(v.any()),
      escalationPolicy: v.optional(v.any()),
    }),
    overridePolicyGate: v.optional(v.object({
      confirmWarnOverride: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }
    if (!isManagedUseCaseCloneCandidate(agent)) {
      throw new Error(
        "ONE_OF_ONE_MANAGED_CLONE_REQUIRED: tuning surface supports managed specialist clones only."
      );
    }
    const updatedFields = normalizeDeterministicUpdatedFields(
      Object.keys(args.updates)
    );
    const disallowedFields = resolveDisallowedManagedCloneTuningFields(updatedFields);
    if (disallowedFields.length > 0) {
      throw new Error(
        `ONE_OF_ONE_MANAGED_CLONE_TUNING_FIELD_FORBIDDEN: disallowed update fields: ${disallowedFields.join(", ")}`
      );
    }

    await (updateAgent as any)._handler(ctx, args);
  },
});

/**
 * SET PRIMARY AGENT
 * Transactionally demotes any existing primary in the context and promotes the target.
 */
export const setPrimaryAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    const targetAgent = await ctx.db.get(args.agentId);
    if (!targetAgent || targetAgent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    enforceNotProtected(targetAgent);
    await enforceOneOfOneOperatorMutationAccess(ctx, {
      userId: session.userId,
      organizationId: targetAgent.organizationId,
      agent: targetAgent,
      operation: "set_primary",
    });
    if (targetAgent.status !== "active") {
      throw new Error("Primary agent must be active");
    }

    const operatorId = resolveOperatorContextId(targetAgent);
    const contextRepairs = await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(targetAgent.organizationId),
      operatorId,
      forcePrimaryAgentId: String(targetAgent._id),
    });

    const contextRepair = contextRepairs.find((entry) => entry.operatorId === operatorId);
    if (!contextRepair || contextRepair.primaryAgentId !== String(targetAgent._id)) {
      throw new Error("Failed to assign primary agent");
    }

    const previousPrimaryAgentIds = contextRepair.previousPrimaryAgentIds.filter(
      (agentId) => agentId !== String(targetAgent._id)
    );

    await ctx.db.insert("objectActions", {
      organizationId: targetAgent.organizationId,
      objectId: targetAgent._id,
      actionType: "primary_reassigned",
      actionData: {
        operatorId,
        previousPrimaryAgentIds,
        newPrimaryAgentId: targetAgent._id,
        reason: normalizeOptionalString(args.reason) || null,
        hadZeroPrimary: contextRepair.hadZeroPrimary,
        hadMultiplePrimaries: contextRepair.hadMultiplePrimaries,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return {
      primaryAgentId: targetAgent._id,
      operatorId,
      previousPrimaryAgentIds,
    };
  },
});

/**
 * ACTIVATE AGENT
 * Set agent status to "active"
 */
export const activateAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    enforceNotProtected(agent);
    await enforceOneOfOneOperatorMutationAccess(ctx, {
      userId: session.userId,
      organizationId: agent.organizationId,
      agent,
      operation: "activate",
    });
    const operatorId = resolveOperatorContextId(agent);

    await ctx.db.patch(args.agentId, {
      status: "active",
      updatedAt: Date.now(),
    });

    const primaryRepairs = await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(agent.organizationId),
      operatorId,
    });
    const primaryContext = primaryRepairs.find((entry) => entry.operatorId === operatorId);
    const primaryAgentId = primaryContext?.primaryAgentId || null;

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "activated",
      actionData: {
        operatorId,
        primaryAgentId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * PAUSE AGENT
 * Set agent status to "paused"
 */
export const pauseAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    enforceNotProtected(agent);
    await enforceOneOfOneOperatorMutationAccess(ctx, {
      userId: session.userId,
      organizationId: agent.organizationId,
      agent,
      operation: "pause",
    });
    const operatorId = resolveOperatorContextId(agent);

    await ctx.db.patch(args.agentId, {
      status: "paused",
      updatedAt: Date.now(),
    });

    const primaryRepairs = await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(agent.organizationId),
      operatorId,
    });
    const primaryContext = primaryRepairs.find((entry) => entry.operatorId === operatorId);
    const primaryAgentId = primaryContext?.primaryAgentId || null;

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "paused",
      actionData: {
        operatorId,
        primaryAgentId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * DELETE AGENT
 * Permanently delete an agent and associated links
 */
export const deleteAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    enforceNotProtected(agent);
    await enforceOneOfOneOperatorMutationAccess(ctx, {
      userId: session.userId,
      organizationId: agent.organizationId,
      agent,
      operation: "delete",
    });
    const operatorId = resolveOperatorContextId(agent);
    const wasPrimary = isPrimaryFlagged(agent);

    // Log deletion before deleting
    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "deleted",
      actionData: {
        agentName: agent.name,
        deletedBy: session.userId,
        operatorId,
        wasPrimary,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    // Delete associated links
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.agentId))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.agentId))
      .collect();

    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.agentId);
    await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(agent.organizationId),
      operatorId,
    });
  },
});

/**
 * INTERNAL: Get all active agents for an organization (for team tool roster)
 */
export const getAllActiveAgentsForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return agents.filter((a) => a.status === "active");
  },
});

// ============================================================================
// WORKER POOL QUERIES
// ============================================================================

/**
 * INTERNAL: Get the template agent for an organization (status="template", protected=true).
 * Used by the worker pool to clone new workers.
 */
export const getTemplateAgent = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return selectOnboardingTemplateAgent(agents);
  },
});

/**
 * INTERNAL: List protected template agents for an organization, optionally
 * filtered by template layer/playbook tags.
 */
export const getProtectedTemplateAgents = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    templateLayer: v.optional(v.string()),
    templatePlaybook: v.optional(v.string()),
    templateRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return filterProtectedTemplateAgents(agents, {
      templateLayer: args.templateLayer,
      templatePlaybook: args.templatePlaybook,
      templateRole: args.templateRole,
    });
  },
});

/**
 * INTERNAL: Resolve a single protected template by explicit templateRole.
 */
export const getProtectedTemplateAgentByRole = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    templateRole: v.string(),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    const matches = filterProtectedTemplateAgents(agents, {
      templateRole: args.templateRole,
    });
    return matches[0] ?? null;
  },
});

/**
 * INTERNAL: Get all active workers for an organization (agents cloned from a template).
 */
export const getActiveWorkers = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return agents.filter((a) => {
      const props = a.customProperties as Record<string, unknown> | undefined;
      // Legacy compatibility: agents without template linkage metadata stay operable;
      // this worker view only scopes to explicitly linked clones.
      return a.status === "active" && resolveTemplateSourceId(props) !== undefined;
    });
  },
});
