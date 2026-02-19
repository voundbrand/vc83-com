import type { Id } from "../_generated/dataModel";
import type { ToolExecutionContext } from "./tools/registry";
import { TOOL_REGISTRY } from "./tools/registry";
import { parseToolCallArguments } from "./toolBroker";
import {
  shouldRequireToolApproval,
  type ToolApprovalAutonomyLevel,
} from "./escalation";

export type AgentToolExecutionStatus =
  | "success"
  | "error"
  | "disabled"
  | "pending_approval";

export interface AgentToolResult {
  tool: string;
  status: AgentToolExecutionStatus;
  result?: unknown;
  error?: string;
}

export interface ToolFailureState {
  failedToolCounts: Record<string, number>;
  disabledTools: Set<string>;
}

export interface PersistedToolFailureState {
  disabledTools?: string[];
  failedToolCounts?: Record<string, number>;
}

interface ToolCallEnvelope {
  function?: {
    name?: string;
    arguments?: unknown;
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
  createApprovalRequest: (args: {
    actionType: string;
    actionPayload: Record<string, unknown>;
  }) => Promise<void>;
  onToolDisabled: (args: { toolName: string; error: string }) => void;
}): Promise<{
  toolResults: AgentToolResult[];
  errorStateDirty: boolean;
}> {
  const toolResults: AgentToolResult[] = [];
  let errorStateDirty = false;

  for (const toolCall of args.toolCalls) {
    const toolName = toolCall.function?.name;
    if (!toolName) continue;

    if (
      args.disabledTools.has(toolName)
      || (args.failedToolCounts[toolName] || 0) >= 3
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

    const needsApproval = shouldRequireToolApproval({
      autonomyLevel: args.autonomyLevel,
      toolName,
      requireApprovalFor: args.requireApprovalFor,
    });

    if (needsApproval) {
      await args.createApprovalRequest({
        actionType: toolName,
        actionPayload: parsedArgsResult.args,
      });
      toolResults.push({ tool: toolName, status: "pending_approval" });
      continue;
    }

    try {
      const result = await TOOL_REGISTRY[toolName]?.execute(
        args.toolExecutionContext,
        parsedArgsResult.args,
      );
      toolResults.push({ tool: toolName, status: "success", result });
    } catch (error) {
      args.failedToolCounts[toolName] = (args.failedToolCounts[toolName] || 0) + 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      toolResults.push({
        tool: toolName,
        status: "error",
        error: errorMessage,
      });
      errorStateDirty = true;

      if (args.failedToolCounts[toolName] >= 3) {
        args.disabledTools.add(toolName);
        args.onToolDisabled({ toolName, error: errorMessage });
      }
    }
  }

  return {
    toolResults,
    errorStateDirty,
  };
}
