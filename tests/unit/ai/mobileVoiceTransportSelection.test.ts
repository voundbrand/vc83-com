import { describe, expect, it } from "vitest";

import {
  MOBILE_VOICE_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION,
  MOBILE_VOICE_GATEWAY_READY_POLICY_VERSION,
  MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BASE_MS,
  MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BUDGET_MS,
  MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_MAX_MS,
  buildVoiceTransportRuntime,
  consumeMobileVoiceWebsocketReconnectBudget,
  createMobileVoiceWebsocketReconnectBudgetState,
  downgradeVoiceTransportSelection,
  resolveGatewayReadyPolicyCompatibility,
  resolveVoiceTransportDegradationState,
  resolveVoiceTransportSelection,
} from "../../../apps/operator-mobile/src/lib/voice/transport";
import { createVoiceRuntimeTelemetryCollector } from "../../../apps/operator-mobile/src/lib/av/voiceTelemetry";

describe("mobile voice transport fallback selection", () => {
  it("defaults unknown configured transport modes to websocket-first", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "invalid_mode",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    expect(selection.requestedMode).toBe("websocket");
    expect(selection.effectiveMode).toBe("websocket");
    expect(selection.fallbackReason).toBeUndefined();
  });

  it("uses webrtc when requested and available", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "webrtc",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: true,
    });

    expect(selection.requestedMode).toBe("webrtc");
    expect(selection.effectiveMode).toBe("webrtc");
    expect(selection.fallbackReason).toBeUndefined();
  });

  it("falls back from webrtc to websocket when webrtc is unavailable", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "webrtc",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    expect(selection.effectiveMode).toBe("websocket");
    expect(selection.fallbackReason).toBe("webrtc_unavailable");
  });

  it("falls back from websocket to chunked when websocket endpoint is missing", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "",
      isWebRtcAvailable: false,
    });

    expect(selection.effectiveMode).toBe("chunked_fallback");
    expect(selection.fallbackReason).toBe("websocket_unavailable");
  });

  it("correlates live/video and voice sessions in transport runtime metadata", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    const runtime = buildVoiceTransportRuntime({
      selection,
      liveSessionId: "mobile_live_corr_1",
      activeSession: {
        interviewSessionId: "interview_corr_1",
        voiceSessionId: "voice_corr_1",
      },
      isRealtimeConnected: true,
      realtimeRelayHealth: {
        healthy: true,
        reasonCode: "relay_healthy",
        lastIngestAttemptAtMs: 2_001,
        lastIngestAckAtMs: 2_003,
        consecutiveIngestFailures: 0,
        serverRelayHeartbeatSequenceGap: 0,
        serverRelayHeartbeatAckAgeMs: 220,
        serverRelayReasonCode: "relay_healthy",
        serverRelayQosAgeMs: 180,
        serverRelayContractVersionStatus: "ok",
        serverRelayHeartbeatContractVersionStatus: "ok",
        serverRelayQos: {
          contractVersion: "voice_relay_qos_v1",
          observedAtMs: 2_002,
          healthy: true,
          reasonCode: "relay_healthy",
          heartbeat: {
            contractVersion: "voice_relay_heartbeat_v1",
            status: "acknowledged",
            expectedSequence: 6,
            ackSequence: 6,
            acknowledgedAtMs: 2_002,
          },
          qos: {
            orderingDecision: "accepted",
            relayEventCount: 1,
            idempotentReplay: false,
            persistedFinalTranscript: false,
          },
        },
      },
      relayServerMonitoring: {
        monitoringContractVersion: "mobile_voice_relay_server_monitoring_v1",
        missingPayloadCount: 2,
        qosContractMismatchCount: 1,
        heartbeatContractMismatchCount: 0,
        heartbeatSequenceGapCount: 0,
        heartbeatStallTimeoutCount: 1,
        lastMissingPayloadAtMs: 2_010,
        lastQosContractMismatchAtMs: 2_020,
        lastHeartbeatStallTimeoutAtMs: 2_030,
      },
      partialTranscript: "hello world",
      telemetry: createVoiceRuntimeTelemetryCollector({
        liveSessionId: "mobile_live_corr_1",
        voiceSessionId: "voice_corr_1",
        interviewSessionId: "interview_corr_1",
      }).snapshot(),
    }) as {
      liveSessionId?: string;
      interviewSessionId?: string;
      voiceSessionId?: string;
      sessionState?: string;
      partialTranscript?: string;
      degraded?: boolean;
      degradationReasonCode?: string;
      degradationReasonLabel?: string;
      degradationReasonLabelKey?: string;
      realtimeRelayHealthy?: boolean;
      realtimeRelayReasonCode?: string;
      realtimeRelayConsecutiveIngestFailures?: number;
      realtimeRelayServerContractVersion?: string;
      realtimeRelayServerReasonCode?: string;
      realtimeRelayServerContractVersionStatus?: "ok" | "missing" | "mismatch";
      realtimeRelayServerHeartbeatContractVersionStatus?: "ok" | "missing" | "mismatch";
      realtimeRelayServerHeartbeatSequenceGap?: number;
      realtimeRelayServerHeartbeatAckAgeMs?: number;
      realtimeRelayServerHeartbeatStatus?: string;
      realtimeRelayServerHeartbeatAckSequence?: number;
      realtimeRelayServerMonitoringContractVersion?: string;
      realtimeRelayServerMissingPayloadCount?: number;
      realtimeRelayServerQosContractMismatchCount?: number;
      realtimeRelayServerHeartbeatContractMismatchCount?: number;
      realtimeRelayServerHeartbeatSequenceGapCount?: number;
      realtimeRelayServerHeartbeatStallTimeoutCount?: number;
      telemetry?: Record<string, unknown>;
    };

    expect(runtime.liveSessionId).toBe("mobile_live_corr_1");
    expect(runtime.interviewSessionId).toBe("interview_corr_1");
    expect(runtime.voiceSessionId).toBe("voice_corr_1");
    expect(runtime.sessionState).toBe("open");
    expect(runtime.partialTranscript).toBe("hello world");
    expect(runtime.fallbackReason).toBe("none");
    expect(runtime.degraded).toBe(false);
    expect(runtime.degradationReasonCode).toBe("none");
    expect(runtime.degradationReasonLabel).toBe("none");
    expect(runtime.degradationReasonLabelKey).toBe("chat.voiceTransportReason.none");
    expect(runtime.realtimeRelayHealthy).toBe(true);
    expect(runtime.realtimeRelayReasonCode).toBe("relay_healthy");
    expect(runtime.realtimeRelayConsecutiveIngestFailures).toBe(0);
    expect(runtime.realtimeRelayServerContractVersion).toBe("voice_relay_qos_v1");
    expect(runtime.realtimeRelayServerReasonCode).toBe("relay_healthy");
    expect(runtime.realtimeRelayServerContractVersionStatus).toBe("ok");
    expect(runtime.realtimeRelayServerHeartbeatContractVersionStatus).toBe("ok");
    expect(runtime.realtimeRelayServerHeartbeatSequenceGap).toBe(0);
    expect(runtime.realtimeRelayServerHeartbeatAckAgeMs).toBe(220);
    expect(runtime.realtimeRelayServerHeartbeatStatus).toBe("acknowledged");
    expect(runtime.realtimeRelayServerHeartbeatAckSequence).toBe(6);
    expect(runtime.realtimeRelayServerMonitoringContractVersion).toBe(
      "mobile_voice_relay_server_monitoring_v1"
    );
    expect(runtime.realtimeRelayServerMissingPayloadCount).toBe(2);
    expect(runtime.realtimeRelayServerQosContractMismatchCount).toBe(1);
    expect(runtime.realtimeRelayServerHeartbeatContractMismatchCount).toBe(0);
    expect(runtime.realtimeRelayServerHeartbeatSequenceGapCount).toBe(0);
    expect(runtime.realtimeRelayServerHeartbeatStallTimeoutCount).toBe(1);
    expect((runtime.telemetry?.correlationKey as string) || "").toBe(
      "mobile_live_corr_1::voice_corr_1"
    );
  });

  it("downgrades webrtc mode deterministically when adapter is not implemented", () => {
    const base = resolveVoiceTransportSelection({
      configuredMode: "webrtc",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: true,
    });

    const downgraded = downgradeVoiceTransportSelection({
      current: base,
      websocketUrl: "wss://voice.example/ws",
      reason: "webrtc_not_implemented",
    });

    expect(downgraded.requestedMode).toBe("webrtc");
    expect(downgraded.effectiveMode).toBe("websocket");
    expect(downgraded.fallbackReason).toBe("webrtc_not_implemented");
  });

  it("downgrades websocket mode to chunked fallback on runtime websocket errors", () => {
    const base = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    const downgraded = downgradeVoiceTransportSelection({
      current: base,
      websocketUrl: "wss://voice.example/ws",
      reason: "websocket_runtime_error",
    });

    expect(downgraded.requestedMode).toBe("websocket");
    expect(downgraded.effectiveMode).toBe("chunked_fallback");
    expect(downgraded.fallbackReason).toBe("websocket_runtime_error");
  });

  it("resolves deterministic degradation visibility labels from fallback taxonomy", () => {
    const base = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });
    const stableDegradation = resolveVoiceTransportDegradationState(base);
    expect(stableDegradation.isDegraded).toBe(false);
    expect(stableDegradation.reasonCode).toBe("none");
    expect(stableDegradation.reasonLabel).toBe("none");
    expect(stableDegradation.reasonLabelKey).toBe("chat.voiceTransportReason.none");

    const downgraded = downgradeVoiceTransportSelection({
      current: base,
      websocketUrl: "wss://voice.example/ws",
      reason: "websocket_closed",
    });
    const downgradedDegradation = resolveVoiceTransportDegradationState(downgraded);
    expect(downgradedDegradation.isDegraded).toBe(true);
    expect(downgradedDegradation.reasonCode).toBe("websocket_closed");
    expect(downgradedDegradation.reasonLabelKey).toBe(
      "chat.voiceTransportReason.websocket_closed"
    );
    expect(downgradedDegradation.transitionLabel).toBe("websocket->chunked_fallback");
    expect(downgradedDegradation.reasonLabel).toContain("websocket_closed");
    expect(downgradedDegradation.reasonLabel).toContain("websocket->chunked_fallback");
  });

  it("accepts compatible gateway_ready policy envelope", () => {
    const compatibility = resolveGatewayReadyPolicyCompatibility({
      policy: {
        version: MOBILE_VOICE_GATEWAY_READY_POLICY_VERSION,
        maxPayloadBytes: 2_097_152,
        maxBufferedBytes: 1_048_576,
        heartbeat: {
          cadenceMs: 2_500,
          contractVersion: MOBILE_VOICE_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION,
          sequenceGapTolerance: 0,
          stallTimeoutMs: 7_500,
        },
      },
    });

    expect(compatibility.compatible).toBe(true);
    expect(compatibility.reasonCode).toBe("compatible");
    if (!compatibility.compatible) {
      throw new Error("expected compatibility success");
    }
    expect(compatibility.policy.version).toBe(MOBILE_VOICE_GATEWAY_READY_POLICY_VERSION);
    expect(compatibility.policy.maxPayloadBytes).toBe(2_097_152);
    expect(compatibility.policy.maxBufferedBytes).toBe(1_048_576);
    expect(compatibility.policy.heartbeat.cadenceMs).toBe(2_500);
    expect(compatibility.policy.heartbeat.contractVersion).toBe(
      MOBILE_VOICE_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION
    );
    expect(compatibility.policy.heartbeat.sequenceGapTolerance).toBe(0);
    expect(compatibility.policy.heartbeat.stallTimeoutMs).toBe(7_500);
  });

  it("rejects gateway_ready policy envelopes with incompatible versions fail-closed", () => {
    const compatibility = resolveGatewayReadyPolicyCompatibility({
      policy: {
        version: "voice_gateway_ready_policy_v2",
        maxPayloadBytes: 2_097_152,
        maxBufferedBytes: 1_048_576,
        heartbeat: {
          cadenceMs: 2_500,
          contractVersion: MOBILE_VOICE_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION,
        },
      },
    });

    expect(compatibility.compatible).toBe(false);
    expect(compatibility.reasonCode).toBe("unsupported_policy_version");
  });

  it("rejects gateway_ready policy envelopes with invalid contract fields", () => {
    const missingPolicy = resolveGatewayReadyPolicyCompatibility({ policy: undefined });
    expect(missingPolicy.compatible).toBe(false);
    expect(missingPolicy.reasonCode).toBe("missing_policy");

    const incompatibleHeartbeat = resolveGatewayReadyPolicyCompatibility({
      policy: {
        version: MOBILE_VOICE_GATEWAY_READY_POLICY_VERSION,
        maxPayloadBytes: 2_097_152,
        maxBufferedBytes: 1_048_576,
        heartbeat: {
          cadenceMs: 2_500,
          contractVersion: "voice_relay_heartbeat_v2",
        },
      },
    });
    expect(incompatibleHeartbeat.compatible).toBe(false);
    expect(incompatibleHeartbeat.reasonCode).toBe("unsupported_heartbeat_contract_version");

    const invalidPayloadLimit = resolveGatewayReadyPolicyCompatibility({
      policy: {
        version: MOBILE_VOICE_GATEWAY_READY_POLICY_VERSION,
        maxPayloadBytes: 0,
        maxBufferedBytes: 1_048_576,
        heartbeat: {
          cadenceMs: 2_500,
          contractVersion: MOBILE_VOICE_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION,
        },
      },
    });
    expect(invalidPayloadLimit.compatible).toBe(false);
    expect(invalidPayloadLimit.reasonCode).toBe("invalid_max_payload_bytes");
  });

  it("consumes websocket reconnect budget with deterministic exponential backoff", () => {
    let budgetState = createMobileVoiceWebsocketReconnectBudgetState();
    const observedDelays: number[] = [];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const decision = consumeMobileVoiceWebsocketReconnectBudget({
        state: budgetState,
      });
      expect(decision.shouldRetry).toBe(true);
      observedDelays.push(decision.retryDelayMs);
      budgetState = decision.nextState;
    }

    expect(observedDelays).toEqual([
      MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BASE_MS,
      MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BASE_MS * 2,
      MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BASE_MS * 4,
      MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BASE_MS * 8,
      MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_MAX_MS,
    ]);
    expect(budgetState.consumedBackoffMs).toBe(MOBILE_VOICE_WEBSOCKET_RECONNECT_BACKOFF_BUDGET_MS);

    const exhausted = consumeMobileVoiceWebsocketReconnectBudget({
      state: budgetState,
    });
    expect(exhausted.shouldRetry).toBe(false);
    expect(exhausted.budgetRemainingMs).toBe(0);
    expect(exhausted.nextState).toEqual(budgetState);
  });

  it("cuts over deterministically once reconnect budget is exhausted", () => {
    const first = consumeMobileVoiceWebsocketReconnectBudget({
      state: createMobileVoiceWebsocketReconnectBudgetState(),
      baseDelayMs: 200,
      maxDelayMs: 400,
      budgetMs: 600,
    });
    expect(first.shouldRetry).toBe(true);
    expect(first.retryDelayMs).toBe(200);
    if (!first.shouldRetry) {
      throw new Error("expected first retry to be allowed");
    }

    const second = consumeMobileVoiceWebsocketReconnectBudget({
      state: first.nextState,
      baseDelayMs: 200,
      maxDelayMs: 400,
      budgetMs: 600,
    });
    expect(second.shouldRetry).toBe(true);
    expect(second.retryDelayMs).toBe(400);
    if (!second.shouldRetry) {
      throw new Error("expected second retry to be allowed");
    }

    const exhausted = consumeMobileVoiceWebsocketReconnectBudget({
      state: second.nextState,
      baseDelayMs: 200,
      maxDelayMs: 400,
      budgetMs: 600,
    });
    expect(exhausted.shouldRetry).toBe(false);
    expect(exhausted.retryDelayMs).toBe(400);
    expect(exhausted.nextState).toEqual(second.nextState);
  });
});
