import { describe, expect, it } from "vitest";
import {
  DEFAULT_REALTIME_CONVERSATION_VAD_POLICY,
  DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS,
  DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW,
  DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS,
  computePcm16FrameRms,
  createRealtimeMediaSession,
  detectVadSpeechFrame,
  resolveRealtimeEchoCancellationSelection,
  shouldThrottleRealtimeVisionForwarding,
} from "../../../src/lib/av/runtime/realtimeMediaSession";
import {
  createInMemoryTransportAdapter,
  evaluateTransportFallback,
} from "../../../src/lib/av/runtime/transportAdapters";

describe("realtime media session runtime", () => {
  it("tracks bidirectional packet flow and session clock deterministically", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_700_500_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_1",
      transportAdapter: adapter,
      now: () => nowMs,
    });

    session.start();

    nowMs += 10;
    await session.ingestPacket({
      direction: "audio_in",
      sequence: 1,
      timestampMs: nowMs - 5,
      sizeBytes: 160,
    });
    nowMs += 10;
    await session.ingestPacket({
      direction: "audio_out",
      sequence: 1,
      timestampMs: nowMs - 4,
      sizeBytes: 192,
    });
    nowMs += 10;
    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 7,
      sizeBytes: 1200,
    });
    nowMs += 10;
    await session.ingestPacket({
      direction: "video_out",
      sequence: 1,
      timestampMs: nowMs - 6,
      sizeBytes: 1150,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.status).toBe("running");
    expect(snapshot.clock.tickCount).toBe(4);
    expect(snapshot.clock.uptimeMs).toBe(40);
    expect(snapshot.directions.audio_in.packetCount).toBe(1);
    expect(snapshot.directions.audio_out.packetCount).toBe(1);
    expect(snapshot.directions.video_in.packetCount).toBe(1);
    expect(snapshot.directions.video_out.packetCount).toBe(1);
    expect(snapshot.transportRuntime.mode).toBe("realtime");
    expect(snapshot.transportRuntime.fallbackReason).toBe("none");
    expect(snapshot.transportRuntime.downgradeProfile).toBe("full_av");
    expect(snapshot.transportRuntime.operatorReasonCode).toBe("stable_full_av");
    expect(snapshot.transportRuntime.nativePolicyPrecedence).toBe(
      "vc83_runtime_policy"
    );
    expect(snapshot.transportRuntime.approvalInvariant).toBe("non_bypassable");
    expect(snapshot.transportRuntime.diagnostics.downgradeTransitionCount).toBe(0);
    expect(snapshot.transportRuntime.targetBufferMs).toBe(40);
    expect(snapshot.transportRuntime.observability.sessionStartedAtMs).toBe(
      1_700_500_000_000
    );
    expect(snapshot.transportRuntime.observability.sessionStoppedAtMs).toBeUndefined();
    expect(snapshot.transportRuntime.observability.lifecycleState).toBe("running");
    expect(snapshot.transportRuntime.observability.frameCadenceMs).toBeUndefined();
    expect(snapshot.transportRuntime.observability.frameCadenceFps).toBeUndefined();
    expect(snapshot.transportRuntime.observability.jitterMsP95).toBe(3);
    expect(snapshot.transportRuntime.observability.mouthToEarEstimateMs).toBe(9);
    expect(snapshot.transportRuntime.observability.fallbackTransitionCount).toBe(0);
    expect(snapshot.transportRuntime.observability.sourceHealth).toEqual({
      status: "healthy",
      deviceAvailable: true,
      providerFailoverActive: false,
      policyRestricted: false,
    });
    expect(adapter.getPackets()).toHaveLength(4);
  });

  it("tracks session lifecycle start/stop observability timestamps", () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_700_550_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_start_stop",
      transportAdapter: adapter,
      now: () => nowMs,
    });

    const startedSnapshot = session.start();
    expect(startedSnapshot.transportRuntime.observability.sessionStartedAtMs).toBe(
      1_700_550_000_000
    );
    expect(startedSnapshot.transportRuntime.observability.sessionStoppedAtMs).toBeUndefined();
    expect(startedSnapshot.transportRuntime.observability.lifecycleState).toBe(
      "session_started"
    );

    nowMs += 125;
    const stoppedSnapshot = session.stop();
    expect(stoppedSnapshot.transportRuntime.observability.sessionStartedAtMs).toBe(
      1_700_550_000_000
    );
    expect(stoppedSnapshot.transportRuntime.observability.sessionStoppedAtMs).toBe(
      1_700_550_000_125
    );
    expect(stoppedSnapshot.transportRuntime.observability.lifecycleState).toBe(
      "session_stopped"
    );
  });

  it("derives cadence, jitter, mouth-to-ear estimate, fallback transitions, and source health", async () => {
    const adapter = createInMemoryTransportAdapter({
      initialHealthState: {
        providerFailoverActive: true,
      },
    });
    let nowMs = 1_700_850_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_obs_1",
      transportAdapter: adapter,
      now: () => nowMs,
      thresholds: {
        latencyMsP95Threshold: 9999,
        jitterMsP95Threshold: 9999,
        packetLossPctThreshold: 100,
      },
    });

    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 40,
      sizeBytes: 1400,
    });
    nowMs += 33;
    await session.ingestPacket({
      direction: "video_in",
      sequence: 2,
      timestampMs: nowMs - 35,
      sizeBytes: 1450,
    });
    nowMs += 10;
    await session.ingestPacket({
      direction: "audio_in",
      sequence: 1,
      timestampMs: nowMs - 20,
      sizeBytes: 160,
    });
    nowMs += 10;
    await session.ingestPacket({
      direction: "audio_out",
      sequence: 1,
      timestampMs: nowMs - 30,
      sizeBytes: 192,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.transportRuntime.observability.frameCadenceMs).toBe(38);
    expect(snapshot.transportRuntime.observability.frameCadenceFps).toBe(26.316);
    expect(snapshot.transportRuntime.observability.jitterMsP95).toBe(15);
    expect(snapshot.transportRuntime.observability.mouthToEarEstimateMs).toBe(50);
    expect(snapshot.transportRuntime.observability.fallbackTransitionCount).toBe(1);
    expect(snapshot.transportRuntime.observability.sourceHealth).toEqual({
      status: "provider_failover",
      deviceAvailable: true,
      providerFailoverActive: true,
      policyRestricted: false,
    });
  });

  it("accounts for latency degradation and emits network_degraded fallback", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_700_600_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_2",
      transportAdapter: adapter,
      now: () => nowMs,
      thresholds: {
        latencyMsP95Threshold: 400,
      },
    });

    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 350,
      sizeBytes: 1000,
    });

    nowMs += 20;
    await session.ingestPacket({
      direction: "video_in",
      sequence: 2,
      timestampMs: nowMs - 450,
      sizeBytes: 1024,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.directions.video_in.packetCount).toBe(2);
    expect(snapshot.directions.video_in.droppedPacketCount).toBe(0);
    expect(snapshot.transportRuntime.fallbackReason).toBe("network_degraded");
    expect(snapshot.transportRuntime.mode).toBe("buffered");
    expect(snapshot.transportRuntime.downgradeProfile).toBe("video_low_fps");
    expect(snapshot.transportRuntime.operatorReasonCode).toBe(
      "network_degraded_video_low_fps"
    );
    expect(snapshot.transportRuntime.diagnostics.latencyMsP95).toBeGreaterThan(400);
    expect(snapshot.transportRuntime.diagnostics.fallbackTransitionCount).toBe(1);
    expect(snapshot.transportRuntime.diagnostics.downgradeTransitionCount).toBe(1);
    expect(snapshot.transportRuntime.targetBufferMs).toBe(60);
  });

  it("emits capture_backpressure fallback from packet-level capture diagnostics", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_700_700_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_3",
      transportAdapter: adapter,
      now: () => nowMs,
      thresholds: {
        latencyMsP95Threshold: 9999,
        jitterMsP95Threshold: 9999,
        packetLossPctThreshold: 100,
      },
    });

    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 4,
      captureDroppedFrameCount: 3,
      captureLateFrameCount: 1,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.transportRuntime.fallbackReason).toBe("capture_backpressure");
    expect(snapshot.transportRuntime.mode).toBe("buffered");
    expect(snapshot.transportRuntime.downgradeProfile).toBe("video_low_fps");
    expect(snapshot.transportRuntime.operatorReasonCode).toBe(
      "capture_backpressure_video_low_fps"
    );
    expect(snapshot.transportRuntime.diagnostics.downgradeTransitionCount).toBe(1);
    expect(snapshot.transportRuntime.targetBufferMs).toBe(60);
  });

  it("escalates to audio_only under severe network degradation with explicit reason code", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_700_750_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_3b",
      transportAdapter: adapter,
      now: () => nowMs,
      thresholds: {
        packetLossPctThreshold: 1,
      },
    });

    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 10,
    });

    nowMs += 20;
    await session.ingestPacket({
      direction: "video_in",
      sequence: 15,
      timestampMs: nowMs - 1600,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.transportRuntime.fallbackReason).toBe("network_degraded");
    expect(snapshot.transportRuntime.downgradeProfile).toBe("audio_only");
    expect(snapshot.transportRuntime.operatorReasonCode).toBe(
      "network_degraded_audio_only"
    );
    expect(snapshot.transportRuntime.diagnostics.downgradeTransitionCount).toBe(1);
  });

  it("uses deterministic fallback precedence when multiple degradation signals exist", () => {
    const fallback = evaluateTransportFallback({
      healthState: {
        deviceAvailable: false,
        providerFailoverActive: true,
        policyRestricted: true,
      },
      diagnostics: {
        latencyMsP95: 999,
        jitterMsP95: 999,
        packetLossPct: 30,
      },
      captureDroppedFrameCount: 10,
      captureLateFrameCount: 5,
    });

    expect(fallback.fallbackReason).toBe("policy_restricted");
    expect(fallback.mode).toBe("batch_replay");
  });

  it("adapts buffer up on failover and down after recovery", async () => {
    const adapter = createInMemoryTransportAdapter({
      initialHealthState: {
        providerFailoverActive: true,
      },
    });
    let nowMs = 1_700_800_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_4",
      transportAdapter: adapter,
      now: () => nowMs,
      minBufferMs: 40,
      maxBufferMs: 100,
      bufferStepMs: 20,
    });

    await session.ingestPacket({
      direction: "audio_in",
      sequence: 1,
      timestampMs: nowMs - 5,
    });
    const degradedSnapshot = session.getSnapshot();
    expect(degradedSnapshot.transportRuntime.fallbackReason).toBe("provider_failover");
    expect(degradedSnapshot.transportRuntime.downgradeProfile).toBe(
      "video_low_fps"
    );
    expect(degradedSnapshot.transportRuntime.operatorReasonCode).toBe(
      "provider_failover_video_low_fps"
    );
    expect(degradedSnapshot.transportRuntime.targetBufferMs).toBe(60);

    adapter.setHealthState({
      providerFailoverActive: false,
      deviceAvailable: true,
      policyRestricted: false,
    });
    nowMs += 20;

    await session.ingestPacket({
      direction: "audio_in",
      sequence: 2,
      timestampMs: nowMs - 4,
    });

    const recoveredSnapshot = session.getSnapshot();
    expect(recoveredSnapshot.transportRuntime.fallbackReason).toBe("none");
    expect(recoveredSnapshot.transportRuntime.mode).toBe("realtime");
    expect(recoveredSnapshot.transportRuntime.downgradeProfile).toBe("full_av");
    expect(recoveredSnapshot.transportRuntime.operatorReasonCode).toBe(
      "recovered_full_av"
    );
    expect(recoveredSnapshot.transportRuntime.targetBufferMs).toBe(40);
    expect(recoveredSnapshot.transportRuntime.diagnostics.reconnectCount).toBe(1);
    expect(recoveredSnapshot.transportRuntime.diagnostics.fallbackTransitionCount).toBe(2);
    expect(recoveredSnapshot.transportRuntime.diagnostics.downgradeTransitionCount).toBe(
      2
    );
  });

  it("enters lease-expired fallback and resumes on heartbeat", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_701_700_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_lease_1",
      transportAdapter: adapter,
      now: () => nowMs,
      leaseTimeoutMs: 15_000,
    });

    await session.ingestPacket({
      direction: "audio_in",
      sequence: 1,
      timestampMs: nowMs - 5,
    });

    nowMs += 16_000;
    const leaseExpired = session.getSnapshot();
    expect(leaseExpired.transportRuntime.mode).toBe("batch_replay");
    expect(leaseExpired.transportRuntime.fallbackReason).toBe("session_lease_expired");
    expect(leaseExpired.transportRuntime.observability.lifecycleState).toBe("lease_expired");
    expect(leaseExpired.transportRuntime.observability.lastErrorCode).toBe("lease_expired");

    nowMs += 100;
    const resumed = session.heartbeat(nowMs);
    expect(resumed.transportRuntime.mode).toBe("realtime");
    expect(resumed.transportRuntime.fallbackReason).toBe("none");
    expect(resumed.transportRuntime.observability.lifecycleState).toBe("resumed");
    expect(resumed.transportRuntime.observability.lastErrorCode).toBe("none");
    expect(resumed.transportRuntime.diagnostics.reconnectCount).toBe(1);
  });

  it("deduplicates replay packets idempotently during reconnect", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_701_800_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_replay_1",
      transportAdapter: adapter,
      now: () => nowMs,
    });

    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 8,
      sizeBytes: 1024,
    });

    nowMs += 25;
    const duplicateSnapshot = await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: 1_701_799_999_992,
      sizeBytes: 1024,
    });

    expect(duplicateSnapshot.directions.video_in.packetCount).toBe(1);
    expect(duplicateSnapshot.transportRuntime.diagnostics.replayDuplicateCount).toBe(1);
    expect(duplicateSnapshot.transportRuntime.observability.replayDuplicateCount).toBe(1);
    expect(duplicateSnapshot.transportRuntime.observability.lastErrorCode).toBe(
      "duplicate_packet_replay"
    );

    nowMs += 25;
    const recoveredSnapshot = await session.ingestPacket({
      direction: "video_in",
      sequence: 2,
      timestampMs: nowMs - 8,
      sizeBytes: 1000,
    });

    expect(recoveredSnapshot.directions.video_in.packetCount).toBe(2);
    expect(recoveredSnapshot.transportRuntime.diagnostics.replayDuplicateCount).toBe(1);
    expect(recoveredSnapshot.transportRuntime.observability.lastErrorCode).toBe("none");
  });

  it("falls back safely when relay publish fails and recovers on next successful packet", async () => {
    let shouldFailPublish = true;
    const adapter = {
      async publishPacket() {
        if (shouldFailPublish) {
          shouldFailPublish = false;
          throw new Error("relay publish timeout");
        }
      },
      async getHealthState() {
        return {
          deviceAvailable: true,
          providerFailoverActive: false,
          policyRestricted: false,
        };
      },
    };
    let nowMs = 1_701_900_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_relay_1",
      transportAdapter: adapter,
      now: () => nowMs,
    });

    const failedPublishSnapshot = await session.ingestPacket({
      direction: "audio_in",
      sequence: 1,
      timestampMs: nowMs - 5,
      sizeBytes: 160,
    });

    expect(failedPublishSnapshot.transportRuntime.mode).toBe("batch_replay");
    expect(failedPublishSnapshot.transportRuntime.fallbackReason).toBe("relay_publish_error");
    expect(failedPublishSnapshot.transportRuntime.diagnostics.lastErrorCode).toBe(
      "transport_publish_failed"
    );

    nowMs += 30;
    const recoveredSnapshot = await session.ingestPacket({
      direction: "audio_in",
      sequence: 2,
      timestampMs: nowMs - 4,
      sizeBytes: 160,
    });
    expect(recoveredSnapshot.transportRuntime.fallbackReason).toBe("none");
    expect(recoveredSnapshot.transportRuntime.observability.lastErrorCode).toBe("none");
  });

  it("promotes queue-depth backpressure to buffered fallback under degraded transport", async () => {
    const adapter = createInMemoryTransportAdapter();
    let nowMs = 1_702_000_000_000;
    const session = createRealtimeMediaSession({
      liveSessionId: "live_session_rt_backpressure_1",
      transportAdapter: adapter,
      now: () => nowMs,
      thresholds: {
        queueDepthThreshold: 10,
      },
    });

    await session.ingestPacket({
      direction: "video_in",
      sequence: 1,
      timestampMs: nowMs - 10,
      sizeBytes: 900,
      queueDepth: 24,
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.transportRuntime.mode).toBe("buffered");
    expect(snapshot.transportRuntime.fallbackReason).toBe("capture_backpressure");
    expect(snapshot.transportRuntime.diagnostics.queueDepthP95).toBe(24);
  });

  it("locks ORV-042 client VAD defaults and speech-frame detection", () => {
    expect(DEFAULT_REALTIME_CONVERSATION_VAD_POLICY).toEqual({
      mode: "client_energy_gate",
      frameDurationMs: 20,
      energyThresholdRms: 0.015,
      minSpeechFrames: 2,
      endpointSilenceMs: 320,
    });

    const silenceFrame = new Int16Array(480);
    expect(computePcm16FrameRms(silenceFrame)).toBe(0);
    expect(
      detectVadSpeechFrame({
        samples: silenceFrame,
      })
    ).toBe(false);

    const speechFrame = new Int16Array(480).fill(1200);
    expect(
      detectVadSpeechFrame({
        samples: speechFrame,
      })
    ).toBe(true);
  });

  it("locks ORV-042 realtime vision forwarding throttle defaults", () => {
    expect(DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS).toBe(1250);
    expect(DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW).toBe(8);
    expect(DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS).toBe(10000);

    const throttled = shouldThrottleRealtimeVisionForwarding({
      nowMs: 10_000,
      lastForwardAtMs: 9_250,
      cadenceMs: DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS,
    });
    expect(throttled.throttled).toBe(true);
    expect(throttled.retryAfterMs).toBe(500);

    const accepted = shouldThrottleRealtimeVisionForwarding({
      nowMs: 10_600,
      lastForwardAtMs: 9_250,
      cadenceMs: DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS,
    });
    expect(accepted.throttled).toBe(false);
  });

  it("locks ORV-043 explicit echo cancellation strategy resolution", () => {
    expect(
      resolveRealtimeEchoCancellationSelection({
        hardwareAecSupported: true,
        hardwareAecEnabled: true,
      })
    ).toEqual({
      strategy: "hardware_aec_capture_path",
      reason: "hardware_aec_enabled",
      hardwareAecSupported: true,
      hardwareAecEnabled: true,
    });

    expect(
      resolveRealtimeEchoCancellationSelection({
        hardwareAecSupported: true,
        hardwareAecEnabled: false,
      })
    ).toEqual({
      strategy: "mute_mic_during_tts",
      reason: "hardware_aec_not_enabled",
      hardwareAecSupported: true,
      hardwareAecEnabled: false,
    });

    expect(
      resolveRealtimeEchoCancellationSelection({
        hardwareAecSupported: true,
        hardwareAecEnabled: true,
        forceMuteDuringTts: true,
      })
    ).toEqual({
      strategy: "mute_mic_during_tts",
      reason: "operator_forced_mute",
      hardwareAecSupported: true,
      hardwareAecEnabled: true,
    });
  });
});
