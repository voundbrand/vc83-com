import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE,
  executeToolCallsWithApproval,
} from "../../../convex/ai/agentToolOrchestration";
import { TOOL_REGISTRY, type AITool } from "../../../convex/ai/tools/registry";

const ORG_ID = "org_1" as Id<"organizations">;
const AGENT_ID = "agent_1" as Id<"objects">;
const SESSION_ID = "session_1" as Id<"agentSessions">;
const MUTATING_TOOL = "__yai014_mutating_tool";
const READ_ONLY_TOOL = "__yai014_read_only_tool";
const MANAGE_BOOKINGS_TOOL = "manage_bookings";
const ORIGINAL_MANAGE_BOOKINGS_TOOL = TOOL_REGISTRY[MANAGE_BOOKINGS_TOOL];

function registerTestTool(name: string, tool: AITool) {
  TOOL_REGISTRY[name] = tool;
}

afterEach(() => {
  delete TOOL_REGISTRY[MUTATING_TOOL];
  delete TOOL_REGISTRY[READ_ONLY_TOOL];
  if (ORIGINAL_MANAGE_BOOKINGS_TOOL) {
    TOOL_REGISTRY[MANAGE_BOOKINGS_TOOL] = ORIGINAL_MANAGE_BOOKINGS_TOOL;
  } else {
    delete TOOL_REGISTRY[MANAGE_BOOKINGS_TOOL];
  }
});

describe("agent tool orchestration authority invariants", () => {
  it("returns deterministic capability-gap blocked payload for unknown tools", async () => {
    const createApprovalRequest = vi.fn(async () => {});
    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: "__yai014_unknown_tool",
            arguments: "{\"calendarId\":\"abc\",\"dryRun\":true}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {},
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest,
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0]).toMatchObject({
      tool: "__yai014_unknown_tool",
      status: "blocked",
    });
    expect(result.blockedCapabilityGap).toMatchObject({
      status: "blocked",
      code: TOOL_FOUNDRY_RUNTIME_CAPABILITY_GAP_CODE,
      missing: {
        requestedToolName: "__yai014_unknown_tool",
        missingKinds: ["internal_concept", "tool_contract", "backend_contract"],
      },
      proposalArtifact: {
        artifactType: "tool_spec_proposal",
        contractVersion: "tool_spec_proposal_draft_v1",
        stage: "draft",
      },
    });
    expect(result.blockedCapabilityGap?.unblockingSteps.length).toBeGreaterThanOrEqual(4);
    expect(result.blockedCapabilityGap?.proposalArtifact.draft.inputFields).toEqual([
      {
        name: "calendarId",
        inferredType: "string",
        required: true,
      },
      {
        name: "dryRun",
        inferredType: "boolean",
        required: true,
      },
    ]);
    expect(createApprovalRequest).not.toHaveBeenCalled();
  });

  it("blocks mutating tool execution when authority invariants fail", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const createApprovalRequest = vi.fn(async () => {});
    const onToolDisabled = vi.fn();
    const failedToolCounts: Record<string, number> = {};
    const disabledTools = new Set<string>();

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: false,
            invariantViolations: ["authority_agent_must_match_primary"],
          },
        },
      } as any,
      failedToolCounts,
      disabledTools,
      createApprovalRequest,
      onToolDisabled,
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "error",
        error:
          "Mutating tool execution blocked by authority invariant: authority_agent_must_match_primary.",
      },
    ]);
    expect(executeMock).not.toHaveBeenCalled();
    expect(createApprovalRequest).not.toHaveBeenCalled();
    expect(onToolDisabled).not.toHaveBeenCalled();
    expect(failedToolCounts[MUTATING_TOOL]).toBeUndefined();
  });

  it("allows read-only tools even when mutating authority is blocked", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    registerTestTool(READ_ONLY_TOOL, {
      name: READ_ONLY_TOOL,
      description: "test read-only tool",
      status: "ready",
      readOnly: true,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: READ_ONLY_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: false,
            invariantViolations: ["authority_agent_must_match_primary"],
          },
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: READ_ONLY_TOOL,
        status: "success",
        result: { ok: true },
      },
    ]);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("executes meeting concierge preview without approval and returns success", async () => {
    const executeMock = vi.fn(async () => ({ mode: "preview", status: "ok" }));
    registerTestTool(MANAGE_BOOKINGS_TOOL, {
      name: MANAGE_BOOKINGS_TOOL,
      description: "test manage bookings concierge tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });
    const createApprovalRequest = vi.fn(async () => {});

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MANAGE_BOOKINGS_TOOL,
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "preview",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: true,
            invariantViolations: [],
          },
          nativeVisionEdge: {
            actionableIntentCount: 1,
            mutatingIntentCount: 1,
            trustGateRequired: true,
            approvalGatePolicy: "required_for_mutating_intents",
            registryRoute: "vc83_tool_registry",
            nativeAuthorityPrecedence: "vc83_runtime_policy",
          },
          meetingConcierge: {
            explicitConfirmDetected: false,
            previewIntentDetected: true,
            extractedPayloadReady: true,
            commandPolicy: {
              policyRequired: true,
              status: "allowed",
              allowed: true,
              reasonCode: "allowed",
              evaluatedCommands: [
                "assemble_concierge_payload",
                "preview_meeting_concierge",
              ],
            },
          },
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest,
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MANAGE_BOOKINGS_TOOL,
        status: "success",
        result: { mode: "preview", status: "ok" },
      },
    ]);
    expect(createApprovalRequest).not.toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("blocks meeting concierge execute mode when explicit confirmation is missing", async () => {
    const executeMock = vi.fn(async () => ({ mode: "execute", status: "ok" }));
    registerTestTool(MANAGE_BOOKINGS_TOOL, {
      name: MANAGE_BOOKINGS_TOOL,
      description: "test manage bookings concierge tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });
    const createApprovalRequest = vi.fn(async () => {});

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MANAGE_BOOKINGS_TOOL,
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "execute",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          meetingConcierge: {
            explicitConfirmDetected: false,
            previewIntentDetected: false,
            extractedPayloadReady: true,
            commandPolicy: {
              policyRequired: true,
              status: "allowed",
              allowed: true,
              reasonCode: "allowed",
              evaluatedCommands: [
                "assemble_concierge_payload",
                "preview_meeting_concierge",
                "execute_meeting_concierge",
              ],
            },
          },
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest,
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MANAGE_BOOKINGS_TOOL,
        status: "error",
        error:
          "Meeting concierge execute path requires explicit operator confirmation before mutation.",
      },
    ]);
    expect(createApprovalRequest).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("blocks meeting concierge preview when command policy contract is missing", async () => {
    const executeMock = vi.fn(async () => ({ mode: "preview", status: "ok" }));
    registerTestTool(MANAGE_BOOKINGS_TOOL, {
      name: MANAGE_BOOKINGS_TOOL,
      description: "test manage bookings concierge tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MANAGE_BOOKINGS_TOOL,
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "preview",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          meetingConcierge: {
            explicitConfirmDetected: false,
            previewIntentDetected: true,
            extractedPayloadReady: true,
          },
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(result.toolResults).toEqual([
      {
        tool: MANAGE_BOOKINGS_TOOL,
        status: "error",
        error: "Meeting concierge command policy is missing; runtime is fail-closed.",
      },
    ]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("blocks meeting concierge execute when command policy disallows command", async () => {
    const executeMock = vi.fn(async () => ({ mode: "execute", status: "ok" }));
    registerTestTool(MANAGE_BOOKINGS_TOOL, {
      name: MANAGE_BOOKINGS_TOOL,
      description: "test manage bookings concierge tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MANAGE_BOOKINGS_TOOL,
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "execute",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          meetingConcierge: {
            explicitConfirmDetected: true,
            previewIntentDetected: false,
            extractedPayloadReady: true,
            commandPolicy: {
              policyRequired: true,
              status: "blocked",
              allowed: false,
              reasonCode: "command_not_allowlisted",
              evaluatedCommands: [
                "assemble_concierge_payload",
                "preview_meeting_concierge",
              ],
            },
          },
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(result.toolResults).toEqual([
      {
        tool: MANAGE_BOOKINGS_TOOL,
        status: "error",
        error:
          "Meeting concierge command policy blocked execution (command_not_allowlisted).",
      },
    ]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("blocks meeting concierge execute when preview authorization is missing from command policy", async () => {
    const executeMock = vi.fn(async () => ({ mode: "execute", status: "ok" }));
    registerTestTool(MANAGE_BOOKINGS_TOOL, {
      name: MANAGE_BOOKINGS_TOOL,
      description: "test manage bookings concierge tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MANAGE_BOOKINGS_TOOL,
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "execute",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          meetingConcierge: {
            explicitConfirmDetected: true,
            previewIntentDetected: false,
            extractedPayloadReady: true,
            commandPolicy: {
              policyRequired: true,
              status: "allowed",
              allowed: true,
              reasonCode: "allowed",
              evaluatedCommands: ["assemble_concierge_payload", "execute_meeting_concierge"],
            },
          },
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(result.toolResults).toEqual([
      {
        tool: MANAGE_BOOKINGS_TOOL,
        status: "error",
        error:
          "Meeting concierge command policy does not authorize preview_meeting_concierge; runtime is fail-closed.",
      },
    ]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("blocks mutating tools when native edge metadata signals direct device mutation", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: true,
          },
          nativeVisionEdge: {
            actionableIntentCount: 1,
            directDeviceMutationRequested: true,
            trustGateRequired: true,
            registryRoute: "vc83_tool_registry",
          },
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(true);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "error",
        error:
          "Direct device-side mutation path is blocked. Route through native vc83 tool registry with trust/approval gates.",
      },
    ]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("requires approval for mutating native-edge intents when approval policy is non-bypassable", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    const createApprovalRequest = vi.fn(async () => {});
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: true,
            invariantViolations: [],
          },
          nativeVisionEdge: {
            actionableIntentCount: 1,
            mutatingIntentCount: 1,
            directDeviceMutationRequested: false,
            trustGateRequired: true,
            approvalGatePolicy: "required_for_mutating_intents",
            registryRoute: "vc83_tool_registry",
            nativeAuthorityPrecedence: "vc83_runtime_policy",
          },
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest,
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "pending_approval",
      },
    ]);
    expect(createApprovalRequest).toHaveBeenCalledTimes(1);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("requires approval for desktop companion native ingress even without explicit tool intents", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    const createApprovalRequest = vi.fn(async () => {});
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: true,
            invariantViolations: [],
          },
          nativeVisionEdge: {
            actionableIntentCount: 0,
            mutatingIntentCount: 0,
            nativeCompanionIngressSignal: true,
            directDeviceMutationRequested: false,
            trustGateRequired: true,
            approvalGatePolicy: "required_for_mutating_intents",
            registryRoute: "vc83_tool_registry",
            nativeAuthorityPrecedence: "vc83_runtime_policy",
          },
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest,
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "pending_approval",
      },
    ]);
    expect(createApprovalRequest).toHaveBeenCalledTimes(1);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("blocks mutating native-edge intents when trust-gate authority context is missing", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    const createApprovalRequest = vi.fn(async () => {});
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          nativeVisionEdge: {
            actionableIntentCount: 1,
            mutatingIntentCount: 1,
            directDeviceMutationRequested: false,
            trustGateRequired: true,
            approvalGatePolicy: "required_for_mutating_intents",
            registryRoute: "vc83_tool_registry",
          },
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest,
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(true);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "error",
        error: "Mutating native edge intent requires trust-gate authority context.",
      },
    ]);
    expect(createApprovalRequest).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("preserves mutating tool execution when observability fallback reasons are present but authority invariants pass", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: true,
            invariantViolations: [],
          },
          nativeVisionEdge: {
            actionableIntentCount: 1,
            directDeviceMutationRequested: false,
            trustGateRequired: true,
            registryRoute: "vc83_tool_registry",
            nativeAuthorityPrecedence: "vc83_runtime_policy",
            observability: {
              deterministicFallbackReasons: ["voice_provider_degraded"],
            },
          },
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "success",
        result: { ok: true },
      },
    ]);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("does not auto-disable non-disableable tools even when failure threshold state is reached", async () => {
    const executeMock = vi.fn(async () => ({ ok: true }));
    registerTestTool(MUTATING_TOOL, {
      name: MUTATING_TOOL,
      description: "test mutating tool",
      status: "ready",
      readOnly: false,
      parameters: {
        type: "object",
        properties: {},
      },
      execute: executeMock,
    });

    const onToolDisabled = vi.fn(async () => {});
    const result = await executeToolCallsWithApproval({
      toolCalls: [
        {
          function: {
            name: MUTATING_TOOL,
            arguments: "{}",
          },
        },
      ],
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      sessionId: SESSION_ID,
      autonomyLevel: "autonomous",
      toolExecutionContext: {
        runtimePolicy: {
          mutationAuthority: {
            mutatingToolExecutionAllowed: true,
            invariantViolations: [],
          },
        },
      } as any,
      failedToolCounts: {
        [MUTATING_TOOL]: 3,
      },
      disabledTools: new Set<string>([MUTATING_TOOL]),
      nonDisableableTools: [MUTATING_TOOL],
      createApprovalRequest: async () => {},
      onToolDisabled,
    });

    expect(result.errorStateDirty).toBe(false);
    expect(result.toolResults).toEqual([
      {
        tool: MUTATING_TOOL,
        status: "success",
        result: { ok: true },
      },
    ]);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(onToolDisabled).not.toHaveBeenCalled();
  });
});
