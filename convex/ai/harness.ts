/**
 * AGENT HARNESS — Self-Awareness Context Builder
 *
 * Makes the agent deeply aware of its own runtime context:
 * - What model it runs
 * - What tools it has access to
 * - What channels it's connected to
 * - Its current session stats
 * - Its own soul/personality
 *
 * Inspired by OpenClaw's Agent Harness concept (Lex Fridman x Peter Steinberger).
 */
import {
  resolveActiveArchetypeRuntimeContract,
  resolveSensitiveArchetypeRuntimeConstraint,
} from "./archetypes";
import {
  normalizeAutonomyLevel,
  resolveAutonomyTrustRecommendation,
  resolveDomainAutonomyLevel,
  type AutonomyLevelInput,
} from "./autonomy";
import {
  resolveSoulModeRuntimeContract,
  type SoulMode,
} from "./soulModes";

export const TEAM_ACCESS_MODE_VALUES = ["invisible", "direct", "meeting"] as const;
export type TeamAccessMode = (typeof TEAM_ACCESS_MODE_VALUES)[number];

export const DREAM_TEAM_WORKSPACE_TYPE_VALUES = ["personal", "business"] as const;
export type DreamTeamWorkspaceType = (typeof DREAM_TEAM_WORKSPACE_TYPE_VALUES)[number];

export interface DreamTeamSpecialistRuntimeContract {
  soulBlendId: string;
  specialistSubtype?: string;
  specialistName?: string;
  specialistId?: string;
  directAccessEnabled: boolean;
  meetingParticipant: boolean;
  activationHints: string[];
  workspaceTypes?: DreamTeamWorkspaceType[];
}

export interface CrossOrgSoulReadOnlyEnrichmentSummary {
  organizationName: string;
  roleName?: string;
  workspaceType: DreamTeamWorkspaceType;
  primaryAgentName: string;
  primaryAgentSubtype?: string;
  dreamTeamContractCount: number;
}

interface HarnessLocalConnectionCapabilityLimits {
  tools: boolean;
  vision: boolean;
  audio_in: boolean;
  audio_out: boolean;
  json: boolean;
  networkEgress: "blocked";
}

interface HarnessLocalConnectionContract {
  connectorId: "ollama" | "lm_studio" | "llama_cpp";
  status: "connected" | "degraded" | "disconnected";
  modelIds: string[];
  capabilityLimits: HarnessLocalConnectionCapabilityLimits;
}

interface AgentConfig {
  displayName?: string;
  modelProvider?: string;
  modelId?: string;
  privacyMode?: string;
  qualityTierFloor?: string;
  localConnection?: HarnessLocalConnectionContract | null;
  localModelIds?: string[];
  selectedPolicyGuardrail?: string;
  selectedModelDriftWarning?: string;
  selectedModelQualityTier?: string;
  selectedRouteIsLocal?: boolean;
  autonomyLevel: AutonomyLevelInput;
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  knowledgeBaseTags?: string[];
  faqEntries?: Array<{ q: string; a: string }>;
  soul?: {
    name: string;
    tagline?: string;
    traits: string[];
  };
  subtype?: string;
  unifiedPersonality?: boolean;
  teamAccessMode?: TeamAccessMode | string;
  dreamTeamSpecialists?: unknown;
  activeSoulMode?: SoulMode | string;
  activeArchetype?: string | null;
  modeChannelBindings?: unknown;
  enabledArchetypes?: unknown;
  domainAutonomy?: unknown;
  autonomyTrust?: unknown;
}

// ============================================================================
// LAYER ARCHITECTURE (4-Layer Hierarchy)
// ============================================================================

export const LAYER_NAMES: Record<number, string> = {
  1: "Platform",
  2: "Agency",
  3: "Client",
  4: "End-Customer",
};

interface OrgForLayer {
  _id: string;
  parentOrganizationId?: string;
}

/**
 * Determine which layer (1-4) an agent operates at based on
 * org hierarchy position and agent subtype.
 */
export function determineAgentLayer(
  org: OrgForLayer,
  agentSubtype?: string,
  isPlatformOrg?: boolean,
): 1 | 2 | 3 | 4 {
  // Layer 1: Platform org's system agent
  if (isPlatformOrg && agentSubtype === "system") return 1;

  // Layer 2: Top-level org (no parent) — agency PM
  if (!org.parentOrganizationId && agentSubtype === "pm") return 2;

  // Layer 4: Sub-org's customer-facing agent
  if (org.parentOrganizationId && agentSubtype === "customer_service") return 4;

  // Layer 3: Sub-org's PM agent
  if (org.parentOrganizationId && agentSubtype === "pm") return 3;

  // Top-level org non-PM agents should behave like direct business operators,
  // not agency PMs.
  if (!org.parentOrganizationId) return 3;

  // Default: Layer 2 for top-level, Layer 3 for sub-org
  return org.parentOrganizationId ? 3 : 2;
}

interface SessionStats {
  messageCount: number;
  channel: string;
  startedAt?: number;
  lastMessageAt?: number;
  hasCrmContact: boolean;
}

interface TeamAgent {
  _id: string;
  name: string;
  subtype?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customProperties?: Record<string, any>;
}

interface LayerInfo {
  layer: 1 | 2 | 3 | 4;
  parentOrgName?: string;
  parentOrgPlanTier?: string;
  testingMode?: boolean;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function normalizeHarnessPrivacyMode(value: unknown): "off" | "prefer_local" | "local_only" {
  if (value === "prefer_local" || value === "local_only") {
    return value;
  }
  return "off";
}

function normalizeHarnessQualityTier(value: unknown): "gold" | "silver" | "bronze" | "unrated" {
  if (value === "gold" || value === "silver" || value === "bronze") {
    return value;
  }
  return "unrated";
}

function normalizeHarnessStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const deduped = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeOptionalString(entry);
    if (normalized) {
      deduped.add(normalized);
    }
  }
  return Array.from(deduped);
}

function normalizeHarnessLocalConnection(
  value: unknown
): HarnessLocalConnectionContract | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const connectorId =
    record.connectorId === "lm_studio"
      || record.connectorId === "llama_cpp"
      || record.connectorId === "ollama"
      ? record.connectorId
      : null;
  const status =
    record.status === "connected"
      || record.status === "degraded"
      || record.status === "disconnected"
      ? record.status
      : null;
  const capabilityRecord =
    record.capabilityLimits && typeof record.capabilityLimits === "object"
      ? (record.capabilityLimits as Record<string, unknown>)
      : null;
  const capabilityLimits =
    capabilityRecord &&
    typeof capabilityRecord.networkEgress === "string" &&
    capabilityRecord.networkEgress === "blocked"
      ? {
          tools: capabilityRecord.tools === true,
          vision: capabilityRecord.vision === true,
          audio_in: capabilityRecord.audio_in === true,
          audio_out: capabilityRecord.audio_out === true,
          json: capabilityRecord.json === true,
          networkEgress: "blocked" as const,
        }
      : null;
  const modelIds = normalizeHarnessStringArray(record.modelIds);

  if (!connectorId || !status || !capabilityLimits) {
    return null;
  }

  return {
    connectorId,
    status,
    modelIds,
    capabilityLimits,
  };
}

function normalizeTeamAccessModeArray(value: unknown): TeamAccessMode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const modes = new Set<TeamAccessMode>();
  for (const entry of value) {
    const normalized = normalizeTeamAccessModeToken(entry, undefined);
    if (normalized) {
      modes.add(normalized);
    }
  }

  return Array.from(modes);
}

function normalizeDreamTeamWorkspaceTypeToken(
  value: unknown,
): DreamTeamWorkspaceType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "personal" || normalized === "business") {
    return normalized;
  }
  return undefined;
}

function normalizeDreamTeamWorkspaceTypeArray(
  value: unknown,
): DreamTeamWorkspaceType[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const workspaceTypes = new Set<DreamTeamWorkspaceType>();
  for (const entry of value) {
    const normalized = normalizeDreamTeamWorkspaceTypeToken(entry);
    if (normalized) {
      workspaceTypes.add(normalized);
    }
  }
  return Array.from(workspaceTypes);
}

export function resolveUnifiedPersonalityFlag(value: unknown): boolean {
  const normalized = normalizeOptionalBoolean(value);
  return normalized !== false;
}

export function normalizeTeamAccessModeToken(
  value: unknown,
  fallback: TeamAccessMode | undefined = "invisible",
): TeamAccessMode | undefined {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "invisible"
      || normalized === "direct"
      || normalized === "meeting"
    ) {
      return normalized;
    }
  }
  return fallback;
}

export function normalizeDreamTeamSpecialistContracts(
  value: unknown,
): DreamTeamSpecialistRuntimeContract[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const contracts: DreamTeamSpecialistRuntimeContract[] = [];
  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }
    const entry = rawEntry as Record<string, unknown>;
    const soulBlendId = normalizeOptionalString(entry.soulBlendId);
    if (!soulBlendId) {
      continue;
    }

    const accessModes = normalizeTeamAccessModeArray(
      entry.accessModes ?? entry.specialistAccessModes,
    );
    const directAccessEnabled =
      normalizeOptionalBoolean(entry.directAccessEnabled)
      ?? (accessModes.includes("direct") || accessModes.length === 0);
    const meetingParticipant =
      normalizeOptionalBoolean(entry.meetingParticipant)
      ?? (accessModes.includes("meeting") || accessModes.length === 0);
    const activationHints = Array.isArray(entry.activationHints)
      ? entry.activationHints
          .map((hint) => normalizeOptionalString(hint))
          .filter((hint): hint is string => Boolean(hint))
      : [];
    const workspaceTypes = normalizeDreamTeamWorkspaceTypeArray(
      entry.workspaceTypes ?? entry.organizationTypes ?? entry.orgTypes,
    );

    contracts.push({
      soulBlendId,
      specialistSubtype: normalizeOptionalString(
        entry.specialistSubtype ?? entry.subtype ?? entry.agentSubtype,
      ),
      specialistName: normalizeOptionalString(
        entry.specialistName ?? entry.name ?? entry.displayName,
      ),
      specialistId: normalizeOptionalString(
        entry.specialistId ?? entry.agentId ?? entry.id,
      ),
      directAccessEnabled,
      meetingParticipant,
      activationHints,
      workspaceTypes,
    });
  }
  return contracts;
}

export function isDreamTeamSpecialistContractInWorkspaceScope(args: {
  contract: DreamTeamSpecialistRuntimeContract;
  workspaceType?: DreamTeamWorkspaceType;
}): boolean {
  if (!args.workspaceType) {
    return true;
  }
  const workspaceTypes = args.contract.workspaceTypes ?? [];
  if (workspaceTypes.length === 0) {
    return true;
  }
  return workspaceTypes.includes(args.workspaceType);
}

export function resolveDreamTeamSpecialistContract(args: {
  dreamTeamSpecialists: DreamTeamSpecialistRuntimeContract[];
  specialistId?: string;
  specialistSubtype?: string;
  specialistName?: string;
  workspaceType?: DreamTeamWorkspaceType;
}): DreamTeamSpecialistRuntimeContract | undefined {
  const specialistId = normalizeOptionalString(args.specialistId);
  const specialistSubtype = normalizeOptionalString(args.specialistSubtype)?.toLowerCase();
  const specialistName = normalizeOptionalString(args.specialistName)?.toLowerCase();
  const scopedContracts = args.dreamTeamSpecialists.filter((contract) =>
    isDreamTeamSpecialistContractInWorkspaceScope({
      contract,
      workspaceType: args.workspaceType,
    })
  );

  if (specialistId) {
    const idMatch = scopedContracts.find(
      (contract) => contract.specialistId === specialistId,
    );
    if (idMatch) {
      return idMatch;
    }
  }

  if (specialistSubtype) {
    const subtypeMatch = scopedContracts.find(
      (contract) => contract.specialistSubtype?.toLowerCase() === specialistSubtype,
    );
    if (subtypeMatch) {
      return subtypeMatch;
    }
  }

  if (specialistName) {
    return scopedContracts.find(
      (contract) => contract.specialistName?.toLowerCase() === specialistName,
    );
  }

  return undefined;
}

/**
 * Build the harness self-awareness block for the system prompt.
 * This goes at the very top — the agent's first context is knowing itself.
 */
export function buildHarnessContext(
  config: AgentConfig,
  filteredToolNames?: string[],
  sessionStats?: SessionStats,
  teamAgents?: TeamAgent[],
  currentAgentId?: string,
  orgInfo?: { name: string; slug: string; planTier: string },
  layerInfo?: LayerInfo,
  crossOrgSoulReadOnlyEnrichment?: CrossOrgSoulReadOnlyEnrichmentSummary[],
): string {
  const lines: string[] = [];
  lines.push("=== YOUR HARNESS (Self-Awareness) ===");

  // Organization context
  if (orgInfo) {
    lines.push(`**Organization:** ${orgInfo.name}`);
    lines.push(`**Plan:** ${orgInfo.planTier}`);
  }

  // Identity
  const name = config.soul?.name || config.displayName || "AI Agent";
  lines.push(`**Identity:** ${name}`);

  const unifiedPersonality = resolveUnifiedPersonalityFlag(config.unifiedPersonality);
  const teamAccessMode = normalizeTeamAccessModeToken(config.teamAccessMode, "invisible")
    ?? "invisible";
  const dreamTeamContracts = normalizeDreamTeamSpecialistContracts(
    config.dreamTeamSpecialists,
  );
  const soulModeRuntime = resolveSoulModeRuntimeContract({
    activeSoulMode: config.activeSoulMode,
    modeChannelBindings: config.modeChannelBindings,
    channel: sessionStats?.channel,
  });
  const archetypeRuntime = resolveActiveArchetypeRuntimeContract({
    requestedArchetype: config.activeArchetype,
    enabledArchetypes: config.enabledArchetypes,
    mode: soulModeRuntime.mode,
    modeDefaultArchetype: soulModeRuntime.config.archetypeDefault,
  });
  const sensitiveArchetypeConstraint = resolveSensitiveArchetypeRuntimeConstraint(
    archetypeRuntime.archetype?.id ?? null,
  );
  lines.push(
    `**One-agent runtime:** Unified personality ${unifiedPersonality ? "enabled" : "disabled"}; specialist access mode is \`${teamAccessMode}\`.`,
  );
  lines.push(
    "Specialists operate behind the scenes only. Always keep user-facing responses in a single primary-agent voice.",
  );
  lines.push(
    "**Ownership contract:** Treat this operator as user-owned and one-of-one. Never frame the runtime as a shared pool or rotating desk.",
  );
  if (dreamTeamContracts.length > 0) {
    lines.push(
      `Dream Team catalog contract loaded (${dreamTeamContracts.length} specialist entries from AGP metadata).`,
    );
  }
  if (crossOrgSoulReadOnlyEnrichment && crossOrgSoulReadOnlyEnrichment.length > 0) {
    lines.push(
      "Cross-org read-only soul enrichment active (personal workspace -> business summaries only):",
    );
    for (const entry of crossOrgSoulReadOnlyEnrichment) {
      const subtype = entry.primaryAgentSubtype || "general";
      const role = entry.roleName || "member";
      lines.push(
        `- ${entry.organizationName}: primary "${entry.primaryAgentName}" (${subtype}); role ${role}; Dream Team contracts ${entry.dreamTeamContractCount}.`,
      );
    }
    lines.push(
      "Cross-org enrichment is read-only context. Never perform cross-org writes from this signal.",
    );
    lines.push(
      "Cross-org enrichment is internal context only. Do not expose cross-org details in normal user-facing replies.",
    );
  }
  lines.push(
    `**Soul mode:** ${soulModeRuntime.mode} (${soulModeRuntime.config.label}; source: ${soulModeRuntime.source}).`,
  );
  if (archetypeRuntime.archetype) {
    lines.push(
      `**Active archetype:** ${archetypeRuntime.archetype.label} (${archetypeRuntime.source}).`,
    );
  } else {
    lines.push("**Active archetype:** General (no explicit archetype lens).");
    if (archetypeRuntime.blockedReason) {
      lines.push(`Archetype fallback reason: ${archetypeRuntime.blockedReason}`);
    }
  }
  lines.push(
    "Identity invariant: mode/archetype overlays must preserve interview-origin identity anchors.",
  );
  if (sensitiveArchetypeConstraint) {
    lines.push(
      `Sensitive archetype runtime guardrails active: read-only execution enforced; ${sensitiveArchetypeConstraint.referralGuidance}`,
    );
  }

  // Model
  const model = config.modelId || "anthropic/claude-sonnet-4.5";
  const provider = config.modelProvider || "openrouter";
  lines.push(`**Model:** ${model} (via ${provider})`);
  const privacyMode = normalizeHarnessPrivacyMode(config.privacyMode);
  const qualityTierFloor = normalizeHarnessQualityTier(config.qualityTierFloor);
  const localConnection = normalizeHarnessLocalConnection(config.localConnection);
  const localModelIds = normalizeHarnessStringArray(config.localModelIds);
  if (
    privacyMode !== "off"
    || qualityTierFloor !== "unrated"
    || localConnection
    || config.selectedPolicyGuardrail
    || config.selectedModelDriftWarning
  ) {
    lines.push(
      `**Privacy mode:** ${privacyMode}.${
        localConnection
          ? ` Local connector \`${localConnection.connectorId}\` is ${localConnection.status}.`
          : ""
      }`,
    );
    lines.push(`**Quality firewall floor:** ${qualityTierFloor}.`);
    if (localConnection) {
      lines.push(
        `Local capability limits: tools=${localConnection.capabilityLimits.tools ? "on" : "off"}, vision=${localConnection.capabilityLimits.vision ? "on" : "off"}, audio_in=${localConnection.capabilityLimits.audio_in ? "on" : "off"}, audio_out=${localConnection.capabilityLimits.audio_out ? "on" : "off"}, json=${localConnection.capabilityLimits.json ? "on" : "off"}, network_egress=blocked.`,
      );
    }
    if (localModelIds.length > 0) {
      lines.push(`Local model pool (${localModelIds.length}): ${localModelIds.join(", ")}.`);
    }
    if (config.selectedModelQualityTier) {
      lines.push(`Selected route quality tier: ${config.selectedModelQualityTier}.`);
    }
    if (typeof config.selectedRouteIsLocal === "boolean") {
      lines.push(`Selected route locality: ${config.selectedRouteIsLocal ? "local" : "cloud"}.`);
    }
    const selectedPolicyGuardrail = normalizeOptionalString(config.selectedPolicyGuardrail);
    if (selectedPolicyGuardrail) {
      lines.push(`Active privacy safeguard: ${selectedPolicyGuardrail}`);
    }
    const selectedDriftWarning = normalizeOptionalString(config.selectedModelDriftWarning);
    if (selectedDriftWarning) {
      lines.push(`Active drift safeguard: ${selectedDriftWarning}`);
    }
  }

  // Autonomy
  const resolvedAutonomyLevel = normalizeAutonomyLevel(config.autonomyLevel);
  const autonomyLabels: Record<string, string> = {
    supervised: "Supervised — all tool actions require human approval",
    sandbox: "Sandbox — read-only execution only; mutating actions stay blocked",
    autonomous: "Autonomous — you can act freely within guardrails",
    delegation: "Delegation — autonomous execution plus specialist delegation authority",
    draft_only: "Draft Only — generate responses but do NOT execute tools",
  };
  lines.push(
    `**Autonomy:** ${autonomyLabels[resolvedAutonomyLevel] || resolvedAutonomyLevel}`,
  );
  if (String(config.autonomyLevel).toLowerCase() === "draft_only") {
    lines.push(
      `Legacy autonomy alias \`${String(config.autonomyLevel)}\` normalized to \`${resolvedAutonomyLevel}\`.`,
    );
  }

  const appointmentDomainAutonomy = resolveDomainAutonomyLevel({
    domain: "appointment_booking",
    autonomyLevel: resolvedAutonomyLevel,
    domainAutonomy: config.domainAutonomy,
  });
  lines.push(
    `**Domain autonomy:** appointment_booking defaults to \`${appointmentDomainAutonomy.effectiveLevel}\` (source: ${appointmentDomainAutonomy.source}).`,
  );

  const trustRecommendation = resolveAutonomyTrustRecommendation({
    currentLevel: resolvedAutonomyLevel,
    snapshot: config.autonomyTrust,
  });
  if (trustRecommendation) {
    lines.push(
      `**Trust progression:** ${trustRecommendation.action} ${trustRecommendation.fromLevel} -> ${trustRecommendation.toLevel} (score ${trustRecommendation.trustScore.toFixed(2)} across ${trustRecommendation.signalCount} signals).`,
    );
  }

  // Channels
  const activeChannels = config.channelBindings
    ?.filter((c) => c.enabled)
    .map((c) => c.channel) || [];
  if (activeChannels.length > 0) {
    lines.push(`**Connected channels:** ${activeChannels.join(", ")}`);
  }

  // Tools
  if (filteredToolNames && filteredToolNames.length > 0) {
    lines.push(`\n**Available tools (${filteredToolNames.length}):**`);
    for (const toolName of filteredToolNames) {
      lines.push(`- ${toolName}`);
    }
  } else {
    lines.push("\n**Tools:** None available");
  }

  // Rate limits
  const maxMsg = config.maxMessagesPerDay || 100;
  const maxCost = config.maxCostPerDay || 5.0;
  lines.push(`\n**Rate limits:** ${maxMsg} messages/day, $${maxCost.toFixed(2)} max cost/day`);

  // Knowledge
  const kbTags = config.knowledgeBaseTags?.length || 0;
  const faqCount = config.faqEntries?.length || 0;
  if (kbTags > 0 || faqCount > 0) {
    const kbParts = [];
    if (kbTags > 0) kbParts.push(`${kbTags} knowledge base tag(s)`);
    if (faqCount > 0) kbParts.push(`${faqCount} FAQ entries`);
    lines.push(`**Knowledge loaded:** ${kbParts.join(", ")}`);
  }

  // Session stats
  if (sessionStats) {
    lines.push("\n**Current session:**");
    lines.push(`- Channel: ${sessionStats.channel}`);
    lines.push(`- Messages in conversation: ${sessionStats.messageCount}`);
    if (sessionStats.startedAt) {
      lines.push(`- Session started: ${new Date(sessionStats.startedAt).toISOString()}`);
    }
    if (sessionStats.lastMessageAt) {
      const minutesAgo = Math.round((Date.now() - sessionStats.lastMessageAt) / 60000);
      lines.push(`- Last message: ${minutesAgo < 1 ? "just now" : `${minutesAgo}min ago`}`);
    }
    lines.push(`- CRM contact linked: ${sessionStats.hasCrmContact ? "Yes" : "No"}`);
  }

  // Team roster (multi-agent coordination)
  if (teamAgents && teamAgents.length > 1) {
    lines.push("");
    lines.push("=== YOUR TEAM ===");
    lines.push("Team capabilities are internal orchestration only.");
    lines.push("Do not expose specialist identities, handoffs, or multi-agent internals to the user.");
    lines.push("Use specialist tools behind the scenes when needed, then respond in single-agent voice.");
    lines.push("");
    lines.push("Team members:");

    for (const agent of teamAgents) {
      if (currentAgentId && agent._id === currentAgentId) continue; // Skip self
      const props = agent.customProperties;
      const agentName = props?.displayName || agent.name;
      const soul = props?.soul;
      const tagline = soul?.tagline || agent.subtype || "general";
      const traits = soul?.traits?.slice(0, 3)?.join(", ") || "";

      lines.push(`- **${agentName}** (${agent.subtype || "general"}): ${tagline}`);
      if (traits) lines.push(`  Traits: ${traits}`);
    }

    lines.push("");
    lines.push("Use `tag_in_specialist` internally when needed.");
    lines.push("Use `list_team_agents` for internal roster checks.");
    lines.push("=== END TEAM ===");
  }

  // Soul evolution awareness (Step 7)
  if (config.soul && (config.soul as { version?: number }).version) {
    const soulVersion = (config.soul as { version?: number; lastUpdatedAt?: number }).version;
    const lastUpdated = (config.soul as { lastUpdatedAt?: number }).lastUpdatedAt;
    lines.push(`\n**Soul version:** v${soulVersion}${lastUpdated ? ` (last updated: ${new Date(lastUpdated).toISOString()})` : ""}`);
    lines.push("**Self-evolution:** You can propose updates to your own personality using `propose_soul_update`.");
    lines.push("  - Use this when you notice recurring patterns that your current rules don't address.");
    lines.push("  - All proposals require owner approval — you never change yourself silently.");
    lines.push("  - Use `review_own_soul` to check your current personality before proposing changes.");
  }

  // Media tools awareness (Step 9)
  const mediaToolNames = [
    "transcribe_audio",
    "transcribe_youtube_video",
    "analyze_image",
    "parse_document",
    "download_media",
  ];
  const availableMediaTools = filteredToolNames?.filter(t => mediaToolNames.includes(t)) || [];
  if (availableMediaTools.length > 0) {
    lines.push("\n**Media handling:**");
    lines.push("You can process rich media (voice notes, images, documents) using your media tools.");
    lines.push("When a message includes attachments:");
    lines.push("  1. Check what type of media it is (the attachment metadata tells you)");
    lines.push("  2. Choose the right tool (transcribe_audio for voice notes, transcribe_youtube_video for YouTube links, analyze_image for photos, etc.)");
    lines.push("  3. Process the media, then respond using the extracted content");
    lines.push("  4. If you're unsure about a file, use download_media to inspect it first");
    lines.push("Don't tell the user you can't handle media — try your tools first.");
  }

  // Builder deployment awareness
  const builderToolNames = ["create_webapp", "deploy_webapp", "check_deploy_status"];
  const availableBuilderTools = filteredToolNames?.filter(t => builderToolNames.includes(t)) || [];
  if (availableBuilderTools.length > 0) {
    lines.push("\n**Web App Builder:**");
    lines.push("You can create and deploy full web applications for users.");
    lines.push("Use managed deployment by default; external GitHub/Vercel is advanced opt-in only.");
    lines.push("Productization source-of-truth contracts:");
    lines.push("  - docs/prd/souls/AGENT_PRODUCT_CATALOG.md");
    lines.push("  - docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md");
    lines.push("  - docs/prd/souls/IMPLEMENTATION_ROADMAP.md");
    lines.push("Run deterministic create/connect/publish with one shared idempotency key per user intent.");
    lines.push("When a user asks for a website, landing page, or web app:");
    lines.push("  1. Generate a page schema JSON with sections (hero, features, pricing, testimonials, etc.)");
    lines.push("     - Schema format: { version: \"1.0\", metadata: { title, description }, theme: { primaryColor, ... }, sections: [{ id, type, props }] }");
    lines.push("     - Section types: hero, features, cta, testimonials, pricing, gallery, team, faq, process");
    lines.push("  2. Call `create_webapp` with the name, pageSchema, and idempotencyKey");
    lines.push("  3. Optionally call `detect_webapp_connections` and `connect_webapp_data` with the same idempotencyKey");
    lines.push("  4. Call `deploy_webapp` with deploymentMode=`managed` and the same idempotencyKey");
    lines.push("  5. Share the managed live URL; only suggest external mode when user explicitly asks");
    lines.push("");
    lines.push("You can also use `check_deploy_status` for readiness checks.");
    lines.push("Only require GitHub/Vercel checks if deploymentMode is `external`.");
  }

  // Builder data connection awareness
  const connectionToolNames = ["detect_webapp_connections", "connect_webapp_data"];
  const availableConnectionTools = filteredToolNames?.filter(t => connectionToolNames.includes(t)) || [];
  if (availableConnectionTools.length > 0) {
    lines.push("\n**Data Connection Workflow:**");
    lines.push("After creating a web app with `create_webapp`, you can connect its placeholder data to real org records.");
    lines.push("  1. Call `detect_webapp_connections` with the appId to scan for connectable items");
    lines.push("  2. Review the results: products (from pricing), contacts (from team), events (from dates), forms, etc.");
    lines.push("  3. For each detected item, decide:");
    lines.push("     - **Link**: Connect to an existing record (use the record ID from existingMatches)");
    lines.push("     - **Create**: Create a new record from the placeholder data");
    lines.push("     - **Skip**: Leave as placeholder, don't connect");
    lines.push("  4. For exact matches (similarity 1.0), auto-link and inform the user");
    lines.push("  5. For lower confidence matches or no matches, ask the user what to do");
    lines.push("  6. Call `connect_webapp_data` with all decisions in one batch");
    lines.push("  7. Then call `deploy_webapp` to deploy with connected data");
    lines.push("");
    lines.push("Example flow:");
    lines.push("  You: 'I found 3 pricing tiers in your page. \"Basic Plan\" matches your existing product — I'll link that.'");
    lines.push("  You: 'Should I create new records for \"Pro Plan\" and \"Enterprise Plan\"?'");
    lines.push("  User: 'Yes, create them'");
    lines.push("  → Call connect_webapp_data with link for 1 item, create for 2 items");
  }

  // Layers workflow + object linking awareness
  const orchestrationToolNames = ["create_layers_workflow", "link_objects"];
  const availableOrchestrationTools =
    filteredToolNames?.filter((t) => orchestrationToolNames.includes(t)) || [];
  if (availableOrchestrationTools.length > 0) {
    lines.push("\n**Layers Orchestration:**");
    lines.push("You can create visual automations and wire cross-object relationships.");
    lines.push("When building end-to-end launch flows:");
    lines.push("  1. Call `create_layers_workflow` with nodes/edges/triggers to define the automation graph");
    lines.push("  2. Use `link_objects` to connect event, form, product, checkout, and workflow artifacts");
    lines.push("  3. Verify links match intent (product_form, checkout_product, workflow_form, workflow_sequence, event_product)");
    lines.push("  4. Continue deployment/publishing only after links are confirmed");
  }

  // Layer awareness (4-Layer Architecture)
  if (layerInfo) {
    const layer = layerInfo.layer;
    lines.push("");
    lines.push("## Your Position in the Organization Hierarchy");
    lines.push("");
    lines.push(`**Layer:** ${layer} of 4`);
    lines.push(`**Layer name:** ${LAYER_NAMES[layer]}`);

    if (layer >= 3 && layerInfo.parentOrgName) {
      lines.push(
        `**Parent workspace context (internal):** ${layerInfo.parentOrgName}${
          layerInfo.parentOrgPlanTier ? ` (${layerInfo.parentOrgPlanTier} tier)` : ""
        }`,
      );
      lines.push(
        "This hierarchy metadata is internal only. Do not present this as user-facing identity unless explicitly asked for architecture details.",
      );
    }

    if (layer === 2) {
      const orgName = orgInfo?.name || "this organization";
      lines.push(`**Role:** You are the primary one-of-one operator for "${orgName}".`);
      lines.push(`**You can:** Run operations directly across available tools.`);
      lines.push(`**You cannot:** Expose organizational hierarchy or specialist topology in user-facing replies.`);
    }

    if (layer === 3) {
      const orgName = orgInfo?.name || "this organization";
      lines.push(`**Role:** You are the primary one-of-one operator for "${orgName}".`);
      lines.push(`**You can:** Run end-to-end operations across available tools and coordinate execution directly.`);
      lines.push(`**You cannot:** Expose parent-agency hierarchy or specialist topology in user-facing replies.`);
    }

    if (layer === 4) {
      const orgName = orgInfo?.name || "this organization";
      lines.push(`**Role:** You handle customer conversations for "${orgName}".`);
      lines.push(`**You can:** Answer questions, search products, create bookings, log interactions.`);
      lines.push(`**You cannot:** Modify org settings, access analytics, manage team, or propose soul changes.`);
      lines.push(`**Escalation:** Use escalate_to_parent to send complex issues to the PM.`);
    }

    if (layerInfo.testingMode) {
      lines.push("");
      lines.push("⚠️ TESTING MODE: This conversation is from the agency owner testing your capabilities.");
      lines.push("Behave exactly as you would with a real customer, but acknowledge this is a test if asked.");
    }
  }

  // Agency model awareness (Step 11: Sub-Org Management)
  const agencyToolNames = ["create_client_org", "list_client_orgs", "get_client_org_stats"];
  const availableAgencyTools = filteredToolNames?.filter(t => agencyToolNames.includes(t)) || [];
  if (availableAgencyTools.length > 0) {
    lines.push("\n**Organization management tools (internal):**");
    lines.push("These capabilities run under the hood. Keep the surface experience one-of-one.");
    lines.push("- `create_client_org`, `list_client_orgs`, `get_client_org_stats` may be used internally when required.");
    lines.push("- Do not introduce yourself as an agency PM or specialized coordinator.");
  }

  // Self-awareness instructions
  lines.push("\n**Self-awareness rules:**");
  lines.push("- Maintain exclusive one-of-one voice: the operator should feel personally owned by the current user/session.");
  lines.push("- Do not claim to be a shared agency helper, support desk, or rotating multi-agent surface.");
  lines.push("- Do not reveal internal hierarchy, team topology, or cross-org context unless explicitly requested for debugging.");
  lines.push("- You know exactly which tools you have. Don't claim capabilities you lack.");
  lines.push("- If a tool fails, explain what happened and suggest alternatives.");
  lines.push("- If asked \"what can you do?\", reference your actual tool list above.");
  lines.push("- Be consistent with your soul and personality at all times.");

  lines.push("=== END HARNESS ===\n");
  return lines.join("\n");
}
