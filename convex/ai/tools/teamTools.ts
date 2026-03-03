/**
 * TEAM TOOLS — Multi-Agent Coordination
 *
 * Enables the PM/lead agent to tag in specialist agents from its team.
 * Specialists respond under their own name in the same conversation.
 *
 * Tools:
 * - tag_in_specialist: Delegate to a specialist agent (validated via teamHarness)
 * - list_team_agents: List all active agents on the team
 * - sync_dm_summary_to_group: Bridge DM summary back to group via sync checkpoint gate
 *
 * See: docs/platform/TEAM_COORDINATION.md
 */

import {
  isDreamTeamSpecialistContractInWorkspaceScope,
  normalizeDreamTeamSpecialistContracts,
  type DreamTeamWorkspaceType,
  type DreamTeamSpecialistRuntimeContract,
} from "../harness";
import type { AITool, ToolExecutionContext } from "./registry";

interface TeamHandoffPayload {
  reason: string;
  summary: string;
  goal: string;
}

interface DmSummarySyncPayload {
  summary: string;
  dmThreadId: string;
  syncCheckpointToken: string;
  syncAttemptId?: string;
}

interface TeamSpecialistAgentRecord {
  _id: string;
  name?: string;
  subtype?: string;
  customProperties?: Record<string, unknown>;
}

export interface TeamSpecialistSelectionProvenance {
  selectionStrategy: "contract" | "fallback_subtype";
  requestedSpecialistType: string;
  requestedSpecialistId?: string;
  matchedBy:
    | "specialist_id"
    | "contract_subtype"
    | "contract_name"
    | "fallback_subtype";
  contractSoulBlendId?: string;
  contractSpecialistId?: string;
  contractSpecialistSubtype?: string;
  contractSpecialistName?: string;
  candidateCount: number;
  catalogSize: number;
}

export interface TeamSpecialistSelectionInput {
  requestedSpecialistType: string;
  requestedSpecialistId?: string;
  activeAgents: TeamSpecialistAgentRecord[];
  authorityAgentId: string;
  dreamTeamSpecialists: DreamTeamSpecialistRuntimeContract[];
  workspaceType?: DreamTeamWorkspaceType;
}

interface TeamSpecialistSelectionResult {
  targetAgent?: TeamSpecialistAgentRecord;
  provenance?: TeamSpecialistSelectionProvenance;
  error?: string;
}

export interface SamanthaWarmLeadGuardrailInput {
  selectedAgent: TeamSpecialistAgentRecord;
  activeAgents: TeamSpecialistAgentRecord[];
  requestedSpecialistType: string;
  requestedSpecialistId?: string;
  runtimePolicy?: ToolExecutionContext["runtimePolicy"];
  provenance?: TeamSpecialistSelectionProvenance;
}

export interface SamanthaWarmLeadGuardrailResult {
  targetAgent: TeamSpecialistAgentRecord;
  provenance?: TeamSpecialistSelectionProvenance;
  guardrailApplied: boolean;
  reasonCode?: "warm_samantha_disallowed_for_cold_lead";
  error?: string;
}

const SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE =
  "one_of_one_lead_capture_consultant_template";
const SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE =
  "one_of_one_warm_lead_capture_consultant_template";

// Lazy-load to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../../_generated/api");
  }
  return _apiCache.internal;
}

function getTrimmedArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeLower(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function resolveAgentTemplateRole(
  agent: TeamSpecialistAgentRecord
): string | undefined {
  if (!agent.customProperties || typeof agent.customProperties !== "object") {
    return undefined;
  }
  return normalizeOptionalString(
    (agent.customProperties as Record<string, unknown>).templateRole
  );
}

function isSamanthaWarmLeadCaptureAgent(
  agent: TeamSpecialistAgentRecord
): boolean {
  return (
    resolveAgentTemplateRole(agent) === SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE
  );
}

function isSamanthaLeadCaptureAgent(
  agent: TeamSpecialistAgentRecord
): boolean {
  const templateRole = resolveAgentTemplateRole(agent);
  return (
    templateRole === SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE
    || templateRole === SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE
  );
}

function resolveWarmLeadEligibilityFromRuntimePolicy(
  runtimePolicy?: ToolExecutionContext["runtimePolicy"]
): boolean {
  return runtimePolicy?.commercialRouting?.warmLeadEligible === true;
}

function resolveAgentDisplayName(agent: TeamSpecialistAgentRecord): string {
  const props =
    agent.customProperties as Record<string, unknown> | undefined;
  const displayName = normalizeOptionalString(props?.displayName);
  return displayName || normalizeOptionalString(agent.name) || "Agent";
}

function resolveAgentSoulPreview(
  agent?: TeamSpecialistAgentRecord
): { tagline?: string; traits?: string[] } {
  if (!agent?.customProperties || typeof agent.customProperties !== "object") {
    return {};
  }
  const soul = (agent.customProperties as Record<string, unknown>).soul;
  if (!soul || typeof soul !== "object") {
    return {};
  }
  const record = soul as Record<string, unknown>;
  const traits = Array.isArray(record.traits)
    ? record.traits.filter((trait): trait is string => typeof trait === "string").slice(0, 3)
    : undefined;
  return {
    tagline: normalizeOptionalString(record.tagline),
    traits,
  };
}

function normalizeSpecialistSubtype(value: unknown): string | undefined {
  return normalizeLower(value);
}

function resolveWorkspaceTypeFromOrganization(
  organization: { isPersonalWorkspace?: boolean } | null | undefined,
): DreamTeamWorkspaceType {
  return organization?.isPersonalWorkspace === true ? "personal" : "business";
}

function matchesAgentId(
  candidate: TeamSpecialistAgentRecord,
  specialistId?: string
): boolean {
  return !specialistId || String(candidate._id) === specialistId;
}

function findSubtypeCandidates(
  activeAgents: TeamSpecialistAgentRecord[],
  specialistSubtype: string,
  requestedSpecialistId?: string
): TeamSpecialistAgentRecord[] {
  return activeAgents.filter((agent) => {
    const subtype = normalizeSpecialistSubtype(agent.subtype);
    return (
      subtype === specialistSubtype
      && matchesAgentId(agent, requestedSpecialistId)
    );
  });
}

function findNameCandidates(
  activeAgents: TeamSpecialistAgentRecord[],
  specialistName: string,
  requestedSpecialistId?: string
): TeamSpecialistAgentRecord[] {
  return activeAgents.filter((agent) => {
    if (!matchesAgentId(agent, requestedSpecialistId)) {
      return false;
    }
    const displayName = normalizeLower(resolveAgentDisplayName(agent));
    const canonicalName = normalizeLower(agent.name);
    return displayName === specialistName || canonicalName === specialistName;
  });
}

function resolveContractAgentCandidate(args: {
  contract: DreamTeamSpecialistRuntimeContract;
  activeAgents: TeamSpecialistAgentRecord[];
  requestedSpecialistSubtype: string;
  requestedSpecialistId?: string;
}): {
  targetAgent?: TeamSpecialistAgentRecord;
  matchedBy?: TeamSpecialistSelectionProvenance["matchedBy"];
  candidateCount: number;
} {
  const { contract, activeAgents, requestedSpecialistSubtype, requestedSpecialistId } = args;
  if (requestedSpecialistId && contract.specialistId && contract.specialistId !== requestedSpecialistId) {
    return { candidateCount: 0 };
  }

  if (contract.specialistId) {
    const idMatch = activeAgents.find(
      (agent) => String(agent._id) === contract.specialistId
    );
    if (idMatch && matchesAgentId(idMatch, requestedSpecialistId)) {
      const subtype =
        normalizeSpecialistSubtype(idMatch.subtype)
        || normalizeSpecialistSubtype(contract.specialistSubtype);
      if (subtype === requestedSpecialistSubtype) {
        return {
          targetAgent: idMatch,
          matchedBy: "specialist_id",
          candidateCount: 1,
        };
      }
      return { candidateCount: 0 };
    }
  }

  const contractSubtype =
    normalizeSpecialistSubtype(contract.specialistSubtype)
    || requestedSpecialistSubtype;
  const contractName = normalizeLower(contract.specialistName);

  if (contractSubtype) {
    const subtypeCandidates = findSubtypeCandidates(
      activeAgents,
      contractSubtype,
      requestedSpecialistId
    );
    if (contractName) {
      const namedSubtypeCandidates = subtypeCandidates.filter((agent) => {
        const displayName = normalizeLower(resolveAgentDisplayName(agent));
        const canonicalName = normalizeLower(agent.name);
        return displayName === contractName || canonicalName === contractName;
      });
      if (namedSubtypeCandidates.length === 1) {
        return {
          targetAgent: namedSubtypeCandidates[0],
          matchedBy: "contract_name",
          candidateCount: namedSubtypeCandidates.length,
        };
      }
      if (namedSubtypeCandidates.length > 1) {
        return { candidateCount: namedSubtypeCandidates.length };
      }
    }

    if (subtypeCandidates.length === 1) {
      return {
        targetAgent: subtypeCandidates[0],
        matchedBy: "contract_subtype",
        candidateCount: subtypeCandidates.length,
      };
    }
    if (subtypeCandidates.length > 1) {
      return { candidateCount: subtypeCandidates.length };
    }
  }

  if (contractName) {
    const nameCandidates = findNameCandidates(
      activeAgents,
      contractName,
      requestedSpecialistId
    );
    if (nameCandidates.length === 1) {
      return {
        targetAgent: nameCandidates[0],
        matchedBy: "contract_name",
        candidateCount: nameCandidates.length,
      };
    }
    if (nameCandidates.length > 1) {
      return { candidateCount: nameCandidates.length };
    }
  }

  return { candidateCount: 0 };
}

export function resolveTeamSpecialistSelection(
  input: TeamSpecialistSelectionInput
): TeamSpecialistSelectionResult {
  const requestedSpecialistType = normalizeSpecialistSubtype(
    input.requestedSpecialistType
  );
  const requestedSpecialistId = normalizeOptionalString(
    input.requestedSpecialistId
  );
  if (!requestedSpecialistType) {
    return { error: "tag_in_specialist requires specialistType." };
  }

  const activeAgents = input.activeAgents.filter(
    (agent) => String(agent._id) !== input.authorityAgentId
  );
  if (activeAgents.length === 0) {
    return {
      error: `No active ${input.requestedSpecialistType} agent found for this organization`,
    };
  }

  if (input.dreamTeamSpecialists.length > 0) {
    const matchingContracts = input.dreamTeamSpecialists.filter((contract) => {
      const contractSubtype = normalizeSpecialistSubtype(contract.specialistSubtype);
      if (contractSubtype && contractSubtype !== requestedSpecialistType) {
        return false;
      }
      if (requestedSpecialistId && contract.specialistId && contract.specialistId !== requestedSpecialistId) {
        return false;
      }
      return true;
    });
    const scopedMatchingContracts = matchingContracts.filter((contract) =>
      isDreamTeamSpecialistContractInWorkspaceScope({
        contract,
        workspaceType: input.workspaceType,
      })
    );

    if (matchingContracts.length === 0) {
      return {
        error:
          `No Dream Team specialist contract found for subtype ${input.requestedSpecialistType}. ` +
          "Use list_team_agents to select a contracted specialist.",
      };
    }
    if (scopedMatchingContracts.length === 0 && input.workspaceType) {
      return {
        error:
          `Dream Team specialist contract for subtype ${input.requestedSpecialistType} ` +
          `is out of scope for ${input.workspaceType} workspace.`,
      };
    }

    let highestCandidateCount = 0;
    for (const contract of scopedMatchingContracts) {
      const resolved = resolveContractAgentCandidate({
        contract,
        activeAgents,
        requestedSpecialistSubtype: requestedSpecialistType,
        requestedSpecialistId,
      });
      highestCandidateCount = Math.max(highestCandidateCount, resolved.candidateCount);
      if (!resolved.targetAgent || !resolved.matchedBy) {
        continue;
      }

      return {
        targetAgent: resolved.targetAgent,
        provenance: {
          selectionStrategy: "contract",
          requestedSpecialistType,
          requestedSpecialistId,
          matchedBy: resolved.matchedBy,
          contractSoulBlendId: contract.soulBlendId,
          contractSpecialistId: contract.specialistId,
          contractSpecialistSubtype: contract.specialistSubtype,
          contractSpecialistName: contract.specialistName,
          candidateCount: resolved.candidateCount,
          catalogSize: scopedMatchingContracts.length,
        },
      };
    }

    if (highestCandidateCount > 1) {
      return {
        error:
          `Specialist contract for ${input.requestedSpecialistType} is ambiguous (${highestCandidateCount} active matches). ` +
          "Set contract specialistId or specialistName to keep handoff deterministic.",
      };
    }

    return {
      error:
        `No active specialist satisfied the Dream Team contract for subtype ${input.requestedSpecialistType}.`,
    };
  }

  const fallbackCandidates = findSubtypeCandidates(
    activeAgents,
    requestedSpecialistType,
    requestedSpecialistId
  );
  if (fallbackCandidates.length === 0) {
    return {
      error: `No active ${input.requestedSpecialistType} agent found for this organization`,
    };
  }
  if (fallbackCandidates.length > 1) {
    return {
      error:
        `Multiple active ${input.requestedSpecialistType} agents found (${fallbackCandidates.length}). ` +
        "Configure dreamTeamSpecialists contract entries to keep routing deterministic.",
    };
  }

  return {
    targetAgent: fallbackCandidates[0],
    provenance: {
      selectionStrategy: "fallback_subtype",
      requestedSpecialistType,
      requestedSpecialistId,
      matchedBy: "fallback_subtype",
      candidateCount: fallbackCandidates.length,
      catalogSize: 0,
    },
  };
}

export function resolveSamanthaWarmLeadGuardrail(
  input: SamanthaWarmLeadGuardrailInput
): SamanthaWarmLeadGuardrailResult {
  const warmSpecialistSelected = isSamanthaWarmLeadCaptureAgent(
    input.selectedAgent
  );
  if (!warmSpecialistSelected) {
    return {
      targetAgent: input.selectedAgent,
      provenance: input.provenance,
      guardrailApplied: false,
    };
  }

  if (resolveWarmLeadEligibilityFromRuntimePolicy(input.runtimePolicy)) {
    return {
      targetAgent: input.selectedAgent,
      provenance: input.provenance,
      guardrailApplied: false,
    };
  }

  const coldSamanthaCandidates = input.activeAgents
    .filter(
      (agent) =>
        resolveAgentTemplateRole(agent) === SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE
    )
    .sort((left, right) => String(left._id).localeCompare(String(right._id)));

  const fallbackAgent = coldSamanthaCandidates[0];
  if (!fallbackAgent) {
    return {
      targetAgent: input.selectedAgent,
      provenance: input.provenance,
      guardrailApplied: false,
      reasonCode: "warm_samantha_disallowed_for_cold_lead",
      error:
        "Warm Samantha is restricted to warm/store leads. No cold Samantha fallback is available for this organization.",
    };
  }

  return {
    targetAgent: fallbackAgent,
    provenance: {
      selectionStrategy: "fallback_subtype",
      requestedSpecialistType:
        normalizeSpecialistSubtype(input.requestedSpecialistType)
        || input.requestedSpecialistType,
      requestedSpecialistId: normalizeOptionalString(input.requestedSpecialistId),
      matchedBy: "fallback_subtype",
      candidateCount: coldSamanthaCandidates.length,
      catalogSize: coldSamanthaCandidates.length,
    },
    guardrailApplied: true,
    reasonCode: "warm_samantha_disallowed_for_cold_lead",
  };
}

function resolveListContractAgent(
  contract: DreamTeamSpecialistRuntimeContract,
  activeAgents: TeamSpecialistAgentRecord[],
): TeamSpecialistAgentRecord | undefined {
  if (contract.specialistId) {
    const idMatch = activeAgents.find(
      (agent) => String(agent._id) === contract.specialistId
    );
    if (idMatch) {
      return idMatch;
    }
  }

  const contractSubtype = normalizeSpecialistSubtype(contract.specialistSubtype);
  const contractName = normalizeLower(contract.specialistName);
  if (contractSubtype) {
    const subtypeCandidates = findSubtypeCandidates(activeAgents, contractSubtype);
    if (contractName) {
      const namedSubtypeCandidate = subtypeCandidates.find((agent) => {
        const displayName = normalizeLower(resolveAgentDisplayName(agent));
        const canonicalName = normalizeLower(agent.name);
        return displayName === contractName || canonicalName === contractName;
      });
      if (namedSubtypeCandidate) {
        return namedSubtypeCandidate;
      }
    }
    if (subtypeCandidates.length === 1) {
      return subtypeCandidates[0];
    }
  }

  if (contractName) {
    const nameCandidates = findNameCandidates(activeAgents, contractName);
    if (nameCandidates.length === 1) {
      return nameCandidates[0];
    }
  }

  return undefined;
}

export function normalizeTeamHandoffPayload(
  args: Record<string, unknown>
): { payload?: TeamHandoffPayload; error?: string } {
  const reason = getTrimmedArg(args, "reason");
  const summary =
    getTrimmedArg(args, "summary")
    || getTrimmedArg(args, "contextNote")
    || reason;
  const goal = getTrimmedArg(args, "goal");

  if (!reason) {
    return { error: "tag_in_specialist requires handoff.reason." };
  }

  if (!summary) {
    return { error: "tag_in_specialist requires handoff.summary." };
  }

  if (!goal) {
    return { error: "tag_in_specialist requires handoff.goal." };
  }

  return {
    payload: {
      reason,
      summary,
      goal,
    },
  };
}

export function normalizeDmSummarySyncPayload(
  args: Record<string, unknown>
): { payload?: DmSummarySyncPayload; error?: string } {
  const summary =
    getTrimmedArg(args, "summary")
    || getTrimmedArg(args, "dmSummary")
    || getTrimmedArg(args, "message");
  const dmThreadId =
    getTrimmedArg(args, "dmThreadId")
    || getTrimmedArg(args, "proposalThreadId");
  const syncCheckpointToken =
    getTrimmedArg(args, "syncCheckpointToken")
    || getTrimmedArg(args, "collaborationSyncToken")
    || getTrimmedArg(args, "token");
  const syncAttemptId =
    getTrimmedArg(args, "syncAttemptId")
    || getTrimmedArg(args, "eventId")
    || undefined;

  if (!summary) {
    return { error: "sync_dm_summary_to_group requires summary." };
  }
  if (!dmThreadId) {
    return { error: "sync_dm_summary_to_group requires dmThreadId." };
  }

  return {
    payload: {
      summary,
      dmThreadId,
      syncCheckpointToken,
      syncAttemptId,
    },
  };
}

/**
 * Tag in a specialist agent from the PM's team.
 * Validates handoff via teamHarness (limits, cooldown, same-org).
 * The specialist will respond under its own name in the same conversation.
 */
export const tagInSpecialistTool: AITool = {
  name: "tag_in_specialist",
  description:
    "Tag in a specialist agent from your team to respond to this conversation. " +
    "The specialist will respond under their own name. " +
    "Use when the user's request matches another agent's expertise. " +
    "Handoff limits and cooldowns are enforced automatically.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      specialistType: {
        type: "string",
        description:
          "The subtype of the specialist to tag in (e.g. 'sales_assistant', 'customer_support', 'booking_agent'). Use list_team_agents first to see who's available.",
      },
      specialistId: {
        type: "string",
        description:
          "Optional contracted specialist agent ID for deterministic handoff when multiple agents share a subtype.",
      },
      reason: {
        type: "string",
        description: "Why the PM is handing off this turn",
      },
      summary: {
        type: "string",
        description: "Concise continuity summary the specialist should read first",
      },
      goal: {
        type: "string",
        description: "Specific objective the specialist should complete next",
      },
      contextNote: {
        type: "string",
        description: "Legacy alias for summary (kept for backward compatibility)",
      },
    },
    required: ["specialistType", "reason", "summary", "goal"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.agentSessionId || !ctx.agentId) {
      return { error: "No agent session context — tag_in_specialist requires an agent session" };
    }

    const handoffPayload = normalizeTeamHandoffPayload(args);
    if (!handoffPayload.payload) {
      return { error: handoffPayload.error || "Invalid handoff payload" };
    }

    // 1. Resolve specialist via contract-aware selection (fallback to unique subtype when no contract exists)
    const [allAgents, authorityAgent, organization] = await Promise.all([
      ctx.runQuery(getInternal().agentOntology.getAllActiveAgentsForOrg, {
        organizationId: ctx.organizationId,
      }),
      ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
        agentId: ctx.agentId,
      }),
      ctx.runQuery(getInternal().organizations.getOrganization, {
        organizationId: ctx.organizationId,
      }),
    ]);

    if (!authorityAgent || authorityAgent.type !== "org_agent") {
      return { error: "Primary team authority agent is unavailable for this handoff." };
    }

    const authorityProps =
      authorityAgent.customProperties as Record<string, unknown> | undefined;
    const dreamTeamSpecialists = normalizeDreamTeamSpecialistContracts(
      authorityProps?.dreamTeamSpecialists
    );
    const workspaceType = resolveWorkspaceTypeFromOrganization(
      organization as { isPersonalWorkspace?: boolean } | null
    );
    const specialistType = getTrimmedArg(args, "specialistType");
    const specialistId = getTrimmedArg(args, "specialistId") || undefined;
    const selection = resolveTeamSpecialistSelection({
      requestedSpecialistType: specialistType,
      requestedSpecialistId: specialistId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeAgents: allAgents as any[],
      authorityAgentId: String(ctx.agentId),
      dreamTeamSpecialists,
      workspaceType,
    });
    if (!selection.targetAgent || !selection.provenance) {
      return { error: selection.error || "Unable to resolve specialist selection." };
    }

    const warmLeadGuardrail = resolveSamanthaWarmLeadGuardrail({
      selectedAgent: selection.targetAgent,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeAgents: allAgents as any[],
      requestedSpecialistType: specialistType,
      requestedSpecialistId: specialistId,
      runtimePolicy: ctx.runtimePolicy,
      provenance: selection.provenance,
    });
    if (warmLeadGuardrail.error) {
      return { error: warmLeadGuardrail.error };
    }
    const selectedSpecialist = warmLeadGuardrail.targetAgent;
    const handoffProvenance = warmLeadGuardrail.provenance || selection.provenance;
    const preferredTeamAccessMode = isSamanthaLeadCaptureAgent(selectedSpecialist)
      ? "direct"
      : undefined;

    if (warmLeadGuardrail.guardrailApplied) {
      await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
        agentId: ctx.agentId,
        organizationId: ctx.organizationId,
        actionType: "warm_specialist_guardrail_applied",
        actionData: {
          sessionId: ctx.agentSessionId,
          requestedSpecialistType: specialistType,
          requestedSpecialistId: specialistId,
          selectedSpecialistId: selection.targetAgent._id,
          reroutedSpecialistId: selectedSpecialist._id,
          reasonCode: warmLeadGuardrail.reasonCode,
          commercialRouting: ctx.runtimePolicy?.commercialRouting ?? null,
        },
      });
    }

    // 2. Execute validated handoff via teamHarness
    const handoffResult = await ctx.runMutation(
      getInternal().ai.teamHarness.executeTeamHandoff,
      {
        sessionId: ctx.agentSessionId,
        fromAgentId: ctx.agentId,
        toAgentId: selectedSpecialist._id,
        organizationId: ctx.organizationId,
        handoff: handoffPayload.payload,
        preferredTeamAccessMode,
        handoffProvenance,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = handoffResult as any;
    if (result?.error) {
      return { error: result.error };
    }

    const specialistName = result?.targetAgentName || specialistType;
    const teamAccessMode =
      typeof result?.teamAccessMode === "string" ? result.teamAccessMode : "direct";

    // 3. Mirror the handoff to the team group (fire-and-forget)
    ctx.scheduler.runAfter(0,
      getInternal().channels.telegramGroupMirror.mirrorTagIn,
      {
        organizationId: ctx.organizationId,
        pmName: "PM",
        specialistName,
        reason: handoffPayload.payload.reason,
      }
    );

    return {
      success: true,
      tagged: specialistName,
      subtype: specialistType,
      specialistId: selectedSpecialist._id,
      teamAccessMode,
      activeAgentId: result?.activeAgentId,
      handoffNumber: result?.handoffNumber,
      handoffProvenance: result?.handoffProvenance || handoffProvenance,
      message:
        teamAccessMode === "invisible"
          ? `${specialistName} is advising in invisible mode. Continue in primary-agent voice and synthesize their guidance.`
          : teamAccessMode === "meeting"
            ? `${specialistName} joined the meeting context. Keep the primary agent visible while incorporating specialist input.`
            : `${specialistName} has been tagged in and will respond next. They have the conversation context.`,
    };
  },
};

/**
 * Sync a specialist DM summary back into the orchestrator group thread.
 * Commit-path execution remains blocked unless checkpoint token validation passes.
 */
export const syncDmSummaryToGroupTool: AITool = {
  name: "sync_dm_summary_to_group",
  description:
    "Sync a specialist DM summary into the orchestrator group thread. " +
    "This is an explicit operator/orchestrator action that requires a valid sync checkpoint token.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Summary text to publish from DM context into the group thread.",
      },
      dmThreadId: {
        type: "string",
        description: "Specialist DM thread identifier associated with the summary.",
      },
      syncCheckpointToken: {
        type: "string",
        description: "Checkpoint token required to resume commit-path routing.",
      },
      syncAttemptId: {
        type: "string",
        description: "Optional deterministic sync attempt/event ID for replay-safe retries.",
      },
      dmSummary: {
        type: "string",
        description: "Legacy alias for summary.",
      },
      collaborationSyncToken: {
        type: "string",
        description: "Legacy alias for syncCheckpointToken.",
      },
      proposalThreadId: {
        type: "string",
        description: "Legacy alias for dmThreadId.",
      },
      eventId: {
        type: "string",
        description: "Legacy alias for syncAttemptId.",
      },
    },
    required: ["summary", "dmThreadId", "syncCheckpointToken"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.agentSessionId || !ctx.agentId) {
      return {
        error: "No agent session context — sync_dm_summary_to_group requires an active agent session.",
      };
    }

    const payload = normalizeDmSummarySyncPayload(args);
    if (!payload.payload) {
      return { error: payload.error || "Invalid DM summary sync payload." };
    }

    const bridgeResult = await ctx.runAction(
      getInternal().ai.teamHarness.syncDmSummaryToGroupBridge,
      {
        sessionId: ctx.agentSessionId,
        organizationId: ctx.organizationId,
        requestedByAgentId: ctx.agentId,
        summary: payload.payload.summary,
        dmThreadId: payload.payload.dmThreadId,
        syncCheckpointToken: payload.payload.syncCheckpointToken,
        syncAttemptId: payload.payload.syncAttemptId,
      }
    ) as {
      status?: string;
      message?: string;
      response?: string;
      sessionId?: string;
      turnId?: string;
      syncAttemptId?: string;
    };

    if (bridgeResult.status === "blocked_sync_checkpoint") {
      return {
        success: false,
        status: "blocked_sync_checkpoint",
        message: bridgeResult.message
          || "DM summary sync is blocked until a valid sync checkpoint token is provided.",
        syncAttemptId: bridgeResult.syncAttemptId,
      };
    }

    if (
      bridgeResult.status === "error"
      || bridgeResult.status === "credits_exhausted"
      || bridgeResult.status === "rate_limited"
    ) {
      return {
        success: false,
        status: bridgeResult.status,
        error: bridgeResult.message || "Failed to sync DM summary to group.",
        syncAttemptId: bridgeResult.syncAttemptId,
      };
    }

    return {
      success: true,
      status: bridgeResult.status || "success",
      message:
        bridgeResult.response
        || bridgeResult.message
        || "DM summary sync submitted to group thread.",
      sessionId: bridgeResult.sessionId,
      turnId: bridgeResult.turnId,
      syncAttemptId: bridgeResult.syncAttemptId,
    };
  },
};

/**
 * List all active specialist agents on the PM's team.
 */
export const listTeamAgentsTool: AITool = {
  name: "list_team_agents",
  description: "List all active specialist agents on your team. Use to see who is available before tagging someone in.",
  status: "ready",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    const [agents, authorityAgent, organization] = await Promise.all([
      ctx.runQuery(getInternal().agentOntology.getAllActiveAgentsForOrg, {
        organizationId: ctx.organizationId,
      }),
      ctx.agentId
        ? ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
            agentId: ctx.agentId,
          })
        : Promise.resolve(null),
      ctx.runQuery(getInternal().organizations.getOrganization, {
        organizationId: ctx.organizationId,
      }),
    ]);
    const authorityProps =
      authorityAgent && authorityAgent.type === "org_agent"
        ? authorityAgent.customProperties as Record<string, unknown> | undefined
        : undefined;
    const workspaceType = resolveWorkspaceTypeFromOrganization(
      organization as { isPersonalWorkspace?: boolean } | null
    );
    const dreamTeamSpecialists = normalizeDreamTeamSpecialistContracts(
      authorityProps?.dreamTeamSpecialists
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeAgents = (agents as any[]).filter(
      (agent) => String(agent._id) !== String(ctx.agentId ?? "")
    ) as TeamSpecialistAgentRecord[];
    if (dreamTeamSpecialists.length > 0) {
      return dreamTeamSpecialists.map((contract) => {
        const inScope = isDreamTeamSpecialistContractInWorkspaceScope({
          contract,
          workspaceType,
        });
        const resolvedAgent = resolveListContractAgent(contract, activeAgents);
        const soulPreview = resolveAgentSoulPreview(resolvedAgent);
        return {
          id: resolvedAgent?._id || contract.specialistId || contract.soulBlendId,
          name: resolvedAgent
            ? resolveAgentDisplayName(resolvedAgent)
            : contract.specialistName || contract.soulBlendId,
          subtype:
            normalizeOptionalString(resolvedAgent?.subtype)
            || contract.specialistSubtype
            || "unknown",
          tagline: soulPreview.tagline,
          traits: soulPreview.traits,
          contractSoulBlendId: contract.soulBlendId,
          contractSpecialistId: contract.specialistId,
          directAccessEnabled: contract.directAccessEnabled,
          meetingParticipant: contract.meetingParticipant,
          workspaceScope: (contract.workspaceTypes ?? []).length > 0
            ? contract.workspaceTypes
            : ["personal", "business"],
          availability: !inScope
            ? "out_of_scope"
            : resolvedAgent
              ? "active"
              : "configured_missing",
        };
      });
    }

    return activeAgents.map((agent) => {
      const soulPreview = resolveAgentSoulPreview(agent);
      return {
        id: agent._id,
        name: resolveAgentDisplayName(agent),
        subtype: normalizeOptionalString(agent.subtype) || "unknown",
        tagline: soulPreview.tagline,
        traits: soulPreview.traits,
        availability: "active",
      };
    });
  },
};
