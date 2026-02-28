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
import { SUBTYPE_DEFAULT_PROFILES } from "./ai/toolScoping";
import {
  normalizeChannelBindingsContract,
  webchatChannelBindingValidator,
  type ChannelBindingContractRecord,
} from "./webchatCustomizationContract";

const OPERATOR_ROUTING_CHANNELS = new Set(["desktop", "slack"]);
const PLATFORM_MANAGED_CHANNEL_BINDING_CHANNELS = new Set(["desktop", "slack"]);
const ORCHESTRATOR_DEFAULT_SUBTYPE = "general";

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
      throw new Error("Agent not found");
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
  handler: async (ctx, args) => {
    const recoverySubtype = resolveRecoverySubtype({
      channel: args.channel,
      subtype: args.subtype,
    });
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
      const isLegacyAutoRecoveryAssistant =
        (existingActiveAgent.name === "Default Assistant"
          || existingProps.displayName === "Default Assistant")
        && normalizeOptionalString(existingProps.toolProfile) === "general";
      if (isLegacyAutoRecoveryAssistant) {
        await ctx.db.patch(existingActiveAgent._id, {
          name: "One-of-One Operator",
          description: "Auto-created primary operator agent",
          customProperties: {
            ...existingProps,
            displayName: "One-of-One Operator",
            toolProfile: "admin",
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
        (!recoverySubtype || normalizeOptionalString(candidate.subtype) === recoverySubtype)
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
    const agentId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "org_agent",
      subtype: recoverySubtype || "general",
      name: "One-of-One Operator",
      description: "Auto-created primary operator agent",
      status: "active",
      customProperties: {
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

    return resolvePrimaryAgentForContext(agents, operatorId);
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
  }
) {
  const userContext = await getUserContext(ctx, args.userId, args.organizationId);
  const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
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

  if (!isPrimaryFlagged(args.agent)) {
    throw new Error(
      "ONE_OF_ONE_PRIMARY_AGENT_REQUIRED: operator edits are limited to the primary one-of-one agent."
    );
  }
}

// ============================================================================
// AGENT MUTATIONS
// ============================================================================

/**
 * CREATE AGENT
 * Create a new AI agent for an organization
 */
export const createAgent = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(),
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
      // Escalation Policy (per-agent HITL configuration)
      escalationPolicy: v.optional(v.any()),
    }),
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
    });
    const normalizedChannelBindings = args.updates.channelBindings
      ? normalizeChannelBindingsContract(
          args.updates.channelBindings as ChannelBindingContractRecord[]
        )
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

    await ctx.db.patch(args.agentId, {
      name: args.updates.name || agent.name,
      subtype: args.updates.subtype || agent.subtype,
      customProperties: {
        ...agent.customProperties,
        ...normalizedUpdates,
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(normalizedUpdates),
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
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
      return a.status === "active" && props?.templateAgentId !== undefined;
    });
  },
});
