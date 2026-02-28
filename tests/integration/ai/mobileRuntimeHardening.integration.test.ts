import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  resolveInboundIngressEnvelope,
  resolveInboundMeetingConciergeIntent,
} from "../../../convex/ai/agentExecution";
import { executeToolCallsWithApproval } from "../../../convex/ai/agentToolOrchestration";
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
});
