import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildMeetingConciergeDecisionTelemetry,
  resolveInboundIngressEnvelope,
  resolveInboundMeetingConciergeIntent,
} from "../../../convex/ai/agentExecution";
import { executeToolCallsWithApproval } from "../../../convex/ai/agentToolOrchestration";
import {
  buildMobileSourceAttestationChallenge,
  computeMobileSourceAttestationSignature,
  MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
} from "../../../convex/ai/mobileRuntimeHardening";
import { TOOL_REGISTRY, type AITool } from "../../../convex/ai/tools/registry";

const ORG_ID = "org_1" as Id<"organizations">;
const AGENT_ID = "agent_1" as Id<"objects">;
const SESSION_ID = "session_1" as Id<"agentSessions">;
const MANAGE_BOOKINGS_TOOL = "manage_bookings";
const ORIGINAL_MANAGE_BOOKINGS_TOOL = TOOL_REGISTRY[MANAGE_BOOKINGS_TOOL];

afterEach(() => {
  if (ORIGINAL_MANAGE_BOOKINGS_TOOL) {
    TOOL_REGISTRY[MANAGE_BOOKINGS_TOOL] = ORIGINAL_MANAGE_BOOKINGS_TOOL;
  } else {
    delete TOOL_REGISTRY[MANAGE_BOOKINGS_TOOL];
  }
});

function registerTool(name: string, tool: AITool) {
  TOOL_REGISTRY[name] = tool;
}

describe("mobile runtime hardening integration", () => {
  it("keeps preview tool execution fail-closed when attestation and policy trust checks fail", async () => {
    const now = 1_701_900_000_000;
    const metadata = {
      liveSessionId: "mobile_live_fail_closed_1",
      cameraRuntime: {
        sourceId: "iphone_camera:ios_avfoundation:front_camera",
        sourceClass: "iphone_camera",
        providerId: "ios_avfoundation",
        sessionState: "capturing",
      },
      voiceRuntime: {
        sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
        sourceClass: "iphone_microphone",
        providerId: "ios_avfoundation",
        transcript: "Please preview a meeting with jordan@example.com.",
      },
    } as const;

    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: metadata as unknown as Record<string, unknown>,
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
      now,
    });
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      metadata: metadata as unknown as Record<string, unknown>,
      message: "Preview the booking for jordan@example.com",
      now,
    });

    const executeMock = vi.fn(async () => ({ mode: "preview", status: "ok" }));
    registerTool(MANAGE_BOOKINGS_TOOL, {
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
          mutationAuthority: envelope.authority,
          nativeVisionEdge: envelope.nativeVisionEdge,
          meetingConcierge: intent,
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(envelope.nativeVisionEdge.sourceAttestation.verificationRequired).toBe(true);
    expect(envelope.nativeVisionEdge.sourceAttestation.verified).toBe(false);
    expect(envelope.authority.invariantViolations).toContain(
      "source_attestation_verification_failed"
    );
    expect(intent.commandPolicy.allowed).toBe(false);
    expect(intent.commandPolicy.reasonCode).toBe("missing_policy_contract");
    expect(result.toolResults).toEqual([
      {
        tool: MANAGE_BOOKINGS_TOOL,
        status: "error",
        error: "Meeting concierge command policy blocked execution (missing_policy_contract).",
      },
    ]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("emits concierge decision telemetry for successful preview path within latency budget", async () => {
    const now = 1_701_900_100_000;
    const metadata = {
      liveSessionId: "mobile_live_preview_success_1",
      timestamp: now - 1_200,
      commandPolicy: {
        contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
        attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      },
      voiceRuntime: {
        sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
        sourceClass: "iphone_microphone",
        providerId: "ios_avfoundation",
        transcript: "Please preview a meeting with jordan@example.com.",
        stoppedAt: now - 1_200,
      },
    } as const;

    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      metadata: metadata as unknown as Record<string, unknown>,
      message: "Preview the booking for jordan@example.com",
      now,
    });

    const executeMock = vi.fn(async () => ({ mode: "preview", status: "ok" }));
    registerTool(MANAGE_BOOKINGS_TOOL, {
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
          meetingConcierge: intent,
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      toolResults: result.toolResults,
      runtimeElapsedMs: 700,
    });

    expect(result.toolResults[0]?.status).toBe("success");
    expect(telemetry.decision).toBe("preview_success");
    expect(telemetry.toolInvocation.success).toBe(true);
    expect(telemetry.endToEndLatencyMs).toBe(1_900);
    expect(telemetry.latencyTargetBreached).toBe(false);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("blocks preview execution when transport/session attestation is unverifiable", async () => {
    const now = 1_701_900_200_000;
    const metadata = {
      sourceMode: "meta_glasses",
      liveSessionId: "live_transport_attestation_a",
      commandPolicy: {
        contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
        attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      },
      cameraRuntime: {
        liveSessionId: "live_transport_attestation_b",
        sourceId: "glasses_stream_meta:meta_dat_bridge:rayban_meta:primary",
        sourceClass: "glasses_stream_meta",
        providerId: "meta_dat_bridge",
        transport: "rtmp",
        detectedText: "Please preview meeting with jordan@example.com",
      },
      transportRuntime: {
        transport: "rtmp",
      },
    } as const;

    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: metadata as unknown as Record<string, unknown>,
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
      now,
    });
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      metadata: metadata as unknown as Record<string, unknown>,
      message: "Preview the booking for jordan@example.com",
      now,
    });

    const executeMock = vi.fn(async () => ({ mode: "preview", status: "ok" }));
    registerTool(MANAGE_BOOKINGS_TOOL, {
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
          mutationAuthority: envelope.authority,
          nativeVisionEdge: envelope.nativeVisionEdge,
          meetingConcierge: intent,
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(intent.transportSessionAttestation.required).toBe(true);
    expect(intent.transportSessionAttestation.verified).toBe(false);
    expect(intent.fallbackReasons).toContain("transport_session_metadata_quarantined");
    expect(envelope.authority.invariantViolations).toContain(
      "transport_session_attestation_verification_failed"
    );
    expect(result.toolResults[0]?.tool).toBe(MANAGE_BOOKINGS_TOOL);
    expect(result.toolResults[0]?.status).toBe("error");
    expect((result.toolResults[0]?.error || "").toLowerCase()).toContain("blocked");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("keeps preview execution open only when source and transport session attestation is verifiable", async () => {
    const now = 1_701_900_300_000;
    const liveSessionId = "live_transport_verified_a";
    const sourceId = "iphone_microphone:ios_avfoundation:primary_mic";
    const sourceClass = "iphone_microphone";
    const providerId = "ios_avfoundation";
    const nonce = "nonce_verified_1";
    const challenge = buildMobileSourceAttestationChallenge({
      liveSessionId,
      sourceId,
      nonce,
    });
    const signature = computeMobileSourceAttestationSignature({
      secret: "local_dev_av_attestation_secret_v1",
      challenge,
      nonce,
      issuedAtMs: now - 15_000,
      liveSessionId,
      sourceId,
      sourceClass,
      providerId,
    });

    const metadata = {
      liveSessionId,
      sourceMode: "iphone",
      commandPolicy: {
        contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
        attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      },
      voiceRuntime: {
        liveSessionId,
        sourceId,
        sourceClass,
        providerId,
        transcript: "Please preview a meeting with jordan@example.com.",
        sourceAttestation: {
          contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
          challenge,
          nonce,
          signature,
          issuedAtMs: now - 15_000,
          sourceId,
          sourceClass,
          providerId,
        },
      },
      transportRuntime: {
        mode: "websocket_preferred",
        protocol: "https",
        fallbackReason: "none",
      },
    } as const;

    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: metadata as unknown as Record<string, unknown>,
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
      now,
    });
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      metadata: metadata as unknown as Record<string, unknown>,
      message: "Preview the booking for jordan@example.com",
      now,
    });

    const executeMock = vi.fn(async () => ({ mode: "preview", status: "ok" }));
    registerTool(MANAGE_BOOKINGS_TOOL, {
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
          mutationAuthority: envelope.authority,
          nativeVisionEdge: envelope.nativeVisionEdge,
          meetingConcierge: intent,
          runtimeAuthorityPrecedence: "vc83_runtime_policy",
        },
      } as any,
      failedToolCounts: {},
      disabledTools: new Set<string>(),
      createApprovalRequest: async () => {},
      onToolDisabled: () => {},
    });

    expect(envelope.nativeVisionEdge.sourceAttestation.verificationRequired).toBe(true);
    expect(envelope.nativeVisionEdge.sourceAttestation.verified).toBe(true);
    expect(intent.transportSessionAttestation.required).toBe(true);
    expect(intent.transportSessionAttestation.verified).toBe(true);
    expect(intent.commandPolicy.allowed).toBe(true);
    expect(intent.commandPolicy.reasonCode).toBe("allowed");
    expect(result.toolResults[0]?.status).toBe("success");
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("treats conversationRuntime meta_glasses mode as transport-attested source negotiation input", () => {
    const now = 1_701_900_400_000;
    const metadata = {
      liveSessionId: "live_conversation_runtime_meta_1",
      conversationRuntime: {
        contractVersion: "conversation_interaction_v1",
        state: "live",
        mode: "voice_with_eyes",
        requestedEyesSource: "meta_glasses",
        sourceMode: "meta_glasses",
      },
      commandPolicy: {
        contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
        attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
      },
      voiceRuntime: {
        liveSessionId: "live_conversation_runtime_meta_1",
        sourceId: "iphone_microphone:ios_avfoundation:primary_mic",
        sourceClass: "iphone_microphone",
        providerId: "ios_avfoundation",
        transcript: "Please preview a meeting with jordan@example.com.",
      },
      transportRuntime: {
        mode: "websocket_preferred",
        protocol: "https",
      },
    } as const;

    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: metadata as unknown as Record<string, unknown>,
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
      now,
    });
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      metadata: metadata as unknown as Record<string, unknown>,
      message: "Preview the booking for jordan@example.com",
      now,
    });

    expect(intent.transportSessionAttestation.required).toBe(true);
    expect(intent.transportSessionAttestation.verified).toBe(false);
    expect(intent.transportSessionAttestation.reasonCodes).toContain("meta_transport_must_be_webrtc");
    expect(intent.fallbackReasons).toContain("transport_session_metadata_quarantined");
    expect(envelope.authority.invariantViolations).toContain(
      "transport_session_attestation_verification_failed",
    );
  });
});
