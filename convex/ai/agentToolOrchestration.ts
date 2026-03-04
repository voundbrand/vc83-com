import type { Id } from "../_generated/dataModel";
import type { ToolExecutionContext } from "./tools/registry";
import {
  TOOL_REGISTRY,
  VC83_NATIVE_RUNTIME_AUTHORITY_PRECEDENCE,
  VC83_NATIVE_TOOL_REGISTRY_ROUTE,
  executeTool,
} from "./tools/registry";
import { parseToolCallArguments } from "./toolBroker";
import {
  shouldRequireToolApproval,
  type ToolApprovalAutonomyLevel,
} from "./escalation";

export type AgentToolExecutionStatus =
  | "success"
  | "error"
  | "disabled"
  | "pending_approval"
  | "blocked";

export const AGENT_RUNTIME_TOOL_HOOK_CONTRACT_VERSION =
  "agent_runtime_tool_hooks_v1" as const;
export type AgentRuntimeToolHookName = "preTool" | "postTool";

export interface AgentRuntimeToolHookPayload {
  contractVersion: typeof AGENT_RUNTIME_TOOL_HOOK_CONTRACT_VERSION;
  hookName: AgentRuntimeToolHookName;
  organizationId: string;
  agentId: string;
  sessionId: string;
  toolName: string;
  occurredAt: number;
  toolArgs?: Record<string, unknown>;
  status?: AgentToolExecutionStatus;
  error?: string;
  result?: unknown;
}

export type AgentRuntimeToolHookHandler = (
  payload: AgentRuntimeToolHookPayload
) => Promise<void> | void;

export interface AgentRuntimeToolHooks {
  preTool?: AgentRuntimeToolHookHandler;
  postTool?: AgentRuntimeToolHookHandler;
  onHookError?: (args: {
    hookName: AgentRuntimeToolHookName;
    toolName: string;
    error: unknown;
  }) => void;
}

export interface AgentRuntimeToolHookValidationResult {
  valid: boolean;
  reasonCode:
    | "ok"
    | "invalid_hook"
    | "missing_required_field"
    | "invalid_occurred_at";
  field?: string;
}

export const TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CONTRACT_VERSION =
  "tool_foundry_runtime_capability_gap_v1" as const;
export const TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE =
  "missing_internal_concept_tool_backend_contract" as const;
export const TOOL_FOUNDRY_TOOL_SPEC_PROPOSAL_ARTIFACT_CONTRACT_VERSION =
  "tool_spec_proposal_draft_v1" as const;

export type ToolFoundryCapabilityGapMissingKind =
  | "internal_concept"
  | "tool_contract"
  | "backend_contract";

export type ToolSpecDraftInputType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "unknown";

export interface ToolSpecDraftInputField {
  name: string;
  inferredType: ToolSpecDraftInputType;
  required: boolean;
}

export interface ToolSpecProposalDraftArtifact {
  artifactType: "tool_spec_proposal";
  contractVersion: typeof TOOL_FOUNDRY_TOOL_SPEC_PROPOSAL_ARTIFACT_CONTRACT_VERSION;
  proposalKey: string;
  createdAt: number;
  stage: "draft";
  source: "runtime_capability_gap";
  provenance: {
    organizationId: string;
    agentId: string;
    sessionId: string;
    requestedToolName: string;
  };
  draft: {
    suggestedToolName: string;
    intentSummary: string;
    inputFields: ToolSpecDraftInputField[];
    outputContract: "tbd_by_foundry_review";
    requiredCapabilities: string[];
    riskLabels: string[];
    verificationIntent: string[];
  };
}

export interface ToolCapabilityGapBlockedPayload {
  contractVersion: typeof TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CONTRACT_VERSION;
  status: "blocked";
  code: typeof TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE;
  reason: string;
  missing: {
    requestedToolName: string;
    missingKinds: ToolFoundryCapabilityGapMissingKind[];
    summary: string;
  };
  unblockingSteps: string[];
  proposalArtifact: ToolSpecProposalDraftArtifact;
}

export interface AgentToolResult {
  tool: string;
  status: AgentToolExecutionStatus;
  result?: unknown;
  error?: string;
  blocked?: ToolCapabilityGapBlockedPayload;
}

export interface ToolFailureState {
  failedToolCounts: Record<string, number>;
  disabledTools: Set<string>;
}

export interface PersistedToolFailureState {
  disabledTools?: string[];
  failedToolCounts?: Record<string, number>;
}

export function collectSuccessfulToolNames(
  toolResults: AgentToolResult[]
): string[] {
  return Array.from(
    new Set(
      toolResults
        .filter((result) => result.status === "success")
        .map((result) => result.tool.trim())
        .filter((toolName) => toolName.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right));
}

interface ToolCallEnvelope {
  function?: {
    name?: string;
    arguments?: unknown;
  };
}

interface NativeEdgeMutationGuardResolution {
  blockedError?: string;
  requiresApproval: boolean;
}

function normalizeToolResultString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveSemanticToolFailure(result: unknown): string | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }

  const record = result as Record<string, unknown>;
  if (record.success === false) {
    return (
      normalizeToolResultString(record.message)
      || normalizeToolResultString(record.error)
      || normalizeToolResultString(record.errorCode)
      || "Tool returned success=false"
    );
  }

  const statusValue = normalizeToolResultString(record.status)?.toLowerCase();
  if (statusValue === "error" || statusValue === "failed" || statusValue === "blocked") {
    return (
      normalizeToolResultString(record.message)
      || normalizeToolResultString(record.error)
      || `Tool returned status=${statusValue}`
    );
  }

  return null;
}

function normalizeCapabilityGapToolToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function inferToolSpecDraftInputType(value: unknown): ToolSpecDraftInputType {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "string") {
    return "string";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (value && typeof value === "object") {
    return "object";
  }
  return "unknown";
}

function buildToolSpecDraftInputFields(
  args: Record<string, unknown>
): ToolSpecDraftInputField[] {
  return Object.entries(args)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ({
      name,
      inferredType: inferToolSpecDraftInputType(value),
      required: true,
    }));
}

function buildCapabilityGapIntentSummary(args: {
  requestedToolName: string;
  parsedArgs: Record<string, unknown>;
}): string {
  const argumentKeys = Object.keys(args.parsedArgs).sort((a, b) =>
    a.localeCompare(b)
  );
  if (argumentKeys.length === 0) {
    return `Operator requested unavailable capability "${args.requestedToolName}" with no structured arguments.`;
  }
  return `Operator requested unavailable capability "${args.requestedToolName}" with argument fields: ${argumentKeys.join(", ")}.`;
}

export function buildCapabilityGapBlockedPayload(args: {
  requestedToolName: string;
  parsedArgs: Record<string, unknown>;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  sessionId: Id<"agentSessions">;
  now?: number;
}): ToolCapabilityGapBlockedPayload {
  const requestedToolName = args.requestedToolName.trim();
  const normalizedToolToken =
    normalizeCapabilityGapToolToken(requestedToolName) || "unknown_tool";
  const createdAt = typeof args.now === "number" ? args.now : Date.now();
  const inputFields = buildToolSpecDraftInputFields(args.parsedArgs);
  const intentSummary = buildCapabilityGapIntentSummary({
    requestedToolName,
    parsedArgs: args.parsedArgs,
  });

  return {
    contractVersion: TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CONTRACT_VERSION,
    status: "blocked",
    code: TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE,
    reason:
      "Requested capability is blocked because no internal concept/tool/backend execution contract exists.",
    missing: {
      requestedToolName,
      missingKinds: ["internal_concept", "tool_contract", "backend_contract"],
      summary:
        "Runtime cannot execute this request because the trusted internal tool registry and backend contracts do not define it.",
    },
    unblockingSteps: [
      "Document the operator request intent, constraints, and expected output contract.",
      "Draft a ToolSpec proposal covering inputs/outputs, capability scope, and risk labels.",
      "Implement and test the backend contract behind one-agent trust and approval gates.",
      "Promote the ToolSpec through Tool Foundry stages (draft -> staged -> canary -> trusted) before runtime enablement.",
    ],
    proposalArtifact: {
      artifactType: "tool_spec_proposal",
      contractVersion:
        TOOL_FOUNDRY_TOOL_SPEC_PROPOSAL_ARTIFACT_CONTRACT_VERSION,
      proposalKey: `toolspec:${normalizedToolToken}:${String(args.organizationId)}:${String(args.sessionId)}`,
      createdAt,
      stage: "draft",
      source: "runtime_capability_gap",
      provenance: {
        organizationId: String(args.organizationId),
        agentId: String(args.agentId),
        sessionId: String(args.sessionId),
        requestedToolName,
      },
      draft: {
        suggestedToolName: normalizedToolToken,
        intentSummary,
        inputFields,
        outputContract: "tbd_by_foundry_review",
        requiredCapabilities: [
          normalizedToolToken,
          "operator_approved_execution_contract",
        ],
        riskLabels: [
          "capability_gap_unimplemented",
          "requires_trust_gate_review",
        ],
        verificationIntent: [
          "unit_contract_validation",
          "approval_gate_enforcement",
          "tool_foundry_stage_promotion_evidence",
        ],
      },
    },
  };
}

function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isMeetingConciergePreviewOperation(
  toolName: string,
  parsedArgs: Record<string, unknown>
): boolean {
  const action = normalizeOptionalString(parsedArgs.action).toLowerCase();
  const mode = normalizeOptionalString(parsedArgs.mode).toLowerCase();
  return (
    toolName === "manage_bookings"
    && action === "run_meeting_concierge_demo"
    && mode === "preview"
  );
}

function isMeetingConciergeExecuteOperation(
  toolName: string,
  parsedArgs: Record<string, unknown>
): boolean {
  const action = normalizeOptionalString(parsedArgs.action).toLowerCase();
  const mode = normalizeOptionalString(parsedArgs.mode).toLowerCase();
  return (
    toolName === "manage_bookings"
    && action === "run_meeting_concierge_demo"
    && mode === "execute"
  );
}

function resolveMeetingConciergeCommandPolicyBlock(args: {
  runtimePolicy: ToolExecutionContext["runtimePolicy"];
  previewOperation: boolean;
  executeOperation: boolean;
}): string | undefined {
  if (!args.previewOperation && !args.executeOperation) {
    return undefined;
  }
  const meetingConciergeRaw = args.runtimePolicy?.meetingConcierge;
  if (!meetingConciergeRaw || typeof meetingConciergeRaw !== "object") {
    return "Meeting concierge command policy contract is missing; runtime is fail-closed.";
  }
  const commandPolicyRaw = (meetingConciergeRaw as Record<string, unknown>).commandPolicy;
  if (!commandPolicyRaw || typeof commandPolicyRaw !== "object") {
    return "Meeting concierge command policy is missing; runtime is fail-closed.";
  }

  const commandPolicy = commandPolicyRaw as Record<string, unknown>;
  const policyRequired = commandPolicy.policyRequired === true;
  const allowed = commandPolicy.allowed === true;
  const status = normalizeOptionalString(commandPolicy.status).toLowerCase();
  const reasonCode = normalizeOptionalString(commandPolicy.reasonCode);

  if ((policyRequired || status === "blocked") && !allowed) {
    return `Meeting concierge command policy blocked execution (${reasonCode || "policy_blocked"}).`;
  }

  const evaluatedCommands = Array.isArray(commandPolicy.evaluatedCommands)
    ? commandPolicy.evaluatedCommands
        .map((value) => normalizeOptionalString(value).toLowerCase())
        .filter((value) => value.length > 0)
    : [];
  const expectedCommand = args.executeOperation
    ? "execute_meeting_concierge"
    : "preview_meeting_concierge";
  if (policyRequired && evaluatedCommands.length > 0 && !evaluatedCommands.includes(expectedCommand)) {
    return `Meeting concierge command policy does not authorize ${expectedCommand}; runtime is fail-closed.`;
  }
  if (
    args.executeOperation
    && policyRequired
    && evaluatedCommands.length > 0
    && !evaluatedCommands.includes("preview_meeting_concierge")
  ) {
    return "Meeting concierge command policy does not authorize preview_meeting_concierge; runtime is fail-closed.";
  }

  return undefined;
}

function resolveNativeEdgeMutationGuard(args: {
  runtimePolicy: ToolExecutionContext["runtimePolicy"];
  toolReadOnly: boolean;
  previewOnlyOperation?: boolean;
}): NativeEdgeMutationGuardResolution {
  if (args.toolReadOnly || args.previewOnlyOperation) {
    return { requiresApproval: false };
  }

  const nativeVisionEdgeRaw = args.runtimePolicy?.nativeVisionEdge;
  if (!nativeVisionEdgeRaw || typeof nativeVisionEdgeRaw !== "object") {
    return { requiresApproval: false };
  }
  const nativeVisionEdge = nativeVisionEdgeRaw as Record<string, unknown>;
  const actionableIntentCount = normalizeNonNegativeInteger(
    nativeVisionEdge.actionableIntentCount
  );
  const nativeCompanionIngressSignal =
    nativeVisionEdge.nativeCompanionIngressSignal === true;
  if (actionableIntentCount <= 0 && !nativeCompanionIngressSignal) {
    return { requiresApproval: false };
  }

  const runtimeAuthorityPrecedence = normalizeOptionalString(
    args.runtimePolicy?.runtimeAuthorityPrecedence
  );
  if (
    runtimeAuthorityPrecedence
    && runtimeAuthorityPrecedence !== VC83_NATIVE_RUNTIME_AUTHORITY_PRECEDENCE
  ) {
    return {
      blockedError:
        "Native edge tool execution requires vc83 runtime authority precedence.",
      requiresApproval: false,
    };
  }

  const registryRoute = normalizeOptionalString(nativeVisionEdge.registryRoute);
  if (registryRoute && registryRoute !== VC83_NATIVE_TOOL_REGISTRY_ROUTE) {
    return {
      blockedError: "Native edge intents must route through the vc83 tool registry.",
      requiresApproval: false,
    };
  }

  if (nativeVisionEdge.directDeviceMutationRequested === true) {
    return {
      blockedError:
        "Direct device-side mutation path is blocked. Route through native vc83 tool registry with trust/approval gates.",
      requiresApproval: false,
    };
  }

  const trustGateRequired = nativeVisionEdge.trustGateRequired === true;
  if (trustGateRequired && !args.runtimePolicy?.mutationAuthority) {
    return {
      blockedError:
        "Mutating native edge intent requires trust-gate authority context.",
      requiresApproval: false,
    };
  }

  const approvalGatePolicy = normalizeOptionalString(
    nativeVisionEdge.approvalGatePolicy
  ).toLowerCase();
  const mutatingIntentCount = normalizeNonNegativeInteger(
    nativeVisionEdge.mutatingIntentCount
  );
  const requiresApproval =
    approvalGatePolicy === "required_for_mutating_intents"
    || (trustGateRequired && (mutatingIntentCount > 0 || nativeCompanionIngressSignal));

  return {
    requiresApproval,
  };
}

export function initializeToolFailureState(
  existingState: PersistedToolFailureState | null | undefined
): ToolFailureState {
  return {
    failedToolCounts: { ...(existingState?.failedToolCounts || {}) },
    disabledTools: new Set<string>(existingState?.disabledTools || []),
  };
}

export function buildToolErrorStatePatch(args: {
  disabledTools: Set<string>;
  failedToolCounts: Record<string, number>;
}): {
  disabledTools: string[];
  failedToolCounts: Record<string, number>;
  degraded: boolean;
  degradedReason?: string;
} {
  const disabledToolList = Array.from(args.disabledTools);
  const degraded = disabledToolList.length >= 3;
  return {
    disabledTools: disabledToolList,
    failedToolCounts: args.failedToolCounts,
    degraded,
    degradedReason: degraded
      ? `${disabledToolList.length} tools disabled due to repeated failures`
      : undefined,
  };
}

function hasRuntimeHookString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateAgentRuntimeToolHookPayload(
  payload: AgentRuntimeToolHookPayload
): AgentRuntimeToolHookValidationResult {
  if (payload.hookName !== "preTool" && payload.hookName !== "postTool") {
    return {
      valid: false,
      reasonCode: "invalid_hook",
      field: "hookName",
    };
  }
  if (!hasRuntimeHookString(payload.organizationId)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "organizationId",
    };
  }
  if (!hasRuntimeHookString(payload.agentId)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "agentId",
    };
  }
  if (!hasRuntimeHookString(payload.sessionId)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "sessionId",
    };
  }
  if (!hasRuntimeHookString(payload.toolName)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "toolName",
    };
  }
  if (
    typeof payload.occurredAt !== "number"
    || !Number.isFinite(payload.occurredAt)
    || payload.occurredAt <= 0
  ) {
    return {
      valid: false,
      reasonCode: "invalid_occurred_at",
      field: "occurredAt",
    };
  }
  return {
    valid: true,
    reasonCode: "ok",
  };
}

async function invokeAgentRuntimeToolHook(args: {
  runtimeHooks?: AgentRuntimeToolHooks;
  hookName: AgentRuntimeToolHookName;
  payload: Omit<
    AgentRuntimeToolHookPayload,
    "contractVersion" | "hookName" | "occurredAt"
  > & { occurredAt?: number };
}): Promise<{ valid: boolean; error?: string }> {
  const payload: AgentRuntimeToolHookPayload = {
    contractVersion: AGENT_RUNTIME_TOOL_HOOK_CONTRACT_VERSION,
    hookName: args.hookName,
    organizationId: args.payload.organizationId,
    agentId: args.payload.agentId,
    sessionId: args.payload.sessionId,
    toolName: args.payload.toolName,
    occurredAt: args.payload.occurredAt ?? Date.now(),
    toolArgs: args.payload.toolArgs,
    status: args.payload.status,
    error: args.payload.error,
    result: args.payload.result,
  };
  const validation = validateAgentRuntimeToolHookPayload(payload);
  if (!validation.valid) {
    return {
      valid: false,
      error:
        `agent_runtime_tool_hook_payload_invalid:${validation.reasonCode}:${validation.field || "unknown"}`,
    };
  }

  const runtimeHooks = args.runtimeHooks;
  const hookHandler =
    args.hookName === "preTool"
      ? runtimeHooks?.preTool
      : runtimeHooks?.postTool;
  if (!hookHandler) {
    return { valid: true };
  }

  try {
    await hookHandler(payload);
  } catch (error) {
    runtimeHooks?.onHookError?.({
      hookName: args.hookName,
      toolName: payload.toolName,
      error,
    });
  }

  return { valid: true };
}

export async function executeToolCallsWithApproval(args: {
  toolCalls: ToolCallEnvelope[];
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  sessionId: Id<"agentSessions">;
  autonomyLevel: ToolApprovalAutonomyLevel;
  requireApprovalFor?: string[];
  toolExecutionContext: ToolExecutionContext;
  failedToolCounts: Record<string, number>;
  disabledTools: Set<string>;
  nonDisableableTools?: string[];
  createApprovalRequest: (args: {
    actionType: string;
    actionPayload: Record<string, unknown>;
  }) => Promise<void>;
  onToolDisabled: (args: { toolName: string; error: string }) => Promise<void>;
  runtimeHooks?: AgentRuntimeToolHooks;
}): Promise<{
  toolResults: AgentToolResult[];
  errorStateDirty: boolean;
  blockedCapabilityGap?: ToolCapabilityGapBlockedPayload;
}> {
  const toolResults: AgentToolResult[] = [];
  let errorStateDirty = false;
  const nonDisableableTools = new Set(args.nonDisableableTools || []);

  for (const toolCall of args.toolCalls) {
    const toolName = toolCall.function?.name;
    if (!toolName) continue;

    const toolDefinition = TOOL_REGISTRY[toolName];
    if (!toolDefinition) {
      const parsedGapArgs = parseToolCallArguments(toolCall.function?.arguments, {
        strict: false,
      }).args;
      const blockedCapabilityGap = buildCapabilityGapBlockedPayload({
        requestedToolName: toolName,
        parsedArgs: parsedGapArgs,
        organizationId: args.organizationId,
        agentId: args.agentId,
        sessionId: args.sessionId,
      });
      toolResults.push({
        tool: toolName,
        status: "blocked",
        error: blockedCapabilityGap.reason,
        blocked: blockedCapabilityGap,
      });
      return {
        toolResults,
        errorStateDirty,
        blockedCapabilityGap,
      };
    }

    if (
      !nonDisableableTools.has(toolName)
      && (
        args.disabledTools.has(toolName)
        || (args.failedToolCounts[toolName] || 0) >= 3
      )
    ) {
      toolResults.push({
        tool: toolName,
        status: "disabled",
        error: "Tool disabled after repeated failures",
      });
      continue;
    }

    const parsedArgsResult = parseToolCallArguments(
      toolCall.function?.arguments,
      { strict: true }
    );
    if (parsedArgsResult.isError) {
      toolResults.push({
        tool: toolName,
        status: "error",
        error: parsedArgsResult.error || "Invalid arguments",
      });
      args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
      errorStateDirty = true;
      continue;
    }
    const preToolHookResult = await invokeAgentRuntimeToolHook({
      runtimeHooks: args.runtimeHooks,
      hookName: "preTool",
      payload: {
        organizationId: String(args.organizationId),
        agentId: String(args.agentId),
        sessionId: String(args.sessionId),
        toolName,
        toolArgs: parsedArgsResult.args,
      },
    });
    if (!preToolHookResult.valid) {
      toolResults.push({
        tool: toolName,
        status: "error",
        error: preToolHookResult.error || "agent_runtime_tool_hook_pre_tool_invalid",
      });
      args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
      errorStateDirty = true;
      continue;
    }
    const applyPostToolHookResult = async (
      candidate: AgentToolResult,
      options?: { markFailureOnContractInvalid?: boolean }
    ): Promise<AgentToolResult> => {
      const postToolHookResult = await invokeAgentRuntimeToolHook({
        runtimeHooks: args.runtimeHooks,
        hookName: "postTool",
        payload: {
          organizationId: String(args.organizationId),
          agentId: String(args.agentId),
          sessionId: String(args.sessionId),
          toolName,
          toolArgs: parsedArgsResult.args,
          status: candidate.status,
          error: candidate.error,
          result: candidate.result,
        },
      });
      if (postToolHookResult.valid) {
        return candidate;
      }
      if (options?.markFailureOnContractInvalid !== false) {
        args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
        errorStateDirty = true;
      }
      return {
        tool: toolName,
        status: "error",
        error:
          postToolHookResult.error || "agent_runtime_tool_hook_post_tool_invalid",
      };
    };

    const conciergePreviewOperation = isMeetingConciergePreviewOperation(
      toolName,
      parsedArgsResult.args
    );
    const conciergeExecuteOperation = isMeetingConciergeExecuteOperation(
      toolName,
      parsedArgsResult.args
    );
    const commandPolicyBlock = resolveMeetingConciergeCommandPolicyBlock({
      runtimePolicy: args.toolExecutionContext.runtimePolicy,
      previewOperation: conciergePreviewOperation,
      executeOperation: conciergeExecuteOperation,
    });
    if (commandPolicyBlock) {
      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "error",
        error: commandPolicyBlock,
      }));
      continue;
    }
    const conciergeExplicitConfirm =
      args.toolExecutionContext.runtimePolicy?.meetingConcierge?.explicitConfirmDetected === true;
    if (conciergeExecuteOperation && !conciergeExplicitConfirm) {
      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "error",
        error:
          "Meeting concierge execute path requires explicit operator confirmation before mutation.",
      }));
      continue;
    }

    const mutationAuthority = args.toolExecutionContext.runtimePolicy?.mutationAuthority;
    const mutatingToolExecutionBlocked =
      toolDefinition?.readOnly !== true
      && mutationAuthority?.mutatingToolExecutionAllowed === false;
    if (mutatingToolExecutionBlocked) {
      const violationSummary = Array.isArray(mutationAuthority?.invariantViolations)
        ? mutationAuthority.invariantViolations.join(", ")
        : "unknown_violation";
      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "error",
        error: `Mutating tool execution blocked by authority invariant: ${violationSummary}.`,
      }));
      continue;
    }

    const nativeEdgeGuard = resolveNativeEdgeMutationGuard({
      runtimePolicy: args.toolExecutionContext.runtimePolicy,
      toolReadOnly: toolDefinition?.readOnly === true,
      previewOnlyOperation: conciergePreviewOperation,
    });
    if (nativeEdgeGuard.blockedError) {
      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "error",
        error: nativeEdgeGuard.blockedError,
      }, { markFailureOnContractInvalid: false }));
      args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
      errorStateDirty = true;
      continue;
    }

    const policyNeedsApproval = conciergePreviewOperation
      ? false
      : shouldRequireToolApproval({
          autonomyLevel: args.autonomyLevel,
          toolName,
          requireApprovalFor: args.requireApprovalFor,
          toolArgs: parsedArgsResult.args,
        });
    const needsApproval = nativeEdgeGuard.requiresApproval || policyNeedsApproval;

    if (needsApproval) {
      await args.createApprovalRequest({
        actionType: toolName,
        actionPayload: parsedArgsResult.args,
      });
      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "pending_approval",
      }));
      continue;
    }

    try {
      const toolExecutionRuntimePolicy = {
        ...(args.toolExecutionContext.runtimePolicy || {}),
        codeExecution: {
          autonomyLevel: args.autonomyLevel,
          requireApprovalFor: args.requireApprovalFor || [],
          approvalRequired: needsApproval,
          approvalGranted: !needsApproval,
          policySource: "agent_tool_orchestration",
        },
      };
      const executionContext: ToolExecutionContext = {
        ...args.toolExecutionContext,
        runtimePolicy: toolExecutionRuntimePolicy,
      };
      const result = await executeTool(
        executionContext,
        toolName,
        parsedArgsResult.args,
      );
      const semanticFailure = resolveSemanticToolFailure(result);
      if (semanticFailure) {
        args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
        toolResults.push(await applyPostToolHookResult({
          tool: toolName,
          status: "error",
          result,
          error: semanticFailure,
        }, { markFailureOnContractInvalid: false }));
        errorStateDirty = true;

        if (
          args.failedToolCounts[toolName] >= 3
          && !nonDisableableTools.has(toolName)
        ) {
          args.disabledTools.add(toolName);
          await args.onToolDisabled({ toolName, error: semanticFailure });
        }
        continue;
      }

      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "success",
        result,
      }));
    } catch (error) {
      args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      toolResults.push(await applyPostToolHookResult({
        tool: toolName,
        status: "error",
        error: errorMessage,
      }, { markFailureOnContractInvalid: false }));
      errorStateDirty = true;

      if (
        args.failedToolCounts[toolName] >= 3
        && !nonDisableableTools.has(toolName)
      ) {
        args.disabledTools.add(toolName);
        await args.onToolDisabled({ toolName, error: errorMessage });
      }
    }
  }

  return {
    toolResults,
    errorStateDirty,
  };
}
