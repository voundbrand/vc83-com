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

import { query, mutation, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "./rbacHelpers";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./ai/modelDefaults";
import {
  ensureTemplateVersionCertificationForLifecycle,
  evaluateTemplateCertificationForTemplateVersion,
  type TemplateCertificationBlockReasonCode,
  type TemplateCertificationEvaluationResult,
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
import {
  mergeDeployableTelephonyConfigIntoRuntime,
  extractTemplateRoleTransferDependencies,
  normalizeAgentTelephonyConfig,
  toDeployableTelephonyConfig,
} from "../src/lib/telephony/agent-telephony";
import type { LayerWorkflowData, WorkflowMode } from "./layers/types";
import {
  isPlatformMotherAuthorityRecord,
  hasPlatformMotherTemplateRole,
  matchesPlatformMotherIdentityName,
} from "./platformMother";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("./_generated/api");

const OPERATOR_ROUTING_CHANNELS = new Set(["desktop", "slack"]);
const PLATFORM_MANAGED_CHANNEL_BINDING_CHANNELS = new Set(["desktop", "slack"]);
const TELEPHONY_ROUTING_CHANNELS = new Set(["phone_call"]);
const ORCHESTRATOR_DEFAULT_SUBTYPE = "general";
const OPERATOR_AUTHORITY_BOOTSTRAP_CHANNEL = "desktop";
export const DEFAULT_ORG_AGENT_TEMPLATE_ROLE = "personal_life_operator_template";
const DEFAULT_ORG_AGENT_TEMPLATE_ID_ENV_KEY = "DEFAULT_ORG_AGENT_TEMPLATE_ID";
export const AGENT_LAYERED_CONTEXT_LINK_TYPE = "uses_layered_context";

type OperatorAuthorityAppSurface =
  | "platform_web"
  | "desktop_web"
  | "macos_companion"
  | "operator_mobile"
  | "iphone"
  | "android"
  | "microsoft_app"
  | "unknown_operator_app";

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

function normalizeOperatorAuthorityAppSurface(
  value: unknown
): OperatorAuthorityAppSurface {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  switch (normalized) {
    case undefined:
    case "platform":
    case "platform_web":
    case "web":
      return "platform_web";
    case "desktop_web":
      return "desktop_web";
    case "desktop":
    case "macos":
    case "macos_app":
    case "macos_companion":
      return "macos_companion";
    case "mobile":
    case "mobile_api_v1":
    case "operator_mobile":
      return "operator_mobile";
    case "ios":
    case "ios_app":
    case "iphone":
      return "iphone";
    case "android":
    case "android_app":
      return "android";
    case "microsoft":
    case "microsoft_app":
    case "microsoft_teams":
    case "teams":
    case "teams_app":
      return "microsoft_app";
    default:
      return "unknown_operator_app";
  }
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

type AgentLayeredContextWorkflowSummary = {
  linkId: Id<"objectLinks">;
  workflowId: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
  workflowMode?: WorkflowMode;
};

function normalizeLayerWorkflowData(
  value: unknown,
): Partial<LayerWorkflowData> & { metadata?: { mode?: WorkflowMode } } {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Partial<LayerWorkflowData> & { metadata?: { mode?: WorkflowMode } };
}

async function loadAgentLayeredContextWorkflows(
  ctx: { db: Pick<MutationCtx["db"], "query" | "get"> },
  agentId: Id<"objects">,
): Promise<AgentLayeredContextWorkflowSummary[]> {
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q) =>
      q.eq("fromObjectId", agentId).eq("linkType", AGENT_LAYERED_CONTEXT_LINK_TYPE)
    )
    .collect();

  const workflows: AgentLayeredContextWorkflowSummary[] = [];
  for (const link of links) {
    const workflow = await ctx.db.get(link.toObjectId);
    if (!workflow || workflow.type !== "layer_workflow") {
      continue;
    }
    const workflowData = normalizeLayerWorkflowData(workflow.customProperties);
    workflows.push({
      linkId: link._id,
      workflowId: workflow._id,
      name: workflow.name,
      description: workflow.description ?? undefined,
      status: workflow.status,
      updatedAt: workflow.updatedAt,
      nodeCount: Array.isArray(workflowData.nodes) ? workflowData.nodes.length : 0,
      edgeCount: Array.isArray(workflowData.edges) ? workflowData.edges.length : 0,
      workflowMode: workflowData.metadata?.mode,
    });
  }

  return workflows.sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }
    return String(left.workflowId).localeCompare(String(right.workflowId));
  });
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
export const DEFAULT_OPERATOR_CONTEXT_ID = "__org_default__";
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
  "name",
  "subtype",
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
  "telephonyConfig",
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
  "telephonyConfig",
] as const;

type TemplateCloneDriftField = (typeof TEMPLATE_CLONE_DRIFT_COMPARISON_FIELDS)[number];
type TemplateClonePolicyState = "in_sync" | "overridden" | "stale" | "blocked";
type TemplateClonePolicyMode = "locked" | "warn" | "free";
export type TemplateCloneRiskLevel = "low" | "medium" | "high";

export const PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION =
  "platform_mother_policy_family_v1" as const;
export const PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION =
  "platform_mother_rollout_gate_requirements_v1" as const;

const PLATFORM_MOTHER_LOCKED_OPERATOR_TEMPLATE_FIELDS = [
  "templateAgentId",
  "templateVersion",
  "templateCloneLinkage",
  "modelProvider",
  "modelId",
] as const;

const PLATFORM_MOTHER_WARN_OPERATOR_TEMPLATE_FIELDS = [
  "toolProfile",
  "enabledTools",
  "disabledTools",
  "autonomyLevel",
  "systemPrompt",
] as const;

const PLATFORM_MOTHER_OUT_OF_SCOPE_OPERATOR_TEMPLATE_FIELDS = [
  "channelBindings",
  "telephonyConfig",
] as const;

export const PLATFORM_MOTHER_FREE_OPERATOR_CONTEXT_FIELDS = [
  "displayName",
  "knowledgeBaseTags",
  "faqEntries",
  "soul",
  "layeredContext",
  "contacts",
  "organizationContext",
] as const;

export interface PlatformMotherPolicyFamilyScope {
  contractVersion: typeof PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION;
  evaluatedFields: string[];
  motherOwnedLockedFields: string[];
  motherOwnedWarnFields: string[];
  customerOwnedContextFields: string[];
  outOfScopeFields: string[];
  eligible: boolean;
}

export interface PlatformMotherRolloutGateRequirements {
  contractVersion: typeof PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION;
  targetTemplateRole: string;
  targetTemplateVersionId?: string;
  targetTemplateVersionTag?: string;
  requiredEvidence: string[];
  satisfiedEvidence: string[];
  status: "required_before_execution" | "satisfied_for_review";
  dryRunCorrelationId?: string;
}

export function resolvePlatformMotherPolicyFamilyScope(
  fields: readonly string[],
): PlatformMotherPolicyFamilyScope {
  const evaluatedFields = Array.from(
    new Set(
      fields
        .map((field) => normalizeOptionalString(field))
        .filter((field): field is string => Boolean(field))
    ),
  ).sort((left, right) => left.localeCompare(right));
  const motherOwnedLockedFields = evaluatedFields.filter((field) =>
    (PLATFORM_MOTHER_LOCKED_OPERATOR_TEMPLATE_FIELDS as readonly string[]).includes(field),
  );
  const motherOwnedWarnFields = evaluatedFields.filter((field) =>
    (PLATFORM_MOTHER_WARN_OPERATOR_TEMPLATE_FIELDS as readonly string[]).includes(field),
  );
  const outOfScopeFields = evaluatedFields.filter((field) =>
    (PLATFORM_MOTHER_OUT_OF_SCOPE_OPERATOR_TEMPLATE_FIELDS as readonly string[]).includes(field),
  );
  const customerOwnedContextFields = (
    PLATFORM_MOTHER_FREE_OPERATOR_CONTEXT_FIELDS as readonly string[]
  )
    .filter((field) => !evaluatedFields.includes(field))
    .slice()
    .sort((left, right) => left.localeCompare(right));

  return {
    contractVersion: PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION,
    evaluatedFields,
    motherOwnedLockedFields,
    motherOwnedWarnFields,
    customerOwnedContextFields,
    outOfScopeFields,
    eligible: outOfScopeFields.length === 0,
  };
}

export function buildPlatformMotherRolloutGateRequirements(args: {
  targetTemplateRole: string;
  targetTemplateVersionId?: string | null;
  targetTemplateVersionTag?: string | null;
  dryRunCorrelationId?: string | null;
}): PlatformMotherRolloutGateRequirements {
  const targetTemplateVersionId = normalizeOptionalString(args.targetTemplateVersionId);
  const targetTemplateVersionTag = normalizeOptionalString(args.targetTemplateVersionTag);
  const dryRunCorrelationId = normalizeOptionalString(args.dryRunCorrelationId);
  const satisfied = Boolean(dryRunCorrelationId);

  return {
    contractVersion: PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION,
    targetTemplateRole: args.targetTemplateRole,
    ...(targetTemplateVersionId ? { targetTemplateVersionId } : {}),
    ...(targetTemplateVersionTag ? { targetTemplateVersionTag } : {}),
    requiredEvidence: ["template_certification"],
    satisfiedEvidence: satisfied ? ["template_certification"] : [],
    status: satisfied ? "satisfied_for_review" : "required_before_execution",
    ...(dryRunCorrelationId ? { dryRunCorrelationId } : {}),
  };
}

type TemplateVersionAdminCertificationSummary = {
  status: "certified" | "auto_certifiable" | "blocked";
  reasonCode?: string;
  message?: string;
  riskTier?: "low" | "medium" | "high";
  requiredVerification: string[];
  dependencyDigest?: string;
  recordedAt?: number;
  autoCertificationEligible: boolean;
  evidenceSources: string[];
};

async function buildTemplateVersionAdminCertificationSummary(
  ctx: QueryCtx,
  args: {
    templateId: Id<"objects">;
    templateVersionId: Id<"objects">;
    templateVersionTag: string;
  },
): Promise<TemplateVersionAdminCertificationSummary> {
  const evaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, {
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: args.templateVersionTag,
  });

  return {
    status: evaluation.allowed
      ? "certified"
      : evaluation.autoCertificationEligible
        ? "auto_certifiable"
        : "blocked",
    ...(evaluation.reasonCode ? { reasonCode: evaluation.reasonCode } : {}),
    ...(evaluation.message ? { message: evaluation.message } : {}),
    ...(evaluation.riskAssessment?.tier ? { riskTier: evaluation.riskAssessment.tier } : {}),
    requiredVerification: evaluation.riskAssessment?.requiredVerification ?? [],
    ...(evaluation.dependencyManifest?.dependencyDigest
      ? { dependencyDigest: evaluation.dependencyManifest.dependencyDigest }
      : {}),
    ...(typeof evaluation.certification?.recordedAt === "number"
      ? { recordedAt: evaluation.certification.recordedAt }
      : {}),
    autoCertificationEligible: evaluation.autoCertificationEligible,
    evidenceSources: (evaluation.certification?.evidenceSources ?? []).map(
      (source) => source.sourceType,
    ),
  };
}

type TemplateCloneDriftFieldDiff = {
  field: TemplateCloneDriftField;
  policyMode: TemplateClonePolicyMode;
  templateValue: unknown;
  cloneValue: unknown;
};

export type TemplateCloneDriftContract = {
  policyState: TemplateClonePolicyState;
  stale: boolean;
  blocked: boolean;
  blockedFields: TemplateCloneDriftField[];
  overriddenFields: TemplateCloneDriftField[];
  diff: TemplateCloneDriftFieldDiff[];
};

export function resolveTemplateCloneRiskLevel(
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

export type TemplateLifecycleExecutionActor = {
  performedBy?: Id<"users"> | Id<"objects">;
  auditUserId?: Id<"users">;
  roleName: string;
  sessionId?: string;
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
type TemplateDistributionBlockCategory =
  | "none"
  | "policy"
  | "org_preflight";

export type TemplateOrgPreflightBlockerCode =
  | "org_not_found"
  | "telephony_binding_missing"
  | "telephony_binding_disabled"
  | "telephony_provider_credentials_missing"
  | "telephony_from_number_missing"
  | "telephony_webhook_secret_missing"
  | "telephony_transfer_target_missing"
  | "channel_binding_missing"
  | "integration_dependency_missing"
  | "domain_config_missing"
  | "domain_verification_missing"
  | "billing_credits_insufficient"
  | "billing_credits_check_failed"
  | "vertical_contract_missing";

export interface TemplateOrgPreflightResult {
  contractVersion: "template_org_preflight_v1";
  organizationId: string;
  status: "pass" | "fail";
  blockerCodes: TemplateOrgPreflightBlockerCode[];
  blockers: string[];
  checks: Array<{
    checkId: string;
    status: "pass" | "fail";
    summary: string;
  }>;
  channels: {
    required: string[];
    missing: string[];
    bindings: Array<{
      channel: string;
      enabled: boolean;
      providerId?: string;
    }>;
  };
  integrations: {
    required: string[];
    available: string[];
    missing: string[];
    unknown: string[];
  };
  telephony: {
    required: boolean;
    providerKey: "elevenlabs" | "twilio_voice" | "custom_sip";
    bindingEnabled: boolean;
    credentialReady: boolean;
    fromNumberReady: boolean;
    webhookSecretReady: boolean;
    missingTransferRoles: string[];
  };
  domain: {
    required: boolean;
    requireVerified: boolean;
    requiredDomains: string[];
    availableDomains: string[];
    verifiedDomains: string[];
    missingDomains: string[];
    unverifiedDomains: string[];
  };
  billing: {
    required: boolean;
    requiredCredits: number;
    billingSource: "platform" | "byok" | "private";
    requestSource: "llm" | "platform_action";
    checked: boolean;
    hasCredits: boolean;
    isUnlimited: boolean;
    totalCredits: number;
    shortfall: number;
    skipped: boolean;
    checkFailed: boolean;
  };
  verticalContracts: {
    required: string[];
    available: string[];
    missing: string[];
  };
}

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function resolveOrganizationTelephonyBindingForPreflight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  providerKey: "elevenlabs" | "twilio_voice" | "custom_sip";
  bindingEnabled: boolean;
  fromNumberReady: boolean;
  webhookSecretReady: boolean;
}> {
  const directSettingsRows = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "direct_settings"),
    )
    .collect();
  const directSettings = directSettingsRows[0] ?? null;
  const phoneBindingRows = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "channel_provider_binding"),
    )
    .collect();
  const phoneBinding =
    phoneBindingRows.find(
      (row: { customProperties?: unknown }) =>
        asRecord(row.customProperties).channel === "phone_call",
    ) ?? null;

  const directProps = asRecord(directSettings?.customProperties);
  const bindingProps = asRecord(phoneBinding?.customProperties);
  const providerKey = normalizeOptionalString(directProps.providerKey);
  return {
    providerKey:
      providerKey === "twilio_voice" || providerKey === "custom_sip"
        ? providerKey
        : "elevenlabs",
    bindingEnabled: bindingProps.enabled === true,
    fromNumberReady: Boolean(
      normalizeOptionalString(directProps.twilioVoiceFromNumber)
      || normalizeOptionalString(directProps.directCallFromNumber)
      || normalizeOptionalString(directProps.elevenTelephonyFromNumber),
    ),
    webhookSecretReady: Boolean(
      normalizeOptionalString(directProps.twilioVoiceWebhookSecret)
      || normalizeOptionalString(directProps.directCallWebhookSecret)
      || normalizeOptionalString(directProps.elevenTelephonyWebhookSecret),
    ),
  };
}

async function resolveTwilioCredentialReadinessForPreflight(
  ctx: MutationCtx | QueryCtx,
  organizationId: Id<"organizations">,
): Promise<boolean> {
  const twilioSettingsRows = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "twilio_settings"),
    )
    .collect();
  const twilioSettings = twilioSettingsRows[0] ?? null;
  const twilioSettingsProps = asRecord(twilioSettings?.customProperties);
  const hasOrgCredentials = Boolean(
    normalizeOptionalString(twilioSettingsProps.accountSid)
    && normalizeOptionalString(twilioSettingsProps.authToken),
  );
  const accessPolicyRows = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "integration_access_policy"),
    )
    .collect();
  const accessPolicy = accessPolicyRows[0] ?? null;
  const twilioAccess = asRecord(asRecord(accessPolicy?.customProperties).twilio);
  const usePlatformCredentials = twilioAccess.usePlatformCredentials === true;
  const hasPlatformCredentials = Boolean(
    normalizeOptionalString(process.env.TWILIO_ACCOUNT_SID)
    && normalizeOptionalString(process.env.TWILIO_AUTH_TOKEN),
  );
  return usePlatformCredentials ? hasPlatformCredentials : hasOrgCredentials;
}

function normalizePreflightStringArray(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function resolveTemplateRequiredPreflightChannels(
  templateBaseline: Record<string, unknown>,
): string[] {
  const required = new Set<string>();
  const rawBindings = templateBaseline.channelBindings;
  if (Array.isArray(rawBindings)) {
    for (const binding of rawBindings) {
      const record = asRecord(binding);
      const channel = normalizeOptionalString(record.channel)?.toLowerCase();
      if (!channel || record.enabled !== true) {
        continue;
      }
      required.add(channel);
    }
  } else {
    const legacyBindings = asRecord(rawBindings);
    for (const [channel, config] of Object.entries(legacyBindings)) {
      if (asRecord(config).enabled === true) {
        required.add(channel.toLowerCase());
      }
    }
  }

  return normalizePreflightStringArray(
    Array.from(required).filter(
      (channel) =>
        channel !== "phone_call"
        && !PLATFORM_MANAGED_CHANNEL_BINDING_CHANNELS.has(channel),
    ),
  );
}

async function resolveOrganizationChannelBindingsForPreflight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<Array<{ channel: string; enabled: boolean; providerId?: string }>> {
  const rows = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "channel_provider_binding"),
    )
    .collect();
  const normalizedRows: Array<{
    channel: string;
    enabled: boolean;
    providerId?: string;
  }> = rows
    .map((row: { customProperties?: unknown }) => {
      const props = asRecord(row.customProperties);
      const channel = normalizeOptionalString(props.channel)?.toLowerCase();
      if (!channel) {
        return null;
      }
      return {
        channel,
        enabled: props.enabled === true,
        ...(normalizeOptionalString(props.providerId)
          ? { providerId: normalizeOptionalString(props.providerId)!.toLowerCase() }
          : {}),
      };
    })
    .filter(
      (
        row: {
          channel: string;
          enabled: boolean;
          providerId?: string;
        } | null,
      ): row is {
        channel: string;
        enabled: boolean;
        providerId?: string;
      } => row !== null,
    );
  return normalizedRows.sort((left, right) => left.channel.localeCompare(right.channel));
}

function normalizeIntegrationDependencyKey(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  const compact = normalized.replace(/[^a-z0-9]+/g, "_");
  if (compact.includes("stripe")) {
    return "stripe";
  }
  if (compact.includes("calendar")) {
    return "calendar_api";
  }
  if (compact.includes("shipping")) {
    return "shipping_api";
  }
  if (compact.includes("behavior")) {
    return "behaviors_system";
  }
  if (compact.includes("twilio")) {
    return "twilio_voice";
  }
  if (compact.includes("eleven")) {
    return "elevenlabs";
  }
  if (compact.includes("resend")) {
    return "resend";
  }
  if (compact.includes("chatwoot")) {
    return "chatwoot";
  }
  if (compact.includes("telegram")) {
    return "telegram";
  }
  if (compact.includes("infobip")) {
    return "infobip";
  }
  if (compact.includes("openai")) {
    return "openai";
  }
  if (compact.includes("anthropic")) {
    return "anthropic";
  }
  if (compact.includes("gemini")) {
    return "gemini";
  }
  if (compact.includes("openrouter")) {
    return "openrouter";
  }
  return null;
}

function resolveTemplateRequiredIntegrationDependencies(
  templateBaseline: Record<string, unknown>,
): {
  requiredIntegrationKeys: string[];
  unknownIntegrationRequirements: string[];
} {
  const declaredRequirements = Array.isArray(templateBaseline.requiredIntegrations)
    ? templateBaseline.requiredIntegrations
    : [];
  const known = new Set<string>();
  const unknown = new Set<string>();
  for (const requirement of declaredRequirements) {
    const normalizedLabel = normalizeOptionalString(requirement);
    if (!normalizedLabel) {
      continue;
    }
    const normalizedKey = normalizeIntegrationDependencyKey(normalizedLabel);
    if (normalizedKey) {
      known.add(normalizedKey);
    } else {
      unknown.add(normalizedLabel);
    }
  }
  return {
    requiredIntegrationKeys: normalizePreflightStringArray(known),
    unknownIntegrationRequirements: normalizePreflightStringArray(unknown),
  };
}

async function resolveOrganizationIntegrationKeysForPreflight(
  ctx: MutationCtx | QueryCtx,
  args: {
    organizationId: Id<"organizations">;
    channelBindings: Array<{ channel: string; enabled: boolean; providerId?: string }>;
    telephonyProviderKey: "elevenlabs" | "twilio_voice" | "custom_sip";
    telephonyBindingEnabled: boolean;
    telephonyCredentialReady: boolean;
  },
): Promise<string[]> {
  const available = new Set<string>();
  for (const binding of args.channelBindings) {
    if (!binding.enabled) {
      continue;
    }
    const providerKey =
      normalizeIntegrationDependencyKey(binding.providerId)
      || normalizeIntegrationDependencyKey(binding.channel);
    if (providerKey) {
      available.add(providerKey);
    }
  }

  const integrationConnectionRows = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "integration_connection"),
    )
    .collect();
  for (const row of integrationConnectionRows) {
    if (row.status === "archived" || row.status === "deleted") {
      continue;
    }
    const props = asRecord(row.customProperties);
    if (props.enabled === false) {
      continue;
    }
    const providerKey =
      normalizeIntegrationDependencyKey(props.providerId)
      || normalizeIntegrationDependencyKey(props.provider)
      || normalizeIntegrationDependencyKey(props.integrationKey);
    if (providerKey) {
      available.add(providerKey);
    }
  }

  const aiSettingsRows = await ctx.db
    .query("organizationAiSettings")
    .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
    .collect();
  const aiSettings = aiSettingsRows[0] ?? null;
  const llm = asRecord(aiSettings?.llm);
  const providerProfiles = Array.isArray(llm.providerAuthProfiles)
    ? llm.providerAuthProfiles
    : [];
  for (const profile of providerProfiles) {
    const profileRecord = asRecord(profile);
    if (profileRecord.enabled === false) {
      continue;
    }
    const providerKey = normalizeIntegrationDependencyKey(profileRecord.providerId);
    if (providerKey) {
      available.add(providerKey);
    }
  }

  if (args.telephonyBindingEnabled && args.telephonyCredentialReady) {
    available.add(args.telephonyProviderKey);
  }

  return normalizePreflightStringArray(available);
}

type TemplateOrgPreflightRequirements = {
  domain: {
    requiredDomains: string[];
    requireVerified: boolean;
  };
  billing: {
    requiredCredits: number;
    billingSource: "platform" | "byok" | "private";
    requestSource: "llm" | "platform_action";
  };
  verticalContracts: {
    requiredContracts: string[];
  };
};

function normalizeDomainKey(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .trim() || null;
}

function normalizeVerticalContractKey(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  const compact = normalized.replace(/[^a-z0-9]+/g, "_");
  if (compact.includes("law") || compact.includes("kanzlei")) {
    return "law_firm";
  }
  if (compact.includes("health")) {
    return "healthcare";
  }
  if (compact.includes("real_estate")) {
    return "real_estate";
  }
  return compact || null;
}

function normalizeBillingSourceForPreflight(
  value: unknown,
): "platform" | "byok" | "private" {
  return value === "byok" || value === "private" ? value : "platform";
}

function normalizeBillingRequestSourceForPreflight(
  value: unknown,
): "llm" | "platform_action" {
  return value === "llm" ? "llm" : "platform_action";
}

function normalizeNonNegativeIntegerForPreflight(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function resolveTemplateOrgPreflightRequirements(
  templateBaseline: Record<string, unknown>,
): TemplateOrgPreflightRequirements {
  const requirementsRecord = asRecord(templateBaseline.orgPreflightRequirements);
  const domainRequirements = asRecord(requirementsRecord.domain);
  const billingRequirements = asRecord(requirementsRecord.billing);
  const verticalRequirements =
    asRecord(requirementsRecord.verticalContracts);
  const legacyVerticalRequirements = asRecord(requirementsRecord.vertical);

  const rawDomainRequirements = [
    ...(
      Array.isArray(domainRequirements.requiredDomains)
        ? domainRequirements.requiredDomains
        : []
    ),
    ...(normalizeOptionalString(domainRequirements.requiredDomain)
      ? [domainRequirements.requiredDomain]
      : []),
    ...(
      Array.isArray(templateBaseline.requiredDomains)
        ? templateBaseline.requiredDomains
        : []
    ),
  ];
  const requiredDomains = normalizePreflightStringArray(
    rawDomainRequirements
      .map((value) => normalizeDomainKey(value))
      .filter((value): value is string => Boolean(value)),
  );
  const requireVerifiedDomains =
    domainRequirements.requireVerified === true
    || domainRequirements.requireVerifiedDomain === true
    || requiredDomains.length > 0;

  const requiredCredits = normalizeNonNegativeIntegerForPreflight(
    billingRequirements.requiredCredits,
  );
  const requiredContracts = normalizePreflightStringArray(
    [
      ...(
        Array.isArray(verticalRequirements.required)
          ? verticalRequirements.required
          : []
      ),
      ...(
        Array.isArray(legacyVerticalRequirements.required)
          ? legacyVerticalRequirements.required
          : []
      ),
      ...(
        Array.isArray(verticalRequirements.requiredContracts)
          ? verticalRequirements.requiredContracts
          : []
      ),
      ...(
        Array.isArray(legacyVerticalRequirements.requiredContracts)
          ? legacyVerticalRequirements.requiredContracts
          : []
      ),
      ...(
        Array.isArray(templateBaseline.requiredVerticalContracts)
          ? templateBaseline.requiredVerticalContracts
          : []
      ),
      ...(normalizeOptionalString(templateBaseline.requiredVerticalContract)
        ? [templateBaseline.requiredVerticalContract]
        : []),
    ]
      .map((value) => normalizeVerticalContractKey(value))
      .filter((value): value is string => Boolean(value)),
  );

  return {
    domain: {
      requiredDomains,
      requireVerified: requireVerifiedDomains,
    },
    billing: {
      requiredCredits,
      billingSource: normalizeBillingSourceForPreflight(billingRequirements.billingSource),
      requestSource: normalizeBillingRequestSourceForPreflight(billingRequirements.requestSource),
    },
    verticalContracts: {
      requiredContracts,
    },
  };
}

async function resolveOrganizationDomainReadinessForPreflight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  availableDomains: string[];
  verifiedDomains: string[];
}> {
  const configRows = await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "configuration"),
    )
    .collect();

  const available = new Set<string>();
  const verified = new Set<string>();
  for (const row of configRows) {
    if (row.status === "archived" || row.status === "deleted" || row.subtype !== "domain") {
      continue;
    }
    const props = asRecord(row.customProperties);
    const domain = normalizeDomainKey(props.domainName);
    if (!domain) {
      continue;
    }
    available.add(domain);
    if (props.domainVerified === true || props.verified === true) {
      verified.add(domain);
    }
  }

  return {
    availableDomains: normalizePreflightStringArray(available),
    verifiedDomains: normalizePreflightStringArray(verified),
  };
}

function resolveOrganizationVerticalContractsForPreflight(
  organization: unknown,
): string[] {
  const organizationRecord = asRecord(organization);
  const orgProps = asRecord(organizationRecord.customProperties);
  const workspaceContext = asRecord(orgProps.workspaceContext);
  const candidates: unknown[] = [
    ...(Array.isArray(orgProps.verticalContracts) ? orgProps.verticalContracts : []),
    ...(Array.isArray(workspaceContext.verticalContracts) ? workspaceContext.verticalContracts : []),
    organizationRecord.industry,
    organizationRecord.businessType,
    organizationRecord.vertical,
    orgProps.industry,
    workspaceContext.industry,
    orgProps.vertical,
    workspaceContext.vertical,
    orgProps.businessType,
    workspaceContext.businessType,
  ];
  return normalizePreflightStringArray(
    candidates
      .map((value) => normalizeVerticalContractKey(value))
      .filter((value): value is string => Boolean(value)),
  );
}

async function resolveOrganizationBillingReadinessForPreflight(
  ctx: MutationCtx | QueryCtx,
  args: {
    organizationId: Id<"organizations">;
    requiredCredits: number;
    billingSource: "platform" | "byok" | "private";
    requestSource: "llm" | "platform_action";
  },
): Promise<{
  checked: boolean;
  hasCredits: boolean;
  isUnlimited: boolean;
  totalCredits: number;
  shortfall: number;
  skipped: boolean;
  checkFailed: boolean;
}> {
  if (args.requiredCredits <= 0) {
    return {
      checked: false,
      hasCredits: true,
      isUnlimited: false,
      totalCredits: -1,
      shortfall: 0,
      skipped: true,
      checkFailed: false,
    };
  }

  try {
    const result = await (ctx as any).runQuery(
      generatedApi.internal.credits.index.checkCreditsInternalQuery,
      {
        organizationId: args.organizationId,
        requiredAmount: args.requiredCredits,
        billingSource: args.billingSource,
        requestSource: args.requestSource,
      },
    );
    return {
      checked: true,
      hasCredits: result?.hasCredits !== false,
      isUnlimited: result?.isUnlimited === true,
      totalCredits: Number.isFinite(result?.totalCredits) ? result.totalCredits : -1,
      shortfall: Number.isFinite(result?.shortfall) ? Math.max(0, result.shortfall) : 0,
      skipped: result?.skipped === true,
      checkFailed: false,
    };
  } catch {
    return {
      checked: true,
      hasCredits: false,
      isUnlimited: false,
      totalCredits: 0,
      shortfall: args.requiredCredits,
      skipped: false,
      checkFailed: true,
    };
  }
}

export async function evaluateTemplateOrgPreflight(
  ctx: MutationCtx | QueryCtx,
  args: {
    organizationId: Id<"organizations">;
    templateBaseline: Record<string, unknown>;
  },
): Promise<TemplateOrgPreflightResult> {
  const requirements = resolveTemplateOrgPreflightRequirements(args.templateBaseline);
  const organization = await ctx.db.get(args.organizationId);
  if (!organization) {
    return {
      contractVersion: "template_org_preflight_v1",
      organizationId: String(args.organizationId),
      status: "fail",
      blockerCodes: ["org_not_found"],
      blockers: ["Organization record not found."],
      checks: [
        {
          checkId: "organization_exists",
          status: "fail",
          summary: "Organization record not found.",
        },
      ],
      channels: {
        required: [],
        missing: [],
        bindings: [],
      },
      integrations: {
        required: [],
        available: [],
        missing: [],
        unknown: [],
      },
      telephony: {
        required: false,
        providerKey: "elevenlabs",
        bindingEnabled: false,
        credentialReady: false,
        fromNumberReady: false,
        webhookSecretReady: false,
        missingTransferRoles: [],
      },
      domain: {
        required: requirements.domain.requireVerified || requirements.domain.requiredDomains.length > 0,
        requireVerified: requirements.domain.requireVerified,
        requiredDomains: requirements.domain.requiredDomains,
        availableDomains: [],
        verifiedDomains: [],
        missingDomains: requirements.domain.requiredDomains,
        unverifiedDomains: [],
      },
      billing: {
        required: requirements.billing.requiredCredits > 0,
        requiredCredits: requirements.billing.requiredCredits,
        billingSource: requirements.billing.billingSource,
        requestSource: requirements.billing.requestSource,
        checked: false,
        hasCredits: false,
        isUnlimited: false,
        totalCredits: 0,
        shortfall: requirements.billing.requiredCredits,
        skipped: false,
        checkFailed: true,
      },
      verticalContracts: {
        required: requirements.verticalContracts.requiredContracts,
        available: [],
        missing: requirements.verticalContracts.requiredContracts,
      },
    };
  }

  const phoneRequired = hasEnabledChannelBinding(args.templateBaseline, "phone_call");
  const telephonyConfig = normalizeAgentTelephonyConfig(args.templateBaseline.telephonyConfig);
  const requiredChannels = resolveTemplateRequiredPreflightChannels(args.templateBaseline);
  const channelBindings = await resolveOrganizationChannelBindingsForPreflight(
    ctx.db as any,
    args.organizationId,
  );
  const missingChannels = requiredChannels.filter((requiredChannel) => {
    const candidates = resolveChannelCandidates(requiredChannel);
    return !channelBindings.some(
      (binding) => binding.enabled && candidates.includes(binding.channel),
    );
  });
  const integrationRequirements = resolveTemplateRequiredIntegrationDependencies(
    args.templateBaseline,
  );
  const requiredTransferRoles = phoneRequired
    ? extractTemplateRoleTransferDependencies(telephonyConfig.elevenlabs.managedTools)
    : [];
  const telephonyBinding = await resolveOrganizationTelephonyBindingForPreflight(
    ctx.db as any,
    args.organizationId,
  );
  const remoteAgentIdsByTemplateRole =
    requiredTransferRoles.length > 0
      ? await (ctx as any).runQuery(
          generatedApi.internal.integrations.telephony.getOrganizationTemplateRoleRemoteAgentIds,
          {
            organizationId: args.organizationId,
            templateRoles: requiredTransferRoles,
          },
        )
      : {};
  const missingTransferRoles = requiredTransferRoles.filter(
    (role) => !normalizeOptionalString(remoteAgentIdsByTemplateRole?.[role]),
  );

  const credentialReady = phoneRequired
      ? telephonyBinding.providerKey === "twilio_voice"
        ? await resolveTwilioCredentialReadinessForPreflight(ctx, args.organizationId)
        : telephonyBinding.providerKey === "custom_sip"
          ? telephonyBinding.bindingEnabled
          : Boolean(
            (
              await (ctx as any).runQuery(
                generatedApi.internal.integrations.elevenlabs.getOrganizationElevenLabsRuntimeBinding,
                {
                  organizationId: args.organizationId,
                },
              )
            )?.apiKey,
          )
    : true;
  const availableIntegrationKeys = await resolveOrganizationIntegrationKeysForPreflight(ctx, {
    organizationId: args.organizationId,
    channelBindings,
    telephonyProviderKey: telephonyBinding.providerKey,
    telephonyBindingEnabled: telephonyBinding.bindingEnabled,
    telephonyCredentialReady: credentialReady,
  });
  const missingIntegrationKeys = integrationRequirements.requiredIntegrationKeys.filter(
    (integrationKey) => !availableIntegrationKeys.includes(integrationKey),
  );
  const domainReadiness = await resolveOrganizationDomainReadinessForPreflight(
    ctx.db as any,
    args.organizationId,
  );
  const missingRequiredDomains = requirements.domain.requiredDomains.filter(
    (domain) => !domainReadiness.availableDomains.includes(domain),
  );
  const unverifiedRequiredDomains = requirements.domain.requiredDomains.filter(
    (domain) =>
      domainReadiness.availableDomains.includes(domain)
      && !domainReadiness.verifiedDomains.includes(domain),
  );
  const domainRequired = requirements.domain.requireVerified
    || requirements.domain.requiredDomains.length > 0;
  const domainMissing =
    domainRequired
    && (
      missingRequiredDomains.length > 0
      || (
        requirements.domain.requireVerified
        && (
          (requirements.domain.requiredDomains.length === 0
            && domainReadiness.verifiedDomains.length === 0)
          || unverifiedRequiredDomains.length > 0
        )
      )
    );

  const verticalAvailableContracts = resolveOrganizationVerticalContractsForPreflight(organization);
  const missingVerticalContracts = requirements.verticalContracts.requiredContracts.filter(
    (contract) => !verticalAvailableContracts.includes(contract),
  );
  const billingReadiness = await resolveOrganizationBillingReadinessForPreflight(ctx, {
    organizationId: args.organizationId,
    requiredCredits: requirements.billing.requiredCredits,
    billingSource: requirements.billing.billingSource,
    requestSource: requirements.billing.requestSource,
  });

  const checks: TemplateOrgPreflightResult["checks"] = [
    {
      checkId: "organization_exists",
      status: "pass",
      summary: "Organization record exists.",
    },
    {
      checkId: "telephony_required",
      status: phoneRequired ? "pass" : "pass",
      summary: phoneRequired
        ? `Template requires telephony provider ${telephonyConfig.selectedProvider}.`
        : "Template does not require telephony preflight.",
    },
    {
      checkId: "channel_bindings_ready",
      status: missingChannels.length === 0 ? "pass" : "fail",
      summary:
        missingChannels.length === 0
          ? "All required non-telephony channels are bound."
          : `Missing required channels: ${missingChannels.join(", ")}.`,
    },
    {
      checkId: "domain_readiness",
      status: domainMissing ? "fail" : "pass",
      summary: !domainRequired
        ? "Template does not require domain readiness checks."
        : domainMissing
          ? missingRequiredDomains.length > 0
            ? `Missing required domain configs: ${missingRequiredDomains.join(", ")}.`
            : unverifiedRequiredDomains.length > 0
              ? `Required domains are not verified: ${unverifiedRequiredDomains.join(", ")}.`
              : "No verified domain config is available."
          : "Required domain configuration is ready.",
    },
    {
      checkId: "billing_credits_ready",
      status:
        requirements.billing.requiredCredits > 0
          ? billingReadiness.checkFailed || !billingReadiness.hasCredits
            ? "fail"
            : "pass"
          : "pass",
      summary:
        requirements.billing.requiredCredits <= 0
          ? "Template does not require credit preflight checks."
          : billingReadiness.checkFailed
            ? "Credit readiness check failed."
            : billingReadiness.hasCredits
              ? billingReadiness.isUnlimited
                ? "Organization has unlimited credit entitlement."
                : `Organization has sufficient credits (${billingReadiness.totalCredits} available).`
              : `Insufficient credits (${billingReadiness.shortfall} short).`,
    },
  ];
  if (requirements.verticalContracts.requiredContracts.length > 0) {
    checks.push({
      checkId: "vertical_contracts_ready",
      status: missingVerticalContracts.length === 0 ? "pass" : "fail",
      summary:
        missingVerticalContracts.length === 0
          ? "Required vertical contracts are available."
          : `Missing required vertical contracts: ${missingVerticalContracts.join(", ")}.`,
    });
  }

  const blockerCodes: TemplateOrgPreflightBlockerCode[] = [];
  const blockers: string[] = [];
  if (phoneRequired && !telephonyBinding.bindingEnabled) {
    blockerCodes.push("telephony_binding_disabled");
    blockers.push("Organization phone binding is disabled or missing.");
  }
  if (phoneRequired && !credentialReady) {
    blockerCodes.push("telephony_provider_credentials_missing");
    blockers.push("Organization telephony provider credentials are not ready.");
  }
  if (phoneRequired && !telephonyBinding.fromNumberReady) {
    blockerCodes.push("telephony_from_number_missing");
    blockers.push("Organization telephony binding is missing a from number.");
  }
  if (phoneRequired && !telephonyBinding.webhookSecretReady) {
    blockerCodes.push("telephony_webhook_secret_missing");
    blockers.push("Organization telephony binding is missing a webhook secret.");
  }
  if (missingTransferRoles.length > 0) {
    blockerCodes.push("telephony_transfer_target_missing");
    blockers.push(
      `Missing synced transfer targets for template roles: ${missingTransferRoles.join(", ")}.`,
    );
  }
  if (missingChannels.length > 0) {
    blockerCodes.push("channel_binding_missing");
    blockers.push(
      `Missing required non-telephony channel bindings: ${missingChannels.join(", ")}.`,
    );
  }
  if (missingIntegrationKeys.length > 0) {
    blockerCodes.push("integration_dependency_missing");
    blockers.push(
      `Missing required integrations: ${missingIntegrationKeys.join(", ")}.`,
    );
  }
  if (domainRequired && missingRequiredDomains.length > 0) {
    blockerCodes.push("domain_config_missing");
    blockers.push(
      `Missing required domain configs: ${missingRequiredDomains.join(", ")}.`,
    );
  } else if (
    domainRequired
    && requirements.domain.requireVerified
    && (
      (requirements.domain.requiredDomains.length === 0 && domainReadiness.verifiedDomains.length === 0)
      || unverifiedRequiredDomains.length > 0
    )
  ) {
    blockerCodes.push("domain_verification_missing");
    blockers.push(
      unverifiedRequiredDomains.length > 0
        ? `Required domains are not verified: ${unverifiedRequiredDomains.join(", ")}.`
        : "At least one verified custom domain is required.",
    );
  }
  if (requirements.billing.requiredCredits > 0 && billingReadiness.checkFailed) {
    blockerCodes.push("billing_credits_check_failed");
    blockers.push("Credit readiness check failed for this organization.");
  } else if (requirements.billing.requiredCredits > 0 && !billingReadiness.hasCredits) {
    blockerCodes.push("billing_credits_insufficient");
    blockers.push(
      `Organization is short ${billingReadiness.shortfall} credits for this deployment requirement.`,
    );
  }
  if (missingVerticalContracts.length > 0) {
    blockerCodes.push("vertical_contract_missing");
    blockers.push(
      `Missing required vertical contracts: ${missingVerticalContracts.join(", ")}.`,
    );
  }
  if (
    integrationRequirements.requiredIntegrationKeys.length > 0
    || integrationRequirements.unknownIntegrationRequirements.length > 0
  ) {
    checks.push({
      checkId: "integration_dependencies_ready",
      status: missingIntegrationKeys.length === 0 ? "pass" : "fail",
      summary:
        missingIntegrationKeys.length === 0
          ? integrationRequirements.unknownIntegrationRequirements.length === 0
            ? "Required integrations are available."
            : `Required known integrations are available. Unknown integration labels not enforced: ${integrationRequirements.unknownIntegrationRequirements.join(", ")}.`
          : `Missing required integrations: ${missingIntegrationKeys.join(", ")}.`,
    });
  }

  if (phoneRequired) {
    checks.push(
      {
        checkId: "telephony_binding_enabled",
        status: telephonyBinding.bindingEnabled ? "pass" : "fail",
        summary: telephonyBinding.bindingEnabled
          ? "Organization phone binding is enabled."
          : "Organization phone binding is disabled or missing.",
      },
      {
        checkId: "telephony_credentials_ready",
        status: credentialReady ? "pass" : "fail",
        summary: credentialReady
          ? "Organization telephony credentials are ready."
          : "Organization telephony credentials are not ready.",
      },
      {
        checkId: "telephony_from_number_ready",
        status: telephonyBinding.fromNumberReady ? "pass" : "fail",
        summary: telephonyBinding.fromNumberReady
          ? "Organization telephony binding has a from number."
          : "Organization telephony binding is missing a from number.",
      },
      {
        checkId: "telephony_transfer_targets_ready",
        status: missingTransferRoles.length === 0 ? "pass" : "fail",
        summary:
          missingTransferRoles.length === 0
            ? "All transfer targets are synced."
            : `Missing transfer targets: ${missingTransferRoles.join(", ")}.`,
      },
    );
  }

  return {
    contractVersion: "template_org_preflight_v1",
    organizationId: String(args.organizationId),
    status: blockerCodes.length === 0 ? "pass" : "fail",
    blockerCodes,
    blockers,
    checks,
    channels: {
      required: requiredChannels,
      missing: missingChannels,
      bindings: channelBindings,
    },
    integrations: {
      required: integrationRequirements.requiredIntegrationKeys,
      available: availableIntegrationKeys,
      missing: missingIntegrationKeys,
      unknown: integrationRequirements.unknownIntegrationRequirements,
    },
    telephony: {
      required: phoneRequired,
      providerKey: telephonyBinding.providerKey,
      bindingEnabled: telephonyBinding.bindingEnabled,
      credentialReady,
      fromNumberReady: telephonyBinding.fromNumberReady,
      webhookSecretReady: telephonyBinding.webhookSecretReady,
      missingTransferRoles,
    },
    domain: {
      required: domainRequired,
      requireVerified: requirements.domain.requireVerified,
      requiredDomains: requirements.domain.requiredDomains,
      availableDomains: domainReadiness.availableDomains,
      verifiedDomains: domainReadiness.verifiedDomains,
      missingDomains: missingRequiredDomains,
      unverifiedDomains: unverifiedRequiredDomains,
    },
    billing: {
      required: requirements.billing.requiredCredits > 0,
      requiredCredits: requirements.billing.requiredCredits,
      billingSource: requirements.billing.billingSource,
      requestSource: requirements.billing.requestSource,
      checked: billingReadiness.checked,
      hasCredits: billingReadiness.hasCredits,
      isUnlimited: billingReadiness.isUnlimited,
      totalCredits: billingReadiness.totalCredits,
      shortfall: billingReadiness.shortfall,
      skipped: billingReadiness.skipped,
      checkFailed: billingReadiness.checkFailed,
    },
    verticalContracts: {
      required: requirements.verticalContracts.requiredContracts,
      available: verticalAvailableContracts,
      missing: missingVerticalContracts,
    },
  };
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

export function pickTemplateBaselineSnapshot(
  customProperties: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!customProperties) {
    return {};
  }
  const snapshot = { ...customProperties };
  if (Object.prototype.hasOwnProperty.call(snapshot, "telephonyConfig")) {
    snapshot.telephonyConfig = toDeployableTelephonyConfig(snapshot.telephonyConfig);
  }
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

  if (field === "telephonyConfig") {
    if (value === undefined || value === null) {
      return null;
    }
    return toComparablePrimitive(toDeployableTelephonyConfig(value));
  }

  return toComparablePrimitive(value ?? null);
}

function resolveTemplateDistributionFieldPatchValue(args: {
  field: TemplateCloneDriftField;
  snapshotBaseline: Record<string, unknown>;
  existingCustomProperties: Record<string, unknown>;
}): unknown {
  if (!Object.prototype.hasOwnProperty.call(args.snapshotBaseline, args.field)) {
    return null;
  }

  if (args.field === "telephonyConfig") {
    return mergeDeployableTelephonyConfigIntoRuntime({
      templateConfig: args.snapshotBaseline.telephonyConfig,
      currentConfig: args.existingCustomProperties.telephonyConfig,
    });
  }

  return args.snapshotBaseline[args.field];
}

function resolveTemplateCloneFieldPolicyMode(
  linkage: ReturnType<typeof readTemplateCloneLinkageContract> | null,
  field: TemplateCloneDriftField
): TemplateClonePolicyMode {
  const mode = linkage?.overridePolicy.fields?.[field]?.mode ?? linkage?.overridePolicy.mode;
  return mode === "locked" || mode === "free" ? mode : "warn";
}

export function resolveTemplateCloneDriftContract(args: {
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

function buildTemplateLifecycleActorPayload(
  actor: TemplateLifecycleExecutionActor,
) {
  const fallbackUserId = (actor as { userId?: Id<"users"> }).userId;
  return {
    role: actor.roleName,
    ...(actor.auditUserId || fallbackUserId
      ? { userId: String(actor.auditUserId ?? fallbackUserId) }
      : {}),
    ...(actor.sessionId ? { sessionId: actor.sessionId } : {}),
    ...(actor.performedBy
      && String(actor.performedBy) !== String(actor.auditUserId ?? fallbackUserId ?? "")
      ? { performerId: String(actor.performedBy) }
      : {}),
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
  actor: TemplateLifecycleExecutionActor;
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
    actor: buildTemplateLifecycleActorPayload(args.actor),
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

  const objectActionId = await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.objectId,
    actionType: args.actionType,
    actionData: deterministicPayload,
    performedBy:
      args.actor.performedBy ?? (args.actor as { userId?: Id<"users"> }).userId,
    performedAt: args.timestamp,
  });

  const auditLogId = await args.ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId:
      args.actor.auditUserId ?? (args.actor as { userId?: Id<"users"> }).userId,
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

  return {
    objectActionId,
    auditLogId,
  };
}

async function writeTemplateWaeGateBlockedEvent(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  objectId: Id<"objects">;
  actionType:
    | "agent_template.publish_blocked_wae_gate"
    | "agent_template.distribution_blocked_wae_gate";
  actor: TemplateLifecycleExecutionActor;
  resource: "template_version" | "global_template";
  resourceId: string;
  templateId: string;
  templateVersionId?: string | null;
  templateVersionTag?: string | null;
  reasonCode: TemplateCertificationBlockReasonCode;
  message: string;
  gate: unknown;
  timestamp: number;
}) {
  const actorPayload = {
    role: args.actor.roleName,
    ...(args.actor.auditUserId ? { userId: String(args.actor.auditUserId) } : {}),
    ...(args.actor.sessionId ? { sessionId: args.actor.sessionId } : {}),
    ...(args.actor.performedBy
      && String(args.actor.performedBy) !== String(args.actor.auditUserId ?? "")
      ? { performerId: String(args.actor.performedBy) }
      : {}),
  };
  const payload = {
    contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
    actor: actorPayload,
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
    performedBy: args.actor.performedBy,
    performedAt: args.timestamp,
  });

  await args.ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId: args.actor.auditUserId,
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

function summarizeTemplateDistributionOrgPreflight(
  rows: Array<{
    operation: TemplateDistributionOperation;
    orgPreflight?: TemplateOrgPreflightResult;
  }>,
) {
  const blockerCounts = new Map<string, number>();
  let passing = 0;
  let failing = 0;
  for (const row of rows) {
    if (!row.orgPreflight) {
      continue;
    }
    if (row.orgPreflight.status === "pass") {
      passing += 1;
      continue;
    }
    failing += 1;
    for (const blockerCode of row.orgPreflight.blockerCodes) {
      blockerCounts.set(blockerCode, (blockerCounts.get(blockerCode) || 0) + 1);
    }
  }

  return {
    passing,
    failing,
    blockers: Object.fromEntries(
      Array.from(blockerCounts.entries()).sort((left, right) =>
        left[0].localeCompare(right[0]),
      ),
    ),
  };
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

export const AGENT_FIELD_PATCH_CONTRACT_VERSION =
  "agent_field_patch_contract_v1" as const;
export const AGENT_FIELD_PATCH_SUPPORTED_FIELDS = [
  "name",
  "displayName",
  "subtype",
  "agentClass",
  "personality",
  "language",
  "additionalLanguages",
  "voiceLanguage",
  "elevenLabsVoiceId",
  "brandVoiceInstructions",
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
  "modelId",
  "temperature",
  "maxTokens",
  "channelBindings",
  "blockedTopics",
  "telephonyConfig",
  "escalationPolicy",
  "unifiedPersonality",
] as const;
export const AGENT_FIELD_PATCH_DEFERRED_FIELDS = [
  "teamAccessMode",
  "operatorCollaborationDefaults",
  "dreamTeamSpecialists",
  "activeSoulMode",
  "activeArchetype",
  "modeChannelBindings",
  "enabledArchetypes",
  "soul",
] as const;

type AgentFieldPatchSupportedField =
  (typeof AGENT_FIELD_PATCH_SUPPORTED_FIELDS)[number];
type AgentFieldPatchDeferredField =
  (typeof AGENT_FIELD_PATCH_DEFERRED_FIELDS)[number];
type AgentFieldPatchApplyStatus =
  | "ready"
  | "no_change"
  | "blocked_locked"
  | "blocked_warn_confirmation_required"
  | "unsupported"
  | "deferred";

export interface AgentFieldPatchInput {
  name?: string;
  displayName?: string;
  subtype?: string;
  agentClass?: AgentClass;
  personality?: string;
  language?: string;
  additionalLanguages?: string[];
  voiceLanguage?: string;
  elevenLabsVoiceId?: string;
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  knowledgeBaseTags?: string[];
  toolProfile?: string;
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel?: "supervised" | "sandbox" | "autonomous" | "delegation" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  requireApprovalFor?: string[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: ChannelBindingContractRecord[];
  blockedTopics?: string[];
  telephonyConfig?: unknown;
  escalationPolicy?: unknown;
  unifiedPersonality?: boolean;
  [key: string]: unknown;
}

export interface AgentFieldPatchChange {
  field: string;
  label: string;
  category: "supported" | "unsupported" | "deferred";
  applyStatus: AgentFieldPatchApplyStatus;
  before: unknown;
  after: unknown;
  changed: boolean;
  reason?: string;
}

export interface AgentFieldPatchPreview {
  contractVersion: typeof AGENT_FIELD_PATCH_CONTRACT_VERSION;
  targetAgentId: Id<"objects">;
  targetAgentName: string;
  targetAgentDisplayName?: string;
  currentValues: Record<string, unknown>;
  proposedPatch: AgentFieldPatchInput;
  normalizedUpdates: Record<string, unknown>;
  changes: AgentFieldPatchChange[];
  changedFields: string[];
  unsupportedFields: string[];
  deferredFields: string[];
  overrideGate: TemplateOverrideGateSummary | null;
  summary: {
    canApply: boolean;
    changedFieldCount: number;
    readyFieldCount: number;
    unsupportedFieldCount: number;
    deferredFieldCount: number;
    blockedReason?: string;
  };
  proposalMessage: string;
}

const AGENT_FIELD_PATCH_LABELS: Record<string, string> = {
  name: "Name",
  displayName: "Display Name",
  subtype: "Subtype",
  agentClass: "Agent Class",
  personality: "Personality",
  language: "Language",
  additionalLanguages: "Additional Languages",
  voiceLanguage: "Voice Language",
  elevenLabsVoiceId: "ElevenLabs Voice",
  brandVoiceInstructions: "Brand Voice Instructions",
  systemPrompt: "System Prompt",
  faqEntries: "FAQ Entries",
  knowledgeBaseTags: "Knowledge Base Tags",
  toolProfile: "Tool Profile",
  enabledTools: "Enabled Tools",
  disabledTools: "Disabled Tools",
  autonomyLevel: "Autonomy Level",
  maxMessagesPerDay: "Max Messages / Day",
  maxCostPerDay: "Max Cost / Day",
  requireApprovalFor: "Require Approval For",
  modelId: "Model",
  temperature: "Temperature",
  maxTokens: "Max Tokens",
  channelBindings: "Channel Bindings",
  blockedTopics: "Blocked Topics",
  telephonyConfig: "Telephony Config",
  escalationPolicy: "Escalation Policy",
  unifiedPersonality: "Unified Personality",
  teamAccessMode: "Team Access Mode",
  operatorCollaborationDefaults: "Operator Collaboration Defaults",
  dreamTeamSpecialists: "Dream Team Specialists",
  activeSoulMode: "Active Soul Mode",
  activeArchetype: "Active Archetype",
  modeChannelBindings: "Mode Channel Bindings",
  enabledArchetypes: "Enabled Archetypes",
  soul: "Soul",
};

function readAgentFieldPatchInput(value: unknown): AgentFieldPatchInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as AgentFieldPatchInput;
}

function normalizeAgentFieldPatchString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.trim();
}

function normalizeAgentFieldPatchNonEmptyString(
  value: unknown,
): string | undefined {
  const normalized = normalizeAgentFieldPatchString(value);
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeAgentFieldPatchStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const deduped = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const normalized = entry.trim();
    if (!normalized) {
      continue;
    }
    deduped.add(normalized);
  }
  return Array.from(deduped).sort((left, right) => left.localeCompare(right));
}

function normalizeAgentFieldPatchToolArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return normalizeDeterministicToolNames(
    value.filter((entry): entry is string => typeof entry === "string")
  );
}

function normalizeAgentFieldPatchFaqEntries(
  value: unknown,
): Array<{ q: string; a: string }> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalizedEntries: Array<{ q: string; a: string }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return undefined;
    }
    const record = entry as Record<string, unknown>;
    const question = normalizeAgentFieldPatchString(record.q);
    const answer = normalizeAgentFieldPatchString(record.a);
    if (!question && !answer) {
      continue;
    }
    if (!question || !answer) {
      return undefined;
    }
    normalizedEntries.push({
      q: question,
      a: answer,
    });
  }
  return normalizedEntries;
}

function normalizeAgentFieldPatchAutonomyLevel(
  value: unknown
): AgentFieldPatchInput["autonomyLevel"] | undefined {
  return value === "supervised"
    || value === "sandbox"
    || value === "autonomous"
    || value === "delegation"
    || value === "draft_only"
    ? value
    : undefined;
}

function normalizeAgentFieldPatchTemperature(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeAgentFieldPatchNumber(
  value: unknown,
  args: {
    min?: number;
    integer?: boolean;
  } = {},
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (args.integer && !Number.isInteger(value)) {
    return undefined;
  }
  if (args.min !== undefined && value < args.min) {
    return undefined;
  }
  return value;
}

function normalizeAgentFieldPatchBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function isAgentFieldPatchRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveNormalizedTelephonyConfigPatch(args: {
  currentValue: unknown;
  proposedValue: unknown;
}): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (!isAgentFieldPatchRecord(args.proposedValue)) {
    return {
      ok: false,
      reason: "Expected telephonyConfig to be an object.",
    };
  }

  const currentConfig = normalizeAgentTelephonyConfig(args.currentValue);
  const proposedConfig = args.proposedValue;
  if (
    Object.prototype.hasOwnProperty.call(proposedConfig, "elevenlabs")
    && proposedConfig.elevenlabs !== undefined
    && !isAgentFieldPatchRecord(proposedConfig.elevenlabs)
  ) {
    return {
      ok: false,
      reason: "Expected telephonyConfig.elevenlabs to be an object when provided.",
    };
  }

  const mergedConfig = normalizeAgentTelephonyConfig({
    ...currentConfig,
    ...proposedConfig,
    ...(Object.prototype.hasOwnProperty.call(proposedConfig, "elevenlabs")
      ? {
          elevenlabs: {
            ...currentConfig.elevenlabs,
            ...(isAgentFieldPatchRecord(proposedConfig.elevenlabs)
              ? proposedConfig.elevenlabs
              : {}),
          },
        }
      : {}),
  });

  return {
    ok: true,
    value: mergeDeployableTelephonyConfigIntoRuntime({
      templateConfig: mergedConfig,
      currentConfig: args.currentValue,
    }),
  };
}

function readAgentFieldPatchCurrentValue(
  agent: ActiveAgentCandidate,
  field: AgentFieldPatchSupportedField | AgentFieldPatchDeferredField,
  customProperties: Record<string, unknown>,
): unknown {
  switch (field) {
    case "name":
      return agent.name;
    case "subtype":
      return agent.subtype;
    case "agentClass":
      return readAgentClass(customProperties);
    default:
      return customProperties[field];
  }
}

function normalizeAgentFieldPatchComparableValue(
  field: AgentFieldPatchSupportedField | AgentFieldPatchDeferredField,
  value: unknown,
): unknown {
  switch (field) {
    case "name":
    case "subtype":
    case "toolProfile":
      return normalizeAgentFieldPatchString(value) ?? null;
    case "agentClass":
      return typeof value === "string" ? normalizeAgentClass(value) : null;
    case "displayName":
    case "personality":
    case "language":
    case "additionalLanguages":
    case "voiceLanguage":
    case "elevenLabsVoiceId":
    case "brandVoiceInstructions":
    case "systemPrompt":
    case "knowledgeBaseTags":
    case "modelId":
      if (field === "additionalLanguages" || field === "knowledgeBaseTags") {
        return normalizeAgentFieldPatchStringArray(value) ?? [];
      }
      return normalizeAgentFieldPatchString(value) ?? null;
    case "faqEntries":
      return normalizeAgentFieldPatchFaqEntries(value) ?? [];
    case "enabledTools":
    case "disabledTools":
    case "requireApprovalFor":
      return normalizeAgentFieldPatchToolArray(value) ?? [];
    case "autonomyLevel":
      return normalizeAgentFieldPatchAutonomyLevel(value) ?? null;
    case "maxMessagesPerDay":
    case "maxCostPerDay":
    case "temperature":
    case "maxTokens":
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    case "blockedTopics":
      return normalizeAgentFieldPatchStringArray(value) ?? [];
    case "channelBindings":
      if (!Array.isArray(value)) {
        return [];
      }
      return normalizeChannelBindingsContract(
        value as ChannelBindingContractRecord[]
      );
    case "telephonyConfig":
      return value === undefined || value === null
        ? null
        : toDeployableTelephonyConfig(value);
    case "escalationPolicy":
    case "operatorCollaborationDefaults":
      return isAgentFieldPatchRecord(value)
        ? toComparablePrimitive(value)
        : value ?? null;
    case "unifiedPersonality":
      return typeof value === "boolean" ? value : null;
    default:
      return toComparablePrimitive(value ?? null);
  }
}

function buildAgentFieldPatchCurrentValues(
  agent: ActiveAgentCandidate,
  customProperties: Record<string, unknown>,
): Record<string, unknown> {
  const currentValues: Record<string, unknown> = {};
  for (const field of [
    ...AGENT_FIELD_PATCH_SUPPORTED_FIELDS,
    ...AGENT_FIELD_PATCH_DEFERRED_FIELDS,
  ] as const) {
    currentValues[field] = normalizeAgentFieldPatchComparableValue(
      field,
      readAgentFieldPatchCurrentValue(agent, field, customProperties),
    );
  }
  return currentValues;
}

function resolveAgentFieldPatchSupportedValue(args: {
  field: AgentFieldPatchSupportedField;
  value: unknown;
  currentValue?: unknown;
}): { ok: true; value: unknown } | { ok: false; reason: string } {
  switch (args.field) {
    case "name":
    case "subtype": {
      const normalized = normalizeAgentFieldPatchNonEmptyString(args.value);
      if (!normalized) {
        return {
          ok: false,
          reason: `Expected ${args.field} to be a non-empty string.`,
        };
      }
      return { ok: true, value: normalized };
    }
    case "agentClass": {
      if (typeof args.value !== "string") {
        return { ok: false, reason: "Expected agentClass to be a string." };
      }
      return { ok: true, value: normalizeAgentClass(args.value) };
    }
    case "displayName":
    case "personality":
    case "language":
    case "voiceLanguage":
    case "elevenLabsVoiceId":
    case "brandVoiceInstructions":
    case "systemPrompt":
    case "toolProfile":
    case "modelId": {
      if (typeof args.value !== "string") {
        return { ok: false, reason: `Expected ${args.field} to be a string.` };
      }
      return { ok: true, value: args.value.trim() };
    }
    case "additionalLanguages":
    case "knowledgeBaseTags": {
      const normalized = normalizeAgentFieldPatchStringArray(args.value);
      if (!normalized) {
        return {
          ok: false,
          reason: `Expected ${args.field} to be an array of strings.`,
        };
      }
      return { ok: true, value: normalized };
    }
    case "faqEntries": {
      const normalized = normalizeAgentFieldPatchFaqEntries(args.value);
      if (!normalized) {
        return {
          ok: false,
          reason:
            "Expected faqEntries to be an array of { q, a } records with non-empty strings.",
        };
      }
      return { ok: true, value: normalized };
    }
    case "enabledTools":
    case "disabledTools":
    case "requireApprovalFor": {
      const normalized = normalizeAgentFieldPatchToolArray(args.value);
      if (!normalized) {
        return {
          ok: false,
          reason: `Expected ${args.field} to be an array of tool names.`,
        };
      }
      return { ok: true, value: normalized };
    }
    case "autonomyLevel": {
      const normalized = normalizeAgentFieldPatchAutonomyLevel(args.value);
      if (!normalized) {
        return {
          ok: false,
          reason:
            "Expected autonomyLevel to be one of supervised, sandbox, autonomous, delegation, or draft_only.",
        };
      }
      return { ok: true, value: normalized };
    }
    case "maxMessagesPerDay": {
      const normalized = normalizeAgentFieldPatchNumber(args.value, {
        min: 0,
        integer: true,
      });
      if (normalized === undefined) {
        return {
          ok: false,
          reason: "Expected maxMessagesPerDay to be a non-negative integer.",
        };
      }
      return { ok: true, value: normalized };
    }
    case "maxCostPerDay": {
      const normalized = normalizeAgentFieldPatchNumber(args.value, {
        min: 0,
      });
      if (normalized === undefined) {
        return {
          ok: false,
          reason: "Expected maxCostPerDay to be a non-negative number.",
        };
      }
      return { ok: true, value: normalized };
    }
    case "temperature": {
      const normalized = normalizeAgentFieldPatchTemperature(args.value);
      if (normalized === undefined) {
        return { ok: false, reason: "Expected temperature to be a finite number." };
      }
      return { ok: true, value: normalized };
    }
    case "maxTokens": {
      const normalized = normalizeAgentFieldPatchNumber(args.value, {
        min: 1,
        integer: true,
      });
      if (normalized === undefined) {
        return {
          ok: false,
          reason: "Expected maxTokens to be an integer greater than 0.",
        };
      }
      return { ok: true, value: normalized };
    }
    case "blockedTopics": {
      const normalized = normalizeAgentFieldPatchStringArray(args.value);
      if (!normalized) {
        return { ok: false, reason: "Expected blockedTopics to be an array of strings." };
      }
      return { ok: true, value: normalized };
    }
    case "channelBindings": {
      if (!Array.isArray(args.value)) {
        return {
          ok: false,
          reason: "Expected channelBindings to be an array of channel binding records.",
        };
      }
      try {
        return {
          ok: true,
          value: normalizeChannelBindingsContract(
            args.value as ChannelBindingContractRecord[]
          ),
        };
      } catch (error) {
        return {
          ok: false,
          reason:
            error instanceof Error
              ? error.message
              : "Invalid channelBindings payload.",
        };
      }
    }
    case "telephonyConfig":
      return resolveNormalizedTelephonyConfigPatch({
        currentValue: args.currentValue,
        proposedValue: args.value,
      });
    case "escalationPolicy":
      if (!isAgentFieldPatchRecord(args.value)) {
        return {
          ok: false,
          reason: "Expected escalationPolicy to be an object.",
        };
      }
      return {
        ok: true,
        value: toComparablePrimitive(args.value),
      };
    case "unifiedPersonality": {
      const normalized = normalizeAgentFieldPatchBoolean(args.value);
      if (normalized === undefined) {
        return {
          ok: false,
          reason: "Expected unifiedPersonality to be a boolean.",
        };
      }
      return { ok: true, value: normalized };
    }
    default:
      return { ok: false, reason: `Unsupported field ${args.field}.` };
  }
}

async function buildAgentFieldPatchPreview(
  ctx: MutationCtx,
  args: {
    sessionId: string;
    agentId: Id<"objects">;
    patch: unknown;
    overridePolicyGate?: {
      confirmWarnOverride?: boolean;
      reason?: string;
    };
  },
): Promise<AgentFieldPatchPreview> {
  const session = await ctx.db
    .query("sessions")
    .filter((q) => q.eq(q.field("_id"), args.sessionId))
    .first();

  if (!session) {
    throw new Error("Invalid session");
  }

  const agent = await ctx.db.get(args.agentId);
  if (!agent || agent.type !== "org_agent") {
    throw new Error("Agent not found");
  }

  enforceNotProtected(agent);

  const rawPatch = readAgentFieldPatchInput(args.patch);
  const normalizedUpdates: Record<string, unknown> = {};
  const changes: AgentFieldPatchChange[] = [];
  const changedFields: string[] = [];
  const unsupportedFields: string[] = [];
  const deferredFields: string[] = [];
  const customProperties =
    (agent.customProperties as Record<string, unknown> | undefined) ?? {};
  const currentValues = buildAgentFieldPatchCurrentValues(agent, customProperties);
  const normalizedOverrideReason =
    normalizeOptionalString(args.overridePolicyGate?.reason) || null;
  const warnConfirmationAccepted =
    args.overridePolicyGate?.confirmWarnOverride === true
    && normalizedOverrideReason !== null;

  for (const [field, proposedValue] of Object.entries(rawPatch)) {
    const label = AGENT_FIELD_PATCH_LABELS[field] || field;
    if (
      (AGENT_FIELD_PATCH_DEFERRED_FIELDS as readonly string[]).includes(field)
    ) {
      deferredFields.push(field);
      changes.push({
        field,
        label,
        category: "deferred",
        applyStatus: "deferred",
        before: currentValues[field],
        after: proposedValue,
        changed: true,
        reason:
          "This field is recognized but deferred in the first chat-apply slice.",
      });
      continue;
    }

    if (
      !(AGENT_FIELD_PATCH_SUPPORTED_FIELDS as readonly string[]).includes(field)
    ) {
      unsupportedFields.push(field);
      changes.push({
        field,
        label,
        category: "unsupported",
        applyStatus: "unsupported",
        before: currentValues[field] ?? customProperties[field],
        after: proposedValue,
        changed: true,
        reason: "This field is not supported by the current agent patch contract.",
      });
      continue;
    }

    const supportedField = field as AgentFieldPatchSupportedField;
    const normalizedProposal = resolveAgentFieldPatchSupportedValue({
      field: supportedField,
      value: proposedValue,
      currentValue: readAgentFieldPatchCurrentValue(
        agent,
        supportedField,
        customProperties,
      ),
    });
    const before = currentValues[supportedField];

    if (!normalizedProposal.ok) {
      unsupportedFields.push(field);
      changes.push({
        field,
        label,
        category: "unsupported",
        applyStatus: "unsupported",
        before,
        after: proposedValue,
        changed: true,
        reason: normalizedProposal.reason,
      });
      continue;
    }

    const after = normalizeAgentFieldPatchComparableValue(
      supportedField,
      normalizedProposal.value,
    );
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    if (changed) {
      normalizedUpdates[supportedField] = normalizedProposal.value;
      changedFields.push(supportedField);
    }
    changes.push({
      field,
      label,
      category: "supported",
      applyStatus: changed ? "ready" : "no_change",
      before,
      after,
      changed,
    });
  }

  const recognizedUpdatedFields = normalizeDeterministicUpdatedFields([
    ...changedFields,
    ...deferredFields.filter((field): field is AgentFieldPatchDeferredField =>
      (AGENT_FIELD_PATCH_DEFERRED_FIELDS as readonly string[]).includes(field)
    ),
  ]);

  await enforceOneOfOneOperatorMutationAccess(ctx, {
    userId: session.userId,
    organizationId: agent.organizationId,
    agent,
    operation: "update",
    updatedFields: recognizedUpdatedFields,
  });

  const overrideGate = resolveTemplateOverrideGateForManagedClone({
    customProperties,
    updates: normalizedUpdates,
    warnConfirmation: warnConfirmationAccepted,
    reason: normalizedOverrideReason,
  });
  const lockedFields = new Set(overrideGate?.lockedFields ?? []);
  const warnFields = new Set(overrideGate?.warnFields ?? []);

  let readyFieldCount = 0;
  for (const change of changes) {
    if (change.category !== "supported" || !change.changed) {
      continue;
    }
    if (lockedFields.has(change.field as TemplateCloneDriftField)) {
      change.applyStatus = "blocked_locked";
      change.reason = "Managed-clone override policy locks this field.";
      continue;
    }
    if (
      warnFields.has(change.field as TemplateCloneDriftField)
      && overrideGate?.decision === "blocked_warn_confirmation_required"
    ) {
      change.applyStatus = "blocked_warn_confirmation_required";
      change.reason =
        "Managed-clone warn override requires explicit confirmation and reason.";
      continue;
    }
    readyFieldCount += 1;
  }

  const targetAgentDisplayName =
    normalizeOptionalString(customProperties.displayName) || undefined;
  const targetAgentName = targetAgentDisplayName || agent.name;
  const blockedReasons: string[] = [];
  if (changedFields.length === 0) {
    blockedReasons.push("No supported field changes were proposed.");
  }
  if (unsupportedFields.length > 0) {
    blockedReasons.push(
      `Unsupported fields present: ${unsupportedFields.join(", ")}.`,
    );
  }
  if (deferredFields.length > 0) {
    blockedReasons.push(
      `Deferred fields present: ${deferredFields.join(", ")}.`,
    );
  }
  if (overrideGate?.decision === "blocked_locked") {
    blockedReasons.push(
      `Managed-clone override policy locked: ${overrideGate.lockedFields.join(", ")}.`,
    );
  }
  if (overrideGate?.decision === "blocked_warn_confirmation_required") {
    blockedReasons.push(
      `Managed-clone warn confirmation required: ${overrideGate.warnFields.join(", ")}.`,
    );
  }
  const canApply = blockedReasons.length === 0 && readyFieldCount > 0;
  const readyLabels = changes
    .filter((change) => change.applyStatus === "ready")
    .map((change) => change.label.toLowerCase());
  const proposalMessage = canApply
    ? `Propose ${readyFieldCount} agent setting update${readyFieldCount === 1 ? "" : "s"} for ${targetAgentName}: ${readyLabels.join(", ")}.`
    : `Proposed agent field patch for ${targetAgentName} is blocked: ${blockedReasons.join(" ")}`;

  return {
    contractVersion: AGENT_FIELD_PATCH_CONTRACT_VERSION,
    targetAgentId: args.agentId,
    targetAgentName: agent.name,
    targetAgentDisplayName,
    currentValues,
    proposedPatch: rawPatch,
    normalizedUpdates,
    changes,
    changedFields,
    unsupportedFields,
    deferredFields,
    overrideGate,
    summary: {
      canApply,
      changedFieldCount: changedFields.length,
      readyFieldCount,
      unsupportedFieldCount: unsupportedFields.length,
      deferredFieldCount: deferredFields.length,
      blockedReason: blockedReasons.length > 0 ? blockedReasons.join(" ") : undefined,
    },
    proposalMessage,
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

  // Mother remains explicit-target only and must never enter implicit org routing.
  candidates = candidates.filter((agent) => {
    const props = readAgentCustomProperties(agent);
    return !isPlatformMotherAuthorityRecord(agent.name, props);
  });
  if (candidates.length === 0) {
    return null;
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
    return hasPlatformMotherTemplateRole(props);
  });
  if (explicitOnboardingTemplate) {
    return explicitOnboardingTemplate;
  }

  const legacyQuinnTemplate = templates.find((template) =>
    matchesPlatformMotherIdentityName(
      template.name,
      template.customProperties as Record<string, unknown> | undefined,
    )
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

export async function runPrimaryAgentContextRepairLifecycle(
  ctx: MutationCtx,
  args: {
    actor: TemplateLifecycleExecutionActor;
    organizationId: Id<"organizations">;
    operatorId?: string;
    forcePrimaryAgentId?: string;
    reason?: string;
    reviewArtifactId?: string;
  },
) {
  const now = Date.now();
  const repairs = await applyPrimaryAgentRepairsForOrganization(ctx, {
    organizationId: String(args.organizationId),
    operatorId: normalizeOptionalString(args.operatorId) || DEFAULT_OPERATOR_CONTEXT_ID,
    forcePrimaryAgentId: normalizeOptionalString(args.forcePrimaryAgentId),
  });

  const patchedAgentIds = Array.from(
    new Set(
      repairs.flatMap((entry) => entry.patchedAgentIds)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const actionData = {
    contractVersion: AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
    actor: buildTemplateLifecycleActorPayload(args.actor),
    organizationId: String(args.organizationId),
    operatorId: normalizeOptionalString(args.operatorId) || DEFAULT_OPERATOR_CONTEXT_ID,
    reason: normalizeOptionalString(args.reason) || "primary_agent_context_repair",
    reviewArtifactId: normalizeOptionalString(args.reviewArtifactId) || null,
    repairedContexts: repairs.length,
    patchedAgentCount: patchedAgentIds.length,
    repairs,
    timestamp: now,
  };

  const objectActionIds: Id<"objectActions">[] = [];
  const auditLogIds: Id<"auditLogs">[] = [];
  for (const agentId of patchedAgentIds) {
    objectActionIds.push(
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: agentId as Id<"objects">,
        actionType: "primary_agent_context_repaired",
        actionData,
        performedBy: args.actor.performedBy,
        performedAt: now,
      }),
    );
    auditLogIds.push(
      await ctx.db.insert("auditLogs", {
        organizationId: args.organizationId,
        userId: args.actor.auditUserId,
        action: "primary_agent_context_repaired",
        resource: "org_agent",
        resourceId: agentId,
        success: true,
        metadata: actionData,
        createdAt: now,
      }),
    );
  }

  return {
    organizationId: args.organizationId,
    repairedContexts: repairs.length,
    patchedAgentCount: patchedAgentIds.length,
    repairs,
    objectActionIds,
    auditLogIds,
  };
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

export const getAgentLayeredContextWorkflows = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return [];
    }

    return await loadAgentLayeredContextWorkflows(ctx, args.agentId);
  },
});

export const getAgentLayeredContextWorkflowIdsInternal = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return [];
    }

    const workflows = await loadAgentLayeredContextWorkflows(ctx, args.agentId);
    return workflows.map((workflow) => workflow.workflowId);
  },
});

export const attachLayeredContextWorkflow = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "layer_workflow") {
      throw new Error("Layered context workflow not found");
    }

    if (workflow.organizationId !== agent.organizationId) {
      throw new Error("Layered context workflow belongs to a different organization");
    }

    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.agentId).eq("linkType", AGENT_LAYERED_CONTEXT_LINK_TYPE)
      )
      .collect();
    const existingLink = existingLinks.find((link) => link.toObjectId === args.workflowId);
    if (existingLink) {
      return {
        success: true,
        attached: false,
        linkId: existingLink._id,
      };
    }

    const now = Date.now();
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: agent.organizationId,
      fromObjectId: args.agentId,
      toObjectId: args.workflowId,
      linkType: AGENT_LAYERED_CONTEXT_LINK_TYPE,
      createdAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "layered_context_workflow_attached",
      actionData: {
        workflowId: args.workflowId,
        linkType: AGENT_LAYERED_CONTEXT_LINK_TYPE,
      },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      attached: true,
      linkId,
    };
  },
});

export const detachLayeredContextWorkflow = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.agentId).eq("linkType", AGENT_LAYERED_CONTEXT_LINK_TYPE)
      )
      .collect();
    const existingLink = existingLinks.find((link) => link.toObjectId === args.workflowId);
    if (!existingLink) {
      return {
        success: true,
        detached: false,
      };
    }

    const now = Date.now();
    await ctx.db.delete(existingLink._id);
    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "layered_context_workflow_detached",
      actionData: {
        workflowId: args.workflowId,
        linkType: AGENT_LAYERED_CONTEXT_LINK_TYPE,
      },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      detached: true,
    };
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

async function resolveProtectedTemplateByRoleForOrgBootstrap(
  ctx: MutationCtx,
  args: {
    templateRole: string;
  }
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
  resolutionSource: "platform_template_role";
}> {
  const normalizedTemplateRole = normalizeOptionalString(args.templateRole);
  if (!normalizedTemplateRole) {
    throw new Error("Managed specialist template role is required.");
  }

  const platformOrgId = resolvePlatformOrgIdFromEnv();
  if (!platformOrgId) {
    throw new Error(
      "Protected template resolution failed: PLATFORM_ORG_ID/TEST_ORG_ID is not configured."
    );
  }
  const platformAgents = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", platformOrgId).eq("type", "org_agent")
    )
    .collect();

  const templateCandidates = filterProtectedTemplateAgents(platformAgents, {
    templateRole: normalizedTemplateRole,
  });
  const template = templateCandidates[0];
  if (!template || !template._id) {
    throw new Error(
      `Protected template role not found on platform org: ${normalizedTemplateRole}.`
    );
  }
  if (template.status !== "template") {
    throw new Error(
      `Protected template role is not template-status: ${normalizedTemplateRole}.`
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

async function ensureManagedTemplateSpecialistCloneForOrgHandler(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    templateRole: string;
    name?: string;
    description?: string;
    subtype?: string;
    agentClass?: AgentClass;
    operatorId?: string;
    isPrimary?: boolean;
    channelBindings?: ChannelBindingContractRecord[];
    customPropertiesOverlay?: Record<string, unknown>;
  }
): Promise<{
  agentId: Id<"objects">;
  provisioningAction: "template_clone_created" | "template_clone_updated";
  templateAgentId: Id<"objects">;
  templateResolutionSource: "platform_template_role";
}> {
  const now = Date.now();
  const resolvedTemplate = await resolveProtectedTemplateByRoleForOrgBootstrap(ctx, {
    templateRole: args.templateRole,
  });
  const template = resolvedTemplate.template;
  const templateProps =
    (template.customProperties as Record<string, unknown> | undefined) ?? {};
  const templateLifecycleStatus = normalizeTemplateLifecycleStatus(
    templateProps.templateLifecycleStatus
  );
  if (templateLifecycleStatus === "deprecated") {
    throw new Error(
      `Managed specialist template is deprecated and cannot be provisioned: ${args.templateRole}.`
    );
  }

  const templateVersion = resolveDefaultOrgTemplateVersionTag({
    templateId: template._id,
    templateUpdatedAt: template.updatedAt,
    templateCustomProperties: templateProps,
  });
  const templateBaseline = pickTemplateBaselineSnapshot(templateProps);
  const syncJobId = [
    "org_managed_specialist_template_sync",
    String(args.organizationId),
    String(template._id),
    templateVersion,
  ].join(":");
  const overlayProps = {
    ...((args.customPropertiesOverlay as Record<string, unknown> | undefined) ?? {}),
  };
  const normalizedChannelBindings = args.channelBindings
    ? normalizeChannelBindingsContract(args.channelBindings)
    : undefined;
  const markPrimary = args.isPrimary === true;
  const normalizedOperatorId = normalizeOptionalString(args.operatorId);
  const hasExplicitOverlay =
    Boolean(args.name || args.description || args.subtype || args.agentClass)
    || Boolean(normalizedChannelBindings)
    || Object.keys(overlayProps).length > 0;
  const linkageLifecycleState = hasExplicitOverlay
    ? "managed_override_pending_sync"
    : "managed_in_sync";

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
    const nextCustomProperties: Record<string, unknown> = {
      ...existingProps,
      ...overlayProps,
      templateAgentId: template._id,
      templateVersion,
      cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
      templateCloneLinkage: buildManagedTemplateCloneLinkage({
        sourceTemplateId: String(template._id),
        sourceTemplateVersion: templateVersion,
        overridePolicy: existingLinkage?.overridePolicy,
        lastTemplateSyncAt: now,
        lastTemplateSyncJobId: syncJobId,
        cloneLifecycleState: hasExplicitOverlay
          ? "managed_override_pending_sync"
          : existingLinkage?.cloneLifecycleState,
      }),
      lastTemplateSyncAt: now,
      lastTemplateJobId: syncJobId,
      creationSource: "catalog_clone",
      protected: false,
      isPrimary: markPrimary,
      totalMessages:
        typeof existingProps.totalMessages === "number" ? existingProps.totalMessages : 0,
      totalCostUsd:
        typeof existingProps.totalCostUsd === "number" ? existingProps.totalCostUsd : 0,
    };
    if (normalizedOperatorId) {
      nextCustomProperties.operatorId = normalizedOperatorId;
    } else {
      delete nextCustomProperties.operatorId;
    }
    if (normalizedChannelBindings) {
      nextCustomProperties.channelBindings = normalizedChannelBindings;
    }
    nextCustomProperties.agentClass = normalizeAgentClass(
      args.agentClass ?? overlayProps.agentClass ?? existingProps.agentClass,
      normalizeAgentClass(templateBaseline.agentClass, "internal_operator")
    );

    await ctx.db.patch(existingClone._id, {
      subtype: args.subtype || template.subtype || existingClone.subtype || "general",
      name: args.name || existingClone.name || template.name,
      description:
        normalizeOptionalString(args.description)
        || normalizeOptionalString(existingClone.description)
        || normalizeOptionalString(template.description)
        || "Managed template specialist clone",
      status: "active",
      customProperties: nextCustomProperties,
      updatedAt: now,
    });

    if (normalizedOperatorId) {
      await applyPrimaryAgentRepairsForOrganization(ctx, {
        organizationId: String(args.organizationId),
        operatorId: normalizedOperatorId,
        ...(markPrimary ? { forcePrimaryAgentId: String(existingClone._id) } : {}),
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: existingClone._id,
      actionType: "org_managed_template_specialist_clone_upserted",
      actionData: {
        source: "ensureManagedTemplateSpecialistAgentForOrgInternal",
        mode: "existing_clone",
        templateAgentId: String(template._id),
        templateRole: args.templateRole,
        templateVersion,
        templateResolutionSource: resolvedTemplate.resolutionSource,
        syncJobId,
        linkageLifecycleState,
        isPrimary: markPrimary,
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

  const customProperties: Record<string, unknown> = {
    ...templateBaseline,
    ...overlayProps,
    agentClass: normalizeAgentClass(
      args.agentClass ?? overlayProps.agentClass ?? templateBaseline.agentClass,
      "internal_operator"
    ),
    protected: false,
    templateAgentId: template._id,
    templateVersion,
    cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
    templateCloneLinkage: buildManagedTemplateCloneLinkage({
      sourceTemplateId: String(template._id),
      sourceTemplateVersion: templateVersion,
      lastTemplateSyncAt: now,
      lastTemplateSyncJobId: syncJobId,
      cloneLifecycleState: linkageLifecycleState,
    }),
    lastTemplateSyncAt: now,
    lastTemplateJobId: syncJobId,
    creationSource: "catalog_clone",
    isPrimary: markPrimary,
    totalMessages:
      typeof templateBaseline.totalMessages === "number" ? templateBaseline.totalMessages : 0,
    totalCostUsd:
      typeof templateBaseline.totalCostUsd === "number" ? templateBaseline.totalCostUsd : 0,
  };
  if (normalizedOperatorId) {
    customProperties.operatorId = normalizedOperatorId;
  }
  if (normalizedChannelBindings) {
    customProperties.channelBindings = normalizedChannelBindings;
  }

  const cloneId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: args.subtype || template.subtype || "general",
    name: args.name || template.name,
    description:
      normalizeOptionalString(args.description)
      || normalizeOptionalString(template.description)
      || "Managed template specialist clone",
    status: "active",
    customProperties,
    createdBy: template.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  if (normalizedOperatorId) {
    await applyPrimaryAgentRepairsForOrganization(ctx, {
      organizationId: String(args.organizationId),
      operatorId: normalizedOperatorId,
      ...(markPrimary ? { forcePrimaryAgentId: String(cloneId) } : {}),
    });
  }

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: cloneId,
    actionType: "org_managed_template_specialist_clone_upserted",
    actionData: {
      source: "ensureManagedTemplateSpecialistAgentForOrgInternal",
      mode: "created",
      templateAgentId: String(template._id),
      templateRole: args.templateRole,
      templateVersion,
      templateResolutionSource: resolvedTemplate.resolutionSource,
      syncJobId,
      linkageLifecycleState,
      isPrimary: markPrimary,
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
 * INTERNAL: Provision the org's default managed operator authority agent.
 * This is the strict rail for desktop/mobile/native operator surfaces.
 * It never falls back to legacy auto-created recovery agents.
 */
export const ensureOperatorAuthorityAgentForOrgInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appSurface: v.optional(v.string()),
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
      const provisioned = await ensureManagedDefaultTemplateCloneForOrgHandler(ctx, {
        organizationId: args.organizationId,
        channel: OPERATOR_AUTHORITY_BOOTSTRAP_CHANNEL,
        routeSelectors: args.routeSelectors,
      });
      return {
        agentId: provisioned.agentId,
        provisioningAction: provisioned.provisioningAction,
        fallbackUsed: false,
        templateAgentId: provisioned.templateAgentId,
        templateResolutionSource: provisioned.templateResolutionSource,
        authorityChannel: OPERATOR_AUTHORITY_BOOTSTRAP_CHANNEL,
        appSurface: normalizeOperatorAuthorityAppSurface(args.appSurface),
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown_operator_authority_bootstrap_error";
      throw new Error(`OPERATOR_AUTHORITY_BOOTSTRAP_FAILED: ${reason}`);
    }
  },
});

/**
 * INTERNAL: Provision the org's default agent as a managed template clone.
 * Strict behavior: no legacy auto-recovery fallback.
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
    const provisioned = await ensureManagedDefaultTemplateCloneForOrgHandler(ctx, args);
    return {
      agentId: provisioned.agentId,
      provisioningAction: provisioned.provisioningAction,
      fallbackUsed: false,
      templateAgentId: provisioned.templateAgentId,
      templateResolutionSource: provisioned.templateResolutionSource,
    };
  },
});

export const ensureManagedTemplateSpecialistAgentForOrgInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    templateRole: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()),
    agentClass: v.optional(agentClassValidator),
    operatorId: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    channelBindings: v.optional(v.array(webchatChannelBindingValidator)),
    customPropertiesOverlay: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const provisioned = await ensureManagedTemplateSpecialistCloneForOrgHandler(ctx, {
      organizationId: args.organizationId,
      templateRole: args.templateRole,
      name: args.name,
      description: args.description,
      subtype: args.subtype,
      agentClass: args.agentClass,
      operatorId: args.operatorId,
      isPrimary: args.isPrimary,
      channelBindings: args.channelBindings as ChannelBindingContractRecord[] | undefined,
      customPropertiesOverlay:
        (args.customPropertiesOverlay as Record<string, unknown> | undefined) ?? undefined,
    });
    return {
      agentId: provisioned.agentId,
      provisioningAction: provisioned.provisioningAction,
      templateAgentId: provisioned.templateAgentId,
      templateResolutionSource: provisioned.templateResolutionSource,
    };
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

export async function runAgentTemplateVersionPublishLifecycle(
  ctx: MutationCtx,
  args: {
    actor: TemplateLifecycleExecutionActor;
    templateId: Id<"objects">;
    templateVersionId: Id<"objects">;
    publishReason?: string;
  },
) {
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

  const certificationEvaluation = await ensureTemplateVersionCertificationForLifecycle(ctx, {
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: versionTag,
    recordedByUserId: args.actor.auditUserId ?? (args.actor.performedBy as Id<"users">),
  });
  if (!certificationEvaluation.allowed) {
    await writeTemplateWaeGateBlockedEvent({
      ctx,
      organizationId: template.organizationId,
      objectId: args.templateVersionId,
      actionType: "agent_template.publish_blocked_wae_gate",
      actor: args.actor,
      resource: "template_version",
      resourceId: String(args.templateVersionId),
      templateId: String(args.templateId),
      templateVersionId: String(args.templateVersionId),
      templateVersionTag: versionTag,
      reasonCode: certificationEvaluation.reasonCode ?? "certification_invalid",
      message:
        certificationEvaluation.message
        || "Template certification blocked template publication.",
      gate: certificationEvaluation.certification,
      timestamp: now,
    });
    throw new ConvexError({
      code: "INVALID_STATE",
      message:
        certificationEvaluation.message
        || "Template certification blocked template publication.",
    });
  }

  await ctx.db.patch(args.templateVersionId, {
    customProperties: {
      ...versionProps,
      lifecycleStatus: "published",
      publishedAt: now,
      publishedBy: String(args.actor.auditUserId ?? args.actor.performedBy ?? ""),
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
      templateLifecycleUpdatedBy: String(
        args.actor.auditUserId ?? args.actor.performedBy ?? "",
      ),
    },
    updatedAt: now,
  });

  const lifecycleAudit = await writeTemplateLifecycleAuditEvent({
    ctx,
    organizationId: template.organizationId,
    objectId: args.templateId,
    actionType: "agent_template.version_published",
    actor: args.actor,
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
    lifecycleObjectActionId: lifecycleAudit.objectActionId,
    lifecycleAuditLogId: lifecycleAudit.auditLogId,
  };
}

export const publishAgentTemplateVersion = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    templateVersionId: v.id("objects"),
    publishReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSuperAdminMutationSession(ctx, args.sessionId);
    return await runAgentTemplateVersionPublishLifecycle(ctx, {
      actor: {
        performedBy: actor.userId,
        auditUserId: actor.userId,
        roleName: actor.roleName,
        sessionId: actor.sessionId,
      },
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      publishReason: args.publishReason,
    });
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

export async function runTemplateDistributionLifecycle(
  ctx: MutationCtx,
  args: {
    actor: TemplateLifecycleExecutionActor;
    templateId: Id<"objects">;
    templateVersionId?: Id<"objects">;
    targetOrganizationIds: Id<"organizations">[];
    stagedRollout?: {
      stageSize: number;
      stageStartIndex?: number;
    };
    dryRun?: boolean;
    reason?: string;
    distributionJobId?: string;
    operationKind?: TemplateDistributionOperationKind;
    overridePolicyGate?: {
      confirmWarnOverride?: boolean;
      reason?: string;
    };
  },
) {
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
  const isDefaultOperatorTemplate =
    normalizeOptionalString(templateProps.templateRole)
    === DEFAULT_ORG_AGENT_TEMPLATE_ROLE;

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

  const certificationEvaluation = resolvedTemplateVersionId
    ? await ensureTemplateVersionCertificationForLifecycle(ctx, {
        templateId: args.templateId,
        templateVersionId: resolvedTemplateVersionId,
        templateVersionTag: resolvedVersionTag,
        recordedByUserId: args.actor.auditUserId ?? (args.actor.performedBy as Id<"users">),
      })
    : await evaluateTemplateCertificationForTemplateVersion(ctx, {
        templateId: args.templateId,
        templateVersionId: null,
        templateVersionTag: resolvedVersionTag,
      });
  if (!certificationEvaluation.allowed) {
    await writeTemplateWaeGateBlockedEvent({
      ctx,
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "agent_template.distribution_blocked_wae_gate",
      actor: args.actor,
      resource: "global_template",
      resourceId: String(args.templateId),
      templateId: String(args.templateId),
      templateVersionId: resolvedTemplateVersionId ? String(resolvedTemplateVersionId) : null,
      templateVersionTag: resolvedVersionTag,
      reasonCode: certificationEvaluation.reasonCode ?? "certification_invalid",
      message:
        certificationEvaluation.message
        || "Template certification blocked template distribution.",
      gate: certificationEvaluation.certification,
      timestamp: now,
    });
    throw new ConvexError({
      code: "INVALID_STATE",
      message:
        certificationEvaluation.message
        || "Template certification blocked template distribution.",
    });
  }

  const plan: Array<{
    organizationId: Id<"organizations">;
    operation: TemplateDistributionOperation;
    reason: string;
    existingCloneId?: Id<"objects">;
    changedFields: string[];
    writableTemplateFields: TemplateCloneDriftField[];
    blockCategory?: TemplateDistributionBlockCategory;
    policyGate?: TemplateOverrideGateSummary;
    orgPreflight?: TemplateOrgPreflightResult;
  }> = [];
  const applyResults: Array<{
    organizationId: Id<"organizations">;
    cloneAgentId?: Id<"objects">;
    operation: TemplateDistributionOperation;
    reason?: string;
    blockCategory?: TemplateDistributionBlockCategory;
    policyGate?: TemplateOverrideGateSummary;
    orgPreflight?: TemplateOrgPreflightResult;
  }> = [];

  for (const organizationId of targetOrganizationIds) {
    const orgPreflight = await evaluateTemplateOrgPreflight(ctx, {
      organizationId,
      templateBaseline: snapshotBaseline,
    });
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
      if (orgPreflight.status === "fail") {
        plan.push({
          organizationId,
          operation: "blocked",
          reason: "org_preflight_failed",
          changedFields: [
            "templateAgentId",
            "templateVersion",
            "templateCloneLinkage",
          ],
          writableTemplateFields: [],
          blockCategory: "org_preflight",
          orgPreflight,
        });
        continue;
      }
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
        blockCategory: "none",
        orgPreflight,
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
      if (orgPreflight.status === "fail") {
        plan.push({
          organizationId,
          existingCloneId: existingClone._id,
          operation: "blocked",
          reason: "org_preflight_failed",
          changedFields: finalChangedFields,
          writableTemplateFields,
          blockCategory: "org_preflight",
          policyGate: overrideGate || undefined,
          orgPreflight,
        });
      } else {
        plan.push({
          organizationId,
          existingCloneId: existingClone._id,
          operation: "skip",
          reason: "already_in_sync",
          changedFields: finalChangedFields,
          writableTemplateFields,
          blockCategory: "none",
          policyGate: overrideGate || undefined,
          orgPreflight,
        });
      }
    } else if (orgPreflight.status === "fail") {
      plan.push({
        organizationId,
        existingCloneId: existingClone._id,
        operation: "blocked",
        reason: "org_preflight_failed",
        changedFields: finalChangedFields,
        writableTemplateFields,
        blockCategory: "org_preflight",
        policyGate: overrideGate || undefined,
        orgPreflight,
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
        blockCategory: "policy",
        policyGate: overrideGate || undefined,
        orgPreflight,
      });
    } else {
      plan.push({
        organizationId,
        existingCloneId: existingClone._id,
        operation: "update",
        reason: "template_version_drift",
        changedFields: finalChangedFields,
        writableTemplateFields,
        blockCategory: "none",
        policyGate: overrideGate || undefined,
        orgPreflight,
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
          blockCategory: row.blockCategory,
          policyGate: row.policyGate,
          orgPreflight: row.orgPreflight,
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
              blockCategory: row.blockCategory,
              changedFields: row.changedFields,
              policyGate: row.policyGate,
              orgPreflight: row.orgPreflight,
            },
            performedBy: args.actor.performedBy,
            performedAt: now,
          });

          await ctx.db.insert("auditLogs", {
            organizationId: row.organizationId,
            userId: args.actor.auditUserId,
            action: "template_distribution_blocked",
            resource: "org_agent",
            resourceId: String(row.existingCloneId),
            success: false,
            metadata: {
              distributionJobId: deterministicJobId,
              templateId: String(args.templateId),
              templateVersion: resolvedVersionTag,
              reason: row.reason,
              blockCategory: row.blockCategory,
              changedFields: row.changedFields,
              policyGate: row.policyGate,
              orgPreflight: row.orgPreflight,
            },
            createdAt: now,
          });
        }
        applyResults.push({
          organizationId: row.organizationId,
          operation: row.operation,
          reason: row.reason,
          blockCategory: row.blockCategory,
          policyGate: row.policyGate,
          orgPreflight: row.orgPreflight,
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
            ...(isDefaultOperatorTemplate
              ? { operatorId: DEFAULT_OPERATOR_CONTEXT_ID }
              : {}),
          },
          createdBy: args.actor.auditUserId,
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
            blockCategory: row.blockCategory,
            changedFields: row.changedFields,
            policyGate: row.policyGate,
            orgPreflight: row.orgPreflight,
          },
          performedBy: args.actor.performedBy,
          performedAt: now,
        });

        await ctx.db.insert("auditLogs", {
          organizationId: row.organizationId,
          userId: args.actor.auditUserId,
          action: "template_distribution_created",
          resource: "org_agent",
          resourceId: String(cloneId),
          success: true,
          metadata: {
            distributionJobId: deterministicJobId,
            templateId: String(args.templateId),
            templateVersion: resolvedVersionTag,
            reason: normalizedReason,
            blockCategory: row.blockCategory,
            changedFields: row.changedFields,
            policyGate: row.policyGate,
            orgPreflight: row.orgPreflight,
          },
          createdAt: now,
        });

        applyResults.push({
          organizationId: row.organizationId,
          cloneAgentId: cloneId,
          operation: "create",
          reason: row.reason,
          blockCategory: row.blockCategory,
          policyGate: row.policyGate,
          orgPreflight: row.orgPreflight,
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
            blockCategory: "org_preflight",
            policyGate: row.policyGate,
            orgPreflight: row.orgPreflight,
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
            return [
              field,
              resolveTemplateDistributionFieldPatchValue({
                field,
                snapshotBaseline,
                existingCustomProperties: existingProps,
              }),
            ];
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
            ...(isDefaultOperatorTemplate
              ? {
                  operatorId:
                    normalizeOptionalString(existingProps.operatorId)
                    || DEFAULT_OPERATOR_CONTEXT_ID,
                }
              : {}),
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
            blockCategory: row.blockCategory,
            changedFields: row.changedFields,
            policyGate: row.policyGate,
            orgPreflight: row.orgPreflight,
          },
          performedBy: args.actor.performedBy,
          performedAt: now,
        });

        await ctx.db.insert("auditLogs", {
          organizationId: row.organizationId,
          userId: args.actor.auditUserId,
          action: "template_distribution_updated",
          resource: "org_agent",
          resourceId: String(row.existingCloneId),
          success: true,
          metadata: {
            distributionJobId: deterministicJobId,
            templateId: String(args.templateId),
            templateVersion: resolvedVersionTag,
            reason: normalizedReason,
            blockCategory: row.blockCategory,
            changedFields: row.changedFields,
            policyGate: row.policyGate,
            orgPreflight: row.orgPreflight,
          },
          createdAt: now,
        });

        applyResults.push({
          organizationId: row.organizationId,
          cloneAgentId: row.existingCloneId,
          operation: "update",
          reason: row.reason,
          blockCategory: row.blockCategory,
          policyGate: row.policyGate,
          orgPreflight: row.orgPreflight,
        });
      }
    }
  }

  const planSummary = summarizeTemplateDistributionOperations(plan);
  const applySummary = summarizeTemplateDistributionOperations(applyResults);
  const policyGateSummary = summarizeTemplateDistributionPolicyGates(plan);
  const orgPreflightSummary = summarizeTemplateDistributionOrgPreflight(plan);
  const reasonCounts = {
    plan: summarizeTemplateDistributionReasonCounts(plan),
    applied: summarizeTemplateDistributionReasonCounts(
      applyResults.map((row) => ({
        reason: row.reason || row.operation,
      }))
    ),
  };

  const lifecycleActionId = await ctx.db.insert("objectActions", {
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
      orgPreflight: orgPreflightSummary,
      reasonCounts,
      overridePolicyGate: {
        confirmWarnOverride: warnConfirmationAccepted,
        reason: normalizedOverrideReason,
      },
    },
    performedBy: args.actor.performedBy,
    performedAt: now,
  });

  return {
    distributionJobId: deterministicJobId,
    templateId: args.templateId,
    templateVersionId: resolvedTemplateVersionId ?? null,
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
    orgPreflight: orgPreflightSummary,
    reasonCounts,
    plan: plan.map((row) => ({
      organizationId: row.organizationId,
      operation: row.operation,
      reason: row.reason,
      existingCloneId: row.existingCloneId,
      changedFields: row.changedFields,
      writableTemplateFields: row.writableTemplateFields,
      blockCategory: row.blockCategory,
      policyGate: row.policyGate,
      orgPreflight: row.orgPreflight,
    })),
    applied: applyResults,
    overridePolicyGate: {
      confirmWarnOverride: warnConfirmationAccepted,
      reason: normalizedOverrideReason,
    },
    lifecycleActionId,
    recordedAt: now,
  };
}

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
    return await runTemplateDistributionLifecycle(ctx, {
      actor: {
        performedBy: actor.userId,
        auditUserId: actor.userId,
        roleName: actor.roleName,
        sessionId: actor.sessionId,
      },
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      targetOrganizationIds: args.targetOrganizationIds,
      stagedRollout: args.stagedRollout,
      dryRun: args.dryRun,
      reason: args.reason,
      distributionJobId: args.distributionJobId,
      operationKind: args.operationKind,
      overridePolicyGate: args.overridePolicyGate,
    });
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
        certification: TemplateVersionAdminCertificationSummary;
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
      const certification = await buildTemplateVersionAdminCertificationSummary(ctx, {
        templateId: sourceTemplateId as Id<"objects">,
        templateVersionId: version._id,
        templateVersionTag: versionTag,
      });
      const row = {
        templateVersionId: version._id,
        versionTag,
        lifecycleStatus: normalizeTemplateVersionLifecycleStatus(
          customProperties.lifecycleStatus
        ),
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        certification,
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
        certification: TemplateVersionAdminCertificationSummary;
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
      const certification = await buildTemplateVersionAdminCertificationSummary(ctx, {
        templateId: sourceTemplateId as Id<"objects">,
        templateVersionId: version._id,
        templateVersionTag: versionTag,
      });
      const row = {
        templateVersionId: version._id,
        versionTag,
        lifecycleStatus: normalizeTemplateVersionLifecycleStatus(
          customProperties.lifecycleStatus
        ),
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        certification,
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
      telephonyConfig: v.optional(v.any()),
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
    const agentCustomProperties =
      (agent.customProperties as Record<string, unknown> | undefined) ?? {};
    const normalizedAgentClass =
      typeof args.updates.agentClass === "string"
        ? normalizeAgentClass(args.updates.agentClass, readAgentClass(
            agentCustomProperties
          ))
        : undefined;
    const normalizedTelephonyConfig =
      args.updates.telephonyConfig !== undefined
        ? resolveNormalizedTelephonyConfigPatch({
            currentValue: agentCustomProperties.telephonyConfig,
            proposedValue: args.updates.telephonyConfig,
          })
        : undefined;
    if (normalizedTelephonyConfig && !normalizedTelephonyConfig.ok) {
      throw new Error(normalizedTelephonyConfig.reason);
    }
    const hasPlatformManagedOverride = normalizedChannelBindings
      ? detectPlatformManagedChannelBindingOverride(
          agentCustomProperties.channelBindings,
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
      ...(normalizedTelephonyConfig?.ok
        ? { telephonyConfig: normalizedTelephonyConfig.value }
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

export const previewAgentFieldPatch = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    patch: v.any(),
    overridePolicyGate: v.optional(v.object({
      confirmWarnOverride: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await buildAgentFieldPatchPreview(ctx, args);
  },
});

export const applyAgentFieldPatch = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    patch: v.any(),
    overridePolicyGate: v.optional(v.object({
      confirmWarnOverride: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const preview = await buildAgentFieldPatchPreview(ctx, args);
    if (!preview.summary.canApply) {
      return {
        success: false,
        message:
          preview.summary.blockedReason
          || "Agent field patch could not be applied.",
        preview,
        appliedFields: [] as string[],
      };
    }

    await (updateAgent as any)._handler(ctx, {
      sessionId: args.sessionId,
      agentId: args.agentId,
      updates: preview.normalizedUpdates,
      overridePolicyGate: args.overridePolicyGate,
    });

    return {
      success: true,
      message: preview.proposalMessage,
      preview,
      appliedFields: preview.changedFields,
    };
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
