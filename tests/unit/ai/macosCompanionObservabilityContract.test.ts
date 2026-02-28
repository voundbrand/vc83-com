import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME,
  MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME,
  buildMacosCompanionObservabilityTrustPayload,
} from "../../../convex/ai/chat";
import { validateTrustEventPayload } from "../../../convex/ai/trustEvents";

const ORGANIZATION_ID = "org_001" as Id<"organizations">;
const USER_ID = "user_001" as Id<"users">;
const CONVERSATION_ID = "conversation_001" as Id<"aiConversations">;
const SESSION_ID = "agent_session_001" as Id<"agentSessions">;

describe("macOS companion observability trust payload contract", () => {
  it("builds ingress observability payload with gate, approval, and fallback telemetry", () => {
    const payload = buildMacosCompanionObservabilityTrustPayload({
      eventName: MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      conversationId: CONVERSATION_ID,
      sessionId: SESSION_ID,
      runtimeStatus: "ok",
      toolResults: [
        {
          tool: "calendar.book",
          status: "pending_approval",
          result: { executionId: "approval_123" },
        },
      ],
      liveSessionId: " live_123 ",
      voiceRuntime: {
        voiceSessionId: "voice_123",
        runtimeError: "voice_provider_degraded",
      },
      transportRuntime: {
        fallbackReason: "network_degraded",
      },
      avObservability: {
        fallbackTransitionReasons: ["provider_failover"],
      },
      occurredAt: 1_740_000_000_000,
    });

    const validation = validateTrustEventPayload(
      MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME,
      payload,
    );
    expect(validation.ok).toBe(true);
    expect(payload.session_id).toBe("agent_session_001");
    expect(payload.enforcement_decision).toBe("approval_required");
    expect(payload.approval_id).toBe("approval_123");
    expect(payload.approval_status).toBe("pending");
    expect(payload.source_object_ids).toEqual([
      "conversation:conversation_001",
      "agent_session:agent_session_001",
      "live_session:live_123",
      "voice_session:voice_123",
    ]);
    expect(payload.decision_reason).toBe(
      "fallback:network_degraded|provider_failover|voice_provider_degraded",
    );
  });

  it("builds delivery-failed observability payload with explicit failure reason", () => {
    const payload = buildMacosCompanionObservabilityTrustPayload({
      eventName: MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      conversationId: CONVERSATION_ID,
      sessionId: SESSION_ID,
      runtimeStatus: "error",
      toolResults: [
        {
          tool: "calendar.book",
          status: "failed",
          error: "delivery_bridge_unconfirmed",
        },
      ],
      deliveryFailureReason: "delivery_bridge_unconfirmed",
      occurredAt: 1_740_000_100_000,
    });

    const validation = validateTrustEventPayload(
      MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME,
      payload,
    );
    expect(validation.ok).toBe(true);
    expect(payload.enforcement_decision).toBe("blocked");
    expect(payload.failure_reason).toBe("delivery_bridge_unconfirmed");
    expect(payload.approval_status).toBe("failed_or_missing");
    expect(payload.source_object_ids).toEqual([
      "conversation:conversation_001",
      "agent_session:agent_session_001",
    ]);
  });
});
